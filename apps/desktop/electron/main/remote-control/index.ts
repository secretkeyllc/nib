/**
 * Mobile remote control: the desktop half of the pairing.
 *
 * The user opens Settings → Remote control, presses start, and gets one link
 * (rendered as a QR for phones). Whoever opens that link must sign in with the
 * SAME account the desktop is signed in to; the control-plane relay (see the
 * backend's remote_control_handler.go) only bridges the two legs after that
 * account match. From then on this module:
 *
 *   - mirrors a whitelist of renderer events to the web page,
 *   - executes a small command set (prompt / stop / approvals / snapshots) by
 *     calling the exact same handler closures the renderer's IPC calls run
 *     through, so a remote prompt is indistinguishable from a local one.
 *
 * The pairing is deliberately ephemeral: it exists while this module runs and
 * dies with it. Nothing about it is persisted, and the sid rotates on every
 * start, so a leaked link stops working the moment pairing stops.
 */
import { hostname } from "node:os";
import { join } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import WebSocket from "ws";
import QRCode from "qrcode";
import { APP_VERSION, IPC, type RemoteControlState } from "@pi-desktop/shared";
import type { AgentPromptRequest, AgentStopRequest, AskToolResolution } from "@pi-desktop/shared";

const RELAY_URL = "wss://nib.am/api/v1/remote/ws";
const PAGE_BASE_URL = "https://nib.am/remote/";

/** The renderer events the web page is allowed to see. Deliberately narrow. */
const MIRRORED_CHANNELS: ReadonlySet<string> = new Set([IPC.event.agentMessage]);

/** Re-pull the session list at most this often when sessionsChanged storms. */
const SESSION_REFRESH_MIN_INTERVAL_MS = 1_000;

/** App-level keepalive; well under Cloudflare's 100s idle cutoff. */
const HEARTBEAT_MS = 25_000;
/**
 * Half-open watchdog. On a stalled path this process's ws.send() still
 * "succeeds" into the kernel buffer, so the socket can sit OPEN for minutes
 * while every frame black-holes — the relay answers each app ping with a
 * pong, so on a healthy socket inbound frames arrive every ~25s. Two missed
 * cycles mean the path is gone: terminate (not close — a dead path never
 * completes the closing handshake) and let the reconnect loop take over.
 */
const WATCHDOG_MS = 5_000;
const WATCHDOG_STALL_MS = 50_000;

/** Reconnect backoff bounds. */
const RECONNECT_MIN_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;
/** The relay REJECTED the handshake (4001 auth / 4002 pairing): a long pause
 * before the next attempt instead of a fast retry loop. */
const REJECT_RETRY_MS = 60_000;

export type RemoteControlPhase = "idle" | "connecting" | "waiting" | "connected" | "error";

/**
 * The remote command executor: the SAME local dispatch the renderer's IPC
 * calls go through (registerIpc's handler map), so a remote prompt is byte
 * for byte the code path a local one takes. Bound once at startup.
 */
export type RemoteExecutor = {
  invoke(channel: string, args: readonly unknown[]): Promise<unknown>;
};

let executor: RemoteExecutor | null = null;

/** Bind the local IPC dispatcher. Called once from registerIpc. */
export function setRemoteExecutor(piece: RemoteExecutor): void {
  executor = piece;
}

/** The mirror hook the central sendToRenderer calls; bound per control. */
let activeControl: RemoteControl | null = null;

/** Called from main's sendToRenderer — the one tap that feeds the mirror. */
export function remoteControlMirror(channel: string, payload: unknown): void {
  activeControl?.observeEvent(channel, payload);
}

type Deps = {
  dataDir: () => string;
  logger: { app: (scope: string, level: "info" | "warn" | "error", message: string, data?: unknown) => void };
  /** The same sender the renderer events flow through. */
  sendToRenderer: (channel: string, payload: unknown) => void;
};

type RelayCommand = { id: string; c: string; p: Record<string, unknown> };

class RemoteControlSession {
  private ws: WebSocket | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private lastInbound = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelay = RECONNECT_MIN_MS;
  private closedByUser = false;

  private lastSessionRefresh = 0;
  private sessionRefreshTimer: NodeJS.Timeout | null = null;

  private readonly deps: Deps;
  private readonly identity: { mid: string; name: string };
  /**
   * The relay validates the JWT on EVERY hello, so a session that captured
   * the token once and reused it across reconnects hardened into an
   * AUTH_FAILED loop: the background renewal writes the fresh token to
   * nib.provider/settings.json, but this field still held the expired one.
   * Re-read from disk on every open — reconnects then pick up the renewed
   * token automatically.
   */
  private readToken: () => Promise<string>;
  /** The stored pairing sid — the exact one the QR encodes. The session
   * used to mint its own random sid here, so the relay knew the desktop
   * under a sid no scanned link would ever carry and every phone attach
   * was rejected as "配对不存在". */
  readonly sid: string;
  private readonly onPhase: (phase: RemoteControlPhase, error?: string) => void;

  constructor(
    deps: Deps,
    identity: { mid: string; name: string },
    readToken: () => Promise<string>,
    sid: string,
    onPhase: (phase: RemoteControlPhase, error?: string) => void,
  ) {
    this.deps = deps;
    this.identity = identity;
    this.readToken = readToken;
    this.sid = sid;
    this.onPhase = onPhase;
  }

  start(): void {
    this.open();
  }

  stop(): void {
    this.closedByUser = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.pingTimer = null;
    this.watchdogTimer = null;
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
  }

  /** Renderer events arrive here; only the whitelist leaves the machine. */
  observeEvent(channel: string, payload: unknown): void {
    if (MIRRORED_CHANNELS.has(channel)) {
      this.sendEvent(channel, payload);
      return;
    }
    if (channel === IPC.event.sessionsChanged) {
      // The changed payload is a reason, not a list: refresh the list through
      // the same handler the renderer uses, throttled against prompt storms.
      this.scheduleSessionRefresh();
    }
  }

  private scheduleSessionRefresh(): void {
    const now = Date.now();
    const wait = Math.max(0, this.lastSessionRefresh + SESSION_REFRESH_MIN_INTERVAL_MS - now);
    if (this.sessionRefreshTimer) return;
    this.sessionRefreshTimer = setTimeout(() => {
      this.sessionRefreshTimer = null;
      this.lastSessionRefresh = Date.now();
      void this.pushSessions();
    }, wait);
  }

  private async pushSessions(): Promise<void> {
    if (!executor) return;
    try {
      const list = await this.invokeIpc<{ sessions?: Array<Record<string, unknown>> }>(
        IPC.invoke.sessionList,
        [],
      );
      this.sendEvent("remote/sessions", list.sessions ?? []);
    } catch (error) {
      this.deps.logger.app("remote-control", "warn", "session list refresh failed", { error: String(error) });
    }
  }

  private sendEvent(c: string, p: unknown): void {
    this.rawSend(JSON.stringify({ t: "ev", c, p }));
  }

  private rawSend(text: string): void {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(text);
    } catch {
      /* the read side notices a dead socket and reconnects */
    }
  }

  private open(): void {
    if (this.closedByUser) return;
    this.onPhase("connecting");
    // Fresh token on EVERY attempt, not only the first: the relay validates
    // each hello against the current JWT, and the background renewal may have
    // rotated the stored one since the last try.
    void this.readToken()
      .then((token) => {
        if (this.closedByUser) return;
        if (!token) {
          this.closedByUser = true;
          this.onPhase("error", "NOT_SIGNED_IN");
          return;
        }
        this.openSocket(token);
      })
      .catch((error) => {
        this.deps.logger.app("remote-control", "warn", "could not read the pairing token", {
          message: error instanceof Error ? error.message : String(error),
        });
        this.onPhase("error", "NOT_SIGNED_IN");
      });
  }

  private openSocket(token: string): void {
    const ws = new WebSocket(RELAY_URL);
    this.ws = ws;

    ws.on("open", () => {
      this.deps.logger.app("remote-control", "info", "relay socket open, sending hello", {
        sid: this.sid.slice(0, 8),
      });
      ws.send(
        JSON.stringify({
          t: "hello",
          sid: this.sid,
          mid: this.identity.mid,
          name: this.identity.name,
          ver: APP_VERSION,
          token,
        }),
      );
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => this.rawSend(JSON.stringify({ t: "ping" })), HEARTBEAT_MS);
      this.lastInbound = Date.now();
      if (this.watchdogTimer) clearInterval(this.watchdogTimer);
      this.watchdogTimer = setInterval(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) return;
        if (Date.now() - this.lastInbound > WATCHDOG_STALL_MS) {
          this.deps.logger.app("remote-control", "warn", "relay path stalled; terminating half-open socket", {
            sid: this.sid.slice(0, 8),
          });
          this.ws.terminate();
        }
      }, WATCHDOG_MS);
    });

    ws.on("message", (raw) => {
      this.lastInbound = Date.now();
      let frame: Record<string, unknown>;
      try {
        frame = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch {
        return;
      }
      this.handleFrame(frame);
    });

    ws.on("error", (error) => {
      this.deps.logger.app("remote-control", "warn", "relay socket error", {
        message: error instanceof Error ? error.message : String(error),
      });
      /* onclose follows; the reconnect logic owns recovery */
    });

    ws.on("close", (code, reason) => {
      this.deps.logger.app("remote-control", "warn", "relay socket closed", {
        code,
        reason: reason.toString(),
        sid: this.sid.slice(0, 8),
      });
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = null;
      if (this.watchdogTimer) clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
      this.ws = null;
      if (this.closedByUser) return;
      // A rejected hello (4001 auth / 4002 pairing) is not a network blip:
      // retrying every few seconds only spams the relay's rejection log —
      // the prod log showed an AUTH_FAILED loop at one attempt per ~27s for
      // 20 minutes. Back off HARD and wait out a full minute before trying
      // again; the token refreshes underneath, so the next hello can succeed.
      if (code === 4001 || code === 4002) {
        this.onPhase("error", code === 4001 ? "AUTH_FAILED" : "PAIRING_UNAVAILABLE");
        this.reconnectTimer = setTimeout(() => this.open(), REJECT_RETRY_MS);
        return;
      }
      this.onPhase("connecting");
      this.reconnectTimer = setTimeout(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
        this.open();
      }, this.reconnectDelay);
    });
  }

  private handleFrame(frame: Record<string, unknown>): void {
    const type = String(frame.t ?? "");
    if (type === "hello-ack") {
      this.reconnectDelay = RECONNECT_MIN_MS;
      this.deps.logger.app("remote-control", "info", "relay accepted the pairing", {
        sid: this.sid.slice(0, 8),
      });
      this.onPhase("waiting");
      // Prime the web page as soon as the relay accepts us; when a controller
      // attaches it re-requests everything it needs anyway.
      void this.pushSessions();
      return;
    }
    if (type === "ev" && frame.c === "remote/pairing") {
      const attached = (frame.p as { attached?: boolean } | undefined)?.attached === true;
      this.deps.logger.app(
        "remote-control",
        "info",
        attached ? "a controller attached" : "the controller detached",
        { sid: this.sid.slice(0, 8) },
      );
      this.onPhase(attached ? "connected" : "waiting");
      return;
    }
    if (type === "cmd") {
      this.deps.logger.app("remote-control", "info", "command received from the controller", {
        c: String(frame.c ?? ""),
        id: String(frame.id ?? ""),
      });
      void this.runCommand({
        id: String(frame.id ?? ""),
        c: String(frame.c ?? ""),
        p: (frame.p ?? {}) as Record<string, unknown>,
      });
    }
  }

  private async runCommand(cmd: RelayCommand): Promise<void> {
    if (!cmd.id) return;
    if (!executor) {
      this.rawSend(JSON.stringify({ t: "cmd-resp", id: cmd.id, ok: false, error: "executor unavailable" }));
      return;
    }
    try {
      const result = await this.execute(cmd);
      this.rawSend(JSON.stringify({ t: "cmd-resp", id: cmd.id, ok: true, result }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.rawSend(JSON.stringify({ t: "cmd-resp", id: cmd.id, ok: false, error: message }));
    }
  }

  /**
   * Registrar handlers run inside `wrap`, so every result arrives as
   * {ok:true,data} | {ok:false,error} — the exact envelope the renderer's
   * invoke unwraps. Remote commands unwrap it the same way; handing the
   * envelope to callers raw made every list read `undefined` and the web page
   * sat on an empty workspace.
   */
  private async invokeIpc<T>(channel: string, args: readonly unknown[]): Promise<T> {
    if (!executor) throw new Error("executor unavailable");
    const raw = (await executor.invoke(channel, args)) as
      | { ok?: boolean; data?: T; error?: { message?: string } }
      | T;
    if (
      raw &&
      typeof raw === "object" &&
      "ok" in raw &&
      (raw as { ok: unknown }).ok !== undefined
    ) {
      const envelope = raw as { ok: boolean; data?: T; error?: { message?: string } };
      if (!envelope.ok) {
        throw new Error(envelope.error?.message || "command failed");
      }
      return envelope.data as T;
    }
    return raw as T;
  }

  private async execute(cmd: RelayCommand): Promise<unknown> {
    if (!executor) throw new Error("executor unavailable");
    // Allowlist on purpose: a frame can only reach these nine channels,
    // never storage, settings, or anything else the registrar exposes.
    switch (cmd.c) {
      case "snapshot": {
        const requested = typeof cmd.p.sessionId === "string" ? cmd.p.sessionId : "";
        const list = await this.invokeIpc<{ sessions?: Array<Record<string, unknown>> }>(
          IPC.invoke.sessionList,
          [],
        );
        this.deps.logger.app("remote-control", "info", "sessionList returned", {
          shape: Object.keys(list ?? {}),
          count: Array.isArray(list?.sessions) ? list.sessions.length : -1,
        });
        const sessions = list.sessions ?? [];
        const target = requested || String(sessions[0]?.id ?? "");
        // sessionGet addresses the session as `{ id }` (the only channel that
        // does — see backend-router's sessionIdForCall note).
        // Bound the transcript read: an unbounded session.get on a long
        // session can outlast the controller's timeout.
        const detail = target
          ? await this.invokeIpc<Record<string, unknown>>(IPC.invoke.sessionGet, [
              { id: target, messageLimit: 60 },
            ])
          : null;
        return { sessions, detail };
      }
      case "prompt": {
        const sessionId = String(cmd.p.sessionId ?? "");
        const content = String(cmd.p.content ?? "");
        if (!sessionId || !content.trim()) throw new Error("sessionId and content required");
        return this.invokeIpc(IPC.invoke.agentPrompt, [
          { sessionId, content } satisfies AgentPromptRequest,
        ]);
      }
      case "stop": {
        const sessionId = String(cmd.p.sessionId ?? "");
        if (!sessionId) throw new Error("sessionId required");
        return this.invokeIpc(IPC.invoke.agentStop, [{ sessionId } satisfies AgentStopRequest]);
      }
      case "ask-resolve": {
        const p = cmd.p as { requestId?: string; sessionId?: string; answers?: unknown };
        if (!p.requestId || !p.sessionId) throw new Error("requestId and sessionId required");
        return this.invokeIpc(IPC.invoke.askToolResolve, [
          {
            requestId: p.requestId,
            sessionId: p.sessionId,
            answers: Array.isArray(p.answers) ? p.answers : [],
          } satisfies AskToolResolution,
        ]);
      }
      case "new-session": {
        // A projectPath (normally the controller's `remote-project:<id>`
        // group key) binds the new session to that project; the Host's
        // session.create has always accepted it — older controllers simply
        // never sent one. Absent, the session lands in Sessions (unbound).
        const requestedPath =
          typeof cmd.p.projectPath === "string" ? cmd.p.projectPath.trim() : "";
        const created = await this.invokeIpc(IPC.invoke.sessionCreate, [
          requestedPath ? { projectPath: requestedPath } : {},
        ]);
        void this.pushSessions();
        return created;
      }
      case "groups": {
        // The sidebar's display names: the Host's project groups, exactly
        // what the desktop's own sidebar renders. Controllers on older
        // desktops get an unknown-command error and keep raw keys.
        const result = await this.invokeIpc<{ groups?: Array<Record<string, unknown>> }>(
          IPC.invoke.projectGroupList,
          [],
        );
        return { groups: result?.groups ?? [] };
      }
      case "delete-session": {
        // Same handler the desktop sidebar's delete runs: drops the session,
        // its pi-agent, and the persistence outbox entries. The web page has
        // no other path to remove a session (including one it created by
        // mistake with an older binding bug).
        const sessionId = String(cmd.p.sessionId ?? "").trim();
        if (!sessionId) throw new Error("sessionId required");
        const removed = await this.invokeIpc(IPC.invoke.sessionDelete, [sessionId]);
        void this.pushSessions();
        return removed;
      }
      case "rename-session": {
        // The desktop titles a task from its first message in the renderer;
        // remote prompts never ran that step, so web-created sessions stayed
        // "New task". Controllers rename through the same IPC.
        const sessionId = String(cmd.p.sessionId ?? "").trim();
        const title = String(cmd.p.title ?? "").trim().slice(0, 200);
        if (!sessionId || !title) throw new Error("sessionId and title required");
        return this.invokeIpc(IPC.invoke.sessionRename, [sessionId, title]);
      }
      case "status": {
        // What the picker needs: the session's current model/mode and the
        // model options the Nib provider offers on this desktop, plus each
        // model's context window so the remote composer can show a
        // context-usage readout without a models.dev lookup of its own.
        const requested = typeof cmd.p.sessionId === "string" ? cmd.p.sessionId : "";
        let status: Record<string, unknown> = {};
        if (requested) {
          status = await this.invokeIpc(IPC.invoke.agentGetStatus, [requested]);
        }
        let models: Array<{ id: string; label?: string; contextWindow?: number }> = [];
        try {
          const row = await this.invokeIpc<{ models?: Array<Record<string, unknown>> }>(
            IPC.invoke.providersListModels,
            [{ providerId: "plugin:nib.provider:nib" }],
          );
          models = remoteStatusModels(row?.models);
        } catch {
          models = [];
        }
        return {
          modelId: status.modelId ?? null,
          permissionMode: status.permissionMode ?? null,
          models,
        };
      }
      case "configure": {
        const call = remoteConfigureCall(cmd.p);
        if (!call) throw new Error("sessionId required");
        return this.invokeIpc(IPC.invoke.sessionConfigure, [call.id, call.config]);
      }
      default:
        throw new Error(`unknown command: ${cmd.c}`);
    }
  }
}


/**
 * The model options a remote controller's picker renders, mapped from the
 * provider catalogue's own field names (modelId/displayName — the web page
 * used to read id/name and filtered every row away). The context window rides
 * along when the catalogue knows it: the remote context chip divides the
 * newest turn's usage by it.
 */
export function remoteStatusModels(
  models: Array<Record<string, unknown>> | undefined,
): Array<{ id: string; label?: string; contextWindow?: number }> {
  return (models ?? [])
    .map((m) => {
      const id =
        typeof m.modelId === "string" && m.modelId.trim()
          ? m.modelId
          : typeof m.id === "string"
            ? m.id
            : "";
      const rawLabel =
        typeof m.displayName === "string" && m.displayName.trim()
          ? m.displayName
          : typeof m.name === "string" && m.name.trim()
            ? m.name
            : "";
      const contextWindow =
        typeof m.contextWindow === "number" && Number.isFinite(m.contextWindow) && m.contextWindow > 0
          ? Math.round(m.contextWindow)
          : undefined;
      return { id: id.trim(), label: rawLabel.trim() || undefined, contextWindow };
    })
    .filter((m) => m.id.length > 0);
}

/**
 * The remote `configure` command becomes a sessionConfigure IPC call, whose
 * signature is (id, config) — not one merged object. Everything the session
 * legitimately takes is forwarded: model, permission mode, chat mode,
 * thinking level, fast mode.
 */
export function remoteConfigureCall(
  p: Record<string, unknown>,
): { id: string; config: Record<string, unknown> } | null {
  const id = typeof p.sessionId === "string" ? p.sessionId.trim() : "";
  if (!id) return null;
  const config: Record<string, unknown> = {};
  if (typeof p.modelId === "string" && p.modelId.trim()) config.modelId = p.modelId.trim();
  if (typeof p.permissionMode === "string") config.permissionMode = p.permissionMode;
  if (typeof p.mode === "string") config.mode = p.mode;
  if (typeof p.thinkingLevel === "string") config.thinkingLevel = p.thinkingLevel;
  if (typeof p.fastMode === "boolean") config.fastMode = p.fastMode;
  return { id, config };
}

type RemoteControlInternalState = {
  session: RemoteControlSession | null;
  phase: RemoteControlPhase;
  error?: string;
  url?: string;
  qrDataUrl?: string;
  machineName?: string;
  sid?: string;
  autoStart: boolean;
};

export type RemoteControl = {
  getState(): RemoteControlState;
  start(): Promise<RemoteControlState>;
  stop(): RemoteControlState;
  /** Rotate the stable pairing link; any previously scanned QR stops working. */
  regenerate(): Promise<RemoteControlState>;
  /** Wire into the central sendToRenderer so mirrored events flow. */
  observeEvent(channel: string, payload: unknown): void;
};

/** The maintenance surface register.ts needs beyond the plain control. */
export type RemoteControlWithMaintenance = RemoteControl & {
  setAutoStartEnabled: (enabled: boolean) => Promise<void>;
  maybeAutoStart: () => Promise<void>;
};

/** Mirrors the relay's handshake minimum for stored sids. */
const REMOTE_SID_MIN_LEN = 32;

export function createRemoteControl(deps: Deps): RemoteControlWithMaintenance {
  const state: RemoteControlInternalState = {
    session: null,
    phase: "idle",
    autoStart: false,
  };

  const broadcast = () => {
    deps.sendToRenderer(IPC.event.remoteControlChanged, getState());
  };

  async function machineIdentity(): Promise<{ mid: string; name: string }> {
    const dir = deps.dataDir();
    const file = join(dir, "remote-machine-id");
    let mid = "";
    try {
      mid = (await readFile(file, "utf8")).trim();
    } catch {
      mid = "";
    }
    if (!mid) {
      mid = randomUUID();
      await mkdir(dir, { recursive: true });
      await writeFile(file, mid, { mode: 0o600 });
    }
    return { mid, name: hostname() };
  }

  /**
   * The pairing sid is STABLE per machine: it is generated once, stored beside
   * the machine id, and reused by every later start. A phone that scanned the
   * QR once keeps working across stop/start cycles and app restarts — the
   * link only dies while the pairing is not running, because the relay only
   * routes while the host leg is attached. "Regenerate" is an explicit action
   * (a leaked link is rotated deliberately), not a side effect of restarting.
   */
  async function pairingSid(): Promise<string> {
    const dir = deps.dataDir();
    const file = join(dir, "remote-pairing-sid");
    let sid = "";
    try {
      sid = (await readFile(file, "utf8")).trim();
    } catch {
      sid = "";
    }
    if (sid.length >= REMOTE_SID_MIN_LEN) return sid;
    sid = randomBytes(32).toString("hex");
    await mkdir(dir, { recursive: true });
    await writeFile(file, sid, { mode: 0o600 });
    return sid;
  }

  async function regenerateSid(): Promise<string> {
    const dir = deps.dataDir();
    const sid = randomBytes(32).toString("hex");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "remote-pairing-sid"), sid, { mode: 0o600 });
    return sid;
  }

  async function readToken(): Promise<string> {
    // Same store the entitlements flow reads: the desktop's own nib.am session.
    const file = join(deps.dataDir(), "plugins", "data", "nib.provider", "settings.json");
    try {
      const parsed = JSON.parse(await readFile(file, "utf8")) as { nibAccessToken?: unknown };
      return typeof parsed.nibAccessToken === "string" ? parsed.nibAccessToken : "";
    } catch {
      return "";
    }
  }

  function getState(): RemoteControlState {
    return {
      active: state.session !== null,
      phase: state.phase,
      autoStart: state.autoStart,
      error: state.error,
      url: state.url,
      qrDataUrl: state.qrDataUrl,
      machineName: state.machineName,
      sid: state.sid,
    };
  }

  async function start(): Promise<RemoteControlState> {
    if (state.session) return getState();
    const token = await readToken();
    if (!token) {
      state.phase = "error";
      state.error = "NOT_SIGNED_IN";
      broadcast();
      throw Object.assign(new Error("Sign in to Nib before pairing a remote controller"), {
        errorCode: "NOT_SIGNED_IN",
      });
    }
    const identity = await machineIdentity();
    const sid = await pairingSid();
    const url = `${PAGE_BASE_URL}?sid=${sid}&mid=${encodeURIComponent(identity.mid)}&name=${encodeURIComponent(identity.name)}`;
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 });

    state.sid = sid;
    state.url = url;
    state.qrDataUrl = qrDataUrl;
    state.machineName = identity.name;
    state.error = undefined;

    // The session re-reads the token before every connection attempt, so a
    // renewal that lands mid-session is picked up on the next reconnect.
    state.session = new RemoteControlSession(deps, identity, readToken, sid, (phase, error) => {
      state.phase = phase;
      state.error = error;
      broadcast();
    });
    state.session.start();
    broadcast();
    return getState();
  }

  function stop(): RemoteControlState {
    state.session?.stop();
    state.session = null;
    state.phase = "idle";
    state.url = undefined;
    state.qrDataUrl = undefined;
    state.sid = undefined;
    broadcast();
    return getState();
  }

  async function readAutoStart(): Promise<boolean> {
    try {
      return (await readFile(join(deps.dataDir(), "remote-autostart"), "utf8")).trim() === "1";
    } catch {
      return false;
    }
  }

  async function setAutoStart(enabled: boolean): Promise<void> {
    const dir = deps.dataDir();
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "remote-autostart"), enabled ? "1" : "0", { mode: 0o600 });
    state.autoStart = enabled;
  }

  /** Called once at startup: honours the persisted start-with-app choice. */
  async function maybeAutoStart(): Promise<void> {
    if (!await readAutoStart()) return;
    try {
      await start();
      deps.logger.app("remote-control", "info", "pairing auto-started with the app");
    } catch (error) {
      deps.logger.app("remote-control", "warn", "pairing auto-start skipped", {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function regenerate(): Promise<RemoteControlState> {
    const wasRunning = state.session !== null;
    if (wasRunning) stop();
    await regenerateSid();
    if (wasRunning) await start();
    return getState();
  }

  const control: RemoteControl = {
    getState,
    start,
    stop,
    regenerate,
    observeEvent(channel, payload) {
      state.session?.observeEvent(channel, payload);
    },
  };

  activeControl = control;
  void (async () => {
    state.autoStart = await readAutoStart();
  })();

  return { ...control, setAutoStartEnabled: setAutoStart, maybeAutoStart };
}

/** IPC surface for the renderer's Settings card. */
export function registerRemoteControlIpc(
  registrar: { handle(channel: string, fn: (...args: unknown[]) => Promise<unknown>): void },
  control: RemoteControlWithMaintenance,
): void {
  registrar.handle(IPC.invoke.remoteControlGetState, async () => control.getState());
  registrar.handle(IPC.invoke.remoteControlStart, async () => control.start());
  registrar.handle(IPC.invoke.remoteControlStop, async () => control.stop());
  registrar.handle(IPC.invoke.remoteControlRegenerate, async () => control.regenerate());
  registrar.handle(IPC.invoke.remoteControlSetAutoStart, async (enabled: unknown) => {
    await control.setAutoStartEnabled?.(enabled === true);
    return control.getState();
  });
}

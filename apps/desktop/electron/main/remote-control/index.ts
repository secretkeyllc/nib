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
import { APP_VERSION, IPC } from "@pi-desktop/shared";
import type { AgentPromptRequest, AgentStopRequest, AskToolResolution } from "@pi-desktop/shared";

const RELAY_URL = "wss://nib.am/api/v1/remote/ws";
const PAGE_BASE_URL = "https://nib.am/remote/";

/** The renderer events the web page is allowed to see. Deliberately narrow. */
const MIRRORED_CHANNELS: ReadonlySet<string> = new Set([IPC.event.agentMessage]);

/** Re-pull the session list at most this often when sessionsChanged storms. */
const SESSION_REFRESH_MIN_INTERVAL_MS = 1_000;

/** App-level keepalive; well under Cloudflare's 100s idle cutoff. */
const HEARTBEAT_MS = 25_000;

/** Reconnect backoff bounds. */
const RECONNECT_MIN_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;

export type RemoteControlPhase = "idle" | "connecting" | "waiting" | "connected" | "error";

export type RemoteControlState = {
  active: boolean;
  phase: RemoteControlPhase;
  error?: string;
  url?: string;
  qrDataUrl?: string;
  machineName?: string;
  sid?: string;
};

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
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelay = RECONNECT_MIN_MS;
  private closedByUser = false;

  readonly sid = randomBytes(32).toString("hex");
  private lastSessionRefresh = 0;
  private sessionRefreshTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly deps: Deps,
    private readonly identity: { mid: string; name: string },
    private readonly token: string,
    private readonly onPhase: (phase: RemoteControlPhase, error?: string) => void,
  ) {}

  start(): void {
    this.open();
  }

  stop(): void {
    this.closedByUser = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.pingTimer = null;
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
      const list = (await executor.invoke(IPC.invoke.sessionList, [])) as {
        sessions?: Array<Record<string, unknown>>;
      };
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
    const ws = new WebSocket(RELAY_URL);
    this.ws = ws;

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          t: "hello",
          sid: this.sid,
          mid: this.identity.mid,
          name: this.identity.name,
          ver: APP_VERSION,
          token: this.token,
        }),
      );
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => this.rawSend(JSON.stringify({ t: "ping" })), HEARTBEAT_MS);
    });

    ws.on("message", (raw) => {
      let frame: Record<string, unknown>;
      try {
        frame = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch {
        return;
      }
      this.handleFrame(frame);
    });

    ws.on("error", () => {
      /* onclose follows; the reconnect logic owns recovery */
    });

    ws.on("close", () => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = null;
      this.ws = null;
      if (this.closedByUser) return;
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
      this.onPhase("waiting");
      // Prime the web page as soon as the relay accepts us; when a controller
      // attaches it re-requests everything it needs anyway.
      void this.pushSessions();
      return;
    }
    if (type === "ev" && frame.c === "remote/pairing") {
      const attached = (frame.p as { attached?: boolean } | undefined)?.attached === true;
      this.onPhase(attached ? "connected" : "waiting");
      return;
    }
    if (type === "cmd") {
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

  private async execute(cmd: RelayCommand): Promise<unknown> {
    if (!executor) throw new Error("executor unavailable");
    // Allowlist on purpose: a frame can only reach these six channels, never
    // storage, settings, or anything else the registrar exposes.
    switch (cmd.c) {
      case "snapshot": {
        const requested = typeof cmd.p.sessionId === "string" ? cmd.p.sessionId : "";
        const list = (await executor.invoke(IPC.invoke.sessionList, [])) as {
          sessions?: Array<Record<string, unknown>>;
        };
        const sessions = list.sessions ?? [];
        const target = requested || String(sessions[0]?.id ?? "");
        const detail = target
          ? await executor.invoke(IPC.invoke.sessionGet, [{ sessionId: target }])
          : null;
        return { sessions, detail };
      }
      case "prompt": {
        const sessionId = String(cmd.p.sessionId ?? "");
        const content = String(cmd.p.content ?? "");
        if (!sessionId || !content.trim()) throw new Error("sessionId and content required");
        return executor.invoke(IPC.invoke.agentPrompt, [{ sessionId, content } satisfies AgentPromptRequest]);
      }
      case "stop": {
        const sessionId = String(cmd.p.sessionId ?? "");
        if (!sessionId) throw new Error("sessionId required");
        return executor.invoke(IPC.invoke.agentStop, [{ sessionId } satisfies AgentStopRequest]);
      }
      case "ask-resolve": {
        const p = cmd.p as { requestId?: string; sessionId?: string; answers?: unknown };
        if (!p.requestId || !p.sessionId) throw new Error("requestId and sessionId required");
        return executor.invoke(IPC.invoke.askToolResolve, [
          {
            requestId: p.requestId,
            sessionId: p.sessionId,
            answers: Array.isArray(p.answers) ? p.answers : [],
          } satisfies AskToolResolution,
        ]);
      }
      case "new-session": {
        const created = await executor.invoke(IPC.invoke.sessionCreate, [{}]);
        void this.pushSessions();
        return created;
      }
      default:
        throw new Error(`unknown command: ${cmd.c}`);
    }
  }
}

type RemoteControlInternalState = {
  session: RemoteControlSession | null;
  phase: RemoteControlPhase;
  error?: string;
  url?: string;
  qrDataUrl?: string;
  machineName?: string;
  sid?: string;
};

export type RemoteControl = {
  getState(): RemoteControlState;
  start(): Promise<RemoteControlState>;
  stop(): RemoteControlState;
  /** Wire into the central sendToRenderer so mirrored events flow. */
  observeEvent(channel: string, payload: unknown): void;
};

export function createRemoteControl(deps: Deps): RemoteControl {
  const state: RemoteControlInternalState = {
    session: null,
    phase: "idle",
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
    const sid = randomBytes(32).toString("hex");
    const url = `${PAGE_BASE_URL}?sid=${sid}&mid=${encodeURIComponent(identity.mid)}&name=${encodeURIComponent(identity.name)}`;
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 });

    state.sid = sid;
    state.url = url;
    state.qrDataUrl = qrDataUrl;
    state.machineName = identity.name;
    state.error = undefined;

    state.session = new RemoteControlSession(deps, identity, token, (phase, error) => {
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

  const control: RemoteControl = {
    getState,
    start,
    stop,
    observeEvent(channel, payload) {
      state.session?.observeEvent(channel, payload);
    },
  };

  activeControl = control;
  return control;
}

/** IPC surface for the renderer's Settings card. */
export function registerRemoteControlIpc(
  registrar: { handle(channel: string, fn: (...args: unknown[]) => Promise<unknown>): void },
  control: RemoteControl,
): void {
  registrar.handle(IPC.invoke.remoteControlGetState, async () => control.getState());
  registrar.handle(IPC.invoke.remoteControlStart, async () => control.start());
  registrar.handle(IPC.invoke.remoteControlStop, async () => control.stop());
}

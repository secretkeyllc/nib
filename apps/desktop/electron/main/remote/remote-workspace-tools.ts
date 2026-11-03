import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { RemoteHostsBoot } from "../bootstrap/remote-hosts";

export type RemoteWorkspaceToolRequest = {
  requestId: string;
  sessionId: string;
  turnId: string;
  toolCallId: string;
  toolName: string;
  args: unknown;
  remoteWorkspace: { hostKey: string; path: string };
  timeoutMs?: number;
  expectedCommandShellId?: string;
  expectedCommandShellDialect?: string;
};

type HostReply = { call(method: string, params: Record<string, unknown>): Promise<unknown> };
type Dependencies = {
  getBoot: () => RemoteHostsBoot | null;
  isCurrent: () => boolean;
  isTurnDispatchable: (sessionId: string, turnId: string) => boolean;
  log: (message: string, error: unknown) => void;
};

/**
 * Sessions whose tools this build has relayed to a remote host, keyed by the
 * session id. A remote relay is the definition of "this session's tools run
 * remotely", so the prompt's own attachments follow the same host: a Windows
 * or macOS desktop session whose project binding lives in the Windows
 * host-core still gets its uploads there.
 *
 * The map is an LRU cache over a durable JSON file: a desktop restart must not
 * detach a running remote session's attachments from the host that has been
 * executing its tools all along. Writes are throttled to the recording moment
 * and the file lives beside the other Main-process preferences.
 */
const SESSION_TOOL_HOST_LIMIT = 512;
let sessionToolHosts = new Map<string, string>();
let toolHostStoreFile: string | null = null;
let toolHostFlushTimer: NodeJS.Timeout | undefined;

function flushSessionToolHosts(): void {
  if (!toolHostStoreFile) return;
  try {
    mkdirSync(dirname(toolHostStoreFile), { recursive: true });
    const temporary = join(dirname(toolHostStoreFile), `.session-tool-hosts-${process.pid}.tmp`);
    writeFileSync(temporary, JSON.stringify({
      version: 1,
      hosts: [...sessionToolHosts.entries()].slice(-SESSION_TOOL_HOST_LIMIT),
    }), { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, toolHostStoreFile);
  } catch (error) {
    try { deps0?.log?.("session tool host persistence failed", error); } catch { /* noop */ }
  }
}

// Late-bound logger; set together with the store file during wiring.
let deps0: { log?: (message: string, error: unknown) => void } | undefined;

function scheduleSessionToolHostFlush(): void {
  if (toolHostFlushTimer) return;
  toolHostFlushTimer = setTimeout(() => {
    toolHostFlushTimer = undefined;
    flushSessionToolHosts();
  }, 250);
  toolHostFlushTimer.unref?.();
}

/** Load the durable record once Main names its data directory. */
export function loadSessionToolHosts(dataDir: string): void {
  toolHostStoreFile = join(dataDir, "session-tool-hosts.json");
  try {
    const value: unknown = JSON.parse(readFileSync(toolHostStoreFile, "utf8"));
    if (value && typeof value === "object" && !Array.isArray(value)
      && (value as { version?: unknown }).version === 1
      && Array.isArray((value as { hosts?: unknown }).hosts)) {
      const restored = new Map<string, string>();
      for (const entry of (value as { hosts: unknown[] }).hosts) {
        if (Array.isArray(entry) && entry.length === 2
          && typeof entry[0] === "string" && typeof entry[1] === "string") {
          restored.set(entry[0], entry[1]);
        }
      }
      sessionToolHosts = restored;
    }
  } catch {
    // A missing or unreadable file starts from an empty cache.
  }
}

/** Wire the failure logger used by the persistence best-effort writes. */
export function setSessionToolHostLogger(log: (message: string, error: unknown) => void): void {
  deps0 = { log };
}

function rememberSessionToolHost(sessionId: string, hostKey: string): void {
  if (sessionToolHosts.get(sessionId) === hostKey) return;
  sessionToolHosts.delete(sessionId);
  if (sessionToolHosts.size >= SESSION_TOOL_HOST_LIMIT) {
    sessionToolHosts.delete(sessionToolHosts.keys().next().value!);
  }
  sessionToolHosts.set(sessionId, hostKey);
  scheduleSessionToolHostFlush();
}

/**
 * The remote host a session's tools execute on, or `undefined` when the
 * session is purely local. Attachment upload asks this alongside the explicit
 * remote-workspace bindings: whichever way the session reached remote tools,
 * the attachments must take the same route to stay readable.
 */
export function sessionToolHost(sessionId: string): string | undefined {
  return sessionToolHosts.get(sessionId);
}

/** Test seam for the relay-recorded fact; production writes go through execute(). */
export function rememberSessionToolHostForTest(sessionId: string, hostKey: string): void {
  rememberSessionToolHost(sessionId, hostKey);
}

/** Test seam clearing the record without touching the durable file. */
export function resetSessionToolHostsForTest(): void {
  sessionToolHosts = new Map();
}

/** Local permission admission precedes this relay. No models or credentials cross it. */
export function createRemoteWorkspaceToolRelay(host: HostReply, deps: Dependencies) {
  const active = new Map<string, RemoteWorkspaceToolRequest>();
  const cancelled = new Set<string>();
  const keyFor = (request: Pick<RemoteWorkspaceToolRequest, "sessionId" | "toolCallId">) =>
    JSON.stringify([request.sessionId, request.toolCallId]);
  const failure = (error: unknown) => ({
    ok: false, isError: true,
    errorCode: error && typeof error === "object" && "errorCode" in error && typeof error.errorCode === "string"
      ? error.errorCode : "REMOTE_TOOL_FAILED",
    content: { error: error instanceof Error ? error.message : String(error) },
  });
  const abort = async (request: RemoteWorkspaceToolRequest) => {
    await deps.getBoot()?.abortWorkspaceTool({ hostKey: request.remoteWorkspace.hostKey,
      sessionId: request.sessionId, toolCallId: request.toolCallId });
  };
  return {
    async execute(request: RemoteWorkspaceToolRequest) {
      const key = keyFor(request);
      let result: unknown;
      let ownsActive = false;
      try {
        if (!deps.isCurrent() || !deps.isTurnDispatchable(request.sessionId, request.turnId)
          || cancelled.has(key)) throw Object.assign(new Error("remote tool turn was cancelled"), { errorCode: "TOOL_ABORTED" });
        const boot = deps.getBoot();
        if (!boot) throw new Error("remote host is unavailable");
        if (active.has(key)) throw new Error("duplicate remote tool dispatch");
        // The relay is where "this session runs its tools remotely" becomes a
        // fact, so it is the recording point for attachment routing, too.
        rememberSessionToolHost(request.sessionId, request.remoteWorkspace.hostKey);
        active.set(key, request);
        ownsActive = true;
        ownsActive = true;
        result = await boot.executeWorkspaceTool({ ...request.remoteWorkspace,
          sessionId: request.sessionId, turnId: request.turnId, toolCallId: request.toolCallId,
          toolName: request.toolName, args: request.args,
          ...(typeof request.timeoutMs === "number" ? { timeoutMs: request.timeoutMs } : {}),
          ...(request.expectedCommandShellId ? { expectedCommandShellId: request.expectedCommandShellId } : {}),
          ...(request.expectedCommandShellDialect ? { expectedCommandShellDialect: request.expectedCommandShellDialect } : {}),
        });
        if (!deps.isCurrent() || cancelled.has(key)) throw Object.assign(new Error("remote tool was cancelled"), { errorCode: "TOOL_ABORTED" });
      } catch (error) {
        result = failure(error);
      } finally {
        if (ownsActive) {
          active.delete(key);
          cancelled.delete(key);
        }
      }
      if (!deps.isCurrent()) return;
      try { await host.call("tools.remoteComplete", { requestId: request.requestId, result }); }
      catch (error) { deps.log("remote tool completion failed", error); }
    },
    cancel(input: { sessionId: string; toolCallId: string }) {
      const key = keyFor(input);
      const request = active.get(key);
      if (!request) return;
      cancelled.add(key);
      void abort(request).catch((error) => deps.log("remote tool cancellation failed", error));
    },
    dispose() {
      for (const request of active.values()) {
        cancelled.add(keyFor(request));
        void abort(request).catch((error) => deps.log("remote tool shutdown failed", error));
      }
    },
  };
}

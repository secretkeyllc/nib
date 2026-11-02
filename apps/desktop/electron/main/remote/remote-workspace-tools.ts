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
 * host-core still gets its uploads there. LRU-bounded; a rebind overwrites.
 */
const sessionToolHosts = new Map<string, string>();
const SESSION_TOOL_HOST_LIMIT = 512;
function rememberSessionToolHost(sessionId: string, hostKey: string): void {
  if (sessionToolHosts.get(sessionId) === hostKey) return;
  sessionToolHosts.delete(sessionId);
  if (sessionToolHosts.size >= SESSION_TOOL_HOST_LIMIT) {
    sessionToolHosts.delete(sessionToolHosts.keys().next().value!);
  }
  sessionToolHosts.set(sessionId, hostKey);
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

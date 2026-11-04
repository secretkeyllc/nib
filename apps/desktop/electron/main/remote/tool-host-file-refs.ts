import type { WorkspaceFilesRequest } from "@pi-desktop/shared";
import { parseRemoteSessionId } from "./backend-router";
import { sessionToolHost } from "./remote-workspace-tools";

type FilesBoot = { workspaceFiles(hostKey: string, input: WorkspaceFilesRequest): Promise<unknown> };

/**
 * Answer a file request on the Host that ran this session's tools.
 *
 * This is the preview complement of the attachment upload (ADR
 * remote-workspace-attachment-copies): an uploaded chip's prompt path names a
 * file on the remote Host that the desktop has never stored locally. The tool
 * relay recorded which Host that was, and the Host admits only the session's
 * own scratch copy for the request — never ~/.nib at large. Local resolution
 * stays first at every call site; a session without a relayed tool Host, or a
 * Host that cannot answer, changes nothing about the local behavior.
 */
export async function resolveViaSessionToolHost<T>(options: {
  sessionId?: string;
  operation: WorkspaceFilesRequest["operation"];
  ref?: string;
  mimeType?: string;
  boot: FilesBoot | null;
}): Promise<T | null> {
  const { sessionId, operation, ref, mimeType, boot } = options;
  if (!sessionId || !boot) return null;
  // The renderer sends the id it holds: the namespaced `remote:<hostKey>:<uuid>`
  // form names its Host outright, while a bare uuid (a session whose backend
  // was not namespaced by the connection) relies on the relay record. When
  // neither names a Host — a local session that has simply never relayed a
  // tool — there is nothing remote to ask and the caller's local answer stands.
  const parsed = parseRemoteSessionId(sessionId);
  const hostKey = parsed?.hostKey ?? sessionToolHost(sessionId);
  const hostSessionId = parsed?.hostSessionId ?? sessionId;
  if (!hostKey) return null;
  try {
    return await boot.workspaceFiles(hostKey, {
      // The sentinel names no workspace: the Host roots the request in the
      // session's own scratch directory alone.
      path: "/.session-scratch",
      operation,
      ...(ref ? { ref } : {}),
      ...(mimeType ? { mimeType } : {}),
      sessionId: hostSessionId,
    }) as T;
  } catch {
    // A stale relay record or an unreachable Host must not mask the caller's
    // local answer; fall back to it.
    return null;
  }
}

/**
 * Hosts a bare session uuid may belong to when no relay record names one.
 *
 * An uploaded attachment's remote copy is resolved by the Host that stored it,
 * and the store is keyed by the host session id — which for a connected host
 * session is the same uuid the renderer holds. The relay record is written by
 * the tool path, so a session that has not run a remote tool yet (or whose
 * record was pruned) would otherwise never reach its own scratch copy. Asking
 * each connected Host is bounded and safe: every Host but the owning one
 * answers "no such session", and the request carries no path outside that
 * session's scratch.
 */
export async function resolveViaConnectedHosts<T>(options: {
  sessionIds: readonly string[];
  operation: WorkspaceFilesRequest["operation"];
  ref?: string;
  mimeType?: string;
  boot: FilesBoot | null;
}): Promise<T | null> {
  const { sessionIds, operation, ref, mimeType, boot } = options;
  if (!boot || sessionIds.length === 0) return null;
  const hosts = (boot as { list?: () => Promise<Array<{ hostKey?: string; connected?: boolean }>> }).list;
  if (typeof hosts !== "function") return null;
  let connected: Array<{ hostKey?: string; connected?: boolean }>;
  try {
    connected = await hosts.call(boot);
  } catch {
    return null;
  }
  for (const host of connected) {
    const hostKey = host?.hostKey;
    if (typeof hostKey !== "string" || !hostKey || host.connected === false) continue;
    for (const sessionId of sessionIds) {
      if (!sessionId) continue;
      try {
        const answer = await boot.workspaceFiles(hostKey, {
          path: "/.session-scratch",
          operation,
          ...(ref ? { ref } : {}),
          ...(mimeType ? { mimeType } : {}),
          sessionId,
        }) as T;
        if (answer) return answer;
      } catch {
        // A Host that does not know this session (or is unreachable) cannot
        // answer for it; keep looking.
        continue;
      }
    }
  }
  return null;
}

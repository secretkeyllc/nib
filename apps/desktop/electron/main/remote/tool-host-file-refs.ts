import type { WorkspaceFilesRequest } from "@pi-desktop/shared";
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
  const hostKey = sessionToolHost(sessionId);
  if (!hostKey) return null;
  try {
    return await boot.workspaceFiles(hostKey, {
      // The sentinel names no workspace: the Host roots the request in the
      // session's own scratch directory alone.
      path: "/.session-scratch",
      operation,
      ...(ref ? { ref } : {}),
      ...(mimeType ? { mimeType } : {}),
      sessionId,
    }) as T;
  } catch {
    // A stale relay record or an unreachable Host must not mask the caller's
    // local answer; fall back to it.
    return null;
  }
}

import { realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join } from "node:path";
import { RacpError } from "@pi-desktop/agent-host";
import { loadProjectInstructions } from "@pi-desktop/agent-runtime";
import { collectWorkspaceDiff, getWorkspaceFileIndex, isChatRefOutsideRoots, listDir, readOpenableFile, readOpenableImage, resolveChatFileRef } from "@pi-desktop/host-runtime";
import type { RacpHostOperations } from "@pi-desktop/racp";

/** Session ids key the mirrored attachment scratch; keep them directory-safe. */
function safeSessionId(value: string | undefined): string | null {
  if (!value || value.length > 256) return null;
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
}

/**
 * File views are rooted in the explicit SSH workspace. A caller naming its
 * session additionally admits that session's own scratch copy — the uploaded
 * attachments' home (mirrored Desktop layout) — for resolve/read. The grant
 * covers only that one session-private directory, never ~/.nib at large.
 */
export function createWorkspaceFiles(): NonNullable<RacpHostOperations["workspaceFiles"]> {
  return { async read(input) {
    const sessionId = safeSessionId(input.sessionId);
    // A resolve that names no workspace uses the session's own scratch as the
    // only root: the chip preview for an uploaded attachment.
    const scratchOnly = input.path === "/.session-scratch";
    const extraRoots: string[] = [];
    if (sessionId) {
      const dataRoot = process.env.NIB_HOST_DATA_DIR ?? join(homedir(), ".nib");
      const sessionScratch = join(dataRoot, "scratch", sessionId);
      if (await stat(sessionScratch).then(() => true).catch(() => false)) extraRoots.push(sessionScratch);
    }
    const root = scratchOnly
      ? (extraRoots[0] ?? null)
      : (isAbsolute(input.path) && !/[\u0000-\u001f]/.test(input.path)
        ? await realpath(input.path).catch(() => null)
        : null);
    if (!root || !(await stat(root)).isDirectory()) {
      // A well-formed absolute root that does not exist is "not found"; only a
      // malformed path is an invalid argument.
      const notFound = scratchOnly || isAbsolute(input.path);
      throw new RacpError(
        notFound ? "REMOTE_PATH_NOT_FOUND" : "INVALID_ARGUMENT",
        notFound ? "workspace directory is unavailable" : "invalid workspace root",
      );
    }
    const ref = input.ref ?? "";
    try {
      switch (input.operation) {
        case "list": return { entries: await listDir(root, ref) };
        case "read": return await readOpenableFile(ref, root, extraRoots, input.mimeType);
        case "image": return await readOpenableImage(ref, root, extraRoots, input.mimeType);
        case "index": return await getWorkspaceFileIndex(root);
        case "diff": return await collectWorkspaceDiff(root);
        case "instructions": return (await loadProjectInstructions(root)) ?? { entries: [] };
        case "resolve": {
          const roots = {
            ...(scratchOnly ? {} : { project: [{ path: root, name: basename(root), primary: true }] }),
            ...(extraRoots.length ? {
              containment: extraRoots.map((path) => ({ kind: "scratch" as const, path })),
              scratch: extraRoots[0],
            } : {}),
          };
          if (await isChatRefOutsideRoots(ref, roots)) return { match: null, reason: "outside-allowed-roots" };
          return { match: await resolveChatFileRef(ref, roots) };
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/escapes workspace root|outside allowed roots|not openable/.test(message)) throw new RacpError("REMOTE_PATH_FORBIDDEN", message);
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") throw new RacpError("REMOTE_PATH_NOT_FOUND", message);
      throw error;
    }
  } };
}

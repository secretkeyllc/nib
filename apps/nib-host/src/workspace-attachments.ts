import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { chmod, link, lstat, mkdir, open, readdir, realpath, stat, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { RacpError } from "@pi-desktop/agent-host";
import { WORKSPACE_ATTACHMENT_CHUNK_BYTES, WORKSPACE_ATTACHMENT_MAX_BYTES } from "@pi-desktop/shared";
import type { RacpHostOperations } from "@pi-desktop/racp";

type Service = NonNullable<RacpHostOperations["workspaceAttachments"]>;
type Owner = { deviceId: string; connectionId: string };
type Upload = {
  owner: Owner; sessionId: string; size: number; sha256: string; name: string;
  offset: number; tempPath: string; timer: NodeJS.Timeout; cancelled: boolean;
  /** Desktop's storage rule for this attachment, mirrored 1:1 on the Host. */
  directory: string;
};
const MAX_ACTIVE = 16;
const LIFETIME_MS = 15 * 60 * 1000;

function safeName(input: string): string {
  const leaf = basename(input.replaceAll("\\", "/")).normalize("NFC");
  const originalExt = extname(leaf);
  const ext = originalExt.replace(/[^.\p{L}\p{N}_-]/gu, "").slice(0, 16);
  const stem = leaf.slice(0, leaf.length - originalExt.length).replace(/[^\p{L}\p{N}._ -]/gu, "_").replace(/^\.+|\.+$/g, "").trim();
  let bounded = "";
  for (const char of stem) { if (Buffer.byteLength(bounded + char) > 140) break; bounded += char; }
  return `${bounded || "attachment"}${ext}`;
}
function inside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return !rel || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
}
async function privateDirectory(path: string): Promise<void> {
  await mkdir(path, { mode: 0o700 }).catch((error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; });
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new RacpError("REMOTE_PATH_FORBIDDEN", "unsafe attachment storage directory");
  await chmod(path, 0o700);
}

/** Ready files are retained for historical reads until explicit Host storage cleanup.
 * Staging is outside tool-readable session scratch; it expires after 15 minutes.
 */
export function createWorkspaceAttachments(dataDir = join(homedir(), ".nib")): Service {
  const uploads = new Map<string, Upload>();
  const pendingCreates = new Set<{ connectionId: string; cancelled: boolean }>();
  let queue = Promise.resolve();
  let queued = 0;
  let recoveredStaging = false;
  // Serialize filesystem transitions, including disconnect/expiry, with a bounded queue.
  const serial = <T>(work: () => Promise<T>, cleanup = false): Promise<T> => {
    if (!cleanup && queued >= 64) return Promise.reject(new RacpError("RATE_LIMITED", "attachment request queue is full"));
    queued++;
    const result = queue.then(work);
    queue = result.then(() => { queued--; }, () => { queued--; });
    return result;
  };
  async function storage() {
    await mkdir(resolve(dataDir), { recursive: true, mode: 0o700 });
    const root = await realpath(dataDir);
    const scratch = join(root, "scratch");
    const staging = join(root, ".workspace-attachment-uploads");
    await privateDirectory(scratch);
    await privateDirectory(staging);
    if (!recoveredStaging) {
      // A new service has no live uploads; .part files belong to its crashed predecessor.
      for (const entry of await readdir(staging, { withFileTypes: true })) {
        if (!/^[a-f0-9]{32}\.part$/.test(entry.name) || !entry.isFile()) continue;
        await unlink(join(staging, entry.name));
      }
      recoveredStaging = true;
    }
    return { root, scratch, staging };
  }
  async function readyDirectory(sessionId: string, directory: string): Promise<string> {
    const { root, scratch } = await storage();
    // The Desktop's content-addressed rule keeps blobs outside the session
    // tree (`~/.nib/attachments/<sha256>`); pasted sources live under the
    // session scratch like on the Desktop (`~/.nib/scratch/<sid>/pasted/`).
    if (directory === "content") {
      const ready = join(root, "attachments");
      await privateDirectory(ready);
      return ready;
    }
    const session = join(scratch, sessionId);
    await privateDirectory(session);
    const ready = join(session, directory);
    await privateDirectory(ready);
    return ready;
  }
  async function remove(id: string, upload: Upload): Promise<void> {
    clearTimeout(upload.timer);
    uploads.delete(id);
    await unlink(upload.tempPath).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
  }
  function owned(id: string, owner: Owner): Upload {
    const upload = uploads.get(id);
    if (!upload) throw new RacpError("NOT_FOUND", "attachment upload not found");
    if (upload.owner.deviceId !== owner.deviceId || upload.owner.connectionId !== owner.connectionId) throw new RacpError("FORBIDDEN", "attachment upload belongs to another connection");
    return upload;
  }
  const service: Service = {
    create(input, owner) {
      // `path` is the Desktop-side workspace project directory used for the
      // overlap guard. A host-connected session without a bound project omits
      // it; uploads then cannot touch a project because they never write one.
      const workspacePath = typeof input.path === "string" ? input.path : undefined;
      if (!owner.deviceId || !owner.connectionId || !input.sessionId || input.sessionId.length > 256 || !input.name || input.name.length > 1024 || (workspacePath !== undefined && (!isAbsolute(workspacePath) || workspacePath.length > 4096 || /[\u0000-\u001f]/.test(workspacePath))) || !Number.isSafeInteger(input.size) || input.size < 0 || input.size > WORKSPACE_ATTACHMENT_MAX_BYTES || !/^[a-fA-F0-9]{64}$/.test(input.sha256)) return Promise.reject(new RacpError("INVALID_ARGUMENT", "invalid attachment request"));
      const pending = { connectionId: owner.connectionId, cancelled: false };
      pendingCreates.add(pending);
      return serial(async () => {
        if (pending.cancelled) throw new RacpError("CONFLICT", "attachment connection closed");
        if (uploads.size >= MAX_ACTIVE) throw new RacpError("RATE_LIMITED", "attachment upload capacity exhausted");
        if (workspacePath !== undefined) {
          const original = await lstat(workspacePath).catch(() => undefined);
          if (original?.isSymbolicLink()) throw new RacpError("REMOTE_PATH_FORBIDDEN", "workspace symlink is not allowed");
          const workspace = await realpath(workspacePath).catch(() => undefined);
          if (!workspace || !(await stat(workspace)).isDirectory()) throw new RacpError("REMOTE_PATH_NOT_FOUND", "workspace directory unavailable");
          const { root } = await storage();
          // Reject overlapping roots: uploads must never mutate the selected project.
          if (inside(workspace, root) || inside(root, workspace)) throw new RacpError("REMOTE_PATH_FORBIDDEN", "workspace overlaps Host data directory");
        }
        // The Desktop names the session-private directory its own storage rule
        // dictates, so a local path maps 1:1 onto the Host path.
        const directory = input.directory === "pasted" || input.directory === "content" ? input.directory : "attachments";
        await readyDirectory(input.sessionId, directory);
        const id = randomUUID().replaceAll("-", "");
        const tempPath = join((await storage()).staging, `${id}.part`);
        const file = await open(tempPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
        await file.close();
        const timer = setTimeout(() => {
          void serial(async () => { const active = uploads.get(id); if (active) await remove(id, active); }, true).catch(error => console.warn("Attachment expiry cleanup failed", error));
        }, LIFETIME_MS);
        timer.unref?.();
        const upload: Upload = { owner: { ...owner }, sessionId: input.sessionId, size: input.size, sha256: input.sha256.toLowerCase(), name: safeName(input.name), offset: 0, tempPath, timer, cancelled: false, directory };
        uploads.set(id, upload);
        if (pending.cancelled) { await remove(id, upload); throw new RacpError("CONFLICT", "attachment connection closed"); }
        return { uploadId: id };
      }).finally(() => { pendingCreates.delete(pending); });
    },
    chunk(input, owner) {
      if (input.data.length > 349528 || !Number.isSafeInteger(input.offset) || input.offset < 0) return Promise.reject(new RacpError("INVALID_ARGUMENT", "invalid attachment chunk"));
      return serial(async () => {
        const upload = owned(input.uploadId, owner);
        const bytes = Buffer.from(input.data, "base64");
        if (!bytes.length || bytes.length > WORKSPACE_ATTACHMENT_CHUNK_BYTES || bytes.toString("base64") !== input.data) throw new RacpError("INVALID_ARGUMENT", "invalid attachment chunk encoding or size");
        if (input.offset !== upload.offset) throw new RacpError("CONFLICT", "attachment chunk offset is not sequential");
        if (upload.offset + bytes.length > upload.size) throw new RacpError("PAYLOAD_TOO_LARGE", "attachment exceeds declared size");
        try {
          await storage();
          const file = await open(upload.tempPath, constants.O_WRONLY | constants.O_NOFOLLOW);
          try {
            if (!(await file.stat()).isFile()) throw new RacpError("REMOTE_PATH_FORBIDDEN", "unsafe attachment staging file");
            let written = 0;
            while (written < bytes.length) {
              const result = await file.write(bytes, written, bytes.length - written, upload.offset + written);
              if (!result.bytesWritten) throw new Error("attachment write made no progress");
              written += result.bytesWritten;
            }
          } finally { await file.close(); }
          upload.offset += bytes.length;
          return { offset: upload.offset };
        } catch (error) { await remove(input.uploadId, upload); throw error; }
      });
    },
    complete(input, owner) {
      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(input.uploadId)) return Promise.reject(new RacpError("INVALID_ARGUMENT", "invalid attachment completion"));
      return serial(async () => {
        const upload = owned(input.uploadId, owner);
        if (upload.offset !== upload.size) throw new RacpError("CONFLICT", "attachment size is incomplete");
        try {
          await storage();
          const file = await open(upload.tempPath, constants.O_RDONLY | constants.O_NOFOLLOW);
          const hash = createHash("sha256");
          try {
            const info = await file.stat();
            if (!info.isFile() || info.size !== upload.size) throw new RacpError("INVALID_ARGUMENT", "attachment size mismatch");
            for await (const bytes of file.createReadStream({ autoClose: false })) hash.update(bytes);
          } finally { await file.close(); }
          const actual = hash.digest("hex");
          if (actual !== upload.sha256) throw new RacpError("INVALID_ARGUMENT", "attachment SHA-256 mismatch");
          // The mirrored name is the Desktop's own convention for this kind:
          // `attachments/<sha256>` for content-addressed blobs, the original
          // file name otherwise. Same-hash retries reuse the verified file.
          const readyDirectoryPath = await readyDirectory(upload.sessionId, upload.directory);
          const target = upload.directory === "content"
            ? join(readyDirectoryPath, upload.sha256)
            : join(readyDirectoryPath, upload.name);
          if (upload.cancelled) throw new RacpError("CONFLICT", "attachment connection closed");
          const existing = await lstat(target).catch(() => undefined);
          if (existing) {
            if (existing.isSymbolicLink() || !existing.isFile()) throw new RacpError("REMOTE_PATH_FORBIDDEN", "unsafe existing attachment");
            const existingFile = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
            try {
              const existingInfo = await existingFile.stat();
              if (existingInfo.size !== upload.size) throw new RacpError("CONFLICT", "existing attachment size mismatch");
              const existingDigest = createHash("sha256");
              for await (const bytes of existingFile.createReadStream({ autoClose: false })) existingDigest.update(bytes);
              if (existingDigest.digest("hex") !== actual) throw new RacpError("CONFLICT", "existing attachment hash mismatch");
            } finally { await existingFile.close(); }
            await remove(input.uploadId, upload);
            return { path: target, sha256: actual, size: upload.size };
          }
          // Hard-link publication is atomic and never replaces an existing file.
          await link(upload.tempPath, target).catch(async (error: NodeJS.ErrnoException) => {
            if (error.code !== "EEXIST") throw error;
            const existing = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
            try {
              const info = await existing.stat();
              if (!info.isFile() || info.size !== upload.size) throw new RacpError("CONFLICT", "existing attachment size mismatch");
              const digest = createHash("sha256");
              for await (const bytes of existing.createReadStream({ autoClose: false })) digest.update(bytes);
              if (digest.digest("hex") !== actual) throw new RacpError("CONFLICT", "existing attachment hash mismatch");
            } finally { await existing.close(); }
          });
          await remove(input.uploadId, upload);
          return { path: target, sha256: actual, size: upload.size };
        } catch (error) {
          await remove(input.uploadId, upload);
          if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new RacpError("CONFLICT", "attachment already exists");
          throw error;
        }
      });
    },
    abort(input, owner) {
      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(input.uploadId)) return Promise.reject(new RacpError("INVALID_ARGUMENT", "invalid attachment abort"));
      return serial(async () => { await remove(input.uploadId, owned(input.uploadId, owner)); return { ok: true }; });
    },
    disconnect(connectionId) {
      for (const pending of pendingCreates) if (pending.connectionId === connectionId) pending.cancelled = true;
      for (const upload of uploads.values()) if (upload.owner.connectionId === connectionId) upload.cancelled = true;
      return serial(async () => {
        for (const [id, upload] of uploads) if (upload.owner.connectionId === connectionId) await remove(id, upload);
      }, true);
    },
  };
  return service;
}

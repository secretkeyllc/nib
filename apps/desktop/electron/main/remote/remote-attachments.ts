import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open } from "node:fs/promises";
import {
  formatPromptPathText,
  replacePromptPathReferences,
  WORKSPACE_ATTACHMENT_CHUNK_BYTES,
  WORKSPACE_ATTACHMENT_MAX_BYTES,
  type AgentPromptAttachment,
} from "@pi-desktop/shared";
import type { PreparedPromptAttachment } from "../prompt-attachments";

export type RemoteAttachmentClient = {
  request<T>(method: string, params?: unknown, timeoutMs?: number): Promise<T>;
};
export type RemoteAttachmentWorkspace = { hostKey: string; path: string };
type UploadedAttachment = { path: string; sha256: string; size: number };
type ModelAttachment = AgentPromptAttachment & { data?: string };

function failure(message: string, errorCode = "INVALID_RESPONSE"): Error {
  return Object.assign(new Error(message), { errorCode });
}

async function readBoundedSource(path: string): Promise<Buffer> {
  const file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const info = await file.stat();
    if (!info.isFile()) throw failure("attachment source is not a regular file", "INVALID_ARGUMENT");
    if (info.size > WORKSPACE_ATTACHMENT_MAX_BYTES) throw failure("remote attachment exceeds 50 MiB", "PAYLOAD_TOO_LARGE");
    const bytes = Buffer.alloc(info.size);
    let offset = 0;
    while (offset < bytes.length) {
      const result = await file.read(bytes, offset, bytes.length - offset, offset);
      if (!result.bytesRead) throw failure("attachment changed during upload", "INVALID_ARGUMENT");
      offset += result.bytesRead;
    }
    if ((await file.stat()).size !== info.size) throw failure("attachment changed during upload", "INVALID_ARGUMENT");
    return bytes;
  } finally { await file.close(); }
}

/** Only Main-prepared sources enter here. The transcript keeps local preview refs. */
export async function uploadRemotePromptAttachments(
  client: RemoteAttachmentClient,
  workspace: RemoteAttachmentWorkspace,
  sessionId: string,
  promptContent: string,
  attachments: readonly PreparedPromptAttachment[],
  isCurrent: () => boolean = () => true,
): Promise<{ content: string; attachments: ModelAttachment[] }> {
  let content = promptContent;
  const modelAttachments: ModelAttachment[] = [];
  const uploadedPaths = new Map<string, UploadedAttachment>();
  const assertCurrent = () => {
    if (!isCurrent()) throw failure("attachment turn was cancelled", "TOOL_ABORTED");
  };
  for (const prepared of attachments) {
    assertCurrent();
    if (prepared.message.kind === "session") throw failure("conversation references are not uploadable files", "INVALID_ARGUMENT");
    const source = prepared.sourcePath ?? prepared.fallbackPath;
    let uploaded = uploadedPaths.get(source);
    if (!uploaded) {
      const bytes = await readBoundedSource(source);
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      assertCurrent();
      // The Host mirrors the Desktop storage rule regardless of a project
      // binding: the raw (host) session id and the same directory + file name
      // the local path uses, so a local path maps 1:1 to the remote path.
      // Content-addressed blobs (`attachments/<sha256>`) keep their shared
      // rule; pasted sources keep `pasted/<originalName>`.
      const directory = prepared.message.ref?.startsWith("attachments/") ? "content" : "pasted";
      const created = await client.request<{ uploadId: string }>("workspace/attachmentCreate", {
        ...(workspace.path ? { path: workspace.path } : {}),
        sessionId, directory, name: prepared.message.name, size: bytes.length, sha256,
      });
      if (!created || typeof created.uploadId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(created.uploadId)) {
        throw failure("remote Host returned an invalid upload id");
      }
      const { uploadId } = created;
      try {
        for (let offset = 0; offset < bytes.length; offset += WORKSPACE_ATTACHMENT_CHUNK_BYTES) {
          assertCurrent();
          const chunk = bytes.subarray(offset, offset + WORKSPACE_ATTACHMENT_CHUNK_BYTES);
          const reply = await client.request<{ offset: number }>("workspace/attachmentChunk", {
            uploadId, offset, data: chunk.toString("base64"),
          });
          if (reply?.offset !== offset + chunk.length) throw failure("remote Host acknowledged an invalid upload offset");
        }
        assertCurrent();
        uploaded = await client.request<UploadedAttachment>("workspace/attachmentComplete", { uploadId });
        if (!uploaded || typeof uploaded.path !== "string" || !uploaded.path.startsWith("/")
          || /[\u0000-\u001f]/.test(uploaded.path) || uploaded.sha256 !== sha256 || uploaded.size !== bytes.length) {
          throw failure("remote Host attachment verification failed");
        }
      } catch (error) {
        await client.request("workspace/attachmentAbort", { uploadId }).catch(() => undefined);
        throw error;
      }
      assertCurrent();
      uploadedPaths.set(source, uploaded);
    }
    const remoteToken = formatPromptPathText(uploaded.path);
    content = replacePromptPathReferences(content, [
      prepared.promptPath ?? prepared.message.ref,
      prepared.fallbackPath,
    ], uploaded.path);
    if (!prepared.inlineData && !content.includes(remoteToken)) {
      content = `${content}${content.trim() ? "\n" : ""}${remoteToken}`;
    }
    prepared.message.remoteRef = { hostKey: workspace.hostKey, workspacePath: workspace.path, path: uploaded.path };
    modelAttachments.push({
      path: uploaded.path, name: prepared.message.name, kind: prepared.message.kind,
      ...(prepared.message.mimeType ? { mimeType: prepared.message.mimeType } : {}),
      size: uploaded.size,
      ...(prepared.message.inlinePath ? { inlinePath: remoteToken } : {}),
      ...(prepared.inlineData ? { data: prepared.inlineData } : {}),
    });
  }
  return { content, attachments: modelAttachments };
}

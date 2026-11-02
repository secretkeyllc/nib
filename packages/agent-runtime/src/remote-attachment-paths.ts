import { formatFileInsert, formatPromptPathText, replacePromptPathReferences } from "@pi-desktop/shared";
import type { MessageAttachment } from "@pi-desktop/shared";

export function remoteAttachmentPrompt(
  content: string,
  attachments: readonly MessageAttachment[],
  workspace: { hostKey: string; path: string },
): { content: string; attachments: MessageAttachment[] } {
  let result = content;
  const projected = attachments.map((attachment) => {
    const remoteRef = attachment.remoteRef;
    if (!remoteRef || remoteRef.hostKey !== workspace.hostKey || remoteRef.workspacePath !== workspace.path) return attachment;
    const token = formatPromptPathText(remoteRef.path);
    const inlinePath = attachment.inlinePath?.trim();
    const inlineLocalPath = inlinePath?.startsWith('@"') && inlinePath.endsWith('"')
      ? inlinePath.slice(2, -1)
      : inlinePath?.startsWith("@") ? inlinePath.slice(1) : undefined;
    const rewritten = replacePromptPathReferences(
      result,
      [attachment.ref, ...(inlineLocalPath ? [inlineLocalPath] : [])],
      remoteRef.path,
    );
    const placed = rewritten !== result;
    result = rewritten;
    if (!placed && !result.includes(token) && attachment.kind !== "image") {
      result = `${result.trim()}${result.trim() ? "\n" : ""}${formatFileInsert(remoteRef.path, "file").trim()}`;
    }
    return { ...attachment, ref: remoteRef.path, inlinePath: attachment.inlinePath ? token : undefined };
  });
  return { content: result, attachments: projected };
}

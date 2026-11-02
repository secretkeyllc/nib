import { describe, expect, it } from "vitest";
import { remoteAttachmentPrompt } from "./remote-attachment-paths.js";

const workspace = { hostKey: "ssh-a", path: "/srv/project" };
const remotePath = "/home/nib/.nib/scratch/session/attachments/hash-notes.txt";

 describe("remote attachment history projection", () => {
  it("replaces a matching inline local path and projects the remote ref", () => {
    const attachments = [{
      kind: "file" as const, name: "notes.txt", ref: "C:\\Users\\A User\\notes.txt",
      inlinePath: '@"C:\\Users\\A User\\notes.txt"',
      remoteRef: { hostKey: "ssh-a", workspacePath: "/srv/project", path: remotePath },
    }];
    const content = 'Please read @"C:\\Users\\A User\\notes.txt" and summarize it.';
    const projected = remoteAttachmentPrompt(content, attachments, workspace);
    expect(projected.content).toContain(remotePath);
    expect(projected.content).not.toContain("C:\\Users");
    expect(projected.attachments[0]?.ref).toBe(remotePath);
    expect(remoteAttachmentPrompt(content, attachments, { hostKey: "ssh-b", path: "/srv/project" }).content).toBe(content);
    expect(remoteAttachmentPrompt(content, attachments, { hostKey: "ssh-a", path: "/srv/other" }).content).toBe(content);
  });
  it("does not rewrite a prefix-colliding path and rewrites explicitly quoted paths", () => {
    const attachments = [{
      kind: "file" as const, name: "a.txt", ref: "/tmp/a.txt",
      remoteRef: { hostKey: "ssh-a", workspacePath: "/srv/project", path: remotePath },
    }];
    const projected = remoteAttachmentPrompt('Read @/tmp/a.txt.backup and then @"/tmp/a.txt".', attachments, workspace);
    expect(projected.content).toContain("@/tmp/a.txt.backup");
    expect(projected.content).toContain(remotePath);
    expect(projected.content).not.toContain('@"/tmp/a.txt"');
  });

  it("preserves both remote references when local attachment paths share a prefix", () => {
    const files = ["/tmp/a.txt", "/tmp/a.txt.backup"].map((ref, index) => ({
      kind: "file" as const, name: "file", ref,
      remoteRef: { hostKey: "ssh-a", workspacePath: "/srv/project", path: `/remote/file-${index}` },
    }));
    const result = remoteAttachmentPrompt('Compare @/tmp/a.txt with @/tmp/a.txt.backup and @"/tmp/a.txt".', files, workspace);
    expect(result.content).toBe('Compare @/remote/file-0 with @/remote/file-1 and @/remote/file-0.');
    expect(result.attachments.map(file => file.ref)).toEqual(["/remote/file-0", "/remote/file-1"]);
  });

  it("adds the remote path for a file not named in the message", () => {
    const attachment = {
      kind: "file" as const, name: "notes.txt", ref: "/Users/me/notes.txt",
      remoteRef: { hostKey: "ssh-a", workspacePath: "/srv/project", path: remotePath },
    };
    const projected = remoteAttachmentPrompt("Summarize the attachment.", [attachment], workspace);
    expect(projected.content).toContain(remotePath);
    expect(projected.content).not.toContain("/Users/me");
  });
});

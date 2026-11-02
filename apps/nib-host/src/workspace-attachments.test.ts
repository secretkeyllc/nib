import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RacpError } from "@pi-desktop/agent-host";
import { createWorkspaceAttachments } from "./workspace-attachments.js";

const owner = { deviceId: "device-one", connectionId: "connection-one" };
const secondOwner = { deviceId: "device-one", connectionId: "connection-two" };
const dirs: string[] = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "nib-attachment-test-"));
  dirs.push(root);
  const dataDir = join(root, "host-data");
  const workspace = join(root, "project");
  await mkdir(dataDir);
  await mkdir(workspace);
  return { root, dataDir, workspace, service: createWorkspaceAttachments(dataDir) };
}
function createInput(workspace: string, bytes: Buffer, name = "résumé.txt") {
  return { path: workspace, sessionId: "local-session-id", name, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}
async function upload(service: ReturnType<typeof createWorkspaceAttachments>, workspace: string, bytes: Buffer, name = "résumé.txt") {
  const created = await service.create(createInput(workspace, bytes, name), owner);
  for (let offset = 0; offset < bytes.length;) {
    const chunk = bytes.subarray(offset, Math.min(offset + 256 * 1024, bytes.length));
    const result = await service.chunk({ uploadId: created.uploadId, offset, data: chunk.toString("base64") }, owner);
    offset = result.offset;
  }
  return { created, result: await service.complete({ uploadId: created.uploadId }, owner) };
}
afterEach(async () => { await Promise.all(dirs.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

describe("private workspace attachment uploads", () => {
  it("publishes a multi-chunk Unicode filename under the mapped session scratch", async () => {
    const { service, workspace, dataDir } = await fixture();
    const bytes = Buffer.alloc(256 * 1024 + 19, 0x65);
    const { result } = await upload(service, workspace, bytes);
    const expectedSession = createHash("sha256").update(JSON.stringify([owner.deviceId, "local-session-id"])).digest("hex");
    expect(result.path).toBe(join(dataDir, "scratch", expectedSession, "attachments", `${result.sha256}-résumé.txt`));
    expect(await readFile(result.path)).toEqual(bytes);
    expect(result.size).toBe(bytes.length);
  });

  it("isolates different contents with the same filename", async () => {
    const { service, workspace } = await fixture();
    const first = await upload(service, workspace, Buffer.from("first"));
    const second = await upload(service, workspace, Buffer.from("second"));
    expect(first.result.path).not.toBe(second.result.path);
    expect(await readFile(first.result.path, "utf8")).toBe("first");
    expect(await readFile(second.result.path, "utf8")).toBe("second");
  });

  it("rejects hash mismatch and removes incomplete data", async () => {
    const { service, workspace, dataDir } = await fixture();
    const bytes = Buffer.from("bad hash");
    const input = createInput(workspace, bytes);
    input.sha256 = "0".repeat(64);
    const { uploadId } = await service.create(input, owner);
    await service.chunk({ uploadId, offset: 0, data: bytes.toString("base64") }, owner);
    await expect(service.complete({ uploadId }, owner)).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
    expect(await service.create(createInput(workspace, bytes), owner)).toBeDefined();
    expect(await readFile(join(dataDir, ".workspace-attachment-uploads", `${uploadId}.part`)).catch(() => undefined)).toBeUndefined();
  });

  it("enforces strict offsets, exact owner connection, and size bounds", async () => {
    const { service, workspace } = await fixture();
    const bytes = Buffer.from("payload");
    const { uploadId } = await service.create(createInput(workspace, bytes), owner);
    await expect(service.chunk({ uploadId, offset: 1, data: bytes.toString("base64") }, owner)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(service.chunk({ uploadId, offset: 0, data: bytes.toString("base64") }, secondOwner)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.create({ ...createInput(workspace, bytes), size: 50 * 1024 * 1024 + 1 }, owner)).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("rejects traversal names, symlinked workspaces and overlapping data roots", async () => {
    const { service, workspace, dataDir, root } = await fixture();
    const bytes = Buffer.from("safe");
    const traversal = await upload(service, workspace, bytes, "../../private.txt");
    expect(traversal.result.path).toMatch(/-private\.txt$/);
    const linkedWorkspace = join(root, "project-link");
    await symlink(workspace, linkedWorkspace);
    await expect(service.create(createInput(linkedWorkspace, bytes), owner)).rejects.toMatchObject({ code: "REMOTE_PATH_FORBIDDEN" });
    await expect(service.create(createInput(dataDir, bytes), owner)).rejects.toMatchObject({ code: "REMOTE_PATH_FORBIDDEN" });
  });

  it("recovers orphaned staging files after a Host restart without touching ready copies", async () => {
    const { service, workspace, dataDir } = await fixture();
    const bytes = Buffer.from("ready copy");
    const ready = await upload(service, workspace, bytes);
    const staging = join(dataDir, ".workspace-attachment-uploads");
    const orphan = join(staging, `${"a".repeat(32)}.part`);
    const unrelated = join(staging, "keep.txt");
    await writeFile(orphan, "interrupted upload");
    await writeFile(unrelated, "unrelated");
    const restarted = createWorkspaceAttachments(dataDir);
    const created = await restarted.create(createInput(workspace, bytes), owner);
    expect(await readFile(orphan).catch(() => undefined)).toBeUndefined();
    expect(await readFile(unrelated, "utf8")).toBe("unrelated");
    expect(await readFile(ready.result.path)).toEqual(bytes);
    await restarted.abort(created, owner);
  });

  it("cleans unfinished upload on disconnect", async () => {
    const { service, workspace, dataDir } = await fixture();
    const bytes = Buffer.from("unfinished");
    const { uploadId } = await service.create(createInput(workspace, bytes), owner);
    await service.chunk({ uploadId, offset: 0, data: bytes.toString("base64") }, owner);
    await service.disconnect(owner.connectionId);
    await expect(service.complete({ uploadId }, owner)).rejects.toBeInstanceOf(RacpError);
    expect(await readFile(join(dataDir, ".workspace-attachment-uploads", `${uploadId}.part`)).catch(() => undefined)).toBeUndefined();
  });
});

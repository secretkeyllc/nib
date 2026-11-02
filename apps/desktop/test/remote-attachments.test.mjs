import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { register } from "node:module";
import test from "node:test";
register(new URL("./helpers/ts-import-hooks.mjs", import.meta.url));
const { uploadRemotePromptAttachments } = await import("../electron/main/remote/remote-attachments.ts");

const workspace = { hostKey: "ssh-host", path: "/srv/project" };
async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), "nib-remote-attachment-"));
  try { await run(root); } finally { await rm(root, { recursive: true, force: true }); }
}
function fakeClient(bytes, options = {}) {
  const calls = [];
  const id = "upload-id";
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    calls,
    async request(method, params) {
      calls.push({ method, params });
      if (method === "workspace/attachmentCreate") return { uploadId: id };
      if (method === "workspace/attachmentChunk") return { offset: params.offset + Buffer.from(params.data, "base64").length };
      if (method === "workspace/attachmentComplete") {
        if (options.badHash) return { path: "/remote/attachment.txt", sha256: "0".repeat(64), size: bytes.length };
        return { path: "/home/nib/.nib/scratch/session/attachments/hash-notes.txt", sha256, size: bytes.length };
      }
      if (method === "workspace/attachmentAbort") return { ok: true };
      assert.fail(`unexpected method ${method}`);
    },
  };
}

test("uploads non-image attachments in bounded chunks and replaces local paths", async () => {
  await fixture(async root => {
    const sourcePath = join(root, "C_Users_fixture_notes.txt");
    const bytes = Buffer.alloc(256 * 1024 + 3, 0x61);
    await writeFile(sourcePath, bytes);
    const client = fakeClient(bytes);
    const prepared = [{
      message: { kind: "file", name: "notes.txt", ref: "attachments/local-hash", mimeType: "text/plain" },
      sourcePath,
      promptPath: "C:\\Users\\fixture\\notes.txt",
      fallbackPath: sourcePath,
    }];
    const result = await uploadRemotePromptAttachments(client, workspace, "session", 'Read @"C:\\Users\\fixture\\notes.txt"', prepared);
    assert.equal(result.content.includes("C:\\Users\\fixture"), false);
    assert.ok(result.content.includes("/home/nib/.nib/scratch/session/attachments/hash-notes.txt"));
    assert.equal(result.attachments[0].path, "/home/nib/.nib/scratch/session/attachments/hash-notes.txt");
    assert.equal(prepared[0].message.remoteRef.hostKey, workspace.hostKey);
    const chunks = client.calls.filter(call => call.method === "workspace/attachmentChunk");
    assert.equal(chunks.length, 2);
    assert.deepEqual(Buffer.concat(chunks.map(call => Buffer.from(call.params.data, "base64"))), bytes);
  });
});

test("keeps inline image bytes while uploading a remote-readable copy", async () => {
  await fixture(async root => {
    const sourcePath = join(root, "image.png");
    const bytes = Buffer.from("image-bytes");
    await writeFile(sourcePath, bytes);
    const client = fakeClient(bytes);
    const result = await uploadRemotePromptAttachments(client, workspace, "session", "look here", [{
      message: { kind: "image", name: "image.png", ref: "attachments/local-hash", mimeType: "image/png" },
      sourcePath, promptPath: sourcePath, fallbackPath: sourcePath, inlineData: bytes.toString("base64"),
    }]);
    assert.equal(result.attachments[0].data, bytes.toString("base64"));
    assert.equal(result.attachments[0].path.startsWith("/home/nib/"), true);
  });
});

test("aborts an upload when the Host reports a different digest", async () => {
  await fixture(async root => {
    const sourcePath = join(root, "notes.txt");
    const bytes = Buffer.from("notes");
    await writeFile(sourcePath, bytes);
    const client = fakeClient(bytes, { badHash: true });
    await assert.rejects(uploadRemotePromptAttachments(client, workspace, "session", "read", [{
      message: { kind: "file", name: "notes.txt", ref: sourcePath },
      sourcePath, promptPath: sourcePath, fallbackPath: sourcePath,
    }]), { errorCode: "INVALID_RESPONSE" });
    assert.ok(client.calls.some(call => call.method === "workspace/attachmentAbort"));
  });
});

test("production prompt and steer IPC upload prepared files and persist remote refs", async () => {
  const { IPC, formatPromptPathText } = await import("@pi-desktop/shared");
  const { registerAgentIpc } = await import("../electron/main/ipc/agent-ipc.ts");
  const { setActiveRemoteHostsBoot } = await import("../electron/main/bootstrap/remote-hosts.ts");
  await fixture(async root => {
    const directory = join(root, "scratch", "session", "pasted");
    await mkdir(directory, { recursive: true });
    const path = join(directory, "notes.txt");
    const bytes = Buffer.from("IPC attachment content");
    await writeFile(path, bytes);
    const transport = fakeClient(bytes);
    const handlers = new Map(), sidecarCalls = [], persisted = [], failures = [];
    const session = { id: "session", messages: [], remoteWorkspace: workspace };
    const host = { async call(method, params) {
      if (method === "session.get") return { session };
      if (method === "settings.get") return {};
      if (method === "session.beginTurn") return { turnId: "turn" };
      if (method === "session.appendMessage") { persisted.push(params.message); return {}; }
      assert.fail(`unexpected RPC ${method}`);
    } };
    const sidecar = { setProjectInstructionRoot() {}, async call(method, params) {
      if (method === "agent.steeringContext") return { remoteWorkspace: workspace, supportsVision: false };
      sidecarCalls.push({ method, params });
      return { accepted: true, turnId: "turn" };
    } };
    setActiveRemoteHostsBoot({ async workspaceAttachmentRequest(_key, method, params) {
      return transport.request(method, params);
    } });
    try {
      registerAgentIpc({
        registrar: { handle: (channel, handler) => handlers.set(channel, handler) },
        getHost: () => host, getSidecar: () => sidecar, getAgentHostBridge: () => null,
        logger: { app() {} }, agentExtensions: {}, cancelSessionTools() {}, persistenceOutbox: {}, dataDir: root,
        activeTurns: new Map(), activeTurnUsages: new Map(), completionNoticeTurns: new Set(),
        approvedExecutionIdsBySession: new Map(), claimedExecutionSessions: new Map(),
        recordTurnStart() {}, isTurnDispatchable: () => true,
        resolveAgentRuntimeLaunch: async () => ({ providerId: "provider", modelId: "model",
          sidecarParams: { provider: { modelConfig: { input: ["text"] } } } }),
        acquireSessionOperation: async () => () => {},
        finishTurn: async (...args) => { failures.push(args); }, emitAgentEvent() {}, setNotificationViewingSessionId() {},
        optionalWorkspaceRoot: async () => null, composerCommandService: { buildComposerCommands: async () => [] },
        loadComposerTemplatesCached: async () => [],
      });
      const input = { sessionId: "session", content: `Read ${formatPromptPathText(path)}.`,
        attachments: [{ path, name: "notes.txt", kind: "file", mimeType: "text/plain" }] };
      await handlers.get(IPC.invoke.agentPrompt)(input);
      await handlers.get(IPC.invoke.agentSteer)({ ...input, expectedTurnId: "turn" });
      assert.equal(failures.length, 0);
      assert.deepEqual(sidecarCalls.map(call => call.method), ["agent.prompt", "agent.steer"]);
      for (const call of sidecarCalls) {
        assert.equal(call.params.content.includes(path), false);
        assert.ok(call.params.content.includes("/home/nib/.nib/scratch/session/attachments/hash-notes.txt"));
        assert.equal(call.params.attachments[0].path, "/home/nib/.nib/scratch/session/attachments/hash-notes.txt");
      }
      for (const message of [persisted[0], sidecarCalls[1].params.message]) {
        assert.equal(message.attachments[0].ref, path);
        assert.equal(message.attachments[0].remoteRef.hostKey, workspace.hostKey);
      }
    } finally { setActiveRemoteHostsBoot(null); }
  });
});

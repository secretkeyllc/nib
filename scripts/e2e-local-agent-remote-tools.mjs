#!/usr/bin/env node
/** Local model -> real Main relay -> loopback RACP -> real Rust attachment/project tools.
 * No SSH, production credentials, paid APIs or user app is used. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { register } from "node:module";
register(new URL("../apps/desktop/test/helpers/ts-import-hooks.mjs", import.meta.url));
const { DesktopAgentRuntime } = await import("../packages/agent-runtime/dist/index.js");
const { hydrateAttachmentHistory } = await import("../packages/agent-runtime/dist/attachment-history.js");
const { HostProcess, createHostSessionPort } = await import("../packages/host-runtime/dist/index.js");
const { AgentHost } = await import("../packages/agent-host/dist/index.js");
const { bindRacpWebSocket, RacpServer, MemoryCredentialStore, DeviceTokenAuthenticator, hashToken, newDeviceToken } = await import("../packages/racp/dist/index.js");
const { createHostOperations } = await import("../apps/nib-host/dist/host-operations.js");
const { createRemoteHostsBoot } = await import("../apps/desktop/electron/main/bootstrap/remote-hosts.ts");
const { createRemoteWorkspaceToolRelay } = await import("../apps/desktop/electron/main/remote/remote-workspace-tools.ts");
const { uploadRemotePromptAttachments } = await import("../apps/desktop/electron/main/remote/remote-attachments.ts");
const { preparePromptAttachments } = await import("../apps/desktop/electron/main/prompt-attachments.ts");
const { loadRemoteWorkspaceInstructions } = await import("../apps/desktop/electron/main/remote/remote-workspace-instructions.ts");
const { createBackendRouter } = await import("../apps/desktop/electron/main/remote/backend-router.ts");
const { formatPromptPathText } = await import("@pi-desktop/shared");

assert.ok(process.env.NIB_HOST_CORE_BINARY, "NIB_HOST_CORE_BINARY must name the candidate Rust binary");
const root = await mkdtemp(join(process.env.PI_SCRATCH_DIR ?? tmpdir(), "local-agent-remote-tools-"));
const remoteRoot = join(root, "remote-workspace");
const remoteData = join(root, "host");
const desktopData = join(root, "desktop");
await mkdir(remoteRoot); await mkdir(desktopData);
await writeFile(join(remoteRoot, "README.md"), "REMOTE_READ_FIXTURE\n");
await writeFile(join(remoteRoot, "AGENTS.md"), "REMOTE_REPOSITORY_INSTRUCTIONS_FIXTURE\n");
await writeFile(join(remoteRoot, "CLAUDE.md"), "LOWER_PRIORITY_INSTRUCTIONS_MUST_NOT_LOAD\n");
const KEY = "local-fixture-key-never-forwarded";
const OWNER_TOKEN = newDeviceToken();
const windowsPath = "C:\\Users\\Fixture User\\notes.txt";
let modelCalls = 0, modelError, remoteAttachmentPath;
let host, localHost, relay, binding, boot, runtime, server;
let localPermissions = 0, remotePrompts = 0;
const wireCalls = [];
const model = createServer(async (req, res) => {
  try {
    assert.equal(req.headers.authorization, `Bearer ${KEY}`);
    let body = ""; for await (const chunk of req) body += chunk;
    const input = JSON.parse(body);
    const context = JSON.stringify(input.messages);
    assert.equal(input.model, "local-fixture");
    assert.ok(context.includes("REMOTE_REPOSITORY_INSTRUCTIONS_FIXTURE"));
    assert.ok(context.includes("LOCAL_GLOBAL_INSTRUCTIONS_FIXTURE"));
    assert.ok(!context.includes("LOWER_PRIORITY_INSTRUCTIONS_MUST_NOT_LOAD"));
    assert.ok(!context.includes("C:\\\\Users"), "Desktop paths never enter the model context");
    assert.ok(context.includes(remoteAttachmentPath), "uploaded path survives history restoration");
    modelCalls++;
    res.writeHead(200, { "content-type": "text/event-stream" });
    const frame = (delta, finish_reason = null) => res.write(`data: ${JSON.stringify({ id: `fixture-${modelCalls}`, object: "chat.completion.chunk", created: 1, model: input.model, choices: [{ index: 0, delta, finish_reason }] })}\n\n`);
    if (modelCalls <= 3) {
      if (modelCalls >= 2) assert.ok(context.includes("REMOTE_ATTACHMENT_CONTENT_FIXTURE"), "remote attachment Read reached model");
      if (modelCalls === 3) assert.ok(context.includes("REMOTE_READ_FIXTURE"));
      const name = modelCalls <= 2 ? "Read" : "Bash";
      const args = modelCalls === 1 ? { path: remoteAttachmentPath }
        : modelCalls === 2 ? { path: "README.md" }
          : { command: "printf 'REMOTE_BASH_FIXTURE\\n' > marker.txt" };
      frame({ role: "assistant", tool_calls: [{ index: 0, id: `tool-${modelCalls}`, type: "function", function: { name, arguments: JSON.stringify(args) } }] });
      frame({}, "tool_calls");
    } else {
      assert.equal(modelCalls, 4, "tool execution is not replayed");
      frame({ role: "assistant", content: "LOCAL_MODEL_REMOTE_ATTACHMENTS_OK" }); frame({}, "stop");
    }
    res.end("data: [DONE]\n\n");
  } catch (error) { modelError = error; if (!res.headersSent) res.writeHead(500); res.end(); }
});
model.listen(0, "127.0.0.1"); await once(model, "listening");
const deadline = setTimeout(() => { console.error("remote attachment acceptance exceeded 60s", modelError); process.exit(1); }, 60_000);
try {
  host = new HostProcess({ binaryPath: resolve(process.env.NIB_HOST_CORE_BINARY), dataDir: remoteData, onStderr: () => {} });
  await host.handshake();
  const agentHost = new AgentHost({ sessions: createHostSessionPort(() => host),
    runtime: { async prompt() { remotePrompts++; throw new Error("remote models must not run"); }, async stop() { return { requested: false }; }, async abort() {}, async respondInput() {} },
    approvals: { async resolveTool() { throw new Error("no remote approval"); }, async resolveContract() { throw new Error("no remote contract"); }, async listPendingTools() { return []; } },
  });
  const credentials = new MemoryCredentialStore();
  await credentials.saveDevice({ deviceId: "fixture-owner", label: "Fixture", roles: ["owner"], tokenHash: hashToken(OWNER_TOKEN), createdAt: new Date().toISOString() });
  const authenticator = new DeviceTokenAuthenticator(credentials);
  const operations = createHostOperations({ getHost: () => host, dataDir: remoteData,
    runtime: { isBusy: () => false, async compact() { throw new Error("no remote model"); } } });
  const tools = operations.workspaceTools;
  operations.workspaceTools = { ...tools, async execute(input, owner) { wireCalls.push(structuredClone(input)); return tools.execute(input, owner); } };
  server = new RacpServer({ agentHost, operations, authenticator, hostId: "tool-host", serverVersion: "fixture", log: () => {} });
  binding = await bindRacpWebSocket({ server, authenticator, host: "127.0.0.1", port: 0, log: () => {} });
  boot = createRemoteHostsBoot({ dataDir: desktopData, router: createBackendRouter(), clientInfo: { name: "fixture", version: "fixture" }, emit: () => {},
    encryption: { isAvailable: () => true, encryptString: value => Buffer.from(value), decryptString: value => value.toString() } });
  await boot.addHost({ hostKey: "fixture", label: "Fixture", url: `ws://127.0.0.1:${binding.address.port}/v1/racp/ws`, deviceToken: OWNER_TOKEN });
  const shell = await boot.workspaceCommandShell("fixture");
  const remoteWorkspace = { hostKey: "fixture", path: remoteRoot };
  const projectInstructions = await loadRemoteWorkspaceInstructions(boot.workspaceFiles, remoteWorkspace,
    { entries: [{ source: "local-global", content: "LOCAL_GLOBAL_INSTRUCTIONS_FIXTURE" }] });
  localHost = new HostProcess({ binaryPath: resolve(process.env.NIB_HOST_CORE_BINARY), dataDir: join(root, "local-host"), onStderr: () => {} });
  await localHost.handshake();
  const created = await localHost.call("project.group.createRemote", { name: "Remote fixture", remote: remoteWorkspace });
  const { session } = await localHost.call("session.create", { projectPath: created.group.primaryPath, mode: "agent" });
  const source = join(desktopData, "notes.txt");
  await writeFile(source, `REMOTE_ATTACHMENT_CONTENT_FIXTURE\n${"line\n".repeat(60_000)}`);
  const prepared = [{ message: { kind: "file", name: "notes.txt", ref: windowsPath, mimeType: "text/plain" },
    sourcePath: source, promptPath: windowsPath, fallbackPath: source }];
  const uploadClient = { request: (method, params, timeoutMs) => boot.workspaceAttachmentRequest("fixture", method, params, timeoutMs) };
  const originalText = `Read ${formatPromptPathText(windowsPath)}.`;
  const uploaded = await uploadRemotePromptAttachments(uploadClient, remoteWorkspace, session.id, originalText, prepared);
  remoteAttachmentPath = uploaded.attachments[0].path;
  assert.ok(remoteAttachmentPath.startsWith(join(remoteData, "scratch")));
  assert.ok(!uploaded.content.includes(windowsPath));
  const duplicate = await uploadRemotePromptAttachments(uploadClient, remoteWorkspace, session.id, originalText, prepared);
  assert.equal(duplicate.attachments[0].path, remoteAttachmentPath);
  await localHost.call("session.appendMessage", { sessionId: session.id, message: {
    id: "attachment-history", role: "user", content: originalText, createdAt: new Date().toISOString(), status: "complete",
    attachments: prepared.map(item => item.message),
  } });
  const imageDirectory = join(desktopData, "scratch", session.id, "pasted");
  await mkdir(imageDirectory, { recursive: true });
  const imagePath = join(imageDirectory, "pixel.png");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9z8AAAAASUVORK5CYII=", "base64");
  await writeFile(imagePath, png);
  const imageText = `Before ${formatPromptPathText(imagePath)} after`;
  const imagePrepared = await preparePromptAttachments(desktopData, session.id, undefined,
    [{ kind: "image", name: "pixel.png", path: imagePath, mimeType: "image/png" }], true, imageText);
  const previewRef = imagePrepared[0].message.ref;
  const imageUpload = await uploadRemotePromptAttachments(uploadClient, remoteWorkspace, session.id, imageText, imagePrepared);
  assert.equal(imageUpload.attachments[0].data, png.toString("base64"));
  assert.equal(imagePrepared[0].message.ref, previewRef, "local preview ref remains intact");
  assert.ok(!imageUpload.content.includes(imagePath));
  await localHost.call("session.appendMessage", { sessionId: session.id, message: {
    id: "image-history", role: "user", content: imageText, createdAt: new Date().toISOString(), status: "complete",
    attachments: imagePrepared.map(item => item.message),
  } });
  // Restart the actual local Host: the remote copy must survive canonical persistence.
  await localHost.dispose();
  localHost = new HostProcess({ binaryPath: resolve(process.env.NIB_HOST_CORE_BINARY), dataDir: join(root, "local-host"), onStderr: () => {} });
  await localHost.handshake();
  const detail = await localHost.call("session.get", { id: session.id });
  assert.equal(detail.session.messages[0].attachments[0].remoteRef.path, remoteAttachmentPath);
  const imageRow = detail.session.messages.find(message => message.id === "image-history");
  assert.equal(imageRow.attachments[0].ref, previewRef);
  assert.equal(imageRow.attachments[0].remoteRef.path, imageUpload.attachments[0].path);
  const visionHistory = await hydrateAttachmentHistory(detail.session.messages, {
    supportsVision: true, remoteWorkspace, attachmentsDir: join(desktopData, "attachments"),
    scratchDir: join(desktopData, "scratch", session.id),
  });
  assert.equal(visionHistory.find(message => message.id === "image-history").attachments[0].data, png.toString("base64"));
  const history = await hydrateAttachmentHistory(detail.session.messages, { supportsVision: false, remoteWorkspace });
  relay = createRemoteWorkspaceToolRelay(localHost, { getBoot: () => boot, isCurrent: () => true,
    isTurnDispatchable: (id, turnId) => id === session.id && turnId === "local-turn", log: () => {} });
  localHost.onNotification((method, params) => {
    if (method === "tools.remoteExecute") void relay.execute(params);
    if (method === "tools.remoteAbort") relay.cancel(params);
    if (method === "permissions.request") { localPermissions++; void localHost.call("permissions.resolve", { requestId: params.requestId, decision: "allow-once" }); }
  });
  let ended;
  const done = new Promise((resolveDone, rejectDone) => { ended = envelope => {
    if (envelope.event.type === "error") rejectDone(new Error(JSON.stringify(envelope.event)));
    if (envelope.event.type === "agent_end") resolveDone();
  }; });
  runtime = new DesktopAgentRuntime({ sessionId: session.id, mode: "agent", thinkingLevel: "off", commandShell: shell, projectInstructions, remoteWorkspace, history,
    provider: { id: "fixture", name: "Fixture", modelId: "local-fixture", baseUrl: `http://127.0.0.1:${model.address().port}/v1`, apiStyle: "chat_completions", apiKey: KEY, authKind: "api_key", supportsReasoning: false, supportedThinkingLevels: ["off"] },
    host: { call: (method, params) => localHost.call(method, params), onNotification: handler => localHost.onNotification(handler) }, onEvent: envelope => ended(envelope),
  });
  await Promise.all([runtime.prompt("Read the attachment, then README.md, then create marker.txt with Bash.", "followup", "local-turn"), done]);
  assert.equal(modelError, undefined); assert.equal(modelCalls, 4);
  assert.equal(localPermissions, 2, "attachment outside project and Bash require local permission");
  assert.equal(await readFile(join(remoteRoot, "marker.txt"), "utf8"), "REMOTE_BASH_FIXTURE\n");
  assert.deepEqual(wireCalls.map(call => call.toolName), ["Read", "Read", "Bash"]);
  assert.ok(!JSON.stringify(wireCalls).includes(KEY));
  assert.equal((await host.call("providers.list", {})).providers.length, 0);
  assert.equal((await host.call("session.list", {})).sessions.length, 0);
  assert.equal((await host.call("projects.list", {})).projects.length, 0);
  assert.equal(remotePrompts, 0);
  assert.deepEqual((await readdir(remoteRoot)).sort(), ["AGENTS.md", "CLAUDE.md", "README.md", "marker.txt"]);
  await assert.rejects(boot.executeWorkspaceTool({ ...wireCalls[0], hostKey: "fixture" }));
  await boot.removeHost("fixture");
  await assert.rejects(boot.executeWorkspaceTool({ ...wireCalls[0], toolCallId: "offline", hostKey: "fixture" }), { errorCode: "AGENT_UNAVAILABLE" });
  console.log("PASS bounded TXT upload, repeat upload, real Host restart persistence, local model -> RACP/Rust attachment Read + project Read/Bash, no project pollution or remote providers");
} finally {
  clearTimeout(deadline);
  await runtime?.dispose(); relay?.dispose(); await localHost?.dispose(); await boot?.closeAll(); server?.close(); await binding?.close(); await host?.dispose();
  model.closeAllConnections(); await new Promise(resolveClose => model.close(resolveClose)); await rm(root, { recursive: true, force: true });
}

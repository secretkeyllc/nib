import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { register } from "node:module";
// The electron stub must be registered first: workspace-ipc.ts and its
// transitive imports pull in Electron APIs that plain node does not provide.
register(new URL("./helpers/workspace-module-stubs.mjs", import.meta.url));
register(new URL("./helpers/ts-import-hooks.mjs", import.meta.url));
const { IPC } = await import("@pi-desktop/shared");
const { registerWorkspaceIpc } = await import("../electron/main/ipc/workspace-ipc.ts");
const { setActiveRemoteHostsBoot } = await import("../electron/main/bootstrap/remote-hosts.ts");
const { resetSessionToolHostsForTest } = await import("../electron/main/remote/remote-workspace-tools.ts");

/**
 * Remote file chips (chat file references) resolve through the session's own
 * scratch authorization on the Host. The Host keys that authorization by the
 * *bare* host session id, while the renderer only holds the namespaced
 * `remote:<hostKey>:<uuid>` form — so the three file-ref reads must strip the
 * namespace before forwarding. Forwarding the namespaced id verbatim made the
 * Host answer "outside the allowed roots" for a session it had in fact
 * authorized.
 */
const REMOTE_SESSION = "remote:kc212:s1";

function fakeHost() {
  return {
    async call(method, input = {}) {
      if (method === "session.get") {
        // Every session id binds the same remote project: what varies across
        // the tests is only the *shape* of the id the renderer sends.
        return { session: { projectPath: "remote-project:/repo" } };
      }
      if (method === "project.groups.list") {
        return {
          groups: [{ primaryPath: "remote-project:/repo", remote: { hostKey: "kc212", path: "/repo" } }],
        };
      }
      throw new Error(`unexpected host RPC: ${method}`);
    },
  };
}

function harness(calls) {
  const dataDir = mkdtempSync(join(tmpdir(), "nib-workspace-ipc-"));
  const handlers = new Map();
  // One stable host identity: remoteWorkspaceForFiles re-checks getHost()
  // after each await and treats a changed reference as "host replaced".
  const host = fakeHost();
  registerWorkspaceIpc({
    registrar: {
      handle: (channel, handler) => handlers.set(channel, handler),
      handleWithEvent: (channel, handler) => handlers.set(channel, (input) => handler({}, input)),
    },
    getMainWindow: () => null,
    getHost: () => host,
    getSidecar: () => null,
    dataDir,
    isDevelopmentBuild: false,
    plugins: {},
    browserHost: {},
    clipboardHistory: {},
    recordPastedClipboardFiles: () => {},
    currentWorkspacePath: () => null,
    setCurrentWorkspacePath: () => {},
    withGitBranch: async () => ({}),
    stripWinLongPrefix: (path) => path,
  });
  setActiveRemoteHostsBoot({
    async workspaceFiles(hostKey, input) {
      calls.push({ hostKey, input });
      if (input.operation === "resolve") {
        return { match: { absolutePath: "/repo/notes.md", sessionScratch: false } };
      }
      return { content: "hi" };
    },
  });
  return {
    call: async (channel, input) => handlers.get(channel)(input),
  };
}

test("a remote chip read forwards the bare host session id", async () => {
  resetSessionToolHostsForTest();
  const calls = [];
  const h = harness(calls);
  await h.call(IPC.invoke.fsRead, { path: "/repo/notes.md", sessionId: REMOTE_SESSION });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].hostKey, "kc212");
  assert.equal(calls[0].input.sessionId, "s1", "the namespaced id must arrive stripped");
  assert.equal(calls[0].input.ref, "/repo/notes.md");
});

test("an image chip read forwards the bare host session id", async () => {
  resetSessionToolHostsForTest();
  const calls = [];
  const h = harness(calls);
  await h.call(IPC.invoke.fsReadImageDataUrl, { ref: "/repo/diagram.png", sessionId: REMOTE_SESSION });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.sessionId, "s1");
  assert.equal(calls[0].input.operation, "image");
});

test("a remote chip resolve forwards the bare host session id", async () => {
  resetSessionToolHostsForTest();
  const calls = [];
  const h = harness(calls);
  const result = await h.call(IPC.invoke.fsResolveRef, { ref: "/repo/notes.md", sessionId: REMOTE_SESSION });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.sessionId, "s1");
  assert.equal(calls[0].input.operation, "resolve");
  assert.equal(result.match.absolutePath, "/repo/notes.md");
});

test("a session id without the remote namespace forwards nothing", async () => {
  resetSessionToolHostsForTest();
  const calls = [];
  const h = harness(calls);
  // A remote-project session whose renderer id is not namespaced (legacy
  // shape): the Host has no session under the raw id, so sending one would
  // only re-create the original bug from the other side.
  await h.call(IPC.invoke.fsRead, { path: "/repo/notes.md", sessionId: "s1" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.sessionId, undefined, "no bare id is invented for a non-namespaced session");
});

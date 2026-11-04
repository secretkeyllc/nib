import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";
register(new URL("./helpers/ts-import-hooks.mjs", import.meta.url));
const { resolveViaSessionToolHost } = await import("../electron/main/remote/tool-host-file-refs.ts");
const { rememberSessionToolHostForTest, resetSessionToolHostsForTest } = await import("../electron/main/remote/remote-workspace-tools.ts");

function boot(calls) {
  return {
    async workspaceFiles(hostKey, input) {
      calls.push({ hostKey, input });
      if (input.operation === "resolve") return { match: { absolutePath: input.ref, sessionScratch: true } };
      if (input.operation === "read") { if (input.ref === "/gone") throw new Error("REMOTE_PATH_NOT_FOUND"); return { content: "hi" }; }
      return {};
    },
  };
}

test("no relayed tool host answers nothing and calls nothing", async () => {
  resetSessionToolHostsForTest();
  const calls = [];
  const result = await resolveViaSessionToolHost({ sessionId: "s1", operation: "resolve", ref: "/x", boot: boot(calls) });
  assert.equal(result, null);
  assert.deepEqual(calls, []);
});

test("a relayed tool host resolves against the session's own scratch alone", async () => {
  resetSessionToolHostsForTest();
  rememberSessionToolHostForTest("s1", "kc212");
  const calls = [];
  const result = await resolveViaSessionToolHost({ sessionId: "s1", operation: "resolve", ref: "/root/.nib/scratch/s1/pasted/a.md", boot: boot(calls) });
  assert.equal(result.match.absolutePath, "/root/.nib/scratch/s1/pasted/a.md");
  assert.deepEqual(calls, [{
    hostKey: "kc212",
    input: { path: "/.session-scratch", operation: "resolve", ref: "/root/.nib/scratch/s1/pasted/a.md", sessionId: "s1" },
  }]);
});

test("a namespaced remote session id names the Host and forwards the bare session id", async () => {
  resetSessionToolHostsForTest();
  const calls = [];
  const result = await resolveViaSessionToolHost({
    sessionId: "remote:kc212:0f01863b-66a2-469e-bd9c-605f09739be8",
    operation: "resolve",
    ref: "/root/.nib/scratch/0f01863b-66a2-469e-bd9c-605f09739be8/pasted/a.txt",
    boot: boot(calls),
  });
  assert.equal(result.match.absolutePath, "/root/.nib/scratch/0f01863b-66a2-469e-bd9c-605f09739be8/pasted/a.txt");
  assert.deepEqual(calls, [{
    hostKey: "kc212",
    input: {
      path: "/.session-scratch", operation: "resolve",
      ref: "/root/.nib/scratch/0f01863b-66a2-469e-bd9c-605f09739be8/pasted/a.txt",
      sessionId: "0f01863b-66a2-469e-bd9c-605f09739be8",
    },
  }]);
});

test("reads forward the mime type and an unreachable host falls back to nothing", async () => {
  resetSessionToolHostsForTest();
  rememberSessionToolHostForTest("s1", "kc212");
  const calls = [];
  const read = await resolveViaSessionToolHost({ sessionId: "s1", operation: "read", ref: "/a.md", mimeType: "text/markdown", boot: boot(calls) });
  assert.deepEqual(read, { content: "hi" });
  assert.equal(calls[0].input.mimeType, "text/markdown");
  const missing = await resolveViaSessionToolHost({ sessionId: "s1", operation: "read", ref: "/gone", boot: boot(calls) });
  assert.equal(missing, null);
});

test("no session id or no boot never touches a host", async () => {
  resetSessionToolHostsForTest();
  rememberSessionToolHostForTest("s1", "kc212");
  const calls = [];
  assert.equal(await resolveViaSessionToolHost({ operation: "read", ref: "/a", boot: boot(calls) }), null);
  assert.equal(await resolveViaSessionToolHost({ sessionId: "s1", operation: "read", ref: "/a", boot: null }), null);
  assert.deepEqual(calls, []);
});

import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";
// The electron stub must be registered first: remote-control/index.ts pulls
// in Electron-side modules plain node cannot provide.
register(new URL("./helpers/workspace-module-stubs.mjs", import.meta.url));
register(new URL("./helpers/ts-import-hooks.mjs", import.meta.url));
const { remoteStatusModels, remoteConfigureCall } = await import(
  "../electron/main/remote-control/index.ts"
);

/**
 * The remote controller's two command mappings have both shipped broken
 * before: the model list was read as {id,name} when the provider catalogue
 * returns {modelId,displayName} (every row filtered away — "No models
 * available"), and `configure` handed the whole patch to sessionConfigure
 * as the session id (its signature is (id, config) — every change failed
 * with "id required"). These pin both mappings.
 */

test("status models map the provider catalogue shape", () => {
  const models = remoteStatusModels([
    { modelId: "gpt-5.2", displayName: "GPT-5.2", extra: "ignored" },
    { modelId: "claude-opus-4-6" }, // no displayName: fall back to undefined
    { modelId: "  trim-me  ", displayName: "  Padded  " },
    { id: "legacy-shape-id", name: "Legacy shape" },
    { displayName: "no id" }, // filtered: nothing identifies it
  ]);
  assert.deepEqual(
    models,
    [
      { id: "gpt-5.2", label: "GPT-5.2" },
      { id: "claude-opus-4-6", label: undefined },
      { id: "trim-me", label: "Padded" },
      { id: "legacy-shape-id", label: "Legacy shape" },
    ],
  );
});

test("status models tolerate undefined or empty input", () => {
  assert.deepEqual(remoteStatusModels(undefined), []);
  assert.deepEqual(remoteStatusModels([]), []);
});

test("configure builds a (id, config) sessionConfigure call", () => {
  const call = remoteConfigureCall({
    sessionId: "s1",
    modelId: "gpt-5.2",
    permissionMode: "auto",
    mode: "plan",
    thinkingLevel: "high",
    fastMode: true,
  });
  assert.deepEqual(call, {
    id: "s1",
    config: {
      modelId: "gpt-5.2",
      permissionMode: "auto",
      mode: "plan",
      thinkingLevel: "high",
      fastMode: true,
    },
  });
});

test("configure forwards partial patches and drops empties", () => {
  const call = remoteConfigureCall({ sessionId: " s2 ", modelId: "  " });
  assert.deepEqual(call, { id: "s2", config: {} });
});

test("configure without a session id is rejected", () => {
  assert.equal(remoteConfigureCall({ modelId: "gpt-5.2" }), null);
  assert.equal(remoteConfigureCall({}), null);
});

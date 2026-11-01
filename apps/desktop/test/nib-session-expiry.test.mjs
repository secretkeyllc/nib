/**
 * An expired Nib session must be indistinguishable from being signed out.
 *
 * Three layers close the loop:
 *   main/nib-ipc     a 401 from the entitlement read retires the keychain
 *                    credential AND the plugin's own copy of the key;
 *   main/oauth       a subscription gateway with no credential lists no
 *                    models (the manifest fallback must not resurrect them);
 *   composer menu    a plugin-owned oauth row without a credential is not
 *                    offered in the picker at all.
 */
import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const [nibIpc, oauth, modelMenu] = await Promise.all([
  read("../electron/main/ipc/nib-ipc.ts"),
  read("../electron/main/oauth.ts"),
  read("../src/features/chat/composer/hooks/useComposerModelMenu.ts"),
]);

test("a 401 entitlement read retires the credential and the plugin's key copy", () => {
  const expiry = nibIpc.slice(nibIpc.indexOf("response.status === 401"));
  assert.match(expiry, /sessionExpired: true/);
  assert.match(
    expiry,
    /await forgetProviderCredential\(providerId\);\s*await clearPluginAccountSettings\(dataDir\(\), logger, "session expiry"\)/,
  );
  // The explicit sign-out path clears the same material.
  assert.match(nibIpc, /await clearPluginAccountSettings\(dataDir\(\), logger, "sign-out"\)/);
});

test("a subscription gateway without a credential lists no models", () => {
  const listModels = oauth.slice(oauth.indexOf("async listModels("));
  const gate = listModels.indexOf("if (!credential) return [];"), discover = listModels.indexOf("discoverPluginModels(");
  assert.ok(gate > -1, "the no-credential gate is missing from listModels");
  assert.ok(discover > -1, "discovery call not found");
  assert.ok(gate < discover, "the gate must run before discovery, not after");
  assert.match(
    listModels,
    /\(await this\.pluginAccessToken\(row\.id\)\) \?\? \(await this\.pluginSettingApiKey\(row\.id\)\)/,
  );
});

test("the composer picker hides plugin-owned oauth rows without a credential", () => {
  assert.match(
    modelMenu,
    /candidate\.ownerPluginId && candidate\.authKind === "oauth"\s*\?\s*candidate\.hasSecret \|\| candidate\.hasOauth/,
  );
});

#!/usr/bin/env node
// Real Host/SQLite + production Main IPC, metadata and Composer. HTTP is a fixture.
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";
register(new URL("../apps/desktop/test/helpers/ts-import-hooks.mjs", import.meta.url));
const { HostProcess } = await import("../packages/host-runtime/dist/index.js");
const { VendorOAuth, secretRefForProviderOauth } = await import("../apps/desktop/electron/main/oauth.ts");
const { ModelsDevCatalog, catalogModelConfigFor } = await import("../apps/desktop/electron/main/models-dev-catalog.ts");
const { createProviderCatalogRuntime } = await import("../apps/desktop/electron/main/runtime/provider-catalog.ts");
const { registerProviderIpc } = await import("../apps/desktop/electron/main/ipc/provider-ipc.ts");
const { composerModelsForProvider } = await import("../apps/desktop/src/lib/composer-models.ts");
const { IPC } = await import("../packages/shared/dist/index.js");
const root = fileURLToPath(new URL("..", import.meta.url));
const scratch = join(root, ".artifacts");
await mkdir(scratch, { recursive: true });
const dataDir = await mkdtemp(join(scratch, "nib-catalog-"));
const pluginDir = join(dataDir, "fixture-plugin");
await mkdir(pluginDir);
const manifest = JSON.parse(await readFile(join(root, "apps/desktop/resources/plugins/nib.provider/manifest.json"), "utf8"));
manifest.contributes = { providers: manifest.contributes.providers };
await writeFile(join(pluginDir, "manifest.json"), JSON.stringify(manifest));
await writeFile(join(pluginDir, "main.js"), "module.exports = { onProviderOAuth() { throw new Error('login must not run'); } };\n");
const providerId = "plugin:nib.provider:nib";
const served = ["claude-haiku-4-5-20251001", "claude-sonnet-5", "gpt-6-astra", "gemini-4-argon", "grok-4.7"];
let host;
let offline = true;
let requests = 0;
try {
  const boot = async () => {
    host = new HostProcess({ binaryPath: join(root, "target/debug/nib-host-core"), dataDir, onStderr() {} });
    await host.handshake();
    await host.call("plugins.loadDev", { path: pluginDir });
  };
  await boot();
  await host.call("secrets.set", { secretRef: secretRefForProviderOauth(providerId), value: JSON.stringify({ accessToken: "fixture-token" }) });
  const catalog = new ModelsDevCatalog({ catalogPath: join(root, "apps/desktop/resources/models.dev/api.json") });
  await catalog.loadLocal();
  const wire = () => {
    const runtime = createProviderCatalogRuntime({ getHost: () => host, modelsDevCatalog: catalog });
    const oauth = new VendorOAuth({
      call: (method, input) => host.call(method, input), emit() {}, openExternal: async () => {},
      getPluginOAuthBridge: () => ({ listOAuthProviders: () => [{
        pluginId: manifest.id, contributionId: "nib", providerId, runtimeId: "runtime-1",
        name: "Nib", isSubscription: true, models: manifest.contributes.providers[0].models,
      }], invokeProviderOAuth: async () => { throw new Error("no login allowed"); } }),
      fetch: async (url, init) => {
        requests++;
        assert.equal(String(url), "https://api.nib.am/v1/models");
        assert.equal(init.headers.authorization, "Bearer fixture-token");
        return offline ? new Response(null, { status: 503 })
          : new Response(JSON.stringify({ data: served.map((id) => ({ id })) }));
      },
      modelConfigFor: async ({ providerId, vendorKey, option }) => catalogModelConfigFor(catalog, {
        providerId, vendorKey, modelId: option.modelId, baseUrl: option.baseUrl, apiStyle: option.apiStyle,
      }),
    });
    const handlers = new Map();
    registerProviderIpc({ registrar: { handle: (key, handler) => handlers.set(key, handler) }, getHost: () => host,
      modelsDevCatalog: catalog, vendorOAuth: oauth, logger: { app() {} }, ...runtime });
    return { oauth, runtime, invoke: (key, input) => handlers.get(key)(input) };
  };
  const row = async () => (await host.call("providers.get", { id: providerId })).provider;
  let h = wire();
  assert.equal((await row()).models.length, 3);
  await h.invoke(IPC.invoke.providersListModels, { providerId, source: "cache" });
  assert.equal(requests, 0);
  await h.invoke(IPC.invoke.providersList);
  await h.oauth.reconcilePluginModels(providerId);
  assert.equal((await row()).modelSelectionConfigured, false);
  offline = false;
  await h.invoke(IPC.invoke.providersListModels, { providerId, source: "refresh" });
  let saved = await row();
  assert.deepEqual(saved.models.map((model) => model.id), served);
  assert.equal(saved.modelSelectionConfigured, true);
  assert.equal(saved.models.find((model) => model.id === "gpt-6-astra").contextWindow, 1_050_000);
  const discovery = await h.invoke(IPC.invoke.providersListModels, { providerId, source: "cache" });
  const choices = composerModelsForProvider(h.runtime.enrichProvider(saved), discovery.models);
  assert.equal(choices.find((model) => model.modelId === "gpt-6-astra").contextWindow, 1_050_000);
  assert.equal((await h.oauth.bindingFor(providerId, "gpt-6-astra")).modelConfig.maxTokens, 128_000);
  const selected = [{ ...saved.models[2], alias: "My GPT", contextWindow: 42_000, contextWindowSource: "user" }];
  await host.call("providers.update", { id: providerId, models: selected });
  await host.dispose();
  await boot();
  h = wire();
  await h.invoke(IPC.invoke.providersListModels, { providerId, source: "refresh" });
  assert.deepEqual((await row()).models, selected);
  assert.equal((await h.oauth.bindingFor(providerId, "gpt-6-astra")).modelConfig.contextWindow, 42_000);
  // Host update precondition prevents a stale response from replacing an edit.
  const before = await row();
  await host.call("providers.update", { id: providerId, models: [] });
  const stale = await host.call("providers.update", { id: providerId, expectedProvider: before, models: before.models });
  assert.equal(stale.reconciled, false);
  await host.call("plugins.loadDev", { path: pluginDir });
  assert.equal((await row()).models.length, 0);
  // A real logout changes hasOauth, so even a response with unchanged models is stale.
  const connected = await row();
  await host.call("secrets.delete", { secretRef: secretRefForProviderOauth(providerId) });
  const signedOut = await host.call("providers.update", { id: providerId, expectedProvider: connected, models: selected });
  assert.equal(signedOut.reconciled, false);
  assert.equal((await row()).models.length, 0);
  console.log("PASS Nib upgrade: real Host normalized seed, no-login startup, failure/retry, cache-only read, metadata/Composer/runtime, saved subset/override, restart, atomic edit/logout fencing");
} finally {
  if (host) await host.dispose();
  await rm(dataDir, { recursive: true, force: true });
}

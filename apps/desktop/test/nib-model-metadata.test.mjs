import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { createServer } from "vite";

register(new URL("./helpers/ts-import-hooks.mjs", import.meta.url));
const { VendorOAuth, secretRefForProviderOauth } = await import("../electron/main/oauth.ts");
const { ModelsDevCatalog, catalogModelConfigFor } = await import("../electron/main/models-dev-catalog.ts");
const { createProviderCatalogRuntime } = await import("../electron/main/runtime/provider-catalog.ts");
const { registerProviderIpc } = await import("../electron/main/ipc/provider-ipc.ts");
const { bindingForCustomModel, IPC } = await import("@pi-desktop/shared");
const { composerModelsForProvider } = await import("../src/lib/composer-models.ts");

const manifest = JSON.parse(await readFile(new URL("../resources/plugins/nib.provider/manifest.json", import.meta.url), "utf8"));
const declaration = manifest.contributes.providers[0];
const providerId = "plugin:nib.provider:nib";
const correctedModels = [
  ["gemini-4-argon-extra", "Gemini 4 Argon Extra", 1_048_576, 32_768],
  ["deepseek-v4.1-flash", "DeepSeek V4.1 Flash", 1_000_000, 384_000],
  ["claude-fable-5-2", "Claude Fable 5.2", 1_000_000, 128_000],
];

test("Nib discovery, picker and runtime preserve corrected catalog metadata and wire IDs", async () => {
  const h = await fixture({ fetchModels: () => new Response(JSON.stringify({
    data: correctedModels.map(([id]) => ({ id })),
  })) });
  await h.login();
  const discovered = await h.handlers.get(IPC.invoke.providersListModels)({ providerId, source: "cache" });
  const composer = composerModelsForProvider(h.runtime.enrichProvider(h.row), discovered.models);
  const { buildProviderModel } = await import("../../../packages/agent-runtime/dist/provider-binding.js");
  for (const [id, name, context, output] of correctedModels) {
    const info = h.catalog.findModel({ modelId: id, vendorKey: "nib", baseUrl: declaration.baseUrl });
    assert.equal(info.displayName, name, id);
    const discoveredModel = discovered.models.find((model) => model.modelId === id);
    assert.equal(discoveredModel.contextWindow, context, id);
    assert.equal(discoveredModel.maxTokens, output, id);
    assert.equal(composer.find((model) => model.modelId === id).contextWindow, context, id);
    const binding = await h.oauth.bindingFor(providerId, id);
    assert.equal(binding.modelConfig.contextWindow, context, id);
    assert.equal(binding.modelConfig.maxTokens, output, id);
    const wire = buildProviderModel({ ...binding, id: providerId, name: "Nib", modelId: id,
      apiKey: "", authKind: "none", model: { id, api: "openai-completions", baseUrl: binding.baseUrl } });
    assert.equal(wire.id, id, "runtime keeps the wire ID");
    assert.equal(wire.contextWindow, context, id);
    assert.equal(wire.maxTokens, output, id);
  }
});

const served = ["claude-haiku-4-5-20251001", "claude-sonnet-5", "gpt-6-astra", "gpt-6.1-sol", "gemini-4-argon", "grok-4.7", "unpublished-fixture-model"];

async function fixture({ models = structuredClone(declaration.models), fetchModels, signedIn = false, modelSelectionConfigured, loginToken = "fixture-gateway-token" } = {}) {
  let row = {
    ...declaration, id: providerId, ownerPluginId: manifest.id,
    enabled: true, defaultModelId: models[0]?.id, models,
    modelSelectionConfigured,
  };
  const secrets = new Map();
  if (signedIn) secrets.set(secretRefForProviderOauth(providerId), JSON.stringify({ accessToken: "fixture-gateway-token" }));
  let cache = [];
  const host = { call: async (method, input = {}) => {
    switch (method) {
      case "providers.list": return { providers: [{ ...row, hasOauth: secrets.has(secretRefForProviderOauth(providerId)) }] };
      case "providers.get": return { provider: row };
      case "providers.update": row = { ...row, ...input, modelSelectionConfigured: !!input.models }; return { provider: row };
      case "providers.listModels": return { models: cache };
      case "providers.cacheModels": cache = input.models; return { models: cache };
      case "secrets.getForRuntime": return { value: secrets.get(input.secretRef) ?? null };
      case "secrets.set": secrets.set(input.secretRef, input.value); return { ok: true };
      case "secrets.delete": secrets.delete(input.secretRef); return { ok: true };
      default: throw new Error(`Unexpected fixture RPC: ${method}`);
    }
  } };
  const catalog = new ModelsDevCatalog({
    catalogPath: fileURLToPath(new URL("../resources/models.dev/api.json", import.meta.url)),
  });
  await catalog.loadLocal();
  const runtime = createProviderCatalogRuntime({ getHost: () => host, modelsDevCatalog: catalog });
  catalog.configureAccount(row);
  const plugin = {
    pluginId: manifest.id, contributionId: declaration.id, providerId,
    runtimeId: "fixture-runtime", name: "Nib", isSubscription: true,
    models: structuredClone(declaration.models),
  };
  const requests = [];
  const http = async (url, init) => {
    requests.push(String(url));
    assert.equal(String(url), "https://api.nib.am/v1/models");
    if (fetchModels) return fetchModels(init);
    return new Response(JSON.stringify({ data: served.map((id) => ({ id })) }), {
      headers: { "content-type": "application/json" },
    });
  };
  const events = [];
  let finishLogin;
  const oauth = new VendorOAuth({
    call: host.call, fetch: http, openExternal: async () => {},
    emit: (event) => {
      events.push(event);
      if (["done", "error", "cancelled"].includes(event.kind)) finishLogin?.(event);
    },
    getPluginOAuthBridge: () => ({
      listOAuthProviders: () => [plugin],
      invokeProviderOAuth: async () => ({ accessToken: loginToken, accountLabel: "Fixture account" }),
    }),
    onAccountRemoved: (id) => catalog.deleteAccount(id),
    onAccountRestored: (id) => catalog.restoreAccount(id),
    modelConfigFor: async ({ providerId, vendorKey, option }) => {
      await catalog.ensureLoaded();
      return catalogModelConfigFor(catalog, {
        providerId, vendorKey, modelId: option.modelId, baseUrl: option.baseUrl, apiStyle: option.apiStyle,
      });
    },
  });
  const handlers = new Map();
  registerProviderIpc({
    registrar: { handle: (name, handler) => handlers.set(name, handler) },
    getHost: () => host, modelsDevCatalog: catalog, vendorOAuth: oauth, logger: { app() {} },
    ...runtime,
  });
  return {
    get row() { return row; }, catalog, runtime, oauth, handlers, requests, events,
    reload: () => { plugin.runtimeId += "-reloaded"; },
    edit: (models) => { row = { ...row, models, modelSelectionConfigured: true }; },
    login: async () => {
      const outcome = new Promise((resolve) => { finishLogin = resolve; });
      await oauth.start(providerId);
      assert.equal((await outcome).kind, "done", "a successful sign-in reaches done");
    },
  };
}

test("a fresh Nib login selects the gateway models with published per-model limits", async () => {
  const h = await fixture();
  await h.login();
  assert.deepEqual(h.row.models.map((model) => model.id), served,
    "the account is initialized before the login reports done, without opening Settings");
  for (const id of served.slice(0, -1)) {
    const published = h.catalog.findModel({ modelId: id, vendorKey: "nib", baseUrl: declaration.baseUrl });
    const binding = h.row.models.find((model) => model.id === id);
    assert.equal(binding.contextWindow, published.limit.context, id);
    assert.equal(binding.maxTokens, published.limit.output, id);
    assert.equal(binding.contextWindowSource, "catalog");
    assert.equal(binding.maxTokensSource, "catalog");
  }
  assert.equal(h.row.models.at(-1).contextWindowSource, "catalog", "a generic safety budget is not a user override");
  const discovered = await h.handlers.get(IPC.invoke.providersListModels)({ providerId, source: "cache" });
  const composer = composerModelsForProvider(h.runtime.enrichProvider(h.row), discovered.models);
  assert.equal(composer.find((model) => model.modelId === "gpt-6-astra").contextWindow, 1_050_000);
  assert.equal(discovered.models.find((model) => model.modelId === "claude-sonnet-5").limit.context, 1_000_000);
  assert.equal(discovered.models.find((model) => model.modelId === "gemini-4-argon").limit.output, 32_768);
});

test("Nib sign-in refreshes inherited limits while preserving a saved selection and explicit overrides", async () => {
  const h = await fixture({ models: [
    bindingForCustomModel("gpt-6-astra"),
    { ...bindingForCustomModel("claude-sonnet-5"), contextWindow: 256_000, contextWindowSource: "user", maxTokens: 4_096, maxTokensSource: "user", alias: "My Claude" },
  ] });
  await h.login();
  assert.deepEqual(h.row.models.map((model) => model.id), ["gpt-6-astra", "claude-sonnet-5"]);
  assert.equal(h.row.models[0].contextWindow, 1_050_000);
  assert.equal(h.row.models[0].maxTokens, 128_000);
  assert.equal(h.row.models[1].contextWindow, 256_000);
  assert.equal(h.row.models[1].maxTokens, 4_096);
  assert.equal(h.row.models[1].alias, "My Claude");
});

test("unavailable gateway discovery preserves the saved Nib selection and a successful login", async () => {
  const h = await fixture({
    models: [bindingForCustomModel("gpt-6-astra")],
    fetchModels: () => new Response(null, { status: 503 }),
  });
  await h.login();
  assert.deepEqual(h.row.models.map((model) => model.id), ["gpt-6-astra"]);
  assert.equal(h.events.some((event) => event.kind === "error"), false);
});

test("an inherited saved Nib limit cannot override its published runtime limit", async () => {
  const h = await fixture({ models: [bindingForCustomModel("gpt-6-astra")] });
  const binding = await h.oauth.bindingFor(providerId, "gpt-6-astra");
  assert.equal(binding.modelConfig.contextWindow, 1_050_000);
  assert.equal(binding.modelConfig.maxTokens, 128_000);
});

test("the fixed Nib provider id resumes catalog lookups after sign-out", async () => {
  const h = await fixture();
  h.catalog.deleteAccount(providerId);
  await h.login();
  assert.equal(h.row.models.find((model) => model.id === "gpt-6-astra").contextWindow, 1_050_000);
  assert.equal(h.row.models.find((model) => model.id === "claude-sonnet-5").maxTokens, 128_000);
});

test("sign-out followed by sign-in restores Nib model metadata", async () => {
  const h = await fixture();
  await h.login();
  await h.oauth.deleteAccount(providerId);
  await h.login();
  const discovered = await h.handlers.get(IPC.invoke.providersListModels)({ providerId, source: "cache" });
  assert.equal(discovered.models.find((model) => model.modelId === "gpt-6-astra").limit.context, 1_050_000);
  assert.equal(discovered.models.find((model) => model.modelId === "claude-sonnet-5").limit.output, 128_000);
});

test("Nib Settings renders each published context and output limit", async (t) => {
  const h = await fixture();
  await h.login();
  const result = await h.handlers.get(IPC.invoke.providersListModels)({ providerId, source: "refresh" });
  const discovery = { status: "ready", ...result };
  const server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)), configFile: false, logLevel: "silent",
    server: { middlewareMode: true, hmr: false, ws: false },
    esbuild: { jsx: "automatic" }, appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  t.after(() => server.close());
  const { ModelSelectionPanes, useModelSelection } = await server.ssrLoadModule(
    "/src/components/settings/ModelSelectionPanes.tsx",
  );
  const i18n = createInstance();
  await i18n.init({ lng: "en", resources: { en: { translation: {} } } });
  function SettingsModels() {
    const selection = useModelSelection(discovery, h.row.models, () => {});
    return createElement(ModelSelectionPanes, { discovery, selection, listTitle: "Nib models" });
  }
  const html = renderToStaticMarkup(createElement(I18nextProvider, { i18n }, createElement(SettingsModels)));
  assert.match(html, /value="1050000"/);
  assert.match(html, /value="1000000"/);
  assert.match(html, /value="32768"/);
});

test("existing signed-in Nib upgrade expands on provider startup without login", async () => {
  const h = await fixture({ signedIn: true, models: declaration.models.map((model) => ({
    ...model, contextWindowSource: "catalog", maxTokensSource: "catalog",
  })) });
  await h.handlers.get(IPC.invoke.providersList)();
  await h.oauth.reconcilePluginModels(providerId);
  assert.deepEqual(h.row.models.map((model) => model.id), served);
  assert.equal(h.row.modelSelectionConfigured, true);
  assert.equal(h.row.models.find((model) => model.id === "gpt-6-astra").contextWindow, 1_050_000);
});

test("cache reads never discover; failed startup can retry on refresh", async () => {
  let attempts = 0;
  const h = await fixture({ signedIn: true, fetchModels: () => ++attempts === 1
    ? new Response(null, { status: 503 })
    : new Response(JSON.stringify({ data: served.map((id) => ({ id })) })) });
  await h.handlers.get(IPC.invoke.providersListModels)({ providerId, source: "cache" });
  assert.equal(attempts, 0);
  await h.handlers.get(IPC.invoke.providersList)();
  await h.oauth.reconcilePluginModels(providerId);
  assert.equal(h.row.modelSelectionConfigured, undefined);
  await h.handlers.get(IPC.invoke.providersListModels)({ providerId, source: "refresh" });
  assert.deepEqual(h.row.models.map((model) => model.id), served);
});

test("startup preserves a saved subset and manual limits", async () => {
  const selected = [{ ...bindingForCustomModel("gpt-6-astra"), contextWindow: 42_000, contextWindowSource: "user" }];
  const h = await fixture({ signedIn: true, models: selected });
  await h.handlers.get(IPC.invoke.providersList)();
  await h.oauth.reconcilePluginModels(providerId);
  assert.deepEqual(h.row.models.map((model) => model.id), ["gpt-6-astra"]);
  assert.equal(h.row.models[0].contextWindow, 42_000);
});

test("a concurrent edit cannot be overwritten by startup discovery", async () => {
  let release;
  const response = new Promise((resolve) => { release = resolve; });
  const h = await fixture({ signedIn: true, fetchModels: () => response });
  const startup = h.handlers.get(IPC.invoke.providersList)();
  while (h.requests.length === 0) await new Promise((resolve) => setImmediate(resolve));
  h.edit([bindingForCustomModel("grok-4.7")]);
  release(new Response(JSON.stringify({ data: served.map((id) => ({ id })) })));
  await startup;
  await h.oauth.reconcilePluginModels(providerId);
  assert.deepEqual(h.row.models.map((model) => model.id), ["grok-4.7"]);
});

test("sign-out during reconciliation discards the delayed model list", async () => {
  let release;
  const response = new Promise((resolve) => { release = resolve; });
  const h = await fixture({ signedIn: true, fetchModels: () => response });
  const pending = h.oauth.reconcilePluginModels(providerId);
  while (h.requests.length === 0) await new Promise((resolve) => setImmediate(resolve));
  await h.oauth.deleteAccount(providerId);
  release(new Response(JSON.stringify({ data: served.map((id) => ({ id })) })));
  await pending;
  assert.deepEqual(h.row.models.map((model) => model.id), declaration.models.map((model) => model.id));
});

function gate() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
const modelResponse = (ids) => new Response(JSON.stringify({ data: ids.map((id) => ({ id })) }));

test("empty unconfigured selection initializes all gateway models", { timeout: 5000 }, async () => {
  const h = await fixture({ signedIn: true, models: [] });
  await h.oauth.reconcilePluginModels(providerId);
  assert.deepEqual(h.row.models.map((model) => model.id), served);
});

test("explicit three-model selection survives startup and live refresh", { timeout: 5000 }, async () => {
  const h = await fixture({ signedIn: true, modelSelectionConfigured: true });
  await h.handlers.get(IPC.invoke.providersList)();
  await h.oauth.reconcilePluginModels(providerId);
  assert.equal(h.requests.length, 0);
  await h.handlers.get(IPC.invoke.providersListModels)({ providerId, source: "refresh" });
  assert.deepEqual(h.row.models.map((model) => model.id), declaration.models.map((model) => model.id));
});

test("login replaces the credential before using a cached catalogue", { timeout: 5000 }, async () => {
  const h = await fixture({ signedIn: true, loginToken: "fixture-token-B", fetchModels: (init) =>
    modelResponse(init.headers.authorization === "Bearer fixture-token-B" ? ["grok-4.7"] : served) });
  await h.oauth.listModels(providerId);
  await h.login();
  assert.deepEqual(h.row.models.map((model) => model.id), ["grok-4.7"]);
});

test("delayed account A discovery cannot cache or persist after logout and login B", { timeout: 5000 }, async () => {
  const entered = gate();
  const response = gate();
  const h = await fixture({ signedIn: true, loginToken: "fixture-token-B", fetchModels: (init) => {
    if (init.headers.authorization === "Bearer fixture-token-B") return modelResponse(["grok-4.7"]);
    entered.resolve();
    return response.promise;
  } });
  const old = h.oauth.reconcilePluginModels(providerId);
  await entered.promise;
  await h.oauth.deleteAccount(providerId);
  await h.login();
  response.resolve(modelResponse(served));
  await old;
  assert.deepEqual(h.row.models.map((model) => model.id), ["grok-4.7"]);
  assert.deepEqual((await h.oauth.listModels(providerId)).map((model) => model.modelId), ["grok-4.7"]);
});

test("runtime reload rejects in-flight discovery and cannot reuse its cache", { timeout: 5000 }, async () => {
  const entered = gate();
  const response = gate();
  let calls = 0;
  const h = await fixture({ signedIn: true, fetchModels: () => {
    if (++calls > 1) return modelResponse(["grok-4.7"]);
    entered.resolve();
    return response.promise;
  } });
  const old = h.oauth.reconcilePluginModels(providerId);
  await entered.promise;
  h.reload();
  response.resolve(modelResponse(served));
  await old;
  assert.equal(h.oauth.hasPublishedPluginModels(providerId), false);
  assert.deepEqual(h.row.models.map((model) => model.id), declaration.models.map((model) => model.id));
  await h.oauth.reconcilePluginModels(providerId, true);
  assert.deepEqual(h.row.models.map((model) => model.id), ["grok-4.7"]);
  await h.oauth.deleteAccount(providerId);
  assert.deepEqual(await h.oauth.listModels(providerId), []);
});

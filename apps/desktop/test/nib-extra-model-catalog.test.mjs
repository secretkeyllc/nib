import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

register(new URL("./helpers/ts-import-hooks.mjs", import.meta.url));
const { ModelsDevCatalog } = await import("../electron/main/models-dev-catalog.ts");

/**
 * The gateway serves quota-isolated deployments of published models under a
 * `-extra` suffix (`claude-sonnet-5-extra` routes to `claude-sonnet-5`
 * upstream). The models.dev snapshot has no record for the suffixed id, so
 * without the fallback the row degrades to the generic 128k text-only shape.
 * The base model's record must answer, with the served id untouched.
 */
const NIB_BASE_URL = "https://api.nib.am/v1";

async function catalog() {
  const instance = new ModelsDevCatalog({
    catalogPath: fileURLToPath(new URL("../resources/models.dev/api.json", import.meta.url)),
  });
  await instance.loadLocal();
  return instance;
}

test("an -extra id borrows the base model's published record", async () => {
  const instance = await catalog();
  const base = instance.findModel({ modelId: "claude-sonnet-5", vendorKey: "nib", baseUrl: NIB_BASE_URL });
  assert.ok(base, "the base model resolves in the shipped catalog");
  const extra = instance.findModel({ modelId: "claude-sonnet-5-extra", vendorKey: "nib", baseUrl: NIB_BASE_URL });
  assert.ok(extra, "the -extra row resolves through the suffix fallback");
  assert.equal(extra.limit.context, base.limit.context, "context window follows the base model");
  assert.equal(extra.limit.output, base.limit.output, "max output follows the base model");
  assert.deepEqual(extra.modalities, base.modalities, "modalities follow the base model");
  // The fallback is metadata-only: the served id stays exactly what the
  // gateway published, so requests keep addressing the -extra route.
  assert.equal(extra.modelId, "claude-sonnet-5");
});

test("a plain id never borrows the -extra path", async () => {
  const instance = await catalog();
  const base = instance.findModel({ modelId: "claude-sonnet-5", vendorKey: "nib", baseUrl: NIB_BASE_URL });
  assert.equal(base.modelId, "claude-sonnet-5");
  // An id that merely contains "extra" mid-name is not a deployment suffix.
  const midName = instance.findModel({ modelId: "extraordinary-model", vendorKey: "nib", baseUrl: NIB_BASE_URL });
  assert.equal(midName, undefined, "mid-name 'extra' is not a suffix");
});

test("an unknown -extra id stays unresolved rather than generic", async () => {
  const instance = await catalog();
  const unknown = instance.findModel({ modelId: "no-such-model-extra", vendorKey: "nib", baseUrl: NIB_BASE_URL });
  assert.equal(unknown, undefined, "no base model means no borrowed record");
});

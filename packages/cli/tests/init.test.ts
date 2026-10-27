import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProviderBlock, mergeProviderConfig, stripJsonComments, projectConfigPath } from "../src/commands/init.js";
import { normalizeApiUrl } from "../src/lib/config.js";
import { parseFlags } from "../src/index.js";
import type { ModelList } from "../src/lib/types.js";

const models: ModelList = {
  object: "list",
  data: [
    { id: "nib-efficient", object: "model", owned_by: "nib", tier: "efficient" },
    { id: "nib-frontier", object: "model", owned_by: "nib", tier: "frontier" },
  ],
};

test("buildProviderBlock points at the gateway and never embeds a raw token", () => {
  const block = buildProviderBlock("https://api.sknib.com", models);
  assert.equal(block.npm, "@ai-sdk/openai-compatible");
  assert.equal(block.options.baseURL, "https://api.sknib.com/v1");
  assert.equal(block.options.apiKey, "{env:NIB_API_KEY}");
  assert.deepEqual(Object.keys(block.models), ["nib-efficient", "nib-frontier"]);
});

test("mergeProviderConfig preserves unrelated keys and existing providers", () => {
  const existing = {
    $schema: "https://opencode.ai/config.json",
    theme: "dark",
    provider: { anthropic: { options: { baseURL: "https://api.anthropic.com/v1" } } },
  };
  const merged = mergeProviderConfig(existing, buildProviderBlock("https://api.sknib.com", models), "nib-efficient");
  assert.equal(merged.theme, "dark");
  assert.equal(merged.model, "nib/nib-efficient");
  const providers = merged.provider as Record<string, unknown>;
  assert.ok(providers.anthropic);
  assert.ok(providers.nib);
});

test("stripJsonComments keeps URLs and strings intact", () => {
  const input = `{
    // line comment
    "url": "https://example.com/a//b", /* block */
    "nested": { "value": "keep // this" }
  }`;
  const parsed = JSON.parse(stripJsonComments(input)) as Record<string, unknown>;
  assert.equal(parsed.url, "https://example.com/a//b");
  assert.deepEqual(parsed.nested, { value: "keep // this" });
});

test("normalizeApiUrl trims trailing slashes and rejects plain http off-localhost", () => {
  assert.equal(normalizeApiUrl("https://api.sknib.com///"), "https://api.sknib.com");
  assert.equal(normalizeApiUrl("http://localhost:8080"), "http://localhost:8080");
  assert.throws(() => normalizeApiUrl("http://api.sknib.com"), /https/);
});

test("parseFlags handles --flag, --key=value and --key value", () => {
  const flags = parseFlags(["--json", "--model=nib-frontier", "--api-url", "https://example.test", "--force"]);
  assert.equal(flags.has("--json"), true);
  assert.equal(flags.has("--force"), true);
  assert.equal(flags.value("--model"), "nib-frontier");
  assert.equal(flags.value("--api-url"), "https://example.test");
});

test("projectConfigPath is rooted at the supplied directory", () => {
  assert.equal(projectConfigPath("/tmp/demo"), "/tmp/demo/opencode.json");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_MODEL,
  GATEWAY_KEY_ENV,
  NIB_CONFIG_FILENAME,
  buildNibConfig,
  engineEnv,
  readNibConfig,
  writeNibConfig,
} from "../engine/nib-config.js";

test("buildNibConfig points the engine at the gateway without embedding a token", () => {
  const config = buildNibConfig("https://api.sknib.com");
  assert.equal(config.provider.nib.npm, "@ai-sdk/openai-compatible");
  assert.equal(config.provider.nib.name, "Nib");
  assert.equal(config.provider.nib.options.baseURL, "https://api.sknib.com/v1");
  assert.equal(config.provider.nib.options.apiKey, "{env:NIB_GATEWAY_KEY}");
  assert.equal(config.model, DEFAULT_MODEL);
  assert.equal(config.model, "nib/nib-efficient");
  assert.equal(GATEWAY_KEY_ENV, "NIB_GATEWAY_KEY");
});

test("buildNibConfig normalizes the base URL before appending /v1", () => {
  assert.equal(buildNibConfig("https://api.sknib.com///").provider.nib.options.baseURL, "https://api.sknib.com/v1");
  assert.equal(buildNibConfig("https://api.sknib.com/").provider.nib.options.baseURL, "https://api.sknib.com/v1");
});

test("writeNibConfig and readNibConfig round-trip, and engineEnv injects the token", async () => {
  const dir = await mkdtemp(join(tmpdir(), "nib-config-test-"));
  try {
    const path = await writeNibConfig(dir, "https://api.sknib.com");
    assert.equal(path, join(dir, NIB_CONFIG_FILENAME));
    assert.equal(path, join(dir, "nib.json"));

    const parsed = await readNibConfig(dir);
    assert.deepEqual(parsed, buildNibConfig("https://api.sknib.com"));

    const token = "nib_secret_token_123";
    const env = engineEnv(path, token, { INHERITED: "yes" });
    assert.equal(env.OPENCODE_CONFIG, path);
    assert.equal(env.NIB_GATEWAY_KEY, token);
    assert.equal(env.INHERITED, "yes");

    const envWithoutBase = engineEnv(path, token);
    assert.deepEqual(envWithoutBase, { OPENCODE_CONFIG: path, NIB_GATEWAY_KEY: token });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the written config file never contains the raw gateway token", async () => {
  const dir = await mkdtemp(join(tmpdir(), "nib-config-test-"));
  try {
    const token = "sk_live_super_secret_token";
    await writeNibConfig(dir, "https://api.sknib.com");
    const raw = await readFile(join(dir, "nib.json"), "utf8");
    assert.ok(!raw.includes(token), "config file leaked the raw token");
    assert.ok(raw.includes("{env:NIB_GATEWAY_KEY}"));
    // The file is the JSON.stringify of the built config, nothing more.
    assert.deepEqual(JSON.parse(raw), buildNibConfig("https://api.sknib.com"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

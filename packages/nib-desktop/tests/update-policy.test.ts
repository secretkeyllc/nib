import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveUpdatePolicy } from "../update/policy.js";

/** A build that has every baseline condition for auto-update. */
const signedWindowsBuild = {
  packaged: true,
  platform: "win32" as const,
  codeSigned: true,
};

test("development runs (not packaged) never check for updates", () => {
  const policy = resolveUpdatePolicy({ packaged: false, platform: "win32", codeSigned: true, env: {} });
  assert.equal(policy.enabled, false);
  assert.equal(policy.reason, "not packaged");
  assert.equal(policy.channel, "latest");
});

test("auto-update is disabled off Windows", () => {
  for (const platform of ["linux", "darwin"] as const) {
    const policy = resolveUpdatePolicy({ packaged: true, platform, codeSigned: true, env: {} });
    assert.equal(policy.enabled, false);
    assert.equal(policy.reason, "auto-update ships for Windows first");
  }
});

test("the unsigned beta build does not auto-update", () => {
  const policy = resolveUpdatePolicy({ packaged: true, platform: "win32", codeSigned: false, env: {} });
  assert.equal(policy.enabled, false);
  assert.equal(policy.reason, "unsigned beta build");
  assert.equal(policy.channel, "latest");
});

test("a packaged, signed Windows build auto-updates on the stable channel", () => {
  const policy = resolveUpdatePolicy({ ...signedWindowsBuild, env: {} });
  assert.equal(policy.enabled, true);
  assert.equal(policy.channel, "latest");
  assert.equal(policy.reason, "signed Windows build");
});

test("NIB_DISABLE_UPDATES=1 overrides even a signed production build", () => {
  const policy = resolveUpdatePolicy({ ...signedWindowsBuild, env: { NIB_DISABLE_UPDATES: "1" } });
  assert.equal(policy.enabled, false);
  assert.equal(policy.reason, "updates disabled by NIB_DISABLE_UPDATES");
  assert.equal(policy.channel, "latest");
});

test("NIB_ENABLE_UPDATES=1 forces updates on even in an unpackaged dev run", () => {
  const policy = resolveUpdatePolicy({ packaged: false, platform: "linux", env: { NIB_ENABLE_UPDATES: "1" } });
  assert.equal(policy.enabled, true);
  assert.equal(policy.reason, "updates forced on by NIB_ENABLE_UPDATES");
  assert.equal(policy.channel, "latest");
});

test("NIB_CHANNEL=beta switches the channel when updates are enabled", () => {
  const policy = resolveUpdatePolicy({ ...signedWindowsBuild, env: { NIB_CHANNEL: "beta" } });
  assert.equal(policy.enabled, true);
  assert.equal(policy.channel, "beta");

  const forced = resolveUpdatePolicy({
    packaged: false,
    platform: "linux",
    env: { NIB_ENABLE_UPDATES: "1", NIB_CHANNEL: "beta" },
  });
  assert.equal(forced.enabled, true);
  assert.equal(forced.channel, "beta");

  // The disable path pins the stable channel even when beta was requested.
  const disabled = resolveUpdatePolicy({
    ...signedWindowsBuild,
    env: { NIB_DISABLE_UPDATES: "1", NIB_CHANNEL: "beta" },
  });
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.channel, "latest");
});

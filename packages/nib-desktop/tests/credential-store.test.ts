import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileCredentialStore, createCredentialStore } from "../auth/credential-store.js";

test("FileCredentialStore stores, overwrites, reads and deletes secrets", async () => {
  const dir = await mkdtemp(join(tmpdir(), "nib-cred-test-"));
  try {
    const store = new FileCredentialStore(dir);
    assert.equal(store.kind, "file");

    // ENOENT before anything is written.
    assert.equal(await store.getPassword("Nib", "gateway"), null);
    assert.equal(await store.deletePassword("Nib", "gateway"), false);

    await store.setPassword("Nib", "gateway", "token-one");
    assert.equal(await store.getPassword("Nib", "gateway"), "token-one");

    await store.setPassword("Nib", "gateway", "token-two");
    assert.equal(await store.getPassword("Nib", "gateway"), "token-two");

    assert.equal(await store.deletePassword("Nib", "gateway"), true);
    assert.equal(await store.getPassword("Nib", "gateway"), null);
    assert.equal(await store.deletePassword("Nib", "gateway"), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("FileCredentialStore writes the secret file with 0600 permissions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "nib-cred-test-"));
  try {
    const store = new FileCredentialStore(dir);
    await store.setPassword("Nib", "gateway", "token");
    const info = await stat(join(dir, "Nib.gateway.secret"));
    assert.equal(info.mode & 0o777, 0o600);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("createCredentialStore dispatches on the injected platform", () => {
  // Constructors never spawn anything: the Windows store only invokes
  // PowerShell from its methods, which these assertions do not call.
  assert.equal(createCredentialStore({ platform: "win32" }).kind, "windows-credman");
  assert.equal(createCredentialStore({ platform: "win32", fileDir: "/tmp/ignored" }).kind, "windows-credman");
  assert.equal(createCredentialStore({ platform: "linux" }).kind, "file");
  assert.equal(createCredentialStore({ platform: "darwin" }).kind, "file");
  assert.equal(createCredentialStore({ platform: "linux", fileDir: "/tmp/creds" }).kind, "file");
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const checker = join(repoRoot, "scripts/check-bundled-host.mjs");

/**
 * Minimal little-endian Mach-O 64 header for `arch`.
 * A real Mach-O 64 file starts with 0xfeedfacf when its first four bytes are
 * read little-endian (the bytes are cf fa ed fe), so that is what we write.
 */
function macho(arch) {
  const buffer = Buffer.alloc(64);
  buffer.writeUInt32LE(0xfeedfacf, 0);
  buffer.writeUInt32LE(arch === "arm64" ? 0x0100000c : 0x01000007, 4);
  return buffer;
}

/** Minimal ELF header for `arch`. */
function elf(arch) {
  const buffer = Buffer.alloc(64);
  buffer.write("\x7fELF", 0, "latin1");
  buffer[4] = 2; // 64-bit
  buffer[5] = 1; // little-endian
  buffer.writeUInt16LE(arch === "arm64" ? 0xb7 : 0x3e, 18);
  return buffer;
}

/**
 * Build a bundle directory shaped like the packaged app.
 * macOS: <dir>/Contents/Resources/bin/nib-host-core. Linux: resources/bin/.
 */
function bundle(platform, contents) {
  const dir = mkdtempSync(join(tmpdir(), "nib-bundle-"));
  const bin = join(
    dir,
    ...(platform === "macos" ? ["Contents", "Resources", "bin"] : ["resources", "bin"]),
  );
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, "nib-host-core"), contents);
  return dir;
}

function run(dir, platform, arch) {
  return spawnSync(
    process.execPath,
    [checker, dir, "--platform", platform, "--arch", arch],
    { cwd: repoRoot, encoding: "utf8" },
  );
}

test("the macOS package rejects a Linux host-core", () => {
  // Packaging a macOS app on a Linux runner copied the host-built ELF binary
  // into the .app; the app then launched with a dead local service.
  const dir = bundle("macos", elf("x64"));
  try {
    const result = run(dir, "macos", "arm64");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /expected a mach-o binary/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the macOS package accepts an arm64 Mach-O host-core", () => {
  const dir = bundle("macos", macho("arm64"));
  try {
    const result = run(dir, "macos", "arm64");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /mach-o arm64/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the macOS package rejects the wrong architecture", () => {
  const dir = bundle("macos", macho("x64"));
  try {
    const result = run(dir, "macos", "arm64");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /expected arm64, found x64/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the Linux package accepts an x64 ELF host-core", () => {
  const dir = bundle("linux", elf("x64"));
  try {
    const result = run(dir, "linux", "x64");
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a missing host-core fails loudly instead of passing", () => {
  const empty = mkdtempSync(join(tmpdir(), "nib-bundle-empty-"));
  try {
    const result = run(empty, "macos", "arm64");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /not found/);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

test("the release script checks the bundle it is about to ship", async () => {
  const source = await readFile(
    join(repoRoot, "scripts/build-desktop-release.mjs"),
    "utf8",
  );
  assert.match(source, /check-bundled-host\.mjs/);
  assert.match(source, /refusing to ship it/);
});

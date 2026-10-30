import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const checker = join(repoRoot, "scripts/check-windows-host-imports.mjs");
const cargoConfig = await readFile(join(repoRoot, ".cargo/config.toml"), "utf8");

/** Build a minimal PE image with one import descriptor naming `dll`. */
function peWithImport(dll) {
  const sectionRva = 0x1000;
  const sectionRaw = 0x200;
  const importRva = sectionRva;
  const nameRva = sectionRva + 0x40;
  const name = Buffer.from(dll, "latin1");

  const buf = Buffer.alloc(sectionRaw + 0x200);
  buf.write("MZ", 0, "latin1");
  buf.writeUInt32LE(0x40, 0x3c);
  buf.writeUInt32LE(0x0000_4550, 0x40); // "PE\0\0"
  buf.writeUInt16LE(0xaa64, 0x44); // machine
  buf.writeUInt16LE(1, 0x46); // one section
  buf.writeUInt16LE(0xf0, 0x54); // optional header size
  const optionalHeader = 0x58;
  buf.writeUInt16LE(0x20b, optionalHeader); // PE32+
  // Data directory 1 (import table) lives at optionalHeader + 112.
  buf.writeUInt32LE(importRva, optionalHeader + 112 + 8);
  buf.writeUInt32LE(40, optionalHeader + 112 + 12);

  const sectionTable = optionalHeader + 0xf0;
  buf.write(".idata", sectionTable, "latin1");
  buf.writeUInt32LE(0x200, sectionTable + 8); // virtual size
  buf.writeUInt32LE(sectionRva, sectionTable + 12); // virtual address
  buf.writeUInt32LE(0x200, sectionTable + 16); // raw size
  buf.writeUInt32LE(sectionRaw, sectionTable + 20); // raw pointer

  // IMAGE_IMPORT_DESCRIPTOR with Name = nameRva, followed by the terminator.
  buf.writeUInt32LE(nameRva, sectionRaw + 12);
  buf.writeUInt32LE(0, sectionRaw + 20);
  name.copy(buf, sectionRaw + 0x40);
  return buf;
}

function runChecker(binaryPath, args = [binaryPath]) {
  return spawnSync(process.execPath, [checker, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("the arm64 sidecar links the CRT and libunwind statically", () => {
  // llvm-mingw links libunwind.dll dynamically by default. Windows does not
  // ship that DLL and the installer does not bundle it, so the app started but
  // the local service exited immediately (0.22.2).
  assert.match(
    cargoConfig,
    /\[target\.aarch64-pc-windows-gnullvm\]\s*\nrustflags = \["-C", "target-feature=\+crt-static"\]/,
  );
});

test("the import checker accepts a sidecar that only uses system DLLs", () => {
  const dir = mkdtempSync(join(tmpdir(), "nib-pe-ok-"));
  try {
    const binary = join(dir, "ok.exe");
    writeFileSync(binary, peWithImport("KERNEL32.dll"));
    const result = runChecker(binary);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /no foreign dependencies/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the import checker rejects a sidecar that needs libunwind.dll", () => {
  const dir = mkdtempSync(join(tmpdir(), "nib-pe-bad-"));
  try {
    const binary = join(dir, "bad.exe");
    writeFileSync(binary, peWithImport("libunwind.dll"));
    const result = runChecker(binary);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /libunwind\.dll/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the import checker reports an unreadable binary instead of passing it", () => {
  const dir = mkdtempSync(join(tmpdir(), "nib-pe-junk-"));
  try {
    const binary = join(dir, "junk.exe");
    writeFileSync(binary, "not a PE image");
    const result = runChecker(binary);
    assert.equal(result.status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Windows packaging refuses a sidecar that is not self-contained", async () => {
  const releaseScript = await readFile(
    join(repoRoot, "scripts/build-desktop-release.mjs"),
    "utf8",
  );
  assert.match(releaseScript, /check-windows-host-imports\.mjs/);
  assert.match(releaseScript, /not self-contained; refusing to package it/);
});

test("dist:win forwards the requested architecture to electron-builder", async () => {
  const releaseScript = await readFile(
    join(repoRoot, "scripts/build-desktop-release.mjs"),
    "utf8",
  );

  // pnpm forwards the `--` separator, so argv is ["--", "--arm64"]. Passing that
  // straight through made electron-builder ignore --arm64 and build x64, so the
  // arm64 release channel shipped x64 installers.
  assert.match(
    releaseScript,
    /process\.argv\.slice\(2\)\.filter\(\(arg\) => arg !== "--"\)/,
  );
  // The build args are derived from the parsed arch, not the raw argv.
  assert.match(releaseScript, /const builderArgs = \[\s*`--\$\{arch\}`/);
  assert.match(
    releaseScript,
    /filter\(\(arg\) => arg !== "--x64" && arg !== "--arm64"\)/,
  );
});

test("every Windows target links the CRT statically", () => {
  // The MSVC arm64 sidecar imported VCRUNTIME140.dll, which only exists when
  // the Visual C++ Redistributable happens to be installed. Each target the
  // build can select needs the flag; a missing stanza fails at package time.
  for (const target of [
    "x86_64-pc-windows-msvc",
    "aarch64-pc-windows-msvc",
    "aarch64-pc-windows-gnullvm",
  ]) {
    const block = cargoConfig.split(`[target.${target}]`)[1]?.split("[target.")[0];
    assert.ok(block, `${target} has no rustflags stanza`);
    assert.match(block, /target-feature=\+crt-static/, target);
  }
});

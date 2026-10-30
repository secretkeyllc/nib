#!/usr/bin/env node
/**
 * Build the Windows `host-core` sidecar for the architecture being packaged.
 *
 * The sidecar is a Rust binary that the desktop app starts as a local service;
 * it must match the Electron app's architecture or Windows refuses to load it.
 * `dist:win` forwards the target arch flag (`--x64` / `--arm64`), so this script
 * reads the same flag and selects the Rust target:
 *
 * On a Windows runner the MSVC targets are used: the Windows SDK and MSVC
 * toolchain are already installed there, and they carry the ARM64 sysroot.
 * From Linux or macOS the MinGW targets are used instead:
 *
 *   x64   -> x86_64-pc-windows-gnu      / x86_64-pc-windows-msvc
 *   arm64 -> aarch64-pc-windows-gnullvm / aarch64-pc-windows-msvc
 *
 * The gnullvm target needs llvm-mingw on PATH (`aarch64-w64-mingw32-clang`).
 * Neither cross target is usable from a Windows ARM64 runner: llvm-mingw's
 * aarch64 sysroot is absent, which makes ring's C build fail on <assert.h>.
 *
 * The output path is what `electron-builder`'s `extraResources` names, and
 * `scripts/build-desktop-release.mjs` stages it there as well, so a local
 * `electron-builder --win` invocation without this script still finds a binary
 * when one has been built before.
 */
import { spawnSync } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arch = args.includes("--arm64") ? "arm64" : "x64";

// Native Windows builds use MSVC; cross builds from Linux/macOS use MinGW.
const nativeWindows = process.platform === "win32";
const target = nativeWindows
  ? arch === "arm64"
    ? "aarch64-pc-windows-msvc"
    : "x86_64-pc-windows-msvc"
  : arch === "arm64"
    ? "aarch64-pc-windows-gnullvm"
    : "x86_64-pc-windows-gnu";

const built = join(root, "target", target, "release", "nib-host-core.exe");
const staged = join(root, "target", `${arch}-win-sidecar`, "nib-host-core.exe");

const result = spawnSync(
  "cargo",
  ["build", "--release", "--locked", "-p", "host-core", "--target", target],
  { cwd: root, stdio: "inherit" },
);

if (result.error) {
  console.error(
    arch === "arm64"
      ? `cargo could not start. For the arm64 sidecar, install llvm-mingw and put aarch64-w64-mingw32-clang on PATH:\n  ${result.error.message}`
      : `cargo could not start: ${result.error.message}`,
  );
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);

// A sidecar that imports a DLL Windows does not ship installs "successfully"
// and then dies on the first launch, so refuse to stage one. See
// check-windows-host-imports.mjs for the failure this caught in 0.22.2.
const importsCheck = spawnSync(
  process.execPath,
  [join(root, "scripts", "check-windows-host-imports.mjs"), built, "--expect-arch", arch],
  { cwd: root, stdio: "inherit" },
);
if (importsCheck.status !== 0) {
  console.error(`refusing to stage ${arch} sidecar: it is not self-contained`);
  process.exit(1);
}

await mkdir(dirname(staged), { recursive: true });
await copyFile(built, staged);
console.log(`staged ${arch} sidecar: ${staged}`);

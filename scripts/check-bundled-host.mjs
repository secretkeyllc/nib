#!/usr/bin/env node
/**
 * Fail a macOS or Linux package whose bundled `nib-host-core` came from the
 * wrong platform or architecture.
 *
 * Both packages copy `target/release/nib-host-core` verbatim, and that path
 * holds whatever the host toolchain last built. Building a macOS zip on a Linux
 * box therefore ships an ELF binary inside a Mach-O app bundle: the app starts,
 * the local service never does, and the UI shows "Can't reach the local service"
 * or "host-core exited". The reverse mistake is just as easy.
 *
 * Usage:
 *   node scripts/check-bundled-host.mjs <app-bundle-or-package-dir> --platform macos|linux --arch arm64|x64
 *
 * Exit codes: 0 clean, 1 wrong platform/arch, 2 unreadable.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const [targetDir, ...rest] = process.argv.slice(2);
const flag = (name) => {
  const index = rest.indexOf(`--${name}`);
  return index === -1 ? undefined : rest[index + 1];
};
const platform = flag("platform");
const arch = flag("arch") ?? "x64";

if (!targetDir || !["macos", "linux"].includes(platform)) {
  console.error(
    "Usage: node scripts/check-bundled-host.mjs <dir> --platform macos|linux [--arch arm64|x64]",
  );
  process.exit(2);
}

// The sidecar lands in the same relative place in both bundle layouts.
const candidates = [
  path.join(targetDir, "Contents", "Resources", "bin", "nib-host-core"),
  path.join(targetDir, "resources", "bin", "nib-host-core"),
  path.join(targetDir, "bin", "nib-host-core"),
];
const binary = candidates.find((candidate) => existsSync(candidate));
if (!binary) {
  console.error(`nib-host-core not found under ${targetDir}`);
  process.exit(2);
}

const header = readFileSync(binary).subarray(0, 4096);

/** Mach-O thin/thin-swapped/fat, and the CPU types we ship. */
function machoInfo(buffer) {
  const magicLE = buffer.readUInt32LE(0);
  const magicBE = buffer.readUInt32BE(0);
  const cpus = { 0x0100000c: "arm64", 0x01000007: "x64" };
  // MH_MAGIC_64 / MH_MAGIC in either byte order. A little-endian Mach-O stores
  // 0xfeedfacf as the bytes cf fa ed fe, i.e. 0xcffaedfe when read LE.
  const isMachO =
    magicLE === 0xcffaedfe ||
    magicLE === 0xcefaedfe ||
    magicBE === 0xfeedfacf ||
    magicBE === 0xfeedface;
  if (isMachO) {
    // cputype follows the magic and uses the same byte order as the file.
    const cpuType = magicLE === 0xcffaedfe || magicLE === 0xcefaedfe
      ? buffer.readUInt32LE(4)
      : buffer.readUInt32BE(4);
    return { format: "mach-o", arch: cpus[cpuType] ?? `cpu:${cpuType.toString(16)}` };
  }
  if (magicBE === 0xcafebabe) {
    return { format: "mach-o", arch: "universal" };
  }
  return null;
}

function elfInfo(buffer) {
  if (buffer[0] !== 0x7f || buffer.toString("latin1", 1, 4) !== "ELF") return null;
  // e_machine is a 16-bit little-endian field at offset 18.
  const machine = buffer.readUInt16LE(18);
  const machines = { 0x3e: "x64", 0xb7: "arm64" };
  return { format: "elf", arch: machines[machine] ?? `machine:${machine}` };
}

function peInfo(buffer) {
  if (buffer[0] !== 0x4d || buffer[1] !== 0x5a) return null;
  const peOffset = buffer.readUInt32LE(0x3c);
  const machine = buffer.readUInt16LE(peOffset + 4);
  const machines = { 0x8664: "x64", 0xaa64: "arm64" };
  return { format: "pe", arch: machines[machine] ?? `machine:${machine}` };
}

const info = machoInfo(header) ?? elfInfo(header) ?? peInfo(header);
if (!info) {
  console.error(`${binary}: unrecognised executable format`);
  process.exit(2);
}

const expectedFormat = platform === "macos" ? "mach-o" : "elf";
const failures = [];
if (info.format !== expectedFormat) {
  failures.push(
    `expected a ${expectedFormat} binary for ${platform}, found ${info.format.toUpperCase()}`,
  );
}
if (info.arch !== arch && info.arch !== "universal") {
  failures.push(`expected ${arch}, found ${info.arch}`);
}

if (failures.length > 0) {
  console.error(`${binary}:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    "Build host-core on the target platform before packaging, or point the package config at a cross-built binary.",
  );
  process.exit(1);
}

console.log(`${binary}: ${info.format} ${info.arch} — matches ${platform}/${arch}`);

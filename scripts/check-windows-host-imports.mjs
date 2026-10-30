#!/usr/bin/env node
/**
 * Fail a Windows host-core sidecar that depends on a DLL Windows does not ship.
 *
 * The sidecar is packaged as-is into `resources/bin/`, so any non-system DLL it
 * imports is simply missing at runtime: the desktop starts, the local service
 * exits immediately, and the UI shows "host-core exited". That is what shipped
 * in 0.22.2 — the arm64 sidecar linked `libunwind.dll` dynamically through
 * llvm-mingw while the x64 MinGW build happened to link it statically.
 *
 * Usage:
 *   node scripts/check-windows-host-imports.mjs [path-to-host-core.exe]
 *
 * Exit codes: 0 clean, 1 a non-system import, 2 unreadable binary.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const binary = path.resolve(
  process.argv[2] || path.join(root, "target/x86_64-pc-windows-gnu/release/nib-host-core.exe"),
);

/**
 * DLLs that Windows ships on every supported release, or that the app packages
 * alongside the sidecar. The UCRT (`api-ms-win-crt-*`, `ucrtbase`) is part of
 * Windows 10 and later.
 */
const SYSTEM_DLL_PATTERNS = [
  /^ntdll\.dll$/i,
  /^kernel32\.dll$/i,
  /^kernelbase\.dll$/i,
  /^user32\.dll$/i,
  /^gdi32\.dll$/i,
  /^advapi32\.dll$/i,
  /^shell32\.dll$/i,
  /^shlwapi\.dll$/i,
  /^ole32\.dll$/i,
  /^oleaut32\.dll$/i,
  /^combase\.dll$/i,
  /^rpcrt4\.dll$/i,
  /^ws2_32\.dll$/i,
  /^iphlpapi\.dll$/i,
  /^dnsapi\.dll$/i,
  /^bcrypt\.dll$/i,
  /^bcryptprimitives\.dll$/i,
  /^crypt32\.dll$/i,
  /^secur32\.dll$/i,
  /^userenv\.dll$/i,
  /^psapi\.dll$/i,
  /^pdh\.dll$/i,
  /^powrprof\.dll$/i,
  /^dwmapi\.dll$/i,
  /^winmm\.dll$/i,
  /^version\.dll$/i,
  /^msvcrt\.dll$/i,
  /^ucrtbase\.dll$/i,
  /^api-ms-win-[a-z0-9-]+\.dll$/i,
];

if (!existsSync(binary)) {
  console.error(`host-core binary not found: ${binary}`);
  process.exit(2);
}

/** Read the import directory of a PE32/PE32+ image. */
function importedDlls(data) {
  if (data.readUInt16LE(0) !== 0x5a4d) {
    throw new Error("not a PE image (missing MZ signature)");
  }
  const peOffset = data.readUInt32LE(0x3c);
  if (data.readUInt32LE(peOffset) !== 0x0000_4550) {
    throw new Error("not a PE image (missing PE signature)");
  }

  const machine = data.readUInt16LE(peOffset + 4);
  const sectionCount = data.readUInt16LE(peOffset + 6);
  const optionalHeaderSize = data.readUInt16LE(peOffset + 20);
  const optionalHeader = peOffset + 24;
  const magic = data.readUInt16LE(optionalHeader);
  // Data directory 1 is the import table. It sits after the fixed part of the
  // optional header: 96 bytes for PE32, 112 for PE32+.
  const dataDirectories = optionalHeader + (magic === 0x20b ? 112 : 96);
  const importRva = data.readUInt32LE(dataDirectories + 8);
  if (importRva === 0) return { machine, dlls: [] };

  const sections = [];
  const sectionTable = optionalHeader + optionalHeaderSize;
  for (let index = 0; index < sectionCount; index += 1) {
    const entry = sectionTable + index * 40;
    sections.push({
      virtualSize: data.readUInt32LE(entry + 8),
      virtualAddress: data.readUInt32LE(entry + 12),
      rawSize: data.readUInt32LE(entry + 16),
      rawPointer: data.readUInt32LE(entry + 20),
    });
  }

  const offsetOf = (rva) => {
    for (const section of sections) {
      const span = Math.max(section.virtualSize, section.rawSize);
      if (rva >= section.virtualAddress && rva < section.virtualAddress + span) {
        return section.rawPointer + (rva - section.virtualAddress);
      }
    }
    return undefined;
  };

  const dlls = [];
  let cursor = offsetOf(importRva);
  if (cursor === undefined) return { machine, dlls };

  // IMAGE_IMPORT_DESCRIPTOR: 20 bytes, all-zero entry terminates the array.
  while (cursor + 20 <= data.length) {
    const nameRva = data.readUInt32LE(cursor + 12);
    if (nameRva === 0) break;
    const nameOffset = offsetOf(nameRva);
    if (nameOffset === undefined) break;
    const end = data.indexOf(0, nameOffset);
    dlls.push(data.toString("latin1", nameOffset, end === -1 ? data.length : end));
    cursor += 20;
  }

  return { machine, dlls };
}

let parsed;
try {
  parsed = importedDlls(readFileSync(binary));
} catch (error) {
  console.error(`unable to read the PE import table of ${binary}: ${error.message}`);
  process.exit(2);
}

const foreign = parsed.dlls.filter(
  (dll) => !SYSTEM_DLL_PATTERNS.some((pattern) => pattern.test(dll)),
);

if (foreign.length > 0) {
  console.error(
    `${binary} imports DLLs that Windows does not ship and the package does not bundle:`,
  );
  for (const dll of foreign) console.error(`  - ${dll}`);
  console.error(
    "Link the CRT and runtime statically (see .cargo/config.toml) so the sidecar starts on a clean install.",
  );
  process.exit(1);
}

console.log(
  `host-core imports ${parsed.dlls.length} system DLLs and no foreign dependencies (machine 0x${parsed.machine.toString(16)}).`,
);

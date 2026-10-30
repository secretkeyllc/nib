import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const releaseScript = await readFile(
  new URL("../../../scripts/build-desktop-release.mjs", import.meta.url),
  "utf8",
);
const installerInclude = await readFile(
  new URL("../build/installer.nsh", import.meta.url),
  "utf8",
);
const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

test("NSIS payload is compressed with BCJ2, not the ARM64 filter", () => {
  // 7-Zip 24.09 auto-selects its ARM64 branch filter for arm64 binaries. The
  // installer extracts that payload with nsis7z.dll (7-Zip 19.00), which has no
  // ARM64 filter, so every ARM64-filtered entry is silently dropped — Nib.exe
  // and all its DLLs. BCJ2 decodes on both.
  assert.match(releaseScript, /ELECTRON_BUILDER_7Z_FILTER\s*=\s*"BCJ2"/);
  assert.match(releaseScript, /forceBcj2Filter\(\)/);
});

test("the installer include is wired into the NSIS build", () => {
  assert.equal(packageJson.build.nsis.include, "installer.nsh");
});

test("the installer refuses to finish when Nib.exe is missing", () => {
  assert.match(installerInclude, /!macro customInstall/);
  assert.match(
    installerInclude,
    /\$\{ifNot\} \$\{FileExists\} "\$INSTDIR\\\$\{APP_EXECUTABLE_FILENAME\}"/,
  );
  // Shortcuts must not survive a failed extraction.
  assert.match(installerInclude, /Delete "\$newDesktopLink"/);
  assert.match(installerInclude, /Delete "\$newStartMenuLink"/);
  // A silent run is the in-app updater and must fail loudly instead of hanging.
  assert.match(installerInclude, /SetErrorLevel 2/);
});

test("the Arm installer refuses to install on a non-Arm64 machine", () => {
  assert.match(installerInclude, /!macro customInit/);
  assert.match(installerInclude, /!ifdef APP_ARM64/);
  assert.match(installerInclude, /\$\{ifNot\} \$\{IsNativeARM64\}/);
});

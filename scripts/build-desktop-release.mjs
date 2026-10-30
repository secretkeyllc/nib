import { spawn } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import process from "node:process";

const forwardedArgs = process.argv.slice(2);

const hostTarget =
  process.platform === "win32"
    ? "win"
    : process.platform === "darwin"
      ? "mac"
      : "linux";
const requestedTarget = ["linux", "mac", "win"].includes(forwardedArgs[0])
  ? forwardedArgs.shift()
  : undefined;
const target = requestedTarget ?? hostTarget;

if (!["linux", "mac", "win"].includes(target)) {
  throw new Error(`Unsupported desktop release target: ${target}`);
}

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function runBuilder(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(pnpmCommand, ["exec", "electron-builder", ...args], {
      // Windows exposes pnpm as a .cmd shim. Launch it through the shell so
      // Node can start the shim consistently on the hosted Windows runner.
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `electron-builder ${target} target failed with ${
            code === null ? `signal ${signal ?? "unknown"}` : `exit code ${code}`
          }`,
        ),
      );
    });
  });
}

/**
 * Stage the host-core sidecar for one Windows architecture.
 *
 * electron-builder copies `extraResources` verbatim, and the packaged sidecar
 * must be the same architecture as the Electron app or the local service
 * refuses to start. The two cross targets live in different directories, so
 * the right binary is copied into the single path package.json names.
 */
async function stageWinSidecar(arch) {
  const source =
    arch === "arm64"
      ? "target/aarch64-pc-windows-gnullvm/release/nib-host-core.exe"
      : "target/x86_64-pc-windows-gnu/release/nib-host-core.exe";
  const staged = `target/${arch}-win-sidecar/nib-host-core.exe`;
  await mkdir(dirname(staged), { recursive: true });
  await copyFile(source, staged);
}

/**
 * Force the x86 BCJ2 filter for the NSIS 7z payload.
 *
 * 7-Zip 24.09 — the `7za` electron-builder bundles — detects ARM64 binaries
 * and applies its `ARM64` branch filter. The installer extracts that payload
 * with `nsis7z.dll`, which is 7-Zip 19.00 and has no ARM64 filter, so every
 * ARM64-filtered entry silently fails to extract: the install reports success,
 * writes the shortcut, and the app is missing its .exe and .dll files. BCJ2 is
 * understood by 19.00, and the payloads round-trip byte-identically.
 */
function forceBcj2Filter() {
  process.env.ELECTRON_BUILDER_7Z_FILTER = "BCJ2";
}

if (target === "win") {
  const archArg = forwardedArgs.find((arg) => arg === "--x64" || arg === "--arm64");
  const arch = archArg === "--arm64" ? "arm64" : "x64";
  await stageWinSidecar(arch);
  forceBcj2Filter();

  await runBuilder([
    "--win",
    "nsis",
    "--publish",
    "never",
    ...forwardedArgs,
    "-c.extraMetadata.piDistribution=installed",
  ]);
  await runBuilder([
    "--win",
    "zip",
    "--publish",
    "never",
    ...forwardedArgs,
    "-c.extraMetadata.piDistribution=zip",
  ]);
  await runBuilder([
    "--win",
    "portable",
    "--publish",
    "never",
    ...forwardedArgs,
    "-c.extraMetadata.piDistribution=portable",
  ]);
} else {
  await runBuilder([
    `--${target}`,
    "--publish",
    "never",
    ...forwardedArgs,
  ]);
}

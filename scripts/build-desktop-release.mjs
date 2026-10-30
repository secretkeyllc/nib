import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
// `pnpm run dist:win -- --arm64` forwards the standalone `--` separator too, so
// argv is ["--", "--arm64"]. Left in place it reaches electron-builder as a
// positional argument, which makes it ignore the architecture flag and silently
// build x64 for both lanes.
const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== "--");

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
 *
 * Refuse a sidecar that imports a DLL Windows does not ship: it installs fine
 * and then dies on first launch (0.22.2 shipped an arm64 build linked against
 * libunwind.dll). `pnpm run dist:win` builds it through build-win-sidecar.mjs
 * and checks it there too; this covers a bare `electron-builder --win` run.
 */
async function stageWinSidecar(arch) {
  // Build it here rather than relying on a separate chained script: pnpm
  // appends `--arm64` to the end of `dist:win`, so a standalone
  // `build-win-sidecar.mjs` invocation never sees the flag and silently builds
  // x64 for both lanes. That script also stages the binary where
  // `extraResources` expects it, so there is nothing to copy afterwards.
  const build = spawnSync(
    process.execPath,
    [join(repoRoot, "scripts", "build-win-sidecar.mjs"), `--${arch}`],
    { cwd: repoRoot, stdio: "inherit" },
  );
  if (build.status !== 0) {
    throw new Error(`${arch} sidecar build failed`);
  }

  // pnpm runs this module with apps/desktop as the working directory, so every
  // path handed to a child or the fs API must be absolute.
  const staged = join(repoRoot, "target", `${arch}-win-sidecar`, "nib-host-core.exe");
  const check = spawnSync(
    process.execPath,
    [join(repoRoot, "scripts", "check-windows-host-imports.mjs"), staged],
    { cwd: repoRoot, stdio: "inherit" },
  );
  if (check.status !== 0) {
    throw new Error(
      `${arch} sidecar is not self-contained; refusing to package it`,
    );
  }
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

  // Pass the architecture explicitly and drop the caller's copy. Forwarding it
  // verbatim made electron-builder fall back to its default (x64) on the arm64
  // lane, so that release channel shipped x64 installers.
  const builderArgs = [
    `--${arch}`,
    ...forwardedArgs.filter((arg) => arg !== "--x64" && arg !== "--arm64"),
  ];

  await stageWinSidecar(arch);
  forceBcj2Filter();

  for (const [targetName, distribution] of [
    ["nsis", "installed"],
    ["zip", "zip"],
    ["portable", "portable"],
  ]) {
    await runBuilder([
      "--win",
      targetName,
      "--publish",
      "never",
      ...builderArgs,
      `-c.extraMetadata.piDistribution=${distribution}`,
    ]);
  }
} else {
  // `target/release/nib-host-core` holds whatever the host toolchain built, and
  // the mac/linux package configs copy it verbatim. Packaging a macOS app on a
  // Linux box therefore embeds an ELF sidecar: the app opens and the local
  // service never starts. Check the bundle after packaging and delete it rather
  // than shipping a package that cannot work.
  const archArg = forwardedArgs.find((arg) => arg === "--arm64" || arg === "--x64");
  const arch = archArg === "--arm64" ? "arm64" : "x64";

  await runBuilder([
    `--${target}`,
    "--publish",
    "never",
    ...forwardedArgs,
  ]);

  // electron-builder names the unpacked dir `mac-arm64` / `mac-x64` for macOS
  // but `linux-unpacked` for x64 Linux (no arch suffix) and `linux-arm64-unpacked`
  // for arm64.
  const bundleDir =
    target === "mac"
      ? join(repoRoot, "apps/desktop/release", `mac-${arch}`, "Nib.app")
      : join(
          repoRoot,
          "apps/desktop/release",
          arch === "x64" ? "linux-unpacked" : `linux-${arch}-unpacked`,
        );
  const platformName = target === "mac" ? "macos" : "linux";
  const check = spawnSync(
    process.execPath,
    [
      join(repoRoot, "scripts", "check-bundled-host.mjs"),
      bundleDir,
      "--platform",
      platformName,
      "--arch",
      arch,
    ],
    { cwd: repoRoot, stdio: "inherit" },
  );
  if (check.status !== 0) {
    throw new Error(
      `the ${platformName} package carries the wrong nib-host-core; refusing to ship it`,
    );
  }
}

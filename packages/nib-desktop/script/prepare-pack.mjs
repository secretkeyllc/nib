import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Packaging pre-flight (wired as the "predist:win" npm lifecycle hook, so
 * `npm run dist:win` always stages resources before electron-builder runs).
 *
 * Stages into packages/nib-desktop/resources/, which electron-builder ships
 * as extraResources (see build/electron-builder.json):
 *
 *   resources/cli/   <- packages/cli/dist/**  + packages/cli/package.json
 *                       + build/nib.cmd
 *   resources/bin/   <- created if missing (fetch-engine.mjs drops
 *                       opencode.exe here)
 *
 * The CLI is plain ESM with zero runtime dependencies, so copying dist is
 * enough. packages/cli/package.json is copied alongside because it carries
 * `"type": "module"` — without it the runtime cannot classify index.js when
 * nib.cmd runs it through Electron's Node mode.
 *
 * Not copied into the installer: anything under node_modules.
 */

const here = path.dirname(fileURLToPath(import.meta.url)); // packages/nib-desktop/script
const desktopRoot = path.resolve(here, ".."); // packages/nib-desktop
const repoRoot = path.resolve(desktopRoot, "..", ".."); // repo root (holds packages/cli)

const cliRoot = path.join(repoRoot, "packages", "cli");
const cliDist = path.join(cliRoot, "dist");
const resourcesDir = path.join(desktopRoot, "resources");
const resourcesCli = path.join(resourcesDir, "cli");
const resourcesBin = path.join(resourcesDir, "bin");

function main() {
  if (!existsSync(path.join(cliDist, "index.js"))) {
    console.error(
      "prepare-pack: packages/cli/dist/index.js is missing. Build the CLI first:\n" +
        "  npm run build -w @sknib/cli",
    );
    process.exit(1);
  }

  // 1) bundled CLI -> resources/cli
  rmSync(resourcesCli, { recursive: true, force: true });
  cpSync(cliDist, resourcesCli, { recursive: true });
  cpSync(path.join(cliRoot, "package.json"), path.join(resourcesCli, "package.json"));

  // 2) launcher -> resources/cli/nib.cmd (customInstall copies it to bin\)
  cpSync(path.join(desktopRoot, "build", "nib.cmd"), path.join(resourcesCli, "nib.cmd"));

  // 3) resources/bin must exist so extraResources has a source (and so the
  //    directory stays in git via .gitkeep).
  mkdirSync(resourcesBin, { recursive: true });
  if (readdirSync(resourcesBin).length === 0) {
    writeFileSync(path.join(resourcesBin, ".gitkeep"), "");
  }

  const staged = readdirSync(resourcesCli).join(", ");
  console.log(`prepare-pack: staged resources/cli/ (${staged})`);
  const engine = path.join(resourcesBin, "opencode.exe");
  if (!existsSync(engine)) {
    console.warn(
      "prepare-pack: resources/bin/opencode.exe is missing. The installer will not " +
        "bundle the engine. Fetch it with:\n" +
        "  npm run fetch-engine -w @sknib/nib-desktop\n" +
        "Continuing without it — the app falls back to an engine on PATH.",
    );
  }
}

main();

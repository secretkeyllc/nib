import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Fetch the latest upstream OpenCode engine for Windows x64 from GitHub
 * Releases and drop opencode.exe into resources/bin, where the desktop app
 * picks it up at runtime (engine/resolve.ts: bundled beats PATH) and
 * electron-builder ships it as extraResources.
 *
 * Rules for this script:
 *   - best effort only: on any failure it explains what to do by hand and
 *     exits 0, so packaging pipelines are never blocked by it;
 *   - no new dependencies: uses the global fetch plus the platform's own
 *     extraction tooling (tar on every platform — Windows ships bsdtar,
 *     which reads zip — with Expand-Archive as the Windows fallback).
 */

const here = path.dirname(fileURLToPath(import.meta.url)); // packages/nib-desktop/script
const desktopRoot = path.resolve(here, "..");
const resourcesBin = path.join(desktopRoot, "resources", "bin");
const target = path.join(resourcesBin, "opencode.exe");

const RELEASES_LATEST = "https://github.com/anomalyco/opencode/releases";
const RELEASES_LATEST_API = "https://api.github.com/repos/anomalyco/opencode/releases/latest";

/** Matches e.g. opencode-windows-x64.zip */
function isWindowsX64Asset(name) {
  const lower = name.toLowerCase();
  return lower.includes("windows") && (lower.includes("x64") || lower.includes("amd64"));
}

async function pickAsset() {
  const response = await fetch(RELEASES_LATEST_API, {
    headers: { "User-Agent": "nib-desktop-fetch-engine", Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status} for ${RELEASES_LATEST_API}`);
  }
  const release = await response.json();
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const zips = assets.filter((a) => isWindowsX64Asset(a.name) && a.name.endsWith(".zip"));
  // Prefer the plain windows-x64 build over a "-baseline" one (baseline
  // targets older CPUs). Do not rely on GitHub's asset order — on v1.19.4
  // the baseline zip is listed before the plain zip.
  const asset = zips.find((a) => !a.name.toLowerCase().includes("baseline")) ?? zips[0];
  if (!asset) {
    throw new Error(
      `no windows-x64 zip asset in release "${release.tag_name ?? "latest"}" ` +
        `(assets: ${assets.map((a) => a.name).join(", ") || "none"})`,
    );
  }
  return { tag: release.tag_name ?? "unknown", url: asset.browser_download_url, name: asset.name };
}

async function downloadTo(url, file) {
  const response = await fetch(url, { headers: { "User-Agent": "nib-desktop-fetch-engine" } });
  if (!response.ok) {
    throw new Error(`download failed: ${response.status} for ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(file, buffer);
  return buffer.length;
}

/** Run a command, returning stdout; throws with captured stderr on failure. */
function run(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    const stderr = typeof error.stderr === "string" ? error.stderr : "";
    throw new Error(`${command} ${args.join(" ")} failed: ${stderr.trim() || error.message}`);
  }
}

/** Extract `archive` into `dir` with the platform's own tools. */
async function extract(archive, dir) {
  const attempts = [];
  try {
    await run("tar", ["-xf", archive, "-C", dir]);
    return;
  } catch (error) {
    attempts.push(error.message);
  }
  if (process.platform === "win32") {
    const ps =
      `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${dir}' -Force`;
    try {
      await run("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps]);
      return;
    } catch (error) {
      attempts.push(error.message);
    }
  } else {
    try {
      await run("unzip", ["-o", archive, "-d", dir]);
      return;
    } catch (error) {
      attempts.push(error.message);
    }
  }
  throw new Error(`no working extractor:\n  ${attempts.join("\n  ")}`);
}

/** Depth-first search for opencode.exe under `dir`. */
function findEngine(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const hit = findEngine(full);
      if (hit) return hit;
    } else if (entry.name.toLowerCase() === "opencode.exe") {
      return full;
    }
  }
  return null;
}

async function main() {
  console.log(`fetch-engine: resolving latest ${RELEASES_LATEST} release`);
  const asset = await pickAsset();
  console.log(`fetch-engine: ${asset.tag} -> ${asset.name}`);

  const workDir = mkdtempSync(path.join(tmpdir(), "nib-opencode-"));
  try {
    const archive = path.join(workDir, asset.name);
    const bytes = await downloadTo(asset.url, archive);
    console.log(`fetch-engine: downloaded ${asset.name} (${(bytes / 1024 / 1024).toFixed(1)} MiB)`);

    const extractDir = path.join(workDir, "extract");
    mkdirSync(extractDir, { recursive: true });
    await extract(archive, extractDir);

    const engine = findEngine(extractDir);
    if (!engine) {
      throw new Error("archive does not contain opencode.exe");
    }
    mkdirSync(resourcesBin, { recursive: true });
    copyFileSync(engine, target);
    if (process.platform !== "win32") chmodSync(target, 0o755);
    console.log(`fetch-engine: wrote ${path.relative(desktopRoot, target)}`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.warn(`fetch-engine: not fetched — ${error.message}`);
  console.warn(
    "fetch-engine: this is non-fatal; the app will use an engine found on PATH.\n" +
      "  To bundle the engine by hand, download the windows-x64 release asset from\n" +
      `  ${RELEASES_LATEST} and place opencode.exe at\n` +
      `  ${target}`,
  );
  process.exit(0);
});

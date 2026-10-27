import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Build the three Electron targets with esbuild — no bundler plugins, no
 * workspace toolchain. The renderer's CSS arrives through `import "./theme.css"`
 * and lands next to the JS bundle.
 */

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = (...parts) => join(root, "out", ...parts);

await rm(out(), { recursive: true, force: true });
await mkdir(out(), { recursive: true });

const common = { bundle: true, sourcemap: false, logLevel: "warning" };

await build({
  ...common,
  entryPoints: [join(root, "src/main/index.ts")],
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["electron", "electron-updater", "@lydell/node-pty"],
  outfile: out("main", "index.js"),
});

await build({
  ...common,
  entryPoints: [join(root, "src/preload/index.ts")],
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["electron"],
  outfile: out("preload", "index.cjs"),
});

await build({
  ...common,
  entryPoints: [join(root, "src/renderer/main.ts")],
  format: "iife",
  target: "chrome120",
  outfile: out("renderer", "main.js"),
});

await cp(join(root, "src/renderer/index.html"), out("renderer", "index.html"));

console.log("nib-desktop: built out/main, out/preload, out/renderer");

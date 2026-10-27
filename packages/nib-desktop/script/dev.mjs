import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Dev launcher: build once, then run Electron with the local mock gateway
 * preselected so `npm run dev` in one shell plus `npm run dev:mock` at the
 * repo root is the whole loop.
 */

const root = dirname(dirname(fileURLToPath(import.meta.url)));

await import("./build.mjs");

// Resolve the Electron binary through the electron package itself. npm hoists
// electron to the repo root, so packages/nib-desktop/node_modules/.bin has no
// electron shim, and under plain Node the package's entry point exports the
// binary path as a string (e.g. node_modules/electron/dist/electron.exe).
const require = createRequire(join(root, "package.json"));
const electron = require("electron");

const env = {
  ...process.env,
  // The dev loop talks to the local mock unless the caller chose an API URL.
  ...(process.env.NIB_API_URL ? {} : { NIB_API_URL: "http://localhost:8787" }),
  NIB_DISABLE_UPDATES: "1",
};

// `electron` is a plain executable path, so no .cmd shim or shell is needed on
// any platform; the app path rides as an array element.
const child = spawn(electron, [root], { stdio: "inherit", env });
child.on("error", (error) => {
  console.error("dev: failed to start Electron:", error.message);
  process.exit(1);
});
child.on("close", (code) => process.exit(code ?? 0));

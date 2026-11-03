import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Route the bare `electron` specifier to the inert workspace stub. */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "electron") {
    return {
      url: pathToFileURL(join(here, "workspace-electron-stub.mjs")).href,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}

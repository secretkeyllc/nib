import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * The engine's default configuration. Written to the app data directory on
 * first launch and handed to the engine through the OPENCODE_CONFIG
 * environment variable (an internal detail of the engine, not user-facing).
 *
 * The file never contains credentials: the gateway key is referenced through
 * the {env:...} interpolation the engine supports and injected into the
 * engine's environment at spawn time, after sign-in.
 */

export const NIB_CONFIG_FILENAME = "nib.json";
export const GATEWAY_KEY_ENV = "NIB_GATEWAY_KEY";
export const DEFAULT_MODEL = "nib/nib-efficient";

export interface NibEngineConfig {
  provider: {
    nib: {
      npm: "@ai-sdk/openai-compatible";
      name: "Nib";
      options: {
        baseURL: string;
        apiKey: string;
      };
    };
  };
  model: string;
}

export function buildNibConfig(apiUrl: string): NibEngineConfig {
  return {
    provider: {
      nib: {
        npm: "@ai-sdk/openai-compatible",
        name: "Nib",
        options: {
          baseURL: `${stripTrailingSlash(apiUrl)}/v1`,
          apiKey: `{env:${GATEWAY_KEY_ENV}}`,
        },
      },
    },
    model: DEFAULT_MODEL,
  };
}

/** Write (or refresh) the engine config and return the path handed to the engine. */
export async function writeNibConfig(dataDir: string, apiUrl: string): Promise<string> {
  const path = join(dataDir, NIB_CONFIG_FILENAME);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, JSON.stringify(buildNibConfig(apiUrl), null, 2) + "\n", "utf8");
  return path;
}

export async function readNibConfig(dataDir: string): Promise<NibEngineConfig | null> {
  try {
    const raw = await readFile(join(dataDir, NIB_CONFIG_FILENAME), "utf8");
    return JSON.parse(raw) as NibEngineConfig;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Environment handed to the engine process: the config location plus the
 * gateway key resolved at runtime. Everything else inherits.
 */
export function engineEnv(configPath: string, token: string, base: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...base,
    OPENCODE_CONFIG: configPath,
    [GATEWAY_KEY_ENV]: token,
  };
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

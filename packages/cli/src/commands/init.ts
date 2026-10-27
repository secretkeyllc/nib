import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { ApiClient } from "../lib/api.js";
import { resolveSession } from "../lib/config.js";
import { style, out, err, glyph } from "../lib/ui.js";
import { NibError, type ModelList } from "../lib/types.js";

/**
 * Nib is a distribution layer, not a fork. `nib init` writes an OpenCode
 * provider block that points the upstream CLI at the Nib gateway, so upstream
 * upgrades keep working without a merge.
 */

const PROVIDER_ID = "nib";

export interface InitOptions {
  /** Model id to set as the default. Defaults to the first efficient model. */
  model?: string;
  /** Write to the project-local config instead of the global one. */
  project?: boolean;
  /** Do not ask; overwrite an existing Nib provider block. */
  force?: boolean;
}

export function globalConfigPath(): string {
  const base = process.env.XDG_CONFIG_HOME?.trim() || join(homedir(), ".config");
  return join(base, "opencode", "opencode.json");
}

export function projectConfigPath(cwd = process.cwd()): string {
  return join(cwd, "opencode.json");
}

export interface ProviderBlock {
  npm: string;
  name: string;
  options: {
    baseURL: string;
    apiKey: string;
  };
  models: Record<string, { name: string }>;
}

/**
 * Build the OpenCode provider block for a given gateway and model list.
 *
 * The API key is written as an environment reference, never as the raw token,
 * so a committed project config cannot leak credentials.
 */
export function buildProviderBlock(apiUrl: string, models: ModelList): ProviderBlock {
  const entries: Record<string, { name: string }> = {};
  for (const model of models.data) {
    entries[model.id] = { name: model.id };
  }
  return {
    npm: "@ai-sdk/openai-compatible",
    name: "Nib",
    options: {
      baseURL: `${apiUrl}/v1`,
      apiKey: "{env:NIB_API_KEY}",
    },
    models: entries,
  };
}

export interface MergedConfig {
  [key: string]: unknown;
}

/** Merge a provider block into an existing OpenCode config without dropping keys. */
export function mergeProviderConfig(existing: MergedConfig, block: ProviderBlock, defaultModel?: string): MergedConfig {
  const provider = (existing.provider && typeof existing.provider === "object" ? existing.provider : {}) as Record<string, unknown>;
  const merged: MergedConfig = {
    ...existing,
    $schema: existing.$schema ?? "https://opencode.ai/config.json",
    provider: { ...provider, [PROVIDER_ID]: block },
  };
  if (defaultModel) merged.model = `${PROVIDER_ID}/${defaultModel}`;
  return merged;
}

export async function initCommand(options: InitOptions = {}): Promise<void> {
  const session = await resolveSession();
  const client = new ApiClient({ apiUrl: session.apiUrl, token: session.token });

  let models: ModelList;
  try {
    models = await client.listModels();
  } catch (error) {
    if (error instanceof NibError) throw error;
    throw new NibError(`could not fetch models: ${String(error)}`, 2);
  }
  if (models.data.length === 0) {
    throw new NibError("this plan has no routable models yet", 4, "Check your subscription at https://sknib.com/pricing.");
  }

  const chosen =
    options.model ??
    models.data.find((model) => model.tier === "efficient")?.id ??
    models.data[0]?.id;
  if (!chosen) throw new NibError("could not choose a default model", 2);
  if (!models.data.some((model) => model.id === chosen)) {
    throw new NibError(`unknown model: ${chosen}`, 2, `Run \`nib models\` to list ${models.data.length} available models.`);
  }

  const path = options.project ? projectConfigPath() : globalConfigPath();
  const existing = await readJsonIfPresent(path);

  if (existing?.provider && typeof existing.provider === "object" && PROVIDER_ID in (existing.provider as object) && !options.force) {
    throw new NibError(
      `a Nib provider block already exists in ${path}`,
      2,
      "Pass --force to replace it, or edit the file by hand.",
    );
  }

  const block = buildProviderBlock(session.apiUrl, models);
  const merged = mergeProviderConfig(existing ?? {}, block, chosen);

  await mkdir(join(path, ".."), { recursive: true }).catch(() => undefined);
  await writeFile(path, JSON.stringify(merged, null, 2) + "\n", { mode: 0o644 });

  out();
  out(`  ${style.green(glyph.ok)} Wrote ${style.bold(path)}`);
  out(`  ${style.dim("Provider")} nib ${style.dim("→")} ${session.apiUrl}/v1`);
  out(`  ${style.dim("Models")}   ${models.data.length}`);
  out(`  ${style.dim("Default")}  ${chosen}`);
  out();
  if (session.source === "config") {
    out(`  ${style.yellow(glyph.warn)} The provider block references ${style.bold("{env:NIB_API_KEY}")}.`);
    out(`  Export your key before launching: ${style.bold("export NIB_API_KEY=$(nib key print)")}`);
    out();
  }
  out(`  Next: ${style.bold("nib run")}`);
  out();
}

async function readJsonIfPresent(path: string): Promise<MergedConfig | null> {
  try {
    await access(path, constants.R_OK);
  } catch {
    return null;
  }
  const raw = await readFile(path, "utf8");
  if (!raw.trim()) return null;
  try {
    return JSON.parse(stripJsonComments(raw)) as MergedConfig;
  } catch {
    throw new NibError(`existing config is not valid JSON: ${path}`, 2, "Fix or remove the file, then retry.");
  }
}

/** OpenCode accepts JSONC; strip // and /* *\/ comments before JSON.parse. */
export function stripJsonComments(input: string): string {
  let result = "";
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        result += char;
      }
      continue;
    }
    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }
    if (inString) {
      result += char;
      if (char === "\\") {
        result += next ?? "";
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }
    if (char === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }
    result += char;
  }
  return result;
}

export interface RunOptions {
  /** Extra arguments forwarded to the upstream CLI. */
  passthrough: string[];
  /** Print the command instead of executing it. */
  dryRun?: boolean;
}

/**
 * Launch the upstream OpenCode binary with Nib's credentials in the
 * environment. We deliberately do not vendor the engine: `nib run` is a thin
 * wrapper so users can upgrade `opencode-ai` independently.
 */
export async function runCommand(options: RunOptions): Promise<void> {
  const session = await resolveSession();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NIB_API_KEY: process.env.NIB_API_KEY ?? session.token,
  };

  const binary = process.env.NIB_OPENCODE_BIN?.trim() || "opencode";

  if (options.dryRun) {
    out(`${binary} ${options.passthrough.join(" ")}`.trim());
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(binary, options.passthrough, { stdio: "inherit", env });
    child.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new NibError(
            `could not find the ${binary} binary`,
            127,
            "Install it with `npm install -g opencode-ai`, or set NIB_OPENCODE_BIN to its path.",
          ),
        );
        return;
      }
      reject(error);
    });
    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      process.exitCode = code ?? 0;
      resolve();
    });
  });
}

export async function keyPrintCommand(): Promise<void> {
  const session = await resolveSession();
  out(session.token);
}

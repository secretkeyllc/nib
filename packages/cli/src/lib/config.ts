import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, rm, writeFile, chmod } from "node:fs/promises";

/** Default gateway. Overridable with NIB_API_URL for staging and tests. */
export const DEFAULT_API_URL = "https://api.sknib.com";

/** Public site, used in messages the user may want to copy. */
export const SITE_URL = "https://sknib.com";

export interface NibConfig {
  /** Gateway base URL, without a trailing slash. */
  apiUrl: string;
  /** Opaque bearer token issued by the device flow. */
  token: string;
  /** ISO 8601 instant the token was obtained. Informational only. */
  tokenIssuedAt?: string;
  /** Email shown at approval time, for `nib whoami` without a round trip. */
  email?: string;
  /** Plan name cached at login, so `status` works offline. */
  planName?: string;
}

function configDir(): string {
  const base = process.env.XDG_CONFIG_HOME?.trim() || join(homedir(), ".config");
  return join(base, "nib");
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

export function normalizeApiUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_API_URL;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`invalid API URL: ${raw}`);
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new Error("API URL must use https (plain http is allowed only for localhost)");
  }
  return trimmed;
}

export async function readConfig(): Promise<NibConfig | null> {
  let raw: string;
  try {
    raw = await readFile(configPath(), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  const parsed = JSON.parse(raw) as Partial<NibConfig>;
  if (!parsed.apiUrl || !parsed.token) return null;
  return {
    apiUrl: normalizeApiUrl(parsed.apiUrl),
    token: parsed.token,
    ...(parsed.tokenIssuedAt ? { tokenIssuedAt: parsed.tokenIssuedAt } : {}),
    ...(parsed.email ? { email: parsed.email } : {}),
    ...(parsed.planName ? { planName: parsed.planName } : {}),
  };
}

export async function writeConfig(config: NibConfig): Promise<void> {
  await mkdir(configDir(), { recursive: true, mode: 0o700 });
  const path = configPath();
  await writeFile(path, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
  // writeFile's mode is masked by umask on some platforms; enforce it explicitly.
  await chmod(path, 0o600);
}

export async function clearConfig(): Promise<boolean> {
  try {
    await rm(configPath());
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}

/**
 * Resolve the session without touching disk when an explicit key is supplied.
 * Precedence: NIB_API_KEY > stored device token.
 */
export async function resolveSession(): Promise<{ apiUrl: string; token: string; source: "env" | "config" }> {
  const envKey = process.env.NIB_API_KEY?.trim();
  const apiUrl = normalizeApiUrl(process.env.NIB_API_URL?.trim() || DEFAULT_API_URL);
  if (envKey) return { apiUrl, token: envKey, source: "env" };

  const config = await readConfig();
  if (!config) {
    throw new Error("not signed in. Run `nib login` first.");
  }
  return { apiUrl: process.env.NIB_API_URL ? apiUrl : config.apiUrl, token: config.token, source: "config" };
}

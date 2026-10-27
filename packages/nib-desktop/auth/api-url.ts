/** Gateway base URL handling shared by the desktop shell. */

export const DEFAULT_API_URL = "https://api.sknib.com";

/** Resolve the gateway URL for this run: NIB_API_URL, else production. */
export function resolveApiUrl(env: NodeJS.ProcessEnv = process.env): string {
  return normalizeApiUrl(env.NIB_API_URL?.trim() || DEFAULT_API_URL);
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

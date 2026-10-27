import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { ApiClient } from "../lib/api.js";
import { DEFAULT_API_URL, normalizeApiUrl, writeConfig, readConfig, clearConfig } from "../lib/config.js";
import { style, out, err, glyph } from "../lib/ui.js";
import { NibError, type DeviceAuthorization, type DeviceToken, type DeviceTokenError } from "../lib/types.js";

export interface LoginOptions {
  apiUrl?: string;
  /** Skip the browser prompt and only print the URL/code. */
  noOpen?: boolean;
  /** Milliseconds to wait for approval before giving up. */
  timeoutMs?: number;
}

/**
 * RFC 8628 device authorisation.
 *
 * 1. Ask the gateway for a device code and a short user code.
 * 2. Print the verification URL and code, and optionally open a browser.
 * 3. Poll the token endpoint at the advertised interval until approved.
 * 4. Persist the bearer token with 0600 permissions.
 */
export async function loginCommand(options: LoginOptions = {}): Promise<void> {
  const apiUrl = normalizeApiUrl(options.apiUrl?.trim() || process.env.NIB_API_URL?.trim() || DEFAULT_API_URL);
  const client = new ApiClient({ apiUrl, timeoutMs: 20_000 });

  let authorization: DeviceAuthorization;
  try {
    authorization = await client.request<DeviceAuthorization>("/api/v1/cli/device/authorize", {
      method: "POST",
      anonymous: true,
      body: { client: "nib-cli", scope: "gateway entitlement" },
    });
  } catch (error) {
    if (error instanceof NibError) throw error;
    throw new NibError(`could not start device login: ${String(error)}`, 2);
  }

  out();
  out(`  ${style.bold("Sign in to Nib")}`);
  out();
  out(`  ${style.dim("1.")} Open ${style.emberAccent(authorization.verification_uri)}`);
  out(`  ${style.dim("2.")} Enter code ${style.bold(style.emberAccent(authorization.user_code))}`);
  out();
  out(`  ${style.dim(`Waiting for approval ${glyph.dot}${glyph.dot}${glyph.dot}`)}`);

  if (!options.noOpen) {
    openBrowser(authorization.verification_uri_complete ?? authorization.verification_uri);
  }

  const intervalMs = Math.max(1, authorization.interval) * 1000;
  const deadline = Date.now() + (options.timeoutMs ?? authorization.expires_in * 1000);
  let interval = intervalMs;

  while (Date.now() < deadline) {
    await sleep(interval);
    try {
      const token = await client.request<DeviceToken>("/api/v1/cli/device/token", {
        method: "POST",
        anonymous: true,
        body: {
          device_code: authorization.device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        },
      });
      const existing = await readConfig();
      await writeConfig({
        apiUrl,
        token: token.access_token,
        tokenIssuedAt: new Date().toISOString(),
        ...(existing?.email ? { email: existing.email } : {}),
      });
      out();
      out(`  ${style.green(glyph.ok)} Signed in. Token stored in ${style.dim("~/.config/nib/config.json")} (0600).`);
      out(`  Run ${style.bold("nib status")} to see your plan and remaining credits.`);
      out();
      return;
    } catch (error) {
      if (!(error instanceof NibError)) throw error;
      const code = asDeviceError(error);
      if (code === "authorization_pending") continue;
      if (code === "slow_down") {
        interval += 5_000;
        continue;
      }
      if (code === "access_denied") {
        throw new NibError("authorisation was denied in the browser", 3);
      }
      if (code === "expired_token") {
        throw new NibError("the device code expired before approval. Run `nib login` again.", 3);
      }
      throw error;
    }
  }

  throw new NibError("timed out waiting for approval. Run `nib login` again.", 3);
}

function asDeviceError(error: NibError): string | undefined {
  // The API client wraps non-2xx into a NibError message. The device flow is
  // distinguished by its machine-readable code, which the client preserves in
  // the message for these two statuses.
  const message = error.message;
  for (const code of ["authorization_pending", "slow_down", "access_denied", "expired_token"]) {
    if (message.includes(code)) return code;
  }
  if (error.exitCode === 3 && message.includes("not authorised")) return "authorization_pending";
  return undefined;
}

export async function logoutCommand(): Promise<void> {
  const removed = await clearConfig();
  if (removed) {
    out(`${style.green(glyph.ok)} Signed out. Local credentials removed.`);
  } else {
    out(`${style.dim("No stored credentials found.")}`);
  }
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  import("node:child_process")
    .then(({ spawn }) => {
      const child = spawn(command, args, { stdio: "ignore", detached: true });
      child.on("error", () => {
        err(style.dim(`Could not open a browser. Visit ${url} manually.`));
      });
      child.unref();
    })
    .catch(() => {
      err(style.dim(`Could not open a browser. Visit ${url} manually.`));
    });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Prompt helper used by `nib init` when no flag is supplied. */
export async function confirm(question: string, defaultValue = true): Promise<boolean> {
  if (!stdin.isTTY) return defaultValue;
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const suffix = defaultValue ? " [Y/n] " : " [y/N] ";
    const answer = (await rl.question(question + suffix)).trim().toLowerCase();
    if (!answer) return defaultValue;
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

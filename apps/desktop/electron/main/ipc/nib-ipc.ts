/**
 * Nib plan and credit balance for the signed-in account.
 *
 * Two credentials exist in this product and they are not interchangeable:
 *
 *   sk-nib-…   API key held by the provider row; the inference gateway takes
 *              it, the control plane does not.
 *   JWT        issued by the device sign-in; the control plane takes it, the
 *              gateway does not.
 *
 * The entitlement endpoint is a control-plane route, so the provider key
 * cannot read it. The plugin writes the JWT to `session.json` in its own data
 * directory after sign-in; this module reads that file and calls the control
 * plane directly. The renderer receives display fields only.
 */
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { shell } from "electron";
import type { NibAnnouncement, NibEntitlement } from "@pi-desktop/shared";
import type { Logger } from "../logger";
import type { IpcRegistrar } from "./types";

const ENTITLEMENT_URL = "https://sknib.com/api/v1/product/entitlement";
const ANNOUNCEMENTS_URL = "https://sknib.com/api/v1/announcements";
const CONSOLE_URL = "https://sknib.com/app";
const TIMEOUT_MS = 12_000;

/**
 * The provider row the `nib.provider` plugin declares. Host-core composes it as
 * `plugin:<plugin id>:<declared provider id>`, so it is a fixed string rather
 * than something to discover at runtime.
 */
export const NIB_PROVIDER_ROW_ID = "plugin:nib.provider:nib";

type Deps = {
  registrar: IpcRegistrar;
  /** Root of this installation's data directory (holds plugins/data/...). */
  dataDir: () => string;
  logger: Logger;
  /** Entitlement channel name (kept as a parameter; see register.ts). */
  channel: string;
  /** Open the web console. */
  consoleChannel: string;
  /** Sign out of the account on this machine. */
  signOutChannel: string;
  /** Admin-written announcements, shown in the notification center. */
  announcementsChannel: string;
  /**
   * Removes the provider row's credential. Signing out has to clear the key
   * the gateway accepted, not just the display data, or the account keeps
   * working after the user asked to leave.
   */
  forgetProviderCredential: (providerId: string) => Promise<void>;
  /** The Nib provider row id, e.g. `plugin:nib.provider:nib`. */
  providerId: string;
};

/** Everything the plugin keeps for the account, cleared on sign-out. */
type PluginSettings = {
  nibAccessToken?: unknown;
  nibApiKey?: unknown;
  [key: string]: unknown;
};

/**
 * The plugin's settings file, as PluginRuntime lays it out:
 * `<dataDir>/plugins/data/<sanitized id>/settings.json`. The plugin stores the
 * control-plane JWT there under `nibAccessToken`; reading the file avoids a
 * round trip through the plugin process just to display a number.
 */
function settingsFile(dataDir: string): string {
  return join(dataDir, "plugins", "data", "nib.provider", "settings.json");
}

async function readSessionToken(dataDir: string): Promise<string | undefined> {
  try {
    const raw = await readFile(settingsFile(dataDir), "utf8");
    const parsed = JSON.parse(raw) as { nibAccessToken?: unknown };
    return typeof parsed.nibAccessToken === "string" && parsed.nibAccessToken
      ? parsed.nibAccessToken
      : undefined;
  } catch {
    return undefined;
  }
}

function num(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function registerNibIpc({
  registrar,
  dataDir,
  logger,
  channel,
  consoleChannel,
  signOutChannel,
  announcementsChannel,
  forgetProviderCredential,
  providerId,
}: Deps): void {
  registrar.handle(channel, async (): Promise<NibEntitlement> => {
    const token = await readSessionToken(dataDir());
    if (!token) return { signedIn: false };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(ENTITLEMENT_URL, {
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (response.status === 401) return { signedIn: false };
      if (!response.ok) {
        logger.app("provider", "warn", "nib entitlement failed", {
          data: { status: response.status },
        });
        return { signedIn: true };
      }
      const body = record(await response.json());
      const plan = record(body.plan ?? record(body.data).plan);
      const usage = record(body.usage ?? record(body.data).usage);
      const account = record(body.account ?? record(body.data).account);
      return {
        signedIn: true,
        planName: typeof plan.name === "string" ? plan.name : undefined,
        accountEmail:
          typeof account.email === "string" && account.email.trim()
            ? account.email.trim()
            : undefined,
        accountName:
          typeof account.display_name === "string" && account.display_name.trim()
            ? account.display_name.trim()
            : undefined,
        creditsUsed: num(usage.credits_used),
        creditsTotal: num(usage.credits_total),
        dailyUsed: num(usage.daily_used),
        dailyLimit: num(usage.daily_limit),
        weeklyUsed: num(usage.weekly_used),
        weeklyLimit: num(usage.weekly_limit),
        topupRemaining: num(usage.topup_credits_remaining),
        resetsAt: typeof usage.resets_at === "string" ? usage.resets_at : undefined,
        concurrency: num(plan.concurrency),
      };
    } catch (error) {
      logger.app("provider", "warn", "nib entitlement threw", {
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      return { signedIn: true };
    } finally {
      clearTimeout(timer);
    }
  });

  registrar.handle(consoleChannel, async () => {
    // The console is a browser surface: opening it externally keeps the app's
    // credential boundary intact and lets the user use their browser session.
    await shell.openExternal(CONSOLE_URL);
    return { ok: true };
  });

  registrar.handle(signOutChannel, async () => {
    // Clear the credential the gateway accepts first. If that fails the caller
    // must know: leaving a working key behind after "sign out" is the one
    // outcome the user would not expect.
    await forgetProviderCredential(providerId);

    const file = settingsFile(dataDir());
    try {
      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw) as PluginSettings;
      delete parsed.nibAccessToken;
      delete parsed.nibApiKey;
      await writeFile(file, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
    } catch (error) {
      // No settings file at all is the already-signed-out case; anything else
      // is worth a line in the log but must not block the sign-out.
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
        logger.app("provider", "warn", "nib sign-out could not clear plugin settings", {
          data: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    }
    return { ok: true };
  });

  registrar.handle(announcementsChannel, async (): Promise<NibAnnouncement[]> => {
    // Announcements are an account feature: the admin console writes them, the
    // control plane scopes them per user, and this is the only place the
    // desktop app learns about maintenance or plan changes. Unauthenticated
    // reads answer an empty list rather than an error — a signed-out app has
    // nothing to show and should not paint a failure.
    const token = await readSessionToken(dataDir());
    if (!token) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(ANNOUNCEMENTS_URL, {
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!response.ok) {
        logger.app("provider", "warn", "nib announcements failed", {
          data: { status: response.status },
        });
        return [];
      }
      const body = await response.json();
      // The control plane wraps payloads in { code, message, data }.
      const container = record(body);
      const rows = Array.isArray(body)
        ? body
        : Array.isArray(container.data)
          ? container.data
          : Array.isArray(container.items)
            ? container.items
            : [];
      return rows.flatMap((row) => {
        const entry = record(row);
        const id = num(entry.id);
        const title = typeof entry.title === "string" ? entry.title.trim() : "";
        if (!title) return [];
        return [{
          id: id === undefined ? title : String(id),
          title,
          content: typeof entry.content === "string" ? entry.content : "",
          createdAt:
            typeof entry.created_at === "string"
              ? entry.created_at
              : typeof entry.starts_at === "string"
                ? entry.starts_at
                : new Date().toISOString(),
          readAt: typeof entry.read_at === "string" ? entry.read_at : null,
        }];
      });
    } catch (error) {
      logger.app("provider", "warn", "nib announcements threw", {
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      return [];
    } finally {
      clearTimeout(timer);
    }
  });
}

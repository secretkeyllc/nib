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

const ENTITLEMENT_URL = "https://nib.am/api/v1/product/entitlement";
const ANNOUNCEMENTS_URL = "https://nib.am/api/v1/announcements";
const CONSOLE_URL = "https://nib.am/app";
/** The billing surfaces the account menu links to. Kept on the same origin
 *  as the console so the browser session (and 2FA) carries over. */
const SUBSCRIPTIONS_URL = "https://nib.am/app/subscriptions";
const BALANCE_URL = "https://nib.am/app/balance";
const TIMEOUT_MS = 12_000;

/** Reading an announcement goes through the same control-plane route. */
function announcementReadUrl(id: string): string {
  return `${ANNOUNCEMENTS_URL}/${encodeURIComponent(id)}/read`;
}

const REFRESH_URL = "https://nib.am/api/v1/auth/refresh";

/** Plugin-settings keys the account lifecycle owns. */
type PluginSettings = {
  nibAccessToken?: unknown;
  nibRefreshToken?: unknown;
  nibApiKey?: unknown;
  [key: string]: unknown;
};

/**
 * Exchange the stored refresh token for a fresh JWT pair.
 *
 * The device login returns a refresh token alongside the access token; before
 * this renewal existed, every 24-hour access-token expiry read as a signed-out
 * account until the user logged in again — with the gateway key still working,
 * so the app showed signed-out and signed-in at the same time. The rotation
 * endpoint returns a new pair; both halves must be persisted or the next
 * renewal replays the spent token.
 */
async function renewSessionToken(
  dataDir: string,
  logger: Logger,
): Promise<boolean> {
  const file = settingsFile(dataDir);
  let refreshToken: string;
  let parsed: PluginSettings;
  try {
    const raw = await readFile(file, "utf8");
    parsed = JSON.parse(raw) as PluginSettings;
    refreshToken =
      typeof parsed.nibRefreshToken === "string" ? parsed.nibRefreshToken : "";
  } catch {
    return false;
  }
  if (!refreshToken) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(REFRESH_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const body = record(await response.json());
    const inner = record(body.data);
    const nextAccess =
      typeof body.access_token === "string"
        ? body.access_token
        : typeof inner.access_token === "string"
          ? inner.access_token
          : "";
    if (!nextAccess) return false;
    const nextRefresh =
      typeof body.refresh_token === "string"
        ? body.refresh_token
        : typeof inner.refresh_token === "string"
          ? inner.refresh_token
          : refreshToken;
    parsed.nibAccessToken = nextAccess;
    // Rotation: the spent token may already be invalid server-side. Keeping
    // the new one is what makes the next renewal a renewal and not a replay.
    if (nextRefresh) parsed.nibRefreshToken = nextRefresh;
    await writeFile(file, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
    return true;
  } catch (error) {
    logger.app("provider", "warn", "nib session renewal failed", {
      data: { error: error instanceof Error ? error.message : String(error) },
    });
    return false;
  } finally {
    clearTimeout(timer);
  }
}

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
  /** Open an allow-listed billing page (plans / balance). */
  urlChannel: string;
  /** Sign out of the account on this machine. */
  signOutChannel: string;
  /** Admin-written announcements, shown in the notification center. */
  announcementsChannel: string;
  /** Marks one announcement read for this account. */
  announcementReadChannel: string;
  /**
   * Removes the provider row's credential. Signing out has to clear the key
   * the gateway accepted, not just the display data, or the account keeps
   * working after the user asked to leave.
   */
  forgetProviderCredential: (providerId: string) => Promise<void>;
  /** The Nib provider row id, e.g. `plugin:nib.provider:nib`. */
  providerId: string;
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

/**
 * Remove the account material the plugin keeps in its own settings file. An
 * explicit sign-out and a detected session expiry must both end here: a JWT or
 * gateway key left behind would let panel reads and the keychain-fallback path
 * keep using a dead account after the user can no longer use it.
 */
async function clearPluginAccountSettings(
  dataDir: string,
  logger: Logger,
  reason: string,
): Promise<void> {
  const file = settingsFile(dataDir);
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as PluginSettings;
    delete parsed.nibAccessToken;
    delete parsed.nibRefreshToken;
    delete parsed.nibApiKey;
    await writeFile(file, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  } catch (error) {
    // No settings file at all is the already-signed-out case; anything else
    // is worth a line in the log but must not block the caller.
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      logger.app("provider", "warn", `nib ${reason} could not clear plugin settings`, {
        data: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/**
 * Shape an entitlement response into the display record. Shared by the
 * original read and the post-renewal retry so both carry the exact same
 * fields — a renewed session that returned fewer fields than the first read
 * would otherwise flip a surface's view of the account.
 */
async function entitlementFrom(response: Response): Promise<NibEntitlement> {
  const body = record(await response.json());
  const plan = record(body.plan ?? record(body.data).plan);
  const usage = record(body.usage ?? record(body.data).usage);
  const account = record(body.account ?? record(body.data).account);
  // One entry per active subscription (paid first, the Extra group flagged):
  // the account menu and the composer meters render the two allowances as
  // separate rows instead of a sum that matches neither.
  const allowancesRaw = Array.isArray(body.allowances)
    ? body.allowances
    : record(body.data).allowances;
  const allowances = Array.isArray(allowancesRaw)
    ? allowancesRaw.flatMap((entry) => {
        const row = record(entry);
        const num = (value: unknown) =>
          typeof value === "number" && Number.isFinite(value) ? value : undefined;
        return [
          {
            groupId: num(row.group_id),
            groupName:
              typeof row.group_name === "string" && row.group_name.trim()
                ? row.group_name
                : undefined,
            isBonus: row.is_bonus === true,
            creditsUsed: num(row.credits_used),
            creditsTotal: num(row.monthly_credits),
            dailyUsed: num(row.daily_used),
            dailyLimit: num(row.daily_limit),
            weeklyUsed: num(row.weekly_used),
            weeklyLimit: num(row.weekly_limit),
            expiresAt:
              typeof row.expires_at === "string" && row.expires_at
                ? row.expires_at
                : undefined,
          },
        ];
      })
    : undefined;
  return {
    allowances,
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
    dailyResetsAt:
      typeof usage.daily_resets_at === "string" ? usage.daily_resets_at : undefined,
    weeklyResetsAt:
      typeof usage.weekly_resets_at === "string" ? usage.weekly_resets_at : undefined,
    monthlyResetsAt:
      typeof usage.monthly_resets_at === "string" ? usage.monthly_resets_at : undefined,
    concurrency: num(plan.concurrency),
  };
}

export function registerNibIpc({
  registrar,
  dataDir,
  logger,
  channel,
  consoleChannel,
  urlChannel,
  signOutChannel,
  announcementsChannel,
  announcementReadChannel,
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
      if (response.status === 401) {
        // Access tokens are short-lived; the refresh token can mint a new pair
        // without the user seeing anything. Renew once and retry the read; a
        // failed renewal (no token stored, or the session revoked server-side)
        // falls through to the retirement path below.
        if (await renewSessionToken(dataDir(), logger)) {
          const retryToken = await readSessionToken(dataDir());
          const retry = retryToken
            ? await fetch(ENTITLEMENT_URL, {
                headers: { accept: "application/json", authorization: `Bearer ${retryToken}` },
                signal: controller.signal,
              })
            : null;
          if (retry && retry.ok) {
            return await entitlementFrom(retry);
          }
        }
        // An expired/revoked session must be indistinguishable from being
        // signed out: retire the stored gateway credential AND the plugin's
        // own copy of the key, so neither the picker nor a request can keep
        // spending the account until the next sign-in. Third-party providers
        // the user added with their own keys are untouched. Fire-and-forget —
        // the entitlement answer must not wait on secret-store I/O.
        void (async () => {
          // A failed revocation must not leave the plugin's own key copy
          // behind: the panel read and the picker's fallback both reach the
          // account through it, so the local cleanup runs regardless and the
          // revocation error is reported as its own line.
          try {
            await forgetProviderCredential(providerId);
          } catch (error) {
            logger.app("provider", "warn", "nib session expiry could not retire the gateway credential", {
              data: { error: error instanceof Error ? error.message : String(error) },
            });
          }
          await clearPluginAccountSettings(dataDir(), logger, "session expiry");
        })().catch((error) => {
          logger.app("provider", "warn", "nib session expiry could not clear the plugin credential", {
            data: { error: error instanceof Error ? error.message : String(error) },
          });
        });
        return { signedIn: false, sessionExpired: true };
      }
      if (!response.ok) {
        logger.app("provider", "warn", "nib entitlement failed", {
          data: { status: response.status },
        });
        return { signedIn: true };
      }
      return await entitlementFrom(response);
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
    // Landing directly on the subscriptions page: that is what "Manage plan"
    // promises, and where a purchase happens.
    await shell.openExternal(SUBSCRIPTIONS_URL);
    return { ok: true };
  });

  registrar.handle(urlChannel, async (rawUrl: unknown) => {
    // Only the billing pages on the console origin may be opened here. An
    // arbitrary-URL channel from the renderer would be an open redirect into
    // the user's default browser.
    const url = typeof rawUrl === "string" ? rawUrl : "";
    if (url !== SUBSCRIPTIONS_URL && url !== BALANCE_URL && url !== CONSOLE_URL) {
      return { ok: false };
    }
    await shell.openExternal(url);
    return { ok: true };
  });

  registrar.handle(signOutChannel, async () => {
    // Clear the credential the gateway accepts first. If that fails the caller
    // must know: leaving a working key behind after "sign out" is the one
    // outcome the user would not expect.
    await forgetProviderCredential(providerId);
    await clearPluginAccountSettings(dataDir(), logger, "sign-out");
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

  registrar.handle(announcementReadChannel, async (_event, id: unknown) => {
    // Marking read matters for the badge: the announcement list already
    // carries `read_at`, so without this call every app start would show the
    // same items as unread. Best-effort by design — a failure must not block
    // the user from reading the notice.
    const announcementId = typeof id === "string" ? id.trim() : "";
    if (!announcementId || !/^\d{1,19}$/.test(announcementId)) return { ok: false };
    const token = await readSessionToken(dataDir());
    if (!token) return { ok: false };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(announcementReadUrl(announcementId), {
        method: "POST",
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!response.ok) {
        logger.app("provider", "warn", "nib announcement read failed", {
          data: { status: response.status },
        });
        return { ok: false };
      }
      return { ok: true };
    } catch (error) {
      logger.app("provider", "warn", "nib announcement read threw", {
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      return { ok: false };
    } finally {
      clearTimeout(timer);
    }
  });
}

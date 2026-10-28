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
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NibEntitlement } from "@pi-desktop/shared";
import type { Logger } from "../logger";
import type { IpcRegistrar } from "./types";

const ENTITLEMENT_URL = "https://sknib.com/api/v1/product/entitlement";
const TIMEOUT_MS = 12_000;

type Deps = {
  registrar: IpcRegistrar;
  /** Root of this installation's data directory (holds plugins/data/...). */
  dataDir: () => string;
  logger: Logger;
  /** Channel name, passed in so this module imports nothing extra from shared. */
  channel: string;
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

export function registerNibIpc({ registrar, dataDir, logger, channel }: Deps): void {
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
      return {
        signedIn: true,
        planName: typeof plan.name === "string" ? plan.name : undefined,
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
}

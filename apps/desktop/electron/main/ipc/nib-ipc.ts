/**
 * Nib plan + credit balance for the signed-in account.
 *
 * The renderer must never see a provider secret, so the read happens here:
 * main resolves the plugin's stored OAuth token and calls the control plane
 * itself. The response is the small, display-only subset the status chip and
 * the usage panel need — no tokens, no raw provider payload.
 */
import type { NibEntitlement } from "@pi-desktop/shared";
import type { VendorOAuth } from "../oauth";
import type { Logger } from "../logger";
import type { IpcRegistrar } from "./types";

export const NIB_PROVIDER_ID = "plugin:nib.provider:nib";
const ENTITLEMENT_URL = "https://sknib.com/api/v1/product/entitlement";
const TIMEOUT_MS = 12_000;

type Deps = {
  registrar: IpcRegistrar;
  vendorOAuth: VendorOAuth;
  logger: Logger;
  /** Channel name, passed in so this module stays free of shared-package imports at call sites. */
  channel: string;
};

function num(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Read a field from the flat payload or its `data` mirror. */
function field(root: Record<string, unknown>, key: string): unknown {
  if (root[key] !== undefined) return root[key];
  const data = root.data;
  if (data && typeof data === "object") return (data as Record<string, unknown>)[key];
  return undefined;
}

export function registerNibIpc({ registrar, vendorOAuth, logger, channel }: Deps): void {
  registrar.handle(channel, async (): Promise<NibEntitlement> => {
    const token = await vendorOAuth.pluginAccessToken(NIB_PROVIDER_ID);
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
        logger.app("provider", "warn", "entitlement request failed", { data: { status: response.status } });
        return { signedIn: true };
      }

      const body = (await response.json()) as Record<string, unknown>;
      const plan = (field(body, "plan") ?? {}) as Record<string, unknown>;
      const usage = (field(body, "usage") ?? {}) as Record<string, unknown>;

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
      logger.app("provider", "warn", "entitlement request threw", {
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      return { signedIn: true };
    } finally {
      clearTimeout(timer);
    }
  });
}

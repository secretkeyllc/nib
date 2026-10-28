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
 * The entitlement endpoint is a control-plane route, so this module cannot
 * read it with the provider key. It delegates to the plugin instead: the
 * plugin keeps the JWT in its own settings and already answers the
 * `nib.entitlement` channel for its usage panel. The renderer receives display
 * fields only; no credential crosses this boundary in either direction.
 */
import type { NibEntitlement } from "@pi-desktop/shared";
import type { Logger } from "../logger";
import type { IpcRegistrar } from "./types";

const NIB_PLUGIN_ID = "nib.provider";
const PANEL_CHANNEL = "nib.entitlement";

type Deps = {
  registrar: IpcRegistrar;
  /** PluginRuntime.invokePanelBridge, bound by the caller. */
  invokePanel: (
    pluginId: string,
    channel: string,
    payload?: Record<string, unknown>,
  ) => Promise<unknown>;
  logger: Logger;
  /** Channel name, passed in so this module imports nothing extra from shared. */
  channel: string;
};

function num(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function registerNibIpc({ registrar, invokePanel, logger, channel }: Deps): void {
  registrar.handle(channel, async (): Promise<NibEntitlement> => {
    let raw: unknown;
    try {
      raw = await invokePanel(NIB_PLUGIN_ID, PANEL_CHANNEL, {});
    } catch (error) {
      // A plugin that is missing, disabled or still loading is a normal state
      // on first run; the chip simply stays hidden.
      logger.app("provider", "warn", "nib entitlement unavailable", {
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      return { signedIn: false };
    }

    const payload = record(raw);
    if (payload.signedIn !== true) return { signedIn: false };

    const plan = record(payload.plan);
    const usage = record(payload.usage);
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
  });
}

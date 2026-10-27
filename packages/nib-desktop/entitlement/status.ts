import type { Entitlement } from "./types.js";

/**
 * Pure status-bar model for the desktop client. Everything here is
 * derived from the entitlement payload so the renderer never does
 * arithmetic over wire data, and unit tests can pin the exact copy.
 */

/** Refresh cadence: every 5 minutes, plus on start, on login, on focus. */
export const REFRESH_INTERVAL_MS = 5 * 60_000;

/** The status bar turns ember at this fraction of the monthly allowance. */
export const WARN_THRESHOLD = 0.8;

export type CreditLevel = "ok" | "warn" | "exhausted";

export interface EntitlementStatus {
  planName: string;
  monthlyCredits: number;
  usedCredits: number;
  remainingCredits: number;
  topupCredits: number;
  /** Fraction of the monthly allowance consumed, 0..1. */
  usedFraction: number;
  level: CreditLevel;
  daily?: { used: number; cap: number };
  weekly?: { used: number; cap: number };
  concurrency: number;
  resetsAtMs: number;
}

export function toStatus(entitlement: Entitlement, nowMs = Date.now()): EntitlementStatus {
  const plan = entitlement.plan;
  const usage = entitlement.usage;
  const monthly = Math.max(0, Math.round(plan.monthly_credits));
  const used = Math.max(0, Math.round(usage.credits_used));
  const remaining = Math.max(0, monthly - used);
  const fraction = monthly > 0 ? Math.min(1, usage.credits_used / plan.monthly_credits) : 1;
  const level: CreditLevel = remaining <= 0 ? "exhausted" : fraction >= WARN_THRESHOLD ? "warn" : "ok";
  return {
    planName: plan.name,
    monthlyCredits: monthly,
    usedCredits: used,
    remainingCredits: remaining,
    topupCredits: Math.round(usage.topup_credits_remaining ?? 0),
    usedFraction: fraction,
    level,
    ...(plan.daily_credit_cap !== undefined
      ? { daily: { used: Math.round(usage.credits_used_today ?? 0), cap: Math.round(plan.daily_credit_cap) } }
      : {}),
    ...(plan.weekly_credit_cap !== undefined
      ? { weekly: { used: Math.round(usage.credits_used_this_week ?? 0), cap: Math.round(plan.weekly_credit_cap) } }
      : {}),
    concurrency: plan.concurrency,
    resetsAtMs: Date.parse(usage.resets_at),
  };
}

/**
 * The status-bar line: `Plus · 186 / 300 credits · resets in 18d`.
 * Values are whole credits so the bar never flickers on fractional spend.
 */
export function formatStatusBar(status: EntitlementStatus, nowMs = Date.now()): string {
  return `${status.planName} · ${status.remainingCredits} / ${status.monthlyCredits} credits · ${formatReset(status, nowMs)}`;
}

/** "resets in 18d", falling back to hours and then minutes inside a day. */
export function formatReset(status: EntitlementStatus, nowMs = Date.now()): string {
  const diff = status.resetsAtMs - nowMs;
  if (!Number.isFinite(diff)) return "resets soon";
  if (diff <= 0) return "resetting now";
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `resets in ${Math.max(1, minutes)}m`;
  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) return `resets in ${hours}h`;
  return `resets in ${Math.round(diff / 86_400_000)}d`;
}

/**
 * Why the user cannot keep working right now, if that is the case.
 * The client only explains; the gateway is the one that enforces.
 */
export function blockReason(status: EntitlementStatus, nowMs = Date.now()): string | null {
  if (status.level === "exhausted") {
    return "Monthly credits are used up. Top up or upgrade at sknib.com/pricing — or switch to the efficient model to stretch what is left.";
  }
  if (status.daily && status.daily.used >= status.daily.cap) {
    return `Daily cap reached (${status.daily.cap} of ${status.monthlyCredits} monthly credits). The cap lifts at midnight UTC.`;
  }
  if (status.weekly && status.weekly.used >= status.weekly.cap) {
    return `Weekly cap reached (${status.weekly.cap} credits). It resets in ${formatReset(status, nowMs).replace("resets in ", "")}.`;
  }
  return null;
}

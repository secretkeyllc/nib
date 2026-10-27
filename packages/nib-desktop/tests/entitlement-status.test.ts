import { test } from "node:test";
import assert from "node:assert/strict";
import { blockReason, formatReset, formatStatusBar, toStatus, type EntitlementStatus } from "../entitlement/status.js";
import type { Entitlement } from "../entitlement/types.js";

/** Fixed "now" so every assertion is deterministic. */
const NOW = Date.UTC(2026, 9, 27, 12, 0, 0);
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

function makeEntitlement(
  overrides: {
    name?: string;
    monthlyCredits?: number;
    creditsUsed?: number;
    dailyCap?: number;
    weeklyCap?: number;
    creditsUsedToday?: number;
    creditsUsedThisWeek?: number;
    topup?: number;
    concurrency?: number;
    resetsInMs?: number;
  } = {},
): Entitlement {
  return {
    plan: {
      id: "plus",
      name: overrides.name ?? "Plus",
      price_usd: 20,
      effective_price_usd: 20,
      currency: "USD",
      promotional: false,
      monthly_credits: overrides.monthlyCredits ?? 300,
      ...(overrides.dailyCap !== undefined ? { daily_credit_cap: overrides.dailyCap } : {}),
      ...(overrides.weeklyCap !== undefined ? { weekly_credit_cap: overrides.weeklyCap } : {}),
      concurrency: overrides.concurrency ?? 3,
      requests_per_minute: 120,
    },
    usage: {
      credits_used: overrides.creditsUsed ?? 0,
      credits_used_today: overrides.creditsUsedToday ?? 0,
      credits_used_this_week: overrides.creditsUsedThisWeek ?? 0,
      topup_credits_remaining: overrides.topup ?? 0,
      resets_at: new Date(NOW + (overrides.resetsInMs ?? 18 * DAY_MS)).toISOString(),
    },
    models: { available: 3 },
  };
}

function makeStatus(overrides: Partial<EntitlementStatus> = {}): EntitlementStatus {
  return {
    planName: "Plus",
    monthlyCredits: 300,
    usedCredits: 0,
    remainingCredits: 300,
    topupCredits: 0,
    usedFraction: 0,
    level: "ok",
    concurrency: 3,
    resetsAtMs: NOW + 18 * DAY_MS,
    ...overrides,
  };
}

test("toStatus rounds wire values to whole credits and clamps at zero and one", () => {
  const status = toStatus(
    makeEntitlement({ monthlyCredits: 299.6, creditsUsed: 14.4, topup: 2.4, dailyCap: 75.4, weeklyCap: 180.6 }),
    NOW,
  );
  assert.equal(status.monthlyCredits, 300);
  assert.equal(status.usedCredits, 14);
  assert.equal(status.remainingCredits, 286);
  assert.equal(status.topupCredits, 2);
  assert.deepEqual(status.daily, { used: 0, cap: 75 });
  assert.deepEqual(status.weekly, { used: 0, cap: 181 });

  const negative = toStatus(makeEntitlement({ monthlyCredits: -10, creditsUsed: -5 }), NOW);
  assert.equal(negative.monthlyCredits, 0);
  assert.equal(negative.usedCredits, 0);
  assert.equal(negative.remainingCredits, 0);
  assert.equal(negative.usedFraction, 1);
  assert.equal(negative.level, "exhausted");

  const over = toStatus(makeEntitlement({ monthlyCredits: 300, creditsUsed: 320 }), NOW);
  assert.equal(over.usedFraction, 1);
  assert.equal(over.remainingCredits, 0);
  assert.equal(over.level, "exhausted");
});

test("formatStatusBar pins the exact status-bar copy", () => {
  const status = toStatus(
    makeEntitlement({ name: "Plus", monthlyCredits: 300, creditsUsed: 114, resetsInMs: 18 * DAY_MS }),
    NOW,
  );
  assert.equal(formatStatusBar(status, NOW), "Plus · 186 / 300 credits · resets in 18d");
});

test("formatReset falls back from days to hours to minutes", () => {
  assert.equal(formatReset(makeStatus({ resetsAtMs: NOW + 18 * DAY_MS }), NOW), "resets in 18d");
  assert.equal(formatReset(makeStatus({ resetsAtMs: NOW + 5 * HOUR_MS }), NOW), "resets in 5h");
  assert.equal(formatReset(makeStatus({ resetsAtMs: NOW + 12 * MINUTE_MS }), NOW), "resets in 12m");
  assert.equal(formatReset(makeStatus({ resetsAtMs: NOW }), NOW), "resetting now");
  assert.equal(formatReset(makeStatus({ resetsAtMs: Number.NaN }), NOW), "resets soon");
});

test("the status bar turns ember at the 80% threshold", () => {
  assert.equal(toStatus(makeEntitlement({ monthlyCredits: 300, creditsUsed: 240 }), NOW).level, "warn");
  assert.equal(toStatus(makeEntitlement({ monthlyCredits: 300, creditsUsed: 239 }), NOW).level, "ok");
  assert.equal(toStatus(makeEntitlement({ monthlyCredits: 300, creditsUsed: 300 }), NOW).level, "exhausted");
  assert.equal(toStatus(makeEntitlement({ monthlyCredits: 300, creditsUsed: 350 }), NOW).level, "exhausted");
});

test("blockReason explains exhaustion, then the daily and weekly caps", () => {
  const exhausted = blockReason(makeStatus({ level: "exhausted", remainingCredits: 0 }), NOW);
  assert.equal(
    exhausted,
    "Monthly credits are used up. Top up or upgrade at sknib.com/pricing — or switch to the efficient model to stretch what is left.",
  );

  const daily = blockReason(makeStatus({ daily: { used: 75, cap: 75 }, monthlyCredits: 300 }), NOW);
  assert.equal(daily, "Daily cap reached (75 of 300 monthly credits). The cap lifts at midnight UTC.");

  const weekly = blockReason(makeStatus({ weekly: { used: 180, cap: 180 } }), NOW);
  assert.equal(weekly, "Weekly cap reached (180 credits). It resets in 18d.");

  assert.equal(blockReason(makeStatus({}), NOW), null);
  assert.equal(blockReason(makeStatus({ daily: { used: 1, cap: 75 }, weekly: { used: 2, cap: 180 } }), NOW), null);
  // Exhaustion wins even when a cap is also reached.
  assert.equal(
    blockReason(makeStatus({ level: "exhausted", remainingCredits: 0, daily: { used: 75, cap: 75 } }), NOW),
    "Monthly credits are used up. Top up or upgrade at sknib.com/pricing — or switch to the efficient model to stretch what is left.",
  );
});

test("daily and weekly fields are absent unless the plan defines the caps", () => {
  const withoutCaps = toStatus(makeEntitlement(), NOW);
  assert.equal(withoutCaps.daily, undefined);
  assert.equal(withoutCaps.weekly, undefined);

  const withCaps = toStatus(
    makeEntitlement({
      dailyCap: 75,
      weeklyCap: 180,
      creditsUsedToday: 12.3,
      creditsUsedThisWeek: 40.2,
    }),
    NOW,
  );
  assert.deepEqual(withCaps.daily, { used: 12, cap: 75 });
  assert.deepEqual(withCaps.weekly, { used: 40, cap: 180 });
});

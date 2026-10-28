/**
 * Nib plan and credit balance, as shown in the desktop status chip and the
 * usage panel. Display-only: no tokens, no provider payload.
 *
 * `signedIn: false` means there is no usable credential, which is a normal
 * state (first run, signed out) and must never render as an error. A thin
 * payload with only `signedIn: true` means the read itself failed — the chip
 * then shows the plan it knows and omits the numbers.
 */
export type NibEntitlement = {
  signedIn: boolean;
  planName?: string;
  /** Credits, not dollars: the gateway converts at 10 credits = $1. */
  creditsUsed?: number;
  creditsTotal?: number;
  dailyUsed?: number;
  dailyLimit?: number;
  weeklyUsed?: number;
  weeklyLimit?: number;
  topupRemaining?: number;
  /** ISO 8601 instant the monthly allowance resets. */
  resetsAt?: string;
  concurrency?: number;
};

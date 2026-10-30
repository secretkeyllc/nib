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
  /** Address of the signed-in account, for the account menu heading. */
  accountEmail?: string;
  /** Display name the account set, when it has one. */
  accountName?: string;
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
  /** ISO 8601 instant today's allowance resets, for the per-meter countdown. */
  dailyResetsAt?: string;
  /** ISO 8601 instant this week's allowance resets. */
  weeklyResetsAt?: string;
  /** ISO 8601 instant this month's allowance resets. */
  monthlyResetsAt?: string;
  concurrency?: number;
};

/**
 * One announcement written in the admin console and shown in the desktop
 * notification center.
 *
 * The body is plain text: the admin editor writes it that way, and rendering
 * arbitrary HTML from the control plane inside the app would be an injection
 * surface for no benefit.
 */
export type NibAnnouncement = {
  id: string;
  title: string;
  content: string;
  /** ISO 8601 instant the announcement was published. */
  createdAt: string;
  readAt?: string | null;
};

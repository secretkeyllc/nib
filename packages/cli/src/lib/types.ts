/**
 * Wire types shared with the Nib API.
 *
 * These mirror the endpoints documented in docs/API.md. The CLI never talks to
 * a model provider directly; it only authenticates, reads entitlement state,
 * and generates an OpenCode provider config that points at the Nib gateway.
 */

/** Response of `POST /api/v1/cli/device/authorize` (RFC 8628 device grant). */
export interface DeviceAuthorization {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
}

/** Response of `POST /api/v1/cli/device/token` on success. */
export interface DeviceToken {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
}

/** Error body of the device token endpoint while the user has not approved yet. */
export type DeviceTokenErrorCode =
  | "authorization_pending"
  | "slow_down"
  | "access_denied"
  | "expired_token";

export interface DeviceTokenError {
  error: DeviceTokenErrorCode;
  error_description?: string;
}

/** `GET /api/v1/product/entitlement` */
export interface Entitlement {
  plan: {
    id: string;
    name: string;
    /** Monthly list price in USD, before promotion. */
    price_usd: number;
    /** Price actually charged in USD, after promotion. */
    effective_price_usd: number;
    /** ISO 4217 currency the account is billed in. */
    currency: string;
    /** Whether this account is on a promotional price. */
    promotional: boolean;
    /** Promo end date (ISO 8601) when `promotional` is true. */
    promotional_until?: string;
    /** Monthly included credits. 1 credit = $0.10 of published-rate usage. */
    monthly_credits: number;
    /** Weekly spend cap, in credits. */
    weekly_credit_cap?: number;
    /** Daily spend cap, in credits. */
    daily_credit_cap?: number;
    concurrency: number;
    requests_per_minute: number;
  };
  usage: {
    /** Credits consumed in the current billing period. */
    credits_used: number;
    /** Credits consumed since the current week started. */
    credits_used_this_week: number;
    /** Credits consumed today. */
    credits_used_today: number;
    /** Purchased top-up credits remaining. Never expires within 12 months. */
    topup_credits_remaining: number;
    /** ISO 8601 instant the monthly allowance resets. */
    resets_at: string;
  };
  models: {
    /** Total number of models currently routable on this plan. */
    available: number;
    /** Model ids excluded by the plan tier. */
    excluded?: string[];
  };
}

/** One entry of `GET /v1/models` (OpenAI-compatible listing). */
export interface ModelInfo {
  id: string;
  object: "model";
  owned_by: string;
  /** Credits per 1M input tokens, at published rates. */
  credits_per_mtok_input?: number;
  /** Credits per 1M output tokens, at published rates. */
  credits_per_mtok_output?: number;
  /** Coarse tier used by the routing default. */
  tier?: "efficient" | "standard" | "frontier";
}

export interface ModelList {
  object: "list";
  data: ModelInfo[];
}

/** Normalised CLI error carrying an exit code. */
export class NibError extends Error {
  readonly exitCode: number;
  readonly hint?: string;

  constructor(message: string, exitCode = 1, hint?: string) {
    super(message);
    this.name = "NibError";
    this.exitCode = exitCode;
    if (hint !== undefined) this.hint = hint;
  }
}

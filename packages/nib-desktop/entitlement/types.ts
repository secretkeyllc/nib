/**
 * Wire types for `GET /api/v1/product/entitlement` and the device grant
 * endpoints, shared with the Nib gateway. Mirrors docs/API.md and the
 * desktop plan §4.
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

/** Response of `POST /api/v1/cli/device/token` once approved. */
export interface DeviceToken {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
}

/**
 * Error body of the device token endpoint. Pending is reported as
 * HTTP 400 + `authorization_pending` — never 401, which the client
 * reserves for "credentials are dead".
 */
export type DeviceTokenErrorCode =
  | "authorization_pending"
  | "slow_down"
  | "access_denied"
  | "expired_token"
  | "invalid_grant";

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
    currency: string;
    promotional: boolean;
    promotional_until?: string;
    /** Monthly included credits. */
    monthly_credits: number;
    /** Daily spend cap, in credits. 25% of the monthly allowance on paid plans. */
    daily_credit_cap?: number;
    /** Weekly spend cap, in credits. 60% of the monthly allowance on paid plans. */
    weekly_credit_cap?: number;
    /** Simultaneous tasks allowed. Doubles as the seat count. */
    concurrency: number;
    requests_per_minute: number;
  };
  usage: {
    credits_used: number;
    credits_used_this_week: number;
    credits_used_today: number;
    topup_credits_remaining: number;
    /** ISO 8601 instant the monthly allowance resets. */
    resets_at: string;
  };
  models: {
    available: number;
    excluded?: string[];
  };
}

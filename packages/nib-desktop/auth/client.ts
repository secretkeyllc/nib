import type { DeviceAuthorization, DeviceToken, DeviceTokenError, Entitlement } from "../entitlement/types.js";

/**
 * Minimal gateway client for the desktop shell. Independent of the CLI's
 * client on purpose: the desktop surfaces errors in the UI, not as exit
 * codes, and needs the machine-readable device-error codes intact.
 */

export class ApiError extends Error {
  readonly status: number;
  /** RFC 8628 error code (`authorization_pending`, `slow_down`, ...). */
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (code !== undefined) this.code = code;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export interface ClientOptions {
  apiUrl: string;
  token?: string;
  timeoutMs?: number;
  userAgent?: string;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export class GatewayClient {
  readonly apiUrl: string;
  private readonly token: string | undefined;
  private readonly timeoutMs: number;
  private readonly userAgent: string;

  constructor(options: ClientOptions) {
    this.apiUrl = options.apiUrl;
    this.token = options.token;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.userAgent = options.userAgent ?? "nib-desktop";
  }

  async request<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown; anonymous?: boolean } = {}): Promise<T> {
    const url = `${this.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = { accept: "application/json", "user-agent": this.userAgent };
    if (!init.anonymous && this.token) headers.authorization = `Bearer ${this.token}`;

    let body: string | undefined;
    if (init.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(init.body);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: init.method ?? "GET",
        headers,
        ...(body !== undefined ? { body } : {}),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      throw new NetworkError(`cannot reach ${this.apiUrl}: ${cause}`);
    }

    const text = await response.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : undefined;
    } catch {
      payload = undefined;
    }

    if (!response.ok) {
      const code = deviceErrorCode(payload);
      const detail = errorMessage(payload) ?? text.slice(0, 200);
      throw new ApiError(detail || `HTTP ${response.status} from ${url}`, response.status, code);
    }
    if (payload === undefined) throw new ApiError(`unexpected empty response from ${url}`, response.status);
    return payload as T;
  }

  startDeviceAuthorization(): Promise<DeviceAuthorization> {
    return this.request<DeviceAuthorization>("/api/v1/cli/device/authorize", {
      method: "POST",
      anonymous: true,
      body: { client: "nib-desktop", scope: "gateway entitlement" },
    });
  }

  pollDeviceToken(deviceCode: string): Promise<DeviceToken> {
    return this.request<DeviceToken>("/api/v1/cli/device/token", {
      method: "POST",
      anonymous: true,
      body: { device_code: deviceCode, grant_type: "urn:ietf:params:oauth:grant-type:device_code" },
    });
  }

  getEntitlement(): Promise<Entitlement> {
    return this.request<Entitlement>("/api/v1/product/entitlement");
  }
}

function deviceErrorCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const error = (payload as Record<string, unknown>).error;
  if (typeof error === "string") return error;
  return undefined;
}

function errorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  if (typeof record.error_description === "string") return record.error_description;
  const error = record.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const nested = (error as Record<string, unknown>).message;
    if (typeof nested === "string") return nested;
  }
  return undefined;
}

export type { DeviceAuthorization, DeviceToken, DeviceTokenError, Entitlement };

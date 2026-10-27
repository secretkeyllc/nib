import { NibError, type Entitlement, type ModelList } from "./types.js";

export interface ApiClientOptions {
  apiUrl: string;
  token?: string;
  /** Milliseconds before an individual request is abandoned. */
  timeoutMs?: number;
}

export interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string;
  /** Skip the bearer header entirely (device authorization start). */
  anonymous?: boolean;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiClient {
  readonly apiUrl: string;
  private readonly token: string | undefined;
  private readonly timeoutMs: number;

  constructor(options: ApiClientOptions) {
    this.apiUrl = options.apiUrl;
    this.token = options.token;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      accept: "application/json",
      "user-agent": "nib-cli",
    };
    const token = options.token ?? this.token;
    if (!options.anonymous && token) headers.authorization = `Bearer ${token}`;

    let body: string | undefined;
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        ...(body !== undefined ? { body } : {}),
        signal: AbortSignal.timeout(options.timeoutMs ?? this.timeoutMs),
      });
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      throw new NibError(
        `cannot reach ${this.apiUrl}: ${cause}`,
        2,
        "Check your network, or set NIB_API_URL if you use a self-hosted gateway.",
      );
    }

    const text = await response.text();
    const payload = text ? safeJson(text) : undefined;

    if (!response.ok) {
      throw httpError(response.status, payload, url);
    }
    if (payload === undefined) {
      throw new NibError(`unexpected empty response from ${url}`, 2);
    }
    return payload as T;
  }

  async getEntitlement(): Promise<Entitlement> {
    return this.request<Entitlement>("/api/v1/product/entitlement");
  }

  async listModels(): Promise<ModelList> {
    return this.request<ModelList>("/v1/models");
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 400) };
  }
}

function httpError(status: number, payload: unknown, url: string): NibError {
  const message = extractMessage(payload) ?? `HTTP ${status} from ${url}`;
  if (status === 401 || status === 403) {
    return new NibError(`not authorised: ${message}`, 3, "Run `nib login` again, or check NIB_API_KEY.");
  }
  if (status === 402) {
    return new NibError(`credits exhausted: ${message}`, 4, "Top up or upgrade at https://sknib.com/pricing.");
  }
  if (status === 429) {
    return new NibError(`rate limited: ${message}`, 5, "Wait for the retry window, or raise your plan's concurrency.");
  }
  if (status >= 500) {
    return new NibError(`gateway error: ${message}`, 6, "This is on us. Retry shortly or check sknib.com/status.");
  }
  return new NibError(`request failed: ${message}`, 2);
}

function extractMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  const error = record.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const nested = (error as Record<string, unknown>).message;
    if (typeof nested === "string") return nested;
  }
  const message = record.message;
  return typeof message === "string" ? message : undefined;
}

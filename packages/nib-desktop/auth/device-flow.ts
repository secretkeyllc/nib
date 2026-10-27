import { ApiError, GatewayClient } from "./client.js";
import type { DeviceAuthorization } from "../entitlement/types.js";

/**
 * RFC 8628 device authorisation, desktop flavour.
 *
 * 1. Ask the gateway for a device code and a short user code.
 * 2. Hand the verification URL to the UI (which opens the system browser).
 * 3. Poll the token endpoint at the advertised interval until approval.
 * 4. Return the token; the caller stores it in the OS credential store.
 *
 * The gateway reports "not approved yet" as HTTP 400 + `authorization_pending`
 * (never 401, which would look like dead credentials).
 */

export type DeviceFlowState =
  | { phase: "code"; authorization: DeviceAuthorization }
  | { phase: "waiting"; attempts: number }
  | { phase: "approved"; token: string };

export interface DeviceFlowCallbacks {
  onState(state: DeviceFlowState): void;
}

export interface DeviceFlowOptions {
  /** Override the gateway's poll interval for faster local tests. */
  pollIntervalMs?: number;
  /** Hard stop regardless of the advertised expiry. */
  timeoutMs?: number;
  /** Cooperative cancellation from the UI. */
  signal?: AbortSignal;
  /** Test hook injected between polls. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

const SLOW_DOWN_PENALTY_MS = 5_000;

export async function runDeviceFlow(
  client: GatewayClient,
  callbacks: DeviceFlowCallbacks,
  options: DeviceFlowOptions = {},
): Promise<string> {
  const sleep = options.sleep ?? defaultSleep;
  const authorization = await client.startDeviceAuthorization();
  callbacks.onState({ phase: "code", authorization });

  const intervalMs = options.pollIntervalMs ?? Math.max(1, authorization.interval) * 1000;
  const expiresAt = Date.now() + (options.timeoutMs ?? authorization.expires_in * 1000);
  let currentInterval = intervalMs;
  let attempts = 0;

  while (Date.now() < expiresAt) {
    await sleep(currentInterval, options.signal);
    attempts += 1;
    let token: string;
    try {
      const payload = await client.pollDeviceToken(authorization.device_code);
      token = payload.access_token;
    } catch (err) {
      if (options.signal?.aborted) throw new DeviceFlowCancelled();
      if (!(err instanceof ApiError)) throw err;
      const code = err.code;
      if (code === "authorization_pending") {
        callbacks.onState({ phase: "waiting", attempts });
        continue;
      }
      if (code === "slow_down") {
        currentInterval += SLOW_DOWN_PENALTY_MS;
        callbacks.onState({ phase: "waiting", attempts });
        continue;
      }
      if (code === "access_denied") throw new DeviceFlowDenied();
      if (code === "expired_token" || code === "invalid_grant") throw new DeviceFlowExpired();
      throw err;
    }
    callbacks.onState({ phase: "approved", token });
    return token;
  }
  throw new DeviceFlowExpired();
}

export class DeviceFlowCancelled extends Error {
  constructor() {
    super("sign-in was cancelled");
    this.name = "DeviceFlowCancelled";
  }
}

export class DeviceFlowDenied extends Error {
  constructor() {
    super("authorisation was denied in the browser");
    this.name = "DeviceFlowDenied";
  }
}

export class DeviceFlowExpired extends Error {
  constructor() {
    super("the device code expired before approval");
    this.name = "DeviceFlowExpired";
  }
}

async function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DeviceFlowCancelled());
      },
      { once: true },
    );
  });
}

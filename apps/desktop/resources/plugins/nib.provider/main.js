"use strict";

/**
 * Nib provider — device-code sign-in for the Nib gateway.
 *
 * Flow (RFC 8628 against the sknib control plane):
 *   1. POST /api/v1/cli/device/authorize  -> device_code + user_code
 *   2. pi.provider.oauth.notify(loginId, { kind: "deviceCode", ... })
 *      The host renders the code, a copy button and the verification link.
 *   3. Poll POST /api/v1/cli/device/token until the browser approves.
 *   4. Return { accessToken } — the host encrypts it and stores it in the
 *      OS keychain; this plugin never writes credentials to disk.
 *
 * The control plane returns these fields at the top level (a `data` mirror is
 * also present for browser clients), and failures use RFC 8628 codes:
 * authorization_pending / slow_down / access_denied / expired_token.
 */

const API_BASE = "https://sknib.com";
const AUTHORIZE_PATH = "/api/v1/cli/device/authorize";
const TOKEN_PATH = "/api/v1/cli/device/token";

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_POLL_SECONDS = 600;

/** Read a field from the top level, falling back to the `data` mirror. */
function field(payload, key) {
  if (!payload || typeof payload !== "object") return undefined;
  if (payload[key] !== undefined) return payload[key];
  const data = payload.data;
  if (data && typeof data === "object") return data[key];
  return undefined;
}

async function postJson(path, body, signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  if (signal) signal.addEventListener("abort", onAbort, { once: true });
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : undefined;
    } catch {
      payload = undefined;
    }
    return { ok: response.ok, status: response.status, payload };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("cancelled"));
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(new Error("cancelled"));
    };
    function cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Emit a host-rendered OAuth event. Notifications are best-effort. */
async function notify(loginId, event) {
  if (!loginId) return;
  try {
    await pi.providers.oauth.notify(loginId, event);
  } catch {
    // A host without the notify bridge still completes the login; the user
    // just sees no progress card.
  }
}

async function deviceLogin(loginId, context) {
  const started = await postJson(
    AUTHORIZE_PATH,
    { client: "nib-desktop", scope: "gateway entitlement" },
    context?.signal,
  );
  if (!started.ok || !started.payload) {
    throw new Error(`Nib sign-in could not start (HTTP ${started.status}).`);
  }

  const deviceCode = field(started.payload, "device_code");
  const userCode = field(started.payload, "user_code");
  const verificationUri = field(started.payload, "verification_uri") || `${API_BASE}/device`;
  const interval = Number(field(started.payload, "interval")) || 5;
  const expiresIn = Number(field(started.payload, "expires_in")) || MAX_POLL_SECONDS;

  if (!deviceCode || !userCode) {
    throw new Error("Nib sign-in returned an unusable device code.");
  }

  await notify(loginId, {
    kind: "deviceCode",
    userCode,
    verificationUri,
    intervalSeconds: interval,
    expiresInSeconds: expiresIn,
  });

  const deadline = Date.now() + Math.min(expiresIn, MAX_POLL_SECONDS) * 1000;
  let currentInterval = interval;

  while (Date.now() < deadline) {
    await sleep(currentInterval * 1000, context?.signal);

    const polled = await postJson(
      TOKEN_PATH,
      { device_code: deviceCode, grant_type: "urn:ietf:params:oauth:grant-type:device_code" },
      context?.signal,
    );

    const token = field(polled.payload, "access_token");
    if (polled.ok && token) return token;

    const code = field(polled.payload, "error");
    if (code === "authorization_pending") continue;
    if (code === "slow_down") {
      currentInterval += 5;
      continue;
    }
    if (code === "access_denied") throw new Error("Nib sign-in was denied in the browser.");
    if (code === "expired_token") throw new Error("The Nib sign-in code expired. Start again.");
    throw new Error(`Nib sign-in failed: ${code || `HTTP ${polled.status}`}`);
  }

  throw new Error("The Nib sign-in code expired. Start again.");
}

async function onLoad() {
  // Nothing to prepare: the provider row comes from the manifest.
}

/** Read the signed-in account's entitlement for the usage panel. */
async function onPanelInvoke(channel, payload) {
  if (channel !== "nib.entitlement") {
    throw new Error(`unknown plugin channel: ${channel}`);
  }

  let token = "";
  try {
    const settings = await pi.plugin.getSettings();
    token = typeof settings?.nibAccessToken === "string" ? settings.nibAccessToken : "";
  } catch {
    token = "";
  }
  if (!token) {
    return { signedIn: false };
  }

  const result = await pi.net.fetch({
    url: `${API_BASE}/api/v1/product/entitlement`,
    method: "GET",
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
    timeoutMs: REQUEST_TIMEOUT_MS,
  });

  let body;
  try {
    body = JSON.parse(result.bodyText);
  } catch {
    body = undefined;
  }
  if (result.status === 401) {
    return { signedIn: false };
  }
  if (result.status !== 200 || !body) {
    throw new Error(`entitlement request failed (HTTP ${result.status})`);
  }

  // The endpoint serves both shapes: flat for the desktop client, mirrored
  // under `data` for browsers. Read the flat fields, falling back to data.
  const plan = body.plan || body.data?.plan || {};
  const usage = body.usage || body.data?.usage || {};
  return { signedIn: true, plan, usage };
}

module.exports = {
  onLoad,
  onPanelInvoke,

  /**
   * Host entry point for the `nib` provider row. `request.loginId` is the
   * handle used to push device-code progress into the sign-in dialog.
   */
  async onProviderOAuth(request, context) {
    if (!request || request.providerId !== "nib") {
      throw new Error("nib.provider only serves the nib provider row.");
    }
    if (request.operation === "refresh") {
      // Gateway tokens last 24h; the host re-runs a login when one expires.
      throw new Error("Nib sessions are renewed by signing in again.");
    }

    const token = await deviceLogin(request.loginId, context);

    // The host stores the credential in the OS keychain and never hands it
    // back to plugins. The usage panel needs to call the read-only
    // entitlement endpoint, so keep our own copy in the plugin's settings.
    try {
      await pi.plugin.setSettings({ nibAccessToken: token });
    } catch {
      // A settings write failure must not fail the sign-in.
    }

    return { accessToken: token, accountLabel: "Nib account" };
  },
};

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

/**
 * Local mock of the Nib gateway, for developing the CLI, the desktop shell
 * and the site without touching production. Not published, not shipped.
 *
 * Endpoints:
 *   POST /api/v1/cli/device/authorize
 *   POST /api/v1/cli/device/token
 *   POST /api/v1/cli/device/approve   (browser side; mock has no login wall)
 *   GET  /api/v1/product/entitlement
 *   GET  /v1/models
 */

const PORT = Number(process.env.PORT ?? 8787);

interface DeviceGrant {
  deviceCode: string;
  userCode: string;
  approved: boolean;
  expiresAt: number;
  intervalMs: number;
}

const grants = new Map<string, DeviceGrant>();

const MODELS = [
  { id: "nib-efficient", object: "model", owned_by: "nib", tier: "efficient" },
  { id: "nib-standard", object: "model", owned_by: "nib", tier: "standard" },
  { id: "nib-frontier", object: "model", owned_by: "nib", tier: "frontier" },
];

// Plan shape per the overall plan v2.3: Plus / Pro / Max, all paid tiers
// route every model, daily cap = 25% and weekly cap = 60% of the allowance.
// The entitlement response must carry daily, weekly and concurrency caps so
// clients can explain "why not now".
const ENTITLEMENT = {
  plan: {
    id: "plus",
    name: "Plus",
    price_usd: 10,
    effective_price_usd: 10,
    currency: "USD",
    promotional: false,
    monthly_credits: 300,
    daily_credit_cap: 75,
    weekly_credit_cap: 180,
    concurrency: 3,
    requests_per_minute: 120,
  },
  usage: {
    credits_used: 114.5,
    credits_used_this_week: 92.4,
    credits_used_today: 28.6,
    topup_credits_remaining: 0,
    resets_at: new Date(Date.now() + 18 * 86_400_000 + 4 * 3_600_000).toISOString(),
  },
  models: { available: MODELS.length },
};

function json(res: import("node:http").ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 64_000) {
        reject(new Error("body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const route = `${req.method} ${url.pathname}`;
  console.log(route);

  if (route === "POST /api/v1/cli/device/authorize") {
    const deviceCode = randomUUID();
    const userCode = randomUserCode();
    const intervalMs = 1000;
    const grant: DeviceGrant = {
      deviceCode,
      userCode,
      approved: false,
      expiresAt: Date.now() + 600_000,
      intervalMs,
    };
    grants.set(deviceCode, grant);
    // Auto-approve after 2s so `npm run dev:mock` needs no browser.
    if (process.env.AUTO_APPROVE !== "false") {
      setTimeout(() => {
        grant.approved = true;
        console.log(`  auto-approved ${userCode}`);
      }, 2000);
    }
    json(res, 200, {
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: `http://localhost:${PORT}/device`,
      verification_uri_complete: `http://localhost:${PORT}/device?code=${userCode}`,
      expires_in: 600,
      interval: 1,
    });
    return;
  }

  if (route === "POST /api/v1/cli/device/approve") {
    // The browser-side confirmation. Production requires a login session
    // here; the mock approves whatever code is posted.
    const raw = await readBody(req);
    const body = raw ? (JSON.parse(raw) as { user_code?: string; device_code?: string }) : {};
    const grant = [...grants.values()].find(
      (g) => (body.user_code && g.userCode === body.user_code) || (body.device_code && g.deviceCode === body.device_code),
    );
    if (!grant) {
      json(res, 404, { error: "not_found" });
      return;
    }
    grant.approved = true;
    json(res, 200, { ok: true, user_code: grant.userCode });
    return;
  }

  if (route === "POST /api/v1/cli/device/token") {
    const raw = await readBody(req);
    const body = raw ? (JSON.parse(raw) as { device_code?: string }) : {};
    const grant = body.device_code ? grants.get(body.device_code) : undefined;
    if (!grant) {
      json(res, 400, { error: "invalid_grant" });
      return;
    }
    if (Date.now() > grant.expiresAt) {
      json(res, 400, { error: "expired_token" });
      return;
    }
    if (!grant.approved) {
      json(res, 400, { error: "authorization_pending" });
      return;
    }
    grants.delete(grant.deviceCode);
    json(res, 200, { access_token: "nib_local_dev_token", token_type: "Bearer", scope: "gateway" });
    return;
  }

  if (route === "GET /api/v1/product/entitlement") {
    if (!authorised(req)) {
      json(res, 401, { error: { message: "invalid or missing token" } });
      return;
    }
    json(res, 200, ENTITLEMENT);
    return;
  }

  if (route === "GET /v1/models") {
    if (!authorised(req)) {
      json(res, 401, { error: { message: "invalid or missing token" } });
      return;
    }
    json(res, 200, { object: "list", data: MODELS });
    return;
  }

  if (url.pathname === "/device") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><meta charset="utf-8"><title>Nib device login</title>
<body style="font:16px/1.6 system-ui;background:#08090B;color:#F4F1EA;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><h1 style="font-size:20px">Mock device approval</h1>
<p style="color:#8B909A">Code <b style="color:#FF5C35">${url.searchParams.get("code") ?? "----"}</b></p>
<p style="color:#8B909A">This page is auto-approved in local development.</p></div></body>`);
    return;
  }

  json(res, 404, { error: "not_found" });
});

function authorised(req: import("node:http").IncomingMessage): boolean {
  const header = req.headers.authorization ?? "";
  return header === "Bearer nib_local_dev_token";
}

function randomUserCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (i === 3) code += "-";
  }
  return code;
}

server.listen(PORT, () => {
  console.log(`nib mock gateway on http://localhost:${PORT}`);
  console.log(`try: NIB_API_URL=http://localhost:${PORT} node packages/cli/dist/index.js login --no-open`);
});

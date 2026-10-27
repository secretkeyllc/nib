import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import {
  DeviceFlowCancelled,
  DeviceFlowDenied,
  DeviceFlowExpired,
  runDeviceFlow,
  type DeviceFlowState,
} from "../auth/device-flow.js";
import { GatewayClient } from "../auth/client.js";

/**
 * In-process mock of the Nib gateway for the RFC 8628 device grant,
 * following the route semantics of packages/mock-server/src/index.ts:
 *
 *   POST /api/v1/cli/device/authorize → 200 { device_code, user_code, ... }
 *   POST /api/v1/cli/device/token     → 400 authorization_pending until approved,
 *                                       400 slow_down / access_denied / expired_token
 *                                       on demand, then 200 { access_token }
 */

interface TokenReply {
  status: number;
  body: unknown;
}

interface MockGateway {
  /** Base URL to hand to GatewayClient. */
  url: string;
  /** Route lines in arrival order, e.g. "POST /api/v1/cli/device/token". */
  requests: string[];
  /** Device codes issued by the authorize endpoint. */
  issued: string[];
  close(): Promise<void>;
}

function startMockGateway(onToken?: (deviceCode: string, poll: number) => TokenReply): Promise<MockGateway> {
  const requests: string[] = [];
  const issued: string[] = [];
  const polls = new Map<string, number>();

  const server: Server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const route = `${req.method} ${url.pathname}`;
    requests.push(route);

    if (route === "POST /api/v1/cli/device/authorize") {
      const deviceCode = randomUUID();
      issued.push(deviceCode);
      reply(res, 200, {
        device_code: deviceCode,
        user_code: "ABCD-EFGH",
        verification_uri: `${url.origin}/device`,
        verification_uri_complete: `${url.origin}/device?code=ABCD-EFGH`,
        expires_in: 600,
        interval: 1,
      });
      return;
    }

    if (route === "POST /api/v1/cli/device/token") {
      const raw = await readBody(req);
      const body = raw ? (JSON.parse(raw) as { device_code?: string }) : {};
      const deviceCode = body.device_code ?? "";
      const poll = polls.get(deviceCode) ?? 0;
      polls.set(deviceCode, poll + 1);
      const outcome = onToken?.(deviceCode, poll) ?? { status: 400, body: { error: "authorization_pending" } };
      reply(res, outcome.status, outcome.body);
      return;
    }

    reply(res, 404, { error: "not_found" });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("mock gateway did not get a port"));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        requests,
        issued,
        close: () =>
          new Promise<void>((resolveClose, rejectClose) => {
            server.closeAllConnections();
            server.close((err) => (err ? rejectClose(err) : resolveClose()));
          }),
      });
    });
  });
}

function reply(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const APPROVED_TOKEN = "nib_gw_test_token";

function approve(): TokenReply {
  return { status: 200, body: { access_token: APPROVED_TOKEN, token_type: "Bearer", scope: "gateway" } };
}

function deviceError(error: string): TokenReply {
  return { status: 400, body: { error } };
}

test("device flow polls through authorization_pending and returns the token", async () => {
  const gateway = await startMockGateway((_code, poll) => (poll < 1 ? deviceError("authorization_pending") : approve()));
  try {
    const client = new GatewayClient({ apiUrl: gateway.url });
    const token = await runDeviceFlow(client, { onState: () => {} }, { pollIntervalMs: 5 });
    assert.equal(token, APPROVED_TOKEN);
    assert.equal(gateway.issued.length, 1);
    assert.equal(gateway.requests[0], "POST /api/v1/cli/device/authorize");
    assert.equal(gateway.requests[1], "POST /api/v1/cli/device/token");
  } finally {
    await gateway.close();
  }
});

test("slow_down grows the poll interval by the penalty on every hit", async () => {
  const gateway = await startMockGateway((_code, poll) => (poll < 2 ? deviceError("slow_down") : approve()));
  try {
    const client = new GatewayClient({ apiUrl: gateway.url });
    const sleeps: number[] = [];
    const token = await runDeviceFlow(
      client,
      { onState: () => {} },
      {
        pollIntervalMs: 5,
        sleep: async (ms) => {
          sleeps.push(ms);
        },
      },
    );
    assert.equal(token, APPROVED_TOKEN);
    // 5ms base, then +5000ms per slow_down (device-flow.ts SLOW_DOWN_PENALTY_MS).
    assert.deepEqual(sleeps, [5, 5005, 10005]);
  } finally {
    await gateway.close();
  }
});

test("access_denied rejects with DeviceFlowDenied", async () => {
  const gateway = await startMockGateway(() => deviceError("access_denied"));
  try {
    const client = new GatewayClient({ apiUrl: gateway.url });
    await assert.rejects(runDeviceFlow(client, { onState: () => {} }, { pollIntervalMs: 5 }), DeviceFlowDenied);
  } finally {
    await gateway.close();
  }
});

test("expired_token rejects with DeviceFlowExpired", async () => {
  const gateway = await startMockGateway(() => deviceError("expired_token"));
  try {
    const client = new GatewayClient({ apiUrl: gateway.url });
    await assert.rejects(runDeviceFlow(client, { onState: () => {} }, { pollIntervalMs: 5 }), DeviceFlowExpired);
  } finally {
    await gateway.close();
  }
});

test("aborting the signal rejects with DeviceFlowCancelled", async () => {
  const gateway = await startMockGateway(); // default: always authorization_pending
  try {
    const client = new GatewayClient({ apiUrl: gateway.url });
    const controller = new AbortController();
    const flow = runDeviceFlow(
      client,
      {
        onState: (state) => {
          if (state.phase === "waiting") controller.abort();
        },
      },
      { pollIntervalMs: 5, signal: controller.signal, timeoutMs: 10_000 },
    );
    await assert.rejects(flow, DeviceFlowCancelled);
  } finally {
    await gateway.close();
  }
});

test("onState observes code → waiting → approved", async () => {
  const gateway = await startMockGateway((_code, poll) => (poll < 1 ? deviceError("authorization_pending") : approve()));
  try {
    const client = new GatewayClient({ apiUrl: gateway.url });
    const states: DeviceFlowState[] = [];
    const token = await runDeviceFlow(client, { onState: (state) => states.push(state) }, { pollIntervalMs: 5 });

    assert.deepEqual(
      states.map((state) => state.phase),
      ["code", "waiting", "approved"],
    );
    const first = states[0];
    assert.ok(first, "missing the code state");
    assert.equal(first.phase, "code");
    if (first.phase === "code") {
      assert.equal(first.authorization.device_code, gateway.issued[0]);
      assert.equal(first.authorization.user_code, "ABCD-EFGH");
    }
    assert.deepEqual(states[1], { phase: "waiting", attempts: 1 });
    const last = states[2];
    assert.ok(last, "missing the approved state");
    assert.equal(last.phase, "approved");
    if (last.phase === "approved") assert.equal(last.token, token);
  } finally {
    await gateway.close();
  }
});

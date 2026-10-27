# Architecture

Two repositories, one product.

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  nib (public, MIT)          │        │  sknib-site (private)        │
│                             │        │                              │
│  packages/cli               │        │  index / pricing / models    │
│    login  (device code)     │        │  docs/                       │
│    status (entitlement)     │        │  legal/                      │
│    init   (provider block)  │        │  device.html (approval)      │
│    run    (spawn upstream)  │        │  signup.html                 │
│  packages/mock-server       │        │                              │
└──────────────┬──────────────┘        └──────────────┬───────────────┘
               │ HTTPS                                │ HTTPS
               ▼                                      ▼
        ┌──────────────────────────────────────────────────┐
        │  Gateway (private, not in either repository)      │
        │                                                   │
        │  /api/v1/cli/device/*      device grant           │
        │  /api/v1/product/entitlement                      │
        │  /api/v1/keys              key management         │
        │  /v1/chat/completions      OpenAI protocol        │
        │  /v1/responses             OpenAI protocol        │
        │  /v1/messages              Anthropic protocol     │
        │  /v1beta/...               Gemini protocol        │
        │                                                   │
        │  routing · credits · usage log · provider keys    │
        └──────────────────────────────────────────────────┘
```

## Why the client is open source

The CLI handles a credential and sends source code to a remote endpoint. Users are right to want to read it. Publishing the client costs us nothing competitively — routing, provider contracts, and billing stay private — and it removes the main objection to installing a new agent.

The gateway stays closed because it encodes commercial terms with providers and the abuse controls that keep the unit economics intact.

## Why we distribute instead of fork

OpenCode ships several times a week. A fork would be a full-time merge job. Instead:

| Concern | Where it lives |
|---|---|
| Agent loop, tools, MCP, sessions | Upstream package |
| Provider block, base URL, model list | Written by `nib init` |
| Credentials | `nib login`, stored locally |
| Credits and plan | `nib status`, read from the gateway |

`nib init` merges rather than overwrites: an existing `opencode.json` keeps its themes, agents, and other providers, and only the `nib` key is added. That is the whole integration surface, which is why an upstream upgrade cannot break us structurally.

## Auth flow

```
CLI                          Gateway                     Browser
 │                              │                            │
 │ POST /cli/device/authorize   │                            │
 ├─────────────────────────────>│                            │
 │  device_code, user_code      │                            │
 │<─────────────────────────────┤                            │
 │                              │                            │
 │ print code, open URL ────────┼───────────────────────────>│
 │                              │  POST /cli/device/approve  │
 │                              │<───────────────────────────┤
 │ POST /cli/device/token (poll)│                            │
 ├─────────────────────────────>│                            │
 │  access_token                │                            │
 │<─────────────────────────────┤                            │
 │                              │                            │
 │ store 0600, write provider   │                            │
```

Design constraints:

- The device code is single-use and expires in 10 minutes.
- Polling backs off by 5 seconds on `slow_down` and stops on `access_denied` or `expired_token`.
- Approval requires an authenticated browser session; the CLI cannot self-approve.
- The token is written with mode 0600 and never printed by default.
- `nib login` also ensures a default API key exists, so `nib key print` works immediately.

## Credit accounting

Every inference request returns:

- `x-nib-credits-charged` — what this request cost
- `x-nib-credits-remaining` — plan credits left

The charge is computed from the model's published rate and the actual token counts, including cache reads and writes. Charges are recorded per request so the dashboard, `nib status`, and support can all agree on one number.

Pre-flight: if the estimated maximum cost exceeds remaining plan credits plus top-up balance, the request is rejected with 402 before dispatch. This avoids the failure mode where a large request succeeds and then cannot be billed.

## Failure modes and the intended behaviour

| Failure | What the user sees | What the system does |
|---|---|---|
| Gateway down | CLI exits 6 with a status-page link | No credits charged |
| Provider degraded | Request rerouted to an equivalent model in the same tier | User is told in the response headers which model served it |
| Credits exhausted | 402 with the shortfall and a top-up link | Request not dispatched |
| Rate limited | 429 with `retry-after` | Client backs off; no retry storm |
| Token revoked | 401, prompt to run `nib login` | Local config left in place for inspection |
| Upstream binary missing | Exit 127 with install instructions | Nothing else attempted |

## What is deliberately not built yet

- **Team billing automation.** Team plans are invoiced manually until there are paying team customers. Building seat management before demand is a trap.
- **Usage history API.** `nib status` needs aggregates; a full log API is a product surface with a long support tail.
- **Desktop installer.** npm first. A signed installer is worth building once there is demand from people who do not use Node.
- **Multi-region gateway.** One region until latency complaints, not speculation, justify a second.

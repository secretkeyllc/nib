# Nib API contract (v1)

This is the slice of the gateway that the CLI and public clients depend on. It is deliberately small: five endpoints, all JSON, all versioned under `/api/v1` except the OpenAI-compatible model listing.

Base URL: `https://api.sknib.com`

## Authentication

Two credential shapes are accepted:

| Shape | Used by | Header |
|---|---|---|
| Device token | `nib` CLI after `nib login` | `Authorization: Bearer <token>` |
| API key | external tools, SDKs, CI | `Authorization: Bearer sk-nib-...` |

Both map to a user, a plan, and a set of group bindings server-side. The CLI writes the device token to `~/.config/nib/config.json` (mode `0600`). API keys are created in the dashboard at `https://sknib.com/keys`.

Errors use the OpenAI shape so existing SDKs surface a useful message:

```json
{ "error": { "type": "insufficient_quota", "message": "Monthly credits exhausted" } }
```

| Status | `error.type` | CLI behaviour |
|---|---|---|
| 401 / 403 | `authentication_error` | Exit 3, tell the user to run `nib login` |
| 402 | `insufficient_quota` | Exit 4, point at the pricing page |
| 429 | `rate_limit_error` | Exit 5, mention concurrency and RPM |
| 5xx | `api_error` | Exit 6, suggest the status page |

## 1. Device authorisation

### `POST /api/v1/cli/device/authorize`

No authentication. Starts an RFC 8628 device grant.

Request:

```json
{ "client": "nib-cli", "scope": "gateway entitlement" }
```

Response `200`:

```json
{
  "device_code": "3f0c2a1e-...",
  "user_code": "MKGX-36FF",
  "verification_uri": "https://sknib.com/device",
  "verification_uri_complete": "https://sknib.com/device?code=MKGX-36FF",
  "expires_in": 600,
  "interval": 5
}
```

Requirements:

- `user_code` uses an unambiguous alphabet (no `I`, `O`, `0`, `1`) and is shown as `XXXX-XXXX`.
- A device code is single-use and expires after `expires_in` seconds.
- Rate limit: 10 authorizations per IP per minute, 5 per minute per email once approved.

### `POST /api/v1/cli/device/token`

No authentication. Polled by the CLI at `interval` seconds.

Request:

```json
{
  "device_code": "3f0c2a1e-...",
  "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
}
```

Pending response `400`:

```json
{ "error": "authorization_pending" }
```

Other errors: `slow_down`, `access_denied`, `expired_token`. The CLI backs off by 5 seconds on `slow_down` and stops on the other two.

Success `200`:

```json
{
  "access_token": "nib_dev_...",
  "token_type": "Bearer",
  "expires_in": 7776000,
  "scope": "gateway entitlement"
}
```

On success the gateway must also make sure the account has a default API key, so `nib key print` works immediately after login without a second round trip.

## 2. Entitlement

### `GET /api/v1/product/entitlement`

Requires a bearer token. This is the only call `nib status` makes.

Response `200`:

```json
{
  "plan": {
    "id": "starter-promo",
    "name": "Starter",
    "price_usd": 15,
    "effective_price_usd": 10,
    "currency": "USD",
    "promotional": true,
    "promotional_until": "2027-01-31T00:00:00Z",
    "monthly_credits": 30,
    "weekly_credit_cap": 12,
    "daily_credit_cap": null,
    "concurrency": 3,
    "requests_per_minute": 120
  },
  "usage": {
    "credits_used": 11.4,
    "credits_used_this_week": 4.2,
    "credits_used_today": 1.6,
    "topup_credits_remaining": 0,
    "resets_at": "2026-11-14T08:00:00Z"
  },
  "models": {
    "available": 42,
    "excluded": ["nib-frontier"]
  }
}
```

Rules:

- `monthly_credits` is the plan allowance **after** any promotional multiplier. It is the number the UI shows.
- `credits_used` counts plan credits only. Top-up consumption is reported separately in `topup_credits_remaining`.
- `resets_at` is an absolute instant; the CLI formats the relative time.
- All monetary values are USD numbers, never strings.
- `null` is allowed for caps that are not set. Omit nothing: absent fields are a contract break.

## 3. Models

### `GET /v1/models`

Requires a bearer token. OpenAI-compatible so existing SDKs work unchanged.

```json
{
  "object": "list",
  "data": [
    { "id": "nib-efficient", "object": "model", "owned_by": "nib", "tier": "efficient" },
    { "id": "nib-frontier", "object": "model", "owned_by": "nib", "tier": "frontier" }
  ]
}
```

`tier` is the only extension. `nib init` uses it to pick a default (`efficient` first) and the dashboard uses it to group models.

Model ids must be stable. If a provider renames a model, add an alias rather than removing the old id; OpenCode configs and user scripts are cached on disk.

## 4. Inference

The gateway accepts four protocol families, so a user can point any existing tool at it:

| Protocol | Path | Typical client |
|---|---|---|
| OpenAI Chat Completions | `POST /v1/chat/completions` | Cline, Continue, Zed, SDKs |
| OpenAI Responses | `POST /v1/responses` | Codex-style clients |
| Anthropic Messages | `POST /v1/messages` | Claude Code, Anthropic SDKs |
| Gemini | `POST /v1beta/models/{model}:generateContent` | Google SDKs |

Usage accounting must be identical across all four. A request routed through the Anthropic endpoint consumes the same credits as the same request through Chat Completions.

Response headers on every inference call:

| Header | Meaning |
|---|---|
| `x-nib-credits-charged` | Credits charged for this request, after the fact |
| `x-nib-credits-remaining` | Plan credits left in the current period |
| `x-nib-request-id` | Support reference |

The CLI and the site both read these headers, so a user never has to open a dashboard to know what a request cost.

## 5. Keys

Dashboard-only in v1, no public API. The CLI needs exactly one thing: the default key, fetched once at login and stored locally.

```
POST   /api/v1/keys          create
GET    /api/v1/keys          list (prefix only, never the secret)
DELETE /api/v1/keys/:id      revoke
```

Keys are shown once at creation. The dashboard must not be able to re-display a key after the fact; `nib key print` reads the locally stored token instead.

## Versioning

- Breaking changes go to `/api/v2`. v1 stays available for at least six months after v2 ships.
- New optional response fields are not breaking.
- Removing or renaming a field is breaking, including `tier` and the credit headers.

## What is intentionally out of scope for v1

- Usage history endpoints. `nib status` needs aggregates, not a log. The dashboard reads aggregates server-side.
- Organisation and seat management. Team plans are invoiced and managed manually until there are paying team customers.
- Streaming accounting callbacks. Credits are charged on completion, and the headers report the result.

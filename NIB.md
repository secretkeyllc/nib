# Nib desktop

A branded build of [PI Desktop](https://github.com/vastsa/PI-Desktop) (LGPL-3.0),
the agent workspace Nib ships as its desktop client.

## What this repository changes

Everything upstream is kept as-is unless listed here. That keeps merges from
upstream manageable and keeps the LGPL-covered surface small.

| Area | Change |
|---|---|
| Identity | `productName`, `appId`, `APP_NAME`, window title, executable names |
| Icon | `build/icon.{png,ico,icns}` generated from the official Nib logo |
| Publisher | `build.publish` points at the Nib release channel |
| Provider | `resources/plugins/nib.provider` — Nib as an OAuth provider with device-code sign-in |
| Usage panel | same plugin, `views/usage.html` — plan, credits and limits |

## The Nib provider plugin

`apps/desktop/resources/plugins/nib.provider/` declares a provider row:

```
baseUrl:   https://sknib.com/v1     (OpenAI-compatible inference)
authKind:  oauth                    (device-code sign-in)
apiStyle:  openai-completions
```

Sign-in flow:

1. `POST /api/v1/cli/device/authorize` returns a device code and a user code.
2. The plugin pushes `{ kind: "deviceCode", ... }` to the host, which renders the
   code, a copy button and the verification link.
3. The plugin polls `POST /api/v1/cli/device/token` until the browser approves.
4. The access token is returned to the host, which stores it in the OS keychain.

The plugin keeps its own copy of the token in plugin settings so the usage panel
can read `GET /api/v1/product/entitlement` — the host never hands stored
credentials back to plugins.

## Build

```bash
pnpm install
pnpm --filter "./packages/**" build
pnpm --filter @pi-desktop/desktop build
pnpm --filter @pi-desktop/desktop exec electron-builder --win nsis --x64
```

## Upstream

- Repository: https://github.com/vastsa/PI-Desktop
- Base commit: `b91f351` (2026-10-28)
- License: LGPL-3.0 — modifications to covered files stay in this repository.

## Keeping up with upstream

```bash
git remote add upstream https://github.com/vastsa/PI-Desktop.git
git fetch upstream
git merge upstream/main
```

The brand changes are concentrated in `apps/desktop/package.json`,
`packages/shared/src/protocol.ts`, `packages/i18n/src/locales/*/index.ts`
(shellName) and `apps/desktop/build/`; the Nib behaviour lives entirely in
`apps/desktop/resources/plugins/nib.provider/`, which upstream never touches.

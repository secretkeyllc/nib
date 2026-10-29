# Nib desktop

Nib is the desktop AI coding agent sold at [nib.am](https://nib.am). This
repository builds it.

The application core is derived from [PI Desktop](https://github.com/vastsa/PI-Desktop)
(LGPL-3.0). Everything inherited is kept as-is unless listed below, which keeps
the LGPL-covered surface small and keeps the product layer easy to audit.

## The Nib product layer

`apps/desktop/resources/plugins/nib.provider/` is the whole account story: the
provider row, the device-code sign-in, the usage panel, and the plan/credit
status the app renders. It is the only place Nib talks to the control plane.

| Area | Change |
|---|---|
| Identity | `productName`, `appId`, `APP_NAME`, window title, executable names |
| Icon | `build/icon.{png,ico,icns}` generated from the official Nib logo |
| Publisher | `build.publish` points at the Nib release channel |
| Provider | `resources/plugins/nib.provider` — Nib as an OAuth provider with device-code sign-in |
| Usage panel | same plugin, `views/usage.html` — plan, credits and limits |
| Account menu | `src/features/chat/composer/NibAccountButton.tsx` — sidebar account, plan and preferences |
| Brand marks | `build/icon*.{png,ico,icns}`, `resources/{icon,tray-icon-*}.png`, `src/assets/brand/` all derive from the Nib logo |

| Area | Change |
|---|---|
| Identity | `productName`, `appId`, `APP_NAME`, window title, executable names |
| Icon | `build/icon.{png,ico,icns}` generated from the official Nib logo |
| Publisher | `build.publish` points at the Nib release channel |
| Provider | `resources/plugins/nib.provider` — Nib as an OAuth provider with device-code sign-in |
| Usage panel | same plugin, `views/usage.html` — plan, credits and limits |
| Account menu | `src/features/chat/composer/NibAccountButton.tsx` — sidebar account, plan and preferences |
| Brand marks | `build/icon*.{png,ico,icns}`, `resources/{icon,tray-icon-*}.png`, `src/assets/brand/` all derive from the Nib logo |

## Product differences from upstream

Nib is account-first. Where upstream treats every model service as something
the user added, Nib ships one:

| Surface | Behaviour |
|---|---|
| Sidebar footer | an account button before settings: plan, credits, sign in/out, language, appearance |
| Model settings | the Nib row carries the app mark, no "Plugin" badge, and counts the gateway catalogue rather than the fallback list |
| Composer model menu | a "current model" section above recents, readable model names, reasoning levels on every row |
| Credits chip | `left/total` only; a popover with today / week / month meters, matching the context inspector |
| Context ring | the arc fills with the share of the window *used*, so empty means nothing spent |
| Notifications | admin announcements appear above task outcomes |
| Sign-in | the browser opens on the approval page with the code already in the URL; the code is never shown |

## The Nib provider plugin

`apps/desktop/resources/plugins/nib.provider/` declares a provider row:

```
baseUrl:   https://nib.am/v1     (OpenAI-compatible inference)
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
pnpm --filter nib-desktop build
pnpm --filter nib-desktop exec electron-builder --win nsis --x64
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

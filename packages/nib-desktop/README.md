# Nib desktop

The Nib desktop client: a Windows-first Electron shell around the [OpenCode](https://github.com/anomalyco/opencode) engine, with Nib sign-in, plan/credit status and automatic updates. The engine runs unchanged in a pseudo-terminal; Nib only brands the surface, wires credentials in and shows what your subscription allows. Everything here follows the desktop plan §2.3: **a distribution layer, not a fork**.

| Piece | Where |
|---|---|
| Branding (icons, splash mark, generator) | `branding/` |
| Packaging (electron-builder config, NSIS additions, CLI launcher) | `build/` |
| Device-code login, credential store | `auth/` |
| Entitlement / status bar model | `entitlement/` |
| Engine resolution + `nib.json` writer | `engine/` |
| Auto-update policy | `update/` |
| Electron main process | `src/main/` |
| Packaging helpers | `script/` |
| Deep documentation | [docs/DESKTOP.md](docs/DESKTOP.md), [docs/IPC.md](docs/IPC.md) |

## Development loop

Two terminals from the repo root:

```bash
npm install          # once

npm run dev:mock     # terminal 1: local mock gateway on :8787
npm run dev:desktop  # terminal 2: build once, then launch Electron
```

`npm run dev:desktop` runs `npm run dev` in this package, which builds `out/` with esbuild and starts Electron with `NIB_API_URL=http://localhost:8787` (unless you set your own) and `NIB_DISABLE_UPDATES=1`. The mock auto-approves device codes, so login works without a browser.

## Tests

```bash
npm run test:desktop   # repo root; compiles tsconfig.test.json and runs node --test dist-test/
```

## Windows packaging

```bash
npm run icons -w @sknib/nib-desktop     # branding/nib.ico + PNGs from /assets (sharp + png-to-ico)
npm run fetch-engine -w @sknib/nib-desktop   # optional: bundle opencode.exe into resources/bin
npm run dist:win -w @sknib/nib-desktop  # predist:win stages resources/cli, then electron-builder
```

`dist:win` runs the `predist:win` hook (`script/prepare-pack.mjs`) automatically: it copies the built CLI into `resources/cli/`, adds the `nib.cmd` launcher and ensures `resources/bin/` exists. Output lands in `release/Nib-Setup-<version>.exe`. See [docs/DESKTOP.md](docs/DESKTOP.md) for the full pipeline and installer behaviour.

## Code signing and updates

- **Public downloads must be EV code-signed.** Unsigned builds are internal betas only.
- **Unsigned beta builds do not enable auto-update** — `update/policy.ts` keeps the updater off until a build is signed (plan §3.6). Escape hatches for testing: `NIB_DISABLE_UPDATES=1`, `NIB_ENABLE_UPDATES=1`.
- Update channel: GitHub Releases (`secretkeyllc/nib`), `latest` channel by default, `beta` opt-in via `NIB_CHANNEL`.

## Bundled CLI

The installer ships the CLI and copies `nib.cmd` to `%LOCALAPPDATA%\Nib\bin` (added to the user PATH). The launcher runs `resources\cli\index.js` through the app's own Electron runtime in Node mode (`ELECTRON_RUN_AS_NODE=1`), so `nib --version` works with no Node.js installed. If you installed Nib to a custom directory, re-run the installer so the launcher is rewritten.

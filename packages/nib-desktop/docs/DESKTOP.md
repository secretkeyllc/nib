# Nib desktop — architecture and release pipeline

The desktop client is a **thin distribution layer** over the OpenCode engine (plan §2.3). OpenCode's own Electron desktop already ships the hard parts — Windows NSIS packaging, `electron-updater`, a `node-pty` terminal, sessions/diff UI — so Nib keeps its diff to upstream minimal and adds only what the Nib product needs: branding, device-code sign-in, credit visibility and its own update channel. The engine is spawned, never forked; `vendor/opencode` stays read-only, and every upstream release is rebased with a conflict budget of 20 files.

The user-facing rule behind every file here: the engine stays OpenCode internally, but nothing the user sees says `opencode` — only the About page's `Built on OpenCode (MIT)` licence statement keeps the upstream name (plan §3.2).

## Layout

```
packages/nib-desktop/
├── branding/          icons + splash mark, generated from /assets (build-icons.mjs)
├── build/             packaging: electron-builder.json, installer.nsh, nib.cmd
├── config/            (planned) default nib.json the app writes on first run
├── auth/              device-code flow, gateway client, Windows Credential Manager
├── entitlement/       plan/credit model for the status bar
├── engine/            engine binary resolution + nib.json / OPENCODE_CONFIG wiring
├── update/            update policy (channel + signed-build gating)
├── script/            dev.mjs, build.mjs, prepare-pack.mjs, fetch-engine.mjs
├── src/               Electron main process (renderer talks only via IPC)
└── docs/              IPC.md (channel contract), DESKTOP.md (this file)
```

Key behaviours, all in code today:

- **Engine resolution** (`engine/resolve.ts`): `NIB_OPENCODE_BIN` → a binary bundled under the app's `resources/bin` → `opencode` on PATH. The app never vendors the engine into its own code.
- **Credentials** never touch config files; they live in Windows Credential Manager (`auth/credential-store.ts`), and the app injects the token into the engine's environment at spawn time.
- **IPC contract** (`docs/IPC.md`): the renderer only sees `state:get`, `auth:*`, `credits:refresh`, `terminal:*` and the matching events. Channel names are Nib-branded.

## Development loop

```bash
npm install

# terminal 1
npm run dev:mock        # repo root: mock gateway on http://localhost:8787

# terminal 2
npm run dev:desktop     # repo root == npm run dev -w @sknib/nib-desktop
```

`script/dev.mjs` builds once with esbuild (`script/build.mjs` → `out/main`, `out/preload`, `out/renderer`), then starts Electron with:

- `NIB_API_URL=http://localhost:8787` unless already set — so the loop always talks to the mock,
- `NIB_DISABLE_UPDATES=1` — dev runs never check for updates (`update/policy.ts`).

The mock auto-approves device codes after two seconds, so the full login → status → task loop runs without a browser. To point the shell somewhere else, export your own `NIB_API_URL` before `dev:desktop`.

## Tests

```bash
npm run test:desktop    # tsc -p tsconfig.test.json && node --test dist-test/
```

Unit tests cover the pure logic (engine config, update policy, entitlement formatting, auth helpers). Engine binary resolution and the Electron/pty integration are exercised manually in the dev loop.

## Windows packaging

First release matrix (plan §3.7): **Windows x64 only, NSIS `.exe`, EV-signed for public download.** macOS/Linux wait for the next platform phase; their icon tiers (e.g. a 1024 px `.icns` master) must be generated later from the same `/assets` marks — never hand-traced.

```bash
npm run icons -w @sknib/nib-desktop          # branding/nib.ico (256/128/64/48/32/16) + PNGs
npm run fetch-engine -w @sknib/nib-desktop   # optional, best-effort: opencode.exe -> resources/bin
npm run dist:win -w @sknib/nib-desktop       # full pipeline -> release/Nib-Setup-<version>.exe
npm run pack:dir -w @sknib/nib-desktop       # unpacked dir, for quick packaging smoke tests
```

Pipeline behind `dist:win`:

1. **`predist:win` → `script/prepare-pack.mjs`** copies `packages/cli/dist` into `resources/cli/` (plus the CLI's `package.json`, whose `"type": "module"` the launcher needs, and `build/nib.cmd`) and ensures `resources/bin/` exists. It aborts if the CLI is not built yet, and only warns if `opencode.exe` is absent — the app then falls back to an engine on PATH.
2. **`npm run build`** bundles the Electron targets with esbuild into `out/`.
3. **`electron-builder --win nsis --x64 --config build/electron-builder.json`** packs `out/` + `package.json` into the asar (unpacking `@lydell/node-pty` for its native binding), attaches `resources/bin` and `resources/cli` as extraResources, and builds the assisted (non-one-click) per-user installer with the EULA from the repo root `LICENSE`.

`build/electron-builder.json` pins the identity (`com.secretkeyllc.nib`, product `Nib`, binary `nib.exe`) and the publish target (`github:secretkeyllc/nib`) that produces `latest.yml` for the updater.

### What the installer does beyond copying files

`build/installer.nsh` (included via `nsis.include`) runs on top of electron-builder's assisted installer:

- copies `resources\cli\nib.cmd` → `%LOCALAPPDATA%\Nib\bin`,
- copies the whole bundled CLI → `%LOCALAPPDATA%\Nib\bin\cli` (replaced on upgrade),
- appends `%LOCALAPPDATA%\Nib\bin` to the user `Path` (`HKCU\Environment`) **with deduplication** — the check is case-insensitive and matches both the expanded path and a literal `%LOCALAPPDATA%\Nib\bin` entry; the rest of the value is rewritten verbatim as `REG_EXPAND_SZ` so other `%VAR%` entries survive,
- broadcasts `WM_SETTINGCHANGE` so new shells see the PATH change,
- on uninstall: removes `%LOCALAPPDATA%\Nib\bin`, strips its PATH entry (deleting the value when nothing is left) and broadcasts again.

The uninstaller therefore needs no window restarts, and repeated installs never grow duplicate PATH entries.

## EV code signing

- **Public downloads must be EV code-signed** (plan §1.3/§3.7). Until the certificate is provisioned, only internal betas ship, marked as such.
- **Unsigned builds must not enable auto-update.** `update/policy.ts` gates the updater on `codeSigned` (set by the packaging pipeline once signing is wired); betas stay update-silent unless someone deliberately sets `NIB_ENABLE_UPDATES=1`.
- When the certificate arrives: configure electron-builder's Windows signing (e.g. `win.signtoolOptions`/`CSC_LINK` for an EV token, or Azure Trusted Signing), sign **before** publishing, keep the `latest.yml` hash taken from the signed binary, and re-verify the full update chain on a clean Windows machine (plan §6, risk 3).

## Update channels

- Hosted on **GitHub Releases** for `secretkeyllc/nib` for the first phase (plan §3.6); a storage bucket can replace it later without changing the manifest format.
- Channels: `latest` (default, stable) and `beta` (opt-in via `NIB_CHANNEL=beta`).
- Strategy: background download, applied on next launch, never a forced restart.
- Same rule as the website download matrix: unsigned/coming-soon platforms must not get fake links — Windows x64 is the only published artefact today.

## Bundled CLI

The installer carries the Nib CLI so one download gives both surfaces. `nib.cmd` (copied to `%LOCALAPPDATA%\Nib\bin`, which the installer puts on the user PATH) runs `resources\cli\index.js` through the app's own Electron binary in Node mode:

```
set ELECTRON_RUN_AS_NODE=1
"%LOCALAPPDATA%\Programs\Nib\Nib.exe" "%LOCALAPPDATA%\Nib\bin\cli\index.js" <args>
```

No Node.js installation is required. Verify with `nib --version`. The launcher assumes the default per-user install directory; if the user chose a custom directory during setup, re-running the installer refreshes it.

## CI

`.github/workflows/desktop.yml` builds on `windows-latest` for `v*` tags and `workflow_dispatch`: install → tag/version check (tags) → icons → typecheck/build/test → CLI build (the installer bundles it) → fetch-engine → `dist:win`. Artefacts upload on every run; tag pushes additionally publish a **beta, unsigned** GitHub release. The EV-signing step is a marked TODO in that file.

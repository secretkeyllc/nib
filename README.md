# Nib

An agentic coding tool. One install, one login, every model.

Nib is a thin distribution layer over [OpenCode](https://github.com/anomalyco/opencode). It adds three things the upstream CLI leaves to the user: a device-code login that issues a gateway key, a plan/credit view that matches the subscription you paid for, and a provider block that points OpenCode at the Nib gateway in one command.

```
npm install -g @sknib/cli
nib login
nib init
nib run
```

## Commands

| Command | What it does |
|---|---|
| `nib login` | Device-code sign-in. Stores a token in `~/.config/nib/config.json` with `0600`. |
| `nib logout` | Removes local credentials. |
| `nib status` | Plan, credits used and left, caps, reset date. `--json` for scripts. |
| `nib models` | Models routable on your plan. `--json` for scripts. |
| `nib init` | Writes a `nib` provider block into OpenCode's config. `--project` writes locally, `--force` replaces. |
| `nib run [args]` | Launches OpenCode with Nib credentials. `--dry-run` prints the command. |
| `nib key print` | Prints the key for external tools (Cursor, Cline, Continue, Zed, SDKs). |

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `NIB_API_URL` | `https://api.sknib.com` | Gateway base URL. Plain `http` allowed only for localhost. |
| `NIB_API_KEY` | — | Overrides the stored device token. Useful in CI. |
| `NIB_OPENCODE_BIN` | `opencode` | Path to the upstream binary. |

The config file is `~/.config/nib/config.json` (or `$XDG_CONFIG_HOME/nib/config.json`).

## Using the key outside the CLI

The same subscription works with any OpenAI-compatible client:

```bash
export NIB_API_KEY=$(nib key print)
export OPENAI_BASE_URL=https://api.sknib.com/v1
```

Anthropic-compatible clients use `https://api.sknib.com` as the base URL and `nib` as the provider prefix. See [docs/API.md](docs/API.md).

## Development

```bash
npm install
npm run build
npm test

# In one shell: local gateway
npm run dev:mock

# In another: point the CLI at it
export XDG_CONFIG_HOME=/tmp/nibhome
NIB_API_URL=http://localhost:8787 node packages/cli/dist/index.js login --no-open
NIB_API_URL=http://localhost:8787 node packages/cli/dist/index.js status
```

The mock auto-approves device codes after two seconds, so no browser is needed.

## What this repository is not

- It does not vendor or fork the OpenCode engine. `nib run` spawns the upstream binary so users can upgrade it independently.
- It contains no gateway code. The model routing, billing and usage accounting live server-side and are not part of this repository.
- It does not include the marketing site. The site is a separate, non-public repository.

## Licence

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

Nib is an independent distribution and is not endorsed by the OpenCode maintainers.

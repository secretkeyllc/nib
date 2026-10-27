# Nib desktop — IPC contract

One contract between the main process, the preload bridge and the renderer.
Everything here is Nib-branded; the engine (OpenCode) is an internal detail
that never surfaces in channel names or UI copy.

## Invoke channels (`ipcMain.handle`, renderer → main)

| Channel | Request | Response |
|---|---|---|
| `state:get` | — | `ShellState` |
| `auth:start-login` | — | `void` (progress arrives as events) |
| `auth:cancel-login` | — | `void` |
| `auth:logout` | — | `void` |
| `credits:refresh` | — | `CreditsPayload` |
| `project:choose` | — | `string \| null` — chosen directory, or null when cancelled |
| `app:open-external` | `url: string` | `void` (shell.openExternal) |
| `update:check` | — | `void` (result arrives as `update:status`) |

## Fire-and-forget sends (`ipcMain.on`, renderer → main)

| Channel | Payload |
|---|---|
| `terminal:write` | `string` — keystrokes to the engine pty |
| `terminal:resize` | `{ cols: number, rows: number }` |

## Main → renderer events (`webContents.send`)

| Channel | Payload |
|---|---|
| `state:changed` | `ShellState` |
| `engine:data` | `string` — raw pty output for xterm.js |
| `engine:event` | `{ status: "stopped" \| "starting" \| "running" \| "exited" \| "error", message?: string, exitCode?: number }` |
| `auth:code` | `{ userCode: string, verificationUri: string }` |
| `auth:waiting` | `{ attempts: number }` |
| `auth:ok` | `{}` |
| `auth:cancelled` | `{}` |
| `auth:failed` | `{ message: string }` |
| `auth:expired` | `{}` — token rejected (401/403); renderer shows the sign-in view |
| `auth:signed-out` | `{}` |
| `update:status` | `{ message: string }` — one-line updater narration |

## Shared types

```ts
interface ShellState {
  signedIn: boolean;
  email: string | null;
  apiUrl: string;
  engineSource: "env" | "bundled" | "path" | "missing";
  engineStatus: "stopped" | "starting" | "running" | "exited" | "error";
  version: string;
  projectDir: string;
}

interface CreditsPayload {
  line: string;                      // "Plus · 186 / 300 credits · resets in 18d"
  level: "ok" | "warn" | "exhausted" | "signed-out";
  status: EntitlementStatus | null;  // see entitlement/status.ts
  refreshedAt: string;               // ISO 8601
  error?: string;                    // set when credits could not be fetched
}
```

## Preload surface (`window.nib`, via contextBridge)

The preload runs sandboxed: only `contextBridge` and `ipcRenderer` are
available. The renderer never sees `ipcRenderer` directly.

```ts
interface NibBridge {
  getState(): Promise<ShellState>;
  startLogin(): Promise<void>;
  cancelLogin(): Promise<void>;
  logout(): Promise<void>;
  refreshCredits(): Promise<CreditsPayload>;
  chooseProject(): Promise<string | null>;
  openExternal(url: string): Promise<void>;
  checkForUpdates(): Promise<void>;
  writeTerminal(data: string): void;
  resizeTerminal(cols: number, rows: number): void;
  /** Subscribe to a main→renderer event; returns an unsubscribe function. */
  on(channel: string, listener: (payload: unknown) => void): () => void;
}
```

## Renderer view states

1. **Sign-in view** — shown when `ShellState.signedIn` is false, or after
   `auth:expired` / `auth:signed-out`. Shows the brand mark, a single
   "Sign in with browser" button, and (after `auth:code`) the user code and
   a link to the verification URL. `auth:cancelled` / `auth:failed` return
   to the idle sign-in state with a message.
2. **App view** — header (drag region: mark, "Nib", engine status, project
   dir), the xterm.js terminal fed by `engine:data`, and the status bar fed
   by `credits:refresh`. The status bar is clickable and opens the credits
   detail popover. Status-bar colour follows `CreditsPayload.level`:
   paper for `ok`, ember for `warn` and `exhausted`, muted for `signed-out`.

## Naming rule

No user-visible string may contain "opencode" — except the About window's
`Built on OpenCode (MIT)` line and its opencode.ai link. Internal
identifiers (`OPENCODE_CONFIG`, package names, comments) are fine.

import { app, BrowserWindow, dialog } from "electron";
import { homedir } from "node:os";
import { join } from "node:path";
import { GatewayClient } from "../../auth/client.js";
import { resolveApiUrl } from "../../auth/api-url.js";
import { createCredentialStore, SERVICE, ACCOUNT, type CredentialStore } from "../../auth/credential-store.js";
import { runDeviceFlow, DeviceFlowCancelled, DeviceFlowDenied, DeviceFlowExpired } from "../../auth/device-flow.js";
import { toStatus, formatStatusBar, type EntitlementStatus, REFRESH_INTERVAL_MS } from "../../entitlement/status.js";
import type { Entitlement } from "../../entitlement/types.js";
import { writeNibConfig, engineEnv } from "../../engine/nib-config.js";
import { resolveEngine } from "../../engine/resolve.js";
import { EngineHost, type EngineEvent } from "./engine-host.js";

/**
 * Everything the shell needs at runtime: credentials, entitlement cache,
 * the engine host and the window they report into. One instance, owned by
 * the main process; the renderer only sees it through the IPC contract.
 */

export interface CreditsPayload {
  line: string;
  level: "ok" | "warn" | "exhausted" | "signed-out";
  status: EntitlementStatus | null;
  refreshedAt: string;
  error?: string;
}

export interface ShellState {
  signedIn: boolean;
  email: string | null;
  apiUrl: string;
  engineSource: string;
  engineStatus: EngineEvent["status"];
  version: string;
  projectDir: string;
}

export class AppContext {
  readonly store: CredentialStore;
  readonly engine: EngineHost;
  private token: string | null = null;
  private entitlement: Entitlement | null = null;
  private creditsError: string | null = null;
  private entitlementError: string | null = null;
  refreshTimer: NodeJS.Timeout | null = null;
  private loginAbort: AbortController | null = null;

  private readonly window: () => BrowserWindow | null;

  constructor(options: { window: () => BrowserWindow | null; store: CredentialStore }) {
    this.window = options.window;
    this.store = options.store;
    this.engine = new EngineHost({
      resolve: () => resolveEngine({ resourcesDir: engineResourcesDir() }),
      env: async () => this.engineEnvironment(),
      onData: (data) => this.send("engine:data", data),
      onEvent: (event) => {
        this.send("engine:event", event);
        this.send("state:changed", this.state());
      },
    });
  }

  /* ---------------- state ---------------- */

  get apiUrl(): string {
    return resolveApiUrl();
  }

  get signedIn(): boolean {
    return this.token !== null;
  }

  state(): ShellState {
    const resolved = resolveEngine({ resourcesDir: engineResourcesDir() });
    return {
      signedIn: this.signedIn,
      email: null,
      apiUrl: this.apiUrl,
      engineSource: resolved.source,
      engineStatus: this.engine.running ? "running" : "stopped",
      version: app.getVersion(),
      projectDir: this.projectDir,
    };
  }

  projectDir = homedir();

  /* ---------------- credentials ---------------- */

  async loadStoredCredentials(): Promise<void> {
    const token = await this.store.getPassword(SERVICE, ACCOUNT);
    if (token) {
      this.token = token;
      await this.prepareEngineConfig();
      void this.refreshCredits();
    }
  }

  async startLogin(): Promise<void> {
    this.cancelLogin();
    const abort = new AbortController();
    this.loginAbort = abort;
    const client = new GatewayClient({ apiUrl: this.apiUrl });

    try {
      const token = await runDeviceFlow(
        client,
        {
          onState: (state) => {
            if (abort.signal.aborted) return;
            if (state.phase === "code") {
              this.send("auth:code", {
                userCode: state.authorization.user_code,
                verificationUri: state.authorization.verification_uri_complete ?? state.authorization.verification_uri,
              });
            } else if (state.phase === "waiting") {
              this.send("auth:waiting", { attempts: state.attempts });
            }
          },
        },
        { signal: abort.signal },
      );
      if (abort.signal.aborted) return;

      await this.store.setPassword(SERVICE, ACCOUNT, token);
      this.token = token;
      await this.prepareEngineConfig();
      this.send("auth:ok", {});
      void this.refreshCredits();
      await this.engine.start();
    } catch (err) {
      if (err instanceof DeviceFlowCancelled) {
        this.send("auth:cancelled", {});
        return;
      }
      const message =
        err instanceof DeviceFlowDenied
          ? "Authorisation was denied in the browser."
          : err instanceof DeviceFlowExpired
            ? "The code expired before approval. Start again."
            : err instanceof Error
              ? err.message
              : String(err);
      this.send("auth:failed", { message });
    } finally {
      this.loginAbort = null;
    }
  }

  cancelLogin(): void {
    this.loginAbort?.abort();
    this.loginAbort = null;
  }

  async logout(): Promise<void> {
    this.cancelLogin();
    this.engine.kill();
    await this.store.deletePassword(SERVICE, ACCOUNT);
    this.token = null;
    this.entitlement = null;
    stopTimer(this);
    this.send("auth:signed-out", {});
    this.send("state:changed", this.state());
  }

  /* ---------------- credits ---------------- */

  async refreshCredits(): Promise<CreditsPayload> {
    if (!this.token) {
      return { line: "Signed out", level: "signed-out", status: null, refreshedAt: new Date().toISOString() };
    }
    const client = new GatewayClient({ apiUrl: this.apiUrl, token: this.token });
    try {
      this.entitlement = await client.getEntitlement();
      this.entitlementError = null;
      startTimer(this);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        // Device tokens do not refresh silently in v1; ask for a fresh sign-in.
        this.entitlementError = "Session expired — sign in again to continue.";
        this.engine.kill();
        this.send("auth:expired", {});
      } else {
        this.entitlementError = err instanceof Error ? err.message : String(err);
      }
    }
    return this.creditsPayload();
  }

  creditsPayload(): CreditsPayload {
    if (!this.signedIn) {
      return { line: "Signed out", level: "signed-out", status: null, refreshedAt: new Date().toISOString() };
    }
    if (this.entitlement) {
      const status = toStatus(this.entitlement);
      return {
        line: formatStatusBar(status),
        level: status.level,
        status,
        refreshedAt: new Date().toISOString(),
      };
    }
    return {
      line: "Credits unavailable",
      level: "ok",
      status: null,
      refreshedAt: new Date().toISOString(),
      error: this.entitlementError ?? undefined,
    };
  }

  /* ---------------- engine ---------------- */

  async chooseProject(): Promise<string | null> {
    const win = this.window();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      title: "Open project",
      properties: ["openDirectory"],
      defaultPath: this.projectDir,
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    this.projectDir = result.filePaths[0]!;
    await this.prepareEngineConfig();
    if (this.signedIn) await this.engine.restart();
    this.send("state:changed", this.state());
    return this.projectDir;
  }

  private async prepareEngineConfig(): Promise<void> {
    if (!this.token) return;
    await writeNibConfig(app.getPath("userData"), this.apiUrl);
  }

  private async engineEnvironment(): Promise<NodeJS.ProcessEnv> {
    const configPath = await writeNibConfig(app.getPath("userData"), this.apiUrl);
    return engineEnv(configPath, this.token ?? "", {
      ...process.env,
      NIB_PROJECT_DIR: this.projectDir,
    });
  }

  /* ---------------- plumbing ---------------- */

  private send(channel: string, payload: unknown): void {
    if (this.window()?.isDestroyed() === false) {
      this.window()!.webContents.send(channel, payload);
    }
  }

  onWindowFocus(): void {
    if (this.signedIn) void this.refreshCredits();
  }
}

/** Fixed 5-minute cadence plus refresh-on-focus; per-task hooks arrive with engine events in v2. */
export function startTimer(context: AppContext): void {
  if (context.refreshTimer) return;
  const timer = setInterval(() => {
    void context.refreshCredits();
  }, REFRESH_INTERVAL_MS);
  timer.unref?.();
  context.refreshTimer = timer;
}

export function stopTimer(context: AppContext): void {
  if (context.refreshTimer) clearInterval(context.refreshTimer);
  context.refreshTimer = null;
}

/** Branding assets live beside the package in dev and under resources/branding when packaged. */
export function resourcesDir(): string | undefined {
  return app.isPackaged ? join(process.resourcesPath, "branding") : join(app.getAppPath(), "branding");
}

/**
 * Root that engine binaries sit under, i.e. the directory CONTAINING `bin/`.
 *
 * electron-builder maps `resources/bin` to `<resources>/bin` (extraResources),
 * while branding lands at `<resources>/branding`. Passing resourcesDir() here
 * searched `<resources>/branding/bin/opencode.exe`, which never exists, so a
 * packaged app reported "The engine was not found" even with the binary
 * bundled.
 */
export function engineResourcesDir(): string | undefined {
  // Packaged: electron-builder puts extraResources at <resources>/bin, so the
  // root that contains bin/ is process.resourcesPath itself.
  // Dev: the binary lives at <package>/resources/bin, so point at resources/.
  return app.isPackaged ? process.resourcesPath : join(app.getAppPath(), "resources");
}

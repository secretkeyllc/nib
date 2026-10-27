/**
 * Renderer entry for Nib desktop. Owns view switching and event wiring;
 * login.ts, terminal.ts and statusbar.ts hold the pieces. The contract is
 * docs/IPC.md; the local interfaces below mirror it and its shared types.
 */

import "./theme.css";
import "@xterm/xterm/css/xterm.css";

import {
  initLogin,
  loginCode,
  loginIdle,
  loginPending,
  loginWaiting,
} from "./login.js";
import {
  initTerminal,
  terminalEvent,
  terminalFit,
  terminalWrite,
  type EngineEvent,
} from "./terminal.js";
import {
  closeCreditsPopover,
  initStatusbar,
  renderCredits,
  type CreditsPayload,
} from "./statusbar.js";

/** Mirrors `ShellState` in docs/IPC.md. */
export interface ShellState {
  signedIn: boolean;
  email: string | null;
  apiUrl: string;
  engineSource: "env" | "bundled" | "path" | "missing";
  engineStatus: "stopped" | "starting" | "running" | "exited" | "error";
  version: string;
  projectDir: string;
}

/** Mirrors the preload bridge (`window.nib`) in docs/IPC.md. */
export interface NibBridge {
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
  on(channel: string, listener: (payload: unknown) => void): () => void;
}

declare global {
  interface Window {
    nib: NibBridge;
  }
}

const PRICING_URL = "https://sknib.com/pricing";

const ENGINE_LABEL: Record<ShellState["engineStatus"], string> = {
  stopped: "Engine stopped",
  starting: "Engine starting",
  running: "Engine running",
  exited: "Engine exited",
  error: "Engine error",
};

/**
 * Set by auth:expired / auth:signed-out so a stray signed-in ShellState
 * (for example the state:changed that follows an engine exit) cannot flip
 * the user back into the app view before they sign in again.
 */
let loginLocked = false;
let updateNoteTimer = 0;

function req(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Renderer markup is missing #${id}`);
  return el;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function start(): Promise<void> {
  initLogin({
    onStart: () => void startLogin(),
    onCancel: () => void window.nib.cancelLogin(),
    onOpenExternal: (url) => void window.nib.openExternal(url),
  });
  initStatusbar({
    onRefresh: () => refreshCredits(),
    onManagePlan: () => void window.nib.openExternal(PRICING_URL),
  });
  initTerminal({
    onData: (data) => window.nib.writeTerminal(data),
    onResize: (cols, rows) => window.nib.resizeTerminal(cols, rows),
    onCheck: () => void checkStatus(),
  });

  subscribe();

  const state = await window.nib.getState();
  applyState(state);
  if (state.signedIn) void refreshCredits();
}

function subscribe(): void {
  window.nib.on("state:changed", (payload) => applyState(payload as ShellState));
  window.nib.on("engine:data", (payload) =>
    terminalWrite(typeof payload === "string" ? payload : ""),
  );
  window.nib.on("engine:event", (payload) => terminalEvent(payload as EngineEvent));

  window.nib.on("auth:code", (payload) => {
    const body = payload as { userCode?: unknown; verificationUri?: unknown };
    loginCode(
      typeof body.userCode === "string" ? body.userCode : "",
      typeof body.verificationUri === "string" ? body.verificationUri : "",
    );
  });
  window.nib.on("auth:waiting", () => loginWaiting());
  window.nib.on("auth:ok", () => {
    loginLocked = false;
    loginIdle();
    showApp();
    void refreshCredits();
  });
  window.nib.on("auth:cancelled", () => loginIdle("Sign-in cancelled."));
  window.nib.on("auth:failed", (payload) => {
    const body = payload as { message?: unknown };
    loginIdle(typeof body.message === "string" ? body.message : "Sign-in failed.", true);
  });
  window.nib.on("auth:expired", () => {
    loginLocked = true;
    showLogin();
    loginIdle("Your session expired. Sign in again.", true);
  });
  window.nib.on("auth:signed-out", () => {
    loginLocked = true;
    showLogin();
    loginIdle("Signed out.");
  });

  window.nib.on("update:status", (payload) => {
    const body = payload as { message?: unknown };
    showUpdateNote(typeof body.message === "string" ? body.message : "");
  });
}

function applyState(state: ShellState): void {
  setEngineStatus(state.engineStatus);
  setProjectDir(state.projectDir);
  if (!state.signedIn) {
    loginLocked = false;
    showLogin();
  } else if (!loginLocked) {
    showApp();
  }
}

function showLogin(): void {
  closeCreditsPopover();
  req("view-login").hidden = false;
  req("view-app").hidden = true;
}

function showApp(): void {
  req("view-app").hidden = false;
  req("view-login").hidden = true;
  // The terminal can only be measured while the view is visible.
  terminalFit();
}

function setEngineStatus(status: ShellState["engineStatus"]): void {
  const pill = req("engine-pill");
  pill.dataset.status = status;
  pill.textContent = ENGINE_LABEL[status];
}

function setProjectDir(dir: string): void {
  const el = req("header-project");
  el.textContent = dir;
  el.title = dir;
}

function showUpdateNote(text: string): void {
  const el = req("header-note");
  el.textContent = text;
  el.hidden = text === "";
  window.clearTimeout(updateNoteTimer);
  if (text !== "") {
    updateNoteTimer = window.setTimeout(() => {
      el.hidden = true;
    }, 10_000);
  }
}

async function startLogin(): Promise<void> {
  loginPending();
  try {
    await window.nib.startLogin();
  } catch (err) {
    loginIdle(message(err), true);
  }
}

/**
 * The terminal error note's "Check status" action: re-read the shell state
 * and credits so the header and status bar catch up. It does not restart
 * the engine; that stays with Restart Engine in the app menu.
 */
async function checkStatus(): Promise<void> {
  try {
    applyState(await window.nib.getState());
    await refreshCredits();
  } catch {
    // Nothing else to show; the note stays up.
  }
}

async function refreshCredits(): Promise<void> {
  try {
    renderCredits(await window.nib.refreshCredits());
  } catch (err) {
    renderCredits({
      line: "Credits unavailable",
      level: "ok",
      status: null,
      refreshedAt: new Date().toISOString(),
      error: message(err),
    });
  }
}

void start().catch((err) => loginIdle(message(err), true));

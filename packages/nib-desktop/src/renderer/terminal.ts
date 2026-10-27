/**
 * The xterm.js host for the engine's terminal. Keystrokes leave on
 * terminal:write, pty output arrives on engine:data, and engine:event
 * error states surface as a note over the terminal (docs/IPC.md).
 */

import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

/** Mirrors the `engine:event` payload in docs/IPC.md. */
export interface EngineEvent {
  status: "stopped" | "starting" | "running" | "exited" | "error";
  message?: string;
  exitCode?: number;
}

export interface TerminalHandlers {
  onData(data: string): void;
  onResize(cols: number, rows: number): void;
  onCheck(): void;
}

let term: Terminal | null = null;
let fit: FitAddon | null = null;
let handlers: TerminalHandlers | null = null;
let lastCols = 0;
let lastRows = 0;

function req(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Renderer markup is missing #${id}`);
  return el;
}

export function initTerminal(next: TerminalHandlers): void {
  handlers = next;
  const host = req("terminal-host");
  term = new Terminal({
    fontFamily:
      'ui-monospace, "Cascadia Mono", Consolas, "Liberation Mono", monospace',
    fontSize: 13,
    lineHeight: 1.25,
    cursorBlink: true,
    scrollback: 5000,
    // Palette from assets/README.md: Ink, Paper, Ember, Line.
    theme: {
      background: "#08090B",
      foreground: "#F4F1EA",
      cursor: "#FF5C35",
      selectionBackground: "#22262E",
      selectionForeground: "#F4F1EA",
    },
  });
  fit = new FitAddon();
  term.loadAddon(fit);
  term.open(host);
  term.onData((data) => handlers?.onData(data));

  req("terminal-check").addEventListener("click", () => handlers?.onCheck());

  // Coalesce the resize bursts of a window drag into one fit per frame.
  let frame = 0;
  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(applyFit);
  });
  applyFit();
}

/** Fit to the current container and push the size to the pty. */
export function terminalFit(): void {
  applyFit();
}

function applyFit(): void {
  if (!term || !fit) return;
  fit.fit();
  // A hidden view measures to nothing; skip until the view is visible.
  if (term.cols < 2 || term.rows < 2) return;
  if (term.cols === lastCols && term.rows === lastRows) return;
  lastCols = term.cols;
  lastRows = term.rows;
  handlers?.onResize(term.cols, term.rows);
}

/** engine:data — raw pty output straight into the terminal. */
export function terminalWrite(data: string): void {
  term?.write(data);
}

/**
 * engine:event — explain error and exited states over the terminal. There
 * is no keystroke that helps a dead pty, so the note points at Restart
 * Engine in the app menu and offers a status re-read instead.
 */
export function terminalEvent(event: EngineEvent): void {
  const note = req("terminal-note");
  if (event.status !== "error" && event.status !== "exited") {
    note.hidden = true;
    return;
  }

  const title = req("terminal-note-title");
  const body = req("terminal-note-body");
  if (event.status === "error") {
    title.textContent = "Engine error";
    body.textContent = `${event.message ?? "The engine could not start."} Pick Restart Engine in the app menu once the cause is fixed.`;
  } else {
    title.textContent = "Engine exited";
    body.textContent = `The engine stopped (exit code ${event.exitCode ?? 0}). Pick Restart Engine in the app menu to start it again.`;
  }
  note.hidden = false;
}

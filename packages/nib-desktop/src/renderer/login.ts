/**
 * Sign-in view: the CSS brand mark, the device-code display and the
 * browser hand-off. Login progress arrives as auth:* events (docs/IPC.md);
 * main.ts forwards them into the functions below.
 */

export interface LoginHandlers {
  onStart(): void;
  onCancel(): void;
  onOpenExternal(url: string): void;
}

type Phase = "idle" | "pending" | "code";

let handlers: LoginHandlers | null = null;
let phase: Phase = "idle";
let verifyUri = "";

function req(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Renderer markup is missing #${id}`);
  return el;
}

function button(id: string): HTMLButtonElement {
  return req(id) as HTMLButtonElement;
}

function setStatus(text: string, isError = false): void {
  const el = req("login-status");
  el.textContent = text;
  el.hidden = text === "";
  el.classList.toggle("is-error", isError);
}

export function initLogin(next: LoginHandlers): void {
  handlers = next;
  button("login-start").addEventListener("click", () => handlers?.onStart());
  button("login-cancel").addEventListener("click", () => handlers?.onCancel());
  req("login-verify").addEventListener("click", (event) => {
    event.preventDefault();
    if (verifyUri !== "") handlers?.onOpenExternal(verifyUri);
  });
  loginIdle();
}

/** Idle card, plus an optional status message (cancel, failure, expiry). */
export function loginIdle(messageText = "", isError = false): void {
  phase = "idle";
  verifyUri = "";
  const start = button("login-start");
  start.hidden = false;
  start.disabled = false;
  button("login-cancel").hidden = true;
  req("login-code-box").hidden = true;
  setStatus(messageText, isError && messageText !== "");
}

/** startLogin is in flight; let the user back out. */
export function loginPending(): void {
  phase = "pending";
  button("login-start").disabled = true;
  button("login-cancel").hidden = false;
  req("login-code-box").hidden = true;
  setStatus("Waiting for your browser. Approve the sign-in there.");
}

/** auth:code — the device code and where to enter it. */
export function loginCode(userCode: string, verificationUri: string): void {
  phase = "code";
  verifyUri = verificationUri;
  req("login-code").textContent = userCode;
  const filled = userCode !== "" && verificationUri.includes(userCode);
  req("login-code-hint").textContent = filled
    ? "The page opens with the code already filled in."
    : "Type the code on the page, then approve.";
  const start = button("login-start");
  start.hidden = true;
  start.disabled = false;
  button("login-cancel").hidden = false;
  req("login-code-box").hidden = false;
  setStatus("Waiting for you to approve in the browser.");
}

/** auth:waiting — the flow is still polling; keep the wait visible. */
export function loginWaiting(): void {
  if (phase === "idle") return;
  setStatus("Waiting for you to approve in the browser.");
}

/**
 * Status bar and credits popover. The bar renders CreditsPayload.line
 * as-is; the popover lays out the EntitlementStatus detail (the local
 * interface below mirrors entitlement/status.ts).
 */

/** Mirrors `EntitlementStatus` in entitlement/status.ts. */
export interface EntitlementStatus {
  planName: string;
  monthlyCredits: number;
  usedCredits: number;
  remainingCredits: number;
  topupCredits: number;
  /** Fraction of the monthly allowance consumed, 0..1. */
  usedFraction: number;
  level: "ok" | "warn" | "exhausted";
  daily?: { used: number; cap: number };
  weekly?: { used: number; cap: number };
  concurrency: number;
  resetsAtMs: number;
}

/** Mirrors `CreditsPayload` in docs/IPC.md. */
export interface CreditsPayload {
  line: string;
  level: "ok" | "warn" | "exhausted" | "signed-out";
  status: EntitlementStatus | null;
  refreshedAt: string;
  error?: string;
}

export interface StatusbarHandlers {
  onRefresh(): void | Promise<void>;
  onManagePlan(): void;
}

let handlers: StatusbarHandlers | null = null;
let latest: CreditsPayload | null = null;
let open = false;

function req(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Renderer markup is missing #${id}`);
  return el;
}

export function initStatusbar(next: StatusbarHandlers): void {
  handlers = next;
  const bar = req("statusbar");
  bar.addEventListener("click", () => setOpen(!open));
  bar.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(!open);
    }
  });

  req("credits-close").addEventListener("click", () => setOpen(false));
  req("credits-refresh").addEventListener("click", () => void handlers?.onRefresh());
  req("credits-manage").addEventListener("click", (event) => {
    event.preventDefault();
    handlers?.onManagePlan();
  });

  const backdrop = req("credits-popover");
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) setOpen(false);
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) setOpen(false);
  });
}

function setOpen(next: boolean): void {
  open = next;
  req("credits-popover").hidden = !open;
  req("statusbar").setAttribute("aria-expanded", String(open));
  if (open) {
    if (latest) renderDetails(latest);
    req("credits-close").focus();
  }
}

export function closeCreditsPopover(): void {
  if (open) setOpen(false);
}

/** Paint the bar and, when open, the popover from one payload. */
export function renderCredits(payload: CreditsPayload): void {
  latest = payload;
  req("statusbar").className = `statusbar level-${payload.level}`;
  req("statusbar-line").textContent = payload.line;
  if (open) renderDetails(payload);
}

function renderDetails(payload: CreditsPayload): void {
  const errorBox = req("credits-error");
  if (payload.error) {
    errorBox.textContent = payload.error;
    errorBox.hidden = false;
  } else {
    errorBox.hidden = true;
  }

  const status = payload.status;
  const fill = req("credits-progress");
  const caption = req("credits-progress-caption");
  const plan = req("credits-plan");
  const remaining = req("credits-remaining");

  if (!status) {
    plan.textContent = payload.level === "signed-out" ? "Signed out" : "—";
    remaining.textContent = "";
    fill.className = "progress-fill";
    fill.style.width = "0%";
    caption.textContent =
      payload.level === "signed-out"
        ? "Sign in to see your credit usage."
        : "Usage has not loaded.";
    setFacts(null);
    return;
  }

  plan.textContent = status.planName;
  remaining.textContent = `${status.remainingCredits} left`;
  const fraction = Math.min(1, Math.max(0, status.usedFraction));
  fill.className = `progress-fill fill-${status.level}`;
  fill.style.width = `${Math.round(fraction * 100)}%`;
  caption.textContent = `${status.usedCredits} of ${status.monthlyCredits} used`;
  setFacts(status);
}

function setFacts(status: EntitlementStatus | null): void {
  req("credits-daily").textContent = status?.daily
    ? `${status.daily.used} / ${status.daily.cap}`
    : "—";
  req("credits-weekly").textContent = status?.weekly
    ? `${status.weekly.used} / ${status.weekly.cap}`
    : "—";
  req("credits-topup").textContent = status
    ? status.topupCredits > 0
      ? `${status.topupCredits} credits`
      : "None"
    : "—";
  req("credits-concurrency").textContent = status
    ? `${status.concurrency} at a time`
    : "—";
  req("credits-resets").textContent = status ? formatDate(status.resetsAtMs) : "—";
  req("credits-refreshed").textContent = latest ? formatTime(latest.refreshedAt) : "—";
}

function formatDate(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

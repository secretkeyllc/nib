import { useEffect, useState } from "react";

/**
 * A live "Resets in 18h 50m" countdown for one allowance window.
 *
 * Returns the formatted remainder, or `null` when there is no usable reset
 * instant — a window with no reset (unconfigured, or a plan that never
 * refreshes) simply has no countdown rather than a misleading "0m".
 *
 * Re-renders on the minute. The first render is immediate, so the value is
 * already correct when the popover opens instead of ticking in a moment later.
 */
export function useResetCountdown(resetsAt: string | undefined): string | null {
  const target = parseReset(resetsAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (target === null) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [target]);

  if (target === null) return null;
  return formatRemaining(target - now);
}

function parseReset(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * "18h 50m" / "2d 18h" / "25d 18h" / "4m".
 *
 * Two units at most: a window is never more than a month away, and
 * "25d 18h 12m 9s" is noise in a one-line readout. Seconds are dropped —
 * nobody acts on the difference between 18h 50m and 18h 49m, and a value that
 * changes every second pulls the eye away from the meter it belongs to.
 */
export function formatRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "now";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}

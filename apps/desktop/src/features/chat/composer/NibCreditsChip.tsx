/**
 * Plan + credit balance, shown inline in the composer toolbar beside the
 * context-usage readout — the same place every mainstream coding client puts
 * the "what is left of my plan" number.
 *
 * Reads through main (`pi-desktop/nib/entitlement`), which delegates to the
 * Nib plugin: the renderer never touches a provider credential. Signed out or
 * unreachable resolves to `signedIn: false` and the chip renders nothing —
 * an empty balance is a normal state, not an error.
 *
 * The popover mirrors the context inspector: same trigger geometry, same
 * placement helper, same click-to-open contract, so the two readouts in the
 * composer behave identically. It is deliberately *not* a `title` tooltip:
 * three progress rows plus a reset date do not fit on one line.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { NibEntitlement } from "@pi-desktop/shared";
import { api } from "../../../lib/api";
import {
  placeContextInspector,
  type ContextInspectorPlacement,
} from "../../../lib/context-inspector-position";
import { portalToBody } from "../../../lib/portal-visibility";
import { TooltipButton } from "../../../components/ui";

const REFRESH_MS = 5 * 60 * 1000;

type Meter = { label: string; used: number; limit: number };

function percentOf(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

export function NibCreditsChip() {
  const { t } = useTranslation();
  const [ent, setEnt] = useState<NibEntitlement | null>(null);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<ContextInspectorPlacement | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void api
        .nibEntitlement()
        .then((next) => {
          if (!cancelled) setEnt(next);
        })
        .catch(() => {
          if (!cancelled) setEnt(null);
        });
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const updatePlacement = () => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;
    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const pane = trigger.closest(".main-pane");
    const paneRect = pane ? pane.getBoundingClientRect() : null;
    const next = placeContextInspector({
      trigger: {
        top: triggerRect.top,
        bottom: triggerRect.bottom,
        left: triggerRect.left,
      },
      popover: { width: popoverRect.width, height: popoverRect.height },
      pane: paneRect ? { left: paneRect.left, right: paneRect.right } : null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    });
    if (!next) {
      setOpen(false);
      setPlacement(null);
      return;
    }
    setPlacement((previous) =>
      previous?.top === next.top &&
      previous.left === next.left &&
      previous.maxWidth === next.maxWidth
        ? previous
        : next,
    );
  };

  useLayoutEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(updatePlacement);
    return () => window.cancelAnimationFrame(frame);
  }, [open, ent]);

  useEffect(() => {
    if (!open) return;
    const onViewport = () => updatePlacement();
    window.addEventListener("resize", onViewport);
    window.addEventListener("scroll", onViewport, true);
    return () => {
      window.removeEventListener("resize", onViewport);
      window.removeEventListener("scroll", onViewport, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!ent?.signedIn) return null;

  const total = Math.round(ent.creditsTotal ?? 0);
  const used = Math.round(ent.creditsUsed ?? 0);
  const left = Math.max(0, total - used);
  const hasBalance = total > 0;

  // The chip carries only the number: "839/1000" reads as a balance, and the
  // plan name plus the wording live in the popover heading.
  const label = hasBalance
    ? `${left.toLocaleString()}/${total.toLocaleString()}`
    : (ent.planName ?? "Nib");

  const meters: Meter[] = [];
  if (ent.dailyLimit) {
    meters.push({
      label: t("nib.creditsToday"),
      used: Math.round(ent.dailyUsed ?? 0),
      limit: Math.round(ent.dailyLimit),
    });
  }
  if (ent.weeklyLimit) {
    meters.push({
      label: t("nib.creditsThisWeek"),
      used: Math.round(ent.weeklyUsed ?? 0),
      limit: Math.round(ent.weeklyLimit),
    });
  }
  if (hasBalance) {
    meters.push({
      label: t("nib.creditsThisMonth"),
      used,
      limit: total,
    });
  }

  const resetsAt = ent.resetsAt ? new Date(ent.resetsAt) : null;
  const resetLabel =
    resetsAt && Number.isFinite(resetsAt.getTime())
      ? resetsAt.toLocaleDateString()
      : null;

  const ariaLabel = hasBalance
    ? t("nib.creditsAria", {
        left: left.toLocaleString(),
        total: total.toLocaleString(),
        plan: ent.planName ?? "Nib",
      })
    : (ent.planName ?? "Nib");

  // One line on hover, the full meters on click — the same two-step the
  // context readout uses, so the two controls in this row behave alike.
  const hoverSummary = hasBalance
    ? t("nib.creditsHover", {
        plan: ent.planName ?? "Nib",
        left: left.toLocaleString(),
        total: total.toLocaleString(),
        date: resetLabel ?? "",
      })
    : ariaLabel;

  const popover = open ? (
    <div
      ref={popoverRef}
      className={`nib-credits-popover${placement ? " is-open" : ""}`}
      id={panelId}
      role="dialog"
      aria-label={ariaLabel}
      style={
        placement
          ? {
              top: `${placement.top}px`,
              left: `${placement.left}px`,
              maxWidth: `${placement.maxWidth}px`,
            }
          : undefined
      }
    >
      <div className="nib-credits-popover-heading">
        <strong className="nib-credits-popover-plan">
          {ent.planName ?? "Nib"}
        </strong>
        {resetLabel ? (
          <span className="nib-credits-popover-reset">
            {t("nib.creditsRenews", { date: resetLabel })}
          </span>
        ) : null}
      </div>
      {meters.length > 0 ? (
        <div className="nib-credits-popover-meters">
          {meters.map((meter) => {
            const percent = percentOf(meter.used, meter.limit);
            return (
              <div className="nib-credits-meter" key={meter.label}>
                <div className="nib-credits-meter-row">
                  <span className="nib-credits-meter-label">{meter.label}</span>
                  <span className="nib-credits-meter-values">
                    {meter.used.toLocaleString()} /{" "}
                    {meter.limit.toLocaleString()}
                    <span className="nib-credits-meter-percent">{percent}%</span>
                  </span>
                </div>
                <div
                  className="nib-credits-meter-track"
                  role="progressbar"
                  aria-label={meter.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                >
                  <span
                    className="nib-credits-meter-fill"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {ent.topupRemaining && ent.topupRemaining > 0 ? (
        /*
          The account balance is a second, independent allowance: it does not
          expire, it is not part of the plan, and it is spent alongside it. It
          therefore gets its own rule above it and an emphasized number, so it
          reads as a separate pool rather than as a fourth meter.
        */
        <div className="nib-credits-balance">
          {/* One line: the rule above already separates this pool, so a second
              "Account balance" heading on top of the value's own label just
              repeated the word twice. */}
          <strong className="nib-credits-balance-value">
            {t("nib.creditsBalance", {
              amount: Math.round(ent.topupRemaining).toLocaleString(),
            })}
          </strong>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <span className="nib-credits">
      <TooltipButton
        ref={triggerRef}
        type="button"
        className={`nib-credits-trigger${open ? " active" : ""}`}
        ariaLabel={ariaLabel}
        tooltip={hoverSummary}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((previous) => !previous)}
      >
        {hasBalance ? (
          <span className="nib-credits-bar" aria-hidden="true">
            <span
              className="nib-credits-fill"
              style={{ width: `${percentOf(used, total)}%` }}
            />
          </span>
        ) : null}
        <span className="nib-credits-label">{label}</span>
      </TooltipButton>
      {popover && typeof document !== "undefined"
        ? portalToBody(popover)
        : null}
    </span>
  );
}

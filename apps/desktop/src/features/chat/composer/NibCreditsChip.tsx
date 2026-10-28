/**
 * Plan + credit balance, shown inline in the composer toolbar beside the
 * context-usage readout — the same place every mainstream coding client puts
 * the "what is left of my plan" number.
 *
 * Reads through main (`pi-desktop/nib/entitlement`), which delegates to the
 * Nib plugin: the renderer never touches a provider credential. Signed out or
 * unreachable resolves to `signedIn: false` and the chip renders nothing —
 * an empty balance is a normal state, not an error.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { NibEntitlement } from "@pi-desktop/shared";
import { api } from "../../../lib/api";

const REFRESH_MS = 5 * 60 * 1000;

export function NibCreditsChip() {
  const { t } = useTranslation();
  const [ent, setEnt] = useState<NibEntitlement | null>(null);

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

  if (!ent?.signedIn) return null;

  const used = Math.round(ent.creditsUsed ?? 0);
  const total = Math.round(ent.creditsTotal ?? 0);
  const hasBalance = total > 0;
  const fraction = hasBalance ? Math.min(1, used / total) : 0;

  const label = hasBalance
    ? t("nib.creditsLeft", { left: (total - used).toLocaleString(), total: total.toLocaleString() })
    : (ent.planName ?? "Nib");

  const detail = [
    ent.planName ? `${ent.planName}` : null,
    hasBalance ? `${used.toLocaleString()} / ${total.toLocaleString()} credits` : null,
    ent.dailyLimit ? `today ${Math.round(ent.dailyUsed ?? 0)}/${Math.round(ent.dailyLimit)}` : null,
    ent.weeklyLimit ? `week ${Math.round(ent.weeklyUsed ?? 0)}/${Math.round(ent.weeklyLimit)}` : null,
    ent.resetsAt ? `resets ${new Date(ent.resetsAt).toLocaleDateString()}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span className="nib-credits" title={detail} aria-label={detail}>
      {hasBalance ? (
        <span className="nib-credits-bar" aria-hidden="true">
          <span className="nib-credits-fill" style={{ width: `${fraction * 100}%` }} />
        </span>
      ) : null}
      <span className="nib-credits-label">{label}</span>
    </span>
  );
}

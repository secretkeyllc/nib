/**
 * The account menu in the sidebar footer.
 *
 * Nib is an account-first product the way Codex and zcode are: the subscription
 * is the thing being paid for, so the account belongs in the chrome rather than
 * three levels deep in Settings. This popover is the one surface that answers
 * "who am I, what plan am I on, and how do I get out" plus the two preferences
 * people flip most often (language, appearance) without leaving the workspace.
 *
 * It reads entitlement through the same main-process bridge the composer chip
 * uses, and signs in through the same OAuth session the model settings page
 * uses — this component owns no credentials and starts no second login path.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AppSettings,
  NibEntitlement,
  ThemePreference,
} from "@pi-desktop/shared";
import { api } from "../../../lib/api";
import {
  placeContextInspector,
  type ContextInspectorPlacement,
} from "../../../lib/context-inspector-position";
import { portalToBody } from "../../../lib/portal-visibility";
import { useAppStore } from "../../../stores/app-store";
import {
  IconChevronRight,
  IconGlobe,
  IconLogOut,
  IconMonitor,
  IconMoon,
  IconSun,
  IconUser,
} from "../../../components/icons";
import { NibAccountDialog } from "./NibAccountDialog";
import { TooltipButton } from "../../../components/ui";

const REFRESH_MS = 5 * 60 * 1000;

const THEME_OPTIONS: Array<{
  id: ThemePreference;
  icon: typeof IconSun;
  labelKey: string;
}> = [
  { id: "system", icon: IconMonitor, labelKey: "nib.accountThemeSystem" },
  { id: "dark", icon: IconMoon, labelKey: "nib.accountThemeDark" },
  { id: "light", icon: IconSun, labelKey: "nib.accountThemeLight" },
];

export function NibAccountButton() {
  const { t, i18n } = useTranslation();
  const settings = useAppStore((state) => state.settings);
  const refreshProviders = useAppStore((state) => state.refreshProviders);
  const [ent, setEnt] = useState<NibEntitlement | null>(null);
  const [open, setOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<ContextInspectorPlacement | null>(
    null,
  );

  const load = () => {
    void api
      .nibEntitlement()
      .then(setEnt)
      .catch(() => setEnt(null));
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  // A finished sign-in must show up here without a reload; the dialog reports
  // success through this callback rather than the store because the provider
  // row is refreshed asynchronously.
  useEffect(() => {
    if (!signInOpen) load();
  }, [signInOpen]);

  const updatePlacement = () => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;
    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const next = placeContextInspector({
      trigger: {
        top: triggerRect.top,
        bottom: triggerRect.bottom,
        left: triggerRect.left,
      },
      popover: { width: popoverRect.width, height: popoverRect.height },
      pane: null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    });
    if (!next) {
      setOpen(false);
      setPlacement(null);
      return;
    }
    setPlacement((previous) =>
      previous?.top === next.top && previous.left === next.left
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

  const signedIn = ent?.signedIn === true;
  const planName = ent?.planName?.trim() || null;
  const total = Math.round(ent?.creditsTotal ?? 0);
  const used = Math.round(ent?.creditsUsed ?? 0);
  const left = Math.max(0, total - used);

  const accountLabel = signedIn
    ? (planName ? `${planName}` : t("nib.accountSignedIn"))
    : t("nib.accountSignedOut");

  const patchSettings = (patch: Partial<AppSettings>) => {
    if (!settings) return;
    const nextSettings = { ...settings, ...patch };
    // Optimistic: the chip and the theme attribute must flip on the same
    // frame as the click, then the host write confirms it.
    useAppStore.setState({ settings: nextSettings });
    void api
      .setSettings(nextSettings)
      .then(() => refreshProviders())
      .catch(() => useAppStore.setState({ settings }));
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await api.nibSignOut();
    } catch {
      // A sign-out that cannot reach main still clears what this surface
      // shows; leaving the menu open on a stale plan is worse.
    } finally {
      setSigningOut(false);
      setOpen(false);
      load();
    }
  };

  const popover = open ? (
    <div
      ref={popoverRef}
      className={`nib-account-popover${placement ? " is-open" : ""}`}
      id={panelId}
      role="dialog"
      aria-label={t("nib.accountTitle")}
      style={
        placement
          ? { top: `${placement.top}px`, left: `${placement.left}px` }
          : undefined
      }
    >
      <div className="nib-account-head">
        <span className="nib-account-avatar" aria-hidden>
          <IconUser size={15} />
        </span>
        <div className="nib-account-identity">
          <strong className="nib-account-name">{accountLabel}</strong>
          <span className="nib-account-plan">
            {signedIn
              ? total > 0
                ? t("nib.creditsAria", {
                    plan: planName ?? "Nib",
                    left: left.toLocaleString(),
                    total: total.toLocaleString(),
                  })
                : (planName ?? "Nib")
              : t("nib.accountSignInHint")}
          </span>
        </div>
      </div>

      <div className="nib-account-actions">
        {signedIn ? (
          <>
            <button
              type="button"
              className="nib-account-action"
              onClick={() => {
                setOpen(false);
                void api.openConsole().catch(() => undefined);
              }}
            >
              <span className="nib-account-action-label">
                {t("nib.accountManage")}
              </span>
              <IconChevronRight size={13} aria-hidden />
            </button>
            <button
              type="button"
              className="nib-account-action"
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              <span className="nib-account-action-label">
                {t("nib.accountSignOut")}
              </span>
              <IconLogOut size={13} aria-hidden />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="nib-account-action is-primary"
            onClick={() => {
              setOpen(false);
              setSignInOpen(true);
            }}
          >
            <span className="nib-account-action-label">
              {t("nib.accountSignIn")}
            </span>
            <IconChevronRight size={13} aria-hidden />
          </button>
        )}
      </div>

      <div className="nib-account-prefs">
        <div className="nib-account-pref-label">
          <IconGlobe size={13} aria-hidden />
          <span>{t("nib.accountLanguage")}</span>
        </div>
        <div className="nib-account-chips" role="group" aria-label={t("nib.accountLanguage")}>
          {["auto", "en", "zh-CN"].map((id) => {
            const active = (settings?.language ?? "auto") === id;
            return (
              <button
                key={id}
                type="button"
                className={`nib-account-chip${active ? " is-active" : ""}`}
                aria-pressed={active}
                onClick={() => {
                  patchSettings({
                    language: id as AppSettings["language"],
                  });
                  if (id !== "auto") void i18n.changeLanguage(id);
                }}
              >
                {id === "auto" ? t("nib.accountLanguageAuto") : id === "en" ? "English" : "简体中文"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="nib-account-prefs">
        <div className="nib-account-pref-label">
          <IconMonitor size={13} aria-hidden />
          <span>{t("nib.accountTheme")}</span>
        </div>
        <div className="nib-account-chips" role="group" aria-label={t("nib.accountTheme")}>
          {THEME_OPTIONS.map(({ id, icon: Icon, labelKey }) => {
            const active = (settings?.theme ?? "system") === id;
            return (
              <button
                key={id}
                type="button"
                className={`nib-account-chip${active ? " is-active" : ""}`}
                aria-pressed={active}
                onClick={() => patchSettings({ theme: id })}
              >
                <Icon size={12} aria-hidden />
                <span>{t(labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <span className="nib-account">
      <TooltipButton
        ref={triggerRef}
        type="button"
        className={`footer-action nib-account-trigger${open ? " active" : ""}`}
        data-nav="account"
        tooltip={t("nib.accountTitle")}
        ariaLabel={t("nib.accountTitle")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((previous) => !previous)}
      >
        <IconUser size={14} aria-hidden />
      </TooltipButton>
      {popover && typeof document !== "undefined"
        ? portalToBody(popover)
        : null}
      {signInOpen ? (
        <NibAccountDialog onClose={() => setSignInOpen(false)} />
      ) : null}
    </span>
  );
}

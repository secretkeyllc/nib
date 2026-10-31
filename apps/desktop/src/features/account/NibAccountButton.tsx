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
import { api } from "../../lib/api";
import { NibRemotePairingRow } from "./NibRemotePairingRow";
import { notifyAuthChanged } from "../../lib/auth-events";
import {
  placeContextInspector,
  type ContextInspectorPlacement,
} from "../../lib/context-inspector-position";
import { portalToBody } from "../../lib/portal-visibility";
import { useAppStore } from "../../stores/app-store";
import {
  IconChevronRight,
  IconGlobe,
  IconLogOut,
  IconMonitor,
  IconMoon,
  IconSun,
  IconUser,
} from "../../components/icons";
import { NibAccountDialog } from "./NibAccountDialog";
import { BrandLogo } from "../../components/BrandLogo";
import { listedLocales } from "@pi-desktop/i18n/locale-info";
import { TooltipButton } from "../../components/ui";

const REFRESH_MS = 5 * 60 * 1000;

/**
 * Locales offered by the picker, in the project's own order.
 *
 * English and the automatic choice have their own chips, so the list starts
 * after them. `listedLocales` already puts the Chinese locales last, which is
 * the order a reader scanning for them expects.
 */
const OTHER_LOCALES = listedLocales().filter((locale) => locale.id !== "en");

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

  const currentLanguage = (settings?.language ?? "auto") as string;
  const selectLanguage = (id: string) => {
    patchSettings({ language: id as AppSettings["language"] });
    if (id !== "auto") void i18n.changeLanguage(id);
  };
  const signedIn = ent?.signedIn === true;
  const planName = ent?.planName?.trim() || null;
  const total = Math.round(ent?.creditsTotal ?? 0);
  const used = Math.round(ent?.creditsUsed ?? 0);
  const left = Math.max(0, total - used);

  // The heading names the account, not the plan: "who am I signed in as" is
  // the question this menu answers, and the plan is its own line below.
  const accountLabel = signedIn
    ? (ent?.accountName?.trim() ||
       ent?.accountEmail?.trim() ||
       t("nib.accountSignedIn"))
    : t("nib.accountSignedOut");
  const accountSecondary = signedIn ? ent?.accountEmail?.trim() || null : null;

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
      // Readers elsewhere (the credits chip) must drop the balance now, not on
      // their next poll.
      notifyAuthChanged();
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
        {/* The product's own mark, not a generic person glyph: this menu is
            the Nib account, and the same logo leads the sidebar and the
            installer. */}
        <span className="nib-account-avatar" aria-hidden>
          <BrandLogo size={20} />
        </span>
        <div className="nib-account-identity">
          <strong className="nib-account-name">{accountLabel}</strong>
          {accountSecondary && accountSecondary !== accountLabel ? (
            <span className="nib-account-email">{accountSecondary}</span>
          ) : null}
          {/*
            The plan is the emphasized value here — it is what the user pays
            for — with the remaining allowance as a plain sentence beside it.
            The colon after the name read as a label/value pair; a space reads
            as prose, which is what this line is.
          */}
          <span className="nib-account-plan">
            {signedIn ? (
              <>
                <strong className="nib-account-plan-name">
                  {planName ?? "Nib"}
                </strong>
                {total > 0 ? (
                  <span className="nib-account-plan-usage">
                    {t("nib.accountPlanUsage", {
                      left: left.toLocaleString(),
                      total: total.toLocaleString(),
                    })}
                  </span>
                ) : null}
              </>
            ) : (
              t("nib.accountSignInHint")
            )}
          </span>
          {/*
            The balance sits under the plan, not inside it: it is a separate
            pool that does not expire and is spent alongside the plan, so
            folding it into the plan line would misstate what renews.
          */}
          {signedIn && ent?.topupRemaining && ent.topupRemaining > 0 ? (
            <span className="nib-account-balance">
              {t("nib.creditsBalanceTitle")}{" "}
              <strong>
                {Math.round(ent.topupRemaining).toLocaleString()}
              </strong>
            </span>
          ) : null}
        </div>
      </div>

      <div className="nib-account-actions">
        {signedIn ? (
          <>
            {/* The remote pairing is this menu's highlight feature: one tap
                unfolds the QR right here instead of sending the user three
                levels into Settings. */}
            <NibRemotePairingRow />
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
        {/*
          Two chips and a picker: the automatic choice and English are the two
          a user flips most, and everything else belongs in a list rather than
          in a row of chips that would wrap to four lines. The shipped locales
          are the product's, so they are listed in their own names and every
          one of them is reachable.
        */}
        <div className="nib-account-chips" role="group" aria-label={t("nib.accountLanguage")}>
          <button
            type="button"
            className={`nib-account-chip${currentLanguage === "auto" ? " is-active" : ""}`}
            aria-pressed={currentLanguage === "auto"}
            onClick={() => selectLanguage("auto")}
          >
            {t("nib.accountLanguageAuto")}
          </button>
          <button
            type="button"
            className={`nib-account-chip${currentLanguage === "en" ? " is-active" : ""}`}
            aria-pressed={currentLanguage === "en"}
            onClick={() => selectLanguage("en")}
          >
            English
          </button>
          <select
            className="nib-account-language-select"
            aria-label={t("nib.accountLanguageMore")}
            value={OTHER_LOCALES.some((locale) => locale.id === currentLanguage) ? currentLanguage : ""}
            onChange={(event) => {
              const value = event.target.value;
              if (value) selectLanguage(value);
            }}
          >
            <option value="">{t("nib.accountLanguageMore")}</option>
            {OTHER_LOCALES.map((locale) => (
              <option key={locale.id} value={locale.id}>
                {locale.nativeName}
              </option>
            ))}
          </select>
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

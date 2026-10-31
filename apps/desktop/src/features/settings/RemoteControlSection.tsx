import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IPC, type RemoteControlState } from "@pi-desktop/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui";
import { SettingsCard, SettingsRow } from "./primitives";

/**
 * Mobile remote control (Settings → About tab).
 *
 * Start mints one pairing link for this run; the QR encodes the same URL. The
 * web half at nib.am/remote only attaches after signing in with the same
 * account, and the pairing dies the moment this card's stop is pressed or the
 * app quits — nothing about it persists.
 */
export function RemoteControlSection() {
  const { t } = useTranslation("remote");
  const [state, setState] = useState<RemoteControlState | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signedIn = state?.error !== "NOT_SIGNED_IN";

  useEffect(() => {
    let mounted = true;
    void api
      .remoteControlGetState()
      .then((initial) => {
        if (mounted) setState(initial);
      })
      .catch(() => undefined);
    const unsubscribe = window.piDesktop?.on(IPC.event.remoteControlChanged, (payload) => {
      if (mounted && payload) setState(payload as RemoteControlState);
    });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const next = state?.active
        ? await api.remoteControlStop()
        : await api.remoteControlStart();
      setState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function regenerate() {
    setBusy(true);
    setError(null);
    try {
      setState(await api.remoteControlRegenerate());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!state?.url) return;
    try {
      await navigator.clipboard.writeText(state.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable; the QR still works */
    }
  }

  const phaseLabel = () => {
    switch (state?.phase) {
      case "connecting":
        return t("pairingPhaseConnecting");
      case "waiting":
        return t("pairingPhaseWaiting");
      case "connected":
        return t("pairingPhaseConnected");
      case "error":
        return state.error === "NOT_SIGNED_IN" ? t("pairingNotSignedIn") : t("pairingPhaseError");
      default:
        return t("pairingPhaseIdle");
    }
  };

  return (
    <SettingsCard title={t("pairingTitle")}>
      <SettingsRow title={t("pairingStatus")} description={phaseLabel()}>
        <Button variant="secondary" disabled={busy} onClick={() => void toggle()}>
          {state?.active ? t("pairingStop") : t("pairingStart")}
        </Button>
      </SettingsRow>
      {signedIn && (
        <SettingsRow title={t("pairingAutoTitle")} description={t("pairingAutoDesc")}>
          <button
            type="button"
            className={`remote-autostart${state?.autoStart ? " is-on" : ""}`}
            disabled={busy}
            aria-pressed={state?.autoStart === true}
            onClick={() => {
              setBusy(true);
              api.remoteControlSetAutoStart(!(state?.autoStart === true))
                .then((next) => setState(next))
                .catch((err) => setError(err instanceof Error ? err.message : String(err)))
                .finally(() => setBusy(false));
            }}
          >
            {state?.autoStart ? "ON" : "OFF"}
          </button>
        </SettingsRow>
      )}
      {state?.active && state.url && (
        <>
          <SettingsRow title={t("pairingLinkTitle")} description={t("pairingLinkDesc")}>
            <div className="remote-pairing">
              {state.qrDataUrl && (
                <img className="remote-pairing-qr" src={state.qrDataUrl} alt={t("pairingQrAlt")} />
              )}
              <button type="button" className="remote-pairing-copy" onClick={() => void copyLink()}>
                {copied ? t("pairingCopied") : t("pairingCopyLink")}
              </button>
            </div>
          </SettingsRow>
          <SettingsRow title={t("pairingRegenTitle")} description={t("pairingRegenDesc")}>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void regenerate()}
            >
              {t("pairingRegenAction")}
            </Button>
          </SettingsRow>
        </>
      )}
      {error && (
        <SettingsRow title={t("pairingErrorTitle")}>
          <span className="remote-pairing-error">{error}</span>
        </SettingsRow>
      )}
    </SettingsCard>
  );
}

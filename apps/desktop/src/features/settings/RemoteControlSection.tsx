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
        return t("pairing.phaseConnecting");
      case "waiting":
        return t("pairing.phaseWaiting");
      case "connected":
        return t("pairing.phaseConnected");
      case "error":
        return state.error === "NOT_SIGNED_IN" ? t("pairing.notSignedIn") : t("pairing.phaseError");
      default:
        return t("pairing.phaseIdle");
    }
  };

  return (
    <SettingsCard title={t("pairing.title")}>
      <SettingsRow title={t("pairing.status")} description={phaseLabel()}>
        <Button variant="secondary" disabled={busy} onClick={() => void toggle()}>
          {state?.active ? t("pairing.stop") : t("pairing.start")}
        </Button>
      </SettingsRow>
      {state?.active && state.url && (
        <SettingsRow title={t("pairing.linkTitle")} description={t("pairing.linkDesc")}>
          <div className="remote-pairing">
            {state.qrDataUrl && (
              <img className="remote-pairing-qr" src={state.qrDataUrl} alt={t("pairing.qrAlt")} />
            )}
            <button type="button" className="remote-pairing-copy" onClick={() => void copyLink()}>
              {copied ? t("pairing.copied") : t("pairing.copyLink")}
            </button>
          </div>
        </SettingsRow>
      )}
      {error && (
        <SettingsRow title={t("pairing.errorTitle")}>
          <span className="remote-pairing-error">{error}</span>
        </SettingsRow>
      )}
    </SettingsCard>
  );
}

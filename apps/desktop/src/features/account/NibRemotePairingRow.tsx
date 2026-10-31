import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IPC, type RemoteControlState } from "@pi-desktop/shared";
import { api } from "../../lib/api";
import { IconQrCode } from "../../components/icons";

/**
 * The mobile remote-control row inside the account popover — the feature's
 * front door. One tap starts a pairing and unfolds the QR right here, so the
 * flow never leaves the menu; the Settings → About card stays as the
 * long-form home but is no longer the only entrance.
 *
 * Lives in the `remote` namespace's flat-key convention (see the i18n
 * renderer-keys contract): every key is single-segment.
 */
export function NibRemotePairingRow({ onWorkspaceOpened }: { onWorkspaceOpened?: () => void }) {
  const { t } = useTranslation("remote");
  const [state, setState] = useState<RemoteControlState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const active = state?.active === true;
  const phase = state?.phase ?? "idle";

  const phaseLabel = () => {
    switch (phase) {
      case "connecting":
        return t("pairingPhaseConnecting");
      case "waiting":
        return t("pairingPhaseWaitingShort");
      case "connected":
        return t("pairingPhaseConnectedShort");
      case "error":
        return t("pairingPhaseError");
      default:
        return null;
    }
  };

  async function toggle() {
    setBusy(true);
    try {
      const next = active ? await api.remoteControlStop() : await api.remoteControlStart();
      setState(next);
      if (!active) setExpanded(true);
    } catch {
      // The start failure surfaces through remoteControlChanged (phase error);
      // nothing actionable inline beyond the status text.
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

  return (
    <div className="nib-remote-row">
      <button
        type="button"
        className={`nib-account-action nib-remote-toggle${phase === "connected" ? " is-live" : ""}`}
        aria-expanded={expanded}
        onClick={() => {
          if (!active) {
            void toggle();
            return;
          }
          setExpanded((v) => !v);
        }}
      >
        <IconQrCode size={13} aria-hidden />
        <span className="nib-account-action-label">{t("pairingPopoverTitle")}</span>
        <span className={`nib-remote-phase${phase === "connected" ? " is-live" : ""}`}>
          {phaseLabel() ?? t("pairingPopoverStart")}
        </span>
      </button>

      {expanded && active && state.url && (
        <div className="nib-remote-panel">
          {state.qrDataUrl && (
            <img
              className="nib-remote-qr"
              src={state.qrDataUrl}
              alt={t("pairingQrAlt")}
              width={168}
              height={168}
            />
          )}
          <div className="nib-remote-hint">{t("pairingPopoverHint")}</div>
          <div className="nib-remote-panel-actions">
            <button type="button" className="nib-remote-chip" onClick={() => void copyLink()}>
              {copied ? t("pairingCopied") : t("pairingCopyLink")}
            </button>
            <button
              type="button"
              className="nib-remote-chip is-stop"
              disabled={busy}
              onClick={() => {
                setExpanded(false);
                void toggle();
                onWorkspaceOpened?.();
              }}
            >
              {t("pairingStop")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

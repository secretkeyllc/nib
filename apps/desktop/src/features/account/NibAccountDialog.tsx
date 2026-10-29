/**
 * Sign-in sheet for the sidebar account button.
 *
 * It renders the same `OAuthLoginDialog` Settings uses, laid over the account
 * popover, so there is exactly one login implementation. The only addition is
 * finding the Nib vendor row before starting: the button is part of the chrome
 * and must work without the user knowing which vendor id backs it.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OAuthVendor } from "@pi-desktop/shared";
import { api } from "../../lib/api";
import { beginOAuthLogin, type OAuthLoginSession } from "../../lib/oauth-login-session";
import { OAuthLoginDialog } from "../../components/settings/OAuthLoginDialog";
import { useAppStore } from "../../stores/app-store";

const NIB_VENDOR_ID = "nib";

type Attempt = { vendor: OAuthVendor; session: OAuthLoginSession };

export function NibAccountDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const refreshProviders = useAppStore((state) => state.refreshProviders);
  const showToast = useAppStore((state) => state.showToast);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Starting a login opens a browser, so it must happen exactly once and from
  // an effect that StrictMode cannot double-run into two browser windows. The
  // session helper already guarantees "begin once"; this flag guards the
  // provider lookup that precedes it.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { vendors } = await api.listOauthVendors();
        if (cancelled) return;
        const vendor =
          vendors.find((candidate) => candidate.vendorId === NIB_VENDOR_ID) ??
          vendors.find((candidate) => /nib/i.test(candidate.vendorId) || /nib/i.test(candidate.name));
        if (!vendor) {
          setError(t("nib.accountVendorMissing"));
          return;
        }
        setAttempt({
          vendor,
          session: beginOAuthLogin({ api, vendorId: vendor.vendorId }),
        });
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    })();
    return () => {
      cancelled = true;
    };
    // Starts once per mount; `t` only affects an error message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => attempt?.session.dispose(), [attempt]);

  if (error) {
    return (
      <div className="overlay provider-dialog-overlay" role="presentation">
        <div className="dialog oauth-dialog" role="dialog" aria-modal="true">
          <h3 className="provider-dialog-title">{t("nib.accountSignIn")}</h3>
          <div className="oauth-error">{error}</div>
          <button type="button" className="btn" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
      </div>
    );
  }

  if (!attempt) return null;

  return (
    <OAuthLoginDialog
      vendor={attempt.vendor}
      session={attempt.session}
      onDone={() => {
        void refreshProviders();
        showToast(t("nib.accountSignedIn"), { variant: "success" });
        onClose();
      }}
      onClose={onClose}
    />
  );
}

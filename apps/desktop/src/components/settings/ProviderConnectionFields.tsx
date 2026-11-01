/**
 * The connection half of the AI service form: which service, its key, and for
 * a custom endpoint the name, URL and API format (D310, D625).
 *
 * The chosen service reads as a settled fact with a Change action rather than
 * an open menu. Whether the service answered is announced by the probe itself
 * (`useProbeFeedback`), so pasting a key is visibly the whole job on a named
 * service without a status row holding the dialog open for it.
 */
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { CatalogApiStyle } from "@pi-desktop/shared";
import { Field, Input, TooltipButton } from "../ui";
import { IconTrash } from "../icons";
import { SettingsMenuSelect } from "./SettingsMenuSelect";
import { ServiceMonogram } from "./ServiceMonogram";
import { endpointLabel } from "./service-catalog";
import { API_STYLE_LABEL_KEYS, CUSTOM_PROVIDER_API_STYLES } from "./provider-api-style";

export type ProviderConnectionFieldsProps = {
  named: boolean;
  custom: boolean;
  editing: boolean;
  saving: boolean;
  serviceLabel: string;
  /** Optional hint for a key that belongs to a Host-owned plugin row. */
  apiKeyHint?: string;
  /** Endpoint the named preset talks to; empty on a custom endpoint. */
  serviceBaseUrl: string;
  /** Hides service switching when the manifest owns this provider row. */
  lockedService?: boolean;
  /** The product's own row: the chip carries the app mark, not a letter. */
  bundledService?: boolean;
  /** No key field at all: the credential is the sign-in's, not a paste. */
  hideApiKey?: boolean;
  /**
   * Restrict the format picker to these transports. A preset normally owns
   * its format outright; the one exception is the product's own gateway,
   * which serves both OpenAI wire styles and lets the user pick.
   */
  allowedApiStyles?: readonly CatalogApiStyle[];
  /**
   * The row's identity (name, address, credential) belongs to the product, not
   * the user: the three fields render read-only and the key has no clear
   * button. Format, models and advanced settings stay editable.
   */
  lockedIdentity?: boolean;
  onChangeService: () => void;
  apiKeyRef: RefObject<HTMLInputElement | null>;
  nameRef: RefObject<HTMLInputElement | null>;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  hasSavedApiKey?: boolean;
  onClearApiKey?: () => void;
  name: string;
  onNameChange: (value: string) => void;
  baseUrl: string;
  onBaseUrlChange: (value: string) => void;
  commitBaseUrl: () => void;
  baseUrlError?: string;
  apiStyle: CatalogApiStyle;
  onApiStyleChange: (value: CatalogApiStyle) => void;
  /** What the endpoint itself said about the format, when it said anything. */
  apiStyleNote?: string;
  accountOnlyApiStyle: boolean;
  requiresApiStyleChoice: boolean;
};

export function ProviderConnectionFields({
  named,
  custom,
  editing,
  saving,
  serviceLabel,
  apiKeyHint,
  serviceBaseUrl,
  lockedService = false,
  bundledService = false,
  hideApiKey = false,
  allowedApiStyles,
  lockedIdentity = false,
  onChangeService,
  apiKeyRef,
  nameRef,
  apiKey,
  onApiKeyChange,
  hasSavedApiKey = false,
  onClearApiKey,
  name,
  onNameChange,
  baseUrl,
  onBaseUrlChange,
  commitBaseUrl,
  baseUrlError,
  apiStyle,
  onApiStyleChange,
  apiStyleNote,
  accountOnlyApiStyle,
  requiresApiStyleChoice,
}: ProviderConnectionFieldsProps) {
  const { t } = useTranslation();
  const keyHint = custom && !hasSavedApiKey
    ? t("settings.apiKeyOptionalHint")
    : editing ? t("settings.apiKeyKeepHint") : undefined;

  return (
    <div className={named ? "provider-setup-fields is-named" : "provider-setup-fields is-custom"}>
      <div
        className={`provider-setup-field-row provider-setup-service-row ${
          named ? "is-named" : "is-single"
        }`}
      >
        {/* Not a Field: its <label> would forward clicks to the Change button. */}
        <div className="block space-y-1.5">
          <div className="text-sm text-text-secondary">{t("settings.service")}</div>
          <div className="provider-service-chip">
            <ServiceMonogram name={serviceLabel} bundled={bundledService} />
            <span className="provider-service-chip-copy">
              <span className="provider-service-chip-name">{serviceLabel}</span>
              {serviceBaseUrl ? (
                <span className="provider-service-chip-host" title={serviceBaseUrl}>
                  {endpointLabel(serviceBaseUrl)}
                </span>
              ) : null}
            </span>
            {!lockedService ? (
              <button
                type="button"
                className="provider-service-chip-change"
                disabled={saving}
                onClick={onChangeService}
              >
                {t("settings.changeService")}
              </button>
            ) : null}
          </div>
        </div>

        {named && !hideApiKey ? (
          <div className="provider-setup-key">
            <Field label={t("settings.apiKey")} hint={apiKeyHint ?? keyHint}>
              <Input
                ref={apiKeyRef}
                type="password"
                value={apiKey}
                placeholder="sk-…"
                className="font-mono text-sm-plus"
                autoComplete="off"
                autoFocus
                onChange={(event) => onApiKeyChange(event.target.value)}
              />
            </Field>
          </div>
        ) : null}

        {/*
          A named preset decides its own format, with one exception: the
          product's gateway serves two OpenAI wire styles and the user picks.
          The selector takes the key field's slot on that row — the key is
          managed by the sign-in, so there is nothing to type where other
          services paste one.
        */}
        {named && allowedApiStyles && allowedApiStyles.length > 0 ? (
          <div className="provider-setup-key">
            <Field label={t("settings.apiStyle")} hint={apiStyleNote}>
              <SettingsMenuSelect
                fullWidth
                label={t("settings.apiStyle")}
                value={apiStyle}
                disabled={saving}
                onChange={(id) => onApiStyleChange(id as CatalogApiStyle)}
                options={allowedApiStyles.map((style) => ({
                  id: style,
                  label: t(API_STYLE_LABEL_KEYS[style]),
                }))}
              />
            </Field>
          </div>
        ) : null}
      </div>

      {custom ? (
        <>
          <div className="provider-setup-field-row provider-setup-custom-identity-row">
            <Field label={t("settings.name")}>
              <Input
                ref={nameRef}
                value={name}
                autoFocus={!lockedIdentity}
                readOnly={lockedIdentity}
                aria-readonly={lockedIdentity}
                onChange={(event) => onNameChange(event.target.value)}
              />
            </Field>
            <div className="provider-setup-base-url">
              <Field label={t("settings.baseUrl")}>
                <Input
                  value={baseUrl}
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  className="font-mono text-sm-plus"
                  placeholder="https://api.example.com/v1"
                  aria-invalid={Boolean(baseUrlError)}
                  aria-describedby={baseUrlError ? "provider-base-url-error" : undefined}
                  readOnly={lockedIdentity}
                  aria-readonly={lockedIdentity}
                  onChange={(event) => onBaseUrlChange(event.target.value)}
                  onBlur={commitBaseUrl}
                />
                {baseUrlError ? (
                  <div
                    id="provider-base-url-error"
                    className="provider-setup-field-error"
                    role="alert"
                  >
                    {baseUrlError}
                  </div>
                ) : null}
              </Field>
            </div>
          </div>
          <div className="provider-setup-field-row provider-setup-custom-auth-row">
            <div className="provider-setup-key">
              <Field
                label={t("settings.apiKey")}
                hint={lockedIdentity ? t("settings.lockedIdentityKeyHint") : keyHint}
              >
                <div className="provider-setup-key-control">
                  <Input
                    ref={apiKeyRef}
                    type="password"
                    value={apiKey}
                    placeholder="sk-…"
                    className="font-mono text-sm-plus"
                    autoComplete="off"
                    disabled={saving || lockedIdentity}
                    readOnly={lockedIdentity}
                    aria-readonly={lockedIdentity}
                    onChange={(event) => onApiKeyChange(event.target.value)}
                  />
                  {hasSavedApiKey && onClearApiKey && !lockedIdentity ? (
                    <TooltipButton
                      type="button"
                      className="icon-btn icon-btn-square"
                      tooltip={t("settings.clearApiKey")}
                      ariaLabel={t("settings.clearApiKey")}
                      disabled={saving}
                      onClick={onClearApiKey}
                    >
                      <IconTrash size={14} aria-hidden />
                    </TooltipButton>
                  ) : null}
                </div>
              </Field>
            </div>
            <Field
              label={t("settings.apiStyle")}
              hint={apiStyleNote ?? (accountOnlyApiStyle ? t(requiresApiStyleChoice
                ? "settings.apiStyleChooseCustom"
                : "settings.apiStyleLegacyAccount") : undefined)}
            >
              <SettingsMenuSelect
                fullWidth
                label={t("settings.apiStyle")}
                value={apiStyle}
                disabled={saving}
                onChange={(id) => onApiStyleChange(id as CatalogApiStyle)}
                options={[
                  ...(accountOnlyApiStyle
                    ? [{
                        id: apiStyle,
                        label: t(API_STYLE_LABEL_KEYS[apiStyle]),
                        disabled: true,
                      }]
                    : []),
                  ...CUSTOM_PROVIDER_API_STYLES.map((style) => ({
                    id: style,
                    label: t(API_STYLE_LABEL_KEYS[style]),
                  })),
                ]}
              />
            </Field>
          </div>
        </>
      ) : null}
    </div>
  );
}

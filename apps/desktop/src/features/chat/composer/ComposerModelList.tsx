import { formatTokenCount, type ModelInfo, type ProviderPublic } from "@pi-desktop/shared";
import type { TFunction } from "i18next";
import type { RefObject } from "react";
import { IconCheck, IconChevronDown, IconChevronRight, IconEye, IconSearch, IconSparkles } from "../../../components/icons";
import {
  composerModelBadges,
  composerModelBinding,
  composerModelDisplayName,
  sameComposerModelId,
} from "../../../lib/composer-models";
import { providerDisplayName } from "../../../lib/provider-display";

export type ComposerModelGroup = {
  provider: ProviderPublic;
  providerDisplayName: string;
  models: ModelInfo[];
};

/** Shared model list. Selection is owned by the caller, never by this view. */
export function ComposerModelList({
  t, query, setQuery, modelSearchRef, modelListRef, modelGroups,
  modelHighlight, setModelHighlight, selectedProviderId, selectedModelId, selectModel,
  currentEntry, recentEntries, hasOtherModels, otherModelsExpanded, setOtherModelsExpanded,
}: {
  /**
   * The model this conversation is on, resolved against the visible groups.
   * It gets its own section above recents: with dozens of models plus search,
   * the checked row is easy to lose, and "which model am I on" is the first
   * question this menu has to answer.
   */
  currentEntry?: { provider: ProviderPublic; model: ModelInfo } | null;
  recentEntries: Array<{ provider: ProviderPublic; model: ModelInfo }>;
  hasOtherModels: boolean;
  otherModelsExpanded: boolean;
  setOtherModelsExpanded: (expanded: boolean) => void;
  t: TFunction;
  query: string;
  setQuery: (query: string) => void;
  modelSearchRef: RefObject<HTMLInputElement | null>;
  modelListRef: RefObject<HTMLDivElement | null>;
  modelGroups: ComposerModelGroup[];
  modelHighlight: number;
  setModelHighlight: (index: number) => void;
  selectedProviderId?: string;
  selectedModelId?: string;
  selectModel: (provider: ProviderPublic, modelId: string) => void | Promise<void>;
}) {
  const flatModels = modelGroups.flatMap(group => group.models);
  const currentKey = currentEntry
    ? `${currentEntry.provider.id}:${currentEntry.model.modelId}`
    : null;
  // Recents never repeat the row pinned above them.
  const recentWithoutCurrent = currentKey
    ? recentEntries.filter(
        ({ provider, model }) => `${provider.id}:${model.modelId}` !== currentKey,
      )
    : recentEntries;
  return <>
              <label className="composer-model-search">
                <IconSearch size={13} aria-hidden="true" />
                <span className="sr-only">{t("chat.searchModels")}</span>
                <input
                  ref={modelSearchRef}
                  type="text"
                  value={query}
                  placeholder={t("chat.searchModels")}
                  aria-label={t("chat.searchModels")}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  onChange={(event) => setQuery(event.target.value)}
                  onBlur={() => setModelHighlight(-1)}
                />
              </label>
              <div className="composer-model-list" ref={modelListRef}>
                {currentEntry ? (
                  <div className="composer-model-group" role="group" aria-label={t("chat.currentModel")}>
                    <div className="composer-model-group-label">{t("chat.currentModel")}</div>
                    <button
                      type="button" role="menuitemradio" aria-checked="true"
                      data-model-index={0}
                      className={`composer-plus-item composer-model-option active ${modelHighlight === 0 ? "kb-active" : ""}`}
                      title={`${providerDisplayName(currentEntry.provider)} · ${currentEntry.model.modelId}`}
                      onClick={() => void selectModel(currentEntry.provider, currentEntry.model.modelId)}
                    >
                      <span className="composer-model-option-main">
                        <span className="composer-model-label">
                          {composerModelDisplayName(currentEntry.provider, currentEntry.model.modelId, currentEntry.model.displayName)}
                        </span>
                        <span className="composer-model-option-meta" title={providerDisplayName(currentEntry.provider)}>
                          {providerDisplayName(currentEntry.provider)}
                        </span>
                      </span>
                      <IconCheck size={14} aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
                {recentWithoutCurrent.length > 0 ? (
                  <div className="composer-model-group" role="group" aria-label={t("chat.recentModels")}>
                    <div className="composer-model-group-label">{t("chat.recentModels")}</div>
                    {recentWithoutCurrent.map(({ provider, model }, index) => {
                      const active = provider.id === selectedProviderId && sameComposerModelId(model.modelId, selectedModelId ?? "");
                      const rowIndex = index + (currentEntry ? 1 : 0);
                      return (
                        <button
                          key={`${provider.id}:${model.modelId}`}
                          type="button" role="menuitemradio" aria-checked={active}
                          data-model-index={rowIndex}
                          className={`composer-plus-item composer-model-option ${modelHighlight === rowIndex ? "kb-active" : ""}`}
                          title={`${providerDisplayName(provider)} · ${model.modelId}`}
                          onClick={() => void selectModel(provider, model.modelId)}
                        >
                          <span className="composer-model-option-main">
                            <span className="composer-model-label">{composerModelDisplayName(provider, model.modelId, model.displayName)}</span>
                            <span className="composer-model-option-meta" title={providerDisplayName(provider)}>
                              {providerDisplayName(provider)}
                            </span>
                          </span>
                          {active ? <IconCheck size={14} aria-hidden="true" /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {hasOtherModels ? (
                  <button type="button" className="composer-menu-entry" role="menuitem"
                    aria-expanded={otherModelsExpanded}
                    onClick={() => setOtherModelsExpanded(!otherModelsExpanded)}>
                    {otherModelsExpanded ? <IconChevronDown size={14} aria-hidden="true" /> : <IconChevronRight size={14} aria-hidden="true" />}
                    <span className="composer-menu-entry-label">{t("chat.otherModels")}</span>
                  </button>
                ) : null}
                {(() => {
                  let flatIndex = recentWithoutCurrent.length + (currentEntry ? 1 : 0);
                  return modelGroups.map((group) => (
                    <div
                      key={group.provider.id}
                      className="composer-model-group"
                      role="group"
                      aria-label={group.providerDisplayName}
                    >
                      <div className="composer-model-group-label">{group.providerDisplayName}</div>
                      {group.models.map((model) => {
                        const index = flatIndex++;
                        const active =
                          selectedProviderId === group.provider.id &&
                          sameComposerModelId(selectedModelId ?? "", model.modelId);
                        const optionTitle = model.modelId;
                        const alias = composerModelBinding(
                          group.provider,
                          model.modelId,
                        )?.alias?.trim();
                        const optionDisplayName = composerModelDisplayName(
                          group.provider,
                          model.modelId,
                        );
                        return (
                          <button
                            key={`${group.provider.id}:${model.modelId}`}
                            type="button"
                            data-model-index={index}
                            title={optionTitle}
                            className={`composer-plus-item composer-model-option ${active ? "active" : ""} ${modelHighlight === index ? "kb-active" : ""}`}
                            role="menuitemradio"
                            aria-checked={active}
                            onClick={() => void selectModel(group.provider, model.modelId)}
                          >
                            <span className="composer-model-option-main">
                              {/*
                                One label per row, never both: the name the user
                                set wins over the catalog's, and an alias carries
                                its own tone so which one is on screen stays
                                visible. The wire id remains the row's title, so
                                identity is still one hover away.
                              */}
                              <span
                                className={`composer-model-label ${alias ? "is-alias" : ""}`}
                              >
                                {alias || optionDisplayName}
                              </span>
                              <span className="composer-model-option-meta" title={optionTitle}>
                                {composerModelBadges(model, group.provider).map((badge) => {
                                  const badgeLabel = t(
                                    badge === "reasoning"
                                      ? "chat.modelBadgeReasoning"
                                      : "chat.modelBadgeVision",
                                  );
                                  return (
                                    <span
                                      key={badge}
                                      className="composer-model-option-badge"
                                      title={badgeLabel}
                                      aria-label={badgeLabel}
                                      role="img"
                                    >
                                      {badge === "reasoning" ? (
                                        <IconSparkles size={12} aria-hidden="true" />
                                      ) : (
                                        <IconEye size={12} aria-hidden="true" />
                                      )}
                                    </span>
                                  );
                                })}
                                {model.contextWindow ? (
                                  <span className="composer-model-option-ctx">
                                    {formatTokenCount(model.contextWindow)}
                                  </span>
                                ) : null}
                              </span>
                            </span>
                            {active ? <IconCheck size={14} className="composer-model-check" aria-hidden="true" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ));
                })()}
                {flatModels.length === 0 && recentWithoutCurrent.length === 0 && !currentEntry ? (
                  <div className="composer-model-empty">{t("chat.noModelResults")}</div>
                ) : null}
              </div>
  </>;
}

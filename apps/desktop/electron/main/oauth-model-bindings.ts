import type { ModelConfig } from "@pi-desktop/agent-runtime";
import type { PluginProviderModelContrib } from "@pi-desktop/plugin-sdk";
import {
  bindingForCustomModel,
  resolveBindingLimits,
  sortThinkingLevels,
  type ModelBinding,
} from "@pi-desktop/shared";

/** Only an unchanged manifest seed may expand to the account's full list. */
export function isPluginModelSelectionUnconfigured(
  selected: readonly ModelBinding[],
  declared: readonly PluginProviderModelContrib[] | undefined,
): boolean {
  if (!declared || selected.length !== declared.length) return false;
  return selected.every((binding, index) => {
    const seed = declared[index];
    return binding.id === seed.id &&
      binding.contextWindowSource === undefined &&
      binding.maxTokensSource === undefined &&
      binding.contextWindow === (seed.contextWindow ?? 128_000) &&
      binding.maxTokens === (seed.maxTokens ?? 8_192) &&
      JSON.stringify(binding.thinkingLevels) === JSON.stringify(seed.thinkingLevels ?? []) &&
      (binding.defaultThinkingLevel ?? null) === (seed.defaultThinkingLevel ?? seed.thinkingLevels?.[0] ?? null) &&
      !binding.alias &&
      (binding.supportsImages == null || binding.supportsImages === seed.supportsImages) &&
      binding.supportsDocuments == null &&
      !binding.availableForSubagents && !binding.nativeWebSearch && !binding.fastModeAllowed;
  });
}

/** Published limits seed new choices; independent user overrides stay intact. */
export function pluginModelBinding(
  modelId: string,
  config: ModelConfig | undefined,
  selected?: ModelBinding,
): ModelBinding {
  if (!config) return selected ?? bindingForCustomModel(modelId);
  // The raw published limit must not inherit this account's saved override.
  const published = {
    source: config.source,
    contextWindow: config.limit?.context ?? config.contextWindow,
    maxTokens: config.limit?.output ?? config.maxTokens,
  };
  const levels = sortThinkingLevels(config.supportedThinkingLevels ?? []);
  const seed = {
    ...bindingForCustomModel(modelId),
    ...(config.source !== "generic" ? {
      contextWindow: published.contextWindow,
      maxTokens: published.maxTokens,
      thinkingLevels: levels,
      defaultThinkingLevel: levels.includes("medium") ? "medium" as const : levels[0] ?? null,
      ...(config.thinkingProtocol ? { thinkingProtocol: config.thinkingProtocol } : {}),
    } : {}),
  };
  return resolveBindingLimits(published, selected ?? seed).binding;
}

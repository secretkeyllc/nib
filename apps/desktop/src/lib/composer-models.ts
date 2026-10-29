import {
  bindingSupportsImages,
  effectiveContextWindow,
  isImageGenerationModel,
  type ImageGenerationBindings,
  modelMatchesFilter,
  modelWireIdsEqual,
  type ModelBinding,
  type ModelInfo,
  type ProviderPublic,
} from "@pi-desktop/shared";

type ConfiguredProvider = Pick<ProviderPublic, "id" | "models" | "defaultModelId">;

/** UI identity is the complete wire id, not a catalog alias or a route suffix. */
export function sameComposerModelId(left: string, right: string): boolean {
  return modelWireIdsEqual(left, right);
}

function configuredModelIds(provider: ConfiguredProvider): string[] {
  const ids = (provider.models ?? [])
    .map((binding) => binding.id.trim())
    .filter(Boolean);
  if (ids.length > 0) return [...new Set(ids)];

  const legacyId = provider.defaultModelId?.trim();
  return legacyId ? [legacyId] : [];
}

/**
 * Build the Composer model list from the models explicitly enabled in
 * provider settings. Discovery only enriches an exact configured id; it does
 * not grant every discovered model access to the conversation picker or lend
 * another route's capabilities to this binding.
 */
export function composerModelsForProvider(
  provider: ConfiguredProvider,
  discovered: readonly ModelInfo[] | undefined,
  imageGeneration?: ImageGenerationBindings | null,
): ModelInfo[] {
  // Upstream only offers ids the user explicitly enabled in provider settings,
  // because for most vendors discovery returning hundreds of catalogue rows
  // would flood the picker. A gateway the user signed in to is the exception:
  // its catalogue IS the entitlement ("every model on every plan"), so the
  // discovered list is what the picker should show. Configured ids stay first.
  const discoveredIds = (discovered ?? []).map((model) => model.modelId);
  const ids = discoveredIds.length > 0
    ? [...new Set([...configuredModelIds(provider), ...discoveredIds])]
    : configuredModelIds(provider);

  return ids.filter((modelId) =>
    !isImageGenerationModel(imageGeneration, provider.id, modelId)
      && !(discovered ?? []).some((model) =>
        sameComposerModelId(model.modelId, modelId) && model.discoveryState === "unlisted"),
  ).map((modelId) => {
    const metadata = (discovered ?? []).find((model) =>
      sameComposerModelId(model.modelId, modelId),
    );
    const binding = composerModelBinding(provider, modelId);
    const contextWindow = effectiveContextWindow(
      metadata?.contextWindow,
      binding?.contextWindow,
      binding?.contextWindowSource,
    );
    const contextLimit = contextWindow === undefined ? {} : { contextWindow };
    // `displayName` stays the published name (or the wire id): it is ModelInfo
    // identity, read by the settings panel and the runtime. The readable label
    // the picker shows is derived at render time by composerModelDisplayName.
    const displayName = modelId;
    return metadata
      ? { ...metadata, ...contextLimit, modelId, displayName, providerId: provider.id }
      : {
          modelId,
          displayName,
          providerId: provider.id,
          ...contextLimit,
          capabilities: ["text"],
          source: "user" as const,
        };
  });
}

/**
 * A readable product name derived from a wire id.
 *
 * The gateway publishes ids only, so a picker fed from it would otherwise list
 * `claude-haiku-4-5-20251001` and `gpt-6-astra` next to each other — the first
 * unreadable, the second fine. This turns an id into the shape its publisher
 * uses: family and version capitalised, context qualifiers dropped.
 *
 * It is a display transform and nothing else: the id returned here is never
 * used for a request, so an imperfect rendering costs a label, not a call.
 */
export function friendlyModelName(modelId: string): string {
  const raw = modelId.trim();
  if (!raw) return raw;
  // Keep vendor namespacing (`openai/gpt-5`) but only decorate the leaf.
  const slash = raw.lastIndexOf("/");
  const prefix = slash >= 0 ? raw.slice(0, slash + 1) : "";
  const leaf = slash >= 0 ? raw.slice(slash + 1) : raw;

  const words: string[] = [];
  for (const segment of leaf.split(/[-_]/).filter(Boolean)) {
    // A dated snapshot (`20251001`) or a trailing revision adds nothing a
    // user chooses between; the id still carries it on hover.
    if (/^\d{6,}$/.test(segment)) continue;
    words.push(segment);
  }
  if (words.length === 0) return raw;

  const named: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const previous = words[index - 1];
    // Acronyms that are always written in caps.
    if (/^(gpt|glm|llm|ai|api|ocr|vl)$/i.test(word) && /^[a-z]+$/i.test(word)) {
      named.push(word.toUpperCase());
      continue;
    }
    // Brand names whose own capitalisation is not Title Case.
    if (/^deepseek$/i.test(word)) {
      named.push("DeepSeek");
      continue;
    }
    if (/^openai$/i.test(word)) {
      named.push("OpenAI");
      continue;
    }
    if (/^\d/.test(word)) {
      // `4-5` is a version pair, not a number and a word: join with a dot.
      const next = words[index + 1];
      const previousIsNumber = previous !== undefined && /^\d+$/.test(previous);
      if (previousIsNumber) {
        named[named.length - 1] = `${named[named.length - 1]}.${word}`;
      } else if (next !== undefined && /^\d+$/.test(next)) {
        named.push(word);
      } else {
        named.push(word);
      }
      continue;
    }
    if (/^(flash|pro|mini|nano|lite|max|turbo|thinking|reasoning)$/i.test(word)) {
      // Qualifiers are products in their own right on these families.
      named.push(word[0].toUpperCase() + word.slice(1));
      continue;
    }
    named.push(word[0].toUpperCase() + word.slice(1));
  }
  return prefix + named.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * The label a model row shows: the alias the user set, else the published
 * name, else a readable form of the wire id.
 *
 * The wire id stays the row's `title`, so identity is one hover away and a
 * transform mistake is never silently accepted as the real model.
 */
export function composerModelDisplayName(
  provider: ConfiguredProvider | undefined,
  modelId: string,
  publishedName?: string,
): string {
  const alias = provider ? composerModelBinding(provider, modelId)?.alias?.trim() : undefined;
  if (alias) return alias;
  const published = publishedName?.trim();
  // A published name identical to the id is not a name; it is the id.
  if (published && published.toLowerCase() !== modelId.trim().toLowerCase()) {
    return published;
  }
  return friendlyModelName(modelId);
}

/** Find only the binding for this complete wire id. */
export function composerModelBinding(
  provider: ConfiguredProvider,
  modelId: string,
): ModelBinding | undefined {
  return (provider.models ?? []).find((candidate) =>
    sameComposerModelId(candidate.id, modelId),
  );
}

/** Short capability markers shown on a composer model row. */
export type ComposerModelBadge = "reasoning" | "vision";

/**
 * Capability markers for one configured model. Vision follows the binding's
 * image-input override when set, the published capability otherwise.
 */
export function composerModelBadges(
  model: ModelInfo,
  provider?: ConfiguredProvider | null,
): ComposerModelBadge[] {
  const badges: ComposerModelBadge[] = [];
  if (modelMatchesFilter(model, "reasoning")) badges.push("reasoning");
  const binding = provider ? composerModelBinding(provider, model.modelId) : undefined;
  if (bindingSupportsImages(binding, model)) badges.push("vision");
  return badges;
}

/** Search the full id, configured alias, published name, family and provider. */
export function composerModelMatchesQuery(
  model: ModelInfo,
  providerName: string,
  query: string,
  alias?: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystacks = [
    model.modelId,
    alias ?? "",
    model.displayName ?? "",
    model.family ?? "",
    providerName,
  ];
  return haystacks.some((value) => value.toLowerCase().includes(needle));
}

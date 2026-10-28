import { OAUTH_AUTH_KIND } from "@pi-desktop/shared";
import { sameComposerModelId } from "./composer-models";

type TranscriptMessage = {
  role: string;
  content?: string;
  thinking?: string;
  error?: unknown;
};

/** An assistant row that only carries a launch error is still the conversation. */
export function messageHasTranscriptContent(message: TranscriptMessage): boolean {
  const hasContent = Boolean((message.content || "").trim());
  const hasThinking =
    typeof message.thinking === "string" && Boolean(message.thinking.trim());
  if (message.role === "assistant") {
    return hasContent || hasThinking || Boolean(message.error);
  }
  return hasContent || message.role === "tool";
}

type VendorSessionModel = {
  providerId?: string | null;
  modelId?: string | null;
};

type VendorModelProvider = {
  id: string;
  authKind?: string;
  models?: ReadonlyArray<{ id: string }>;
};

/**
 * Vendor accounts refuse a session model the account list did not return.
 * An empty list means the catalog has not loaded, not that the account
 * offers nothing, so it must not turn a normal empty chat into an error.
 */
export function vendorAccountOmitsSessionModel(
  session: VendorSessionModel | null | undefined,
  providers: readonly VendorModelProvider[],
  /** Models the account's catalogue actually reported, keyed by provider id. */
  discoveredByProvider?: Readonly<Record<string, ReadonlyArray<{ modelId: string }>>>,
): boolean {
  const providerId = session?.providerId?.trim();
  const modelId = session?.modelId?.trim();
  if (!providerId || !modelId) return false;
  const provider = providers.find((item) => item.id === providerId);
  if (!provider || provider.authKind !== OAUTH_AUTH_KIND) return false;

  // The manifest's list is only the pre-login fallback. Once discovery has
  // reported the real catalogue, that catalogue is the authority — otherwise
  // every model a gateway adds looks unsupported and the chat shows a
  // permanent "model not configured" banner over a working conversation.
  const discovered = discoveredByProvider?.[providerId] ?? [];
  if (discovered.length > 0) {
    return !discovered.some((model) => sameComposerModelId(model.modelId, modelId));
  }

  const models = provider.models ?? [];
  if (models.length === 0) return false;
  return !models.some((model) => sameComposerModelId(model.id, modelId));
}

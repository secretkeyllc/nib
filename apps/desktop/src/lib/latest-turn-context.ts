import type {
  ContextCompactionMark,
  MessageUsage,
  ModelInfo,
  ProviderPublic,
  UiMessage,
} from "@pi-desktop/shared";
import { resolveContextWindow } from "./context-usage";
import { getSessionMessageSnapshot } from "./session-transcript-updates";
import { getTranscriptProjection } from "./transcript-projection";
import { getAssistantTurnSummary } from "./transcript-summary";

export type LatestTurnContextInspector = {
  usage: MessageUsage;
  turnUsage: MessageUsage;
  contextWindow: number;
  tools: UiMessage[];
  responseDurationMs?: number;
  responseOutputTokens?: number;
  responseOutputEstimated: boolean;
};

const inspectors = new WeakMap<object, LatestTurnContextInspector>();

function sameUsage(previous: MessageUsage, next: MessageUsage): boolean {
  return previous === next || (
    Object.keys(previous).length === Object.keys(next).length &&
    Object.keys(next).every((key) => previous[key as keyof MessageUsage] === next[key as keyof MessageUsage])
  );
}

/**
 * Whether the newest usage-bearing message is at or before the checkpoint's
 * `throughMessageId` — i.e. the compaction has already swallowed that turn and
 * its usage describes a context that no longer exists.
 *
 * Position matters: a turn that arrived AFTER the covered message (the retry
 * that follows a compaction mid-turn) still describes the live context, so the
 * checkpoint must not override it.
 */
function usageLiesWithinCompaction(
  messages: UiMessage[],
  compaction: ContextCompactionMark,
  usageMessage: UiMessage,
): boolean {
  if (!compaction.throughMessageId) return false;
  const coveredIndex = messages.findIndex((m) => m.id === compaction.throughMessageId);
  if (coveredIndex === -1) {
    // The covered message is gone from the visible list. Only treat that as
    // "usage is inside the compaction" when the usage message is also gone
    // from view; a usage row we can see postdates the checkpoint.
    return messages.every((m) => m.id !== usageMessage.id);
  }
  const usageIndex = messages.findIndex((m) => m.id === usageMessage.id);
  if (usageIndex === -1) return true;
  return usageIndex <= coveredIndex;
}

/** Summary tokens plus the retained tail's own tokens (estimate). */
function compactionFootprintTokens(compaction: ContextCompactionMark): number {
  // summaryTokens is an estimate (chars/4) and the retained tail is carried
  // verbatim in the checkpoint; the caller only has the mark here, so the
  // summary is the whole footprint. A next turn refreshes the real figure.
  return Math.max(1, Math.round(compaction.summaryTokens));
}

/**
 * The composer mirrors the newest parent turn with usage, not a later live turn
 * without totals. It shares the transcript projection instead of rebuilding it.
 */
export function latestTurnContextInspector(
  messages: UiMessage[],
  providerModels: Record<string, ModelInfo[]>,
  providers: ProviderPublic[],
  compactions?: readonly ContextCompactionMark[],
): LatestTurnContextInspector | undefined {
  let latestUsageMessage: UiMessage | undefined;
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (!message.parentToolCallId && message.usage) {
      latestUsageMessage = message;
      break;
    }
  }
  const latestUsage = latestUsageMessage?.usage;
  if (!latestUsage) return undefined;

  // A compaction rewrites the conversation the earlier turns filled, so the
  // newest turn's usage no longer describes what the model holds. Nothing runs
  // after /compact until the next prompt, so the ring would otherwise sit on
  // the pre-compaction occupancy. When the latest checkpoint covers (or comes
  // after) the newest usage turn, the checkpoint's own footprint is the honest
  // occupancy: the summary tokens plus the retained tail.
  const lastCompaction = compactions && compactions.length > 0 ? compactions[compactions.length - 1] : undefined;
  const compactionSupersedesUsage =
    lastCompaction !== undefined &&
    latestUsageMessage !== undefined &&
    usageLiesWithinCompaction(messages, lastCompaction, latestUsageMessage);
  const effectiveUsage: MessageUsage =
    lastCompaction !== undefined && compactionSupersedesUsage
      ? {
          inputTokens: compactionFootprintTokens(lastCompaction),
          outputTokens: 0,
          totalTokens: compactionFootprintTokens(lastCompaction),
        }
      : latestUsage;

  const { entries } = getTranscriptProjection(messages, compactions);
  let latestTurn: ReturnType<typeof getAssistantTurnSummary> | undefined;
  for (let index = entries.length - 1; index >= 0; index--) {
    const entry = entries[index];
    if (entry.kind !== "assistant-turn") continue;
    const summary = getAssistantTurnSummary(entry);
    latestTurn ??= summary;
    if (summary.usage) {
      latestTurn = summary;
      break;
    }
  }
  const result: LatestTurnContextInspector = {
    usage: effectiveUsage,
    turnUsage: latestTurn?.usage ?? latestUsage,
    contextWindow: resolveContextWindow(
      latestUsageMessage?.providerId,
      latestUsageMessage?.modelId,
      providerModels,
      providers,
    ),
    tools: latestTurn?.tools ?? [],
    responseDurationMs: latestTurn?.responseDurationMs,
    responseOutputTokens: latestTurn?.responseOutputTokens,
    responseOutputEstimated: latestTurn?.responseOutputEstimated ?? false,
  };
  const owner = getSessionMessageSnapshot(messages).owner;
  const previous = inspectors.get(owner);
  if (previous && previous.usage === result.usage &&
    sameUsage(previous.turnUsage, result.turnUsage) &&
    previous.contextWindow === result.contextWindow &&
    previous.responseDurationMs === result.responseDurationMs &&
    previous.responseOutputTokens === result.responseOutputTokens &&
    previous.responseOutputEstimated === result.responseOutputEstimated &&
    previous.tools.length === result.tools.length &&
    previous.tools.every((tool, index) => tool === result.tools[index])
  ) return previous;
  inspectors.set(owner, result);
  return result;
}

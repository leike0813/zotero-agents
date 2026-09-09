type TranscriptProjectionItem = {
  kind?: string;
  state?: string;
};

export type TranscriptPageProjectionResult<T> = {
  items: T[];
  cursor: number;
  prevCursor?: number;
  nextCursor?: number;
  total: number;
};

function normalizeLimit(args: {
  limit?: number;
  defaultLimit: number;
  maxLimit: number;
}) {
  return Math.max(
    1,
    Math.min(
      args.maxLimit,
      Math.floor(Number(args.limit || args.defaultLimit)),
    ),
  );
}

export function isUiHiddenStreamingTranscriptItem(
  item: TranscriptProjectionItem | undefined,
) {
  return (
    !!item &&
    (item.kind === "message" || item.kind === "thought") &&
    item.state === "streaming"
  );
}

export function readUiVisibleTranscriptPage<
  T extends TranscriptProjectionItem,
>(args: {
  itemIds: string[];
  getItem: (itemId: string) => T | undefined;
  cloneItem: (item: T) => T;
  executionDisplayMode: AssistantExecutionDisplayMode;
  cursor?: number;
  limit?: number;
  defaultLimit: number;
  maxLimit: number;
}): TranscriptPageProjectionResult<T> & { limit: number } {
  const limit = normalizeLimit({
    limit: args.limit,
    defaultLimit: args.defaultLimit,
    maxLimit: args.maxLimit,
  });
  const visibleItems = args.itemIds
    .map((itemId) => args.getItem(itemId))
    .filter((item): item is T => {
      if (!item) {
        return false;
      }
      return (
        args.executionDisplayMode === "live" ||
        !isUiHiddenStreamingTranscriptItem(item)
      );
    });
  const total = visibleItems.length;
  const requestedCursor =
    typeof args.cursor === "number" && Number.isFinite(args.cursor)
      ? Math.max(0, Math.floor(args.cursor))
      : Math.max(0, total - limit);
  const cursor = Math.min(requestedCursor, total);
  const pageItems = visibleItems
    .slice(cursor, cursor + limit)
    .map((item) => args.cloneItem(item));
  const prevCursor = cursor > 0 ? Math.max(0, cursor - limit) : undefined;
  const nextCursor =
    cursor + pageItems.length < total ? cursor + pageItems.length : undefined;
  return {
    items: pageItems,
    cursor,
    prevCursor,
    nextCursor,
    total,
    limit,
  };
}
import type { AssistantExecutionDisplayMode } from "./assistantExecutionDisplayPolicy";

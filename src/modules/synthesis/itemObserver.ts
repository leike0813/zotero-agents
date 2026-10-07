import type { SynthesisClient } from "../../../packages/synthesis-contracts/src/index";
import { getDefaultSynthesisClient } from "../synthesisClient/defaultClient";
import { parseNoteKind } from "../zoteroHost/notePayloadCodec";
import type { SynthesisPortableItemRef } from "../../../packages/synthesis-contracts/src/search";
import { createNativeSynthesisRetrievalPort } from "../synthesisClient/nativeComposition";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeLibraryId(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function relatedItemKeyFromExtra(extraRow: Record<string, unknown>) {
  for (const key of [
    "relatedItemKey",
    "related_item_key",
    "targetItemKey",
    "target_item_key",
  ]) {
    const value = cleanString(extraRow[key]);
    if (value) {
      return value;
    }
  }
  const related = extraRow.relatedItem || extraRow.targetItem;
  if (isObject(related)) {
    return cleanString(related.key);
  }
  return "";
}

function resolveItem(id: string | number) {
  const zotero = (globalThis as { Zotero?: any }).Zotero;
  try {
    return zotero?.Items?.get?.(Number(id)) || null;
  } catch {
    return null;
  }
}

function shouldInspectNotifierEcho(event: string) {
  const normalized = cleanString(event).toLowerCase();
  return normalized === "modify" || normalized === "refresh";
}

function shouldInvalidateLibraryReadModel(event: string) {
  const normalized = cleanString(event).toLowerCase();
  return (
    normalized === "add" ||
    normalized === "modify" ||
    normalized === "delete" ||
    normalized === "trash" ||
    normalized === "refresh" ||
    normalized === "remove" ||
    normalized === "erase"
  );
}

function extraRowForId(
  extraData: Record<string, unknown> | undefined,
  id: string | number,
) {
  const extra = extraData?.[String(id)];
  return isObject(extra) ? extra : {};
}

function isChildItemType(value: unknown) {
  const normalized = cleanString(value).toLowerCase();
  return normalized === "attachment" || normalized === "note";
}

function isLiteratureScoreNote(item: any) {
  try {
    return (
      typeof item?.isNote === "function" &&
      item.isNote() &&
      parseNoteKind(item.getNote?.()) === "literature-score"
    );
  } catch {
    return false;
  }
}

function isLiteratureScoreChildChange(
  id: string | number,
  extraRow: Record<string, unknown>,
) {
  const item = resolveItem(id);
  if (isLiteratureScoreNote(item)) {
    return true;
  }
  const parentID =
    Number(item?.parentID || item?.parentItemID || 0) ||
    Number(extraRow.parentID || extraRow.parentItemID || 0);
  return parentID > 0 && isLiteratureScoreNote(resolveItem(parentID));
}

export function isSynthesisLiteratureScoreInvalidationEvent(args: {
  type: string;
  ids?: Array<string | number>;
  extraData?: Record<string, unknown>;
}) {
  if (cleanString(args.type) !== "item") {
    return false;
  }
  return (args.ids || []).some((id) =>
    isLiteratureScoreChildChange(id, extraRowForId(args.extraData, id)),
  );
}

export function isSynthesisLibraryReadModelInvalidationEvent(args: {
  event: string;
  type: string;
  ids?: Array<string | number>;
  extraData?: Record<string, unknown>;
}) {
  if (cleanString(args.type) !== "item") {
    return false;
  }
  if (!shouldInvalidateLibraryReadModel(args.event)) {
    return false;
  }
  const ids = args.ids || [];
  if (!ids.length) {
    return true;
  }
  return ids.some((id) => {
    const extraRow = extraRowForId(args.extraData, id);
    const itemType =
      extraRow.itemType || extraRow.item_type || extraRow.type || "";
    return (
      !isChildItemType(itemType) || isLiteratureScoreChildChange(id, extraRow)
    );
  });
}

export type SynthesisInvalidationSummary = {
  paperRefs: number;
  invalidated: number;
  unresolved: number;
  failures: number;
  unavailable: number;
};

export const SYNTHESIS_INVALIDATION_BATCH_SIZE = 256;

const EMPTY_INVALIDATION_SUMMARY: SynthesisInvalidationSummary = Object.freeze({
  paperRefs: 0,
  invalidated: 0,
  unresolved: 0,
  failures: 0,
  unavailable: 0,
});

/**
 * Maps notifier ids to the paper references their retrieval index depends on.
 * Child items (attachments/notes) always resolve to their owning paper, so an
 * attachment identity is never emitted as a paper reference; an id that cannot
 * be mapped to a paper is counted as unresolved instead of being silently lost.
 * This performs no source reads and starts no work.
 */
export function collectSynthesisInvalidationPaperRefs(args: {
  ids: Array<string | number>;
  extraData?: Record<string, unknown>;
}) {
  const refs = new Map<string, SynthesisPortableItemRef>();
  let unresolved = 0;
  for (const id of args.ids || []) {
    const item = resolveItem(id);
    const extra = extraRowForId(args.extraData, id);
    const parentID = Number(
      item?.parentID ||
        item?.parentItemID ||
        extra.parentID ||
        extra.parentItemID ||
        0,
    );
    const parent = parentID > 0 ? resolveItem(parentID) : null;
    const owner = parentID > 0 ? parent : item;
    const libraryId = normalizeLibraryId(owner?.libraryID || extra.libraryID);
    const key = cleanString(
      owner?.key ||
        (parentID > 0 ? extra.parentKey || extra.parentItemKey : extra.key),
    );
    if (libraryId && key) {
      refs.set(`${libraryId}:${key}`, { libraryId, key });
      continue;
    }
    unresolved += 1;
  }
  return { paperRefs: [...refs.values()], unresolved };
}

function isRetrievalUnavailable(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    (error as { code?: unknown }).code === "unavailable",
  );
}

async function invalidateSynthesisRetrievalPaperRefs(args: {
  ids: Array<string | number>;
  extraData?: Record<string, unknown>;
  retrievalPort?: {
    invalidate(input: {
      paperRefs: SynthesisPortableItemRef[];
    }): Promise<unknown>;
  };
}): Promise<SynthesisInvalidationSummary> {
  const { paperRefs, unresolved } = collectSynthesisInvalidationPaperRefs({
    ids: args.ids || [],
    extraData: args.extraData,
  });
  const summary: SynthesisInvalidationSummary = {
    ...EMPTY_INVALIDATION_SUMMARY,
    paperRefs: paperRefs.length,
    unresolved,
  };
  if (!paperRefs.length) {
    return summary;
  }
  const retrievalPort =
    args.retrievalPort ?? createNativeSynthesisRetrievalPort();
  for (
    let offset = 0;
    offset < paperRefs.length;
    offset += SYNTHESIS_INVALIDATION_BATCH_SIZE
  ) {
    const batch = paperRefs.slice(
      offset,
      offset + SYNTHESIS_INVALIDATION_BATCH_SIZE,
    );
    try {
      await retrievalPort.invalidate({ paperRefs: batch });
      summary.invalidated += batch.length;
    } catch (error) {
      summary.failures += batch.length;
      if (isRetrievalUnavailable(error)) {
        summary.unavailable += batch.length;
      }
      // A failed bounded batch never cancels the remaining sets, and a missing
      // service is expected; the counts stay observable at the caller boundary.
    }
  }
  return summary;
}

export async function recordSynthesisZoteroItemNotifications(args: {
  event: string;
  type: string;
  ids: Array<string | number>;
  extraData?: Record<string, unknown>;
  client?: Pick<SynthesisClient, "notifications">;
  retrievalPort?: {
    invalidate(input: {
      paperRefs: SynthesisPortableItemRef[];
    }): Promise<unknown>;
  };
}) {
  if (cleanString(args.type) !== "item") {
    return { recorded: 0, invalidation: EMPTY_INVALIDATION_SUMMARY };
  }
  const invalidation = shouldInvalidateLibraryReadModel(args.event)
    ? await invalidateSynthesisRetrievalPaperRefs(args)
    : EMPTY_INVALIDATION_SUMMARY;
  if (!shouldInspectNotifierEcho(args.event)) {
    return { recorded: 0, invalidation };
  }
  const client = args.client || (await getDefaultSynthesisClient());
  const recorded = 0;
  for (const id of args.ids || []) {
    const item = resolveItem(id);
    const extraRow = extraRowForId(args.extraData, id);
    const itemKey =
      cleanString(item?.key) || cleanString(extraRow.key) || cleanString(id);
    if (!itemKey) {
      continue;
    }
    const libraryId =
      normalizeLibraryId(item?.libraryID) ||
      normalizeLibraryId(extraRow.libraryID);
    if (libraryId) {
      const echo = await client.notifications.consumeRelatedItemsSyncEcho({
        libraryId,
        itemKey,
        relatedItemKey: relatedItemKeyFromExtra(extraRow) || undefined,
      });
      if (echo.consumed) {
        continue;
      }
    }
  }
  return { recorded, invalidation };
}

import { getDefaultSynthesisService, type SynthesisService } from "./service";

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
    return !isChildItemType(itemType);
  });
}

export async function recordSynthesisZoteroItemNotifications(args: {
  event: string;
  type: string;
  ids: Array<string | number>;
  extraData?: Record<string, unknown>;
  service?: SynthesisService;
}) {
  if (cleanString(args.type) !== "item") {
    return { recorded: 0 };
  }
  if (!shouldInspectNotifierEcho(args.event)) {
    return { recorded: 0 };
  }
  const service = args.service || getDefaultSynthesisService();
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
      const echo = await service.consumeRelatedItemsSyncEcho({
        libraryId,
        itemKey,
        relatedItemKey: relatedItemKeyFromExtra(extraRow) || undefined,
      });
      if (echo) {
        continue;
      }
    }
  }
  return { recorded };
}

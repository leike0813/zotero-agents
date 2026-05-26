import { getDefaultSynthesisService, type SynthesisService } from "./service";
import type { SynthesisUpdateEventType } from "./updateEvents";

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

function resolveItem(id: string | number) {
  const zotero = (globalThis as { Zotero?: any }).Zotero;
  try {
    return zotero?.Items?.get?.(Number(id)) || null;
  } catch {
    return null;
  }
}

function eventTypeForNotifier(event: string): SynthesisUpdateEventType | null {
  const normalized = cleanString(event).toLowerCase();
  if (normalized === "add") {
    return "zotero_item_added";
  }
  if (normalized === "modify" || normalized === "refresh") {
    return "zotero_item_updated";
  }
  if (normalized === "delete" || normalized === "trash") {
    return "zotero_item_deleted";
  }
  if (
    normalized === "undelete" ||
    normalized === "restore" ||
    normalized === "untrash"
  ) {
    return "zotero_item_restored";
  }
  return null;
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
  const eventType = eventTypeForNotifier(args.event);
  if (!eventType) {
    return { recorded: 0 };
  }
  const service = args.service || getDefaultSynthesisService();
  let recorded = 0;
  for (const id of args.ids || []) {
    const item = resolveItem(id);
    const extra = args.extraData?.[String(id)];
    const extraRow = isObject(extra) ? extra : {};
    const itemKey =
      cleanString(item?.key) || cleanString(extraRow.key) || cleanString(id);
    if (!itemKey) {
      continue;
    }
    const libraryId =
      normalizeLibraryId(item?.libraryID) ||
      normalizeLibraryId(extraRow.libraryID);
    await service.recordSynthesisUpdateEvent({
      eventType,
      source: "zotero.notifier.item",
      scope: { kind: "zotero_item", ref: itemKey },
      sourceHash: libraryId
        ? `${libraryId}:${itemKey}:${eventType}`
        : undefined,
    });
    recorded += 1;
  }
  return { recorded };
}

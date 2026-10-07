/**
 * Marker for the plugin's own item-tree "refresh" notifications, so observers
 * reacting to real library changes can skip them.
 */
const UI_ONLY_ITEM_REFRESH_MARKER = "zoteroAgentsUiOnlyItemRefresh";

/**
 * Zotero keys extra data by id, so per-id refresh ids are marked individually;
 * a global refresh (no ids) carries a single top-level marker.
 */
export function buildUiOnlyItemRefreshExtraData(
  ids: Array<string | number>,
): Record<string, unknown> {
  if (!ids.length) {
    return { [UI_ONLY_ITEM_REFRESH_MARKER]: true };
  }
  const extraData: Record<string, unknown> = {};
  for (const id of ids) {
    extraData[String(id)] = { [UI_ONLY_ITEM_REFRESH_MARKER]: true };
  }
  return extraData;
}

function hasMarker(value: unknown) {
  return (
    !!value &&
    typeof value === "object" &&
    (value as Record<string, unknown>)[UI_ONLY_ITEM_REFRESH_MARKER] === true
  );
}

/**
 * True when an item notification is one of the plugin's own UI-only refresh
 * events. Every id of a per-id refresh must be marked.
 */
export function isUiOnlyItemRefreshNotification(args: {
  event: string;
  type: string;
  ids?: Array<string | number>;
  extraData?: Record<string, unknown>;
}) {
  if (
    String(args.event || "")
      .trim()
      .toLowerCase() !== "refresh"
  ) {
    return false;
  }
  if (String(args.type || "").trim() !== "item") {
    return false;
  }
  const ids = args.ids || [];
  if (!ids.length) {
    return hasMarker(args.extraData);
  }
  return ids.every((id) => hasMarker(args.extraData?.[String(id)]));
}

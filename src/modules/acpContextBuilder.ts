import type { AcpHostContext, AcpSidebarTarget } from "./acpTypes";
import type { SelectionContext, SelectionItemFact } from "./selectionContext";
import { resolveSelectedLibraryIds } from "./zoteroHostCapabilityBroker";

function resolveItemTitle(
  item:
    | {
        getField?: (field: string) => unknown;
      }
    | null
    | undefined,
) {
  return String(item?.getField?.("title") || "").trim();
}

function resolveLibraryContext(win: _ZoteroTypes.MainWindow) {
  const libraryIds = resolveSelectedLibraryIds(win);
  return {
    libraryIds,
    ...(libraryIds.length === 1 ? { libraryId: libraryIds[0] } : {}),
  };
}

function buildCurrentItem(
  item:
    | {
        key?: string;
        getField?: (field: string) => unknown;
      }
    | null
    | undefined,
) {
  if (!item) {
    return undefined;
  }
  const key = String(item.key || "").trim();
  const title = resolveItemTitle(item);
  if (!key && !title) {
    return undefined;
  }
  return {
    key: key || undefined,
    title: title || undefined,
  };
}

function buildCanonicalCurrentItem(item: SelectionItemFact | undefined) {
  if (!item) return undefined;
  const key = String(item.ref.key || "").trim();
  const title = String(item.title || "").trim();
  if (!key && !title) return undefined;
  return {
    key: key || undefined,
    title: title || undefined,
  };
}

function buildLibraryContext(
  win: _ZoteroTypes.MainWindow,
  selectionContext: SelectionContext,
): AcpHostContext {
  const primary = selectionContext.items[0];
  return {
    target: "library",
    ...resolveLibraryContext(win),
    selectionEmpty: selectionContext.items.length === 0,
    currentItem: buildCanonicalCurrentItem(primary),
  };
}

function buildReaderContext(win: _ZoteroTypes.MainWindow): AcpHostContext {
  const selectedTabId = String(
    (win as any).Zotero_Tabs?.selectedID || "",
  ).trim();
  const tabRecord = selectedTabId
    ? (win as any).Zotero_Tabs?._getTab?.(selectedTabId)
    : null;
  const itemId = Number(tabRecord?.tab?.data?.itemID || 0);
  const item =
    Number.isFinite(itemId) && itemId > 0
      ? Zotero.Items.get(Math.floor(itemId))
      : null;
  return {
    target: "reader",
    ...resolveLibraryContext(win),
    selectionEmpty: !item,
    currentItem: buildCurrentItem(item as any),
  };
}

export function buildAcpHostContext(args: {
  window: _ZoteroTypes.MainWindow;
  target: AcpSidebarTarget;
  selectionContext?: SelectionContext;
}) {
  if (args.target === "reader") return buildReaderContext(args.window);
  if (!args.selectionContext) {
    throw new Error(
      "Canonical selection context is required for ACP library context",
    );
  }
  return buildLibraryContext(args.window, args.selectionContext);
}

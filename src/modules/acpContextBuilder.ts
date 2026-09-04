import type { AcpHostContext, AcpSidebarTarget } from "./acpTypes";

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

export function resolveSelectedLibraryTreeRows(
  win: _ZoteroTypes.MainWindow,
): unknown[] {
  const pane = (win as any).ZoteroPane;
  for (const [owner, getRows] of [
    [pane, pane?.getCollectionTreeRows],
    [pane?.collectionsView, pane?.collectionsView?.getSelectedRows],
  ] as const) {
    if (typeof getRows !== "function") continue;
    try {
      const rows = getRows.call(owner);
      if (Array.isArray(rows)) return rows;
    } catch {
      // Fall through to the next supported host shape.
    }
  }
  const itemViewRows = pane?.itemsView?.collectionTreeRows;
  if (Array.isArray(itemViewRows)) return itemViewRows;
  const row = pane?.collectionsView?.selectedTreeRow;
  return row ? [row] : [];
}

function resolveLibraryId(win: _ZoteroTypes.MainWindow) {
  const pane = (win as any).ZoteroPane;
  const rows = resolveSelectedLibraryTreeRows(win);
  let candidates: unknown[] = [];
  if (typeof pane?.getSelectedLibraryIDs === "function") {
    try {
      const selected = pane.getSelectedLibraryIDs();
      if (Array.isArray(selected)) candidates = selected;
    } catch {
      candidates = [];
    }
  }
  if (candidates.length === 0) {
    candidates = rows.map(
      (row: any) => row?.ref?.libraryID ?? row?.ref?.libraryId,
    );
  }
  if (
    candidates.length === 0 &&
    typeof pane?.getSelectedLibraryID === "function"
  ) {
    try {
      candidates = [pane.getSelectedLibraryID()];
    } catch {
      candidates = [];
    }
  }
  const libraryIds = new Set<string>();
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) {
      libraryIds.add(String(Math.floor(value)));
    }
  }
  return libraryIds.size === 1 ? libraryIds.values().next().value : undefined;
}

function resolveLibraryContext(win: _ZoteroTypes.MainWindow) {
  const libraryId = resolveLibraryId(win);
  return libraryId ? { libraryId } : {};
}

function resolveSelectionParent(
  item:
    | {
        id?: number;
        key?: string;
        parentID?: number;
        parentItem?: unknown;
        isAttachment?: () => boolean;
        getField?: (field: string) => unknown;
      }
    | null
    | undefined,
) {
  if (!item) {
    return null;
  }
  if (item.isAttachment?.()) {
    return (
      item.parentItem ||
      (item.parentID ? Zotero.Items.get(item.parentID) : null)
    );
  }
  return item;
}

function buildCurrentItem(
  item:
    | {
        id?: number;
        key?: string;
        getField?: (field: string) => unknown;
      }
    | null
    | undefined,
) {
  if (!item) {
    return undefined;
  }
  const id = Number(item.id || 0);
  const key = String(item.key || "").trim();
  const title = resolveItemTitle(item);
  if (!id && !key && !title) {
    return undefined;
  }
  return {
    id: Number.isFinite(id) && id > 0 ? Math.floor(id) : undefined,
    key: key || undefined,
    title: title || undefined,
  };
}

function buildLibraryContext(win: _ZoteroTypes.MainWindow): AcpHostContext {
  const items = win.ZoteroPane?.getSelectedItems?.() || [];
  const primary = resolveSelectionParent(items[0] as any);
  return {
    target: "library",
    ...resolveLibraryContext(win),
    selectionEmpty: items.length === 0,
    currentItem: buildCurrentItem(primary as any),
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
  const primary = resolveSelectionParent(item as any);
  return {
    target: "reader",
    ...resolveLibraryContext(win),
    selectionEmpty: !primary,
    currentItem: buildCurrentItem((primary || item) as any),
  };
}

export function buildAcpHostContext(args: {
  window: _ZoteroTypes.MainWindow;
  target: AcpSidebarTarget;
}) {
  return args.target === "reader"
    ? buildReaderContext(args.window)
    : buildLibraryContext(args.window);
}

export function buildCurrentAcpHostContext(): AcpHostContext {
  const runtime = globalThis as {
    Zotero?: {
      getMainWindow?: () => _ZoteroTypes.MainWindow | null;
    };
  };
  const win = runtime.Zotero?.getMainWindow?.() || (globalThis as any).window;
  if (!win) {
    return {
      target: "library",
      selectionEmpty: true,
    };
  }
  const selectedTabId = String(
    (win as any).Zotero_Tabs?.selectedID || "",
  ).trim();
  const tabRecord = selectedTabId
    ? (win as any).Zotero_Tabs?._getTab?.(selectedTabId)
    : null;
  const target: AcpSidebarTarget =
    String(tabRecord?.type || "").trim() === "reader" ? "reader" : "library";
  return buildAcpHostContext({
    window: win,
    target,
  });
}

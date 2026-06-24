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

function resolveLibraryId(win: _ZoteroTypes.MainWindow) {
  const pane = (win as any).ZoteroPane;
  const selectedLibraryId = Number(
    pane?.getSelectedLibraryID?.() ||
      pane?.collectionsView?.selectedTreeRow?.ref?.libraryID ||
      0,
  );
  return Number.isFinite(selectedLibraryId) && selectedLibraryId > 0
    ? String(Math.floor(selectedLibraryId))
    : undefined;
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
    libraryId: resolveLibraryId(win),
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
    libraryId: resolveLibraryId(win),
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

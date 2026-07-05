import { config } from "../../package.json";
import { getStringOrFallback } from "../utils/locale";
import {
  isTopLevelRegularArtifactItem,
  parseLibraryArtifactState,
  resolveLibraryArtifactReadiness,
  type LibraryArtifactItem,
} from "./libraryArtifactReadiness";

type ArtifactColumnState = "" | string;

const ARTIFACTS_COLUMN_DATA_KEY = "artifacts";
const REFRESH_DEBOUNCE_MS = 100;

let registeredColumnDataKey: string | false | undefined;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let refreshAllItems = false;
const pendingRefreshItemIDs = new Set<number>();
const stateCache = new Map<number, ArtifactColumnState>();
const pendingScans = new Set<number>();

export async function registerLibraryArtifactsColumn() {
  if (registeredColumnDataKey) {
    return registeredColumnDataKey;
  }
  const columnOptions: _ZoteroTypes.ItemTreeManager.ItemTreeCustomColumnOptions =
    {
      dataKey: ARTIFACTS_COLUMN_DATA_KEY,
      label: getStringOrFallback("library-artifacts-column-label", "Artifacts"),
      pluginID: config.addonID,
      enabledTreeIDs: ["*"],
      showInColumnPicker: true,
      width: "48",
      dataProvider: provideArtifactsCellData,
      renderCell: (
        _index: number,
        data: string,
        column: _ZoteroTypes.ItemTreeManager.ItemTreeColumnOptions & {
          className: string;
        },
        _isFirstColumn: boolean,
        doc: Document,
      ) => renderArtifactsCell(data, doc, column.className),
      zoteroPersist: ["hidden"],
    };
  const registered = await Zotero.ItemTreeManager.registerColumn(columnOptions);
  registeredColumnDataKey = registered;
  return registered;
}

export async function unregisterLibraryArtifactsColumn() {
  if (!registeredColumnDataKey) {
    return false;
  }
  const dataKey = registeredColumnDataKey;
  registeredColumnDataKey = undefined;
  clearArtifactsColumnCache();
  return Zotero.ItemTreeManager.unregisterColumn(dataKey);
}

export function notifyLibraryArtifactsColumnItemsChanged(
  ids: Array<string | number>,
) {
  if (!ids.length) {
    clearArtifactsColumnCache();
    scheduleItemRowsRefresh();
    return;
  }
  let resolvedAny = false;
  const refreshItemIDs = new Set<number>();
  for (const id of ids) {
    const numericID = Number(id);
    if (!Number.isFinite(numericID)) {
      continue;
    }
    const item = Zotero.Items.get(numericID) as LibraryArtifactItem | undefined;
    if (!item) {
      continue;
    }
    resolvedAny = true;
    const parentID = Number(item.parentID || 0);
    if (parentID > 0) {
      clearCachedItem(parentID);
      refreshItemIDs.add(parentID);
    } else if (isTopLevelRegularArtifactItem(item)) {
      refreshItemIDs.add(numericID);
    }
    clearCachedItem(numericID);
  }
  if (!resolvedAny) {
    clearArtifactsColumnCache();
    scheduleItemRowsRefresh();
    return;
  }
  scheduleItemRowsRefresh([...refreshItemIDs]);
}

export function resetLibraryArtifactsColumnForTests() {
  registeredColumnDataKey = undefined;
  clearArtifactsColumnCache();
}

function provideArtifactsCellData(item: Zotero.Item) {
  const artifactItem = item as LibraryArtifactItem;
  if (
    !isTopLevelRegularArtifactItem(artifactItem) ||
    !Number.isFinite(item.id)
  ) {
    return "";
  }
  const cached = stateCache.get(item.id);
  if (cached !== undefined) {
    return cached;
  }
  void scanItemArtifacts(artifactItem);
  return "";
}

async function scanItemArtifacts(item: LibraryArtifactItem) {
  if (pendingScans.has(item.id)) {
    return;
  }
  pendingScans.add(item.id);
  try {
    const state = await resolveArtifactState(item);
    const previousState = stateCache.get(item.id);
    stateCache.set(item.id, state);
    if (previousState !== state && (state || previousState !== undefined)) {
      scheduleItemRowsRefresh([item.id]);
    }
  } catch (error) {
    stateCache.set(item.id, "");
    Zotero.logError?.(
      error instanceof Error ? error : new Error(String(error)),
    );
  } finally {
    pendingScans.delete(item.id);
  }
}

async function resolveArtifactState(
  item: LibraryArtifactItem,
): Promise<ArtifactColumnState> {
  return (await resolveLibraryArtifactReadiness(item)).state;
}

function renderArtifactsCell(
  data: string,
  doc: Document,
  columnClassName = "",
) {
  const cell = doc.createElement("span");
  cell.className = ["cell", columnClassName, "zs-library-artifacts-cell"]
    .filter(Boolean)
    .join(" ");
  const artifacts = parseLibraryArtifactState(data);
  if (!artifacts.length) {
    cell.setAttribute("aria-label", "");
    return cell;
  }
  const label = artifacts.map((artifact) => artifact.label).join(", ");
  cell.setAttribute("title", label);
  cell.setAttribute("aria-label", label);
  for (const artifact of artifacts) {
    const icon = doc.createElement("img");
    icon.className = "zs-library-artifact-icon";
    icon.setAttribute(
      "src",
      `chrome://${config.addonRef}/content/icons/${artifact.icon}`,
    );
    icon.setAttribute("title", artifact.label);
    icon.setAttribute("alt", "");
    cell.appendChild(icon);
  }
  return cell;
}

function clearCachedItem(itemID: number) {
  stateCache.delete(itemID);
  pendingScans.delete(itemID);
}

function clearArtifactsColumnCache() {
  stateCache.clear();
  pendingScans.clear();
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = undefined;
  }
  refreshAllItems = false;
  pendingRefreshItemIDs.clear();
}

function scheduleItemRowsRefresh(itemIDs?: number[]) {
  if (!itemIDs) {
    refreshAllItems = true;
    pendingRefreshItemIDs.clear();
  } else if (!refreshAllItems) {
    for (const itemID of itemIDs) {
      if (Number.isFinite(itemID)) {
        pendingRefreshItemIDs.add(itemID);
      }
    }
  }
  if (refreshTimer) {
    return;
  }
  refreshTimer = setTimeout(() => {
    refreshTimer = undefined;
    const shouldRefreshAllItems = refreshAllItems;
    const ids = refreshAllItems ? [] : [...pendingRefreshItemIDs];
    refreshAllItems = false;
    pendingRefreshItemIDs.clear();
    if (ids.length || shouldRefreshAllItems) {
      void Zotero.Notifier.trigger("refresh", "item", ids);
    }
  }, REFRESH_DEBOUNCE_MS);
}

export const libraryArtifactsColumnInternalsForTests = {
  provideArtifactsCellData,
  renderArtifactsCell,
  resolveArtifactState,
};

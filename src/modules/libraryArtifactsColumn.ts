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
    scheduleColumnRefresh();
    return;
  }
  let resolvedAny = false;
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
    }
    clearCachedItem(numericID);
  }
  if (!resolvedAny) {
    clearArtifactsColumnCache();
  }
  scheduleColumnRefresh();
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
    if (stateCache.get(item.id) !== state) {
      stateCache.set(item.id, state);
      scheduleColumnRefresh();
    } else {
      stateCache.set(item.id, state);
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
}

function scheduleColumnRefresh() {
  if (refreshTimer) {
    return;
  }
  refreshTimer = setTimeout(() => {
    refreshTimer = undefined;
    Zotero.ItemTreeManager.refreshColumns?.();
  }, REFRESH_DEBOUNCE_MS);
}

export const libraryArtifactsColumnInternalsForTests = {
  provideArtifactsCellData,
  renderArtifactsCell,
  resolveArtifactState,
};

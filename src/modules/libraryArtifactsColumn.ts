import { config } from "../../package.json";
import { getStringOrFallback } from "../utils/locale";
import {
  isTopLevelRegularArtifactItem,
  parseLibraryArtifactState,
  resolveLibraryArtifactReadiness,
  type LibraryArtifactItem,
} from "./libraryArtifactReadiness";
import { literatureScoreToStars } from "../shared/literatureScore";

type LibraryColumnState = {
  artifacts: string;
  score: number | null;
};

const ARTIFACTS_COLUMN_DATA_KEY = "artifacts";
const RATING_COLUMN_DATA_KEY = "literatureRating";
const REFRESH_DEBOUNCE_MS = 100;

let registeredColumnDataKey: string | false | undefined;
let registeredRatingColumnDataKey: string | false | undefined;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let refreshAllItems = false;
const pendingRefreshItemIDs = new Set<number>();
const stateCache = new Map<number, LibraryColumnState>();
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

export async function registerLibraryRatingColumn() {
  if (registeredRatingColumnDataKey) {
    return registeredRatingColumnDataKey;
  }
  const columnOptions: _ZoteroTypes.ItemTreeManager.ItemTreeCustomColumnOptions =
    {
      dataKey: RATING_COLUMN_DATA_KEY,
      label: getStringOrFallback("library-rating-column-label", "Rating"),
      pluginID: config.addonID,
      enabledTreeIDs: ["*"],
      showInColumnPicker: true,
      width: "86",
      dataProvider: provideRatingCellData,
      renderCell: (
        _index: number,
        data: string,
        column: _ZoteroTypes.ItemTreeManager.ItemTreeColumnOptions & {
          className: string;
        },
        _isFirstColumn: boolean,
        doc: Document,
      ) => renderRatingCell(data, doc, column.className),
      zoteroPersist: ["hidden"],
    };
  const registered = await Zotero.ItemTreeManager.registerColumn(columnOptions);
  registeredRatingColumnDataKey = registered;
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

export async function unregisterLibraryRatingColumn() {
  if (!registeredRatingColumnDataKey) {
    return false;
  }
  const dataKey = registeredRatingColumnDataKey;
  registeredRatingColumnDataKey = undefined;
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

export function isLibraryArtifactsColumnInvalidationEvent(event: string) {
  const normalized = String(event || "")
    .trim()
    .toLowerCase();
  return (
    normalized === "add" ||
    normalized === "modify" ||
    normalized === "delete" ||
    normalized === "trash" ||
    normalized === "untrash" ||
    normalized === "remove" ||
    normalized === "erase"
  );
}

export function resetLibraryArtifactsColumnForTests() {
  registeredColumnDataKey = undefined;
  registeredRatingColumnDataKey = undefined;
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
    return cached.artifacts;
  }
  void scanItemArtifacts(artifactItem);
  return "";
}

function provideRatingCellData(item: Zotero.Item) {
  const artifactItem = item as LibraryArtifactItem;
  if (
    !isTopLevelRegularArtifactItem(artifactItem) ||
    !Number.isFinite(item.id)
  ) {
    return "";
  }
  const cached = stateCache.get(item.id);
  if (cached !== undefined) {
    return cached.score === null ? "missing" : String(cached.score);
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
    const readiness = await resolveLibraryArtifactReadiness(item);
    const state: LibraryColumnState = {
      artifacts: readiness.state,
      score: readiness.literatureScore.summary?.overallScore ?? null,
    };
    const previousState = stateCache.get(item.id);
    stateCache.set(item.id, state);
    if (
      (!previousState ||
        previousState.artifacts !== state.artifacts ||
        previousState.score !== state.score) &&
      (state.artifacts || state.score !== null || previousState !== undefined)
    ) {
      scheduleItemRowsRefresh([item.id]);
    }
  } catch (error) {
    stateCache.set(item.id, { artifacts: "", score: null });
    Zotero.logError?.(
      error instanceof Error ? error : new Error(String(error)),
    );
  } finally {
    pendingScans.delete(item.id);
  }
}

async function resolveArtifactState(
  item: LibraryArtifactItem,
): Promise<string> {
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

function renderRatingCell(data: string, doc: Document, columnClassName = "") {
  const value = String(data || "").trim();
  const numericScore = value && value !== "missing" ? Number(value) : NaN;
  const missing = !Number.isFinite(numericScore);
  const cell = doc.createElement("span");
  cell.className = [
    "cell",
    columnClassName,
    "zs-library-rating-cell",
    missing ? "is-missing" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const fallbackLabel = missing
    ? "Rating unavailable"
    : `${numericScore}/100, ${literatureScoreToStars(numericScore).rating}/5 stars`;
  const label = missing
    ? getStringOrFallback("library-rating-unavailable", fallbackLabel)
    : getStringOrFallback("library-rating-value", fallbackLabel, {
        args: {
          score: numericScore,
          stars: literatureScoreToStars(numericScore).rating,
        },
      });
  cell.setAttribute("title", label);
  cell.setAttribute("aria-label", label);
  const fills = missing
    ? ([1, 1, 1, 1, 1] as const)
    : literatureScoreToStars(numericScore).fills;
  for (const fill of fills) {
    const star = doc.createElement("span");
    star.className = "zs-library-rating-star";
    star.setAttribute("data-fill", String(fill));
    star.setAttribute("aria-hidden", "true");
    const empty = doc.createElement("span");
    empty.className = "zs-library-rating-star-empty";
    empty.textContent = missing ? "★" : "☆";
    star.appendChild(empty);
    if (!missing && fill > 0) {
      const full = doc.createElement("span");
      full.className = "zs-library-rating-star-fill";
      full.setAttribute("style", `width:${fill * 100}%`);
      full.textContent = "★";
      star.appendChild(full);
    }
    cell.appendChild(star);
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
  provideRatingCellData,
  renderArtifactsCell,
  renderRatingCell,
  resolveArtifactState,
};

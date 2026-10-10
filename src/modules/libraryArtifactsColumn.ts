import { config } from "../../package.json";
import { getStringOrFallback } from "../utils/locale";
import {
  isTopLevelRegularArtifactItem,
  parseLibraryArtifactState,
  type LibraryArtifactItem,
} from "./zoteroHost/libraryArtifactReadiness";
import { resolveZoteroHostCapabilityBroker } from "./zoteroHostCapabilityBroker";
import { literatureScoreToStars } from "../shared/literatureScore";
import {
  buildUiOnlyItemRefreshExtraData,
  isUiOnlyItemRefreshNotification,
} from "./uiOnlyItemRefresh";

type LibraryColumnState = {
  artifacts: string;
  score: number | null;
};

const ARTIFACTS_COLUMN_DATA_KEY = "artifacts";
const RATING_COLUMN_DATA_KEY = "literatureRating";
const REFRESH_DEBOUNCE_MS = 100;
const READINESS_RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

type LibraryColumnEntry = {
  state?: LibraryColumnState;
  dirty: boolean;
  pending: boolean;
  retryAttempt: number;
  retryTimer?: ReturnType<typeof setTimeout>;
  retryExhausted: boolean;
};

let registeredColumnDataKey: string | false | undefined;
let registeredRatingColumnDataKey: string | false | undefined;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let refreshAllItems = false;
const pendingRefreshItemIDs = new Set<number>();
const entries = new Map<number, LibraryColumnEntry>();

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
    let topLevelItem = item;
    while (Number(topLevelItem.parentID || 0) > 0) {
      const parent = Zotero.Items.get(Number(topLevelItem.parentID)) as
        | LibraryArtifactItem
        | undefined;
      if (!parent) break;
      topLevelItem = parent;
    }
    if (isTopLevelRegularArtifactItem(topLevelItem)) {
      invalidateCachedItem(topLevelItem.id);
      refreshItemIDs.add(topLevelItem.id);
    }
    invalidateCachedItem(numericID);
  }
  if (!resolvedAny) {
    clearArtifactsColumnCache();
    scheduleItemRowsRefresh();
    return;
  }
  scheduleItemRowsRefresh([...refreshItemIDs]);
}

export function isLibraryArtifactsColumnInvalidationEvent(notification: {
  event: string;
  type: string;
  ids: Array<string | number>;
  extraData?: Record<string, unknown>;
}) {
  const normalized = String(notification.event || "")
    .trim()
    .toLowerCase();
  if (notification.type !== "item") return false;
  if (
    normalized === "refresh" &&
    isUiOnlyItemRefreshNotification({
      event: notification.event,
      type: notification.type || "item",
      ids: notification.ids,
      extraData: notification.extraData,
    })
  ) {
    return false;
  }
  return (
    normalized === "add" ||
    normalized === "modify" ||
    normalized === "delete" ||
    normalized === "trash" ||
    normalized === "untrash" ||
    normalized === "remove" ||
    normalized === "erase" ||
    normalized === "refresh"
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
  const entry = getOrCreateEntry(item.id);
  scanIfNeeded(artifactItem, entry);
  return entry.state?.artifacts || "";
}

function provideRatingCellData(item: Zotero.Item) {
  const artifactItem = item as LibraryArtifactItem;
  if (
    !isTopLevelRegularArtifactItem(artifactItem) ||
    !Number.isFinite(item.id)
  ) {
    return "";
  }
  const entry = getOrCreateEntry(item.id);
  scanIfNeeded(artifactItem, entry);
  return entry.state
    ? entry.state.score === null
      ? "missing"
      : String(entry.state.score)
    : "";
}

function scanIfNeeded(item: LibraryArtifactItem, entry: LibraryColumnEntry) {
  if (
    entry.dirty &&
    !entry.pending &&
    !entry.retryTimer &&
    !entry.retryExhausted
  ) {
    void scanItemArtifacts(item, entry);
  }
}

async function scanItemArtifacts(
  item: LibraryArtifactItem,
  entry: LibraryColumnEntry,
) {
  if (entries.get(item.id) !== entry || entry.pending) return;
  entry.pending = true;
  try {
    const [readiness] =
      await resolveZoteroHostCapabilityBroker().library.getArtifactReadiness([
        { libraryId: Number((item as any).libraryID), key: String(item.key) },
      ]);
    const state: LibraryColumnState = {
      artifacts: readiness.state,
      score: readiness.literatureScore.summary?.overallScore ?? null,
    };
    if (entries.get(item.id) !== entry) return;
    const previousState = entry.state;
    entry.state = state;
    entry.dirty = false;
    entry.retryAttempt = 0;
    entry.retryExhausted = false;
    if (
      (!previousState ||
        previousState.artifacts !== state.artifacts ||
        previousState.score !== state.score) &&
      (state.artifacts || state.score !== null || previousState !== undefined)
    ) {
      scheduleItemRowsRefresh([item.id]);
    }
  } catch (error) {
    if (entries.get(item.id) !== entry) return;
    Zotero.logError?.(
      error instanceof Error ? error : new Error(String(error)),
    );
    const delay = READINESS_RETRY_DELAYS_MS[entry.retryAttempt];
    if (delay === undefined) {
      entry.retryExhausted = true;
    } else {
      entry.retryAttempt += 1;
      entry.retryTimer = setTimeout(() => {
        entry.retryTimer = undefined;
        void scanItemArtifacts(item, entry);
      }, delay);
    }
  } finally {
    if (entries.get(item.id) === entry) entry.pending = false;
  }
}

async function resolveArtifactState(
  item: LibraryArtifactItem,
): Promise<string> {
  if (!isTopLevelRegularArtifactItem(item)) return "";
  const [readiness] =
    await resolveZoteroHostCapabilityBroker().library.getArtifactReadiness([
      { libraryId: Number((item as any).libraryID), key: String(item.key) },
    ]);
  return readiness.state;
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
  const notApplicable = !value;
  const numericScore = value && value !== "missing" ? Number(value) : NaN;
  const missing = !Number.isFinite(numericScore);
  const cell = doc.createElement("span");
  cell.className = [
    "cell",
    columnClassName,
    "zs-library-rating-cell",
    missing && !notApplicable ? "is-missing" : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (notApplicable) {
    cell.setAttribute("aria-label", "");
    return cell;
  }
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

function getOrCreateEntry(itemID: number) {
  let entry = entries.get(itemID);
  if (!entry) {
    entry = {
      dirty: true,
      pending: false,
      retryAttempt: 0,
      retryExhausted: false,
    };
    entries.set(itemID, entry);
  }
  return entry;
}

function invalidateCachedItem(itemID: number) {
  const previous = entries.get(itemID);
  if (!previous) return;
  if (previous?.retryTimer) clearTimeout(previous.retryTimer);
  entries.set(itemID, {
    state: previous?.state,
    dirty: true,
    pending: false,
    retryAttempt: 0,
    retryExhausted: false,
  });
}

function clearArtifactsColumnCache() {
  for (const entry of entries.values()) {
    if (entry.retryTimer) clearTimeout(entry.retryTimer);
  }
  entries.clear();
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
      void Zotero.Notifier.trigger(
        "refresh",
        "item",
        ids,
        buildUiOnlyItemRefreshExtraData(ids),
      );
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

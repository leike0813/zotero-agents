import { config } from "../../package.json";
import { getStringOrFallback } from "../utils/locale";
import { parseNoteKind } from "./notePayloadCodec";

type ArtifactKind =
  | "source-markdown"
  | "digest"
  | "references"
  | "citation-analysis";

type ArtifactColumnState = "" | string;

type ArtifactItem = Zotero.Item & {
  attachmentFilename?: string;
  attachmentContentType?: string;
  getFilePath?: () => string | false | null | undefined;
  getFilePathAsync?: () => Promise<string | false | null | undefined>;
  getBestAttachment?: () => Promise<Zotero.Item | false>;
  isPDFAttachment?: () => boolean;
  isRegularItem?: () => boolean;
  isTopLevelItem?: () => boolean;
};

const ARTIFACTS_COLUMN_DATA_KEY = "artifacts";
const ARTIFACT_DEFINITIONS: Array<{
  kind: ArtifactKind;
  label: string;
  icon: string;
}> = [
  {
    kind: "source-markdown",
    label: "Source Markdown",
    icon: "icon_artifact_markdown.svg",
  },
  {
    kind: "digest",
    label: "Digest",
    icon: "icon_artifact_digest.svg",
  },
  {
    kind: "references",
    label: "References",
    icon: "icon_artifact_references.svg",
  },
  {
    kind: "citation-analysis",
    label: "Citation Analysis",
    icon: "icon_artifact_citation_analysis.svg",
  },
];
const REFRESH_DEBOUNCE_MS = 100;
const MARKDOWN_EXTENSIONS = new Set(["md", "markdown"]);

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
    const item = Zotero.Items.get(numericID) as ArtifactItem | undefined;
    if (!item) {
      continue;
    }
    resolvedAny = true;
    const parentID = Number(item.parentID || 0);
    if (parentID > 0) {
      clearCachedItem(parentID);
      refreshItemIDs.add(parentID);
    } else if (isTopLevelRegularItem(item)) {
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
  const artifactItem = item as ArtifactItem;
  if (!isTopLevelRegularItem(artifactItem) || !Number.isFinite(item.id)) {
    return "";
  }
  const cached = stateCache.get(item.id);
  if (cached !== undefined) {
    return cached;
  }
  void scanItemArtifacts(artifactItem);
  return "";
}

async function scanItemArtifacts(item: ArtifactItem) {
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
  item: ArtifactItem,
): Promise<ArtifactColumnState> {
  if (!isTopLevelRegularItem(item)) {
    return "";
  }
  const artifacts = new Set<ArtifactKind>();
  if (await hasSourceMarkdownArtifact(item)) {
    artifacts.add("source-markdown");
  }
  for (const artifact of resolveGeneratedNoteArtifacts(item)) {
    artifacts.add(artifact);
  }
  return serializeArtifactState(artifacts);
}

async function hasSourceMarkdownArtifact(item: ArtifactItem) {
  const bestAttachment = await resolveBestPdfAttachment(item);
  if (!bestAttachment) {
    return false;
  }
  const bestStem = await resolveAttachmentStem(bestAttachment);
  if (!bestStem) {
    return false;
  }
  const markdownStems = await resolveMarkdownAttachmentStems(item);
  return markdownStems.has(bestStem);
}

function resolveGeneratedNoteArtifacts(item: ArtifactItem) {
  const artifacts = new Set<ArtifactKind>();
  for (const id of item.getNotes?.() || []) {
    const note = Zotero.Items.get(id) as ArtifactItem | undefined;
    if (!note?.isNote?.()) {
      continue;
    }
    const noteKind = normalizeGeneratedNoteKind(note.getNote?.() || "");
    if (noteKind === "digest") {
      artifacts.add("digest");
    } else if (noteKind === "references") {
      artifacts.add("references");
    } else if (noteKind === "citation-analysis") {
      artifacts.add("citation-analysis");
    }
  }
  return artifacts;
}

function normalizeGeneratedNoteKind(noteHtml: unknown) {
  const html = String(noteHtml || "");
  const parsed = parseNoteKind(html);
  if (parsed === "citation_analysis") {
    return "citation-analysis";
  }
  if (parsed) {
    return parsed;
  }
  const anchorMatch = html.match(
    /data-zs-payload-anchor\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i,
  );
  const anchor = String(
    anchorMatch?.[1] || anchorMatch?.[2] || anchorMatch?.[3] || "",
  );
  if (anchor === "digest-markdown") {
    return "digest";
  }
  if (anchor === "references-json") {
    return "references";
  }
  if (anchor === "citation-analysis-json") {
    return "citation-analysis";
  }
  return "";
}

function serializeArtifactState(artifacts: Set<ArtifactKind>) {
  return ARTIFACT_DEFINITIONS.map(({ kind }) => kind)
    .filter((kind) => artifacts.has(kind))
    .join("|");
}

function parseArtifactState(data: string) {
  const requested = new Set(
    String(data || "")
      .split("|")
      .filter(Boolean),
  );
  return ARTIFACT_DEFINITIONS.filter(({ kind }) => requested.has(kind));
}

async function resolveBestPdfAttachment(item: ArtifactItem) {
  const best = await item.getBestAttachment?.();
  if (best && isPdfAttachment(best as ArtifactItem)) {
    return best as ArtifactItem;
  }
  for (const id of item.getAttachments?.() || []) {
    const attachment = Zotero.Items.get(id) as ArtifactItem | undefined;
    if (attachment && isPdfAttachment(attachment)) {
      return attachment;
    }
  }
  return null;
}

function isPdfAttachment(item: ArtifactItem) {
  try {
    if (item.isPDFAttachment?.()) {
      return true;
    }
  } catch {
    return false;
  }
  if (normalizeContentType(item.attachmentContentType) === "application/pdf") {
    return true;
  }
  const filename = resolveAttachmentFilenameSync(item).toLowerCase();
  return filename.endsWith(".pdf");
}

async function resolveMarkdownAttachmentStems(item: ArtifactItem) {
  const stems = new Set<string>();
  for (const id of item.getAttachments?.() || []) {
    const attachment = Zotero.Items.get(id) as ArtifactItem | undefined;
    if (!attachment || !(await isMarkdownAttachment(attachment))) {
      continue;
    }
    const stem = await resolveAttachmentStem(attachment);
    if (stem) {
      stems.add(stem);
    }
  }
  return stems;
}

async function isMarkdownAttachment(item: ArtifactItem) {
  const filename = await resolveAttachmentFilename(item);
  return MARKDOWN_EXTENSIONS.has(resolveExtension(filename));
}

async function resolveAttachmentStem(item: ArtifactItem) {
  const filename = await resolveAttachmentFilename(item);
  const extension = resolveExtension(filename);
  if (!extension) {
    return "";
  }
  return filename
    .slice(0, Math.max(0, filename.length - extension.length - 1))
    .trim()
    .toLowerCase();
}

async function resolveAttachmentFilename(item: ArtifactItem) {
  const syncFilename = resolveAttachmentFilenameSync(item);
  if (syncFilename) {
    return syncFilename;
  }
  try {
    const filePath = await item.getFilePathAsync?.();
    return basename(String(filePath || ""));
  } catch {
    return "";
  }
}

function resolveAttachmentFilenameSync(item: ArtifactItem) {
  const attachmentFilename = String(item.attachmentFilename || "").trim();
  if (attachmentFilename) {
    return attachmentFilename;
  }
  try {
    const filePath = item.getFilePath?.();
    return basename(String(filePath || ""));
  } catch {
    return "";
  }
}

function basename(value: string) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  const parts = normalized.split(/[\\/]+/);
  return parts[parts.length - 1] || "";
}

function resolveExtension(filename: string) {
  const index = filename.lastIndexOf(".");
  if (index <= 0 || index === filename.length - 1) {
    return "";
  }
  return filename.slice(index + 1).toLowerCase();
}

function normalizeContentType(value: unknown) {
  return String(value || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function isTopLevelRegularItem(item: ArtifactItem) {
  if (item.isNote?.() || item.isAttachment?.()) {
    return false;
  }
  if (typeof item.isRegularItem === "function" && !item.isRegularItem()) {
    return false;
  }
  if (typeof item.isTopLevelItem === "function") {
    return item.isTopLevelItem();
  }
  return !item.parentID;
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
  const artifacts = parseArtifactState(data);
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

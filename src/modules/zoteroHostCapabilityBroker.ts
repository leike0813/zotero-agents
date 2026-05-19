import { handlers } from "../handlers";
import { resolveRuntimeZotero } from "../utils/runtimeBridge";
import { buildCurrentAcpHostContext } from "./acpContextBuilder";
import {
  getNotePayloadDetail,
  listNotePayloadBlocks,
  type ZoteroNotePayloadBlock,
  type ZoteroNotePayloadDetail,
} from "./notePayloadCodec";
import type { AcpHostContext } from "./acpTypes";

export type ZoteroHostItemRefInput =
  | Zotero.Item
  | number
  | string
  | {
      id?: number | string | null;
      key?: string | null;
      libraryId?: number | string | null;
      libraryID?: number | string | null;
    };

export type ZoteroHostCollectionRefInput =
  | number
  | string
  | Zotero.Collection
  | {
      id?: number | string | null;
      key?: string | null;
      libraryId?: number | string | null;
      libraryID?: number | string | null;
    };

export type ZoteroHostItemSummaryDto = {
  id: number;
  key: string;
  libraryId: number;
  itemType: string;
  title: string;
  creators: string[];
  year: string;
  date: string;
  publicationTitle: string;
  tags: string[];
  collections: Array<number | string>;
  parent?: {
    id: number;
    key: string;
  };
};

export type ZoteroHostItemDetailDto = ZoteroHostItemSummaryDto & {
  fields: Record<string, string | number | boolean>;
  noteCount: number;
  attachmentCount: number;
  relatedItemKeys: string[];
};

export type ZoteroHostNoteDto = {
  id: number;
  key: string;
  libraryId: number;
  title: string;
  html?: string;
  text?: string;
  textExcerpt?: string;
  textLength?: number;
  htmlLength?: number;
  warnings?: string[];
  errors?: ZoteroHostMutationError[];
  parent?: {
    id: number;
    key: string;
    title: string;
  };
};

export type ZoteroHostAttachmentDto = {
  id: number;
  key: string;
  libraryId: number;
  title: string;
  contentType: string;
  path: string;
  filename: string;
  warnings?: string[];
  errors?: ZoteroHostMutationError[];
  parent?: {
    id: number;
    key: string;
    title: string;
  };
};

export type ZoteroHostCollectionDto = {
  id: number | string;
  key: string;
  name: string;
  libraryId: number;
  parentId?: number | string;
  parentKey?: string;
  path?: string[];
};

export type ZoteroHostCurrentViewDto = AcpHostContext & {
  currentItem?: AcpHostContext["currentItem"] & Partial<ZoteroHostItemSummaryDto>;
  selectedItems: ZoteroHostItemSummaryDto[];
};

export type ZoteroHostItemSearchArgs = {
  query: string;
  limit?: number | string;
  libraryId?: number | string;
};

export type ZoteroHostLibraryListArgs = {
  libraryId?: number | string;
  collection?: ZoteroHostCollectionRefInput;
  collectionId?: number | string;
  collectionKey?: string;
  collectionLibraryId?: number | string;
  tag?: string;
  itemType?: string;
  query?: string;
  limit?: number | string;
  cursor?: string | number;
};

export type ZoteroHostLibraryItemSummaryDto = ZoteroHostItemSummaryDto & {
  noteCount: number;
  attachmentCount: number;
};

export type ZoteroHostLibraryListResponse = {
  items: ZoteroHostLibraryItemSummaryDto[];
  nextCursor: string;
  totalScanned: number;
  returned: number;
  hasMore: boolean;
  filters: {
    libraryId?: number;
    collection?: ZoteroHostCollectionDto;
    tag?: string;
    itemType?: string;
    query?: string;
  };
};

export type ZoteroHostNoteDetailArgs = {
  format?: "text" | "html" | string;
  offset?: number | string;
  maxChars?: number | string;
};

export type ZoteroHostNoteDetailChunkDto = {
  id: number;
  key: string;
  libraryId: number;
  title: string;
  format: "text" | "html";
  content: string;
  offset: number;
  nextOffset: number;
  hasMore: boolean;
  totalChars: number;
  truncated: boolean;
  parent?: {
    id: number;
    key: string;
    title: string;
  };
  warnings?: string[];
};

export type ZoteroHostNotePayloadSummaryDto = Omit<
  ZoteroNotePayloadBlock,
  "encodedValue" | "decodedText" | "payload" | "markdown"
>;

export type ZoteroHostNotePayloadDetailDto = Omit<
  ZoteroNotePayloadDetail,
  "encodedValue" | "decodedText"
>;

export type ZoteroHostNotePayloadDetailArgs = {
  payloadType?: string;
  offset?: number | string;
  maxChars?: number | string;
};

export type ZoteroHostMutationOperation =
  | "item.updateFields"
  | "item.addTags"
  | "item.removeTags"
  | "note.createChild"
  | "note.update"
  | "paper.ingest"
  | "collection.addItems"
  | "collection.removeItems";

export type ZoteroHostIngestPaperInput = {
  title?: string;
  authors?: string[] | string;
  year?: string | number;
  doi?: string;
  arxiv?: string;
  pmid?: string;
  isbn?: string;
  landingUrl?: string;
  url?: string;
  pdfUrl?: string;
  abstract?: string;
  venue?: string;
};

export type ZoteroHostIngestPaperResult = {
  index: number;
  status: "created" | "existing" | "failed";
  title: string;
  identifiers: {
    doi?: string;
    arxiv?: string;
    pmid?: string;
    isbn?: string;
  };
  item?: ZoteroHostItemSummaryDto;
  attachmentStatus: "attached" | "skipped" | "failed";
  attachment?: ZoteroHostAttachmentDto;
  error?: ZoteroHostMutationError;
};

export type ZoteroHostIngestPapersSummary = {
  total: number;
  created: number;
  existing: number;
  failed: number;
  pdfAttached: number;
  pdfSkipped: number;
  pdfFailed: number;
  results: ZoteroHostIngestPaperResult[];
};

export type ZoteroHostMutationRequest = {
  operation: ZoteroHostMutationOperation | string;
  target?: ZoteroHostItemRefInput;
  targets?: ZoteroHostItemRefInput[];
  item?: ZoteroHostItemRefInput;
  items?: ZoteroHostItemRefInput[];
  parent?: ZoteroHostItemRefInput;
  note?: ZoteroHostItemRefInput;
  collection?: ZoteroHostCollectionRefInput;
  fields?: Record<string, string | number | boolean | null>;
  tags?: string[];
  content?: string;
  papers?: ZoteroHostIngestPaperInput[];
};

export type ZoteroHostMutationError = {
  code: string;
  message: string;
  details?: unknown;
};

export class ZoteroItemNotFoundError extends Error {
  constructor(readonly ref?: unknown) {
    super("item not found");
    this.name = "ZoteroItemNotFoundError";
  }
}

export class ZoteroNoteNotFoundError extends Error {
  constructor(readonly ref?: unknown) {
    super("note not found");
    this.name = "ZoteroNoteNotFoundError";
  }
}

export class ZoteroCollectionNotFoundError extends Error {
  constructor(readonly ref?: unknown) {
    super("collection not found");
    this.name = "ZoteroCollectionNotFoundError";
  }
}

type ZoteroHostMutationBaseResponse = {
  operation: string;
  targetRefs: ZoteroHostItemSummaryDto[];
  summary: string;
  warnings: string[];
  requiresConfirmation: true;
};

export type ZoteroHostMutationPreviewResponse =
  | (ZoteroHostMutationBaseResponse & {
      ok: true;
      collection?: ZoteroHostCollectionDto;
    })
  | (ZoteroHostMutationBaseResponse & {
      ok: false;
      error: ZoteroHostMutationError;
    });

export type ZoteroHostMutationExecuteResponse =
  | (ZoteroHostMutationBaseResponse & {
      ok: true;
      result: {
        items?: ZoteroHostItemSummaryDto[];
        notes?: ZoteroHostNoteDto[];
        collections?: ZoteroHostCollectionDto[];
        ingest?: ZoteroHostIngestPapersSummary;
      };
    })
  | (ZoteroHostMutationBaseResponse & {
      ok: false;
      error: ZoteroHostMutationError;
    });

const SUMMARY_TEXT_LIMIT = 300;
const FIELD_TEXT_LIMIT = 4000;
const NOTE_TEXT_LIMIT = 4000;
const NOTE_HTML_INPUT_LIMIT = 50000;
const SEARCH_LIMIT_DEFAULT = 20;
const SEARCH_LIMIT_MAX = 50;
const LIBRARY_LIST_LIMIT_DEFAULT = 100;
const LIBRARY_LIST_LIMIT_MAX = 200;
const TARGET_LIMIT_MAX = 50;
const TAG_LIMIT_MAX = 100;
const TAG_TEXT_LIMIT = 200;
const INGEST_FIELD_LIMIT = 2000;
const NOTE_EXCERPT_DEFAULT = 800;
const NOTE_EXCERPT_MAX = 2000;
const NOTE_DETAIL_CHUNK_DEFAULT = 8000;
const NOTE_DETAIL_CHUNK_MAX = 16000;

const DETAIL_FIELDS = [
  "title",
  "abstractNote",
  "date",
  "publicationTitle",
  "journalAbbreviation",
  "DOI",
  "url",
  "pages",
  "volume",
  "issue",
  "publisher",
  "place",
  "ISBN",
  "ISSN",
  "language",
  "shortTitle",
];

function resolveZotero() {
  const zotero =
    resolveRuntimeZotero() ||
    (typeof Zotero !== "undefined" ? Zotero : undefined);
  if (!zotero) {
    throw new Error("Zotero runtime is unavailable in host capability broker");
  }
  return zotero;
}

function trimText(value: unknown, limit = SUMMARY_TEXT_LIMIT) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function parsePositiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function parseNonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function normalizeLibraryId(value: unknown) {
  const explicit = parsePositiveInteger(value);
  if (explicit) {
    return explicit;
  }
  return parsePositiveInteger(resolveZotero().Libraries?.userLibraryID) || 1;
}

function isRawZoteroItem(value: unknown): value is Zotero.Item {
  return !!(
    value &&
    typeof value === "object" &&
    ("getField" in value || "itemType" in value) &&
    ("id" in value || "key" in value)
  );
}

function readField(item: Zotero.Item, field: string, limit = SUMMARY_TEXT_LIMIT) {
  try {
    return trimText(item.getField?.(field), limit);
  } catch {
    return "";
  }
}

function getItemTitle(item: Zotero.Item) {
  return (
    readField(item, "title") ||
    trimText((item as unknown as { getDisplayTitle?: () => unknown }).getDisplayTitle?.())
  );
}

function getCreators(item: Zotero.Item) {
  const source = item as unknown as {
    getCreators?: () => Array<{
      firstName?: string;
      lastName?: string;
      name?: string;
      creatorType?: string;
    }>;
    firstCreator?: string;
  };
  try {
    const creators = source.getCreators?.() || [];
    const names = creators
      .map((creator) =>
        trimText(
          [creator.firstName, creator.lastName].filter(Boolean).join(" ") ||
            creator.name ||
            creator.lastName ||
            creator.firstName,
        ),
      )
      .filter(Boolean);
    if (names.length > 0) {
      return names.slice(0, 10);
    }
  } catch {
    // fall through to firstCreator
  }
  const firstCreator = trimText(source.firstCreator);
  return firstCreator ? [firstCreator] : [];
}

function getYear(date: string) {
  const match = date.match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
  return match?.[1] || "";
}

function getTags(item: Zotero.Item) {
  try {
    return (item.getTags?.() || [])
      .map((entry: { tag?: unknown }) => trimText(entry?.tag, TAG_TEXT_LIMIT))
      .filter(Boolean)
      .slice(0, TAG_LIMIT_MAX);
  } catch {
    return [];
  }
}

function getCollections(item: Zotero.Item) {
  try {
    return (item.getCollections?.() || []).slice(0, TARGET_LIMIT_MAX);
  } catch {
    return [];
  }
}

function getParentSummary(item: Zotero.Item) {
  const parentId = parsePositiveInteger(
    (item as unknown as { parentItemID?: unknown; parentID?: unknown }).parentItemID ||
      (item as unknown as { parentID?: unknown }).parentID,
  );
  if (!parentId) {
    return undefined;
  }
  const parent = resolveZotero().Items.get(parentId);
  if (!parent) {
    return undefined;
  }
  return {
    id: parsePositiveInteger(parent.id),
    key: trimText(parent.key),
    title: getItemTitle(parent),
  };
}

export function serializeZoteroItemSummary(
  item: Zotero.Item,
): ZoteroHostItemSummaryDto {
  const date = readField(item, "date");
  let parentSummary: ReturnType<typeof getParentSummary> | undefined;
  try {
    parentSummary = getParentSummary(item);
  } catch {
    parentSummary = undefined;
  }
  return {
    id: parsePositiveInteger(item.id),
    key: trimText(item.key),
    libraryId: normalizeLibraryId((item as unknown as { libraryID?: unknown }).libraryID),
    itemType: trimText(item.itemType),
    title: getItemTitle(item),
    creators: getCreators(item),
    year: getYear(date),
    date,
    publicationTitle: readField(item, "publicationTitle"),
    tags: getTags(item),
    collections: getCollections(item),
    parent: parentSummary
      ? {
          id: parentSummary.id,
          key: parentSummary.key,
        }
      : undefined,
  };
}

function serializeItemDetail(item: Zotero.Item): ZoteroHostItemDetailDto {
  const fields: Record<string, string | number | boolean> = {};
  for (const field of DETAIL_FIELDS) {
    const value = readField(item, field, FIELD_TEXT_LIMIT);
    if (value) {
      fields[field] = value;
    }
  }
  let noteCount = 0;
  let attachmentCount = 0;
  try {
    noteCount = (item.getNotes?.() || []).length;
  } catch {
    noteCount = 0;
  }
  try {
    attachmentCount = (item.getAttachments?.() || []).length;
  } catch {
    attachmentCount = 0;
  }
  return {
    ...serializeZoteroItemSummary(item),
    fields,
    noteCount,
    attachmentCount,
    relatedItemKeys: Array.isArray((item as unknown as { relatedItems?: unknown }).relatedItems)
      ? ((item as unknown as { relatedItems: string[] }).relatedItems || [])
          .map((entry) => trimText(entry))
          .filter(Boolean)
      : [],
  };
}

function countChildItems(
  item: Zotero.Item,
  getter: "getNotes" | "getAttachments",
) {
  try {
    return ((item[getter]?.() || []) as unknown[]).length;
  } catch {
    return 0;
  }
}

function serializeLibraryItemSummary(
  item: Zotero.Item,
): ZoteroHostLibraryItemSummaryDto {
  return {
    ...serializeZoteroItemSummary(item),
    noteCount: countChildItems(item, "getNotes"),
    attachmentCount: countChildItems(item, "getAttachments"),
  };
}

function htmlToText(html: string) {
  return trimText(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
    NOTE_TEXT_LIMIT,
  );
}

function extractNoteHtml(item: Zotero.Item, warnings: string[]) {
  try {
    return trimText(
      (item as unknown as { getNote?: () => unknown }).getNote?.(),
      NOTE_HTML_INPUT_LIMIT,
    );
  } catch (error) {
    warnings.push(
      `Failed to read note HTML: ${error instanceof Error ? error.message : String(error)}`,
    );
    return "";
  }
}

function noteParentWithWarnings(item: Zotero.Item, warnings: string[]) {
  try {
    return getParentSummary(item);
  } catch (error) {
    warnings.push(
      `Failed to read note parent: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

function serializeNoteSummary(
  item: Zotero.Item,
  maxExcerptChars = NOTE_EXCERPT_DEFAULT,
): ZoteroHostNoteDto {
  const warnings: string[] = [];
  const html = extractNoteHtml(item, warnings);
  const text = htmlToText(html);
  const parent = noteParentWithWarnings(item, warnings);
  const excerptLimit = Math.min(
    NOTE_EXCERPT_MAX,
    Math.max(1, parsePositiveInteger(maxExcerptChars) || NOTE_EXCERPT_DEFAULT),
  );
  return {
    id: parsePositiveInteger(item.id),
    key: trimText(item.key),
    libraryId: normalizeLibraryId((item as unknown as { libraryID?: unknown }).libraryID),
    title: getItemTitle(item) || text.slice(0, 80),
    textExcerpt: trimText(text, excerptLimit),
    textLength: text.length,
    htmlLength: html.length,
    parent,
    warnings: warnings.length ? warnings : undefined,
  };
}

function serializeNote(item: Zotero.Item): ZoteroHostNoteDto {
  const warnings: string[] = [];
  const html = extractNoteHtml(item, warnings);
  const parent = noteParentWithWarnings(item, warnings);
  const text = htmlToText(html);
  return {
    id: parsePositiveInteger(item.id),
    key: trimText(item.key),
    libraryId: normalizeLibraryId((item as unknown as { libraryID?: unknown }).libraryID),
    title: getItemTitle(item) || text.slice(0, 80),
    html,
    text,
    textExcerpt: trimText(text, NOTE_EXCERPT_DEFAULT),
    textLength: text.length,
    htmlLength: html.length,
    parent,
    warnings: warnings.length ? warnings : undefined,
  };
}

function serializeNoteDetailChunk(
  item: Zotero.Item,
  args: ZoteroHostNoteDetailArgs = {},
): ZoteroHostNoteDetailChunkDto {
  const warnings: string[] = [];
  const format = args.format === "html" ? "html" : "text";
  const html = extractNoteHtml(item, warnings);
  const fullContent = format === "html" ? html : htmlToText(html);
  const maxChars = Math.min(
    NOTE_DETAIL_CHUNK_MAX,
    Math.max(
      1,
      parsePositiveInteger(args.maxChars) || NOTE_DETAIL_CHUNK_DEFAULT,
    ),
  );
  const offset = Math.min(
    fullContent.length,
    Math.max(0, parseNonNegativeInteger(args.offset)),
  );
  const content = fullContent.slice(offset, offset + maxChars);
  const nextOffset = Math.min(fullContent.length, offset + content.length);
  const parent = noteParentWithWarnings(item, warnings);
  return {
    id: parsePositiveInteger(item.id),
    key: trimText(item.key),
    libraryId: normalizeLibraryId((item as unknown as { libraryID?: unknown }).libraryID),
    title: getItemTitle(item) || htmlToText(html).slice(0, 80),
    format,
    content,
    offset,
    nextOffset,
    hasMore: nextOffset < fullContent.length,
    totalChars: fullContent.length,
    truncated: nextOffset < fullContent.length,
    parent,
    warnings: warnings.length ? warnings : undefined,
  };
}

function serializeNotePayloadSummary(
  item: Zotero.Item,
): ZoteroHostNotePayloadSummaryDto[] {
  const warnings: string[] = [];
  const html = extractNoteHtml(item, warnings);
  return listNotePayloadBlocks(html).map((entry) => ({
    payloadType: entry.payloadType,
    noteKind: entry.noteKind,
    version: entry.version,
    encoding: entry.encoding,
    estimatedSize: entry.estimatedSize,
    format: entry.format,
    errors: entry.errors,
  }));
}

function serializeNotePayloadDetail(
  item: Zotero.Item,
  args: ZoteroHostNotePayloadDetailArgs = {},
): ZoteroHostNotePayloadDetailDto {
  const warnings: string[] = [];
  const html = extractNoteHtml(item, warnings);
  const detail = getNotePayloadDetail(html, args);
  return {
    payloadType: detail.payloadType,
    noteKind: detail.noteKind,
    version: detail.version,
    encoding: detail.encoding,
    estimatedSize: detail.estimatedSize,
    payload: detail.payload,
    markdown: detail.markdown,
    format: detail.format,
    errors: detail.errors,
    content: detail.content,
    offset: detail.offset,
    nextOffset: detail.nextOffset,
    hasMore: detail.hasMore,
    totalChars: detail.totalChars,
    truncated: detail.truncated,
  };
}

async function serializeAttachment(item: Zotero.Item): Promise<ZoteroHostAttachmentDto> {
  const warnings: string[] = [];
  let path = "";
  try {
    path = trimText(
      await (item as unknown as { getFilePathAsync?: () => Promise<unknown> })
        .getFilePathAsync?.(),
      FIELD_TEXT_LIMIT,
    );
  } catch (error) {
    warnings.push(
      `Failed to read attachment path: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const filename = path.split(/[\\/]/).filter(Boolean).pop() || "";
  let parent: ReturnType<typeof getParentSummary> | undefined;
  try {
    parent = getParentSummary(item);
  } catch (error) {
    warnings.push(
      `Failed to read attachment parent: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return {
    id: parsePositiveInteger(item.id),
    key: trimText(item.key),
    libraryId: normalizeLibraryId((item as unknown as { libraryID?: unknown }).libraryID),
    title: getItemTitle(item),
    contentType: readField(item, "contentType"),
    path,
    filename,
    parent,
    warnings: warnings.length ? warnings : undefined,
  };
}

function childError(code: string, error: unknown): ZoteroHostMutationError {
  return {
    code,
    message: error instanceof Error ? error.message : String(error || code),
  };
}

function failedNoteDto(id: unknown, error: unknown): ZoteroHostNoteDto {
  return {
    id: parsePositiveInteger(id),
    key: "",
    libraryId: 0,
    title: "",
    html: "",
    text: "",
    errors: [childError("zotero_note_child_failed", error)],
  };
}

function failedAttachmentDto(id: unknown, error: unknown): ZoteroHostAttachmentDto {
  return {
    id: parsePositiveInteger(id),
    key: "",
    libraryId: 0,
    title: "",
    contentType: "",
    path: "",
    filename: "",
    errors: [childError("zotero_attachment_child_failed", error)],
  };
}

function serializeCollection(collection: Zotero.Collection): ZoteroHostCollectionDto {
  const parentId = parsePositiveInteger(
    (collection as unknown as { parentID?: unknown; parentCollectionID?: unknown })
      .parentID ||
      (collection as unknown as { parentCollectionID?: unknown }).parentCollectionID,
  );
  const parent = parentId ? resolveZotero().Collections?.get?.(parentId) : null;
  return {
    id: (collection as unknown as { id?: number | string }).id || "",
    key: trimText((collection as unknown as { key?: unknown }).key),
    name: trimText((collection as unknown as { name?: unknown }).name),
    libraryId: normalizeLibraryId(
      (collection as unknown as { libraryID?: unknown }).libraryID,
    ),
    parentId: parentId || undefined,
    parentKey: parent ? trimText((parent as unknown as { key?: unknown }).key) : undefined,
  };
}

function collectionPath(
  collection: Zotero.Collection,
  byId: Map<string, Zotero.Collection>,
) {
  const names: string[] = [];
  const seen = new Set<string>();
  let current: Zotero.Collection | undefined = collection;
  while (current) {
    const id = String((current as unknown as { id?: unknown }).id || "");
    if (id && seen.has(id)) {
      break;
    }
    if (id) {
      seen.add(id);
    }
    const name = trimText((current as unknown as { name?: unknown }).name);
    if (name) {
      names.unshift(name);
    }
    const parentId = parsePositiveInteger(
      (current as unknown as { parentID?: unknown; parentCollectionID?: unknown })
        .parentID ||
        (current as unknown as { parentCollectionID?: unknown }).parentCollectionID,
    );
    current = parentId ? byId.get(String(parentId)) : undefined;
  }
  return names;
}

export async function listZoteroCollections(args: { libraryId?: number } = {}) {
  const zotero = resolveZotero();
  const libraryId =
    parsePositiveInteger(args.libraryId) ||
    normalizeLibraryId(zotero.Libraries?.userLibraryID);
  const collectionsApi = (zotero.Collections || {}) as unknown as {
    get?: (id: number) => Zotero.Collection | undefined;
    getByLibrary?: (libraryId: number) => Zotero.Collection[] | Promise<Zotero.Collection[]>;
    getByLibraryID?: (libraryId: number) => Zotero.Collection[] | Promise<Zotero.Collection[]>;
    getAll?: () => Zotero.Collection[] | Promise<Zotero.Collection[]>;
  };
  let collections: Zotero.Collection[] = [];
  if (typeof collectionsApi.getByLibrary === "function") {
    const loaded = await collectionsApi.getByLibrary(libraryId);
    if (Array.isArray(loaded)) {
      collections = loaded;
    }
  }
  if (collections.length === 0 && typeof collectionsApi.getByLibraryID === "function") {
    const loaded = await collectionsApi.getByLibraryID(libraryId);
    if (Array.isArray(loaded)) {
      collections = loaded;
    }
  }
  if (collections.length === 0 && typeof collectionsApi.getAll === "function") {
    const loaded = await collectionsApi.getAll();
    if (Array.isArray(loaded)) {
      collections = loaded.filter(
        (collection) =>
          (parsePositiveInteger(
            (collection as unknown as { libraryID?: unknown }).libraryID,
          ) || libraryId) === libraryId,
      );
    }
  }
  if (collections.length === 0 && typeof collectionsApi.get === "function") {
    let misses = 0;
    for (let id = 1; id <= 50000; id += 1) {
      const collection = collectionsApi.get(id);
      if (!collection) {
        misses += 1;
        if (misses >= 200) {
          break;
        }
        continue;
      }
      misses = 0;
      if (
        (parsePositiveInteger(
          (collection as unknown as { libraryID?: unknown }).libraryID,
        ) || libraryId) === libraryId
      ) {
        collections.push(collection);
      }
    }
  }

  const byId = new Map<string, Zotero.Collection>();
  for (const collection of collections) {
    const id = String((collection as unknown as { id?: unknown }).id || "");
    if (id) {
      byId.set(id, collection);
    }
  }
  return collections
    .map((collection) => {
      const serialized = serializeCollection(collection);
      return {
        ...serialized,
        path: collectionPath(collection, byId),
      };
    })
    .sort((a, b) => (a.path || [a.name]).join("\u0000").localeCompare((b.path || [b.name]).join("\u0000")));
}

export async function getAllRegularZoteroItems() {
  const zotero = resolveZotero();
  if (typeof (zotero.Items as any).getAll === "function") {
    try {
      const loaded = await (zotero.Items as any).getAll();
      if (Array.isArray(loaded)) {
        return loaded.filter(isRegularVisibleItem);
      }
    } catch {
      // fall through to deterministic scan
    }
  }
  const results: Zotero.Item[] = [];
  let misses = 0;
  for (let id = 1; id <= 50000; id += 1) {
    const item = zotero.Items.get(id);
    if (!item) {
      misses += 1;
      if (misses >= 200) {
        break;
      }
      continue;
    }
    misses = 0;
    if (isRegularVisibleItem(item)) {
      results.push(item);
    }
  }
  return results;
}

function isRegularVisibleItem(item: Zotero.Item) {
  const regular =
    typeof item.isRegularItem === "function"
      ? item.isRegularItem()
      : !item.isNote?.() && !item.isAttachment?.();
  const deleted =
    typeof (item as any).isDeleted === "function"
      ? (item as any).isDeleted()
      : Boolean((item as any).deleted);
  return regular && !deleted;
}

function isTopLevelRegularVisibleItem(item: Zotero.Item) {
  const topLevel =
    typeof (item as any).isTopLevelItem === "function"
      ? (item as any).isTopLevelItem()
      : !parsePositiveInteger(
          (item as unknown as { parentItemID?: unknown; parentID?: unknown }).parentItemID ||
            (item as unknown as { parentID?: unknown }).parentID,
        );
  return isRegularVisibleItem(item) && topLevel;
}

function resolveItem(ref: ZoteroHostItemRefInput | undefined | null) {
  const zotero = resolveZotero();
  if (!ref) {
    return null;
  }
  if (isRawZoteroItem(ref)) {
    return ref;
  }
  if (typeof ref === "number") {
    return zotero.Items.get(ref) || null;
  }
  if (typeof ref === "string") {
    const key = ref.trim();
    if (!key) {
      return null;
    }
    const numericId = parsePositiveInteger(key);
    if (numericId) {
      return zotero.Items.get(numericId) || null;
    }
    return zotero.Items.getByLibraryAndKey(zotero.Libraries.userLibraryID, key) || null;
  }
  const id = parsePositiveInteger(ref.id);
  if (id) {
    return zotero.Items.get(id) || null;
  }
  const key = trimText(ref.key);
  if (!key) {
    return null;
  }
  return (
    zotero.Items.getByLibraryAndKey(
      normalizeLibraryId(ref.libraryId ?? ref.libraryID),
      key,
    ) || null
  );
}

function requireItem(ref: ZoteroHostItemRefInput | undefined | null, label = "item") {
  const item = resolveItem(ref);
  if (!item) {
    throw new ZoteroItemNotFoundError(ref || label);
  }
  return item;
}

function requireNote(ref: ZoteroHostItemRefInput | undefined | null) {
  const item = resolveItem(ref);
  if (!item || !item.isNote?.()) {
    throw new ZoteroNoteNotFoundError(ref || "note");
  }
  return item;
}

function resolveCollection(ref: ZoteroHostCollectionRefInput | undefined | null) {
  const zotero = resolveZotero();
  if (!ref) {
    return null;
  }
  if (typeof ref === "object" && ("name" in ref || "saveTx" in ref)) {
    return ref as Zotero.Collection;
  }
  if (typeof ref === "number") {
    return zotero.Collections?.get?.(ref) || null;
  }
  if (typeof ref === "string") {
    const value = ref.trim();
    const scopedKey = value.match(/^(\d+):([A-Za-z0-9]+)$/);
    if (scopedKey) {
      return (
        zotero.Collections?.getByLibraryAndKey?.(
          parsePositiveInteger(scopedKey[1]),
          scopedKey[2],
        ) || null
      );
    }
    const numericId = parsePositiveInteger(value);
    if (numericId) {
      return zotero.Collections?.get?.(numericId) || null;
    }
    return (
      zotero.Collections?.getByLibraryAndKey?.(zotero.Libraries.userLibraryID, value) ||
      null
    );
  }
  const id = parsePositiveInteger(ref.id);
  if (id) {
    return zotero.Collections?.get?.(id) || null;
  }
  const key = trimText(ref.key);
  if (!key) {
    return null;
  }
  return (
    zotero.Collections?.getByLibraryAndKey?.(
      normalizeLibraryId(ref.libraryId ?? ref.libraryID),
      key,
    ) || null
  );
}

function resolveCollectionFromListArgs(args: ZoteroHostLibraryListArgs) {
  if (args.collection !== undefined) {
    return resolveCollection(args.collection);
  }
  const ref: {
    id?: number | string;
    key?: string;
    libraryId?: number | string;
  } = {};
  if (args.collectionId !== undefined) {
    ref.id = args.collectionId;
  }
  if (args.collectionKey !== undefined) {
    ref.key = args.collectionKey;
  }
  if (args.collectionLibraryId !== undefined) {
    ref.libraryId = args.collectionLibraryId;
  }
  if (ref.id !== undefined || ref.key !== undefined) {
    return resolveCollection(ref);
  }
  return null;
}

function requireCollectionForList(args: ZoteroHostLibraryListArgs) {
  const hasCollectionRef =
    args.collection !== undefined ||
    args.collectionId !== undefined ||
    args.collectionKey !== undefined;
  if (!hasCollectionRef) {
    return null;
  }
  const collection = resolveCollectionFromListArgs(args);
  if (!collection) {
    throw new ZoteroCollectionNotFoundError(
      args.collection ?? {
        id: args.collectionId,
        key: args.collectionKey,
        libraryId: args.collectionLibraryId,
      },
    );
  }
  return collection;
}

function resolveCollectionHandlerRef(ref: ZoteroHostCollectionRefInput) {
  if (typeof ref === "string" && /^\d+:[A-Za-z0-9]+$/.test(ref.trim())) {
    const collection = resolveCollection(ref);
    return (
      parsePositiveInteger((collection as unknown as { id?: unknown } | null)?.id) ||
      trimText((collection as unknown as { key?: unknown } | null)?.key) ||
      ref
    );
  }
  if (typeof ref === "object" && !("name" in ref || "saveTx" in ref)) {
    return parsePositiveInteger(ref.id) || trimText(ref.key);
  }
  return ref as number | string | Zotero.Collection;
}

function validateFieldPatch(item: Zotero.Item, fields: unknown) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    throw new Error("fields must be a non-empty object");
  }
  const patch = fields as Record<string, unknown>;
  const entries = Object.entries(patch);
  if (entries.length === 0) {
    throw new Error("fields must be a non-empty object");
  }
  const normalized: Record<string, string | number | boolean | null> = {};
  for (const [field, value] of entries) {
    const fieldName = trimText(field);
    if (!fieldName) {
      throw new Error("field name must be non-empty");
    }
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean" &&
      value !== null
    ) {
      throw new Error(`Invalid value for field: ${fieldName}`);
    }
    if (typeof value === "string" && value.length > FIELD_TEXT_LIMIT) {
      throw new Error(`Field value is too long: ${fieldName}`);
    }
    assertValidFieldForItem(item, fieldName);
    normalized[fieldName] = value;
  }
  return normalized;
}

function assertValidFieldForItem(item: Zotero.Item, field: string) {
  const zotero = resolveZotero();
  if (!zotero.ItemFields?.getID) {
    return;
  }
  const fieldID = zotero.ItemFields.getID(field);
  if (!fieldID) {
    throw new Error(`Invalid field: ${field}`);
  }
  const itemTypeID =
    (item as unknown as { itemTypeID?: number }).itemTypeID ||
    zotero.ItemTypes?.getID?.(item.itemType);
  let isValid = zotero.ItemFields.isValidForType(fieldID, itemTypeID);
  if (!isValid) {
    const baseFieldID = zotero.ItemFields.getBaseIDFromTypeAndField(
      itemTypeID,
      fieldID,
    );
    if (baseFieldID) {
      const mappedFieldID = zotero.ItemFields.getFieldIDFromTypeAndBase(
        itemTypeID,
        baseFieldID,
      );
      isValid = Boolean(mappedFieldID);
    }
  }
  if (!isValid) {
    throw new Error(`Invalid field for item type: ${field}`);
  }
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("tags must be a non-empty array");
  }
  if (value.length > TAG_LIMIT_MAX) {
    throw new Error(`tags cannot exceed ${TAG_LIMIT_MAX} entries`);
  }
  const tags = value.map((entry) => trimText(entry, TAG_TEXT_LIMIT)).filter(Boolean);
  if (tags.length !== value.length || tags.length === 0) {
    throw new Error("tags must contain only non-empty strings");
  }
  return Array.from(new Set(tags));
}

function normalizeContent(value: unknown) {
  const content = String(value ?? "").trim();
  if (!content) {
    throw new Error("content must be non-empty");
  }
  if (content.length > NOTE_HTML_INPUT_LIMIT) {
    throw new Error(`content cannot exceed ${NOTE_HTML_INPUT_LIMIT} characters`);
  }
  return content;
}

function normalizePaperText(value: unknown, limit = INGEST_FIELD_LIMIT) {
  return trimText(value, limit);
}

function normalizeIdentifier(value: unknown) {
  return normalizePaperText(value, 300)
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
}

function normalizePaperAuthors(value: unknown) {
  const raw = Array.isArray(value)
    ? value
    : String(value ?? "")
        .split(/\s*(?:;|\band\b|\n)\s*/i)
        .filter(Boolean);
  return raw
    .map((entry) => normalizePaperText(entry, 300))
    .filter(Boolean)
    .slice(0, 50);
}

function normalizeIngestPapers(request: ZoteroHostMutationRequest) {
  if (!Array.isArray(request.papers) || request.papers.length === 0) {
    throw new Error("papers must be a non-empty array");
  }
  return request.papers.map((paper, index) => {
    const input = paper || {};
    const title = normalizePaperText(input.title, 500);
    const doi = normalizeIdentifier(input.doi);
    const arxiv = normalizeIdentifier(input.arxiv);
    const pmid = normalizeIdentifier(input.pmid);
    const isbn = normalizeIdentifier(input.isbn);
    if (!title && !doi && !arxiv && !pmid && !isbn) {
      throw new Error(`paper ${index + 1} requires title or identifier`);
    }
    return {
      title,
      authors: normalizePaperAuthors(input.authors),
      year: normalizePaperText(input.year, 40),
      doi,
      arxiv,
      pmid,
      isbn,
      landingUrl: normalizePaperText(input.landingUrl || input.url, 1000),
      pdfUrl: normalizePaperText(input.pdfUrl, 1000),
      abstract: normalizePaperText(input.abstract, 4000),
      venue: normalizePaperText(input.venue, 500),
    };
  });
}

function normalizedComparable(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
    .replace(/^doi:\s*/, "")
    .replace(/\s+/g, " ");
}

function itemMatchesIngestPaper(
  item: Zotero.Item,
  paper: ReturnType<typeof normalizeIngestPapers>[number],
) {
  const doi = normalizedComparable(readField(item, "DOI", 500));
  const isbn = normalizedComparable(readField(item, "ISBN", 500));
  const title = normalizedComparable(getItemTitle(item));
  const url = normalizedComparable(readField(item, "url", 1000));
  const extra = normalizedComparable(readField(item, "extra", 2000));
  if (paper.doi && doi && doi === normalizedComparable(paper.doi)) {
    return true;
  }
  if (paper.isbn && isbn && isbn === normalizedComparable(paper.isbn)) {
    return true;
  }
  if (paper.arxiv && extra.includes(normalizedComparable(paper.arxiv))) {
    return true;
  }
  if (paper.pmid && extra.includes(normalizedComparable(paper.pmid))) {
    return true;
  }
  if (paper.landingUrl && url && url === normalizedComparable(paper.landingUrl)) {
    return true;
  }
  return !!paper.title && !!title && title === normalizedComparable(paper.title);
}

async function findExistingPaper(
  paper: ReturnType<typeof normalizeIngestPapers>[number],
) {
  const items = await getAllRegularZoteroItems();
  return items.find((item) => itemMatchesIngestPaper(item, paper)) || null;
}

function setItemFieldIfPresent(
  item: Zotero.Item,
  field: string,
  value: string | number | boolean | null | undefined,
) {
  const normalized = typeof value === "string" ? normalizePaperText(value, 4000) : value;
  if (normalized === undefined || normalized === null || normalized === "") {
    return;
  }
  try {
    item.setField(field as any, normalized as any);
  } catch {
    // Some item types do not support every bibliographic field. Best-effort ingest
    // should keep the item rather than fail on one non-critical field.
  }
}

function setItemCreators(item: Zotero.Item, authors: string[]) {
  if (!authors.length) {
    return;
  }
  const creatorData = authors.map((author) => {
    const parts = author.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return {
        name: author,
        creatorType: "author",
      };
    }
    return {
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts[parts.length - 1],
      creatorType: "author",
    };
  });
  const target = item as unknown as {
    setCreators?: (creators: typeof creatorData) => void;
  };
  try {
    target.setCreators?.(creatorData);
  } catch {
    // Creator normalization is best-effort for mock/runtime compatibility.
  }
}

async function tryTranslateIdentifier(
  paper: ReturnType<typeof normalizeIngestPapers>[number],
  libraryID: number,
) {
  const Translate = (resolveZotero() as any).Translate;
  if (!Translate?.Search) {
    return null;
  }
  if (!paper.doi && !paper.arxiv && !paper.isbn && !paper.pmid) {
    return null;
  }
  try {
    const translate = new Translate.Search();
    if (paper.doi || paper.arxiv || paper.pmid) {
      translate.setIdentifier?.({
        ...(paper.doi ? { DOI: paper.doi } : {}),
        ...(paper.arxiv ? { arXiv: paper.arxiv } : {}),
        ...(paper.pmid ? { PMID: paper.pmid } : {}),
      });
    } else if (paper.isbn) {
      translate.setSearch?.({
        itemType: "book",
        ISBN: paper.isbn,
      });
    }
    const translators = await translate.getTranslators?.();
    if (translators?.length) {
      translate.setTranslator?.(translators);
    }
    const items = await translate.translate?.({
      libraryID,
      saveAttachments: false,
    });
    return Array.isArray(items) && items[0] ? (items[0] as Zotero.Item) : null;
  } catch {
    return null;
  }
}

async function createMetadataPaperItem(
  paper: ReturnType<typeof normalizeIngestPapers>[number],
  libraryID: number,
) {
  const item = new Zotero.Item("journalArticle" as any);
  (item as any).libraryID = libraryID;
  setItemFieldIfPresent(item, "title", paper.title || paper.doi || paper.arxiv || paper.pmid || paper.isbn);
  setItemFieldIfPresent(item, "date", paper.year);
  setItemFieldIfPresent(item, "DOI", paper.doi);
  setItemFieldIfPresent(item, "ISBN", paper.isbn);
  setItemFieldIfPresent(item, "url", paper.landingUrl);
  setItemFieldIfPresent(item, "abstractNote", paper.abstract);
  setItemFieldIfPresent(item, "publicationTitle", paper.venue);
  const extra = [
    paper.arxiv ? `arXiv: ${paper.arxiv}` : "",
    paper.pmid ? `PMID: ${paper.pmid}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  setItemFieldIfPresent(item, "extra", extra);
  setItemCreators(item, paper.authors);
  await item.saveTx();
  return item;
}

async function attachPdfBestEffort(
  item: Zotero.Item,
  paper: ReturnType<typeof normalizeIngestPapers>[number],
) {
  if (!paper.pdfUrl) {
    return {
      status: "skipped" as const,
      attachment: undefined,
      error: undefined,
    };
  }
  const importFromURL = (resolveZotero() as any).Attachments?.importFromURL;
  if (typeof importFromURL !== "function") {
    return {
      status: "failed" as const,
      attachment: undefined,
      error: {
        code: "attachment_import_from_url_unavailable",
        message: "Zotero.Attachments.importFromURL is unavailable",
      },
    };
  }
  try {
    const attachment = (await importFromURL({
      libraryID: normalizeLibraryId((item as any).libraryID),
      url: paper.pdfUrl,
      parentItemID: item.id,
      title: paper.title ? `${paper.title} PDF` : "Full Text PDF",
      contentType: "application/pdf",
      referrer: paper.landingUrl || undefined,
    })) as Zotero.Item;
    return {
      status: "attached" as const,
      attachment: await serializeAttachment(attachment),
      error: undefined,
    };
  } catch (error) {
    return {
      status: "failed" as const,
      attachment: undefined,
      error: childError("pdf_attachment_failed", error),
    };
  }
}

async function ingestOnePaper(
  paper: ReturnType<typeof normalizeIngestPapers>[number],
  index: number,
  collection: Zotero.Collection | null,
): Promise<ZoteroHostIngestPaperResult> {
  const identifiers = {
    ...(paper.doi ? { doi: paper.doi } : {}),
    ...(paper.arxiv ? { arxiv: paper.arxiv } : {}),
    ...(paper.pmid ? { pmid: paper.pmid } : {}),
    ...(paper.isbn ? { isbn: paper.isbn } : {}),
  };
  try {
    const existing = await findExistingPaper(paper);
    let item = existing;
    let status: ZoteroHostIngestPaperResult["status"] = existing ? "existing" : "created";
    if (!item) {
      const libraryID =
        collection
          ? normalizeLibraryId((collection as unknown as { libraryID?: unknown }).libraryID)
          : normalizeLibraryId(undefined);
      item =
        (await tryTranslateIdentifier(paper, libraryID)) ||
        (await createMetadataPaperItem(paper, libraryID));
    }
    if (collection) {
      try {
        await handlers.collection.add(item, collection);
      } catch {
        // Collection placement is best-effort and should not convert a created
        // bibliographic item into a failed ingest result.
      }
    }
    const attachment = await attachPdfBestEffort(item, paper);
    return {
      index,
      status,
      title: paper.title || getItemTitle(item),
      identifiers,
      item: serializeZoteroItemSummary(item),
      attachmentStatus: attachment.status,
      attachment: attachment.attachment,
      error: attachment.error,
    };
  } catch (error) {
    return {
      index,
      status: "failed",
      title: paper.title,
      identifiers,
      attachmentStatus: paper.pdfUrl ? "failed" : "skipped",
      error: childError("paper_ingest_failed", error),
    };
  }
}

async function ingestPapers(request: ZoteroHostMutationRequest) {
  const papers = normalizeIngestPapers(request);
  const collection = request.collection ? resolveCollection(request.collection) : null;
  if (request.collection && !collection) {
    throw new Error("collection not found");
  }
  const results: ZoteroHostIngestPaperResult[] = [];
  for (const [index, paper] of papers.entries()) {
    results.push(await ingestOnePaper(paper, index + 1, collection));
  }
  return {
    total: results.length,
    created: results.filter((entry) => entry.status === "created").length,
    existing: results.filter((entry) => entry.status === "existing").length,
    failed: results.filter((entry) => entry.status === "failed").length,
    pdfAttached: results.filter((entry) => entry.attachmentStatus === "attached").length,
    pdfSkipped: results.filter((entry) => entry.attachmentStatus === "skipped").length,
    pdfFailed: results.filter((entry) => entry.attachmentStatus === "failed").length,
    results,
  };
}

function normalizeTargetItems(request: ZoteroHostMutationRequest) {
  const raw = request.targets || request.items || request.target || request.item;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (list.length === 0) {
    throw new Error("target item is required");
  }
  if (list.length > TARGET_LIMIT_MAX) {
    throw new Error(`target item count cannot exceed ${TARGET_LIMIT_MAX}`);
  }
  return list.map((ref) => requireItem(ref, "target item"));
}

function errorResponse(
  operation: string,
  error: unknown,
): ZoteroHostMutationPreviewResponse | ZoteroHostMutationExecuteResponse {
  const message = error instanceof Error ? error.message : String(error || "Unknown error");
  return {
    ok: false,
    operation,
    targetRefs: [],
    summary: "",
    warnings: [],
    requiresConfirmation: true,
    error: {
      code: message.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") ||
        "mutation_error",
      message,
    },
  };
}

function okPreview(args: {
  operation: string;
  targetRefs: ZoteroHostItemSummaryDto[];
  summary: string;
  warnings?: string[];
  collection?: ZoteroHostCollectionDto;
}): ZoteroHostMutationPreviewResponse {
  return {
    ok: true,
    operation: args.operation,
    targetRefs: args.targetRefs,
    summary: args.summary,
    warnings: args.warnings || [],
    requiresConfirmation: true,
    collection: args.collection,
  };
}

function previewMutationOrThrow(
  request: ZoteroHostMutationRequest,
): ZoteroHostMutationPreviewResponse {
  const operation = trimText(request.operation);
  switch (operation) {
    case "item.updateFields": {
      const item = requireItem(request.target || request.item, "target item");
      const patch = validateFieldPatch(item, request.fields);
      return okPreview({
        operation,
        targetRefs: [serializeZoteroItemSummary(item)],
        summary: `Update ${Object.keys(patch).length} field(s) on "${getItemTitle(item)}".`,
      });
    }
    case "item.addTags":
    case "item.removeTags": {
      const items = normalizeTargetItems(request);
      const tags = normalizeTags(request.tags);
      return okPreview({
        operation,
        targetRefs: items.map(serializeZoteroItemSummary),
        summary: `${operation === "item.addTags" ? "Add" : "Remove"} ${tags.length} tag(s) on ${items.length} item(s).`,
      });
    }
    case "note.createChild": {
      const parent = requireItem(request.parent || request.target, "parent item");
      const content = normalizeContent(request.content);
      return okPreview({
        operation,
        targetRefs: [serializeZoteroItemSummary(parent)],
        summary: `Create a child note under "${getItemTitle(parent)}" (${content.length} chars).`,
      });
    }
    case "note.update": {
      const note = requireItem(request.note || request.target, "target note");
      if (!note.isNote?.()) {
        throw new Error("target item is not a note");
      }
      const content = normalizeContent(request.content);
      return okPreview({
        operation,
        targetRefs: [serializeZoteroItemSummary(note)],
        summary: `Update note "${serializeNote(note).title}" (${content.length} chars).`,
      });
    }
    case "paper.ingest": {
      const papers = normalizeIngestPapers(request);
      const collection = request.collection ? resolveCollection(request.collection) : null;
      if (request.collection && !collection) {
        throw new Error("collection not found");
      }
      const pdfCount = papers.filter((paper) => paper.pdfUrl).length;
      return okPreview({
        operation,
        targetRefs: [],
        summary: `Ingest ${papers.length} paper(s); best-effort PDF attachment for ${pdfCount} paper(s).`,
        collection: collection ? serializeCollection(collection) : undefined,
      });
    }
    case "collection.addItems":
    case "collection.removeItems": {
      const items = normalizeTargetItems(request);
      const collection = resolveCollection(request.collection);
      if (!collection) {
        throw new Error("collection not found");
      }
      return okPreview({
        operation,
        targetRefs: items.map(serializeZoteroItemSummary),
        summary: `${operation === "collection.addItems" ? "Add" : "Remove"} ${items.length} item(s) ${operation === "collection.addItems" ? "to" : "from"} collection "${trimText((collection as any).name)}".`,
        collection: serializeCollection(collection),
      });
    }
    default:
      throw new Error(`Unsupported mutation operation: ${operation || "(empty)"}`);
  }
}

async function executeMutationOrThrow(
  request: ZoteroHostMutationRequest,
): Promise<ZoteroHostMutationExecuteResponse> {
  const preview = previewMutationOrThrow(request);
  if (!preview.ok) {
    return preview;
  }
  switch (preview.operation) {
    case "item.updateFields": {
      const item = requireItem(request.target || request.item, "target item");
      const patch = validateFieldPatch(item, request.fields);
      const updated = await handlers.parent.updateFields(item, patch);
      return {
        ...preview,
        result: {
          items: [serializeZoteroItemSummary(updated)],
        },
      };
    }
    case "item.addTags":
    case "item.removeTags": {
      const items = normalizeTargetItems(request);
      const tags = normalizeTags(request.tags);
      if (preview.operation === "item.addTags") {
        await handlers.tag.add(items, tags);
      } else {
        await handlers.tag.remove(items, tags);
      }
      return {
        ...preview,
        result: {
          items: items.map(serializeZoteroItemSummary),
        },
      };
    }
    case "note.createChild": {
      const parent = requireItem(request.parent || request.target, "parent item");
      const note = await handlers.parent.addNote(parent, {
        content: normalizeContent(request.content),
      });
      return {
        ...preview,
        result: {
          notes: [serializeNote(note)],
        },
      };
    }
    case "note.update": {
      const note = requireItem(request.note || request.target, "target note");
      const updated = await handlers.note.update(note, {
        content: normalizeContent(request.content),
      });
      return {
        ...preview,
        result: {
          notes: [serializeNote(updated)],
        },
      };
    }
    case "paper.ingest": {
      const ingest = await ingestPapers(request);
      return {
        ...preview,
        result: {
          items: ingest.results
            .map((entry) => entry.item)
            .filter((entry): entry is ZoteroHostItemSummaryDto => !!entry),
          ingest,
        },
      };
    }
    case "collection.addItems":
    case "collection.removeItems": {
      const items = normalizeTargetItems(request);
      const collectionRef = request.collection as ZoteroHostCollectionRefInput;
      const collection = resolveCollection(collectionRef);
      if (!collection) {
        throw new Error("collection not found");
      }
      if (preview.operation === "collection.addItems") {
        await handlers.collection.add(items, resolveCollectionHandlerRef(collectionRef));
      } else {
        await handlers.collection.remove(items, resolveCollectionHandlerRef(collectionRef));
      }
      return {
        ...preview,
        result: {
          items: items.map(serializeZoteroItemSummary),
          collections: [serializeCollection(collection)],
        },
      };
    }
    default:
      throw new Error(`Unsupported mutation operation: ${preview.operation}`);
  }
}

function searchMatch(item: Zotero.Item, query: string) {
  const haystack = [
    getItemTitle(item),
    getCreators(item).join(" "),
    readField(item, "date"),
    readField(item, "publicationTitle"),
    readField(item, "abstractNote", FIELD_TEXT_LIMIT),
    getTags(item).join(" "),
    trimText(item.key),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

async function listLibraryItems(
  args: ZoteroHostLibraryListArgs = {},
): Promise<ZoteroHostLibraryListResponse> {
  const limit = Math.min(
    LIBRARY_LIST_LIMIT_MAX,
    Math.max(
      1,
      parsePositiveInteger(args.limit) || LIBRARY_LIST_LIMIT_DEFAULT,
    ),
  );
  const cursor = parseNonNegativeInteger(args.cursor);
  const libraryId = parsePositiveInteger(args.libraryId);
  const collection = requireCollectionForList(args);
  const collectionId = collection
    ? parsePositiveInteger((collection as unknown as { id?: unknown }).id)
    : 0;
  const collectionKey = collection
    ? trimText((collection as unknown as { key?: unknown }).key)
    : "";
  const tag = trimText(args.tag).toLowerCase();
  const itemType = trimText(args.itemType);
  const query = trimText(args.query, FIELD_TEXT_LIMIT).toLowerCase();
  const allItems = await getAllRegularZoteroItems();
  const filtered = allItems
    .filter(isTopLevelRegularVisibleItem)
    .filter((item) => !libraryId || normalizeLibraryId((item as any).libraryID) === libraryId)
    .filter((item) => !itemType || trimText(item.itemType) === itemType)
    .filter((item) => {
      if (!tag) {
        return true;
      }
      return getTags(item).some((entry) => entry.toLowerCase() === tag);
    })
    .filter((item) => {
      if (!collection) {
        return true;
      }
      const collections = getCollections(item).map((entry) => String(entry));
      return (
        (collectionId > 0 && collections.includes(String(collectionId))) ||
        (!!collectionKey && collections.includes(collectionKey))
      );
    })
    .filter((item) => !query || searchMatch(item, query))
    .sort((a, b) => parsePositiveInteger(a.id) - parsePositiveInteger(b.id));
  const page = filtered.slice(cursor, cursor + limit);
  const nextOffset = cursor + page.length;
  const hasMore = nextOffset < filtered.length;
  return {
    items: page.map(serializeLibraryItemSummary),
    nextCursor: hasMore ? String(nextOffset) : "",
    totalScanned: filtered.length,
    returned: page.length,
    hasMore,
    filters: {
      libraryId: libraryId || undefined,
      collection: collection ? serializeCollection(collection) : undefined,
      tag: tag || undefined,
      itemType: itemType || undefined,
      query: query || undefined,
    },
  };
}

function getSelectedItems() {
  const win =
    (globalThis as any).Zotero?.getMainWindow?.() || (globalThis as any).window;
  const items = win?.ZoteroPane?.getSelectedItems?.() || [];
  return (Array.isArray(items) ? items : [])
    .filter(isRawZoteroItem)
    .map(serializeZoteroItemSummary);
}

export function createZoteroHostCapabilityBrokerApis() {
  return {
    context: {
      getCurrentView(): ZoteroHostCurrentViewDto {
        const context = buildCurrentAcpHostContext();
        const currentItem = context.currentItem
          ? resolveItem({
              id: context.currentItem.id,
              key: context.currentItem.key,
              libraryId: context.libraryId,
            })
          : null;
        return {
          ...context,
          currentItem: currentItem
            ? {
                ...context.currentItem,
                ...serializeZoteroItemSummary(currentItem),
              }
            : context.currentItem,
          selectedItems: getSelectedItems(),
        };
      },
      getSelectedItems,
    },
    library: {
      listItems: listLibraryItems,
      async searchItems(args: ZoteroHostItemSearchArgs) {
        const query = trimText(args?.query, FIELD_TEXT_LIMIT).toLowerCase();
        if (!query) {
          throw new Error("query must be non-empty");
        }
        const limit = Math.min(
          SEARCH_LIMIT_MAX,
          Math.max(1, parsePositiveInteger(args?.limit) || SEARCH_LIMIT_DEFAULT),
        );
        const libraryId = parsePositiveInteger(args?.libraryId);
        const items = await getAllRegularZoteroItems();
        return items
          .filter((item) => !libraryId || normalizeLibraryId((item as any).libraryID) === libraryId)
          .filter((item) => searchMatch(item, query))
          .slice(0, limit)
          .map(serializeZoteroItemSummary);
      },
      async getItemDetail(ref: ZoteroHostItemRefInput) {
        const item = resolveItem(ref);
        return item ? serializeItemDetail(item) : null;
      },
      async getItemNotes(
        ref: ZoteroHostItemRefInput,
        args: { limit?: number | string; cursor?: number | string; maxExcerptChars?: number | string } = {},
      ) {
        const item = requireItem(ref, "item");
        let noteIds: unknown[] = [];
        try {
          noteIds = item.getNotes?.() || [];
        } catch {
          return [];
        }
        const limit = Math.min(
          TARGET_LIMIT_MAX,
          Math.max(1, parsePositiveInteger(args.limit) || TARGET_LIMIT_MAX),
        );
        const cursor = parseNonNegativeInteger(args.cursor);
        const maxExcerptChars = Math.min(
          NOTE_EXCERPT_MAX,
          Math.max(
            1,
            parsePositiveInteger(args.maxExcerptChars) || NOTE_EXCERPT_DEFAULT,
          ),
        );
        const notes: ZoteroHostNoteDto[] = [];
        for (const id of noteIds.slice(cursor, cursor + limit)) {
          try {
            const note = resolveZotero().Items.get(id as number);
            if (note) {
              notes.push(serializeNoteSummary(note, maxExcerptChars));
            } else {
              notes.push(failedNoteDto(id, new Error("child note not found")));
            }
          } catch (error) {
            notes.push(failedNoteDto(id, error));
          }
        }
        return notes;
      },
      async getNoteDetail(
        ref: ZoteroHostItemRefInput,
        args: ZoteroHostNoteDetailArgs = {},
      ) {
        return serializeNoteDetailChunk(requireNote(ref), args);
      },
      async listNotePayloads(ref: ZoteroHostItemRefInput) {
        return serializeNotePayloadSummary(requireNote(ref));
      },
      async getNotePayload(
        ref: ZoteroHostItemRefInput,
        args: ZoteroHostNotePayloadDetailArgs = {},
      ) {
        return serializeNotePayloadDetail(requireNote(ref), args);
      },
      async getItemAttachments(ref: ZoteroHostItemRefInput) {
        const item = requireItem(ref, "item");
        let attachmentIds: unknown[] = [];
        try {
          attachmentIds = item.getAttachments?.() || [];
        } catch {
          return [];
        }
        const attachments: ZoteroHostAttachmentDto[] = [];
        for (const id of attachmentIds) {
          try {
            const attachment = resolveZotero().Items.get(id as number);
            if (attachment) {
              attachments.push(await serializeAttachment(attachment));
            } else {
              attachments.push(
                failedAttachmentDto(id, new Error("child attachment not found")),
              );
            }
          } catch (error) {
            attachments.push(failedAttachmentDto(id, error));
          }
        }
        return attachments;
      },
    },
    mutations: {
      async preview(
        request: ZoteroHostMutationRequest,
      ): Promise<ZoteroHostMutationPreviewResponse> {
        const operation = trimText(request?.operation);
        try {
          return previewMutationOrThrow(request);
        } catch (error) {
          return errorResponse(operation, error) as ZoteroHostMutationPreviewResponse;
        }
      },
      async execute(
        request: ZoteroHostMutationRequest,
      ): Promise<ZoteroHostMutationExecuteResponse> {
        const operation = trimText(request?.operation);
        try {
          return await executeMutationOrThrow(request);
        } catch (error) {
          return errorResponse(operation, error) as ZoteroHostMutationExecuteResponse;
        }
      },
    },
  };
}

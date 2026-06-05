import { getAllRegularZoteroItems } from "../zoteroHostCapabilityBroker";
import { listNotePayloadBlocksForItem } from "../zoteroNotePayloadResolver";
import {
  listNotePayloadBlocks,
  type ZoteroNotePayloadBlock,
} from "../notePayloadCodec";
import type {
  CitationGraphPaperInput,
  CitationGraphReferenceInput,
} from "./citationGraph";
import { hashCanonicalJson, hashMarkdown } from "./foundation";
import type {
  ReferenceSidecarArtifactType,
  ReferenceSidecarInput,
  ReferenceSidecarInputNote,
} from "./registry";
import { buildReferenceSidecarMetadataFingerprintPayload } from "./registry";

export type SynthesisLibraryIndexPaper = {
  paper_ref: string;
  library_id: number;
  item_key: string;
  title: string;
  year: string;
  item_type: string;
  creators: string[];
  tags: string[];
  collections: string[];
};

export type SynthesisLibraryIndex = {
  libraryId: number;
  papers: SynthesisLibraryIndexPaper[];
  tags: Array<{ tag: string; count: number }>;
  collections: Array<{
    id: string;
    key: string;
    name: string;
    library_id: number;
    item_count: number;
  }>;
  diagnostics: string[];
  cursor?: string;
  next_cursor?: string;
  has_more?: boolean;
  returned?: number;
  total_papers?: number;
  index_hash?: string;
  page_hash?: string;
};

export type SynthesisRegistryMetadataFingerprint = {
  library_id: number;
  item_key: string;
  paper_ref: string;
  deleted: boolean;
  hash: string;
  updated_at?: string;
};

export type PaperArtifactReadRequest = {
  paper_refs?: string[];
  paperRefs?: string[];
  paper_ref?: string;
  paperRef?: string;
  artifact_types?: ReferenceSidecarArtifactType[];
  artifactTypes?: ReferenceSidecarArtifactType[];
};

export type PaperArtifactReadResult = {
  paper_ref: string;
  artifact_type: ReferenceSidecarArtifactType;
  status: "available" | "missing" | "decode_error" | "unsupported";
  payload_type: string;
  probe_source?: string;
  item_found?: boolean;
  child_note_count?: number;
  note_keys_seen?: string[];
  payload_types_seen?: string[];
  note_key?: string;
  note_title?: string;
  hash?: string;
  payload_hash?: string;
  payload?: unknown;
  markdown?: string;
  decoded_text?: string;
  missing_reason?: string;
  diagnostics: string[];
};

export type ReferenceSidecarArtifactScanResult = {
  artifacts: PaperArtifactReadResult[];
  diagnostics: string[];
  sourceItems?: ReferenceSidecarInput[];
};

export type SynthesisLibraryAdapter = {
  getRegistryInputs: () => Promise<ReferenceSidecarInput[]>;
  getRegistryInputsPage?: (args?: {
    libraryId?: number;
    limit?: number;
  }) => Promise<ReferenceSidecarInput[]>;
  getRegistryInputForItem?: (args: {
    libraryId?: number;
    itemKey: string;
  }) => Promise<ReferenceSidecarInput | null>;
  getRegistryInputSummaryForItem?: (args: {
    libraryId?: number;
    itemKey: string;
  }) => Promise<ReferenceSidecarInput | null>;
  getRegistryMetadataFingerprints?: (args?: {
    libraryId?: number;
    limit?: number;
  }) => Promise<SynthesisRegistryMetadataFingerprint[]>;
  getLibraryIndex: () => Promise<SynthesisLibraryIndex>;
  getCitationGraphInputs: () => Promise<CitationGraphPaperInput[]>;
  scanArtifactSidecars?: (args?: {
    sourceRefs?: string[];
    artifactTypes?: ReferenceSidecarArtifactType[];
  }) => Promise<ReferenceSidecarArtifactScanResult>;
  readPaperArtifacts: (
    args: PaperArtifactReadRequest,
  ) => Promise<{ artifacts: PaperArtifactReadResult[]; diagnostics: string[] }>;
};

const PAYLOAD_TYPES: Record<ReferenceSidecarArtifactType, string> = {
  digest: "digest-markdown",
  references: "references-json",
  citation_analysis: "citation-analysis-json",
};

const ARTIFACT_TYPE_ALIASES: Record<string, ReferenceSidecarArtifactType> = {
  digest: "digest",
  "digest-markdown": "digest",
  references: "references",
  reference: "references",
  "references-json": "references",
  citation_analysis: "citation_analysis",
  citationAnalysis: "citation_analysis",
  "citation-analysis": "citation_analysis",
  "citation-analysis-json": "citation_analysis",
};

const DEFAULT_ARTIFACT_TYPES: ReferenceSidecarArtifactType[] = [
  "digest",
  "references",
  "citation_analysis",
];

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeLibraryId(value: unknown, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function readField(item: any, field: string) {
  try {
    return cleanString(item?.getField?.(field));
  } catch {
    return "";
  }
}

function extractCitekeyFromExtra(extraValue: unknown) {
  const match = String(extraValue || "").match(
    /(?:^|\n)\s*(?:citation\s*key|citekey)\s*:\s*([^\s]+)\s*(?:$|\n)/i,
  );
  return cleanString(match?.[1]);
}

function getCitekey(item: any) {
  return (
    readField(item, "citationKey") ||
    cleanString(item?.toJSON?.()?.citationKey) ||
    extractCitekeyFromExtra(readField(item, "extra"))
  );
}

function getYearFromValue(value: unknown) {
  return (
    cleanString(value).match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/)?.[1] || ""
  );
}

function getYear(item: any) {
  const json = typeof item?.toJSON === "function" ? item.toJSON?.() || {} : {};
  const candidates = [
    readField(item, "year"),
    cleanString(item?.year),
    cleanString(json?.year),
    readField(item, "date"),
    cleanString(json?.date),
  ];
  for (const candidate of candidates) {
    const year = getYearFromValue(candidate);
    if (year) {
      return year;
    }
  }
  return "";
}

function getTitle(item: any) {
  return readField(item, "title") || cleanString(item?.getDisplayTitle?.());
}

function getCreators(item: any) {
  try {
    const creators = item?.getCreators?.() || [];
    const names = creators
      .map((creator: any) =>
        cleanString(
          [creator.firstName, creator.lastName].filter(Boolean).join(" ") ||
            creator.name ||
            creator.lastName ||
            creator.firstName,
        ),
      )
      .filter(Boolean);
    if (names.length) {
      return names;
    }
  } catch {
    // fall through to firstCreator
  }
  const firstCreator = cleanString(item?.firstCreator);
  return firstCreator ? [firstCreator] : [];
}

function getTags(item: any) {
  try {
    return Array.from<string>(
      new Set(
        (item?.getTags?.() || [])
          .map((entry: any) => cleanString(entry?.tag))
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

function collectionRefs(item: any) {
  try {
    return (item?.getCollections?.() || [])
      .map((entry: unknown) => cleanString(entry))
      .filter(Boolean)
      .sort((left: string, right: string) => left.localeCompare(right));
  } catch {
    return [];
  }
}

function noteTitle(note: any) {
  return readField(note, "title") || cleanString(note?.getDisplayTitle?.());
}

function zoteroRuntime() {
  const zotero = (globalThis as { Zotero?: any }).Zotero;
  if (!zotero) {
    throw new Error(
      "Zotero runtime is unavailable for synthesis library adapter",
    );
  }
  return zotero;
}

async function childNotes(item: any): Promise<ReferenceSidecarInputNote[]> {
  const zotero = zoteroRuntime();
  let ids: unknown[] = [];
  try {
    ids = item?.getNotes?.() || [];
  } catch {
    ids = [];
  }
  const notes = ids
    .map((id) => zotero.Items?.get?.(Number(id)))
    .filter(Boolean);
  const rows = [];
  for (const note of notes) {
    rows.push({
      key: cleanString(note.key),
      title: noteTitle(note),
      html: cleanString(note.getNote?.()),
      updatedAt: cleanString(note.dateModified || note.dateAdded),
      payloadBlocks: await listNotePayloadBlocksForItem(note),
    });
  }
  return rows.filter((note) => note.key);
}

async function paperInputFromItem(
  item: any,
  fallbackLibraryId: number,
): Promise<ReferenceSidecarInput> {
  const libraryId = normalizeLibraryId(item?.libraryID, fallbackLibraryId);
  return {
    libraryId,
    itemKey: cleanString(item?.key),
    title: getTitle(item),
    year: getYear(item),
    itemType: cleanString(item?.itemType),
    tags: getTags(item),
    collections: collectionRefs(item),
    notes: await childNotes(item),
    creators: getCreators(item),
    doi: readField(item, "DOI"),
    isbn: readField(item, "ISBN"),
    url: readField(item, "url"),
    citekey: getCitekey(item),
    dateAdded: cleanString(item?.dateAdded),
  };
}

function paperInputSummaryFromItem(
  item: any,
  fallbackLibraryId: number,
): ReferenceSidecarInput {
  const libraryId = normalizeLibraryId(item?.libraryID, fallbackLibraryId);
  return {
    libraryId,
    itemKey: cleanString(item?.key),
    title: getTitle(item),
    year: getYear(item),
    itemType: cleanString(item?.itemType),
    tags: getTags(item),
    collections: collectionRefs(item),
    creators: getCreators(item),
    doi: readField(item, "DOI"),
    isbn: readField(item, "ISBN"),
    url: readField(item, "url"),
    citekey: getCitekey(item),
    dateAdded: cleanString(item?.dateAdded),
  };
}

function metadataFingerprintFromItem(
  item: any,
  fallbackLibraryId: number,
): SynthesisRegistryMetadataFingerprint {
  const libraryId = normalizeLibraryId(item?.libraryID, fallbackLibraryId);
  const itemKey = cleanString(item?.key);
  const deleted =
    typeof item?.isDeleted === "function"
      ? item.isDeleted()
      : Boolean(item?.deleted);
  const metadata = buildReferenceSidecarMetadataFingerprintPayload({
    title: getTitle(item),
    year: getYear(item),
    itemType: cleanString(item?.itemType),
    creators: getCreators(item),
    tags: getTags(item),
    collections: collectionRefs(item),
    doi: readField(item, "DOI"),
    isbn: readField(item, "ISBN"),
    url: readField(item, "url"),
    arxiv: "",
  });
  return {
    library_id: libraryId,
    item_key: itemKey,
    paper_ref: `${libraryId}:${itemKey}`,
    deleted,
    hash: hashCanonicalJson(metadata),
    updated_at: cleanString(item?.dateModified || item?.dateAdded) || undefined,
  };
}

function isVisibleTopLevelRegular(item: any) {
  if (!item) {
    return false;
  }
  const regular =
    typeof item?.isRegularItem === "function"
      ? item.isRegularItem()
      : !item?.isNote?.() && !item?.isAttachment?.();
  const topLevel =
    typeof item?.isTopLevelItem === "function"
      ? item.isTopLevelItem()
      : !Number(item?.parentItemID || item?.parentID || 0);
  const deleted =
    typeof item?.isDeleted === "function"
      ? item.isDeleted()
      : Boolean(item?.deleted);
  return regular && topLevel && !deleted;
}

async function registryInputsFromZotero(libraryId: number) {
  const items = await getAllRegularZoteroItems(libraryId);
  const rows = await Promise.all(
    items
      .filter(isVisibleTopLevelRegular)
      .filter(
        (item: any) =>
          normalizeLibraryId(item?.libraryID, libraryId) === libraryId,
      )
      .map((item) => paperInputFromItem(item, libraryId)),
  );
  return rows
    .filter((input) => input.itemKey)
    .sort((left, right) => left.itemKey.localeCompare(right.itemKey));
}

function itemByLibraryAndKey(libraryId: number, itemKey: string) {
  const zotero = zoteroRuntime();
  return zotero.Items?.getByLibraryAndKey?.(libraryId, itemKey) || null;
}

function itemById(itemId: number) {
  const zotero = zoteroRuntime();
  return zotero.Items?.get?.(itemId) || null;
}

function itemIdFromQueryRow(row: unknown) {
  if (typeof row === "number") {
    return Math.max(0, Math.floor(row));
  }
  if (!row || typeof row !== "object") {
    return 0;
  }
  const record = row as Record<string, unknown>;
  return Math.max(
    0,
    Math.floor(
      Number(
        record.itemID || record.itemId || record.item_id || record.id || 0,
      ) || 0,
    ),
  );
}

async function queryVisibleTopLevelRegularItemIds(args: {
  libraryId: number;
  limit: number;
}) {
  const zotero = zoteroRuntime();
  const queryAsync = zotero.DB?.queryAsync;
  if (typeof queryAsync !== "function") {
    return null;
  }
  const limit = Math.max(1, Math.floor(Number(args.limit) || 1));
  const baseParams = [args.libraryId, limit];
  const queries = [
    `
      SELECT I.itemID
      FROM items I
      LEFT JOIN itemNotes N ON N.itemID = I.itemID
      LEFT JOIN itemAttachments A ON A.itemID = I.itemID
      LEFT JOIN deletedItems D ON D.itemID = I.itemID
      WHERE I.libraryID = ?
        AND N.itemID IS NULL
        AND A.itemID IS NULL
        AND D.itemID IS NULL
      ORDER BY I.key ASC
      LIMIT ?
    `,
    `
      SELECT I.itemID
      FROM items I
      LEFT JOIN itemNotes N ON N.itemID = I.itemID
      LEFT JOIN itemAttachments A ON A.itemID = I.itemID
      WHERE I.libraryID = ?
        AND N.itemID IS NULL
        AND A.itemID IS NULL
      ORDER BY I.key ASC
      LIMIT ?
    `,
  ];
  for (const sql of queries) {
    try {
      const rows = await queryAsync.call(zotero.DB, sql, baseParams);
      return (Array.isArray(rows) ? rows : [])
        .map(itemIdFromQueryRow)
        .filter(Boolean);
    } catch {
      // Try the next schema-compatible query or fall back to a bounded scan.
    }
  }
  return null;
}

function boundedVisibleTopLevelRegularItems(args: {
  libraryId: number;
  limit: number;
}) {
  const limit = Math.max(1, Math.floor(Number(args.limit) || 1));
  const rows = [];
  let misses = 0;
  for (let id = 1; id <= 50000 && rows.length < limit; id += 1) {
    const item = itemById(id);
    if (!item) {
      misses += 1;
      if (misses >= 500) {
        break;
      }
      continue;
    }
    misses = 0;
    if (
      isVisibleTopLevelRegular(item) &&
      normalizeLibraryId(item?.libraryID, args.libraryId) === args.libraryId
    ) {
      rows.push(item);
    }
  }
  return rows;
}

async function visibleTopLevelRegularItemsPage(args: {
  libraryId: number;
  limit: number;
}) {
  const requestedLimit = Math.max(1, Math.floor(Number(args.limit) || 1));
  const ids = await queryVisibleTopLevelRegularItemIds({
    libraryId: args.libraryId,
    limit: requestedLimit,
  });
  if (ids) {
    return ids
      .map((id) => itemById(id))
      .filter(isVisibleTopLevelRegular)
      .filter(
        (item: any) =>
          normalizeLibraryId(item?.libraryID, args.libraryId) ===
          args.libraryId,
      )
      .sort((left: any, right: any) =>
        cleanString(left?.key).localeCompare(cleanString(right?.key)),
      );
  }
  return boundedVisibleTopLevelRegularItems({
    libraryId: args.libraryId,
    limit: requestedLimit,
  }).sort((left: any, right: any) =>
    cleanString(left?.key).localeCompare(cleanString(right?.key)),
  );
}

function resolveCollection(ref: string, libraryId: number) {
  const zotero = zoteroRuntime();
  const numeric = Number(ref);
  const byId = Number.isFinite(numeric)
    ? zotero.Collections?.get?.(numeric)
    : null;
  if (byId) {
    return byId;
  }
  return zotero.Collections?.getByLibraryAndKey?.(libraryId, ref) || null;
}

function collectionIndex(inputs: ReferenceSidecarInput[], libraryId: number) {
  const counts = new Map<string, number>();
  for (const input of inputs) {
    for (const ref of input.collections || []) {
      const key = cleanString(ref);
      if (key) {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([ref, count]) => {
      const collection = resolveCollection(ref, libraryId);
      return {
        id: cleanString((collection as any)?.id || ref),
        key: cleanString((collection as any)?.key || ref),
        name: cleanString((collection as any)?.name || ref),
        library_id: normalizeLibraryId(
          (collection as any)?.libraryID,
          libraryId,
        ),
        item_count: count,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function buildLibraryIndexFromRegistryInputs(
  libraryId: number,
  inputs: ReferenceSidecarInput[],
): SynthesisLibraryIndex {
  const tagCounts = new Map<string, number>();
  const papers = inputs.map((input) => {
    for (const tag of input.tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
    return {
      paper_ref: `${input.libraryId}:${input.itemKey}`,
      library_id: input.libraryId,
      item_key: input.itemKey,
      title: input.title,
      year: cleanString(input.year),
      item_type: cleanString(input.itemType),
      creators: [...(input.creators || [])],
      tags: [...(input.tags || [])],
      collections: [...(input.collections || [])],
    };
  });
  return {
    libraryId,
    papers: papers.sort((left, right) => left.title.localeCompare(right.title)),
    tags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => left.tag.localeCompare(right.tag)),
    collections: collectionIndex(inputs, libraryId),
    diagnostics: inputs.length ? [] : ["library_index_empty"],
  };
}

function normalizeArtifactType(
  value: unknown,
): ReferenceSidecarArtifactType | null {
  const text = cleanString(value);
  return ARTIFACT_TYPE_ALIASES[text] || null;
}

function normalizeArtifactTypes(
  values: unknown,
): ReferenceSidecarArtifactType[] {
  const rawValues = Array.isArray(values) ? values : [];
  const normalized = rawValues
    .map(normalizeArtifactType)
    .filter((entry): entry is ReferenceSidecarArtifactType => !!entry);
  const source = normalized.length ? normalized : DEFAULT_ARTIFACT_TYPES;
  return Array.from(new Set(source));
}

function payloadBlocksForInput(input: ReferenceSidecarInput) {
  const noteRows = [...(input.notes || [])].sort((left, right) =>
    cleanString(left.key).localeCompare(cleanString(right.key)),
  );
  const rows: Array<{
    note: ReferenceSidecarInputNote;
    block: ZoteroNotePayloadBlock;
  }> = [];
  const payloadTypesSeen: string[] = [];
  const decodeErrors: string[] = [];
  for (const note of noteRows) {
    for (const block of note.payloadBlocks ||
      listNotePayloadBlocks(note.html)) {
      const payloadType = cleanString(block.payloadType);
      if (payloadType) {
        payloadTypesSeen.push(payloadType);
      }
      if (block.errors?.length) {
        decodeErrors.push(
          `${cleanString(note.key) || "unknown-note"}:${payloadType}:${block.errors.join("; ")}`,
        );
      }
      rows.push({ note, block });
    }
  }
  return {
    rows,
    noteKeysSeen: noteRows.map((note) => cleanString(note.key)).filter(Boolean),
    childNoteCount: noteRows.length,
    payloadTypesSeen: Array.from(new Set(payloadTypesSeen)).sort(
      (left, right) => left.localeCompare(right),
    ),
    decodeErrors,
  };
}

function payloadProbeFields(args: {
  inputFound: boolean;
  childNoteCount?: number;
  noteKeysSeen?: string[];
  payloadTypesSeen?: string[];
}) {
  return {
    probe_source: "synthesis.read_paper_artifacts",
    item_found: args.inputFound,
    child_note_count: args.childNoteCount || 0,
    note_keys_seen: [...(args.noteKeysSeen || [])],
    payload_types_seen: [...(args.payloadTypesSeen || [])],
  };
}

function firstPayloadBlock(args: {
  input: ReferenceSidecarInput;
  scan: ReturnType<typeof payloadBlocksForInput>;
  artifactType: ReferenceSidecarArtifactType;
}) {
  const payloadType = PAYLOAD_TYPES[args.artifactType];
  const acceptedSources = new Set([
    "embedded-image-attachment",
    "html-payload-block",
  ]);
  let decodeError: {
    note: ReferenceSidecarInputNote;
    block: ZoteroNotePayloadBlock;
  } | null = null;
  for (const row of args.scan.rows) {
    if (row.block.payloadType !== payloadType) {
      continue;
    }
    if (!acceptedSources.has(cleanString(row.block.source))) {
      continue;
    }
    if (!row.block.errors?.length) {
      return { ...row, decodeError: false };
    }
    decodeError ||= row;
  }
  return decodeError ? { ...decodeError, decodeError: true } : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStringOrArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  return cleanString(value) ? [value] : [];
}

function normalizeRoles(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(cleanString).filter(Boolean);
  }
  const role = cleanString(value);
  return role ? [role] : [];
}

function referenceTitleKey(value: unknown) {
  return cleanString(value).toLowerCase().replace(/\s+/g, " ");
}

function rolesByReference(payload: unknown) {
  const byIndex = new Map<number, string[]>();
  const byTitle = new Map<string, string[]>();
  const citations = asArray((payload as any)?.citations);
  for (const citation of citations) {
    const roles = normalizeRoles(
      (citation as any)?.roles || (citation as any)?.role,
    );
    if (!roles.length) {
      continue;
    }
    const rawIndex =
      (citation as any)?.reference_index ?? (citation as any)?.index;
    const index = Number(rawIndex);
    if (Number.isFinite(index) && index >= 0) {
      byIndex.set(index, [...(byIndex.get(index) || []), ...roles]);
    }
    const title = referenceTitleKey(
      (citation as any)?.title || (citation as any)?.reference_title,
    );
    if (title) {
      byTitle.set(title, [...(byTitle.get(title) || []), ...roles]);
    }
  }
  return { byIndex, byTitle };
}

function extractReferences(
  input: ReferenceSidecarInput,
): CitationGraphReferenceInput[] {
  const scan = payloadBlocksForInput(input);
  const referencesBlock = firstPayloadBlock({
    input,
    scan,
    artifactType: "references",
  });
  if (!referencesBlock) {
    return [];
  }
  const citationBlock = firstPayloadBlock({
    input,
    scan,
    artifactType: "citation_analysis",
  });
  const roleMaps = rolesByReference(citationBlock?.block.payload);
  const payload = referencesBlock.block.payload as any;
  const references = asArray(payload?.references || payload?.items || payload);
  return references.map((entry, index): CitationGraphReferenceInput => {
    const source = entry as any;
    const title = cleanString(
      source.title || source.paper_title || source.raw_title,
    );
    const raw = cleanString(
      source.rawText || source.raw || source.reference || source.text,
    );
    const roles = [
      ...normalizeRoles(source.roles || source.role),
      ...(roleMaps.byIndex.get(index) || []),
      ...(roleMaps.byTitle.get(referenceTitleKey(title)) || []),
    ];
    return {
      citekey: cleanString(
        source.citekey || source.citeKey || source.citationKey,
      ),
      doi: cleanString(source.doi || source.DOI),
      arxiv: cleanString(source.arxiv || source.arXiv),
      isbn: cleanString(source.isbn || source.ISBN),
      url: cleanString(source.url),
      title,
      year: cleanString(source.year || source.date),
      authors: asStringOrArray(
        source.author || source.authors || source.creators,
      )
        .map((author) =>
          typeof author === "string"
            ? cleanString(author)
            : cleanString((author as any)?.name || (author as any)?.lastName),
        )
        .filter(Boolean),
      raw,
      roles: Array.from(new Set(roles)).sort((left, right) =>
        left.localeCompare(right),
      ),
    };
  });
}

export function buildCitationGraphInputsFromRegistryInputs(
  inputs: ReferenceSidecarInput[],
): CitationGraphPaperInput[] {
  return inputs.map((input) => ({
    libraryId: input.libraryId,
    itemKey: input.itemKey,
    title: input.title,
    year: cleanString(input.year),
    authors: [...(input.creators || [])],
    doi: cleanString(input.doi),
    arxiv: cleanString(input.arxiv),
    isbn: cleanString(input.isbn),
    url: cleanString(input.url),
    citekey: cleanString(input.citekey),
    dateAdded: cleanString(input.dateAdded),
    references: extractReferences(input),
  }));
}

function artifactHash(block: ZoteroNotePayloadBlock) {
  if (block.format === "json") {
    return hashCanonicalJson(block.payload);
  }
  return hashMarkdown(block.markdown || block.decodedText || "");
}

export function readArtifactsFromRegistryInputs(
  inputs: ReferenceSidecarInput[],
  args: PaperArtifactReadRequest,
) {
  const refs = new Set(
    [
      ...(args.paper_refs || []),
      ...(args.paperRefs || []),
      args.paper_ref,
      args.paperRef,
    ]
      .map(cleanString)
      .filter(Boolean),
  );
  const requestedTypes = normalizeArtifactTypes(
    args.artifact_types || args.artifactTypes,
  );
  const artifacts: PaperArtifactReadResult[] = [];
  const diagnostics: string[] = [];
  const matchedRefs = new Set<string>();
  for (const input of inputs) {
    const paperRef = `${input.libraryId}:${input.itemKey}`;
    if (refs.size && !refs.has(paperRef) && !refs.has(input.itemKey)) {
      continue;
    }
    matchedRefs.add(paperRef);
    matchedRefs.add(input.itemKey);
    const scan = payloadBlocksForInput(input);
    const baseProbe = payloadProbeFields({
      inputFound: true,
      childNoteCount: scan.childNoteCount,
      noteKeysSeen: scan.noteKeysSeen,
      payloadTypesSeen: scan.payloadTypesSeen,
    });
    diagnostics.push(
      `${paperRef}:probe:notes=${scan.childNoteCount}:payloads=${scan.payloadTypesSeen.join(",") || "none"}`,
    );
    diagnostics.push(
      ...scan.decodeErrors.map((entry) => `${paperRef}:decode_error:${entry}`),
    );
    for (const type of requestedTypes) {
      const found = firstPayloadBlock({ input, scan, artifactType: type });
      if (!found) {
        diagnostics.push(`${paperRef}:${PAYLOAD_TYPES[type]}:missing`);
        artifacts.push({
          ...baseProbe,
          paper_ref: paperRef,
          artifact_type: type,
          status: "missing",
          payload_type: PAYLOAD_TYPES[type],
          missing_reason: "payload_not_found",
          diagnostics: [
            `${paperRef}:${PAYLOAD_TYPES[type]}:missing`,
            `child_note_count=${scan.childNoteCount}`,
            `payload_types_seen=${scan.payloadTypesSeen.join(",") || "none"}`,
          ],
        });
        continue;
      }
      if (found.decodeError) {
        const errors = found.block.errors || ["decode_error"];
        diagnostics.push(
          `${paperRef}:${PAYLOAD_TYPES[type]}:decode_error:${errors.join("; ")}`,
        );
        artifacts.push({
          ...baseProbe,
          paper_ref: paperRef,
          artifact_type: type,
          status: "decode_error",
          payload_type: PAYLOAD_TYPES[type],
          note_key: found.note.key,
          note_title: cleanString(found.note.title),
          missing_reason: "payload_decode_error",
          diagnostics: errors,
        });
        continue;
      }
      const payloadHash = artifactHash(found.block);
      artifacts.push({
        ...baseProbe,
        paper_ref: paperRef,
        artifact_type: type,
        status: "available",
        payload_type: PAYLOAD_TYPES[type],
        note_key: found.note.key,
        note_title: cleanString(found.note.title),
        hash: payloadHash,
        payload_hash: payloadHash,
        payload: found.block.payload,
        markdown: found.block.markdown,
        decoded_text: found.block.decodedText,
        diagnostics: [],
      });
    }
  }
  for (const ref of refs) {
    if (matchedRefs.has(ref)) {
      continue;
    }
    diagnostics.push(`${ref}:paper_not_found`);
    for (const type of requestedTypes) {
      artifacts.push({
        ...payloadProbeFields({ inputFound: false }),
        paper_ref: ref,
        artifact_type: type,
        status: "missing",
        payload_type: PAYLOAD_TYPES[type],
        missing_reason: "paper_not_found",
        diagnostics: [`${ref}:paper_not_found`],
      });
    }
  }
  return { artifacts, diagnostics, sourceItems: inputs };
}

export function createZoteroSynthesisLibraryAdapter(
  args: {
    libraryId?: number;
  } = {},
): SynthesisLibraryAdapter {
  const libraryId =
    normalizeLibraryId(args.libraryId, 0) ||
    normalizeLibraryId(zoteroRuntime().Libraries?.userLibraryID, 1);
  async function inputs() {
    return registryInputsFromZotero(libraryId);
  }
  return {
    getRegistryInputs: inputs,
    async getRegistryInputsPage(request = {}) {
      const requestedLibraryId = normalizeLibraryId(
        request.libraryId,
        libraryId,
      );
      const limit = Math.max(0, Math.floor(Number(request.limit) || 0));
      const page = await visibleTopLevelRegularItemsPage({
        libraryId: requestedLibraryId,
        limit: limit > 0 ? limit : 250,
      });
      return page
        .map((item: any) => paperInputSummaryFromItem(item, requestedLibraryId))
        .filter((input) => input.itemKey);
    },
    async getRegistryInputForItem(request) {
      const requestedLibraryId = normalizeLibraryId(
        request.libraryId,
        libraryId,
      );
      const itemKey = cleanString(request.itemKey);
      if (!itemKey) {
        return null;
      }
      const item = itemByLibraryAndKey(requestedLibraryId, itemKey);
      if (!item || !isVisibleTopLevelRegular(item)) {
        return null;
      }
      return paperInputFromItem(item, requestedLibraryId);
    },
    async getRegistryInputSummaryForItem(request) {
      const requestedLibraryId = normalizeLibraryId(
        request.libraryId,
        libraryId,
      );
      const itemKey = cleanString(request.itemKey);
      if (!itemKey) {
        return null;
      }
      const item = itemByLibraryAndKey(requestedLibraryId, itemKey);
      if (!item || !isVisibleTopLevelRegular(item)) {
        return null;
      }
      return paperInputSummaryFromItem(item, requestedLibraryId);
    },
    async getRegistryMetadataFingerprints(request = {}) {
      const requestedLibraryId = normalizeLibraryId(
        request.libraryId,
        libraryId,
      );
      const limit = Math.max(0, Math.floor(Number(request.limit) || 0));
      const items = await getAllRegularZoteroItems(requestedLibraryId);
      const rows = items
        .filter((item: any) => {
          const regular =
            typeof item?.isRegularItem === "function"
              ? item.isRegularItem()
              : !item?.isNote?.() && !item?.isAttachment?.();
          const topLevel =
            typeof item?.isTopLevelItem === "function"
              ? item.isTopLevelItem()
              : !Number(item?.parentItemID || item?.parentID || 0);
          return (
            regular &&
            topLevel &&
            normalizeLibraryId(item?.libraryID, requestedLibraryId) ===
              requestedLibraryId
          );
        })
        .map((item: any) =>
          metadataFingerprintFromItem(item, requestedLibraryId),
        )
        .filter((entry) => entry.item_key)
        .sort((left, right) => left.item_key.localeCompare(right.item_key));
      return limit > 0 ? rows.slice(0, limit) : rows;
    },
    async getLibraryIndex() {
      return buildLibraryIndexFromRegistryInputs(libraryId, await inputs());
    },
    async getCitationGraphInputs() {
      return buildCitationGraphInputsFromRegistryInputs(await inputs());
    },
    async scanArtifactSidecars(args = {}) {
      return readArtifactsFromRegistryInputs(await inputs(), {
        paper_refs: args.sourceRefs,
        artifact_types: args.artifactTypes || DEFAULT_ARTIFACT_TYPES,
      });
    },
    async readPaperArtifacts(args) {
      return readArtifactsFromRegistryInputs(await inputs(), args);
    },
  };
}

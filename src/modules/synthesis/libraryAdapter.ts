import {
  getAllRegularZoteroItems,
} from "../zoteroHostCapabilityBroker";
import {
  listNotePayloadBlocks,
  type ZoteroNotePayloadBlock,
} from "../notePayloadCodec";
import type { CitationGraphPaperInput, CitationGraphReferenceInput } from "./citationGraph";
import { hashCanonicalJson, hashMarkdown } from "./foundation";
import type {
  PaperRegistryInput,
  PaperRegistryInputNote,
  RegistryArtifactType,
} from "./registry";

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
};

export type PaperArtifactReadRequest = {
  paper_refs?: string[];
  paperRefs?: string[];
  paper_ref?: string;
  paperRef?: string;
  artifact_types?: RegistryArtifactType[];
  artifactTypes?: RegistryArtifactType[];
};

export type PaperArtifactReadResult = {
  paper_ref: string;
  artifact_type: RegistryArtifactType;
  payload_type: string;
  note_key: string;
  note_title: string;
  hash: string;
  payload: unknown;
  markdown?: string;
  decoded_text?: string;
  diagnostics: string[];
};

export type SynthesisLibraryAdapter = {
  getRegistryInputs: () => Promise<PaperRegistryInput[]>;
  getLibraryIndex: () => Promise<SynthesisLibraryIndex>;
  getCitationGraphInputs: () => Promise<CitationGraphPaperInput[]>;
  readPaperArtifacts: (
    args: PaperArtifactReadRequest,
  ) => Promise<{ artifacts: PaperArtifactReadResult[]; diagnostics: string[] }>;
};

const PAYLOAD_TYPES: Record<RegistryArtifactType, string> = {
  digest: "digest-markdown",
  references: "references-json",
  citation_analysis: "citation-analysis-json",
};

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

function getYear(date: string) {
  return cleanString(date).match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/)?.[1] || "";
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
    throw new Error("Zotero runtime is unavailable for synthesis library adapter");
  }
  return zotero;
}

function childNotes(item: any): PaperRegistryInputNote[] {
  const zotero = zoteroRuntime();
  let ids: unknown[] = [];
  try {
    ids = item?.getNotes?.() || [];
  } catch {
    ids = [];
  }
  return ids
    .map((id) => zotero.Items?.get?.(Number(id)))
    .filter(Boolean)
    .map((note: any) => ({
      key: cleanString(note.key),
      title: noteTitle(note),
      html: cleanString(note.getNote?.()),
      updatedAt: cleanString(note.dateModified || note.dateAdded),
    }))
    .filter((note) => note.key);
}

function paperInputFromItem(item: any, fallbackLibraryId: number): PaperRegistryInput {
  const libraryId = normalizeLibraryId(item?.libraryID, fallbackLibraryId);
  const date = readField(item, "date");
  return {
    libraryId,
    itemKey: cleanString(item?.key),
    title: getTitle(item),
    year: getYear(date),
    itemType: cleanString(item?.itemType),
    tags: getTags(item),
    collections: collectionRefs(item),
    notes: childNotes(item),
    creators: getCreators(item),
    doi: readField(item, "DOI"),
    url: readField(item, "url"),
    citekey: getCitekey(item),
    dateAdded: cleanString(item?.dateAdded),
  };
}

function isVisibleTopLevelRegular(item: any) {
  const regular =
    typeof item?.isRegularItem === "function"
      ? item.isRegularItem()
      : !item?.isNote?.() && !item?.isAttachment?.();
  const topLevel =
    typeof item?.isTopLevelItem === "function"
      ? item.isTopLevelItem()
      : !Number(item?.parentItemID || item?.parentID || 0);
  const deleted =
    typeof item?.isDeleted === "function" ? item.isDeleted() : Boolean(item?.deleted);
  return regular && topLevel && !deleted;
}

async function registryInputsFromZotero(libraryId: number) {
  const items = await getAllRegularZoteroItems();
  return items
    .filter(isVisibleTopLevelRegular)
    .filter((item: any) => normalizeLibraryId(item?.libraryID, libraryId) === libraryId)
    .map((item) => paperInputFromItem(item, libraryId))
    .filter((input) => input.itemKey)
    .sort((left, right) => left.itemKey.localeCompare(right.itemKey));
}

function resolveCollection(ref: string, libraryId: number) {
  const zotero = zoteroRuntime();
  const numeric = Number(ref);
  const byId = Number.isFinite(numeric) ? zotero.Collections?.get?.(numeric) : null;
  if (byId) {
    return byId;
  }
  return zotero.Collections?.getByLibraryAndKey?.(libraryId, ref) || null;
}

function collectionIndex(inputs: PaperRegistryInput[], libraryId: number) {
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
        library_id: normalizeLibraryId((collection as any)?.libraryID, libraryId),
        item_count: count,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function buildLibraryIndexFromRegistryInputs(
  libraryId: number,
  inputs: PaperRegistryInput[],
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

function firstPayloadBlock(
  input: PaperRegistryInput,
  artifactType: RegistryArtifactType,
) {
  const payloadType = PAYLOAD_TYPES[artifactType];
  for (const note of [...(input.notes || [])].sort((left, right) =>
    cleanString(left.key).localeCompare(cleanString(right.key)),
  )) {
    const block = listNotePayloadBlocks(note.html).find(
      (entry) => entry.payloadType === payloadType && !entry.errors?.length,
    );
    if (block) {
      return { note, block };
    }
  }
  return null;
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
    const roles = normalizeRoles((citation as any)?.roles || (citation as any)?.role);
    if (!roles.length) {
      continue;
    }
    const rawIndex = (citation as any)?.reference_index ?? (citation as any)?.index;
    const index = Number(rawIndex);
    if (Number.isFinite(index) && index >= 0) {
      byIndex.set(index, [...(byIndex.get(index) || []), ...roles]);
    }
    const title = referenceTitleKey((citation as any)?.title || (citation as any)?.reference_title);
    if (title) {
      byTitle.set(title, [...(byTitle.get(title) || []), ...roles]);
    }
  }
  return { byIndex, byTitle };
}

function extractReferences(input: PaperRegistryInput): CitationGraphReferenceInput[] {
  const referencesBlock = firstPayloadBlock(input, "references");
  if (!referencesBlock) {
    return [];
  }
  const citationBlock = firstPayloadBlock(input, "citation_analysis");
  const roleMaps = rolesByReference(citationBlock?.block.payload);
  const payload = referencesBlock.block.payload as any;
  const references = asArray(payload?.references || payload?.items || payload);
  return references.map((entry, index): CitationGraphReferenceInput => {
    const source = entry as any;
    const title = cleanString(source.title || source.paper_title || source.raw_title);
    const raw = cleanString(
      source.rawText || source.raw || source.reference || source.text,
    );
    const roles = [
      ...normalizeRoles(source.roles || source.role),
      ...(roleMaps.byIndex.get(index) || []),
      ...(roleMaps.byTitle.get(referenceTitleKey(title)) || []),
    ];
    return {
      citekey: cleanString(source.citekey || source.citeKey || source.citationKey),
      doi: cleanString(source.doi || source.DOI),
      arxiv: cleanString(source.arxiv || source.arXiv),
      url: cleanString(source.url),
      title,
      year: cleanString(source.year || source.date),
      authors: asStringOrArray(source.author || source.authors || source.creators)
        .map((author) =>
          typeof author === "string"
            ? cleanString(author)
            : cleanString((author as any)?.name || (author as any)?.lastName),
        )
        .filter(Boolean),
      raw,
      roles: Array.from(new Set(roles)).sort((left, right) => left.localeCompare(right)),
    };
  });
}

export function buildCitationGraphInputsFromRegistryInputs(
  inputs: PaperRegistryInput[],
): CitationGraphPaperInput[] {
  return inputs.map((input) => ({
    libraryId: input.libraryId,
    itemKey: input.itemKey,
    title: input.title,
    year: cleanString(input.year),
    authors: [...(input.creators || [])],
    doi: cleanString(input.doi),
    arxiv: cleanString(input.arxiv),
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
  inputs: PaperRegistryInput[],
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
  const types = new Set<RegistryArtifactType>(
    (args.artifact_types || args.artifactTypes || [
      "digest",
      "references",
      "citation_analysis",
    ]) as RegistryArtifactType[],
  );
  const artifacts: PaperArtifactReadResult[] = [];
  const diagnostics: string[] = [];
  for (const input of inputs) {
    const paperRef = `${input.libraryId}:${input.itemKey}`;
    if (refs.size && !refs.has(paperRef) && !refs.has(input.itemKey)) {
      continue;
    }
    for (const type of types) {
      const found = firstPayloadBlock(input, type);
      if (!found) {
        diagnostics.push(`${paperRef}:${type}:missing`);
        continue;
      }
      artifacts.push({
        paper_ref: paperRef,
        artifact_type: type,
        payload_type: PAYLOAD_TYPES[type],
        note_key: found.note.key,
        note_title: cleanString(found.note.title),
        hash: artifactHash(found.block),
        payload: found.block.payload,
        markdown: found.block.markdown,
        decoded_text: found.block.decodedText,
        diagnostics: [],
      });
    }
  }
  return { artifacts, diagnostics };
}

export function createZoteroSynthesisLibraryAdapter(args: {
  libraryId?: number;
} = {}): SynthesisLibraryAdapter {
  const libraryId =
    normalizeLibraryId(args.libraryId, 0) ||
    normalizeLibraryId(zoteroRuntime().Libraries?.userLibraryID, 1);
  async function inputs() {
    return registryInputsFromZotero(libraryId);
  }
  return {
    getRegistryInputs: inputs,
    async getLibraryIndex() {
      return buildLibraryIndexFromRegistryInputs(libraryId, await inputs());
    },
    async getCitationGraphInputs() {
      return buildCitationGraphInputsFromRegistryInputs(await inputs());
    },
    async readPaperArtifacts(args) {
      return readArtifactsFromRegistryInputs(await inputs(), args);
    },
  };
}

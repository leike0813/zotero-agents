import { listNotePayloadBlocks } from "../notePayloadCodec";
import {
  buildCitationGraphInputsFromRegistryInputs,
  readArtifactsFromRegistryInputs,
  type SynthesisLibraryAdapter,
  type SynthesisLibraryIndex,
  type SynthesisRegistryMetadataFingerprint,
} from "../synthesis/libraryAdapter";
import { buildReferenceSidecarMetadataFingerprintPayload } from "../synthesis/registry";
import type { ReferenceSidecarInput } from "../synthesis/registry";
import { hashCanonicalJson } from "../synthesis/foundation";
import {
  createReadonlySqliteDatabase,
  type ReadonlySqliteDatabase,
} from "./sqliteReadonly";

type ZoteroReadonlyLibraryAdapterOptions = {
  dbPath: string;
  libraryId?: number;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function numberValue(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function uniqueSorted(values: unknown[]) {
  return Array.from(new Set(values.map(cleanString).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right),
  );
}

function itemFieldRows(db: ReadonlySqliteDatabase, libraryId: number) {
  return db.all(
    `
      SELECT
        items.key AS itemKey,
        fields.fieldName AS fieldName,
        itemDataValues.value AS value
      FROM items
      JOIN itemData ON itemData.itemID = items.itemID
      JOIN fields ON fields.fieldID = itemData.fieldID
      JOIN itemDataValues ON itemDataValues.valueID = itemData.valueID
      LEFT JOIN deletedItems ON deletedItems.itemID = items.itemID
      WHERE items.libraryID = @libraryId
        AND deletedItems.itemID IS NULL
    `,
    { libraryId },
  );
}

function groupRowsByKey<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T,
) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const id = cleanString(row[key]);
    if (!id) {
      continue;
    }
    grouped.set(id, [...(grouped.get(id) || []), row]);
  }
  return grouped;
}

function fieldMapForRows(rows: Record<string, unknown>[]) {
  const fields = new Map<string, string>();
  for (const row of rows) {
    fields.set(cleanString(row.fieldName), cleanString(row.value));
  }
  return fields;
}

function citekeyFromExtra(extra: string) {
  const match = extra.match(
    /(?:^|\n)\s*(?:citation\s*key|citekey)\s*:\s*([^\s]+)\s*(?:$|\n)/i,
  );
  return cleanString(match?.[1]);
}

function yearFromDate(value: string) {
  return (
    cleanString(value).match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/)?.[1] || ""
  );
}

function safeRows(
  db: ReadonlySqliteDatabase,
  sql: string,
  params: Record<string, string | number | null> = {},
) {
  try {
    return db.all(sql, params);
  } catch {
    return [];
  }
}

async function loadRegistryInputs(
  db: ReadonlySqliteDatabase,
  libraryId: number,
): Promise<ReferenceSidecarInput[]> {
  const itemRows = safeRows(
    db,
    `
      SELECT
        items.itemID AS itemID,
        items.key AS itemKey,
        items.dateAdded AS dateAdded,
        itemTypes.typeName AS itemType
      FROM items
      JOIN itemTypes ON itemTypes.itemTypeID = items.itemTypeID
      LEFT JOIN deletedItems ON deletedItems.itemID = items.itemID
      LEFT JOIN itemAttachments ON itemAttachments.itemID = items.itemID
      LEFT JOIN itemNotes ON itemNotes.itemID = items.itemID
      WHERE items.libraryID = @libraryId
        AND deletedItems.itemID IS NULL
        AND itemAttachments.itemID IS NULL
        AND itemNotes.itemID IS NULL
      ORDER BY COALESCE(items.dateModified, items.dateAdded) DESC
    `,
    { libraryId },
  );
  const fieldRows = groupRowsByKey(itemFieldRows(db, libraryId), "itemKey");
  const creators = groupRowsByKey(
    safeRows(
      db,
      `
        SELECT
          items.key AS itemKey,
          TRIM(COALESCE(creators.firstName, '') || ' ' || COALESCE(creators.lastName, '')) AS creatorName
        FROM items
        JOIN itemCreators ON itemCreators.itemID = items.itemID
        JOIN creators ON creators.creatorID = itemCreators.creatorID
        WHERE items.libraryID = @libraryId
        ORDER BY items.key, itemCreators.orderIndex
      `,
      { libraryId },
    ),
    "itemKey",
  );
  const tags = groupRowsByKey(
    safeRows(
      db,
      `
        SELECT items.key AS itemKey, tags.name AS tag
        FROM items
        JOIN itemTags ON itemTags.itemID = items.itemID
        JOIN tags ON tags.tagID = itemTags.tagID
        WHERE items.libraryID = @libraryId
        ORDER BY tags.name
      `,
      { libraryId },
    ),
    "itemKey",
  );
  const collections = groupRowsByKey(
    safeRows(
      db,
      `
        SELECT items.key AS itemKey, collections.key AS collectionKey
        FROM items
        JOIN collectionItems ON collectionItems.itemID = items.itemID
        JOIN collections ON collections.collectionID = collectionItems.collectionID
        WHERE items.libraryID = @libraryId
        ORDER BY collections.collectionName
      `,
      { libraryId },
    ),
    "itemKey",
  );
  const notes = groupRowsByKey(
    safeRows(
      db,
      `
        SELECT
          parent.key AS itemKey,
          notes.key AS noteKey,
          itemNotes.title AS title,
          itemNotes.note AS html,
          notes.dateModified AS updatedAt
        FROM itemNotes
        JOIN items AS notes ON notes.itemID = itemNotes.itemID
        JOIN items AS parent ON parent.itemID = itemNotes.parentItemID
        WHERE parent.libraryID = @libraryId
        ORDER BY notes.dateModified DESC
      `,
      { libraryId },
    ),
    "itemKey",
  );

  return itemRows.map((row) => {
    const itemKey = cleanString(row.itemKey);
    const fields = fieldMapForRows(fieldRows.get(itemKey) || []);
    const title = fields.get("title") || fields.get("shortTitle") || itemKey;
    const date = fields.get("date") || fields.get("accessDate") || "";
    const extra = fields.get("extra") || "";
    return {
      libraryId,
      itemKey,
      title,
      year: yearFromDate(date),
      itemType: cleanString(row.itemType),
      creators: uniqueSorted(
        (creators.get(itemKey) || []).map((entry) => entry.creatorName),
      ),
      tags: uniqueSorted((tags.get(itemKey) || []).map((entry) => entry.tag)),
      collections: uniqueSorted(
        (collections.get(itemKey) || []).map((entry) => entry.collectionKey),
      ),
      doi: fields.get("DOI") || fields.get("doi") || "",
      arxiv: fields.get("arXiv") || fields.get("arxiv") || "",
      isbn: fields.get("ISBN") || fields.get("isbn") || "",
      url: fields.get("url") || "",
      citekey: fields.get("citationKey") || citekeyFromExtra(extra),
      dateAdded: cleanString(row.dateAdded),
      notes: (notes.get(itemKey) || []).map((note) => {
        const html = cleanString(note.html);
        return {
          key: cleanString(note.noteKey),
          title: cleanString(note.title),
          html,
          updatedAt: cleanString(note.updatedAt),
          payloadBlocks: listNotePayloadBlocks(html),
        };
      }),
    };
  });
}

function buildLibraryIndex(
  libraryId: number,
  inputs: ReferenceSidecarInput[],
  db: ReadonlySqliteDatabase,
): SynthesisLibraryIndex {
  const tagCounts = new Map<string, number>();
  const collectionCounts = new Map<string, number>();
  const papers = inputs.map((input) => {
    for (const tag of input.tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
    for (const collection of input.collections || []) {
      collectionCounts.set(
        collection,
        (collectionCounts.get(collection) || 0) + 1,
      );
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
  const collectionNames = new Map(
    safeRows(
      db,
      `
        SELECT key, collectionName
        FROM collections
        WHERE libraryID = @libraryId
      `,
      { libraryId },
    ).map((row) => [cleanString(row.key), cleanString(row.collectionName)]),
  );
  return {
    libraryId,
    papers: papers.sort((left, right) => left.title.localeCompare(right.title)),
    tags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => left.tag.localeCompare(right.tag)),
    collections: [...collectionCounts.entries()]
      .map(([key, count]) => ({
        id: key,
        key,
        name: collectionNames.get(key) || key,
        library_id: libraryId,
        item_count: count,
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    diagnostics: inputs.length ? [] : ["library_index_empty"],
    total_papers: papers.length,
  };
}

export async function createZoteroReadonlyLibraryAdapter(
  options: ZoteroReadonlyLibraryAdapterOptions,
): Promise<SynthesisLibraryAdapter & { close: () => void }> {
  const libraryId = Math.max(1, Math.floor(numberValue(options.libraryId, 1)));
  const db = await createReadonlySqliteDatabase(options.dbPath);
  let cachedInputs: ReferenceSidecarInput[] | null = null;
  async function inputs() {
    cachedInputs ||= await loadRegistryInputs(db, libraryId);
    return cachedInputs;
  }
  return {
    async getRegistryInputs() {
      return inputs();
    },
    async getRegistryInputsPage(args) {
      const limit = Math.max(1, Math.floor(numberValue(args?.limit, 500)));
      return (await inputs()).slice(0, limit);
    },
    async getRegistryInputForItem(args) {
      const itemKey = cleanString(args.itemKey);
      return (
        (await inputs()).find((entry) => entry.itemKey === itemKey) || null
      );
    },
    async getRegistryInputSummaryForItem(args) {
      const itemKey = cleanString(args.itemKey);
      const input = (await inputs()).find((entry) => entry.itemKey === itemKey);
      return input
        ? {
            ...input,
            notes: [],
          }
        : null;
    },
    async getRegistryMetadataFingerprints(args) {
      const limit = Math.max(1, Math.floor(numberValue(args?.limit, 1000)));
      return (await inputs()).slice(0, limit).map(
        (input): SynthesisRegistryMetadataFingerprint => ({
          library_id: input.libraryId,
          item_key: input.itemKey,
          paper_ref: `${input.libraryId}:${input.itemKey}`,
          deleted: false,
          hash: hashCanonicalJson(
            buildReferenceSidecarMetadataFingerprintPayload(input),
          ),
        }),
      );
    },
    async getLibraryIndex() {
      return buildLibraryIndex(libraryId, await inputs(), db);
    },
    async getCitationGraphInputs() {
      return buildCitationGraphInputsFromRegistryInputs(await inputs());
    },
    async scanArtifactSidecars(args) {
      const result = readArtifactsFromRegistryInputs(await inputs(), {
        paper_refs: args?.sourceRefs,
        artifact_types: args?.artifactTypes,
      });
      return {
        artifacts: result.artifacts,
        diagnostics: result.diagnostics,
        sourceItems: await inputs(),
      };
    },
    async readPaperArtifacts(args) {
      return readArtifactsFromRegistryInputs(await inputs(), args);
    },
    close() {
      db.close();
    },
  };
}

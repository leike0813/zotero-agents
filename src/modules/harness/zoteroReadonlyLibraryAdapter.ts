import { listNotePayloadBlocks } from "../notePayloadCodec";
import { readArtifactsFromRegistryInputs } from "../synthesis/libraryAdapter";
import { buildReferenceSidecarMetadataFingerprintPayload } from "../synthesis/registry";
import type { ReferenceSidecarInput } from "../synthesis/registry";
import { hashCanonicalJson } from "../synthesis/foundation";
import { buildLiteratureQualitySnapshot } from "../../shared/literatureScore";
import {
  SYNTHESIS_HOST_READ_PAGE_LIMIT_DEFAULT,
  SYNTHESIS_HOST_READ_PAGE_LIMIT_MAX,
  SYNTHESIS_HOST_READ_REF_LIMIT_MAX,
  SynthesisClientError,
  toSynthesisJsonValue,
  type SynthesisHostArtifactDescriptor,
  type SynthesisHostArtifactType,
  type SynthesisHostLibraryItemSummary,
  type SynthesisHostReadPort,
} from "../../../packages/synthesis-contracts/src/index";
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

export async function createZoteroReadonlyHostReadPort(
  options: ZoteroReadonlyLibraryAdapterOptions,
): Promise<SynthesisHostReadPort & { close: () => void }> {
  const libraryId = Math.max(1, Math.floor(numberValue(options.libraryId, 1)));
  const db = await createReadonlySqliteDatabase(options.dbPath);
  let cachedInputs: ReferenceSidecarInput[] | null = null;
  async function inputs() {
    cachedInputs ||= await loadRegistryInputs(db, libraryId);
    return cachedInputs;
  }
  function summary(
    input: ReferenceSidecarInput,
  ): SynthesisHostLibraryItemSummary {
    return {
      paperRef: `${input.libraryId}:${input.itemKey}`,
      libraryId: input.libraryId,
      itemKey: input.itemKey,
      itemType: cleanString(input.itemType),
      title: cleanString(input.title),
      year: cleanString(input.year),
      date: cleanString(input.year),
      creators: [...(input.creators || [])],
      tags: [...(input.tags || [])],
      collections: [...(input.collections || [])],
      doi: cleanString(input.doi),
      arxiv: cleanString(input.arxiv),
      isbn: cleanString(input.isbn),
      url: cleanString(input.url),
      citekey: cleanString(input.citekey),
      dateAdded: cleanString(input.dateAdded),
      metadataHash: hashCanonicalJson(
        buildReferenceSidecarMetadataFingerprintPayload(input),
      ),
    };
  }
  function limitValue(value: unknown) {
    const limit =
      value === undefined
        ? SYNTHESIS_HOST_READ_PAGE_LIMIT_DEFAULT
        : Number(value);
    if (
      !Number.isInteger(limit) ||
      limit <= 0 ||
      limit > SYNTHESIS_HOST_READ_PAGE_LIMIT_MAX
    ) {
      throw new SynthesisClientError(
        "invalid_request",
        "Readonly Host page limit is invalid",
      );
    }
    return limit;
  }
  function cursorKey(value: unknown) {
    const cursor = cleanString(value);
    if (!cursor) return "";
    if (!cursor.startsWith("v1:")) {
      throw new SynthesisClientError(
        "invalid_request",
        "Readonly Host cursor is invalid",
      );
    }
    return decodeURIComponent(cursor.slice(3));
  }
  const encodeCursor = (key: string) =>
    key ? `v1:${encodeURIComponent(key)}` : "";
  const locatorEntries = new Map<
    string,
    {
      paperRef: string;
      artifactType: SynthesisHostArtifactType;
      noteKey: string;
    }
  >();
  function locatorFor(args: {
    paperRef: string;
    artifactType: SynthesisHostArtifactType;
    noteKey: string;
  }) {
    const locator = `readonly-artifact:v1:${encodeURIComponent(
      args.paperRef,
    )}:${encodeURIComponent(args.artifactType)}:${encodeURIComponent(
      args.noteKey,
    )}`;
    locatorEntries.set(locator, args);
    return locator;
  }
  return {
    library: {
      async syncSnapshot() {
        throw new SynthesisClientError(
          "unavailable",
          "Readonly Harness snapshots require the live Zotero Host",
        );
      },
      async listItemsPage(request) {
        if (Number(request.libraryId) !== libraryId) {
          throw new SynthesisClientError(
            "invalid_request",
            "Readonly Host library is outside the configured scope",
          );
        }
        const limit = limitValue(request.limit);
        const after = cursorKey(request.cursor);
        const rows = (await inputs())
          .filter((input) => input.itemKey > after)
          .sort((left, right) => left.itemKey.localeCompare(right.itemKey));
        const pageRows = rows.slice(0, limit);
        const hasMore = rows.length > limit;
        return {
          items: pageRows.map(summary),
          cursor: cleanString(request.cursor),
          nextCursor: hasMore
            ? encodeCursor(pageRows.at(-1)?.itemKey || "")
            : "",
          hasMore,
          returned: pageRows.length,
          limit,
        };
      },
      async getItemsByRef(request) {
        if (
          Number(request.libraryId) !== libraryId ||
          !Array.isArray(request.paperRefs) ||
          request.paperRefs.length > SYNTHESIS_HOST_READ_REF_LIMIT_MAX
        ) {
          throw new SynthesisClientError(
            "invalid_request",
            "Readonly Host ref request is invalid",
          );
        }
        const byRef = new Map(
          (await inputs()).map((input) => [
            `${input.libraryId}:${input.itemKey}`,
            input,
          ]),
        );
        const found = request.paperRefs
          .map((ref) => byRef.get(cleanString(ref)))
          .filter((input): input is ReferenceSidecarInput => Boolean(input));
        return {
          items: found.map(summary),
          missingPaperRefs: request.paperRefs.filter(
            (ref) => !byRef.has(cleanString(ref)),
          ),
        };
      },
    },
    artifacts: {
      async scanPage(request) {
        const limit = limitValue(request.limit);
        const allInputs = await inputs();
        const selected = request.paperRefs?.length
          ? allInputs.filter((input) =>
              request.paperRefs!.includes(
                `${input.libraryId}:${input.itemKey}`,
              ),
            )
          : allInputs
              .filter((input) => input.itemKey > cursorKey(request.cursor))
              .sort((left, right) => left.itemKey.localeCompare(right.itemKey));
        const pageInputs = selected.slice(0, limit);
        const hasMore = !request.paperRefs?.length && selected.length > limit;
        const result = readArtifactsFromRegistryInputs(pageInputs, {
          artifact_types: request.artifactTypes,
        });
        const artifacts: SynthesisHostArtifactDescriptor[] =
          result.artifacts.map((artifact) => {
            const common = {
              paperRef: artifact.paper_ref,
              payloadType: artifact.payload_type,
              status: artifact.status,
              ...(artifact.status === "available" && artifact.note_key
                ? {
                    locator: locatorFor({
                      paperRef: artifact.paper_ref,
                      artifactType: artifact.artifact_type,
                      noteKey: artifact.note_key,
                    }),
                  }
                : {}),
              ...(artifact.payload_hash || artifact.hash
                ? {
                    payloadHash: cleanString(
                      artifact.payload_hash || artifact.hash,
                    ),
                  }
                : {}),
              diagnostics: [...artifact.diagnostics],
            };
            return artifact.artifact_type === "literature_score"
              ? {
                  ...common,
                  artifactType: "literature_score",
                  literatureQuality: buildLiteratureQualitySnapshot({
                    payload:
                      artifact.status === "available"
                        ? artifact.payload
                        : undefined,
                    payloadHash: cleanString(
                      artifact.payload_hash || artifact.hash,
                    ),
                    missing: artifact.status === "missing",
                  }),
                }
              : {
                  ...common,
                  artifactType: artifact.artifact_type,
                };
          });
        return {
          artifacts,
          cursor: cleanString(request.cursor),
          nextCursor: hasMore
            ? encodeCursor(pageInputs.at(-1)?.itemKey || "")
            : "",
          hasMore,
          returned: pageInputs.length,
          limit,
        };
      },
      async read(request) {
        const locator = locatorEntries.get(cleanString(request.locator));
        if (!locator || !cleanString(request.expectedHash)) {
          throw new SynthesisClientError(
            "invalid_request",
            "Readonly Host artifact locator is invalid",
          );
        }
        const result = readArtifactsFromRegistryInputs(await inputs(), {
          paper_refs: [locator.paperRef],
          artifact_types: [locator.artifactType],
        });
        const artifact = result.artifacts.find(
          (entry) => cleanString(entry.note_key) === locator.noteKey,
        );
        if (!artifact || artifact.status !== "available") {
          return {
            status:
              artifact?.status === "decode_error" ? "decode_error" : "missing",
            diagnostics: [...(artifact?.diagnostics || result.diagnostics)],
          } as const;
        }
        const currentHash = cleanString(artifact.payload_hash || artifact.hash);
        if (currentHash !== request.expectedHash) {
          return {
            status: "stale",
            currentHash,
            diagnostics: ["artifact_hash_changed"],
          } as const;
        }
        return {
          status: "available",
          payloadHash: currentHash,
          content:
            locator.artifactType === "digest"
              ? {
                  kind: "text",
                  text: cleanString(
                    artifact.markdown ||
                      artifact.decoded_text ||
                      artifact.payload,
                  ),
                  mediaType: "text/markdown",
                }
              : { kind: "json", value: toSynthesisJsonValue(artifact.payload) },
          diagnostics: [...artifact.diagnostics],
        } as const;
      },
    },
    close() {
      db.close();
    },
  };
}

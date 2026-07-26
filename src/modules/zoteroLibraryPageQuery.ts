import { decodeBase64Utf8, encodeBase64Utf8 } from "./notePayloadCodec";
import { resolveRuntimeZotero } from "../utils/runtimeBridge";
import { sha256Hex } from "../utils/sha256";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const QUERY_TEXT_LIMIT = 4000;
const CURSOR_VERSION = 1;

type QueryParam = string | number;

export type ZoteroLibraryPageQueryCriteria = {
  libraryId: number;
  collectionId?: number;
  tag: string;
  itemType: string;
  query: string;
};

export type ZoteroLibraryPageQueryContext =
  | {
      kind: "count";
      criteria: ZoteroLibraryPageQueryCriteria;
      afterItemId: 0;
      limitPlusOne: 0;
    }
  | {
      kind: "page";
      criteria: ZoteroLibraryPageQueryCriteria;
      afterItemId: number;
      limitPlusOne: number;
    };

export type ZoteroLibraryPageQueryAdapter = {
  queryAsync: (
    sql: string,
    params: QueryParam[],
    context: ZoteroLibraryPageQueryContext,
  ) => Promise<unknown>;
  hydrateItems: (ids: number[]) => Promise<Zotero.Item[]>;
};

export type ZoteroLibraryPageQueryInput = {
  libraryId?: unknown;
  collectionId?: unknown;
  tag?: unknown;
  itemType?: unknown;
  query?: unknown;
  limit?: unknown;
  cursor?: unknown;
};

export type ZoteroLibraryPageQueryOptions = {
  adapter?: ZoteroLibraryPageQueryAdapter;
  defaultLibraryId?: number;
  defaultLimit?: number;
  maxLimit?: number;
};

type LibraryCursorV1 = {
  version: 1;
  criteriaHash: string;
  afterItemId: number;
};

export class ZoteroLibraryCursorError extends Error {
  readonly code = "invalid_library_cursor" as const;

  constructor(
    message = "invalid library cursor",
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ZoteroLibraryCursorError";
  }
}

let adapterOverrideForTests: ZoteroLibraryPageQueryAdapter | undefined;

export function setZoteroLibraryPageQueryAdapterForTests(
  adapter: ZoteroLibraryPageQueryAdapter,
) {
  adapterOverrideForTests = adapter;
}

export function resetZoteroLibraryPageQueryAdapterForTests() {
  adapterOverrideForTests = undefined;
}

function positiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function boundedText(value: unknown, limit = QUERY_TEXT_LIMIT) {
  const normalized = String(value ?? "").trim();
  return normalized.length > limit ? normalized.slice(0, limit) : normalized;
}

function resolveZotero() {
  const zotero =
    resolveRuntimeZotero() ||
    (typeof Zotero !== "undefined" ? Zotero : undefined);
  if (!zotero) {
    throw new Error("Zotero runtime is unavailable for library page query");
  }
  return zotero;
}

function resolveDefaultLibraryId(explicit?: number) {
  return (
    positiveInteger(explicit) ||
    positiveInteger(resolveZotero().Libraries?.userLibraryID) ||
    1
  );
}

function normalizeCriteria(
  input: ZoteroLibraryPageQueryInput,
  options: ZoteroLibraryPageQueryOptions,
): ZoteroLibraryPageQueryCriteria {
  const libraryId =
    positiveInteger(input.libraryId) ||
    resolveDefaultLibraryId(options.defaultLibraryId);
  const collectionId = positiveInteger(input.collectionId) || undefined;
  return {
    libraryId,
    ...(collectionId ? { collectionId } : {}),
    tag: boundedText(input.tag).toLowerCase(),
    itemType: boundedText(input.itemType),
    query: boundedText(input.query).toLowerCase(),
  };
}

function canonicalCriteria(criteria: ZoteroLibraryPageQueryCriteria) {
  return JSON.stringify({
    libraryId: criteria.libraryId,
    collectionId: criteria.collectionId || 0,
    tag: criteria.tag,
    itemType: criteria.itemType,
    query: criteria.query,
  });
}

async function criteriaHash(criteria: ZoteroLibraryPageQueryCriteria) {
  const digest = await sha256Hex(
    new TextEncoder().encode(canonicalCriteria(criteria)),
  );
  if (!digest) {
    throw new Error("SHA-256 is unavailable for library cursor generation");
  }
  return digest;
}

function encodeCursor(cursor: LibraryCursorV1) {
  return encodeBase64Utf8(JSON.stringify(cursor))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeCursor(value: string): unknown {
  if (!value || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new ZoteroLibraryCursorError("library cursor is malformed", {
      reason: "malformed",
    });
  }
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  try {
    return JSON.parse(decodeBase64Utf8(padded));
  } catch {
    throw new ZoteroLibraryCursorError("library cursor is malformed", {
      reason: "malformed",
    });
  }
}

function parseCursor(value: unknown, expectedCriteriaHash: string) {
  if (value === undefined) {
    return 0;
  }
  if (typeof value !== "string") {
    throw new ZoteroLibraryCursorError("library cursor must be a string", {
      reason: "invalid_type",
    });
  }
  if (value === "0") {
    return 0;
  }
  const decoded = decodeCursor(value);
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
    throw new ZoteroLibraryCursorError("library cursor is malformed", {
      reason: "malformed",
    });
  }
  const cursor = decoded as Partial<LibraryCursorV1>;
  if (cursor.version !== CURSOR_VERSION) {
    throw new ZoteroLibraryCursorError(
      "library cursor version is unsupported",
      { reason: "unsupported_version" },
    );
  }
  if (cursor.criteriaHash !== expectedCriteriaHash) {
    throw new ZoteroLibraryCursorError(
      "library cursor does not match the current criteria",
      { reason: "criteria_mismatch" },
    );
  }
  if (!Number.isSafeInteger(cursor.afterItemId) || cursor.afterItemId! <= 0) {
    throw new ZoteroLibraryCursorError("library cursor is malformed", {
      reason: "invalid_position",
    });
  }
  return cursor.afterItemId!;
}

function escapeLikeLiteral(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}

function buildPredicate(criteria: ZoteroLibraryPageQueryCriteria) {
  const predicates = [
    "i.libraryID = ?",
    "NOT EXISTS (SELECT 1 FROM deletedItems di WHERE di.itemID = i.itemID)",
    "EXISTS (SELECT 1 FROM itemTypes rit WHERE rit.itemTypeID = i.itemTypeID AND rit.typeName NOT IN ('attachment', 'note', 'annotation'))",
    "NOT EXISTS (SELECT 1 FROM itemAttachments ia WHERE ia.itemID = i.itemID)",
    "NOT EXISTS (SELECT 1 FROM itemNotes ino WHERE ino.itemID = i.itemID)",
  ];
  const params: QueryParam[] = [criteria.libraryId];
  if (criteria.collectionId) {
    predicates.push(
      "EXISTS (SELECT 1 FROM collectionItems ci WHERE ci.itemID = i.itemID AND ci.collectionID = ?)",
    );
    params.push(criteria.collectionId);
  }
  if (criteria.tag) {
    predicates.push(
      "EXISTS (SELECT 1 FROM itemTags itg JOIN tags ft ON ft.tagID = itg.tagID WHERE itg.itemID = i.itemID AND ft.name = ? COLLATE NOCASE)",
    );
    params.push(criteria.tag);
  }
  if (criteria.itemType) {
    predicates.push(
      "EXISTS (SELECT 1 FROM itemTypes ity WHERE ity.itemTypeID = i.itemTypeID AND ity.typeName = ? COLLATE NOCASE)",
    );
    params.push(criteria.itemType);
  }
  if (criteria.query) {
    const pattern = `%${escapeLikeLiteral(criteria.query)}%`;
    predicates.push(`(
      i.key COLLATE NOCASE LIKE ? ESCAPE '\\'
      OR EXISTS (
        SELECT 1
        FROM itemData id
        JOIN fields f ON f.fieldID = id.fieldID
        JOIN itemDataValues idv ON idv.valueID = id.valueID
        WHERE id.itemID = i.itemID
          AND f.fieldName IN ('title', 'date', 'publicationTitle', 'abstractNote')
          AND idv.value COLLATE NOCASE LIKE ? ESCAPE '\\'
      )
      OR EXISTS (
        SELECT 1
        FROM itemCreators ic
        JOIN creators c ON c.creatorID = ic.creatorID
        WHERE ic.itemID = i.itemID
          AND (
            c.firstName COLLATE NOCASE LIKE ? ESCAPE '\\'
            OR c.lastName COLLATE NOCASE LIKE ? ESCAPE '\\'
            OR TRIM(COALESCE(c.firstName, '') || ' ' || COALESCE(c.lastName, '')) COLLATE NOCASE LIKE ? ESCAPE '\\'
          )
      )
      OR EXISTS (
        SELECT 1
        FROM itemTags iqt
        JOIN tags qt ON qt.tagID = iqt.tagID
        WHERE iqt.itemID = i.itemID
          AND qt.name COLLATE NOCASE LIKE ? ESCAPE '\\'
      )
    )`);
    params.push(pattern, pattern, pattern, pattern, pattern, pattern);
  }
  return {
    sql: `\nFROM items i\nWHERE ${predicates.join("\n  AND ")}`,
    params,
  };
}

function normalizeRows(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Zotero.DB.queryAsync() did not return rows");
  }
  return value;
}

function rowNumber(row: unknown, keys: string[]) {
  if (typeof row === "number" || typeof row === "string") {
    return Number(row);
  }
  if (!row || typeof row !== "object") {
    return Number.NaN;
  }
  const record = row as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined) {
      return Number(record[key]);
    }
  }
  return Number(Object.values(record)[0]);
}

function defaultAdapter(): ZoteroLibraryPageQueryAdapter {
  const zotero = resolveZotero() as typeof Zotero & {
    DB?: {
      queryAsync?: (sql: string, params?: QueryParam[]) => Promise<unknown>;
    };
  };
  if (typeof zotero.DB?.queryAsync !== "function") {
    throw new Error("Zotero.DB.queryAsync() is unavailable");
  }
  if (typeof (zotero.Items as any).getAsync !== "function") {
    throw new Error("Zotero.Items.getAsync(ids) is unavailable");
  }
  return {
    queryAsync(sql, params) {
      return zotero.DB!.queryAsync!(sql, params);
    },
    async hydrateItems(ids) {
      const loaded = await (zotero.Items as any).getAsync(ids);
      if (!Array.isArray(loaded)) {
        throw new Error("Zotero.Items.getAsync(ids) did not return an array");
      }
      return loaded as Zotero.Item[];
    },
  };
}

function normalizeLimit(
  value: unknown,
  options: ZoteroLibraryPageQueryOptions,
) {
  const maxLimit = positiveInteger(options.maxLimit) || MAX_LIMIT;
  const defaultLimit =
    positiveInteger(options.defaultLimit) || Math.min(DEFAULT_LIMIT, maxLimit);
  return Math.min(maxLimit, positiveInteger(value) || defaultLimit);
}

export async function queryZoteroLibraryPage(
  input: ZoteroLibraryPageQueryInput = {},
  options: ZoteroLibraryPageQueryOptions = {},
) {
  const criteria = normalizeCriteria(input, options);
  const hash = await criteriaHash(criteria);
  const afterItemId = parseCursor(input.cursor, hash);
  const limit = normalizeLimit(input.limit, options);
  const predicate = buildPredicate(criteria);
  const countSql = `SELECT COUNT(*) AS total${predicate.sql}`;
  const pageSql = `SELECT i.itemID AS itemID${predicate.sql} AND i.itemID > ?\nORDER BY i.itemID ASC\nLIMIT ?`;
  const adapter =
    options.adapter || adapterOverrideForTests || defaultAdapter();

  const [countRows, pageRows] = await Promise.all([
    adapter.queryAsync(countSql, predicate.params, {
      kind: "count",
      criteria,
      afterItemId: 0,
      limitPlusOne: 0,
    }),
    adapter.queryAsync(pageSql, [...predicate.params, afterItemId, limit + 1], {
      kind: "page",
      criteria,
      afterItemId,
      limitPlusOne: limit + 1,
    }),
  ]);
  const totalScanned = Math.max(
    0,
    Math.floor(rowNumber(normalizeRows(countRows)[0], ["total", "count"])),
  );
  if (!Number.isFinite(totalScanned)) {
    throw new Error("Zotero library count query returned an invalid total");
  }
  const selectedIds = normalizeRows(pageRows)
    .map((row) => rowNumber(row, ["itemID", "itemId", "id"]))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
  const hasMore = selectedIds.length > limit;
  const pageIds = selectedIds.slice(0, limit);
  const hydrated = pageIds.length ? await adapter.hydrateItems(pageIds) : [];
  const byId = new Map(
    hydrated.map((item) => [positiveInteger((item as any).id), item]),
  );
  const items = pageIds
    .map((id) => byId.get(id))
    .filter((item): item is Zotero.Item => Boolean(item));
  const nextAfterItemId = pageIds.at(-1) || afterItemId;
  return {
    items,
    itemIds: pageIds,
    nextCursor: hasMore
      ? encodeCursor({
          version: CURSOR_VERSION,
          criteriaHash: hash,
          afterItemId: nextAfterItemId,
        })
      : "",
    totalScanned,
    returned: items.length,
    hasMore,
    criteria,
    criteriaHash: hash,
    afterItemId,
  };
}

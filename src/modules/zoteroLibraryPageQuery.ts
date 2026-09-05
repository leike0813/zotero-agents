import { decodeBase64Utf8, encodeBase64Utf8 } from "./notePayloadCodec";
import { resolveRuntimeZotero } from "../utils/runtimeBridge";
import { sha256Hex } from "../utils/sha256";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const QUERY_TEXT_LIMIT = 4000;
const CURSOR_VERSION = 1;

type QueryParam = string | number;

export type ZoteroLibraryPageQueryCriteria = {
  schema: "zotero-agents.library-live-items.v1";
  libraryId: number;
  collectionId?: number;
  tag: string;
  itemType: string;
  query: string;
  scope: "top-level-regular";
  order: "stable_identity";
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

export type ZoteroLibrarySourcePageDomain =
  | "notes"
  | "attachments"
  | "annotations"
  | "collections"
  | "saved-searches";

export type ZoteroLibrarySourcePageContext = {
  kind: "count" | "page";
  domain: ZoteroLibrarySourcePageDomain;
  criteria: Readonly<Record<string, unknown>>;
  position: Readonly<Record<string, unknown>>;
  limitPlusOne: number;
};

export type ZoteroLibrarySourcePageQueryAdapter = {
  queryAsync: (
    sql: string,
    params: QueryParam[],
    context: ZoteroLibrarySourcePageContext,
  ) => Promise<unknown>;
  hydrateItems: (ids: number[]) => Promise<Zotero.Item[]>;
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

export class ZoteroLibraryPageLimitError extends Error {
  readonly code = "library_page_limit_exceeded" as const;

  constructor(
    readonly limit: number,
    readonly observed: number,
  ) {
    super(`library page limit cannot exceed ${limit}`);
    this.name = "ZoteroLibraryPageLimitError";
  }
}

export class ZoteroLibraryCriteriaError extends Error {
  readonly code = "invalid_library_criteria" as const;

  constructor(
    readonly field: string,
    readonly reason: "invalid_type" | "invalid_value" | "too_long",
  ) {
    super(`library criterion is invalid: ${field}`);
    this.name = "ZoteroLibraryCriteriaError";
  }
}

let adapterOverrideForTests: ZoteroLibraryPageQueryAdapter | undefined;
let sourceAdapterOverrideForTests:
  | ZoteroLibrarySourcePageQueryAdapter
  | undefined;

export function setZoteroLibraryPageQueryAdapterForTests(
  adapter: ZoteroLibraryPageQueryAdapter,
) {
  adapterOverrideForTests = adapter;
}

export function resetZoteroLibraryPageQueryAdapterForTests() {
  adapterOverrideForTests = undefined;
}

export function setZoteroLibrarySourcePageQueryAdapterForTests(
  adapter: ZoteroLibrarySourcePageQueryAdapter,
) {
  sourceAdapterOverrideForTests = adapter;
}

export function resetZoteroLibrarySourcePageQueryAdapterForTests() {
  sourceAdapterOverrideForTests = undefined;
}

function positiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function boundedText(
  value: unknown,
  field: "tag" | "itemType" | "query",
  limit = QUERY_TEXT_LIMIT,
) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new ZoteroLibraryCriteriaError(field, "invalid_type");
  }
  const normalized = String(value ?? "").trim();
  if (normalized.length > limit) {
    throw new ZoteroLibraryCriteriaError(field, "too_long");
  }
  return normalized;
}

function optionalPositiveInteger(value: unknown, field: string) {
  if (value === undefined || value === null) return undefined;
  if (field === "collectionId" && value === 0) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new ZoteroLibraryCriteriaError(field, "invalid_value");
  }
  return value;
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

export async function hydrateZoteroItemsByIds(
  ids: number[],
  zotero: Pick<typeof Zotero, "Items"> = resolveZotero(),
) {
  if (typeof (zotero.Items as any).getAsync !== "function") {
    throw new Error("Zotero.Items.getAsync(ids) is unavailable");
  }
  const loaded = await (zotero.Items as any).getAsync(ids);
  if (!Array.isArray(loaded)) {
    throw new Error("Zotero.Items.getAsync(ids) did not return an array");
  }
  const byId = new Map(
    (loaded as Zotero.Item[]).map((item) => [
      positiveInteger((item as any).id),
      item,
    ]),
  );
  return ids
    .map((id) => byId.get(positiveInteger(id)))
    .filter((item): item is Zotero.Item => Boolean(item));
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
    optionalPositiveInteger(input.libraryId, "libraryId") ||
    resolveDefaultLibraryId(options.defaultLibraryId);
  const collectionId = optionalPositiveInteger(
    input.collectionId,
    "collectionId",
  );
  return {
    schema: "zotero-agents.library-live-items.v1",
    libraryId,
    ...(collectionId ? { collectionId } : {}),
    tag: boundedText(input.tag, "tag").toLowerCase(),
    itemType: boundedText(input.itemType, "itemType"),
    query: boundedText(input.query, "query").toLowerCase(),
    scope: "top-level-regular",
    order: "stable_identity",
  };
}

function canonicalCriteria(criteria: ZoteroLibraryPageQueryCriteria) {
  return JSON.stringify({
    libraryId: criteria.libraryId,
    collectionId: criteria.collectionId || 0,
    tag: criteria.tag,
    itemType: criteria.itemType,
    query: criteria.query,
    schema: criteria.schema,
    scope: criteria.scope,
    order: criteria.order,
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
  return {
    queryAsync(sql, params) {
      return zotero.DB!.queryAsync!(sql, params);
    },
    async hydrateItems(ids) {
      return hydrateZoteroItemsByIds(ids, zotero);
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
  if (value === undefined || value === null || value === "") {
    return defaultLimit;
  }
  const observed = Number(value);
  if (!Number.isSafeInteger(observed) || observed <= 0) {
    throw new ZoteroLibraryPageLimitError(maxLimit, observed);
  }
  if (observed > maxLimit) {
    throw new ZoteroLibraryPageLimitError(maxLimit, observed);
  }
  return observed;
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

  // Keep native SQL re-entry serial.  The Broker gate owns the surrounding
  // slice, but this query must also be safe when called by a legacy/internal
  // path that has not entered that gate yet.
  const countRows = await adapter.queryAsync(countSql, predicate.params, {
    kind: "count",
    criteria,
    afterItemId: 0,
    limitPlusOne: 0,
  });
  const pageRows = await adapter.queryAsync(
    pageSql,
    [...predicate.params, afterItemId, limit + 1],
    {
      kind: "page",
      criteria,
      afterItemId,
      limitPlusOne: limit + 1,
    },
  );
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
  if (items.length !== pageIds.length) {
    throw new Error("Zotero library page hydration was incomplete");
  }
  const nextAfterItemId = pageIds.at(-1) || afterItemId;
  return {
    items,
    itemIds: pageIds,
    limit,
    nextCursor: hasMore
      ? encodeCursor({
          version: CURSOR_VERSION,
          criteriaHash: hash,
          afterItemId: nextAfterItemId,
        })
      : null,
    totalScanned,
    total: totalScanned,
    scanned: selectedIds.length,
    returned: items.length,
    hasMore,
    criteria,
    criteriaHash: hash,
    afterItemId,
  };
}

const SOURCE_CURSOR_VERSION = 1;

export class ZoteroLibrarySourceQueryError extends Error {
  readonly code = "zotero_source_query_failed" as const;

  constructor(
    readonly domain: ZoteroLibrarySourcePageDomain,
    readonly stage: "query" | "hydrate",
    message = "Zotero source query failed",
  ) {
    super(message);
    this.name = "ZoteroLibrarySourceQueryError";
  }
}

type SourceCursorPosition =
  | { id: number }
  | { sortIndex: string; itemID: number };

type SourceCursor = {
  version: 1;
  domain: ZoteroLibrarySourcePageDomain;
  criteriaHash: string;
  position: SourceCursorPosition;
};

function sourceAdapter(): ZoteroLibrarySourcePageQueryAdapter {
  if (sourceAdapterOverrideForTests) return sourceAdapterOverrideForTests;
  const zotero = resolveZotero() as typeof Zotero & {
    DB?: {
      queryAsync?: (sql: string, params?: QueryParam[]) => Promise<unknown>;
    };
  };
  if (typeof zotero.DB?.queryAsync !== "function") {
    throw new Error("Zotero.DB.queryAsync() is unavailable");
  }
  return {
    queryAsync(sql, params) {
      return zotero.DB!.queryAsync!(sql, params);
    },
    async hydrateItems(ids) {
      return hydrateZoteroItemsByIds(ids, zotero);
    },
  };
}

function normalizeSourceLimit(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_LIMIT;
  }
  const observed = Number(value);
  if (!Number.isSafeInteger(observed) || observed <= 0) {
    throw new ZoteroLibraryPageLimitError(MAX_LIMIT, observed);
  }
  if (observed > MAX_LIMIT) {
    throw new ZoteroLibraryPageLimitError(MAX_LIMIT, observed);
  }
  return observed;
}

function sourceLibraryId(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new ZoteroLibraryCriteriaError("libraryId", "invalid_value");
  }
  return Number(value);
}

function sourceParentId(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new ZoteroLibraryCriteriaError("parentItemId", "invalid_value");
  }
  return Number(value);
}

function sourceCanonicalCriteria(
  domain: ZoteroLibrarySourcePageDomain,
  criteria: Readonly<Record<string, unknown>>,
) {
  return JSON.stringify({
    schema: "zotero-agents.zotero-source-page.v1",
    domain,
    ...criteria,
    order: "stable_identity",
  });
}

async function sourceCriteriaHash(
  domain: ZoteroLibrarySourcePageDomain,
  criteria: Readonly<Record<string, unknown>>,
) {
  const digest = await sha256Hex(
    new TextEncoder().encode(sourceCanonicalCriteria(domain, criteria)),
  );
  if (!digest) throw new Error("SHA-256 is unavailable for source cursor");
  return digest;
}

function encodeSourceCursor(cursor: SourceCursor) {
  return encodeBase64Utf8(JSON.stringify(cursor))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeSourceCursor(value: string) {
  if (!value || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new ZoteroLibraryCursorError("source cursor is malformed", {
      reason: "malformed",
    });
  }
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const decoded = JSON.parse(
      decodeBase64Utf8(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
    );
    return decoded;
  } catch {
    throw new ZoteroLibraryCursorError("source cursor is malformed", {
      reason: "malformed",
    });
  }
}

function parseSourceCursor(
  value: unknown,
  domain: ZoteroLibrarySourcePageDomain,
  criteriaHash: string,
) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new ZoteroLibraryCursorError("source cursor must be a string", {
      reason: "invalid_type",
    });
  }
  const parsed = decodeSourceCursor(value) as Partial<SourceCursor> | null;
  const topLevelKeys =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? Object.keys(parsed as Record<string, unknown>).sort()
      : [];
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    topLevelKeys.join("\u0000") !==
      ["criteriaHash", "domain", "position", "version"].join("\u0000") ||
    parsed.version !== SOURCE_CURSOR_VERSION ||
    parsed.domain !== domain ||
    parsed.criteriaHash !== criteriaHash
  ) {
    const reason =
      parsed?.version !== SOURCE_CURSOR_VERSION
        ? "unsupported_version"
        : parsed?.domain !== domain || parsed?.criteriaHash !== criteriaHash
          ? "criteria_mismatch"
          : "malformed";
    throw new ZoteroLibraryCursorError(
      "source cursor does not match the query",
      {
        reason,
      },
    );
  }
  const position = parsed.position;
  const positionKeys =
    position && typeof position === "object" && !Array.isArray(position)
      ? Object.keys(position as Record<string, unknown>).sort()
      : [];
  const expectedPositionKeys =
    domain === "annotations" ? ["itemID", "sortIndex"] : ["id"];
  if (
    !position ||
    typeof position !== "object" ||
    Array.isArray(position) ||
    positionKeys.join("\u0000") !== expectedPositionKeys.join("\u0000") ||
    (domain !== "annotations" &&
      (!Number.isSafeInteger((position as { id?: unknown }).id) ||
        Number((position as { id?: unknown }).id) <= 0)) ||
    (domain === "annotations" &&
      (typeof (position as { sortIndex?: unknown }).sortIndex !== "string" ||
        !Number.isSafeInteger((position as { itemID?: unknown }).itemID) ||
        Number((position as { itemID?: unknown }).itemID) <= 0))
  ) {
    throw new ZoteroLibraryCursorError("source cursor position is invalid", {
      reason: "invalid_position",
    });
  }
  return position as SourceCursorPosition;
}

function sourceRows(value: unknown, domain: ZoteroLibrarySourcePageDomain) {
  if (!Array.isArray(value)) {
    throw new ZoteroLibrarySourceQueryError(
      domain,
      "query",
      "source query did not return rows",
    );
  }
  return value as Array<Record<string, unknown>>;
}

function sourceRowNumber(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined) return Number(row[key]);
  }
  return Number.NaN;
}

function sourceRowString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return String(row[key]);
  }
  return "";
}

async function sourceCountAndPage(
  domain: ZoteroLibrarySourcePageDomain,
  criteria: Readonly<Record<string, unknown>>,
  countSql: string,
  countParams: QueryParam[],
  pageSql: string,
  pageParams: QueryParam[],
  limit: number,
  position: SourceCursorPosition | undefined,
  options: { adapter?: ZoteroLibrarySourcePageQueryAdapter } = {},
) {
  const adapter = options.adapter || sourceAdapter();
  let countRows: Array<Record<string, unknown>>;
  let pageRows: Array<Record<string, unknown>>;
  try {
    countRows = sourceRows(
      await adapter.queryAsync(countSql, countParams, {
        kind: "count",
        domain,
        criteria,
        position: {},
        limitPlusOne: 0,
      }),
      domain,
    );
    pageRows = sourceRows(
      await adapter.queryAsync(pageSql, pageParams, {
        kind: "page",
        domain,
        criteria,
        position: position || {},
        limitPlusOne: limit + 1,
      }),
      domain,
    );
  } catch (error) {
    if (error instanceof ZoteroLibraryCursorError) throw error;
    if (error instanceof ZoteroLibrarySourceQueryError) throw error;
    throw new ZoteroLibrarySourceQueryError(domain, "query");
  }
  const total = Math.max(
    0,
    Math.floor(sourceRowNumber(countRows[0] || {}, ["total", "count"])),
  );
  if (!Number.isFinite(total)) {
    throw new ZoteroLibrarySourceQueryError(
      domain,
      "query",
      "source count is invalid",
    );
  }
  const hasMore = pageRows.length > limit;
  return { adapter, rows: pageRows.slice(0, limit), total, hasMore };
}

function sourceNextCursor(
  domain: ZoteroLibrarySourcePageDomain,
  criteriaHash: string,
  position: SourceCursorPosition | undefined,
  hasMore: boolean,
) {
  return hasMore && position
    ? encodeSourceCursor({
        version: SOURCE_CURSOR_VERSION,
        domain,
        criteriaHash,
        position,
      })
    : null;
}

function sourceItemIds(
  rows: Array<Record<string, unknown>>,
  domain: ZoteroLibrarySourcePageDomain,
) {
  return rows.map((row) => sourceRowNumber(row, ["itemID", "itemId", "id"]));
}

async function hydrateSourceRows(
  adapter: ZoteroLibrarySourcePageQueryAdapter,
  rows: Array<Record<string, unknown>>,
  domain: ZoteroLibrarySourcePageDomain,
) {
  const itemIds = sourceItemIds(rows, domain);
  if (itemIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new ZoteroLibrarySourceQueryError(
      domain,
      "query",
      "source row identity is invalid",
    );
  }
  let hydrated: Zotero.Item[];
  try {
    hydrated = itemIds.length ? await adapter.hydrateItems(itemIds) : [];
  } catch {
    throw new ZoteroLibrarySourceQueryError(domain, "hydrate");
  }
  const byId = new Map(
    hydrated.map((item) => [positiveInteger((item as any).id), item]),
  );
  const items = itemIds.map((id) => byId.get(id));
  if (items.some((item) => !item)) {
    throw new ZoteroLibrarySourceQueryError(
      domain,
      "hydrate",
      "source page hydration was incomplete",
    );
  }
  return { itemIds, items: items as Zotero.Item[] };
}

export async function queryZoteroChildItemPage(
  input: {
    domain: "notes" | "attachments";
    libraryId: unknown;
    parentItemId: unknown;
    limit?: unknown;
    cursor?: unknown;
  },
  options: { adapter?: ZoteroLibrarySourcePageQueryAdapter } = {},
) {
  const libraryId = sourceLibraryId(input.libraryId);
  const parentItemId = sourceParentId(input.parentItemId);
  const limit = normalizeSourceLimit(input.limit);
  const domain = input.domain;
  const criteria = { libraryId, parentItemId };
  const hash = await sourceCriteriaHash(domain, criteria);
  const cursor = parseSourceCursor(input.cursor, domain, hash) as
    | { id: number }
    | undefined;
  const table = domain === "notes" ? "itemNotes" : "itemAttachments";
  const countSql = `SELECT COUNT(*) AS total FROM ${table} child JOIN items i ON i.itemID = child.itemID WHERE child.parentItemID = ? AND i.libraryID = ?`;
  const pageSql = `SELECT i.itemID AS itemID FROM ${table} child JOIN items i ON i.itemID = child.itemID WHERE child.parentItemID = ? AND i.libraryID = ? AND i.itemID > ? ORDER BY i.itemID ASC LIMIT ?`;
  const page = await sourceCountAndPage(
    domain,
    criteria,
    countSql,
    [parentItemId, libraryId],
    pageSql,
    [parentItemId, libraryId, cursor?.id || 0, limit + 1],
    limit,
    cursor,
    options,
  );
  const hydrated = await hydrateSourceRows(page.adapter, page.rows, domain);
  const lastId = sourceItemIds(page.rows, domain).at(-1);
  return {
    ...hydrated,
    limit,
    total: page.total,
    returned: hydrated.items.length,
    hasMore: page.hasMore,
    nextCursor: sourceNextCursor(
      domain,
      hash,
      lastId ? { id: lastId } : undefined,
      page.hasMore,
    ),
  };
}

export async function queryZoteroAnnotationPage(
  input: {
    libraryId: unknown;
    parentItemId: unknown;
    parentKind: "regular" | "attachment";
    limit?: unknown;
    cursor?: unknown;
  },
  options: { adapter?: ZoteroLibrarySourcePageQueryAdapter } = {},
) {
  const libraryId = sourceLibraryId(input.libraryId);
  const parentItemId = sourceParentId(input.parentItemId);
  const limit = normalizeSourceLimit(input.limit);
  const criteria = { libraryId, parentItemId, parentKind: input.parentKind };
  const hash = await sourceCriteriaHash("annotations", criteria);
  const cursor = parseSourceCursor(input.cursor, "annotations", hash) as
    | { sortIndex: string; itemID: number }
    | undefined;
  const parentPredicate =
    input.parentKind === "attachment"
      ? "a.parentItemID = ?"
      : "a.parentItemID IN (SELECT ia.itemID FROM itemAttachments ia WHERE ia.parentItemID = ?)";
  const countSql = `SELECT COUNT(*) AS total FROM itemAnnotations a JOIN items i ON i.itemID = a.itemID WHERE ${parentPredicate} AND i.libraryID = ?`;
  const afterPredicate = cursor
    ? "AND (a.sortIndex > ? OR (a.sortIndex = ? AND i.itemID > ?))"
    : "";
  const pageSql = `SELECT i.itemID AS itemID, a.sortIndex AS sortIndex FROM itemAnnotations a JOIN items i ON i.itemID = a.itemID WHERE ${parentPredicate} AND i.libraryID = ? ${afterPredicate} ORDER BY a.sortIndex ASC, i.itemID ASC LIMIT ?`;
  const countParams = [parentItemId, libraryId];
  const pageParams = cursor
    ? [
        parentItemId,
        libraryId,
        cursor.sortIndex,
        cursor.sortIndex,
        cursor.itemID,
        limit + 1,
      ]
    : [parentItemId, libraryId, limit + 1];
  const page = await sourceCountAndPage(
    "annotations",
    criteria,
    countSql,
    countParams,
    pageSql,
    pageParams,
    limit,
    cursor,
    options,
  );
  const hydrated = await hydrateSourceRows(
    page.adapter,
    page.rows,
    "annotations",
  );
  const lastRow = page.rows.at(-1);
  const lastId = lastRow
    ? sourceRowNumber(lastRow, ["itemID", "itemId", "id"])
    : 0;
  const lastSortIndex = lastRow ? sourceRowString(lastRow, ["sortIndex"]) : "";
  const nextPosition =
    lastRow && Number.isSafeInteger(lastId) && lastId > 0
      ? { sortIndex: lastSortIndex, itemID: lastId }
      : undefined;
  return {
    ...hydrated,
    limit,
    total: page.total,
    returned: hydrated.items.length,
    hasMore: page.hasMore,
    nextCursor: sourceNextCursor(
      "annotations",
      hash,
      nextPosition,
      page.hasMore,
    ),
  };
}

export async function queryZoteroCollectionPage(
  input: {
    libraryId: unknown;
    limit?: unknown;
    cursor?: unknown;
  },
  options: { adapter?: ZoteroLibrarySourcePageQueryAdapter } = {},
) {
  const libraryId = sourceLibraryId(input.libraryId);
  const limit = normalizeSourceLimit(input.limit);
  const criteria = { libraryId };
  const hash = await sourceCriteriaHash("collections", criteria);
  const cursor = parseSourceCursor(input.cursor, "collections", hash) as
    | { id: number }
    | undefined;
  const countSql =
    "SELECT COUNT(*) AS total FROM collections c WHERE c.libraryID = ?";
  const pageSql =
    "SELECT c.collectionID AS collectionID, c.key AS key, c.collectionName AS name, c.parentCollectionID AS parentCollectionID, c.libraryID AS libraryID, c.version AS version, c.clientDateModified AS clientDateModified FROM collections c WHERE c.libraryID = ? AND c.collectionID > ? ORDER BY c.collectionID ASC LIMIT ?";
  const page = await sourceCountAndPage(
    "collections",
    criteria,
    countSql,
    [libraryId],
    pageSql,
    [libraryId, cursor?.id || 0, limit + 1],
    limit,
    cursor,
    options,
  );
  const lastId = page.rows.length
    ? sourceRowNumber(page.rows.at(-1)!, ["collectionID", "collectionId", "id"])
    : 0;
  return {
    rows: page.rows,
    limit,
    total: page.total,
    returned: page.rows.length,
    hasMore: page.hasMore,
    nextCursor: sourceNextCursor(
      "collections",
      hash,
      lastId ? { id: lastId } : undefined,
      page.hasMore,
    ),
  };
}

export async function queryZoteroSavedSearchPage(
  input: {
    libraryId: unknown;
    limit?: unknown;
    cursor?: unknown;
  },
  options: { adapter?: ZoteroLibrarySourcePageQueryAdapter } = {},
) {
  const libraryId = sourceLibraryId(input.libraryId);
  const limit = normalizeSourceLimit(input.limit);
  const criteria = { libraryId };
  const hash = await sourceCriteriaHash("saved-searches", criteria);
  const cursor = parseSourceCursor(input.cursor, "saved-searches", hash) as
    | { id: number }
    | undefined;
  const countSql =
    "SELECT COUNT(*) AS total FROM savedSearches s WHERE s.libraryID = ?";
  const pageSql =
    "SELECT s.savedSearchID AS savedSearchID, s.key AS key, s.libraryID AS libraryID, s.savedSearchName AS savedSearchName, s.version AS version, s.clientDateModified AS clientDateModified FROM savedSearches s WHERE s.libraryID = ? AND s.savedSearchID > ? ORDER BY s.savedSearchID ASC LIMIT ?";
  const page = await sourceCountAndPage(
    "saved-searches",
    criteria,
    countSql,
    [libraryId],
    pageSql,
    [libraryId, cursor?.id || 0, limit + 1],
    limit,
    cursor,
    options,
  );
  const lastId = page.rows.length
    ? sourceRowNumber(page.rows.at(-1)!, [
        "savedSearchID",
        "savedSearchId",
        "id",
      ])
    : 0;
  return {
    rows: page.rows,
    limit,
    total: page.total,
    returned: page.rows.length,
    hasMore: page.hasMore,
    nextCursor: sourceNextCursor(
      "saved-searches",
      hash,
      lastId ? { id: lastId } : undefined,
      page.hasMore,
    ),
  };
}

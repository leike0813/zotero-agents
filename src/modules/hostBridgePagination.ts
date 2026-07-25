import { decodeBase64Utf8, encodeBase64Utf8 } from "./notePayloadCodec";

const CURSOR_VERSION = 1;
export const HOST_BRIDGE_PAGE_LIMIT_DEFAULT = 25;
export const HOST_BRIDGE_PAGE_LIMIT_MAX = 100;
export const HOST_BRIDGE_TEXT_CHUNK_DEFAULT = 8_000;
export const HOST_BRIDGE_TEXT_CHUNK_MAX = 16_000;
const HOST_BRIDGE_CURSOR_TTL_MS = 30 * 60 * 1_000;

export type HostBridgeCursorErrorReason =
  | "malformed"
  | "scope_mismatch"
  | "criteria_mismatch"
  | "expired"
  | "anchor_missing";

export class HostBridgeCursorError extends Error {
  readonly code = "invalid_host_bridge_cursor" as const;

  constructor(
    message: string,
    readonly reason: HostBridgeCursorErrorReason,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "HostBridgeCursorError";
  }
}

type HostBridgeCursorV1 = {
  version: 1;
  scope: string;
  criteriaHash: string;
  issuedAt: number;
  afterKey: string;
};

export type HostBridgePage<T> = {
  page: T[];
  nextCursor: string;
  hasMore: boolean;
  returned: number;
  total: number;
  limit: number;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

function fingerprint(value: unknown) {
  const text = JSON.stringify(stableValue(value));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function encodeCursor(cursor: HostBridgeCursorV1) {
  return encodeBase64Utf8(JSON.stringify(cursor))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeCursor(value: unknown): HostBridgeCursorV1 {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new HostBridgeCursorError(
      "Host Bridge cursor is malformed",
      "malformed",
    );
  }
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  try {
    const parsed = JSON.parse(
      decodeBase64Utf8(padded),
    ) as Partial<HostBridgeCursorV1>;
    if (
      parsed.version !== CURSOR_VERSION ||
      typeof parsed.scope !== "string" ||
      typeof parsed.criteriaHash !== "string" ||
      !Number.isFinite(parsed.issuedAt) ||
      typeof parsed.afterKey !== "string" ||
      !parsed.afterKey
    ) {
      throw new Error("invalid cursor shape");
    }
    return parsed as HostBridgeCursorV1;
  } catch (error) {
    if (error instanceof HostBridgeCursorError) throw error;
    throw new HostBridgeCursorError(
      "Host Bridge cursor is malformed",
      "malformed",
    );
  }
}

function boundedLimit(value: unknown, defaultLimit: number, maxLimit: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultLimit;
  return Math.max(1, Math.min(maxLimit, Math.floor(parsed)));
}

export function paginateHostBridgeRows<T>(args: {
  scope: string;
  criteria: unknown;
  rows: readonly T[];
  key: (row: T) => string;
  cursor?: unknown;
  limit?: unknown;
  defaultLimit?: number;
  maxLimit?: number;
  now?: number;
  cursorTtlMs?: number;
}): HostBridgePage<T> {
  const scope = String(args.scope || "").trim();
  if (!scope) throw new Error("Host Bridge page scope is required");
  const defaultLimit = boundedLimit(
    args.defaultLimit,
    HOST_BRIDGE_PAGE_LIMIT_DEFAULT,
    HOST_BRIDGE_PAGE_LIMIT_MAX,
  );
  const maxLimit = Math.max(
    1,
    Math.floor(Number(args.maxLimit) || HOST_BRIDGE_PAGE_LIMIT_MAX),
  );
  const limit = boundedLimit(args.limit, defaultLimit, maxLimit);
  const criteriaHash = fingerprint(args.criteria);
  const now = Number.isFinite(args.now) ? Number(args.now) : Date.now();
  const cursorTtlMs = Math.max(
    1,
    Math.floor(Number(args.cursorTtlMs) || HOST_BRIDGE_CURSOR_TTL_MS),
  );
  let start = 0;
  if (args.cursor !== undefined && args.cursor !== null && args.cursor !== "") {
    const cursor = decodeCursor(args.cursor);
    if (cursor.scope !== scope) {
      throw new HostBridgeCursorError(
        "Host Bridge cursor belongs to another command",
        "scope_mismatch",
        { expectedScope: scope, actualScope: cursor.scope },
      );
    }
    if (cursor.criteriaHash !== criteriaHash) {
      throw new HostBridgeCursorError(
        "Host Bridge cursor does not match the current filters",
        "criteria_mismatch",
      );
    }
    if (now - cursor.issuedAt > cursorTtlMs) {
      throw new HostBridgeCursorError(
        "Host Bridge cursor has expired",
        "expired",
      );
    }
    const anchor = args.rows.findIndex(
      (row) => args.key(row) === cursor.afterKey,
    );
    if (anchor < 0) {
      throw new HostBridgeCursorError(
        "Host Bridge cursor anchor is no longer available",
        "anchor_missing",
        { afterKey: cursor.afterKey },
      );
    }
    start = anchor + 1;
  }
  const page = args.rows.slice(start, start + limit);
  const hasMore = start + page.length < args.rows.length;
  const last = page.at(-1);
  return {
    page: [...page],
    nextCursor:
      hasMore && last
        ? encodeCursor({
            version: CURSOR_VERSION,
            scope,
            criteriaHash,
            issuedAt: now,
            afterKey: args.key(last),
          })
        : "",
    hasMore,
    returned: page.length,
    total: args.rows.length,
    limit,
  };
}

export function chunkHostBridgeText(
  value: unknown,
  options: { offset?: unknown; maxChars?: unknown } = {},
) {
  const text = String(value ?? "");
  const requestedOffset = Number(options.offset);
  const offset = Math.min(
    text.length,
    Number.isFinite(requestedOffset) && requestedOffset > 0
      ? Math.floor(requestedOffset)
      : 0,
  );
  const maxChars = boundedLimit(
    options.maxChars,
    HOST_BRIDGE_TEXT_CHUNK_DEFAULT,
    HOST_BRIDGE_TEXT_CHUNK_MAX,
  );
  const chunk = text.slice(offset, offset + maxChars);
  const nextOffset = offset + chunk.length;
  const hasMore = nextOffset < text.length;
  return {
    text: chunk,
    offset,
    nextOffset,
    totalChars: text.length,
    hasMore,
    truncated: hasMore,
    maxChars,
  };
}

import { decodeBase64Utf8, encodeBase64Utf8, } from "../../zoteroHost/notePayloadCodec";
const CURSOR_VERSION = 1;
export const HOST_BRIDGE_PAGE_LIMIT_DEFAULT = 25;
export const HOST_BRIDGE_PAGE_LIMIT_MAX = 100;
export const HOST_BRIDGE_TEXT_CHUNK_DEFAULT = 8_000;
export const HOST_BRIDGE_TEXT_CHUNK_MAX = 16_000;
const HOST_BRIDGE_CURSOR_TTL_MS = 30 * 60 * 1_000;
export class HostBridgeCursorError extends Error {
    reason;
    details;
    code = "invalid_host_bridge_cursor";
    constructor(message, reason, details = {}) {
        super(message);
        this.reason = reason;
        this.details = details;
        this.name = "HostBridgeCursorError";
    }
}
function stableValue(value) {
    if (Array.isArray(value)) {
        return value.map(stableValue);
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value)
            .filter(([, entry]) => entry !== undefined)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, entry]) => [key, stableValue(entry)]));
    }
    return value;
}
export function fingerprintHostBridgeValue(value) {
    const text = JSON.stringify(stableValue(value));
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
function encodeCursor(cursor) {
    return encodeBase64Utf8(JSON.stringify(cursor))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/u, "");
}
function decodeCursor(value) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/u.test(value)) {
        throw new HostBridgeCursorError("Host Bridge cursor is malformed", "malformed");
    }
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    try {
        const parsed = JSON.parse(decodeBase64Utf8(padded));
        if (parsed.version !== CURSOR_VERSION ||
            typeof parsed.scope !== "string" ||
            typeof parsed.criteriaHash !== "string" ||
            !Number.isFinite(parsed.issuedAt) ||
            typeof parsed.afterKey !== "string" ||
            !parsed.afterKey) {
            throw new Error("invalid cursor shape");
        }
        return parsed;
    }
    catch (error) {
        if (error instanceof HostBridgeCursorError)
            throw error;
        throw new HostBridgeCursorError("Host Bridge cursor is malformed", "malformed");
    }
}
function boundedLimit(value, defaultLimit, maxLimit) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return defaultLimit;
    return Math.max(1, Math.min(maxLimit, Math.floor(parsed)));
}
export function paginateHostBridgeRows(args) {
    const scope = String(args.scope || "").trim();
    if (!scope)
        throw new Error("Host Bridge page scope is required");
    const defaultLimit = boundedLimit(args.defaultLimit, HOST_BRIDGE_PAGE_LIMIT_DEFAULT, HOST_BRIDGE_PAGE_LIMIT_MAX);
    const maxLimit = Math.max(1, Math.floor(Number(args.maxLimit) || HOST_BRIDGE_PAGE_LIMIT_MAX));
    const limit = boundedLimit(args.limit, defaultLimit, maxLimit);
    const criteriaHash = fingerprintHostBridgeValue(args.criteria);
    const now = Number.isFinite(args.now) ? Number(args.now) : Date.now();
    const cursorTtlMs = Math.max(1, Math.floor(Number(args.cursorTtlMs) || HOST_BRIDGE_CURSOR_TTL_MS));
    let start = 0;
    if (args.cursor !== undefined && args.cursor !== null && args.cursor !== "") {
        const cursor = decodeCursor(args.cursor);
        if (cursor.scope !== scope) {
            throw new HostBridgeCursorError("Host Bridge cursor belongs to another command", "scope_mismatch", { expectedScope: scope, actualScope: cursor.scope });
        }
        if (cursor.criteriaHash !== criteriaHash) {
            throw new HostBridgeCursorError("Host Bridge cursor does not match the current filters", "criteria_mismatch");
        }
        if (now - cursor.issuedAt > cursorTtlMs) {
            throw new HostBridgeCursorError("Host Bridge cursor has expired", "expired");
        }
        const anchor = args.rows.findIndex((row) => args.key(row) === cursor.afterKey);
        if (anchor < 0) {
            throw new HostBridgeCursorError("Host Bridge cursor anchor is no longer available", "anchor_missing", { afterKey: cursor.afterKey });
        }
        start = anchor + 1;
    }
    const page = args.rows.slice(start, start + limit);
    const hasMore = start + page.length < args.rows.length;
    const last = page.at(-1);
    return {
        page: [...page],
        nextCursor: hasMore && last
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
function requestCriteria(query) {
    return Object.fromEntries(Object.entries(query)
        .filter(([key]) => key !== "cursor" && key !== "limit")
        .sort(([left], [right]) => left.localeCompare(right)));
}
function requestRowKey(value) {
    const object = value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    for (const key of [
        "queueId",
        "submissionUnitId",
        "permissionRequestId",
        "eventId",
        "skillRunId",
        "workflowRunId",
        "runId",
        "requestId",
        "id",
        "key",
    ]) {
        const entry = String(object[key] || "").trim();
        if (entry)
            return `${key}:${entry}`;
    }
    return fingerprintHostBridgeValue(value);
}
export function paginateHostBridgeRequestRows(args) {
    return paginateHostBridgeRows({
        scope: args.scope,
        criteria: {
            ...requestCriteria(args.request.query),
            ...(args.extraCriteria || {}),
        },
        rows: args.rows,
        key: requestRowKey,
        cursor: args.request.query.cursor,
        limit: args.request.query.limit,
    });
}
export function chunkHostBridgeText(value, options = {}) {
    const text = String(value ?? "");
    const requestedOffset = Number(options.offset);
    const offset = Math.min(text.length, Number.isFinite(requestedOffset) && requestedOffset > 0
        ? Math.floor(requestedOffset)
        : 0);
    const maxChars = boundedLimit(options.maxChars, HOST_BRIDGE_TEXT_CHUNK_DEFAULT, HOST_BRIDGE_TEXT_CHUNK_MAX);
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

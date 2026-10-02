import { toSynthesisJsonValue } from "./common.js";
export const SYNTHESIS_DEBUG_MAINTENANCE_SCHEMA_ID = "synthesis.debug-maintenance.v1";
export const SYNTHESIS_DEBUG_PAGE_LIMIT = 1_000;
export const SYNTHESIS_MAINTENANCE_PAGE_LIMIT = 100;
export class SynthesisDebugMaintenanceContractError extends Error {
    code = "invalid_request";
    constructor(message) {
        super(message);
        this.name = "SynthesisDebugMaintenanceContractError";
    }
}
const clean = (value, max = 512) => {
    if (typeof value !== "string")
        return "";
    const result = value.trim();
    if (result.length > max ||
        [...result].some((character) => character.charCodeAt(0) < 32))
        return "";
    return result;
};
export function synthesisDebugPageLimit(value, debug = false) {
    const maximum = debug
        ? SYNTHESIS_DEBUG_PAGE_LIMIT
        : SYNTHESIS_MAINTENANCE_PAGE_LIMIT;
    const numeric = Math.floor(Number(value));
    return Number.isFinite(numeric) && numeric > 0
        ? Math.min(numeric, maximum)
        : maximum;
}
export function buildSynthesisDebugPage(args) {
    const limit = synthesisDebugPageLimit(args.limit, args.debug);
    const cursor = clean(args.cursor, 128);
    const offset = cursor ? Number.parseInt(cursor, 10) : 0;
    if (!Number.isSafeInteger(offset) ||
        offset < 0 ||
        (cursor !== "" && String(offset) !== cursor)) {
        throw new SynthesisDebugMaintenanceContractError("cursor is invalid");
    }
    const safe = args.items.map((item, index) => toSynthesisJsonValue(item, `items[${index}]`));
    const items = safe.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    return {
        items,
        cursor,
        nextCursor: nextOffset < safe.length ? String(nextOffset) : null,
        limit,
        truncated: nextOffset < safe.length,
        diagnostics: [],
    };
}
export function rebuildSynthesisDebugDiagnostic(codeRaw, severity = "warning") {
    const code = clean(codeRaw, 128);
    if (!code || !["info", "warning", "error"].includes(severity)) {
        throw new SynthesisDebugMaintenanceContractError("diagnostic is invalid");
    }
    return { code, severity };
}
export function diffSynthesisDebugSnapshots(before, after) {
    const project = (snapshot) => new Map([
        ...snapshot.caches.items.map((item) => [`cache:${item.cacheKey}`, JSON.stringify(item)]),
        ...snapshot.operations.items.map((item) => [`operation:${item.operationId}`, JSON.stringify(item)]),
        ...snapshot.topics.items.map((item) => [`topic:${item.topicId}`, JSON.stringify(item)]),
    ].sort(([left], [right]) => left.localeCompare(right)));
    const left = project(before);
    const right = project(after);
    return {
        added: [...right.keys()].filter((key) => !left.has(key)).sort(),
        removed: [...left.keys()].filter((key) => !right.has(key)).sort(),
        changed: [...right.keys()]
            .filter((key) => left.has(key) && left.get(key) !== right.get(key))
            .sort(),
        diagnostics: [],
    };
}

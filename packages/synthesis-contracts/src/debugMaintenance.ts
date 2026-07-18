import { toSynthesisJsonValue, type SynthesisJsonValue } from "./common.js";

export const SYNTHESIS_DEBUG_MAINTENANCE_SCHEMA_ID =
  "synthesis.debug-maintenance.v1" as const;
export const SYNTHESIS_DEBUG_PAGE_LIMIT = 1_000;
export const SYNTHESIS_MAINTENANCE_PAGE_LIMIT = 100;

export type SynthesisDebugDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
};
export type SynthesisDebugPage<T extends SynthesisJsonValue> = {
  items: T[];
  cursor: string;
  nextCursor: string | null;
  limit: number;
  truncated: boolean;
  diagnostics: SynthesisDebugDiagnostic[];
};
export type SynthesisDebugRepositoryBasis = {
  schemaVersion: string;
  revision: string;
};
export type SynthesisDebugSchemaSummary = {
  schemaVersion: string;
  aggregateCount: number;
  diagnostics: SynthesisDebugDiagnostic[];
};
export type SynthesisDebugCacheItem = {
  cacheKey: string;
  cacheKind: string;
  status: string;
  updatedAt: string;
};
export type SynthesisDebugOperationItem = {
  operationId: string;
  operationType: string;
  status: string;
  updatedAt: string;
};
export type SynthesisDebugTopicDescriptor = {
  topicId: string;
  status: "absent" | "ready" | "invalid";
  manifestHash: string | null;
  artifactHash: string | null;
  metadataHash: string | null;
  sectionCount: number;
  diagnostics: SynthesisDebugDiagnostic[];
};
export type SynthesisDebugIsolatedSnapshot = {
  schemaId: typeof SYNTHESIS_DEBUG_MAINTENANCE_SCHEMA_ID;
  status: "ready";
  basis: SynthesisDebugRepositoryBasis;
  schema: SynthesisDebugSchemaSummary;
  caches: SynthesisDebugPage<SynthesisDebugCacheItem>;
  operations: SynthesisDebugPage<SynthesisDebugOperationItem>;
  topics: SynthesisDebugPage<SynthesisDebugTopicDescriptor>;
  diagnostics: SynthesisDebugDiagnostic[];
};
export type SynthesisDebugSnapshotResult =
  | SynthesisDebugIsolatedSnapshot
  | {
      schemaId: typeof SYNTHESIS_DEBUG_MAINTENANCE_SCHEMA_ID;
      status: "superseded";
      diagnostics: SynthesisDebugDiagnostic[];
    };
export type SynthesisDebugProfilerResult =
  | { status: "unavailable"; diagnostics: SynthesisDebugDiagnostic[] }
  | {
      status: "available";
      samples: SynthesisDebugPage<{
        operationType: string;
        durationMs: number;
        sampleCount: number;
      }>;
      diagnostics: SynthesisDebugDiagnostic[];
    };

export class SynthesisDebugMaintenanceContractError extends Error {
  readonly code = "invalid_request";
  constructor(message: string) {
    super(message);
    this.name = "SynthesisDebugMaintenanceContractError";
  }
}

const clean = (value: unknown, max = 512) => {
  if (typeof value !== "string") return "";
  const result = value.trim();
  if (
    result.length > max ||
    [...result].some((character) => character.charCodeAt(0) < 32)
  )
    return "";
  return result;
};

export function synthesisDebugPageLimit(value: unknown, debug = false) {
  const maximum = debug
    ? SYNTHESIS_DEBUG_PAGE_LIMIT
    : SYNTHESIS_MAINTENANCE_PAGE_LIMIT;
  const numeric = Math.floor(Number(value));
  return Number.isFinite(numeric) && numeric > 0
    ? Math.min(numeric, maximum)
    : maximum;
}

export function buildSynthesisDebugPage<T extends SynthesisJsonValue>(args: {
  items: readonly T[];
  cursor?: string;
  limit?: number;
  debug?: boolean;
}): SynthesisDebugPage<T> {
  const limit = synthesisDebugPageLimit(args.limit, args.debug);
  const cursor = clean(args.cursor, 128);
  const offset = cursor ? Number.parseInt(cursor, 10) : 0;
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    (cursor !== "" && String(offset) !== cursor)
  ) {
    throw new SynthesisDebugMaintenanceContractError("cursor is invalid");
  }
  const safe = args.items.map((item, index) =>
    toSynthesisJsonValue(item, `items[${index}]`),
  ) as T[];
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

export function rebuildSynthesisDebugDiagnostic(
  codeRaw: unknown,
  severity: SynthesisDebugDiagnostic["severity"] = "warning",
): SynthesisDebugDiagnostic {
  const code = clean(codeRaw, 128);
  if (!code || !["info", "warning", "error"].includes(severity)) {
    throw new SynthesisDebugMaintenanceContractError("diagnostic is invalid");
  }
  return { code, severity };
}

export function diffSynthesisDebugSnapshots(
  before: SynthesisDebugIsolatedSnapshot,
  after: SynthesisDebugIsolatedSnapshot,
) {
  const project = (snapshot: SynthesisDebugIsolatedSnapshot) =>
    new Map(
      [
        ...snapshot.caches.items.map(
          (item) => [`cache:${item.cacheKey}`, JSON.stringify(item)] as const,
        ),
        ...snapshot.operations.items.map(
          (item) =>
            [`operation:${item.operationId}`, JSON.stringify(item)] as const,
        ),
        ...snapshot.topics.items.map(
          (item) => [`topic:${item.topicId}`, JSON.stringify(item)] as const,
        ),
      ].sort(([left], [right]) => left.localeCompare(right)),
    );
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

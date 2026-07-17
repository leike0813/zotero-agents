export const SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION =
  "synthesis-repository-foundation.v1" as const;
export const SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_META_KEY =
  "repository_foundation_schema_version" as const;
export const SYNTHESIS_TOPIC_APPLICATION_REPOSITORY_SCHEMA_VERSION =
  "synthesis-topic-application-repository.v1" as const;
export const SYNTHESIS_TOPIC_APPLICATION_REPOSITORY_SCHEMA_META_KEY =
  "topic_application_schema_version" as const;

export * from "./citationGraph.js";
export * from "./referenceMatchingReview.js";
export * from "./referenceRefresh.js";
import {
  ensureSynthesisCitationGraphApplicationRepositorySchema,
  getSynthesisCitationGraphApplicationState,
  getSynthesisCitationLayout,
  listSynthesisCitationComplexMetrics,
  listSynthesisCitationEdges,
  listSynthesisCitationIncomingGroups,
  listSynthesisCitationLayouts,
  listSynthesisCitationLightMetrics,
  listSynthesisCitationNodes,
  listSynthesisCitationSourceOwnership,
  promoteSynthesisCitationGraphComplexMetrics,
  promoteSynthesisCitationGraphLayout,
  replaceSynthesisCitationGraphApplicationState,
  type SynthesisCitationComplexMetricsRecord,
  type SynthesisCitationGraphStateReplacement,
  type SynthesisCitationLayoutRecord,
} from "./citationGraph.js";
import {
  ensureSynthesisReferenceMatchingReviewRepositorySchema,
  reconcileSynthesisReferenceMatchingPreparations,
} from "./referenceMatchingReview.js";
import {
  ensureSynthesisReferenceRefreshRepositorySchema,
  getSynthesisReferenceApplicationState,
  listSynthesisCanonicalReferences,
  listSynthesisRawReferences,
  listSynthesisReferenceArtifacts,
  listSynthesisReferenceBindings,
  listSynthesisReferenceSources,
  replaceSynthesisReferenceProjection,
  type SynthesisReferenceProjectionReplacement,
} from "./referenceRefresh.js";

export type SqlPrimitive = string | number | null;
export type SqlParams = Record<string, SqlPrimitive | boolean | undefined>;
export type SqlRow = Record<string, unknown>;

export type SqlAdapter = {
  run: (sql: string, params?: SqlParams) => void;
  all: (sql: string, params?: SqlParams) => SqlRow[];
  get: (sql: string, params?: SqlParams) => SqlRow | null;
  transaction: <T>(fn: () => T) => T;
};

export type SynthesisOperationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "canceled";
export type SynthesisOperationProgressMode = "determinate" | "indeterminate";
export type SynthesisCacheBasisStatus =
  | "missing"
  | "ready"
  | "stale"
  | "refreshing"
  | "failed";

export type SynthesisCacheBasisRecord = {
  cacheKey: string;
  cacheKind: string;
  scopeKind?: string;
  scopeRef?: string;
  status?: SynthesisCacheBasisStatus;
  basisKind?: string;
  basisValue?: string;
  sourceHash?: string;
  policyVersion?: string;
  activeOperationId?: string;
  refreshedAt?: string;
  staleReason?: string;
  diagnosticsJson?: string;
  updatedAt?: string;
};

export type SynthesisOperationRecord = {
  operationId: string;
  operationType: string;
  libraryId?: number;
  scopeKind?: string;
  scopeRef?: string;
  status?: SynthesisOperationStatus;
  label?: string;
  phase?: string;
  phaseLabel?: string;
  message?: string;
  progressMode?: SynthesisOperationProgressMode;
  processedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  totalCount?: number;
  basisKind?: string;
  basisValue?: string;
  sourceHash?: string;
  diagnosticsJson?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt?: string;
};

export type SynthesisOperationStatusUpdate = {
  operationId: string;
  status: SynthesisOperationStatus;
  phase?: string;
  phaseLabel?: string;
  message?: string;
  processedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  totalCount?: number;
  diagnosticsJson?: string;
};

export type SynthesisTopicApplicationStateRecord = {
  topicId: string;
  pathId: string;
  title: string;
  definition: string;
  language: string;
  operation: string;
  manifestHash: string;
  artifactHash: string;
  metadataHash: string;
  bundleHash: string;
  paperCount: number;
  topicDefinitionJson: string;
  topicResolverJson: string;
  resolvedPaperSetJson: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisTopicApplicationProjectionRecord = {
  topicId: string;
  topicGraphJson: string;
  conceptsJson: string;
  interestMetadataJson: string;
  discoveryJson: string;
  updatedAt?: string;
};

export const SYNTHESIS_REPOSITORY_FOUNDATION_TABLES = [
  "synt_schema_meta",
  "synt_cache_basis",
  "synt_operation",
] as const;

export const SYNTHESIS_REPOSITORY_FOUNDATION_INDEXES = [
  "idx_synt_cache_basis_kind_status",
  "idx_synt_operation_type_status_updated",
] as const;

export const SYNTHESIS_TOPIC_APPLICATION_REPOSITORY_TABLES = [
  "synt_topic_application_state",
  "synt_topic_application_projection",
] as const;

export const SYNTHESIS_TOPIC_APPLICATION_REPOSITORY_INDEXES = [
  "idx_synt_topic_application_state_updated",
] as const;

const cleanString = (value: unknown) => String(value ?? "").trim();

function nonNegativeInt(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function rebuildSynthesisOperationStatus(
  value: unknown,
): SynthesisOperationStatus {
  if (
    value === "pending" ||
    value === "running" ||
    value === "completed" ||
    value === "failed" ||
    value === "canceled"
  ) {
    return value;
  }
  return "pending";
}

export function rebuildSynthesisOperationProgressMode(
  value: unknown,
): SynthesisOperationProgressMode {
  return value === "determinate" ? "determinate" : "indeterminate";
}

export function rebuildSynthesisCacheBasisStatus(
  value: unknown,
): SynthesisCacheBasisStatus {
  if (
    value === "ready" ||
    value === "stale" ||
    value === "refreshing" ||
    value === "failed"
  ) {
    return value;
  }
  return "missing";
}

export function rebuildSynthesisCacheBasisRow(
  row: SqlRow,
): SynthesisCacheBasisRecord {
  const cacheKey = cleanString(row.cache_key);
  const cacheKind = cleanString(row.cache_kind);
  if (!cacheKey || !cacheKind) {
    throw new Error("repository_cache_basis_row_invalid");
  }
  return {
    cacheKey,
    cacheKind,
    scopeKind: cleanString(row.scope_kind) || undefined,
    scopeRef: cleanString(row.scope_ref) || undefined,
    status: rebuildSynthesisCacheBasisStatus(row.status),
    basisKind: cleanString(row.basis_kind) || undefined,
    basisValue: cleanString(row.basis_value) || undefined,
    sourceHash: cleanString(row.source_hash) || undefined,
    policyVersion: cleanString(row.policy_version) || undefined,
    activeOperationId: cleanString(row.active_operation_id) || undefined,
    refreshedAt: cleanString(row.refreshed_at) || undefined,
    staleReason: cleanString(row.stale_reason) || undefined,
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

export function rebuildSynthesisOperationRow(
  row: SqlRow,
): SynthesisOperationRecord {
  const operationId = cleanString(row.operation_id);
  const operationType = cleanString(row.operation_type);
  if (!operationId || !operationType) {
    throw new Error("repository_operation_row_invalid");
  }
  return {
    operationId,
    operationType,
    libraryId: nonNegativeInt(row.library_id),
    scopeKind: cleanString(row.scope_kind) || undefined,
    scopeRef: cleanString(row.scope_ref) || undefined,
    status: rebuildSynthesisOperationStatus(row.status),
    label: cleanString(row.label) || undefined,
    phase: cleanString(row.phase) || undefined,
    phaseLabel: cleanString(row.phase_label) || undefined,
    message: cleanString(row.message) || undefined,
    progressMode: rebuildSynthesisOperationProgressMode(row.progress_mode),
    processedCount: nonNegativeInt(row.processed_count),
    skippedCount: nonNegativeInt(row.skipped_count),
    failedCount: nonNegativeInt(row.failed_count),
    totalCount: nonNegativeInt(row.total_count),
    basisKind: cleanString(row.basis_kind) || undefined,
    basisValue: cleanString(row.basis_value) || undefined,
    sourceHash: cleanString(row.source_hash) || undefined,
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    createdAt: cleanString(row.created_at) || undefined,
    startedAt: cleanString(row.started_at) || undefined,
    completedAt: cleanString(row.completed_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

export function ensureSynthesisRepositoryFoundationSchema(db: SqlAdapter) {
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  const current = cleanString(
    db.get("SELECT value FROM synt_schema_meta WHERE key=@key LIMIT 1", {
      key: SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_META_KEY,
    })?.value,
  );
  if (current && current !== SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION) {
    throw new Error("repository_foundation_schema_unsupported");
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_cache_basis (
      cache_key TEXT PRIMARY KEY,
      cache_kind TEXT NOT NULL,
      scope_kind TEXT NOT NULL DEFAULT '',
      scope_ref TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'missing',
      basis_kind TEXT NOT NULL DEFAULT '',
      basis_value TEXT NOT NULL DEFAULT '',
      source_hash TEXT NOT NULL DEFAULT '',
      policy_version TEXT NOT NULL DEFAULT '',
      active_operation_id TEXT NOT NULL DEFAULT '',
      refreshed_at TEXT NOT NULL DEFAULT '',
      stale_reason TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_operation (
      operation_id TEXT PRIMARY KEY,
      operation_type TEXT NOT NULL,
      library_id INTEGER NOT NULL DEFAULT 0,
      scope_kind TEXT NOT NULL DEFAULT '',
      scope_ref TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      label TEXT NOT NULL DEFAULT '',
      phase TEXT NOT NULL DEFAULT '',
      phase_label TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      progress_mode TEXT NOT NULL DEFAULT 'indeterminate',
      processed_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      total_count INTEGER NOT NULL DEFAULT 0,
      basis_kind TEXT NOT NULL DEFAULT '',
      basis_value TEXT NOT NULL DEFAULT '',
      source_hash TEXT NOT NULL DEFAULT '',
      diagnostics_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL DEFAULT '',
      completed_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_cache_basis_kind_status
      ON synt_cache_basis(cache_kind, status, updated_at DESC);
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_operation_type_status_updated
      ON synt_operation(operation_type, status, updated_at DESC);
  `);
  db.run(
    `INSERT OR REPLACE INTO synt_schema_meta(key, value) VALUES (@key, @value)`,
    {
      key: SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_META_KEY,
      value: SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
    },
  );
}

export function ensureSynthesisTopicApplicationRepositorySchema(
  db: SqlAdapter,
) {
  ensureSynthesisRepositoryFoundationSchema(db);
  const current = cleanString(
    db.get("SELECT value FROM synt_schema_meta WHERE key=@key LIMIT 1", {
      key: SYNTHESIS_TOPIC_APPLICATION_REPOSITORY_SCHEMA_META_KEY,
    })?.value,
  );
  if (
    current &&
    current !== SYNTHESIS_TOPIC_APPLICATION_REPOSITORY_SCHEMA_VERSION
  ) {
    throw new Error("repository_topic_application_schema_unsupported");
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_topic_application_state (
      topic_id TEXT PRIMARY KEY,
      path_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      definition TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'auto',
      operation TEXT NOT NULL DEFAULT '',
      manifest_hash TEXT NOT NULL,
      artifact_hash TEXT NOT NULL,
      metadata_hash TEXT NOT NULL,
      bundle_hash TEXT NOT NULL,
      paper_count INTEGER NOT NULL DEFAULT 0,
      topic_definition_json TEXT NOT NULL DEFAULT '{}',
      topic_resolver_json TEXT NOT NULL DEFAULT '{}',
      resolved_paper_set_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS synt_topic_application_projection (
      topic_id TEXT PRIMARY KEY,
      topic_graph_json TEXT NOT NULL DEFAULT '{}',
      concepts_json TEXT NOT NULL DEFAULT '{}',
      interest_metadata_json TEXT NOT NULL DEFAULT '{}',
      discovery_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT ''
    )
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_synt_topic_application_state_updated
      ON synt_topic_application_state(updated_at DESC, topic_id ASC)
  `);
  db.run(
    "INSERT OR REPLACE INTO synt_schema_meta (key, value) VALUES (@key, @value)",
    {
      key: SYNTHESIS_TOPIC_APPLICATION_REPOSITORY_SCHEMA_META_KEY,
      value: SYNTHESIS_TOPIC_APPLICATION_REPOSITORY_SCHEMA_VERSION,
    },
  );
}

function strictJsonText(value: unknown) {
  const text = cleanString(value) || "{}";
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("repository_topic_application_json_invalid");
    }
  } catch {
    throw new Error("repository_topic_application_json_invalid");
  }
  return text;
}

export function rebuildSynthesisTopicApplicationStateRow(
  row: SqlRow,
): SynthesisTopicApplicationStateRecord {
  const topicId = cleanString(row.topic_id);
  const pathId = cleanString(row.path_id);
  const manifestHash = cleanString(row.manifest_hash);
  const artifactHash = cleanString(row.artifact_hash);
  const metadataHash = cleanString(row.metadata_hash);
  const bundleHash = cleanString(row.bundle_hash);
  if (
    !topicId ||
    !pathId ||
    !manifestHash ||
    !artifactHash ||
    !metadataHash ||
    !bundleHash
  ) {
    throw new Error("repository_topic_application_state_invalid");
  }
  return {
    topicId,
    pathId,
    title: cleanString(row.title),
    definition: cleanString(row.definition),
    language: cleanString(row.language) || "auto",
    operation: cleanString(row.operation),
    manifestHash,
    artifactHash,
    metadataHash,
    bundleHash,
    paperCount: nonNegativeInt(row.paper_count),
    topicDefinitionJson: strictJsonText(row.topic_definition_json),
    topicResolverJson: strictJsonText(row.topic_resolver_json),
    resolvedPaperSetJson: strictJsonText(row.resolved_paper_set_json),
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

export function rebuildSynthesisTopicApplicationProjectionRow(
  row: SqlRow,
): SynthesisTopicApplicationProjectionRecord {
  const topicId = cleanString(row.topic_id);
  if (!topicId) {
    throw new Error("repository_topic_application_projection_invalid");
  }
  return {
    topicId,
    topicGraphJson: strictJsonText(row.topic_graph_json),
    conceptsJson: strictJsonText(row.concepts_json),
    interestMetadataJson: strictJsonText(row.interest_metadata_json),
    discoveryJson: strictJsonText(row.discovery_json),
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

export function getSynthesisRepositoryFoundationSchemaVersion(db: SqlAdapter) {
  return cleanString(
    db.get("SELECT value FROM synt_schema_meta WHERE key=@key LIMIT 1", {
      key: SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_META_KEY,
    })?.value,
  );
}

function appendInFilter(
  clauses: string[],
  params: SqlParams,
  column: string,
  prefix: string,
  values: readonly string[],
) {
  const cleaned = values.map(cleanString).filter(Boolean);
  if (!cleaned.length) return;
  const placeholders = cleaned.map((value, index) => {
    const key = `${prefix}_${index}`;
    params[key] = value;
    return `@${key}`;
  });
  clauses.push(`${column} IN (${placeholders.join(", ")})`);
}

export function getSynthesisCacheBasis(db: SqlAdapter, cacheKeyRaw: string) {
  const cacheKey = cleanString(cacheKeyRaw);
  if (!cacheKey) return null;
  const row = db.get(
    "SELECT * FROM synt_cache_basis WHERE cache_key=@cache_key LIMIT 1",
    { cache_key: cacheKey },
  );
  return row ? rebuildSynthesisCacheBasisRow(row) : null;
}

export function upsertSynthesisCacheBasis(
  db: SqlAdapter,
  record: SynthesisCacheBasisRecord,
  now: () => string,
) {
  const cacheKey = cleanString(record.cacheKey);
  const cacheKind = cleanString(record.cacheKind);
  if (!cacheKey) throw new Error("cacheKey must be non-empty");
  if (!cacheKind) throw new Error("cacheKind must be non-empty");
  db.run(
    `INSERT OR REPLACE INTO synt_cache_basis (
      cache_key, cache_kind, scope_kind, scope_ref, status, basis_kind,
      basis_value, source_hash, policy_version, active_operation_id,
      refreshed_at, stale_reason, diagnostics_json, updated_at
    ) VALUES (
      @cache_key, @cache_kind, @scope_kind, @scope_ref, @status, @basis_kind,
      @basis_value, @source_hash, @policy_version, @active_operation_id,
      @refreshed_at, @stale_reason, @diagnostics_json, @updated_at
    )`,
    {
      cache_key: cacheKey,
      cache_kind: cacheKind,
      scope_kind: cleanString(record.scopeKind),
      scope_ref: cleanString(record.scopeRef),
      status: rebuildSynthesisCacheBasisStatus(record.status),
      basis_kind: cleanString(record.basisKind),
      basis_value: cleanString(record.basisValue),
      source_hash: cleanString(record.sourceHash),
      policy_version: cleanString(record.policyVersion),
      active_operation_id: cleanString(record.activeOperationId),
      refreshed_at: cleanString(record.refreshedAt),
      stale_reason: cleanString(record.staleReason),
      diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
      updated_at: cleanString(record.updatedAt) || now(),
    },
  );
}

export function listSynthesisCacheBasis(
  db: SqlAdapter,
  args: { cacheKinds?: string[]; statuses?: string[] } = {},
) {
  const cacheKinds = new Set(
    (args.cacheKinds ?? []).map(cleanString).filter(Boolean),
  );
  const statuses = new Set(
    (args.statuses ?? []).map(cleanString).filter(Boolean),
  );
  const clauses: string[] = [];
  const params: SqlParams = {};
  appendInFilter(
    clauses,
    params,
    "cache_kind",
    "cache_kind",
    args.cacheKinds ?? [],
  );
  appendInFilter(clauses, params, "status", "status", args.statuses ?? []);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .all(
      `SELECT * FROM synt_cache_basis ${where} ORDER BY updated_at DESC, cache_key ASC`,
      params,
    )
    .map(rebuildSynthesisCacheBasisRow)
    .filter((row) => !cacheKinds.size || cacheKinds.has(row.cacheKind))
    .filter((row) => !statuses.size || statuses.has(row.status ?? ""));
}

export function upsertSynthesisOperation(
  db: SqlAdapter,
  record: SynthesisOperationRecord,
  now: () => string,
) {
  const operationId = cleanString(record.operationId);
  const operationType = cleanString(record.operationType);
  if (!operationId) throw new Error("operationId must be non-empty");
  if (!operationType) throw new Error("operationType must be non-empty");
  const timestamp = now();
  db.run(
    `INSERT OR REPLACE INTO synt_operation (
      operation_id, operation_type, library_id, scope_kind, scope_ref, status,
      label, phase, phase_label, message, progress_mode, processed_count,
      skipped_count, failed_count, total_count, basis_kind, basis_value,
      source_hash, diagnostics_json, created_at, started_at, completed_at, updated_at
    ) VALUES (
      @operation_id, @operation_type, @library_id, @scope_kind, @scope_ref, @status,
      @label, @phase, @phase_label, @message, @progress_mode, @processed_count,
      @skipped_count, @failed_count, @total_count, @basis_kind, @basis_value,
      @source_hash, @diagnostics_json, @created_at, @started_at, @completed_at, @updated_at
    )`,
    {
      operation_id: operationId,
      operation_type: operationType,
      library_id: nonNegativeInt(record.libraryId),
      scope_kind: cleanString(record.scopeKind),
      scope_ref: cleanString(record.scopeRef),
      status: rebuildSynthesisOperationStatus(record.status),
      label: cleanString(record.label),
      phase: cleanString(record.phase),
      phase_label: cleanString(record.phaseLabel),
      message: cleanString(record.message),
      progress_mode: rebuildSynthesisOperationProgressMode(record.progressMode),
      processed_count: nonNegativeInt(record.processedCount),
      skipped_count: nonNegativeInt(record.skippedCount),
      failed_count: nonNegativeInt(record.failedCount),
      total_count: nonNegativeInt(record.totalCount),
      basis_kind: cleanString(record.basisKind),
      basis_value: cleanString(record.basisValue),
      source_hash: cleanString(record.sourceHash),
      diagnostics_json: cleanString(record.diagnosticsJson) || "[]",
      created_at: cleanString(record.createdAt) || timestamp,
      started_at: cleanString(record.startedAt) || timestamp,
      completed_at: cleanString(record.completedAt),
      updated_at: cleanString(record.updatedAt) || timestamp,
    },
  );
}

export function getSynthesisOperation(db: SqlAdapter, operationIdRaw: string) {
  const operationId = cleanString(operationIdRaw);
  if (!operationId) return null;
  const row = db.get(
    "SELECT * FROM synt_operation WHERE operation_id=@operation_id LIMIT 1",
    { operation_id: operationId },
  );
  return row ? rebuildSynthesisOperationRow(row) : null;
}

export function updateSynthesisOperationStatus(
  db: SqlAdapter,
  args: SynthesisOperationStatusUpdate,
  now: () => string,
) {
  const existing = getSynthesisOperation(db, args.operationId);
  if (!existing) return null;
  const timestamp = now();
  const terminal =
    args.status === "completed" ||
    args.status === "failed" ||
    args.status === "canceled";
  const next: SynthesisOperationRecord = {
    ...existing,
    status: args.status,
    phase: args.phase ?? existing.phase,
    phaseLabel: args.phaseLabel ?? existing.phaseLabel,
    message: args.message ?? existing.message,
    processedCount: args.processedCount ?? existing.processedCount,
    skippedCount: args.skippedCount ?? existing.skippedCount,
    failedCount: args.failedCount ?? existing.failedCount,
    totalCount: args.totalCount ?? existing.totalCount,
    diagnosticsJson: args.diagnosticsJson ?? existing.diagnosticsJson,
    completedAt: terminal ? timestamp : existing.completedAt,
    updatedAt: timestamp,
  };
  upsertSynthesisOperation(db, next, now);
  return next;
}

export function listSynthesisOperations(
  db: SqlAdapter,
  args: {
    statuses?: string[];
    operationTypes?: string[];
    includeCompleted?: boolean;
    limit?: number;
  } = {},
) {
  const statuses = new Set(
    (args.statuses ?? []).map(cleanString).filter(Boolean),
  );
  const operationTypes = new Set(
    (args.operationTypes ?? []).map(cleanString).filter(Boolean),
  );
  const terminal = new Set<SynthesisOperationStatus>([
    "completed",
    "failed",
    "canceled",
  ]);
  const clauses: string[] = [];
  const params: SqlParams = {};
  appendInFilter(clauses, params, "status", "status", args.statuses ?? []);
  appendInFilter(
    clauses,
    params,
    "operation_type",
    "operation_type",
    args.operationTypes ?? [],
  );
  if (!args.includeCompleted) {
    clauses.push("status NOT IN ('completed', 'failed', 'canceled')");
  }
  const limit = nonNegativeInt(args.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .all(
      `SELECT * FROM synt_operation ${where} ORDER BY updated_at DESC, operation_id ASC`,
      params,
    )
    .map(rebuildSynthesisOperationRow)
    .filter((row) => !statuses.size || statuses.has(row.status ?? ""))
    .filter(
      (row) => !operationTypes.size || operationTypes.has(row.operationType),
    )
    .filter(
      (row) => args.includeCompleted || !terminal.has(row.status ?? "pending"),
    )
    .sort(
      (left, right) =>
        (right.updatedAt ?? "").localeCompare(left.updatedAt ?? "") ||
        left.operationId.localeCompare(right.operationId),
    );
  return limit ? rows.slice(0, limit) : rows;
}

export function getSynthesisTopicApplicationState(
  db: SqlAdapter,
  topicIdRaw: string,
) {
  const topicId = cleanString(topicIdRaw);
  if (!topicId) return null;
  const row = db.get(
    "SELECT * FROM synt_topic_application_state WHERE topic_id=@topic_id LIMIT 1",
    { topic_id: topicId },
  );
  return row ? rebuildSynthesisTopicApplicationStateRow(row) : null;
}

export function listSynthesisTopicApplicationStates(
  db: SqlAdapter,
  args: { offset?: number; limit?: number } = {},
) {
  const offset = nonNegativeInt(args.offset);
  const limit = Math.max(1, nonNegativeInt(args.limit) || 50);
  const total = nonNegativeInt(
    db.get("SELECT COUNT(*) AS count FROM synt_topic_application_state")?.count,
  );
  const rows = db
    .all(
      `SELECT * FROM synt_topic_application_state
       ORDER BY updated_at DESC, topic_id ASC
       LIMIT @limit OFFSET @offset`,
      { limit, offset },
    )
    .map(rebuildSynthesisTopicApplicationStateRow);
  return { rows, total };
}

export function upsertSynthesisTopicApplicationState(
  db: SqlAdapter,
  record: SynthesisTopicApplicationStateRecord,
  now: () => string,
) {
  const topicId = cleanString(record.topicId);
  const pathId = cleanString(record.pathId);
  if (!topicId || !pathId) {
    throw new Error("repository_topic_application_state_invalid");
  }
  const timestamp = now();
  db.run(
    `INSERT OR REPLACE INTO synt_topic_application_state (
      topic_id, path_id, title, definition, language, operation,
      manifest_hash, artifact_hash, metadata_hash, bundle_hash, paper_count,
      topic_definition_json, topic_resolver_json, resolved_paper_set_json,
      created_at, updated_at
    ) VALUES (
      @topic_id, @path_id, @title, @definition, @language, @operation,
      @manifest_hash, @artifact_hash, @metadata_hash, @bundle_hash, @paper_count,
      @topic_definition_json, @topic_resolver_json, @resolved_paper_set_json,
      @created_at, @updated_at
    )`,
    {
      topic_id: topicId,
      path_id: pathId,
      title: cleanString(record.title),
      definition: cleanString(record.definition),
      language: cleanString(record.language) || "auto",
      operation: cleanString(record.operation),
      manifest_hash: cleanString(record.manifestHash),
      artifact_hash: cleanString(record.artifactHash),
      metadata_hash: cleanString(record.metadataHash),
      bundle_hash: cleanString(record.bundleHash),
      paper_count: nonNegativeInt(record.paperCount),
      topic_definition_json: strictJsonText(record.topicDefinitionJson),
      topic_resolver_json: strictJsonText(record.topicResolverJson),
      resolved_paper_set_json: strictJsonText(record.resolvedPaperSetJson),
      created_at: cleanString(record.createdAt) || timestamp,
      updated_at: cleanString(record.updatedAt) || timestamp,
    },
  );
}

export function getSynthesisTopicApplicationProjection(
  db: SqlAdapter,
  topicIdRaw: string,
) {
  const topicId = cleanString(topicIdRaw);
  if (!topicId) return null;
  const row = db.get(
    "SELECT * FROM synt_topic_application_projection WHERE topic_id=@topic_id LIMIT 1",
    { topic_id: topicId },
  );
  return row ? rebuildSynthesisTopicApplicationProjectionRow(row) : null;
}

export function upsertSynthesisTopicApplicationProjection(
  db: SqlAdapter,
  record: SynthesisTopicApplicationProjectionRecord,
  now: () => string,
) {
  const topicId = cleanString(record.topicId);
  if (!topicId) {
    throw new Error("repository_topic_application_projection_invalid");
  }
  db.run(
    `INSERT OR REPLACE INTO synt_topic_application_projection (
      topic_id, topic_graph_json, concepts_json, interest_metadata_json,
      discovery_json, updated_at
    ) VALUES (
      @topic_id, @topic_graph_json, @concepts_json, @interest_metadata_json,
      @discovery_json, @updated_at
    )`,
    {
      topic_id: topicId,
      topic_graph_json: strictJsonText(record.topicGraphJson),
      concepts_json: strictJsonText(record.conceptsJson),
      interest_metadata_json: strictJsonText(record.interestMetadataJson),
      discovery_json: strictJsonText(record.discoveryJson),
      updated_at: cleanString(record.updatedAt) || now(),
    },
  );
}

export type SynthesisRepositoryFoundationStore = ReturnType<
  typeof createSynthesisRepositoryFoundationStore
>;

export function createSynthesisRepositoryFoundationStore(options: {
  db: SqlAdapter;
  now?: () => string;
}) {
  const { db } = options;
  const now = options.now ?? (() => new Date().toISOString());
  let initialized = false;
  let topicApplicationInitialized = false;
  let citationGraphApplicationInitialized = false;
  let referenceRefreshApplicationInitialized = false;
  let referenceMatchingReviewApplicationInitialized = false;
  const initialize = () => {
    if (initialized) return;
    ensureSynthesisRepositoryFoundationSchema(db);
    initialized = true;
  };
  const initializeTopicApplication = () => {
    initialize();
    if (topicApplicationInitialized) return;
    ensureSynthesisTopicApplicationRepositorySchema(db);
    topicApplicationInitialized = true;
  };
  const initializeCitationGraphApplication = () => {
    initialize();
    if (citationGraphApplicationInitialized) return;
    ensureSynthesisCitationGraphApplicationRepositorySchema(db);
    citationGraphApplicationInitialized = true;
  };
  const initializeReferenceRefreshApplication = () => {
    initialize();
    if (referenceRefreshApplicationInitialized) return;
    ensureSynthesisReferenceRefreshRepositorySchema(db);
    referenceRefreshApplicationInitialized = true;
  };
  const initializeReferenceMatchingReviewApplication = () => {
    initializeReferenceRefreshApplication();
    if (referenceMatchingReviewApplicationInitialized) return;
    ensureSynthesisReferenceMatchingReviewRepositorySchema(db);
    referenceMatchingReviewApplicationInitialized = true;
  };
  const reconcileReferenceMatchingPreparations = () => {
    initializeReferenceMatchingReviewApplication();
    reconcileSynthesisReferenceMatchingPreparations(db, now());
  };
  return {
    initialize,
    getSchemaVersion() {
      initialize();
      return getSynthesisRepositoryFoundationSchemaVersion(db);
    },
    getCacheBasis(cacheKey: string) {
      initialize();
      return getSynthesisCacheBasis(db, cacheKey);
    },
    upsertCacheBasis(record: SynthesisCacheBasisRecord) {
      initialize();
      upsertSynthesisCacheBasis(db, record, now);
    },
    listCacheBasis(args?: { cacheKinds?: string[]; statuses?: string[] }) {
      initialize();
      return listSynthesisCacheBasis(db, args);
    },
    getOperation(operationId: string) {
      initialize();
      return getSynthesisOperation(db, operationId);
    },
    upsertOperation(record: SynthesisOperationRecord) {
      initialize();
      upsertSynthesisOperation(db, record, now);
    },
    updateOperationStatus(args: SynthesisOperationStatusUpdate) {
      initialize();
      return updateSynthesisOperationStatus(db, args, now);
    },
    listOperations(args?: {
      statuses?: string[];
      operationTypes?: string[];
      includeCompleted?: boolean;
      limit?: number;
    }) {
      initialize();
      return listSynthesisOperations(db, args);
    },
    reconcileRunningOperations() {
      initialize();
      return db.transaction(() => {
        const running = listSynthesisOperations(db, {
          statuses: ["running"],
          includeCompleted: true,
        });
        for (const operation of running) {
          updateSynthesisOperationStatus(
            db,
            {
              operationId: operation.operationId,
              status: "canceled",
              phase: "service_restart",
              message: "Interrupted by sidecar service restart.",
            },
            now,
          );
        }
        return running.length;
      });
    },
    initializeTopicApplication,
    initializeCitationGraphApplication,
    initializeReferenceRefreshApplication,
    initializeReferenceMatchingReviewApplication,
    reconcileReferenceMatchingPreparations,
    getReferenceApplicationState() {
      initializeReferenceRefreshApplication();
      return getSynthesisReferenceApplicationState(db);
    },
    replaceReferenceProjection(args: SynthesisReferenceProjectionReplacement) {
      initializeReferenceRefreshApplication();
      return replaceSynthesisReferenceProjection(db, args);
    },
    listReferenceSources() {
      initializeReferenceRefreshApplication();
      return listSynthesisReferenceSources(db);
    },
    listReferenceArtifacts(sourceRefs?: string[]) {
      initializeReferenceRefreshApplication();
      return listSynthesisReferenceArtifacts(db, sourceRefs);
    },
    listRawReferences() {
      initializeReferenceRefreshApplication();
      return listSynthesisRawReferences(db);
    },
    listCanonicalReferences() {
      initializeReferenceRefreshApplication();
      return listSynthesisCanonicalReferences(db);
    },
    listReferenceBindings() {
      initializeReferenceRefreshApplication();
      return listSynthesisReferenceBindings(db);
    },
    getCitationGraphApplicationState() {
      initializeCitationGraphApplication();
      return getSynthesisCitationGraphApplicationState(db);
    },
    replaceCitationGraphApplicationState(args: {
      expectedGraphHash: string | null;
      graphHash: string;
      inputHash: string;
      state: SynthesisCitationGraphStateReplacement;
      now: string;
    }) {
      initializeCitationGraphApplication();
      return replaceSynthesisCitationGraphApplicationState(db, args);
    },
    promoteCitationGraphComplexMetrics(args: {
      expectedGraphHash: string;
      metricsHash: string;
      records: SynthesisCitationComplexMetricsRecord[];
      now: string;
    }) {
      initializeCitationGraphApplication();
      return promoteSynthesisCitationGraphComplexMetrics(db, args);
    },
    promoteCitationGraphLayout(args: {
      expectedGraphHash: string;
      record: SynthesisCitationLayoutRecord;
      now: string;
    }) {
      initializeCitationGraphApplication();
      return promoteSynthesisCitationGraphLayout(db, args);
    },
    listCitationNodes() {
      initializeCitationGraphApplication();
      return listSynthesisCitationNodes(db);
    },
    listCitationEdges() {
      initializeCitationGraphApplication();
      return listSynthesisCitationEdges(db);
    },
    listCitationSourceOwnership() {
      initializeCitationGraphApplication();
      return listSynthesisCitationSourceOwnership(db);
    },
    listCitationIncomingGroups() {
      initializeCitationGraphApplication();
      return listSynthesisCitationIncomingGroups(db);
    },
    listCitationLightMetrics() {
      initializeCitationGraphApplication();
      return listSynthesisCitationLightMetrics(db);
    },
    listCitationComplexMetrics() {
      initializeCitationGraphApplication();
      return listSynthesisCitationComplexMetrics(db);
    },
    getCitationGraphLayout(layoutKey: string) {
      initializeCitationGraphApplication();
      return getSynthesisCitationLayout(db, layoutKey);
    },
    listCitationGraphLayouts() {
      initializeCitationGraphApplication();
      return listSynthesisCitationLayouts(db);
    },
    getTopicApplicationState(topicId: string) {
      initializeTopicApplication();
      return getSynthesisTopicApplicationState(db, topicId);
    },
    listTopicApplicationStates(args?: { offset?: number; limit?: number }) {
      initializeTopicApplication();
      return listSynthesisTopicApplicationStates(db, args);
    },
    upsertTopicApplicationState(record: SynthesisTopicApplicationStateRecord) {
      initializeTopicApplication();
      upsertSynthesisTopicApplicationState(db, record, now);
    },
    getTopicApplicationProjection(topicId: string) {
      initializeTopicApplication();
      return getSynthesisTopicApplicationProjection(db, topicId);
    },
    upsertTopicApplicationProjection(
      record: SynthesisTopicApplicationProjectionRecord,
    ) {
      initializeTopicApplication();
      upsertSynthesisTopicApplicationProjection(db, record, now);
    },
  };
}

import type { SqlAdapter, SqlParams, SqlRow } from "./index.js";

export const SYNTHESIS_REFERENCE_MATCHING_REVIEW_REPOSITORY_SCHEMA_VERSION =
  "synthesis-reference-matching-review-repository.v1" as const;
export const SYNTHESIS_REFERENCE_MATCHING_REVIEW_REPOSITORY_SCHEMA_META_KEY =
  "reference_matching_review_application_schema_version" as const;

export const SYNTHESIS_REFERENCE_MATCH_PROPOSAL_PAGE_DEFAULT = 100 as const;
export const SYNTHESIS_REFERENCE_MATCH_PROPOSAL_PAGE_MAX = 100 as const;

export const SYNTHESIS_REFERENCE_MATCHING_REVIEW_REPOSITORY_TABLES = [
  "synt_reference_matching_state",
  "synt_reference_matching_preparation",
  "synt_reference_match_proposal",
] as const;

export const SYNTHESIS_REFERENCE_MATCHING_REVIEW_REPOSITORY_INDEXES = [
  "idx_synt_reference_matching_preparation_status",
  "idx_synt_reference_match_proposal_status",
  "idx_synt_reference_match_proposal_source",
  "idx_synt_reference_match_proposal_target",
  "idx_synt_reference_match_proposal_basis",
] as const;

export type SynthesisReferenceMatchProposalKind =
  | "zotero_binding"
  | "canonical_merge";

export type SynthesisReferenceMatchProposalStatus =
  | "open"
  | "accepted"
  | "rejected"
  | "superseded"
  | "retargeted";

export type SynthesisReferenceMatchProposalRecord = {
  proposalId: string;
  kind: SynthesisReferenceMatchProposalKind;
  status: SynthesisReferenceMatchProposalStatus;
  sourceCanonicalReferenceId: string;
  sourceRawReferenceIdsJson?: string;
  targetCanonicalReferenceId?: string;
  targetLibraryId?: number;
  targetItemKey?: string;
  confidence?: string;
  score?: number;
  reasonsJson?: string;
  evidenceJson?: string;
  diagnosticsJson?: string;
  basisHash?: string;
  sourceHash?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisReferenceMatchingStateRecord = {
  referenceHash: string | null;
  matchingHash: string | null;
  proposalCount: number;
  openProposalCount: number;
  matchingReady: boolean;
  graphReady: boolean;
  relatedItemsReady: boolean;
  updatedAt: string;
};

export type SynthesisReferenceMatchingPreparationStatus =
  | "prepared"
  | "applied"
  | "discarded"
  | "superseded"
  | "failed";

export type SynthesisReferenceMatchingPreparationRecord = {
  preparationId: string;
  referenceHash: string | null;
  repositoryBasisHash: string;
  hostBasisHash: string;
  status: SynthesisReferenceMatchingPreparationStatus;
  diagnosticsJson?: string;
  createdAt: string;
  updatedAt: string;
};

export type SynthesisReferenceMatchProposalListArgs = {
  proposalIds?: readonly string[];
  statuses?: readonly SynthesisReferenceMatchProposalStatus[];
  kinds?: readonly SynthesisReferenceMatchProposalKind[];
  confidences?: readonly string[];
  sourceCanonicalReferenceIds?: readonly string[];
  targetCanonicalReferenceIds?: readonly string[];
  cursor?: number;
  limit?: number;
};

export type SynthesisReferenceMatchProposalPage = {
  items: SynthesisReferenceMatchProposalRecord[];
  cursor: number;
  limit: number;
  nextCursor: number | null;
};

const cleanString = (value: unknown) => String(value ?? "").trim();

function required(value: unknown, code: string) {
  const text = cleanString(value);
  if (!text) throw new Error(code);
  return text;
}

function nonNegativeInt(value: unknown, code: string) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(code);
  return parsed;
}

function finiteNumber(value: unknown, code: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(code);
  return parsed;
}

function booleanValue(value: unknown, code: string) {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  throw new Error(code);
}

function boolInt(value: boolean) {
  return value ? 1 : 0;
}

function pageCursor(value: unknown) {
  if (value === undefined) return 0;
  return nonNegativeInt(value, "reference_match_proposal_cursor_invalid");
}

function pageLimit(value: unknown) {
  if (value === undefined)
    return SYNTHESIS_REFERENCE_MATCH_PROPOSAL_PAGE_DEFAULT;
  const limit = nonNegativeInt(value, "reference_match_proposal_limit_invalid");
  if (limit < 1 || limit > SYNTHESIS_REFERENCE_MATCH_PROPOSAL_PAGE_MAX) {
    throw new Error("reference_match_proposal_limit_invalid");
  }
  return limit;
}

function placeholders(
  prefix: string,
  values: readonly string[],
  params: SqlParams,
) {
  return values
    .map((value, index) => {
      const key = `${prefix}_${index}`;
      params[key] = value;
      return `@${key}`;
    })
    .join(", ");
}

function normalizedStrings(values: readonly string[] | undefined) {
  return [...new Set((values ?? []).map(cleanString).filter(Boolean))].sort();
}

export function rebuildSynthesisReferenceMatchProposalKind(
  value: unknown,
): SynthesisReferenceMatchProposalKind {
  if (value === "zotero_binding" || value === "canonical_merge") {
    return value;
  }
  throw new Error("reference_match_proposal_kind_invalid");
}

export function rebuildSynthesisReferenceMatchProposalStatus(
  value: unknown,
): SynthesisReferenceMatchProposalStatus {
  if (
    value === "open" ||
    value === "accepted" ||
    value === "rejected" ||
    value === "superseded" ||
    value === "retargeted"
  ) {
    return value;
  }
  throw new Error("reference_match_proposal_status_invalid");
}

export function rebuildSynthesisReferenceMatchingPreparationStatus(
  value: unknown,
): SynthesisReferenceMatchingPreparationStatus {
  if (
    value === "prepared" ||
    value === "applied" ||
    value === "discarded" ||
    value === "superseded" ||
    value === "failed"
  ) {
    return value;
  }
  throw new Error("reference_matching_preparation_status_invalid");
}

export function rebuildSynthesisReferenceMatchProposalRow(
  row: SqlRow,
): SynthesisReferenceMatchProposalRecord {
  return {
    proposalId: required(
      row.proposal_id,
      "reference_match_proposal_id_invalid",
    ),
    kind: rebuildSynthesisReferenceMatchProposalKind(row.kind),
    status: rebuildSynthesisReferenceMatchProposalStatus(row.status),
    sourceCanonicalReferenceId: required(
      row.source_canonical_reference_id,
      "reference_match_proposal_source_invalid",
    ),
    sourceRawReferenceIdsJson:
      cleanString(row.source_raw_reference_ids_json) || "[]",
    targetCanonicalReferenceId:
      cleanString(row.target_canonical_reference_id) || undefined,
    targetLibraryId:
      row.target_library_id === null || row.target_library_id === undefined
        ? undefined
        : nonNegativeInt(
            row.target_library_id,
            "reference_match_proposal_target_library_invalid",
          ),
    targetItemKey: cleanString(row.target_item_key) || undefined,
    confidence: cleanString(row.confidence) || undefined,
    score:
      row.score === null || row.score === undefined
        ? undefined
        : finiteNumber(row.score, "reference_match_proposal_score_invalid"),
    reasonsJson: cleanString(row.reasons_json) || "[]",
    evidenceJson: cleanString(row.evidence_json) || "{}",
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    basisHash: cleanString(row.basis_hash) || undefined,
    sourceHash: cleanString(row.source_hash) || undefined,
    createdAt: cleanString(row.created_at) || undefined,
    updatedAt: cleanString(row.updated_at) || undefined,
  };
}

export function rebuildSynthesisReferenceMatchingStateRow(
  row: SqlRow,
): SynthesisReferenceMatchingStateRecord {
  return {
    referenceHash: cleanString(row.reference_hash) || null,
    matchingHash: cleanString(row.matching_hash) || null,
    proposalCount: nonNegativeInt(
      row.proposal_count,
      "reference_matching_state_proposal_count_invalid",
    ),
    openProposalCount: nonNegativeInt(
      row.open_proposal_count,
      "reference_matching_state_open_count_invalid",
    ),
    matchingReady: booleanValue(
      row.matching_ready,
      "reference_matching_state_ready_invalid",
    ),
    graphReady: booleanValue(
      row.graph_ready,
      "reference_matching_state_graph_ready_invalid",
    ),
    relatedItemsReady: booleanValue(
      row.related_items_ready,
      "reference_matching_state_related_items_ready_invalid",
    ),
    updatedAt: required(
      row.updated_at,
      "reference_matching_state_updated_at_invalid",
    ),
  };
}

export function rebuildSynthesisReferenceMatchingPreparationRow(
  row: SqlRow,
): SynthesisReferenceMatchingPreparationRecord {
  return {
    preparationId: required(
      row.preparation_id,
      "reference_matching_preparation_id_invalid",
    ),
    referenceHash: cleanString(row.reference_hash) || null,
    repositoryBasisHash: required(
      row.repository_basis_hash,
      "reference_matching_preparation_basis_hash_invalid",
    ),
    hostBasisHash: required(
      row.host_basis_hash,
      "reference_matching_preparation_host_basis_hash_invalid",
    ),
    status: rebuildSynthesisReferenceMatchingPreparationStatus(row.status),
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    createdAt: required(
      row.created_at,
      "reference_matching_preparation_created_at_invalid",
    ),
    updatedAt: required(
      row.updated_at,
      "reference_matching_preparation_updated_at_invalid",
    ),
  };
}

export const SYNTHESIS_REFERENCE_MATCH_PROPOSAL_DDL = [
  `CREATE TABLE IF NOT EXISTS synt_reference_match_proposal (
    proposal_id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    source_canonical_reference_id TEXT NOT NULL,
    source_raw_reference_ids_json TEXT NOT NULL DEFAULT '[]',
    target_canonical_reference_id TEXT NOT NULL DEFAULT '',
    target_library_id INTEGER NOT NULL DEFAULT 0,
    target_item_key TEXT NOT NULL DEFAULT '',
    confidence TEXT NOT NULL DEFAULT '',
    score REAL NOT NULL DEFAULT 0,
    reasons_json TEXT NOT NULL DEFAULT '[]',
    evidence_json TEXT NOT NULL DEFAULT '{}',
    diagnostics_json TEXT NOT NULL DEFAULT '[]',
    basis_hash TEXT NOT NULL DEFAULT '',
    source_hash TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_synt_reference_match_proposal_status
    ON synt_reference_match_proposal(status, kind, updated_at DESC, proposal_id ASC)`,
  `CREATE INDEX IF NOT EXISTS idx_synt_reference_match_proposal_source
    ON synt_reference_match_proposal(source_canonical_reference_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_synt_reference_match_proposal_target
    ON synt_reference_match_proposal(target_canonical_reference_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_synt_reference_match_proposal_basis
    ON synt_reference_match_proposal(kind, basis_hash, source_hash, status)`,
] as const;

export const SYNTHESIS_REFERENCE_MATCHING_REVIEW_DDL = [
  `CREATE TABLE IF NOT EXISTS synt_reference_matching_state (
    singleton_id INTEGER PRIMARY KEY CHECK (singleton_id=1),
    reference_hash TEXT NOT NULL DEFAULT '',
    matching_hash TEXT NOT NULL DEFAULT '',
    proposal_count INTEGER NOT NULL,
    open_proposal_count INTEGER NOT NULL,
    matching_ready INTEGER NOT NULL,
    graph_ready INTEGER NOT NULL,
    related_items_ready INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS synt_reference_matching_preparation (
    preparation_id TEXT PRIMARY KEY,
    reference_hash TEXT NOT NULL DEFAULT '',
    repository_basis_hash TEXT NOT NULL,
    host_basis_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    diagnostics_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_synt_reference_matching_preparation_status
    ON synt_reference_matching_preparation(status, updated_at DESC, preparation_id ASC)`,
  ...SYNTHESIS_REFERENCE_MATCH_PROPOSAL_DDL,
] as const;

export function ensureSynthesisReferenceMatchingReviewRepositorySchema(
  db: SqlAdapter,
) {
  for (const sql of SYNTHESIS_REFERENCE_MATCHING_REVIEW_DDL) db.run(sql);
  db.run(
    `INSERT OR IGNORE INTO synt_schema_meta (key, value)
     VALUES (@meta_key, @meta_value)`,
    {
      meta_key: SYNTHESIS_REFERENCE_MATCHING_REVIEW_REPOSITORY_SCHEMA_META_KEY,
      meta_value: SYNTHESIS_REFERENCE_MATCHING_REVIEW_REPOSITORY_SCHEMA_VERSION,
    },
  );
  const row = db.get(`SELECT value FROM synt_schema_meta WHERE key=@meta_key`, {
    meta_key: SYNTHESIS_REFERENCE_MATCHING_REVIEW_REPOSITORY_SCHEMA_META_KEY,
  });
  if (
    cleanString(row?.value) !==
    SYNTHESIS_REFERENCE_MATCHING_REVIEW_REPOSITORY_SCHEMA_VERSION
  ) {
    throw new Error("reference_matching_review_repository_schema_mismatch");
  }
}

export function getSynthesisReferenceMatchingState(db: SqlAdapter) {
  const row = db.get(
    "SELECT * FROM synt_reference_matching_state WHERE singleton_id=1",
  );
  return row ? rebuildSynthesisReferenceMatchingStateRow(row) : null;
}

export function replaceSynthesisReferenceMatchingState(
  db: SqlAdapter,
  record: SynthesisReferenceMatchingStateRecord,
) {
  const rebuilt = rebuildSynthesisReferenceMatchingStateRow({
    reference_hash: record.referenceHash ?? "",
    matching_hash: record.matchingHash ?? "",
    proposal_count: record.proposalCount,
    open_proposal_count: record.openProposalCount,
    matching_ready: boolInt(record.matchingReady),
    graph_ready: boolInt(record.graphReady),
    related_items_ready: boolInt(record.relatedItemsReady),
    updated_at: record.updatedAt,
  });
  db.run(
    `INSERT OR REPLACE INTO synt_reference_matching_state (
      singleton_id, reference_hash, matching_hash, proposal_count,
      open_proposal_count, matching_ready, graph_ready, related_items_ready,
      updated_at
    ) VALUES (
      1, @reference_hash, @matching_hash, @proposal_count,
      @open_proposal_count, @matching_ready, @graph_ready,
      @related_items_ready, @updated_at
    )`,
    {
      reference_hash: rebuilt.referenceHash ?? "",
      matching_hash: rebuilt.matchingHash ?? "",
      proposal_count: rebuilt.proposalCount,
      open_proposal_count: rebuilt.openProposalCount,
      matching_ready: boolInt(rebuilt.matchingReady),
      graph_ready: boolInt(rebuilt.graphReady),
      related_items_ready: boolInt(rebuilt.relatedItemsReady),
      updated_at: rebuilt.updatedAt,
    },
  );
  return rebuilt;
}

export function getSynthesisReferenceMatchingPreparation(
  db: SqlAdapter,
  preparationId: string,
) {
  const id = required(
    preparationId,
    "reference_matching_preparation_id_invalid",
  );
  const row = db.get(
    `SELECT * FROM synt_reference_matching_preparation
     WHERE preparation_id=@preparation_id`,
    { preparation_id: id },
  );
  return row ? rebuildSynthesisReferenceMatchingPreparationRow(row) : null;
}

export function upsertSynthesisReferenceMatchingPreparation(
  db: SqlAdapter,
  record: SynthesisReferenceMatchingPreparationRecord,
) {
  const rebuilt = rebuildSynthesisReferenceMatchingPreparationRow({
    preparation_id: record.preparationId,
    reference_hash: record.referenceHash ?? "",
    repository_basis_hash: record.repositoryBasisHash,
    host_basis_hash: record.hostBasisHash,
    status: record.status,
    diagnostics_json: record.diagnosticsJson ?? "[]",
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  });
  db.run(
    `INSERT OR REPLACE INTO synt_reference_matching_preparation (
      preparation_id, reference_hash, repository_basis_hash, host_basis_hash, status,
      diagnostics_json, created_at, updated_at
    ) VALUES (
      @preparation_id, @reference_hash, @repository_basis_hash, @host_basis_hash, @status,
      @diagnostics_json, @created_at, @updated_at
    )`,
    {
      preparation_id: rebuilt.preparationId,
      reference_hash: rebuilt.referenceHash ?? "",
      repository_basis_hash: rebuilt.repositoryBasisHash,
      host_basis_hash: rebuilt.hostBasisHash,
      status: rebuilt.status,
      diagnostics_json: rebuilt.diagnosticsJson ?? "[]",
      created_at: rebuilt.createdAt,
      updated_at: rebuilt.updatedAt,
    },
  );
  return rebuilt;
}

export function updateSynthesisReferenceMatchingPreparationStatus(
  db: SqlAdapter,
  args: {
    preparationId: string;
    status: SynthesisReferenceMatchingPreparationStatus;
    updatedAt: string;
    diagnosticsJson?: string;
  },
) {
  const current = getSynthesisReferenceMatchingPreparation(
    db,
    args.preparationId,
  );
  if (!current) return null;
  return upsertSynthesisReferenceMatchingPreparation(db, {
    ...current,
    status: rebuildSynthesisReferenceMatchingPreparationStatus(args.status),
    diagnosticsJson: args.diagnosticsJson ?? current.diagnosticsJson,
    updatedAt: required(
      args.updatedAt,
      "reference_matching_preparation_updated_at_invalid",
    ),
  });
}

export function deleteSynthesisReferenceMatchingPreparation(
  db: SqlAdapter,
  preparationId: string,
) {
  db.run(
    `DELETE FROM synt_reference_matching_preparation
     WHERE preparation_id=@preparation_id`,
    {
      preparation_id: required(
        preparationId,
        "reference_matching_preparation_id_invalid",
      ),
    },
  );
}

export function reconcileSynthesisReferenceMatchingPreparations(
  db: SqlAdapter,
  timestamp: string,
) {
  db.run(
    `UPDATE synt_reference_matching_preparation
     SET status='superseded', updated_at=@updated_at
     WHERE status='prepared'`,
    {
      updated_at: required(
        timestamp,
        "reference_matching_preparation_timestamp_invalid",
      ),
    },
  );
}

export function getSynthesisReferenceMatchProposal(
  db: SqlAdapter,
  proposalId: string,
) {
  const row = db.get(
    `SELECT * FROM synt_reference_match_proposal WHERE proposal_id=@proposal_id`,
    {
      proposal_id: required(proposalId, "reference_match_proposal_id_invalid"),
    },
  );
  return row ? rebuildSynthesisReferenceMatchProposalRow(row) : null;
}

export function upsertSynthesisReferenceMatchProposal(
  db: SqlAdapter,
  record: SynthesisReferenceMatchProposalRecord,
  timestamp: string,
) {
  const now = required(timestamp, "reference_match_proposal_timestamp_invalid");
  const rebuilt = rebuildSynthesisReferenceMatchProposalRow({
    proposal_id: record.proposalId,
    kind: record.kind,
    status: record.status,
    source_canonical_reference_id: record.sourceCanonicalReferenceId,
    source_raw_reference_ids_json: record.sourceRawReferenceIdsJson ?? "[]",
    target_canonical_reference_id: record.targetCanonicalReferenceId ?? "",
    target_library_id: record.targetLibraryId ?? 0,
    target_item_key: record.targetItemKey ?? "",
    confidence: record.confidence ?? "",
    score: record.score ?? 0,
    reasons_json: record.reasonsJson ?? "[]",
    evidence_json: record.evidenceJson ?? "{}",
    diagnostics_json: record.diagnosticsJson ?? "[]",
    basis_hash: record.basisHash ?? "",
    source_hash: record.sourceHash ?? "",
    created_at: record.createdAt ?? now,
    updated_at: record.updatedAt ?? now,
  });
  db.run(
    `INSERT INTO synt_reference_match_proposal (
      proposal_id, kind, status, source_canonical_reference_id,
      source_raw_reference_ids_json, target_canonical_reference_id,
      target_library_id, target_item_key, confidence, score, reasons_json,
      evidence_json, diagnostics_json, basis_hash, source_hash, created_at,
      updated_at
    ) VALUES (
      @proposal_id, @kind, @status, @source_canonical_reference_id,
      @source_raw_reference_ids_json, @target_canonical_reference_id,
      @target_library_id, @target_item_key, @confidence, @score, @reasons_json,
      @evidence_json, @diagnostics_json, @basis_hash, @source_hash, @created_at,
      @updated_at
    ) ON CONFLICT(proposal_id) DO UPDATE SET
      kind=excluded.kind,
      status=excluded.status,
      source_canonical_reference_id=excluded.source_canonical_reference_id,
      source_raw_reference_ids_json=excluded.source_raw_reference_ids_json,
      target_canonical_reference_id=excluded.target_canonical_reference_id,
      target_library_id=excluded.target_library_id,
      target_item_key=excluded.target_item_key,
      confidence=excluded.confidence,
      score=excluded.score,
      reasons_json=excluded.reasons_json,
      evidence_json=excluded.evidence_json,
      diagnostics_json=excluded.diagnostics_json,
      basis_hash=excluded.basis_hash,
      source_hash=excluded.source_hash,
      updated_at=excluded.updated_at`,
    {
      proposal_id: rebuilt.proposalId,
      kind: rebuilt.kind,
      status: rebuilt.status,
      source_canonical_reference_id: rebuilt.sourceCanonicalReferenceId,
      source_raw_reference_ids_json: rebuilt.sourceRawReferenceIdsJson ?? "[]",
      target_canonical_reference_id: rebuilt.targetCanonicalReferenceId ?? "",
      target_library_id: rebuilt.targetLibraryId ?? 0,
      target_item_key: rebuilt.targetItemKey ?? "",
      confidence: rebuilt.confidence ?? "",
      score: rebuilt.score ?? 0,
      reasons_json: rebuilt.reasonsJson ?? "[]",
      evidence_json: rebuilt.evidenceJson ?? "{}",
      diagnostics_json: rebuilt.diagnosticsJson ?? "[]",
      basis_hash: rebuilt.basisHash ?? "",
      source_hash: rebuilt.sourceHash ?? "",
      created_at: rebuilt.createdAt ?? now,
      updated_at: rebuilt.updatedAt ?? now,
    },
  );
  return getSynthesisReferenceMatchProposal(db, rebuilt.proposalId) ?? rebuilt;
}

function buildProposalListQuery(args: SynthesisReferenceMatchProposalListArgs) {
  const params: SqlParams = {};
  const clauses: string[] = [];
  const addFilter = (
    column: string,
    prefix: string,
    values: readonly string[],
  ) => {
    if (!values.length) return;
    clauses.push(`${column} IN (${placeholders(prefix, values, params)})`);
  };
  addFilter("proposal_id", "proposal_id", normalizedStrings(args.proposalIds));
  addFilter(
    "status",
    "status",
    normalizedStrings(args.statuses).map(
      rebuildSynthesisReferenceMatchProposalStatus,
    ),
  );
  addFilter(
    "kind",
    "kind",
    normalizedStrings(args.kinds).map(
      rebuildSynthesisReferenceMatchProposalKind,
    ),
  );
  addFilter("confidence", "confidence", normalizedStrings(args.confidences));
  addFilter(
    "source_canonical_reference_id",
    "source_id",
    normalizedStrings(args.sourceCanonicalReferenceIds),
  );
  addFilter(
    "target_canonical_reference_id",
    "target_id",
    normalizedStrings(args.targetCanonicalReferenceIds),
  );
  const cursor = pageCursor(args.cursor);
  const limit = pageLimit(args.limit);
  params.limit = limit + 1;
  params.cursor = cursor;
  return {
    cursor,
    limit,
    params,
    where: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
  };
}

export function listSynthesisReferenceMatchProposalPage(
  db: SqlAdapter,
  args: SynthesisReferenceMatchProposalListArgs = {},
): SynthesisReferenceMatchProposalPage {
  const query = buildProposalListQuery(args);
  const rows = db
    .all(
      `SELECT * FROM synt_reference_match_proposal${query.where}
       ORDER BY updated_at DESC, proposal_id ASC
       LIMIT @limit OFFSET @cursor`,
      query.params,
    )
    .map(rebuildSynthesisReferenceMatchProposalRow);
  const hasMore = rows.length > query.limit;
  const items = rows.slice(0, query.limit);
  return {
    items,
    cursor: query.cursor,
    limit: query.limit,
    nextCursor: hasMore ? query.cursor + items.length : null,
  };
}

export function listSynthesisReferenceMatchProposals(
  db: SqlAdapter,
  args: SynthesisReferenceMatchProposalListArgs = {},
) {
  return listSynthesisReferenceMatchProposalPage(db, args).items;
}

export function updateSynthesisReferenceMatchProposalStatus(
  db: SqlAdapter,
  args: {
    proposalId: string;
    status: SynthesisReferenceMatchProposalStatus;
    timestamp: string;
  },
) {
  const current = getSynthesisReferenceMatchProposal(db, args.proposalId);
  if (!current) return null;
  return upsertSynthesisReferenceMatchProposal(
    db,
    {
      ...current,
      status: rebuildSynthesisReferenceMatchProposalStatus(args.status),
      updatedAt: required(
        args.timestamp,
        "reference_match_proposal_timestamp_invalid",
      ),
    },
    args.timestamp,
  );
}

export function hasRejectedSynthesisReferenceMatchProposal(
  db: SqlAdapter,
  args: {
    kind: SynthesisReferenceMatchProposalKind;
    basisHash: string;
    sourceHash: string;
  },
) {
  const row = db.get(
    `SELECT proposal_id FROM synt_reference_match_proposal
     WHERE kind=@kind AND basis_hash=@basis_hash AND source_hash=@source_hash
       AND status='rejected'
     ORDER BY updated_at DESC, proposal_id ASC
     LIMIT 1`,
    {
      kind: rebuildSynthesisReferenceMatchProposalKind(args.kind),
      basis_hash: required(
        args.basisHash,
        "reference_match_proposal_basis_hash_invalid",
      ),
      source_hash: required(
        args.sourceHash,
        "reference_match_proposal_source_hash_invalid",
      ),
    },
  );
  return Boolean(row);
}

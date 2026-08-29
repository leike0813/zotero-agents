import type { SqlAdapter, SqlParams, SqlRow } from "./index.js";

export const SYNTHESIS_REFERENCE_REFRESH_REPOSITORY_SCHEMA_VERSION =
  "synthesis-reference-refresh-repository.v1" as const;
export const SYNTHESIS_REFERENCE_REFRESH_REPOSITORY_SCHEMA_META_KEY =
  "reference_refresh_application_schema_version" as const;

export const SYNTHESIS_REFERENCE_REFRESH_REPOSITORY_TABLES = [
  "synt_reference_application_state",
  "synt_reference_source",
  "synt_reference_artifact",
  "synt_reference_raw",
  "synt_reference_canonical",
  "synt_reference_redirect",
  "synt_reference_binding",
  "synt_reference_revision_review",
  "synt_literature_matching_metadata",
] as const;

export const SYNTHESIS_REFERENCE_REFRESH_REPOSITORY_INDEXES = [
  "idx_synt_reference_artifact_source",
  "idx_synt_reference_raw_source",
  "idx_synt_reference_raw_canonical",
  "idx_synt_reference_binding_canonical",
  "idx_synt_reference_revision_review_status",
  "idx_synt_literature_matching_metadata_updated",
] as const;

export type SynthesisReferenceApplicationStateRecord = {
  referenceHash: string;
  inputHash: string;
  sourceCount: number;
  referenceCount: number;
  canonicalCount: number;
  bindingCount: number;
  referenceReady: boolean;
  graphReady: boolean;
  relatedItemsReady: boolean;
  updatedAt: string;
};

export type SynthesisReferenceSourceRecord = {
  paperRef: string;
  libraryId: number;
  itemKey: string;
  title: string;
  year: string;
  metadataHash: string;
  summaryJson: string;
  updatedAt: string;
};

export type SynthesisReferenceArtifactRecord = {
  paperRef: string;
  artifactType:
    | "digest"
    | "references"
    | "citation_analysis"
    | "literature_score";
  payloadType: string;
  status: string;
  locator: string;
  payloadHash: string;
  diagnosticsJson: string;
  updatedAt: string;
};

export type SynthesisRawReferenceRecord = {
  rawReferenceId: string;
  sourceRef: string;
  referencesArtifactHash: string;
  referenceIndex: number;
  rawHash: string;
  parsedTitle?: string;
  normalizedTitle?: string;
  year?: string;
  authorsJson?: string;
  rawReference?: string;
  canonicalReferenceId?: string;
  status?: "active" | "stale" | "parse_error" | string;
  rolesJson?: string;
  diagnosticsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisRawReferenceStaleResult = {
  staleCount: number;
  staleRawReferences: SynthesisRawReferenceRecord[];
  canonicalReferenceIds: string[];
};

export type SynthesisCanonicalReferenceRecord = {
  canonicalReferenceId: string;
  title?: string;
  normalizedTitle?: string;
  year?: string;
  authorsJson?: string;
  identifiersJson?: string;
  metadataHash?: string;
  status?: "active" | "merged" | "stale" | string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisCanonicalReferenceRedirectRecord = {
  fromCanonicalReferenceId: string;
  toCanonicalReferenceId: string;
  reason?: string;
  diagnosticsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisReferenceBindingRecord = {
  bindingId: string;
  canonicalReferenceId: string;
  libraryId: number;
  itemKey: string;
  status: "accepted" | "candidate" | "rejected" | "stale_target";
  confidence?: string;
  reviewer?: string;
  basisHash?: string;
  diagnosticsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisArtifactSidecarRecord = {
  sourceRef: string;
  libraryId: number;
  itemKey: string;
  artifactType: "digest" | "references" | "citation_analysis" | string;
  status: "available" | "missing" | "decode_error" | "unsupported" | string;
  artifactHash?: string;
  locatorJson?: string;
  diagnosticsJson?: string;
  scannedAt?: string;
  updatedAt?: string;
};

export type SynthesisReferenceRevisionReviewRecord = {
  reviewId: string;
  sourceRef: string;
  canonicalReferenceId: string;
  status: string;
  reason: string;
  payloadJson: string;
  createdAt: string;
  updatedAt: string;
};

const cleanString = (value: unknown) => String(value ?? "").trim();
const nonNegativeInt = (value: unknown) => {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};
const booleanValue = (value: unknown) => Number(value) === 1;

function required(value: unknown, code: string) {
  const text = cleanString(value);
  if (!text) throw new Error(code);
  return text;
}

function boolInt(value: boolean) {
  return value ? 1 : 0;
}

function placeholders(prefix: string, values: readonly string[]) {
  const params: SqlParams = {};
  const sql = values.map((value, index) => {
    const key = `${prefix}_${index}`;
    params[key] = value;
    return `@${key}`;
  });
  return { sql: sql.join(", "), params };
}

export function rebuildSynthesisReferenceApplicationStateRow(
  row: SqlRow,
): SynthesisReferenceApplicationStateRecord {
  return {
    referenceHash: required(row.reference_hash, "reference_state_hash_invalid"),
    inputHash: required(row.input_hash, "reference_state_input_hash_invalid"),
    sourceCount: nonNegativeInt(row.source_count),
    referenceCount: nonNegativeInt(row.reference_count),
    canonicalCount: nonNegativeInt(row.canonical_count),
    bindingCount: nonNegativeInt(row.binding_count),
    referenceReady: booleanValue(row.reference_ready),
    graphReady: booleanValue(row.graph_ready),
    relatedItemsReady: booleanValue(row.related_items_ready),
    updatedAt: cleanString(row.updated_at),
  };
}

export function rebuildSynthesisReferenceSourceRow(
  row: SqlRow,
): SynthesisReferenceSourceRecord {
  return {
    paperRef: required(row.paper_ref, "reference_source_ref_invalid"),
    libraryId: nonNegativeInt(row.library_id),
    itemKey: required(row.item_key, "reference_source_item_invalid"),
    title: cleanString(row.title),
    year: cleanString(row.year),
    metadataHash: cleanString(row.metadata_hash),
    summaryJson: required(row.summary_json, "reference_source_summary_invalid"),
    updatedAt: cleanString(row.updated_at),
  };
}

export function rebuildSynthesisReferenceArtifactRow(
  row: SqlRow,
): SynthesisReferenceArtifactRecord {
  const artifactType = cleanString(row.artifact_type);
  if (
    artifactType !== "digest" &&
    artifactType !== "references" &&
    artifactType !== "citation_analysis" &&
    artifactType !== "literature_score"
  ) {
    throw new Error("reference_artifact_type_invalid");
  }
  return {
    paperRef: required(row.paper_ref, "reference_artifact_source_invalid"),
    artifactType,
    payloadType: cleanString(row.payload_type),
    status: cleanString(row.status),
    locator: cleanString(row.locator),
    payloadHash: cleanString(row.payload_hash),
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    updatedAt: cleanString(row.updated_at),
  };
}

export function rebuildSynthesisRawReferenceRow(
  row: SqlRow,
): SynthesisRawReferenceRecord {
  return {
    rawReferenceId: required(row.raw_reference_id, "raw_reference_id_invalid"),
    sourceRef: required(row.source_ref, "raw_reference_source_invalid"),
    referencesArtifactHash: cleanString(row.references_artifact_hash),
    referenceIndex: nonNegativeInt(row.reference_index),
    rawHash: cleanString(row.raw_hash),
    parsedTitle: cleanString(row.parsed_title),
    normalizedTitle: cleanString(row.normalized_title),
    year: cleanString(row.year),
    authorsJson: cleanString(row.authors_json) || "[]",
    rawReference: cleanString(row.raw_reference),
    canonicalReferenceId: cleanString(row.canonical_reference_id),
    status: cleanString(row.status) || "active",
    rolesJson: cleanString(row.roles_json) || "[]",
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at),
  };
}

export function rebuildSynthesisCanonicalReferenceRow(
  row: SqlRow,
): SynthesisCanonicalReferenceRecord {
  return {
    canonicalReferenceId: required(
      row.canonical_reference_id,
      "canonical_reference_id_invalid",
    ),
    title: cleanString(row.title),
    normalizedTitle: cleanString(row.normalized_title),
    year: cleanString(row.year),
    authorsJson: cleanString(row.authors_json) || "[]",
    identifiersJson: cleanString(row.identifiers_json) || "{}",
    metadataHash: cleanString(row.metadata_hash),
    status: cleanString(row.status) || "active",
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at),
  };
}

export function rebuildSynthesisReferenceBindingRow(
  row: SqlRow,
): SynthesisReferenceBindingRecord {
  const status = cleanString(row.status);
  if (
    status !== "accepted" &&
    status !== "candidate" &&
    status !== "rejected" &&
    status !== "stale_target"
  ) {
    throw new Error("reference_binding_status_invalid");
  }
  return {
    bindingId: required(row.binding_id, "reference_binding_id_invalid"),
    canonicalReferenceId: required(
      row.canonical_reference_id,
      "reference_binding_canonical_invalid",
    ),
    libraryId: nonNegativeInt(row.library_id),
    itemKey: cleanString(row.item_key),
    status,
    confidence: cleanString(row.confidence),
    reviewer: cleanString(row.reviewer),
    basisHash: cleanString(row.basis_hash),
    diagnosticsJson: cleanString(row.diagnostics_json) || "[]",
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at),
  };
}

export function ensureSynthesisReferenceRefreshRepositorySchema(
  db: SqlAdapter,
) {
  db.run(`CREATE TABLE IF NOT EXISTS synt_reference_application_state (
    singleton_id INTEGER PRIMARY KEY CHECK (singleton_id=1),
    reference_hash TEXT NOT NULL, input_hash TEXT NOT NULL,
    source_count INTEGER NOT NULL, reference_count INTEGER NOT NULL,
    canonical_count INTEGER NOT NULL, binding_count INTEGER NOT NULL,
    reference_ready INTEGER NOT NULL, graph_ready INTEGER NOT NULL,
    related_items_ready INTEGER NOT NULL, updated_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_reference_source (
    paper_ref TEXT PRIMARY KEY, library_id INTEGER NOT NULL, item_key TEXT NOT NULL,
    title TEXT NOT NULL, year TEXT NOT NULL, metadata_hash TEXT NOT NULL,
    summary_json TEXT NOT NULL, updated_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_reference_artifact (
    paper_ref TEXT NOT NULL, artifact_type TEXT NOT NULL, payload_type TEXT NOT NULL,
    status TEXT NOT NULL, locator TEXT NOT NULL, payload_hash TEXT NOT NULL,
    diagnostics_json TEXT NOT NULL, updated_at TEXT NOT NULL,
    PRIMARY KEY (paper_ref, artifact_type)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_reference_raw (
    raw_reference_id TEXT PRIMARY KEY, source_ref TEXT NOT NULL,
    references_artifact_hash TEXT NOT NULL, reference_index INTEGER NOT NULL,
    raw_hash TEXT NOT NULL, parsed_title TEXT NOT NULL, normalized_title TEXT NOT NULL,
    year TEXT NOT NULL, authors_json TEXT NOT NULL, raw_reference TEXT NOT NULL,
    canonical_reference_id TEXT NOT NULL, status TEXT NOT NULL,
    roles_json TEXT NOT NULL, diagnostics_json TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_reference_canonical (
    canonical_reference_id TEXT PRIMARY KEY, title TEXT NOT NULL,
    normalized_title TEXT NOT NULL, year TEXT NOT NULL, authors_json TEXT NOT NULL,
    identifiers_json TEXT NOT NULL, metadata_hash TEXT NOT NULL, status TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_reference_redirect (
    from_canonical_reference_id TEXT PRIMARY KEY,
    to_canonical_reference_id TEXT NOT NULL, reason TEXT NOT NULL,
    diagnostics_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_reference_binding (
    binding_id TEXT PRIMARY KEY, canonical_reference_id TEXT NOT NULL,
    library_id INTEGER NOT NULL, item_key TEXT NOT NULL, status TEXT NOT NULL,
    confidence TEXT NOT NULL, reviewer TEXT NOT NULL, basis_hash TEXT NOT NULL,
    diagnostics_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_reference_revision_review (
    review_id TEXT PRIMARY KEY, source_ref TEXT NOT NULL,
    canonical_reference_id TEXT NOT NULL, status TEXT NOT NULL, reason TEXT NOT NULL,
    payload_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_literature_matching_metadata (
    literature_item_id TEXT PRIMARY KEY,
    schema_id TEXT NOT NULL DEFAULT 'literature_matching_metadata.v1',
    key_terms_json TEXT NOT NULL DEFAULT '[]', methods_json TEXT NOT NULL DEFAULT '[]',
    problems_json TEXT NOT NULL DEFAULT '[]', datasets_json TEXT NOT NULL DEFAULT '[]',
    exclude_terms_json TEXT NOT NULL DEFAULT '[]', source_artifact_hash TEXT NOT NULL DEFAULT '',
    metadata_hash TEXT NOT NULL DEFAULT '', diagnostics_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT ''
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_synt_reference_artifact_source
    ON synt_reference_artifact(paper_ref, artifact_type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_synt_reference_raw_source
    ON synt_reference_raw(source_ref, reference_index)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_synt_reference_raw_canonical
    ON synt_reference_raw(canonical_reference_id, status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_synt_reference_binding_canonical
    ON synt_reference_binding(canonical_reference_id, status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_synt_reference_revision_review_status
    ON synt_reference_revision_review(status, updated_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_synt_literature_matching_metadata_updated
    ON synt_literature_matching_metadata(updated_at DESC)`);
  db.run(
    `INSERT OR IGNORE INTO synt_schema_meta (key, value)
     VALUES (@meta_key, @meta_value)`,
    {
      meta_key: SYNTHESIS_REFERENCE_REFRESH_REPOSITORY_SCHEMA_META_KEY,
      meta_value: SYNTHESIS_REFERENCE_REFRESH_REPOSITORY_SCHEMA_VERSION,
    },
  );
  const row = db.get(`SELECT value FROM synt_schema_meta WHERE key=@meta_key`, {
    meta_key: SYNTHESIS_REFERENCE_REFRESH_REPOSITORY_SCHEMA_META_KEY,
  });
  if (
    cleanString(row?.value) !==
    SYNTHESIS_REFERENCE_REFRESH_REPOSITORY_SCHEMA_VERSION
  ) {
    throw new Error("reference_refresh_repository_schema_mismatch");
  }
}

export function getSynthesisReferenceApplicationState(db: SqlAdapter) {
  const row = db.get(
    "SELECT * FROM synt_reference_application_state WHERE singleton_id=1",
  );
  return row ? rebuildSynthesisReferenceApplicationStateRow(row) : null;
}

export function listSynthesisReferenceSources(db: SqlAdapter) {
  return db
    .all("SELECT * FROM synt_reference_source ORDER BY paper_ref ASC")
    .map(rebuildSynthesisReferenceSourceRow);
}

export function listSynthesisReferenceArtifacts(
  db: SqlAdapter,
  sourceRefs?: string[],
) {
  if (sourceRefs && !sourceRefs.length) return [];
  const selected = sourceRefs?.length
    ? placeholders("source", sourceRefs)
    : null;
  return db
    .all(
      `SELECT * FROM synt_reference_artifact${
        selected ? ` WHERE paper_ref IN (${selected.sql})` : ""
      } ORDER BY paper_ref ASC, artifact_type ASC`,
      selected?.params,
    )
    .map(rebuildSynthesisReferenceArtifactRow);
}

export function listSynthesisRawReferences(db: SqlAdapter) {
  return db
    .all(
      "SELECT * FROM synt_reference_raw ORDER BY source_ref ASC, reference_index ASC, raw_reference_id ASC",
    )
    .map(rebuildSynthesisRawReferenceRow);
}

export function listSynthesisCanonicalReferences(db: SqlAdapter) {
  return db
    .all(
      "SELECT * FROM synt_reference_canonical ORDER BY canonical_reference_id ASC",
    )
    .map(rebuildSynthesisCanonicalReferenceRow);
}

export function listSynthesisReferenceBindings(db: SqlAdapter) {
  return db
    .all("SELECT * FROM synt_reference_binding ORDER BY binding_id ASC")
    .map(rebuildSynthesisReferenceBindingRow);
}

export type SynthesisReferenceProjectionReplacement = {
  expectedReferenceHash: string | null;
  referenceHash: string;
  inputHash: string;
  scope: "full" | "sources";
  sourceRefs: string[];
  replaceReferenceSourceRefs: string[];
  sources: SynthesisReferenceSourceRecord[];
  artifacts: SynthesisReferenceArtifactRecord[];
  rawReferences: SynthesisRawReferenceRecord[];
  canonicals: SynthesisCanonicalReferenceRecord[];
  bindings: SynthesisReferenceBindingRecord[];
  reviews: SynthesisReferenceRevisionReviewRecord[];
  graphFactsChanged: boolean;
  now: string;
};

function deleteForSources(
  db: SqlAdapter,
  table: string,
  column: string,
  values: string[],
) {
  if (!values.length) return;
  const selected = placeholders("delete_source", values);
  db.run(
    `DELETE FROM ${table} WHERE ${column} IN (${selected.sql})`,
    selected.params,
  );
}

export function replaceSynthesisReferenceProjection(
  db: SqlAdapter,
  args: SynthesisReferenceProjectionReplacement,
) {
  return db.transaction(() => {
    const current = getSynthesisReferenceApplicationState(db);
    if ((current?.referenceHash ?? null) !== args.expectedReferenceHash) {
      return false;
    }
    if (args.scope === "full") {
      if (args.sourceRefs.length) {
        const retained = placeholders("retained_source", args.sourceRefs);
        db.run(
          `DELETE FROM synt_reference_artifact WHERE paper_ref NOT IN (${retained.sql})`,
          retained.params,
        );
        db.run(
          `DELETE FROM synt_reference_raw WHERE source_ref NOT IN (${retained.sql})`,
          retained.params,
        );
        db.run(
          `DELETE FROM synt_reference_source WHERE paper_ref NOT IN (${retained.sql})`,
          retained.params,
        );
      } else {
        db.run("DELETE FROM synt_reference_artifact");
        db.run("DELETE FROM synt_reference_raw");
        db.run("DELETE FROM synt_reference_source");
      }
    }
    deleteForSources(
      db,
      "synt_reference_raw",
      "source_ref",
      args.replaceReferenceSourceRefs,
    );
    for (const row of args.sources) {
      db.run(
        `INSERT OR REPLACE INTO synt_reference_source (
          paper_ref, library_id, item_key, title, year, metadata_hash,
          summary_json, updated_at
        ) VALUES (
          @paper_ref, @library_id, @item_key, @title, @year, @metadata_hash,
          @summary_json, @updated_at
        )`,
        {
          paper_ref: row.paperRef,
          library_id: row.libraryId,
          item_key: row.itemKey,
          title: row.title,
          year: row.year,
          metadata_hash: row.metadataHash,
          summary_json: row.summaryJson,
          updated_at: row.updatedAt,
        },
      );
    }
    for (const row of args.artifacts) {
      db.run(
        `INSERT OR REPLACE INTO synt_reference_artifact (
          paper_ref, artifact_type, payload_type, status, locator,
          payload_hash, diagnostics_json, updated_at
        ) VALUES (
          @paper_ref, @artifact_type, @payload_type, @status, @locator,
          @payload_hash, @diagnostics_json, @updated_at
        )`,
        {
          paper_ref: row.paperRef,
          artifact_type: row.artifactType,
          payload_type: row.payloadType,
          status: row.status,
          locator: row.locator,
          payload_hash: row.payloadHash,
          diagnostics_json: row.diagnosticsJson,
          updated_at: row.updatedAt,
        },
      );
    }
    for (const row of args.canonicals) {
      db.run(
        `INSERT OR IGNORE INTO synt_reference_canonical (
          canonical_reference_id, title, normalized_title, year, authors_json,
          identifiers_json, metadata_hash, status, created_at, updated_at
        ) VALUES (
          @canonical_reference_id, @title, @normalized_title, @year, @authors_json,
          @identifiers_json, @metadata_hash, @status, @created_at, @updated_at
        )`,
        {
          canonical_reference_id: row.canonicalReferenceId,
          title: row.title,
          normalized_title: row.normalizedTitle,
          year: row.year,
          authors_json: row.authorsJson,
          identifiers_json: row.identifiersJson,
          metadata_hash: row.metadataHash,
          status: row.status,
          created_at: row.createdAt,
          updated_at: row.updatedAt,
        },
      );
    }
    for (const row of args.rawReferences) {
      db.run(
        `INSERT INTO synt_reference_raw (
          raw_reference_id, source_ref, references_artifact_hash,
          reference_index, raw_hash, parsed_title, normalized_title, year,
          authors_json, raw_reference, canonical_reference_id, status,
          roles_json, diagnostics_json, created_at, updated_at
        ) VALUES (
          @raw_reference_id, @source_ref, @references_artifact_hash,
          @reference_index, @raw_hash, @parsed_title, @normalized_title, @year,
          @authors_json, @raw_reference, @canonical_reference_id, @status,
          @roles_json, @diagnostics_json, @created_at, @updated_at
        )`,
        {
          raw_reference_id: row.rawReferenceId,
          source_ref: row.sourceRef,
          references_artifact_hash: row.referencesArtifactHash,
          reference_index: row.referenceIndex,
          raw_hash: row.rawHash,
          parsed_title: row.parsedTitle,
          normalized_title: row.normalizedTitle,
          year: row.year,
          authors_json: row.authorsJson,
          raw_reference: row.rawReference,
          canonical_reference_id: row.canonicalReferenceId,
          status: row.status,
          roles_json: row.rolesJson,
          diagnostics_json: row.diagnosticsJson,
          created_at: row.createdAt,
          updated_at: row.updatedAt,
        },
      );
    }
    for (const row of args.bindings) {
      db.run(
        `INSERT OR IGNORE INTO synt_reference_binding (
          binding_id, canonical_reference_id, library_id, item_key, status,
          confidence, reviewer, basis_hash, diagnostics_json, created_at, updated_at
        ) VALUES (
          @binding_id, @canonical_reference_id, @library_id, @item_key, @status,
          @confidence, @reviewer, @basis_hash, @diagnostics_json, @created_at, @updated_at
        )`,
        {
          binding_id: row.bindingId,
          canonical_reference_id: row.canonicalReferenceId,
          library_id: row.libraryId,
          item_key: row.itemKey,
          status: row.status,
          confidence: row.confidence,
          reviewer: row.reviewer,
          basis_hash: row.basisHash,
          diagnostics_json: row.diagnosticsJson,
          created_at: row.createdAt,
          updated_at: row.updatedAt,
        },
      );
    }
    for (const row of args.reviews) {
      db.run(
        `INSERT OR IGNORE INTO synt_reference_revision_review (
          review_id, source_ref, canonical_reference_id, status, reason,
          payload_json, created_at, updated_at
        ) VALUES (
          @review_id, @source_ref, @canonical_reference_id, @status, @reason,
          @payload_json, @created_at, @updated_at
        )`,
        {
          review_id: row.reviewId,
          source_ref: row.sourceRef,
          canonical_reference_id: row.canonicalReferenceId,
          status: row.status,
          reason: row.reason,
          payload_json: row.payloadJson,
          created_at: row.createdAt,
          updated_at: row.updatedAt,
        },
      );
    }
    db.run(`DELETE FROM synt_reference_canonical
      WHERE canonical_reference_id NOT IN (
        SELECT canonical_reference_id FROM synt_reference_raw WHERE status='active'
      ) AND canonical_reference_id NOT IN (
        SELECT canonical_reference_id FROM synt_reference_binding
        WHERE reviewer<>'reference-refresh-application'
      )`);
    const counts = db.get(`SELECT
      (SELECT COUNT(*) FROM synt_reference_source) AS source_count,
      (SELECT COUNT(*) FROM synt_reference_raw WHERE status='active') AS reference_count,
      (SELECT COUNT(*) FROM synt_reference_canonical WHERE status='active') AS canonical_count,
      (SELECT COUNT(*) FROM synt_reference_binding WHERE status='accepted') AS binding_count`)!;
    db.run(
      `INSERT OR REPLACE INTO synt_reference_application_state (
        singleton_id, reference_hash, input_hash, source_count, reference_count,
        canonical_count, binding_count, reference_ready, graph_ready,
        related_items_ready, updated_at
      ) VALUES (
        1, @reference_hash, @input_hash, @source_count, @reference_count,
        @canonical_count, @binding_count, 1, @graph_ready,
        @related_items_ready, @updated_at
      )`,
      {
        reference_hash: args.referenceHash,
        input_hash: args.inputHash,
        source_count: nonNegativeInt(counts.source_count),
        reference_count: nonNegativeInt(counts.reference_count),
        canonical_count: nonNegativeInt(counts.canonical_count),
        binding_count: nonNegativeInt(counts.binding_count),
        graph_ready: boolInt(
          args.graphFactsChanged ? false : (current?.graphReady ?? true),
        ),
        related_items_ready: boolInt(
          args.graphFactsChanged ? false : (current?.relatedItemsReady ?? true),
        ),
        updated_at: args.now,
      },
    );
    if (args.graphFactsChanged) {
      db.run(
        `UPDATE synt_cache_basis SET status='stale',
        stale_reason='reference_refresh_graph_facts_changed', updated_at=@updated_at
        WHERE cache_key IN ('citation-graph:library', 'related-items-sync:global')`,
        {
          updated_at: args.now,
        },
      );
    }
    db.run(
      `INSERT OR REPLACE INTO synt_cache_basis (
      cache_key, cache_kind, scope_kind, scope_ref, status, basis_kind,
      basis_value, source_hash, policy_version, refreshed_at,
      diagnostics_json, updated_at
    ) VALUES (
      'reference-sidecar:library', 'reference_sidecar', 'library', '', 'ready',
      'reference_refresh_application', @basis_value, @source_hash,
      'reference-refresh-application-v1', @refreshed_at, '[]', @updated_at
    )`,
      {
        basis_value: args.referenceHash,
        source_hash: args.inputHash,
        refreshed_at: args.now,
        updated_at: args.now,
      },
    );
    return true;
  });
}

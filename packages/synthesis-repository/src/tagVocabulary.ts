import type { SqlAdapter, SqlRow } from "./index.js";

export const SYNTHESIS_TAG_VOCABULARY_APPLICATION_REPOSITORY_SCHEMA_VERSION =
  "synthesis-tag-vocabulary-application-repository.v1" as const;
export const SYNTHESIS_TAG_VOCABULARY_APPLICATION_REPOSITORY_SCHEMA_META_KEY =
  "tag_vocabulary_application_schema_version" as const;

export const SYNTHESIS_TAG_VOCABULARY_APPLICATION_TABLES = [
  "synt_tag_application_state",
  "synt_tag_vocabulary_entry",
  "synt_tag_alias",
  "synt_tag_abbrev",
  "synt_tag_protocol",
  "synt_tag_validation_warning",
  "synt_tag_staged_suggestion",
  "synt_tag_audit",
  "synt_tag_effect",
] as const;

export type SynthesisTagVocabularyEntryRecord = {
  tag: string;
  facet: string;
  note?: string;
  source?: string;
  deprecated?: boolean;
  replacement?: string;
  aliasesJson?: string;
  abbrevJson?: string;
  usageCount?: number;
  lastSyncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};
export type SynthesisTagAliasRecord = {
  alias: string;
  tag: string;
  createdAt?: string;
  updatedAt?: string;
};
export type SynthesisTagAbbrevRecord = {
  abbrevKey: string;
  abbrevValue: string;
  createdAt?: string;
  updatedAt?: string;
};
export type SynthesisTagProtocolRecord = {
  protocolId: string;
  version: string;
  tagPattern: string;
  maxTagLength: number;
  facetsJson: string;
  updatedAt?: string;
};
export type SynthesisTagValidationWarningRecord = {
  warningId: string;
  code: string;
  severity: "warning" | "error";
  tag?: string;
  message: string;
  createdAt?: string;
  updatedAt?: string;
};
export type SynthesisTagStagedSuggestionRecord = {
  tag: string;
  facet: string;
  note?: string;
  sourceFlow?: string;
  parentBindingsJson: string;
  createdAt?: string;
  updatedAt?: string;
};
export type SynthesisTagAuditRecord = {
  libraryId: number;
  itemKey: string;
  needsTagRegulation: boolean;
  nonCompliantTagsJson: string;
  auditedAt?: string;
  updatedAt?: string;
};
export type SynthesisTagEffectStatus =
  | "pending"
  | "applied"
  | "already_satisfied"
  | "not_found"
  | "failed";
export type SynthesisTagEffectRecord = {
  effectId: string;
  vocabularyHash: string;
  stagedRevision: number;
  libraryId: number;
  itemKey: string;
  tag: string;
  status: SynthesisTagEffectStatus;
  occurredAt?: string;
  diagnosticsJson: string;
  createdAt?: string;
  updatedAt?: string;
};
export type SynthesisTagApplicationStateRecord = {
  vocabularyHash: string | null;
  stagedRevision: number;
  indexHash: string | null;
  indexBasisHash: string | null;
  indexJson: string;
  indexStale: boolean;
  updatedAt?: string;
};
export type SynthesisTagVocabularyStateRecords = {
  entries: SynthesisTagVocabularyEntryRecord[];
  aliases: SynthesisTagAliasRecord[];
  abbrevs: SynthesisTagAbbrevRecord[];
  protocol: SynthesisTagProtocolRecord;
  warnings: SynthesisTagValidationWarningRecord[];
};

const clean = (value: unknown) => String(value ?? "").trim();
const integer = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));
const bool = (value: unknown) => value === true || value === 1;
function required(value: unknown, code: string) {
  const normalized = clean(value);
  if (!normalized) throw new Error(code);
  return normalized;
}
function jsonText(value: unknown, fallback: "[]" | "{}" = "[]") {
  const normalized = clean(value) || fallback;
  try {
    JSON.parse(normalized);
  } catch {
    throw new Error("repository_tag_json_invalid");
  }
  return normalized;
}
function optionalHash(value: unknown) {
  const normalized = clean(value);
  if (!normalized) return null;
  if (!/^sha256:[a-f0-9]{64}$/.test(normalized))
    throw new Error("repository_tag_hash_invalid");
  return normalized;
}

export function rebuildSynthesisTagVocabularyEntryRow(
  row: SqlRow,
): SynthesisTagVocabularyEntryRecord {
  return {
    tag: required(row.tag, "repository_tag_entry_invalid"),
    facet: required(row.facet, "repository_tag_entry_invalid"),
    ...(clean(row.note) ? { note: clean(row.note) } : {}),
    ...(clean(row.source) ? { source: clean(row.source) } : {}),
    deprecated: bool(row.deprecated),
    ...(clean(row.replacement) ? { replacement: clean(row.replacement) } : {}),
    aliasesJson: jsonText(row.aliases_json),
    abbrevJson: jsonText(row.abbrev_json),
    usageCount: integer(row.usage_count),
    ...(clean(row.last_synced_at)
      ? { lastSyncedAt: clean(row.last_synced_at) }
      : {}),
    ...(clean(row.created_at) ? { createdAt: clean(row.created_at) } : {}),
    ...(clean(row.updated_at) ? { updatedAt: clean(row.updated_at) } : {}),
  };
}
export function rebuildSynthesisTagAliasRow(
  row: SqlRow,
): SynthesisTagAliasRecord {
  return {
    alias: required(row.alias, "repository_tag_alias_invalid"),
    tag: required(row.tag, "repository_tag_alias_invalid"),
    ...(clean(row.created_at) ? { createdAt: clean(row.created_at) } : {}),
    ...(clean(row.updated_at) ? { updatedAt: clean(row.updated_at) } : {}),
  };
}
export function rebuildSynthesisTagAbbrevRow(
  row: SqlRow,
): SynthesisTagAbbrevRecord {
  return {
    abbrevKey: required(row.abbrev_key, "repository_tag_abbrev_invalid"),
    abbrevValue: required(row.abbrev_value, "repository_tag_abbrev_invalid"),
    ...(clean(row.created_at) ? { createdAt: clean(row.created_at) } : {}),
    ...(clean(row.updated_at) ? { updatedAt: clean(row.updated_at) } : {}),
  };
}
export function rebuildSynthesisTagProtocolRow(
  row: SqlRow,
): SynthesisTagProtocolRecord {
  const maxTagLength = integer(row.max_tag_length);
  if (!maxTagLength) throw new Error("repository_tag_protocol_invalid");
  return {
    protocolId: required(row.protocol_id, "repository_tag_protocol_invalid"),
    version: required(row.version, "repository_tag_protocol_invalid"),
    tagPattern: required(row.tag_pattern, "repository_tag_protocol_invalid"),
    maxTagLength,
    facetsJson: jsonText(row.facets_json),
    ...(clean(row.updated_at) ? { updatedAt: clean(row.updated_at) } : {}),
  };
}
export function rebuildSynthesisTagValidationWarningRow(
  row: SqlRow,
): SynthesisTagValidationWarningRecord {
  const severity = clean(row.severity);
  if (severity !== "warning" && severity !== "error")
    throw new Error("repository_tag_warning_invalid");
  return {
    warningId: required(row.warning_id, "repository_tag_warning_invalid"),
    code: required(row.code, "repository_tag_warning_invalid"),
    severity,
    ...(clean(row.tag) ? { tag: clean(row.tag) } : {}),
    message: clean(row.message),
    ...(clean(row.created_at) ? { createdAt: clean(row.created_at) } : {}),
    ...(clean(row.updated_at) ? { updatedAt: clean(row.updated_at) } : {}),
  };
}
export function rebuildSynthesisTagStagedSuggestionRow(
  row: SqlRow,
): SynthesisTagStagedSuggestionRecord {
  return {
    tag: required(row.tag, "repository_tag_staged_invalid"),
    facet: required(row.facet, "repository_tag_staged_invalid"),
    ...(clean(row.note) ? { note: clean(row.note) } : {}),
    ...(clean(row.source_flow) ? { sourceFlow: clean(row.source_flow) } : {}),
    parentBindingsJson: jsonText(row.parent_bindings_json),
    ...(clean(row.created_at) ? { createdAt: clean(row.created_at) } : {}),
    ...(clean(row.updated_at) ? { updatedAt: clean(row.updated_at) } : {}),
  };
}
export function rebuildSynthesisTagAuditRow(
  row: SqlRow,
): SynthesisTagAuditRecord {
  const libraryId = integer(row.library_id);
  if (!libraryId) throw new Error("repository_tag_audit_invalid");
  return {
    libraryId,
    itemKey: required(row.item_key, "repository_tag_audit_invalid"),
    needsTagRegulation: bool(row.needs_tag_regulation),
    nonCompliantTagsJson: jsonText(row.non_compliant_tags_json),
    ...(clean(row.audited_at) ? { auditedAt: clean(row.audited_at) } : {}),
    ...(clean(row.updated_at) ? { updatedAt: clean(row.updated_at) } : {}),
  };
}
export function rebuildSynthesisTagEffectRow(
  row: SqlRow,
): SynthesisTagEffectRecord {
  const status = clean(row.status) as SynthesisTagEffectStatus;
  if (
    ![
      "pending",
      "applied",
      "already_satisfied",
      "not_found",
      "failed",
    ].includes(status)
  )
    throw new Error("repository_tag_effect_invalid");
  const libraryId = integer(row.library_id);
  const vocabularyHash = optionalHash(row.vocabulary_hash);
  if (!libraryId || !vocabularyHash)
    throw new Error("repository_tag_effect_invalid");
  return {
    effectId: required(row.effect_id, "repository_tag_effect_invalid"),
    vocabularyHash,
    stagedRevision: integer(row.staged_revision),
    libraryId,
    itemKey: required(row.item_key, "repository_tag_effect_invalid"),
    tag: required(row.tag, "repository_tag_effect_invalid"),
    status,
    ...(clean(row.occurred_at) ? { occurredAt: clean(row.occurred_at) } : {}),
    diagnosticsJson: jsonText(row.diagnostics_json),
    ...(clean(row.created_at) ? { createdAt: clean(row.created_at) } : {}),
    ...(clean(row.updated_at) ? { updatedAt: clean(row.updated_at) } : {}),
  };
}
export function rebuildSynthesisTagApplicationStateRow(
  row: SqlRow,
): SynthesisTagApplicationStateRecord {
  return {
    vocabularyHash: optionalHash(row.vocabulary_hash),
    stagedRevision: integer(row.staged_revision),
    indexHash: optionalHash(row.index_hash),
    indexBasisHash: optionalHash(row.index_basis_hash),
    indexJson: jsonText(row.index_json, "{}"),
    indexStale: bool(row.index_stale),
    ...(clean(row.updated_at) ? { updatedAt: clean(row.updated_at) } : {}),
  };
}

export function ensureSynthesisTagVocabularyApplicationRepositorySchema(
  db: SqlAdapter,
) {
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_tag_application_state (singleton_id INTEGER PRIMARY KEY CHECK(singleton_id=1), vocabulary_hash TEXT NOT NULL DEFAULT '', staged_revision INTEGER NOT NULL DEFAULT 0, index_hash TEXT NOT NULL DEFAULT '', index_basis_hash TEXT NOT NULL DEFAULT '', index_json TEXT NOT NULL DEFAULT '{}', index_stale INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT '')`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_tag_vocabulary_entry (tag TEXT PRIMARY KEY, facet TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '', deprecated INTEGER NOT NULL DEFAULT 0, replacement TEXT NOT NULL DEFAULT '', aliases_json TEXT NOT NULL DEFAULT '[]', abbrev_json TEXT NOT NULL DEFAULT '[]', usage_count INTEGER NOT NULL DEFAULT 0, last_synced_at TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_tag_alias (alias TEXT PRIMARY KEY, tag TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_tag_abbrev (abbrev_key TEXT PRIMARY KEY, abbrev_value TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_tag_protocol (protocol_id TEXT PRIMARY KEY, version TEXT NOT NULL, tag_pattern TEXT NOT NULL, max_tag_length INTEGER NOT NULL, facets_json TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL DEFAULT '')`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_tag_validation_warning (warning_id TEXT PRIMARY KEY, code TEXT NOT NULL, severity TEXT NOT NULL, tag TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_tag_staged_suggestion (tag TEXT PRIMARY KEY, facet TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', source_flow TEXT NOT NULL DEFAULT '', parent_bindings_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_tag_audit (library_id INTEGER NOT NULL, item_key TEXT NOT NULL, needs_tag_regulation INTEGER NOT NULL DEFAULT 0, non_compliant_tags_json TEXT NOT NULL DEFAULT '[]', audited_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '', PRIMARY KEY(library_id,item_key))`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_tag_effect (effect_id TEXT PRIMARY KEY, vocabulary_hash TEXT NOT NULL, staged_revision INTEGER NOT NULL, library_id INTEGER NOT NULL, item_key TEXT NOT NULL, tag TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', occurred_at TEXT NOT NULL DEFAULT '', diagnostics_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_synt_tag_vocabulary_facet ON synt_tag_vocabulary_entry(facet,tag)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_synt_tag_staged_updated ON synt_tag_staged_suggestion(updated_at DESC,tag)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_synt_tag_audit_library ON synt_tag_audit(library_id,needs_tag_regulation,item_key)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_synt_tag_effect_status ON synt_tag_effect(status,updated_at,effect_id)`,
  );
  db.run(
    `INSERT OR IGNORE INTO synt_schema_meta(key,value) VALUES(@key,@value)`,
    {
      key: SYNTHESIS_TAG_VOCABULARY_APPLICATION_REPOSITORY_SCHEMA_META_KEY,
      value: SYNTHESIS_TAG_VOCABULARY_APPLICATION_REPOSITORY_SCHEMA_VERSION,
    },
  );
  const row = db.get(`SELECT value FROM synt_schema_meta WHERE key=@key`, {
    key: SYNTHESIS_TAG_VOCABULARY_APPLICATION_REPOSITORY_SCHEMA_META_KEY,
  });
  if (
    clean(row?.value) !==
    SYNTHESIS_TAG_VOCABULARY_APPLICATION_REPOSITORY_SCHEMA_VERSION
  )
    throw new Error("repository_tag_vocabulary_schema_mismatch");
}

export function getSynthesisTagApplicationState(db: SqlAdapter) {
  const row = db.get(
    `SELECT * FROM synt_tag_application_state WHERE singleton_id=1 LIMIT 1`,
  );
  return row ? rebuildSynthesisTagApplicationStateRow(row) : null;
}
export function listSynthesisTagVocabularyEntries(db: SqlAdapter) {
  return db
    .all(
      `SELECT * FROM synt_tag_vocabulary_entry ORDER BY tag COLLATE NOCASE,tag`,
    )
    .map(rebuildSynthesisTagVocabularyEntryRow);
}
export function listSynthesisTagAliases(db: SqlAdapter) {
  return db
    .all(`SELECT * FROM synt_tag_alias ORDER BY alias COLLATE NOCASE,alias`)
    .map(rebuildSynthesisTagAliasRow);
}
export function listSynthesisTagAbbrevs(db: SqlAdapter) {
  return db
    .all(
      `SELECT * FROM synt_tag_abbrev ORDER BY abbrev_key COLLATE NOCASE,abbrev_key`,
    )
    .map(rebuildSynthesisTagAbbrevRow);
}
export function getSynthesisTagProtocol(db: SqlAdapter) {
  const row = db.get(
    `SELECT * FROM synt_tag_protocol WHERE protocol_id='default' LIMIT 1`,
  );
  return row ? rebuildSynthesisTagProtocolRow(row) : null;
}
export function listSynthesisTagValidationWarnings(db: SqlAdapter) {
  return db
    .all(`SELECT * FROM synt_tag_validation_warning ORDER BY severity,code,tag`)
    .map(rebuildSynthesisTagValidationWarningRow);
}
export function listSynthesisTagStagedSuggestions(db: SqlAdapter) {
  return db
    .all(
      `SELECT * FROM synt_tag_staged_suggestion ORDER BY tag COLLATE NOCASE,tag`,
    )
    .map(rebuildSynthesisTagStagedSuggestionRow);
}
export function listSynthesisTagAuditRecords(
  db: SqlAdapter,
  args: { libraryId?: number } = {},
) {
  const libraryId = integer(args.libraryId);
  return db
    .all(
      libraryId
        ? `SELECT * FROM synt_tag_audit WHERE library_id=@library_id ORDER BY item_key`
        : `SELECT * FROM synt_tag_audit ORDER BY library_id,item_key`,
      libraryId ? { library_id: libraryId } : {},
    )
    .map(rebuildSynthesisTagAuditRow);
}
export function listSynthesisTagEffects(
  db: SqlAdapter,
  args: { statuses?: SynthesisTagEffectStatus[] } = {},
) {
  return db
    .all(`SELECT * FROM synt_tag_effect ORDER BY created_at,effect_id`)
    .map(rebuildSynthesisTagEffectRow)
    .filter(
      (row) => !args.statuses?.length || args.statuses.includes(row.status),
    );
}

function insertEntry(
  db: SqlAdapter,
  row: SynthesisTagVocabularyEntryRecord,
  now: string,
) {
  db.run(
    `INSERT INTO synt_tag_vocabulary_entry(tag,facet,note,source,deprecated,replacement,aliases_json,abbrev_json,usage_count,last_synced_at,created_at,updated_at) VALUES(@tag,@facet,@note,@source,@deprecated,@replacement,@aliases_json,@abbrev_json,@usage_count,@last_synced_at,@created_at,@updated_at)`,
    {
      tag: required(row.tag, "repository_tag_entry_invalid"),
      facet: required(row.facet, "repository_tag_entry_invalid"),
      note: clean(row.note),
      source: clean(row.source),
      deprecated: row.deprecated ? 1 : 0,
      replacement: clean(row.replacement),
      aliases_json: jsonText(row.aliasesJson),
      abbrev_json: jsonText(row.abbrevJson),
      usage_count: integer(row.usageCount),
      last_synced_at: clean(row.lastSyncedAt),
      created_at: clean(row.createdAt) || now,
      updated_at: clean(row.updatedAt) || now,
    },
  );
}
function replaceVocabularyRows(
  db: SqlAdapter,
  state: SynthesisTagVocabularyStateRecords,
  now: string,
) {
  db.run(`DELETE FROM synt_tag_validation_warning`);
  db.run(`DELETE FROM synt_tag_protocol`);
  db.run(`DELETE FROM synt_tag_abbrev`);
  db.run(`DELETE FROM synt_tag_alias`);
  db.run(`DELETE FROM synt_tag_vocabulary_entry`);
  state.entries.forEach((row) => insertEntry(db, row, now));
  state.aliases.forEach((row) =>
    db.run(
      `INSERT INTO synt_tag_alias(alias,tag,created_at,updated_at) VALUES(@alias,@tag,@created_at,@updated_at)`,
      {
        alias: required(row.alias, "repository_tag_alias_invalid"),
        tag: required(row.tag, "repository_tag_alias_invalid"),
        created_at: clean(row.createdAt) || now,
        updated_at: clean(row.updatedAt) || now,
      },
    ),
  );
  state.abbrevs.forEach((row) =>
    db.run(
      `INSERT INTO synt_tag_abbrev(abbrev_key,abbrev_value,created_at,updated_at) VALUES(@abbrev_key,@abbrev_value,@created_at,@updated_at)`,
      {
        abbrev_key: required(row.abbrevKey, "repository_tag_abbrev_invalid"),
        abbrev_value: required(
          row.abbrevValue,
          "repository_tag_abbrev_invalid",
        ),
        created_at: clean(row.createdAt) || now,
        updated_at: clean(row.updatedAt) || now,
      },
    ),
  );
  db.run(
    `INSERT INTO synt_tag_protocol(protocol_id,version,tag_pattern,max_tag_length,facets_json,updated_at) VALUES(@protocol_id,@version,@tag_pattern,@max_tag_length,@facets_json,@updated_at)`,
    {
      protocol_id: clean(state.protocol.protocolId) || "default",
      version: required(
        state.protocol.version,
        "repository_tag_protocol_invalid",
      ),
      tag_pattern: required(
        state.protocol.tagPattern,
        "repository_tag_protocol_invalid",
      ),
      max_tag_length: integer(state.protocol.maxTagLength),
      facets_json: jsonText(state.protocol.facetsJson),
      updated_at: clean(state.protocol.updatedAt) || now,
    },
  );
  state.warnings.forEach((row) =>
    db.run(
      `INSERT INTO synt_tag_validation_warning(warning_id,code,severity,tag,message,created_at,updated_at) VALUES(@warning_id,@code,@severity,@tag,@message,@created_at,@updated_at)`,
      {
        warning_id: required(row.warningId, "repository_tag_warning_invalid"),
        code: required(row.code, "repository_tag_warning_invalid"),
        severity: row.severity,
        tag: clean(row.tag),
        message: clean(row.message),
        created_at: clean(row.createdAt) || now,
        updated_at: clean(row.updatedAt) || now,
      },
    ),
  );
}
function stateHash(db: SqlAdapter) {
  return getSynthesisTagApplicationState(db)?.vocabularyHash ?? null;
}
function writeState(
  db: SqlAdapter,
  row: SynthesisTagApplicationStateRecord,
  now: string,
) {
  db.run(
    `INSERT OR REPLACE INTO synt_tag_application_state(singleton_id,vocabulary_hash,staged_revision,index_hash,index_basis_hash,index_json,index_stale,updated_at) VALUES(1,@vocabulary_hash,@staged_revision,@index_hash,@index_basis_hash,@index_json,@index_stale,@updated_at)`,
    {
      vocabulary_hash: row.vocabularyHash ?? "",
      staged_revision: row.stagedRevision,
      index_hash: row.indexHash ?? "",
      index_basis_hash: row.indexBasisHash ?? "",
      index_json: jsonText(row.indexJson, "{}"),
      index_stale: row.indexStale ? 1 : 0,
      updated_at: row.updatedAt || now,
    },
  );
}

export function replaceSynthesisTagVocabularyState(
  db: SqlAdapter,
  args: {
    expectedVocabularyHash: string | null;
    vocabularyHash: string;
    state: SynthesisTagVocabularyStateRecords;
    now: string;
  },
) {
  return db.transaction(() => {
    if (stateHash(db) !== args.expectedVocabularyHash) return false;
    replaceVocabularyRows(db, args.state, args.now);
    const current = getSynthesisTagApplicationState(db);
    writeState(
      db,
      {
        vocabularyHash: args.vocabularyHash,
        stagedRevision: current?.stagedRevision ?? 0,
        indexHash: current?.indexHash ?? null,
        indexBasisHash: current?.indexBasisHash ?? null,
        indexJson: current?.indexJson ?? "{}",
        indexStale: true,
      },
      args.now,
    );
    return true;
  });
}
function insertStaged(
  db: SqlAdapter,
  row: SynthesisTagStagedSuggestionRecord,
  now: string,
) {
  db.run(
    `INSERT INTO synt_tag_staged_suggestion(tag,facet,note,source_flow,parent_bindings_json,created_at,updated_at) VALUES(@tag,@facet,@note,@source_flow,@parent_bindings_json,@created_at,@updated_at)`,
    {
      tag: required(row.tag, "repository_tag_staged_invalid"),
      facet: required(row.facet, "repository_tag_staged_invalid"),
      note: clean(row.note),
      source_flow: clean(row.sourceFlow),
      parent_bindings_json: jsonText(row.parentBindingsJson),
      created_at: clean(row.createdAt) || now,
      updated_at: clean(row.updatedAt) || now,
    },
  );
}
export function replaceSynthesisTagStagedSuggestions(
  db: SqlAdapter,
  args: {
    expectedStagedRevision: number;
    rows: SynthesisTagStagedSuggestionRecord[];
    now: string;
  },
) {
  return db.transaction(() => {
    const state = getSynthesisTagApplicationState(db);
    const currentRevision = state?.stagedRevision ?? 0;
    if (currentRevision !== args.expectedStagedRevision) return null;
    db.run(`DELETE FROM synt_tag_staged_suggestion`);
    args.rows.forEach((row) => insertStaged(db, row, args.now));
    const nextRevision = currentRevision + 1;
    writeState(
      db,
      {
        vocabularyHash: state?.vocabularyHash ?? null,
        stagedRevision: nextRevision,
        indexHash: state?.indexHash ?? null,
        indexBasisHash: state?.indexBasisHash ?? null,
        indexJson: state?.indexJson ?? "{}",
        indexStale: state?.indexStale ?? true,
      },
      args.now,
    );
    return nextRevision;
  });
}
function insertEffect(
  db: SqlAdapter,
  row: SynthesisTagEffectRecord,
  now: string,
) {
  db.run(
    `INSERT INTO synt_tag_effect(effect_id,vocabulary_hash,staged_revision,library_id,item_key,tag,status,occurred_at,diagnostics_json,created_at,updated_at) VALUES(@effect_id,@vocabulary_hash,@staged_revision,@library_id,@item_key,@tag,@status,@occurred_at,@diagnostics_json,@created_at,@updated_at)`,
    {
      effect_id: required(row.effectId, "repository_tag_effect_invalid"),
      vocabulary_hash: required(
        row.vocabularyHash,
        "repository_tag_effect_invalid",
      ),
      staged_revision: integer(row.stagedRevision),
      library_id: integer(row.libraryId),
      item_key: required(row.itemKey, "repository_tag_effect_invalid"),
      tag: required(row.tag, "repository_tag_effect_invalid"),
      status: row.status,
      occurred_at: clean(row.occurredAt),
      diagnostics_json: jsonText(row.diagnosticsJson),
      created_at: clean(row.createdAt) || now,
      updated_at: clean(row.updatedAt) || now,
    },
  );
}
export function promoteSynthesisTagVocabularyState(
  db: SqlAdapter,
  args: {
    expectedVocabularyHash: string | null;
    expectedStagedRevision: number;
    vocabularyHash: string;
    state: SynthesisTagVocabularyStateRecords;
    stagedRows: SynthesisTagStagedSuggestionRecord[];
    effects: SynthesisTagEffectRecord[];
    now: string;
  },
) {
  return db.transaction(() => {
    const current = getSynthesisTagApplicationState(db);
    if (
      (current?.vocabularyHash ?? null) !== args.expectedVocabularyHash ||
      (current?.stagedRevision ?? 0) !== args.expectedStagedRevision
    )
      return null;
    replaceVocabularyRows(db, args.state, args.now);
    db.run(`DELETE FROM synt_tag_staged_suggestion`);
    args.stagedRows.forEach((row) => insertStaged(db, row, args.now));
    const nextRevision = args.expectedStagedRevision + 1;
    args.effects.forEach((row) =>
      insertEffect(
        db,
        {
          ...row,
          vocabularyHash: args.vocabularyHash,
          stagedRevision: nextRevision,
        },
        args.now,
      ),
    );
    writeState(
      db,
      {
        vocabularyHash: args.vocabularyHash,
        stagedRevision: nextRevision,
        indexHash: current?.indexHash ?? null,
        indexBasisHash: current?.indexBasisHash ?? null,
        indexJson: current?.indexJson ?? "{}",
        indexStale: true,
      },
      args.now,
    );
    return nextRevision;
  });
}
export function promoteSynthesisTagIndex(
  db: SqlAdapter,
  args: {
    expectedVocabularyHash: string;
    indexHash: string;
    indexJson: string;
    now: string;
  },
) {
  return db.transaction(() => {
    const state = getSynthesisTagApplicationState(db);
    if (state?.vocabularyHash !== args.expectedVocabularyHash) return false;
    writeState(
      db,
      {
        ...state,
        indexHash: args.indexHash,
        indexBasisHash: args.expectedVocabularyHash,
        indexJson: jsonText(args.indexJson, "{}"),
        indexStale: false,
      },
      args.now,
    );
    return true;
  });
}
export function recordSynthesisTagEffectReceipts(
  db: SqlAdapter,
  rows: Array<
    Pick<
      SynthesisTagEffectRecord,
      "effectId" | "status" | "occurredAt" | "diagnosticsJson"
    >
  >,
  now: string,
) {
  return db.transaction(() => {
    let updated = 0;
    for (const row of rows) {
      const exists = db.get(
        `SELECT effect_id FROM synt_tag_effect WHERE effect_id=@effect_id LIMIT 1`,
        { effect_id: row.effectId },
      );
      if (!exists) continue;
      db.run(
        `UPDATE synt_tag_effect SET status=@status,occurred_at=@occurred_at,diagnostics_json=@diagnostics_json,updated_at=@updated_at WHERE effect_id=@effect_id`,
        {
          effect_id: row.effectId,
          status: row.status,
          occurred_at: clean(row.occurredAt),
          diagnostics_json: jsonText(row.diagnosticsJson),
          updated_at: now,
        },
      );
      updated += 1;
    }
    return updated;
  });
}
export function upsertSynthesisTagAuditRecord(
  db: SqlAdapter,
  row: SynthesisTagAuditRecord,
  now: string,
) {
  const libraryId = integer(row.libraryId);
  if (!libraryId) throw new Error("repository_tag_audit_invalid");
  db.run(
    `INSERT OR REPLACE INTO synt_tag_audit(library_id,item_key,needs_tag_regulation,non_compliant_tags_json,audited_at,updated_at) VALUES(@library_id,@item_key,@needs_tag_regulation,@non_compliant_tags_json,@audited_at,@updated_at)`,
    {
      library_id: libraryId,
      item_key: required(row.itemKey, "repository_tag_audit_invalid"),
      needs_tag_regulation: row.needsTagRegulation ? 1 : 0,
      non_compliant_tags_json: jsonText(row.nonCompliantTagsJson),
      audited_at: clean(row.auditedAt) || now,
      updated_at: clean(row.updatedAt) || now,
    },
  );
}
export function replaceSynthesisTagAuditRecords(
  db: SqlAdapter,
  args: { libraryId: number; rows: SynthesisTagAuditRecord[]; now: string },
) {
  const libraryId = integer(args.libraryId);
  if (!libraryId) throw new Error("repository_tag_audit_invalid");
  db.transaction(() => {
    db.run(`DELETE FROM synt_tag_audit WHERE library_id=@library_id`, {
      library_id: libraryId,
    });
    args.rows.forEach((row) =>
      upsertSynthesisTagAuditRecord(db, { ...row, libraryId }, args.now),
    );
  });
}

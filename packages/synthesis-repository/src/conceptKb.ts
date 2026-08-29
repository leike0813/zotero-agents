import type { SqlAdapter, SqlRow } from "./index.js";

export const SYNTHESIS_CONCEPT_KB_APPLICATION_REPOSITORY_SCHEMA_VERSION =
  "synthesis-concept-kb-application-repository.v1" as const;
export const SYNTHESIS_CONCEPT_KB_APPLICATION_REPOSITORY_SCHEMA_META_KEY =
  "concept_kb_application_schema_version" as const;

export const SYNTHESIS_CONCEPT_KB_APPLICATION_TABLES = [
  "synt_concept_application_state",
  "synt_concept",
  "synt_concept_sense",
  "synt_concept_alias",
  "synt_concept_relation",
  "synt_concept_review_item",
  "synt_topic_concept_link",
] as const;

export const SYNTHESIS_CONCEPT_KB_APPLICATION_INDEXES = [
  "idx_synt_concept_status_domain",
  "idx_synt_concept_sense_concept",
  "idx_synt_concept_alias_normalized",
  "idx_synt_concept_alias_concept_status",
  "idx_synt_concept_relation_source_status",
  "idx_synt_concept_relation_target_status",
  "idx_synt_concept_review_status_updated",
  "idx_synt_concept_review_topic_status",
  "idx_synt_topic_concept_link_topic",
  "idx_synt_topic_concept_link_concept",
] as const;

export type SynthesisConceptRecord = {
  conceptId: string;
  label: string;
  aliasesJson?: string;
  conceptType: string;
  domain: string;
  status: string;
  shortDefinition?: string;
  definition?: string;
  usageNote?: string;
  editorialNote?: string;
  senseIdsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisConceptSenseRecord = {
  senseId: string;
  conceptId: string;
  label: string;
  aliasesJson?: string;
  domain: string;
  shortDefinition?: string;
  definition?: string;
  disambiguation?: string;
  topicRelevance?: string;
  confidence: string;
  sourceTopicIdsJson?: string;
  evidenceJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisConceptAliasRecord = {
  aliasId: string;
  alias: string;
  normalized: string;
  conceptId: string;
  senseId?: string;
  status: string;
  confidence: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisConceptRelationRecord = {
  relationId: string;
  sourceConceptId: string;
  targetConceptId: string;
  relation: string;
  status: string;
  confidence: string;
  provenanceJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisConceptReviewItemRecord = {
  reviewId: string;
  status: string;
  reason: string;
  topicId: string;
  topicPathId: string;
  label: string;
  confidence: string;
  candidateConceptIdsJson?: string;
  proposalJson?: string;
  targetConceptId?: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
};

export type SynthesisTopicConceptLinkRecord = {
  topicId: string;
  conceptId: string;
  senseId: string;
  label: string;
  relevance?: string;
  confidence: string;
  source: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisConceptApplicationStateRecord = {
  manifestHash: string;
  revision: number;
  indexHash: string;
  indexBasisHash: string;
  indexJson: string;
  indexStale: boolean;
  updatedAt: string;
};

export type SynthesisConceptKbStateRecords = {
  concepts: SynthesisConceptRecord[];
  senses: SynthesisConceptSenseRecord[];
  aliases: SynthesisConceptAliasRecord[];
  relations: SynthesisConceptRelationRecord[];
  reviewItems: SynthesisConceptReviewItemRecord[];
  topicLinks: SynthesisTopicConceptLinkRecord[];
};

const clean = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
};
const bool = (value: unknown) => value === true || value === 1;
const HASH = /^sha256:[a-f0-9]{64}$/;

function required(value: unknown, code: string) {
  const result = clean(value);
  if (!result) throw new Error(code);
  return result;
}

function hash(value: unknown, code: string, optional = false) {
  const result = clean(value);
  if (optional && !result) return "";
  if (!HASH.test(result)) throw new Error(code);
  return result;
}

function json(value: unknown, fallback: "[]" | "{}" = "[]") {
  const text = clean(value) || fallback;
  const parsed = JSON.parse(text) as unknown;
  if (
    (fallback === "[]" && !Array.isArray(parsed)) ||
    (fallback === "{}" &&
      (!parsed || typeof parsed !== "object" || Array.isArray(parsed)))
  ) {
    throw new Error("repository_concept_json_invalid");
  }
  return JSON.stringify(parsed);
}

export function rebuildSynthesisConceptApplicationStateRow(
  row: SqlRow,
): SynthesisConceptApplicationStateRecord {
  return {
    manifestHash: hash(row.manifest_hash, "repository_concept_state_invalid"),
    revision: number(row.revision),
    indexHash: hash(row.index_hash, "repository_concept_state_invalid", true),
    indexBasisHash: hash(
      row.index_basis_hash,
      "repository_concept_state_invalid",
      true,
    ),
    indexJson: json(row.index_json, "{}"),
    indexStale: bool(row.index_stale),
    updatedAt: clean(row.updated_at),
  };
}

export function rebuildSynthesisConceptRow(
  row: SqlRow,
): SynthesisConceptRecord {
  return {
    conceptId: required(row.concept_id, "repository_concept_invalid"),
    label: required(row.label, "repository_concept_invalid"),
    aliasesJson: json(row.aliases_json),
    conceptType: required(row.concept_type, "repository_concept_invalid"),
    domain: required(row.domain, "repository_concept_invalid"),
    status: required(row.status, "repository_concept_invalid"),
    shortDefinition: clean(row.short_definition),
    definition: clean(row.definition),
    usageNote: clean(row.usage_note),
    editorialNote: clean(row.editorial_note),
    senseIdsJson: json(row.sense_ids_json),
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at),
  };
}

export function rebuildSynthesisConceptSenseRow(
  row: SqlRow,
): SynthesisConceptSenseRecord {
  return {
    senseId: required(row.sense_id, "repository_concept_sense_invalid"),
    conceptId: required(row.concept_id, "repository_concept_sense_invalid"),
    label: required(row.label, "repository_concept_sense_invalid"),
    aliasesJson: json(row.aliases_json),
    domain: required(row.domain, "repository_concept_sense_invalid"),
    shortDefinition: clean(row.short_definition),
    definition: clean(row.definition),
    disambiguation: clean(row.disambiguation),
    topicRelevance: clean(row.topic_relevance),
    confidence: required(row.confidence, "repository_concept_sense_invalid"),
    sourceTopicIdsJson: json(row.source_topic_ids_json),
    evidenceJson: json(row.evidence_json),
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at),
  };
}

export function rebuildSynthesisConceptAliasRow(
  row: SqlRow,
): SynthesisConceptAliasRecord {
  return {
    aliasId: required(row.alias_id, "repository_concept_alias_invalid"),
    alias: required(row.alias, "repository_concept_alias_invalid"),
    normalized: required(row.normalized, "repository_concept_alias_invalid"),
    conceptId: required(row.concept_id, "repository_concept_alias_invalid"),
    senseId: clean(row.sense_id),
    status: required(row.status, "repository_concept_alias_invalid"),
    confidence: required(row.confidence, "repository_concept_alias_invalid"),
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at),
  };
}

export function rebuildSynthesisConceptRelationRow(
  row: SqlRow,
): SynthesisConceptRelationRecord {
  return {
    relationId: required(
      row.relation_id,
      "repository_concept_relation_invalid",
    ),
    sourceConceptId: required(
      row.source_concept_id,
      "repository_concept_relation_invalid",
    ),
    targetConceptId: required(
      row.target_concept_id,
      "repository_concept_relation_invalid",
    ),
    relation: required(row.relation, "repository_concept_relation_invalid"),
    status: required(row.status, "repository_concept_relation_invalid"),
    confidence: required(row.confidence, "repository_concept_relation_invalid"),
    provenanceJson: json(row.provenance_json),
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at),
  };
}

export function rebuildSynthesisConceptReviewItemRow(
  row: SqlRow,
): SynthesisConceptReviewItemRecord {
  return {
    reviewId: required(row.review_id, "repository_concept_review_invalid"),
    status: required(row.status, "repository_concept_review_invalid"),
    reason: required(row.reason, "repository_concept_review_invalid"),
    topicId: required(row.topic_id, "repository_concept_review_invalid"),
    topicPathId: required(
      row.topic_path_id,
      "repository_concept_review_invalid",
    ),
    label: required(row.label, "repository_concept_review_invalid"),
    confidence: required(row.confidence, "repository_concept_review_invalid"),
    candidateConceptIdsJson: json(row.candidate_concept_ids_json),
    proposalJson: json(row.proposal_json, "{}"),
    targetConceptId: clean(row.target_concept_id),
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at),
    resolvedAt: clean(row.resolved_at),
  };
}

export function rebuildSynthesisTopicConceptLinkRow(
  row: SqlRow,
): SynthesisTopicConceptLinkRecord {
  return {
    topicId: required(row.topic_id, "repository_topic_concept_link_invalid"),
    conceptId: required(
      row.concept_id,
      "repository_topic_concept_link_invalid",
    ),
    senseId: required(row.sense_id, "repository_topic_concept_link_invalid"),
    label: required(row.label, "repository_topic_concept_link_invalid"),
    relevance: clean(row.relevance),
    confidence: required(
      row.confidence,
      "repository_topic_concept_link_invalid",
    ),
    source: required(row.source, "repository_topic_concept_link_invalid"),
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at),
  };
}

export function ensureSynthesisConceptKbApplicationRepositorySchema(
  db: SqlAdapter,
) {
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_concept_application_state (singleton_id INTEGER PRIMARY KEY CHECK(singleton_id=1), manifest_hash TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, index_hash TEXT NOT NULL DEFAULT '', index_basis_hash TEXT NOT NULL DEFAULT '', index_json TEXT NOT NULL DEFAULT '{}', index_stale INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT '')`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_concept (concept_id TEXT PRIMARY KEY, label TEXT NOT NULL, aliases_json TEXT NOT NULL DEFAULT '[]', concept_type TEXT NOT NULL, domain TEXT NOT NULL, status TEXT NOT NULL, short_definition TEXT NOT NULL DEFAULT '', definition TEXT NOT NULL DEFAULT '', usage_note TEXT NOT NULL DEFAULT '', editorial_note TEXT NOT NULL DEFAULT '', sense_ids_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_concept_sense (sense_id TEXT PRIMARY KEY, concept_id TEXT NOT NULL, label TEXT NOT NULL, aliases_json TEXT NOT NULL DEFAULT '[]', domain TEXT NOT NULL, short_definition TEXT NOT NULL DEFAULT '', definition TEXT NOT NULL DEFAULT '', disambiguation TEXT NOT NULL DEFAULT '', topic_relevance TEXT NOT NULL DEFAULT '', confidence TEXT NOT NULL, source_topic_ids_json TEXT NOT NULL DEFAULT '[]', evidence_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_concept_alias (alias_id TEXT PRIMARY KEY, alias TEXT NOT NULL, normalized TEXT NOT NULL, concept_id TEXT NOT NULL, sense_id TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, confidence TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_concept_relation (relation_id TEXT PRIMARY KEY, source_concept_id TEXT NOT NULL, target_concept_id TEXT NOT NULL, relation TEXT NOT NULL, status TEXT NOT NULL, confidence TEXT NOT NULL, provenance_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '', UNIQUE(source_concept_id,target_concept_id,relation))`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_concept_review_item (review_id TEXT PRIMARY KEY, status TEXT NOT NULL, reason TEXT NOT NULL, topic_id TEXT NOT NULL, topic_path_id TEXT NOT NULL, label TEXT NOT NULL, confidence TEXT NOT NULL, candidate_concept_ids_json TEXT NOT NULL DEFAULT '[]', proposal_json TEXT NOT NULL DEFAULT '{}', target_concept_id TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '', resolved_at TEXT NOT NULL DEFAULT '')`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_topic_concept_link (topic_id TEXT NOT NULL, concept_id TEXT NOT NULL, sense_id TEXT NOT NULL, label TEXT NOT NULL, relevance TEXT NOT NULL DEFAULT '', confidence TEXT NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '', PRIMARY KEY(topic_id,concept_id,sense_id))`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_synt_concept_status_domain ON synt_concept(status,domain)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_synt_concept_sense_concept ON synt_concept_sense(concept_id,confidence)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_synt_concept_alias_normalized ON synt_concept_alias(normalized,status)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_synt_concept_alias_concept_status ON synt_concept_alias(concept_id,status)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_synt_concept_relation_source_status ON synt_concept_relation(source_concept_id,status)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_synt_concept_relation_target_status ON synt_concept_relation(target_concept_id,status)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_synt_concept_review_status_updated ON synt_concept_review_item(status,updated_at DESC)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_synt_concept_review_topic_status ON synt_concept_review_item(topic_id,status)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_synt_topic_concept_link_topic ON synt_topic_concept_link(topic_id)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_synt_topic_concept_link_concept ON synt_topic_concept_link(concept_id)`,
  );
  db.run(
    `INSERT OR REPLACE INTO synt_schema_meta(key,value) VALUES(@key,@value)`,
    {
      key: SYNTHESIS_CONCEPT_KB_APPLICATION_REPOSITORY_SCHEMA_META_KEY,
      value: SYNTHESIS_CONCEPT_KB_APPLICATION_REPOSITORY_SCHEMA_VERSION,
    },
  );
}

export function getSynthesisConceptApplicationState(db: SqlAdapter) {
  const row = db.get(
    `SELECT * FROM synt_concept_application_state WHERE singleton_id=1 LIMIT 1`,
  );
  return row ? rebuildSynthesisConceptApplicationStateRow(row) : null;
}

const list = <T>(db: SqlAdapter, sql: string, rebuild: (row: SqlRow) => T) =>
  db.all(sql).map(rebuild);
export const listSynthesisConcepts = (db: SqlAdapter) =>
  list(
    db,
    `SELECT * FROM synt_concept ORDER BY concept_id`,
    rebuildSynthesisConceptRow,
  );
export const listSynthesisConceptSenses = (db: SqlAdapter) =>
  list(
    db,
    `SELECT * FROM synt_concept_sense ORDER BY sense_id`,
    rebuildSynthesisConceptSenseRow,
  );
export const listSynthesisConceptAliases = (db: SqlAdapter) =>
  list(
    db,
    `SELECT * FROM synt_concept_alias ORDER BY alias_id`,
    rebuildSynthesisConceptAliasRow,
  );
export const listSynthesisConceptRelations = (db: SqlAdapter) =>
  list(
    db,
    `SELECT * FROM synt_concept_relation ORDER BY relation_id`,
    rebuildSynthesisConceptRelationRow,
  );
export const listSynthesisConceptReviewItems = (db: SqlAdapter) =>
  list(
    db,
    `SELECT * FROM synt_concept_review_item ORDER BY review_id`,
    rebuildSynthesisConceptReviewItemRow,
  );
export const listSynthesisTopicConceptLinks = (db: SqlAdapter) =>
  list(
    db,
    `SELECT * FROM synt_topic_concept_link ORDER BY topic_id,concept_id,sense_id`,
    rebuildSynthesisTopicConceptLinkRow,
  );

function insertRows(db: SqlAdapter, state: SynthesisConceptKbStateRecords) {
  for (const raw of state.concepts) {
    const row = rebuildSynthesisConceptRow({
      concept_id: raw.conceptId,
      label: raw.label,
      aliases_json: raw.aliasesJson ?? "[]",
      concept_type: raw.conceptType,
      domain: raw.domain,
      status: raw.status,
      short_definition: raw.shortDefinition ?? "",
      definition: raw.definition ?? "",
      usage_note: raw.usageNote ?? "",
      editorial_note: raw.editorialNote ?? "",
      sense_ids_json: raw.senseIdsJson ?? "[]",
      created_at: raw.createdAt ?? "",
      updated_at: raw.updatedAt ?? "",
    });
    db.run(
      `INSERT INTO synt_concept VALUES(@concept_id,@label,@aliases_json,@concept_type,@domain,@status,@short_definition,@definition,@usage_note,@editorial_note,@sense_ids_json,@created_at,@updated_at)`,
      {
        concept_id: row.conceptId,
        label: row.label,
        aliases_json: row.aliasesJson,
        concept_type: row.conceptType,
        domain: row.domain,
        status: row.status,
        short_definition: row.shortDefinition,
        definition: row.definition,
        usage_note: row.usageNote,
        editorial_note: row.editorialNote,
        sense_ids_json: row.senseIdsJson,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      },
    );
  }
  for (const raw of state.senses) {
    const row = rebuildSynthesisConceptSenseRow({
      sense_id: raw.senseId,
      concept_id: raw.conceptId,
      label: raw.label,
      aliases_json: raw.aliasesJson ?? "[]",
      domain: raw.domain,
      short_definition: raw.shortDefinition ?? "",
      definition: raw.definition ?? "",
      disambiguation: raw.disambiguation ?? "",
      topic_relevance: raw.topicRelevance ?? "",
      confidence: raw.confidence,
      source_topic_ids_json: raw.sourceTopicIdsJson ?? "[]",
      evidence_json: raw.evidenceJson ?? "[]",
      created_at: raw.createdAt ?? "",
      updated_at: raw.updatedAt ?? "",
    });
    db.run(
      `INSERT INTO synt_concept_sense VALUES(@sense_id,@concept_id,@label,@aliases_json,@domain,@short_definition,@definition,@disambiguation,@topic_relevance,@confidence,@source_topic_ids_json,@evidence_json,@created_at,@updated_at)`,
      {
        sense_id: row.senseId,
        concept_id: row.conceptId,
        label: row.label,
        aliases_json: row.aliasesJson,
        domain: row.domain,
        short_definition: row.shortDefinition,
        definition: row.definition,
        disambiguation: row.disambiguation,
        topic_relevance: row.topicRelevance,
        confidence: row.confidence,
        source_topic_ids_json: row.sourceTopicIdsJson,
        evidence_json: row.evidenceJson,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      },
    );
  }
  for (const raw of state.aliases) {
    const row = rebuildSynthesisConceptAliasRow({
      alias_id: raw.aliasId,
      alias: raw.alias,
      normalized: raw.normalized,
      concept_id: raw.conceptId,
      sense_id: raw.senseId ?? "",
      status: raw.status,
      confidence: raw.confidence,
      created_at: raw.createdAt ?? "",
      updated_at: raw.updatedAt ?? "",
    });
    db.run(
      `INSERT INTO synt_concept_alias VALUES(@alias_id,@alias,@normalized,@concept_id,@sense_id,@status,@confidence,@created_at,@updated_at)`,
      {
        alias_id: row.aliasId,
        alias: row.alias,
        normalized: row.normalized,
        concept_id: row.conceptId,
        sense_id: row.senseId,
        status: row.status,
        confidence: row.confidence,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      },
    );
  }
  for (const raw of state.relations) {
    const row = rebuildSynthesisConceptRelationRow({
      relation_id: raw.relationId,
      source_concept_id: raw.sourceConceptId,
      target_concept_id: raw.targetConceptId,
      relation: raw.relation,
      status: raw.status,
      confidence: raw.confidence,
      provenance_json: raw.provenanceJson ?? "[]",
      created_at: raw.createdAt ?? "",
      updated_at: raw.updatedAt ?? "",
    });
    db.run(
      `INSERT INTO synt_concept_relation VALUES(@relation_id,@source_concept_id,@target_concept_id,@relation,@status,@confidence,@provenance_json,@created_at,@updated_at)`,
      {
        relation_id: row.relationId,
        source_concept_id: row.sourceConceptId,
        target_concept_id: row.targetConceptId,
        relation: row.relation,
        status: row.status,
        confidence: row.confidence,
        provenance_json: row.provenanceJson,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      },
    );
  }
  for (const raw of state.reviewItems) {
    const row = rebuildSynthesisConceptReviewItemRow({
      review_id: raw.reviewId,
      status: raw.status,
      reason: raw.reason,
      topic_id: raw.topicId,
      topic_path_id: raw.topicPathId,
      label: raw.label,
      confidence: raw.confidence,
      candidate_concept_ids_json: raw.candidateConceptIdsJson ?? "[]",
      proposal_json: raw.proposalJson ?? "{}",
      target_concept_id: raw.targetConceptId ?? "",
      created_at: raw.createdAt ?? "",
      updated_at: raw.updatedAt ?? "",
      resolved_at: raw.resolvedAt ?? "",
    });
    db.run(
      `INSERT INTO synt_concept_review_item VALUES(@review_id,@status,@reason,@topic_id,@topic_path_id,@label,@confidence,@candidate_concept_ids_json,@proposal_json,@target_concept_id,@created_at,@updated_at,@resolved_at)`,
      {
        review_id: row.reviewId,
        status: row.status,
        reason: row.reason,
        topic_id: row.topicId,
        topic_path_id: row.topicPathId,
        label: row.label,
        confidence: row.confidence,
        candidate_concept_ids_json: row.candidateConceptIdsJson,
        proposal_json: row.proposalJson,
        target_concept_id: row.targetConceptId,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
        resolved_at: row.resolvedAt,
      },
    );
  }
  for (const raw of state.topicLinks) {
    const row = rebuildSynthesisTopicConceptLinkRow({
      topic_id: raw.topicId,
      concept_id: raw.conceptId,
      sense_id: raw.senseId,
      label: raw.label,
      relevance: raw.relevance ?? "",
      confidence: raw.confidence,
      source: raw.source,
      created_at: raw.createdAt ?? "",
      updated_at: raw.updatedAt ?? "",
    });
    db.run(
      `INSERT INTO synt_topic_concept_link VALUES(@topic_id,@concept_id,@sense_id,@label,@relevance,@confidence,@source,@created_at,@updated_at)`,
      {
        topic_id: row.topicId,
        concept_id: row.conceptId,
        sense_id: row.senseId,
        label: row.label,
        relevance: row.relevance,
        confidence: row.confidence,
        source: row.source,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      },
    );
  }
}

export function replaceSynthesisConceptKbState(
  db: SqlAdapter,
  args: {
    expectedManifestHash: string | null;
    manifestHash: string;
    state: SynthesisConceptKbStateRecords;
    now: string;
  },
) {
  hash(args.manifestHash, "repository_concept_state_invalid");
  return db.transaction(() => {
    const current = getSynthesisConceptApplicationState(db);
    if ((current?.manifestHash ?? null) !== args.expectedManifestHash)
      return null;
    for (const table of [
      "synt_topic_concept_link",
      "synt_concept_review_item",
      "synt_concept_relation",
      "synt_concept_alias",
      "synt_concept_sense",
      "synt_concept",
    ])
      db.run(`DELETE FROM ${table}`);
    insertRows(db, args.state);
    const revision = (current?.revision ?? 0) + 1;
    db.run(
      `INSERT OR REPLACE INTO synt_concept_application_state(singleton_id,manifest_hash,revision,index_hash,index_basis_hash,index_json,index_stale,updated_at) VALUES(1,@manifest_hash,@revision,@index_hash,@index_basis_hash,@index_json,1,@updated_at)`,
      {
        manifest_hash: args.manifestHash,
        revision,
        index_hash: current?.indexHash ?? "",
        index_basis_hash: current?.indexBasisHash ?? "",
        index_json: current?.indexJson ?? "{}",
        updated_at: args.now,
      },
    );
    return revision;
  });
}

export function promoteSynthesisConceptKbIndex(
  db: SqlAdapter,
  args: {
    expectedManifestHash: string;
    indexHash: string;
    indexJson: string;
    now: string;
  },
) {
  hash(args.expectedManifestHash, "repository_concept_index_invalid");
  hash(args.indexHash, "repository_concept_index_invalid");
  const indexJson = json(args.indexJson, "{}");
  return db.transaction(() => {
    const current = getSynthesisConceptApplicationState(db);
    if (!current || current.manifestHash !== args.expectedManifestHash)
      return false;
    db.run(
      `UPDATE synt_concept_application_state SET index_hash=@index_hash,index_basis_hash=@basis,index_json=@index_json,index_stale=0,updated_at=@updated_at WHERE singleton_id=1`,
      {
        index_hash: args.indexHash,
        basis: args.expectedManifestHash,
        index_json: indexJson,
        updated_at: args.now,
      },
    );
    return true;
  });
}

import type { SqlAdapter, SqlRow } from "./index.js";

export const SYNTHESIS_TOPIC_GRAPH_APPLICATION_REPOSITORY_SCHEMA_VERSION =
  "synthesis-topic-graph-application-repository.v2" as const;
export const SYNTHESIS_TOPIC_GRAPH_APPLICATION_REPOSITORY_SCHEMA_META_KEY =
  "topic_graph_application_schema_version" as const;
export const SYNTHESIS_TOPIC_GRAPH_APPLICATION_TABLES = [
  "synt_topic_graph_application_state",
  "synt_topic_graph_node",
  "synt_topic_graph_edge",
  "synt_topic_graph_review_item",
] as const;
export const SYNTHESIS_TOPIC_GRAPH_APPLICATION_INDEXES = [
  "idx_synt_topic_graph_node_type_updated",
  "idx_synt_topic_graph_node_definition_updated",
  "idx_synt_topic_graph_edge_source_status",
  "idx_synt_topic_graph_edge_target_status",
  "idx_synt_topic_graph_edge_relation_status",
  "idx_synt_topic_graph_review_status_updated",
  "idx_synt_topic_graph_review_source",
  "idx_synt_topic_graph_review_target",
] as const;

export type SynthesisTopicGraphNodeRecord = {
  topicId: string;
  title: string;
  definition?: string;
  aliasesJson?: string;
  planningJson?: string;
  nodeType: string;
  definitionStatus?: string;
  currentArtifactPath?: string;
  isRoot?: boolean;
  level?: string;
  paperCount?: number;
  lastSynthesisAt?: string;
  createdAt?: string;
  updatedAt?: string;
};
export type SynthesisTopicGraphEdgeRecord = {
  edgeId: string;
  sourceTopicId: string;
  targetTopicId: string;
  relation: string;
  status: string;
  confidence?: number;
  provenanceJson?: string;
  evidenceRefsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};
export type SynthesisTopicGraphReviewItemRecord = {
  reviewId: string;
  status: string;
  sourceTopicId: string;
  targetTopicId: string;
  targetTitle?: string;
  relation: string;
  confidence?: number;
  provenanceJson?: string;
  evidenceRefsJson?: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
};
export type SynthesisTopicGraphApplicationStateRecord = {
  manifestHash: string;
  revision: number;
  indexHash: string;
  indexBasisHash: string;
  indexJson: string;
  indexStale: boolean;
  updatedAt: string;
};
export type SynthesisTopicGraphStateRecords = {
  nodes: SynthesisTopicGraphNodeRecord[];
  edges: SynthesisTopicGraphEdgeRecord[];
  reviewItems: SynthesisTopicGraphReviewItemRecord[];
};

const HASH = /^sha256:[a-f0-9]{64}$/;
const clean = (value: unknown) => String(value ?? "").trim();
const count = (value: unknown) => {
  const result = Number(value);
  return Number.isSafeInteger(result) && result >= 0 ? result : 0;
};
const bool = (value: unknown) => value === true || value === 1;
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
    throw new Error("repository_topic_graph_json_invalid");
  }
  return JSON.stringify(parsed);
}
function optionalNumber(value: unknown, code: string) {
  if (value === undefined || value === null || value === "") return undefined;
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0 || result > 1) {
    throw new Error(code);
  }
  return result;
}

export function rebuildSynthesisTopicGraphApplicationStateRow(
  row: SqlRow,
): SynthesisTopicGraphApplicationStateRecord {
  return {
    manifestHash: hash(
      row.manifest_hash,
      "repository_topic_graph_state_invalid",
    ),
    revision: count(row.revision),
    indexHash: hash(
      row.index_hash,
      "repository_topic_graph_state_invalid",
      true,
    ),
    indexBasisHash: hash(
      row.index_basis_hash,
      "repository_topic_graph_state_invalid",
      true,
    ),
    indexJson: json(row.index_json, "{}"),
    indexStale: bool(row.index_stale),
    updatedAt: clean(row.updated_at),
  };
}
export function rebuildSynthesisTopicGraphNodeRow(
  row: SqlRow,
): SynthesisTopicGraphNodeRecord {
  return {
    topicId: required(row.topic_id, "repository_topic_graph_node_invalid"),
    title: required(row.title, "repository_topic_graph_node_invalid"),
    definition: clean(row.definition),
    aliasesJson: json(row.aliases_json),
    planningJson: json(row.planning_json, "{}"),
    nodeType: required(row.node_type, "repository_topic_graph_node_invalid"),
    definitionStatus: clean(row.definition_status),
    currentArtifactPath: clean(row.current_artifact_path),
    isRoot: bool(row.is_root),
    level: clean(row.level),
    paperCount: count(row.paper_count),
    lastSynthesisAt: clean(row.last_synthesis_at),
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at),
  };
}
export function rebuildSynthesisTopicGraphEdgeRow(
  row: SqlRow,
): SynthesisTopicGraphEdgeRecord {
  return {
    edgeId: required(row.edge_id, "repository_topic_graph_edge_invalid"),
    sourceTopicId: required(
      row.source_topic_id,
      "repository_topic_graph_edge_invalid",
    ),
    targetTopicId: required(
      row.target_topic_id,
      "repository_topic_graph_edge_invalid",
    ),
    relation: required(row.relation, "repository_topic_graph_edge_invalid"),
    status: required(row.status, "repository_topic_graph_edge_invalid"),
    confidence: optionalNumber(
      row.confidence,
      "repository_topic_graph_edge_invalid",
    ),
    provenanceJson: json(row.provenance_json),
    evidenceRefsJson: json(row.evidence_refs_json),
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at),
  };
}
export function rebuildSynthesisTopicGraphReviewItemRow(
  row: SqlRow,
): SynthesisTopicGraphReviewItemRecord {
  return {
    reviewId: required(row.review_id, "repository_topic_graph_review_invalid"),
    status: required(row.status, "repository_topic_graph_review_invalid"),
    sourceTopicId: required(
      row.source_topic_id,
      "repository_topic_graph_review_invalid",
    ),
    targetTopicId: required(
      row.target_topic_id,
      "repository_topic_graph_review_invalid",
    ),
    targetTitle: clean(row.target_title),
    relation: required(row.relation, "repository_topic_graph_review_invalid"),
    confidence: optionalNumber(
      row.confidence,
      "repository_topic_graph_review_invalid",
    ),
    provenanceJson: json(row.provenance_json),
    evidenceRefsJson: json(row.evidence_refs_json),
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at),
    resolvedAt: clean(row.resolved_at),
  };
}

export function ensureSynthesisTopicGraphApplicationRepositorySchema(
  db: SqlAdapter,
) {
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_topic_graph_application_state (singleton_id INTEGER PRIMARY KEY CHECK(singleton_id=1), manifest_hash TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, index_hash TEXT NOT NULL DEFAULT '', index_basis_hash TEXT NOT NULL DEFAULT '', index_json TEXT NOT NULL DEFAULT '{}', index_stale INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT '')`,
  );
  ensureSynthesisTopicGraphRowsSchema(db);
  db.run(
    `INSERT OR REPLACE INTO synt_schema_meta(key,value) VALUES(@key,@value)`,
    {
      key: SYNTHESIS_TOPIC_GRAPH_APPLICATION_REPOSITORY_SCHEMA_META_KEY,
      value: SYNTHESIS_TOPIC_GRAPH_APPLICATION_REPOSITORY_SCHEMA_VERSION,
    },
  );
}

export function ensureSynthesisTopicGraphRowsSchema(db: SqlAdapter) {
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_topic_graph_node (topic_id TEXT PRIMARY KEY, title TEXT NOT NULL, definition TEXT NOT NULL DEFAULT '', aliases_json TEXT NOT NULL DEFAULT '[]', planning_json TEXT NOT NULL DEFAULT '{}', node_type TEXT NOT NULL, definition_status TEXT NOT NULL DEFAULT '', current_artifact_path TEXT NOT NULL DEFAULT '', is_root INTEGER NOT NULL DEFAULT 0, level TEXT NOT NULL DEFAULT '', paper_count INTEGER NOT NULL DEFAULT 0, last_synthesis_at TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '')`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_topic_graph_edge (edge_id TEXT PRIMARY KEY, source_topic_id TEXT NOT NULL, target_topic_id TEXT NOT NULL, relation TEXT NOT NULL, status TEXT NOT NULL, confidence REAL, provenance_json TEXT NOT NULL DEFAULT '[]', evidence_refs_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '', UNIQUE(source_topic_id,target_topic_id,relation))`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS synt_topic_graph_review_item (review_id TEXT PRIMARY KEY, status TEXT NOT NULL, source_topic_id TEXT NOT NULL, target_topic_id TEXT NOT NULL, target_title TEXT NOT NULL DEFAULT '', relation TEXT NOT NULL, confidence REAL, provenance_json TEXT NOT NULL DEFAULT '[]', evidence_refs_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '', resolved_at TEXT NOT NULL DEFAULT '')`,
  );
  for (const sql of [
    `CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_node_type_updated ON synt_topic_graph_node(node_type,updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_node_definition_updated ON synt_topic_graph_node(definition_status,updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_edge_source_status ON synt_topic_graph_edge(source_topic_id,status)`,
    `CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_edge_target_status ON synt_topic_graph_edge(target_topic_id,status)`,
    `CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_edge_relation_status ON synt_topic_graph_edge(relation,status)`,
    `CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_review_status_updated ON synt_topic_graph_review_item(status,updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_review_source ON synt_topic_graph_review_item(source_topic_id,status)`,
    `CREATE INDEX IF NOT EXISTS idx_synt_topic_graph_review_target ON synt_topic_graph_review_item(target_topic_id,status)`,
  ]) {
    db.run(sql);
  }
}

export function getSynthesisTopicGraphApplicationState(db: SqlAdapter) {
  const row = db.get(
    `SELECT * FROM synt_topic_graph_application_state WHERE singleton_id=1 LIMIT 1`,
  );
  return row ? rebuildSynthesisTopicGraphApplicationStateRow(row) : null;
}
const list = <T>(db: SqlAdapter, sql: string, rebuild: (row: SqlRow) => T) =>
  db.all(sql).map(rebuild);
export const listSynthesisTopicGraphNodes = (db: SqlAdapter) =>
  list(
    db,
    `SELECT * FROM synt_topic_graph_node ORDER BY topic_id`,
    rebuildSynthesisTopicGraphNodeRow,
  );
export const listSynthesisTopicGraphEdges = (db: SqlAdapter) =>
  list(
    db,
    `SELECT * FROM synt_topic_graph_edge ORDER BY edge_id`,
    rebuildSynthesisTopicGraphEdgeRow,
  );
export const listSynthesisTopicGraphReviewItems = (db: SqlAdapter) =>
  list(
    db,
    `SELECT * FROM synt_topic_graph_review_item ORDER BY review_id`,
    rebuildSynthesisTopicGraphReviewItemRow,
  );

function insertRows(db: SqlAdapter, state: SynthesisTopicGraphStateRecords) {
  for (const raw of state.nodes) {
    const row = rebuildSynthesisTopicGraphNodeRow({
      topic_id: raw.topicId,
      title: raw.title,
      definition: raw.definition ?? "",
      aliases_json: raw.aliasesJson ?? "[]",
      planning_json: raw.planningJson ?? "{}",
      node_type: raw.nodeType,
      definition_status: raw.definitionStatus ?? "",
      current_artifact_path: raw.currentArtifactPath ?? "",
      is_root: raw.isRoot ? 1 : 0,
      level: raw.level ?? "",
      paper_count: raw.paperCount ?? 0,
      last_synthesis_at: raw.lastSynthesisAt ?? "",
      created_at: raw.createdAt ?? "",
      updated_at: raw.updatedAt ?? "",
    });
    db.run(
      `INSERT INTO synt_topic_graph_node(topic_id,title,definition,aliases_json,planning_json,node_type,definition_status,current_artifact_path,is_root,level,paper_count,last_synthesis_at,created_at,updated_at) VALUES(@topic_id,@title,@definition,@aliases_json,@planning_json,@node_type,@definition_status,@current_artifact_path,@is_root,@level,@paper_count,@last_synthesis_at,@created_at,@updated_at)`,
      {
        topic_id: row.topicId,
        title: row.title,
        definition: row.definition,
        aliases_json: row.aliasesJson,
        planning_json: row.planningJson,
        node_type: row.nodeType,
        definition_status: row.definitionStatus,
        current_artifact_path: row.currentArtifactPath,
        is_root: row.isRoot ? 1 : 0,
        level: row.level,
        paper_count: row.paperCount,
        last_synthesis_at: row.lastSynthesisAt,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      },
    );
  }
  for (const raw of state.edges) {
    const row = rebuildSynthesisTopicGraphEdgeRow({
      edge_id: raw.edgeId,
      source_topic_id: raw.sourceTopicId,
      target_topic_id: raw.targetTopicId,
      relation: raw.relation,
      status: raw.status,
      confidence: raw.confidence ?? null,
      provenance_json: raw.provenanceJson ?? "[]",
      evidence_refs_json: raw.evidenceRefsJson ?? "[]",
      created_at: raw.createdAt ?? "",
      updated_at: raw.updatedAt ?? "",
    });
    db.run(
      `INSERT INTO synt_topic_graph_edge VALUES(@edge_id,@source_topic_id,@target_topic_id,@relation,@status,@confidence,@provenance_json,@evidence_refs_json,@created_at,@updated_at)`,
      {
        edge_id: row.edgeId,
        source_topic_id: row.sourceTopicId,
        target_topic_id: row.targetTopicId,
        relation: row.relation,
        status: row.status,
        confidence: row.confidence,
        provenance_json: row.provenanceJson,
        evidence_refs_json: row.evidenceRefsJson,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      },
    );
  }
  for (const raw of state.reviewItems) {
    const row = rebuildSynthesisTopicGraphReviewItemRow({
      review_id: raw.reviewId,
      status: raw.status,
      source_topic_id: raw.sourceTopicId,
      target_topic_id: raw.targetTopicId,
      target_title: raw.targetTitle ?? "",
      relation: raw.relation,
      confidence: raw.confidence ?? null,
      provenance_json: raw.provenanceJson ?? "[]",
      evidence_refs_json: raw.evidenceRefsJson ?? "[]",
      created_at: raw.createdAt ?? "",
      updated_at: raw.updatedAt ?? "",
      resolved_at: raw.resolvedAt ?? "",
    });
    db.run(
      `INSERT INTO synt_topic_graph_review_item VALUES(@review_id,@status,@source_topic_id,@target_topic_id,@target_title,@relation,@confidence,@provenance_json,@evidence_refs_json,@created_at,@updated_at,@resolved_at)`,
      {
        review_id: row.reviewId,
        status: row.status,
        source_topic_id: row.sourceTopicId,
        target_topic_id: row.targetTopicId,
        target_title: row.targetTitle,
        relation: row.relation,
        confidence: row.confidence,
        provenance_json: row.provenanceJson,
        evidence_refs_json: row.evidenceRefsJson,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
        resolved_at: row.resolvedAt,
      },
    );
  }
}

export function replaceSynthesisTopicGraphState(
  db: SqlAdapter,
  args: {
    expectedManifestHash: string | null;
    manifestHash: string;
    state: SynthesisTopicGraphStateRecords;
    now: string;
  },
) {
  hash(args.manifestHash, "repository_topic_graph_state_invalid");
  return db.transaction(() => {
    const current = getSynthesisTopicGraphApplicationState(db);
    if ((current?.manifestHash ?? null) !== args.expectedManifestHash)
      return null;
    db.run(`DELETE FROM synt_topic_graph_review_item`);
    db.run(`DELETE FROM synt_topic_graph_edge`);
    db.run(`DELETE FROM synt_topic_graph_node`);
    insertRows(db, args.state);
    const revision = (current?.revision ?? 0) + 1;
    db.run(
      `INSERT OR REPLACE INTO synt_topic_graph_application_state(singleton_id,manifest_hash,revision,index_hash,index_basis_hash,index_json,index_stale,updated_at) VALUES(1,@manifest_hash,@revision,@index_hash,@index_basis_hash,@index_json,1,@updated_at)`,
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

export function promoteSynthesisTopicGraphIndex(
  db: SqlAdapter,
  args: {
    expectedManifestHash: string;
    indexHash: string;
    indexJson: string;
    now: string;
  },
) {
  hash(args.expectedManifestHash, "repository_topic_graph_index_invalid");
  hash(args.indexHash, "repository_topic_graph_index_invalid");
  const indexJson = json(args.indexJson, "{}");
  return db.transaction(() => {
    const current = getSynthesisTopicGraphApplicationState(db);
    if (!current || current.manifestHash !== args.expectedManifestHash)
      return false;
    db.run(
      `UPDATE synt_topic_graph_application_state SET index_hash=@index_hash,index_basis_hash=@basis,index_json=@index_json,index_stale=0,updated_at=@updated_at WHERE singleton_id=1`,
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

import type { SqlAdapter, SqlRow } from "./index.js";

export const SYNTHESIS_CITATION_GRAPH_APPLICATION_REPOSITORY_SCHEMA_VERSION =
  "synthesis-citation-graph-application-repository.v1" as const;
export const SYNTHESIS_CITATION_GRAPH_APPLICATION_REPOSITORY_SCHEMA_META_KEY =
  "citation_graph_application_schema_version" as const;

export const SYNTHESIS_CITATION_GRAPH_APPLICATION_REPOSITORY_TABLES = [
  "synt_citation_graph_application_state",
  "synt_citation_node",
  "synt_citation_edge",
  "synt_citation_source_ownership",
  "synt_citation_incoming_group",
  "synt_citation_metrics_light",
  "synt_citation_metrics_complex",
  "synt_citation_layout_state",
] as const;

export const SYNTHESIS_CITATION_GRAPH_APPLICATION_REPOSITORY_INDEXES = [
  "idx_synt_citation_edge_source",
  "idx_synt_citation_edge_target",
  "idx_synt_citation_metrics_complex_foundation",
  "idx_synt_citation_metrics_complex_frontier",
  "idx_synt_citation_metrics_complex_in_degree",
  "idx_synt_citation_metrics_complex_pagerank",
  "idx_synt_citation_metrics_complex_paper_ref",
  "idx_synt_citation_layout_graph",
] as const;

export type SynthesisCitationNodeRecord = {
  literatureItemId: string;
  nodeStatus: string;
  hasZoteroBinding: boolean;
  title?: string;
  year?: string;
  authorsJson?: string;
  summaryJson?: string;
  updatedAt?: string;
};

export type SynthesisCitationEdgeRecord = {
  edgeId: string;
  sourceLiteratureItemId: string;
  targetLiteratureItemId?: string;
  referenceInstanceId?: string;
  resolutionId?: string;
  edgeStatus: string;
  rolesJson?: string;
  weight?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisCitationSourceOwnershipRecord = {
  sourceLiteratureItemId: string;
  edgeId: string;
  referenceInstanceId?: string;
  targetLiteratureItemId?: string;
  edgeStatus: string;
  updatedAt?: string;
};

export type SynthesisCitationIncomingGroupRecord = {
  targetLiteratureItemId: string;
  sourceLiteratureItemId: string;
  edgeId: string;
  referenceInstanceId?: string;
  edgeStatus: string;
  updatedAt?: string;
};

export type SynthesisCitationLightMetricsRecord = {
  literatureItemId: string;
  outgoingCount: number;
  incomingCount: number;
  matchedOutgoingCount: number;
  unresolvedOutgoingCount: number;
  ambiguousOutgoingCount: number;
  localDegree: number;
  sourceStructureVersion: number;
  updatedAt?: string;
};

export type SynthesisCitationComplexMetricsRecord = {
  literatureItemId: string;
  nodeId: string;
  paperRef?: string;
  itemKey?: string;
  title?: string;
  year?: string;
  internalInDegree: number;
  internalOutDegree: number;
  externalReferenceCount: number;
  unresolvedReferenceCount: number;
  internalPagerank: number;
  componentId: string;
  componentSize: number;
  isIsolated: boolean;
  ageNorm: number;
  recencyNorm: number;
  inDegreeNorm: number;
  outDegreeNorm: number;
  pagerankNorm: number;
  foundationScore: number;
  frontierScore: number;
  synthesisRoleHintsJson?: string;
  sourceStructureVersion: number;
  sourceGraphHash: string;
  metricsHash: string;
  status: string;
  updatedAt?: string;
};

export type SynthesisCitationLayoutStatus =
  | "missing"
  | "ready"
  | "dirty"
  | "running"
  | "failed";

export type SynthesisCitationLayoutRecord = {
  layoutKey: string;
  viewKey: string;
  preset: string;
  graphHash: string;
  status: SynthesisCitationLayoutStatus;
  layoutJson?: string;
  diagnosticsJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SynthesisCitationGraphApplicationStateRecord = {
  graphHash: string;
  inputHash: string;
  metricsHash?: string;
  nodeCount: number;
  edgeCount: number;
  updatedAt?: string;
};

export type SynthesisCitationGraphStateReplacement = {
  nodes: SynthesisCitationNodeRecord[];
  edges?: SynthesisCitationEdgeRecord[];
  sourceOwnership?: SynthesisCitationSourceOwnershipRecord[];
  incomingGroups?: SynthesisCitationIncomingGroupRecord[];
  lightweightMetrics?: SynthesisCitationLightMetricsRecord[];
  complexMetrics?: SynthesisCitationComplexMetricsRecord[];
};

const clean = (value: unknown) => String(value ?? "").trim();
const count = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));
const number = (value: unknown) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

function layoutStatus(value: unknown): SynthesisCitationLayoutStatus {
  return value === "ready" ||
    value === "dirty" ||
    value === "running" ||
    value === "failed"
    ? value
    : "missing";
}

export function rebuildSynthesisCitationNodeRow(
  row: SqlRow,
): SynthesisCitationNodeRecord {
  const literatureItemId = clean(row.literature_item_id);
  if (!literatureItemId) throw new Error("repository_citation_node_invalid");
  return {
    literatureItemId,
    nodeStatus: clean(row.node_status) || "active",
    hasZoteroBinding: Boolean(Number(row.has_zotero_binding) || 0),
    title: clean(row.title) || undefined,
    year: clean(row.year) || undefined,
    authorsJson: clean(row.authors_json) || "[]",
    summaryJson: clean(row.summary_json) || "{}",
    updatedAt: clean(row.updated_at) || undefined,
  };
}

export function rebuildSynthesisCitationEdgeRow(
  row: SqlRow,
): SynthesisCitationEdgeRecord {
  const edgeId = clean(row.edge_id);
  const sourceLiteratureItemId = clean(row.source_literature_item_id);
  if (!edgeId || !sourceLiteratureItemId) {
    throw new Error("repository_citation_edge_invalid");
  }
  return {
    edgeId,
    sourceLiteratureItemId,
    targetLiteratureItemId: clean(row.target_literature_item_id) || undefined,
    referenceInstanceId: clean(row.reference_instance_id) || undefined,
    resolutionId: clean(row.resolution_id) || undefined,
    edgeStatus: clean(row.edge_status) || "unbound",
    rolesJson: clean(row.roles_json) || "[]",
    weight: number(row.weight),
    createdAt: clean(row.created_at) || undefined,
    updatedAt: clean(row.updated_at) || undefined,
  };
}

export function rebuildSynthesisCitationSourceOwnershipRow(
  row: SqlRow,
): SynthesisCitationSourceOwnershipRecord {
  const sourceLiteratureItemId = clean(row.source_literature_item_id);
  const edgeId = clean(row.edge_id);
  if (!sourceLiteratureItemId || !edgeId) {
    throw new Error("repository_citation_ownership_invalid");
  }
  return {
    sourceLiteratureItemId,
    edgeId,
    referenceInstanceId: clean(row.reference_instance_id) || undefined,
    targetLiteratureItemId: clean(row.target_literature_item_id) || undefined,
    edgeStatus: clean(row.edge_status) || "unbound",
    updatedAt: clean(row.updated_at) || undefined,
  };
}

export function rebuildSynthesisCitationIncomingGroupRow(
  row: SqlRow,
): SynthesisCitationIncomingGroupRecord {
  const targetLiteratureItemId = clean(row.target_literature_item_id);
  const sourceLiteratureItemId = clean(row.source_literature_item_id);
  const edgeId = clean(row.edge_id);
  if (!targetLiteratureItemId || !sourceLiteratureItemId || !edgeId) {
    throw new Error("repository_citation_incoming_invalid");
  }
  return {
    targetLiteratureItemId,
    sourceLiteratureItemId,
    edgeId,
    referenceInstanceId: clean(row.reference_instance_id) || undefined,
    edgeStatus: clean(row.edge_status) || "unbound",
    updatedAt: clean(row.updated_at) || undefined,
  };
}

export function rebuildSynthesisCitationLightMetricsRow(
  row: SqlRow,
): SynthesisCitationLightMetricsRecord {
  const literatureItemId = clean(row.literature_item_id);
  if (!literatureItemId) {
    throw new Error("repository_citation_light_metrics_invalid");
  }
  return {
    literatureItemId,
    outgoingCount: count(row.outgoing_count),
    incomingCount: count(row.incoming_count),
    matchedOutgoingCount: count(row.matched_outgoing_count),
    unresolvedOutgoingCount: count(row.unresolved_outgoing_count),
    ambiguousOutgoingCount: count(row.ambiguous_outgoing_count),
    localDegree: count(row.local_degree),
    sourceStructureVersion: count(row.source_structure_version),
    updatedAt: clean(row.updated_at) || undefined,
  };
}

export function rebuildSynthesisCitationComplexMetricsRow(
  row: SqlRow,
): SynthesisCitationComplexMetricsRecord {
  const literatureItemId = clean(row.literature_item_id);
  const nodeId = clean(row.node_id);
  if (!literatureItemId || !nodeId) {
    throw new Error("repository_citation_complex_metrics_invalid");
  }
  return {
    literatureItemId,
    nodeId,
    paperRef: clean(row.paper_ref) || undefined,
    itemKey: clean(row.item_key) || undefined,
    title: clean(row.title) || undefined,
    year: clean(row.year) || undefined,
    internalInDegree: count(row.internal_in_degree),
    internalOutDegree: count(row.internal_out_degree),
    externalReferenceCount: count(row.external_reference_count),
    unresolvedReferenceCount: count(row.unresolved_reference_count),
    internalPagerank: number(row.internal_pagerank),
    componentId: clean(row.component_id),
    componentSize: count(row.component_size),
    isIsolated: Boolean(Number(row.is_isolated) || 0),
    ageNorm: number(row.age_norm),
    recencyNorm: number(row.recency_norm),
    inDegreeNorm: number(row.in_degree_norm),
    outDegreeNorm: number(row.out_degree_norm),
    pagerankNorm: number(row.pagerank_norm),
    foundationScore: number(row.foundation_score),
    frontierScore: number(row.frontier_score),
    synthesisRoleHintsJson: clean(row.synthesis_role_hints_json) || "[]",
    sourceStructureVersion: count(row.source_structure_version),
    sourceGraphHash: clean(row.source_graph_hash),
    metricsHash: clean(row.metrics_hash),
    status: clean(row.status) || "ready",
    updatedAt: clean(row.updated_at) || undefined,
  };
}

export function rebuildSynthesisCitationLayoutRow(
  row: SqlRow,
): SynthesisCitationLayoutRecord {
  const layoutKey = clean(row.layout_key);
  if (!layoutKey) throw new Error("repository_citation_layout_invalid");
  return {
    layoutKey,
    viewKey: clean(row.view_key) || "workbench_overview",
    preset: clean(row.preset) || "force",
    graphHash: clean(row.graph_hash),
    status: layoutStatus(row.status),
    layoutJson: clean(row.layout_json) || "{}",
    diagnosticsJson: clean(row.diagnostics_json) || "[]",
    createdAt: clean(row.created_at) || undefined,
    updatedAt: clean(row.updated_at) || undefined,
  };
}

export function rebuildSynthesisCitationGraphApplicationStateRow(
  row: SqlRow,
): SynthesisCitationGraphApplicationStateRecord {
  const graphHash = clean(row.graph_hash);
  const inputHash = clean(row.input_hash);
  if (!graphHash || !inputHash) {
    throw new Error("repository_citation_graph_application_state_invalid");
  }
  return {
    graphHash,
    inputHash,
    metricsHash: clean(row.metrics_hash) || undefined,
    nodeCount: count(row.node_count),
    edgeCount: count(row.edge_count),
    updatedAt: clean(row.updated_at) || undefined,
  };
}

export function ensureSynthesisCitationGraphProjectionSchema(
  db: SqlAdapter,
  options: { indexes?: boolean } = {},
) {
  db.run(`CREATE TABLE IF NOT EXISTS synt_citation_node (
    literature_item_id TEXT PRIMARY KEY, node_status TEXT NOT NULL DEFAULT 'active',
    has_zotero_binding INTEGER NOT NULL DEFAULT 0, title TEXT NOT NULL DEFAULT '',
    year TEXT NOT NULL DEFAULT '', authors_json TEXT NOT NULL DEFAULT '[]',
    summary_json TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_citation_edge (
    edge_id TEXT PRIMARY KEY, source_literature_item_id TEXT NOT NULL,
    target_literature_item_id TEXT NOT NULL DEFAULT '', reference_instance_id TEXT NOT NULL DEFAULT '',
    resolution_id TEXT NOT NULL DEFAULT '', edge_status TEXT NOT NULL DEFAULT 'unbound',
    roles_json TEXT NOT NULL DEFAULT '[]', weight REAL NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '',
    UNIQUE(source_literature_item_id, reference_instance_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_citation_source_ownership (
    source_literature_item_id TEXT NOT NULL, edge_id TEXT NOT NULL,
    reference_instance_id TEXT NOT NULL DEFAULT '', target_literature_item_id TEXT NOT NULL DEFAULT '',
    edge_status TEXT NOT NULL DEFAULT 'unbound', updated_at TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (source_literature_item_id, edge_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_citation_incoming_group (
    target_literature_item_id TEXT NOT NULL, source_literature_item_id TEXT NOT NULL,
    edge_id TEXT NOT NULL, reference_instance_id TEXT NOT NULL DEFAULT '',
    edge_status TEXT NOT NULL DEFAULT 'unbound', updated_at TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (target_literature_item_id, edge_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_citation_metrics_light (
    literature_item_id TEXT PRIMARY KEY, outgoing_count INTEGER NOT NULL DEFAULT 0,
    incoming_count INTEGER NOT NULL DEFAULT 0, matched_outgoing_count INTEGER NOT NULL DEFAULT 0,
    unresolved_outgoing_count INTEGER NOT NULL DEFAULT 0, ambiguous_outgoing_count INTEGER NOT NULL DEFAULT 0,
    local_degree INTEGER NOT NULL DEFAULT 0, source_structure_version INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_citation_metrics_complex (
    literature_item_id TEXT PRIMARY KEY, node_id TEXT NOT NULL DEFAULT '', paper_ref TEXT NOT NULL DEFAULT '',
    item_key TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '', year TEXT NOT NULL DEFAULT '',
    internal_in_degree INTEGER NOT NULL DEFAULT 0, internal_out_degree INTEGER NOT NULL DEFAULT 0,
    external_reference_count INTEGER NOT NULL DEFAULT 0, unresolved_reference_count INTEGER NOT NULL DEFAULT 0,
    internal_pagerank REAL NOT NULL DEFAULT 0, component_id TEXT NOT NULL DEFAULT '',
    component_size INTEGER NOT NULL DEFAULT 0, is_isolated INTEGER NOT NULL DEFAULT 0,
    age_norm REAL NOT NULL DEFAULT 0, recency_norm REAL NOT NULL DEFAULT 0,
    in_degree_norm REAL NOT NULL DEFAULT 0, out_degree_norm REAL NOT NULL DEFAULT 0,
    pagerank_norm REAL NOT NULL DEFAULT 0, foundation_score REAL NOT NULL DEFAULT 0,
    frontier_score REAL NOT NULL DEFAULT 0, synthesis_role_hints_json TEXT NOT NULL DEFAULT '[]',
    source_structure_version INTEGER NOT NULL DEFAULT 0, source_graph_hash TEXT NOT NULL DEFAULT '',
    metrics_hash TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'ready',
    updated_at TEXT NOT NULL DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS synt_citation_layout_state (
    layout_key TEXT PRIMARY KEY, view_key TEXT NOT NULL DEFAULT 'workbench_overview',
    preset TEXT NOT NULL DEFAULT 'force', graph_hash TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'missing', layout_json TEXT NOT NULL DEFAULT '{}',
    diagnostics_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT '', UNIQUE(view_key, preset)
  )`);
  if (options.indexes === false) return;
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_synt_citation_edge_source ON synt_citation_edge(source_literature_item_id, edge_id)",
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_synt_citation_edge_target ON synt_citation_edge(target_literature_item_id, edge_id)",
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_synt_citation_metrics_complex_foundation ON synt_citation_metrics_complex(foundation_score DESC, literature_item_id ASC)",
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_synt_citation_metrics_complex_frontier ON synt_citation_metrics_complex(frontier_score DESC, literature_item_id ASC)",
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_synt_citation_metrics_complex_in_degree ON synt_citation_metrics_complex(internal_in_degree DESC, literature_item_id ASC)",
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_synt_citation_metrics_complex_pagerank ON synt_citation_metrics_complex(internal_pagerank DESC, literature_item_id ASC)",
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_synt_citation_metrics_complex_paper_ref ON synt_citation_metrics_complex(paper_ref, literature_item_id ASC)",
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_synt_citation_layout_graph ON synt_citation_layout_state(graph_hash, preset, view_key)",
  );
}

export function ensureSynthesisCitationGraphApplicationRepositorySchema(
  db: SqlAdapter,
) {
  const current = clean(
    db.get("SELECT value FROM synt_schema_meta WHERE key=@key LIMIT 1", {
      key: SYNTHESIS_CITATION_GRAPH_APPLICATION_REPOSITORY_SCHEMA_META_KEY,
    })?.value,
  );
  if (
    current &&
    current !== SYNTHESIS_CITATION_GRAPH_APPLICATION_REPOSITORY_SCHEMA_VERSION
  ) {
    throw new Error("repository_citation_graph_application_schema_unsupported");
  }
  db.run(`CREATE TABLE IF NOT EXISTS synt_citation_graph_application_state (
    singleton_id TEXT PRIMARY KEY CHECK (singleton_id='active'),
    graph_hash TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    metrics_hash TEXT NOT NULL DEFAULT '',
    node_count INTEGER NOT NULL DEFAULT 0,
    edge_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT ''
  )`);
  ensureSynthesisCitationGraphProjectionSchema(db);
  db.run(
    "INSERT OR REPLACE INTO synt_schema_meta(key, value) VALUES (@key, @value)",
    {
      key: SYNTHESIS_CITATION_GRAPH_APPLICATION_REPOSITORY_SCHEMA_META_KEY,
      value: SYNTHESIS_CITATION_GRAPH_APPLICATION_REPOSITORY_SCHEMA_VERSION,
    },
  );
}

export function getSynthesisCitationGraphApplicationState(db: SqlAdapter) {
  const row = db.get(
    "SELECT * FROM synt_citation_graph_application_state WHERE singleton_id='active' LIMIT 1",
  );
  return row ? rebuildSynthesisCitationGraphApplicationStateRow(row) : null;
}

export function upsertSynthesisCitationNode(
  db: SqlAdapter,
  row: SynthesisCitationNodeRecord,
  now: string,
) {
  db.run(
    `INSERT OR REPLACE INTO synt_citation_node
    (literature_item_id,node_status,has_zotero_binding,title,year,authors_json,summary_json,updated_at)
    VALUES (@literature_item_id,@node_status,@has_zotero_binding,@title,@year,@authors_json,@summary_json,@updated_at)`,
    {
      literature_item_id: clean(row.literatureItemId),
      node_status: clean(row.nodeStatus) || "active",
      has_zotero_binding: row.hasZoteroBinding ? 1 : 0,
      title: clean(row.title),
      year: clean(row.year),
      authors_json: clean(row.authorsJson) || "[]",
      summary_json: clean(row.summaryJson) || "{}",
      updated_at: clean(row.updatedAt) || now,
    },
  );
}

export function upsertSynthesisCitationEdge(
  db: SqlAdapter,
  row: SynthesisCitationEdgeRecord,
  now: string,
) {
  db.run(
    `INSERT OR REPLACE INTO synt_citation_edge
    (edge_id,source_literature_item_id,target_literature_item_id,reference_instance_id,resolution_id,edge_status,roles_json,weight,created_at,updated_at)
    VALUES (@edge_id,@source_literature_item_id,@target_literature_item_id,@reference_instance_id,@resolution_id,@edge_status,@roles_json,@weight,@created_at,@updated_at)`,
    {
      edge_id: clean(row.edgeId),
      source_literature_item_id: clean(row.sourceLiteratureItemId),
      target_literature_item_id: clean(row.targetLiteratureItemId),
      reference_instance_id: clean(row.referenceInstanceId),
      resolution_id: clean(row.resolutionId),
      edge_status: clean(row.edgeStatus) || "unbound",
      roles_json: clean(row.rolesJson) || "[]",
      weight: Number.isFinite(Number(row.weight)) ? Number(row.weight) : 1,
      created_at: clean(row.createdAt) || now,
      updated_at: clean(row.updatedAt) || now,
    },
  );
}

export function upsertSynthesisCitationSourceOwnership(
  db: SqlAdapter,
  row: SynthesisCitationSourceOwnershipRecord,
  now: string,
) {
  db.run(
    `INSERT OR REPLACE INTO synt_citation_source_ownership
    (source_literature_item_id,edge_id,reference_instance_id,target_literature_item_id,edge_status,updated_at)
    VALUES (@source_literature_item_id,@edge_id,@reference_instance_id,@target_literature_item_id,@edge_status,@updated_at)`,
    {
      source_literature_item_id: clean(row.sourceLiteratureItemId),
      edge_id: clean(row.edgeId),
      reference_instance_id: clean(row.referenceInstanceId),
      target_literature_item_id: clean(row.targetLiteratureItemId),
      edge_status: clean(row.edgeStatus) || "unbound",
      updated_at: clean(row.updatedAt) || now,
    },
  );
}

export function upsertSynthesisCitationIncomingGroup(
  db: SqlAdapter,
  row: SynthesisCitationIncomingGroupRecord,
  now: string,
) {
  db.run(
    `INSERT OR REPLACE INTO synt_citation_incoming_group
    (target_literature_item_id,source_literature_item_id,edge_id,reference_instance_id,edge_status,updated_at)
    VALUES (@target_literature_item_id,@source_literature_item_id,@edge_id,@reference_instance_id,@edge_status,@updated_at)`,
    {
      target_literature_item_id: clean(row.targetLiteratureItemId),
      source_literature_item_id: clean(row.sourceLiteratureItemId),
      edge_id: clean(row.edgeId),
      reference_instance_id: clean(row.referenceInstanceId),
      edge_status: clean(row.edgeStatus) || "unbound",
      updated_at: clean(row.updatedAt) || now,
    },
  );
}

export function upsertSynthesisCitationLightMetrics(
  db: SqlAdapter,
  row: SynthesisCitationLightMetricsRecord,
  now: string,
) {
  db.run(
    `INSERT OR REPLACE INTO synt_citation_metrics_light
    (literature_item_id,outgoing_count,incoming_count,matched_outgoing_count,unresolved_outgoing_count,ambiguous_outgoing_count,local_degree,source_structure_version,updated_at)
    VALUES (@literature_item_id,@outgoing_count,@incoming_count,@matched_outgoing_count,@unresolved_outgoing_count,@ambiguous_outgoing_count,@local_degree,@source_structure_version,@updated_at)`,
    {
      literature_item_id: clean(row.literatureItemId),
      outgoing_count: count(row.outgoingCount),
      incoming_count: count(row.incomingCount),
      matched_outgoing_count: count(row.matchedOutgoingCount),
      unresolved_outgoing_count: count(row.unresolvedOutgoingCount),
      ambiguous_outgoing_count: count(row.ambiguousOutgoingCount),
      local_degree: count(row.localDegree),
      source_structure_version: count(row.sourceStructureVersion),
      updated_at: clean(row.updatedAt) || now,
    },
  );
}

export function upsertSynthesisCitationComplexMetrics(
  db: SqlAdapter,
  row: SynthesisCitationComplexMetricsRecord,
  now: string,
) {
  db.run(
    `INSERT OR REPLACE INTO synt_citation_metrics_complex
    (literature_item_id,node_id,paper_ref,item_key,title,year,internal_in_degree,internal_out_degree,external_reference_count,
     unresolved_reference_count,internal_pagerank,component_id,component_size,is_isolated,age_norm,recency_norm,in_degree_norm,
     out_degree_norm,pagerank_norm,foundation_score,frontier_score,synthesis_role_hints_json,source_structure_version,source_graph_hash,
     metrics_hash,status,updated_at)
    VALUES (@literature_item_id,@node_id,@paper_ref,@item_key,@title,@year,@internal_in_degree,@internal_out_degree,@external_reference_count,
     @unresolved_reference_count,@internal_pagerank,@component_id,@component_size,@is_isolated,@age_norm,@recency_norm,@in_degree_norm,
     @out_degree_norm,@pagerank_norm,@foundation_score,@frontier_score,@synthesis_role_hints_json,@source_structure_version,@source_graph_hash,
     @metrics_hash,@status,@updated_at)`,
    {
      literature_item_id: clean(row.literatureItemId),
      node_id: clean(row.nodeId),
      paper_ref: clean(row.paperRef),
      item_key: clean(row.itemKey),
      title: clean(row.title),
      year: clean(row.year),
      internal_in_degree: count(row.internalInDegree),
      internal_out_degree: count(row.internalOutDegree),
      external_reference_count: count(row.externalReferenceCount),
      unresolved_reference_count: count(row.unresolvedReferenceCount),
      internal_pagerank: number(row.internalPagerank),
      component_id: clean(row.componentId),
      component_size: count(row.componentSize),
      is_isolated: row.isIsolated ? 1 : 0,
      age_norm: number(row.ageNorm),
      recency_norm: number(row.recencyNorm),
      in_degree_norm: number(row.inDegreeNorm),
      out_degree_norm: number(row.outDegreeNorm),
      pagerank_norm: number(row.pagerankNorm),
      foundation_score: number(row.foundationScore),
      frontier_score: number(row.frontierScore),
      synthesis_role_hints_json: clean(row.synthesisRoleHintsJson) || "[]",
      source_structure_version: count(row.sourceStructureVersion),
      source_graph_hash: clean(row.sourceGraphHash),
      metrics_hash: clean(row.metricsHash),
      status: clean(row.status) || "ready",
      updated_at: clean(row.updatedAt) || now,
    },
  );
}

export function upsertSynthesisCitationLayout(
  db: SqlAdapter,
  row: SynthesisCitationLayoutRecord,
  now: string,
) {
  const viewKey = clean(row.viewKey) || "workbench_overview";
  const preset = clean(row.preset) || "force";
  const layoutKey = clean(row.layoutKey) || `${viewKey}:${preset}`;
  const createdAt =
    clean(
      db.get(
        "SELECT created_at FROM synt_citation_layout_state WHERE layout_key=@layout_key LIMIT 1",
        { layout_key: layoutKey },
      )?.created_at,
    ) ||
    clean(row.createdAt) ||
    now;
  db.run(
    `INSERT OR REPLACE INTO synt_citation_layout_state
      (layout_key,view_key,preset,graph_hash,status,layout_json,diagnostics_json,created_at,updated_at)
      VALUES (@layout_key,@view_key,@preset,@graph_hash,@status,@layout_json,@diagnostics_json,@created_at,@updated_at)`,
    {
      layout_key: layoutKey,
      view_key: viewKey,
      preset,
      graph_hash: clean(row.graphHash),
      status: layoutStatus(row.status),
      layout_json: clean(row.layoutJson) || "{}",
      diagnostics_json: clean(row.diagnosticsJson) || "[]",
      created_at: createdAt,
      updated_at: clean(row.updatedAt) || now,
    },
  );
}

export function replaceSynthesisCitationGraphApplicationState(
  db: SqlAdapter,
  args: {
    expectedGraphHash: string | null;
    graphHash: string;
    inputHash: string;
    state: SynthesisCitationGraphStateReplacement;
    now: string;
  },
) {
  return db.transaction(() => {
    const current = getSynthesisCitationGraphApplicationState(db);
    if ((current?.graphHash ?? null) !== args.expectedGraphHash) return false;
    replaceSynthesisCitationGraphRows(db, args.state, args.now, {
      clearLayouts: true,
    });
    db.run(
      `INSERT OR REPLACE INTO synt_citation_graph_application_state
      (singleton_id,graph_hash,input_hash,metrics_hash,node_count,edge_count,updated_at)
      VALUES ('active',@graph_hash,@input_hash,'',@node_count,@edge_count,@updated_at)`,
      {
        graph_hash: args.graphHash,
        input_hash: args.inputHash,
        node_count: args.state.nodes.length,
        edge_count: args.state.edges?.length ?? 0,
        updated_at: args.now,
      },
    );
    return true;
  });
}

export function replaceSynthesisCitationGraphRows(
  db: SqlAdapter,
  state: SynthesisCitationGraphStateReplacement,
  now: string,
  options: { clearLayouts?: boolean } = {},
) {
  for (const table of [
    "synt_citation_metrics_light",
    "synt_citation_metrics_complex",
    "synt_citation_incoming_group",
    "synt_citation_source_ownership",
    "synt_citation_edge",
    "synt_citation_node",
    ...(options.clearLayouts ? ["synt_citation_layout_state"] : []),
  ]) {
    db.run(`DELETE FROM ${table}`);
  }
  for (const row of state.nodes) upsertSynthesisCitationNode(db, row, now);
  for (const row of state.edges ?? [])
    upsertSynthesisCitationEdge(db, row, now);
  for (const row of state.sourceOwnership ?? [])
    upsertSynthesisCitationSourceOwnership(db, row, now);
  for (const row of state.incomingGroups ?? [])
    upsertSynthesisCitationIncomingGroup(db, row, now);
  for (const row of state.lightweightMetrics ?? [])
    upsertSynthesisCitationLightMetrics(db, row, now);
  for (const row of state.complexMetrics ?? [])
    upsertSynthesisCitationComplexMetrics(db, row, now);
}

export function promoteSynthesisCitationGraphComplexMetrics(
  db: SqlAdapter,
  args: {
    expectedGraphHash: string;
    metricsHash: string;
    records: SynthesisCitationComplexMetricsRecord[];
    now: string;
  },
) {
  return db.transaction(() => {
    if (
      getSynthesisCitationGraphApplicationState(db)?.graphHash !==
      args.expectedGraphHash
    )
      return false;
    db.run("DELETE FROM synt_citation_metrics_complex");
    for (const row of args.records)
      upsertSynthesisCitationComplexMetrics(db, row, args.now);
    db.run(
      "UPDATE synt_citation_graph_application_state SET metrics_hash=@metrics_hash, updated_at=@updated_at WHERE singleton_id='active' AND graph_hash=@graph_hash",
      {
        metrics_hash: args.metricsHash,
        updated_at: args.now,
        graph_hash: args.expectedGraphHash,
      },
    );
    return true;
  });
}

export function promoteSynthesisCitationGraphLayout(
  db: SqlAdapter,
  args: {
    expectedGraphHash: string;
    record: SynthesisCitationLayoutRecord;
    now: string;
  },
) {
  return db.transaction(() => {
    if (
      getSynthesisCitationGraphApplicationState(db)?.graphHash !==
      args.expectedGraphHash
    )
      return false;
    upsertSynthesisCitationLayout(
      db,
      { ...args.record, graphHash: args.expectedGraphHash },
      args.now,
    );
    return true;
  });
}

export const listSynthesisCitationNodes = (db: SqlAdapter) =>
  db
    .all("SELECT * FROM synt_citation_node ORDER BY literature_item_id ASC")
    .map(rebuildSynthesisCitationNodeRow);
export const listSynthesisCitationEdges = (db: SqlAdapter) =>
  db
    .all(
      "SELECT * FROM synt_citation_edge ORDER BY source_literature_item_id ASC, edge_id ASC",
    )
    .map(rebuildSynthesisCitationEdgeRow);
export const listSynthesisCitationSourceOwnership = (db: SqlAdapter) =>
  db
    .all(
      "SELECT * FROM synt_citation_source_ownership ORDER BY source_literature_item_id ASC, edge_id ASC",
    )
    .map(rebuildSynthesisCitationSourceOwnershipRow);
export const listSynthesisCitationIncomingGroups = (db: SqlAdapter) =>
  db
    .all(
      "SELECT * FROM synt_citation_incoming_group ORDER BY target_literature_item_id ASC, edge_id ASC",
    )
    .map(rebuildSynthesisCitationIncomingGroupRow);
export const listSynthesisCitationLightMetrics = (db: SqlAdapter) =>
  db
    .all(
      "SELECT * FROM synt_citation_metrics_light ORDER BY literature_item_id ASC",
    )
    .map(rebuildSynthesisCitationLightMetricsRow);
export const listSynthesisCitationComplexMetrics = (db: SqlAdapter) =>
  db
    .all("SELECT * FROM synt_citation_metrics_complex")
    .map(rebuildSynthesisCitationComplexMetricsRow);
export function getSynthesisCitationLayout(db: SqlAdapter, layoutKey: string) {
  const row = db.get(
    "SELECT * FROM synt_citation_layout_state WHERE layout_key=@layout_key LIMIT 1",
    { layout_key: clean(layoutKey) },
  );
  return row ? rebuildSynthesisCitationLayoutRow(row) : null;
}
export const listSynthesisCitationLayouts = (db: SqlAdapter) =>
  db
    .all(
      "SELECT * FROM synt_citation_layout_state ORDER BY view_key ASC, preset ASC",
    )
    .map(rebuildSynthesisCitationLayoutRow);

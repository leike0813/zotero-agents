import type { SynthesisClientPort } from "../synthesisClient/clientPortAdapter";
import type {
  SynthesisWorkbenchReadState,
  SynthesisWorkbenchSurfaceName,
  SynthesisWorkbenchSurfaceProjection,
} from "../../../packages/synthesis-contracts/src";
import { rebuildSynthesisWorkbenchReadState } from "../../../packages/synthesis-contracts/src";
import type { ReadonlySqliteDatabase } from "./sqliteReadonly";

type ReadonlyPortOptions = {
  database: ReadonlySqliteDatabase;
  libraryId: number;
};

const READONLY_ROW_LIMIT = 200;

function text(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function jsonValue<T>(value: unknown, fallback: T): T {
  try {
    return typeof value === "string" ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function boundedRows(database: ReadonlySqliteDatabase, table: string) {
  try {
    return database.all(
      `SELECT * FROM ${table} ORDER BY rowid LIMIT ${READONLY_ROW_LIMIT}`,
    );
  } catch {
    return [];
  }
}

function firstRow(database: ReadonlySqliteDatabase, table: string) {
  try {
    return database.get(`SELECT * FROM ${table} ORDER BY rowid LIMIT 1`);
  } catch {
    return null;
  }
}

function rowCount(database: ReadonlySqliteDatabase, table: string) {
  try {
    return numberValue(
      database.get(`SELECT COUNT(*) AS count FROM ${table}`)?.count,
    );
  } catch {
    return 0;
  }
}

function openRowCount(database: ReadonlySqliteDatabase, table: string) {
  try {
    return numberValue(
      database.get(
        `SELECT COUNT(*) AS count FROM ${table} WHERE status = @status`,
        {
          status: "open",
        },
      )?.count,
    );
  } catch {
    return 0;
  }
}

const EMPTY_REVIEW_SUMMARY = {
  openCount: 0,
  indexCount: 0,
  referenceMatchingCount: 0,
  conceptCount: 0,
  topicGraphCount: 0,
};

function emptyReferenceCacheStatus() {
  return {
    cache_key: "reference-sidecar:library" as const,
    status: "missing" as const,
    source_hash: "",
    basis_hash: "",
    refreshed_at: "",
    updated_at: "",
    diagnostics: [],
    allowed_actions: [],
  };
}

function emptyTopicPage() {
  return {
    cursor: "",
    next_cursor: "",
    has_more: false,
    returned: 0,
    total: 0,
    limit: 50,
  };
}

function emptyTopicGraph() {
  return {
    nodes: [],
    edges: [],
    reviewItems: [],
    manifest: {
      manifest_hash: null,
      node_count: 0,
      edge_count: 0,
      review_count: 0,
      updated_at: "",
    },
    projection: {
      target: "topic-graph-index",
      stale: false,
      last_rebuild_at: "",
      diagnostics: [],
    },
    diagnostics: [],
  };
}

function emptyConcepts() {
  return {
    concepts: [],
    senses: [],
    aliases: [],
    relations: [],
    manifest: {
      manifest_hash: null,
      concept_count: 0,
      sense_count: 0,
      alias_count: 0,
      relation_count: 0,
      updated_at: "",
      projection_target: "concept-kb-index" as const,
    },
    projection: {
      target: "concept-kb-index",
      stale: false,
      last_rebuild_at: "",
      diagnostics: [],
    },
    diagnostics: [],
    overlayEntries: [],
    reviewItems: [],
    topicLinks: [],
  };
}

function readonlyTopics(database: ReadonlySqliteDatabase) {
  const rows = boundedRows(database, "synt_topic_application_state");
  const total = rowCount(database, "synt_topic_application_state");
  const deletedRows = boundedRows(database, "synt_topic_deleted_artifact");
  return {
    artifacts: rows.map((row) => ({
      id: text(row.topic_id),
      title: text(row.title) || text(row.topic_id),
      kind: "topic_synthesis" as const,
      source_materials_status: "complete" as const,
      source_materials_percent: 100,
      freshness: "fresh" as const,
      updated_at: text(row.updated_at),
      definition: text(row.definition),
      paper_count: numberValue(row.paper_count),
      language: text(row.language) || "auto",
    })),
    deletedArtifacts: {
      rows: deletedRows.map((row) => ({
        topic_id: text(row.topic_id),
        title: text(row.title) || text(row.topic_id),
        deleted_at: text(row.deleted_at),
      })),
      total: rowCount(database, "synt_topic_deleted_artifact"),
    },
    topicPage: {
      cursor: "",
      next_cursor: total > rows.length ? String(rows.length) : "",
      has_more: total > rows.length,
      returned: rows.length,
      total,
      limit: READONLY_ROW_LIMIT,
    },
  };
}

function readonlyTopicGraph(database: ReadonlySqliteDatabase) {
  const state = firstRow(database, "synt_topic_graph_application_state");
  const nodes = boundedRows(database, "synt_topic_graph_node").map((row) => ({
    topic_id: text(row.topic_id),
    title: text(row.title),
    definition: text(row.definition),
    aliases: jsonValue<string[]>(row.aliases_json, []),
    node_type:
      text(row.node_type) === "placeholder" ? "placeholder" : "materialized",
    definition_status: [
      "has_synthesis",
      "placeholder",
      "deleted",
      "stale",
    ].includes(text(row.definition_status))
      ? text(row.definition_status)
      : "placeholder",
    current_artifact_path: text(row.current_artifact_path),
    is_root: numberValue(row.is_root) === 1,
    level: ["top", "normal"].includes(text(row.level)) ? text(row.level) : "",
    paper_count: numberValue(row.paper_count),
    last_synthesis_at: text(row.last_synthesis_at),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
    planning: jsonValue<Record<string, unknown>>(row.planning_json, {}),
  }));
  const edges = boundedRows(database, "synt_topic_graph_edge").map((row) => ({
    edge_id: text(row.edge_id),
    source_topic_id: text(row.source_topic_id),
    target_topic_id: text(row.target_topic_id),
    relation: text(row.relation),
    status: text(row.status),
    confidence: row.confidence == null ? null : numberValue(row.confidence),
    provenance: jsonValue(row.provenance_json, []),
    evidence_refs: jsonValue(row.evidence_refs_json, []),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
  }));
  const reviewItems = boundedRows(database, "synt_topic_graph_review_item").map(
    (row) => ({
      review_id: text(row.review_id),
      status: text(row.status),
      source_topic_id: text(row.source_topic_id),
      target_topic_id: text(row.target_topic_id),
      target_title: text(row.target_title),
      relation: text(row.relation),
      confidence: row.confidence == null ? null : numberValue(row.confidence),
      provenance: jsonValue(row.provenance_json, []),
      evidence_refs: jsonValue(row.evidence_refs_json, []),
      created_at: text(row.created_at),
      updated_at: text(row.updated_at),
      resolved_at: text(row.resolved_at),
    }),
  );
  return {
    nodes,
    edges,
    reviewItems,
    manifest: {
      manifest_hash: state ? text(state.manifest_hash) || null : null,
      node_count: rowCount(database, "synt_topic_graph_node"),
      edge_count: rowCount(database, "synt_topic_graph_edge"),
      review_count: rowCount(database, "synt_topic_graph_review_item"),
      updated_at: text(state?.updated_at),
    },
    projection: {
      target: "topic-graph-index",
      stale: numberValue(state?.index_stale) === 1,
      last_rebuild_at: text(state?.updated_at),
      diagnostics: [],
    },
    diagnostics: [],
  };
}

function readonlyConcepts(database: ReadonlySqliteDatabase) {
  const state = firstRow(database, "synt_concept_application_state");
  const concepts = boundedRows(database, "synt_concept").map((row) => ({
    concept_id: text(row.concept_id),
    label: text(row.label),
    aliases: jsonValue<string[]>(row.aliases_json, []),
    concept_type: text(row.concept_type),
    domain: text(row.domain),
    status: text(row.status),
    short_definition: text(row.short_definition),
    definition: text(row.definition),
    usage_note: text(row.usage_note),
    editorial_note: text(row.editorial_note),
    sense_ids: jsonValue<string[]>(row.sense_ids_json, []),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
  }));
  const senses = boundedRows(database, "synt_concept_sense").map((row) => ({
    sense_id: text(row.sense_id),
    concept_id: text(row.concept_id),
    label: text(row.label),
    aliases: jsonValue<string[]>(row.aliases_json, []),
    domain: text(row.domain),
    short_definition: text(row.short_definition),
    definition: text(row.definition),
    disambiguation: text(row.disambiguation),
    topic_relevance: text(row.topic_relevance),
    confidence: text(row.confidence),
    source_topic_ids: jsonValue<string[]>(row.source_topic_ids_json, []),
    evidence: jsonValue(row.evidence_json, []),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
  }));
  const aliases = boundedRows(database, "synt_concept_alias").map((row) => ({
    alias_id: text(row.alias_id),
    alias: text(row.alias),
    normalized: text(row.normalized),
    concept_id: text(row.concept_id),
    sense_id: text(row.sense_id),
    status: text(row.status),
    confidence: text(row.confidence),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
  }));
  const relations = boundedRows(database, "synt_concept_relation").map(
    (row) => ({
      relation_id: text(row.relation_id),
      source_concept_id: text(row.source_concept_id),
      target_concept_id: text(row.target_concept_id),
      relation: text(row.relation),
      status: text(row.status),
      confidence: text(row.confidence),
      provenance: jsonValue(row.provenance_json, []),
      created_at: text(row.created_at),
      updated_at: text(row.updated_at),
    }),
  );
  const reviewItems = boundedRows(database, "synt_concept_review_item").map(
    (row) => {
      const proposal = jsonValue<Record<string, unknown>>(
        row.proposal_json,
        {},
      );
      return {
        review_id: text(row.review_id),
        status: text(row.status),
        reason: text(row.reason),
        topic_id: text(row.topic_id),
        topic_path_id: text(row.topic_path_id),
        label: text(row.label),
        confidence: text(row.confidence),
        candidate_concept_ids: jsonValue<string[]>(
          row.candidate_concept_ids_json,
          [],
        ),
        short_definition:
          typeof proposal.short_definition === "string"
            ? proposal.short_definition
            : null,
        definition:
          typeof proposal.definition === "string" ? proposal.definition : null,
        concept_type:
          typeof proposal.concept_type === "string"
            ? proposal.concept_type
            : null,
        domain: typeof proposal.domain === "string" ? proposal.domain : null,
        topic_relevance:
          typeof proposal.topic_relevance === "string"
            ? proposal.topic_relevance
            : null,
        evidence: Array.isArray(proposal.evidence) ? proposal.evidence : [],
        target_concept_id: text(row.target_concept_id),
        created_at: text(row.created_at),
        updated_at: text(row.updated_at),
        resolved_at: text(row.resolved_at),
      };
    },
  );
  const topicLinks = boundedRows(database, "synt_topic_concept_link").map(
    (row) => ({
      topic_id: text(row.topic_id),
      concept_id: text(row.concept_id),
      sense_id: text(row.sense_id),
      label: text(row.label),
      relevance: text(row.relevance),
      confidence: text(row.confidence),
      source: text(row.source),
      created_at: text(row.created_at),
      updated_at: text(row.updated_at),
    }),
  );
  return {
    concepts,
    senses,
    aliases,
    relations,
    manifest: {
      manifest_hash: state ? text(state.manifest_hash) || null : null,
      concept_count: rowCount(database, "synt_concept"),
      sense_count: rowCount(database, "synt_concept_sense"),
      alias_count: rowCount(database, "synt_concept_alias"),
      relation_count: rowCount(database, "synt_concept_relation"),
      updated_at: text(state?.updated_at),
      projection_target: "concept-kb-index" as const,
    },
    projection: {
      target: "concept-kb-index",
      stale: numberValue(state?.index_stale) === 1,
      last_rebuild_at: text(state?.updated_at),
      diagnostics: [],
    },
    diagnostics: [],
    overlayEntries: [],
    reviewItems,
    topicLinks,
  };
}

function readonlyTags(database: ReadonlySqliteDatabase) {
  const state = firstRow(database, "synt_tag_application_state");
  const protocolRow = firstRow(database, "synt_tag_protocol");
  const entries = boundedRows(database, "synt_tag_vocabulary_entry").map(
    (row) => ({
      tag: text(row.tag),
      facet: text(row.facet),
      note: text(row.note) || undefined,
      source: text(row.source) || undefined,
      deprecated: numberValue(row.deprecated) === 1,
      replacement: text(row.replacement) || undefined,
      aliases: jsonValue<string[]>(row.aliases_json, []),
      abbrev: jsonValue<string[]>(row.abbrev_json, []),
      usage_count: numberValue(row.usage_count),
      last_synced_at: text(row.last_synced_at) || undefined,
    }),
  );
  return {
    entries,
    aliases: Object.fromEntries(
      boundedRows(database, "synt_tag_alias").map((row) => [
        text(row.alias),
        text(row.tag),
      ]),
    ),
    abbrev: Object.fromEntries(
      boundedRows(database, "synt_tag_abbrev").map((row) => [
        text(row.abbrev_key),
        text(row.abbrev_value),
      ]),
    ),
    protocol: {
      version: text(protocolRow?.version) || "1.0.0",
      tag_pattern: text(protocolRow?.tag_pattern) || "^.{1,128}$",
      max_tag_length: numberValue(protocolRow?.max_tag_length) || 128,
      facets: jsonValue<string[]>(protocolRow?.facets_json, ["general"]),
    },
    manifest: {
      manifest_hash:
        text(state?.vocabulary_hash) ||
        "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      entry_count: entries.length,
      tag_count: rowCount(database, "synt_tag_vocabulary_entry"),
      active_count: entries.filter((entry) => !entry.deprecated).length,
      updated_at: text(state?.updated_at),
      source_protocol_version: text(protocolRow?.version) || "1.0.0",
      projection_target: "tag-vocabulary-index",
    },
    validation_warnings: boundedRows(
      database,
      "synt_tag_validation_warning",
    ).map((row) => ({
      code: text(row.code),
      severity: text(row.severity),
      tag: text(row.tag) || undefined,
      message: text(row.message),
    })),
    staged: boundedRows(database, "synt_tag_staged_suggestion").map((row) => ({
      tag: text(row.tag),
      facet: text(row.facet),
      note: text(row.note) || undefined,
      source_flow: text(row.source_flow) || undefined,
      parent_bindings: jsonValue(row.parent_bindings_json, []),
      created_at: text(row.created_at),
      updated_at: text(row.updated_at),
    })),
  };
}

function readonlyReviewSummary(database: ReadonlySqliteDatabase) {
  const indexCount = openRowCount(database, "synt_review_item");
  const referenceMatchingCount = openRowCount(
    database,
    "synt_reference_match_proposal",
  );
  const conceptCount = openRowCount(database, "synt_concept_review_item");
  const topicGraphCount = openRowCount(
    database,
    "synt_topic_graph_review_item",
  );
  return {
    openCount:
      indexCount + referenceMatchingCount + conceptCount + topicGraphCount,
    indexCount,
    referenceMatchingCount,
    conceptCount,
    topicGraphCount,
  };
}

function readonlyIndexRows(database: ReadonlySqliteDatabase) {
  return boundedRows(database, "synt_reference_source").map((row) => ({
    paper_ref: text(row.paper_ref),
    library_id: numberValue(row.library_id),
    item_key: text(row.item_key),
    title: text(row.title),
    year: text(row.year),
    metadata_hash: text(row.metadata_hash),
    updated_at: text(row.updated_at),
    artifactCoverage: "references",
    missing_artifacts: [],
    reference_count: 0,
    unbound_reference_count: 0,
  }));
}

function readonlyGraph(database: ReadonlySqliteDatabase) {
  const state = firstRow(database, "synt_citation_graph_application_state");
  const metrics = new Map(
    boundedRows(database, "synt_citation_metrics_light").map((row) => [
      text(row.literature_item_id),
      row,
    ]),
  );
  const nodes = boundedRows(database, "synt_citation_node").map((row) => {
    const id = text(row.literature_item_id);
    const metric = metrics.get(id);
    const isLibrary = numberValue(row.has_zotero_binding) === 1;
    return {
      id,
      label: text(row.title) || id,
      title: text(row.title),
      kind: isLibrary ? "library_paper" : "external_reference",
      targetState: isLibrary ? "library" : "external",
      paperRef: id,
      year: text(row.year),
      authors: jsonValue<string[]>(row.authors_json, []),
      lowSignal: false,
      visibility: "default",
      displayTier: isLibrary ? "library" : "shared_external",
      externalDegree: null,
      outgoingCount: numberValue(metric?.outgoing_count),
      incomingCount: numberValue(metric?.incoming_count),
      matchedOutgoingCount: numberValue(metric?.matched_outgoing_count),
      unresolvedOutgoingCount: numberValue(metric?.unresolved_outgoing_count),
      ambiguousOutgoingCount: numberValue(metric?.ambiguous_outgoing_count),
      localDegree: numberValue(metric?.local_degree),
    };
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = boundedRows(database, "synt_citation_edge")
    .filter(
      (row) =>
        nodeIds.has(text(row.source_literature_item_id)) &&
        nodeIds.has(text(row.target_literature_item_id)),
    )
    .map((row) => {
      const roles = jsonValue<string[]>(row.roles_json, []);
      return {
        id: text(row.edge_id),
        source: text(row.source_literature_item_id),
        target: text(row.target_literature_item_id),
        kind: "citation" as const,
        role: roles[0] || "citation",
        primaryRole: roles[0] || "citation",
        auxRoles: roles.slice(1).map((role) => ({ role, count: 1 })),
        roleEvidence: roles.map((role) => ({ role, count: 1 })),
        mentionCount: Math.max(1, numberValue(row.weight)),
        sourceRefs: [text(row.reference_instance_id)].filter(Boolean),
        visibility: "default" as const,
      };
    });
  const graphHash = text(state?.graph_hash);
  return {
    graph_hash: graphHash,
    layoutStatus: "missing" as const,
    page: {
      nextCursor: "",
      hasMore: false,
      totalNodes: rowCount(database, "synt_citation_node"),
      totalEdges: rowCount(database, "synt_citation_edge"),
      totalHoverNodes: 0,
      totalHoverEdges: 0,
      returnedNodes: nodes.length,
      returnedEdges: edges.length,
      returnedHoverNodes: 0,
      returnedHoverEdges: 0,
      querySignature: `readonly:${graphHash || "missing"}`,
      layoutStatus: "missing" as const,
      windowStatus: "complete" as const,
      roleOptions: Array.from(
        new Set(
          edges.flatMap((edge) => edge.roleEvidence.map((entry) => entry.role)),
        ),
      ).sort(),
      responseBudgetBytes: 1024 * 1024,
    },
    diagnostics: {
      storage: "sqlite" as const,
      bounded: true as const,
      semantic_slice: "library_and_shared_external" as const,
      displayed_node_count: nodes.length,
      hover_only_external_count: 0,
      displayed_edge_count: edges.length,
      hover_only_edge_count: 0,
      cache_status: graphHash ? ("ready" as const) : ("missing" as const),
      cache_key: "citation-graph:library" as const,
      layout_status: "missing" as const,
      layout_source: "sqlite" as const,
    },
    topicScopes: [],
    topicScopePage: {
      cursor: "0",
      nextCursor: "",
      returned: 0,
      total: 0,
      limit: 100,
      hasMore: false,
    },
    hoverOnlyNodes: [],
    hoverOnlyEdges: [],
    nodes,
    edges,
  };
}

function unavailableTopicDetail(topicId: string) {
  return {
    ok: false,
    status: "unavailable" as const,
    topicId,
    title: "",
    source_papers: [],
    diagnostics: [],
  };
}

function readonlySurfaceProjection(
  surface: SynthesisWorkbenchSurfaceName,
  state: SynthesisWorkbenchReadState,
  libraryId: number,
  database?: ReadonlySqliteDatabase,
): SynthesisWorkbenchSurfaceProjection {
  const reviews = {
    summary: database
      ? readonlyReviewSummary(database)
      : { ...EMPTY_REVIEW_SUMMARY },
  };
  const topicRows = database ? readonlyTopics(database) : null;
  const home = {
    libraryId,
    artifacts: topicRows?.artifacts || [],
    deletedArtifacts: topicRows?.deletedArtifacts || { rows: [], total: 0 },
    topicPage: topicRows?.topicPage || emptyTopicPage(),
  };
  if (surface === "home") return home;
  if (surface === "topics") {
    return {
      ...home,
      topicGraph: database ? readonlyTopicGraph(database) : emptyTopicGraph(),
    } as SynthesisWorkbenchSurfaceProjection;
  }
  if (surface === "index") {
    return {
      libraryId,
      registry: {
        rows: database ? readonlyIndexRows(database) : [],
        cacheStatus: emptyReferenceCacheStatus(),
      },
      reviews,
    };
  }
  if (surface === "review") {
    if (state.reviews.activeTab === "concepts") {
      return {
        libraryId,
        concepts: database ? readonlyConcepts(database) : emptyConcepts(),
        reviews,
      } as SynthesisWorkbenchSurfaceProjection;
    }
    if (state.reviews.activeTab === "topic_graph") {
      return {
        libraryId,
        topicGraph: database ? readonlyTopicGraph(database) : emptyTopicGraph(),
        reviews,
      } as SynthesisWorkbenchSurfaceProjection;
    }
    return {
      libraryId,
      registry: {
        rows: [],
        cleanupProposals: [],
        matchProposals: [],
        matchTargetCandidates: [],
        canonicalRows: [],
        cacheStatus: emptyReferenceCacheStatus(),
        reviewPage: {
          cursor: state.reviews.cursor,
          next_cursor: "",
          has_more: false,
          limit: state.reviews.limit,
          match_total: 0,
          cleanup_total: 0,
        },
      },
      reviews,
    };
  }
  if (surface === "graph") {
    return {
      libraryId,
      graph: database
        ? readonlyGraph(database)
        : {
            graph_hash: "",
            layoutStatus: "missing",
            page: {
              nextCursor: "",
              hasMore: false,
              totalNodes: 0,
              totalEdges: 0,
              totalHoverNodes: 0,
              totalHoverEdges: 0,
              returnedNodes: 0,
              returnedEdges: 0,
              returnedHoverNodes: 0,
              returnedHoverEdges: 0,
              querySignature: "readonly-empty",
              layoutStatus: "missing",
              windowStatus: "complete",
              roleOptions: [],
              responseBudgetBytes: 1024 * 1024,
            },
            diagnostics: {
              storage: "sqlite",
              bounded: true,
              semantic_slice: "library_and_shared_external",
              displayed_node_count: 0,
              hover_only_external_count: 0,
              displayed_edge_count: 0,
              hover_only_edge_count: 0,
              cache_status: "missing",
              cache_key: "citation-graph:library",
              layout_status: "missing",
              layout_source: "sqlite",
            },
            topicScopes: [],
            topicScopePage: {
              cursor: "0",
              nextCursor: "",
              returned: 0,
              total: 0,
              limit: 100,
              hasMore: false,
            },
            hoverOnlyNodes: [],
            hoverOnlyEdges: [],
            nodes: [],
            edges: [],
          },
    } as SynthesisWorkbenchSurfaceProjection;
  }
  if (surface === "tags") {
    return {
      libraryId,
      tags: database
        ? readonlyTags(database)
        : {
            entries: [],
            aliases: {},
            abbrev: {},
            protocol: {
              version: "1.0.0",
              tag_pattern: "^.{1,128}$",
              max_tag_length: 128,
              facets: ["general"],
            },
            manifest: {
              manifest_hash:
                "sha256:0000000000000000000000000000000000000000000000000000000000000000",
              entry_count: 0,
              tag_count: 0,
              active_count: 0,
              updated_at: "",
              source_protocol_version: "1.0.0",
              projection_target: "tag-vocabulary-index",
            },
            validation_warnings: [],
            staged: [],
          },
    } as SynthesisWorkbenchSurfaceProjection;
  }
  if (surface === "concepts") {
    return {
      libraryId,
      concepts: database ? readonlyConcepts(database) : emptyConcepts(),
    } as SynthesisWorkbenchSurfaceProjection;
  }
  return {
    libraryId,
    reader: unavailableTopicDetail(state.reader.topicId || "unselected"),
  };
}

export function createSynthesisReadonlyPort(
  options: ReadonlyPortOptions,
): SynthesisClientPort {
  const tableCount = options.database.get(
    "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table'",
  );
  return {
    async listWorkflowTopicOptions() {
      return { options: [], diagnostics: [] };
    },
    async getSynthesisWorkbenchChromeInput() {
      return {
        libraryId: options.libraryId,
        storage: { rootState: "ready", mode: "readonly-snapshot" },
        readonly: true,
        tableCount: Number(tableCount?.count || 0),
      };
    },
    async getSynthesisWorkbenchSurfaceInput(surface, state) {
      return readonlySurfaceProjection(
        surface,
        rebuildSynthesisWorkbenchReadState(state),
        options.libraryId,
        options.database,
      );
    },
    async getSynthesisBackgroundJobRows() {
      return [];
    },
    async readTopicDetail(request) {
      return unavailableTopicDetail(request.topicId);
    },
    async resolveTopicPaperDigest(request) {
      return {
        ok: false,
        status: "unavailable",
        paper_ref: request.paper_ref,
        digest_markdown: "",
        recorded_hash: "",
        current_hash: "",
        source_changed: false,
        diagnostics: ["readonly_snapshot_digest_unavailable"],
      };
    },
  };
}

import {
  SynthesisClientError,
  toSynthesisJsonObject,
  type SynthesisJsonObject,
} from "./common.js";
import type {
  SynthesisResolvedPaper,
  SynthesisReport,
  SynthesisTopicArtifact,
  SynthesisTopicArtifactMetadata,
  SynthesisTopicManifest,
} from "./topicDomain.js";
import {
  rebuildSynthesisProtocolDto,
  SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
} from "./protocolSchema.js";
import type {
  SynthesisCitationGraphPageMetadata,
  SynthesisGraphQueryRequest,
} from "./graph.js";
import type { SynthesisReferenceIndexRow } from "./references.js";
import type {
  SynthesisTagStagedSuggestion,
  SynthesisTagVocabularySnapshot,
} from "./tags.js";

export const SYNTHESIS_WORKBENCH_SURFACES = [
  "home",
  "topics",
  "index",
  "review",
  "graph",
  "tags",
  "concepts",
  "reader",
] as const;

export type SynthesisWorkbenchSurfaceName =
  (typeof SYNTHESIS_WORKBENCH_SURFACES)[number];

export type SynthesisWorkbenchTopicFreshness =
  | "fresh"
  | "stale"
  | "dirty"
  | "queued"
  | "running"
  | "failed"
  | "unknown";

export type SynthesisWorkbenchTopicSourceMaterialsStatus =
  | "complete"
  | "partial"
  | "missing";

export type SynthesisWorkbenchTopicUpdateIntent = {
  topicId: string;
  language: string;
  updateScope: string;
  updateMode: "auto" | "update_patch" | "update_full";
  updateReason: string;
  actionLabel: "Update";
  changedSections: string[];
  blocked?: boolean;
};

export type SynthesisWorkbenchTopicArtifactRow = {
  id: string;
  title: string;
  kind: "topic_synthesis";
  source_materials_status: SynthesisWorkbenchTopicSourceMaterialsStatus;
  source_materials_percent: number;
  freshness: SynthesisWorkbenchTopicFreshness;
  updated_at?: string;
  definition?: string;
  markdown_preview?: string;
  paper_count?: number;
  summary?: string;
  status?: string;
  readerMode?: string;
  language?: string;
  external_literature_count?: number;
  discovery_status?: "none" | "candidates" | "rejected" | "unknown";
  candidate_count?: number;
  stale_reasons?: string[];
  dirty_reasons?: string[];
  missing_sections?: string[];
  updateIntent?: SynthesisWorkbenchTopicUpdateIntent;
};

export type SynthesisWorkbenchReadState = {
  registry: {
    scope: "library" | "referenced";
    expandedSourceRefs: string[];
  };
  reviews: {
    activeTab: "reference_matching" | "concepts" | "topic_graph";
    status:
      | "open"
      | "all"
      | "accepted"
      | "rejected"
      | "superseded"
      | "retargeted";
    kind: "all" | "zotero_binding" | "canonical_merge" | "canonical_revision";
    confidence: "all" | "deterministic" | "high" | "medium" | "low" | "review";
    search: string;
    cursor: string;
    limit: number;
  };
  reader: {
    topicId: string;
  };
  graph: SynthesisGraphQueryRequest;
};
export type SynthesisWorkbenchProjection = SynthesisJsonObject;

export type SynthesisWorkbenchReviewSummary = {
  openCount: number;
  indexCount: number;
  referenceMatchingCount: number;
  conceptCount: number;
  topicGraphCount: number;
};

export type SynthesisWorkbenchReferenceCacheStatus = {
  cache_key: "reference-sidecar:library";
  status: "missing" | "ready" | "stale" | "refreshing" | "failed";
  source_hash: string;
  basis_hash: string;
  refreshed_at: string;
  updated_at: string;
  diagnostics: Array<{
    code: string;
    severity?: "info" | "warning" | "error";
    message?: string;
  }>;
  allowed_actions: string[];
};

export type SynthesisWorkbenchIndexRegistry = {
  rows: SynthesisReferenceIndexRow[];
  cacheStatus: SynthesisWorkbenchReferenceCacheStatus;
};

export type SynthesisWorkbenchReferenceProposalDiagnostic = { code: string };

export type SynthesisWorkbenchReferenceCleanupProposal = {
  proposal_id: string;
  status: string;
  kind: "canonical_revision";
  review_kind: "canonical_revision";
  priority: number;
  source_paper_ref: string;
  target_work_id: string;
  reason: string;
  diagnostics: SynthesisWorkbenchReferenceProposalDiagnostic[];
  updated_at: string;
};

export type SynthesisWorkbenchReferenceEvidenceParty = {
  canonical_reference_id: string;
  title: string;
  normalized_title: string;
  year: string;
  effective_canonical_reference_id?: string;
  projected_literature_item_id?: string;
  binding?: {
    paper_ref?: string;
    title?: string;
  };
};

export type SynthesisWorkbenchCanonicalMergeEvidence = {
  source: SynthesisWorkbenchReferenceEvidenceParty;
  target: SynthesisWorkbenchReferenceEvidenceParty;
  edge_type?: string;
  token_dice?: number;
  year_delta?: number;
  matching_identifiers?: string[];
  risk_signals?: string[];
  containment_classification?: string;
};

export type SynthesisWorkbenchZoteroBindingEvidence = {
  author_overlap: string[];
  author_overlap_count: number;
  year_delta: number;
  title_similarity: number;
};

type SynthesisWorkbenchReferenceMatchProposalBase = {
  proposal_id: string;
  status: "open" | "accepted" | "rejected" | "superseded" | "retargeted";
  source_canonical_reference_id: string;
  source_effective_canonical_reference_id: string;
  source_raw_reference_ids: string[];
  target_canonical_reference_id: string;
  target_effective_canonical_reference_id: string;
  target_library_id: number;
  target_item_key: string;
  confidence: string;
  score: number;
  reasons: string[];
  diagnostics: SynthesisWorkbenchReferenceProposalDiagnostic[];
  updated_at: string;
};

export type SynthesisWorkbenchReferenceMatchProposal =
  | (SynthesisWorkbenchReferenceMatchProposalBase & {
      kind: "canonical_merge";
      evidence: SynthesisWorkbenchCanonicalMergeEvidence;
    })
  | (SynthesisWorkbenchReferenceMatchProposalBase & {
      kind: "zotero_binding";
      evidence: SynthesisWorkbenchZoteroBindingEvidence;
    });

export type SynthesisWorkbenchCanonicalReferenceRow = {
  row_id: string;
  effective_canonical_id: string;
  projected_literature_item_id: string;
  title: string;
  normalized_title: string;
  year: string;
  authors: string[];
  identifiers: Record<string, string>;
  physical_canonical_ids: string[];
  effective_canonical_ids: string[];
  raw_reference_count: number;
  raw_reference_samples: never[];
  incoming_redirects: never[];
  outgoing_redirects: never[];
  related_proposals: never[];
  duplicate_peers: never[];
  incoming_redirect_count: number;
  outgoing_redirect_count: number;
  proposal_count: number;
  open_proposal_count: number;
};

export type SynthesisWorkbenchReferenceReviewRegistry = {
  rows: never[];
  cleanupProposals: SynthesisWorkbenchReferenceCleanupProposal[];
  matchProposals: SynthesisWorkbenchReferenceMatchProposal[];
  matchTargetCandidates: Array<{
    kind: "canonical_reference";
    canonicalReferenceId: string;
    title: string;
    year: string;
    rawReferenceIds: string[];
  }>;
  canonicalRows: SynthesisWorkbenchCanonicalReferenceRow[];
  cacheStatus: SynthesisWorkbenchReferenceCacheStatus;
  reviewPage: {
    cursor: string;
    next_cursor: string;
    has_more: boolean;
    limit: number;
    match_total: number;
    cleanup_total: number;
  };
};

export type SynthesisWorkbenchEvidence =
  | string
  | {
      source?: string;
      producer?: string;
      topicId?: string;
      kind?: string;
      ref?: string;
      paper_ref?: string;
      quote_or_summary?: string;
      section?: string;
    };

export type SynthesisWorkbenchProjectionStatus = {
  target: string;
  stale: boolean;
  last_rebuild_at: string;
  diagnostics: never[];
};

export type SynthesisWorkbenchTopicGraphProjection = {
  nodes: Array<{
    topic_id: string;
    title: string;
    definition: string;
    aliases: string[];
    node_type: "materialized" | "placeholder";
    definition_status: "has_synthesis" | "placeholder" | "deleted" | "stale";
    current_artifact_path: string;
    is_root: boolean;
    level: "" | "top" | "normal";
    paper_count: number;
    last_synthesis_at: string;
    created_at: string;
    updated_at: string;
  }>;
  edges: Array<{
    edge_id: string;
    source_topic_id: string;
    target_topic_id: string;
    relation:
      | "broader_than"
      | "related_to"
      | "overlaps_with"
      | "contrasts_with";
    status: "suggested" | "confirmed" | "rejected" | "stale" | "deleted";
    confidence: number | null;
    provenance: SynthesisWorkbenchEvidence[];
    evidence_refs: SynthesisWorkbenchEvidence[];
    created_at: string;
    updated_at: string;
  }>;
  reviewItems: Array<{
    review_id: string;
    status: "open" | "approved" | "rejected" | "deleted";
    source_topic_id: string;
    target_topic_id: string;
    target_title: string;
    relation:
      | "broader_than"
      | "related_to"
      | "overlaps_with"
      | "contrasts_with";
    confidence: number | null;
    provenance: SynthesisWorkbenchEvidence[];
    evidence_refs: SynthesisWorkbenchEvidence[];
    created_at: string;
    updated_at: string;
    resolved_at: string;
  }>;
  manifest: {
    manifest_hash: string | null;
    node_count: number;
    edge_count: number;
    review_count: number;
    updated_at: string;
  };
  projection: SynthesisWorkbenchProjectionStatus;
  diagnostics: never[];
  reviewPage?: {
    cursor: string;
    limit: number;
    edge_total: number;
    review_total: number;
  };
};

export type SynthesisWorkbenchConceptConfidence = "high" | "medium" | "low";

export type SynthesisWorkbenchConceptProjection = {
  concepts: Array<{
    concept_id: string;
    label: string;
    aliases: string[];
    concept_type: string;
    domain: string;
    status: "active" | "review" | "deprecated";
    short_definition: string;
    definition: string;
    usage_note: string;
    editorial_note: string;
    sense_ids: string[];
    created_at: string;
    updated_at: string;
  }>;
  senses: Array<{
    sense_id: string;
    concept_id: string;
    label: string;
    aliases: string[];
    domain: string;
    short_definition: string;
    definition: string;
    disambiguation: string;
    topic_relevance: string;
    confidence: SynthesisWorkbenchConceptConfidence;
    source_topic_ids: string[];
    evidence: SynthesisWorkbenchEvidence[];
    created_at: string;
    updated_at: string;
  }>;
  aliases: Array<{
    alias_id: string;
    alias: string;
    normalized: string;
    concept_id: string;
    sense_id: string;
    status: "active" | "review" | "deprecated";
    confidence: SynthesisWorkbenchConceptConfidence;
    created_at: string;
    updated_at: string;
  }>;
  relations: Array<{
    relation_id: string;
    source_concept_id: string;
    target_concept_id: string;
    relation: string;
    status: string;
    confidence: SynthesisWorkbenchConceptConfidence;
    provenance: SynthesisWorkbenchEvidence[];
    created_at: string;
    updated_at: string;
  }>;
  manifest: {
    manifest_hash: string | null;
    concept_count: number;
    sense_count: number;
    alias_count: number;
    relation_count: number;
    updated_at: string;
    projection_target: "concept-kb-index";
  };
  projection: SynthesisWorkbenchProjectionStatus;
  diagnostics: never[];
  overlayEntries: Array<{
    concept_id: string;
    sense_id?: string;
    alias: string;
    label: string;
    short_definition?: string;
    definition?: string;
    confidence: SynthesisWorkbenchConceptConfidence;
  }>;
  reviewItems: Array<{
    review_id: string;
    status: "open" | "approved" | "merged" | "rejected";
    reason: string;
    topic_id: string;
    topic_path_id: string;
    label: string;
    confidence: SynthesisWorkbenchConceptConfidence;
    candidate_concept_ids: string[];
    short_definition: string | null;
    definition: string | null;
    concept_type: string | null;
    domain: string | null;
    topic_relevance: string | null;
    evidence: SynthesisWorkbenchEvidence[];
    target_concept_id: string;
    created_at: string;
    updated_at: string;
    resolved_at: string;
  }>;
  topicLinks: Array<{
    topic_id: string;
    concept_id: string;
    sense_id: string;
    label: string;
    relevance: string;
    confidence: SynthesisWorkbenchConceptConfidence;
    source: string;
    created_at: string;
    updated_at: string;
  }>;
  reviewPage?: { cursor: string; limit: number; total: number };
};

export type SynthesisWorkbenchGraphProjection = {
  graph_hash: string;
  layoutStatus: "missing" | "ready" | "stale" | "refreshing" | "failed";
  page: SynthesisCitationGraphPageMetadata;
  diagnostics: {
    storage: "sqlite";
    bounded: true;
    semantic_slice: "library_and_shared_external";
    displayed_node_count: number;
    hover_only_external_count: number;
    displayed_edge_count: number;
    hover_only_edge_count: number;
    cache_status: "missing" | "ready" | "stale" | "refreshing" | "failed";
    cache_key: "citation-graph:library";
    layout_status: "missing" | "ready" | "stale" | "refreshing" | "failed";
    layout_source: "sqlite";
  };
  topicScopes: Array<{
    topicId: string;
    title: string;
    paperCount: number;
    paperRefTotal: number;
    paperRefsTruncated: boolean;
    paperRefs: string[];
    nodeIds: string[];
  }>;
  topicScopePage: {
    cursor: string;
    nextCursor: string;
    returned: number;
    total: number;
    limit: number;
    hasMore: boolean;
  };
  hoverOnlyNodes: SynthesisWorkbenchGraphNode[];
  hoverOnlyEdges: SynthesisWorkbenchGraphEdge[];
  nodes: SynthesisWorkbenchGraphNode[];
  edges: SynthesisWorkbenchGraphEdge[];
};

export type SynthesisWorkbenchGraphNode = {
  id: string;
  label: string;
  title: string;
  kind: "library_paper" | "external_reference" | "unresolved_reference";
  targetState: "library" | "external" | "unresolved";
  paperRef: string;
  year: string;
  authors: string[];
  lowSignal: boolean;
  visibility: "default" | "hover_only";
  displayTier: "library" | "shared_external" | "single_external";
  externalDegree: number | null;
  outgoingCount: number;
  incomingCount: number;
  matchedOutgoingCount: number;
  unresolvedOutgoingCount: number;
  ambiguousOutgoingCount: number;
  localDegree: number;
  x?: number;
  y?: number;
};

export type SynthesisWorkbenchGraphEdge = {
  id: string;
  source: string;
  target: string;
  kind: "citation";
  role: string;
  primaryRole: string;
  auxRoles: Array<{ role: string; count: number }>;
  roleEvidence: Array<{ role: string; count: number }>;
  mentionCount: number;
  sourceRefs: string[];
  visibility: "default" | "hover_only";
};

export type SynthesisWorkbenchTagsProjection =
  SynthesisTagVocabularySnapshot & {
    staged: SynthesisTagStagedSuggestion[];
  };

export type SynthesisWorkbenchHomeSurfaceProjection = {
  libraryId: number;
  artifacts: SynthesisWorkbenchTopicArtifactRow[];
  deletedArtifacts: {
    rows: Array<{
      topic_id: string;
      title: string;
      deleted_at: string;
    }>;
    total: number;
  };
  topicPage: {
    cursor: string;
    next_cursor: string;
    has_more: boolean;
    returned: number;
    total: number;
    limit: number;
  };
};

export type SynthesisWorkbenchTopicsSurfaceProjection =
  SynthesisWorkbenchHomeSurfaceProjection & {
    topicGraph: SynthesisWorkbenchTopicGraphProjection;
  };

type SynthesisWorkbenchReviewedProjection = {
  libraryId: number;
  reviews: { summary: SynthesisWorkbenchReviewSummary };
};

export type SynthesisWorkbenchIndexSurfaceProjection =
  SynthesisWorkbenchReviewedProjection & {
    registry: SynthesisWorkbenchIndexRegistry;
  };

export type SynthesisWorkbenchReferenceReviewSurfaceProjection =
  SynthesisWorkbenchReviewedProjection & {
    registry: SynthesisWorkbenchReferenceReviewRegistry;
  };

export type SynthesisWorkbenchConceptReviewSurfaceProjection =
  SynthesisWorkbenchReviewedProjection & {
    concepts: SynthesisWorkbenchConceptProjection;
  };

export type SynthesisWorkbenchTopicGraphReviewSurfaceProjection =
  SynthesisWorkbenchReviewedProjection & {
    topicGraph: SynthesisWorkbenchTopicGraphProjection;
  };

export type SynthesisWorkbenchReviewSurfaceProjection =
  | SynthesisWorkbenchReferenceReviewSurfaceProjection
  | SynthesisWorkbenchConceptReviewSurfaceProjection
  | SynthesisWorkbenchTopicGraphReviewSurfaceProjection;

export type SynthesisWorkbenchGraphSurfaceProjection = {
  libraryId: number;
  graph: SynthesisWorkbenchGraphProjection;
};

export type SynthesisWorkbenchTagsSurfaceProjection = {
  libraryId: number;
  tags: SynthesisWorkbenchTagsProjection;
};

export type SynthesisWorkbenchConceptsSurfaceProjection = {
  libraryId: number;
  concepts: SynthesisWorkbenchConceptProjection;
};

export type SynthesisWorkbenchReaderSurfaceProjection = {
  libraryId: number;
  reader: SynthesisWorkbenchTopicDetailResult;
};

export type SynthesisWorkbenchSurfaceProjectionMap = {
  home: SynthesisWorkbenchHomeSurfaceProjection;
  topics: SynthesisWorkbenchTopicsSurfaceProjection;
  index: SynthesisWorkbenchIndexSurfaceProjection;
  review: SynthesisWorkbenchReviewSurfaceProjection;
  graph: SynthesisWorkbenchGraphSurfaceProjection;
  tags: SynthesisWorkbenchTagsSurfaceProjection;
  concepts: SynthesisWorkbenchConceptsSurfaceProjection;
  reader: SynthesisWorkbenchReaderSurfaceProjection;
};

export type SynthesisWorkbenchSurfaceProjection =
  SynthesisWorkbenchSurfaceProjectionMap[SynthesisWorkbenchSurfaceName];

export type SynthesisWorkbenchSidecarStatus = {
  lifecycle:
    | "stopped"
    | "starting"
    | "ready"
    | "unavailable"
    | "incompatible"
    | "stopping";
  recoveryState: "none" | "scheduled" | "manual-recovery-required";
  reasonCode?: string;
  healthObservedAt?: string;
  serviceInstanceId?: string;
  serviceVersion?: string;
  bundleId?: string;
  nextRestartAt?: string;
  computePool?: {
    state: "idle" | "busy" | "degraded" | "stopping";
    active: 0 | 1;
    queued: number;
  };
};

export type SynthesisWorkbenchChromeReadRequest = {
  state: SynthesisWorkbenchReadState;
};

export function rebuildSynthesisWorkbenchReadState(
  value: unknown,
): SynthesisWorkbenchReadState {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "WorkbenchState",
    value,
    direction: "request",
  });
}

export type SynthesisWorkbenchOperationalChromeReadRequest = Record<
  string,
  never
>;

export const SYNTHESIS_WORKBENCH_OPERATIONAL_CACHE_DESCRIPTORS = [
  {
    cacheKey: "reference-sidecar:library",
    cacheKind: "reference-sidecar",
  },
  {
    cacheKey: "citation-graph:library",
    cacheKind: "citation_graph",
  },
] as const;

export const SYNTHESIS_WORKBENCH_RUNNING_JOB_LIMIT = 50;
export const SYNTHESIS_WORKBENCH_FAILED_JOB_LIMIT = 20;

export type SynthesisWorkbenchCacheReadiness = {
  cacheKey: string;
  cacheKind: string;
  status: "missing" | "ready" | "stale" | "refreshing" | "failed";
  refreshedAt?: string;
  updatedAt?: string;
  staleReason?: string;
};

export type SynthesisWorkbenchBackgroundJobSource =
  | "workbench"
  | "operation"
  | "reference_sidecar_refresh"
  | "citation_graph_cache_rebuild"
  | "citation_graph_layout"
  | "webdav_sync"
  | "canonical_maintenance";

export type SynthesisWorkbenchBackgroundJobStatus =
  | "submitted"
  | "queued"
  | "running"
  | "waiting"
  | "failed";

export type SynthesisWorkbenchBackgroundJobProgress =
  | { mode: "indeterminate"; label?: string }
  | {
      mode: "determinate";
      percent: number;
      current?: number;
      total?: number;
      label?: string;
    };

export type SynthesisWorkbenchBackgroundJobRow = {
  job_id: string;
  source: SynthesisWorkbenchBackgroundJobSource;
  status: SynthesisWorkbenchBackgroundJobStatus;
  label: string;
  detail?: string;
  updated_at?: string;
  progress: SynthesisWorkbenchBackgroundJobProgress;
};

export type SynthesisWorkbenchOperationalChromeResult = {
  maintenance: {
    cacheReadiness: SynthesisWorkbenchCacheReadiness[];
    backgroundJobs: SynthesisWorkbenchBackgroundJobRow[];
  };
};

export type SynthesisWorkbenchSurfaceReadRequest = {
  surface: SynthesisWorkbenchSurfaceName;
  state: SynthesisWorkbenchReadState;
};

const SYNTHESIS_WORKBENCH_SURFACE_RESULT_DEFINITIONS = {
  home: "HomeSurfaceProjection",
  topics: "TopicsSurfaceProjection",
  index: "IndexSurfaceProjection",
  graph: "GraphSurfaceProjection",
  tags: "TagsSurfaceProjection",
  concepts: "ConceptsSurfaceProjection",
  reader: "ReaderSurfaceProjection",
} as const;

export function rebuildSynthesisWorkbenchSurfaceResult<
  Surface extends SynthesisWorkbenchSurfaceName,
>(
  request: SynthesisWorkbenchSurfaceReadRequest & { surface: Surface },
  value: unknown,
): SynthesisWorkbenchSurfaceProjectionMap[Surface] {
  const definition =
    request.surface === "review"
      ? request.state.reviews.activeTab === "concepts"
        ? "ConceptReviewSurfaceProjection"
        : request.state.reviews.activeTab === "topic_graph"
          ? "TopicGraphReviewSurfaceProjection"
          : "ReferenceReviewSurfaceProjection"
      : SYNTHESIS_WORKBENCH_SURFACE_RESULT_DEFINITIONS[
          request.surface as Exclude<SynthesisWorkbenchSurfaceName, "review">
        ];
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition,
    value,
    direction: "result",
  });
}

export type SynthesisWorkbenchTopicDetailReadRequest = {
  topicId: string;
};

export type SynthesisWorkbenchTopicDetailResult = {
  ok: boolean;
  status: "ready" | "unavailable";
  topicId: string;
  title: string;
  language?: string;
  updated_at?: string;
  artifact_hash?: string;
  paper_count?: number;
  source_papers: SynthesisResolvedPaper[];
  topic?: NonNullable<SynthesisTopicArtifact["topic"]>;
  summary?: NonNullable<SynthesisTopicArtifact["summary"]>;
  taxonomy?: NonNullable<SynthesisTopicArtifact["taxonomy"]>;
  improvement_dimensions?: NonNullable<
    SynthesisTopicArtifact["improvement_dimensions"]
  >;
  claims?: NonNullable<SynthesisTopicArtifact["claims"]>;
  timeline_events?: NonNullable<SynthesisTopicArtifact["timeline_events"]>;
  debates?: NonNullable<SynthesisTopicArtifact["debates"]>;
  coverage?: NonNullable<SynthesisTopicArtifact["coverage"]>;
  statistics?: NonNullable<SynthesisTopicArtifact["statistics"]>;
  synthesis_report?: NonNullable<SynthesisTopicArtifact["synthesis_report"]>;
  future_directions?: NonNullable<SynthesisTopicArtifact["future_directions"]>;
  review_outline?: NonNullable<SynthesisTopicArtifact["review_outline"]>;
  source_artifacts?: NonNullable<SynthesisTopicArtifact["source_artifacts"]>;
  artifact?: SynthesisTopicArtifact;
  manifest?: SynthesisTopicManifest;
  metadata?: {
    schema_id: "synthesis.topic_artifact_metadata";
    schema_version: "1.0.0";
    created_at: string;
    updated_at: string;
    data: {
      topic_id: string;
      title: string;
      definition: string;
      language: string;
      operation: "create" | "update_full" | "update_patch";
      artifact_metadata: SynthesisTopicArtifactMetadata;
    };
  };
  pathId?: string;
  diagnostics: NonNullable<SynthesisTopicArtifact["diagnostics"]>;
};

export function rebuildSynthesisWorkbenchTopicDetailResult(
  value: unknown,
): SynthesisWorkbenchTopicDetailResult {
  return rebuildSynthesisProtocolDto({
    schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
    definition: "ReadTopicDetailResult",
    value,
    direction: "result",
  });
}

export type SynthesisWorkbenchPaperDigestReadRequest = {
  topicId?: string;
  paperRef: string;
  digestRef?: {
    paperRef: string;
    locator?: string;
    payloadHash: string;
    libraryId?: number;
    noteKey?: string;
  };
  includeRepresentativeImage: boolean;
};

export type SynthesisWorkbenchRepresentativeImage = {
  status: "available" | "unavailable" | "absent";
  attachment_key?: string;
  alt?: string;
  caption?: string;
  mime_type?: string;
  data_url?: string;
  width?: number;
  height?: number;
  compressed_bytes?: number;
  source_kind?: string;
  strategy?: string;
  diagnostics: string[];
};

export type SynthesisWorkbenchPaperDigestResult = {
  ok: boolean;
  status: "available" | "unavailable";
  paper_ref: string;
  digest_markdown: string;
  recorded_hash: string;
  current_hash: string;
  source_changed: boolean;
  diagnostics: string[];
  note_key?: string;
  note_title?: string;
  representative_image?: SynthesisWorkbenchRepresentativeImage;
};

export function rebuildSynthesisWorkbenchPaperDigestReadRequest(
  value: unknown,
): SynthesisWorkbenchPaperDigestReadRequest {
  const object = strictObject(
    value,
    "synthesisWorkbenchPaperDigestReadRequest",
    ["paperRef", "includeRepresentativeImage"],
    ["topicId", "digestRef"],
  );
  if (typeof object.includeRepresentativeImage !== "boolean") {
    invalid(
      "synthesisWorkbenchPaperDigestReadRequest.includeRepresentativeImage",
    );
  }
  const paperRef = boundedString(
    object.paperRef,
    "synthesisWorkbenchPaperDigestReadRequest.paperRef",
  );
  const topicId = optionalString(
    object.topicId,
    "synthesisWorkbenchPaperDigestReadRequest.topicId",
  );
  let digestRef: SynthesisWorkbenchPaperDigestReadRequest["digestRef"];
  if (object.digestRef !== undefined) {
    const ref = strictObject(
      object.digestRef,
      "synthesisWorkbenchPaperDigestReadRequest.digestRef",
      ["paperRef", "payloadHash"],
      ["locator", "libraryId", "noteKey"],
    );
    if (ref.paperRef !== paperRef) {
      invalid("synthesisWorkbenchPaperDigestReadRequest.digestRef.paperRef");
    }
    const libraryId =
      ref.libraryId === undefined
        ? undefined
        : nonNegativeInteger(
            ref.libraryId,
            "synthesisWorkbenchPaperDigestReadRequest.digestRef.libraryId",
            Number.MAX_SAFE_INTEGER,
          );
    if (libraryId === 0) {
      invalid("synthesisWorkbenchPaperDigestReadRequest.digestRef.libraryId");
    }
    const locator = optionalString(
      ref.locator,
      "synthesisWorkbenchPaperDigestReadRequest.digestRef.locator",
    );
    const noteKey = optionalString(
      ref.noteKey,
      "synthesisWorkbenchPaperDigestReadRequest.digestRef.noteKey",
    );
    digestRef = {
      paperRef,
      payloadHash: boundedString(
        ref.payloadHash,
        "synthesisWorkbenchPaperDigestReadRequest.digestRef.payloadHash",
      ),
      ...(locator ? { locator } : {}),
      ...(libraryId === undefined ? {} : { libraryId }),
      ...(noteKey ? { noteKey } : {}),
    };
  }
  return {
    ...(topicId ? { topicId } : {}),
    paperRef,
    ...(digestRef ? { digestRef } : {}),
    includeRepresentativeImage: object.includeRepresentativeImage,
  };
}

function rebuildRepresentativeImage(
  value: unknown,
): SynthesisWorkbenchRepresentativeImage {
  const location = "synthesisWorkbenchPaperDigestResult.representative_image";
  const object = strictObject(
    value,
    location,
    ["status", "diagnostics"],
    [
      "attachment_key",
      "alt",
      "caption",
      "mime_type",
      "data_url",
      "width",
      "height",
      "compressed_bytes",
      "source_kind",
      "strategy",
    ],
  );
  if (
    object.status !== "available" &&
    object.status !== "unavailable" &&
    object.status !== "absent"
  ) {
    invalid(`${location}.status`);
  }
  if (
    !Array.isArray(object.diagnostics) ||
    object.diagnostics.some((entry) => typeof entry !== "string")
  ) {
    invalid(`${location}.diagnostics`);
  }
  const optionalInteger = (field: "width" | "height" | "compressed_bytes") =>
    object[field] === undefined
      ? undefined
      : nonNegativeInteger(
          object[field],
          `${location}.${field}`,
          Number.MAX_SAFE_INTEGER,
        );
  return {
    status: object.status,
    ...Object.fromEntries(
      [
        "attachment_key",
        "alt",
        "caption",
        "mime_type",
        "data_url",
        "source_kind",
        "strategy",
      ]
        .map((field) => [
          field,
          optionalString(object[field], `${location}.${field}`),
        ])
        .filter((entry): entry is [string, string] => Boolean(entry[1])),
    ),
    ...Object.fromEntries(
      (["width", "height", "compressed_bytes"] as const)
        .map((field) => [field, optionalInteger(field)] as const)
        .filter(
          (entry): entry is readonly [(typeof entry)[0], number] =>
            entry[1] !== undefined,
        ),
    ),
    diagnostics: [...object.diagnostics] as string[],
  };
}

export function rebuildSynthesisWorkbenchPaperDigestResult(
  value: unknown,
): SynthesisWorkbenchPaperDigestResult {
  const location = "synthesisWorkbenchPaperDigestResult";
  const object = strictObject(
    value,
    location,
    [
      "ok",
      "status",
      "paper_ref",
      "digest_markdown",
      "recorded_hash",
      "current_hash",
      "source_changed",
      "diagnostics",
    ],
    ["note_key", "note_title", "representative_image"],
  );
  if (
    typeof object.ok !== "boolean" ||
    (object.status !== "available" && object.status !== "unavailable") ||
    typeof object.source_changed !== "boolean" ||
    !Array.isArray(object.diagnostics) ||
    object.diagnostics.some((entry) => typeof entry !== "string")
  ) {
    invalid(location);
  }
  const noteKey = optionalString(object.note_key, `${location}.note_key`);
  const noteTitle = optionalString(object.note_title, `${location}.note_title`);
  return {
    ok: object.ok,
    status: object.status,
    paper_ref: boundedString(object.paper_ref, `${location}.paper_ref`),
    digest_markdown: boundedString(
      object.digest_markdown,
      `${location}.digest_markdown`,
      true,
    ),
    recorded_hash: boundedString(
      object.recorded_hash,
      `${location}.recorded_hash`,
      true,
    ),
    current_hash: boundedString(
      object.current_hash,
      `${location}.current_hash`,
      true,
    ),
    source_changed: object.source_changed,
    diagnostics: [...object.diagnostics] as string[],
    ...(noteKey ? { note_key: noteKey } : {}),
    ...(noteTitle ? { note_title: noteTitle } : {}),
    ...(object.representative_image === undefined
      ? {}
      : {
          representative_image: rebuildRepresentativeImage(
            object.representative_image,
          ),
        }),
  };
}

export interface SynthesisWorkbenchClient {
  readProgress(): Promise<SynthesisWorkbenchProjection>;
  readChrome(
    request: SynthesisWorkbenchChromeReadRequest,
  ): Promise<SynthesisWorkbenchProjection>;
  readSurface<Surface extends SynthesisWorkbenchSurfaceName>(
    request: SynthesisWorkbenchSurfaceReadRequest & { surface: Surface },
  ): Promise<SynthesisWorkbenchSurfaceProjectionMap[Surface]>;
  readTopicDetail(
    request: SynthesisWorkbenchTopicDetailReadRequest,
  ): Promise<SynthesisWorkbenchTopicDetailResult>;
  readPaperDigest(
    request: SynthesisWorkbenchPaperDigestReadRequest,
  ): Promise<SynthesisWorkbenchPaperDigestResult>;
}

function invalid(location: string): never {
  throw new SynthesisClientError("invalid_request", `${location} is invalid`, {
    location,
  });
}

function strictObject(
  value: unknown,
  location: string,
  required: readonly string[],
  optional: readonly string[] = [],
) {
  const object = toSynthesisJsonObject(value, location);
  const keys = Object.keys(object).sort();
  const allowed = [...required, ...optional].sort();
  if (
    required.some((key) => !Object.hasOwn(object, key)) ||
    keys.some((key) => !allowed.includes(key))
  ) {
    invalid(location);
  }
  return object;
}

function boundedString(value: unknown, location: string, allowEmpty = false) {
  if (
    typeof value !== "string" ||
    (!allowEmpty && value.length === 0) ||
    value.length > 4096
  ) {
    invalid(location);
  }
  return value;
}

function optionalString(value: unknown, location: string) {
  return value === undefined
    ? undefined
    : boundedString(value, location, true) || undefined;
}

function nonNegativeInteger(value: unknown, location: string, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > max
  ) {
    invalid(location);
  }
  return value;
}

export function rebuildSynthesisWorkbenchChromeReadRequest(
  value: unknown,
): SynthesisWorkbenchChromeReadRequest {
  const object = strictObject(value, "synthesisWorkbenchChromeReadRequest", [
    "state",
  ]);
  return {
    state: rebuildSynthesisWorkbenchReadState(object.state),
  };
}

export function rebuildSynthesisWorkbenchOperationalChromeReadRequest(
  value: unknown,
): SynthesisWorkbenchOperationalChromeReadRequest {
  strictObject(value, "synthesisWorkbenchOperationalChromeReadRequest", []);
  return {};
}

function rebuildCacheReadiness(
  value: unknown,
  index: number,
): SynthesisWorkbenchCacheReadiness {
  const location = `synthesisWorkbenchOperationalChromeResult.maintenance.cacheReadiness[${index}]`;
  const object = strictObject(
    value,
    location,
    ["cacheKey", "cacheKind", "status"],
    ["refreshedAt", "updatedAt", "staleReason"],
  );
  const descriptor = SYNTHESIS_WORKBENCH_OPERATIONAL_CACHE_DESCRIPTORS[index];
  if (
    !descriptor ||
    object.cacheKey !== descriptor.cacheKey ||
    object.cacheKind !== descriptor.cacheKind ||
    (object.status !== "missing" &&
      object.status !== "ready" &&
      object.status !== "stale" &&
      object.status !== "refreshing" &&
      object.status !== "failed")
  ) {
    invalid(location);
  }
  const refreshedAt = optionalString(
    object.refreshedAt,
    `${location}.refreshedAt`,
  );
  const updatedAt = optionalString(object.updatedAt, `${location}.updatedAt`);
  const staleReason = optionalString(
    object.staleReason,
    `${location}.staleReason`,
  );
  return {
    cacheKey: descriptor.cacheKey,
    cacheKind: descriptor.cacheKind,
    status: object.status,
    ...(refreshedAt ? { refreshedAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(staleReason ? { staleReason } : {}),
  };
}

function rebuildProgress(
  value: unknown,
  location: string,
): SynthesisWorkbenchBackgroundJobProgress {
  const object = toSynthesisJsonObject(value, location);
  if (object.mode === "indeterminate") {
    strictObject(value, location, ["mode"], ["label"]);
    const label = optionalString(object.label, `${location}.label`);
    return {
      mode: "indeterminate",
      ...(label ? { label } : {}),
    };
  }
  if (object.mode !== "determinate") invalid(location);
  strictObject(
    value,
    location,
    ["mode", "percent"],
    ["current", "total", "label"],
  );
  const current =
    object.current === undefined
      ? undefined
      : nonNegativeInteger(
          object.current,
          `${location}.current`,
          Number.MAX_SAFE_INTEGER,
        );
  const total =
    object.total === undefined
      ? undefined
      : nonNegativeInteger(
          object.total,
          `${location}.total`,
          Number.MAX_SAFE_INTEGER,
        );
  const label = optionalString(object.label, `${location}.label`);
  return {
    mode: "determinate",
    percent: nonNegativeInteger(object.percent, `${location}.percent`, 100),
    ...(current === undefined ? {} : { current }),
    ...(total === undefined ? {} : { total }),
    ...(label ? { label } : {}),
  };
}

function rebuildBackgroundJob(
  value: unknown,
  index: number,
): SynthesisWorkbenchBackgroundJobRow {
  const location = `synthesisWorkbenchOperationalChromeResult.maintenance.backgroundJobs[${index}]`;
  const object = strictObject(
    value,
    location,
    ["job_id", "source", "status", "label", "progress"],
    ["detail", "updated_at"],
  );
  const sources: readonly string[] = [
    "workbench",
    "operation",
    "reference_sidecar_refresh",
    "citation_graph_cache_rebuild",
    "citation_graph_layout",
    "webdav_sync",
    "canonical_maintenance",
  ];
  const statuses: readonly string[] = [
    "submitted",
    "queued",
    "running",
    "waiting",
    "failed",
  ];
  if (
    typeof object.source !== "string" ||
    !sources.includes(object.source) ||
    typeof object.status !== "string" ||
    !statuses.includes(object.status)
  ) {
    invalid(location);
  }
  const detail = optionalString(object.detail, `${location}.detail`);
  const updatedAt = optionalString(object.updated_at, `${location}.updated_at`);
  return {
    job_id: boundedString(object.job_id, `${location}.job_id`),
    source: object.source as SynthesisWorkbenchBackgroundJobSource,
    status: object.status as SynthesisWorkbenchBackgroundJobStatus,
    label: boundedString(object.label, `${location}.label`),
    ...(detail ? { detail } : {}),
    ...(updatedAt ? { updated_at: updatedAt } : {}),
    progress: rebuildProgress(object.progress, `${location}.progress`),
  };
}

export function rebuildSynthesisWorkbenchOperationalChromeResult(
  value: unknown,
): SynthesisWorkbenchOperationalChromeResult {
  const root = strictObject(
    value,
    "synthesisWorkbenchOperationalChromeResult",
    ["maintenance"],
  );
  const maintenance = strictObject(
    root.maintenance,
    "synthesisWorkbenchOperationalChromeResult.maintenance",
    ["cacheReadiness", "backgroundJobs"],
  );
  if (
    !Array.isArray(maintenance.cacheReadiness) ||
    maintenance.cacheReadiness.length !==
      SYNTHESIS_WORKBENCH_OPERATIONAL_CACHE_DESCRIPTORS.length ||
    !Array.isArray(maintenance.backgroundJobs) ||
    maintenance.backgroundJobs.length >
      SYNTHESIS_WORKBENCH_RUNNING_JOB_LIMIT +
        SYNTHESIS_WORKBENCH_FAILED_JOB_LIMIT
  ) {
    invalid("synthesisWorkbenchOperationalChromeResult.maintenance");
  }
  return {
    maintenance: {
      cacheReadiness: maintenance.cacheReadiness.map(rebuildCacheReadiness),
      backgroundJobs: maintenance.backgroundJobs.map(rebuildBackgroundJob),
    },
  };
}

export type SynthesisUiTab =
  | "overview"
  | "artifacts"
  | "registry"
  | "reviews"
  | "tags"
  | "concepts"
  | "graph"
  | "reader";

export type SynthesisWorkbenchSurfaceName =
  | "home"
  | "topics"
  | "index"
  | "review"
  | "graph"
  | "tags"
  | "concepts"
  | "reader";

export type SynthesisUiCoverage = "complete" | "partial" | "missing";
export type SynthesisUiCacheReadiness =
  | "missing"
  | "refreshing"
  | "ready"
  | "stale"
  | "failed";

export type SynthesisUiFreshness =
  | "fresh"
  | "stale"
  | "dirty"
  | "queued"
  | "running"
  | "failed"
  | "unknown";

export type SynthesisUiLayoutPreset = "compact" | "balanced" | "expanded";

export type SynthesisUiRegistryScopeFilter = "all" | "library" | "referenced";

export type SynthesisUiBindingStatus =
  | "candidate"
  | "accepted"
  | "rejected"
  | "stale_target";

export type SynthesisUiBindingStatusFilter =
  | "all"
  | "unbound"
  | SynthesisUiBindingStatus;

export type SynthesisUiReviewTab =
  | "reference_matching"
  | "index_cleanup"
  | "concepts"
  | "topic_graph";

export type SynthesisUiReviewStatusFilter =
  | "open"
  | "all"
  | "accepted"
  | "rejected"
  | "superseded";

export type SynthesisUiReviewKindFilter =
  | "all"
  | "zotero_binding"
  | "canonical_merge";

export type SynthesisUiReviewConfidenceFilter =
  | "all"
  | "deterministic"
  | "high"
  | "medium"
  | "low"
  | "review";

export type SynthesisUiGraphElement =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string };

export type SynthesisUiTopicUpdateIntent = {
  topicId: string;
  language: string;
  updateScope: string;
  updateMode: "auto" | "update_patch" | "update_full";
  updateReason: string;
  actionLabel: "Update" | "Complete" | "Repair/Rebuild";
  changedSections: string[];
  blocked?: boolean;
};

export type SynthesisUiArtifactRow = {
  id: string;
  title: string;
  kind: "topic_synthesis";
  coverage: SynthesisUiCoverage;
  freshness: SynthesisUiFreshness;
  updated_at?: string;
  markdown_preview?: string;
  paper_count?: number;
  summary?: string;
  completion?: number;
  status?: string;
  readerMode?: string;
  language?: string;
  external_literature_count?: number;
  stale_reasons?: string[];
  dirty_reasons?: string[];
  missing_sections?: string[];
  updateIntent?: SynthesisUiTopicUpdateIntent;
};

export type SynthesisUiRegistryRow = {
  paper_ref: string;
  title: string;
  year?: string;
  artifactCoverage: SynthesisUiCoverage;
  missing_artifacts: string[];
  index_scope?: "library" | "referenced";
  literature_item_id?: string;
  reference_count?: number;
  unbound_reference_count?: number;
  referenced_by_count?: number;
  references?: SynthesisUiRegistryReferenceRow[];
};

export type SynthesisUiRegistryReferenceRow = {
  reference_instance_id: string;
  reference_index: number;
  title: string;
  year?: string;
  raw_reference?: string;
  confidence?: string;
  target_literature_item_id?: string;
  target_title?: string;
  target_paper_ref?: string;
  target_binding: "library" | "external" | "none";
  binding_status?: SynthesisUiBindingStatus;
};

export type SynthesisUiReferenceMatchProposalRow = {
  proposal_id: string;
  kind: "zotero_binding" | "canonical_merge";
  status: "open" | "accepted" | "rejected" | "superseded";
  source_canonical_reference_id: string;
  source_raw_reference_ids: string[];
  target_canonical_reference_id?: string;
  target_library_id?: number;
  target_item_key?: string;
  confidence?: string;
  score?: number;
  reasons?: string[];
  evidence?: Record<string, unknown>;
  diagnostics?: unknown[];
  updated_at?: string;
};

export type SynthesisUiCleanupProposalRow = {
  proposal_id: string;
  status:
    | "open"
    | "resolved"
    | "deferred"
    | "blocked_by_upstream_review"
    | "superseded"
    | "retargeted"
    | "approved"
    | "rejected"
    | "skipped";
  kind?: string;
  review_kind?: string;
  priority?: number;
  blocked_by_review_item_id?: string;
  source_paper_ref: string;
  source_paper_title?: string;
  reference_instance_id?: string;
  provisional_key?: string;
  reference_title?: string;
  reference_raw?: string;
  target_paper_ref?: string;
  target_paper_title?: string;
  target_literature_item_id?: string;
  target_work_id?: string;
  target_work_title?: string;
  reason: string;
  diagnostics?: unknown[];
  decision_summary?: string;
  updated_at?: string;
};

export type SynthesisUiTagValidationWarning = {
  code: string;
  severity: "warning" | "error";
  tag?: string;
  message: string;
};

export type SynthesisUiTagRow = {
  tag: string;
  facet: string;
  note?: string;
  source?: string;
  deprecated?: boolean;
  replacement?: string;
  aliases: string[];
  abbrev: string[];
  usage_count: number;
  last_synced_at?: string;
  validation_warnings: SynthesisUiTagValidationWarning[];
};

export type SynthesisUiTagImportPreview = {
  additions: SynthesisUiTagRow[];
  unchanged: SynthesisUiTagRow[];
  conflicts: Array<{
    tag: string;
    local: SynthesisUiTagRow;
    imported: SynthesisUiTagRow;
  }>;
  warnings: SynthesisUiTagValidationWarning[];
};

export type SynthesisUiTagImportAction =
  | "use-imported"
  | "merge-non-conflicting";

export type SynthesisUiTopicGraphRelation =
  | "broader_than"
  | "related_to"
  | "overlaps_with"
  | "contrasts_with";

export type SynthesisUiTopicGraphEdgeStatus =
  | "suggested"
  | "confirmed"
  | "rejected"
  | "stale";

export type SynthesisUiTopicGraphMode =
  | "hierarchy"
  | "neighborhood"
  | "unplaced";

export type SynthesisUiTopicGraphNode = {
  topic_id: string;
  title: string;
  aliases: string[];
  node_type: "materialized" | "placeholder";
  definition_status?: "has_synthesis" | "placeholder" | "deleted" | "stale";
  current_artifact_path?: string;
  is_root?: boolean;
  level?: "top" | "normal";
  paper_count: number;
  last_synthesis_at?: string;
  relation_statuses: SynthesisUiTopicGraphEdgeStatus[];
};

export type SynthesisUiTopicGraphEdge = {
  edge_id: string;
  source_topic_id: string;
  target_topic_id: string;
  relation: SynthesisUiTopicGraphRelation;
  status: SynthesisUiTopicGraphEdgeStatus;
  confidence?: number;
  provenance: unknown[];
  evidence_refs: unknown[];
};

export type SynthesisUiTopicGraphReviewItem = {
  review_id: string;
  status: "open" | "approved" | "rejected";
  source_topic_id: string;
  target_topic_id: string;
  target_title?: string;
  relation: SynthesisUiTopicGraphRelation;
  confidence?: number;
  provenance: unknown[];
  evidence_refs: unknown[];
  diagnostics: unknown[];
};

export type SynthesisUiTopicGraphInspector = {
  topic?: SynthesisUiTopicGraphNode;
  parents: SynthesisUiTopicGraphNode[];
  children: SynthesisUiTopicGraphNode[];
  related: Array<{
    relation: SynthesisUiTopicGraphRelation;
    status: SynthesisUiTopicGraphEdgeStatus;
    node: SynthesisUiTopicGraphNode;
  }>;
  suggestedRelations: Array<{
    edge_id: string;
    relation: SynthesisUiTopicGraphRelation;
    status: Extract<SynthesisUiTopicGraphEdgeStatus, "suggested">;
    node: SynthesisUiTopicGraphNode;
    source_topic_id: string;
    target_topic_id: string;
    confidence?: number;
    provenance?: unknown[];
    evidence_refs?: unknown[];
  }>;
  relationReviewItems: SynthesisUiTopicGraphReviewItem[];
  suggestedCount: number;
};

export type SynthesisUiConceptRow = {
  concept_id: string;
  label: string;
  aliases: string[];
  concept_type: string;
  domain: string;
  status: "active" | "review" | "deprecated";
  short_definition?: string;
  definition?: string;
  usage_note?: string;
  editorial_note?: string;
  sense_ids: string[];
};

export type SynthesisUiConceptSenseRow = {
  sense_id: string;
  concept_id: string;
  label: string;
  aliases: string[];
  domain: string;
  short_definition: string;
  definition: string;
  confidence: "high" | "medium" | "low";
  source_topic_ids: string[];
};

export type SynthesisUiConceptAliasRow = {
  alias_id: string;
  alias: string;
  normalized: string;
  concept_id: string;
  sense_id?: string;
  status: "active" | "review" | "deprecated";
  confidence: "high" | "medium" | "low";
};

export type SynthesisUiConceptOverlayEntry = {
  concept_id: string;
  sense_id?: string;
  alias: string;
  label: string;
  short_definition?: string;
  definition?: string;
  confidence: "high" | "medium" | "low";
};

export type SynthesisUiConceptReviewItem = {
  review_id: string;
  status: "open" | "approved" | "merged" | "rejected";
  reason: "low_confidence_concept" | "ambiguous_concept_match";
  topic_id: string;
  label: string;
  confidence: "high" | "medium" | "low";
  candidate_concept_ids: string[];
};

export type SynthesisUiGraphNode = {
  id: string;
  label: string;
  kind: "library_paper" | "external_reference";
  year?: string;
  tags?: string[];
  collections?: string[];
  x?: number;
  y?: number;
  low_signal?: boolean;
  external_degree?: number;
  visibility?: "default" | "hover_only";
  display_tier?: "library" | "shared_external" | "single_external";
};

export type SynthesisUiGraphEdge = {
  id: string;
  source: string;
  target: string;
  primary_role?: string;
  mention_count?: number;
  visibility?: "default" | "hover_only";
};

export type SynthesisUiPreferencesStatus = {
  sourceWatchEnabled: boolean;
  registryAutoRebuild: boolean;
  graphRebuildMode: "off" | "idle" | "auto";
  stalenessScanEnabled: boolean;
  debounceMs: number;
  startupHashCheck: boolean;
};

export type SynthesisUiStorageStatus = {
  rootPath?: string;
  rootState: "missing" | "ready" | "unbound";
  anchorState: "missing" | "ready" | "degraded";
  mirrorState: "missing" | "ready" | "degraded";
};

export type SynthesisUiSyncDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type SynthesisUiGitSyncQueueState =
  | "idle"
  | "queued"
  | "syncing"
  | "blocked_conflict"
  | "failed_retryable"
  | "failed_permanent"
  | "disabled";

export type SynthesisUiGitSyncStatus = {
  queue_state: SynthesisUiGitSyncQueueState;
  paused: boolean;
  adapter_configured: boolean;
  remote_url?: string;
  branch?: string;
  worktree_path?: string;
  last_run_status?: string;
  last_run_at?: string;
  conflict_count: number;
  conflict_assets: Array<{
    asset_path: string;
    reason: string;
  }>;
  diagnostics: SynthesisUiSyncDiagnostic[];
  allowedActions: string[];
};

export type SynthesisUiCacheStatus = {
  cache_key: string;
  status: SynthesisUiCacheReadiness;
  source_hash?: string;
  basis_hash?: string;
  refreshed_at?: string;
  updated_at?: string;
  diagnostics: SynthesisUiSyncDiagnostic[];
  allowedActions: string[];
};

export type SynthesisUiMaintenanceSummary = {
  status:
    | "ready"
    | "stale"
    | "partial"
    | "missing"
    | "queued"
    | "running"
    | "failed";
  latestUsable: {
    referenceSidecar?: {
      updated_at?: string;
      age_ms?: number;
    };
    citationGraph?: {
      updated_at?: string;
      age_ms?: number;
      graph_hash?: string;
    };
  };
  pendingDirtyCount: number;
  activeWorkerCount: number;
  activeWorkerKind?: string;
  canonicalSyncPending: boolean;
  canonicalEpoch: number;
  lastFailure?: SynthesisUiSyncDiagnostic;
  stale: string[];
  partial: string[];
  missing: string[];
  recommendedCommands: string[];
  diagnostics: SynthesisUiSyncDiagnostic[];
};

export type SynthesisUiBackgroundJobStatus =
  | "submitted"
  | "queued"
  | "running"
  | "waiting"
  | "failed";

export type SynthesisUiBackgroundJobProgress =
  | {
      mode: "indeterminate";
      label?: string;
    }
  | {
      mode: "determinate";
      percent: number;
      current?: number;
      total?: number;
      label?: string;
    };

export type SynthesisUiBackgroundJobRow = {
  job_id: string;
  source:
    | "workbench"
    | "operation"
    | "reference_sidecar_refresh"
    | "citation_graph_cache_rebuild"
    | "citation_graph_layout"
    | "git_sync"
    | "canonical_maintenance";
  status: SynthesisUiBackgroundJobStatus;
  label: string;
  detail?: string;
  updated_at?: string;
  command?: SynthesisUiHostCommandName;
  targetTab?: SynthesisUiTab;
  progress?: SynthesisUiBackgroundJobProgress;
};

export type SynthesisUiBackgroundJobSummary = {
  rows: SynthesisUiBackgroundJobRow[];
  activeCount: number;
  submittedCount: number;
  queuedCount: number;
  runningCount: number;
  waitingCount: number;
  failedCount: number;
  primaryJob?: SynthesisUiBackgroundJobRow;
};

export type SynthesisUiSyncStatus = {
  status:
    | "ready"
    | "missing_root"
    | "divergent"
    | "index_dirty"
    | "check_skipped";
  diagnostics: SynthesisUiSyncDiagnostic[];
  allowedActions: string[];
  requiresConfirmation: boolean;
  git?: SynthesisUiGitSyncStatus;
};

export type SynthesisUiConflictCandidate = {
  id: string;
  topic_id: string;
  created_at: string;
  bundle_hash: string;
  reason: string;
  status: "open" | "cleared";
};

export type SynthesisUiDeletedArtifactRow = {
  topic_id: string;
  title: string;
  deleted_at: string;
};

export type SynthesisUiState = {
  selectedTab: SynthesisUiTab;
  artifacts: {
    search: string;
    coverage: "all" | SynthesisUiCoverage;
    freshness: "all" | SynthesisUiFreshness;
    sort: "title" | "paper_count" | "updated_at";
    viewMode: "graph" | "list" | "grid";
  };
  registry: {
    search: string;
    scope: SynthesisUiRegistryScopeFilter;
    artifactCoverage: "all" | SynthesisUiCoverage;
    bindingStatus: SynthesisUiBindingStatusFilter;
    reviewDrawerOpen: boolean;
    reviewDrawerIndex: number;
    expandedSourceRefs: string[];
  };
  reviews: {
    activeTab: SynthesisUiReviewTab;
    search: string;
    status: SynthesisUiReviewStatusFilter;
    kind: SynthesisUiReviewKindFilter;
    confidence: SynthesisUiReviewConfidenceFilter;
  };
  tags: {
    search: string;
    facet: "all" | string;
    status: "all" | "active" | "deprecated" | "warning";
    selectedTag?: string;
    importDraft: string;
  };
  topicGraph: {
    mode: SynthesisUiTopicGraphMode;
    search: string;
    selectedTopicId?: string;
  };
  concepts: {
    search: string;
    conceptType: "all" | string;
    status: "all" | "active" | "review" | "deprecated";
    topicId: "all" | string;
    selectedConceptId?: string;
    overlayEnabled: boolean;
    reviewMergeTargets: Record<string, string>;
  };
  graph: {
    search: string;
    role: "all" | string;
    layoutPreset: SynthesisUiLayoutPreset;
    neighborhoodDepth: number;
    nodeKinds: SynthesisUiGraphNode["kind"][];
    showLowSignalReferences: boolean;
    selectedElement?: SynthesisUiGraphElement;
  };
  reader: {
    topicId: string;
    previousTab: Exclude<SynthesisUiTab, "reader">;
  };
};

export type SynthesisUiSnapshotInput = {
  libraryId: number;
  actions?: Partial<SynthesisUiActionStatus>;
  maintenance?: {
    summary?: Partial<SynthesisUiMaintenanceSummary>;
    backgroundJobs?: Array<Partial<SynthesisUiBackgroundJobRow>>;
  };
  storage?: Partial<SynthesisUiStorageStatus>;
  preferences?: Partial<SynthesisUiPreferencesStatus>;
  sync?: Partial<Omit<SynthesisUiSyncStatus, "git">> & { git?: unknown };
  conflicts?: SynthesisUiConflictCandidate[];
  deletedArtifacts?: {
    rows?: SynthesisUiDeletedArtifactRow[];
  };
  artifacts?: SynthesisUiArtifactRow[];
  registry?: {
    rows?: SynthesisUiRegistryRow[];
    cleanupProposals?: SynthesisUiCleanupProposalRow[];
    matchProposals?: SynthesisUiReferenceMatchProposalRow[];
    cacheStatus?: Partial<SynthesisUiCacheStatus>;
  };
  tags?: {
    entries?: Array<Partial<SynthesisUiTagRow> & { tag?: string }>;
    aliases?: Record<string, string>;
    abbrev?: Record<string, string>;
    protocol?: {
      facets?: string[];
    };
    manifest?: Record<string, unknown>;
    validationWarnings?: SynthesisUiTagValidationWarning[];
    projection?: {
      target?: string;
      stale?: boolean;
      last_rebuild_at?: string;
      diagnostics?: unknown[];
    };
    importPreview?: unknown;
    importDraft?: string;
  };
  topicGraph?: {
    nodes?: Array<Partial<SynthesisUiTopicGraphNode> & { topic_id?: string }>;
    edges?: Array<Partial<SynthesisUiTopicGraphEdge> & { edge_id?: string }>;
    reviewItems?: Array<
      Partial<SynthesisUiTopicGraphReviewItem> & { review_id?: string }
    >;
    manifest?: Record<string, unknown>;
    projection?: {
      target?: string;
      stale?: boolean;
      last_rebuild_at?: string;
      diagnostics?: unknown[];
    };
    diagnostics?: unknown[];
  };
  concepts?: {
    concepts?: Array<Partial<SynthesisUiConceptRow> & { concept_id?: string }>;
    senses?: Array<Partial<SynthesisUiConceptSenseRow> & { sense_id?: string }>;
    aliases?: Array<
      Partial<SynthesisUiConceptAliasRow> & { alias_id?: string }
    >;
    relations?: Array<Record<string, unknown>>;
    manifest?: Record<string, unknown>;
    projection?: {
      target?: string;
      stale?: boolean;
      last_rebuild_at?: string;
      diagnostics?: unknown[];
    };
    diagnostics?: unknown[];
    overlayEntries?: SynthesisUiConceptOverlayEntry[];
    reviewItems?: Array<
      Partial<SynthesisUiConceptReviewItem> & { review_id?: string }
    >;
  };
  graph?: {
    graph_hash?: string;
    layoutStatus?: SynthesisUiCacheReadiness;
    diagnostics?: Record<string, unknown>;
    nodes?: SynthesisUiGraphNode[];
    edges?: SynthesisUiGraphEdge[];
    hoverOnlyNodes?: SynthesisUiGraphNode[];
    hoverOnlyEdges?: SynthesisUiGraphEdge[];
  };
};

export type SynthesisUiSnapshot = {
  libraryId: number;
  selectedTab: SynthesisUiTab;
  actions: SynthesisUiActionStatus;
  maintenance: {
    summary: SynthesisUiMaintenanceSummary;
    backgroundJobs: SynthesisUiBackgroundJobSummary;
  };
  storage: SynthesisUiStorageStatus;
  preferences: SynthesisUiPreferencesStatus;
  sync: SynthesisUiSyncStatus;
  conflicts: {
    candidates: SynthesisUiConflictCandidate[];
  };
  deletedArtifacts: {
    count: number;
    rows: SynthesisUiDeletedArtifactRow[];
  };
  artifacts: {
    filters: SynthesisUiState["artifacts"];
    rows: SynthesisUiArtifactRow[];
    visibleRows: SynthesisUiArtifactRow[];
  };
  registry: {
    filters: SynthesisUiState["registry"];
    rows: SynthesisUiRegistryRow[];
    visibleRows: SynthesisUiRegistryRow[];
    cleanupProposals: SynthesisUiCleanupProposalRow[];
    matchProposals: SynthesisUiReferenceMatchProposalRow[];
    cacheStatus: SynthesisUiCacheStatus;
  };
  reviews: {
    filters: SynthesisUiState["reviews"];
  };
  tags: {
    filters: SynthesisUiState["tags"];
    facets: string[];
    rows: SynthesisUiTagRow[];
    visibleRows: SynthesisUiTagRow[];
    selected?: SynthesisUiTagRow;
    validationWarnings: SynthesisUiTagValidationWarning[];
    projection: {
      target: string;
      stale: boolean;
      last_rebuild_at?: string;
      diagnostics: unknown[];
    };
    manifest: Record<string, unknown>;
    importPreview?: SynthesisUiTagImportPreview;
    importDraft: string;
  };
  topicGraph: {
    filters: SynthesisUiState["topicGraph"];
    nodes: SynthesisUiTopicGraphNode[];
    edges: SynthesisUiTopicGraphEdge[];
    reviewItems: SynthesisUiTopicGraphReviewItem[];
    visibleNodes: SynthesisUiTopicGraphNode[];
    visibleEdges: SynthesisUiTopicGraphEdge[];
    inspector: SynthesisUiTopicGraphInspector;
    manifest: Record<string, unknown>;
    projection: {
      target: string;
      stale: boolean;
      last_rebuild_at?: string;
      diagnostics: unknown[];
    };
    diagnostics: unknown[];
  };
  concepts: {
    filters: SynthesisUiState["concepts"];
    rows: SynthesisUiConceptRow[];
    visibleRows: SynthesisUiConceptRow[];
    selected?: SynthesisUiConceptRow;
    senses: SynthesisUiConceptSenseRow[];
    aliases: SynthesisUiConceptAliasRow[];
    relations: Array<Record<string, unknown>>;
    reviewItems: SynthesisUiConceptReviewItem[];
    overlayEntries: SynthesisUiConceptOverlayEntry[];
    conceptTypes: string[];
    projection: {
      target: string;
      stale: boolean;
      last_rebuild_at?: string;
      diagnostics: unknown[];
    };
    manifest: Record<string, unknown>;
    diagnostics: unknown[];
  };
  graph: {
    filters: Omit<SynthesisUiState["graph"], "selectedElement">;
    graph_hash: string;
    layoutStatus: SynthesisUiCacheReadiness;
    layoutPreset: SynthesisUiLayoutPreset;
    nodeKinds: SynthesisUiGraphNode["kind"][];
    showLowSignalReferences: boolean;
    selectedElement?: SynthesisUiGraphElement;
    nodes: SynthesisUiGraphNode[];
    edges: SynthesisUiGraphEdge[];
    hoverOnlyNodes: SynthesisUiGraphNode[];
    hoverOnlyEdges: SynthesisUiGraphEdge[];
    diagnostics: Record<string, unknown>;
    visibleNodes: SynthesisUiGraphNode[];
    visibleEdges: SynthesisUiGraphEdge[];
  };
  reader: SynthesisUiState["reader"];
  hostCommands: SynthesisUiHostCommandName[];
};

export type SynthesisUiAction = {
  action: string;
  payload?: Record<string, unknown>;
};

export type SynthesisUiHostCommandName =
  | "openTopicArtifact"
  | "openCanonicalMarkdown"
  | "copyTopicMarkdownExport"
  | "openSynthesisFolder"
  | "runSynthesizeTopic"
  | "openZoteroItem"
  | "runMissingArtifactWorkflow"
  | "openPreferences"
  | "manualRecomputeLayout"
  | "validateTagVocabulary"
  | "importTagVocabulary"
  | "previewTagVocabularyImport"
  | "applyTagVocabularyImport"
  | "exportTagVocabulary"
  | "rebuildTagVocabularyIndex"
  | "rebuildConceptKbIndex"
  | "applyConceptReviewAction"
  | "updateConceptDisplayText"
  | "rebuildTopicGraphIndex"
  | "acceptTopicGraphRelation"
  | "rejectTopicGraphRelation"
  | "applyTopicGraphReviewAction"
  | "rejectTopicDiscoveryHint"
  | "restoreTopicDiscoveryHint"
  | "refreshReferenceSidecarNow"
  | "retryReferenceSidecarRefresh"
  | "runAdvancedReferenceMatchingNow"
  | "retryAdvancedReferenceMatching"
  | "applyReferenceMatchProposalAction"
  | "applyReferenceMatchProposalActions"
  | "refreshCitationGraphCacheIncrementalNow"
  | "rebuildCitationGraphCacheNow"
  | "retryCitationGraphCacheRebuild"
  | "deleteTopicArtifact"
  | "purgeDeletedTopicArtifacts"
  | "submitTopicSynthesisUpdate"
  | "resolveTopicPaperDigest"
  | "syncNow"
  | "pauseGitSync"
  | "resumeGitSync"
  | "retryGitSync"
  | "resolveGitSyncConflict";

export type SynthesisUiHostCommand = {
  command: SynthesisUiHostCommandName;
  args: Record<string, unknown>;
};

export type SynthesisUiActionOperationStatus =
  | "pending"
  | "running"
  | "queued"
  | "completed"
  | "failed";

export type SynthesisUiActionOperation = {
  key: string;
  command: SynthesisUiHostCommandName;
  status: SynthesisUiActionOperationStatus;
  label: string;
  started_at?: string;
  completed_at?: string;
  message?: string;
};

export type SynthesisUiActionStatus = {
  inFlight: SynthesisUiActionOperation[];
  lastCompleted?: SynthesisUiActionOperation;
  lastFailed?: SynthesisUiActionOperation;
  warnings: SynthesisUiActionOperation[];
};

export type SynthesisUiActionResult = {
  handled: boolean;
  state: SynthesisUiState;
  hostCommand?: SynthesisUiHostCommand;
  reason?: "unknown_action" | "unknown_host_command" | "invalid_payload";
};

const HOST_COMMANDS: SynthesisUiHostCommandName[] = [
  "openTopicArtifact",
  "openCanonicalMarkdown",
  "copyTopicMarkdownExport",
  "openSynthesisFolder",
  "runSynthesizeTopic",
  "openZoteroItem",
  "runMissingArtifactWorkflow",
  "openPreferences",
  "manualRecomputeLayout",
  "validateTagVocabulary",
  "importTagVocabulary",
  "previewTagVocabularyImport",
  "applyTagVocabularyImport",
  "exportTagVocabulary",
  "rebuildTagVocabularyIndex",
  "rebuildConceptKbIndex",
  "applyConceptReviewAction",
  "updateConceptDisplayText",
  "rebuildTopicGraphIndex",
  "acceptTopicGraphRelation",
  "rejectTopicGraphRelation",
  "applyTopicGraphReviewAction",
  "rejectTopicDiscoveryHint",
  "restoreTopicDiscoveryHint",
  "refreshReferenceSidecarNow",
  "retryReferenceSidecarRefresh",
  "runAdvancedReferenceMatchingNow",
  "retryAdvancedReferenceMatching",
  "applyReferenceMatchProposalAction",
  "applyReferenceMatchProposalActions",
  "refreshCitationGraphCacheIncrementalNow",
  "rebuildCitationGraphCacheNow",
  "retryCitationGraphCacheRebuild",
  "deleteTopicArtifact",
  "purgeDeletedTopicArtifacts",
  "submitTopicSynthesisUpdate",
  "resolveTopicPaperDigest",
  "syncNow",
  "pauseGitSync",
  "resumeGitSync",
  "retryGitSync",
  "resolveGitSyncConflict",
];

const COMMAND_LABELS: Record<SynthesisUiHostCommandName, string> = {
  openTopicArtifact: "Open topic",
  openCanonicalMarkdown: "Open markdown",
  copyTopicMarkdownExport: "Copy markdown",
  openSynthesisFolder: "Open folder",
  runSynthesizeTopic: "Create topic",
  openZoteroItem: "Open Zotero item",
  runMissingArtifactWorkflow: "Run workflow",
  openPreferences: "Open preferences",
  manualRecomputeLayout: "Rebuild graph layout",
  validateTagVocabulary: "Validate tags",
  importTagVocabulary: "Import tags",
  previewTagVocabularyImport: "Preview tag import",
  applyTagVocabularyImport: "Apply tag import",
  exportTagVocabulary: "Export tags",
  rebuildTagVocabularyIndex: "Rebuild tag index",
  rebuildConceptKbIndex: "Rebuild concept index",
  applyConceptReviewAction: "Apply concept review",
  updateConceptDisplayText: "Update concept text",
  rebuildTopicGraphIndex: "Rebuild topic graph index",
  acceptTopicGraphRelation: "Accept topic relation",
  rejectTopicGraphRelation: "Reject topic relation",
  applyTopicGraphReviewAction: "Apply topic graph review",
  rejectTopicDiscoveryHint: "Reject discovery hint",
  restoreTopicDiscoveryHint: "Restore discovery hint",
  refreshReferenceSidecarNow: "Refresh reference sidecar",
  retryReferenceSidecarRefresh: "Retry reference sidecar refresh",
  runAdvancedReferenceMatchingNow: "Run advanced reference matching",
  retryAdvancedReferenceMatching: "Retry advanced reference matching",
  applyReferenceMatchProposalAction: "Apply reference match proposal",
  applyReferenceMatchProposalActions: "Apply reference match proposals",
  refreshCitationGraphCacheIncrementalNow:
    "Refresh citation graph cache incrementally",
  rebuildCitationGraphCacheNow: "Rebuild citation graph cache",
  retryCitationGraphCacheRebuild: "Retry citation graph cache rebuild",
  deleteTopicArtifact: "Delete topic artifact",
  purgeDeletedTopicArtifacts: "Purge deleted artifacts",
  submitTopicSynthesisUpdate: "Update topic synthesis",
  resolveTopicPaperDigest: "Open paper digest",
  syncNow: "Sync now",
  pauseGitSync: "Pause sync",
  resumeGitSync: "Resume sync",
  retryGitSync: "Retry sync",
  resolveGitSyncConflict: "Resolve sync conflict",
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function cleanNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function keyPart(value: unknown, fallback = "all") {
  return cleanString(value).replace(/\s+/g, "_") || fallback;
}

export function getSynthesisUiOperationKey(
  command: SynthesisUiHostCommandName,
  args: Record<string, unknown> = {},
) {
  switch (command) {
    case "manualRecomputeLayout":
      return `${command}:${keyPart(args.preset, "balanced")}`;
    case "applyConceptReviewAction":
      return `${command}:${keyPart(args.reviewId)}`;
    case "applyTopicGraphReviewAction":
      return `${command}:${keyPart(args.reviewId)}`;
    case "applyReferenceMatchProposalAction":
      return `${command}:${keyPart(args.proposalId)}`;
    case "applyReferenceMatchProposalActions":
      return command;
    case "acceptTopicGraphRelation":
    case "rejectTopicGraphRelation":
      return `decideTopicGraphRelation:${keyPart(args.edgeId)}`;
    case "rejectTopicDiscoveryHint":
    case "restoreTopicDiscoveryHint":
      return `topicDiscoveryHint:${keyPart(args.hintId)}`;
    case "applyTagVocabularyImport":
      return `${command}:${keyPart(args.action)}`;
    case "submitTopicSynthesisUpdate":
      return `${command}:${keyPart(args.topicId)}:${keyPart(args.language, "auto")}`;
    case "openTopicArtifact":
    case "openCanonicalMarkdown":
    case "copyTopicMarkdownExport":
    case "deleteTopicArtifact":
    case "resolveTopicPaperDigest":
      return `${command}:${keyPart(args.topicId)}`;
    default:
      return command;
  }
}

export function getSynthesisUiOperationLabel(
  command: SynthesisUiHostCommandName,
) {
  return COMMAND_LABELS[command] || command;
}

function includesText(haystack: unknown, needle: string) {
  const query = needle.toLowerCase();
  if (!query) {
    return true;
  }
  return String(haystack || "")
    .toLowerCase()
    .includes(query);
}

function normalizeTab(value: unknown): SynthesisUiTab {
  const tab = cleanString(value);
  if (
    tab === "overview" ||
    tab === "artifacts" ||
    tab === "registry" ||
    tab === "reviews" ||
    tab === "tags" ||
    tab === "concepts" ||
    tab === "graph" ||
    tab === "reader"
  ) {
    return tab;
  }
  return "overview";
}

function normalizeNonReaderTab(
  value: unknown,
): Exclude<SynthesisUiTab, "reader"> {
  const tab = normalizeTab(value);
  return tab === "reader" ? "artifacts" : tab;
}

function normalizeCoverage(value: unknown): SynthesisUiCoverage {
  const normalized = cleanString(value);
  if (
    normalized === "complete" ||
    normalized === "partial" ||
    normalized === "missing"
  ) {
    return normalized;
  }
  return "missing";
}

function normalizeFreshness(value: unknown): SynthesisUiFreshness {
  const normalized = cleanString(value);
  if (
    normalized === "fresh" ||
    normalized === "stale" ||
    normalized === "dirty" ||
    normalized === "queued" ||
    normalized === "running" ||
    normalized === "failed" ||
    normalized === "unknown"
  ) {
    return normalized;
  }
  return "unknown";
}

function normalizeCacheReadiness(value: unknown): SynthesisUiCacheReadiness {
  const normalized = cleanString(value);
  if (
    normalized === "missing" ||
    normalized === "refreshing" ||
    normalized === "ready" ||
    normalized === "stale" ||
    normalized === "failed"
  ) {
    return normalized;
  }
  if (normalized === "running") {
    return "refreshing";
  }
  if (normalized === "dirty" || normalized === "unknown") {
    return "stale";
  }
  return "missing";
}

function normalizeRegistryScopeFilter(
  value: unknown,
): SynthesisUiRegistryScopeFilter {
  const normalized = cleanString(value);
  if (normalized === "all" || normalized === "library" || normalized === "referenced") {
    return normalized;
  }
  if (normalized === "reference-only") {
    return "referenced";
  }
  return "library";
}

function normalizeBindingStatusFilter(
  value: unknown,
): SynthesisUiBindingStatusFilter {
  const normalized = cleanString(value);
  if (normalized === "auto" || normalized === "confirmed" || normalized === "matched") {
    return "accepted";
  }
  if (normalized === "unresolved" || normalized === "suggested") {
    return "candidate";
  }
  if (normalized === "needs_attention") {
    return "stale_target";
  }
  if (
    normalized === "unbound" ||
    normalized === "candidate" ||
    normalized === "accepted" ||
    normalized === "rejected" ||
    normalized === "stale_target"
  ) {
    return normalized;
  }
  return "all";
}

function normalizeReferenceBindingStatus(
  value: unknown,
): SynthesisUiBindingStatus | undefined {
  const normalized = normalizeBindingStatusFilter(value);
  return normalized === "all" || normalized === "unbound"
    ? undefined
    : normalized;
}

function normalizePreset(value: unknown): SynthesisUiLayoutPreset {
  const preset = cleanString(value);
  if (preset === "compact" || preset === "balanced" || preset === "expanded") {
    return preset;
  }
  return "balanced";
}

function normalizeStringList(values: unknown) {
  return Array.from(
    new Set(
      Array.isArray(values)
        ? values.map((entry) => cleanString(entry)).filter(Boolean)
        : [],
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeSyncDiagnostics(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const severity = cleanString(row.severity);
      return {
        code: cleanString(row.code),
        severity:
          severity === "error" || severity === "warning"
            ? severity
            : ("info" as const),
        message: cleanString(row.message),
      };
    })
    .filter((entry): entry is SynthesisUiSyncDiagnostic =>
      Boolean(entry?.code),
    );
}

function normalizeSyncStatus(value: unknown): SynthesisUiSyncStatus["status"] {
  const status = cleanString(value);
  if (
    status === "missing_root" ||
    status === "divergent" ||
    status === "index_dirty" ||
    status === "check_skipped"
  ) {
    return status;
  }
  return "ready";
}

function normalizeGitSyncQueueState(
  value: unknown,
): SynthesisUiGitSyncQueueState {
  const state = cleanString(value);
  if (
    state === "queued" ||
    state === "syncing" ||
    state === "blocked_conflict" ||
    state === "failed_retryable" ||
    state === "failed_permanent" ||
    state === "disabled"
  ) {
    return state;
  }
  return "idle";
}

function normalizeGitSyncStatus(value: unknown): SynthesisUiGitSyncStatus {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const conflictReport =
    input.conflict_report && typeof input.conflict_report === "object"
      ? (input.conflict_report as Record<string, unknown>)
      : {};
  const conflicts = Array.isArray(conflictReport.conflicts)
    ? conflictReport.conflicts
    : [];
  const lastRun =
    input.last_run && typeof input.last_run === "object"
      ? (input.last_run as Record<string, unknown>)
      : {};
  return {
    queue_state: normalizeGitSyncQueueState(input.queue_state),
    paused: Boolean(input.paused),
    adapter_configured: Boolean(input.adapter_configured),
    remote_url: cleanString(input.remote_url) || undefined,
    branch: cleanString(input.branch) || undefined,
    worktree_path: cleanString(input.worktree_path) || undefined,
    last_run_status: cleanString(lastRun.status) || undefined,
    last_run_at: cleanString(lastRun.completed_at) || undefined,
    conflict_count: conflicts.length,
    conflict_assets: conflicts
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const row = entry as Record<string, unknown>;
        return {
          asset_path: cleanString(row.asset_path),
          reason: cleanString(row.reason),
        };
      })
      .filter((entry): entry is { asset_path: string; reason: string } =>
        Boolean(entry?.asset_path),
      )
      .sort((left, right) => left.asset_path.localeCompare(right.asset_path)),
    diagnostics: normalizeSyncDiagnostics(input.diagnostics),
    allowedActions: normalizeStringList(
      input.allowedActions || input.allowed_actions,
    ),
  };
}

function normalizeCacheStatus(
  value: unknown,
  fallbackCacheKey: string,
): SynthesisUiCacheStatus {
  if (!value || typeof value !== "object") {
    return {
      cache_key: fallbackCacheKey,
      status: "missing",
      diagnostics: [],
      allowedActions: [],
    };
  }
  const input = value as Record<string, unknown>;
  return {
    cache_key: cleanString(input.cache_key) || fallbackCacheKey,
    status: normalizeCacheReadiness(input.status),
    source_hash: cleanString(input.source_hash) || undefined,
    basis_hash: cleanString(input.basis_hash) || undefined,
    refreshed_at: cleanString(input.refreshed_at) || undefined,
    updated_at: cleanString(input.updated_at) || undefined,
    diagnostics: normalizeSyncDiagnostics(input.diagnostics),
    allowedActions: normalizeStringList(input.allowed_actions),
  };
}

function normalizeConflictCandidates(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Record<string, unknown>;
      return {
        id: cleanString(row.id),
        topic_id: cleanString(row.topic_id),
        created_at: cleanString(row.created_at),
        bundle_hash: cleanString(row.bundle_hash),
        reason: cleanString(row.reason),
        status: row.status === "cleared" ? "cleared" : ("open" as const),
      };
    })
    .filter((entry): entry is SynthesisUiConflictCandidate =>
      Boolean(entry?.id && entry.status === "open"),
    )
    .sort(
      (left, right) =>
        right.created_at.localeCompare(left.created_at) ||
        left.id.localeCompare(right.id),
    );
}

function normalizeDeletedArtifactRows(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Record<string, unknown>;
      return {
        topic_id: cleanString(row.topic_id),
        title: cleanString(row.title) || cleanString(row.topic_id),
        deleted_at: cleanString(row.deleted_at),
      };
    })
    .filter((entry): entry is SynthesisUiDeletedArtifactRow =>
      Boolean(entry?.topic_id),
    )
    .sort(
      (left, right) =>
        right.deleted_at.localeCompare(left.deleted_at) ||
        left.topic_id.localeCompare(right.topic_id),
    );
}

function deriveUpdateIntent(row: {
  id: string;
  coverage: SynthesisUiCoverage;
  freshness: SynthesisUiFreshness;
  language?: string;
  stale_reasons?: string[];
  dirty_reasons?: string[];
  missing_sections?: string[];
  status?: string;
}): SynthesisUiTopicUpdateIntent | undefined {
  const language = cleanString(row.language) || "auto";
  const staleReasons = normalizeStringList(row.stale_reasons);
  const dirtyReasons = normalizeStringList(row.dirty_reasons);
  const missingSections = normalizeStringList(row.missing_sections);
  if (
    row.freshness === "dirty" ||
    row.freshness === "failed" ||
    row.status === "legacy_invalid" ||
    dirtyReasons.length > 0
  ) {
    return {
      topicId: row.id,
      language,
      updateScope: "repair",
      updateMode: "update_full",
      updateReason: dirtyReasons[0] || row.status || "dirty",
      actionLabel: "Repair/Rebuild",
      changedSections: [],
    };
  }
  if (row.freshness === "queued" || row.freshness === "running") {
    return {
      topicId: row.id,
      language,
      updateScope: "maintenance",
      updateMode: "auto",
      updateReason: row.freshness,
      actionLabel: "Update",
      changedSections: [],
      blocked: true,
    };
  }
  if (row.coverage !== "complete" || missingSections.length > 0) {
    const section = missingSections[0] || "coverage";
    return {
      topicId: row.id,
      language,
      updateScope:
        section === "external_literature_analysis"
          ? "external_literature"
          : section,
      updateMode: "update_patch",
      updateReason: missingSections.length
        ? "incomplete_sections"
        : "coverage_incomplete",
      actionLabel: "Complete",
      changedSections: missingSections.length
        ? missingSections
        : ["coverage", "diagnostics"],
    };
  }
  if (row.freshness === "stale" || staleReasons.length > 0) {
    return {
      topicId: row.id,
      language,
      updateScope: "auto",
      updateMode: "auto",
      updateReason: staleReasons[0] || "stale",
      actionLabel: "Update",
      changedSections: [],
    };
  }
  return undefined;
}

function normalizeReviewTab(value: unknown): SynthesisUiReviewTab {
  const normalized = cleanString(value);
  if (
    normalized === "index_cleanup" ||
    normalized === "concepts" ||
    normalized === "topic_graph"
  ) {
    return normalized;
  }
  return "reference_matching";
}

function normalizeReviewStatusFilter(
  value: unknown,
): SynthesisUiReviewStatusFilter {
  const normalized = cleanString(value);
  if (
    normalized === "all" ||
    normalized === "accepted" ||
    normalized === "rejected" ||
    normalized === "superseded"
  ) {
    return normalized;
  }
  return "open";
}

function normalizeReviewKindFilter(value: unknown): SynthesisUiReviewKindFilter {
  const normalized = cleanString(value);
  if (normalized === "zotero_binding" || normalized === "canonical_merge") {
    return normalized;
  }
  return "all";
}

function normalizeReviewConfidenceFilter(
  value: unknown,
): SynthesisUiReviewConfidenceFilter {
  const normalized = cleanString(value);
  if (
    normalized === "deterministic" ||
    normalized === "high" ||
    normalized === "medium" ||
    normalized === "low" ||
    normalized === "review"
  ) {
    return normalized;
  }
  return "all";
}

function normalizeArtifactRows(rows: SynthesisUiArtifactRow[] | undefined) {
  return [...(rows || [])]
    .map((row) => {
      const normalized = {
        id: cleanString(row.id),
        title: cleanString(row.title) || cleanString(row.id),
        kind: "topic_synthesis" as const,
        coverage: normalizeCoverage(row.coverage),
        freshness: normalizeFreshness(row.freshness),
        updated_at: cleanString(row.updated_at) || undefined,
        markdown_preview: cleanString(row.markdown_preview) || undefined,
        paper_count: Math.max(0, Math.floor(cleanNumber(row.paper_count, 0))),
        summary: cleanString(row.summary) || undefined,
        status: cleanString(row.status) || undefined,
        readerMode: cleanString(row.readerMode) || undefined,
        language: cleanString(row.language) || undefined,
        external_literature_count: Math.max(
          0,
          Math.floor(cleanNumber(row.external_literature_count, 0)),
        ),
        stale_reasons: normalizeStringList(row.stale_reasons),
        dirty_reasons: normalizeStringList(row.dirty_reasons),
        missing_sections: normalizeStringList(row.missing_sections),
        completion: Math.max(
          0,
          Math.min(100, Math.floor(cleanNumber(row.completion, 0))),
        ),
      };
      return {
        ...normalized,
        updateIntent: row.updateIntent || deriveUpdateIntent(normalized),
      };
    })
    .filter((row) => row.id)
    .sort(
      (left, right) =>
        left.title.localeCompare(right.title) ||
        left.id.localeCompare(right.id),
    );
}

function normalizeRegistryReferences(
  rows: SynthesisUiRegistryReferenceRow[] | undefined,
) {
  return [...(rows || [])]
    .map((row) => {
      const binding = cleanString(row.target_binding);
      const targetBinding =
        binding === "library" || binding === "external" ? binding : "none";
      return {
        reference_instance_id: cleanString(row.reference_instance_id),
        reference_index: Math.max(
          0,
          Math.floor(cleanNumber(row.reference_index, 0)),
        ),
        title:
          cleanString(row.title) ||
          cleanString(row.raw_reference) ||
          cleanString(row.reference_instance_id),
        year: cleanString(row.year) || undefined,
        raw_reference: cleanString(row.raw_reference) || undefined,
        confidence: cleanString(row.confidence) || undefined,
        target_literature_item_id:
          cleanString(row.target_literature_item_id) || undefined,
        target_title: cleanString(row.target_title) || undefined,
        target_paper_ref: cleanString(row.target_paper_ref) || undefined,
        target_binding: targetBinding as "library" | "external" | "none",
        binding_status: normalizeReferenceBindingStatus(row.binding_status),
      };
    })
    .filter((row) => row.reference_instance_id)
    .sort(
      (left, right) =>
        left.reference_index - right.reference_index ||
        left.reference_instance_id.localeCompare(right.reference_instance_id),
    );
}

function normalizeRegistryRows(rows: SynthesisUiRegistryRow[] | undefined) {
  return [...(rows || [])]
    .map((row) => {
      const missing = normalizeStringList(row.missing_artifacts);
      const indexScope =
        row.index_scope === "referenced" ? "referenced" : "library";
      return {
        paper_ref: cleanString(row.paper_ref),
        title: cleanString(row.title) || cleanString(row.paper_ref),
        year: cleanString(row.year) || undefined,
        artifactCoverage: normalizeCoverage(row.artifactCoverage),
        missing_artifacts: missing,
        index_scope: indexScope as "library" | "referenced",
        literature_item_id: cleanString(row.literature_item_id) || undefined,
        reference_count: Math.max(
          0,
          Math.floor(cleanNumber(row.reference_count, 0)),
        ),
        unbound_reference_count: Math.max(
          0,
          Math.floor(cleanNumber(row.unbound_reference_count, 0)),
        ),
        referenced_by_count: Math.max(
          0,
          Math.floor(cleanNumber(row.referenced_by_count, 0)),
        ),
        references: normalizeRegistryReferences(row.references),
      };
    })
    .filter((row) => row.paper_ref)
    .sort(
      (left, right) =>
        left.title.localeCompare(right.title) ||
        left.paper_ref.localeCompare(right.paper_ref),
    );
}

function normalizeCleanupProposals(
  rows: SynthesisUiCleanupProposalRow[] | undefined,
) {
  return [...(rows || [])]
    .map((row) => ({
      proposal_id: cleanString(row.proposal_id),
      status:
        row.status === "resolved" ||
        row.status === "deferred" ||
        row.status === "blocked_by_upstream_review" ||
        row.status === "superseded" ||
        row.status === "retargeted" ||
        row.status === "approved" ||
        row.status === "rejected" ||
        row.status === "skipped"
          ? row.status
          : ("open" as const),
      kind: cleanString(row.kind) || undefined,
      review_kind: cleanString(row.review_kind) || undefined,
      priority: Math.max(0, Math.floor(Number(row.priority) || 0)),
      blocked_by_review_item_id:
        cleanString(row.blocked_by_review_item_id) || undefined,
      source_paper_ref: cleanString(row.source_paper_ref),
      source_paper_title: cleanString(row.source_paper_title) || undefined,
      reference_instance_id:
        cleanString(row.reference_instance_id) || undefined,
      provisional_key: cleanString(row.provisional_key) || undefined,
      reference_title: cleanString(row.reference_title) || undefined,
      reference_raw: cleanString(row.reference_raw) || undefined,
      target_paper_ref: cleanString(row.target_paper_ref) || undefined,
      target_paper_title: cleanString(row.target_paper_title) || undefined,
      target_literature_item_id:
        cleanString(row.target_literature_item_id) || undefined,
      target_work_id: cleanString(row.target_work_id) || undefined,
      target_work_title: cleanString(row.target_work_title) || undefined,
      reason: cleanString(row.reason),
      diagnostics: Array.isArray(row.diagnostics) ? row.diagnostics : [],
      decision_summary: cleanString(row.decision_summary) || undefined,
      updated_at: cleanString(row.updated_at) || undefined,
    }))
    .filter((row) => row.proposal_id)
    .sort((left, right) => left.proposal_id.localeCompare(right.proposal_id));
}

function normalizeReferenceMatchProposals(
  rows: SynthesisUiReferenceMatchProposalRow[] | undefined,
) {
  const statusRank = (status: string) =>
    status === "open"
      ? 0
      : status === "accepted"
        ? 1
        : status === "rejected"
          ? 2
          : 3;
  return [...(rows || [])]
    .map((row) => ({
      proposal_id: cleanString(row.proposal_id),
      kind:
        row.kind === "canonical_merge"
          ? ("canonical_merge" as const)
          : ("zotero_binding" as const),
      status:
        row.status === "accepted" ||
        row.status === "rejected" ||
        row.status === "superseded"
          ? row.status
          : ("open" as const),
      source_canonical_reference_id: cleanString(
        row.source_canonical_reference_id,
      ),
      source_raw_reference_ids: normalizeStringList(
        row.source_raw_reference_ids,
      ),
      target_canonical_reference_id:
        cleanString(row.target_canonical_reference_id) || undefined,
      target_library_id: Math.max(
        0,
        Math.floor(Number(row.target_library_id) || 0),
      ),
      target_item_key: cleanString(row.target_item_key) || undefined,
      confidence: cleanString(row.confidence) || undefined,
      score: cleanNumber(row.score, 0),
      reasons: normalizeStringList(row.reasons),
      evidence:
        row.evidence && typeof row.evidence === "object"
          ? (row.evidence as Record<string, unknown>)
          : {},
      diagnostics: Array.isArray(row.diagnostics) ? row.diagnostics : [],
      updated_at: cleanString(row.updated_at) || undefined,
    }))
    .filter((row) => row.proposal_id && row.source_canonical_reference_id)
    .sort(
      (left, right) =>
        statusRank(left.status) - statusRank(right.status) ||
        (right.updated_at || "").localeCompare(left.updated_at || "") ||
        left.proposal_id.localeCompare(right.proposal_id),
    );
}

function normalizeTagWarnings(
  values: unknown,
): SynthesisUiTagValidationWarning[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((entry): SynthesisUiTagValidationWarning | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const code = cleanString(row.code);
      if (!code) {
        return null;
      }
      return {
        code,
        severity: row.severity === "error" ? "error" : "warning",
        tag: cleanString(row.tag) || undefined,
        message: cleanString(row.message) || code,
      };
    })
    .filter((entry): entry is SynthesisUiTagValidationWarning =>
      Boolean(entry),
    );
}

function normalizeTagRows(
  rows: Array<Partial<SynthesisUiTagRow> & { tag?: string }> | undefined,
  warnings: SynthesisUiTagValidationWarning[],
) {
  const warningsByTag = new Map<string, SynthesisUiTagValidationWarning[]>();
  for (const warning of warnings) {
    const tag = cleanString(warning.tag);
    if (!tag) {
      continue;
    }
    warningsByTag.set(tag, [...(warningsByTag.get(tag) || []), warning]);
  }
  return [...(rows || [])]
    .map((row) => {
      const tag = cleanString(row.tag);
      const facet = cleanString(row.facet) || tag.split(":")[0] || "unknown";
      return {
        tag,
        facet,
        note: cleanString(row.note) || undefined,
        source: cleanString(row.source) || undefined,
        deprecated: Boolean(row.deprecated),
        replacement: cleanString(row.replacement) || undefined,
        aliases: normalizeStringList(row.aliases),
        abbrev: normalizeStringList(row.abbrev),
        usage_count: Math.max(0, Math.floor(cleanNumber(row.usage_count, 0))),
        last_synced_at: cleanString(row.last_synced_at) || undefined,
        validation_warnings: warningsByTag.get(tag) || [],
      };
    })
    .filter((row) => row.tag)
    .sort(
      (left, right) =>
        left.facet.localeCompare(right.facet) ||
        left.tag.localeCompare(right.tag),
    );
}

function normalizeTagImportPreview(
  preview: unknown,
  warnings: SynthesisUiTagValidationWarning[],
): SynthesisUiTagImportPreview | undefined {
  if (!preview || typeof preview !== "object") {
    return undefined;
  }
  const row = preview as SynthesisUiTagImportPreview;
  return {
    additions: normalizeTagRows(row.additions, warnings),
    unchanged: normalizeTagRows(row.unchanged, warnings),
    conflicts: Array.isArray(row.conflicts)
      ? row.conflicts
          .map((entry) => ({
            tag: cleanString(entry?.tag),
            local: normalizeTagRows([entry?.local], warnings)[0],
            imported: normalizeTagRows([entry?.imported], warnings)[0],
          }))
          .filter((entry) => entry.tag && entry.local && entry.imported)
      : [],
    warnings: normalizeTagWarnings(row.warnings),
  };
}

function normalizeTopicGraphRelation(
  value: unknown,
): SynthesisUiTopicGraphRelation | undefined {
  const relation = cleanString(value);
  if (
    relation === "broader_than" ||
    relation === "related_to" ||
    relation === "overlaps_with" ||
    relation === "contrasts_with"
  ) {
    return relation;
  }
  return undefined;
}

function normalizeTopicGraphStatus(
  value: unknown,
): SynthesisUiTopicGraphEdgeStatus {
  const status = cleanString(value);
  if (status === "confirmed" || status === "rejected" || status === "stale") {
    return status;
  }
  return "suggested";
}

function normalizeTopicGraphMode(value: unknown): SynthesisUiTopicGraphMode {
  const mode = cleanString(value);
  if (mode === "neighborhood" || mode === "unplaced") {
    return mode;
  }
  return "hierarchy";
}

function normalizeTopicGraphNodes(
  nodes:
    | Array<Partial<SynthesisUiTopicGraphNode> & { topic_id?: string }>
    | undefined,
) {
  return [...(nodes || [])]
    .map((node) => {
      const topicId = cleanString(node.topic_id);
      const definitionStatus = cleanString(node.definition_status);
      const nodeType =
        node.node_type === "materialized" ? "materialized" : "placeholder";
      return {
        topic_id: topicId,
        title: cleanString(node.title) || topicId,
        aliases: normalizeStringList(node.aliases),
        node_type: nodeType as SynthesisUiTopicGraphNode["node_type"],
        definition_status:
          definitionStatus === "has_synthesis" ||
          definitionStatus === "deleted" ||
          definitionStatus === "stale"
            ? definitionStatus
            : ("placeholder" as SynthesisUiTopicGraphNode["definition_status"]),
        current_artifact_path:
          cleanString(node.current_artifact_path) || undefined,
        is_root: Boolean(node.is_root),
        level:
          node.level === "top"
            ? "top"
            : ("normal" as SynthesisUiTopicGraphNode["level"]),
        paper_count: Math.max(0, Math.floor(cleanNumber(node.paper_count, 0))),
        last_synthesis_at: cleanString(node.last_synthesis_at) || undefined,
        relation_statuses: normalizeStringList(node.relation_statuses).filter(
          (entry): entry is SynthesisUiTopicGraphEdgeStatus =>
            ["suggested", "confirmed", "rejected", "stale"].includes(entry),
        ),
      };
    })
    .filter((node) => node.topic_id)
    .sort(
      (left, right) =>
        left.title.localeCompare(right.title) ||
        left.topic_id.localeCompare(right.topic_id),
    );
}

function normalizeTopicGraphEdges(
  edges:
    | Array<Partial<SynthesisUiTopicGraphEdge> & { edge_id?: string }>
    | undefined,
) {
  return [...(edges || [])]
    .map((edge) => {
      const relation = normalizeTopicGraphRelation(edge.relation);
      const source = cleanString(edge.source_topic_id);
      const target = cleanString(edge.target_topic_id);
      const confidence = cleanNumber(edge.confidence, Number.NaN);
      if (!relation) {
        return null;
      }
      return {
        edge_id:
          cleanString(edge.edge_id) || `edge:${relation}:${source}:${target}`,
        source_topic_id: source,
        target_topic_id: target,
        relation,
        status: normalizeTopicGraphStatus(edge.status),
        ...(Number.isFinite(confidence) ? { confidence } : {}),
        provenance: Array.isArray(edge.provenance) ? edge.provenance : [],
        evidence_refs: Array.isArray(edge.evidence_refs)
          ? edge.evidence_refs
          : [],
      };
    })
    .filter((edge): edge is SynthesisUiTopicGraphEdge =>
      Boolean(edge?.edge_id && edge.source_topic_id && edge.target_topic_id),
    )
    .sort((left, right) => left.edge_id.localeCompare(right.edge_id));
}

function normalizeTopicGraphReviewStatus(
  value: unknown,
): SynthesisUiTopicGraphReviewItem["status"] {
  const status = cleanString(value);
  if (status === "approved" || status === "rejected") {
    return status;
  }
  return "open";
}

function normalizeTopicGraphReviewItems(
  rows:
    | Array<Partial<SynthesisUiTopicGraphReviewItem> & { review_id?: string }>
    | undefined,
) {
  return [...(rows || [])]
    .map((row) => {
      const relation = normalizeTopicGraphRelation(row.relation);
      const confidence = cleanNumber(row.confidence, Number.NaN);
      return relation
        ? ({
            review_id: cleanString(row.review_id),
            status: normalizeTopicGraphReviewStatus(row.status),
            source_topic_id: cleanString(row.source_topic_id),
            target_topic_id: cleanString(row.target_topic_id),
            relation,
            ...(cleanString(row.target_title)
              ? { target_title: cleanString(row.target_title) }
              : {}),
            ...(Number.isFinite(confidence) ? { confidence } : {}),
            provenance: Array.isArray(row.provenance) ? row.provenance : [],
            evidence_refs: Array.isArray(row.evidence_refs)
              ? row.evidence_refs
              : [],
            diagnostics: Array.isArray(row.diagnostics) ? row.diagnostics : [],
          } satisfies SynthesisUiTopicGraphReviewItem)
        : null;
    })
    .filter(
      (row): row is SynthesisUiTopicGraphReviewItem =>
        !!row?.review_id && !!row.source_topic_id && !!row.target_topic_id,
    )
    .sort(
      (left, right) =>
        left.status.localeCompare(right.status) ||
        left.review_id.localeCompare(right.review_id),
    );
}

function attachTopicGraphStatuses(
  nodes: SynthesisUiTopicGraphNode[],
  edges: SynthesisUiTopicGraphEdge[],
) {
  const statusesByTopic = new Map<
    string,
    Set<SynthesisUiTopicGraphEdgeStatus>
  >();
  for (const edge of edges) {
    for (const topicId of [edge.source_topic_id, edge.target_topic_id]) {
      statusesByTopic.set(topicId, statusesByTopic.get(topicId) || new Set());
      statusesByTopic.get(topicId)?.add(edge.status);
    }
  }
  return nodes.map((node) => ({
    ...node,
    relation_statuses: [...(statusesByTopic.get(node.topic_id) || [])].sort(),
  }));
}

function topicGraphInspector(
  nodes: SynthesisUiTopicGraphNode[],
  edges: SynthesisUiTopicGraphEdge[],
  reviewItems: SynthesisUiTopicGraphReviewItem[],
  selectedTopicId?: string,
): SynthesisUiTopicGraphInspector {
  const byId = new Map(nodes.map((node) => [node.topic_id, node]));
  const topic =
    byId.get(cleanString(selectedTopicId)) ||
    nodes.find((node) => node.definition_status !== "deleted") ||
    nodes[0];
  if (!topic) {
    return {
      parents: [],
      children: [],
      related: [],
      suggestedRelations: [],
      relationReviewItems: [],
      suggestedCount: 0,
    };
  }
  const parents: SynthesisUiTopicGraphNode[] = [];
  const children: SynthesisUiTopicGraphNode[] = [];
  const related: SynthesisUiTopicGraphInspector["related"] = [];
  const suggestedRelations: SynthesisUiTopicGraphInspector["suggestedRelations"] =
    [];
  for (const edge of edges) {
    if (edge.status === "rejected") {
      continue;
    }
    if (edge.relation === "broader_than") {
      if (edge.target_topic_id === topic.topic_id) {
        const parent = byId.get(edge.source_topic_id);
        if (parent) {
          parents.push(parent);
          if (edge.status === "suggested") {
            suggestedRelations.push({
              edge_id: edge.edge_id,
              relation: edge.relation,
              status: "suggested",
              node: parent,
              source_topic_id: edge.source_topic_id,
              target_topic_id: edge.target_topic_id,
              ...(edge.confidence !== undefined
                ? { confidence: edge.confidence }
                : {}),
              provenance: edge.provenance || [],
              evidence_refs: edge.evidence_refs || [],
            });
          }
        }
      } else if (edge.source_topic_id === topic.topic_id) {
        const child = byId.get(edge.target_topic_id);
        if (child) {
          children.push(child);
          if (edge.status === "suggested") {
            suggestedRelations.push({
              edge_id: edge.edge_id,
              relation: edge.relation,
              status: "suggested",
              node: child,
              source_topic_id: edge.source_topic_id,
              target_topic_id: edge.target_topic_id,
              ...(edge.confidence !== undefined
                ? { confidence: edge.confidence }
                : {}),
              provenance: edge.provenance || [],
              evidence_refs: edge.evidence_refs || [],
            });
          }
        }
      }
      continue;
    }
    const oppositeId =
      edge.source_topic_id === topic.topic_id
        ? edge.target_topic_id
        : edge.target_topic_id === topic.topic_id
          ? edge.source_topic_id
          : "";
    const node = byId.get(oppositeId);
    if (node) {
      related.push({ relation: edge.relation, status: edge.status, node });
      if (edge.status === "suggested") {
        suggestedRelations.push({
          edge_id: edge.edge_id,
          relation: edge.relation,
          status: "suggested",
          node,
          source_topic_id: edge.source_topic_id,
          target_topic_id: edge.target_topic_id,
          ...(edge.confidence !== undefined
            ? { confidence: edge.confidence }
            : {}),
          provenance: edge.provenance || [],
          evidence_refs: edge.evidence_refs || [],
        });
      }
    }
  }
  const relationReviewItems = reviewItems.filter(
    (item) =>
      item.status === "open" &&
      (item.source_topic_id === topic.topic_id ||
        item.target_topic_id === topic.topic_id),
  );
  return {
    topic,
    parents,
    children,
    related,
    suggestedRelations,
    relationReviewItems,
    suggestedCount: suggestedRelations.length + relationReviewItems.length,
  };
}

function filterTopicGraph(
  nodes: SynthesisUiTopicGraphNode[],
  edges: SynthesisUiTopicGraphEdge[],
  reviewItems: SynthesisUiTopicGraphReviewItem[],
  filters: SynthesisUiState["topicGraph"],
) {
  const inspector = topicGraphInspector(
    nodes,
    edges,
    reviewItems,
    filters.selectedTopicId,
  );
  let visibleNodes = nodes.filter(
    (node) =>
      node.definition_status !== "deleted" &&
      includesText(
        `${node.title} ${node.topic_id} ${node.aliases.join(" ")}`,
        filters.search,
      ),
  );
  if (filters.mode === "unplaced") {
    const parented = new Set(
      edges
        .filter(
          (edge) =>
            edge.relation === "broader_than" && edge.status !== "rejected",
        )
        .map((edge) => edge.target_topic_id),
    );
    visibleNodes = visibleNodes.filter(
      (node) =>
        !node.is_root && node.level !== "top" && !parented.has(node.topic_id),
    );
  } else if (filters.mode === "neighborhood" && inspector.topic) {
    const ids = new Set([
      inspector.topic.topic_id,
      ...inspector.parents.map((node) => node.topic_id),
      ...inspector.children.map((node) => node.topic_id),
      ...inspector.related.map((entry) => entry.node.topic_id),
    ]);
    visibleNodes = visibleNodes.filter((node) => ids.has(node.topic_id));
  }
  const visibleIds = new Set(visibleNodes.map((node) => node.topic_id));
  const visibleEdges = edges.filter(
    (edge) =>
      edge.status !== "rejected" &&
      visibleIds.has(edge.source_topic_id) &&
      visibleIds.has(edge.target_topic_id),
  );
  return { visibleNodes, visibleEdges, inspector };
}

function normalizeConceptStatus(
  value: unknown,
): SynthesisUiConceptRow["status"] {
  const status = cleanString(value);
  if (status === "review" || status === "deprecated") {
    return status;
  }
  return "active";
}

function normalizeConceptConfidence(
  value: unknown,
): SynthesisUiConceptSenseRow["confidence"] {
  const confidence = cleanString(value);
  if (confidence === "high" || confidence === "low") {
    return confidence;
  }
  return "medium";
}

function normalizeConceptRows(
  rows:
    | Array<Partial<SynthesisUiConceptRow> & { concept_id?: string }>
    | undefined,
) {
  return [...(rows || [])]
    .map((row) => ({
      concept_id: cleanString(row.concept_id),
      label: cleanString(row.label) || cleanString(row.concept_id),
      aliases: normalizeStringList(row.aliases),
      concept_type: cleanString(row.concept_type) || "concept",
      domain: cleanString(row.domain) || "general",
      status: normalizeConceptStatus(row.status),
      short_definition: cleanString(row.short_definition) || undefined,
      definition: cleanString(row.definition) || undefined,
      usage_note: cleanString(row.usage_note) || undefined,
      editorial_note: cleanString(row.editorial_note) || undefined,
      sense_ids: normalizeStringList(row.sense_ids),
    }))
    .filter((row) => row.concept_id)
    .sort(
      (left, right) =>
        left.label.localeCompare(right.label) ||
        left.concept_id.localeCompare(right.concept_id),
    );
}

function normalizeConceptSenseRows(
  rows:
    | Array<Partial<SynthesisUiConceptSenseRow> & { sense_id?: string }>
    | undefined,
) {
  return [...(rows || [])]
    .map((row) => ({
      sense_id: cleanString(row.sense_id),
      concept_id: cleanString(row.concept_id),
      label: cleanString(row.label) || cleanString(row.sense_id),
      aliases: normalizeStringList(row.aliases),
      domain: cleanString(row.domain) || "general",
      short_definition: cleanString(row.short_definition),
      definition: cleanString(row.definition),
      confidence: normalizeConceptConfidence(row.confidence),
      source_topic_ids: normalizeStringList(row.source_topic_ids),
    }))
    .filter((row) => row.sense_id && row.concept_id)
    .sort(
      (left, right) =>
        left.label.localeCompare(right.label) ||
        left.sense_id.localeCompare(right.sense_id),
    );
}

function normalizeConceptAliasRows(
  rows:
    | Array<Partial<SynthesisUiConceptAliasRow> & { alias_id?: string }>
    | undefined,
) {
  return [...(rows || [])]
    .map((row) => ({
      alias_id: cleanString(row.alias_id),
      alias: cleanString(row.alias),
      normalized:
        cleanString(row.normalized) || cleanString(row.alias).toLowerCase(),
      concept_id: cleanString(row.concept_id),
      sense_id: cleanString(row.sense_id) || undefined,
      status: normalizeConceptStatus(row.status),
      confidence: normalizeConceptConfidence(row.confidence),
    }))
    .filter((row) => row.alias_id && row.alias && row.concept_id)
    .sort(
      (left, right) =>
        left.normalized.localeCompare(right.normalized) ||
        left.alias_id.localeCompare(right.alias_id),
    );
}

function normalizeConceptOverlayEntries(
  entries: SynthesisUiConceptOverlayEntry[] | undefined,
) {
  return [...(entries || [])]
    .map((entry) => ({
      concept_id: cleanString(entry.concept_id),
      sense_id: cleanString(entry.sense_id) || undefined,
      alias: cleanString(entry.alias),
      label: cleanString(entry.label) || cleanString(entry.alias),
      short_definition: cleanString(entry.short_definition) || undefined,
      definition: cleanString(entry.definition) || undefined,
      confidence: normalizeConceptConfidence(entry.confidence),
    }))
    .filter(
      (entry) => entry.concept_id && entry.alias && entry.confidence !== "low",
    )
    .sort(
      (left, right) =>
        right.alias.length - left.alias.length ||
        left.alias.localeCompare(right.alias),
    );
}

function normalizeConceptReviewStatus(
  value: unknown,
): SynthesisUiConceptReviewItem["status"] {
  const status = cleanString(value);
  if (status === "approved" || status === "merged" || status === "rejected") {
    return status;
  }
  return "open";
}

function normalizeConceptReviewReason(
  value: unknown,
): SynthesisUiConceptReviewItem["reason"] {
  return cleanString(value) === "ambiguous_concept_match"
    ? "ambiguous_concept_match"
    : "low_confidence_concept";
}

function normalizeConceptReviewItems(
  rows:
    | Array<Partial<SynthesisUiConceptReviewItem> & { review_id?: string }>
    | undefined,
) {
  return [...(rows || [])]
    .map((row) => ({
      review_id: cleanString(row.review_id),
      status: normalizeConceptReviewStatus(row.status),
      reason: normalizeConceptReviewReason(row.reason),
      topic_id: cleanString(row.topic_id),
      label: cleanString(row.label) || cleanString(row.review_id),
      confidence: normalizeConceptConfidence(row.confidence),
      candidate_concept_ids: normalizeStringList(row.candidate_concept_ids),
    }))
    .filter((row) => row.review_id)
    .sort(
      (left, right) =>
        left.status.localeCompare(right.status) ||
        left.label.localeCompare(right.label) ||
        left.review_id.localeCompare(right.review_id),
    );
}

function filterConcepts(
  rows: SynthesisUiConceptRow[],
  senses: SynthesisUiConceptSenseRow[],
  filters: SynthesisUiState["concepts"],
) {
  const topicConceptIds = new Set(
    filters.topicId === "all"
      ? []
      : senses
          .filter((sense) => sense.source_topic_ids.includes(filters.topicId))
          .map((sense) => sense.concept_id),
  );
  return rows.filter((row) => {
    if (
      !includesText(
        `${row.label} ${row.concept_id} ${row.aliases.join(" ")} ${row.short_definition || ""} ${row.definition || ""}`,
        filters.search,
      )
    ) {
      return false;
    }
    if (
      filters.conceptType !== "all" &&
      row.concept_type !== filters.conceptType
    ) {
      return false;
    }
    if (filters.status !== "all" && row.status !== filters.status) {
      return false;
    }
    if (filters.topicId !== "all" && !topicConceptIds.has(row.concept_id)) {
      return false;
    }
    return true;
  });
}

function normalizeGraphNodes(nodes: SynthesisUiGraphNode[] | undefined) {
  return [...(nodes || [])]
    .map((node) => {
      const rawKind = cleanString((node as Record<string, unknown>).kind);
      const kind =
        rawKind === "external_reference"
          ? ("external_reference" as const)
          : ("library_paper" as const);
      return {
        id: cleanString(node.id),
        label: cleanString(node.label) || cleanString(node.id),
        kind,
        year: cleanString(node.year) || undefined,
        tags: normalizeStringList(node.tags),
        collections: normalizeStringList(node.collections),
        x: typeof node.x === "number" ? node.x : undefined,
        y: typeof node.y === "number" ? node.y : undefined,
        low_signal: Boolean(node.low_signal),
        external_degree:
          typeof node.external_degree === "number"
            ? Math.max(0, Math.floor(node.external_degree))
            : undefined,
        visibility:
          node.visibility === "hover_only"
            ? ("hover_only" as const)
            : ("default" as const),
        display_tier:
          node.display_tier === "shared_external" ||
          node.display_tier === "single_external"
            ? node.display_tier
            : kind === "library_paper"
              ? ("library" as const)
              : ("shared_external" as const),
      };
    })
    .filter((node) => node.id)
    .sort(
      (left, right) =>
        left.label.localeCompare(right.label) ||
        left.id.localeCompare(right.id),
    );
}

function normalizeGraphEdges(edges: SynthesisUiGraphEdge[] | undefined) {
  return [...(edges || [])]
    .map((edge) => ({
      id: cleanString(edge.id),
      source: cleanString(edge.source),
      target: cleanString(edge.target),
      primary_role: cleanString(edge.primary_role) || undefined,
      mention_count: Math.max(
        0,
        Math.floor(cleanNumber(edge.mention_count, 0)),
      ),
      visibility:
        edge.visibility === "hover_only"
          ? ("hover_only" as const)
          : ("default" as const),
    }))
    .filter((edge) => edge.id && edge.source && edge.target)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeSelectedElement(
  value: unknown,
): SynthesisUiGraphElement | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const candidate = value as { kind?: unknown; id?: unknown };
  const kind = cleanString(candidate.kind);
  const id = cleanString(candidate.id);
  if (!id || (kind !== "node" && kind !== "edge")) {
    return undefined;
  }
  return { kind, id };
}

export function createDefaultSynthesisUiState(): SynthesisUiState {
  return {
    selectedTab: "overview",
    artifacts: {
      search: "",
      coverage: "all",
      freshness: "all",
      sort: "title",
      viewMode: "graph",
    },
    registry: {
      search: "",
      scope: "library",
      artifactCoverage: "all",
      bindingStatus: "all",
      reviewDrawerOpen: true,
      reviewDrawerIndex: 0,
      expandedSourceRefs: [],
    },
    reviews: {
      activeTab: "reference_matching",
      search: "",
      status: "open",
      kind: "all",
      confidence: "all",
    },
    tags: {
      search: "",
      facet: "all",
      status: "all",
      importDraft: "",
    },
    topicGraph: {
      mode: "hierarchy",
      search: "",
    },
    concepts: {
      search: "",
      conceptType: "all",
      status: "all",
      topicId: "all",
      overlayEnabled: true,
      reviewMergeTargets: {},
    },
    graph: {
      search: "",
      role: "all",
      layoutPreset: "balanced",
      neighborhoodDepth: 1,
      nodeKinds: [
        "library_paper",
        "external_reference",
      ],
      showLowSignalReferences: false,
    },
    reader: {
      topicId: "",
      previousTab: "artifacts",
    },
  };
}

export function mergeSynthesisUiSnapshotInput(
  base: SynthesisUiSnapshotInput | undefined,
  patch: SynthesisUiSnapshotInput | undefined,
): SynthesisUiSnapshotInput {
  if (!base) {
    return { ...(patch || { libraryId: 1 }) };
  }
  if (!patch) {
    return { ...base };
  }
  const merged: SynthesisUiSnapshotInput = {
    ...base,
    ...patch,
    libraryId: patch.libraryId || base.libraryId,
  };
  ([
    "maintenance",
    "storage",
    "preferences",
    "sync",
    "deletedArtifacts",
    "registry",
    "tags",
    "topicGraph",
    "concepts",
    "graph",
  ] as const).forEach((key) => {
    const baseValue = base[key];
    const patchValue = patch[key];
    if (
      baseValue &&
      patchValue &&
      typeof baseValue === "object" &&
      typeof patchValue === "object" &&
      !Array.isArray(baseValue) &&
      !Array.isArray(patchValue)
    ) {
      (merged as Record<string, unknown>)[key] = {
        ...(baseValue as Record<string, unknown>),
        ...(patchValue as Record<string, unknown>),
      };
    }
  });
  return merged;
}

function filterArtifacts(
  rows: SynthesisUiArtifactRow[],
  filters: SynthesisUiState["artifacts"],
) {
  const filtered = rows.filter((row) => {
    if (!includesText(`${row.title} ${row.id}`, filters.search)) {
      return false;
    }
    if (filters.coverage !== "all" && row.coverage !== filters.coverage) {
      return false;
    }
    if (filters.freshness !== "all" && row.freshness !== filters.freshness) {
      return false;
    }
    return true;
  });
  return filtered.sort((left, right) => {
    if (filters.sort === "paper_count") {
      return (
        (right.paper_count || 0) - (left.paper_count || 0) ||
        left.title.localeCompare(right.title) ||
        left.id.localeCompare(right.id)
      );
    }
    if (filters.sort === "updated_at") {
      return (
        String(right.updated_at || "").localeCompare(
          String(left.updated_at || ""),
        ) ||
        left.title.localeCompare(right.title) ||
        left.id.localeCompare(right.id)
      );
    }
    return (
      left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
    );
  });
}

function filterRegistry(
  rows: SynthesisUiRegistryRow[],
  filters: SynthesisUiState["registry"],
) {
  const scopeFilter = normalizeRegistryScopeFilter(filters.scope);
  return rows.filter((row) => {
    if (
      !includesText(
        `${row.title} ${row.paper_ref} ${row.year || ""} ${(
          row.references || []
        )
          .map(
            (reference) =>
              `${reference.title} ${reference.raw_reference || ""} ${
                reference.target_title || ""
              }`,
          )
          .join(" ")}`,
        filters.search,
      )
    ) {
      return false;
    }
    if (
      scopeFilter !== "referenced" &&
      filters.artifactCoverage !== "all" &&
      row.artifactCoverage !== filters.artifactCoverage
    ) {
      return false;
    }
    if (scopeFilter === "library" && row.index_scope === "referenced") {
      return false;
    }
    if (scopeFilter === "referenced") {
      const references = row.references || [];
      if (!references.length) {
        return false;
      }
      if (filters.bindingStatus !== "all") {
        if (filters.bindingStatus === "unbound") {
          return references.some((reference) => !reference.binding_status);
        }
        return references.some(
          (reference) => reference.binding_status === filters.bindingStatus,
        );
      }
    }
    return true;
  });
}

function filterTags(
  rows: SynthesisUiTagRow[],
  filters: SynthesisUiState["tags"],
) {
  return rows.filter((row) => {
    if (
      !includesText(
        `${row.tag} ${row.facet} ${row.note || ""} ${row.aliases.join(" ")} ${row.abbrev.join(" ")}`,
        filters.search,
      )
    ) {
      return false;
    }
    if (filters.facet !== "all" && row.facet !== filters.facet) {
      return false;
    }
    if (filters.status === "active" && row.deprecated) {
      return false;
    }
    if (filters.status === "deprecated" && !row.deprecated) {
      return false;
    }
    if (filters.status === "warning" && row.validation_warnings.length === 0) {
      return false;
    }
    return true;
  });
}

function filterGraph(
  nodes: SynthesisUiGraphNode[],
  edges: SynthesisUiGraphEdge[],
  filters: SynthesisUiState["graph"],
) {
  const matchesNodeBaseFilters = (node: SynthesisUiGraphNode) =>
    filters.nodeKinds.includes(node.kind) &&
    (filters.showLowSignalReferences || !node.low_signal);
  const visibleNodes = nodes.filter((node) => {
    if (!matchesNodeBaseFilters(node)) {
      return false;
    }
    if (node.visibility === "hover_only") {
      return false;
    }
    return true;
  });
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = edges.filter((edge) => {
    if (edge.visibility === "hover_only") {
      return false;
    }
    if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) {
      return false;
    }
    if (filters.role !== "all" && edge.primary_role !== filters.role) {
      return false;
    }
    return true;
  });
  return { visibleNodes, visibleEdges };
}

function normalizeLatestUsableEntry(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const input = value as Record<string, unknown>;
  return {
    updated_at: cleanString(input.updated_at) || undefined,
    age_ms: Number.isFinite(Number(input.age_ms))
      ? Math.max(0, Math.floor(Number(input.age_ms)))
      : undefined,
    graph_hash: cleanString(input.graph_hash) || undefined,
  };
}

function normalizeMaintenanceSummary(
  input: Partial<SynthesisUiMaintenanceSummary> | undefined,
): SynthesisUiMaintenanceSummary {
  const status = cleanString(input?.status);
  const normalizedStatus = [
    "stale",
    "partial",
    "missing",
    "queued",
    "running",
    "failed",
  ].includes(status)
    ? (status as SynthesisUiMaintenanceSummary["status"])
    : "ready";
  return {
    status: normalizedStatus,
    latestUsable: {
      referenceSidecar: normalizeLatestUsableEntry(
        input?.latestUsable?.referenceSidecar,
      ),
      citationGraph: normalizeLatestUsableEntry(
        input?.latestUsable?.citationGraph,
      ),
    },
    pendingDirtyCount: Math.max(
      0,
      Math.floor(cleanNumber(input?.pendingDirtyCount, 0)),
    ),
    activeWorkerCount: Math.max(
      0,
      Math.floor(cleanNumber(input?.activeWorkerCount, 0)),
    ),
    activeWorkerKind: cleanString(input?.activeWorkerKind) || undefined,
    canonicalSyncPending: Boolean(input?.canonicalSyncPending),
    canonicalEpoch: Math.max(
      0,
      Math.floor(cleanNumber(input?.canonicalEpoch, 0)),
    ),
    lastFailure: input?.lastFailure,
    stale: normalizeStringList(input?.stale),
    partial: normalizeStringList(input?.partial),
    missing: normalizeStringList(input?.missing),
    recommendedCommands: normalizeStringList(input?.recommendedCommands),
    diagnostics: normalizeSyncDiagnostics(input?.diagnostics),
  };
}

function normalizeBackgroundJobStatus(
  value: unknown,
): SynthesisUiBackgroundJobStatus | undefined {
  const status = cleanString(value);
  if (
    status === "submitted" ||
    status === "queued" ||
    status === "running" ||
    status === "waiting" ||
    status === "failed"
  ) {
    return status;
  }
  return undefined;
}

function normalizeBackgroundJobSource(
  value: unknown,
): SynthesisUiBackgroundJobRow["source"] {
  const source = cleanString(value);
  if (
    source === "workbench" ||
    source === "operation" ||
    source === "reference_sidecar_refresh" ||
    source === "citation_graph_cache_rebuild" ||
    source === "citation_graph_layout" ||
    source === "git_sync" ||
    source === "canonical_maintenance"
  ) {
    return source;
  }
  return "workbench";
}

function normalizeBackgroundJobProgress(
  value: unknown,
): SynthesisUiBackgroundJobProgress | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const input = value as Record<string, unknown>;
  const label = cleanString(input.label) || undefined;
  if (cleanString(input.mode) === "determinate") {
    const total = Math.max(0, Math.floor(cleanNumber(input.total, 0)));
    const current = Math.max(0, Math.floor(cleanNumber(input.current, 0)));
    const percentSource = cleanNumber(input.percent, Number.NaN);
    const percent =
      Number.isFinite(percentSource) && percentSource >= 0
        ? percentSource
        : total > 0
          ? (Math.min(current, total) / total) * 100
          : Number.NaN;
    if (!Number.isFinite(percent)) {
      return label
        ? { mode: "indeterminate", label }
        : { mode: "indeterminate" };
    }
    return {
      mode: "determinate",
      percent: Math.max(0, Math.min(100, Math.round(percent))),
      current: total > 0 ? Math.min(current, total) : undefined,
      total: total > 0 ? total : undefined,
      label,
    };
  }
  return label ? { mode: "indeterminate", label } : { mode: "indeterminate" };
}

function normalizeBackgroundJobRows(
  values: unknown,
): SynthesisUiBackgroundJobRow[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const rows = new Map<string, SynthesisUiBackgroundJobRow>();
  for (const entry of values) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const input = entry as Partial<SynthesisUiBackgroundJobRow>;
    const jobId = cleanString(input.job_id);
    const label = cleanString(input.label);
    if (!jobId || !label) {
      continue;
    }
    const status = normalizeBackgroundJobStatus(input.status);
    if (!status) {
      continue;
    }
    const command = cleanString(input.command) as SynthesisUiHostCommandName;
    const targetTab = cleanString(input.targetTab)
      ? normalizeTab(input.targetTab)
      : undefined;
    const row: SynthesisUiBackgroundJobRow = {
      job_id: jobId,
      source: normalizeBackgroundJobSource(input.source),
      status,
      label,
      detail: cleanString(input.detail) || undefined,
      updated_at: cleanString(input.updated_at) || undefined,
      command: HOST_COMMANDS.includes(command) ? command : undefined,
      targetTab,
      progress: normalizeBackgroundJobProgress(input.progress),
    };
    const existing = rows.get(row.job_id);
    if (
      !existing ||
      cleanString(row.updated_at).localeCompare(
        cleanString(existing.updated_at),
      ) >= 0
    ) {
      rows.set(row.job_id, row);
    }
  }
  return Array.from(rows.values()).sort((left, right) =>
    cleanString(right.updated_at).localeCompare(cleanString(left.updated_at)),
  );
}

function summarizeBackgroundJobs(
  rows: SynthesisUiBackgroundJobRow[],
): SynthesisUiBackgroundJobSummary {
  const activeRows = rows.filter((row) => row.status !== "failed");
  const running = rows.filter((row) => row.status === "running");
  const waiting = rows.filter((row) => row.status === "waiting");
  const queued = rows.filter((row) => row.status === "queued");
  const submitted = rows.filter((row) => row.status === "submitted");
  const failed = rows.filter((row) => row.status === "failed");
  return {
    rows,
    activeCount: activeRows.length,
    submittedCount: submitted.length,
    queuedCount: queued.length,
    runningCount: running.length,
    waitingCount: waiting.length,
    failedCount: failed.length,
    primaryJob:
      running[0] || waiting[0] || queued[0] || submitted[0] || failed[0],
  };
}

function normalizeActionOperation(
  input: unknown,
): SynthesisUiActionOperation | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }
  const row = input as Partial<SynthesisUiActionOperation>;
  const command = cleanString(row.command) as SynthesisUiHostCommandName;
  if (!HOST_COMMANDS.includes(command)) {
    return undefined;
  }
  const status = cleanString(row.status);
  const normalizedStatus: SynthesisUiActionOperationStatus = [
    "pending",
    "running",
    "queued",
    "completed",
    "failed",
  ].includes(status)
    ? (status as SynthesisUiActionOperationStatus)
    : "pending";
  return {
    key:
      cleanString(row.key) ||
      getSynthesisUiOperationKey(command, {} as Record<string, unknown>),
    command,
    status: normalizedStatus,
    label: cleanString(row.label) || getSynthesisUiOperationLabel(command),
    started_at: cleanString(row.started_at) || undefined,
    completed_at: cleanString(row.completed_at) || undefined,
    message: cleanString(row.message) || undefined,
  };
}

function normalizeActionStatus(
  input: Partial<SynthesisUiActionStatus> | undefined,
): SynthesisUiActionStatus {
  const inFlight = Array.isArray(input?.inFlight)
    ? input?.inFlight.map(normalizeActionOperation).filter(Boolean)
    : [];
  const warnings = Array.isArray(input?.warnings)
    ? input?.warnings.map(normalizeActionOperation).filter(Boolean)
    : [];
  return {
    inFlight: inFlight as SynthesisUiActionOperation[],
    lastCompleted: normalizeActionOperation(input?.lastCompleted),
    lastFailed: normalizeActionOperation(input?.lastFailed),
    warnings: warnings as SynthesisUiActionOperation[],
  };
}

export function buildSynthesisUiSnapshot(
  input: SynthesisUiSnapshotInput,
  state: SynthesisUiState = createDefaultSynthesisUiState(),
): SynthesisUiSnapshot {
  const artifactRows = normalizeArtifactRows(input.artifacts);
  const registryRows = normalizeRegistryRows(input.registry?.rows);
  const cleanupProposals = normalizeCleanupProposals(
    input.registry?.cleanupProposals,
  );
  const matchProposals = normalizeReferenceMatchProposals(
    input.registry?.matchProposals,
  );
  const tagWarnings = normalizeTagWarnings(input.tags?.validationWarnings);
  const tagRows = normalizeTagRows(input.tags?.entries, tagWarnings);
  const tagFacets = normalizeStringList(
    input.tags?.protocol?.facets || tagRows.map((row) => row.facet),
  );
  const visibleTagRows = filterTags(tagRows, state.tags);
  const selectedTag =
    tagRows.find((row) => row.tag === state.tags.selectedTag) ||
    visibleTagRows[0];
  const topicGraphEdges = normalizeTopicGraphEdges(input.topicGraph?.edges);
  const topicGraphNodes = attachTopicGraphStatuses(
    normalizeTopicGraphNodes(input.topicGraph?.nodes),
    topicGraphEdges,
  );
  const topicGraphReviewItems = normalizeTopicGraphReviewItems(
    input.topicGraph?.reviewItems,
  );
  const filteredTopicGraph = filterTopicGraph(
    topicGraphNodes,
    topicGraphEdges,
    topicGraphReviewItems,
    state.topicGraph,
  );
  const conceptRows = normalizeConceptRows(input.concepts?.concepts);
  const conceptSenses = normalizeConceptSenseRows(input.concepts?.senses);
  const conceptAliases = normalizeConceptAliasRows(input.concepts?.aliases);
  const conceptReviewItems = normalizeConceptReviewItems(
    input.concepts?.reviewItems,
  );
  const visibleConceptRows = filterConcepts(
    conceptRows,
    conceptSenses,
    state.concepts,
  );
  const selectedConcept =
    conceptRows.find(
      (row) => row.concept_id === state.concepts.selectedConceptId,
    ) || visibleConceptRows[0];
  const conceptTypes = normalizeStringList(
    conceptRows.map((row) => row.concept_type),
  );
  const graphNodes = normalizeGraphNodes([
    ...(input.graph?.nodes || []),
    ...(input.graph?.hoverOnlyNodes || []),
  ]);
  const graphEdges = normalizeGraphEdges([
    ...(input.graph?.edges || []),
    ...(input.graph?.hoverOnlyEdges || []),
  ]);
  const graphNodeById = new Map(graphNodes.map((node) => [node.id, node]));
  const graphEdgeById = new Map(graphEdges.map((edge) => [edge.id, edge]));
  const normalizedGraphNodes = Array.from(graphNodeById.values());
  const normalizedGraphEdges = Array.from(graphEdgeById.values());
  const hoverOnlyGraphNodes = normalizedGraphNodes.filter(
    (node) => node.visibility === "hover_only",
  );
  const hoverOnlyGraphEdges = normalizedGraphEdges.filter(
    (edge) => edge.visibility === "hover_only",
  );
  const deletedArtifactRows = normalizeDeletedArtifactRows(
    input.deletedArtifacts?.rows,
  );
  const filteredGraph = filterGraph(
    normalizedGraphNodes,
    normalizedGraphEdges,
    state.graph,
  );
  const backgroundJobRows = normalizeBackgroundJobRows(
    input.maintenance?.backgroundJobs,
  );

  return {
    libraryId: Math.max(0, Math.floor(cleanNumber(input.libraryId, 0))),
    selectedTab: normalizeTab(state.selectedTab),
    actions: normalizeActionStatus(input.actions),
    maintenance: {
      summary: normalizeMaintenanceSummary(input.maintenance?.summary),
      backgroundJobs: summarizeBackgroundJobs(backgroundJobRows),
    },
    storage: {
      rootPath: cleanString(input.storage?.rootPath) || undefined,
      rootState:
        input.storage?.rootState === "ready" ||
        input.storage?.rootState === "missing"
          ? input.storage.rootState
          : "unbound",
      anchorState:
        input.storage?.anchorState === "ready" ||
        input.storage?.anchorState === "degraded"
          ? input.storage.anchorState
          : "missing",
      mirrorState:
        input.storage?.mirrorState === "ready" ||
        input.storage?.mirrorState === "degraded"
          ? input.storage.mirrorState
          : "missing",
    },
    preferences: {
      sourceWatchEnabled: Boolean(input.preferences?.sourceWatchEnabled),
      registryAutoRebuild: Boolean(input.preferences?.registryAutoRebuild),
      graphRebuildMode:
        input.preferences?.graphRebuildMode === "idle" ||
        input.preferences?.graphRebuildMode === "auto"
          ? input.preferences.graphRebuildMode
          : "off",
      stalenessScanEnabled: Boolean(input.preferences?.stalenessScanEnabled),
      debounceMs: Math.max(
        0,
        Math.floor(cleanNumber(input.preferences?.debounceMs, 0)),
      ),
      startupHashCheck: Boolean(input.preferences?.startupHashCheck),
    },
    sync: {
      status: normalizeSyncStatus(input.sync?.status),
      diagnostics: normalizeSyncDiagnostics(input.sync?.diagnostics),
      allowedActions: normalizeStringList(input.sync?.allowedActions),
      requiresConfirmation: Boolean(input.sync?.requiresConfirmation),
      git: normalizeGitSyncStatus(input.sync?.git),
    },
    conflicts: {
      candidates: normalizeConflictCandidates(input.conflicts),
    },
    deletedArtifacts: {
      count: deletedArtifactRows.length,
      rows: deletedArtifactRows,
    },
    artifacts: {
      filters: { ...state.artifacts },
      rows: artifactRows,
      visibleRows: filterArtifacts(artifactRows, state.artifacts),
    },
    registry: {
      filters: { ...state.registry },
      rows: registryRows,
      visibleRows: filterRegistry(registryRows, state.registry),
      cleanupProposals,
      matchProposals,
      cacheStatus: normalizeCacheStatus(
        input.registry?.cacheStatus,
        "reference-sidecar:library",
      ),
    },
    reviews: {
      filters: { ...state.reviews },
    },
    tags: {
      filters: { ...state.tags },
      facets: tagFacets,
      rows: tagRows,
      visibleRows: visibleTagRows,
      selected: selectedTag,
      validationWarnings: tagWarnings,
      projection: {
        target: cleanString(input.tags?.projection?.target) || "tag-index",
        stale: Boolean(input.tags?.projection?.stale),
        last_rebuild_at:
          cleanString(input.tags?.projection?.last_rebuild_at) || undefined,
        diagnostics: Array.isArray(input.tags?.projection?.diagnostics)
          ? input.tags?.projection?.diagnostics || []
          : [],
      },
      manifest:
        input.tags?.manifest && typeof input.tags.manifest === "object"
          ? { ...input.tags.manifest }
          : {},
      importDraft:
        cleanString(input.tags?.importDraft) || state.tags.importDraft,
      importPreview: normalizeTagImportPreview(
        input.tags?.importPreview,
        tagWarnings,
      ),
    },
    topicGraph: {
      filters: { ...state.topicGraph },
      nodes: topicGraphNodes,
      edges: topicGraphEdges,
      reviewItems: topicGraphReviewItems,
      visibleNodes: filteredTopicGraph.visibleNodes,
      visibleEdges: filteredTopicGraph.visibleEdges,
      inspector: filteredTopicGraph.inspector,
      manifest:
        input.topicGraph?.manifest &&
        typeof input.topicGraph.manifest === "object"
          ? { ...input.topicGraph.manifest }
          : {},
      projection: {
        target:
          cleanString(input.topicGraph?.projection?.target) ||
          "topic-graph-index",
        stale: Boolean(input.topicGraph?.projection?.stale),
        last_rebuild_at:
          cleanString(input.topicGraph?.projection?.last_rebuild_at) ||
          undefined,
        diagnostics: Array.isArray(input.topicGraph?.projection?.diagnostics)
          ? input.topicGraph?.projection?.diagnostics || []
          : [],
      },
      diagnostics: Array.isArray(input.topicGraph?.diagnostics)
        ? input.topicGraph?.diagnostics || []
        : [],
    },
    concepts: {
      filters: { ...state.concepts },
      rows: conceptRows,
      visibleRows: visibleConceptRows,
      selected: selectedConcept,
      senses: conceptSenses,
      aliases: conceptAliases,
      relations: Array.isArray(input.concepts?.relations)
        ? input.concepts?.relations || []
        : [],
      reviewItems: conceptReviewItems,
      overlayEntries: normalizeConceptOverlayEntries(
        state.concepts.overlayEnabled ? input.concepts?.overlayEntries : [],
      ),
      conceptTypes,
      projection: {
        target:
          cleanString(input.concepts?.projection?.target) || "concept-kb-index",
        stale: Boolean(input.concepts?.projection?.stale),
        last_rebuild_at:
          cleanString(input.concepts?.projection?.last_rebuild_at) || undefined,
        diagnostics: Array.isArray(input.concepts?.projection?.diagnostics)
          ? input.concepts?.projection?.diagnostics || []
          : [],
      },
      manifest:
        input.concepts?.manifest && typeof input.concepts.manifest === "object"
          ? { ...input.concepts.manifest }
          : {},
      diagnostics: Array.isArray(input.concepts?.diagnostics)
        ? input.concepts?.diagnostics || []
        : [],
    },
    graph: {
      filters: {
        search: state.graph.search,
        role: state.graph.role,
        layoutPreset: normalizePreset(state.graph.layoutPreset),
        neighborhoodDepth: state.graph.neighborhoodDepth,
        nodeKinds: [...state.graph.nodeKinds],
        showLowSignalReferences: state.graph.showLowSignalReferences,
      },
      graph_hash: cleanString(input.graph?.graph_hash),
      layoutStatus:
        input.graph?.layoutStatus === "ready" ||
        input.graph?.layoutStatus === "refreshing" ||
        input.graph?.layoutStatus === "stale" ||
        input.graph?.layoutStatus === "failed"
          ? input.graph.layoutStatus
          : "missing",
      layoutPreset: normalizePreset(state.graph.layoutPreset),
      nodeKinds: [...state.graph.nodeKinds],
      showLowSignalReferences: state.graph.showLowSignalReferences,
      selectedElement: state.graph.selectedElement,
      nodes: normalizedGraphNodes,
      edges: normalizedGraphEdges,
      hoverOnlyNodes: hoverOnlyGraphNodes,
      hoverOnlyEdges: hoverOnlyGraphEdges,
      diagnostics:
        input.graph?.diagnostics && typeof input.graph.diagnostics === "object"
          ? { ...input.graph.diagnostics }
          : {},
      visibleNodes: filteredGraph.visibleNodes,
      visibleEdges: filteredGraph.visibleEdges,
    },
    reader: {
      topicId: cleanString(state.reader.topicId),
      previousTab: normalizeNonReaderTab(state.reader.previousTab),
    },
    hostCommands: [...HOST_COMMANDS],
  };
}

export function normalizeSynthesisUiSnapshot(
  input: SynthesisUiSnapshotInput,
): SynthesisUiSnapshot {
  return buildSynthesisUiSnapshot(input, createDefaultSynthesisUiState());
}

function normalizeAllOrCoverage(value: unknown) {
  return cleanString(value) === "all" ? "all" : normalizeCoverage(value);
}

function normalizeAllOrFreshness(value: unknown) {
  return cleanString(value) === "all" ? "all" : normalizeFreshness(value);
}

function normalizeArtifactSort(
  value: unknown,
): SynthesisUiState["artifacts"]["sort"] {
  const normalized = cleanString(value);
  if (normalized === "paper_count" || normalized === "updated_at") {
    return normalized;
  }
  return "title";
}

function normalizeArtifactViewMode(
  value: unknown,
): SynthesisUiState["artifacts"]["viewMode"] {
  const mode = cleanString(value);
  if (mode === "list" || mode === "grid") {
    return mode;
  }
  return "graph";
}

export function applySynthesisUiAction(
  state: SynthesisUiState,
  envelope: SynthesisUiAction,
): SynthesisUiActionResult {
  const action = cleanString(envelope.action);
  const payload = envelope.payload || {};
  const next: SynthesisUiState = {
    selectedTab: state.selectedTab,
    artifacts: { ...state.artifacts },
    registry: { ...state.registry },
    reviews: { ...state.reviews },
    tags: { ...state.tags },
    topicGraph: { ...state.topicGraph },
    concepts: { ...state.concepts },
    graph: { ...state.graph },
    reader: { ...state.reader },
  };

  if (action === "ready" || action === "refresh") {
    return { handled: true, state: next };
  }

  if (action === "selectTab") {
    next.selectedTab = normalizeTab(payload.tab);
    if (next.selectedTab !== "reader") {
      next.reader.previousTab = next.selectedTab;
    }
    return { handled: true, state: next };
  }

  if (action === "showArtifactReader") {
    const topicId = cleanString(payload.topicId);
    if (!topicId) {
      return { handled: false, state: next, reason: "invalid_payload" };
    }
    next.reader.topicId = topicId;
    next.reader.previousTab =
      "previousTab" in payload
        ? normalizeNonReaderTab(payload.previousTab)
        : state.selectedTab === "reader"
          ? normalizeNonReaderTab(state.reader.previousTab)
          : normalizeNonReaderTab(state.selectedTab);
    next.selectedTab = "reader";
    return { handled: true, state: next };
  }

  if (action === "closeArtifactReader") {
    next.selectedTab = normalizeNonReaderTab(state.reader.previousTab);
    next.reader.topicId = "";
    return { handled: true, state: next };
  }

  if (action === "setFilters") {
    if (payload.artifacts && typeof payload.artifacts === "object") {
      const filters = payload.artifacts as Record<string, unknown>;
      if ("search" in filters) {
        next.artifacts.search = cleanString(filters.search);
      }
      if ("coverage" in filters) {
        next.artifacts.coverage = normalizeAllOrCoverage(filters.coverage);
      }
      if ("freshness" in filters) {
        next.artifacts.freshness = normalizeAllOrFreshness(filters.freshness);
      }
      if ("sort" in filters) {
        next.artifacts.sort = normalizeArtifactSort(filters.sort);
      }
      if ("viewMode" in filters) {
        next.artifacts.viewMode = normalizeArtifactViewMode(filters.viewMode);
      }
    }
    if (payload.registry && typeof payload.registry === "object") {
      const filters = payload.registry as Record<string, unknown>;
      if ("search" in filters) {
        next.registry.search = cleanString(filters.search);
      }
      if ("scope" in filters) {
        next.registry.scope = normalizeRegistryScopeFilter(filters.scope);
        if (next.registry.scope === "referenced") {
          next.registry.artifactCoverage = "all";
        } else {
          next.registry.bindingStatus = "all";
        }
      }
      if ("artifactCoverage" in filters) {
        next.registry.artifactCoverage = normalizeAllOrCoverage(
          filters.artifactCoverage,
        );
        if (next.registry.scope === "referenced") {
          next.registry.artifactCoverage = "all";
        }
      }
      if ("bindingStatus" in filters) {
        next.registry.bindingStatus = normalizeBindingStatusFilter(
          filters.bindingStatus,
        );
        if (next.registry.scope !== "referenced") {
          next.registry.bindingStatus = "all";
        }
      }
      if ("reviewDrawerOpen" in filters) {
        next.registry.reviewDrawerOpen = Boolean(filters.reviewDrawerOpen);
      }
      if ("reviewDrawerIndex" in filters) {
        next.registry.reviewDrawerIndex = Math.max(
          0,
          Math.floor(cleanNumber(filters.reviewDrawerIndex, 0)),
        );
      }
      if ("expandedSourceRefs" in filters) {
        next.registry.expandedSourceRefs = normalizeStringList(
          filters.expandedSourceRefs,
        );
      }
    }
    if (payload.reviews && typeof payload.reviews === "object") {
      const filters = payload.reviews as Record<string, unknown>;
      if ("activeTab" in filters) {
        next.reviews.activeTab = normalizeReviewTab(filters.activeTab);
      }
      if ("search" in filters) {
        next.reviews.search = cleanString(filters.search);
      }
      if ("status" in filters) {
        next.reviews.status = normalizeReviewStatusFilter(filters.status);
      }
      if ("kind" in filters) {
        next.reviews.kind = normalizeReviewKindFilter(filters.kind);
      }
      if ("confidence" in filters) {
        next.reviews.confidence = normalizeReviewConfidenceFilter(
          filters.confidence,
        );
      }
    }
    if (payload.tags && typeof payload.tags === "object") {
      const filters = payload.tags as Record<string, unknown>;
      if ("search" in filters) {
        next.tags.search = cleanString(filters.search);
      }
      if ("facet" in filters) {
        next.tags.facet = cleanString(filters.facet) || "all";
      }
      if ("status" in filters) {
        const status = cleanString(filters.status);
        next.tags.status =
          status === "active" || status === "deprecated" || status === "warning"
            ? status
            : "all";
      }
      if ("importDraft" in filters) {
        next.tags.importDraft = cleanString(filters.importDraft);
      }
    }
    if (payload.topicGraph && typeof payload.topicGraph === "object") {
      const filters = payload.topicGraph as Record<string, unknown>;
      if ("search" in filters) {
        next.topicGraph.search = cleanString(filters.search);
      }
      if ("mode" in filters) {
        next.topicGraph.mode = normalizeTopicGraphMode(filters.mode);
      }
      if ("selectedTopicId" in filters) {
        next.topicGraph.selectedTopicId =
          cleanString(filters.selectedTopicId) || undefined;
      }
    }
    if (payload.concepts && typeof payload.concepts === "object") {
      const filters = payload.concepts as Record<string, unknown>;
      if ("search" in filters) {
        next.concepts.search = cleanString(filters.search);
      }
      if ("conceptType" in filters) {
        next.concepts.conceptType = cleanString(filters.conceptType) || "all";
      }
      if ("status" in filters) {
        const status = cleanString(filters.status);
        next.concepts.status =
          status === "active" || status === "review" || status === "deprecated"
            ? status
            : "all";
      }
      if ("topicId" in filters) {
        next.concepts.topicId = cleanString(filters.topicId) || "all";
      }
      if ("overlayEnabled" in filters) {
        next.concepts.overlayEnabled = Boolean(filters.overlayEnabled);
      }
      if ("selectedConceptId" in filters) {
        next.concepts.selectedConceptId =
          cleanString(filters.selectedConceptId) || undefined;
      }
      if (
        "reviewMergeTargets" in filters &&
        filters.reviewMergeTargets &&
        typeof filters.reviewMergeTargets === "object"
      ) {
        next.concepts.reviewMergeTargets = Object.fromEntries(
          Object.entries(filters.reviewMergeTargets as Record<string, unknown>)
            .map(([key, value]) => [cleanString(key), cleanString(value)])
            .filter(([key, value]) => key && value),
        );
      }
    }
    if (payload.graph && typeof payload.graph === "object") {
      const filters = payload.graph as Record<string, unknown>;
      if ("search" in filters) {
        next.graph.search = cleanString(filters.search);
      }
      if ("role" in filters) {
        next.graph.role = cleanString(filters.role) || "all";
      }
    }
    return { handled: true, state: next };
  }

  if (action === "selectTag") {
    const tag = cleanString(payload.tag);
    next.selectedTab = "tags";
    next.reader.previousTab = "tags";
    next.tags.selectedTag = tag || undefined;
    return { handled: true, state: next };
  }

  if (action === "setTopicGraphView") {
    if ("mode" in payload) {
      next.topicGraph.mode = normalizeTopicGraphMode(payload.mode);
    }
    if ("search" in payload) {
      next.topicGraph.search = cleanString(payload.search);
    }
    if ("selectedTopicId" in payload) {
      next.topicGraph.selectedTopicId =
        cleanString(payload.selectedTopicId) || undefined;
    }
    return { handled: true, state: next };
  }

  if (action === "selectConcept") {
    const conceptId = cleanString(payload.conceptId);
    next.selectedTab = "concepts";
    next.reader.previousTab = "concepts";
    next.concepts.selectedConceptId = conceptId || undefined;
    return { handled: true, state: next };
  }

  if (action === "setConceptOverlay") {
    next.concepts.overlayEnabled = Boolean(payload.enabled);
    return { handled: true, state: next };
  }

  if (action === "setGraphView") {
    if ("layoutPreset" in payload) {
      next.graph.layoutPreset = normalizePreset(payload.layoutPreset);
    }
    if ("role" in payload) {
      next.graph.role = cleanString(payload.role) || "all";
    }
    if (Array.isArray(payload.nodeKinds)) {
      const allowed: SynthesisUiGraphNode["kind"][] = [
        "library_paper",
        "external_reference",
      ];
      const normalized = Array.from(
        new Set(
          payload.nodeKinds
            .map(cleanString)
            .filter((entry): entry is SynthesisUiGraphNode["kind"] =>
              allowed.includes(entry as SynthesisUiGraphNode["kind"]),
            ),
        ),
      ).sort((left, right) => left.localeCompare(right));
      next.graph.nodeKinds = normalized.length ? normalized : allowed;
    }
    if ("showLowSignalReferences" in payload) {
      next.graph.showLowSignalReferences = Boolean(
        payload.showLowSignalReferences,
      );
    }
    if ("selectedElement" in payload) {
      next.graph.selectedElement = normalizeSelectedElement(
        payload.selectedElement,
      );
    }
    if ("neighborhoodDepth" in payload) {
      next.graph.neighborhoodDepth = Math.max(
        0,
        Math.min(4, Math.floor(cleanNumber(payload.neighborhoodDepth, 1))),
      );
    }
    return { handled: true, state: next };
  }

  if (action === "hostCommand") {
    const command = cleanString(payload.command) as SynthesisUiHostCommandName;
    if (!HOST_COMMANDS.includes(command)) {
      return {
        handled: false,
        state: next,
        reason: "unknown_host_command",
      };
    }
    const args =
      payload.args && typeof payload.args === "object"
        ? { ...(payload.args as Record<string, unknown>) }
        : {};
    return {
      handled: true,
      state: next,
      hostCommand: {
        command,
        args,
      },
    };
  }

  return { handled: false, state: next, reason: "unknown_action" };
}

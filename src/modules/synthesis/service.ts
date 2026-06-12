import { joinPath } from "../../utils/path";
import { yieldToEventLoop } from "../../utils/runtimeCompatibility";
import { handlers } from "../../handlers";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  listRuntimeChildren,
  copyRuntimeDirectory,
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../runtimePersistence";
import { clearPluginTaskRowEntries } from "../pluginStateStore";
import {
  buildMirrorManifest,
  buildSynthesisKnowledgeGraphPaths,
  buildSynthesisStoragePaths,
  createCanonicalEnvelope,
  encodeNoteShard,
  decodeNoteShard,
  hashCanonicalJson,
  hashMarkdown,
  LibraryWriteLock,
  resolveSynthesisRuntimeFileRoot,
  SYNTHESIS_ANCHOR_TITLE,
  type CanonicalEnvelope,
  type MirrorAssetContentType,
  type MirrorManifest,
  type MirrorManifestShard,
  type ShardKind,
} from "./foundation";
import {
  buildUnifiedCitationGraph,
  CITATION_GRAPH_LAYOUT_VERSION,
  computeCitationGraphMetrics,
  computeCitationGraphLayout,
  normalizeCitationLayoutAlgorithm,
  type CitationGraph,
  type CitationGraphEdge,
  type CitationGraphLibraryNodeMetrics,
  type CitationGraphMetrics,
  type CitationGraphNode,
  type CitationGraphLayout,
  type CitationGraphPaperInput,
  type CitationLayoutAlgorithm,
} from "./citationGraph";
import {
  buildCitationGraphInputsFromRegistryInputs,
  buildLibraryIndexFromRegistryInputs,
  createZoteroSynthesisLibraryAdapter,
  readArtifactsFromRegistryInputs,
  type PaperArtifactReadResult,
  type SynthesisLibraryAdapter,
  type SynthesisTagUsageCount,
} from "./libraryAdapter";
import { resolveDigestRepresentativeImageForUi } from "./digestRepresentativeImage";
import {
  buildReferenceSidecarIndexRow,
  buildReferenceSidecarIndexRows,
  buildReferenceSidecarMetadataFingerprintPayload,
  type ReferenceSidecarArtifactType,
  type ReferenceSidecarFacets,
  type ReferenceSidecarIndexRow,
  type ReferenceSidecarInput,
} from "./registry";
import {
  buildReviewWorkflowInput,
  type ReviewWorkflowInput,
} from "./reviewInput";
import {
  assessSynthesisSyncRecovery,
  planCanonicalRecoveryFromMirror,
  type DecodedMirrorShardSummary,
  type SynthesisConflictCandidate,
} from "./syncRecovery";
import {
  buildSynthesisUiSnapshot,
  createDefaultSynthesisUiState,
  mergeSynthesisUiSnapshotInput,
  type SynthesisUiCleanupProposalRow,
  type SynthesisUiSnapshot,
  type SynthesisUiSnapshotInput,
  type SynthesisUiState,
  type SynthesisUiArtifactRow,
  type SynthesisUiBackgroundJobRow,
  type SynthesisUiGraphTopicScope,
  type SynthesisUiReferenceMatchTargetCandidate,
  type SynthesisUiTopicUpdateIntent,
  type SynthesisWorkbenchSurfaceName,
} from "./uiModel";
import { createSynthesisTagVocabularyService } from "./tagVocabulary";
import { createSynthesisConceptKbService } from "./conceptKb";
import {
  createSynthesisTopicGraphService,
  type SynthesisTopicGraphNode,
} from "./topicGraph";
import {
  buildReferenceMatcherIndex,
  dedupeCanonicalReferencesClustered,
  normalizeSynthesisLiteratureTitle,
  resolveReferenceWithPolicy,
  type ReferenceCanonicalDedupeInput,
  type ReferenceMatcherPaperInput,
  type ReferenceMatcherReferenceInput,
} from "./referenceMatcher";
import { classifySynthesisReferenceQuality } from "./referenceQualityGate";
import { createSynthesisJsonImportService } from "./jsonImport";
import { createSynthesisCheckpointExportService } from "./checkpointExport";
import {
  maybeStartSynthesisJobProfileRun,
  readSynthesisJobProfilerSnapshot,
  type SynthesisJobProfileRun,
} from "./jobProfiler";
import {
  createSynthesisRepository,
  SYNTHESIS_REPOSITORY_TABLES,
  type SynthesisArtifactSidecarRecord,
  type SynthesisCanonicalReferenceRecord,
  type SynthesisCacheBasisRecord,
  type SynthesisCitationComplexMetricsRecord,
  type SynthesisCitationEdgeRecord,
  type SynthesisCitationIncomingGroupRecord,
  type SynthesisCitationLayoutRecord,
  type SynthesisCitationLightMetricsRecord,
  type SynthesisCitationNodeRecord,
  type SynthesisCitationSourceOwnershipRecord,
  type SynthesisOperationRecord,
  type SynthesisRawReferenceRecord,
  type SynthesisRawReferenceStaleResult,
  type SynthesisReferenceBindingRecord,
  type SynthesisReferenceMatchProposalRecord,
  type SynthesisRelatedItemsSyncEffectRecord,
  type SynthesisRepository,
  type SynthesisTopicDiscoveryHintRecord,
  type SynthesisTopicInterestMetadataRecord,
  type SynthesisReviewItemRecord,
  type SynthesisRepositoryTableName,
} from "./repository";
import {
  createSynthesisGitSyncService,
  type SynthesisGitSyncAdapter,
} from "./gitSync";
import {
  createPrefsConfiguredSynthesisGitSyncAdapter,
  getSynthesisGitSyncPrefsConfig,
  type SynthesisGitCommandRunner,
} from "./gitSyncCommandAdapter";
import {
  decideSynthesisApply,
  validateSynthesisResultBundle,
  type SynthesisResultBundle,
} from "./workflow";
import {
  assembleTopicArtifact,
  applyTopicSectionPatch,
  canonicalJsonText,
  canonicalSectionFileName,
  computeTopicCurrentHashes,
  validateTopicAnalysisManifest,
  validateTopicSynthesisArtifact,
} from "./topicStructuredArtifact";

export type SynthesisMirrorAdapter = {
  ensureAnchor: (args: {
    libraryId: number;
    title: string;
    root: string;
  }) => Promise<{ anchorKey: string }>;
  upsertShard: (args: {
    libraryId: number;
    anchorKey: string;
    title: string;
    html: string;
    kind: ShardKind;
    assetId: string;
    assetPath: string;
    contentType: MirrorAssetContentType;
    seq: number;
    total: number;
  }) => Promise<{ noteKey: string }>;
  deleteShardsNotIn?: (args: {
    libraryId: number;
    anchorKey: string;
    keepNoteKeys: string[];
  }) => Promise<void>;
  listShards?: (args: {
    libraryId: number;
    anchorKey: string;
  }) => Promise<DecodedMirrorShardSummary[]>;
};

export type SynthesisApplyResult =
  | {
      ok: true;
      status: "persisted";
      topicId: string;
      hashes: Record<string, string>;
      mirror?: SynthesisMirrorRefreshResult;
      mirrorError?: string;
      warnings?: string[];
    }
  | {
      ok: false;
      status: "conflict";
      topicId: string;
      mismatches: Array<{ name: string; base: string; current: string }>;
      conflictCandidate: SynthesisConflictCandidate;
    }
  | {
      ok: false;
      status: "patch_conflict" | "removed_paper_reference";
      topicId: string;
      reason: string;
      diagnostics?: unknown;
      mismatches?: Array<{ name: string; base: string; current: string }>;
      warnings?: string[];
    }
  | {
      ok: false;
      status: "topic_exists" | "duplicate_topic";
      topicId: string;
      reason: string;
      warnings?: string[];
    };

export type SynthesisMirrorRefreshResult = {
  anchorKey: string;
  manifest: MirrorManifest;
  shards: MirrorManifestShard[];
};

export type SynthesisTopicDeleteResult =
  | {
      ok: true;
      status: "deleted";
      topicId: string;
      deletedPathId: string;
      mirror?: SynthesisMirrorRefreshResult;
      mirrorError?: string;
      warnings?: string[];
    }
  | {
      ok: false;
      status: "not_found";
      topicId: string;
      reason: string;
    };

export type SynthesisTopicPurgeResult = {
  ok: true;
  status: "purged";
  purged_count: number;
  mirror?: SynthesisMirrorRefreshResult;
  mirrorError?: string;
  warnings?: string[];
};

export type SynthesisWorkflowTopicOption = {
  value: string;
  label: string;
  description: string;
  meta: Record<string, unknown>;
};

export type SynthesisWorkflowTopicOptionsResult = {
  options: SynthesisWorkflowTopicOption[];
  diagnostics: Array<{
    code: string;
    message: string;
  }>;
};

export type SynthesisReadHint = {
  code: string;
  scope: "reference-sidecar" | "citation-graph" | "citation-graph-metrics";
  created_at: string;
};

export type CitationGraphSliceDirection = "incoming" | "outgoing" | "both";

export type SynthesisCitationGraphSliceResult = {
  ok: boolean;
  graph_hash: string;
  start_node_id: string;
  nodes: Array<
    CitationGraph["nodes"][number] & {
      metrics?: Pick<
        CitationGraphLibraryNodeMetrics,
        | "internal_in_degree"
        | "internal_out_degree"
        | "internal_pagerank"
        | "foundation_score"
        | "frontier_score"
        | "synthesis_role_hints"
      >;
    }
  >;
  edges: CitationGraph["edges"];
  diagnostics: {
    snapshot_found: boolean;
    depth: number;
    node_count: number;
    edge_count: number;
    truncated: boolean;
    limits: {
      maxNodes: number;
      maxEdges: number;
      maxDepth: number;
    };
    warnings: string[];
    read_hints?: SynthesisReadHint[];
    recommended_commands?: string[];
    maintenance?: Record<string, unknown>;
  };
};

export type SynthesisCitationGraphLayoutResult = {
  ok: boolean;
  status:
    | "ready"
    | "missing"
    | "stale"
    | "refreshing"
    | "failed"
    | "invalid_request"
    | "not_found"
    | "too_large";
  scope: "full" | "slice" | "explicit" | "none";
  graph_hash: string;
  layout_hash: string;
  layout_status: SynthesisCacheReadinessStatus;
  preset: CitationLayoutAlgorithm;
  view_key: string;
  nodes: Array<{
    node_id: string;
    title?: string;
    node_type: CitationGraph["nodes"][number]["kind"];
    paper_ref?: string;
    year?: string;
    x: number;
    y: number;
    low_signal?: boolean;
  }>;
  edges: Array<{
    edge_id: string;
    source: string;
    target: string;
    primary_role: string;
    aux_roles: CitationGraph["edges"][number]["aux_roles"];
    weight: number;
  }>;
  diagnostics: {
    snapshot_found: boolean;
    layout_found: boolean;
    node_count: number;
    edge_count: number;
    truncated: boolean;
    limits: {
      maxNodes: number;
      maxEdges: number;
      hardMaxNodes: number;
      hardMaxEdges: number;
    };
    warnings: string[];
    recommended_commands?: string[];
    maintenance?: Record<string, unknown>;
  };
};

export type SynthesisCitationGraphMetricsResult = {
  ok: boolean;
  graph_hash: string;
  metrics_hash: string;
  status: "ready" | "missing" | "stale";
  items: CitationGraphLibraryNodeMetrics[];
  diagnostics: {
    snapshot_found: boolean;
    metrics_found: boolean;
    stale: boolean;
    total_library_nodes: number;
    returned_count: number;
    limits: {
      limit: number;
      maxLimit: number;
    };
    warnings: string[];
    read_hints?: SynthesisReadHint[];
    recommended_commands?: string[];
    maintenance?: Record<string, unknown>;
  };
};

export type SynthesisRankedExternalReferencesResult = {
  ok: boolean;
  graph_hash: string;
  items: Array<{
    node_id: string;
    title?: string;
    year?: string;
    authors?: string[];
    external_degree: number;
    shared_source_count: number;
    source_paper_refs: string[];
    display_tier?: CitationGraphNode["display_tier"];
    visibility?: CitationGraphNode["visibility"];
    reason: string;
  }>;
  diagnostics: {
    snapshot_found: boolean;
    returned_count: number;
    total_external_nodes: number;
    limits: {
      limit: number;
      maxLimit: number;
    };
    warnings: string[];
    maintenance?: Record<string, unknown>;
  };
};

export type SynthesisAttentionQueueResult = {
  ok: boolean;
  items: Array<{
    severity: "info" | "warning" | "error";
    target: string;
    reason: string;
    source_capability: string;
    suggested_commands: string[];
    details?: Record<string, unknown>;
  }>;
  diagnostics: {
    returned_count: number;
    limits: {
      limit: number;
      maxLimit: number;
    };
    warnings: string[];
    maintenance?: Record<string, unknown>;
  };
};

type CitationGraphMetricsSortBy =
  | "foundation"
  | "frontier"
  | "pagerank"
  | "in_degree";

export type SynthesisCacheReadinessStatus =
  | "missing"
  | "refreshing"
  | "ready"
  | "stale"
  | "failed";

export type SynthesisReferenceSidecarDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type SynthesisReferenceSidecarCacheStatus = {
  schema_id: "synthesis.reference_sidecar_cache_status";
  schema_version: "1.0.0";
  cache_key: "reference-sidecar:library";
  status: SynthesisCacheReadinessStatus;
  source_hash: string;
  basis_hash?: string;
  refreshed_at?: string;
  diagnostics: SynthesisReferenceSidecarDiagnostic[];
  updated_at: string;
  allowed_actions: string[];
};

export type SynthesisServiceOptions = {
  root: string;
  runtimeRoot?: string;
  libraryId: number;
  now?: () => string;
  mirrorAdapter?: SynthesisMirrorAdapter;
  libraryAdapter?: SynthesisLibraryAdapter;
  registryInputs?: ReferenceSidecarInput[];
  citationGraphPapers?: CitationGraphPaperInput[];
  gitSyncAdapter?: SynthesisGitSyncAdapter;
  gitSyncCommandRunner?: SynthesisGitCommandRunner;
  gitSyncDebounceMs?: number;
  gitSyncRetryDelaysMs?: number[];
  gitSyncAutoRetryEnabled?: boolean;
  relatedItemsSyncHost?: RelatedItemsSyncHost | null;
  synthesisRepository?: SynthesisRepository;
  shardSize?: number;
  writeLock?: LibraryWriteLock;
};

type SynthesisSidecarReferenceInput = Record<string, unknown>;

type SynthesisWorkflowSidecarItemInput = {
  item?: unknown;
  parentItem?: unknown;
  libraryId?: unknown;
  itemKey?: unknown;
  itemType?: unknown;
  title?: unknown;
  year?: unknown;
  date?: unknown;
  creators?: unknown;
  tags?: unknown;
  collections?: unknown;
  doi?: unknown;
  arxiv?: unknown;
  isbn?: unknown;
  url?: unknown;
  citekey?: unknown;
  dateAdded?: unknown;
};

type SynthesisLiteratureDigestSidecarApplyInput =
  SynthesisWorkflowSidecarItemInput & {
    parentItem?: unknown;
    digest?: { noteKey?: unknown; payloadHash?: unknown; content?: unknown };
    references?: {
      noteKey?: unknown;
      payloadHash?: unknown;
      references?: unknown;
    };
    citationAnalysis?: { noteKey?: unknown; payloadHash?: unknown };
    literatureMatchingMetadata?: unknown;
    matchedReferences?: unknown;
    source?: unknown;
  };

type SynthesisReferenceMatchingSidecarApplyInput =
  SynthesisWorkflowSidecarItemInput & {
    parentItem?: unknown;
    noteItem?: unknown;
    references?: unknown;
    matchedItems?: unknown;
    source?: unknown;
    basis?: unknown;
  };

type TopicIndexRow = {
  topic_id: string;
  path_id: string;
  title: string;
  definition?: string;
  updated_at: string;
  metadata_hash: string;
  bundle_hash: string;
  structured_hash?: string;
  manifest_hash?: string;
  language?: string;
  operation?: string;
  paper_count?: number;
  external_literature_count?: number;
  coverage_summary?: Record<string, unknown>;
};

type TopicInventoryRow = {
  topic_id: string;
  title: string;
  definition: string;
  aliases: string[];
  updated_at: string;
  prospective_topic_relation_proposals: Record<string, unknown>[];
  status?: "active" | "archived" | "deleted";
};

type DeletedTopicArtifactRow = {
  topic_id: string;
  path_id: string;
  deleted_path_id: string;
  title: string;
  deleted_at: string;
  updated_at: string;
  metadata_hash: string;
  bundle_hash: string;
};

type TopicArtifactMetadata = {
  topic_id: string;
  title: string;
  definition?: string;
  mode: SynthesisResultBundle["mode"];
  bundle_hash: string;
  timeline: SynthesisResultBundle["timeline"];
  artifact_metadata: Record<string, unknown>;
  updated_at: string;
  operation?: string;
  language?: string;
  manifest_hash?: string;
  structured_hash?: string;
  artifact_hash?: string;
  section_hashes?: Record<string, string>;
  paper_count?: number;
  external_literature_count?: number;
  coverage_summary?: Record<string, unknown>;
  prospective_topic_relation_proposals?: Record<string, unknown>[];
  metadata_hash?: string;
};

type TopicFreshness =
  | "fresh"
  | "stale"
  | "dirty"
  | "queued"
  | "running"
  | "failed"
  | "unknown";

type TopicDiscoveryStatus = "none" | "candidates" | "rejected" | "unknown";

type TopicCoverage = "complete" | "partial" | "missing";

type TopicFreshnessReason = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  details?: Record<string, unknown>;
};

type TopicUpdateIntent = {
  allowed: boolean;
  reason: string;
  scope: string;
  mode: "auto" | "update_patch" | "update_full";
  changed_sections: string[];
  prefill: {
    topicId: string;
    language: string;
    updateScope: string;
    updateMode: "auto" | "update_patch" | "update_full";
    updateReason: string;
  };
  diagnostics: TopicFreshnessReason[];
};

type RelatedItemsSyncHost = {
  hasRelatedItem(args: {
    sourceLibraryId: number;
    sourceItemKey: string;
    targetLibraryId: number;
    targetItemKey: string;
  }): boolean | Promise<boolean>;
  addRelatedItem(args: {
    sourceLibraryId: number;
    sourceItemKey: string;
    targetLibraryId: number;
    targetItemKey: string;
  }): void | Promise<void>;
  removeRelatedItem?(args: {
    sourceLibraryId: number;
    sourceItemKey: string;
    targetLibraryId: number;
    targetItemKey: string;
  }): void | Promise<void>;
};

type RelatedItemsAcceptedCitationEdge = {
  edgeId: string;
  sourceLiteratureItemId: string;
  targetLiteratureItemId: string;
  sourceLibraryId: number;
  sourceItemKey: string;
  targetLibraryId: number;
  targetItemKey: string;
};

type TopicArtifactDependency = {
  status: string;
  hash: string;
};

type TopicDependencySnapshot = {
  resolver_hash: string;
  saved_resolved_paper_set_hash: string;
  current_resolved_paper_set_hash: string;
  saved_paper_refs: string[];
  current_paper_refs: string[];
  registry_row_hashes: Record<string, string>;
  paper_artifacts: Record<
    string,
    Record<ReferenceSidecarArtifactType, TopicArtifactDependency>
  >;
  missing_artifacts: string[];
  graph_hash: string;
  metadata_hash: string;
  index_hash: string;
};

type TopicArtifactStateRow = {
  topic_id: string;
  freshness: TopicFreshness;
  known_dependency_status?: TopicFreshness;
  discovery_status?: TopicDiscoveryStatus;
  candidate_count?: number;
  coverage: TopicCoverage;
  baseline_input_hash: string;
  current_input_hash: string;
  baseline_dependencies: TopicDependencySnapshot | null;
  current_dependencies: TopicDependencySnapshot | null;
  reasons: TopicFreshnessReason[];
  last_scanned_at: string;
  baseline_initialized_at?: string;
  updated_at?: string;
};

type RegistryReferenceUiRow = {
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
  binding_status?: "candidate" | "accepted" | "rejected" | "stale_target";
};

type RegistryUiRow = {
  paper_ref: string;
  title: string;
  year?: string;
  artifactCoverage: "complete" | "partial" | "missing";
  missing_artifacts: string[];
  index_scope?: "library" | "referenced";
  literature_item_id?: string;
  reference_count?: number;
  unbound_reference_count?: number;
  referenced_by_count?: number;
  references?: RegistryReferenceUiRow[];
};

type ReferenceSidecarReferenceFact = ReturnType<
  SynthesisRepository["listReferenceFacts"]
>[number];

const REGISTRY_ARTIFACT_TYPES: ReferenceSidecarArtifactType[] = [
  "digest",
  "references",
  "citation_analysis",
];
const REGISTRY_ARTIFACT_PAYLOAD_TYPES: Record<
  ReferenceSidecarArtifactType,
  string
> = {
  digest: "digest-markdown",
  references: "references-json",
  citation_analysis: "citation-analysis-json",
};
const LIBRARY_INDEX_PAGE_LIMIT_DEFAULT = 100;
const LIBRARY_INDEX_PAGE_LIMIT_MAX = 250;
const SYNTHESIS_REGISTRY_PAGE_LIMIT_DEFAULT = 100;
const SYNTHESIS_REGISTRY_PAGE_LIMIT_MAX = 250;
const SYNTHESIS_INDEX_REVIEW_PROPOSAL_LIMIT = 20;
const SYNTHESIS_REVIEW_CENTER_PAGE_LIMIT = 50;
const SYNTHESIS_RUNNING_OPERATION_STALE_MS = 30 * 60 * 1000;
const ACP_SKILL_RUN_ID_RE = /^acp-skill-[A-Za-z0-9._-]+$/;
export const SYNTHESIS_DATABASE_RESET_CONFIRMATION_TEXT =
  "RESET SYNTHESIS DATABASE";
export const SYNTHESIS_CLEAN_INSTALL_RESET_CONFIRMATION_TEXT =
  "RESET SYNTHESIS CLEAN INSTALL";

const defaultLock = new LibraryWriteLock();
let defaultService: SynthesisService | null = null;

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function compactError(error: unknown) {
  return cleanString(
    error && typeof error === "object" && "message" in error
      ? (error as { message?: unknown }).message
      : error,
  );
}

type SynthesisJobProgressRecord = {
  jobName: string;
  runId?: string;
  source?: string;
  label?: string;
  status?:
    | "idle"
    | "queued"
    | "running"
    | "waiting"
    | "completed"
    | "failed_retryable"
    | "failed_terminal"
    | "superseded";
  phase?: string;
  phaseLabel?: string;
  message?: string;
  processedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  totalCount?: number;
  diagnosticsJson?: string;
  progressMode?: "determinate" | "indeterminate";
  batchLimit?: number;
  timeBudgetMs?: number;
  startedAt?: string;
  completedAt?: string;
  heartbeatAt?: string;
  updatedAt?: string;
};

type SynthesisUpdateDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
};

function normalizePathForContainment(path: string) {
  const raw = cleanString(path).replace(/\\/g, "/");
  const driveMatch = raw.match(/^([A-Za-z]:)(\/|$)/);
  const drive = driveMatch?.[1].toLowerCase() || "";
  const isAbsolute = Boolean(drive || raw.startsWith("/"));
  const withoutDrive = drive ? raw.slice(drive.length) : raw;
  const parts: string[] = [];
  for (const part of withoutDrive.split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  const prefix = drive ? `${drive}/` : isAbsolute ? "/" : "";
  return `${prefix}${parts.join("/")}`.replace(/\/+$/g, "");
}

function pathContains(parent: string, child: string) {
  const base = normalizePathForContainment(parent).toLowerCase();
  const target = normalizePathForContainment(child).toLowerCase();
  return target === base || target.startsWith(`${base}/`);
}

function safeFileSegment(value: unknown, fallback: string) {
  return (
    cleanString(value)
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "") || fallback
  );
}

function zoteroItemByLibraryAndKey(libraryId: number, itemKey: string) {
  const zotero = (globalThis as { Zotero?: any }).Zotero;
  const key = cleanString(itemKey);
  if (!zotero || !key) {
    return null;
  }
  try {
    const direct = zotero.Items?.getByLibraryAndKey?.(libraryId, key);
    if (direct) {
      return direct;
    }
  } catch {
    // Fall through to optional mock/runtime scan.
  }
  try {
    const rows = zotero.Items?.getAll?.(libraryId) || [];
    return (
      rows.find(
        (item: any) =>
          cleanString(item?.key) === key &&
          Math.floor(Number(item?.libraryID) || 0) === libraryId,
      ) || null
    );
  } catch {
    return null;
  }
}

async function saveZoteroRelatedItemChange(item: any) {
  if (typeof item?.saveTx === "function") {
    await item.saveTx();
    return;
  }
  if (typeof item?.save === "function") {
    await item.save();
  }
}

function createDefaultRelatedItemsSyncHost(): RelatedItemsSyncHost | null {
  const zotero = (globalThis as { Zotero?: any }).Zotero;
  if (!zotero?.Items) {
    return null;
  }
  const resolvePair = (args: {
    sourceLibraryId: number;
    sourceItemKey: string;
    targetLibraryId: number;
    targetItemKey: string;
  }) => {
    const source = zoteroItemByLibraryAndKey(
      Math.max(0, Math.floor(Number(args.sourceLibraryId) || 0)),
      args.sourceItemKey,
    );
    const target = zoteroItemByLibraryAndKey(
      Math.max(0, Math.floor(Number(args.targetLibraryId) || 0)),
      args.targetItemKey,
    );
    if (!source || !target) {
      throw new Error(
        "Zotero related-items source or target item was not found",
      );
    }
    return { source, target };
  };
  return {
    hasRelatedItem: (args) => {
      const { source, target } = resolvePair(args);
      try {
        const related = source.getRelatedItems?.();
        if (Array.isArray(related)) {
          return related.some(
            (entry) =>
              cleanString(entry?.key || entry) === cleanString(target.key) ||
              Number(entry) === Number(target.id),
          );
        }
      } catch {
        // Fall through to mock field.
      }
      const relatedKeys = Array.isArray(source.relatedItems)
        ? source.relatedItems
        : [];
      return relatedKeys.some(
        (entry: unknown) =>
          cleanString(entry) === cleanString(target.key) ||
          Number(entry) === Number(target.id),
      );
    },
    addRelatedItem: async (args) => {
      const { source, target } = resolvePair(args);
      if (typeof source.addRelatedItem !== "function") {
        throw new Error("Zotero item does not support addRelatedItem");
      }
      await source.addRelatedItem(target);
      await saveZoteroRelatedItemChange(source);
    },
    removeRelatedItem: async (args) => {
      const { source, target } = resolvePair(args);
      if (typeof source.removeRelatedItem !== "function") {
        throw new Error("Zotero item does not support removeRelatedItem");
      }
      await source.removeRelatedItem(target);
      await saveZoteroRelatedItemChange(source);
    },
  };
}

function baseNameFromPath(path: string) {
  const normalized = cleanString(path).replace(/\\/g, "/").replace(/\/+$/g, "");
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(index + 1) : normalized;
}

function validateAcpSkillRunRoot(runRoot: string) {
  const root = cleanString(runRoot);
  if (!root) {
    throw new Error("run_root is required");
  }
  const acpSkillRunsDir = getRuntimePersistencePaths().acpSkillRunsDir;
  if (!pathContains(acpSkillRunsDir, root)) {
    throw new Error("run_root must be inside the ACP skill-runs directory");
  }
  const base = baseNameFromPath(root);
  if (!ACP_SKILL_RUN_ID_RE.test(base)) {
    throw new Error("run_root must point to an ACP skill run directory");
  }
  return root;
}

function parseNonNegativeInteger(value: unknown, fallback: number) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}

function parsePositiveInteger(value: unknown, fallback: number, max: number) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(number), max);
}

function pageRows<T>(
  rows: T[],
  args: Record<string, unknown>,
  defaults: {
    defaultLimit: number;
    maxLimit: number;
  },
) {
  const cursor = parseNonNegativeInteger(args.cursor, 0);
  const limit = parsePositiveInteger(
    args.limit,
    defaults.defaultLimit,
    defaults.maxLimit,
  );
  const page = rows.slice(cursor, cursor + limit);
  const nextCursor = cursor + page.length;
  const hasMore = nextCursor < rows.length;
  return {
    page,
    cursor: String(cursor),
    next_cursor: hasMore ? String(nextCursor) : "",
    has_more: hasMore,
    returned: page.length,
    total: rows.length,
    limit,
  };
}

function parseJsonArray(value: unknown): unknown[] {
  const text = cleanString(value);
  if (!text) {
    return [];
  }
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  const text = cleanString(value);
  if (!text) {
    return {};
  }
  try {
    const parsed = JSON.parse(text);
    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseStringArray(value: unknown): string[] {
  return parseJsonArray(value).map(cleanString).filter(Boolean);
}

const LITERATURE_MATCHING_METADATA_PAYLOAD_TYPE =
  "literature-matching-metadata-json";
const LITERATURE_MATCHING_METADATA_SCHEMA = "literature_matching_metadata.v1";

function normalizeLiteratureMetadataTerms(value: unknown, limit: number) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const entry of value) {
    const text = cleanString(entry).replace(/\s+/g, " ");
    const key = text.toLocaleLowerCase("en-US");
    if (!text || seen.has(key)) {
      continue;
    }
    seen.add(key);
    terms.push(text);
    if (terms.length >= limit) {
      break;
    }
  }
  return terms;
}

function literatureMatchingMetadataPayloadFromInput(
  input: ReferenceSidecarInput,
) {
  for (const note of input.notes || []) {
    for (const block of note.payloadBlocks || []) {
      if (block?.payloadType !== LITERATURE_MATCHING_METADATA_PAYLOAD_TYPE) {
        continue;
      }
      const payload = block.payload;
      if (
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload) ||
        (payload as { schema?: unknown }).schema !==
          LITERATURE_MATCHING_METADATA_SCHEMA
      ) {
        return null;
      }
      return {
        schema: LITERATURE_MATCHING_METADATA_SCHEMA,
        key_terms: normalizeLiteratureMetadataTerms(
          (payload as { key_terms?: unknown }).key_terms,
          12,
        ),
        methods: normalizeLiteratureMetadataTerms(
          (payload as { methods?: unknown }).methods,
          8,
        ),
        problems: normalizeLiteratureMetadataTerms(
          (payload as { problems?: unknown }).problems,
          8,
        ),
        datasets: normalizeLiteratureMetadataTerms(
          (payload as { datasets?: unknown }).datasets,
          8,
        ),
        exclude_terms: normalizeLiteratureMetadataTerms(
          (payload as { exclude_terms?: unknown }).exclude_terms,
          6,
        ),
      };
    }
  }
  return null;
}

function demoteMarkdownHeadings(markdown: string, levels: number) {
  return String(markdown || "")
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^(#{1,6})(\s+.*)$/);
      if (!match) {
        return line;
      }
      const depth = Math.min(6, match[1].length + levels);
      return `${"#".repeat(depth)}${match[2]}`;
    })
    .join("\n");
}

function filterDigestExportMarkdown(markdown: string) {
  const lines = String(markdown || "").split(/\r?\n/);
  const kept: string[] = [];
  let topLevelIndex = 0;
  let keepCurrent = true;
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      topLevelIndex += 1;
      keepCurrent = topLevelIndex <= 4;
    }
    if (keepCurrent) {
      kept.push(line);
    }
  }
  return demoteMarkdownHeadings(kept.join("\n").trim(), 2).trim() + "\n";
}

function removeCitationWrapperAndTrailingSection(report: string) {
  const lines = String(report || "").split(/\r?\n/);
  let body = lines;
  if (body[0] && /^##\s+/.test(body[0])) {
    body = body.slice(1);
    while (body[0] !== undefined && !body[0].trim()) {
      body = body.slice(1);
    }
  }
  const sectionIndexes = body
    .map((line, index) => (/^###\s+/.test(line) ? index : -1))
    .filter((index) => index >= 0);
  let removedTrailingSectionHeading = "";
  if (sectionIndexes.length >= 2) {
    const removeFrom = sectionIndexes[sectionIndexes.length - 1];
    removedTrailingSectionHeading =
      body[removeFrom]?.replace(/^#+\s*/, "").trim() || "";
    body = body.slice(0, removeFrom);
  }
  return {
    markdown: demoteMarkdownHeadings(body.join("\n").trim(), 1).trim() + "\n",
    removedTrailingSectionHeading,
  };
}

function compactAuthors(value: unknown) {
  const authors = Array.isArray(value)
    ? value.map(cleanString).filter(Boolean)
    : cleanString(value)
      ? [cleanString(value)]
      : [];
  if (authors.length > 2) {
    return `${authors.slice(0, 2).join("; ")}; et al.`;
  }
  return authors.join("; ");
}

function compactReferenceRows(payload: unknown) {
  const refs =
    isObject(payload) && Array.isArray(payload.references)
      ? payload.references
      : [];
  return refs.filter(isObject).map((reference) => ({
    id: cleanString(reference.id || reference.ref_id || reference.key),
    year: cleanString(reference.year),
    authors: compactAuthors(reference.author || reference.authors),
    title: cleanString(reference.title),
  }));
}

function artifactMarkdown(artifact: Record<string, unknown>) {
  if (cleanString(artifact.status || "available") !== "available") {
    return "";
  }
  if (typeof artifact.markdown === "string") {
    return artifact.markdown;
  }
  const payload = artifact.payload;
  if (isObject(payload) && typeof payload.content === "string") {
    return payload.content;
  }
  return "";
}

function citationReportMarkdown(artifact: Record<string, unknown>) {
  if (cleanString(artifact.status || "available") !== "available") {
    return "";
  }
  const payload = artifact.payload;
  if (isObject(payload)) {
    const citation = payload.citation_analysis;
    if (isObject(citation) && typeof citation.report_md === "string") {
      return citation.report_md;
    }
    if (typeof payload.report_md === "string") {
      return payload.report_md;
    }
  }
  return "";
}

async function writeFilteredArtifactContent(args: {
  runRoot: string;
  paperRef: string;
  artifact: Record<string, unknown>;
}) {
  const artifactType = cleanString(
    args.artifact.artifact_type || args.artifact.artifactType,
  );
  const safeRef = safeFileSegment(args.paperRef, "paper");
  const diagnostics: string[] = [];
  const directory = `runtime/payloads/artifacts/${safeRef}`;
  if (artifactType === "digest") {
    const markdown = filterDigestExportMarkdown(
      artifactMarkdown(args.artifact),
    );
    const relativePath = `${directory}/digest.md`;
    await writeRuntimeTextFile(joinPath(args.runRoot, relativePath), markdown);
    return {
      content_file: relativePath,
      content_hash: hashMarkdown(markdown),
      diagnostics,
    };
  }
  if (artifactType === "references") {
    const references = compactReferenceRows(args.artifact.payload);
    const text = `${JSON.stringify({ references }, null, 2)}\n`;
    const relativePath = `${directory}/references.json`;
    await writeRuntimeTextFile(joinPath(args.runRoot, relativePath), text);
    return {
      content_file: relativePath,
      content_hash: hashMarkdown(text),
      diagnostics,
    };
  }
  if (artifactType === "citation_analysis") {
    const result = removeCitationWrapperAndTrailingSection(
      citationReportMarkdown(args.artifact),
    );
    const relativePath = `${directory}/citation-analysis.md`;
    await writeRuntimeTextFile(
      joinPath(args.runRoot, relativePath),
      result.markdown,
    );
    if (result.removedTrailingSectionHeading) {
      diagnostics.push(
        `removed_trailing_section_heading:${result.removedTrailingSectionHeading}`,
      );
    }
    return {
      content_file: relativePath,
      content_hash: hashMarkdown(result.markdown),
      removed_trailing_section_heading: result.removedTrailingSectionHeading,
      diagnostics,
    };
  }
  return {
    content_file: "",
    content_hash: "",
    diagnostics: [`unsupported_artifact_type:${artifactType}`],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error || "unknown error");
}

function normalizeLibraryId(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function nowIso() {
  return new Date().toISOString();
}

function titleFromDefinition(
  definition: Record<string, unknown>,
  topicId: string,
) {
  return (
    cleanString(definition.title) || cleanString(definition.name) || topicId
  );
}

function definitionTextFromDefinition(definition: Record<string, unknown>) {
  return cleanString(definition.definition);
}

function topicDefinitionFromSources(args: {
  definition?: Record<string, unknown>;
  metadata?: Partial<TopicArtifactMetadata>;
  node?: Partial<SynthesisTopicGraphNode>;
}) {
  return (
    definitionTextFromDefinition(args.definition || {}) ||
    cleanString(args.metadata?.definition) ||
    cleanString(args.node?.definition)
  );
}

function aliasesFromDefinition(definition: Record<string, unknown>) {
  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const alias of normalizeArray(definition.aliases)) {
    const text = cleanString(alias);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) {
      continue;
    }
    seen.add(key);
    aliases.push(text);
  }
  return aliases;
}

function statusFromDefinition(
  definition: Record<string, unknown>,
): TopicInventoryRow["status"] {
  const status = cleanString(definition.status).toLowerCase();
  return status === "archived" || status === "deleted" ? status : undefined;
}

function statusFromTopicGraphNode(
  node: SynthesisTopicGraphNode,
): TopicInventoryRow["status"] {
  const status = cleanString(node.definition_status).toLowerCase();
  return status === "deleted" ? "deleted" : undefined;
}

function aliasesFromTopicGraphNode(node: SynthesisTopicGraphNode) {
  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const alias of node.aliases || []) {
    const text = cleanString(alias);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) {
      continue;
    }
    seen.add(key);
    aliases.push(text);
  }
  return aliases;
}

const TOPIC_RELATION_PROPOSAL_TYPES = new Set([
  "target_is_broader_topic_candidate",
  "target_is_narrower_topic_candidate",
  "related_topic_candidate",
  "overlap_topic_candidate",
  "contrast_topic_candidate",
]);

function normalizeProspectiveTopicRelationProposals(value: unknown) {
  const proposals = Array.isArray(value) ? value : [];
  const byKey = new Map<string, Record<string, unknown>>();
  for (const proposal of proposals) {
    if (!isObject(proposal)) {
      continue;
    }
    const targetTopicSeed = cleanString(proposal.target_topic_seed);
    const relationType = cleanString(proposal.relation_type);
    if (!targetTopicSeed || !TOPIC_RELATION_PROPOSAL_TYPES.has(relationType)) {
      continue;
    }
    byKey.set(`${targetTopicSeed.toLowerCase()}\0${relationType}`, {
      target_topic_seed: targetTopicSeed,
      relation_type: relationType,
    });
  }
  return [...byKey.values()].sort((left, right) =>
    cleanString(left.target_topic_seed).localeCompare(
      cleanString(right.target_topic_seed),
      "en",
      { sensitivity: "base" },
    ),
  );
}

function topicIndexRowFromGraphNode(
  node: SynthesisTopicGraphNode,
): TopicIndexRow {
  const topicId = cleanString(node.topic_id);
  return {
    topic_id: topicId,
    path_id: topicPathId(topicId),
    title: cleanString(node.title) || topicId,
    definition: cleanString(node.definition) || undefined,
    updated_at:
      cleanString(node.last_synthesis_at) ||
      cleanString(node.updated_at) ||
      cleanString(node.created_at),
    metadata_hash: "",
    bundle_hash: "",
    paper_count: Math.max(0, Math.floor(Number(node.paper_count) || 0)),
  };
}

function topicArtifactRowsFromGraphNodes(args: {
  nodes: SynthesisTopicGraphNode[];
  artifactState: Record<string, TopicArtifactStateRow>;
  definitions: Record<string, Record<string, unknown>>;
  metadata?: Record<string, TopicArtifactMetadata>;
}): SynthesisUiArtifactRow[] {
  return args.nodes
    .filter(
      (node) =>
        cleanString(node.topic_id) &&
        node.node_type === "materialized" &&
        node.definition_status !== "deleted",
    )
    .map((node): SynthesisUiArtifactRow => {
      const row = topicIndexRowFromGraphNode(node);
      const stateRow = args.artifactState[row.topic_id];
      const definition = args.definitions[row.topic_id] || {};
      const metadata = args.metadata?.[row.topic_id];
      const definitionText = topicDefinitionFromSources({
        definition,
        metadata,
        node,
      });
      const freshness = stateRow?.freshness || "unknown";
      const coverage = stateRow?.coverage || "missing";
      const intent = deriveTopicUpdateIntent({
        topicId: row.topic_id,
        state: stateRow,
        row,
      });
      return {
        id: row.topic_id,
        title: row.title,
        definition: definitionText || row.definition,
        kind: "topic_synthesis" as const,
        coverage,
        freshness,
        updated_at: row.updated_at,
        markdown_preview: (stateRow?.reasons || [])
          .map((entry) => entry.code)
          .join(", "),
        paper_count: row.paper_count ?? paperCountFromTopicState(stateRow),
        summary: summaryFromTopicDefinition(
          definition,
          (stateRow?.reasons || [])
            .map((entry) => entry.message || entry.code)
            .filter(Boolean)
            .slice(0, 2)
            .join("; "),
        ),
        completion: completionFromTopicState(stateRow),
        status: node.definition_status,
        readerMode: "structured",
        language: row.language,
        external_literature_count: row.external_literature_count,
        stale_reasons:
          stateRow?.freshness === "stale"
            ? (stateRow?.reasons || []).map((entry) => entry.code)
            : [],
        dirty_reasons:
          stateRow?.freshness === "dirty"
            ? (stateRow?.reasons || []).map((entry) => entry.code)
            : [],
        updateIntent: topicUpdateIntentForUi({
          topicId: row.topic_id,
          intent,
        }),
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function topicScopePaperRefs(args: {
  artifactState?: TopicArtifactStateRow;
  metadata?: TopicArtifactMetadata;
}) {
  const current = args.artifactState?.current_dependencies?.current_paper_refs;
  if (current?.length) {
    return sortedUniqueStrings(current);
  }
  const baseline = args.artifactState?.baseline_dependencies?.saved_paper_refs;
  if (baseline?.length) {
    return sortedUniqueStrings(baseline);
  }
  const dependsOn = isRecord(args.metadata?.artifact_metadata?.depends_on)
    ? (args.metadata?.artifact_metadata?.depends_on as Record<string, unknown>)
    : {};
  return sortedUniqueStrings(normalizeArray(dependsOn.papers));
}

function topicGraphScopesFromGraphNodes(args: {
  nodes: SynthesisTopicGraphNode[];
  artifactState: Record<string, TopicArtifactStateRow>;
  metadata?: Record<string, TopicArtifactMetadata>;
}): SynthesisUiGraphTopicScope[] {
  return args.nodes
    .filter(
      (node) =>
        cleanString(node.topic_id) &&
        node.node_type === "materialized" &&
        node.definition_status !== "deleted",
    )
    .map((node) => {
      const topicId = cleanString(node.topic_id);
      const paperRefs = topicScopePaperRefs({
        artifactState: args.artifactState[topicId],
        metadata: args.metadata?.[topicId],
      });
      return {
        topicId,
        title:
          cleanString(args.metadata?.[topicId]?.title) ||
          cleanString(node.title) ||
          topicId,
        paperRefs,
        nodeIds: sortedUniqueStrings(
          paperRefs.map(paperRefToCitationGraphNodeId),
        ),
      };
    })
    .sort(
      (left, right) =>
        left.title.localeCompare(right.title) ||
        left.topicId.localeCompare(right.topicId),
    );
}

function topicInventoryRowsFromGraphNodes(args: {
  nodes: SynthesisTopicGraphNode[];
  definitions: Record<string, Record<string, unknown>>;
  metadata?: Record<string, TopicArtifactMetadata>;
}): TopicInventoryRow[] {
  return args.nodes
    .map((node) => {
      const topicId = cleanString(node.topic_id);
      if (!topicId) {
        return null;
      }
      const definition = args.definitions[topicId] || {};
      const metadata = args.metadata?.[topicId];
      const status =
        statusFromDefinition(definition) || statusFromTopicGraphNode(node);
      const definitionAliases = aliasesFromDefinition(definition);
      const definitionText = topicDefinitionFromSources({
        definition,
        metadata,
        node,
      });
      return {
        topic_id: topicId,
        title: titleFromDefinition(
          definition,
          cleanString(node.title) || topicId,
        ),
        definition: definitionText,
        aliases: definitionAliases.length
          ? definitionAliases
          : aliasesFromTopicGraphNode(node),
        updated_at:
          cleanString(definition.updated_at) ||
          cleanString(metadata?.updated_at) ||
          cleanString(node.last_synthesis_at) ||
          cleanString(node.updated_at) ||
          "",
        prospective_topic_relation_proposals:
          normalizeProspectiveTopicRelationProposals(
            metadata?.prospective_topic_relation_proposals,
          ),
        ...(status ? { status } : {}),
      };
    })
    .filter((topic): topic is TopicInventoryRow =>
      Boolean(topic && topic.status !== "deleted"),
    )
    .sort((left, right) => left.topic_id.localeCompare(right.topic_id));
}

function filterTopicScopedConflicts(
  conflicts: SynthesisConflictCandidate[],
  topicIds: Set<string>,
) {
  return conflicts.filter((conflict) => {
    const topicId = cleanString(conflict.topic_id);
    return !topicId || topicIds.has(topicId);
  });
}

function topicIdFromBundle(bundle: SynthesisResultBundle) {
  const topicId =
    cleanString(bundle.topic_definition.id) ||
    cleanString(bundle.topic_id) ||
    cleanString(bundle.artifact_metadata?.topic_id);
  if (!topicId) {
    throw new Error(
      "topic synthesis bundle requires topic_definition.id or topic_id",
    );
  }
  return topicId;
}

function topicPathId(topicId: string) {
  const slug = topicId
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return (
    slug || hashCanonicalJson({ topic_id: topicId }).slice("sha256:".length, 16)
  );
}

function deletedPathId(topicId: string, deletedAt: string) {
  const suffix =
    deletedAt.replace(/[^0-9A-Za-z]+/g, "").slice(0, 14) ||
    hashCanonicalJson({ topic_id: topicId, deleted_at: deletedAt }).slice(
      "sha256:".length,
      "sha256:".length + 14,
    );
  return `${topicPathId(topicId)}-${suffix}`;
}

function canonicalText(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson<T = unknown>(path: string): Promise<T | null> {
  const text = await readRuntimeTextFile(path);
  if (!text.trim()) {
    return null;
  }
  return JSON.parse(text) as T;
}

async function writeJson(path: string, value: unknown) {
  await writeRuntimeTextFile(path, canonicalText(value));
}

async function appendJsonLine(path: string, value: unknown) {
  const current = await readRuntimeTextFile(path);
  await writeRuntimeTextFile(path, `${current}${JSON.stringify(value)}\n`);
}

function envelopeData<T>(envelope: unknown, fallback: T): T {
  if (!envelope || typeof envelope !== "object") {
    return fallback;
  }
  const data = (envelope as { data?: unknown }).data;
  return data && typeof data === "object" ? (data as T) : fallback;
}

async function readStateMap<T>(
  path: string,
  key: string,
): Promise<Record<string, T>> {
  const envelope =
    await readJson<CanonicalEnvelope<Record<string, Record<string, T>>>>(path);
  return (
    envelopeData(envelope, { [key]: {} } as Record<string, Record<string, T>>)[
      key
    ] || {}
  );
}

async function writeStateMap<T>(args: {
  path: string;
  schemaId: string;
  key: string;
  values: Record<string, T>;
  now: string;
}) {
  await writeJson(
    args.path,
    createCanonicalEnvelope({
      schemaId: args.schemaId,
      data: { [args.key]: args.values },
      now: args.now,
    }),
  );
}

async function upsertStateMap<T>(args: {
  path: string;
  schemaId: string;
  key: string;
  id: string;
  value: T;
  now: string;
}) {
  const values = await readStateMap<T>(args.path, args.key);
  values[args.id] = args.value;
  await writeStateMap({
    path: args.path,
    schemaId: args.schemaId,
    key: args.key,
    values,
    now: args.now,
  });
}

async function deleteStateMapEntry<T>(args: {
  path: string;
  schemaId: string;
  key: string;
  id: string;
  now: string;
}) {
  const values = await readStateMap<T>(args.path, args.key);
  delete values[args.id];
  await writeStateMap({
    path: args.path,
    schemaId: args.schemaId,
    key: args.key,
    values,
    now: args.now,
  });
}

async function fileHash(path: string) {
  const text = await readRuntimeTextFile(path);
  return text.trim() ? hashMarkdown(text) : "";
}

async function currentHashes(root: string, topicId: string, pathId?: string) {
  const paths = buildSynthesisStoragePaths(
    root,
    cleanString(pathId) || topicPathId(topicId),
  );
  const result: Record<string, string> = {
    manifest: await fileHash(paths.currentManifest),
    artifact: await fileHash(paths.currentArtifact),
    metadata: await fileHash(paths.currentMetadata),
    index: await fileHash(paths.index),
  };
  const manifest = await readJson<Record<string, unknown>>(
    paths.currentManifest,
  ).catch(() => null);
  const sectionHashes = isObject(manifest?.section_hashes)
    ? (manifest!.section_hashes as Record<string, unknown>)
    : {};
  for (const [section, hash] of Object.entries(sectionHashes)) {
    result[`section:${section}`] = cleanString(hash);
  }
  return result;
}

async function readIndexRows(root: string): Promise<TopicIndexRow[]> {
  const paths = buildSynthesisStoragePaths(root);
  const envelope = await readJson<
    CanonicalEnvelope<{ topics?: TopicIndexRow[] }>
  >(paths.index);
  const rows =
    envelopeData<{ topics?: TopicIndexRow[] }>(envelope, { topics: [] })
      .topics || [];
  return [...rows].sort((left, right) =>
    left.topic_id.localeCompare(right.topic_id),
  );
}

function directTopicPathIdCandidate(value: unknown) {
  const text = cleanString(value);
  if (!text || text.includes("..") || !/^[A-Za-z0-9._-]{1,128}$/.test(text)) {
    return "";
  }
  return text;
}

async function topicReadCandidates(root: string, topicIdRaw: string) {
  const requested = cleanString(topicIdRaw);
  const candidates: Array<{
    topicId: string;
    pathId: string;
    indexRow?: TopicIndexRow;
  }> = [];
  const seen = new Set<string>();
  const push = (topicId: string, pathId: string, indexRow?: TopicIndexRow) => {
    const cleanTopicId = cleanString(topicId);
    const cleanPathId = cleanString(pathId);
    if (!cleanTopicId || !cleanPathId || seen.has(cleanPathId)) {
      return;
    }
    seen.add(cleanPathId);
    candidates.push({ topicId: cleanTopicId, pathId: cleanPathId, indexRow });
  };

  const rows = await readIndexRows(root).catch(() => []);
  for (const row of rows) {
    const rowTopicId = cleanString(row.topic_id);
    const rowPathId = cleanString(row.path_id) || topicPathId(rowTopicId);
    if (
      rowTopicId === requested ||
      rowPathId === requested ||
      topicPathId(rowTopicId) === requested
    ) {
      push(rowTopicId, rowPathId, row);
    }
  }

  push(requested, topicPathId(requested));
  const directPathId = directTopicPathIdCandidate(requested);
  if (directPathId) {
    push(requested, directPathId);
  }
  return candidates;
}

async function writeIndexRows(
  root: string,
  rows: TopicIndexRow[],
  now: string,
) {
  const paths = buildSynthesisStoragePaths(root);
  await writeJson(
    paths.index,
    createCanonicalEnvelope({
      schemaId: "synthesis.index",
      data: {
        topics: [...rows].sort((left, right) =>
          left.topic_id.localeCompare(right.topic_id),
        ),
      },
      now,
    }),
  );
}

async function readDeletedRows(
  root: string,
): Promise<DeletedTopicArtifactRow[]> {
  const paths = buildSynthesisStoragePaths(root);
  const envelope = await readJson<
    CanonicalEnvelope<{ deleted?: DeletedTopicArtifactRow[] }>
  >(paths.deletedArtifacts).catch(() => null);
  const rows =
    envelopeData<{ deleted?: DeletedTopicArtifactRow[] }>(envelope, {
      deleted: [],
    }).deleted || [];
  return [...rows].sort(
    (left, right) =>
      right.deleted_at.localeCompare(left.deleted_at) ||
      left.topic_id.localeCompare(right.topic_id),
  );
}

async function writeDeletedRows(
  root: string,
  rows: DeletedTopicArtifactRow[],
  now: string,
) {
  const paths = buildSynthesisStoragePaths(root);
  await writeJson(
    paths.deletedArtifacts,
    createCanonicalEnvelope({
      schemaId: "synthesis.deleted_topic_artifacts",
      data: {
        deleted: [...rows].sort(
          (left, right) =>
            right.deleted_at.localeCompare(left.deleted_at) ||
            left.topic_id.localeCompare(right.topic_id),
        ),
      },
      now,
    }),
  );
}

async function listConflictCandidates(root: string) {
  const conflictRoot = joinPath(root, "synthesis", "conflicts");
  const paths = await listRuntimeChildren(conflictRoot);
  const candidates: SynthesisConflictCandidate[] = [];
  for (const path of paths) {
    const parsed = await readJson<SynthesisConflictCandidate>(path).catch(
      () => null,
    );
    if (parsed) {
      candidates.push(parsed);
    }
  }
  return candidates;
}

function graphForPapers(papers: CitationGraphPaperInput[] | undefined) {
  return buildUnifiedCitationGraph({ papers: papers || [] });
}

function registryRowsForInputs(inputs: ReferenceSidecarInput[] | undefined) {
  return buildReferenceSidecarIndexRows(inputs || []);
}

function paperRefForRegistryInput(input: ReferenceSidecarInput) {
  const library = normalizeLibraryId(input.libraryId);
  const itemKey = cleanString(input.itemKey);
  return library && itemKey ? `${library}:${itemKey}` : "";
}

function registryMetadataFingerprintFromInput(input: ReferenceSidecarInput) {
  const library = normalizeLibraryId(input.libraryId);
  const itemKey = cleanString(input.itemKey);
  const metadata = buildReferenceSidecarMetadataFingerprintPayload(input);
  return {
    library_id: library,
    item_key: itemKey,
    paper_ref: `${library}:${itemKey}`,
    deleted: false,
    hash: hashCanonicalJson(metadata),
    updated_at: undefined,
  };
}

async function registryInputsForService(
  options: Pick<SynthesisServiceOptions, "libraryAdapter" | "registryInputs">,
) {
  if (options.libraryAdapter) {
    return options.libraryAdapter.getRegistryInputs();
  }
  return options.registryInputs || [];
}

function tagUsageCountsFromRegistryInputs(
  inputs: ReferenceSidecarInput[],
  libraryId: number,
) {
  const counts = new Map<string, number>();
  for (const input of inputs) {
    if (normalizeLibraryId(input.libraryId) !== libraryId) {
      continue;
    }
    for (const tag of normalizeStringListInput(input.tags)) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return counts;
}

function tagUsageCountMap(rows: SynthesisTagUsageCount[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const tag = cleanString(row.tag);
    const count = Math.max(0, Math.floor(Number(row.count) || 0));
    if (tag) {
      counts.set(tag, count);
    }
  }
  return counts;
}

async function tagUsageCountsForService(
  options: Pick<SynthesisServiceOptions, "libraryAdapter" | "registryInputs">,
  libraryId: number,
) {
  if (options.libraryAdapter?.getTagUsageCounts) {
    return tagUsageCountMap(
      await options.libraryAdapter.getTagUsageCounts({ libraryId }),
    );
  }
  return tagUsageCountsFromRegistryInputs(
    await registryInputsForService(options),
    libraryId,
  );
}

function applyTagUsageCounts<
  T extends {
    tag: string;
    usage_count?: number;
  },
>(entries: T[], usageCounts: Map<string, number>): T[] {
  return entries.map((entry) => ({
    ...entry,
    usage_count: usageCounts.get(cleanString(entry.tag)) || 0,
  }));
}

async function graphInputsForService(
  options: Pick<
    SynthesisServiceOptions,
    "libraryAdapter" | "citationGraphPapers" | "registryInputs"
  >,
) {
  if (options.libraryAdapter) {
    return options.libraryAdapter.getCitationGraphInputs();
  }
  if (options.citationGraphPapers) {
    return options.citationGraphPapers;
  }
  return buildCitationGraphInputsFromRegistryInputs(
    options.registryInputs || [],
  );
}

function mapGraphToUi(
  graph: CitationGraph,
  args: {
    layout?: CitationGraphLayout | null;
    layoutStatus?: SynthesisCacheReadinessStatus;
  } = {},
) {
  const coordinates = args.layout?.nodes || {};
  const graphWithHover = graph as CitationGraph & {
    hover_only_nodes?: CitationGraphNode[];
    hover_only_edges?: CitationGraphEdge[];
  };
  const mapNode = (node: CitationGraphNode) => {
    const kind =
      node.kind === "library_paper"
        ? ("library_paper" as const)
        : ("external_reference" as const);
    return {
      id: node.node_id,
      label: cleanString(node.title) || node.node_id,
      kind,
      year: cleanString(node.year) || undefined,
      tags: [],
      collections: [],
      x: coordinates[node.node_id]?.x,
      y: coordinates[node.node_id]?.y,
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
  };
  const mapEdge = (edge: CitationGraphEdge) => ({
    id: edge.edge_id,
    source: edge.source,
    target: edge.target,
    primary_role: edge.primary_role,
    mention_count: edge.mention_count,
    visibility:
      edge.visibility === "hover_only"
        ? ("hover_only" as const)
        : ("default" as const),
  });
  const nodes = graph.nodes.map(mapNode);
  const hoverOnlyNodes = (graphWithHover.hover_only_nodes || []).map(mapNode);
  const edges = graph.edges.map(mapEdge);
  const hoverOnlyEdges = (graphWithHover.hover_only_edges || []).map(mapEdge);
  return {
    graph_hash: graph.graph_hash,
    layoutStatus: args.layoutStatus || (args.layout ? "ready" : "missing"),
    diagnostics: graph.diagnostics,
    nodes: [...nodes, ...hoverOnlyNodes],
    edges: [...edges, ...hoverOnlyEdges],
    hoverOnlyNodes,
    hoverOnlyEdges,
  };
}

function parseCitationGraphLayout(
  record: SynthesisCitationLayoutRecord | null | undefined,
): CitationGraphLayout | null {
  const text = cleanString(record?.layoutJson);
  if (!text || text === "{}") {
    return null;
  }
  try {
    const parsed = JSON.parse(text) as Partial<CitationGraphLayout>;
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.nodes &&
      typeof parsed.nodes === "object"
    ) {
      return parsed as CitationGraphLayout;
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeCitationLayoutAlgorithmInput(
  value: unknown,
): CitationLayoutAlgorithm {
  return normalizeCitationLayoutAlgorithm(value);
}

function citationGraphLayoutStatus(args: {
  graph: CitationGraph;
  record: SynthesisCitationLayoutRecord | null | undefined;
  layout: CitationGraphLayout | null;
}): SynthesisCacheReadinessStatus {
  if (!args.graph.nodes.length) {
    return "missing";
  }
  if (!args.record) {
    return "missing";
  }
  if (args.record.status === "running") {
    return "refreshing";
  }
  if (args.record.status === "failed") {
    return "failed";
  }
  if (!args.layout) {
    return "missing";
  }
  if (args.layout.layout_version !== CITATION_GRAPH_LAYOUT_VERSION) {
    return "stale";
  }
  if (
    args.record.status === "ready" &&
    args.record.graphHash === args.graph.graph_hash &&
    args.layout.graph_hash === args.graph.graph_hash
  ) {
    return "ready";
  }
  return "stale";
}

async function readPersistedGraphProjection(
  root: string,
  algorithm: CitationLayoutAlgorithm,
) {
  const paths = buildSynthesisStoragePaths(root);
  const graphEnvelope = await readJson<CanonicalEnvelope<CitationGraph>>(
    paths.unifiedCitationGraph,
  ).catch(() => null);
  const graph = graphEnvelope?.data || null;
  if (!graph) {
    return { graph: null, layout: null, layoutStatus: "missing" as const };
  }
  const layoutEnvelope = await readJson<
    CanonicalEnvelope<{
      graph_hash?: string;
      layouts?: Partial<Record<CitationLayoutAlgorithm, CitationGraphLayout>> &
        Record<string, CitationGraphLayout | undefined>;
    }>
  >(paths.unifiedCitationLayouts).catch(() => null);
  const layout =
    layoutEnvelope?.data?.layouts?.[algorithm] ||
    (algorithm === "force" ? layoutEnvelope?.data?.layouts?.balanced : null) ||
    null;
  const layoutStatus =
    layout && layout.graph_hash === graph.graph_hash
      ? ("ready" as const)
      : ("stale" as const);
  return { graph, layout, layoutStatus };
}

async function readPersistedCitationGraph(root: string) {
  const paths = buildSynthesisStoragePaths(root);
  const graphEnvelope = await readJson<CanonicalEnvelope<CitationGraph>>(
    paths.unifiedCitationGraph,
  ).catch(() => null);
  return graphEnvelope?.data || null;
}

async function readPersistedCitationGraphMetrics(root: string) {
  const paths = buildSynthesisStoragePaths(root);
  const metricsEnvelope = await readJson<
    CanonicalEnvelope<CitationGraphMetrics>
  >(paths.unifiedCitationGraphMetrics).catch(() => null);
  return metricsEnvelope?.data || null;
}

function citationGraphHasContent(graph: CitationGraph | null | undefined) {
  return Boolean(graph && (graph.nodes.length > 0 || graph.edges.length > 0));
}

function shouldPreferPersistedCitationGraph(args: {
  projectionGraph: CitationGraph | null | undefined;
  existingGraph: CitationGraph | null | undefined;
}) {
  return (
    citationGraphHasContent(args.existingGraph) &&
    !citationGraphHasContent(args.projectionGraph)
  );
}

function parseCitationRoles(value: unknown) {
  const parsed = (() => {
    try {
      return JSON.parse(cleanString(value) || "[]");
    } catch {
      return [];
    }
  })();
  return Array.isArray(parsed) ? parsed : [];
}

function roleEntriesFromDb(
  value: unknown,
): Array<{ role: string; count: number }> {
  const counts = new Map<string, number>();
  for (const entry of parseCitationRoles(value)) {
    const role =
      typeof entry === "string"
        ? cleanString(entry)
        : cleanString((entry as Record<string, unknown>)?.role);
    if (!role) {
      continue;
    }
    counts.set(role, (counts.get(role) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([role, count]) => ({ role, count }))
    .sort((left, right) => left.role.localeCompare(right.role));
}

type CitationGraphZoteroBinding = {
  libraryId: number;
  itemKey: string;
  literatureItemId: string;
};

function citationGraphNodeIdFromDb(
  node: Pick<SynthesisCitationNodeRecord, "literatureItemId">,
  binding?: CitationGraphZoteroBinding,
) {
  const sourceRef = cleanString(node.literatureItemId);
  const parsed = sourceRef.match(/^(\d+):(.+)$/);
  return binding?.itemKey
    ? `zotero:item:${binding.itemKey}`
    : parsed?.[2]
      ? `zotero:item:${parsed[2]}`
      : sourceRef;
}

function dbCitationNodeKind(
  node: SynthesisCitationNodeRecord,
): CitationGraphNode["kind"] {
  return node.hasZoteroBinding ? "library_paper" : "external_reference";
}

function dbCitationNodeToGraphNode(args: {
  node: SynthesisCitationNodeRecord;
  binding?: CitationGraphZoteroBinding;
  metrics?: SynthesisCitationLightMetricsRecord;
  display?: {
    externalDegree?: number;
    visibility?: "default" | "hover_only";
    displayTier?: "library" | "shared_external" | "single_external";
  };
}): CitationGraphNode & {
  metrics?: Pick<
    CitationGraphLibraryNodeMetrics,
    | "internal_in_degree"
    | "internal_out_degree"
    | "internal_pagerank"
    | "foundation_score"
    | "frontier_score"
    | "synthesis_role_hints"
  >;
} {
  const nodeId = citationGraphNodeIdFromDb(args.node, args.binding);
  return {
    node_id: nodeId,
    kind: dbCitationNodeKind(args.node),
    target_state: args.node.hasZoteroBinding ? "library" : "external",
    item_key:
      args.binding?.itemKey ||
      cleanString(args.node.literatureItemId).match(/^(\d+):(.+)$/)?.[2],
    library_id:
      args.binding?.libraryId ||
      Number(
        cleanString(args.node.literatureItemId).match(/^(\d+):(.+)$/)?.[1],
      ) ||
      undefined,
    provisional_key: args.node.hasZoteroBinding
      ? undefined
      : args.node.literatureItemId,
    aliases: [args.node.literatureItemId],
    title: args.node.title,
    year: args.node.year,
    authors: [],
    low_signal: false,
    external_degree: args.display?.externalDegree,
    visibility: args.display?.visibility || "default",
    display_tier:
      args.display?.displayTier ||
      (args.node.hasZoteroBinding ? "library" : "shared_external"),
    ...(args.metrics
      ? {
          metrics: {
            internal_in_degree: args.metrics.incomingCount,
            internal_out_degree: args.metrics.outgoingCount,
            internal_pagerank: 0,
            foundation_score: args.metrics.incomingCount,
            frontier_score: args.metrics.outgoingCount,
            synthesis_role_hints: [],
          },
        }
      : {}),
  };
}

function dbCitationEdgeToGraphEdge(args: {
  edge: SynthesisCitationEdgeRecord;
  sourceNodeId: string;
  targetNodeId: string;
  visibility?: "default" | "hover_only";
}): CitationGraphEdge {
  const roles = roleEntriesFromDb(args.edge.rolesJson);
  const [primary, ...aux] = roles;
  return {
    edge_id: args.edge.edgeId,
    source: args.sourceNodeId,
    target: args.targetNodeId,
    kind: "citation",
    mention_count: Math.max(1, Math.floor(Number(args.edge.weight) || 1)),
    primary_role: primary?.role || "citation",
    aux_roles: aux,
    role_evidence: roles,
    source_refs: [args.edge.referenceInstanceId || args.edge.edgeId].filter(
      Boolean,
    ),
    visibility: args.visibility || "default",
  };
}

function dbCitationEdgeMatchesRole(
  edge: SynthesisCitationEdgeRecord,
  roleFilter: Set<string>,
) {
  if (!roleFilter.size) {
    return true;
  }
  return roleEntriesFromDb(edge.rolesJson).some((entry) =>
    roleFilter.has(entry.role),
  );
}

function emptyCitationGraph(
  args: {
    graphHash?: string;
    diagnostics?: Partial<CitationGraph["diagnostics"]> &
      Record<string, unknown>;
  } = {},
): CitationGraph {
  return {
    schema_id: "synthesis.unified_citation_graph",
    schema_version: "1.0.0",
    nodes: [],
    edges: [],
    diagnostics: {
      promotions: [],
      duplicates: [],
      node_counts: {
        library_paper: 0,
        external_reference: 0,
        unresolved_reference: 0,
      },
      reference_stats: {
        total: 0,
        promoted: 0,
        external: 0,
        unresolved: 0,
        dropped_empty: 0,
        merged_external_nodes: 0,
        merged_unresolved_nodes: 0,
      },
      ...(args.diagnostics || {}),
    },
    graph_hash: args.graphHash || "sha256:empty-citation-db-graph",
  };
}

function dbCitationGraphHash(args: {
  nodes: SynthesisCitationNodeRecord[];
  edges: SynthesisCitationEdgeRecord[];
  metrics?: SynthesisCitationLightMetricsRecord[];
}) {
  return hashCanonicalJson({
    storage: "sqlite",
    nodes: args.nodes.map((node) => [
      node.literatureItemId,
      node.nodeStatus,
      node.updatedAt || "",
    ]),
    edges: args.edges.map((edge) => [
      edge.edgeId,
      edge.sourceLiteratureItemId,
      edge.targetLiteratureItemId || "",
      edge.edgeStatus,
      edge.updatedAt || "",
    ]),
    metrics: (args.metrics || []).map((metric) => [
      metric.literatureItemId,
      metric.localDegree,
      metric.sourceStructureVersion,
      metric.updatedAt || "",
    ]),
  });
}

function dbCitationMetricsHash(metrics: SynthesisCitationLightMetricsRecord[]) {
  return hashCanonicalJson({
    storage: "sqlite",
    metrics: metrics.map((metric) => [
      metric.literatureItemId,
      metric.incomingCount,
      metric.outgoingCount,
      metric.matchedOutgoingCount,
      metric.unresolvedOutgoingCount,
      metric.ambiguousOutgoingCount,
      metric.localDegree,
      metric.sourceStructureVersion,
      metric.updatedAt || "",
    ]),
  });
}

function dbComplexMetricToLibraryMetric(
  metric: SynthesisCitationComplexMetricsRecord,
): CitationGraphLibraryNodeMetrics {
  return {
    node_id: metric.nodeId,
    paper_ref: metric.paperRef,
    item_key: metric.itemKey,
    title: metric.title,
    year: metric.year,
    internal_in_degree: metric.internalInDegree,
    internal_out_degree: metric.internalOutDegree,
    external_reference_count: metric.externalReferenceCount,
    unresolved_reference_count: metric.unresolvedReferenceCount,
    internal_pagerank: metric.internalPagerank,
    component_id: metric.componentId,
    component_size: metric.componentSize,
    is_isolated: metric.isIsolated,
    age_norm: metric.ageNorm,
    recency_norm: metric.recencyNorm,
    in_degree_norm: metric.inDegreeNorm,
    out_degree_norm: metric.outDegreeNorm,
    pagerank_norm: metric.pagerankNorm,
    foundation_score: metric.foundationScore,
    frontier_score: metric.frontierScore,
    synthesis_role_hints: parseStringArray(metric.synthesisRoleHintsJson),
  };
}

function complexMetricRecordFromLibraryMetric(args: {
  metric: CitationGraphLibraryNodeMetrics;
  literatureItemId: string;
  sourceStructureVersion: number;
  sourceGraphHash: string;
  metricsHash: string;
  timestamp: string;
}): SynthesisCitationComplexMetricsRecord {
  return {
    literatureItemId: args.literatureItemId,
    nodeId: args.metric.node_id,
    paperRef: args.metric.paper_ref,
    itemKey: args.metric.item_key,
    title: args.metric.title,
    year: args.metric.year,
    internalInDegree: args.metric.internal_in_degree,
    internalOutDegree: args.metric.internal_out_degree,
    externalReferenceCount: args.metric.external_reference_count,
    unresolvedReferenceCount: args.metric.unresolved_reference_count,
    internalPagerank: args.metric.internal_pagerank,
    componentId: args.metric.component_id,
    componentSize: args.metric.component_size,
    isIsolated: args.metric.is_isolated,
    ageNorm: args.metric.age_norm,
    recencyNorm: args.metric.recency_norm,
    inDegreeNorm: args.metric.in_degree_norm,
    outDegreeNorm: args.metric.out_degree_norm,
    pagerankNorm: args.metric.pagerank_norm,
    foundationScore: args.metric.foundation_score,
    frontierScore: args.metric.frontier_score,
    synthesisRoleHintsJson: JSON.stringify(args.metric.synthesis_role_hints),
    sourceStructureVersion: args.sourceStructureVersion,
    sourceGraphHash: args.sourceGraphHash,
    metricsHash: args.metricsHash,
    status: "ready",
    updatedAt: args.timestamp,
  };
}

function citationMetricsSummary(
  metrics: CitationGraphMetrics | null,
  graphHash: string,
) {
  if (!metrics || metrics.graph_hash !== graphHash) {
    return new Map<string, CitationGraphLibraryNodeMetrics>();
  }
  return new Map(
    metrics.library_node_metrics.map((entry) => [entry.node_id, entry]),
  );
}

function paperRefToCitationGraphNodeId(value: unknown) {
  const paperRef = cleanString(value);
  if (!paperRef) {
    return "";
  }
  if (paperRef.startsWith("zotero:item:")) {
    return paperRef;
  }
  const separator = paperRef.indexOf(":");
  const itemKey = separator >= 0 ? paperRef.slice(separator + 1) : paperRef;
  return itemKey ? `zotero:item:${itemKey}` : "";
}

function clampPositiveInteger(args: {
  value: unknown;
  fallback: number;
  min: number;
  max: number;
  label: string;
  warnings: string[];
}) {
  const raw = Number(args.value);
  const numeric = Number.isFinite(raw) ? Math.floor(raw) : args.fallback;
  const clamped = Math.min(args.max, Math.max(args.min, numeric));
  if (numeric !== clamped) {
    args.warnings.push(`${args.label} clamped to ${clamped}`);
  }
  return clamped;
}

function booleanArg(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  return fallback;
}

function normalizeGraphSliceArgs(args: Record<string, unknown>) {
  const warnings: string[] = [];
  const startNodeId =
    cleanString(args.startNodeId) ||
    paperRefToCitationGraphNodeId(args.paperRef);
  const depth = clampPositiveInteger({
    value: args.depth,
    fallback: 1,
    min: 0,
    max: 2,
    label: "depth",
    warnings,
  });
  const maxNodes = clampPositiveInteger({
    value: args.maxNodes,
    fallback: 80,
    min: 1,
    max: 200,
    label: "maxNodes",
    warnings,
  });
  const maxEdges = clampPositiveInteger({
    value: args.maxEdges,
    fallback: 160,
    min: 0,
    max: 500,
    label: "maxEdges",
    warnings,
  });
  const rawDirection = cleanString(args.direction).toLowerCase();
  const direction: CitationGraphSliceDirection =
    rawDirection === "incoming" ||
    rawDirection === "outgoing" ||
    rawDirection === "both"
      ? rawDirection
      : "both";
  if (rawDirection && rawDirection !== direction) {
    warnings.push("direction defaulted to both");
  }
  const roleFilter = new Set(
    normalizeArray(args.roleFilter).map(cleanString).filter(Boolean),
  );
  if (!startNodeId) {
    warnings.push("startNodeId or paperRef is required");
  }
  return {
    startNodeId,
    depth,
    maxNodes,
    maxEdges,
    direction,
    includeLowSignal: booleanArg(args.includeLowSignal, false),
    roleFilter,
    warnings,
  };
}

const CITATION_LAYOUT_DEFAULT_MAX_NODES = 200;
const CITATION_LAYOUT_DEFAULT_MAX_EDGES = 500;
const CITATION_LAYOUT_HARD_MAX_NODES = 5000;
const CITATION_LAYOUT_HARD_MAX_EDGES = 20000;

function normalizeCitationGraphLayoutArgs(args: Record<string, unknown>) {
  const warnings: string[] = [];
  const preset = normalizeCitationLayoutAlgorithmInput(
    args.preset || args.algorithm,
  );
  const viewKey =
    cleanString(args.viewKey || args.view_key) || "workbench_overview";
  const nodeIds = sortedUniqueStrings(
    normalizeArray(args.nodeIds || args.node_ids)
      .map(cleanString)
      .filter(Boolean),
  );
  const paperRefs = sortedUniqueStrings(
    normalizeArray(args.paperRefs || args.paper_refs)
      .map(cleanString)
      .filter(Boolean),
  );
  const explicitNodeIds = sortedUniqueStrings([
    ...nodeIds,
    ...paperRefs.map(paperRefToCitationGraphNodeId).filter(Boolean),
  ]);
  const startNodeId =
    cleanString(args.startNodeId || args.start_node_id) ||
    paperRefToCitationGraphNodeId(args.paperRef || args.paper_ref);
  const rawScope = cleanString(args.scope).toLowerCase();
  const scope: SynthesisCitationGraphLayoutResult["scope"] =
    rawScope === "full"
      ? "full"
      : startNodeId
        ? "slice"
        : explicitNodeIds.length
          ? "explicit"
          : "none";
  if (rawScope && rawScope !== "full") {
    warnings.push("scope defaulted from unsupported value");
  }
  const maxNodes = clampPositiveInteger({
    value: args.maxNodes || args.max_nodes,
    fallback: CITATION_LAYOUT_DEFAULT_MAX_NODES,
    min: 1,
    max: CITATION_LAYOUT_HARD_MAX_NODES,
    label: "maxNodes",
    warnings,
  });
  const maxEdges = clampPositiveInteger({
    value: args.maxEdges || args.max_edges,
    fallback: CITATION_LAYOUT_DEFAULT_MAX_EDGES,
    min: 0,
    max: CITATION_LAYOUT_HARD_MAX_EDGES,
    label: "maxEdges",
    warnings,
  });
  const slice = normalizeGraphSliceArgs({
    ...args,
    startNodeId,
    maxNodes,
    maxEdges,
  });
  return {
    preset,
    viewKey,
    scope,
    explicitNodeIds,
    slice,
    maxNodes,
    maxEdges,
    allowTruncated: booleanArg(
      args.allowTruncated || args.allow_truncated,
      false,
    ),
    warnings: [...warnings, ...slice.warnings],
  };
}

function normalizeGraphMetricsArgs(args: Record<string, unknown>): {
  limit: number;
  paperRefs: string[];
  sortBy: CitationGraphMetricsSortBy;
  warnings: string[];
} {
  const warnings: string[] = [];
  const limit = clampPositiveInteger({
    value: args.limit,
    fallback: 25,
    min: 1,
    max: 100,
    label: "limit",
    warnings,
  });
  const paperRefs = normalizeArray(args.paperRefs || args.paper_refs)
    .map(cleanString)
    .filter(Boolean)
    .slice(0, 250);
  const rawSortBy = cleanString(args.sortBy || args.sort_by).toLowerCase();
  const sortBy =
    rawSortBy === "frontier" ||
    rawSortBy === "pagerank" ||
    rawSortBy === "in_degree"
      ? rawSortBy
      : "foundation";
  if (rawSortBy && rawSortBy !== sortBy) {
    warnings.push("sortBy defaulted to foundation");
  }
  return {
    limit,
    paperRefs,
    sortBy,
    warnings,
  };
}

function normalizeExternalReferenceRankArgs(args: Record<string, unknown>): {
  limit: number;
  sortBy: "external_degree" | "shared_source_count" | "year";
  warnings: string[];
} {
  const warnings: string[] = [];
  const limit = clampPositiveInteger({
    value: args.limit,
    fallback: 25,
    min: 1,
    max: 100,
    label: "limit",
    warnings,
  });
  const rawSortBy = cleanString(args.sortBy || args.sort_by).toLowerCase();
  const sortBy =
    rawSortBy === "shared_source_count" || rawSortBy === "year"
      ? rawSortBy
      : "external_degree";
  if (rawSortBy && rawSortBy !== sortBy) {
    warnings.push("sortBy defaulted to external_degree");
  }
  return { limit, sortBy, warnings };
}

function normalizeAttentionQueueArgs(args: Record<string, unknown>): {
  limit: number;
  paperRefs: string[];
  sourceRefs: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const limit = clampPositiveInteger({
    value: args.limit,
    fallback: 25,
    min: 1,
    max: 100,
    label: "limit",
    warnings,
  });
  return {
    limit,
    paperRefs: normalizeArray(args.paperRefs || args.paper_refs)
      .map(cleanString)
      .filter(Boolean)
      .slice(0, 250),
    sourceRefs: normalizeArray(args.sourceRefs || args.source_refs)
      .map(cleanString)
      .filter(Boolean)
      .slice(0, 250),
    warnings,
  };
}

function edgeMatchesRole(
  edge: CitationGraph["edges"][number],
  roleFilter: Set<string>,
) {
  if (!roleFilter.size) {
    return true;
  }
  if (roleFilter.has(cleanString(edge.primary_role))) {
    return true;
  }
  return [...(edge.aux_roles || []), ...(edge.role_evidence || [])].some(
    (entry) => roleFilter.has(cleanString(entry.role)),
  );
}

function buildCitationGraphSlice(args: {
  graph: CitationGraph;
  metrics?: CitationGraphMetrics | null;
  startNodeId: string;
  depth: number;
  maxNodes: number;
  maxEdges: number;
  direction: CitationGraphSliceDirection;
  includeLowSignal: boolean;
  roleFilter: Set<string>;
  warnings: string[];
}): SynthesisCitationGraphSliceResult {
  const nodeById = new Map(
    args.graph.nodes.map((node) => [node.node_id, node]),
  );
  const warnings = [...args.warnings];
  const allowedNode = (nodeId: string) => {
    const node = nodeById.get(nodeId);
    return (
      !!node &&
      (args.includeLowSignal || !node.low_signal || nodeId === args.startNodeId)
    );
  };
  if (!nodeById.has(args.startNodeId)) {
    warnings.push(`start node not found: ${args.startNodeId}`);
    return {
      ok: false,
      graph_hash: cleanString(args.graph.graph_hash),
      start_node_id: args.startNodeId,
      nodes: [],
      edges: [],
      diagnostics: {
        snapshot_found: true,
        depth: args.depth,
        node_count: 0,
        edge_count: 0,
        truncated: false,
        limits: {
          maxNodes: args.maxNodes,
          maxEdges: args.maxEdges,
          maxDepth: 2,
        },
        warnings,
      },
    };
  }

  const candidateEdges = args.graph.edges
    .filter((edge) => edgeMatchesRole(edge, args.roleFilter))
    .filter((edge) => allowedNode(edge.source) && allowedNode(edge.target))
    .sort((left, right) => left.edge_id.localeCompare(right.edge_id));
  const outgoing = new Map<string, CitationGraph["edges"]>();
  const incoming = new Map<string, CitationGraph["edges"]>();
  for (const edge of candidateEdges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge]);
    incoming.set(edge.target, [...(incoming.get(edge.target) || []), edge]);
  }
  const selectedNodeIds = new Set<string>([args.startNodeId]);
  const selectedEdgeIds = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [
    { nodeId: args.startNodeId, depth: 0 },
  ];
  let truncated = false;
  while (queue.length) {
    const current = queue.shift()!;
    if (current.depth >= args.depth) {
      continue;
    }
    const nextEdges = [
      ...(args.direction === "incoming"
        ? []
        : outgoing.get(current.nodeId) || []),
      ...(args.direction === "outgoing"
        ? []
        : incoming.get(current.nodeId) || []),
    ].sort((left, right) => left.edge_id.localeCompare(right.edge_id));
    for (const edge of nextEdges) {
      const nextNodeId =
        edge.source === current.nodeId ? edge.target : edge.source;
      if (selectedEdgeIds.size >= args.maxEdges) {
        truncated = true;
        continue;
      }
      if (
        !selectedNodeIds.has(nextNodeId) &&
        selectedNodeIds.size >= args.maxNodes
      ) {
        truncated = true;
        continue;
      }
      selectedEdgeIds.add(edge.edge_id);
      if (!selectedNodeIds.has(nextNodeId)) {
        selectedNodeIds.add(nextNodeId);
        queue.push({ nodeId: nextNodeId, depth: current.depth + 1 });
      }
    }
  }
  const metricByNode = citationMetricsSummary(
    args.metrics || null,
    args.graph.graph_hash,
  );
  const nodes = args.graph.nodes
    .filter((node) => selectedNodeIds.has(node.node_id))
    .map((node) => {
      const metrics = metricByNode.get(node.node_id);
      if (!metrics) {
        return node;
      }
      return {
        ...node,
        metrics: {
          internal_in_degree: metrics.internal_in_degree,
          internal_out_degree: metrics.internal_out_degree,
          internal_pagerank: metrics.internal_pagerank,
          foundation_score: metrics.foundation_score,
          frontier_score: metrics.frontier_score,
          synthesis_role_hints: metrics.synthesis_role_hints,
        },
      };
    })
    .sort((left, right) => left.node_id.localeCompare(right.node_id));
  const retained = new Set(nodes.map((node) => node.node_id));
  const edges = args.graph.edges
    .filter((edge) => selectedEdgeIds.has(edge.edge_id))
    .filter((edge) => retained.has(edge.source) && retained.has(edge.target))
    .sort((left, right) => left.edge_id.localeCompare(right.edge_id));
  return {
    ok: true,
    graph_hash: cleanString(args.graph.graph_hash),
    start_node_id: args.startNodeId,
    nodes,
    edges,
    diagnostics: {
      snapshot_found: true,
      depth: args.depth,
      node_count: nodes.length,
      edge_count: edges.length,
      truncated,
      limits: {
        maxNodes: args.maxNodes,
        maxEdges: args.maxEdges,
        maxDepth: 2,
      },
      warnings,
    },
  };
}

function citationNodePaperRef(node: CitationGraph["nodes"][number]) {
  if (node.kind !== "library_paper") {
    return undefined;
  }
  if (node.library_id && node.item_key) {
    return `${node.library_id}:${node.item_key}`;
  }
  return cleanString(node.item_key) || undefined;
}

function compactLayoutNode(args: {
  node: CitationGraph["nodes"][number];
  coordinates: { x: number; y: number };
}): SynthesisCitationGraphLayoutResult["nodes"][number] {
  return {
    node_id: args.node.node_id,
    title: cleanString(args.node.title) || undefined,
    node_type: args.node.kind,
    paper_ref: citationNodePaperRef(args.node),
    year: cleanString(args.node.year) || undefined,
    x: args.coordinates.x,
    y: args.coordinates.y,
    low_signal: args.node.low_signal || undefined,
  };
}

function compactLayoutEdge(edge: CitationGraph["edges"][number]) {
  return {
    edge_id: edge.edge_id,
    source: edge.source,
    target: edge.target,
    primary_role: edge.primary_role,
    aux_roles: edge.aux_roles || [],
    weight: Math.max(1, Math.floor(Number(edge.mention_count) || 1)),
  };
}

function emptyCitationGraphLayoutResult(args: {
  status: SynthesisCitationGraphLayoutResult["status"];
  scope: SynthesisCitationGraphLayoutResult["scope"];
  graphHash?: string;
  layoutHash?: string;
  layoutStatus?: SynthesisCacheReadinessStatus;
  preset: CitationLayoutAlgorithm;
  viewKey: string;
  snapshotFound: boolean;
  layoutFound: boolean;
  warnings: string[];
  truncated?: boolean;
  maxNodes: number;
  maxEdges: number;
  maintenance?: Record<string, unknown>;
  recommendedCommands?: string[];
}): SynthesisCitationGraphLayoutResult {
  const recommended =
    args.recommendedCommands ||
    (args.layoutStatus && args.layoutStatus !== "ready"
      ? ["recomputeCitationGraphLayout"]
      : []);
  return {
    ok: false,
    status: args.status,
    scope: args.scope,
    graph_hash: cleanString(args.graphHash),
    layout_hash: cleanString(args.layoutHash),
    layout_status: args.layoutStatus || "missing",
    preset: args.preset,
    view_key: args.viewKey,
    nodes: [],
    edges: [],
    diagnostics: {
      snapshot_found: args.snapshotFound,
      layout_found: args.layoutFound,
      node_count: 0,
      edge_count: 0,
      truncated: Boolean(args.truncated),
      limits: {
        maxNodes: args.maxNodes,
        maxEdges: args.maxEdges,
        hardMaxNodes: CITATION_LAYOUT_HARD_MAX_NODES,
        hardMaxEdges: CITATION_LAYOUT_HARD_MAX_EDGES,
      },
      warnings: args.warnings,
      recommended_commands: recommended,
      maintenance: args.maintenance || {},
    },
  };
}

function registryRowsToUi(rows: ReferenceSidecarIndexRow[]) {
  return rows.map((row) => ({
    paper_ref: row.paper_ref,
    title: row.title,
    year: row.year,
    artifactCoverage: row.artifactCoverage,
    missing_artifacts: Object.values(row.artifacts)
      .filter((artifact) => artifact.status !== "available")
      .map((artifact) => artifact.type),
    index_scope: "library" as const,
  }));
}

function referenceSidecarReferenceToUiRow(
  reference: ReferenceSidecarReferenceFact,
): RegistryReferenceUiRow {
  return {
    reference_instance_id: reference.referenceInstanceId,
    reference_index: reference.referenceIndex,
    title:
      cleanString(reference.title) ||
      cleanString(reference.rawReference) ||
      reference.referenceInstanceId,
    year: cleanString(reference.year) || undefined,
    raw_reference: cleanString(reference.rawReference) || undefined,
    confidence: cleanString(reference.confidence) || undefined,
    target_literature_item_id:
      cleanString(reference.targetLiteratureItemId) || undefined,
    target_title: cleanString(reference.targetTitle) || undefined,
    target_paper_ref: cleanString(reference.targetPaperRef) || undefined,
    target_binding: reference.targetLiteratureItemId
      ? reference.targetHasZoteroBinding
        ? "library"
        : "external"
      : "none",
    binding_status:
      reference.bindingStatus === "candidate" ||
      reference.bindingStatus === "accepted" ||
      reference.bindingStatus === "rejected" ||
      reference.bindingStatus === "stale_target"
        ? reference.bindingStatus
        : undefined,
  };
}

type EnrichedCleanupProposal = {
  proposal_id: string;
  kind: string;
  status: SynthesisUiCleanupProposalRow["status"];
  source_paper_ref: string;
  reference_instance_id?: string;
  provisional_key?: string;
  reason: string;
  diagnostics?: unknown[];
  created_at?: string;
  updated_at?: string;
  source_paper_title?: string;
  reference_title?: string;
  reference_raw?: string;
  target_paper_ref?: string;
  target_paper_title?: string;
  target_work_id?: string;
  target_work_title?: string;
  decision_summary?: string;
};

type EnrichedIndexReviewProposal = Omit<
  EnrichedCleanupProposal,
  "kind" | "status"
> & {
  kind: string;
  status: SynthesisUiCleanupProposalRow["status"];
  review_kind: string;
  priority: number;
  blocked_by_review_item_id?: string;
  target_literature_item_id?: string;
};

function parseReviewPayload(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(cleanString(value) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function indexReviewProposalsFromDb(
  reviewItems: SynthesisReviewItemRecord[],
): EnrichedIndexReviewProposal[] {
  return reviewItems
    .filter(
      (review) =>
        review.reviewKind === "zotero_item_delete" ||
        review.reviewKind === "zotero_dedupe_candidate" ||
        review.reviewKind === "canonical_revision",
    )
    .map((review) => {
      const payload = parseReviewPayload(review.payloadJson);
      if (review.reviewKind === "canonical_revision") {
        const title =
          cleanString(payload.title) ||
          cleanString(payload.normalized_title) ||
          cleanString(payload.canonical_reference_id) ||
          review.reviewItemId;
        const targetTitle =
          cleanString(payload.successor_title) ||
          cleanString(payload.successor_canonical_reference_id);
        const action = cleanString(payload.recommended_action);
        const blockers = normalizeStringListInput(payload.blockers);
        return {
          proposal_id: review.reviewItemId,
          kind: "canonical_revision",
          review_kind: "canonical_revision",
          priority: review.priority,
          status: review.status as EnrichedIndexReviewProposal["status"],
          source_paper_ref: cleanString(payload.source_ref || review.scopeRef),
          source_paper_title: title,
          reference_instance_id:
            cleanString(payload.canonical_reference_id) || undefined,
          provisional_key:
            cleanString(payload.successor_confidence) || undefined,
          reference_title: title,
          reference_raw: normalizeStringListInput(
            normalizeArray(payload.stale_raw_references).map((entry) =>
              isRecord(entry) ? entry.title || entry.raw_reference_id : entry,
            ),
          ).join("; "),
          target_paper_ref:
            cleanString(payload.successor_canonical_reference_id) || undefined,
          target_paper_title: targetTitle || undefined,
          target_literature_item_id:
            cleanString(payload.successor_canonical_reference_id) || undefined,
          reason:
            action === "redirect_to_successor"
              ? "Stale canonical has a protected successor candidate."
              : "Stale canonical is protected and needs lifecycle review.",
          diagnostics: parseJsonArray(review.diagnosticsJson),
          created_at: review.createdAt || "",
          updated_at: review.updatedAt || "",
          blocked_by_review_item_id: review.blockedByReviewItemId,
          decision_summary: [
            action === "redirect_to_successor"
              ? `Review redirect to "${targetTitle || "successor canonical"}".`
              : "Review whether this orphan canonical can be marked stale.",
            blockers.length ? `Blockers: ${blockers.join(", ")}` : "",
          ]
            .filter(Boolean)
            .join(" "),
        };
      }
      const candidates = Array.isArray(payload.candidates)
        ? (payload.candidates.filter(
            (entry) => entry && typeof entry === "object",
          ) as Array<Record<string, unknown>>)
        : [];
      const duplicate = candidates.find(
        (candidate) =>
          cleanString(candidate.literature_item_id) ===
          cleanString(payload.literature_item_id),
      );
      const survivor = candidates.find(
        (candidate) =>
          cleanString(candidate.literature_item_id) ===
          cleanString(payload.surviving_literature_item_id),
      );
      const title =
        cleanString(payload.title) ||
        cleanString(duplicate?.title) ||
        cleanString(payload.paper_ref) ||
        review.reviewItemId;
      const targetTitle =
        cleanString(survivor?.title) ||
        cleanString(payload.surviving_literature_item_id);
      const isDeletion = review.reviewKind === "zotero_item_delete";
      return {
        proposal_id: review.reviewItemId,
        kind: review.reviewKind,
        review_kind: review.reviewKind,
        priority: review.priority,
        status: review.status as EnrichedIndexReviewProposal["status"],
        source_paper_ref: cleanString(payload.paper_ref || review.scopeRef),
        source_paper_title: title,
        reference_instance_id: undefined,
        provisional_key: cleanString(payload.identifier_key) || undefined,
        reference_title: title,
        reference_raw: undefined,
        target_paper_ref: cleanString(survivor?.paper_ref) || undefined,
        target_paper_title: targetTitle || undefined,
        target_literature_item_id:
          cleanString(payload.surviving_literature_item_id) || undefined,
        reason: isDeletion
          ? "Zotero item is missing and needs deletion review."
          : "Multiple Zotero items share a strong identifier and need dedupe review.",
        diagnostics: [],
        created_at: review.createdAt || "",
        updated_at: review.updatedAt || "",
        blocked_by_review_item_id: review.blockedByReviewItemId,
        decision_summary: isDeletion
          ? `Decide whether "${title}" was removed from the Zotero library or should be kept for now.`
          : `Decide whether "${title}" should merge into "${targetTitle || "the suggested survivor"}".`,
      };
    });
}

function metricSortValue(
  entry: CitationGraphLibraryNodeMetrics,
  sortBy: CitationGraphMetricsSortBy,
) {
  if (sortBy === "frontier") {
    return entry.frontier_score;
  }
  if (sortBy === "pagerank") {
    return entry.internal_pagerank;
  }
  if (sortBy === "in_degree") {
    return entry.internal_in_degree;
  }
  return entry.foundation_score;
}

function normalizeResolverMode(resolver: Record<string, unknown>) {
  return cleanString(resolver.mode || resolver.type || resolver.kind);
}

function normalizeArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  return value === undefined || value === null || value === "" ? [] : [value];
}

function normalizeStringListInput(value: unknown): string[] {
  return Array.from(
    new Set(normalizeArray(value).map(cleanString).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
}

function readZoteroItemField(item: unknown, field: string) {
  try {
    return cleanString(
      (item as { getField?: (name: string) => unknown })?.getField?.(field),
    );
  } catch {
    return "";
  }
}

function extractYearFromDate(value: unknown) {
  return (
    cleanString(value).match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/)?.[1] || ""
  );
}

function extractCitekeyFromExtra(value: unknown) {
  const match = cleanString(value).match(
    /(?:^|\n)\s*(?:citation\s*key|citekey)\s*:\s*([^\s]+)\s*(?:$|\n)/i,
  );
  return cleanString(match?.[1]);
}

function zoteroCreatorsFromItem(item: unknown) {
  try {
    const creators =
      (
        item as { getCreators?: () => Array<Record<string, unknown>> }
      )?.getCreators?.() || [];
    const names = creators
      .map((creator) =>
        cleanString(
          [creator.firstName, creator.lastName].filter(Boolean).join(" ") ||
            creator.name ||
            creator.lastName ||
            creator.firstName,
        ),
      )
      .filter(Boolean);
    if (names.length) {
      return names;
    }
  } catch {
    // Fall through to firstCreator below.
  }
  return cleanString((item as { firstCreator?: unknown })?.firstCreator)
    ? [cleanString((item as { firstCreator?: unknown })?.firstCreator)]
    : [];
}

function zoteroTagsFromItem(item: unknown) {
  try {
    return normalizeStringListInput(
      (
        (
          item as { getTags?: () => Array<{ tag?: unknown } | unknown> }
        )?.getTags?.() || []
      ).map((entry) => cleanString((entry as { tag?: unknown })?.tag || entry)),
    );
  } catch {
    return [];
  }
}

function zoteroCollectionsFromItem(item: unknown) {
  try {
    return normalizeStringListInput(
      (item as { getCollections?: () => unknown[] })?.getCollections?.() || [],
    );
  } catch {
    return [];
  }
}

function resolveWorkflowSidecarItem(args: {
  input: SynthesisWorkflowSidecarItemInput;
  defaultLibraryId: number;
}) {
  const item = args.input.parentItem || args.input.item;
  const itemRecord = item as Record<string, unknown> | undefined;
  const libraryId =
    normalizeLibraryId(args.input.libraryId) ||
    normalizeLibraryId(itemRecord?.libraryID) ||
    args.defaultLibraryId;
  const itemKey = cleanString(args.input.itemKey || itemRecord?.key);
  const date = cleanString(
    args.input.date || readZoteroItemField(item, "date"),
  );
  const title =
    cleanString(args.input.title) ||
    readZoteroItemField(item, "title") ||
    cleanString(
      (item as { getDisplayTitle?: () => unknown })?.getDisplayTitle?.(),
    );
  const creators = normalizeStringListInput(args.input.creators).length
    ? normalizeStringListInput(args.input.creators)
    : zoteroCreatorsFromItem(item);
  const tags = normalizeStringListInput(args.input.tags).length
    ? normalizeStringListInput(args.input.tags)
    : zoteroTagsFromItem(item);
  const collections = normalizeStringListInput(args.input.collections).length
    ? normalizeStringListInput(args.input.collections)
    : zoteroCollectionsFromItem(item);
  const citekey =
    cleanString(args.input.citekey) ||
    readZoteroItemField(item, "citationKey") ||
    cleanString(
      (item as { toJSON?: () => Record<string, unknown> })?.toJSON?.()
        ?.citationKey,
    ) ||
    extractCitekeyFromExtra(readZoteroItemField(item, "extra"));
  return {
    libraryId,
    itemKey,
    paperRef: itemKey ? `${libraryId}:${itemKey}` : "",
    itemType: cleanString(args.input.itemType || itemRecord?.itemType),
    title,
    year: cleanString(args.input.year) || extractYearFromDate(date),
    creators,
    tags,
    collections,
    doi: cleanString(args.input.doi) || readZoteroItemField(item, "DOI"),
    arxiv: cleanString(args.input.arxiv),
    isbn: cleanString(args.input.isbn) || readZoteroItemField(item, "ISBN"),
    url: cleanString(args.input.url) || readZoteroItemField(item, "url"),
    citekey,
    dateAdded: cleanString(args.input.dateAdded || itemRecord?.dateAdded),
  };
}

function referenceTitle(reference: SynthesisSidecarReferenceInput) {
  return cleanString(
    reference.title ||
      reference.parsed_title ||
      reference.parsedTitle ||
      reference.paper_title,
  );
}

function referenceYear(reference: SynthesisSidecarReferenceInput) {
  return cleanString(
    reference.year ||
      extractYearFromDate(reference.raw || reference.raw_reference),
  );
}

function referenceAuthors(reference: SynthesisSidecarReferenceInput) {
  return normalizeStringListInput(reference.authors || reference.author);
}

function referenceRaw(reference: SynthesisSidecarReferenceInput) {
  return cleanString(
    reference.raw || reference.raw_reference || reference.reference,
  );
}

function referenceCitekey(reference: SynthesisSidecarReferenceInput) {
  return cleanString(
    reference.citekey || reference.citeKey || reference.citationKey,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function pathLabel(path: string, key: string) {
  return path === "$" ? `$.${key}` : `${path}.${key}`;
}

function unknownFieldErrors(
  value: Record<string, unknown>,
  allowed: string[],
  path: string,
) {
  const allowedSet = new Set(allowed);
  return Object.keys(value)
    .filter((key) => !allowedSet.has(key))
    .map(
      (key) =>
        `${pathLabel(path, key)} is not allowed in canonical resolver schema`,
    );
}

function validateStringOrStringArray(value: unknown, path: string): string[] {
  if (typeof value === "string") {
    return value.trim() ? [] : [`${path} must not be empty`];
  }
  if (Array.isArray(value)) {
    if (!value.length) {
      return [`${path} must not be empty`];
    }
    return value.flatMap((entry, index) =>
      typeof entry === "string" && entry.trim()
        ? []
        : [`${path}[${index}] must be a non-empty string`],
    );
  }
  return [`${path} must be a string or non-empty string array`];
}

function validateStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    return [`${path} must be a non-empty string array`];
  }
  if (!value.length) {
    return [`${path} must not be empty`];
  }
  return value.flatMap((entry, index) =>
    typeof entry === "string" && entry.trim()
      ? []
      : [`${path}[${index}] must be a non-empty string`],
  );
}

function validateTagQueryValue(value: unknown, path: string): string[] {
  if (typeof value === "string" || Array.isArray(value)) {
    return validateStringOrStringArray(value, path);
  }
  if (!isRecord(value)) {
    return [
      `${path} must be a tag string, tag array, or { and, or, not } object`,
    ];
  }
  const errors = unknownFieldErrors(value, ["and", "or", "not"], path);
  const keys = ["and", "or", "not"].filter((key) => key in value);
  if (!keys.length) {
    errors.push(`${path} must include at least one of and, or, not`);
  }
  for (const key of keys) {
    errors.push(
      ...validateStringOrStringArray(value[key], pathLabel(path, key)),
    );
  }
  return errors;
}

function validateCollectionResolver(
  resolver: Record<string, unknown>,
  path: string,
) {
  const allowed = [
    "mode",
    "collection",
    "collections",
    "collection_key",
    "collection_keys",
    "collection_id",
    "collection_ids",
    "key",
    "id",
  ];
  const errors = unknownFieldErrors(resolver, allowed, path);
  const selectorKeys = allowed.filter(
    (key) => key !== "mode" && key in resolver,
  );
  if (!selectorKeys.length) {
    errors.push(`${path} collection resolver requires a collection selector`);
  }
  for (const key of selectorKeys) {
    errors.push(
      ...validateStringOrStringArray(resolver[key], pathLabel(path, key)),
    );
  }
  return errors;
}

function validateExplicitResolver(
  resolver: Record<string, unknown>,
  path: string,
) {
  const errors = unknownFieldErrors(resolver, ["mode", "paper_refs"], path);
  if (!("paper_refs" in resolver)) {
    errors.push(`${path}.paper_refs is required for explicit resolver`);
  } else {
    errors.push(
      ...validateStringArray(resolver.paper_refs, `${path}.paper_refs`),
    );
  }
  return errors;
}

function validateMixedResolver(
  resolver: Record<string, unknown>,
  path: string,
) {
  const errors = unknownFieldErrors(
    resolver,
    ["mode", "include", "exclude"],
    path,
  );
  if (!Array.isArray(resolver.include) || !resolver.include.length) {
    errors.push(`${path}.include must be a non-empty resolver array`);
  } else {
    resolver.include.forEach((entry, index) => {
      errors.push(
        ...validateCanonicalResolver(entry, `${path}.include[${index}]`),
      );
    });
  }
  if (resolver.exclude !== undefined) {
    if (!Array.isArray(resolver.exclude)) {
      errors.push(`${path}.exclude must be a resolver array`);
    } else {
      resolver.exclude.forEach((entry, index) => {
        errors.push(
          ...validateCanonicalResolver(entry, `${path}.exclude[${index}]`),
        );
      });
    }
  }
  return errors;
}

function validateCanonicalResolver(rawResolver: unknown, path = "$"): string[] {
  if (!isRecord(rawResolver)) {
    return [`${path} must be an object`];
  }
  const mode = cleanString(rawResolver.mode);
  if (!mode) {
    return [
      `${path}.mode is required and must be one of tag_query, collection, explicit, mixed`,
      ...unknownFieldErrors(rawResolver, ["mode"], path),
    ];
  }
  if (mode === "tag_query") {
    const errors = unknownFieldErrors(rawResolver, ["mode", "query"], path);
    if (!("query" in rawResolver)) {
      errors.push(`${path}.query is required for tag_query resolver`);
    } else {
      errors.push(...validateTagQueryValue(rawResolver.query, `${path}.query`));
    }
    return errors;
  }
  if (mode === "collection") {
    return validateCollectionResolver(rawResolver, path);
  }
  if (mode === "explicit") {
    return validateExplicitResolver(rawResolver, path);
  }
  if (mode === "mixed") {
    return validateMixedResolver(rawResolver, path);
  }
  return [`${path}.mode has unsupported value: ${mode}`];
}

function tagSet(row: ReferenceSidecarIndexRow) {
  return new Set(row.tags.map((entry) => entry.toLowerCase()));
}

function tagMatches(row: ReferenceSidecarIndexRow, query: unknown): boolean {
  const tags = tagSet(row);
  if (typeof query === "string") {
    return tags.has(query.toLowerCase());
  }
  if (Array.isArray(query)) {
    return query.every((entry) => tagMatches(row, entry));
  }
  if (!query || typeof query !== "object") {
    return true;
  }
  const object = query as Record<string, unknown>;
  const andEntries = normalizeArray(object.and);
  const orEntries = normalizeArray(object.or);
  const notEntries = normalizeArray(object.not);
  return (
    andEntries.every((entry) => tagMatches(row, entry)) &&
    (!orEntries.length || orEntries.some((entry) => tagMatches(row, entry))) &&
    !notEntries.some((entry) => tagMatches(row, entry))
  );
}

function collectionMatches(
  row: ReferenceSidecarIndexRow,
  resolver: Record<string, unknown>,
) {
  const collections = new Set(
    row.collections.map((entry) => entry.toLowerCase()),
  );
  const refs = [
    ...normalizeArray(resolver.collection),
    ...normalizeArray(resolver.collections),
    ...normalizeArray(resolver.collection_key),
    ...normalizeArray(resolver.collection_keys),
    ...normalizeArray(resolver.collection_id),
    ...normalizeArray(resolver.collection_ids),
    ...normalizeArray(resolver.key),
    ...normalizeArray(resolver.id),
  ]
    .map((entry) => cleanString(entry).toLowerCase())
    .filter(Boolean);
  return refs.length ? refs.some((ref) => collections.has(ref)) : false;
}

function explicitMatches(
  row: ReferenceSidecarIndexRow,
  resolver: Record<string, unknown>,
) {
  const refs = [
    ...normalizeArray(resolver.paper_ref),
    ...normalizeArray(resolver.paper_refs),
    ...normalizeArray(resolver.paperRefs),
    ...normalizeArray(resolver.item_key),
    ...normalizeArray(resolver.item_keys),
    ...normalizeArray(resolver.itemKeys),
    ...normalizeArray(resolver.include),
  ]
    .map(cleanString)
    .filter(Boolean);
  return refs.some((ref) => ref === row.paper_ref || ref === row.item_key);
}

function resolveRowsByResolver(
  rows: ReferenceSidecarIndexRow[],
  rawResolver: unknown,
): Map<string, { row: ReferenceSidecarIndexRow; reasons: string[] }> {
  const resolver =
    rawResolver && typeof rawResolver === "object"
      ? (rawResolver as Record<string, unknown>)
      : {};
  const mode = normalizeResolverMode(resolver);
  const result = new Map<
    string,
    { row: ReferenceSidecarIndexRow; reasons: string[] }
  >();
  const add = (row: ReferenceSidecarIndexRow, reason: string) => {
    const existing = result.get(row.paper_ref);
    if (existing) {
      if (!existing.reasons.includes(reason)) {
        existing.reasons.push(reason);
      }
      return;
    }
    result.set(row.paper_ref, { row, reasons: [reason] });
  };
  if (mode === "tag_query" || (!mode && resolver.query)) {
    for (const row of rows) {
      if (tagMatches(row, resolver.query)) {
        add(row, "tag_query");
      }
    }
    return result;
  }
  if (mode === "collection") {
    for (const row of rows) {
      if (collectionMatches(row, resolver)) {
        add(row, "collection");
      }
    }
    return result;
  }
  if (mode === "explicit") {
    for (const row of rows) {
      if (explicitMatches(row, resolver)) {
        add(row, "explicit");
      }
    }
    return result;
  }
  if (mode === "mixed") {
    const includeResolvers = normalizeArray(
      resolver.include_resolvers || resolver.includes || resolver.include,
    );
    const excludeResolvers = normalizeArray(
      resolver.exclude_resolvers || resolver.excludes || resolver.exclude,
    );
    const included = new Map<
      string,
      { row: ReferenceSidecarIndexRow; reasons: string[] }
    >();
    const sources = includeResolvers.length
      ? includeResolvers
      : [{ mode: "explicit" }];
    for (const child of sources) {
      for (const [paperRef, value] of resolveRowsByResolver(rows, child)) {
        included.set(paperRef, value);
      }
    }
    const excluded = new Set<string>();
    for (const child of excludeResolvers) {
      for (const paperRef of resolveRowsByResolver(rows, child).keys()) {
        excluded.add(paperRef);
      }
    }
    for (const [paperRef, value] of included) {
      if (!excluded.has(paperRef)) {
        result.set(paperRef, value);
      }
    }
    return result;
  }
  return result;
}

function sortedUniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.map(cleanString).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right),
  );
}

function normalizeResolvedPaperRefs(rawPaperSet: unknown) {
  if (!isRecord(rawPaperSet)) {
    return [];
  }
  return sortedUniqueStrings(
    normalizeArray(rawPaperSet.papers).map((paper) => {
      if (typeof paper === "string") {
        return paper;
      }
      if (!isRecord(paper)) {
        return "";
      }
      return (
        paper.paper_ref ||
        paper.paperRef ||
        paper.ref ||
        paper.item_key ||
        paper.itemKey ||
        ""
      );
    }),
  );
}

function hashStringList(values: string[]) {
  return hashCanonicalJson({
    values: [...values].sort((left, right) => left.localeCompare(right)),
  });
}

function reason(args: {
  code: string;
  severity?: TopicFreshnessReason["severity"];
  message: string;
  details?: Record<string, unknown>;
}): TopicFreshnessReason {
  return {
    code: args.code,
    severity: args.severity || "warning",
    message: args.message,
    ...(args.details ? { details: args.details } : {}),
  };
}

function registryByPaperRef(rows: ReferenceSidecarIndexRow[]) {
  return new Map(rows.map((row) => [row.paper_ref, row]));
}

function artifactDependencyForRow(
  row: ReferenceSidecarIndexRow | undefined,
  type: ReferenceSidecarArtifactType,
): TopicArtifactDependency {
  const artifact = row?.artifacts?.[type];
  if (!artifact) {
    return { status: "missing", hash: "" };
  }
  return {
    status: artifact.status,
    hash: cleanString(artifact.hash),
  };
}

function buildArtifactDependencies(
  paperRefs: string[],
  registryRows: ReferenceSidecarIndexRow[],
) {
  const byRef = registryByPaperRef(registryRows);
  const dependencies: Record<
    string,
    Record<ReferenceSidecarArtifactType, TopicArtifactDependency>
  > = {};
  const registryHashes: Record<string, string> = {};
  const missingArtifacts: string[] = [];
  for (const paperRef of paperRefs) {
    const row = byRef.get(paperRef);
    registryHashes[paperRef] = cleanString(row?.row_hash);
    dependencies[paperRef] = Object.fromEntries(
      REGISTRY_ARTIFACT_TYPES.map((type) => [
        type,
        artifactDependencyForRow(row, type),
      ]),
    ) as Record<ReferenceSidecarArtifactType, TopicArtifactDependency>;
    for (const type of REGISTRY_ARTIFACT_TYPES) {
      if (dependencies[paperRef][type].status !== "available") {
        missingArtifacts.push(`${paperRef}:${type}`);
      }
    }
  }
  return {
    registry_row_hashes: registryHashes,
    paper_artifacts: dependencies,
    missing_artifacts: missingArtifacts.sort((left, right) =>
      left.localeCompare(right),
    ),
  };
}

function coverageFromDependencies(
  snapshot: TopicDependencySnapshot | null,
): TopicCoverage {
  const refs = snapshot?.saved_paper_refs || [];
  if (!refs.length) {
    return "missing";
  }
  const total = refs.length * REGISTRY_ARTIFACT_TYPES.length;
  const missing = snapshot?.missing_artifacts.length || 0;
  if (missing <= 0) {
    return "complete";
  }
  return missing >= total ? "missing" : "partial";
}

function paperCountFromTopicState(state: TopicArtifactStateRow | undefined) {
  const savedCount =
    state?.baseline_dependencies?.saved_paper_refs?.length || 0;
  const currentCount =
    state?.current_dependencies?.current_paper_refs?.length || 0;
  return Math.max(savedCount, currentCount, 0);
}

function paperRefFromMissingArtifact(entry: unknown) {
  const value = cleanString(entry);
  for (const type of REGISTRY_ARTIFACT_TYPES) {
    const suffix = `:${type}`;
    if (value.endsWith(suffix)) {
      return value.slice(0, -suffix.length);
    }
  }
  return value;
}

function completionFromTopicState(state: TopicArtifactStateRow | undefined) {
  if (!state) {
    return 0;
  }
  const dependencies =
    state.current_dependencies || state.baseline_dependencies;
  const refs = dependencies?.current_paper_refs?.length
    ? dependencies.current_paper_refs
    : dependencies?.saved_paper_refs || [];
  if (!refs.length) {
    return state.coverage === "complete" ? 100 : 0;
  }
  const missingPaperRefs = new Set(
    (dependencies?.missing_artifacts || [])
      .map(paperRefFromMissingArtifact)
      .filter(Boolean),
  );
  const completeCount = refs.filter(
    (paperRef) => !missingPaperRefs.has(paperRef),
  ).length;
  return Math.max(
    0,
    Math.min(100, Math.round((completeCount / refs.length) * 100)),
  );
}

function changedSectionsForReason(reasonCode: string) {
  if (reasonCode === "paper_set_changed") {
    return [];
  }
  if (reasonCode === "graph_changed") {
    return ["coverage", "source_artifacts"];
  }
  if (
    reasonCode === "artifact_available" ||
    reasonCode === "artifact_missing"
  ) {
    return ["coverage", "diagnostics"];
  }
  if (reasonCode === "artifact_changed") {
    return ["claims", "source_papers", "timeline_events"];
  }
  return [];
}

function deriveTopicUpdateIntent(args: {
  topicId: string;
  language?: string;
  state?: TopicArtifactStateRow;
  row?: TopicIndexRow;
}): TopicUpdateIntent {
  const language =
    cleanString(args.language) || cleanString(args.row?.language) || "auto";
  const reasons = args.state?.reasons || [];
  const firstReason = reasons[0];
  const reasonCode =
    cleanString(firstReason?.code) ||
    cleanString(args.state?.freshness) ||
    "manual";
  let mode: TopicUpdateIntent["mode"] = "auto";
  let scope = "auto";
  let changedSections = changedSectionsForReason(reasonCode);
  if (args.state?.freshness === "dirty") {
    mode = "update_full";
    scope = "repair";
    changedSections = [];
  } else if (
    args.state?.freshness === "queued" ||
    args.state?.freshness === "running"
  ) {
    mode = "auto";
    scope = "maintenance";
    changedSections = [];
  } else if (args.state?.freshness === "failed") {
    mode = "update_full";
    scope = "repair";
    changedSections = [];
  } else if (args.state?.coverage && args.state.coverage !== "complete") {
    mode = "update_patch";
    scope = "coverage";
    changedSections = ["coverage", "diagnostics"];
  } else if (reasonCode === "paper_set_changed") {
    mode = "update_full";
    scope = "paper_set";
  } else if (changedSections.length) {
    mode = "update_patch";
    scope = changedSections.includes("coverage")
      ? "coverage"
      : changedSections[0];
  }
  const allowed =
    args.state?.freshness === "queued" || args.state?.freshness === "running"
      ? false
      : Boolean(args.state && args.state.freshness !== "fresh") ||
        mode !== "auto";
  return {
    allowed,
    reason: reasonCode,
    scope,
    mode,
    changed_sections: changedSections,
    prefill: {
      topicId: args.topicId,
      language,
      updateScope: scope,
      updateMode: mode,
      updateReason: reasonCode,
    },
    diagnostics: reasons,
  };
}

function topicUpdateIntentForUi(args: {
  topicId: string;
  intent: TopicUpdateIntent;
}): SynthesisUiTopicUpdateIntent {
  const actionLabel: SynthesisUiTopicUpdateIntent["actionLabel"] =
    args.intent.allowed && args.intent.scope === "repair"
      ? "Repair/Rebuild"
      : args.intent.allowed && args.intent.scope === "coverage"
        ? "Complete"
        : "Update";
  return {
    topicId: args.topicId,
    language: args.intent.prefill.language,
    updateScope: args.intent.prefill.updateScope,
    updateMode: args.intent.prefill.updateMode,
    updateReason: args.intent.prefill.updateReason,
    actionLabel,
    changedSections: args.intent.changed_sections,
    blocked: !args.intent.allowed,
  };
}

function summaryFromTopicDefinition(
  definition: Record<string, unknown> | undefined,
  fallback: string,
) {
  if (!definition) {
    return fallback;
  }
  return (
    cleanString(definition.definition) ||
    cleanString(definition.summary) ||
    cleanString(definition.abstract) ||
    fallback
  );
}

function dependencyHash(snapshot: TopicDependencySnapshot | null) {
  return snapshot ? hashCanonicalJson(snapshot) : "";
}

function compareStringArrays(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function collectStaleReasons(
  baseline: TopicDependencySnapshot,
  current: TopicDependencySnapshot,
): TopicFreshnessReason[] {
  const reasons: TopicFreshnessReason[] = [];
  if (
    !compareStringArrays(baseline.saved_paper_refs, current.current_paper_refs)
  ) {
    reasons.push(
      reason({
        code: "paper_set_changed",
        message: "Resolver now resolves to a different paper set.",
        details: {
          baseline_count: baseline.saved_paper_refs.length,
          current_count: current.current_paper_refs.length,
        },
      }),
    );
  }
  if (baseline.graph_hash !== current.graph_hash) {
    reasons.push(
      reason({
        code: "graph_changed",
        message: "Persisted citation graph hash changed.",
        details: {
          baseline: baseline.graph_hash,
          current: current.graph_hash,
        },
      }),
    );
  }
  let changedCount = 0;
  let missingCount = 0;
  let availableCount = 0;
  const paperRefs = sortedUniqueStrings([
    ...Object.keys(baseline.paper_artifacts),
    ...Object.keys(current.paper_artifacts),
  ]);
  for (const paperRef of paperRefs) {
    for (const type of REGISTRY_ARTIFACT_TYPES) {
      const before = baseline.paper_artifacts[paperRef]?.[type] || {
        status: "missing",
        hash: "",
      };
      const after = current.paper_artifacts[paperRef]?.[type] || {
        status: "missing",
        hash: "",
      };
      if (before.status === "available" && after.status !== "available") {
        missingCount += 1;
      } else if (
        before.status !== "available" &&
        after.status === "available"
      ) {
        availableCount += 1;
      } else if (
        before.status === "available" &&
        after.status === "available" &&
        before.hash !== after.hash
      ) {
        changedCount += 1;
      }
    }
  }
  if (changedCount) {
    reasons.push(
      reason({
        code: "artifact_changed",
        message: "One or more dependent paper artifact hashes changed.",
        details: { count: changedCount },
      }),
    );
  }
  if (missingCount) {
    reasons.push(
      reason({
        code: "artifact_missing",
        message:
          "One or more previously available paper artifacts are now missing.",
        details: { count: missingCount },
      }),
    );
  }
  if (availableCount) {
    reasons.push(
      reason({
        code: "artifact_available",
        message:
          "One or more previously missing paper artifacts are now available.",
        details: { count: availableCount },
      }),
    );
  }
  return reasons;
}

async function readArtifactStateRows(root: string) {
  const paths = buildSynthesisStoragePaths(root);
  return readStateMap<TopicArtifactStateRow>(
    paths.artifactState,
    "topics",
  ).catch(() => ({}) as Record<string, TopicArtifactStateRow>);
}

async function writeArtifactStateRows(
  root: string,
  rows: Record<string, TopicArtifactStateRow>,
  timestamp: string,
) {
  const paths = buildSynthesisStoragePaths(root);
  await writeStateMap({
    path: paths.artifactState,
    schemaId: "synthesis.artifact_state",
    key: "topics",
    values: rows,
    now: timestamp,
  });
}

function topicDiscoveryStatusFromCounts(args: {
  open: number;
  rejected: number;
}): TopicDiscoveryStatus {
  if (args.open > 0) {
    return "candidates";
  }
  if (args.rejected > 0) {
    return "rejected";
  }
  return "none";
}

function topicDiscoverySummaryFromHints(
  hints: SynthesisTopicDiscoveryHintRecord[],
) {
  const open = hints.filter((hint) => hint.status === "open").length;
  const rejected = hints.filter((hint) => hint.status === "rejected").length;
  return {
    discovery_status: topicDiscoveryStatusFromCounts({ open, rejected }),
    candidate_count: open,
  };
}

function preserveTopicDiscoveryState(state: TopicArtifactStateRow | undefined) {
  return {
    discovery_status: state?.discovery_status || "none",
    candidate_count: Math.max(
      0,
      Math.floor(Number(state?.candidate_count) || 0),
    ),
  };
}

function topicArtifactStateWithKnownDependency(args: {
  state: Omit<
    TopicArtifactStateRow,
    "known_dependency_status" | "discovery_status" | "candidate_count"
  >;
  existing?: TopicArtifactStateRow;
}) {
  return {
    ...args.state,
    known_dependency_status: args.state.freshness,
    ...preserveTopicDiscoveryState(args.existing),
  } satisfies TopicArtifactStateRow;
}

async function readPersistedGraphHash(root: string) {
  const graph = await readPersistedCitationGraph(root);
  return cleanString(graph?.graph_hash);
}

async function safeFileHash(
  path: string,
  dirtyReasons: TopicFreshnessReason[],
  code: string,
) {
  try {
    if (!(await runtimePathExists(path))) {
      dirtyReasons.push(
        reason({
          code,
          severity: "error",
          message: `Required topic artifact file is missing: ${path}`,
        }),
      );
      return "";
    }
    return await fileHash(path);
  } catch (error) {
    dirtyReasons.push(
      reason({
        code,
        severity: "error",
        message: `Failed to read topic artifact file: ${errorMessage(error)}`,
      }),
    );
    return "";
  }
}

async function buildTopicDependencySnapshot(args: {
  root: string;
  row: TopicIndexRow;
  registryRows: ReferenceSidecarIndexRow[];
  graphHash: string;
}): Promise<{
  snapshot: TopicDependencySnapshot | null;
  dirtyReasons: TopicFreshnessReason[];
  coverage: TopicCoverage;
}> {
  const paths = buildSynthesisStoragePaths(args.root, args.row.path_id);
  const globalPaths = buildSynthesisStoragePaths(args.root);
  const dirtyReasons: TopicFreshnessReason[] = [];
  const resolvers = await readStateMap<Record<string, unknown>>(
    globalPaths.resolvers,
    "resolvers",
  ).catch(() => ({}) as Record<string, Record<string, unknown>>);
  const paperSets = await readStateMap<Record<string, unknown>>(
    globalPaths.resolvedPaperSets,
    "paper_sets",
  ).catch(() => ({}) as Record<string, Record<string, unknown>>);
  const resolver = resolvers[args.row.topic_id];
  const savedPaperSet = paperSets[args.row.topic_id];
  if (!resolver) {
    dirtyReasons.push(
      reason({
        code: "missing_resolver",
        severity: "error",
        message: "Topic resolver is missing.",
      }),
    );
  }
  if (!savedPaperSet) {
    dirtyReasons.push(
      reason({
        code: "missing_resolved_paper_set",
        severity: "error",
        message: "Saved resolved paper set is missing.",
      }),
    );
  }
  const resolverErrors = resolver ? validateCanonicalResolver(resolver) : [];
  if (resolverErrors.length) {
    dirtyReasons.push(
      reason({
        code: "invalid_resolver",
        severity: "error",
        message: "Topic resolver does not match the canonical schema.",
        details: { errors: resolverErrors },
      }),
    );
  }
  const metadataHash = await safeFileHash(
    paths.currentMetadata,
    dirtyReasons,
    "missing_current_metadata",
  );
  if (metadataHash && args.row.metadata_hash !== metadataHash) {
    dirtyReasons.push(
      reason({
        code: "index_hash_mismatch",
        severity: "error",
        message:
          "Artifact index metadata hash no longer matches current/metadata.json.",
      }),
    );
  }
  if (!resolver || !savedPaperSet || resolverErrors.length) {
    return { snapshot: null, dirtyReasons, coverage: "missing" };
  }
  const savedRefs = normalizeResolvedPaperRefs(savedPaperSet);
  const currentRefs = [
    ...resolveRowsByResolver(args.registryRows, resolver).keys(),
  ].sort((left, right) => left.localeCompare(right));
  const artifacts = buildArtifactDependencies(savedRefs, args.registryRows);
  const snapshot: TopicDependencySnapshot = {
    resolver_hash: hashCanonicalJson(resolver),
    saved_resolved_paper_set_hash: hashStringList(savedRefs),
    current_resolved_paper_set_hash: hashStringList(currentRefs),
    saved_paper_refs: savedRefs,
    current_paper_refs: currentRefs,
    registry_row_hashes: artifacts.registry_row_hashes,
    paper_artifacts: artifacts.paper_artifacts,
    missing_artifacts: artifacts.missing_artifacts,
    graph_hash: args.graphHash,
    metadata_hash: metadataHash,
    index_hash: await fileHash(globalPaths.index).catch(() => ""),
  };
  return {
    snapshot,
    dirtyReasons,
    coverage: coverageFromDependencies(snapshot),
  };
}

async function scanTopicFreshness(args: {
  root: string;
  rows: TopicIndexRow[];
  registryRows: ReferenceSidecarIndexRow[];
  timestamp: string;
  resetBaselineTopicIds?: Set<string>;
  topicIds?: Set<string>;
}) {
  const graphHash = await readPersistedGraphHash(args.root);
  const previous = await readArtifactStateRows(args.root);
  const next: Record<string, TopicArtifactStateRow> = { ...previous };
  const rows = args.topicIds?.size
    ? args.rows.filter((row) => args.topicIds?.has(row.topic_id))
    : args.rows;
  for (const row of rows) {
    const computed = await buildTopicDependencySnapshot({
      root: args.root,
      row,
      registryRows: args.registryRows,
      graphHash,
    });
    const existing = previous[row.topic_id];
    const shouldReset = args.resetBaselineTopicIds?.has(row.topic_id);
    if (!computed.snapshot) {
      next[row.topic_id] = topicArtifactStateWithKnownDependency({
        existing,
        state: {
          topic_id: row.topic_id,
          freshness: "dirty",
          coverage: computed.coverage,
          baseline_input_hash: existing?.baseline_input_hash || "",
          current_input_hash: "",
          baseline_dependencies: existing?.baseline_dependencies || null,
          current_dependencies: null,
          reasons: computed.dirtyReasons,
          last_scanned_at: args.timestamp,
          baseline_initialized_at: existing?.baseline_initialized_at,
          updated_at: row.updated_at,
        },
      });
      continue;
    }
    const currentHash = dependencyHash(computed.snapshot);
    const baselineMissing =
      shouldReset ||
      !existing ||
      !existing.baseline_dependencies ||
      !existing.baseline_input_hash;
    if (baselineMissing) {
      next[row.topic_id] = topicArtifactStateWithKnownDependency({
        existing,
        state: {
          topic_id: row.topic_id,
          freshness: computed.dirtyReasons.length ? "dirty" : "fresh",
          coverage: computed.coverage,
          baseline_input_hash: computed.dirtyReasons.length ? "" : currentHash,
          current_input_hash: currentHash,
          baseline_dependencies: computed.dirtyReasons.length
            ? null
            : computed.snapshot,
          current_dependencies: computed.snapshot,
          reasons: computed.dirtyReasons,
          last_scanned_at: args.timestamp,
          baseline_initialized_at: args.timestamp,
          updated_at: row.updated_at,
        },
      });
      if (!computed.dirtyReasons.length) {
        await appendJsonLine(buildSynthesisStoragePaths(args.root).log, {
          event: shouldReset ? "baseline_reset" : "baseline_initialized",
          topic_id: row.topic_id,
          at: args.timestamp,
          input_hash: currentHash,
        });
      }
      continue;
    }
    const baselineDependencies = existing.baseline_dependencies;
    if (!baselineDependencies) {
      continue;
    }
    const staleReasons = [
      ...computed.dirtyReasons,
      ...collectStaleReasons(baselineDependencies, computed.snapshot),
    ];
    const freshness: TopicFreshness = computed.dirtyReasons.length
      ? "dirty"
      : staleReasons.length
        ? "stale"
        : "fresh";
    next[row.topic_id] = topicArtifactStateWithKnownDependency({
      existing,
      state: {
        topic_id: row.topic_id,
        freshness,
        coverage: computed.coverage,
        baseline_input_hash: existing.baseline_input_hash,
        current_input_hash: currentHash,
        baseline_dependencies: baselineDependencies,
        current_dependencies: computed.snapshot,
        reasons: staleReasons,
        last_scanned_at: args.timestamp,
        baseline_initialized_at: existing.baseline_initialized_at,
        updated_at: row.updated_at,
      },
    });
  }
  await writeArtifactStateRows(args.root, next, args.timestamp);
  return next;
}

function paperRefsFromTopicDependencies(
  dependencies: TopicDependencySnapshot | null | undefined,
) {
  return new Set([
    ...(dependencies?.saved_paper_refs || []),
    ...(dependencies?.current_paper_refs || []),
  ]);
}

function topicIdsForPaperRefs(
  states: Record<string, TopicArtifactStateRow>,
  paperRefs: Iterable<string>,
) {
  const refs = new Set(Array.from(paperRefs).map(cleanString).filter(Boolean));
  if (!refs.size) {
    return [];
  }
  return Object.values(states)
    .filter((state) => {
      const topicRefs = new Set([
        ...paperRefsFromTopicDependencies(state.baseline_dependencies),
        ...paperRefsFromTopicDependencies(state.current_dependencies),
      ]);
      return [...refs].some((paperRef) => topicRefs.has(paperRef));
    })
    .map((state) => state.topic_id)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

async function markTopicFreshnessStatus(args: {
  root: string;
  topicIds: string[];
  freshness: TopicFreshness;
  timestamp: string;
  reason: TopicFreshnessReason;
}) {
  if (!args.topicIds.length) {
    return;
  }
  const previous = await readArtifactStateRows(args.root);
  for (const topicId of args.topicIds) {
    const existing = previous[topicId];
    previous[topicId] = topicArtifactStateWithKnownDependency({
      existing,
      state: {
        topic_id: topicId,
        freshness: args.freshness,
        coverage: existing?.coverage || "missing",
        baseline_input_hash: existing?.baseline_input_hash || "",
        current_input_hash: existing?.current_input_hash || "",
        baseline_dependencies: existing?.baseline_dependencies || null,
        current_dependencies: existing?.current_dependencies || null,
        reasons: [args.reason],
        last_scanned_at: args.timestamp,
        baseline_initialized_at: existing?.baseline_initialized_at,
        updated_at: existing?.updated_at,
      },
    });
  }
  await writeArtifactStateRows(args.root, previous, args.timestamp);
}

function chunkText(input: string, size: number) {
  const chunkSize = Math.max(1024, Math.floor(size || 0) || 64000);
  const chunks: string[] = [];
  for (let index = 0; index < input.length; index += chunkSize) {
    chunks.push(input.slice(index, index + chunkSize));
  }
  return chunks.length ? chunks : [""];
}

async function readExistingTopic(root: string, topicId: string) {
  const candidates = await topicReadCandidates(root, topicId);
  let partial: {
    topicId: string;
    pathId: string;
    paths: ReturnType<typeof buildSynthesisStoragePaths>;
    metadata: CanonicalEnvelope<TopicArtifactMetadata> | null;
    artifact: Record<string, unknown> | null;
    manifest: Record<string, unknown> | null;
    indexRow?: TopicIndexRow;
  } | null = null;
  for (const candidate of candidates) {
    const paths = buildSynthesisStoragePaths(root, candidate.pathId);
    const metadata = await readJson<CanonicalEnvelope<TopicArtifactMetadata>>(
      paths.currentMetadata,
    ).catch(() => null);
    const artifact = await readJson<Record<string, unknown>>(
      paths.currentArtifact,
    ).catch(() => null);
    const manifest = await readJson<Record<string, unknown>>(
      paths.currentManifest,
    ).catch(() => null);
    const entry = {
      topicId: candidate.topicId,
      pathId: candidate.pathId,
      paths,
      metadata,
      artifact,
      manifest,
      indexRow: candidate.indexRow,
    };
    if (metadata && artifact) {
      return entry;
    }
    partial ||= entry;
  }
  if (partial) {
    return partial;
  }
  const pathId = topicPathId(topicId);
  return {
    topicId,
    pathId,
    paths: buildSynthesisStoragePaths(root, pathId),
    metadata: null,
    artifact: null,
    manifest: null,
  };
}

function topicIndexRowFromExistingTopic(args: {
  topicId: string;
  pathId: string;
  metadata: TopicArtifactMetadata;
  artifact: unknown;
  indexRow?: TopicIndexRow;
}): TopicIndexRow {
  const artifact = isObject(args.artifact) ? args.artifact : {};
  const topicSection = isObject(artifact.topic) ? artifact.topic : {};
  const sourcePapers = Array.isArray(artifact.source_papers)
    ? artifact.source_papers
    : [];
  return {
    topic_id: args.topicId,
    path_id: args.pathId,
    title:
      cleanString(args.metadata.title) ||
      cleanString(topicSection.title) ||
      cleanString(args.indexRow?.title) ||
      args.topicId,
    definition:
      cleanString(args.metadata.definition) ||
      definitionTextFromDefinition(topicSection) ||
      cleanString(args.indexRow?.definition) ||
      undefined,
    updated_at:
      cleanString(args.metadata.updated_at) ||
      cleanString(args.indexRow?.updated_at),
    metadata_hash:
      cleanString(args.metadata.metadata_hash) ||
      cleanString(args.indexRow?.metadata_hash),
    bundle_hash:
      cleanString(args.metadata.bundle_hash) ||
      cleanString(args.indexRow?.bundle_hash),
    structured_hash:
      cleanString(args.metadata.structured_hash) ||
      cleanString(args.indexRow?.structured_hash) ||
      undefined,
    manifest_hash:
      cleanString(args.metadata.manifest_hash) ||
      cleanString(args.indexRow?.manifest_hash) ||
      undefined,
    language:
      cleanString(args.metadata.language) ||
      cleanString(args.indexRow?.language) ||
      undefined,
    operation:
      cleanString(args.metadata.operation) ||
      cleanString(args.indexRow?.operation) ||
      undefined,
    paper_count:
      Math.max(0, Math.floor(Number(args.metadata.paper_count) || 0)) ||
      sourcePapers.length ||
      args.indexRow?.paper_count ||
      0,
    external_literature_count:
      Math.max(
        0,
        Math.floor(Number(args.metadata.external_literature_count) || 0),
      ) ||
      args.indexRow?.external_literature_count ||
      0,
    coverage_summary:
      args.metadata.coverage_summary || args.indexRow?.coverage_summary,
  };
}

function reportBodyFromTopicArtifact(artifact: unknown) {
  const artifactObject = isObject(artifact) ? artifact : {};
  const report = isObject(artifactObject.synthesis_report)
    ? artifactObject.synthesis_report
    : {};
  return cleanString(report.body);
}

async function readTopicCurrentMetadata(
  root: string,
  topicId: string,
): Promise<TopicArtifactMetadata | null> {
  const paths = buildSynthesisStoragePaths(root, topicPathId(topicId));
  const envelope = await readJson<CanonicalEnvelope<TopicArtifactMetadata>>(
    paths.currentMetadata,
  ).catch(() => null);
  return envelope
    ? envelopeData<TopicArtifactMetadata>(envelope, {} as TopicArtifactMetadata)
    : null;
}

async function readTopicCurrentMetadataMap(
  root: string,
  nodes: SynthesisTopicGraphNode[],
) {
  const entries = await Promise.all(
    nodes.map(async (node) => {
      const topicId = cleanString(node.topic_id);
      if (!topicId || node.node_type !== "materialized") {
        return null;
      }
      const metadata = await readTopicCurrentMetadata(root, topicId);
      return metadata ? ([topicId, metadata] as const) : null;
    }),
  );
  return Object.fromEntries(
    entries.filter(Boolean) as Array<readonly [string, TopicArtifactMetadata]>,
  );
}

async function readTopicDefinitionsMap(root: string) {
  const paths = buildSynthesisStoragePaths(root);
  return readStateMap<Record<string, unknown>>(paths.topicDefinitions, "topics")
    .then(
      (definitions) => definitions as Record<string, Record<string, unknown>>,
    )
    .catch(() => ({}) as Record<string, Record<string, unknown>>);
}

async function readTopicDefinitionFromArtifact(root: string, topicId: string) {
  const paths = buildSynthesisStoragePaths(root, topicPathId(topicId));
  const sectionPath = joinPath(
    paths.currentSectionsRoot,
    canonicalSectionFileName("topic"),
  );
  const section = await readJson<Record<string, unknown>>(sectionPath).catch(
    () => null,
  );
  const sectionDefinition = isObject(section)
    ? definitionTextFromDefinition(section)
    : "";
  if (sectionDefinition) {
    return sectionDefinition;
  }
  const artifact = await readJson<Record<string, unknown>>(
    paths.currentArtifact,
  ).catch(() => null);
  const artifactTopic = isObject(artifact?.topic)
    ? (artifact.topic as Record<string, unknown>)
    : {};
  return definitionTextFromDefinition(artifactTopic);
}

async function fileHashIfExists(path: string) {
  return (await runtimePathExists(path)) ? await fileHash(path) : "";
}

async function recoverTopicIndexRowFromCurrentFiles(args: {
  root: string;
  topicId: string;
  timestamp: string;
}): Promise<TopicIndexRow | null> {
  const pathId = topicPathId(args.topicId);
  const paths = buildSynthesisStoragePaths(args.root, pathId);
  const hasCurrentArtifact = await runtimePathExists(paths.currentArtifact);
  const hasCurrentMetadata = await runtimePathExists(paths.currentMetadata);
  if (!hasCurrentArtifact && !hasCurrentMetadata) {
    return null;
  }

  const metadataEnvelope = await readJson<
    CanonicalEnvelope<TopicArtifactMetadata>
  >(paths.currentMetadata).catch(() => null);
  const metadata = envelopeData<TopicArtifactMetadata>(
    metadataEnvelope,
    {} as TopicArtifactMetadata,
  );
  const artifact = await readJson<Record<string, unknown>>(
    paths.currentArtifact,
  ).catch(() => null);
  const artifactTopic = isObject(artifact?.topic)
    ? (artifact.topic as Record<string, unknown>)
    : {};
  const definitionText = topicDefinitionFromSources({
    definition: artifactTopic,
    metadata,
  });
  const title =
    cleanString(metadata.title) ||
    titleFromDefinition(artifactTopic, args.topicId);
  const manifestHash =
    cleanString(metadata.manifest_hash) ||
    (await fileHashIfExists(paths.currentManifest));
  const structuredHash =
    cleanString(metadata.structured_hash || metadata.artifact_hash) ||
    (await fileHashIfExists(paths.currentArtifact));
  const metadataHash =
    cleanString(metadata.metadata_hash) ||
    (await fileHashIfExists(paths.currentMetadata));

  return {
    topic_id: args.topicId,
    path_id: pathId,
    title,
    definition: definitionText || undefined,
    updated_at: cleanString(metadata.updated_at) || args.timestamp,
    metadata_hash: metadataHash,
    bundle_hash: cleanString(metadata.bundle_hash),
    structured_hash: structuredHash,
    manifest_hash: manifestHash,
    language: cleanString(metadata.language) || undefined,
    operation: cleanString(metadata.operation || metadata.mode) || undefined,
    paper_count: metadata.paper_count,
    external_literature_count: metadata.external_literature_count,
    coverage_summary: isObject(metadata.coverage_summary)
      ? metadata.coverage_summary
      : undefined,
  };
}

type MirrorPayloadSource = {
  kind: ShardKind;
  assetId: string;
  assetPath: string;
  contentType: MirrorAssetContentType;
  path: string;
};

async function buildMirrorPayloadSources(
  root: string,
): Promise<MirrorPayloadSource[]> {
  const paths = buildSynthesisStoragePaths(root);
  const sources: MirrorPayloadSource[] = [
    {
      kind: "artifact_index",
      assetId: "state:index",
      assetPath: "state/index.json",
      contentType: "json",
      path: paths.index,
    },
    {
      kind: "topics",
      assetId: "state:topic-definitions",
      assetPath: "state/topic-definitions.json",
      contentType: "json",
      path: paths.topicDefinitions,
    },
    {
      kind: "resolvers",
      assetId: "state:resolvers",
      assetPath: "state/resolvers.json",
      contentType: "json",
      path: paths.resolvers,
    },
    {
      kind: "paper_sets",
      assetId: "state:resolved-paper-sets",
      assetPath: "state/resolved-paper-sets.json",
      contentType: "json",
      path: paths.resolvedPaperSets,
    },
    {
      kind: "artifact_state",
      assetId: "state:artifact-state",
      assetPath: "state/artifact-state.json",
      contentType: "json",
      path: paths.artifactState,
    },
    {
      kind: "artifact_state",
      assetId: "state:deleted-topic-artifacts",
      assetPath: "state/deleted-topic-artifacts.json",
      contentType: "json",
      path: paths.deletedArtifacts,
    },
  ];
  for (const row of await readIndexRows(root)) {
    const topicPath = topicPathId(row.path_id || row.topic_id);
    if (!topicPath) {
      continue;
    }
    const topicPaths = buildSynthesisStoragePaths(root, topicPath);
    if (!(await runtimePathExists(topicPaths.currentManifest))) {
      continue;
    }
    sources.push(
      {
        kind: "topic_current",
        assetId: `topic:${topicPath}:current-manifest`,
        assetPath: `topics/${topicPath}/current/manifest.json`,
        contentType: "json",
        path: topicPaths.currentManifest,
      },
      {
        kind: "topic_current",
        assetId: `topic:${topicPath}:current-metadata`,
        assetPath: `topics/${topicPath}/current/metadata.json`,
        contentType: "json",
        path: topicPaths.currentMetadata,
      },
      {
        kind: "topic_current",
        assetId: `topic:${topicPath}:current-artifact`,
        assetPath: `topics/${topicPath}/current/artifact.json`,
        contentType: "json",
        path: topicPaths.currentArtifact,
      },
    );
    for (const sectionPath of await listRuntimeChildren(
      topicPaths.currentSectionsRoot,
    )) {
      if (!sectionPath.endsWith(".json")) {
        continue;
      }
      const sectionName = sectionPath
        .replace(/\\/g, "/")
        .split("/")
        .pop()
        ?.replace(/\.json$/, "");
      if (!sectionName) {
        continue;
      }
      sources.push({
        kind: "topic_current",
        assetId: `topic:${topicPath}:section:${sectionName}`,
        assetPath: `topics/${topicPath}/current/sections/${sectionName}.json`,
        contentType: "json",
        path: sectionPath,
      });
    }
  }
  return sources.sort(
    (left, right) =>
      left.assetId.localeCompare(right.assetId) ||
      left.assetPath.localeCompare(right.assetPath),
  );
}

type ApplyContext = {
  resultContext?: {
    resolveArtifact?: (args: {
      fieldName: string;
      rawPath: string;
      defaultPath: string;
    }) => Promise<{ text: string }>;
  };
  bundleReader?: {
    readText?: (path: string) => Promise<string> | string;
  };
};

async function readRunWorkspaceText(
  context: ApplyContext | undefined,
  fieldName: string,
  rawPath: string,
) {
  const pathValue = cleanString(rawPath);
  if (!pathValue) {
    throw new Error(`${fieldName} is required`);
  }
  if (typeof context?.resultContext?.resolveArtifact === "function") {
    const artifact = await context.resultContext.resolveArtifact({
      fieldName,
      rawPath: pathValue,
      defaultPath: pathValue,
    });
    return artifact.text;
  }
  if (typeof context?.bundleReader?.readText === "function") {
    return context.bundleReader.readText(pathValue);
  }
  throw new Error(`cannot read run workspace artifact: ${pathValue}`);
}

async function readRunWorkspaceJson(
  context: ApplyContext | undefined,
  fieldName: string,
  rawPath: string,
) {
  return JSON.parse(await readRunWorkspaceText(context, fieldName, rawPath));
}

async function readRunWorkspaceJsonFromCandidates(
  context: ApplyContext | undefined,
  fieldName: string,
  rawPath: string,
  candidatePaths: string[],
) {
  const paths = [
    rawPath,
    ...candidatePaths.filter((entry) => entry && entry !== rawPath),
  ];
  let lastError: unknown;
  for (const pathValue of paths) {
    try {
      return await readRunWorkspaceJson(context, fieldName, pathValue);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`cannot read run workspace artifact: ${rawPath}`);
}

const MANIFEST_SIDECAR_KEYS = {
  topic_interest_metadata: "result/sidecars/topic-interest-metadata.json",
  concept_cards_proposal: "result/sidecars/concept-cards-proposal.json",
  topic_graph_relation_proposals:
    "result/sidecars/topic-graph-relation-proposals.json",
  prospective_topic_relation_proposals:
    "result/sidecars/prospective-topic-relation-proposals.json",
} as const;

function manifestSidecarPath(
  manifest: Record<string, unknown>,
  key: keyof typeof MANIFEST_SIDECAR_KEYS,
) {
  const sidecars = isObject(manifest.sidecars)
    ? (manifest.sidecars as Record<string, unknown>)
    : {};
  const entry = isObject(sidecars[key]) ? sidecars[key] : undefined;
  return cleanString(entry?.path);
}

function sidecarPathForApply(args: {
  manifest: Record<string, unknown>;
  key: keyof typeof MANIFEST_SIDECAR_KEYS;
}) {
  return (
    manifestSidecarPath(args.manifest, args.key) ||
    MANIFEST_SIDECAR_KEYS[args.key]
  );
}

function topicManifestValidationMessage(args: {
  bundle: SynthesisResultBundle;
  errors: string[];
}) {
  const artifactMetadata = isObject(args.bundle.artifact_metadata)
    ? args.bundle.artifact_metadata
    : {};
  const runtime = cleanString(artifactMetadata.runtime);
  const prefix =
    runtime === "split-skill"
      ? "invalid split topic analysis manifest: split finalize must produce the complete host-apply-ready section set"
      : "invalid topic analysis manifest";
  return `${prefix}: ${args.errors.join("; ")}`;
}

function fallbackSectionsFromBundle(bundle: SynthesisResultBundle) {
  const definition = isObject(bundle.topic_definition)
    ? bundle.topic_definition
    : {};
  const title =
    cleanString(definition.title) ||
    cleanString(definition.id) ||
    "Topic Synthesis";
  const sourcePapers = Array.isArray((bundle.resolved_paper_set as any)?.papers)
    ? (bundle.resolved_paper_set as any).papers
        .map((paper: unknown) => (isObject(paper) ? paper : {}))
        .map((paper: Record<string, unknown>) => {
          const paperRef = cleanString(paper.paper_ref);
          return {
            paper_ref: paperRef,
            item_key:
              cleanString(paper.item_key) || paperRef.split(":").pop() || "",
            title: cleanString(paper.title) || paperRef,
            year: cleanString(paper.year),
            summary:
              cleanString(paper.summary) ||
              `${paperRef} belongs to this topic source set.`,
            synthesis_role: "source",
            quality: "unknown",
            digest_ref: {
              paper_ref: paperRef,
              payload_type: "digest-markdown",
            },
          };
        })
        .filter((paper: Record<string, unknown>) =>
          cleanString(paper.paper_ref),
        )
    : [];
  const sourceRefs = sourcePapers.map((paper: any) => paper.paper_ref);
  const markdown = cleanString(bundle.markdown);
  const summaryText =
    markdown.split(/\n\s*\n+/).find((block) => !block.startsWith("#")) ||
    `Structured synthesis for ${title}.`;
  return {
    topic: {
      ...definition,
      id: cleanString(definition.id),
      title,
      definition: cleanString(definition.definition) || title,
      discipline: cleanString(definition.discipline) || "unknown",
      research_field: cleanString(definition.research_field) || "unknown",
      scope_boundary: isObject(definition.scope_boundary)
        ? definition.scope_boundary
        : { include: [title], exclude: [] },
    },
    summary: {
      brief: summaryText,
      summary: summaryText,
      key_takeaways: [summaryText],
    },
    taxonomy: {
      primary_axis: "source_paper_route",
      summary: {
        text: `The topic is organized around ${sourcePapers.length} source papers.`,
      },
      nodes: [
        {
          id: "route:source-set",
          title: "Source paper route",
          definition:
            "Topic route represented by the resolved source paper set.",
          core_problem: "Organize the current topic evidence boundary.",
          mechanism: "Use source papers as the structured topic basis.",
          source_paper_refs: sourceRefs,
          strengths: ["Grounded in source papers."],
          limitations: ["Requires richer stage payloads for deeper synthesis."],
          maturity: "unknown",
        },
      ],
    },
    improvement_dimensions: {
      summary: {
        text: "Improvement dimensions are summarized from the source paper set.",
      },
      dimensions: [
        {
          id: "dimension:source-set",
          title: "Source paper coverage",
          analysis:
            "The current source set defines the available comparison basis.",
          source_paper_refs: sourceRefs,
        },
      ],
    },
    claims: [
      {
        id: "claim:source-set",
        text: "The topic artifact is grounded in its source paper set.",
        analysis:
          "The resolved source papers provide the current topic boundary.",
        scope: "Current topic source set.",
        limitations: [
          "Detailed claim strength depends on available synthesis sections.",
        ],
        source_paper_refs: sourceRefs,
      },
    ],
    timeline_events: {
      summary: {
        text:
          cleanString(bundle.timeline) ||
          "Timeline derives from the source paper set.",
      },
      events: [
        {
          id: "event:source-set",
          label: "Source set available",
          description:
            cleanString(bundle.timeline) ||
            "The source paper set is available for synthesis.",
          phase: "source_set",
          source_paper_refs: sourceRefs,
        },
      ],
    },
    source_papers: sourcePapers,
    debates: [
      {
        id: "debate:source-boundary",
        title: "Source boundary",
        current_judgment:
          "Interpretation depends on the resolved source paper set.",
        source_paper_refs: sourceRefs,
      },
    ],
    coverage: {
      paper_count: sourcePapers.length,
      external_literature_count: 0,
      coverage_verdict: "unknown",
      coverage_reason: "Coverage follows the source paper boundary.",
      coverage_caveats: [],
      external_context_summary:
        "External literature coverage follows the source paper boundary.",
      suggested_collection_directions: [],
    },
    future_directions: [
      {
        id: "future:source-boundary",
        title: "Improve the source-paper-grounded synthesis boundary",
        direction_type: "data_or_benchmark_need",
        current_limitation:
          "The current fallback artifact only has the resolved source paper set as its evidence boundary.",
        future_direction:
          "A richer synthesis run should add source-supported route, claim, and coverage evidence before drawing stronger research conclusions.",
        rationale:
          "The available source papers define the current topic boundary but do not yet provide deeper structured analysis.",
        source_paper_refs: sourceRefs,
      },
    ],
    review_outline: {
      topic_importance:
        "The topic has a resolved source paper set that can support a compact review strategy.",
      writing_strategies: [
        {
          id: "strategy:source-set",
          title: "Source-set grounded review",
          review_thesis:
            "Use the resolved source papers to frame the topic boundary and evidence-backed claims.",
          writing_strategy:
            "Start from the topic definition, organize the source paper set into routes and claims, then separate coverage limitations from supported findings.",
          section_plan: [
            "Define the topic from the source paper set",
            "Organize evidence-backed routes and claims",
            "Summarize coverage limitations",
          ],
          best_for: "A compact review based on the current source set.",
          risks:
            "Do not generalize beyond the current source paper evidence boundary.",
          source_paper_refs: sourceRefs,
        },
      ],
      recommended_strategy_id: "strategy:source-set",
    },
    statistics: {
      paper_count: sourcePapers.length,
      time_span: { start_year: "unknown", end_year: "unknown" },
      route_coverage: { routes: 1 },
      coverage_verdict: "unknown",
    },
    synthesis_report: {
      title,
      source_section_chapters: {
        research_routes: "taxonomy.summary",
        historical_progression: "timeline_events.summary",
      },
      body: [
        summaryText,
        `The topic source set contains ${sourcePapers.length} papers and provides the current boundary for taxonomy, claims, timeline, coverage, and review outline.`,
        "The source papers are treated as the canonical literature table for this topic artifact. Topic routes, claims, timeline events, coverage notes, and review outline entries refer back to that table through source_paper_refs so the detail page can render paper chips and digest entry points without a separate internal mapping layer.",
        "This storage representation is intentionally compact but still preserves the user-facing topic contract: it has a topic definition, a source-paper grounded route, a claim, a timeline event, coverage metadata, and a synthesis report body. Richer analysis can be generated by the split workflow, but the persisted artifact already follows the current source paper contract.",
      ].join("\n\n"),
    },
    source_artifacts: [],
    diagnostics: {},
  };
}

async function loadCompleteManifestAndSections(args: {
  bundle: SynthesisResultBundle;
  context?: ApplyContext;
}) {
  if (!args.context) {
    const sections = fallbackSectionsFromBundle(args.bundle);
    return {
      manifest: {
        schema_id: "synthesis.topic_analysis_manifest",
        schema_version: "3.0.0",
        operation:
          args.bundle.operation ||
          (args.bundle.mode === "create" ? "create" : "update_full"),
        topic_id: topicIdFromBundle(args.bundle),
        language: args.bundle.language || "auto",
        sections: Object.fromEntries(
          Object.keys(sections).map((section) => [
            section,
            {
              path: `result/sections/${canonicalSectionFileName(section)}`,
              content_type: "json",
            },
          ]),
        ),
        sidecars: {
          topic_interest_metadata: {
            path: "result/sidecars/topic-interest-metadata.json",
            content_type: "json",
            schema_id: "synthesis.topic_interest_metadata",
          },
          concept_cards_proposal: {
            path: "result/sidecars/concept-cards-proposal.json",
            content_type: "json",
            schema_id: "synthesis.concept_cards_proposal",
          },
          topic_graph_relation_proposals: {
            path: "result/sidecars/topic-graph-relation-proposals.json",
            content_type: "json",
            schema_id: "synthesis.topic_graph_relation_proposals",
          },
          prospective_topic_relation_proposals: {
            path: "result/sidecars/prospective-topic-relation-proposals.json",
            content_type: "json",
            schema_id: "synthesis.prospective_topic_relation_proposals",
          },
        },
      },
      sections,
    };
  }
  const manifest = await readRunWorkspaceJson(
    args.context,
    "analysis_manifest_path",
    args.bundle.analysis_manifest_path || "",
  );
  const validation = validateTopicAnalysisManifest(manifest);
  if (!validation.ok) {
    throw new Error(
      topicManifestValidationMessage({
        bundle: args.bundle,
        errors: validation.errors,
      }),
    );
  }
  const manifestSections = isObject(manifest.sections)
    ? (manifest.sections as Record<string, unknown>)
    : {};
  const sections: Record<string, unknown> = {};
  for (const [section, entry] of Object.entries(manifestSections)) {
    if (!isObject(entry)) {
      continue;
    }
    sections[section] = await readRunWorkspaceJson(
      args.context,
      `sections.${section}.path`,
      cleanString(entry.path),
    );
  }
  return { manifest, sections };
}

async function loadResolverManifest(args: {
  bundle: SynthesisResultBundle;
  context?: ApplyContext;
}) {
  if (args.bundle.resolver_manifest_path) {
    const manifest = await readRunWorkspaceJson(
      args.context,
      "resolver_manifest_path",
      args.bundle.resolver_manifest_path,
    );
    if (!isObject(manifest)) {
      throw new Error("resolver_manifest_path must reference a JSON object");
    }
    const resolved = isObject(manifest.resolved_paper_set)
      ? manifest.resolved_paper_set
      : isObject(manifest.resolution_result)
        ? {
            papers: Array.isArray((manifest.resolution_result as any).papers)
              ? (manifest.resolution_result as any).papers
              : [],
          }
        : {};
    if (!Array.isArray((resolved as any).papers)) {
      throw new Error(
        "resolver_manifest_path JSON must contain resolved_paper_set.papers or resolution_result.papers",
      );
    }
    const resolver = isObject(manifest.resolver)
      ? manifest.resolver
      : isObject(manifest.topic_resolver)
        ? manifest.topic_resolver
        : {};
    return {
      topicResolver: resolver,
      resolvedPaperSet: resolved,
      resolverDiagnostics: isObject(manifest.resolver_diagnostics)
        ? manifest.resolver_diagnostics
        : isObject(manifest.resolution_result) &&
            isObject((manifest.resolution_result as any).diagnostics)
          ? (manifest.resolution_result as any).diagnostics
          : args.bundle.resolver_diagnostics || {},
    };
  }
  if (args.bundle.topic_resolver && args.bundle.resolved_paper_set) {
    return {
      topicResolver: args.bundle.topic_resolver,
      resolvedPaperSet: args.bundle.resolved_paper_set,
      resolverDiagnostics: args.bundle.resolver_diagnostics || {},
    };
  }
  throw new Error("synthesis result bundle requires resolver_manifest_path");
}

async function loadPatchManifestAndChangedSections(args: {
  bundle: SynthesisResultBundle;
  context?: ApplyContext;
}) {
  if (!args.context) {
    return {
      patchManifest: {
        schema_id: "synthesis.topic_section_patch_manifest",
        schema_version: "2.0.0",
        operation: "update_patch",
        language: args.bundle.language || "auto",
        base: {
          current_manifest_hash: "",
          current_artifact_hash: "",
          read_section_hashes: args.bundle.read_section_hashes || {},
          replace_section_hashes: args.bundle.read_section_hashes || {},
        },
        patch: {
          mode: "section_replace",
          changed_sections: Object.keys(args.bundle.read_section_hashes || {}),
          unchanged_section_policy: "inherit_current",
          sections: {},
        },
        diagnostics: { requires_full_update: false },
      },
      changedSections: {},
    };
  }
  const patchManifest = await readRunWorkspaceJson(
    args.context,
    "analysis_manifest_path",
    args.bundle.analysis_manifest_path || "",
  );
  const validation = validateTopicAnalysisManifest(patchManifest);
  if (!validation.ok) {
    throw new Error(
      `invalid topic section patch manifest: ${validation.errors.join("; ")}`,
    );
  }
  const changedSections: Record<string, unknown> = {};
  const sections =
    isObject(patchManifest.patch) && isObject(patchManifest.patch.sections)
      ? (patchManifest.patch.sections as Record<string, unknown>)
      : {};
  for (const [section, entry] of Object.entries(sections)) {
    if (!isObject(entry)) {
      continue;
    }
    changedSections[section] = await readRunWorkspaceJson(
      args.context,
      `patch.sections.${section}.path`,
      cleanString(entry.path),
    );
  }
  return { patchManifest, changedSections };
}

async function writeV2Current(args: {
  paths: ReturnType<typeof buildSynthesisStoragePaths>;
  manifest: Record<string, unknown>;
  sections: Record<string, unknown>;
  artifact: Record<string, unknown>;
  metadata: TopicArtifactMetadata;
}) {
  await ensureRuntimeDirectory(args.paths.currentRoot);
  await ensureRuntimeDirectory(args.paths.currentSectionsRoot);
  for (const [section, value] of Object.entries(args.sections)) {
    await writeRuntimeTextFile(
      joinPath(
        args.paths.currentSectionsRoot,
        canonicalSectionFileName(section),
      ),
      canonicalJsonText(value),
    );
  }
  await writeRuntimeTextFile(
    args.paths.currentArtifact,
    canonicalJsonText(args.artifact),
  );
  await writeRuntimeTextFile(
    args.paths.currentManifest,
    canonicalJsonText(args.manifest),
  );
  await writeJson(
    args.paths.currentMetadata,
    createCanonicalEnvelope({
      schemaId: "synthesis.topic_artifact_metadata",
      data: args.metadata,
      now: args.metadata.updated_at,
    }),
  );
}

function paperCountFromArtifact(artifact: Record<string, unknown>) {
  return Array.isArray(artifact.source_papers)
    ? artifact.source_papers.length
    : 0;
}

function externalLiteratureCountFromArtifact(
  artifact: Record<string, unknown>,
) {
  void artifact;
  return 0;
}

function normalizeShortStringArray(value: unknown, limit: number) {
  const source =
    typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const entry of source) {
    const text = cleanString(entry);
    const key = text.toLowerCase();
    if (text && !seen.has(key)) {
      seen.add(key);
      result.push(text);
    }
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

function normalizeTopicInterestMetadataRecord(args: {
  payload: unknown;
  topicId: string;
  sourceArtifactHash: string;
  updatedAt: string;
}): SynthesisTopicInterestMetadataRecord {
  if (!isObject(args.payload)) {
    throw new Error(
      "topic_interest_metadata_path must reference a JSON object",
    );
  }
  const topicId = cleanString(args.payload.topic_id) || args.topicId;
  if (!topicId) {
    throw new Error("topic interest metadata requires topic_id");
  }
  const schemaId =
    cleanString(args.payload.schema) ||
    cleanString(args.payload.schema_id) ||
    "topic_interest_metadata.v1";
  const normalized = {
    schema: schemaId,
    topic_id: topicId,
    include_terms: normalizeShortStringArray(args.payload.include_terms, 16),
    must_have_terms: normalizeShortStringArray(args.payload.must_have_terms, 6),
    methods: normalizeShortStringArray(args.payload.methods, 8),
    exclude_terms: normalizeShortStringArray(args.payload.exclude_terms, 8),
    seed_literature_item_ids: normalizeShortStringArray(
      args.payload.seed_literature_item_ids,
      50,
    ),
  };
  const diagnostics = normalizeShortStringArray(args.payload.diagnostics, 20);
  return {
    topicId,
    schemaId,
    includeTermsJson: JSON.stringify(normalized.include_terms),
    mustHaveTermsJson: JSON.stringify(normalized.must_have_terms),
    methodsJson: JSON.stringify(normalized.methods),
    excludeTermsJson: JSON.stringify(normalized.exclude_terms),
    seedLiteratureItemIdsJson: JSON.stringify(
      normalized.seed_literature_item_ids,
    ),
    sourceArtifactHash: args.sourceArtifactHash,
    metadataHash: hashCanonicalJson(normalized),
    diagnosticsJson: JSON.stringify(diagnostics),
    updatedAt: args.updatedAt,
  };
}

export function createSynthesisService(options: SynthesisServiceOptions) {
  const libraryId = normalizeLibraryId(options.libraryId);
  if (!libraryId) {
    throw new Error("Synthesis service requires a positive libraryId");
  }
  const root = cleanString(options.root);
  if (!root) {
    throw new Error("Synthesis service requires a storage root");
  }
  const lock = options.writeLock || defaultLock;
  const now = options.now || nowIso;
  const runtimeRoot = cleanString(options.runtimeRoot) || root;
  const synthesisRepository =
    options.synthesisRepository ||
    createSynthesisRepository({
      runtimeRoot,
      now,
    });
  const tagVocabulary = createSynthesisTagVocabularyService({
    root,
    now,
    repository: synthesisRepository,
  });
  const conceptKb = createSynthesisConceptKbService({
    root,
    now,
    repository: synthesisRepository,
  });
  const topicGraph = createSynthesisTopicGraphService({
    root,
    now,
    repository: synthesisRepository,
  });
  const jsonImport = createSynthesisJsonImportService({
    root,
    now,
    repository: synthesisRepository,
  });
  const checkpointExport = createSynthesisCheckpointExportService({
    root,
    now,
    repository: synthesisRepository,
  });
  let tagImportPreviewState:
    | {
        payload_hash: string;
        preview: Awaited<ReturnType<typeof tagVocabulary.previewImport>>;
      }
    | undefined;
  const prefsGitSyncConfig = getSynthesisGitSyncPrefsConfig();
  const gitSync = createSynthesisGitSyncService({
    root,
    now,
    adapter:
      options.gitSyncAdapter ||
      createPrefsConfiguredSynthesisGitSyncAdapter({
        commandRunner: options.gitSyncCommandRunner,
      }),
    debounceMs: options.gitSyncDebounceMs,
    retryDelaysMs: options.gitSyncRetryDelaysMs,
    autoRetryEnabled:
      options.gitSyncAutoRetryEnabled ?? prefsGitSyncConfig.autoRetryEnabled,
    progressReporter: (report) => {
      reportSynthesisJobProgress(report);
    },
  });
  const canonicalMaintenanceGitSyncDebounceMs = Math.max(
    0,
    Math.floor(Number(options.gitSyncDebounceMs ?? 5000)),
  );
  let activeCanonicalMaintenanceWorkers = 0;
  let activeCanonicalMaintenanceWorkerKinds: string[] = [];
  let canonicalMaintenanceEpoch = 0;
  let pendingCanonicalMaintenanceSync = false;
  let canonicalMaintenanceSyncTimer: ReturnType<typeof setTimeout> | undefined;
  let referenceSidecarRefreshRunning = false;
  let advancedReferenceMatchingRunning = false;
  const readHints: SynthesisReadHint[] = [];

  async function refreshTopicDiscoveryState(args: {
    topicIds: string[];
    timestamp: string;
  }) {
    const topicIds = sortedUniqueStrings(args.topicIds);
    if (!topicIds.length) {
      return;
    }
    const previous = await readArtifactStateRows(root);
    let changed = false;
    for (const topicId of topicIds) {
      const summary = topicDiscoverySummaryFromHints(
        synthesisRepository.listTopicDiscoveryHints({
          topicIds: [topicId],
        }),
      );
      const existing = previous[topicId];
      if (
        existing?.discovery_status === summary.discovery_status &&
        existing?.candidate_count === summary.candidate_count
      ) {
        continue;
      }
      previous[topicId] = {
        topic_id: topicId,
        freshness: existing?.freshness || "unknown",
        known_dependency_status:
          existing?.known_dependency_status || existing?.freshness || "unknown",
        discovery_status: summary.discovery_status,
        candidate_count: summary.candidate_count,
        coverage: existing?.coverage || "missing",
        baseline_input_hash: existing?.baseline_input_hash || "",
        current_input_hash: existing?.current_input_hash || "",
        baseline_dependencies: existing?.baseline_dependencies || null,
        current_dependencies: existing?.current_dependencies || null,
        reasons: existing?.reasons || [],
        last_scanned_at: existing?.last_scanned_at || args.timestamp,
        baseline_initialized_at: existing?.baseline_initialized_at,
        updated_at: existing?.updated_at,
      };
      changed = true;
    }
    if (changed) {
      await writeArtifactStateRows(root, previous, args.timestamp);
    }
  }

  function recordReadHint(args: {
    code: SynthesisReadHint["code"];
    scope: SynthesisReadHint["scope"];
  }) {
    const hint: SynthesisReadHint = {
      code: args.code,
      scope: args.scope,
      created_at: now(),
    };
    readHints.push(hint);
    if (readHints.length > 100) {
      readHints.splice(0, readHints.length - 100);
    }
    return hint;
  }

  function sanitizeReferenceSidecarMessage(value: unknown) {
    return String(value || "")
      .replace(
        new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        "path:",
      )
      .replace(/token[=:][^"\s,;\\]+/gi, "token=[redacted]")
      .replace(
        /authorization:\s*bearer\s+[^"\s,;\\]+/gi,
        "Authorization: Bearer [redacted]",
      );
  }

  function referenceSidecarDiagnostic(args: {
    code: string;
    severity?: "info" | "warning" | "error";
    message: unknown;
  }): SynthesisReferenceSidecarDiagnostic {
    return {
      code: cleanString(args.code),
      severity: args.severity || "warning",
      message: sanitizeReferenceSidecarMessage(args.message),
    };
  }

  function parseReferenceSidecarDiagnostics(
    value: unknown,
  ): SynthesisReferenceSidecarDiagnostic[] {
    try {
      const parsed =
        typeof value === "string" && value.trim()
          ? JSON.parse(value)
          : Array.isArray(value)
            ? value
            : [];
      return normalizeArray(parsed)
        .filter(isObject)
        .map((entry) =>
          referenceSidecarDiagnostic({
            code: cleanString(entry.code) || "operation_failed",
            severity:
              entry.severity === "info" ||
              entry.severity === "warning" ||
              entry.severity === "error"
                ? entry.severity
                : "error",
            message: entry.message || entry.code || "Operation failed.",
          }),
        );
    } catch {
      return [];
    }
  }

  function referenceSidecarAllowedActions(
    state: SynthesisReferenceSidecarCacheStatus,
  ) {
    if (state.status === "refreshing") {
      return [];
    }
    if (state.status === "failed") {
      return ["retryReferenceSidecarRefresh", "refreshReferenceSidecarNow"];
    }
    return ["refreshReferenceSidecarNow"];
  }

  function defaultReferenceSidecarCacheStatus(args: {
    status: SynthesisCacheReadinessStatus;
    sourceHash: string;
    basisHash?: string;
    refreshedAt?: string;
    diagnostics?: SynthesisReferenceSidecarDiagnostic[];
  }): SynthesisReferenceSidecarCacheStatus {
    const state: SynthesisReferenceSidecarCacheStatus = {
      schema_id: "synthesis.reference_sidecar_cache_status",
      schema_version: "1.0.0",
      cache_key: "reference-sidecar:library",
      status: args.status,
      source_hash: args.sourceHash,
      basis_hash: args.basisHash,
      refreshed_at: args.refreshedAt,
      diagnostics: args.diagnostics || [],
      updated_at: now(),
      allowed_actions: [],
    };
    state.allowed_actions = referenceSidecarAllowedActions(state);
    return state;
  }

  async function literatureSource() {
    const registryInputs = await registryInputsForService(options);
    const citationGraphPapers = await graphInputsForService(options);
    return {
      registryInputs,
      citationGraphPapers,
      sourceHash: hashCanonicalJson({ registryInputs, citationGraphPapers }),
    };
  }

  function clearCanonicalMaintenanceSyncTimer() {
    if (canonicalMaintenanceSyncTimer) {
      clearTimeout(canonicalMaintenanceSyncTimer);
      canonicalMaintenanceSyncTimer = undefined;
    }
  }

  function canonicalMaintenanceStatus() {
    return {
      active_worker_count: activeCanonicalMaintenanceWorkers,
      active_worker_kind: activeCanonicalMaintenanceWorkerKinds[0],
      active_worker_kinds: [...activeCanonicalMaintenanceWorkerKinds],
      pending_sync: pendingCanonicalMaintenanceSync,
      epoch: canonicalMaintenanceEpoch,
    };
  }

  function scheduleCanonicalMaintenanceGitSync() {
    if (
      !pendingCanonicalMaintenanceSync ||
      activeCanonicalMaintenanceWorkers > 0
    ) {
      return;
    }
    clearCanonicalMaintenanceSyncTimer();
    canonicalMaintenanceSyncTimer = setTimeout(() => {
      canonicalMaintenanceSyncTimer = undefined;
      if (activeCanonicalMaintenanceWorkers > 0) {
        scheduleCanonicalMaintenanceGitSync();
        return;
      }
      pendingCanonicalMaintenanceSync = false;
      void notifyGitSyncAfterCanonicalWrite();
    }, canonicalMaintenanceGitSyncDebounceMs);
  }

  function beginCanonicalMaintenanceWorker(kind: string) {
    activeCanonicalMaintenanceWorkers += 1;
    activeCanonicalMaintenanceWorkerKinds = [
      ...activeCanonicalMaintenanceWorkerKinds,
      kind,
    ];
    let mutated = false;
    return {
      markCanonicalMutation() {
        mutated = true;
        pendingCanonicalMaintenanceSync = true;
        canonicalMaintenanceEpoch += 1;
      },
      finish() {
        activeCanonicalMaintenanceWorkers = Math.max(
          0,
          activeCanonicalMaintenanceWorkers - 1,
        );
        const kindIndex = activeCanonicalMaintenanceWorkerKinds.indexOf(kind);
        if (kindIndex >= 0) {
          activeCanonicalMaintenanceWorkerKinds = [
            ...activeCanonicalMaintenanceWorkerKinds.slice(0, kindIndex),
            ...activeCanonicalMaintenanceWorkerKinds.slice(kindIndex + 1),
          ];
        }
        if (mutated && activeCanonicalMaintenanceWorkers === 0) {
          scheduleCanonicalMaintenanceGitSync();
        }
      },
      kind,
    };
  }

  function ageMsSince(timestamp: unknown) {
    const parsed = Date.parse(cleanString(timestamp));
    const base = Date.parse(now());
    if (!Number.isFinite(parsed) || !Number.isFinite(base) || base < parsed) {
      return undefined;
    }
    return base - parsed;
  }

  function maintenanceRecommendedCommands(args: {
    missing: string[];
    stale: string[];
    failed: string[];
  }) {
    const commands = new Set<string>();
    if (
      args.missing.includes("reference-sidecar:library") ||
      args.stale.includes("reference-sidecar:library")
    ) {
      commands.add("refreshReferenceSidecarNow");
    }
    if (
      args.missing.includes("citation-graph:library") ||
      args.stale.includes("citation-graph:library")
    ) {
      commands.add("rebuildCitationGraphCacheNow");
    }
    if (args.failed.includes("reference-sidecar:library")) {
      commands.add("retryReferenceSidecarRefresh");
    }
    if (args.failed.includes("citation-graph:library")) {
      commands.add("retryCitationGraphCacheRebuild");
    }
    return [...commands].sort((left, right) => left.localeCompare(right));
  }

  function jobProgressStatusToBackgroundStatus(
    status: unknown,
  ): SynthesisUiBackgroundJobRow["status"] {
    const normalized = cleanString(status);
    if (normalized === "running") {
      return "running";
    }
    if (normalized === "queued") {
      return "queued";
    }
    if (normalized === "waiting") {
      return "waiting";
    }
    if (normalized === "failed_retryable" || normalized === "failed_terminal") {
      return "failed";
    }
    return "queued";
  }

  function jobProgressSource(
    source: unknown,
  ): SynthesisUiBackgroundJobRow["source"] {
    const normalized = cleanString(source);
    if (
      normalized === "operation" ||
      normalized === "reference_sidecar_refresh" ||
      normalized === "citation_graph_cache_rebuild" ||
      normalized === "citation_graph_layout" ||
      normalized === "git_sync" ||
      normalized === "canonical_maintenance"
    ) {
      return normalized;
    }
    return "operation";
  }

  function backgroundJobFromProgress(
    row: SynthesisJobProgressRecord,
  ): SynthesisUiBackgroundJobRow | null {
    const jobName = cleanString(row.jobName);
    if (!jobName) {
      return null;
    }
    const total = Math.max(0, Math.floor(Number(row.totalCount) || 0));
    const current = Math.min(
      total,
      Math.max(0, Math.floor(Number(row.processedCount) || 0)),
    );
    const progress =
      row.progressMode === "determinate" && total > 0
        ? {
            mode: "determinate" as const,
            current,
            total,
            percent: Math.max(
              0,
              Math.min(100, Math.round((current / total) * 100)),
            ),
            label: cleanString(row.phaseLabel || row.message) || undefined,
          }
        : {
            mode: "indeterminate" as const,
            label: cleanString(row.phaseLabel || row.message) || undefined,
          };
    return {
      job_id: jobName,
      source: jobProgressSource(row.source),
      status: jobProgressStatusToBackgroundStatus(row.status),
      label: cleanString(row.label) || jobName,
      detail:
        cleanString(row.message) ||
        cleanString(row.phaseLabel) ||
        cleanString(row.phase) ||
        undefined,
      updated_at:
        cleanString(row.heartbeatAt) ||
        cleanString(row.updatedAt) ||
        cleanString(row.startedAt),
      progress,
    };
  }

  function operationStatusToBackgroundStatus(
    status: unknown,
  ): SynthesisUiBackgroundJobRow["status"] {
    const normalized = cleanString(status);
    if (normalized === "running") {
      return "running";
    }
    if (normalized === "failed" || normalized === "canceled") {
      return "failed";
    }
    if (normalized === "completed") {
      return "submitted";
    }
    return "queued";
  }

  function backgroundJobFromOperation(
    row: SynthesisOperationRecord,
  ): SynthesisUiBackgroundJobRow | null {
    const operationId = cleanString(row.operationId);
    if (!operationId) {
      return null;
    }
    const total = Math.max(0, Math.floor(Number(row.totalCount) || 0));
    const current = Math.min(
      total,
      Math.max(0, Math.floor(Number(row.processedCount) || 0)),
    );
    const progress =
      row.progressMode === "determinate" && total > 0
        ? {
            mode: "determinate" as const,
            current,
            total,
            percent: Math.max(
              0,
              Math.min(100, Math.round((current / total) * 100)),
            ),
            label: cleanString(row.phaseLabel || row.message) || undefined,
          }
        : {
            mode: "indeterminate" as const,
            label: cleanString(row.phaseLabel || row.message) || undefined,
          };
    return {
      job_id: operationId,
      source: jobProgressSource(row.operationType),
      status: operationStatusToBackgroundStatus(row.status),
      label: cleanString(row.label) || operationId,
      detail:
        cleanString(row.message) ||
        cleanString(row.phaseLabel) ||
        cleanString(row.phase) ||
        undefined,
      updated_at:
        cleanString(row.updatedAt) ||
        cleanString(row.completedAt) ||
        cleanString(row.startedAt) ||
        cleanString(row.createdAt),
      progress,
    };
  }

  function cacheBasisForOperationType(operationType: string) {
    if (operationType === "reference_sidecar_refresh") {
      return synthesisRepository.getCacheBasis("reference-sidecar:library");
    }
    if (
      operationType === "citation_graph_cache_rebuild" ||
      operationType === "citation_graph_cache_incremental_refresh"
    ) {
      return synthesisRepository.getCacheBasis("citation-graph:library");
    }
    return null;
  }

  function isCurrentFailedOperation(row: SynthesisOperationRecord) {
    if (cleanString(row.status) !== "failed") {
      return false;
    }
    const basis = cacheBasisForOperationType(row.operationType);
    if (!basis) {
      return true;
    }
    if (basis.status === "failed") {
      return true;
    }
    const basisUpdatedAt = cleanString(basis.refreshedAt || basis.updatedAt);
    const operationUpdatedAt = cleanString(row.updatedAt || row.completedAt);
    return Boolean(operationUpdatedAt && operationUpdatedAt > basisUpdatedAt);
  }

  function isStaleRunningOperation(row: SynthesisOperationRecord) {
    if (cleanString(row.status) !== "running") {
      return false;
    }
    const updatedAt = Date.parse(
      cleanString(row.updatedAt || row.startedAt || row.createdAt),
    );
    const current = Date.parse(now());
    return (
      Number.isFinite(updatedAt) &&
      Number.isFinite(current) &&
      current - updatedAt > SYNTHESIS_RUNNING_OPERATION_STALE_MS
    );
  }

  function cancelStaleRunningOperation(row: SynthesisOperationRecord) {
    const diagnostic = referenceSidecarDiagnostic({
      code: "synthesis_operation_stale_after_restart",
      severity: "warning",
      message:
        "Operation was left running by a previous Zotero session and is no longer active.",
    });
    synthesisRepository.updateOperationStatus({
      operationId: row.operationId,
      status: "canceled",
      phase: cleanString(row.phase) || "stale",
      phaseLabel: cleanString(row.phaseLabel) || "Stale",
      message: diagnostic.message,
      diagnosticsJson: JSON.stringify([diagnostic]),
    });
  }

  function reconcileRuntimeWorkState(args?: { startup?: boolean }) {
    const canceledOperationIds: string[] = [];
    try {
      for (const row of synthesisRepository.listOperations({
        statuses: ["running"],
        limit: 100,
      })) {
        if (args?.startup || isStaleRunningOperation(row)) {
          cancelStaleRunningOperation(row);
          canceledOperationIds.push(row.operationId);
        }
      }
    } catch {
      // Runtime reconciliation must not block UI snapshots or debug reads.
    }
    return {
      canceledCount: canceledOperationIds.length,
      canceledOperationIds,
    };
  }

  function reconcileSynthesisRuntimeWorkStateOnStartup() {
    return reconcileRuntimeWorkState({ startup: true });
  }

  function activeJobProgressRows() {
    try {
      reconcileRuntimeWorkState();
      const running = synthesisRepository.listOperations({
        statuses: ["running"],
        limit: 50,
      });
      const failed = synthesisRepository
        .listOperations({
          statuses: ["failed"],
          operationTypes: [
            "reference_sidecar_refresh",
            "citation_graph_cache_rebuild",
          ],
          includeCompleted: true,
          limit: 20,
        })
        .filter(isCurrentFailedOperation);
      return [...running, ...failed]
        .sort(
          (left, right) =>
            (right.updatedAt || "").localeCompare(left.updatedAt || "") ||
            left.operationId.localeCompare(right.operationId),
        )
        .map(backgroundJobFromOperation)
        .filter((row): row is SynthesisUiBackgroundJobRow => Boolean(row));
    } catch {
      return [];
    }
  }

  function operationRecordFromProgress(
    record: SynthesisJobProgressRecord & { jobName: string },
    status: NonNullable<SynthesisOperationRecord["status"]>,
  ): SynthesisOperationRecord {
    const operationId =
      cleanString(record.runId) || cleanString(record.jobName);
    const existing = synthesisRepository.getOperation(operationId);
    const timestamp = now();
    const terminal =
      status === "completed" || status === "failed" || status === "canceled";
    return {
      operationId,
      operationType: cleanString(record.source) || "operation",
      libraryId,
      status,
      label: cleanString(record.label) || cleanString(record.jobName),
      phase: cleanString(record.phase),
      phaseLabel: cleanString(record.phaseLabel),
      message: cleanString(record.message),
      progressMode: record.progressMode || "indeterminate",
      processedCount: Math.max(
        0,
        Math.floor(Number(record.processedCount) || 0),
      ),
      skippedCount: Math.max(0, Math.floor(Number(record.skippedCount) || 0)),
      failedCount: Math.max(0, Math.floor(Number(record.failedCount) || 0)),
      totalCount: Math.max(0, Math.floor(Number(record.totalCount) || 0)),
      diagnosticsJson: cleanString(record.diagnosticsJson) || "[]",
      createdAt:
        existing?.createdAt || cleanString(record.startedAt) || timestamp,
      startedAt:
        existing?.startedAt || cleanString(record.startedAt) || timestamp,
      completedAt: terminal
        ? cleanString(record.completedAt) || timestamp
        : cleanString(record.completedAt),
      updatedAt:
        cleanString(record.updatedAt) ||
        cleanString(record.heartbeatAt) ||
        timestamp,
    };
  }

  function reportSynthesisJobProgress(
    record: SynthesisJobProgressRecord & { jobName: string },
  ) {
    try {
      synthesisRepository.upsertOperation(
        operationRecordFromProgress(record, "running"),
      );
    } catch {
      // Progress reporting must not fail the worker it observes.
    }
  }

  function completeSynthesisJobProgress(
    record: SynthesisJobProgressRecord & { jobName: string },
  ) {
    try {
      synthesisRepository.upsertOperation(
        operationRecordFromProgress(record, "completed"),
      );
    } catch {
      // Progress reporting must not fail the worker it observes.
    }
  }

  function failSynthesisJobProgress(
    record: SynthesisJobProgressRecord & { jobName: string },
  ) {
    try {
      synthesisRepository.upsertOperation(
        operationRecordFromProgress(record, "failed"),
      );
    } catch {
      // Progress reporting must not fail the worker it observes.
    }
  }

  function supersedeSynthesisJobProgress(
    record: SynthesisJobProgressRecord & { jobName: string },
  ) {
    try {
      synthesisRepository.upsertOperation(
        operationRecordFromProgress(record, "canceled"),
      );
    } catch {
      // Progress reporting must not fail the worker it observes.
    }
  }

  type ProjectionIndexProgressReport = {
    phase: string;
    phaseLabel: string;
    processedCount: number;
    totalCount: number;
    message?: string;
  };

  type WorkbenchProgressOptions = {
    onProgress?: () => void | Promise<void>;
  };

  async function runProfiledSynthesisPhase<T>(args: {
    profileRun?: SynthesisJobProfileRun;
    phaseName: string;
    run: () => T | Promise<T>;
    counters?: (result: T) => Record<string, unknown>;
  }): Promise<T> {
    const phase = args.profileRun?.phase(args.phaseName);
    try {
      const result = await args.run();
      await phase?.end({
        counters: args.counters ? args.counters(result) : undefined,
      });
      return result;
    } catch (error) {
      await phase?.end({
        diagnostics: [
          {
            code: "synthesis_profile_phase_failed",
            message: errorMessage(error),
          },
        ],
      });
      throw error;
    }
  }

  async function runProjectionIndexRebuildWithProgress<T>(args: {
    jobName: string;
    label: string;
    onProgress?: () => void | Promise<void>;
    run: (
      reportProgress: (
        progress: ProjectionIndexProgressReport,
      ) => Promise<void>,
    ) => Promise<T>;
  }) {
    const runId = `${args.jobName}:${now()}`;
    const profileRun = maybeStartSynthesisJobProfileRun({
      root,
      jobName: args.jobName,
      trigger: "projection_index_rebuild",
    });
    let lastProgress: ProjectionIndexProgressReport = {
      phase: "start",
      phaseLabel: "Start",
      processedCount: 0,
      totalCount: 1,
    };
    const reportProgress = async (progress: ProjectionIndexProgressReport) => {
      lastProgress = progress;
      reportSynthesisJobProgress({
        jobName: args.jobName,
        runId,
        source: "canonical_maintenance",
        label: args.label,
        status: "running",
        phase: progress.phase,
        phaseLabel: progress.phaseLabel,
        processedCount: progress.processedCount,
        totalCount: progress.totalCount,
        progressMode: "determinate",
        message: progress.message,
      });
      await args.onProgress?.();
      await yieldToEventLoop();
    };
    try {
      const result = await runProfiledSynthesisPhase({
        profileRun,
        phaseName: "projection_rebuild",
        run: () => args.run(reportProgress),
        counters: () => ({
          last_phase: lastProgress.phase,
          processed_count: lastProgress.processedCount,
          total_count: lastProgress.totalCount,
        }),
      });
      completeSynthesisJobProgress({
        jobName: args.jobName,
        runId,
        source: "canonical_maintenance",
        label: args.label,
        phase: "complete",
        phaseLabel: "Complete",
        processedCount: lastProgress.totalCount,
        totalCount: lastProgress.totalCount,
        progressMode: "determinate",
        message: `${args.label} completed.`,
      });
      await profileRun.finish({
        status: "completed",
        processedCount: lastProgress.totalCount,
        counters: {
          last_phase: lastProgress.phase,
          total_count: lastProgress.totalCount,
        },
      });
      return result;
    } catch (error) {
      failSynthesisJobProgress({
        jobName: args.jobName,
        runId,
        source: "canonical_maintenance",
        label: args.label,
        phase: lastProgress.phase,
        phaseLabel: lastProgress.phaseLabel,
        processedCount: lastProgress.processedCount,
        totalCount: lastProgress.totalCount,
        progressMode: "determinate",
        message: errorMessage(error),
      });
      await profileRun.finish({
        status: "failed_terminal",
        processedCount: lastProgress.processedCount,
        failedCount: 1,
        counters: {
          last_phase: lastProgress.phase,
          total_count: lastProgress.totalCount,
        },
        diagnostics: [
          {
            code: "projection_index_rebuild_failed",
            message: errorMessage(error),
          },
        ],
      });
      throw error;
    }
  }

  function buildMaintenanceBackgroundJobs(args: {
    jobProgressRows?: SynthesisUiBackgroundJobRow[];
    gitSyncState?: unknown;
  }): SynthesisUiBackgroundJobRow[] {
    return [...(args.jobProgressRows || [])];
  }

  function buildMaintenanceSummary(args: {
    referenceSidecarCache?: SynthesisCacheBasisRecord | null;
    citationGraphCache?: SynthesisCacheBasisRecord | null;
    citationGraphHash?: string;
    citationGraphFound: boolean;
  }): NonNullable<SynthesisUiSnapshotInput["maintenance"]>["summary"] {
    const maintenance = canonicalMaintenanceStatus();
    const missing: string[] = [];
    const stale: string[] = [];
    const failedCaches: string[] = [];
    const partial: string[] = [];
    const diagnostics: Array<{
      code: string;
      severity: "info" | "warning" | "error";
      message: string;
    }> = [];
    const referenceCacheStatus = cleanString(
      args.referenceSidecarCache?.status,
    );
    const citationCacheStatus = cleanString(args.citationGraphCache?.status);
    if (!args.referenceSidecarCache || referenceCacheStatus === "missing") {
      missing.push("reference-sidecar:library");
    }
    if (!args.citationGraphCache || citationCacheStatus === "missing") {
      missing.push("citation-graph:library");
    }
    if (args.citationGraphCache && !args.citationGraphFound) {
      diagnostics.push({
        code: "citation_graph_cache_rows_missing",
        severity: citationCacheStatus === "ready" ? "warning" : "info",
        message:
          "Citation graph cache basis exists, but graph rows are not currently available.",
      });
    }
    if (referenceCacheStatus === "stale") {
      stale.push("reference-sidecar:library");
    }
    if (citationCacheStatus === "stale") {
      stale.push("citation-graph:library");
    }
    if (referenceCacheStatus === "failed") {
      failedCaches.push("reference-sidecar:library");
    }
    if (citationCacheStatus === "failed") {
      failedCaches.push("citation-graph:library");
    }
    if (missing.length === 1) {
      partial.push(missing[0]);
    }
    const running = maintenance.active_worker_count > 0;
    const failed = failedCaches.length > 0;
    const queued = maintenance.pending_sync;
    const status = running
      ? "running"
      : failed
        ? "failed"
        : missing.length > 1
          ? "missing"
          : partial.length
            ? "partial"
            : queued
              ? "queued"
              : stale.length
                ? "stale"
                : "ready";
    if (maintenance.active_worker_kind) {
      diagnostics.push({
        code: "canonical_maintenance_active",
        severity: "info",
        message: `Canonical maintenance worker is active: ${maintenance.active_worker_kind}`,
      });
    }
    if (maintenance.pending_sync) {
      diagnostics.push({
        code: "canonical_maintenance_sync_pending",
        severity: "info",
        message: "Git Sync is waiting for canonical maintenance debounce.",
      });
    }
    const literatureUpdatedAt =
      cleanString(args.referenceSidecarCache?.refreshedAt) ||
      cleanString(args.referenceSidecarCache?.updatedAt);
    const citationUpdatedAt = cleanString(args.citationGraphCache?.refreshedAt);
    return {
      status,
      latestUsable: {
        referenceSidecar: literatureUpdatedAt
          ? {
              updated_at: literatureUpdatedAt,
              age_ms: ageMsSince(literatureUpdatedAt),
            }
          : undefined,
        citationGraph:
          citationUpdatedAt || args.citationGraphHash
            ? {
                updated_at: citationUpdatedAt || undefined,
                age_ms: citationUpdatedAt
                  ? ageMsSince(citationUpdatedAt)
                  : undefined,
                graph_hash: args.citationGraphHash || undefined,
              }
            : undefined,
      },
      pendingDirtyCount: 0,
      activeWorkerCount: maintenance.active_worker_count,
      activeWorkerKind: maintenance.active_worker_kind,
      canonicalSyncPending: maintenance.pending_sync,
      canonicalEpoch: maintenance.epoch,
      lastFailure: undefined,
      stale,
      partial,
      missing,
      recommendedCommands: maintenanceRecommendedCommands({
        missing,
        stale,
        failed: failedCaches,
      }),
      diagnostics,
    };
  }

  function readMaintenanceForDto(recommendedCommands: string[] = []) {
    const maintenance = canonicalMaintenanceStatus();
    return {
      queue_state: "removed",
      pending_dirty_count: 0,
      running_count: synthesisRepository.listOperations({
        statuses: ["running"],
      }).length,
      failed_count: synthesisRepository
        .listOperations({ statuses: ["failed"], includeCompleted: true })
        .filter(isCurrentFailedOperation).length,
      active_worker_count: maintenance.active_worker_count,
      active_worker_kind: maintenance.active_worker_kind,
      canonical_sync_pending: maintenance.pending_sync,
      canonical_epoch: maintenance.epoch,
      last_failure: undefined,
      recommended_commands: Array.from(new Set(recommendedCommands)).sort(
        (left, right) => left.localeCompare(right),
      ),
    };
  }

  async function notifyGitSyncAfterCanonicalWrite() {
    try {
      await gitSync.notifyCanonicalStoreChanged();
    } catch (error) {
      await gitSync
        .recordGitSyncDiagnostic({
          code: "git_sync_autosync_notify_failed",
          severity: "warning",
          message: errorMessage(error),
          details:
            error instanceof Error
              ? { name: error.name, stack: error.stack }
              : error,
        })
        .catch(() => undefined);
    }
  }

  async function runCanonicalWriteWithAutosync<T>(
    operation: () => Promise<T>,
    shouldNotify: (result: T) => boolean = () => true,
  ): Promise<T> {
    const result = await lock.runExclusive(libraryId, operation);
    if (shouldNotify(result)) {
      await notifyGitSyncAfterCanonicalWrite();
    }
    return result;
  }

  async function peekReferenceSidecarCacheStatus() {
    const sidecarBasis = synthesisRepository.getCacheBasis(
      "reference-sidecar:library",
    );
    const sourceHash = cleanString(sidecarBasis?.sourceHash);
    const basisStatus = cleanString(sidecarBasis?.status);
    const status: SynthesisCacheReadinessStatus =
      basisStatus === "ready" ||
      basisStatus === "stale" ||
      basisStatus === "refreshing" ||
      basisStatus === "failed"
        ? basisStatus
        : "missing";
    const state = defaultReferenceSidecarCacheStatus({
      status,
      sourceHash,
      basisHash: sidecarBasis
        ? hashCanonicalJson({
            cache_key: sidecarBasis.cacheKey,
            source_hash: sidecarBasis.sourceHash,
            status: sidecarBasis.status,
          })
        : undefined,
      refreshedAt: cleanString(sidecarBasis?.refreshedAt) || undefined,
      diagnostics:
        status === "failed"
          ? parseReferenceSidecarDiagnostics(sidecarBasis?.diagnosticsJson)
          : [],
    });
    return {
      ...state,
      updated_at: cleanString(sidecarBasis?.updatedAt) || now(),
      allowed_actions: referenceSidecarAllowedActions(state),
    };
  }

  async function loadReferenceSidecarCacheStatus() {
    return peekReferenceSidecarCacheStatus();
  }

  function activeCitationBindings(
    literatureItemIds: string[],
  ): Map<string, CitationGraphZoteroBinding> {
    return new Map(
      literatureItemIds
        .map((literatureItemId) => {
          const parsed = parsePaperRef(literatureItemId);
          return parsed?.itemKey
            ? ([
                literatureItemId,
                {
                  literatureItemId,
                  libraryId: parsed.libraryId,
                  itemKey: parsed.itemKey,
                },
              ] as const)
            : null;
        })
        .filter(
          (entry): entry is readonly [string, CitationGraphZoteroBinding] =>
            Boolean(entry),
        ),
    );
  }

  function citationGraphNodeIdMap(nodes: SynthesisCitationNodeRecord[]) {
    const bindings = activeCitationBindings(
      nodes.map((node) => node.literatureItemId),
    );
    return new Map(
      nodes.map(
        (node) =>
          [
            node.literatureItemId,
            citationGraphNodeIdFromDb(
              node,
              bindings.get(node.literatureItemId),
            ),
          ] as const,
      ),
    );
  }

  function citationGraphLiteratureItemIdFromNodeId(nodeId: string) {
    const normalized = cleanString(nodeId);
    if (!normalized) {
      return "";
    }
    if (normalized.startsWith("lit:")) {
      return normalized;
    }
    const zoteroPrefix = "zotero:item:";
    if (normalized.startsWith(zoteroPrefix)) {
      const itemKey = normalized.slice(zoteroPrefix.length);
      return itemKey ? `${libraryId}:${itemKey}` : "";
    }
    return normalized;
  }

  function dbRowsToCitationGraph(args: {
    nodes: SynthesisCitationNodeRecord[];
    edges: SynthesisCitationEdgeRecord[];
    metrics?: SynthesisCitationLightMetricsRecord[];
    graphHash?: string;
    diagnostics?: Record<string, unknown>;
    nodeDisplay?: Map<
      string,
      {
        externalDegree?: number;
        visibility?: "default" | "hover_only";
        displayTier?: "library" | "shared_external" | "single_external";
      }
    >;
    edgeVisibility?: Map<string, "default" | "hover_only">;
  }): CitationGraph {
    const bindings = activeCitationBindings(
      args.nodes.map((node) => node.literatureItemId),
    );
    const metricsByItem = new Map(
      (args.metrics || []).map((metric) => [metric.literatureItemId, metric]),
    );
    const nodeIdByLiteratureItem = new Map<string, string>();
    const nodes = args.nodes.map((node) => {
      const binding = bindings.get(node.literatureItemId);
      const graphNode = dbCitationNodeToGraphNode({
        node,
        binding,
        metrics: metricsByItem.get(node.literatureItemId),
        display: args.nodeDisplay?.get(node.literatureItemId),
      });
      nodeIdByLiteratureItem.set(node.literatureItemId, graphNode.node_id);
      return graphNode;
    });
    const edges = args.edges
      .filter((edge) => edge.edgeStatus !== "ignored")
      .map((edge) => {
        const sourceNodeId = nodeIdByLiteratureItem.get(
          edge.sourceLiteratureItemId,
        );
        const targetNodeId = edge.targetLiteratureItemId
          ? nodeIdByLiteratureItem.get(edge.targetLiteratureItemId)
          : undefined;
        return sourceNodeId && targetNodeId
          ? dbCitationEdgeToGraphEdge({
              edge,
              sourceNodeId,
              targetNodeId,
              visibility: args.edgeVisibility?.get(edge.edgeId),
            })
          : null;
      })
      .filter((edge): edge is CitationGraphEdge => Boolean(edge));
    const nodeCounts = {
      library_paper: nodes.filter((node) => node.kind === "library_paper")
        .length,
      external_reference: nodes.filter(
        (node) => node.kind === "external_reference",
      ).length,
      unresolved_reference: nodes.filter(
        (node) => node.kind === "unresolved_reference",
      ).length,
    };
    const graphHash =
      args.graphHash ||
      dbCitationGraphHash({
        nodes: args.nodes,
        edges: args.edges,
        metrics: args.metrics,
      });
    return {
      ...emptyCitationGraph({
        graphHash,
        diagnostics: {
          storage: "sqlite",
          bounded: true,
          node_counts: nodeCounts,
          reference_stats: {
            total: args.edges.length,
            promoted: edges.length,
            external: nodeCounts.external_reference,
            unresolved: args.edges.filter(
              (edge) => !edge.targetLiteratureItemId,
            ).length,
            dropped_empty: 0,
            merged_external_nodes: 0,
            merged_unresolved_nodes: 0,
          },
          ...(args.diagnostics || {}),
        },
      }),
      nodes,
      edges,
    };
  }

  function readDbCitationGraphOverview() {
    const activeNodes = synthesisRepository.listCitationNodes({
      statuses: ["active"],
    });
    const nodeById = new Map(
      activeNodes.map((node) => [node.literatureItemId, node]),
    );
    const libraryNodes = activeNodes
      .filter((node) => node.hasZoteroBinding)
      .sort((left, right) =>
        left.literatureItemId.localeCompare(right.literatureItemId),
      );
    const libraryIds = new Set(
      libraryNodes.map((node) => node.literatureItemId),
    );
    if (!libraryIds.size) {
      return emptyCitationGraph({
        diagnostics: {
          storage: "sqlite",
          bounded: false,
          semantic_slice: "library_and_shared_external",
          library_node_count: 0,
          shared_external_count: 0,
          hover_only_external_count: 0,
          displayed_edge_count: 0,
          hover_only_edge_count: 0,
        },
      });
    }

    const candidateEdges = synthesisRepository
      .listCitationEdges({
        sourceLiteratureItemIds: Array.from(libraryIds),
        statuses: ["accepted", "unbound"],
      })
      .filter(
        (edge) =>
          edge.edgeStatus !== "ignored" &&
          Boolean(edge.targetLiteratureItemId) &&
          Boolean(nodeById.get(edge.targetLiteratureItemId || "")),
      );
    const externalIncomingDegree = new Map<string, number>();
    for (const edge of candidateEdges) {
      const target = nodeById.get(edge.targetLiteratureItemId || "");
      if (target && !target.hasZoteroBinding) {
        externalIncomingDegree.set(
          target.literatureItemId,
          (externalIncomingDegree.get(target.literatureItemId) || 0) + 1,
        );
      }
    }

    const mainNodeIds = new Set(libraryIds);
    const hoverOnlyNodeIds = new Set<string>();
    const mainEdges: SynthesisCitationEdgeRecord[] = [];
    const hoverOnlyEdges: SynthesisCitationEdgeRecord[] = [];
    for (const edge of candidateEdges) {
      const target = nodeById.get(edge.targetLiteratureItemId || "");
      if (!target) {
        continue;
      }
      if (target.hasZoteroBinding) {
        if (edge.edgeStatus === "accepted") {
          mainNodeIds.add(target.literatureItemId);
          mainEdges.push(edge);
        }
        continue;
      }
      const externalDegree =
        externalIncomingDegree.get(target.literatureItemId) || 0;
      if (externalDegree > 1) {
        mainNodeIds.add(target.literatureItemId);
        mainEdges.push(edge);
      } else if (externalDegree === 1) {
        hoverOnlyNodeIds.add(target.literatureItemId);
        hoverOnlyEdges.push(edge);
      }
    }

    const mainNodes = activeNodes
      .filter((node) => mainNodeIds.has(node.literatureItemId))
      .sort((left, right) =>
        left.literatureItemId.localeCompare(right.literatureItemId),
      );
    const hoverOnlyNodes = activeNodes
      .filter((node) => hoverOnlyNodeIds.has(node.literatureItemId))
      .sort((left, right) =>
        left.literatureItemId.localeCompare(right.literatureItemId),
      );
    const metrics = synthesisRepository.listCitationLightMetrics({
      literatureItemIds: mainNodes.map((node) => node.literatureItemId),
    });
    const nodeDisplay = new Map<
      string,
      {
        externalDegree?: number;
        visibility?: "default" | "hover_only";
        displayTier?: "library" | "shared_external" | "single_external";
      }
    >();
    for (const node of mainNodes) {
      nodeDisplay.set(node.literatureItemId, {
        externalDegree: node.hasZoteroBinding
          ? undefined
          : externalIncomingDegree.get(node.literatureItemId) || 0,
        visibility: "default",
        displayTier: node.hasZoteroBinding ? "library" : "shared_external",
      });
    }
    for (const node of hoverOnlyNodes) {
      nodeDisplay.set(node.literatureItemId, {
        externalDegree: externalIncomingDegree.get(node.literatureItemId) || 1,
        visibility: "hover_only",
        displayTier: "single_external",
      });
    }
    const hoverEdgeVisibility = new Map(
      hoverOnlyEdges.map((edge) => [edge.edgeId, "hover_only" as const]),
    );
    const graph = dbRowsToCitationGraph({
      nodes: mainNodes,
      edges: mainEdges,
      metrics,
      nodeDisplay,
      diagnostics: {
        storage: "sqlite",
        bounded: false,
        semantic_slice: "library_and_shared_external",
        library_node_count: libraryNodes.length,
        shared_external_count: mainNodes.filter(
          (node) => !node.hasZoteroBinding,
        ).length,
        hover_only_external_count: hoverOnlyNodes.length,
        displayed_edge_count: mainEdges.length,
        hover_only_edge_count: hoverOnlyEdges.length,
        node_count: mainNodes.length,
        edge_count: mainEdges.length,
        truncated: false,
        limits: {
          libraryNodes: "unbounded",
          sharedExternalMinIncomingDegree: 2,
        },
      },
    }) as CitationGraph & {
      hover_only_nodes?: CitationGraphNode[];
      hover_only_edges?: CitationGraphEdge[];
    };
    const hoverGraph = dbRowsToCitationGraph({
      nodes: [...libraryNodes, ...hoverOnlyNodes],
      edges: hoverOnlyEdges,
      nodeDisplay,
      edgeVisibility: hoverEdgeVisibility,
      diagnostics: {},
    });
    const hoverNodeIds = new Set(
      hoverOnlyNodes.map((node) => node.literatureItemId),
    );
    graph.hover_only_nodes = hoverGraph.nodes.filter((node) =>
      node.aliases.some((alias) => hoverNodeIds.has(alias)),
    );
    graph.hover_only_edges = hoverGraph.edges;
    return graph;
  }

  function readFullDbCitationGraphForMetrics() {
    const nodes = synthesisRepository.listCitationNodes({
      statuses: ["active"],
    });
    const edges = synthesisRepository.listCitationEdges({
      statuses: ["accepted", "unbound"],
    });
    const metrics = synthesisRepository.listCitationLightMetrics({
      literatureItemIds: nodes.map((node) => node.literatureItemId),
    });
    return {
      graph: dbRowsToCitationGraph({ nodes, edges, metrics }),
      nodes,
      edges,
      metrics,
    };
  }

  function refreshCitationGraphComplexMetricsFromCurrentGraph(args: {
    timestamp: string;
  }) {
    const {
      graph,
      nodes,
      edges,
      metrics: lightMetrics,
    } = readFullDbCitationGraphForMetrics();
    if (!nodes.length || !graph.nodes.length) {
      return {
        ok: true,
        status: "skipped",
        skipped_reason: "citation_graph_cache_empty",
        graph_hash: graph.graph_hash,
        metrics_hash: "",
        node_count: 0,
        edge_count: edges.length,
        metric_count: 0,
      };
    }
    const structureVersionByItem = new Map(
      lightMetrics.map(
        (metric) =>
          [metric.literatureItemId, metric.sourceStructureVersion] as const,
      ),
    );
    const literatureItemIdByNodeId = new Map(
      Array.from(citationGraphNodeIdMap(nodes).entries()).map(
        ([literatureItemId, nodeId]) => [nodeId, literatureItemId] as const,
      ),
    );
    const metrics = computeCitationGraphMetrics(graph);
    const records = metrics.library_node_metrics
      .map((metric) => {
        const literatureItemId = literatureItemIdByNodeId.get(metric.node_id);
        if (!literatureItemId) {
          return null;
        }
        return complexMetricRecordFromLibraryMetric({
          metric,
          literatureItemId,
          sourceStructureVersion:
            structureVersionByItem.get(literatureItemId) || 0,
          sourceGraphHash: metrics.graph_hash,
          metricsHash: metrics.metrics_hash,
          timestamp: args.timestamp,
        });
      })
      .filter((record): record is SynthesisCitationComplexMetricsRecord =>
        Boolean(record),
      );
    synthesisRepository.replaceCitationComplexMetrics(records);
    return {
      ok: true,
      status: "completed",
      graph_hash: metrics.graph_hash,
      metrics_hash: metrics.metrics_hash,
      node_count: graph.nodes.length,
      edge_count: graph.edges.length,
      metric_count: records.length,
    };
  }

  function readDbCitationGraphSlice(
    normalized: ReturnType<typeof normalizeGraphSliceArgs>,
  ): SynthesisCitationGraphSliceResult {
    const startLiteratureItemId = citationGraphLiteratureItemIdFromNodeId(
      normalized.startNodeId,
    );
    const emptyDiagnostics = {
      snapshot_found: false,
      depth: normalized.depth,
      node_count: 0,
      edge_count: 0,
      truncated: false,
      limits: {
        maxNodes: normalized.maxNodes,
        maxEdges: normalized.maxEdges,
        maxDepth: 2,
      },
      warnings: normalized.warnings,
      recommended_commands: [],
      maintenance: readMaintenanceForDto(),
    };
    if (!startLiteratureItemId) {
      return {
        ok: false,
        graph_hash: "",
        start_node_id: normalized.startNodeId,
        nodes: [],
        edges: [],
        diagnostics: {
          ...emptyDiagnostics,
          warnings: [
            ...normalized.warnings,
            `start node not found: ${normalized.startNodeId}`,
          ],
        },
      };
    }
    const startNodes = synthesisRepository.listCitationNodes({
      statuses: ["active"],
      literatureItemIds: [startLiteratureItemId],
      limit: 1,
    });
    if (!startNodes.length) {
      return {
        ok: false,
        graph_hash: "",
        start_node_id: normalized.startNodeId,
        nodes: [],
        edges: [],
        diagnostics: {
          ...emptyDiagnostics,
          warnings: [
            ...normalized.warnings,
            `start node not found: ${normalized.startNodeId}`,
          ],
        },
      };
    }
    const selectedNodeIds = new Set<string>([startLiteratureItemId]);
    const selectedEdges = new Map<string, SynthesisCitationEdgeRecord>();
    const queue: Array<{ literatureItemId: string; depth: number }> = [
      { literatureItemId: startLiteratureItemId, depth: 0 },
    ];
    let truncated = false;
    while (queue.length) {
      const current = queue.shift()!;
      if (current.depth >= normalized.depth) {
        continue;
      }
      const outgoing =
        normalized.direction === "incoming"
          ? []
          : synthesisRepository.listCitationEdges({
              sourceLiteratureItemIds: [current.literatureItemId],
              statuses: ["accepted", "unbound"],
              limit: normalized.maxEdges,
            });
      const incoming =
        normalized.direction === "outgoing"
          ? []
          : synthesisRepository.listCitationEdges({
              targetLiteratureItemIds: [current.literatureItemId],
              statuses: ["accepted", "unbound"],
              limit: normalized.maxEdges,
            });
      const nextEdges = [...outgoing, ...incoming]
        .filter((edge) =>
          dbCitationEdgeMatchesRole(edge, normalized.roleFilter),
        )
        .sort((left, right) => left.edgeId.localeCompare(right.edgeId));
      for (const edge of nextEdges) {
        const nextLiteratureItemId =
          edge.sourceLiteratureItemId === current.literatureItemId
            ? edge.targetLiteratureItemId
            : edge.sourceLiteratureItemId;
        if (!nextLiteratureItemId) {
          if (normalized.includeLowSignal) {
            truncated = true;
          }
          continue;
        }
        if (selectedEdges.size >= normalized.maxEdges) {
          truncated = true;
          continue;
        }
        if (
          !selectedNodeIds.has(nextLiteratureItemId) &&
          selectedNodeIds.size >= normalized.maxNodes
        ) {
          truncated = true;
          continue;
        }
        selectedEdges.set(edge.edgeId, edge);
        if (!selectedNodeIds.has(nextLiteratureItemId)) {
          selectedNodeIds.add(nextLiteratureItemId);
          queue.push({
            literatureItemId: nextLiteratureItemId,
            depth: current.depth + 1,
          });
        }
      }
    }
    const nodes = synthesisRepository.listCitationNodes({
      statuses: ["active"],
      literatureItemIds: Array.from(selectedNodeIds),
      limit: normalized.maxNodes,
    });
    const metrics = synthesisRepository.listCitationLightMetrics({
      literatureItemIds: Array.from(selectedNodeIds),
      limit: normalized.maxNodes,
    });
    const graph = dbRowsToCitationGraph({
      nodes,
      edges: Array.from(selectedEdges.values()),
      metrics,
    });
    return {
      ok: true,
      graph_hash: graph.graph_hash,
      start_node_id: normalized.startNodeId,
      nodes: graph.nodes,
      edges: graph.edges,
      diagnostics: {
        snapshot_found: true,
        depth: normalized.depth,
        node_count: graph.nodes.length,
        edge_count: graph.edges.length,
        truncated,
        limits: {
          maxNodes: normalized.maxNodes,
          maxEdges: normalized.maxEdges,
          maxDepth: 2,
        },
        warnings: normalized.warnings,
        recommended_commands: [],
        maintenance: readMaintenanceForDto(),
      },
    };
  }

  function readDbCitationMetrics(
    normalized: ReturnType<typeof normalizeGraphMetricsArgs>,
  ): SynthesisCitationGraphMetricsResult {
    const requestedIds = normalized.paperRefs
      .map(paperRefToCitationGraphNodeId)
      .map(citationGraphLiteratureItemIdFromNodeId)
      .filter(Boolean);
    const complexMetrics = synthesisRepository.listCitationComplexMetrics({
      literatureItemIds: requestedIds,
      limit: normalized.limit,
      sortBy: normalized.sortBy,
    });
    const latestLightMetrics = synthesisRepository.listCitationLightMetrics({
      literatureItemIds: complexMetrics.length
        ? complexMetrics.map((metric) => metric.literatureItemId)
        : requestedIds,
      limit: normalized.limit,
    });
    const lightByItem = new Map(
      latestLightMetrics.map((metric) => [metric.literatureItemId, metric]),
    );
    const stale = complexMetrics.some((metric) => {
      const light = lightByItem.get(metric.literatureItemId);
      return (
        metric.status !== "ready" ||
        (light
          ? metric.sourceStructureVersion < light.sourceStructureVersion
          : false)
      );
    });
    if (complexMetrics.length) {
      const items = complexMetrics.map(dbComplexMetricToLibraryMetric);
      const metricsHash =
        complexMetrics[0]?.metricsHash ||
        hashCanonicalJson({
          storage: "sqlite",
          complex_metrics: complexMetrics.map((metric) => [
            metric.literatureItemId,
            metric.foundationScore,
            metric.frontierScore,
            metric.internalPagerank,
            metric.sourceStructureVersion,
          ]),
        });
      return {
        ok: true,
        graph_hash: complexMetrics[0]?.sourceGraphHash || "",
        metrics_hash: metricsHash,
        status: stale ? "stale" : "ready",
        items,
        diagnostics: {
          snapshot_found: true,
          metrics_found: true,
          stale,
          total_library_nodes: complexMetrics.length,
          returned_count: items.length,
          limits: {
            limit: normalized.limit,
            maxLimit: 100,
          },
          warnings: [
            ...normalized.warnings,
            ...(stale ? ["citation graph complex metrics are stale"] : []),
          ],
          recommended_commands: stale ? ["refreshCitationGraphMetricsNow"] : [],
          maintenance: readMaintenanceForDto(
            stale ? ["refreshCitationGraphMetricsNow"] : [],
          ),
        },
      };
    }
    const sortBy =
      normalized.sortBy === "in_degree"
        ? "incoming_count"
        : normalized.sortBy === "frontier"
          ? "outgoing_count"
          : "local_degree";
    const metrics = synthesisRepository.listCitationLightMetrics({
      literatureItemIds: requestedIds,
      limit: normalized.limit,
      sortBy,
    });
    const nodes = synthesisRepository.listCitationNodes({
      statuses: ["active"],
      literatureItemIds: metrics.map((metric) => metric.literatureItemId),
      limit: normalized.limit,
    });
    const bindings = activeCitationBindings(
      nodes.map((node) => node.literatureItemId),
    );
    const nodesById = new Map(
      nodes.map((node) => [node.literatureItemId, node] as const),
    );
    const items = metrics.map((metric): CitationGraphLibraryNodeMetrics => {
      const node = nodesById.get(metric.literatureItemId);
      const binding = node ? bindings.get(node.literatureItemId) : undefined;
      const sourceRef = node ? parsePaperRef(node.literatureItemId) : null;
      const paperRef = binding
        ? `${binding.libraryId}:${binding.itemKey}`
        : sourceRef?.itemKey
          ? `${sourceRef.libraryId}:${sourceRef.itemKey}`
          : "";
      return {
        node_id: node
          ? citationGraphNodeIdFromDb(node, binding)
          : metric.literatureItemId,
        paper_ref: paperRef,
        item_key: binding?.itemKey || sourceRef?.itemKey,
        title: node?.title,
        year: node?.year,
        internal_in_degree: metric.incomingCount,
        internal_out_degree: metric.outgoingCount,
        external_reference_count: metric.unresolvedOutgoingCount,
        unresolved_reference_count: metric.unresolvedOutgoingCount,
        internal_pagerank: 0,
        component_id: "",
        component_size: 0,
        is_isolated: metric.localDegree === 0,
        age_norm: 0,
        recency_norm: 0,
        in_degree_norm: metric.incomingCount,
        out_degree_norm: metric.outgoingCount,
        pagerank_norm: 0,
        foundation_score: metric.incomingCount,
        frontier_score: metric.outgoingCount,
        synthesis_role_hints: [],
      };
    });
    const graphHash = dbCitationGraphHash({
      nodes,
      edges: [],
      metrics,
    });
    return {
      ok: metrics.length > 0,
      graph_hash: graphHash,
      metrics_hash: dbCitationMetricsHash(metrics),
      status: metrics.length ? "stale" : "missing",
      items,
      diagnostics: {
        snapshot_found: nodes.length > 0,
        metrics_found: false,
        stale: metrics.length > 0,
        total_library_nodes: metrics.length,
        returned_count: items.length,
        limits: {
          limit: normalized.limit,
          maxLimit: 100,
        },
        warnings: [
          ...normalized.warnings,
          ...(metrics.length
            ? [
                "citation graph complex metrics are missing; using lightweight metrics",
              ]
            : []),
        ],
        recommended_commands: ["refreshCitationGraphMetricsNow"],
        maintenance: readMaintenanceForDto(["refreshCitationGraphMetricsNow"]),
      },
    };
  }

  function rankDbExternalReferences(
    normalized: ReturnType<typeof normalizeExternalReferenceRankArgs>,
  ): SynthesisRankedExternalReferencesResult {
    const graph = readDbCitationGraphOverview() as CitationGraph & {
      hover_only_nodes?: CitationGraphNode[];
      hover_only_edges?: CitationGraphEdge[];
    };
    const nodes = [...graph.nodes, ...(graph.hover_only_nodes || [])];
    const edges = [...graph.edges, ...(graph.hover_only_edges || [])];
    const nodeById = new Map(nodes.map((node) => [node.node_id, node]));
    const sourceRefsByExternal = new Map<string, Set<string>>();
    for (const edge of edges) {
      const target = nodeById.get(edge.target);
      if (!target || target.target_state !== "external") {
        continue;
      }
      const source = nodeById.get(edge.source);
      const sourceRef =
        cleanString(
          (source as { paper_ref?: unknown } | undefined)?.paper_ref,
        ) ||
        (source?.library_id && source?.item_key
          ? `${source.library_id}:${source.item_key}`
          : "");
      if (!sourceRef) {
        continue;
      }
      if (!sourceRefsByExternal.has(target.node_id)) {
        sourceRefsByExternal.set(target.node_id, new Set());
      }
      sourceRefsByExternal.get(target.node_id)?.add(sourceRef);
    }
    const externalNodes = nodes.filter(
      (node) => node.target_state === "external",
    );
    const ranked = externalNodes
      .map((node) => {
        const sourcePaperRefs = Array.from(
          sourceRefsByExternal.get(node.node_id) || [],
        ).sort((left, right) => left.localeCompare(right));
        const externalDegree =
          typeof node.external_degree === "number"
            ? Math.max(0, Math.floor(node.external_degree))
            : sourcePaperRefs.length;
        return {
          node,
          externalDegree,
          sharedSourceCount: sourcePaperRefs.length,
          sourcePaperRefs,
        };
      })
      .sort((left, right) => {
        const metric =
          normalized.sortBy === "shared_source_count"
            ? right.sharedSourceCount - left.sharedSourceCount
            : normalized.sortBy === "year"
              ? (Number(right.node.year) || 0) - (Number(left.node.year) || 0)
              : right.externalDegree - left.externalDegree;
        if (metric !== 0) {
          return metric;
        }
        return (
          right.sharedSourceCount - left.sharedSourceCount ||
          (left.node.title || left.node.node_id).localeCompare(
            right.node.title || right.node.node_id,
          ) ||
          left.node.node_id.localeCompare(right.node.node_id)
        );
      })
      .slice(0, normalized.limit);
    const items = ranked.map((entry) => ({
      node_id: entry.node.node_id,
      title: entry.node.title,
      year: entry.node.year,
      authors: entry.node.authors,
      external_degree: entry.externalDegree,
      shared_source_count: entry.sharedSourceCount,
      source_paper_refs: entry.sourcePaperRefs,
      display_tier: entry.node.display_tier,
      visibility: entry.node.visibility,
      reason:
        entry.sharedSourceCount > 1
          ? `Referenced by ${entry.sharedSourceCount} library papers`
          : "Referenced by one library paper",
    }));
    return {
      ok: true,
      graph_hash: graph.graph_hash,
      items,
      diagnostics: {
        snapshot_found: nodes.length > 0,
        returned_count: items.length,
        total_external_nodes: externalNodes.length,
        limits: {
          limit: normalized.limit,
          maxLimit: 100,
        },
        warnings: normalized.warnings,
        maintenance: readMaintenanceForDto(),
      },
    };
  }

  function rankDbLibraryPapers(
    normalized: ReturnType<typeof normalizeGraphMetricsArgs>,
  ) {
    const metrics = readDbCitationMetrics(normalized);
    return {
      ...metrics,
      items: metrics.items.map((item) => ({
        ...item,
        reason:
          normalized.sortBy === "frontier"
            ? `frontier_score=${item.frontier_score}`
            : normalized.sortBy === "pagerank"
              ? `internal_pagerank=${item.internal_pagerank}`
              : normalized.sortBy === "in_degree"
                ? `internal_in_degree=${item.internal_in_degree}`
                : `foundation_score=${item.foundation_score}`,
      })),
    };
  }

  async function readAttentionQueue(
    normalized: ReturnType<typeof normalizeAttentionQueueArgs>,
  ): Promise<SynthesisAttentionQueueResult> {
    const items: SynthesisAttentionQueueResult["items"] = [];
    const metrics = readDbCitationMetrics({
      limit: normalized.limit,
      paperRefs: normalized.paperRefs,
      sortBy: "foundation",
      warnings: [],
    });
    if (metrics.status !== "ready") {
      items.push({
        severity: metrics.status === "missing" ? "error" : "warning",
        target: "citation_graph.metrics",
        reason:
          metrics.status === "missing"
            ? "Citation graph complex metrics are missing."
            : "Citation graph complex metrics are stale.",
        source_capability: "citation_graph.get_metrics",
        suggested_commands: ["citation-graph refresh-metrics"],
        details: {
          status: metrics.status,
          warnings: metrics.diagnostics.warnings,
        },
      });
    }
    const referenceIndex = await getReferenceSidecarIndex({
      sourceRefs: normalized.sourceRefs,
      limit: normalized.limit,
    });
    const referenceDiagnostics = (referenceIndex as Record<string, unknown>)
      .diagnostics as Record<string, unknown> | undefined;
    const referenceWarnings = Array.isArray(referenceDiagnostics?.warnings)
      ? (referenceDiagnostics?.warnings as string[])
      : [];
    if (referenceWarnings.length) {
      items.push({
        severity: "warning",
        target: "reference_index",
        reason: referenceWarnings.join("; "),
        source_capability: "reference_index.get",
        suggested_commands: [],
        details: {
          warnings: referenceWarnings,
        },
      });
    }
    if (normalized.paperRefs.length) {
      const manifest = await getPaperArtifactManifest({
        paperRefs: normalized.paperRefs,
      });
      const rows = Array.isArray((manifest as Record<string, unknown>).items)
        ? ((manifest as Record<string, unknown>).items as Record<
            string,
            unknown
          >[])
        : [];
      for (const row of rows) {
        const status = cleanString(row.status || row.artifact_status);
        if (status && status !== "ready" && status !== "available") {
          items.push({
            severity: status === "missing" ? "warning" : "info",
            target:
              cleanString(row.paper_ref || row.paperRef) || "paper_artifact",
            reason: `Paper artifact readiness is ${status}.`,
            source_capability: "paper_artifacts.get_manifest",
            suggested_commands: [],
            details: row,
          });
        }
      }
    }
    const returned = items.slice(0, normalized.limit);
    return {
      ok: true,
      items: returned,
      diagnostics: {
        returned_count: returned.length,
        limits: {
          limit: normalized.limit,
          maxLimit: 100,
        },
        warnings: normalized.warnings,
        maintenance: readMaintenanceForDto(),
      },
    };
  }

  function sourceRefFromParts(parts: { libraryId: number; itemKey: string }) {
    return `${normalizeLibraryId(parts.libraryId) || libraryId}:${cleanString(
      parts.itemKey,
    )}`;
  }

  function referenceMatchReadModelEffectiveCanonicalIds(idsRaw: unknown[]) {
    const ids = Array.from(new Set(idsRaw.map(cleanString).filter(Boolean)));
    if (!ids.length) {
      return new Map<string, string>();
    }
    return synthesisRepository.resolveEffectiveCanonicalReferenceIds(ids);
  }

  async function referenceMatchTargetCandidatesForUi(): Promise<
    SynthesisUiReferenceMatchTargetCandidate[]
  > {
    const zoteroItems = await registryInputsForService(options).catch(
      () => [] as ReferenceSidecarInput[],
    );
    const itemCandidates = zoteroItems
      .map((input): SynthesisUiReferenceMatchTargetCandidate | null => {
        const itemKey = cleanString(input.itemKey);
        if (!itemKey) {
          return null;
        }
        const candidateLibraryId =
          normalizeLibraryId(input.libraryId) || libraryId;
        return {
          kind: "zotero_item",
          libraryId: candidateLibraryId,
          itemKey,
          title: cleanString(input.title) || itemKey,
          year: cleanString(input.year) || undefined,
          paperRef: sourceRefFromParts({
            libraryId: candidateLibraryId,
            itemKey,
          }),
        };
      })
      .filter(
        (
          entry,
        ): entry is Extract<
          SynthesisUiReferenceMatchTargetCandidate,
          { kind: "zotero_item" }
        > => Boolean(entry),
      );
    const activeCanonicalRows = synthesisRepository.listCanonicalReferences({
      statuses: ["active"],
    });
    const activeRawReferences = synthesisRepository.listRawReferences({
      statuses: ["active"],
      limit: 0,
    });
    const referenceBindings = synthesisRepository.listReferenceBindings();
    const canonicalIdsForResolution = Array.from(
      new Set(
        [
          ...activeCanonicalRows.map((row) => row.canonicalReferenceId),
          ...activeRawReferences.map((row) => row.canonicalReferenceId),
          ...referenceBindings.map((row) => row.canonicalReferenceId),
        ]
          .map(cleanString)
          .filter(Boolean),
      ),
    );
    const effectiveCanonicalById = referenceMatchReadModelEffectiveCanonicalIds(
      canonicalIdsForResolution,
    );
    const effectiveCanonicalId = (canonicalReferenceId: unknown) => {
      const id = cleanString(canonicalReferenceId);
      return effectiveCanonicalById.get(id) || id;
    };
    const effectiveCanonicalIds = Array.from(
      new Set(
        activeCanonicalRows.map((row) =>
          effectiveCanonicalId(row.canonicalReferenceId),
        ),
      ),
    ).filter(Boolean);
    const canonicalRecordById = new Map(
      [
        ...activeCanonicalRows,
        ...synthesisRepository.listCanonicalReferences({
          canonicalReferenceIds: effectiveCanonicalIds,
        }),
      ].map((row) => [row.canonicalReferenceId, row] as const),
    );
    const rawReferenceIdsByEffectiveCanonical = new Map<string, Set<string>>();
    for (const raw of activeRawReferences) {
      const canonicalReferenceId = effectiveCanonicalId(
        raw.canonicalReferenceId,
      );
      const rawReferenceId = cleanString(raw.rawReferenceId);
      if (!canonicalReferenceId || !rawReferenceId) {
        continue;
      }
      const rows =
        rawReferenceIdsByEffectiveCanonical.get(canonicalReferenceId) ||
        new Set<string>();
      rows.add(rawReferenceId);
      rawReferenceIdsByEffectiveCanonical.set(canonicalReferenceId, rows);
    }
    const bindingPriority = (status: unknown) => {
      const normalized = cleanString(status);
      if (normalized === "accepted") return 5;
      if (normalized === "auto") return 4;
      if (normalized === "candidate") return 3;
      if (normalized === "stale_target") return 2;
      if (normalized === "rejected") return 1;
      return 0;
    };
    const bindingStatusForUi = (status: unknown) => {
      const normalized = cleanString(status);
      if (normalized === "auto") {
        return "accepted" as const;
      }
      if (
        normalized === "accepted" ||
        normalized === "candidate" ||
        normalized === "stale_target" ||
        normalized === "rejected"
      ) {
        return normalized;
      }
      return undefined;
    };
    const bindingByEffectiveCanonical = new Map<
      string,
      (typeof referenceBindings)[number]
    >();
    for (const binding of referenceBindings) {
      const canonicalReferenceId = effectiveCanonicalId(
        binding.canonicalReferenceId,
      );
      if (!canonicalReferenceId) {
        continue;
      }
      const existing = bindingByEffectiveCanonical.get(canonicalReferenceId);
      if (
        !existing ||
        bindingPriority(binding.status) > bindingPriority(existing.status)
      ) {
        bindingByEffectiveCanonical.set(canonicalReferenceId, binding);
      }
    }
    const canonicalRowsByEffective = new Map<
      string,
      typeof activeCanonicalRows
    >();
    const bindingRankByEffectiveCanonical = new Map<string, number>();
    const activeCitationNodeIds = new Set(
      synthesisRepository
        .listCitationNodes({ statuses: ["active"] })
        .map((node) => cleanString(node.literatureItemId))
        .filter(Boolean),
    );
    const shouldFilterToCitationGraph = activeCitationNodeIds.size > 0;
    for (const canonical of activeCanonicalRows) {
      const canonicalReferenceId = effectiveCanonicalId(
        canonical.canonicalReferenceId,
      );
      if (!canonicalReferenceId) {
        continue;
      }
      const rows = canonicalRowsByEffective.get(canonicalReferenceId) || [];
      rows.push(canonical);
      canonicalRowsByEffective.set(canonicalReferenceId, rows);
    }
    const rawCanonicalCandidates = Array.from(
      canonicalRowsByEffective.entries(),
    )
      .map(
        ([
          canonicalReferenceId,
          rows,
        ]): SynthesisUiReferenceMatchTargetCandidate | null => {
          const canonical =
            canonicalRecordById.get(canonicalReferenceId) || rows[0];
          if (!canonical) {
            return null;
          }
          const binding = bindingByEffectiveCanonical.get(canonicalReferenceId);
          const bindingStatus = bindingStatusForUi(binding?.status);
          bindingRankByEffectiveCanonical.set(
            canonicalReferenceId,
            bindingPriority(binding?.status),
          );
          const bindingTarget = binding
            ? {
                libraryId: normalizeLibraryId(binding.libraryId) || libraryId,
                itemKey: cleanString(binding.itemKey),
                paperRef: sourceRefFromParts({
                  libraryId: normalizeLibraryId(binding.libraryId) || libraryId,
                  itemKey: cleanString(binding.itemKey),
                }),
              }
            : undefined;
          return {
            kind: "canonical_reference",
            canonicalReferenceId,
            title:
              cleanString(canonical.title) ||
              cleanString(canonical.normalizedTitle) ||
              canonicalReferenceId,
            year: cleanString(canonical.year) || undefined,
            rawReferenceIds: Array.from(
              rawReferenceIdsByEffectiveCanonical.get(canonicalReferenceId) ||
                new Set<string>(),
            ).sort(),
            bindingStatus,
            bindingTarget,
          };
        },
      )
      .filter(
        (
          entry,
        ): entry is Extract<
          SynthesisUiReferenceMatchTargetCandidate,
          { kind: "canonical_reference" }
        > => Boolean(entry),
      );
    const canonicalCandidatesByProjectedTarget = new Map<
      string,
      Extract<
        SynthesisUiReferenceMatchTargetCandidate,
        { kind: "canonical_reference" }
      >
    >();
    const canonicalCandidateRank = (
      candidate: Extract<
        SynthesisUiReferenceMatchTargetCandidate,
        { kind: "canonical_reference" }
      >,
    ) => {
      const statusRank =
        bindingRankByEffectiveCanonical.get(candidate.canonicalReferenceId) ||
        bindingPriority(candidate.bindingStatus);
      const rawCount = Math.max(0, candidate.rawReferenceIds?.length || 0);
      return statusRank * 100000 + rawCount * 100;
    };
    for (const candidate of rawCanonicalCandidates) {
      const projectedTarget =
        cleanString(candidate.bindingTarget?.paperRef) ||
        candidate.canonicalReferenceId;
      if (
        shouldFilterToCitationGraph &&
        !activeCitationNodeIds.has(projectedTarget)
      ) {
        continue;
      }
      const key = candidate.bindingTarget?.paperRef
        ? `binding:${projectedTarget}`
        : `canonical:${projectedTarget}`;
      const existing = canonicalCandidatesByProjectedTarget.get(key);
      const mergedRawReferenceIds = Array.from(
        new Set([
          ...(existing?.rawReferenceIds || []),
          ...(candidate.rawReferenceIds || []),
        ]),
      ).sort();
      if (
        !existing ||
        canonicalCandidateRank(candidate) > canonicalCandidateRank(existing) ||
        (canonicalCandidateRank(candidate) ===
          canonicalCandidateRank(existing) &&
          candidate.canonicalReferenceId.localeCompare(
            existing.canonicalReferenceId,
          ) < 0)
      ) {
        canonicalCandidatesByProjectedTarget.set(key, {
          ...candidate,
          rawReferenceIds: mergedRawReferenceIds,
        });
      } else {
        canonicalCandidatesByProjectedTarget.set(key, {
          ...existing,
          rawReferenceIds: mergedRawReferenceIds,
        });
      }
    }
    const canonicalCandidates = Array.from(
      canonicalCandidatesByProjectedTarget.values(),
    );
    return [...itemCandidates, ...canonicalCandidates];
  }

  function canonicalBindingStatusForUi(status: unknown) {
    const normalized = cleanString(status);
    if (
      normalized === "accepted" ||
      normalized === "candidate" ||
      normalized === "stale_target" ||
      normalized === "rejected"
    ) {
      return normalized;
    }
    return undefined;
  }

  function parseCanonicalAuthors(authorsJson: unknown) {
    return parseJsonArray(authorsJson)
      .map((entry) => {
        if (typeof entry === "string") return cleanString(entry);
        if (!isRecord(entry)) return "";
        return (
          cleanString(entry.name) ||
          [entry.firstName, entry.lastName]
            .map(cleanString)
            .filter(Boolean)
            .join(" ") ||
          [entry.first, entry.last].map(cleanString).filter(Boolean).join(" ")
        );
      })
      .filter(Boolean)
      .slice(0, 12);
  }

  function bestReferenceBinding(
    bindings: SynthesisReferenceBindingRecord[],
  ): SynthesisReferenceBindingRecord | undefined {
    const rank = (status: unknown) => {
      const normalized = cleanString(status);
      if (normalized === "accepted") return 4;
      if (normalized === "candidate") return 3;
      if (normalized === "stale_target") return 2;
      if (normalized === "rejected") return 1;
      return 0;
    };
    return [...bindings].sort(
      (left, right) =>
        rank(right.status) - rank(left.status) ||
        (right.updatedAt || "").localeCompare(left.updatedAt || "") ||
        left.bindingId.localeCompare(right.bindingId),
    )[0];
  }

  function buildCanonicalReferenceRowsForUi() {
    const activeCanonicalRows = synthesisRepository.listCanonicalReferences({
      statuses: ["active"],
    });
    const activeRawReferences = synthesisRepository.listRawReferences({
      statuses: ["active"],
      limit: 0,
    });
    const redirects = synthesisRepository.listCanonicalReferenceRedirects();
    const redirectCanonicalIds = Array.from(
      new Set(
        redirects
          .flatMap((redirect) => [
            redirect.fromCanonicalReferenceId,
            redirect.toCanonicalReferenceId,
          ])
          .map(cleanString)
          .filter(Boolean),
      ),
    );
    const redirectCanonicalRows = redirectCanonicalIds.length
      ? synthesisRepository.listCanonicalReferences({
          canonicalReferenceIds: redirectCanonicalIds,
        })
      : [];
    const referenceBindings = synthesisRepository.listReferenceBindings();
    const proposals = synthesisRepository.listReferenceMatchProposals({
      limit: 0,
    });
    const canonicalRevisionItems = synthesisRepository.listReviewItems({
      reviewKind: "canonical_revision",
      limit: 0,
    });
    const citationNodes = synthesisRepository.listCitationNodes({
      statuses: ["active"],
    });
    const citationEdges = synthesisRepository.listCitationEdges({
      statuses: ["accepted", "candidate", "unbound"],
      limit: 0,
    });
    const activeCanonicalIds = activeCanonicalRows
      .map((row) => row.canonicalReferenceId)
      .filter(Boolean);
    const effectiveByPhysical =
      synthesisRepository.resolveEffectiveCanonicalReferenceIds(
        activeCanonicalIds,
      );
    const effectiveId = (canonicalReferenceId: unknown) => {
      const id = cleanString(canonicalReferenceId);
      return effectiveByPhysical.get(id) || id;
    };
    const canonicalById = new Map(
      [...activeCanonicalRows, ...redirectCanonicalRows].map(
        (row) => [row.canonicalReferenceId, row] as const,
      ),
    );
    const rawByEffective = new Map<string, typeof activeRawReferences>();
    for (const raw of activeRawReferences) {
      const id = effectiveId(raw.canonicalReferenceId);
      if (!id) continue;
      const rows = rawByEffective.get(id) || [];
      rows.push(raw);
      rawByEffective.set(id, rows);
    }
    const bindingsByEffective = new Map<
      string,
      SynthesisReferenceBindingRecord[]
    >();
    for (const binding of referenceBindings) {
      const id = effectiveId(binding.canonicalReferenceId);
      if (!id) continue;
      const rows = bindingsByEffective.get(id) || [];
      rows.push(binding);
      bindingsByEffective.set(id, rows);
    }
    const physicalByEffective = new Map<string, typeof activeCanonicalRows>();
    for (const canonical of activeCanonicalRows) {
      const id = effectiveId(canonical.canonicalReferenceId);
      if (!id) continue;
      const rows = physicalByEffective.get(id) || [];
      rows.push(canonical);
      physicalByEffective.set(id, rows);
    }
    const incomingRedirectsByTarget = new Map<string, typeof redirects>();
    const outgoingRedirectsBySource = new Map<string, typeof redirects>();
    for (const redirect of redirects) {
      const target = effectiveId(redirect.toCanonicalReferenceId);
      if (target) {
        const rows = incomingRedirectsByTarget.get(target) || [];
        rows.push(redirect);
        incomingRedirectsByTarget.set(target, rows);
      }
      const source = cleanString(redirect.fromCanonicalReferenceId);
      if (source) {
        const rows = outgoingRedirectsBySource.get(source) || [];
        rows.push(redirect);
        outgoingRedirectsBySource.set(source, rows);
      }
    }
    const proposalsByCanonical = new Map<string, typeof proposals>();
    for (const proposal of proposals) {
      for (const id of [
        effectiveId(proposal.sourceCanonicalReferenceId),
        effectiveId(proposal.targetCanonicalReferenceId),
      ]) {
        if (!id) continue;
        const rows = proposalsByCanonical.get(id) || [];
        rows.push(proposal);
        proposalsByCanonical.set(id, rows);
      }
    }
    const canonicalRevisionByCanonical = new Map<
      string,
      typeof canonicalRevisionItems
    >();
    for (const item of canonicalRevisionItems) {
      const id = effectiveId(item.scopeRef);
      if (!id) continue;
      canonicalRevisionByCanonical.set(id, [
        ...(canonicalRevisionByCanonical.get(id) || []),
        item,
      ]);
    }
    const graphNodeIds = new Set(
      citationNodes.map((node) => node.literatureItemId),
    );
    const graphInDegree = new Map<string, number>();
    const graphOutDegree = new Map<string, number>();
    for (const edge of citationEdges) {
      graphOutDegree.set(
        edge.sourceLiteratureItemId,
        (graphOutDegree.get(edge.sourceLiteratureItemId) || 0) + 1,
      );
      if (edge.targetLiteratureItemId) {
        graphInDegree.set(
          edge.targetLiteratureItemId,
          (graphInDegree.get(edge.targetLiteratureItemId) || 0) + 1,
        );
      }
    }
    const canonicalDisplay = (canonicalReferenceId: unknown) => {
      const id = cleanString(canonicalReferenceId);
      const canonical = canonicalById.get(id);
      return {
        canonical_reference_id: id,
        title:
          cleanString(canonical?.title) ||
          cleanString(canonical?.normalizedTitle) ||
          id,
        year: cleanString(canonical?.year) || undefined,
        authors: parseCanonicalAuthors(canonical?.authorsJson),
        identifiers: parseJsonObject(canonical?.identifiersJson),
        status: cleanString(canonical?.status) || undefined,
      };
    };
    const redirectDisplay = (redirect: (typeof redirects)[number]) => ({
      from: canonicalDisplay(redirect.fromCanonicalReferenceId),
      to: canonicalDisplay(redirect.toCanonicalReferenceId),
      reason: cleanString(redirect.reason) || undefined,
      updated_at: cleanString(redirect.updatedAt) || undefined,
    });
    const appendUniqueByKey = <T>(
      rows: T[],
      nextRows: T[],
      keyFor: (row: T) => string,
    ) => {
      const seen = new Set(rows.map(keyFor));
      nextRows.forEach((row) => {
        const key = keyFor(row);
        if (!key || seen.has(key)) {
          return;
        }
        seen.add(key);
        rows.push(row);
      });
    };
    const rowsByProjectedTarget = new Map<string, any>();
    for (const [effectiveCanonicalId, physicalRows] of physicalByEffective) {
      const binding = bestReferenceBinding(
        bindingsByEffective.get(effectiveCanonicalId) || [],
      );
      const bindingTarget = binding?.itemKey
        ? {
            libraryId: normalizeLibraryId(binding.libraryId) || libraryId,
            itemKey: cleanString(binding.itemKey),
            paperRef: sourceRefFromParts({
              libraryId: normalizeLibraryId(binding.libraryId) || libraryId,
              itemKey: cleanString(binding.itemKey),
            }),
            title: zoteroTitleForSourceRef(
              sourceRefFromParts({
                libraryId: normalizeLibraryId(binding.libraryId) || libraryId,
                itemKey: cleanString(binding.itemKey),
              }),
            ),
            status: canonicalBindingStatusForUi(binding.status),
          }
        : undefined;
      const projectedLiteratureItemId =
        bindingTarget?.paperRef || effectiveCanonicalId;
      const effectiveCanonical =
        canonicalById.get(effectiveCanonicalId) || physicalRows[0];
      const rawRows = rawByEffective.get(effectiveCanonicalId) || [];
      const proposalRows = proposalsByCanonical.get(effectiveCanonicalId) || [];
      const revisionRows =
        canonicalRevisionByCanonical.get(effectiveCanonicalId) || [];
      const incomingRedirectRows =
        incomingRedirectsByTarget.get(effectiveCanonicalId) || [];
      const outgoingRedirectRows =
        outgoingRedirectsBySource.get(effectiveCanonicalId) || [];
      const row = rowsByProjectedTarget.get(projectedLiteratureItemId) || {
        row_id: projectedLiteratureItemId,
        effective_canonical_id: effectiveCanonicalId,
        projected_literature_item_id: projectedLiteratureItemId,
        title:
          cleanString(effectiveCanonical?.title) ||
          cleanString(effectiveCanonical?.normalizedTitle) ||
          effectiveCanonicalId,
        normalized_title:
          cleanString(effectiveCanonical?.normalizedTitle) || undefined,
        year: cleanString(effectiveCanonical?.year) || undefined,
        authors: parseCanonicalAuthors(effectiveCanonical?.authorsJson),
        identifiers: parseJsonObject(effectiveCanonical?.identifiersJson),
        binding: bindingTarget,
        raw_reference_count: 0,
        physical_canonical_ids: [],
        effective_canonical_ids: [],
        identifiers_list: [],
        raw_reference_samples: [],
        incoming_redirects: [],
        outgoing_redirects: [],
        related_proposals: [],
        duplicate_peers: [],
        incoming_redirect_count: 0,
        outgoing_redirect_count: 0,
        proposal_count: 0,
        open_proposal_count: 0,
        graph_node_id: graphNodeIds.has(projectedLiteratureItemId)
          ? projectedLiteratureItemId
          : undefined,
        graph_in_degree: graphInDegree.get(projectedLiteratureItemId) || 0,
        graph_out_degree: graphOutDegree.get(projectedLiteratureItemId) || 0,
        action_availability: {
          merge: { allowed: true },
          edit: {
            allowed: !bindingTarget,
            blockers: bindingTarget ? ["bound_to_zotero"] : [],
          },
          archive: { allowed: false, blockers: [] },
        },
        diagnostics: [],
      };
      row.raw_reference_count += rawRows.length;
      appendUniqueByKey(
        row.raw_reference_samples,
        rawRows.slice(0, 12).map((raw) => ({
          title:
            cleanString(raw.parsedTitle) ||
            cleanString(raw.normalizedTitle) ||
            cleanString(raw.rawReference) ||
            "Untitled reference",
          year: cleanString(raw.year) || undefined,
          source_ref: cleanString(raw.sourceRef) || undefined,
          reference_index: raw.referenceIndex,
          raw_reference: cleanString(raw.rawReference) || undefined,
        })),
        (entry: {
          source_ref?: string;
          reference_index?: number;
          title: string;
        }) =>
          `${entry.source_ref || ""}:${entry.reference_index ?? ""}:${entry.title}`,
      );
      row.physical_canonical_ids = Array.from(
        new Set([
          ...row.physical_canonical_ids,
          ...physicalRows.map((entry) => entry.canonicalReferenceId),
        ]),
      ).sort();
      row.effective_canonical_ids = Array.from(
        new Set([...row.effective_canonical_ids, effectiveCanonicalId]),
      ).sort();
      const identifiers = parseJsonObject(effectiveCanonical?.identifiersJson);
      appendUniqueByKey(
        row.identifiers_list,
        Object.entries(identifiers)
          .map(([kind, value]) => ({
            kind,
            value: cleanString(value),
          }))
          .filter((entry) => entry.kind && entry.value),
        (entry: { kind: string; value: string }) =>
          `${entry.kind}:${entry.value}`,
      );
      appendUniqueByKey(
        row.incoming_redirects,
        incomingRedirectRows.map(redirectDisplay),
        (entry: {
          from: { canonical_reference_id: string };
          to: { canonical_reference_id: string };
        }) =>
          `${entry.from.canonical_reference_id}->${entry.to.canonical_reference_id}`,
      );
      appendUniqueByKey(
        row.outgoing_redirects,
        outgoingRedirectRows.map(redirectDisplay),
        (entry: {
          from: { canonical_reference_id: string };
          to: { canonical_reference_id: string };
        }) =>
          `${entry.from.canonical_reference_id}->${entry.to.canonical_reference_id}`,
      );
      appendUniqueByKey(
        row.related_proposals,
        proposalRows.map((proposal) => ({
          kind: proposal.kind,
          status: proposal.status,
          source: canonicalDisplay(proposal.sourceCanonicalReferenceId),
          target: canonicalDisplay(proposal.targetCanonicalReferenceId),
          confidence: cleanString(proposal.confidence) || undefined,
          updated_at: cleanString(proposal.updatedAt) || undefined,
        })),
        (entry: {
          kind: string;
          source: { canonical_reference_id: string };
          target: { canonical_reference_id: string };
        }) =>
          `${entry.kind}:${entry.source.canonical_reference_id}->${entry.target.canonical_reference_id}`,
      );
      row.incoming_redirect_count = row.incoming_redirects.length;
      row.outgoing_redirect_count = row.outgoing_redirects.length;
      row.proposal_count += proposalRows.length;
      row.open_proposal_count += proposalRows.filter(
        (proposal) => proposal.status === "open",
      ).length;
      if (revisionRows.length) {
        row.proposal_count += revisionRows.length;
        row.open_proposal_count += revisionRows.filter(
          (proposal) => proposal.status === "open",
        ).length;
        row.diagnostics.push({
          code: "canonical_revision_review_managed",
          severity: "info",
          review_item_ids: revisionRows.map((entry) => entry.reviewItemId),
        });
      }
      rowsByProjectedTarget.set(projectedLiteratureItemId, row);
    }
    const rows = Array.from(rowsByProjectedTarget.values()).filter(
      (row) => row.outgoing_redirect_count <= 0,
    );
    const duplicateGroups = new Map<string, any[]>();
    for (const row of rows) {
      const key = `${cleanString(row.normalized_title || row.title).toLowerCase()}\0${cleanString(row.year)}`;
      if (!key.trim()) continue;
      const group = duplicateGroups.get(key) || [];
      group.push(row);
      duplicateGroups.set(key, group);
    }
    for (const [key, group] of duplicateGroups) {
      if (group.length <= 1) continue;
      for (const row of group) {
        row.possible_duplicate_group = key.replace("\0", ":");
        row.duplicate_peers = group
          .filter((peer) => peer.row_id !== row.row_id)
          .map((peer) => ({
            title: peer.title,
            year: peer.year,
            binding: peer.binding?.paperRef || "",
            projected_literature_item_id: peer.projected_literature_item_id,
          }));
      }
    }
    for (const row of rows) {
      const archiveBlockers: string[] = [];
      if (row.physical_canonical_ids.length !== 1)
        archiveBlockers.push("multiple_physical_canonicals");
      if (row.raw_reference_count > 0)
        archiveBlockers.push("active_raw_references");
      if (row.incoming_redirect_count > 0)
        archiveBlockers.push("redirect_target");
      if (row.outgoing_redirect_count > 0)
        archiveBlockers.push("has_outgoing_redirect");
      if (row.binding) archiveBlockers.push("bound_to_zotero");
      if (row.proposal_count > 0) archiveBlockers.push("related_proposals");
      if (row.graph_node_id) archiveBlockers.push("graph_visible");
      row.action_availability.archive = {
        allowed: archiveBlockers.length === 0,
        blockers: archiveBlockers,
        reason: archiveBlockers[0],
      };
      row.action_availability.edit = row.binding
        ? {
            allowed: false,
            blockers: ["bound_to_zotero"],
            reason: "bound_to_zotero",
          }
        : { allowed: true };
    }
    const diagnostics = [
      {
        code: "canonical_revise_read_model",
        severity: "info",
        effective_rows: rows.length,
        projected_rows: rowsByProjectedTarget.size,
      },
    ];
    return { rows, diagnostics };
  }

  function zoteroTitleForSourceRef(sourceRef: unknown) {
    const parsed = parsePaperRef(sourceRef);
    if (!parsed?.itemKey) {
      return "";
    }
    const item = zoteroItemByLibraryAndKey(parsed.libraryId, parsed.itemKey);
    return (
      readZoteroItemField(item, "title") ||
      cleanString(
        (item as { getDisplayTitle?: () => unknown })?.getDisplayTitle?.(),
      )
    );
  }

  async function registryInputsForSourceRefs(sourceRefs: Set<string>) {
    if (!sourceRefs.size) {
      return registryInputsForService(options);
    }
    const rowsByRef = new Map<string, ReferenceSidecarInput>();
    for (const input of options.registryInputs || []) {
      const ref = paperRefForRegistryInput(input);
      if (ref && sourceRefs.has(ref)) {
        rowsByRef.set(ref, input);
      }
    }
    const itemReader =
      options.libraryAdapter?.getRegistryInputForItem ||
      options.libraryAdapter?.getRegistryInputSummaryForItem;
    if (typeof itemReader === "function") {
      for (const sourceRef of sourceRefs) {
        if (rowsByRef.has(sourceRef)) {
          continue;
        }
        const parsed = parsePaperRef(sourceRef);
        if (!parsed?.itemKey) {
          continue;
        }
        const input = await itemReader({
          libraryId: parsed.libraryId,
          itemKey: parsed.itemKey,
        });
        if (input) {
          rowsByRef.set(sourceRef, input);
        }
      }
    }
    return Array.from(rowsByRef.values());
  }

  async function registryInputsForWorkbenchPage(limit: number) {
    const requestedLimit = Math.max(0, Math.floor(Number(limit) || 0));
    if (options.libraryAdapter?.getRegistryInputsPage) {
      return options.libraryAdapter.getRegistryInputsPage({
        libraryId,
        limit: requestedLimit,
      });
    }
    if (options.registryInputs) {
      return requestedLimit > 0
        ? options.registryInputs.slice(0, requestedLimit)
        : options.registryInputs;
    }
    return registryInputsForService(options);
  }

  function refreshArtifactDerivedFields(row: ReferenceSidecarIndexRow) {
    const statuses = Object.values(row.artifacts).map(
      (artifact) => artifact.status,
    );
    row.artifactCoverage = statuses.every((status) => status === "available")
      ? "complete"
      : statuses.some((status) => status === "available")
        ? "partial"
        : "missing";
    row.facets.artifact = {
      hash: hashCanonicalJson(row.artifacts),
      status:
        row.artifactCoverage === "complete" ? "ready" : row.artifactCoverage,
    };
    row.facets.reference = {
      hash: hashCanonicalJson(row.artifacts.references || {}),
      status:
        row.artifacts.references?.status === "available" ? "ready" : "missing",
    };
    row.diagnostics = Object.values(row.artifacts).flatMap(
      (artifact) => artifact.diagnostics,
    );
    row.row_hash = hashCanonicalJson({
      paper_ref: row.paper_ref,
      title: row.title,
      year: row.year,
      artifacts: row.artifacts,
      artifactCoverage: row.artifactCoverage,
      diagnostics: row.diagnostics,
    });
  }

  function artifactPayloadType(type: ReferenceSidecarArtifactType) {
    return type === "digest"
      ? "digest-markdown"
      : type === "references"
        ? "references-json"
        : "citation-analysis-json";
  }

  function artifactMissingMessage(type: ReferenceSidecarArtifactType) {
    return type === "citation_analysis"
      ? "citation analysis payload is missing"
      : `${type} payload is missing`;
  }

  function artifactDiagnosticsForOverlay(args: {
    artifactType: ReferenceSidecarArtifactType;
    status: "available" | "missing" | "error";
    previousDiagnostics?: ReferenceSidecarIndexRow["diagnostics"];
  }): ReferenceSidecarIndexRow["diagnostics"] {
    if (args.status === "available") {
      return [];
    }
    const previous = (args.previousDiagnostics || []).filter(
      (entry) => entry.artifact_type === args.artifactType,
    );
    if (previous.length) {
      return previous;
    }
    return [
      {
        code:
          args.status === "error" ? "payload_decode_failed" : "payload_missing",
        artifact_type: args.artifactType,
        message:
          args.status === "error"
            ? `${artifactPayloadType(args.artifactType)} artifact has an unreadable cached state`
            : artifactMissingMessage(args.artifactType),
      },
    ];
  }

  async function verifyIncompleteArtifactRowsFromCurrentLibrary(
    rowsByRef: Map<string, ReferenceSidecarIndexRow>,
  ) {
    const itemReader = options.libraryAdapter?.getRegistryInputForItem;
    if (typeof itemReader !== "function") {
      return;
    }
    const candidates = Array.from(rowsByRef.values()).filter((row) =>
      Object.values(row.artifacts).some(
        (artifact) => artifact.status !== "available",
      ),
    );
    for (const row of candidates) {
      const parsed = parsePaperRef(row.paper_ref);
      if (!parsed?.itemKey) {
        continue;
      }
      const liveInput = await itemReader({
        libraryId: parsed.libraryId,
        itemKey: parsed.itemKey,
      });
      if (!liveInput) {
        continue;
      }
      const liveRow = buildReferenceSidecarIndexRow(liveInput);
      row.title = zoteroTitleForSourceRef(row.paper_ref) || liveRow.title;
      row.year = liveRow.year || row.year;
      for (const artifactType of [
        "digest",
        "references",
        "citation_analysis",
      ] as const) {
        const liveArtifact = liveRow.artifacts[artifactType];
        const currentArtifact = row.artifacts[artifactType];
        if (
          liveArtifact.status === "available" ||
          currentArtifact.status !== "available"
        ) {
          row.artifacts[artifactType] = liveArtifact;
        }
      }
      refreshArtifactDerivedFields(row);
    }
  }

  async function enrichRegistryRowsWithLiveMetadata(
    rowsByRef: Map<string, ReferenceSidecarIndexRow>,
  ) {
    const itemReader = options.libraryAdapter?.getRegistryInputSummaryForItem;
    if (typeof itemReader !== "function") {
      return;
    }
    for (const row of rowsByRef.values()) {
      const parsed = parsePaperRef(row.paper_ref);
      if (!parsed?.itemKey) {
        continue;
      }
      const liveInput = await itemReader({
        libraryId: parsed.libraryId,
        itemKey: parsed.itemKey,
      });
      if (!liveInput) {
        continue;
      }
      row.title =
        zoteroTitleForSourceRef(row.paper_ref) ||
        cleanString(liveInput.title) ||
        row.title;
      row.year = cleanString(liveInput.year) || row.year;
      row.item_type = cleanString(liveInput.itemType) || row.item_type;
      row.tags = Array.isArray(liveInput.tags) ? liveInput.tags : row.tags;
      row.collections = Array.isArray(liveInput.collections)
        ? liveInput.collections
        : row.collections;
      refreshArtifactDerivedFields(row);
    }
  }

  function artifactSourceParts(
    artifact: Pick<PaperArtifactReadResult, "paper_ref">,
  ) {
    const parsed = parsePaperRef(artifact.paper_ref);
    return {
      libraryId: parsed?.libraryId || libraryId,
      itemKey: cleanString(parsed?.itemKey || artifact.paper_ref),
      sourceRef: parsed?.itemKey
        ? sourceRefFromParts({
            libraryId: parsed.libraryId,
            itemKey: parsed.itemKey,
          })
        : cleanString(artifact.paper_ref),
    };
  }

  function referencesFromArtifactPayload(payload: unknown) {
    if (Array.isArray(payload)) {
      return payload.filter(isRecord);
    }
    if (isRecord(payload)) {
      return normalizeArray(
        payload.references || payload.reference_entries || payload.items,
      ).filter(isRecord);
    }
    return [];
  }

  function sidecarReferenceIdentity(reference: Record<string, unknown>) {
    const citekey = referenceCitekey(reference).toLowerCase();
    const title = referenceTitle(reference);
    const normalizedTitle = normalizeSynthesisLiteratureTitle(title);
    const year = referenceYear(reference);
    const authors = referenceAuthors(reference);
    return {
      citekey,
      title,
      normalizedTitle,
      year,
      authors,
      raw: referenceRaw(reference),
    };
  }

  function sidecarShortKey(value: unknown) {
    return hashCanonicalJson(value).slice(
      "sha256:".length,
      "sha256:".length + 24,
    );
  }

  function sidecarTitleYearKey(args: { title?: unknown; year?: unknown }) {
    const normalizedTitle = normalizeSynthesisLiteratureTitle(
      cleanString(args.title),
    );
    const year = cleanString(args.year);
    return normalizedTitle && year ? `${normalizedTitle}\u0000${year}` : "";
  }

  function canonicalReferenceRecordForReference(
    reference: Record<string, unknown>,
    timestamp: string,
  ): SynthesisCanonicalReferenceRecord {
    const identity = sidecarReferenceIdentity(reference);
    const metadataHash = hashCanonicalJson({
      citekey: identity.citekey,
      normalized_title: identity.normalizedTitle,
      year: identity.year,
      authors: identity.authors,
    });
    return {
      canonicalReferenceId: `cref:${metadataHash.slice(
        "sha256:".length,
        "sha256:".length + 24,
      )}`,
      title: identity.title,
      normalizedTitle: identity.normalizedTitle,
      year: identity.year,
      authorsJson: JSON.stringify(identity.authors),
      identifiersJson: JSON.stringify({
        citekey: identity.citekey || undefined,
      }),
      metadataHash,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  function referenceBindingForMatchedItem(args: {
    canonicalReferenceId: string;
    reference: Record<string, unknown>;
    matchedItems: ReturnType<typeof matchedSidecarItemIndex>;
    timestamp: string;
    reviewer: string;
  }): SynthesisReferenceBindingRecord | null {
    const citekey = referenceCitekey(args.reference).toLowerCase();
    const identity = sidecarReferenceIdentity(args.reference);
    const titleYearKey = sidecarTitleYearKey({
      title: identity.title,
      year: identity.year,
    });
    const matched =
      (citekey ? args.matchedItems.byCitekey.get(citekey) : null) ||
      (titleYearKey ? args.matchedItems.byTitleYear.get(titleYearKey) : null);
    if (!matched?.itemKey) {
      return null;
    }
    const basis =
      citekey && args.matchedItems.byCitekey.get(citekey)
        ? { kind: "citekey", citekey, item: matched.paperRef }
        : {
            kind: "title_year",
            title: identity.normalizedTitle,
            year: identity.year,
          };
    return {
      bindingId: `binding:${sidecarShortKey({
        canonical: args.canonicalReferenceId,
        library: matched.libraryId,
        item: matched.itemKey,
      })}`,
      canonicalReferenceId: args.canonicalReferenceId,
      libraryId: matched.libraryId,
      itemKey: matched.itemKey,
      status: "accepted",
      confidence: "deterministic",
      reviewer: args.reviewer,
      basisHash: hashCanonicalJson(basis),
      diagnosticsJson: JSON.stringify([
        {
          code:
            basis.kind === "citekey"
              ? "reference_sidecar_citekey_binding"
              : "reference_sidecar_title_year_binding",
          citekey,
        },
      ]),
      createdAt: args.timestamp,
      updatedAt: args.timestamp,
    };
  }

  function canonicalReferenceEvidenceForUi(
    canonicalReferenceIdRaw: unknown,
    options: { resolveEffective?: boolean } = {},
  ) {
    const canonicalReferenceId = cleanString(canonicalReferenceIdRaw);
    if (!canonicalReferenceId) {
      return {};
    }
    const shouldResolveEffective = options.resolveEffective !== false;
    const effectiveCanonicalReferenceId = shouldResolveEffective
      ? synthesisRepository.resolveEffectiveCanonicalReferenceId(
          canonicalReferenceId,
        ) || canonicalReferenceId
      : canonicalReferenceId;
    const canonical =
      synthesisRepository.listCanonicalReferences({
        canonicalReferenceIds: [effectiveCanonicalReferenceId],
        statuses: ["active"],
      })[0] ||
      synthesisRepository.listCanonicalReferences({
        canonicalReferenceIds: [canonicalReferenceId],
        statuses: ["active"],
      })[0];
    const binding = bestReferenceBinding(
      synthesisRepository.listReferenceBindings({
        canonicalReferenceIds: [
          canonicalReferenceId,
          effectiveCanonicalReferenceId,
        ].filter(Boolean),
      }),
    );
    const bindingPaperRef = binding?.itemKey
      ? sourceRefFromParts({
          libraryId: normalizeLibraryId(binding.libraryId) || libraryId,
          itemKey: cleanString(binding.itemKey),
        })
      : "";
    const bindingTitle = bindingPaperRef
      ? zoteroTitleForSourceRef(bindingPaperRef)
      : "";
    const title =
      bindingTitle ||
      cleanString(canonical?.title) ||
      cleanString(canonical?.normalizedTitle) ||
      canonicalReferenceId;
    return {
      canonical_reference_id: canonicalReferenceId,
      effective_canonical_reference_id: effectiveCanonicalReferenceId,
      projected_literature_item_id:
        bindingPaperRef || effectiveCanonicalReferenceId,
      title,
      normalized_title: cleanString(canonical?.normalizedTitle) || undefined,
      year: cleanString(canonical?.year) || undefined,
      binding: binding
        ? {
            library_id: normalizeLibraryId(binding.libraryId) || libraryId,
            item_key: cleanString(binding.itemKey),
            paper_ref: bindingPaperRef,
            title: bindingTitle || undefined,
            status: cleanString(binding.status) || undefined,
          }
        : undefined,
    };
  }

  function mergeProposalEvidenceWithCanonicalContext(
    proposal: SynthesisReferenceMatchProposalRecord,
  ) {
    const evidence = parseJsonObject(proposal.evidenceJson);
    const sourceEvidence = isRecord(evidence.source) ? evidence.source : {};
    const targetEvidence = isRecord(evidence.target) ? evidence.target : {};
    return {
      ...evidence,
      source: {
        ...canonicalReferenceEvidenceForUi(proposal.sourceCanonicalReferenceId),
        ...sourceEvidence,
      },
      target: {
        ...canonicalReferenceEvidenceForUi(proposal.targetCanonicalReferenceId),
        ...targetEvidence,
      },
    };
  }

  function referenceMatchProposalToUiRow(
    proposal: SynthesisReferenceMatchProposalRecord,
  ) {
    const targetCanonicalReferenceId = cleanString(
      proposal.targetCanonicalReferenceId,
    );
    const effectiveCanonicalById = referenceMatchReadModelEffectiveCanonicalIds(
      [proposal.sourceCanonicalReferenceId, targetCanonicalReferenceId],
    );
    const effectiveCanonicalId = (canonicalReferenceId: unknown) => {
      const id = cleanString(canonicalReferenceId);
      return effectiveCanonicalById.get(id) || id;
    };
    const sourceEffectiveCanonicalReferenceId = effectiveCanonicalId(
      proposal.sourceCanonicalReferenceId,
    );
    const targetEffectiveCanonicalReferenceId = targetCanonicalReferenceId
      ? effectiveCanonicalId(targetCanonicalReferenceId)
      : "";
    const bindingByEffectiveCanonical = new Map<
      string,
      SynthesisReferenceBindingRecord
    >();
    const bindingPriority = (status: unknown) => {
      const normalized = cleanString(status);
      if (normalized === "accepted") return 4;
      if (normalized === "candidate") return 3;
      if (normalized === "stale_target") return 2;
      if (normalized === "rejected") return 1;
      return 0;
    };
    for (const binding of synthesisRepository.listReferenceBindings({
      canonicalReferenceIds: [
        proposal.sourceCanonicalReferenceId,
        targetCanonicalReferenceId,
        sourceEffectiveCanonicalReferenceId,
        targetEffectiveCanonicalReferenceId,
      ].filter(Boolean),
    })) {
      const canonicalReferenceId = effectiveCanonicalId(
        binding.canonicalReferenceId,
      );
      if (!canonicalReferenceId) {
        continue;
      }
      const existing = bindingByEffectiveCanonical.get(canonicalReferenceId);
      if (
        !existing ||
        bindingPriority(binding.status) > bindingPriority(existing.status)
      ) {
        bindingByEffectiveCanonical.set(canonicalReferenceId, binding);
      }
    }
    const projectedLiteratureItemId = (canonicalReferenceId: unknown) => {
      const effective = effectiveCanonicalId(canonicalReferenceId);
      const binding = bindingByEffectiveCanonical.get(effective);
      return binding?.itemKey
        ? sourceRefFromParts({
            libraryId: normalizeLibraryId(binding.libraryId) || libraryId,
            itemKey: binding.itemKey,
          })
        : effective;
    };
    return {
      proposal_id: proposal.proposalId,
      kind: proposal.kind,
      status: proposal.status,
      source_canonical_reference_id: proposal.sourceCanonicalReferenceId,
      source_effective_canonical_reference_id:
        sourceEffectiveCanonicalReferenceId || undefined,
      source_projected_literature_item_id:
        projectedLiteratureItemId(proposal.sourceCanonicalReferenceId) ||
        undefined,
      source_raw_reference_ids: parseJsonArray(
        proposal.sourceRawReferenceIdsJson,
      )
        .map(cleanString)
        .filter(Boolean),
      target_canonical_reference_id: targetCanonicalReferenceId || undefined,
      target_effective_canonical_reference_id:
        targetEffectiveCanonicalReferenceId || undefined,
      target_projected_literature_item_id: targetCanonicalReferenceId
        ? projectedLiteratureItemId(targetCanonicalReferenceId) || undefined
        : cleanString(proposal.targetItemKey)
          ? sourceRefFromParts({
              libraryId:
                normalizeLibraryId(proposal.targetLibraryId) || libraryId,
              itemKey: cleanString(proposal.targetItemKey),
            })
          : undefined,
      target_library_id: proposal.targetLibraryId || undefined,
      target_item_key: cleanString(proposal.targetItemKey) || undefined,
      confidence: cleanString(proposal.confidence) || undefined,
      score: Number(proposal.score) || 0,
      reasons: parseJsonArray(proposal.reasonsJson)
        .map(cleanString)
        .filter(Boolean),
      evidence: mergeProposalEvidenceWithCanonicalContext(proposal),
      diagnostics: parseJsonArray(proposal.diagnosticsJson),
      updated_at: proposal.updatedAt,
    };
  }

  function rawReferenceIdsForMatchProposals(
    proposals: SynthesisReferenceMatchProposalRecord[],
  ) {
    return Array.from(
      new Set(
        proposals.flatMap((proposal) =>
          parseJsonArray(proposal.sourceRawReferenceIdsJson)
            .map(cleanString)
            .filter(Boolean),
        ),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }

  async function registryRowsForReferenceMatchProposalContext(
    proposals: SynthesisReferenceMatchProposalRecord[],
  ) {
    const sourceRefs = new Set<string>();
    const rawReferenceIds = rawReferenceIdsForMatchProposals(proposals);
    if (rawReferenceIds.length) {
      for (const raw of synthesisRepository.listRawReferences({
        rawReferenceIds,
        statuses: ["active"],
      })) {
        const sourceRef = cleanString(raw.sourceRef);
        if (sourceRef) {
          sourceRefs.add(sourceRef);
        }
      }
    }
    for (const proposal of proposals) {
      for (const canonicalReferenceId of [
        proposal.sourceCanonicalReferenceId,
        proposal.targetCanonicalReferenceId,
      ]) {
        const evidence = canonicalReferenceEvidenceForUi(
          canonicalReferenceId,
        ) as Record<string, unknown>;
        const binding = isRecord(evidence.binding) ? evidence.binding : {};
        const paperRef = cleanString(binding.paper_ref);
        if (paperRef) {
          sourceRefs.add(paperRef);
        }
      }
      const targetItemKey = cleanString(proposal.targetItemKey);
      if (!targetItemKey) {
        continue;
      }
      const targetLibraryId =
        normalizeLibraryId(proposal.targetLibraryId) || libraryId;
      sourceRefs.add(
        sourceRefFromParts({
          libraryId: targetLibraryId,
          itemKey: targetItemKey,
        }),
      );
    }
    if (!sourceRefs.size) {
      return [];
    }
    const inputs = await registryInputsForSourceRefs(sourceRefs);
    const rows = registryRowsForInputs(inputs);
    for (const row of rows) {
      const zoteroTitle = zoteroTitleForSourceRef(row.paper_ref);
      if (zoteroTitle) {
        row.title = zoteroTitle;
      }
    }
    return rows;
  }

  function proposalQueryForReviewState(state: SynthesisUiState) {
    const statuses =
      cleanString(state.reviews.status) === "all"
        ? undefined
        : [cleanString(state.reviews.status) || "open"];
    const kinds =
      cleanString(state.reviews.kind) === "all"
        ? undefined
        : [cleanString(state.reviews.kind)];
    const confidences =
      cleanString(state.reviews.confidence) === "all"
        ? undefined
        : [cleanString(state.reviews.confidence)];
    return {
      statuses,
      kinds,
      confidences,
      limit: SYNTHESIS_REVIEW_CENTER_PAGE_LIMIT,
    };
  }

  function reviewItemQueryForReviewState(state: SynthesisUiState) {
    const statuses =
      cleanString(state.reviews.status) === "all"
        ? undefined
        : [cleanString(state.reviews.status) || "open"];
    return {
      statuses,
      limit: SYNTHESIS_REVIEW_CENTER_PAGE_LIMIT,
    };
  }

  function citationGraphDeltaStrings(values: unknown) {
    return Array.from(
      new Set(normalizeArray(values).map(cleanString).filter(Boolean)),
    ).sort((left, right) => left.localeCompare(right));
  }

  type CitationGraphFactDelta = {
    changedCanonicalIds: string[];
    changedBindingCanonicalIds: string[];
    changedRedirectCanonicalIds: string[];
  };

  function emptyCitationGraphFactDelta(): CitationGraphFactDelta {
    return {
      changedCanonicalIds: [],
      changedBindingCanonicalIds: [],
      changedRedirectCanonicalIds: [],
    };
  }

  function normalizedCitationGraphFactDelta(
    delta: Partial<CitationGraphFactDelta> = {},
  ): CitationGraphFactDelta {
    return {
      changedCanonicalIds: citationGraphDeltaStrings(delta.changedCanonicalIds),
      changedBindingCanonicalIds: citationGraphDeltaStrings(
        delta.changedBindingCanonicalIds,
      ),
      changedRedirectCanonicalIds: citationGraphDeltaStrings(
        delta.changedRedirectCanonicalIds,
      ),
    };
  }

  function hasCitationGraphFactDelta(delta: Partial<CitationGraphFactDelta>) {
    return (
      citationGraphDeltaStrings(delta.changedCanonicalIds).length > 0 ||
      citationGraphDeltaStrings(delta.changedBindingCanonicalIds).length > 0 ||
      citationGraphDeltaStrings(delta.changedRedirectCanonicalIds).length > 0
    );
  }

  function addCitationGraphFactDelta(
    target: {
      changedCanonicalIds: Set<string>;
      changedBindingCanonicalIds: Set<string>;
      changedRedirectCanonicalIds: Set<string>;
    },
    delta: Partial<CitationGraphFactDelta>,
  ) {
    for (const value of citationGraphDeltaStrings(delta.changedCanonicalIds)) {
      target.changedCanonicalIds.add(value);
    }
    for (const value of citationGraphDeltaStrings(
      delta.changedBindingCanonicalIds,
    )) {
      target.changedBindingCanonicalIds.add(value);
    }
    for (const value of citationGraphDeltaStrings(
      delta.changedRedirectCanonicalIds,
    )) {
      target.changedRedirectCanonicalIds.add(value);
    }
  }

  function citationGraphStaleDeltaDiagnostic(args: {
    source?: string;
    sourceRefs?: unknown;
    changedCanonicalIds?: unknown;
    changedBindingCanonicalIds?: unknown;
    changedRedirectCanonicalIds?: unknown;
  }) {
    const sourceRefs = citationGraphDeltaStrings(args.sourceRefs);
    const changedCanonicalIds = citationGraphDeltaStrings(
      args.changedCanonicalIds,
    );
    const changedBindingCanonicalIds = citationGraphDeltaStrings(
      args.changedBindingCanonicalIds,
    );
    const changedRedirectCanonicalIds = citationGraphDeltaStrings(
      args.changedRedirectCanonicalIds,
    );
    const hasDelta =
      sourceRefs.length > 0 ||
      changedCanonicalIds.length > 0 ||
      changedBindingCanonicalIds.length > 0 ||
      changedRedirectCanonicalIds.length > 0;
    if (!hasDelta) {
      return undefined;
    }
    return {
      code: "citation_graph_cache_stale_delta",
      severity: "info",
      reason: cleanString(args.source) || "citation_graph_changed",
      source_refs: sourceRefs,
      changed_canonical_ids: changedCanonicalIds,
      changed_binding_canonical_ids: changedBindingCanonicalIds,
      changed_redirect_canonical_ids: changedRedirectCanonicalIds,
    };
  }

  function citationGraphStaleDiagnostics(args: {
    source?: string;
    diagnostics?: unknown[];
    sourceRefs?: unknown;
    changedCanonicalIds?: unknown;
    changedBindingCanonicalIds?: unknown;
    changedRedirectCanonicalIds?: unknown;
  }) {
    const diagnostics = [...(args.diagnostics || [])];
    const delta = citationGraphStaleDeltaDiagnostic(args);
    if (delta) {
      diagnostics.push(delta);
    }
    return diagnostics;
  }

  function citationGraphIncrementalDeltaFromBasis(
    basis: SynthesisCacheBasisRecord | null | undefined,
  ) {
    const delta = parseJsonArray(basis?.diagnosticsJson).find(
      (entry) =>
        isRecord(entry) &&
        cleanString(entry.code) === "citation_graph_cache_stale_delta",
    );
    if (!isRecord(delta)) {
      return undefined;
    }
    const sourceRefs = citationGraphDeltaStrings(delta.source_refs);
    const changedCanonicalIds = citationGraphDeltaStrings(
      delta.changed_canonical_ids,
    );
    const changedBindingCanonicalIds = citationGraphDeltaStrings(
      delta.changed_binding_canonical_ids,
    );
    const changedRedirectCanonicalIds = citationGraphDeltaStrings(
      delta.changed_redirect_canonical_ids,
    );
    if (
      !sourceRefs.length &&
      !changedCanonicalIds.length &&
      !changedBindingCanonicalIds.length &&
      !changedRedirectCanonicalIds.length
    ) {
      return undefined;
    }
    return {
      sourceRefs,
      changedCanonicalIds,
      changedBindingCanonicalIds,
      changedRedirectCanonicalIds,
      reason: cleanString(delta.reason) || "citation_graph_stale_delta",
    };
  }

  function markCitationGraphLibraryCacheStale(args: {
    source: string;
    timestamp: string;
    diagnostics?: unknown[];
    sourceRefs?: unknown;
    changedCanonicalIds?: unknown;
    changedBindingCanonicalIds?: unknown;
    changedRedirectCanonicalIds?: unknown;
  }) {
    synthesisRepository.upsertCacheBasis({
      cacheKey: "citation-graph:library",
      cacheKind: "citation_graph",
      scopeKind: "library",
      scopeRef: String(libraryId),
      status: "stale",
      basisKind: "reference_sidecar",
      basisValue: cleanString(args.source),
      sourceHash: hashCanonicalJson({
        source: cleanString(args.source),
        timestamp: args.timestamp,
        source_refs: citationGraphDeltaStrings(args.sourceRefs),
        changed_canonical_ids: citationGraphDeltaStrings(
          args.changedCanonicalIds,
        ),
        changed_binding_canonical_ids: citationGraphDeltaStrings(
          args.changedBindingCanonicalIds,
        ),
        changed_redirect_canonical_ids: citationGraphDeltaStrings(
          args.changedRedirectCanonicalIds,
        ),
      }),
      staleReason: cleanString(args.source) || "reference_sidecar_changed",
      diagnosticsJson: JSON.stringify(citationGraphStaleDiagnostics(args)),
      updatedAt: args.timestamp,
    });
  }

  function compactReferenceTitleForMatch(value: unknown) {
    return normalizeSynthesisLiteratureTitle(cleanString(value)).replace(
      /[^a-z0-9]+/g,
      "",
    );
  }

  function canonicalReferenceIdsForGovernance(id: string) {
    const effective =
      synthesisRepository.resolveEffectiveCanonicalReferenceId(id);
    return Array.from(
      new Set([id, effective].map(cleanString).filter(Boolean)),
    );
  }

  function canonicalIdentifiers(record?: SynthesisCanonicalReferenceRecord) {
    return parseJsonObject(record?.identifiersJson);
  }

  function canonicalCitekey(record?: SynthesisCanonicalReferenceRecord) {
    return cleanString(canonicalIdentifiers(record).citekey).toLowerCase();
  }

  function rawAuthors(row?: SynthesisRawReferenceRecord) {
    return normalizeStringListInput(parseJsonArray(row?.authorsJson));
  }

  function authorOverlap(left: string[], right: string[]) {
    const leftSet = new Set(left.map((value) => value.toLowerCase()));
    return right.some((value) => leftSet.has(value.toLowerCase()));
  }

  function bestStaleCanonicalSuccessor(args: {
    oldCanonical: SynthesisCanonicalReferenceRecord;
    staleRows: SynthesisRawReferenceRecord[];
    activeRows: SynthesisRawReferenceRecord[];
    canonicalById: Map<string, SynthesisCanonicalReferenceRecord>;
  }) {
    const oldEffective =
      synthesisRepository.resolveEffectiveCanonicalReferenceId(
        args.oldCanonical.canonicalReferenceId,
      );
    const oldTitle =
      cleanString(args.oldCanonical.normalizedTitle) ||
      normalizeSynthesisLiteratureTitle(args.oldCanonical.title);
    const oldYear = cleanString(args.oldCanonical.year);
    const oldCompact = compactReferenceTitleForMatch(
      args.oldCanonical.normalizedTitle || args.oldCanonical.title,
    );
    const oldCitekey = canonicalCitekey(args.oldCanonical);
    const oldAuthors = normalizeStringListInput([
      ...parseJsonArray(args.oldCanonical.authorsJson),
      ...args.staleRows.flatMap((row) => rawAuthors(row)),
    ]);
    const candidates = new Map<string, SynthesisRawReferenceRecord[]>();
    for (const row of args.activeRows) {
      const effective =
        synthesisRepository.resolveEffectiveCanonicalReferenceId(
          row.canonicalReferenceId || "",
        );
      if (!effective || effective === oldEffective) {
        continue;
      }
      candidates.set(effective, [...(candidates.get(effective) || []), row]);
    }
    let best:
      | {
          canonicalReferenceId: string;
          confidence: "identifier" | "title_year" | "compact_author";
          rows: SynthesisRawReferenceRecord[];
        }
      | undefined;
    for (const [candidateId, rows] of candidates) {
      const canonical = args.canonicalById.get(candidateId);
      const candidateCitekey = canonicalCitekey(canonical);
      if (oldCitekey && candidateCitekey && oldCitekey === candidateCitekey) {
        return {
          canonicalReferenceId: candidateId,
          confidence: "identifier" as const,
          rows,
        };
      }
      const title =
        cleanString(canonical?.normalizedTitle) ||
        normalizeSynthesisLiteratureTitle(canonical?.title) ||
        cleanString(rows[0]?.normalizedTitle);
      const year = cleanString(canonical?.year) || cleanString(rows[0]?.year);
      if (oldTitle && oldYear && title === oldTitle && year === oldYear) {
        best = {
          canonicalReferenceId: candidateId,
          confidence: "title_year",
          rows,
        };
        continue;
      }
      const compact =
        compactReferenceTitleForMatch(
          canonical?.normalizedTitle || canonical?.title,
        ) ||
        compactReferenceTitleForMatch(
          rows[0]?.normalizedTitle || rows[0]?.parsedTitle,
        );
      const candidateAuthors = normalizeStringListInput([
        ...parseJsonArray(canonical?.authorsJson),
        ...rows.flatMap((row) => rawAuthors(row)),
      ]);
      if (
        !best &&
        oldCompact &&
        compact &&
        oldCompact === compact &&
        oldYear &&
        year === oldYear &&
        authorOverlap(oldAuthors, candidateAuthors)
      ) {
        best = {
          canonicalReferenceId: candidateId,
          confidence: "compact_author",
          rows,
        };
      }
    }
    return best;
  }

  function staleCanonicalProtectionBlockers(canonicalReferenceId: string) {
    const ids = canonicalReferenceIdsForGovernance(canonicalReferenceId);
    const blockers: string[] = [];
    const activeRaw = synthesisRepository
      .listRawReferences({
        statuses: ["active"],
      })
      .filter((row) =>
        ids.includes(
          synthesisRepository.resolveEffectiveCanonicalReferenceId(
            row.canonicalReferenceId || "",
          ),
        ),
      );
    if (activeRaw.length) blockers.push("active_raw_refs");
    const bindings = synthesisRepository
      .listReferenceBindings({ canonicalReferenceIds: ids })
      .filter((row) => row.status !== "rejected");
    if (bindings.length) blockers.push("binding");
    const redirects = synthesisRepository.listCanonicalReferenceRedirects();
    if (
      redirects.some(
        (row) =>
          ids.includes(cleanString(row.fromCanonicalReferenceId)) ||
          ids.includes(
            synthesisRepository.resolveEffectiveCanonicalReferenceId(
              row.toCanonicalReferenceId,
            ),
          ),
      )
    ) {
      blockers.push("redirect");
    }
    const matchProposals = synthesisRepository
      .listReferenceMatchProposals({ limit: 0 })
      .filter(
        (row) =>
          ids.includes(
            synthesisRepository.resolveEffectiveCanonicalReferenceId(
              row.sourceCanonicalReferenceId,
            ),
          ) ||
          ids.includes(
            synthesisRepository.resolveEffectiveCanonicalReferenceId(
              row.targetCanonicalReferenceId || "",
            ),
          ),
      );
    if (matchProposals.length) blockers.push("reference_match_proposal");
    const reviewItems = synthesisRepository
      .listReviewItems({ limit: 0 })
      .filter(
        (row) =>
          row.reviewKind !== "canonical_revision" &&
          ids.some(
            (id) =>
              cleanString(row.scopeRef) === id ||
              cleanString(row.payloadJson).includes(id),
          ),
      );
    if (reviewItems.length) blockers.push("review_item");
    const graphIds = ids;
    const nodes = synthesisRepository.listCitationNodes({
      literatureItemIds: graphIds,
      statuses: ["active"],
      limit: 1,
    });
    const outgoing = synthesisRepository.listCitationEdges({
      sourceLiteratureItemIds: graphIds,
      statuses: ["accepted", "candidate", "unbound"],
      limit: 1,
    });
    const incoming = synthesisRepository.listCitationEdges({
      targetLiteratureItemIds: graphIds,
      statuses: ["accepted", "candidate", "unbound"],
      limit: 1,
    });
    if (nodes.length || outgoing.length || incoming.length) {
      blockers.push("graph_visible");
    }
    return Array.from(new Set(blockers));
  }

  function markCanonicalReferenceStale(args: {
    canonicalReferenceId: string;
    reason: string;
    timestamp: string;
  }) {
    const canonical = synthesisRepository.listCanonicalReferences({
      canonicalReferenceIds: [args.canonicalReferenceId],
      statuses: ["active"],
    })[0];
    if (!canonical) {
      return false;
    }
    synthesisRepository.upsertCanonicalReference({
      ...canonical,
      status: "stale",
      updatedAt: args.timestamp,
    });
    return true;
  }

  function upsertCanonicalRevisionProposal(args: {
    sourceRef: string;
    canonical: SynthesisCanonicalReferenceRecord;
    staleRows: SynthesisRawReferenceRecord[];
    successor?: {
      canonicalReferenceId: string;
      confidence: string;
      rows: SynthesisRawReferenceRecord[];
    };
    blockers: string[];
    reason: string;
    timestamp: string;
  }) {
    const basis = {
      kind: "canonical_revision",
      reason: args.reason,
      source_ref: args.sourceRef,
      canonical_reference_id: args.canonical.canonicalReferenceId,
      successor_canonical_reference_id: args.successor?.canonicalReferenceId,
      stale_raw_reference_ids: args.staleRows
        .map((row) => row.rawReferenceId)
        .sort(),
    };
    const reviewItemId = `canonical-revision:${sidecarShortKey(basis)}`;
    const existing = synthesisRepository
      .listReviewItems({ limit: 0 })
      .find((row) => row.reviewItemId === reviewItemId);
    if (existing?.status === "rejected" || existing?.status === "approved") {
      return false;
    }
    const successorCanonical = args.successor
      ? synthesisRepository.listCanonicalReferences({
          canonicalReferenceIds: [args.successor.canonicalReferenceId],
        })[0]
      : undefined;
    synthesisRepository.upsertReviewItem({
      reviewItemId,
      reviewKind: "canonical_revision",
      priority: 1,
      status: existing?.status || "open",
      scopeKind: "canonical_reference",
      scopeRef: args.canonical.canonicalReferenceId,
      payloadJson: JSON.stringify({
        ...basis,
        title: args.canonical.title,
        normalized_title: args.canonical.normalizedTitle,
        year: args.canonical.year,
        recommended_action: args.successor
          ? "redirect_to_successor"
          : "mark_stale",
        blockers: args.blockers,
        successor_title: successorCanonical?.title,
        successor_year: successorCanonical?.year,
        successor_confidence: args.successor?.confidence,
        stale_raw_references: args.staleRows.slice(0, 8).map((row) => ({
          raw_reference_id: row.rawReferenceId,
          title: row.parsedTitle || row.normalizedTitle,
          year: row.year,
          source_ref: row.sourceRef,
          reference_index: row.referenceIndex,
        })),
        successor_raw_references: (args.successor?.rows || [])
          .slice(0, 8)
          .map((row) => ({
            raw_reference_id: row.rawReferenceId,
            title: row.parsedTitle || row.normalizedTitle,
            year: row.year,
            source_ref: row.sourceRef,
            reference_index: row.referenceIndex,
          })),
      }),
      diagnosticsJson: JSON.stringify([
        {
          code: "stale_canonical_lifecycle_review",
          severity: "warning",
          blockers: args.blockers,
          reason: args.reason,
        },
      ]),
      createdAt: existing?.createdAt || args.timestamp,
      updatedAt: args.timestamp,
    });
    return true;
  }

  function reconcileStaleCanonicalsForSource(args: {
    sourceRef: string;
    stale: SynthesisRawReferenceStaleResult;
    timestamp: string;
  }) {
    const canonicalIds = args.stale.canonicalReferenceIds;
    if (!canonicalIds.length) {
      return {
        affected: 0,
        autoRedirected: 0,
        autoStaled: 0,
        proposalsCreated: 0,
        blocked: 0,
      };
    }
    const activeRows = synthesisRepository.listRawReferences({
      sourceRefs: [args.sourceRef],
      statuses: ["active"],
    });
    const canonicalById = new Map(
      synthesisRepository
        .listCanonicalReferences({ statuses: ["active"] })
        .map((row) => [row.canonicalReferenceId, row] as const),
    );
    let autoRedirected = 0;
    let autoStaled = 0;
    let proposalsCreated = 0;
    let blocked = 0;
    for (const canonicalId of canonicalIds) {
      const canonical = canonicalById.get(canonicalId);
      if (!canonical) {
        continue;
      }
      const staleRows = args.stale.staleRawReferences.filter(
        (row) => cleanString(row.canonicalReferenceId) === canonicalId,
      );
      const blockers = staleCanonicalProtectionBlockers(canonicalId);
      if (blockers.includes("active_raw_refs")) {
        continue;
      }
      const successor = bestStaleCanonicalSuccessor({
        oldCanonical: canonical,
        staleRows,
        activeRows,
        canonicalById,
      });
      if (blockers.length) {
        blocked += 1;
        if (
          upsertCanonicalRevisionProposal({
            sourceRef: args.sourceRef,
            canonical,
            staleRows,
            successor,
            blockers,
            reason: successor
              ? "protected_stale_canonical_successor"
              : "protected_stale_canonical_orphan",
            timestamp: args.timestamp,
          })
        ) {
          proposalsCreated += 1;
        }
        continue;
      }
      if (successor?.canonicalReferenceId) {
        synthesisRepository.upsertCanonicalReferenceRedirect({
          fromCanonicalReferenceId: canonicalId,
          toCanonicalReferenceId: successor.canonicalReferenceId,
          reason: "artifact_replacement_successor",
          diagnosticsJson: JSON.stringify([
            {
              code: "stale_canonical_auto_redirect",
              severity: "info",
              source_ref: args.sourceRef,
              confidence: successor.confidence,
            },
          ]),
          createdAt: args.timestamp,
          updatedAt: args.timestamp,
        });
        markCanonicalReferenceStale({
          canonicalReferenceId: canonicalId,
          reason: "artifact_replacement_successor",
          timestamp: args.timestamp,
        });
        autoRedirected += 1;
        continue;
      }
      if (
        markCanonicalReferenceStale({
          canonicalReferenceId: canonicalId,
          reason: "orphaned_after_artifact_refresh",
          timestamp: args.timestamp,
        })
      ) {
        autoStaled += 1;
      }
    }
    if (autoRedirected || autoStaled) {
      markCitationGraphLibraryCacheStale({
        source: "stale_canonical_lifecycle",
        timestamp: args.timestamp,
        sourceRefs: [args.sourceRef],
        changedCanonicalIds: canonicalIds,
        changedRedirectCanonicalIds: canonicalIds,
      });
    }
    return {
      affected: canonicalIds.length,
      autoRedirected,
      autoStaled,
      proposalsCreated,
      blocked,
    };
  }

  function replaceReferenceSidecarForSourceRef(args: {
    sourceRef: string;
    referencesArtifactHash: string;
    references: unknown;
    matchedItems?: unknown;
    reviewer: string;
    timestamp: string;
  }) {
    const inputReferences = normalizeArray(args.references).filter(isRecord);
    const qualityRows = inputReferences.map((reference, index) => ({
      reference,
      index,
      quality: classifySynthesisReferenceQuality(reference),
    }));
    const acceptedRows = qualityRows.filter(
      (row) => row.quality.disposition !== "reject",
    );
    const matchedItems = matchedSidecarItemIndex(args.matchedItems);
    let matchedCount = 0;
    const changedBindingCanonicalIds = new Set<string>();
    const stale = synthesisRepository.markRawReferencesStaleForSource({
      sourceRef: args.sourceRef,
      exceptReferencesArtifactHash: args.referencesArtifactHash,
      timestamp: args.timestamp,
    });
    for (const row of acceptedRows) {
      const reference = row.reference;
      const canonical = canonicalReferenceRecordForReference(
        reference,
        args.timestamp,
      );
      synthesisRepository.upsertCanonicalReference(canonical);
      const identity = sidecarReferenceIdentity(reference);
      const rawHash = identity.raw
        ? hashMarkdown(identity.raw)
        : hashCanonicalJson(identity);
      const rawReference: SynthesisRawReferenceRecord = {
        rawReferenceId: `rawref:${sidecarShortKey({
          source: args.sourceRef,
          artifact: args.referencesArtifactHash,
          index: row.index,
          rawHash,
        })}`,
        sourceRef: args.sourceRef,
        referencesArtifactHash: args.referencesArtifactHash,
        referenceIndex: row.index,
        rawHash,
        parsedTitle: identity.title,
        normalizedTitle: identity.normalizedTitle,
        year: identity.year,
        authorsJson: JSON.stringify(identity.authors),
        rawReference: identity.raw,
        canonicalReferenceId: canonical.canonicalReferenceId,
        status: "active",
        diagnosticsJson: JSON.stringify(
          row.quality.warningReasons.map((code) => ({
            code,
            source: "reference_quality_gate",
            severity: "warning",
          })),
        ),
        createdAt: args.timestamp,
        updatedAt: args.timestamp,
      };
      synthesisRepository.upsertRawReference(rawReference);
      const binding = referenceBindingForMatchedItem({
        canonicalReferenceId: canonical.canonicalReferenceId,
        reference,
        matchedItems,
        timestamp: args.timestamp,
        reviewer: args.reviewer,
      });
      if (binding) {
        const currentBinding = synthesisRepository
          .listReferenceBindings({
            canonicalReferenceIds: [binding.canonicalReferenceId],
            statuses: ["accepted"],
          })
          .find((row) => row.bindingId === binding.bindingId);
        if (
          !currentBinding ||
          currentBinding.libraryId !== binding.libraryId ||
          currentBinding.itemKey !== binding.itemKey ||
          currentBinding.status !== binding.status
        ) {
          changedBindingCanonicalIds.add(binding.canonicalReferenceId);
        }
        synthesisRepository.upsertReferenceBinding(binding);
        matchedCount += 1;
      }
    }
    const staleCanonicalGovernance = reconcileStaleCanonicalsForSource({
      sourceRef: args.sourceRef,
      stale,
      timestamp: args.timestamp,
    });
    return {
      reference_count: acceptedRows.length,
      input_reference_count: inputReferences.length,
      rejected_reference_count: qualityRows.length - acceptedRows.length,
      warning_reference_count: acceptedRows.filter(
        (row) => row.quality.warningReasons.length > 0,
      ).length,
      matched_count: matchedCount,
      decision_count: matchedCount,
      changedBindingCanonicalIds: Array.from(changedBindingCanonicalIds).sort(),
      stale_canonical_governance: staleCanonicalGovernance,
    };
  }

  async function scanReferenceSidecarArtifacts() {
    if (options.libraryAdapter?.scanArtifactSidecars) {
      return options.libraryAdapter.scanArtifactSidecars({
        artifactTypes: ["digest", "references", "citation_analysis"],
      });
    }
    if (options.registryInputs) {
      return readArtifactsFromRegistryInputs(options.registryInputs, {
        artifact_types: ["digest", "references", "citation_analysis"],
      });
    }
    if (options.citationGraphPapers) {
      const artifacts: PaperArtifactReadResult[] = [];
      for (const paper of options.citationGraphPapers) {
        const sourceRef = sourceRefFromParts({
          libraryId: paper.libraryId,
          itemKey: paper.itemKey,
        });
        const references = paper.references || [];
        artifacts.push({
          paper_ref: sourceRef,
          artifact_type: "references",
          status: references.length ? "available" : "missing",
          payload_type: "references-json",
          hash: references.length ? hashCanonicalJson(references) : "",
          payload_hash: references.length ? hashCanonicalJson(references) : "",
          payload: references,
          diagnostics: [],
        });
        for (const artifactType of ["digest", "citation_analysis"] as const) {
          artifacts.push({
            paper_ref: sourceRef,
            artifact_type: artifactType,
            status: "missing",
            payload_type:
              artifactType === "digest"
                ? "digest-markdown"
                : "citation-analysis-json",
            diagnostics: [],
          });
        }
      }
      return { artifacts, diagnostics: [] };
    }
    return { artifacts: [], diagnostics: [] };
  }

  async function registryRowsFromCurrentLibraryAndSidecar(
    args: {
      sourceRefs?: string[];
      limit?: number;
    } = {},
  ) {
    const requestedSourceRefs = new Set(
      (args.sourceRefs || []).map(cleanString).filter(Boolean),
    );
    const requestedLimit = Math.max(0, Math.floor(Number(args.limit) || 0));
    const inputs =
      requestedSourceRefs.size === 0
        ? await registryInputsForWorkbenchPage(requestedLimit)
        : await registryInputsForSourceRefs(requestedSourceRefs);
    const rowsByRef = new Map(
      registryRowsForInputs(inputs).map((row) => [row.paper_ref, row] as const),
    );
    for (const row of rowsByRef.values()) {
      const zoteroTitle = zoteroTitleForSourceRef(row.paper_ref);
      if (zoteroTitle) {
        row.title = zoteroTitle;
      }
    }
    const sidecarSourceRefs = requestedSourceRefs.size
      ? [...requestedSourceRefs]
      : [...rowsByRef.keys()];
    const sidecars = synthesisRepository.listArtifactSidecars({
      sourceRefs: sidecarSourceRefs,
    });
    for (const sidecar of sidecars) {
      if (!rowsByRef.has(sidecar.sourceRef)) {
        const parsed = parsePaperRef(sidecar.sourceRef);
        const itemKey = sidecar.itemKey || parsed?.itemKey || sidecar.sourceRef;
        rowsByRef.set(
          sidecar.sourceRef,
          registryRowsForInputs([
            {
              libraryId: sidecar.libraryId || parsed?.libraryId || libraryId,
              itemKey,
              title: zoteroTitleForSourceRef(sidecar.sourceRef) || itemKey,
              notes: [],
            },
          ])[0],
        );
      }
      const row = rowsByRef.get(sidecar.sourceRef);
      if (!row) {
        continue;
      }
      const artifactType = sidecar.artifactType as ReferenceSidecarArtifactType;
      if (
        artifactType !== "digest" &&
        artifactType !== "references" &&
        artifactType !== "citation_analysis"
      ) {
        continue;
      }
      const locator = parseJsonObject(sidecar.locatorJson);
      const status =
        sidecar.status === "available"
          ? "available"
          : sidecar.status === "missing"
            ? "missing"
            : "error";
      const previousDiagnostics =
        row.artifacts[artifactType]?.diagnostics || [];
      row.artifacts[artifactType] = {
        type: artifactType,
        payload_type:
          cleanString(locator.payload_type) ||
          artifactPayloadType(artifactType),
        status,
        note_key: cleanString(locator.note_key) || undefined,
        note_title: cleanString(locator.note_title) || undefined,
        hash: sidecar.artifactHash,
        updated_at: sidecar.updatedAt,
        diagnostics: artifactDiagnosticsForOverlay({
          artifactType,
          status,
          previousDiagnostics,
        }),
      };
    }
    for (const row of rowsByRef.values()) {
      refreshArtifactDerivedFields(row);
    }
    await enrichRegistryRowsWithLiveMetadata(rowsByRef);
    await verifyIncompleteArtifactRowsFromCurrentLibrary(rowsByRef);
    await enrichRegistryRowsWithLiveMetadata(rowsByRef);
    return Array.from(rowsByRef.values()).sort(
      (left, right) =>
        left.library_id - right.library_id ||
        left.item_key.localeCompare(right.item_key),
    );
  }

  function registryRowsWithReferenceFactsToUi(
    registryRows: ReferenceSidecarIndexRow[],
    options: {
      includeReferences?: boolean;
      rawReferenceIds?: string[];
      referenceSourceRefs?: string[];
    } = {},
  ) {
    const sourceLiteratureItemIds = registryRows.map((row) => row.paper_ref);
    const referenceSourceRefSet = new Set(
      (options.referenceSourceRefs || []).map(cleanString).filter(Boolean),
    );
    const includeAllReferences =
      options.includeReferences === true && referenceSourceRefSet.size === 0;
    const loadedReferenceSourceRefs = includeAllReferences
      ? new Set(sourceLiteratureItemIds)
      : new Set(
          sourceLiteratureItemIds.filter((sourceRef) =>
            referenceSourceRefSet.has(sourceRef),
          ),
        );
    const shouldLoadReferenceFacts =
      includeAllReferences ||
      loadedReferenceSourceRefs.size > 0 ||
      Boolean(options.rawReferenceIds?.length);
    const referenceFactSourceRefs = includeAllReferences
      ? sourceLiteratureItemIds
      : Array.from(loadedReferenceSourceRefs);
    const registryReferenceFacts = shouldLoadReferenceFacts
      ? synthesisRepository.listReferenceFacts({
          sourceLiteratureItemIds: referenceFactSourceRefs.length
            ? referenceFactSourceRefs
            : sourceLiteratureItemIds,
          rawReferenceIds: options.rawReferenceIds,
        })
      : [];
    const referenceSummaries =
      synthesisRepository.listReferenceFactSummariesBySource({
        sourceLiteratureItemIds,
      });
    const referenceSummaryBySource = new Map(
      referenceSummaries.map(
        (summary) => [summary.sourceLiteratureItemId, summary] as const,
      ),
    );
    const referenceFactsBySource = new Map<
      string,
      typeof registryReferenceFacts
    >();
    registryReferenceFacts.forEach((reference) => {
      const key = reference.sourceLiteratureItemId;
      const rows = referenceFactsBySource.get(key) || [];
      rows.push(reference);
      referenceFactsBySource.set(key, rows);
    });
    return registryRowsToUi(registryRows).map((row) => {
      const references = referenceFactsBySource.get(row.paper_ref) || [];
      const summary = referenceSummaryBySource.get(row.paper_ref);
      const referencesLoaded =
        includeAllReferences || loadedReferenceSourceRefs.has(row.paper_ref);
      const unbound = references.filter(
        (reference) => !reference.bindingStatus,
      ).length;
      return {
        ...row,
        literature_item_id: row.paper_ref,
        reference_count: referencesLoaded
          ? references.length
          : summary?.referenceCount || 0,
        unbound_reference_count: referencesLoaded
          ? unbound
          : summary?.unboundReferenceCount || 0,
        references: referencesLoaded
          ? references.map(referenceSidecarReferenceToUiRow)
          : [],
      };
    });
  }

  async function registryRowsForReferencedScope(limit: number) {
    const rawReferences = synthesisRepository.listRawReferences({
      statuses: ["active"],
      limit,
    });
    const sourceRefs = Array.from(
      new Set(
        rawReferences.map((row) => cleanString(row.sourceRef)).filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));
    const rawReferenceIds = rawReferences
      .map((row) => cleanString(row.rawReferenceId))
      .filter(Boolean);
    if (!sourceRefs.length) {
      return { rows: [], rawReferenceIds };
    }
    return {
      rows: await registryRowsFromCurrentLibraryAndSidecar({ sourceRefs }),
      rawReferenceIds,
    };
  }

  function upsertArtifactSidecarsFromScan(args: {
    artifacts: PaperArtifactReadResult[];
    timestamp: string;
  }) {
    const previousReferencesBySource = new Map(
      synthesisRepository
        .listArtifactSidecars({ artifactTypes: ["references"] })
        .map((row) => [row.sourceRef, row] as const),
    );
    const changedReferenceArtifacts: PaperArtifactReadResult[] = [];
    for (const artifact of args.artifacts) {
      const source = artifactSourceParts(artifact);
      if (!source.sourceRef) {
        continue;
      }
      const artifactHash =
        cleanString(artifact.payload_hash) || cleanString(artifact.hash);
      const locator = {
        note_key: cleanString(artifact.note_key),
        note_title: cleanString(artifact.note_title),
        payload_type: cleanString(artifact.payload_type),
      };
      const record: SynthesisArtifactSidecarRecord = {
        sourceRef: source.sourceRef,
        libraryId: source.libraryId,
        itemKey: source.itemKey,
        artifactType: artifact.artifact_type,
        status: artifact.status,
        artifactHash,
        locatorJson: JSON.stringify(locator),
        diagnosticsJson: JSON.stringify(artifact.diagnostics || []),
        scannedAt: args.timestamp,
        updatedAt: args.timestamp,
      };
      synthesisRepository.upsertArtifactSidecar(record);
      if (artifact.artifact_type !== "references") {
        continue;
      }
      const previous = previousReferencesBySource.get(source.sourceRef);
      if (
        previous?.artifactHash !== artifactHash ||
        previous?.status !== artifact.status
      ) {
        changedReferenceArtifacts.push(artifact);
      }
    }
    return changedReferenceArtifacts;
  }

  function citationGraphLightMetricsForRecords(args: {
    nodes: Map<string, SynthesisCitationNodeRecord>;
    edges: SynthesisCitationEdgeRecord[];
    timestamp: string;
  }): SynthesisCitationLightMetricsRecord[] {
    const outgoingCounts = new Map<string, number>();
    const incomingCounts = new Map<string, number>();
    const matchedOutgoingCounts = new Map<string, number>();
    const unresolvedOutgoingCounts = new Map<string, number>();
    for (const edge of args.edges) {
      outgoingCounts.set(
        edge.sourceLiteratureItemId,
        (outgoingCounts.get(edge.sourceLiteratureItemId) || 0) + 1,
      );
      if (edge.targetLiteratureItemId) {
        incomingCounts.set(
          edge.targetLiteratureItemId,
          (incomingCounts.get(edge.targetLiteratureItemId) || 0) + 1,
        );
      }
      if (edge.edgeStatus === "accepted") {
        matchedOutgoingCounts.set(
          edge.sourceLiteratureItemId,
          (matchedOutgoingCounts.get(edge.sourceLiteratureItemId) || 0) + 1,
        );
      } else {
        unresolvedOutgoingCounts.set(
          edge.sourceLiteratureItemId,
          (unresolvedOutgoingCounts.get(edge.sourceLiteratureItemId) || 0) + 1,
        );
      }
    }
    return Array.from(args.nodes.keys()).map((literatureItemId) => {
      const outgoingCount = outgoingCounts.get(literatureItemId) || 0;
      const incomingCount = incomingCounts.get(literatureItemId) || 0;
      return {
        literatureItemId,
        outgoingCount,
        incomingCount,
        localDegree: outgoingCount + incomingCount,
        matchedOutgoingCount: matchedOutgoingCounts.get(literatureItemId) || 0,
        unresolvedOutgoingCount:
          unresolvedOutgoingCounts.get(literatureItemId) || 0,
        ambiguousOutgoingCount: 0,
        sourceStructureVersion: Date.parse(args.timestamp) || 0,
        updatedAt: args.timestamp,
      };
    });
  }

  async function buildCitationGraphCacheRecordsFromSidecar(args: {
    timestamp: string;
    sourceRefs?: string[];
    profileRun?: SynthesisJobProfileRun;
  }) {
    const timestamp = args.timestamp;
    const requestedSourceRefs = Array.from(
      new Set((args.sourceRefs || []).map(cleanString).filter(Boolean)),
    );
    const loaded = await runProfiledSynthesisPhase({
      profileRun: args.profileRun,
      phaseName: "load_sidecar_inputs",
      run: () => ({
        artifactSidecars: synthesisRepository.listArtifactSidecars(
          requestedSourceRefs.length ? { sourceRefs: requestedSourceRefs } : {},
        ),
        canonicalReferences: synthesisRepository.listCanonicalReferences({
          statuses: ["active"],
        }),
        acceptedBindings: synthesisRepository.listReferenceBindings({
          statuses: ["accepted"],
        }),
        rawReferences: synthesisRepository.listRawReferences({
          statuses: ["active"],
          ...(requestedSourceRefs.length
            ? { sourceRefs: requestedSourceRefs }
            : {}),
        }),
      }),
      counters: (result) => ({
        artifact_sidecar_count: result.artifactSidecars.length,
        canonical_reference_count: result.canonicalReferences.length,
        accepted_binding_count: result.acceptedBindings.length,
        active_raw_reference_count: result.rawReferences.length,
      }),
    });
    const sourceRefs = new Set(
      requestedSourceRefs.length
        ? requestedSourceRefs
        : loaded.artifactSidecars
            .map((artifact) => artifact.sourceRef)
            .filter(Boolean),
    );
    for (const reference of loaded.rawReferences) {
      if (reference.sourceRef) {
        sourceRefs.add(reference.sourceRef);
      }
    }
    const canonicalById = new Map(
      loaded.canonicalReferences.map(
        (entry) => [entry.canonicalReferenceId, entry] as const,
      ),
    );
    const bindingsByCanonical = new Map<
      string,
      SynthesisReferenceBindingRecord
    >();
    for (const binding of loaded.acceptedBindings) {
      bindingsByCanonical.set(
        synthesisRepository.resolveEffectiveCanonicalReferenceId(
          binding.canonicalReferenceId,
        ),
        binding,
      );
    }
    const metadataRefs = new Set(sourceRefs);
    for (const reference of loaded.rawReferences) {
      const effectiveCanonicalId =
        synthesisRepository.resolveEffectiveCanonicalReferenceId(
          reference.canonicalReferenceId || "",
        ) ||
        reference.canonicalReferenceId ||
        reference.rawReferenceId;
      const binding = effectiveCanonicalId
        ? bindingsByCanonical.get(effectiveCanonicalId)
        : undefined;
      if (binding?.itemKey) {
        metadataRefs.add(
          sourceRefFromParts({
            libraryId: binding.libraryId,
            itemKey: binding.itemKey,
          }),
        );
      }
    }
    const sourceMetadataByRef = await runProfiledSynthesisPhase({
      profileRun: args.profileRun,
      phaseName: "load_source_metadata",
      run: async () =>
        new Map(
          (await registryInputsForSourceRefs(metadataRefs)).map(
            (input) => [paperRefForRegistryInput(input), input] as const,
          ),
        ),
      counters: (result) => ({
        requested_source_ref_count: metadataRefs.size,
        metadata_count: result.size,
      }),
    });
    const built = await runProfiledSynthesisPhase({
      profileRun: args.profileRun,
      phaseName: "build_graph_records",
      run: () => {
        const nodes = new Map<string, SynthesisCitationNodeRecord>();
        const titleForSourceRef = (sourceRef: string) => {
          const parsed = parsePaperRef(sourceRef);
          return (
            zoteroTitleForSourceRef(sourceRef) ||
            cleanString(sourceMetadataByRef.get(sourceRef)?.title) ||
            parsed?.itemKey ||
            sourceRef
          );
        };
        const yearForSourceRef = (sourceRef: string) =>
          cleanString(sourceMetadataByRef.get(sourceRef)?.year);
        const ensureSourceNode = (sourceRef: string) => {
          const parsed = parsePaperRef(sourceRef);
          nodes.set(sourceRef, {
            literatureItemId: sourceRef,
            nodeStatus: "active",
            hasZoteroBinding: Boolean(parsed?.itemKey),
            title: titleForSourceRef(sourceRef),
            year: yearForSourceRef(sourceRef),
            summaryJson: JSON.stringify({
              source_ref: sourceRef,
              cache_owner: "reference_sidecar",
            }),
            updatedAt: timestamp,
          });
        };
        for (const sourceRef of sourceRefs) {
          ensureSourceNode(sourceRef);
        }
        const edges: SynthesisCitationEdgeRecord[] = [];
        for (const reference of loaded.rawReferences) {
          const sourceRef = reference.sourceRef;
          ensureSourceNode(sourceRef);
          const effectiveCanonicalId =
            synthesisRepository.resolveEffectiveCanonicalReferenceId(
              reference.canonicalReferenceId || "",
            ) ||
            reference.canonicalReferenceId ||
            reference.rawReferenceId;
          const binding = effectiveCanonicalId
            ? bindingsByCanonical.get(effectiveCanonicalId)
            : undefined;
          const targetRef = binding?.itemKey
            ? sourceRefFromParts({
                libraryId: binding.libraryId,
                itemKey: binding.itemKey,
              })
            : effectiveCanonicalId;
          if (binding?.itemKey) {
            ensureSourceNode(targetRef);
          } else if (targetRef && !nodes.has(targetRef)) {
            const canonical = canonicalById.get(targetRef);
            nodes.set(targetRef, {
              literatureItemId: targetRef,
              nodeStatus: "active",
              hasZoteroBinding: false,
              title: canonical?.title || reference.parsedTitle || targetRef,
              year: canonical?.year || reference.year,
              summaryJson: JSON.stringify({
                canonical_reference_id: targetRef,
                cache_owner: "reference_sidecar",
              }),
              updatedAt: timestamp,
            });
          }
          edges.push({
            edgeId: `edge:${sidecarShortKey({
              source: sourceRef,
              raw: reference.rawReferenceId,
              target: targetRef,
            })}`,
            sourceLiteratureItemId: sourceRef,
            targetLiteratureItemId: targetRef,
            referenceInstanceId: reference.rawReferenceId,
            resolutionId: effectiveCanonicalId,
            edgeStatus: binding?.itemKey ? "accepted" : "unbound",
            rolesJson: "[]",
            weight: 1,
            createdAt: reference.createdAt || timestamp,
            updatedAt: timestamp,
          });
        }
        const lightweightMetrics = citationGraphLightMetricsForRecords({
          nodes,
          edges,
          timestamp,
        });
        return {
          nodes,
          edges,
          lightweightMetrics,
          sourceOwnership: edges.map((edge) => ({
            sourceLiteratureItemId: edge.sourceLiteratureItemId,
            edgeId: edge.edgeId,
            referenceInstanceId: edge.referenceInstanceId,
            targetLiteratureItemId: edge.targetLiteratureItemId,
            edgeStatus: edge.edgeStatus,
            updatedAt: timestamp,
          })),
          incomingGroups: edges
            .filter((edge) => edge.targetLiteratureItemId)
            .map((edge) => ({
              targetLiteratureItemId: edge.targetLiteratureItemId || "",
              sourceLiteratureItemId: edge.sourceLiteratureItemId,
              edgeId: edge.edgeId,
              referenceInstanceId: edge.referenceInstanceId,
              edgeStatus: edge.edgeStatus,
              updatedAt: timestamp,
            })),
        };
      },
      counters: (result) => ({
        node_count: result.nodes.size,
        edge_count: result.edges.length,
        metric_count: result.lightweightMetrics.length,
      }),
    });
    return { loaded, built, sourceRefs: Array.from(sourceRefs).sort() };
  }

  async function rebuildCitationGraphCacheFromSidecar(args: {
    timestamp: string;
    operationId?: string;
    profileRun?: SynthesisJobProfileRun;
  }) {
    const timestamp = args.timestamp;
    const { loaded, built } = await buildCitationGraphCacheRecordsFromSidecar({
      timestamp,
      profileRun: args.profileRun,
    });
    await runProfiledSynthesisPhase({
      profileRun: args.profileRun,
      phaseName: "replace_graph_cache",
      run: () => {
        synthesisRepository.replaceCitationGraphState({
          nodes: Array.from(built.nodes.values()),
          edges: built.edges,
          lightweightMetrics: built.lightweightMetrics,
          sourceOwnership: built.sourceOwnership,
          incomingGroups: built.incomingGroups,
        });
        return { nodes: built.nodes.size, edges: built.edges.length };
      },
      counters: (result) => result,
    });
    const metricsResult = await runProfiledSynthesisPhase({
      profileRun: args.profileRun,
      phaseName: "compute_complex_metrics",
      run: () =>
        refreshCitationGraphComplexMetricsFromCurrentGraph({
          timestamp,
        }),
      counters: (result) => ({
        graph_hash: result.graph_hash,
        metrics_hash: result.metrics_hash,
        metric_count: result.metric_count,
      }),
    });
    const sourceHash = await runProfiledSynthesisPhase({
      profileRun: args.profileRun,
      phaseName: "hash_and_commit",
      run: () => {
        const sourceHash = hashCanonicalJson({
          sidecar: loaded.artifactSidecars,
          raw: loaded.rawReferences,
          bindings: loaded.acceptedBindings,
        });
        synthesisRepository.upsertCacheBasis({
          cacheKey: "citation-graph:library",
          cacheKind: "citation_graph",
          scopeKind: "library",
          scopeRef: String(libraryId),
          status: "ready",
          basisKind: "reference_sidecar",
          basisValue: args.operationId || "",
          sourceHash,
          policyVersion: "reference-sidecar-v1",
          refreshedAt: timestamp,
          diagnosticsJson: "[]",
          updatedAt: timestamp,
        });
        return sourceHash;
      },
      counters: (sourceHash) => ({
        source_hash: sourceHash,
        node_count: built.nodes.size,
        edge_count: built.edges.length,
        metric_count: metricsResult.metric_count,
      }),
    });
    return {
      nodes: built.nodes.size,
      edges: built.edges.length,
      sourceHash,
      metricsHash: metricsResult.metrics_hash,
      metrics: metricsResult.metric_count,
    };
  }

  function sourceRefsForChangedCanonicalFacts(args: {
    changedCanonicalIds?: string[];
    changedBindingCanonicalIds?: string[];
    changedRedirectCanonicalIds?: string[];
  }) {
    const changed = new Set(
      [
        ...(args.changedCanonicalIds || []),
        ...(args.changedBindingCanonicalIds || []),
        ...(args.changedRedirectCanonicalIds || []),
      ]
        .map(cleanString)
        .filter(Boolean),
    );
    if (!changed.size) {
      return [];
    }
    const sourceRefs = new Set<string>();
    for (const raw of synthesisRepository.listRawReferences({
      statuses: ["active"],
    })) {
      const physical = cleanString(raw.canonicalReferenceId);
      const effective =
        synthesisRepository.resolveEffectiveCanonicalReferenceId(physical) ||
        physical;
      if (changed.has(physical) || changed.has(effective)) {
        sourceRefs.add(raw.sourceRef);
      }
    }
    return Array.from(sourceRefs).sort();
  }

  function canIncrementallyRefreshCitationGraph() {
    const basis = synthesisRepository.getCacheBasis("citation-graph:library");
    if (!basis || basis.status === "missing" || basis.status === "failed") {
      return false;
    }
    return synthesisRepository.listCitationNodes({ limit: 1 }).length > 0;
  }

  async function refreshCitationGraphCacheIncremental(
    args: {
      sourceRefs?: string[];
      changedCanonicalIds?: string[];
      changedBindingCanonicalIds?: string[];
      changedRedirectCanonicalIds?: string[];
      reason: string;
      allowFullBootstrap?: boolean;
    },
    progressOptions: WorkbenchProgressOptions = {},
  ) {
    const sourceRefs = new Set(
      (args.sourceRefs || []).map(cleanString).filter(Boolean),
    );
    for (const sourceRef of sourceRefsForChangedCanonicalFacts(args)) {
      sourceRefs.add(sourceRef);
    }
    const affectedSourceRefs = Array.from(sourceRefs).sort();
    const graphReadyForIncremental = canIncrementallyRefreshCitationGraph();
    if (!affectedSourceRefs.length && graphReadyForIncremental) {
      return {
        ok: true,
        status: "skipped",
        skipped_reason: "no_affected_sources",
        affected_source_refs: affectedSourceRefs,
      };
    }
    if (!graphReadyForIncremental && !args.allowFullBootstrap) {
      return {
        ok: true,
        status: "skipped",
        skipped_reason: "graph_cache_not_bootstrapped",
        affected_source_refs: affectedSourceRefs,
      };
    }
    const jobName = "synthesis:citation-graph-cache-incremental";
    const runId = `${jobName}:${now()}`;
    const label = "Citation graph cache incremental refresh";
    const source = "citation_graph_cache_incremental_refresh";
    const previousBasis = synthesisRepository.getCacheBasis(
      "citation-graph:library",
    );
    const phases = graphReadyForIncremental
      ? [
          "load_source_slice",
          "build_source_slice",
          "compute_complex_metrics",
          "commit",
        ]
      : ["full_bootstrap", "commit"];
    const reportPhase = async (
      phase: string,
      index: number,
      counts?: {
        processedCount?: number;
        totalCount?: number;
        progressMode?: "determinate" | "indeterminate";
      },
    ) => {
      reportSynthesisJobProgress({
        jobName,
        runId,
        source,
        label,
        status: "running",
        phase,
        phaseLabel: phase
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        processedCount: counts?.processedCount ?? index,
        totalCount: counts?.totalCount ?? phases.length,
        progressMode: counts?.progressMode ?? "determinate",
        diagnosticsJson: JSON.stringify([
          {
            code: "citation_graph_cache_incremental_refresh_progress",
            reason: cleanString(args.reason),
            affected_source_count: affectedSourceRefs.length,
            full_bootstrap: !graphReadyForIncremental,
          },
        ]),
      });
      await progressOptions.onProgress?.();
      await yieldToEventLoop();
    };
    let phaseIndex = 0;
    try {
      if (!graphReadyForIncremental) {
        await reportPhase("full_bootstrap", phaseIndex, {
          processedCount: 0,
          totalCount: 0,
          progressMode: "indeterminate",
        });
        const result = await lock.runExclusive(libraryId, () =>
          rebuildCitationGraphCacheFromSidecar({
            timestamp: now(),
            operationId: runId,
          }),
        );
        phaseIndex = 1;
        completeSynthesisJobProgress({
          jobName,
          runId,
          source,
          label,
          phase: "commit",
          phaseLabel: "Commit",
          processedCount: result.edges,
          totalCount: result.edges,
          progressMode: "determinate",
          message: "Citation graph cache bootstrap completed.",
        });
        await progressOptions.onProgress?.();
        return {
          ok: true,
          status: "bootstrapped",
          affected_source_refs: affectedSourceRefs,
          node_count: result.nodes,
          edge_count: result.edges,
          source_hash: result.sourceHash,
          metrics_hash: result.metricsHash,
          metric_count: result.metrics,
        };
      }

      await reportPhase("load_source_slice", phaseIndex, {
        processedCount: affectedSourceRefs.length,
        totalCount: affectedSourceRefs.length,
      });
      phaseIndex = 1;
      const built = await lock.runExclusive(libraryId, async () => {
        const timestamp = now();
        const records = await buildCitationGraphCacheRecordsFromSidecar({
          timestamp,
          sourceRefs: affectedSourceRefs,
        });
        await reportPhase("build_source_slice", phaseIndex, {
          processedCount: records.built.edges.length,
          totalCount: Math.max(records.built.edges.length, 1),
        });
        synthesisRepository.replaceCitationGraphSourceSlice({
          sourceLiteratureItemIds: affectedSourceRefs,
          nodes: Array.from(records.built.nodes.values()),
          edges: records.built.edges,
          sourceOwnership: records.built.sourceOwnership,
          incomingGroups: records.built.incomingGroups,
          updatedAt: timestamp,
        });
        const sourceHash = hashCanonicalJson({
          previous_graph_basis: previousBasis?.sourceHash || "",
          reason: cleanString(args.reason),
          affected_source_refs: affectedSourceRefs,
          changed_canonical_ids: (args.changedCanonicalIds || [])
            .map(cleanString)
            .filter(Boolean)
            .sort(),
          changed_binding_canonical_ids: (args.changedBindingCanonicalIds || [])
            .map(cleanString)
            .filter(Boolean)
            .sort(),
          changed_redirect_canonical_ids: (
            args.changedRedirectCanonicalIds || []
          )
            .map(cleanString)
            .filter(Boolean)
            .sort(),
          policy: "citation-graph-incremental-v1",
        });
        synthesisRepository.upsertCacheBasis({
          cacheKey: "citation-graph:library",
          cacheKind: "citation_graph",
          scopeKind: "library",
          scopeRef: String(libraryId),
          status: "ready",
          basisKind: "reference_sidecar_incremental",
          basisValue: runId,
          sourceHash,
          policyVersion: "citation-graph-incremental-v1",
          refreshedAt: timestamp,
          diagnosticsJson: "[]",
          updatedAt: timestamp,
        });
        phaseIndex = 2;
        await reportPhase("compute_complex_metrics", phaseIndex, {
          processedCount: records.built.nodes.size,
          totalCount: Math.max(records.built.nodes.size, 1),
        });
        const metricsResult =
          refreshCitationGraphComplexMetricsFromCurrentGraph({
            timestamp,
          });
        return {
          nodes: records.built.nodes.size,
          edges: records.built.edges.length,
          sourceHash,
          metricsHash: metricsResult.metrics_hash,
          metrics: metricsResult.metric_count,
        };
      });
      phaseIndex = 3;
      completeSynthesisJobProgress({
        jobName,
        runId,
        source,
        label,
        phase: "commit",
        phaseLabel: "Commit",
        processedCount: built.edges,
        totalCount: built.edges,
        progressMode: "determinate",
        message: "Citation graph cache incremental refresh completed.",
        diagnosticsJson: JSON.stringify([
          {
            code: "citation_graph_cache_incremental_refresh_completed",
            affected_source_count: affectedSourceRefs.length,
            node_count: built.nodes,
            edge_count: built.edges,
            metrics_hash: built.metricsHash,
            metric_count: built.metrics,
          },
        ]),
      });
      await progressOptions.onProgress?.();
      return {
        ok: true,
        status: "completed",
        affected_source_count: affectedSourceRefs.length,
        affected_source_refs: affectedSourceRefs,
        node_count: built.nodes,
        edge_count: built.edges,
        source_hash: built.sourceHash,
        metrics_hash: built.metricsHash,
        metric_count: built.metrics,
      };
    } catch (error) {
      const diagnostic = referenceSidecarDiagnostic({
        code: "citation_graph_cache_incremental_refresh_failed",
        severity: "error",
        message: errorMessage(error),
      });
      failSynthesisJobProgress({
        jobName,
        runId,
        source,
        label,
        phase: phases[Math.min(phaseIndex, phases.length - 1)] || "failed",
        processedCount: phaseIndex,
        totalCount: phases.length,
        progressMode: "determinate",
        diagnosticsJson: JSON.stringify([diagnostic]),
        message: "Citation graph cache incremental refresh failed.",
      });
      const timestamp = now();
      const hasRows =
        synthesisRepository.listCitationNodes({ limit: 1 }).length > 0;
      synthesisRepository.upsertCacheBasis({
        cacheKey: "citation-graph:library",
        cacheKind: "citation_graph",
        scopeKind: "library",
        scopeRef: String(libraryId),
        status: hasRows ? "stale" : "failed",
        basisKind: "reference_sidecar_incremental",
        basisValue: runId,
        sourceHash: previousBasis?.sourceHash || "",
        policyVersion: "citation-graph-incremental-v1",
        staleReason: hasRows ? "incremental_refresh_failed" : undefined,
        activeOperationId: runId,
        diagnosticsJson: JSON.stringify(
          citationGraphStaleDiagnostics({
            source: "incremental_refresh_failed",
            diagnostics: [diagnostic],
            sourceRefs: affectedSourceRefs,
            changedCanonicalIds: args.changedCanonicalIds,
            changedBindingCanonicalIds: args.changedBindingCanonicalIds,
            changedRedirectCanonicalIds: args.changedRedirectCanonicalIds,
          }),
        ),
        updatedAt: timestamp,
      });
      await progressOptions.onProgress?.();
      return {
        ok: false,
        status: "failed",
        affected_source_refs: affectedSourceRefs,
        diagnostics: [diagnostic],
      };
    }
  }

  async function refreshReferenceSidecarNow(
    progressOptions: WorkbenchProgressOptions = {},
  ) {
    const jobName = "synthesis:reference-sidecar";
    const runId = `${jobName}:${now()}`;
    const profileRun = maybeStartSynthesisJobProfileRun({
      root,
      jobName,
      trigger: "reference_sidecar_refresh",
    });
    const sidecarPhases = [
      "artifact_scan",
      "reference_diff",
      "reference_extract",
      "canonicalize",
      "binding_best_effort",
      "commit",
    ];
    let sidecarPhaseIndex = 0;
    const reportReferenceSidecarPhase = async (
      phase: string,
      index: number,
      counts?: {
        processedCount?: number;
        totalCount?: number;
        progressMode?: "determinate" | "indeterminate";
      },
    ) => {
      sidecarPhaseIndex = index;
      reportSynthesisJobProgress({
        jobName,
        runId,
        source: "reference_sidecar_refresh",
        label: "Reference sidecar refresh",
        status: "running",
        phase,
        phaseLabel: phase
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        processedCount: counts?.processedCount ?? index,
        totalCount: counts?.totalCount ?? sidecarPhases.length,
        progressMode: counts?.progressMode ?? "determinate",
      });
      await progressOptions.onProgress?.();
      await yieldToEventLoop();
    };
    if (referenceSidecarRefreshRunning) {
      return peekReferenceSidecarCacheStatus();
    }
    referenceSidecarRefreshRunning = true;
    const maintenance = beginCanonicalMaintenanceWorker(
      "reference-sidecar-refresh",
    );
    try {
      await reportReferenceSidecarPhase("artifact_scan", 0, {
        processedCount: 0,
        totalCount: 0,
        progressMode: "indeterminate",
      });
      const scan = await runProfiledSynthesisPhase({
        profileRun,
        phaseName: "artifact_scan",
        run: () => scanReferenceSidecarArtifacts(),
        counters: (result) => ({
          artifact_count: result.artifacts.length,
          diagnostic_count: result.diagnostics?.length || 0,
        }),
      });
      await reportReferenceSidecarPhase("reference_diff", 1, {
        processedCount: scan.artifacts.length,
        totalCount: scan.artifacts.length,
        progressMode: "determinate",
      });
      const changedReferenceArtifacts = await runProfiledSynthesisPhase({
        profileRun,
        phaseName: "reference_diff",
        run: () =>
          lock.runExclusive(libraryId, () =>
            upsertArtifactSidecarsFromScan({
              artifacts: scan.artifacts,
              timestamp: now(),
            }),
          ),
        counters: (result) => ({
          scanned_artifact_count: scan.artifacts.length,
          changed_reference_artifact_count: result.length,
        }),
      });
      const bindingMatchItems =
        scan.sourceItems ||
        options.registryInputs ||
        options.citationGraphPapers ||
        [];
      const changedReferenceSourceRefs = citationGraphDeltaStrings(
        changedReferenceArtifacts.map(
          (artifact) => artifactSourceParts(artifact).sourceRef,
        ),
      );
      await reportReferenceSidecarPhase("reference_extract", 2, {
        processedCount: 0,
        totalCount: changedReferenceArtifacts.length,
        progressMode:
          changedReferenceArtifacts.length > 0
            ? "determinate"
            : "indeterminate",
      });
      let extracted = 0;
      let matched = 0;
      let processedChangedArtifacts = 0;
      const changedBindingCanonicalIds = new Set<string>();
      await runProfiledSynthesisPhase({
        profileRun,
        phaseName: "reference_extract",
        run: () =>
          lock.runExclusive(libraryId, () => {
            const timestamp = now();
            for (const artifact of changedReferenceArtifacts) {
              processedChangedArtifacts += 1;
              const source = artifactSourceParts(artifact);
              const artifactHash =
                cleanString(artifact.payload_hash) ||
                cleanString(artifact.hash);
              if (artifact.status !== "available" || !artifactHash) {
                const stale =
                  synthesisRepository.markRawReferencesStaleForSource({
                    sourceRef: source.sourceRef,
                    timestamp,
                  });
                reconcileStaleCanonicalsForSource({
                  sourceRef: source.sourceRef,
                  stale,
                  timestamp,
                });
                continue;
              }
              const result = replaceReferenceSidecarForSourceRef({
                sourceRef: source.sourceRef,
                referencesArtifactHash: artifactHash,
                references: referencesFromArtifactPayload(artifact.payload),
                matchedItems: bindingMatchItems,
                reviewer: "reference-sidecar-refresh",
                timestamp,
              });
              extracted += result.reference_count;
              matched += result.matched_count;
              for (const canonicalId of result.changedBindingCanonicalIds) {
                changedBindingCanonicalIds.add(canonicalId);
              }
            }
            return { extracted, matched, processedChangedArtifacts };
          }),
        counters: (result) => ({
          processed_changed_artifact_count: result.processedChangedArtifacts,
          extracted_reference_count: result.extracted,
          matched_reference_count: result.matched,
        }),
      });
      await runProfiledSynthesisPhase({
        profileRun,
        phaseName: "canonicalize",
        run: async () => {
          await reportReferenceSidecarPhase("canonicalize", 3, {
            processedCount: extracted,
            totalCount: extracted,
            progressMode: "determinate",
          });
          await yieldToEventLoop();
          return { extracted };
        },
        counters: (result) => ({
          extracted_reference_count: result.extracted,
        }),
      });
      await runProfiledSynthesisPhase({
        profileRun,
        phaseName: "binding_best_effort",
        run: async () => {
          await reportReferenceSidecarPhase("binding_best_effort", 4, {
            processedCount: matched,
            totalCount: extracted,
            progressMode: "determinate",
          });
          await yieldToEventLoop();
          return { extracted, matched };
        },
        counters: (result) => ({
          extracted_reference_count: result.extracted,
          matched_reference_count: result.matched,
        }),
      });
      const commitResult = await runProfiledSynthesisPhase({
        profileRun,
        phaseName: "commit",
        run: () => {
          maintenance.markCanonicalMutation();
          const sourceHash = hashCanonicalJson({
            artifacts: scan.artifacts.map((artifact) => [
              artifact.paper_ref,
              artifact.artifact_type,
              artifact.status,
              artifact.payload_hash || artifact.hash || "",
            ]),
          });
          const timestamp = now();
          synthesisRepository.upsertCacheBasis({
            cacheKey: "reference-sidecar:library",
            cacheKind: "reference_sidecar",
            scopeKind: "library",
            scopeRef: String(libraryId),
            status: "ready",
            basisKind: "artifact_sidecar_hash",
            basisValue: runId,
            sourceHash,
            policyVersion: "reference-sidecar-v1",
            refreshedAt: timestamp,
            diagnosticsJson: JSON.stringify(scan.diagnostics || []),
            updatedAt: timestamp,
          });
          markCitationGraphLibraryCacheStale({
            source: "reference_sidecar_refreshed",
            sourceRefs: changedReferenceSourceRefs,
            changedBindingCanonicalIds: Array.from(changedBindingCanonicalIds),
            timestamp,
          });
          markRelatedItemsSyncCacheStaleForSidecarChange({
            sourceRefs: changedReferenceSourceRefs,
            changedBindingCanonicalIds: Array.from(changedBindingCanonicalIds),
            source: "reference_sidecar_refresh",
            timestamp,
          });
          return { sourceHash };
        },
        counters: (result) => ({
          source_hash: result.sourceHash,
          scanned_artifact_count: scan.artifacts.length,
          changed_reference_artifact_count: changedReferenceArtifacts.length,
          extracted_reference_count: extracted,
          matched_reference_count: matched,
        }),
      });
      referenceSidecarRefreshRunning = false;
      completeSynthesisJobProgress({
        jobName,
        runId,
        source: "reference_sidecar_refresh",
        label: "Reference sidecar refresh",
        phase: "commit",
        phaseLabel: "Commit",
        processedCount: processedChangedArtifacts,
        totalCount: changedReferenceArtifacts.length,
        progressMode: "determinate",
        message: "Reference sidecar refresh completed.",
      });
      await profileRun.finish({
        status: "completed",
        processedCount: processedChangedArtifacts,
        counters: {
          source_hash: commitResult.sourceHash,
          scanned_artifact_count: scan.artifacts.length,
          changed_reference_artifact_count: changedReferenceArtifacts.length,
          extracted_reference_count: extracted,
          matched_reference_count: matched,
        },
      });
      return peekReferenceSidecarCacheStatus();
    } catch (error) {
      const diagnostic = referenceSidecarDiagnostic({
        code: "reference_sidecar_refresh_failed",
        severity: "error",
        message: errorMessage(error),
      });
      referenceSidecarRefreshRunning = false;
      failSynthesisJobProgress({
        jobName,
        runId,
        source: "reference_sidecar_refresh",
        label: "Reference sidecar refresh",
        processedCount: sidecarPhaseIndex,
        totalCount: sidecarPhases.length,
        progressMode: "determinate",
        diagnosticsJson: JSON.stringify([diagnostic]),
        message: "Reference sidecar refresh failed.",
      });
      const previousSidecar = synthesisRepository.getCacheBasis(
        "reference-sidecar:library",
      );
      if (previousSidecar?.status !== "ready") {
        const timestamp = now();
        synthesisRepository.upsertCacheBasis({
          cacheKey: "reference-sidecar:library",
          cacheKind: "reference_sidecar",
          scopeKind: "library",
          scopeRef: String(libraryId),
          status: "failed",
          basisKind: "artifact_sidecar_hash",
          basisValue: runId,
          activeOperationId: runId,
          diagnosticsJson: JSON.stringify([diagnostic]),
          updatedAt: timestamp,
        });
      }
      await profileRun.finish({
        status: "failed_terminal",
        processedCount: sidecarPhaseIndex,
        failedCount: 1,
        counters: {
          phase_index: sidecarPhaseIndex,
        },
        diagnostics: [diagnostic],
      });
      return peekReferenceSidecarCacheStatus();
    } finally {
      maintenance.finish();
    }
  }

  async function retryReferenceSidecarRefresh() {
    return refreshReferenceSidecarNow();
  }

  async function runAdvancedReferenceMatchingNow(
    progressOptions: WorkbenchProgressOptions = {},
  ) {
    const jobName = "synthesis:advanced-reference-matching";
    const runId = `${jobName}:${now()}`;
    if (advancedReferenceMatchingRunning) {
      return { ok: true, status: "already_running", operation_id: runId };
    }
    advancedReferenceMatchingRunning = true;
    const timestamp = now();
    let processed = 0;
    let autoAccepted = 0;
    let proposalsCreated = 0;
    let bindingProposalsCreated = 0;
    let dedupeProcessed = 0;
    let dedupeRedirectsCreated = 0;
    let dedupeProposalsCreated = 0;
    let rejectedPreserved = 0;
    let graphFactsChanged = false;
    const changedBindingCanonicalIds = new Set<string>();
    const changedRedirectCanonicalIds = new Set<string>();
    const report = async (
      phase: string,
      processedCount: number,
      totalCount: number,
      extra: Record<string, unknown> = {},
    ) => {
      reportSynthesisJobProgress({
        jobName,
        runId,
        source: "advanced_reference_matching",
        label: "Advanced reference matching",
        status: "running",
        phase,
        phaseLabel: phase
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        processedCount,
        totalCount,
        progressMode: totalCount > 0 ? "determinate" : "indeterminate",
        diagnosticsJson: JSON.stringify([
          { code: "advanced_reference_matching_progress", ...extra },
        ]),
      });
      await progressOptions.onProgress?.();
      await yieldToEventLoop();
    };
    try {
      await report("load_inputs", 0, 0);
      const inputs = await registryInputsForService(options);
      const papers = inputs
        .map(referenceMatcherPaperFromInput)
        .filter((paper) => paper.paperRef && paper.title);
      const index = buildReferenceMatcherIndex(papers);
      const acceptedCanonicalIds = new Set(
        synthesisRepository
          .listReferenceBindings({ statuses: ["accepted"] })
          .map((binding) =>
            synthesisRepository.resolveEffectiveCanonicalReferenceId(
              binding.canonicalReferenceId,
            ),
          )
          .filter(Boolean),
      );
      const rawByCanonical = new Map<string, SynthesisRawReferenceRecord[]>();
      for (const raw of synthesisRepository.listRawReferences({
        statuses: ["active"],
      })) {
        const effective =
          synthesisRepository.resolveEffectiveCanonicalReferenceId(
            raw.canonicalReferenceId || "",
          );
        if (!effective || acceptedCanonicalIds.has(effective)) {
          continue;
        }
        rawByCanonical.set(effective, [
          ...(rawByCanonical.get(effective) || []),
          raw,
        ]);
      }
      const work = Array.from(rawByCanonical.entries()).sort((left, right) =>
        left[0].localeCompare(right[0]),
      );
      await report("match_references", 0, work.length, {
        indexed_paper_count: papers.length,
        candidate_reference_count: work.length,
      });
      for (const [canonicalReferenceId, rows] of work) {
        processed += 1;
        const raw = rows
          .slice()
          .sort(
            (left, right) =>
              left.sourceRef.localeCompare(right.sourceRef) ||
              left.referenceIndex - right.referenceIndex ||
              left.rawReferenceId.localeCompare(right.rawReferenceId),
          )[0];
        if (!raw) {
          continue;
        }
        const result = resolveReferenceWithPolicy(
          rawReferenceToMatcherInput(raw),
          index,
          "production",
        );
        const sourceHash = hashCanonicalJson({
          canonicalReferenceId,
          rawReferenceIds: rows.map((row) => row.rawReferenceId).sort(),
          rawHashes: rows.map((row) => row.rawHash).sort(),
        });
        if (
          result.status === "matched" &&
          (result.confidence === "deterministic" ||
            result.confidence === "high") &&
          result.suggestedCandidates[0]?.itemKey
        ) {
          const candidate = result.suggestedCandidates[0];
          const parsed = parsePaperRef(candidate.paperRef);
          const basisHash = hashCanonicalJson({
            status: result.status,
            confidence: result.confidence,
            target: candidate.paperRef,
            reasons: candidate.reasons,
            evidence: candidate.evidence,
          });
          synthesisRepository.upsertReferenceBinding(
            referenceBindingFromAdvancedMatch({
              canonicalReferenceId,
              libraryId: parsed?.libraryId || libraryId,
              itemKey: cleanString(candidate.itemKey),
              confidence: result.confidence,
              basisHash,
              diagnostics: result.diagnostics,
              timestamp,
            }),
          );
          autoAccepted += 1;
          acceptedCanonicalIds.add(canonicalReferenceId);
          changedBindingCanonicalIds.add(canonicalReferenceId);
          graphFactsChanged = true;
        } else if (
          result.status === "suggested" ||
          result.status === "ambiguous"
        ) {
          for (const candidate of result.suggestedCandidates.slice(0, 3)) {
            if (!candidate.itemKey) {
              continue;
            }
            const parsed = parsePaperRef(candidate.paperRef);
            const basisHash = hashCanonicalJson({
              status: result.status,
              confidence: result.confidence,
              target: candidate.paperRef,
              reasons: candidate.reasons,
              evidence: candidate.evidence,
            });
            if (
              synthesisRepository.hasRejectedReferenceMatchProposal({
                kind: "zotero_binding",
                basisHash,
                sourceHash,
              })
            ) {
              rejectedPreserved += 1;
              continue;
            }
            synthesisRepository.upsertReferenceMatchProposal(
              referenceMatchProposalRecord({
                kind: "zotero_binding",
                sourceCanonicalReferenceId: canonicalReferenceId,
                sourceRawReferenceIds: rows.map((row) => row.rawReferenceId),
                targetLibraryId: parsed?.libraryId || libraryId,
                targetItemKey: cleanString(candidate.itemKey),
                confidence: result.confidence,
                score: candidate.score,
                reasons: candidate.reasons,
                evidence: candidate.evidence,
                diagnostics: result.diagnostics,
                basisHash,
                sourceHash,
                timestamp,
              }),
            );
            proposalsCreated += 1;
            bindingProposalsCreated += 1;
          }
        }
        if (processed % 25 === 0) {
          await report("match_references", processed, work.length, {
            indexed_paper_count: papers.length,
            auto_accepted_count: autoAccepted,
            proposal_created_count: proposalsCreated,
            binding_proposal_created_count: bindingProposalsCreated,
            rejected_preserved_count: rejectedPreserved,
          });
        }
      }
      const canonicalById = new Map(
        synthesisRepository
          .listCanonicalReferences({ statuses: ["active"] })
          .map((canonical) => [canonical.canonicalReferenceId, canonical]),
      );
      const inboundRedirectTargets = new Set(
        synthesisRepository
          .listCanonicalReferenceRedirects()
          .map((redirect) =>
            synthesisRepository.resolveEffectiveCanonicalReferenceId(
              redirect.toCanonicalReferenceId,
            ),
          )
          .filter(Boolean),
      );
      const dedupeInputs = work
        .filter(
          ([canonicalReferenceId]) =>
            !acceptedCanonicalIds.has(canonicalReferenceId),
        )
        .map(([canonicalReferenceId, rows]) =>
          canonicalDedupeInputFromRows({
            canonicalReferenceId,
            rows,
            canonical: canonicalById.get(canonicalReferenceId),
            canonicalById,
            inboundRedirectTargets,
          }),
        );
      await report("dedupe_canonicals", 0, dedupeInputs.length, {
        canonical_dedupe_candidate_count: dedupeInputs.length,
        auto_accepted_count: autoAccepted,
        binding_proposal_created_count: bindingProposalsCreated,
      });
      const dedupeInputById = new Map(
        dedupeInputs.map((input) => [input.canonicalReferenceId, input]),
      );
      const dedupeResult = dedupeCanonicalReferencesClustered(dedupeInputs);
      const dedupeActions = dedupeResult.actions;
      for (const action of dedupeActions) {
        dedupeProcessed += 1;
        const sourceInput = dedupeInputById.get(
          action.sourceCanonicalReferenceId,
        );
        const sourceRawReferenceIds = sourceInput?.rawReferenceIds || [];
        const evidence = {
          ...action.evidence,
          cluster_id: action.clusterId,
          subcluster_id: action.subclusterId,
          edge_type: action.edgeType,
          risk_signals: action.riskSignals,
          action_id: action.actionId,
        };
        const basisHash = hashCanonicalJson({
          kind: "canonical_merge",
          policy: "cluster-dedupe-v1",
          action: action.action,
          source: action.sourceCanonicalReferenceId,
          target: action.targetCanonicalReferenceId,
          clusterId: action.clusterId,
          subclusterId: action.subclusterId,
          edgeType: action.edgeType,
          confidence: action.confidence,
          score: action.score,
          reasons: action.reasons,
          riskSignals: action.riskSignals,
          evidence,
        });
        const sourceHash = hashCanonicalJson({
          policy: "cluster-dedupe-v1",
          canonicalReferenceId: action.sourceCanonicalReferenceId,
          rawReferenceIds: sourceRawReferenceIds,
          rawHashes: sourceInput?.rawHashes || [],
        });
        const diagnostics = [
          {
            code:
              action.action === "redirect"
                ? "advanced_reference_cluster_dedupe_redirect"
                : "advanced_reference_cluster_dedupe_review",
            edge_type: action.edgeType,
            cluster_id: action.clusterId,
            risk_signals: action.riskSignals,
            reasons: action.reasons,
          },
        ];
        if (action.action === "redirect") {
          synthesisRepository.upsertCanonicalReferenceRedirect({
            fromCanonicalReferenceId: action.sourceCanonicalReferenceId,
            toCanonicalReferenceId: action.targetCanonicalReferenceId,
            reason: "advanced_reference_dedupe",
            diagnosticsJson: JSON.stringify(diagnostics),
            createdAt: timestamp,
            updatedAt: timestamp,
          });
          dedupeRedirectsCreated += 1;
          changedRedirectCanonicalIds.add(action.sourceCanonicalReferenceId);
          changedRedirectCanonicalIds.add(action.targetCanonicalReferenceId);
          graphFactsChanged = true;
        } else {
          if (
            synthesisRepository.hasRejectedReferenceMatchProposal({
              kind: "canonical_merge",
              basisHash,
              sourceHash,
            })
          ) {
            rejectedPreserved += 1;
            continue;
          }
          synthesisRepository.upsertReferenceMatchProposal(
            referenceMatchProposalRecord({
              kind: "canonical_merge",
              sourceCanonicalReferenceId: action.sourceCanonicalReferenceId,
              sourceRawReferenceIds,
              targetCanonicalReferenceId: action.targetCanonicalReferenceId,
              confidence: action.confidence,
              score: action.score,
              reasons: action.reasons,
              evidence,
              diagnostics,
              basisHash,
              sourceHash,
              timestamp,
            }),
          );
          proposalsCreated += 1;
          dedupeProposalsCreated += 1;
        }
        if (dedupeProcessed % 25 === 0) {
          await report(
            "dedupe_canonicals",
            dedupeProcessed,
            dedupeActions.length,
            {
              canonical_dedupe_redirect_count: dedupeRedirectsCreated,
              canonical_merge_proposal_created_count: dedupeProposalsCreated,
              rejected_preserved_count: rejectedPreserved,
              cluster_redirect_action_count:
                dedupeResult.counters.redirect_action_count,
              cluster_review_action_count:
                dedupeResult.counters.review_action_count,
              ...dedupeResult.counters,
            },
          );
        }
      }
      completeSynthesisJobProgress({
        jobName,
        runId,
        source: "advanced_reference_matching",
        label: "Advanced reference matching",
        phase: "completed",
        phaseLabel: "Completed",
        processedCount: processed,
        totalCount: work.length,
        progressMode: "determinate",
        message: "Advanced reference matching completed.",
        diagnosticsJson: JSON.stringify([
          {
            code: "advanced_reference_matching_completed",
            indexed_paper_count: papers.length,
            processed_reference_count: processed,
            auto_accepted_count: autoAccepted,
            proposal_created_count: proposalsCreated,
            binding_proposal_created_count: bindingProposalsCreated,
            canonical_dedupe_processed_count: dedupeProcessed,
            canonical_dedupe_redirect_count: dedupeRedirectsCreated,
            canonical_merge_proposal_created_count: dedupeProposalsCreated,
            rejected_preserved_count: rejectedPreserved,
            canonical_dedupe: {
              algorithm: "cluster-dedupe-v1",
              ...dedupeResult.counters,
            },
          },
        ]),
      });
      if (graphFactsChanged) {
        try {
          await refreshCitationGraphCacheIncremental(
            {
              changedBindingCanonicalIds: Array.from(
                changedBindingCanonicalIds,
              ),
              changedRedirectCanonicalIds: Array.from(
                changedRedirectCanonicalIds,
              ),
              reason: `advanced-reference-matching:${sidecarShortKey({
                runId,
                autoAccepted,
                proposalsCreated,
                dedupeRedirectsCreated,
                dedupeProposalsCreated,
              })}`,
              allowFullBootstrap: true,
            },
            progressOptions,
          );
        } catch {
          // Related-items sync can fall back to sidecar facts when graph refresh
          // fails or graph cache is unavailable.
        }
        await syncRelatedItemsAfterSynthesisUpdate({
          reason: "advanced_reference_matching",
          onProgress: progressOptions.onProgress,
        });
      }
      return {
        ok: true,
        status: "completed",
        indexed_paper_count: papers.length,
        processed_reference_count: processed,
        auto_accepted_count: autoAccepted,
        proposal_created_count: proposalsCreated,
        binding_proposal_created_count: bindingProposalsCreated,
        canonical_dedupe_processed_count: dedupeProcessed,
        canonical_dedupe_redirect_count: dedupeRedirectsCreated,
        canonical_merge_proposal_created_count: dedupeProposalsCreated,
        rejected_preserved_count: rejectedPreserved,
      };
    } catch (error) {
      failSynthesisJobProgress({
        jobName,
        runId,
        source: "advanced_reference_matching",
        label: "Advanced reference matching",
        phase: "failed",
        phaseLabel: "Failed",
        processedCount: processed,
        totalCount: processed,
        progressMode: "determinate",
        message: errorMessage(error),
        diagnosticsJson: JSON.stringify([
          {
            code: "advanced_reference_matching_failed",
            severity: "error",
            message: errorMessage(error),
          },
        ]),
      });
      throw error;
    } finally {
      advancedReferenceMatchingRunning = false;
      await progressOptions.onProgress?.();
    }
  }

  async function retryAdvancedReferenceMatching(
    progressOptions: WorkbenchProgressOptions = {},
  ) {
    return runAdvancedReferenceMatchingNow(progressOptions);
  }

  type ReferenceMatchProposalActionInternalResult = Record<string, unknown> & {
    ok?: boolean;
    graphFactsChanged?: boolean;
    graphDelta?: CitationGraphFactDelta;
  };

  type ReferenceMatchProposalManualTarget =
    | { kind: "zotero_item"; libraryId?: number; itemKey?: string }
    | { kind: "canonical_reference"; canonicalReferenceId?: string };

  type ReferenceMatchProposalAction =
    | "accept"
    | "reverse_accept"
    | "reject"
    | "reopen"
    | "delete"
    | "manual_target";

  type ReferenceMatchProposalDecision = {
    proposalId: string;
    action: ReferenceMatchProposalAction;
    target?: ReferenceMatchProposalManualTarget;
  };

  function publicReferenceMatchProposalActionResult(
    result: ReferenceMatchProposalActionInternalResult,
  ) {
    const publicResult = { ...result };
    delete publicResult.graphFactsChanged;
    delete publicResult.graphDelta;
    return publicResult;
  }

  async function refreshGraphAfterReferenceMatchProposalDelta(args: {
    delta: Partial<CitationGraphFactDelta>;
    reason: string;
  }) {
    const delta = normalizedCitationGraphFactDelta(args.delta);
    if (!hasCitationGraphFactDelta(delta)) {
      return;
    }
    try {
      await refreshCitationGraphCacheIncremental({
        ...delta,
        reason: args.reason,
        allowFullBootstrap: true,
      });
    } catch {
      // The graph refresh operation records its own failure; proposal decisions
      // remain committed and related-items sync can read sidecar facts directly.
    }
    await syncRelatedItemsAfterSynthesisUpdate({
      reason: "reference_match_proposal",
    });
  }

  async function applyReferenceMatchProposalActionDecision(args: {
    proposalId: string;
    action: ReferenceMatchProposalAction;
    target?: ReferenceMatchProposalManualTarget;
  }): Promise<ReferenceMatchProposalActionInternalResult> {
    const proposal = synthesisRepository.listReferenceMatchProposals({
      proposalIds: [args.proposalId],
      limit: 1,
    })[0];
    if (!proposal) {
      return {
        ok: false,
        status: "missing",
        diagnostics: [
          {
            code: "reference_match_proposal_missing",
            severity: "error",
            message: "Reference match proposal was not found.",
          },
        ],
      };
    }
    const timestamp = now();
    const bindingIdForProposal = () =>
      `binding:${sidecarShortKey({
        canonical: proposal.sourceCanonicalReferenceId,
        library: proposal.targetLibraryId || libraryId,
        item: proposal.targetItemKey,
      })}`;
    const revokeAcceptedProposalFact = () => {
      if (proposal.kind === "canonical_merge") {
        const sourceCanonicalId = proposal.sourceCanonicalReferenceId;
        const targetCanonicalId = cleanString(
          proposal.targetCanonicalReferenceId,
        );
        const forward =
          synthesisRepository.deleteCanonicalReferenceRedirect({
            fromCanonicalReferenceId: sourceCanonicalId,
            toCanonicalReferenceId: targetCanonicalId,
          }) || 0;
        const reverse =
          synthesisRepository.deleteCanonicalReferenceRedirect({
            fromCanonicalReferenceId: targetCanonicalId,
            toCanonicalReferenceId: sourceCanonicalId,
          }) || 0;
        return forward + reverse;
      }
      return synthesisRepository.deleteReferenceBinding({
        bindingId: bindingIdForProposal(),
        basisHash: proposal.basisHash,
      });
    };
    const graphDeltaForProposal = (): CitationGraphFactDelta =>
      normalizedCitationGraphFactDelta(
        proposal.kind === "canonical_merge"
          ? {
              changedCanonicalIds: [
                proposal.sourceCanonicalReferenceId,
                cleanString(proposal.targetCanonicalReferenceId),
              ],
              changedRedirectCanonicalIds: [
                proposal.sourceCanonicalReferenceId,
                cleanString(proposal.targetCanonicalReferenceId),
              ],
            }
          : {
              changedCanonicalIds: [proposal.sourceCanonicalReferenceId],
              changedBindingCanonicalIds: [proposal.sourceCanonicalReferenceId],
            },
      );
    const rawReferenceIdsForCanonical = (canonicalReferenceId: string) => {
      const effective =
        synthesisRepository.resolveEffectiveCanonicalReferenceId(
          cleanString(canonicalReferenceId),
        );
      return synthesisRepository
        .listRawReferences({
          statuses: ["active"],
          limit: 0,
        })
        .filter((raw) => {
          const rawCanonicalReferenceId = cleanString(raw.canonicalReferenceId);
          return (
            Boolean(rawCanonicalReferenceId) &&
            synthesisRepository.resolveEffectiveCanonicalReferenceId(
              rawCanonicalReferenceId,
            ) === effective
          );
        })
        .map((raw) => cleanString(raw.rawReferenceId))
        .filter(Boolean);
    };
    const upsertManualAuditProposal = (
      audit: Omit<
        Parameters<typeof referenceMatchProposalRecord>[0],
        | "confidence"
        | "score"
        | "reasons"
        | "evidence"
        | "diagnostics"
        | "basisHash"
        | "sourceHash"
        | "timestamp"
      > & {
        confidence?: string;
        score?: number;
        reasons?: string[];
        evidence?: Record<string, unknown>;
        diagnostics?: unknown[];
      },
    ) => {
      const basisHash = hashCanonicalJson({
        kind: audit.kind,
        policy: "manual-reference-match-target-v1",
        source: audit.sourceCanonicalReferenceId,
        target:
          audit.kind === "canonical_merge"
            ? audit.targetCanonicalReferenceId
            : sourceRefFromParts({
                libraryId: audit.targetLibraryId || libraryId,
                itemKey: cleanString(audit.targetItemKey),
              }),
        original_proposal_id: proposal.proposalId,
      });
      const auditEvidence = audit.evidence || {};
      const targetEvidence =
        audit.kind === "canonical_merge"
          ? canonicalReferenceEvidenceForUi(audit.targetCanonicalReferenceId)
          : (() => {
              const paperRef = sourceRefFromParts({
                libraryId: audit.targetLibraryId || libraryId,
                itemKey: cleanString(audit.targetItemKey),
              });
              return {
                projected_literature_item_id: paperRef,
                paper_ref: paperRef,
                title: zoteroTitleForSourceRef(paperRef) || paperRef,
              };
            })();
      synthesisRepository.upsertReferenceMatchProposal({
        ...referenceMatchProposalRecord({
          kind: audit.kind,
          sourceCanonicalReferenceId: audit.sourceCanonicalReferenceId,
          sourceRawReferenceIds: audit.sourceRawReferenceIds,
          targetCanonicalReferenceId: audit.targetCanonicalReferenceId,
          targetLibraryId: audit.targetLibraryId,
          targetItemKey: audit.targetItemKey,
          confidence: audit.confidence || "manual",
          score: audit.score || 1,
          reasons: audit.reasons || ["manual_target"],
          evidence: {
            ...auditEvidence,
            source: {
              ...canonicalReferenceEvidenceForUi(
                audit.sourceCanonicalReferenceId,
                { resolveEffective: false },
              ),
              ...(isRecord(auditEvidence.source) ? auditEvidence.source : {}),
            },
            target: {
              ...targetEvidence,
              ...(isRecord(auditEvidence.target) ? auditEvidence.target : {}),
            },
            original_proposal_id: proposal.proposalId,
            manual_target: true,
          },
          diagnostics: audit.diagnostics || [
            {
              code: "reference_match_manual_target",
              original_proposal_id: proposal.proposalId,
            },
          ],
          basisHash,
          sourceHash:
            proposal.sourceHash ||
            hashCanonicalJson({
              source: audit.sourceCanonicalReferenceId,
              original_proposal_id: proposal.proposalId,
            }),
          timestamp,
        }),
        status: "accepted",
      });
    };
    if (args.action === "manual_target") {
      if (!args.target) {
        return {
          ok: false,
          status: "invalid_target",
          proposal_id: proposal.proposalId,
          diagnostics: [
            {
              code: "reference_match_manual_target_missing",
              severity: "error",
              message: "Manual target decision requires a target.",
            },
          ],
        };
      }
      if (proposal.kind === "zotero_binding") {
        if (args.target.kind !== "zotero_item") {
          return {
            ok: false,
            status: "invalid_target",
            proposal_id: proposal.proposalId,
            diagnostics: [
              {
                code: "reference_match_manual_binding_target_invalid",
                severity: "error",
                message:
                  "Zotero binding proposals require a Zotero item target.",
              },
            ],
          };
        }
        const targetLibraryId =
          normalizeLibraryId(args.target.libraryId) || libraryId;
        const targetItemKey = cleanString(args.target.itemKey);
        const targetInput =
          targetItemKey && options.libraryAdapter?.getRegistryInputForItem
            ? await options.libraryAdapter.getRegistryInputForItem({
                libraryId: targetLibraryId,
                itemKey: targetItemKey,
              })
            : null;
        const fallbackTargetInput =
          targetInput ||
          (await registryInputsForSourceRefs(
            new Set([
              sourceRefFromParts({
                libraryId: targetLibraryId,
                itemKey: targetItemKey,
              }),
            ]),
          ).then((rows) => rows[0] || null));
        if (!targetItemKey || !fallbackTargetInput) {
          return {
            ok: false,
            status: "invalid_target",
            proposal_id: proposal.proposalId,
            diagnostics: [
              {
                code: "reference_match_manual_zotero_target_missing",
                severity: "error",
                message: "Manual target Zotero item was not found.",
              },
            ],
          };
        }
        if (proposal.status === "accepted") {
          revokeAcceptedProposalFact();
        }
        const basisHash = hashCanonicalJson({
          kind: "manual_zotero_binding",
          source: proposal.sourceCanonicalReferenceId,
          target: sourceRefFromParts({
            libraryId: targetLibraryId,
            itemKey: targetItemKey,
          }),
          original_proposal_id: proposal.proposalId,
        });
        synthesisRepository.upsertReferenceBinding({
          bindingId: `binding:${sidecarShortKey({
            canonical: proposal.sourceCanonicalReferenceId,
            library: targetLibraryId,
            item: targetItemKey,
          })}`,
          canonicalReferenceId: proposal.sourceCanonicalReferenceId,
          libraryId: targetLibraryId,
          itemKey: targetItemKey,
          status: "accepted",
          confidence: "manual",
          reviewer: "advanced-reference-matching-manual",
          basisHash,
          diagnosticsJson: JSON.stringify([
            {
              code: "reference_match_manual_target_binding",
              original_proposal_id: proposal.proposalId,
            },
          ]),
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        upsertManualAuditProposal({
          kind: "zotero_binding",
          sourceCanonicalReferenceId: proposal.sourceCanonicalReferenceId,
          sourceRawReferenceIds: parseJsonArray(
            proposal.sourceRawReferenceIdsJson,
          )
            .map(cleanString)
            .filter(Boolean),
          targetLibraryId,
          targetItemKey,
          evidence: {
            target: {
              title: cleanString(fallbackTargetInput.title),
              projected_literature_item_id: sourceRefFromParts({
                libraryId: targetLibraryId,
                itemKey: targetItemKey,
              }),
            },
          },
        });
        synthesisRepository.updateReferenceMatchProposalStatus({
          proposalId: proposal.proposalId,
          status: "retargeted",
          timestamp,
        });
        return {
          ok: true,
          status: "retargeted",
          proposal_id: proposal.proposalId,
          graphFactsChanged: true,
          graphDelta: normalizedCitationGraphFactDelta({
            changedCanonicalIds: [proposal.sourceCanonicalReferenceId],
            changedBindingCanonicalIds: [proposal.sourceCanonicalReferenceId],
          }),
        };
      }
      if (args.target.kind !== "canonical_reference") {
        return {
          ok: false,
          status: "invalid_target",
          proposal_id: proposal.proposalId,
          diagnostics: [
            {
              code: "reference_match_manual_merge_target_invalid",
              severity: "error",
              message:
                "Canonical merge proposals require a canonical reference target.",
            },
          ],
        };
      }
      const sourceCanonicalId = proposal.sourceCanonicalReferenceId;
      const originalTargetCanonicalId = cleanString(
        proposal.targetCanonicalReferenceId,
      );
      const selectedTargetCanonicalId = cleanString(
        args.target.canonicalReferenceId,
      );
      const selectedCanonical = synthesisRepository.listCanonicalReferences({
        canonicalReferenceIds: [selectedTargetCanonicalId],
        statuses: ["active"],
      })[0];
      const effectiveSelected =
        synthesisRepository.resolveEffectiveCanonicalReferenceId(
          selectedTargetCanonicalId,
        );
      const effectiveSource =
        synthesisRepository.resolveEffectiveCanonicalReferenceId(
          sourceCanonicalId,
        );
      const effectiveOriginalTarget = originalTargetCanonicalId
        ? synthesisRepository.resolveEffectiveCanonicalReferenceId(
            originalTargetCanonicalId,
          )
        : "";
      if (
        !originalTargetCanonicalId ||
        !selectedCanonical ||
        !effectiveSelected ||
        effectiveSelected === effectiveSource ||
        effectiveSelected === effectiveOriginalTarget
      ) {
        return {
          ok: false,
          status: "invalid_target",
          proposal_id: proposal.proposalId,
          diagnostics: [
            {
              code: "reference_match_manual_canonical_target_invalid",
              severity: "error",
              message: "Manual canonical target is invalid for this proposal.",
            },
          ],
        };
      }
      if (proposal.status === "accepted") {
        revokeAcceptedProposalFact();
      }
      const diagnostics = [
        {
          code: "reference_match_manual_target_canonical_merge",
          original_proposal_id: proposal.proposalId,
          selected_target: selectedTargetCanonicalId,
        },
      ];
      for (const fromCanonicalId of [
        sourceCanonicalId,
        originalTargetCanonicalId,
      ]) {
        synthesisRepository.upsertCanonicalReferenceRedirect({
          fromCanonicalReferenceId: fromCanonicalId,
          toCanonicalReferenceId: selectedTargetCanonicalId,
          reason: "advanced_reference_matching_manual_target",
          diagnosticsJson: JSON.stringify(diagnostics),
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        upsertManualAuditProposal({
          kind: "canonical_merge",
          sourceCanonicalReferenceId: fromCanonicalId,
          sourceRawReferenceIds:
            fromCanonicalId === sourceCanonicalId
              ? parseJsonArray(proposal.sourceRawReferenceIdsJson)
                  .map(cleanString)
                  .filter(Boolean)
              : rawReferenceIdsForCanonical(fromCanonicalId),
          targetCanonicalReferenceId: selectedTargetCanonicalId,
          diagnostics,
        });
      }
      synthesisRepository.updateReferenceMatchProposalStatus({
        proposalId: proposal.proposalId,
        status: "retargeted",
        timestamp,
      });
      return {
        ok: true,
        status: "retargeted",
        proposal_id: proposal.proposalId,
        graphFactsChanged: true,
        graphDelta: normalizedCitationGraphFactDelta({
          changedCanonicalIds: [
            sourceCanonicalId,
            originalTargetCanonicalId,
            selectedTargetCanonicalId,
          ],
          changedRedirectCanonicalIds: [
            sourceCanonicalId,
            originalTargetCanonicalId,
            selectedTargetCanonicalId,
          ],
        }),
      };
    }
    if (args.action === "delete") {
      const wasAccepted = proposal.status === "accepted";
      const revoked = wasAccepted
        ? Number(revokeAcceptedProposalFact()) || 1
        : 0;
      synthesisRepository.updateReferenceMatchProposalStatus({
        proposalId: proposal.proposalId,
        status: "superseded",
        timestamp,
      });
      return {
        ok: true,
        status: "superseded",
        proposal_id: proposal.proposalId,
        revoked_fact_count: revoked,
        graphFactsChanged: wasAccepted,
        graphDelta: wasAccepted
          ? graphDeltaForProposal()
          : emptyCitationGraphFactDelta(),
      };
    }
    if (args.action === "reopen") {
      const wasAccepted = proposal.status === "accepted";
      const revoked = wasAccepted
        ? Number(revokeAcceptedProposalFact()) || 1
        : 0;
      synthesisRepository.updateReferenceMatchProposalStatus({
        proposalId: proposal.proposalId,
        status: "open",
        timestamp,
      });
      return {
        ok: true,
        status: "open",
        proposal_id: proposal.proposalId,
        revoked_fact_count: revoked,
        graphFactsChanged: wasAccepted,
        graphDelta: wasAccepted
          ? graphDeltaForProposal()
          : emptyCitationGraphFactDelta(),
      };
    }
    if (args.action === "reject") {
      const wasAccepted = proposal.status === "accepted";
      const revoked = wasAccepted
        ? Number(revokeAcceptedProposalFact()) || 1
        : 0;
      synthesisRepository.updateReferenceMatchProposalStatus({
        proposalId: proposal.proposalId,
        status: "rejected",
        timestamp,
      });
      return {
        ok: true,
        status: "rejected",
        proposal_id: proposal.proposalId,
        revoked_fact_count: revoked,
        graphFactsChanged: wasAccepted,
        graphDelta: wasAccepted
          ? graphDeltaForProposal()
          : emptyCitationGraphFactDelta(),
      };
    }
    if (
      args.action === "reverse_accept" &&
      proposal.kind !== "canonical_merge"
    ) {
      return {
        ok: false,
        status: "invalid_action",
        proposal_id: proposal.proposalId,
        diagnostics: [
          {
            code: "reference_match_reverse_accept_requires_canonical_merge",
            severity: "error",
            message:
              "Reverse accept is only valid for canonical merge proposals.",
          },
        ],
      };
    }
    if (proposal.kind === "canonical_merge") {
      if (proposal.status === "accepted") {
        revokeAcceptedProposalFact();
      }
      const sourceCanonicalId = proposal.sourceCanonicalReferenceId;
      const targetCanonicalId = cleanString(
        proposal.targetCanonicalReferenceId,
      );
      const reverse = args.action === "reverse_accept";
      synthesisRepository.upsertCanonicalReferenceRedirect({
        fromCanonicalReferenceId: reverse
          ? targetCanonicalId
          : sourceCanonicalId,
        toCanonicalReferenceId: reverse ? sourceCanonicalId : targetCanonicalId,
        reason: reverse
          ? "advanced_reference_matching_reverse_accept"
          : "advanced_reference_matching_accept",
        diagnosticsJson: proposal.diagnosticsJson || "[]",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    } else {
      synthesisRepository.upsertReferenceBinding({
        bindingId: bindingIdForProposal(),
        canonicalReferenceId: proposal.sourceCanonicalReferenceId,
        libraryId: proposal.targetLibraryId || libraryId,
        itemKey: cleanString(proposal.targetItemKey),
        status: "accepted",
        confidence: proposal.confidence,
        reviewer: "advanced-reference-matching-review",
        basisHash: proposal.basisHash,
        diagnosticsJson: proposal.diagnosticsJson || "[]",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    synthesisRepository.updateReferenceMatchProposalStatus({
      proposalId: proposal.proposalId,
      status: "accepted",
      timestamp,
    });
    return {
      ok: true,
      status: "accepted",
      proposal_id: proposal.proposalId,
      graphFactsChanged: true,
      graphDelta: graphDeltaForProposal(),
    };
  }

  async function applyReferenceMatchProposalAction(args: {
    proposalId: string;
    action: Exclude<ReferenceMatchProposalAction, "manual_target">;
  }) {
    const result = await applyReferenceMatchProposalActionDecision(args);
    if (result.ok && result.graphFactsChanged) {
      await refreshGraphAfterReferenceMatchProposalDelta({
        delta: result.graphDelta || emptyCitationGraphFactDelta(),
        reason: `reference-match-proposal:${cleanString(args.proposalId)}`,
      });
    }
    return publicReferenceMatchProposalActionResult(result);
  }

  async function applyReferenceMatchProposalActions(args: {
    decisions: ReferenceMatchProposalDecision[];
  }) {
    const results: Array<Record<string, unknown>> = [];
    const graphDeltaSets = {
      changedCanonicalIds: new Set<string>(),
      changedBindingCanonicalIds: new Set<string>(),
      changedRedirectCanonicalIds: new Set<string>(),
    };
    let applied = 0;
    let skipped = 0;
    let failed = 0;
    for (const decision of args.decisions || []) {
      const proposalId = cleanString(decision.proposalId);
      if (!proposalId) {
        skipped += 1;
        results.push({
          ok: false,
          status: "skipped",
          action: decision.action,
          diagnostics: [
            {
              code: "reference_match_proposal_id_missing",
              severity: "warning",
              message: "Reference match proposal id was empty.",
            },
          ],
        });
        continue;
      }
      try {
        const result = await applyReferenceMatchProposalActionDecision({
          proposalId,
          action: decision.action,
          target: decision.target,
        });
        if (result.ok && result.graphFactsChanged) {
          addCitationGraphFactDelta(
            graphDeltaSets,
            result.graphDelta || emptyCitationGraphFactDelta(),
          );
        }
        results.push({
          ...publicReferenceMatchProposalActionResult(result),
          action: decision.action,
        });
        if (result.ok) {
          applied += 1;
        } else {
          failed += 1;
        }
      } catch (error) {
        failed += 1;
        results.push({
          ok: false,
          status: "failed",
          proposal_id: proposalId,
          action: decision.action,
          diagnostics: [
            {
              code: "reference_match_proposal_action_failed",
              severity: "error",
              message: errorMessage(error),
            },
          ],
        });
      }
    }
    const graphDelta = normalizedCitationGraphFactDelta({
      changedCanonicalIds: Array.from(graphDeltaSets.changedCanonicalIds),
      changedBindingCanonicalIds: Array.from(
        graphDeltaSets.changedBindingCanonicalIds,
      ),
      changedRedirectCanonicalIds: Array.from(
        graphDeltaSets.changedRedirectCanonicalIds,
      ),
    });
    if (hasCitationGraphFactDelta(graphDelta)) {
      await refreshGraphAfterReferenceMatchProposalDelta({
        delta: graphDelta,
        reason: `reference-match-proposal-batch:${sidecarShortKey({
          decisions: (args.decisions || []).map((decision) => [
            decision.proposalId,
            decision.action,
          ]),
          applied,
        })}`,
      });
    }
    return {
      ok: failed === 0,
      applied_count: applied,
      skipped_count: skipped,
      failed_count: failed,
      results,
    };
  }

  function updateReviewItemStatus(args: {
    reviewItem: SynthesisReviewItemRecord;
    status: string;
    diagnostics?: unknown[];
    timestamp: string;
  }) {
    synthesisRepository.upsertReviewItem({
      ...args.reviewItem,
      status: args.status,
      diagnosticsJson: JSON.stringify([
        ...parseJsonArray(args.reviewItem.diagnosticsJson),
        ...(args.diagnostics || []),
      ]),
      updatedAt: args.timestamp,
    });
  }

  function acceptedBindingTarget(canonicalReferenceId: string) {
    const effective =
      synthesisRepository.resolveEffectiveCanonicalReferenceId(
        canonicalReferenceId,
      ) || canonicalReferenceId;
    return synthesisRepository
      .listReferenceBindings({ statuses: ["accepted"] })
      .find(
        (binding) =>
          synthesisRepository.resolveEffectiveCanonicalReferenceId(
            binding.canonicalReferenceId,
          ) === effective,
      );
  }

  function hasConflictingAcceptedBindings(source: string, target: string) {
    const sourceBinding = acceptedBindingTarget(source);
    const targetBinding = acceptedBindingTarget(target);
    if (!sourceBinding || !targetBinding) {
      return false;
    }
    return (
      Number(sourceBinding.libraryId) !== Number(targetBinding.libraryId) ||
      cleanString(sourceBinding.itemKey) !== cleanString(targetBinding.itemKey)
    );
  }

  async function applyCanonicalRevisionReviewAction(args: {
    reviewItemId?: string;
    action?: "accept" | "reject";
  }) {
    const reviewItemId = cleanString(args.reviewItemId);
    const action = args.action === "reject" ? "reject" : "accept";
    const timestamp = now();
    const reviewItem = synthesisRepository
      .listReviewItems({ reviewKind: "canonical_revision", limit: 0 })
      .find((row) => row.reviewItemId === reviewItemId);
    if (!reviewItem) {
      return {
        ok: false,
        status: "missing",
        diagnostics: [
          {
            code: "canonical_revision_review_missing",
            severity: "error",
            message: "Canonical revision proposal was not found.",
          },
        ],
      };
    }
    if (action === "reject") {
      updateReviewItemStatus({
        reviewItem,
        status: "rejected",
        timestamp,
        diagnostics: [
          {
            code: "canonical_revision_review_rejected",
            severity: "info",
          },
        ],
      });
      return { ok: true, status: "rejected", review_item_id: reviewItemId };
    }
    const payload = parseReviewPayload(reviewItem.payloadJson);
    const source = cleanString(
      payload.canonical_reference_id || reviewItem.scopeRef,
    );
    const target = cleanString(payload.successor_canonical_reference_id);
    const recommendedAction = cleanString(payload.recommended_action);
    const sourceCanonical = synthesisRepository.listCanonicalReferences({
      canonicalReferenceIds: [source],
      statuses: ["active"],
    })[0];
    if (!source || !sourceCanonical) {
      updateReviewItemStatus({
        reviewItem,
        status: "blocked_by_upstream_review",
        timestamp,
        diagnostics: [
          {
            code: "canonical_revision_source_missing",
            severity: "warning",
            source,
          },
        ],
      });
      return { ok: false, status: "blocked", review_item_id: reviewItemId };
    }
    if (recommendedAction === "redirect_to_successor") {
      const targetCanonical = synthesisRepository.listCanonicalReferences({
        canonicalReferenceIds: [target],
        statuses: ["active"],
      })[0];
      const effectiveSource =
        synthesisRepository.resolveEffectiveCanonicalReferenceId(source);
      const effectiveTarget =
        synthesisRepository.resolveEffectiveCanonicalReferenceId(target);
      if (
        !target ||
        !targetCanonical ||
        !effectiveTarget ||
        effectiveSource === effectiveTarget ||
        hasConflictingAcceptedBindings(source, target)
      ) {
        updateReviewItemStatus({
          reviewItem,
          status: "blocked_by_upstream_review",
          timestamp,
          diagnostics: [
            {
              code: "canonical_revision_successor_invalid",
              severity: "warning",
              source,
              target,
            },
          ],
        });
        return { ok: false, status: "blocked", review_item_id: reviewItemId };
      }
      synthesisRepository.upsertCanonicalReferenceRedirect({
        fromCanonicalReferenceId: source,
        toCanonicalReferenceId: target,
        reason: "canonical_revision_review_accept",
        diagnosticsJson: JSON.stringify([
          {
            code: "canonical_revision_review_accept",
            severity: "info",
            review_item_id: reviewItemId,
          },
        ]),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      markCanonicalReferenceStale({
        canonicalReferenceId: source,
        reason: "canonical_revision_review_accept",
        timestamp,
      });
      updateReviewItemStatus({
        reviewItem,
        status: "approved",
        timestamp,
        diagnostics: [
          {
            code: "canonical_revision_redirect_applied",
            severity: "info",
            source,
            target,
          },
        ],
      });
      await refreshGraphAfterReferenceMatchProposalDelta({
        delta: normalizedCitationGraphFactDelta({
          changedCanonicalIds: [source, target],
          changedRedirectCanonicalIds: [source, target],
        }),
        reason: `canonical-revision:${reviewItemId}`,
      });
      return {
        ok: true,
        status: "approved",
        review_item_id: reviewItemId,
        action: "redirect_to_successor",
      };
    }
    const blockers = staleCanonicalProtectionBlockers(source).filter(
      (blocker) => blocker !== "review_item",
    );
    if (blockers.length) {
      updateReviewItemStatus({
        reviewItem,
        status: "blocked_by_upstream_review",
        timestamp,
        diagnostics: [
          {
            code: "canonical_revision_orphan_cleanup_blocked",
            severity: "warning",
            blockers,
          },
        ],
      });
      return {
        ok: false,
        status: "blocked",
        review_item_id: reviewItemId,
        blockers,
      };
    }
    markCanonicalReferenceStale({
      canonicalReferenceId: source,
      reason: "canonical_revision_orphan_cleanup_accept",
      timestamp,
    });
    updateReviewItemStatus({
      reviewItem,
      status: "approved",
      timestamp,
      diagnostics: [
        {
          code: "canonical_revision_orphan_marked_stale",
          severity: "info",
          source,
        },
      ],
    });
    return {
      ok: true,
      status: "approved",
      review_item_id: reviewItemId,
      action: "mark_stale",
    };
  }

  function canonicalProjectedBinding(canonicalReferenceIdRaw: unknown) {
    const effective = synthesisRepository.resolveEffectiveCanonicalReferenceId(
      cleanString(canonicalReferenceIdRaw),
    );
    const binding = bestReferenceBinding(
      synthesisRepository.listReferenceBindings({
        canonicalReferenceIds: [effective],
      }),
    );
    return binding?.itemKey
      ? {
          effective,
          paperRef: sourceRefFromParts({
            libraryId: normalizeLibraryId(binding.libraryId) || libraryId,
            itemKey: cleanString(binding.itemKey),
          }),
          binding,
        }
      : { effective, paperRef: "", binding: undefined };
  }

  function canonicalReferenceActionError(
    status: string,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    return {
      ok: false,
      status,
      diagnostics: [
        {
          code,
          severity: "error",
          message,
          details,
        },
      ],
    };
  }

  function cascadeCanonicalMetadataToCitationGraph(args: {
    canonical: SynthesisCanonicalReferenceRecord;
    timestamp: string;
  }) {
    const effective = synthesisRepository.resolveEffectiveCanonicalReferenceId(
      args.canonical.canonicalReferenceId,
    );
    const node = synthesisRepository.listCitationNodes({
      literatureItemIds: [effective],
      statuses: ["active"],
      limit: 1,
    })[0];
    if (node) {
      synthesisRepository.upsertCitationNode({
        ...node,
        title: args.canonical.title || node.title,
        year: args.canonical.year || node.year,
        summaryJson: JSON.stringify({
          ...parseJsonObject(node.summaryJson),
          canonical_metadata_updated_at: args.timestamp,
        }),
        updatedAt: args.timestamp,
      });
    }
    markCitationGraphLibraryCacheStale({
      source: "canonical_metadata_update",
      timestamp: args.timestamp,
      changedCanonicalIds: [
        args.canonical.canonicalReferenceId,
        effective,
      ].filter(Boolean),
    });
    markRelatedItemsSyncCacheStaleForSidecarChange({
      source: "canonical_metadata_update",
      timestamp: args.timestamp,
      changedCanonicalIds: [
        args.canonical.canonicalReferenceId,
        effective,
      ].filter(Boolean),
    });
  }

  async function mergeEffectiveCanonicalReference(args: {
    sourceEffectiveCanonicalId?: string;
    targetEffectiveCanonicalId?: string;
    confirmRetargetGroup?: boolean;
  }) {
    const timestamp = now();
    const source = synthesisRepository.resolveEffectiveCanonicalReferenceId(
      cleanString(args.sourceEffectiveCanonicalId),
    );
    const target = synthesisRepository.resolveEffectiveCanonicalReferenceId(
      cleanString(args.targetEffectiveCanonicalId),
    );
    if (!source || !target || source === target) {
      return canonicalReferenceActionError(
        "invalid_target",
        "canonical_merge_invalid_target",
        "Source and target canonical references must be different.",
        { source, target },
      );
    }
    const sourceCanonical = synthesisRepository.listCanonicalReferences({
      canonicalReferenceIds: [source],
      statuses: ["active"],
    })[0];
    const targetCanonical = synthesisRepository.listCanonicalReferences({
      canonicalReferenceIds: [target],
      statuses: ["active"],
    })[0];
    if (!sourceCanonical || !targetCanonical) {
      return canonicalReferenceActionError(
        "missing_canonical",
        "canonical_merge_missing_canonical",
        "Both source and target canonical references must be active.",
        { source, target },
      );
    }
    const sourceBinding = canonicalProjectedBinding(source);
    const targetBinding = canonicalProjectedBinding(target);
    if (
      sourceBinding.paperRef &&
      targetBinding.paperRef &&
      sourceBinding.paperRef !== targetBinding.paperRef
    ) {
      return canonicalReferenceActionError(
        "conflicting_bindings",
        "canonical_merge_conflicting_zotero_bindings",
        "Canonical references bound to different Zotero items cannot be merged.",
        {
          source,
          target,
          source_binding: sourceBinding.paperRef,
          target_binding: targetBinding.paperRef,
        },
      );
    }
    const incoming = synthesisRepository
      .listCanonicalReferenceRedirects()
      .filter(
        (redirect) =>
          synthesisRepository.resolveEffectiveCanonicalReferenceId(
            redirect.toCanonicalReferenceId,
          ) === source,
      );
    if (incoming.length && !args.confirmRetargetGroup) {
      return canonicalReferenceActionError(
        "requires_confirmation",
        "canonical_merge_retarget_group_requires_confirmation",
        "This canonical reference is a redirect target and requires explicit group retarget confirmation.",
        { source, target, incoming_redirect_count: incoming.length },
      );
    }
    synthesisRepository.upsertCanonicalReferenceRedirect({
      fromCanonicalReferenceId: source,
      toCanonicalReferenceId: target,
      reason: "canonical_revision_manual_merge",
      diagnosticsJson: JSON.stringify([
        {
          code: "canonical_revision_manual_merge",
          source,
          target,
          confirmed_retarget_group: Boolean(args.confirmRetargetGroup),
        },
      ]),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    markCitationGraphLibraryCacheStale({
      source: "canonical_revision_manual_merge",
      timestamp,
      changedCanonicalIds: [source, target],
      changedRedirectCanonicalIds: [source, target],
    });
    markRelatedItemsSyncCacheStaleForSidecarChange({
      source: "canonical_revision_manual_merge",
      timestamp,
      changedCanonicalIds: [source, target],
      changedRedirectCanonicalIds: [source, target],
    });
    return {
      ok: true,
      status: "merged",
      source_effective_canonical_id: source,
      target_effective_canonical_id: target,
    };
  }

  function rawReferenceIdsForEffectiveCanonical(canonicalReferenceId: string) {
    const effective =
      synthesisRepository.resolveEffectiveCanonicalReferenceId(
        canonicalReferenceId,
      );
    return synthesisRepository
      .listRawReferences({
        statuses: ["active"],
        limit: 0,
      })
      .filter((raw) => {
        const rawCanonicalReferenceId = cleanString(raw.canonicalReferenceId);
        return (
          Boolean(rawCanonicalReferenceId) &&
          synthesisRepository.resolveEffectiveCanonicalReferenceId(
            rawCanonicalReferenceId,
          ) === effective
        );
      })
      .map((raw) => cleanString(raw.rawReferenceId))
      .filter(Boolean);
  }

  async function applyCanonicalRevisionMergeRequests(args: {
    requests?: Array<Record<string, unknown>>;
  }) {
    const timestamp = now();
    const graphDeltaSets = {
      changedCanonicalIds: new Set<string>(),
      changedBindingCanonicalIds: new Set<string>(),
      changedRedirectCanonicalIds: new Set<string>(),
    };
    const results: Array<Record<string, unknown>> = [];
    let applied = 0;
    let failed = 0;
    for (const request of args.requests || []) {
      const source = synthesisRepository.resolveEffectiveCanonicalReferenceId(
        cleanString(
          request.sourceEffectiveCanonicalId ||
            request.source_effective_canonical_id,
        ),
      );
      const target = synthesisRepository.resolveEffectiveCanonicalReferenceId(
        cleanString(
          request.targetEffectiveCanonicalId ||
            request.target_effective_canonical_id,
        ),
      );
      const fail = (
        status: string,
        code: string,
        message: string,
        details: Record<string, unknown> = {},
      ) => {
        failed += 1;
        results.push({
          ok: false,
          status,
          source_effective_canonical_id: source,
          target_effective_canonical_id: target,
          diagnostics: [
            {
              code,
              severity: "error",
              message,
              details,
            },
          ],
        });
      };
      if (!source || !target || source === target) {
        fail(
          "invalid_target",
          "canonical_revision_merge_invalid_target",
          "Source and target canonical references must be different.",
          { source, target },
        );
        continue;
      }
      const sourceCanonical = synthesisRepository.listCanonicalReferences({
        canonicalReferenceIds: [source],
        statuses: ["active"],
      })[0];
      const targetCanonical = synthesisRepository.listCanonicalReferences({
        canonicalReferenceIds: [target],
        statuses: ["active"],
      })[0];
      if (!sourceCanonical || !targetCanonical) {
        fail(
          "missing_canonical",
          "canonical_revision_merge_missing_canonical",
          "Both source and target canonical references must be active.",
          { source, target },
        );
        continue;
      }
      const sourceBinding = canonicalProjectedBinding(source);
      const targetBinding = canonicalProjectedBinding(target);
      if (
        sourceBinding.paperRef &&
        targetBinding.paperRef &&
        sourceBinding.paperRef !== targetBinding.paperRef
      ) {
        fail(
          "conflicting_bindings",
          "canonical_revision_merge_conflicting_zotero_bindings",
          "Canonical references bound to different Zotero items cannot be merged.",
          {
            source,
            target,
            source_binding: sourceBinding.paperRef,
            target_binding: targetBinding.paperRef,
          },
        );
        continue;
      }
      const basisHash = hashCanonicalJson({
        kind: "canonical_revision_merge",
        policy: "canonical-revision-merge-v1",
        source,
        target,
      });
      const sourceRawReferenceIds =
        rawReferenceIdsForEffectiveCanonical(source);
      const proposal = referenceMatchProposalRecord({
        kind: "canonical_merge",
        sourceCanonicalReferenceId: source,
        sourceRawReferenceIds,
        targetCanonicalReferenceId: target,
        confidence: "manual",
        score: 1,
        reasons: ["canonical_revision_manual_merge"],
        evidence: {
          canonical_revision: true,
          auto_accepted: true,
          source: canonicalReferenceEvidenceForUi(source),
          target: canonicalReferenceEvidenceForUi(target),
        },
        diagnostics: [
          {
            code: "canonical_revision_manual_merge",
            auto_accepted: true,
          },
        ],
        basisHash,
        sourceHash: hashCanonicalJson({
          source,
          sourceRawReferenceIds,
        }),
        timestamp,
      });
      synthesisRepository.upsertReferenceMatchProposal({
        ...proposal,
        status: "accepted",
      });
      synthesisRepository.upsertCanonicalReferenceRedirect({
        fromCanonicalReferenceId: source,
        toCanonicalReferenceId: target,
        reason: "canonical_revision_manual_merge",
        diagnosticsJson: JSON.stringify([
          {
            code: "canonical_revision_manual_merge",
            proposal_id: proposal.proposalId,
            source,
            target,
          },
        ]),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      addCitationGraphFactDelta(graphDeltaSets, {
        changedCanonicalIds: [source, target],
        changedBindingCanonicalIds: [],
        changedRedirectCanonicalIds: [source, target],
      });
      applied += 1;
      results.push({
        ok: true,
        status: "accepted",
        proposal_id: proposal.proposalId,
        source_effective_canonical_id: source,
        target_effective_canonical_id: target,
      });
    }
    const graphDelta = normalizedCitationGraphFactDelta({
      changedCanonicalIds: Array.from(graphDeltaSets.changedCanonicalIds),
      changedBindingCanonicalIds: Array.from(
        graphDeltaSets.changedBindingCanonicalIds,
      ),
      changedRedirectCanonicalIds: Array.from(
        graphDeltaSets.changedRedirectCanonicalIds,
      ),
    });
    if (hasCitationGraphFactDelta(graphDelta)) {
      markCitationGraphLibraryCacheStale({
        source: "canonical_revision_manual_merge",
        timestamp,
        changedCanonicalIds: graphDelta.changedCanonicalIds,
        changedRedirectCanonicalIds: graphDelta.changedRedirectCanonicalIds,
      });
      markRelatedItemsSyncCacheStaleForSidecarChange({
        source: "canonical_revision_manual_merge",
        timestamp,
        changedCanonicalIds: graphDelta.changedCanonicalIds,
        changedRedirectCanonicalIds: graphDelta.changedRedirectCanonicalIds,
      });
    }
    return {
      ok: failed === 0,
      applied_count: applied,
      failed_count: failed,
      results,
    };
  }

  async function updateCanonicalReferenceMetadata(args: {
    canonicalReferenceId?: string;
    patch?: Record<string, unknown>;
  }) {
    const canonicalReferenceId = cleanString(args.canonicalReferenceId);
    const canonical = synthesisRepository.listCanonicalReferences({
      canonicalReferenceIds: [canonicalReferenceId],
      statuses: ["active"],
    })[0];
    if (!canonical) {
      return canonicalReferenceActionError(
        "missing_canonical",
        "canonical_metadata_missing_canonical",
        "Canonical reference must be active.",
        { canonicalReferenceId },
      );
    }
    const binding = canonicalProjectedBinding(canonicalReferenceId);
    if (binding.paperRef) {
      return canonicalReferenceActionError(
        "bound_to_zotero",
        "canonical_metadata_bound_to_zotero",
        "Bound canonical references inherit Zotero display facts and cannot be edited here.",
        { canonicalReferenceId, binding: binding.paperRef },
      );
    }
    const patch = args.patch || {};
    const patchTitle = cleanString(patch.title);
    const normalizedTitlePatch = cleanString(
      patch.normalizedTitle || patch.normalized_title,
    );
    const timestamp = now();
    const next = {
      ...canonical,
      title: patchTitle || canonical.title,
      normalizedTitle:
        normalizedTitlePatch ||
        (patchTitle
          ? normalizeSynthesisLiteratureTitle(patchTitle)
          : canonical.normalizedTitle),
      year: cleanString(patch.year) || canonical.year,
      authorsJson: Array.isArray(patch.authors)
        ? JSON.stringify(patch.authors)
        : canonical.authorsJson,
      identifiersJson:
        patch.identifiers && typeof patch.identifiers === "object"
          ? JSON.stringify(patch.identifiers)
          : canonical.identifiersJson,
      updatedAt: timestamp,
    };
    synthesisRepository.upsertCanonicalReference(next);
    cascadeCanonicalMetadataToCitationGraph({
      canonical: next,
      timestamp,
    });
    return {
      ok: true,
      status: "updated",
      canonical_reference_id: canonicalReferenceId,
    };
  }

  async function archiveCanonicalReference(args: {
    canonicalReferenceId?: string;
  }) {
    const canonicalReferenceId = cleanString(args.canonicalReferenceId);
    const row = buildCanonicalReferenceRowsForUi().rows.find(
      (entry) =>
        entry.effective_canonical_id === canonicalReferenceId ||
        entry.physical_canonical_ids.includes(canonicalReferenceId),
    );
    if (!row || !row.action_availability.archive.allowed) {
      return canonicalReferenceActionError(
        "blocked",
        "canonical_archive_blocked",
        "Canonical reference is not empty and cannot be archived.",
        {
          canonicalReferenceId,
          blockers: row?.action_availability.archive.blockers || [
            "missing_or_not_empty",
          ],
        },
      );
    }
    const canonical = synthesisRepository.listCanonicalReferences({
      canonicalReferenceIds: [canonicalReferenceId],
      statuses: ["active"],
    })[0];
    if (!canonical) {
      return canonicalReferenceActionError(
        "missing_canonical",
        "canonical_archive_missing_canonical",
        "Canonical reference must be active.",
        { canonicalReferenceId },
      );
    }
    synthesisRepository.upsertCanonicalReference({
      ...canonical,
      status: "archived",
      updatedAt: now(),
    });
    return {
      ok: true,
      status: "archived",
      canonical_reference_id: canonicalReferenceId,
    };
  }

  async function rebuildCitationGraphCacheNow(
    progressOptions: WorkbenchProgressOptions = {},
  ) {
    const jobName = "synthesis:citation-graph-cache";
    const runId = `${jobName}:${now()}`;
    const profileRun = maybeStartSynthesisJobProfileRun({
      root,
      jobName,
      trigger: "citation_graph_cache_rebuild",
    });
    const phases = [
      "load_sidecar_inputs",
      "resolve_canonical_refs",
      "apply_bindings",
      "generate_graph",
      "commit",
    ];
    const reportPhase = async (
      phase: string,
      index: number,
      counts?: {
        processedCount?: number;
        totalCount?: number;
        progressMode?: "determinate" | "indeterminate";
      },
    ) => {
      reportSynthesisJobProgress({
        jobName,
        runId,
        source: "citation_graph_cache_rebuild",
        label: "Citation graph cache rebuild",
        phase,
        phaseLabel: phase
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        processedCount: counts?.processedCount ?? index,
        totalCount: counts?.totalCount ?? phases.length,
        progressMode: counts?.progressMode ?? "determinate",
      });
      await progressOptions.onProgress?.();
      await yieldToEventLoop();
    };
    let phaseIndex = 0;
    try {
      await reportPhase("load_sidecar_inputs", 0, {
        processedCount: 0,
        totalCount: 0,
        progressMode: "indeterminate",
      });
      const activeRawCount = synthesisRepository.listRawReferences({
        statuses: ["active"],
      }).length;
      phaseIndex = 1;
      await reportPhase("resolve_canonical_refs", phaseIndex, {
        processedCount: activeRawCount,
        totalCount: activeRawCount,
        progressMode: "determinate",
      });
      phaseIndex = 2;
      await reportPhase("apply_bindings", phaseIndex, {
        processedCount: synthesisRepository.listReferenceBindings({
          statuses: ["accepted"],
        }).length,
        totalCount: activeRawCount,
        progressMode: "determinate",
      });
      phaseIndex = 3;
      await reportPhase("generate_graph", phaseIndex, {
        processedCount: activeRawCount,
        totalCount: activeRawCount,
        progressMode: "determinate",
      });
      const result = await lock.runExclusive(libraryId, () =>
        rebuildCitationGraphCacheFromSidecar({
          timestamp: now(),
          operationId: runId,
          profileRun,
        }),
      );
      phaseIndex = 4;
      completeSynthesisJobProgress({
        jobName,
        runId,
        source: "citation_graph_cache_rebuild",
        label: "Citation graph cache rebuild",
        phase: "commit",
        phaseLabel: "Commit",
        processedCount: result.edges,
        totalCount: result.edges,
        progressMode: "determinate",
        message: "Citation graph cache rebuild completed.",
      });
      await profileRun.finish({
        status: "completed",
        processedCount: result.edges,
        counters: {
          node_count: result.nodes,
          edge_count: result.edges,
          source_hash: result.sourceHash,
          metrics_hash: result.metricsHash,
          metric_count: result.metrics,
        },
      });
      return result;
    } catch (error) {
      const diagnostic = referenceSidecarDiagnostic({
        code: "citation_graph_cache_rebuild_failed",
        severity: "error",
        message: errorMessage(error),
      });
      failSynthesisJobProgress({
        jobName,
        runId,
        source: "citation_graph_cache_rebuild",
        label: "Citation graph cache rebuild",
        phase: phases[Math.min(phaseIndex, phases.length - 1)],
        processedCount: phaseIndex,
        totalCount: phases.length,
        progressMode: "determinate",
        diagnosticsJson: JSON.stringify([diagnostic]),
        message: "Citation graph cache rebuild failed.",
      });
      const previousGraph = synthesisRepository.getCacheBasis(
        "citation-graph:library",
      );
      if (previousGraph?.status !== "ready") {
        synthesisRepository.upsertCacheBasis({
          cacheKey: "citation-graph:library",
          cacheKind: "citation_graph",
          scopeKind: "library",
          scopeRef: String(libraryId),
          status: "failed",
          basisKind: "reference_sidecar",
          basisValue: runId,
          activeOperationId: runId,
          diagnosticsJson: JSON.stringify([diagnostic]),
          updatedAt: now(),
        });
      }
      await profileRun.finish({
        status: "failed_terminal",
        processedCount: phaseIndex,
        failedCount: 1,
        counters: {
          phase_index: phaseIndex,
        },
        diagnostics: [diagnostic],
      });
      throw error;
    }
  }

  async function retryCitationGraphCacheRebuild(
    progressOptions: WorkbenchProgressOptions = {},
  ) {
    return rebuildCitationGraphCacheNow(progressOptions);
  }

  async function refreshCitationGraphCacheIncrementalNow(
    progressOptions: WorkbenchProgressOptions = {},
  ) {
    const basis = synthesisRepository.getCacheBasis("citation-graph:library");
    if (cleanString(basis?.status) !== "stale") {
      return {
        ok: true,
        status: "skipped",
        skipped_reason: "citation_graph_cache_not_stale",
      };
    }
    const delta = citationGraphIncrementalDeltaFromBasis(basis);
    if (!delta) {
      return {
        ok: true,
        status: "skipped",
        skipped_reason: "missing_stale_delta_metadata",
      };
    }
    const result = await refreshCitationGraphCacheIncremental(
      {
        sourceRefs: delta.sourceRefs,
        changedCanonicalIds: delta.changedCanonicalIds,
        changedBindingCanonicalIds: delta.changedBindingCanonicalIds,
        changedRedirectCanonicalIds: delta.changedRedirectCanonicalIds,
        reason: `manual-stale-refresh:${delta.reason}`,
        allowFullBootstrap: false,
      },
      progressOptions,
    );
    const affectedSourceRefs = Array.isArray(
      (result as { affected_source_refs?: unknown }).affected_source_refs,
    )
      ? (result as { affected_source_refs?: string[] }).affected_source_refs ||
        []
      : [];
    if (
      result.status === "completed" &&
      affectedSourceRefs.map(cleanString).filter(Boolean).length > 0
    ) {
      const relatedItemsSync = await syncRelatedItemsAfterSynthesisUpdate({
        sourceRefs: affectedSourceRefs,
        reason: "citation_graph_incremental_refresh",
        onProgress: progressOptions.onProgress,
      });
      return {
        ...result,
        related_items_sync: relatedItemsSync,
      };
    }
    return result;
  }

  async function refreshCitationGraphMetricsNow(
    progressOptions: WorkbenchProgressOptions = {},
  ) {
    const jobName = "synthesis:citation-graph-metrics";
    const runId = `${jobName}:${now()}`;
    const source = "citation_graph_metrics_refresh";
    const label = "Citation graph metrics refresh";
    const report = async (phase: string, processedCount: number) => {
      reportSynthesisJobProgress({
        jobName,
        runId,
        source,
        label,
        status: "running",
        phase,
        phaseLabel: phase
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        processedCount,
        totalCount: 2,
        progressMode: "determinate",
      });
      await progressOptions.onProgress?.();
      await yieldToEventLoop();
    };
    try {
      await report("load_graph", 0);
      const graphBasis = synthesisRepository.getCacheBasis(
        "citation-graph:library",
      );
      if (cleanString(graphBasis?.status) !== "ready") {
        const result = {
          ok: true,
          status: "skipped",
          skipped_reason: "citation_graph_cache_not_ready",
        };
        completeSynthesisJobProgress({
          jobName,
          runId,
          source,
          label,
          phase: "skipped",
          phaseLabel: "Skipped",
          processedCount: 0,
          totalCount: 2,
          progressMode: "determinate",
          message: "Citation graph metrics refresh skipped.",
          diagnosticsJson: JSON.stringify([
            {
              code: "citation_graph_metrics_refresh_skipped",
              reason: result.skipped_reason,
            },
          ]),
        });
        await progressOptions.onProgress?.();
        return result;
      }
      await report("compute_metrics", 1);
      const result = await lock.runExclusive(libraryId, () =>
        refreshCitationGraphComplexMetricsFromCurrentGraph({
          timestamp: now(),
        }),
      );
      completeSynthesisJobProgress({
        jobName,
        runId,
        source,
        label,
        phase: result.status === "skipped" ? "skipped" : "completed",
        phaseLabel: result.status === "skipped" ? "Skipped" : "Completed",
        processedCount: result.metric_count,
        totalCount: result.metric_count,
        progressMode: "determinate",
        message:
          result.status === "skipped"
            ? "Citation graph metrics refresh skipped."
            : "Citation graph metrics refresh completed.",
        diagnosticsJson: JSON.stringify([
          {
            code: "citation_graph_metrics_refresh_completed",
            graph_hash: result.graph_hash,
            metrics_hash: result.metrics_hash,
            metric_count: result.metric_count,
            skipped_reason:
              result.status === "skipped" ? result.skipped_reason : undefined,
          },
        ]),
      });
      await progressOptions.onProgress?.();
      return result;
    } catch (error) {
      const diagnostic = referenceSidecarDiagnostic({
        code: "citation_graph_metrics_refresh_failed",
        severity: "error",
        message: errorMessage(error),
      });
      failSynthesisJobProgress({
        jobName,
        runId,
        source,
        label,
        phase: "failed",
        phaseLabel: "Failed",
        processedCount: 0,
        totalCount: 2,
        progressMode: "determinate",
        diagnosticsJson: JSON.stringify([diagnostic]),
        message: "Citation graph metrics refresh failed.",
      });
      throw error;
    }
  }

  async function saveConflictCandidate(args: {
    topicId: string;
    bundle: SynthesisResultBundle;
    mismatches: Array<{ name: string; base: string; current: string }>;
    createdAt: string;
  }) {
    const bundleHash = hashCanonicalJson(args.bundle);
    const candidate: SynthesisConflictCandidate = {
      id: `${topicPathId(args.topicId)}-${bundleHash.slice("sha256:".length, "sha256:".length + 12)}`,
      topic_id: args.topicId,
      created_at: args.createdAt,
      bundle_hash: bundleHash,
      reason: "base_hash_mismatch",
      status: "open",
    };
    const conflictPath = joinPath(
      root,
      "synthesis",
      "conflicts",
      `${candidate.id}.json`,
    );
    await writeJson(conflictPath, {
      ...candidate,
      mismatches: args.mismatches,
      bundle: args.bundle,
    });
    return candidate;
  }

  async function refreshMirror(): Promise<
    SynthesisMirrorRefreshResult | undefined
  > {
    if (!options.mirrorAdapter) {
      return undefined;
    }
    const paths = buildSynthesisStoragePaths(root);
    const anchor = await options.mirrorAdapter.ensureAnchor({
      libraryId,
      title: SYNTHESIS_ANCHOR_TITLE,
      root,
    });
    const anchorKey = cleanString(anchor.anchorKey);
    if (!anchorKey) {
      throw new Error("Synthesis mirror adapter returned empty anchorKey");
    }
    const payloadSources = await buildMirrorPayloadSources(root);
    const manifestShards: MirrorManifestShard[] = [];
    const keepNoteKeys: string[] = [];
    for (const source of payloadSources) {
      const payload = await readRuntimeTextFile(source.path);
      if (!payload.trim()) {
        continue;
      }
      const chunks = chunkText(payload, options.shardSize || 64000);
      for (const [index, chunk] of chunks.entries()) {
        const shard = encodeNoteShard({
          libraryId,
          anchorKey,
          kind: source.kind,
          assetId: source.assetId,
          assetPath: source.assetPath,
          contentType: source.contentType,
          seq: index + 1,
          total: chunks.length,
          payload: chunk,
          compression: "gzip",
          updatedAt: now(),
        });
        const written = await options.mirrorAdapter.upsertShard({
          libraryId,
          anchorKey,
          title: shard.title,
          html: shard.html,
          kind: source.kind,
          assetId: source.assetId,
          assetPath: source.assetPath,
          contentType: source.contentType,
          seq: index + 1,
          total: chunks.length,
        });
        const noteKey = cleanString(written.noteKey);
        keepNoteKeys.push(noteKey);
        manifestShards.push({
          kind: source.kind,
          asset_id: source.assetId,
          asset_path: source.assetPath,
          content_type: source.contentType,
          seq: index + 1,
          total: chunks.length,
          note_key: noteKey,
          title: shard.title,
          payload_hash: shard.envelope.payload_hash,
          encoded_hash: shard.envelope.encoded_hash,
        });
      }
    }
    const manifest = buildMirrorManifest({
      libraryId,
      anchorKey,
      mirrorId: hashCanonicalJson({
        library_id: libraryId,
        anchor_key: anchorKey,
        root,
      }),
      updatedAt: now(),
      shards: manifestShards,
    });
    await writeJson(
      joinPath(paths.stateRoot, "mirror-manifest.json"),
      manifest,
    );
    const manifestShard = encodeNoteShard({
      libraryId,
      anchorKey,
      kind: "manifest",
      assetId: "mirror:manifest",
      assetPath: "state/mirror-manifest.json",
      contentType: "json",
      seq: 1,
      total: 1,
      payload: canonicalText(manifest),
      compression: "gzip",
      updatedAt: now(),
    });
    const writtenManifest = await options.mirrorAdapter.upsertShard({
      libraryId,
      anchorKey,
      title: manifestShard.title,
      html: manifestShard.html,
      kind: "manifest",
      assetId: "mirror:manifest",
      assetPath: "state/mirror-manifest.json",
      contentType: "json",
      seq: 1,
      total: 1,
    });
    const manifestNoteKey = cleanString(writtenManifest.noteKey);
    if (manifestNoteKey) {
      keepNoteKeys.push(manifestNoteKey);
    }
    await options.mirrorAdapter.deleteShardsNotIn?.({
      libraryId,
      anchorKey,
      keepNoteKeys,
    });
    return { anchorKey, manifest, shards: manifestShards };
  }

  async function rebuildMirrorFromCanonical(): Promise<
    SynthesisMirrorRefreshResult | undefined
  > {
    return lock.runExclusive(libraryId, async () => {
      const paths = buildSynthesisStoragePaths(root);
      if (!(await runtimePathExists(paths.synthesisRoot))) {
        throw new Error(
          "Cannot rebuild synthesis mirror because canonical root is missing",
        );
      }
      return refreshMirror();
    });
  }

  async function recoverCanonicalFromMirror(args: { confirm: true }) {
    return lock.runExclusive(libraryId, async () => {
      if (!args?.confirm) {
        throw new Error("recoverCanonicalFromMirror requires confirm: true");
      }
      if (!options.mirrorAdapter?.listShards) {
        throw new Error("Synthesis mirror adapter cannot list shards");
      }
      const paths = buildSynthesisStoragePaths(root);
      if (await runtimePathExists(paths.synthesisRoot)) {
        throw new Error(
          "Canonical synthesis root already exists; refusing shard recovery",
        );
      }
      const anchor = await options.mirrorAdapter.ensureAnchor({
        libraryId,
        title: SYNTHESIS_ANCHOR_TITLE,
        root,
      });
      const anchorKey = cleanString(anchor.anchorKey);
      const shards = await options.mirrorAdapter.listShards({
        libraryId,
        anchorKey,
      });
      const manifests = shards
        .filter((shard) => shard.kind === "manifest")
        .map((shard) => {
          try {
            return JSON.parse(shard.payload || "") as MirrorManifest;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is MirrorManifest => Boolean(entry));
      const dataShards = shards.filter((shard) => shard.kind !== "manifest");
      const plan = planCanonicalRecoveryFromMirror({
        canonicalRoot: { state: "missing" },
        manifests,
        shards: dataShards,
        confirm: true,
      });
      if (!plan.executable) {
        throw new Error(
          `Synthesis mirror recovery is not executable: ${plan.diagnostics.map((entry) => entry.code).join(", ")}`,
        );
      }
      const tempRoot = joinPath(root, `synthesis-restore-tmp-${Date.now()}`);
      try {
        for (const [assetPath, payload] of Object.entries(
          plan.payloadsByAssetPath,
        )) {
          await writeRuntimeTextFile(joinPath(tempRoot, assetPath), payload);
        }
        await copyRuntimeDirectory({
          sourceDir: tempRoot,
          targetDir: paths.synthesisRoot,
        });
      } finally {
        await removeRuntimePath(tempRoot);
      }
      return {
        ok: true as const,
        status: "recovered" as const,
        manifest: plan.manifest,
        restoredAssets: Object.keys(plan.payloadsByAssetPath).sort(
          (left, right) => left.localeCompare(right),
        ),
      };
    });
  }

  async function applyTopicSynthesisResult(
    rawBundle: unknown,
    context?: ApplyContext,
  ): Promise<SynthesisApplyResult> {
    return runCanonicalWriteWithAutosync(
      async () => {
        const { bundle } = validateSynthesisResultBundle(rawBundle);
        const topicId = topicIdFromBundle(bundle);
        const pathId = topicPathId(topicId);
        const paths = buildSynthesisStoragePaths(root, pathId);
        const timestamp = now();
        const createBaseHashesWarning =
          bundle.operation === "create" && bundle.create_base_hashes_ignored
            ? ["create_base_hashes_ignored"]
            : [];
        if (bundle.operation === "create") {
          const existingRows = await readIndexRows(root);
          const existingRow = existingRows.find(
            (entry) => entry.topic_id === topicId,
          );
          const topicExists =
            Boolean(existingRow) ||
            (await runtimePathExists(paths.currentManifest)) ||
            (await runtimePathExists(paths.currentArtifact));
          if (topicExists) {
            return {
              ok: false,
              status: "topic_exists",
              topicId,
              reason: `topic already exists: ${topicId}`,
              ...(createBaseHashesWarning.length
                ? { warnings: createBaseHashesWarning }
                : {}),
            };
          }
        }
        const resolverManifest =
          bundle.operation === "update_patch"
            ? undefined
            : await loadResolverManifest({ bundle, context });
        const decision = decideSynthesisApply({
          bundle,
          currentHashes: await currentHashes(root, topicId),
        });
        if (decision.action === "conflict") {
          const conflictCandidate = await saveConflictCandidate({
            topicId,
            bundle,
            mismatches: decision.mismatches,
            createdAt: timestamp,
          });
          return {
            ok: false,
            status: "conflict",
            topicId,
            mismatches: decision.mismatches,
            conflictCandidate,
          };
        }

        await ensureRuntimeDirectory(paths.topicRoot);
        await ensureRuntimeDirectory(paths.stateRoot);
        let manifest: Record<string, unknown>;
        let sections: Record<string, unknown>;
        if (bundle.operation === "update_patch") {
          const currentManifest = (await readJson<Record<string, unknown>>(
            paths.currentManifest,
          )) as Record<string, any>;
          const currentSections: Record<string, unknown> = {};
          const manifestSections = isObject(currentManifest.sections)
            ? (currentManifest.sections as Record<string, unknown>)
            : {};
          for (const [section, entry] of Object.entries(manifestSections)) {
            const fileName = canonicalSectionFileName(section);
            currentSections[section] = await readJson(
              joinPath(paths.currentSectionsRoot, fileName),
            );
            if (isObject(entry)) {
              currentManifest.section_hashes = {
                ...(isObject(currentManifest.section_hashes)
                  ? currentManifest.section_hashes
                  : {}),
                [section]: cleanString(entry.hash),
              };
            }
          }
          const patch = await loadPatchManifestAndChangedSections({
            bundle,
            context,
          });
          const applied = applyTopicSectionPatch({
            currentManifest,
            currentSections,
            patchManifest: patch.patchManifest,
            changedSections: patch.changedSections,
          }) as any;
          if (applied.status !== "applied") {
            return {
              ok: false,
              status: "patch_conflict",
              topicId,
              reason: "topic section patch failed",
              diagnostics: applied,
              mismatches: Array.isArray(applied.mismatches)
                ? applied.mismatches
                : [],
            };
          }
          sections = applied.sections;
          manifest = {
            ...currentManifest,
            operation: "update_patch",
            language: bundle.language || currentManifest.language || "auto",
            sidecars: isObject(patch.patchManifest.sidecars)
              ? patch.patchManifest.sidecars
              : currentManifest.sidecars,
            sections: Object.fromEntries(
              Object.entries(sections).map(([section, value]) => [
                section,
                {
                  path: `current/sections/${canonicalSectionFileName(section)}`,
                  hash:
                    applied.nextManifest?.section_hashes?.[section] ||
                    hashCanonicalJson(value),
                  content_type: "json",
                },
              ]),
            ),
          };
        } else if (bundle.operation) {
          ({ manifest, sections } = await loadCompleteManifestAndSections({
            bundle,
            context,
          }));
        } else {
          ({ manifest, sections } = await loadCompleteManifestAndSections({
            bundle,
            context,
          }));
        }
        const artifact = assembleTopicArtifact({
          manifest,
          sections,
        }) as Record<string, unknown>;
        const artifactValidation = validateTopicSynthesisArtifact(artifact, {
          expectedLanguage: bundle.language,
        });
        if (!artifactValidation.ok) {
          throw new Error(
            `invalid topic synthesis artifact: ${artifactValidation.errors.join("; ")}`,
          );
        }
        await validateDigestRefsAgainstCurrentArtifacts(artifact);
        const prospectivePayload = context
          ? await readRunWorkspaceJsonFromCandidates(
              context,
              "sidecars.prospective_topic_relation_proposals.path",
              sidecarPathForApply({
                manifest,
                key: "prospective_topic_relation_proposals",
              }),
              ["result/sidecars/prospective-topic-relation-proposals.json"],
            )
          : {};
        const prospectiveTopicRelationProposals =
          normalizeProspectiveTopicRelationProposals(
            isObject(prospectivePayload)
              ? prospectivePayload.proposals
              : undefined,
          );
        const hashes = computeTopicCurrentHashes({
          manifest,
          artifact,
          metadata: {},
          sections,
        });
        const bundleHash = hashCanonicalJson(bundle);
        const paperCount = paperCountFromArtifact(artifact);
        const externalLiteratureCount =
          externalLiteratureCountFromArtifact(artifact);
        const metadataData: TopicArtifactMetadata = {
          topic_id: topicId,
          title: titleFromDefinition(bundle.topic_definition, topicId),
          definition: definitionTextFromDefinition(bundle.topic_definition),
          mode: bundle.mode,
          bundle_hash: bundleHash,
          timeline:
            artifact.timeline_events as SynthesisResultBundle["timeline"],
          artifact_metadata: bundle.artifact_metadata || {},
          updated_at: timestamp,
          operation: bundle.operation || bundle.mode,
          language: bundle.language,
          manifest_hash: hashes.manifest_hash,
          structured_hash: hashes.structured_hash,
          artifact_hash: hashes.artifact_hash,
          section_hashes: hashes.section_hashes,
          paper_count: paperCount,
          external_literature_count: externalLiteratureCount,
          coverage_summary: isObject(artifact.coverage)
            ? artifact.coverage
            : {},
          prospective_topic_relation_proposals:
            prospectiveTopicRelationProposals,
        };
        const finalHashes = computeTopicCurrentHashes({
          manifest,
          artifact,
          metadata: metadataData,
          sections,
        });
        metadataData.metadata_hash = finalHashes.metadata_hash;
        metadataData.manifest_hash = finalHashes.manifest_hash;
        metadataData.structured_hash = finalHashes.structured_hash;
        metadataData.artifact_hash = finalHashes.artifact_hash;
        metadataData.section_hashes = finalHashes.section_hashes;
        await writeV2Current({
          paths,
          manifest: {
            ...manifest,
            section_hashes: finalHashes.section_hashes,
            artifact_hash: finalHashes.artifact_hash,
            metadata_hash: finalHashes.metadata_hash,
          },
          sections,
          artifact,
          metadata: metadataData,
        });
        await upsertStateMap({
          path: paths.topicDefinitions,
          schemaId: "synthesis.topic_definitions",
          key: "topics",
          id: topicId,
          value: bundle.topic_definition,
          now: timestamp,
        });
        await upsertStateMap({
          path: paths.resolvers,
          schemaId: "synthesis.topic_resolvers",
          key: "resolvers",
          id: topicId,
          value: resolverManifest?.topicResolver || bundle.topic_resolver || {},
          now: timestamp,
        });
        await upsertStateMap({
          path: paths.resolvedPaperSets,
          schemaId: "synthesis.resolved_paper_sets",
          key: "paper_sets",
          id: topicId,
          value:
            resolverManifest?.resolvedPaperSet ||
            bundle.resolved_paper_set ||
            {},
          now: timestamp,
        });
        const persistedMetadataHash = await fileHash(paths.currentMetadata);
        const rows = (await readIndexRows(root)).filter(
          (row) => row.topic_id !== topicId,
        );
        rows.push({
          topic_id: topicId,
          path_id: pathId,
          title: metadataData.title,
          definition: metadataData.definition,
          updated_at: timestamp,
          metadata_hash: persistedMetadataHash,
          bundle_hash: bundleHash,
          structured_hash: finalHashes.structured_hash,
          manifest_hash: finalHashes.manifest_hash,
          language: metadataData.language,
          operation: metadataData.operation,
          paper_count: paperCount,
          external_literature_count: externalLiteratureCount,
          coverage_summary: metadataData.coverage_summary,
        });
        await writeIndexRows(root, rows, timestamp);
        const warnings: string[] = [...createBaseHashesWarning];
        try {
          const conceptPayload = await readRunWorkspaceJsonFromCandidates(
            context,
            "sidecars.concept_cards_proposal.path",
            sidecarPathForApply({
              manifest,
              key: "concept_cards_proposal",
            }),
            ["runtime/payloads/concept-cards-proposal.json"],
          );
          await conceptKb.ingestConceptCardProposals({
            topicId,
            topicPathId: pathId,
            payload: conceptPayload,
            transactionId: `concept-cards-${pathId}`,
          });
        } catch (error) {
          warnings.push("concept_cards_proposal_failed");
          await appendJsonLine(paths.log, {
            event: "concept_cards_proposal_failed",
            topic_id: topicId,
            at: timestamp,
            error: errorMessage(error),
          });
        }
        try {
          await topicGraph.upsertMaterializedTopic({
            topicId,
            title: metadataData.title,
            definition: metadataData.definition,
            currentArtifactPath: `topics/${pathId}/current/artifact.json`,
            paperCount,
            lastSynthesisAt: timestamp,
            transactionId: `topic-graph-node-${pathId}`,
          });
          try {
            const proposalPayload = await readRunWorkspaceJsonFromCandidates(
              context,
              "sidecars.topic_graph_relation_proposals.path",
              sidecarPathForApply({
                manifest,
                key: "topic_graph_relation_proposals",
              }),
              ["result/topic-graph-relation-proposals.json"],
            );
            await topicGraph.ingestRelationProposals({
              sourceTopicId: topicId,
              payload: proposalPayload,
              transactionId: `topic-graph-proposals-${pathId}`,
            });
          } catch (error) {
            warnings.push("topic_graph_relation_proposals_failed");
            await appendJsonLine(paths.log, {
              event: "topic_graph_relation_proposals_failed",
              topic_id: topicId,
              at: timestamp,
              error: errorMessage(error),
            });
          }
        } catch (error) {
          warnings.push("topic_graph_update_failed");
          await appendJsonLine(paths.log, {
            event: "topic_graph_update_failed",
            topic_id: topicId,
            at: timestamp,
            error: errorMessage(error),
          });
        }
        try {
          const topicInterestPayload = await readRunWorkspaceJsonFromCandidates(
            context,
            "sidecars.topic_interest_metadata.path",
            sidecarPathForApply({
              manifest,
              key: "topic_interest_metadata",
            }),
            ["result/sidecars/topic-interest-metadata.json"],
          );
          await synthesisRepository.upsertTopicInterestMetadata(
            normalizeTopicInterestMetadataRecord({
              payload: topicInterestPayload,
              topicId,
              sourceArtifactHash: finalHashes.artifact_hash,
              updatedAt: timestamp,
            }),
          );
          const discoveryResult =
            synthesisRepository.rebuildTopicDiscoveryHints({
              topicIds: [topicId],
              timestamp,
            });
          if (discoveryResult.upserted > 0) {
            await appendJsonLine(paths.log, {
              event: "topic_discovery_hints_refreshed",
              topic_id: topicId,
              at: timestamp,
              open_count: discoveryResult.open,
              rejected_count: discoveryResult.rejected,
            });
          }
          await refreshTopicDiscoveryState({
            topicIds: [topicId],
            timestamp,
          });
        } catch (error) {
          warnings.push("topic_interest_metadata_failed");
          await appendJsonLine(paths.log, {
            event: "topic_interest_metadata_failed",
            topic_id: topicId,
            at: timestamp,
            error: errorMessage(error),
          });
        }
        await scanTopicFreshness({
          root,
          rows,
          registryRows: registryRowsForInputs(
            await registryInputsForService(options),
          ),
          timestamp,
          resetBaselineTopicIds: new Set([topicId]),
        });
        await appendJsonLine(paths.log, {
          event: "topic_synthesis_applied",
          topic_id: topicId,
          mode: bundle.mode,
          at: timestamp,
          bundle_hash: bundleHash,
        });
        return {
          ok: true,
          status: "persisted",
          topicId,
          hashes: await currentHashes(root, topicId),
          ...(warnings.length ? { warnings } : {}),
        };
      },
      (result) => result.ok === true && result.status === "persisted",
    );
  }

  async function deleteTopicArtifact(args: {
    topicId: string;
  }): Promise<SynthesisTopicDeleteResult> {
    return runCanonicalWriteWithAutosync(
      async () => {
        const topicId = cleanString(args.topicId);
        const timestamp = now();
        if (!topicId) {
          return {
            ok: false,
            status: "not_found",
            topicId,
            reason: "deleteTopicArtifact requires topicId",
          };
        }
        const paths = buildSynthesisStoragePaths(root);
        const rows = await readIndexRows(root);
        const row =
          rows.find((entry) => entry.topic_id === topicId) ||
          (await recoverTopicIndexRowFromCurrentFiles({
            root,
            topicId,
            timestamp,
          }));
        if (!row) {
          return {
            ok: false,
            status: "not_found",
            topicId,
            reason: `topic artifact not found: ${topicId}`,
          };
        }
        const deletedId = deletedPathId(topicId, timestamp);
        const topicPaths = buildSynthesisStoragePaths(root, row.path_id);
        const deletedTopicRoot = joinPath(paths.deletedRoot, deletedId);
        await ensureRuntimeDirectory(paths.deletedRoot);
        if (await runtimePathExists(topicPaths.topicRoot)) {
          await copyRuntimeDirectory({
            sourceDir: topicPaths.topicRoot,
            targetDir: deletedTopicRoot,
          });
          await removeRuntimePath(topicPaths.topicRoot);
        }
        await writeIndexRows(
          root,
          rows.filter((entry) => entry.topic_id !== topicId),
          timestamp,
        );

        const definitions = await readStateMap<Record<string, unknown>>(
          paths.topicDefinitions,
          "topics",
        ).catch(() => ({}) as Record<string, Record<string, unknown>>);
        const previousDefinition = definitions[topicId] || {};
        definitions[topicId] = {
          ...previousDefinition,
          id: cleanString(previousDefinition.id) || topicId,
          title: titleFromDefinition(previousDefinition, row.title),
          status: "deleted",
          deleted_at: timestamp,
          deleted_path_id: deletedId,
        };
        await writeStateMap({
          path: paths.topicDefinitions,
          schemaId: "synthesis.topic_definitions",
          key: "topics",
          values: definitions,
          now: timestamp,
        });
        await deleteStateMapEntry({
          path: paths.resolvers,
          schemaId: "synthesis.topic_resolvers",
          key: "resolvers",
          id: topicId,
          now: timestamp,
        });
        await deleteStateMapEntry({
          path: paths.resolvedPaperSets,
          schemaId: "synthesis.resolved_paper_sets",
          key: "paper_sets",
          id: topicId,
          now: timestamp,
        });
        await deleteStateMapEntry({
          path: paths.artifactState,
          schemaId: "synthesis.artifact_state",
          key: "topics",
          id: topicId,
          now: timestamp,
        });
        const deletedRows = (await readDeletedRows(root)).filter(
          (entry) => entry.topic_id !== topicId,
        );
        deletedRows.push({
          topic_id: topicId,
          path_id: row.path_id,
          deleted_path_id: deletedId,
          title: row.title,
          deleted_at: timestamp,
          updated_at: row.updated_at,
          metadata_hash: row.metadata_hash,
          bundle_hash: row.bundle_hash,
        });
        await writeDeletedRows(root, deletedRows, timestamp);
        try {
          await topicGraph.markTopicRelationsDeleted(topicId, {
            transactionId: `topic-graph-relations-delete-${topicPathId(topicId)}`,
          });
          await topicGraph.upsertTopicNode(
            {
              topic_id: topicId,
              title: row.title,
              aliases: [],
              node_type: "materialized",
              definition_status: "deleted",
              current_artifact_path: `deleted/${deletedId}/current/artifact.json`,
            },
            { transactionId: `topic-graph-delete-${topicPathId(topicId)}` },
          );
        } catch (error) {
          await appendJsonLine(paths.log, {
            event: "topic_graph_delete_mark_failed",
            topic_id: topicId,
            at: timestamp,
            error: errorMessage(error),
          });
        }
        await appendJsonLine(paths.log, {
          event: "topic_artifact_deleted",
          topic_id: topicId,
          deleted_path_id: deletedId,
          at: timestamp,
        });
        return {
          ok: true,
          status: "deleted",
          topicId,
          deletedPathId: deletedId,
        };
      },
      (result) => result.ok === true && result.status === "deleted",
    );
  }

  async function listDeletedTopicArtifacts() {
    const deleted = await readDeletedRows(root);
    return {
      deleted,
      diagnostics: {
        count: deleted.length,
        source: "canonical-deleted-topic-artifacts",
      },
    };
  }

  async function purgeDeletedTopicArtifacts(): Promise<SynthesisTopicPurgeResult> {
    return lock.runExclusive(libraryId, async () => {
      const timestamp = now();
      const paths = buildSynthesisStoragePaths(root);
      const deleted = await readDeletedRows(root);
      const topicIds = deleted.map((row) => row.topic_id);
      let purgedCount = 0;
      for (const row of deleted) {
        const deletedTopicRoot = joinPath(
          paths.deletedRoot,
          row.deleted_path_id,
        );
        if (await removeRuntimePath(deletedTopicRoot)) {
          purgedCount += 1;
        }
      }
      try {
        await topicGraph.purgeDeletedTopicRelations(topicIds, {
          transactionId: `topic-graph-relations-purge-${timestamp.replace(/[^0-9A-Za-z]+/g, "")}`,
        });
      } catch (error) {
        await appendJsonLine(paths.log, {
          event: "topic_graph_relations_purge_failed",
          topic_ids: topicIds,
          at: timestamp,
          error: errorMessage(error),
        });
      }
      await writeDeletedRows(root, [], timestamp);
      await appendJsonLine(paths.log, {
        event: "deleted_topic_artifacts_purged",
        purged_count: purgedCount,
        at: timestamp,
      });
      return {
        ok: true,
        status: "purged",
        purged_count: purgedCount,
      };
    });
  }

  async function readTopicArtifact(args: { topicId: string }) {
    const topicId = cleanString(args.topicId);
    if (!topicId) {
      throw new Error("readTopicArtifact requires topicId");
    }
    const topic = await readExistingTopic(root, topicId);
    if (!topic.artifact || !topic.metadata) {
      throw new Error(`topic artifact not found: ${topicId}`);
    }
    const metadata = envelopeData<TopicArtifactMetadata>(
      topic.metadata,
      {} as TopicArtifactMetadata,
    );
    const resolvedTopicId = cleanString(metadata.topic_id) || topic.topicId;
    return {
      topicId: resolvedTopicId,
      requestedTopicId: topicId,
      pathId: topic.pathId,
      artifact: topic.artifact,
      manifest: topic.manifest,
      metadata,
      metadataEnvelope: topic.metadata,
      paths: topic.paths,
      indexRow: topic.indexRow,
    };
  }

  async function readTopicDetail(args: { topicId: string }) {
    const topic = await readTopicArtifact(args);
    const artifact = isObject(topic.artifact)
      ? (topic.artifact as Record<string, unknown>)
      : {};
    const metadata = isObject(topic.metadata)
      ? (topic.metadata as TopicArtifactMetadata)
      : ({} as TopicArtifactMetadata);
    const topicSection = isObject(artifact.topic)
      ? (artifact.topic as Record<string, unknown>)
      : {};
    const summarySection = isObject(artifact.summary)
      ? (artifact.summary as Record<string, unknown>)
      : {};
    const sourcePapers = Array.isArray(artifact.source_papers)
      ? artifact.source_papers.filter(isObject)
      : [];
    const coverageSection = isObject(artifact.coverage)
      ? (artifact.coverage as Record<string, unknown>)
      : {};
    const manifest = isObject(topic.manifest)
      ? (topic.manifest as Record<string, unknown>)
      : {};
    const manifestSections = isObject(manifest.sections)
      ? (manifest.sections as Record<string, unknown>)
      : {};
    const manifestSidecars = isObject(manifest.sidecars)
      ? (manifest.sidecars as Record<string, unknown>)
      : {};
    return {
      ok: true,
      status: "ready",
      topicId: topic.topicId,
      title:
        cleanString(topicSection.title) ||
        cleanString(metadata.title) ||
        topic.topicId,
      language: cleanString(artifact.language || metadata.language) || "auto",
      updated_at: cleanString(metadata.updated_at) || undefined,
      artifact_hash:
        cleanString(metadata.artifact_hash || metadata.structured_hash) ||
        undefined,
      paper_count: sourcePapers.length || metadata.paper_count || 0,
      external_literature_count: metadata.external_literature_count || 0,
      topic: topicSection,
      summary: summarySection,
      taxonomy: isObject(artifact.taxonomy) ? artifact.taxonomy : {},
      improvement_dimensions: isObject(artifact.improvement_dimensions)
        ? artifact.improvement_dimensions
        : Array.isArray(artifact.improvement_dimensions)
          ? { summary: {}, dimensions: artifact.improvement_dimensions }
          : { summary: {}, dimensions: [] },
      claims: Array.isArray(artifact.claims) ? artifact.claims : [],
      timeline_events: isObject(artifact.timeline_events)
        ? artifact.timeline_events
        : Array.isArray(artifact.timeline_events)
          ? { summary: {}, events: artifact.timeline_events }
          : { summary: {}, events: [] },
      source_papers: sourcePapers,
      debates: Array.isArray(artifact.debates) ? artifact.debates : [],
      coverage: coverageSection,
      statistics: isObject(artifact.statistics) ? artifact.statistics : {},
      synthesis_report: isObject(artifact.synthesis_report)
        ? artifact.synthesis_report
        : {},
      future_directions: Array.isArray(artifact.future_directions)
        ? artifact.future_directions
        : [],
      review_outline: isObject(artifact.review_outline)
        ? artifact.review_outline
        : {},
      source_artifacts: isObject(artifact.source_artifacts)
        ? artifact.source_artifacts
        : {},
      diagnostics: artifact.diagnostics,
      artifact_provenance: {
        manifest_schema_id: cleanString(manifest.schema_id),
        manifest_schema_version: cleanString(manifest.schema_version),
        operation: cleanString(manifest.operation || metadata.operation),
        section_count: Object.keys(manifestSections).length,
        sidecar_count: Object.keys(manifestSidecars).length,
        section_hashes: isObject(manifest.section_hashes)
          ? manifest.section_hashes
          : Object.fromEntries(
              Object.entries(manifestSections)
                .filter(([, entry]) => isObject(entry))
                .map(([section, entry]) => [
                  section,
                  cleanString((entry as Record<string, unknown>).hash),
                ]),
            ),
        sections: manifestSections,
        sidecars: manifestSidecars,
        artifact_hash:
          cleanString(metadata.artifact_hash || metadata.structured_hash) ||
          undefined,
        manifest_hash: cleanString(metadata.manifest_hash) || undefined,
      },
      artifact,
      manifest: topic.manifest,
      metadata,
      paths: topic.paths,
    };
  }

  async function getSynthesisWorkbenchChromeInput(
    state: SynthesisUiState = createDefaultSynthesisUiState(),
  ): Promise<SynthesisUiSnapshotInput> {
    const paths = buildSynthesisStoragePaths(root);
    const rootReady = await runtimePathExists(paths.synthesisRoot);
    const conflicts: SynthesisConflictCandidate[] = [];
    const gitSyncState = await gitSync
      .loadGitSyncState()
      .catch(() => undefined);
    const referenceSidecarCache = synthesisRepository.getCacheBasis(
      "reference-sidecar:library",
    );
    const citationGraphCache = synthesisRepository.getCacheBasis(
      "citation-graph:library",
    );
    const sync = assessSynthesisSyncRecovery({
      root: {
        state: rootReady ? "ready" : "missing",
      },
      mirror: {
        manifest: undefined,
        shards: [],
      },
      localIndexes: {
        state:
          referenceSidecarCache?.status === "ready" ||
          citationGraphCache?.status === "ready"
            ? "healthy"
            : "missing",
      },
      conflicts,
    });
    const maintenanceSummary = buildMaintenanceSummary({
      referenceSidecarCache,
      citationGraphCache,
      citationGraphFound: Boolean(citationGraphCache),
    });
    const backgroundJobs = buildMaintenanceBackgroundJobs({
      jobProgressRows: activeJobProgressRows(),
      gitSyncState,
    });
    return {
      libraryId,
      storage: {
        rootPath: root,
        rootState: rootReady ? "ready" : "missing",
        anchorState: "missing",
        mirrorState: "missing",
      },
      sync: {
        status: sync.status,
        diagnostics: sync.diagnostics,
        allowedActions: sync.allowedActions,
        requiresConfirmation: sync.requiresConfirmation,
        git: gitSyncState,
      },
      conflicts,
      maintenance: {
        summary: maintenanceSummary,
        backgroundJobs,
      },
    };
  }

  async function getSynthesisWorkbenchSurfaceInput(
    surface: SynthesisWorkbenchSurfaceName,
    state: SynthesisUiState = createDefaultSynthesisUiState(),
  ): Promise<SynthesisUiSnapshotInput> {
    if (surface === "index") {
      const referencedScope = state.registry.scope === "referenced";
      const registryPage = referencedScope
        ? await registryRowsForReferencedScope(
            SYNTHESIS_REGISTRY_PAGE_LIMIT_MAX,
          )
        : {
            rows: (
              await registryRowsFromCurrentLibraryAndSidecar({
                limit: SYNTHESIS_REGISTRY_PAGE_LIMIT_MAX,
              })
            ).slice(0, SYNTHESIS_REGISTRY_PAGE_LIMIT_MAX),
            rawReferenceIds: [],
          };
      const registryReviewItems = synthesisRepository.listReviewItems({
        statuses: ["open"],
        limit: SYNTHESIS_INDEX_REVIEW_PROPOSAL_LIMIT,
      });
      const referenceSidecarStatus =
        await peekReferenceSidecarCacheStatus().catch(() => undefined);
      const indexReviewProposals =
        indexReviewProposalsFromDb(registryReviewItems);
      const referenceMatchProposals = synthesisRepository
        .listReferenceMatchProposals({
          statuses: ["open"],
          limit: SYNTHESIS_INDEX_REVIEW_PROPOSAL_LIMIT,
        })
        .map(referenceMatchProposalToUiRow);
      const matchTargetCandidates = await referenceMatchTargetCandidatesForUi();
      const canonicalRevision = buildCanonicalReferenceRowsForUi();
      return {
        libraryId,
        registry: {
          rows: registryRowsWithReferenceFactsToUi(registryPage.rows, {
            includeReferences: referencedScope,
            rawReferenceIds: registryPage.rawReferenceIds,
            referenceSourceRefs: referencedScope
              ? []
              : state.registry.expandedSourceRefs,
          }),
          cleanupProposals: indexReviewProposals,
          matchProposals: referenceMatchProposals,
          matchTargetCandidates,
          canonicalRows: canonicalRevision.rows,
          canonicalDiagnostics: canonicalRevision.diagnostics,
          cacheStatus: referenceSidecarStatus,
        },
      };
    }
    if (surface === "review") {
      const activeReviewTab =
        cleanString(state.reviews.activeTab) || "reference_matching";
      const referenceSidecarStatus =
        await peekReferenceSidecarCacheStatus().catch(() => undefined);
      const registryReviewItems =
        activeReviewTab === "reference_matching"
          ? synthesisRepository.listReviewItems(
              reviewItemQueryForReviewState(state),
            )
          : [];
      const indexReviewProposals =
        indexReviewProposalsFromDb(registryReviewItems);
      const referenceMatchProposalRecords =
        activeReviewTab === "reference_matching"
          ? synthesisRepository.listReferenceMatchProposals(
              proposalQueryForReviewState(state),
            )
          : [];
      const proposalRawReferenceIds = rawReferenceIdsForMatchProposals(
        referenceMatchProposalRecords,
      );
      const registryRows = await registryRowsForReferenceMatchProposalContext(
        referenceMatchProposalRecords,
      );
      const referenceMatchProposals = referenceMatchProposalRecords.map(
        referenceMatchProposalToUiRow,
      );
      const matchTargetCandidates =
        activeReviewTab === "reference_matching"
          ? await referenceMatchTargetCandidatesForUi()
          : [];
      const topicGraphContext =
        activeReviewTab === "topic_graph"
          ? await topicGraphSnapshotForUi().catch(() => undefined)
          : undefined;
      const topicGraphSnapshot = topicGraphContext?.snapshot;
      const reviewConcepts =
        activeReviewTab === "concepts"
          ? await conceptKb.loadConceptKb().catch(() => undefined)
          : undefined;
      return {
        libraryId,
        registry: {
          rows: registryRowsWithReferenceFactsToUi(registryRows, {
            includeReferences: activeReviewTab === "reference_matching",
            rawReferenceIds: proposalRawReferenceIds,
          }),
          cleanupProposals: indexReviewProposals,
          matchProposals: referenceMatchProposals,
          matchTargetCandidates,
          cacheStatus: referenceSidecarStatus,
        },
        topicGraph: topicGraphSnapshot
          ? {
              nodes: topicGraphSnapshot.nodes,
              edges: topicGraphSnapshot.edges,
              reviewItems: topicGraphSnapshot.review_items,
              manifest: topicGraphSnapshot.manifest,
              projection: topicGraphSnapshot.projection,
              diagnostics: topicGraphSnapshot.diagnostics,
            }
          : undefined,
        concepts: reviewConcepts
          ? {
              concepts: reviewConcepts.concepts,
              senses: reviewConcepts.senses,
              aliases: reviewConcepts.aliases,
              relations: reviewConcepts.relations,
              manifest: reviewConcepts.manifest,
              projection: reviewConcepts.projection,
              diagnostics: reviewConcepts.diagnostics,
              overlayEntries: reviewConcepts.overlay_entries,
              reviewItems: reviewConcepts.review_items,
            }
          : undefined,
      };
    }
    if (surface === "graph") {
      const dbGraph = readDbCitationGraphOverview();
      const citationGraphCache = synthesisRepository.getCacheBasis(
        "citation-graph:library",
      );
      const topicGraphContext = await topicGraphSnapshotForUi({
        persistMissingDefinition: true,
      }).catch(() => undefined);
      const topicGraphSnapshot = topicGraphContext?.snapshot;
      const artifactState = topicGraphSnapshot
        ? await readArtifactStateRows(root).catch(() => ({}))
        : {};
      const topicScopes = topicGraphSnapshot
        ? topicGraphScopesFromGraphNodes({
            nodes: topicGraphSnapshot.nodes,
            artifactState,
            metadata: topicGraphContext?.metadata || {},
          })
        : [];
      const graphLayoutRecord = synthesisRepository.getCitationGraphLayoutState(
        {
          viewKey: "workbench_overview",
          preset: state.graph.layoutAlgorithm,
        },
      );
      const staleDelta =
        citationGraphIncrementalDeltaFromBasis(citationGraphCache);
      const graphLayout = parseCitationGraphLayout(graphLayoutRecord);
      const graphLayoutStatus = citationGraphLayoutStatus({
        graph: dbGraph,
        record: graphLayoutRecord,
        layout: graphLayout,
      });
      const graph = dbGraph.nodes.length
        ? dbGraph
        : emptyCitationGraph({
            diagnostics: { status: "graph_sqlite_rows_missing" },
          });
      return {
        libraryId,
        graph: {
          ...mapGraphToUi(graph, {
            layout: graphLayout,
            layoutStatus: graphLayoutStatus,
          }),
          diagnostics: {
            ...graph.diagnostics,
            storage: "sqlite",
            cache_status: cleanString(citationGraphCache?.status) || "missing",
            cache_key: "citation-graph:library",
            cache_delta_available: Boolean(staleDelta),
            cache_delta_source_count: staleDelta?.sourceRefs.length || 0,
            cache_delta_canonical_count:
              (staleDelta?.changedCanonicalIds.length || 0) +
              (staleDelta?.changedBindingCanonicalIds.length || 0) +
              (staleDelta?.changedRedirectCanonicalIds.length || 0),
            layout_status: graphLayoutStatus,
            layout_source: "sqlite",
          },
          topicScopes,
        },
        topicGraph: topicGraphSnapshot
          ? {
              nodes: topicGraphSnapshot.nodes,
              edges: topicGraphSnapshot.edges,
              reviewItems: topicGraphSnapshot.review_items,
              manifest: topicGraphSnapshot.manifest,
              projection: topicGraphSnapshot.projection,
              diagnostics: topicGraphSnapshot.diagnostics,
            }
          : undefined,
      };
    }
    if (surface === "tags") {
      const tags = await tagVocabulary
        .loadTagVocabulary()
        .catch(() => undefined);
      const tagUsageCounts = tags
        ? await tagUsageCountsForService(options, libraryId).catch(
            () => new Map<string, number>(),
          )
        : new Map<string, number>();
      const staged = await tagVocabulary
        .listStagedTagSuggestions()
        .catch(() => []);
      return {
        libraryId,
        tags: tags
          ? {
              entries: applyTagUsageCounts(tags.entries, tagUsageCounts),
              aliases: tags.aliases,
              abbrev: tags.abbrev,
              protocol: tags.protocol,
              manifest: tags.manifest,
              validationWarnings: tags.validation_warnings,
              projection: tags.projection,
              staged,
              importPreview: tagImportPreviewState?.preview,
            }
          : undefined,
      };
    }
    if (surface === "concepts") {
      const concepts = await conceptKb.loadConceptKb().catch(() => undefined);
      return {
        libraryId,
        concepts: concepts
          ? {
              concepts: concepts.concepts,
              senses: concepts.senses,
              aliases: concepts.aliases,
              relations: concepts.relations,
              manifest: concepts.manifest,
              projection: concepts.projection,
              diagnostics: concepts.diagnostics,
              overlayEntries: concepts.overlay_entries,
              reviewItems: concepts.review_items,
            }
          : undefined,
      };
    }
    if (surface === "topics" || surface === "home") {
      const artifactState = await readArtifactStateRows(root);
      const topicGraphContext = await topicGraphSnapshotForUi({
        persistMissingDefinition: true,
      }).catch(() => undefined);
      const topicGraphSnapshot = topicGraphContext?.snapshot;
      const artifactRows = topicGraphSnapshot
        ? topicArtifactRowsFromGraphNodes({
            nodes: topicGraphSnapshot.nodes,
            artifactState,
            definitions: topicGraphContext?.definitions || {},
            metadata: topicGraphContext?.metadata || {},
          })
        : [];
      return {
        libraryId,
        deletedArtifacts: {
          rows: [],
        },
        artifacts: artifactRows,
        topicGraph: topicGraphSnapshot
          ? {
              nodes: topicGraphSnapshot.nodes,
              edges: topicGraphSnapshot.edges,
              reviewItems: topicGraphSnapshot.review_items,
              manifest: topicGraphSnapshot.manifest,
              projection: topicGraphSnapshot.projection,
              diagnostics: topicGraphSnapshot.diagnostics,
            }
          : undefined,
      };
    }
    return { libraryId };
  }

  async function getDebugSynthesisSnapshotInput(
    state: SynthesisUiState = createDefaultSynthesisUiState(),
  ): Promise<SynthesisUiSnapshotInput> {
    const paths = buildSynthesisStoragePaths(root);
    const rootReady = await runtimePathExists(paths.synthesisRoot);
    const registryRows = (
      await registryRowsFromCurrentLibraryAndSidecar()
    ).slice(0, SYNTHESIS_REGISTRY_PAGE_LIMIT_MAX);
    const registryReferenceFacts = synthesisRepository.listReferenceFacts({
      sourceLiteratureItemIds: registryRows.map((row) => row.paper_ref),
    });
    const referenceFactsBySource = new Map<
      string,
      typeof registryReferenceFacts
    >();
    registryReferenceFacts.forEach((reference) => {
      const key = reference.sourceLiteratureItemId;
      const rows = referenceFactsBySource.get(key) || [];
      rows.push(reference);
      referenceFactsBySource.set(key, rows);
    });
    const registryReviewItems = synthesisRepository.listReviewItems();
    const artifactState = await readArtifactStateRows(root);
    const definitions = await readTopicDefinitionsMap(root);
    const dbGraph = readDbCitationGraphOverview();
    const referenceSidecarCache = synthesisRepository.getCacheBasis(
      "reference-sidecar:library",
    );
    const citationGraphCache = synthesisRepository.getCacheBasis(
      "citation-graph:library",
    );
    const staleDelta =
      citationGraphIncrementalDeltaFromBasis(citationGraphCache);
    const graphLayoutRecord = synthesisRepository.getCitationGraphLayoutState({
      viewKey: "workbench_overview",
      preset: state.graph.layoutAlgorithm,
    });
    const graphLayout = parseCitationGraphLayout(graphLayoutRecord);
    const graphLayoutStatus = citationGraphLayoutStatus({
      graph: dbGraph,
      record: graphLayoutRecord,
      layout: graphLayout,
    });
    const tags = await tagVocabulary.loadTagVocabulary().catch(() => undefined);
    const tagUsageCounts = tags
      ? await tagUsageCountsForService(options, libraryId).catch(
          () => new Map<string, number>(),
        )
      : new Map<string, number>();
    const stagedTags = await tagVocabulary
      .listStagedTagSuggestions()
      .catch(() => []);
    const concepts = await conceptKb.loadConceptKb().catch(() => undefined);
    const referenceSidecarStatus =
      await peekReferenceSidecarCacheStatus().catch(() => undefined);
    const topicGraphContext = await topicGraphSnapshotForUi().catch(
      () => undefined,
    );
    const topicGraphSnapshot = topicGraphContext?.snapshot;
    const conflicts: SynthesisConflictCandidate[] = [];
    const artifactRows = topicGraphSnapshot
      ? topicArtifactRowsFromGraphNodes({
          nodes: topicGraphSnapshot.nodes,
          artifactState,
          definitions: topicGraphContext?.definitions || definitions,
          metadata: topicGraphContext?.metadata || {},
        })
      : [];
    const topicScopes = topicGraphSnapshot
      ? topicGraphScopesFromGraphNodes({
          nodes: topicGraphSnapshot.nodes,
          artifactState,
          metadata: topicGraphContext?.metadata || {},
        })
      : [];
    const gitSyncState = await gitSync
      .loadGitSyncState()
      .catch(() => undefined);
    const graph = dbGraph.nodes.length
      ? dbGraph
      : emptyCitationGraph({
          diagnostics: { status: "graph_sqlite_rows_missing" },
        });
    const sync = assessSynthesisSyncRecovery({
      root: {
        state: rootReady ? "ready" : "missing",
      },
      mirror: {
        manifest: undefined,
        shards: [],
      },
      localIndexes: {
        state: artifactRows.length ? "healthy" : "missing",
      },
      conflicts,
    });
    const indexReviewProposals =
      indexReviewProposalsFromDb(registryReviewItems);
    const referenceMatchProposals = synthesisRepository
      .listReferenceMatchProposals({ limit: 100 })
      .map(referenceMatchProposalToUiRow);
    const matchTargetCandidates = await referenceMatchTargetCandidatesForUi();
    const maintenanceSummary = buildMaintenanceSummary({
      referenceSidecarCache,
      citationGraphCache,
      citationGraphHash: graph.graph_hash,
      citationGraphFound: dbGraph.nodes.length > 0,
    });
    const backgroundJobs = buildMaintenanceBackgroundJobs({
      jobProgressRows: activeJobProgressRows(),
      gitSyncState,
    });
    return {
      libraryId,
      storage: {
        rootPath: root,
        rootState: rootReady ? "ready" : "missing",
        anchorState: "missing",
        mirrorState: "missing",
      },
      sync: {
        status: sync.status,
        diagnostics: sync.diagnostics,
        allowedActions: sync.allowedActions,
        requiresConfirmation: sync.requiresConfirmation,
        git: gitSyncState,
      },
      conflicts,
      deletedArtifacts: {
        rows: [],
      },
      artifacts: artifactRows,
      registry: {
        rows: registryRowsToUi(registryRows).map((row) => {
          const references = referenceFactsBySource.get(row.paper_ref) || [];
          const unbound = references.filter(
            (reference) => !reference.bindingStatus,
          ).length;
          return {
            ...row,
            literature_item_id: row.paper_ref,
            reference_count: references.length,
            unbound_reference_count: unbound,
            references: references.map(referenceSidecarReferenceToUiRow),
          };
        }),
        cleanupProposals: indexReviewProposals,
        matchProposals: referenceMatchProposals,
        matchTargetCandidates,
        cacheStatus: referenceSidecarStatus,
      },
      graph: {
        ...mapGraphToUi(graph, {
          layout: graphLayout,
          layoutStatus: graphLayoutStatus,
        }),
        topicScopes,
        diagnostics: {
          ...graph.diagnostics,
          storage: "sqlite",
          cache_status: cleanString(citationGraphCache?.status) || "missing",
          cache_key: "citation-graph:library",
          cache_delta_available: Boolean(staleDelta),
          cache_delta_source_count: staleDelta?.sourceRefs.length || 0,
          cache_delta_canonical_count:
            (staleDelta?.changedCanonicalIds.length || 0) +
            (staleDelta?.changedBindingCanonicalIds.length || 0) +
            (staleDelta?.changedRedirectCanonicalIds.length || 0),
          layout_status: graphLayoutStatus,
          layout_source: "sqlite",
        },
      },
      maintenance: {
        summary: maintenanceSummary,
        backgroundJobs,
      },
      tags: tags
        ? {
            entries: applyTagUsageCounts(tags.entries, tagUsageCounts),
            aliases: tags.aliases,
            abbrev: tags.abbrev,
            protocol: tags.protocol,
            manifest: tags.manifest,
            validationWarnings: tags.validation_warnings,
            projection: tags.projection,
            staged: stagedTags,
            importPreview: tagImportPreviewState?.preview,
          }
        : undefined,
      concepts: concepts
        ? {
            concepts: concepts.concepts,
            senses: concepts.senses,
            aliases: concepts.aliases,
            relations: concepts.relations,
            manifest: concepts.manifest,
            projection: concepts.projection,
            diagnostics: concepts.diagnostics,
            overlayEntries: concepts.overlay_entries,
            reviewItems: concepts.review_items,
          }
        : undefined,
      topicGraph: topicGraphSnapshot
        ? {
            nodes: topicGraphSnapshot.nodes,
            edges: topicGraphSnapshot.edges,
            reviewItems: topicGraphSnapshot.review_items,
            manifest: topicGraphSnapshot.manifest,
            projection: topicGraphSnapshot.projection,
            diagnostics: topicGraphSnapshot.diagnostics,
          }
        : undefined,
    };
  }

  async function warmSynthesisWorkbenchSurfaces(
    args: {
      state?: SynthesisUiState;
      surfaces?: SynthesisWorkbenchSurfaceName[];
      onPhase?: (phase: {
        surface: "chrome" | SynthesisWorkbenchSurfaceName;
        status: "ready" | "failed";
        input?: SynthesisUiSnapshotInput;
        error?: unknown;
      }) => void | Promise<void>;
    } = {},
  ) {
    const state = args.state || createDefaultSynthesisUiState();
    const surfaces =
      args.surfaces !== undefined
        ? args.surfaces
        : ([
            "index",
            "review",
            "graph",
            "tags",
            "concepts",
            "topics",
          ] satisfies SynthesisWorkbenchSurfaceName[]);
    let input = await getSynthesisWorkbenchChromeInput(state);
    await args.onPhase?.({ surface: "chrome", status: "ready", input });
    for (const surface of surfaces) {
      await yieldToEventLoop();
      try {
        const surfaceInput = await getSynthesisWorkbenchSurfaceInput(
          surface,
          state,
        );
        input = mergeSynthesisUiSnapshotInput(input, surfaceInput);
        await args.onPhase?.({ surface, status: "ready", input: surfaceInput });
      } catch (error) {
        await args.onPhase?.({ surface, status: "failed", error });
      }
    }
    return input;
  }

  async function getSynthesisSnapshot(
    state: SynthesisUiState = createDefaultSynthesisUiState(),
  ): Promise<SynthesisUiSnapshot> {
    return buildSynthesisUiSnapshot(
      await getDebugSynthesisSnapshotInput(state),
      state,
    );
  }

  function getSynthesisBackgroundJobRows() {
    return buildMaintenanceBackgroundJobs({
      jobProgressRows: activeJobProgressRows(),
    });
  }

  async function consumeRelatedItemsSyncEcho(args: {
    libraryId: number;
    itemKey: string;
    relatedItemKey?: string;
  }) {
    return synthesisRepository.consumeRelatedItemsSyncEcho(args);
  }

  function markRelatedItemsSyncCacheStale(args: {
    source: string;
    sourceHash?: string;
  }) {
    const activeSourceRefs = new Set(
      synthesisRepository
        .listCitationNodes({ statuses: ["active"] })
        .filter((node) => {
          const parsed = parsePaperRef(node.literatureItemId);
          return Boolean(parsed?.itemKey && node.hasZoteroBinding);
        })
        .map((node) => node.literatureItemId),
    );
    const matchedEdges = synthesisRepository
      .listCitationEdges({ statuses: ["accepted"] })
      .filter((edge) => edge.targetLiteratureItemId);
    const activeEdgeIds = new Set(matchedEdges.map((edge) => edge.edgeId));
    const hasMatchedLibraryEdge = matchedEdges.some(
      (edge) =>
        activeSourceRefs.has(edge.sourceLiteratureItemId) &&
        activeSourceRefs.has(edge.targetLiteratureItemId || ""),
    );
    const staleSynthesisEffects = synthesisRepository
      .listRelatedItemsSyncEffects({ statuses: ["applied", "already_existed"] })
      .filter(
        (effect) =>
          effect.createdBySynthesis &&
          (!effect.citationEdgeId || !activeEdgeIds.has(effect.citationEdgeId)),
      );
    if (!hasMatchedLibraryEdge && !staleSynthesisEffects.length) {
      return null;
    }
    const timestamp = now();
    const diagnostics = staleSynthesisEffects.slice(0, 10).map((effect) => ({
      code: "related_items_sync_stale_effect_requires_revoke",
      severity: "warning" as const,
      message: `Synthesis-created related-items effect ${effect.effectId} no longer has an active accepted citation edge and needs explicit reconciliation.`,
    }));
    synthesisRepository.upsertCacheBasis({
      cacheKey: "related-items-sync:global",
      cacheKind: "related_items_sync",
      scopeKind: "library",
      scopeRef: String(libraryId),
      status: "stale",
      basisKind: "citation_graph",
      sourceHash: cleanString(args.sourceHash),
      staleReason: cleanString(args.source) || "citation_graph_changed",
      diagnosticsJson: JSON.stringify(diagnostics),
      updatedAt: timestamp,
    });
    return {
      cacheKey: "related-items-sync:global",
      status: "stale",
      diagnostics,
    };
  }

  function markRelatedItemsSyncCacheStaleForSidecarChange(args: {
    source: string;
    timestamp: string;
    sourceRefs?: unknown;
    changedCanonicalIds?: unknown;
    changedBindingCanonicalIds?: unknown;
    changedRedirectCanonicalIds?: unknown;
  }) {
    const sourceRefs = citationGraphDeltaStrings(args.sourceRefs);
    const changedCanonicalIds = citationGraphDeltaStrings(
      args.changedCanonicalIds,
    );
    const changedBindingCanonicalIds = citationGraphDeltaStrings(
      args.changedBindingCanonicalIds,
    );
    const changedRedirectCanonicalIds = citationGraphDeltaStrings(
      args.changedRedirectCanonicalIds,
    );
    if (
      !sourceRefs.length &&
      !changedCanonicalIds.length &&
      !changedBindingCanonicalIds.length &&
      !changedRedirectCanonicalIds.length
    ) {
      return null;
    }
    const diagnostic = {
      code: "related_items_sync_stale_delta",
      severity: "info" as const,
      reason: cleanString(args.source) || "sidecar_changed",
      source_refs: sourceRefs,
      changed_canonical_ids: changedCanonicalIds,
      changed_binding_canonical_ids: changedBindingCanonicalIds,
      changed_redirect_canonical_ids: changedRedirectCanonicalIds,
    };
    synthesisRepository.upsertCacheBasis({
      cacheKey: "related-items-sync:global",
      cacheKind: "related_items_sync",
      scopeKind: sourceRefs.length ? "source_ref" : "library",
      scopeRef: sourceRefs.length ? sourceRefs.join(",") : String(libraryId),
      status: "stale",
      basisKind: "reference_sidecar",
      basisValue: cleanString(args.source),
      sourceHash: hashCanonicalJson({
        source: cleanString(args.source),
        source_refs: sourceRefs,
        changed_canonical_ids: changedCanonicalIds,
        changed_binding_canonical_ids: changedBindingCanonicalIds,
        changed_redirect_canonical_ids: changedRedirectCanonicalIds,
      }),
      staleReason: cleanString(args.source) || "sidecar_changed",
      diagnosticsJson: JSON.stringify([diagnostic]),
      updatedAt: args.timestamp,
    });
    return {
      cacheKey: "related-items-sync:global",
      status: "stale",
      diagnostics: [diagnostic],
    };
  }

  function relatedItemsEdgesFromGraphRecords(args: {
    nodes: Iterable<SynthesisCitationNodeRecord>;
    edges: Iterable<SynthesisCitationEdgeRecord>;
    sourceRefs?: string[];
  }) {
    const sourceRefSet = new Set(
      (args.sourceRefs || []).map(cleanString).filter(Boolean),
    );
    const nodeBindings = new Map<
      string,
      { literatureItemId: string; libraryId: number; itemKey: string }
    >();
    for (const node of args.nodes) {
      const parsed = parsePaperRef(node.literatureItemId);
      if (!parsed?.itemKey) {
        continue;
      }
      nodeBindings.set(node.literatureItemId, {
        literatureItemId: node.literatureItemId,
        libraryId: parsed.libraryId,
        itemKey: parsed.itemKey,
      });
    }
    const byEdgeId = new Map<string, RelatedItemsAcceptedCitationEdge>();
    for (const edge of args.edges) {
      if (edge.edgeStatus !== "accepted") {
        continue;
      }
      if (sourceRefSet.size && !sourceRefSet.has(edge.sourceLiteratureItemId)) {
        continue;
      }
      const source = nodeBindings.get(edge.sourceLiteratureItemId);
      const target = nodeBindings.get(cleanString(edge.targetLiteratureItemId));
      if (!source || !target) {
        continue;
      }
      byEdgeId.set(edge.edgeId, {
        edgeId: edge.edgeId,
        sourceLiteratureItemId: source.literatureItemId,
        targetLiteratureItemId: target.literatureItemId,
        sourceLibraryId: source.libraryId,
        sourceItemKey: source.itemKey,
        targetLibraryId: target.libraryId,
        targetItemKey: target.itemKey,
      });
    }
    return Array.from(byEdgeId.values()).sort((left, right) =>
      left.edgeId.localeCompare(right.edgeId),
    );
  }

  async function loadAcceptedLibraryCitationEdgesForRelatedItems(args: {
    timestamp: string;
    sourceRefs?: string[];
  }) {
    const sourceRefs = Array.from(
      new Set((args.sourceRefs || []).map(cleanString).filter(Boolean)),
    );
    const graphBasis = synthesisRepository.getCacheBasis(
      "citation-graph:library",
    );
    const graphNodes = synthesisRepository.listCitationNodes({
      statuses: ["active"],
    });
    const graphEdges = synthesisRepository.listCitationEdges({
      statuses: ["accepted"],
      ...(sourceRefs.length ? { sourceLiteratureItemIds: sourceRefs } : {}),
    });
    if (
      graphBasis?.status === "ready" &&
      (graphNodes.length > 0 || graphEdges.length > 0)
    ) {
      return {
        source: "citation_graph_cache" as const,
        edges: relatedItemsEdgesFromGraphRecords({
          nodes: graphNodes,
          edges: graphEdges,
          sourceRefs,
        }),
      };
    }
    const { built } = await buildCitationGraphCacheRecordsFromSidecar({
      timestamp: args.timestamp,
      ...(sourceRefs.length ? { sourceRefs } : {}),
    });
    return {
      source: "reference_sidecar_fallback" as const,
      edges: relatedItemsEdgesFromGraphRecords({
        nodes: built.nodes.values(),
        edges: built.edges,
        sourceRefs,
      }),
    };
  }

  async function syncRelatedItemsFromAcceptedEdges(args: {
    host?: RelatedItemsSyncHost | null;
    sourceRefs?: string[];
    reason?: string;
    onProgress?: () => void | Promise<void>;
  }) {
    const timestamp = now();
    const sourceRefs = Array.from(
      new Set((args.sourceRefs || []).map(cleanString).filter(Boolean)),
    );
    const operationId = `related-items-sync:${timestamp}`;
    const diagnostics: SynthesisUpdateDiagnostic[] = [];
    const scopeRef = sourceRefs.length ? sourceRefs.join(",") : "library";
    synthesisRepository.upsertOperation({
      operationId,
      operationType: "related_items_sync",
      libraryId,
      scopeKind: sourceRefs.length ? "source_ref" : "library",
      scopeRef,
      status: "running",
      label: "Related items sync",
      phase: "scan",
      phaseLabel: "Resolve accepted citation edges",
      progressMode: "indeterminate",
      processedCount: 0,
      totalCount: 0,
      diagnosticsJson: "[]",
      createdAt: timestamp,
      startedAt: timestamp,
      updatedAt: timestamp,
    });
    const host =
      args.host ||
      options.relatedItemsSyncHost ||
      createDefaultRelatedItemsSyncHost();
    if (!host) {
      diagnostics.push({
        code: "related_items_host_unavailable",
        severity: "error",
        message: "Zotero related-items host is unavailable",
      });
      synthesisRepository.updateOperationStatus({
        operationId,
        status: "failed",
        phase: "failed",
        phaseLabel: "Failed",
        processedCount: 0,
        failedCount: 1,
        totalCount: 0,
        diagnosticsJson: JSON.stringify(diagnostics),
      });
      return {
        operationId,
        processed: 0,
        added: 0,
        existing: 0,
        skipped: 0,
        revoked: 0,
        failed: 1,
        diagnostics,
      };
    }
    let edgeResult: Awaited<
      ReturnType<typeof loadAcceptedLibraryCitationEdgesForRelatedItems>
    >;
    try {
      edgeResult = await loadAcceptedLibraryCitationEdgesForRelatedItems({
        timestamp,
        sourceRefs,
      });
    } catch (error) {
      diagnostics.push({
        code: "related_items_edge_resolver_failed",
        severity: "error",
        message: errorMessage(error),
      });
      synthesisRepository.updateOperationStatus({
        operationId,
        status: "failed",
        phase: "failed",
        phaseLabel: "Failed",
        processedCount: 0,
        failedCount: 1,
        totalCount: 0,
        diagnosticsJson: JSON.stringify(diagnostics),
      });
      return {
        operationId,
        processed: 0,
        added: 0,
        existing: 0,
        skipped: 0,
        revoked: 0,
        failed: 1,
        diagnostics,
      };
    }
    const matchedEdges = edgeResult.edges;
    const activeEdgeIds = new Set(matchedEdges.map((edge) => edge.edgeId));
    const scopedSourceRefSet = new Set(sourceRefs);
    const staleEffects = synthesisRepository
      .listRelatedItemsSyncEffects({
        statuses: ["applied", "pending_external_write"],
      })
      .filter((effect) => {
        if (!effect.createdBySynthesis || !effect.citationEdgeId) {
          return false;
        }
        if (
          scopedSourceRefSet.size &&
          !scopedSourceRefSet.has(effect.sourceLiteratureItemId)
        ) {
          return false;
        }
        return !activeEdgeIds.has(effect.citationEdgeId);
      });
    const totalWork = matchedEdges.length + staleEffects.length;
    const graphHash = hashCanonicalJson({
      kind: "related-items-sync-input",
      source: edgeResult.source,
      reason: cleanString(args.reason),
      sourceRefs,
      edges: matchedEdges.map((edge) => [
        edge.edgeId,
        edge.sourceLiteratureItemId,
        edge.targetLiteratureItemId,
      ]),
    });
    synthesisRepository.updateOperationStatus({
      operationId,
      status: "running",
      phase: "apply",
      phaseLabel: "Apply related-items changes",
      processedCount: 0,
      totalCount: totalWork,
      diagnosticsJson: JSON.stringify([
        {
          code: "related_items_edge_resolver",
          severity: "info",
          source: edgeResult.source,
          edge_count: matchedEdges.length,
          stale_effect_count: staleEffects.length,
        },
      ]),
    });
    let processed = 0;
    let added = 0;
    let existing = 0;
    let skipped = 0;
    let revoked = 0;
    let failed = 0;
    for (const edge of matchedEdges) {
      processed += 1;
      const effectId = `related-items:${safeFileSegment(edge.edgeId, "edge")}`;
      try {
        const exists = await host.hasRelatedItem({
          sourceLibraryId: edge.sourceLibraryId,
          sourceItemKey: edge.sourceItemKey,
          targetLibraryId: edge.targetLibraryId,
          targetItemKey: edge.targetItemKey,
        });
        if (exists) {
          existing += 1;
          synthesisRepository.upsertRelatedItemsSyncEffect({
            effectId,
            operationId,
            citationEdgeId: edge.edgeId,
            sourceLiteratureItemId: edge.sourceLiteratureItemId,
            targetLiteratureItemId: edge.targetLiteratureItemId,
            sourceLibraryId: edge.sourceLibraryId,
            sourceItemKey: edge.sourceItemKey,
            targetLibraryId: edge.targetLibraryId,
            targetItemKey: edge.targetItemKey,
            action: "add",
            status: "already_existed",
            createdBySynthesis: false,
            graphHash,
            externalWriteAt: "",
            echoState: "observed",
            echoObservedAt: timestamp,
            diagnosticsJson: "[]",
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        } else {
          await host.addRelatedItem({
            sourceLibraryId: edge.sourceLibraryId,
            sourceItemKey: edge.sourceItemKey,
            targetLibraryId: edge.targetLibraryId,
            targetItemKey: edge.targetItemKey,
          });
          added += 1;
          synthesisRepository.upsertRelatedItemsSyncEffect({
            effectId,
            operationId,
            citationEdgeId: edge.edgeId,
            sourceLiteratureItemId: edge.sourceLiteratureItemId,
            targetLiteratureItemId: edge.targetLiteratureItemId,
            sourceLibraryId: edge.sourceLibraryId,
            sourceItemKey: edge.sourceItemKey,
            targetLibraryId: edge.targetLibraryId,
            targetItemKey: edge.targetItemKey,
            action: "add",
            status: "pending_external_write",
            createdBySynthesis: true,
            graphHash,
            externalWriteAt: timestamp,
            echoState: "awaiting_echo",
            diagnosticsJson: "[]",
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
      } catch (error) {
        failed += 1;
        diagnostics.push({
          code: "related_items_sync_edge_failed",
          severity: "error",
          message: errorMessage(error),
        });
      }
      if (processed % 25 === 0) {
        synthesisRepository.updateOperationStatus({
          operationId,
          status: "running",
          phase: "apply",
          phaseLabel: "Apply related-items changes",
          processedCount: processed,
          totalCount: totalWork,
          diagnosticsJson: JSON.stringify(diagnostics),
        });
        await args.onProgress?.();
        await yieldToEventLoop();
      }
    }
    for (const effect of staleEffects) {
      processed += 1;
      if (typeof host.removeRelatedItem !== "function") {
        skipped += 1;
        continue;
      }
      try {
        const exists = await host.hasRelatedItem({
          sourceLibraryId: effect.sourceLibraryId,
          sourceItemKey: effect.sourceItemKey,
          targetLibraryId: effect.targetLibraryId,
          targetItemKey: effect.targetItemKey,
        });
        if (exists) {
          await host.removeRelatedItem({
            sourceLibraryId: effect.sourceLibraryId,
            sourceItemKey: effect.sourceItemKey,
            targetLibraryId: effect.targetLibraryId,
            targetItemKey: effect.targetItemKey,
          });
          revoked += 1;
        }
        synthesisRepository.upsertRelatedItemsSyncEffect({
          ...effect,
          operationId,
          action: "revoke",
          status: exists ? "revoked" : "already_absent",
          externalWriteAt: exists ? timestamp : effect.externalWriteAt,
          echoState: exists ? "awaiting_echo" : "observed",
          echoObservedAt: exists ? "" : timestamp,
          updatedAt: timestamp,
        });
      } catch (error) {
        failed += 1;
        diagnostics.push({
          code: "related_items_revoke_failed",
          severity: "error",
          message: errorMessage(error),
        });
      }
      if (processed % 25 === 0) {
        synthesisRepository.updateOperationStatus({
          operationId,
          status: "running",
          phase: "apply",
          phaseLabel: "Apply related-items changes",
          processedCount: processed,
          totalCount: totalWork,
          diagnosticsJson: JSON.stringify(diagnostics),
        });
        await args.onProgress?.();
        await yieldToEventLoop();
      }
    }
    synthesisRepository.updateOperationStatus({
      operationId,
      status: failed ? "failed" : "completed",
      phase: "complete",
      phaseLabel: "Complete",
      processedCount: processed,
      skippedCount: skipped,
      failedCount: failed,
      totalCount: totalWork,
      diagnosticsJson: JSON.stringify(diagnostics),
    });
    return {
      operationId,
      processed,
      added,
      existing,
      skipped,
      revoked,
      failed,
      diagnostics,
    };
  }

  async function syncRelatedItemsAfterSynthesisUpdate(args: {
    sourceRefs?: string[];
    reason: string;
    onProgress?: () => void | Promise<void>;
  }) {
    try {
      return await syncRelatedItemsFromAcceptedEdges({
        sourceRefs: args.sourceRefs,
        reason: args.reason,
        onProgress: args.onProgress,
      });
    } catch (error) {
      const timestamp = now();
      const operationId = `related-items-sync:${timestamp}`;
      const diagnostics: SynthesisUpdateDiagnostic[] = [
        {
          code: "related_items_sync_failed",
          severity: "error",
          message: errorMessage(error),
        },
      ];
      synthesisRepository.upsertOperation({
        operationId,
        operationType: "related_items_sync",
        libraryId,
        scopeKind: args.sourceRefs?.length ? "source_ref" : "library",
        scopeRef: args.sourceRefs?.length
          ? args.sourceRefs.join(",")
          : "library",
        status: "failed",
        label: "Related items sync",
        phase: "failed",
        phaseLabel: "Failed",
        progressMode: "determinate",
        processedCount: 0,
        failedCount: 1,
        totalCount: 0,
        diagnosticsJson: JSON.stringify(diagnostics),
        createdAt: timestamp,
        startedAt: timestamp,
        completedAt: timestamp,
        updatedAt: timestamp,
      });
      return {
        operationId,
        processed: 0,
        added: 0,
        existing: 0,
        skipped: 0,
        revoked: 0,
        failed: 1,
        diagnostics,
      };
    }
  }

  async function syncRelatedItemsNow(
    args: { host?: RelatedItemsSyncHost | null } = {},
  ) {
    return syncRelatedItemsFromAcceptedEdges({
      host: args.host,
      reason: "manual",
    });
  }

  function parsePaperRef(value: unknown) {
    const text = cleanString(value);
    const match = text.match(/^(\d+):(.+)$/);
    if (!match) {
      return null;
    }
    return {
      libraryId: normalizeLibraryId(match[1]) || libraryId,
      itemKey: cleanString(match[2]),
    };
  }

  async function resolveRegistryInputForPaperRef(paperRef: string) {
    const parsed = parsePaperRef(paperRef);
    if (!parsed?.itemKey) {
      return null;
    }
    const injected = (options.registryInputs || []).find(
      (input) =>
        `${normalizeLibraryId(input.libraryId)}:${cleanString(input.itemKey)}` ===
          paperRef || cleanString(input.itemKey) === parsed.itemKey,
    );
    if (injected) {
      return injected;
    }
    if (typeof options.libraryAdapter?.getRegistryInputForItem === "function") {
      return options.libraryAdapter.getRegistryInputForItem(parsed);
    }
    return null;
  }

  function matchedSidecarItemIndex(matchedItems: unknown) {
    const byCitekey = new Map<
      string,
      ReturnType<typeof resolveWorkflowSidecarItem>
    >();
    const byTitleYear = new Map<
      string,
      ReturnType<typeof resolveWorkflowSidecarItem>
    >();
    const ambiguousTitleYear = new Set<string>();
    for (const entry of normalizeArray(matchedItems)) {
      if (!isRecord(entry)) {
        continue;
      }
      const item = resolveWorkflowSidecarItem({
        input: entry,
        defaultLibraryId: libraryId,
      });
      const key = cleanString(item.citekey).toLowerCase();
      if (key && item.itemKey) {
        byCitekey.set(key, item);
      }
      const titleYearKey = sidecarTitleYearKey({
        title: item.title,
        year: item.year,
      });
      if (titleYearKey && item.itemKey) {
        if (byTitleYear.has(titleYearKey)) {
          ambiguousTitleYear.add(titleYearKey);
        } else {
          byTitleYear.set(titleYearKey, item);
        }
      }
    }
    for (const key of ambiguousTitleYear) {
      byTitleYear.delete(key);
    }
    return { byCitekey, byTitleYear };
  }

  function referenceMatcherPaperFromInput(
    input: ReferenceSidecarInput,
  ): ReferenceMatcherPaperInput {
    return {
      paperRef: paperRefForRegistryInput(input),
      itemKey: cleanString(input.itemKey),
      title: cleanString(input.title),
      year: cleanString(input.year),
      authors: normalizeStringListInput(input.creators),
      doi: cleanString(input.doi),
      isbn: cleanString(input.isbn),
      url: cleanString(input.url),
      citekey: cleanString(input.citekey),
    };
  }

  function rawReferenceToMatcherInput(
    row: SynthesisRawReferenceRecord,
  ): ReferenceMatcherReferenceInput {
    return {
      referenceInstanceId: row.rawReferenceId,
      title: cleanString(row.parsedTitle || row.normalizedTitle),
      normalizedTitle: cleanString(row.normalizedTitle),
      year: cleanString(row.year),
      authors: parseJsonArray(row.authorsJson).map(cleanString).filter(Boolean),
      rawReference: cleanString(row.rawReference),
    };
  }

  function canonicalDedupeInputFromRows(args: {
    canonicalReferenceId: string;
    rows: SynthesisRawReferenceRecord[];
    canonical?: SynthesisCanonicalReferenceRecord;
    canonicalById?: Map<string, SynthesisCanonicalReferenceRecord>;
    inboundRedirectTargets?: Set<string>;
  }): ReferenceCanonicalDedupeInput {
    const sortedRows = args.rows
      .slice()
      .sort(
        (left, right) =>
          left.sourceRef.localeCompare(right.sourceRef) ||
          left.referenceIndex - right.referenceIndex ||
          left.rawReferenceId.localeCompare(right.rawReferenceId),
      );
    const canonicalAuthors = parseJsonArray(args.canonical?.authorsJson)
      .map(cleanString)
      .filter(Boolean);
    const rawAuthors = sortedRows.flatMap((row) =>
      parseJsonArray(row.authorsJson).map(cleanString).filter(Boolean),
    );
    const identifiersFromCanonical = (
      canonical?: SynthesisCanonicalReferenceRecord,
    ) =>
      Object.entries(parseJsonObject(canonical?.identifiersJson))
        .flatMap(([kind, value]) =>
          Array.isArray(value)
            ? value.map((entry) => ({ kind, value: cleanString(entry) }))
            : [{ kind, value: cleanString(value) }],
        )
        .filter((identifier) => identifier.kind && identifier.value);
    const identifiers = identifiersFromCanonical(args.canonical);
    const physicalCanonicalIds = Array.from(
      new Set(
        sortedRows
          .map((row) => cleanString(row.canonicalReferenceId))
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));
    const physicalCanonicals = physicalCanonicalIds
      .map((id) => args.canonicalById?.get(id))
      .filter((row): row is SynthesisCanonicalReferenceRecord => Boolean(row));
    const allIdentifiers = Array.from(
      new Map(
        [
          ...identifiers,
          ...physicalCanonicals.flatMap((canonical) =>
            identifiersFromCanonical(canonical),
          ),
        ].map((identifier) => [
          `${identifier.kind}:${identifier.value}`,
          identifier,
        ]),
      ).values(),
    ).sort((left, right) =>
      `${left.kind}:${left.value}`.localeCompare(
        `${right.kind}:${right.value}`,
      ),
    );
    const rawTitleGroups = new Map<string, SynthesisRawReferenceRecord[]>();
    for (const row of sortedRows) {
      const title = cleanString(row.parsedTitle);
      if (!title) {
        continue;
      }
      const key = `${cleanString(row.normalizedTitle) || title}::${cleanString(
        row.year,
      )}`;
      rawTitleGroups.set(key, [...(rawTitleGroups.get(key) || []), row]);
    }
    const titleCandidates = [
      cleanString(args.canonical?.title)
        ? {
            source: "effective_canonical" as const,
            sourceCanonicalReferenceId: args.canonicalReferenceId,
            title: cleanString(args.canonical?.title),
            normalizedTitle: cleanString(args.canonical?.normalizedTitle),
            year: cleanString(args.canonical?.year),
            authors: canonicalAuthors,
            identifiers,
            frequency: sortedRows.length,
          }
        : null,
      ...physicalCanonicals.map((canonical) => ({
        source: "physical_canonical" as const,
        sourceCanonicalReferenceId: canonical.canonicalReferenceId,
        title: cleanString(canonical.title),
        normalizedTitle: cleanString(canonical.normalizedTitle),
        year: cleanString(canonical.year),
        authors: parseJsonArray(canonical.authorsJson)
          .map(cleanString)
          .filter(Boolean),
        identifiers: identifiersFromCanonical(canonical),
        frequency:
          sortedRows.filter(
            (row) =>
              cleanString(row.canonicalReferenceId) ===
              canonical.canonicalReferenceId,
          ).length || 1,
      })),
      ...Array.from(rawTitleGroups.values()).map((group) => ({
        source: "raw_reference" as const,
        title: cleanString(group[0]?.parsedTitle),
        normalizedTitle: cleanString(group[0]?.normalizedTitle),
        year: cleanString(group[0]?.year),
        authors: parseJsonArray(group[0]?.authorsJson)
          .map(cleanString)
          .filter(Boolean),
        rawReferenceIds: group
          .map((row) => cleanString(row.rawReferenceId))
          .filter(Boolean),
        frequency: group.length,
      })),
    ].filter((candidate): candidate is NonNullable<typeof candidate> =>
      Boolean(candidate),
    );
    const first = sortedRows[0];
    return {
      canonicalReferenceId: args.canonicalReferenceId,
      title:
        cleanString(args.canonical?.title) ||
        cleanString(first?.parsedTitle || first?.normalizedTitle),
      normalizedTitle:
        cleanString(args.canonical?.normalizedTitle) ||
        cleanString(first?.normalizedTitle),
      year: cleanString(args.canonical?.year) || cleanString(first?.year),
      authors: normalizeStringListInput([...canonicalAuthors, ...rawAuthors]),
      rawReferenceIds: sortedRows
        .map((row) => row.rawReferenceId)
        .filter(Boolean),
      rawHashes: sortedRows
        .map((row) => cleanString(row.rawHash))
        .filter(Boolean),
      rawReferences: sortedRows
        .map((row) => cleanString(row.rawReference))
        .filter(Boolean),
      sourceRefs: sortedRows
        .map((row) => cleanString(row.sourceRef))
        .filter(Boolean),
      stickyRepresentative: args.inboundRedirectTargets?.has(
        args.canonicalReferenceId,
      ),
      identifiers: allIdentifiers,
      titleCandidates,
    };
  }

  function referenceBindingFromAdvancedMatch(args: {
    canonicalReferenceId: string;
    libraryId: number;
    itemKey: string;
    confidence: string;
    basisHash: string;
    diagnostics: unknown[];
    timestamp: string;
  }): SynthesisReferenceBindingRecord {
    return {
      bindingId: `binding:${sidecarShortKey({
        canonical: args.canonicalReferenceId,
        library: args.libraryId,
        item: args.itemKey,
      })}`,
      canonicalReferenceId: args.canonicalReferenceId,
      libraryId: args.libraryId,
      itemKey: args.itemKey,
      status: "accepted",
      confidence: args.confidence,
      reviewer: "advanced-reference-matching",
      basisHash: args.basisHash,
      diagnosticsJson: JSON.stringify(args.diagnostics),
      createdAt: args.timestamp,
      updatedAt: args.timestamp,
    };
  }

  function referenceMatchProposalRecord(args: {
    kind: "zotero_binding" | "canonical_merge";
    sourceCanonicalReferenceId: string;
    sourceRawReferenceIds: string[];
    targetCanonicalReferenceId?: string;
    targetLibraryId?: number;
    targetItemKey?: string;
    confidence: string;
    score: number;
    reasons: string[];
    evidence: Record<string, unknown>;
    diagnostics: unknown[];
    basisHash: string;
    sourceHash: string;
    timestamp: string;
  }): SynthesisReferenceMatchProposalRecord {
    const target =
      args.kind === "canonical_merge"
        ? args.targetCanonicalReferenceId
        : sourceRefFromParts({
            libraryId: args.targetLibraryId || libraryId,
            itemKey: cleanString(args.targetItemKey),
          });
    return {
      proposalId: `refmatch:${sidecarShortKey({
        kind: args.kind,
        source: args.sourceCanonicalReferenceId,
        target,
        basis: args.basisHash,
      })}`,
      kind: args.kind,
      status: "open",
      sourceCanonicalReferenceId: args.sourceCanonicalReferenceId,
      sourceRawReferenceIdsJson: JSON.stringify(args.sourceRawReferenceIds),
      targetCanonicalReferenceId: args.targetCanonicalReferenceId,
      targetLibraryId: args.targetLibraryId,
      targetItemKey: args.targetItemKey,
      confidence: args.confidence,
      score: args.score,
      reasonsJson: JSON.stringify(args.reasons),
      evidenceJson: JSON.stringify(args.evidence),
      diagnosticsJson: JSON.stringify(args.diagnostics),
      basisHash: args.basisHash,
      sourceHash: args.sourceHash,
      createdAt: args.timestamp,
      updatedAt: args.timestamp,
    };
  }

  async function applyLiteratureDigestSidecar(
    args: SynthesisLiteratureDigestSidecarApplyInput = {},
  ) {
    const item = resolveWorkflowSidecarItem({
      input: {
        ...args,
        item: args.parentItem || args.item,
      },
      defaultLibraryId: libraryId,
    });
    if (!item.itemKey || !item.paperRef) {
      throw new Error("workflow sidecar apply requires a Zotero item key");
    }
    const timestamp = now();
    const sourceRef = item.paperRef;
    const artifactStates: SynthesisArtifactSidecarRecord[] = [
      {
        sourceRef,
        libraryId: item.libraryId,
        itemKey: item.itemKey,
        artifactType: "digest",
        status: args.digest ? "available" : "missing",
        artifactHash:
          cleanString(args.digest?.payloadHash) ||
          (cleanString(args.digest?.content)
            ? hashMarkdown(args.digest?.content)
            : ""),
        locatorJson: JSON.stringify({
          note_key: cleanString(args.digest?.noteKey),
        }),
        diagnosticsJson: "[]",
        scannedAt: timestamp,
        updatedAt: timestamp,
      },
      {
        sourceRef,
        libraryId: item.libraryId,
        itemKey: item.itemKey,
        artifactType: "references",
        status: args.references ? "available" : "missing",
        artifactHash:
          cleanString(args.references?.payloadHash) ||
          hashCanonicalJson(args.references?.references || []),
        locatorJson: JSON.stringify({
          note_key: cleanString(args.references?.noteKey),
        }),
        diagnosticsJson: "[]",
        scannedAt: timestamp,
        updatedAt: timestamp,
      },
      {
        sourceRef,
        libraryId: item.libraryId,
        itemKey: item.itemKey,
        artifactType: "citation_analysis",
        status: args.citationAnalysis ? "available" : "missing",
        artifactHash: cleanString(args.citationAnalysis?.payloadHash),
        locatorJson: JSON.stringify({
          note_key: cleanString(args.citationAnalysis?.noteKey),
        }),
        diagnosticsJson: "[]",
        scannedAt: timestamp,
        updatedAt: timestamp,
      },
    ];
    for (const artifact of artifactStates) {
      synthesisRepository.upsertArtifactSidecar(artifact);
    }
    if (isRecord(args.literatureMatchingMetadata)) {
      const metadata = args.literatureMatchingMetadata;
      const payload = {
        schema: LITERATURE_MATCHING_METADATA_SCHEMA,
        key_terms: normalizeLiteratureMetadataTerms(metadata.key_terms, 12),
        methods: normalizeLiteratureMetadataTerms(metadata.methods, 8),
        problems: normalizeLiteratureMetadataTerms(metadata.problems, 8),
        datasets: normalizeLiteratureMetadataTerms(metadata.datasets, 8),
        exclude_terms: normalizeLiteratureMetadataTerms(
          metadata.exclude_terms,
          6,
        ),
      };
      const metadataHash = hashCanonicalJson(payload);
      synthesisRepository.upsertLiteratureMatchingMetadata({
        literatureItemId: sourceRef,
        schemaId: LITERATURE_MATCHING_METADATA_SCHEMA,
        keyTermsJson: JSON.stringify(payload.key_terms),
        methodsJson: JSON.stringify(payload.methods),
        problemsJson: JSON.stringify(payload.problems),
        datasetsJson: JSON.stringify(payload.datasets),
        excludeTermsJson: JSON.stringify(payload.exclude_terms),
        sourceArtifactHash: cleanString(args.digest?.payloadHash),
        metadataHash,
        diagnosticsJson: "[]",
        updatedAt: timestamp,
      });
    }
    const referencesHash =
      artifactStates.find((artifact) => artifact.artifactType === "references")
        ?.artifactHash || "";
    const referenceResult = replaceReferenceSidecarForSourceRef({
      sourceRef,
      referencesArtifactHash: referencesHash,
      references: args.references?.references || [],
      matchedItems: args.matchedReferences,
      reviewer: "literature-digest-apply",
      timestamp,
    });
    synthesisRepository.upsertCacheBasis({
      cacheKey: `reference-sidecar:source_ref:${sourceRef}`,
      cacheKind: "reference_sidecar",
      scopeKind: "source_ref",
      scopeRef: sourceRef,
      status: "ready",
      basisKind: "workflow_apply",
      basisValue: item.paperRef,
      sourceHash: hashCanonicalJson({
        sourceRef,
        artifacts: artifactStates.map((artifact) => [
          artifact.artifactType,
          artifact.artifactHash,
        ]),
      }),
      policyVersion: "reference-sidecar-v1",
      refreshedAt: timestamp,
      diagnosticsJson: "[]",
      updatedAt: timestamp,
    });
    markCitationGraphLibraryCacheStale({
      sourceRefs: [sourceRef],
      changedBindingCanonicalIds: referenceResult.changedBindingCanonicalIds,
      source: "workflow_reference_sidecar_changed",
      timestamp,
    });
    markRelatedItemsSyncCacheStaleForSidecarChange({
      sourceRefs: [sourceRef],
      changedBindingCanonicalIds: referenceResult.changedBindingCanonicalIds,
      source: "literature_digest_apply",
      timestamp,
    });
    const publicReferenceResult = { ...referenceResult };
    delete (publicReferenceResult as { changedBindingCanonicalIds?: unknown })
      .changedBindingCanonicalIds;
    return {
      ok: true,
      status: "sidecar_applied",
      sourceRef,
      source_ref: sourceRef,
      paperRef: item.paperRef,
      ...publicReferenceResult,
    };
  }

  async function applyReferenceMatchingSidecar(
    args: SynthesisReferenceMatchingSidecarApplyInput = {},
  ) {
    const item = resolveWorkflowSidecarItem({
      input: {
        ...args,
        item: args.parentItem || args.item,
      },
      defaultLibraryId: libraryId,
    });
    if (!item.itemKey || !item.paperRef) {
      throw new Error("reference matching apply requires a Zotero item key");
    }
    const timestamp = now();
    const sourceRef = item.paperRef;
    const referencesHash = hashCanonicalJson(args.references || []);
    synthesisRepository.upsertArtifactSidecar({
      sourceRef,
      libraryId: item.libraryId,
      itemKey: item.itemKey,
      artifactType: "references",
      status: "available",
      artifactHash: referencesHash,
      locatorJson: JSON.stringify({ source: "reference-matching-apply" }),
      diagnosticsJson: "[]",
      scannedAt: timestamp,
      updatedAt: timestamp,
    });
    const referenceResult = replaceReferenceSidecarForSourceRef({
      sourceRef,
      referencesArtifactHash: referencesHash,
      references: args.references || [],
      matchedItems: args.matchedItems,
      reviewer: "reference-matching-apply",
      timestamp,
    });
    synthesisRepository.upsertCacheBasis({
      cacheKey: `reference-sidecar:source_ref:${sourceRef}`,
      cacheKind: "reference_sidecar",
      scopeKind: "source_ref",
      scopeRef: sourceRef,
      status: "ready",
      basisKind: "reference_matching_apply",
      basisValue: item.paperRef,
      sourceHash: hashCanonicalJson({
        sourceRef,
        references: args.references || [],
      }),
      policyVersion: "reference-sidecar-v1",
      refreshedAt: timestamp,
      diagnosticsJson: "[]",
      updatedAt: timestamp,
    });
    await refreshCitationGraphCacheIncremental({
      sourceRefs: [sourceRef],
      changedBindingCanonicalIds: referenceResult.changedBindingCanonicalIds,
      reason: "reference_matching_sidecar_changed",
      allowFullBootstrap: false,
    });
    const publicReferenceResult = { ...referenceResult };
    delete (publicReferenceResult as { changedBindingCanonicalIds?: unknown })
      .changedBindingCanonicalIds;
    return {
      ok: true,
      status: "sidecar_applied",
      sourceRef,
      source_ref: sourceRef,
      paperRef: item.paperRef,
      ...publicReferenceResult,
    };
  }

  async function recomputeCitationGraphLayout(
    args: {
      algorithm?: CitationLayoutAlgorithm;
      preset?: unknown;
      force?: boolean;
      timeBudgetMs?: number;
    } = {},
  ) {
    const startedAt = Date.now();
    const jobName = "synthesis:citation-graph-layout-operation";
    const runId = `${jobName}:${now()}`;
    const algorithm = normalizeCitationLayoutAlgorithmInput(
      args.algorithm || args.preset,
    );
    const viewKey = "workbench_overview";
    const timeBudgetMs = Math.max(
      1,
      Math.floor(Number(args.timeBudgetMs) || 2000),
    );
    const diagnostics: SynthesisUpdateDiagnostic[] = [];
    const graph = readDbCitationGraphOverview();
    if (!graph.nodes.length) {
      const diagnostic = {
        code: "citation_graph_layout_missing_structure",
        severity: "warning" as const,
        message: "Citation graph layout cannot run without DB graph structure.",
      };
      diagnostics.push(diagnostic);
      synthesisRepository.markCitationGraphLayoutFailed({
        viewKey,
        preset: algorithm,
        graphHash: graph.graph_hash,
        diagnosticsJson: JSON.stringify(diagnostics),
      });
      return {
        processed: 1,
        completed: 0,
        failed: 1,
        diagnostics,
      };
    }
    const existing = synthesisRepository.getCitationGraphLayoutState({
      viewKey,
      preset: algorithm,
    });
    const existingLayout = parseCitationGraphLayout(existing);
    if (
      !args.force &&
      existing?.status === "ready" &&
      existing.graphHash === graph.graph_hash &&
      existingLayout?.graph_hash === graph.graph_hash &&
      existingLayout.layout_version === CITATION_GRAPH_LAYOUT_VERSION
    ) {
      return {
        processed: 0,
        completed: 0,
        failed: 0,
        skipped: "ready",
        diagnostics,
      };
    }
    if (Date.now() - startedAt >= timeBudgetMs) {
      const diagnostic = {
        code: "citation_graph_layout_worker_budget_exhausted",
        severity: "warning" as const,
        message: "Citation graph layout worker time budget was exhausted.",
      };
      diagnostics.push(diagnostic);
      return {
        processed: 0,
        completed: 0,
        failed: 0,
        diagnostics,
      };
    }
    try {
      reportSynthesisJobProgress({
        jobName,
        runId,
        source: "citation_graph_layout",
        label: "Citation graph layout",
        status: "running",
        phase: "layout",
        phaseLabel: "Computing layout",
        timeBudgetMs,
        processedCount: 0,
        totalCount: graph.nodes.length,
        progressMode: "indeterminate",
      });
      const layout = await lock.runExclusive(libraryId, () =>
        computeCitationGraphLayout(graph, algorithm),
      );
      const promotedLayout = synthesisRepository.upsertCitationGraphLayoutState(
        {
          layoutKey: synthesisRepository.citationLayoutKey({
            viewKey,
            preset: algorithm,
          }),
          viewKey,
          preset: algorithm,
          graphHash: graph.graph_hash,
          status: "ready",
          layoutJson: JSON.stringify(layout),
          diagnosticsJson: JSON.stringify(diagnostics),
          updatedAt: now(),
        },
      );
      const promotion = { promoted: Boolean(promotedLayout) };
      if (!promotion.promoted) {
        const diagnostic = {
          code: "citation_graph_layout_basis_superseded",
          severity: "warning" as const,
          message:
            "Citation graph layout output was discarded because the Registry basis changed.",
        };
        diagnostics.push(diagnostic);
        supersedeSynthesisJobProgress({
          jobName,
          runId,
          source: "citation_graph_layout",
          label: "Citation graph layout",
          phase: "basis-check",
          phaseLabel: "Superseded",
          timeBudgetMs,
          processedCount: graph.nodes.length,
          totalCount: graph.nodes.length,
          progressMode: "determinate",
          message: "Registry basis changed before layout promotion.",
          diagnosticsJson: JSON.stringify([diagnostic]),
          completedAt: now(),
        });
        return {
          processed: 1,
          completed: 0,
          failed: 0,
          diagnostics,
        };
      }
      completeSynthesisJobProgress({
        jobName,
        runId,
        source: "citation_graph_layout",
        label: "Citation graph layout",
        phase: "layout",
        phaseLabel: "Layout ready",
        timeBudgetMs,
        processedCount: graph.nodes.length,
        totalCount: graph.nodes.length,
        progressMode: "determinate",
        message: "Citation graph layout completed.",
        diagnosticsJson: JSON.stringify(diagnostics),
      });
      return {
        processed: 1,
        completed: 1,
        failed: 0,
        diagnostics,
      };
    } catch (error) {
      const diagnostic = {
        code: "citation_graph_layout_failed",
        severity: "error" as const,
        message: errorMessage(error),
      };
      diagnostics.push(diagnostic);
      synthesisRepository.markCitationGraphLayoutFailed({
        viewKey,
        preset: algorithm,
        graphHash: graph.graph_hash,
        diagnosticsJson: JSON.stringify(diagnostics),
      });
      failSynthesisJobProgress({
        jobName,
        runId,
        source: "citation_graph_layout",
        label: "Citation graph layout",
        timeBudgetMs,
        processedCount: 0,
        failedCount: 1,
        totalCount: graph.nodes.length,
        progressMode: "indeterminate",
        diagnosticsJson: JSON.stringify(diagnostics),
      });
      return {
        processed: 1,
        completed: 0,
        failed: 1,
        diagnostics,
      };
    }
  }

  async function rejectTopicDiscoveryHint(args: { hintId: string }) {
    const hint = synthesisRepository.rejectTopicDiscoveryHint(args.hintId);
    if (!hint) {
      return {
        ok: false,
        status: "not_found",
        hint: null,
        diagnostics: [
          {
            code: "topic_discovery_hint_not_found",
            severity: "warning" as const,
            message: "Topic discovery hint was not found.",
          },
        ],
      };
    }
    return { ok: true, status: "rejected", hint, diagnostics: [] };
  }

  async function restoreTopicDiscoveryHint(args: { hintId: string }) {
    const hint = synthesisRepository.restoreTopicDiscoveryHint(args.hintId);
    if (!hint) {
      return {
        ok: false,
        status: "not_found",
        hint: null,
        diagnostics: [
          {
            code: "topic_discovery_hint_not_found",
            severity: "warning" as const,
            message: "Topic discovery hint was not found.",
          },
        ],
      };
    }
    return { ok: true, status: "open", hint, diagnostics: [] };
  }

  function debugLimit(input: Record<string, unknown> = {}, fallback = 100) {
    return Math.max(
      1,
      Math.min(
        1000,
        Math.floor(
          Number(input.limit ?? input.maxRows ?? fallback) || fallback,
        ),
      ),
    );
  }

  function debugBool(input: Record<string, unknown>, key: string) {
    return input[key] === true;
  }

  function debugEnvelope<T extends Record<string, unknown>>(
    schema: string,
    input: Record<string, unknown>,
    payload: T,
  ) {
    const limit = debugLimit(input);
    return {
      schema,
      debugMode: true,
      generatedAt: now(),
      truncated: Boolean(payload.truncated),
      limits: {
        limit,
        includeLocalPaths: debugBool(input, "includeLocalPaths"),
        includeRawRows: debugBool(input, "includeRawRows"),
      },
      diagnostics: Array.isArray(payload.diagnostics)
        ? payload.diagnostics
        : [],
      ...payload,
    } as T & {
      schema: string;
      debugMode: true;
      generatedAt: string;
      truncated: boolean;
      limits: Record<string, unknown>;
      diagnostics: unknown[];
    };
  }

  function synthesisDebugTableCounts() {
    return Object.fromEntries(
      SYNTHESIS_REPOSITORY_TABLES.map((tableName) => [
        tableName,
        synthesisRepository.countRows(
          tableName as SynthesisRepositoryTableName,
        ),
      ]),
    );
  }

  function synthesisDebugProgressRows(input: Record<string, unknown> = {}) {
    reconcileRuntimeWorkState();
    const limit = debugLimit(input);
    const includeCompleted =
      input.includeCompleted === true || input.include_completed === true;
    const statuses = new Set(
      (Array.isArray(input.statuses)
        ? input.statuses
        : cleanString(input.status)
          ? [input.status]
          : []
      )
        .map(cleanString)
        .filter(Boolean),
    );
    const sources = new Set(
      (Array.isArray(input.sources)
        ? input.sources
        : cleanString(input.source)
          ? [input.source]
          : []
      )
        .map(cleanString)
        .filter(Boolean),
    );
    const allRows = synthesisRepository.listOperations({
      includeCompleted,
      statuses: Array.from(statuses),
      operationTypes: Array.from(sources),
      limit: limit + 1,
    });
    const rows = allRows
      .filter((row) => !statuses.size || statuses.has(cleanString(row.status)))
      .filter(
        (row) => !sources.size || sources.has(cleanString(row.operationType)),
      )
      .slice(0, limit);
    return {
      rows,
      truncated: allRows.length > limit,
    };
  }

  async function synthesisDebugBackgroundJobs(
    input: Record<string, unknown> = {},
  ) {
    const limit = debugLimit(input);
    const statuses = new Set(
      (Array.isArray(input.statuses)
        ? input.statuses
        : cleanString(input.status)
          ? [input.status]
          : []
      )
        .map(cleanString)
        .filter(Boolean),
    );
    const sources = new Set(
      (Array.isArray(input.sources)
        ? input.sources
        : cleanString(input.source)
          ? [input.source]
          : []
      )
        .map(cleanString)
        .filter(Boolean),
    );
    const allJobs = buildMaintenanceBackgroundJobs({
      jobProgressRows: activeJobProgressRows(),
    })
      .filter((row) => !statuses.size || statuses.has(cleanString(row.status)))
      .filter((row) => !sources.size || sources.has(cleanString(row.source)));
    const rows = allJobs.slice(0, limit);
    return {
      rows,
      truncated: allJobs.length > rows.length,
    };
  }

  function resolveDebugPaperRef(input: Record<string, unknown>) {
    const explicit = cleanString(input.paperRef || input.paper_ref);
    if (explicit) {
      return explicit;
    }
    const itemKey = cleanString(input.itemKey || input.item_key || input.key);
    if (!itemKey) {
      return "";
    }
    const inputLibraryId =
      normalizeLibraryId(input.libraryId || input.library_id) || libraryId;
    return `${inputLibraryId}:${itemKey}`;
  }

  function matchingMetadataAvailability(input: ReferenceSidecarInput | null) {
    const payload = input
      ? literatureMatchingMetadataPayloadFromInput(input)
      : null;
    return {
      available: Boolean(payload),
      payload,
    };
  }

  async function debugSynthesisSnapshot(
    rawInput: Record<string, unknown> = {},
  ) {
    const includeUiSnapshot =
      rawInput.includeUiSnapshot === true ||
      rawInput.include_ui_snapshot === true;
    const operations =
      rawInput.includeRuns === true || rawInput.include_runs === true
        ? synthesisRepository.listOperations({
            includeCompleted: true,
            limit: debugLimit(rawInput),
          })
        : undefined;
    const cacheBasis = synthesisRepository
      .listCacheBasis()
      .slice(0, debugLimit(rawInput));
    return debugEnvelope("host_bridge.debug.synthesis.snapshot.v1", rawInput, {
      operations,
      cacheBasis,
      citationLayouts: synthesisRepository.listCitationGraphLayoutStates({
        viewKey: "workbench_overview",
      }),
      tableCounts: synthesisDebugTableCounts(),
      maintenance: {
        canonical: canonicalMaintenanceStatus(),
        heavySnapshot: includeUiSnapshot,
      },
      uiSnapshot: includeUiSnapshot
        ? await getSynthesisSnapshot(createDefaultSynthesisUiState())
        : undefined,
      truncated: false,
    });
  }

  async function debugSynthesisCacheList(
    rawInput: Record<string, unknown> = {},
  ) {
    const limit = debugLimit(rawInput);
    const cacheKinds = Array.isArray(rawInput.cacheKinds)
      ? rawInput.cacheKinds.map(cleanString).filter(Boolean)
      : cleanString(rawInput.cacheKind || rawInput.cache_kind)
        ? [cleanString(rawInput.cacheKind || rawInput.cache_kind)]
        : [];
    const statuses = Array.isArray(rawInput.statuses)
      ? rawInput.statuses.map(cleanString).filter(Boolean)
      : cleanString(rawInput.status)
        ? [cleanString(rawInput.status)]
        : [];
    const rows = synthesisRepository.listCacheBasis({
      cacheKinds,
      statuses,
    });
    return debugEnvelope(
      "host_bridge.debug.synthesis.cache.list.v1",
      rawInput,
      {
        rows: rows.slice(0, limit),
        total: rows.length,
        truncated: rows.length > limit,
      },
    );
  }

  async function debugSynthesisOperationsList(
    rawInput: Record<string, unknown> = {},
  ) {
    const jobs = await synthesisDebugBackgroundJobs(rawInput);
    const includeRawRows =
      rawInput.includeRawRows === true || rawInput.include_raw_rows === true;
    const progress = includeRawRows
      ? synthesisDebugProgressRows(rawInput)
      : undefined;
    return debugEnvelope(
      "host_bridge.debug.synthesis.operations.v1",
      rawInput,
      {
        rows: jobs.rows,
        operations: progress?.rows,
        truncated: jobs.truncated || Boolean(progress?.truncated),
      },
    );
  }

  async function debugSynthesisProfilerList(
    rawInput: Record<string, unknown> = {},
  ) {
    const limit = debugLimit(rawInput);
    const phaseLimit = Math.max(
      limit,
      Math.min(5000, Math.floor(Number(rawInput.phaseLimit) || limit * 20)),
    );
    const snapshot = await readSynthesisJobProfilerSnapshot(root);
    const runs = snapshot.runs
      .slice()
      .sort(
        (left, right) =>
          right.started_at.localeCompare(left.started_at) ||
          right.run_id.localeCompare(left.run_id),
      )
      .slice(0, limit);
    const runIds = new Set(runs.map((run) => run.run_id));
    const phases = snapshot.phases
      .filter((phase) => runIds.has(phase.run_id))
      .sort(
        (left, right) =>
          right.started_at.localeCompare(left.started_at) ||
          right.phase_name.localeCompare(left.phase_name),
      )
      .slice(0, phaseLimit);
    return debugEnvelope("host_bridge.debug.synthesis.profiler.v1", rawInput, {
      databasePath:
        rawInput.includeLocalPaths === true
          ? snapshot.databasePath
          : "[redacted-path]",
      runs,
      phases,
      totalRuns: snapshot.runs.length,
      totalPhases: snapshot.phases.length,
      truncated: snapshot.runs.length > runs.length,
    });
  }

  async function debugSynthesisPaperInspect(
    rawInput: Record<string, unknown> = {},
  ) {
    const paperRef = resolveDebugPaperRef(rawInput);
    if (!paperRef) {
      throw new Error(
        "debug.synthesis.paper.inspect requires paperRef or itemKey",
      );
    }
    const registryInput = await resolveRegistryInputForPaperRef(paperRef);
    const currentMatching = matchingMetadataAvailability(registryInput);
    const sidecars = synthesisRepository.listArtifactSidecars({
      sourceRefs: [paperRef],
    });
    const rawReferences = synthesisRepository.listRawReferences({
      sourceRefs: [paperRef],
    });
    const canonicalReferenceIds = Array.from(
      new Set(
        rawReferences
          .map((row) => cleanString(row.canonicalReferenceId))
          .filter(Boolean),
      ),
    );
    const canonicalReferences = synthesisRepository
      .listCanonicalReferences()
      .filter((row) =>
        canonicalReferenceIds.includes(row.canonicalReferenceId),
      );
    const referenceBindings = synthesisRepository.listReferenceBindings({
      canonicalReferenceIds,
    });
    return debugEnvelope(
      "host_bridge.debug.synthesis.paper.inspect.v1",
      rawInput,
      {
        paperRef,
        zotero: {
          registryInputAvailable: Boolean(registryInput),
          literatureMatchingMetadataAvailable: currentMatching.available,
          payloadTypes: registryInput
            ? (registryInput.notes || [])
                .flatMap((note) => note.payloadBlocks || [])
                .map((block) => cleanString(block.payloadType))
                .filter(Boolean)
            : [],
        },
        repository: {
          artifactSidecars: sidecars,
          rawReferences,
          canonicalReferences,
          referenceBindings,
          citationNode:
            synthesisRepository.listCitationNodes({
              literatureItemIds: [paperRef],
              limit: 1,
            })[0] || null,
        },
        diff: {
          matchingMetadataPayloadMissingInZotero: !currentMatching.available,
          referencesArtifactAvailableWithoutRawRows: sidecars.some(
            (row) =>
              row.artifactType === "references" &&
              row.status === "available" &&
              !rawReferences.some(
                (reference) =>
                  reference.referencesArtifactHash === row.artifactHash &&
                  reference.status === "active",
              ),
          ),
        },
        truncated: false,
      },
    );
  }

  async function debugSynthesisTopicInspect(
    rawInput: Record<string, unknown> = {},
  ) {
    const topicId = cleanString(rawInput.topicId || rawInput.topic_id);
    if (!topicId) {
      throw new Error("debug.synthesis.topic.inspect requires topicId");
    }
    const context = await getTopicContext({
      topicId,
      includeFull: rawInput.includeFull === true,
    });
    const detail = await readTopicDetail({ topicId }).catch((error) => ({
      ok: false,
      status: "unavailable",
      error: errorMessage(error),
    }));
    return debugEnvelope(
      "host_bridge.debug.synthesis.topic.inspect.v1",
      rawInput,
      {
        topicId,
        context,
        detail,
        topicInterestMetadata:
          synthesisRepository.getTopicInterestMetadata(topicId) || null,
        discoveryHints: synthesisRepository.listTopicDiscoveryHints({
          topicIds: [topicId],
          limit: debugLimit(rawInput, 50),
        }),
        truncated: false,
      },
    );
  }

  async function debugSynthesisDiff(rawInput: Record<string, unknown> = {}) {
    const limit = debugLimit(rawInput, 50);
    const rows = (await registryRowsFromCurrentLibraryAndSidecar()).slice(
      0,
      limit,
    );
    const issues: Array<Record<string, unknown>> = [];
    for (const row of rows) {
      const paperRef = cleanString(row.paper_ref);
      const registryInput = await resolveRegistryInputForPaperRef(paperRef);
      const referencesArtifact = synthesisRepository.listArtifactSidecars({
        sourceRefs: [paperRef],
        artifactTypes: ["references"],
      })[0];
      const activeRawReferences = synthesisRepository.listRawReferences({
        sourceRefs: [paperRef],
        statuses: ["active"],
      });
      if (!registryInput) {
        issues.push({
          code: "zotero_registry_input_unavailable",
          paperRef,
          severity: "warning",
        });
      }
      if (
        referencesArtifact?.status === "available" &&
        referencesArtifact.artifactHash &&
        !activeRawReferences.some(
          (reference) =>
            reference.referencesArtifactHash ===
            referencesArtifact.artifactHash,
        )
      ) {
        issues.push({
          code: "references_artifact_not_extracted",
          paperRef,
          severity: "warning",
        });
      }
    }
    return debugEnvelope("host_bridge.debug.synthesis.diff.v1", rawInput, {
      scanned: rows.length,
      issues: issues.slice(0, limit),
      truncated: issues.length > limit,
    });
  }

  async function debugSynthesisCleanInstallReset(
    rawInput: Record<string, unknown> = {},
  ) {
    const confirmationText = cleanString(rawInput.confirmationText);
    const dryRun = rawInput.dryRun !== false;
    const runtimePaths = getRuntimePersistencePaths(runtimeRoot);
    const synthesisDataRoot = runtimePaths.synthesisDataRoot;
    const synthesisRuntimeRoot = joinPath(
      runtimePaths.runtimeRoot,
      "synthesis",
    );
    const dataExists = await runtimePathExists(synthesisDataRoot);
    const runtimeExists = await runtimePathExists(synthesisRuntimeRoot);
    const tableCounts = synthesisDebugTableCounts();
    if (
      !dryRun &&
      confirmationText !== SYNTHESIS_CLEAN_INSTALL_RESET_CONFIRMATION_TEXT
    ) {
      return debugEnvelope(
        "host_bridge.debug.synthesis.clean_install_reset.v1",
        rawInput,
        {
          ok: false,
          status: "confirmation_mismatch",
          requiredConfirmationText:
            SYNTHESIS_CLEAN_INSTALL_RESET_CONFIRMATION_TEXT,
          synthesisDataRootExists: dataExists,
          synthesisRuntimeRootExists: runtimeExists,
          tableCounts,
          truncated: false,
        },
      );
    }
    if (dryRun) {
      return debugEnvelope(
        "host_bridge.debug.synthesis.clean_install_reset.v1",
        rawInput,
        {
          ok: true,
          dryRun: true,
          wouldDeleteSynthesisDataRoot: dataExists,
          wouldDeleteSynthesisRuntimeRoot: runtimeExists,
          tableCounts,
          truncated: false,
        },
      );
    }
    const result = synthesisRepository.resetSynthesisState();
    clearPluginTaskRowEntries("synthesis-updates", "synthesis-update-events");
    clearPluginTaskRowEntries("synthesis-updates", "synthesis-update-state");
    const removedSynthesisDataRoot = await removeRuntimePath(synthesisDataRoot);
    const removedSynthesisRuntimeRoot =
      await removeRuntimePath(synthesisRuntimeRoot);
    return debugEnvelope(
      "host_bridge.debug.synthesis.clean_install_reset.v1",
      rawInput,
      {
        ok: true,
        dryRun: false,
        status: "reset",
        deletedRowsByTable: result.deletedRowsByTable,
        resetAt: result.resetAt,
        removedSynthesisDataRoot,
        removedSynthesisRuntimeRoot,
        tableCounts: synthesisDebugTableCounts(),
        truncated: false,
      },
    );
  }

  async function loadTagVocabulary() {
    return tagVocabulary.loadTagVocabulary();
  }

  async function saveTagVocabulary(
    args: Parameters<typeof tagVocabulary.saveTagVocabulary>[0],
  ) {
    return runCanonicalWriteWithAutosync(() =>
      tagVocabulary.saveTagVocabulary(args),
    );
  }

  async function exportTagVocabularyCheckpoint(
    args?: Parameters<typeof tagVocabulary.exportTagVocabularyCheckpoint>[0],
  ) {
    return runCanonicalWriteWithAutosync(() =>
      tagVocabulary.exportTagVocabularyCheckpoint(args),
    );
  }

  async function validateTagVocabulary(
    args?: Parameters<typeof tagVocabulary.validateTagVocabulary>[0],
  ) {
    return tagVocabulary.validateTagVocabulary(args);
  }

  async function listStagedTagSuggestions() {
    return tagVocabulary.listStagedTagSuggestions();
  }

  async function stageTagSuggestions(
    args: Parameters<typeof tagVocabulary.stageTagSuggestions>[0],
  ) {
    return tagVocabulary.stageTagSuggestions(args);
  }

  async function promoteStagedTagSuggestions(
    args: Parameters<typeof tagVocabulary.promoteStagedTagSuggestions>[0],
  ) {
    const requestedTags = Array.isArray(args?.tags)
      ? args.tags.map((tag) => cleanString(tag)).filter(Boolean)
      : [];
    const stagedBefore = await tagVocabulary.listStagedTagSuggestions();
    const stagedByTag = new Map(
      stagedBefore.map((entry) => [entry.tag.toLowerCase(), entry]),
    );
    const result = await runCanonicalWriteWithAutosync(() =>
      tagVocabulary.promoteStagedTagSuggestions(args),
    );
    const diagnostics: Array<Record<string, unknown>> = [];
    const appliedParentTags: Array<{ tag: string; parent_item_id: number }> =
      [];
    for (const tag of result.promoted || []) {
      const staged = stagedByTag.get(tag.toLowerCase());
      const parentBindings = Array.isArray(staged?.parent_bindings)
        ? staged!.parent_bindings
        : [];
      for (const parentItemId of parentBindings) {
        const item = Zotero.Items.get(parentItemId);
        if (!item) {
          diagnostics.push({
            code: "staged_tag_parent_missing",
            tag,
            parent_item_id: parentItemId,
          });
          continue;
        }
        try {
          await handlers.tag.add(item, [tag]);
          appliedParentTags.push({ tag, parent_item_id: parentItemId });
        } catch (error) {
          diagnostics.push({
            code: "staged_tag_parent_apply_failed",
            tag,
            parent_item_id: parentItemId,
            message: compactError(error),
          });
        }
      }
    }
    return {
      ...result,
      requested: requestedTags,
      applied_parent_tags: appliedParentTags,
      diagnostics,
    };
  }

  async function discardStagedTagSuggestions(
    args: Parameters<typeof tagVocabulary.discardStagedTagSuggestions>[0],
  ) {
    return tagVocabulary.discardStagedTagSuggestions(args);
  }

  async function clearStagedTagSuggestions() {
    return tagVocabulary.clearStagedTagSuggestions();
  }

  async function previewTagVocabularyImport(
    payload: Parameters<typeof tagVocabulary.previewImport>[0],
  ) {
    const preview = await tagVocabulary.previewImport(payload);
    tagImportPreviewState = {
      payload_hash: hashCanonicalJson(payload),
      preview,
    };
    return preview;
  }

  async function applyTagVocabularyImport(
    args: Parameters<typeof tagVocabulary.applyImport>[0],
  ) {
    const result = await runCanonicalWriteWithAutosync(() =>
      tagVocabulary.applyImport(args),
    );
    tagImportPreviewState = undefined;
    return result;
  }

  async function rebuildTagVocabularyIndex(
    options: WorkbenchProgressOptions = {},
  ) {
    return runProjectionIndexRebuildWithProgress({
      jobName: "synthesis:tag-vocabulary-index",
      label: "Tag vocabulary index rebuild",
      onProgress: options.onProgress,
      run: (reportProgress) =>
        tagVocabulary.rebuildTagIndexProjection({
          yieldControl: yieldToEventLoop,
          reportProgress,
        }),
    });
  }

  async function exportTagVocabularyForRegulator() {
    return tagVocabulary.exportTagVocabularyForRegulator();
  }

  async function loadConceptKb() {
    return conceptKb.loadConceptKb();
  }

  async function updateConceptDisplayText(
    args: Parameters<typeof conceptKb.updateConceptDisplayText>[0],
  ) {
    return runCanonicalWriteWithAutosync(() =>
      conceptKb.updateConceptDisplayText(args),
    );
  }

  async function applyConceptReviewAction(
    args: Parameters<typeof conceptKb.applyConceptReviewAction>[0],
  ) {
    return runCanonicalWriteWithAutosync(() =>
      conceptKb.applyConceptReviewAction(args),
    );
  }

  async function deleteConceptEntries(
    args: Parameters<typeof conceptKb.deleteConceptEntries>[0],
  ) {
    return runCanonicalWriteWithAutosync(() =>
      conceptKb.deleteConceptEntries(args),
    );
  }

  async function exportConceptKbCheckpoint(
    args?: Parameters<typeof conceptKb.exportConceptKbCheckpoint>[0],
  ) {
    return runCanonicalWriteWithAutosync(() =>
      conceptKb.exportConceptKbCheckpoint(args),
    );
  }

  async function rebuildConceptKbIndex(options: WorkbenchProgressOptions = {}) {
    return runProjectionIndexRebuildWithProgress({
      jobName: "synthesis:concept-kb-index",
      label: "Concept KB index rebuild",
      onProgress: options.onProgress,
      run: (reportProgress) =>
        conceptKb.rebuildConceptKbIndexProjection({
          yieldControl: yieldToEventLoop,
          reportProgress,
        }),
    });
  }

  async function loadTopicGraph() {
    return topicGraphSnapshotForUi({ persistMissingDefinition: true }).then(
      (context) => context.snapshot,
    );
  }

  async function exportTopicGraphCheckpoint(
    args?: Parameters<typeof topicGraph.exportTopicGraphCheckpoint>[0],
  ) {
    return runCanonicalWriteWithAutosync(() =>
      topicGraph.exportTopicGraphCheckpoint(args),
    );
  }

  async function rebuildTopicGraphIndex(
    options: WorkbenchProgressOptions = {},
  ) {
    return runProjectionIndexRebuildWithProgress({
      jobName: "synthesis:topic-graph-index",
      label: "Topic graph index rebuild",
      onProgress: options.onProgress,
      run: (reportProgress) =>
        topicGraph.rebuildTopicGraphIndexProjection({
          yieldControl: yieldToEventLoop,
          reportProgress,
        }),
    });
  }

  async function acceptTopicGraphRelation(args: { edgeId: string }) {
    const safeEdge = safeFileSegment(args.edgeId, "edge");
    return runCanonicalWriteWithAutosync(() =>
      topicGraph.decideTopicGraphRelation({
        edgeId: args.edgeId,
        status: "confirmed",
        transactionId: `topic-graph-accept-${safeEdge}`,
      }),
    );
  }

  async function rejectTopicGraphRelation(args: { edgeId: string }) {
    const safeEdge = safeFileSegment(args.edgeId, "edge");
    return runCanonicalWriteWithAutosync(() =>
      topicGraph.decideTopicGraphRelation({
        edgeId: args.edgeId,
        status: "rejected",
        transactionId: `topic-graph-reject-${safeEdge}`,
      }),
    );
  }

  async function applyTopicGraphReviewAction(args: {
    reviewId: string;
    action: "approve_suggested" | "reject";
  }) {
    const safeReview = safeFileSegment(args.reviewId, "review");
    return runCanonicalWriteWithAutosync(() =>
      topicGraph.applyTopicGraphReviewAction({
        reviewId: args.reviewId,
        action:
          args.action === "approve_suggested" ? "approve_suggested" : "reject",
        transactionId: `topic-graph-review-${safeReview}`,
      }),
    );
  }

  async function previewSynthesisJsonImport() {
    return jsonImport.previewSynthesisJsonImport();
  }

  async function applySynthesisJsonImport(
    args?: Parameters<typeof jsonImport.applySynthesisJsonImport>[0],
  ) {
    return runCanonicalWriteWithAutosync(() =>
      jsonImport.applySynthesisJsonImport(args),
    );
  }

  async function exportSynthesisCheckpoint(
    args?: Parameters<typeof checkpointExport.exportSynthesisCheckpoint>[0],
  ) {
    return runCanonicalWriteWithAutosync(() =>
      checkpointExport.exportSynthesisCheckpoint(args),
    );
  }

  async function verifySynthesisCheckpoint() {
    return checkpointExport.verifySynthesisCheckpoint();
  }

  async function readCitationGraphSnapshot() {
    return readDbCitationGraphOverview();
  }

  async function loadGitSyncState() {
    return gitSync.loadGitSyncState();
  }

  async function syncNow() {
    const maintenance = canonicalMaintenanceStatus();
    const hasActiveMaintenance =
      maintenance.active_worker_count > 0 || maintenance.pending_sync;
    if (!maintenance.active_worker_count) {
      pendingCanonicalMaintenanceSync = false;
      clearCanonicalMaintenanceSyncTimer();
    }
    const state = await lock.runExclusive(libraryId, () => gitSync.runSync());
    if (!hasActiveMaintenance) {
      return state;
    }
    return gitSync.recordGitSyncDiagnostic({
      code: maintenance.active_worker_count
        ? "canonical_maintenance_active"
        : "canonical_maintenance_sync_pending",
      severity: "info",
      message: maintenance.active_worker_count
        ? "Manual Git Sync ran while canonical maintenance workers were active."
        : "Manual Git Sync ran while a maintenance-triggered sync was pending.",
      details: maintenance,
    });
  }

  async function pauseGitSync() {
    return gitSync.pauseGitSync();
  }

  async function resumeGitSync() {
    return lock.runExclusive(libraryId, () => gitSync.resumeGitSync());
  }

  async function retryGitSync() {
    return lock.runExclusive(libraryId, () => gitSync.retryGitSync());
  }

  async function resolveGitSyncConflict(args: { action: "skip" | "resolved" }) {
    return lock.runExclusive(libraryId, () =>
      gitSync.resolveGitSyncConflict(args),
    );
  }

  async function readGitSyncDiagnostics() {
    return gitSync.readGitSyncDiagnostics();
  }

  async function getReviewInput(
    args: Record<string, unknown>,
  ): Promise<ReviewWorkflowInput> {
    const topicId = cleanString(args.topicId || args.topic_id);
    const artifact = await readTopicArtifact({ topicId });
    const paths = buildSynthesisStoragePaths(root, topicPathId(topicId));
    const definitions = await readStateMap<Record<string, unknown>>(
      paths.topicDefinitions,
      "topics",
    );
    const resolvers = await readStateMap<Record<string, unknown>>(
      paths.resolvers,
      "resolvers",
    );
    const paperSets = await readStateMap<Record<string, unknown>>(
      paths.resolvedPaperSets,
      "paper_sets",
    );
    const registryRows = registryRowsToUi(
      registryRowsForInputs(await registryInputsForService(options)),
    );
    const graph = graphForPapers(await graphInputsForService(options));
    const metadata = artifact.metadata as TopicArtifactMetadata;
    const structuredArtifact = isObject(artifact.artifact)
      ? artifact.artifact
      : {};
    const reviewInput = buildReviewWorkflowInput({
      topic: {
        topic_id: topicId,
        title: metadata.title,
        markdown: reportBodyFromTopicArtifact(structuredArtifact),
        timeline: metadata.timeline,
        metadata: metadata.artifact_metadata,
        topic_definition: definitions[topicId] || {},
        resolver: resolvers[topicId] || {},
        structured_topic: {
          artifact: isObject(artifact.artifact) ? artifact.artifact : {},
          manifest: isObject(artifact.manifest) ? artifact.manifest : {},
          metadata: artifact.metadata,
        },
      },
      resolved_paper_set: paperSets[topicId] || {},
      registry_rows: registryRows,
      citation_graph: graph,
    });
    const maxGraphNodes = parsePositiveInteger(args.maxGraphNodes, 500, 1000);
    const maxGraphEdges = parsePositiveInteger(args.maxGraphEdges, 1000, 2000);
    const maxChars = parsePositiveInteger(args.maxChars, 50000, 200000);
    const warnings = [...reviewInput.diagnostics.warnings];
    if (reviewInput.topic.markdown.length > maxChars) {
      reviewInput.topic.markdown = reviewInput.topic.markdown.slice(
        0,
        maxChars,
      );
      warnings.push(`topic markdown truncated to ${maxChars} chars`);
    }
    if (reviewInput.citation_graph_slice.nodes.length > maxGraphNodes) {
      reviewInput.citation_graph_slice.nodes =
        reviewInput.citation_graph_slice.nodes.slice(0, maxGraphNodes);
      warnings.push(`citation graph nodes truncated to ${maxGraphNodes}`);
    }
    if (reviewInput.citation_graph_slice.edges.length > maxGraphEdges) {
      reviewInput.citation_graph_slice.edges =
        reviewInput.citation_graph_slice.edges.slice(0, maxGraphEdges);
      warnings.push(`citation graph edges truncated to ${maxGraphEdges}`);
    }
    if (args.includePaperArtifacts === false && reviewInput.structured_topic) {
      delete reviewInput.structured_topic;
      warnings.push(
        "structured paper artifact context omitted by includePaperArtifacts=false",
      );
    }
    reviewInput.diagnostics = {
      ...reviewInput.diagnostics,
      warnings,
    };
    return reviewInput;
  }

  async function getReferenceSidecarIndex(args: Record<string, unknown> = {}) {
    const cacheStale = false;
    const refs = normalizeArray(
      args.sourceRefs || args.source_refs || args.sourceRef || args.source_ref,
    )
      .map(cleanString)
      .filter(Boolean);
    const allRows = await registryRowsFromCurrentLibraryAndSidecar({
      sourceRefs: refs,
    });
    const page = synthesisRepository.paginate({
      cursor: args.cursor,
      limit: args.limit,
      defaultLimit: 100,
      maxLimit: SYNTHESIS_REGISTRY_PAGE_LIMIT_MAX,
    });
    const rows = allRows.slice(page.cursor, page.cursor + page.limit);
    const nextCursor = page.cursor + rows.length;
    const cacheMissing = allRows.length === 0;
    const readHintsForCall: SynthesisReadHint[] = [];
    if (cacheMissing) {
      readHintsForCall.push(
        recordReadHint({
          code: "reference_index_missing",
          scope: "reference-sidecar",
        }),
      );
    }
    if (cacheStale) {
      readHintsForCall.push(
        recordReadHint({
          code: "reference_index_stale",
          scope: "reference-sidecar",
        }),
      );
    }
    return {
      rows,
      cursor: String(page.cursor),
      next_cursor: nextCursor < allRows.length ? String(nextCursor) : "",
      has_more: nextCursor < allRows.length,
      returned: rows.length,
      total: allRows.length,
      limit: page.limit,
      diagnostics: {
        cache_found: !cacheMissing,
        storage: "sqlite",
        stale: cacheStale,
        warnings: [
          ...(cacheMissing ? ["reference index rows are missing"] : []),
          ...(cacheStale ? ["reference index is stale"] : []),
        ],
        recommended_commands:
          cacheMissing || cacheStale ? ["refreshReferenceSidecarNow"] : [],
        maintenance: readMaintenanceForDto(
          cacheMissing || cacheStale ? ["refreshReferenceSidecarNow"] : [],
        ),
        read_hints: readHintsForCall,
      },
    };
  }

  async function getCitationGraphSlice(
    args: Record<string, unknown> = {},
  ): Promise<SynthesisCitationGraphSliceResult> {
    const normalized = normalizeGraphSliceArgs(args);
    if (!normalized.startNodeId) {
      return {
        ok: false,
        graph_hash: "",
        start_node_id: "",
        nodes: [],
        edges: [],
        diagnostics: {
          snapshot_found: false,
          depth: normalized.depth,
          node_count: 0,
          edge_count: 0,
          truncated: false,
          limits: {
            maxNodes: normalized.maxNodes,
            maxEdges: normalized.maxEdges,
            maxDepth: 2,
          },
          warnings: normalized.warnings,
          recommended_commands: [],
          maintenance: readMaintenanceForDto(),
        },
      };
    }
    return readDbCitationGraphSlice(normalized);
  }

  async function getCitationGraphLayout(
    args: Record<string, unknown> = {},
  ): Promise<SynthesisCitationGraphLayoutResult> {
    const normalized = normalizeCitationGraphLayoutArgs(args);
    if (normalized.scope === "none") {
      return emptyCitationGraphLayoutResult({
        status: "invalid_request",
        scope: "none",
        preset: normalized.preset,
        viewKey: normalized.viewKey,
        snapshotFound: false,
        layoutFound: false,
        warnings: [
          ...normalized.warnings,
          'scope:"full", startNodeId, paperRef, nodeIds, or paperRefs is required',
        ],
        maxNodes: normalized.maxNodes,
        maxEdges: normalized.maxEdges,
        recommendedCommands: [],
        maintenance: readMaintenanceForDto(),
      });
    }

    let graph = readDbCitationGraphOverview();
    let record = synthesisRepository.getCitationGraphLayoutState({
      viewKey: normalized.viewKey,
      preset: normalized.preset,
    });
    let layout = parseCitationGraphLayout(record);
    let layoutStatus = citationGraphLayoutStatus({ graph, record, layout });
    const legacy =
      !layout || !graph.nodes.length
        ? await readPersistedGraphProjection(root, normalized.preset)
        : null;
    if (
      legacy?.graph &&
      legacy.layout &&
      (!graph.nodes.length ||
        legacy.layout.graph_hash === graph.graph_hash ||
        layoutStatus === "missing")
    ) {
      graph = legacy.graph;
      layout = legacy.layout;
      record ||= {
        layoutKey: `legacy:${normalized.preset}`,
        viewKey: normalized.viewKey,
        preset: normalized.preset,
        graphHash: legacy.layout.graph_hash,
        status: legacy.layoutStatus === "ready" ? "ready" : "dirty",
        layoutJson: JSON.stringify(legacy.layout),
      };
      layoutStatus = legacy.layoutStatus === "ready" ? "ready" : "stale";
    }

    const layoutDiagnostics = parseJsonArray(record?.diagnosticsJson)
      .map((entry) => (isObject(entry) ? cleanString(entry.code) : cleanString(entry)))
      .filter(Boolean);
    const warnings = [...normalized.warnings, ...layoutDiagnostics];
    if (!graph.nodes.length) {
      return emptyCitationGraphLayoutResult({
        status: "missing",
        scope: normalized.scope,
        graphHash: graph.graph_hash,
        layoutHash: layout?.layout_hash,
        layoutStatus,
        preset: normalized.preset,
        viewKey: normalized.viewKey,
        snapshotFound: false,
        layoutFound: Boolean(layout),
        warnings: [...warnings, "citation graph snapshot is missing"],
        maxNodes: normalized.maxNodes,
        maxEdges: normalized.maxEdges,
        maintenance: readMaintenanceForDto(["recomputeCitationGraphLayout"]),
      });
    }
    if (layoutStatus !== "ready" || !layout) {
      return emptyCitationGraphLayoutResult({
        status: layoutStatus,
        scope: normalized.scope,
        graphHash: graph.graph_hash,
        layoutHash: layout?.layout_hash,
        layoutStatus,
        preset: normalized.preset,
        viewKey: normalized.viewKey,
        snapshotFound: true,
        layoutFound: Boolean(layout),
        warnings: [...warnings, `layout status is ${layoutStatus}`],
        maxNodes: normalized.maxNodes,
        maxEdges: normalized.maxEdges,
        maintenance: readMaintenanceForDto(["recomputeCitationGraphLayout"]),
      });
    }

    let selectedNodes: CitationGraph["nodes"] = [];
    let selectedEdges: CitationGraph["edges"] = [];
    let truncated = false;
    if (normalized.scope === "full") {
      selectedNodes = [...graph.nodes].sort((left, right) =>
        left.node_id.localeCompare(right.node_id),
      );
      selectedEdges = [...graph.edges].sort((left, right) =>
        left.edge_id.localeCompare(right.edge_id),
      );
    } else if (normalized.scope === "slice") {
      const slice = buildCitationGraphSlice({
        graph,
        startNodeId: normalized.slice.startNodeId,
        depth: normalized.slice.depth,
        maxNodes: normalized.maxNodes,
        maxEdges: normalized.maxEdges,
        direction: normalized.slice.direction,
        includeLowSignal: normalized.slice.includeLowSignal,
        roleFilter: normalized.slice.roleFilter,
        warnings,
      });
      if (!slice.ok) {
        return emptyCitationGraphLayoutResult({
          status: "not_found",
          scope: "slice",
          graphHash: graph.graph_hash,
          layoutHash: layout.layout_hash,
          layoutStatus,
          preset: normalized.preset,
          viewKey: normalized.viewKey,
          snapshotFound: true,
          layoutFound: true,
          warnings: slice.diagnostics.warnings,
          maxNodes: normalized.maxNodes,
          maxEdges: normalized.maxEdges,
          recommendedCommands: [],
          maintenance: readMaintenanceForDto(),
        });
      }
      selectedNodes = slice.nodes;
      selectedEdges = slice.edges;
      truncated = slice.diagnostics.truncated;
    } else {
      const requested = new Set(normalized.explicitNodeIds);
      const found = new Set<string>();
      selectedNodes = graph.nodes
        .filter((node) => {
          const match = requested.has(node.node_id);
          if (match) {
            found.add(node.node_id);
          }
          return match;
        })
        .sort((left, right) => left.node_id.localeCompare(right.node_id));
      const selectedNodeIds = new Set(selectedNodes.map((node) => node.node_id));
      selectedEdges = graph.edges
        .filter(
          (edge) =>
            selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target),
        )
        .sort((left, right) => left.edge_id.localeCompare(right.edge_id));
      for (const nodeId of requested) {
        if (!found.has(nodeId)) {
          warnings.push(`node not found: ${nodeId}`);
        }
      }
    }

    if (
      selectedNodes.length > normalized.maxNodes ||
      selectedEdges.length > normalized.maxEdges ||
      truncated
    ) {
      if (!normalized.allowTruncated) {
        return emptyCitationGraphLayoutResult({
          status: "too_large",
          scope: normalized.scope,
          graphHash: graph.graph_hash,
          layoutHash: layout.layout_hash,
          layoutStatus,
          preset: normalized.preset,
          viewKey: normalized.viewKey,
          snapshotFound: true,
          layoutFound: true,
          warnings: [
            ...warnings,
            `layout result exceeds limits: nodes=${selectedNodes.length}, edges=${selectedEdges.length}`,
          ],
          truncated: true,
          maxNodes: normalized.maxNodes,
          maxEdges: normalized.maxEdges,
          recommendedCommands: [],
          maintenance: readMaintenanceForDto(),
        });
      }
      truncated = true;
      selectedNodes = selectedNodes.slice(0, normalized.maxNodes);
      const retained = new Set(selectedNodes.map((node) => node.node_id));
      selectedEdges = selectedEdges
        .filter((edge) => retained.has(edge.source) && retained.has(edge.target))
        .slice(0, normalized.maxEdges);
    }

    const coordinates = layout.nodes || {};
    const nodes: SynthesisCitationGraphLayoutResult["nodes"] = [];
    for (const node of selectedNodes) {
      const point = coordinates[node.node_id];
      if (!point) {
        warnings.push(`layout coordinate missing for node: ${node.node_id}`);
        continue;
      }
      nodes.push(compactLayoutNode({ node, coordinates: point }));
    }
    const retained = new Set(nodes.map((node) => node.node_id));
    const edges = selectedEdges
      .filter((edge) => retained.has(edge.source) && retained.has(edge.target))
      .map(compactLayoutEdge);
    return {
      ok: true,
      status: "ready",
      scope: normalized.scope,
      graph_hash: graph.graph_hash,
      layout_hash: layout.layout_hash,
      layout_status: layoutStatus,
      preset: normalized.preset,
      view_key: normalized.viewKey,
      nodes,
      edges,
      diagnostics: {
        snapshot_found: true,
        layout_found: true,
        node_count: nodes.length,
        edge_count: edges.length,
        truncated,
        limits: {
          maxNodes: normalized.maxNodes,
          maxEdges: normalized.maxEdges,
          hardMaxNodes: CITATION_LAYOUT_HARD_MAX_NODES,
          hardMaxEdges: CITATION_LAYOUT_HARD_MAX_EDGES,
        },
        warnings,
        recommended_commands: [],
        maintenance: readMaintenanceForDto(),
      },
    };
  }

  async function getCitationGraphMetrics(
    args: Record<string, unknown> = {},
  ): Promise<SynthesisCitationGraphMetricsResult> {
    const normalized = normalizeGraphMetricsArgs(args);
    return readDbCitationMetrics(normalized);
  }

  async function rankExternalReferences(
    args: Record<string, unknown> = {},
  ): Promise<SynthesisRankedExternalReferencesResult> {
    return rankDbExternalReferences(normalizeExternalReferenceRankArgs(args));
  }

  async function rankLibraryPapers(args: Record<string, unknown> = {}) {
    return rankDbLibraryPapers(normalizeGraphMetricsArgs(args));
  }

  async function getAttentionQueue(
    args: Record<string, unknown> = {},
  ): Promise<SynthesisAttentionQueueResult> {
    return readAttentionQueue(normalizeAttentionQueueArgs(args));
  }

  async function queryCitationGraph() {
    return {
      ...readDbCitationGraphOverview(),
      maintenance: readMaintenanceForDto(),
    };
  }

  async function topicGraphSnapshotForUi(options?: {
    persistMissingDefinition?: boolean;
  }) {
    const snapshot = await topicGraph.loadTopicGraph();
    const definitions = await readTopicDefinitionsMap(root);
    const metadata = await readTopicCurrentMetadataMap(root, snapshot.nodes);
    const enrichedNodes: SynthesisTopicGraphNode[] = [];
    for (const node of snapshot.nodes) {
      const topicId = cleanString(node.topic_id);
      let definitionText = topicDefinitionFromSources({
        definition: definitions[topicId],
        metadata: metadata[topicId],
        node,
      });
      if (!definitionText && topicId && node.node_type === "materialized") {
        definitionText = await readTopicDefinitionFromArtifact(root, topicId);
      }
      const enriched = definitionText
        ? { ...node, definition: definitionText }
        : node;
      enrichedNodes.push(enriched);
      if (
        options?.persistMissingDefinition &&
        definitionText &&
        !cleanString(node.definition) &&
        node.node_type === "materialized"
      ) {
        await topicGraph.upsertMaterializedTopic({
          topicId,
          title: cleanString(node.title) || topicId,
          definition: definitionText,
          aliases: node.aliases,
          currentArtifactPath: node.current_artifact_path,
          paperCount: node.paper_count,
          lastSynthesisAt: node.last_synthesis_at,
          isRoot: node.is_root,
          level: node.level,
          transactionId: `topic-definition-backfill-${topicPathId(topicId)}`,
        });
      }
    }
    return {
      snapshot: { ...snapshot, nodes: enrichedNodes },
      definitions,
      metadata,
    };
  }

  async function listTopics() {
    const topicGraphContext = await topicGraphSnapshotForUi({
      persistMissingDefinition: true,
    }).catch(() => undefined);
    const nodes = topicGraphContext?.snapshot.nodes || [];
    const topics = topicInventoryRowsFromGraphNodes({
      nodes,
      definitions: topicGraphContext?.definitions || {},
      metadata: topicGraphContext?.metadata || {},
    });
    return {
      topics,
      diagnostics: {
        count: topics.length,
        source: "sqlite-topic-graph",
      },
    };
  }

  async function listWorkflowTopicOptions(args?: {
    filter?: unknown;
  }): Promise<SynthesisWorkflowTopicOptionsResult> {
    const filter = cleanString(args?.filter) || "all";
    if (filter === "updatable") {
      const topicGraphContext = await topicGraphSnapshotForUi().catch(
        () => undefined,
      );
      const topicGraphSnapshot = topicGraphContext?.snapshot;
      const rows = (topicGraphSnapshot?.nodes || [])
        .filter(
          (node) =>
            cleanString(node.topic_id) &&
            node.node_type === "materialized" &&
            node.definition_status !== "deleted",
        )
        .map(topicIndexRowFromGraphNode);
      const artifactState = await readArtifactStateRows(root);
      const options: SynthesisWorkflowTopicOption[] = [];
      for (const row of rows) {
        const topicId = cleanString(row.topic_id);
        if (!topicId) {
          continue;
        }
        const stateRow = artifactState[topicId];
        const intent = topicUpdateIntentForUi({
          topicId,
          intent: deriveTopicUpdateIntent({
            topicId,
            language: row.language,
            state: stateRow,
            row,
          }),
        });
        if (intent.blocked === true) {
          continue;
        }
        const title = cleanString(row.title) || topicId;
        const freshness = cleanString(stateRow?.freshness) || "unknown";
        const coverage = cleanString(stateRow?.coverage) || "missing";
        options.push({
          value: topicId,
          label: title,
          description: [
            cleanString(intent.actionLabel) || "Update",
            freshness ? `freshness ${freshness}` : "",
            coverage ? `coverage ${coverage}` : "",
            topicId,
          ]
            .filter(Boolean)
            .join(" · "),
          meta: {
            kind: "synthesis.topic",
            topicId,
            title,
            actionLabel: intent.actionLabel,
            freshness: freshness || undefined,
            coverage: coverage || undefined,
          },
        });
      }
      return {
        options: options.sort((left, right) =>
          left.label.localeCompare(right.label),
        ),
        diagnostics: [],
      };
    }

    const result = await listTopics();
    return {
      options: result.topics.map((topic) => {
        const topicId = cleanString(topic.topic_id);
        const title = cleanString(topic.title) || topicId;
        const status = cleanString(topic.status);
        const updatedAt = cleanString(topic.updated_at);
        return {
          value: topicId,
          label: title,
          description: [
            status ? `status ${status}` : "",
            updatedAt ? `updated ${updatedAt}` : "",
            topicId,
          ]
            .filter(Boolean)
            .join(" · "),
          meta: {
            kind: "synthesis.topic",
            topicId,
            title,
            status: status || undefined,
            updatedAt: updatedAt || undefined,
          },
        };
      }),
      diagnostics: [],
    };
  }

  async function getTopicContext(args: Record<string, unknown> = {}) {
    const topicId = cleanString(args.topicId || args.topic_id);
    if (!topicId) {
      return { topics: (await listTopics()).topics };
    }
    const artifact = await readTopicArtifact({ topicId }).catch(() => null);
    if (!artifact) {
      return {
        ok: false,
        status: "not_found",
        topic_id: topicId,
        diagnostics: {
          message: `topic artifact is not available in the synthesis runtime files: ${topicId}`,
        },
      };
    }
    const resolvedTopicId = cleanString(artifact.topicId) || topicId;
    const topicGraphSnapshot = await topicGraph
      .loadTopicGraph()
      .catch(() => undefined);
    const topicNode = (topicGraphSnapshot?.nodes || []).find(
      (node) => cleanString(node.topic_id) === resolvedTopicId,
    );
    if (
      topicNode?.definition_status === "deleted" ||
      (await readDeletedRows(root)).some(
        (row) =>
          row.topic_id === resolvedTopicId ||
          row.path_id === artifact.pathId ||
          row.deleted_path_id === artifact.pathId,
      )
    ) {
      return {
        ok: false,
        status: "deleted",
        topic_id: resolvedTopicId,
        diagnostics: {
          message: `topic artifact is deleted: ${resolvedTopicId}`,
        },
      };
    }
    const artifactState = await readArtifactStateRows(root);
    const paths = buildSynthesisStoragePaths(root);
    const definitions = await readStateMap<Record<string, unknown>>(
      paths.topicDefinitions,
      "topics",
    ).catch(() => ({}) as Record<string, Record<string, unknown>>);
    const resolvers = await readStateMap<Record<string, unknown>>(
      paths.resolvers,
      "resolvers",
    ).catch(() => ({}) as Record<string, Record<string, unknown>>);
    const paperSets = await readStateMap<Record<string, unknown>>(
      paths.resolvedPaperSets,
      "paper_sets",
    ).catch(() => ({}) as Record<string, Record<string, unknown>>);
    const currentManifest = (artifact.manifest || {}) as Record<
      string,
      unknown
    >;
    const sectionHashes = isObject(currentManifest.section_hashes)
      ? (currentManifest.section_hashes as Record<string, unknown>)
      : {};
    const hashes = await currentHashes(root, resolvedTopicId, artifact.pathId);
    const freshness = artifactState[resolvedTopicId] || null;
    const discoveryHints = synthesisRepository.listTopicDiscoveryHints({
      topicIds: [resolvedTopicId],
      statuses: ["open"],
      limit: 25,
    });
    const metadata = artifact.metadata as TopicArtifactMetadata;
    const topicRow = topicNode
      ? topicIndexRowFromGraphNode(topicNode)
      : topicIndexRowFromExistingTopic({
          topicId: resolvedTopicId,
          pathId: artifact.pathId,
          metadata,
          artifact: artifact.artifact,
          indexRow: artifact.indexRow,
        });
    const includeFull = args.includeFull === true || args.include_full === true;
    const includeMarkdown =
      includeFull ||
      args.includeMarkdown === true ||
      args.include_markdown === true;
    const includeArtifact =
      includeFull ||
      args.includeArtifact === true ||
      args.include_artifact === true;
    const includeManifest =
      includeFull ||
      includeArtifact ||
      args.includeManifest === true ||
      args.include_manifest === true;
    const response: Record<string, unknown> = {
      paths: artifact.paths,
      topic_id: resolvedTopicId,
      language: metadata.language || topicRow?.language || "auto",
      current_metadata: artifact.metadata,
      current_hashes: hashes,
      section_hashes: Object.fromEntries(
        Object.entries(sectionHashes).map(([section, hash]) => [
          section,
          cleanString(hash),
        ]),
      ),
      topic_definition:
        definitions[resolvedTopicId] || definitions[topicId] || {},
      topic_resolver: resolvers[resolvedTopicId] || resolvers[topicId] || {},
      resolved_paper_set:
        paperSets[resolvedTopicId] || paperSets[topicId] || {},
      prospective_topic_relation_proposals:
        normalizeProspectiveTopicRelationProposals(
          metadata.prospective_topic_relation_proposals,
        ),
      freshness,
      discovery_hints: discoveryHints,
      recommended_update: deriveTopicUpdateIntent({
        topicId: resolvedTopicId,
        language: metadata.language || topicRow?.language,
        state: freshness || undefined,
        row: topicRow,
      }),
      request: {
        mode: cleanString(args.mode) || "read",
        language: cleanString(args.language) || undefined,
        updateScope:
          cleanString(args.updateScope || args.update_scope) || undefined,
        updateMode:
          cleanString(args.updateMode || args.update_mode) || undefined,
        updateReason:
          cleanString(args.updateReason || args.update_reason) || undefined,
      },
      diagnostics: {
        bounded: true,
        omitted: [
          includeMarkdown ? "" : "markdown",
          includeArtifact ? "" : "artifact",
          includeManifest ? "" : "manifest",
        ].filter(Boolean),
      },
    };
    if (includeMarkdown) {
      response.markdown = reportBodyFromTopicArtifact(artifact.artifact);
    }
    if (includeArtifact) {
      response.artifact = artifact.artifact;
      response.current_artifact = artifact.artifact;
    }
    if (includeManifest) {
      response.manifest = artifact.manifest;
      response.current_manifest = artifact.manifest;
    }
    return response;
  }

  async function getTopicReport(args: Record<string, unknown> = {}) {
    const topicId = cleanString(args.topicId || args.topic_id);
    if (!topicId) {
      return {
        ok: false,
        status: "invalid_request",
        topic_id: "",
        format: "markdown",
        markdown: "",
        diagnostics: ["topic_id_required"],
      };
    }
    const topic = await readTopicArtifact({ topicId }).catch(() => null);
    if (!topic) {
      return {
        ok: false,
        status: "not_found",
        topic_id: topicId,
        format: "markdown",
        markdown: "",
        diagnostics: ["topic_report_unavailable"],
      };
    }
    const artifact = isObject(topic.artifact)
      ? (topic.artifact as Record<string, unknown>)
      : {};
    const report = isObject(artifact.synthesis_report)
      ? (artifact.synthesis_report as Record<string, unknown>)
      : {};
    const metadata = topic.metadata as TopicArtifactMetadata;
    const markdown = reportBodyFromTopicArtifact(artifact);
    const resolvedTopicId = cleanString(topic.topicId) || topicId;
    const pathId = cleanString(topic.pathId) || topicPathId(resolvedTopicId);
    return {
      ok: Boolean(markdown),
      status: markdown ? "available" : "unavailable",
      topic_id: resolvedTopicId,
      title: cleanString(report.title) || metadata.title || resolvedTopicId,
      format: "markdown",
      markdown,
      source: {
        path: `topics/${pathId}/current/artifact.json`,
        field: "synthesis_report.body",
        ssot: "runtime.synthesis_report.body",
      },
      metadata: {
        language: metadata.language || "auto",
        updated_at: metadata.updated_at,
        artifact_hash: metadata.artifact_hash || metadata.structured_hash,
        manifest_hash: metadata.manifest_hash,
        metadata_hash: metadata.metadata_hash,
      },
      diagnostics: markdown ? [] : ["synthesis_report_body_unavailable"],
    };
  }

  async function resolveTopicPaperDigest(args: Record<string, unknown> = {}) {
    const digestRef = isObject(args.digest_ref)
      ? (args.digest_ref as Record<string, unknown>)
      : isObject(args.digestRef)
        ? (args.digestRef as Record<string, unknown>)
        : {};
    const libraryId = cleanString(digestRef.library_id || digestRef.libraryId);
    const itemKey = cleanString(digestRef.item_key || digestRef.itemKey);
    const paperRef =
      cleanString(
        args.paper_ref ||
          args.paperRef ||
          digestRef.paper_ref ||
          digestRef.paperRef,
      ) || (libraryId && itemKey ? `${libraryId}:${itemKey}` : "");
    const recordedHash = cleanString(
      digestRef.payload_hash || digestRef.payloadHash,
    );
    if (!paperRef) {
      return {
        ok: false,
        status: "unavailable",
        paper_ref: "",
        digest_markdown: "",
        recorded_hash: recordedHash,
        current_hash: "",
        source_changed: false,
        diagnostics: ["digest_ref_missing_paper_ref"],
      };
    }
    const result = await readPaperArtifacts({
      paper_refs: [paperRef],
      artifact_types: ["digest"],
    });
    const noteKey = cleanString(digestRef.note_key || digestRef.noteKey);
    const artifact =
      result.artifacts.find(
        (entry) => noteKey && cleanString(entry.note_key) === noteKey,
      ) ||
      result.artifacts.find(
        (entry) => entry.payload_type === "digest-markdown",
      );
    if (!artifact) {
      return {
        ok: false,
        status: "unavailable",
        paper_ref: paperRef,
        digest_markdown: "",
        recorded_hash: recordedHash,
        current_hash: "",
        source_changed: false,
        diagnostics: result.diagnostics.length
          ? result.diagnostics
          : ["digest_unavailable"],
      };
    }
    const markdown =
      cleanString(artifact.markdown) ||
      cleanString(artifact.decoded_text) ||
      (typeof artifact.payload === "string" ? artifact.payload : "");
    const currentHash = cleanString(artifact.hash);
    const includeRepresentativeImage =
      args.include_representative_image === true ||
      args.includeRepresentativeImage === true;
    const representativeImage = includeRepresentativeImage
      ? await resolveDigestRepresentativeImageForUi({
          libraryId:
            libraryId ||
            cleanString(artifact.paper_ref || paperRef).split(":")[0] ||
            undefined,
          noteKey: artifact.note_key,
        })
      : undefined;
    return {
      ok: Boolean(markdown),
      status: markdown ? "available" : "unavailable",
      paper_ref: artifact.paper_ref || paperRef,
      note_key: artifact.note_key,
      note_title: artifact.note_title,
      digest_markdown: markdown,
      recorded_hash: recordedHash,
      current_hash: currentHash,
      source_changed: Boolean(
        recordedHash && currentHash && recordedHash !== currentHash,
      ),
      diagnostics: artifact.diagnostics || [],
      ...(representativeImage
        ? { representative_image: representativeImage }
        : {}),
    };
  }

  async function validateDigestRefsAgainstCurrentArtifacts(
    artifact: Record<string, unknown>,
  ) {
    const rows = Array.isArray(artifact.source_papers)
      ? artifact.source_papers.filter(isObject)
      : [];
    const errors: string[] = [];
    for (const entry of rows) {
      const digestRef = isObject(entry.digest_ref)
        ? (entry.digest_ref as Record<string, unknown>)
        : {};
      const paperRef = cleanString(
        entry.paper_ref || digestRef.paper_ref || digestRef.paperRef,
      );
      if (!paperRef) {
        errors.push(
          `source_papers ${cleanString(entry.paper_ref)} digest_ref must include paper_ref`,
        );
      }
    }
    if (errors.length) {
      throw new Error(
        `invalid topic synthesis artifact digest locators: ${errors.join("; ")}`,
      );
    }
  }

  function synthesisOutputSchemaContracts() {
    const topicDefinition = {
      type: "object",
      required: ["id", "title"],
      properties: {
        id: { type: "string", minLength: 1 },
        title: { type: "string", minLength: 1 },
      },
    };
    const common = {
      kind: { const: "topic_synthesis" },
      language: { type: "string", minLength: 1 },
      topic_definition: topicDefinition,
      resolver_manifest_path: { type: "string", minLength: 1 },
      analysis_manifest_path: { type: "string", minLength: 1 },
      candidate_output_path: { type: "string", minLength: 1 },
    };
    return {
      schema_id: "synthesis.topic_synthesis_result_bundle",
      schema_version: "2.1.0",
      oneOf: [
        {
          title: "Create topic synthesis",
          required: [
            "kind",
            "operation",
            "language",
            "topic_definition",
            "resolver_manifest_path",
            "analysis_manifest_path",
            "candidate_output_path",
          ],
          properties: { ...common, operation: { const: "create" } },
        },
        {
          title: "Full update topic synthesis",
          required: [
            "kind",
            "operation",
            "language",
            "topic_definition",
            "resolver_manifest_path",
            "analysis_manifest_path",
            "candidate_output_path",
          ],
          properties: {
            ...common,
            operation: { const: "update_full" },
          },
        },
        {
          title: "Patch update topic synthesis",
          required: [
            "kind",
            "operation",
            "language",
            "topic_definition",
            "resolver_manifest_path",
            "analysis_manifest_path",
            "candidate_output_path",
          ],
          properties: {
            ...common,
            operation: { const: "update_patch" },
          },
        },
      ],
    };
  }

  async function getSchemas() {
    return {
      schemas: {
        result_bundle: "synthesis.topic_synthesis_result_bundle@1.0.0",
        canonical_metadata: "synthesis.topic_artifact_metadata@1.0.0",
      },
      output_schema: synthesisOutputSchemaContracts(),
      operation_cas_contract: {
        create: {
          precondition: "topic_absent",
        },
        update_full: {
          precondition: "topic_exists",
        },
        update_patch: {
          precondition: "topic_exists",
          resolver: "must_run_before_apply",
        },
      },
      stage_payload_schema_manifest: [
        {
          stage: "stage_1_topic_context",
          action: "persist_topic_context",
          schema: "topic_context_payload.schema.json",
          agent_authored: true,
          runtime_owned: [
            "topic_id_derivation",
            "update_context_hash_derivation",
          ],
        },
        {
          stage: "stage_5_paper_triage",
          action: "persist_paper_triage",
          schema: "paper_triage_batch.schema.json",
          agent_authored: true,
          required_fields: [
            "paper_ref",
            "topic_relevance",
            "paper_quality",
            "core_digest",
          ],
        },
        {
          stage: "stage_6_prepare_cross_paper_context",
          action: "prepare_cross_paper_context",
          agent_authored: false,
          runtime_owned: [
            "paper_scoring",
            "context_selection",
            "source_paper_evidence_index",
          ],
        },
        {
          stage: "stage_7_persist_core_synthesis",
          action: "persist_core_synthesis",
          agent_authored: true,
          required_fields: [
            "taxonomy",
            "timeline_events",
            "claims",
            "improvement_dimension_summary",
            "improvement_dimensions",
            "debates",
            "future_directions",
            "review_outline",
            "concept_candidate_labels",
          ],
          evidence_contract: "source_paper_refs_only",
        },
        {
          stage: "stage_9_persist_kg_enrichment",
          action: "persist_kg_enrichment",
          agent_authored: true,
          required_fields: [
            "concept_details",
            "topic_relation_candidates",
            "topic_matching_terms",
          ],
        },
        {
          stage: "stage_10_finalize_summary_coverage",
          action: "finalize_summary_coverage",
          agent_authored: true,
          runtime_owned: ["statistics", "synthesis_report"],
        },
      ],
      enum_definitions: {
        operation: ["create", "update_full", "update_patch"],
        paper_quality: ["high", "medium", "low", "unknown"],
        topic_relevance: ["core", "related", "peripheral", "excluded"],
        graph_cluster_policy: [
          "source_only",
          "include_external",
          "bounded_external",
        ],
        improvement_dimension_kind: [
          "method",
          "data",
          "evaluation",
          "efficiency",
          "application",
          "theory",
        ],
      },
      artifact_section_summaries: {
        timeline_events: {
          primary_render_input: "markers",
          fallback: "events_plus_source_papers",
          runtime_materialized: ["markers"],
        },
        improvement_dimensions: {
          runtime_materialized_from: "validated_section_source_paper_refs",
        },
        source_papers: { runtime_materialized_from: "resolved_workset" },
        statistics: { runtime_materialized_from: "topic_scoped_graph_cluster" },
        synthesis_report: { runtime_materialized_from: "fixed_template" },
      },
    };
  }

  function normalizedConceptKey(value: unknown) {
    return cleanString(value).toLocaleLowerCase().replace(/\s+/g, " ");
  }

  async function queryConceptKb(args: Record<string, unknown> = {}) {
    const labels = Array.from(
      new Set(
        [
          ...normalizeArray(args.concept_candidate_labels),
          ...normalizeArray(args.conceptCandidateLabels),
          ...normalizeArray(args.labels),
          args.label,
          args.query,
        ]
          .map(cleanString)
          .filter(Boolean),
      ),
    ).slice(0, parsePositiveInteger(args.limit, 50, 100));
    const snapshot = await conceptKb.loadConceptKb().catch((error) => ({
      concepts: [],
      senses: [],
      aliases: [],
      diagnostics: [
        {
          code: "concept_kb_unavailable",
          message: String((error as Error)?.message || error),
        },
      ],
    }));
    const concepts = Array.isArray(snapshot.concepts)
      ? snapshot.concepts.filter(isRecord)
      : [];
    const senses = Array.isArray((snapshot as Record<string, unknown>).senses)
      ? ((snapshot as Record<string, unknown>).senses as unknown[]).filter(
          isRecord,
        )
      : [];
    const aliases = Array.isArray((snapshot as Record<string, unknown>).aliases)
      ? ((snapshot as Record<string, unknown>).aliases as unknown[]).filter(
          isRecord,
        )
      : [];
    const conceptById = new Map(
      concepts.map((concept) => [cleanString(concept.concept_id), concept]),
    );
    const results = labels.map((label) => {
      const key = normalizedConceptKey(label);
      const exact = concepts.filter(
        (concept) => normalizedConceptKey(concept.label) === key,
      );
      const aliasMatches = aliases
        .filter((alias) => normalizedConceptKey(alias.alias) === key)
        .map((alias) => ({
          alias,
          concept: conceptById.get(cleanString(alias.concept_id)) || null,
        }));
      const candidateConceptIds = new Set<string>();
      exact.forEach((concept) =>
        candidateConceptIds.add(cleanString(concept.concept_id)),
      );
      aliasMatches.forEach((entry) =>
        candidateConceptIds.add(cleanString(entry.alias.concept_id)),
      );
      const candidateSenses = senses.filter((sense) =>
        candidateConceptIds.has(cleanString(sense.concept_id)),
      );
      return {
        label,
        exact_matches: exact,
        alias_matches: aliasMatches,
        sense_candidates: candidateSenses,
        ambiguous: candidateConceptIds.size > 1,
      };
    });
    return {
      ok: true,
      labels,
      matches: results,
      diagnostics: [
        ...(((snapshot as Record<string, unknown>).diagnostics as unknown[]) ||
          []),
        {
          code: "bounded_read_only",
          message:
            "Concept KB query read existing concepts, aliases, and senses without mutating review state.",
          details: { requested: labels.length, returned: results.length },
        },
      ],
    };
  }

  async function queryCitationGraphCluster(args: Record<string, unknown> = {}) {
    const sourceRefs = Array.from(
      new Set(
        [
          ...normalizeArray(args.source_paper_refs),
          ...normalizeArray(args.sourcePaperRefs),
          ...normalizeArray(args.paper_refs),
          ...normalizeArray(args.paperRefs),
          args.paper_ref,
          args.paperRef,
        ]
          .map(cleanString)
          .filter(Boolean),
      ),
    ).slice(0, 250);
    const maxExternalNodes = parsePositiveInteger(
      args.max_external_nodes || args.maxExternalNodes,
      25,
      250,
    );
    const policy = cleanString(args.cluster_policy || args.clusterPolicy);
    const clusterPolicy = [
      "source_only",
      "include_external",
      "bounded_external",
    ].includes(policy)
      ? policy
      : "bounded_external";
    const graph = await queryCitationGraph();
    const nodes = Array.isArray((graph as Record<string, unknown>).nodes)
      ? ((graph as Record<string, unknown>).nodes as CitationGraphNode[])
      : [];
    const edges = Array.isArray((graph as Record<string, unknown>).edges)
      ? ((graph as Record<string, unknown>).edges as CitationGraphEdge[])
      : [];
    const sourceNodeIds = new Set(
      sourceRefs.map(paperRefToCitationGraphNodeId).filter(Boolean),
    );
    const selectedNodeIds = new Set<string>(sourceNodeIds);
    const selectedEdges: CitationGraphEdge[] = [];
    let externalCount = 0;
    for (const edge of edges) {
      const touchesSource =
        sourceNodeIds.has(edge.source) || sourceNodeIds.has(edge.target);
      if (!touchesSource) {
        continue;
      }
      const nextIds = [edge.source, edge.target].filter(
        (nodeId) => !sourceNodeIds.has(nodeId),
      );
      if (clusterPolicy === "source_only" && nextIds.length) {
        continue;
      }
      const hasExternal = nextIds.some((nodeId) => !sourceNodeIds.has(nodeId));
      if (
        clusterPolicy === "bounded_external" &&
        hasExternal &&
        externalCount >= maxExternalNodes
      ) {
        continue;
      }
      if (hasExternal) {
        externalCount += nextIds.length;
      }
      selectedEdges.push(edge);
      selectedNodeIds.add(edge.source);
      selectedNodeIds.add(edge.target);
    }
    const selectedNodes = nodes.filter((node) =>
      selectedNodeIds.has(node.node_id),
    );
    const unresolvedSourceRefs = sourceRefs.filter(
      (ref) =>
        !nodes.some(
          (node) => node.node_id === paperRefToCitationGraphNodeId(ref),
        ),
    );
    const years = selectedNodes
      .map((node) => Number(node.year))
      .filter((year) => Number.isFinite(year));
    return {
      ok: true,
      source_paper_refs: sourceRefs,
      cluster_policy: clusterPolicy,
      nodes: selectedNodes,
      edges: selectedEdges,
      summaries: {
        source_paper_count: sourceRefs.length,
        source_node_count: Array.from(sourceNodeIds).filter((nodeId) =>
          selectedNodeIds.has(nodeId),
        ).length,
        cluster_node_count: selectedNodes.length,
        internal_edge_count: selectedEdges.filter(
          (edge) =>
            sourceNodeIds.has(edge.source) && sourceNodeIds.has(edge.target),
        ).length,
        external_edge_count: selectedEdges.filter(
          (edge) =>
            !sourceNodeIds.has(edge.source) || !sourceNodeIds.has(edge.target),
        ).length,
        unresolved_count: unresolvedSourceRefs.length,
        year_span: years.length
          ? { start_year: Math.min(...years), end_year: Math.max(...years) }
          : null,
      },
      diagnostics: {
        bounded: true,
        side_effect_free: true,
        max_external_nodes: maxExternalNodes,
        unresolved_source_refs: unresolvedSourceRefs,
        graph_status:
          selectedNodes.length || !sourceRefs.length
            ? "ready"
            : "missing_or_stale",
        maintenance: (graph as Record<string, unknown>).maintenance,
      },
    };
  }

  async function getLibraryIndex(args: Record<string, unknown> = {}) {
    const inputs = await registryInputsForService(options);
    const base = options.libraryAdapter
      ? await options.libraryAdapter.getLibraryIndex()
      : buildLibraryIndexFromRegistryInputs(libraryId, inputs);
    const topics = (await listTopics()).topics;
    const registry = registryRowsForInputs(inputs);
    const cursor = parseNonNegativeInteger(args.cursor, 0);
    const limit = parsePositiveInteger(
      args.limit,
      LIBRARY_INDEX_PAGE_LIMIT_DEFAULT,
      LIBRARY_INDEX_PAGE_LIMIT_MAX,
    );
    const papers = base.papers.slice(cursor, cursor + limit);
    const nextCursor = cursor + papers.length;
    const hasMore = nextCursor < base.papers.length;
    const completeIndexIdentity = {
      libraryId: base.libraryId,
      papers: base.papers,
      tags: base.tags,
      collections: base.collections,
      topics,
      registry,
    };
    const pageIdentity = {
      libraryId: base.libraryId,
      cursor: String(cursor),
      limit,
      papers,
      index_hash: hashCanonicalJson(completeIndexIdentity),
    };
    const pagedRequest =
      Object.prototype.hasOwnProperty.call(args, "cursor") ||
      Object.prototype.hasOwnProperty.call(args, "limit");
    const includeTags =
      args.includeTags === true ||
      (!pagedRequest && args.includeTags !== false);
    const includeCollections =
      args.includeCollections === true ||
      (!pagedRequest && args.includeCollections !== false);
    const response: Record<string, unknown> = {
      libraryId: base.libraryId,
      papers,
      cursor: String(cursor),
      next_cursor: hasMore ? String(nextCursor) : "",
      has_more: hasMore,
      returned: papers.length,
      total_papers: base.papers.length,
      limit,
      index_hash: pageIdentity.index_hash,
      page_hash: hashCanonicalJson(pageIdentity),
    };
    if (includeTags) {
      response.tags = base.tags;
    }
    if (includeCollections) {
      response.collections = base.collections;
    }
    if (args.includeItems === true) {
      response.topics = topics;
      response.registry = registry;
    }
    return response;
  }

  async function resolveResolver(args: Record<string, unknown> = {}) {
    const rows = registryRowsForInputs(await registryInputsForService(options));
    const resolver = args.resolver;
    if (!isRecord(resolver)) {
      const errors = ["$.resolver is required and must be an object"];
      if ("topic_resolver" in args) {
        errors.push(
          "$.topic_resolver is not accepted by resolvers.resolve; use $.resolver instead",
        );
      }
      return {
        ok: false,
        errors,
        papers: [],
        normalized_resolver: null,
        diagnostics: {
          final_count: 0,
          total_candidates: rows.length,
          rejected: true,
        },
      };
    }
    const errors = validateCanonicalResolver(resolver, "$.resolver");
    if (errors.length) {
      return {
        ok: false,
        errors,
        papers: [],
        normalized_resolver: null,
        diagnostics: {
          final_count: 0,
          total_candidates: rows.length,
          rejected: true,
        },
      };
    }
    const allResolved = [...resolveRowsByResolver(rows, resolver).values()]
      .sort((left, right) =>
        left.row.paper_ref.localeCompare(right.row.paper_ref),
      )
      .map((entry) => ({
        paper_ref: entry.row.paper_ref,
        item_key: entry.row.item_key,
        title: entry.row.title,
        year: cleanString(entry.row.year),
        match_reasons: entry.reasons.sort((left, right) =>
          left.localeCompare(right),
        ),
      }));
    const page = pageRows(allResolved, args, {
      defaultLimit: SYNTHESIS_REGISTRY_PAGE_LIMIT_DEFAULT,
      maxLimit: SYNTHESIS_REGISTRY_PAGE_LIMIT_MAX,
    });
    const errorsAfterResolve = allResolved.length
      ? []
      : ["resolver matched no papers"];
    return {
      ok: allResolved.length > 0,
      errors: errorsAfterResolve,
      papers: page.page,
      normalized_resolver: resolver,
      cursor: page.cursor,
      next_cursor: page.next_cursor,
      has_more: page.has_more,
      returned: page.returned,
      total: page.total,
      limit: page.limit,
      diagnostics: {
        final_count: allResolved.length,
        total_candidates: rows.length,
        rejected: false,
      },
    };
  }

  async function getPaperArtifactManifest(args: Record<string, unknown> = {}) {
    const result = await readPaperArtifacts(args);
    const artifacts = (
      Array.isArray(result.artifacts) ? result.artifacts : []
    ).map((entry) => {
      const { payload, markdown, decoded_text, ...manifestEntry } =
        entry as any;
      return manifestEntry;
    });
    return {
      artifacts,
      diagnostics: Array.isArray(result.diagnostics) ? result.diagnostics : [],
      total: artifacts.length,
    };
  }

  async function readPaperArtifacts(args: Record<string, unknown> = {}) {
    const request = {
      ...args,
      artifact_types: (args.artifact_types || args.artifactTypes) as
        | ReferenceSidecarArtifactType[]
        | undefined,
    };
    if (options.libraryAdapter) {
      return options.libraryAdapter.readPaperArtifacts(request);
    }
    return readArtifactsFromRegistryInputs(
      await registryInputsForService(options),
      request,
    );
  }

  async function exportFilteredPaperArtifacts(
    args: Record<string, unknown> = {},
  ) {
    const runRoot = validateAcpSkillRunRoot(
      cleanString(args.run_root || args.runRoot),
    );
    const paperRefs = [
      ...normalizeArray(args.paper_refs || args.paperRefs),
      ...normalizeArray(args.paper_ref || args.paperRef),
    ]
      .map(cleanString)
      .filter(Boolean);
    const uniquePaperRefs = Array.from(new Set(paperRefs));
    if (!uniquePaperRefs.length) {
      throw new Error("paper_ref or paper_refs is required");
    }
    const result = await readPaperArtifacts({
      paper_refs: uniquePaperRefs,
      artifact_types: (args.artifact_types || args.artifactTypes) as
        | ReferenceSidecarArtifactType[]
        | undefined,
    });
    const artifacts = Array.isArray(result.artifacts)
      ? result.artifacts.filter(isObject)
      : [];
    const diagnostics = Array.isArray(result.diagnostics)
      ? result.diagnostics
      : [];
    const exportedAt = new Date().toISOString();
    const papers: Array<Record<string, unknown>> = [];
    for (const paperRef of uniquePaperRefs) {
      const paperArtifacts = artifacts.filter((entry) => {
        const row = entry as Record<string, unknown>;
        return cleanString(row.paper_ref || row.paperRef) === paperRef;
      });
      const paperDiagnostics = diagnostics.filter((entry) =>
        cleanString(entry).startsWith(`${paperRef}:`),
      );
      const manifestArtifacts: Record<string, unknown>[] = [];
      for (const artifact of paperArtifacts) {
        const row = artifact as Record<string, unknown>;
        const status = cleanString(artifact.status || "available");
        const artifactDiagnostics = Array.isArray(artifact.diagnostics)
          ? artifact.diagnostics.map(cleanString).filter(Boolean)
          : [];
        const manifestEntry: Record<string, unknown> = {
          artifact_type: cleanString(row.artifact_type || row.artifactType),
          payload_type: cleanString(row.payload_type || row.payloadType),
          status,
          note_key: cleanString(row.note_key || row.noteKey),
          note_title: cleanString(row.note_title || row.noteTitle),
          payload_types_seen: normalizeArray(
            row.payload_types_seen || row.payloadTypesSeen,
          )
            .map(cleanString)
            .filter(Boolean),
          payload_hash: cleanString(artifact.payload_hash || artifact.hash),
          missing_reason: cleanString(row.missing_reason || row.missingReason),
          diagnostics: artifactDiagnostics,
        };
        if (status === "available") {
          const content = await writeFilteredArtifactContent({
            runRoot,
            paperRef,
            artifact,
          });
          manifestEntry.content_file = content.content_file;
          manifestEntry.content_hash = content.content_hash;
          const removedHeading = (content as Record<string, unknown>)
            .removed_trailing_section_heading;
          if (removedHeading) {
            manifestEntry.removed_trailing_section_heading = removedHeading;
          }
          manifestEntry.diagnostics = [
            ...artifactDiagnostics,
            ...content.diagnostics,
          ];
        }
        manifestArtifacts.push(manifestEntry);
      }
      papers.push({
        paper_ref: paperRef,
        artifacts: manifestArtifacts,
        diagnostics: paperDiagnostics,
      });
    }
    const manifestRelativePath =
      "runtime/payloads/paper-artifacts-manifest.json";
    const manifest = {
      schema_id: "synthesis.filtered_paper_artifacts_manifest",
      schema_version: "1.0.0",
      exported_by: "paper_artifacts.export_filtered",
      exported_at: exportedAt,
      paper_refs: uniquePaperRefs,
      papers,
      diagnostics,
    };
    await writeRuntimeTextFile(
      joinPath(runRoot, manifestRelativePath),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    const artifact_statuses = papers.flatMap((paper) => {
      const paperRef = cleanString(paper.paper_ref);
      const entries = Array.isArray(paper.artifacts) ? paper.artifacts : [];
      return entries.filter(isObject).map((row) => ({
        paper_ref: paperRef,
        artifact_type: cleanString(row.artifact_type || row.artifactType),
        payload_type: cleanString(row.payload_type || row.payloadType),
        status: cleanString(row.status || "available"),
        missing_reason: cleanString(row.missing_reason || row.missingReason),
      }));
    });
    const response: Record<string, unknown> = {
      paper_refs: uniquePaperRefs,
      manifest_file: manifestRelativePath,
      artifact_statuses,
      diagnostics,
    };
    if (uniquePaperRefs.length === 1) {
      response.paper_ref = uniquePaperRefs[0];
    }
    return response;
  }

  async function resetSynthesisDatabase(
    args: Record<string, unknown> = {},
  ): Promise<{
    ok: boolean;
    status: "confirmation_mismatch" | "reset";
    deletedRowsByTable?: Record<string, number>;
    resetAt?: string;
  }> {
    const confirmationText =
      typeof args.confirmationText === "string" ? args.confirmationText : "";
    if (confirmationText !== SYNTHESIS_DATABASE_RESET_CONFIRMATION_TEXT) {
      return {
        ok: false,
        status: "confirmation_mismatch",
      };
    }
    const result = synthesisRepository.resetSynthesisState();
    clearPluginTaskRowEntries("synthesis-updates", "synthesis-update-events");
    clearPluginTaskRowEntries("synthesis-updates", "synthesis-update-state");
    return {
      ok: true,
      status: "reset",
      deletedRowsByTable: result.deletedRowsByTable,
      resetAt: result.resetAt,
    };
  }

  reconcileRuntimeWorkState();

  return {
    resetSynthesisDatabase,
    reconcileSynthesisRuntimeWorkStateOnStartup,
    applyLiteratureDigestSidecar,
    applyReferenceMatchingSidecar,
    debugSynthesisSnapshot,
    debugSynthesisCacheList,
    debugSynthesisOperationsList,
    debugSynthesisProfilerList,
    debugSynthesisPaperInspect,
    debugSynthesisTopicInspect,
    debugSynthesisDiff,
    debugSynthesisCleanInstallReset,
    applyTopicSynthesisResult,
    deleteTopicArtifact,
    listDeletedTopicArtifacts,
    purgeDeletedTopicArtifacts,
    getSynthesisBackgroundJobRows,
    getDebugSynthesisSnapshotInput,
    getSynthesisWorkbenchChromeInput,
    getSynthesisWorkbenchSurfaceInput,
    warmSynthesisWorkbenchSurfaces,
    getSynthesisSnapshot,
    consumeRelatedItemsSyncEcho,
    syncRelatedItemsNow,
    recomputeCitationGraphLayout,
    rejectTopicDiscoveryHint,
    restoreTopicDiscoveryHint,
    refreshMirror,
    rebuildMirrorFromCanonical,
    recoverCanonicalFromMirror,
    readTopicArtifact,
    readTopicDetail,
    getReviewInput,
    listTopics,
    listWorkflowTopicOptions,
    getTopicContext,
    getTopicReport,
    resolveTopicPaperDigest,
    getSchemas,
    queryConceptKb,
    queryCitationGraphCluster,
    getLibraryIndex,
    resolveResolver,
    getReferenceSidecarIndex,
    getCitationGraphSlice,
    getCitationGraphLayout,
    getCitationGraphMetrics,
    rankExternalReferences,
    rankLibraryPapers,
    getAttentionQueue,
    queryCitationGraph,
    getPaperArtifactManifest,
    readPaperArtifacts,
    exportFilteredPaperArtifacts,
    loadTagVocabulary,
    saveTagVocabulary,
    exportTagVocabularyCheckpoint,
    validateTagVocabulary,
    listStagedTagSuggestions,
    stageTagSuggestions,
    promoteStagedTagSuggestions,
    discardStagedTagSuggestions,
    clearStagedTagSuggestions,
    previewTagVocabularyImport,
    applyTagVocabularyImport,
    rebuildTagVocabularyIndex,
    exportTagVocabularyForRegulator,
    loadConceptKb,
    updateConceptDisplayText,
    applyConceptReviewAction,
    deleteConceptEntries,
    exportConceptKbCheckpoint,
    rebuildConceptKbIndex,
    loadTopicGraph,
    exportTopicGraphCheckpoint,
    rebuildTopicGraphIndex,
    acceptTopicGraphRelation,
    rejectTopicGraphRelation,
    applyTopicGraphReviewAction,
    previewSynthesisJsonImport,
    applySynthesisJsonImport,
    exportSynthesisCheckpoint,
    verifySynthesisCheckpoint,
    loadReferenceSidecarCacheStatus,
    refreshReferenceSidecarNow,
    retryReferenceSidecarRefresh,
    runAdvancedReferenceMatchingNow,
    retryAdvancedReferenceMatching,
    applyReferenceMatchProposalAction,
    applyReferenceMatchProposalActions,
    applyCanonicalRevisionReviewAction,
    mergeEffectiveCanonicalReference,
    applyCanonicalRevisionMergeRequests,
    updateCanonicalReferenceMetadata,
    archiveCanonicalReference,
    refreshCitationGraphCacheIncrementalNow,
    refreshCitationGraphMetricsNow,
    rebuildCitationGraphCacheNow,
    retryCitationGraphCacheRebuild,
    readCitationGraphSnapshot,
    loadGitSyncState,
    syncNow,
    pauseGitSync,
    resumeGitSync,
    retryGitSync,
    resolveGitSyncConflict,
    readGitSyncDiagnostics,
  };
}

export type SynthesisService = ReturnType<typeof createSynthesisService>;

export function createZoteroSynthesisMirrorAdapter(): SynthesisMirrorAdapter {
  function resolveZotero() {
    const zotero = (globalThis as { Zotero?: any }).Zotero;
    if (!zotero) {
      throw new Error("Zotero runtime is unavailable for synthesis mirror");
    }
    return zotero;
  }

  function prefKey(libraryId: number) {
    return `extensions.zotero.zotero-skills.synthesis.anchorKey.${libraryId}`;
  }

  function getAnchorByKey(libraryId: number, key: string) {
    const zotero = resolveZotero();
    return key
      ? zotero.Items?.getByLibraryAndKey?.(libraryId, key) || null
      : null;
  }

  function childNotes(anchor: any) {
    const zotero = resolveZotero();
    const ids = typeof anchor?.getNotes === "function" ? anchor.getNotes() : [];
    return (ids || [])
      .map((id: number) => zotero.Items?.get?.(id))
      .filter(Boolean);
  }

  function decodedManagedShard(note: any) {
    try {
      const decoded = decodeNoteShard(note?.getNote?.() || "");
      return decoded.envelope.anchor_key === cleanString(note?.parentKey || "")
        ? decoded
        : decoded;
    } catch {
      return null;
    }
  }

  function shardIdentityMatches(
    note: any,
    args: {
      libraryId: number;
      anchorKey: string;
      kind: ShardKind;
      assetId: string;
      seq: number;
      total: number;
    },
  ) {
    const decoded = decodedManagedShard(note);
    return Boolean(
      decoded &&
      decoded.envelope.library_id === args.libraryId &&
      decoded.envelope.anchor_key === args.anchorKey &&
      decoded.envelope.kind === args.kind &&
      decoded.envelope.asset_id === args.assetId &&
      decoded.envelope.seq === args.seq &&
      decoded.envelope.total === args.total,
    );
  }

  return {
    async ensureAnchor(args) {
      const zotero = resolveZotero();
      const key = cleanString(
        zotero.Prefs?.get?.(prefKey(args.libraryId), true),
      );
      const existing = getAnchorByKey(args.libraryId, key);
      if (existing) {
        return { anchorKey: existing.key };
      }
      const anchor = new zotero.Item("document");
      anchor.libraryID = args.libraryId;
      const titleField = "title";
      anchor.setField?.(titleField, args.title);
      anchor.setField?.("extra", `Synthesis root: ${args.root}`);
      await anchor.saveTx();
      zotero.Prefs?.set?.(prefKey(args.libraryId), anchor.key, true);
      return { anchorKey: anchor.key };
    },
    async upsertShard(args) {
      const zotero = resolveZotero();
      const anchor = getAnchorByKey(args.libraryId, args.anchorKey);
      if (!anchor) {
        throw new Error(`Synthesis mirror anchor not found: ${args.anchorKey}`);
      }
      let note = childNotes(anchor).find((entry: any) =>
        shardIdentityMatches(entry, args),
      );
      if (!note) {
        note = new zotero.Item("note");
        note.libraryID = args.libraryId;
        note.parentItemID = anchor.id;
      }
      note.setNote(args.html);
      await note.saveTx();
      return { noteKey: note.key };
    },
    async deleteShardsNotIn(args) {
      const zotero = resolveZotero();
      const anchor = getAnchorByKey(args.libraryId, args.anchorKey);
      if (!anchor) {
        return;
      }
      const keep = new Set(args.keepNoteKeys);
      const removals = childNotes(anchor)
        .filter((note: any) => Boolean(decodedManagedShard(note)))
        .filter((note: any) => !keep.has(cleanString(note.key)))
        .map((note: any) => Number(note.id || 0))
        .filter(Boolean);
      if (removals.length && typeof zotero.Items?.trashTx === "function") {
        await zotero.Items.trashTx(removals);
      }
    },
    async listShards(args) {
      const anchor = getAnchorByKey(args.libraryId, args.anchorKey);
      if (!anchor) {
        return [];
      }
      return childNotes(anchor)
        .map((note: any): DecodedMirrorShardSummary | null => {
          try {
            const decoded = decodeNoteShard(note.getNote?.() || "");
            return {
              library_id: decoded.envelope.library_id,
              mirror_id: decoded.envelope.mirror_id,
              kind: decoded.envelope.kind,
              seq: decoded.envelope.seq,
              total: decoded.envelope.total,
              note_key: cleanString(note.key),
              title: `ZS Synthesis Mirror ${decoded.envelope.asset_id || decoded.envelope.kind}`,
              asset_id: decoded.envelope.asset_id,
              asset_path: decoded.envelope.asset_path,
              content_type: decoded.envelope.content_type,
              payload_hash: decoded.envelope.payload_hash,
              encoded_hash: decoded.envelope.encoded_hash,
              payload: decoded.payload,
            };
          } catch {
            return null;
          }
        })
        .filter(
          (
            entry: DecodedMirrorShardSummary | null,
          ): entry is DecodedMirrorShardSummary => Boolean(entry),
        );
    },
  };
}

export function getDefaultSynthesisService() {
  if (defaultService) {
    return defaultService;
  }
  const zotero = (globalThis as { Zotero?: any }).Zotero;
  const libraryId = normalizeLibraryId(zotero?.Libraries?.userLibraryID) || 1;
  const paths = getRuntimePersistencePaths();
  defaultService = createSynthesisService({
    root: paths.dataDir,
    runtimeRoot: paths.root,
    libraryId,
    libraryAdapter: createZoteroSynthesisLibraryAdapter({ libraryId }),
  });
  return defaultService;
}

export function resetDefaultSynthesisServiceForTests() {
  defaultService = null;
}

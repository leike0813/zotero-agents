import { joinPath } from "../../utils/path";
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
  computeCitationGraphMetrics,
  computeCitationGraphLayout,
  type CitationGraph,
  type CitationGraphEdge,
  type CitationGraphLibraryNodeMetrics,
  type CitationGraphMetrics,
  type CitationGraphNode,
  type CitationGraphLayout,
  type CitationGraphPaperInput,
  type CitationLayoutPreset,
} from "./citationGraph";
import {
  buildCitationGraphInputsFromRegistryInputs,
  buildLibraryIndexFromRegistryInputs,
  createZoteroSynthesisLibraryAdapter,
  readArtifactsFromRegistryInputs,
  type SynthesisLibraryAdapter,
} from "./libraryAdapter";
import { resolveDigestRepresentativeImageForUi } from "./digestRepresentativeImage";
import {
  buildPaperRegistryMetadataFingerprintPayload,
  buildPaperRegistryRows,
  type PaperRegistryFacets,
  type PaperRegistryInput,
  type PaperRegistryRow,
  type RegistryArtifactType,
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
  type SynthesisUiCleanupProposalRow,
  type SynthesisUiSnapshot,
  type SynthesisUiSnapshotInput,
  type SynthesisUiState,
  type SynthesisUiArtifactRow,
  type SynthesisUiBackgroundJobRow,
  type SynthesisUiTopicUpdateIntent,
} from "./uiModel";
import { createSynthesisTagVocabularyService } from "./tagVocabulary";
import { createSynthesisConceptKbService } from "./conceptKb";
import {
  createSynthesisTopicGraphService,
  type SynthesisTopicGraphNode,
} from "./topicGraph";
import {
  createSynthesisLiteratureRegistryService,
  type LiteratureRegistryCleanupAction,
  type LiteratureRegistryCleanupProposalRecord,
  type LiteratureRegistryPaperRecord,
  type LiteratureRegistryReferenceInstanceRecord,
  type LiteratureRegistryReferenceResolutionRecord,
  type LiteratureRegistryWorkRecord,
} from "./literatureRegistry";
import { createSynthesisJsonImportService } from "./jsonImport";
import { createSynthesisCheckpointExportService } from "./checkpointExport";
import { maybeStartSynthesisJobProfileRun } from "./jobProfiler";
import {
  createSynthesisRepository,
  SYNTHESIS_REPOSITORY_TABLES,
  type SynthesisCitationComplexMetricsRecord,
  type SynthesisCitationEdgeRecord,
  type SynthesisCitationLayoutRecord,
  type SynthesisCitationLightMetricsRecord,
  type SynthesisCitationNodeRecord,
  type SynthesisIndexReferenceFact,
  type SynthesisJobProgressRecord,
  type SynthesisPaperRegistryFact,
  type SynthesisRepository,
  type SynthesisTopicDiscoveryHintRecord,
  type SynthesisTopicInterestMetadataRecord,
  type SynthesisZoteroBindingRecord,
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
  createSynthesisUpdateEventStore,
  type SynthesisUpdateDiagnostic,
  type SynthesisUpdateEvent,
  type SynthesisUpdateEventType,
  type SynthesisUpdateScopeKind,
} from "./updateEvents";
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
  renderTopicMarkdownExport,
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
  scope: "paper-registry" | "citation-graph" | "citation-graph-metrics";
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

type CitationGraphMetricsSortBy =
  | "foundation"
  | "frontier"
  | "pagerank"
  | "in_degree";

export type SynthesisLiteratureJobQueueState =
  | "ready"
  | "queued"
  | "running"
  | "stale"
  | "missing"
  | "failed_retryable"
  | "failed_permanent";

export type SynthesisLiteratureJobDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type SynthesisLiteratureJobState = {
  schema_id: "synthesis.literature_registry_job_state";
  schema_version: "1.0.0";
  queue_state: SynthesisLiteratureJobQueueState;
  source_hash: string;
  canonical_manifest_hash?: string;
  projection_manifest_hash?: string;
  projection_hash?: string;
  retry_attempt?: number;
  next_retry_at?: string;
  last_retry_at?: string;
  last_run_at?: string;
  last_run_status?: "success" | "failed_retryable" | "failed_permanent";
  diagnostics: SynthesisLiteratureJobDiagnostic[];
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
  registryInputs?: PaperRegistryInput[];
  citationGraphPapers?: CitationGraphPaperInput[];
  gitSyncAdapter?: SynthesisGitSyncAdapter;
  gitSyncCommandRunner?: SynthesisGitCommandRunner;
  gitSyncDebounceMs?: number;
  gitSyncRetryDelaysMs?: number[];
  gitSyncAutoRetryEnabled?: boolean;
  literatureJobDebounceMs?: number;
  literatureJobRetryDelaysMs?: number[];
  synthesisUpdateRetryDelaysMs?: number[];
  synthesisRepository?: SynthesisRepository;
  shardSize?: number;
  writeLock?: LibraryWriteLock;
};

type TopicIndexRow = {
  topic_id: string;
  path_id: string;
  title: string;
  updated_at: string;
  markdown_hash: string;
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
  description: string;
  aliases: string[];
  updated_at: string;
  status?: "active" | "archived" | "deleted";
};

type DeletedTopicArtifactRow = {
  topic_id: string;
  path_id: string;
  deleted_path_id: string;
  title: string;
  deleted_at: string;
  updated_at: string;
  markdown_hash: string;
  metadata_hash: string;
  bundle_hash: string;
};

type TopicArtifactMetadata = {
  topic_id: string;
  title: string;
  mode: SynthesisResultBundle["mode"];
  markdown_hash: string;
  bundle_hash: string;
  timeline: SynthesisResultBundle["timeline"];
  artifact_metadata: Record<string, unknown>;
  updated_at: string;
  operation?: string;
  language?: string;
  manifest_hash?: string;
  structured_hash?: string;
  artifact_hash?: string;
  export_hash?: string;
  section_hashes?: Record<string, string>;
  paper_count?: number;
  external_literature_count?: number;
  coverage_summary?: Record<string, unknown>;
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

type TopicDiscoveryStatus = "none" | "candidates" | "filtered" | "unknown";

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
    Record<RegistryArtifactType, TopicArtifactDependency>
  >;
  missing_artifacts: string[];
  graph_hash: string;
  markdown_hash: string;
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
  resolution_status: string;
  confidence?: string;
  target_literature_item_id?: string;
  target_title?: string;
  target_paper_ref?: string;
  target_binding: "library" | "external" | "none";
};

type RegistryUiRow = {
  paper_ref: string;
  title: string;
  year?: string;
  readiness: "ready" | "partial";
  coverage: "complete" | "partial" | "missing";
  missing_artifacts: string[];
  literature_status?:
    | "all"
    | "library"
    | "reference-only"
    | "matched"
    | "ambiguous"
    | "unresolved"
    | "needs-cleanup"
    | "stale";
  stale?: boolean;
  cleanup_count?: number;
  index_scope?: "library" | "referenced";
  literature_item_id?: string;
  reference_count?: number;
  unresolved_reference_count?: number;
  referenced_by_count?: number;
  references?: RegistryReferenceUiRow[];
};

const REGISTRY_ARTIFACT_TYPES: RegistryArtifactType[] = [
  "digest",
  "references",
  "citation_analysis",
];
const REGISTRY_ARTIFACT_PAYLOAD_TYPES: Record<RegistryArtifactType, string> = {
  digest: "digest-markdown",
  references: "references-json",
  citation_analysis: "citation-analysis-json",
};
const LIBRARY_INDEX_PAGE_LIMIT_DEFAULT = 100;
const LIBRARY_INDEX_PAGE_LIMIT_MAX = 250;
const SYNTHESIS_REGISTRY_PAGE_LIMIT_DEFAULT = 100;
const SYNTHESIS_REGISTRY_PAGE_LIMIT_MAX = 250;
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

function parseStringArray(value: unknown): string[] {
  return parseJsonArray(value).map(cleanString).filter(Boolean);
}

const LITERATURE_MATCHING_METADATA_PAYLOAD_TYPE =
  "literature-matching-metadata-json";
const LITERATURE_MATCHING_METADATA_SCHEMA = "literature_matching_metadata.v1";

function zoteroPaperLiteratureItemId(paperRef: string) {
  return `lit:${hashCanonicalJson({
    kind: "zotero-paper",
    ref: paperRef,
  }).slice("sha256:".length, "sha256:".length + 24)}`;
}

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

function literatureMatchingMetadataPayloadFromInput(input: PaperRegistryInput) {
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

function paperRegistryMissingDiagnostic(type: RegistryArtifactType) {
  return {
    code: "payload_missing" as const,
    artifact_type: type,
    message:
      type === "citation_analysis"
        ? "citation analysis payload is missing"
        : `${type} payload is missing`,
  };
}

function paperRegistryFacet(
  value: unknown,
  status: PaperRegistryFacets[keyof PaperRegistryFacets]["status"],
  updatedAt?: string,
) {
  return {
    hash: hashCanonicalJson(value),
    status,
    updated_at: cleanString(updatedAt) || undefined,
  };
}

function paperRegistryArtifactFromFact(
  type: RegistryArtifactType,
  fact: SynthesisPaperRegistryFact,
): PaperRegistryRow["artifacts"][RegistryArtifactType] {
  const state = fact.artifacts.find((entry) => entry.artifactType === type);
  const diagnostics = parseJsonArray(state?.diagnosticsJson);
  const status =
    state?.status === "available" || state?.status === "invalid"
      ? state.status
      : "missing";
  return {
    type,
    payload_type: REGISTRY_ARTIFACT_PAYLOAD_TYPES[type],
    status,
    note_key: cleanString(state?.noteKey) || undefined,
    hash: cleanString(state?.payloadHash) || undefined,
    updated_at: cleanString(state?.updatedAt) || undefined,
    diagnostics:
      diagnostics.length || status !== "missing"
        ? (diagnostics as PaperRegistryRow["diagnostics"])
        : [paperRegistryMissingDiagnostic(type)],
  };
}

function identifierValue(
  fact: SynthesisPaperRegistryFact,
  kind: string,
): string {
  const row = fact.identifiers.find((entry) => entry.kind === kind);
  return cleanString(row?.displayValue) || cleanString(row?.normalizedValue);
}

function paperRegistryRowFromFact(
  fact: SynthesisPaperRegistryFact,
): PaperRegistryRow {
  const artifacts = {
    digest: paperRegistryArtifactFromFact("digest", fact),
    references: paperRegistryArtifactFromFact("references", fact),
    citation_analysis: paperRegistryArtifactFromFact("citation_analysis", fact),
  };
  const statuses = Object.values(artifacts).map((entry) => entry.status);
  const available = statuses.filter((entry) => entry === "available").length;
  const readiness =
    available === statuses.length ? ("ready" as const) : ("partial" as const);
  const coverage =
    available === statuses.length
      ? ("complete" as const)
      : available === 0
        ? ("missing" as const)
        : ("partial" as const);
  const tags = parseJsonArray(fact.tagsJson).map(cleanString).filter(Boolean);
  const collections = parseJsonArray(fact.collectionsJson)
    .map(cleanString)
    .filter(Boolean);
  const creators = parseJsonArray(fact.authorsJson)
    .map(cleanString)
    .filter(Boolean);
  const paperRef = `${fact.libraryId}:${fact.itemKey}`;
  const artifactUpdatedAt = Object.values(artifacts)
    .map((entry) => cleanString(entry.updated_at))
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0];
  const rowWithoutHash = {
    paper_ref: paperRef,
    library_id: fact.libraryId,
    item_key: fact.itemKey,
    title: cleanString(fact.displayTitle),
    year: cleanString(fact.year),
    item_type: cleanString(fact.itemType),
    tags,
    collections,
    artifacts,
    readiness,
    coverage,
    diagnostics: Object.values(artifacts).flatMap(
      (entry) => entry.diagnostics || [],
    ),
    facets: {
      identity: paperRegistryFacet(
        {
          library_id: fact.libraryId,
          item_key: fact.itemKey,
          paper_ref: paperRef,
          citekey: identifierValue(fact, "citekey"),
          date_added: cleanString(fact.dateAdded),
        },
        "ready",
        fact.dateAdded,
      ),
      metadata: paperRegistryFacet(
        {
          title: cleanString(fact.displayTitle),
          year: cleanString(fact.year),
          item_type: cleanString(fact.itemType),
          creators,
          tags,
          collections,
          doi: identifierValue(fact, "doi"),
          arxiv: identifierValue(fact, "arxiv"),
          url: identifierValue(fact, "url"),
        },
        "ready",
      ),
      artifact: paperRegistryFacet(
        Object.fromEntries(
          Object.entries(artifacts).map(([type, artifact]) => [
            type,
            {
              status: artifact.status,
              hash: cleanString(artifact.hash),
              payload_type: artifact.payload_type,
              note_key: cleanString(artifact.note_key),
            },
          ]),
        ),
        coverage === "complete" ? "ready" : coverage,
        artifactUpdatedAt,
      ),
      reference: paperRegistryFacet(
        {
          references_status: artifacts.references.status,
          references_hash: cleanString(artifacts.references.hash),
          citation_analysis_status: artifacts.citation_analysis.status,
          citation_analysis_hash: cleanString(artifacts.citation_analysis.hash),
        },
        artifacts.references.status === "available" ? "ready" : "missing",
        [
          artifacts.references.updated_at,
          artifacts.citation_analysis.updated_at,
        ]
          .map(cleanString)
          .filter(Boolean)
          .sort((left, right) => right.localeCompare(left))[0],
      ),
      readiness: paperRegistryFacet(
        {
          readiness,
          coverage,
          missing_artifacts: Object.entries(artifacts)
            .filter(([, artifact]) => artifact.status !== "available")
            .map(([type]) => type)
            .sort(),
        },
        readiness,
      ),
      topic_usage: paperRegistryFacet({ topic_ids: [] }, "unknown"),
    },
  };
  return {
    ...rowWithoutHash,
    row_hash: hashCanonicalJson(rowWithoutHash),
  };
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

function descriptionFromDefinition(definition: Record<string, unknown>) {
  return cleanString(definition.description);
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

function topicIndexRowFromGraphNode(
  node: SynthesisTopicGraphNode,
): TopicIndexRow {
  const topicId = cleanString(node.topic_id);
  return {
    topic_id: topicId,
    path_id: topicPathId(topicId),
    title: cleanString(node.title) || topicId,
    updated_at:
      cleanString(node.last_synthesis_at) ||
      cleanString(node.updated_at) ||
      cleanString(node.created_at),
    markdown_hash: "",
    metadata_hash: "",
    bundle_hash: "",
    paper_count: Math.max(0, Math.floor(Number(node.paper_count) || 0)),
  };
}

function topicArtifactRowsFromGraphNodes(args: {
  nodes: SynthesisTopicGraphNode[];
  artifactState: Record<string, TopicArtifactStateRow>;
  definitions: Record<string, Record<string, unknown>>;
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
        kind: "topic_synthesis" as const,
        coverage,
        freshness,
        updated_at: row.updated_at,
        markdown_preview: (stateRow?.reasons || [])
          .map((entry) => entry.code)
          .join(", "),
        paper_count: row.paper_count ?? paperCountFromTopicState(stateRow),
        summary: summaryFromTopicDefinition(
          args.definitions[row.topic_id],
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

function topicInventoryRowsFromGraphNodes(args: {
  nodes: SynthesisTopicGraphNode[];
  definitions: Record<string, Record<string, unknown>>;
}): TopicInventoryRow[] {
  return args.nodes
    .map((node) => {
      const topicId = cleanString(node.topic_id);
      if (!topicId) {
        return null;
      }
      const definition = args.definitions[topicId] || {};
      const status =
        statusFromDefinition(definition) || statusFromTopicGraphNode(node);
      const definitionAliases = aliasesFromDefinition(definition);
      return {
        topic_id: topicId,
        title: titleFromDefinition(
          definition,
          cleanString(node.title) || topicId,
        ),
        description: descriptionFromDefinition(definition),
        aliases: definitionAliases.length
          ? definitionAliases
          : aliasesFromTopicGraphNode(node),
        updated_at:
          cleanString(definition.updated_at) ||
          cleanString(node.last_synthesis_at) ||
          cleanString(node.updated_at) ||
          "",
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
    cleanString(bundle.artifact_metadata.topic_id);
  if (!topicId) {
    throw new Error("topic synthesis bundle requires topic_definition.id");
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

async function currentHashes(root: string, topicId: string) {
  const paths = buildSynthesisStoragePaths(root, topicPathId(topicId));
  const result: Record<string, string> = {
    manifest: await fileHash(paths.currentManifest),
    artifact: await fileHash(paths.currentArtifact),
    export: await fileHash(paths.currentExportMarkdown),
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

function registryRowsForInputs(inputs: PaperRegistryInput[] | undefined) {
  return buildPaperRegistryRows(inputs || []);
}

function registryRowFromCanonicalPaper(
  paper: LiteratureRegistryPaperRecord,
): PaperRegistryRow {
  const facets: PaperRegistryFacets = paper.facets || {
    identity: {
      hash: hashCanonicalJson({
        paper_ref: paper.paper_ref,
        library_id: paper.library_id,
        item_key: paper.item_key,
      }),
      status: "ready",
    },
    metadata: { hash: hashCanonicalJson(paper.title), status: "ready" },
    artifact: {
      hash: hashCanonicalJson(paper.artifacts || {}),
      status: paper.coverage === "complete" ? "ready" : paper.coverage,
    },
    reference: {
      hash: hashCanonicalJson(paper.artifacts?.references || {}),
      status:
        paper.artifacts?.references?.status === "available"
          ? "ready"
          : "missing",
    },
    readiness: {
      hash: hashCanonicalJson({
        readiness: paper.readiness,
        coverage: paper.coverage,
      }),
      status: paper.readiness,
    },
    topic_usage: {
      hash: hashCanonicalJson({ topic_ids: [] }),
      status: "unknown",
    },
  };
  return {
    paper_ref: paper.paper_ref,
    library_id: paper.library_id,
    item_key: paper.item_key,
    title: paper.title,
    year: paper.year || "",
    item_type: paper.item_type || "",
    tags: [...(paper.tags || [])],
    collections: [...(paper.collections || [])],
    artifacts: paper.artifacts || ({} as PaperRegistryRow["artifacts"]),
    readiness: paper.readiness,
    coverage: paper.coverage,
    diagnostics: [],
    facets,
    row_hash: paper.row_hash,
  };
}

function registryMetadataFingerprintFromInput(input: PaperRegistryInput) {
  const library = normalizeLibraryId(input.libraryId);
  const itemKey = cleanString(input.itemKey);
  const metadata = buildPaperRegistryMetadataFingerprintPayload(input);
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
    layoutStatus?: "missing" | "ready" | "dirty" | "running" | "failed";
  } = {},
) {
  const coordinates = args.layout?.nodes || {};
  const graphWithHover = graph as CitationGraph & {
    hover_only_nodes?: CitationGraphNode[];
    hover_only_edges?: CitationGraphEdge[];
  };
  const mapNode = (node: CitationGraphNode) => ({
    id: node.node_id,
    label: cleanString(node.title) || node.node_id,
    kind: node.kind,
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
        : node.kind === "library_paper"
          ? ("library" as const)
          : ("shared_external" as const),
  });
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

function normalizeCitationLayoutPreset(value: unknown): CitationLayoutPreset {
  const preset = cleanString(value);
  return preset === "compact" || preset === "expanded" ? preset : "balanced";
}

function citationGraphLayoutStatus(args: {
  graph: CitationGraph;
  record: SynthesisCitationLayoutRecord | null | undefined;
  layout: CitationGraphLayout | null;
}): "missing" | "ready" | "dirty" | "running" | "failed" {
  if (!args.graph.nodes.length) {
    return "missing";
  }
  if (!args.record) {
    return "missing";
  }
  if (args.record.status === "running") {
    return "running";
  }
  if (args.record.status === "failed") {
    return "failed";
  }
  if (!args.layout) {
    return "missing";
  }
  if (
    args.record.status === "ready" &&
    args.record.graphHash === args.graph.graph_hash &&
    args.layout.graph_hash === args.graph.graph_hash
  ) {
    return "ready";
  }
  return "dirty";
}

async function readPersistedGraphProjection(
  root: string,
  preset: CitationLayoutPreset,
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
      layouts?: Partial<Record<CitationLayoutPreset, CitationGraphLayout>>;
    }>
  >(paths.unifiedCitationLayouts).catch(() => null);
  const layout = layoutEnvelope?.data?.layouts?.[preset] || null;
  const layoutStatus =
    layout && layout.graph_hash === graph.graph_hash
      ? ("ready" as const)
      : ("dirty" as const);
  return { graph, layout, layoutStatus };
}

async function readProjectionCitationGraph(
  root: string,
  preset: CitationLayoutPreset,
) {
  const paths = buildSynthesisKnowledgeGraphPaths(root);
  const projection = await readJson<{
    graph?: CitationGraph;
    layouts?: Partial<Record<CitationLayoutPreset, CitationGraphLayout>>;
    layout_layers?: Partial<
      Record<
        CitationLayoutPreset,
        {
          status?: string;
          source_graph_hash?: string;
          source_complex_metrics_hash?: string;
          diagnostics?: unknown[];
        }
      >
    >;
    metric_layers?: {
      complex?: {
        status?: string;
        source_graph_hash?: string;
        metrics_hash?: string;
      };
    };
    source_manifest_hash?: string;
    diagnostics?: unknown[];
  }>(joinPath(paths.stateRoot, "citation-graph-index.json")).catch(() => null);
  const graph = projection?.graph || null;
  if (!graph) {
    return { graph: null, layout: null, layoutStatus: "missing" as const };
  }
  const layout = projection?.layouts?.[preset] || null;
  const layer = projection?.layout_layers?.[preset];
  const complex = projection?.metric_layers?.complex;
  const complexReady =
    !layer?.source_complex_metrics_hash ||
    (complex?.status === "ready" &&
      complex.source_graph_hash === graph.graph_hash &&
      complex.metrics_hash === layer.source_complex_metrics_hash);
  const layoutStatus = !layout
    ? ("missing" as const)
    : layer?.status === "running"
      ? ("running" as const)
      : layer?.status === "failed_retryable" ||
          layer?.status === "failed_permanent"
        ? ("failed" as const)
        : layer?.status === "ready" &&
            layer.source_graph_hash === graph.graph_hash &&
            layout.graph_hash === graph.graph_hash &&
            complexReady
          ? ("ready" as const)
          : ("dirty" as const);
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

function shouldPreferLegacyCitationGraph(args: {
  projectionGraph: CitationGraph | null | undefined;
  legacyGraph: CitationGraph | null | undefined;
}) {
  return (
    citationGraphHasContent(args.legacyGraph) &&
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

function citationGraphNodeIdFromDb(
  node: Pick<SynthesisCitationNodeRecord, "literatureItemId">,
  binding?: SynthesisZoteroBindingRecord,
) {
  return binding?.itemKey
    ? `zotero:item:${binding.itemKey}`
    : node.literatureItemId;
}

function dbCitationNodeKind(
  node: SynthesisCitationNodeRecord,
): CitationGraphNode["kind"] {
  return node.hasZoteroBinding ? "library_paper" : "external_reference";
}

function dbCitationNodeToGraphNode(args: {
  node: SynthesisCitationNodeRecord;
  binding?: SynthesisZoteroBindingRecord;
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
    item_key: args.binding?.itemKey,
    library_id: args.binding?.libraryId,
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

function registryRowsToUi(
  rows: PaperRegistryRow[],
  cleanupProposals: Array<{ source_paper_ref?: string; status?: string }> = [],
  projectionStale = false,
) {
  const cleanupByPaper = new Map<string, number>();
  for (const proposal of cleanupProposals) {
    if (proposal.status && proposal.status !== "open") {
      continue;
    }
    const paperRef = cleanString(proposal.source_paper_ref);
    if (paperRef) {
      cleanupByPaper.set(paperRef, (cleanupByPaper.get(paperRef) || 0) + 1);
    }
  }
  return rows.map((row) => ({
    paper_ref: row.paper_ref,
    title: row.title,
    year: row.year,
    readiness: row.readiness,
    coverage: row.coverage,
    missing_artifacts: Object.values(row.artifacts)
      .filter((artifact) => artifact.status !== "available")
      .map((artifact) => artifact.type),
    literature_status: cleanupByPaper.get(row.paper_ref)
      ? ("needs-cleanup" as const)
      : ("library" as const),
    stale: projectionStale,
    cleanup_count: cleanupByPaper.get(row.paper_ref) || 0,
    index_scope: "library" as const,
  }));
}

function referenceFactToUiRow(
  reference: SynthesisIndexReferenceFact,
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
    resolution_status: cleanString(reference.resolutionStatus) || "unresolved",
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
  };
}

function registryFactsToUiRows(args: {
  facts: SynthesisPaperRegistryFact[];
  references: SynthesisIndexReferenceFact[];
  cleanupProposals?: Array<{ source_paper_ref?: string; status?: string }>;
  projectionStale?: boolean;
}): RegistryUiRow[] {
  const cleanupByPaper = new Map<string, number>();
  for (const proposal of args.cleanupProposals || []) {
    if (proposal.status && proposal.status !== "open") {
      continue;
    }
    const paperRef = cleanString(proposal.source_paper_ref);
    if (paperRef) {
      cleanupByPaper.set(paperRef, (cleanupByPaper.get(paperRef) || 0) + 1);
    }
  }
  const referencesBySource = new Map<string, SynthesisIndexReferenceFact[]>();
  for (const reference of args.references) {
    const bucket =
      referencesBySource.get(reference.sourceLiteratureItemId) || [];
    bucket.push(reference);
    referencesBySource.set(reference.sourceLiteratureItemId, bucket);
  }
  const libraryRows = args.facts.map((fact): RegistryUiRow => {
    const row = paperRegistryRowFromFact(fact);
    const references = referencesBySource.get(fact.literatureItemId) || [];
    const unresolved = references.filter(
      (reference) =>
        !reference.targetLiteratureItemId ||
        reference.resolutionStatus === "unresolved",
    ).length;
    return {
      ...registryRowsToUi(
        [row],
        args.cleanupProposals,
        args.projectionStale,
      )[0],
      literature_item_id: fact.literatureItemId,
      reference_count: references.length,
      unresolved_reference_count: unresolved,
      references: references.map(referenceFactToUiRow),
      cleanup_count: cleanupByPaper.get(row.paper_ref) || 0,
      index_scope: "library",
    };
  });

  const factByLiteratureItem = new Map(
    args.facts.map((fact) => [fact.literatureItemId, fact]),
  );
  const referencedByTarget = new Map<string, SynthesisIndexReferenceFact[]>();
  const unresolvedRows: RegistryUiRow[] = [];
  for (const reference of args.references) {
    const targetId = cleanString(reference.targetLiteratureItemId);
    if (!targetId) {
      unresolvedRows.push({
        paper_ref: reference.referenceInstanceId,
        title:
          cleanString(reference.title) ||
          cleanString(reference.rawReference) ||
          reference.referenceInstanceId,
        year: cleanString(reference.year) || undefined,
        readiness: "partial",
        coverage: "missing",
        missing_artifacts: [],
        literature_status: "unresolved",
        index_scope: "referenced",
        referenced_by_count: 1,
        references: [referenceFactToUiRow(reference)],
      });
      continue;
    }
    const bucket = referencedByTarget.get(targetId) || [];
    bucket.push(reference);
    referencedByTarget.set(targetId, bucket);
  }

  const referencedRows = Array.from(referencedByTarget.entries())
    .map(([literatureItemId, references]): RegistryUiRow => {
      const fact = factByLiteratureItem.get(literatureItemId);
      const first = references[0];
      const paperRef =
        cleanString(first.targetPaperRef) || cleanString(literatureItemId);
      return {
        paper_ref: paperRef,
        title:
          cleanString(first.targetTitle) ||
          cleanString(first.title) ||
          cleanString(first.rawReference) ||
          paperRef,
        year:
          cleanString(first.targetYear) ||
          cleanString(first.year) ||
          cleanString(fact?.year) ||
          undefined,
        readiness: "partial",
        coverage: fact ? "partial" : "missing",
        missing_artifacts: [],
        literature_status: first.targetHasZoteroBinding
          ? "matched"
          : "reference-only",
        index_scope: "referenced",
        literature_item_id: literatureItemId,
        referenced_by_count: references.length,
        references: references.map(referenceFactToUiRow),
      };
    })
    .filter(
      (row) => !factByLiteratureItem.has(cleanString(row.literature_item_id)),
    );

  return [...libraryRows, ...referencedRows, ...unresolvedRows];
}

type EnrichedCleanupProposal = LiteratureRegistryCleanupProposalRecord & {
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
  status:
    | EnrichedCleanupProposal["status"]
    | "blocked_by_upstream_review"
    | "superseded"
    | "retargeted";
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
        review.reviewKind === "zotero_dedupe_candidate",
    )
    .map((review) => {
      const payload = parseReviewPayload(review.payloadJson);
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

function enrichCleanupProposals(args: {
  proposals: LiteratureRegistryCleanupProposalRecord[];
  papers?: LiteratureRegistryPaperRecord[];
  references?: LiteratureRegistryReferenceInstanceRecord[];
  resolutions?: LiteratureRegistryReferenceResolutionRecord[];
  works?: LiteratureRegistryWorkRecord[];
}): EnrichedCleanupProposal[] {
  const papersByRef = new Map(
    (args.papers || []).map((paper) => [paper.paper_ref, paper]),
  );
  const referencesById = new Map(
    (args.references || []).map((reference) => [
      reference.reference_instance_id,
      reference,
    ]),
  );
  const resolutionsByReference = new Map(
    (args.resolutions || []).map((resolution) => [
      resolution.reference_instance_id,
      resolution,
    ]),
  );
  const worksById = new Map(
    (args.works || []).map((work) => [work.work_id, work]),
  );
  return args.proposals.map((proposal) => {
    const sourcePaper = papersByRef.get(proposal.source_paper_ref);
    const reference = proposal.reference_instance_id
      ? referencesById.get(proposal.reference_instance_id)
      : undefined;
    const resolution = proposal.reference_instance_id
      ? resolutionsByReference.get(proposal.reference_instance_id)
      : undefined;
    const targetPaper = resolution?.target_paper_ref
      ? papersByRef.get(resolution.target_paper_ref)
      : undefined;
    const targetWork = resolution?.target_work_id
      ? worksById.get(resolution.target_work_id)
      : undefined;
    const referenceLabel =
      cleanString(reference?.title) ||
      cleanString(reference?.raw) ||
      cleanString(proposal.provisional_key) ||
      "Unresolved reference";
    const sourceLabel =
      cleanString(sourcePaper?.title) ||
      cleanString(proposal.source_paper_ref) ||
      "source paper";
    return {
      ...proposal,
      source_paper_title: cleanString(sourcePaper?.title) || undefined,
      reference_title: cleanString(reference?.title) || undefined,
      reference_raw: cleanString(reference?.raw) || undefined,
      target_paper_ref: cleanString(resolution?.target_paper_ref) || undefined,
      target_paper_title: cleanString(targetPaper?.title) || undefined,
      target_work_id: cleanString(resolution?.target_work_id) || undefined,
      target_work_title: cleanString(targetWork?.title) || undefined,
      decision_summary:
        proposal.status === "open"
          ? `Review how to handle "${referenceLabel}" from "${sourceLabel}".`
          : `This cleanup proposal was marked ${proposal.status}.`,
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

function tagSet(row: PaperRegistryRow) {
  return new Set(row.tags.map((entry) => entry.toLowerCase()));
}

function tagMatches(row: PaperRegistryRow, query: unknown): boolean {
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
  row: PaperRegistryRow,
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
  row: PaperRegistryRow,
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
  rows: PaperRegistryRow[],
  rawResolver: unknown,
): Map<string, { row: PaperRegistryRow; reasons: string[] }> {
  const resolver =
    rawResolver && typeof rawResolver === "object"
      ? (rawResolver as Record<string, unknown>)
      : {};
  const mode = normalizeResolverMode(resolver);
  const result = new Map<
    string,
    { row: PaperRegistryRow; reasons: string[] }
  >();
  const add = (row: PaperRegistryRow, reason: string) => {
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
      { row: PaperRegistryRow; reasons: string[] }
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

function registryByPaperRef(rows: PaperRegistryRow[]) {
  return new Map(rows.map((row) => [row.paper_ref, row]));
}

function artifactDependencyForRow(
  row: PaperRegistryRow | undefined,
  type: RegistryArtifactType,
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
  registryRows: PaperRegistryRow[],
) {
  const byRef = registryByPaperRef(registryRows);
  const dependencies: Record<
    string,
    Record<RegistryArtifactType, TopicArtifactDependency>
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
    ) as Record<RegistryArtifactType, TopicArtifactDependency>;
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
      .map((entry) => cleanString(entry).split(":")[0])
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
    return ["claims", "paper_evidence", "timeline_events"];
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
    scope = changedSections.includes("external_literature_analysis")
      ? "external_literature"
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
    cleanString(definition.description) ||
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
  filtered: number;
}): TopicDiscoveryStatus {
  if (args.open > 0) {
    return "candidates";
  }
  if (args.filtered > 0) {
    return "filtered";
  }
  return "none";
}

function topicDiscoverySummaryFromHints(
  hints: SynthesisTopicDiscoveryHintRecord[],
) {
  const open = hints.filter((hint) => hint.status === "open").length;
  const filtered = hints.filter((hint) => hint.status === "filtered").length;
  return {
    discovery_status: topicDiscoveryStatusFromCounts({ open, filtered }),
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
  registryRows: PaperRegistryRow[];
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
  const markdownHash = await safeFileHash(
    paths.currentExportMarkdown,
    dirtyReasons,
    "missing_current_export",
  );
  const metadataHash = await safeFileHash(
    paths.currentMetadata,
    dirtyReasons,
    "missing_current_metadata",
  );
  if (markdownHash && args.row.markdown_hash !== markdownHash) {
    dirtyReasons.push(
      reason({
        code: "index_hash_mismatch",
        severity: "error",
        message:
          "Artifact index Markdown hash no longer matches current/export.md.",
      }),
    );
  }
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
    markdown_hash: markdownHash,
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
  registryRows: PaperRegistryRow[];
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
  const paths = buildSynthesisStoragePaths(root, topicPathId(topicId));
  const markdown = await readRuntimeTextFile(paths.currentExportMarkdown);
  const metadata = await readJson<CanonicalEnvelope<TopicArtifactMetadata>>(
    paths.currentMetadata,
  );
  const artifact = await readJson<Record<string, unknown>>(
    paths.currentArtifact,
  ).catch(() => null);
  const manifest = await readJson<Record<string, unknown>>(
    paths.currentManifest,
  ).catch(() => null);
  return { paths, markdown, metadata, artifact, manifest };
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
      {
        kind: "topic_current",
        assetId: `topic:${topicPath}:current-export`,
        assetPath: `topics/${topicPath}/current/export.md`,
        contentType: "markdown",
        path: topicPaths.currentExportMarkdown,
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
      fallbackPath: string;
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
      fallbackPath: pathValue,
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

async function readRunWorkspaceJsonWithFallbacks(
  context: ApplyContext | undefined,
  fieldName: string,
  rawPath: string,
  fallbackPaths: string[],
) {
  const paths = [
    rawPath,
    ...fallbackPaths.filter((entry) => entry && entry !== rawPath),
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

function legacyBundleSidecarPath(
  bundle: SynthesisResultBundle,
  key: keyof typeof MANIFEST_SIDECAR_KEYS,
) {
  switch (key) {
    case "topic_interest_metadata":
      return cleanString(bundle.topic_interest_metadata_path);
    case "concept_cards_proposal":
      return cleanString(bundle.concept_cards_proposal_path);
    case "topic_graph_relation_proposals":
      return cleanString(bundle.topic_graph_relation_proposals_path);
  }
}

function sidecarPathForApply(args: {
  manifest: Record<string, unknown>;
  bundle: SynthesisResultBundle;
  key: keyof typeof MANIFEST_SIDECAR_KEYS;
}) {
  return (
    manifestSidecarPath(args.manifest, args.key) ||
    legacyBundleSidecarPath(args.bundle, args.key) ||
    MANIFEST_SIDECAR_KEYS[args.key]
  );
}

function sectionNameFromPath(pathValue: string) {
  const name = cleanString(pathValue).split(/[\\/]/).pop() || "";
  return name.replace(/\.json$/i, "").replace(/-/g, "_");
}

function fallbackSectionsFromBundle(bundle: SynthesisResultBundle) {
  return {
    topic: {
      ...(isObject(bundle.topic_definition) ? bundle.topic_definition : {}),
      discipline:
        cleanString((bundle.topic_definition as any)?.discipline) || "unknown",
      research_field:
        cleanString((bundle.topic_definition as any)?.research_field) ||
        "unknown",
      scope_boundary: isObject((bundle.topic_definition as any)?.scope_boundary)
        ? (bundle.topic_definition as any).scope_boundary
        : { status: "unknown; legacy bundle lacks explicit scope boundary" },
    },
    summary: {
      brief:
        cleanString(bundle.artifact_metadata.summary) ||
        cleanString(bundle.artifact_metadata.description),
    },
    positioning: {
      importance: "",
      timeliness: "",
      scope_boundary: {},
      review_position: "",
    },
    taxonomy: {
      primary_axis: "legacy_bundle_route",
      axis_rationale:
        "Legacy bundle fallback cannot reconstruct full research routes; recreate the topic for a complete route analysis.",
      summary: {
        text: "Legacy fallback cannot reconstruct an integrated route landscape. Recreate or update the topic synthesis to obtain taxonomy.summary and substantive route nodes.",
        report_chapter_hint: "legacy degraded summary only",
      },
      nodes: [
        {
          id: "route:legacy-fallback",
          label: "Legacy fallback route",
          definition:
            "Degraded route placeholder materialized from a legacy bundle without section artifacts.",
          core_problem: "Original section-level route analysis is unavailable.",
          mechanism:
            "Unknown; rerun create/update topic synthesis for substantive route analysis.",
          representative_papers: ["legacy:unknown"],
          strengths: ["Preserves degraded topic materialization"],
          limitations: ["Not a substantive research-route analysis"],
          maturity: "unknown",
        },
      ],
    },
    comparison_matrix: {
      dimensions: [],
      rows: [],
    },
    claims: [],
    timeline_events: {
      summary: {
        text: "Legacy fallback cannot reconstruct historical progression. Recreate or update the topic synthesis to obtain timeline_events.summary and event-level analysis.",
        phases: [],
        milestone_event_refs: [],
        report_chapter_hint: "legacy degraded summary only",
      },
      events: Array.isArray(bundle.timeline) ? bundle.timeline : [],
    },
    paper_evidence: [],
    external_literature_analysis: {
      summary: "",
      themes: [
        {
          id: "theme:legacy-unknown",
          title: "Legacy fallback external literature status",
          analysis:
            "External literature analysis is unavailable in the legacy bundle.",
        },
      ],
      representative_references: [],
      citation_contexts: [],
      contribution_to_topic: "",
      limitations: "",
      coverage_verdict: "unknown",
      suggested_additions: [],
    },
    debates: [],
    coverage: {
      paper_count: Array.isArray((bundle.resolved_paper_set as any)?.papers)
        ? (bundle.resolved_paper_set as any).papers.length
        : 0,
      external_literature_count: 0,
    },
    gaps: [],
    review_outline: {
      introduction_logic: [],
      related_work_logic: [],
      body_sections: [],
    },
    statistics: {
      paper_count: Array.isArray((bundle.resolved_paper_set as any)?.papers)
        ? (bundle.resolved_paper_set as any).papers.length
        : 0,
      time_span: { start_year: "unknown", end_year: "unknown" },
      route_coverage: "unknown; legacy bundle lacks section artifacts",
      coverage_verdict: "unknown",
    },
    synthesis_report: {
      title:
        cleanString((bundle.topic_definition as any)?.title) ||
        "Legacy Topic Synthesis",
      source_section_chapters: {
        research_routes: "taxonomy.summary",
        historical_progression: "timeline_events.summary",
      },
      body: "This topic was materialized from a legacy topic_synthesis bundle that did not provide the complete section-level content contract. The stored report is therefore a degraded compatibility summary rather than a substantive synthesis report. Recreate or update this topic synthesis to obtain research-route analysis, timeline progression, argued claims, external literature coverage, statistics, and a continuous report suitable for Zotero reading and downstream literature review writing.",
    },
    evidence_map: {
      path: "",
      hash: "",
      candidate_counts: {},
      candidate_ids: [],
    },
    source_artifacts: [],
    diagnostics: { warnings: [], legacy_fallback: true },
  };
}

async function loadCompleteManifestAndSections(args: {
  bundle: SynthesisResultBundle;
  context?: ApplyContext;
}) {
  let manifest: Record<string, unknown>;
  let sections: Record<string, unknown>;
  if (args.context) {
    manifest = await readRunWorkspaceJson(
      args.context,
      "analysis_manifest_path",
      args.bundle.analysis_manifest_path || "",
    );
    const validation = validateTopicAnalysisManifest(manifest);
    if (!validation.ok) {
      throw new Error(
        `invalid topic analysis manifest: ${validation.errors.join("; ")}`,
      );
    }
    const manifestSections = isObject(manifest.sections)
      ? (manifest.sections as Record<string, unknown>)
      : {};
    sections = {};
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
  } else {
    sections = fallbackSectionsFromBundle(args.bundle);
    const manifestSections = Object.fromEntries(
      Object.entries(sections).map(([section, value]) => [
        section,
        {
          path: `result/sections/${canonicalSectionFileName(section)}`,
          hash: hashCanonicalJson(value),
          content_type: "json",
        },
      ]),
    );
    manifest = {
      schema_id: "synthesis.topic_analysis_manifest",
      schema_version: "2.0.0",
      operation: args.bundle.operation || "create",
      topic_id: topicIdFromBundle(args.bundle),
      language: args.bundle.language || "auto",
      sections: manifestSections,
      ...(args.bundle.markdown_path
        ? { markdown_path: args.bundle.markdown_path }
        : {}),
    };
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
  exportMarkdown: string;
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
    args.paths.currentExportMarkdown,
    args.exportMarkdown,
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
  return Array.isArray(artifact.paper_evidence)
    ? artifact.paper_evidence.length
    : 0;
}

function externalLiteratureCountFromArtifact(
  artifact: Record<string, unknown>,
) {
  const external = isObject(artifact.external_literature_analysis)
    ? artifact.external_literature_analysis
    : {};
  return Array.isArray(external.representative_references)
    ? external.representative_references.length
    : 0;
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
  const literatureRegistry = createSynthesisLiteratureRegistryService({
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
  const updateEvents = createSynthesisUpdateEventStore({
    libraryId,
    repository: synthesisRepository,
    now,
    retryDelaysMs: options.synthesisUpdateRetryDelaysMs,
  });
  const literatureJobDebounceMs = Math.max(
    0,
    Math.floor(options.literatureJobDebounceMs ?? 250),
  );
  const literatureJobRetryDelaysMs = (
    options.literatureJobRetryDelaysMs?.length
      ? options.literatureJobRetryDelaysMs
      : [60000, 300000, 900000, 1800000]
  ).map((value) => Math.max(0, Math.floor(value)));
  let literatureJobRunning = false;
  let literatureJobDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  let literatureJobRetryTimer: ReturnType<typeof setTimeout> | undefined;
  let literatureJobStateTouched = false;
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

  function literatureJobStatePath() {
    return joinPath(
      buildSynthesisKnowledgeGraphPaths(root).stateRoot,
      "literature-registry-job-state.json",
    );
  }

  function sanitizeLiteratureJobMessage(value: unknown) {
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

  function literatureDiagnostic(args: {
    code: string;
    severity?: "info" | "warning" | "error";
    message: unknown;
  }): SynthesisLiteratureJobDiagnostic {
    return {
      code: cleanString(args.code),
      severity: args.severity || "warning",
      message: sanitizeLiteratureJobMessage(args.message),
    };
  }

  function literatureAllowedActions(state: SynthesisLiteratureJobState) {
    if (state.queue_state === "running") {
      return [];
    }
    if (state.queue_state === "failed_retryable") {
      return ["retryLiteratureRegistryJob", "runLiteratureRegistryJobNow"];
    }
    return ["queueLiteratureRegistryRebuild", "runLiteratureRegistryJobNow"];
  }

  function defaultLiteratureJobState(args: {
    queueState: SynthesisLiteratureJobQueueState;
    sourceHash: string;
    canonicalManifestHash?: string;
    projectionManifestHash?: string;
    projectionHash?: string;
    diagnostics?: SynthesisLiteratureJobDiagnostic[];
  }): SynthesisLiteratureJobState {
    const state: SynthesisLiteratureJobState = {
      schema_id: "synthesis.literature_registry_job_state",
      schema_version: "1.0.0",
      queue_state: args.queueState,
      source_hash: args.sourceHash,
      canonical_manifest_hash: args.canonicalManifestHash,
      projection_manifest_hash: args.projectionManifestHash,
      projection_hash: args.projectionHash,
      diagnostics: args.diagnostics || [],
      updated_at: now(),
      allowed_actions: [],
    };
    state.allowed_actions = literatureAllowedActions(state);
    return state;
  }

  async function readPersistedLiteratureJobState() {
    return readJson<Partial<SynthesisLiteratureJobState>>(
      literatureJobStatePath(),
    ).catch(() => null);
  }

  async function writeLiteratureJobState(
    state: SynthesisLiteratureJobState,
  ): Promise<SynthesisLiteratureJobState> {
    literatureJobStateTouched = true;
    await ensureRuntimeDirectory(
      buildSynthesisKnowledgeGraphPaths(root).stateRoot,
    );
    const next = {
      ...state,
      updated_at: now(),
      allowed_actions: literatureAllowedActions(state),
    };
    await writeJson(literatureJobStatePath(), next);
    return next;
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

  function literatureRetryTimestamp(attempt: number) {
    const index = Math.max(
      0,
      Math.min(attempt - 1, literatureJobRetryDelaysMs.length - 1),
    );
    const delay =
      literatureJobRetryDelaysMs[index] ??
      literatureJobRetryDelaysMs[literatureJobRetryDelaysMs.length - 1] ??
      0;
    return new Date(Date.parse(now()) + delay).toISOString();
  }

  function clearLiteratureRetryTimer() {
    if (literatureJobRetryTimer) {
      clearTimeout(literatureJobRetryTimer);
      literatureJobRetryTimer = undefined;
    }
  }

  function scheduleLiteratureRetry(state: SynthesisLiteratureJobState) {
    clearLiteratureRetryTimer();
    if (state.queue_state !== "failed_retryable" || !state.next_retry_at) {
      return;
    }
    const delay = Math.max(
      0,
      Date.parse(state.next_retry_at) - Date.parse(now()),
    );
    literatureJobRetryTimer = setTimeout(() => {
      literatureJobRetryTimer = undefined;
      void runLiteratureRegistryJobNow().catch(() => undefined);
    }, delay);
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
    pendingDirtyCount: number;
    missing: string[];
    stale: string[];
    failed: boolean;
    running: boolean;
    updateAllowedActions?: string[];
    literatureAllowedActions?: string[];
  }) {
    const commands = new Set<string>();
    for (const action of args.updateAllowedActions || []) {
      commands.add(action);
    }
    for (const action of args.literatureAllowedActions || []) {
      commands.add(action);
    }
    if (args.pendingDirtyCount > 0 && !args.running) {
      commands.add("runPaperRegistryIncrementalWorker");
      commands.add("runCitationGraphStructureWorker");
      commands.add("runTopicFreshnessWorker");
    }
    if (args.missing.length || args.stale.length) {
      commands.add("runLiteratureRegistryJobNow");
    }
    if (args.failed) {
      commands.add("retrySynthesisUpdateQueue");
      commands.add("retryLiteratureRegistryJob");
    }
    return [...commands].sort((left, right) => left.localeCompare(right));
  }

  function backgroundJobStatusFromQueueState(
    state: unknown,
  ): SynthesisUiBackgroundJobRow["status"] | undefined {
    const queueState = cleanString(state);
    if (queueState === "running" || queueState === "syncing") {
      return "running";
    }
    if (queueState === "queued") {
      return "queued";
    }
    if (queueState === "paused" || queueState === "blocked_conflict") {
      return "waiting";
    }
    if (
      queueState === "failed_retryable" ||
      queueState === "failed_permanent"
    ) {
      return "failed";
    }
    return undefined;
  }

  function dirtyEventLabel(event: SynthesisUpdateEvent) {
    return event.event_type
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
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
      normalized === "update_queue" ||
      normalized === "startup_reconcile" ||
      normalized === "literature_registry" ||
      normalized === "citation_graph_layout" ||
      normalized === "git_sync" ||
      normalized === "canonical_maintenance"
    ) {
      return normalized;
    }
    return "update_queue";
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

  function activeJobProgressRows() {
    try {
      return synthesisRepository
        .listActiveJobProgress()
        .map(backgroundJobFromProgress)
        .filter((row): row is SynthesisUiBackgroundJobRow => Boolean(row));
    } catch {
      return [];
    }
  }

  function reportSynthesisJobProgress(
    record: SynthesisJobProgressRecord & { jobName: string },
  ) {
    try {
      synthesisRepository.upsertJobProgress(record);
    } catch {
      // Progress reporting must not fail the worker it observes.
    }
  }

  function completeSynthesisJobProgress(
    record: SynthesisJobProgressRecord & { jobName: string },
  ) {
    try {
      synthesisRepository.completeJobProgress(record);
    } catch {
      // Progress reporting must not fail the worker it observes.
    }
  }

  function failSynthesisJobProgress(
    record: SynthesisJobProgressRecord & { jobName: string },
  ) {
    try {
      synthesisRepository.failJobProgress({
        ...record,
        status:
          record.status === "failed_terminal"
            ? "failed_terminal"
            : "failed_retryable",
      });
    } catch {
      // Progress reporting must not fail the worker it observes.
    }
  }

  function buildMaintenanceBackgroundJobs(args: {
    updateQueue: ReturnType<typeof updateEvents.loadQueueState>;
    dirtyEvents: SynthesisUpdateEvent[];
    jobProgressRows?: SynthesisUiBackgroundJobRow[];
    literatureJob?: Partial<SynthesisLiteratureJobState>;
    gitSyncState?: unknown;
  }): SynthesisUiBackgroundJobRow[] {
    const rows: SynthesisUiBackgroundJobRow[] = [];
    rows.push(...(args.jobProgressRows || []));
    const hasProgressSource = new Set(
      rows.map((row) => row.source).filter(Boolean),
    );
    const queueStatus = backgroundJobStatusFromQueueState(
      args.updateQueue.queue_state,
    );
    if (queueStatus && !hasProgressSource.has("update_queue")) {
      rows.push({
        job_id: "synthesis:update-queue",
        source: "update_queue",
        status: queueStatus,
        label: "Synthesis update queue",
        detail: [
          `${args.updateQueue.pending_count} queued`,
          `${args.updateQueue.running_count} running`,
          `${args.updateQueue.failed_count} failed`,
        ].join(" - "),
        updated_at: args.updateQueue.updated_at,
        targetTab: "overview",
        progress: { mode: "indeterminate" },
      });
    }

    const startup = args.updateQueue.startup_reconcile;
    const startupStatus =
      startup.state === "checking"
        ? "running"
        : startup.state === "queued"
          ? "queued"
          : startup.state === "failed_retryable" ||
              startup.state === "failed_permanent"
            ? "failed"
            : undefined;
    if (startupStatus && !hasProgressSource.has("startup_reconcile")) {
      rows.push({
        job_id: "synthesis:startup-reconcile",
        source: "startup_reconcile",
        status: startupStatus,
        label: "Startup reconcile",
        detail:
          startup.dirty_count > 0
            ? `${startup.dirty_count} dirty item(s) detected`
            : undefined,
        updated_at: startup.last_checked_at || args.updateQueue.updated_at,
        targetTab: "overview",
        progress: { mode: "indeterminate" },
      });
    }

    const visibleDirtyEvents = args.dirtyEvents
      .filter((event) =>
        ["queued", "running", "failed_retryable", "failed_permanent"].includes(
          event.status,
        ),
      )
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .slice(0, 8);
    for (const event of visibleDirtyEvents) {
      const eventStatus = backgroundJobStatusFromQueueState(event.status);
      if (!eventStatus) {
        continue;
      }
      rows.push({
        job_id: `synthesis:update-event:${event.event_id}`,
        source: "dirty_event",
        status: eventStatus,
        label: dirtyEventLabel(event),
        detail: `${event.scope.kind}:${event.scope.ref}`,
        updated_at: event.updated_at,
        targetTab:
          event.scope.kind === "topic"
            ? "artifacts"
            : event.scope.kind === "citation_graph_layout" ||
                event.scope.kind === "citation_graph_structure"
              ? "graph"
              : "registry",
        progress: { mode: "indeterminate" },
      });
    }

    const literatureStatus = backgroundJobStatusFromQueueState(
      args.literatureJob?.queue_state,
    );
    if (literatureStatus && !hasProgressSource.has("literature_registry")) {
      rows.push({
        job_id: "synthesis:literature-registry",
        source: "literature_registry",
        status: literatureStatus,
        label: "Literature registry rebuild",
        detail: cleanString(args.literatureJob?.last_run_status) || undefined,
        updated_at:
          cleanString(args.literatureJob?.updated_at) ||
          cleanString(args.literatureJob?.last_run_at) ||
          args.updateQueue.updated_at,
        command:
          literatureStatus === "failed"
            ? "retryLiteratureRegistryJob"
            : "runLiteratureRegistryJobNow",
        targetTab: "registry",
        progress: { mode: "indeterminate" },
      });
    }

    const gitSync =
      args.gitSyncState && typeof args.gitSyncState === "object"
        ? (args.gitSyncState as Record<string, unknown>)
        : {};
    const gitSyncStatus = backgroundJobStatusFromQueueState(
      gitSync.queue_state,
    );
    if (gitSyncStatus && !hasProgressSource.has("git_sync")) {
      rows.push({
        job_id: "synthesis:git-sync",
        source: "git_sync",
        status: gitSyncStatus,
        label: "Git Sync",
        detail: cleanString(gitSync.queue_state),
        updated_at:
          cleanString(
            (gitSync.last_run as { completed_at?: unknown } | undefined)
              ?.completed_at,
          ) || args.updateQueue.updated_at,
        command: gitSyncStatus === "failed" ? "retryGitSync" : "syncNow",
        targetTab: "overview",
        progress: { mode: "indeterminate" },
      });
    }

    const maintenance = canonicalMaintenanceStatus();
    if (
      (maintenance.active_worker_count > 0 || maintenance.pending_sync) &&
      !hasProgressSource.has("canonical_maintenance")
    ) {
      rows.push({
        job_id: "synthesis:canonical-maintenance",
        source: "canonical_maintenance",
        status: maintenance.active_worker_count > 0 ? "running" : "queued",
        label: "Canonical maintenance",
        detail: cleanString(maintenance.active_worker_kind) || undefined,
        updated_at: args.updateQueue.updated_at,
        targetTab: "overview",
        progress: { mode: "indeterminate" },
      });
    }

    return rows;
  }

  function buildMaintenanceSummary(args: {
    updateQueue: ReturnType<typeof updateEvents.loadQueueState>;
    literatureJob?: Partial<SynthesisLiteratureJobState>;
    literatureProjection?: unknown;
    literatureProjectionState?: {
      stale?: boolean;
      last_rebuild_at?: string;
      diagnostics?: unknown[];
    };
    citationProjectionState?: {
      stale?: boolean;
      last_rebuild_at?: string;
      diagnostics?: unknown[];
    };
    citationGraphHash?: string;
    citationGraphFound: boolean;
  }): NonNullable<SynthesisUiSnapshotInput["maintenance"]>["summary"] {
    const maintenance = canonicalMaintenanceStatus();
    const missing: string[] = [];
    const stale: string[] = [];
    const partial: string[] = [];
    const diagnostics: Array<{
      code: string;
      severity: "info" | "warning" | "error";
      message: string;
    }> = [];
    if (!args.literatureProjection) {
      missing.push("literature-registry-index");
    }
    if (!args.citationGraphFound) {
      missing.push("citation-graph-index");
    }
    if (args.literatureProjectionState?.stale) {
      stale.push("literature-registry-index");
    }
    if (args.citationProjectionState?.stale) {
      stale.push("citation-graph-index");
    }
    if (missing.length === 1) {
      partial.push(missing[0]);
    }
    const literatureState = cleanString(args.literatureJob?.queue_state);
    const running =
      maintenance.active_worker_count > 0 ||
      args.updateQueue.running_count > 0 ||
      literatureState === "running";
    const failed =
      args.updateQueue.failed_count > 0 ||
      literatureState === "failed_retryable" ||
      literatureState === "failed_permanent";
    const queued =
      args.updateQueue.pending_count > 0 ||
      literatureState === "queued" ||
      maintenance.pending_sync;
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
              : stale.length || literatureState === "stale"
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
      cleanString(args.literatureJob?.last_run_at) ||
      cleanString(args.literatureProjectionState?.last_rebuild_at) ||
      cleanString(args.literatureJob?.updated_at);
    const citationUpdatedAt =
      cleanString(args.citationProjectionState?.last_rebuild_at) ||
      cleanString(args.literatureJob?.last_run_at);
    return {
      status,
      latestUsable: {
        literatureRegistry: literatureUpdatedAt
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
      pendingDirtyCount: args.updateQueue.pending_count,
      activeWorkerCount: maintenance.active_worker_count,
      activeWorkerKind: maintenance.active_worker_kind,
      canonicalSyncPending: maintenance.pending_sync,
      canonicalEpoch: maintenance.epoch,
      lastFailure: args.updateQueue.last_failure,
      stale,
      partial,
      missing,
      recommendedCommands: maintenanceRecommendedCommands({
        pendingDirtyCount: args.updateQueue.pending_count,
        missing,
        stale,
        failed,
        running,
        updateAllowedActions: args.updateQueue.allowed_actions,
        literatureAllowedActions: args.literatureJob?.allowed_actions,
      }),
      diagnostics,
    };
  }

  function readMaintenanceForDto(recommendedCommands: string[] = []) {
    const queue = updateEvents.loadQueueState();
    const maintenance = canonicalMaintenanceStatus();
    return {
      queue_state: queue.queue_state,
      pending_dirty_count: queue.pending_count,
      running_count: queue.running_count,
      failed_count: queue.failed_count,
      active_worker_count: maintenance.active_worker_count,
      active_worker_kind: maintenance.active_worker_kind,
      canonical_sync_pending: maintenance.pending_sync,
      canonical_epoch: maintenance.epoch,
      last_failure: queue.last_failure,
      recommended_commands: Array.from(
        new Set([...recommendedCommands, ...queue.allowed_actions]),
      ).sort((left, right) => left.localeCompare(right)),
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

  async function deriveLiteratureJobState(
    options: { enqueueIfStale?: boolean } = {},
  ) {
    let source;
    try {
      source = await literatureSource();
    } catch (error) {
      const state = defaultLiteratureJobState({
        queueState: "failed_retryable",
        sourceHash: "",
        diagnostics: [
          literatureDiagnostic({
            code: "literature_source_read_failed",
            severity: "error",
            message: errorMessage(error),
          }),
        ],
      });
      return writeLiteratureJobState(state);
    }
    const snapshot = await literatureRegistry
      .loadLiteratureRegistry()
      .catch(() => undefined);
    const citationProjection = await literatureRegistry
      .readCitationGraphProjection()
      .catch(() => null);
    const persisted = await readPersistedLiteratureJobState();
    const canonicalManifestHash = snapshot?.manifest.manifest_hash;
    const projectionManifestHash =
      citationProjection?.source_manifest_hash ||
      snapshot?.citation_projection?.source_manifest_hash;
    const projectionHash = citationProjection
      ? hashCanonicalJson(citationProjection)
      : undefined;
    let queueState: SynthesisLiteratureJobQueueState = "ready";
    if (!citationProjection) {
      queueState = "missing";
    } else if (
      !projectionManifestHash ||
      (canonicalManifestHash &&
        projectionManifestHash !== canonicalManifestHash)
    ) {
      queueState = "stale";
    } else if (
      persisted?.source_hash &&
      persisted.source_hash !== source.sourceHash
    ) {
      queueState = "stale";
    }
    const canPreserve =
      persisted?.source_hash === source.sourceHash &&
      (persisted.queue_state === "queued" ||
        (persisted.queue_state === "running" && literatureJobRunning) ||
        persisted.queue_state === "failed_retryable");
    if (canPreserve) {
      queueState = persisted.queue_state as SynthesisLiteratureJobQueueState;
    }
    const state = await writeLiteratureJobState({
      ...defaultLiteratureJobState({
        queueState,
        sourceHash: source.sourceHash,
        canonicalManifestHash,
        projectionManifestHash,
        projectionHash,
        diagnostics: Array.isArray(persisted?.diagnostics)
          ? persisted?.diagnostics || []
          : [],
      }),
      retry_attempt: canPreserve ? persisted?.retry_attempt : undefined,
      next_retry_at: canPreserve ? persisted?.next_retry_at : undefined,
      last_retry_at: persisted?.last_retry_at,
      last_run_at: persisted?.last_run_at,
      last_run_status: persisted?.last_run_status,
    });
    if (
      options.enqueueIfStale &&
      (queueState === "stale" || queueState === "missing")
    ) {
      void queueLiteratureRegistryRebuild().catch(() => undefined);
    }
    scheduleLiteratureRetry(state);
    return state;
  }

  async function peekLiteratureJobState() {
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const [persisted, manifestEnvelope, citationProjection] = await Promise.all(
      [
        readPersistedLiteratureJobState(),
        readJson<CanonicalEnvelope<Record<string, unknown>>>(
          joinPath(paths.citationGraphRoot, "manifest.json"),
        ).catch(() => null),
        readJson<{ source_manifest_hash?: string }>(
          joinPath(paths.stateRoot, "citation-graph-index.json"),
        ).catch(() => null),
      ],
    );
    const sourceHash = cleanString(persisted?.source_hash);
    const canonicalManifest = envelopeData<Record<string, unknown>>(
      manifestEnvelope,
      {},
    );
    const canonicalManifestHash = cleanString(canonicalManifest.manifest_hash);
    const projectionManifestHash = cleanString(
      citationProjection?.source_manifest_hash,
    );
    const projectionHash = citationProjection
      ? hashCanonicalJson(citationProjection)
      : undefined;
    let queueState: SynthesisLiteratureJobQueueState = "ready";
    if (!citationProjection) {
      queueState = "missing";
    } else if (
      !projectionManifestHash ||
      (canonicalManifestHash &&
        projectionManifestHash !== canonicalManifestHash)
    ) {
      queueState = "stale";
    }
    const canPreserve =
      literatureJobStateTouched &&
      persisted?.source_hash === sourceHash &&
      (persisted.queue_state === "queued" ||
        persisted.queue_state === "running" ||
        persisted.queue_state === "failed_retryable");
    if (canPreserve) {
      queueState = persisted.queue_state as SynthesisLiteratureJobQueueState;
    }
    const state: SynthesisLiteratureJobState = {
      ...defaultLiteratureJobState({
        queueState,
        sourceHash,
        canonicalManifestHash: canonicalManifestHash || undefined,
        projectionManifestHash: projectionManifestHash || undefined,
        projectionHash,
        diagnostics: Array.isArray(persisted?.diagnostics)
          ? persisted?.diagnostics || []
          : [],
      }),
      retry_attempt: canPreserve ? persisted?.retry_attempt : undefined,
      next_retry_at: canPreserve ? persisted?.next_retry_at : undefined,
      last_retry_at: persisted?.last_retry_at,
      last_run_at: persisted?.last_run_at,
      last_run_status: persisted?.last_run_status,
      updated_at: cleanString(persisted?.updated_at) || now(),
    };
    return {
      ...state,
      allowed_actions: literatureAllowedActions(state),
    };
  }

  async function loadLiteratureJobState() {
    return deriveLiteratureJobState();
  }

  function activeCitationBindings(
    literatureItemIds: string[],
  ): Map<string, SynthesisZoteroBindingRecord> {
    return new Map(
      synthesisRepository
        .listZoteroBindings({
          statuses: ["active"],
          literatureItemIds,
        })
        .map((binding) => [binding.literatureItemId, binding] as const),
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
      return (
        synthesisRepository
          .listZoteroBindings({ statuses: ["active"] })
          .find((binding) => binding.itemKey === itemKey)?.literatureItemId ||
        ""
      );
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
        statuses: ["matched", "ambiguous", "unresolved"],
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
        if (edge.edgeStatus === "matched" || edge.edgeStatus === "ambiguous") {
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
      statuses: ["matched", "ambiguous", "unresolved"],
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
              statuses: ["matched", "ambiguous", "unresolved"],
              limit: normalized.maxEdges,
            });
      const incoming =
        normalized.direction === "outgoing"
          ? []
          : synthesisRepository.listCitationEdges({
              targetLiteratureItemIds: [current.literatureItemId],
              statuses: ["matched", "ambiguous", "unresolved"],
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
          recommended_commands: stale
            ? ["runCitationGraphComplexMetricsWorker"]
            : [],
          maintenance: readMaintenanceForDto(
            stale ? ["runCitationGraphComplexMetricsWorker"] : [],
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
      return {
        node_id: node
          ? citationGraphNodeIdFromDb(node, binding)
          : metric.literatureItemId,
        paper_ref: binding ? `${binding.libraryId}:${binding.itemKey}` : "",
        item_key: binding?.itemKey,
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
        recommended_commands: metrics.length
          ? ["runCitationGraphComplexMetricsWorker"]
          : ["runLiteratureRegistryJobNow"],
        maintenance: readMaintenanceForDto(
          metrics.length
            ? ["runCitationGraphComplexMetricsWorker"]
            : ["runLiteratureRegistryJobNow"],
        ),
      },
    };
  }

  async function queueLiteratureRegistryRebuild() {
    const state = await deriveLiteratureJobState();
    if (state.queue_state === "running") {
      return state;
    }
    const queued = await writeLiteratureJobState({
      ...state,
      queue_state: "queued",
      diagnostics: [],
      retry_attempt: undefined,
      next_retry_at: undefined,
    });
    if (literatureJobDebounceTimer) {
      clearTimeout(literatureJobDebounceTimer);
    }
    literatureJobDebounceTimer = setTimeout(() => {
      literatureJobDebounceTimer = undefined;
      void runLiteratureRegistryJobNow().catch(() => undefined);
    }, literatureJobDebounceMs);
    return queued;
  }

  async function runLiteratureRegistryJobNow() {
    const jobName = "synthesis:literature-registry";
    const runId = `${jobName}:${now()}`;
    const literaturePhases = [
      "source_loading",
      "rebuild",
      "projection",
      "commit",
    ];
    let literaturePhaseIndex = 0;
    const reportLiteraturePhase = (phase: string, index: number) => {
      literaturePhaseIndex = index;
      reportSynthesisJobProgress({
        jobName,
        runId,
        source: "literature_registry",
        label: "Literature registry rebuild",
        status: "running",
        phase,
        phaseLabel: phase
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        processedCount: index,
        totalCount: literaturePhases.length,
        progressMode: "determinate",
      });
    };
    if (literatureJobDebounceTimer) {
      clearTimeout(literatureJobDebounceTimer);
      literatureJobDebounceTimer = undefined;
    }
    clearLiteratureRetryTimer();
    if (literatureJobRunning) {
      const state = await deriveLiteratureJobState();
      return writeLiteratureJobState({ ...state, queue_state: "running" });
    }
    literatureJobRunning = true;
    let state = await deriveLiteratureJobState();
    state = await writeLiteratureJobState({
      ...state,
      queue_state: "running",
      diagnostics: [],
      next_retry_at: undefined,
    });
    const maintenance = beginCanonicalMaintenanceWorker(
      "literature-registry-job",
    );
    try {
      reportLiteraturePhase("source_loading", 1);
      const source = await literatureSource();
      reportLiteraturePhase("rebuild", 2);
      const rebuilt = await lock.runExclusive(libraryId, () =>
        literatureRegistry.rebuildLiteratureRegistry({
          registryInputs: source.registryInputs,
          citationGraphPapers: source.citationGraphPapers,
          transactionId: "literature-registry-background-rebuild",
        }),
      );
      maintenance.markCanonicalMutation();
      reportLiteraturePhase("projection", 3);
      const projectionHash = hashCanonicalJson(rebuilt.citationProjection);
      literatureJobRunning = false;
      completeSynthesisJobProgress({
        jobName,
        runId,
        source: "literature_registry",
        label: "Literature registry rebuild",
        phase: "commit",
        phaseLabel: "Commit",
        processedCount: literaturePhases.length,
        totalCount: literaturePhases.length,
        progressMode: "determinate",
        message: "Literature registry rebuild completed.",
      });
      return writeLiteratureJobState({
        ...defaultLiteratureJobState({
          queueState: "ready",
          sourceHash: source.sourceHash,
          canonicalManifestHash: rebuilt.manifest.manifest_hash,
          projectionManifestHash:
            rebuilt.citationProjection.source_manifest_hash,
          projectionHash,
          diagnostics: [],
        }),
        last_run_at: now(),
        last_run_status: "success",
      });
    } catch (error) {
      const persisted = await readPersistedLiteratureJobState();
      const retryAttempt =
        Math.max(0, Number(persisted?.retry_attempt) || 0) + 1;
      const nextRetryAt = literatureRetryTimestamp(retryAttempt);
      const diagnostic = literatureDiagnostic({
        code: "literature_registry_rebuild_failed",
        severity: "error",
        message: errorMessage(error),
      });
      const failed = await writeLiteratureJobState({
        ...state,
        queue_state: "failed_retryable",
        retry_attempt: retryAttempt,
        next_retry_at: nextRetryAt,
        last_retry_at: now(),
        last_run_at: now(),
        last_run_status: "failed_retryable",
        diagnostics: [diagnostic],
      });
      literatureJobRunning = false;
      failSynthesisJobProgress({
        jobName,
        runId,
        source: "literature_registry",
        label: "Literature registry rebuild",
        processedCount: literaturePhaseIndex,
        totalCount: literaturePhases.length,
        progressMode: "determinate",
        diagnosticsJson: JSON.stringify([diagnostic]),
        message: "Literature registry rebuild failed.",
      });
      scheduleLiteratureRetry(failed);
      return failed;
    } finally {
      maintenance.finish();
    }
  }

  async function retryLiteratureRegistryJob() {
    const state = await deriveLiteratureJobState();
    await writeLiteratureJobState({
      ...state,
      retry_attempt: undefined,
      next_retry_at: undefined,
      diagnostics: [],
    });
    return runLiteratureRegistryJobNow();
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
            throw new Error(
              `topic section patch failed: ${JSON.stringify(applied)}`,
            );
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
          sections = fallbackSectionsFromBundle(bundle);
          manifest = {
            schema_id: "synthesis.topic_analysis_manifest",
            schema_version: "2.0.0",
            operation: bundle.mode === "create" ? "create" : "update_full",
            topic_id: topicId,
            language: "auto",
            sections: Object.fromEntries(
              Object.entries(sections).map(([section, value]) => [
                section,
                {
                  path: `result/sections/${canonicalSectionFileName(section)}`,
                  hash: hashCanonicalJson(value),
                  content_type: "json",
                },
              ]),
            ),
          };
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
        const exportMarkdown = renderTopicMarkdownExport(artifact);
        const hashes = computeTopicCurrentHashes({
          manifest,
          artifact,
          metadata: {},
          exportMarkdown,
          sections,
        });
        const markdownHash = hashes.markdown_hash;
        const bundleHash = hashCanonicalJson(bundle);
        const paperCount = paperCountFromArtifact(artifact);
        const externalLiteratureCount =
          externalLiteratureCountFromArtifact(artifact);
        const metadataData: TopicArtifactMetadata = {
          topic_id: topicId,
          title: titleFromDefinition(bundle.topic_definition, topicId),
          mode: bundle.mode,
          markdown_hash: markdownHash,
          bundle_hash: bundleHash,
          timeline:
            artifact.timeline_events as SynthesisResultBundle["timeline"],
          artifact_metadata: bundle.artifact_metadata,
          updated_at: timestamp,
          operation: bundle.operation || bundle.mode,
          language: bundle.language,
          manifest_hash: hashes.manifest_hash,
          structured_hash: hashes.structured_hash,
          artifact_hash: hashes.artifact_hash,
          export_hash: hashes.export_hash,
          section_hashes: hashes.section_hashes,
          paper_count: paperCount,
          external_literature_count: externalLiteratureCount,
          coverage_summary: isObject(artifact.coverage)
            ? artifact.coverage
            : {},
        };
        const finalHashes = computeTopicCurrentHashes({
          manifest,
          artifact,
          metadata: metadataData,
          exportMarkdown,
          sections,
        });
        metadataData.metadata_hash = finalHashes.metadata_hash;
        metadataData.manifest_hash = finalHashes.manifest_hash;
        metadataData.structured_hash = finalHashes.structured_hash;
        metadataData.artifact_hash = finalHashes.artifact_hash;
        metadataData.export_hash = finalHashes.export_hash;
        metadataData.section_hashes = finalHashes.section_hashes;
        await writeV2Current({
          paths,
          manifest: {
            ...manifest,
            section_hashes: finalHashes.section_hashes,
            artifact_hash: finalHashes.artifact_hash,
            export_hash: finalHashes.export_hash,
            metadata_hash: finalHashes.metadata_hash,
          },
          sections,
          artifact,
          metadata: metadataData,
          exportMarkdown,
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
        const persistedExportHash = await fileHash(paths.currentExportMarkdown);
        const persistedMetadataHash = await fileHash(paths.currentMetadata);
        const rows = (await readIndexRows(root)).filter(
          (row) => row.topic_id !== topicId,
        );
        rows.push({
          topic_id: topicId,
          path_id: pathId,
          title: metadataData.title,
          updated_at: timestamp,
          markdown_hash: persistedExportHash,
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
        const warnings: string[] = [];
        try {
          const conceptPayload = await readRunWorkspaceJsonWithFallbacks(
            context,
            "sidecars.concept_cards_proposal.path",
            sidecarPathForApply({
              manifest,
              bundle,
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
            currentArtifactPath: `topics/${pathId}/current/artifact.json`,
            paperCount,
            lastSynthesisAt: timestamp,
            transactionId: `topic-graph-node-${pathId}`,
          });
          try {
            const proposalPayload = await readRunWorkspaceJsonWithFallbacks(
              context,
              "sidecars.topic_graph_relation_proposals.path",
              sidecarPathForApply({
                manifest,
                bundle,
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
          const topicInterestPayload = await readRunWorkspaceJsonWithFallbacks(
            context,
            "sidecars.topic_interest_metadata.path",
            sidecarPathForApply({
              manifest,
              bundle,
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
              filtered_count: discoveryResult.filtered,
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
        const row = rows.find((entry) => entry.topic_id === topicId);
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
          markdown_hash: row.markdown_hash,
          metadata_hash: row.metadata_hash,
          bundle_hash: row.bundle_hash,
        });
        await writeDeletedRows(root, deletedRows, timestamp);
        try {
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
    if (!topic.markdown.trim() || !topic.metadata) {
      throw new Error(`topic artifact not found: ${topicId}`);
    }
    return {
      topicId,
      markdown: topic.markdown,
      artifact: topic.artifact,
      manifest: topic.manifest,
      metadata: topic.metadata.data,
      metadataEnvelope: topic.metadata,
      paths: topic.paths,
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
    const paperEvidence = Array.isArray(artifact.paper_evidence)
      ? artifact.paper_evidence.filter(isObject)
      : [];
    const externalAnalysis = isObject(artifact.external_literature_analysis)
      ? (artifact.external_literature_analysis as Record<string, unknown>)
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
      markdown_export: topic.markdown,
      markdown_hash:
        cleanString(metadata.export_hash || metadata.markdown_hash) ||
        undefined,
      artifact_hash:
        cleanString(metadata.artifact_hash || metadata.structured_hash) ||
        undefined,
      paper_count: paperEvidence.length || metadata.paper_count || 0,
      external_literature_count:
        metadata.external_literature_count ||
        (Array.isArray(externalAnalysis.representative_references)
          ? externalAnalysis.representative_references.length
          : 0),
      topic: topicSection,
      summary: summarySection,
      positioning: isObject(artifact.positioning) ? artifact.positioning : {},
      taxonomy: isObject(artifact.taxonomy) ? artifact.taxonomy : {},
      comparison_matrix: isObject(artifact.comparison_matrix)
        ? artifact.comparison_matrix
        : {},
      claims: Array.isArray(artifact.claims) ? artifact.claims : [],
      timeline_events: isObject(artifact.timeline_events)
        ? artifact.timeline_events
        : Array.isArray(artifact.timeline_events)
          ? { summary: {}, events: artifact.timeline_events }
          : { summary: {}, events: [] },
      paper_evidence: paperEvidence,
      external_literature_analysis: externalAnalysis,
      debates: Array.isArray(artifact.debates) ? artifact.debates : [],
      coverage: isObject(artifact.coverage) ? artifact.coverage : {},
      statistics: isObject(artifact.statistics) ? artifact.statistics : {},
      synthesis_report: isObject(artifact.synthesis_report)
        ? artifact.synthesis_report
        : {},
      gaps: Array.isArray(artifact.gaps) ? artifact.gaps : [],
      review_outline: isObject(artifact.review_outline)
        ? artifact.review_outline
        : {},
      evidence_map: isObject(artifact.evidence_map)
        ? artifact.evidence_map
        : {},
      source_artifacts: isObject(artifact.source_artifacts)
        ? artifact.source_artifacts
        : {},
      diagnostics: artifact.diagnostics,
      artifact,
      manifest: topic.manifest,
      metadata,
      paths: topic.paths,
    };
  }

  async function getSynthesisSnapshotInput(
    state: SynthesisUiState = createDefaultSynthesisUiState(),
  ): Promise<SynthesisUiSnapshotInput> {
    const paths = buildSynthesisStoragePaths(root);
    const rootReady = await runtimePathExists(paths.synthesisRoot);
    const registryFacts = synthesisRepository.listPaperRegistryFacts({
      limit: SYNTHESIS_REGISTRY_PAGE_LIMIT_MAX,
    }).entries;
    const registryReferenceFacts = synthesisRepository.listReferenceFacts({
      sourceLiteratureItemIds: registryFacts.map(
        (fact) => fact.literatureItemId,
      ),
    });
    const registryReviewItems = synthesisRepository.listReviewItems();
    const artifactState = {} as Record<string, TopicArtifactStateRow>;
    const definitions = {} as Record<string, Record<string, unknown>>;
    const dbGraph = readDbCitationGraphOverview();
    const graphLayoutRecord = synthesisRepository.getCitationGraphLayoutState({
      viewKey: "workbench_overview",
      preset: state.graph.layoutPreset,
    });
    const graphLayout = parseCitationGraphLayout(graphLayoutRecord);
    const graphLayoutStatus = citationGraphLayoutStatus({
      graph: dbGraph,
      record: graphLayoutRecord,
      layout: graphLayout,
    });
    const tags = await tagVocabulary.loadTagVocabulary().catch(() => undefined);
    const concepts = await conceptKb.loadConceptKb().catch(() => undefined);
    const literatureJob = await peekLiteratureJobState().catch(() => undefined);
    const updateQueue = updateEvents.loadQueueState();
    const dirtyEvents = updateEvents.listEvents();
    const topicGraphSnapshot = await topicGraph
      .loadTopicGraph()
      .catch(() => undefined);
    const conflicts: SynthesisConflictCandidate[] = [];
    const artifactRows = topicGraphSnapshot
      ? topicArtifactRowsFromGraphNodes({
          nodes: topicGraphSnapshot.nodes,
          artifactState,
          definitions,
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
    const maintenanceSummary = buildMaintenanceSummary({
      updateQueue,
      literatureJob,
      literatureProjection: registryFacts.length ? registryFacts : undefined,
      citationGraphHash: graph.graph_hash,
      citationGraphFound: dbGraph.nodes.length > 0,
    });
    const backgroundJobs = buildMaintenanceBackgroundJobs({
      updateQueue,
      dirtyEvents,
      jobProgressRows: activeJobProgressRows(),
      literatureJob,
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
        rows: registryFactsToUiRows({
          facts: registryFacts,
          references: registryReferenceFacts,
          cleanupProposals: indexReviewProposals,
        }),
        cleanupProposals: indexReviewProposals,
        projection: undefined,
        literatureJob,
      },
      graph: {
        ...mapGraphToUi(graph, {
          layout: graphLayout,
          layoutStatus: graphLayoutStatus,
        }),
        diagnostics: {
          ...graph.diagnostics,
          storage: "sqlite",
          layout_status: graphLayoutStatus,
          layout_source: "sqlite",
        },
      },
      maintenance: {
        updateQueue,
        summary: maintenanceSummary,
        backgroundJobs,
      },
      tags: tags
        ? {
            entries: tags.entries,
            aliases: tags.aliases,
            abbrev: tags.abbrev,
            protocol: tags.protocol,
            manifest: tags.manifest,
            validationWarnings: tags.validation_warnings,
            projection: tags.projection,
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

  async function getSynthesisSnapshot(
    state: SynthesisUiState = createDefaultSynthesisUiState(),
  ): Promise<SynthesisUiSnapshot> {
    return buildSynthesisUiSnapshot(
      await getSynthesisSnapshotInput(state),
      state,
    );
  }

  async function recordSynthesisUpdateEvent(
    args: Parameters<typeof updateEvents.recordEvent>[0],
  ) {
    return updateEvents.recordEvent(args);
  }

  async function listSynthesisUpdateEvents() {
    return updateEvents.listEvents();
  }

  async function loadSynthesisUpdateQueueState() {
    return updateEvents.loadQueueState();
  }

  async function pauseSynthesisUpdates() {
    return updateEvents.pause();
  }

  async function resumeSynthesisUpdates() {
    return updateEvents.resume();
  }

  async function retrySynthesisUpdateQueue() {
    return updateEvents.retryNow();
  }

  async function recordSynthesisStartupReconcileState(
    args: Parameters<typeof updateEvents.recordStartupReconcileState>[0],
  ) {
    return updateEvents.recordStartupReconcileState(args);
  }

  async function markSynthesisUpdateQueueFailure(
    args: Parameters<typeof updateEvents.markFailure>[0],
  ) {
    return updateEvents.markFailure(args);
  }

  function paperRefFromEvent(event: SynthesisUpdateEvent) {
    const ref = cleanString(event.scope.ref);
    if (!ref) {
      return "";
    }
    if (event.scope.kind === "paper") {
      return ref;
    }
    if (event.scope.kind === "zotero_item") {
      return ref.includes(":") ? ref : `${libraryId}:${ref}`;
    }
    return "";
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

  function upsertLiteratureMatchingMetadataCacheFromRegistryInput(
    input: PaperRegistryInput,
  ) {
    const payload = literatureMatchingMetadataPayloadFromInput(input);
    if (!payload) {
      return null;
    }
    const paperRef = `${normalizeLibraryId(input.libraryId)}:${cleanString(
      input.itemKey,
    )}`;
    const literatureItemId = zoteroPaperLiteratureItemId(paperRef);
    const metadataHash = hashCanonicalJson(payload);
    synthesisRepository.upsertLiteratureMatchingMetadata({
      literatureItemId,
      schemaId: LITERATURE_MATCHING_METADATA_SCHEMA,
      keyTermsJson: JSON.stringify(payload.key_terms),
      methodsJson: JSON.stringify(payload.methods),
      problemsJson: JSON.stringify(payload.problems),
      datasetsJson: JSON.stringify(payload.datasets),
      excludeTermsJson: JSON.stringify(payload.exclude_terms),
      sourceArtifactHash: metadataHash,
      metadataHash,
      diagnosticsJson: "[]",
      updatedAt: now(),
    });
    return { literatureItemId, metadataHash };
  }

  function isPaperRegistryDirtyEvent(event: SynthesisUpdateEvent) {
    return (
      event.status === "queued" &&
      (event.event_type === "paper_artifact_changed" ||
        event.event_type === "digest_applied" ||
        event.event_type === "literature_matching_metadata_changed" ||
        event.event_type === "reference_matching_applied" ||
        event.event_type === "zotero_item_added" ||
        event.event_type === "zotero_item_updated" ||
        event.event_type === "zotero_item_deleted" ||
        event.event_type === "zotero_item_restored" ||
        event.event_type === "startup_reconcile_detected_dirty_items")
    );
  }

  async function runPaperRegistryIncrementalWorker(
    args: {
      batchLimit?: number;
      timeBudgetMs?: number;
    } = {},
  ) {
    const startedAt = Date.now();
    const jobName = "synthesis:paper-registry-incremental-worker";
    const runId = `${jobName}:${now()}`;
    const batchLimit = Math.max(1, Math.floor(Number(args.batchLimit) || 10));
    const timeBudgetMs = Math.max(
      1,
      Math.floor(Number(args.timeBudgetMs) || 2000),
    );
    const queue = updateEvents.loadQueueState();
    const diagnostics: SynthesisUpdateDiagnostic[] = [];
    if (queue.paused) {
      return {
        processed: 0,
        completed: 0,
        failed: 0,
        skipped: "paused",
        diagnostics,
        queue,
        elapsed_ms: Date.now() - startedAt,
        time_budget_ms: timeBudgetMs,
        budget_exhausted: false,
      };
    }
    const maintenance = beginCanonicalMaintenanceWorker(
      "paper-registry-incremental-worker",
    );
    let processed = 0;
    let completed = 0;
    let failed = 0;
    try {
      const pending = updateEvents
        .listEvents()
        .filter(isPaperRegistryDirtyEvent)
        .sort((left, right) => left.created_at.localeCompare(right.created_at));
      const totalCount = Math.min(pending.length, batchLimit);
      if (totalCount > 0) {
        reportSynthesisJobProgress({
          jobName,
          runId,
          source: "update_queue",
          label: "Paper registry incremental worker",
          status: "running",
          timeBudgetMs,
          batchLimit,
          processedCount: 0,
          failedCount: 0,
          totalCount,
          progressMode: "determinate",
          message: `${totalCount} dirty paper event(s) selected`,
        });
      }
      for (const event of pending) {
        if (processed >= batchLimit || Date.now() - startedAt >= timeBudgetMs) {
          break;
        }
        processed += 1;
        const paperRef = paperRefFromEvent(event);
        if (!paperRef) {
          const diagnostic = {
            code: "unsafe_dirty_scope_requires_explicit_rebuild",
            severity: "warning" as const,
            message:
              "Dirty event scope cannot be mapped to a single paper; run explicit literature registry rebuild.",
          };
          diagnostics.push(diagnostic);
          updateEvents.failEvent({
            eventId: event.event_id,
            retryable: false,
            diagnostics: [diagnostic],
          });
          failed += 1;
          continue;
        }
        const input = await resolveRegistryInputForPaperRef(paperRef);
        if (!input) {
          const diagnostic = {
            code: "paper_registry_input_unavailable",
            severity:
              event.event_type === "zotero_item_deleted" ? "info" : "warning",
            message:
              "Single-paper registry input is unavailable; explicit rebuild may be required if this item still exists.",
          } satisfies SynthesisUpdateDiagnostic;
          diagnostics.push(diagnostic);
          updateEvents.failEvent({
            eventId: event.event_id,
            retryable: event.event_type !== "zotero_item_deleted",
            diagnostics: [diagnostic],
          });
          failed += 1;
          continue;
        }
        try {
          const matchingMetadataCache =
            upsertLiteratureMatchingMetadataCacheFromRegistryInput(input);
          const updateResult = await lock.runExclusive(libraryId, () =>
            literatureRegistry.upsertPaperFromRegistryInput({
              registryInput: input,
              transactionId: `paper-registry-incremental-${safeFileSegment(paperRef, "paper")}`,
            }),
          );
          maintenance.markCanonicalMutation();
          updateEvents.completeEvent({ eventId: event.event_id });
          updateEvents.recordEvent({
            eventType: "citation_graph_structure_dirty",
            source: "synthesis.paper_registry_incremental_worker",
            scope: { kind: "paper", ref: updateResult.paper_ref },
            sourceHash: updateResult.manifest.manifest_hash,
          });
          if (matchingMetadataCache) {
            await runTopicDiscoveryWorker({
              literatureItemIds: [matchingMetadataCache.literatureItemId],
            });
          }
          const affectedTopicIds = topicIdsForPaperRefs(
            await readArtifactStateRows(root),
            [updateResult.paper_ref],
          );
          if (affectedTopicIds.length) {
            await markTopicFreshnessStatus({
              root,
              topicIds: affectedTopicIds,
              freshness: "queued",
              timestamp: now(),
              reason: {
                code: "paper_registry_changed",
                severity: "info",
                message:
                  "Paper registry changed; topic freshness will be refreshed by the maintenance worker.",
                details: { paper_ref: updateResult.paper_ref },
              },
            });
            for (const topicId of affectedTopicIds) {
              updateEvents.recordEvent({
                eventType: "topic_freshness_dirty",
                source: "synthesis.paper_registry_incremental_worker",
                scope: { kind: "topic", ref: topicId },
                sourceHash: updateResult.manifest.manifest_hash,
              });
            }
          }
          completed += 1;
        } catch (error) {
          const diagnostic = {
            code: "paper_registry_incremental_update_failed",
            severity: "error" as const,
            message: errorMessage(error),
          };
          diagnostics.push(diagnostic);
          updateEvents.failEvent({
            eventId: event.event_id,
            retryable: true,
            diagnostics: [diagnostic],
          });
          failed += 1;
        }
        if (totalCount > 0) {
          reportSynthesisJobProgress({
            jobName,
            runId,
            source: "update_queue",
            label: "Paper registry incremental worker",
            status: "running",
            timeBudgetMs,
            batchLimit,
            processedCount: processed,
            failedCount: failed,
            totalCount,
            progressMode: "determinate",
            message: `${processed}/${totalCount} dirty paper event(s) processed`,
          });
        }
      }
      const elapsedMs = Date.now() - startedAt;
      const budgetExhausted =
        pending.length > processed &&
        processed < batchLimit &&
        elapsedMs >= timeBudgetMs;
      if (budgetExhausted) {
        diagnostics.push({
          code: "paper_registry_incremental_worker_budget_exhausted",
          severity: "warning",
          message: `Paper registry incremental worker exhausted its ${timeBudgetMs}ms budget after ${elapsedMs}ms.`,
        });
      }
      if (totalCount > 0) {
        completeSynthesisJobProgress({
          jobName,
          runId,
          source: "update_queue",
          label: "Paper registry incremental worker",
          timeBudgetMs,
          batchLimit,
          processedCount: processed,
          failedCount: failed,
          totalCount,
          progressMode: "determinate",
          diagnosticsJson: JSON.stringify(diagnostics),
          message: budgetExhausted
            ? "Worker stopped after reaching its time budget."
            : "Worker completed selected dirty paper events.",
        });
      }
      return {
        processed,
        completed,
        failed,
        diagnostics,
        queue: updateEvents.loadQueueState(),
        elapsed_ms: elapsedMs,
        time_budget_ms: timeBudgetMs,
        budget_exhausted: budgetExhausted,
      };
    } finally {
      maintenance.finish();
    }
  }

  function isCitationGraphStructureDirtyEvent(event: SynthesisUpdateEvent) {
    return (
      event.status === "queued" &&
      event.event_type === "citation_graph_structure_dirty" &&
      (event.scope.kind === "paper" ||
        event.scope.kind === "work" ||
        event.scope.kind === "reference_instance" ||
        event.scope.kind === "citation_graph_structure")
    );
  }

  function isCitationGraphComplexMetricsDirtyEvent(
    event: SynthesisUpdateEvent,
  ) {
    return (
      event.status === "queued" &&
      event.event_type === "citation_graph_complex_metrics_dirty"
    );
  }

  function isTopicFreshnessDirtyEvent(event: SynthesisUpdateEvent) {
    return (
      event.status === "queued" &&
      event.event_type === "topic_freshness_dirty" &&
      event.scope.kind === "topic"
    );
  }

  function citationPaperRefFromEvent(event: SynthesisUpdateEvent) {
    if (event.scope.kind === "paper") {
      return cleanString(event.scope.ref);
    }
    return "";
  }

  async function runCitationGraphStructureWorker(
    args: {
      batchLimit?: number;
      timeBudgetMs?: number;
    } = {},
  ) {
    const startedAt = Date.now();
    const jobName = "synthesis:citation-graph-structure-worker";
    const runId = `${jobName}:${now()}`;
    const batchLimit = Math.max(1, Math.floor(Number(args.batchLimit) || 10));
    const timeBudgetMs = Math.max(
      1,
      Math.floor(Number(args.timeBudgetMs) || 2000),
    );
    const queue = updateEvents.loadQueueState();
    const diagnostics: SynthesisUpdateDiagnostic[] = [];
    if (queue.paused) {
      return {
        processed: 0,
        completed: 0,
        failed: 0,
        skipped: "paused",
        diagnostics,
        queue,
      };
    }
    let processed = 0;
    let completed = 0;
    let failed = 0;
    const pending = updateEvents
      .listEvents()
      .filter(isCitationGraphStructureDirtyEvent)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
    const totalCount = Math.min(pending.length, batchLimit);
    if (totalCount > 0) {
      reportSynthesisJobProgress({
        jobName,
        runId,
        source: "update_queue",
        label: "Citation graph structure worker",
        status: "running",
        timeBudgetMs,
        batchLimit,
        processedCount: 0,
        failedCount: 0,
        totalCount,
        progressMode: "determinate",
      });
    }
    for (const event of pending) {
      if (processed >= batchLimit || Date.now() - startedAt >= timeBudgetMs) {
        break;
      }
      processed += 1;
      const paperRef = citationPaperRefFromEvent(event);
      if (!paperRef) {
        const diagnostic = {
          code: "citation_graph_structure_scope_requires_explicit_rebuild",
          severity: "warning" as const,
          message:
            "Citation graph dirty scope cannot be incrementally mapped; run explicit citation graph projection rebuild.",
        };
        diagnostics.push(diagnostic);
        updateEvents.failEvent({
          eventId: event.event_id,
          retryable: false,
          diagnostics: [diagnostic],
        });
        failed += 1;
        continue;
      }
      try {
        const result = await lock.runExclusive(libraryId, () =>
          literatureRegistry.rebuildCitationGraphStructureForPaper({
            paperRef,
          }),
        );
        if (!result.ok) {
          const diagnostic =
            result.diagnostics[0] ||
            ({
              code: "citation_graph_structure_update_failed",
              severity: "warning" as const,
              message:
                "Citation graph structure update did not produce a projection.",
            } satisfies SynthesisUpdateDiagnostic);
          diagnostics.push(diagnostic);
          updateEvents.failEvent({
            eventId: event.event_id,
            retryable: false,
            diagnostics: [diagnostic],
          });
          failed += 1;
          continue;
        }
        updateEvents.completeEvent({ eventId: event.event_id });
        updateEvents.recordEvent({
          eventType: "citation_graph_complex_metrics_dirty",
          source: "synthesis.citation_graph_structure_worker",
          scope: { kind: "citation_graph_structure", ref: "global" },
          sourceHash: result.citationProjection.graph.graph_hash,
        });
        completed += 1;
      } catch (error) {
        const diagnostic = {
          code: "citation_graph_structure_update_failed",
          severity: "error" as const,
          message: errorMessage(error),
        };
        diagnostics.push(diagnostic);
        updateEvents.failEvent({
          eventId: event.event_id,
          retryable: true,
          diagnostics: [diagnostic],
        });
        failed += 1;
      }
      if (totalCount > 0) {
        reportSynthesisJobProgress({
          jobName,
          runId,
          source: "update_queue",
          label: "Citation graph structure worker",
          status: "running",
          timeBudgetMs,
          batchLimit,
          processedCount: processed,
          failedCount: failed,
          totalCount,
          progressMode: "determinate",
          message: `${processed}/${totalCount} graph event(s) processed`,
        });
      }
    }
    if (totalCount > 0) {
      completeSynthesisJobProgress({
        jobName,
        runId,
        source: "update_queue",
        label: "Citation graph structure worker",
        timeBudgetMs,
        batchLimit,
        processedCount: processed,
        failedCount: failed,
        totalCount,
        progressMode: "determinate",
        diagnosticsJson: JSON.stringify(diagnostics),
      });
    }
    return {
      processed,
      completed,
      failed,
      diagnostics,
      queue: updateEvents.loadQueueState(),
    };
  }

  async function runCitationGraphComplexMetricsWorker(
    args: {
      timeBudgetMs?: number;
    } = {},
  ) {
    const startedAt = Date.now();
    const jobName = "synthesis:citation-graph-complex-metrics-worker";
    const runId = `${jobName}:${now()}`;
    const timeBudgetMs = Math.max(
      1,
      Math.floor(Number(args.timeBudgetMs) || 2000),
    );
    const queue = updateEvents.loadQueueState();
    const diagnostics: SynthesisUpdateDiagnostic[] = [];
    if (queue.paused) {
      return {
        processed: 0,
        completed: 0,
        failed: 0,
        skipped: "paused",
        diagnostics,
        queue,
      };
    }
    let processed = 0;
    let completed = 0;
    let failed = 0;
    const pending = updateEvents
      .listEvents()
      .filter(isCitationGraphComplexMetricsDirtyEvent)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
    const totalCount = pending.length;
    if (totalCount > 0) {
      reportSynthesisJobProgress({
        jobName,
        runId,
        source: "update_queue",
        label: "Citation graph complex metrics worker",
        status: "running",
        timeBudgetMs,
        processedCount: 0,
        failedCount: 0,
        totalCount,
        progressMode: "determinate",
      });
    }
    for (const event of pending) {
      if (Date.now() - startedAt >= timeBudgetMs) {
        break;
      }
      processed += 1;
      try {
        const result = await lock.runExclusive(libraryId, () => {
          const {
            graph,
            nodes,
            metrics: lightMetrics,
          } = readFullDbCitationGraphForMetrics();
          if (!nodes.length) {
            return {
              ok: false as const,
              diagnostics: [
                {
                  code: "citation_graph_complex_metrics_missing_structure",
                  severity: "warning" as const,
                  message:
                    "Citation graph complex metrics cannot run without SQLite graph structure rows.",
                },
              ],
            };
          }
          const nodeIdByLiteratureItem = citationGraphNodeIdMap(nodes);
          const literatureItemIdByNodeId = new Map(
            Array.from(nodeIdByLiteratureItem.entries()).map(
              ([literatureItemId, nodeId]) => [nodeId, literatureItemId],
            ),
          );
          const sourceStructureVersion = Math.max(
            0,
            ...lightMetrics.map((metric) => metric.sourceStructureVersion),
          );
          const metrics = computeCitationGraphMetrics(graph);
          const timestamp = now();
          const records = metrics.library_node_metrics
            .map((metric) => {
              const literatureItemId = literatureItemIdByNodeId.get(
                metric.node_id,
              );
              return literatureItemId
                ? complexMetricRecordFromLibraryMetric({
                    metric,
                    literatureItemId,
                    sourceStructureVersion,
                    sourceGraphHash: graph.graph_hash,
                    metricsHash: metrics.metrics_hash,
                    timestamp,
                  })
                : null;
            })
            .filter((record): record is SynthesisCitationComplexMetricsRecord =>
              Boolean(record),
            );
          synthesisRepository.replaceCitationComplexMetrics(records);
          return {
            ok: true as const,
            graphHash: graph.graph_hash,
            metricsHash: metrics.metrics_hash,
            count: records.length,
          };
        });
        if (!result.ok) {
          const diagnostic = result.diagnostics[0];
          diagnostics.push(diagnostic);
          updateEvents.failEvent({
            eventId: event.event_id,
            retryable: false,
            diagnostics: [diagnostic],
          });
          failed += 1;
          continue;
        }
        updateEvents.completeEvent({ eventId: event.event_id });
        completed += 1;
      } catch (error) {
        const diagnostic = {
          code: "citation_graph_complex_metrics_failed",
          severity: "error" as const,
          message: errorMessage(error),
        };
        diagnostics.push(diagnostic);
        updateEvents.failEvent({
          eventId: event.event_id,
          retryable: true,
          diagnostics: [diagnostic],
        });
        failed += 1;
      }
      if (totalCount > 0) {
        reportSynthesisJobProgress({
          jobName,
          runId,
          source: "update_queue",
          label: "Citation graph complex metrics worker",
          status: "running",
          timeBudgetMs,
          processedCount: processed,
          failedCount: failed,
          totalCount,
          progressMode: "determinate",
          message: `${processed}/${totalCount} metrics event(s) processed`,
        });
      }
    }
    if (totalCount > 0) {
      completeSynthesisJobProgress({
        jobName,
        runId,
        source: "update_queue",
        label: "Citation graph complex metrics worker",
        timeBudgetMs,
        processedCount: processed,
        failedCount: failed,
        totalCount,
        progressMode: "determinate",
        diagnosticsJson: JSON.stringify(diagnostics),
      });
    }
    return {
      processed,
      completed,
      failed,
      diagnostics,
      queue: updateEvents.loadQueueState(),
    };
  }

  async function runCitationGraphLayoutWorker(
    args: {
      preset?: CitationLayoutPreset;
      force?: boolean;
      timeBudgetMs?: number;
    } = {},
  ) {
    const startedAt = Date.now();
    const jobName = "synthesis:citation-graph-layout-worker";
    const runId = `${jobName}:${now()}`;
    const preset = normalizeCitationLayoutPreset(args.preset);
    const viewKey = "workbench_overview";
    const timeBudgetMs = Math.max(
      1,
      Math.floor(Number(args.timeBudgetMs) || 2000),
    );
    const queue = updateEvents.loadQueueState();
    const diagnostics: SynthesisUpdateDiagnostic[] = [];
    if (queue.paused) {
      return {
        processed: 0,
        completed: 0,
        failed: 0,
        skipped: "paused",
        diagnostics,
        queue,
      };
    }
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
        preset,
        graphHash: graph.graph_hash,
        diagnosticsJson: JSON.stringify(diagnostics),
      });
      return {
        processed: 1,
        completed: 0,
        failed: 1,
        diagnostics,
        queue,
      };
    }
    const existing = synthesisRepository.getCitationGraphLayoutState({
      viewKey,
      preset,
    });
    const existingLayout = parseCitationGraphLayout(existing);
    if (
      !args.force &&
      existing?.status === "ready" &&
      existing.graphHash === graph.graph_hash &&
      existingLayout?.graph_hash === graph.graph_hash
    ) {
      return {
        processed: 0,
        completed: 0,
        failed: 0,
        skipped: "ready",
        diagnostics,
        queue,
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
        queue,
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
      synthesisRepository.markCitationGraphLayoutRunning({
        viewKey,
        preset,
        graphHash: graph.graph_hash,
      });
      const layout = await lock.runExclusive(libraryId, () =>
        computeCitationGraphLayout(graph, preset),
      );
      synthesisRepository.upsertCitationGraphLayoutState({
        layoutKey: synthesisRepository.citationLayoutKey({ viewKey, preset }),
        viewKey,
        preset,
        graphHash: graph.graph_hash,
        status: "ready",
        layoutJson: JSON.stringify(layout),
        diagnosticsJson: JSON.stringify(diagnostics),
        updatedAt: now(),
      });
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
        queue: updateEvents.loadQueueState(),
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
        preset,
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
        queue: updateEvents.loadQueueState(),
      };
    }
  }

  async function registryRowsForTopicFreshnessWorker() {
    return synthesisRepository
      .listPaperRegistryFacts({ limit: 1000 })
      .entries.map(paperRegistryRowFromFact);
  }

  async function runTopicFreshnessWorker(
    args: {
      batchLimit?: number;
      timeBudgetMs?: number;
    } = {},
  ) {
    const startedAt = Date.now();
    const jobName = "synthesis:topic-freshness-worker";
    const runId = `${jobName}:${now()}`;
    const batchLimit = Math.max(1, Math.floor(Number(args.batchLimit) || 10));
    const timeBudgetMs = Math.max(
      1,
      Math.floor(Number(args.timeBudgetMs) || 2000),
    );
    const queue = updateEvents.loadQueueState();
    const diagnostics: SynthesisUpdateDiagnostic[] = [];
    if (queue.paused) {
      return {
        processed: 0,
        completed: 0,
        failed: 0,
        skipped: "paused",
        diagnostics,
        queue,
      };
    }
    let processed = 0;
    let completed = 0;
    let failed = 0;
    const pending = updateEvents
      .listEvents()
      .filter(isTopicFreshnessDirtyEvent)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
    const totalCount = Math.min(pending.length, batchLimit);
    if (totalCount > 0) {
      reportSynthesisJobProgress({
        jobName,
        runId,
        source: "update_queue",
        label: "Topic freshness worker",
        status: "running",
        timeBudgetMs,
        batchLimit,
        processedCount: 0,
        failedCount: 0,
        totalCount,
        progressMode: "determinate",
      });
    }
    for (const event of pending) {
      if (processed >= batchLimit || Date.now() - startedAt >= timeBudgetMs) {
        break;
      }
      processed += 1;
      const topicId = cleanString(event.scope.ref);
      if (!topicId) {
        const diagnostic = {
          code: "topic_freshness_scope_missing",
          severity: "warning" as const,
          message: "Topic freshness dirty event did not include a topic id.",
        };
        diagnostics.push(diagnostic);
        updateEvents.failEvent({
          eventId: event.event_id,
          retryable: false,
          diagnostics: [diagnostic],
        });
        failed += 1;
        continue;
      }
      try {
        await markTopicFreshnessStatus({
          root,
          topicIds: [topicId],
          freshness: "running",
          timestamp: now(),
          reason: {
            code: "topic_freshness_running",
            severity: "info",
            message: "Topic freshness refresh is running.",
          },
        });
        const rows = await readIndexRows(root);
        if (!rows.some((row) => row.topic_id === topicId)) {
          const diagnostic = {
            code: "topic_freshness_topic_missing",
            severity: "warning" as const,
            message:
              "Topic freshness dirty event refers to a topic that is not indexed.",
          };
          diagnostics.push(diagnostic);
          await markTopicFreshnessStatus({
            root,
            topicIds: [topicId],
            freshness: "failed",
            timestamp: now(),
            reason: {
              code: diagnostic.code,
              severity: diagnostic.severity,
              message: diagnostic.message,
            },
          });
          updateEvents.failEvent({
            eventId: event.event_id,
            retryable: false,
            diagnostics: [diagnostic],
          });
          failed += 1;
          continue;
        }
        await scanTopicFreshness({
          root,
          rows,
          registryRows: await registryRowsForTopicFreshnessWorker(),
          timestamp: now(),
          topicIds: new Set([topicId]),
        });
        updateEvents.completeEvent({ eventId: event.event_id });
        completed += 1;
      } catch (error) {
        const diagnostic = {
          code: "topic_freshness_refresh_failed",
          severity: "error" as const,
          message: errorMessage(error),
        };
        diagnostics.push(diagnostic);
        await markTopicFreshnessStatus({
          root,
          topicIds: [topicId],
          freshness: "failed",
          timestamp: now(),
          reason: {
            code: diagnostic.code,
            severity: diagnostic.severity,
            message: diagnostic.message,
          },
        }).catch(() => undefined);
        updateEvents.failEvent({
          eventId: event.event_id,
          retryable: true,
          diagnostics: [diagnostic],
        });
        failed += 1;
      }
      if (totalCount > 0) {
        reportSynthesisJobProgress({
          jobName,
          runId,
          source: "update_queue",
          label: "Topic freshness worker",
          status: "running",
          timeBudgetMs,
          batchLimit,
          processedCount: processed,
          failedCount: failed,
          totalCount,
          progressMode: "determinate",
          message: `${processed}/${totalCount} topic event(s) processed`,
        });
      }
    }
    if (totalCount > 0) {
      completeSynthesisJobProgress({
        jobName,
        runId,
        source: "update_queue",
        label: "Topic freshness worker",
        timeBudgetMs,
        batchLimit,
        processedCount: processed,
        failedCount: failed,
        totalCount,
        progressMode: "determinate",
        diagnosticsJson: JSON.stringify(diagnostics),
      });
    }
    return {
      processed,
      completed,
      failed,
      diagnostics,
      queue: updateEvents.loadQueueState(),
    };
  }

  async function runTopicDiscoveryWorker(
    args: {
      topicIds?: string[];
      literatureItemIds?: string[];
      minScore?: number;
    } = {},
  ) {
    const queue = updateEvents.loadQueueState();
    if (queue.paused) {
      return {
        processed: 0,
        completed: 0,
        failed: 0,
        skipped: "paused",
        diagnostics: [],
        queue,
      };
    }
    try {
      const timestamp = now();
      const result = synthesisRepository.rebuildTopicDiscoveryHints({
        topicIds: args.topicIds,
        literatureItemIds: args.literatureItemIds,
        minScore: args.minScore,
        timestamp,
      });
      await refreshTopicDiscoveryState({
        topicIds: synthesisRepository
          .listTopicInterestMetadata({ topicIds: args.topicIds })
          .map((topic) => topic.topicId),
        timestamp,
      });
      return {
        processed: result.scannedTopics * result.scannedLiterature,
        completed: result.upserted,
        failed: 0,
        result,
        diagnostics: result.diagnostics,
        queue: updateEvents.loadQueueState(),
      };
    } catch (error) {
      const diagnostic = {
        code: "topic_discovery_worker_failed",
        severity: "error" as const,
        message: errorMessage(error),
      };
      return {
        processed: 0,
        completed: 0,
        failed: 1,
        diagnostics: [diagnostic],
        queue: updateEvents.loadQueueState(),
      };
    }
  }

  async function runSynthesisStartupReconcile(
    args: {
      batchLimit?: number;
    } = {},
  ) {
    const batchLimit = Math.max(1, Math.floor(Number(args.batchLimit) || 500));
    const jobName = "synthesis:startup-reconcile";
    const runId = `${jobName}:${now()}`;
    reportSynthesisJobProgress({
      jobName,
      runId,
      source: "startup_reconcile",
      label: "Startup reconcile",
      status: "running",
      batchLimit,
      progressMode: "indeterminate",
      message: "Loading Zotero metadata fingerprints",
    });
    const profile = maybeStartSynthesisJobProfileRun({
      root,
      now,
      jobName: "synthesis.startup_reconcile",
      trigger: "startup_reconcile",
      batchLimit,
    });
    updateEvents.recordStartupReconcileState({
      state: "checking",
      dirtyCount: 0,
      diagnostics: [],
    });
    try {
      const loadInputRowsPhase = profile.phase("load_input_rows");
      const fingerprints =
        typeof options.libraryAdapter?.getRegistryMetadataFingerprints ===
        "function"
          ? await options.libraryAdapter.getRegistryMetadataFingerprints({
              libraryId,
              limit: batchLimit,
            })
          : (options.registryInputs || [])
              .slice(0, batchLimit)
              .map(registryMetadataFingerprintFromInput);
      loadInputRowsPhase.end({
        counters: { fingerprint_count: fingerprints.length },
      });
      reportSynthesisJobProgress({
        jobName,
        runId,
        source: "startup_reconcile",
        label: "Startup reconcile",
        status: "running",
        batchLimit,
        processedCount: 0,
        totalCount: fingerprints.length,
        progressMode: fingerprints.length > 0 ? "determinate" : "indeterminate",
        phase: "scan_fingerprints",
        phaseLabel: "Scanning fingerprints",
      });
      const loadExistingRowsPhase = profile.phase("load_existing_rows");
      const currentFacts = synthesisRepository.listPaperRegistryFacts({
        paperRefs: fingerprints.map((fingerprint) => fingerprint.paper_ref),
        limit: Math.max(1, fingerprints.length),
      });
      const currentByRef = new Map(
        currentFacts.entries.map((fact) => {
          const row = paperRegistryRowFromFact(fact);
          return [row.paper_ref, row] as const;
        }),
      );
      loadExistingRowsPhase.end({
        counters: { current_paper_count: currentByRef.size },
      });
      const computeDeltaPhase = profile.phase("compute_delta");
      let dirtyCount = 0;
      let scannedCount = 0;
      for (const fingerprint of fingerprints) {
        scannedCount += 1;
        const current = currentByRef.get(fingerprint.paper_ref);
        if (!current) {
          reportSynthesisJobProgress({
            jobName,
            runId,
            source: "startup_reconcile",
            label: "Startup reconcile",
            status: "running",
            batchLimit,
            processedCount: scannedCount,
            totalCount: fingerprints.length,
            progressMode:
              fingerprints.length > 0 ? "determinate" : "indeterminate",
            phase: "scan_fingerprints",
            phaseLabel: "Scanning fingerprints",
            message: `${dirtyCount} dirty known item(s) detected`,
          });
          continue;
        }
        const currentHash = current?.facets?.metadata?.hash || "";
        if (currentHash !== fingerprint.hash || Boolean(fingerprint.deleted)) {
          dirtyCount += 1;
          updateEvents.recordEvent({
            eventType: "startup_reconcile_detected_dirty_items",
            source: "synthesis.startup_reconcile",
            scope: { kind: "zotero_item", ref: fingerprint.item_key },
            sourceHash: fingerprint.hash,
            diagnostics: fingerprint.deleted
              ? [
                  {
                    code: "zotero_item_deleted",
                    severity: "info",
                    message: "Startup reconcile detected a deleted item.",
                  },
                ]
              : undefined,
          });
        }
        reportSynthesisJobProgress({
          jobName,
          runId,
          source: "startup_reconcile",
          label: "Startup reconcile",
          status: "running",
          batchLimit,
          processedCount: scannedCount,
          totalCount: fingerprints.length,
          progressMode:
            fingerprints.length > 0 ? "determinate" : "indeterminate",
          phase: "scan_fingerprints",
          phaseLabel: "Scanning fingerprints",
          message: `${dirtyCount} dirty known item(s) detected`,
        });
      }
      computeDeltaPhase.end({
        counters: { dirty_count: dirtyCount },
      });
      const state = updateEvents.recordStartupReconcileState({
        state: dirtyCount > 0 ? "queued" : "ready",
        dirtyCount,
        diagnostics: [],
      });
      if (profile.enabled) {
        await profile.finish({
          status:
            state.startup_reconcile.state === "queued" ? "queued" : "ready",
          processedCount: fingerprints.length,
          skippedCount: 0,
          failedCount: 0,
          counters: {
            fingerprint_count: fingerprints.length,
            dirty_count: dirtyCount,
          },
          diagnostics: [],
        });
      }
      completeSynthesisJobProgress({
        jobName,
        runId,
        source: "startup_reconcile",
        label: "Startup reconcile",
        batchLimit,
        processedCount: fingerprints.length,
        totalCount: fingerprints.length,
        progressMode: fingerprints.length > 0 ? "determinate" : "indeterminate",
        phase: "scan_fingerprints",
        phaseLabel: "Scanning fingerprints",
        message:
          dirtyCount > 0
            ? `${dirtyCount} dirty known item(s) detected`
            : "No dirty items detected",
      });
      return state;
    } catch (error) {
      const state = updateEvents.recordStartupReconcileState({
        state: "failed_retryable",
        dirtyCount: 0,
        diagnostics: [
          {
            code: "startup_reconcile_failed",
            severity: "error",
            message: errorMessage(error),
          },
        ],
      });
      if (profile.enabled) {
        await profile.finish({
          status: "failed_retryable",
          processedCount: 0,
          skippedCount: 0,
          failedCount: 1,
          diagnostics: state.startup_reconcile.diagnostics,
        });
      }
      failSynthesisJobProgress({
        jobName,
        runId,
        source: "startup_reconcile",
        label: "Startup reconcile",
        batchLimit,
        progressMode: "indeterminate",
        diagnosticsJson: JSON.stringify(state.startup_reconcile.diagnostics),
        message: "Startup reconcile failed.",
      });
      return state;
    }
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

  function synthesisDebugJobs(input: Record<string, unknown> = {}) {
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
    const rows = synthesisRepository
      .listActiveJobProgress({ includeCompleted })
      .filter((row) => !statuses.size || statuses.has(cleanString(row.status)))
      .filter((row) => !sources.size || sources.has(cleanString(row.source)))
      .slice(0, limit);
    return {
      rows,
      truncated:
        synthesisRepository.listActiveJobProgress({ includeCompleted }).length >
        rows.length,
    };
  }

  function synthesisDebugQueueEvents(input: Record<string, unknown> = {}) {
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
    const eventTypes = new Set(
      (Array.isArray(input.eventTypes)
        ? input.eventTypes
        : cleanString(input.eventType || input.event_type)
          ? [input.eventType || input.event_type]
          : []
      )
        .map(cleanString)
        .filter(Boolean),
    );
    const scopeKind = cleanString(input.scopeKind || input.scope_kind);
    const scopeRef = cleanString(input.scopeRef || input.scope_ref);
    const rows = updateEvents
      .listEvents()
      .filter((event) => !statuses.size || statuses.has(event.status))
      .filter((event) => !eventTypes.size || eventTypes.has(event.event_type))
      .filter((event) => !scopeKind || event.scope.kind === scopeKind)
      .filter((event) => !scopeRef || event.scope.ref === scopeRef)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
    return {
      rows: rows.slice(0, limit),
      total: rows.length,
      truncated: rows.length > limit,
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

  function literatureItemIdForDebugPaperRef(paperRef: string) {
    const parsed = parsePaperRef(paperRef);
    if (!parsed?.itemKey) {
      return "";
    }
    const binding = synthesisRepository
      .listZoteroBindings({ statuses: ["active"] })
      .find(
        (entry) =>
          entry.libraryId === parsed.libraryId &&
          entry.itemKey === parsed.itemKey,
      );
    return binding?.literatureItemId || "";
  }

  function matchingMetadataAvailability(input: PaperRegistryInput | null) {
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
    const queue = updateEvents.loadQueueState();
    const events = synthesisDebugQueueEvents(rawInput);
    const jobs = synthesisDebugJobs(rawInput);
    const includeUiSnapshot = rawInput.includeUiSnapshot !== false;
    return debugEnvelope("host_bridge.debug.synthesis.snapshot.v1", rawInput, {
      queue,
      dirtyEvents: events.rows,
      jobs: jobs.rows,
      citationLayouts: synthesisRepository.listCitationGraphLayoutStates({
        viewKey: "workbench_overview",
      }),
      tableCounts: synthesisDebugTableCounts(),
      maintenance: {
        updateQueue: queue,
        canonical: canonicalMaintenanceStatus(),
      },
      uiSnapshot: includeUiSnapshot
        ? await getSynthesisSnapshot(createDefaultSynthesisUiState())
        : undefined,
      truncated: events.truncated || jobs.truncated,
    });
  }

  async function debugSynthesisQueueList(
    rawInput: Record<string, unknown> = {},
  ) {
    const events = synthesisDebugQueueEvents(rawInput);
    return debugEnvelope("host_bridge.debug.synthesis.queue.v1", rawInput, {
      queue: updateEvents.loadQueueState(),
      rows: events.rows,
      total: events.total,
      truncated: events.truncated,
    });
  }

  async function debugSynthesisJobsList(
    rawInput: Record<string, unknown> = {},
  ) {
    const jobs = synthesisDebugJobs(rawInput);
    return debugEnvelope("host_bridge.debug.synthesis.jobs.v1", rawInput, {
      rows: jobs.rows,
      truncated: jobs.truncated,
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
    const facts = synthesisRepository.listPaperRegistryFacts({
      paperRefs: [paperRef],
      limit: 1,
    });
    const fact = facts.entries[0] || null;
    const literatureItemId =
      fact?.literatureItemId || literatureItemIdForDebugPaperRef(paperRef);
    const registryInput = await resolveRegistryInputForPaperRef(paperRef);
    const currentMatching = matchingMetadataAvailability(registryInput);
    const cachedMatching = literatureItemId
      ? synthesisRepository.getLiteratureMatchingMetadata(literatureItemId)
      : null;
    return debugEnvelope(
      "host_bridge.debug.synthesis.paper.inspect.v1",
      rawInput,
      {
        paperRef,
        literatureItemId,
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
          paperRegistryFact: fact,
          artifacts: literatureItemId
            ? synthesisRepository.listArtifactStates({
                literatureItemIds: [literatureItemId],
              })
            : [],
          literatureMatchingMetadata: cachedMatching,
          citationNode: literatureItemId
            ? synthesisRepository.listCitationNodes({
                literatureItemIds: [literatureItemId],
                limit: 1,
              })[0] || null
            : null,
        },
        diff: {
          matchingMetadataPayloadMissingInZotero: !currentMatching.available,
          matchingMetadataCacheMissingInRepository:
            currentMatching.available && !cachedMatching,
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
    const facts = synthesisRepository.listPaperRegistryFacts({ limit });
    const issues: Array<Record<string, unknown>> = [];
    for (const fact of facts.entries) {
      const paperRef = `${fact.libraryId}:${fact.itemKey}`;
      const registryInput = await resolveRegistryInputForPaperRef(paperRef);
      const currentMatching = matchingMetadataAvailability(registryInput);
      const cachedMatching = synthesisRepository.getLiteratureMatchingMetadata(
        fact.literatureItemId,
      );
      if (currentMatching.available && !cachedMatching) {
        issues.push({
          code: "matching_metadata_cache_missing",
          paperRef,
          literatureItemId: fact.literatureItemId,
          severity: "warning",
        });
      }
      if (!registryInput) {
        issues.push({
          code: "zotero_registry_input_unavailable",
          paperRef,
          literatureItemId: fact.literatureItemId,
          severity: "warning",
        });
      }
    }
    const activeLiteratureIds = new Set(
      synthesisRepository
        .listZoteroBindings({ statuses: ["active"] })
        .map((binding) => binding.literatureItemId),
    );
    for (const metadata of synthesisRepository.listLiteratureMatchingMetadata()) {
      if (!activeLiteratureIds.has(metadata.literatureItemId)) {
        issues.push({
          code: "orphan_matching_metadata_cache",
          literatureItemId: metadata.literatureItemId,
          severity: "info",
        });
      }
    }
    return debugEnvelope("host_bridge.debug.synthesis.diff.v1", rawInput, {
      scanned: facts.returned,
      issues: issues.slice(0, limit),
      queuedEvents: updateEvents
        .listEvents()
        .filter((event) => event.status === "queued")
        .slice(0, limit),
      truncated: facts.hasMore || issues.length > limit,
    });
  }

  async function debugSynthesisWorkerRun(
    rawInput: Record<string, unknown> = {},
  ) {
    const worker = cleanString(rawInput.worker);
    const before = {
      queue: updateEvents.loadQueueState(),
      jobs: synthesisDebugJobs({ limit: 25 }).rows,
      tableCounts: synthesisDebugTableCounts(),
    };
    const batchLimit = Math.max(
      1,
      Math.floor(Number(rawInput.batchLimit) || 10),
    );
    const timeBudgetMs = Math.max(
      1,
      Math.floor(Number(rawInput.timeBudgetMs) || 2000),
    );
    let result: unknown;
    if (worker === "startupReconcile") {
      result = await runSynthesisStartupReconcile({ batchLimit });
    } else if (worker === "paperRegistryIncremental") {
      result = await runPaperRegistryIncrementalWorker({
        batchLimit,
        timeBudgetMs,
      });
    } else if (worker === "citationGraphStructure") {
      result = await runCitationGraphStructureWorker({
        batchLimit,
        timeBudgetMs,
      });
    } else if (worker === "citationGraphComplexMetrics") {
      result = await runCitationGraphComplexMetricsWorker({
        timeBudgetMs,
      });
    } else if (worker === "citationGraphLayout") {
      result = await runCitationGraphLayoutWorker({
        preset: normalizeCitationLayoutPreset(rawInput.preset),
        force: Boolean(rawInput.force),
        timeBudgetMs,
      });
    } else if (worker === "topicFreshness") {
      result = await runTopicFreshnessWorker({
        batchLimit,
        timeBudgetMs,
      });
    } else if (worker === "topicDiscovery") {
      result = await runTopicDiscoveryWorker({
        topicIds: Array.isArray(rawInput.topicIds)
          ? rawInput.topicIds.map(cleanString).filter(Boolean)
          : undefined,
        literatureItemIds: Array.isArray(rawInput.literatureItemIds)
          ? rawInput.literatureItemIds.map(cleanString).filter(Boolean)
          : undefined,
      });
    } else {
      throw new Error(`unsupported debug synthesis worker: ${worker}`);
    }
    const after = {
      queue: updateEvents.loadQueueState(),
      jobs: synthesisDebugJobs({ limit: 25, includeCompleted: true }).rows,
      tableCounts: synthesisDebugTableCounts(),
    };
    return debugEnvelope(
      "host_bridge.debug.synthesis.worker_run.v1",
      rawInput,
      {
        worker,
        before,
        result,
        after,
        jobProgress: after.jobs,
        truncated: false,
      },
    );
  }

  async function debugSynthesisMaintenanceRun(
    rawInput: Record<string, unknown> = {},
  ) {
    const batchLimit = Math.max(
      1,
      Math.floor(Number(rawInput.batchLimit) || 10),
    );
    const timeBudgetMs = Math.max(
      1,
      Math.floor(Number(rawInput.timeBudgetMs) || 2000),
    );
    const before = {
      queue: updateEvents.loadQueueState(),
      tableCounts: synthesisDebugTableCounts(),
    };
    const steps = [
      {
        worker: "paperRegistryIncremental",
        result: await runPaperRegistryIncrementalWorker({
          batchLimit,
          timeBudgetMs,
        }),
      },
      {
        worker: "citationGraphStructure",
        result: await runCitationGraphStructureWorker({
          batchLimit,
          timeBudgetMs,
        }),
      },
      {
        worker: "citationGraphComplexMetrics",
        result: await runCitationGraphComplexMetricsWorker({
          timeBudgetMs,
        }),
      },
      {
        worker: "topicFreshness",
        result: await runTopicFreshnessWorker({
          batchLimit,
          timeBudgetMs,
        }),
      },
    ];
    const after = {
      queue: updateEvents.loadQueueState(),
      tableCounts: synthesisDebugTableCounts(),
      jobs: synthesisDebugJobs({ limit: 25, includeCompleted: true }).rows,
    };
    return debugEnvelope(
      "host_bridge.debug.synthesis.maintenance_run.v1",
      rawInput,
      {
        before,
        steps,
        after,
        truncated: false,
      },
    );
  }

  async function debugSynthesisQueueControl(
    rawInput: Record<string, unknown> = {},
  ) {
    const action = cleanString(rawInput.action) as
      | "enqueue"
      | "retry"
      | "pause"
      | "resume";
    let result: unknown;
    if (action === "enqueue") {
      result = await recordSynthesisUpdateEvent({
        eventType: cleanString(
          rawInput.eventType || rawInput.event_type,
        ) as SynthesisUpdateEventType,
        source: cleanString(rawInput.source) || "host_bridge.debug",
        scope: {
          kind: cleanString(
            rawInput.scopeKind || rawInput.scope_kind,
          ) as SynthesisUpdateScopeKind,
          ref: cleanString(rawInput.scopeRef || rawInput.scope_ref),
        },
        sourceHash: cleanString(rawInput.sourceHash || rawInput.source_hash),
      });
    } else if (action === "retry") {
      result = await retrySynthesisUpdateQueue();
    } else if (action === "pause") {
      result = await pauseSynthesisUpdates();
    } else {
      result = await resumeSynthesisUpdates();
    }
    return debugEnvelope(
      "host_bridge.debug.synthesis.queue_control.v1",
      rawInput,
      {
        action,
        result,
        queue: updateEvents.loadQueueState(),
        truncated: false,
      },
    );
  }

  async function debugSynthesisJobsClearStale(
    rawInput: Record<string, unknown> = {},
  ) {
    const staleBefore =
      cleanString(rawInput.staleBefore || rawInput.stale_before) ||
      new Date(
        Date.now() - Math.max(1, Math.floor(Number(rawInput.olderThanMs) || 0)),
      ).toISOString();
    const staleRows = synthesisRepository.clearStaleJobProgress({
      staleBefore,
    });
    return debugEnvelope(
      "host_bridge.debug.synthesis.jobs.clear_stale.v1",
      rawInput,
      {
        staleBefore,
        staleRows,
        jobs: synthesisDebugJobs({ includeCompleted: true }).rows,
        truncated: false,
      },
    );
  }

  async function debugSynthesisQueueClear(
    rawInput: Record<string, unknown> = {},
  ) {
    const confirmationText = cleanString(rawInput.confirmationText);
    const dryRun = rawInput.dryRun !== false;
    if (!dryRun && confirmationText !== "CLEAR SYNTHESIS DEBUG QUEUE") {
      return debugEnvelope(
        "host_bridge.debug.synthesis.queue.clear.v1",
        rawInput,
        {
          ok: false,
          status: "confirmation_mismatch",
          requiredConfirmationText: "CLEAR SYNTHESIS DEBUG QUEUE",
          queue: updateEvents.loadQueueState(),
          truncated: false,
        },
      );
    }
    const before = synthesisDebugQueueEvents({ limit: 1000 });
    if (dryRun) {
      return debugEnvelope(
        "host_bridge.debug.synthesis.queue.clear.v1",
        rawInput,
        {
          ok: true,
          dryRun: true,
          wouldDelete: before.total,
          rows: before.rows,
          truncated: before.truncated,
        },
      );
    }
    const result = synthesisRepository.clearDirtyEvents();
    synthesisRepository.deleteJobProgress("synthesis:update-queue-state");
    return debugEnvelope(
      "host_bridge.debug.synthesis.queue.clear.v1",
      rawInput,
      {
        ok: true,
        dryRun: false,
        result,
        queue: updateEvents.loadQueueState(),
        truncated: false,
      },
    );
  }

  async function debugSynthesisCleanInstallReset(
    rawInput: Record<string, unknown> = {},
  ) {
    const confirmationText = cleanString(rawInput.confirmationText);
    const dryRun = rawInput.dryRun !== false;
    const runtimePaths = getRuntimePersistencePaths(runtimeRoot);
    const synthesisDataRoot = runtimePaths.synthesisDataRoot;
    const synthesisRuntimeRoot = resolveSynthesisRuntimeFileRoot(runtimeRoot);
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
        queue: updateEvents.loadQueueState(),
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

  async function rebuildTagVocabularyIndex() {
    return tagVocabulary.rebuildTagIndexProjection();
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

  async function exportConceptKbCheckpoint(
    args?: Parameters<typeof conceptKb.exportConceptKbCheckpoint>[0],
  ) {
    return runCanonicalWriteWithAutosync(() =>
      conceptKb.exportConceptKbCheckpoint(args),
    );
  }

  async function rebuildConceptKbIndex() {
    return conceptKb.rebuildConceptKbIndexProjection();
  }

  async function loadTopicGraph() {
    return topicGraph.loadTopicGraph();
  }

  async function exportTopicGraphCheckpoint(
    args?: Parameters<typeof topicGraph.exportTopicGraphCheckpoint>[0],
  ) {
    return runCanonicalWriteWithAutosync(() =>
      topicGraph.exportTopicGraphCheckpoint(args),
    );
  }

  async function rebuildTopicGraphIndex() {
    return topicGraph.rebuildTopicGraphIndexProjection();
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

  async function loadLiteratureRegistry() {
    return literatureRegistry.loadLiteratureRegistry();
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

  async function rebuildLiteratureRegistry() {
    return runCanonicalWriteWithAutosync(async () =>
      literatureRegistry.rebuildLiteratureRegistry({
        registryInputs: await registryInputsForService(options),
        citationGraphPapers: await graphInputsForService(options),
        transactionId: "literature-registry-rebuild",
      }),
    );
  }

  async function rebuildCitationGraphProjection() {
    return lock.runExclusive(libraryId, () =>
      literatureRegistry.rebuildCitationGraphProjection(),
    );
  }

  async function readCitationGraphSnapshot() {
    return literatureRegistry.readCitationGraphProjection();
  }

  async function listCleanupProposals() {
    return literatureRegistry.listCleanupProposals();
  }

  async function applyCleanupProposalAction(args: {
    proposalId: string;
    action: LiteratureRegistryCleanupAction;
    targetPaperRef?: string;
    targetLiteratureItemId?: string;
  }) {
    if (
      args.action === "confirm_delete_item" ||
      args.action === "mark_as_dedupe_merge" ||
      args.action === "keep_for_now"
    ) {
      return synthesisRepository.applyIndexReviewAction({
        reviewItemId: args.proposalId,
        action: args.action,
        targetPaperRef: args.targetPaperRef,
        targetLiteratureItemId: args.targetLiteratureItemId,
      });
    }
    return runCanonicalWriteWithAutosync(() =>
      literatureRegistry.applyCleanupProposalAction(args),
    );
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
    const reviewInput = buildReviewWorkflowInput({
      topic: {
        topic_id: topicId,
        title: metadata.title,
        markdown: artifact.markdown,
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

  async function getPaperRegistry(args: Record<string, unknown> = {}) {
    const projectionStale = false;
    const refs = normalizeArray(
      args.paperRefs || args.paper_refs || args.paperRef || args.paper_ref,
    )
      .map(cleanString)
      .filter(Boolean);
    const page = synthesisRepository.listPaperRegistryFacts({
      paperRefs: refs,
      cursor: args.cursor,
      limit: args.limit,
    });
    const rows = page.entries.map(paperRegistryRowFromFact);
    const sqliteMissing = page.total === 0;
    const readHintsForCall: SynthesisReadHint[] = [];
    if (sqliteMissing) {
      readHintsForCall.push(
        recordReadHint({
          code: "paper_registry_projection_missing",
          scope: "paper-registry",
        }),
      );
    }
    if (projectionStale) {
      readHintsForCall.push(
        recordReadHint({
          code: "paper_registry_projection_stale",
          scope: "paper-registry",
        }),
      );
    }
    return {
      rows,
      cursor: String(page.cursor),
      next_cursor: page.nextCursor === null ? "" : String(page.nextCursor),
      has_more: page.hasMore,
      returned: rows.length,
      total: page.total,
      limit: page.limit,
      diagnostics: {
        projection_found: !sqliteMissing,
        storage: "sqlite",
        stale: projectionStale,
        warnings: [
          ...(sqliteMissing
            ? ["literature registry SQLite rows are missing"]
            : []),
          ...(projectionStale
            ? ["literature registry projection is stale"]
            : []),
        ],
        recommended_commands:
          sqliteMissing || projectionStale
            ? ["runLiteratureRegistryJobNow"]
            : [],
        maintenance: readMaintenanceForDto(
          sqliteMissing || projectionStale
            ? ["runLiteratureRegistryJobNow"]
            : [],
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

  async function getCitationGraphMetrics(
    args: Record<string, unknown> = {},
  ): Promise<SynthesisCitationGraphMetricsResult> {
    const normalized = normalizeGraphMetricsArgs(args);
    return readDbCitationMetrics(normalized);
  }

  async function queryCitationGraph() {
    return {
      ...readDbCitationGraphOverview(),
      maintenance: readMaintenanceForDto(),
    };
  }

  async function listTopics() {
    const definitions: Record<string, Record<string, unknown>> = {};
    const topicGraphSnapshot = await topicGraph
      .loadTopicGraph()
      .catch(() => undefined);
    const topics = topicInventoryRowsFromGraphNodes({
      nodes: topicGraphSnapshot?.nodes || [],
      definitions,
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
      const topicGraphSnapshot = await topicGraph
        .loadTopicGraph()
        .catch(() => undefined);
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
    const topicGraphSnapshot = await topicGraph
      .loadTopicGraph()
      .catch(() => undefined);
    const topicNode = (topicGraphSnapshot?.nodes || []).find(
      (node) => cleanString(node.topic_id) === topicId,
    );
    if (!topicNode) {
      return {
        ok: false,
        status: "not_found",
        topic_id: topicId,
        diagnostics: {
          message: `topic artifact is not available in the synthesis database: ${topicId}`,
        },
      };
    }
    if (
      topicNode.definition_status === "deleted" ||
      (await readDeletedRows(root)).some((row) => row.topic_id === topicId)
    ) {
      return {
        ok: false,
        status: "deleted",
        topic_id: topicId,
        diagnostics: {
          message: `topic artifact is deleted: ${topicId}`,
        },
      };
    }
    const artifactState = await readArtifactStateRows(root);
    const artifact = await readTopicArtifact({ topicId });
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
    const topicRow = topicIndexRowFromGraphNode(topicNode);
    const currentManifest = (artifact.manifest || {}) as Record<
      string,
      unknown
    >;
    const sectionHashes = isObject(currentManifest.section_hashes)
      ? (currentManifest.section_hashes as Record<string, unknown>)
      : {};
    const hashes = await currentHashes(root, topicId);
    const freshness = artifactState[topicId] || null;
    const discoveryHints = synthesisRepository.listTopicDiscoveryHints({
      topicIds: [topicId],
      statuses: ["open"],
      limit: 25,
    });
    const metadata = artifact.metadata as TopicArtifactMetadata;
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
      topic_id: topicId,
      language: metadata.language || topicRow?.language || "auto",
      current_metadata: artifact.metadata,
      current_hashes: hashes,
      section_hashes: Object.fromEntries(
        Object.entries(sectionHashes).map(([section, hash]) => [
          section,
          cleanString(hash),
        ]),
      ),
      topic_definition: definitions[topicId] || {},
      topic_resolver: resolvers[topicId] || {},
      resolved_paper_set: paperSets[topicId] || {},
      freshness,
      discovery_hints: discoveryHints,
      recommended_update: deriveTopicUpdateIntent({
        topicId,
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
      response.markdown = artifact.markdown;
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
    const rows = Array.isArray(artifact.paper_evidence)
      ? artifact.paper_evidence.filter(isObject)
      : [];
    if (!rows.length) {
      return;
    }
    const paperRefs = Array.from(
      new Set(
        rows
          .map((entry) => {
            const digestRef = isObject(entry.digest_ref)
              ? (entry.digest_ref as Record<string, unknown>)
              : {};
            return cleanString(
              entry.paper_ref || digestRef.paper_ref || digestRef.paperRef,
            );
          })
          .filter(Boolean),
      ),
    );
    const result = await readPaperArtifacts({
      paper_refs: paperRefs,
      artifact_types: ["digest"],
    });
    const availableDigestByPaper = new Map<string, Record<string, unknown>>();
    for (const artifactRow of Array.isArray(result.artifacts)
      ? result.artifacts
      : []) {
      if (!isObject(artifactRow)) {
        continue;
      }
      if (
        cleanString(artifactRow.artifact_type) === "digest" &&
        cleanString(artifactRow.payload_type) === "digest-markdown" &&
        cleanString(artifactRow.status || "available") === "available"
      ) {
        availableDigestByPaper.set(
          cleanString(artifactRow.paper_ref),
          artifactRow,
        );
      }
    }
    const errors: string[] = [];
    for (const entry of rows) {
      const digestRef = isObject(entry.digest_ref)
        ? (entry.digest_ref as Record<string, unknown>)
        : {};
      const paperRef = cleanString(
        entry.paper_ref || digestRef.paper_ref || digestRef.paperRef,
      );
      const expectedHash = cleanString(
        digestRef.payload_hash || digestRef.payloadHash,
      );
      const current = availableDigestByPaper.get(paperRef);
      const currentHash = cleanString(current?.payload_hash || current?.hash);
      if (!current) {
        errors.push(
          `paper_evidence ${paperRef} digest_ref does not resolve to an available digest artifact`,
        );
        continue;
      }
      if (expectedHash && currentHash && expectedHash !== currentHash) {
        errors.push(
          `paper_evidence ${paperRef} digest_ref payload_hash mismatch: expected ${expectedHash}, current ${currentHash}`,
        );
      }
    }
    if (errors.length) {
      throw new Error(
        `invalid topic synthesis artifact digest refs: ${errors.join("; ")}`,
      );
    }
  }

  async function getSchemas() {
    return {
      schemas: {
        result_bundle: "synthesis.topic_synthesis_result_bundle@1.0.0",
        canonical_metadata: "synthesis.topic_artifact_metadata@1.0.0",
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
    const errors = validateCanonicalResolver(resolver);
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
    const allResolved = [...resolveRowsByResolver(rows, args.resolver).values()]
      .sort((left, right) =>
        left.row.paper_ref.localeCompare(right.row.paper_ref),
      )
      .map((entry) => ({
        paper_ref: entry.row.paper_ref,
        item_key: entry.row.item_key,
        title: entry.row.title,
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
        | RegistryArtifactType[]
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
        | RegistryArtifactType[]
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
      exported_by: "synthesis.export_filtered_paper_artifacts",
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

  return {
    resetSynthesisDatabase,
    debugSynthesisSnapshot,
    debugSynthesisQueueList,
    debugSynthesisJobsList,
    debugSynthesisPaperInspect,
    debugSynthesisTopicInspect,
    debugSynthesisDiff,
    debugSynthesisWorkerRun,
    debugSynthesisMaintenanceRun,
    debugSynthesisQueueControl,
    debugSynthesisJobsClearStale,
    debugSynthesisQueueClear,
    debugSynthesisCleanInstallReset,
    applyTopicSynthesisResult,
    deleteTopicArtifact,
    listDeletedTopicArtifacts,
    purgeDeletedTopicArtifacts,
    getSynthesisSnapshotInput,
    getSynthesisSnapshot,
    recordSynthesisUpdateEvent,
    listSynthesisUpdateEvents,
    loadSynthesisUpdateQueueState,
    pauseSynthesisUpdates,
    resumeSynthesisUpdates,
    retrySynthesisUpdateQueue,
    recordSynthesisStartupReconcileState,
    markSynthesisUpdateQueueFailure,
    runPaperRegistryIncrementalWorker,
    runCitationGraphStructureWorker,
    runCitationGraphComplexMetricsWorker,
    runCitationGraphLayoutWorker,
    runTopicFreshnessWorker,
    runTopicDiscoveryWorker,
    runSynthesisStartupReconcile,
    refreshMirror,
    rebuildMirrorFromCanonical,
    recoverCanonicalFromMirror,
    readTopicArtifact,
    readTopicDetail,
    getReviewInput,
    listTopics,
    listWorkflowTopicOptions,
    getTopicContext,
    resolveTopicPaperDigest,
    getSchemas,
    getLibraryIndex,
    resolveResolver,
    getPaperRegistry,
    getCitationGraphSlice,
    getCitationGraphMetrics,
    queryCitationGraph,
    getPaperArtifactManifest,
    readPaperArtifacts,
    exportFilteredPaperArtifacts,
    loadTagVocabulary,
    saveTagVocabulary,
    exportTagVocabularyCheckpoint,
    validateTagVocabulary,
    previewTagVocabularyImport,
    applyTagVocabularyImport,
    rebuildTagVocabularyIndex,
    exportTagVocabularyForRegulator,
    loadConceptKb,
    updateConceptDisplayText,
    applyConceptReviewAction,
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
    loadLiteratureRegistry,
    loadLiteratureJobState,
    queueLiteratureRegistryRebuild,
    runLiteratureRegistryJobNow,
    retryLiteratureRegistryJob,
    rebuildLiteratureRegistry,
    rebuildCitationGraphProjection,
    readCitationGraphSnapshot,
    listCleanupProposals,
    applyCleanupProposalAction,
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

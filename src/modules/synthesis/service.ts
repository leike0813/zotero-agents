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
  type CitationGraphLibraryNodeMetrics,
  type CitationGraphMetrics,
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
  type SynthesisUiSnapshot,
  type SynthesisUiSnapshotInput,
  type SynthesisUiState,
  type SynthesisUiTopicUpdateIntent,
} from "./uiModel";
import { createSynthesisTagVocabularyService } from "./tagVocabulary";
import { createSynthesisConceptKbService } from "./conceptKb";
import { createSynthesisTopicGraphService } from "./topicGraph";
import {
  createSynthesisLiteratureRegistryService,
  type LiteratureRegistryCleanupProposalRecord,
  type LiteratureRegistryPaperRecord,
  type LiteratureRegistryReferenceInstanceRecord,
  type LiteratureRegistryReferenceResolutionRecord,
  type LiteratureRegistryWorkRecord,
} from "./literatureRegistry";
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

const REGISTRY_ARTIFACT_TYPES: RegistryArtifactType[] = [
  "digest",
  "references",
  "citation_analysis",
];
const LIBRARY_INDEX_PAGE_LIMIT_DEFAULT = 100;
const LIBRARY_INDEX_PAGE_LIMIT_MAX = 250;
const SYNTHESIS_REGISTRY_PAGE_LIMIT_DEFAULT = 100;
const SYNTHESIS_REGISTRY_PAGE_LIMIT_MAX = 250;
const ACP_SKILL_RUN_ID_RE = /^acp-skill-[A-Za-z0-9._-]+$/;

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

function sortedCleanStrings(values: unknown[] | undefined) {
  return Array.from(
    new Set((values || []).map(cleanString).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
}

function registryMetadataFingerprintFromInput(input: PaperRegistryInput) {
  const library = normalizeLibraryId(input.libraryId);
  const itemKey = cleanString(input.itemKey);
  const metadata = {
    title: cleanString(input.title),
    year: cleanString(input.year),
    item_type: cleanString(input.itemType),
    creators: sortedCleanStrings(input.creators),
    tags: sortedCleanStrings(input.tags),
    collections: sortedCleanStrings(input.collections),
    doi: cleanString(input.doi),
    arxiv: cleanString(input.arxiv),
    url: cleanString(input.url),
  };
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
  return {
    graph_hash: graph.graph_hash,
    layoutStatus: args.layoutStatus || (args.layout ? "ready" : "missing"),
    diagnostics: graph.diagnostics,
    nodes: graph.nodes.map((node) => ({
      id: node.node_id,
      label: cleanString(node.title) || node.node_id,
      kind: node.kind,
      year: cleanString(node.year) || undefined,
      tags: [],
      collections: [],
      x: coordinates[node.node_id]?.x,
      y: coordinates[node.node_id]?.y,
      low_signal: Boolean(node.low_signal),
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.edge_id,
      source: edge.source,
      target: edge.target,
      primary_role: edge.primary_role,
      mention_count: edge.mention_count,
    })),
  };
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
  }));
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
      next[row.topic_id] = {
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
      };
      continue;
    }
    const currentHash = dependencyHash(computed.snapshot);
    const baselineMissing =
      shouldReset ||
      !existing ||
      !existing.baseline_dependencies ||
      !existing.baseline_input_hash;
    if (baselineMissing) {
      next[row.topic_id] = {
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
      };
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
    next[row.topic_id] = {
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
    };
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
    previous[topicId] = {
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
    };
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

async function readLegacyTopicRows(
  root: string,
): Promise<Array<TopicIndexRow & { status: string }>> {
  const paths = buildSynthesisStoragePaths(root);
  const children = await listRuntimeChildren(paths.topicsRoot).catch(() => []);
  const rows: Array<TopicIndexRow & { status: string }> = [];
  for (const child of children) {
    const topicPathIdValue = cleanString(child).split(/[\\/]/).pop() || "";
    if (!topicPathIdValue) {
      continue;
    }
    const topicPaths = buildSynthesisStoragePaths(root, topicPathIdValue);
    const hasV2 = await runtimePathExists(topicPaths.currentManifest);
    const hasLegacy =
      (await runtimePathExists(topicPaths.legacyCurrentMarkdown)) ||
      (await runtimePathExists(topicPaths.legacyCurrentMetadata));
    if (hasV2 || !hasLegacy) {
      continue;
    }
    rows.push({
      topic_id: topicPathIdValue,
      path_id: topicPathIdValue,
      title: topicPathIdValue,
      updated_at: "",
      markdown_hash: "",
      metadata_hash: "",
      bundle_hash: "",
      status: "legacy_invalid",
    });
  }
  return rows;
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
  const tagVocabulary = createSynthesisTagVocabularyService({ root, now });
  const conceptKb = createSynthesisConceptKbService({ root, now });
  const topicGraph = createSynthesisTopicGraphService({ root, now });
  const literatureRegistry = createSynthesisLiteratureRegistryService({
    root,
    now,
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
  const readHints: SynthesisReadHint[] = [];

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
    let sourceHash = "";
    const diagnostics: SynthesisLiteratureJobDiagnostic[] = [];
    try {
      sourceHash = (await literatureSource()).sourceHash;
    } catch (error) {
      diagnostics.push(
        literatureDiagnostic({
          code: "literature_source_read_failed",
          severity: "error",
          message: errorMessage(error),
        }),
      );
    }
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
    } else if (
      persisted?.source_hash &&
      sourceHash &&
      persisted.source_hash !== sourceHash
    ) {
      queueState = "stale";
    }
    const canPreserve =
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
        diagnostics: diagnostics.length
          ? diagnostics
          : Array.isArray(persisted?.diagnostics)
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
      const source = await literatureSource();
      const rebuilt = await lock.runExclusive(libraryId, () =>
        literatureRegistry.rebuildLiteratureRegistry({
          registryInputs: source.registryInputs,
          citationGraphPapers: source.citationGraphPapers,
          transactionId: "literature-registry-background-rebuild",
        }),
      );
      maintenance.markCanonicalMutation();
      const projectionHash = hashCanonicalJson(rebuilt.citationProjection);
      literatureJobRunning = false;
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
        if (bundle.concept_cards_proposal_path) {
          try {
            const conceptPayload = await readRunWorkspaceJsonWithFallbacks(
              context,
              "concept_cards_proposal_path",
              bundle.concept_cards_proposal_path,
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
          if (bundle.topic_graph_relation_proposals_path) {
            try {
              const proposalPayload = await readRunWorkspaceJsonWithFallbacks(
                context,
                "topic_graph_relation_proposals_path",
                bundle.topic_graph_relation_proposals_path,
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
    const kgPaths = buildSynthesisKnowledgeGraphPaths(root);
    const rows = await readIndexRows(root);
    const conflicts = await listConflictCandidates(root);
    const rootReady = await runtimePathExists(paths.synthesisRoot);
    const registryInputs = await registryInputsForService(options);
    const registryRows = registryRowsForInputs(registryInputs);
    const legacyRows = await readLegacyTopicRows(root);
    const artifactState = await readArtifactStateRows(root);
    const definitions = await readStateMap<Record<string, unknown>>(
      paths.topicDefinitions,
      "topics",
    ).catch(() => ({}) as Record<string, Record<string, unknown>>);
    const projectionRegistry = await readJson<{
      projections?: Record<
        string,
        { stale?: boolean; diagnostics?: unknown[] }
      >;
    }>(joinPath(kgPaths.stateRoot, "projection-registry.json")).catch(
      () => null,
    );
    const literatureProjection = await readJson<{
      rows?: PaperRegistryRow[];
      cleanup_proposals?: Array<{
        proposal_id: string;
        status: "open" | "approved" | "rejected" | "skipped";
        source_paper_ref: string;
        reason: string;
        updated_at?: string;
      }>;
    }>(joinPath(kgPaths.stateRoot, "literature-registry-index.json")).catch(
      () => null,
    );
    const projectionGraph = await readProjectionCitationGraph(
      root,
      state.graph.layoutPreset,
    );
    const persistedGraph = await readPersistedGraphProjection(
      root,
      state.graph.layoutPreset,
    );
    const usePersistedGraph = shouldPreferLegacyCitationGraph({
      projectionGraph: projectionGraph.graph,
      legacyGraph: persistedGraph.graph,
    });
    const selectedGraph = usePersistedGraph ? persistedGraph : projectionGraph;
    const tags = await tagVocabulary.loadTagVocabulary().catch(() => undefined);
    const concepts = await conceptKb.loadConceptKb().catch(() => undefined);
    const literatureJob = await peekLiteratureJobState().catch(() => undefined);
    const updateQueue = updateEvents.loadQueueState();
    const topicGraphSnapshot = await topicGraph
      .loadTopicGraph()
      .catch(() => undefined);
    const gitSyncState = await gitSync
      .loadGitSyncState()
      .catch(() => undefined);
    const graph =
      selectedGraph.graph ||
      projectionGraph.graph ||
      persistedGraph.graph ||
      graphForPapers([]);
    const sync = assessSynthesisSyncRecovery({
      root: {
        state: rootReady ? "ready" : "missing",
      },
      mirror: {
        manifest: undefined,
        shards: [],
      },
      localIndexes: {
        state: rows.length ? "healthy" : "missing",
      },
      conflicts,
    });
    const canonicalLiterature = await literatureRegistry
      .loadLiteratureRegistry()
      .catch(() => undefined);
    const projectedCleanupProposals: LiteratureRegistryCleanupProposalRecord[] =
      (literatureProjection?.cleanup_proposals || []).map((proposal) => ({
        proposal_id: proposal.proposal_id,
        kind: "reference_resolution",
        status: proposal.status,
        source_paper_ref: proposal.source_paper_ref,
        reason: proposal.reason,
        diagnostics: [],
        created_at: proposal.updated_at || now(),
        updated_at: proposal.updated_at || now(),
      }));
    const cleanupProposals = enrichCleanupProposals({
      proposals:
        canonicalLiterature?.cleanup_proposals || projectedCleanupProposals,
      papers: canonicalLiterature?.papers,
      references: canonicalLiterature?.reference_instances,
      resolutions: canonicalLiterature?.reference_resolutions,
      works: canonicalLiterature?.works,
    });
    const literatureProjectionState =
      projectionRegistry?.projections?.["literature-registry-index"];
    const citationProjectionState =
      projectionRegistry?.projections?.["citation-graph-index"];
    const maintenanceSummary = buildMaintenanceSummary({
      updateQueue,
      literatureJob,
      literatureProjection,
      literatureProjectionState,
      citationProjectionState,
      citationGraphHash: graph.graph_hash,
      citationGraphFound: Boolean(
        projectionGraph.graph || persistedGraph.graph,
      ),
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
        rows: (await readDeletedRows(root)).map((row) => ({
          topic_id: row.topic_id,
          title: row.title,
          deleted_at: row.deleted_at,
        })),
      },
      artifacts: [...rows, ...legacyRows].map((row) => {
        const stateRow = artifactState[row.topic_id];
        const freshness =
          (row as any).status === "legacy_invalid"
            ? "dirty"
            : stateRow?.freshness || "unknown";
        const coverage = stateRow?.coverage || "missing";
        const intent = deriveTopicUpdateIntent({
          topicId: row.topic_id,
          language: row.language,
          state: stateRow,
          row,
        });
        return {
          id: row.topic_id,
          title: row.title,
          kind: "topic_synthesis",
          coverage,
          freshness,
          updated_at: row.updated_at,
          markdown_preview: (stateRow?.reasons || [])
            .map((entry) => entry.code)
            .join(", "),
          paper_count: row.paper_count ?? paperCountFromTopicState(stateRow),
          summary: summaryFromTopicDefinition(
            definitions[row.topic_id],
            (stateRow?.reasons || [])
              .map((entry) => entry.message || entry.code)
              .filter(Boolean)
              .slice(0, 2)
              .join("; "),
          ),
          completion: completionFromTopicState(stateRow),
          status: (row as any).status,
          readerMode:
            (row as any).status === "legacy_invalid"
              ? "needs_recreate"
              : "structured",
          language: row.language,
          external_literature_count: row.external_literature_count,
          stale_reasons:
            stateRow?.freshness === "stale"
              ? (stateRow?.reasons || []).map((entry) => entry.code)
              : [],
          dirty_reasons:
            stateRow?.freshness === "dirty"
              ? (stateRow?.reasons || []).map((entry) => entry.code)
              : (row as any).status === "legacy_invalid"
                ? ["legacy_invalid"]
                : [],
          updateIntent: topicUpdateIntentForUi({
            topicId: row.topic_id,
            intent,
          }),
        };
      }),
      registry: {
        rows: registryRowsToUi(
          literatureProjection?.rows || registryRows,
          cleanupProposals,
          literatureProjectionState?.stale,
        ),
        cleanupProposals: cleanupProposals.map((proposal) => ({
          proposal_id: proposal.proposal_id,
          status: proposal.status,
          kind: proposal.kind,
          source_paper_ref: proposal.source_paper_ref,
          source_paper_title: proposal.source_paper_title,
          reference_instance_id: proposal.reference_instance_id,
          provisional_key: proposal.provisional_key,
          reference_title: proposal.reference_title,
          reference_raw: proposal.reference_raw,
          target_paper_ref: proposal.target_paper_ref,
          target_paper_title: proposal.target_paper_title,
          target_work_id: proposal.target_work_id,
          target_work_title: proposal.target_work_title,
          reason: proposal.reason,
          diagnostics: proposal.diagnostics,
          decision_summary: proposal.decision_summary,
          updated_at: proposal.updated_at,
        })),
        projection: literatureProjectionState,
        literatureJob,
      },
      graph: selectedGraph.graph
        ? {
            ...mapGraphToUi(selectedGraph.graph, {
              layout: selectedGraph.layout,
              layoutStatus: selectedGraph.layoutStatus,
            }),
            diagnostics: {
              ...selectedGraph.graph.diagnostics,
              ...(usePersistedGraph
                ? {
                    status: "legacy_projection_used",
                    warnings: [
                      "canonical citation graph projection is empty; using latest legacy unified graph snapshot",
                    ],
                  }
                : {}),
            },
          }
        : projectionGraph.graph
          ? mapGraphToUi(projectionGraph.graph, {
              layout: projectionGraph.layout,
              layoutStatus: projectionGraph.layoutStatus,
            })
          : persistedGraph.graph
            ? mapGraphToUi(graph, {
                layout: persistedGraph.layout,
                layoutStatus: persistedGraph.layoutStatus,
              })
            : {
                ...mapGraphToUi(graph),
                diagnostics: {
                  ...graph.diagnostics,
                  status: "graph_snapshot_missing",
                },
              },
      maintenance: {
        updateQueue,
        summary: maintenanceSummary,
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

  function isPaperRegistryDirtyEvent(event: SynthesisUpdateEvent) {
    return (
      event.status === "queued" &&
      (event.event_type === "paper_artifact_changed" ||
        event.event_type === "digest_applied" ||
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
      }
      return {
        processed,
        completed,
        failed,
        diagnostics,
        queue: updateEvents.loadQueueState(),
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
    for (const event of pending) {
      if (Date.now() - startedAt >= timeBudgetMs) {
        break;
      }
      processed += 1;
      try {
        const result = await lock.runExclusive(libraryId, () =>
          literatureRegistry.rebuildCitationGraphComplexMetrics(),
        );
        if (!result.ok) {
          const diagnostic =
            result.diagnostics[0] ||
            ({
              code: "citation_graph_complex_metrics_missing_projection",
              severity: "warning" as const,
              message:
                "Citation graph complex metrics cannot run without a graph projection.",
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
    if (Date.now() - startedAt >= timeBudgetMs) {
      return {
        processed: 0,
        completed: 0,
        failed: 0,
        diagnostics: [
          {
            code: "citation_graph_layout_worker_budget_exhausted",
            severity: "warning" as const,
            message: "Citation graph layout worker time budget was exhausted.",
          },
        ],
        queue,
      };
    }
    try {
      const result = await lock.runExclusive(libraryId, () =>
        literatureRegistry.rebuildCitationGraphLayout({
          preset: args.preset,
          force: args.force,
        }),
      );
      if (!result.ok) {
        const diagnostic =
          result.diagnostics[0] ||
          ({
            code: "citation_graph_layout_missing_projection",
            severity: "warning" as const,
            message:
              "Citation graph layout cannot run without a graph projection.",
          } satisfies SynthesisUpdateDiagnostic);
        diagnostics.push(diagnostic);
        return {
          processed: 1,
          completed: 0,
          failed: 1,
          diagnostics,
          queue: updateEvents.loadQueueState(),
        };
      }
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
    const snapshot = await literatureRegistry
      .loadLiteratureRegistry()
      .catch(() => undefined);
    if (snapshot?.papers?.length) {
      return snapshot.papers.map(registryRowFromCanonicalPaper);
    }
    const projection = await literatureRegistry
      .readLiteratureRegistryProjection()
      .catch(() => null);
    if (projection?.rows?.length) {
      return projection.rows;
    }
    if (snapshot?.registry_projection?.rows?.length) {
      return snapshot.registry_projection.rows;
    }
    return options.registryInputs
      ? registryRowsForInputs(options.registryInputs)
      : [];
  }

  async function runTopicFreshnessWorker(
    args: {
      batchLimit?: number;
      timeBudgetMs?: number;
    } = {},
  ) {
    const startedAt = Date.now();
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
    }
    return {
      processed,
      completed,
      failed,
      diagnostics,
      queue: updateEvents.loadQueueState(),
    };
  }

  async function runSynthesisStartupReconcile(
    args: {
      batchLimit?: number;
    } = {},
  ) {
    const batchLimit = Math.max(1, Math.floor(Number(args.batchLimit) || 500));
    updateEvents.recordStartupReconcileState({
      state: "checking",
      dirtyCount: 0,
      diagnostics: [],
    });
    try {
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
      const snapshot = await literatureRegistry
        .loadLiteratureRegistry()
        .catch(() => undefined);
      const currentByRef = new Map(
        (snapshot?.papers || []).map(
          (paper) => [paper.paper_ref, paper] as const,
        ),
      );
      let dirtyCount = 0;
      for (const fingerprint of fingerprints) {
        const current = currentByRef.get(fingerprint.paper_ref);
        const currentHash = current?.facets?.metadata?.hash || "";
        if (
          !current ||
          currentHash !== fingerprint.hash ||
          Boolean(fingerprint.deleted)
        ) {
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
      }
      return updateEvents.recordStartupReconcileState({
        state: dirtyCount > 0 ? "queued" : "ready",
        dirtyCount,
        diagnostics: [],
      });
    } catch (error) {
      return updateEvents.recordStartupReconcileState({
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
    }
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

  async function rebuildConceptKbIndex() {
    return conceptKb.rebuildConceptKbIndexProjection();
  }

  async function loadTopicGraph() {
    return topicGraph.loadTopicGraph();
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
    action: "approve" | "reject" | "skip";
  }) {
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
    const snapshot = await literatureRegistry
      .loadLiteratureRegistry()
      .catch(() => undefined);
    const projection =
      snapshot?.registry_projection ||
      (await literatureRegistry
        .readLiteratureRegistryProjection()
        .catch(() => null));
    const projectionStale = Boolean(
      snapshot?.literature_projection_state?.stale,
    );
    const projectionMissing = !projection;
    const readHintsForCall: SynthesisReadHint[] = [];
    if (projectionMissing) {
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
    const rows =
      projection?.rows ||
      (options.registryInputs
        ? registryRowsForInputs(options.registryInputs)
        : []);
    const refs = new Set(
      normalizeArray(
        args.paperRefs || args.paper_refs || args.paperRef || args.paper_ref,
      )
        .map(cleanString)
        .filter(Boolean),
    );
    const filtered = refs.size
      ? rows.filter((row) => refs.has(row.paper_ref))
      : rows;
    const page = pageRows(filtered, args, {
      defaultLimit: SYNTHESIS_REGISTRY_PAGE_LIMIT_DEFAULT,
      maxLimit: SYNTHESIS_REGISTRY_PAGE_LIMIT_MAX,
    });
    return {
      rows: page.page,
      cursor: page.cursor,
      next_cursor: page.next_cursor,
      has_more: page.has_more,
      returned: page.returned,
      total: page.total,
      limit: page.limit,
      diagnostics: {
        projection_found: !projectionMissing,
        stale: projectionStale,
        warnings: [
          ...(projectionMissing
            ? ["literature registry projection is missing"]
            : []),
          ...(projectionStale
            ? ["literature registry projection is stale"]
            : []),
        ],
        recommended_commands:
          projectionMissing || projectionStale
            ? ["runLiteratureRegistryJobNow"]
            : [],
        maintenance: readMaintenanceForDto(
          projectionMissing || projectionStale
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
    if (!normalized.startNodeId) {
      return {
        ok: false,
        graph_hash: "",
        start_node_id: "",
        nodes: [],
        edges: [],
        diagnostics: emptyDiagnostics,
      };
    }
    const projection = await literatureRegistry
      .readCitationGraphProjection()
      .catch(() => null);
    const legacyGraph = await readPersistedCitationGraph(root);
    const graph = shouldPreferLegacyCitationGraph({
      projectionGraph: projection?.graph,
      legacyGraph,
    })
      ? legacyGraph
      : projection?.graph || legacyGraph;
    if (!graph) {
      const hint = recordReadHint({
        code: "citation_graph_projection_missing",
        scope: "citation-graph",
      });
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
            "citation graph snapshot is missing",
          ],
          recommended_commands: ["runLiteratureRegistryJobNow"],
          maintenance: readMaintenanceForDto(["runLiteratureRegistryJobNow"]),
          read_hints: [hint],
        },
      };
    }
    const legacyMetrics = await readPersistedCitationGraphMetrics(root);
    const metrics =
      graph === legacyGraph && legacyMetrics
        ? legacyMetrics
        : projection?.metrics || legacyMetrics;
    const slice = buildCitationGraphSlice({
      graph,
      metrics,
      startNodeId: normalized.startNodeId,
      depth: normalized.depth,
      maxNodes: normalized.maxNodes,
      maxEdges: normalized.maxEdges,
      direction: normalized.direction,
      includeLowSignal: normalized.includeLowSignal,
      roleFilter: normalized.roleFilter,
      warnings: normalized.warnings,
    });
    return {
      ...slice,
      diagnostics: {
        ...slice.diagnostics,
        recommended_commands: [],
        maintenance: readMaintenanceForDto(),
      },
    };
  }

  async function getCitationGraphMetrics(
    args: Record<string, unknown> = {},
  ): Promise<SynthesisCitationGraphMetricsResult> {
    const normalized = normalizeGraphMetricsArgs(args);
    const projection = await literatureRegistry
      .readCitationGraphProjection()
      .catch(() => null);
    const legacyGraph = await readPersistedCitationGraph(root);
    const legacyMetrics = await readPersistedCitationGraphMetrics(root);
    const legacyOverride =
      projection &&
      legacyGraph &&
      (legacyGraph.graph_hash !== projection.graph.graph_hash ||
        shouldPreferLegacyCitationGraph({
          projectionGraph: projection.graph,
          legacyGraph,
        }));
    const graph = legacyOverride
      ? legacyGraph
      : projection?.graph || legacyGraph;
    const metrics = legacyOverride
      ? legacyMetrics
      : projection?.metrics || legacyMetrics;
    const metricsFound = !!metrics;
    const snapshotFound = !!graph;
    const stale = !!(
      graph &&
      metrics &&
      metrics.graph_hash !== graph.graph_hash
    );
    const warnings = [...normalized.warnings];
    if (!graph) {
      warnings.push("citation graph snapshot is missing");
    }
    if (!metrics) {
      warnings.push("citation graph metrics snapshot is missing");
    }
    if (stale) {
      warnings.push("citation graph metrics snapshot is stale");
    }
    if (!graph || !metrics || stale) {
      const readHintsForCall: SynthesisReadHint[] = [];
      if (!graph) {
        readHintsForCall.push(
          recordReadHint({
            code: "citation_graph_projection_missing",
            scope: "citation-graph",
          }),
        );
      }
      if (!metrics) {
        readHintsForCall.push(
          recordReadHint({
            code: "citation_graph_metrics_missing",
            scope: "citation-graph-metrics",
          }),
        );
      }
      if (stale) {
        readHintsForCall.push(
          recordReadHint({
            code: "citation_graph_metrics_stale",
            scope: "citation-graph-metrics",
          }),
        );
      }
      return {
        ok: false,
        graph_hash: cleanString(graph?.graph_hash || metrics?.graph_hash),
        metrics_hash: cleanString(metrics?.metrics_hash),
        status: !metrics ? "missing" : "stale",
        items: [],
        diagnostics: {
          snapshot_found: snapshotFound,
          metrics_found: metricsFound,
          stale,
          total_library_nodes: metrics?.library_node_metrics.length || 0,
          returned_count: 0,
          limits: {
            limit: normalized.limit,
            maxLimit: 100,
          },
          warnings,
          recommended_commands: ["runCitationGraphComplexMetricsWorker"],
          maintenance: readMaintenanceForDto([
            "runCitationGraphComplexMetricsWorker",
          ]),
          read_hints: readHintsForCall,
        },
      };
    }
    const requested = new Set(
      normalized.paperRefs.map(paperRefToCitationGraphNodeId).filter(Boolean),
    );
    const rows = metrics.library_node_metrics
      .filter((entry) => !requested.size || requested.has(entry.node_id))
      .sort((left, right) => {
        const value =
          metricSortValue(right, normalized.sortBy) -
          metricSortValue(left, normalized.sortBy);
        if (value !== 0) {
          return value;
        }
        return left.node_id.localeCompare(right.node_id);
      })
      .slice(0, normalized.limit);
    return {
      ok: true,
      graph_hash: graph.graph_hash,
      metrics_hash: metrics.metrics_hash,
      status: "ready",
      items: rows,
      diagnostics: {
        snapshot_found: true,
        metrics_found: true,
        stale: false,
        total_library_nodes: metrics.library_node_metrics.length,
        returned_count: rows.length,
        limits: {
          limit: normalized.limit,
          maxLimit: 100,
        },
        warnings,
        recommended_commands: [],
        maintenance: readMaintenanceForDto(),
      },
    };
  }

  async function queryCitationGraph() {
    const projection = await literatureRegistry
      .readCitationGraphProjection()
      .catch(() => null);
    const legacyGraph = await readPersistedCitationGraph(root);
    const useLegacy = shouldPreferLegacyCitationGraph({
      projectionGraph: projection?.graph,
      legacyGraph,
    });
    const graph = useLegacy ? legacyGraph : projection?.graph || legacyGraph;
    if (graph) {
      return {
        ...graph,
        diagnostics: {
          ...graph.diagnostics,
          ...(useLegacy
            ? {
                status: "legacy_projection_used",
                warnings: [
                  "canonical citation graph projection is empty; using latest legacy unified graph snapshot",
                ],
              }
            : {}),
        },
        maintenance: readMaintenanceForDto(),
      };
    }
    recordReadHint({
      code: "citation_graph_projection_missing",
      scope: "citation-graph",
    });
    return {
      ...graphForPapers([]),
      maintenance: readMaintenanceForDto(["runLiteratureRegistryJobNow"]),
    };
  }

  async function listTopics() {
    const paths = buildSynthesisStoragePaths(root);
    const indexRows = await readIndexRows(root);
    const indexByTopic = new Map(indexRows.map((row) => [row.topic_id, row]));
    const definitions: Record<
      string,
      Record<string, unknown>
    > = await readStateMap<Record<string, unknown>>(
      paths.topicDefinitions,
      "topics",
    ).catch(() => ({}) as Record<string, Record<string, unknown>>);
    const ids = new Set<string>([
      ...Object.keys(definitions),
      ...indexRows.map((row) => row.topic_id),
    ]);
    const topics: TopicInventoryRow[] = [...ids]
      .map((topicId) => {
        const definition = definitions[topicId] || {};
        const indexRow = indexByTopic.get(topicId);
        const status = statusFromDefinition(definition);
        return {
          topic_id: topicId,
          title: titleFromDefinition(definition, indexRow?.title || topicId),
          description: descriptionFromDefinition(definition),
          aliases: aliasesFromDefinition(definition),
          updated_at:
            cleanString(definition.updated_at) || indexRow?.updated_at || "",
          ...(status ? { status } : {}),
        };
      })
      .filter((topic) => topic.status !== "deleted")
      .sort((left, right) => left.topic_id.localeCompare(right.topic_id));
    return {
      topics,
      diagnostics: {
        count: topics.length,
        source:
          Object.keys(definitions).length > 0
            ? "canonical-topic-definitions"
            : "artifact-index",
      },
    };
  }

  async function listWorkflowTopicOptions(args?: {
    filter?: unknown;
  }): Promise<SynthesisWorkflowTopicOptionsResult> {
    const filter = cleanString(args?.filter) || "all";
    if (filter === "updatable") {
      const rows = await readIndexRows(root);
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
      return { topics: await readIndexRows(root) };
    }
    if ((await readDeletedRows(root)).some((row) => row.topic_id === topicId)) {
      return {
        ok: false,
        status: "deleted",
        topic_id: topicId,
        diagnostics: {
          message: `topic artifact is deleted: ${topicId}`,
        },
      };
    }
    const rows = await readIndexRows(root);
    const registryRows = registryRowsForInputs(
      await registryInputsForService(options),
    );
    const artifactState = await scanTopicFreshness({
      root,
      rows,
      registryRows,
      timestamp: now(),
    });
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
    const topicRow = rows.find((row) => row.topic_id === topicId);
    const currentManifest = (artifact.manifest || {}) as Record<
      string,
      unknown
    >;
    const sectionHashes = isObject(currentManifest.section_hashes)
      ? (currentManifest.section_hashes as Record<string, unknown>)
      : {};
    const hashes = await currentHashes(root, topicId);
    const freshness = artifactState[topicId] || null;
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
    const topics = await readIndexRows(root);
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

  return {
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
    validateTagVocabulary,
    previewTagVocabularyImport,
    applyTagVocabularyImport,
    rebuildTagVocabularyIndex,
    exportTagVocabularyForRegulator,
    loadConceptKb,
    updateConceptDisplayText,
    applyConceptReviewAction,
    rebuildConceptKbIndex,
    loadTopicGraph,
    rebuildTopicGraphIndex,
    acceptTopicGraphRelation,
    rejectTopicGraphRelation,
    applyTopicGraphReviewAction,
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
  defaultService = createSynthesisService({
    root: getRuntimePersistencePaths().dataDir,
    libraryId,
    libraryAdapter: createZoteroSynthesisLibraryAdapter({ libraryId }),
  });
  return defaultService;
}

export function resetDefaultSynthesisServiceForTests() {
  defaultService = null;
}

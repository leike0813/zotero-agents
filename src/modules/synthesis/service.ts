import { joinPath } from "../../utils/path";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  listRuntimeChildren,
  copyRuntimeDirectory,
  readRuntimeTextFile,
  removeRuntimePath,
  resolveRuntimePersistenceRoot,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../runtimePersistence";
import {
  buildMirrorManifest,
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
  computeCitationGraphLayout,
  type CitationGraph,
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
import {
  buildPaperRegistryRows,
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
  type SynthesisUiState,
} from "./uiModel";
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

export type CitationGraphSliceDirection = "incoming" | "outgoing" | "both";

export type SynthesisCitationGraphSliceResult = {
  ok: boolean;
  graph_hash: string;
  start_node_id: string;
  nodes: CitationGraph["nodes"];
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
  };
};

export type SynthesisServiceOptions = {
  root: string;
  libraryId: number;
  now?: () => string;
  mirrorAdapter?: SynthesisMirrorAdapter;
  libraryAdapter?: SynthesisLibraryAdapter;
  registryInputs?: PaperRegistryInput[];
  citationGraphPapers?: CitationGraphPaperInput[];
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

type TopicFreshness = "fresh" | "stale" | "dirty" | "unknown";

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
  return cleanString(value)
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || fallback;
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

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "unknown error");
}

function normalizeLibraryId(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function nowIso() {
  return new Date().toISOString();
}

function titleFromDefinition(definition: Record<string, unknown>, topicId: string) {
  return cleanString(definition.title) || cleanString(definition.name) || topicId;
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
  return slug || hashCanonicalJson({ topic_id: topicId }).slice("sha256:".length, 16);
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
  const envelope = await readJson<CanonicalEnvelope<Record<string, Record<string, T>>>>(
    path,
  );
  return envelopeData(envelope, { [key]: {} } as Record<string, Record<string, T>>)[
    key
  ] || {};
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
  const manifest = await readJson<Record<string, unknown>>(paths.currentManifest).catch(
    () => null,
  );
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
  const envelope = await readJson<CanonicalEnvelope<{ topics?: TopicIndexRow[] }>>(
    paths.index,
  );
  const rows =
    envelopeData<{ topics?: TopicIndexRow[] }>(envelope, { topics: [] }).topics ||
    [];
  return [...rows].sort((left, right) =>
    left.topic_id.localeCompare(right.topic_id),
  );
}

async function writeIndexRows(root: string, rows: TopicIndexRow[], now: string) {
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

async function readDeletedRows(root: string): Promise<DeletedTopicArtifactRow[]> {
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
    const parsed = await readJson<SynthesisConflictCandidate>(path).catch(() => null);
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
  return buildCitationGraphInputsFromRegistryInputs(options.registryInputs || []);
}

function mapGraphToUi(
  graph: CitationGraph,
  args: {
    layout?: CitationGraphLayout | null;
    layoutStatus?: "missing" | "ready" | "dirty";
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

async function readPersistedGraphProjection(root: string, preset: CitationLayoutPreset) {
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
    layout && layout.graph_hash === graph.graph_hash ? ("ready" as const) : ("dirty" as const);
  return { graph, layout, layoutStatus };
}

async function readPersistedCitationGraph(root: string) {
  const paths = buildSynthesisStoragePaths(root);
  const graphEnvelope = await readJson<CanonicalEnvelope<CitationGraph>>(
    paths.unifiedCitationGraph,
  ).catch(() => null);
  return graphEnvelope?.data || null;
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
    cleanString(args.startNodeId) || paperRefToCitationGraphNodeId(args.paperRef);
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
    rawDirection === "incoming" || rawDirection === "outgoing" || rawDirection === "both"
      ? rawDirection
      : "both";
  if (rawDirection && rawDirection !== direction) {
    warnings.push("direction defaulted to both");
  }
  const roleFilter = new Set(
    normalizeArray(args.roleFilter)
      .map(cleanString)
      .filter(Boolean),
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
  return [...(edge.aux_roles || []), ...(edge.role_evidence || [])].some((entry) =>
    roleFilter.has(cleanString(entry.role)),
  );
}

function buildCitationGraphSlice(args: {
  graph: CitationGraph;
  startNodeId: string;
  depth: number;
  maxNodes: number;
  maxEdges: number;
  direction: CitationGraphSliceDirection;
  includeLowSignal: boolean;
  roleFilter: Set<string>;
  warnings: string[];
}): SynthesisCitationGraphSliceResult {
  const nodeById = new Map(args.graph.nodes.map((node) => [node.node_id, node]));
  const warnings = [...args.warnings];
  const allowedNode = (nodeId: string) => {
    const node = nodeById.get(nodeId);
    return !!node && (args.includeLowSignal || !node.low_signal || nodeId === args.startNodeId);
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
      ...(args.direction === "incoming" ? [] : outgoing.get(current.nodeId) || []),
      ...(args.direction === "outgoing" ? [] : incoming.get(current.nodeId) || []),
    ].sort((left, right) => left.edge_id.localeCompare(right.edge_id));
    for (const edge of nextEdges) {
      const nextNodeId = edge.source === current.nodeId ? edge.target : edge.source;
      if (selectedEdgeIds.size >= args.maxEdges) {
        truncated = true;
        continue;
      }
      if (!selectedNodeIds.has(nextNodeId) && selectedNodeIds.size >= args.maxNodes) {
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
  const nodes = args.graph.nodes
    .filter((node) => selectedNodeIds.has(node.node_id))
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

function registryRowsToUi(rows: PaperRegistryRow[]) {
  return rows.map((row) => ({
    paper_ref: row.paper_ref,
    title: row.title,
    year: row.year,
    readiness: row.readiness,
    coverage: row.coverage,
    missing_artifacts: Object.values(row.artifacts)
      .filter((artifact) => artifact.status !== "available")
      .map((artifact) => artifact.type),
  }));
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
    .map((key) => `${pathLabel(path, key)} is not allowed in canonical resolver schema`);
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
    return [`${path} must be a tag string, tag array, or { and, or, not } object`];
  }
  const errors = unknownFieldErrors(value, ["and", "or", "not"], path);
  const keys = ["and", "or", "not"].filter((key) => key in value);
  if (!keys.length) {
    errors.push(`${path} must include at least one of and, or, not`);
  }
  for (const key of keys) {
    errors.push(...validateStringOrStringArray(value[key], pathLabel(path, key)));
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
  const selectorKeys = allowed.filter((key) => key !== "mode" && key in resolver);
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

function validateExplicitResolver(resolver: Record<string, unknown>, path: string) {
  const errors = unknownFieldErrors(resolver, ["mode", "paper_refs"], path);
  if (!("paper_refs" in resolver)) {
    errors.push(`${path}.paper_refs is required for explicit resolver`);
  } else {
    errors.push(...validateStringArray(resolver.paper_refs, `${path}.paper_refs`));
  }
  return errors;
}

function validateMixedResolver(resolver: Record<string, unknown>, path: string) {
  const errors = unknownFieldErrors(resolver, ["mode", "include", "exclude"], path);
  if (!Array.isArray(resolver.include) || !resolver.include.length) {
    errors.push(`${path}.include must be a non-empty resolver array`);
  } else {
    resolver.include.forEach((entry, index) => {
      errors.push(...validateCanonicalResolver(entry, `${path}.include[${index}]`));
    });
  }
  if (resolver.exclude !== undefined) {
    if (!Array.isArray(resolver.exclude)) {
      errors.push(`${path}.exclude must be a resolver array`);
    } else {
      resolver.exclude.forEach((entry, index) => {
        errors.push(...validateCanonicalResolver(entry, `${path}.exclude[${index}]`));
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

function collectionMatches(row: PaperRegistryRow, resolver: Record<string, unknown>) {
  const collections = new Set(row.collections.map((entry) => entry.toLowerCase()));
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

function explicitMatches(row: PaperRegistryRow, resolver: Record<string, unknown>) {
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
  const result = new Map<string, { row: PaperRegistryRow; reasons: string[] }>();
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
    const included = new Map<string, { row: PaperRegistryRow; reasons: string[] }>();
    const sources = includeResolvers.length ? includeResolvers : [{ mode: "explicit" }];
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
  return hashCanonicalJson({ values: [...values].sort((left, right) => left.localeCompare(right)) });
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
    missing_artifacts: missingArtifacts.sort((left, right) => left.localeCompare(right)),
  };
}

function coverageFromDependencies(snapshot: TopicDependencySnapshot | null): TopicCoverage {
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
  const savedCount = state?.baseline_dependencies?.saved_paper_refs?.length || 0;
  const currentCount = state?.current_dependencies?.current_paper_refs?.length || 0;
  return Math.max(savedCount, currentCount, 0);
}

function completionFromTopicState(state: TopicArtifactStateRow | undefined) {
  if (!state) {
    return 0;
  }
  const dependencies = state.current_dependencies || state.baseline_dependencies;
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
  const completeCount = refs.filter((paperRef) => !missingPaperRefs.has(paperRef)).length;
  return Math.max(0, Math.min(100, Math.round((completeCount / refs.length) * 100)));
}

function changedSectionsForReason(reasonCode: string) {
  if (reasonCode === "paper_set_changed") {
    return [];
  }
  if (reasonCode === "graph_changed") {
    return ["coverage", "source_artifacts"];
  }
  if (reasonCode === "artifact_available" || reasonCode === "artifact_missing") {
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
  const language = cleanString(args.language) || cleanString(args.row?.language) || "auto";
  const reasons = args.state?.reasons || [];
  const firstReason = reasons[0];
  const reasonCode = cleanString(firstReason?.code) || cleanString(args.state?.freshness) || "manual";
  let mode: TopicUpdateIntent["mode"] = "auto";
  let scope = "auto";
  let changedSections = changedSectionsForReason(reasonCode);
  if (args.state?.freshness === "dirty") {
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
    scope =
      changedSections.includes("external_literature_analysis")
        ? "external_literature"
        : changedSections[0];
  }
  const allowed = Boolean(args.state && args.state.freshness !== "fresh") || mode !== "auto";
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
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function collectStaleReasons(
  baseline: TopicDependencySnapshot,
  current: TopicDependencySnapshot,
): TopicFreshnessReason[] {
  const reasons: TopicFreshnessReason[] = [];
  if (!compareStringArrays(baseline.saved_paper_refs, current.current_paper_refs)) {
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
      } else if (before.status !== "available" && after.status === "available") {
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
        message: "One or more previously available paper artifacts are now missing.",
        details: { count: missingCount },
      }),
    );
  }
  if (availableCount) {
    reasons.push(
      reason({
        code: "artifact_available",
        message: "One or more previously missing paper artifacts are now available.",
        details: { count: availableCount },
      }),
    );
  }
  return reasons;
}

async function readArtifactStateRows(root: string) {
  const paths = buildSynthesisStoragePaths(root);
  return readStateMap<TopicArtifactStateRow>(paths.artifactState, "topics").catch(
    () => ({} as Record<string, TopicArtifactStateRow>),
  );
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

async function safeFileHash(path: string, dirtyReasons: TopicFreshnessReason[], code: string) {
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
  ).catch(() => ({} as Record<string, Record<string, unknown>>));
  const paperSets = await readStateMap<Record<string, unknown>>(
    globalPaths.resolvedPaperSets,
    "paper_sets",
  ).catch(() => ({} as Record<string, Record<string, unknown>>));
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
        message: "Artifact index Markdown hash no longer matches current/export.md.",
      }),
    );
  }
  if (metadataHash && args.row.metadata_hash !== metadataHash) {
    dirtyReasons.push(
      reason({
        code: "index_hash_mismatch",
        severity: "error",
        message: "Artifact index metadata hash no longer matches current/metadata.json.",
      }),
    );
  }
  if (!resolver || !savedPaperSet || resolverErrors.length) {
    return { snapshot: null, dirtyReasons, coverage: "missing" };
  }
  const savedRefs = normalizeResolvedPaperRefs(savedPaperSet);
  const currentRefs = [...resolveRowsByResolver(args.registryRows, resolver).keys()].sort(
    (left, right) => left.localeCompare(right),
  );
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
}) {
  const graphHash = await readPersistedGraphHash(args.root);
  const previous = await readArtifactStateRows(args.root);
  const next: Record<string, TopicArtifactStateRow> = {};
  for (const row of args.rows) {
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
      shouldReset || !existing || !existing.baseline_dependencies || !existing.baseline_input_hash;
    if (baselineMissing) {
      next[row.topic_id] = {
        topic_id: row.topic_id,
        freshness: computed.dirtyReasons.length ? "dirty" : "fresh",
        coverage: computed.coverage,
        baseline_input_hash: computed.dirtyReasons.length ? "" : currentHash,
        current_input_hash: currentHash,
        baseline_dependencies: computed.dirtyReasons.length ? null : computed.snapshot,
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
  const artifact = await readJson<Record<string, unknown>>(paths.currentArtifact).catch(
    () => null,
  );
  const manifest = await readJson<Record<string, unknown>>(paths.currentManifest).catch(
    () => null,
  );
  return { paths, markdown, metadata, artifact, manifest };
}

type MirrorPayloadSource = {
  kind: ShardKind;
  assetId: string;
  assetPath: string;
  contentType: MirrorAssetContentType;
  path: string;
};

async function buildMirrorPayloadSources(root: string): Promise<MirrorPayloadSource[]> {
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
    for (const sectionPath of await listRuntimeChildren(topicPaths.currentSectionsRoot)) {
      if (!sectionPath.endsWith(".json")) {
        continue;
      }
      const sectionName = sectionPath.replace(/\\/g, "/").split("/").pop()?.replace(/\.json$/, "");
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

async function readLegacyTopicRows(root: string): Promise<Array<TopicIndexRow & { status: string }>> {
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

function sectionNameFromPath(pathValue: string) {
  const name = cleanString(pathValue).split(/[\\/]/).pop() || "";
  return name.replace(/\.json$/i, "").replace(/-/g, "_");
}

function fallbackSectionsFromBundle(bundle: SynthesisResultBundle) {
  return {
    topic: bundle.topic_definition || {},
    summary: {
      brief: cleanString(bundle.artifact_metadata.summary) || cleanString(bundle.artifact_metadata.description),
    },
    claims: [],
    timeline_events: Array.isArray(bundle.timeline) ? bundle.timeline : [],
    paper_evidence: [],
    external_literature_analysis: {
      summary: "",
      themes: [],
      representative_references: [],
      citation_contexts: [],
      contribution_to_topic: "",
      limitations: "",
    },
    coverage: {
      paper_count: Array.isArray((bundle.resolved_paper_set as any)?.papers)
        ? (bundle.resolved_paper_set as any).papers.length
        : 0,
      external_literature_count: 0,
    },
    gaps: [],
    source_artifacts: [],
    diagnostics: { warnings: [] },
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
      throw new Error(`invalid topic analysis manifest: ${validation.errors.join("; ")}`);
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
      ...(args.bundle.markdown_path ? { markdown_path: args.bundle.markdown_path } : {}),
    };
  }
  return { manifest, sections };
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
    throw new Error(`invalid topic section patch manifest: ${validation.errors.join("; ")}`);
  }
  const changedSections: Record<string, unknown> = {};
  const sections = isObject(patchManifest.patch) && isObject(patchManifest.patch.sections)
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
      joinPath(args.paths.currentSectionsRoot, canonicalSectionFileName(section)),
      canonicalJsonText(value),
    );
  }
  await writeRuntimeTextFile(args.paths.currentArtifact, canonicalJsonText(args.artifact));
  await writeRuntimeTextFile(args.paths.currentExportMarkdown, args.exportMarkdown);
  await writeRuntimeTextFile(args.paths.currentManifest, canonicalJsonText(args.manifest));
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
  return Array.isArray(artifact.paper_evidence) ? artifact.paper_evidence.length : 0;
}

function externalLiteratureCountFromArtifact(artifact: Record<string, unknown>) {
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

  async function refreshMirror(): Promise<SynthesisMirrorRefreshResult | undefined> {
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
    await writeJson(joinPath(paths.stateRoot, "mirror-manifest.json"), manifest);
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

  async function rebuildMirrorFromCanonical(): Promise<SynthesisMirrorRefreshResult | undefined> {
    return lock.runExclusive(libraryId, async () => {
      const paths = buildSynthesisStoragePaths(root);
      if (!(await runtimePathExists(paths.synthesisRoot))) {
        throw new Error("Cannot rebuild synthesis mirror because canonical root is missing");
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
        throw new Error("Canonical synthesis root already exists; refusing shard recovery");
      }
      const anchor = await options.mirrorAdapter.ensureAnchor({
        libraryId,
        title: SYNTHESIS_ANCHOR_TITLE,
        root,
      });
      const anchorKey = cleanString(anchor.anchorKey);
      const shards = await options.mirrorAdapter.listShards({ libraryId, anchorKey });
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
        for (const [assetPath, payload] of Object.entries(plan.payloadsByAssetPath)) {
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
        restoredAssets: Object.keys(plan.payloadsByAssetPath).sort((left, right) =>
          left.localeCompare(right),
        ),
      };
    });
  }

  async function applyTopicSynthesisResult(
    rawBundle: unknown,
    context?: ApplyContext,
  ): Promise<SynthesisApplyResult> {
    return lock.runExclusive(libraryId, async () => {
      const { bundle } = validateSynthesisResultBundle(rawBundle);
      const topicId = topicIdFromBundle(bundle);
      const pathId = topicPathId(topicId);
      const paths = buildSynthesisStoragePaths(root, pathId);
      const timestamp = now();
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
        const patch = await loadPatchManifestAndChangedSections({ bundle, context });
        const applied = applyTopicSectionPatch({
          currentManifest,
          currentSections,
          patchManifest: patch.patchManifest,
          changedSections: patch.changedSections,
        }) as any;
        if (applied.status !== "applied") {
          throw new Error(`topic section patch failed: ${JSON.stringify(applied)}`);
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
      const artifact = assembleTopicArtifact({ manifest, sections }) as Record<string, unknown>;
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
      const externalLiteratureCount = externalLiteratureCountFromArtifact(artifact);
      const metadataData: TopicArtifactMetadata = {
        topic_id: topicId,
        title: titleFromDefinition(bundle.topic_definition, topicId),
        mode: bundle.mode,
        markdown_hash: markdownHash,
        bundle_hash: bundleHash,
        timeline: artifact.timeline_events as SynthesisResultBundle["timeline"],
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
        value: bundle.topic_resolver,
        now: timestamp,
      });
      await upsertStateMap({
        path: paths.resolvedPaperSets,
        schemaId: "synthesis.resolved_paper_sets",
        key: "paper_sets",
        id: topicId,
        value: bundle.resolved_paper_set,
        now: timestamp,
      });
      const rows = (await readIndexRows(root)).filter(
        (row) => row.topic_id !== topicId,
      );
      rows.push({
        topic_id: topicId,
        path_id: pathId,
        title: metadataData.title,
        updated_at: timestamp,
        markdown_hash: markdownHash,
        metadata_hash: finalHashes.metadata_hash,
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
      await scanTopicFreshness({
        root,
        rows,
        registryRows: registryRowsForInputs(await registryInputsForService(options)),
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
      let mirror: SynthesisMirrorRefreshResult | undefined;
      let mirrorError = "";
      try {
        mirror = await refreshMirror();
      } catch (error) {
        mirrorError = errorMessage(error);
        await appendJsonLine(paths.log, {
          event: "mirror_refresh_failed",
          topic_id: topicId,
          at: timestamp,
          error: mirrorError,
        });
      }
      return {
        ok: true,
        status: "persisted",
        topicId,
        hashes: await currentHashes(root, topicId),
        mirror,
        ...(mirrorError
          ? {
              mirrorError,
              warnings: ["mirror_refresh_failed"],
            }
          : {}),
      };
    });
  }

  async function deleteTopicArtifact(args: {
    topicId: string;
  }): Promise<SynthesisTopicDeleteResult> {
    return lock.runExclusive(libraryId, async () => {
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
      ).catch(() => ({} as Record<string, Record<string, unknown>>));
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
      await appendJsonLine(paths.log, {
        event: "topic_artifact_deleted",
        topic_id: topicId,
        deleted_path_id: deletedId,
        at: timestamp,
      });
      let mirror: SynthesisMirrorRefreshResult | undefined;
      let mirrorError = "";
      try {
        mirror = await refreshMirror();
      } catch (error) {
        mirrorError = errorMessage(error);
        await appendJsonLine(paths.log, {
          event: "mirror_refresh_failed",
          topic_id: topicId,
          at: timestamp,
          error: mirrorError,
        });
      }
      return {
        ok: true,
        status: "deleted",
        topicId,
        deletedPathId: deletedId,
        mirror,
        ...(mirrorError
          ? {
              mirrorError,
              warnings: ["mirror_refresh_failed"],
            }
          : {}),
      };
    });
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
        const deletedTopicRoot = joinPath(paths.deletedRoot, row.deleted_path_id);
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
      let mirror: SynthesisMirrorRefreshResult | undefined;
      let mirrorError = "";
      try {
        mirror = await refreshMirror();
      } catch (error) {
        mirrorError = errorMessage(error);
        await appendJsonLine(paths.log, {
          event: "mirror_refresh_failed",
          at: timestamp,
          error: mirrorError,
        });
      }
      return {
        ok: true,
        status: "purged",
        purged_count: purgedCount,
        mirror,
        ...(mirrorError
          ? {
              mirrorError,
              warnings: ["mirror_refresh_failed"],
            }
          : {}),
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
        cleanString(metadata.export_hash || metadata.markdown_hash) || undefined,
      artifact_hash:
        cleanString(metadata.artifact_hash || metadata.structured_hash) || undefined,
      paper_count: paperEvidence.length || metadata.paper_count || 0,
      external_literature_count:
        metadata.external_literature_count ||
        (Array.isArray(externalAnalysis.representative_references)
          ? externalAnalysis.representative_references.length
          : 0),
      topic: topicSection,
      summary: summarySection,
      claims: Array.isArray(artifact.claims) ? artifact.claims : [],
      timeline_events: Array.isArray(artifact.timeline_events)
        ? artifact.timeline_events
        : [],
      paper_evidence: paperEvidence,
      external_literature_analysis: externalAnalysis,
      coverage: isObject(artifact.coverage) ? artifact.coverage : {},
      gaps: Array.isArray(artifact.gaps) ? artifact.gaps : [],
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

  async function getSynthesisSnapshot(
    state: SynthesisUiState = createDefaultSynthesisUiState(),
  ): Promise<SynthesisUiSnapshot> {
    const paths = buildSynthesisStoragePaths(root);
    const rows = await readIndexRows(root);
    const conflicts = await listConflictCandidates(root);
    const manifest = await readJson<MirrorManifest>(
      joinPath(paths.stateRoot, "mirror-manifest.json"),
    ).catch(() => null);
    const listedShards =
      manifest && options.mirrorAdapter?.listShards
        ? await options.mirrorAdapter.listShards({
            libraryId,
            anchorKey: manifest.anchor_key,
          })
        : [];
    const rootReady = await runtimePathExists(paths.synthesisRoot);
    const registryInputs = await registryInputsForService(options);
    const registryRows = registryRowsForInputs(registryInputs);
    const legacyRows = await readLegacyTopicRows(root);
    const artifactState = await scanTopicFreshness({
      root,
      rows,
      registryRows,
      timestamp: now(),
    });
    const definitions = await readStateMap<Record<string, unknown>>(
      paths.topicDefinitions,
      "topics",
    ).catch(() => ({} as Record<string, Record<string, unknown>>));
    const persistedGraph = await readPersistedGraphProjection(
      root,
      state.graph.layoutPreset,
    );
    const graph = persistedGraph.graph || graphForPapers([]);
    const sync = assessSynthesisSyncRecovery({
      root: {
        state: rootReady ? "ready" : "missing",
        canonical_manifest_hash: manifest?.manifest_hash,
      },
      mirror: {
        manifest: manifest || undefined,
        shards: listedShards,
      },
      localIndexes: {
        state: rows.length ? "healthy" : "missing",
      },
      conflicts,
    });
    return buildSynthesisUiSnapshot(
      {
        libraryId,
        storage: {
          rootPath: root,
          rootState: rootReady ? "ready" : "missing",
          anchorState: manifest ? "ready" : "missing",
          mirrorState: manifest ? "ready" : "missing",
        },
        sync: {
          status: sync.status,
          diagnostics: sync.diagnostics,
          allowedActions: sync.allowedActions,
          requiresConfirmation: sync.requiresConfirmation,
        },
        conflicts,
        deletedArtifacts: {
          rows: (await readDeletedRows(root)).map((row) => ({
            topic_id: row.topic_id,
            title: row.title,
            deleted_at: row.deleted_at,
          })),
        },
        artifacts: [...rows, ...legacyRows].map((row) => ({
          id: row.topic_id,
          title: row.title,
          kind: "topic_synthesis",
          coverage: artifactState[row.topic_id]?.coverage || "missing",
          freshness:
            (row as any).status === "legacy_invalid"
              ? "dirty"
              : artifactState[row.topic_id]?.freshness || "unknown",
          updated_at: row.updated_at,
          markdown_preview: (artifactState[row.topic_id]?.reasons || [])
            .map((entry) => entry.code)
            .join(", "),
          paper_count:
            row.paper_count ?? paperCountFromTopicState(artifactState[row.topic_id]),
          summary: summaryFromTopicDefinition(
            definitions[row.topic_id],
            (artifactState[row.topic_id]?.reasons || [])
              .map((entry) => entry.message || entry.code)
              .filter(Boolean)
              .slice(0, 2)
              .join("; "),
          ),
          completion: completionFromTopicState(artifactState[row.topic_id]),
          status: (row as any).status,
          readerMode: (row as any).status === "legacy_invalid" ? "needs_recreate" : "structured",
          language: row.language,
          external_literature_count: row.external_literature_count,
          stale_reasons:
            artifactState[row.topic_id]?.freshness === "stale"
              ? (artifactState[row.topic_id]?.reasons || []).map((entry) => entry.code)
              : [],
          dirty_reasons:
            artifactState[row.topic_id]?.freshness === "dirty"
              ? (artifactState[row.topic_id]?.reasons || []).map((entry) => entry.code)
              : (row as any).status === "legacy_invalid"
                ? ["legacy_invalid"]
                : [],
        })),
        registry: {
          rows: registryRowsToUi(registryRows),
        },
        graph: persistedGraph.graph
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
      },
      state,
    );
  }

  async function getReviewInput(args: { topicId: string }): Promise<ReviewWorkflowInput> {
    const artifact = await readTopicArtifact({ topicId: args.topicId });
    const paths = buildSynthesisStoragePaths(root, topicPathId(args.topicId));
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
    return buildReviewWorkflowInput({
      topic: {
        topic_id: args.topicId,
        title: metadata.title,
        markdown: artifact.markdown,
        timeline: metadata.timeline,
        metadata: metadata.artifact_metadata,
        topic_definition: definitions[args.topicId] || {},
        resolver: resolvers[args.topicId] || {},
        structured_topic: {
          artifact: isObject(artifact.artifact) ? artifact.artifact : {},
          manifest: isObject(artifact.manifest) ? artifact.manifest : {},
          metadata: artifact.metadata,
        },
      },
      resolved_paper_set: paperSets[args.topicId] || {},
      registry_rows: registryRows,
      citation_graph: graph,
    });
  }

  async function getPaperRegistry() {
    const rows = registryRowsForInputs(await registryInputsForService(options));
    return { rows, total: rows.length };
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
    const graph = await readPersistedCitationGraph(root);
    if (!graph) {
      return {
        ok: false,
        graph_hash: "",
        start_node_id: normalized.startNodeId,
        nodes: [],
        edges: [],
        diagnostics: {
          ...emptyDiagnostics,
          warnings: [...normalized.warnings, "citation graph snapshot is missing"],
        },
      };
    }
    return buildCitationGraphSlice({
      graph,
      startNodeId: normalized.startNodeId,
      depth: normalized.depth,
      maxNodes: normalized.maxNodes,
      maxEdges: normalized.maxEdges,
      direction: normalized.direction,
      includeLowSignal: normalized.includeLowSignal,
      roleFilter: normalized.roleFilter,
      warnings: normalized.warnings,
    });
  }

  async function queryCitationGraph() {
    const graph = graphForPapers(await graphInputsForService(options));
    const paths = buildSynthesisStoragePaths(root);
    const timestamp = now();
    await ensureRuntimeDirectory(paths.stateRoot);
    await writeJson(
      paths.unifiedCitationGraph,
      createCanonicalEnvelope({
        schemaId: "synthesis.unified_citation_graph_projection",
        data: graph,
        now: timestamp,
      }),
    );
    const presets: CitationLayoutPreset[] = ["compact", "balanced", "expanded"];
    await writeJson(
      paths.unifiedCitationLayouts,
      createCanonicalEnvelope({
        schemaId: "synthesis.unified_citation_graph_layouts",
        data: {
          graph_hash: graph.graph_hash,
          layouts: Object.fromEntries(
            presets.map((preset) => [preset, computeCitationGraphLayout(graph, preset)]),
          ),
        },
        now: timestamp,
      }),
    );
    return graph;
  }

  async function listTopics() {
    const paths = buildSynthesisStoragePaths(root);
    const indexRows = await readIndexRows(root);
    const indexByTopic = new Map(indexRows.map((row) => [row.topic_id, row]));
    const definitions: Record<string, Record<string, unknown>> = await readStateMap<
      Record<string, unknown>
    >(
      paths.topicDefinitions,
      "topics",
    ).catch(() => ({} as Record<string, Record<string, unknown>>));
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
          updated_at: cleanString(definition.updated_at) || indexRow?.updated_at || "",
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
    const registryRows = registryRowsForInputs(await registryInputsForService(options));
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
    ).catch(() => ({} as Record<string, Record<string, unknown>>));
    const resolvers = await readStateMap<Record<string, unknown>>(
      paths.resolvers,
      "resolvers",
    ).catch(() => ({} as Record<string, Record<string, unknown>>));
    const paperSets = await readStateMap<Record<string, unknown>>(
      paths.resolvedPaperSets,
      "paper_sets",
    ).catch(() => ({} as Record<string, Record<string, unknown>>));
    const topicRow = rows.find((row) => row.topic_id === topicId);
    const currentManifest = (artifact.manifest || {}) as Record<string, unknown>;
    const sectionHashes = isObject(currentManifest.section_hashes)
      ? (currentManifest.section_hashes as Record<string, unknown>)
      : {};
    const hashes = await currentHashes(root, topicId);
    const freshness = artifactState[topicId] || null;
    const metadata = artifact.metadata as TopicArtifactMetadata;
    return {
      ...artifact,
      topic_id: topicId,
      language: metadata.language || topicRow?.language || "auto",
      current_artifact: artifact.artifact,
      current_metadata: artifact.metadata,
      current_manifest: artifact.manifest,
      current_hashes: hashes,
      section_hashes: Object.fromEntries(
        Object.entries(sectionHashes).map(([section, hash]) => [section, cleanString(hash)]),
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
        updateScope: cleanString(args.updateScope || args.update_scope) || undefined,
        updateMode: cleanString(args.updateMode || args.update_mode) || undefined,
        updateReason: cleanString(args.updateReason || args.update_reason) || undefined,
      },
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
      cleanString(args.paper_ref || args.paperRef || digestRef.paper_ref || digestRef.paperRef) ||
      (libraryId && itemKey ? `${libraryId}:${itemKey}` : "");
    const recordedHash = cleanString(digestRef.payload_hash || digestRef.payloadHash);
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
      result.artifacts.find((entry) => entry.payload_type === "digest-markdown");
    if (!artifact) {
      return {
        ok: false,
        status: "unavailable",
        paper_ref: paperRef,
        digest_markdown: "",
        recorded_hash: recordedHash,
        current_hash: "",
        source_changed: false,
        diagnostics: result.diagnostics.length ? result.diagnostics : ["digest_unavailable"],
      };
    }
    const markdown =
      cleanString(artifact.markdown) ||
      cleanString(artifact.decoded_text) ||
      (typeof artifact.payload === "string" ? artifact.payload : "");
    const currentHash = cleanString(artifact.hash);
    return {
      ok: Boolean(markdown),
      status: markdown ? "available" : "unavailable",
      paper_ref: artifact.paper_ref || paperRef,
      note_key: artifact.note_key,
      note_title: artifact.note_title,
      digest_markdown: markdown,
      recorded_hash: recordedHash,
      current_hash: currentHash,
      source_changed: Boolean(recordedHash && currentHash && recordedHash !== currentHash),
      diagnostics: artifact.diagnostics || [],
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
            return cleanString(entry.paper_ref || digestRef.paper_ref || digestRef.paperRef);
          })
          .filter(Boolean),
      ),
    );
    const result = await readPaperArtifacts({
      paper_refs: paperRefs,
      artifact_types: ["digest"],
    });
    const availableDigestByPaper = new Map<string, Record<string, unknown>>();
    for (const artifactRow of Array.isArray(result.artifacts) ? result.artifacts : []) {
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
      const paperRef = cleanString(entry.paper_ref || digestRef.paper_ref || digestRef.paperRef);
      const expectedHash = cleanString(digestRef.payload_hash || digestRef.payloadHash);
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
      throw new Error(`invalid topic synthesis artifact digest refs: ${errors.join("; ")}`);
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
      tags: base.tags,
      collections: base.collections,
      topics,
      registry,
      index_hash: hashCanonicalJson(completeIndexIdentity),
    };
    return {
      ...base,
      papers,
      topics,
      registry,
      cursor: String(cursor),
      next_cursor: hasMore ? String(nextCursor) : "",
      has_more: hasMore,
      returned: papers.length,
      total_papers: base.papers.length,
      limit,
      index_hash: pageIdentity.index_hash,
      page_hash: hashCanonicalJson(pageIdentity),
    };
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
    const resolved = [...resolveRowsByResolver(rows, args.resolver).values()]
      .sort((left, right) => left.row.paper_ref.localeCompare(right.row.paper_ref))
      .map((entry) => ({
        paper_ref: entry.row.paper_ref,
        item_key: entry.row.item_key,
        title: entry.row.title,
        match_reasons: entry.reasons.sort((left, right) => left.localeCompare(right)),
      }));
    const errorsAfterResolve = resolved.length ? [] : ["resolver matched no papers"];
    return {
      ok: resolved.length > 0,
      errors: errorsAfterResolve,
      papers: resolved,
      normalized_resolver: resolver,
      diagnostics: {
        final_count: resolved.length,
        total_candidates: rows.length,
        rejected: false,
      },
    };
  }

  async function getPaperArtifactManifest(args: Record<string, unknown> = {}) {
    const result = await readPaperArtifacts(args);
    const artifacts = (Array.isArray(result.artifacts) ? result.artifacts : []).map(
      (entry) => {
        const { payload, markdown, decoded_text, ...manifestEntry } = entry as any;
        return manifestEntry;
      },
    );
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

  async function exportPaperArtifactBundle(args: Record<string, unknown> = {}) {
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
    const diagnostics = Array.isArray(result.diagnostics) ? result.diagnostics : [];
    const exportedAt = new Date().toISOString();
    const payloadFiles: Array<{ paper_ref: string; payload_file: string }> = [];
    for (const paperRef of uniquePaperRefs) {
      const safeRef = safeFileSegment(paperRef, "paper");
      const payloadRelativePath = `runtime/payloads/paper-artifacts-${safeRef}.json`;
      const payloadPath = joinPath(runRoot, payloadRelativePath);
      const paperArtifacts = artifacts.filter((entry) => {
        const row = entry as Record<string, unknown>;
        return cleanString(row.paper_ref || row.paperRef) === paperRef;
      });
      const paperDiagnostics = diagnostics.filter((entry) =>
        cleanString(entry).startsWith(`${paperRef}:`),
      );
      const payload = {
        paper_ref: paperRef,
        artifacts: paperArtifacts,
        diagnostics: paperDiagnostics,
        exported_by: "synthesis.export_paper_artifact_bundle",
        exported_at: exportedAt,
      };
      await writeRuntimeTextFile(payloadPath, JSON.stringify(payload, null, 2));
      payloadFiles.push({ paper_ref: paperRef, payload_file: payloadRelativePath });
    }
    const manifestRelativePath = "runtime/payloads/paper-artifact-bundles-batch.json";
    await writeRuntimeTextFile(
      joinPath(runRoot, manifestRelativePath),
      JSON.stringify(
        {
          exported_by: "synthesis.export_paper_artifact_bundle",
          exported_at: exportedAt,
          paper_refs: uniquePaperRefs,
          payload_files: payloadFiles,
          diagnostics,
        },
        null,
        2,
      ),
    );
    const artifact_statuses = artifacts.map((entry) => {
      const row = entry as Record<string, unknown>;
      return {
        paper_ref: cleanString(row.paper_ref || row.paperRef),
        artifact_type: cleanString(row.artifact_type || row.artifactType),
        payload_type: cleanString(row.payload_type || row.payloadType),
        status: cleanString(row.status || "available"),
        missing_reason: cleanString(row.missing_reason || row.missingReason),
      };
    });
    const response: Record<string, unknown> = {
      paper_refs: uniquePaperRefs,
      manifest_file: manifestRelativePath,
      payload_files: payloadFiles,
      artifact_statuses,
      diagnostics,
    };
    if (uniquePaperRefs.length === 1) {
      response.paper_ref = uniquePaperRefs[0];
      response.payload_file = payloadFiles[0]?.payload_file || "";
    }
    return response;
  }

  return {
    applyTopicSynthesisResult,
    deleteTopicArtifact,
    listDeletedTopicArtifacts,
    purgeDeletedTopicArtifacts,
    getSynthesisSnapshot,
    refreshMirror,
    rebuildMirrorFromCanonical,
    recoverCanonicalFromMirror,
    readTopicArtifact,
    readTopicDetail,
    getReviewInput,
    listTopics,
    getTopicContext,
    resolveTopicPaperDigest,
    getSchemas,
    getLibraryIndex,
    resolveResolver,
    getPaperRegistry,
    getCitationGraphSlice,
    queryCitationGraph,
    getPaperArtifactManifest,
    readPaperArtifacts,
    exportPaperArtifactBundle,
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

  function shardIdentityMatches(note: any, args: {
    libraryId: number;
    anchorKey: string;
    kind: ShardKind;
    assetId: string;
    seq: number;
    total: number;
  }) {
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
      const key = cleanString(zotero.Prefs?.get?.(prefKey(args.libraryId), true));
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
          (entry: DecodedMirrorShardSummary | null): entry is DecodedMirrorShardSummary =>
            Boolean(entry),
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
    root: resolveRuntimePersistenceRoot(),
    libraryId,
    mirrorAdapter: createZoteroSynthesisMirrorAdapter(),
    libraryAdapter: createZoteroSynthesisLibraryAdapter({ libraryId }),
  });
  return defaultService;
}

export function resetDefaultSynthesisServiceForTests() {
  defaultService = null;
}

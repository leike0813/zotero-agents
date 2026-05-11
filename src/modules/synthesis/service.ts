import { joinPath } from "../../utils/path";
import {
  ensureRuntimeDirectory,
  listRuntimeChildren,
  readRuntimeTextFile,
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
};

const defaultLock = new LibraryWriteLock();
let defaultService: SynthesisService | null = null;

function cleanString(value: unknown) {
  return String(value || "").trim();
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

async function fileHash(path: string) {
  const text = await readRuntimeTextFile(path);
  return text.trim() ? hashMarkdown(text) : "";
}

async function currentHashes(root: string, topicId: string) {
  const paths = buildSynthesisStoragePaths(root, topicPathId(topicId));
  return {
    artifact: await fileHash(paths.currentMarkdown),
    metadata: await fileHash(paths.currentMetadata),
    index: await fileHash(paths.index),
  };
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
  const markdown = await readRuntimeTextFile(paths.currentMarkdown);
  const metadata = await readJson<CanonicalEnvelope<TopicArtifactMetadata>>(
    paths.currentMetadata,
  );
  return { paths, markdown, metadata };
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
    const payloadSources: Array<{ kind: ShardKind; path: string }> = [
      { kind: "topics", path: paths.topicDefinitions },
      { kind: "resolvers", path: paths.resolvers },
      { kind: "paper_sets", path: paths.resolvedPaperSets },
      { kind: "artifact_index", path: paths.index },
    ];
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
          seq: index + 1,
          total: chunks.length,
        });
        const noteKey = cleanString(written.noteKey);
        keepNoteKeys.push(noteKey);
        manifestShards.push({
          kind: source.kind,
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
    await options.mirrorAdapter.deleteShardsNotIn?.({
      libraryId,
      anchorKey,
      keepNoteKeys,
    });
    return { anchorKey, manifest, shards: manifestShards };
  }

  async function applyTopicSynthesisResult(
    rawBundle: unknown,
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
      const markdownHash = hashMarkdown(bundle.markdown);
      const bundleHash = hashCanonicalJson(bundle);
      const metadataData: TopicArtifactMetadata = {
        topic_id: topicId,
        title: titleFromDefinition(bundle.topic_definition, topicId),
        mode: bundle.mode,
        markdown_hash: markdownHash,
        bundle_hash: bundleHash,
        timeline: bundle.timeline,
        artifact_metadata: bundle.artifact_metadata,
        updated_at: timestamp,
      };
      const metadataEnvelope = createCanonicalEnvelope({
        schemaId: "synthesis.topic_artifact_metadata",
        data: metadataData,
        now: timestamp,
      });
      await writeRuntimeTextFile(paths.currentMarkdown, bundle.markdown);
      await writeJson(paths.currentMetadata, metadataEnvelope);
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
      const metadataHash = hashMarkdown(canonicalText(metadataEnvelope));
      const rows = (await readIndexRows(root)).filter(
        (row) => row.topic_id !== topicId,
      );
      rows.push({
        topic_id: topicId,
        path_id: pathId,
        title: metadataData.title,
        updated_at: timestamp,
        markdown_hash: markdownHash,
        metadata_hash: metadataHash,
        bundle_hash: bundleHash,
      });
      await writeIndexRows(root, rows, timestamp);
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
      metadata: topic.metadata.data,
      metadataEnvelope: topic.metadata,
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
        artifacts: rows.map((row) => ({
          id: row.topic_id,
          title: row.title,
          kind: "topic_synthesis",
          coverage: "complete",
          freshness: "fresh",
          updated_at: row.updated_at,
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

  async function getTopicContext(args: Record<string, unknown> = {}) {
    const topicId = cleanString(args.topicId || args.topic_id);
    if (!topicId) {
      return { topics: await readIndexRows(root) };
    }
    return readTopicArtifact({ topicId });
  }

  async function getSchemas() {
    return {
      schemas: {
        result_bundle: "synthesis.topic_synthesis_result_bundle@1.0.0",
        canonical_metadata: "synthesis.topic_artifact_metadata@1.0.0",
      },
    };
  }

  async function getLibraryIndex() {
    const inputs = await registryInputsForService(options);
    const base = options.libraryAdapter
      ? await options.libraryAdapter.getLibraryIndex()
      : buildLibraryIndexFromRegistryInputs(libraryId, inputs);
    return {
      ...base,
      topics: await readIndexRows(root),
      registry: registryRowsForInputs(inputs),
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
    const rows = registryRowsForInputs(await registryInputsForService(options));
    const refs = new Set(
      [
        ...normalizeArray(args.paper_refs),
        ...normalizeArray(args.paperRefs),
        args.paper_ref,
        args.paperRef,
      ]
        .map(cleanString)
        .filter(Boolean),
    );
    const filtered = rows.filter(
      (row) => !refs.size || refs.has(row.paper_ref) || refs.has(row.item_key),
    );
    return {
      papers: filtered.map((row) => ({
        paper_ref: row.paper_ref,
        title: row.title,
        artifacts: row.artifacts,
        diagnostics: row.diagnostics,
      })),
      total: filtered.length,
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

  return {
    applyTopicSynthesisResult,
    getSynthesisSnapshot,
    refreshMirror,
    readTopicArtifact,
    getReviewInput,
    getTopicContext,
    getSchemas,
    getLibraryIndex,
    resolveResolver,
    getPaperRegistry,
    queryCitationGraph,
    getPaperArtifactManifest,
    readPaperArtifacts,
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

  function noteTitle(note: any) {
    return cleanString(note?.getField?.("title")) || cleanString(note?.getDisplayTitle?.());
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
      anchor.setField?.("title", args.title);
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
      let note = childNotes(anchor).find((entry: any) => noteTitle(entry) === args.title);
      if (!note) {
        note = new zotero.Item("note");
        note.libraryID = args.libraryId;
        note.parentItemID = anchor.id;
      }
      note.setField?.("title", args.title);
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
        .filter((note: any) => noteTitle(note).startsWith("ZS Synthesis Mirror "))
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
              title: noteTitle(note),
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

import { joinPath } from "../../utils/path";
import {
  collectRuntimeFiles,
  ensureRuntimeDirectory,
  readRuntimeTextFile,
  runtimePathExists,
  runtimeRelativePath,
  validateManagedRelativePath,
  writeRuntimeTextFile,
} from "../runtimePersistence";
import { yieldToEventLoop } from "../../utils/runtimeCompatibility";
import {
  buildSynthesisKnowledgeGraphPaths,
  buildSynthesisStoragePaths,
  canonicalAssetFileName,
  canonicalizeJson,
  hashCanonicalJson,
} from "./foundation";
import {
  createSynthesisRepository,
  type SynthesisRepository,
} from "./repository";
import { createSynthesisDurableBundleCodec } from "../../../packages/synthesis-contracts/src/durableBundle";
import {
  SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION as SHARED_SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION,
  classifySynthesisDurableImportFacts,
  normalizeSynthesisDurableImportEntries,
  rebuildSynthesisDurableSyncIndex,
  type SynthesisDurableImportFact,
  type SynthesisDurableSyncIndex as SharedSynthesisDurableSyncIndex,
} from "../../../packages/synthesis-contracts/src/durableBundleImport";

export const SYNTHESIS_DURABLE_LEGACY_MANIFEST_SCHEMA_VERSION = "1.0.0";
export const SYNTHESIS_DURABLE_MANIFEST_SCHEMA_VERSION = "2.0.0";
export const SYNTHESIS_DURABLE_ASSET_SCHEMA_VERSION = "1.0.0";
export const SYNTHESIS_DURABLE_BUNDLE_SCHEMA_ID =
  "synthesis.durable_asset_bundle";
export const SYNTHESIS_DURABLE_BUNDLE_SCHEMA_VERSION = "2.0.0";
export const SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION =
  SHARED_SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION;

export type SynthesisDurableExportProgress = {
  phase: "repository" | "topics" | "bundle" | "write" | "manifest";
  phase_label?: string;
  processed_count?: number;
  total_count?: number;
  message?: string;
  details?: Record<string, unknown>;
};

export type SynthesisDurableEntityKind =
  | "concept"
  | "concept_sense"
  | "concept_alias"
  | "concept_relation"
  | "concept_review_item"
  | "topic_current_asset"
  | "topic_concept_links"
  | "topic_graph_node"
  | "topic_graph_edge"
  | "topic_graph_review_item"
  | "canonical_reference"
  | "canonical_reference_redirect"
  | "reference_binding"
  | "reference_match_proposal"
  | "review_item"
  | "topic_interest_metadata"
  | "topic_discovery_hint"
  | "tag_vocabulary"
  | "tag_aliases"
  | "tag_abbrev"
  | "tag_protocol"
  | "related_items_sync_effect"
  | "tombstone";

export type SynthesisDurableAssetEnvelope<T = unknown> = {
  schema_id: string;
  schema_version: string;
  entity_kind: SynthesisDurableEntityKind;
  entity_id: string;
  base_hash: string;
  content_hash: string;
  updated_at: string;
  data: T;
};

export type SynthesisDurableManifestEntity = {
  path: string;
  entity_kind: SynthesisDurableEntityKind;
  entity_id: string;
  schema_id: string;
  schema_version: string;
  hash: string;
  content_hash?: string;
  bytes?: number;
};

export type SynthesisDurableManifestAsset = {
  path: string;
  schema_id?: string;
  schema_version?: string;
  hash: string;
  bytes: number;
  bundle_kind?: string;
  entry_count?: number;
  entries?: SynthesisDurableManifestEntity[];
  entity_kind?: SynthesisDurableEntityKind;
  entity_id?: string;
};

export type SynthesisDurableSyncManifest = {
  manifest_schema_version: string;
  producer_version: string;
  min_reader_version: string;
  required_capabilities: string[];
  domain_versions: Record<string, string>;
  generated_at: string;
  asset_count: number;
  assets: SynthesisDurableManifestAsset[];
  manifest_hash: string;
};

export type SynthesisDurableSyncIndexEntry = {
  entity_id: string;
  entity_kind: SynthesisDurableEntityKind;
  path: string;
  last_synced_hash: string;
  last_exported_hash?: string;
  last_imported_hash?: string;
  last_run_id?: string;
  updated_at: string;
};

export type SynthesisDurableSyncIndex = {
  schema_id: "synthesis.durable_sync_index";
  schema_version: string;
  updated_at: string;
  entities: Record<string, SynthesisDurableSyncIndexEntry>;
};

export type SynthesisDurableConflict = {
  entity_kind: SynthesisDurableEntityKind;
  entity_id: string;
  path: string;
  reason:
    | "both_changed"
    | "update_vs_tombstone"
    | "hash_mismatch"
    | "invalid_asset";
  base_hash?: string;
  local_hash?: string;
  remote_hash?: string;
};

export type SynthesisDurableConflictReport = {
  schema_id: "synthesis.durable_conflict_report";
  schema_version: string;
  conflict_id: string;
  status: "open" | "resolved";
  created_at: string;
  updated_at: string;
  conflicts: SynthesisDurableConflict[];
};

export type SynthesisDurableSyncDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  path?: string;
  details?: unknown;
};

export type SynthesisDurableExportSnapshot = {
  manifest: SynthesisDurableSyncManifest;
  assets: Array<{
    relativePath: string;
    bundle: SynthesisDurableAssetBundle;
    text: string;
  }>;
  entityEntries: SynthesisDurableManifestEntity[];
};

export type SynthesisDurableAssetBundle = {
  schema_id: typeof SYNTHESIS_DURABLE_BUNDLE_SCHEMA_ID;
  schema_version: typeof SYNTHESIS_DURABLE_BUNDLE_SCHEMA_VERSION;
  bundle_kind: string;
  entries: SynthesisDurableAssetEnvelope[];
};

export type SynthesisDurableImportPreview = {
  ok: boolean;
  manifest?: SynthesisDurableSyncManifest;
  additions: number;
  updates: number;
  unchanged: number;
  tombstones: number;
  conflicts: SynthesisDurableConflict[];
  diagnostics: SynthesisDurableSyncDiagnostic[];
};

type DurableAssetDraft = {
  path: string;
  entityKind: SynthesisDurableEntityKind;
  entityId: string;
  schemaId: string;
  data: unknown;
  updatedAt?: string;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function canonicalJsonText(value: unknown) {
  return `${JSON.stringify(JSON.parse(canonicalizeJson(value)), null, 2)}\n`;
}

const sharedDurableBundleCodec = createSynthesisDurableBundleCodec({
  canonicalizeJson,
  hashCanonicalJson,
  validatePath(path) {
    const result = validateManagedRelativePath(path);
    if (!result.ok) {
      throw new Error(result.diagnostics[0]?.code || "managed_path_invalid");
    }
    return result.normalizedPath;
  },
});

function safeAssetName(prefix: string, id: unknown) {
  return canonicalAssetFileName(prefix, cleanString(id) || prefix);
}

function pathFor(
  entityKind: SynthesisDurableEntityKind,
  entityId: string,
  hint: string,
) {
  const fileName = safeAssetName(hint, entityId);
  switch (entityKind) {
    case "concept":
      return `concepts/${fileName}`;
    case "concept_sense":
      return `concept-senses/${fileName}`;
    case "concept_alias":
      return `concept-aliases/${fileName}`;
    case "concept_relation":
      return `concept-relations/${fileName}`;
    case "concept_review_item":
      return `concept-reviews/${fileName}`;
    case "topic_current_asset":
      return `topics/${fileName}`;
    case "topic_concept_links":
      return `topic-concept-links/${fileName}`;
    case "topic_graph_node":
      return `topic-graph/nodes/${fileName}`;
    case "topic_graph_edge":
      return `topic-graph/edges/${fileName}`;
    case "topic_graph_review_item":
      return `topic-graph/reviews/${fileName}`;
    case "canonical_reference":
      return `references/canonicals/${fileName}`;
    case "canonical_reference_redirect":
      return `references/redirects/${fileName}`;
    case "reference_binding":
      return `references/bindings/${fileName}`;
    case "reference_match_proposal":
      return `references/proposals/${fileName}`;
    case "review_item":
      return `reviews/${fileName}`;
    case "topic_interest_metadata":
      return `discovery/${fileName}`;
    case "topic_discovery_hint":
      return `discovery/hints/${fileName}`;
    case "tag_vocabulary":
      return "tags/vocabulary.json";
    case "tag_aliases":
      return "tags/aliases.json";
    case "tag_abbrev":
      return "tags/abbrev.json";
    case "tag_protocol":
      return "tags/protocol.json";
    case "related_items_sync_effect":
      return `related-items/effects/${fileName}`;
    case "tombstone":
      return `tombstones/${fileName}`;
    default:
      return `${fileName}`;
  }
}

function entityKey(kind: SynthesisDurableEntityKind, id: string) {
  return `${kind}:${id}`;
}

export function createSynthesisDurableEnvelope<T>(args: {
  schemaId: string;
  schemaVersion?: string;
  entityKind: SynthesisDurableEntityKind;
  entityId: string;
  data: T;
  baseHash?: string;
  updatedAt?: string;
}): SynthesisDurableAssetEnvelope<T> {
  return sharedDurableBundleCodec.createEnvelope({
    schemaId: args.schemaId,
    schemaVersion: args.schemaVersion || SYNTHESIS_DURABLE_ASSET_SCHEMA_VERSION,
    entityKind: args.entityKind,
    entityId: args.entityId,
    data: args.data,
    baseHash: args.baseHash,
    updatedAt: args.updatedAt || nowIso(),
  }) as SynthesisDurableAssetEnvelope<T>;
}

function assertSafeSyncPath(path: string) {
  const result = validateManagedRelativePath(path);
  if (!result.ok) {
    throw new Error(result.diagnostics[0]?.code || "managed_path_invalid");
  }
  return result.normalizedPath;
}

function manifestHashBase(
  manifest: Omit<SynthesisDurableSyncManifest, "manifest_hash">,
) {
  return {
    manifest_schema_version: manifest.manifest_schema_version,
    producer_version: manifest.producer_version,
    min_reader_version: manifest.min_reader_version,
    required_capabilities: manifest.required_capabilities,
    domain_versions: manifest.domain_versions,
    generated_at: manifest.generated_at,
    asset_count: manifest.asset_count,
    assets: manifest.assets,
  };
}

export function createSynthesisDurableManifest(args: {
  assets: SynthesisDurableManifestAsset[];
  generatedAt: string;
  producerVersion?: string;
}) {
  return sharedDurableBundleCodec.createManifest(args);
}

function isLegacyManifest(manifest: SynthesisDurableSyncManifest) {
  return (
    manifest.manifest_schema_version ===
    SYNTHESIS_DURABLE_LEGACY_MANIFEST_SCHEMA_VERSION
  );
}

export function listSynthesisDurableManifestEntities(
  manifest: SynthesisDurableSyncManifest,
): SynthesisDurableManifestEntity[] {
  if (isLegacyManifest(manifest)) {
    return manifest.assets
      .filter((asset) => asset.entity_kind && asset.entity_id)
      .map((asset) => ({
        path: asset.path,
        entity_kind: asset.entity_kind as SynthesisDurableEntityKind,
        entity_id: cleanString(asset.entity_id),
        schema_id: cleanString(asset.schema_id),
        schema_version: cleanString(asset.schema_version),
        hash: asset.hash,
        bytes: asset.bytes,
      }));
  }
  return manifest.assets.flatMap((asset) =>
    (asset.entries || []).map((entry) => ({
      ...entry,
      path: asset.path,
    })),
  );
}

type DurableExportProgressOptions = {
  onProgress?: (
    progress: SynthesisDurableExportProgress,
  ) => void | Promise<void>;
  yieldControl?: () => Promise<void>;
};

async function reportDurableExportProgress(
  options: DurableExportProgressOptions | undefined,
  progress: SynthesisDurableExportProgress,
) {
  await options?.onProgress?.(progress);
  await (options?.yieldControl || yieldToEventLoop)();
}

async function draftsFromRepository(
  repository: SynthesisRepository,
  options: DurableExportProgressOptions = {},
): Promise<DurableAssetDraft[]> {
  const drafts: DurableAssetDraft[] = [];
  const add = (
    entityKind: SynthesisDurableEntityKind,
    entityId: string,
    schemaId: string,
    data: unknown,
    updatedAt?: string,
    hint: string = entityKind,
  ) => {
    if (!cleanString(entityId)) {
      return;
    }
    drafts.push({
      path: pathFor(entityKind, entityId, hint),
      entityKind,
      entityId,
      schemaId,
      data,
      updatedAt,
    });
  };

  await reportDurableExportProgress(options, {
    phase: "repository",
    phase_label: "Concept facts",
    processed_count: 0,
    total_count: 6,
    message: "Reading durable concept facts.",
  });
  for (const row of repository.listConcepts()) {
    add(
      "concept",
      row.conceptId,
      "synthesis.durable.concept",
      row,
      row.updatedAt,
      "concept",
    );
  }
  for (const row of repository.listConceptSenses()) {
    add(
      "concept_sense",
      row.senseId,
      "synthesis.durable.concept_sense",
      row,
      row.updatedAt,
      "sense",
    );
  }
  for (const row of repository.listConceptAliases()) {
    add(
      "concept_alias",
      row.aliasId,
      "synthesis.durable.concept_alias",
      row,
      row.updatedAt,
      "alias",
    );
  }
  for (const row of repository.listConceptRelations()) {
    add(
      "concept_relation",
      row.relationId,
      "synthesis.durable.concept_relation",
      row,
      row.updatedAt,
      "relation",
    );
  }
  for (const row of repository.listConceptReviewItems()) {
    add(
      "concept_review_item",
      row.reviewId,
      "synthesis.durable.concept_review_item",
      row,
      row.updatedAt,
      "concept-review",
    );
  }
  const topicLinksByTopic = new Map<string, unknown[]>();
  for (const row of repository.listTopicConceptLinks()) {
    const topicId = cleanString(row.topicId);
    if (!topicId) {
      continue;
    }
    topicLinksByTopic.set(topicId, [
      ...(topicLinksByTopic.get(topicId) || []),
      row,
    ]);
  }
  for (const [topicId, links] of topicLinksByTopic) {
    add(
      "topic_concept_links",
      topicId,
      "synthesis.durable.topic_concept_links",
      { topicId, links },
      "",
      "topic-links",
    );
  }

  await reportDurableExportProgress(options, {
    phase: "repository",
    phase_label: "Topic graph facts",
    processed_count: 1,
    total_count: 6,
    message: "Reading durable topic graph facts.",
  });
  for (const row of repository.listTopicGraphNodes()) {
    add(
      "topic_graph_node",
      row.topicId,
      "synthesis.durable.topic_graph_node",
      row,
      row.updatedAt,
      "topic-node",
    );
  }
  for (const row of repository.listTopicGraphEdges()) {
    add(
      "topic_graph_edge",
      row.edgeId,
      "synthesis.durable.topic_graph_edge",
      row,
      row.updatedAt,
      "topic-edge",
    );
  }
  for (const row of repository.listTopicGraphReviewItems()) {
    add(
      "topic_graph_review_item",
      row.reviewId,
      "synthesis.durable.topic_graph_review_item",
      row,
      row.updatedAt,
      "topic-review",
    );
  }

  await reportDurableExportProgress(options, {
    phase: "repository",
    phase_label: "Reference facts",
    processed_count: 2,
    total_count: 6,
    message: "Reading durable reference facts.",
  });
  for (const row of repository.listCanonicalReferences()) {
    add(
      "canonical_reference",
      row.canonicalReferenceId,
      "synthesis.durable.canonical_reference",
      row,
      row.updatedAt,
      "canonical",
    );
  }
  for (const row of repository.listCanonicalReferenceRedirects()) {
    add(
      "canonical_reference_redirect",
      row.fromCanonicalReferenceId,
      "synthesis.durable.canonical_reference_redirect",
      row,
      row.updatedAt,
      "redirect",
    );
  }
  for (const row of repository.listReferenceBindings()) {
    add(
      "reference_binding",
      row.bindingId,
      "synthesis.durable.reference_binding",
      row,
      row.updatedAt,
      "binding",
    );
  }
  for (const row of repository.listReferenceMatchProposals()) {
    add(
      "reference_match_proposal",
      row.proposalId,
      "synthesis.durable.reference_match_proposal",
      row,
      row.updatedAt,
      "proposal",
    );
  }

  await reportDurableExportProgress(options, {
    phase: "repository",
    phase_label: "Review and discovery facts",
    processed_count: 3,
    total_count: 6,
    message: "Reading durable review and discovery facts.",
  });
  for (const row of repository.listReviewItems()) {
    add(
      "review_item",
      row.reviewItemId,
      "synthesis.durable.review_item",
      row,
      row.updatedAt,
      "review",
    );
  }
  for (const row of repository.listTopicInterestMetadata()) {
    add(
      "topic_interest_metadata",
      row.topicId,
      "synthesis.durable.topic_interest_metadata",
      row,
      row.updatedAt,
      "interest",
    );
  }
  for (const row of repository.listTopicDiscoveryHints()) {
    add(
      "topic_discovery_hint",
      row.hintId,
      "synthesis.durable.topic_discovery_hint",
      row,
      row.updatedAt,
      "hint",
    );
  }

  await reportDurableExportProgress(options, {
    phase: "repository",
    phase_label: "Tag facts",
    processed_count: 4,
    total_count: 6,
    message: "Reading durable tag facts.",
  });
  const tagEntries = repository.listTagVocabularyEntries();
  if (tagEntries.length) {
    add(
      "tag_vocabulary",
      "tag-vocabulary",
      "synthesis.durable.tag_vocabulary",
      { entries: tagEntries },
      "",
      "vocabulary",
    );
  }
  const tagAliases = repository.listTagAliases();
  if (tagAliases.length) {
    add(
      "tag_aliases",
      "tag-aliases",
      "synthesis.durable.tag_aliases",
      { aliases: tagAliases },
      "",
      "aliases",
    );
  }
  const tagAbbrev = repository.listTagAbbrevs();
  if (tagAbbrev.length) {
    add(
      "tag_abbrev",
      "tag-abbrev",
      "synthesis.durable.tag_abbrev",
      { abbrev: tagAbbrev },
      "",
      "abbrev",
    );
  }
  const tagProtocol = repository.getTagProtocol("default");
  if (tagProtocol) {
    add(
      "tag_protocol",
      "tag-protocol",
      "synthesis.durable.tag_protocol",
      tagProtocol,
      tagProtocol.updatedAt,
      "protocol",
    );
  }

  await reportDurableExportProgress(options, {
    phase: "repository",
    phase_label: "Related-items facts",
    processed_count: 5,
    total_count: 6,
    message: "Reading durable related-items facts.",
  });
  for (const row of repository.listRelatedItemsSyncEffects()) {
    add(
      "related_items_sync_effect",
      row.effectId,
      "synthesis.durable.related_items_sync_effect",
      row,
      row.updatedAt,
      "related-effect",
    );
  }
  await reportDurableExportProgress(options, {
    phase: "repository",
    phase_label: "Repository facts ready",
    processed_count: 6,
    total_count: 6,
    message: `Prepared ${drafts.length} durable repository entries.`,
    details: { draft_count: drafts.length },
  });
  return drafts;
}

async function topicAssetDrafts(
  root: string,
  options: DurableExportProgressOptions = {},
) {
  const paths = buildSynthesisStoragePaths(root);
  if (!(await runtimePathExists(paths.topicsRoot))) {
    return [] as DurableAssetDraft[];
  }
  const files = await collectRuntimeFiles(paths.topicsRoot);
  const drafts: DurableAssetDraft[] = [];
  for (const file of files) {
    const relative = runtimeRelativePath(paths.topicsRoot, file).replace(
      /\\/g,
      "/",
    );
    if (!relative.includes("/current/")) {
      continue;
    }
    if (
      relative.includes("/assets/") ||
      relative.endsWith(".html") ||
      relative.endsWith(".metadata.json")
    ) {
      continue;
    }
    if (!relative.endsWith(".json") && !relative.endsWith(".md")) {
      continue;
    }
    if (drafts.length > 0 && drafts.length % 20 === 0) {
      await reportDurableExportProgress(options, {
        phase: "topics",
        phase_label: "Topic source assets",
        processed_count: drafts.length,
        total_count: files.length,
        message: "Reading topic current source assets.",
      });
    }
    const topicId = relative.split("/")[0] || "";
    const payload = await readRuntimeTextFile(file);
    drafts.push({
      path: assertSafeSyncPath(`topics/${relative}`),
      entityKind: "topic_current_asset",
      entityId: `topic-asset:${topicId}:${relative}`,
      schemaId: "synthesis.durable.topic_current_asset",
      data: {
        topic_id: topicId,
        relative_path: `topics/${relative}`,
        content: payload,
      },
      updatedAt: "",
    });
  }
  await reportDurableExportProgress(options, {
    phase: "topics",
    phase_label: "Topic source assets ready",
    processed_count: drafts.length,
    total_count: files.length,
    message: `Prepared ${drafts.length} topic current assets.`,
    details: { file_count: files.length, draft_count: drafts.length },
  });
  return drafts;
}

function resolveDurableRepository(args: {
  root: string;
  repository?: SynthesisRepository;
  allowRepositoryCreateForTests?: boolean;
}) {
  if (args.repository) {
    return args.repository;
  }
  if (args.allowRepositoryCreateForTests) {
    return createSynthesisRepository({ runtimeRoot: args.root });
  }
  throw new Error("synthesis_durable_repository_required");
}

export async function buildSynthesisDurableExportSnapshot(args: {
  root: string;
  repository?: SynthesisRepository;
  allowRepositoryCreateForTests?: boolean;
  now?: () => string;
  producerVersion?: string;
  onProgress?: (
    progress: SynthesisDurableExportProgress,
  ) => void | Promise<void>;
  yieldControl?: () => Promise<void>;
}) {
  const repository = resolveDurableRepository(args);
  const timestamp = args.now?.() || nowIso();
  const drafts = [
    ...(await draftsFromRepository(repository, args)),
    ...(await topicAssetDrafts(args.root, args)),
  ];
  await reportDurableExportProgress(args, {
    phase: "bundle",
    phase_label: "Durable bundles",
    processed_count: 0,
    total_count: drafts.length,
    message: "Building durable bundle envelopes.",
    details: { draft_count: drafts.length },
  });
  const shared = sharedDurableBundleCodec.buildExport({
    drafts: drafts.map((draft) => ({
      entityKind: draft.entityKind,
      entityId: draft.entityId,
      schemaId: draft.schemaId,
      data: draft.data,
      ...(draft.updatedAt ? { updatedAt: draft.updatedAt } : {}),
    })),
    generatedAt: timestamp,
    producerVersion: args.producerVersion,
  });
  await reportDurableExportProgress(args, {
    phase: "bundle",
    phase_label: "Bundle files",
    processed_count: shared.entries.length,
    total_count: drafts.length,
    message: "Packing durable entries into bundle files.",
    details: { entry_count: shared.entries.length },
  });
  await reportDurableExportProgress(args, {
    phase: "manifest",
    phase_label: "Manifest",
    processed_count: shared.assets.length,
    total_count: shared.assets.length,
    message: "Creating durable sync manifest.",
    details: {
      bundle_count: shared.assets.length,
      entry_count: shared.entries.length,
    },
  });
  return {
    manifest: shared.manifest,
    assets: shared.assets.map(({ path, bundle, text }) => ({
      relativePath: path,
      bundle,
      text,
    })),
    entityEntries: shared.manifest.assets.flatMap(
      (asset) => asset.entries || [],
    ),
  };
}

export async function writeSynthesisDurableExportSnapshot(args: {
  root: string;
  outputRoot: string;
  repository?: SynthesisRepository;
  allowRepositoryCreateForTests?: boolean;
  now?: () => string;
  onProgress?: (
    progress: SynthesisDurableExportProgress,
  ) => void | Promise<void>;
  yieldControl?: () => Promise<void>;
}) {
  const snapshot = await buildSynthesisDurableExportSnapshot(args);
  let written = 0;
  for (const asset of snapshot.assets) {
    await reportDurableExportProgress(args, {
      phase: "write",
      phase_label: "Writing bundles",
      processed_count: written,
      total_count: snapshot.assets.length + 1,
      message: `Writing ${asset.relativePath}.`,
      details: { path: asset.relativePath, bytes: asset.text.length },
    });
    await writeRuntimeTextFile(
      joinPath(args.outputRoot, asset.relativePath),
      asset.text,
    );
    written += 1;
  }
  await reportDurableExportProgress(args, {
    phase: "write",
    phase_label: "Writing manifest",
    processed_count: written,
    total_count: snapshot.assets.length + 1,
    message: "Writing durable sync manifest.",
  });
  await writeRuntimeTextFile(
    joinPath(args.outputRoot, "manifest.json"),
    canonicalJsonText(snapshot.manifest),
  );
  await reportDurableExportProgress(args, {
    phase: "write",
    phase_label: "Export snapshot ready",
    processed_count: snapshot.assets.length + 1,
    total_count: snapshot.assets.length + 1,
    message: "Durable export snapshot written.",
    details: {
      bundle_count: snapshot.assets.length,
      entry_count: snapshot.entityEntries.length,
      total_bytes: snapshot.manifest.assets.reduce(
        (sum, asset) => sum + asset.bytes,
        0,
      ),
    },
  });
  return snapshot;
}

async function readJson(path: string) {
  return JSON.parse(await readRuntimeTextFile(path));
}

export async function readSynthesisDurableManifest(root: string) {
  const manifestPath = joinPath(root, "manifest.json");
  if (!(await runtimePathExists(manifestPath))) {
    return null;
  }
  return (await readJson(manifestPath)) as SynthesisDurableSyncManifest;
}

function validateManifestShape(
  manifest: SynthesisDurableSyncManifest | null,
  diagnostics: SynthesisDurableSyncDiagnostic[],
) {
  if (!manifest) {
    diagnostics.push({
      code: "durable_manifest_missing",
      severity: "error",
      message: "Durable sync manifest is missing.",
      path: "manifest.json",
    });
    return false;
  }
  const expectedHash = hashCanonicalJson(
    manifestHashBase({
      manifest_schema_version: manifest.manifest_schema_version,
      producer_version: manifest.producer_version,
      min_reader_version: manifest.min_reader_version,
      required_capabilities: manifest.required_capabilities,
      domain_versions: manifest.domain_versions,
      generated_at: manifest.generated_at,
      asset_count: manifest.asset_count,
      assets: manifest.assets,
    }),
  );
  if (manifest.manifest_hash !== expectedHash) {
    diagnostics.push({
      code: "durable_manifest_hash_mismatch",
      severity: "error",
      message: "Durable sync manifest hash does not match manifest content.",
      path: "manifest.json",
    });
  }
  if (
    manifest.manifest_schema_version !==
      SYNTHESIS_DURABLE_MANIFEST_SCHEMA_VERSION &&
    manifest.manifest_schema_version !==
      SYNTHESIS_DURABLE_LEGACY_MANIFEST_SCHEMA_VERSION
  ) {
    diagnostics.push({
      code: "durable_manifest_schema_unsupported",
      severity: "error",
      message: "Durable sync manifest schema is not supported.",
      path: "manifest.json",
      details: { schemaVersion: manifest.manifest_schema_version },
    });
  }
  return !diagnostics.some((entry) => entry.severity === "error");
}

async function readRemoteAssets(
  root: string,
  manifest: SynthesisDurableSyncManifest,
) {
  const verified = await sharedDurableBundleCodec.readAndVerify({
    readManifestText: () => canonicalJsonText(manifest),
    async readAssetText(relativePath) {
      const fullPath = joinPath(root, relativePath);
      return (await runtimePathExists(fullPath))
        ? readRuntimeTextFile(fullPath)
        : null;
    },
  });
  const assets = new Map<string, SynthesisDurableAssetEnvelope>();
  const diagnostics = verified.diagnostics.map(
    (diagnostic): SynthesisDurableSyncDiagnostic => ({
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.code,
      ...(diagnostic.path ? { path: diagnostic.path } : {}),
      ...(diagnostic.location
        ? { details: { location: diagnostic.location } }
        : {}),
    }),
  );
  if (verified.value) {
    try {
      const live = normalizeSynthesisDurableImportEntries(
        verified.value.entries.filter(
          (entry) => entry.entity_kind !== "tombstone",
        ),
      );
      for (const envelope of [
        ...live,
        ...verified.value.entries.filter(
          (entry) => entry.entity_kind === "tombstone",
        ),
      ]) {
        assets.set(
          entityKey(envelope.entity_kind, envelope.entity_id),
          envelope,
        );
      }
    } catch (error) {
      diagnostics.push({
        code:
          error instanceof Error
            ? error.message
            : "durable_import_payload_invalid",
        severity: "error",
        message:
          error instanceof Error
            ? error.message
            : "durable_import_payload_invalid",
      });
    }
  }
  return { assets, diagnostics };
}

function syncIndexPath(root: string) {
  return joinPath(
    buildSynthesisKnowledgeGraphPaths(root).syncRoot,
    "durable-sync-index.json",
  );
}

export async function readSynthesisDurableSyncIndex(root: string) {
  const path = syncIndexPath(root);
  if (!(await runtimePathExists(path))) {
    return {
      schema_id: "synthesis.durable_sync_index" as const,
      schema_version: SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION,
      updated_at: "",
      entities: {},
    };
  }
  return rebuildSynthesisDurableSyncIndex(
    await readJson(path),
  ) as SynthesisDurableSyncIndex;
}

export async function writeSynthesisDurableSyncIndex(args: {
  root: string;
  manifest: SynthesisDurableSyncManifest;
  runId?: string;
  imported?: boolean;
  exported?: boolean;
  now?: string;
}) {
  const timestamp = args.now || nowIso();
  const entities: Record<string, SynthesisDurableSyncIndexEntry> = {};
  for (const asset of listSynthesisDurableManifestEntities(args.manifest)) {
    const key = entityKey(asset.entity_kind, asset.entity_id);
    entities[key] = {
      entity_id: asset.entity_id,
      entity_kind: asset.entity_kind,
      path: asset.path,
      last_synced_hash: asset.hash,
      last_exported_hash: args.exported ? asset.hash : undefined,
      last_imported_hash: args.imported ? asset.hash : undefined,
      last_run_id: args.runId,
      updated_at: timestamp,
    };
  }
  const index: SynthesisDurableSyncIndex = {
    schema_id: "synthesis.durable_sync_index",
    schema_version: SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION,
    updated_at: timestamp,
    entities,
  };
  await ensureRuntimeDirectory(
    buildSynthesisKnowledgeGraphPaths(args.root).syncRoot,
  );
  await writeRuntimeTextFile(
    syncIndexPath(args.root),
    canonicalJsonText(index),
  );
  return index;
}

async function localAssetHashByEntity(args: {
  root: string;
  repository?: SynthesisRepository;
  allowRepositoryCreateForTests?: boolean;
}) {
  const snapshot = await buildSynthesisDurableExportSnapshot(args);
  const map = new Map<string, string>();
  for (const entry of snapshot.entityEntries) {
    map.set(entityKey(entry.entity_kind, entry.entity_id), entry.hash);
  }
  return map;
}

export async function previewSynthesisDurableImport(args: {
  root: string;
  sourceRoot: string;
  repository?: SynthesisRepository;
  allowRepositoryCreateForTests?: boolean;
}) {
  const diagnostics: SynthesisDurableSyncDiagnostic[] = [];
  const manifest = await readSynthesisDurableManifest(args.sourceRoot);
  validateManifestShape(manifest, diagnostics);
  if (!manifest) {
    return {
      ok: false,
      additions: 0,
      updates: 0,
      unchanged: 0,
      tombstones: 0,
      conflicts: [],
      diagnostics,
    } satisfies SynthesisDurableImportPreview;
  }
  const remote = await readRemoteAssets(args.sourceRoot, manifest);
  diagnostics.push(...remote.diagnostics);
  const index = await readSynthesisDurableSyncIndex(args.root);
  const localHashes = await localAssetHashByEntity(args);
  const manifestEntities = listSynthesisDurableManifestEntities(manifest);
  const liveFacts: SynthesisDurableImportFact[] = manifestEntities
    .filter((asset) => asset.entity_kind !== "tombstone")
    .map((asset) => ({
      entityKind: asset.entity_kind,
      entityId: asset.entity_id,
      path: asset.path,
      hash: asset.hash,
    }));
  const classified = classifySynthesisDurableImportFacts({
    remote: liveFacts,
    localHashes: Object.fromEntries(localHashes),
    index: index as unknown as SharedSynthesisDurableSyncIndex,
  });
  const conflicts: SynthesisDurableConflict[] = classified.conflicts.map(
    (conflict) => ({
      entity_kind: conflict.entityKind,
      entity_id: conflict.entityId,
      path: conflict.path,
      reason: conflict.reason,
      base_hash: conflict.baseHash,
      local_hash: conflict.localHash,
      remote_hash: conflict.remoteHash,
    }),
  );
  let additions = classified.additions;
  let updates = classified.updates + classified.unbasedUpdates;
  let unchanged = classified.unchanged;
  let tombstones = 0;
  for (const asset of manifestEntities.filter(
    (entry) => entry.entity_kind === "tombstone",
  )) {
    const key = entityKey(asset.entity_kind, asset.entity_id);
    const baseHash = index.entities[key]?.last_synced_hash || "";
    const localHash = localHashes.get(key) || "";
    const remoteHash = asset.hash;
    tombstones += 1;
    if (localHash && localHash === remoteHash) {
      unchanged += 1;
      continue;
    }
    if (!localHash) {
      additions += 1;
      continue;
    }
    if (baseHash && localHash !== baseHash && remoteHash !== baseHash) {
      conflicts.push({
        entity_kind: asset.entity_kind,
        entity_id: asset.entity_id,
        path: asset.path,
        reason: "update_vs_tombstone",
        base_hash: baseHash,
        local_hash: localHash,
        remote_hash: remoteHash,
      });
      continue;
    }
    updates += 1;
  }
  return {
    ok:
      !diagnostics.some((entry) => entry.severity === "error") &&
      conflicts.length === 0,
    manifest,
    additions,
    updates,
    unchanged,
    tombstones,
    conflicts,
    diagnostics,
  } satisfies SynthesisDurableImportPreview;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function applyEnvelope(
  repository: SynthesisRepository,
  envelope: SynthesisDurableAssetEnvelope,
) {
  const data = isRecord(envelope.data) ? envelope.data : {};
  switch (envelope.entity_kind) {
    case "concept":
      repository.upsertConcept(data as never);
      break;
    case "concept_sense":
      repository.upsertConceptSense(data as never);
      break;
    case "concept_alias":
      repository.upsertConceptAlias(data as never);
      break;
    case "concept_relation":
      repository.upsertConceptRelation(data as never);
      break;
    case "concept_review_item":
      repository.upsertConceptReviewItem(data as never);
      break;
    case "topic_current_asset":
      break;
    case "topic_concept_links":
      if (Array.isArray(data.links)) {
        for (const link of data.links) {
          repository.upsertTopicConceptLink(link as never);
        }
      }
      break;
    case "topic_graph_node":
      repository.upsertTopicGraphNode(data as never);
      break;
    case "topic_graph_edge":
      repository.upsertTopicGraphEdge(data as never);
      break;
    case "topic_graph_review_item":
      repository.upsertTopicGraphReviewItem(data as never);
      break;
    case "canonical_reference":
      repository.upsertCanonicalReference(data as never);
      break;
    case "canonical_reference_redirect":
      repository.upsertCanonicalReferenceRedirect(data as never);
      break;
    case "reference_binding":
      repository.upsertReferenceBinding(data as never);
      break;
    case "reference_match_proposal":
      repository.upsertReferenceMatchProposal(data as never);
      break;
    case "review_item":
      repository.upsertReviewItem(data as never);
      break;
    case "topic_interest_metadata":
      repository.upsertTopicInterestMetadata(data as never);
      break;
    case "topic_discovery_hint":
      repository.upsertTopicDiscoveryHint(data as never);
      break;
    case "tag_vocabulary":
      if (Array.isArray(data.entries)) {
        for (const entry of data.entries) {
          repository.upsertTagVocabularyEntry(entry as never);
        }
      }
      break;
    case "tag_aliases":
      if (Array.isArray(data.aliases)) {
        for (const entry of data.aliases) {
          repository.upsertTagAlias(entry as never);
        }
      }
      break;
    case "tag_abbrev":
      if (Array.isArray(data.abbrev)) {
        for (const entry of data.abbrev) {
          repository.upsertTagAbbrev(entry as never);
        }
      }
      break;
    case "tag_protocol":
      repository.upsertTagProtocol(data as never);
      break;
    case "related_items_sync_effect":
      repository.upsertRelatedItemsSyncEffect(data as never);
      break;
    default:
      break;
  }
}

async function applyTopicCurrentAsset(
  root: string,
  envelope: SynthesisDurableAssetEnvelope,
) {
  const data = isRecord(envelope.data) ? envelope.data : {};
  const relativePath = cleanString(data.relative_path);
  const content = String(data.content || "");
  const safe = validateManagedRelativePath(relativePath);
  if (
    !safe.ok ||
    !safe.normalizedPath.startsWith("topics/") ||
    !safe.normalizedPath.includes("/current/")
  ) {
    throw new Error("topic_current_asset_path_invalid");
  }
  await writeRuntimeTextFile(
    joinPath(
      buildSynthesisStoragePaths(root).synthesisRoot,
      safe.normalizedPath,
    ),
    content,
  );
}

export async function applySynthesisDurableImport(args: {
  root: string;
  sourceRoot: string;
  repository?: SynthesisRepository;
  allowRepositoryCreateForTests?: boolean;
  runId?: string;
}) {
  const repository = resolveDurableRepository(args);
  const preview = await previewSynthesisDurableImport({
    ...args,
    repository,
  });
  if (!preview.ok || !preview.manifest) {
    return { applied: false as const, preview };
  }
  const remote = await readRemoteAssets(args.sourceRoot, preview.manifest);
  if (remote.diagnostics.some((entry) => entry.severity === "error")) {
    return {
      applied: false as const,
      preview: {
        ...preview,
        diagnostics: [...preview.diagnostics, ...remote.diagnostics],
      },
    };
  }
  const manifestEntities = listSynthesisDurableManifestEntities(
    preview.manifest,
  );
  repository.transaction(() => {
    for (const asset of manifestEntities) {
      const envelope = remote.assets.get(
        entityKey(asset.entity_kind, asset.entity_id),
      );
      if (
        !envelope ||
        envelope.entity_kind === "tombstone" ||
        envelope.entity_kind === "topic_current_asset"
      ) {
        continue;
      }
      applyEnvelope(repository, envelope);
    }
    const timestamp = nowIso();
    for (const cache of [
      { cacheKey: "reference-sidecar:library", cacheKind: "reference-sidecar" },
      { cacheKey: "citation-graph:library", cacheKind: "citation-graph" },
      {
        cacheKey: "citation-layout:workbench_overview",
        cacheKind: "citation-layout",
      },
      { cacheKey: "concept-kb-index", cacheKind: "concept-kb-index" },
      { cacheKey: "tag-index", cacheKind: "tag-index" },
    ]) {
      repository.upsertCacheBasis({
        ...cache,
        status: "stale",
        staleReason: "durable_sync_import",
        updatedAt: timestamp,
      });
    }
  });
  for (const asset of manifestEntities) {
    const envelope = remote.assets.get(
      entityKey(asset.entity_kind, asset.entity_id),
    );
    if (envelope?.entity_kind === "topic_current_asset") {
      await applyTopicCurrentAsset(args.root, envelope);
    }
  }
  await writeSynthesisDurableSyncIndex({
    root: args.root,
    manifest: preview.manifest,
    runId: args.runId,
    imported: true,
  });
  return { applied: true as const, preview };
}

export function createSynthesisDurableConflictReport(args: {
  conflicts: SynthesisDurableConflict[];
  now?: string;
}) {
  const timestamp = args.now || nowIso();
  return {
    schema_id: "synthesis.durable_conflict_report" as const,
    schema_version: SYNTHESIS_DURABLE_ASSET_SCHEMA_VERSION,
    conflict_id: `durable-conflict-${hashCanonicalJson(args.conflicts).slice("sha256:".length, 24)}`,
    status: "open" as const,
    created_at: timestamp,
    updated_at: timestamp,
    conflicts: args.conflicts,
  };
}

import { joinPath } from "../../utils/path";
import {
  ensureRuntimeDirectory,
  listRuntimeChildren,
  readRuntimeTextFile,
  runtimePathExists,
  validateManagedRelativePath,
  writeRuntimeTextFile,
} from "../runtimePersistence";
import { buildCitationGraphInputsFromRegistryInputs } from "./libraryAdapter";
import type { CitationGraphPaperInput } from "./citationGraph";
import {
  buildPaperRegistryRows,
  type PaperRegistryFacets,
  type PaperRegistryInput,
  type PaperRegistryRow,
  type RegistryArtifactType,
} from "./registry";
import {
  buildUnifiedCitationGraph,
  computeCitationGraphLayout,
  computeCitationGraphMetrics,
  type CitationGraph,
  type CitationGraphMetrics,
  type CitationLayoutPreset,
} from "./citationGraph";
import {
  buildSynthesisKnowledgeGraphPaths,
  canonicalAssetFileName,
  hashMarkdown,
  hashCanonicalJson,
  initializeSynthesisKnowledgeGraphStore,
  readCanonicalJsonAsset,
  readProjectionRegistryState,
  recordProjectionRebuild,
  SynthesisSchemaRegistry,
  writeCanonicalDiagnostic,
  writeCanonicalTransaction,
  type CanonicalTransactionReceipt,
  type ProjectionState,
} from "./foundation";
import {
  createSynthesisRepository,
  type SynthesisIndexStateReplacement,
  type SynthesisPaperRegistryFact,
  type SynthesisRepository,
  type SynthesisReviewItemRecord,
} from "./repository";
import {
  buildReferenceMatcherIndex,
  normalizeSynthesisLiteratureTitle,
  resolveReferenceWithPolicy,
  type ReferenceMatcherPaperInput,
} from "./referenceMatcher";

export const SYNTHESIS_LITERATURE_REGISTRY_INDEX_TARGET =
  "literature-registry-index";
export const SYNTHESIS_CITATION_GRAPH_INDEX_TARGET = "citation-graph-index";
export const SYNTHESIS_PROJECTION_BACKEND_DESCRIPTOR = {
  kind: "json-dto",
  sqlite: false,
  fts: false,
  bm25: false,
} as const;

const PAPER_SCHEMA_ID = "synthesis.literature_registry.paper";
const WORK_SCHEMA_ID = "synthesis.literature_registry.work";
const WORK_REDIRECT_SCHEMA_ID = "synthesis.literature_registry.work_redirect";
const REFERENCE_INSTANCE_SCHEMA_ID =
  "synthesis.literature_registry.reference_instance";
const REFERENCE_RESOLUTION_SCHEMA_ID =
  "synthesis.literature_registry.reference_resolution";
const CITATION_CONTEXT_SCHEMA_ID =
  "synthesis.literature_registry.citation_context";
const CLEANUP_PROPOSAL_SCHEMA_ID =
  "synthesis.literature_registry.cleanup_proposal";
const MANIFEST_SCHEMA_ID = "synthesis.literature_registry.manifest";

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

export type LiteratureRegistryPaperRecord = {
  paper_ref: string;
  library_id: number;
  item_key: string;
  title: string;
  year?: string;
  item_type?: string;
  tags: string[];
  collections: string[];
  creators: string[];
  doi?: string;
  arxiv?: string;
  url?: string;
  citekey?: string;
  date_added?: string;
  artifacts?: PaperRegistryRow["artifacts"];
  facets?: PaperRegistryFacets;
  readiness: PaperRegistryRow["readiness"];
  coverage: PaperRegistryRow["coverage"];
  diagnostics: unknown[];
  row_hash: string;
};

export type LiteratureRegistryWorkRecord = {
  work_id: string;
  canonical_key: string;
  title?: string;
  year?: string;
  authors: string[];
  source: "library-paper" | "reference";
  aliases: string[];
};

export type LiteratureRegistryReferenceInstanceRecord = {
  reference_instance_id: string;
  source_paper_ref: string;
  reference_index: number;
  provisional_key: string;
  title?: string;
  year?: string;
  authors: string[];
  doi?: string;
  arxiv?: string;
  url?: string;
  citekey?: string;
  raw?: string;
  roles: string[];
};

export type LiteratureRegistryReferenceResolutionRecord = {
  resolution_id: string;
  reference_instance_id: string;
  source_paper_ref: string;
  provisional_key: string;
  status: "matched" | "unmatched" | "ambiguous" | "ignored";
  target_paper_ref?: string;
  target_work_id?: string;
  confidence: "deterministic" | "low" | "review";
  diagnostics: unknown[];
};

export type LiteratureRegistryCitationContextRecord = {
  context_id: string;
  reference_instance_id: string;
  source_paper_ref: string;
  roles: string[];
  evidence_count: number;
};

export type LiteratureRegistryCleanupProposalRecord = {
  proposal_id: string;
  kind: "reference_resolution";
  status:
    | "open"
    | "resolved"
    | "deferred"
    | "approved"
    | "rejected"
    | "skipped";
  source_paper_ref: string;
  reference_instance_id?: string;
  provisional_key?: string;
  reason: string;
  diagnostics: unknown[];
  created_at: string;
  updated_at: string;
};

export type LiteratureRegistryCleanupAction =
  | "confirm_literature_item"
  | "match_existing_literature_item"
  | "ignore_reference_instance"
  | "defer_reference_resolution"
  | "confirm_delete_item"
  | "mark_as_dedupe_merge"
  | "keep_for_now";

export type LiteratureRegistryManifest = {
  manifest_hash: string;
  paper_count: number;
  work_count: number;
  reference_instance_count: number;
  reference_resolution_count: number;
  citation_context_count: number;
  cleanup_proposal_count: number;
  updated_at: string;
  projection_targets: [
    typeof SYNTHESIS_LITERATURE_REGISTRY_INDEX_TARGET,
    typeof SYNTHESIS_CITATION_GRAPH_INDEX_TARGET,
  ];
};

export type LiteratureRegistryIndexProjection = {
  schema_id: "synthesis.literature_registry_index_projection";
  schema_version: "1.0.0";
  backend: typeof SYNTHESIS_PROJECTION_BACKEND_DESCRIPTOR;
  source_manifest_hash: string;
  rebuilt_at: string;
  rows: PaperRegistryRow[];
  cleanup_proposals: LiteratureRegistryCleanupProposalRecord[];
  diagnostics: unknown[];
};

export type CitationGraphIndexProjection = {
  schema_id: "synthesis.citation_graph_index_projection";
  schema_version: "1.0.0";
  backend: typeof SYNTHESIS_PROJECTION_BACKEND_DESCRIPTOR;
  source_manifest_hash: string;
  rebuilt_at: string;
  structure?: {
    status: "ready" | "partial" | "stale" | "missing";
    source_manifest_hash: string;
    structure_hash: string;
    updated_at: string;
    ownership: {
      source_paper_edges: Record<
        string,
        {
          node_id: string;
          edge_ids: string[];
          reference_instance_ids: string[];
          hash: string;
          updated_at: string;
        }
      >;
      target_groups: Record<
        string,
        {
          target_node_id: string;
          edge_ids: string[];
          source_paper_refs: string[];
          hash: string;
          updated_at: string;
        }
      >;
    };
  };
  graph: CitationGraph;
  metrics: CitationGraphMetrics;
  metric_layers?: {
    lightweight: {
      status: "ready" | "partial" | "stale" | "missing";
      source_graph_hash: string;
      updated_at: string;
      counts: Record<
        string,
        {
          node_id: string;
          paper_ref?: string;
          incoming: number;
          outgoing: number;
          external: number;
          unresolved: number;
        }
      >;
      resolution_summary: {
        matched: number;
        unresolved: number;
        ambiguous: number;
      };
    };
    complex: {
      status:
        | "ready"
        | "partial"
        | "stale"
        | "missing"
        | "failed_retryable"
        | "failed_permanent";
      source_graph_hash: string;
      updated_at: string;
      metrics_hash?: string;
      latest_usable_metrics_hash?: string;
      diagnostics: unknown[];
    };
  };
  layouts: Record<
    CitationLayoutPreset,
    ReturnType<typeof computeCitationGraphLayout>
  >;
  layout_layers?: Record<
    CitationLayoutPreset,
    {
      status:
        | "ready"
        | "stale"
        | "missing"
        | "running"
        | "failed_retryable"
        | "failed_permanent";
      source_graph_hash: string;
      source_complex_metrics_hash?: string;
      updated_at: string;
      diagnostics: unknown[];
    }
  >;
  freshness: {
    status: "ready" | "stale" | "missing";
    latest_usable_snapshot: string;
    stale_reasons: string[];
  };
  diagnostics: unknown[];
};

export type LiteratureRegistrySnapshot = {
  manifest: LiteratureRegistryManifest;
  papers: LiteratureRegistryPaperRecord[];
  works: LiteratureRegistryWorkRecord[];
  reference_instances: LiteratureRegistryReferenceInstanceRecord[];
  reference_resolutions: LiteratureRegistryReferenceResolutionRecord[];
  citation_contexts: LiteratureRegistryCitationContextRecord[];
  cleanup_proposals: LiteratureRegistryCleanupProposalRecord[];
  registry_projection?: LiteratureRegistryIndexProjection;
  citation_projection?: CitationGraphIndexProjection;
  literature_projection_state?: ProjectionState;
  citation_projection_state?: ProjectionState;
  diagnostics: unknown[];
};

type ServiceOptions = {
  root: string;
  now?: () => string;
  repository?: SynthesisRepository;
};

type RebuildArgs = {
  registryInputs?: PaperRegistryInput[];
  citationGraphPapers?: CitationGraphPaperInput[];
  transactionId?: string;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function cleanList(values: unknown) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((entry) => cleanString(entry))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
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

function nowIso() {
  return new Date().toISOString();
}

function safeSegment(value: unknown) {
  const normalized = cleanString(value)
    .replace(/\\/g, "/")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || hashCanonicalJson(value).slice("sha256:".length, 24);
}

function canonicalJsonText(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const CITATION_LAYOUT_PRESETS: CitationLayoutPreset[] = [
  "compact",
  "balanced",
  "expanded",
];

async function writeJson(path: string, value: unknown) {
  await writeRuntimeTextFile(path, canonicalJsonText(value));
}

async function readJson<T>(path: string): Promise<T | null> {
  if (!(await runtimePathExists(path))) {
    return null;
  }
  const text = await readRuntimeTextFile(path);
  return text.trim() ? (JSON.parse(text) as T) : null;
}

function fileName(path: string) {
  return path.replace(/\\/g, "/").split("/").filter(Boolean).pop() || "";
}

function objectSchema() {
  return {
    type: "object",
    additionalProperties: true,
  };
}

function createRegistry() {
  const registry = new SynthesisSchemaRegistry();
  for (const schemaId of [
    PAPER_SCHEMA_ID,
    WORK_SCHEMA_ID,
    WORK_REDIRECT_SCHEMA_ID,
    REFERENCE_INSTANCE_SCHEMA_ID,
    REFERENCE_RESOLUTION_SCHEMA_ID,
    CITATION_CONTEXT_SCHEMA_ID,
    CLEANUP_PROPOSAL_SCHEMA_ID,
    MANIFEST_SCHEMA_ID,
  ]) {
    registry.registerDataSchema(schemaId, objectSchema());
  }
  return registry;
}

const registry = createRegistry();

function referenceKey(input: {
  citekey?: string;
  doi?: string;
  arxiv?: string;
  url?: string;
  title?: string;
  year?: string;
  authors?: string[];
  raw?: string;
}) {
  const strong =
    cleanString(input.doi) ||
    cleanString(input.arxiv) ||
    cleanString(input.url) ||
    [
      cleanString(input.title).toLowerCase(),
      cleanString(input.year),
      cleanString(input.authors?.[0]).toLowerCase(),
    ]
      .filter(Boolean)
      .join(":") ||
    cleanString(input.raw);
  return strong
    ? `ref:${safeSegment(strong.toLowerCase())}`
    : `ref:${hashCanonicalJson(input).slice("sha256:".length, 24)}`;
}

function workIdFor(input: {
  doi?: string;
  arxiv?: string;
  url?: string;
  title?: string;
  year?: string;
  authors?: string[];
  raw?: string;
}) {
  return `work:${safeSegment(referenceKey(input))}`;
}

function paperRef(input: { libraryId: number; itemKey: string }) {
  return `${input.libraryId}:${input.itemKey}`;
}

function opaqueLiteratureItemId(kind: string, ref: string) {
  return `lit:${hashCanonicalJson({ kind, ref }).slice(
    "sha256:".length,
    "sha256:".length + 24,
  )}`;
}

function identifierRowsForPaper(
  paper: LiteratureRegistryPaperRecord,
  literatureItemId: string,
  timestamp: string,
): SynthesisIndexStateReplacement["identifiers"] {
  const identifiers = [
    { kind: "zotero_ref", value: paper.paper_ref },
    { kind: "doi", value: paper.doi },
    { kind: "arxiv", value: paper.arxiv },
    { kind: "url", value: paper.url },
    { kind: "citekey", value: paper.citekey },
  ];
  return identifiers
    .map((entry) => ({
      kind: entry.kind,
      displayValue: cleanString(entry.value),
      normalizedValue: cleanString(entry.value).toLocaleLowerCase("en-US"),
    }))
    .filter((entry) => entry.normalizedValue)
    .map((entry) => ({
      literatureItemId,
      kind: entry.kind,
      normalizedValue: entry.normalizedValue,
      displayValue: entry.displayValue,
      source: "canonical-literature-registry",
      confidence: entry.kind === "zotero_ref" ? "deterministic" : "candidate",
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
}

function buildRepositoryIndexState(args: {
  papers: LiteratureRegistryPaperRecord[];
  works: LiteratureRegistryWorkRecord[];
  referenceInstances: LiteratureRegistryReferenceInstanceRecord[];
  referenceResolutions: LiteratureRegistryReferenceResolutionRecord[];
  cleanupProposals: LiteratureRegistryCleanupProposalRecord[];
  timestamp: string;
}): SynthesisIndexStateReplacement {
  const paperLitIds = new Map<string, string>();
  const workLitIds = new Map<string, string>();
  const literatureItems: SynthesisIndexStateReplacement["literatureItems"] = [];
  const identifiers: NonNullable<
    SynthesisIndexStateReplacement["identifiers"]
  > = [];
  const zoteroBindings: NonNullable<
    SynthesisIndexStateReplacement["zoteroBindings"]
  > = [];
  const artifactStates: NonNullable<
    SynthesisIndexStateReplacement["artifactStates"]
  > = [];

  for (const paper of args.papers) {
    const literatureItemId = opaqueLiteratureItemId(
      "zotero-paper",
      paper.paper_ref,
    );
    paperLitIds.set(paper.paper_ref, literatureItemId);
    literatureItems.push({
      literatureItemId,
      displayTitle: paper.title,
      normalizedTitle: normalizeSynthesisLiteratureTitle(paper.title),
      titleNormalizerVersion: "deterministic-v1",
      year: paper.year,
      authorsJson: JSON.stringify(paper.creators || []),
      status: "active",
      createdFrom: "zotero-binding",
      confidence: "deterministic",
      createdAt: args.timestamp,
      updatedAt: args.timestamp,
    });
    identifiers.push(
      ...(identifierRowsForPaper(paper, literatureItemId, args.timestamp) ||
        []),
    );
    zoteroBindings.push({
      libraryId: paper.library_id,
      itemKey: paper.item_key,
      literatureItemId,
      itemType: paper.item_type,
      bindingStatus: "active",
      dateAdded: paper.date_added,
      tagsJson: JSON.stringify(paper.tags || []),
      collectionsJson: JSON.stringify(paper.collections || []),
      createdAt: args.timestamp,
      updatedAt: args.timestamp,
    });
    for (const [artifactType, artifact] of Object.entries(
      paper.artifacts || {},
    )) {
      artifactStates.push({
        literatureItemId,
        artifactType,
        status: cleanString(artifact.status) || "missing",
        payloadHash: artifact.hash,
        noteKey: artifact.note_key,
        diagnosticsJson: JSON.stringify(artifact.diagnostics || []),
        updatedAt: artifact.updated_at || args.timestamp,
      });
    }
  }

  for (const work of args.works) {
    if (work.source !== "reference") {
      continue;
    }
    const literatureItemId = opaqueLiteratureItemId(
      "reference-work",
      work.work_id,
    );
    workLitIds.set(work.work_id, literatureItemId);
    literatureItems.push({
      literatureItemId,
      displayTitle: work.title || work.canonical_key,
      normalizedTitle: normalizeSynthesisLiteratureTitle(
        work.title || work.canonical_key,
      ),
      titleNormalizerVersion: "deterministic-v1",
      year: work.year,
      authorsJson: JSON.stringify(work.authors || []),
      status: "active",
      createdFrom: "reference",
      confidence: "review",
      createdAt: args.timestamp,
      updatedAt: args.timestamp,
    });
    for (const alias of work.aliases || []) {
      const normalizedValue = cleanString(alias).toLocaleLowerCase("en-US");
      if (!normalizedValue) {
        continue;
      }
      identifiers.push({
        literatureItemId,
        kind: "alias",
        normalizedValue,
        displayValue: cleanString(alias),
        source: "canonical-literature-registry",
        confidence: "candidate",
        createdAt: args.timestamp,
        updatedAt: args.timestamp,
      });
    }
  }

  const referenceInstances = args.referenceInstances.map((reference) => ({
    referenceInstanceId: reference.reference_instance_id,
    sourceLiteratureItemId:
      paperLitIds.get(reference.source_paper_ref) ||
      opaqueLiteratureItemId(
        "missing-source-paper",
        reference.source_paper_ref,
      ),
    referenceIndex: reference.reference_index,
    parsedTitle: reference.title,
    normalizedTitle: normalizeSynthesisLiteratureTitle(reference.title),
    year: reference.year,
    authorsJson: JSON.stringify(reference.authors || []),
    rawReference: reference.raw,
    rawReferenceHash: reference.raw ? hashMarkdown(reference.raw) : "",
    createdAt: args.timestamp,
    updatedAt: args.timestamp,
  }));
  const referenceResolutions = args.referenceResolutions.map((resolution) => ({
    resolutionId: resolution.resolution_id,
    referenceInstanceId: resolution.reference_instance_id,
    sourceLiteratureItemId:
      paperLitIds.get(resolution.source_paper_ref) ||
      opaqueLiteratureItemId(
        "missing-source-paper",
        resolution.source_paper_ref,
      ),
    targetLiteratureItemId: resolution.target_paper_ref
      ? paperLitIds.get(resolution.target_paper_ref)
      : resolution.target_work_id
        ? workLitIds.get(resolution.target_work_id)
        : "",
    status:
      resolution.status === "unmatched" ? "unresolved" : resolution.status,
    confidence: resolution.confidence,
    diagnosticsJson: JSON.stringify(resolution.diagnostics || []),
    createdAt: args.timestamp,
    updatedAt: args.timestamp,
  }));
  const reviewItems = args.cleanupProposals.map((proposal) => ({
    reviewItemId: proposal.proposal_id,
    reviewKind: "reference_resolution",
    priority: 1,
    status:
      proposal.status === "open"
        ? "open"
        : proposal.status === "deferred"
          ? "deferred"
          : "resolved",
    scopeKind: "reference_instance",
    scopeRef: proposal.reference_instance_id || proposal.provisional_key || "",
    payloadJson: JSON.stringify(proposal),
    diagnosticsJson: JSON.stringify(proposal.diagnostics || []),
    createdAt: proposal.created_at || args.timestamp,
    updatedAt: proposal.updated_at || args.timestamp,
  }));

  return {
    literatureItems,
    identifiers,
    zoteroBindings,
    artifactStates,
    referenceInstances,
    referenceResolutions,
    reviewItems,
  };
}

function reviewItemId(prefix: string, payload: unknown) {
  return `review:${prefix}:${hashCanonicalJson(payload).slice(
    "sha256:".length,
    "sha256:".length + 24,
  )}`;
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(cleanString(value) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function activeReviewStatus(status: unknown) {
  const normalized = cleanString(status);
  return normalized === "open" || normalized === "blocked_by_upstream_review";
}

function addOrPreserveP0Review(args: {
  state: SynthesisIndexStateReplacement;
  existingReviews: Map<string, SynthesisReviewItemRecord>;
  review: SynthesisReviewItemRecord;
}) {
  const existing = args.existingReviews.get(args.review.reviewItemId);
  if (existing && !activeReviewStatus(existing.status)) {
    args.state.reviewItems?.push(existing);
    return;
  }
  args.state.reviewItems?.push(existing || args.review);
}

function augmentRepositoryIndexStateForP0Reviews(args: {
  repository: SynthesisRepository;
  state: SynthesisIndexStateReplacement;
  timestamp: string;
}) {
  const state = args.state;
  state.reviewItems = state.reviewItems || [];
  const incomingBindingKeys = new Set(
    (state.zoteroBindings || []).map(
      (binding) => `${binding.libraryId}:${binding.itemKey}`,
    ),
  );
  const incomingLiteratureIds = new Set(
    state.literatureItems.map((item) => item.literatureItemId),
  );
  const existingItems = new Map(
    args.repository
      .listLiteratureItems()
      .map((item) => [item.literatureItemId, item] as const),
  );
  const existingReviews = new Map(
    args.repository
      .listReviewItems()
      .map((review) => [review.reviewItemId, review] as const),
  );

  for (const binding of args.repository.listZoteroBindings({
    statuses: ["active", "pending_delete_review"],
  })) {
    const bindingKey = `${binding.libraryId}:${binding.itemKey}`;
    if (incomingBindingKeys.has(bindingKey)) {
      continue;
    }
    const item = existingItems.get(binding.literatureItemId);
    if (item && !incomingLiteratureIds.has(item.literatureItemId)) {
      state.literatureItems.push({
        ...item,
        status: "pending_delete_review",
        updatedAt: args.timestamp,
      });
      incomingLiteratureIds.add(item.literatureItemId);
    }
    state.zoteroBindings?.push({
      ...binding,
      bindingStatus: "pending_delete_review",
      deletedAt: binding.deletedAt || args.timestamp,
      updatedAt: args.timestamp,
    });
    const payload = {
      review_kind: "zotero_item_delete",
      literature_item_id: binding.literatureItemId,
      paper_ref: bindingKey,
      library_id: binding.libraryId,
      item_key: binding.itemKey,
      title: item?.displayTitle,
    };
    addOrPreserveP0Review({
      state,
      existingReviews,
      review: {
        reviewItemId: reviewItemId("zotero-delete", bindingKey),
        reviewKind: "zotero_item_delete",
        priority: 0,
        status: "open",
        scopeKind: "zotero_binding",
        scopeRef: bindingKey,
        payloadJson: JSON.stringify(payload),
        diagnosticsJson: JSON.stringify([
          { code: "zotero_binding_missing_from_registry" },
        ]),
        createdAt: args.timestamp,
        updatedAt: args.timestamp,
      },
    });
  }

  const strongIdentifiers = new Map<
    string,
    NonNullable<SynthesisIndexStateReplacement["identifiers"]>
  >();
  for (const identifier of state.identifiers || []) {
    if (!["doi", "arxiv", "isbn"].includes(identifier.kind)) {
      continue;
    }
    const key = `${identifier.kind}:${identifier.normalizedValue}`;
    strongIdentifiers.set(key, [
      ...(strongIdentifiers.get(key) || []),
      identifier,
    ]);
  }
  const itemsById = new Map(
    state.literatureItems.map((item) => [item.literatureItemId, item] as const),
  );
  const bindingsByItem = new Map(
    (state.zoteroBindings || []).map(
      (binding) => [binding.literatureItemId, binding] as const,
    ),
  );
  for (const [identifierKey, rows] of strongIdentifiers) {
    const literatureIds = Array.from(
      new Set(rows.map((row) => row.literatureItemId).filter(Boolean)),
    ).sort((left, right) => left.localeCompare(right));
    if (literatureIds.length < 2) {
      continue;
    }
    const [survivor, duplicate] = literatureIds;
    const candidates = literatureIds.map((literatureItemId) => {
      const item = itemsById.get(literatureItemId);
      const binding = bindingsByItem.get(literatureItemId);
      return {
        literature_item_id: literatureItemId,
        paper_ref: binding ? `${binding.libraryId}:${binding.itemKey}` : "",
        title: item?.displayTitle,
        year: item?.year,
      };
    });
    const payload = {
      review_kind: "zotero_dedupe_candidate",
      literature_item_id: duplicate,
      surviving_literature_item_id: survivor,
      identifier_key: identifierKey,
      candidates,
    };
    addOrPreserveP0Review({
      state,
      existingReviews,
      review: {
        reviewItemId: reviewItemId("zotero-dedupe", identifierKey),
        reviewKind: "zotero_dedupe_candidate",
        priority: 0,
        status: "open",
        scopeKind: "identifier",
        scopeRef: identifierKey,
        payloadJson: JSON.stringify(payload),
        diagnosticsJson: JSON.stringify([
          { code: "duplicate_strong_identifier_candidate" },
        ]),
        createdAt: args.timestamp,
        updatedAt: args.timestamp,
      },
    });
  }

  const referencesById = new Map(
    (state.referenceInstances || []).map(
      (reference) => [reference.referenceInstanceId, reference] as const,
    ),
  );
  const resolutionsByReferenceId = new Map(
    (state.referenceResolutions || []).map(
      (resolution) => [resolution.referenceInstanceId, resolution] as const,
    ),
  );
  const openP0Reviews = state.reviewItems.filter(
    (review) => review.priority === 0 && review.status === "open",
  );
  for (const review of state.reviewItems) {
    if (
      review.reviewKind !== "reference_resolution" ||
      review.status !== "open"
    ) {
      continue;
    }
    const reference = referencesById.get(cleanString(review.scopeRef));
    const resolution = resolutionsByReferenceId.get(
      cleanString(review.scopeRef),
    );
    const blocker = openP0Reviews.find((p0) => {
      const payload = parseJsonObject(p0.payloadJson);
      const affectedIds = new Set(
        [
          cleanString(payload.literature_item_id),
          cleanString(payload.surviving_literature_item_id),
          ...(
            (Array.isArray(payload.candidates)
              ? payload.candidates
              : []) as Array<Record<string, unknown>>
          ).map((candidate) => cleanString(candidate.literature_item_id)),
        ].filter(Boolean),
      );
      return (
        (reference && affectedIds.has(reference.sourceLiteratureItemId)) ||
        (resolution?.targetLiteratureItemId &&
          affectedIds.has(resolution.targetLiteratureItemId))
      );
    });
    if (blocker) {
      review.status = "blocked_by_upstream_review";
      review.blockedByReviewItemId = blocker.reviewItemId;
      review.diagnosticsJson = JSON.stringify([
        ...((JSON.parse(review.diagnosticsJson || "[]") as unknown[]) || []),
        {
          code: "blocked_by_p0_index_review",
          blocked_by_review_item_id: blocker.reviewItemId,
        },
      ]);
    }
  }
}

function rowToPaperRecord(
  row: PaperRegistryRow,
  input?: PaperRegistryInput,
): LiteratureRegistryPaperRecord {
  return {
    paper_ref: row.paper_ref,
    library_id: row.library_id,
    item_key: row.item_key,
    title: row.title,
    year: row.year || undefined,
    item_type: row.item_type || input?.itemType || undefined,
    tags: [...(row.tags || [])],
    collections: [...(row.collections || [])],
    creators: cleanList(input?.creators),
    doi: cleanString(input?.doi) || undefined,
    arxiv: cleanString(input?.arxiv) || undefined,
    url: cleanString(input?.url) || undefined,
    citekey: cleanString(input?.citekey) || undefined,
    date_added: cleanString(input?.dateAdded) || undefined,
    artifacts: row.artifacts,
    facets: row.facets,
    readiness: row.readiness,
    coverage: row.coverage,
    diagnostics: [...(row.diagnostics || [])],
    row_hash: row.row_hash,
  };
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
  const artifacts = Object.fromEntries(
    REGISTRY_ARTIFACT_TYPES.map((type) => [
      type,
      paperRegistryArtifactFromFact(type, fact),
    ]),
  ) as PaperRegistryRow["artifacts"];
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
  const tags = cleanList(parseJsonArray(fact.tagsJson));
  const collections = cleanList(parseJsonArray(fact.collectionsJson));
  const creators = cleanList(parseJsonArray(fact.authorsJson));
  const paperReference = `${fact.libraryId}:${fact.itemKey}`;
  const artifactUpdatedAt = Object.values(artifacts)
    .map((entry) => cleanString(entry.updated_at))
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0];
  const rowWithoutHash = {
    paper_ref: paperReference,
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
          paper_ref: paperReference,
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

function paperInputFromFact(
  fact: SynthesisPaperRegistryFact,
): PaperRegistryInput {
  return {
    libraryId: fact.libraryId,
    itemKey: fact.itemKey,
    title: cleanString(fact.displayTitle),
    year: cleanString(fact.year) || undefined,
    itemType: cleanString(fact.itemType) || undefined,
    tags: cleanList(parseJsonArray(fact.tagsJson)),
    collections: cleanList(parseJsonArray(fact.collectionsJson)),
    creators: cleanList(parseJsonArray(fact.authorsJson)),
    doi: identifierValue(fact, "doi") || undefined,
    arxiv: identifierValue(fact, "arxiv") || undefined,
    url: identifierValue(fact, "url") || undefined,
    citekey: identifierValue(fact, "citekey") || undefined,
    dateAdded: cleanString(fact.dateAdded) || undefined,
  };
}

function graphPaperToRecord(
  input: CitationGraphPaperInput,
): LiteratureRegistryPaperRecord {
  const base = {
    paper_ref: paperRef({ libraryId: input.libraryId, itemKey: input.itemKey }),
    library_id: input.libraryId,
    item_key: input.itemKey,
    title: input.title,
    year: cleanString(input.year),
    item_type: "",
    tags: [],
    collections: [],
    creators: cleanList(input.authors),
    doi: cleanString(input.doi) || undefined,
    arxiv: cleanString(input.arxiv) || undefined,
    url: cleanString(input.url) || undefined,
    citekey: cleanString(input.citekey) || undefined,
    date_added: cleanString(input.dateAdded) || undefined,
    readiness: "partial" as const,
    coverage: "partial" as const,
    diagnostics: [],
  };
  return {
    ...base,
    row_hash: hashCanonicalJson(base),
  };
}

function fallbackFacetsForPaper(
  paper: LiteratureRegistryPaperRecord,
): PaperRegistryFacets {
  const identity = {
    library_id: paper.library_id,
    item_key: paper.item_key,
    paper_ref: paper.paper_ref,
    citekey: cleanString(paper.citekey),
    date_added: cleanString(paper.date_added),
  };
  const metadata = {
    title: cleanString(paper.title),
    year: cleanString(paper.year),
    item_type: cleanString(paper.item_type),
    creators: cleanList(paper.creators),
    tags: cleanList(paper.tags),
    collections: cleanList(paper.collections),
    doi: cleanString(paper.doi),
    arxiv: cleanString(paper.arxiv),
    url: cleanString(paper.url),
  };
  const timestamp = cleanString(paper.date_added) || undefined;
  return {
    identity: {
      hash: hashCanonicalJson(identity),
      status: "ready",
      updated_at: timestamp,
    },
    metadata: { hash: hashCanonicalJson(metadata), status: "ready" },
    artifact: {
      hash: hashCanonicalJson(paper.artifacts || {}),
      status: paper.coverage === "complete" ? "ready" : paper.coverage,
    },
    reference: {
      hash: hashCanonicalJson({
        references: paper.artifacts?.references?.hash,
        citation_analysis: paper.artifacts?.citation_analysis?.hash,
      }),
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
}

function buildCanonicalRecords(args: {
  registryInputs: PaperRegistryInput[];
  graphInputs: CitationGraphPaperInput[];
  timestamp: string;
}) {
  const rows = buildPaperRegistryRows(args.registryInputs);
  const inputByRef = new Map(
    args.registryInputs.map((input) => [
      paperRef({ libraryId: input.libraryId, itemKey: input.itemKey }),
      input,
    ]),
  );
  const graphByRef = new Map(
    args.graphInputs.map((input) => [
      paperRef({ libraryId: input.libraryId, itemKey: input.itemKey }),
      input,
    ]),
  );
  const papers = new Map<string, LiteratureRegistryPaperRecord>();
  for (const row of rows) {
    papers.set(
      row.paper_ref,
      rowToPaperRecord(row, inputByRef.get(row.paper_ref)),
    );
  }
  for (const graphInput of args.graphInputs) {
    const ref = paperRef({
      libraryId: graphInput.libraryId,
      itemKey: graphInput.itemKey,
    });
    if (!papers.has(ref)) {
      papers.set(ref, graphPaperToRecord(graphInput));
    }
  }

  const works = new Map<string, LiteratureRegistryWorkRecord>();
  const instances: LiteratureRegistryReferenceInstanceRecord[] = [];
  const resolutions: LiteratureRegistryReferenceResolutionRecord[] = [];
  const contexts: LiteratureRegistryCitationContextRecord[] = [];
  const cleanup = new Map<string, LiteratureRegistryCleanupProposalRecord>();
  const paperIdentityIndex = buildReferenceMatcherIndex(
    args.graphInputs.map(
      (input): ReferenceMatcherPaperInput => ({
        paperRef: paperRef({
          libraryId: input.libraryId,
          itemKey: input.itemKey,
        }),
        itemKey: input.itemKey,
        title: cleanString(input.title) || undefined,
        normalizedTitle: normalizeSynthesisLiteratureTitle(input.title),
        year: cleanString(input.year) || undefined,
        authors: cleanList(input.authors),
        doi: cleanString(input.doi) || undefined,
        arxiv: cleanString(input.arxiv) || undefined,
        url: cleanString(input.url) || undefined,
        citekey: cleanString(input.citekey) || undefined,
      }),
    ),
  );
  for (const input of args.graphInputs) {
    const workId = workIdFor(input);
    works.set(workId, {
      work_id: workId,
      canonical_key: referenceKey(input),
      title: cleanString(input.title) || undefined,
      year: cleanString(input.year) || undefined,
      authors: cleanList(input.authors),
      source: "library-paper",
      aliases: cleanList([input.doi, input.arxiv, input.url, input.citekey]),
    });
  }

  for (const input of args.graphInputs) {
    const sourceRef = paperRef({
      libraryId: input.libraryId,
      itemKey: input.itemKey,
    });
    for (const [index, reference] of [...(input.references || [])].entries()) {
      const provisionalKey = referenceKey(reference);
      const instanceId = `refinst:${safeSegment(`${sourceRef}:${index}:${provisionalKey}`)}`;
      const roles = cleanList(reference.roles);
      const instance: LiteratureRegistryReferenceInstanceRecord = {
        reference_instance_id: instanceId,
        source_paper_ref: sourceRef,
        reference_index: index,
        provisional_key: provisionalKey,
        title: cleanString(reference.title) || undefined,
        year: cleanString(reference.year) || undefined,
        authors: cleanList(reference.authors),
        doi: cleanString(reference.doi) || undefined,
        arxiv: cleanString(reference.arxiv) || undefined,
        url: cleanString(reference.url) || undefined,
        citekey: cleanString(reference.citekey) || undefined,
        raw: cleanString(reference.raw) || undefined,
        roles,
      };
      instances.push(instance);
      const target = resolveReferenceWithPolicy(
        {
          referenceInstanceId: instanceId,
          title: instance.title,
          parsedTitle: instance.title,
          normalizedTitle: normalizeSynthesisLiteratureTitle(instance.title),
          year: instance.year,
          authors: instance.authors,
          rawReference: instance.raw,
          doi: instance.doi,
          arxiv: instance.arxiv,
          url: instance.url,
          citekey: instance.citekey,
        },
        paperIdentityIndex,
        "production",
      );
      const targetDiagnostics = [
        ...target.diagnostics,
        ...(target.suggestedCandidates.length
          ? [
              {
                code: "suggested_reference_match_candidates",
                suggested_candidates: target.suggestedCandidates.slice(0, 3),
              },
            ]
          : []),
      ];
      const targetWorkId = target.targetPaperRef
        ? undefined
        : workIdFor(reference);
      if (targetWorkId) {
        works.set(targetWorkId, {
          work_id: targetWorkId,
          canonical_key: provisionalKey,
          title: instance.title,
          year: instance.year,
          authors: [...instance.authors],
          source: "reference",
          aliases: cleanList([
            reference.doi,
            reference.arxiv,
            reference.url,
            reference.citekey,
          ]),
        });
      }
      resolutions.push({
        resolution_id: `resolution:${safeSegment(instanceId)}`,
        reference_instance_id: instanceId,
        source_paper_ref: sourceRef,
        provisional_key: provisionalKey,
        status: target.status,
        target_paper_ref: target.targetPaperRef,
        target_work_id: targetWorkId,
        confidence: target.confidence,
        diagnostics: targetDiagnostics,
      });
      contexts.push({
        context_id: `context:${safeSegment(instanceId)}`,
        reference_instance_id: instanceId,
        source_paper_ref: sourceRef,
        roles,
        evidence_count: roles.length,
      });
      if (!target.targetPaperRef) {
        const proposalId = `cleanup:${safeSegment(instanceId)}`;
        cleanup.set(proposalId, {
          proposal_id: proposalId,
          kind: "reference_resolution",
          status: "open",
          source_paper_ref: sourceRef,
          reference_instance_id: instanceId,
          provisional_key: provisionalKey,
          reason: "reference target requires review",
          diagnostics: [{ code: "unresolved_reference" }, ...targetDiagnostics],
          created_at: args.timestamp,
          updated_at: args.timestamp,
        });
      }
    }
  }

  return {
    rows,
    graphInputs: args.graphInputs,
    papers: [...papers.values()].sort((left, right) =>
      left.paper_ref.localeCompare(right.paper_ref),
    ),
    works: [...works.values()].sort((left, right) =>
      left.work_id.localeCompare(right.work_id),
    ),
    reference_instances: instances.sort((left, right) =>
      left.reference_instance_id.localeCompare(right.reference_instance_id),
    ),
    reference_resolutions: resolutions.sort((left, right) =>
      left.resolution_id.localeCompare(right.resolution_id),
    ),
    citation_contexts: contexts.sort((left, right) =>
      left.context_id.localeCompare(right.context_id),
    ),
    cleanup_proposals: [...cleanup.values()].sort((left, right) =>
      left.proposal_id.localeCompare(right.proposal_id),
    ),
  };
}

function canonicalAssetsForRecords(args: {
  records: {
    papers: LiteratureRegistryPaperRecord[];
    works: LiteratureRegistryWorkRecord[];
    reference_instances: LiteratureRegistryReferenceInstanceRecord[];
    reference_resolutions: LiteratureRegistryReferenceResolutionRecord[];
    citation_contexts: LiteratureRegistryCitationContextRecord[];
    cleanup_proposals: LiteratureRegistryCleanupProposalRecord[];
  };
  manifest: LiteratureRegistryManifest;
}) {
  return [
    ...args.records.papers.map((paper) =>
      asset(paperAssetPath(paper), PAPER_SCHEMA_ID, paper),
    ),
    ...args.records.works.map((work) =>
      asset(workAssetPath(work), WORK_SCHEMA_ID, work),
    ),
    ...args.records.reference_instances.map((reference) =>
      asset(
        referenceInstanceAssetPath(reference),
        REFERENCE_INSTANCE_SCHEMA_ID,
        reference,
      ),
    ),
    ...args.records.reference_resolutions.map((resolution) =>
      asset(
        referenceResolutionAssetPath(resolution),
        REFERENCE_RESOLUTION_SCHEMA_ID,
        resolution,
      ),
    ),
    ...args.records.citation_contexts.map((context) =>
      asset(
        citationContextAssetPath(context),
        CITATION_CONTEXT_SCHEMA_ID,
        context,
      ),
    ),
    ...args.records.cleanup_proposals.map((proposal) =>
      asset(
        cleanupProposalAssetPath(proposal),
        CLEANUP_PROPOSAL_SCHEMA_ID,
        proposal,
      ),
    ),
    asset("citation-graph/manifest.json", MANIFEST_SCHEMA_ID, args.manifest),
  ];
}

function repositoryResolutionStatus(
  status: unknown,
): LiteratureRegistryReferenceResolutionRecord["status"] {
  const normalized = cleanString(status);
  if (normalized === "matched") {
    return "matched";
  }
  if (normalized === "ambiguous") {
    return "ambiguous";
  }
  if (normalized === "ignored") {
    return "ignored";
  }
  return "unmatched";
}

function repositoryResolutionConfidence(
  confidence: unknown,
): LiteratureRegistryReferenceResolutionRecord["confidence"] {
  const normalized = cleanString(confidence);
  if (normalized === "deterministic" || normalized === "low") {
    return normalized;
  }
  return "review";
}

function buildCanonicalRecordsFromRepository(args: {
  repository: SynthesisRepository;
  timestamp: string;
}) {
  const facts: SynthesisPaperRegistryFact[] = [];
  let cursor: unknown = 0;
  do {
    const page = args.repository.listPaperRegistryFacts({
      cursor,
      limit: 250,
    });
    facts.push(...page.entries);
    cursor = page.nextCursor;
  } while (cursor !== null);

  const papers = facts.map((fact) =>
    rowToPaperRecord(paperRegistryRowFromFact(fact), paperInputFromFact(fact)),
  );
  const bindings = args.repository.listZoteroBindings({ statuses: ["active"] });
  const paperRefByLiteratureItem = new Map(
    bindings.map((binding) => [
      binding.literatureItemId,
      `${binding.libraryId}:${binding.itemKey}`,
    ]),
  );
  const identifiersByLiteratureItem = new Map<string, string[]>();
  for (const identifier of args.repository.listIdentifiers()) {
    const bucket =
      identifiersByLiteratureItem.get(identifier.literatureItemId) || [];
    bucket.push(
      cleanString(identifier.displayValue || identifier.normalizedValue),
    );
    identifiersByLiteratureItem.set(identifier.literatureItemId, bucket);
  }
  const works: LiteratureRegistryWorkRecord[] = [];
  const workIdByLiteratureItem = new Map<string, string>();
  for (const item of args.repository.listLiteratureItems()) {
    if (cleanString(item.status) !== "active") {
      continue;
    }
    if (paperRefByLiteratureItem.has(item.literatureItemId)) {
      continue;
    }
    const createdFrom = cleanString(item.createdFrom);
    if (createdFrom !== "reference" && createdFrom !== "extracted_reference") {
      continue;
    }
    const workId = `work:${safeSegment(item.literatureItemId)}`;
    workIdByLiteratureItem.set(item.literatureItemId, workId);
    works.push({
      work_id: workId,
      canonical_key:
        cleanString(item.normalizedTitle) ||
        normalizeSynthesisLiteratureTitle(item.displayTitle),
      title: cleanString(item.displayTitle) || undefined,
      year: cleanString(item.year) || undefined,
      authors: cleanList(parseJsonArray(item.authorsJson)),
      source: "reference",
      aliases: cleanList(
        identifiersByLiteratureItem.get(item.literatureItemId),
      ),
    });
  }

  const rolesByReference = new Map<string, string[]>();
  for (const edge of args.repository.listCitationEdges()) {
    const referenceId = cleanString(edge.referenceInstanceId);
    if (!referenceId) {
      continue;
    }
    rolesByReference.set(
      referenceId,
      cleanList([
        ...(rolesByReference.get(referenceId) || []),
        ...parseJsonArray(edge.rolesJson),
      ]),
    );
  }

  const referenceInstances = args.repository
    .listReferenceInstances()
    .map((reference) => {
      const sourcePaperRef =
        paperRefByLiteratureItem.get(reference.sourceLiteratureItemId) ||
        `missing:${safeSegment(reference.sourceLiteratureItemId)}`;
      const provisionalKey =
        cleanString(reference.normalizedTitle) ||
        normalizeSynthesisLiteratureTitle(reference.parsedTitle) ||
        cleanString(reference.rawReferenceHash) ||
        reference.referenceInstanceId;
      return {
        reference_instance_id: reference.referenceInstanceId,
        source_paper_ref: sourcePaperRef,
        reference_index: reference.referenceIndex,
        provisional_key: provisionalKey,
        title: cleanString(reference.parsedTitle) || undefined,
        year: cleanString(reference.year) || undefined,
        authors: cleanList(parseJsonArray(reference.authorsJson)),
        raw: cleanString(reference.rawReference) || undefined,
        roles: rolesByReference.get(reference.referenceInstanceId) || [],
      };
    });
  const referenceById = new Map(
    referenceInstances.map(
      (reference) => [reference.reference_instance_id, reference] as const,
    ),
  );

  const referenceResolutions = args.repository
    .listReferenceResolutions()
    .map((resolution) => {
      const reference = referenceById.get(resolution.referenceInstanceId);
      const targetPaperRef = resolution.targetLiteratureItemId
        ? paperRefByLiteratureItem.get(resolution.targetLiteratureItemId)
        : undefined;
      const targetWorkId = resolution.targetLiteratureItemId
        ? workIdByLiteratureItem.get(resolution.targetLiteratureItemId)
        : undefined;
      return {
        resolution_id: resolution.resolutionId,
        reference_instance_id: resolution.referenceInstanceId,
        source_paper_ref:
          reference?.source_paper_ref ||
          paperRefByLiteratureItem.get(resolution.sourceLiteratureItemId) ||
          `missing:${safeSegment(resolution.sourceLiteratureItemId)}`,
        provisional_key:
          reference?.provisional_key || resolution.referenceInstanceId,
        status: repositoryResolutionStatus(resolution.status),
        target_paper_ref: targetPaperRef,
        target_work_id: targetPaperRef ? undefined : targetWorkId,
        confidence: repositoryResolutionConfidence(resolution.confidence),
        diagnostics: parseJsonArray(resolution.diagnosticsJson),
      };
    });

  const citationContexts = referenceInstances.map((reference) => ({
    context_id: `context:${safeSegment(reference.reference_instance_id)}`,
    reference_instance_id: reference.reference_instance_id,
    source_paper_ref: reference.source_paper_ref,
    roles: [...reference.roles],
    evidence_count: reference.roles.length,
  }));

  const cleanupProposals = args.repository
    .listReviewItems({ reviewKind: "reference_resolution" })
    .map((review) => {
      const payload = parseJsonObject(review.payloadJson);
      const reference = referenceById.get(cleanString(review.scopeRef));
      return {
        proposal_id: review.reviewItemId,
        kind: "reference_resolution" as const,
        status:
          review.status === "deferred"
            ? ("deferred" as const)
            : review.status === "resolved"
              ? ("resolved" as const)
              : ("open" as const),
        source_paper_ref:
          reference?.source_paper_ref ||
          cleanString(payload.source_paper_ref) ||
          "missing:source",
        reference_instance_id:
          reference?.reference_instance_id ||
          cleanString(payload.reference_instance_id) ||
          undefined,
        provisional_key:
          reference?.provisional_key ||
          cleanString(payload.provisional_key) ||
          undefined,
        reason:
          cleanString(payload.reason) || "reference target requires review",
        diagnostics: parseJsonArray(review.diagnosticsJson),
        created_at: cleanString(review.createdAt) || args.timestamp,
        updated_at: cleanString(review.updatedAt) || args.timestamp,
      };
    });

  return {
    rows: facts.map(paperRegistryRowFromFact),
    graphInputs: [],
    papers: papers.sort((left, right) =>
      left.paper_ref.localeCompare(right.paper_ref),
    ),
    works: works.sort((left, right) =>
      left.work_id.localeCompare(right.work_id),
    ),
    reference_instances: referenceInstances.sort((left, right) =>
      left.reference_instance_id.localeCompare(right.reference_instance_id),
    ),
    reference_resolutions: referenceResolutions.sort((left, right) =>
      left.resolution_id.localeCompare(right.resolution_id),
    ),
    citation_contexts: citationContexts.sort((left, right) =>
      left.context_id.localeCompare(right.context_id),
    ),
    cleanup_proposals: cleanupProposals.sort((left, right) =>
      left.proposal_id.localeCompare(right.proposal_id),
    ),
  };
}

function manifestFor(args: {
  paperCount: number;
  workCount: number;
  referenceInstanceCount: number;
  referenceResolutionCount: number;
  citationContextCount: number;
  cleanupProposalCount: number;
  updatedAt: string;
}) {
  const base = {
    paper_count: args.paperCount,
    work_count: args.workCount,
    reference_instance_count: args.referenceInstanceCount,
    reference_resolution_count: args.referenceResolutionCount,
    citation_context_count: args.citationContextCount,
    cleanup_proposal_count: args.cleanupProposalCount,
    updated_at: args.updatedAt,
    projection_targets: [
      SYNTHESIS_LITERATURE_REGISTRY_INDEX_TARGET,
      SYNTHESIS_CITATION_GRAPH_INDEX_TARGET,
    ] as LiteratureRegistryManifest["projection_targets"],
  };
  return {
    manifest_hash: hashCanonicalJson(base),
    ...base,
  };
}

function asset(relativePath: string, schemaId: string, data: unknown) {
  return { relativePath, schemaId, data };
}

function paperAssetPath(paper: LiteratureRegistryPaperRecord) {
  return `citation-graph/papers/${safeSegment(paper.paper_ref)}.json`;
}

function workAssetPath(work: LiteratureRegistryWorkRecord) {
  return `citation-graph/works/${canonicalAssetFileName("work", work.work_id)}`;
}

function legacyWorkAssetPath(work: LiteratureRegistryWorkRecord) {
  return `citation-graph/works/${safeSegment(work.work_id)}.json`;
}

function referenceInstanceAssetPath(
  reference: LiteratureRegistryReferenceInstanceRecord,
) {
  return `citation-graph/reference-instances/${canonicalAssetFileName(
    "refinst",
    reference.reference_instance_id,
  )}`;
}

function legacyReferenceInstanceAssetPath(
  reference: LiteratureRegistryReferenceInstanceRecord,
) {
  return `citation-graph/reference-instances/${safeSegment(reference.reference_instance_id)}.json`;
}

function referenceResolutionAssetPath(
  resolution: LiteratureRegistryReferenceResolutionRecord,
) {
  return `citation-graph/reference-resolutions/${canonicalAssetFileName(
    "resolution",
    resolution.resolution_id,
  )}`;
}

function legacyReferenceResolutionAssetPath(
  resolution: LiteratureRegistryReferenceResolutionRecord,
) {
  return `citation-graph/reference-resolutions/${safeSegment(resolution.resolution_id)}.json`;
}

function citationContextAssetPath(
  context: LiteratureRegistryCitationContextRecord,
) {
  return `citation-graph/contexts/${canonicalAssetFileName(
    "context",
    context.context_id,
  )}`;
}

function legacyCitationContextAssetPath(
  context: LiteratureRegistryCitationContextRecord,
) {
  return `citation-graph/contexts/${safeSegment(context.context_id)}.json`;
}

function cleanupProposalAssetPath(
  proposal: LiteratureRegistryCleanupProposalRecord,
) {
  return `citation-graph/cleanup-proposals/${canonicalAssetFileName(
    "cleanup",
    proposal.proposal_id,
  )}`;
}

function legacyCleanupProposalAssetPath(
  proposal: LiteratureRegistryCleanupProposalRecord,
) {
  return `citation-graph/cleanup-proposals/${safeSegment(proposal.proposal_id)}.json`;
}

function withLegacyAssetPaths(paths: string[], legacyPaths: string[]) {
  return Array.from(
    new Set([
      ...paths,
      ...legacyPaths.filter(
        (relativePath) => validateManagedRelativePath(relativePath).ok,
      ),
    ]),
  );
}

function graphInputsFromCanonical(args: {
  papers: LiteratureRegistryPaperRecord[];
  references: LiteratureRegistryReferenceInstanceRecord[];
}): CitationGraphPaperInput[] {
  const refsByPaper = new Map<
    string,
    LiteratureRegistryReferenceInstanceRecord[]
  >();
  for (const reference of args.references) {
    refsByPaper.set(reference.source_paper_ref, [
      ...(refsByPaper.get(reference.source_paper_ref) || []),
      reference,
    ]);
  }
  return args.papers.map((paper) => ({
    libraryId: paper.library_id,
    itemKey: paper.item_key,
    title: paper.title,
    year: paper.year,
    authors: [...(paper.creators || [])],
    doi: paper.doi,
    arxiv: paper.arxiv,
    url: paper.url,
    citekey: paper.citekey,
    dateAdded: paper.date_added,
    references: (refsByPaper.get(paper.paper_ref) || [])
      .sort((left, right) => left.reference_index - right.reference_index)
      .map((reference) => ({
        citekey: reference.citekey,
        doi: reference.doi,
        arxiv: reference.arxiv,
        url: reference.url,
        title: reference.title,
        year: reference.year,
        authors: [...reference.authors],
        raw: reference.raw,
        roles: [...reference.roles],
      })),
  }));
}

function paperNodeIdForRecord(paper: LiteratureRegistryPaperRecord) {
  return `zotero:item:${cleanString(paper.item_key)}`;
}

function paperRefFromNodeId(
  nodeId: string,
  papers: LiteratureRegistryPaperRecord[],
) {
  const byNode = new Map(
    papers.map((paper) => [paperNodeIdForRecord(paper), paper.paper_ref]),
  );
  return byNode.get(nodeId);
}

function citationStructureFor(args: {
  graph: CitationGraph;
  papers: LiteratureRegistryPaperRecord[];
  references: LiteratureRegistryReferenceInstanceRecord[];
  manifestHash: string;
  timestamp: string;
}) {
  const referencesByPaper = new Map<
    string,
    LiteratureRegistryReferenceInstanceRecord[]
  >();
  for (const reference of args.references) {
    referencesByPaper.set(reference.source_paper_ref, [
      ...(referencesByPaper.get(reference.source_paper_ref) || []),
      reference,
    ]);
  }
  const sourcePaperEdges: NonNullable<
    CitationGraphIndexProjection["structure"]
  >["ownership"]["source_paper_edges"] = {};
  for (const paper of args.papers) {
    const nodeId = paperNodeIdForRecord(paper);
    const edgeIds = args.graph.edges
      .filter((edge) => edge.source === nodeId)
      .map((edge) => edge.edge_id)
      .sort((left, right) => left.localeCompare(right));
    const referenceInstanceIds = (referencesByPaper.get(paper.paper_ref) || [])
      .map((reference) => reference.reference_instance_id)
      .sort((left, right) => left.localeCompare(right));
    const base = {
      node_id: nodeId,
      edge_ids: edgeIds,
      reference_instance_ids: referenceInstanceIds,
    };
    sourcePaperEdges[paper.paper_ref] = {
      ...base,
      hash: hashCanonicalJson(base),
      updated_at: args.timestamp,
    };
  }
  const targetGroups: NonNullable<
    CitationGraphIndexProjection["structure"]
  >["ownership"]["target_groups"] = {};
  for (const edge of args.graph.edges) {
    const sourcePaperRef = paperRefFromNodeId(edge.source, args.papers);
    const existing = targetGroups[edge.target] || {
      target_node_id: edge.target,
      edge_ids: [],
      source_paper_refs: [],
      hash: "",
      updated_at: args.timestamp,
    };
    existing.edge_ids.push(edge.edge_id);
    if (sourcePaperRef) {
      existing.source_paper_refs.push(sourcePaperRef);
    }
    targetGroups[edge.target] = existing;
  }
  for (const group of Object.values(targetGroups)) {
    group.edge_ids = Array.from(new Set(group.edge_ids)).sort((left, right) =>
      left.localeCompare(right),
    );
    group.source_paper_refs = Array.from(new Set(group.source_paper_refs)).sort(
      (left, right) => left.localeCompare(right),
    );
    group.hash = hashCanonicalJson({
      target_node_id: group.target_node_id,
      edge_ids: group.edge_ids,
      source_paper_refs: group.source_paper_refs,
    });
  }
  const base = {
    status: "ready" as const,
    source_manifest_hash: args.manifestHash,
    ownership: {
      source_paper_edges: sourcePaperEdges,
      target_groups: Object.fromEntries(
        Object.entries(targetGroups).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    },
  };
  return {
    ...base,
    structure_hash: hashCanonicalJson(base),
    updated_at: args.timestamp,
  };
}

function lightweightMetricsFor(args: {
  graph: CitationGraph;
  resolutions: LiteratureRegistryReferenceResolutionRecord[];
  papers: LiteratureRegistryPaperRecord[];
  timestamp: string;
}) {
  const counts: NonNullable<
    CitationGraphIndexProjection["metric_layers"]
  >["lightweight"]["counts"] = {};
  for (const node of args.graph.nodes) {
    counts[node.node_id] = {
      node_id: node.node_id,
      paper_ref:
        node.kind === "library_paper"
          ? paperRefFromNodeId(node.node_id, args.papers)
          : undefined,
      incoming: 0,
      outgoing: 0,
      external: 0,
      unresolved: 0,
    };
  }
  const nodeById = new Map(
    args.graph.nodes.map((node) => [node.node_id, node]),
  );
  for (const edge of args.graph.edges) {
    const weight = Math.max(1, Number(edge.mention_count) || 1);
    if (counts[edge.source]) {
      counts[edge.source].outgoing += weight;
      const target = nodeById.get(edge.target);
      if (target?.kind === "external_reference") {
        counts[edge.source].external += weight;
      }
      if (target?.kind === "unresolved_reference") {
        counts[edge.source].unresolved += weight;
      }
    }
    if (counts[edge.target]) {
      counts[edge.target].incoming += weight;
    }
  }
  return {
    status: "ready" as const,
    source_graph_hash: args.graph.graph_hash,
    updated_at: args.timestamp,
    counts: Object.fromEntries(
      Object.entries(counts).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    resolution_summary: {
      matched: args.resolutions.filter(
        (resolution) => resolution.status === "matched",
      ).length,
      unresolved: args.resolutions.filter(
        (resolution) => resolution.status === "unmatched",
      ).length,
      ambiguous: args.resolutions.filter(
        (resolution) => resolution.status === "ambiguous",
      ).length,
    },
  };
}

function layoutLayersFor(args: {
  graph: CitationGraph;
  metrics: CitationGraphMetrics;
  layouts: CitationGraphIndexProjection["layouts"];
  timestamp: string;
  existing?: CitationGraphIndexProjection["layout_layers"];
  computed: boolean;
}) {
  const complexMetricsHash =
    args.metrics.graph_hash === args.graph.graph_hash
      ? args.metrics.metrics_hash
      : undefined;
  return Object.fromEntries(
    CITATION_LAYOUT_PRESETS.map((preset) => {
      const existing = args.existing?.[preset];
      const layout = args.layouts[preset];
      const ready =
        args.computed &&
        layout?.graph_hash === args.graph.graph_hash &&
        Boolean(complexMetricsHash);
      if (ready) {
        return [
          preset,
          {
            status: "ready" as const,
            source_graph_hash: args.graph.graph_hash,
            source_complex_metrics_hash: complexMetricsHash,
            updated_at: args.timestamp,
            diagnostics: [],
          },
        ];
      }
      if (!layout) {
        return [
          preset,
          {
            status: "missing" as const,
            source_graph_hash: args.graph.graph_hash,
            source_complex_metrics_hash: existing?.source_complex_metrics_hash,
            updated_at: args.timestamp,
            diagnostics: [{ code: "citation_graph_layout_missing" }],
          },
        ];
      }
      const current =
        existing?.status === "ready" &&
        existing.source_graph_hash === args.graph.graph_hash &&
        layout.graph_hash === args.graph.graph_hash &&
        (!existing.source_complex_metrics_hash ||
          existing.source_complex_metrics_hash === complexMetricsHash);
      return [
        preset,
        {
          status: current ? ("ready" as const) : ("stale" as const),
          source_graph_hash: current
            ? existing?.source_graph_hash || args.graph.graph_hash
            : args.graph.graph_hash,
          source_complex_metrics_hash: current
            ? existing?.source_complex_metrics_hash
            : complexMetricsHash,
          updated_at: current
            ? existing?.updated_at || args.timestamp
            : args.timestamp,
          diagnostics: current
            ? existing?.diagnostics || []
            : [{ code: "citation_graph_layout_stale" }],
        },
      ];
    }),
  ) as NonNullable<CitationGraphIndexProjection["layout_layers"]>;
}

async function readAssetList<T>(args: {
  root: string;
  absoluteDir: string;
  relativeDir: string;
  schemaId: string;
}) {
  const children = await listRuntimeChildren(args.absoluteDir);
  const rows: T[] = [];
  for (const child of children.sort((left: string, right: string) =>
    left.localeCompare(right),
  )) {
    const name = fileName(child);
    if (!name.endsWith(".json")) {
      continue;
    }
    const parsed = await readCanonicalJsonAsset<T>({
      root: args.root,
      relativePath: `${args.relativeDir}/${name}`,
      schemaId: args.schemaId,
      registry,
    }).catch(() => null);
    if (parsed?.data) {
      rows.push(parsed.data);
    }
  }
  return rows;
}

function pathsFor(root: string) {
  const paths = buildSynthesisKnowledgeGraphPaths(root);
  return {
    ...paths,
    papers: joinPath(paths.citationGraphRoot, "papers"),
    referenceInstances: joinPath(
      paths.citationGraphRoot,
      "reference-instances",
    ),
    referenceResolutions: joinPath(
      paths.citationGraphRoot,
      "reference-resolutions",
    ),
    contexts: joinPath(paths.citationGraphRoot, "contexts"),
    works: joinPath(paths.citationGraphRoot, "works"),
    workRedirects: joinPath(paths.citationGraphRoot, "work-redirects"),
    cleanupProposals: joinPath(paths.citationGraphRoot, "cleanup-proposals"),
    manifest: joinPath(paths.citationGraphRoot, "manifest.json"),
    literatureIndex: joinPath(
      paths.stateRoot,
      "literature-registry-index.json",
    ),
    citationIndex: joinPath(paths.stateRoot, "citation-graph-index.json"),
    citationGraph: joinPath(paths.stateRoot, "citation-graph-snapshot.json"),
    citationMetrics: joinPath(paths.stateRoot, "citation-graph-metrics.json"),
    citationLayouts: joinPath(paths.stateRoot, "citation-graph-layouts.json"),
    citationFreshness: joinPath(
      paths.stateRoot,
      "citation-graph-freshness.json",
    ),
  };
}

export function createSynthesisLiteratureRegistryService(
  options: ServiceOptions,
) {
  const root = options.root;
  const now = options.now || nowIso;
  const repository = options.repository || createSynthesisRepository();

  function replaceRepositoryIndexState(args: {
    papers: LiteratureRegistryPaperRecord[];
    works: LiteratureRegistryWorkRecord[];
    referenceInstances: LiteratureRegistryReferenceInstanceRecord[];
    referenceResolutions: LiteratureRegistryReferenceResolutionRecord[];
    cleanupProposals: LiteratureRegistryCleanupProposalRecord[];
    timestamp: string;
  }) {
    const state = buildRepositoryIndexState({
      papers: args.papers,
      works: args.works,
      referenceInstances: args.referenceInstances,
      referenceResolutions: args.referenceResolutions,
      cleanupProposals: args.cleanupProposals,
      timestamp: args.timestamp,
    });
    augmentRepositoryIndexStateForP0Reviews({
      repository,
      state,
      timestamp: args.timestamp,
    });
    repository.replaceIndexState(state);
  }

  async function initialize() {
    const paths = await initializeSynthesisKnowledgeGraphStore(root);
    const localPaths = pathsFor(root);
    await Promise.all([
      ensureRuntimeDirectory(localPaths.papers),
      ensureRuntimeDirectory(localPaths.referenceInstances),
      ensureRuntimeDirectory(localPaths.referenceResolutions),
      ensureRuntimeDirectory(localPaths.contexts),
      ensureRuntimeDirectory(localPaths.works),
      ensureRuntimeDirectory(localPaths.workRedirects),
      ensureRuntimeDirectory(localPaths.cleanupProposals),
      ensureRuntimeDirectory(paths.stateRoot),
    ]);
    if (!(await runtimePathExists(localPaths.manifest))) {
      const timestamp = now();
      const manifest = manifestFor({
        paperCount: 0,
        workCount: 0,
        referenceInstanceCount: 0,
        referenceResolutionCount: 0,
        citationContextCount: 0,
        cleanupProposalCount: 0,
        updatedAt: timestamp,
      });
      await writeCanonicalTransaction({
        root,
        scope: "citation-graph",
        assets: [
          asset("citation-graph/manifest.json", MANIFEST_SCHEMA_ID, manifest),
        ],
        registry,
        transactionId: "literature-registry-init",
        projectionTargets: [
          SYNTHESIS_LITERATURE_REGISTRY_INDEX_TARGET,
          SYNTHESIS_CITATION_GRAPH_INDEX_TARGET,
        ],
        sourceManifestHash: manifest.manifest_hash,
        now: timestamp,
      }).catch(() => undefined);
    }
    return localPaths;
  }

  async function loadCanonical() {
    const paths = await initialize();
    const manifest =
      (
        await readCanonicalJsonAsset<LiteratureRegistryManifest>({
          root,
          relativePath: "citation-graph/manifest.json",
          schemaId: MANIFEST_SCHEMA_ID,
          registry,
        }).catch(() => null)
      )?.data ||
      manifestFor({
        paperCount: 0,
        workCount: 0,
        referenceInstanceCount: 0,
        referenceResolutionCount: 0,
        citationContextCount: 0,
        cleanupProposalCount: 0,
        updatedAt: now(),
      });
    const [
      papers,
      works,
      referenceInstances,
      referenceResolutions,
      citationContexts,
      cleanupProposals,
      registryProjection,
      citationProjection,
      projectionRegistry,
    ] = await Promise.all([
      readAssetList<LiteratureRegistryPaperRecord>({
        root,
        absoluteDir: paths.papers,
        relativeDir: "citation-graph/papers",
        schemaId: PAPER_SCHEMA_ID,
      }),
      readAssetList<LiteratureRegistryWorkRecord>({
        root,
        absoluteDir: paths.works,
        relativeDir: "citation-graph/works",
        schemaId: WORK_SCHEMA_ID,
      }),
      readAssetList<LiteratureRegistryReferenceInstanceRecord>({
        root,
        absoluteDir: paths.referenceInstances,
        relativeDir: "citation-graph/reference-instances",
        schemaId: REFERENCE_INSTANCE_SCHEMA_ID,
      }),
      readAssetList<LiteratureRegistryReferenceResolutionRecord>({
        root,
        absoluteDir: paths.referenceResolutions,
        relativeDir: "citation-graph/reference-resolutions",
        schemaId: REFERENCE_RESOLUTION_SCHEMA_ID,
      }),
      readAssetList<LiteratureRegistryCitationContextRecord>({
        root,
        absoluteDir: paths.contexts,
        relativeDir: "citation-graph/contexts",
        schemaId: CITATION_CONTEXT_SCHEMA_ID,
      }),
      readAssetList<LiteratureRegistryCleanupProposalRecord>({
        root,
        absoluteDir: paths.cleanupProposals,
        relativeDir: "citation-graph/cleanup-proposals",
        schemaId: CLEANUP_PROPOSAL_SCHEMA_ID,
      }),
      readJson<LiteratureRegistryIndexProjection>(paths.literatureIndex),
      readJson<CitationGraphIndexProjection>(paths.citationIndex),
      readProjectionRegistryState(root),
    ]);
    return {
      manifest,
      papers,
      works,
      reference_instances: referenceInstances,
      reference_resolutions: referenceResolutions,
      citation_contexts: citationContexts,
      cleanup_proposals: cleanupProposals,
      registry_projection: registryProjection || undefined,
      citation_projection: citationProjection || undefined,
      literature_projection_state:
        projectionRegistry.projections[
          SYNTHESIS_LITERATURE_REGISTRY_INDEX_TARGET
        ],
      citation_projection_state:
        projectionRegistry.projections[SYNTHESIS_CITATION_GRAPH_INDEX_TARGET],
      diagnostics: [],
    } satisfies LiteratureRegistrySnapshot;
  }

  async function writeProjections(args: {
    records: ReturnType<typeof buildCanonicalRecords>;
    manifest: LiteratureRegistryManifest;
    timestamp: string;
    existingCitationProjection?: CitationGraphIndexProjection | null;
    computeComplexMetrics?: boolean;
    computeLayouts?: boolean;
    complexMetricsStatus?: NonNullable<
      CitationGraphIndexProjection["metric_layers"]
    >["complex"]["status"];
  }) {
    const paths = await initialize();
    const graph = buildUnifiedCitationGraph({
      papers: graphInputsFromCanonical({
        papers: args.records.papers,
        references: args.records.reference_instances,
      }),
    });
    const shouldComputeComplexMetrics = args.computeComplexMetrics !== false;
    const metrics =
      shouldComputeComplexMetrics || !args.existingCitationProjection?.metrics
        ? computeCitationGraphMetrics(graph)
        : args.existingCitationProjection.metrics;
    const layouts =
      args.computeLayouts === false && args.existingCitationProjection?.layouts
        ? args.existingCitationProjection.layouts
        : (Object.fromEntries(
            CITATION_LAYOUT_PRESETS.map((preset) => [
              preset,
              computeCitationGraphLayout(graph, preset),
            ]),
          ) as CitationGraphIndexProjection["layouts"]);
    const layoutLayers = layoutLayersFor({
      graph,
      metrics,
      layouts,
      timestamp: args.timestamp,
      existing: args.existingCitationProjection?.layout_layers,
      computed: args.computeLayouts !== false,
    });
    const structure = citationStructureFor({
      graph,
      papers: args.records.papers,
      references: args.records.reference_instances,
      manifestHash: args.manifest.manifest_hash,
      timestamp: args.timestamp,
    });
    const lightweight = lightweightMetricsFor({
      graph,
      resolutions: args.records.reference_resolutions,
      papers: args.records.papers,
      timestamp: args.timestamp,
    });
    const complexStatus =
      args.complexMetricsStatus ||
      (metrics.graph_hash === graph.graph_hash ? "ready" : "stale");
    const registryProjection: LiteratureRegistryIndexProjection = {
      schema_id: "synthesis.literature_registry_index_projection",
      schema_version: "1.0.0",
      backend: SYNTHESIS_PROJECTION_BACKEND_DESCRIPTOR,
      source_manifest_hash: args.manifest.manifest_hash,
      rebuilt_at: args.timestamp,
      rows: args.records.rows,
      cleanup_proposals: args.records.cleanup_proposals,
      diagnostics: [],
    };
    const citationProjection: CitationGraphIndexProjection = {
      schema_id: "synthesis.citation_graph_index_projection",
      schema_version: "1.0.0",
      backend: SYNTHESIS_PROJECTION_BACKEND_DESCRIPTOR,
      source_manifest_hash: args.manifest.manifest_hash,
      rebuilt_at: args.timestamp,
      structure,
      graph,
      metrics,
      metric_layers: {
        lightweight,
        complex: {
          status: complexStatus,
          source_graph_hash: graph.graph_hash,
          updated_at: args.timestamp,
          metrics_hash:
            metrics.graph_hash === graph.graph_hash
              ? metrics.metrics_hash
              : undefined,
          latest_usable_metrics_hash: metrics.metrics_hash,
          diagnostics:
            complexStatus === "ready"
              ? []
              : [{ code: "citation_graph_complex_metrics_stale" }],
        },
      },
      layouts,
      layout_layers: layoutLayers,
      freshness: {
        status: complexStatus === "ready" ? "ready" : "stale",
        latest_usable_snapshot: graph.graph_hash,
        stale_reasons:
          complexStatus === "ready"
            ? []
            : ["citation_graph_complex_metrics_stale"],
      },
      diagnostics: graph.diagnostics ? [graph.diagnostics] : [],
    };
    await Promise.all([
      writeJson(paths.literatureIndex, registryProjection),
      writeJson(paths.citationIndex, citationProjection),
      writeJson(paths.citationGraph, graph),
      writeJson(paths.citationMetrics, metrics),
      writeJson(paths.citationLayouts, {
        graph_hash: graph.graph_hash,
        layouts,
      }),
      writeJson(paths.citationFreshness, citationProjection.freshness),
    ]);
    await recordProjectionRebuild({
      root,
      target: SYNTHESIS_LITERATURE_REGISTRY_INDEX_TARGET,
      sourceManifestHash: args.manifest.manifest_hash,
      diagnostics: [],
      now: args.timestamp,
    });
    await recordProjectionRebuild({
      root,
      target: SYNTHESIS_CITATION_GRAPH_INDEX_TARGET,
      sourceManifestHash: args.manifest.manifest_hash,
      diagnostics: citationProjection.diagnostics,
      now: args.timestamp,
    });
    return { registryProjection, citationProjection };
  }

  async function rebuildLiteratureRegistry(args: RebuildArgs) {
    const timestamp = now();
    const registryInputs = args.registryInputs || [];
    const graphInputs = args.citationGraphPapers?.length
      ? args.citationGraphPapers
      : buildCitationGraphInputsFromRegistryInputs(registryInputs);
    const records = buildCanonicalRecords({
      registryInputs,
      graphInputs,
      timestamp,
    });
    const manifest = manifestFor({
      paperCount: records.papers.length,
      workCount: records.works.length,
      referenceInstanceCount: records.reference_instances.length,
      referenceResolutionCount: records.reference_resolutions.length,
      citationContextCount: records.citation_contexts.length,
      cleanupProposalCount: records.cleanup_proposals.length,
      updatedAt: timestamp,
    });
    const assets = canonicalAssetsForRecords({ records, manifest });
    const result = await writeCanonicalTransaction({
      root,
      scope: "citation-graph",
      assets,
      registry,
      transactionId: args.transactionId,
      projectionTargets: [
        SYNTHESIS_LITERATURE_REGISTRY_INDEX_TARGET,
        SYNTHESIS_CITATION_GRAPH_INDEX_TARGET,
      ],
      sourceManifestHash: manifest.manifest_hash,
      now: timestamp,
    });
    const projections = await writeProjections({
      records,
      manifest,
      timestamp,
    });
    replaceRepositoryIndexState({
      papers: records.papers,
      works: records.works,
      referenceInstances: records.reference_instances,
      referenceResolutions: records.reference_resolutions,
      cleanupProposals: records.cleanup_proposals,
      timestamp,
    });
    return {
      transactionId: result.transactionId,
      receipt: result.receipt,
      manifest,
      ...projections,
    };
  }

  async function exportLiteratureRegistryCheckpoint(args?: {
    transactionId?: string;
  }) {
    const timestamp = now();
    const records = buildCanonicalRecordsFromRepository({
      repository,
      timestamp,
    });
    const manifest = manifestFor({
      paperCount: records.papers.length,
      workCount: records.works.length,
      referenceInstanceCount: records.reference_instances.length,
      referenceResolutionCount: records.reference_resolutions.length,
      citationContextCount: records.citation_contexts.length,
      cleanupProposalCount: records.cleanup_proposals.length,
      updatedAt: timestamp,
    });
    const result = await writeCanonicalTransaction({
      root,
      scope: "citation-graph",
      assets: canonicalAssetsForRecords({ records, manifest }),
      registry,
      transactionId: args?.transactionId,
      projectionTargets: [
        SYNTHESIS_LITERATURE_REGISTRY_INDEX_TARGET,
        SYNTHESIS_CITATION_GRAPH_INDEX_TARGET,
      ],
      sourceManifestHash: manifest.manifest_hash,
      now: timestamp,
    });
    const projections = await writeProjections({
      records,
      manifest,
      timestamp,
    });
    return {
      transactionId: result.transactionId,
      receipt: result.receipt,
      manifest,
      ...projections,
    };
  }

  async function readLiteratureRegistryCheckpointState() {
    const timestamp = now();
    return buildCanonicalRecordsFromRepository({
      repository,
      timestamp,
    });
  }

  async function importLiteratureRegistryCheckpoint(args: {
    papers?: LiteratureRegistryPaperRecord[];
    works?: LiteratureRegistryWorkRecord[];
    referenceInstances?: LiteratureRegistryReferenceInstanceRecord[];
    referenceResolutions?: LiteratureRegistryReferenceResolutionRecord[];
    cleanupProposals?: LiteratureRegistryCleanupProposalRecord[];
    registryRows?: PaperRegistryRow[];
    transactionId?: string;
  }) {
    const timestamp = now();
    const papers = args.papers?.length
      ? args.papers
      : (args.registryRows || []).map((row) => rowToPaperRecord(row));
    replaceRepositoryIndexState({
      papers,
      works: args.works || [],
      referenceInstances: args.referenceInstances || [],
      referenceResolutions: args.referenceResolutions || [],
      cleanupProposals: args.cleanupProposals || [],
      timestamp,
    });
    const receipt: CanonicalTransactionReceipt = {
      schema_id: "synthesis.canonical_store_transaction_receipt",
      schema_version: "1.0.0",
      transaction_id:
        cleanString(args.transactionId) ||
        `literature-registry-import-${timestamp}`,
      scope: "citation-graph",
      status: "committed",
      changed_assets: [],
      created_at: timestamp,
    };
    return {
      transactionId: receipt.transaction_id,
      receipt,
      counts: {
        papers: papers.length,
        works: (args.works || []).length,
        referenceInstances: (args.referenceInstances || []).length,
        referenceResolutions: (args.referenceResolutions || []).length,
        cleanupProposals: (args.cleanupProposals || []).length,
      },
    };
  }

  async function upsertPaperFromRegistryInput(args: {
    registryInput: PaperRegistryInput;
    transactionId?: string;
  }) {
    const timestamp = now();
    const graphInput = buildCitationGraphInputsFromRegistryInputs([
      args.registryInput,
    ]);
    const replacement = buildCanonicalRecords({
      registryInputs: [args.registryInput],
      graphInputs: graphInput,
      timestamp,
    });
    const sourcePaperRef = paperRef({
      libraryId: args.registryInput.libraryId,
      itemKey: args.registryInput.itemKey,
    });
    const current = await loadCanonical();
    const papers = new Map(
      current.papers.map((paper) => [paper.paper_ref, paper] as const),
    );
    for (const paper of replacement.papers) {
      papers.set(paper.paper_ref, paper);
    }
    const works = new Map(
      current.works.map((work) => [work.work_id, work] as const),
    );
    for (const work of replacement.works) {
      works.set(work.work_id, work);
    }
    const referenceInstances = current.reference_instances
      .filter((reference) => reference.source_paper_ref !== sourcePaperRef)
      .concat(replacement.reference_instances)
      .sort((left, right) =>
        left.reference_instance_id.localeCompare(right.reference_instance_id),
      );
    const referenceResolutions = current.reference_resolutions
      .filter((resolution) => resolution.source_paper_ref !== sourcePaperRef)
      .concat(replacement.reference_resolutions)
      .sort((left, right) =>
        left.resolution_id.localeCompare(right.resolution_id),
      );
    const citationContexts = current.citation_contexts
      .filter((context) => context.source_paper_ref !== sourcePaperRef)
      .concat(replacement.citation_contexts)
      .sort((left, right) => left.context_id.localeCompare(right.context_id));
    const cleanupProposals = current.cleanup_proposals
      .filter((proposal) => proposal.source_paper_ref !== sourcePaperRef)
      .concat(replacement.cleanup_proposals)
      .sort((left, right) => left.proposal_id.localeCompare(right.proposal_id));
    const mergedPapers = [...papers.values()].sort((left, right) =>
      left.paper_ref.localeCompare(right.paper_ref),
    );
    const manifest = manifestFor({
      paperCount: mergedPapers.length,
      workCount: works.size,
      referenceInstanceCount: referenceInstances.length,
      referenceResolutionCount: referenceResolutions.length,
      citationContextCount: citationContexts.length,
      cleanupProposalCount: cleanupProposals.length,
      updatedAt: timestamp,
    });
    const assets = [
      ...replacement.papers.map((paper) =>
        asset(paperAssetPath(paper), PAPER_SCHEMA_ID, paper),
      ),
      ...replacement.works.map((work) =>
        asset(workAssetPath(work), WORK_SCHEMA_ID, work),
      ),
      ...replacement.reference_instances.map((reference) =>
        asset(
          referenceInstanceAssetPath(reference),
          REFERENCE_INSTANCE_SCHEMA_ID,
          reference,
        ),
      ),
      ...replacement.reference_resolutions.map((resolution) =>
        asset(
          referenceResolutionAssetPath(resolution),
          REFERENCE_RESOLUTION_SCHEMA_ID,
          resolution,
        ),
      ),
      ...replacement.citation_contexts.map((context) =>
        asset(
          citationContextAssetPath(context),
          CITATION_CONTEXT_SCHEMA_ID,
          context,
        ),
      ),
      ...replacement.cleanup_proposals.map((proposal) =>
        asset(
          cleanupProposalAssetPath(proposal),
          CLEANUP_PROPOSAL_SCHEMA_ID,
          proposal,
        ),
      ),
      asset("citation-graph/manifest.json", MANIFEST_SCHEMA_ID, manifest),
    ];
    const replacementPaths = new Set(assets.map((row) => row.relativePath));
    const deleteAssets = [
      ...current.reference_instances
        .filter((reference) => reference.source_paper_ref === sourcePaperRef)
        .flatMap((reference) =>
          withLegacyAssetPaths(
            [referenceInstanceAssetPath(reference)],
            [legacyReferenceInstanceAssetPath(reference)],
          ),
        ),
      ...current.reference_resolutions
        .filter((resolution) => resolution.source_paper_ref === sourcePaperRef)
        .flatMap((resolution) =>
          withLegacyAssetPaths(
            [referenceResolutionAssetPath(resolution)],
            [legacyReferenceResolutionAssetPath(resolution)],
          ),
        ),
      ...current.citation_contexts
        .filter((context) => context.source_paper_ref === sourcePaperRef)
        .flatMap((context) =>
          withLegacyAssetPaths(
            [citationContextAssetPath(context)],
            [legacyCitationContextAssetPath(context)],
          ),
        ),
      ...current.cleanup_proposals
        .filter((proposal) => proposal.source_paper_ref === sourcePaperRef)
        .flatMap((proposal) =>
          withLegacyAssetPaths(
            [cleanupProposalAssetPath(proposal)],
            [legacyCleanupProposalAssetPath(proposal)],
          ),
        ),
    ].filter((relativePath) => !replacementPaths.has(relativePath));
    const result = await writeCanonicalTransaction({
      root,
      scope: "citation-graph",
      assets,
      deleteAssets,
      registry,
      transactionId: args.transactionId,
      projectionTargets: [
        SYNTHESIS_LITERATURE_REGISTRY_INDEX_TARGET,
        SYNTHESIS_CITATION_GRAPH_INDEX_TARGET,
      ],
      sourceManifestHash: manifest.manifest_hash,
      now: timestamp,
    });
    replaceRepositoryIndexState({
      papers: mergedPapers,
      works: [...works.values()],
      referenceInstances,
      referenceResolutions,
      cleanupProposals,
      timestamp,
    });
    return {
      transactionId: result.transactionId,
      receipt: result.receipt,
      manifest,
      paper_ref: sourcePaperRef,
    };
  }

  async function rebuildCitationGraphProjection() {
    const timestamp = now();
    const snapshot = await loadCanonical();
    const rows = snapshot.papers.map((paper): PaperRegistryRow => {
      const row = snapshot.registry_projection?.rows.find(
        (entry) => entry.paper_ref === paper.paper_ref,
      );
      return (
        row || {
          paper_ref: paper.paper_ref,
          library_id: paper.library_id,
          item_key: paper.item_key,
          title: paper.title,
          year: paper.year || "",
          item_type: paper.item_type || "",
          tags: [...paper.tags],
          collections: [...paper.collections],
          artifacts: paper.artifacts || ({} as PaperRegistryRow["artifacts"]),
          readiness: paper.readiness,
          coverage: paper.coverage,
          diagnostics: [],
          facets: paper.facets || fallbackFacetsForPaper(paper),
          row_hash: paper.row_hash,
        }
      );
    });
    const records = {
      rows,
      graphInputs: graphInputsFromCanonical({
        papers: snapshot.papers,
        references: snapshot.reference_instances,
      }),
      papers: snapshot.papers,
      works: snapshot.works,
      reference_instances: snapshot.reference_instances,
      reference_resolutions: snapshot.reference_resolutions,
      citation_contexts: snapshot.citation_contexts,
      cleanup_proposals: snapshot.cleanup_proposals,
    };
    const projections = await writeProjections({
      records,
      manifest: snapshot.manifest,
      timestamp,
      computeComplexMetrics: true,
      computeLayouts: true,
    });
    return {
      manifest: snapshot.manifest,
      ...projections,
    };
  }

  async function rebuildCitationGraphStructureForPaper(args: {
    paperRef: string;
  }) {
    const timestamp = now();
    const snapshot = await loadCanonical();
    const paper = snapshot.papers.find(
      (entry) => entry.paper_ref === args.paperRef,
    );
    if (!paper) {
      return {
        ok: false as const,
        diagnostics: [
          {
            code: "citation_graph_structure_scope_missing",
            severity: "warning" as const,
            message:
              "Citation graph structure dirty scope cannot be mapped to a canonical paper.",
          },
        ],
      };
    }
    const rows = snapshot.papers.map((entry): PaperRegistryRow => {
      const row = snapshot.registry_projection?.rows.find(
        (candidate) => candidate.paper_ref === entry.paper_ref,
      );
      return (
        row || {
          paper_ref: entry.paper_ref,
          library_id: entry.library_id,
          item_key: entry.item_key,
          title: entry.title,
          year: entry.year || "",
          item_type: entry.item_type || "",
          tags: [...entry.tags],
          collections: [...entry.collections],
          artifacts: entry.artifacts || ({} as PaperRegistryRow["artifacts"]),
          readiness: entry.readiness,
          coverage: entry.coverage,
          diagnostics: [],
          facets: entry.facets || fallbackFacetsForPaper(entry),
          row_hash: entry.row_hash,
        }
      );
    });
    const records = {
      rows,
      graphInputs: graphInputsFromCanonical({
        papers: snapshot.papers,
        references: snapshot.reference_instances,
      }),
      papers: snapshot.papers,
      works: snapshot.works,
      reference_instances: snapshot.reference_instances,
      reference_resolutions: snapshot.reference_resolutions,
      citation_contexts: snapshot.citation_contexts,
      cleanup_proposals: snapshot.cleanup_proposals,
    };
    const projections = await writeProjections({
      records,
      manifest: snapshot.manifest,
      timestamp,
      existingCitationProjection: snapshot.citation_projection,
      computeComplexMetrics: false,
      computeLayouts: false,
      complexMetricsStatus:
        snapshot.citation_projection?.metrics.graph_hash ===
        snapshot.citation_projection?.graph.graph_hash
          ? "stale"
          : snapshot.citation_projection?.metric_layers?.complex.status ||
            "stale",
    });
    return {
      ok: true as const,
      paper_ref: paper.paper_ref,
      manifest: snapshot.manifest,
      ...projections,
      diagnostics: [],
    };
  }

  async function rebuildCitationGraphComplexMetrics() {
    const timestamp = now();
    const paths = await initialize();
    const projection = await readJson<CitationGraphIndexProjection>(
      paths.citationIndex,
    );
    if (!projection?.graph) {
      return {
        ok: false as const,
        diagnostics: [
          {
            code: "citation_graph_projection_missing",
            severity: "warning" as const,
            message:
              "Citation graph projection is missing; run explicit projection rebuild before metrics.",
          },
        ],
      };
    }
    const metrics = computeCitationGraphMetrics(projection.graph);
    const next: CitationGraphIndexProjection = {
      ...projection,
      rebuilt_at: timestamp,
      metrics,
      metric_layers: {
        lightweight:
          projection.metric_layers?.lightweight ||
          lightweightMetricsFor({
            graph: projection.graph,
            resolutions: [],
            papers: [],
            timestamp,
          }),
        complex: {
          status: "ready",
          source_graph_hash: projection.graph.graph_hash,
          updated_at: timestamp,
          metrics_hash: metrics.metrics_hash,
          latest_usable_metrics_hash: metrics.metrics_hash,
          diagnostics: [],
        },
      },
      freshness: {
        status: "ready",
        latest_usable_snapshot: projection.graph.graph_hash,
        stale_reasons: [],
      },
    };
    await Promise.all([
      writeJson(paths.citationIndex, next),
      writeJson(paths.citationMetrics, metrics),
      writeJson(paths.citationFreshness, next.freshness),
    ]);
    await recordProjectionRebuild({
      root,
      target: SYNTHESIS_CITATION_GRAPH_INDEX_TARGET,
      sourceManifestHash: next.source_manifest_hash,
      diagnostics: [],
      now: timestamp,
    });
    return {
      ok: true as const,
      citationProjection: next,
      diagnostics: [],
    };
  }

  async function rebuildCitationGraphLayout(args: {
    preset?: CitationLayoutPreset;
    force?: boolean;
  }) {
    const timestamp = now();
    const paths = await initialize();
    const preset = CITATION_LAYOUT_PRESETS.includes(
      args.preset as CitationLayoutPreset,
    )
      ? (args.preset as CitationLayoutPreset)
      : "balanced";
    const projection = await readJson<CitationGraphIndexProjection>(
      paths.citationIndex,
    );
    if (!projection?.graph) {
      return {
        ok: false as const,
        diagnostics: [
          {
            code: "citation_graph_projection_missing",
            severity: "warning" as const,
            message:
              "Citation graph projection is missing; run explicit projection rebuild before layout.",
          },
        ],
      };
    }

    let next = projection;

    const currentLayout = next.layouts?.[preset];
    const currentLayer = next.layout_layers?.[preset];
    if (
      !args.force &&
      currentLayout?.graph_hash === next.graph.graph_hash &&
      currentLayer?.status === "ready" &&
      currentLayer.source_graph_hash === next.graph.graph_hash
    ) {
      return {
        ok: true as const,
        citationProjection: next,
        diagnostics: [],
      };
    }

    const layout = computeCitationGraphLayout(next.graph, preset);
    const layouts = {
      ...next.layouts,
      [preset]: layout,
    } as CitationGraphIndexProjection["layouts"];
    const layoutLayers = {
      ...(next.layout_layers ||
        layoutLayersFor({
          graph: next.graph,
          metrics: next.metrics,
          layouts,
          timestamp,
          computed: false,
        })),
      [preset]: {
        status: "ready" as const,
        source_graph_hash: next.graph.graph_hash,
        source_complex_metrics_hash:
          next.metric_layers?.complex?.metrics_hash || "",
        updated_at: timestamp,
        diagnostics: [],
      },
    };
    next = {
      ...next,
      rebuilt_at: timestamp,
      layouts,
      layout_layers: layoutLayers,
    };

    await Promise.all([
      writeJson(paths.citationIndex, next),
      writeJson(paths.citationMetrics, next.metrics),
      writeJson(paths.citationLayouts, {
        graph_hash: next.graph.graph_hash,
        layouts,
        layout_layers: layoutLayers,
      }),
      writeJson(paths.citationFreshness, next.freshness),
    ]);
    await recordProjectionRebuild({
      root,
      target: SYNTHESIS_CITATION_GRAPH_INDEX_TARGET,
      sourceManifestHash: next.source_manifest_hash,
      diagnostics: [],
      now: timestamp,
    });
    return {
      ok: true as const,
      citationProjection: next,
      diagnostics: [],
    };
  }

  async function readCitationGraphProjection() {
    const paths = await initialize();
    return readJson<CitationGraphIndexProjection>(paths.citationIndex);
  }

  async function readLiteratureRegistryProjection() {
    const paths = await initialize();
    return readJson<LiteratureRegistryIndexProjection>(paths.literatureIndex);
  }

  async function listCleanupProposals() {
    return (await loadCanonical()).cleanup_proposals;
  }

  function repositoryDecisionSideEffects(args: {
    action: LiteratureRegistryCleanupAction;
    proposal: LiteratureRegistryCleanupProposalRecord;
    reference: LiteratureRegistryReferenceInstanceRecord;
    resolution: LiteratureRegistryReferenceResolutionRecord;
    targetLiteratureItemId?: string;
    timestamp: string;
  }) {
    const sourceLiteratureItemId = opaqueLiteratureItemId(
      "zotero-paper",
      args.reference.source_paper_ref,
    );
    const targetLiteratureItemId = cleanString(args.targetLiteratureItemId);
    repository.transaction(() => {
      if (args.action === "confirm_literature_item" && targetLiteratureItemId) {
        repository.upsertLiteratureItem({
          literatureItemId: targetLiteratureItemId,
          displayTitle:
            args.reference.title ||
            args.reference.raw ||
            args.reference.provisional_key,
          normalizedTitle: normalizeSynthesisLiteratureTitle(
            args.reference.title ||
              args.reference.raw ||
              args.reference.provisional_key,
          ),
          titleNormalizerVersion: "deterministic-v1",
          year: args.reference.year,
          authorsJson: JSON.stringify(args.reference.authors || []),
          status: "active",
          createdFrom: "extracted_reference",
          confidence: "confirmed",
          createdAt: args.timestamp,
          updatedAt: args.timestamp,
        });
        if (args.reference.raw) {
          repository.upsertIdentifier({
            literatureItemId: targetLiteratureItemId,
            kind: "raw_reference_hash",
            normalizedValue: hashMarkdown(args.reference.raw),
            displayValue: args.reference.raw,
            source: "reference-resolution-review",
            confidence: "confirmed",
            createdAt: args.timestamp,
            updatedAt: args.timestamp,
          });
        }
      }
      repository.upsertReferenceResolution({
        resolutionId: args.resolution.resolution_id,
        referenceInstanceId: args.reference.reference_instance_id,
        sourceLiteratureItemId,
        targetLiteratureItemId:
          args.action === "ignore_reference_instance"
            ? ""
            : targetLiteratureItemId,
        status:
          args.action === "ignore_reference_instance"
            ? "ignored"
            : args.action === "defer_reference_resolution"
              ? args.resolution.status === "unmatched"
                ? "unresolved"
                : args.resolution.status
              : "matched",
        confidence:
          args.action === "defer_reference_resolution"
            ? args.resolution.confidence
            : "confirmed",
        diagnosticsJson: JSON.stringify([
          ...((args.resolution.diagnostics as unknown[]) || []),
          {
            code: "reference_resolution_review_action",
            action: args.action,
            applied_at: args.timestamp,
          },
        ]),
        createdAt: args.timestamp,
        updatedAt: args.timestamp,
      });
      repository.upsertReviewItem({
        reviewItemId: args.proposal.proposal_id,
        reviewKind: "reference_resolution",
        priority: 1,
        status:
          args.action === "defer_reference_resolution"
            ? "deferred"
            : "resolved",
        scopeKind: "reference_instance",
        scopeRef: args.reference.reference_instance_id,
        payloadJson: JSON.stringify({
          ...args.proposal,
          action: args.action,
          target_literature_item_id: targetLiteratureItemId || undefined,
        }),
        diagnosticsJson: JSON.stringify(args.proposal.diagnostics || []),
        createdAt: args.proposal.created_at,
        updatedAt: args.timestamp,
      });
      repository.upsertDirtyEvent({
        eventId: `dirty:${hashCanonicalJson({
          action: args.action,
          proposal: args.proposal.proposal_id,
          reference: args.reference.reference_instance_id,
          at: args.timestamp,
        }).slice("sha256:".length, "sha256:".length + 24)}`,
        eventType: "reference_resolution_review_action",
        source: "synthesis.reference_resolution_review",
        scopeKind: "reference_instance",
        scopeRef: args.reference.reference_instance_id,
        sourceHash: hashCanonicalJson({
          action: args.action,
          resolution: args.resolution.resolution_id,
          target: targetLiteratureItemId,
        }),
        status: "queued",
        diagnosticsJson: JSON.stringify([
          {
            code: "reference_resolution_review_action_applied",
            severity: "info",
            message:
              "Reference resolution review action updated domain facts and review state.",
            details: {
              action: args.action,
              proposal_id: args.proposal.proposal_id,
              reference_instance_id: args.reference.reference_instance_id,
              source_literature_item_id: sourceLiteratureItemId,
              target_literature_item_id: targetLiteratureItemId || undefined,
            },
          },
          {
            code: "index_summary_updated",
            severity: "info",
            message: "Affected Index summary facts are observable from SQLite.",
            details: {
              affected_literature_item_ids: [
                sourceLiteratureItemId,
                targetLiteratureItemId,
              ].filter(Boolean),
              affected_reference_instance_ids: [
                args.reference.reference_instance_id,
              ],
              affected_review_item_ids: [args.proposal.proposal_id],
            },
          },
        ]),
        createdAt: args.timestamp,
        updatedAt: args.timestamp,
      });
      repository.syncCitationGraphFromIndex({
        sourceLiteratureItemIds: [sourceLiteratureItemId],
        literatureItemIds: [sourceLiteratureItemId, targetLiteratureItemId],
        referenceInstanceIds: [args.reference.reference_instance_id],
        timestamp: args.timestamp,
      });
      repository.recordCitationGraphDirtyEffects({
        transactionId: `reference-review:${hashCanonicalJson({
          action: args.action,
          proposal: args.proposal.proposal_id,
          reference: args.reference.reference_instance_id,
          at: args.timestamp,
        }).slice("sha256:".length, "sha256:".length + 24)}`,
        source: "synthesis.reference_resolution_review",
        literatureItemId: sourceLiteratureItemId,
        affectedReferenceInstanceIds: [args.reference.reference_instance_id],
        diagnostics: [
          {
            code: "reference_resolution_review_action_applied",
            severity: "info",
            message:
              "Reference resolution review action updated citation graph inputs.",
            details: {
              action: args.action,
              proposal_id: args.proposal.proposal_id,
              reference_instance_id: args.reference.reference_instance_id,
            },
          },
        ],
        timestamp: args.timestamp,
      });
    });
  }

  async function applyCleanupProposalAction(args: {
    proposalId: string;
    action: LiteratureRegistryCleanupAction;
    targetPaperRef?: string;
    targetLiteratureItemId?: string;
    transactionId?: string;
  }): Promise<{ transactionId: string; receipt: CanonicalTransactionReceipt }> {
    if (
      args.action === "confirm_delete_item" ||
      args.action === "mark_as_dedupe_merge" ||
      args.action === "keep_for_now"
    ) {
      throw new Error("index P0 review actions must be applied through SQLite");
    }
    const snapshot = await loadCanonical();
    const proposals = snapshot.cleanup_proposals;
    const proposal = proposals.find(
      (entry) => entry.proposal_id === args.proposalId,
    );
    if (!proposal) {
      await writeCanonicalDiagnostic({
        root,
        diagnostic: {
          scope: "citation-graph",
          transaction_id: args.transactionId,
          code: "cleanup_proposal_missing",
          message: "cleanup proposal was not found",
          asset_path: `citation-graph/cleanup-proposals/${canonicalAssetFileName(
            "cleanup",
            args.proposalId,
          )}`,
          details: { proposal_id: safeSegment(args.proposalId) },
          created_at: now(),
        },
      });
      throw new Error("cleanup proposal was not found");
    }
    const reference = snapshot.reference_instances.find(
      (entry) =>
        entry.reference_instance_id === proposal.reference_instance_id ||
        entry.provisional_key === proposal.provisional_key,
    );
    const resolution = reference
      ? snapshot.reference_resolutions.find(
          (entry) =>
            entry.reference_instance_id === reference.reference_instance_id,
        )
      : undefined;
    if (!reference || !resolution) {
      throw new Error("cleanup proposal reference resolution was not found");
    }
    const targetPaperRef = cleanString(args.targetPaperRef);
    const targetLiteratureItemId =
      cleanString(args.targetLiteratureItemId) ||
      (targetPaperRef
        ? opaqueLiteratureItemId("zotero-paper", targetPaperRef)
        : args.action === "confirm_literature_item"
          ? opaqueLiteratureItemId(
              "reference-work",
              resolution.target_work_id || workIdFor(reference),
            )
          : "");
    if (
      args.action === "match_existing_literature_item" &&
      !targetLiteratureItemId
    ) {
      throw new Error(
        "match_existing_literature_item requires targetPaperRef or targetLiteratureItemId",
      );
    }
    const timestamp = now();
    const updated: LiteratureRegistryCleanupProposalRecord = {
      ...proposal,
      status:
        args.action === "defer_reference_resolution" ? "deferred" : "resolved",
      diagnostics: [
        ...proposal.diagnostics,
        { code: "reference_resolution_review_action", action: args.action },
      ],
      updated_at: timestamp,
    };
    const updatedResolution: LiteratureRegistryReferenceResolutionRecord = {
      ...resolution,
      status:
        args.action === "ignore_reference_instance"
          ? "ignored"
          : args.action === "defer_reference_resolution"
            ? resolution.status
            : "matched",
      target_paper_ref:
        args.action === "match_existing_literature_item" && targetPaperRef
          ? targetPaperRef
          : args.action === "ignore_reference_instance"
            ? undefined
            : resolution.target_paper_ref,
      target_work_id:
        args.action === "confirm_literature_item"
          ? resolution.target_work_id || workIdFor(reference)
          : args.action === "ignore_reference_instance" ||
              args.action === "match_existing_literature_item"
            ? undefined
            : resolution.target_work_id,
      confidence:
        args.action === "defer_reference_resolution"
          ? resolution.confidence
          : "review",
      diagnostics: [
        ...resolution.diagnostics,
        { code: "reference_resolution_review_action", action: args.action },
      ],
    };
    const workId = updatedResolution.target_work_id;
    const work = workId
      ? snapshot.works.find((entry) => entry.work_id === workId) || {
          work_id: workId,
          canonical_key: reference.provisional_key,
          title: reference.title,
          year: reference.year,
          authors: [...reference.authors],
          source: "reference" as const,
          aliases: cleanList([
            reference.doi,
            reference.arxiv,
            reference.url,
            reference.citekey,
          ]),
        }
      : undefined;
    repositoryDecisionSideEffects({
      action: args.action,
      proposal: updated,
      reference,
      resolution: updatedResolution,
      targetLiteratureItemId,
      timestamp,
    });
    const result = await writeCanonicalTransaction({
      root,
      scope: "citation-graph",
      assets: [
        ...(work ? [asset(workAssetPath(work), WORK_SCHEMA_ID, work)] : []),
        asset(
          referenceResolutionAssetPath(updatedResolution),
          REFERENCE_RESOLUTION_SCHEMA_ID,
          updatedResolution,
        ),
        asset(
          cleanupProposalAssetPath(updated),
          CLEANUP_PROPOSAL_SCHEMA_ID,
          updated,
        ),
      ],
      registry,
      transactionId: args.transactionId,
      projectionTargets: [SYNTHESIS_CITATION_GRAPH_INDEX_TARGET],
      now: updated.updated_at,
    });
    return { transactionId: result.transactionId, receipt: result.receipt };
  }

  return {
    initialize,
    loadLiteratureRegistry: loadCanonical,
    importLiteratureRegistryCheckpoint,
    exportLiteratureRegistryCheckpoint,
    readLiteratureRegistryCheckpointState,
    rebuildLiteratureRegistry,
    upsertPaperFromRegistryInput,
    rebuildCitationGraphProjection,
    rebuildCitationGraphStructureForPaper,
    rebuildCitationGraphComplexMetrics,
    rebuildCitationGraphLayout,
    readCitationGraphProjection,
    readLiteratureRegistryProjection,
    listCleanupProposals,
    applyCleanupProposalAction,
  };
}

export type SynthesisLiteratureRegistryService = ReturnType<
  typeof createSynthesisLiteratureRegistryService
>;

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
  status: "matched" | "unmatched" | "ambiguous";
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
  status: "open" | "approved" | "rejected" | "skipped";
  source_paper_ref: string;
  reference_instance_id?: string;
  provisional_key?: string;
  reason: string;
  diagnostics: unknown[];
  created_at: string;
  updated_at: string;
};

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
  const knownPaperKeys = new Map<string, string>();
  for (const input of args.graphInputs) {
    const ref = paperRef({
      libraryId: input.libraryId,
      itemKey: input.itemKey,
    });
    for (const key of [
      referenceKey(input),
      input.doi ? `ref:${safeSegment(input.doi.toLowerCase())}` : "",
      input.arxiv ? `ref:${safeSegment(input.arxiv.toLowerCase())}` : "",
      input.url ? `ref:${safeSegment(input.url.toLowerCase())}` : "",
    ].filter(Boolean)) {
      knownPaperKeys.set(key, ref);
    }
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
      const targetPaperRef = knownPaperKeys.get(provisionalKey);
      const status = targetPaperRef
        ? "matched"
        : provisionalKey.startsWith("ref:raw_") || cleanString(reference.raw)
          ? "unmatched"
          : "ambiguous";
      const targetWorkId = targetPaperRef ? undefined : workIdFor(reference);
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
        status,
        target_paper_ref: targetPaperRef,
        target_work_id: targetWorkId,
        confidence: targetPaperRef ? "deterministic" : "review",
        diagnostics: targetPaperRef
          ? []
          : [{ code: "needs_resolution_review" }],
      });
      contexts.push({
        context_id: `context:${safeSegment(instanceId)}`,
        reference_instance_id: instanceId,
        source_paper_ref: sourceRef,
        roles,
        evidence_count: roles.length,
      });
      if (!targetPaperRef) {
        const proposalId = `cleanup:${safeSegment(instanceId)}`;
        cleanup.set(proposalId, {
          proposal_id: proposalId,
          kind: "reference_resolution",
          status: "open",
          source_paper_ref: sourceRef,
          reference_instance_id: instanceId,
          provisional_key: provisionalKey,
          reason: "reference target requires review",
          diagnostics: [{ code: "unresolved_reference" }],
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
    const assets = [
      ...records.papers.map((paper) =>
        asset(paperAssetPath(paper), PAPER_SCHEMA_ID, paper),
      ),
      ...records.works.map((work) =>
        asset(workAssetPath(work), WORK_SCHEMA_ID, work),
      ),
      ...records.reference_instances.map((reference) =>
        asset(
          referenceInstanceAssetPath(reference),
          REFERENCE_INSTANCE_SCHEMA_ID,
          reference,
        ),
      ),
      ...records.reference_resolutions.map((resolution) =>
        asset(
          referenceResolutionAssetPath(resolution),
          REFERENCE_RESOLUTION_SCHEMA_ID,
          resolution,
        ),
      ),
      ...records.citation_contexts.map((context) =>
        asset(
          citationContextAssetPath(context),
          CITATION_CONTEXT_SCHEMA_ID,
          context,
        ),
      ),
      ...records.cleanup_proposals.map((proposal) =>
        asset(
          cleanupProposalAssetPath(proposal),
          CLEANUP_PROPOSAL_SCHEMA_ID,
          proposal,
        ),
      ),
      asset("citation-graph/manifest.json", MANIFEST_SCHEMA_ID, manifest),
    ];
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
    return {
      transactionId: result.transactionId,
      receipt: result.receipt,
      manifest,
      ...projections,
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
    const complex = projection.metric_layers?.complex;
    const complexMetricsReady =
      complex?.status === "ready" &&
      complex.source_graph_hash === projection.graph.graph_hash &&
      projection.metrics?.graph_hash === projection.graph.graph_hash;
    if (!complexMetricsReady) {
      const metrics = computeCitationGraphMetrics(projection.graph);
      next = {
        ...next,
        rebuilt_at: timestamp,
        metrics,
        metric_layers: {
          lightweight:
            next.metric_layers?.lightweight ||
            lightweightMetricsFor({
              graph: next.graph,
              resolutions: [],
              papers: [],
              timestamp,
            }),
          complex: {
            status: "ready",
            source_graph_hash: next.graph.graph_hash,
            updated_at: timestamp,
            metrics_hash: metrics.metrics_hash,
            latest_usable_metrics_hash: metrics.metrics_hash,
            diagnostics: [],
          },
        },
        freshness: {
          status: "ready",
          latest_usable_snapshot: next.graph.graph_hash,
          stale_reasons: [],
        },
      };
    }

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
          next.metric_layers?.complex.metrics_hash || next.metrics.metrics_hash,
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

  async function applyCleanupProposalAction(args: {
    proposalId: string;
    action: "approve" | "reject" | "skip";
    transactionId?: string;
  }): Promise<{ transactionId: string; receipt: CanonicalTransactionReceipt }> {
    const proposals = await listCleanupProposals();
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
    const updated: LiteratureRegistryCleanupProposalRecord = {
      ...proposal,
      status:
        args.action === "approve"
          ? "approved"
          : args.action === "reject"
            ? "rejected"
            : "skipped",
      updated_at: now(),
    };
    const result = await writeCanonicalTransaction({
      root,
      scope: "citation-graph",
      assets: [
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

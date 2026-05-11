import { hashCanonicalJson } from "./foundation";
import type {
  CitationGraph,
  CitationGraphEdge,
  CitationGraphNode,
} from "./citationGraph";

export type ReviewResolvedPaper = {
  paper_ref: string;
  match_reasons: string[];
};

export type ReviewRegistryReadinessRow = {
  paper_ref: string;
  title: string;
  readiness: "ready" | "partial";
  coverage: "complete" | "partial" | "missing";
  missing_artifacts: string[];
};

export type ReviewMissingArtifactDiagnostic = {
  paper_ref: string;
  artifact_type: string;
  severity: "warning";
  message: string;
};

export type ReviewCitationGraphSlice = {
  graph_hash: string;
  nodes: CitationGraphNode[];
  edges: CitationGraphEdge[];
};

export type ReviewWorkflowInput = {
  kind: "synthesis.review_workflow_input";
  schema_version: "1.0.0";
  input_hash: string;
  topic: {
    topic_id: string;
    title: string;
    markdown: string;
    metadata: Record<string, unknown>;
    topic_definition: Record<string, unknown>;
    resolver: Record<string, unknown>;
  };
  topic_timeline: {
    content: string | Record<string, unknown> | unknown[];
  };
  resolved_paper_set: {
    papers: ReviewResolvedPaper[];
    snapshot: Record<string, unknown>;
  };
  registry_readiness: {
    rows: ReviewRegistryReadinessRow[];
  };
  citation_graph_slice: ReviewCitationGraphSlice;
  missing_artifact_diagnostics: ReviewMissingArtifactDiagnostic[];
  diagnostics: {
    blocking: string[];
    warnings: string[];
  };
};

export type ReviewWorkflowInputArgs = {
  topic: {
    topic_id: string;
    title: string;
    markdown: string;
    timeline?: string | Record<string, unknown> | unknown[];
    metadata?: Record<string, unknown>;
    topic_definition?: Record<string, unknown>;
    resolver?: Record<string, unknown>;
  };
  resolved_paper_set: Record<string, unknown>;
  registry_rows: Array<{
    paper_ref: string;
    title?: string;
    readiness?: string;
    coverage?: string;
    missing_artifacts?: string[];
  }>;
  citation_graph: CitationGraph;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
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

function normalizeReadiness(value: unknown): "ready" | "partial" {
  return cleanString(value) === "ready" ? "ready" : "partial";
}

function normalizeCoverage(value: unknown): "complete" | "partial" | "missing" {
  const coverage = cleanString(value);
  if (coverage === "complete" || coverage === "partial") {
    return coverage;
  }
  return "missing";
}

function paperRefToNodeId(paperRef: string) {
  const itemKey = cleanString(paperRef).split(":").pop() || "";
  return itemKey ? `zotero:item:${itemKey}` : "";
}

function normalizeResolvedPapers(snapshot: Record<string, unknown>) {
  const rawPapers = Array.isArray(snapshot.papers)
    ? snapshot.papers
    : Array.isArray(snapshot.paper_refs)
      ? snapshot.paper_refs.map((paper_ref) => ({ paper_ref }))
      : [];
  return rawPapers
    .map((entry): ReviewResolvedPaper | null => {
      if (typeof entry === "string") {
        const paperRef = cleanString(entry);
        return paperRef ? { paper_ref: paperRef, match_reasons: [] } : null;
      }
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const paperRef = cleanString(row.paper_ref);
      if (!paperRef) {
        return null;
      }
      return {
        paper_ref: paperRef,
        match_reasons: normalizeStringList(row.match_reasons),
      };
    })
    .filter((entry): entry is ReviewResolvedPaper => Boolean(entry))
    .sort((left, right) => left.paper_ref.localeCompare(right.paper_ref));
}

function normalizeRegistryRows(
  rows: ReviewWorkflowInputArgs["registry_rows"],
  paperRefs: string[],
) {
  const allowed = new Set(paperRefs);
  return [...(rows || [])]
    .map((row): ReviewRegistryReadinessRow => ({
      paper_ref: cleanString(row.paper_ref),
      title: cleanString(row.title) || cleanString(row.paper_ref),
      readiness: normalizeReadiness(row.readiness),
      coverage: normalizeCoverage(row.coverage),
      missing_artifacts: normalizeStringList(row.missing_artifacts),
    }))
    .filter((row) => row.paper_ref && allowed.has(row.paper_ref))
    .sort((left, right) => left.paper_ref.localeCompare(right.paper_ref));
}

export function projectCitationGraphSliceForReview(args: {
  graph: CitationGraph;
  paperRefs: string[];
  maxNodes?: number;
  maxEdges?: number;
}): ReviewCitationGraphSlice {
  const requestedNodeIds = new Set(
    normalizeStringList(args.paperRefs).map(paperRefToNodeId).filter(Boolean),
  );
  const maxNodes = Math.max(0, Math.floor(Number(args.maxNodes || 0))) || 500;
  const maxEdges = Math.max(0, Math.floor(Number(args.maxEdges || 0))) || 1000;
  const includedNodeIds = new Set<string>();
  const edges = [...(args.graph.edges || [])]
    .filter(
      (edge) =>
        requestedNodeIds.has(edge.source) && requestedNodeIds.has(edge.target),
    )
    .sort((left, right) => left.edge_id.localeCompare(right.edge_id))
    .slice(0, maxEdges);
  for (const edge of edges) {
    includedNodeIds.add(edge.source);
    includedNodeIds.add(edge.target);
  }
  for (const nodeId of requestedNodeIds) {
    includedNodeIds.add(nodeId);
  }
  const nodes = [...(args.graph.nodes || [])]
    .filter((node) => includedNodeIds.has(node.node_id))
    .sort((left, right) => left.node_id.localeCompare(right.node_id))
    .slice(0, maxNodes);
  const retainedNodeIds = new Set(nodes.map((node) => node.node_id));
  return {
    graph_hash: cleanString(args.graph.graph_hash),
    nodes,
    edges: edges.filter(
      (edge) => retainedNodeIds.has(edge.source) && retainedNodeIds.has(edge.target),
    ),
  };
}

function buildMissingArtifactDiagnostics(rows: ReviewRegistryReadinessRow[]) {
  return rows
    .flatMap((row) =>
      row.missing_artifacts.map((artifactType) => ({
        paper_ref: row.paper_ref,
        artifact_type: artifactType,
        severity: "warning" as const,
        message: `${artifactType} is missing for ${row.paper_ref}`,
      })),
    )
    .sort(
      (left, right) =>
        left.paper_ref.localeCompare(right.paper_ref) ||
        left.artifact_type.localeCompare(right.artifact_type),
    );
}

export function buildReviewWorkflowInput(
  args: ReviewWorkflowInputArgs,
): ReviewWorkflowInput {
  const topicId = cleanString(args.topic.topic_id);
  const markdown = cleanString(args.topic.markdown);
  if (!topicId) {
    throw new Error("review workflow input requires topic_id");
  }
  if (!markdown) {
    throw new Error("review workflow input requires topic synthesis markdown");
  }
  const resolvedPapers = normalizeResolvedPapers(args.resolved_paper_set);
  if (resolvedPapers.length === 0) {
    throw new Error("review workflow input requires a resolved paper set");
  }
  const paperRefs = resolvedPapers.map((paper) => paper.paper_ref);
  const registryRows = normalizeRegistryRows(args.registry_rows, paperRefs);
  const missingArtifacts = buildMissingArtifactDiagnostics(registryRows);
  const base = {
    kind: "synthesis.review_workflow_input" as const,
    schema_version: "1.0.0" as const,
    topic: {
      topic_id: topicId,
      title: cleanString(args.topic.title) || topicId,
      markdown,
      metadata: { ...(args.topic.metadata || {}) },
      topic_definition: { ...(args.topic.topic_definition || {}) },
      resolver: { ...(args.topic.resolver || {}) },
    },
    topic_timeline: {
      content: args.topic.timeline || "",
    },
    resolved_paper_set: {
      papers: resolvedPapers,
      snapshot: {
        ...args.resolved_paper_set,
        papers: resolvedPapers,
      },
    },
    registry_readiness: {
      rows: registryRows,
    },
    citation_graph_slice: projectCitationGraphSliceForReview({
      graph: args.citation_graph,
      paperRefs,
    }),
    missing_artifact_diagnostics: missingArtifacts,
    diagnostics: {
      blocking: [],
      warnings: missingArtifacts.map((entry) => entry.message),
    },
  };
  return {
    ...base,
    input_hash: hashCanonicalJson(base),
  };
}

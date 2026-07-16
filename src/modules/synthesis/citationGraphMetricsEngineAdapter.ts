import {
  computeSynthesisCitationGraphMetrics,
  rebuildSynthesisCitationGraphMetricsRequest,
  rebuildSynthesisCitationGraphMetricsResult,
  type SynthesisCitationGraphMetricsEngine,
  type SynthesisCitationGraphMetricsRequest,
  type SynthesisCitationGraphMetricsResult,
} from "../../../packages/synthesis-engine/src/index";
import { hashCanonicalJson } from "./foundation";
import type {
  CitationGraph,
  CitationGraphLibraryNodeMetrics,
  CitationGraphMetrics,
} from "./citationGraph";

export function buildCitationGraphMetricsEngineRequest(graph: CitationGraph) {
  return rebuildSynthesisCitationGraphMetricsRequest({
    graphHash: graph.graph_hash,
    nodes: graph.nodes.map((node) => {
      const rebuilt = {
        nodeId: node.node_id,
        kind: node.kind,
      } as {
        nodeId: string;
        kind: typeof node.kind;
        libraryId?: number;
        itemKey?: string;
        title?: string;
        year?: string;
      };
      if (node.library_id) {
        rebuilt.libraryId = node.library_id;
      }
      if (node.item_key) {
        rebuilt.itemKey = node.item_key;
      }
      if (node.title) {
        rebuilt.title = node.title;
      }
      if (node.year) {
        rebuilt.year = node.year;
      }
      return rebuilt;
    }),
    edges: graph.edges.map((edge) => ({
      edgeId: edge.edge_id,
      source: edge.source,
      target: edge.target,
      mentionCount: edge.mention_count,
    })),
  });
}

function projectLibraryNodeMetric(
  metric: SynthesisCitationGraphMetricsResult["libraryNodeMetrics"][number],
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
    synthesis_role_hints: metric.synthesisRoleHints,
  };
}

export function projectCitationGraphMetricsEngineResult(
  requestInput: SynthesisCitationGraphMetricsRequest,
  resultInput: SynthesisCitationGraphMetricsResult,
): CitationGraphMetrics {
  const request = rebuildSynthesisCitationGraphMetricsRequest(requestInput);
  const result = rebuildSynthesisCitationGraphMetricsResult(
    resultInput,
    request,
  );
  const base = {
    schema_id: "synthesis.unified_citation_graph_metrics" as const,
    schema_version: "1.0.0" as const,
    graph_hash: result.graphHash,
    metrics_version: result.metricsVersion,
    params: {
      pagerank_damping: result.params.pagerankDamping,
      pagerank_iterations: result.params.pagerankIterations,
      foundation_formula: result.params.foundationFormula,
      frontier_formula: result.params.frontierFormula,
    },
    graph_year: result.graphYear,
    library_node_metrics: result.libraryNodeMetrics.map(
      projectLibraryNodeMetric,
    ),
    diagnostics: {
      library_node_count: result.diagnostics.libraryNodeCount,
      external_reference_count: result.diagnostics.externalReferenceCount,
      unresolved_reference_count: result.diagnostics.unresolvedReferenceCount,
      component_count: result.diagnostics.componentCount,
      isolated_library_node_count: result.diagnostics.isolatedLibraryNodeCount,
      missing_year_count: result.diagnostics.missingYearCount,
    },
  };
  return {
    ...base,
    metrics_hash: hashCanonicalJson(base),
  };
}

export function computeCitationGraphMetrics(graph: CitationGraph) {
  const request = buildCitationGraphMetricsEngineRequest(graph);
  return projectCitationGraphMetricsEngineResult(
    request,
    computeSynthesisCitationGraphMetrics(request),
  );
}

export async function computeCitationGraphMetricsWithEngine(
  graph: CitationGraph,
  engine: SynthesisCitationGraphMetricsEngine,
) {
  const request = buildCitationGraphMetricsEngineRequest(graph);
  return {
    request,
    metrics: projectCitationGraphMetricsEngineResult(
      request,
      await engine.compute(request),
    ),
  };
}

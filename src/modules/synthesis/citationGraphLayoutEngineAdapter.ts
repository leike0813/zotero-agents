import {
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphLayoutResult,
  type SynthesisCitationGraphLayoutEngine,
  type SynthesisCitationGraphLayoutRequest,
  type SynthesisCitationGraphLayoutResult,
} from "../../../packages/synthesis-engine/src/index";
import { hashCanonicalJson, sha256 } from "./foundation";
import {
  normalizeCitationLayoutAlgorithm,
  type CitationGraph,
  type CitationGraphLayout,
  type CitationLayoutAlgorithm,
} from "./citationGraph";

function initialCoordinate(nodeId: string, axis: "x" | "y") {
  const hex = sha256(`${nodeId}:force:${axis}`).slice(
    "sha256:".length,
    "sha256:".length + 8,
  );
  const value = Number.parseInt(hex, 16) / 0xffffffff;
  return (value - 0.5) * 100;
}

export function buildCitationGraphLayoutEngineRequest(
  graph: CitationGraph,
  algorithmInput: CitationLayoutAlgorithm,
) {
  const algorithm = normalizeCitationLayoutAlgorithm(algorithmInput);
  return rebuildSynthesisCitationGraphLayoutRequest({
    graphHash: graph.graph_hash,
    algorithm,
    nodes: graph.nodes.map((node) => {
      const title = String(node.title || "").trim();
      const year = String(node.year || "").trim();
      return {
        nodeId: node.node_id,
        kind: node.kind,
        ...(title ? { title } : {}),
        ...(year ? { year } : {}),
        initialX: initialCoordinate(node.node_id, "x"),
        initialY: initialCoordinate(node.node_id, "y"),
      };
    }),
    edges: graph.edges.map((edge) => ({
      edgeId: edge.edge_id,
      source: edge.source,
      target: edge.target,
    })),
  });
}

export function projectCitationGraphLayoutEngineResult(
  requestInput: SynthesisCitationGraphLayoutRequest,
  resultInput: SynthesisCitationGraphLayoutResult,
): CitationGraphLayout {
  const request = rebuildSynthesisCitationGraphLayoutRequest(requestInput);
  const result = rebuildSynthesisCitationGraphLayoutResult(
    resultInput,
    request,
  );
  const base = {
    graph_hash: result.graphHash,
    layout_engine: result.layoutEngine,
    layout_version: result.layoutVersion,
    algorithm: result.algorithm,
    preset: result.algorithm,
    params: result.params,
    nodes: Object.fromEntries(
      result.nodes.map((node) => [node.nodeId, { x: node.x, y: node.y }]),
    ),
  };
  return {
    ...base,
    layout_hash: hashCanonicalJson(base),
  };
}

export async function computeCitationGraphLayoutWithEngine(
  graph: CitationGraph,
  algorithm: CitationLayoutAlgorithm,
  engine: SynthesisCitationGraphLayoutEngine,
) {
  const request = buildCitationGraphLayoutEngineRequest(graph, algorithm);
  return {
    request,
    layout: projectCitationGraphLayoutEngineResult(
      request,
      await engine.compute(request),
    ),
  };
}

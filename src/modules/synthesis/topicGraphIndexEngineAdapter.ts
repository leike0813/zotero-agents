import {
  SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION,
  SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION,
  rebuildSynthesisTopicGraphIndexRequest,
  rebuildSynthesisTopicGraphIndexResult,
  type SynthesisTopicGraphIndexEngine,
} from "../../../packages/synthesis-engine/src/topicGraphIndex";
import type {
  SynthesisTopicGraphIndexProjection,
  SynthesisTopicGraphSnapshot,
} from "./topicGraph";

export async function buildSynthesisTopicGraphIndexWithEngine(args: {
  engine: SynthesisTopicGraphIndexEngine;
  snapshot: SynthesisTopicGraphSnapshot;
  rebuiltAt: string;
}): Promise<SynthesisTopicGraphIndexProjection> {
  const request = rebuildSynthesisTopicGraphIndexRequest({
    contractVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION,
    algorithmVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION,
    sourceManifestHash: args.snapshot.manifest.manifest_hash,
    rebuiltAt: args.rebuiltAt,
    nodes: args.snapshot.nodes.map((node) => ({
      topicId: node.topic_id,
      isRoot: Boolean(node.is_root),
      ...(node.level ? { level: node.level } : {}),
      ...(node.definition_status
        ? { definitionStatus: node.definition_status }
        : {}),
    })),
    edges: args.snapshot.edges.map((edge) => ({
      edgeId: edge.edge_id,
      sourceTopicId: edge.source_topic_id,
      targetTopicId: edge.target_topic_id,
      relation: edge.relation,
      status: edge.status,
    })),
  });
  const result = rebuildSynthesisTopicGraphIndexResult(
    await args.engine.buildIndex(request),
    request,
  );
  return {
    schema_id: "synthesis.topic_graph_index_projection",
    schema_version: result.schemaVersion,
    source_manifest_hash: result.sourceManifestHash,
    rebuilt_at: result.rebuiltAt,
    nodes: args.snapshot.nodes,
    edges: args.snapshot.edges,
    review_items: args.snapshot.review_items,
    roots: result.roots,
    unplaced: result.unplaced,
    diagnostics: args.snapshot.diagnostics,
  };
}

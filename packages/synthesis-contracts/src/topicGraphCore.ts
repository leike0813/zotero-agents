export const SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION =
  "synthesis-topic-graph-index.v1" as const;
export const SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION =
  "topic-graph-index.v1" as const;
export const SYNTHESIS_TOPIC_GRAPH_INDEX_SCHEMA_VERSION = "1.0.0" as const;

export const SYNTHESIS_TOPIC_GRAPH_INDEX_NODE_MAX = 25_000;
export const SYNTHESIS_TOPIC_GRAPH_INDEX_EDGE_MAX = 100_000;
export const SYNTHESIS_TOPIC_GRAPH_INDEX_STRING_MAX = 4096;
export const SYNTHESIS_TOPIC_GRAPH_INDEX_CHECKPOINT_INTERVAL = 256;

export type SynthesisTopicGraphIndexRelation =
  | "broader_than"
  | "related_to"
  | "overlaps_with"
  | "contrasts_with";
export type SynthesisTopicGraphIndexEdgeStatus =
  | "suggested"
  | "confirmed"
  | "rejected"
  | "stale"
  | "deleted";
export type SynthesisTopicGraphIndexDefinitionStatus =
  | "has_synthesis"
  | "placeholder"
  | "deleted"
  | "stale";

export type SynthesisTopicGraphIndexNode = {
  topicId: string;
  isRoot: boolean;
  level?: "top" | "normal";
  definitionStatus?: SynthesisTopicGraphIndexDefinitionStatus;
};
export type SynthesisTopicGraphIndexEdge = {
  edgeId: string;
  sourceTopicId: string;
  targetTopicId: string;
  relation: SynthesisTopicGraphIndexRelation;
  status: SynthesisTopicGraphIndexEdgeStatus;
};
export type SynthesisTopicGraphIndexRequest = {
  contractVersion: typeof SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION;
  algorithmVersion: typeof SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION;
  sourceManifestHash: string;
  rebuiltAt: string;
  nodes: SynthesisTopicGraphIndexNode[];
  edges: SynthesisTopicGraphIndexEdge[];
};
export type SynthesisTopicGraphIndexResult = {
  contractVersion: typeof SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION;
  algorithmVersion: typeof SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION;
  schemaVersion: typeof SYNTHESIS_TOPIC_GRAPH_INDEX_SCHEMA_VERSION;
  sourceManifestHash: string;
  rebuiltAt: string;
  roots: string[];
  unplaced: string[];
};
export type SynthesisTopicGraphIndexCheckpoint = {
  phase: "start" | "nodes" | "edges" | "roots" | "unplaced" | "complete";
  processedCount: number;
  totalCount: number;
};
export type SynthesisTopicGraphIndexEngineOptions = {
  checkpoint?: (checkpoint: SynthesisTopicGraphIndexCheckpoint) => void;
  checkpointInterval?: number;
};
export interface SynthesisTopicGraphIndexEngine {
  buildIndex(
    request: SynthesisTopicGraphIndexRequest,
  ): Promise<SynthesisTopicGraphIndexResult>;
}
export type SynthesisTopicGraphIndexContractBounds = {
  nodeMax?: number;
  edgeMax?: number;
  stringMax?: number;
};

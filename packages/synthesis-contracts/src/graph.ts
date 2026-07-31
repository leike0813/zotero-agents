import type { SynthesisJsonObject } from "./common";

export const SYNTHESIS_CITATION_GRAPH_LAYOUT_ALGORITHMS = [
  "force",
  "radial",
  "components",
] as const;

export type SynthesisCitationGraphLayoutAlgorithm =
  (typeof SYNTHESIS_CITATION_GRAPH_LAYOUT_ALGORITHMS)[number];

export type SynthesisCitationGraphLayoutRequest = {
  algorithm: SynthesisCitationGraphLayoutAlgorithm;
  force?: boolean;
};

export type SynthesisGraphCommandResult = SynthesisJsonObject;
export type SynthesisGraphCommandRequest = SynthesisJsonObject;

export type SynthesisCitationGraphNode = {
  node_id: string;
  kind: "library_paper" | "external_reference" | "unresolved_reference";
  target_state: "library" | "external" | "unresolved";
  aliases: string[];
  title?: string;
  year?: string;
  authors?: string[];
  low_signal?: boolean;
  external_degree?: number;
  visibility?: "default" | "hover_only";
  display_tier?: "library" | "shared_external" | "single_external";
};

export type SynthesisCitationGraphEdge = {
  edge_id: string;
  source: string;
  target: string;
  kind: "citation";
  mention_count: number;
  primary_role: string;
  aux_roles: Array<{ role: string; count: number }>;
  visibility?: "default" | "hover_only";
};

export const SYNTHESIS_CITATION_GRAPH_WINDOW_DEFAULTS = {
  nodeLimit: 200,
  edgeLimit: 400,
  hoverNodeLimit: 100,
  hoverEdgeLimit: 200,
  responseBudgetBytes: 768 * 1024,
  cursorMaxLength: 4096,
  nodeSoftLimit: 10_000,
  edgeSoftLimit: 20_000,
} as const;

export type SynthesisCitationGraphWindowStatus =
  | "loading"
  | "complete"
  | "paused"
  | "failed";

export type SynthesisCitationGraphFilters = {
  topicId?: string;
  nodeKinds?: SynthesisCitationGraphNode["kind"][];
  roles?: string[];
  includeLowSignal?: boolean;
  search?: string;
};

export type SynthesisCitationGraphBasis = {
  expectedGraphHash?: string;
  layoutAlgorithm?: SynthesisCitationGraphLayoutAlgorithm;
  topicId?: string;
};

export type SynthesisCitationGraphWindowLimits = {
  nodeLimit?: number;
  edgeLimit?: number;
  hoverNodeLimit?: number;
  hoverEdgeLimit?: number;
};

export type SynthesisCitationGraphPageMetadata = {
  nextCursor?: string;
  hasMore: boolean;
  totalNodes: number;
  totalEdges: number;
  totalHoverNodes: number;
  totalHoverEdges: number;
  returnedNodes: number;
  returnedEdges: number;
  returnedHoverNodes: number;
  returnedHoverEdges: number;
  querySignature: string;
  layoutStatus: "ready" | "missing" | "stale" | "refreshing" | "failed";
  windowStatus: SynthesisCitationGraphWindowStatus;
  roleOptions: string[];
};

export type SynthesisGraphQueryRequest = {
  cursor?: string | number;
  limit?: number;
  windowCursor?: string;
  window?: SynthesisCitationGraphWindowLimits;
  basis?: SynthesisCitationGraphBasis;
  filters?: SynthesisCitationGraphFilters;
  layoutAlgorithm?: SynthesisCitationGraphLayoutAlgorithm;
  nodeCursor?: string | number;
  nodeLimit?: number;
  edgeCursor?: string | number;
  edgeLimit?: number;
  hoverNodeCursor?: string | number;
  hoverNodeLimit?: number;
  hoverEdgeCursor?: string | number;
  hoverEdgeLimit?: number;
};

export type SynthesisGraphQueryResult = {
  schema_id: "synthesis.unified_citation_graph";
  schema_version: "1.0.0";
  graph_hash: string;
  nodes: SynthesisCitationGraphNode[];
  edges: SynthesisCitationGraphEdge[];
  hover_only_nodes: SynthesisCitationGraphNode[];
  hover_only_edges: SynthesisCitationGraphEdge[];
  summary: Record<string, unknown>;
  pagination: Record<string, unknown>;
  diagnostics: Record<string, unknown>;
  page?: SynthesisCitationGraphPageMetadata;
};

export type SynthesisCitationGraphSliceRequest = {
  startNodeId?: string;
  paperRef?: string;
  depth?: number;
  direction?: "incoming" | "outgoing" | "both";
  maxNodes?: number;
  maxEdges?: number;
  expectedGraphHash?: string;
  querySignature?: string;
  filters?: SynthesisCitationGraphFilters;
  layoutAlgorithm?: SynthesisCitationGraphLayoutAlgorithm;
};

export type SynthesisCitationGraphSliceResult = {
  ok: boolean;
  graph_hash: string;
  start_node_id: string;
  nodes: SynthesisCitationGraphNode[];
  edges: SynthesisCitationGraphEdge[];
  diagnostics: Record<string, unknown>;
  querySignature?: string;
  roleOptions?: string[];
};

export type SynthesisCitationGraphLayoutReadRequest = {
  scope?: "full";
  preset?: SynthesisCitationGraphLayoutAlgorithm;
  algorithm?: SynthesisCitationGraphLayoutAlgorithm;
};

export type SynthesisCitationGraphLayoutReadResult = {
  ok: boolean;
  status: "ready" | "missing" | "stale" | "refreshing" | "failed";
  scope: "full";
  graph_hash: string;
  layout_hash: string;
  layout_status: "ready" | "missing" | "stale" | "refreshing" | "failed";
  preset: SynthesisCitationGraphLayoutAlgorithm;
  view_key: "workbench_overview";
  nodes: Array<{
    node_id: string;
    node_type: SynthesisCitationGraphNode["kind"];
    x: number;
    y: number;
  }>;
  edges: Array<{
    edge_id: string;
    source: string;
    target: string;
    primary_role: string;
    aux_roles: Array<{ role: string; count: number }>;
    weight: number;
  }>;
  diagnostics: Record<string, unknown>;
};

export type SynthesisCitationGraphMetricsRequest = {
  cursor?: string | number;
  limit?: number;
  sortBy?: "foundation" | "frontier" | "pagerank" | "in_degree";
};

export type SynthesisCitationGraphMetricsResult = {
  ok: boolean;
  graph_hash: string;
  metrics_hash: string;
  status: "ready" | "missing" | "stale";
  items: SynthesisJsonObject[];
  cursor: string;
  nextCursor: string;
  hasMore: boolean;
  returned: number;
  total: number;
  limit: number;
  diagnostics: Record<string, unknown>;
};

export interface SynthesisGraphClient {
  startUpdate(
    request?: SynthesisGraphCommandRequest,
  ): Promise<SynthesisGraphCommandResult>;
  queryCluster(
    request?: SynthesisGraphQueryRequest,
  ): Promise<SynthesisGraphQueryResult>;
  getOverview(
    request?: SynthesisGraphQueryRequest,
  ): Promise<SynthesisGraphQueryResult>;
  getSlice(
    request?: SynthesisCitationGraphSliceRequest,
  ): Promise<SynthesisCitationGraphSliceResult>;
  getPersistedLayout(
    request?: SynthesisCitationGraphLayoutReadRequest,
  ): Promise<SynthesisCitationGraphLayoutReadResult>;
  getMetrics(
    request?: SynthesisCitationGraphMetricsRequest,
  ): Promise<SynthesisCitationGraphMetricsResult>;
  rankLibraryPapers(
    request?: SynthesisCitationGraphMetricsRequest,
  ): Promise<SynthesisCitationGraphMetricsResult>;
  refreshMetricsNow(
    request?: SynthesisGraphCommandRequest,
  ): Promise<SynthesisGraphCommandResult>;
  recomputeCitationGraphLayout(
    request: SynthesisCitationGraphLayoutRequest,
  ): Promise<SynthesisGraphCommandResult>;
  rebuildCitationGraphCacheNow(): Promise<SynthesisGraphCommandResult>;
  refreshCitationGraphCacheIncrementalNow(): Promise<SynthesisGraphCommandResult>;
  retryCitationGraphCacheRebuild(): Promise<SynthesisGraphCommandResult>;
}

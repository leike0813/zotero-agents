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
export type SynthesisGraphQueryRequest = SynthesisJsonObject;
export type SynthesisGraphQueryResult = SynthesisJsonObject;

export interface SynthesisGraphClient {
  queryCluster(
    request?: SynthesisGraphQueryRequest,
  ): Promise<SynthesisGraphQueryResult>;
  getOverview(
    request?: SynthesisGraphQueryRequest,
  ): Promise<SynthesisGraphQueryResult>;
  getSlice(
    request?: SynthesisGraphQueryRequest,
  ): Promise<SynthesisGraphQueryResult>;
  getPersistedLayout(
    request?: SynthesisGraphQueryRequest,
  ): Promise<SynthesisGraphQueryResult>;
  getMetrics(
    request?: SynthesisGraphQueryRequest,
  ): Promise<SynthesisGraphQueryResult>;
  rankLibraryPapers(
    request?: SynthesisGraphQueryRequest,
  ): Promise<SynthesisGraphQueryResult>;
  refreshMetricsNow(
    request?: SynthesisGraphQueryRequest,
  ): Promise<SynthesisGraphCommandResult>;
  recomputeCitationGraphLayout(
    request: SynthesisCitationGraphLayoutRequest,
  ): Promise<SynthesisGraphCommandResult>;
  rebuildCitationGraphCacheNow(): Promise<SynthesisGraphCommandResult>;
  refreshCitationGraphCacheIncrementalNow(): Promise<SynthesisGraphCommandResult>;
  retryCitationGraphCacheRebuild(): Promise<SynthesisGraphCommandResult>;
}

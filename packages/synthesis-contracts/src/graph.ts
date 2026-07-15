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

export interface SynthesisGraphClient {
  recomputeCitationGraphLayout(
    request: SynthesisCitationGraphLayoutRequest,
  ): Promise<SynthesisGraphCommandResult>;
  rebuildCitationGraphCacheNow(): Promise<SynthesisGraphCommandResult>;
  refreshCitationGraphCacheIncrementalNow(): Promise<SynthesisGraphCommandResult>;
  retryCitationGraphCacheRebuild(): Promise<SynthesisGraphCommandResult>;
}

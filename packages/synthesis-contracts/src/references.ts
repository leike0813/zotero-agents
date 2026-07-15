import type { SynthesisJsonObject } from "./common";

export type SynthesisReferenceCommandResult = SynthesisJsonObject;

export interface SynthesisReferencesClient {
  refreshReferenceSidecarNow(): Promise<SynthesisReferenceCommandResult>;
  retryReferenceSidecarRefresh(): Promise<SynthesisReferenceCommandResult>;
  runAdvancedReferenceMatchingNow(): Promise<SynthesisReferenceCommandResult>;
  retryAdvancedReferenceMatching(): Promise<SynthesisReferenceCommandResult>;
}

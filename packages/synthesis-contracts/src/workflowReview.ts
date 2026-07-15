import type { SynthesisJsonObject } from "./common";

export type SynthesisWorkflowReviewRequest = SynthesisJsonObject;
export type SynthesisWorkflowReviewResult = SynthesisJsonObject;

export interface SynthesisWorkflowReviewClient {
  getInput(
    request?: SynthesisWorkflowReviewRequest,
  ): Promise<SynthesisWorkflowReviewResult>;
}

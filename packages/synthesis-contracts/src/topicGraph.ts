import type { SynthesisJsonObject } from "./common";

export const SYNTHESIS_TOPIC_GRAPH_REVIEW_ACTIONS = [
  "approve_suggested",
  "reject",
] as const;

export type SynthesisTopicGraphReviewAction =
  (typeof SYNTHESIS_TOPIC_GRAPH_REVIEW_ACTIONS)[number];

export type SynthesisTopicGraphEdgeDecisionRequest = {
  edgeId: string;
};

export type SynthesisTopicGraphReviewActionRequest = {
  reviewId: string;
  action: SynthesisTopicGraphReviewAction;
};

export type SynthesisTopicGraphCommandResult = SynthesisJsonObject;

export interface SynthesisTopicGraphClient {
  rebuildTopicGraphIndex(): Promise<SynthesisTopicGraphCommandResult>;
  acceptTopicGraphRelation(
    request: SynthesisTopicGraphEdgeDecisionRequest,
  ): Promise<SynthesisTopicGraphCommandResult>;
  rejectTopicGraphRelation(
    request: SynthesisTopicGraphEdgeDecisionRequest,
  ): Promise<SynthesisTopicGraphCommandResult>;
  applyTopicGraphReviewAction(
    request: SynthesisTopicGraphReviewActionRequest,
  ): Promise<SynthesisTopicGraphCommandResult>;
}

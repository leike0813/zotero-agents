import type { SynthesisPublicMaintenanceOperation } from "./lifecycle";
import { rebuildSynthesisProtocolCapabilityDto } from "./protocolSchema.js";

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

export type SynthesisTopicGraphCommandResult = {
  status:
    | "committed"
    | "unchanged"
    | "not_found"
    | "basis_mismatch"
    | "topic_graph_busy"
    | "invalid_request"
    | "worker_failed"
    | "stopping";
  manifestHash: string | null;
  revision: number;
  changedNodeIds: string[];
  changedEdgeIds: string[];
  reviewIds: string[];
  diagnostics: Array<{ code: string; severity: "warning" | "error" }>;
};

export type SynthesisTopicGraphCapabilityResultMap = {
  "client.rebuildTopicGraphIndex": SynthesisPublicMaintenanceOperation;
  "client.acceptTopicGraphRelation": SynthesisTopicGraphCommandResult;
  "client.rejectTopicGraphRelation": SynthesisTopicGraphCommandResult;
  "client.applyTopicGraphReviewAction": SynthesisTopicGraphCommandResult;
};

export function rebuildSynthesisTopicGraphCapabilityResult<
  Capability extends keyof SynthesisTopicGraphCapabilityResultMap,
>(
  capability: Capability,
  value: unknown,
): SynthesisTopicGraphCapabilityResultMap[Capability] {
  return rebuildSynthesisProtocolCapabilityDto({
    capability,
    direction: "result",
    value,
  });
}

export interface SynthesisTopicGraphClient {
  rebuildTopicGraphIndex(): Promise<SynthesisPublicMaintenanceOperation>;
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

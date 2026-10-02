import { rebuildSynthesisProtocolCapabilityDto } from "./protocolSchema.js";
export const SYNTHESIS_TOPIC_GRAPH_REVIEW_ACTIONS = [
    "approve_suggested",
    "reject",
];
export function rebuildSynthesisTopicGraphCapabilityResult(capability, value) {
    return rebuildSynthesisProtocolCapabilityDto({
        capability,
        direction: "result",
        value,
    });
}

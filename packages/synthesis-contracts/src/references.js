import { rebuildSynthesisProtocolCapabilityDto } from "./protocolSchema.js";
export const SYNTHESIS_CANONICAL_REVISION_REVIEW_ACTIONS = [
    "accept",
    "reject",
];
export const SYNTHESIS_REFERENCE_MATCH_PROPOSAL_ACTIONS = [
    "accept",
    "reverse_accept",
    "reject",
    "reopen",
    "delete",
];
export const SYNTHESIS_REFERENCE_MATCH_PROPOSAL_DECISION_ACTIONS = [
    ...SYNTHESIS_REFERENCE_MATCH_PROPOSAL_ACTIONS,
    "manual_target",
];
export function rebuildSynthesisReferenceCapabilityResult(capability, value) {
    return rebuildSynthesisProtocolCapabilityDto({
        capability,
        direction: "result",
        value,
    });
}

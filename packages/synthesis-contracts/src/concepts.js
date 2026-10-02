import { rebuildSynthesisProtocolCapabilityDto } from "./protocolSchema.js";
export const SYNTHESIS_CONCEPT_REVIEW_ACTIONS = [
    "approve_create",
    "merge_into_existing",
    "reject",
    "keep_alias",
    "remove_alias",
];
export function rebuildSynthesisConceptCapabilityResult(capability, value) {
    return rebuildSynthesisProtocolCapabilityDto({
        capability,
        direction: "result",
        value,
    });
}

import { rebuildSynthesisProtocolCapabilityDto, rebuildSynthesisProtocolDto, } from "./protocolSchema.js";
const SYNTHESIS_WORKFLOW_REVIEW_SCHEMA_ID = "https://zotero-agents.local/synthesis/sidecar-protocol/v1/client-workflow-review.schema.json";
export function rebuildSynthesisWorkflowReviewResult(value) {
    return rebuildSynthesisProtocolCapabilityDto({
        capability: "client.getReviewInput",
        direction: "result",
        value,
    });
}
export function rebuildSynthesisWorkflowReviewRequest(value) {
    return rebuildSynthesisProtocolDto({
        schemaId: SYNTHESIS_WORKFLOW_REVIEW_SCHEMA_ID,
        definition: "ReviewRequest",
        direction: "request",
        value,
    });
}

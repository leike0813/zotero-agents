import { assertSynthesisExactFields, SynthesisClientError, toSynthesisJsonObject, } from "./common";
import { byteLengthSynthesisContractText } from "./canonicalJson";
import { rebuildSynthesisProtocolCapabilityDto, rebuildSynthesisProtocolDto, SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID, } from "./protocolSchema";
const TOPIC_PLAN_ACTION_LIMIT = 10_000;
const TOPIC_PLAN_RELATION_LIMIT = 20_000;
const TOPIC_PLAN_SERIALIZED_LIMIT = 64 * 1024 * 1024;
function invalidTopicPlan(location) {
    throw new SynthesisClientError("invalid_request", `Topic plan contract is invalid at ${location}`, { location });
}
function boundedTopicPlanString(value, location, maximum = 4096) {
    if (typeof value !== "string" || !value.trim() || value.length > maximum) {
        invalidTopicPlan(location);
    }
    return value;
}
function topicPlanStringArray(value, location, maximum = TOPIC_PLAN_ACTION_LIMIT) {
    if (!Array.isArray(value) || value.length > maximum) {
        invalidTopicPlan(location);
    }
    return value.map((entry, index) => boundedTopicPlanString(entry, `${location}[${index}]`));
}
function topicPlanJsonArray(value, location) {
    if (!Array.isArray(value))
        invalidTopicPlan(location);
    return value;
}
function rebuildTopicPlanAction(value, index) {
    const location = `topicPlan.topic_actions[${index}]`;
    const action = toSynthesisJsonObject(value, location);
    assertSynthesisExactFields(action, ["action", "topic_id"], [
        "title",
        "definition",
        "aliases",
        "scope",
        "resolver",
        "revision",
        "basis",
        "provenance",
    ], location);
    if (action.action !== "create" &&
        action.action !== "update" &&
        action.action !== "mark_stale" &&
        action.action !== "reactivate") {
        invalidTopicPlan(`${location}.action`);
    }
    boundedTopicPlanString(action.topic_id, `${location}.topic_id`);
    for (const field of ["title", "definition"]) {
        if (action[field] !== undefined) {
            boundedTopicPlanString(action[field], `${location}.${field}`, 16_384);
        }
    }
    if (action.aliases !== undefined) {
        topicPlanStringArray(action.aliases, `${location}.aliases`, 1_000);
    }
    if (action.scope !== undefined) {
        const scope = toSynthesisJsonObject(action.scope, `${location}.scope`);
        assertSynthesisExactFields(scope, ["include", "exclude"], [], `${location}.scope`);
        topicPlanStringArray(scope.include, `${location}.scope.include`, 10_000);
        topicPlanStringArray(scope.exclude, `${location}.scope.exclude`, 10_000);
    }
    if (action.resolver !== undefined) {
        toSynthesisJsonObject(action.resolver, `${location}.resolver`);
    }
    if (action.revision !== undefined &&
        (!Number.isSafeInteger(action.revision) || Number(action.revision) < 0)) {
        invalidTopicPlan(`${location}.revision`);
    }
    for (const field of ["basis", "provenance"]) {
        if (action[field] !== undefined) {
            topicPlanJsonArray(action[field], `${location}.${field}`);
        }
    }
    return action;
}
function rebuildTopicPlanRelation(value, index) {
    const location = `topicPlan.relation_proposals[${index}]`;
    const relation = toSynthesisJsonObject(value, location);
    assertSynthesisExactFields(relation, ["source_topic_id", "target_topic_id", "relation"], ["status", "confidence", "provenance", "evidence_refs"], location);
    boundedTopicPlanString(relation.source_topic_id, `${location}.source_topic_id`);
    boundedTopicPlanString(relation.target_topic_id, `${location}.target_topic_id`);
    if (relation.relation !== "broader_than" &&
        relation.relation !== "related_to" &&
        relation.relation !== "overlaps_with" &&
        relation.relation !== "contrasts_with") {
        invalidTopicPlan(`${location}.relation`);
    }
    if (relation.status !== undefined &&
        relation.status !== "suggested" &&
        relation.status !== "confirmed" &&
        relation.status !== "rejected") {
        invalidTopicPlan(`${location}.status`);
    }
    if (relation.confidence !== undefined &&
        (typeof relation.confidence !== "number" ||
            relation.confidence < 0 ||
            relation.confidence > 1)) {
        invalidTopicPlan(`${location}.confidence`);
    }
    for (const field of ["provenance", "evidence_refs"]) {
        if (relation[field] !== undefined) {
            topicPlanJsonArray(relation[field], `${location}.${field}`);
        }
    }
    return relation;
}
export function rebuildSynthesisTopicPlanApplyRequest(value) {
    const request = toSynthesisJsonObject(value, "topicPlan");
    assertSynthesisExactFields(request, [
        "kind",
        "operation",
        "base_graph_hash",
        "library_index_hash",
        "topic_actions",
        "relation_proposals",
        "recommended_updates",
    ], ["coverage_manifest_path"], "topicPlan");
    if (request.kind !== "topic_plan")
        invalidTopicPlan("topicPlan.kind");
    if (request.operation !== "reconcile") {
        invalidTopicPlan("topicPlan.operation");
    }
    boundedTopicPlanString(request.base_graph_hash, "topicPlan.base_graph_hash");
    boundedTopicPlanString(request.library_index_hash, "topicPlan.library_index_hash");
    if (!Array.isArray(request.topic_actions) ||
        request.topic_actions.length > TOPIC_PLAN_ACTION_LIMIT) {
        invalidTopicPlan("topicPlan.topic_actions");
    }
    if (!Array.isArray(request.relation_proposals) ||
        request.relation_proposals.length > TOPIC_PLAN_RELATION_LIMIT) {
        invalidTopicPlan("topicPlan.relation_proposals");
    }
    request.topic_actions = request.topic_actions.map(rebuildTopicPlanAction);
    request.relation_proposals = request.relation_proposals.map(rebuildTopicPlanRelation);
    if (request.coverage_manifest_path !== undefined) {
        boundedTopicPlanString(request.coverage_manifest_path, "topicPlan.coverage_manifest_path", 16_384);
    }
    request.recommended_updates = topicPlanStringArray(request.recommended_updates, "topicPlan.recommended_updates");
    if (byteLengthSynthesisContractText(JSON.stringify(request)) >
        TOPIC_PLAN_SERIALIZED_LIMIT) {
        invalidTopicPlan("topicPlan");
    }
    return request;
}
export function rebuildSynthesisTopicPlanApplyResult(value) {
    const result = toSynthesisJsonObject(value, "topicPlanResult");
    assertSynthesisExactFields(result, [
        "status",
        "graph_hash",
        "coverage_stale",
        "recommended_updates",
        "diagnostics",
        "receipt",
    ], [], "topicPlanResult");
    if (result.status !== "persisted" &&
        result.status !== "no_change" &&
        result.status !== "already_applied" &&
        result.status !== "conflict") {
        invalidTopicPlan("topicPlanResult.status");
    }
    boundedTopicPlanString(result.graph_hash, "topicPlanResult.graph_hash");
    if (typeof result.coverage_stale !== "boolean") {
        invalidTopicPlan("topicPlanResult.coverage_stale");
    }
    result.recommended_updates = topicPlanStringArray(result.recommended_updates, "topicPlanResult.recommended_updates");
    if (!Array.isArray(result.diagnostics)) {
        invalidTopicPlan("topicPlanResult.diagnostics");
    }
    result.diagnostics = result.diagnostics.map((value, index) => {
        const location = `topicPlanResult.diagnostics[${index}]`;
        const diagnostic = toSynthesisJsonObject(value, location);
        assertSynthesisExactFields(diagnostic, ["code", "message"], ["source_topic_id", "target_topic_id"], location);
        if (diagnostic.code !== "topic_action_noop" &&
            diagnostic.code !== "topic_revision_conflict" &&
            diagnostic.code !== "relation_duplicate" &&
            diagnostic.code !== "relation_endpoint_missing" &&
            diagnostic.code !== "relation_cycle" &&
            diagnostic.code !== "coverage_stale") {
            invalidTopicPlan(`${location}.code`);
        }
        boundedTopicPlanString(diagnostic.message, `${location}.message`, 16_384);
        for (const field of ["source_topic_id", "target_topic_id"]) {
            if (diagnostic[field] !== undefined) {
                boundedTopicPlanString(diagnostic[field], `${location}.${field}`);
            }
        }
        return diagnostic;
    });
    if (result.receipt !== null) {
        const receipt = toSynthesisJsonObject(result.receipt, "topicPlanResult.receipt");
        assertSynthesisExactFields(receipt, [
            "schema",
            "transaction_id",
            "operation",
            "before_graph_hash",
            "after_graph_hash",
            "committed_at",
        ], [], "topicPlanResult.receipt");
        if (receipt.schema !==
            "zotero-agents.synthesis-canonical-transaction-receipt.v1" ||
            receipt.operation !== "topic_plan.reconcile") {
            invalidTopicPlan("topicPlanResult.receipt");
        }
        for (const field of [
            "transaction_id",
            "before_graph_hash",
            "after_graph_hash",
            "committed_at",
        ]) {
            boundedTopicPlanString(receipt[field], `topicPlanResult.receipt.${field}`);
        }
        result.receipt = receipt;
    }
    if ((result.status === "persisted") !== (result.receipt !== null)) {
        invalidTopicPlan("topicPlanResult.receipt");
    }
    return result;
}
export function rebuildSynthesisLiteratureDigestApplyRequest(value) {
    return rebuildSynthesisProtocolDto({
        schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
        definition: "LiteratureDigestPayload",
        value,
        direction: "request",
    });
}
export function rebuildSynthesisLiteratureDigestApplyResult(value) {
    return rebuildSynthesisProtocolDto({
        schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
        definition: "ApplyLiteratureDigestSidecarResult",
        value,
        direction: "result",
    });
}
export function rebuildSynthesisTopicApplyRequest(value) {
    return rebuildSynthesisProtocolDto({
        schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
        definition: "TopicApplyPayload",
        value,
        direction: "request",
    });
}
export function rebuildSynthesisTopicApplyResult(value) {
    return rebuildSynthesisProtocolDto({
        schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
        definition: "ApplyTopicSynthesisResultResult",
        value,
        direction: "result",
    });
}
export function rebuildSynthesisTopicReportResult(value) {
    return rebuildSynthesisProtocolDto({
        schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
        definition: "GetTopicReportResult",
        value,
        direction: "result",
    });
}
export function rebuildSynthesisArtifactCapabilityResult(capability, value) {
    return rebuildSynthesisProtocolCapabilityDto({
        capability,
        direction: "result",
        value,
    });
}

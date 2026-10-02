import { SynthesisClientError, toSynthesisJsonObject } from "./common";
import { rebuildSynthesisProtocolDto, SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID, } from "./protocolSchema";
export function rebuildSynthesisTopicListResult(value) {
    return rebuildSynthesisProtocolDto({
        schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
        definition: "ListTopicsResult",
        value,
        direction: "result",
    });
}
export function rebuildSynthesisTopicFindResult(value) {
    return rebuildSynthesisProtocolDto({
        schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
        definition: "FindTopicsByPaperRefResult",
        value,
        direction: "result",
    });
}
export function rebuildSynthesisTopicContextResult(value) {
    return rebuildSynthesisProtocolDto({
        schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
        definition: "GetTopicContextResult",
        value,
        direction: "result",
    });
}
export function rebuildSynthesisTopicResolverResult(value) {
    return rebuildSynthesisProtocolDto({
        schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
        definition: "ResolveResolverResult",
        value,
        direction: "result",
    });
}
export function rebuildSynthesisWorkflowTopicOptionsResult(value) {
    return rebuildSynthesisProtocolDto({
        schemaId: SYNTHESIS_TOPIC_WORKBENCH_SCHEMA_ID,
        definition: "ListWorkflowTopicOptionsResult",
        value,
        direction: "result",
    });
}
function invalid(location) {
    throw new SynthesisClientError("invalid_request", `${location} is invalid`, {
        location,
    });
}
function exactObject(value, location, required, optional = []) {
    const object = toSynthesisJsonObject(value, location);
    const allowed = new Set([...required, ...optional]);
    if (required.some((field) => !Object.hasOwn(object, field)) ||
        Object.keys(object).some((field) => !allowed.has(field))) {
        invalid(location);
    }
    return object;
}
function strings(value, location, allowEmpty = true) {
    if (!Array.isArray(value) ||
        (!allowEmpty && value.length === 0) ||
        value.length > 25_000 ||
        value.some((entry) => typeof entry !== "string" || entry.length === 0 || entry.length > 4_096)) {
        invalid(location);
    }
    return [...value];
}
export function rebuildSynthesisTopicListRequest(value) {
    const object = exactObject(value, "synthesisTopicListRequest", [
        "cursor",
        "limit",
    ]);
    if (typeof object.cursor !== "string" ||
        object.cursor.length > 128 ||
        typeof object.limit !== "number" ||
        !Number.isSafeInteger(object.limit) ||
        object.limit < 1 ||
        object.limit > 250) {
        invalid("synthesisTopicListRequest");
    }
    return { cursor: object.cursor, limit: object.limit };
}
export function rebuildSynthesisTopicFindRequest(value) {
    const object = exactObject(value, "synthesisTopicFindRequest", [
        "paper_refs",
    ]);
    return {
        paper_refs: strings(object.paper_refs, "synthesisTopicFindRequest.paper_refs", false),
    };
}
export function rebuildSynthesisTopicContextRequest(value) {
    const object = exactObject(value, "synthesisTopicContextRequest", [
        "topicId",
        "view",
    ]);
    if (typeof object.topicId !== "string" ||
        !object.topicId.trim() ||
        !["digest", "semantic", "audit", "full"].includes(String(object.view))) {
        invalid("synthesisTopicContextRequest");
    }
    return {
        topicId: object.topicId.trim(),
        view: object.view,
    };
}
export function rebuildSynthesisTopicResolverRequest(value) {
    const object = exactObject(value, "synthesisTopicResolverRequest", ["paper_refs", "collection_key", "combine", "cursor", "limit"], ["tag"]);
    const paperRefs = strings(object.paper_refs, "synthesisTopicResolverRequest.paper_refs");
    const collectionKeys = strings(object.collection_key, "synthesisTopicResolverRequest.collection_key");
    let tag;
    if (object.tag !== undefined) {
        const tagObject = exactObject(object.tag, "synthesisTopicResolverRequest.tag", [], ["and", "or", "not"]);
        if (Object.keys(tagObject).length === 0)
            invalid("synthesisTopicResolverRequest.tag");
        tag = Object.fromEntries(Object.entries(tagObject).map(([field, entries]) => [
            field,
            strings(entries, `synthesisTopicResolverRequest.tag.${field}`, false),
        ]));
    }
    if ((paperRefs.length === 0 && collectionKeys.length === 0 && !tag) ||
        (object.combine !== "union" && object.combine !== "intersection") ||
        typeof object.cursor !== "number" ||
        !Number.isSafeInteger(object.cursor) ||
        object.cursor < 0 ||
        typeof object.limit !== "number" ||
        !Number.isSafeInteger(object.limit) ||
        object.limit < 1 ||
        object.limit > 250) {
        invalid("synthesisTopicResolverRequest");
    }
    return {
        paper_refs: paperRefs,
        collection_key: collectionKeys,
        ...(tag ? { tag } : {}),
        combine: object.combine,
        cursor: object.cursor,
        limit: object.limit,
    };
}
export function rebuildSynthesisWorkflowTopicOptionsRequest(value) {
    const object = exactObject(value, "synthesisWorkflowTopicOptionsRequest", [
        "filter",
    ]);
    if (object.filter !== "all" &&
        object.filter !== "updatable" &&
        object.filter !== "planned") {
        invalid("synthesisWorkflowTopicOptionsRequest.filter");
    }
    return { filter: object.filter };
}

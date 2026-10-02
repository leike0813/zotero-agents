import { SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION, SYNTHESIS_TOPIC_GRAPH_INDEX_CHECKPOINT_INTERVAL, SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION, SYNTHESIS_TOPIC_GRAPH_INDEX_EDGE_MAX, SYNTHESIS_TOPIC_GRAPH_INDEX_NODE_MAX, SYNTHESIS_TOPIC_GRAPH_INDEX_SCHEMA_VERSION, SYNTHESIS_TOPIC_GRAPH_INDEX_STRING_MAX, } from "../../synthesis-contracts/src/topicGraphCore.ts";
import { compareSynthesisContractStrings } from "../../synthesis-contracts/src/canonicalJson.ts";
export * from "../../synthesis-contracts/src/topicGraphCore.ts";
export class SynthesisTopicGraphIndexContractError extends Error {
    code = "invalid_request";
    constructor(message) {
        super(message);
        this.name = "SynthesisTopicGraphIndexContractError";
    }
}
function invalid(message) {
    throw new SynthesisTopicGraphIndexContractError(message);
}
function resolveBounds(bounds = {}) {
    return {
        nodeMax: bounds.nodeMax ?? SYNTHESIS_TOPIC_GRAPH_INDEX_NODE_MAX,
        edgeMax: bounds.edgeMax ?? SYNTHESIS_TOPIC_GRAPH_INDEX_EDGE_MAX,
        stringMax: bounds.stringMax ?? SYNTHESIS_TOPIC_GRAPH_INDEX_STRING_MAX,
    };
}
function isPlainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function assertJsonSafe(value, location, seen = new Set()) {
    if (value === null ||
        typeof value === "string" ||
        typeof value === "boolean") {
        return;
    }
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            invalid(`${location} must contain finite numbers`);
        }
        return;
    }
    if (typeof value !== "object" || value === undefined) {
        invalid(`${location} must be JSON-safe`);
    }
    const object = value;
    if (seen.has(object)) {
        invalid(`${location} must not contain cycles`);
    }
    seen.add(object);
    if (Array.isArray(value)) {
        value.forEach((entry, index) => assertJsonSafe(entry, `${location}[${index}]`, seen));
    }
    else if (isPlainObject(value)) {
        for (const [key, entry] of Object.entries(value)) {
            assertJsonSafe(entry, `${location}.${key}`, seen);
        }
    }
    else {
        invalid(`${location} must contain plain objects`);
    }
    seen.delete(object);
}
function objectValue(value, location) {
    if (!isPlainObject(value)) {
        return invalid(`${location} must be an object`);
    }
    return value;
}
function arrayValue(value, location) {
    if (!Array.isArray(value)) {
        return invalid(`${location} must be an array`);
    }
    return value;
}
function requiredString(value, location, bounds) {
    if (typeof value !== "string") {
        return invalid(`${location} must be a string`);
    }
    const cleaned = value.trim();
    if (!cleaned) {
        return invalid(`${location} must not be empty`);
    }
    if (cleaned.length > bounds.stringMax) {
        return invalid(`${location} exceeds the string bound`);
    }
    return cleaned;
}
function optionalLevel(value, location) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    if (value === "top" || value === "normal") {
        return value;
    }
    return invalid(`${location} is invalid`);
}
function optionalDefinitionStatus(value, location) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    if (value === "has_synthesis" ||
        value === "placeholder" ||
        value === "deleted" ||
        value === "stale") {
        return value;
    }
    return invalid(`${location} is invalid`);
}
function relation(value, location) {
    if (value === "broader_than" ||
        value === "related_to" ||
        value === "overlaps_with" ||
        value === "contrasts_with") {
        return value;
    }
    return invalid(`${location} is invalid`);
}
function edgeStatus(value, location) {
    if (value === "suggested" ||
        value === "confirmed" ||
        value === "rejected" ||
        value === "stale" ||
        value === "deleted") {
        return value;
    }
    return invalid(`${location} is invalid`);
}
function rebuildNode(input, index, bounds) {
    const row = objectValue(input, `nodes[${index}]`);
    if (typeof row.isRoot !== "boolean") {
        invalid(`nodes[${index}].isRoot must be boolean`);
    }
    const rebuilt = {
        topicId: requiredString(row.topicId, `nodes[${index}].topicId`, bounds),
        isRoot: row.isRoot,
    };
    const level = optionalLevel(row.level, `nodes[${index}].level`);
    const definitionStatus = optionalDefinitionStatus(row.definitionStatus, `nodes[${index}].definitionStatus`);
    if (level) {
        rebuilt.level = level;
    }
    if (definitionStatus) {
        rebuilt.definitionStatus = definitionStatus;
    }
    return rebuilt;
}
function rebuildEdge(input, index, bounds) {
    const row = objectValue(input, `edges[${index}]`);
    return {
        edgeId: requiredString(row.edgeId, `edges[${index}].edgeId`, bounds),
        sourceTopicId: requiredString(row.sourceTopicId, `edges[${index}].sourceTopicId`, bounds),
        targetTopicId: requiredString(row.targetTopicId, `edges[${index}].targetTopicId`, bounds),
        relation: relation(row.relation, `edges[${index}].relation`),
        status: edgeStatus(row.status, `edges[${index}].status`),
    };
}
function uniqueIds(rows, idOf, location) {
    const seen = new Set();
    for (const row of rows) {
        const id = idOf(row);
        if (seen.has(id)) {
            invalid(`${location} contains duplicate identifiers`);
        }
        seen.add(id);
    }
}
function rebuildStringResult(value, location, bounds) {
    const rows = arrayValue(value, location);
    if (rows.length > bounds.nodeMax) {
        invalid(`${location} exceeds its collection bound`);
    }
    const rebuilt = rows.map((entry, index) => requiredString(entry, `${location}[${index}]`, bounds));
    if (new Set(rebuilt).size !== rebuilt.length) {
        invalid(`${location} contains duplicate identifiers`);
    }
    const sorted = [...rebuilt].sort(compareSynthesisContractStrings);
    if (JSON.stringify(rebuilt) !== JSON.stringify(sorted)) {
        invalid(`${location} must be deterministically sorted`);
    }
    return rebuilt;
}
export function rebuildSynthesisTopicGraphIndexRequest(input, bounds = {}) {
    assertJsonSafe(input, "request");
    const resolved = resolveBounds(bounds);
    const row = objectValue(input, "request");
    if (row.contractVersion !== SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION ||
        row.algorithmVersion !== SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION) {
        invalid("index request version is invalid");
    }
    const rawNodes = arrayValue(row.nodes, "nodes");
    const rawEdges = arrayValue(row.edges, "edges");
    if (rawNodes.length > resolved.nodeMax) {
        invalid("nodes exceeds its collection bound");
    }
    if (rawEdges.length > resolved.edgeMax) {
        invalid("edges exceeds its collection bound");
    }
    const nodes = rawNodes
        .map((entry, index) => rebuildNode(entry, index, resolved))
        .sort((left, right) => compareSynthesisContractStrings(left.topicId, right.topicId));
    const edges = rawEdges
        .map((entry, index) => rebuildEdge(entry, index, resolved))
        .sort((left, right) => compareSynthesisContractStrings(left.edgeId, right.edgeId));
    uniqueIds(nodes, (entry) => entry.topicId, "nodes");
    uniqueIds(edges, (entry) => entry.edgeId, "edges");
    return {
        contractVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION,
        algorithmVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION,
        sourceManifestHash: requiredString(row.sourceManifestHash, "sourceManifestHash", resolved),
        rebuiltAt: requiredString(row.rebuiltAt, "rebuiltAt", resolved),
        nodes,
        edges,
    };
}
function checkpoint(options, phase, processedCount, totalCount, force = false) {
    const interval = Math.max(1, Math.floor(options.checkpointInterval ??
        SYNTHESIS_TOPIC_GRAPH_INDEX_CHECKPOINT_INTERVAL));
    if (force || processedCount % interval === 0) {
        options.checkpoint?.({ phase, processedCount, totalCount });
    }
}
function computeIndex(request, options) {
    const totalCount = request.nodes.length + request.edges.length;
    let processedCount = 0;
    checkpoint(options, "start", processedCount, totalCount, true);
    for (const node of request.nodes) {
        void node;
        processedCount += 1;
        checkpoint(options, "nodes", processedCount, totalCount);
    }
    const parented = new Set();
    for (const edge of request.edges) {
        processedCount += 1;
        checkpoint(options, "edges", processedCount, totalCount);
        if (edge.relation === "broader_than" && edge.status !== "rejected") {
            parented.add(edge.targetTopicId);
        }
    }
    const roots = request.nodes
        .filter((node) => node.isRoot || node.level === "top")
        .map((node) => node.topicId)
        .sort(compareSynthesisContractStrings);
    checkpoint(options, "roots", processedCount, totalCount, true);
    const unplaced = request.nodes
        .filter((node) => !node.isRoot &&
        node.level !== "top" &&
        node.definitionStatus !== "deleted" &&
        !parented.has(node.topicId))
        .map((node) => node.topicId)
        .sort(compareSynthesisContractStrings);
    checkpoint(options, "unplaced", processedCount, totalCount, true);
    checkpoint(options, "complete", totalCount, totalCount, true);
    return {
        contractVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION,
        algorithmVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION,
        schemaVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_SCHEMA_VERSION,
        sourceManifestHash: request.sourceManifestHash,
        rebuiltAt: request.rebuiltAt,
        roots,
        unplaced,
    };
}
export function rebuildSynthesisTopicGraphIndexResult(input, requestInput, bounds = {}) {
    assertJsonSafe(input, "result");
    const rebuilt = rebuildSynthesisTopicGraphIndexResultPayload(input, bounds);
    const request = rebuildSynthesisTopicGraphIndexRequest(requestInput, bounds);
    if (JSON.stringify(rebuilt) !== JSON.stringify(computeIndex(request, {}))) {
        invalid("index result does not match the request");
    }
    return rebuilt;
}
export function rebuildSynthesisTopicGraphIndexResultPayload(input, bounds = {}) {
    const resolved = resolveBounds(bounds);
    const row = objectValue(input, "result");
    if (row.contractVersion !== SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION ||
        row.algorithmVersion !== SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION ||
        row.schemaVersion !== SYNTHESIS_TOPIC_GRAPH_INDEX_SCHEMA_VERSION) {
        invalid("index result version is invalid");
    }
    return {
        contractVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_CONTRACT_VERSION,
        algorithmVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_ALGORITHM_VERSION,
        schemaVersion: SYNTHESIS_TOPIC_GRAPH_INDEX_SCHEMA_VERSION,
        sourceManifestHash: requiredString(row.sourceManifestHash, "sourceManifestHash", resolved),
        rebuiltAt: requiredString(row.rebuiltAt, "rebuiltAt", resolved),
        roots: rebuildStringResult(row.roots, "roots", resolved),
        unplaced: rebuildStringResult(row.unplaced, "unplaced", resolved),
    };
}
export function createInProcessSynthesisTopicGraphIndexEngine(options = {}) {
    return {
        async buildIndex(request) {
            const canonical = rebuildSynthesisTopicGraphIndexRequest(request);
            return computeIndex(canonical, options);
        },
    };
}

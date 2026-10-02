import { compareSynthesisEngineStrings } from "./canonicalJson.ts";
export const SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION = "synthesis-citation-graph-build.v1";
export const SYNTHESIS_CITATION_GRAPH_BUILD_SOURCE_MAX = 25_000;
export const SYNTHESIS_CITATION_GRAPH_BUILD_REFERENCE_MAX = 1_250_000;
export const SYNTHESIS_CITATION_GRAPH_BUILD_TARGET_MAX = 750_000;
const IDENTIFIER_MAX = 512;
const TEXT_MAX = 4096;
const ROLE_MAX = 256;
const LIST_MAX = 256;
export class SynthesisCitationGraphBuildContractError extends Error {
    code = "invalid_request";
    constructor(message) {
        super(message);
        this.name = "SynthesisCitationGraphBuildContractError";
    }
}
function invalid(message) {
    throw new SynthesisCitationGraphBuildContractError(message);
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
function jsonObject(value, location) {
    assertJsonSafe(value, location);
    if (!isPlainObject(value)) {
        return invalid(`${location} must be an object`);
    }
    return value;
}
function jsonArray(value, location) {
    if (!Array.isArray(value)) {
        return invalid(`${location} must be an array`);
    }
    return value;
}
function hasControlCharacter(value) {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        if (code <= 0x1f || code === 0x7f) {
            return true;
        }
    }
    return false;
}
function requiredString(value, location, max = TEXT_MAX) {
    if (typeof value !== "string") {
        return invalid(`${location} must be a string`);
    }
    const normalized = value.trim();
    if (!normalized ||
        normalized !== value ||
        normalized.length > max ||
        hasControlCharacter(normalized)) {
        return invalid(`${location} is invalid`);
    }
    return normalized;
}
function optionalString(value, location) {
    if (value === undefined) {
        return undefined;
    }
    return requiredString(value, location);
}
function positiveInteger(value, location) {
    if (!Number.isInteger(value) || Number(value) <= 0) {
        return invalid(`${location} must be a positive integer`);
    }
    return Number(value);
}
function finitePositive(value, location) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return invalid(`${location} must be finite and positive`);
    }
    return value;
}
function nonNegativeInteger(value, location) {
    if (!Number.isInteger(value) || Number(value) < 0) {
        return invalid(`${location} must be a non-negative integer`);
    }
    return Number(value);
}
function stringList(value, location, options = {}) {
    const rows = jsonArray(value, location);
    if (rows.length > (options.max ?? LIST_MAX)) {
        return invalid(`${location} exceeds its limit`);
    }
    const rebuilt = rows.map((entry, index) => requiredString(entry, `${location}[${index}]`, ROLE_MAX));
    if (options.unique && new Set(rebuilt).size !== rebuilt.length) {
        return invalid(`${location} must contain unique values`);
    }
    return options.sort ? [...rebuilt].sort() : rebuilt;
}
function targetKind(value, location) {
    if (value === "library_paper" ||
        value === "external_reference" ||
        value === "unresolved_reference") {
        return value;
    }
    return invalid(`${location} is invalid`);
}
function boundsWithDefaults(input = {}) {
    const sourceMax = input.sourceMax === undefined
        ? SYNTHESIS_CITATION_GRAPH_BUILD_SOURCE_MAX
        : positiveInteger(input.sourceMax, "bounds.sourceMax");
    const referenceMax = input.referenceMax === undefined
        ? SYNTHESIS_CITATION_GRAPH_BUILD_REFERENCE_MAX
        : positiveInteger(input.referenceMax, "bounds.referenceMax");
    const targetMax = input.targetMax === undefined
        ? SYNTHESIS_CITATION_GRAPH_BUILD_TARGET_MAX
        : Math.max(0, Number(input.targetMax));
    if (!Number.isInteger(targetMax) || targetMax < 0) {
        return invalid("bounds.targetMax must be a non-negative integer");
    }
    return { sourceMax, referenceMax, targetMax };
}
function rebuildScope(value) {
    const object = jsonObject(value, "scope");
    const kind = object.kind;
    if (kind !== "full" && kind !== "source_slice") {
        return invalid("scope.kind is invalid");
    }
    const sourceIds = stringList(object.sourceIds, "scope.sourceIds", {
        max: SYNTHESIS_CITATION_GRAPH_BUILD_SOURCE_MAX,
        unique: true,
        sort: true,
    });
    return { kind, sourceIds };
}
function rebuildLibraryNode(value, location) {
    const object = jsonObject(value, location);
    const node = {
        nodeId: requiredString(object.nodeId, `${location}.nodeId`, IDENTIFIER_MAX),
        authors: stringList(object.authors ?? [], `${location}.authors`),
        aliases: stringList(object.aliases ?? [], `${location}.aliases`, {
            unique: true,
            sort: true,
        }),
    };
    const title = optionalString(object.title, `${location}.title`);
    const year = optionalString(object.year, `${location}.year`);
    if (title !== undefined) {
        node.title = title;
    }
    if (year !== undefined) {
        node.year = year;
    }
    return node;
}
function rebuildReference(value, location) {
    const object = jsonObject(value, location);
    const reference = {
        referenceId: requiredString(object.referenceId, `${location}.referenceId`, IDENTIFIER_MAX),
        edgeId: requiredString(object.edgeId, `${location}.edgeId`, IDENTIFIER_MAX),
        sourceId: requiredString(object.sourceId, `${location}.sourceId`, IDENTIFIER_MAX),
        targetId: requiredString(object.targetId, `${location}.targetId`, IDENTIFIER_MAX),
        targetKind: targetKind(object.targetKind, `${location}.targetKind`),
        targetAuthors: stringList(object.targetAuthors ?? [], `${location}.targetAuthors`),
        targetAliases: stringList(object.targetAliases ?? [], `${location}.targetAliases`, { unique: true, sort: true }),
        roles: stringList(object.roles ?? [], `${location}.roles`),
        weight: finitePositive(object.weight, `${location}.weight`),
    };
    const sourceRef = optionalString(object.sourceRef, `${location}.sourceRef`);
    const targetTitle = optionalString(object.targetTitle, `${location}.targetTitle`);
    const targetYear = optionalString(object.targetYear, `${location}.targetYear`);
    if (sourceRef !== undefined) {
        reference.sourceRef = sourceRef;
    }
    if (targetTitle !== undefined) {
        reference.targetTitle = targetTitle;
    }
    if (targetYear !== undefined) {
        reference.targetYear = targetYear;
    }
    return reference;
}
export function rebuildSynthesisCitationGraphBuildScope(value) {
    return rebuildScope(value);
}
export function rebuildSynthesisCitationGraphBuildRolePriority(value) {
    return stringList(value ?? [], "rolePriority", { unique: true });
}
export function rebuildSynthesisCitationGraphBuildLibraryNodePage(value) {
    return jsonArray(value, "libraryNodes").map((entry, index) => rebuildLibraryNode(entry, `libraryNodes[${index}]`));
}
export function rebuildSynthesisCitationGraphBuildReferencePage(value) {
    return jsonArray(value, "references").map((entry, index) => rebuildReference(entry, `references[${index}]`));
}
function rebuildBuildNode(value, location) {
    const object = jsonObject(value, location);
    const node = {
        nodeId: requiredString(object.nodeId, `${location}.nodeId`, IDENTIFIER_MAX),
        kind: targetKind(object.kind, `${location}.kind`),
        authors: stringList(object.authors ?? [], `${location}.authors`),
        aliases: stringList(object.aliases ?? [], `${location}.aliases`, {
            unique: true,
            sort: true,
        }),
    };
    const title = optionalString(object.title, `${location}.title`);
    const year = optionalString(object.year, `${location}.year`);
    if (title !== undefined) {
        node.title = title;
    }
    if (year !== undefined) {
        node.year = year;
    }
    return node;
}
function rebuildResolvedEdge(value, location) {
    const object = jsonObject(value, location);
    if (object.status !== "accepted" && object.status !== "unbound") {
        return invalid(`${location}.status is invalid`);
    }
    return {
        edgeId: requiredString(object.edgeId, `${location}.edgeId`, IDENTIFIER_MAX),
        referenceId: requiredString(object.referenceId, `${location}.referenceId`, IDENTIFIER_MAX),
        sourceId: requiredString(object.sourceId, `${location}.sourceId`, IDENTIFIER_MAX),
        targetId: requiredString(object.targetId, `${location}.targetId`, IDENTIFIER_MAX),
        status: object.status,
        roles: stringList(object.roles ?? [], `${location}.roles`),
        weight: finitePositive(object.weight, `${location}.weight`),
    };
}
function rebuildRoleEvidence(value, location) {
    const object = jsonObject(value, location);
    return {
        role: requiredString(object.role, `${location}.role`, ROLE_MAX),
        count: positiveInteger(object.count, `${location}.count`),
    };
}
function rebuildAggregateEdge(value, location) {
    const object = jsonObject(value, location);
    return {
        sourceId: requiredString(object.sourceId, `${location}.sourceId`, IDENTIFIER_MAX),
        targetId: requiredString(object.targetId, `${location}.targetId`, IDENTIFIER_MAX),
        mentionCount: positiveInteger(object.mentionCount, `${location}.mentionCount`),
        primaryRole: requiredString(object.primaryRole, `${location}.primaryRole`, ROLE_MAX),
        auxRoles: jsonArray(object.auxRoles ?? [], `${location}.auxRoles`).map((entry, index) => rebuildRoleEvidence(entry, `${location}.auxRoles[${index}]`)),
        roleEvidence: jsonArray(object.roleEvidence ?? [], `${location}.roleEvidence`).map((entry, index) => rebuildRoleEvidence(entry, `${location}.roleEvidence[${index}]`)),
        sourceRefs: stringList(object.sourceRefs ?? [], `${location}.sourceRefs`, {
            unique: true,
            sort: true,
        }),
    };
}
function rebuildOwnership(value, location) {
    const object = jsonObject(value, location);
    if (object.status !== "accepted" && object.status !== "unbound") {
        return invalid(`${location}.status is invalid`);
    }
    return {
        sourceId: requiredString(object.sourceId, `${location}.sourceId`, IDENTIFIER_MAX),
        edgeId: requiredString(object.edgeId, `${location}.edgeId`, IDENTIFIER_MAX),
        referenceId: requiredString(object.referenceId, `${location}.referenceId`, IDENTIFIER_MAX),
        targetId: requiredString(object.targetId, `${location}.targetId`, IDENTIFIER_MAX),
        status: object.status,
    };
}
function rebuildLightMetric(value, location) {
    const object = jsonObject(value, location);
    const ambiguousOutgoingCount = nonNegativeInteger(object.ambiguousOutgoingCount, `${location}.ambiguousOutgoingCount`);
    if (ambiguousOutgoingCount !== 0) {
        return invalid(`${location}.ambiguousOutgoingCount must be zero`);
    }
    return {
        nodeId: requiredString(object.nodeId, `${location}.nodeId`, IDENTIFIER_MAX),
        outgoingCount: nonNegativeInteger(object.outgoingCount, `${location}.outgoingCount`),
        incomingCount: nonNegativeInteger(object.incomingCount, `${location}.incomingCount`),
        localDegree: nonNegativeInteger(object.localDegree, `${location}.localDegree`),
        matchedOutgoingCount: nonNegativeInteger(object.matchedOutgoingCount, `${location}.matchedOutgoingCount`),
        unresolvedOutgoingCount: nonNegativeInteger(object.unresolvedOutgoingCount, `${location}.unresolvedOutgoingCount`),
        ambiguousOutgoingCount: 0,
    };
}
export function rebuildSynthesisCitationGraphBuildNodePage(value) {
    return jsonArray(value, "nodes").map((entry, index) => rebuildBuildNode(entry, `nodes[${index}]`));
}
export function rebuildSynthesisCitationGraphBuildResolvedEdgePage(value) {
    return jsonArray(value, "resolvedEdges").map((entry, index) => rebuildResolvedEdge(entry, `resolvedEdges[${index}]`));
}
export function rebuildSynthesisCitationGraphBuildAggregateEdgePage(value) {
    return jsonArray(value, "aggregateEdges").map((entry, index) => rebuildAggregateEdge(entry, `aggregateEdges[${index}]`));
}
export function rebuildSynthesisCitationGraphBuildOwnershipPage(value, location = "sourceOwnership") {
    return jsonArray(value, location).map((entry, index) => rebuildOwnership(entry, `${location}[${index}]`));
}
export function rebuildSynthesisCitationGraphBuildLightMetricPage(value) {
    return jsonArray(value, "lightMetrics").map((entry, index) => rebuildLightMetric(entry, `lightMetrics[${index}]`));
}
export function rebuildSynthesisCitationGraphBuildDiagnostics(value) {
    const object = jsonObject(value, "diagnostics");
    const nodeCounts = jsonObject(object.nodeCounts, "diagnostics.nodeCounts");
    return {
        nodeCounts: {
            library_paper: nonNegativeInteger(nodeCounts.library_paper, "diagnostics.nodeCounts.library_paper"),
            external_reference: nonNegativeInteger(nodeCounts.external_reference, "diagnostics.nodeCounts.external_reference"),
            unresolved_reference: nonNegativeInteger(nodeCounts.unresolved_reference, "diagnostics.nodeCounts.unresolved_reference"),
        },
        referenceCount: nonNegativeInteger(object.referenceCount, "diagnostics.referenceCount"),
        aggregateEdgeCount: nonNegativeInteger(object.aggregateEdgeCount, "diagnostics.aggregateEdgeCount"),
    };
}
export function rebuildSynthesisCitationGraphBuildRequest(value, boundsInput = {}) {
    const bounds = boundsWithDefaults(boundsInput);
    const object = jsonObject(value, "request");
    if (object.contractVersion !== SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION) {
        return invalid("contractVersion is invalid");
    }
    const scope = rebuildScope(object.scope);
    const rolePriority = stringList(object.rolePriority ?? [], "rolePriority", {
        unique: true,
    });
    const libraryNodes = jsonArray(object.libraryNodes, "libraryNodes").map((entry, index) => rebuildLibraryNode(entry, `libraryNodes[${index}]`));
    if (libraryNodes.length > bounds.sourceMax) {
        return invalid("libraryNodes exceeds its limit");
    }
    libraryNodes.sort((left, right) => compareSynthesisEngineStrings(left.nodeId, right.nodeId));
    const libraryIds = new Set();
    for (const node of libraryNodes) {
        if (libraryIds.has(node.nodeId)) {
            return invalid("libraryNodes contains duplicate nodeId");
        }
        libraryIds.add(node.nodeId);
    }
    for (const sourceId of scope.sourceIds) {
        if (!libraryIds.has(sourceId)) {
            return invalid("scope references a missing source node");
        }
    }
    const references = jsonArray(object.references, "references").map((entry, index) => rebuildReference(entry, `references[${index}]`));
    if (references.length > bounds.referenceMax) {
        return invalid("references exceeds its limit");
    }
    references.sort((left, right) => compareSynthesisEngineStrings(left.referenceId, right.referenceId));
    const referenceIds = new Set();
    const edgeIds = new Set();
    const targetIds = new Set();
    for (const reference of references) {
        if (referenceIds.has(reference.referenceId)) {
            return invalid("references contains duplicate referenceId");
        }
        if (edgeIds.has(reference.edgeId)) {
            return invalid("references contains duplicate edgeId");
        }
        if (!libraryIds.has(reference.sourceId)) {
            return invalid("reference source is missing");
        }
        if (reference.targetKind === "library_paper" &&
            !libraryIds.has(reference.targetId)) {
            return invalid("library reference target is missing");
        }
        referenceIds.add(reference.referenceId);
        edgeIds.add(reference.edgeId);
        if (reference.targetKind !== "library_paper") {
            targetIds.add(reference.targetId);
        }
    }
    if (targetIds.size > bounds.targetMax) {
        return invalid("external targets exceed their limit");
    }
    return {
        contractVersion: SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
        scope,
        rolePriority,
        libraryNodes,
        references,
    };
}
function mergeNodeMetadata(current, incoming) {
    if (!current.title && incoming.title) {
        current.title = incoming.title;
    }
    if (!current.year && incoming.year) {
        current.year = incoming.year;
    }
    if (!current.authors.length && incoming.authors.length) {
        current.authors = [...incoming.authors];
    }
    current.aliases = Array.from(new Set([...current.aliases, ...incoming.aliases])).sort();
}
function buildNode(input) {
    const node = {
        nodeId: input.nodeId,
        kind: input.kind,
        authors: [...input.authors],
        aliases: [...input.aliases],
    };
    if (input.title) {
        node.title = input.title;
    }
    if (input.year) {
        node.year = input.year;
    }
    return node;
}
function selectPrimaryRole(counts, rolePriority) {
    if (!counts.size) {
        return "unspecified";
    }
    const priority = new Map(rolePriority.map((role, index) => [role, index]));
    return [...counts.entries()].sort((left, right) => {
        const countOrder = right[1] - left[1];
        if (countOrder) {
            return countOrder;
        }
        const leftPriority = priority.get(left[0]) ?? Number.MAX_SAFE_INTEGER;
        const rightPriority = priority.get(right[0]) ?? Number.MAX_SAFE_INTEGER;
        return (leftPriority - rightPriority ||
            compareSynthesisEngineStrings(left[0], right[0]));
    })[0][0];
}
export function aggregateSynthesisCitationGraphBuildEdges(evidence, rolePriority) {
    const aggregate = new Map();
    for (const edge of evidence) {
        const aggregateKey = `${edge.sourceId}\0${edge.targetId}`;
        const entry = aggregate.get(aggregateKey) || {
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            mentionCount: 0,
            roleCounts: new Map(),
            sourceRefs: [],
        };
        entry.mentionCount += edge.mentionCount;
        entry.sourceRefs.push(...edge.sourceRefs);
        for (const role of edge.roleEvidence) {
            entry.roleCounts.set(role.role, (entry.roleCounts.get(role.role) || 0) + role.count);
        }
        aggregate.set(aggregateKey, entry);
    }
    return [...aggregate.values()]
        .map((entry) => {
        const primaryRole = selectPrimaryRole(entry.roleCounts, rolePriority);
        const roleEvidence = [...entry.roleCounts.entries()]
            .map(([role, count]) => ({ role, count }))
            .sort((left, right) => right.count - left.count ||
            compareSynthesisEngineStrings(left.role, right.role));
        return {
            sourceId: entry.sourceId,
            targetId: entry.targetId,
            mentionCount: entry.mentionCount,
            primaryRole,
            auxRoles: roleEvidence
                .filter((entry) => entry.role !== primaryRole)
                .map((entry) => ({ ...entry })),
            roleEvidence,
            sourceRefs: entry.sourceRefs,
        };
    })
        .sort((left, right) => compareSynthesisEngineStrings(left.sourceId, right.sourceId) ||
        compareSynthesisEngineStrings(left.targetId, right.targetId));
}
export function computeSynthesisCitationGraphBuild(requestInput, options = {}) {
    const request = rebuildSynthesisCitationGraphBuildRequest(requestInput, options.bounds);
    return computeRebuiltSynthesisCitationGraphBuild(request, options);
}
export function computeRebuiltSynthesisCitationGraphBuild(request, options = {}) {
    const checkpointInterval = positiveInteger(options.checkpointInterval ?? 1024, "checkpointInterval");
    options.checkpoint?.({
        phase: "start",
        processed: 0,
        total: request.references.length,
    });
    const nodes = new Map();
    for (const node of request.libraryNodes) {
        nodes.set(node.nodeId, buildNode({
            ...node,
            kind: "library_paper",
        }));
    }
    const resolvedEdges = [];
    const aggregateEvidence = [];
    for (const [index, reference] of request.references.entries()) {
        if (index % checkpointInterval === 0) {
            options.checkpoint?.({
                phase: "references",
                processed: index,
                total: request.references.length,
            });
        }
        const existingTarget = nodes.get(reference.targetId);
        if (existingTarget) {
            mergeNodeMetadata(existingTarget, {
                title: reference.targetTitle,
                year: reference.targetYear,
                authors: reference.targetAuthors,
                aliases: reference.targetAliases,
            });
        }
        else {
            nodes.set(reference.targetId, buildNode({
                nodeId: reference.targetId,
                kind: reference.targetKind,
                title: reference.targetTitle,
                year: reference.targetYear,
                authors: reference.targetAuthors,
                aliases: reference.targetAliases,
            }));
        }
        const status = reference.targetKind === "library_paper" ? "accepted" : "unbound";
        resolvedEdges.push({
            edgeId: reference.edgeId,
            referenceId: reference.referenceId,
            sourceId: reference.sourceId,
            targetId: reference.targetId,
            status,
            roles: [...reference.roles],
            weight: reference.weight,
        });
        aggregateEvidence.push({
            sourceId: reference.sourceId,
            targetId: reference.targetId,
            mentionCount: reference.weight,
            roleEvidence: reference.roles.map((role) => ({ role, count: 1 })),
            sourceRefs: [reference.sourceRef || reference.referenceId],
        });
    }
    options.checkpoint?.({
        phase: "aggregate",
        processed: request.references.length,
        total: request.references.length,
    });
    const aggregateEdges = aggregateSynthesisCitationGraphBuildEdges(aggregateEvidence, request.rolePriority);
    resolvedEdges.sort((left, right) => compareSynthesisEngineStrings(left.referenceId, right.referenceId));
    const sourceOwnership = resolvedEdges.map((edge) => ({
        sourceId: edge.sourceId,
        edgeId: edge.edgeId,
        referenceId: edge.referenceId,
        targetId: edge.targetId,
        status: edge.status,
    }));
    const incomingGroups = sourceOwnership
        .map((entry) => ({ ...entry }))
        .sort((left, right) => compareSynthesisEngineStrings(left.targetId, right.targetId) ||
        compareSynthesisEngineStrings(left.sourceId, right.sourceId) ||
        compareSynthesisEngineStrings(left.edgeId, right.edgeId));
    const outgoingCounts = new Map();
    const incomingCounts = new Map();
    const matchedCounts = new Map();
    const unresolvedCounts = new Map();
    for (const edge of resolvedEdges) {
        outgoingCounts.set(edge.sourceId, (outgoingCounts.get(edge.sourceId) || 0) + 1);
        incomingCounts.set(edge.targetId, (incomingCounts.get(edge.targetId) || 0) + 1);
        const counts = edge.status === "accepted" ? matchedCounts : unresolvedCounts;
        counts.set(edge.sourceId, (counts.get(edge.sourceId) || 0) + 1);
    }
    const nodeList = [...nodes.values()].sort((left, right) => compareSynthesisEngineStrings(left.nodeId, right.nodeId));
    const lightMetrics = nodeList.map((node) => {
        const outgoingCount = outgoingCounts.get(node.nodeId) || 0;
        const incomingCount = incomingCounts.get(node.nodeId) || 0;
        return {
            nodeId: node.nodeId,
            outgoingCount,
            incomingCount,
            localDegree: outgoingCount + incomingCount,
            matchedOutgoingCount: matchedCounts.get(node.nodeId) || 0,
            unresolvedOutgoingCount: unresolvedCounts.get(node.nodeId) || 0,
            ambiguousOutgoingCount: 0,
        };
    });
    const result = {
        contractVersion: request.contractVersion,
        scope: request.scope,
        nodes: nodeList,
        resolvedEdges,
        aggregateEdges,
        sourceOwnership,
        incomingGroups,
        lightMetrics,
        diagnostics: {
            nodeCounts: {
                library_paper: nodeList.filter((node) => node.kind === "library_paper")
                    .length,
                external_reference: nodeList.filter((node) => node.kind === "external_reference").length,
                unresolved_reference: nodeList.filter((node) => node.kind === "unresolved_reference").length,
            },
            referenceCount: resolvedEdges.length,
            aggregateEdgeCount: aggregateEdges.length,
        },
    };
    options.checkpoint?.({
        phase: "complete",
        processed: request.references.length,
        total: request.references.length,
    });
    return result;
}
function sameScope(left, right) {
    return (left.kind === right.kind &&
        left.sourceIds.length === right.sourceIds.length &&
        left.sourceIds.every((entry, index) => entry === right.sourceIds[index]));
}
function resultArrayKey(value) {
    if (!isPlainObject(value)) {
        return "";
    }
    if (typeof value.nodeId === "string") {
        return `node:${value.nodeId}`;
    }
    if (typeof value.edgeId === "string") {
        return `edge:${value.edgeId}`;
    }
    if (typeof value.sourceId === "string" &&
        typeof value.targetId === "string") {
        return `aggregate:${value.sourceId}\0${value.targetId}`;
    }
    if (typeof value.role === "string") {
        return `role:${value.role}`;
    }
    return "";
}
function canonicalizeResultValue(value, expected, location) {
    if (Array.isArray(expected)) {
        const input = jsonArray(value, location);
        if (input.length !== expected.length) {
            return invalid(`${location} has an invalid length`);
        }
        if (expected.length > 0 &&
            expected.every((entry) => isPlainObject(entry) && Boolean(resultArrayKey(entry)))) {
            const inputByKey = new Map(input.map((entry) => [resultArrayKey(entry), entry]));
            if (inputByKey.size !== input.length) {
                return invalid(`${location} contains duplicate rows`);
            }
            return expected.map((entry, index) => {
                const key = resultArrayKey(entry);
                if (!inputByKey.has(key)) {
                    return invalid(`${location} is missing ${key}`);
                }
                return canonicalizeResultValue(inputByKey.get(key), entry, `${location}[${index}]`);
            });
        }
        return expected.map((entry, index) => canonicalizeResultValue(input[index], entry, `${location}[${index}]`));
    }
    if (isPlainObject(expected)) {
        const input = jsonObject(value, location);
        return Object.fromEntries(Object.entries(expected).map(([key, entry]) => {
            if (!(key in input)) {
                return invalid(`${location}.${key} is missing`);
            }
            return [
                key,
                canonicalizeResultValue(input[key], entry, `${location}.${key}`),
            ];
        }));
    }
    if (value !== expected) {
        return invalid(`${location} is invalid`);
    }
    return expected;
}
export function rebuildSynthesisCitationGraphBuildResult(value, requestInput) {
    const request = rebuildSynthesisCitationGraphBuildRequest(requestInput);
    const object = jsonObject(value, "result");
    if (object.contractVersion !== SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION) {
        return invalid("result.contractVersion is invalid");
    }
    const scope = rebuildScope(object.scope);
    if (!sameScope(scope, request.scope)) {
        return invalid("result.scope does not match request");
    }
    const result = {
        contractVersion: SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
        scope,
        nodes: rebuildSynthesisCitationGraphBuildNodePage(object.nodes),
        resolvedEdges: rebuildSynthesisCitationGraphBuildResolvedEdgePage(object.resolvedEdges),
        aggregateEdges: rebuildSynthesisCitationGraphBuildAggregateEdgePage(object.aggregateEdges),
        sourceOwnership: rebuildSynthesisCitationGraphBuildOwnershipPage(object.sourceOwnership),
        incomingGroups: rebuildSynthesisCitationGraphBuildOwnershipPage(object.incomingGroups, "incomingGroups"),
        lightMetrics: rebuildSynthesisCitationGraphBuildLightMetricPage(object.lightMetrics),
        diagnostics: rebuildSynthesisCitationGraphBuildDiagnostics(object.diagnostics),
    };
    result.nodes.sort((left, right) => compareSynthesisEngineStrings(left.nodeId, right.nodeId));
    result.resolvedEdges.sort((left, right) => compareSynthesisEngineStrings(left.referenceId, right.referenceId));
    result.aggregateEdges.sort((left, right) => compareSynthesisEngineStrings(left.sourceId, right.sourceId) ||
        compareSynthesisEngineStrings(left.targetId, right.targetId));
    result.sourceOwnership.sort((left, right) => compareSynthesisEngineStrings(left.referenceId, right.referenceId));
    result.incomingGroups.sort((left, right) => compareSynthesisEngineStrings(left.targetId, right.targetId) ||
        compareSynthesisEngineStrings(left.sourceId, right.sourceId) ||
        compareSynthesisEngineStrings(left.edgeId, right.edgeId));
    result.lightMetrics.sort((left, right) => compareSynthesisEngineStrings(left.nodeId, right.nodeId));
    const orderedUnique = (rows, key, location) => {
        for (let index = 0; index < rows.length; index += 1) {
            const current = key(rows[index]);
            if (index > 0 &&
                compareSynthesisEngineStrings(key(rows[index - 1]), current) >= 0) {
                return invalid(`${location} must be strictly ordered and unique`);
            }
        }
    };
    orderedUnique(result.nodes, (row) => row.nodeId, "result.nodes");
    orderedUnique(result.resolvedEdges, (row) => row.referenceId, "result.resolvedEdges");
    orderedUnique(result.aggregateEdges, (row) => `${row.sourceId}\0${row.targetId}`, "result.aggregateEdges");
    orderedUnique(result.sourceOwnership, (row) => row.referenceId, "result.sourceOwnership");
    orderedUnique(result.incomingGroups, (row) => `${row.targetId}\0${row.sourceId}\0${row.edgeId}`, "result.incomingGroups");
    orderedUnique(result.lightMetrics, (row) => row.nodeId, "result.lightMetrics");
    const expectedNodeIds = new Set(request.libraryNodes.map((row) => row.nodeId));
    for (const reference of request.references) {
        expectedNodeIds.add(reference.targetId);
    }
    const nodeById = new Map(result.nodes.map((row) => [row.nodeId, row]));
    if (nodeById.size !== expectedNodeIds.size ||
        [...expectedNodeIds].some((nodeId) => !nodeById.has(nodeId))) {
        return invalid("result.nodes do not cover the request node identities");
    }
    for (const libraryNode of request.libraryNodes) {
        if (nodeById.get(libraryNode.nodeId)?.kind !== "library_paper") {
            return invalid("result library node kind is invalid");
        }
    }
    const references = new Map(request.references.map((row) => [row.referenceId, row]));
    if (result.resolvedEdges.length !== references.size) {
        return invalid("result.resolvedEdges do not cover all references");
    }
    for (const edge of result.resolvedEdges) {
        const reference = references.get(edge.referenceId);
        if (!reference ||
            edge.edgeId !== reference.edgeId ||
            edge.sourceId !== reference.sourceId ||
            edge.targetId !== reference.targetId ||
            edge.status !==
                (reference.targetKind === "library_paper" ? "accepted" : "unbound") ||
            edge.weight !== reference.weight ||
            JSON.stringify(edge.roles) !== JSON.stringify(reference.roles) ||
            !nodeById.has(edge.sourceId) ||
            !nodeById.has(edge.targetId)) {
            return invalid("result.resolvedEdges violate request identity");
        }
    }
    const expectedOwnership = result.resolvedEdges.map((edge) => ({
        sourceId: edge.sourceId,
        edgeId: edge.edgeId,
        referenceId: edge.referenceId,
        targetId: edge.targetId,
        status: edge.status,
    }));
    const expectedIncoming = expectedOwnership
        .slice()
        .sort((left, right) => compareSynthesisEngineStrings(left.targetId, right.targetId) ||
        compareSynthesisEngineStrings(left.sourceId, right.sourceId) ||
        compareSynthesisEngineStrings(left.edgeId, right.edgeId));
    if (JSON.stringify(result.sourceOwnership) !==
        JSON.stringify(expectedOwnership) ||
        JSON.stringify(result.incomingGroups) !== JSON.stringify(expectedIncoming)) {
        return invalid("result ownership projections are inconsistent");
    }
    const aggregate = new Map();
    for (const reference of request.references) {
        const key = `${reference.sourceId}\0${reference.targetId}`;
        const row = aggregate.get(key) || {
            sourceId: reference.sourceId,
            targetId: reference.targetId,
            mentionCount: 0,
            roleCounts: new Map(),
            sourceRefs: [],
        };
        row.mentionCount += reference.weight;
        row.sourceRefs.push(reference.sourceRef || reference.referenceId);
        for (const role of reference.roles) {
            row.roleCounts.set(role, (row.roleCounts.get(role) || 0) + 1);
        }
        aggregate.set(key, row);
    }
    const expectedAggregates = [...aggregate.values()]
        .map((row) => {
        const primaryRole = selectPrimaryRole(row.roleCounts, request.rolePriority);
        const roleEvidence = [...row.roleCounts.entries()]
            .map(([role, count]) => ({ role, count }))
            .sort((left, right) => right.count - left.count ||
            compareSynthesisEngineStrings(left.role, right.role));
        return {
            sourceId: row.sourceId,
            targetId: row.targetId,
            mentionCount: row.mentionCount,
            primaryRole,
            auxRoles: roleEvidence.filter((entry) => entry.role !== primaryRole),
            roleEvidence,
            sourceRefs: row.sourceRefs,
        };
    })
        .sort((left, right) => compareSynthesisEngineStrings(left.sourceId, right.sourceId) ||
        compareSynthesisEngineStrings(left.targetId, right.targetId));
    if (JSON.stringify(result.aggregateEdges) !== JSON.stringify(expectedAggregates)) {
        return invalid("result aggregate edges are inconsistent");
    }
    const outgoing = new Map();
    const incoming = new Map();
    const matched = new Map();
    const unresolved = new Map();
    for (const edge of result.resolvedEdges) {
        outgoing.set(edge.sourceId, (outgoing.get(edge.sourceId) || 0) + 1);
        incoming.set(edge.targetId, (incoming.get(edge.targetId) || 0) + 1);
        const statusCounts = edge.status === "accepted" ? matched : unresolved;
        statusCounts.set(edge.sourceId, (statusCounts.get(edge.sourceId) || 0) + 1);
    }
    const expectedMetrics = result.nodes.map((node) => {
        const outgoingCount = outgoing.get(node.nodeId) || 0;
        const incomingCount = incoming.get(node.nodeId) || 0;
        return {
            nodeId: node.nodeId,
            outgoingCount,
            incomingCount,
            localDegree: outgoingCount + incomingCount,
            matchedOutgoingCount: matched.get(node.nodeId) || 0,
            unresolvedOutgoingCount: unresolved.get(node.nodeId) || 0,
            ambiguousOutgoingCount: 0,
        };
    });
    const expectedDiagnostics = {
        nodeCounts: {
            library_paper: result.nodes.filter((node) => node.kind === "library_paper").length,
            external_reference: result.nodes.filter((node) => node.kind === "external_reference").length,
            unresolved_reference: result.nodes.filter((node) => node.kind === "unresolved_reference").length,
        },
        referenceCount: result.resolvedEdges.length,
        aggregateEdgeCount: result.aggregateEdges.length,
    };
    if (JSON.stringify(result.lightMetrics) !== JSON.stringify(expectedMetrics) ||
        JSON.stringify(result.diagnostics) !== JSON.stringify(expectedDiagnostics)) {
        return invalid("result metrics or diagnostics are inconsistent");
    }
    return result;
}
export function createInProcessSynthesisCitationGraphBuildEngine(options = {}) {
    return {
        async compute(request) {
            return computeSynthesisCitationGraphBuild(request, options);
        },
    };
}

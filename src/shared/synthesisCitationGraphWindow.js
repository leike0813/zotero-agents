export const SYNTHESIS_CITATION_GRAPH_NODE_SOFT_LIMIT = 10_000;
export const SYNTHESIS_CITATION_GRAPH_EDGE_SOFT_LIMIT = 20_000;
export function createSynthesisCitationGraphWindow(options) {
    return {
        generation: options.generation,
        nodes: [],
        edges: [],
        hoverOnlyNodes: [],
        hoverOnlyEdges: [],
        hasMore: true,
        totalNodes: 0,
        totalEdges: 0,
        totalHoverNodes: 0,
        totalHoverEdges: 0,
        nodeSoftLimit: options.nodeSoftLimit ?? SYNTHESIS_CITATION_GRAPH_NODE_SOFT_LIMIT,
        edgeSoftLimit: options.edgeSoftLimit ?? SYNTHESIS_CITATION_GRAPH_EDGE_SOFT_LIMIT,
        status: "loading",
    };
}
function nodeId(node) {
    return node.id || node.node_id || "";
}
function edgeId(edge) {
    return edge.id || edge.edge_id || "";
}
function mergeById(current, patch, getId, mergeItem = (_current, next) => next) {
    const result = [...current];
    const indexes = new Map(result.map((item, index) => [getId(item), index]));
    let added = 0;
    for (const item of patch) {
        const id = getId(item);
        if (!id)
            continue;
        const index = indexes.get(id);
        if (index === undefined) {
            indexes.set(id, result.length);
            result.push(item);
            added += 1;
        }
        else {
            result[index] = mergeItem(result[index], item);
        }
    }
    return { items: result, added };
}
function mergeDefinedFields(current, patch) {
    const merged = { ...current };
    for (const [key, value] of Object.entries(patch)) {
        if (value !== undefined)
            merged[key] = value;
    }
    return merged;
}
function rejectMerge(window, reason) {
    return { accepted: false, reason, addedNodes: 0, addedEdges: 0, window };
}
function validatePatch(window, patch) {
    if (patch.generation !== window.generation)
        return "stale_generation";
    if ((window.graphHash && window.graphHash !== patch.graphHash) ||
        (window.querySignature && window.querySignature !== patch.querySignature)) {
        return "basis_mismatch";
    }
    if (!patch.graphHash || !patch.querySignature)
        return "invalid_patch";
    return undefined;
}
function mergePatch(window, patch, advancePage) {
    const invalid = validatePatch(window, patch);
    if (invalid)
        return rejectMerge(window, invalid);
    const nodes = mergeById(window.nodes, patch.nodes, nodeId, mergeDefinedFields);
    const edges = mergeById(window.edges, patch.edges, edgeId);
    const hoverNodes = mergeById(window.hoverOnlyNodes, patch.hoverOnlyNodes || [], nodeId, mergeDefinedFields);
    const hoverEdges = mergeById(window.hoverOnlyEdges, patch.hoverOnlyEdges || [], edgeId);
    const hasMore = advancePage ? Boolean(patch.hasMore) : window.hasMore;
    const atSoftLimit = hasMore &&
        (nodes.items.length + hoverNodes.items.length >= window.nodeSoftLimit ||
            edges.items.length + hoverEdges.items.length >= window.edgeSoftLimit);
    return {
        accepted: true,
        addedNodes: nodes.added + hoverNodes.added,
        addedEdges: edges.added + hoverEdges.added,
        window: {
            ...window,
            graphHash: patch.graphHash,
            querySignature: patch.querySignature,
            nodes: nodes.items,
            edges: edges.items,
            hoverOnlyNodes: hoverNodes.items,
            hoverOnlyEdges: hoverEdges.items,
            nextCursor: advancePage ? patch.nextCursor : window.nextCursor,
            hasMore,
            totalNodes: patch.totalNodes ?? window.totalNodes,
            totalEdges: patch.totalEdges ?? window.totalEdges,
            totalHoverNodes: patch.totalHoverNodes ?? window.totalHoverNodes,
            totalHoverEdges: patch.totalHoverEdges ?? window.totalHoverEdges,
            status: advancePage
                ? atSoftLimit
                    ? "paused"
                    : hasMore
                        ? "loading"
                        : "complete"
                : window.status,
            error: undefined,
        },
    };
}
export function mergeSynthesisCitationGraphPage(window, page) {
    return mergePatch(window, page, true);
}
export function mergeSynthesisCitationGraphSlice(window, slice) {
    return mergePatch(window, slice, false);
}
export function continueSynthesisCitationGraphWindow(window) {
    if (window.status !== "paused")
        return window;
    return {
        ...window,
        nodeSoftLimit: window.nodeSoftLimit + SYNTHESIS_CITATION_GRAPH_NODE_SOFT_LIMIT,
        edgeSoftLimit: window.edgeSoftLimit + SYNTHESIS_CITATION_GRAPH_EDGE_SOFT_LIMIT,
        status: "loading",
    };
}
export function failSynthesisCitationGraphWindow(window, code, reason) {
    return {
        ...window,
        status: "failed",
        error: { code, ...(reason ? { reason } : {}) },
    };
}
export function retrySynthesisCitationGraphWindow(window) {
    if (window.status !== "failed")
        return window;
    return { ...window, status: "loading", error: undefined };
}

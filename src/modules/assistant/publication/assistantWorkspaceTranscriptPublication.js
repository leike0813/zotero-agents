export const MAX_ASSISTANT_WORKSPACE_TRANSCRIPT_MUTATIONS = 512;
export const MAX_ASSISTANT_WORKSPACE_TRANSCRIPT_BYTES = 256 * 1024;
export function parseAssistantWorkspaceTranscriptPageRequest(value) {
    const source = asRecord(value);
    if (!source || !hasExactKeys(source, ["owner", "request"]))
        return null;
    const owner = asRecord(source.owner);
    const request = asRecord(source.request);
    if (!owner || !request || !hasExactKeys(request, ["cursor", "limit"])) {
        return null;
    }
    const ownerKey = String(owner.ownerKey || "").trim();
    let canonicalOwner;
    if (owner.source === "acp-chat") {
        if (!hasExactKeys(owner, [
            "source",
            "ownerKey",
            "backendId",
            "conversationId",
        ])) {
            return null;
        }
        const backendId = String(owner.backendId || "").trim();
        const conversationId = String(owner.conversationId || "").trim();
        if (!backendId ||
            !conversationId ||
            ownerKey !== `${backendId}\n${conversationId}`) {
            return null;
        }
        canonicalOwner = {
            source: "acp-chat",
            ownerKey,
            backendId,
            conversationId,
        };
    }
    else if (owner.source === "acp-skills") {
        if (!hasExactKeys(owner, ["source", "ownerKey", "requestId"]))
            return null;
        const requestId = String(owner.requestId || "").trim();
        if (!requestId || ownerKey !== requestId)
            return null;
        canonicalOwner = { source: "acp-skills", ownerKey, requestId };
    }
    else if (owner.source === "skillrunner") {
        if (!hasExactKeys(owner, ["source", "ownerKey", "requestId", "runKey"])) {
            return null;
        }
        const requestId = String(owner.requestId || "").trim() || null;
        const runKey = String(owner.runKey || "").trim();
        if (!runKey || ownerKey !== (requestId || runKey))
            return null;
        canonicalOwner = { source: "skillrunner", ownerKey, requestId, runKey };
    }
    else if (owner.source === "pi-conversations") {
        if (!hasExactKeys(owner, ["source", "ownerKey", "conversationId"])) {
            return null;
        }
        const conversationId = String(owner.conversationId || "").trim();
        if (!conversationId || ownerKey !== conversationId)
            return null;
        canonicalOwner = {
            source: "pi-conversations",
            ownerKey,
            conversationId,
        };
    }
    else if (owner.source === "pi-skill-runs") {
        if (!hasExactKeys(owner, ["source", "ownerKey", "requestId"])) {
            return null;
        }
        const requestId = String(owner.requestId || "").trim();
        if (!requestId || ownerKey !== requestId)
            return null;
        canonicalOwner = { source: "pi-skill-runs", ownerKey, requestId };
    }
    else {
        return null;
    }
    const cursor = request.cursor;
    const normalizedCursor = cursor === null
        ? null
        : Number.isFinite(Number(cursor))
            ? Math.max(0, Math.floor(Number(cursor)))
            : null;
    if (cursor !== null && normalizedCursor === null)
        return null;
    const limit = Math.floor(Number(request.limit));
    if (!Number.isFinite(limit) || limit <= 0)
        return null;
    return {
        owner: canonicalOwner,
        request: { cursor: normalizedCursor, limit },
    };
}
export class AssistantWorkspaceTranscriptProjection {
    states = new Map();
    registerSnapshot(owner, page) {
        this.states.set(ownerIdentity(owner), {
            held: [],
            visibleItemIds: new Set(page.items.map((item) => item.itemId)),
        });
    }
    record(owner, args) {
        return this.project(owner, args).mutations;
    }
    project(owner, args) {
        const state = this.state(owner);
        const cardinality = args.cardinality || inferMutationCardinality(args.mutation);
        if (args.visibility === "silent") {
            return { mutations: [], visibleItemCountDelta: 0 };
        }
        if (args.visibility === "boundary" &&
            args.boundary === "text-continuation") {
            state.held.push({
                boundary: args.boundary,
                mutation: cloneMutation(args.mutation),
                cardinality,
            });
            return { mutations: [], visibleItemCountDelta: 0 };
        }
        if (args.boundary === "soft-side-channel") {
            const itemId = mutationItemId(args.mutation);
            if (!itemId || !state.visibleItemIds.has(itemId)) {
                return { mutations: [], visibleItemCountDelta: 0 };
            }
            return {
                mutations: [cloneMutation(args.mutation)],
                visibleItemCountDelta: 0,
            };
        }
        const released = args.boundary === "hard-boundary"
            ? this.releaseProjected(owner)
            : { mutations: [], visibleItemCountDelta: 0 };
        const event = {
            boundary: args.boundary,
            mutation: cloneMutation(args.mutation),
            cardinality,
        };
        applyVisibility(state, event);
        return {
            mutations: [...released.mutations, event.mutation],
            visibleItemCountDelta: released.visibleItemCountDelta + cardinalityDelta(event.cardinality),
        };
    }
    release(owner) {
        return this.releaseProjected(owner).mutations;
    }
    releaseProjected(owner) {
        const state = this.state(owner);
        const released = state.held.map(cloneMutationEvent);
        state.held = [];
        for (const event of released)
            applyVisibility(state, event);
        return {
            mutations: released.map((event) => event.mutation),
            visibleItemCountDelta: released.reduce((total, event) => total + cardinalityDelta(event.cardinality), 0),
        };
    }
    clear(owner) {
        this.states.delete(ownerIdentity(owner));
    }
    state(owner) {
        const key = ownerIdentity(owner);
        let state = this.states.get(key);
        if (!state) {
            state = { held: [], visibleItemIds: new Set() };
            this.states.set(key, state);
        }
        return state;
    }
}
export class AssistantWorkspaceTranscriptAccumulator {
    mutations = [];
    byteLength = 0;
    overflowed = false;
    enqueue(mutations) {
        if (this.overflowed)
            return false;
        for (const mutation of mutations) {
            const before = this.mutations.length;
            enqueueMerged(this.mutations, mutation);
            this.byteLength +=
                before === this.mutations.length && mutation.op === "append_text"
                    ? utf8Bytes(mutation.text)
                    : utf8Bytes(JSON.stringify(mutation));
            if (this.mutations.length > MAX_ASSISTANT_WORKSPACE_TRANSCRIPT_MUTATIONS ||
                this.byteLength > MAX_ASSISTANT_WORKSPACE_TRANSCRIPT_BYTES) {
                this.mutations = [];
                this.byteLength = 0;
                this.overflowed = true;
                return false;
            }
        }
        return true;
    }
    get size() {
        return this.mutations.length;
    }
    get overflowedState() {
        return this.overflowed;
    }
    read() {
        return this.mutations.map(cloneMutation);
    }
    drain() {
        const result = this.read();
        this.mutations = [];
        this.byteLength = 0;
        this.overflowed = false;
        return result;
    }
}
export function transcriptPageMetadata(page) {
    const { items: _items, ...metadata } = page;
    return metadata;
}
function ownerIdentity(owner) {
    return `${owner.source}\n${owner.ownerKey}`;
}
function mutationItemId(mutation) {
    return mutation.op === "upsert_item" ? mutation.item.itemId : mutation.itemId;
}
function applyVisibility(state, event) {
    const mutation = event.mutation;
    const itemId = mutationItemId(mutation);
    if (event.cardinality === "delete")
        state.visibleItemIds.delete(itemId);
    else if (event.cardinality === "insert" && itemId) {
        state.visibleItemIds.add(itemId);
    }
}
function cardinalityDelta(cardinality) {
    return cardinality === "insert" ? 1 : cardinality === "delete" ? -1 : 0;
}
function inferMutationCardinality(mutation) {
    return mutation.op === "upsert_item"
        ? "insert"
        : mutation.op === "delete_item"
            ? "delete"
            : "retain";
}
function cloneMutationEvent(event) {
    return {
        boundary: event.boundary,
        mutation: cloneMutation(event.mutation),
        cardinality: event.cardinality,
    };
}
function enqueueMerged(target, mutation) {
    const previous = target.at(-1);
    if (previous?.op === "append_text" &&
        mutation.op === "append_text" &&
        previous.itemId === mutation.itemId) {
        previous.text += mutation.text;
        return;
    }
    target.push(cloneMutation(mutation));
}
function cloneMutation(mutation) {
    if (mutation.op === "upsert_item") {
        return { op: mutation.op, item: cloneJsonValue(mutation.item) };
    }
    if (mutation.op === "patch_item") {
        return {
            op: mutation.op,
            itemId: mutation.itemId,
            patch: cloneJsonValue(mutation.patch),
        };
    }
    return { ...mutation };
}
function cloneJsonValue(value) {
    return JSON.parse(JSON.stringify(value));
}
export function normalizeAssistantWorkspaceTranscriptItem(source) {
    const itemId = String(source.id || source.itemId || "").trim();
    const itemKind = String(source.kind || source.itemKind || "").trim();
    const createdAt = String(source.createdAt || "");
    const updatedAt = source.updatedAt ? String(source.updatedAt) : null;
    if (!itemId)
        throw new Error("assistant-workspace-transcript-item-id");
    if (itemKind === "message") {
        const revisionSource = asRecord(source.revision);
        return {
            itemId,
            itemKind,
            createdAt,
            updatedAt,
            role: source.role === "user" || source.role === "system"
                ? source.role
                : "assistant",
            text: String(source.text || ""),
            status: source.state === "streaming" || source.state === "error"
                ? source.state
                : "complete",
            revision: revisionSource
                ? {
                    count: Math.max(0, Number(revisionSource.count) || 0),
                    status: String(revisionSource.status || revisionSource.latestStatus || ""),
                    repairRound: Math.max(0, Number(revisionSource.repairRound || revisionSource.latestRepairRound) || 0),
                }
                : null,
        };
    }
    if (itemKind === "thought") {
        return {
            itemId,
            itemKind,
            createdAt,
            updatedAt,
            text: String(source.text || ""),
            status: source.state === "streaming" || source.state === "error"
                ? source.state
                : "complete",
        };
    }
    if (itemKind === "tool_call" || itemKind === "tool-call") {
        return {
            itemId,
            itemKind: "tool-call",
            createdAt,
            updatedAt,
            toolCallId: String(source.toolCallId || itemId),
            title: String(source.title || ""),
            toolKind: source.toolKind ? String(source.toolKind) : null,
            toolName: source.toolName ? String(source.toolName) : null,
            inputSummary: source.inputSummary ? String(source.inputSummary) : null,
            resultSummary: source.resultSummary ? String(source.resultSummary) : null,
            summary: source.summary ? String(source.summary) : null,
            status: source.state === "in_progress" || source.status === "in-progress"
                ? "in-progress"
                : source.state === "completed" || source.status === "completed"
                    ? "completed"
                    : source.state === "failed" || source.status === "failed"
                        ? "failed"
                        : "pending",
        };
    }
    if (itemKind === "plan") {
        return {
            itemId,
            itemKind,
            createdAt,
            updatedAt,
            entries: (Array.isArray(source.entries) ? source.entries : []).map((entry) => {
                const value = asRecord(entry) || {};
                return {
                    content: String(value.content || ""),
                    priority: value.priority ? String(value.priority) : null,
                    status: value.status ? String(value.status) : null,
                };
            }),
        };
    }
    if (itemKind === "status") {
        return {
            itemId,
            itemKind,
            createdAt,
            updatedAt,
            level: source.level === "warn" || source.level === "error"
                ? source.level
                : "info",
            label: String(source.label || ""),
            text: String(source.text || ""),
        };
    }
    if (itemKind === "permission") {
        const status = String(source.status || "pending");
        return {
            itemId,
            itemKind,
            createdAt,
            updatedAt,
            permissionRequestId: String(source.permissionRequestId || itemId),
            title: String(source.title || ""),
            summary: String(source.summary || ""),
            source: source.source ? String(source.source) : null,
            status: status === "approved" || status === "denied" || status === "cancelled"
                ? status
                : "pending",
        };
    }
    throw new Error(`assistant-workspace-transcript-item-kind:${itemKind}`);
}
export function createAssistantWorkspaceTranscriptMutation(args) {
    const itemId = String(args.itemId || "").trim();
    if (!itemId)
        return null;
    if (args.op === "append_text") {
        const text = String(args.text || "");
        return text ? { op: "append_text", itemId, text } : null;
    }
    if (args.op === "delete_item")
        return { op: "delete_item", itemId };
    if (!args.afterItem)
        return null;
    const after = normalizeAssistantWorkspaceTranscriptItem(args.afterItem);
    if (!args.beforeItem) {
        return { op: "upsert_item", item: after };
    }
    const before = normalizeAssistantWorkspaceTranscriptItem(args.beforeItem);
    if (before.itemId !== after.itemId || before.itemKind !== after.itemKind) {
        return { op: "upsert_item", item: after };
    }
    const patch = {};
    for (const [key, value] of Object.entries(after)) {
        if (key === "itemId" || key === "itemKind")
            continue;
        if (!jsonValuesEqual(before[key], value)) {
            patch[key] = cloneJsonValue(value);
        }
    }
    if (Object.keys(patch).length === 0)
        return null;
    return {
        op: "patch_item",
        itemId,
        patch: patch,
    };
}
function jsonValuesEqual(left, right) {
    if (left === right)
        return true;
    return JSON.stringify(left) === JSON.stringify(right);
}
export function createAssistantWorkspaceTranscriptPage(args) {
    const limit = Math.max(1, Math.floor(Number(args.limit) || 80));
    const startCursor = Math.max(0, Math.floor(Number(args.cursor) || 0));
    return {
        pageKey: args.anchor === "tail"
            ? `${args.owner.ownerKey}\ntail:${limit}`
            : `${args.owner.ownerKey}\ncursor:${startCursor}:${limit}`,
        startCursor,
        limit,
        totalVisibleItemCount: Math.max(0, Math.floor(Number(args.totalVisibleItemCount) || 0)),
        previousCursor: args.previousCursor === undefined ? null : args.previousCursor,
        nextCursor: args.nextCursor === undefined ? null : args.nextCursor,
        sourceEventSeq: Math.max(0, Math.floor(Number(args.sourceEventSeq) || 0)),
        items: args.items.map(normalizeAssistantWorkspaceTranscriptItem),
    };
}
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : null;
}
function hasExactKeys(value, expectedKeys) {
    const actual = Object.keys(value).sort();
    const expected = [...expectedKeys].sort();
    return (actual.length === expected.length &&
        actual.every((key, index) => key === expected[index]));
}
function utf8Bytes(value) {
    return new TextEncoder().encode(value).byteLength;
}

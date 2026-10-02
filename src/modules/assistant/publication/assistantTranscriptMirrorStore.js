import { readUiVisibleTranscriptPage } from "./assistantTranscriptPageProjection";
import { createAssistantWorkspaceTranscriptMutation, } from "./assistantWorkspaceTranscriptPublication";
function nowIso() {
    return new Date().toISOString();
}
function normalizeMirrorItemId(value) {
    return String(value || "").trim();
}
export function applyAssistantTranscriptMirrorEvent(state, descriptor, args) {
    const core = descriptor.core(state);
    const itemId = normalizeMirrorItemId(args.itemId);
    if (!itemId) {
        return;
    }
    if (args.op === "upsert_item" && args.item) {
        const cloned = descriptor.cloneItem(args.item);
        if (!core.transcriptItemsById.has(itemId)) {
            core.transcriptItemIds.push(itemId);
        }
        core.transcriptItemsById.set(itemId, cloned);
        descriptor.continuity?.rememberItem?.(state, cloned);
        return;
    }
    if (args.op === "append_text") {
        const current = core.transcriptItemsById.get(itemId);
        const next = current
            ? descriptor.appendTextToItem(current, String(args.text || ""), args.createdAt)
            : undefined;
        if (next) {
            core.transcriptItemsById.set(itemId, next);
        }
        return;
    }
    if (args.op === "patch_item" && args.patch) {
        const current = core.transcriptItemsById.get(itemId);
        if (!current) {
            return;
        }
        const next = {
            ...current,
            ...args.patch,
            id: current.id,
            kind: current.kind,
        };
        core.transcriptItemsById.set(itemId, next);
        descriptor.continuity?.rememberItem?.(state, next);
        return;
    }
    if (args.op === "delete_item") {
        const current = core.transcriptItemsById.get(itemId);
        if (current) {
            descriptor.continuity?.forgetItem?.(state, current);
        }
        core.transcriptItemsById.delete(itemId);
        core.transcriptItemIds = core.transcriptItemIds.filter((id) => id !== itemId);
    }
}
export function resetAssistantTranscriptMirror(state, descriptor) {
    const core = descriptor.core(state);
    core.transcriptItemsById.clear();
    core.transcriptItemIds = [];
    core.workspaceTranscriptEvents = [];
    descriptor.continuity?.resetMirrorState(state);
}
export function loadAssistantTranscriptMirrorFromItems(state, descriptor, args) {
    const core = descriptor.core(state);
    resetAssistantTranscriptMirror(state, descriptor);
    let maxItemOrdinal = 0;
    for (const item of args.items) {
        const cloned = descriptor.cloneItem(item);
        if (!core.transcriptItemsById.has(cloned.id)) {
            core.transcriptItemIds.push(cloned.id);
        }
        core.transcriptItemsById.set(cloned.id, cloned);
        maxItemOrdinal = Math.max(maxItemOrdinal, descriptor.itemOrdinal?.(cloned.id) ?? 0);
        descriptor.continuity?.rememberLoadedItem?.(state, cloned);
    }
    const counters = descriptor.resolveLoadedCounters
        ? descriptor.resolveLoadedCounters(state, {
            itemCount: args.items.length,
            eventSeq: Number(args.eventSeq) || 0,
            maxItemOrdinal,
        })
        : {
            itemCount: args.items.length,
            eventSeq: Math.max(0, Number(args.eventSeq) || 0),
        };
    core.transcriptItemCount = counters.itemCount;
    core.transcriptEventSeq = counters.eventSeq;
    const preview = args.items
        .slice()
        .reverse()
        .map((item) => descriptor.previewFromItem(item))
        .find((text) => !!text);
    descriptor.syncLoadedMetadata(state, { preview });
    core.transcriptMirrorLoaded = true;
    core.transcriptHydrateState = undefined;
    core.transcriptHydrateError = undefined;
}
export function queueAssistantTranscriptMirrorEvent(state, descriptor, args) {
    const core = descriptor.core(state);
    let metadataApplied = false;
    if (!core.transcriptMirrorLoaded && descriptor.queueEventWhileMirrorCold) {
        metadataApplied = true;
        if (descriptor.queueEventWhileMirrorCold(state, args) === "handled") {
            return;
        }
    }
    const previousItem = core.transcriptItemsById.get(args.itemId);
    descriptor.prepareMirrorForEvent?.(state);
    applyAssistantTranscriptMirrorEvent(state, descriptor, args);
    if (!metadataApplied) {
        if (args.newItem) {
            core.transcriptItemCount += 1;
        }
        core.transcriptEventSeq += 1;
        descriptor.syncEventMetadata(state, {
            item: args.item,
            text: args.text,
            textPreview: args.textPreview,
            newItem: args.newItem,
        });
    }
    const currentItem = core.transcriptItemsById.get(args.itemId);
    const mutation = createAssistantWorkspaceTranscriptMutation({
        op: args.op,
        itemId: args.itemId,
        beforeItem: previousItem,
        afterItem: currentItem,
        text: args.text,
    });
    if (mutation) {
        core.workspaceTranscriptEvents.push({
            boundary: args.boundary || "hard-boundary",
            mutation,
            cardinality: !previousItem && currentItem
                ? "insert"
                : previousItem && !currentItem
                    ? "delete"
                    : "retain",
        });
    }
    descriptor.persistEvent(state, args);
}
export function upsertTranscriptMirrorItem(state, descriptor, item, boundary) {
    queueAssistantTranscriptMirrorEvent(state, descriptor, {
        op: "upsert_item",
        itemId: item.id,
        item,
        createdAt: item.createdAt || nowIso(),
        newItem: true,
        boundary,
    });
}
export function patchTranscriptMirrorItem(state, descriptor, itemId, patch, boundary, createdAt) {
    queueAssistantTranscriptMirrorEvent(state, descriptor, {
        op: "patch_item",
        itemId,
        patch,
        createdAt: createdAt || nowIso(),
        boundary,
    });
}
export function appendTranscriptMirrorText(state, descriptor, item, text) {
    queueAssistantTranscriptMirrorEvent(state, descriptor, {
        op: "append_text",
        itemId: item.id,
        text,
        createdAt: nowIso(),
        boundary: "text-continuation",
    });
}
export function completeActiveStreamingMirrorTextItems(state, descriptor, args) {
    const updatedAt = args?.now || nowIso();
    const assistantId = descriptor.streaming.getActiveTextItemId(state, "assistant");
    if (assistantId && assistantId !== args?.except) {
        patchTranscriptMirrorItem(state, descriptor, assistantId, {
            state: "complete",
            updatedAt,
        }, undefined, updatedAt);
        descriptor.streaming.setActiveTextItemId(state, "assistant", "");
    }
    const thoughtId = descriptor.streaming.getActiveTextItemId(state, "thought");
    if (thoughtId && thoughtId !== args?.except) {
        patchTranscriptMirrorItem(state, descriptor, thoughtId, {
            state: "complete",
            updatedAt,
        }, undefined, updatedAt);
        descriptor.streaming.setActiveTextItemId(state, "thought", "");
    }
}
export function appendStreamingTranscriptMirrorText(state, descriptor, args) {
    const continuationId = descriptor.streaming.getContinuationTextItemId(state, args.channel, args.role);
    completeActiveStreamingMirrorTextItems(state, descriptor, {
        except: continuationId,
        now: args.createdAt,
    });
    if (continuationId) {
        queueAssistantTranscriptMirrorEvent(state, descriptor, {
            op: "append_text",
            itemId: continuationId,
            text: args.text,
            createdAt: args.createdAt || nowIso(),
            boundary: "text-continuation",
            ...(args.textPreview === undefined
                ? {}
                : { textPreview: args.textPreview }),
        });
        return;
    }
    const createdAt = args.createdAt || nowIso();
    const item = descriptor.streaming.createStreamingTextItem(state, {
        channel: args.channel,
        role: args.role,
        text: args.text,
        id: descriptor.allocateItemId(state, descriptor.streaming.textItemIdPrefix(args.channel)),
        createdAt,
    });
    descriptor.streaming.setActiveTextItemId(state, args.channel, item.id, args.role);
    upsertTranscriptMirrorItem(state, descriptor, item, "text-continuation");
}
export function finalizeStreamingTranscriptMirrorItems(state, descriptor, finalState, planTerminalStatus = "skipped") {
    const core = descriptor.core(state);
    const assistantId = descriptor.streaming.getActiveTextItemId(state, "assistant");
    if (assistantId) {
        patchTranscriptMirrorItem(state, descriptor, assistantId, {
            state: finalState,
            updatedAt: nowIso(),
        });
        descriptor.streaming.setActiveTextItemId(state, "assistant", "");
    }
    const thoughtId = descriptor.streaming.getActiveTextItemId(state, "thought");
    if (thoughtId) {
        patchTranscriptMirrorItem(state, descriptor, thoughtId, {
            state: finalState,
            updatedAt: nowIso(),
        });
        descriptor.streaming.setActiveTextItemId(state, "thought", "");
    }
    if (descriptor.plan.mode !== "transcript-item") {
        return;
    }
    const planId = descriptor.plan.getActivePlanItemId?.(state) || "";
    if (!planId) {
        return;
    }
    const target = core.transcriptItemsById.get(planId);
    if (target) {
        const patch = descriptor.plan.finalizePlanItemPatch?.(target, planTerminalStatus);
        if (patch) {
            patchTranscriptMirrorItem(state, descriptor, planId, patch);
        }
    }
    descriptor.plan.setActivePlanItemId?.(state, "");
}
export function createAssistantTranscriptMirrorLru(descriptor, options) {
    const coldMirrorLru = new Map();
    const isPinned = (state) => descriptor.isLive(state) || descriptor.isForeground(state);
    const forceRelease = (state) => {
        coldMirrorLru.delete(descriptor.ownerKey(state));
        resetAssistantTranscriptMirror(state, descriptor);
        descriptor.onMirrorForceReleased(state);
    };
    const prune = () => {
        for (const key of Array.from(coldMirrorLru.keys())) {
            const state = descriptor.resolveOwnerState(key);
            if (!state) {
                coldMirrorLru.delete(key);
                continue;
            }
            if (descriptor.isLive(state)) {
                coldMirrorLru.delete(key);
            }
        }
        while (coldMirrorLru.size > options.limit) {
            const key = coldMirrorLru.keys().next().value;
            if (!key) {
                break;
            }
            const state = descriptor.resolveOwnerState(key);
            coldMirrorLru.delete(key);
            if (!state) {
                continue;
            }
            const shouldRelease = descriptor.shouldReleaseOnEvict
                ? descriptor.shouldReleaseOnEvict(state)
                : !isPinned(state);
            if (shouldRelease) {
                forceRelease(state);
            }
        }
    };
    const touch = (state) => {
        const key = descriptor.ownerKey(state);
        if (!key || descriptor.isLive(state)) {
            coldMirrorLru.delete(key);
            return;
        }
        if (!descriptor.core(state).transcriptMirrorLoaded) {
            return;
        }
        coldMirrorLru.delete(key);
        coldMirrorLru.set(key, true);
        prune();
    };
    return {
        has: (ownerKey) => coldMirrorLru.has(ownerKey),
        size: () => coldMirrorLru.size,
        delete: (ownerKey) => {
            coldMirrorLru.delete(ownerKey);
        },
        clear: () => {
            coldMirrorLru.clear();
        },
        touch,
        forceRelease,
        prune,
    };
}
export async function hydrateAssistantTranscriptMirror(state, descriptor, lru) {
    const core = descriptor.core(state);
    const skipHydrate = descriptor.shouldSkipHydrate
        ? descriptor.shouldSkipHydrate(state)
        : core.transcriptMirrorLoaded;
    if (skipHydrate) {
        return;
    }
    if (core.transcriptHydratePromise) {
        await core.transcriptHydratePromise;
        return;
    }
    core.transcriptHydrateState = "loading";
    core.transcriptHydrateError = undefined;
    const hydrate = (async () => {
        const shouldFlush = descriptor.shouldFlushWritesBeforeHydrate
            ? descriptor.shouldFlushWritesBeforeHydrate(state)
            : (core.transcriptWrites?.size ?? 0) > 0;
        if (shouldFlush) {
            descriptor.onHydrateWaitingForWrites?.(state, core.transcriptWrites?.size ?? 0);
            await descriptor.flushWrites(state);
        }
        const { items, eventSeq } = await descriptor.readFullTranscript(state);
        loadAssistantTranscriptMirrorFromItems(state, descriptor, {
            items,
            eventSeq,
        });
        descriptor.onMirrorHydrated?.(state);
        lru.touch(state);
    })();
    core.transcriptHydratePromise = hydrate;
    try {
        await hydrate;
    }
    catch (error) {
        core.transcriptHydrateState = "failed";
        core.transcriptHydrateError = descriptor.errorText(error);
        descriptor.onHydrateFailed?.(state, error);
        throw error;
    }
    finally {
        core.transcriptHydratePromise = undefined;
        descriptor.onHydrateCompleted?.(state);
    }
}
export function scheduleAssistantTranscriptMirrorHydrate(state, descriptor, lru) {
    const core = descriptor.core(state);
    if (core.transcriptMirrorLoaded ||
        core.transcriptHydratePromise ||
        !descriptor.hasOwner(state)) {
        return;
    }
    core.transcriptHydrateState = "loading";
    void hydrateAssistantTranscriptMirror(state, descriptor, lru)
        .catch(() => undefined)
        .finally(() => {
        descriptor.onHydrateSettled?.(state);
    });
}
export function releaseIdleBackgroundTranscriptMirror(state, descriptor, lru) {
    const core = descriptor.core(state);
    const key = descriptor.ownerKey(state);
    if (descriptor.isLive(state)) {
        lru.delete(key);
        return;
    }
    if (descriptor.isForeground(state)) {
        lru.touch(state);
        return;
    }
    if (lru.has(key)) {
        return;
    }
    if ((core.transcriptWrites?.size ?? 0) > 0) {
        if (!core.transcriptMirrorReleasePromise) {
            const pending = Array.from(core.transcriptWrites ?? []);
            core.transcriptMirrorReleasePromise = Promise.allSettled(pending)
                .then(() => {
                core.transcriptMirrorReleasePromise = undefined;
                releaseIdleBackgroundTranscriptMirror(state, descriptor, lru);
            })
                .catch(() => {
                core.transcriptMirrorReleasePromise = undefined;
            });
        }
        return;
    }
    lru.forceRelease(state);
}
export function releaseAllIdleBackgroundTranscriptMirrors(descriptor, lru) {
    for (const state of descriptor.listOwnerStates()) {
        releaseIdleBackgroundTranscriptMirror(state, descriptor, lru);
    }
}
export function readAssistantTranscriptMirrorPage(state, descriptor, lru, args) {
    const core = descriptor.core(state);
    if (!core.transcriptMirrorLoaded) {
        return undefined;
    }
    lru.touch(state);
    return readUiVisibleTranscriptPage({
        itemIds: core.transcriptItemIds,
        getItem: (itemId) => core.transcriptItemsById.get(itemId),
        cloneItem: (item) => descriptor.cloneItem(item),
        executionDisplayMode: args.executionDisplayMode,
        cursor: args.cursor,
        limit: args.limit,
        defaultLimit: args.defaultLimit,
        maxLimit: args.maxLimit,
    });
}

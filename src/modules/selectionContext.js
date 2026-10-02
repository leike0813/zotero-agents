import { createZoteroHostCapabilityBroker, ZoteroHostCapabilityError, } from "./zoteroHostCapabilityBroker";
function selectionTitle(title) {
    return title?.trim() ? { title } : {};
}
export function selectionTargetRef(selection) {
    const item = selection.items[0];
    return item ? item.parentRef || item.ref : null;
}
export function itemRefIdentity(ref) {
    return `${ref.libraryId}:${ref.key}`;
}
export function assertSelectionRef(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new ZoteroHostCapabilityError("invalid_request", "Expected a portable item reference", { reason: "invalid_type", field: "selection" });
    }
    const ref = value;
    if (!Number.isSafeInteger(ref.libraryId) ||
        Number(ref.libraryId) <= 0 ||
        typeof ref.key !== "string" ||
        !ref.key.trim() ||
        Object.keys(ref).some((key) => key !== "libraryId" && key !== "key")) {
        throw new ZoteroHostCapabilityError("invalid_request", "Expected a complete portable item reference", { reason: "invalid_value", field: "selection" });
    }
}
export function lockSelection(items, sampledAt = new Date().toISOString()) {
    return Object.freeze({
        items: Object.freeze(items.map((item) => {
            assertSelectionRef(item.ref);
            if (item.parentRef)
                assertSelectionRef(item.parentRef);
            return Object.freeze({
                ...item,
                ref: Object.freeze({ ...item.ref }),
                ...(item.parentRef
                    ? { parentRef: Object.freeze({ ...item.parentRef }) }
                    : {}),
            });
        })),
        sampledAt,
    });
}
export function attachmentSelectionFact(item) {
    return {
        kind: "attachment",
        ref: item.ref,
        itemType: "attachment",
        ...selectionTitle(item.title),
        ...(item.parentRef ? { parentRef: item.parentRef } : {}),
        filename: item.filename,
        contentType: item.contentType,
        createdAt: item.createdAt,
        fileState: item.file.state,
    };
}
function detailSelectionFact(detail) {
    if (detail.kind === "attachment")
        return attachmentSelectionFact(detail.item);
    if (detail.kind === "annotation")
        return {
            kind: "child",
            ref: detail.item.ref,
            itemType: "annotation",
            parentRef: detail.item.attachmentRef,
            ...selectionTitle(detail.item.text),
        };
    return {
        kind: detail.kind === "note"
            ? "note"
            : detail.item.parentRef
                ? "child"
                : "parent",
        ref: detail.item.ref,
        itemType: detail.kind === "regular" ? detail.item.itemType : "note",
        ...selectionTitle(detail.item.title),
        ...(detail.item.parentRef ? { parentRef: detail.item.parentRef } : {}),
    };
}
export async function buildSelectionContext(refs, api = createZoteroHostCapabilityBroker(), control) {
    refs.forEach(assertSelectionRef);
    const items = [];
    for (const ref of refs)
        items.push(detailSelectionFact(await api.library.getItemDetail(ref, control)));
    return lockSelection(items);
}
export async function readSelectionContext(api = createZoteroHostCapabilityBroker(), control) {
    const items = [];
    const cursors = new Set();
    let cursor;
    do {
        const page = await api.context.getSelectedItems({ limit: 100, ...(cursor ? { cursor } : {}) }, control);
        for (const item of page.items)
            items.push({
                kind: item.itemType === "attachment"
                    ? "attachment"
                    : item.itemType === "note"
                        ? "note"
                        : item.parentRef
                            ? "child"
                            : "parent",
                ref: item.ref,
                itemType: item.itemType,
                ...selectionTitle(item.title),
                ...(item.parentRef ? { parentRef: item.parentRef } : {}),
            });
        if (!page.hasMore)
            return lockSelection(items);
        if (!page.nextCursor || cursors.has(page.nextCursor))
            throw new ZoteroHostCapabilityError("invalid_request", "Invalid selection continuation", { reason: "invalid_value", field: "cursor" });
        cursor = page.nextCursor;
        cursors.add(cursor);
    } while (cursor);
    return lockSelection(items);
}
export function selectionCounts(selection) {
    const counts = { parents: 0, children: 0, attachments: 0, notes: 0 };
    for (const item of selection.items) {
        if (item.kind === "parent")
            counts.parents++;
        else if (item.kind === "child")
            counts.children++;
        else if (item.kind === "attachment")
            counts.attachments++;
        else
            counts.notes++;
    }
    return { ...counts, total: selection.items.length };
}

import { MutationAuthorityExecutionError } from "../zoteroHostMutationAuthority";
import { ZOTERO_NATIVE_MUTATION_LIST_LIMIT } from "../../schemas/zoteroHostMutationSchemas";
function invalid(reason, field) {
    throw new MutationAuthorityExecutionError("failed", "invalid_request", "validation", "refresh_and_retry_new_operation", { reason, field }, "Invalid Trash target scope");
}
function bounded(count) {
    if (count > ZOTERO_NATIVE_MUTATION_LIST_LIMIT)
        throw new MutationAuthorityExecutionError("failed", "resource_limited", "validation", "refresh_and_retry_new_operation", {
            resource: "items",
            limit: ZOTERO_NATIVE_MUTATION_LIST_LIMIT,
            observed: count,
        }, "Trash target scope exceeds its limit");
}
function identity(ref) {
    return `${ref.libraryId}:${ref.key}`;
}
function itemRef(item) {
    return { libraryId: item.libraryID, key: item.key };
}
// Caller holds Host admission while reading these native facts.
export function prepareHostTrashMutation(request, facts) {
    if (!Array.isArray(request.itemRefs) ||
        !request.itemRefs.length ||
        (request.state !== "active" && request.state !== "trashed"))
        invalid("invalid_value", "itemRefs");
    bounded(request.itemRefs.length);
    const ids = new Set();
    const libraryId = request.itemRefs[0]?.libraryId;
    for (const ref of request.itemRefs) {
        if (!ref ||
            !Number.isInteger(ref.libraryId) ||
            ref.libraryId <= 0 ||
            typeof ref.key !== "string" ||
            !/^[A-Z0-9]{8}$/.test(ref.key))
            invalid("invalid_value", "itemRefs");
        if (ref.libraryId !== libraryId)
            invalid("invalid_combination", "itemRefs");
        if (ids.has(identity(ref)))
            invalid("duplicate_value", "itemRefs");
        ids.add(identity(ref));
    }
    const resolved = new Map();
    const add = (ref) => {
        const key = identity(ref);
        if (resolved.has(key))
            return resolved.get(key);
        const item = facts.resolve(ref);
        if (!item)
            throw new MutationAuthorityExecutionError("failed", "not_found", "read", "refresh_and_retry_new_operation", { kind: "item" }, "Trash target is unavailable");
        if (item.libraryID !== libraryId ||
            item.isAnnotation?.() ||
            !(item.isRegularItem() || item.isNote() || item.isAttachment()))
            invalid("invalid_combination", "itemRefs");
        if (typeof item.isEditable === "function" && !item.isEditable())
            throw new MutationAuthorityExecutionError("failed", "permission_denied", "validation", "none", { reason: "host_permission", kind: "item" }, "Trash target is not editable");
        const target = { item, ref: itemRef(item), before: facts.version(item) };
        resolved.set(key, target);
        return target;
    };
    const explicit = request.itemRefs.map(add);
    const expanded = [...explicit];
    if (request.state === "active") {
        for (const parent of explicit) {
            if (!parent.item.isRegularItem())
                continue;
            const selectedChild = explicit.some((target) => target.item.parentID === parent.item.id);
            if (selectedChild)
                continue;
            const children = [
                ...parent.item.getNotes(true),
                ...parent.item.getAttachments(true),
            ];
            for (const id of children) {
                const child = Zotero.Items.get(id);
                if (!child)
                    throw new MutationAuthorityExecutionError("failed", "not_found", "read", "refresh_and_retry_new_operation", { kind: "item" }, "Trash child is unavailable");
                if (!child.deleted)
                    continue;
                expanded.push(add(itemRef(child)));
                bounded(expanded.filter((target) => target.before.state !== request.state)
                    .length);
            }
        }
    }
    const targets = expanded.filter((target) => target.before.state !== request.state);
    bounded(targets.length);
    return {
        input: {
            ...request,
            itemRefs: request.itemRefs.map((ref) => ({ ...ref })),
        },
        targets,
        observations: [...resolved.values()].map((target) => ({
            entity: { kind: "item", ref: target.ref },
            version: target.before,
        })),
        result: {
            state: request.state,
            explicitRefs: explicit.map((target) => target.ref),
            expandedRefs: targets.map((target) => target.ref),
        },
    };
}
// Caller retains its admitted slice until this transaction settles.
export async function executeHostTrashMutation(prepared, facts) {
    const before = JSON.stringify({
        observations: prepared.observations,
        result: prepared.result,
    });
    let current = prepared;
    try {
        await Zotero.DB.executeTransaction(async () => {
            current = prepareHostTrashMutation(prepared.input, facts);
            if (JSON.stringify({
                observations: current.observations,
                result: current.result,
            }) !== before) {
                throw new MutationAuthorityExecutionError("failed", "conflict", "read", "refresh_and_retry_new_operation", { reason: "revision_mismatch" }, "Trash plan changed");
            }
            for (const { item } of current.targets) {
                item.deleted = current.input.state === "trashed";
                await item.save();
            }
        });
    }
    catch (error) {
        if (error instanceof MutationAuthorityExecutionError)
            throw error;
        throw new MutationAuthorityExecutionError("unknown", "execution_failed", "commit", "reconcile", { phase: "commit", recovery: "reconcile" }, "Trash transaction could not be confirmed", current.targets.map((target) => ({ kind: "item", ref: target.ref })));
    }
    for (const target of current.targets) {
        const item = facts.resolve(target.ref);
        if (!item || facts.version(item).state !== current.input.state)
            throw new MutationAuthorityExecutionError("unknown", "execution_failed", "verification", "reconcile", { phase: "verification", recovery: "reconcile" }, "Trash result could not be verified");
        target.item = item;
    }
    return {
        outcome: current.targets.length ? "committed" : "unchanged",
        changes: current.targets.map((target) => ({
            entity: { kind: "item", ref: target.ref },
            effect: current.input.state === "trashed" ? "trashed" : "updated",
            before: target.before,
            after: facts.version(target.item),
        })),
        result: current.result,
    };
}

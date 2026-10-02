import { assertSelectionRef, itemRefIdentity } from "../selectionContext";
export function resolveTargetParentRefFromRequest(request) {
    const ref = request?.targetParentRef;
    if (ref === undefined || ref === null)
        return null;
    assertSelectionRef(ref);
    return ref;
}
export function resolveTaskNameFromRequest(request, index) {
    const name = request?.taskName;
    return typeof name === "string" && name.trim()
        ? name.trim()
        : `task-${index + 1}`;
}
export function resolveInputUnitIdentityFromRequest(request) {
    const refs = request
        ?.sourceAttachmentRefs;
    if (Array.isArray(refs) && refs.length) {
        refs.forEach(assertSelectionRef);
        return `attachments:${JSON.stringify(refs.map(itemRefIdentity))}`;
    }
    const parent = resolveTargetParentRefFromRequest(request);
    return parent ? `parent:${itemRefIdentity(parent)}` : "";
}

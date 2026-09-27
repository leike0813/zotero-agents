import { assertSelectionRef, itemRefIdentity } from "../selectionContext";
import type { PortableItemRef } from "../../workflows/types";

export function resolveTargetParentRefFromRequest(
  request: unknown,
): PortableItemRef | null {
  const ref = (request as { targetParentRef?: unknown })?.targetParentRef;
  if (ref === undefined || ref === null) return null;
  assertSelectionRef(ref);
  return ref;
}

export function resolveTaskNameFromRequest(request: unknown, index: number) {
  const name = (request as { taskName?: unknown })?.taskName;
  return typeof name === "string" && name.trim()
    ? name.trim()
    : `task-${index + 1}`;
}

export function resolveInputUnitIdentityFromRequest(request: unknown) {
  const refs = (request as { sourceAttachmentRefs?: unknown })
    ?.sourceAttachmentRefs;
  if (Array.isArray(refs) && refs.length) {
    refs.forEach(assertSelectionRef);
    return `attachments:${JSON.stringify(refs.map(itemRefIdentity))}`;
  }
  const parent = resolveTargetParentRefFromRequest(request);
  return parent ? `parent:${itemRefIdentity(parent)}` : "";
}

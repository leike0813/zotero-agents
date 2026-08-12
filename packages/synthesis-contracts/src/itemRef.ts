import {
  SynthesisClientError,
  assertSynthesisExactFields,
  toSynthesisJsonObject,
} from "./common.js";

export const SYNTHESIS_HOST_ITEM_KEY_MAX = 128 as const;

export type SynthesisHostItemRef = {
  libraryId: number;
  itemKey: string;
};

function invalidRequest(message: string): never {
  throw new SynthesisClientError("invalid_request", message);
}

export function rebuildSynthesisHostItemRef(
  value: unknown,
  location = "itemRef",
): SynthesisHostItemRef {
  const json = toSynthesisJsonObject(value, location);
  assertSynthesisExactFields(json, ["libraryId", "itemKey"], [], location);
  if (!Number.isSafeInteger(json.libraryId) || Number(json.libraryId) <= 0) {
    return invalidRequest(`${location}.libraryId is invalid`);
  }
  if (typeof json.itemKey !== "string") {
    return invalidRequest(`${location}.itemKey is invalid`);
  }
  const itemKey = json.itemKey.trim();
  if (
    !itemKey ||
    itemKey.length > SYNTHESIS_HOST_ITEM_KEY_MAX ||
    !/^[A-Za-z0-9]+$/.test(itemKey)
  ) {
    return invalidRequest(`${location}.itemKey is invalid`);
  }
  return {
    libraryId: Number(json.libraryId),
    itemKey,
  };
}

export function compareSynthesisHostItemRefs(
  left: SynthesisHostItemRef,
  right: SynthesisHostItemRef,
) {
  return (
    left.libraryId - right.libraryId ||
    left.itemKey.localeCompare(right.itemKey)
  );
}

export function synthesisHostItemRefKey(ref: SynthesisHostItemRef) {
  return `${ref.libraryId}\n${ref.itemKey}`;
}

export function rebuildSynthesisHostItemRefs(
  value: unknown,
  location = "itemRefs",
): SynthesisHostItemRef[] {
  if (!Array.isArray(value)) {
    return invalidRequest(`${location} must be an array`);
  }
  const byKey = new Map<string, SynthesisHostItemRef>();
  value.forEach((entry, index) => {
    const ref = rebuildSynthesisHostItemRef(entry, `${location}[${index}]`);
    byKey.set(synthesisHostItemRefKey(ref), ref);
  });
  return Array.from(byKey.values()).sort(compareSynthesisHostItemRefs);
}

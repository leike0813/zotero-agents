import { SynthesisClientError, toSynthesisJsonObject } from "./common.js";

export const SYNTHESIS_TOPIC_CANONICAL_STORE_SCHEMA_VERSION =
  "synthesis-topic-canonical-store.v1" as const;

export type SynthesisTopicCanonicalStoreSnapshot = {
  state: "ready" | "stopping" | "repair_required";
  schemaVersion: typeof SYNTHESIS_TOPIC_CANONICAL_STORE_SCHEMA_VERSION;
  storeId: string;
};

export function rebuildSynthesisTopicCanonicalStoreSnapshot(
  value: unknown,
): SynthesisTopicCanonicalStoreSnapshot {
  const input = toSynthesisJsonObject(value, "topicCanonicalStoreSnapshot");
  const expected = ["state", "schemaVersion", "storeId"].sort();
  const actual = Object.keys(input).sort();
  if (
    actual.length !== expected.length ||
    actual.some((field, index) => field !== expected[index]) ||
    (input.state !== "ready" &&
      input.state !== "stopping" &&
      input.state !== "repair_required") ||
    input.schemaVersion !== SYNTHESIS_TOPIC_CANONICAL_STORE_SCHEMA_VERSION ||
    typeof input.storeId !== "string" ||
    !/^[a-f0-9]{64}$/.test(input.storeId)
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "topicCanonicalStoreSnapshot is invalid",
      { location: "topicCanonicalStoreSnapshot" },
    );
  }
  return {
    state: input.state,
    schemaVersion: SYNTHESIS_TOPIC_CANONICAL_STORE_SCHEMA_VERSION,
    storeId: input.storeId,
  };
}

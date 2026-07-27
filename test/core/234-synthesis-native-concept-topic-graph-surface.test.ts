import { assert } from "chai";
import { SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES } from "../../packages/synthesis-contracts/src/sidecarSystem";
import { inspectSynthesisConceptTopicGraphSurfaceParity } from "../../scripts/check-synthesis-concept-topic-graph-surface-parity";

const OWNED = [
  "client.acceptTopicGraphRelation",
  "client.applyConceptReviewAction",
  "client.applyTopicGraphReviewAction",
  "client.deleteConceptEntries",
  "client.queryConceptKb",
  "client.rebuildConceptKbIndex",
  "client.rebuildTopicGraphIndex",
  "client.rejectTopicGraphRelation",
  "client.updateConceptDisplayText",
] as const;

describe("Synthesis native Concept KB and Topic Graph surface", () => {
  it("admits exactly the complete fixture-backed Concept KB and Topic Graph roster", () => {
    assert.deepEqual(inspectSynthesisConceptTopicGraphSurfaceParity(), {
      ok: true,
      operations: 9,
      errors: [],
    });
    for (const capability of OWNED)
      assert.include(
        SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
        capability,
      );
  });
});

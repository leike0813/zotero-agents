import { assert } from "chai";
import {
  SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import { inspectSynthesisReferenceCanonicalSurfaceParity } from "../../scripts/check-synthesis-reference-canonical-surface-parity";

const OWNED = [
  "client.applyCanonicalRevisionMergeRequests",
  "client.applyCanonicalRevisionReviewAction",
  "client.applyReferenceMatchProposalAction",
  "client.applyReferenceMatchProposalActions",
  "client.archiveCanonicalReference",
  "client.getAttentionQueue",
  "client.getReferenceSidecarIndex",
  "client.getReviewInput",
  "client.mergeEffectiveCanonicalReference",
  "client.rankExternalReferences",
  "client.refreshReferenceSidecarNow",
  "client.retryAdvancedReferenceMatching",
  "client.retryReferenceSidecarRefresh",
  "client.runAdvancedReferenceMatchingNow",
  "client.startReferenceSidecarRefresh",
  "client.updateCanonicalReferenceMetadata",
] as const;

describe("Synthesis native Reference/Canonical surface", function () {
  this.timeout(10_000);

  it("admits exactly the complete fixture-backed Reference/Canonical roster", function () {
    assert.deepEqual(inspectSynthesisReferenceCanonicalSurfaceParity(), {
      ok: true,
      operations: 16,
      errors: [],
    });
    for (const capability of OWNED) {
      assert.include(
        SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
        capability,
      );
    }
  });
});

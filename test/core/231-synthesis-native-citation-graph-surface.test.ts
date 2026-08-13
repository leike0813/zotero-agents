import { assert } from "chai";
import { SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES } from "../../packages/synthesis-contracts/src/sidecarSystem";
import { inspectSynthesisCitationGraphSurfaceParity } from "../../scripts/check-synthesis-citation-graph-surface-parity";

const OWNED = [
  "client.getCitationGraphLayout",
  "client.getCitationGraphMetrics",
  "client.getCitationGraphSlice",
  "client.queryCitationGraph",
  "client.queryCitationGraphCluster",
  "client.rankLibraryPapers",
  "client.rebuildCitationGraphCacheNow",
  "client.recomputeCitationGraphLayout",
  "client.refreshCitationGraphCacheIncrementalNow",
  "client.refreshCitationGraphMetricsNow",
  "client.retryCitationGraphCacheRebuild",
  "client.startCitationGraphUpdate",
] as const;

describe("Synthesis native Citation Graph surface", function () {
  it("admits only the complete fixture-backed Citation Graph roster", function () {
    assert.deepEqual(inspectSynthesisCitationGraphSurfaceParity(), {
      ok: true,
      operations: 12,
      errors: [],
    });
    for (const capability of OWNED) {
      assert.include(
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
        capability,
      );
    }
  });
});

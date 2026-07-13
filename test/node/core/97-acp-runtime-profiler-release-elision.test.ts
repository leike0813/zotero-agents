import { assert } from "chai";
import { checkAcpRuntimeProfilerReleaseElision } from "../../../scripts/check-acp-runtime-profiler-release-elision";

describe("ACP runtime profiler release elision", function () {
  this.timeout(30_000);

  it("removes profiler code from non-debug bundles", async function () {
    const result = await checkAcpRuntimeProfilerReleaseElision();
    for (const name of ["profiler", "recorder", "replay"] as const) {
      assert.equal(result.releaseBytes[name], 0);
      assert.equal(result.sourceDisabledBytes[name], 0);
      assert.isAbove(result.debugBytes[name], 0);
    }
  });
});

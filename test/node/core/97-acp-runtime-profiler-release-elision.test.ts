import { assert } from "chai";
import { checkAcpRuntimeProfilerReleaseElision } from "../../../scripts/check-acp-runtime-profiler-release-elision";

describe("ACP runtime profiler release elision", function () {
  this.timeout(30_000);

  it("removes profiler code from non-debug bundles", async function () {
    const result = await checkAcpRuntimeProfilerReleaseElision();
    assert.equal(result.releaseBytes, 0);
    assert.isAbove(result.debugBytes, 0);
  });
});

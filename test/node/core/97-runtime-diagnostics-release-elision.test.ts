import { assert } from "chai";
import { checkRuntimeDiagnosticsReleaseElision } from "../../../scripts/check-runtime-diagnostics-release-elision";

describe("runtime diagnostics release elision", function () {
  this.timeout(30_000);

  it("removes every diagnostic group from disabled bundles", async function () {
    const result = await checkRuntimeDiagnosticsReleaseElision();
    for (const name of [
      "profiler",
      "recorder",
      "replay",
      "skillRunnerAudit",
    ] as const) {
      assert.equal(result.releaseBytes[name], 0);
      assert.equal(result.sourceDisabledBytes[name], 0);
      assert.isAbove(result.debugBytes[name], 0);
    }
  });
});

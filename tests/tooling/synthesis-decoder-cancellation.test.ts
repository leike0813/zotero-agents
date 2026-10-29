import { assert } from "chai";
import * as evidence from "../helpers/synthesisReverseHostProtocolEvidence";
import type { StructureCoverageInput } from "../../scripts/synthesis/synthesisProtocolStructureCoverage";

describe("Synthesis decoder cancellation", function () {
  it("rejects cancellation before preparing samples or starting Cargo", async function () {
    const controller = new AbortController();
    controller.abort();
    const input = {
      get corpus() {
        assert.fail("Canceled decoder must not prepare samples");
        return [];
      },
    } as unknown as StructureCoverageInput;
    let failure: unknown;
    try {
      await evidence.recordSynthesisProductionDecoderStructureEvidence(
        input,
        evidence.synthesisProductionDecoderDrivers()[0],
        undefined,
        controller.signal,
      );
    } catch (error) {
      failure = error;
    }
    assert.propertyVal(failure, "name", "AbortError");
  });
});

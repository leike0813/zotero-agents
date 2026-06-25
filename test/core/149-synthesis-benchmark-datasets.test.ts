import { assert } from "chai";
import { buildReferenceSidecarIndexRows } from "../../src/modules/synthesis/registry";
import {
  createSyntheticSynthesisBenchmarkDataset,
  createSyntheticSynthesisBenchmarkRegistryInputs,
} from "../fixtures/synthesisSyntheticDatasets";

describe("Synthesis benchmark datasets", function () {
  it("creates deterministic named 1k and 10k paper datasets", function () {
    const oneThousand = createSyntheticSynthesisBenchmarkDataset("1k");
    const tenThousand = createSyntheticSynthesisBenchmarkDataset("10k");

    assert.equal(oneThousand.paperCount, 1000);
    assert.equal(oneThousand.registryInputs.length, 1000);
    assert.equal(tenThousand.paperCount, 10000);
    assert.equal(tenThousand.registryInputs.length, 10000);
    assert.equal(oneThousand.registryInputs[0].itemKey, "SYN0000001");
    assert.equal(tenThousand.registryInputs[9999].itemKey, "SYN0010000");
    assert.equal(
      new Set(tenThousand.registryInputs.map((input) => input.itemKey)).size,
      10000,
    );
  });

  it("generates registry inputs that can feed DB and worker benchmarks", function () {
    const registryInputs = createSyntheticSynthesisBenchmarkRegistryInputs({
      paperCount: 1000,
      referenceFanout: 3,
    });
    const rows = buildReferenceSidecarIndexRows(registryInputs);
    const firstPayloads = registryInputs[0].notes?.[0].payloadBlocks || [];

    assert.lengthOf(rows, 1000);
    assert.equal(rows[0].artifactCoverage, "missing");
    assert.lengthOf(
      (
        firstPayloads.find((block) => block.payloadType === "references-json")
          ?.payload as { references?: unknown[] }
      ).references || [],
      3,
    );
    assert.includeMembers(
      firstPayloads.map((block) => block.payloadType),
      ["digest-markdown", "references-json", "citation-analysis-json"],
    );
  });
});

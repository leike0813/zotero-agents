import { assert } from "chai";
import { buildReferenceSidecarIndexRows } from "../../src/modules/synthesis/registry";
import {
  createSyntheticSynthesisBenchmarkDataset,
  createSyntheticSynthesisBenchmarkRegistryInputs,
  createSyntheticSynthesisProductionRouteDataset,
} from "../fixtures/synthesisSyntheticDatasets";

describe("Synthesis benchmark datasets", function () {
  it("creates the governed deterministic 2k, 10k, and 25k datasets", function () {
    const twoThousand = createSyntheticSynthesisBenchmarkDataset("2k");
    const tenThousand = createSyntheticSynthesisBenchmarkDataset("10k");
    const twentyFiveThousand = createSyntheticSynthesisBenchmarkDataset("25k");

    assert.equal(twoThousand.paperCount, 2000);
    assert.equal(twoThousand.registryInputs.length, 2000);
    assert.equal(tenThousand.paperCount, 10000);
    assert.equal(tenThousand.registryInputs.length, 10000);
    assert.equal(twentyFiveThousand.paperCount, 25000);
    assert.equal(twentyFiveThousand.registryInputs.length, 25000);
    assert.equal(twoThousand.registryInputs[0].itemKey, "SYN0000001");
    assert.equal(tenThousand.registryInputs[9999].itemKey, "SYN0010000");
    assert.equal(
      twentyFiveThousand.registryInputs[24999].itemKey,
      "SYN0025000",
    );
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

  it("generates production-route setup DTOs instead of SQLite seed rows", function () {
    const dataset = createSyntheticSynthesisProductionRouteDataset("10k");
    const resolver = dataset.topicApplyRequest.assets.find(
      ({ id }) => id === "asset/resolver",
    );
    const resolverValue = JSON.parse(String(resolver?.text || "{}")) as {
      resolved_paper_set?: { papers?: unknown[] };
    };
    const staged = dataset.tagSuggestionRequest(7, 3) as {
      expectedStagedRevision: number;
      entries: Array<{ tag: string; parentBindingsJson: string }>;
    };
    const items = dataset.listItemsPage({ limit: 100 }).items;
    const availableArtifacts = dataset
      .scanArtifactsPage({ limit: 10_000 })
      .artifacts.filter(({ status }) => status === "available");

    assert.lengthOf(resolverValue.resolved_paper_set?.papers || [], 10_000);
    assert.equal(staged.expectedStagedRevision, 3);
    assert.equal(staged.entries[0].tag, "topic:production-route-effect-10k-7");
    assert.lengthOf(JSON.parse(staged.entries[0].parentBindingsJson), 250);
    assert.isTrue(
      items.every(({ metadataHash }) =>
        /^sha256:[a-f0-9]{64}$/.test(metadataHash),
      ),
    );
    assert.isTrue(
      availableArtifacts.every(({ payloadHash }) =>
        /^sha256:[a-f0-9]{64}$/.test(String(payloadHash)),
      ),
    );
  });
});

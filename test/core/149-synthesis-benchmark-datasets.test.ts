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
    const materializedAssets = new Map(
      dataset.topicApplyRequest.assets.map((asset) => [asset.id, asset]),
    );
    const analysisManifest = JSON.parse(
      String(materializedAssets.get("asset/manifest")?.text || "{}"),
    ) as {
      sidecars?: Record<string, { path?: string }>;
    };
    const resolver = dataset.topicApplyRequest.assets.find(
      ({ id }) => id === "asset/resolver",
    );
    const resolverValue = JSON.parse(String(resolver?.text || "{}")) as {
      resolver?: {
        paper_refs?: string[];
        collection_key?: string[];
        combine?: string;
      };
      resolved_paper_set?: { papers?: unknown[] };
    };
    const staged = dataset.tagSuggestionRequest(7) as {
      entries: Array<{
        tag: string;
        source_flow?: string;
        parent_bindings?: unknown[];
      }>;
    };
    const items = dataset.listItemsPage({ limit: 100 }).items;
    const filteredArtifactRequest = {
      limit: items.length,
      paperRefs: items.map(({ paperRef }) => paperRef),
      artifactTypes: [
        "digest",
        "references",
        "citation_analysis",
        "literature_score",
      ] as Array<
        "digest" | "references" | "citation_analysis" | "literature_score"
      >,
    };
    const filteredArtifactPage = dataset.scanArtifactsPage(
      filteredArtifactRequest,
    );
    const availableArtifacts = dataset
      .scanArtifactsPage({ limit: 10_000 })
      .artifacts.filter(({ status }) => status === "available");

    const sidecarLocators = Object.values(analysisManifest.sidecars || {}).map(
      ({ path }) => String(path || ""),
    );
    assert.isNotEmpty(sidecarLocators);
    for (const locator of sidecarLocators) {
      const asset = materializedAssets.get(locator);
      assert.isOk(asset, `${locator} should be materialized`);
      assert.equal(asset?.mediaType, "application/json");
      const payload = JSON.parse(String(asset?.text || "null"));
      assert.isObject(payload);
      assert.isFalse(Array.isArray(payload));
    }
    assert.deepEqual(resolverValue.resolver?.paper_refs, ["1:SYN0000001"]);
    assert.deepEqual(resolverValue.resolver?.collection_key, []);
    assert.equal(resolverValue.resolver?.combine, "union");
    assert.lengthOf(resolverValue.resolved_paper_set?.papers || [], 10_000);
    assert.notProperty(staged, "expectedStagedRevision");
    assert.equal(staged.entries[0].tag, "topic:production-route-effect-10k-7");
    assert.equal(staged.entries[0].source_flow, "production-route-performance");
    assert.lengthOf(staged.entries[0].parent_bindings || [], 250);
    assert.equal(filteredArtifactPage.returned, items.length);
    assert.isFalse(filteredArtifactPage.hasMore);
    assert.lengthOf(filteredArtifactPage.artifacts, items.length * 3);
    assert.isTrue(
      filteredArtifactPage.artifacts.every(({ paperRef }) =>
        items.some((item) => item.paperRef === paperRef),
      ),
    );
    assert.notInclude(
      filteredArtifactPage.artifacts.map(({ artifactType }) => artifactType),
      "literature_score",
    );
    assert.deepInclude(items[0], {
      paperRef: "1:SYN0000001",
      date: "2018",
      creators: ["Synthetic Author 0"],
      tags: ["topic:retrieval", "topic:agents"],
      collections: ["collection:01"],
      doi: "10.7777/zs.synthetic.000001",
      arxiv: "",
      isbn: "",
      url: "",
      citekey: "synthetic00001",
      dateAdded: "2026-05-01T00:00:00.000Z",
    });
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

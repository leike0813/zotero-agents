import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import {
  applySynthesisUiAction,
  buildSynthesisUiSnapshot,
  createDefaultSynthesisUiState,
} from "../../src/modules/synthesis/uiModel";
import {
  createSyntheticSynthesisBenchmarkRegistryInputs,
  createSyntheticSynthesisBenchmarkRepositoryState,
} from "../fixtures/synthesisSyntheticDatasets";

type BudgetMeasurement = {
  name: string;
  durationMs: number;
  budgetMs: number;
};

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-synthesis-budget-"));
}

function formatBudgetBreakdown(
  failed: BudgetMeasurement,
  measurements: BudgetMeasurement[],
) {
  return [
    `${failed.name} exceeded ${failed.budgetMs}ms budget with ${failed.durationMs}ms elapsed.`,
    "Synthesis budget timing breakdown:",
    ...measurements.map(
      (entry) => `- ${entry.name}: ${entry.durationMs}ms / ${entry.budgetMs}ms`,
    ),
  ].join("\n");
}

async function measureBudget<T>(
  measurements: BudgetMeasurement[],
  name: string,
  budgetMs: number,
  action: () => Promise<T>,
) {
  const startedAt = Date.now();
  const result = await action();
  const measurement = {
    name,
    durationMs: Date.now() - startedAt,
    budgetMs,
  };
  measurements.push(measurement);
  assert.isAtMost(
    measurement.durationMs,
    budgetMs,
    formatBudgetBreakdown(measurement, measurements),
  );
  return result;
}

async function createBudgetedService(args: {
  paperCount: number;
  graphFanout: number;
  registryInputs?: ReturnType<
    typeof createSyntheticSynthesisBenchmarkRegistryInputs
  >;
}) {
  const root = await makeRuntimeRoot();
  const repository = createSynthesisRepository({
    runtimeRoot: root,
    now: () => "2026-05-27T00:00:00.000Z",
  });
  const state = createSyntheticSynthesisBenchmarkRepositoryState({
    paperCount: args.paperCount,
    graphFanout: args.graphFanout,
  });
  repository.replaceCitationGraphState(state.citationGraphState);
  const registryInputs =
    args.registryInputs ||
    createSyntheticSynthesisBenchmarkRegistryInputs({
      paperCount: args.paperCount,
      referenceFanout: args.graphFanout,
    });
  const service = createSynthesisService({
    root,
    libraryId: 1,
    synthesisRepository: repository,
    registryInputs,
    now: () => "2026-05-27T00:00:00.000Z",
  });
  return { root, repository, service, state };
}

describe("Synthesis performance budgets", function () {
  this.timeout(30000);

  beforeEach(function () {
    resetPluginStateStoreForTests();
  });

  afterEach(function () {
    resetPluginStateStoreForTests();
  });

  it("formats budget failures with a timing breakdown", function () {
    const message = formatBudgetBreakdown(
      {
        name: "citation graph metrics read",
        durationMs: 1600,
        budgetMs: 1500,
      },
      [
        {
          name: "workbench index surface input",
          durationMs: 200,
          budgetMs: 2500,
        },
        {
          name: "citation graph metrics read",
          durationMs: 1600,
          budgetMs: 1500,
        },
      ],
    );

    assert.include(message, "citation graph metrics read exceeded");
    assert.include(message, "Synthesis budget timing breakdown");
    assert.include(message, "workbench index surface input: 200ms / 2500ms");
    assert.include(message, "citation graph metrics read: 1600ms / 1500ms");
  });

  it("keeps 10k-paper read and review paths inside bounded budgets", async function () {
    const measurements: BudgetMeasurement[] = [];
    const { service } = await createBudgetedService({
      paperCount: 10000,
      graphFanout: 2,
    });

    const chromeInput = await measureBudget(
      measurements,
      "workbench chrome input",
      1000,
      () => service.getSynthesisWorkbenchChromeInput(),
    );
    const indexSurfaceInput = await measureBudget(
      measurements,
      "workbench index surface input",
      2500,
      () => service.getSynthesisWorkbenchSurfaceInput("index"),
    );
    const exactRegistryPage = await measureBudget(
      measurements,
      "index exact paper filter",
      1500,
      () =>
        service.getReferenceSidecarIndex({
          sourceRefs: ["1:SYN0009999"],
        }),
    );
    const filteredUiState = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: { registry: { search: "Synthetic Synthesis Paper 00010" } },
      },
    ).state;
    const filteredIndexSurfaceInput = await measureBudget(
      measurements,
      "index visible filter",
      2500,
      () => service.getSynthesisWorkbenchSurfaceInput("index", filteredUiState),
    );
    const filteredSnapshot = buildSynthesisUiSnapshot(
      filteredIndexSurfaceInput,
      filteredUiState,
    );
    const graphSlice = await measureBudget(
      measurements,
      "citation graph slice",
      1500,
      () =>
        service.getCitationGraphSlice({
          startNodeId: "zotero:item:SYN0000001",
          depth: 1,
          maxNodes: 50,
          maxEdges: 80,
        }),
    );
    const metrics = await measureBudget(
      measurements,
      "citation graph metrics read",
      1500,
      () => service.getCitationGraphMetrics({ limit: 50 }),
    );
    assert.equal(chromeInput.libraryId, 1);
    assert.isAtMost(indexSurfaceInput.registry?.rows?.length || 0, 250);
    assert.equal(exactRegistryPage.total, 1);
    assert.equal(exactRegistryPage.rows[0]?.paper_ref, "1:SYN0009999");
    assert.include(
      filteredSnapshot.registry.visibleRows.map((row) => row.paper_ref),
      "1:SYN0000010",
    );
    assert.isTrue(graphSlice.ok);
    assert.isAtMost(graphSlice.nodes.length, 50);
    assert.isAtMost(graphSlice.edges.length, 80);
    assert.isTrue(metrics.ok);
    assert.lengthOf(metrics.items, 50);
  });

  it("does not use the full Zotero registry scan for chrome, index, or review surfaces", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({
      runtimeRoot: root,
      now: () => "2026-05-27T00:00:00.000Z",
    });
    const pageInputs = createSyntheticSynthesisBenchmarkRegistryInputs({
      paperCount: 20,
      referenceFanout: 0,
    });
    let fullScanCalls = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
      synthesisRepository: repository,
      libraryAdapter: {
        async getRegistryInputs() {
          fullScanCalls += 1;
          throw new Error(
            "full registry scan must not be used by UI hot paths",
          );
        },
        async getRegistryInputsPage(request = {}) {
          const limit = Math.max(0, Math.floor(Number(request.limit) || 0));
          return limit > 0 ? pageInputs.slice(0, limit) : pageInputs;
        },
        async getRegistryInputForItem(request) {
          return (
            pageInputs.find((input) => input.itemKey === request.itemKey) ||
            null
          );
        },
        async getRegistryMetadataFingerprints() {
          return [];
        },
        async getLibraryIndex() {
          return {
            libraryId: 1,
            papers: [],
            tags: [],
            collections: [],
            diagnostics: [],
          };
        },
        async getCitationGraphInputs() {
          return [];
        },
        async readPaperArtifacts() {
          return { artifacts: [], diagnostics: [] };
        },
      },
      now: () => "2026-05-27T00:00:00.000Z",
    });

    const chrome = await service.getSynthesisWorkbenchChromeInput();
    const index = await service.getSynthesisWorkbenchSurfaceInput("index");
    const review = await service.getSynthesisWorkbenchSurfaceInput("review");

    assert.isAtMost(fullScanCalls, 2);
    assert.equal(chrome.libraryId, 1);
    assert.isAtMost(index.registry?.rows?.length || 0, 20);
    assert.deepEqual(review.registry?.rows || [], []);
  });

  it("keeps Index reference details out of the default surface read", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({
      runtimeRoot: root,
      now: () => "2026-05-27T00:00:00.000Z",
    });
    const pageInputs = createSyntheticSynthesisBenchmarkRegistryInputs({
      paperCount: 2,
      referenceFanout: 0,
    });
    repository.upsertCanonicalReference({
      canonicalReferenceId: "cref:test-reference",
      title: "Bounded Reference",
      normalizedTitle: "bounded reference",
      year: "2026",
      authorsJson: "[]",
      identifiersJson: "{}",
      metadataHash: "hash:bounded-reference",
      status: "active",
      createdAt: "2026-05-27T00:00:00.000Z",
      updatedAt: "2026-05-27T00:00:00.000Z",
    });
    repository.upsertRawReference({
      rawReferenceId: "rawref:test-reference",
      sourceRef: "1:SYN0000001",
      referencesArtifactHash: "hash:references",
      referenceIndex: 0,
      rawHash: "hash:raw-reference",
      parsedTitle: "Bounded Reference",
      normalizedTitle: "bounded reference",
      year: "2026",
      authorsJson: "[]",
      rawReference: "Bounded Reference. 2026.",
      canonicalReferenceId: "cref:test-reference",
      status: "active",
      diagnosticsJson: "[]",
      createdAt: "2026-05-27T00:00:00.000Z",
      updatedAt: "2026-05-27T00:00:00.000Z",
    });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      synthesisRepository: repository,
      registryInputs: pageInputs,
      now: () => "2026-05-27T00:00:00.000Z",
    });

    const index = await service.getSynthesisWorkbenchSurfaceInput("index");
    const defaultRow = index.registry?.rows?.find(
      (row) => row.paper_ref === "1:SYN0000001",
    );
    assert.equal(defaultRow?.reference_count, 1);
    assert.deepEqual(defaultRow?.references || [], []);

    const referencedState = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: { registry: { scope: "referenced" } },
      },
    ).state;
    const referenced = await service.getSynthesisWorkbenchSurfaceInput(
      "index",
      referencedState,
    );
    const referencedRow = referenced.registry?.rows?.find(
      (row) => row.paper_ref === "1:SYN0000001",
    );
    assert.lengthOf(referencedRow?.references || [], 1);
  });

  it("keeps explicit reference sidecar refresh bounded and reports progress", async function () {
    const measurements: BudgetMeasurement[] = [];
    const registryInputs = createSyntheticSynthesisBenchmarkRegistryInputs({
      paperCount: 50,
      referenceFanout: 1,
    });
    const { service } = await createBudgetedService({
      paperCount: 50,
      graphFanout: 1,
      registryInputs,
    });
    let progressUpdates = 0;

    const result = await measureBudget(
      measurements,
      "reference sidecar refresh",
      2500,
      () =>
        service.refreshReferenceSidecarNow({
          onProgress: async () => {
            progressUpdates += 1;
          },
        }),
    );

    assert.equal(result.status, "ready");
    assert.isAtLeast(progressUpdates, 3);
  });

  it("does not run startup drift fanout during service construction", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    let scans = 0;

    createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      synthesisRepository: repository,
      libraryAdapter: {
        getLibraryIndex: async () => {
          scans += 1;
          return {
            libraryId: 1,
            papers: [],
            tags: [],
            collections: [],
            diagnostics: [],
          };
        },
      } as any,
    });

    assert.equal(scans, 0);
    assert.equal(
      repository.listOperations({ includeCompleted: true }).length,
      0,
    );
    assert.equal(repository.listCacheBasis().length, 0);
  });
});

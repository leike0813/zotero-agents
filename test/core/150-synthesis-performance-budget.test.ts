import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import {
  applySynthesisUiAction,
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
  repository.replaceIndexState(state.indexState);
  repository.replaceCitationGraphState(state.citationGraphState);
  const service = createSynthesisService({
    root,
    libraryId: 1,
    synthesisRepository: repository,
    registryInputs: args.registryInputs,
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
          name: "workbench snapshot input",
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
    assert.include(message, "workbench snapshot input: 200ms / 2500ms");
    assert.include(message, "citation graph metrics read: 1600ms / 1500ms");
  });

  it("keeps 10k-paper read and review paths inside bounded budgets", async function () {
    const measurements: BudgetMeasurement[] = [];
    const { service, state } = await createBudgetedService({
      paperCount: 10000,
      graphFanout: 2,
    });

    const snapshotInput = await measureBudget(
      measurements,
      "workbench snapshot input",
      2500,
      () => service.getSynthesisSnapshotInput(),
    );
    const exactRegistryPage = await measureBudget(
      measurements,
      "index exact paper filter",
      1500,
      () => service.getPaperRegistry({ paperRefs: ["1:SYN0009999"] }),
    );
    const filteredUiState = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: { registry: { search: "Synthetic Synthesis Paper 00010" } },
      },
    ).state;
    const filteredSnapshot = await measureBudget(
      measurements,
      "index visible filter",
      2500,
      () => service.getSynthesisSnapshot(filteredUiState),
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
    const reviewResult = await measureBudget(
      measurements,
      "index review action",
      2000,
      () =>
        service.applyCleanupProposalAction({
          proposalId: state.reviewItemId,
          action: "confirm_delete_item",
        }),
    );

    assert.isAtMost(snapshotInput.registry.rows.length, 250);
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
    assert.include(
      reviewResult.diagnostics.map((diagnostic) => diagnostic.code),
      "index_summary_updated",
    );
  });

  it("keeps incremental worker batches bounded and reports timing", async function () {
    const measurements: BudgetMeasurement[] = [];
    const registryInputs = createSyntheticSynthesisBenchmarkRegistryInputs({
      paperCount: 1000,
      referenceFanout: 1,
    });
    const { service } = await createBudgetedService({
      paperCount: 1000,
      graphFanout: 1,
      registryInputs,
    });

    for (let index = 0; index < 20; index += 1) {
      await service.recordSynthesisUpdateEvent({
        eventType: "zotero_item_updated",
        source: "budget-test",
        scope: {
          kind: "zotero_item",
          ref: `SYN${String(index + 1).padStart(7, "0")}`,
        },
      });
    }

    const result = await measureBudget(
      measurements,
      "paper registry worker batch",
      2500,
      () =>
        service.runPaperRegistryIncrementalWorker({
          batchLimit: 5,
          timeBudgetMs: 1000,
        }),
    );

    assert.equal(result.processed, 5);
    assert.equal(result.completed, 5);
    assert.equal(result.failed, 0);
    assert.equal(result.time_budget_ms, 1000);
    assert.equal(result.budget_exhausted, false);
    assert.equal(typeof result.elapsed_ms, "number");
    assert.isAtLeast(result.elapsed_ms, 0);
  });
});

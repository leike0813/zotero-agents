import { pathToFileURL } from "node:url";
import { SynthesisClientError } from "../packages/synthesis-contracts/src";
import {
  createSyntheticSynthesisProductionRouteDataset,
  type SyntheticSynthesisProductionRouteDataset,
} from "../test/fixtures/synthesisSyntheticDatasets";
import {
  startSynthesisProductionRouteHarness,
  type SynthesisProductionRouteHarness,
  waitForSynthesisProductionRouteEvidence,
  waitForSynthesisProductionRouteReceipt,
} from "../test/helpers/synthesisProductionRouteHarness";

const FORMAL_SAMPLE_COUNT = 11;
const TAG_EFFECT_BATCH_LIMIT = 100;
const UI_RSS_BUDGET_BYTES = 128 * 1024 * 1024;

type DatasetName = "2k" | "10k" | "25k";
type OperationName =
  | "topic-page"
  | "chrome"
  | "index"
  | "graph-slice"
  | "graph-metrics"
  | "reference-refresh"
  | "tag-effects";

type NumericDistribution = {
  samples: number[];
  p50: number | null;
  p95: number | null;
};

export function nearestRank(
  values: readonly number[],
  percentile: number,
): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.max(
    1,
    Math.min(sorted.length, Math.ceil((percentile / 100) * sorted.length)),
  );
  return sorted[rank - 1];
}

function distribution(values: number[]): NumericDistribution {
  return {
    samples: values,
    p50: nearestRank(values, 50),
    p95: nearestRank(values, 95),
  };
}

function returnedCount(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== "object") return 0;
  const object = value as Record<string, unknown>;
  for (const key of ["returned", "returned_count", "total"]) {
    if (typeof object[key] === "number") return object[key] as number;
  }
  for (const key of ["topics", "rows", "items", "nodes", "artifacts"]) {
    if (Array.isArray(object[key])) return object[key].length;
  }
  for (const nested of Object.values(object)) {
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const count = returnedCount(nested);
      if (count) return count;
    }
  }
  return 0;
}

function isStructuredDegraded(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const object = value as Record<string, unknown>;
  if (
    object.degraded === true ||
    object.status === "degraded" ||
    (object.degradation && typeof object.degradation === "object")
  ) {
    return true;
  }
  return Object.values(object).some((entry) => isStructuredDegraded(entry));
}

function operationCapability(operation: OperationName) {
  return {
    "topic-page": "client.listTopics",
    chrome: "client.getSynthesisWorkbenchChromeInput",
    index: "client.getSynthesisWorkbenchSurfaceInput",
    "graph-slice": "client.getCitationGraphSlice",
    "graph-metrics": "client.getCitationGraphMetrics",
    "reference-refresh": "client.refreshReferenceSidecarNow",
    "tag-effects": "client.promoteStagedTagSuggestions",
  }[operation];
}

function latencyBudget(dataset: DatasetName, operation: OperationName) {
  if (dataset === "25k") return 2_500;
  return {
    "topic-page": 1_500,
    chrome: 1_000,
    index: 2_500,
    "graph-slice": 1_500,
    "graph-metrics": 1_500,
    "reference-refresh": 2_500,
    "tag-effects": 2_500,
  }[operation];
}

function scenarioOperations(dataset: DatasetName): OperationName[] {
  if (dataset === "2k") return ["topic-page"];
  const reads: OperationName[] = [
    "topic-page",
    "chrome",
    "index",
    "graph-slice",
    "graph-metrics",
  ];
  return dataset === "10k"
    ? [...reads, "reference-refresh", "tag-effects"]
    : reads;
}

async function invokeOperation(args: {
  harness: SynthesisProductionRouteHarness;
  operation: OperationName;
  tagEffects: Array<{ libraryId: number; itemKey: string; tags: string[] }>;
  stagedTag?: string;
}) {
  const { client } = args.harness;
  switch (args.operation) {
    case "topic-page":
      return client.topics.list({ cursor: "", limit: 50 });
    case "chrome":
      return client.workbench.readChrome({ state: {} });
    case "index":
      return client.workbench.readSurface({
        surface: "index",
        state: { registry: { scope: "library" } },
      });
    case "graph-slice":
      return client.graph.getSlice({
        paperRef: "1:SYN0000001",
        depth: 1,
        maxNodes: 50,
        maxEdges: 80,
      });
    case "graph-metrics":
      return client.graph.getMetrics({ limit: 50 });
    case "reference-refresh":
      return client.references.refreshReferenceSidecarNow();
    case "tag-effects": {
      if (!args.stagedTag) throw new Error("tag_effect_fixture_not_staged");
      return client.tags.promoteStagedTagSuggestions({
        tags: [args.stagedTag],
      });
    }
  }
}

function maintenanceOperationId(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const object = value as Record<string, unknown>;
  return object.schema === "synthesis.maintenance_operation.v1" &&
    typeof object.operation_id === "string"
    ? object.operation_id
    : null;
}

function maintenanceFailureSummary(
  phase: string,
  terminal: Record<string, unknown>,
) {
  const receipt =
    terminal.receipt && typeof terminal.receipt === "object"
      ? (terminal.receipt as Record<string, unknown>)
      : {};
  return {
    phase,
    status: terminal.status,
    operationType: terminal.operation_type,
    failedCount: terminal.failed_count,
    processedCount: terminal.processed_count,
    affectedSourceCount: Array.isArray(receipt.affected_source_refs)
      ? receipt.affected_source_refs.length
      : null,
    receiptStatus: receipt.status,
    retryable: receipt.retryable,
  };
}

async function awaitMaintenanceResult(
  harness: SynthesisProductionRouteHarness,
  value: unknown,
  phase: string,
) {
  const operationId = maintenanceOperationId(value);
  if (!operationId) return value;
  const terminal = await waitForSynthesisProductionRouteReceipt({
    operationId,
    getOperation: (candidate) =>
      harness.client.maintenance.getOperation({ operation_id: candidate }),
  });
  if (terminal.status !== "completed") {
    throw new Error(
      `maintenance_setup_failed:${JSON.stringify(maintenanceFailureSummary(phase, terminal))}`,
    );
  }
  return terminal;
}

async function applyTopicDatasetThroughProductionRoute(args: {
  harness: SynthesisProductionRouteHarness;
  dataset: SyntheticSynthesisProductionRouteDataset;
}) {
  const topicApplied =
    await args.harness.client.workflowApply.applyTopicSynthesisResult(
      args.dataset.topicApplyRequest,
    );
  if (topicApplied.status !== "persisted") {
    throw new Error(`topic_setup_failed:${JSON.stringify(topicApplied)}`);
  }
}

function cachedSetup(
  cache: Map<string, Promise<void>>,
  key: string,
  setup: () => Promise<unknown>,
) {
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = setup().then(() => undefined);
  cache.set(key, pending);
  return pending;
}

async function setupOperationThroughProductionRoute(args: {
  harness: SynthesisProductionRouteHarness;
  operation: OperationName;
  cache: Map<string, Promise<void>>;
}) {
  const needsReferenceState = [
    "index",
    "graph-slice",
    "graph-metrics",
    "reference-refresh",
  ].includes(args.operation);
  if (needsReferenceState) {
    await cachedSetup(args.cache, "reference-refresh", async () =>
      awaitMaintenanceResult(
        args.harness,
        await args.harness.client.references.refreshReferenceSidecarNow(),
        "reference-refresh",
      ),
    );
  }
  const needsGraphState = ["graph-slice", "graph-metrics"].includes(
    args.operation,
  );
  if (needsGraphState) {
    await cachedSetup(args.cache, "graph-rebuild", async () =>
      awaitMaintenanceResult(
        args.harness,
        await args.harness.client.graph.rebuildCitationGraphCacheNow(),
        "graph-rebuild",
      ),
    );
  }
  if (args.operation === "graph-metrics") {
    await cachedSetup(args.cache, "graph-metrics-refresh", async () =>
      awaitMaintenanceResult(
        args.harness,
        await args.harness.client.graph.refreshMetricsNow({}),
        "graph-metrics-refresh",
      ),
    );
  }
  if (args.operation === "tag-effects") {
    const snapshot = await args.harness.client.tags.loadTagVocabulary();
    if (!snapshot.vocabularyHash) {
      await cachedSetup(args.cache, "tag-policy-initialize", async () =>
        awaitMaintenanceResult(
          args.harness,
          await args.harness.client.tags.initializeBuiltinTagPolicy(),
          "tag-policy-initialize",
        ),
      );
    }
  }
}

async function stageTagEffectWorkload(args: {
  harness: SynthesisProductionRouteHarness;
  dataset: SyntheticSynthesisProductionRouteDataset;
  ordinal: number;
  expectedStagedRevision: number;
}) {
  const request = args.dataset.tagSuggestionRequest(
    args.ordinal,
    args.expectedStagedRevision,
  );
  const staged = await args.harness.client.tags.stageTagSuggestions(request);
  if (staged.status !== "committed") {
    throw new Error(`tag_stage_failed:${staged.status}`);
  }
  const entries = request.entries as Array<{ tag: string }>;
  return {
    tag: entries[0].tag,
    stagedRevision: Number(staged.stagedRevision),
  };
}

export type SynthesisProductionRoutePerformanceSample = {
  ok: boolean;
  errorCode: string | null;
  durationMs: number;
  acceptanceLatencyMs: number | null;
  terminalLatencyMs: number | null;
  requestBytes: number;
  responseBytes: number;
  sqlQueryCount: number | null;
  sqlWriteCount: number | null;
  hostCallCount: number;
  itemPageCalls: number;
  artifactPageCalls: number;
  artifactReadCalls: number;
  effectCallCount: number;
  effectBatchSizes: number[];
  returnedCount: number;
  structuredDegraded: boolean;
  rssBytes: number | null;
  rssSupported: boolean;
};

async function collectSample(args: {
  harness: SynthesisProductionRouteHarness;
  operation: OperationName;
  tagEffects: Array<{ libraryId: number; itemKey: string; tags: string[] }>;
  stagedTag?: string;
}): Promise<SynthesisProductionRoutePerformanceSample> {
  const wireOffset = args.harness.recorder.wire.length;
  const hostOffset = args.harness.recorder.hostCalls.length;
  const effectOffset = args.harness.recorder.effectBatches.length;
  const observationOffset = args.harness.observations().length;
  const startedAt = performance.now();
  let acceptanceLatencyMs: number | null = null;
  let terminalLatencyMs: number | null = null;
  let value: unknown;
  let errorCode: string | null = null;
  try {
    const acceptedAt = performance.now();
    value = await invokeOperation(args);
    acceptanceLatencyMs = performance.now() - acceptedAt;
    if (
      value &&
      typeof value === "object" &&
      (value as Record<string, unknown>).schema ===
        "synthesis.maintenance_operation.v1" &&
      typeof (value as Record<string, unknown>).operation_id === "string"
    ) {
      const terminalStartedAt = performance.now();
      value = await waitForSynthesisProductionRouteReceipt({
        operationId: String((value as Record<string, unknown>).operation_id),
        getOperation: (operationId) =>
          args.harness.client.maintenance.getOperation({
            operation_id: operationId,
          }),
      });
      terminalLatencyMs = performance.now() - terminalStartedAt;
    }
  } catch (error) {
    errorCode =
      error instanceof SynthesisClientError
        ? String(
            error.details?.sidecarReason ||
              error.details?.sidecarCode ||
              error.code,
          )
        : error instanceof Error
          ? error.message
          : "unknown_error";
  }
  const capability = operationCapability(args.operation);
  const wire = args.harness.recorder.wire
    .slice(wireOffset)
    .filter((sample) => sample.capability === capability);
  const hostCalls = args.harness.recorder.hostCalls.slice(hostOffset);
  const queryTerminals = await waitForSynthesisProductionRouteEvidence({
    read: () => args.harness.observations(),
    offset: observationOffset,
    expectedCount: wire.length,
    matches: (event) =>
      event.phase === "query-terminal" &&
      event.identities?.capability === capability,
  });
  const rss = args.harness.rss();
  return {
    ok: errorCode === null,
    errorCode,
    durationMs: performance.now() - startedAt,
    acceptanceLatencyMs,
    terminalLatencyMs,
    requestBytes: wire.reduce(
      (total, sample) => total + sample.requestBytes,
      0,
    ),
    responseBytes: wire.reduce(
      (total, sample) => total + sample.responseBytes,
      0,
    ),
    sqlQueryCount:
      queryTerminals.length > 0 &&
      queryTerminals.every(
        (event) => typeof event.metrics?.sqlQueryCount === "number",
      )
        ? queryTerminals.reduce(
            (total, event) => total + Number(event.metrics?.sqlQueryCount),
            0,
          )
        : null,
    sqlWriteCount:
      queryTerminals.length > 0 &&
      queryTerminals.every(
        (event) => typeof event.metrics?.sqlWriteCount === "number",
      )
        ? queryTerminals.reduce(
            (total, event) => total + Number(event.metrics?.sqlWriteCount),
            0,
          )
        : null,
    hostCallCount: hostCalls.length,
    itemPageCalls: hostCalls.filter(
      ({ capability }) => capability === "library.items.list_page",
    ).length,
    artifactPageCalls: hostCalls.filter(
      ({ capability }) => capability === "library.artifacts.scan_page",
    ).length,
    artifactReadCalls: hostCalls.filter(
      ({ capability }) => capability === "library.artifacts.read",
    ).length,
    effectCallCount: args.harness.recorder.effectBatches.length - effectOffset,
    effectBatchSizes: args.harness.recorder.effectBatches
      .slice(effectOffset)
      .map(({ size }) => size),
    returnedCount: returnedCount(value),
    structuredDegraded: isStructuredDegraded(value),
    rssBytes: rss.rssBytes,
    rssSupported: rss.rssSupported,
  };
}

export function summarizeSynthesisProductionRouteOperation(
  dataset: DatasetName,
  operation: OperationName,
  samples: SynthesisProductionRoutePerformanceSample[],
) {
  const failures: string[] = [];
  const budgetMs = latencyBudget(dataset, operation);
  const duration = distribution(samples.map(({ durationMs }) => durationMs));
  const requestBytes = distribution(
    samples.map((sample) => sample.requestBytes),
  );
  const responseBytes = distribution(
    samples.map((sample) => sample.responseBytes),
  );
  const sqlQueryCount = distribution(
    samples.flatMap((sample) =>
      sample.sqlQueryCount === null ? [] : [sample.sqlQueryCount],
    ),
  );
  const sqlWriteCount = distribution(
    samples.flatMap((sample) =>
      sample.sqlWriteCount === null ? [] : [sample.sqlWriteCount],
    ),
  );
  const hostCallCount = distribution(
    samples.map((sample) => sample.hostCallCount),
  );
  const returned = distribution(samples.map((sample) => sample.returnedCount));
  const acceptanceLatency = distribution(
    samples.flatMap((sample) =>
      sample.acceptanceLatencyMs === null ? [] : [sample.acceptanceLatencyMs],
    ),
  );
  const terminalLatency = distribution(
    samples.flatMap((sample) =>
      sample.terminalLatencyMs === null ? [] : [sample.terminalLatencyMs],
    ),
  );
  if (samples.some((sample) => !sample.ok)) failures.push("operation_failed");
  if (samples.some((sample) => sample.requestBytes <= 0)) {
    failures.push("request_bytes_missing");
  }
  if (samples.some((sample) => sample.responseBytes <= 0)) {
    failures.push("response_bytes_missing");
  }
  if (samples.some((sample) => sample.sqlQueryCount === null)) {
    failures.push("sql_query_count_missing");
  }
  if (samples.some((sample) => sample.sqlWriteCount === null)) {
    failures.push("sql_write_count_missing");
  }
  const readOperation = [
    "topic-page",
    "chrome",
    "index",
    "graph-slice",
    "graph-metrics",
  ].includes(operation);
  if (
    readOperation &&
    samples.some(
      (sample) => sample.sqlWriteCount !== null && sample.sqlWriteCount !== 0,
    )
  ) {
    failures.push("read_performed_sql_write");
  }
  const requiresData = [
    "topic-page",
    "index",
    "graph-slice",
    "graph-metrics",
  ].includes(operation);
  if (requiresData && dataset === "25k") {
    if (
      samples.some(
        (sample) => sample.returnedCount <= 0 && !sample.structuredDegraded,
      )
    ) {
      failures.push("bounded_result_or_degraded_missing");
    }
  } else if (
    requiresData &&
    samples.some((sample) => sample.returnedCount <= 0)
  ) {
    failures.push("empty_result");
  }
  if (
    process.platform === "linux" &&
    dataset === "10k" &&
    readOperation &&
    samples.some((sample) => !sample.rssSupported || sample.rssBytes === null)
  ) {
    failures.push("rss_observation_missing");
  }
  if (duration.p95 === null || duration.p95 > budgetMs) {
    failures.push("latency_budget_exceeded");
  }
  return {
    operation,
    capability: operationCapability(operation),
    budgetMs,
    durationMs: duration,
    requestBytes,
    responseBytes,
    sqlQueryCount,
    sqlWriteCount,
    hostCallCount,
    returnedCount: returned,
    receipt: {
      acceptanceLatencyMs: acceptanceLatency,
      terminalLatencyMs: terminalLatency,
    },
    rss: {
      supported: samples.every(({ rssSupported }) => rssSupported),
      bytes: distribution(
        samples.flatMap(({ rssBytes }) =>
          rssBytes === null ? [] : [rssBytes],
        ),
      ),
    },
    host: {
      itemPageCalls: distribution(
        samples.map((sample) => sample.itemPageCalls),
      ),
      artifactPageCalls: distribution(
        samples.map((sample) => sample.artifactPageCalls),
      ),
      artifactReadCalls: distribution(
        samples.map((sample) => sample.artifactReadCalls),
      ),
      effectCallCount: distribution(
        samples.map((sample) => sample.effectCallCount),
      ),
      effectBatchSizes: samples.map((sample) => sample.effectBatchSizes),
    },
    errors: samples.map(({ errorCode }) => errorCode),
    failures,
    passed: failures.length === 0,
  };
}

function unavailableOperation(
  dataset: DatasetName,
  operation: OperationName,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : "unknown_error";
  return {
    operation,
    capability: operationCapability(operation),
    budgetMs: latencyBudget(dataset, operation),
    durationMs: distribution([]),
    requestBytes: distribution([]),
    responseBytes: distribution([]),
    sqlQueryCount: distribution([]),
    sqlWriteCount: distribution([]),
    hostCallCount: distribution([]),
    returnedCount: distribution([]),
    receipt: {
      acceptanceLatencyMs: distribution([]),
      terminalLatencyMs: distribution([]),
    },
    rss: { supported: false, bytes: distribution([]) },
    host: {
      itemPageCalls: distribution([]),
      artifactPageCalls: distribution([]),
      artifactReadCalls: distribution([]),
      effectCallCount: distribution([]),
      effectBatchSizes: [],
    },
    errors: [message],
    failures: [`setup_failed:${message}`],
    passed: false,
  };
}

export async function runSynthesisProductionRoutePerformanceDataset(
  name: DatasetName,
  selectedOperations = scenarioOperations(name),
) {
  const dataset = createSyntheticSynthesisProductionRouteDataset(name);
  let referenceRevision = 0;
  const harness = await startSynthesisProductionRouteHarness({
    id: `performance-${name}`,
    hostFixture: {
      handle({ capability, payload }) {
        if (capability === "library.items.list_page") {
          return dataset.listItemsPage(payload);
        }
        if (capability === "library.artifacts.scan_page") {
          const page = dataset.scanArtifactsPage(payload);
          return {
            ...page,
            snapshotRevision: `${page.snapshotRevision}:r${referenceRevision}`,
            artifacts: page.artifacts.map((artifact) =>
              artifact.status === "available"
                ? {
                    ...artifact,
                    payloadHash: `${artifact.payloadHash?.slice(0, -16)}${referenceRevision
                      .toString(16)
                      .padStart(16, "0")}`,
                  }
                : artifact,
            ),
          };
        }
        if (capability === "library.artifacts.read") {
          return dataset.readArtifact(payload);
        }
        if (capability === "effects.tags.apply_batch") {
          const effects = Array.isArray(payload.effects) ? payload.effects : [];
          return {
            receipts: effects.map((effect) => ({
              effectId:
                effect && typeof effect === "object"
                  ? (effect as Record<string, unknown>).effectId
                  : "",
              status: "applied",
              action: "ensure_present",
              occurredAt: "2026-08-02T00:00:00.000Z",
              diagnostics: [],
            })),
          };
        }
        if (capability === "webdav.describe") return { configured: false };
        return { status: "unavailable", diagnostics: [] };
      },
    },
  });
  try {
    await applyTopicDatasetThroughProductionRoute({
      harness,
      dataset,
    });
    const operations = [];
    const setupCache = new Map<string, Promise<void>>();
    for (const operation of selectedOperations) {
      try {
        await setupOperationThroughProductionRoute({
          harness,
          operation,
          cache: setupCache,
        });
      } catch (error) {
        operations.push(unavailableOperation(name, operation, error));
        continue;
      }
      referenceRevision += 1;
      let tagStagedRevision =
        operation === "tag-effects"
          ? Number(
              (await harness.client.tags.loadTagVocabulary()).stagedRevision ||
                0,
            )
          : 0;
      const warmupTag =
        operation === "tag-effects"
          ? await stageTagEffectWorkload({
              harness,
              dataset,
              ordinal: -1,
              expectedStagedRevision: tagStagedRevision,
            })
          : undefined;
      await collectSample({
        harness,
        operation,
        tagEffects: dataset.tagEffects,
        stagedTag: warmupTag?.tag,
      });
      if (warmupTag) tagStagedRevision = warmupTag.stagedRevision + 1;
      const samples: SynthesisProductionRoutePerformanceSample[] = [];
      for (let index = 0; index < FORMAL_SAMPLE_COUNT; index += 1) {
        referenceRevision += 1;
        const stagedTag =
          operation === "tag-effects"
            ? await stageTagEffectWorkload({
                harness,
                dataset,
                ordinal: index,
                expectedStagedRevision: tagStagedRevision,
              })
            : undefined;
        samples.push(
          await collectSample({
            harness,
            operation,
            tagEffects: dataset.tagEffects,
            stagedTag: stagedTag?.tag,
          }),
        );
        if (stagedTag) tagStagedRevision = stagedTag.stagedRevision + 1;
      }
      operations.push(
        summarizeSynthesisProductionRouteOperation(name, operation, samples),
      );
    }
    const failures = operations.flatMap((result) =>
      result.failures.map((failure) => `${result.operation}:${failure}`),
    );
    return {
      name,
      role: name === "2k" ? "differential-smoke" : "governed",
      paperCount: dataset.paperCount,
      changedPaperCount: dataset.changedPaperRefs.length,
      tagEffectCount: dataset.tagEffects.length,
      operations,
      maxArtifactReadConcurrency: harness.recorder.maxActiveArtifactReads,
      failures,
      passed: failures.length === 0,
    };
  } finally {
    await harness.stop();
  }
}

export async function buildSynthesisProductionRoutePerformanceReport() {
  const datasets = [];
  for (const name of ["2k", "10k", "25k"] as const) {
    try {
      datasets.push(await runSynthesisProductionRoutePerformanceDataset(name));
    } catch (error) {
      datasets.push({
        name,
        role: name === "2k" ? "differential-smoke" : "governed",
        paperCount: name === "2k" ? 2_000 : name === "10k" ? 10_000 : 25_000,
        changedPaperCount: 50,
        tagEffectCount: 250,
        operations: scenarioOperations(name).map((operation) =>
          unavailableOperation(name, operation, error),
        ),
        maxArtifactReadConcurrency: null,
      });
    }
  }
  const dataset = (name: DatasetName) =>
    datasets.find((candidate) => candidate.name === name)!;
  const operation = (name: DatasetName, value: OperationName) =>
    dataset(name).operations.find(
      (candidate) => candidate.operation === value,
    )!;
  const topic2k = operation("2k", "topic-page");
  const topic25k = operation("25k", "topic-page");
  const graphChecks = (["10k", "25k"] as const).flatMap((name) =>
    (["graph-slice", "graph-metrics"] as const).map((value) => {
      const result = operation(name, value);
      return {
        dataset: name,
        operation: value,
        passed:
          result.sqlQueryCount.p95 !== null &&
          result.sqlQueryCount.p95 <= 20 &&
          result.responseBytes.p95 !== null &&
          result.responseBytes.p95 <= 768 * 1024 &&
          result.returnedCount.p95 !== null &&
          result.returnedCount.p95 <= (value === "graph-slice" ? 130 : 50),
      };
    }),
  );
  const reference = operation("10k", "reference-refresh");
  const expectedItemPages = Math.ceil(dataset("10k").paperCount / 100);
  const expectedArtifactPages = Math.ceil(
    (dataset("10k").paperCount * 3) / 100,
  );
  const referenceGate = {
    passed:
      reference.host.itemPageCalls.p50 === expectedItemPages &&
      reference.host.artifactPageCalls.p50 === expectedArtifactPages &&
      reference.host.artifactReadCalls.p95 !== null &&
      reference.host.artifactReadCalls.p95 <= 100 &&
      Number(dataset("10k").maxArtifactReadConcurrency) <= 2,
    expectedItemPages,
    expectedArtifactPages,
    changedPaperCount: dataset("10k").changedPaperCount,
    maxArtifactReadConcurrency: dataset("10k").maxArtifactReadConcurrency,
  };
  const tag = operation("10k", "tag-effects");
  const expectedTagCalls = Math.ceil(
    dataset("10k").tagEffectCount / TAG_EFFECT_BATCH_LIMIT,
  );
  const tagGate = {
    passed:
      tag.host.effectCallCount.p50 === expectedTagCalls &&
      tag.host.effectBatchSizes.every((sample) =>
        sample.every((size) => size <= TAG_EFFECT_BATCH_LIMIT),
      ),
    effectCount: dataset("10k").tagEffectCount,
    batchLimit: TAG_EFFECT_BATCH_LIMIT,
    expectedCalls: expectedTagCalls,
    observedCalls: tag.host.effectCallCount,
  };
  const rssChecks = (["10k", "25k"] as const).map((name) => {
    const reads = dataset(name).operations.filter((candidate) =>
      [
        "topic-page",
        "chrome",
        "index",
        "graph-slice",
        "graph-metrics",
      ].includes(candidate.operation),
    );
    const supported = reads.every((candidate) => candidate.rss.supported);
    const peak = Math.max(
      0,
      ...reads.flatMap((candidate) => candidate.rss.bytes.samples),
    );
    return {
      dataset: name,
      rssSupported: supported,
      rssBytes: supported ? peak : null,
      budgetBytes: name === "10k" ? UI_RSS_BUDGET_BYTES : null,
      passed:
        (process.platform !== "linux" || supported) &&
        (name !== "10k" || (supported && peak < UI_RSS_BUDGET_BYTES)),
    };
  });
  const topicQuerySamples = [
    ...topic2k.sqlQueryCount.samples,
    ...topic25k.sqlQueryCount.samples,
  ];
  const gates = {
    topicConstantQueries: {
      passed:
        topic2k.sqlQueryCount.samples.length === FORMAL_SAMPLE_COUNT &&
        topic25k.sqlQueryCount.samples.length === FORMAL_SAMPLE_COUNT &&
        topic2k.returnedCount.p95 !== null &&
        topic2k.returnedCount.p95 > 0 &&
        topic25k.passed &&
        topicQuerySamples.every((count) => count === topicQuerySamples[0]),
      queryCount2k: topic2k.sqlQueryCount,
      queryCount25k: topic25k.sqlQueryCount,
    },
    graphWindows: graphChecks,
    referenceOneSnapshot: referenceGate,
    tagEffectBatching: tagGate,
    rss: rssChecks,
  };
  const operationFailures = datasets.flatMap((entry) =>
    entry.operations.flatMap((result) =>
      result.failures.map(
        (failure) => `${entry.name}:${result.operation}:${failure}`,
      ),
    ),
  );
  const gateFailures = [
    !gates.topicConstantQueries.passed && "topic_constant_queries",
    ...gates.graphWindows.map(
      (entry) => !entry.passed && `${entry.dataset}:${entry.operation}`,
    ),
    !gates.referenceOneSnapshot.passed && "reference_one_snapshot",
    !gates.tagEffectBatching.passed && "tag_effect_batching",
    ...gates.rss.map((entry) => !entry.passed && `${entry.dataset}:rss`),
  ].filter((value): value is string => Boolean(value));
  const failures = [...operationFailures, ...gateFailures];
  return {
    schema: "synthesis-production-route-performance.v1",
    samplePolicy: { warmup: 1, formalSamples: FORMAL_SAMPLE_COUNT },
    datasets,
    gates,
    failures,
    passed: failures.length === 0,
  };
}

async function main() {
  const datasetArgument = process.argv.find((value) =>
    value.startsWith("--dataset="),
  );
  const operationArgument = process.argv.find((value) =>
    value.startsWith("--operation="),
  );
  if (datasetArgument || operationArgument) {
    const dataset = datasetArgument?.slice("--dataset=".length) as
      | DatasetName
      | undefined;
    const operation = operationArgument?.slice("--operation=".length) as
      | OperationName
      | undefined;
    if (!dataset || !["2k", "10k", "25k"].includes(dataset)) {
      throw new Error("focused performance run requires a valid --dataset");
    }
    const selected = operation ? [operation] : scenarioOperations(dataset);
    let result: Awaited<
      ReturnType<typeof runSynthesisProductionRoutePerformanceDataset>
    >;
    try {
      result = await runSynthesisProductionRoutePerformanceDataset(
        dataset,
        selected,
      );
    } catch (error) {
      result = {
        name: dataset,
        role: dataset === "2k" ? "differential-smoke" : "governed",
        paperCount:
          dataset === "2k" ? 2_000 : dataset === "10k" ? 10_000 : 25_000,
        changedPaperCount: 50,
        tagEffectCount: 250,
        operations: [],
        maxArtifactReadConcurrency: null,
        failures: [error instanceof Error ? error.message : "unknown_error"],
        passed: false,
      };
    }
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (!result.passed) process.exitCode = 1;
    return;
  }
  let report: Awaited<
    ReturnType<typeof buildSynthesisProductionRoutePerformanceReport>
  >;
  try {
    report = await buildSynthesisProductionRoutePerformanceReport();
  } catch (error) {
    report = {
      schema: "synthesis-production-route-performance.v1",
      samplePolicy: { warmup: 1, formalSamples: FORMAL_SAMPLE_COUNT },
      datasets: [],
      gates: {
        topicConstantQueries: { passed: false },
        graphWindows: [],
        referenceOneSnapshot: { passed: false },
        tagEffectBatching: { passed: false },
        rss: [],
      } as never,
      failures: [error instanceof Error ? error.message : "unknown_error"],
      passed: false,
    };
  }
  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (!report.passed) process.exitCode = 1;
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  await main();
}

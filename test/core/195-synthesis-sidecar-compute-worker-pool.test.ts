import { assert } from "chai";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { Worker, type WorkerOptions } from "node:worker_threads";
import {
  createInProcessSynthesisConceptKbIndexEngine,
  rebuildSynthesisConceptKbIndexRequest,
  rebuildSynthesisConceptKbQueryRequest,
} from "../../packages/synthesis-engine/src/conceptKbIndex";
import {
  canonicalizeSynthesisEngineJson,
  createInProcessSynthesisCitationGraphLayoutEngine,
  createInProcessSynthesisCitationGraphMetricsEngine,
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphMetricsRequest,
  type SynthesisCitationGraphLayoutRequest,
  type SynthesisCitationGraphMetricsRequest,
} from "../../packages/synthesis-engine/src/index";
import {
  buildSynthesisCitationGraphBuildTransferPage,
  rebuildSynthesisCitationGraphBuildTransferPage,
} from "../../packages/synthesis-engine/src/citationGraphBuildTransfer";
import {
  createInProcessSynthesisCitationGraphBuildEngine,
  rebuildSynthesisCitationGraphBuildRequest,
  type SynthesisCitationGraphBuildRequest,
} from "../../packages/synthesis-engine/src/citationGraphBuild";
import {
  createInProcessSynthesisTagVocabularyEngine,
  rebuildSynthesisTagVocabularyIndexRequest,
  rebuildSynthesisTagVocabularyValidationRequest,
} from "../../packages/synthesis-engine/src/tagVocabulary";
import {
  createInProcessSynthesisTopicGraphIndexEngine,
  rebuildSynthesisTopicGraphIndexRequest,
} from "../../packages/synthesis-engine/src/topicGraphIndex";
import { SYNTHESIS_SIDECAR_PROTOCOL } from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  ComputeWorkerPoolError,
  createSynthesisSidecarComputeWorkerPool,
  SYNTHESIS_SIDECAR_COMPUTE_LIMITS,
  SYNTHESIS_SIDECAR_TRANSFER_EXECUTION_TIMEOUT_MS,
} from "../../apps/synthesis-service/src/computeWorkerPool";
import { startSynthesisSidecarServer } from "../../apps/synthesis-service/src/server";
import type { SynthesisSidecarRuntimeConfig } from "../../apps/synthesis-service/src/runtimeConfig";
import { createSynthesisSidecarComputeClient } from "../../src/modules/synthesisSidecarComputeClient";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BUILT_WORKER = new URL(
  "../../.scaffold/synthesis-service/apps/synthesis-service/src/computeWorker.js",
  import.meta.url,
);
const FIXTURE_WORKER = new URL(
  "../fixtures/synthesis-sidecar-compute-worker.mjs",
  import.meta.url,
);
const RUST_METRICS_FIXTURE = path.join(
  ROOT,
  "native/synthesis-sidecar/target/debug",
  `synthesis-metrics-worker-fixture${process.platform === "win32" ? ".exe" : ""}`,
);
const CLIENT_TOKEN = "client-token-0123456789abcdef0123456789abcdef";

function request(prefix = "0"): SynthesisCitationGraphLayoutRequest {
  return rebuildSynthesisCitationGraphLayoutRequest({
    graphHash: `sha256:${prefix}${"0".repeat(63)}`,
    algorithm: "components",
    nodes: [
      {
        nodeId: "zotero:item:AAAA1111",
        kind: "library_paper",
        title: "Paper",
        year: "2024",
        initialX: 0,
        initialY: 0,
      },
    ],
    edges: [],
  });
}

function metricsRequest(prefix = "0"): SynthesisCitationGraphMetricsRequest {
  return rebuildSynthesisCitationGraphMetricsRequest({
    graphHash: `sha256:${prefix}${"0".repeat(63)}`,
    nodes: [
      {
        nodeId: "zotero:item:AAAA1111",
        kind: "library_paper",
        libraryId: 1,
        itemKey: "AAAA1111",
        title: "Paper",
        year: "2024",
      },
    ],
    edges: [],
  });
}

function graphBuildRequest(prefix = "0"): SynthesisCitationGraphBuildRequest {
  return rebuildSynthesisCitationGraphBuildRequest({
    contractVersion: "synthesis-citation-graph-build.v1",
    scope: { kind: "full", sourceIds: [] },
    rolePriority: prefix === "0" ? [] : [prefix],
    libraryNodes: [
      {
        nodeId: "paper:A",
        title: "Paper",
        authors: [],
        aliases: [],
      },
    ],
    references: [],
  });
}

function tagValidationRequest() {
  return rebuildSynthesisTagVocabularyValidationRequest({
    contractVersion: "synthesis-tag-vocabulary.v1",
    algorithmVersion: "tag-vocabulary-validation.v1",
    entries: [
      {
        tag: "ai_task:NER",
        facet: "ai_task",
        aliases: [],
        abbrev: [],
      },
    ],
    aliases: {},
    abbrev: { ner: "NER" },
    protocol: {
      version: "1.0.0",
      tagPattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$",
      maxTagLength: 120,
      facets: ["ai_task"],
    },
  });
}

function tagIndexRequest() {
  return rebuildSynthesisTagVocabularyIndexRequest({
    ...tagValidationRequest(),
    algorithmVersion: "tag-vocabulary-index.v1",
    sourceManifestHash: `sha256:${"a".repeat(64)}`,
    rebuiltAt: "2026-07-18T00:00:00.000Z",
  });
}

function conceptSource() {
  return {
    concepts: [
      {
        conceptId: "concept:vision",
        label: "Vision",
        aliases: ["CV"],
        conceptType: "method",
        domain: "research",
        status: "active" as const,
      },
    ],
    senses: [],
    aliases: [
      {
        aliasId: "alias:cv",
        alias: "CV",
        normalized: "cv",
        conceptId: "concept:vision",
        status: "active" as const,
        confidence: "high" as const,
      },
    ],
  };
}

function conceptIndexRequest() {
  return rebuildSynthesisConceptKbIndexRequest({
    contractVersion: "synthesis-concept-kb-index.v1",
    algorithmVersion: "concept-kb-index.v1",
    ...conceptSource(),
    sourceManifestHash: `sha256:${"b".repeat(64)}`,
    rebuiltAt: "2026-07-18T00:00:00.000Z",
  });
}

function conceptQueryRequest() {
  return rebuildSynthesisConceptKbQueryRequest({
    contractVersion: "synthesis-concept-kb-index.v1",
    algorithmVersion: "concept-kb-query.v1",
    ...conceptSource(),
    labels: ["CV"],
  });
}

function topicGraphIndexRequest() {
  return rebuildSynthesisTopicGraphIndexRequest({
    contractVersion: "synthesis-topic-graph-index.v1",
    algorithmVersion: "topic-graph-index.v1",
    sourceManifestHash: `sha256:${"c".repeat(64)}`,
    rebuiltAt: "2026-07-18T00:00:00.000Z",
    nodes: [
      {
        topicId: "topic:root",
        isRoot: true,
        level: "top",
        definitionStatus: "has_synthesis",
      },
      {
        topicId: "topic:child",
        isRoot: false,
        level: "normal",
        definitionStatus: "placeholder",
      },
    ],
    edges: [
      {
        edgeId: "edge:root-child",
        sourceTopicId: "topic:child",
        targetTopicId: "topic:root",
        relation: "broader_than",
        status: "confirmed",
      },
    ],
  });
}

function errorCode(error: unknown) {
  return error instanceof ComputeWorkerPoolError ? error.code : "unknown";
}

function fixturePool(
  overrides: {
    executionTimeoutMs?: number;
    cancellationGraceMs?: number;
    shutdownTimeoutMs?: number;
    transferExecutionTimeoutMs?: number;
  } = {},
) {
  return createSynthesisSidecarComputeWorkerPool({
    workerUrl: FIXTURE_WORKER,
    rustWorkerPath: RUST_METRICS_FIXTURE,
    executionTimeoutMs: overrides.executionTimeoutMs ?? 250,
    cancellationGraceMs: overrides.cancellationGraceMs ?? 20,
    shutdownTimeoutMs: overrides.shutdownTimeoutMs ?? 100,
    transferExecutionTimeoutMs: overrides.transferExecutionTimeoutMs,
  });
}

function runtimeConfig(): SynthesisSidecarRuntimeConfig {
  return {
    schema: "synthesis-sidecar-launch-config.v1",
    profileId: "1".repeat(64),
    profileRuntimeRoot: path.join(ROOT, ".scaffold/test-sidecar-profile"),
    runtimeRootId: "2".repeat(64),
    dataRootId: "3".repeat(64),
    bundleId: "4".repeat(64),
    nodeVersion: "24.18.0",
    serviceVersion: "0.1.0-test",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: "synthesis-schema.test.v1",
    supervisorInstanceId: "supervisor-test",
    leaseNonce: "lease-test",
    clientToken: CLIENT_TOKEN,
    lifecycleToken: "lifecycle-token-0123456789abcdef0123456789abcdef",
    mutationEnabled: false,
    port: 0,
  };
}

async function httpCall(args: {
  baseUrl: string;
  config: SynthesisSidecarRuntimeConfig;
  capability: string;
  payload: Record<string, unknown>;
  lifecycle?: boolean;
  signal?: AbortSignal;
}) {
  const response = await fetch(`${args.baseUrl}/synthesis/v1/call`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${
        args.lifecycle ? args.config.lifecycleToken : args.config.clientToken
      }`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      protocol: SYNTHESIS_SIDECAR_PROTOCOL,
      requestId: `request:${args.capability}:${Date.now()}`,
      profileId: args.config.profileId,
      capability: args.capability,
      payload: args.payload,
    }),
    signal: args.signal,
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

describe("Synthesis sidecar compute worker pool", function () {
  this.timeout(15_000);

  before(function () {
    execFileSync(
      process.execPath,
      [
        path.join(ROOT, "node_modules/typescript/bin/tsc"),
        "-p",
        path.join(ROOT, "apps/synthesis-service/tsconfig.build.json"),
      ],
      { cwd: ROOT, stdio: "pipe" },
    );
  });

  it("lazily switches resource-bounded backends and matches all direct kernels", async function () {
    assert.deepEqual(SYNTHESIS_SIDECAR_COMPUTE_LIMITS, {
      concurrency: 1,
      maxQueued: 2,
      executionTimeoutMs: 5_000,
      cancellationGraceMs: 100,
      shutdownTimeoutMs: 500,
      resourceLimits: {
        maxOldGenerationSizeMb: 256,
        maxYoungGenerationSizeMb: 32,
        stackSizeMb: 4,
      },
    });
    assert.equal(SYNTHESIS_SIDECAR_TRANSFER_EXECUTION_TIMEOUT_MS, 30_000);
    let spawns = 0;
    let options: WorkerOptions | undefined;
    const pool = createSynthesisSidecarComputeWorkerPool({
      workerUrl: BUILT_WORKER,
      workerFactory(url, workerOptions) {
        spawns += 1;
        options = workerOptions;
        return new Worker(url, workerOptions);
      },
    });
    assert.equal(spawns, 0);
    assert.deepEqual(pool.snapshot(), {
      state: "idle",
      active: 0,
      queued: 0,
      restartCount: 0,
      failureCount: 0,
    });
    try {
      const input = request();
      const metricsInput = metricsRequest();
      const graphBuildInput = graphBuildRequest();
      const tagValidationInput = tagValidationRequest();
      const tagIndexInput = tagIndexRequest();
      const conceptIndexInput = conceptIndexRequest();
      const conceptQueryInput = conceptQueryRequest();
      const topicGraphInput = topicGraphIndexRequest();
      const [
        workerResult,
        directResult,
        workerMetrics,
        directMetrics,
        workerGraphBuild,
        directGraphBuild,
      ] = await Promise.all([
        pool.runCitationGraphLayout(input),
        createInProcessSynthesisCitationGraphLayoutEngine().compute(input),
        pool.runCitationGraphMetrics(metricsInput),
        createInProcessSynthesisCitationGraphMetricsEngine().compute(
          metricsInput,
        ),
        pool.runCitationGraphBuild(graphBuildInput),
        createInProcessSynthesisCitationGraphBuildEngine().compute(
          graphBuildInput,
        ),
      ]);
      assert.deepEqual(workerResult, directResult);
      assert.deepEqual(workerMetrics, directMetrics);
      assert.deepEqual(workerGraphBuild, directGraphBuild);
      const workerTagValidation =
        await pool.runTagVocabularyValidation(tagValidationInput);
      const directTagValidation =
        createInProcessSynthesisTagVocabularyEngine().validate(
          tagValidationInput,
        );
      const workerTagIndex = await pool.runTagVocabularyIndex(tagIndexInput);
      const directTagIndex =
        createInProcessSynthesisTagVocabularyEngine().buildIndex(tagIndexInput);
      assert.deepEqual(workerTagValidation, directTagValidation);
      assert.deepEqual(workerTagIndex, directTagIndex);
      const conceptEngine = createInProcessSynthesisConceptKbIndexEngine();
      assert.deepEqual(
        await pool.runConceptKbIndex(conceptIndexInput),
        await conceptEngine.buildIndex(conceptIndexInput),
      );
      assert.deepEqual(
        await pool.runConceptKbQuery(conceptQueryInput),
        await conceptEngine.query(conceptQueryInput),
      );
      assert.deepEqual(
        await pool.runTopicGraphIndex(topicGraphInput),
        await createInProcessSynthesisTopicGraphIndexEngine().buildIndex(
          topicGraphInput,
        ),
      );
      assert.equal(spawns, 2);
      assert.deepEqual(options?.resourceLimits, {
        maxOldGenerationSizeMb: 256,
        maxYoungGenerationSizeMb: 32,
        stackSizeMb: 4,
      });
    } finally {
      await pool.shutdown();
    }
  });

  it("pages deterministic requests and results larger than one worker frame page", async function () {
    const entries = Array.from({ length: 1_250 }, (_, index) => ({
      tag: `field:item_${String(index).padStart(4, "0")}`,
      facet: "field",
      note: "x".repeat(3_500),
      aliases: [],
      abbrev: [],
    }));
    const request = rebuildSynthesisTagVocabularyIndexRequest({
      contractVersion: "synthesis-tag-vocabulary.v1",
      algorithmVersion: "tag-vocabulary-index.v1",
      entries,
      aliases: {},
      abbrev: {},
      protocol: {
        version: "1.0.0",
        tagPattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$",
        maxTagLength: 120,
        facets: ["field"],
      },
      sourceManifestHash: `sha256:${"d".repeat(64)}`,
      rebuiltAt: "2026-07-19T00:00:00.000Z",
    });
    const pool = createSynthesisSidecarComputeWorkerPool({
      workerUrl: BUILT_WORKER,
    });
    try {
      const result = await pool.runTagVocabularyIndex(request);
      assert.lengthOf(result.tags, entries.length);
      assert.lengthOf(result.search, entries.length);
      assert.deepEqual(
        result,
        createInProcessSynthesisTagVocabularyEngine().buildIndex(request),
      );
    } finally {
      await pool.shutdown();
    }
  });

  it("streams one acknowledged page at a time through the real worker", async function () {
    const pool = createSynthesisSidecarComputeWorkerPool({
      workerUrl: BUILT_WORKER,
    });
    const library = buildSynthesisCitationGraphBuildTransferPage(
      "library_nodes",
      0,
      [{ nodeId: "paper:A", authors: [], aliases: [] }],
    );
    const references = buildSynthesisCitationGraphBuildTransferPage(
      "references",
      0,
      [],
    );
    const output: unknown[] = [];
    let publishing = false;
    try {
      await pool.runCitationGraphBuildTransfer({
        header: {
          contractVersion: "synthesis-citation-graph-build.v1",
          scope: { kind: "full", sourceIds: [] },
          rolePriority: [],
        },
        async *inputPages() {
          for (const page of [library, references]) {
            const encoded = new TextEncoder().encode(
              canonicalizeSynthesisEngineJson(page.rows),
            );
            yield {
              descriptor: page.descriptor,
              bytes: encoded.buffer as ArrayBuffer,
            };
          }
        },
        outputStarted() {
          publishing = true;
        },
        outputPage(frame) {
          assert.isTrue(publishing);
          output.push(
            rebuildSynthesisCitationGraphBuildTransferPage({
              descriptor: frame.descriptor,
              rows: JSON.parse(new TextDecoder().decode(frame.bytes)),
            }),
          );
        },
        outputComplete(header) {
          assert.equal(
            header.contractVersion,
            "synthesis-citation-graph-build.v1",
          );
        },
      });
      assert.isNotEmpty(output);
      assert.equal(pool.snapshot().state, "idle");
    } finally {
      await pool.shutdown();
    }
  });

  it("applies a transfer-only active deadline", async function () {
    const pool = fixturePool({ transferExecutionTimeoutMs: 30 });
    try {
      assert.equal(
        await pool
          .runCitationGraphBuildTransfer({
            header: {},
            async *inputPages() {
              yield* [];
            },
            outputStarted() {},
            outputPage() {},
            outputComplete() {},
          })
          .then(() => "success")
          .catch(errorCode),
        "worker_timeout",
      );
    } finally {
      await pool.shutdown();
    }
  });

  it("cancels streaming transfer and applies its failures to the shared fuse", async function () {
    const run = {
      header: {},
      async *inputPages() {
        yield* [];
      },
      outputStarted() {},
      outputPage() {},
      outputComplete() {},
    };
    const canceledPool = fixturePool({ transferExecutionTimeoutMs: 1_000 });
    const controller = new AbortController();
    const canceled = canceledPool
      .runCitationGraphBuildTransfer(run, { signal: controller.signal })
      .then(() => "success")
      .catch(errorCode);
    await new Promise((resolve) => setTimeout(resolve, 10));
    controller.abort();
    assert.equal(await canceled, "worker_canceled");
    await canceledPool.shutdown();

    const failedPool = fixturePool({ transferExecutionTimeoutMs: 20 });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      assert.equal(
        await failedPool
          .runCitationGraphBuildTransfer(run)
          .then(() => "success")
          .catch(errorCode),
        "worker_timeout",
      );
    }
    assert.equal(failedPool.snapshot().state, "degraded");
    await failedPool.shutdown();
  });

  it("shares admission bounds across layout, metrics, and graph build", async function () {
    const pool = fixturePool({ shutdownTimeoutMs: 100 });
    const tasks = [
      pool.runCitationGraphLayout(request("a")).catch(errorCode),
      pool.runCitationGraphMetrics(metricsRequest("a")).catch(errorCode),
      pool.runCitationGraphBuild(graphBuildRequest("a")).catch(errorCode),
    ];
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(pool.snapshot(), {
      state: "busy",
      active: 1,
      queued: 2,
      restartCount: 0,
      failureCount: 0,
    });
    assert.equal(
      await pool.runCitationGraphBuild(graphBuildRequest("a")).catch(errorCode),
      "worker_busy",
    );
    await pool.shutdown();
    assert.deepEqual(await Promise.all(tasks), [
      "worker_canceled",
      "worker_canceled",
      "worker_canceled",
    ]);
  });

  it("shares the degraded fuse across all operation failures", async function () {
    const pool = fixturePool({ executionTimeoutMs: 500 });
    assert.equal(
      await pool.runCitationGraphBuild(graphBuildRequest("b")).catch(errorCode),
      "worker_crashed",
    );
    assert.equal(
      await pool.runCitationGraphMetrics(metricsRequest("b")).catch(errorCode),
      "worker_crashed",
    );
    assert.equal(
      await pool.runCitationGraphLayout(request("b")).catch(errorCode),
      "worker_crashed",
    );
    assert.deepEqual(pool.snapshot(), {
      state: "degraded",
      active: 0,
      queued: 0,
      restartCount: 3,
      failureCount: 3,
    });
    assert.equal(
      await pool.runCitationGraphBuild(graphBuildRequest()).catch(errorCode),
      "worker_unavailable",
    );
    await pool.shutdown();
  });

  it("bounds admission, removes queued aborts, and terminates active aborts", async function () {
    const pool = fixturePool();
    const activeAbort = new AbortController();
    const queuedAbort = new AbortController();
    const active = pool
      .runCitationGraphLayout(request("a"), { signal: activeAbort.signal })
      .catch(errorCode);
    const queued = pool
      .runCitationGraphLayout(request("a"), { signal: queuedAbort.signal })
      .catch(errorCode);
    const secondQueued = pool
      .runCitationGraphLayout(request())
      .then(() => "success")
      .catch(errorCode);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(pool.snapshot(), {
      state: "busy",
      active: 1,
      queued: 2,
      restartCount: 0,
      failureCount: 0,
    });
    assert.equal(
      await pool.runCitationGraphLayout(request("a")).catch(errorCode),
      "worker_busy",
    );
    queuedAbort.abort();
    assert.equal(await queued, "worker_canceled");
    activeAbort.abort();
    assert.equal(await active, "worker_canceled");
    assert.equal(await secondQueued, "success");
    await pool.shutdown();

    const timeoutPool = fixturePool();
    assert.equal(
      await timeoutPool.runCitationGraphLayout(request("a")).catch(errorCode),
      "worker_timeout",
    );
    assert.equal(timeoutPool.snapshot().restartCount, 1);
    assert.equal(timeoutPool.snapshot().failureCount, 1);
    await timeoutPool.shutdown();
  });

  it("replaces runtime faults and degrades after three consecutive failures", async function () {
    const pool = fixturePool({ executionTimeoutMs: 500 });
    assert.equal(
      await pool.runCitationGraphLayout(request("d")).catch(errorCode),
      "worker_crashed",
    );
    assert.equal(
      (await pool.runCitationGraphLayout(request())).nodes.length,
      1,
    );
    for (let index = 1; index <= 3; index += 1) {
      assert.equal(
        await pool.runCitationGraphLayout(request("b")).catch(errorCode),
        "worker_crashed",
      );
      assert.equal(pool.snapshot().failureCount, index + 1);
    }
    assert.deepEqual(pool.snapshot(), {
      state: "degraded",
      active: 0,
      queued: 0,
      restartCount: 4,
      failureCount: 4,
    });
    assert.equal(
      await pool.runCitationGraphLayout(request()).catch(errorCode),
      "worker_unavailable",
    );
    await pool.shutdown();

    const restarted = createSynthesisSidecarComputeWorkerPool({
      workerUrl: BUILT_WORKER,
    });
    try {
      assert.equal(restarted.snapshot().state, "idle");
      assert.equal(
        (await restarted.runCitationGraphLayout(request())).nodes.length,
        1,
      );
    } finally {
      await restarted.shutdown();
    }
  });

  it("classifies invalid results and clears a full pool within shutdown budget", async function () {
    const invalidPool = fixturePool({ executionTimeoutMs: 500 });
    assert.equal(
      await invalidPool.runCitationGraphLayout(request("c")).catch(errorCode),
      "worker_result_invalid",
    );
    await invalidPool.shutdown();

    const pool = fixturePool({ shutdownTimeoutMs: 100 });
    const tasks = [
      pool.runCitationGraphLayout(request("a")).catch(errorCode),
      pool.runCitationGraphLayout(request("a")).catch(errorCode),
      pool.runCitationGraphLayout(request("a")).catch(errorCode),
    ];
    await new Promise((resolve) => setTimeout(resolve, 10));
    const startedAt = Date.now();
    await pool.shutdown();
    assert.isAtMost(Date.now() - startedAt, 150);
    assert.deepEqual(await Promise.all(tasks), [
      "worker_canceled",
      "worker_canceled",
      "worker_canceled",
    ]);
    assert.equal(pool.snapshot().state, "stopping");
  });

  it("keeps real HTTP health and handshake responsive and supports the strict internal client", async function () {
    const config = runtimeConfig();
    const pool = createSynthesisSidecarComputeWorkerPool({
      workerUrl: BUILT_WORKER,
    });
    const runtime = await startSynthesisSidecarServer(config, "service-test", {
      computePool: pool,
    });
    const baseUrl = `http://${runtime.host}:${runtime.port}`;
    try {
      const client = createSynthesisSidecarComputeClient();
      const compute = client.computeCitationGraphLayout(
        {
          baseUrl,
          profileId: config.profileId,
          clientToken: config.clientToken,
          serviceInstanceId: "service-test",
        },
        request(),
      );
      const [health, result] = await Promise.all([
        fetch(`${baseUrl}/synthesis/v1/health`).then((response) =>
          response.json(),
        ) as Promise<Record<string, unknown>>,
        compute,
      ]);
      assert.equal(health.status, "ok");
      assert.property(health, "computePool");
      assert.equal(result.nodes.length, 1);
    } finally {
      runtime.beginShutdown("test_complete");
      await runtime.stopped;
    }
  });

  it("makes the internal compute client deadline-aware and strict about results", async function () {
    const connection = {
      baseUrl: "http://127.0.0.1:1",
      profileId: "1".repeat(64),
      clientToken: CLIENT_TOKEN,
      serviceInstanceId: "service-test",
    };
    const invalidClient = createSynthesisSidecarComputeClient({
      fetch: async () =>
        new Response(JSON.stringify({ ok: true, data: {} }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });
    let invalidResultRejected = false;
    try {
      await invalidClient.computeCitationGraphLayout(connection, request());
    } catch {
      invalidResultRejected = true;
    }
    assert.isTrue(invalidResultRejected);

    let deadlineObserved = false;
    const deadlineClient = createSynthesisSidecarComputeClient({
      deadlineMs: 20,
      fetch: async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => {
              deadlineObserved = true;
              reject(init.signal?.reason);
            },
            { once: true },
          );
        }),
    });
    await deadlineClient
      .computeCitationGraphLayout(connection, request())
      .catch(() => undefined);
    assert.isTrue(deadlineObserved);
  });

  it("keeps health, handshake, disconnect cancellation, and shutdown responsive under saturation", async function () {
    const config = runtimeConfig();
    const pool = fixturePool({
      executionTimeoutMs: 5_000,
      cancellationGraceMs: 20,
      shutdownTimeoutMs: 100,
    });
    const runtime = await startSynthesisSidecarServer(config, "service-busy", {
      computePool: pool,
    });
    const baseUrl = `http://${runtime.host}:${runtime.port}`;
    const controller = new AbortController();
    const disconnected = httpCall({
      baseUrl,
      config,
      capability: "compute.citation_graph_layout",
      payload: request("a"),
      signal: controller.signal,
    }).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 20));
    controller.abort();
    await disconnected;
    const disconnectDeadline = Date.now() + 500;
    while (pool.snapshot().active && Date.now() < disconnectDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.deepEqual(pool.snapshot(), {
      state: "idle",
      active: 0,
      queued: 0,
      restartCount: 0,
      failureCount: 0,
    });

    const computes = [0, 1, 2].map(() =>
      httpCall({
        baseUrl,
        config,
        capability: "compute.citation_graph_layout",
        payload: request("a"),
      }).catch(() => undefined),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(pool.snapshot().queued, 2);
    const startedAt = Date.now();
    const [health, handshake] = await Promise.all([
      fetch(`${baseUrl}/synthesis/v1/health`).then((response) =>
        response.json(),
      ) as Promise<{ computePool: { state: string; queued: number } }>,
      httpCall({
        baseUrl,
        config,
        capability: "system.handshake",
        payload: {
          schemaVersion: config.schemaVersion,
          bundleId: config.bundleId,
          supervisorInstanceId: config.supervisorInstanceId,
        },
      }),
    ]);
    assert.isBelow(Date.now() - startedAt, 250);
    assert.deepEqual(health.computePool, {
      state: "busy",
      active: 1,
      queued: 2,
      restartCount: 0,
      failureCount: 0,
    });
    assert.equal(handshake.status, 200);
    assert.deepEqual(
      (handshake.body.data as { computePool: unknown }).computePool,
      health.computePool,
    );
    const shutdown = await httpCall({
      baseUrl,
      config,
      capability: "system.shutdown",
      payload: {},
      lifecycle: true,
    });
    assert.equal(shutdown.status, 200);
    await runtime.stopped;
    await Promise.all(computes);
    assert.equal(pool.snapshot().state, "stopping");
  });
});

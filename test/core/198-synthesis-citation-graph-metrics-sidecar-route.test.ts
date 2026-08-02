import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import {
  createInProcessSynthesisCitationGraphMetricsEngine,
  rebuildSynthesisCitationGraphMetricsRequest,
  type SynthesisCitationGraphMetricsRequest,
} from "../../packages/synthesis-engine/src/index";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PROTOCOL,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import type { SynthesisSidecarRuntimeConfig } from "../../apps/synthesis-service/src/runtimeConfig";
import { createSynthesisSidecarComputeWorkerPool } from "../../apps/synthesis-service/src/computeWorkerPool";
import { startSynthesisSidecarServer } from "../../apps/synthesis-service/src/server";
import {
  createSynthesisSidecarComputeClient,
  SynthesisSidecarComputeClientError,
} from "../../src/modules/synthesisSidecarComputeClient";
import { createSynthesisSidecarCitationGraphMetricsEngine } from "../../src/modules/synthesis/sidecarCitationGraphMetricsEngineAdapter";
import type { SynthesisSidecarControlConnection } from "../../src/modules/synthesisSidecarControlClient";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CLIENT_TOKEN = "client-token-0123456789abcdef0123456789abcdef";
const SERVICE_INSTANCE_ID = "metrics-route-service-instance";

function metricsRequest(): SynthesisCitationGraphMetricsRequest {
  return rebuildSynthesisCitationGraphMetricsRequest({
    graphHash: `sha256:${"b".repeat(64)}`,
    nodes: [
      {
        nodeId: "zotero:item:AAAA1111",
        kind: "library_paper",
        libraryId: 1,
        itemKey: "AAAA1111",
        title: "Source",
        year: "2024",
      },
      {
        nodeId: "zotero:item:BBBB2222",
        kind: "library_paper",
        libraryId: 1,
        itemKey: "BBBB2222",
        title: "Target",
        year: "2020",
      },
      {
        nodeId: "ref:doi:10.1000/external",
        kind: "external_reference",
        title: "External",
        year: "2018",
      },
    ],
    edges: [
      {
        edgeId: "edge:source-target",
        source: "zotero:item:AAAA1111",
        target: "zotero:item:BBBB2222",
        mentionCount: 2,
      },
      {
        edgeId: "edge:target-external",
        source: "zotero:item:BBBB2222",
        target: "ref:doi:10.1000/external",
        mentionCount: 1,
      },
    ],
  });
}

function runtimeConfig(): SynthesisSidecarRuntimeConfig {
  return {
    schema: "synthesis-sidecar-launch-config.v3",
    profileId: "1".repeat(64),
    libraryId: 1,
    profileRuntimeRoot: path.join(ROOT, ".scaffold/test-sidecar-metrics-route"),
    runtimeRootId: "2".repeat(64),
    dataRootId: "3".repeat(64),
    bundleId: "4".repeat(64),
    implementation: "rust-native",
    target: "linux-x64",
    targetTriple: "x86_64-unknown-linux-gnu",
    buildFingerprint: "5".repeat(64),
    platformSignature: {
      scheme: "not-applicable",
      status: "not-applicable",
      signer: null,
    },
    serviceVersion: "0.1.0",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: "synthesis-repository-foundation.v1",
    supervisorInstanceId: "metrics-route-supervisor",
    repositoryDbPath: path.join(
      ROOT,
      ".scaffold/test-sidecar-metrics-route/state/synthesis.db",
    ),
    canonicalRoot: path.join(
      ROOT,
      ".scaffold/test-sidecar-metrics-route/data/synthesis",
    ),
    reverseHost: {
      host: "127.0.0.1",
      port: 1,
      authorizationToken: "reverse-host-token-0123456789abcdef",
    },
    clientToken: CLIENT_TOKEN,
    lifecycleToken: "lifecycle-token-0123456789abcdef0123456789abcdef",
    port: 0,
  };
}

function readyConnection(
  config: SynthesisSidecarRuntimeConfig,
  port: number,
  serviceInstanceId = SERVICE_INSTANCE_ID,
): SynthesisSidecarControlConnection {
  return {
    clientToken: config.clientToken,
    lifecycleToken: config.lifecycleToken,
    discovery: {
      schema: "synthesis-sidecar-discovery.v2",
      profileId: config.profileId,
      supervisorInstanceId: config.supervisorInstanceId,
      serviceInstanceId,
      bundleId: config.bundleId,
      implementation: config.implementation,
      target: config.target,
      targetTriple: config.targetTriple,
      buildFingerprint: config.buildFingerprint,
      platformSignature: config.platformSignature,
      serviceVersion: config.serviceVersion,
      protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
      schemaVersion: config.schemaVersion,
      runtimeRootId: config.runtimeRootId,
      dataRootId: config.dataRootId,
      host: "127.0.0.1",
      port,
      pid: 12345,
      lifecycleState: "ready",
      tokenLocator: "supervisor-session",
      capabilities: [...SYNTHESIS_SIDECAR_CAPABILITIES],
    },
  };
}

function clientErrorCode(error: unknown) {
  return error instanceof SynthesisSidecarComputeClientError
    ? error.code
    : "unknown";
}

describe("Synthesis Citation Graph metrics production sidecar route", function () {
  this.timeout(10_000);

  it("matches the direct engine through real authenticated HTTP", async function () {
    const config = runtimeConfig();
    const direct = createInProcessSynthesisCitationGraphMetricsEngine();
    const pool = createSynthesisSidecarComputeWorkerPool();
    const runtime = await startSynthesisSidecarServer(
      config,
      SERVICE_INSTANCE_ID,
      { computePool: pool },
    );
    const engine = createSynthesisSidecarCitationGraphMetricsEngine({
      getReadyConnection: () => readyConnection(config, runtime.port),
    });
    const input = metricsRequest();
    try {
      assert.deepEqual(
        await engine.compute(input),
        await direct.compute(input),
      );
    } finally {
      runtime.beginShutdown("test_complete");
      await runtime.stopped;
    }
  });

  it("resolves a fresh connection and propagates the fixed deadline and lifecycle signal", async function () {
    const config = runtimeConfig();
    const connections = [
      readyConnection(config, 43221, "metrics-service-one"),
      readyConnection(config, 43222, "metrics-service-two"),
    ];
    const calls: Array<{
      baseUrl: string;
      serviceInstanceId: string;
      signal?: AbortSignal;
      deadlineMs?: number;
    }> = [];
    const controller = new AbortController();
    const direct = createInProcessSynthesisCitationGraphMetricsEngine();
    const engine = createSynthesisSidecarCitationGraphMetricsEngine({
      signal: controller.signal,
      getReadyConnection: () => connections.shift() ?? null,
      computeClient: {
        async computeCitationGraphMetrics(connection, input, options) {
          calls.push({
            baseUrl: connection.baseUrl,
            serviceInstanceId: connection.serviceInstanceId,
            ...options,
          });
          return direct.compute(input);
        },
      },
    });

    await engine.compute(metricsRequest());
    await engine.compute(metricsRequest());
    assert.deepEqual(
      calls.map((call) => [
        call.baseUrl,
        call.serviceInstanceId,
        call.deadlineMs,
        call.signal === controller.signal,
      ]),
      [
        ["http://127.0.0.1:43221", "metrics-service-one", 5_000, true],
        ["http://127.0.0.1:43222", "metrics-service-two", 5_000, true],
      ],
    );
  });

  it("fails immediately without a ready connection", async function () {
    let computeCalls = 0;
    const engine = createSynthesisSidecarCitationGraphMetricsEngine({
      getReadyConnection: () => null,
      computeClient: {
        async computeCitationGraphMetrics() {
          computeCalls += 1;
          throw new Error("unexpected compute");
        },
      },
    });

    assert.equal(
      await engine
        .compute(metricsRequest())
        .then(() => "success")
        .catch(clientErrorCode),
      "service_not_ready",
    );
    assert.equal(computeCalls, 0);
  });

  it("uses metrics capability and validates runtime identity and result", async function () {
    const input = metricsRequest();
    const direct =
      await createInProcessSynthesisCitationGraphMetricsEngine().compute(input);
    const connection = {
      baseUrl: "http://127.0.0.1:1",
      profileId: "1".repeat(64),
      clientToken: CLIENT_TOKEN,
      serviceInstanceId: SERVICE_INSTANCE_ID,
    };
    const capabilities: string[] = [];
    const validClient = createSynthesisSidecarComputeClient({
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as {
          requestId: string;
          capability: string;
        };
        capabilities.push(body.capability);
        return new Response(
          JSON.stringify({
            ok: true,
            requestId: body.requestId,
            serviceInstanceId: SERVICE_INSTANCE_ID,
            data: direct,
          }),
          { status: 200 },
        );
      },
    });
    assert.deepEqual(
      await validClient.computeCitationGraphMetrics(connection, input),
      direct,
    );
    assert.deepEqual(capabilities, ["compute.citation_graph_metrics"]);

    const mismatchClient = createSynthesisSidecarComputeClient({
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { requestId: string };
        return new Response(
          JSON.stringify({
            ok: true,
            requestId: body.requestId,
            serviceInstanceId: "stale-service",
            data: direct,
          }),
          { status: 200 },
        );
      },
    });
    assert.equal(
      await mismatchClient
        .computeCitationGraphMetrics(connection, input)
        .then(() => "success")
        .catch(clientErrorCode),
      "runtime_mismatch",
    );

    const invalidClient = createSynthesisSidecarComputeClient({
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { requestId: string };
        return new Response(
          JSON.stringify({
            ok: true,
            requestId: body.requestId,
            serviceInstanceId: SERVICE_INSTANCE_ID,
            data: {},
          }),
          { status: 200 },
        );
      },
    });
    assert.equal(
      await invalidClient
        .computeCitationGraphMetrics(connection, input)
        .then(() => "success")
        .catch(clientErrorCode),
      "worker_result_invalid",
    );

    const timeoutClient = createSynthesisSidecarComputeClient({
      deadlineMs: 10,
      fetch: async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        }),
    });
    assert.equal(
      await timeoutClient
        .computeCitationGraphMetrics(connection, input)
        .then(() => "success")
        .catch(clientErrorCode),
      "worker_timeout",
    );
  });

  it("keeps production composition on the sidecar route without local fallback", function () {
    const source = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/legacyComposition.ts"),
      "utf8",
    );
    assert.include(source, "createSynthesisSidecarCitationGraphMetricsEngine");
    assert.notInclude(
      source,
      "createInProcessSynthesisCitationGraphMetricsEngine",
    );
    assert.notInclude(source, "workbench.chrome.read");
    assert.notInclude(source, "topics.canonical.inspect");
  });
});

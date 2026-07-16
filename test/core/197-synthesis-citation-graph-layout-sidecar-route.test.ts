import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import {
  createInProcessSynthesisCitationGraphLayoutEngine,
  rebuildSynthesisCitationGraphLayoutRequest,
  type SynthesisCitationGraphLayoutRequest,
} from "../../packages/synthesis-engine/src/index";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PROTOCOL,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import type { SynthesisSidecarRuntimeConfig } from "../../apps/synthesis-service/src/runtimeConfig";
import type { SynthesisSidecarComputeWorkerPool } from "../../apps/synthesis-service/src/computeWorkerPool";
import { startSynthesisSidecarServer } from "../../apps/synthesis-service/src/server";
import {
  createSynthesisSidecarComputeClient,
  SynthesisSidecarComputeClientError,
} from "../../src/modules/synthesisSidecarComputeClient";
import { createSynthesisSidecarCitationGraphLayoutEngine } from "../../src/modules/synthesis/sidecarCitationGraphLayoutEngineAdapter";
import type { SynthesisSidecarControlConnection } from "../../src/modules/synthesisSidecarControlClient";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CLIENT_TOKEN = "client-token-0123456789abcdef0123456789abcdef";
const SERVICE_INSTANCE_ID = "route-service-instance";

function request(
  algorithm: "force" | "radial" | "components" = "components",
): SynthesisCitationGraphLayoutRequest {
  return rebuildSynthesisCitationGraphLayoutRequest({
    graphHash: `sha256:${"a".repeat(64)}`,
    algorithm,
    nodes: [
      {
        nodeId: "zotero:item:AAAA1111",
        kind: "library_paper",
        title: "Source",
        year: "2024",
        initialX: 0,
        initialY: 0,
      },
      {
        nodeId: "ref:doi:10.1000/target",
        kind: "external_reference",
        title: "Target",
        year: "2020",
        initialX: 10,
        initialY: -10,
      },
    ],
    edges: [
      {
        edgeId: "edge:source-target",
        source: "zotero:item:AAAA1111",
        target: "ref:doi:10.1000/target",
      },
    ],
  });
}

function runtimeConfig(): SynthesisSidecarRuntimeConfig {
  return {
    schema: "synthesis-sidecar-launch-config.v1",
    profileId: "1".repeat(64),
    profileRuntimeRoot: path.join(ROOT, ".scaffold/test-sidecar-route"),
    runtimeRootId: "2".repeat(64),
    dataRootId: "3".repeat(64),
    bundleId: "4".repeat(64),
    nodeVersion: "24.18.0",
    serviceVersion: "0.1.0-test",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: "synthesis-schema.test.v1",
    supervisorInstanceId: "route-supervisor",
    leaseNonce: "route-lease",
    clientToken: CLIENT_TOKEN,
    lifecycleToken: "lifecycle-token-0123456789abcdef0123456789abcdef",
    mutationEnabled: false,
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
      schema: "synthesis-sidecar-discovery.v1",
      profileId: config.profileId,
      supervisorInstanceId: config.supervisorInstanceId,
      serviceInstanceId,
      bundleId: config.bundleId,
      nodeVersion: config.nodeVersion,
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

describe("Synthesis Citation Graph production sidecar route", function () {
  this.timeout(10_000);

  it("matches direct force, radial, and components results through real authenticated HTTP", async function () {
    const config = runtimeConfig();
    const direct = createInProcessSynthesisCitationGraphLayoutEngine();
    const pool: SynthesisSidecarComputeWorkerPool = {
      runCitationGraphLayout: (input) => direct.compute(input),
      snapshot: () => ({
        state: "idle",
        active: 0,
        queued: 0,
        restartCount: 0,
        failureCount: 0,
      }),
      async shutdown() {},
    };
    const runtime = await startSynthesisSidecarServer(
      config,
      SERVICE_INSTANCE_ID,
      { computePool: pool },
    );
    const engine = createSynthesisSidecarCitationGraphLayoutEngine({
      getReadyConnection: () => readyConnection(config, runtime.port),
    });
    try {
      for (const algorithm of ["force", "radial", "components"] as const) {
        const input = request(algorithm);
        assert.deepEqual(
          await engine.compute(input),
          await direct.compute(input),
        );
      }
    } finally {
      runtime.beginShutdown("test_complete");
      await runtime.stopped;
    }
  });

  it("resolves a fresh connection per call and propagates fixed deadline and lifecycle cancellation", async function () {
    const config = runtimeConfig();
    const connections = [
      readyConnection(config, 43121, "service-one"),
      readyConnection(config, 43122, "service-two"),
    ];
    const calls: Array<{
      baseUrl: string;
      serviceInstanceId: string;
      signal?: AbortSignal;
      deadlineMs?: number;
    }> = [];
    const controller = new AbortController();
    const engine = createSynthesisSidecarCitationGraphLayoutEngine({
      signal: controller.signal,
      getReadyConnection: () => connections.shift() ?? null,
      computeClient: {
        async computeCitationGraphLayout(connection, input, options) {
          calls.push({
            baseUrl: connection.baseUrl,
            serviceInstanceId: connection.serviceInstanceId,
            ...options,
          });
          return createInProcessSynthesisCitationGraphLayoutEngine().compute(
            input,
          );
        },
      },
    });

    await engine.compute(request());
    await engine.compute(request("radial"));
    assert.deepEqual(
      calls.map((call) => [
        call.baseUrl,
        call.serviceInstanceId,
        call.deadlineMs,
        call.signal === controller.signal,
      ]),
      [
        ["http://127.0.0.1:43121", "service-one", 5_000, true],
        ["http://127.0.0.1:43122", "service-two", 5_000, true],
      ],
    );
  });

  it("fails immediately when no ready connection exists", async function () {
    let computeCalls = 0;
    const engine = createSynthesisSidecarCitationGraphLayoutEngine({
      getReadyConnection: () => null,
      computeClient: {
        async computeCitationGraphLayout() {
          computeCalls += 1;
          throw new Error("unexpected compute");
        },
      },
    });

    assert.equal(
      await engine
        .compute(request())
        .then(() => "success")
        .catch(clientErrorCode),
      "service_not_ready",
    );
    assert.equal(computeCalls, 0);
  });

  it("validates request/runtime identity and normalizes transport outcomes", async function () {
    const input = request();
    const direct =
      await createInProcessSynthesisCitationGraphLayoutEngine().compute(input);
    const connection = {
      baseUrl: "http://127.0.0.1:1",
      profileId: "1".repeat(64),
      clientToken: CLIENT_TOKEN,
      serviceInstanceId: SERVICE_INSTANCE_ID,
    };
    const requestIds: string[] = [];
    const validClient = createSynthesisSidecarComputeClient({
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { requestId: string };
        requestIds.push(body.requestId);
        return new Response(
          JSON.stringify({
            ok: true,
            requestId: body.requestId,
            serviceInstanceId: SERVICE_INSTANCE_ID,
            data: direct,
            diagnostics: [],
          }),
          { status: 200 },
        );
      },
    });
    await validClient.computeCitationGraphLayout(connection, input);
    await validClient.computeCitationGraphLayout(connection, input);
    assert.lengthOf(new Set(requestIds), 2);

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
        .computeCitationGraphLayout(connection, input)
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
        .computeCitationGraphLayout(connection, input)
        .then(() => "success")
        .catch(clientErrorCode),
      "worker_result_invalid",
    );

    const unavailableClient = createSynthesisSidecarComputeClient({
      fetch: async () => {
        throw new TypeError("network failed");
      },
    });
    assert.equal(
      await unavailableClient
        .computeCitationGraphLayout(connection, input)
        .then(() => "success")
        .catch(clientErrorCode),
      "worker_unavailable",
    );

    const controller = new AbortController();
    controller.abort();
    assert.equal(
      await unavailableClient
        .computeCitationGraphLayout(connection, input, {
          signal: controller.signal,
        })
        .then(() => "success")
        .catch(clientErrorCode),
      "worker_canceled",
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
        .computeCitationGraphLayout(connection, input)
        .then(() => "success")
        .catch(clientErrorCode),
      "worker_timeout",
    );

    const busyClient = createSynthesisSidecarComputeClient({
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { requestId: string };
        return new Response(
          JSON.stringify({
            ok: false,
            requestId: body.requestId,
            serviceInstanceId: SERVICE_INSTANCE_ID,
            error: { code: "worker_busy" },
          }),
          { status: 429 },
        );
      },
    });
    assert.equal(
      await busyClient
        .computeCitationGraphLayout(connection, input)
        .then(() => "success")
        .catch(clientErrorCode),
      "worker_busy",
    );
  });

  it("keeps production composition on the sidecar route without local fallback", function () {
    const source = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/legacyComposition.ts"),
      "utf8",
    );
    assert.include(source, "createSynthesisSidecarCitationGraphLayoutEngine");
    assert.notInclude(
      source,
      "createInProcessSynthesisCitationGraphLayoutEngine",
    );
  });
});

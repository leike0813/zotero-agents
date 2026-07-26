import { assert } from "chai";
import { request as httpRequest } from "node:http";
import path from "node:path";
import {
  SYNTHESIS_SIDECAR_LIMITS,
  SYNTHESIS_SIDECAR_PROTOCOL,
  isSynthesisSidecarErrorCode,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  createInProcessSynthesisCitationGraphMetricsEngine,
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphMetricsRequest,
} from "../../packages/synthesis-engine/src/index";
import {
  createInProcessSynthesisCitationGraphBuildEngine,
  rebuildSynthesisCitationGraphBuildRequest,
} from "../../packages/synthesis-engine/src/citationGraphBuild";
import type { SynthesisSidecarComputeWorkerPool } from "../../apps/synthesis-service/src/computeWorkerPool";
import { startSynthesisSidecarServer } from "../../apps/synthesis-service/src/server";
import type { SynthesisSidecarRuntimeConfig } from "../../apps/synthesis-service/src/runtimeConfig";
import { parseCallRequest } from "../../apps/synthesis-service/src/request";
import {
  createSynthesisSidecarComputeClient,
  SynthesisSidecarComputeClientError,
} from "../../src/modules/synthesisSidecarComputeClient";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CLIENT_TOKEN = "client-token-0123456789abcdef0123456789abcdef";

function runtimeConfig(): SynthesisSidecarRuntimeConfig {
  return {
    schema: "synthesis-sidecar-launch-config.v1",
    profileId: "1".repeat(64),
    profileRuntimeRoot: path.join(ROOT, ".scaffold/test-sidecar-capacity"),
    runtimeRootId: "2".repeat(64),
    dataRootId: "3".repeat(64),
    bundleId: "4".repeat(64),
    nodeVersion: "24.18.0",
    serviceVersion: "0.1.0-test",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: "synthesis-schema.test.v1",
    supervisorInstanceId: "supervisor-capacity-test",
    leaseNonce: "lease-capacity-test",
    clientToken: CLIENT_TOKEN,
    lifecycleToken: "lifecycle-token-0123456789abcdef0123456789abcdef",
    mutationEnabled: false,
    port: 0,
  };
}

function layoutRequest(nodeCount: number, titleLength: number) {
  return rebuildSynthesisCitationGraphLayoutRequest({
    graphHash: `sha256:${"a".repeat(64)}`,
    algorithm: "components",
    nodes: Array.from({ length: nodeCount }, (_, index) => ({
      nodeId: `node:${index}`,
      kind: "library_paper",
      title: "x".repeat(titleLength),
      year: "2024",
      initialX: 0,
      initialY: 0,
    })),
    edges: [],
  });
}

function metricsRequest(nodeCount: number, titleLength: number) {
  return rebuildSynthesisCitationGraphMetricsRequest({
    graphHash: `sha256:${"b".repeat(64)}`,
    nodes: Array.from({ length: nodeCount }, (_, index) => ({
      nodeId: `node:${index}`,
      kind: "library_paper",
      libraryId: 1,
      itemKey: `ITEM${index}`,
      title: "x".repeat(titleLength),
      year: "2024",
    })),
    edges: [],
  });
}

function graphBuildRequest(nodeCount: number, titleLength: number) {
  return rebuildSynthesisCitationGraphBuildRequest({
    contractVersion: "synthesis-citation-graph-build.v1",
    scope: { kind: "full", sourceIds: [] },
    rolePriority: [],
    libraryNodes: Array.from({ length: nodeCount }, (_, index) => ({
      nodeId: `paper:${index}`,
      title: "x".repeat(titleLength),
      authors: [],
      aliases: [],
    })),
    references: [],
  });
}

const unexpectedMetricsCompute: SynthesisSidecarComputeWorkerPool["runCitationGraphMetrics"] =
  async () => {
    throw new Error("unexpected metrics dispatch");
  };
const unexpectedGraphBuildCompute: SynthesisSidecarComputeWorkerPool["runCitationGraphBuild"] =
  async () => {
    throw new Error("unexpected graph-build dispatch");
  };

function envelope(
  config: SynthesisSidecarRuntimeConfig,
  args: {
    capability: string;
    payload: Record<string, unknown>;
  },
) {
  return {
    protocol: SYNTHESIS_SIDECAR_PROTOCOL,
    requestId: `request:${Date.now()}`,
    profileId: config.profileId,
    capability: args.capability,
    payload: args.payload,
  };
}

async function postJson(baseUrl: string, body: unknown) {
  const response = await fetch(`${baseUrl}/synthesis/v1/call`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${CLIENT_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    body: (await response.json()) as {
      ok?: boolean;
      error?: { code?: string };
    },
  };
}

function requestWithoutBody(baseUrl: string, contentLength: number) {
  return new Promise<{ status: number; code: string | undefined }>(
    (resolve, reject) => {
      const request = httpRequest(
        `${baseUrl}/synthesis/v1/call`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${CLIENT_TOKEN}`,
            "content-type": "application/json",
            "content-length": String(contentLength),
          },
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => {
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
              error?: { code?: string };
            };
            resolve({
              status: response.statusCode ?? 0,
              code: body.error?.code,
            });
            request.destroy();
          });
        },
      );
      request.once("error", reject);
      request.flushHeaders();
    },
  );
}

function chunkedOverflow(baseUrl: string) {
  return new Promise<{ status: number; code: string | undefined }>(
    (resolve, reject) => {
      const request = httpRequest(
        `${baseUrl}/synthesis/v1/call`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${CLIENT_TOKEN}`,
            "content-type": "application/json",
          },
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => {
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
              error?: { code?: string };
            };
            resolve({
              status: response.statusCode ?? 0,
              code: body.error?.code,
            });
            request.destroy();
          });
        },
      );
      request.once("error", reject);
      const chunk = Buffer.alloc(1024 * 1024, "x");
      for (let index = 0; index < 9; index += 1) {
        request.write(chunk);
      }
    },
  );
}

function abortUpload(baseUrl: string) {
  return new Promise<void>((resolve) => {
    const request = httpRequest(`${baseUrl}/synthesis/v1/call`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${CLIENT_TOKEN}`,
        "content-type": "application/json",
      },
    });
    request.on("error", () => undefined);
    request.once("close", resolve);
    request.write('{"protocol":"synthesis-sidecar.v1","payload":');
    request.destroy();
  });
}

describe("Synthesis sidecar compute wire capacity", function () {
  this.timeout(20_000);

  it("owns separate bounded request, response, and JSON limits", function () {
    assert.include(SYNTHESIS_SIDECAR_LIMITS, {
      requestBodyBytes: 1024 * 1024,
      computeRequestBodyBytes: 8 * 1024 * 1024,
      computeResponseBodyBytes: 8 * 1024 * 1024,
      jsonNodes: 50_000,
      computeRequestJsonNodes: 250_000,
      computeResponseJsonNodes: 50_000,
      jsonDepth: 32,
      stringLength: 64 * 1024,
    });
    assert.isTrue(isSynthesisSidecarErrorCode("response_body_too_large"));
  });

  it("enforces the exact compute byte and structural boundaries", function () {
    const config = runtimeConfig();
    const base = JSON.stringify(
      envelope(config, {
        capability: "compute.citation_graph_layout",
        payload: layoutRequest(1, 1),
      }),
    );
    const exact = `${base}${" ".repeat(
      SYNTHESIS_SIDECAR_LIMITS.computeRequestBodyBytes -
        Buffer.byteLength(base),
    )}`;
    assert.doesNotThrow(() =>
      parseCallRequest({
        source: exact,
        byteLength: SYNTHESIS_SIDECAR_LIMITS.computeRequestBodyBytes,
      }),
    );
    assert.equal(
      (() => {
        try {
          parseCallRequest({
            source: `${exact} `,
            byteLength: SYNTHESIS_SIDECAR_LIMITS.computeRequestBodyBytes + 1,
          });
          return "success";
        } catch (error) {
          return (error as { code?: string }).code;
        }
      })(),
      "request_body_too_large",
    );

    const structurallyOversized = JSON.stringify(
      envelope(config, {
        capability: "compute.citation_graph_layout",
        payload: {
          entries: Array.from(
            {
              length: SYNTHESIS_SIDECAR_LIMITS.computeRequestJsonNodes + 1,
            },
            () => null,
          ),
        },
      }),
    );
    assert.equal(
      (() => {
        try {
          parseCallRequest(structurallyOversized);
          return "success";
        } catch (error) {
          return (error as { code?: string }).code;
        }
      })(),
      "request_json_too_large",
    );
  });

  it("accepts compute above 1 MiB while preserving the system limit", async function () {
    const config = runtimeConfig();
    let computeCalls = 0;
    const metricsEngine = createInProcessSynthesisCitationGraphMetricsEngine();
    const graphBuildEngine = createInProcessSynthesisCitationGraphBuildEngine();
    const pool: SynthesisSidecarComputeWorkerPool = {
      async runCitationGraphLayout(request) {
        computeCalls += 1;
        return {
          graphHash: request.graphHash,
          algorithm: request.algorithm,
          layoutEngine: "components-rust",
          layoutVersion: 2,
          params: {},
          nodes: [],
        };
      },
      async runCitationGraphMetrics(request) {
        computeCalls += 1;
        return metricsEngine.compute(request);
      },
      async runCitationGraphBuild(request) {
        computeCalls += 1;
        return graphBuildEngine.compute(request);
      },
      snapshot: () => ({
        state: "idle",
        active: 0,
        queued: 0,
        restartCount: 0,
        failureCount: 0,
      }),
      async shutdown() {},
    };
    const runtime = await startSynthesisSidecarServer(config, "capacity", {
      computePool: pool,
    });
    const baseUrl = `http://${runtime.host}:${runtime.port}`;
    try {
      const compute = await postJson(
        baseUrl,
        envelope(config, {
          capability: "compute.citation_graph_layout",
          payload: layoutRequest(300, 4_000),
        }),
      );
      assert.equal(compute.status, 200);
      assert.equal(computeCalls, 1);

      const metrics = await postJson(
        baseUrl,
        envelope(config, {
          capability: "compute.citation_graph_metrics",
          payload: metricsRequest(300, 4_000),
        }),
      );
      assert.equal(metrics.status, 200);
      assert.equal(computeCalls, 2);

      const graphBuild = await postJson(
        baseUrl,
        envelope(config, {
          capability: "compute.citation_graph_build",
          payload: graphBuildRequest(300, 4_000),
        }),
      );
      assert.equal(graphBuild.status, 200);
      assert.equal(computeCalls, 3);

      const system = await postJson(
        baseUrl,
        envelope(config, {
          capability: "system.handshake",
          payload: { padding: "x".repeat(1024 * 1024) },
        }),
      );
      assert.equal(system.status, 413);
      assert.equal(system.body.error?.code, "request_body_too_large");
      assert.equal(computeCalls, 3);
    } finally {
      runtime.beginShutdown("test_complete");
      await runtime.stopped;
    }
  });

  it("rejects declared and chunked overflow before dispatch", async function () {
    const config = runtimeConfig();
    let computeCalls = 0;
    const pool: SynthesisSidecarComputeWorkerPool = {
      async runCitationGraphLayout() {
        computeCalls += 1;
        throw new Error("unexpected dispatch");
      },
      runCitationGraphMetrics: unexpectedMetricsCompute,
      runCitationGraphBuild: unexpectedGraphBuildCompute,
      snapshot: () => ({
        state: "idle",
        active: 0,
        queued: 0,
        restartCount: 0,
        failureCount: 0,
      }),
      async shutdown() {},
    };
    const runtime = await startSynthesisSidecarServer(config, "overflow", {
      computePool: pool,
    });
    const baseUrl = `http://${runtime.host}:${runtime.port}`;
    try {
      const declared = await requestWithoutBody(
        baseUrl,
        SYNTHESIS_SIDECAR_LIMITS.computeRequestBodyBytes + 1,
      );
      assert.deepEqual(declared, {
        status: 413,
        code: "request_body_too_large",
      });
      const chunked = await chunkedOverflow(baseUrl);
      assert.deepEqual(chunked, {
        status: 413,
        code: "request_body_too_large",
      });
      await abortUpload(baseUrl);
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(computeCalls, 0);
    } finally {
      runtime.beginShutdown("test_complete");
      await runtime.stopped;
    }
  });

  it("bounds successful compute responses without faulting the pool", async function () {
    const config = runtimeConfig();
    const snapshot = {
      state: "idle" as const,
      active: 0 as const,
      queued: 0,
      restartCount: 0,
      failureCount: 0,
    };
    const pool: SynthesisSidecarComputeWorkerPool = {
      async runCitationGraphLayout(request) {
        return {
          graphHash: request.graphHash,
          algorithm: request.algorithm,
          layoutEngine: "components-rust",
          layoutVersion: 2,
          params: {
            padding: "x".repeat(
              SYNTHESIS_SIDECAR_LIMITS.computeResponseBodyBytes,
            ),
          },
          nodes: [],
        };
      },
      runCitationGraphMetrics: unexpectedMetricsCompute,
      runCitationGraphBuild: unexpectedGraphBuildCompute,
      snapshot: () => ({ ...snapshot }),
      async shutdown() {},
    };
    const runtime = await startSynthesisSidecarServer(config, "response-cap", {
      computePool: pool,
    });
    const baseUrl = `http://${runtime.host}:${runtime.port}`;
    try {
      const result = await postJson(
        baseUrl,
        envelope(config, {
          capability: "compute.citation_graph_layout",
          payload: layoutRequest(1, 1),
        }),
      );
      assert.equal(result.status, 502);
      assert.equal(result.body.error?.code, "response_body_too_large");
      assert.deepEqual(pool.snapshot(), snapshot);
    } finally {
      runtime.beginShutdown("test_complete");
      await runtime.stopped;
    }
  });

  it("preflights compute requests and caps responses before parsing", async function () {
    const connection = {
      baseUrl: "http://127.0.0.1:1",
      profileId: "1".repeat(64),
      clientToken: CLIENT_TOKEN,
      serviceInstanceId: "capacity-test",
    };
    let fetchCalls = 0;
    const requestClient = createSynthesisSidecarComputeClient({
      fetch: async () => {
        fetchCalls += 1;
        return new Response();
      },
    });
    const requestCode = await requestClient
      .computeCitationGraphLayout(connection, layoutRequest(2_100, 4_096))
      .then(() => "success")
      .catch((error: unknown) =>
        error instanceof SynthesisSidecarComputeClientError
          ? error.code
          : "unknown",
      );
    assert.equal(requestCode, "request_body_too_large");
    assert.equal(fetchCalls, 0);
    const metricsRequestCode = await requestClient
      .computeCitationGraphMetrics(connection, metricsRequest(2_100, 4_096))
      .then(() => "success")
      .catch((error: unknown) =>
        error instanceof SynthesisSidecarComputeClientError
          ? error.code
          : "unknown",
      );
    assert.equal(metricsRequestCode, "request_body_too_large");
    assert.equal(fetchCalls, 0);
    const graphBuildRequestCode = await requestClient
      .computeCitationGraphBuild(connection, graphBuildRequest(2_100, 4_096))
      .then(() => "success")
      .catch((error: unknown) =>
        error instanceof SynthesisSidecarComputeClientError
          ? error.code
          : "unknown",
      );
    assert.equal(graphBuildRequestCode, "request_body_too_large");
    assert.equal(fetchCalls, 0);

    const responseClient = createSynthesisSidecarComputeClient({
      fetch: async () =>
        new Response(
          "x".repeat(SYNTHESIS_SIDECAR_LIMITS.computeResponseBodyBytes + 1),
          { status: 200 },
        ),
    });
    const responseCode = await responseClient
      .computeCitationGraphLayout(connection, layoutRequest(1, 1))
      .then(() => "success")
      .catch((error: unknown) =>
        error instanceof SynthesisSidecarComputeClientError
          ? error.code
          : "unknown",
      );
    assert.equal(responseCode, "response_body_too_large");
  });
});

import { assert } from "chai";
import fs from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
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
    schema: "synthesis-sidecar-launch-config.v1",
    profileId: "1".repeat(64),
    profileRuntimeRoot: path.join(ROOT, ".scaffold/test-sidecar-metrics-route"),
    runtimeRootId: "2".repeat(64),
    dataRootId: "3".repeat(64),
    bundleId: "4".repeat(64),
    nodeVersion: "24.18.0",
    serviceVersion: "0.1.0-test",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: "synthesis-schema.test.v1",
    supervisorInstanceId: "metrics-route-supervisor",
    leaseNonce: "metrics-route-lease",
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

  it("serves the same authenticated Metrics contract from the Rust candidate", async function () {
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-metrics-candidate-"),
    );
    const configPath = path.join(tempRoot, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        port: 0,
        profileId: "candidate-profile",
        clientToken: CLIENT_TOKEN,
      }),
    );
    const executable = path.join(
      ROOT,
      "native/synthesis-sidecar/target/debug",
      `synthesis-sidecar${process.platform === "win32" ? ".exe" : ""}`,
    );
    const child = spawn(executable, ["serve", configPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const lines = createInterface({ input: child.stdout });
    const listening = new Promise<{ port: number }>((resolve, reject) => {
      lines.once("line", (line) => {
        try {
          resolve(JSON.parse(line) as { port: number });
        } catch (error) {
          reject(error);
        }
      });
      child.once("error", reject);
      child.once("exit", (code) => {
        if (code !== 0) reject(new Error(`candidate exited with ${code}`));
      });
    });
    child.stderr.resume();
    try {
      const { port } = await listening;
      const endpoint = `http://127.0.0.1:${port}`;
      assert.equal((await fetch(`${endpoint}/health`)).status, 200);
      assert.equal(
        (
          await fetch(`${endpoint}/call`, {
            method: "POST",
            headers: {
              authorization: "Bearer wrong-token",
              "content-type": "application/json",
            },
            body: "{}",
          })
        ).status,
        401,
      );
      const handshake = (await (
        await fetch(`${endpoint}/call`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${CLIENT_TOKEN}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            protocol: SYNTHESIS_SIDECAR_PROTOCOL,
            requestId: "candidate-handshake",
            profileId: "candidate-profile",
            capability: "system.handshake",
            payload: {},
          }),
        })
      ).json()) as {
        ok: boolean;
        data: { capabilities: string[]; mutationEnabled: boolean };
      };
      assert.equal(handshake.ok, true);
      assert.equal(handshake.data.mutationEnabled, false);
      assert.include(
        handshake.data.capabilities,
        "compute.citation_graph_metrics",
      );
      assert.include(handshake.data.capabilities, "workbench.chrome.read");
      assert.include(handshake.data.capabilities, "topics.canonical.inspect");
      const input = metricsRequest();
      const response = await fetch(`${endpoint}/call`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${CLIENT_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          protocol: SYNTHESIS_SIDECAR_PROTOCOL,
          requestId: "candidate-request",
          profileId: "candidate-profile",
          capability: "compute.citation_graph_metrics",
          payload: input,
        }),
      });
      const body = (await response.json()) as {
        ok: boolean;
        data: unknown;
      };
      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
      assert.deepEqual(
        body.data,
        await createInProcessSynthesisCitationGraphMetricsEngine().compute(
          input,
        ),
      );
      await fetch(`${endpoint}/call`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${CLIENT_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          protocol: SYNTHESIS_SIDECAR_PROTOCOL,
          requestId: "candidate-shutdown",
          profileId: "candidate-profile",
          capability: "system.shutdown",
          payload: {},
        }),
      });
    } finally {
      if (child.exitCode === null) child.kill();
      lines.close();
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

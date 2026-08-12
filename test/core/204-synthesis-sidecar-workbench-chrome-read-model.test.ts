import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  readSynthesisWorkbenchOperationalChrome,
  type SynthesisWorkbenchOperationalRepository,
} from "../../packages/synthesis-application/src/index";
import {
  rebuildSynthesisWorkbenchOperationalChromeReadRequest,
  rebuildSynthesisWorkbenchOperationalChromeResult,
} from "../../packages/synthesis-contracts/src/workbench";
import type {
  SynthesisCacheBasisRecord,
  SynthesisOperationRecord,
} from "../../packages/synthesis-repository/src/index";
import {
  SYNTHESIS_SIDECAR_PROTOCOL,
  SYNTHESIS_SIDECAR_CALL_PATH,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import { openSynthesisSidecarIsolatedRepository } from "../../apps/synthesis-service/src/isolatedRepository";
import { startSynthesisSidecarServer } from "../../apps/synthesis-service/src/server";
import type { SynthesisSidecarRuntimeConfig } from "../../apps/synthesis-service/src/runtimeConfig";
import type { SynthesisSidecarComputeWorkerPool } from "../../apps/synthesis-service/src/computeWorkerPool";
import {
  createSynthesisSidecarWorkbenchClient,
  SynthesisSidecarWorkbenchClientError,
} from "../../src/modules/synthesisSidecarWorkbenchClient";

const CLIENT_TOKEN = "client-token-0123456789abcdef0123456789abcdef";
const SERVICE_INSTANCE_ID = "workbench-chrome-service";

function runtimeConfig(
  profileRuntimeRoot: string,
): SynthesisSidecarRuntimeConfig {
  return {
    schema: "synthesis-sidecar-launch-config.v3",
    profileId: "1".repeat(64),
    libraryId: 1,
    profileRuntimeRoot,
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
    serviceVersion: "0.1.0-test",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: "synthesis-schema.test.v1",
    supervisorInstanceId: "workbench-chrome-supervisor",
    repositoryDbPath: path.join(profileRuntimeRoot, "state", "synthesis.db"),
    canonicalRoot: path.join(profileRuntimeRoot, "data", "synthesis"),
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

function repositoryFixture(args: {
  caches?: SynthesisCacheBasisRecord[];
  operations?: SynthesisOperationRecord[];
}) {
  const caches = args.caches ?? [];
  const operations = args.operations ?? [];
  const calls: unknown[] = [];
  const repository: SynthesisWorkbenchOperationalRepository = {
    getCacheBasis(cacheKey) {
      calls.push(["cache", cacheKey]);
      return caches.find((row) => row.cacheKey === cacheKey) ?? null;
    },
    listOperations(options = {}) {
      calls.push(["operations", options]);
      return operations.filter(
        (row) =>
          (!options.statuses?.length ||
            options.statuses.includes(row.status ?? "pending")) &&
          (!options.operationTypes?.length ||
            options.operationTypes.includes(row.operationType)),
      );
    },
  };
  return { repository, caches, operations, calls };
}

describe("Synthesis sidecar Workbench chrome read model", function () {
  this.timeout(10_000);
  const roots: string[] = [];

  afterEach(function () {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
  it("strictly rebuilds requests and operational results", function () {
    assert.deepEqual(
      rebuildSynthesisWorkbenchOperationalChromeReadRequest({}),
      {},
    );
    assert.throws(() =>
      rebuildSynthesisWorkbenchOperationalChromeReadRequest({ state: {} }),
    );

    const result = rebuildSynthesisWorkbenchOperationalChromeResult({
      maintenance: {
        cacheReadiness: [
          {
            cacheKey: "reference-sidecar:library",
            cacheKind: "reference-sidecar",
            status: "ready",
          },
          {
            cacheKey: "citation-graph:library",
            cacheKind: "citation_graph",
            status: "missing",
          },
        ],
        backgroundJobs: [],
      },
    });
    assert.equal(result.maintenance.cacheReadiness[0]?.status, "ready");
    assert.throws(() =>
      rebuildSynthesisWorkbenchOperationalChromeResult({
        ...result,
        repositoryPath: "/private/synthesis.db",
      }),
    );
  });

  it("keeps cache readiness independent from running progress and remains read-only", function () {
    const fixture = repositoryFixture({
      caches: [
        {
          cacheKey: "reference-sidecar:library",
          cacheKind: "reference-sidecar",
          status: "ready",
          refreshedAt: "2026-07-17T00:00:00.000Z",
        },
      ],
      operations: [
        {
          operationId: "refresh:1",
          operationType: "reference_sidecar_refresh",
          status: "running",
          label: "Refresh references",
          phaseLabel: "Extract",
          progressMode: "determinate",
          processedCount: 25,
          totalCount: 100,
          updatedAt: "2026-07-17T00:01:00.000Z",
        },
      ],
    });
    const before = JSON.stringify({
      caches: fixture.caches,
      operations: fixture.operations,
    });

    const result = readSynthesisWorkbenchOperationalChrome(fixture.repository);

    assert.equal(result.maintenance.cacheReadiness[0]?.status, "ready");
    assert.equal(result.maintenance.cacheReadiness[1]?.status, "missing");
    assert.deepEqual(result.maintenance.backgroundJobs[0]?.progress, {
      mode: "determinate",
      current: 25,
      total: 100,
      percent: 25,
      label: "Extract",
    });
    assert.equal(
      JSON.stringify({
        caches: fixture.caches,
        operations: fixture.operations,
      }),
      before,
    );
  });

  it("suppresses failures superseded by newer cache readiness and sorts current jobs", function () {
    const fixture = repositoryFixture({
      caches: [
        {
          cacheKey: "reference-sidecar:library",
          cacheKind: "reference-sidecar",
          status: "ready",
          refreshedAt: "2026-07-17T00:10:00.000Z",
        },
        {
          cacheKey: "citation-graph:library",
          cacheKind: "citation_graph",
          status: "failed",
          updatedAt: "2026-07-17T00:10:00.000Z",
        },
      ],
      operations: [
        {
          operationId: "old-reference-failure",
          operationType: "reference_sidecar_refresh",
          status: "failed",
          updatedAt: "2026-07-17T00:05:00.000Z",
        },
        {
          operationId: "graph-failure",
          operationType: "citation_graph_cache_rebuild",
          status: "failed",
          updatedAt: "2026-07-17T00:08:00.000Z",
        },
        {
          operationId: "running-newer",
          operationType: "canonical_maintenance",
          status: "running",
          updatedAt: "2026-07-17T00:20:00.000Z",
        },
      ],
    });

    const result = readSynthesisWorkbenchOperationalChrome(fixture.repository);
    assert.deepEqual(
      result.maintenance.backgroundJobs.map((row) => row.job_id),
      ["running-newer", "graph-failure"],
    );
  });

  it("defensively enforces the 50 running plus 20 failed row bounds", function () {
    const operations: SynthesisOperationRecord[] = [
      ...Array.from({ length: 60 }, (_, index) => ({
        operationId: `running-${index.toString().padStart(2, "0")}`,
        operationType: "canonical_maintenance",
        status: "running" as const,
        updatedAt: `2026-07-17T00:${index.toString().padStart(2, "0")}:00.000Z`,
      })),
      ...Array.from({ length: 30 }, (_, index) => ({
        operationId: `failed-${index.toString().padStart(2, "0")}`,
        operationType: "reference_sidecar_refresh",
        status: "failed" as const,
        updatedAt: `2026-07-17T01:${index.toString().padStart(2, "0")}:00.000Z`,
      })),
    ];
    const result = readSynthesisWorkbenchOperationalChrome(
      repositoryFixture({ operations }).repository,
    );
    assert.lengthOf(result.maintenance.backgroundJobs, 70);
  });

  it("reads the real isolated SQLite repository through authenticated HTTP", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-workbench-chrome-"));
    roots.push(root);
    const config = runtimeConfig(path.join(root, "profile-runtime"));
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: config.profileRuntimeRoot,
      profileId: config.profileId,
      dataRootId: config.dataRootId,
    });
    repository.store.upsertCacheBasis({
      cacheKey: "reference-sidecar:library",
      cacheKind: "reference-sidecar",
      status: "ready",
    });
    repository.store.upsertOperation({
      operationId: "refresh:real-http",
      operationType: "reference_sidecar_refresh",
      status: "running",
      progressMode: "determinate",
      processedCount: 2,
      totalCount: 4,
    });
    const computePool: SynthesisSidecarComputeWorkerPool = {
      async runCitationGraphLayout() {
        throw new Error("unexpected compute");
      },
      async runCitationGraphMetrics() {
        throw new Error("unexpected compute");
      },
      async runCitationGraphBuild() {
        throw new Error("unexpected compute");
      },
      snapshot: () => ({
        state: "busy",
        active: 1,
        queued: 2,
        restartCount: 0,
        failureCount: 0,
      }),
      async shutdown() {},
    };
    const runtime = await startSynthesisSidecarServer(
      config,
      SERVICE_INSTANCE_ID,
      { repository, computePool },
    );
    try {
      const connection = {
        baseUrl: `http://${runtime.host}:${runtime.port}`,
        profileId: config.profileId,
        clientToken: config.clientToken,
        serviceInstanceId: SERVICE_INSTANCE_ID,
      };
      const result =
        await createSynthesisSidecarWorkbenchClient().readOperationalChrome(
          connection,
        );
      assert.equal(result.maintenance.cacheReadiness[0]?.status, "ready");
      assert.equal(
        result.maintenance.backgroundJobs[0]?.job_id,
        "refresh:real-http",
      );
      const health = (await (
        await fetch(`${connection.baseUrl}/synthesis/v1/health`)
      ).json()) as {
        computePool: { state: string };
        canonicalStore: { state: string; schemaVersion: string };
      };
      assert.equal(health.computePool.state, "busy");
      assert.deepInclude(health.canonicalStore, {
        state: "ready",
        schemaVersion: "synthesis-topic-canonical-store.v1",
      });

      const unauthorized = await fetch(
        `${connection.baseUrl}${SYNTHESIS_SIDECAR_CALL_PATH}`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer wrong-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            protocol: SYNTHESIS_SIDECAR_PROTOCOL,
            requestId: "workbench:unauthorized",
            profileId: config.profileId,
            capability: "workbench.chrome.read",
            payload: { state: {} },
          }),
        },
      );
      assert.equal(unauthorized.status, 401);

      const invalid = await fetch(
        `${connection.baseUrl}${SYNTHESIS_SIDECAR_CALL_PATH}`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${config.clientToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            protocol: SYNTHESIS_SIDECAR_PROTOCOL,
            requestId: "workbench:invalid",
            profileId: config.profileId,
            capability: "workbench.chrome.read",
            payload: { state: {}, unknown: true },
          }),
        },
      );
      assert.equal(invalid.status, 400);
    } finally {
      runtime.beginShutdown("test");
      await runtime.stopped;
    }
  });

  it("omits restart-canceled operations while preserving cache readiness", function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-workbench-restart-"),
    );
    roots.push(root);
    const config = runtimeConfig(path.join(root, "profile-runtime"));
    const options = {
      profileRuntimeRoot: config.profileRuntimeRoot,
      profileId: config.profileId,
      dataRootId: config.dataRootId,
    };
    const first = openSynthesisSidecarIsolatedRepository(options);
    first.store.upsertCacheBasis({
      cacheKey: "citation-graph:library",
      cacheKind: "citation_graph",
      status: "ready",
    });
    first.store.upsertOperation({
      operationId: "interrupted",
      operationType: "citation_graph_cache_rebuild",
      status: "running",
    });
    first.close();

    const second = openSynthesisSidecarIsolatedRepository(options);
    const result = readSynthesisWorkbenchOperationalChrome(second.store);
    assert.equal(second.store.getOperation("interrupted")?.status, "canceled");
    assert.equal(result.maintenance.cacheReadiness[1]?.status, "ready");
    assert.deepEqual(result.maintenance.backgroundJobs, []);
    second.close();
  });

  it("maps Workbench client cancellation, timeout, invalid response, and unavailability", async function () {
    const connection = {
      baseUrl: "http://127.0.0.1:1",
      profileId: "1".repeat(64),
      clientToken: CLIENT_TOKEN,
      serviceInstanceId: SERVICE_INSTANCE_ID,
    };
    const code = async (run: () => Promise<unknown>) => {
      try {
        await run();
        return "none";
      } catch (error) {
        return error instanceof SynthesisSidecarWorkbenchClientError
          ? error.code
          : "unknown";
      }
    };

    const controller = new AbortController();
    controller.abort();
    assert.equal(
      await code(() =>
        createSynthesisSidecarWorkbenchClient().readOperationalChrome(
          connection,
          { signal: controller.signal },
        ),
      ),
      "request_canceled",
    );

    const invalidFetch = (async (_input: unknown, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { requestId: string };
      return new Response(
        JSON.stringify({
          ok: true,
          requestId: request.requestId,
          serviceInstanceId: SERVICE_INSTANCE_ID,
          data: {},
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;
    assert.equal(
      await code(() =>
        createSynthesisSidecarWorkbenchClient({
          fetch: invalidFetch,
        }).readOperationalChrome(connection),
      ),
      "response_invalid",
    );

    const timeoutFetch = ((_input: unknown, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        );
      })) as typeof fetch;
    assert.equal(
      await code(() =>
        createSynthesisSidecarWorkbenchClient({
          fetch: timeoutFetch,
          deadlineMs: 5,
        }).readOperationalChrome(connection),
      ),
      "request_timeout",
    );

    const unavailableFetch = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    assert.equal(
      await code(() =>
        createSynthesisSidecarWorkbenchClient({
          fetch: unavailableFetch,
        }).readOperationalChrome(connection),
      ),
      "service_unavailable",
    );
  });

  it("keeps Rust Workbench policy in a typed application owner", function () {
    const applicationRoot = path.resolve(
      "native/synthesis-sidecar/crates/synthesis-application/src",
    );
    const facade = fs.readFileSync(
      path.join(applicationRoot, "lib.rs"),
      "utf8",
    );
    const workbench = fs.readFileSync(
      path.join(applicationRoot, "workbench.rs"),
      "utf8",
    );
    const repository = fs.readFileSync(
      "native/synthesis-sidecar/crates/synthesis-repository/src/lib.rs",
      "utf8",
    );

    assert.include(facade, "pub mod workbench");
    assert.include(workbench, "pub struct WorkbenchApplication");
    assert.include(workbench, "const RUNNING_LIMIT: usize = 50");
    assert.include(workbench, "const FAILED_LIMIT: usize = 20");
    assert.notInclude(repository, "pub fn workbench_chrome");
    assert.notInclude(repository, 'format!("application:');
  });
});

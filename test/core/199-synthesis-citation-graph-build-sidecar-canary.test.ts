import { assert } from "chai";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  createInProcessSynthesisCitationGraphBuildEngine,
  rebuildSynthesisCitationGraphBuildRequest,
  type SynthesisCitationGraphBuildRequest,
} from "../../packages/synthesis-engine/src/citationGraphBuild";
import {
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PROTOCOL,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  createSynthesisSidecarComputeWorkerPool,
  type SynthesisSidecarComputeWorkerPool,
} from "../../apps/synthesis-service/src/computeWorkerPool";
import type { SynthesisSidecarRuntimeConfig } from "../../apps/synthesis-service/src/runtimeConfig";
import { startSynthesisSidecarServer } from "../../apps/synthesis-service/src/server";
import {
  createSynthesisSidecarComputeClient,
  SynthesisSidecarComputeClientError,
} from "../../src/modules/synthesisSidecarComputeClient";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CLIENT_TOKEN = "client-token-0123456789abcdef0123456789abcdef";
const SERVICE_INSTANCE_ID = "graph-build-canary-service";

function graphBuildRequest(
  kind: "full" | "source_slice" = "source_slice",
): SynthesisCitationGraphBuildRequest {
  return rebuildSynthesisCitationGraphBuildRequest({
    contractVersion: "synthesis-citation-graph-build.v1",
    scope: {
      kind,
      sourceIds: kind === "source_slice" ? ["paper:A"] : [],
    },
    rolePriority: ["background", "method"],
    libraryNodes: [
      {
        nodeId: "paper:A",
        title: "Source",
        year: "2024",
        authors: ["Source Author"],
        aliases: [],
      },
      {
        nodeId: "paper:B",
        title: "Target",
        year: "2020",
        authors: ["Target Author"],
        aliases: ["ref:target"],
      },
    ],
    references: [
      {
        referenceId: "raw:1",
        edgeId: "edge:1",
        sourceId: "paper:A",
        sourceRef: "ref:1",
        targetId: "paper:B",
        targetKind: "library_paper",
        targetAuthors: [],
        targetAliases: [],
        roles: ["background"],
        weight: 1,
      },
      {
        referenceId: "raw:2",
        edgeId: "edge:2",
        sourceId: "paper:A",
        targetId: "ref:external",
        targetKind: "external_reference",
        targetTitle: "External",
        targetAuthors: [],
        targetAliases: [],
        roles: ["method"],
        weight: 1,
      },
    ],
  });
}

function runtimeConfig(): SynthesisSidecarRuntimeConfig {
  return {
    schema: "synthesis-sidecar-launch-config.v3",
    profileId: "1".repeat(64),
    libraryId: 1,
    profileRuntimeRoot: path.join(ROOT, ".scaffold/test-sidecar-build-canary"),
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
    supervisorInstanceId: "graph-build-canary-supervisor",
    repositoryDbPath: path.join(
      ROOT,
      ".scaffold/test-sidecar-build-canary/state/synthesis.db",
    ),
    canonicalRoot: path.join(
      ROOT,
      ".scaffold/test-sidecar-build-canary/data/synthesis",
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

function clientErrorCode(error: unknown) {
  return error instanceof SynthesisSidecarComputeClientError
    ? error.code
    : "unknown";
}

describe("Synthesis Citation Graph build sidecar canary", function () {
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

  it("matches full and source-slice direct results through real authenticated HTTP and worker", async function () {
    const config = runtimeConfig();
    const pool = createSynthesisSidecarComputeWorkerPool();
    const runtime = await startSynthesisSidecarServer(
      config,
      SERVICE_INSTANCE_ID,
      { computePool: pool },
    );
    const client = createSynthesisSidecarComputeClient();
    const connection = {
      baseUrl: `http://${runtime.host}:${runtime.port}`,
      profileId: config.profileId,
      clientToken: config.clientToken,
      serviceInstanceId: SERVICE_INSTANCE_ID,
    };
    const direct = createInProcessSynthesisCitationGraphBuildEngine();
    try {
      for (const kind of ["full", "source_slice"] as const) {
        const request = graphBuildRequest(kind);
        assert.deepEqual(
          await client.computeCitationGraphBuild(connection, request),
          await direct.compute(request),
        );
      }
    } finally {
      runtime.beginShutdown("test_complete");
      await runtime.stopped;
    }
  });

  it("uses the graph-build capability and rejects runtime or result identity drift", async function () {
    const request = graphBuildRequest();
    const direct =
      await createInProcessSynthesisCitationGraphBuildEngine().compute(request);
    const capabilities: string[] = [];
    const connection = {
      baseUrl: "http://127.0.0.1:1",
      profileId: "1".repeat(64),
      clientToken: CLIENT_TOKEN,
      serviceInstanceId: SERVICE_INSTANCE_ID,
    };
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
      await validClient.computeCitationGraphBuild(connection, request),
      direct,
    );
    assert.deepEqual(capabilities, ["compute.citation_graph_build"]);

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
        .computeCitationGraphBuild(connection, request)
        .then(() => "success")
        .catch(clientErrorCode),
      "worker_result_invalid",
    );
  });

  it("maps caller abort without dispatching a pre-canceled graph build", async function () {
    let fetchCalls = 0;
    const controller = new AbortController();
    controller.abort();
    const client = createSynthesisSidecarComputeClient({
      fetch: async () => {
        fetchCalls += 1;
        return new Response();
      },
    });
    assert.equal(
      await client
        .computeCitationGraphBuild(
          {
            baseUrl: "http://127.0.0.1:1",
            profileId: "1".repeat(64),
            clientToken: CLIENT_TOKEN,
            serviceInstanceId: SERVICE_INSTANCE_ID,
          },
          graphBuildRequest(),
          { signal: controller.signal },
        )
        .then(() => "success")
        .catch(clientErrorCode),
      "worker_canceled",
    );
    assert.equal(fetchCalls, 0);
  });

  it("advertises an internal canary while production graph build remains in process", function () {
    assert.include(
      [...SYNTHESIS_SIDECAR_CAPABILITIES],
      "compute.citation_graph_build",
    );
    assert.include(
      [...SYNTHESIS_SIDECAR_CAPABILITIES],
      "compute.citation_graph_build_transfer",
    );
    const inventory = parseYaml(
      fs.readFileSync(
        path.join(
          ROOT,
          "doc/synthesis-layer/contracts/service-api-migration.yaml",
        ),
        "utf8",
      ),
    ) as {
      internal_engines: Array<{
        id: string;
        implementation: string;
        production_worker: boolean;
        sidecar_worker_canary?: boolean;
        sidecar_transfer_canary?: boolean;
        sidecar_streaming_worker_canary?: boolean;
      }>;
    };
    assert.deepInclude(
      inventory.internal_engines.find(
        (engine) => engine.id === "citation_graph_build",
      ),
      {
        implementation: "in_process",
        production_worker: false,
        sidecar_worker_canary: true,
        sidecar_transfer_canary: true,
        sidecar_streaming_worker_canary: true,
      },
    );
    assert.isFalse(
      fs.existsSync(
        path.join(
          ROOT,
          "src/modules/synthesis/sidecarCitationGraphBuildEngineAdapter.ts",
        ),
      ),
    );
    const productionService = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesis/service.ts"),
      "utf8",
    );
    assert.notInclude(productionService, "synthesisSidecarTransferClient");
  });
});

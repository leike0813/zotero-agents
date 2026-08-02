import { assert } from "chai";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createInProcessSynthesisCitationGraphBuildEngine,
  rebuildSynthesisCitationGraphBuildRequest,
  type SynthesisCitationGraphBuildRequest,
} from "../../packages/synthesis-engine/src/citationGraphBuild";
import {
  buildSynthesisCitationGraphBuildTransferManifest,
  buildSynthesisCitationGraphBuildTransferPage,
} from "../../packages/synthesis-engine/src/citationGraphBuildTransfer";
import { SYNTHESIS_SIDECAR_PROTOCOL } from "../../packages/synthesis-contracts/src/sidecarSystem";
import { createSynthesisSidecarComputeWorkerPool } from "../../apps/synthesis-service/src/computeWorkerPool";
import { startSynthesisSidecarServer } from "../../apps/synthesis-service/src/server";
import type { SynthesisSidecarRuntimeConfig } from "../../apps/synthesis-service/src/runtimeConfig";
import { createSynthesisSidecarTransferClient } from "../../src/modules/synthesisSidecarTransferClient";

const ROOT = path.resolve(import.meta.dirname, "../..");
function config(root: string): SynthesisSidecarRuntimeConfig {
  return {
    schema: "synthesis-sidecar-launch-config.v3",
    profileId: "1".repeat(64),
    libraryId: 1,
    profileRuntimeRoot: root,
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
    supervisorInstanceId: "streaming-worker-supervisor",
    repositoryDbPath: path.join(root, "state", "synthesis.db"),
    canonicalRoot: path.join(root, "data", "synthesis"),
    reverseHost: {
      host: "127.0.0.1",
      port: 1,
      authorizationToken: "reverse-host-token-0123456789abcdef",
    },
    clientToken: "client-token-0123456789abcdef0123456789abcdef",
    lifecycleToken: "lifecycle-token-0123456789abcdef0123456789abcdef",
    port: 0,
  };
}

function smallRequest() {
  return rebuildSynthesisCitationGraphBuildRequest({
    contractVersion: "synthesis-citation-graph-build.v1",
    scope: { kind: "full", sourceIds: [] },
    rolePriority: ["method"],
    libraryNodes: [
      { nodeId: "paper:A", authors: [], aliases: [] },
      { nodeId: "paper:B", authors: [], aliases: [] },
    ],
    references: [
      {
        referenceId: "reference:1",
        edgeId: "edge:1",
        sourceId: "paper:A",
        targetId: "paper:B",
        targetKind: "library_paper",
        targetAuthors: [],
        targetAliases: [],
        roles: ["method"],
        weight: 1,
      },
    ],
  });
}

function normalRequest() {
  const sourceCount = 2_000;
  const referenceCount = 100_000;
  return rebuildSynthesisCitationGraphBuildRequest({
    contractVersion: "synthesis-citation-graph-build.v1",
    scope: { kind: "full", sourceIds: [] },
    rolePriority: ["background", "method"],
    libraryNodes: Array.from({ length: sourceCount }, (_, index) => ({
      nodeId: `paper:${String(index).padStart(4, "0")}`,
      title: `Paper ${index}`,
      authors: [`Author ${index % 50}`],
      aliases: [],
    })),
    references: Array.from({ length: referenceCount }, (_, index) => ({
      referenceId: `reference:${String(index).padStart(6, "0")}`,
      edgeId: `edge:${String(index).padStart(6, "0")}`,
      sourceId: `paper:${String(index % sourceCount).padStart(4, "0")}`,
      targetId: `paper:${String((index + 1) % sourceCount).padStart(4, "0")}`,
      targetKind: "library_paper",
      targetAuthors: [],
      targetAliases: [],
      roles: [index % 2 ? "background" : "method"],
      weight: 1,
    })),
  });
}

function transfer(request: SynthesisCitationGraphBuildRequest) {
  const pages = [
    ...Array.from(
      { length: Math.ceil(request.libraryNodes.length / 500) },
      (_, pageIndex) =>
        buildSynthesisCitationGraphBuildTransferPage(
          "library_nodes",
          pageIndex,
          request.libraryNodes.slice(pageIndex * 500, (pageIndex + 1) * 500),
        ),
    ),
    ...Array.from(
      { length: Math.max(1, Math.ceil(request.references.length / 2_000)) },
      (_, pageIndex) =>
        buildSynthesisCitationGraphBuildTransferPage(
          "references",
          pageIndex,
          request.references.slice(pageIndex * 2_000, (pageIndex + 1) * 2_000),
        ),
    ),
  ];
  return {
    pages,
    manifest: buildSynthesisCitationGraphBuildTransferManifest({
      direction: "input",
      header: {
        contractVersion: request.contractVersion,
        scope: request.scope,
        rolePriority: request.rolePriority,
      },
      pages: pages.map((page) => page.descriptor),
    }),
  };
}

describe("Synthesis Citation Graph Build streaming worker", function () {
  this.timeout(180_000);

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

  async function withRuntime(
    run: (context: {
      client: ReturnType<typeof createSynthesisSidecarTransferClient>;
      connection: {
        baseUrl: string;
        profileId: string;
        clientToken: string;
        serviceInstanceId: string;
      };
    }) => Promise<void>,
  ) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-stream-worker-"));
    const runtimeConfig = config(root);
    const pool = createSynthesisSidecarComputeWorkerPool();
    const runtime = await startSynthesisSidecarServer(
      runtimeConfig,
      "streaming-worker-service",
      { computePool: pool },
    );
    try {
      await run({
        client: createSynthesisSidecarTransferClient({ deadlineMs: 30_000 }),
        connection: {
          baseUrl: `http://${runtime.host}:${runtime.port}`,
          profileId: runtimeConfig.profileId,
          clientToken: runtimeConfig.clientToken,
          serviceInstanceId: runtime.serviceInstanceId,
        },
      });
    } finally {
      runtime.beginShutdown("test_complete");
      await runtime.stopped;
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  async function execute(
    client: ReturnType<typeof createSynthesisSidecarTransferClient>,
    connection: Parameters<typeof client.begin>[0],
    request: SynthesisCitationGraphBuildRequest,
  ) {
    const staged = transfer(request);
    const begun = await client.begin(
      connection,
      `execute:${request.references.length}`,
      staged.manifest,
    );
    for (const page of [...staged.pages].reverse()) {
      await client.putInputPage(connection, begun.sessionId, page);
    }
    await client.sealInput(connection, begun.sessionId);
    assert.equal(
      (await client.execute(connection, begun.sessionId)).state,
      "queued",
    );
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      const status = await client.status(connection, begun.sessionId);
      if (status.state === "completed") {
        return begun.sessionId;
      }
      if (status.execution.lastFailure) {
        assert.fail(`worker failed: ${status.execution.lastFailure.code}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.fail("streaming worker did not complete");
  }

  it("executes and publishes a direct-engine-equivalent result over authenticated HTTP", async function () {
    await withRuntime(async ({ client, connection }) => {
      const request = smallRequest();
      const expected =
        await createInProcessSynthesisCitationGraphBuildEngine().compute(
          request,
        );
      const sessionId = await execute(client, connection, request);
      const manifest = await client.getOutputManifest(connection, sessionId);
      const byKind = new Map<string, unknown[]>();
      for (const descriptor of manifest.pages) {
        const page = await client.getOutputPage(
          connection,
          sessionId,
          descriptor.kind,
          descriptor.pageIndex,
        );
        byKind.set(descriptor.kind, [
          ...(byKind.get(descriptor.kind) ?? []),
          ...page.rows,
        ]);
      }
      assert.deepEqual(
        {
          contractVersion: manifest.header.contractVersion,
          scope: manifest.header.scope,
          nodes: byKind.get("nodes") ?? [],
          resolvedEdges: byKind.get("resolved_edges") ?? [],
          aggregateEdges: byKind.get("aggregate_edges") ?? [],
          sourceOwnership: byKind.get("source_ownership") ?? [],
          incomingGroups: byKind.get("incoming_groups") ?? [],
          lightMetrics: byKind.get("light_metrics") ?? [],
          diagnostics: manifest.header.diagnostics,
        },
        expected,
      );
    });
  });

  it("completes the normal 2,000-source/100,000-reference profile", async function () {
    await withRuntime(async ({ client, connection }) => {
      const request = normalRequest();
      const sessionId = await execute(client, connection, request);
      const manifest = await client.getOutputManifest(connection, sessionId);
      assert.equal(
        (manifest.header.diagnostics as { referenceCount: number })
          .referenceCount,
        100_000,
      );
      assert.isAbove(
        manifest.pages.reduce((sum, page) => sum + page.byteLength, 0),
        8 * 1024 * 1024,
      );
    });
  });

  it("keeps production Citation Graph Build on the in-process composition", function () {
    const composition = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/legacyComposition.ts"),
      "utf8",
    );
    assert.include(
      composition,
      "createInProcessSynthesisCitationGraphBuildEngine",
    );
    assert.notInclude(composition, "createSynthesisSidecarTransferClient");
  });

  it("keeps native worker, transfer, capability, and service authorities separate", function () {
    const runtimeRoot = path.join(
      ROOT,
      "native/synthesis-sidecar/crates/synthesis-sidecar/src",
    );
    const worker = fs.readFileSync(
      path.join(runtimeRoot, "runtime_worker.rs"),
      "utf8",
    );
    const workerPool = fs.readFileSync(
      path.join(runtimeRoot, "runtime_worker_pool.rs"),
      "utf8",
    );
    const transfer = fs.readFileSync(
      path.join(runtimeRoot, "runtime_transfer.rs"),
      "utf8",
    );
    const capabilities = fs.readFileSync(
      path.join(runtimeRoot, "runtime_capabilities.rs"),
      "utf8",
    );
    const service = fs.readFileSync(
      path.join(runtimeRoot, "runtime_service.rs"),
      "utf8",
    );

    assert.notInclude(transfer, "synthesis_citation_graph_build");
    for (const source of [worker, workerPool]) {
      assert.notInclude(source, "synthesis_repository");
      assert.notInclude(source, "synthesis_canonical_store");
      assert.notInclude(source, "WorkbenchApplication");
      assert.notInclude(source, "NativeLaunchConfig");
    }
    assert.include(workerPool, "enum WorkerOperation");
    assert.include(workerPool, "trait PagedInputSource");
    assert.include(workerPool, "trait PagedOutputSink");
    assert.include(capabilities, "match call.capability.as_str()");
    assert.notInclude(service, "enum WorkerCommand");
    assert.notInclude(service, "match call.capability.as_str()");
    assert.isBelow(service.split("\n").length, 300);
  });
});

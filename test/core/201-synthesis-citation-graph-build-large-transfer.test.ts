import { assert } from "chai";
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
  rebuildSynthesisCitationGraphBuildTransferPage,
} from "../../packages/synthesis-engine/src/citationGraphBuildTransfer";
import {
  SYNTHESIS_SIDECAR_TRANSFER_LIMITS,
  type SynthesisSidecarTransferManifest,
} from "../../packages/synthesis-contracts/src/sidecarTransfer";
import { SYNTHESIS_SIDECAR_PROTOCOL } from "../../packages/synthesis-contracts/src/sidecarSystem";
import {
  CitationGraphTransferError,
  createCitationGraphTransferOwner,
} from "../../apps/synthesis-service/src/citationGraphTransferOwner";
import type { SynthesisSidecarRuntimeConfig } from "../../apps/synthesis-service/src/runtimeConfig";
import { startSynthesisSidecarServer } from "../../apps/synthesis-service/src/server";
import { createSynthesisSidecarTransferClient } from "../../src/modules/synthesisSidecarTransferClient";

const CLIENT_TOKEN = "client-token-0123456789abcdef0123456789abcdef";
const SERVICE_INSTANCE_ID = "large-transfer-service";

function graphBuildRequest(): SynthesisCitationGraphBuildRequest {
  return rebuildSynthesisCitationGraphBuildRequest({
    contractVersion: "synthesis-citation-graph-build.v1",
    scope: { kind: "source_slice", sourceIds: ["paper:A"] },
    rolePriority: ["background", "method"],
    libraryNodes: [
      {
        nodeId: "paper:A",
        title: "Source",
        authors: ["Author A"],
        aliases: [],
      },
      {
        nodeId: "paper:B",
        title: "Target",
        authors: ["Author B"],
        aliases: ["target:b"],
      },
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
        roles: ["background"],
        weight: 1,
      },
    ],
  });
}

function inputPages(request = graphBuildRequest()) {
  return [
    buildSynthesisCitationGraphBuildTransferPage(
      "library_nodes",
      0,
      request.libraryNodes,
    ),
    buildSynthesisCitationGraphBuildTransferPage(
      "references",
      0,
      request.references,
    ),
  ];
}

function inputManifest(request = graphBuildRequest()) {
  const pages = inputPages(request);
  return buildSynthesisCitationGraphBuildTransferManifest({
    direction: "input",
    header: {
      contractVersion: request.contractVersion,
      scope: request.scope,
      rolePriority: request.rolePriority,
    },
    pages: pages.map((page) => page.descriptor),
  });
}

function runtimeConfig(
  profileRuntimeRoot: string,
): SynthesisSidecarRuntimeConfig {
  return {
    schema: "synthesis-sidecar-launch-config.v1",
    profileId: "1".repeat(64),
    profileRuntimeRoot,
    runtimeRootId: "2".repeat(64),
    dataRootId: "3".repeat(64),
    bundleId: "4".repeat(64),
    nodeVersion: "24.18.0",
    serviceVersion: "0.1.0-test",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: "synthesis-schema.test.v1",
    supervisorInstanceId: "large-transfer-supervisor",
    leaseNonce: "large-transfer-lease",
    clientToken: CLIENT_TOKEN,
    lifecycleToken: "lifecycle-token-0123456789abcdef0123456789abcdef",
    mutationEnabled: false,
    port: 0,
  };
}

function errorCode(error: unknown) {
  return error instanceof CitationGraphTransferError ? error.code : "unknown";
}

describe("Synthesis Citation Graph Build large transfer", function () {
  this.timeout(20_000);

  it("uses strict page DTOs and reassembles the direct-engine oracle", async function () {
    const request = graphBuildRequest();
    const result =
      await createInProcessSynthesisCitationGraphBuildEngine().compute(request);
    const input = inputPages(request);
    const output = [
      buildSynthesisCitationGraphBuildTransferPage("nodes", 0, result.nodes),
      buildSynthesisCitationGraphBuildTransferPage(
        "resolved_edges",
        0,
        result.resolvedEdges,
      ),
      buildSynthesisCitationGraphBuildTransferPage(
        "aggregate_edges",
        0,
        result.aggregateEdges,
      ),
      buildSynthesisCitationGraphBuildTransferPage(
        "source_ownership",
        0,
        result.sourceOwnership,
      ),
      buildSynthesisCitationGraphBuildTransferPage(
        "incoming_groups",
        0,
        result.incomingGroups,
      ),
      buildSynthesisCitationGraphBuildTransferPage(
        "light_metrics",
        0,
        result.lightMetrics,
      ),
    ];

    assert.deepEqual(
      rebuildSynthesisCitationGraphBuildTransferPage(input[0]),
      input[0],
    );
    assert.deepEqual(
      {
        ...request,
        libraryNodes: input[0].rows,
        references: input[1].rows,
      },
      request,
    );
    assert.deepEqual(
      {
        contractVersion: result.contractVersion,
        scope: result.scope,
        nodes: output[0].rows,
        resolvedEdges: output[1].rows,
        aggregateEdges: output[2].rows,
        sourceOwnership: output[3].rows,
        incomingGroups: output[4].rows,
        lightMetrics: output[5].rows,
        diagnostics: result.diagnostics,
      },
      result,
    );
  });

  it("seals aggregate input beyond the monolithic 8 MiB compute body", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-transfer-large-"));
    const owner = createCitationGraphTransferOwner({ root });
    const title = "x".repeat(3_500);
    const pages = [0, 1, 2].map((pageIndex) =>
      buildSynthesisCitationGraphBuildTransferPage(
        "library_nodes",
        pageIndex,
        Array.from({ length: 820 }, (_, index) => ({
          nodeId: `paper:${pageIndex}:${index}`,
          title,
          authors: [],
          aliases: [],
        })),
      ),
    );
    pages.push(
      buildSynthesisCitationGraphBuildTransferPage("references", 0, []),
    );
    const manifest = buildSynthesisCitationGraphBuildTransferManifest({
      direction: "input",
      header: {
        contractVersion: "synthesis-citation-graph-build.v1",
        scope: { kind: "full", sourceIds: [] },
        rolePriority: [],
      },
      pages: pages.map((page) => page.descriptor),
    });
    assert.isAbove(
      manifest.pages.reduce((sum, page) => sum + page.byteLength, 0),
      8 * 1024 * 1024,
    );
    try {
      const session = owner.begin("large-input", manifest);
      for (const page of pages.reverse()) {
        owner.putInputPage(session.sessionId, page);
      }
      assert.equal(owner.sealInput(session.sessionId).state, "input_sealed");
    } finally {
      await owner.shutdown();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("enforces idempotent begin/page upload, seal completeness, output paging, and cancel", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-transfer-owner-"));
    let now = 1_000;
    const owner = createCitationGraphTransferOwner({
      root,
      now: () => now,
      reaperIntervalMs: 60_000,
    });
    const manifest = inputManifest();
    const pages = inputPages();
    try {
      const first = owner.begin("idempotency:1", manifest);
      assert.deepEqual(owner.begin("idempotency:1", manifest), first);
      assert.equal(owner.snapshot().sessions, 1);
      assert.equal(
        await Promise.resolve()
          .then(() =>
            owner.begin("idempotency:1", {
              ...manifest,
              rootSha256: `sha256:${"0".repeat(64)}`,
            }),
          )
          .then(() => "success")
          .catch(errorCode),
        "transfer_conflict",
      );

      owner.putInputPage(first.sessionId, pages[1]);
      assert.equal(
        await Promise.resolve()
          .then(() => owner.sealInput(first.sessionId))
          .then(() => "success")
          .catch(errorCode),
        "transfer_incomplete",
      );
      owner.putInputPage(first.sessionId, pages[0]);
      const stagedBytes = owner.snapshot().stagedBytes;
      owner.putInputPage(first.sessionId, pages[0]);
      assert.equal(owner.snapshot().stagedBytes, stagedBytes);
      assert.equal(owner.sealInput(first.sessionId).state, "input_sealed");

      const result =
        await createInProcessSynthesisCitationGraphBuildEngine().compute(
          graphBuildRequest(),
        );
      const outputPage = buildSynthesisCitationGraphBuildTransferPage(
        "nodes",
        0,
        result.nodes,
      );
      const outputManifest = buildSynthesisCitationGraphBuildTransferManifest({
        direction: "output",
        header: {
          contractVersion: result.contractVersion,
          scope: result.scope,
          diagnostics: result.diagnostics,
        },
        pages: [outputPage.descriptor],
      });
      owner.beginOutput(first.sessionId, outputManifest);
      owner.putOutputPage(first.sessionId, outputPage);
      owner.sealOutput(first.sessionId);
      assert.deepEqual(
        owner.getOutputManifest(first.sessionId),
        outputManifest,
      );
      assert.deepEqual(
        owner.getOutputPage(first.sessionId, "nodes", 0),
        outputPage,
      );

      now += SYNTHESIS_SIDECAR_TRANSFER_LIMITS.idleTtlMs + 1;
      owner.reapExpired();
      assert.equal(owner.snapshot().sessions, 0);
      assert.equal(
        await Promise.resolve()
          .then(() => owner.status(first.sessionId))
          .then(() => "success")
          .catch(errorCode),
        "transfer_not_found",
      );
    } finally {
      await owner.shutdown();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a third active session and invalid page identities", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-transfer-bound-"));
    const owner = createCitationGraphTransferOwner({ root });
    try {
      const manifest = inputManifest();
      const first = owner.begin("idempotency:1", manifest);
      owner.begin("idempotency:2", manifest);
      assert.equal(
        await Promise.resolve()
          .then(() => owner.begin("idempotency:3", manifest))
          .then(() => "success")
          .catch(errorCode),
        "transfer_busy",
      );
      const page = inputPages()[0];
      assert.equal(
        await Promise.resolve()
          .then(() =>
            owner.putInputPage(first.sessionId, {
              ...page,
              rows: [{ ...page.rows[0], nodeId: "paper:changed" }],
            }),
          )
          .then(() => "success")
          .catch(errorCode),
        "transfer_conflict",
      );
    } finally {
      await owner.shutdown();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("stages input and returns internally published output over authenticated HTTP", async function () {
    const profileRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-transfer-http-"),
    );
    const config = runtimeConfig(profileRoot);
    const owner = createCitationGraphTransferOwner({
      root: path.join(
        profileRoot,
        "sessions",
        config.supervisorInstanceId,
        "citation-graph-transfers",
      ),
    });
    const runtime = await startSynthesisSidecarServer(
      config,
      SERVICE_INSTANCE_ID,
      { transferOwner: owner },
    );
    const client = createSynthesisSidecarTransferClient();
    const connection = {
      baseUrl: `http://${runtime.host}:${runtime.port}`,
      profileId: config.profileId,
      clientToken: config.clientToken,
      serviceInstanceId: SERVICE_INSTANCE_ID,
    };
    try {
      const begun = await client.begin(
        connection,
        "http-idempotency",
        inputManifest(),
      );
      for (const page of inputPages().reverse()) {
        await client.putInputPage(connection, begun.sessionId, page);
      }
      assert.equal(
        (await client.sealInput(connection, begun.sessionId)).state,
        "input_sealed",
      );
      const health = (await fetch(
        `${connection.baseUrl}/synthesis/v1/health`,
      ).then((response) => response.json())) as {
        citationGraphTransfer: { sessions: number };
      };
      assert.equal(health.citationGraphTransfer.sessions, 1);

      const result =
        await createInProcessSynthesisCitationGraphBuildEngine().compute(
          graphBuildRequest(),
        );
      const page = buildSynthesisCitationGraphBuildTransferPage(
        "nodes",
        0,
        result.nodes,
      );
      const manifest: SynthesisSidecarTransferManifest =
        buildSynthesisCitationGraphBuildTransferManifest({
          direction: "output",
          header: {
            contractVersion: result.contractVersion,
            scope: result.scope,
            diagnostics: result.diagnostics,
          },
          pages: [page.descriptor],
        });
      owner.beginOutput(begun.sessionId, manifest);
      owner.putOutputPage(begun.sessionId, page);
      owner.sealOutput(begun.sessionId);
      assert.deepEqual(
        await client.getOutputManifest(connection, begun.sessionId),
        manifest,
      );
      assert.deepEqual(
        await client.getOutputPage(connection, begun.sessionId, "nodes", 0),
        page,
      );
    } finally {
      runtime.beginShutdown("test_complete");
      await runtime.stopped;
      fs.rmSync(profileRoot, { recursive: true, force: true });
    }
  });
});

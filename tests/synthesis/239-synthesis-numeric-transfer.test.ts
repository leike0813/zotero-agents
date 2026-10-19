import { assert } from "chai";
import { rejects } from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildSynthesisCitationGraphBuildTransferManifest,
  buildSynthesisCitationGraphBuildTransferPage,
  rebuildSynthesisCitationGraphBuildTransferPage,
} from "../../packages/synthesis-engine/src/citationGraphBuildTransfer";
import {
  rebuildSynthesisProtocolCapabilityDto,
  rebuildSynthesisProtocolDto,
  SynthesisClientError,
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_PROTOCOL,
} from "../../packages/synthesis-contracts/src";
import {
  appendSynthesisProtocolExecutionEvidence,
  readSynthesisProtocolExecutionEvidence,
  synthesisProtocolExecutionIdentity,
} from "../../scripts/synthesis/synthesisProtocolExecutionEvidence";
import {
  canonicalizeSynthesisContractJson,
  hashSynthesisContractCanonicalJson,
} from "../../packages/synthesis-contracts/src/canonicalJson";
import {
  SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
  SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
} from "../../packages/synthesis-contracts/src/sidecarTransfer";
import {
  startSynthesisProductionRouteHarness,
  SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION,
} from "../helpers/synthesisProductionRouteHarness";

const PROTOCOL_PARTS = ["request", "result", "error"] as const;

/**
 * The executed slots of a capability, keyed exactly like
 * `inspectSynthesisProtocolCoverage`: a slot is missing when it lacks an
 * accepted record, lacks a rejected record, or ever recorded a divergence.
 */
function executedProtocolSlots() {
  return new Set(
    readSynthesisProtocolExecutionEvidence().map(
      (entry) => `${entry.slot}:${entry.outcome}`,
    ),
  );
}

function assertProtocolExecutionReach(
  executed: ReadonlySet<string>,
  capability: string,
) {
  for (const part of PROTOCOL_PARTS) {
    assert.isTrue(
      executed.has(`${capability}:${part}:accepted`),
      `${capability}:${part}:accepted`,
    );
    assert.isTrue(
      executed.has(`${capability}:${part}:rejected`),
      `${capability}:${part}:rejected`,
    );
    assert.isFalse(
      executed.has(`${capability}:${part}:diverged`),
      `${capability}:${part}:diverged`,
    );
  }
}

const SIDECAR_ERROR_PROTOCOL_DTO = {
  schemaId:
    "https://zotero-agents.local/synthesis/sidecar-protocol/v1/common.schema.json",
  definition: "sidecarError",
  direction: "result",
} as const;

/** The harness writes the synthetic launch config it starts the sidecar with. */
function readHarnessSessionConfig(root: string, id: string) {
  return JSON.parse(
    fs.readFileSync(
      path.join(root, "runtime", "sessions", id, "config.json"),
      "utf8",
    ),
  ) as Record<string, any>;
}

const acceptsCapabilityDto = (args: {
  capability: string;
  direction: "request" | "result";
  value: unknown;
}) => {
  try {
    rebuildSynthesisProtocolCapabilityDto(args);
    return true;
  } catch (error) {
    if (!(error instanceof SynthesisClientError)) throw error;
    return false;
  }
};

/**
 * `system.shutdown` is gated on the lifecycle credential, which the harness
 * client does not carry, so its receipt is requested directly and recorded with
 * the same production validators the measured client applies.
 */
function recordRawProtocolExecution(args: {
  capability: string;
  payload: unknown;
  body: Record<string, any>;
}) {
  const identity = synthesisProtocolExecutionIdentity();
  if (!identity) throw new Error("native_execution_identity_missing");
  const record = (
    part: string,
    outcome: "accepted" | "rejected" | "diverged",
  ) =>
    appendSynthesisProtocolExecutionEvidence(
      identity,
      `${args.capability}:${part}`,
      outcome,
    );
  const requestAccepted = acceptsCapabilityDto({
    capability: args.capability,
    direction: "request",
    value: args.payload,
  });
  if (
    requestAccepted &&
    (args.body.ok ||
      !["invalid_request", "malformed_json"].includes(args.body.error?.code))
  )
    record("request", "accepted");
  if (!requestAccepted && args.body.error?.code === "invalid_request")
    record("request", "rejected");
  if (args.body.ok) {
    const resultAccepted = acceptsCapabilityDto({
      capability: args.capability,
      direction: "result",
      value: args.body.data,
    });
    if (!resultAccepted) {
      record("result", "diverged");
      return;
    }
    record("result", "accepted");
    if (
      !acceptsCapabilityDto({
        capability: args.capability,
        direction: "result",
        value: { ...args.body.data, __unexpected: true },
      })
    )
      record("result", "rejected");
    return;
  }
  if (!args.body.error) return;
  try {
    rebuildSynthesisProtocolDto({
      ...SIDECAR_ERROR_PROTOCOL_DTO,
      value: args.body.error,
    });
    record("error", "accepted");
  } catch (error) {
    if (!(error instanceof SynthesisClientError)) throw error;
    record("error", "diverged");
    return;
  }
  try {
    rebuildSynthesisProtocolDto({
      ...SIDECAR_ERROR_PROTOCOL_DTO,
      value: { ...args.body.error, code: "__invalid_error_code" },
    });
  } catch (error) {
    if (!(error instanceof SynthesisClientError)) throw error;
    record("error", "rejected");
  }
}

describe("Synthesis cross-language numeric transfer", function () {
  this.timeout(30_000);

  it("admits ECMAScript numeric page hashes through the real Rust transfer", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "numeric-transfer",
    });
    const weights = [1, 0.000001, 1e-7, 1e20, 1e21, 333333333.3333333];
    const pages = [
      buildSynthesisCitationGraphBuildTransferPage("library_nodes", 0, [
        { nodeId: "paper:source", title: "Source", authors: [], aliases: [] },
        { nodeId: "paper:target", title: "Target", authors: [], aliases: [] },
      ]),
      buildSynthesisCitationGraphBuildTransferPage(
        "references",
        0,
        weights.map((weight, index) => ({
          referenceId: `reference:${index}`,
          edgeId: `edge:${index}`,
          sourceId: "paper:source",
          targetId: "paper:target",
          targetKind: "library_paper",
          targetAuthors: [],
          targetAliases: [],
          roles: [],
          weight,
        })),
      ),
    ];
    const manifest = buildSynthesisCitationGraphBuildTransferManifest({
      direction: "input",
      header: {
        contractVersion: "synthesis-citation-graph-build.v1",
        scope: { kind: "full", sourceIds: [] },
        rolePriority: [],
      },
      pages: pages.map((page) => page.descriptor),
    });
    try {
      const call = (payload: unknown) =>
        harness.call(
          "compute.citation_graph_build_transfer",
          payload,
        ) as Promise<any>;
      const { sessionId } = await call({
        action: "begin",
        idempotencyKey: "numeric",
        manifest,
      });
      const tampered = structuredClone(pages[1]);
      (tampered.rows[0] as { weight: number }).weight = 2;
      await rejects(
        call({ action: "put_input_page", sessionId, page: tampered }),
        { code: "transfer_conflict" },
      );
      for (const page of pages)
        await call({ action: "put_input_page", sessionId, page });
      await call({ action: "seal_input", sessionId });
      await call({ action: "execute", sessionId });
      let status;
      const deadline = Date.now() + 10_000;
      do {
        status = await call({ action: "status", sessionId });
        if (
          ["completed", "failed", "canceled"].includes(status.state) ||
          status.execution?.lastFailure
        )
          break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      } while (Date.now() < deadline);
      assert.equal(
        status.state,
        "completed",
        JSON.stringify(status) + harness.stderr(),
      );
      const output = await call({ action: "get_output_manifest", sessionId });
      const resolved: Array<{ weight: number }> = [];
      for (const descriptor of output.pages) {
        const rawPage = await call({
          action: "get_output_page",
          sessionId,
          kind: descriptor.kind,
          pageIndex: descriptor.pageIndex,
        });
        // The raw page the transfer actually emitted has to satisfy the
        // production result contract, so a numeric aggregate the schema cannot
        // express fails here instead of passing silently.
        rebuildSynthesisProtocolCapabilityDto({
          capability: "compute.citation_graph_build_transfer",
          direction: "result",
          value: rawPage,
        });
        const page = rebuildSynthesisCitationGraphBuildTransferPage(rawPage);
        if (descriptor.kind === "resolved_edges")
          resolved.push(...(page.rows as Array<{ weight: number }>));
      }
      assert.sameMembers(
        resolved.map((row) => row.weight),
        weights,
      );
    } finally {
      await harness.stop();
    }
  });
});

describe("Synthesis sidecar non-client protocol execution", function () {
  this.timeout(120_000);

  const metricsRequest = {
    graphHash: `sha256:${"7".repeat(64)}`,
    nodes: [
      {
        nodeId: "paper:source",
        kind: "library_paper",
        libraryId: 1,
        itemKey: "ITEMSOURCE",
        title: "Source",
        year: "2020",
      },
      {
        nodeId: "ref:target",
        kind: "external_reference",
        title: "Target",
        year: "2021",
      },
    ],
    edges: [
      {
        edgeId: "edge:source-target",
        source: "paper:source",
        target: "ref:target",
        mentionCount: 3,
      },
    ],
  };

  const layoutRequest = {
    graphHash: `sha256:${"8".repeat(64)}`,
    algorithm: "components",
    nodes: [
      {
        nodeId: "paper:source",
        kind: "library_paper",
        title: "Source",
        initialX: 0,
        initialY: 0,
      },
      {
        nodeId: "ref:target",
        kind: "external_reference",
        title: "Target",
        initialX: 1,
        initialY: 1,
      },
    ],
    edges: [
      {
        edgeId: "edge:source-target",
        source: "paper:source",
        target: "ref:target",
      },
    ],
  };

  const graphBuildRequest = {
    contractVersion: "synthesis-citation-graph-build.v1",
    scope: { kind: "full", sourceIds: [] },
    rolePriority: ["background"],
    libraryNodes: [
      { nodeId: "paper:source", title: "Source", authors: [], aliases: [] },
      { nodeId: "paper:target", title: "Target", authors: [], aliases: [] },
    ],
    references: [
      {
        referenceId: "reference:external",
        edgeId: "edge:external",
        sourceId: "paper:source",
        targetId: "ref:external",
        targetKind: "external_reference",
        targetAuthors: [],
        targetAliases: [],
        roles: ["background"],
        weight: 2,
      },
      {
        referenceId: "reference:library",
        edgeId: "edge:library",
        sourceId: "paper:source",
        targetId: "paper:target",
        targetKind: "library_paper",
        targetAuthors: [],
        targetAliases: [],
        roles: ["background"],
        weight: 3,
      },
    ],
  };

  it("executes compute.citation_graph_layout through the real Rust worker", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "layout-protocol-execution",
    });
    try {
      const result = (await harness.call(
        "compute.citation_graph_layout",
        layoutRequest,
      )) as any;
      assert.equal(result.graphHash, layoutRequest.graphHash);
      assert.equal(result.algorithm, "components");
      assert.equal(result.layoutEngine, "components-rust");
      assert.equal(result.layoutVersion, 3);
      assert.sameMembers(
        result.nodes.map((node: { nodeId: string }) => node.nodeId),
        ["paper:source", "ref:target"],
      );
      for (const node of result.nodes)
        assert.isTrue(Number.isFinite(node.x) && Number.isFinite(node.y));
      const unicodeId = "😀".repeat(512);
      const unicode = (await harness.call("compute.citation_graph_layout", {
        ...layoutRequest,
        algorithm: "radial",
        nodes: [
          {
            nodeId: unicodeId,
            kind: "library_paper",
            title: "😀".repeat(4096),
            initialX: 0,
            initialY: 0,
          },
        ],
        edges: [],
      })) as { nodes: Array<{ nodeId: string; x: number; y: number }> };
      assert.lengthOf(unicode.nodes, 1);
      assert.equal(unicode.nodes[0].nodeId, unicodeId);
      assert.isTrue(
        Number.isFinite(unicode.nodes[0].x) &&
          Number.isFinite(unicode.nodes[0].y),
      );
      await rejects(
        harness.call("compute.citation_graph_layout", {
          ...layoutRequest,
          unexpectedField: true,
        }),
        (error: any) => error?.code === "invalid_request",
      );
      assertProtocolExecutionReach(
        executedProtocolSlots(),
        "compute.citation_graph_layout",
      );
    } finally {
      await harness.stop();
    }
  });

  it("executes compute.citation_graph_metrics through the real Rust worker", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "metrics-protocol-execution",
    });
    try {
      const result = (await harness.call(
        "compute.citation_graph_metrics",
        metricsRequest,
      )) as any;
      assert.equal(result.graphHash, metricsRequest.graphHash);
      assert.equal(result.diagnostics.libraryNodeCount, 1);
      assert.deepEqual(
        result.libraryNodeMetrics.map((row: { nodeId: string }) => row.nodeId),
        ["paper:source"],
      );
      assert.equal(result.libraryNodeMetrics[0].externalReferenceCount, 3);
      const unicodeId = "😀".repeat(512);
      const unicode = (await harness.call("compute.citation_graph_metrics", {
        graphHash: metricsRequest.graphHash,
        nodes: [
          {
            nodeId: unicodeId,
            kind: "library_paper",
            libraryId: 1,
            itemKey: "",
            title: "😀".repeat(4096),
            year: "",
          },
        ],
        edges: [],
      })) as any;
      assert.equal(unicode.libraryNodeMetrics[0].nodeId, unicodeId);
      await rejects(
        harness.call("compute.citation_graph_metrics", {
          ...metricsRequest,
          unexpectedField: true,
        }),
        (error: any) => error?.code === "invalid_request",
      );
      assertProtocolExecutionReach(
        executedProtocolSlots(),
        "compute.citation_graph_metrics",
      );
    } finally {
      await harness.stop();
    }
  });

  it("executes compute.citation_graph_build through the real Rust worker", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "graph-build-protocol-execution",
    });
    try {
      const result = (await harness.call(
        "compute.citation_graph_build",
        graphBuildRequest,
      )) as any;
      assert.equal(result.contractVersion, "synthesis-citation-graph-build.v1");
      assert.deepEqual(result.diagnostics.nodeCounts, {
        library_paper: 2,
        external_reference: 1,
        unresolved_reference: 0,
      });
      assert.equal(result.diagnostics.referenceCount, 2);
      // A library target resolves; an external target stays unbound.
      assert.sameDeepMembers(
        result.resolvedEdges.map(
          (row: { referenceId: string; status: string; weight: number }) => [
            row.referenceId,
            row.status,
            row.weight,
          ],
        ),
        [
          ["reference:external", "unbound", 2],
          ["reference:library", "accepted", 3],
        ],
      );
      assert.sameDeepMembers(
        result.aggregateEdges.map(
          (row: {
            sourceId: string;
            targetId: string;
            mentionCount: number;
          }) => [row.sourceId, row.targetId, row.mentionCount],
        ),
        [
          ["paper:source", "ref:external", 2],
          ["paper:source", "paper:target", 3],
        ],
      );
      assert.includeMembers(
        result.nodes.map((node: { nodeId: string }) => node.nodeId),
        ["paper:source", "paper:target", "ref:external"],
      );
      await rejects(
        harness.call("compute.citation_graph_build", {
          ...graphBuildRequest,
          unexpectedField: true,
        }),
        (error: any) => error?.code === "invalid_request",
      );
      assertProtocolExecutionReach(
        executedProtocolSlots(),
        "compute.citation_graph_build",
      );
    } finally {
      await harness.stop();
    }
  });

  it("rejects an unknown field on a build transfer action", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "build-transfer-reject",
    });
    try {
      await rejects(
        harness.call("compute.citation_graph_build_transfer", {
          action: "status",
          sessionId: "session-build-transfer-reject",
          unexpectedField: true,
        }),
        (error: any) => error?.code === "invalid_request",
      );
      // The result and error slots come from the numeric transfer test above;
      // this file is the unit the stage1 runner executes.
      assertProtocolExecutionReach(
        executedProtocolSlots(),
        "compute.citation_graph_build_transfer",
      );
    } finally {
      await harness.stop();
    }
  });

  it("executes transfer.content through the real Rust transfer owner", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "content-transfer-protocol-execution",
    });
    try {
      const text = "canonical content payload";
      const rows = [text];
      const descriptor = {
        kind: "content" as const,
        pageIndex: 0,
        rowCount: rows.length,
        byteLength: Buffer.byteLength(
          canonicalizeSynthesisContractJson(rows),
          "utf8",
        ),
        sha256: hashSynthesisContractCanonicalJson(rows),
      };
      const manifestBody = {
        transferVersion: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
        encoding: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
        direction: "input" as const,
        header: {
          target: "topic_apply_assets" as const,
          assets: [
            {
              id: "asset:note",
              mediaType: "text/plain" as const,
              byteLength: Buffer.byteLength(text, "utf8"),
              sha256: hashSynthesisContractCanonicalJson(text),
              firstPage: 0,
              pageCount: 1,
            },
          ],
        },
        pages: [descriptor],
      };
      const manifest = {
        ...manifestBody,
        rootSha256: hashSynthesisContractCanonicalJson(manifestBody),
      };
      const call = (payload: unknown) =>
        harness.call("transfer.content", payload) as Promise<any>;
      const begun = await call({
        action: "begin",
        idempotencyKey: "content-transfer",
        manifest,
      });
      assert.equal(begun.state, "receiving_input");
      assert.equal(begun.input.totalPages, 1);
      const staged = await call({
        action: "put_input_page",
        sessionId: begun.sessionId,
        page: { descriptor, rows },
      });
      assert.equal(staged.input.receivedPages, 1);
      const sealed = await call({
        action: "seal_input",
        sessionId: begun.sessionId,
      });
      assert.equal(sealed.state, "input_sealed");
      const canceled = await call({
        action: "cancel",
        sessionId: begun.sessionId,
      });
      assert.deepEqual(canceled, { canceled: true });
      // Execution belongs to the capability that consumes the staged content, so
      // this route refuses it outright.
      await rejects(
        call({ action: "execute", sessionId: begun.sessionId }),
        (error: any) => error?.code === "invalid_request",
      );
      await rejects(
        call({
          action: "begin",
          idempotencyKey: "content-transfer",
          manifest,
          unexpectedField: true,
        }),
        (error: any) => error?.code === "invalid_request",
      );
      assertProtocolExecutionReach(executedProtocolSlots(), "transfer.content");
    } finally {
      await harness.stop();
    }
  });

  it("executes system.handshake against the real sidecar identity", async function () {
    const id = "handshake-protocol-execution";
    const harness = await startSynthesisProductionRouteHarness({ id });
    try {
      const config = readHarnessSessionConfig(harness.root, id);
      const request = {
        schemaVersion: config.schemaVersion,
        bundleId: config.bundleId,
        buildFingerprint: config.buildFingerprint,
        supervisorInstanceId: config.supervisorInstanceId,
      };
      const result = (await harness.call("system.handshake", request)) as any;
      assert.equal(result.implementation, "rust-native");
      assert.equal(result.protocol, SYNTHESIS_SIDECAR_PROTOCOL);
      assert.equal(result.bundleId, config.bundleId);
      assert.equal(result.buildFingerprint, config.buildFingerprint);
      assert.equal(result.profileId, config.profileId);
      assert.equal(result.runtimeRootId, config.runtimeRootId);
      assert.equal(result.dataRootId, config.dataRootId);
      assert.equal(result.lifecycleState, "ready");
      assert.deepEqual(result.capabilities, [
        ...SYNTHESIS_SIDECAR_CAPABILITIES,
      ]);
      // The host consumes a handshake only when the production result contract
      // admits it, so the real handshake is validated before it is trusted.
      rebuildSynthesisProtocolCapabilityDto({
        capability: "system.handshake",
        direction: "result",
        value: result,
      });
      // A build identity the sidecar was not launched with is a runtime
      // mismatch, not a malformed request.
      await rejects(
        harness.call("system.handshake", {
          ...request,
          buildFingerprint: "6".repeat(64),
        }),
        (error: any) => error?.code === "runtime_mismatch",
      );
      await rejects(
        harness.call("system.handshake", {
          ...request,
          unexpectedField: true,
        }),
        (error: any) => error?.code === "invalid_request",
      );
      assertProtocolExecutionReach(executedProtocolSlots(), "system.handshake");
    } finally {
      await harness.stop();
    }
  });

  it("executes workbench.chrome.read against the real sidecar repository", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "chrome-protocol-execution",
    });
    try {
      const result = (await harness.call("workbench.chrome.read", {})) as any;
      assert.deepEqual(
        result.maintenance.cacheReadiness.map(
          (entry: { cacheKind: string }) => entry.cacheKind,
        ),
        ["reference-sidecar", "citation_graph"],
      );
      for (const entry of result.maintenance.cacheReadiness)
        assert.include(
          ["missing", "ready", "stale", "refreshing", "failed"],
          entry.status,
        );
      assert.deepEqual(result.maintenance.backgroundJobs, []);
      await rejects(
        harness.call("workbench.chrome.read", { unexpectedField: true }),
        (error: any) => error?.code === "invalid_request",
      );
      assertProtocolExecutionReach(
        executedProtocolSlots(),
        "workbench.chrome.read",
      );
    } finally {
      await harness.stop();
    }
  });

  it("executes topics.canonical.inspect against the real canonical store", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "canonical-inspect-protocol-execution",
    });
    try {
      const first = (await harness.call("topics.canonical.inspect", {
        topicId: "topic:absent-one",
      })) as any;
      const second = (await harness.call("topics.canonical.inspect", {
        topicId: "topic:absent-two",
      })) as any;
      // A Topic that was never written is reported absent with its derived path
      // identity and no descriptors, and never with canonical payloads.
      assert.equal(first.status, "absent");
      assert.equal(first.topicId, "topic:absent-one");
      assert.isString(first.pathId);
      assert.notEqual(first.pathId, "");
      assert.notEqual(first.pathId, second.pathId);
      assert.isNull(first.manifestHash);
      assert.deepEqual(first.sections, []);
      assert.deepEqual(first.diagnostics, []);
      await rejects(
        harness.call("topics.canonical.inspect", {
          topicId: "topic:absent-one",
          unexpectedField: true,
        }),
        (error: any) => error?.code === "invalid_request",
      );
      assertProtocolExecutionReach(
        executedProtocolSlots(),
        "topics.canonical.inspect",
      );
    } finally {
      await harness.stop();
    }
  });

  it("executes library.lexical.execute against the real repository catalog", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "lexical-protocol-execution",
      hostFixture: {
        handle({ capability }) {
          // The evidence source port is the host's own catalog read: a resolved
          // Library scope with no matching source is a completed empty search.
          if (capability === "library.evidence.sources")
            return {
              scope: {
                libraryIds: [1],
                itemRefs: [{ libraryId: 1, key: "MISSING1" }],
              },
              descriptors: [],
              nextCursor: null,
              hasMore: false,
              issues: [],
            };
          if (capability === "webdav.describe")
            return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
          return { status: "unavailable", diagnostics: [] };
        },
      },
    });
    try {
      const result = (await harness.call("library.lexical.execute", {
        query: "evidence",
        libraryIds: [1],
      })) as any;
      // The private route reports the resolved scope it actually scanned and a
      // closed lexical envelope: no cursor, no continuation.
      assert.deepEqual(result.scope.libraryIds, [1]);
      assert.deepEqual(result.descriptors, []);
      assert.equal(result.result.method, "lexical");
      assert.deepEqual(result.result.results, []);
      assert.isFalse(result.result.hasMore);
      assert.isNull(result.result.nextCursor);
      assert.isBoolean(result.catalogLimited);
      // The private lexical route has no cursor: continuation is not part of it.
      await rejects(
        harness.call("library.lexical.execute", {
          query: "evidence",
          libraryIds: [1],
          cursor: "cursor-1",
        }),
        (error: any) => error?.code === "invalid_request",
      );
      assertProtocolExecutionReach(
        executedProtocolSlots(),
        "library.lexical.execute",
      );
    } finally {
      await harness.stop();
    }
  });

  it("executes system.shutdown through the lifecycle credential", async function () {
    const id = "shutdown-protocol-execution";
    const harness = await startSynthesisProductionRouteHarness({ id });
    try {
      const config = readHarnessSessionConfig(harness.root, id);
      // The client credential is not a lifecycle credential, so it must be
      // refused without stopping the service.
      await rejects(
        harness.call("system.shutdown", {}),
        (error: any) => error?.code === "lifecycle_forbidden",
      );
      const health = (await (
        await fetch(`http://127.0.0.1:${harness.port}/synthesis/v1/health`)
      ).json()) as { status: string; lifecycleState: string };
      assert.equal(health.status, "ok");
      assert.equal(health.lifecycleState, "ready");
      const call = (payload: unknown, requestId: string) =>
        fetch(`http://127.0.0.1:${harness.port}/synthesis/v1/call`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${config.lifecycleToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            protocol: SYNTHESIS_SIDECAR_PROTOCOL,
            requestId,
            profileId: config.profileId,
            capability: "system.shutdown",
            payload,
          }),
        });
      const malformedPayload = { unexpectedField: true };
      const malformed = await call(malformedPayload, "shutdown-malformed");
      const malformedBody = (await malformed.json()) as Record<string, any>;
      recordRawProtocolExecution({
        capability: "system.shutdown",
        payload: malformedPayload,
        body: malformedBody,
      });
      assert.equal(malformed.status, 400);
      assert.equal(malformedBody.ok, false);
      assert.equal(malformedBody.error.code, "invalid_request");
      const payload = {};
      const receipt = await call(payload, "shutdown-accepted");
      const receiptBody = (await receipt.json()) as Record<string, any>;
      recordRawProtocolExecution({
        capability: "system.shutdown",
        payload,
        body: receiptBody,
      });
      assert.equal(receipt.status, 200);
      assert.equal(receiptBody.ok, true);
      assert.equal(receiptBody.requestId, "shutdown-accepted");
      assert.deepEqual(receiptBody.data, {
        accepted: true,
        lifecycleState: "stopping",
      });
      // An accepted shutdown only stops accepting work; cleanup finishes when
      // the process exits.
      const stopped = await harness.stopProcess();
      assert.isNotNull(stopped.exitCode);
      assertProtocolExecutionReach(executedProtocolSlots(), "system.shutdown");
    } finally {
      await harness.stop();
    }
  });
});

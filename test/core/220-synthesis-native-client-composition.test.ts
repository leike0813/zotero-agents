import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  clearRuntimeLogs,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";
import { beginSynthesisSidecarBusinessAudit } from "../../src/modules/synthesisSidecarBusinessAudit";
import {
  SynthesisClientError,
  SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
  SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
  canonicalizeSynthesisContractJsonArtifact,
  hashSynthesisContractCanonicalJson,
  type SynthesisSidecarProductionClientCapability,
} from "../../packages/synthesis-contracts/src";
import { inspectSynthesisProductionCapabilities } from "../../scripts/check-synthesis-production-capabilities";
import {
  SYNTHESIS_PRODUCTION_BASELINE_FIXTURE,
  inspectSynthesisProductionBaselineEvidence,
  readSynthesisProductionSurfaceCorpora,
  type SynthesisProductionBaselineFixture,
} from "../../scripts/synthesisProductionSurfaceCorpora";
import { createNativeSynthesisClientComposition } from "../../src/modules/synthesisClient/nativeComposition";
import { SynthesisSidecarRpcError } from "../../src/modules/synthesisSidecarRpcClient";
import {
  SYNTHESIS_PRODUCTION_RPC_TRANSPORT_GRACE_MS,
  synthesisProductionOperationPolicy,
  synthesisProductionOperationDeadlineMs,
  synthesisProductionTransportDeadlineMs,
} from "../../src/modules/synthesisProductionRpcPolicy";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("Synthesis native client composition", function () {
  beforeEach(function () {
    void clearRuntimeLogs();
  });

  it("audits mutation terminals, read failures, and semantic non-success once", function () {
    let clock = 10;
    const mutation = beginSynthesisSidecarBusinessAudit({
      operation: "client.runAdvancedReferenceMatchingNow",
      now: () => clock++,
    });
    mutation.succeeded({ status: "worker_failed" });
    mutation.failed({ code: "service_unavailable" });

    const read = beginSynthesisSidecarBusinessAudit({
      operation: "client.listTopics",
      now: () => clock++,
    });
    read.failed({ code: "request_timeout" });

    const entries = listRuntimeLogs({
      component: "synthesis-sidecar-business",
      order: "asc",
    });
    assert.deepEqual(
      entries.map((entry) => [entry.operation, entry.stage]),
      [
        ["client.runAdvancedReferenceMatchingNow", "started"],
        ["client.runAdvancedReferenceMatchingNow", "failed"],
        ["client.listTopics", "failed"],
      ],
    );
    assert.deepInclude(entries[1]?.details as Record<string, unknown>, {
      semanticStatus: "worker_failed",
      classification: "conflict",
    });
    assert.deepInclude(entries[2]?.details as Record<string, unknown>, {
      classification: "timeout",
    });
    const serialized = JSON.stringify(entries);
    for (const forbidden of [
      "httpStatus",
      "requestBytes",
      "workerCode",
      "traceId",
    ]) {
      assert.notInclude(serialized, forbidden);
    }
  });
  it("keeps the TypeScript port and Rust manifest on one closed fingerprint", function () {
    const report = inspectSynthesisProductionCapabilities();
    assert.equal(report.capabilityCount, 96);
    assert.equal(report.operationCount, 96);
    assert.equal(
      report.fingerprint,
      SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
    );
    assert.isTrue(
      Object.values(report.errors).every((values) => values.length === 0),
      JSON.stringify(report.errors),
    );
    assert.deepEqual(report.errors.surfaceCorpusIdentity, []);
    assert.deepEqual(report.errors.surfaceCorpusSet, []);
    assert.deepEqual(report.errors.surfaceCorpusDuplicates, []);
    assert.deepEqual(report.errors.surfaceBaselineEvidence, []);
    assert.deepEqual(report.errors.missingFromSurfaceCorpora, []);
    assert.deepEqual(report.errors.unknownInSurfaceCorpora, []);
    assert.deepEqual(report.errors.missingSurfaceEvidence, []);
    assert.deepEqual(report.errors.dispatcherMissing, []);
    assert.deepEqual(report.errors.dispatcherUnknown, []);
    assert.deepEqual(report.errors.dispatcherDuplicates, []);
    assert.deepEqual(report.errors.typedTopicWorkbenchOwnership, []);
    assert.deepEqual(report.errors.typedReferenceCitationOwnership, []);
  });

  it("fails closed for corrupted durable corpus, dispatcher, and ready-roster evidence", function () {
    const corpora = readSynthesisProductionSurfaceCorpora().map((surface) => ({
      ...surface,
      corpus: {
        ...surface.corpus,
        operations: surface.corpus.operations.map((operation) => ({
          ...operation,
          cases: [...operation.cases],
        })),
      },
    }));
    const topic = corpora.find((surface) => surface.id === "topic-workbench")!;
    const citation = corpora.find(
      (surface) => surface.id === "citation-graph",
    )!;
    const moved = topic.corpus.operations[0]!;
    const citationOperation = citation.corpus.operations[0]!;
    topic.corpus.operations[0] = {
      ...citationOperation,
      cases: citationOperation.cases.filter(
        (value) => value !== "invalid_args",
      ),
    };
    citation.corpus.operations[0] = {
      ...moved,
      access: "mutation",
      cases: moved.cases.filter((value) => value !== "reopen"),
    };
    citation.corpus.operations[1] = {
      ...citation.corpus.operations[1]!,
      id: "client.unknown",
    };
    topic.corpus.operations[2] = {
      ...topic.corpus.operations[2]!,
      id: topic.corpus.operations[1]!.id,
    };
    const report = inspectSynthesisProductionCapabilities({
      surfaceCorpora: corpora as never,
      readyCapabilities: ["client.unknown"],
      rustReadyCapabilities: ["client.listTopics"],
      rustDispatcherCapabilities: ["client.listTopics", "client.listTopics"],
    });

    assert.isNotEmpty(report.errors.surfaceCorpusIdentity);
    assert.isNotEmpty(report.errors.surfaceCorpusDuplicates);
    assert.isNotEmpty(report.errors.surfaceBaselineEvidence);
    assert.isNotEmpty(report.errors.missingFromSurfaceCorpora);
    assert.deepEqual(report.errors.unknownInSurfaceCorpora, ["client.unknown"]);
    assert.isNotEmpty(report.errors.missingBoundaryCases);
    assert.isNotEmpty(report.errors.missingMutationReopen);
    assert.isNotEmpty(report.errors.readyNotDeclared);
    assert.isNotEmpty(report.errors.readyRustBinding);
    assert.isNotEmpty(report.errors.dispatcherMissing);
    assert.isNotEmpty(report.errors.dispatcherDuplicates);
  });

  it("rejects unstable values in fixed-baseline observable fixtures", function () {
    const corpora = readSynthesisProductionSurfaceCorpora();
    const fixture = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, SYNTHESIS_PRODUCTION_BASELINE_FIXTURE),
        "utf8",
      ),
    ) as SynthesisProductionBaselineFixture;
    fixture.surfaces[0]!.cases[0]!.expected.dtoSemantics.push(
      "/tmp/runtime-dependent-result",
      "2026-08-02T12:34:56.789Z",
    );

    const errors = inspectSynthesisProductionBaselineEvidence(
      corpora,
      ROOT,
      fixture,
    );
    assert.includeMembers(errors, [
      "unstable absolute path: .surfaces[0].cases[0].expected.dtoSemantics[1]",
      "unstable timestamp: .surfaces[0].cases[0].expected.dtoSemantics[2]",
    ]);
  });

  it("reproduces every inventory gate without an active OpenSpec change directory", function () {
    this.timeout(30_000);
    const fixture = fs.mkdtempSync(
      path.join(os.tmpdir(), "synthesis-r9a-no-change-"),
    );
    try {
      for (const name of [
        "node_modules",
        "doc",
        "packages",
        "src",
        "native",
        "scripts",
        "test",
        "package.json",
      ]) {
        fs.symlinkSync(path.join(ROOT, name), path.join(fixture, name));
      }
      for (const script of [
        "check:synthesis-production-capabilities",
        "check:synthesis-topic-workbench-surface-parity",
        "check:synthesis-citation-graph-surface-parity",
        "check:synthesis-reference-canonical-surface-parity",
        "check:synthesis-tag-surface-parity",
        "check:synthesis-concept-topic-graph-surface-parity",
        "check:synthesis-artifact-library-debug-surface-parity",
        "check:synthesis-webdav-maintenance-surface-parity",
      ]) {
        const result = spawnSync("npm", ["run", script], {
          cwd: fixture,
          encoding: "utf8",
        });
        assert.equal(result.status, 0, result.stderr || result.stdout);
      }
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("reuses the grouped client facade over closed native capabilities", async function () {
    const calls: Array<{
      capability: SynthesisSidecarProductionClientCapability;
      payload: unknown;
      deadlineMs?: number;
    }> = [];
    const composition = createNativeSynthesisClientComposition({
      getReadyConnection: () => ({
        discovery: {
          host: "127.0.0.1",
          port: 1234,
          profileId: "1".repeat(64),
          serviceInstanceId: "service-1",
        },
        clientToken: "token",
      }),
      rpcClient: {
        async call(args) {
          calls.push({
            capability:
              args.capability as SynthesisSidecarProductionClientCapability,
            payload: args.payload,
            deadlineMs: args.deadlineMs,
          });
          return args.rebuildResult({ topics: [] });
        },
      },
    });

    assert.deepEqual(await composition.client.topics.list(), { topics: [] });
    assert.deepEqual(
      await composition.client.maintenance.controlOperation({
        action: "cancel",
        operation_id: "maintenance:scenario",
      }),
      { topics: [] },
    );
    assert.deepEqual(calls, [
      {
        capability: "client.listTopics",
        payload: { args: [{}] },
        deadlineMs: 12_000,
      },
      {
        capability: "client.controlPublicMaintenanceOperation",
        payload: {
          args: [{ action: "cancel", operation_id: "maintenance:scenario" }],
        },
        deadlineMs: 12_000,
      },
    ]);
  });

  it("sends only the six public Citation Graph command DTOs", async function () {
    const calls: Array<{
      capability: SynthesisSidecarProductionClientCapability;
      payload: unknown;
    }> = [];
    const composition = createNativeSynthesisClientComposition({
      getReadyConnection: () => ({
        discovery: {
          host: "127.0.0.1",
          port: 1234,
          profileId: "1".repeat(64),
          serviceInstanceId: "service-1",
        },
        clientToken: "token",
      }),
      rpcClient: {
        async call(args) {
          calls.push({
            capability:
              args.capability as SynthesisSidecarProductionClientCapability,
            payload: args.payload,
          });
          return args.rebuildResult({ status: "accepted" });
        },
      },
    });

    await composition.client.graph.startUpdate({
      scope: "papers",
      paperRefs: ["7:AAAA1111"],
      expectedReferenceBasisHash: "sha256:reference",
      idempotencyKey: "graph-update-a",
    });
    await composition.client.graph.refreshMetricsNow({
      graphHash: "sha256:graph",
    });
    await composition.client.graph.recomputeCitationGraphLayout({
      algorithm: "radial",
      force: true,
    });
    await composition.client.graph.rebuildCitationGraphCacheNow();
    await composition.client.graph.refreshCitationGraphCacheIncrementalNow();
    await composition.client.graph.retryCitationGraphCacheRebuild();
    await composition.client.graph.startUpdate();
    await composition.client.graph.refreshMetricsNow();

    assert.deepEqual(calls, [
      {
        capability: "client.startCitationGraphUpdate",
        payload: {
          args: [
            {
              scope: "papers",
              paperRefs: ["7:AAAA1111"],
              expectedReferenceBasisHash: "sha256:reference",
              idempotencyKey: "graph-update-a",
            },
          ],
        },
      },
      {
        capability: "client.refreshCitationGraphMetricsNow",
        payload: { args: [{ graphHash: "sha256:graph" }] },
      },
      {
        capability: "client.recomputeCitationGraphLayout",
        payload: { args: [{ algorithm: "radial", force: true }] },
      },
      {
        capability: "client.rebuildCitationGraphCacheNow",
        payload: { args: [] },
      },
      {
        capability: "client.refreshCitationGraphCacheIncrementalNow",
        payload: { args: [] },
      },
      {
        capability: "client.retryCitationGraphCacheRebuild",
        payload: { args: [] },
      },
      {
        capability: "client.startCitationGraphUpdate",
        payload: { args: [{}] },
      },
      {
        capability: "client.refreshCitationGraphMetricsNow",
        payload: { args: [{}] },
      },
    ]);
  });

  it("derives production transport deadlines from the shared operation manifest", function () {
    assert.equal(
      synthesisProductionOperationDeadlineMs("client.listTopics"),
      10_000,
    );
    for (const capability of [
      "client.startReferenceSidecarRefresh",
      "client.refreshReferenceSidecarNow",
      "client.retryReferenceSidecarRefresh",
    ] as const) {
      assert.equal(synthesisProductionOperationDeadlineMs(capability), 60_000);
      assert.equal(
        synthesisProductionTransportDeadlineMs(capability),
        60_000 + SYNTHESIS_PRODUCTION_RPC_TRANSPORT_GRACE_MS,
      );
    }
  });

  it("resolves control, content, and receipt policy from the shared operation manifest", function () {
    assert.deepEqual(synthesisProductionOperationPolicy("client.listTopics"), {
      requestPlane: "control",
      resultPlane: "control",
      workModel: "bounded",
      receipt: "inline",
      controlTargetBytes: 768 * 1024,
      requestBytes: 1024 * 1024,
      responseBytes: 1024 * 1024,
    });
    assert.deepEqual(
      synthesisProductionOperationPolicy(
        "client.controlPublicMaintenanceOperation",
      ),
      {
        requestPlane: "control",
        resultPlane: "control",
        workModel: "bounded",
        receipt: "inline",
        controlTargetBytes: 768 * 1024,
        requestBytes: 1024 * 1024,
        responseBytes: 1024 * 1024,
      },
    );
    assert.include(
      synthesisProductionOperationPolicy("client.applyTopicSynthesisResult"),
      { requestPlane: "transfer" },
    );
    for (const capability of [
      "client.readPaperArtifacts",
      "client.getReviewInput",
    ] as const) {
      assert.include(synthesisProductionOperationPolicy(capability), {
        resultPlane: "locator",
      });
    }
    assert.include(
      synthesisProductionOperationPolicy(
        "client.exportFilteredPaperArtifacts",
      ),
      { resultPlane: "delivery" },
    );
    const receiptCapabilities = [
      "client.startReferenceSidecarRefresh",
      "client.refreshReferenceSidecarNow",
      "client.retryReferenceSidecarRefresh",
      "client.runAdvancedReferenceMatchingNow",
      "client.retryAdvancedReferenceMatching",
      "client.startCitationGraphUpdate",
      "client.rebuildCitationGraphCacheNow",
      "client.refreshCitationGraphCacheIncrementalNow",
      "client.retryCitationGraphCacheRebuild",
      "client.refreshCitationGraphMetricsNow",
      "client.recomputeCitationGraphLayout",
      "client.rebuildTagVocabularyIndex",
      "client.rebuildConceptKbIndex",
      "client.rebuildTopicGraphIndex",
      "client.syncWebDavNow",
      "client.retryWebDavSync",
    ] as const;
    for (const capability of receiptCapabilities) {
      assert.include(synthesisProductionOperationPolicy(capability), {
        workModel: "receipt",
        receipt: "public-maintenance-operation",
      });
    }
    assert.deepEqual(
      SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES.filter(
        (capability) =>
          synthesisProductionOperationPolicy(capability).workModel ===
          "receipt",
      ).sort(),
      [...receiptCapabilities].sort(),
    );
    assert.deepEqual(
      SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES.filter((capability) => {
        const policy = synthesisProductionOperationPolicy(capability);
        return (
          policy.requestPlane !== "control" ||
          policy.resultPlane !== "control"
        );
      }).sort(),
      [
        "client.applyTopicSynthesisResult",
        "client.exportFilteredPaperArtifacts",
        "client.getReviewInput",
        "client.readPaperArtifacts",
      ],
    );
  });

  it("stages large Topic assets before sending the bounded apply control request", async function () {
    const calls: Array<{ capability: string; payload: any }> = [];
    const transferStatus = (state: "receiving_input" | "input_sealed") => ({
      sessionId: "native-transfer:1",
      state,
      input: { receivedPages: state === "receiving_input" ? 0 : 1, totalPages: 1, stagedBytes: 900_000 },
      execution: { attempts: 0 },
      stagedBytes: 900_000,
      createdAtMs: 1,
      lastActivityAtMs: 2,
    });
    const composition = createNativeSynthesisClientComposition({
      getReadyConnection: () => ({
        discovery: {
          host: "127.0.0.1",
          port: 1234,
          profileId: "1".repeat(64),
          serviceInstanceId: "service-1",
        },
        clientToken: "token",
      }),
      rpcClient: {
        async call(args) {
          calls.push({ capability: args.capability, payload: args.payload });
          const action = (args.payload as { action?: string }).action;
          if (action === "begin") {
            return args.rebuildResult(transferStatus("receiving_input"));
          }
          if (action === "put_input_page") {
            return args.rebuildResult(transferStatus("receiving_input"));
          }
          if (action === "seal_input") {
            return args.rebuildResult(transferStatus("input_sealed"));
          }
          if (action === "cancel") {
            return args.rebuildResult({ canceled: true });
          }
          return args.rebuildResult({ ok: true, status: "promoted" });
        },
      },
    });

    const largeText = "x".repeat(900_000);
    await composition.client.workflowApply.applyTopicSynthesisResult({
      bundle: { topicId: "topic:large" },
      assets: [
        { id: "asset/0001", mediaType: "text/markdown", text: largeText },
      ],
    });

    const transferActions = calls
      .filter(
        (call) => call.capability === "transfer.content",
      )
      .map((call) => call.payload.action);
    assert.equal(transferActions[0], "begin");
    assert.isAbove(
      transferActions.filter((action) => action === "put_input_page").length,
      1,
    );
    assert.deepEqual(transferActions.slice(-2), ["seal_input", "cancel"]);
    const control = calls.find(
      (call) => call.capability === "client.applyTopicSynthesisResult",
    )!;
    assert.equal(control.capability, "client.applyTopicSynthesisResult");
    assert.notInclude(JSON.stringify(control.payload), largeText.slice(0, 100));
    assert.deepEqual(control.payload, {
      args: [
        {
          bundle: { topicId: "topic:large" },
          assetTransfer: { sessionId: "native-transfer:1" },
        },
      ],
    });
  });

  it("resolves a content-transfer locator without exposing transport authority", async function () {
    const publicResult = {
      artifacts: [
        {
          paper_ref: "1:AAAA1111",
          artifact_type: "references",
          payload_type: "references-json",
          status: "available",
          payload: { references: [{ title: "Large reference" }] },
          diagnostics: [],
        },
      ],
      diagnostics: [],
      total: 1,
    };
    const content = JSON.stringify(publicResult);
    const rowsArtifact = canonicalizeSynthesisContractJsonArtifact([content]);
    const page = {
      descriptor: {
        kind: "content",
        pageIndex: 0,
        rowCount: 1,
        byteLength: rowsArtifact.byteLength,
        sha256: rowsArtifact.sha256,
      },
      rows: [content],
    };
    const manifest = (capability: string) => {
      const body = {
        transferVersion: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
        encoding: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
        direction: "output",
        header: {
          target: "production_client_result",
          capability,
          byteLength: new TextEncoder().encode(content).byteLength,
          sha256: hashSynthesisContractCanonicalJson(content),
        },
        pages: [page.descriptor],
      };
      return {
        ...body,
        rootSha256: hashSynthesisContractCanonicalJson(body),
      };
    };
    const actions: string[] = [];
    let activeCapability = "";
    const composition = createNativeSynthesisClientComposition({
      getReadyConnection: () => ({
        discovery: {
          host: "127.0.0.1",
          port: 1234,
          profileId: "1".repeat(64),
          serviceInstanceId: "service-1",
        },
        clientToken: "token",
      }),
      rpcClient: {
        async call(args) {
          const action = (args.payload as { action?: string }).action;
          if (!action) {
            activeCapability = args.capability;
            return args.rebuildResult({
              contentTransfer: { sessionId: "native-transfer:result" },
            });
          }
          actions.push(action);
          if (action === "get_output_manifest") {
            return args.rebuildResult(manifest(activeCapability));
          }
          if (action === "get_output_page") {
            return args.rebuildResult(page);
          }
          return args.rebuildResult({ canceled: true });
        },
      },
    });

    const result = await composition.client.artifacts.readPaperArtifacts({
      paper_refs: ["1:AAAA1111"],
    });
    assert.deepEqual(result, publicResult);
    assert.deepEqual(
      await composition.client.workflowReview.getInput({}),
      publicResult,
    );
    assert.deepEqual(actions, [
      "get_output_manifest",
      "get_output_page",
      "cancel",
      "get_output_manifest",
      "get_output_page",
      "cancel",
    ]);
    assert.notInclude(JSON.stringify(result), "native-transfer:");
  });

  it("fails closed after invalidation without resolving another owner", async function () {
    let connectionReads = 0;
    const composition = createNativeSynthesisClientComposition({
      getReadyConnection: () => {
        connectionReads += 1;
        return null;
      },
      rpcClient: {
        async call() {
          throw new Error("unexpected");
        },
      },
    });
    composition.invalidate();
    let failure: unknown;
    try {
      await composition.client.topics.list();
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "unavailable");
    assert.equal(connectionReads, 0);
    await composition.dispose();
  });

  it("preserves stable sidecar Graph codes and bounded safe reasons", async function () {
    const composition = createNativeSynthesisClientComposition({
      getReadyConnection: () => ({
        discovery: {
          host: "127.0.0.1",
          port: 1234,
          profileId: "1".repeat(64),
          serviceInstanceId: "service-1",
        },
        clientToken: "token",
      }),
      rpcClient: {
        async call() {
          throw new SynthesisSidecarRpcError("basis_mismatch", {
            reason: "citation_graph_basis_changed",
          });
        },
      },
    });
    let failure: unknown;
    try {
      await composition.client.graph.getOverview({});
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, SynthesisClientError);
    assert.equal((failure as SynthesisClientError).code, "conflict");
    assert.deepEqual((failure as SynthesisClientError).details, {
      sidecarCode: "basis_mismatch",
      sidecarReason: "citation_graph_basis_changed",
    });
  });
});

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
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
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
    assert.equal(report.capabilityCount, 95);
    assert.equal(report.operationCount, 95);
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
    assert.deepEqual(calls, [
      {
        capability: "client.listTopics",
        payload: { args: [{}] },
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

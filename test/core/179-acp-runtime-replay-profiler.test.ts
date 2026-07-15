import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { assert } from "chai";
import {
  ACP_RUNTIME_REPLAY_MATRIX_SCHEMA,
  ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1,
  assertAcpRuntimeReplayMatricesComparable,
  inspectAcpRuntimeReplayMatrixCompatibility,
  parseAcpRuntimeReplayCadence,
  replayAcpRuntimeSemanticTrace,
  renderAcpRuntimeReplayMatrixMarkdown,
  runAcpRuntimeR2SyntheticWorkloadV1,
  runAcpRuntimeReplayMatrix,
  saveAcpRuntimeReplayMatrix,
  type AcpRuntimeReplayTarget,
} from "../../src/modules/acpRuntimeReplayProfiler";
import {
  ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
  type AcpRuntimeSemanticTraceDocument,
} from "../../src/modules/acpRuntimeSemanticTrace";
import {
  armAcpRuntimeSemanticTraceRecorder,
  discardAcpRuntimeSemanticTracePartialForTests,
} from "../../src/modules/acpRuntimeSemanticTraceRecorder";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  getAcpRuntimeDiagnosticsMode,
  resetAcpRuntimeDiagnosticsModeForTests,
} from "../../src/modules/acpRuntimeDiagnosticsMode";
import {
  createAcpRuntimeR2ProductionNoopPort,
  createAcpRuntimeReplayProductionProfilerPort,
} from "../../src/modules/acpRuntimeReplayProductionPorts";
import {
  buildAcpRuntimeReplayArtifactStem,
  deriveAcpRuntimeReplaySampleName,
  normalizeAcpRuntimeReplayPhase,
  resetAcpRuntimeReplayArtifactNonceForTests,
  slugAcpRuntimeReplayArtifactSegment,
} from "../../src/modules/acpRuntimeReplayIdentity";

function fixtureTrace(
  sourceKind:
    | "acp-chat-conversation"
    | "acp-workflow-execution" = "acp-chat-conversation",
): AcpRuntimeSemanticTraceDocument {
  const rootOwner =
    sourceKind === "acp-chat-conversation"
      ? { rootId: "source-root", conversationId: "source-chat" }
      : { rootId: "source-root", workflowRunId: "source-run" };
  const activityOwner =
    sourceKind === "acp-chat-conversation"
      ? { ...rootOwner, turnId: "source-turn" }
      : { ...rootOwner, requestId: "source-request" };
  return {
    header: {
      record: "header",
      schema: ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA,
      sourceKind,
      createdAt: "2026-07-13T00:00:00.000Z",
    },
    events: [
      {
        record: "event",
        seq: 1,
        monotonicOffsetMs: 0,
        kind: "root-start",
        sourceKind,
        owner: rootOwner,
        payload: { toolCallId: "semantic-id-stays-stable" },
      },
      {
        record: "event",
        seq: 2,
        monotonicOffsetMs: 1,
        kind:
          sourceKind === "acp-chat-conversation"
            ? "turn-start"
            : "request-start",
        sourceKind,
        owner: activityOwner,
        payload: {},
      },
      {
        record: "event",
        seq: 3,
        monotonicOffsetMs: 5,
        kind: "session-notification",
        sourceKind,
        owner: activityOwner,
        payload: {
          sessionId: "source-session",
          update: {
            sessionUpdate: "tool_call_update",
            toolCallId: "semantic-id-stays-stable",
          },
        },
      },
      {
        record: "event",
        seq: 4,
        monotonicOffsetMs: 6,
        kind:
          sourceKind === "acp-chat-conversation" ? "turn-end" : "request-end",
        sourceKind,
        owner: activityOwner,
        payload: { outcome: "complete" },
      },
      {
        record: "event",
        seq: 5,
        monotonicOffsetMs: 7,
        kind: "root-end",
        sourceKind,
        owner: rootOwner,
        payload: { outcome: "complete" },
      },
    ],
    footer: {
      record: "footer",
      eventCount: 5,
      contentBytes: 100,
      sha256: "a".repeat(64),
      completion: "complete",
      warnings: [],
    },
    digest: "a".repeat(64),
  };
}

function target(args?: {
  sourceKind?: "acp-chat-conversation" | "acp-workflow-execution";
  activate?: AcpRuntimeReplayTarget["activate"];
  apply?: AcpRuntimeReplayTarget["apply"];
  cleanup?: AcpRuntimeReplayTarget["cleanup"];
  drainOk?: boolean;
  syntheticRootId?: string;
}) {
  return {
    sourceKind: args?.sourceKind || "acp-chat-conversation",
    syntheticRootId: args?.syntheticRootId || "synthetic-root",
    activate: args?.activate || (async () => undefined),
    apply: args?.apply || (async () => "applied" as const),
    drain: async () => ({ ok: args?.drainOk !== false }),
    cleanup: args?.cleanup || (async () => undefined),
  } satisfies AcpRuntimeReplayTarget;
}

function measuredProfile(args: {
  requestId: string;
  surface: "closed" | "open-inactive" | "target-active";
  mismatchedR3Publication?: boolean;
  producerNativeR3?: boolean;
}) {
  const counter = (
    name: any,
    total: number,
    labels: Record<string, string> = {},
  ) => ({
    name,
    labels,
    counter: { total },
  });
  return {
    requestId: args.requestId,
    displayMode: "live" as const,
    transport: "unknown" as const,
    zoteroMajor: 9 as const,
    startedAtMs: 100,
    finishedAtMs: 110,
    publicationLifecycles:
      args.surface === "target-active"
        ? args.mismatchedR3Publication
          ? [
              {
                publicationId: "publication-1",
                post: 1,
                shellForward: 1,
                childApply: 1,
                renderAck: 0,
              },
              {
                publicationId: "publication-from-prior-run",
                post: 0,
                shellForward: 0,
                childApply: 0,
                renderAck: 1,
              },
            ]
          : [
              {
                publicationId: "publication-1",
                post: 1,
                shellForward: 1,
                childApply: 1,
                renderAck: 1,
              },
            ]
        : [],
    metrics: [
      counter("semantic_event", 5),
      counter("host_input_fragment", 33),
      counter("host_input_bytes", 536),
      {
        name: "host_request_duration" as const,
        labels: {},
        duration: { count: 10, totalMs: 1, maxMs: 1, buckets: [] },
      },
      {
        name: "host_request_inflight" as const,
        labels: {},
        gauge: { current: 0, max: 8 },
      },
      ...(args.surface === "target-active"
        ? [
            ...(args.producerNativeR3
              ? []
              : [counter("panel_prepare", 1), counter("panel_signature", 1)]),
            counter("panel_post", 1, { publicationId: "publication-1" }),
            counter("panel_shell_forward", 1, {
              publicationId: "publication-1",
            }),
            counter("panel_child_apply", 1, {
              publicationId: "publication-1",
            }),
            counter("panel_render_ack", 1, {
              publicationId: args.mismatchedR3Publication
                ? "publication-from-prior-run"
                : "publication-1",
            }),
          ]
        : []),
    ],
  };
}

async function assertRejects(promise: Promise<unknown>, pattern: RegExp) {
  try {
    await promise;
    assert.fail("expected promise to reject");
  } catch (error) {
    assert.match(
      error instanceof Error ? error.message : String(error),
      pattern,
    );
  }
}

describe("ACP runtime replay profiler", function () {
  this.timeout(10_000);

  let tempRoot = "";

  beforeEach(async function () {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "zs-acp-replay-"));
    setDebugModeOverrideForTests(true);
    resetAcpRuntimeDiagnosticsModeForTests();
    resetAcpRuntimeReplayArtifactNonceForTests();
  });

  it("normalizes free-text stages and derives bounded filename identity", function () {
    assert.deepEqual(normalizeAcpRuntimeReplayPhase("  治理\t第二 阶段  "), {
      value: "治理 第二 阶段",
      valid: true,
    });
    assert.equal(normalizeAcpRuntimeReplayPhase(" \n ").errorCode, "required");
    assert.equal(
      normalizeAcpRuntimeReplayPhase(`ok${String.fromCharCode(0)}bad`)
        .errorCode,
      "control-character",
    );
    assert.equal(
      normalizeAcpRuntimeReplayPhase("a".repeat(81)).errorCode,
      "too-long",
    );
    assert.equal(
      deriveAcpRuntimeReplaySampleName(
        "C:\\traces\\acp-trace-复杂 Sample.ndjson.partial",
      ),
      "复杂 Sample",
    );
    assert.equal(
      deriveAcpRuntimeReplaySampleName(
        "/traces/acp-trace-chat-2026-07-15T10-41-23-627Z-1.ndjson",
      ),
      "chat-2026-07-15T10-41-23-627Z-1",
    );
    assert.equal(
      deriveAcpRuntimeReplaySampleName(
        "/traces/acp-trace-skills-2026-07-13T10-08-16-777Z-1.ndjson",
      ),
      "skills-2026-07-13T10-08-16-777Z-1",
    );
    assert.equal(
      slugAcpRuntimeReplayArtifactSegment(" 复杂__Sample / A ", 64, "trace"),
      "复杂-sample-a",
    );
    assert.lengthOf(
      slugAcpRuntimeReplayArtifactSegment("测".repeat(100), 48, "stage"),
      48,
    );

    const first = buildAcpRuntimeReplayArtifactStem({
      sampleName: "复杂 Sample",
      phase: "治理 第二阶段",
      cadence: "logical",
      createdAtMs: Date.UTC(2026, 6, 15, 1, 2, 3, 4),
    });
    const second = buildAcpRuntimeReplayArtifactStem({
      sampleName: "复杂 Sample",
      phase: "治理 第二阶段",
      cadence: "logical",
      createdAtMs: Date.UTC(2026, 6, 15, 1, 2, 3, 4),
    });
    assert.match(
      first,
      /^acp-replay-复杂-sample__治理-第二阶段__logical__2026-07-15T01-02-03-004Z-1$/,
    );
    assert.notEqual(first, second);
  });

  afterEach(async function () {
    await discardAcpRuntimeSemanticTracePartialForTests();
    resetAcpRuntimeDiagnosticsModeForTests();
    setDebugModeOverrideForTests();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("runs recorded cadence after consumer completion and burst without waits", async function () {
    const recordedOrder: string[] = [];
    let now = 0;
    const recorded = await replayAcpRuntimeSemanticTrace({
      trace: fixtureTrace(),
      target: target({
        apply: async ({ event, owner, transcriptBoundary }) => {
          recordedOrder.push(`apply-${event.seq}`);
          assert.equal(owner.rootId, "synthetic-root");
          if (event.seq === 1) {
            assert.equal(
              (event.payload as any).toolCallId,
              "semantic-id-stays-stable",
            );
          } else if (event.kind === "session-notification") {
            assert.equal(transcriptBoundary, "soft-side-channel");
          }
          now += 7;
          return "applied";
        },
      }),
      cadence: "recorded",
      now: () => now,
      sleep: async (delay) => {
        recordedOrder.push(`sleep-${delay}`);
        now += delay;
      },
    });
    assert.deepEqual(recordedOrder, [
      "apply-1",
      "sleep-1",
      "apply-2",
      "sleep-4",
      "apply-3",
      "sleep-1",
      "apply-4",
      "sleep-1",
      "apply-5",
    ]);
    assert.equal(recorded.appliedEvents, 5);
    assert.equal(recorded.completion, "complete");

    const burstWaits: number[] = [];
    await replayAcpRuntimeSemanticTrace({
      trace: fixtureTrace(),
      target: target(),
      cadence: "burst",
      sleep: async (delay) => void burstWaits.push(delay),
    });
    assert.deepEqual(burstWaits, []);

    const logicalOrder: string[] = [];
    const logical = await replayAcpRuntimeSemanticTrace({
      trace: fixtureTrace(),
      target: {
        ...target(),
        apply: async ({ event }) => {
          logicalOrder.push(`apply-${event.seq}`);
          return "applied";
        },
        drain: async () => {
          logicalOrder.push("drain");
          return { ok: true };
        },
      },
      cadence: "logical",
      logicalTime: {
        registerOwner: () => undefined,
        advanceTo: async (offset) =>
          void logicalOrder.push(`advance-${offset}`),
        captureAt: async (offset) =>
          void logicalOrder.push(`capture-${offset}`),
        releaseToNative: async (offset) => {
          logicalOrder.push(`release-${offset}`);
          return { ok: true, warnings: [] };
        },
        flushWriteBearing: async () => ({ ok: true, warnings: [] }),
        dispose: () => undefined,
        pendingCount: () => 0,
        warnings: () => [],
      },
    });
    assert.deepEqual(logicalOrder, [
      "advance-0",
      "apply-1",
      "capture-0",
      "advance-1",
      "apply-2",
      "capture-1",
      "advance-5",
      "apply-3",
      "capture-5",
      "advance-6",
      "apply-4",
      "capture-6",
      "advance-7",
      "apply-5",
      "capture-7",
      "release-7",
      "drain",
    ]);
    assert.equal(logical.completion, "complete");
    assert.equal(parseAcpRuntimeReplayCadence("logical"), "logical");
    assert.throws(() => parseAcpRuntimeReplayCadence("fast"), /Unsupported/);
  });

  it("maps the first Workflow request to the target-active synthetic owner", async function () {
    const trace = fixtureTrace("acp-workflow-execution");
    trace.events = [
      {
        ...trace.events[0],
        sourceKind: "acp-workflow-execution",
        owner: { rootId: "source-root", workflowRunId: "source-run" },
      },
      {
        ...trace.events[1],
        seq: 2,
        kind: "request-start",
        sourceKind: "acp-workflow-execution",
        owner: {
          rootId: "source-root",
          workflowRunId: "source-run",
          requestId: "source-request-a",
        },
        payload: {},
      },
      {
        ...trace.events[1],
        seq: 3,
        kind: "request-start",
        sourceKind: "acp-workflow-execution",
        owner: {
          rootId: "source-root",
          workflowRunId: "source-run",
          requestId: "source-request-b",
        },
        payload: {},
      },
    ];
    trace.footer.eventCount = 3;
    const requestIds: string[] = [];
    await replayAcpRuntimeSemanticTrace({
      trace,
      target: target({
        sourceKind: "acp-workflow-execution",
        apply: async ({ owner }) => {
          if (owner.requestId) requestIds.push(owner.requestId);
          return "applied";
        },
      }),
      cadence: "burst",
    });
    assert.deepEqual(requestIds, [
      "synthetic-root-request",
      "synthetic-root-2-request",
    ]);
  });

  it("interrupts a recorded cadence wait without applying the next event", async function () {
    const controller = new AbortController();
    let releaseSleepStarted: (() => void) | undefined;
    const sleepStarted = new Promise<void>((resolve) => {
      releaseSleepStarted = resolve;
    });
    const applied: number[] = [];
    const replayPromise = replayAcpRuntimeSemanticTrace({
      trace: fixtureTrace(),
      target: target({
        apply: async ({ event }) => {
          applied.push(event.seq);
          return "applied";
        },
      }),
      cadence: "recorded",
      signal: controller.signal,
      sleep: async () => {
        releaseSleepStarted?.();
        await new Promise<void>(() => undefined);
      },
    });
    await sleepStarted;
    controller.abort();
    const replay = await replayPromise;
    assert.deepEqual(applied, [1]);
    assert.equal(replay.completion, "incomplete");
    assert.include(replay.warnings, "replay-aborted");
  });

  it("rejects cross-source replay and makes unknown, consumer, abort, and drain failures incomplete", async function () {
    await assertRejects(
      replayAcpRuntimeSemanticTrace({
        trace: fixtureTrace(),
        target: target({ sourceKind: "acp-workflow-execution" }),
        cadence: "burst",
      }),
      /source does not match/,
    );
    const unknown = await replayAcpRuntimeSemanticTrace({
      trace: fixtureTrace(),
      target: target({ apply: async () => "unknown" }),
      cadence: "burst",
    });
    assert.equal(unknown.completion, "incomplete");
    assert.equal(unknown.unknownEvents, 5);

    const failed = await replayAcpRuntimeSemanticTrace({
      trace: fixtureTrace(),
      target: target({
        apply: async () => {
          throw new Error("consumer sentinel");
        },
      }),
      cadence: "burst",
    });
    assert.include(failed.warnings[0], "consumer sentinel");

    const controller = new AbortController();
    controller.abort();
    const aborted = await replayAcpRuntimeSemanticTrace({
      trace: fixtureTrace(),
      target: target({ drainOk: false }),
      cadence: "burst",
      signal: controller.signal,
    });
    assert.includeMembers(aborted.warnings, ["replay-aborted"]);
    assert.include(aborted.warnings.join("\n"), "drain-failed");
  });

  it("executes the immutable R2 v1 parser/input workload without a mutation port", async function () {
    const fragments = new Map<string, Uint8Array[]>();
    const result = await runAcpRuntimeR2SyntheticWorkloadV1({
      port: {
        consumeFragment: async ({ requestId, fragment }) => {
          fragments.set(requestId, [
            ...(fragments.get(requestId) || []),
            fragment,
          ]);
        },
      },
      sleep: async () => undefined,
    });
    assert.deepEqual(
      {
        version: result.version,
        requests: result.requests,
        fragments: result.fragments,
        maxConcurrency: result.maxConcurrency,
      },
      {
        version: ACP_RUNTIME_R2_SYNTHETIC_WORKLOAD_V1,
        requests: 10,
        fragments: 33,
        maxConcurrency: 8,
      },
    );
    assert.equal(
      Array.from(fragments.values())
        .flat()
        .reduce((sum, bytes) => sum + bytes.byteLength, 0),
      result.bytes,
    );
    assert.lengthOf(fragments.get("r2-slow") || [], 16);
    assert.lengthOf(fragments.get("r2-burst-1") || [], 2);
  });

  it("measures the production R2 parser/input/no-op response seam", async function () {
    const profiler = createAcpRuntimeReplayProductionProfilerPort();
    await profiler.start({
      surface: "closed",
      sourceKind: "acp-chat-conversation",
      syntheticRootId: "r2-profile",
    });
    const result = await runAcpRuntimeR2SyntheticWorkloadV1({
      port: createAcpRuntimeR2ProductionNoopPort(),
      profileRequestId: "r2-profile",
      sleep: async () => undefined,
    });
    const profile = (await profiler.finish()) as any;
    const metric = (name: string) =>
      profile.metrics.find((entry: any) => entry.name === name);
    assert.equal(result.inputBytes, 536);
    assert.isAbove(result.responseBytes, 0);
    assert.equal(metric("host_input_fragment").counter.total, 33);
    assert.equal(metric("host_input_bytes").counter.total, 536);
    assert.equal(metric("host_request_duration").duration.count, 10);
    assert.equal(metric("host_request_inflight").gauge.max, 8);
    assert.equal(
      metric("host_response_bytes").counter.total,
      result.responseBytes,
    );
  });

  it("runs exactly three warm-ups and six formal profiles with fresh owners and restores Workspace", async function () {
    const workspaceCalls: string[] = [];
    const profileWindows: string[] = [];
    const cleaned: string[] = [];
    const starts: string[] = [];
    let activeProfile:
      | {
          requestId: string;
          surface: "closed" | "open-inactive" | "target-active";
        }
      | undefined;
    const matrix = await runAcpRuntimeReplayMatrix({
      trace: fixtureTrace(),
      cadence: "burst",
      replayConfig: { fixture: true, phase: "治理 第二阶段" },
      sampleName: "复杂 Sample",
      environment: {
        pluginVersion: "0.6.1",
        zoteroVersion: "9.0.1",
        platform: "linux",
      },
      createTarget: async ({ sourceKind, syntheticRootId }) => {
        starts.push(`target:${syntheticRootId}`);
        const replayTarget = target({
          sourceKind,
          syntheticRootId,
          apply: async () => "applied",
        });
        return {
          ...replayTarget,
          activate: async () => void starts.push(`activate:${syntheticRootId}`),
          cleanup: async () => {
            starts.push(`cleanup:${syntheticRootId}`);
            cleaned.push(syntheticRootId);
          },
        };
      },
      workspace: {
        snapshot: async () => {
          workspaceCalls.push("snapshot");
          return { open: true, tab: "tasks" };
        },
        prepare: async ({ surface, syntheticRootId }) => {
          workspaceCalls.push(`prepare:${surface}:${syntheticRootId}`);
          starts.push(`prepare:${syntheticRootId}`);
          return { ok: true };
        },
        drain: async ({ surface, syntheticRootId }) => {
          workspaceCalls.push(`drain:${surface}:${syntheticRootId}`);
          profileWindows.push(`drain:${syntheticRootId}`);
          return { ok: true };
        },
        restore: async () => void workspaceCalls.push("restore"),
      },
      profiler: {
        start: async ({ syntheticRootId, surface }) => {
          activeProfile = { requestId: syntheticRootId, surface };
          profileWindows.push(`start:${syntheticRootId}`);
          starts.push(`profile:${syntheticRootId}`);
        },
        finish: async () => {
          profileWindows.push("finish");
          assert.exists(activeProfile);
          return measuredProfile(activeProfile!);
        },
      },
      r2Port: { consumeFragment: async () => undefined },
      sleep: async () => undefined,
      onRecordStart: async (current) => {
        await Promise.resolve();
        starts.push(`publish:${current.syntheticRootId}`);
        assert.equal(
          current.matrixIndex,
          starts.filter((entry) => entry.startsWith("publish:")).length,
        );
      },
    });
    assert.equal(matrix.schema, ACP_RUNTIME_REPLAY_MATRIX_SCHEMA);
    assert.lengthOf(matrix.records, 9);
    assert.lengthOf(
      matrix.records.filter((entry) => entry.role === "warm-up"),
      3,
    );
    assert.lengthOf(
      matrix.records.filter((entry) => entry.role === "formal"),
      6,
    );
    assert.deepEqual(
      matrix.records.map((entry) => entry.surface),
      [
        "closed",
        "closed",
        "closed",
        "open-inactive",
        "open-inactive",
        "open-inactive",
        "target-active",
        "target-active",
        "target-active",
      ],
    );
    assert.equal(
      new Set(matrix.records.map((entry) => entry.syntheticRootId)).size,
      9,
    );
    assert.lengthOf(
      profileWindows.filter((entry) => entry.startsWith("start:")),
      9,
    );
    assert.lengthOf(
      profileWindows.filter((entry) => entry.startsWith("drain:")),
      9,
    );
    for (const record of matrix.records) {
      const startIndex = profileWindows.indexOf(
        `start:${record.syntheticRootId}`,
      );
      const drainIndex = profileWindows.indexOf(
        `drain:${record.syntheticRootId}`,
      );
      const finishIndex = profileWindows.indexOf("finish", drainIndex);
      assert.isBelow(startIndex, drainIndex);
      assert.isBelow(drainIndex, finishIndex);
    }
    assert.lengthOf(cleaned, 9);
    assert.equal(workspaceCalls.at(-1), "restore");
    assert.equal(matrix.completion, "complete");
    assert.equal(matrix.executionCompletion, "complete");
    assert.equal(matrix.measurementCompletion, "complete");
    assert.equal(matrix.trace.sampleName, "复杂 Sample");
    for (const record of matrix.records) {
      const targetIndex = starts.indexOf(`target:${record.syntheticRootId}`);
      const prepareIndex = starts.indexOf(`prepare:${record.syntheticRootId}`);
      const profileIndex = starts.indexOf(`profile:${record.syntheticRootId}`);
      const cleanupIndex = starts.indexOf(`cleanup:${record.syntheticRootId}`);
      assert.isBelow(
        starts.indexOf(`publish:${record.syntheticRootId}`),
        targetIndex,
      );
      assert.isBelow(targetIndex, prepareIndex);
      assert.isBelow(prepareIndex, profileIndex);
      assert.isBelow(profileIndex, cleanupIndex);
      const activateIndex = starts.indexOf(
        `activate:${record.syntheticRootId}`,
      );
      if (record.surface === "target-active") {
        assert.isBelow(targetIndex, activateIndex);
        assert.isBelow(activateIndex, prepareIndex);
      } else {
        assert.equal(activateIndex, -1);
      }
    }

    const saved = await saveAcpRuntimeReplayMatrix({
      matrix,
      root: tempRoot,
      nowMs: 1_750_000_000_000,
    });
    assert.deepEqual(
      (await fs.readdir(saved.folder)).sort(),
      [path.basename(saved.jsonPath), path.basename(saved.markdownPath)].sort(),
    );
    assert.match(
      path.basename(saved.jsonPath),
      /^acp-replay-复杂-sample__治理-第二阶段__burst__2025-06-15T15-06-40-000Z-\d+\.json$/,
    );
    assert.include(
      renderAcpRuntimeReplayMatrixMarkdown(matrix),
      "## Formal descriptive summary",
    );
    assert.include(renderAcpRuntimeReplayMatrixMarkdown(matrix), "Events/s");
    assert.include(
      renderAcpRuntimeReplayMatrixMarkdown(matrix),
      "## Formal duration summaries",
    );
    assert.include(
      renderAcpRuntimeReplayMatrixMarkdown(matrix),
      "Count mean | Total ms mean | Max ms",
    );
    assert.include(renderAcpRuntimeReplayMatrixMarkdown(matrix), "复杂 Sample");
    assert.doesNotThrow(() =>
      assertAcpRuntimeReplayMatricesComparable(matrix, structuredClone(matrix)),
    );
    const incompatible = structuredClone(matrix);
    incompatible.cadence = "recorded";
    assert.throws(
      () => assertAcpRuntimeReplayMatricesComparable(matrix, incompatible),
      /incompatible provenance/,
    );
    const renamed = structuredClone(matrix);
    renamed.trace.sampleName = "another alias";
    assert.doesNotThrow(() =>
      assertAcpRuntimeReplayMatricesComparable(matrix, renamed),
    );
    const nextStage = structuredClone(matrix);
    nextStage.replayConfig.phase = "post-governance";
    assert.doesNotThrow(() =>
      assertAcpRuntimeReplayMatricesComparable(matrix, nextStage),
    );

    const logicalMatrix = structuredClone(matrix);
    logicalMatrix.cadence = "logical";
    logicalMatrix.replayConfig = {
      ...logicalMatrix.replayConfig,
      syntheticTiming: true,
      logicalSchedulerVersion: 1,
    };
    const logicalMarkdown = renderAcpRuntimeReplayMatrixMarkdown(logicalMatrix);
    assert.include(logicalMarkdown, "synthetic-logical");
    assert.include(logicalMarkdown, "non-comparable with recorded cadence");
    const schedulerMismatch = structuredClone(logicalMatrix);
    schedulerMismatch.replayConfig.logicalSchedulerVersion = 2;
    assert.throws(
      () =>
        assertAcpRuntimeReplayMatricesComparable(
          logicalMatrix,
          schedulerMismatch,
        ),
      /incompatible provenance/,
    );
  });

  it("keeps execution and measurement completeness independent", async function () {
    const matrix = await runAcpRuntimeReplayMatrix({
      trace: fixtureTrace(),
      cadence: "burst",
      environment: { pluginVersion: "x", zoteroVersion: "x", platform: "x" },
      createTarget: async ({ sourceKind, syntheticRootId }) =>
        target({ sourceKind, syntheticRootId }),
      workspace: {
        snapshot: async () => ({}),
        prepare: async () => ({ ok: true }),
        drain: async () => ({ ok: true }),
        restore: async () => undefined,
      },
      profiler: {
        start: async () => undefined,
        finish: async () => ({
          requestId: "missing",
          displayMode: "live",
          transport: "unknown",
          zoteroMajor: 9,
          startedAtMs: 1,
          finishedAtMs: 2,
          metrics: [],
        }),
      },
      r2Port: { consumeFragment: async () => undefined },
      sleep: async () => undefined,
    });
    assert.equal(matrix.executionCompletion, "complete");
    assert.equal(matrix.measurementCompletion, "incomplete");
    assert.equal(matrix.records[0].measurement.families.r1.state, "missing");
    assert.throws(
      () => assertAcpRuntimeReplayMatricesComparable(matrix, matrix),
      /Incomplete ACP replay matrices/,
    );
  });

  it("rejects equal aggregate R3 counts when publication identities do not match", async function () {
    let activeProfile:
      | {
          requestId: string;
          surface: "closed" | "open-inactive" | "target-active";
        }
      | undefined;
    const matrix = await runAcpRuntimeReplayMatrix({
      trace: fixtureTrace(),
      cadence: "burst",
      environment: { pluginVersion: "x", zoteroVersion: "x", platform: "x" },
      createTarget: async ({ sourceKind, syntheticRootId }) =>
        target({ sourceKind, syntheticRootId }),
      workspace: {
        snapshot: async () => ({}),
        prepare: async () => ({ ok: true }),
        drain: async () => ({ ok: true }),
        restore: async () => undefined,
      },
      profiler: {
        start: async ({ syntheticRootId, surface }) => {
          activeProfile = { requestId: syntheticRootId, surface };
        },
        finish: async () =>
          measuredProfile({
            ...activeProfile!,
            mismatchedR3Publication: activeProfile?.surface === "target-active",
          }),
      },
      r2Port: { consumeFragment: async () => undefined },
      sleep: async () => undefined,
    });

    const targetActive = matrix.records.find(
      (record) => record.surface === "target-active",
    );
    assert.equal(targetActive?.measurement.families.r3.state, "missing");
    assert.include(
      targetActive?.measurement.families.r3.detail || "",
      "publication identity mismatch",
    );
  });

  it("accepts producer-native deltas without page materialization metrics", async function () {
    let activeProfile:
      | {
          requestId: string;
          surface: "closed" | "open-inactive" | "target-active";
        }
      | undefined;
    const matrix = await runAcpRuntimeReplayMatrix({
      trace: fixtureTrace(),
      cadence: "burst",
      environment: { pluginVersion: "x", zoteroVersion: "x", platform: "x" },
      createTarget: async ({ sourceKind, syntheticRootId }) =>
        target({ sourceKind, syntheticRootId }),
      workspace: {
        snapshot: async () => ({}),
        prepare: async () => ({ ok: true }),
        drain: async () => ({ ok: true }),
        restore: async () => undefined,
      },
      profiler: {
        start: async ({ syntheticRootId, surface }) => {
          activeProfile = { requestId: syntheticRootId, surface };
        },
        finish: async () =>
          measuredProfile({
            ...activeProfile!,
            producerNativeR3: activeProfile?.surface === "target-active",
          }),
      },
      r2Port: { consumeFragment: async () => undefined },
      sleep: async () => undefined,
    });

    const targetActive = matrix.records.find(
      (record) => record.surface === "target-active",
    );
    assert.equal(targetActive?.measurement.families.r3.state, "captured");
  });

  it("reports target setup failures without running profile, replay, R2, or drain and rejects zero-event R1 evidence", async function () {
    let profileStarts = 0;
    let replayApplications = 0;
    let r2Fragments = 0;
    let workspaceDrains = 0;
    const matrix = await runAcpRuntimeReplayMatrix({
      trace: fixtureTrace(),
      cadence: "burst",
      environment: { pluginVersion: "x", zoteroVersion: "x", platform: "x" },
      createTarget: async ({ sourceKind, syntheticRootId }) =>
        target({
          sourceKind,
          syntheticRootId,
          activate: async () => {
            throw new Error("activation sentinel");
          },
          apply: async () => {
            replayApplications += 1;
            return "applied";
          },
          cleanup: async () => {
            throw new Error("cleanup sentinel");
          },
        }),
      workspace: {
        snapshot: async () => ({}),
        prepare: async () => ({ ok: true }),
        drain: async () => {
          workspaceDrains += 1;
          return { ok: true };
        },
        restore: async () => undefined,
      },
      profiler: {
        start: async () => void (profileStarts += 1),
        finish: async () =>
          measuredProfile({
            requestId: "profile",
            surface: "closed",
          }),
      },
      r2Port: {
        consumeFragment: async () => void (r2Fragments += 1),
      },
      sleep: async () => undefined,
    });
    const failed = matrix.records.find(
      (record) => record.surface === "target-active",
    );
    assert.deepEqual(failed?.failure, {
      phase: "target-activation",
      detail: "activation sentinel",
    });
    assert.equal(failed?.replay.drain.state, "not-run");
    assert.equal(failed?.measurement.families.r1.state, "not-run");
    assert.equal(failed?.measurement.families.r2.state, "not-run");
    assert.equal(failed?.measurement.families.r3.state, "not-run");
    assert.include(
      failed?.replay.warnings || [],
      "cleanup-failed:cleanup sentinel",
    );
    assert.include(
      renderAcpRuntimeReplayMatrixMarkdown(matrix),
      "target-activation: activation sentinel",
    );
    assert.equal(profileStarts, 6);
    assert.equal(replayApplications, 30);
    assert.equal(r2Fragments, 6 * 33);
    assert.equal(workspaceDrains, 6);
  });

  it("reads v1 matrices as legacy execution artifacts but rejects them for governance", function () {
    assert.deepEqual(
      inspectAcpRuntimeReplayMatrixCompatibility({
        schema: "zotero-agents.acp-runtime-replay-matrix.v1",
        completion: "complete",
      }),
      {
        schema: "zotero-agents.acp-runtime-replay-matrix.v1",
        legacy: true,
        executionCompletion: "complete",
        measurementCompletion: "incomplete",
        governanceEligible: false,
      },
    );
  });

  it("publishes progress after cleanup and stops future runs after abort", async function () {
    const controller = new AbortController();
    const order: string[] = [];
    const matrix = await runAcpRuntimeReplayMatrix({
      trace: fixtureTrace(),
      cadence: "burst",
      environment: {
        pluginVersion: "0.6.1",
        zoteroVersion: "9.0.1",
        platform: "linux",
      },
      createTarget: async ({ sourceKind, syntheticRootId }) => ({
        ...target({ sourceKind, syntheticRootId }),
        cleanup: async () => void order.push(`cleanup:${syntheticRootId}`),
      }),
      workspace: {
        snapshot: async () => ({ open: true }),
        prepare: async () => ({ ok: true }),
        drain: async () => ({ ok: true }),
        restore: async () => void order.push("restore"),
      },
      profiler: {
        start: async () => undefined,
        finish: async () => ({}),
      },
      r2Port: { consumeFragment: async () => undefined },
      sleep: async () => undefined,
      signal: controller.signal,
      onRecord: async (record, completed) => {
        order.push(`progress:${record.syntheticRootId}:${completed}`);
        assert.equal(order.at(-2), `cleanup:${record.syntheticRootId}`);
        controller.abort();
      },
    });
    assert.lengthOf(matrix.records, 1);
    assert.equal(matrix.completion, "incomplete");
    assert.include(matrix.warnings, "matrix-aborted");
    assert.equal(order.at(-1), "restore");
    assert.equal(getAcpRuntimeDiagnosticsMode(), "idle");
  });

  it("releases diagnostic ownership when Workspace snapshot fails", async function () {
    const matrix = await runAcpRuntimeReplayMatrix({
      trace: fixtureTrace(),
      cadence: "burst",
      environment: { pluginVersion: "x", zoteroVersion: "x", platform: "x" },
      createTarget: async () => target(),
      workspace: {
        snapshot: async () => {
          throw new Error("snapshot sentinel");
        },
        prepare: async () => ({ ok: true }),
        drain: async () => ({ ok: true }),
        restore: async () => undefined,
      },
      profiler: { start: async () => undefined, finish: async () => ({}) },
      r2Port: { consumeFragment: async () => undefined },
    });
    assert.equal(matrix.completion, "incomplete");
    assert.include(matrix.warnings.join("\n"), "snapshot sentinel");
    assert.equal(getAcpRuntimeDiagnosticsMode(), "idle");
  });

  it("keeps recorder and replay mutually exclusive", async function () {
    await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-chat-conversation",
      root: tempRoot,
    });
    await assertRejects(
      runAcpRuntimeReplayMatrix({
        trace: fixtureTrace(),
        cadence: "burst",
        environment: { pluginVersion: "x", zoteroVersion: "x", platform: "x" },
        createTarget: async () => target(),
        workspace: {
          snapshot: async () => ({}),
          prepare: async () => ({ ok: true }),
          drain: async () => ({ ok: true }),
          restore: async () => undefined,
        },
        profiler: { start: async () => undefined, finish: async () => ({}) },
        r2Port: { consumeFragment: async () => undefined },
      }),
      /diagnostic mode is active/,
    );
  });
});

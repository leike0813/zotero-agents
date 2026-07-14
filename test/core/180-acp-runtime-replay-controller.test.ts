import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { assert } from "chai";
import {
  cancelAcpRuntimeReplayController,
  getAcpRuntimeReplayControllerView,
  preflightAcpRuntimeReplayTrace,
  resetAcpRuntimeReplayControllerForTests,
  setAcpRuntimeReplayDraft,
  setAcpRuntimeReplayControllerRuntimeForTests,
  startAcpRuntimeReplayController,
} from "../../src/modules/acpRuntimeReplayController";
import {
  armAcpRuntimeSemanticTraceRecorder,
  cancelAcpRuntimeSemanticTraceRecorder,
  discardAcpRuntimeSemanticTracePartialForTests,
  recordAcpRuntimeSemanticTraceEvent,
  resetAcpRuntimeSemanticTraceRecorder,
  saveFrozenAcpRuntimeSemanticTrace,
  stopAcpRuntimeSemanticTraceRecorder,
} from "../../src/modules/acpRuntimeSemanticTraceRecorder";
import { resetAcpRuntimeDiagnosticsModeForTests } from "../../src/modules/acpRuntimeDiagnosticsMode";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";

describe("ACP runtime replay controller", function () {
  this.timeout(10_000);

  let tempRoot = "";

  beforeEach(async function () {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "zs-acp-replay-ui-"));
    setDebugModeOverrideForTests(true);
    resetAcpRuntimeDiagnosticsModeForTests();
    resetAcpRuntimeReplayControllerForTests();
  });

  afterEach(async function () {
    resetAcpRuntimeReplayControllerForTests();
    await discardAcpRuntimeSemanticTracePartialForTests();
    resetAcpRuntimeDiagnosticsModeForTests();
    setDebugModeOverrideForTests();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  async function createTrace(args?: { cancel?: boolean }) {
    await armAcpRuntimeSemanticTraceRecorder({
      sourceKind: "acp-chat-conversation",
      root: tempRoot,
    });
    const owner = { rootId: "controller-trace" };
    await recordAcpRuntimeSemanticTraceEvent({
      kind: "root-start",
      sourceKind: "acp-chat-conversation",
      owner,
      payload: {},
    });
    if (args?.cancel) {
      const canceled = await cancelAcpRuntimeSemanticTraceRecorder();
      const tracePath = canceled.partialPath || "";
      await resetAcpRuntimeSemanticTraceRecorder();
      return tracePath;
    }
    await recordAcpRuntimeSemanticTraceEvent({
      kind: "root-end",
      sourceKind: "acp-chat-conversation",
      owner,
      payload: {},
    });
    await stopAcpRuntimeSemanticTraceRecorder();
    return (await saveFrozenAcpRuntimeSemanticTrace()).path;
  }

  function installRuntime(ownerIds: string[]) {
    let active:
      | {
          requestId: string;
          surface: "closed" | "open-inactive" | "target-active";
        }
      | undefined;
    setAcpRuntimeReplayControllerRuntimeForTests({
      createTarget: async ({ sourceKind, syntheticRootId }) => {
        ownerIds.push(syntheticRootId);
        return {
          sourceKind,
          syntheticRootId,
          apply: async () => "applied",
          drain: async () => ({ ok: true }),
          cleanup: async () => undefined,
        };
      },
      workspace: {
        snapshot: async () => ({ open: false }),
        prepare: async () => ({ ok: true }),
        drain: async () => ({ ok: true }),
        restore: async () => undefined,
      },
      profiler: {
        start: async ({ syntheticRootId, surface }) => {
          active = { requestId: syntheticRootId, surface };
        },
        finish: async () => ({
          requestId: active?.requestId || "",
          displayMode: "live" as const,
          transport: "unknown" as const,
          zoteroMajor: 9 as const,
          startedAtMs: 1,
          finishedAtMs: 2,
          metrics: [
            {
              name: "semantic_event" as const,
              labels: {},
              counter: { total: 2 },
            },
            {
              name: "host_input_fragment" as const,
              labels: {},
              counter: { total: 33 },
            },
            {
              name: "host_input_bytes" as const,
              labels: {},
              counter: { total: 536 },
            },
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
            ...(active?.surface === "target-active"
              ? (
                  ["panel_prepare", "panel_signature", "panel_post"] as const
                ).map((name) => ({ name, labels: {}, counter: { total: 1 } }))
              : []),
          ],
        }),
      },
      r2Port: { consumeFragment: async () => undefined },
      saveMatrix: async () => ({
        folder: path.join(tempRoot, "results"),
        jsonPath: path.join(tempRoot, "results", "matrix.json"),
        markdownPath: path.join(tempRoot, "results", "matrix.md"),
      }),
    });
  }

  function replaceGlobalProperty(key: string, value: unknown) {
    const runtime = globalThis as Record<string, unknown>;
    const previous = Object.getOwnPropertyDescriptor(runtime, key);
    Object.defineProperty(runtime, key, {
      configurable: true,
      value,
      writable: true,
    });
    return () => {
      if (previous) Object.defineProperty(runtime, key, previous);
      else delete runtime[key];
    };
  }

  it("preflights complete metadata and rejects incomplete traces inline", async function () {
    const completePath = await createTrace();
    const ready = await preflightAcpRuntimeReplayTrace({
      tracePath: completePath,
    });
    assert.equal(ready.traceValidation, "ready");
    assert.equal(ready.traceMetadata?.sourceKind, "acp-chat-conversation");
    assert.equal(ready.traceMetadata?.eventCount, 2);
    assert.match(ready.traceMetadata?.digest || "", /^[a-f0-9]{64}$/);
    assert.isNotEmpty(ready.traceMetadata?.sampleName || "");

    await resetAcpRuntimeSemanticTraceRecorder();
    const incompletePath = await createTrace({ cancel: true });
    const invalid = await preflightAcpRuntimeReplayTrace({
      tracePath: incompletePath,
    });
    assert.equal(invalid.traceValidation, "invalid");
    assert.match(invalid.error || "", /incomplete/i);
  });

  it("keeps a normalized free-text stage draft and rejects invalid stages before setup", async function () {
    const tracePath = await createTrace();
    const ownerIds: string[] = [];
    installRuntime(ownerIds);
    const draft = setAcpRuntimeReplayDraft({ phase: "  治理\t第二 阶段  " });
    assert.equal(draft.phase, "治理 第二 阶段");
    assert.equal(draft.phaseValidation, "ready");
    await preflightAcpRuntimeReplayTrace({ tracePath });
    assert.equal(getAcpRuntimeReplayControllerView().phase, "治理 第二 阶段");

    const rejected = await startAcpRuntimeReplayController({
      tracePath,
      phase: " ",
      cadence: "burst",
      environment: { pluginVersion: "x", zoteroVersion: "x", platform: "x" },
    });
    assert.equal(rejected.state, "failed");
    assert.equal(rejected.phaseValidation, "invalid");
    assert.equal(rejected.phaseErrorCode, "required");
    assert.deepEqual(ownerIds, []);
  });

  it("publishes all nine records and preserves the validated draft", async function () {
    const tracePath = await createTrace();
    const ownerIds: string[] = [];
    installRuntime(ownerIds);
    const completed: number[] = [];
    const result = await startAcpRuntimeReplayController({
      tracePath,
      phase: "治理后复核",
      cadence: "burst",
      environment: { pluginVersion: "x", zoteroVersion: "x", platform: "x" },
      onViewChange: (next) => {
        completed.push(next.progress.completed);
        if (next.currentRun) {
          assert.equal(
            next.currentRun.matrixIndex,
            next.progress.completed + 1,
          );
        }
      },
    });
    assert.equal(result.state, "complete");
    assert.equal(result.traceValidation, "ready");
    assert.equal(result.tracePath, tracePath);
    assert.equal(result.phase, "治理后复核");
    assert.isUndefined(result.currentRun);
    assert.lengthOf(result.records, 9);
    assert.lengthOf(result.surfaceSummaries, 3);
    assert.equal(result.progress.completed, 9);
    assert.includeMembers(completed, [0, 1, 9]);
    assert.lengthOf(ownerIds, 9);
  });

  it("cancels after one record, saves an incomplete matrix, and retries with fresh owners", async function () {
    const tracePath = await createTrace();
    const ownerIds: string[] = [];
    installRuntime(ownerIds);
    const canceled = await startAcpRuntimeReplayController({
      tracePath,
      phase: "before-governance",
      cadence: "burst",
      environment: { pluginVersion: "x", zoteroVersion: "x", platform: "x" },
      onViewChange: (next) => {
        if (next.state === "running" && next.progress.completed === 1) {
          cancelAcpRuntimeReplayController();
        }
      },
    });
    assert.equal(canceled.state, "canceled");
    assert.equal(canceled.progress.completed, 1);
    assert.match(canceled.jsonPath || "", /matrix\.json$/);
    const firstOwners = new Set(ownerIds);

    const retried = await startAcpRuntimeReplayController({
      tracePath,
      phase: "before-governance",
      cadence: "burst",
      environment: { pluginVersion: "x", zoteroVersion: "x", platform: "x" },
    });
    assert.equal(retried.state, "complete");
    const retryOwners = ownerIds.slice(firstOwners.size);
    assert.lengthOf(retryOwners, 9);
    assert.isTrue(retryOwners.every((entry) => !firstOwners.has(entry)));
    assert.equal(getAcpRuntimeReplayControllerView().tracePath, tracePath);
  });

  it("runs and cancels when the Zotero host has no AbortController global", async function () {
    const tracePath = await createTrace();
    const ownerIds: string[] = [];
    installRuntime(ownerIds);
    const restoreAbortController = replaceGlobalProperty(
      "AbortController",
      undefined,
    );
    try {
      const canceled = await startAcpRuntimeReplayController({
        tracePath,
        phase: "before-governance",
        cadence: "burst",
        environment: { pluginVersion: "x", zoteroVersion: "x", platform: "x" },
        onViewChange: (next) => {
          if (next.state === "running" && next.progress.completed === 1) {
            cancelAcpRuntimeReplayController();
          }
        },
      });
      assert.equal(canceled.state, "canceled");
      assert.equal(canceled.progress.completed, 1);

      const completed = await startAcpRuntimeReplayController({
        tracePath,
        phase: "before-governance",
        cadence: "burst",
        environment: { pluginVersion: "x", zoteroVersion: "x", platform: "x" },
      });
      assert.equal(completed.state, "complete");
      assert.equal(completed.progress.completed, 9);
    } finally {
      restoreAbortController();
    }
  });
});

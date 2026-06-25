import { assert } from "chai";
import { promises as fs } from "fs";
import path from "path";
import { recordTestPerformanceSpan } from "../../../src/modules/testPerformanceProbeBridge";
import {
  __performanceProbeTestOnly,
  captureZoteroPerformanceSnapshot,
  flushZoteroPerformanceProbeDigest,
  getZoteroPerformanceProbeStateForTests,
  installZoteroPerformanceProbeDigest,
  noteZoteroPerformanceProbeTestStart,
  resetZoteroPerformanceProbeDigestForTests,
} from "../../../test/zotero/performanceProbeDigest";

describe("zotero test performance probe digest", function () {
  const originalEnv = {
    probe: process.env.ZOTERO_TEST_PERF_PROBE,
    out: process.env.ZOTERO_TEST_PERF_PROBE_OUT,
  };

  afterEach(function () {
    if (typeof originalEnv.probe === "string") {
      process.env.ZOTERO_TEST_PERF_PROBE = originalEnv.probe;
    } else {
      delete process.env.ZOTERO_TEST_PERF_PROBE;
    }
    if (typeof originalEnv.out === "string") {
      process.env.ZOTERO_TEST_PERF_PROBE_OUT = originalEnv.out;
    } else {
      delete process.env.ZOTERO_TEST_PERF_PROBE_OUT;
    }
    resetZoteroPerformanceProbeDigestForTests();
  });

  it("stays inert when the perf probe env flag is disabled", async function () {
    delete process.env.ZOTERO_TEST_PERF_PROBE;
    resetZoteroPerformanceProbeDigestForTests();

    installZoteroPerformanceProbeDigest();
    await noteZoteroPerformanceProbeTestStart({
      domain: "core",
      fullTitle: "perf inert",
      file: "test/core/example.test.ts",
    });
    await captureZoteroPerformanceSnapshot("pre-cleanup", {
      domain: "core",
      fullTitle: "perf inert",
      file: "test/core/example.test.ts",
    });
    recordTestPerformanceSpan({
      name: "buildSelectionContext",
      startedAt: Date.now() - 5,
      durationMs: 5,
      labels: {},
    });

    assert.deepInclude(getZoteroPerformanceProbeStateForTests(), {
      enabled: false,
      snapshotCount: 0,
      spanCount: 0,
      testIndex: 0,
    });
  });

  it("defaults perf probe output under artifact test-diagnostics", function () {
    process.env.ZOTERO_TEST_PERF_PROBE = "1";
    delete process.env.ZOTERO_TEST_PERF_PROBE_OUT;
    resetZoteroPerformanceProbeDigestForTests();

    installZoteroPerformanceProbeDigest();

    assert.include(
      getZoteroPerformanceProbeStateForTests().outputPath.replace(/\\/g, "/"),
      "/artifact/test-diagnostics/zotero-performance-probe-",
    );
  });

  it("writes a digest file with spans and summary", async function () {
    process.env.ZOTERO_TEST_PERF_PROBE = "1";
    process.env.ZOTERO_TEST_PERF_PROBE_OUT = path.join(
      process.cwd(),
      "artifact",
      "test-diagnostics",
      "performance-probe-digest-test.json",
    );
    resetZoteroPerformanceProbeDigestForTests();

    installZoteroPerformanceProbeDigest();
    await noteZoteroPerformanceProbeTestStart({
      domain: "workflow",
      fullTitle: "perf case 1",
      file: "test/workflow/foo.test.ts",
    });
    recordTestPerformanceSpan({
      name: "buildSelectionContext",
      startedAt: Date.now() - 12,
      durationMs: 12,
      labels: { selectedItemCount: 1 },
    });
    await captureZoteroPerformanceSnapshot("post-object-cleanup", {
      domain: "workflow",
      fullTitle: "perf case 1",
      file: "test/workflow/foo.test.ts",
    });

    await noteZoteroPerformanceProbeTestStart({
      domain: "workflow",
      fullTitle: "perf case 2",
      file: "test/workflow/foo.test.ts",
    });
    recordTestPerformanceSpan({
      name: "buildSelectionContext",
      startedAt: Date.now() - 40,
      durationMs: 40,
      labels: { selectedItemCount: 2 },
    });
    recordTestPerformanceSpan({
      name: "executeBuildRequests",
      startedAt: Date.now() - 18,
      durationMs: 18,
      labels: { workflowId: "w1" },
    });
    await captureZoteroPerformanceSnapshot("post-object-cleanup", {
      domain: "workflow",
      fullTitle: "perf case 2",
      file: "test/workflow/foo.test.ts",
    });

    const outputPath = await flushZoteroPerformanceProbeDigest();
    const payload = JSON.parse(await fs.readFile(outputPath, "utf8")) as {
      spans: Array<{ name: string }>;
      summary: {
        durationHeadVsTail: Array<{ name: string }>;
        topSlowTests: Array<{ name: string }>;
      };
      suspicions: Array<{ metric: string }>;
    };

    assert.lengthOf(payload.spans, 3);
    assert.isTrue(
      payload.summary.durationHeadVsTail.some(
        (entry) => entry.name === "buildSelectionContext",
      ),
    );
    assert.isTrue(
      payload.summary.durationHeadVsTail.some(
        (entry) =>
          entry.name === "executeApplyResult:tagRegulator:applyTagMutations",
      ) === false,
    );
    assert.equal(payload.summary.topSlowTests[0].name, "buildSelectionContext");
    assert.isTrue(
      payload.suspicions.some(
        (entry) => entry.metric === "buildSelectionContext",
      ),
    );
  });

  it("summarizes duration and resource head-vs-tail signals", function () {
    const summary = __performanceProbeTestOnly.buildSummary({
      spans: [
        {
          name: "buildSelectionContext",
          domain: "workflow",
          fullTitle: "a",
          file: "a.test.ts",
          testIndex: 1,
          ts: "2026-04-16T00:00:00.000Z",
          elapsedSinceRunStartMs: 10,
          startedAt: "2026-04-16T00:00:00.000Z",
          durationMs: 10,
          labels: {},
        },
        {
          name: "buildSelectionContext",
          domain: "workflow",
          fullTitle: "b",
          file: "b.test.ts",
          testIndex: 2,
          ts: "2026-04-16T00:00:01.000Z",
          elapsedSinceRunStartMs: 20,
          startedAt: "2026-04-16T00:00:01.000Z",
          durationMs: 40,
          labels: {},
        },
      ],
      snapshots: [
        {
          phase: "test-start",
          domain: "workflow",
          fullTitle: "a",
          file: "a.test.ts",
          testIndex: 1,
          ts: "2026-04-16T00:00:00.000Z",
          elapsedSinceRunStartMs: 10,
          metrics: {
            eventLoopLag: { lagMs: 2 },
            hostResources: {
              library: {
                itemCount: 10,
                noteCount: 3,
                attachmentCount: 5,
                collectionCount: 1,
              },
              windows: {
                openWindowCount: 1,
                dialogWindowCount: 0,
                browserCount: 1,
                frameCount: 1,
              },
            },
          },
        },
        {
          phase: "test-start",
          domain: "workflow",
          fullTitle: "b",
          file: "b.test.ts",
          testIndex: 2,
          ts: "2026-04-16T00:00:01.000Z",
          elapsedSinceRunStartMs: 20,
          metrics: {
            eventLoopLag: { lagMs: 9 },
            hostResources: {
              library: {
                itemCount: 30,
                noteCount: 8,
                attachmentCount: 15,
                collectionCount: 2,
              },
              windows: {
                openWindowCount: 3,
                dialogWindowCount: 1,
                browserCount: 4,
                frameCount: 4,
              },
            },
          },
        },
      ],
    });

    assert.deepInclude(summary.durationHeadVsTail[0], {
      name: "buildSelectionContext",
      headAvg: 10,
      tailAvg: 40,
      delta: 30,
    });
    assert.deepInclude(summary.eventLoopLagHeadVsTail[0], {
      phase: "test-start",
      headAvg: 2,
      tailAvg: 9,
      delta: 7,
    });
    assert.isTrue(
      summary.resourceHeadVsTail.some((entry) => {
        return (
          entry.metric === "windows.browserCount" &&
          entry.headAvg === 1 &&
          entry.tailAvg === 4 &&
          entry.delta === 3
        );
      }),
    );
  });

  it("keeps applyResult child spans separated in duration summary", function () {
    const summary = __performanceProbeTestOnly.buildSummary({
      spans: [
        {
          name: "executeApplyResult",
          domain: "workflow",
          fullTitle: "a",
          file: "a.test.ts",
          testIndex: 1,
          ts: "2026-04-16T00:00:00.000Z",
          elapsedSinceRunStartMs: 10,
          startedAt: "2026-04-16T00:00:00.000Z",
          durationMs: 100,
          labels: {},
        },
        {
          name: "executeApplyResult:tagRegulator:applyTagMutations",
          domain: "workflow",
          fullTitle: "a",
          file: "a.test.ts",
          testIndex: 1,
          ts: "2026-04-16T00:00:00.100Z",
          elapsedSinceRunStartMs: 20,
          startedAt: "2026-04-16T00:00:00.100Z",
          durationMs: 40,
          labels: {},
        },
        {
          name: "executeApplyResult:tagRegulator:applyTagMutations",
          domain: "workflow",
          fullTitle: "b",
          file: "b.test.ts",
          testIndex: 2,
          ts: "2026-04-16T00:00:01.000Z",
          elapsedSinceRunStartMs: 30,
          startedAt: "2026-04-16T00:00:01.000Z",
          durationMs: 140,
          labels: {},
        },
      ],
      snapshots: [],
    });

    const names = summary.durationHeadVsTail.map((entry) => entry.name);
    assert.include(names, "executeApplyResult");
    assert.include(names, "executeApplyResult:tagRegulator:applyTagMutations");
    const child = summary.durationHeadVsTail.find(
      (entry) =>
        entry.name === "executeApplyResult:tagRegulator:applyTagMutations",
    );
    assert.deepInclude(child, {
      headAvg: 40,
      tailAvg: 140,
      delta: 100,
    });
  });

  it("keeps handler and cleanup primitive spans separated in duration summary", function () {
    const summary = __performanceProbeTestOnly.buildSummary({
      spans: [
        {
          name: "handlers:parent.addNote:saveTx",
          domain: "workflow",
          fullTitle: "a",
          file: "a.test.ts",
          testIndex: 1,
          ts: "2026-04-16T00:00:00.000Z",
          elapsedSinceRunStartMs: 10,
          startedAt: "2026-04-16T00:00:00.000Z",
          durationMs: 80,
          labels: {},
        },
        {
          name: "handlers:parent.addNote:saveTx",
          domain: "workflow",
          fullTitle: "b",
          file: "b.test.ts",
          testIndex: 2,
          ts: "2026-04-16T00:00:01.000Z",
          elapsedSinceRunStartMs: 20,
          startedAt: "2026-04-16T00:00:01.000Z",
          durationMs: 180,
          labels: {},
        },
        {
          name: "zoteroTestObjectCleanup:eraseTx",
          domain: "workflow",
          fullTitle: "b",
          file: "b.test.ts",
          testIndex: 2,
          ts: "2026-04-16T00:00:01.050Z",
          elapsedSinceRunStartMs: 25,
          startedAt: "2026-04-16T00:00:01.050Z",
          durationMs: 40,
          labels: {},
        },
      ],
      snapshots: [],
    });

    const addNoteSave = summary.durationHeadVsTail.find(
      (entry) => entry.name === "handlers:parent.addNote:saveTx",
    );
    const cleanupErase = summary.durationHeadVsTail.find(
      (entry) => entry.name === "zoteroTestObjectCleanup:eraseTx",
    );

    assert.deepInclude(addNoteSave, {
      headAvg: 80,
      tailAvg: 180,
      delta: 100,
    });
    assert.deepInclude(cleanupErase, {
      headAvg: 40,
      tailAvg: 40,
      delta: 0,
    });
  });
});

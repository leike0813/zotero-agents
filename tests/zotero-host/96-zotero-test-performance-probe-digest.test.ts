import { assert } from "chai";
import { promises as fs } from "fs";
import path from "path";
import { recordTestPerformanceSpan } from "../../src/modules/testPerformanceProbeBridge";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  incrementAcpRuntimeMetric,
  startAcpRuntimeProfile,
} from "../../src/modules/acp/diagnostics/acpRuntimePerformanceProfiler";
import {
  __performanceProbeTestOnly,
  beginPiCapacityProbe,
  captureZoteroPerformanceSnapshot,
  evaluatePiCapacityMeasurements,
  flushZoteroPerformanceProbeDigest,
  getZoteroPerformanceProbeStateForTests,
  installZoteroPerformanceProbeDigest,
  markPiCapacityPhase,
  notePiCapacityAdmission,
  notePiCapacityCompletion,
  notePiCapacityCompleteness,
  notePiCapacityDispatch,
  notePiCapacityLane,
  noteZoteroPerformanceProbeTestStart,
  resetPiCapacityProbeForTests,
  resetZoteroPerformanceProbeDigestForTests,
  stopPiCapacityProbe,
  validatePiCapacityPerformanceRecord,
  type PiCapacityMeasurements,
  type PiCapacityPerformanceRecord,
} from "../../tests/zotero/performanceProbeDigest";

describe("zotero test performance probe digest", function () {
  const originalEnv = {
    probe: process.env.ZOTERO_TEST_PERF_PROBE,
    out: process.env.ZOTERO_TEST_PERF_PROBE_OUT,
  };

  afterEach(function () {
    setDebugModeOverrideForTests();
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
      file: "tests/runtime/example.test.ts",
    });
    await captureZoteroPerformanceSnapshot("pre-cleanup", {
      domain: "core",
      fullTitle: "perf inert",
      file: "tests/runtime/example.test.ts",
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
      "/artifacts/test-diagnostics/zotero-performance-probe-",
    );
  });

  it("writes a digest file with spans and summary", async function () {
    process.env.ZOTERO_TEST_PERF_PROBE = "1";
    process.env.ZOTERO_TEST_PERF_PROBE_OUT = path.join(
      process.cwd(),
      "artifacts",
      "test-diagnostics",
      "performance-probe-digest-test.json",
    );
    resetZoteroPerformanceProbeDigestForTests();
    setDebugModeOverrideForTests(true);

    installZoteroPerformanceProbeDigest();
    startAcpRuntimeProfile({
      requestId: "digest-profile",
      displayMode: "silent",
      transport: "stdio",
      zoteroMajor: 9,
    });
    incrementAcpRuntimeMetric("digest-profile", "session_update", {
      updateClass: "assistant-message",
    });
    await noteZoteroPerformanceProbeTestStart({
      domain: "workflow",
      fullTitle: "perf case 1",
      file: "tests/workflow/foo.test.ts",
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
      file: "tests/workflow/foo.test.ts",
    });

    await noteZoteroPerformanceProbeTestStart({
      domain: "workflow",
      fullTitle: "perf case 2",
      file: "tests/workflow/foo.test.ts",
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
      file: "tests/workflow/foo.test.ts",
    });

    const outputPath = await flushZoteroPerformanceProbeDigest();
    const payload = JSON.parse(await fs.readFile(outputPath, "utf8")) as {
      spans: Array<{ name: string }>;
      summary: {
        durationHeadVsTail: Array<{ name: string }>;
        topSlowTests: Array<{ name: string }>;
      };
      suspicions: Array<{ metric: string }>;
      runtimePerformanceProfiles?: {
        active: Array<{
          requestId: string;
          metrics: Array<{ name: string; counter?: { total: number } }>;
        }>;
      };
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
    assert.equal(
      payload.runtimePerformanceProfiles?.active[0].requestId,
      "digest-profile",
    );
    assert.equal(
      payload.runtimePerformanceProfiles?.active[0].metrics.find(
        (entry) => entry.name === "session_update",
      )?.counter?.total,
      1,
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

const cleanPiCapacityMeasurements = (): PiCapacityMeasurements => ({
  lag: { sampleCount: 60, p95Ms: 40, maxMs: 300 },
  rss: {
    supported: true,
    baselineBytes: 500_000_000,
    peakBytes: 800_000_000,
    settledBytes: 560_000_000,
    peakDeltaBytes: 300_000_000,
    settledDeltaBytes: 60_000_000,
  },
  load: { dispatched: 120, completed: 120, unexplainedFailures: 0 },
  admission: {
    sampleCount: 30,
    foregroundMaxMs: 250,
    overCapacityAdmissions: 0,
  },
  completeness: { expected: 120, observed: 120, missing: 0, starved: false },
});

const validPiCapacityRecord = (): PiCapacityPerformanceRecord => ({
  kind: "performance",
  probe: "pi-runtime-capacity",
  stage: "final",
  target: { platform: "linux", zoteroMajor: 10 },
  candidate: { commit: "a".repeat(40), xpiSha256: "b".repeat(64) },
  capacity: { total: 12, background: 10 },
  workload: { forcedGc: false, mixedForeground: 8, mixedBackground: 40 },
  phases: [
    { phase: "warmup", durationMs: 60_000 },
    { phase: "idle", durationMs: 60_000 },
    { phase: "mixed", durationMs: 900_000 },
    { phase: "settle", durationMs: 120_000 },
  ],
  measurements: cleanPiCapacityMeasurements(),
  violations: [],
  passed: true,
});

describe("Pi capacity performance probe", function () {
  afterEach(function () {
    resetPiCapacityProbeForTests();
  });

  it("samples Zotero resident bytes without a Node process", function () {
    const host = globalThis as any;
    const priorProcess = host.process;
    const priorComponents = Object.getOwnPropertyDescriptor(host, "Components");
    try {
      host.process = undefined;
      Object.defineProperty(host, "Components", {
        configurable: true,
        value: {
          classes: {
            "@mozilla.org/memory-reporter-manager;1": {
              getService: () => ({ residentFast: 123456789 }),
            },
          },
          interfaces: { nsIMemoryReporterManager: {} },
        },
      });
      beginPiCapacityProbe({
        stage: "exploration",
        capacity: 4,
        backgroundCapacity: 2,
        target: { platform: "linux", zoteroMajor: 10 },
        candidate: { commit: "a".repeat(40), xpiSha256: "b".repeat(64) },
        forcedGc: false,
      });
      markPiCapacityPhase("idle");
      markPiCapacityPhase("mixed");
      const record = stopPiCapacityProbe();
      assert.equal(record?.measurements.rss.settledBytes, 123456789);
      assert.isTrue(record?.measurements.rss.supported);
    } finally {
      host.process = priorProcess;
      if (priorComponents)
        Object.defineProperty(host, "Components", priorComponents);
      else delete host.Components;
    }
  });

  it("accepts a capacity measurement inside every accepted limit", function () {
    const verdict = evaluatePiCapacityMeasurements(
      cleanPiCapacityMeasurements(),
    );
    assert.isTrue(verdict.passed);
    assert.deepEqual(verdict.violations, []);
  });

  it("names every violated capacity limit", function () {
    const violationsFor = (
      mutate: (measurements: PiCapacityMeasurements) => void,
    ) => {
      const measurements = cleanPiCapacityMeasurements();
      mutate(measurements);
      return evaluatePiCapacityMeasurements(measurements).violations;
    };
    assert.deepEqual(
      violationsFor((m) => {
        m.lag.sampleCount = 0;
        m.lag.p95Ms = 0;
        m.lag.maxMs = 0;
      }),
      ["lag_observation_missing"],
    );
    assert.deepEqual(
      violationsFor((m) => {
        m.lag.p95Ms = 150;
      }),
      ["lag_p95_exceeded"],
    );
    assert.deepEqual(
      violationsFor((m) => {
        m.lag.maxMs = 1_500;
      }),
      ["lag_stall_exceeded"],
    );
    assert.deepEqual(
      violationsFor((m) => {
        m.rss.supported = false;
        m.rss.peakDeltaBytes = null;
        m.rss.settledDeltaBytes = null;
      }),
      ["rss_observation_missing"],
    );
    assert.deepEqual(
      violationsFor((m) => {
        m.rss.peakDeltaBytes = 2 * 1024 ** 3;
      }),
      ["peak_rss_exceeded"],
    );
    assert.deepEqual(
      violationsFor((m) => {
        m.rss.settledDeltaBytes = 512 * 1024 ** 2;
      }),
      ["settled_rss_exceeded"],
    );
    assert.deepEqual(
      violationsFor((m) => {
        m.completeness.observed = 100;
        m.completeness.missing = 20;
      }),
      ["event_loss"],
    );
    assert.deepEqual(
      violationsFor((m) => {
        m.completeness.observed = 0;
        m.completeness.missing = 120;
        m.completeness.starved = true;
      }),
      ["event_loss", "starvation"],
    );
    assert.deepEqual(
      violationsFor((m) => {
        m.load.unexplainedFailures = 1;
      }),
      ["unexplained_failure"],
    );
    assert.deepEqual(
      violationsFor((m) => {
        m.admission.overCapacityAdmissions = 1;
      }),
      ["over_capacity_admission"],
    );
    assert.deepEqual(
      violationsFor((m) => {
        m.admission.foregroundMaxMs = 1_200;
      }),
      ["foreground_admission_stalled"],
    );
  });

  it("requires a fully bound, phase-complete capacity record", function () {
    assert.isTrue(
      validatePiCapacityPerformanceRecord(validPiCapacityRecord()).valid,
    );
    const reasonFor = (
      mutate: (record: PiCapacityPerformanceRecord) => void,
    ) => {
      const record = validPiCapacityRecord();
      mutate(record);
      const verdict = validatePiCapacityPerformanceRecord(record);
      assert.isFalse(verdict.valid);
      return verdict.valid ? "" : verdict.reason;
    };
    assert.equal(
      reasonFor((r) => {
        (r as { stage: string }).stage = "candidate";
      }),
      "stage_invalid",
    );
    assert.equal(
      reasonFor((r) => {
        (r.target as { platform: string }).platform = "darwin";
      }),
      "target_invalid",
    );
    assert.equal(
      reasonFor((r) => {
        r.target.zoteroMajor = 9;
      }),
      "target_invalid",
    );
    assert.equal(
      reasonFor((r) => {
        r.candidate.commit = "abc";
      }),
      "identity_incomplete",
    );
    assert.equal(
      reasonFor((r) => {
        r.candidate.xpiSha256 = "abc";
      }),
      "identity_incomplete",
    );
    assert.equal(
      reasonFor((r) => {
        r.capacity.total = 5;
      }),
      "capacity_invalid",
    );
    assert.equal(
      reasonFor((r) => {
        r.capacity.background = 9;
      }),
      "capacity_invalid",
    );
    assert.equal(
      reasonFor((r) => {
        r.workload.forcedGc = true;
      }),
      "workload_invalid",
    );
    assert.equal(
      reasonFor((r) => {
        r.workload.mixedForeground = 0;
      }),
      "workload_invalid",
    );
    assert.equal(
      reasonFor((r) => {
        r.phases[0].durationMs = 1_000;
      }),
      "phases_incomplete",
    );
    assert.equal(
      reasonFor((r) => {
        r.phases.pop();
      }),
      "phases_incomplete",
    );
    assert.equal(
      reasonFor((r) => {
        r.measurements.lag.sampleCount = 0;
      }),
      "measurements_insufficient",
    );
    assert.equal(
      reasonFor((r) => {
        r.measurements.admission.sampleCount = 0;
      }),
      "measurements_insufficient",
    );
    assert.equal(
      reasonFor((r) => {
        r.measurements.load.dispatched = 0;
      }),
      "measurements_insufficient",
    );
    assert.equal(
      reasonFor((r) => {
        r.measurements.rss.supported = false;
        r.measurements.rss.peakDeltaBytes = null;
        r.measurements.rss.settledDeltaBytes = null;
      }),
      "measurements_insufficient",
    );
    assert.equal(
      reasonFor((r) => {
        r.measurements.lag.p95Ms = 500;
      }),
      "verdict_not_derived",
    );
    const failed = validPiCapacityRecord();
    failed.measurements.lag.p95Ms = 500;
    failed.violations = ["lag_p95_exceeded"];
    failed.passed = false;
    assert.isTrue(validatePiCapacityPerformanceRecord(failed).valid);
  });

  it("rejects fabricated counts and admission samples", function () {
    const reasonFor = (
      mutate: (record: PiCapacityPerformanceRecord) => void,
    ) => {
      const record = validPiCapacityRecord();
      mutate(record);
      const verdict = validatePiCapacityPerformanceRecord(record);
      assert.isFalse(verdict.valid);
      return verdict.valid ? "" : verdict.reason;
    };
    assert.equal(
      reasonFor((r) => {
        r.measurements.completeness.observed = 130;
      }),
      "counts_inconsistent",
    );
    assert.equal(
      reasonFor((r) => {
        r.measurements.completeness.missing = 5;
      }),
      "counts_inconsistent",
    );
    assert.equal(
      reasonFor((r) => {
        r.measurements.completeness.expected = 130;
      }),
      "counts_inconsistent",
    );
    assert.equal(
      reasonFor((r) => {
        r.measurements.completeness.starved = true;
      }),
      "counts_inconsistent",
    );
    assert.equal(
      reasonFor((r) => {
        r.measurements.load.completed = 130;
      }),
      "counts_inconsistent",
    );
    assert.equal(
      reasonFor((r) => {
        r.measurements.load.unexplainedFailures = 200;
      }),
      "counts_inconsistent",
    );
    assert.equal(
      reasonFor((r) => {
        r.measurements.admission.sampleCount = 200;
      }),
      "counts_inconsistent",
    );
    assert.equal(
      reasonFor((r) => {
        r.measurements.admission.overCapacityAdmissions = 99;
      }),
      "counts_inconsistent",
    );
    assert.equal(
      reasonFor((r) => {
        (r.measurements.lag as { p95Ms: number }).p95Ms = -1;
      }),
      "measurements_invalid",
    );
    assert.equal(
      reasonFor((r) => {
        (r.measurements.load as { completed: number }).completed = 1.5;
      }),
      "measurements_invalid",
    );
  });

  it("freezes a phase-bound capacity record from continuous sampling", async function () {
    let bytes = 1_000_000;
    beginPiCapacityProbe({
      stage: "exploration",
      capacity: 4,
      backgroundCapacity: 2,
      target: { platform: "linux", zoteroMajor: 10 },
      candidate: { commit: "a".repeat(40), xpiSha256: "b".repeat(64) },
      forcedGc: false,
      sampleIntervalMs: 250,
      residentBytesReader: () => (bytes += 2_000_000),
    });
    markPiCapacityPhase("warmup");
    markPiCapacityPhase("idle");
    markPiCapacityPhase("mixed");
    notePiCapacityDispatch(2);
    notePiCapacityCompletion({ completed: 1 });
    notePiCapacityCompletion({ completed: 1 });
    notePiCapacityCompleteness({ expected: 2, observed: 2 });
    notePiCapacityAdmission({ foregroundWaitMs: 20, activeCount: 4 });
    notePiCapacityLane("foreground");
    notePiCapacityLane("background");
    await new Promise((resolve) => setTimeout(resolve, 600));
    markPiCapacityPhase("settle");
    const record = stopPiCapacityProbe();
    assert.isOk(record);
    assert.equal(record?.stage, "exploration");
    assert.equal(record?.capacity.total, 4);
    assert.equal(record?.capacity.background, 2);
    assert.isTrue(record?.measurements.rss.supported);
    assert.deepEqual(record?.workload, {
      forcedGc: false,
      mixedForeground: 1,
      mixedBackground: 1,
    });
    assert.deepEqual(
      record?.phases.map((phase) => phase.phase),
      ["warmup", "idle", "mixed", "settle"],
    );
    assert.deepEqual(record?.measurements.completeness, {
      expected: 2,
      observed: 2,
      missing: 0,
      starved: false,
    });
    assert.isTrue(record?.passed);
  });
});

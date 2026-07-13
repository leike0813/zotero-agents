import { assert } from "chai";
import {
  ACP_RUNTIME_PERFORMANCE_PROFILER_ENABLED,
  isAcpRuntimePerformanceProfilerAvailable,
  setDebugModeOverrideForTests,
} from "../../src/modules/debugMode";
import {
  configureAcpRuntimePerformanceProfilerForTests,
  disableAcpRuntimePerformanceProfiler,
  enableAcpRuntimePerformanceProfiler,
  finishAcpRuntimeProfile,
  incrementAcpRuntimeMetric,
  isAcpRuntimePerformanceProfilerEnabled,
  observeAcpRuntimeDuration,
  observeAcpRuntimeGauge,
  resetAcpRuntimePerformanceProfilerForTests,
  snapshotAcpRuntimeProfiles,
  startAcpRuntimeProfile,
} from "../../src/modules/acpRuntimePerformanceProfiler";

describe("ACP runtime performance profiler", function () {
  afterEach(function () {
    resetAcpRuntimePerformanceProfilerForTests();
    setDebugModeOverrideForTests();
  });

  it("exposes the source switch only inside debug mode", function () {
    assert.isTrue(ACP_RUNTIME_PERFORMANCE_PROFILER_ENABLED);
    setDebugModeOverrideForTests(false);
    assert.isFalse(isAcpRuntimePerformanceProfilerAvailable());
    setDebugModeOverrideForTests(true);
    assert.isTrue(isAcpRuntimePerformanceProfilerAvailable());
  });

  it("cannot activate outside debug mode and remains inert", function () {
    setDebugModeOverrideForTests(false);

    assert.isFalse(enableAcpRuntimePerformanceProfiler());
    startAcpRuntimeProfile({
      requestId: "run-disabled",
      displayMode: "silent",
      transport: "stdio",
      zoteroMajor: 9,
    });
    incrementAcpRuntimeMetric("run-disabled", "jsonrpc_message", {
      updateClass: "notification",
    });

    assert.isFalse(isAcpRuntimePerformanceProfilerEnabled());
    assert.isUndefined(snapshotAcpRuntimeProfiles());
  });

  it("requires explicit activation inside debug mode", function () {
    setDebugModeOverrideForTests(true);
    startAcpRuntimeProfile({
      requestId: "run-inert",
      displayMode: "silent",
      transport: "stdio",
      zoteroMajor: 9,
    });

    assert.isUndefined(snapshotAcpRuntimeProfiles());
    assert.isTrue(enableAcpRuntimePerformanceProfiler());
    assert.isTrue(isAcpRuntimePerformanceProfilerEnabled());
    assert.deepEqual(snapshotAcpRuntimeProfiles()?.active, []);
  });

  it("aggregates counters durations and gauges without raw samples", function () {
    setDebugModeOverrideForTests(true);
    enableAcpRuntimePerformanceProfiler();
    startAcpRuntimeProfile({
      requestId: "run-a",
      displayMode: "silent",
      transport: "websocket",
      zoteroMajor: 9,
    });

    incrementAcpRuntimeMetric("run-a", "jsonrpc_message", {
      updateClass: "notification",
    });
    incrementAcpRuntimeMetric(
      "run-a",
      "jsonrpc_message",
      { updateClass: "notification" },
      2,
    );
    observeAcpRuntimeDuration(
      "run-a",
      "run_persist_duration",
      { persistenceChannel: "run" },
      17,
    );
    observeAcpRuntimeGauge(
      "run-a",
      "transport_queue_entries",
      { operationClass: "other" },
      4,
    );
    observeAcpRuntimeGauge(
      "run-a",
      "transport_queue_entries",
      { operationClass: "other" },
      1,
    );

    const profile = snapshotAcpRuntimeProfiles()?.active[0];
    assert.equal(profile?.requestId, "run-a");
    assert.equal(profile?.metrics.length, 3);
    assert.equal(
      profile?.metrics.find((entry) => entry.name === "jsonrpc_message")
        ?.counter?.total,
      3,
    );
    const duration = profile?.metrics.find(
      (entry) => entry.name === "run_persist_duration",
    )?.duration;
    assert.equal(duration?.count, 1);
    assert.equal(duration?.totalMs, 17);
    assert.equal(duration?.maxMs, 17);
    assert.equal(duration?.buckets.length, 11);
    const gauge = profile?.metrics.find(
      (entry) => entry.name === "transport_queue_entries",
    )?.gauge;
    assert.equal(gauge?.current, 1);
    assert.equal(gauge?.max, 4);
    assert.notProperty(profile || {}, "samples");
  });

  it("uses one drift timer and finishes a request once", function () {
    setDebugModeOverrideForTests(true);
    let now = 0;
    let nextTimerId = 0;
    const timers = new Map<number, () => void>();
    configureAcpRuntimePerformanceProfilerForTests({
      now: () => now,
      setTimer: (callback) => {
        nextTimerId += 1;
        timers.set(nextTimerId, callback);
        return nextTimerId;
      },
      clearTimer: (timer) => {
        timers.delete(Number(timer));
      },
    });
    enableAcpRuntimePerformanceProfiler();
    startAcpRuntimeProfile({
      requestId: "run-a",
      displayMode: "silent",
      transport: "stdio",
      zoteroMajor: 9,
    });
    startAcpRuntimeProfile({
      requestId: "run-b",
      displayMode: "silent",
      transport: "stdio",
      zoteroMajor: 9,
    });
    assert.equal(timers.size, 1);

    now = 151;
    const callback = Array.from(timers.values())[0];
    timers.clear();
    callback();
    assert.equal(timers.size, 1);
    const drift = snapshotAcpRuntimeProfiles()?.global.metrics.find(
      (entry) => entry.name === "event_loop_drift",
    )?.duration;
    assert.equal(drift?.count, 1);
    assert.equal(drift?.maxMs, 51);

    finishAcpRuntimeProfile("run-a");
    finishAcpRuntimeProfile("run-a");
    assert.equal(snapshotAcpRuntimeProfiles()?.completed.length, 1);
    finishAcpRuntimeProfile("run-b");
    assert.equal(timers.size, 0);
  });

  it("keeps burst state and completed history bounded", function () {
    setDebugModeOverrideForTests(true);
    enableAcpRuntimePerformanceProfiler();
    for (let index = 0; index < 12; index += 1) {
      const requestId = `run-${index}`;
      startAcpRuntimeProfile({
        requestId,
        displayMode: "silent",
        transport: "stdio",
        zoteroMajor: 9,
      });
      for (let event = 0; event < 10_000; event += 1) {
        incrementAcpRuntimeMetric(requestId, "session_update", {
          updateClass: "assistant-message",
        });
      }
      finishAcpRuntimeProfile(requestId);
    }

    const snapshot = snapshotAcpRuntimeProfiles();
    assert.isAtMost(snapshot?.active.length || 0, 8);
    assert.isAtMost(snapshot?.completed.length || 0, 8);
    assert.isAtMost(snapshot?.global.metrics.length || 0, 128);
    assert.notProperty(snapshot || {}, "samples");
  });

  it("returns an immutable snapshot and isolates clock failures", function () {
    setDebugModeOverrideForTests(true);
    configureAcpRuntimePerformanceProfilerForTests({
      now: () => {
        throw new Error("clock failed");
      },
    });
    assert.doesNotThrow(() => enableAcpRuntimePerformanceProfiler());
    assert.doesNotThrow(() =>
      startAcpRuntimeProfile({
        requestId: "run-a",
        displayMode: "silent",
        transport: "unknown",
        zoteroMajor: "unknown",
      }),
    );
    assert.doesNotThrow(() =>
      incrementAcpRuntimeMetric("run-a", "session_update"),
    );
    const snapshot = snapshotAcpRuntimeProfiles();
    assert.isTrue(Object.isFrozen(snapshot));
    assert.isTrue(Object.isFrozen(snapshot?.active));

    disableAcpRuntimePerformanceProfiler();
    assert.isUndefined(snapshotAcpRuntimeProfiles());
  });
});

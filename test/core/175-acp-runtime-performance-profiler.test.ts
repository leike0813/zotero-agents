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
  recordAcpRuntimePublicationAck,
  registerAcpRuntimeProfileAlias,
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

  it("attributes only explicitly registered synthetic owners to the root profile", function () {
    setDebugModeOverrideForTests(true);
    enableAcpRuntimePerformanceProfiler();
    startAcpRuntimeProfile({
      requestId: "replay-root",
      displayMode: "live",
      transport: "unknown",
      zoteroMajor: 9,
    });

    assert.isTrue(
      registerAcpRuntimeProfileAlias("replay-root", "replay-request"),
    );
    incrementAcpRuntimeMetric("replay-request", "run_persist");
    incrementAcpRuntimeMetric("unrelated-request", "run_persist", {}, 99);
    finishAcpRuntimeProfile("replay-root");

    const profile = snapshotAcpRuntimeProfiles()?.completed[0];
    assert.equal(
      profile?.metrics.find((entry) => entry.name === "run_persist")?.counter
        ?.total,
      1,
    );
    assert.isFalse(
      registerAcpRuntimeProfileAlias("replay-root", "late-request"),
    );
  });

  it("keeps publication surface, form, and materialization labels distinct", function () {
    setDebugModeOverrideForTests(true);
    enableAcpRuntimePerformanceProfiler();
    startAcpRuntimeProfile({
      requestId: "run-publication-labels",
      displayMode: "boundary",
      transport: "websocket",
      zoteroMajor: 9,
    });
    incrementAcpRuntimeMetric(
      "run-publication-labels",
      "panel_materialization",
      {
        publicationKind: "transcript",
        publicationSurface: "acp-skills",
        publicationForm: "delta",
        materializationSource: "transcript-page",
      },
    );
    const metric = snapshotAcpRuntimeProfiles()?.active[0].metrics.find(
      (entry) => entry.name === "panel_materialization",
    );
    assert.deepInclude(metric?.labels, {
      publicationKind: "transcript",
      publicationSurface: "acp-skills",
      publicationForm: "delta",
      materializationSource: "transcript-page",
    });
  });

  it("does not create lifecycle identities from acknowledgements without an in-window post", function () {
    setDebugModeOverrideForTests(true);
    enableAcpRuntimePerformanceProfiler();
    startAcpRuntimeProfile({
      requestId: "run-publication-window",
      displayMode: "boundary",
      transport: "unknown",
      zoteroMajor: 9,
    });
    const labels = {
      publicationId: "publication-before-window",
      publicationSurface: "acp-skills" as const,
      publicationKind: "transcript" as const,
      publicationForm: "delta" as const,
    };
    incrementAcpRuntimeMetric(
      "run-publication-window",
      "panel_child_apply",
      labels,
    );
    incrementAcpRuntimeMetric(
      "run-publication-window",
      "panel_render_ack",
      labels,
    );
    assert.deepEqual(
      snapshotAcpRuntimeProfiles()?.active[0].publicationLifecycles,
      [],
    );
    assert.isUndefined(
      snapshotAcpRuntimeProfiles()?.active[0].metrics.find(
        (entry) => entry.name === "panel_child_apply",
      ),
    );
    assert.isUndefined(
      snapshotAcpRuntimeProfiles()?.active[0].metrics.find(
        (entry) => entry.name === "panel_render_ack",
      ),
    );

    const postedLabels = {
      ...labels,
      publicationId: "publication-in-window",
    };
    incrementAcpRuntimeMetric(
      "run-publication-window",
      "panel_post",
      postedLabels,
    );
    incrementAcpRuntimeMetric(
      "run-publication-window",
      "panel_child_apply",
      postedLabels,
    );
    const lifecycle =
      snapshotAcpRuntimeProfiles()?.active[0].publicationLifecycles[0];
    assert.deepInclude(lifecycle, {
      publicationId: "publication-in-window",
      source: "acp-skills",
      kind: "transcript",
      publicationForm: "delta",
      post: 1,
      shellForward: 0,
      childApply: 0,
      renderAck: 0,
    });
  });

  it("records bounded incremental render work on an in-window publication", function () {
    setDebugModeOverrideForTests(true);
    enableAcpRuntimePerformanceProfiler();
    startAcpRuntimeProfile({
      requestId: "run-render-work",
      displayMode: "boundary",
      transport: "unknown",
      zoteroMajor: 9,
    });
    const labels = {
      publicationId: "publication-render-work",
      publicationSurface: "acp-chat" as const,
      publicationKind: "transcript" as const,
      publicationForm: "delta" as const,
      renderPath: "incremental" as const,
    };
    incrementAcpRuntimeMetric("run-render-work", "panel_post", labels);
    incrementAcpRuntimeMetric(
      "run-render-work",
      "panel_render_inserted_rows",
      labels,
      2,
    );
    incrementAcpRuntimeMetric(
      "run-render-work",
      "panel_render_measured_rows",
      labels,
      1,
    );

    const metrics = snapshotAcpRuntimeProfiles()?.active[0].metrics || [];
    assert.equal(
      metrics.find((entry) => entry.name === "panel_render_inserted_rows")
        ?.counter?.total,
      2,
    );
    assert.deepInclude(
      metrics.find((entry) => entry.name === "panel_render_measured_rows")
        ?.labels,
      { renderPath: "incremental" },
    );
  });

  it("keeps lifecycle correctness after metric series overflow", function () {
    setDebugModeOverrideForTests(true);
    enableAcpRuntimePerformanceProfiler();
    startAcpRuntimeProfile({
      requestId: "run-series-overflow",
      displayMode: "boundary",
      transport: "unknown",
      zoteroMajor: 9,
    });
    for (let index = 0; index < 140; index += 1) {
      incrementAcpRuntimeMetric("run-series-overflow", "semantic_event", {
        semanticKind: `kind-${index}`,
      });
    }
    incrementAcpRuntimeMetric("run-series-overflow", "panel_post", {
      publicationId: "publication-after-cap",
      publicationSurface: "acp-chat",
      publicationKind: "transcript",
      publicationForm: "delta",
      publicationCause: "steady-state",
      publicationDeliverySequence: "7",
    });
    const profile = snapshotAcpRuntimeProfiles()?.active[0];
    assert.isAbove(profile?.metricSeriesDrops || 0, 0);
    assert.equal(profile?.measurement, "incomplete");
    assert.deepInclude(profile?.publicationLifecycles[0], {
      publicationId: "publication-after-cap",
      deliverySequence: 7,
      post: 1,
    });
  });

  it("records rejected and out-of-window ACKs with first terminal wins", function () {
    setDebugModeOverrideForTests(true);
    enableAcpRuntimePerformanceProfiler();
    startAcpRuntimeProfile({
      requestId: "run-ack-ledger",
      displayMode: "boundary",
      transport: "unknown",
      zoteroMajor: 9,
    });
    recordAcpRuntimePublicationAck("run-ack-ledger", {
      publicationId: "before-window",
      stage: "child-apply",
      outcome: "rejected",
      reason: "invalid",
    });
    incrementAcpRuntimeMetric("run-ack-ledger", "panel_post", {
      publicationId: "publication-1",
      publicationSurface: "acp-skills",
      publicationKind: "owner-presentation",
      publicationForm: "region",
      publicationCause: "steady-state",
      publicationDeliverySequence: "9",
    });
    recordAcpRuntimePublicationAck("run-ack-ledger", {
      publicationId: "publication-1",
      stage: "child-apply",
      outcome: "rejected",
      reason: "render-failed",
    });
    recordAcpRuntimePublicationAck("run-ack-ledger", {
      publicationId: "publication-1",
      stage: "render-complete",
      outcome: "accepted",
      reason: null,
    });
    const profile = snapshotAcpRuntimeProfiles()?.active[0];
    assert.deepInclude(profile?.publicationDiagnostics[0], {
      code: "out-of-window-ack",
      publicationId: "before-window",
      outcome: "rejected",
    });
    assert.deepEqual(profile?.publicationLifecycles[0].terminal, {
      outcome: "rejected",
      reason: "render-failed",
      atMs: profile?.publicationLifecycles[0].terminal?.atMs,
    });
    assert.equal(profile?.publicationLifecycles[0].renderAck, 0);
  });

  it("rejects alias collisions between active profiles", function () {
    setDebugModeOverrideForTests(true);
    enableAcpRuntimePerformanceProfiler();
    for (const requestId of ["root-a", "root-b"]) {
      startAcpRuntimeProfile({
        requestId,
        displayMode: "live",
        transport: "unknown",
        zoteroMajor: 9,
      });
    }
    assert.isTrue(registerAcpRuntimeProfileAlias("root-a", "child"));
    assert.isFalse(registerAcpRuntimeProfileAlias("root-b", "child"));
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
    assert.equal(
      snapshotAcpRuntimeProfiles()?.active[0].metrics.find(
        (entry) => entry.name === "event_loop_drift",
      )?.duration?.maxMs,
      51,
    );

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

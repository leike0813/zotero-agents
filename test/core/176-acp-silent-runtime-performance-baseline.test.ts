import { assert } from "chai";
import {
  ACP_RUNTIME_BASELINE_SURFACE_STATES,
  resetAcpSilentRuntimeBaseline,
  runAcpSilentRuntimeBaseline,
  runAcpSilentRuntimeBaselineMatrix,
} from "../helpers/acpRuntimePerformanceHarness";

describe("ACP silent runtime performance baseline", function () {
  afterEach(async function () {
    await resetAcpSilentRuntimeBaseline();
  });

  it("produces a deterministic bounded aggregate for every surface state", async function () {
    const baselines = await runAcpSilentRuntimeBaselineMatrix();
    assert.deepEqual(
      baselines.map((baseline) => baseline.surfaceState),
      ACP_RUNTIME_BASELINE_SURFACE_STATES,
    );

    for (const baseline of baselines) {
      const profile = baseline.snapshot.completed[0];
      const metric = (name: string) =>
        profile.metrics.find((entry) => entry.name === name);
      assert.equal(profile.requestId, baseline.requestId);
      assert.equal(profile.displayMode, "silent");
      assert.equal(metric("jsonrpc_message")?.counter?.total, 1_000);
      assert.equal(metric("run_persist")?.counter?.total, 51);
      assert.equal(metric("run_persist_duration")?.duration?.count, 51);
      assert.isAbove(metric("host_input_bytes")?.counter?.total || 0, 0);
      assert.equal(metric("host_input_fragment")?.counter?.total, 2);
      assert.equal(metric("host_request_duration")?.duration?.count, 1);
      assert.equal(metric("buffered_write_batch")?.counter?.total, 1);
      assert.equal(metric("buffered_write_bytes")?.counter?.total, 64);
      assert.isAtMost(
        profile.metrics.length,
        baseline.snapshot.limits.metricSeriesPerProfile,
      );
      assert.notProperty(profile, "samples");
      assert.equal(baseline.record.capture.surfaceState, baseline.surfaceState);
      assert.equal(baseline.record.capture.measurement, "mechanism");
      assert.notProperty(baseline.record, "profilerSnapshot");
    }

    const bySurface = new Map(
      baselines.map((baseline) => [baseline.surfaceState, baseline]),
    );
    const r3 = (
      surface: (typeof ACP_RUNTIME_BASELINE_SURFACE_STATES)[number],
    ) =>
      bySurface
        .get(surface)!
        .record.summary.groups.find((group) => group.key === "R3")!;
    assert.deepInclude(r3("closed"), {
      counters: 0,
      bytes: 0,
      durations: 0,
    });
    assert.deepEqual(r3("closed").metrics, []);
    for (const surface of ["open-inactive", "acp-active"] as const) {
      assert.equal(
        r3(surface).metrics.find((metric) => metric.name === "panel_prepare")
          ?.counter,
        2,
      );
      assert.equal(
        r3(surface).metrics.find((metric) => metric.name === "panel_prepare")
          ?.labels.surfaceState,
        surface,
      );
    }
  });

  it("records production seams when the privileged host has no performance global", async function () {
    const performanceDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "performance",
    );
    Object.defineProperty(globalThis, "performance", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    try {
      const baseline = await runAcpSilentRuntimeBaseline({
        updateCount: 20,
        surfaceState: "acp-active",
      });
      const metricNames = baseline.snapshot.completed[0].metrics.map(
        (metric) => metric.name,
      );

      assert.includeMembers(metricNames, [
        "run_persist_duration",
        "state_store_write_duration",
        "host_request_duration",
        "panel_prepare_duration",
        "panel_signature_duration",
        "panel_post_duration",
        "buffered_write_duration",
      ]);
    } finally {
      if (performanceDescriptor) {
        Object.defineProperty(globalThis, "performance", performanceDescriptor);
      } else {
        delete (globalThis as { performance?: unknown }).performance;
      }
    }
  });
});

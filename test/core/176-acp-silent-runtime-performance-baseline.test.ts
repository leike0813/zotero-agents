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
      const persistedDuration = baseline.record.summary.groups
        .find((group) => group.key === "R1")!
        .metrics.find((entry) => entry.name === "run_persist_duration");
      assert.equal(persistedDuration?.durationCount, 51);
      assert.isAtLeast(persistedDuration?.durationTotalMs || 0, 0);
      assert.isAtLeast(persistedDuration?.durationMaxMs || 0, 0);
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
    const inactiveProfile =
      bySurface.get("open-inactive")!.snapshot.completed[0];
    assert.equal(
      r3("open-inactive").metrics.find(
        (metric) => metric.name === "panel_requested",
      )?.counter,
      2,
    );
    assert.equal(
      r3("open-inactive").metrics.find(
        (metric) => metric.name === "panel_dropped_before_build",
      )?.counter,
      2,
    );
    assert.equal(
      r3("open-inactive").metrics.find(
        (metric) => metric.name === "panel_dropped_before_build",
      )?.labels.publicationCausality,
      "opposite-active",
    );
    assert.isUndefined(
      r3("open-inactive").metrics.find(
        (metric) => metric.name === "panel_prepare",
      ),
    );
    assert.deepEqual(inactiveProfile.publicationLifecycles, []);

    {
      const surface = "acp-active" as const;
      const profile = bySurface.get(surface)!.snapshot.completed[0];
      assert.equal(
        r3(surface).metrics.find((metric) => metric.name === "panel_prepare")
          ?.counter,
        1,
      );
      assert.equal(
        r3(surface).metrics.find((metric) => metric.name === "panel_prepare")
          ?.labels.publicationSurface,
        "acp-skills",
      );
      assert.isAbove(
        r3(surface).metrics.find((metric) => metric.name === "panel_post_bytes")
          ?.bytes || 0,
        0,
      );
      assert.lengthOf(
        profile.metrics.filter((metric) => metric.name === "panel_post"),
        3,
        "bounded region kinds may create series, publication identity must not",
      );
      for (const metric of profile.metrics.filter(
        (entry) => entry.name === "panel_post",
      )) {
        assert.notProperty(metric.labels, "publicationId");
        assert.notProperty(metric.labels, "publicationDeliverySequence");
      }
      assert.lengthOf(profile.publicationLifecycles || [], 4);
      assert.isTrue(
        (profile.publicationLifecycles || []).every(
          (entry) =>
            entry.post === 1 &&
            entry.shellForward === 1 &&
            entry.childApply === 1 &&
            entry.renderAck === 1 &&
            entry.terminal?.outcome === "accepted",
        ),
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

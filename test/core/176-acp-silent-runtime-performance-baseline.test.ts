import { assert } from "chai";
import {
  resetAcpSilentRuntimeBaseline,
  runAcpSilentRuntimeBaseline,
} from "../helpers/acpRuntimePerformanceHarness";

describe("ACP silent runtime performance baseline", function () {
  afterEach(function () {
    resetAcpSilentRuntimeBaseline();
  });

  it("produces a deterministic bounded aggregate for a 1000-update burst", function () {
    const baseline = runAcpSilentRuntimeBaseline();
    const profile = baseline.snapshot.completed[0];
    const metric = (name: string) =>
      profile.metrics.find((entry) => entry.name === name);

    assert.equal(profile.requestId, baseline.requestId);
    assert.equal(profile.displayMode, "silent");
    assert.equal(metric("jsonrpc_message")?.counter?.total, 1_000);
    assert.equal(metric("session_update")?.counter?.total, 1_000);
    assert.equal(metric("change_requested")?.counter?.total, 1_000);
    assert.equal(metric("run_persist")?.counter?.total, 50);
    assert.deepInclude(metric("run_persist_duration")?.duration, {
      count: 50,
      totalMs: 200,
      maxMs: 4,
    });
    assert.deepEqual(metric("transport_queue_entries")?.gauge, {
      current: 7,
      max: 7,
    });
    assert.isAtMost(
      profile.metrics.length,
      baseline.snapshot.limits.metricSeriesPerProfile,
    );
    assert.notProperty(profile, "samples");
  });
});

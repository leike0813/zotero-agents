import { assert } from "chai";
import {
  nearestRank,
  summarizeSynthesisProductionRouteOperation,
  type SynthesisProductionRoutePerformanceSample,
} from "../../scripts/check-synthesis-production-route-performance";

function sample(
  overrides: Partial<SynthesisProductionRoutePerformanceSample> = {},
): SynthesisProductionRoutePerformanceSample {
  return {
    ok: true,
    errorCode: null,
    durationMs: 10,
    acceptanceLatencyMs: null,
    terminalLatencyMs: null,
    requestBytes: 100,
    responseBytes: 200,
    sqlQueryCount: 2,
    sqlWriteCount: 0,
    hostCallCount: 0,
    itemPageCalls: 0,
    artifactPageCalls: 0,
    artifactReadCalls: 0,
    effectCallCount: 0,
    effectBatchSizes: [],
    returnedCount: 1,
    structuredDegraded: false,
    rssBytes: 1024,
    rssSupported: true,
    ...overrides,
  };
}

describe("Synthesis production-route performance report", function () {
  it("uses nearest-rank percentiles without interpolation", function () {
    const values = [11, 1, 8, 4, 10, 2, 9, 3, 7, 5, 6];
    assert.equal(nearestRank(values, 50), 6);
    assert.equal(nearestRank(values, 95), 11);
    assert.isNull(nearestRank([], 50));
  });

  it("rejects vacuous read evidence and read-side writes", function () {
    for (const operation of [
      "topic-page",
      "index",
      "graph-slice",
      "graph-metrics",
    ] as const) {
      const empty = summarizeSynthesisProductionRouteOperation(
        "10k",
        operation,
        [sample({ returnedCount: 0 })],
      );
      assert.include(empty.failures, "empty_result");
    }

    const writingRead = summarizeSynthesisProductionRouteOperation(
      "10k",
      "topic-page",
      [sample({ sqlWriteCount: 1 })],
    );
    assert.include(writingRead.failures, "read_performed_sql_write");
  });

  it("requires structured degradation for an empty 25k read", function () {
    const missing = summarizeSynthesisProductionRouteOperation(
      "25k",
      "graph-slice",
      [sample({ returnedCount: 0 })],
    );
    assert.include(missing.failures, "bounded_result_or_degraded_missing");

    const degraded = summarizeSynthesisProductionRouteOperation(
      "25k",
      "graph-slice",
      [sample({ returnedCount: 0, structuredDegraded: true })],
    );
    assert.notInclude(degraded.failures, "bounded_result_or_degraded_missing");
    assert.notInclude(degraded.failures, "empty_result");
  });

  it("requires SQL write observations and Linux RSS for governed reads", function () {
    const missingWrite = summarizeSynthesisProductionRouteOperation(
      "10k",
      "topic-page",
      [sample({ sqlWriteCount: null })],
    );
    assert.include(missingWrite.failures, "sql_write_count_missing");

    const unsupportedRss = summarizeSynthesisProductionRouteOperation(
      "10k",
      "topic-page",
      [sample({ rssBytes: null, rssSupported: false })],
    );
    if (process.platform === "linux") {
      assert.include(unsupportedRss.failures, "rss_observation_missing");
    }
  });
});

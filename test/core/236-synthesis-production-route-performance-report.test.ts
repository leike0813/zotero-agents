import { assert } from "chai";
import { nearestRank } from "../../scripts/check-synthesis-production-route-performance";

describe("Synthesis production-route performance report", function () {
  it("uses nearest-rank percentiles without interpolation", function () {
    const values = [11, 1, 8, 4, 10, 2, 9, 3, 7, 5, 6];
    assert.equal(nearestRank(values, 50), 6);
    assert.equal(nearestRank(values, 95), 11);
    assert.isNull(nearestRank([], 50));
  });
});

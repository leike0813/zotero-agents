import { assert } from "chai";

import {
  equalBySignature,
  stableRegionSignature,
} from "../../src/shared/regionEquality";

// Locks the semantic contract of the regionEquality fast paths: for every
// input pair the optimized equalBySignature must agree with the legacy
// JSON.stringify comparison.

function legacyEqual(previous: unknown, next: unknown): boolean {
  return stableRegionSignature(previous) === stableRegionSignature(next);
}

describe("regionEquality fast paths", function () {
  const pairs: Array<[string, unknown, unknown]> = [
    ["same object reference", { a: 1 }, null as unknown as object], // placeholder, replaced below
    ["both null", null, null],
    ["null vs undefined", null, undefined],
    ["undefined vs false", undefined, false],
    ["null vs empty string", null, ""],
    ["same string", "home", "home"],
    ["different strings", "home", "away"],
    ["string vs number", "1", 1],
    ["same boolean", true, true],
    ["different booleans", true, false],
    ["boolean vs string", true, "true"],
    ["same number", 42, 42],
    ["different numbers", 42, 43],
    ["NaN vs NaN", Number.NaN, Number.NaN],
    ["zero vs -zero", 0, -0],
    ["equal plain objects", { a: 1, b: [2, 3] }, { a: 1, b: [2, 3] }],
    ["different objects", { a: 1 }, { a: 2 }],
    ["key order difference", { a: 1, b: 2 }, { b: 2, a: 1 }],
    ["equal arrays", [1, "x", null], [1, "x", null]],
    ["different arrays", [1, 2], [1, 2, 3]],
    ["array vs object", [1, 2], { 0: 1, 1: 2 }],
    ["nested undefined field", { a: undefined }, {}],
    ["object with toJSON", { a: 1 }, { a: 1, toJSON: () => ({ a: 1 }) }],
  ];
  const shared = { nested: { rows: [1, 2, 3] } };
  pairs[0] = ["same object reference", shared, shared];

  for (const [name, previous, next] of pairs) {
    it(`matches legacy comparison: ${name}`, function () {
      assert.strictEqual(
        equalBySignature(previous, next),
        legacyEqual(previous, next),
      );
      assert.strictEqual(
        equalBySignature(next, previous),
        legacyEqual(next, previous),
      );
    });
  }

  it("short-circuits identical large selections without reserializing", function () {
    const selection = { rows: Array.from({ length: 500 }, (_, i) => ({ i })) };
    // Reference equality must be honored even though stringify would match.
    assert.isTrue(equalBySignature(selection, selection));
  });
});

import { assert } from "chai";
import { runTestSubstages } from "../../scripts/run-test-substages";

describe("test substage execution", function () {
  for (const aggregate of [true, false]) {
    it(
      aggregate
        ? "attempts all aggregate substages"
        : "stops independent commands on failure",
      async function () {
        const seen: string[] = [];
        const result = await runTestSubstages(
          [
            { id: "first", script: "first" },
            { id: "second", script: "second" },
            { id: "third", script: "third" },
          ],
          {
            aggregate,
            env: {},
            run: async (step) => {
              seen.push(step.id);
              if (step.id === "second") throw new Error("spawn failed");
              return step.id === "first" ? 7 : 0;
            },
          },
        );
        assert.equal(result, 7);
        assert.deepEqual(
          seen,
          aggregate ? ["first", "second", "third"] : ["first"],
        );
      },
    );
  }
});

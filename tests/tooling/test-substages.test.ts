import { assert } from "chai";
import { runTestSubstages } from "../../scripts/run-test-substages";
import { runBoundedTests } from "../../scripts/test-scheduler";
import { mergeNativeEvidence } from "../../scripts/run-node-test-shards";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

describe("test substage execution", function () {
  it("drains other workers before propagating an unexpected runner error", async function () {
    const seen: number[] = [];
    const failure = new Error("report unavailable");
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let settled = false;
    const result = runBoundedTests([0, 1, 2], 2, async (value) => {
      if (value === 0) throw failure;
      await pending;
      seen.push(value);
      return value;
    }).then(
      () => {
        settled = true;
      },
      (error) => {
        settled = true;
        return error;
      },
    );
    await new Promise((resolve) => setImmediate(resolve));
    const premature = settled;
    release();
    assert.strictEqual(await result, failure);
    assert.isFalse(premature);
    assert.deepEqual(seen, [1, 2]);
  });
  it("merges only new evidence from a verified native worker", async function () {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "native-evidence-merge-"),
    );
    const worker = path.join(root, "worker");
    const parent = path.join(root, "parent");
    await mkdir(path.join(worker, "execution"), { recursive: true });
    await mkdir(path.join(parent, "execution"), { recursive: true });
    await writeFile(
      path.join(worker, "execution", "identity.jsonl"),
      "inherited\nnew\n",
    );
    await writeFile(
      path.join(worker, "execution", "other.jsonl"),
      "unverified\n",
    );
    await writeFile(
      path.join(parent, "execution", "identity.jsonl"),
      "inherited\n",
    );
    let failed = false;
    try {
      await mergeNativeEvidence(worker, parent, {});
    } catch {
      failed = true;
    }
    assert.isTrue(failed);
    await writeFile(
      path.join(worker, "verified.json"),
      JSON.stringify({ identity: "identity" }),
    );
    await mergeNativeEvidence(worker, parent, {
      [path.join("execution", "identity.jsonl")]: 10,
    });
    assert.equal(
      await readFile(path.join(parent, "execution", "identity.jsonl"), "utf8"),
      "inherited\nnew\n",
    );
    const { readdir } = await import("node:fs/promises");
    assert.deepEqual(await readdir(path.join(parent, "execution")), [
      "identity.jsonl",
    ]);
  });
  it("bounds concurrent work and retains inventory order after failures", async function () {
    let active = 0;
    let maximum = 0;
    const results = await runBoundedTests([0, 1, 2, 3], 2, async (value) => {
      maximum = Math.max(maximum, ++active);
      await new Promise((resolve) => setTimeout(resolve, value === 0 ? 20 : 1));
      active--;
      return value === 1 ? 9 : 0;
    });
    assert.equal(maximum, 2);
    assert.deepEqual(results, [0, 9, 0, 0]);
  });
  it("does not dispatch more work after cancellation", async function () {
    const controller = new AbortController();
    const seen: number[] = [];
    const results = await runBoundedTests(
      [0, 1, 2],
      1,
      async (value) => {
        seen.push(value);
        controller.abort();
        return 130;
      },
      controller.signal,
    );
    assert.deepEqual(seen, [0]);
    assert.equal(results[0], 130);
    assert.isUndefined(results[1]);
  });
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

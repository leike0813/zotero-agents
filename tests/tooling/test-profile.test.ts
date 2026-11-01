import { assert } from "chai";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  profileSpan,
  summarizeProfileSpans,
  writeTestProfile,
} from "../../scripts/test-profile";
import { runLoggedProcess } from "../../scripts/test-run-report";

describe("test performance evidence", function () {
  it("retains valid evidence when a process leaves a truncated report", async function () {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const root = await mkdtemp(path.join(os.tmpdir(), "profile-incomplete-"));
    await mkdir(path.join(root, "results"));
    await writeFile(
      path.join(root, "results", "interrupted.mocha.json"),
      '{"stats":',
    );
    await writeFile(
      path.join(root, "results", "complete.mocha.json"),
      JSON.stringify({ stats: { passes: 1 }, tests: [{ title: "ok" }] }),
    );
    writeTestProfile(root);
    const report = JSON.parse(
      await readFile(path.join(root, "profile.json"), "utf8"),
    );
    assert.include(report.incompleteFiles, "interrupted.mocha.json");
    assert.lengthOf(report.inventory, 1);
  });
  it("keeps body, hook failure and duplicate titles as separate observations", async function () {
    const { writeFile, readdir } = await import("node:fs/promises");
    const root = await mkdtemp(path.join(os.tmpdir(), "profile-reporter-"));
    const fixture = path.join(root, "fixture.cjs");
    await writeFile(
      fixture,
      `describe('suite',()=>{beforeEach(async()=>{await new Promise(r=>setTimeout(r,20))});it('same',()=>{});it('same',()=>{});it.skip('pending',()=>{})});describe('broken',()=>{before(()=>{throw Error('hook')});it('unreached',()=>{})});`,
    );
    const result = await runLoggedProcess(
      process.execPath,
      [
        "node_modules/mocha/bin/mocha.js",
        fixture,
        "--reporter",
        path.resolve("scripts/test-profile-reporter.cjs"),
        "--reporter-option",
        `output=${path.join(root, "mocha.json")}`,
      ],
      {
        log: path.join(root, "log"),
        env: { ...process.env, ZOTERO_TEST_PROFILE_DIR: root },
      },
    );
    assert.notEqual(result.exitCode, 0);
    const records = (
      await Promise.all(
        (await readdir(path.join(root, "profile"))).map((name) =>
          readFile(path.join(root, "profile", name), "utf8"),
        ),
      )
    )
      .join("\n")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.lengthOf(
      records.filter((row) => row.kind === "test" && row.name === "suite same"),
      2,
    );
    assert.isTrue(
      records.some((row) => row.kind === "hook" && row.status === "failed"),
    );
    assert.isTrue(
      records.some((row) => row.kind === "hook" && row.durationMs >= 10),
    );
    assert.isTrue(
      records.some((row) => row.kind === "test" && row.status === "pending"),
    );
  });
  it("does not double count nested or overlapping spans", function () {
    const summary = summarizeProfileSpans([
      { name: "outer", startMs: 0, durationMs: 100 },
      { name: "inner", startMs: 10, durationMs: 40 },
      { name: "parallel", startMs: 80, durationMs: 50 },
    ]);
    assert.equal(summary.coveredMs, 130);
    assert.equal(summary.totalWorkMs, 190);
  });

  it("records failed work without replacing its error", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "test-profile-"));
    const previous = process.env.ZOTERO_TEST_PROFILE_DIR;
    process.env.ZOTERO_TEST_PROFILE_DIR = root;
    const failure = new Error("fixture failure");
    try {
      let caught: unknown;
      try {
        await profileSpan("fixture", async () => {
          throw failure;
        });
      } catch (error) {
        caught = error;
      }
      assert.strictEqual(caught, failure);
      const { readdir } = await import("node:fs/promises");
      const files = await readdir(path.join(root, "profile"));
      const records = (
        await readFile(path.join(root, "profile", files[0]), "utf8")
      )
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      assert.equal(records[0].status, "failed");
      assert.isAtLeast(records[0].durationMs, 0);
    } finally {
      if (previous === undefined) delete process.env.ZOTERO_TEST_PROFILE_DIR;
      else process.env.ZOTERO_TEST_PROFILE_DIR = previous;
    }
  });
});

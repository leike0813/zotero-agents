import { assert } from "chai";
import { mkdtemp, readFile, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  TestRunReport,
  runLoggedProcess,
  readMochaReport,
} from "../../scripts/test-run-report";

describe("test run reports", function () {
  it("keeps full child diagnostics on disk and excludes them from the chart", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "test-report-"));
    const report = await TestRunReport.create(root);
    const log = path.join(report.directory, "logs", "probe.log");
    const result = await runLoggedProcess(
      process.execPath,
      [
        "-e",
        'process.stdout.write("中文" + "x".repeat(200000)); process.stderr.write("SECRET_FAILURE"); process.exitCode=7',
      ],
      { log, env: process.env },
    );
    assert.equal(result.exitCode, 7);
    assert.include(await readFile(log, "utf8"), "中文");
    assert.include(await readFile(log, "utf8"), "SECRET_FAILURE");
    await report.record({
      id: "probe",
      label: "Probe",
      exitCode: 7,
      durationMs: 12,
      log,
      command: "node probe",
      status: "failed",
    });
    await report.finish(7);
    assert.notInclude(report.chart(), "SECRET_FAILURE");
    assert.include(
      await readFile(path.join(report.directory, "failures.md"), "utf8"),
      "SECRET_FAILURE",
    );
    const summary = JSON.parse(
      await readFile(path.join(report.directory, "summary.json"), "utf8"),
    );
    assert.equal(summary.exitCode, 7);
    assert.equal(summary.stages[0].status, "failed");
  });

  it("runs in the requested working directory", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "test-cwd-"));
    const log = path.join(root, "cwd.log");
    const result = await runLoggedProcess(
      process.execPath,
      ["-e", "process.stdout.write(process.cwd())"],
      { log, env: process.env, cwd: root },
    );
    assert.equal(result.exitCode, 0);
    assert.equal(await readFile(log, "utf8"), await realpath(root));
  });

  it("records spawn failure without pretending tests passed", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "test-spawn-"));
    const log = path.join(root, "spawn.log");
    const result = await runLoggedProcess(
      path.join(root, "missing-command"),
      [],
      { log, env: process.env },
    );
    assert.equal(result.exitCode, 1);
    assert.include(await readFile(log, "utf8"), "ENOENT");
  });

  it("rejects unwritable report destinations instead of discarding diagnostics", async function () {
    const { writeFile } = await import("node:fs/promises");
    const root = await mkdtemp(path.join(os.tmpdir(), "test-report-io-"));
    const blocked = path.join(root, "file");
    await writeFile(blocked, "not a directory");
    let caught: unknown;
    try {
      await TestRunReport.create(blocked);
    } catch (error) {
      caught = error;
    }
    assert.instanceOf(caught, Error);
    assert.equal(await readFile(blocked, "utf8"), "not a directory");
  });

  it("stops a running child on cancellation and preserves partial output", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "test-cancel-"));
    const log = path.join(root, "cancel.log");
    const controller = new AbortController();
    const running = runLoggedProcess(
      process.execPath,
      ["-e", 'process.stdout.write("started");setInterval(()=>{},1000)'],
      { log, env: process.env, signal: controller.signal },
    );
    const deadline = Date.now() + 3000;
    while (!(await readFile(log, "utf8").catch(() => "")).includes("started")) {
      if (Date.now() > deadline) {
        controller.abort();
        throw new Error("child did not start");
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    controller.abort();
    assert.equal((await running).exitCode, 130);
    assert.include(await readFile(log, "utf8"), "started");
  });

  it("collects all real Mocha failures including hooks", async function () {
    const { writeFile } = await import("node:fs/promises");
    const root = await mkdtemp(path.join(os.tmpdir(), "test-mocha-report-"));
    const fixture = path.join(root, "failures.cjs");
    await writeFile(
      fixture,
      'const assert = require("node:assert/strict"); describe("suite",()=>{it("first",()=>assert.equal(1,2));it("second",()=>{throw new Error("second error")})});describe("hook",()=>{before(()=>{throw new Error("hook error")});it("unreachable",()=>{})});',
    );
    const output = path.join(root, "mocha.json");
    const run = await runLoggedProcess(
      process.execPath,
      [
        "node_modules/mocha/bin/mocha.js",
        fixture,
        "--reporter",
        "json",
        "--reporter-option",
        `output=${output}`,
      ],
      { log: path.join(root, "mocha.log"), env: process.env },
    );
    assert.notEqual(run.exitCode, 0);
    const report = await readMochaReport(output);
    assert.equal(report.failures.length, 3);
    assert.equal(report.counts.failed, 3);
    assert.include(report.failures[0].stack, "AssertionError");
    assert.equal(report.failures[0].expected, 2);
  });
});

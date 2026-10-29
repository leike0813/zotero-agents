import { assert } from "chai";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import Mocha from "mocha";
import {
  readZoteroTestReport,
  resolveZoteroTestReportTarget,
  startZoteroTestReportSink,
} from "../../scripts/zotero-test-report";
import { patchZoteroTestRunnerHtml } from "../../scripts/patch-zotero-test-runner";

const SAMPLE_RUNNER_HTML = String.raw`<!DOCTYPE html>
<html>
<body>
<div id="mocha"></div>
<script>
async function send(data) {
  const req = await Zotero.HTTP.request(
    "POST",
    "http://localhost:4967/update",
    {
      body: JSON.stringify(data),
    }
  );

  if (req.status !== 200) {
    dump("Error sending data to server" + req.responseText);
    return null;
  } else {
    const result = JSON.parse(req.responseText);
    return result;
  }
}

window.debug = function (data) {
  send({ type: "debug", data });
};

function Reporter(runner) {
  function indent() {
    return "  ".repeat(indents);
  }

  function dump(str) {
    document.querySelector("#mocha").innerText += str;
  }

  runner.on("pass", async function (test) {
    passed++;
    dump(indent() + test.title + "\n");
    await send({ type: "pass", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, indents: indents + 1 } });
  });

  runner.on("fail", async function (test, error) {
    failed++;
    dump(indent() + test.title + "\n");
    await send({ type: "fail", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, error, indents: indents + 1 } });
  });

  runner.on("end", async function () {
    dump(passed + "/" + (passed + failed) + " tests passed\n");
    await send({
      type: "end",
      data: { passed: passed, failed: failed, aborted: aborted, str, indents },
    });
  });
}
</script>
</body>
</html>`;

function extractRunnerScript(html: string) {
  return html
    .split("<script>")[1]
    .split("</script>")[0]
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

type RunnerRun = {
  mainEvents: any[];
  reportEvents: any[];
  prefs: Array<[string, string]>;
};

async function runPatchedRunner(options: {
  html: string;
  reportUrl: string;
  reportStatus?: number;
  tests: Array<{ title: string; run: () => void }>;
}): Promise<RunnerRun> {
  const mainEvents: any[] = [];
  const reportEvents: any[] = [];
  const prefs: Array<[string, string]> = [];
  let resolveEnded!: () => void;
  const ended = new Promise<void>((resolve) => {
    resolveEnded = resolve;
  });

  const root = new Mocha.Suite("", new Mocha.Context());
  const runner = new Mocha.Runner(root);
  for (const entry of options.tests) {
    root.addTest(new Mocha.Test(entry.title, entry.run));
  }

  const context = vm.createContext({
    Services: {
      prefs: {
        setStringPref(key: string, value: string) {
          prefs.push([key, value]);
        },
      },
    },
    Zotero: {
      HTTP: {
        request: async (method: string, url: string, requestOptions: any) => {
          const event = JSON.parse(requestOptions.body);
          if (url === options.reportUrl) {
            reportEvents.push(event);
            if (options.reportStatus === undefined) {
              const response = await fetch(url, {
                method,
                body: requestOptions.body,
              });
              return { status: response.status, responseText: "{}" };
            }
            return {
              status: options.reportStatus ?? 200,
              responseText: "{}",
            };
          }
          mainEvents.push(event);
          if (event.type === "end") resolveEnded();
          return { status: 200, responseText: "{}" };
        },
      },
    },
    window: {},
    document: {
      querySelector: () => ({ appendChild() {} }),
      createTextNode: () => ({ appendData() {} }),
    },
    console,
    indents: 0,
    passed: 0,
    failed: 0,
    aborted: false,
    str: "",
  });

  const patched = patchZoteroTestRunnerHtml(options.html, {
    reportEventUrl: options.reportUrl,
  });
  vm.runInContext(extractRunnerScript(patched), context);
  vm.runInContext(
    "new Reporter(actualRunner)",
    Object.assign(context, { actualRunner: runner }),
  );
  await new Promise<void>((resolve) => runner.run(() => resolve()));
  await Promise.race([
    ended,
    new Promise<void>((_, reject) => {
      const timer = setTimeout(
        () => reject(new Error("reporter did not end")),
        2000,
      );
      timer.unref();
    }),
  ]);
  return { mainEvents, reportEvents, prefs };
}

describe("zotero test report", function () {
  it("resolves the report target only from an explicit environment", function () {
    assert.isUndefined(resolveZoteroTestReportTarget({}));
    assert.deepEqual(
      resolveZoteroTestReportTarget({
        ZOTERO_TEST_REPORT_DIR: "/tmp/report-root",
        ZOTERO_TEST_REPORT_SCOPE: "zotero-core",
      }),
      { dir: path.resolve("/tmp/report-root"), scope: "zotero-core" },
    );
    assert.throws(
      () =>
        resolveZoteroTestReportTarget({
          ZOTERO_TEST_REPORT_DIR: "/tmp/report-root",
        }),
      /incomplete/,
    );
    assert.throws(
      () =>
        resolveZoteroTestReportTarget({
          ZOTERO_TEST_REPORT_DIR: "/tmp/report-root",
          ZOTERO_TEST_REPORT_SCOPE: "../escape",
        }),
      /unsafe/,
    );
  });

  it("collects reporter events into the scoped jsonl evidence file", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "zotero-test-report-"));
    const sink = await startZoteroTestReportSink({
      dir: root,
      scope: "zotero-core",
    });
    try {
      const response = await fetch(sink.url, {
        method: "POST",
        body: JSON.stringify({ type: "start", data: { indents: 0 } }),
      });
      assert.equal(response.status, 200);
      await fetch(sink.url, {
        method: "POST",
        body: JSON.stringify({ type: "end", data: { passed: 0, failed: 0 } }),
      });
    } finally {
      await sink.close();
    }
    const file = path.join(root, "results", "zotero-core.events.jsonl");
    assert.equal(sink.filePath, file);
    const lines = (await readFile(file, "utf8")).trim().split("\n");
    assert.lengthOf(lines, 2);
    assert.equal(JSON.parse(lines[0]).type, "start");
    assert.equal(JSON.parse(lines[1]).type, "end");
  });

  it("fails the run when the evidence file cannot be written", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "zotero-test-report-"));
    const sink = await startZoteroTestReportSink({
      dir: root,
      scope: "zotero-core",
    });
    await mkdir(sink.filePath);
    const response = await fetch(sink.url, {
      method: "POST",
      body: JSON.stringify({ type: "start", data: {} }),
    });
    assert.equal(response.status, 500);
    let failure: unknown;
    try {
      await sink.close();
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, Error);
  });

  it("mirrors reporter events to an independent sink and reports failures", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "zotero-test-report-"));
    const sink = await startZoteroTestReportSink({
      dir: root,
      scope: "zotero-core",
    });
    let run: RunnerRun;
    try {
      run = await runPatchedRunner({
        html: SAMPLE_RUNNER_HTML,
        reportUrl: sink.url,
        tests: [
          { title: "passing case", run: () => undefined },
          {
            title: "failing case",
            run: () => {
              throw Object.assign(new Error("boom"), {
                expected: "wanted",
                actual: "received",
              });
            },
          },
        ],
      });
    } finally {
      await sink.close();
    }

    assert.isTrue(
      run.mainEvents.some((event) => event.type === "fail"),
      "the runner page still reports failures to its own sink",
    );
    assert.isFalse(
      run.prefs.some(([, value]) => value === sink.url),
      "the report url never reuses the System E2E preference",
    );

    const report = await readZoteroTestReport(sink.filePath);
    assert.isTrue(report.complete);
    assert.deepEqual(report.counts, { passed: 1, failed: 1, pending: 0 });
    assert.lengthOf(report.failures, 1);
    const [failure] = report.failures;
    assert.include(failure.title, "failing case");
    assert.equal(failure.message, "boom");
    assert.include(String(failure.stack), "boom");
    assert.equal(failure.expected, "wanted");
    assert.equal(failure.actual, "received");
  });

  it("keeps the runner delivery intact and marks the report incomplete when the sink rejects an event", async function () {
    const run = await runPatchedRunner({
      html: SAMPLE_RUNNER_HTML,
      reportUrl: "http://127.0.0.1:1/events",
      reportStatus: 500,
      tests: [
        { title: "passing case", run: () => undefined },
        {
          title: "failing case",
          run: () => {
            throw new Error("boom");
          },
        },
      ],
    });
    assert.isTrue(
      run.mainEvents.some((event) => event.type === "end"),
      "the runner page still finishes its own delivery",
    );
    const marked = run.reportEvents.filter(
      (event) => event.reportIncomplete === true,
    );
    assert.isTrue(marked.length > 0);
  });

  it("reads partial evidence without inflating a successful run", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "zotero-test-report-"));
    const file = path.join(root, "results", "zotero-core.events.jsonl");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(
      file,
      [
        JSON.stringify({ type: "start", data: {} }),
        JSON.stringify({ type: "pass", data: { title: "a" } }),
        JSON.stringify({
          type: "debug",
          data: {
            kind: "zotero-test-fail-detail",
            title: "case",
            fullTitle: "suite case",
            message: "first",
            stack: "stack first",
          },
        }),
        JSON.stringify({
          type: "debug",
          data: {
            kind: "zotero-test-fail-detail",
            title: "case",
            fullTitle: "suite case",
            message: "second",
            stack: "stack second",
          },
        }),
        JSON.stringify({
          type: "fail",
          data: { title: "case", fulltest: "suite case" },
        }),
        JSON.stringify({
          type: "fail",
          data: { title: "case", fulltest: "suite case" },
        }),
      ].join("\n") + "\n",
      "utf8",
    );
    const report = await readZoteroTestReport(file);
    assert.isFalse(
      report.complete,
      "a missing end event keeps the run incomplete",
    );
    assert.deepEqual(report.counts, { passed: 1, failed: 2, pending: 0 });
    assert.deepEqual(
      report.failures.map((failure) => failure.message),
      ["first", "second"],
      "repeated titles keep their own serialized error detail",
    );
  });

  it("keeps a fail detail whose fail event never arrived", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "zotero-test-report-"));
    const file = path.join(root, "results", "zotero-core.events.jsonl");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(
      file,
      [
        JSON.stringify({ type: "start", data: {} }),
        JSON.stringify({
          type: "debug",
          data: {
            kind: "zotero-test-fail-detail",
            title: "case",
            fullTitle: "suite case",
            message: "crashed",
          },
        }),
        JSON.stringify({
          type: "end",
          data: { passed: 0, failed: 1, aborted: false },
        }),
      ].join("\n") + "\n",
      "utf8",
    );
    const report = await readZoteroTestReport(file);
    assert.isFalse(report.complete);
    assert.lengthOf(report.failures, 1);
    assert.equal(report.failures[0].message, "crashed");
  });

  it("treats a missing evidence file as an incomplete run", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "zotero-test-report-"));
    const report = await readZoteroTestReport(
      path.join(root, "results", "absent.events.jsonl"),
    );
    assert.isFalse(report.complete);
    assert.lengthOf(report.failures, 0);
    assert.isUndefined(report.counts);
  });
});

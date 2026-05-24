import { assert } from "chai";
import { mkdtemp, mkdir, readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import {
  buildForwardedTestArgs,
  parseWrappedTestInvocation,
} from "../../../scripts/run-zotero-test-with-mock";
import {
  patchGeneratedZoteroTestRunner,
  patchZoteroTestRunnerHtml,
} from "../../../scripts/patch-zotero-test-runner";

const SAMPLE_HTML = `<!DOCTYPE html>
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
  function dump(str) {
    document.querySelector("#mocha").innerText += str;
  }

  runner.on("start", async function () {
    console.log("start")
    await send({ type: "start", data: { indents } });
  });

  runner.on("suite", async function (suite) {
    console.log("suite", suite)
    await send({ type: "suite", data: { title: suite.title, root: suite.root, indents } });
  });

  runner.on("suite end", async function (suite) {
    console.log("suite end", suite)
    await send({ type: "suite end", data: { title: suite.title, root: suite.root, indents } });
  });

  runner.on("pending", async function (test) {
    console.log("pending", test)
    await send({ type: "pending", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, indents: indents + 1 } });
  });

  runner.on("pass", async function (test) {
    console.log("pass", test)
    await send({ type: "pass", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, indents: indents + 1 } });
  });

  runner.on("fail", async function (test, error) {
    console.log("fail", test, error)
    await send({ type: "fail", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, error, indents: indents + 1 } });
  });

  runner.on("end", async function () {
    console.log("end")
    await send({
      type: "end",
      data: { passed: passed, failed: failed, aborted: aborted, str, indents },
    });
  });
}
</script>
</body>
</html>`;

describe("zotero test infrastructure helpers", function () {
  describe("wrapper forwarded args", function () {
    it("injects --no-watch by default for zotero test targets", function () {
      assert.deepEqual(buildForwardedTestArgs("test:zotero:cli", []), [
        "--no-watch",
      ]);
    });

    it("does not inject --no-watch when --watch is explicitly requested", function () {
      assert.deepEqual(buildForwardedTestArgs("test:zotero:cli", ["--watch"]), [
        "--watch",
      ]);
    });

    it("does not duplicate explicit exit flags for zotero test targets", function () {
      assert.deepEqual(
        buildForwardedTestArgs("test:zotero:cli", ["--exit-on-finish"]),
        ["--exit-on-finish"],
      );
      assert.deepEqual(
        buildForwardedTestArgs("test:zotero:cli", ["--no-watch"]),
        ["--no-watch"],
      );
    });

    it("injects Mocha exit for node test targets so wrapper cleanup can run", function () {
      assert.deepEqual(buildForwardedTestArgs("test:node:raw", []), [
        "--exit",
      ]);
      assert.deepEqual(buildForwardedTestArgs("test:node:raw:core", []), [
        "--exit",
      ]);
    });

    it("does not duplicate explicit Mocha exit flags for node test targets", function () {
      assert.deepEqual(buildForwardedTestArgs("test:node:raw", ["--exit"]), [
        "--exit",
      ]);
      assert.deepEqual(
        buildForwardedTestArgs("test:node:raw", ["--no-exit"]),
        ["--no-exit"],
      );
    });

    it("does not inject node-only flags for arbitrary non-zotero targets", function () {
      assert.deepEqual(buildForwardedTestArgs("lint:check", []), []);
    });

    it("parses wrapper cli args without losing explicit test flags", function () {
      const invocation = parseWrappedTestInvocation(
        ["test:zotero:cli", "lite", "workflow", "--watch"],
        {},
      );
      assert.equal(invocation.targetScript, "test:zotero:cli");
      assert.equal(invocation.requestedMode, "lite");
      assert.equal(invocation.requestedDomain, "workflow");
      assert.deepEqual(invocation.targetTestArgs, ["--watch"]);
    });
  });

  describe("generated runner patch", function () {
    it("patches runner html with fail-detail diagnostics", function () {
      const patched = patchZoteroTestRunnerHtml(SAMPLE_HTML);
      assert.include(patched, "ZOTERO_SKILLS_DIAGNOSTIC_PATCH_V1");
      assert.include(patched, 'kind: "zotero-test-fail-detail"');
      assert.include(patched, 'kind: "zotero-test-console-error"');
      assert.include(patched, "window.onunhandledrejection");
      assert.include(patched, "__zsScheduleProgressEvent");
      assert.include(patched, "__zsAppendMochaOutput(str);");
      assert.notInclude(patched, "&&");
      assert.include(patched, "&amp;&amp;");
    });

    it("removes heavyweight console object logging and innerText rewrites", function () {
      const patched = patchZoteroTestRunnerHtml(SAMPLE_HTML);
      assert.notInclude(patched, 'console.log("suite", suite)');
      assert.notInclude(patched, 'console.log("pass", test)');
      assert.notInclude(patched, 'console.log("fail", test, error)');
      assert.notInclude(patched, 'innerText +=');
      assert.include(patched, "appendData");
      assert.include(
        patched,
        '<div id="mocha" style="white-space: pre-wrap; overflow-wrap: anywhere;"></div>',
      );
    });

    it("keeps fail and end events blocking while lightening progress events", function () {
      const patched = patchZoteroTestRunnerHtml(SAMPLE_HTML);
      assert.include(
        patched,
        '__zsScheduleProgressEvent({ type: "pass", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, indents: indents + 1 } });',
      );
      assert.include(patched, 'await sendBlocking({ type: "fail", data: {');
      assert.include(patched, 'await sendBlocking({\n      type: "end",');
    });

    it("is idempotent when patching the same html twice", function () {
      const once = patchZoteroTestRunnerHtml(SAMPLE_HTML);
      const twice = patchZoteroTestRunnerHtml(once);
      assert.equal(twice, once);
    });

    it("fails fast when patch anchors are missing", function () {
      assert.throws(
        () => patchZoteroTestRunnerHtml("<html><body></body></html>"),
        /anchor not found/,
      );
    });

    it("patches generated index.xhtml in place", async function () {
      const root = await mkdtemp(
        path.join(os.tmpdir(), "zotero-test-runner-patch-"),
      );
      const runnerPath = path.join(
        root,
        ".scaffold",
        "test",
        "resource",
        "content",
        "index.xhtml",
      );
      await mkdir(path.dirname(runnerPath), { recursive: true });
      await writeFile(runnerPath, SAMPLE_HTML, "utf8");

      const patchedPath = await patchGeneratedZoteroTestRunner(root);
      const patched = await readFile(patchedPath, "utf8");

      assert.equal(patchedPath, runnerPath);
      assert.include(patched, "ZOTERO_SKILLS_DIAGNOSTIC_PATCH_V1");
    });
  });
});

import { assert } from "chai";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prepareTestBuild } from "../../scripts/run-zotero-test-prepared";
import { preserveZoteroStartupBudget } from "../../scripts/patch-zotero-test-runner";

describe("invocation-owned Zotero test build", function () {
  it("retains the slow-host readiness budget without imposing a fixed wait", async function () {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "zotero-readiness-"),
    );
    const file = path.join(directory, ".scaffold/test/resource/bootstrap.js");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(
      file,
      "function waitUtilAsync(condition, interval = 100, timeout = 1e4) { return condition() ? 0 : timeout; }",
    );
    await preserveZoteroStartupBudget(directory);
    await preserveZoteroStartupBudget(directory);
    const { runInNewContext } = await import("node:vm");
    const wait = runInNewContext(
      `${await readFile(file, "utf8")}; waitUtilAsync`,
    );
    assert.equal(
      wait(() => true),
      0,
    );
    assert.equal(
      wait(() => false),
      40_000,
    );
  });
  it("reuses a successful build across hosts but retries failed preparation", async function () {
    const directory = await mkdtemp(path.join(os.tmpdir(), "zotero-build-"));
    const dist = path.join(directory, "dist");
    let builds = 0;
    let native = 0;
    const build = async () => {
      builds++;
      await mkdir(path.join(dist, "addon"), { recursive: true });
      await writeFile(path.join(dist, "addon", "manifest.json"), "{}");
    };
    const stageNative = () => {
      if (++native === 1) throw new Error("native preparation failed");
    };
    try {
      await prepareTestBuild({ directory, dist, build, stageNative });
      assert.fail("expected failure");
    } catch (error) {
      assert.include(String(error), "native preparation failed");
    }
    await prepareTestBuild({ directory, dist, build, stageNative });
    await prepareTestBuild({ directory, dist, build, stageNative });
    assert.equal(builds, 2);
    assert.equal(native, 2);
  });
});

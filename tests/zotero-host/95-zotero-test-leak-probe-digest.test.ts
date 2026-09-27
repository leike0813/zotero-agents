import { assert } from "chai";
import { promises as fs } from "fs";
import path from "path";
import {
  __leakProbeDigestTestOnly,
  captureZoteroLeakProbeSnapshot,
  flushZoteroLeakProbeDigest,
  getZoteroLeakProbeStateForTests,
  installZoteroLeakProbeDigest,
  noteZoteroLeakProbeTestStart,
  resetZoteroLeakProbeDigestForTests,
} from "../../tests/zotero/leakProbeDigest";
import {
  getLeakProbeTempArtifactSnapshotForTests,
  recordLeakProbeTempArtifactForTests,
  releaseLeakProbeTempArtifactForTests,
  resetLeakProbeTempArtifactsForTests,
} from "../../src/modules/testLeakProbeTempArtifacts";

describe("zotero test leak probe digest", function () {
  const originalEnv = {
    probe: process.env.ZOTERO_TEST_LEAK_PROBE,
    out: process.env.ZOTERO_TEST_LEAK_PROBE_OUT,
  };

  afterEach(async function () {
    if (typeof originalEnv.probe === "string") {
      process.env.ZOTERO_TEST_LEAK_PROBE = originalEnv.probe;
    } else {
      delete process.env.ZOTERO_TEST_LEAK_PROBE;
    }
    if (typeof originalEnv.out === "string") {
      process.env.ZOTERO_TEST_LEAK_PROBE_OUT = originalEnv.out;
    } else {
      delete process.env.ZOTERO_TEST_LEAK_PROBE_OUT;
    }
    resetLeakProbeTempArtifactsForTests();
    resetZoteroLeakProbeDigestForTests();
  });

  it("stays inert when the probe env flag is disabled", function () {
    delete process.env.ZOTERO_TEST_LEAK_PROBE;
    resetZoteroLeakProbeDigestForTests();

    installZoteroLeakProbeDigest();
    noteZoteroLeakProbeTestStart({
      domain: "core",
      fullTitle: "probe inert",
      file: "tests/runtime/example.test.ts",
    });
    captureZoteroLeakProbeSnapshot("pre-cleanup", {
      domain: "core",
      fullTitle: "probe inert",
      file: "tests/runtime/example.test.ts",
    });

    assert.deepInclude(getZoteroLeakProbeStateForTests(), {
      enabled: false,
      snapshotCount: 0,
      testIndex: 0,
    });
  });

  it("tracks temp artifacts and release transitions", function () {
    process.env.ZOTERO_TEST_LEAK_PROBE = "1";
    resetZoteroLeakProbeDigestForTests();
    resetLeakProbeTempArtifactsForTests();

    recordLeakProbeTempArtifactForTests({
      kind: "zip-extracted-dir",
      path: "D:\\temp\\bundle-a",
    });
    recordLeakProbeTempArtifactForTests({
      kind: "tag-regulator-valid-tags-yaml",
      path: "D:\\temp\\valid-tags-a.yaml",
    });
    releaseLeakProbeTempArtifactForTests("D:\\temp\\valid-tags-a.yaml");

    assert.deepEqual(getLeakProbeTempArtifactSnapshotForTests(), {
      totalCreatedCount: 2,
      totalActiveCount: 1,
      zipExtractedDir: {
        createdCount: 1,
        activeCount: 1,
        activeSample: ["D:\\temp\\bundle-a"],
      },
      tagRegulatorValidTagsYaml: {
        createdCount: 1,
        activeCount: 0,
        activeSample: [],
      },
    });
  });

  it("writes a digest file with residual and growth summary", async function () {
    process.env.ZOTERO_TEST_LEAK_PROBE = "1";
    process.env.ZOTERO_TEST_LEAK_PROBE_OUT = path.join(
      process.cwd(),
      "artifacts",
      "test-diagnostics",
      "leak-probe-digest-test.json",
    );
    resetZoteroLeakProbeDigestForTests();
    resetLeakProbeTempArtifactsForTests();

    installZoteroLeakProbeDigest();
    noteZoteroLeakProbeTestStart({
      domain: "workflow",
      fullTitle: "probe growth case 1",
      file: "tests/workflow/foo.test.ts",
    });
    recordLeakProbeTempArtifactForTests({
      kind: "zip-extracted-dir",
      path: "D:\\temp\\bundle-1",
    });
    captureZoteroLeakProbeSnapshot("post-object-cleanup", {
      domain: "workflow",
      fullTitle: "probe growth case 1",
      file: "tests/workflow/foo.test.ts",
    });

    noteZoteroLeakProbeTestStart({
      domain: "workflow",
      fullTitle: "probe growth case 2",
      file: "tests/workflow/foo.test.ts",
    });
    recordLeakProbeTempArtifactForTests({
      kind: "zip-extracted-dir",
      path: "D:\\temp\\bundle-2",
    });
    recordLeakProbeTempArtifactForTests({
      kind: "tag-regulator-valid-tags-yaml",
      path: "D:\\temp\\valid-tags-2.yaml",
    });
    captureZoteroLeakProbeSnapshot("post-object-cleanup", {
      domain: "workflow",
      fullTitle: "probe growth case 2",
      file: "tests/workflow/foo.test.ts",
    });

    const outputPath = await flushZoteroLeakProbeDigest();
    const text = await fs.readFile(outputPath, "utf8");
    const payload = JSON.parse(text) as {
      snapshots: unknown[];
      summary: {
        postCleanupResiduals: Array<{ metric: string }>;
        suspectRank: Array<{ metric: string }>;
      };
      suspicions: Array<{ metric: string }>;
    };

    assert.lengthOf(payload.snapshots, 4);
    assert.isTrue(
      payload.summary.postCleanupResiduals.some(
        (entry) => entry.metric === "tempArtifacts.totalActiveCount",
      ),
    );
    assert.isTrue(
      payload.summary.suspectRank.some(
        (entry) => entry.metric === "tempArtifacts.totalActiveCount",
      ),
    );
    assert.isTrue(
      payload.suspicions.some(
        (entry) => entry.metric === "tempArtifacts.totalActiveCount",
      ),
    );
  });

  it("summarizes monotonic post-cleanup growth windows", function () {
    const summary = __leakProbeDigestTestOnly.buildSummary([
      {
        phase: "post-object-cleanup",
        testIndex: 1,
        domain: "core",
        fullTitle: "a",
        file: "a.test.ts",
        ts: "2026-04-16T00:00:00.000Z",
        elapsedSinceRunStartMs: 10,
        metrics: {
          tempArtifacts: {
            totalActiveCount: 1,
          },
        },
      },
      {
        phase: "post-object-cleanup",
        testIndex: 2,
        domain: "core",
        fullTitle: "b",
        file: "b.test.ts",
        ts: "2026-04-16T00:00:01.000Z",
        elapsedSinceRunStartMs: 20,
        metrics: {
          tempArtifacts: {
            totalActiveCount: 3,
          },
        },
      },
    ]);

    assert.deepInclude(summary.postCleanupResiduals[0], {
      metric: "tempArtifacts.totalActiveCount",
      residualCount: 2,
      maxValue: 3,
      lastValue: 3,
    });
    assert.deepInclude(summary.topGrowthWindows[0], {
      metric: "tempArtifacts.totalActiveCount",
      fromTestIndex: 1,
      toTestIndex: 2,
      delta: 2,
    });
  });

  it("defaults leak probe output under artifact test-diagnostics", function () {
    process.env.ZOTERO_TEST_LEAK_PROBE = "1";
    delete process.env.ZOTERO_TEST_LEAK_PROBE_OUT;
    resetZoteroLeakProbeDigestForTests();

    installZoteroLeakProbeDigest();

    assert.include(
      getZoteroLeakProbeStateForTests().outputPath.replace(/\\/g, "/"),
      "/artifacts/test-diagnostics/zotero-leak-probe-",
    );
  });
});

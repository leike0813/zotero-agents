import { assert } from "chai";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  acquireZoteroMachineRunLock,
  buildCompatibilityPlan,
  cleanupRunLayoutState,
  createCompatibilityReceipt,
  createRunLayout,
  ensureCachedHostArchive,
  loadCompatibilityManifest,
  materializeZoteroHostForRun,
  resolveCompatibilityTarget,
  runOwnedCommand,
  validateArchiveEntries,
  validateCompatibilityManifest,
  writeCompatibilityReceipt,
  type CompatibilityManifest,
} from "../../../scripts/zotero-compatibility-fixture";
import {
  parseSupportedZoteroMajor,
  type SupportedZoteroMajor,
} from "../../../src/shared/zoteroRuntimeVersion";

const MATRIX_PATH = path.resolve("test/zotero/compatibility-matrix.json");

describe("Zotero compatibility fixture contracts", function () {
  describe("supported Zotero major", function () {
    const cases: Array<[unknown, SupportedZoteroMajor]> = [
      ["7.0.32", 7],
      ["9.0.6", 9],
      ["10.0.1", 10],
      ["10.0.1-beta.1", 10],
      ["11.0", "unknown"],
      ["", "unknown"],
      [undefined, "unknown"],
    ];

    for (const [input, expected] of cases) {
      it(`maps ${String(input)} to ${String(expected)}`, function () {
        assert.strictEqual(parseSupportedZoteroMajor(input), expected);
      });
    }
  });

  describe("compatibility matrix", function () {
    it("loads the checked-in manifest as the matrix SSOT", async function () {
      const manifest = await loadCompatibilityManifest(MATRIX_PATH);
      assert.strictEqual(
        manifest.schemaId,
        "zotero-agents.zotero-compatibility-matrix.v1",
      );
      assert.deepEqual(
        [...new Set(manifest.targets.map((target) => target.version))].sort(),
        ["10.0.1", "7.0.32", "9.0.6"],
      );
      assert.lengthOf(manifest.targets, 8);
      assert.isTrue(
        manifest.targets.every((target) =>
          /^[a-f0-9]{64}$/.test(target.sha256),
        ),
      );
      assert.isTrue(
        manifest.targets.every(
          (target) =>
            new URL(target.downloadUrl).hostname === "download.zotero.org" &&
            new URL(target.downloadUrl).pathname.includes(
              `/release/${target.version}/Zotero-${target.version}`,
            ),
        ),
      );
    });

    it("plans six blocking lite cells for pull requests", async function () {
      const manifest = await loadCompatibilityManifest(MATRIX_PATH);
      const plan = buildCompatibilityPlan(manifest, "pull-request");
      assert.lengthOf(plan, 6);
      assert.isTrue(
        plan.every(
          (cell) =>
            cell.mode === "behavior" && cell.suite === "lite" && cell.blocking,
        ),
      );
      assert.deepEqual([...new Set(plan.map((cell) => cell.platform))].sort(), [
        "linux-x64",
        "windows-x64",
      ]);
    });

    for (const gate of ["main", "release"] as const) {
      it(`plans full, XPI, and macOS evidence cells for ${gate}`, async function () {
        const manifest = await loadCompatibilityManifest(MATRIX_PATH);
        const plan = buildCompatibilityPlan(manifest, gate);
        assert.lengthOf(plan, 14);
        assert.lengthOf(
          plan.filter(
            (cell) => cell.mode === "behavior" && cell.suite === "full",
          ),
          6,
        );
        assert.lengthOf(
          plan.filter((cell) => cell.mode === "xpi-smoke" && cell.blocking),
          6,
        );
        assert.deepEqual(
          plan
            .filter((cell) => !cell.blocking)
            .map((cell) => cell.platform)
            .sort(),
          ["macos-arm64", "macos-x64"],
        );
      });
    }

    it("rejects missing digests and undeclared runners", function () {
      const invalid = {
        schemaId: "zotero-agents.zotero-compatibility-matrix.v1",
        extractRecipeVersion: 1,
        platforms: {},
        targets: [
          {
            id: "zotero-7-linux-x64",
            family: "zotero-7",
            version: "7.0.32",
            channel: "release",
            platform: "linux-x64",
            downloadUrl: "https://www.zotero.org/example",
            sha256: "",
            archiveFormat: "tar.bz2",
            expectedBinary: "Zotero_linux-x86_64/zotero",
            mozillaBaseline: "firefox115",
            policy: {
              pullRequestBehavior: true,
              mainBehavior: true,
              xpiSmoke: true,
              blocking: true,
            },
          },
        ],
      } as unknown as CompatibilityManifest;

      assert.throws(
        () => validateCompatibilityManifest(invalid),
        /platform|sha256/i,
      );
    });

    it("rejects a target not declared by the manifest", async function () {
      const manifest = await loadCompatibilityManifest(MATRIX_PATH);
      assert.throws(
        () => resolveCompatibilityTarget(manifest, "zotero-11-linux-x64"),
        /target/i,
      );
    });
  });

  describe("archive safety", function () {
    it("accepts normal files and directories", function () {
      assert.doesNotThrow(() =>
        validateArchiveEntries([
          { path: "Zotero/zotero", type: "file" },
          { path: "Zotero/icons/", type: "directory" },
        ]),
      );
    });

    for (const unsafe of [
      { path: "../escape", type: "file" as const },
      { path: "/absolute", type: "file" as const },
      { path: "C:\\escape", type: "file" as const },
      { path: "Zotero/link", type: "symlink" as const, linkTarget: "../x" },
      { path: "Zotero/device", type: "device" as const },
    ]) {
      it(`rejects unsafe ${unsafe.type} entry ${unsafe.path}`, function () {
        assert.throws(() => validateArchiveEntries([unsafe]), /archive/i);
      });
    }
  });

  describe("run lifecycle evidence", function () {
    let tempRoot = "";

    beforeEach(async function () {
      tempRoot = await fs.mkdtemp(
        path.join(os.tmpdir(), "zotero-compat-test-"),
      );
    });

    afterEach(async function () {
      await fs.rm(tempRoot, { recursive: true, force: true });
    });

    it("creates disjoint state roots for each run", async function () {
      const first = await createRunLayout(tempRoot, "zotero-7-linux-x64-lite");
      const second = await createRunLayout(tempRoot, "zotero-7-linux-x64-lite");
      assert.notStrictEqual(first.root, second.root);
      assert.sameMembers(Object.keys(first), [
        "runId",
        "root",
        "profile",
        "data",
        "runtime",
        "resource",
        "diagnostics",
        "receipt",
      ]);
    });

    it("removes run-owned state while retaining receipts and diagnostics", async function () {
      const layout = await createRunLayout(tempRoot, "cleanup");
      const diagnosticPath = path.join(layout.diagnostics, "runner.log");
      await fs.writeFile(diagnosticPath, "evidence", "utf8");
      await fs.writeFile(layout.receipt, "{}\n", "utf8");
      await fs.writeFile(
        path.join(layout.profile, "prefs.js"),
        "state",
        "utf8",
      );
      await fs.mkdir(path.join(layout.root, "compatibility-entries"));

      await cleanupRunLayoutState(layout);

      await fs.access(diagnosticPath);
      await fs.access(layout.receipt);
      assert.isFalse(
        await fs.access(layout.profile).then(
          () => true,
          () => false,
        ),
      );
      assert.isFalse(
        await fs.access(path.join(layout.root, "compatibility-entries")).then(
          () => true,
          () => false,
        ),
      );
    });

    it("serializes Zotero GUI hosts within one machine run root", async function () {
      const first = await acquireZoteroMachineRunLock(tempRoot, 1_000);
      let secondAcquired = false;
      const secondPromise = acquireZoteroMachineRunLock(tempRoot, 1_000).then(
        (lock) => {
          secondAcquired = true;
          return lock;
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.isFalse(secondAcquired);

      await first.release();
      const second = await secondPromise;
      assert.isTrue(secondAcquired);
      await second.release();
    });

    it("launches from a run-local host copy without mutating the cache baseline", async function () {
      const manifest = await loadCompatibilityManifest(MATRIX_PATH);
      const target = resolveCompatibilityTarget(manifest, "zotero-7-linux-x64");
      const installRoot = path.join(tempRoot, "host-cache");
      const binaryPath = path.join(installRoot, target.expectedBinary);
      const versionPath = path.join(
        path.dirname(binaryPath),
        "app",
        "application.ini",
      );
      await fs.mkdir(path.dirname(versionPath), { recursive: true });
      await fs.writeFile(binaryPath, "host-binary", { mode: 0o755 });
      await fs.writeFile(versionPath, "[App]\nVersion=7.0.32\n", "utf8");
      const runRoot = path.join(tempRoot, "run");
      await fs.mkdir(runRoot);

      const materialized = await materializeZoteroHostForRun(
        {
          target,
          archivePath: path.join(tempRoot, "archive"),
          archiveCacheHit: true,
          installRoot,
          binaryPath,
          effectiveUrl: target.downloadUrl,
        },
        runRoot,
      );
      await fs.writeFile(materialized.binaryPath, "updated-host", "utf8");

      assert.strictEqual(materialized.observedVersion, "7.0.32");
      assert.strictEqual(await fs.readFile(binaryPath, "utf8"), "host-binary");
      assert.notStrictEqual(materialized.binaryPath, binaryPath);
    });

    it("writes a failure receipt without requiring observed host facts", async function () {
      const layout = await createRunLayout(tempRoot, "launch-failure");
      const receipt = createCompatibilityReceipt({
        runId: layout.runId,
        source: { commit: "abc123", dirty: true },
        plugin: {
          version: "0.9.0",
          artifactPath: "/artifact/zotero-agents.xpi",
          artifactSha256: "a".repeat(64),
          manifestMin: "7.0",
          manifestMax: "10.0.*",
        },
        host: {
          id: "zotero-10-linux-x64",
          requestedVersion: "10.0.1",
          platform: "linux-x64",
          archiveSha256: "b".repeat(64),
          downloadUrl: "https://www.zotero.org/example",
        },
        execution: { mode: "behavior", suite: "lite" },
        startedAt: "2026-08-29T00:00:00.000Z",
      });
      receipt.status = "failed";
      receipt.errors.push({ code: "host_startup_timeout", phase: "launch" });
      await writeCompatibilityReceipt(layout.receipt, receipt);

      const stored = JSON.parse(await fs.readFile(layout.receipt, "utf8"));
      assert.strictEqual(stored.status, "failed");
      assert.strictEqual(stored.host.observedVersion, null);
      assert.strictEqual(stored.errors[0].code, "host_startup_timeout");
    });

    it("replaces a poisoned archive cache entry with verified bytes", async function () {
      const expectedBytes = Buffer.from("trusted-host-archive");
      const sha256 = createHash("sha256").update(expectedBytes).digest("hex");
      const archiveRoot = path.join(tempRoot, "cache");
      const cachedPath = path.join(archiveRoot, "archives", sha256);
      await fs.mkdir(path.dirname(cachedPath), { recursive: true });
      await fs.writeFile(cachedPath, "poisoned", "utf8");
      let downloads = 0;

      const result = await ensureCachedHostArchive({
        cacheRoot: archiveRoot,
        downloadUrl: "https://www.zotero.org/example",
        sha256,
        download: async (_url, destination) => {
          downloads += 1;
          await fs.writeFile(destination, expectedBytes);
          return { effectiveUrl: "https://download.zotero.org/example" };
        },
      });

      assert.strictEqual(downloads, 1);
      assert.deepEqual(await fs.readFile(result.archivePath), expectedBytes);
      assert.strictEqual(
        result.effectiveUrl,
        "https://download.zotero.org/example",
      );
    });

    it("terminates an owned process after its deadline", async function () {
      const stdoutPath = path.join(tempRoot, "owned.stdout.log");
      const stderrPath = path.join(tempRoot, "owned.stderr.log");
      const result = await runOwnedCommand({
        command: process.execPath,
        args: ["-e", "setInterval(() => {}, 1000)"],
        cwd: tempRoot,
        env: process.env,
        stdoutPath,
        stderrPath,
        timeoutMs: 50,
        gracefulTimeoutMs: 100,
      });
      assert.isTrue(result.timedOut);
      assert.isTrue(result.graceful || result.forced);
      assert.isNull(result.exitCode);
    });
  });
});

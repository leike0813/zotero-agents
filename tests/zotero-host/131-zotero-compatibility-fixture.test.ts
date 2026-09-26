import { assert } from "chai";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  acquireZoteroMachineRunLock,
  assertCompatibilityArtifactIdentity,
  buildCompatibilityPlan,
  cleanupRunLayoutState,
  createE2EExecutionCell,
  createCompatibilityReceipt,
  createRunLayout,
  ensureCachedHostArchive,
  loadCompatibilityManifest,
  materializeZoteroHostForRun,
  persistCompatibilityHostFactsEvent,
  resolveLocalArchiveCommandLocation,
  resolveZipExtractionCommand,
  resolveCompatibilityTarget,
  runOwnedCommand,
  validateArchiveEntries,
  validateCompatibilityManifest,
  writeCompatibilityReceipt,
  type CompatibilityManifest,
  type CompatibilityExecutionCell,
  E2E_PROMOTION_STATE,
} from "../../scripts/zotero-compatibility-fixture";
import {
  evaluateCalibrationGrouping,
  evaluateE2EPromotion,
  validateCalibrationRounds,
  type CalibrationRound,
} from "../../scripts/system-e2e/calibration";
import {
  describeRunManifestReference,
  type RunManifest,
} from "../../scripts/system-e2e/manifest";
import { collectCellRuntimeEvidence } from "../../scripts/system-e2e/runtimeEvidence";
import {
  evaluateCandidateCell,
  evaluateCandidateMatrix,
} from "../../scripts/system-e2e/acceptance";
import {
  getRuntimePersistencePaths,
  getSynthesisSidecarLifecyclePaths,
  getSynthesisSidecarRuntimePaths,
} from "../../src/modules/runtimePersistence";
import {
  runWeeklyRetryPolicy,
  type WeeklyAttemptResult,
} from "../../scripts/system-e2e/weeklyRetry";
import {
  parseSupportedZoteroMajor,
  type SupportedZoteroMajor,
} from "../../src/shared/zoteroRuntimeVersion";
import {
  materializeCompatibilityTestWorkspace,
  resolveCompatibilityWorkerEntries,
} from "../../scripts/run-zotero-compatibility-worker";
import {
  parseCompatibilityCliArgs,
  parseCompatibilityRunManifestReference,
} from "../../scripts/run-zotero-compatibility-matrix";
import zoteroPluginConfig, {
  resolveTestEntries,
  shouldStageDirectSynthesisBundle,
} from "../../zotero-plugin.config";

const MATRIX_PATH = path.resolve("tests/zotero/compatibility-matrix.json");

function calibrationManifest(args: {
  runId: string;
  cell: CompatibilityExecutionCell;
  sourceCommit?: string;
  fixtureRevision?: number;
}): RunManifest {
  return {
    schemaVersion: "system-e2e-run-manifest.v1",
    runId: args.runId,
    triggerLane: args.cell.lane,
    sourceCommit: args.sourceCommit || "source",
    pluginVersion: "0.9.0",
    zoteroVersion: args.cell.version,
    platform:
      args.cell.runnerEnvironment.os === "windows"
        ? "win32"
        : args.cell.runnerEnvironment.os === "macos"
          ? "darwin"
          : args.cell.runnerEnvironment.os,
    architecture: "x64",
    sidecarBuildIdentity: args.cell.sidecarFingerprint,
    fixture: {
      fixtureId: "foundation-v1",
      schemaVersion: "system-e2e-fixture.v1",
      fixtureRevision: args.fixtureRevision || 1,
    },
    startedAt: "2026-09-18T00:00:00.000Z",
    finishedAt: "2026-09-18T00:01:00.000Z",
    terminalState: "complete",
    families: args.cell.families.map((familyId) => ({
      familyId,
      result: "passed",
      publicOutcome: "passed",
      typedEvidence: [
        { kind: "receipt", schemaVersion: "v1", terminalStatus: "passed" },
      ],
      lifecycle: [{ checkpoint: "terminal", outcome: "passed" }],
      cleanup: "passed",
      health: "passed",
      artifacts: [],
    })),
  };
}

describe("Zotero compatibility fixture contracts", function () {
  describe("Synthesis candidate acceptance", function () {
    it("reports every absent blocking acceptance cell as pending", async function () {
      const manifest = await loadCompatibilityManifest(MATRIX_PATH);
      const result = evaluateCandidateMatrix(
        buildCompatibilityPlan(manifest, "acceptance"),
        new Map(),
      );
      assert.strictEqual(result.status, "pending");
      assert.lengthOf(result.cells, 6);
      assert.isTrue(result.cells.every((cell) => cell.status === "pending"));
      assert.isTrue(result.cells.some((cell) => cell.id.includes("zotero-10")));
    });

    it("binds a passing cell to the exact XPI and installed bundle", function () {
      const sourceCommit = "a".repeat(40);
      const xpiDigest = "b".repeat(64);
      const buildFingerprint = "c".repeat(64);
      const bundleId = "d".repeat(64);
      const cell: CompatibilityExecutionCell = {
        id: "acceptance-zotero-10-linux-x64-e2e-sl-rh-pa-pm-cg-hb",
        lane: "acceptance",
        targetId: "zotero-10-linux-x64",
        version: "10.0.1",
        platform: "linux-x64",
        families: ["SL", "RH", "PA", "PM", "CG", "HB"],
        runnerEnvironment: { os: "linux", image: "ubuntu-24.04" },
        fixtureScale: "committed-seed",
        sidecarStartupModel: "pinned-universal-xpi",
        invocationProfileModel: "one-fresh-copied-profile-per-invocation",
        blocking: true,
        pluginDigest: xpiDigest,
        sidecarFingerprint: buildFingerprint,
        runManifestReference:
          "artifacts/test-diagnostics/system-e2e/run-1/run-manifest.json",
      };
      const receipt = createCompatibilityReceipt({
        runId: "compat-1",
        source: { commit: sourceCommit, dirty: false },
        plugin: {
          version: "0.9.0",
          artifactPath: "/ignored/candidate.xpi",
          artifactSha256: xpiDigest,
          manifestMin: "7.0.0",
          manifestMax: "10.*",
        },
        host: {
          id: cell.targetId,
          requestedVersion: cell.version,
          platform: cell.platform,
          archiveSha256: "e".repeat(64),
          downloadUrl: "https://example.invalid/zotero",
        },
        execution: { mode: "behavior", suite: "full", domain: "e2e", cell },
      });
      receipt.status = "passed";
      receipt.host.observedVersion = cell.version;
      receipt.cleanup.complete = true;
      const baseManifest = calibrationManifest({
        runId: "run-1",
        cell,
        sourceCommit,
      });
      const caseIds = [
        "SL-01",
        "SL-02",
        "SL-03",
        "RH-01",
        "RH-02",
        "PA-01",
        "PA-02",
        "PM-01",
        "PM-02",
        "PM-03",
        "PM-04",
        "CG-01",
        "HB-01",
        "HB-02",
        "HB-03",
      ];
      const manifest: RunManifest = {
        ...baseManifest,
        families: caseIds.map((caseId) => ({
          ...baseManifest.families.find(
            (family) => family.familyId === caseId.slice(0, 2),
          )!,
          caseId,
        })),
      };
      const runtime = {
        schemaVersion: "system-e2e-sidecar-runtime-evidence.v1" as const,
        runtimeRootPresent: true,
        install: {
          present: true,
          target: "linux-x64",
          bundleId,
          buildFingerprint,
          declaredFiles: 4,
          missingFiles: 0,
        },
        sessions: [],
        runtimeLog: { present: true, bytes: 0, captured: true },
      };
      const candidate = { sourceCommit, xpiDigest, bundleId, buildFingerprint };
      const input = { candidate, receipt, manifest, runtime };

      assert.deepEqual(evaluateCandidateCell(input), []);
      assert.include(
        evaluateCandidateCell({
          ...input,
          receipt: {
            ...receipt,
            plugin: { ...receipt.plugin, artifactSha256: "f".repeat(64) },
          },
        }),
        "xpi_mismatch",
      );
      assert.include(
        evaluateCandidateCell({
          ...input,
          runtime: {
            ...runtime,
            install: { ...runtime.install, bundleId: "f".repeat(64) },
          },
        }),
        "bundle_mismatch",
      );
      assert.include(
        evaluateCandidateCell({
          ...input,
          manifest: { ...manifest, terminalState: "incomplete" },
        }),
        "run_incomplete",
      );
      assert.include(
        evaluateCandidateCell({
          ...input,
          manifest: {
            ...manifest,
            families: manifest.families.filter(
              (family) => family.caseId !== "HB-03",
            ),
          },
        }),
        "run_incomplete",
      );
      assert.include(
        evaluateCandidateCell({
          ...input,
          manifest: { ...manifest, runId: "another-run" },
        }),
        "run_incomplete",
      );
      assert.include(
        evaluateCandidateCell({
          ...input,
          runtime: {
            ...runtime,
            install: { ...runtime.install, target: "win32-x64" },
          },
        }),
        "bundle_mismatch",
      );
      assert.include(
        evaluateCandidateCell({
          ...input,
          manifest: {
            ...manifest,
            families: manifest.families.map((family) =>
              family.caseId === "HB-03"
                ? { ...family, familyId: "SL" }
                : family,
            ),
          },
        }),
        "run_incomplete",
      );
    });
  });

  describe("compatibility worker membership", function () {
    const cases = [
      {
        name: "lite",
        entries: resolveTestEntries("all", "lite"),
        expected: [
          "tests/zotero/setup",
          "tests/zotero/core/lite",
          "tests/zotero/ui/lite",
          "tests/zotero/workflow/lite",
        ],
      },
      {
        name: "full",
        entries: resolveTestEntries("all", "full"),
        expected: [
          "tests/zotero/setup",
          "tests/zotero/core/lite",
          "tests/zotero/core/full",
          "tests/zotero/ui/lite",
          "tests/zotero/ui/full",
          "tests/zotero/workflow/lite",
          "tests/zotero/workflow/full",
        ],
      },
      {
        name: "e2e",
        entries: resolveTestEntries("e2e", "full"),
        expected: ["tests/zotero/setup", "tests/zotero/e2e/full"],
      },
    ];

    for (const { name, entries, expected } of cases) {
      it(`uses direct ${name} suite entries`, function () {
        assert.deepEqual(
          resolveCompatibilityWorkerEntries(
            "behavior",
            entries,
            name === "e2e" ? "e2e" : "all",
          ),
          name === "e2e"
            ? expected
            : [...expected, "tests/zotero/compatibility/probe"],
        );
      });
    }

    it("keeps the formal XPI suite independent of behavioral membership", function () {
      assert.deepEqual(resolveCompatibilityWorkerEntries("xpi-smoke", []), [
        "tests/zotero/compatibility/xpi",
      ]);
      assert.deepEqual(
        resolveCompatibilityWorkerEntries(
          "behavior",
          ["tests/zotero/setup", "tests/zotero/e2e/full"],
          "e2e",
          true,
        ),
        [
          "tests/zotero/compatibility/xpi",
          "tests/zotero/setup",
          "tests/zotero/e2e/full",
        ],
      );
    });

    it("materializes a discoverable run-local Zotero test tree", async function () {
      const projectRoot = await fs.mkdtemp(
        path.join(os.tmpdir(), "compat-project-"),
      );
      const runRoot = await fs.mkdtemp(path.join(os.tmpdir(), "compat-run-"));
      try {
        const testFile = path.join(
          projectRoot,
          "tests/zotero/e2e/full/example.zotero.test.ts",
        );
        await fs.mkdir(path.dirname(testFile), { recursive: true });
        await fs.writeFile(testFile, "export {};\n", "utf8");
        for (const relative of [
          "tests/fixtures",
          "tests/helpers",
          "src",
          "scripts",
          "packages",
        ]) {
          await fs.mkdir(path.join(projectRoot, relative), { recursive: true });
        }
        await fs.writeFile(
          path.join(projectRoot, "package.json"),
          '{"type":"module"}\n',
          "utf8",
        );

        await materializeCompatibilityTestWorkspace(projectRoot, runRoot);

        assert.isFalse(
          (await fs.lstat(path.join(runRoot, "tests/zotero"))).isSymbolicLink(),
        );
        assert.strictEqual(
          await fs.readFile(
            path.join(runRoot, "tests/zotero/e2e/full/example.zotero.test.ts"),
            "utf8",
          ),
          "export {};\n",
        );
        assert.isTrue(
          (
            await fs.lstat(path.join(runRoot, "tests/fixtures"))
          ).isSymbolicLink(),
        );
      } finally {
        await fs.rm(projectRoot, { recursive: true, force: true });
        await fs.rm(runRoot, { recursive: true, force: true });
      }
    });

    it("does not replace pre-staged E2E artifacts inside a cell", function () {
      assert.isFalse(
        shouldStageDirectSynthesisBundle("e2e", {
          ZOTERO_COMPAT_PREBUILT_ARTIFACTS: "1",
        }),
      );
      assert.isTrue(shouldStageDirectSynthesisBundle("e2e", {}));
    });
  });

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
    it("accepts the e2e domain without widening other CLI values", function () {
      assert.strictEqual(
        parseCompatibilityCliArgs(["prepare"]).command,
        "prepare",
      );
      assert.strictEqual(
        parseCompatibilityCliArgs(["run", "--domain", "e2e"]).domain,
        "e2e",
      );
      assert.throws(
        () => parseCompatibilityCliArgs(["run", "--domain", "browser"]),
        /domain/i,
      );
      assert.strictEqual(
        parseCompatibilityCliArgs(["run", "--mode", "xpi-smoke"]).mode,
        "xpi-smoke",
      );
      const acceptance = parseCompatibilityCliArgs([
        "run",
        "--gate=acceptance",
        "--domain=e2e",
        "--suite=full",
        "--install-candidate-xpi",
      ]);
      assert.isTrue(acceptance.installCandidateXpi);
      assert.isTrue(acceptance.blocking);
      assert.isTrue(
        parseCompatibilityCliArgs([
          "prepare",
          "--gate=acceptance",
          "--install-candidate-xpi",
        ]).installCandidateXpi,
      );
      assert.throws(
        () => parseCompatibilityCliArgs(["run", "--gate=acceptance"]),
        /candidate.*xpi/i,
      );
      assert.throws(
        () => parseCompatibilityCliArgs(["run", "--install-candidate-xpi"]),
        /candidate.*e2e/i,
      );
      assert.deepEqual(
        parseCompatibilityCliArgs([
          "run",
          "--domain",
          "e2e",
          "--families",
          "PM,SL",
        ]).families,
        ["SL", "PM"],
      );
      assert.throws(
        () =>
          parseCompatibilityCliArgs([
            "run",
            "--domain",
            "e2e",
            "--families",
            "SL-01",
          ]),
        /family_selection_invalid/,
      );
    });

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

    it("plans six blocking lite cells and one promoted blocking SL+PM E2E cell for pull requests", async function () {
      const manifest = await loadCompatibilityManifest(MATRIX_PATH);
      const plan = buildCompatibilityPlan(manifest, "pull-request");
      const lite = plan.filter((cell) => cell.domain === "all");
      assert.lengthOf(lite, 6);
      assert.isTrue(
        lite.every(
          (cell) =>
            cell.mode === "behavior" &&
            cell.suite === "lite" &&
            cell.domain === "all" &&
            cell.blocking,
        ),
      );
      assert.deepEqual([...new Set(plan.map((cell) => cell.platform))].sort(), [
        "linux-x64",
        "windows-x64",
      ]);
      assert.deepInclude(
        plan.find((cell) => cell.domain === "e2e"),
        {
          targetId: "zotero-10-linux-x64",
          version: "10.0.1",
          platform: "linux-x64",
          runner: "ubuntu-24.04",
          mode: "behavior",
          suite: "full",
          domain: "e2e",
          lane: "pull-request",
          families: ["SL", "PM"],
          fixtureScale: "committed-seed",
          sidecarStartupModel: "pre-staged-current-source",
          invocationProfileModel: "one-fresh-copied-profile-per-invocation",
          blocking: true,
        },
      );
    });

    for (const gate of ["main", "release"] as const) {
      it(`plans full, XPI, and macOS evidence cells for ${gate}`, async function () {
        const manifest = await loadCompatibilityManifest(MATRIX_PATH);
        const plan = buildCompatibilityPlan(manifest, gate);
        const existing = plan.filter((cell) => cell.domain !== "e2e");
        assert.lengthOf(existing, 14);
        assert.lengthOf(
          existing.filter(
            (cell) => cell.mode === "behavior" && cell.suite === "full",
          ),
          6,
        );
        assert.lengthOf(
          existing.filter((cell) => cell.mode === "xpi-smoke" && cell.blocking),
          6,
        );
        assert.deepEqual(
          existing
            .filter((cell) => !cell.blocking)
            .map((cell) => cell.platform)
            .sort(),
          ["macos-arm64", "macos-x64"],
        );
        assert.isTrue(
          existing
            .filter((cell) => cell.mode === "xpi-smoke")
            .every((cell) => cell.domain === undefined),
        );
      });
    }

    it("plans one promoted blocking all-family Linux E2E cell per Zotero major on main", async function () {
      const manifest = await loadCompatibilityManifest(MATRIX_PATH);
      const cells = buildCompatibilityPlan(manifest, "main").filter(
        (cell) => cell.domain === "e2e",
      );

      assert.deepEqual(
        cells.map((cell) => cell.targetId),
        ["zotero-7-linux-x64", "zotero-9-linux-x64", "zotero-10-linux-x64"],
      );
      assert.isTrue(
        cells.every(
          (cell) =>
            cell.lane === "main" &&
            cell.blocking === true &&
            cell.fixtureScale === "committed-seed" &&
            cell.invocationProfileModel ===
              "one-fresh-copied-profile-per-invocation" &&
            JSON.stringify(cell.families) ===
              JSON.stringify(["SL", "RH", "PA", "PM", "CG", "HB"]),
        ),
      );
    });

    it("plans tag-bound all-family Linux and Windows E2E cells for release", async function () {
      const manifest = await loadCompatibilityManifest(MATRIX_PATH);
      const plan = buildCompatibilityPlan(manifest, "release");
      const cells = plan.filter((cell) => cell.domain === "e2e");

      assert.deepEqual(
        cells.map((cell) => cell.targetId),
        [
          "zotero-7-linux-x64",
          "zotero-9-linux-x64",
          "zotero-10-linux-x64",
          "zotero-7-windows-x64",
          "zotero-9-windows-x64",
          "zotero-10-windows-x64",
        ],
      );
      assert.isTrue(
        cells.every(
          (cell) =>
            cell.lane === "release" &&
            JSON.stringify(cell.families) ===
              JSON.stringify(["SL", "RH", "PA", "PM", "CG", "HB"]),
        ),
      );
      assert.isTrue(cells.every((cell) => cell.blocking));
      assert.deepEqual(
        plan
          .filter(
            (cell) =>
              cell.mode === "xpi-smoke" && cell.platform.startsWith("macos"),
          )
          .map((cell) => cell.platform)
          .sort(),
        ["macos-arm64", "macos-x64"],
      );
    });

    it("plans non-gating weekly, stress, and manual-gold evidence", async function () {
      const manifest = await loadCompatibilityManifest(MATRIX_PATH);
      const weekly = buildCompatibilityPlan(manifest, "weekly");
      assert.deepEqual(
        weekly.map((cell) => cell.targetId),
        [
          "zotero-7-linux-x64",
          "zotero-9-linux-x64",
          "zotero-10-linux-x64",
          "zotero-7-windows-x64",
          "zotero-9-windows-x64",
          "zotero-10-windows-x64",
        ],
      );
      assert.isTrue(
        weekly.every(
          (cell) =>
            cell.lane === "weekly" &&
            cell.blocking === false &&
            cell.fixtureScale === "committed-seed" &&
            cell.families?.length === 6,
        ),
      );

      assert.deepInclude(buildCompatibilityPlan(manifest, "stress")[0], {
        targetId: "zotero-10-linux-x64",
        lane: "stress",
        families: [],
        fixtureScale: "stress",
        blocking: false,
      });
      assert.deepInclude(buildCompatibilityPlan(manifest, "manual-gold")[0], {
        targetId: "zotero-10-linux-x64",
        lane: "manual-gold",
        families: ["RH", "PA", "PM", "CG"],
        fixtureScale: "large-gold",
        blocking: false,
      });
    });

    it("plans one Windows CG-02 catalog cell per Windows target", async function () {
      const manifest = await loadCompatibilityManifest(MATRIX_PATH);
      const cells = buildCompatibilityPlan(manifest, "cg-02-windows");

      assert.deepEqual(
        cells.map((cell) => cell.targetId),
        [
          "zotero-7-windows-x64",
          "zotero-9-windows-x64",
          "zotero-10-windows-x64",
        ],
      );
      assert.isTrue(
        cells.every(
          (cell) =>
            cell.lane === "cg-02-windows" &&
            cell.blocking === false &&
            cell.mode === "behavior" &&
            cell.suite === "full" &&
            cell.families?.length === 0 &&
            cell.fixtureScale === "stress",
        ),
      );
      // The Windows promotion precondition cites CG-02, so the lane has to be
      // reachable from a tag the evidence workflow understands.
      assert.include(
        cells.map((cell) => cell.id),
        "cg-02-windows-zotero-10-windows-x64-e2e",
      );
    });

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

    it("binds a complete E2E execution-cell identity into plans and receipts", async function () {
      const manifest = await loadCompatibilityManifest(MATRIX_PATH);
      const target = resolveCompatibilityTarget(
        manifest,
        "zotero-10-linux-x64",
      );
      const cell = createE2EExecutionCell({
        id: "pr-zotero-10-linux-x64-sl-pm",
        lane: "pull-request",
        target,
        runnerEnvironment: {
          os: manifest.platforms[target.platform].os,
          image: manifest.platforms[target.platform].runner,
        },
        families: ["SL", "PM"],
        fixtureScale: "committed-seed",
        blocking: false,
        pluginDigest: "a".repeat(64),
        sidecarFingerprint: "b".repeat(64),
        runManifestReference:
          "artifacts/test-diagnostics/system-e2e/run-1/run-manifest.json",
      });

      assert.deepEqual(cell, {
        id: "pr-zotero-10-linux-x64-sl-pm",
        lane: "pull-request",
        targetId: "zotero-10-linux-x64",
        version: "10.0.1",
        platform: "linux-x64",
        families: ["SL", "PM"],
        runnerEnvironment: { os: "linux", image: "ubuntu-24.04" },
        fixtureScale: "committed-seed",
        sidecarStartupModel: "pre-staged-current-source",
        invocationProfileModel: "one-fresh-copied-profile-per-invocation",
        blocking: false,
        pluginDigest: "a".repeat(64),
        sidecarFingerprint: "b".repeat(64),
        runManifestReference:
          "artifacts/test-diagnostics/system-e2e/run-1/run-manifest.json",
      });

      const receipt = createCompatibilityReceipt({
        runId: "e2e-run",
        source: { commit: "abc123", dirty: false },
        plugin: {
          version: "0.9.0",
          artifactPath: "/artifact/zotero-agents.xpi",
          artifactSha256: cell.pluginDigest,
          manifestMin: "7.0",
          manifestMax: "10.0.*",
        },
        host: {
          id: target.id,
          requestedVersion: target.version,
          platform: target.platform,
          archiveSha256: target.sha256,
          downloadUrl: target.downloadUrl,
        },
        execution: {
          mode: "behavior",
          suite: "full",
          domain: "e2e",
          cell,
        },
      });
      assert.deepEqual(receipt.execution.cell, cell);
      assert.strictEqual(
        receipt.plugin.artifactSha256,
        receipt.execution.cell?.pluginDigest,
      );
    });
  });

  describe("System E2E calibration policy", function () {
    async function fixtureCell(
      targetId = "zotero-10-linux-x64",
    ): Promise<CompatibilityExecutionCell> {
      const manifest = await loadCompatibilityManifest(MATRIX_PATH);
      const target = resolveCompatibilityTarget(manifest, targetId);
      return createE2EExecutionCell({
        id: `release-${targetId}-e2e-sl-rh-pa-pm-cg-hb`,
        lane: "release",
        target,
        runnerEnvironment: {
          os: manifest.platforms[target.platform].os,
          image: manifest.platforms[target.platform].runner,
        },
        families: ["SL", "RH", "PA", "PM", "CG", "HB"],
        fixtureScale: "committed-seed",
        blocking: false,
        pluginDigest: "a".repeat(64),
        sidecarFingerprint: "b".repeat(64),
        runManifestReference: "evidence/run-manifest.json",
      });
    }

    function cleanRound(
      cell: CompatibilityExecutionCell,
      index: number,
    ): CalibrationRound {
      return {
        workflowRunId: `workflow-${index}`,
        profileIdentity: `profile-${index}`,
        durationMs: index * 60_000,
        cell: {
          ...cell,
          families: [...cell.families],
          runnerEnvironment: { ...cell.runnerEnvironment },
          pluginDigest: String(index).repeat(64),
          sidecarFingerprint: String(index + 3).repeat(64),
        },
        manifest: calibrationManifest({
          runId: `run-${index}`,
          cell,
          sourceCommit: `commit-${index}`,
          fixtureRevision: index,
        }),
        infrastructure: {
          processes: "clean",
          ports: "released",
          locks: "released",
        },
      };
    }

    it("requires three independent complete clean rounds", async function () {
      const cell = await fixtureCell();
      const rounds = [1, 2, 3].map((index) => cleanRound(cell, index));
      assert.deepInclude(validateCalibrationRounds(rounds), {
        eligible: true,
        maxDurationMs: 180_000,
      });
      const withFoundation = structuredClone(rounds);
      for (const round of withFoundation) {
        round.manifest.families.unshift({
          ...round.manifest.families[0]!,
          familyId: "runner-foundation",
          caseId: "runner-foundation-01",
        });
      }
      assert.isTrue(validateCalibrationRounds(withFoundation).eligible);
      assert.isFalse(validateCalibrationRounds(rounds.slice(0, 2)).eligible);

      const invalid = [
        {
          name: "terminal",
          mutate: (round: CalibrationRound) => {
            round.manifest.terminalState = "incomplete";
          },
        },
        {
          name: "cleanup",
          mutate: (round: CalibrationRound) => {
            round.manifest.families[0]!.cleanup = "failed";
          },
        },
        {
          name: "health",
          mutate: (round: CalibrationRound) => {
            round.manifest.families[0]!.health = "failed";
          },
        },
        {
          name: "process",
          mutate: (round: CalibrationRound) => {
            round.infrastructure.processes = "leaked";
          },
        },
        {
          name: "port",
          mutate: (round: CalibrationRound) => {
            round.infrastructure.ports = "held";
          },
        },
        {
          name: "lock",
          mutate: (round: CalibrationRound) => {
            round.infrastructure.locks = "held";
          },
        },
      ];
      for (const { name, mutate } of invalid) {
        const candidate = structuredClone(rounds);
        mutate(candidate[2]!);
        assert.include(validateCalibrationRounds(candidate).reasons, name);
      }
    });

    it("invalidates only declared calibration identity changes", async function () {
      const cell = await fixtureCell();
      const rounds = [1, 2, 3].map((index) => cleanRound(cell, index));
      assert.isTrue(validateCalibrationRounds(rounds).eligible);

      const changes: Array<(cell: CompatibilityExecutionCell) => void> = [
        (value) => {
          value.version = "10.0.2";
        },
        (value) => {
          value.runnerEnvironment.image = "ubuntu-26.04";
        },
        (value) => {
          value.runnerEnvironment.os = "windows";
        },
        (value) => {
          value.families = ["SL", "PM"];
        },
        (value) => {
          value.fixtureScale = "large-gold";
        },
        (value) => {
          value.sidecarStartupModel = "pre-staged-release" as never;
        },
        (value) => {
          value.invocationProfileModel = "shared-profile" as never;
        },
      ];
      for (const change of changes) {
        const candidate = structuredClone(rounds);
        change(candidate[2]!.cell);
        assert.include(
          validateCalibrationRounds(candidate).reasons,
          "identity",
        );
      }
    });

    it("uses observed maxima and the fixed whole-family split order", function () {
      for (const [lane, minutes] of [
        ["pull-request", 15],
        ["main", 30],
        ["release", 45],
        ["weekly", 60],
        ["manual-gold", 90],
      ] as const) {
        assert.strictEqual(
          evaluateCalibrationGrouping(lane, ["SL"], []).thresholdMs,
          minutes * 60_000,
        );
      }
      assert.deepEqual(
        evaluateCalibrationGrouping(
          "pull-request",
          ["SL", "RH", "PA", "PM", "CG", "HB"],
          [10, 14, 16].map((minutes) => minutes * 60_000),
        ).nextGroups,
        [["SL", "RH", "PA", "PM", "CG"], ["HB"]],
      );
      assert.deepEqual(
        evaluateCalibrationGrouping(
          "main",
          ["SL", "RH", "PA", "PM", "CG"],
          [31 * 60_000],
        ).nextGroups,
        [
          ["SL", "PM"],
          ["RH", "PA", "CG"],
        ],
      );
      assert.isUndefined(
        evaluateCalibrationGrouping("release", ["SL", "PM"], [44 * 60_000])
          .nextGroups,
      );
    });

    it("requires an explicit per-cell promotion and trustworthy Windows CG-02 evidence", async function () {
      const linux = await fixtureCell();
      const calibration = validateCalibrationRounds(
        [1, 2, 3].map((index) => cleanRound(linux, index)),
      );
      // Every cell is promoted only after three reviewed clean rounds; the
      // Windows cells additionally carry passing `CG-02` evidence and the
      // recorded Zotero 9 classification.
      assert.isTrue(E2E_PROMOTION_STATE[linux.id]);
      assert.isTrue(
        E2E_PROMOTION_STATE[
          "release-zotero-10-windows-x64-e2e-sl-rh-pa-pm-cg-hb"
        ],
      );
      assert.lengthOf(Object.keys(E2E_PROMOTION_STATE), 10);
      assert.deepInclude(
        evaluateE2EPromotion({
          cell: linux,
          configuredBlocking: true,
          calibration,
        }),
        { allowed: true, blocking: true },
      );

      const windows = await fixtureCell("zotero-10-windows-x64");
      const windowsCalibration = validateCalibrationRounds(
        [1, 2, 3].map((index) => cleanRound(windows, index)),
      );
      assert.isFalse(
        evaluateE2EPromotion({
          cell: windows,
          configuredBlocking: true,
          calibration: windowsCalibration,
        }).allowed,
      );
      assert.isFalse(
        evaluateE2EPromotion({
          cell: windows,
          configuredBlocking: true,
          calibration: windowsCalibration,
          windowsEvidence: {
            cg02: "failed",
            trustworthy: true,
            zotero9Classification: "unverified",
          },
        }).allowed,
      );
      assert.deepInclude(
        evaluateE2EPromotion({
          cell: windows,
          configuredBlocking: true,
          calibration: windowsCalibration,
          windowsEvidence: {
            cg02: "passed",
            trustworthy: true,
            zotero9Classification: "passed",
          },
        }),
        { allowed: true, blocking: true },
      );
    });
  });

  describe("weekly diagnostic rerun", function () {
    const attempt = (
      index: number,
      verdict: WeeklyAttemptResult["verdict"],
    ): WeeklyAttemptResult => ({
      verdict,
      runId: `run-${index}`,
      profileIdentity: `profile-${index}`,
      manifestReference: `evidence/run-${index}/run-manifest.json`,
    });

    it("reruns one complete weekly cell with linked fresh identities", async function () {
      const contexts: unknown[] = [];
      const first = attempt(1, "failed");
      const result = await runWeeklyRetryPolicy("weekly", async (context) => {
        contexts.push(context);
        return context.attempt === 1 ? first : attempt(2, "passed");
      });

      assert.deepEqual(contexts, [
        { attempt: 1, scope: "complete-cell" },
        {
          attempt: 2,
          scope: "complete-cell",
          predecessorRunId: "run-1",
        },
      ]);
      assert.deepInclude(result, {
        classification: "intermittent",
        workflowPassed: false,
      });
      assert.deepEqual(result.attempts, [first, attempt(2, "passed")]);
      assert.strictEqual(
        first.manifestReference,
        "evidence/run-1/run-manifest.json",
      );
    });

    it("classifies a second weekly failure as persistent", async function () {
      const result = await runWeeklyRetryPolicy("weekly", async (context) =>
        attempt(context.attempt, "failed"),
      );
      assert.deepInclude(result, {
        classification: "persistent",
        workflowPassed: false,
      });
      assert.lengthOf(result.attempts, 2);
    });

    it("never retries non-weekly terminal failures", async function () {
      for (const lane of [
        "pull-request",
        "main",
        "release",
        "stress",
        "manual-gold",
      ] as const) {
        for (const verdict of [
          "failed",
          "aborted",
          "incomplete",
          "indeterminate",
        ] as const) {
          let calls = 0;
          const result = await runWeeklyRetryPolicy(lane, async () => {
            calls += 1;
            return attempt(calls, verdict);
          });
          assert.strictEqual(calls, 1);
          assert.isFalse(result.workflowPassed);
        }
      }
    });

    it("rejects a weekly successor that reuses run, profile, or manifest identity", async function () {
      for (const field of [
        "runId",
        "profileIdentity",
        "manifestReference",
      ] as const) {
        const first = attempt(1, "failed");
        const second = attempt(2, "passed");
        second[field] = first[field];
        let calls = 0;
        try {
          await runWeeklyRetryPolicy("weekly", async () =>
            calls++ === 0 ? first : second,
          );
          assert.fail(`expected reused ${field} to fail`);
        } catch (error) {
          assert.match(String(error), /successor_identity_reused/);
        }
      }
    });
  });

  describe("compatibility workflow wiring", function () {
    it("runs the non-blocking PR E2E cell without a path filter", async function () {
      const workflow = parseYaml(
        await fs.readFile(".github/workflows/ci.yml", "utf8"),
      ) as any;
      assert.deepEqual(workflow.on.pull_request.branches, ["main"]);
      assert.notProperty(workflow.on.pull_request, "paths");
      assert.notProperty(workflow.on.pull_request, "paths-ignore");
      assert.property(workflow.jobs, "compatibility-e2e-linux-candidate");
      assert.property(workflow.jobs, "zotero-compatibility-evidence");
      assert.notMatch(
        String(workflow.jobs["zotero-compatibility-evidence"].if || ""),
        /pull_request/,
      );
      assert.include(
        workflow.jobs["zotero-compatibility-evidence"].steps.find(
          (step: { name?: string }) =>
            step.name === "Run real Zotero compatibility evidence cell",
        ).run,
        "--domain \"${{ matrix.domain || 'all' }}\"",
      );
    });

    it("finishes tag-bound Linux and Windows evidence before publication", async function () {
      const workflow = parseYaml(
        await fs.readFile(".github/workflows/release.yml", "utf8"),
      ) as any;
      const publish = workflow.jobs["create-release"];

      assert.deepEqual(workflow.on.push.tags, ["v**"]);
      assert.property(workflow.jobs, "release-e2e-candidate");
      assert.deepEqual(
        workflow.jobs["release-e2e-candidate"].strategy.matrix.include.map(
          (entry: { platform: string }) => entry.platform,
        ),
        ["linux-x64", "windows-x64"],
      );
      assert.property(workflow.jobs, "release-compatibility-evidence");
      assert.includeMembers(publish.needs, [
        "release-compatibility-blocking",
        "release-compatibility-evidence",
      ]);
      assert.notInclude(
        publish.steps.map((step: { name?: string }) => step.name),
        "Build plugin",
      );
      assert.strictEqual(
        zoteroPluginConfig.release.bumpp.execute,
        "npm run check:synthesis-sidecar-runtime-xpi",
      );
    });

    it("wires weekly, stress, and manual-gold as non-gating evidence", async function () {
      const workflow = parseYaml(
        await fs.readFile(".github/workflows/system-e2e-evidence.yml", "utf8"),
      ) as any;
      assert.lengthOf(workflow.on.schedule, 2);
      assert.includeMembers(workflow.on.workflow_dispatch.inputs.lane.options, [
        "weekly",
        "stress",
        "manual-gold",
      ]);
      assert.isTrue(workflow.jobs.evidence["continue-on-error"]);
      assert.include(
        workflow.jobs.evidence.steps.find(
          (step: { name?: string }) => step.name === "Run evidence cell",
        ).env.ZOTERO_E2E_GOLD_DATA_DIR,
        "vars.ZOTERO_E2E_GOLD_DATA_DIR",
      );
      assert.include(
        workflow.jobs.evidence.steps.find(
          (step: { name?: string }) => step.name === "Run evidence cell",
        ).run,
        "weekly-run",
      );
    });

    it("bootstraps non-publishing calibration lanes from tags and a debug dispatch", async function () {
      const workflowSource = await fs.readFile(
        ".github/workflows/system-e2e-evidence.yml",
        "utf8",
      );
      const workflow = parseYaml(workflowSource) as any;
      const laneStep = workflow.jobs.prepare.steps.find(
        (step: { name?: string }) => step.name === "Select evidence lane",
      );
      const planStep = workflow.jobs.prepare.steps.find(
        (step: { name?: string }) => step.name === "Resolve evidence matrix",
      );

      assert.deepEqual(workflow.on.push.tags, [
        "e2e-calibration-pr-*",
        "e2e-calibration-main-*",
        "e2e-calibration-release-*",
      ]);
      assert.include(laneStep.run, "e2e-calibration-pr-*) lane=pull-request");
      assert.include(laneStep.run, "e2e-calibration-main-*) lane=main");
      assert.include(laneStep.run, "e2e-calibration-release-*) lane=release");
      assert.notInclude(laneStep.run, "e2e-calibration-cg02");
      // CG-02 reads the close lifecycle out of the debug-only crash journal,
      // which a production build elides, and the plugin build shape follows the
      // checked-out branch. A calibration tag is a detached production build, so
      // the lane is dispatched on a debug branch instead of triggered by a tag.
      assert.deepEqual(workflow.on.workflow_dispatch.inputs.lane.options, [
        "weekly",
        "stress",
        "manual-gold",
        "cg-02-windows",
      ]);
      assert.include(
        workflow.jobs["prepare-windows"].if,
        "needs.prepare.outputs.lane == 'release'",
      );
      // The CG-02 lane runs on Windows, so it needs the Windows candidate too.
      assert.include(
        workflow.jobs["prepare-windows"].if,
        "needs.prepare.outputs.lane == 'cg-02-windows'",
      );
      assert.include(planStep.run, 'select(.domain == "e2e")');
      assert.include(
        workflow.jobs.evidence.steps.find(
          (step: { name?: string }) => step.name === "Upload evidence",
        ).with.path,
        "artifacts/test-diagnostics/system-e2e",
      );
      assert.notInclude(workflowSource, "npm run release");
    });

    it("runs a promoted E2E cell from the prepared candidate in a hard gate", async function () {
      for (const [file, jobId, candidateJob, candidateArtifact] of [
        [
          ".github/workflows/ci.yml",
          "zotero-compatibility-e2e-blocking",
          "compatibility-e2e-linux-candidate",
          "compatibility-e2e-linux-x64",
        ],
        [
          ".github/workflows/release.yml",
          "release-compatibility-e2e-blocking",
          "release-e2e-candidate",
          "release-e2e-${{ matrix.platform }}",
        ],
      ] as const) {
        const workflow = parseYaml(await fs.readFile(file, "utf8")) as any;
        const plan =
          workflow.jobs[
            Object.keys(workflow.jobs).find((id) =>
              id.endsWith("compatibility-plan"),
            )!
          ];
        const lane = workflow.jobs[jobId];

        assert.include(
          plan.steps.find((step: { name?: string }) =>
            String(step.name).startsWith("Resolve "),
          ).run,
          'select(.blocking and .domain != "e2e")',
        );
        assert.include(
          plan.steps.find((step: { name?: string }) =>
            String(step.name).startsWith("Resolve "),
          ).run,
          'select(.blocking and .domain == "e2e")',
        );
        assert.property(lane, "needs", jobId);
        assert.includeMembers(lane.needs, [candidateJob]);
        assert.notProperty(lane, "continue-on-error");
        assert.include(
          lane.steps.find(
            (step: { name?: string }) =>
              step.name === "Download platform E2E candidate" ||
              step.name === "Download immutable E2E candidate",
          ).with.name,
          candidateArtifact,
        );
      }
    });

    it("publishes a release only after the promoted E2E lane succeeds or stays empty", async function () {
      const workflow = parseYaml(
        await fs.readFile(".github/workflows/release.yml", "utf8"),
      ) as any;
      const publish = workflow.jobs["create-release"];

      assert.includeMembers(publish.needs, [
        "release-compatibility-e2e-blocking",
      ]);
      const condition = String(publish.if).replace(/\s+/g, " ");
      assert.include(
        condition,
        "needs.release-compatibility-e2e-blocking.result == 'success'",
      );
      assert.include(
        condition,
        "needs.release-compatibility-e2e-blocking.result == 'skipped'",
      );
      assert.notInclude(condition, "failure");
    });

    it("resolves a manually dispatched compatibility gate without publishing", async function () {
      const workflow = parseYaml(
        await fs.readFile(".github/workflows/ci.yml", "utf8"),
      ) as any;
      const planStep = workflow.jobs["compatibility-plan"].steps.find(
        (step: { name?: string }) => String(step.name).startsWith("Resolve "),
      );

      assert.deepEqual(workflow.on.workflow_dispatch.inputs.gate.options, [
        "pull-request",
        "main",
      ]);
      assert.include(planStep.run, "gate=pull-request");
      assert.include(planStep.run, "github.event_name");
      assert.include(planStep.run, 'echo "gate=$gate"');
      // The candidate writes the lane into its artifact identity, so it has to
      // take the resolved gate instead of the event name.
      assert.strictEqual(
        workflow.jobs["compatibility-e2e-linux-candidate"].steps.find(
          (step: { name?: string }) =>
            step.name === "Prepare current-source Linux sidecar once",
        ).env.ZOTERO_COMPAT_LANE,
        "${{ needs.compatibility-plan.outputs.gate }}",
      );
      assert.notProperty(workflow.jobs, "create-release");
    });
  });

  describe("archive safety", function () {
    it("passes Windows archives to tar as a local basename", function () {
      assert.deepEqual(
        resolveLocalArchiveCommandLocation(
          "D:\\a\\_temp\\zotero-host-cache\\archives\\host.zip",
        ),
        {
          cwd: "D:\\a\\_temp\\zotero-host-cache\\archives",
          archiveName: "host.zip",
        },
      );
    });

    it("extracts Windows ZIP hosts with the native archive command", function () {
      assert.deepEqual(
        resolveZipExtractionCommand({
          archivePath: "D:\\cache\\host.zip",
          stagingRoot: "D:\\runs\\host",
          platform: "win32",
        }),
        {
          file: "powershell",
          args: [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('D:\\cache\\host.zip', 'D:\\runs\\host')",
          ],
        },
      );
    });

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

    it("persists host facts received by the System E2E event sink", async function () {
      const event = {
        type: "debug",
        data: {
          kind: "zotero-compatibility-host-facts",
          version: "10.0.1",
          appBuildId: "20260918000000",
        },
      };

      assert.isTrue(await persistCompatibilityHostFactsEvent(tempRoot, event));
      assert.deepEqual(
        JSON.parse(
          await fs.readFile(
            path.join(tempRoot, "diagnostics", "host-facts.json"),
            "utf8",
          ),
        ),
        event.data,
      );
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

    it("keeps a sidecar session inside the Windows path budget", async function () {
      const manifest = await loadCompatibilityManifest(MATRIX_PATH);
      // The deepest planned target decides the budget, so a longer target id
      // cannot quietly push the session path past the limit.
      const deepestTarget = manifest.targets
        .map((target) => target.id)
        .reduce((longest, candidate) =>
          candidate.length > longest.length ? candidate : longest,
        );
      // Measured against the CI runner's own run root, and normalised so the
      // budget does not depend on this machine's temp directory.
      const canonicalRootLength = "D:\\a\\_temp\\zotero-compat-runs".length;
      const budgetRoot = path.join(tempRoot, "budget");
      const cell = await createRunLayout(budgetRoot, deepestTarget);
      const segment = await createRunLayout(cell.root, "e2e");
      const paths = getRuntimePersistencePaths(segment.root);
      const lifecycle = getSynthesisSidecarLifecyclePaths({
        runtimeRoot: paths.runtimeRoot,
        profileId: "a".repeat(64),
        supervisorInstanceId: `sup-${"b".repeat(32)}`,
      });
      const onRunner = (value: string) =>
        canonicalRootLength + (value.length - budgetRoot.length);

      // The persistence layer owns the only `runtime` level below the run root.
      assert.strictEqual(paths.runtimeRoot, path.join(segment.root, "runtime"));
      assert.isAtMost(onRunner(lifecycle.sessionRoot), 244);
      assert.isAtMost(onRunner(lifecycle.configPath), 250);
      assert.isAtMost(onRunner(lifecycle.discoveryPath), 250);
      // The deepest writer under the run root is the System E2E test seam, which
      // shares checkpoint files with the sidecar.
      assert.isAtMost(
        onRunner(
          path.join(
            segment.root,
            "test-checkpoints",
            `${"n".repeat(32)}.release`,
          ),
        ),
        250,
      );
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

    it("retains e2e routing in a compatibility receipt", function () {
      const receipt = createCompatibilityReceipt({
        runId: "e2e-run",
        source: { commit: "abc123", dirty: false },
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
        execution: { mode: "behavior", suite: "full", domain: "e2e" },
      });

      assert.deepEqual(receipt.execution, {
        mode: "behavior",
        suite: "full",
        domain: "e2e",
      });
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

    it("preserves a failed worker exit code", async function () {
      const result = await runOwnedCommand({
        command: process.execPath,
        args: ["-e", "process.exit(7)"],
        cwd: tempRoot,
        env: process.env,
        stdoutPath: path.join(tempRoot, "failed.stdout.log"),
        stderrPath: path.join(tempRoot, "failed.stderr.log"),
        timeoutMs: 1_000,
      });

      assert.strictEqual(result.exitCode, 7);
      assert.isFalse(result.timedOut);
    });

    it("keeps the Run Manifest reference of a cell terminated at its deadline", async function () {
      const manifestPath = path.join(
        process.cwd(),
        "artifacts/test-diagnostics/system-e2e/terminated-run/run-manifest.json",
      );
      const stdoutPath = path.join(tempRoot, "terminated.stdout.log");
      const result = await runOwnedCommand({
        command: process.execPath,
        args: [
          "-e",
          "console.log(process.env.ZOTERO_TEST_MANIFEST_REFERENCE);setInterval(() => {}, 1000)",
        ],
        cwd: process.cwd(),
        env: {
          ...process.env,
          ZOTERO_TEST_MANIFEST_REFERENCE:
            describeRunManifestReference(manifestPath),
        },
        stdoutPath,
        stderrPath: path.join(tempRoot, "terminated.stderr.log"),
        timeoutMs: 500,
        gracefulTimeoutMs: 500,
      });

      assert.isTrue(result.timedOut);
      assert.strictEqual(
        parseCompatibilityRunManifestReference(
          await fs.readFile(stdoutPath, "utf8"),
        ),
        "artifacts/test-diagnostics/system-e2e/terminated-run/run-manifest.json",
      );
    });

    it("captures the sidecar runtime state a cell leaves before cleanup", async function () {
      const layout = await createRunLayout(tempRoot, "zotero-10-windows-x64");
      const paths = getRuntimePersistencePaths(layout.runtime);
      const sidecar = getSynthesisSidecarRuntimePaths(paths.runtimeRoot);
      const installedManifest = {
        schema: "synthesis-sidecar-runtime-bundle.v3",
        bundleId: "bundle-1",
        implementation: "rust-native",
        serviceVersion: "0.1.0",
        protocolVersion: "synthesis-sidecar.v1",
        target: "win32-x64",
        targetTriple: "x86_64-pc-windows-msvc",
        executable: "synthesis-sidecar.exe",
        buildFingerprint: "f".repeat(64),
        capabilities: ["system"],
        createdAt: "2026-09-18T00:00:00.000Z",
        expiresAt: null,
        provenance: {
          sourceFingerprint: "a".repeat(64),
          toolchain: "nightly-2026-07-25",
          cargoLockSha256: "b".repeat(64),
          licenseInventory: "licenses.json",
        },
        files: [
          {
            path: "synthesis-sidecar.exe",
            bytes: 4,
            sha256: "c".repeat(64),
            executable: true,
          },
        ],
      };
      await fs.mkdir(sidecar.currentDir, { recursive: true });
      await fs.writeFile(
        path.join(sidecar.currentDir, "manifest.json"),
        `${JSON.stringify(installedManifest)}\n`,
      );
      await fs.writeFile(
        path.join(sidecar.currentDir, "synthesis-sidecar.exe"),
        "exe!",
      );
      const writeSession = async (
        profile: string,
        session: string,
        discovery: unknown,
      ) => {
        const sessionRoot = path.join(
          sidecar.profilesDir,
          profile,
          "sessions",
          session,
        );
        await fs.mkdir(sessionRoot, { recursive: true });
        await fs.writeFile(
          path.join(sessionRoot, "discovery.json"),
          `${JSON.stringify(discovery)}\n`,
        );
      };
      await writeSession("profile-1", "session-1", {
        lifecycleState: "ready",
        bundleId: "bundle-1",
        pid: 4242,
      });
      await writeSession("profile-1", "session-2", {
        lifecycleState: "starting",
        bundleId: "bundle-0",
        pid: 4243,
      });
      await fs.mkdir(paths.logsDir, { recursive: true });
      const launchFailureDetails = {
        code: "sidecar_crash_loop_fused",
        lastFailureCode: "[Exception...",
        restartCount: 4,
        exitCode: null,
        stage: "pre-create",
        step: "runtime-directory",
        errorName: "NS_ERROR_FILE_NAME_TOO_LONG",
        errorNumber: "0x80520011",
        attemptedChars: 305,
      };
      await fs.writeFile(
        paths.runtimeLogPath,
        `${JSON.stringify({
          entries: [
            {
              component: "synthesis-sidecar-runtime",
              operation: "launch",
              stage: "failed",
              details: launchFailureDetails,
            },
          ],
        })}\n`,
      );

      const written = await collectCellRuntimeEvidence({
        runtimeRootOverride: layout.runtime,
        diagnosticsDir: layout.diagnostics,
      });

      const evidencePath = path.join(
        layout.diagnostics,
        "sidecar-runtime-evidence.json",
      );
      assert.include(written, evidencePath);
      const evidence = JSON.parse(await fs.readFile(evidencePath, "utf8"));
      assert.strictEqual(
        evidence.schemaVersion,
        "system-e2e-sidecar-runtime-evidence.v1",
      );
      assert.isTrue(evidence.install.present);
      assert.strictEqual(evidence.install.target, "win32-x64");
      assert.strictEqual(evidence.install.bundleId, "bundle-1");
      assert.strictEqual(evidence.install.missingFiles, 0);
      assert.deepEqual(
        evidence.sessions.map(
          (session: { lifecycleState: string; bundleIdMatched: boolean }) => [
            session.lifecycleState,
            session.bundleIdMatched,
          ],
        ),
        [
          ["ready", true],
          ["starting", false],
        ],
      );
      assert.isTrue(evidence.runtimeLog.present);
      assert.isTrue(evidence.runtimeLog.captured);
      // The classification a launch failure carries has to reach the uploaded
      // diagnostics unchanged, because this copy is the only channel from the
      // plugin to a cell's evidence directory.
      const capturedLog = JSON.parse(
        await fs.readFile(
          path.join(layout.diagnostics, "runtime-logs.json"),
          "utf8",
        ),
      );
      assert.deepEqual(capturedLog.entries[0].details, launchFailureDetails);
      assert.notInclude(await fs.readFile(evidencePath, "utf8"), tempRoot);
    });

    it("records an empty sidecar observation when a cell never installed the runtime", async function () {
      const layout = await createRunLayout(tempRoot, "zotero-10-linux-x64");

      const written = await collectCellRuntimeEvidence({
        runtimeRootOverride: layout.runtime,
        diagnosticsDir: layout.diagnostics,
      });

      const evidence = JSON.parse(
        await fs.readFile(
          path.join(layout.diagnostics, "sidecar-runtime-evidence.json"),
          "utf8",
        ),
      );
      assert.isFalse(evidence.install.present);
      assert.deepEqual(evidence.sessions, []);
      assert.isFalse(evidence.runtimeLog.present);
      assert.lengthOf(written, 1);
    });

    it("rejects plugin or sidecar identity drift across a worker", function () {
      const expected = {
        pluginDigest: "a".repeat(64),
        sidecarFingerprint: "b".repeat(64),
        lane: "release" as const,
        sourceCommit: "c".repeat(40),
        sourceRef: "refs/tags/v0.9.0",
        sidecarTarget: "linux-x64",
      };
      assert.doesNotThrow(() =>
        assertCompatibilityArtifactIdentity(expected, expected),
      );
      assert.throws(
        () =>
          assertCompatibilityArtifactIdentity(expected, {
            ...expected,
            pluginDigest: "c".repeat(64),
          }),
        /plugin/i,
      );
      assert.throws(
        () =>
          assertCompatibilityArtifactIdentity(expected, {
            ...expected,
            sidecarFingerprint: "d".repeat(64),
          }),
        /sidecar/i,
      );
      assert.throws(
        () =>
          assertCompatibilityArtifactIdentity(expected, {
            ...expected,
            lane: "main",
            sourceRef: "refs/heads/main",
          }),
        /lane/i,
      );
      assert.throws(
        () =>
          assertCompatibilityArtifactIdentity(
            { ...expected, sourceRef: "refs/heads/main" },
            { ...expected, sourceRef: "refs/heads/main" },
          ),
        /tag-bound/i,
      );
    });

    it("retains one workspace-relative Run Manifest reference per E2E invocation", function () {
      assert.strictEqual(
        parseCompatibilityRunManifestReference(
          `${describeRunManifestReference(
            path.join(
              process.cwd(),
              "artifacts/test-diagnostics/system-e2e/run-1/run-manifest.json",
            ),
          )}\n`,
          process.cwd(),
        ),
        "artifacts/test-diagnostics/system-e2e/run-1/run-manifest.json",
      );
      assert.throws(
        () => parseCompatibilityRunManifestReference("runner ended\n"),
        /run_manifest_reference_missing/,
      );
    });
  });
});

import { assert } from "chai";
import { promises as fs } from "node:fs";
import {
  beginSynthesisSidecarStartupAttempt,
  getSynthesisSidecarDiagnosticSnapshot,
  recordSynthesisSidecarStartupPhase,
  resetSynthesisSidecarDiagnosticsForTests,
  synthesisSidecarDiagnosticCode,
} from "../../src/modules/synthesisSidecarDiagnostics";
import {
  buildRuntimeIssueDiagnosticBundle,
  clearRuntimeLogs,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";

describe("Synthesis sidecar debug observability", function () {
  beforeEach(function () {
    setDebugModeOverrideForTests(true);
    resetSynthesisSidecarDiagnosticsForTests();
    void clearRuntimeLogs();
  });

  afterEach(function () {
    setDebugModeOverrideForTests(undefined);
    resetSynthesisSidecarDiagnosticsForTests();
  });

  it("projects one correlated startup attempt into snapshot and runtime logs", function () {
    const attemptId = beginSynthesisSidecarStartupAttempt();
    recordSynthesisSidecarStartupPhase({
      attemptId,
      phase: "runtime-install",
      status: "running",
      evidence: {
        bundleId: "bundle-1",
        runtimeRoot: "/profile/zotero-agents",
      },
    });
    recordSynthesisSidecarStartupPhase({
      attemptId,
      phase: "runtime-install",
      status: "failed",
      code: "sidecar_runtime_missing",
      error: new Error("sidecar_runtime_missing"),
    });

    const snapshot = getSynthesisSidecarDiagnosticSnapshot();
    assert.equal(snapshot?.attemptId, attemptId);
    assert.equal(snapshot?.phase, "runtime-install");
    assert.equal(snapshot?.status, "failed");
    assert.equal(snapshot?.code, "sidecar_runtime_missing");
    assert.deepEqual(snapshot?.evidence, {
      bundleId: "bundle-1",
      runtimeRoot: "/profile/zotero-agents",
    });

    const logs = listRuntimeLogs({
      component: "synthesis-sidecar-lifecycle",
      operation: "production-startup",
      order: "asc",
    });
    assert.deepEqual(
      logs.map((entry) => [entry.phase, entry.stage]),
      [
        ["startup", "started"],
        ["runtime-install", "running"],
        ["runtime-install", "failed"],
      ],
    );
    assert.isTrue(logs.every((entry) => entry.requestId === attemptId));
    assert.deepEqual(
      buildRuntimeIssueDiagnosticBundle({
        includeDebug: true,
      }).debugContext?.synthesisSidecar,
      snapshot,
    );
  });

  it("prefers structured runtime-admission reasons over prose", function () {
    const error = {
      code: "conflict",
      message: "The admitted native owner does not match this runtime",
      details: { reason: "runtime_mismatch" },
    };
    assert.equal(synthesisSidecarDiagnosticCode(error), "runtime_mismatch");
    assert.equal(
      synthesisSidecarDiagnosticCode(
        new Error("The admitted native owner does not match this runtime"),
      ),
      "synthesis_sidecar_startup_failed",
    );

    const attemptId = beginSynthesisSidecarStartupAttempt();
    recordSynthesisSidecarStartupPhase({
      attemptId,
      phase: "runtime-admission",
      status: "running",
      evidence: {
        currentBuildFingerprint: "a".repeat(64),
        targetBuildFingerprint: "b".repeat(64),
      },
    });
    recordSynthesisSidecarStartupPhase({
      attemptId,
      phase: "runtime-admission",
      status: "failed",
      code: synthesisSidecarDiagnosticCode(error),
      error,
    });
    const snapshot = getSynthesisSidecarDiagnosticSnapshot();
    assert.equal(snapshot?.phase, "runtime-admission");
    assert.equal(snapshot?.code, "runtime_mismatch");
    assert.equal(snapshot?.evidence.currentBuildFingerprint, "a".repeat(64));
    assert.equal(snapshot?.evidence.targetBuildFingerprint, "b".repeat(64));
  });

  it("does not retain diagnostic state outside debug mode", function () {
    setDebugModeOverrideForTests(false);
    const attemptId = beginSynthesisSidecarStartupAttempt();
    recordSynthesisSidecarStartupPhase({
      attemptId,
      phase: "runtime-install",
      status: "failed",
      code: "sidecar_runtime_missing",
    });

    assert.isUndefined(getSynthesisSidecarDiagnosticSnapshot());
    assert.lengthOf(
      listRuntimeLogs({
        component: "synthesis-sidecar-lifecycle",
      }),
      0,
    );
  });

  it("ignores stale events from an earlier attempt", function () {
    const staleAttempt = beginSynthesisSidecarStartupAttempt();
    const currentAttempt = beginSynthesisSidecarStartupAttempt();
    recordSynthesisSidecarStartupPhase({
      attemptId: staleAttempt,
      phase: "backup",
      status: "failed",
      code: "stale_failure",
    });

    assert.equal(
      getSynthesisSidecarDiagnosticSnapshot()?.attemptId,
      currentAttempt,
    );
    assert.equal(getSynthesisSidecarDiagnosticSnapshot()?.phase, "startup");
  });

  it("bounds process tails and redacts credential-shaped values", function () {
    const attemptId = beginSynthesisSidecarStartupAttempt();
    recordSynthesisSidecarStartupPhase({
      attemptId,
      phase: "supervisor-launch",
      status: "failed",
      evidence: {
        stderrTail: `${"x".repeat(20_000)} clientToken=private-value`,
      },
    });

    const tail =
      getSynthesisSidecarDiagnosticSnapshot()?.evidence.stderrTail || "";
    assert.isAtMost(tail.length, 8_192);
    assert.notInclude(tail, "private-value");
    assert.include(tail, "<redacted>");
  });

  it("binds the debug-mode constant in the independent Workbench bundle", async function () {
    const config = await fs.readFile("zotero-plugin.config.ts", "utf8");
    const workbenchEntry = config.indexOf(
      'entryPoints: ["src/synthesisWorkbenchApp.ts"]',
    );
    const nextEntry = config.indexOf(
      'entryPoints: ["src/workspaceApp.ts"]',
      workbenchEntry,
    );
    assert.isAtLeast(workbenchEntry, 0);
    assert.isAbove(nextEntry, workbenchEntry);
    const workbenchBuild = config.slice(workbenchEntry, nextEntry);

    assert.include(workbenchBuild, "__debug_mode__: String(DEBUG_MODE)");
    assert.include(workbenchBuild, "minifySyntax: true");
  });
});

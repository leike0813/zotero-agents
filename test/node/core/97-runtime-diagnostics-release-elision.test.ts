import { assert } from "chai";
import { promises as fs } from "node:fs";
import { checkRuntimeDiagnosticsReleaseElision } from "../../../scripts/check-runtime-diagnostics-release-elision";

describe("runtime diagnostics release elision", function () {
  this.timeout(30_000);

  it("removes every diagnostic group from disabled bundles", async function () {
    const result = await checkRuntimeDiagnosticsReleaseElision();
    for (const name of [
      "profiler",
      "recorder",
      "replay",
      "skillRunnerAudit",
    ] as const) {
      assert.equal(result.releaseBytes[name], 0);
      assert.equal(result.sourceDisabledBytes[name], 0);
      assert.isAbove(result.debugBytes[name], 0);
    }
    assert.equal(result.releaseExclusiveBytes, 0);
    assert.deepEqual(result.retainedProductionContractMarkers, [
      "synthesis-sidecar-observation.v2",
    ]);
    assert.include(result.retainedStaticMarkers, "acp-trace-replay");
    assert.isTrue(result.releaseReplayOutputEqual);
  });

  it("uses one manifest for build classification and real-entry marker checks", async function () {
    const [esbuildSource, checkerSource, dashboardSource] = await Promise.all([
      fs.readFile("scripts/runtime-diagnostics-esbuild.ts", "utf8"),
      fs.readFile(
        "scripts/check-runtime-diagnostics-release-elision.ts",
        "utf8",
      ),
      fs.readFile("addon/content/dashboard/app.js", "utf8"),
    ]);
    assert.include(esbuildSource, "runtime-diagnostics-production-manifest");
    assert.include(checkerSource, "runtime-diagnostics-production-manifest");
    assert.notInclude(checkerSource, "const GROUPS =");
    assert.include(checkerSource, "forbiddenRuntimeMarkers");
    assert.include(dashboardSource, "acp-trace-replay");
  });

  it("keeps production timer scheduling independent from replay context", async function () {
    const sources = await Promise.all(
      [
        "src/modules/acpSkillRunPersistence.ts",
        "src/modules/acpSkillRunWorkspaceDataPlane.ts",
        "src/modules/acpSkillRunStore.ts",
        "src/modules/acpSessionManager.ts",
        "src/modules/assistantWorkspacePublicationRuntime.ts",
      ].map((path) => fs.readFile(path, "utf8")),
    );
    const scheduleBodies = [
      /function scheduleSoftRunPersist[\s\S]*?function flushSoftRunPersists/.exec(
        sources[0],
      )?.[0],
      /function scheduleWorkspaceChangedEmit[\s\S]*?export function inspectSyntheticAcpSkillRunReplayTimers/.exec(
        sources[1],
      )?.[0],
      /function schedulePersistenceFlush[\s\S]*?function scheduleWorkspaceChange/.exec(
        sources[3],
      )?.[0],
      /function scheduleWorkspaceChange[\s\S]*?export function inspectSyntheticAcpChatReplayTimers/.exec(
        sources[3],
      )?.[0],
      /private queue[\s\S]*?private async flushPending/.exec(sources[4])?.[0],
    ];
    for (const body of scheduleBodies) {
      assert.isString(body);
      assert.include(body || "", "setTimeout(");
      assert.notInclude(body || "", "getAcpRuntimeReplayProfileContext");
      assert.notInclude(body || "", "logicalTime");
    }
    for (const source of sources) {
      assert.notMatch(
        source,
        /import\s+\{[^}]*\}\s+from\s+["']\.\/acpRuntimeReplayLogicalTime["']/,
      );
    }
  });
});

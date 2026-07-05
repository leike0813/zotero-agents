import { assert } from "chai";
import {
  cleanupBackgroundRuntimeForZoteroTests,
  setBackgroundRuntimeCleanupDepsForTests,
} from "../../../src/modules/testRuntimeCleanup";
import {
  getManagedLocalRuntimeLoopStateForTests,
  resetManagedLocalRuntimeLoopsForTests,
  setSuppressManagedRuntimeAutoEnsureTriggerForTests,
  setLocalRuntimeAutoPullEnabled,
} from "../../../src/modules/skillRunnerLocalRuntimeManager";

describe("zotero test background cleanup harness", function () {
  afterEach(function () {
    setBackgroundRuntimeCleanupDepsForTests();
    resetManagedLocalRuntimeLoopsForTests();
  });

  it("stops and resets all known background runtime surfaces in a fixed order", async function () {
    const calls: string[] = [];
    const mark = (name: string) => () => {
      calls.push(name);
    };

    setBackgroundRuntimeCleanupDepsForTests({
      resetSkillRunnerRunDialogForTests: async () => {
        calls.push("resetSkillRunnerRunDialogForTests");
      },
      resetTaskManagerDialogRuntimeForTests: async () => {
        calls.push("resetTaskManagerDialogRuntimeForTests");
      },
      resetSkillRunnerTaskReconcilerForTests: mark(
        "resetSkillRunnerTaskReconcilerForTests",
      ),
      resetSkillRunnerSessionSyncForTests: mark(
        "resetSkillRunnerSessionSyncForTests",
      ),
      stopSkillRunnerModelCacheAutoRefresh: mark(
        "stopSkillRunnerModelCacheAutoRefresh",
      ),
      resetManagedLocalRuntimeLoopsForTests: mark(
        "resetManagedLocalRuntimeLoopsForTests",
      ),
      resetManagedLocalRuntimeStateChangeListenersForTests: mark(
        "resetManagedLocalRuntimeStateChangeListenersForTests",
      ),
      resetLocalRuntimeToastStateForTests: mark(
        "resetLocalRuntimeToastStateForTests",
      ),
      resetSkillRunnerBackendHealthRegistryForTests: mark(
        "resetSkillRunnerBackendHealthRegistryForTests",
      ),
      resetPluginStateStoreForTests: mark("resetPluginStateStoreForTests"),
      setSkillRunnerBackendReconcileFailureToastEmitterForTests: mark(
        "setSkillRunnerBackendReconcileFailureToastEmitterForTests",
      ),
      setSkillRunnerTaskLifecycleToastEmitterForTests: mark(
        "setSkillRunnerTaskLifecycleToastEmitterForTests",
      ),
      resetWorkflowTasks: mark("resetWorkflowTasks"),
      clearRuntimeLogs: mark("clearRuntimeLogs"),
      resetWorkflowSettingsReadDiagnosticsForTests: mark(
        "resetWorkflowSettingsReadDiagnosticsForTests",
      ),
      resetTestPerformanceProbeHooksForTests: mark(
        "resetTestPerformanceProbeHooksForTests",
      ),
      resetWorkflowHostApiForTests: mark("resetWorkflowHostApiForTests"),
      clearPackageHookBundleCacheForTests: mark(
        "clearPackageHookBundleCacheForTests",
      ),
      resetWorkflowToastStateForTests: mark("resetWorkflowToastStateForTests"),
      clearWorkflowRuntimeBridgeForTests: mark(
        "clearWorkflowRuntimeBridgeForTests",
      ),
      setDebugModeOverrideForTests: mark("setDebugModeOverrideForTests"),
      setDiagnosticVerboseOverrideForTests: mark(
        "setDiagnosticVerboseOverrideForTests",
      ),
      setSkillRunnerInteractiveAutoReplyEnabledForTests: mark(
        "setSkillRunnerInteractiveAutoReplyEnabledForTests",
      ),
      resetWorkflowRuntimeForTests: mark("resetWorkflowRuntimeForTests"),
    });

    await cleanupBackgroundRuntimeForZoteroTests();

    assert.deepEqual(calls, [
      "resetSkillRunnerRunDialogForTests",
      "resetTaskManagerDialogRuntimeForTests",
      "resetSkillRunnerTaskReconcilerForTests",
      "resetSkillRunnerSessionSyncForTests",
      "stopSkillRunnerModelCacheAutoRefresh",
      "resetManagedLocalRuntimeLoopsForTests",
      "resetManagedLocalRuntimeStateChangeListenersForTests",
      "resetLocalRuntimeToastStateForTests",
      "resetSkillRunnerBackendHealthRegistryForTests",
      "resetPluginStateStoreForTests",
      "setSkillRunnerBackendReconcileFailureToastEmitterForTests",
      "setSkillRunnerTaskLifecycleToastEmitterForTests",
      "resetWorkflowTasks",
      "clearRuntimeLogs",
      "resetWorkflowSettingsReadDiagnosticsForTests",
      "resetTestPerformanceProbeHooksForTests",
      "resetWorkflowHostApiForTests",
      "clearPackageHookBundleCacheForTests",
      "resetWorkflowToastStateForTests",
      "clearWorkflowRuntimeBridgeForTests",
      "setDebugModeOverrideForTests",
      "setDiagnosticVerboseOverrideForTests",
      "setSkillRunnerInteractiveAutoReplyEnabledForTests",
      "resetWorkflowRuntimeForTests",
    ]);
  });

  it("awaits async reconciler reset before subsequent cleanup steps", async function () {
    const calls: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    setBackgroundRuntimeCleanupDepsForTests({
      resetSkillRunnerRunDialogForTests: async () => {
        calls.push("resetSkillRunnerRunDialogForTests");
      },
      resetTaskManagerDialogRuntimeForTests: async () => {
        calls.push("resetTaskManagerDialogRuntimeForTests");
      },
      resetSkillRunnerTaskReconcilerForTests: async () => {
        calls.push("resetSkillRunnerTaskReconcilerForTests:start");
        await gate;
        calls.push("resetSkillRunnerTaskReconcilerForTests:end");
      },
      resetSkillRunnerSessionSyncForTests: () => {
        calls.push("resetSkillRunnerSessionSyncForTests");
      },
    });

    const cleanupPromise = cleanupBackgroundRuntimeForZoteroTests();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (calls.includes("resetSkillRunnerTaskReconcilerForTests:start")) {
        break;
      }
      await Promise.resolve();
    }
    assert.deepEqual(calls, [
      "resetSkillRunnerRunDialogForTests",
      "resetTaskManagerDialogRuntimeForTests",
      "resetSkillRunnerTaskReconcilerForTests:start",
    ]);

    release();
    await cleanupPromise;

    assert.includeMembers(calls, [
      "resetSkillRunnerTaskReconcilerForTests:end",
      "resetSkillRunnerSessionSyncForTests",
    ]);
    assert.isAbove(
      calls.indexOf("resetSkillRunnerSessionSyncForTests"),
      calls.indexOf("resetSkillRunnerTaskReconcilerForTests:end"),
    );
  });

  it("is idempotent across repeated cleanup calls", async function () {
    let calls = 0;
    setBackgroundRuntimeCleanupDepsForTests({
      resetSkillRunnerRunDialogForTests: async () => {
        calls += 1;
      },
      resetTaskManagerDialogRuntimeForTests: async () => {
        calls += 1;
      },
      resetSkillRunnerTaskReconcilerForTests: () => {
        calls += 1;
      },
      resetSkillRunnerSessionSyncForTests: () => {
        calls += 1;
      },
      stopSkillRunnerModelCacheAutoRefresh: () => {
        calls += 1;
      },
      resetManagedLocalRuntimeLoopsForTests: () => {
        calls += 1;
      },
      resetManagedLocalRuntimeStateChangeListenersForTests: () => {
        calls += 1;
      },
      resetLocalRuntimeToastStateForTests: () => {
        calls += 1;
      },
      resetSkillRunnerBackendHealthRegistryForTests: () => {
        calls += 1;
      },
      resetPluginStateStoreForTests: () => {
        calls += 1;
      },
      setSkillRunnerBackendReconcileFailureToastEmitterForTests: () => {
        calls += 1;
      },
      setSkillRunnerTaskLifecycleToastEmitterForTests: () => {
        calls += 1;
      },
      resetWorkflowTasks: () => {
        calls += 1;
      },
      clearRuntimeLogs: () => {
        calls += 1;
      },
      resetWorkflowSettingsReadDiagnosticsForTests: () => {
        calls += 1;
      },
      resetTestPerformanceProbeHooksForTests: () => {
        calls += 1;
      },
      resetWorkflowHostApiForTests: () => {
        calls += 1;
      },
      clearPackageHookBundleCacheForTests: () => {
        calls += 1;
      },
      resetWorkflowToastStateForTests: () => {
        calls += 1;
      },
      clearWorkflowRuntimeBridgeForTests: () => {
        calls += 1;
      },
      setDebugModeOverrideForTests: () => {
        calls += 1;
      },
      setDiagnosticVerboseOverrideForTests: () => {
        calls += 1;
      },
      setSkillRunnerInteractiveAutoReplyEnabledForTests: () => {
        calls += 1;
      },
      resetWorkflowRuntimeForTests: () => {
        calls += 1;
      },
    });

    await cleanupBackgroundRuntimeForZoteroTests();
    await cleanupBackgroundRuntimeForZoteroTests();

    assert.equal(calls, 48);
  });

  it("resets local runtime loop state back to inert defaults", async function () {
    setSuppressManagedRuntimeAutoEnsureTriggerForTests(true);
    await setLocalRuntimeAutoPullEnabled(true);

    resetManagedLocalRuntimeLoopsForTests();

    assert.deepInclude(getManagedLocalRuntimeLoopStateForTests(), {
      pendingAutoEnsureTickScheduled: false,
      autoEnsureTimerActive: false,
      heartbeatTimerActive: false,
      statusReconcileTimerActive: false,
      heartbeatRunning: false,
      statusReconcileRunning: false,
      autoEnsureRunning: false,
      monitoringState: "inactive",
      runtimeActionInFlight: "",
      backgroundInFlightAction: "",
      actionProgressActive: false,
      autoStartEnabledInSession: false,
      suppressAutoEnsureTriggerForTests: false,
    });
  });

  it("is idempotent when local runtime loops are already reset", function () {
    resetManagedLocalRuntimeLoopsForTests();
    resetManagedLocalRuntimeLoopsForTests();

    assert.deepInclude(getManagedLocalRuntimeLoopStateForTests(), {
      pendingAutoEnsureTickScheduled: false,
      autoEnsureTimerActive: false,
      heartbeatTimerActive: false,
      statusReconcileTimerActive: false,
      heartbeatRunning: false,
      statusReconcileRunning: false,
      autoEnsureRunning: false,
      monitoringState: "inactive",
      runtimeActionInFlight: "",
      backgroundInFlightAction: "",
      actionProgressActive: false,
      autoStartEnabledInSession: false,
      suppressAutoEnsureTriggerForTests: false,
    });
  });
});

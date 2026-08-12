import { clearRuntimeLogs } from "./runtimeLogManager";
import {
  resetManagedLocalRuntimeLoopsForTests,
  resetManagedLocalRuntimeStateChangeListenersForTests,
  resetLocalRuntimeToastStateForTests,
} from "./skillRunnerLocalRuntimeManager";
import { stopSkillRunnerModelCacheAutoRefresh } from "../providers/skillrunner/modelCache";
import { resetSkillRunnerBackendHealthRegistryForTests } from "./skillRunnerBackendHealthRegistry";
import { stopSkillRunnerBackendReachabilityCoordinator } from "./skillRunnerBackendReachabilityCoordinator";
import { resetPluginStateStoreForTests } from "./pluginStateStore";
import {
  resetSkillRunnerTaskReconcilerForTests,
  setSkillRunnerBackendReconcileFailureToastEmitterForTests,
  setSkillRunnerTaskLifecycleToastEmitterForTests,
} from "./skillRunnerTaskReconciler";
import { resetWorkflowTasks } from "./taskRuntime";
import { resetSkillRunnerSessionSyncForTests } from "./skillRunnerSessionSyncManager";
import { resetSkillRunnerRunDialogForTests } from "./skillRunnerRunDialog";
import { resetSkillRunnerAutoReplyObserverForTests } from "./skillRunnerAutoReplyObserver";
import { resetTaskManagerDialogRuntimeForTests } from "./taskManagerDialog";
import { resetWorkflowSettingsReadDiagnosticsForTests } from "./workflowSettings";
import { resetTestPerformanceProbeHooksForTests } from "./testPerformanceProbeBridge";
import { resetWorkflowHostApiForTests } from "../workflows/hostApi";
import { clearPackageHookBundleCacheForTests } from "../workflows/packageHookBundler";
import { resetWorkflowToastStateForTests } from "./workflowExecution/feedbackSeam";
import { clearWorkflowRuntimeBridgeForTests } from "./workflowRuntimeBridge";
import { setDebugModeOverrideForTests } from "./debugMode";
import { setDiagnosticVerboseOverrideForTests } from "./diagnosticVerbosity";
import { setSkillRunnerInteractiveAutoReplyEnabledForTests } from "./skillRunnerInteractiveAutoReply";
import { resetWorkflowRuntimeForTests } from "./workflowRuntime";
import { resetSynthesisSidecarRuntimeSupervisorForTests } from "./synthesisSidecarRuntimeSupervisor";
import {
  resetDefaultSynthesisClientForTests,
  setDefaultSynthesisClientCompositionFactoryForTests,
} from "./synthesisClient/defaultClient";
import { workflowSubmissionQueue } from "../jobQueue/workflowSubmissionQueue";

type CleanupDeps = {
  setDefaultSynthesisClientCompositionFactoryForTests: () => void;
  resetDefaultSynthesisClientForTests: () => void | Promise<void>;
  stopSkillRunnerModelCacheAutoRefresh: () => void;
  stopSkillRunnerBackendReachabilityCoordinator: () => void;
  resetManagedLocalRuntimeLoopsForTests: () => void;
  resetManagedLocalRuntimeStateChangeListenersForTests: () => void;
  resetLocalRuntimeToastStateForTests: () => void;
  resetSkillRunnerBackendHealthRegistryForTests: () => void;
  resetPluginStateStoreForTests: () => void;
  setSkillRunnerBackendReconcileFailureToastEmitterForTests: () => void;
  setSkillRunnerTaskLifecycleToastEmitterForTests: () => void;
  resetWorkflowTasks: () => void;
  clearRuntimeLogs: () => void | Promise<void>;
  resetSkillRunnerSessionSyncForTests: () => void | Promise<void>;
  resetSkillRunnerTaskReconcilerForTests: () => void | Promise<void>;
  resetSkillRunnerRunDialogForTests: () => void | Promise<void>;
  resetSkillRunnerAutoReplyObserverForTests: () => void;
  resetTaskManagerDialogRuntimeForTests: () => void | Promise<void>;
  resetWorkflowSettingsReadDiagnosticsForTests: () => void;
  resetTestPerformanceProbeHooksForTests: () => void;
  resetWorkflowHostApiForTests: () => void;
  clearPackageHookBundleCacheForTests: () => void;
  resetWorkflowToastStateForTests: () => void;
  clearWorkflowRuntimeBridgeForTests: () => void;
  setDebugModeOverrideForTests: () => void;
  setDiagnosticVerboseOverrideForTests: () => void;
  setSkillRunnerInteractiveAutoReplyEnabledForTests: () => void;
  resetWorkflowRuntimeForTests: () => void;
  resetSynthesisSidecarRuntimeSupervisorForTests: () => void | Promise<void>;
  resetWorkflowSubmissionQueueForTests: () => void;
};

const defaultCleanupDeps: CleanupDeps = {
  setDefaultSynthesisClientCompositionFactoryForTests: () =>
    setDefaultSynthesisClientCompositionFactoryForTests(null),
  resetDefaultSynthesisClientForTests,
  stopSkillRunnerModelCacheAutoRefresh,
  stopSkillRunnerBackendReachabilityCoordinator,
  resetManagedLocalRuntimeLoopsForTests,
  resetManagedLocalRuntimeStateChangeListenersForTests,
  resetLocalRuntimeToastStateForTests,
  resetSkillRunnerBackendHealthRegistryForTests,
  resetPluginStateStoreForTests,
  setSkillRunnerBackendReconcileFailureToastEmitterForTests,
  setSkillRunnerTaskLifecycleToastEmitterForTests,
  resetWorkflowTasks,
  clearRuntimeLogs,
  resetSkillRunnerSessionSyncForTests,
  resetSkillRunnerTaskReconcilerForTests,
  resetSkillRunnerRunDialogForTests,
  resetSkillRunnerAutoReplyObserverForTests,
  resetTaskManagerDialogRuntimeForTests,
  resetWorkflowSettingsReadDiagnosticsForTests,
  resetTestPerformanceProbeHooksForTests,
  resetWorkflowHostApiForTests,
  clearPackageHookBundleCacheForTests,
  resetWorkflowToastStateForTests,
  clearWorkflowRuntimeBridgeForTests,
  setDebugModeOverrideForTests,
  setDiagnosticVerboseOverrideForTests,
  setSkillRunnerInteractiveAutoReplyEnabledForTests,
  resetWorkflowRuntimeForTests,
  resetSynthesisSidecarRuntimeSupervisorForTests,
  resetWorkflowSubmissionQueueForTests: () =>
    workflowSubmissionQueue.resetForTests(),
};

let cleanupDeps: CleanupDeps = defaultCleanupDeps;

export function setBackgroundRuntimeCleanupDepsForTests(
  overrides?: Partial<CleanupDeps>,
) {
  cleanupDeps = overrides
    ? {
        ...defaultCleanupDeps,
        ...overrides,
      }
    : defaultCleanupDeps;
}

export async function cleanupBackgroundRuntimeForZoteroTests() {
  cleanupDeps.setDefaultSynthesisClientCompositionFactoryForTests();
  await Promise.resolve(cleanupDeps.resetDefaultSynthesisClientForTests());
  await Promise.resolve(
    cleanupDeps.resetSynthesisSidecarRuntimeSupervisorForTests(),
  );
  await Promise.resolve(cleanupDeps.resetSkillRunnerRunDialogForTests());
  cleanupDeps.resetSkillRunnerAutoReplyObserverForTests();
  await Promise.resolve(cleanupDeps.resetTaskManagerDialogRuntimeForTests());
  await Promise.resolve(cleanupDeps.resetSkillRunnerTaskReconcilerForTests());
  await Promise.resolve(cleanupDeps.resetSkillRunnerSessionSyncForTests());
  cleanupDeps.stopSkillRunnerModelCacheAutoRefresh();
  cleanupDeps.stopSkillRunnerBackendReachabilityCoordinator();
  cleanupDeps.resetManagedLocalRuntimeLoopsForTests();
  cleanupDeps.resetManagedLocalRuntimeStateChangeListenersForTests();
  cleanupDeps.resetLocalRuntimeToastStateForTests();
  cleanupDeps.resetSkillRunnerBackendHealthRegistryForTests();
  cleanupDeps.resetPluginStateStoreForTests();
  cleanupDeps.setSkillRunnerBackendReconcileFailureToastEmitterForTests();
  cleanupDeps.setSkillRunnerTaskLifecycleToastEmitterForTests();
  cleanupDeps.resetWorkflowTasks();
  await Promise.resolve(cleanupDeps.clearRuntimeLogs());
  cleanupDeps.resetWorkflowSettingsReadDiagnosticsForTests();
  cleanupDeps.resetTestPerformanceProbeHooksForTests();
  cleanupDeps.resetWorkflowHostApiForTests();
  cleanupDeps.clearPackageHookBundleCacheForTests();
  cleanupDeps.resetWorkflowToastStateForTests();
  cleanupDeps.clearWorkflowRuntimeBridgeForTests();
  cleanupDeps.setDebugModeOverrideForTests();
  cleanupDeps.setDiagnosticVerboseOverrideForTests();
  cleanupDeps.setSkillRunnerInteractiveAutoReplyEnabledForTests();
  cleanupDeps.resetWorkflowRuntimeForTests();
  cleanupDeps.resetWorkflowSubmissionQueueForTests();
}

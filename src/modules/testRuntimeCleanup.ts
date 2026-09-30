import { clearRuntimeLogs } from "./runtimeLogManager";
import {
  resetManagedLocalRuntimeLoopsForTests,
  resetManagedLocalRuntimeStateChangeListenersForTests,
  resetLocalRuntimeToastStateForTests,
} from "./skillRunner/runtime/skillRunnerLocalRuntimeManager";
import { stopSkillRunnerModelCacheAutoRefresh } from "../providers/skillrunner/modelCache";
import { resetSkillRunnerBackendHealthRegistryForTests } from "./skillRunner/connection/skillRunnerBackendHealthRegistry";
import { stopSkillRunnerBackendReachabilityCoordinator } from "./skillRunner/connection/skillRunnerBackendReachabilityCoordinator";
import { resetPluginStateStoreForTests } from "./pluginStateStore";
import {
  resetSkillRunnerTaskReconcilerForTests,
  setSkillRunnerBackendReconcileFailureToastEmitterForTests,
  setSkillRunnerTaskLifecycleToastEmitterForTests,
} from "./skillRunner/run/skillRunnerTaskReconciler";
import { resetWorkflowTasks } from "./taskRuntime";
import { resetSkillRunnerSessionSyncForTests } from "./skillRunner/run/skillRunnerSessionSyncManager";
import { resetSkillRunnerRunDialogForTests } from "./skillRunner/surface/skillRunnerRunDialog";
import { resetSkillRunnerAutoReplyObserverForTests } from "./skillRunner/run/skillRunnerAutoReplyObserver";
import { resetTaskDashboardHostForTests } from "./dashboardHost";
import { resetWorkflowSettingsReadDiagnosticsForTests } from "./workflow/settings/workflowSettings";
import { resetTestPerformanceProbeHooksForTests } from "./testPerformanceProbeBridge";
import { resetWorkflowHostApiForTests } from "../workflows/hostApi";
import { clearPackageHookBundleCacheForTests } from "../workflows/packageHookBundler";
import { resetWorkflowToastStateForTests } from "./workflowExecution/feedbackSeam";
import { clearWorkflowRuntimeBridgeForTests } from "./workflow/catalog/workflowRuntimeBridge";
import { setDebugModeOverrideForTests } from "./debugMode";
import { setDiagnosticVerboseOverrideForTests } from "./diagnosticVerbosity";
import { setSkillRunnerInteractiveAutoReplyEnabledForTests } from "./skillRunner/run/skillRunnerInteractiveAutoReply";
import { resetWorkflowRuntimeForTests } from "./workflow/catalog/workflowRuntime";
import { resetSynthesisSidecarRuntimeSupervisorForTests } from "./synthesis/sidecar/synthesisSidecarRuntimeSupervisor";
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
  resetTaskDashboardHostForTests: () => void | Promise<void>;
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
  shutdownPiConversations: () => void | Promise<void>;
};

/**
 * The Pi conversation singleton is production state that must not leak across
 * files. It is imported lazily so shards that never touch Pi do not evaluate
 * its graph, and the mocha root hook preloads it so a cold transpile never
 * lands inside the bounded cleanup window.
 */
let piConversationModule:
  | Promise<typeof import("./piConversation")>
  | undefined;
function loadPiConversationModule() {
  return (piConversationModule ??= import("./piConversation"));
}

export async function preloadBackgroundRuntimeCleanupForTests() {
  await loadPiConversationModule();
}

const defaultCleanupDeps: CleanupDeps = {
  shutdownPiConversations: async () => {
    const module = await loadPiConversationModule();
    await module.shutdownPiConversations();
  },
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
  resetTaskDashboardHostForTests,
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

export async function cleanupBackgroundRuntimeForZoteroTests(
  options: { preserveRuntimeLogs?: boolean } = {},
) {
  await Promise.resolve(cleanupDeps.shutdownPiConversations());
  cleanupDeps.setDefaultSynthesisClientCompositionFactoryForTests();
  await Promise.resolve(cleanupDeps.resetDefaultSynthesisClientForTests());
  await Promise.resolve(
    cleanupDeps.resetSynthesisSidecarRuntimeSupervisorForTests(),
  );
  await Promise.resolve(cleanupDeps.resetSkillRunnerRunDialogForTests());
  cleanupDeps.resetSkillRunnerAutoReplyObserverForTests();
  await Promise.resolve(cleanupDeps.resetTaskDashboardHostForTests());
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
  if (!options.preserveRuntimeLogs) {
    await Promise.resolve(cleanupDeps.clearRuntimeLogs());
  }
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

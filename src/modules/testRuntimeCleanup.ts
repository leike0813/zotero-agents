import { clearRuntimeLogs } from "./runtimeLogManager";
import {
  resetManagedLocalRuntimeLoopsForTests,
  resetManagedLocalRuntimeStateChangeListenersForTests,
  resetLocalRuntimeToastStateForTests,
} from "./skillRunnerLocalRuntimeManager";
import { stopSkillRunnerModelCacheAutoRefresh } from "../providers/skillrunner/modelCache";
import {
  resetSkillRunnerBackendHealthRegistryForTests,
} from "./skillRunnerBackendHealthRegistry";
import {
  setDeferredWorkflowCompletionTrackerDepsForTests,
  resetDeferredWorkflowCompletionTrackerForTests,
} from "./workflowExecution/deferredCompletionTracker";
import { resetPluginStateStoreForTests } from "./pluginStateStore";
import {
  resetSkillRunnerTaskReconcilerForTests,
  setSkillRunnerBackendReconcileFailureToastEmitterForTests,
  setSkillRunnerTaskLifecycleToastEmitterForTests,
} from "./skillRunnerTaskReconciler";
import { resetWorkflowTasks } from "./taskRuntime";
import { resetSkillRunnerSessionSyncForTests } from "./skillRunnerSessionSyncManager";
import { resetSkillRunnerRunDialogForTests } from "./skillRunnerRunDialog";
import { resetTaskManagerDialogRuntimeForTests } from "./taskManagerDialog";

type CleanupDeps = {
  stopSkillRunnerModelCacheAutoRefresh: () => void;
  resetManagedLocalRuntimeLoopsForTests: () => void;
  resetManagedLocalRuntimeStateChangeListenersForTests: () => void;
  resetLocalRuntimeToastStateForTests: () => void;
  resetSkillRunnerBackendHealthRegistryForTests: () => void;
  resetDeferredWorkflowCompletionTrackerForTests: () => void;
  resetPluginStateStoreForTests: () => void;
  setSkillRunnerBackendReconcileFailureToastEmitterForTests: () => void;
  setSkillRunnerTaskLifecycleToastEmitterForTests: () => void;
  setDeferredWorkflowCompletionTrackerDepsForTests: () => void;
  resetWorkflowTasks: () => void;
  clearRuntimeLogs: () => void;
  resetSkillRunnerSessionSyncForTests: () => void | Promise<void>;
  resetSkillRunnerTaskReconcilerForTests: () => void | Promise<void>;
  resetSkillRunnerRunDialogForTests: () => void | Promise<void>;
  resetTaskManagerDialogRuntimeForTests: () => void | Promise<void>;
};

const defaultCleanupDeps: CleanupDeps = {
  stopSkillRunnerModelCacheAutoRefresh,
  resetManagedLocalRuntimeLoopsForTests,
  resetManagedLocalRuntimeStateChangeListenersForTests,
  resetLocalRuntimeToastStateForTests,
  resetSkillRunnerBackendHealthRegistryForTests,
  resetDeferredWorkflowCompletionTrackerForTests,
  resetPluginStateStoreForTests,
  setSkillRunnerBackendReconcileFailureToastEmitterForTests,
  setSkillRunnerTaskLifecycleToastEmitterForTests,
  setDeferredWorkflowCompletionTrackerDepsForTests,
  resetWorkflowTasks,
  clearRuntimeLogs,
  resetSkillRunnerSessionSyncForTests,
  resetSkillRunnerTaskReconcilerForTests,
  resetSkillRunnerRunDialogForTests,
  resetTaskManagerDialogRuntimeForTests,
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
  await Promise.resolve(cleanupDeps.resetSkillRunnerRunDialogForTests());
  await Promise.resolve(cleanupDeps.resetTaskManagerDialogRuntimeForTests());
  await Promise.resolve(cleanupDeps.resetSkillRunnerTaskReconcilerForTests());
  await Promise.resolve(cleanupDeps.resetSkillRunnerSessionSyncForTests());
  cleanupDeps.stopSkillRunnerModelCacheAutoRefresh();
  cleanupDeps.resetManagedLocalRuntimeLoopsForTests();
  cleanupDeps.resetManagedLocalRuntimeStateChangeListenersForTests();
  cleanupDeps.resetLocalRuntimeToastStateForTests();
  cleanupDeps.resetSkillRunnerBackendHealthRegistryForTests();
  cleanupDeps.resetDeferredWorkflowCompletionTrackerForTests();
  cleanupDeps.resetPluginStateStoreForTests();
  cleanupDeps.setSkillRunnerBackendReconcileFailureToastEmitterForTests();
  cleanupDeps.setSkillRunnerTaskLifecycleToastEmitterForTests();
  cleanupDeps.setDeferredWorkflowCompletionTrackerDepsForTests();
  cleanupDeps.resetWorkflowTasks();
  cleanupDeps.clearRuntimeLogs();
}

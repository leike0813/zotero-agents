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

type CleanupDeps = {
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
  clearRuntimeLogs: () => void;
  resetSkillRunnerSessionSyncForTests: () => void | Promise<void>;
  resetSkillRunnerTaskReconcilerForTests: () => void | Promise<void>;
  resetSkillRunnerRunDialogForTests: () => void | Promise<void>;
  resetSkillRunnerAutoReplyObserverForTests: () => void;
  resetTaskManagerDialogRuntimeForTests: () => void | Promise<void>;
};

const defaultCleanupDeps: CleanupDeps = {
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
  cleanupDeps.clearRuntimeLogs();
}

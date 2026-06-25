import { appendRuntimeLog } from "./runtimeLogManager";
import {
  drainSkillRunnerTaskReconciler,
  stopSkillRunnerTaskReconciler,
} from "./skillRunnerTaskReconciler";
import { shutdownSkillRunnerSessionSync } from "./skillRunnerSessionSyncManager";
import { shutdownSkillRunnerRunDialogRuntime } from "./skillRunnerRunDialog";
import { shutdownSkillRunnerAutoReplyObserver } from "./skillRunnerAutoReplyObserver";
import {
  releaseManagedLocalRuntimeLeaseOnShutdown,
  stopManagedLocalRuntimeAutoEnsureLoop,
} from "./skillRunnerLocalRuntimeManager";
import { stopSkillRunnerModelCacheAutoRefresh } from "../providers/skillrunner/modelCache";

async function runShutdownStep(
  stage: string,
  runner: () => void | Promise<void>,
) {
  try {
    await runner();
  } catch (error) {
    appendRuntimeLog({
      level: "warn",
      scope: "job",
      component: "skillrunner-lifecycle",
      operation: "shutdown-step-failed",
      phase: "cleanup",
      stage,
      message: "skillrunner async lifecycle shutdown step failed",
      error,
    });
  }
}

export async function shutdownSkillRunnerAsyncLifecycle() {
  await runShutdownStep("run-dialog-drain", async () => {
    await shutdownSkillRunnerRunDialogRuntime();
  });
  await runShutdownStep("auto-reply-observer-stop", () => {
    shutdownSkillRunnerAutoReplyObserver();
  });
  await runShutdownStep("task-reconciler-stop", () => {
    stopSkillRunnerTaskReconciler();
  });
  await runShutdownStep("session-sync-drain", async () => {
    await shutdownSkillRunnerSessionSync();
  });
  await runShutdownStep("task-reconciler-drain", async () => {
    await drainSkillRunnerTaskReconciler();
  });
  await runShutdownStep("model-cache-stop", () => {
    stopSkillRunnerModelCacheAutoRefresh();
  });
  await runShutdownStep("local-runtime-shutdown", async () => {
    stopManagedLocalRuntimeAutoEnsureLoop();
    await releaseManagedLocalRuntimeLeaseOnShutdown();
  });
}

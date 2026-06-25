import type { LoadedWorkflow } from "../workflows/types";
import { appendRuntimeLog } from "./runtimeLogManager";
import { runWorkflowPreparationSeam } from "./workflowExecution/preparationSeam";
import { runWorkflowDuplicateGuardSeam } from "./workflowExecution/duplicateGuardSeam";
import { runWorkflowExecutionSeam } from "./workflowExecution/runSeam";
import { runWorkflowApplySeam } from "./workflowExecution/applySeam";
import type { WorkflowExecutionOptions } from "./workflowSettingsDomain";
import {
  isWorkflowConfigurable,
  updateWorkflowSettings,
} from "./workflowSettings";
import { openWorkflowSettingsWebDialog } from "./workflowSettingsWebDialog";
import { loadBackendsRegistry } from "../backends/registry";
import {
  isSkillRunnerBackendAvailable,
  syncSkillRunnerBackendHealthForConfiguredBackends,
} from "./skillRunnerBackendHealthRegistry";
import {
  alertWindow,
  emitWorkflowFinishSummary,
  emitWorkflowJobToasts,
  emitWorkflowStartToast,
  selectWorkflowJobOutcomesForToasts,
  shouldEmitWorkflowFinishSummaryToast,
} from "./workflowExecution/feedbackSeam";
import { createLocalizedMessageFormatter } from "./workflowExecution/messageFormatter";
import { shouldShowWorkflowNotifications } from "./workflowExecution/feedbackPolicy";
import { getLoadedWorkflowSourceById } from "./workflowRuntime";
import { getString } from "../utils/locale";
import { localizeWorkflowLabel } from "../workflows/localization";

function stripRunOptionsForPersistence(
  options: WorkflowExecutionOptions,
): WorkflowExecutionOptions {
  const { runOptions: _runOptions, ...persisted } = options;
  return persisted;
}

function buildWorkflowCannotRunMessage(args: {
  workflowLabel: string;
  reason: string;
}) {
  try {
    const localized = String(
      getString("workflow-execute-cannot-run" as any, {
        args: {
          workflowLabel: args.workflowLabel,
          reason: args.reason,
        },
      }),
    ).trim();
    if (localized && !localized.includes("workflow-execute-cannot-run")) {
      return localized;
    }
  } catch {
    // ignore localization failures
  }
  return `Workflow ${args.workflowLabel} cannot run: ${args.reason}`;
}

export async function executeWorkflowFromCurrentSelection(args: {
  win: _ZoteroTypes.MainWindow;
  workflow: LoadedWorkflow;
  requireSettingsGate?: boolean;
  executionOptionsOverride?: WorkflowExecutionOptions;
  settingsGateInitialOptions?: WorkflowExecutionOptions;
}) {
  const messageFormatter = createLocalizedMessageFormatter();
  const showWorkflowNotifications = shouldShowWorkflowNotifications(
    args.workflow.manifest,
  );
  const workflowSource = getLoadedWorkflowSourceById(args.workflow.manifest.id);
  const workflowLabel = localizeWorkflowLabel(args.workflow);
  let executionOptionsOverride = args.executionOptionsOverride;
  if (args.requireSettingsGate === true && !executionOptionsOverride) {
    const loadedBackends = await loadBackendsRegistry();
    const candidateBackends = loadedBackends.fatalError
      ? []
      : loadedBackends.backends;
    if (!loadedBackends.fatalError) {
      syncSkillRunnerBackendHealthForConfiguredBackends(candidateBackends, {
        prune: true,
      });
    }
    const submitVisibleBackends = candidateBackends.filter((backend) => {
      if (String(backend.type || "").trim() !== "skillrunner") {
        return true;
      }
      return (
        backend.enabled !== false &&
        isSkillRunnerBackendAvailable(String(backend.id || "").trim())
      );
    });
    const configurable = await isWorkflowConfigurable({
      workflow: args.workflow,
      candidateBackends: submitVisibleBackends,
    });
    if (configurable) {
      const dialogResult = await openWorkflowSettingsWebDialog({
        workflow: args.workflow,
        ownerWindow: args.win,
        candidateBackends: submitVisibleBackends,
        initialDraft: args.settingsGateInitialOptions,
      });
      if (dialogResult.status !== "confirmed") {
        const canceled = dialogResult.status === "canceled";
        appendRuntimeLog({
          level: canceled ? "info" : "error",
          scope: "workflow-trigger",
          workflowId: args.workflow.manifest.id,
          providerId: String(args.workflow.manifest.provider || "").trim(),
          stage: canceled ? "settings-gate-canceled" : "settings-gate-failed",
          message: canceled
            ? "workflow trigger canceled by settings gate"
            : "workflow trigger failed before execution at settings gate",
          details: {
            workflowSource,
            ...(canceled
              ? {}
              : {
                  gateStage: dialogResult.stage,
                  reason: dialogResult.reason,
                }),
          },
        });
        if (!canceled && showWorkflowNotifications) {
          alertWindow(
            args.win,
            buildWorkflowCannotRunMessage({
              workflowLabel,
              reason: `settings gate failed: ${dialogResult.reason}`,
            }),
          );
        }
        return;
      }
      executionOptionsOverride = dialogResult.executionOptions;
      appendRuntimeLog({
        level: "info",
        scope: "workflow-trigger",
        workflowId: args.workflow.manifest.id,
        providerId: String(args.workflow.manifest.provider || "").trim(),
        stage: "settings-gate-confirmed",
        message: "workflow settings gate confirmed",
        details: {
          workflowSource,
          allowWriteApprovalBypass:
            args.workflow.manifest.execution?.zoteroHostAccess
              ?.allowWriteApprovalBypass === true,
          autoApproveWritesRequested:
            dialogResult.executionOptions.runOptions?.zoteroHostAccess
              ?.autoApproveWrites === true,
        },
      });
      if (dialogResult.persist) {
        updateWorkflowSettings(
          args.workflow.manifest.id,
          stripRunOptionsForPersistence(dialogResult.executionOptions),
        );
      }
    }
  }
  const preparation = await runWorkflowPreparationSeam({
    win: args.win,
    workflow: args.workflow,
    messageFormatter,
    executionOptionsOverride,
  });
  if (preparation.status !== "ready") {
    return;
  }

  const duplicateGuard = await runWorkflowDuplicateGuardSeam({
    win: args.win,
    workflowId: args.workflow.manifest.id,
    workflowLabel,
    requests: preparation.prepared.requests,
  });
  const skippedByGuard = duplicateGuard.skippedByDuplicate;
  const totalSkipped = preparation.prepared.skippedByFilter + skippedByGuard;

  if (duplicateGuard.allowedRequests.length === 0) {
    appendRuntimeLog({
      level: "warn",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      stage: "trigger-no-requests-after-duplicate-guard",
      message: "workflow trigger halted after duplicate guard",
      details: {
        skippedByFilter: preparation.prepared.skippedByFilter,
        skippedByDuplicate: skippedByGuard,
      },
    });
    if (showWorkflowNotifications) {
      emitWorkflowFinishSummary({
        win: args.win,
        workflowLabel,
        succeeded: 0,
        failed: 0,
        skipped: totalSkipped,
        failureReasons: [],
        messageFormatter,
      });
    }
    return;
  }

  const runState = runWorkflowExecutionSeam({
    prepared: {
      ...preparation.prepared,
      requests: duplicateGuard.allowedRequests,
    },
  });

  if (showWorkflowNotifications) {
    emitWorkflowStartToast({
      workflowLabel,
      totalJobs: runState.totalJobs,
      messageFormatter,
    });
  }

  await runState.idlePromise;

  const applySummary = await runWorkflowApplySeam({
    runState,
    messageFormatter,
  });

  if (showWorkflowNotifications) {
    const jobToastOutcomes = selectWorkflowJobOutcomesForToasts({
      outcomes: applySummary.jobOutcomes,
      totalJobs: runState.totalJobs,
      skipped: totalSkipped,
    });
    if (jobToastOutcomes.length > 0) {
      emitWorkflowJobToasts({
        workflowLabel,
        totalJobs: runState.totalJobs,
        outcomes: jobToastOutcomes,
        messageFormatter,
      });
    }
  }

  appendRuntimeLog({
    level: applySummary.failed > 0 ? "warn" : "info",
    scope: "workflow-trigger",
    workflowId: args.workflow.manifest.id,
    providerId: String(args.workflow.manifest.provider || "").trim(),
    stage: "trigger-finished",
    message: "workflow trigger finished",
    details: {
      workflowSource,
      succeeded: applySummary.succeeded,
      failed: applySummary.failed,
      pending: applySummary.pending,
      skipped: totalSkipped,
      failureCount: applySummary.failureReasons.length,
    },
  });

  if (showWorkflowNotifications) {
    if (
      applySummary.pending === 0 &&
      shouldEmitWorkflowFinishSummaryToast({
        outcomes: applySummary.jobOutcomes,
        totalJobs: runState.totalJobs,
        skipped: totalSkipped,
      })
    ) {
      emitWorkflowFinishSummary({
        win: args.win,
        workflowLabel,
        succeeded: applySummary.succeeded,
        failed: applySummary.failed,
        skipped: totalSkipped,
        failureReasons: applySummary.failureReasons,
        messageFormatter,
      });
    }
  }
}

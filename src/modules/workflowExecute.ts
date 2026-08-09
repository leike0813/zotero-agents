import type { LoadedWorkflow } from "../workflows/types";
import { appendRuntimeLog } from "./runtimeLogManager";
import {
  buildWorkflowExecutionUnitPreview,
  runWorkflowPreparationSeam,
} from "./workflowExecution/preparationSeam";
import { runWorkflowUnitDuplicateGuardSeam } from "./workflowExecution/duplicateGuardSeam";
import { workflowSubmissionQueue } from "../jobQueue/workflowSubmissionQueue";
import {
  executePreparedWorkflowUnit,
  submitPreparedWorkflowUnits,
  type PreparedWorkflowUnitExecutionResult,
} from "./workflowExecution/submissionSeam";
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
  showWorkflowToast,
  shouldEmitWorkflowFinishSummaryToast,
} from "./workflowExecution/feedbackSeam";
import { createLocalizedMessageFormatter } from "./workflowExecution/messageFormatter";
import { shouldShowWorkflowNotifications } from "./workflowExecution/feedbackPolicy";
import { getLoadedWorkflowSourceById } from "./workflowRuntime";
import { getString } from "../utils/locale";
import { localizeWorkflowLabel } from "../workflows/localization";
import { buildSelectionContext } from "./selectionContext";

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

export { executePreparedWorkflowUnit };

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
  const hiddenWorkflowToastDeps = showWorkflowNotifications
    ? undefined
    : {
        showToast: (
          payload: Parameters<typeof showWorkflowToast>[0],
          options?: Parameters<typeof showWorkflowToast>[1],
        ) => {
          showWorkflowToast(payload, { ...options, display: false });
        },
      };
  const workflowSource = getLoadedWorkflowSourceById(args.workflow.manifest.id);
  const workflowLabel = localizeWorkflowLabel(args.workflow);
  let selectedItemsSnapshot: Zotero.Item[];
  let selectionContextSnapshot: Awaited<
    ReturnType<typeof buildSelectionContext>
  >;
  try {
    selectedItemsSnapshot = [
      ...(args.win.ZoteroPane?.getSelectedItems?.() || []),
    ];
    selectionContextSnapshot = await buildSelectionContext(
      selectedItemsSnapshot,
    );
  } catch (error) {
    const reason =
      String(
        error && typeof error === "object" && "message" in error
          ? (error as { message?: unknown }).message
          : error,
      ).trim() || "selection context is unavailable";
    appendRuntimeLog({
      level: "error",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      providerId: String(args.workflow.manifest.provider || "").trim(),
      stage: "selection-context-capture-failed",
      message: "workflow trigger could not capture selection context",
      details: { workflowSource, reason },
      error,
    });
    const message = buildWorkflowCannotRunMessage({
      workflowLabel,
      reason,
    });
    if (showWorkflowNotifications) {
      alertWindow(args.win, message);
    } else {
      showWorkflowToast(
        {
          text: message,
          type: "error",
          semantic: "error",
          owner: "workflow",
          scope: "workflow-preparation",
          displayGroupKey: `workflow:${workflowLabel}:selection-context-failed`,
        },
        { display: false },
      );
    }
    return;
  }
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
      const executionUnitPreview = await buildWorkflowExecutionUnitPreview({
        win: args.win,
        workflow: args.workflow,
        executionOptionsOverride: args.settingsGateInitialOptions,
        selectedItemsOverride: selectedItemsSnapshot,
        selectionContextOverride: selectionContextSnapshot,
      });
      const dialogResult = await openWorkflowSettingsWebDialog({
        workflow: args.workflow,
        ownerWindow: args.win,
        candidateBackends: submitVisibleBackends,
        initialDraft: args.settingsGateInitialOptions,
        executionUnitPreview,
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
        if (!canceled) {
          const message = buildWorkflowCannotRunMessage({
            workflowLabel,
            reason: `settings gate failed: ${dialogResult.reason}`,
          });
          if (showWorkflowNotifications) {
            alertWindow(args.win, message);
          } else {
            showWorkflowToast(
              {
                text: message,
                type: "error",
                semantic: "error",
                owner: "workflow",
                scope: "workflow-preparation",
                displayGroupKey: `workflow:${workflowLabel}:preparation-rejected`,
              },
              { display: false },
            );
          }
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
    selectedItemsOverride: selectedItemsSnapshot,
    selectionContextOverride: selectionContextSnapshot,
  });
  if (preparation.status !== "ready") {
    return;
  }

  const duplicateGuard = await runWorkflowUnitDuplicateGuardSeam({
    win: args.win,
    workflowId: args.workflow.manifest.id,
    workflowLabel,
    units: preparation.prepared.plan.units,
  });
  const skippedByGuard = duplicateGuard.skippedByDuplicate;

  if (duplicateGuard.allowedUnits.length === 0) {
    appendRuntimeLog({
      level: "warn",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      stage: "trigger-no-requests-after-duplicate-guard",
      message: "workflow trigger halted after duplicate guard",
      details: {
        candidateSkipped: preparation.prepared.candidateSkipped,
        skippedByDuplicate: skippedByGuard,
      },
    });
    emitWorkflowFinishSummary(
      {
        win: args.win,
        workflowLabel,
        succeeded: 0,
        failed: 0,
        skipped: skippedByGuard,
        failureReasons: [],
        messageFormatter,
      },
      hiddenWorkflowToastDeps,
    );
    return;
  }

  emitWorkflowStartToast(
    {
      workflowLabel,
      totalJobs: duplicateGuard.allowedUnits.length,
      messageFormatter,
    },
    hiddenWorkflowToastDeps,
  );

  const submission = await submitPreparedWorkflowUnits({
    prepared: preparation.prepared,
    units: duplicateGuard.allowedUnits,
    workflowLabel,
    skippedByGuard,
    messageFormatter,
  });
  const submissionSummary = await submission.completion;
  const executionResults = submission.executionResults;

  const orderedExecutionResults = duplicateGuard.allowedUnits
    .map((unit) => executionResults.get(unit.unitId))
    .filter(
      (entry): entry is PreparedWorkflowUnitExecutionResult =>
        entry !== undefined,
    );
  const totalJobs = orderedExecutionResults.reduce(
    (sum, entry) => sum + (entry.runState?.totalJobs || 0),
    0,
  );
  const jobOutcomes = orderedExecutionResults
    .flatMap((entry) => entry.applySummary?.jobOutcomes || [])
    .map((outcome, index) => ({
      ...outcome,
      index,
    }));
  const failureReasons = orderedExecutionResults.flatMap((entry) => [
    ...(entry.applySummary?.failureReasons || []),
    ...(entry.failureReason ? [entry.failureReason] : []),
  ]);
  const jobToastOutcomes = selectWorkflowJobOutcomesForToasts({
    outcomes: jobOutcomes,
    totalJobs,
    skipped: submissionSummary.skipped,
  });
  if (jobToastOutcomes.length > 0) {
    emitWorkflowJobToasts(
      {
        workflowLabel,
        totalJobs,
        outcomes: jobToastOutcomes,
        messageFormatter,
      },
      hiddenWorkflowToastDeps,
    );
  }

  appendRuntimeLog({
    level: submissionSummary.failed > 0 ? "warn" : "info",
    scope: "workflow-trigger",
    workflowId: args.workflow.manifest.id,
    providerId: String(args.workflow.manifest.provider || "").trim(),
    stage: "trigger-finished",
    message: "workflow trigger finished",
    details: {
      workflowSource,
      succeeded: submissionSummary.succeeded,
      failed: submissionSummary.failed,
      pending: 0,
      skipped: submissionSummary.skipped,
      candidateSkipped: preparation.prepared.candidateSkipped,
      failureCount: failureReasons.length,
    },
  });

  if (
    !workflowSubmissionQueue.isShuttingDown &&
    (failureReasons.length > 0 ||
      shouldEmitWorkflowFinishSummaryToast({
        outcomes: jobOutcomes,
        totalJobs,
        skipped: submissionSummary.skipped,
      }))
  ) {
    emitWorkflowFinishSummary(
      {
        win: args.win,
        workflowLabel,
        succeeded: submissionSummary.succeeded,
        failed: submissionSummary.failed,
        skipped: submissionSummary.skipped,
        failureReasons,
        messageFormatter,
      },
      hiddenWorkflowToastDeps,
    );
  }
}

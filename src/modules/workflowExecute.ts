import type { LoadedWorkflow } from "../workflows/types";
import { appendRuntimeLog } from "./runtimeLogManager";
import {
  buildPreparedWorkflowUnitExecution,
  buildWorkflowExecutionUnitPreview,
  runWorkflowPreparationSeam,
} from "./workflowExecution/preparationSeam";
import { runWorkflowUnitDuplicateGuardSeam } from "./workflowExecution/duplicateGuardSeam";
import { runWorkflowExecutionSeam } from "./workflowExecution/runSeam";
import { runWorkflowApplySeam } from "./workflowExecution/applySeam";
import { workflowSubmissionQueue } from "../jobQueue/workflowSubmissionQueue";
import type {
  WorkflowExecutionUnitOutcome,
  WorkflowSubmissionSummary,
} from "../jobQueue/workflowSubmissionQueueContracts";
import type {
  PreparedWorkflowExecution,
  PreparedWorkflowUnit,
  WorkflowApplySummary,
  WorkflowRunState,
} from "./workflowExecution/contracts";
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

export type PreparedWorkflowUnitExecutionResult = {
  outcome: WorkflowExecutionUnitOutcome;
  runState?: WorkflowRunState;
  applySummary?: WorkflowApplySummary;
  failureReason?: string;
};

type WorkflowUnitSubmissionSummary = Pick<
  WorkflowSubmissionSummary,
  "total" | "succeeded" | "failed" | "skipped"
>;

function summarizeWorkflowUnitOutcomes(
  outcomes: ReadonlyArray<WorkflowExecutionUnitOutcome>,
): WorkflowUnitSubmissionSummary {
  return {
    total: outcomes.length,
    succeeded: outcomes.filter((entry) => entry.status === "succeeded").length,
    failed: outcomes.filter((entry) => entry.status === "failed").length,
    skipped: outcomes.filter((entry) => entry.status === "skipped").length,
  };
}

export async function executePreparedWorkflowUnit(args: {
  prepared: PreparedWorkflowExecution;
  unit: PreparedWorkflowUnit;
  messageFormatter: ReturnType<typeof createLocalizedMessageFormatter>;
}): Promise<PreparedWorkflowUnitExecutionResult> {
  const buildResult = await buildPreparedWorkflowUnitExecution({
    prepared: args.prepared,
    unit: args.unit,
  });
  if (buildResult.status === "skipped") {
    return {
      outcome: {
        status: "skipped",
        reasonCode: "workflow-unit-preflight-skipped",
      },
    };
  }
  const runState = runWorkflowExecutionSeam({
    prepared: buildResult.built,
  });
  await runState.terminalPromise;
  const applySummary = await runWorkflowApplySeam({
    runState,
    messageFormatter: args.messageFormatter,
  });
  const outcome: WorkflowExecutionUnitOutcome =
    applySummary.failed > 0
      ? {
          status: "failed",
          reasonCode: "workflow-unit-execution-or-apply-failed",
        }
      : applySummary.pending > 0
        ? {
            status: "failed",
            reasonCode: "workflow-unit-terminal-result-pending",
          }
        : { status: "succeeded" };
  return {
    outcome,
    runState,
    applySummary,
  };
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

  const executionResults = new Map<
    string,
    PreparedWorkflowUnitExecutionResult
  >();
  const executeUnit = async (unit: PreparedWorkflowUnit) => {
    let result: PreparedWorkflowUnitExecutionResult;
    try {
      result = await executePreparedWorkflowUnit({
        prepared: preparation.prepared,
        unit,
        messageFormatter,
      });
    } catch (error) {
      result = {
        outcome: {
          status: "failed",
          reasonCode: "workflow-unit-build-or-execution-failed",
        },
        failureReason:
          error instanceof Error ? error.message : String(error || "unknown"),
      };
      appendRuntimeLog({
        level: "error",
        scope: "workflow-trigger",
        workflowId: args.workflow.manifest.id,
        stage: "workflow-unit-execution-failed",
        message: "workflow execution unit failed",
        details: {
          unitId: unit.unitId,
          taskName: unit.taskName,
          reason: result.failureReason,
        },
        error,
      });
    }
    executionResults.set(unit.unitId, result);
    return result.outcome;
  };
  const initialOutcomes: WorkflowExecutionUnitOutcome[] = Array.from(
    { length: skippedByGuard },
    () => ({
      status: "skipped",
      reasonCode: "workflow-unit-filtered-or-duplicate",
    }),
  );
  const backendType = String(
    preparation.prepared.executionContext.backend.type || "",
  ).trim();
  let submissionSummary: WorkflowUnitSubmissionSummary;
  if (backendType === "acp" || backendType === "skillrunner") {
    const handle = workflowSubmissionQueue.enqueueSubmission({
      backend: {
        backendType,
        backendId: preparation.prepared.executionContext.backend.id,
      },
      workflow: {
        workflowId: args.workflow.manifest.id,
        workflowLabel,
      },
      units: duplicateGuard.allowedUnits.map((unit) => ({
        unit,
        display: {
          unitId: unit.unitId,
          order: unit.order,
          taskName: unit.taskName,
          inputUnitIdentity: unit.inputUnitIdentity,
          memberIdentities: unit.memberIdentities,
          memberCount: unit.memberCount,
        },
      })),
      maxConcurrency:
        preparation.prepared.executionOptions.hostOptions?.queue
          ?.maxConcurrency,
      initialOutcomes,
      executeUnit,
    });
    submissionSummary = await handle.completion;
  } else {
    const outcomes = [...initialOutcomes];
    if (backendType === "pass-through") {
      for (const unit of duplicateGuard.allowedUnits) {
        outcomes.push(await executeUnit(unit));
      }
    } else {
      outcomes.push(
        ...(await Promise.all(duplicateGuard.allowedUnits.map(executeUnit))),
      );
    }
    submissionSummary = summarizeWorkflowUnitOutcomes(outcomes);
  }

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

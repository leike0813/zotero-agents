import { workflowSubmissionQueue } from "../../jobQueue/workflowSubmissionQueue";
import type { WorkflowSubmissionQueue } from "../../jobQueue/workflowSubmissionQueue";
import type {
  WorkflowExecutionUnitOutcome,
  WorkflowSubmissionId,
  WorkflowSubmissionQueueExecutionContext,
  WorkflowSubmissionSummary,
} from "../../jobQueue/workflowSubmissionQueueContracts";
import { appendRuntimeLog } from "../runtimeLogManager";
import type { WorkflowMessageFormatter } from "../workflowExecuteMessage";
import { runWorkflowApplySeam } from "./applySeam";
import type {
  PreparedWorkflowExecution,
  PreparedWorkflowUnit,
  WorkflowApplySummary,
  WorkflowRunState,
} from "./contracts";
import { buildPreparedWorkflowUnitExecution } from "./preparationSeam";
import { runWorkflowExecutionSeam } from "./runSeam";

export type PreparedWorkflowUnitExecutionResult = {
  outcome: WorkflowExecutionUnitOutcome;
  runState?: WorkflowRunState;
  applySummary?: WorkflowApplySummary;
  failureReason?: string;
};

export type PreparedWorkflowSubmission = Readonly<{
  admission: "host-queue" | "direct";
  submissionId?: WorkflowSubmissionId;
  total: number;
  queued: number;
  skipped: number;
  executionResults: Map<string, PreparedWorkflowUnitExecutionResult>;
  completion: Promise<WorkflowSubmissionSummary>;
}>;

type SubmissionSeamDeps = Readonly<{
  submissionQueue: WorkflowSubmissionQueue;
  executePreparedUnit: typeof executePreparedWorkflowUnit;
  appendRuntimeLog: typeof appendRuntimeLog;
}>;

const defaultSubmissionSeamDeps: SubmissionSeamDeps = {
  submissionQueue: workflowSubmissionQueue,
  executePreparedUnit: executePreparedWorkflowUnit,
  appendRuntimeLog,
};

type PreparedWorkflowUnitDeps = Readonly<{
  buildPreparedUnit: typeof buildPreparedWorkflowUnitExecution;
  runPreparedUnit: typeof runWorkflowExecutionSeam;
  applyPreparedUnit: typeof runWorkflowApplySeam;
}>;

const defaultPreparedWorkflowUnitDeps: PreparedWorkflowUnitDeps = {
  buildPreparedUnit: buildPreparedWorkflowUnitExecution,
  runPreparedUnit: runWorkflowExecutionSeam,
  applyPreparedUnit: runWorkflowApplySeam,
};

function summarizeDirectOutcomes(
  outcomes: ReadonlyArray<WorkflowExecutionUnitOutcome>,
): WorkflowSubmissionSummary {
  return Object.freeze({
    submissionId: "workflow-submission-direct" as WorkflowSubmissionId,
    total: outcomes.length,
    succeeded: outcomes.filter((entry) => entry.status === "succeeded").length,
    failed: outcomes.filter((entry) => entry.status === "failed").length,
    skipped: outcomes.filter((entry) => entry.status === "skipped").length,
  });
}

export async function executePreparedWorkflowUnit(
  args: {
    prepared: PreparedWorkflowExecution;
    unit: PreparedWorkflowUnit;
    messageFormatter: WorkflowMessageFormatter;
    submissionContext?: WorkflowSubmissionQueueExecutionContext;
  },
  deps: Partial<PreparedWorkflowUnitDeps> = {},
): Promise<PreparedWorkflowUnitExecutionResult> {
  const resolved = { ...defaultPreparedWorkflowUnitDeps, ...deps };
  const buildResult = await resolved.buildPreparedUnit({
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
  const runState = resolved.runPreparedUnit({
    prepared: buildResult.built,
    submissionLineage: args.submissionContext,
  });
  await runState.terminalPromise;
  if (args.submissionContext) {
    args.submissionContext.slot.cancelPendingResumption();
    const admitted = await args.submissionContext.slot.ensureSlot("host-apply");
    if (!admitted) {
      return {
        outcome: {
          status: "skipped",
          reasonCode: "workflow-unit-apply-admission-canceled",
        },
        runState,
        failureReason: "Host apply admission was canceled before execution.",
      };
    }
  }
  const applySummary = await resolved.applyPreparedUnit({
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
  return { outcome, runState, applySummary };
}

export async function submitPreparedWorkflowUnits(
  args: {
    prepared: PreparedWorkflowExecution;
    units: ReadonlyArray<PreparedWorkflowUnit>;
    workflowLabel: string;
    skippedByGuard: number;
    messageFormatter: WorkflowMessageFormatter;
  },
  deps: Partial<SubmissionSeamDeps> = {},
): Promise<PreparedWorkflowSubmission> {
  const resolved = { ...defaultSubmissionSeamDeps, ...deps };
  const executionResults = new Map<
    string,
    PreparedWorkflowUnitExecutionResult
  >();
  const executeUnit = async (
    unit: PreparedWorkflowUnit,
    submissionContext?: WorkflowSubmissionQueueExecutionContext,
  ) => {
    let result: PreparedWorkflowUnitExecutionResult;
    try {
      result = await resolved.executePreparedUnit({
        prepared: args.prepared,
        unit,
        messageFormatter: args.messageFormatter,
        submissionContext,
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
      resolved.appendRuntimeLog({
        level: "error",
        scope: "workflow-trigger",
        workflowId: args.prepared.workflow.manifest.id,
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
    { length: args.skippedByGuard },
    () => ({
      status: "skipped",
      reasonCode: "workflow-unit-filtered-or-duplicate",
    }),
  );
  const backendType = String(
    args.prepared.executionContext.backend.type || "",
  ).trim();
  if (backendType === "acp" || backendType === "skillrunner") {
    const providerOptions =
      args.prepared.executionContext.providerOptions || {};
    const handle = resolved.submissionQueue.enqueueSubmission({
      backend: {
        backendType,
        backendId: args.prepared.executionContext.backend.id,
      },
      workflow: {
        workflowId: args.prepared.workflow.manifest.id,
        workflowLabel: args.workflowLabel,
      },
      units: args.units.map((unit) => ({
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
        args.prepared.executionOptions.hostOptions?.queue?.maxConcurrency,
      presentation:
        backendType === "acp"
          ? {
              provider: String(providerOptions.acpModelProvider || "").trim(),
              model: String(providerOptions.acpModelId || "").trim(),
            }
          : {
              provider: String(
                providerOptions.provider_id || providerOptions.engine || "",
              ).trim(),
              model: String(providerOptions.model || "").trim(),
            },
      initialOutcomes,
      executeUnit,
    });
    return Object.freeze({
      admission: "host-queue",
      submissionId: handle.submissionId,
      total: args.units.length + args.skippedByGuard,
      queued: args.units.length,
      skipped: args.skippedByGuard,
      executionResults,
      completion: handle.completion,
    });
  }

  const outcomes = [...initialOutcomes];
  if (backendType === "pass-through") {
    for (const unit of args.units) {
      outcomes.push(await executeUnit(unit));
    }
  } else {
    outcomes.push(
      ...(await Promise.all(args.units.map((unit) => executeUnit(unit)))),
    );
  }
  const summary = summarizeDirectOutcomes(outcomes);
  return Object.freeze({
    admission: "direct",
    total: summary.total,
    queued: 0,
    skipped: args.skippedByGuard,
    executionResults,
    completion: Promise.resolve(summary),
  });
}

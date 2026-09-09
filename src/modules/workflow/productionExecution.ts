import { workflowSubmissionQueue } from "../../jobQueue/workflowSubmissionQueue";
import { appendRuntimeLog } from "../runtimeLogManager";
import { buildSkillRunnerHostBridgeRuntimeEnv } from "../hostBridge/cli/hostBridgeSkillRunnerEnv";
import { openAssistantWorkspaceSidebar } from "../assistant/workspace/assistantWorkspaceSidebar";
import { focusSkillRunnerWorkspace } from "../skillRunner/surface/skillRunnerRunDialog";
import type { DuplicateGuardDeps } from "../workflowExecution/duplicateGuardSeam";
import { runWorkflowApplySeam } from "../workflowExecution/applySeam";
import {
  buildPreparedWorkflowUnitExecution,
  type PreparationDeps,
} from "../workflowExecution/preparationSeam";
import {
  runWorkflowExecutionSeam,
  type RunSeamDeps,
} from "../workflowExecution/runSeam";
import {
  executePreparedWorkflowUnit,
  type PreparedWorkflowUnitDeps,
  type SubmissionSeamDeps,
} from "../workflowExecution/submissionSeam";

export const workflowPreparationProductionDeps: Pick<
  PreparationDeps,
  "buildSkillRunnerHostBridgeEnv"
> = {
  buildSkillRunnerHostBridgeEnv: buildSkillRunnerHostBridgeRuntimeEnv,
};

export const workflowRunProductionDeps: Pick<
  RunSeamDeps,
  "openAssistantWorkspaceSidebar" | "focusSkillRunnerWorkspace"
> = {
  openAssistantWorkspaceSidebar,
  focusSkillRunnerWorkspace,
};

export const workflowDuplicateGuardProductionDeps: Pick<
  DuplicateGuardDeps,
  "hasActiveOrQueuedWorkflowInput"
> = {
  hasActiveOrQueuedWorkflowInput: (args) =>
    workflowSubmissionQueue.hasActiveOrQueuedWorkflowInput(args),
};

const preparedWorkflowUnitProductionDeps: PreparedWorkflowUnitDeps = {
  buildPreparedUnit: (args) =>
    buildPreparedWorkflowUnitExecution(args, workflowPreparationProductionDeps),
  runPreparedUnit: (args) =>
    runWorkflowExecutionSeam(args, workflowRunProductionDeps),
  applyPreparedUnit: runWorkflowApplySeam,
};

export const workflowSubmissionProductionDeps: SubmissionSeamDeps = {
  submissionQueue: workflowSubmissionQueue,
  appendRuntimeLog,
  executePreparedUnit: (args) =>
    executePreparedWorkflowUnit(args, preparedWorkflowUnitProductionDeps),
};

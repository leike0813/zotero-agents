import { workflowSubmissionQueue } from "../../jobQueue/workflowSubmissionQueue";
import { appendRuntimeLog } from "../runtimeLogManager";
import { buildSkillRunnerHostBridgeRuntimeEnv } from "../hostBridge/cli/hostBridgeSkillRunnerEnv";
import { openAssistantWorkspaceSidebar } from "../assistant/workspace/assistantWorkspaceSidebar";
import { focusSkillRunnerWorkspace } from "../skillRunner/surface/skillRunnerRunDialog";
import { runWorkflowApplySeam } from "../workflowExecution/applySeam";
import { buildPreparedWorkflowUnitExecution, } from "../workflowExecution/preparationSeam";
import { runWorkflowExecutionSeam, } from "../workflowExecution/runSeam";
import { executePreparedWorkflowUnit, } from "../workflowExecution/submissionSeam";
export const workflowPreparationProductionDeps = {
    buildSkillRunnerHostBridgeEnv: buildSkillRunnerHostBridgeRuntimeEnv,
};
export const workflowRunProductionDeps = {
    openAssistantWorkspaceSidebar,
    focusSkillRunnerWorkspace,
};
export const workflowDuplicateGuardProductionDeps = {
    hasActiveOrQueuedWorkflowInput: (args) => workflowSubmissionQueue.hasActiveOrQueuedWorkflowInput(args),
};
const preparedWorkflowUnitProductionDeps = {
    buildPreparedUnit: (args) => buildPreparedWorkflowUnitExecution(args, workflowPreparationProductionDeps),
    runPreparedUnit: (args) => runWorkflowExecutionSeam(args, workflowRunProductionDeps),
    applyPreparedUnit: runWorkflowApplySeam,
};
export const workflowSubmissionProductionDeps = {
    submissionQueue: workflowSubmissionQueue,
    appendRuntimeLog,
    executePreparedUnit: (args) => executePreparedWorkflowUnit(args, preparedWorkflowUnitProductionDeps),
};

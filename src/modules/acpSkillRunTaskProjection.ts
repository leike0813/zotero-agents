import { ACP_SKILL_RUN_REQUEST_KIND } from "../config/defaults";
import type { AcpSkillRunSummary } from "./acpSkillRunStore";
import type { WorkflowTaskRecord } from "./taskRuntime";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export function resolveAcpSkillRunWorkflowTaskState(
  run: Pick<
    AcpSkillRunSummary,
    "status" | "pendingPermission" | "pendingInteraction"
  >,
): WorkflowTaskRecord["state"] {
  if (
    run.status === "succeeded" ||
    run.status === "failed" ||
    run.status === "canceled"
  ) {
    return run.status;
  }
  if (run.pendingPermission) {
    return "waiting_user";
  }
  if (run.status === "failed_retriable") {
    return run.pendingInteraction ? "waiting_user" : "running";
  }
  if (run.status === "repairing") {
    return "running";
  }
  return (normalizeText(run.status) ||
    "running") as WorkflowTaskRecord["state"];
}

export function mapAcpSkillRunSummaryToWorkflowTask(
  run: AcpSkillRunSummary,
): WorkflowTaskRecord {
  const requestId = normalizeText(run.requestId);
  const workflowLabel =
    normalizeText(run.workflowLabel) ||
    normalizeText(run.skillLabel) ||
    normalizeText(run.skillName) ||
    normalizeText(run.skillId) ||
    "ACP Skill Run";
  return {
    id: `acp-skill-run:${requestId}`,
    runId: normalizeText(run.runId) || requestId,
    jobId: normalizeText(run.jobId) || "-",
    requestId,
    sequenceStepId: normalizeText(run.sequenceStepId) || undefined,
    sequenceStepIndex: run.sequenceStepIndex,
    sequenceFinalStepId: normalizeText(run.sequenceFinalStepId) || undefined,
    role: run.sequenceStepId ? "sequence_step" : "single",
    workflowId:
      normalizeText(run.workflowId) ||
      normalizeText(run.skillId) ||
      "acp-skill-run",
    workflowLabel,
    taskName: normalizeText(run.taskName) || workflowLabel || requestId,
    providerId: "acp",
    requestKind: ACP_SKILL_RUN_REQUEST_KIND,
    backendId: normalizeText(run.backendId),
    backendType: normalizeText(run.backendType) || "acp",
    backendBaseUrl: "",
    engine: normalizeText(run.agentFamily) || normalizeText(run.acpModelId),
    state: resolveAcpSkillRunWorkflowTaskState(run),
    backendStatus: normalizeText(run.backendStatus) || undefined,
    applyState: run.applyResultState || undefined,
    error:
      run.status === "succeeded" ||
      run.status === "failed" ||
      run.status === "canceled"
        ? normalizeText(run.error)
        : normalizeText(run.error) || normalizeText(run.conversationError),
    createdAt: normalizeText(run.createdAt) || normalizeText(run.updatedAt),
    updatedAt: normalizeText(run.updatedAt) || normalizeText(run.createdAt),
  };
}

import { openAssistantWorkspaceSidebar } from "../../assistant/workspace/assistantWorkspaceSidebar";
import { upsertAcpSkillRun } from "./acpSkillRunStore";
import { selectAcpSkillRun } from "./acpSkillRunWorkspaceSelection";
import { resolveSkillRunnerExecutionModeFromRequest } from "../../skillRunner/run/skillRunnerExecutionMode";
function normalizeString(value) {
    return String(value || "").trim();
}
function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function normalizeSequenceStepIndex(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.floor(parsed) : undefined;
}
function resolveBackendLabel(backend) {
    return (normalizeString(backend
        .label) ||
        normalizeString(backend.name) ||
        normalizeString(backend.displayName) ||
        undefined);
}
const defaultDeps = {
    upsertAcpSkillRun,
    selectAcpSkillRun,
    openAssistantWorkspaceSidebar,
};
export function requestAcpSkillRunForeground(args) {
    const requestId = normalizeString(args.requestId);
    if (!requestId) {
        return;
    }
    const deps = {
        ...defaultDeps,
        ...(args.deps || {}),
    };
    const requestSkillId = isRecord(args.request)
        ? normalizeString(args.request.skill_id)
        : "";
    deps.upsertAcpSkillRun({
        requestId,
        status: "running",
        backendId: args.backend.id,
        backendType: args.backend.type,
        backendLabel: resolveBackendLabel(args.backend),
        workflowId: normalizeString(args.workflowId) || undefined,
        workflowLabel: normalizeString(args.workflowLabel) || undefined,
        jobId: normalizeString(args.jobId) || undefined,
        runId: normalizeString(args.runId) || undefined,
        sequenceStepId: normalizeString(args.sequenceStepId) || undefined,
        sequenceStepIndex: normalizeSequenceStepIndex(args.sequenceStepIndex),
        sequenceFinalStepId: normalizeString(args.sequenceFinalStepId) || undefined,
        taskName: normalizeString(args.taskName) || undefined,
        skillId: normalizeString(args.skillId) || requestSkillId || undefined,
        requestPayload: args.request,
    });
    void deps.selectAcpSkillRun(requestId);
    if (resolveSkillRunnerExecutionModeFromRequest(args.request, "auto") ===
        "interactive") {
        void deps.openAssistantWorkspaceSidebar({
            tab: "acp-skills",
            backend: args.backend,
            requestId,
        });
    }
}

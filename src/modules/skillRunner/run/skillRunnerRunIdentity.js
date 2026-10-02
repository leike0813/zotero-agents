function normalizeIdentityPart(value) {
    return String(value || "").trim();
}
export function buildSkillRunnerSequenceStepLocalRunId(args) {
    const workflowRunId = normalizeIdentityPart(args.workflowRunId);
    const sequenceJobId = normalizeIdentityPart(args.sequenceJobId);
    const stepId = normalizeIdentityPart(args.stepId);
    if (!workflowRunId || !sequenceJobId || !stepId) {
        return "";
    }
    return `${workflowRunId}:${sequenceJobId}:${stepId}`;
}

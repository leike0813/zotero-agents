import { acpSkillRunControllerPurposes, acpSkillRunControllers, normalizeString, } from "./acpSkillRunState";
export function isTerminalAcpSkillRunStatus(status) {
    return status === "succeeded" || status === "failed" || status === "canceled";
}
export function isActiveAcpSkillRunStatus(status) {
    return (status === "queued" ||
        status === "running" ||
        status === "waiting_user" ||
        status === "repairing" ||
        status === "failed_retriable");
}
export function isRecoverableAcpSkillRunStatus(status) {
    return (status === "running" ||
        status === "waiting_user" ||
        status === "repairing" ||
        status === "failed_retriable");
}
export function isEligibleForPostTerminalAcpSkillRunConversation(record) {
    if (!record ||
        (record.status !== "succeeded" && record.status !== "failed")) {
        return false;
    }
    if (record.removedAt ||
        record.archivedAt ||
        !normalizeString(record.sessionId) ||
        record.conversationState === "ended" ||
        record.conversationRecoveryState === "unavailable" ||
        record.conversationRecoveryState === "unsupported" ||
        record.pendingInteraction ||
        record.pendingPermission ||
        record.applyResultState === "pending" ||
        record.outputConvergenceState === "pending") {
        return false;
    }
    return (record.status === "failed" ||
        record.applyResultState === "succeeded" ||
        typeof record.applyResultState === "undefined");
}
export function isPostTerminalAcpSkillRunConversationConnected(requestIdRaw) {
    const requestId = normalizeString(requestIdRaw);
    return (!!requestId &&
        acpSkillRunControllers.has(requestId) &&
        acpSkillRunControllerPurposes.get(requestId) ===
            "post-terminal-conversation");
}
function isRecoverableAcpRecoveryState(state) {
    return (state === "available" || state === "connecting" || state === "connected");
}
export function isRecoverablePromptFailure(record) {
    const recoveryState = record.conversationRecoveryState || "unavailable";
    return (!record.removedAt &&
        !record.archivedAt &&
        !!normalizeString(record.sessionId) &&
        isRecoverableAcpRecoveryState(recoveryState));
}

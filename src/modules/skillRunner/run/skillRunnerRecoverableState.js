import { isSkillRunnerRunTerminalClientError, isSkillRunnerTerminalRunError, } from "../../../providers/skillrunner/errors";
import { isActive } from "./skillRunnerProviderStateMachine";
function normalizeString(value) {
    return String(value || "").trim();
}
function isObjectRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
export function isSkillRunnerJobLike(job) {
    return normalizeString(job?.meta?.providerId) === "skillrunner";
}
export function getSkillRunnerRequestIdFromJob(job) {
    if (!job) {
        return "";
    }
    const resultRequestId = job.result && typeof job.result === "object" && !Array.isArray(job.result)
        ? normalizeString(job.result.requestId)
        : "";
    return resultRequestId || normalizeString(job.meta?.requestId);
}
export function isSkillRunnerRequestReadyForRecovery(job) {
    if (!job || !getSkillRunnerRequestIdFromJob(job)) {
        return false;
    }
    if (job.meta?.skillRunnerRequestReady === true ||
        normalizeString(job.meta?.skillRunnerRequestReady) === "true") {
        return true;
    }
    if (!isObjectRecord(job.result)) {
        return false;
    }
    return normalizeString(job.result.status) === "deferred";
}
export function isPreReadySkillRunnerRequest(job) {
    return (isSkillRunnerJobLike(job) &&
        !!getSkillRunnerRequestIdFromJob(job) &&
        !isSkillRunnerRequestReadyForRecovery(job));
}
export function hasRecoverableSkillRunnerRequest(job) {
    if (!isSkillRunnerJobLike(job) || !getSkillRunnerRequestIdFromJob(job)) {
        return false;
    }
    if (job?.meta?.skillRunnerTerminalRunError) {
        return false;
    }
    return isSkillRunnerRequestReadyForRecovery(job);
}
export function isNonRecoverableSkillRunnerFailure(error) {
    const message = error instanceof Error ? error.message : normalizeString(error);
    return (isSkillRunnerRunTerminalClientError(error) ||
        isSkillRunnerTerminalRunError(error) ||
        /schema validation failed/i.test(message));
}
export function coerceRecoverableSkillRunnerState(state) {
    return isActive(state) ? state : "running";
}
export function isRecoverableSkillRunnerDispatchFailure(job) {
    return (hasRecoverableSkillRunnerRequest(job) &&
        normalizeString(job?.state) === "failed");
}

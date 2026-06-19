import type { JobRecord, JobState } from "../jobQueue/manager";
import {
  isSkillRunnerRunTerminalClientError,
  isSkillRunnerTerminalRunError,
} from "../providers/skillrunner/errors";
import { isActive } from "./skillRunnerProviderStateMachine";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

type JobLike = Pick<JobRecord, "meta" | "result" | "state"> & {
  error?: string;
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isSkillRunnerJobLike(
  job: Pick<JobRecord, "meta"> | null | undefined,
) {
  return normalizeString(job?.meta?.providerId) === "skillrunner";
}

export function getSkillRunnerRequestIdFromJob(
  job: Pick<JobRecord, "meta" | "result"> | null | undefined,
) {
  if (!job) {
    return "";
  }
  const resultRequestId =
    job.result && typeof job.result === "object" && !Array.isArray(job.result)
      ? normalizeString((job.result as { requestId?: unknown }).requestId)
      : "";
  return resultRequestId || normalizeString(job.meta?.requestId);
}

export function isSkillRunnerRequestReadyForRecovery(
  job: JobLike | null | undefined,
) {
  if (!job || !getSkillRunnerRequestIdFromJob(job)) {
    return false;
  }
  if (
    job.meta?.skillRunnerRequestReady === true ||
    normalizeString(job.meta?.skillRunnerRequestReady) === "true"
  ) {
    return true;
  }
  if (!isObjectRecord(job.result)) {
    return false;
  }
  return normalizeString(job.result.status) === "deferred";
}

export function isPreReadySkillRunnerRequest(job: JobLike | null | undefined) {
  return (
    isSkillRunnerJobLike(job) &&
    !!getSkillRunnerRequestIdFromJob(job) &&
    !isSkillRunnerRequestReadyForRecovery(job)
  );
}

export function hasRecoverableSkillRunnerRequest(
  job: JobLike | null | undefined,
) {
  if (!isSkillRunnerJobLike(job) || !getSkillRunnerRequestIdFromJob(job)) {
    return false;
  }
  if (job?.meta?.skillRunnerTerminalRunError) {
    return false;
  }
  return isSkillRunnerRequestReadyForRecovery(job);
}

export function isNonRecoverableSkillRunnerFailure(error: unknown) {
  return (
    isSkillRunnerRunTerminalClientError(error) ||
    isSkillRunnerTerminalRunError(error)
  );
}

export function coerceRecoverableSkillRunnerState(state: JobState) {
  return isActive(state) ? state : ("running" as const);
}

export function isRecoverableSkillRunnerDispatchFailure(
  job: JobLike | null | undefined,
) {
  return (
    hasRecoverableSkillRunnerRequest(job) &&
    normalizeString(job?.state) === "failed"
  );
}

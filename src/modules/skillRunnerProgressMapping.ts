import type { JobState } from "../jobQueue/manager";

function normalizeProgressText(value: unknown) {
  return String(value || "").trim();
}

export function mapSkillRunnerSequenceStepProgressState(
  event: Record<string, unknown>,
): JobState {
  const type = normalizeProgressText(event.type);
  if (type === "sequence-step-succeeded") {
    return "succeeded";
  }
  if (type === "sequence-step-canceled") {
    return "canceled";
  }
  if (type === "sequence-step-failed") {
    return "failed";
  }
  if (type === "sequence-step-deferred") {
    const backendStatus = normalizeProgressText(event.backendStatus);
    if (
      backendStatus === "queued" ||
      backendStatus === "waiting_user" ||
      backendStatus === "waiting_auth"
    ) {
      return backendStatus;
    }
  }
  return "running";
}

export function mapSkillRunnerProgressLifecycle(
  event: Record<string, unknown>,
) {
  const type = normalizeProgressText(event.type);
  if (type === "request-created" || type === "request-uploading") {
    return "uploading";
  }
  if (type === "request-ready") {
    return "running";
  }
  if (
    type === "sequence-step-deferred" ||
    type === "sequence-step-succeeded" ||
    type === "sequence-step-failed" ||
    type === "sequence-step-canceled"
  ) {
    return mapSkillRunnerSequenceStepProgressState(event);
  }
  if (type === "request-creating" || type === "sequence-step-started") {
    return "request_creating";
  }
  return "";
}

export function mapSkillRunnerSubmitPhase(event: Record<string, unknown>) {
  const type = normalizeProgressText(event.type);
  if (type === "request-created" || type === "request-uploading") {
    return "uploading";
  }
  if (
    type === "request-ready" ||
    type === "sequence-step-deferred" ||
    type === "sequence-step-succeeded"
  ) {
    return "request_ready";
  }
  if (type === "request-creating" || type === "sequence-step-started") {
    return "request_creating";
  }
  return "";
}

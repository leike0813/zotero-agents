import {
  acpSkillRunControllerPurposes,
  acpSkillRunControllers,
  normalizeString,
} from "./acpSkillRunState";
import type {
  AcpSkillRunRecord,
  AcpSkillRunRecoveryState,
  AcpSkillRunStatus,
} from "./acpSkillRunStore";

export function isTerminalAcpSkillRunStatus(
  status: AcpSkillRunStatus,
): status is "succeeded" | "failed" | "canceled" {
  return status === "succeeded" || status === "failed" || status === "canceled";
}

export function isActiveAcpSkillRunStatus(status: AcpSkillRunStatus) {
  return (
    status === "queued" ||
    status === "running" ||
    status === "waiting_user" ||
    status === "repairing" ||
    status === "failed_retriable"
  );
}

export function isRecoverableAcpSkillRunStatus(status: AcpSkillRunStatus) {
  return (
    status === "running" ||
    status === "waiting_user" ||
    status === "repairing" ||
    status === "failed_retriable"
  );
}

export type PostTerminalConversationEligibilityRecord = Pick<
  AcpSkillRunRecord,
  | "status"
  | "sessionId"
  | "removedAt"
  | "archivedAt"
  | "conversationState"
  | "conversationRecoveryState"
  | "pendingInteraction"
  | "pendingPermission"
  | "applyResultState"
  | "outputConvergenceState"
>;

export function isEligibleForPostTerminalAcpSkillRunConversation(
  record: PostTerminalConversationEligibilityRecord | null | undefined,
) {
  if (
    !record ||
    (record.status !== "succeeded" && record.status !== "failed")
  ) {
    return false;
  }
  if (
    record.removedAt ||
    record.archivedAt ||
    !normalizeString(record.sessionId) ||
    record.conversationState === "ended" ||
    record.conversationRecoveryState === "unavailable" ||
    record.conversationRecoveryState === "unsupported" ||
    record.pendingInteraction ||
    record.pendingPermission ||
    record.applyResultState === "pending" ||
    record.outputConvergenceState === "pending"
  ) {
    return false;
  }
  return (
    record.status === "failed" ||
    record.applyResultState === "succeeded" ||
    typeof record.applyResultState === "undefined"
  );
}

export function isPostTerminalAcpSkillRunConversationConnected(
  requestIdRaw: string,
) {
  const requestId = normalizeString(requestIdRaw);
  return (
    !!requestId &&
    acpSkillRunControllers.has(requestId) &&
    acpSkillRunControllerPurposes.get(requestId) ===
      "post-terminal-conversation"
  );
}

function isRecoverableAcpRecoveryState(state: AcpSkillRunRecoveryState) {
  return (
    state === "available" || state === "connecting" || state === "connected"
  );
}

export function isRecoverablePromptFailure(
  record: Pick<
    AcpSkillRunRecord,
    "sessionId" | "conversationRecoveryState" | "removedAt" | "archivedAt"
  >,
) {
  const recoveryState = record.conversationRecoveryState || "unavailable";
  return (
    !record.removedAt &&
    !record.archivedAt &&
    !!normalizeString(record.sessionId) &&
    isRecoverableAcpRecoveryState(recoveryState)
  );
}

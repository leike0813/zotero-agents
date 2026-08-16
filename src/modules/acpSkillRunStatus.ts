import type { AcpSkillRunRecord, AcpSkillRunStatus } from "./acpSkillRunStore";

export type AcpSkillRunStatusHost = {
  isTerminal: (...args: any[]) => any;
  isActive: (...args: any[]) => any;
  isRecoverable: (...args: any[]) => any;
  isEligibleForPostTerminalConversation: (...args: any[]) => any;
  isPostTerminalConversationConnected: (...args: any[]) => any;
  isRecoverablePromptFailure: (...args: any[]) => any;
};

let host: AcpSkillRunStatusHost | undefined;

export function configureAcpSkillRunStatusHost(
  nextHost: AcpSkillRunStatusHost,
) {
  host = nextHost;
}

function requireAcpSkillRunStatusHost(): AcpSkillRunStatusHost {
  if (!host) {
    throw new Error("ACP Skill Run status host is not configured.");
  }
  return host;
}

export function isTerminalAcpSkillRunStatus(status: AcpSkillRunStatus) {
  return requireAcpSkillRunStatusHost().isTerminal(status);
}

export function isActiveAcpSkillRunStatus(status: AcpSkillRunStatus) {
  return requireAcpSkillRunStatusHost().isActive(status);
}

export function isRecoverableAcpSkillRunStatus(status: AcpSkillRunStatus) {
  return requireAcpSkillRunStatusHost().isRecoverable(status);
}

export function isEligibleForPostTerminalAcpSkillRunConversation(
  record: Parameters<
    AcpSkillRunStatusHost["isEligibleForPostTerminalConversation"]
  >[0],
) {
  return requireAcpSkillRunStatusHost().isEligibleForPostTerminalConversation(
    record,
  );
}

export function isPostTerminalAcpSkillRunConversationConnected(
  record: Parameters<
    AcpSkillRunStatusHost["isPostTerminalConversationConnected"]
  >[0],
) {
  return requireAcpSkillRunStatusHost().isPostTerminalConversationConnected(
    record,
  );
}

export function isRecoverablePromptFailure(
  record: Parameters<AcpSkillRunStatusHost["isRecoverablePromptFailure"]>[0],
) {
  return requireAcpSkillRunStatusHost().isRecoverablePromptFailure(record);
}

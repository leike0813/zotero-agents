import type { AcpSkillRunReplyRequest } from "./acpSkillRunStore";

export type AcpSkillRunActionsHost = {
  cancel: (...args: any[]) => any;
  interruptCurrentTurn: (...args: any[]) => any;
  archive: (...args: any[]) => any;
  reply: (...args: any[]) => any;
  connect: (...args: any[]) => any;
  disconnect: (...args: any[]) => any;
  endSession: (...args: any[]) => any;
  setMode: (...args: any[]) => any;
  setModel: (...args: any[]) => any;
  setReasoningEffort: (...args: any[]) => any;
  detachControllerAfterApplyResult: (...args: any[]) => any;
  markApplyResult: (...args: any[]) => any;
  shutdownConversations: (...args: any[]) => any;
  isPromptActive: (...args: any[]) => any;
  canEditModelConfiguration: (...args: any[]) => any;
};

let host: AcpSkillRunActionsHost | undefined;

export function configureAcpSkillRunActionsHost(
  nextHost: AcpSkillRunActionsHost,
) {
  host = nextHost;
}

function requireAcpSkillRunActionsHost() {
  if (!host) {
    throw new Error("ACP Skill Run actions host is not configured.");
  }
  return host;
}

export async function cancelAcpSkillRun(requestId: string) {
  await requireAcpSkillRunActionsHost().cancel(requestId);
}

export async function interruptAcpSkillRunCurrentTurn(requestId: string) {
  await requireAcpSkillRunActionsHost().interruptCurrentTurn(requestId);
}

export function archiveAcpSkillRun(requestId: string) {
  requireAcpSkillRunActionsHost().archive(requestId);
}

export async function replyAcpSkillRun(args: {
  requestId: string;
  message?: string;
  displayMessage?: string;
  promptMessage?: string;
}) {
  await requireAcpSkillRunActionsHost().reply(args);
}

export async function connectAcpSkillRun(requestId: string) {
  await requireAcpSkillRunActionsHost().connect(requestId);
}

export async function disconnectAcpSkillRun(requestId: string) {
  await requireAcpSkillRunActionsHost().disconnect(requestId);
}

export async function endAcpSkillRunSession(requestId: string) {
  await requireAcpSkillRunActionsHost().endSession(requestId);
}

export async function setAcpSkillRunMode(args: {
  requestId: string;
  modeId: string;
}) {
  await requireAcpSkillRunActionsHost().setMode(args);
}

export async function setAcpSkillRunModel(args: {
  requestId: string;
  modelId: string;
}) {
  await requireAcpSkillRunActionsHost().setModel(args);
}

export async function setAcpSkillRunReasoningEffort(args: {
  requestId: string;
  effortId: string;
}) {
  await requireAcpSkillRunActionsHost().setReasoningEffort(args);
}

export async function detachAcpSkillRunControllerAfterApplyResult(args: {
  requestId: string;
  state: "succeeded" | "failed";
}) {
  await requireAcpSkillRunActionsHost().detachControllerAfterApplyResult(args);
}

export function markAcpSkillRunApplyResult(args: {
  requestId?: string;
  state: "pending" | "succeeded" | "failed";
  error?: string;
}) {
  requireAcpSkillRunActionsHost().markApplyResult(args);
}

export async function shutdownAcpSkillRunConversations() {
  await requireAcpSkillRunActionsHost().shutdownConversations();
}

export function isAcpSkillRunPromptActive(
  run: Pick<
    import("./acpSkillRunStore").AcpSkillRunRecord,
    "activePrompt" | "replyState"
  >,
) {
  return requireAcpSkillRunActionsHost().isPromptActive(run);
}

export function canEditAcpSkillRunModelConfiguration(
  run: Pick<
    import("./acpSkillRunStore").AcpSkillRunRecord,
    "status" | "activePrompt" | "replyState"
  >,
) {
  return requireAcpSkillRunActionsHost().canEditModelConfiguration(run);
}

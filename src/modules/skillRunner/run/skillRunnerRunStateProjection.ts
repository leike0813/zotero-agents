import {
  isTerminal,
  isWaiting,
  normalizeStatusWithGuard,
  type SkillRunnerProviderState,
  type SkillRunnerStateMachineViolation,
  type SkillRunnerWaitingState,
} from "./skillRunnerProviderStateMachine";

export type SkillRunnerProjectedRunState = {
  status: SkillRunnerProviderState;
  waitingOwner?: SkillRunnerWaitingState;
  shouldClearPending: boolean;
  derivedFromPendingOwner: boolean;
  violation?: SkillRunnerStateMachineViolation;
};

function toWaitingOwner(value: unknown): SkillRunnerWaitingState | undefined {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "waiting_user" || normalized.startsWith("waiting_user.")) {
    return "waiting_user";
  }
  if (normalized === "waiting_auth" || normalized.startsWith("waiting_auth.")) {
    return "waiting_auth";
  }
  return undefined;
}

export function projectSkillRunnerRunState(args: {
  runStatus: unknown;
  pending?: Record<string, unknown> | null;
  fallback?: SkillRunnerProviderState;
  requestId?: string;
}): SkillRunnerProjectedRunState {
  const statusNormalized = normalizeStatusWithGuard({
    value: args.runStatus,
    fallback: args.fallback || "running",
    requestId: args.requestId,
  });
  const waitingOwner = toWaitingOwner(args.pending?.pending_owner);
  const status = statusNormalized.status;
  if (isTerminal(status)) {
    return {
      status,
      shouldClearPending: true,
      derivedFromPendingOwner: false,
      violation: statusNormalized.violation,
    };
  }
  if (isWaiting(status)) {
    return {
      status,
      waitingOwner: status,
      shouldClearPending: false,
      derivedFromPendingOwner: false,
      violation: statusNormalized.violation,
    };
  }
  if ((status === "queued" || status === "running") && waitingOwner) {
    return {
      status: waitingOwner,
      waitingOwner,
      shouldClearPending: false,
      derivedFromPendingOwner: true,
      violation: statusNormalized.violation,
    };
  }
  return {
    status,
    shouldClearPending: true,
    derivedFromPendingOwner: false,
    violation: statusNormalized.violation,
  };
}

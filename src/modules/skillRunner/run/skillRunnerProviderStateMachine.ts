export type SkillRunnerProviderState =
  | "queued"
  | "running"
  | "waiting_user"
  | "waiting_auth"
  | "succeeded"
  | "failed"
  | "canceled";

export type SkillRunnerWaitingState = "waiting_user" | "waiting_auth";

export type SkillRunnerStateMachineRuleId =
  | "status.unknown"
  | "transition.illegal"
  | "event.deferred_without_request_created"
  | "event.resume_without_waiting"
  | "event.apply_without_terminal_success"
  | "event.apply_multiple_times"
  | "event.terminal_non_terminal_status";

export type SkillRunnerStateMachineViolation = {
  ruleId: SkillRunnerStateMachineRuleId;
  action: "degraded";
  requestId?: string;
  prevState?: SkillRunnerProviderState;
  nextState?: SkillRunnerProviderState;
  eventKind?: string;
  rawStatus?: string;
  fallbackState?: SkillRunnerProviderState;
  details?: Record<string, unknown>;
};

export type SkillRunnerTransitionValidation = {
  ok: boolean;
  prevState: SkillRunnerProviderState;
  nextState: SkillRunnerProviderState;
  violation?: SkillRunnerStateMachineViolation;
};

export type SkillRunnerStateEventKind =
  | "request-created"
  | "deferred"
  | "waiting"
  | "waiting-resumed"
  | "terminal"
  | "apply-succeeded";

export type SkillRunnerStateEvent = {
  kind: SkillRunnerStateEventKind | string;
  status?: SkillRunnerProviderState | string;
};

export const SKILLRUNNER_PROVIDER_STATES: SkillRunnerProviderState[] = [
  "queued",
  "running",
  "waiting_user",
  "waiting_auth",
  "succeeded",
  "failed",
  "canceled",
];

export const SKILLRUNNER_TERMINAL_STATES: SkillRunnerProviderState[] = [
  "succeeded",
  "failed",
  "canceled",
];

export const SKILLRUNNER_WAITING_STATES: SkillRunnerWaitingState[] = [
  "waiting_user",
  "waiting_auth",
];

const TERMINAL_STATES = new Set<SkillRunnerProviderState>(
  SKILLRUNNER_TERMINAL_STATES,
);

const WAITING_STATES = new Set<SkillRunnerProviderState>(
  SKILLRUNNER_WAITING_STATES,
);

const LEGAL_TRANSITIONS: Record<
  SkillRunnerProviderState,
  ReadonlySet<SkillRunnerProviderState>
> = {
  queued: new Set<SkillRunnerProviderState>([
    "queued",
    "running",
    "waiting_user",
    "waiting_auth",
    "succeeded",
    "failed",
    "canceled",
  ]),
  running: new Set<SkillRunnerProviderState>([
    "queued",
    "running",
    "waiting_user",
    "waiting_auth",
    "succeeded",
    "failed",
    "canceled",
  ]),
  waiting_user: new Set<SkillRunnerProviderState>([
    "running",
    "waiting_user",
    "waiting_auth",
    "succeeded",
    "failed",
    "canceled",
  ]),
  waiting_auth: new Set<SkillRunnerProviderState>([
    "running",
    "waiting_user",
    "waiting_auth",
    "succeeded",
    "failed",
    "canceled",
  ]),
  succeeded: new Set<SkillRunnerProviderState>(["succeeded"]),
  failed: new Set<SkillRunnerProviderState>(["failed"]),
  canceled: new Set<SkillRunnerProviderState>(["canceled"]),
};

function normalizeEventKind(value: unknown): SkillRunnerStateEventKind | "" {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "request-created") {
    return "request-created";
  }
  if (normalized === "deferred" || normalized === "dispatch-deferred") {
    return "deferred";
  }
  if (
    normalized === "waiting" ||
    normalized === "backend-waiting" ||
    normalized === "waiting_user" ||
    normalized === "waiting_auth"
  ) {
    return "waiting";
  }
  if (normalized === "waiting-resumed" || normalized === "backend-resumed") {
    return "waiting-resumed";
  }
  if (normalized === "terminal" || normalized === "backend-terminal") {
    return "terminal";
  }
  if (normalized === "apply-succeeded") {
    return "apply-succeeded";
  }
  return "";
}

export function isKnownStatus(
  value: unknown,
): value is SkillRunnerProviderState {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return SKILLRUNNER_PROVIDER_STATES.includes(
    normalized as SkillRunnerProviderState,
  );
}

export function normalizeStatus(
  value: unknown,
  fallback: SkillRunnerProviderState = "running",
): SkillRunnerProviderState {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (
    SKILLRUNNER_PROVIDER_STATES.includes(normalized as SkillRunnerProviderState)
  ) {
    return normalized as SkillRunnerProviderState;
  }
  return fallback;
}

export function normalizeStatusWithGuard(args: {
  value: unknown;
  fallback?: SkillRunnerProviderState;
  requestId?: string;
}): {
  status: SkillRunnerProviderState;
  violation?: SkillRunnerStateMachineViolation;
} {
  const fallback = args.fallback || "running";
  const normalized = normalizeStatus(args.value, fallback);
  if (isKnownStatus(args.value)) {
    return { status: normalized };
  }
  return {
    status: normalized,
    violation: {
      ruleId: "status.unknown",
      action: "degraded",
      requestId: String(args.requestId || "").trim() || undefined,
      rawStatus: String(args.value || "").trim() || undefined,
      fallbackState: fallback,
    },
  };
}

export function isTerminal(status: unknown) {
  return TERMINAL_STATES.has(normalizeStatus(status, "running"));
}

export function isWaiting(status: unknown): status is SkillRunnerWaitingState {
  const normalized = normalizeStatus(status, "running");
  return WAITING_STATES.has(normalized);
}

export function isActive(status: unknown) {
  return !isTerminal(status);
}

export function validateTransition(args: {
  prev: unknown;
  next: unknown;
  requestId?: string;
}): SkillRunnerTransitionValidation {
  const prevNormalized = normalizeStatusWithGuard({
    value: args.prev,
    fallback: "running",
    requestId: args.requestId,
  });
  const nextNormalized = normalizeStatusWithGuard({
    value: args.next,
    fallback: prevNormalized.status,
    requestId: args.requestId,
  });
  const prevState = prevNormalized.status;
  const nextState = nextNormalized.status;
  const allowed = LEGAL_TRANSITIONS[prevState];
  if (allowed.has(nextState)) {
    return {
      ok: true,
      prevState,
      nextState,
      violation: nextNormalized.violation || prevNormalized.violation,
    };
  }
  return {
    ok: false,
    prevState,
    nextState,
    violation: {
      ruleId: "transition.illegal",
      action: "degraded",
      requestId: String(args.requestId || "").trim() || undefined,
      prevState,
      nextState,
      details: {
        from: prevState,
        to: nextState,
      },
    },
  };
}

export function validateEventOrder(args: {
  events: SkillRunnerStateEvent[];
  requestId?: string;
}) {
  const requestId = String(args.requestId || "").trim() || undefined;
  const violations: SkillRunnerStateMachineViolation[] = [];
  let seenRequestCreated = false;
  let seenWaiting = false;
  let terminalSucceeded = false;
  let applyCount = 0;
  for (const event of args.events) {
    const eventKind = normalizeEventKind(event?.kind);
    if (!eventKind) {
      continue;
    }
    if (eventKind === "request-created") {
      seenRequestCreated = true;
      continue;
    }
    if (eventKind === "deferred") {
      if (!seenRequestCreated) {
        violations.push({
          ruleId: "event.deferred_without_request_created",
          action: "degraded",
          requestId,
          eventKind,
        });
      }
      continue;
    }
    if (eventKind === "waiting") {
      seenWaiting = true;
      continue;
    }
    if (eventKind === "waiting-resumed") {
      if (!seenWaiting) {
        violations.push({
          ruleId: "event.resume_without_waiting",
          action: "degraded",
          requestId,
          eventKind,
        });
      }
      continue;
    }
    if (eventKind === "terminal") {
      const terminalStatus = normalizeStatus(event.status, "running");
      if (terminalStatus === "succeeded") {
        terminalSucceeded = true;
      } else if (!isTerminal(terminalStatus)) {
        violations.push({
          ruleId: "event.terminal_non_terminal_status",
          action: "degraded",
          requestId,
          eventKind,
          nextState: terminalStatus,
        });
      }
      continue;
    }
    if (eventKind === "apply-succeeded") {
      applyCount += 1;
      if (!terminalSucceeded) {
        violations.push({
          ruleId: "event.apply_without_terminal_success",
          action: "degraded",
          requestId,
          eventKind,
        });
      }
      if (applyCount > 1) {
        violations.push({
          ruleId: "event.apply_multiple_times",
          action: "degraded",
          requestId,
          eventKind,
        });
      }
      continue;
    }
  }
  return violations;
}

import type { SkillRunnerConnectionLane } from "./skillRunnerConnectionGovernor";

export type SkillRunnerConnectionAuditEventType =
  | "queued"
  | "started"
  | "finished"
  | "timeout"
  | "skipped_reachability"
  | "skipped_background"
  | "skipped_history"
  | "abort_requested"
  | "aborted"
  | "evicted_stream"
  | "duplicate_stream_rejected"
  | "physical_debt_recorded"
  | "physical_debt_released"
  | "late_resolve_after_timeout"
  | "late_reject_after_timeout"
  | "late_resolve_after_abort"
  | "late_reject_after_abort";

export type SkillRunnerConnectionAuditEvent = {
  id: number;
  type: SkillRunnerConnectionAuditEventType;
  ts: number;
  backendId?: string;
  lane?: SkillRunnerConnectionLane;
  requestId?: string;
  operation?: string;
  queuedAt?: number;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
  timeoutMs?: number;
  reason?: string;
  errorName?: string;
};

export type SkillRunnerConnectionAuditEntry = {
  backendId: string;
  lane: SkillRunnerConnectionLane;
  requestId?: string;
  operation: string;
  queuedAt: number;
  startedAt?: number;
  timeoutMs: number;
};

export type SkillRunnerConnectionAuditEventInput = {
  type: SkillRunnerConnectionAuditEventType;
  entry?: SkillRunnerConnectionAuditEntry;
  backendId?: string;
  lane?: SkillRunnerConnectionLane;
  requestId?: string;
  operation?: string;
  reason?: string;
  errorName?: string;
};

type AuditState = {
  nextEventId: number;
  events: SkillRunnerConnectionAuditEvent[];
};

const AUDIT_EVENT_LIMIT = 200;
const auditStateByOwner = new WeakMap<object, AuditState>();

function getOrCreateState(owner: object) {
  let state = auditStateByOwner.get(owner);
  if (!state) {
    state = { nextEventId: 1, events: [] };
    auditStateByOwner.set(owner, state);
  }
  return state;
}

export function recordSkillRunnerConnectionAuditEvent(
  owner: object,
  input: SkillRunnerConnectionAuditEventInput,
) {
  const state = getOrCreateState(owner);
  const entry = input.entry;
  const finishedAt = Date.now();
  const startedAt = entry?.startedAt;
  const event: SkillRunnerConnectionAuditEvent = {
    id: state.nextEventId++,
    type: input.type,
    ts: finishedAt,
    backendId: entry?.backendId || input.backendId,
    lane: entry?.lane || input.lane,
    requestId: entry?.requestId || input.requestId,
    operation: entry?.operation || input.operation,
    queuedAt: entry?.queuedAt,
    startedAt,
    finishedAt:
      input.type === "finished" ||
      input.type === "timeout" ||
      input.type === "aborted" ||
      input.type.startsWith("late_")
        ? finishedAt
        : undefined,
    durationMs: startedAt ? Math.max(0, finishedAt - startedAt) : undefined,
    timeoutMs: entry?.timeoutMs,
    reason: input.reason,
    errorName: input.errorName,
  };
  state.events.push(event);
  if (state.events.length > AUDIT_EVENT_LIMIT) {
    state.events.splice(0, state.events.length - AUDIT_EVENT_LIMIT);
  }
}

export function readSkillRunnerConnectionAudit(owner: object) {
  const events = auditStateByOwner.get(owner)?.events.slice() || [];
  const timeoutEvents = events.filter((event) => event.type === "timeout");
  const countEvents = (type: SkillRunnerConnectionAuditEventType) =>
    events.filter((event) => event.type === type).length;
  return {
    events,
    summary: {
      timeoutCount: timeoutEvents.length,
      lateSettlementCount: events.filter((event) =>
        event.type.startsWith("late_"),
      ).length,
      skippedReachabilityCount: countEvents("skipped_reachability"),
      skippedBackgroundCount: countEvents("skipped_background"),
      skippedHistoryCount: countEvents("skipped_history"),
      recentTimeoutAt: timeoutEvents.length
        ? timeoutEvents[timeoutEvents.length - 1].ts
        : undefined,
    },
  };
}

export function resetSkillRunnerConnectionAudit(owner: object) {
  auditStateByOwner.delete(owner);
}

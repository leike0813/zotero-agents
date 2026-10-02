const AUDIT_EVENT_LIMIT = 200;
const auditStateByOwner = new WeakMap();
function getOrCreateState(owner) {
    let state = auditStateByOwner.get(owner);
    if (!state) {
        state = { nextEventId: 1, events: [] };
        auditStateByOwner.set(owner, state);
    }
    return state;
}
export function recordSkillRunnerConnectionAuditEvent(owner, input) {
    const state = getOrCreateState(owner);
    const entry = input.entry;
    const finishedAt = Date.now();
    const startedAt = entry?.startedAt;
    const event = {
        id: state.nextEventId++,
        type: input.type,
        ts: finishedAt,
        backendId: entry?.backendId || input.backendId,
        lane: entry?.lane || input.lane,
        requestId: entry?.requestId || input.requestId,
        operation: entry?.operation || input.operation,
        queuedAt: entry?.queuedAt,
        startedAt,
        finishedAt: input.type === "finished" ||
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
export function readSkillRunnerConnectionAudit(owner) {
    const events = auditStateByOwner.get(owner)?.events.slice() || [];
    const timeoutEvents = events.filter((event) => event.type === "timeout");
    const countEvents = (type) => events.filter((event) => event.type === type).length;
    return {
        events,
        summary: {
            timeoutCount: timeoutEvents.length,
            lateSettlementCount: events.filter((event) => event.type.startsWith("late_")).length,
            skippedReachabilityCount: countEvents("skipped_reachability"),
            skippedBackgroundCount: countEvents("skipped_background"),
            skippedHistoryCount: countEvents("skipped_history"),
            recentTimeoutAt: timeoutEvents.length
                ? timeoutEvents[timeoutEvents.length - 1].ts
                : undefined,
        },
    };
}
export function resetSkillRunnerConnectionAudit(owner) {
    auditStateByOwner.delete(owner);
}

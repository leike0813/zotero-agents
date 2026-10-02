export const SKILLRUNNER_PROVIDER_STATES = [
    "queued",
    "running",
    "waiting_user",
    "waiting_auth",
    "succeeded",
    "failed",
    "canceled",
];
export const SKILLRUNNER_TERMINAL_STATES = [
    "succeeded",
    "failed",
    "canceled",
];
export const SKILLRUNNER_WAITING_STATES = [
    "waiting_user",
    "waiting_auth",
];
const TERMINAL_STATES = new Set(SKILLRUNNER_TERMINAL_STATES);
const WAITING_STATES = new Set(SKILLRUNNER_WAITING_STATES);
const LEGAL_TRANSITIONS = {
    queued: new Set([
        "queued",
        "running",
        "waiting_user",
        "waiting_auth",
        "succeeded",
        "failed",
        "canceled",
    ]),
    running: new Set([
        "queued",
        "running",
        "waiting_user",
        "waiting_auth",
        "succeeded",
        "failed",
        "canceled",
    ]),
    waiting_user: new Set([
        "running",
        "waiting_user",
        "waiting_auth",
        "succeeded",
        "failed",
        "canceled",
    ]),
    waiting_auth: new Set([
        "running",
        "waiting_user",
        "waiting_auth",
        "succeeded",
        "failed",
        "canceled",
    ]),
    succeeded: new Set(["succeeded"]),
    failed: new Set(["failed"]),
    canceled: new Set(["canceled"]),
};
function normalizeEventKind(value) {
    const normalized = String(value || "")
        .trim()
        .toLowerCase();
    if (normalized === "request-created") {
        return "request-created";
    }
    if (normalized === "deferred" || normalized === "dispatch-deferred") {
        return "deferred";
    }
    if (normalized === "waiting" ||
        normalized === "backend-waiting" ||
        normalized === "waiting_user" ||
        normalized === "waiting_auth") {
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
export function isKnownStatus(value) {
    const normalized = String(value || "")
        .trim()
        .toLowerCase();
    return SKILLRUNNER_PROVIDER_STATES.includes(normalized);
}
export function normalizeStatus(value, fallback = "running") {
    const normalized = String(value || "")
        .trim()
        .toLowerCase();
    if (SKILLRUNNER_PROVIDER_STATES.includes(normalized)) {
        return normalized;
    }
    return fallback;
}
export function normalizeStatusWithGuard(args) {
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
export function isTerminal(status) {
    return TERMINAL_STATES.has(normalizeStatus(status, "running"));
}
export function isWaiting(status) {
    const normalized = normalizeStatus(status, "running");
    return WAITING_STATES.has(normalized);
}
export function isActive(status) {
    return !isTerminal(status);
}
export function validateTransition(args) {
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
export function validateEventOrder(args) {
    const requestId = String(args.requestId || "").trim() || undefined;
    const violations = [];
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
            }
            else if (!isTerminal(terminalStatus)) {
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

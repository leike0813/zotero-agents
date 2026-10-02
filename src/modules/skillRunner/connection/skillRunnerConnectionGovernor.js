import { isDebugModeEnabled } from "../../debugMode";
import { recordSkillRunnerConnectionAuditEvent, resetSkillRunnerConnectionAudit, } from "./skillRunnerConnectionAuditStore";
import { resolveNativeAbortControllerConstructor } from "../../../utils/wait";
const DEFAULT_MAX_ACTIVE_PER_BACKEND = 6;
const MAX_FOREGROUND_STREAMS_PER_BACKEND = 2;
const DEGRADED_FOREGROUND_STREAMS_PER_BACKEND = 1;
const LOW_PRIORITY_RESERVED_CONNECTIONS = 2;
const PHYSICAL_DEBT_COOLDOWN_MS = 30000;
const LANE_PRIORITY = {
    submit: 0,
    settlement: 1,
    reconcile: 2,
    "foreground-query": 3,
    "foreground-stream": 4,
    background: 5,
    maintenance: 6,
    health: 7,
};
function normalizeString(value) {
    return String(value || "").trim();
}
function normalizeTimeoutMs(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}
function normalizeTimestamp(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}
function errorName(error) {
    const name = error?.name;
    return normalizeString(name) || undefined;
}
function errorReason(error) {
    const message = error?.message;
    return normalizeString(message) || normalizeString(error) || undefined;
}
function createAbortError(reason) {
    const message = normalizeString(reason) || "The operation was aborted.";
    const runtime = globalThis;
    if (typeof runtime.DOMException === "function") {
        return new runtime.DOMException(message, "AbortError");
    }
    const error = new Error(message);
    error.name = "AbortError";
    return error;
}
function createTimeoutError(args) {
    const error = new Error(`SkillRunner connection timed out after ${args.timeoutMs}ms: backend=${args.backendId}, lane=${args.lane}, operation=${args.operation}`);
    error.name = "SkillRunnerConnectionTimeoutError";
    return error;
}
function createSkippedError(reason) {
    const error = new Error(reason);
    error.name = "SkillRunnerConnectionSkippedError";
    return error;
}
function scopeKey(backendId, lane) {
    return `${backendId}:${lane}`;
}
export class SkillRunnerConnectionGovernor {
    maxActivePerBackend;
    nextId = 1;
    queued = [];
    active = new Map();
    physicalDebtByBackend = new Map();
    physicalDebtRecordedAtByBackend = new Map();
    constructor(args) {
        const configured = Number(args?.maxActivePerBackend);
        this.maxActivePerBackend =
            Number.isFinite(configured) && configured > 0
                ? Math.floor(configured)
                : DEFAULT_MAX_ACTIVE_PER_BACKEND;
    }
    run(args) {
        const backendId = normalizeString(args.backendId);
        const operation = normalizeString(args.operation);
        if (!backendId) {
            return Promise.reject(new Error("backendId is required"));
        }
        if (!operation) {
            return Promise.reject(new Error("operation is required"));
        }
        if (args.signal?.aborted) {
            return Promise.reject(createAbortError());
        }
        const requestId = normalizeString(args.requestId) || undefined;
        if (args.lane === "foreground-stream" &&
            requestId &&
            this.hasForegroundStreamForRequest(backendId, requestId)) {
            if (__skillrunner_connection_audit_enabled__ &&
                (typeof __debug_mode__ === "undefined"
                    ? isDebugModeEnabled()
                    : __debug_mode__)) {
                recordSkillRunnerConnectionAuditEvent(this, {
                    type: "duplicate_stream_rejected",
                    backendId,
                    lane: args.lane,
                    requestId,
                    operation,
                    reason: `foreground stream already exists for request ${requestId}`,
                });
            }
            return Promise.reject(createAbortError(`foreground stream already exists for request ${requestId}`));
        }
        const skipType = this.resolveSkipTypeForConnection({
            backendId,
            lane: args.lane,
            operation,
        });
        if (skipType) {
            const reason = skipType === "skipped_reachability"
                ? "reachability probe skipped while backend is busy or degraded"
                : "low-priority SkillRunner request skipped while backend is degraded";
            if (__skillrunner_connection_audit_enabled__ &&
                (typeof __debug_mode__ === "undefined"
                    ? isDebugModeEnabled()
                    : __debug_mode__)) {
                recordSkillRunnerConnectionAuditEvent(this, {
                    type: skipType,
                    backendId,
                    lane: args.lane,
                    requestId,
                    operation,
                    reason,
                    errorName: "SkillRunnerConnectionSkippedError",
                });
            }
            return Promise.reject(createSkippedError(reason));
        }
        if (this.isCriticalLane(args.lane)) {
            this.evictForegroundStreamForBackendIfFull(backendId);
            this.evictDegradedWarmStreams(backendId);
        }
        return new Promise((resolve, reject) => {
            const entry = {
                id: this.nextId++,
                backendId,
                lane: args.lane,
                requestId,
                operation,
                lastFocusedAt: normalizeTimestamp(args.lastFocusedAt),
                timeoutMs: normalizeTimeoutMs(args.timeoutMs),
                stream: args.stream === true,
                queuedAt: Date.now(),
                task: args.task,
                externalSignal: args.signal,
                resolve,
                reject,
            };
            const abortQueued = () => {
                if (this.active.has(entry.id)) {
                    return;
                }
                if (__skillrunner_connection_audit_enabled__ &&
                    (typeof __debug_mode__ === "undefined"
                        ? isDebugModeEnabled()
                        : __debug_mode__)) {
                    recordSkillRunnerConnectionAuditEvent(this, {
                        type: "abort_requested",
                        entry,
                        reason: "external signal aborted queued task",
                    });
                }
                this.removeQueued(entry.id);
                if (__skillrunner_connection_audit_enabled__ &&
                    (typeof __debug_mode__ === "undefined"
                        ? isDebugModeEnabled()
                        : __debug_mode__)) {
                    recordSkillRunnerConnectionAuditEvent(this, {
                        type: "aborted",
                        entry,
                        reason: "external signal aborted queued task",
                    });
                }
                reject(createAbortError());
            };
            if (args.signal) {
                args.signal.addEventListener("abort", abortQueued, { once: true });
                entry.cleanup = () => {
                    args.signal?.removeEventListener("abort", abortQueued);
                };
            }
            this.queued.push(entry);
            if (__skillrunner_connection_audit_enabled__ &&
                (typeof __debug_mode__ === "undefined"
                    ? isDebugModeEnabled()
                    : __debug_mode__)) {
                recordSkillRunnerConnectionAuditEvent(this, { type: "queued", entry });
            }
            if (entry.lane === "foreground-stream") {
                this.evictForegroundStreamIfNeeded(entry);
            }
            this.drain();
        });
    }
    abort(args) {
        const backendId = normalizeString(args.backendId);
        const requestId = normalizeString(args.requestId);
        let aborted = 0;
        for (const entry of Array.from(this.queued)) {
            if (!this.matches(entry, backendId, args.lane, requestId)) {
                continue;
            }
            if (__skillrunner_connection_audit_enabled__ &&
                (typeof __debug_mode__ === "undefined"
                    ? isDebugModeEnabled()
                    : __debug_mode__)) {
                recordSkillRunnerConnectionAuditEvent(this, {
                    type: "abort_requested",
                    entry,
                    reason: normalizeString(args.reason) || "abort requested",
                });
            }
            this.removeQueued(entry.id);
            entry.cleanup?.();
            entry.reject(createAbortError(args.reason));
            entry.finishReason = "abort";
            if (__skillrunner_connection_audit_enabled__ &&
                (typeof __debug_mode__ === "undefined"
                    ? isDebugModeEnabled()
                    : __debug_mode__)) {
                recordSkillRunnerConnectionAuditEvent(this, {
                    type: "aborted",
                    entry,
                    reason: normalizeString(args.reason) || "queued task aborted",
                });
            }
            aborted += 1;
        }
        for (const entry of Array.from(this.active.values())) {
            if (!this.matches(entry, backendId, args.lane, requestId)) {
                continue;
            }
            if (__skillrunner_connection_audit_enabled__ &&
                (typeof __debug_mode__ === "undefined"
                    ? isDebugModeEnabled()
                    : __debug_mode__)) {
                recordSkillRunnerConnectionAuditEvent(this, {
                    type: "abort_requested",
                    entry,
                    reason: normalizeString(args.reason) || "abort requested",
                });
            }
            entry.controller?.abort();
            entry.reject(createAbortError(args.reason));
            this.finish(entry, "abort", createAbortError(args.reason));
            aborted += 1;
        }
        this.drain();
        return aborted;
    }
    getCoreSnapshot() {
        const active = Array.from(this.active.values());
        const queued = this.queued;
        return {
            maxActivePerBackend: this.maxActivePerBackend,
            summary: this.buildCoreSummary(active, queued),
            active: active.map((entry) => ({
                id: entry.id,
                backendId: entry.backendId,
                lane: entry.lane,
                requestId: entry.requestId,
                operation: entry.operation,
                stream: entry.stream,
                startedAt: entry.startedAt || entry.queuedAt,
                lastFocusedAt: entry.lastFocusedAt,
            })),
            queued: queued.map((entry) => ({
                id: entry.id,
                backendId: entry.backendId,
                lane: entry.lane,
                requestId: entry.requestId,
                operation: entry.operation,
                queuedAt: entry.queuedAt,
            })),
        };
    }
    resetForTests() {
        for (const entry of Array.from(this.active.values())) {
            if (__skillrunner_connection_audit_enabled__ &&
                (typeof __debug_mode__ === "undefined"
                    ? isDebugModeEnabled()
                    : __debug_mode__)) {
                recordSkillRunnerConnectionAuditEvent(this, {
                    type: "abort_requested",
                    entry,
                    reason: "reset",
                });
            }
            entry.controller?.abort();
            entry.reject(createAbortError("reset"));
            this.finish(entry, "abort", createAbortError("reset"));
        }
        for (const entry of Array.from(this.queued)) {
            if (__skillrunner_connection_audit_enabled__ &&
                (typeof __debug_mode__ === "undefined"
                    ? isDebugModeEnabled()
                    : __debug_mode__)) {
                recordSkillRunnerConnectionAuditEvent(this, {
                    type: "abort_requested",
                    entry,
                    reason: "reset",
                });
            }
            entry.cleanup?.();
            entry.reject(createAbortError("reset"));
            entry.finishReason = "abort";
            if (__skillrunner_connection_audit_enabled__ &&
                (typeof __debug_mode__ === "undefined"
                    ? isDebugModeEnabled()
                    : __debug_mode__)) {
                recordSkillRunnerConnectionAuditEvent(this, {
                    type: "aborted",
                    entry,
                    reason: "reset",
                });
            }
        }
        this.queued.length = 0;
        this.active.clear();
        this.physicalDebtByBackend.clear();
        this.physicalDebtRecordedAtByBackend.clear();
        if (__skillrunner_connection_audit_enabled__ &&
            (typeof __debug_mode__ === "undefined"
                ? isDebugModeEnabled()
                : __debug_mode__)) {
            resetSkillRunnerConnectionAudit(this);
        }
    }
    hasActiveOrQueuedForBackend(backendId) {
        const normalized = normalizeString(backendId);
        if (!normalized) {
            return false;
        }
        return (Array.from(this.active.values()).some((entry) => entry.backendId === normalized) || this.queued.some((entry) => entry.backendId === normalized));
    }
    hasPhysicalDebt(backendId) {
        return this.getPhysicalDebt(backendId) > 0;
    }
    matches(entry, backendId, lane, requestId) {
        if (backendId && entry.backendId !== backendId) {
            return false;
        }
        if (lane && entry.lane !== lane) {
            return false;
        }
        if (requestId && entry.requestId !== requestId) {
            return false;
        }
        return true;
    }
    removeQueued(id) {
        const index = this.queued.findIndex((entry) => entry.id === id);
        if (index >= 0) {
            this.queued.splice(index, 1);
        }
    }
    drain() {
        while (true) {
            const next = this.findNextRunnable();
            if (!next) {
                return;
            }
            this.removeQueued(next.id);
            this.start(next);
        }
    }
    findNextRunnable() {
        return this.queued
            .filter((entry) => this.canStart(entry))
            .sort((left, right) => {
            const priorityDelta = LANE_PRIORITY[left.lane] - LANE_PRIORITY[right.lane];
            if (priorityDelta !== 0) {
                return priorityDelta;
            }
            return left.queuedAt - right.queuedAt || left.id - right.id;
        })[0];
    }
    canStart(entry) {
        if (entry.lane === "foreground-stream") {
            if (entry.requestId &&
                Array.from(this.active.values()).some((active) => active.backendId === entry.backendId &&
                    active.lane === "foreground-stream" &&
                    active.requestId === entry.requestId)) {
                return false;
            }
            const activeForegroundStreams = Array.from(this.active.values()).filter((active) => active.backendId === entry.backendId &&
                active.lane === "foreground-stream").length;
            if (activeForegroundStreams >= this.maxForegroundStreams(entry.backendId)) {
                return false;
            }
            const activeForBackend = Array.from(this.active.values()).filter((active) => active.backendId === entry.backendId).length;
            return activeForBackend < this.maxActivePerBackend;
        }
        if (Array.from(this.active.values()).some((active) => active.backendId === entry.backendId && active.lane === entry.lane)) {
            return false;
        }
        const activeForBackend = Array.from(this.active.values()).filter((active) => active.backendId === entry.backendId).length;
        if (this.isLowPriorityLane(entry.lane) &&
            activeForBackend >=
                Math.max(0, this.maxActivePerBackend - LOW_PRIORITY_RESERVED_CONNECTIONS)) {
            return false;
        }
        return activeForBackend < this.maxActivePerBackend;
    }
    isCriticalLane(lane) {
        return lane === "submit" || lane === "settlement" || lane === "reconcile";
    }
    isLowPriorityLane(lane) {
        return lane === "background" || lane === "maintenance" || lane === "health";
    }
    resolveSkipTypeForConnection(args) {
        if (args.lane === "health" &&
            (this.hasActiveOrQueuedForBackend(args.backendId) ||
                this.hasPhysicalDebt(args.backendId))) {
            return "skipped_reachability";
        }
        if (!this.hasPhysicalDebt(args.backendId)) {
            return undefined;
        }
        if (args.lane === "background" || args.lane === "maintenance") {
            return /history/i.test(args.operation)
                ? "skipped_history"
                : "skipped_background";
        }
        return undefined;
    }
    getPhysicalDebt(backendId) {
        const normalized = normalizeString(backendId);
        if (!normalized) {
            return 0;
        }
        this.releaseExpiredPhysicalDebt(normalized);
        return this.physicalDebtByBackend.get(normalized) || 0;
    }
    releaseExpiredPhysicalDebt(backendId) {
        const recordedAt = this.physicalDebtRecordedAtByBackend.get(backendId) || 0;
        if (recordedAt <= 0 ||
            Date.now() - recordedAt < PHYSICAL_DEBT_COOLDOWN_MS) {
            return;
        }
        this.physicalDebtByBackend.delete(backendId);
        this.physicalDebtRecordedAtByBackend.delete(backendId);
        if (__skillrunner_connection_audit_enabled__ &&
            (typeof __debug_mode__ === "undefined"
                ? isDebugModeEnabled()
                : __debug_mode__)) {
            recordSkillRunnerConnectionAuditEvent(this, {
                type: "physical_debt_released",
                backendId,
                reason: "physical debt cooldown elapsed",
            });
        }
    }
    recordPhysicalDebt(entry) {
        const current = this.getPhysicalDebt(entry.backendId);
        this.physicalDebtByBackend.set(entry.backendId, current + 1);
        this.physicalDebtRecordedAtByBackend.set(entry.backendId, Date.now());
        if (__skillrunner_connection_audit_enabled__ &&
            (typeof __debug_mode__ === "undefined"
                ? isDebugModeEnabled()
                : __debug_mode__)) {
            recordSkillRunnerConnectionAuditEvent(this, {
                type: "physical_debt_recorded",
                entry,
                reason: "timeout finished before underlying task settled",
            });
        }
        this.evictDegradedWarmStreams(entry.backendId);
    }
    releasePhysicalDebt(backendId, reason) {
        const current = this.getPhysicalDebt(backendId);
        if (current <= 0) {
            return;
        }
        const next = current - 1;
        if (next > 0) {
            this.physicalDebtByBackend.set(backendId, next);
        }
        else {
            this.physicalDebtByBackend.delete(backendId);
            this.physicalDebtRecordedAtByBackend.delete(backendId);
        }
        if (__skillrunner_connection_audit_enabled__ &&
            (typeof __debug_mode__ === "undefined"
                ? isDebugModeEnabled()
                : __debug_mode__)) {
            recordSkillRunnerConnectionAuditEvent(this, {
                type: "physical_debt_released",
                backendId,
                reason,
            });
        }
    }
    maxForegroundStreams(backendId) {
        return this.hasPhysicalDebt(backendId)
            ? DEGRADED_FOREGROUND_STREAMS_PER_BACKEND
            : MAX_FOREGROUND_STREAMS_PER_BACKEND;
    }
    hasForegroundStreamForRequest(backendId, requestId) {
        const matches = (entry) => entry.backendId === backendId &&
            entry.lane === "foreground-stream" &&
            entry.requestId === requestId;
        return (Array.from(this.active.values()).some(matches) ||
            this.queued.some(matches));
    }
    evictForegroundStreamForBackendIfFull(backendId) {
        const activeForBackend = Array.from(this.active.values()).filter((entry) => entry.backendId === backendId);
        if (activeForBackend.length < this.maxActivePerBackend) {
            return;
        }
        this.abortForegroundStreamEntry(this.pickLeastRecentlyFocusedStream(backendId));
    }
    evictForegroundStreamIfNeeded(entry) {
        const foregroundStreams = Array.from(this.active.values()).filter((active) => active.backendId === entry.backendId &&
            active.lane === "foreground-stream");
        if (foregroundStreams.length < this.maxForegroundStreams(entry.backendId)) {
            return;
        }
        this.abortForegroundStreamEntry(this.pickLeastRecentlyFocusedStream(entry.backendId));
    }
    pickLeastRecentlyFocusedStream(backendId) {
        const streams = Array.from(this.active.values()).filter((entry) => entry.backendId === backendId && entry.lane === "foreground-stream");
        return streams.sort((left, right) => {
            const leftFocused = left.lastFocusedAt || left.startedAt || left.queuedAt;
            const rightFocused = right.lastFocusedAt || right.startedAt || right.queuedAt;
            return leftFocused - rightFocused || left.id - right.id;
        })[0];
    }
    abortForegroundStreamEntry(entry) {
        if (!entry) {
            return;
        }
        if (__skillrunner_connection_audit_enabled__ &&
            (typeof __debug_mode__ === "undefined"
                ? isDebugModeEnabled()
                : __debug_mode__)) {
            recordSkillRunnerConnectionAuditEvent(this, {
                type: "evicted_stream",
                entry,
                reason: "foreground stream evicted",
            });
            recordSkillRunnerConnectionAuditEvent(this, {
                type: "abort_requested",
                entry,
                reason: "foreground stream evicted",
            });
        }
        entry.controller?.abort();
        entry.reject(createAbortError("foreground stream evicted"));
        this.finish(entry, "evict", createAbortError("foreground stream evicted"));
    }
    evictDegradedWarmStreams(backendId) {
        while (true) {
            const streams = Array.from(this.active.values()).filter((entry) => entry.backendId === backendId && entry.lane === "foreground-stream");
            if (streams.length <= this.maxForegroundStreams(backendId)) {
                return;
            }
            this.abortForegroundStreamEntry(this.pickLeastRecentlyFocusedStream(backendId));
        }
    }
    start(entry) {
        const AbortControllerCtor = resolveNativeAbortControllerConstructor();
        if (AbortControllerCtor) {
            entry.controller = new AbortControllerCtor();
        }
        entry.startedAt = Date.now();
        this.active.set(entry.id, entry);
        if (__skillrunner_connection_audit_enabled__ &&
            (typeof __debug_mode__ === "undefined"
                ? isDebugModeEnabled()
                : __debug_mode__)) {
            recordSkillRunnerConnectionAuditEvent(this, { type: "started", entry });
        }
        const signal = entry.controller?.signal || entry.externalSignal;
        const finishResolve = (value) => {
            if (entry.finished) {
                this.recordLateSettlement(entry, "resolve");
                return;
            }
            entry.resolve(value);
            this.finish(entry, "resolve");
        };
        const finishReject = (error, reason = "reject") => {
            if (entry.finished) {
                this.recordLateSettlement(entry, "reject", error);
                return;
            }
            entry.reject(error);
            this.finish(entry, reason, error);
        };
        if (entry.externalSignal && entry.controller) {
            const abortActive = () => {
                if (__skillrunner_connection_audit_enabled__ &&
                    (typeof __debug_mode__ === "undefined"
                        ? isDebugModeEnabled()
                        : __debug_mode__)) {
                    recordSkillRunnerConnectionAuditEvent(this, {
                        type: "abort_requested",
                        entry,
                        reason: "external signal aborted active task",
                    });
                }
                entry.controller?.abort();
                finishReject(createAbortError(), "abort");
            };
            entry.externalSignal.addEventListener("abort", abortActive, {
                once: true,
            });
            entry.externalAbortCleanup = () => {
                entry.externalSignal?.removeEventListener("abort", abortActive);
            };
        }
        if (entry.timeoutMs > 0) {
            entry.timer = setTimeout(() => {
                const timeoutError = createTimeoutError({
                    backendId: entry.backendId,
                    lane: entry.lane,
                    operation: entry.operation,
                    timeoutMs: entry.timeoutMs,
                });
                if (__skillrunner_connection_audit_enabled__ &&
                    (typeof __debug_mode__ === "undefined"
                        ? isDebugModeEnabled()
                        : __debug_mode__)) {
                    recordSkillRunnerConnectionAuditEvent(this, {
                        type: "timeout",
                        entry,
                        reason: errorReason(timeoutError),
                        errorName: errorName(timeoutError),
                    });
                }
                this.recordPhysicalDebt(entry);
                entry.controller?.abort();
                finishReject(timeoutError, "timeout");
            }, entry.timeoutMs);
        }
        Promise.resolve()
            .then(() => entry.task(signal))
            .then(finishResolve, finishReject);
    }
    finish(entry, reason, error) {
        if (entry.finished) {
            return;
        }
        entry.finished = true;
        entry.finishReason = reason;
        if (entry.timer) {
            clearTimeout(entry.timer);
            entry.timer = undefined;
        }
        entry.externalAbortCleanup?.();
        entry.externalAbortCleanup = undefined;
        entry.cleanup?.();
        this.active.delete(entry.id);
        if (reason === "resolve") {
            this.releasePhysicalDebt(entry.backendId, "successful request resolved");
        }
        if (__skillrunner_connection_audit_enabled__ &&
            (typeof __debug_mode__ === "undefined"
                ? isDebugModeEnabled()
                : __debug_mode__)) {
            recordSkillRunnerConnectionAuditEvent(this, {
                type: reason === "abort" || reason === "evict" ? "aborted" : "finished",
                entry,
                reason: reason === "resolve"
                    ? "resolved"
                    : reason === "reject"
                        ? errorReason(error) || "rejected"
                        : reason,
                errorName: errorName(error),
            });
        }
        this.drain();
    }
    recordLateSettlement(entry, settlement, error) {
        if (entry.finishReason === "timeout") {
            this.releasePhysicalDebt(entry.backendId, settlement === "resolve"
                ? "late resolve after timeout"
                : "late reject after timeout");
            if (__skillrunner_connection_audit_enabled__ &&
                (typeof __debug_mode__ === "undefined"
                    ? isDebugModeEnabled()
                    : __debug_mode__)) {
                recordSkillRunnerConnectionAuditEvent(this, {
                    type: settlement === "resolve"
                        ? "late_resolve_after_timeout"
                        : "late_reject_after_timeout",
                    entry,
                    reason: errorReason(error) || `late ${settlement} after timeout`,
                    errorName: errorName(error),
                });
            }
            return;
        }
        if (entry.finishReason === "abort" || entry.finishReason === "evict") {
            if (__skillrunner_connection_audit_enabled__ &&
                (typeof __debug_mode__ === "undefined"
                    ? isDebugModeEnabled()
                    : __debug_mode__)) {
                recordSkillRunnerConnectionAuditEvent(this, {
                    type: settlement === "resolve"
                        ? "late_resolve_after_abort"
                        : "late_reject_after_abort",
                    entry,
                    reason: errorReason(error) || `late ${settlement} after abort`,
                    errorName: errorName(error),
                });
            }
        }
    }
    buildCoreSummary(active, queued) {
        const activeByBackend = countByBackend(active);
        const queuedByBackend = countByBackend(queued);
        const activeByLane = countByLane(active);
        const queuedByLane = countByLane(queued);
        const streams = active.filter((entry) => entry.lane === "foreground-stream");
        const streamByBackend = countByBackend(streams);
        const now = Date.now();
        const visiblePhysicalDebt = new Map();
        for (const [backendId, count] of this.physicalDebtByBackend) {
            const recordedAt = this.physicalDebtRecordedAtByBackend.get(backendId) || 0;
            if (recordedAt > 0 &&
                now - recordedAt < PHYSICAL_DEBT_COOLDOWN_MS &&
                count > 0) {
                visiblePhysicalDebt.set(backendId, count);
            }
        }
        const physicalDebtByBackend = sortedCounts(visiblePhysicalDebt).map(([backendId, count]) => ({
            backendId,
            count,
        }));
        const physicalDebtTotal = physicalDebtByBackend.reduce((sum, entry) => sum + entry.count, 0);
        return {
            activeTotal: active.length,
            queuedTotal: queued.length,
            streamTotal: streams.length,
            physicalDebtTotal,
            degradedBackendCount: physicalDebtByBackend.length,
            activeByBackend,
            queuedByBackend,
            physicalDebtByBackend,
            activeByLane,
            queuedByLane,
            streamByBackend,
        };
    }
}
function sortedCounts(counts) {
    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}
function countByBackend(entries) {
    const counts = new Map();
    for (const entry of entries) {
        counts.set(entry.backendId, (counts.get(entry.backendId) || 0) + 1);
    }
    return sortedCounts(counts).map(([backendId, count]) => ({
        backendId,
        count,
    }));
}
function countByLane(entries) {
    const counts = new Map();
    for (const entry of entries) {
        counts.set(entry.lane, (counts.get(entry.lane) || 0) + 1);
    }
    return sortedCounts(counts).map(([lane, count]) => ({
        lane: lane,
        count,
    }));
}
export const defaultSkillRunnerConnectionGovernor = new SkillRunnerConnectionGovernor();
export function runSkillRunnerConnection(args) {
    return defaultSkillRunnerConnectionGovernor.run(args);
}
export function abortSkillRunnerConnections(args) {
    return defaultSkillRunnerConnectionGovernor.abort(args);
}
export function resetSkillRunnerConnectionGovernorForTests() {
    defaultSkillRunnerConnectionGovernor.resetForTests();
}
export function hasSkillRunnerConnectionActivityForBackend(backendId) {
    return defaultSkillRunnerConnectionGovernor.hasActiveOrQueuedForBackend(backendId);
}
export function hasSkillRunnerPhysicalConnectionDebt(backendId) {
    return defaultSkillRunnerConnectionGovernor.hasPhysicalDebt(backendId);
}
export function isSkillRunnerConnectionSkippedError(error) {
    return (!!error &&
        typeof error === "object" &&
        normalizeString(error.name) ===
            "SkillRunnerConnectionSkippedError");
}

export type SkillRunnerConnectionLane =
  | "submit"
  | "foreground-stream"
  | "foreground-query"
  | "settlement"
  | "reconcile"
  | "background"
  | "maintenance"
  | "health";

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

export type SkillRunnerConnectionRunArgs<T> = {
  backendId: string;
  lane: SkillRunnerConnectionLane;
  requestId?: string;
  operation: string;
  lastFocusedAt?: number;
  timeoutMs?: number;
  stream?: boolean;
  signal?: AbortSignal;
  task: (signal?: AbortSignal) => Promise<T>;
};

export type SkillRunnerConnectionGovernorSnapshot = {
  maxActivePerBackend: number;
  summary: {
    activeTotal: number;
    queuedTotal: number;
    streamTotal: number;
    timeoutCount: number;
    lateSettlementCount: number;
    physicalDebtTotal: number;
    degradedBackendCount: number;
    skippedReachabilityCount: number;
    skippedBackgroundCount: number;
    skippedHistoryCount: number;
    recentTimeoutAt?: number;
    activeByBackend: Array<{ backendId: string; count: number }>;
    queuedByBackend: Array<{ backendId: string; count: number }>;
    physicalDebtByBackend: Array<{ backendId: string; count: number }>;
    activeByLane: Array<{ lane: SkillRunnerConnectionLane; count: number }>;
    queuedByLane: Array<{ lane: SkillRunnerConnectionLane; count: number }>;
    streamByBackend: Array<{ backendId: string; count: number }>;
  };
  active: Array<{
    id: number;
    backendId: string;
    lane: SkillRunnerConnectionLane;
    requestId?: string;
    operation: string;
    stream: boolean;
    startedAt: number;
    lastFocusedAt?: number;
  }>;
  queued: Array<{
    id: number;
    backendId: string;
    lane: SkillRunnerConnectionLane;
    requestId?: string;
    operation: string;
    queuedAt: number;
  }>;
  events: SkillRunnerConnectionAuditEvent[];
};

type QueueEntry<T = unknown> = {
  id: number;
  backendId: string;
  lane: SkillRunnerConnectionLane;
  requestId?: string;
  operation: string;
  lastFocusedAt?: number;
  timeoutMs: number;
  stream: boolean;
  queuedAt: number;
  task: (signal?: AbortSignal) => Promise<T>;
  externalSignal?: AbortSignal;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  controller?: AbortController;
  startedAt?: number;
  finished?: boolean;
  finishReason?: "resolve" | "reject" | "timeout" | "abort" | "evict";
  timer?: ReturnType<typeof setTimeout>;
  externalAbortCleanup?: () => void;
  cleanup?: () => void;
};

type AnyQueueEntry = QueueEntry<any>;

const DEFAULT_MAX_ACTIVE_PER_BACKEND = 6;
const MAX_FOREGROUND_STREAMS_PER_BACKEND = 2;
const DEGRADED_FOREGROUND_STREAMS_PER_BACKEND = 1;
const LOW_PRIORITY_RESERVED_CONNECTIONS = 2;
const AUDIT_EVENT_LIMIT = 200;
const PHYSICAL_DEBT_COOLDOWN_MS = 30000;

const LANE_PRIORITY: Record<SkillRunnerConnectionLane, number> = {
  submit: 0,
  settlement: 1,
  reconcile: 2,
  "foreground-query": 3,
  "foreground-stream": 4,
  background: 5,
  maintenance: 6,
  health: 7,
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeTimeoutMs(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function normalizeTimestamp(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function errorName(error: unknown) {
  const name = (error as { name?: unknown })?.name;
  return normalizeString(name) || undefined;
}

function errorReason(error: unknown) {
  const message = (error as { message?: unknown })?.message;
  return normalizeString(message) || normalizeString(error) || undefined;
}

function createAbortError(reason?: unknown) {
  const message = normalizeString(reason) || "The operation was aborted.";
  const runtime = globalThis as {
    DOMException?: new (message?: string, name?: string) => Error;
  };
  if (typeof runtime.DOMException === "function") {
    return new runtime.DOMException(message, "AbortError");
  }
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

function createTimeoutError(args: {
  backendId: string;
  lane: SkillRunnerConnectionLane;
  operation: string;
  timeoutMs: number;
}) {
  const error = new Error(
    `SkillRunner connection timed out after ${args.timeoutMs}ms: backend=${args.backendId}, lane=${args.lane}, operation=${args.operation}`,
  );
  error.name = "SkillRunnerConnectionTimeoutError";
  return error;
}

function createSkippedError(reason: string) {
  const error = new Error(reason);
  error.name = "SkillRunnerConnectionSkippedError";
  return error;
}

function scopeKey(backendId: string, lane: SkillRunnerConnectionLane) {
  return `${backendId}:${lane}`;
}

function supportsAbortController() {
  return (
    typeof (globalThis as { AbortController?: unknown }).AbortController ===
    "function"
  );
}

export class SkillRunnerConnectionGovernor {
  private readonly maxActivePerBackend: number;

  private nextId = 1;

  private nextAuditEventId = 1;

  private readonly queued: QueueEntry[] = [];

  private readonly active = new Map<number, QueueEntry>();

  private readonly auditEvents: SkillRunnerConnectionAuditEvent[] = [];

  private readonly physicalDebtByBackend = new Map<string, number>();

  private readonly physicalDebtRecordedAtByBackend = new Map<string, number>();

  constructor(args?: { maxActivePerBackend?: number }) {
    const configured = Number(args?.maxActivePerBackend);
    this.maxActivePerBackend =
      Number.isFinite(configured) && configured > 0
        ? Math.floor(configured)
        : DEFAULT_MAX_ACTIVE_PER_BACKEND;
  }

  run<T>(args: SkillRunnerConnectionRunArgs<T>) {
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
    if (
      args.lane === "foreground-stream" &&
      requestId &&
      this.hasForegroundStreamForRequest(backendId, requestId)
    ) {
      this.recordAuditEvent({
        type: "duplicate_stream_rejected",
        backendId,
        lane: args.lane,
        requestId,
        operation,
        reason: `foreground stream already exists for request ${requestId}`,
      });
      return Promise.reject(
        createAbortError(
          `foreground stream already exists for request ${requestId}`,
        ),
      );
    }
    const skipType = this.resolveSkipTypeForConnection({
      backendId,
      lane: args.lane,
      operation,
    });
    if (skipType) {
      const reason =
        skipType === "skipped_reachability"
          ? "reachability probe skipped while backend is busy or degraded"
          : "low-priority SkillRunner request skipped while backend is degraded";
      this.recordAuditEvent({
        type: skipType,
        backendId,
        lane: args.lane,
        requestId,
        operation,
        reason,
        errorName: "SkillRunnerConnectionSkippedError",
      });
      return Promise.reject(createSkippedError(reason));
    }
    if (this.isCriticalLane(args.lane)) {
      this.evictForegroundStreamForBackendIfFull(backendId);
      this.evictDegradedWarmStreams(backendId);
    }
    return new Promise<T>((resolve, reject) => {
      const entry: QueueEntry<T> = {
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
        this.recordAuditEvent({
          type: "abort_requested",
          entry,
          reason: "external signal aborted queued task",
        });
        this.removeQueued(entry.id);
        this.recordAuditEvent({
          type: "aborted",
          entry,
          reason: "external signal aborted queued task",
        });
        reject(createAbortError());
      };
      if (args.signal) {
        args.signal.addEventListener("abort", abortQueued, { once: true });
        entry.cleanup = () => {
          args.signal?.removeEventListener("abort", abortQueued);
        };
      }
      this.queued.push(entry as QueueEntry);
      this.recordAuditEvent({ type: "queued", entry });
      if (entry.lane === "foreground-stream") {
        this.evictForegroundStreamIfNeeded(entry as QueueEntry);
      }
      this.drain();
    });
  }

  abort(args: {
    backendId?: string;
    lane?: SkillRunnerConnectionLane;
    requestId?: string;
    reason?: string;
  }) {
    const backendId = normalizeString(args.backendId);
    const requestId = normalizeString(args.requestId);
    let aborted = 0;
    for (const entry of Array.from(this.queued)) {
      if (!this.matches(entry, backendId, args.lane, requestId)) {
        continue;
      }
      this.recordAuditEvent({
        type: "abort_requested",
        entry,
        reason: normalizeString(args.reason) || "abort requested",
      });
      this.removeQueued(entry.id);
      entry.cleanup?.();
      entry.reject(createAbortError(args.reason));
      entry.finishReason = "abort";
      this.recordAuditEvent({
        type: "aborted",
        entry,
        reason: normalizeString(args.reason) || "queued task aborted",
      });
      aborted += 1;
    }
    for (const entry of Array.from(this.active.values())) {
      if (!this.matches(entry, backendId, args.lane, requestId)) {
        continue;
      }
      this.recordAuditEvent({
        type: "abort_requested",
        entry,
        reason: normalizeString(args.reason) || "abort requested",
      });
      entry.controller?.abort();
      entry.reject(createAbortError(args.reason));
      this.finish(entry, "abort", createAbortError(args.reason));
      aborted += 1;
    }
    this.drain();
    return aborted;
  }

  snapshot(): SkillRunnerConnectionGovernorSnapshot {
    const active = Array.from(this.active.values());
    const queued = this.queued;
    return {
      maxActivePerBackend: this.maxActivePerBackend,
      summary: this.buildSummary(active, queued),
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
      events: this.auditEvents.slice(),
    };
  }

  resetForTests() {
    for (const entry of Array.from(this.active.values())) {
      this.recordAuditEvent({
        type: "abort_requested",
        entry,
        reason: "reset",
      });
      entry.controller?.abort();
      entry.reject(createAbortError("reset"));
      this.finish(entry, "abort", createAbortError("reset"));
    }
    for (const entry of Array.from(this.queued)) {
      this.recordAuditEvent({
        type: "abort_requested",
        entry,
        reason: "reset",
      });
      entry.cleanup?.();
      entry.reject(createAbortError("reset"));
      entry.finishReason = "abort";
      this.recordAuditEvent({ type: "aborted", entry, reason: "reset" });
    }
    this.queued.length = 0;
    this.active.clear();
    this.physicalDebtByBackend.clear();
    this.physicalDebtRecordedAtByBackend.clear();
    this.auditEvents.length = 0;
    this.nextAuditEventId = 1;
  }

  hasActiveOrQueuedForBackend(backendId: string) {
    const normalized = normalizeString(backendId);
    if (!normalized) {
      return false;
    }
    return (
      Array.from(this.active.values()).some(
        (entry) => entry.backendId === normalized,
      ) || this.queued.some((entry) => entry.backendId === normalized)
    );
  }

  hasPhysicalDebt(backendId: string) {
    return this.getPhysicalDebt(backendId) > 0;
  }

  private matches(
    entry: QueueEntry,
    backendId?: string,
    lane?: SkillRunnerConnectionLane,
    requestId?: string,
  ) {
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

  private removeQueued(id: number) {
    const index = this.queued.findIndex((entry) => entry.id === id);
    if (index >= 0) {
      this.queued.splice(index, 1);
    }
  }

  private drain() {
    while (true) {
      const next = this.findNextRunnable();
      if (!next) {
        return;
      }
      this.removeQueued(next.id);
      this.start(next);
    }
  }

  private findNextRunnable() {
    return this.queued
      .filter((entry) => this.canStart(entry))
      .sort((left, right) => {
        const priorityDelta =
          LANE_PRIORITY[left.lane] - LANE_PRIORITY[right.lane];
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        return left.queuedAt - right.queuedAt || left.id - right.id;
      })[0];
  }

  private canStart(entry: QueueEntry) {
    if (entry.lane === "foreground-stream") {
      if (
        entry.requestId &&
        Array.from(this.active.values()).some(
          (active) =>
            active.backendId === entry.backendId &&
            active.lane === "foreground-stream" &&
            active.requestId === entry.requestId,
        )
      ) {
        return false;
      }
      const activeForegroundStreams = Array.from(this.active.values()).filter(
        (active) =>
          active.backendId === entry.backendId &&
          active.lane === "foreground-stream",
      ).length;
      if (
        activeForegroundStreams >= this.maxForegroundStreams(entry.backendId)
      ) {
        return false;
      }
      const activeForBackend = Array.from(this.active.values()).filter(
        (active) => active.backendId === entry.backendId,
      ).length;
      return activeForBackend < this.maxActivePerBackend;
    }
    if (
      Array.from(this.active.values()).some(
        (active) =>
          active.backendId === entry.backendId && active.lane === entry.lane,
      )
    ) {
      return false;
    }
    const activeForBackend = Array.from(this.active.values()).filter(
      (active) => active.backendId === entry.backendId,
    ).length;
    if (
      this.isLowPriorityLane(entry.lane) &&
      activeForBackend >=
        Math.max(
          0,
          this.maxActivePerBackend - LOW_PRIORITY_RESERVED_CONNECTIONS,
        )
    ) {
      return false;
    }
    return activeForBackend < this.maxActivePerBackend;
  }

  private isCriticalLane(lane: SkillRunnerConnectionLane) {
    return lane === "submit" || lane === "settlement" || lane === "reconcile";
  }

  private isLowPriorityLane(lane: SkillRunnerConnectionLane) {
    return lane === "background" || lane === "maintenance" || lane === "health";
  }

  private resolveSkipTypeForConnection(args: {
    backendId: string;
    lane: SkillRunnerConnectionLane;
    operation: string;
  }):
    | "skipped_reachability"
    | "skipped_background"
    | "skipped_history"
    | undefined {
    if (
      args.lane === "health" &&
      (this.hasActiveOrQueuedForBackend(args.backendId) ||
        this.hasPhysicalDebt(args.backendId))
    ) {
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

  private getPhysicalDebt(backendId: string) {
    const normalized = normalizeString(backendId);
    if (!normalized) {
      return 0;
    }
    this.releaseExpiredPhysicalDebt(normalized);
    return this.physicalDebtByBackend.get(normalized) || 0;
  }

  private releaseExpiredPhysicalDebt(backendId: string) {
    const recordedAt = this.physicalDebtRecordedAtByBackend.get(backendId) || 0;
    if (
      recordedAt <= 0 ||
      Date.now() - recordedAt < PHYSICAL_DEBT_COOLDOWN_MS
    ) {
      return;
    }
    this.physicalDebtByBackend.delete(backendId);
    this.physicalDebtRecordedAtByBackend.delete(backendId);
    this.recordAuditEvent({
      type: "physical_debt_released",
      backendId,
      reason: "physical debt cooldown elapsed",
    });
  }

  private recordPhysicalDebt(entry: AnyQueueEntry) {
    const current = this.getPhysicalDebt(entry.backendId);
    this.physicalDebtByBackend.set(entry.backendId, current + 1);
    this.physicalDebtRecordedAtByBackend.set(entry.backendId, Date.now());
    this.recordAuditEvent({
      type: "physical_debt_recorded",
      entry,
      reason: "timeout finished before underlying task settled",
    });
    this.evictDegradedWarmStreams(entry.backendId);
  }

  private releasePhysicalDebt(backendId: string, reason: string) {
    const current = this.getPhysicalDebt(backendId);
    if (current <= 0) {
      return;
    }
    const next = current - 1;
    if (next > 0) {
      this.physicalDebtByBackend.set(backendId, next);
    } else {
      this.physicalDebtByBackend.delete(backendId);
      this.physicalDebtRecordedAtByBackend.delete(backendId);
    }
    this.recordAuditEvent({
      type: "physical_debt_released",
      backendId,
      reason,
    });
  }

  private maxForegroundStreams(backendId: string) {
    return this.hasPhysicalDebt(backendId)
      ? DEGRADED_FOREGROUND_STREAMS_PER_BACKEND
      : MAX_FOREGROUND_STREAMS_PER_BACKEND;
  }

  private hasForegroundStreamForRequest(backendId: string, requestId: string) {
    const matches = (entry: QueueEntry) =>
      entry.backendId === backendId &&
      entry.lane === "foreground-stream" &&
      entry.requestId === requestId;
    return (
      Array.from(this.active.values()).some(matches) ||
      this.queued.some(matches)
    );
  }

  private evictForegroundStreamForBackendIfFull(backendId: string) {
    const activeForBackend = Array.from(this.active.values()).filter(
      (entry) => entry.backendId === backendId,
    );
    if (activeForBackend.length < this.maxActivePerBackend) {
      return;
    }
    this.abortForegroundStreamEntry(
      this.pickLeastRecentlyFocusedStream(backendId),
    );
  }

  private evictForegroundStreamIfNeeded(entry: QueueEntry) {
    const foregroundStreams = Array.from(this.active.values()).filter(
      (active) =>
        active.backendId === entry.backendId &&
        active.lane === "foreground-stream",
    );
    if (foregroundStreams.length < this.maxForegroundStreams(entry.backendId)) {
      return;
    }
    this.abortForegroundStreamEntry(
      this.pickLeastRecentlyFocusedStream(entry.backendId),
    );
  }

  private pickLeastRecentlyFocusedStream(backendId: string) {
    const streams = Array.from(this.active.values()).filter(
      (entry) =>
        entry.backendId === backendId && entry.lane === "foreground-stream",
    );
    return streams.sort((left, right) => {
      const leftFocused = left.lastFocusedAt || left.startedAt || left.queuedAt;
      const rightFocused =
        right.lastFocusedAt || right.startedAt || right.queuedAt;
      return leftFocused - rightFocused || left.id - right.id;
    })[0];
  }

  private abortForegroundStreamEntry(entry: QueueEntry | undefined) {
    if (!entry) {
      return;
    }
    this.recordAuditEvent({
      type: "evicted_stream",
      entry,
      reason: "foreground stream evicted",
    });
    this.recordAuditEvent({
      type: "abort_requested",
      entry,
      reason: "foreground stream evicted",
    });
    entry.controller?.abort();
    entry.reject(createAbortError("foreground stream evicted"));
    this.finish(entry, "evict", createAbortError("foreground stream evicted"));
  }

  private evictDegradedWarmStreams(backendId: string) {
    while (true) {
      const streams = Array.from(this.active.values()).filter(
        (entry) =>
          entry.backendId === backendId && entry.lane === "foreground-stream",
      );
      if (streams.length <= this.maxForegroundStreams(backendId)) {
        return;
      }
      this.abortForegroundStreamEntry(
        this.pickLeastRecentlyFocusedStream(backendId),
      );
    }
  }

  private start<T>(entry: QueueEntry<T>) {
    const AbortControllerCtor = (
      globalThis as {
        AbortController?: typeof AbortController;
      }
    ).AbortController;
    if (supportsAbortController() && AbortControllerCtor) {
      entry.controller = new AbortControllerCtor();
    }
    entry.startedAt = Date.now();
    this.active.set(entry.id, entry as QueueEntry);
    this.recordAuditEvent({ type: "started", entry });
    const signal = entry.controller?.signal || entry.externalSignal;
    const finishResolve = (value: T) => {
      if (entry.finished) {
        this.recordLateSettlement(entry, "resolve");
        return;
      }
      entry.resolve(value);
      this.finish(entry, "resolve");
    };
    const finishReject = (
      error: unknown,
      reason: NonNullable<QueueEntry["finishReason"]> = "reject",
    ) => {
      if (entry.finished) {
        this.recordLateSettlement(entry, "reject", error);
        return;
      }
      entry.reject(error);
      this.finish(entry, reason, error);
    };
    if (entry.externalSignal && entry.controller) {
      const abortActive = () => {
        this.recordAuditEvent({
          type: "abort_requested",
          entry,
          reason: "external signal aborted active task",
        });
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
        this.recordAuditEvent({
          type: "timeout",
          entry,
          reason: errorReason(timeoutError),
          errorName: errorName(timeoutError),
        });
        this.recordPhysicalDebt(entry);
        entry.controller?.abort();
        finishReject(timeoutError, "timeout");
      }, entry.timeoutMs);
    }
    Promise.resolve()
      .then(() => entry.task(signal))
      .then(finishResolve, finishReject);
  }

  private finish<T>(
    entry: QueueEntry<T>,
    reason: NonNullable<QueueEntry["finishReason"]>,
    error?: unknown,
  ) {
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
    this.recordAuditEvent({
      type: reason === "abort" || reason === "evict" ? "aborted" : "finished",
      entry,
      reason:
        reason === "resolve"
          ? "resolved"
          : reason === "reject"
            ? errorReason(error) || "rejected"
            : reason,
      errorName: errorName(error),
    });
    this.drain();
  }

  private recordLateSettlement(
    entry: AnyQueueEntry,
    settlement: "resolve" | "reject",
    error?: unknown,
  ) {
    if (entry.finishReason === "timeout") {
      this.releasePhysicalDebt(
        entry.backendId,
        settlement === "resolve"
          ? "late resolve after timeout"
          : "late reject after timeout",
      );
      this.recordAuditEvent({
        type:
          settlement === "resolve"
            ? "late_resolve_after_timeout"
            : "late_reject_after_timeout",
        entry,
        reason: errorReason(error) || `late ${settlement} after timeout`,
        errorName: errorName(error),
      });
      return;
    }
    if (entry.finishReason === "abort" || entry.finishReason === "evict") {
      this.recordAuditEvent({
        type:
          settlement === "resolve"
            ? "late_resolve_after_abort"
            : "late_reject_after_abort",
        entry,
        reason: errorReason(error) || `late ${settlement} after abort`,
        errorName: errorName(error),
      });
    }
  }

  private recordAuditEvent(args: {
    type: SkillRunnerConnectionAuditEventType;
    entry?: AnyQueueEntry;
    backendId?: string;
    lane?: SkillRunnerConnectionLane;
    requestId?: string;
    operation?: string;
    reason?: string;
    errorName?: string;
  }) {
    const entry = args.entry;
    const finishedAt = Date.now();
    const startedAt = entry?.startedAt;
    const event: SkillRunnerConnectionAuditEvent = {
      id: this.nextAuditEventId++,
      type: args.type,
      ts: finishedAt,
      backendId: entry?.backendId || args.backendId,
      lane: entry?.lane || args.lane,
      requestId: entry?.requestId || args.requestId,
      operation: entry?.operation || args.operation,
      queuedAt: entry?.queuedAt,
      startedAt,
      finishedAt:
        args.type === "finished" ||
        args.type === "timeout" ||
        args.type === "aborted" ||
        args.type.startsWith("late_")
          ? finishedAt
          : undefined,
      durationMs: startedAt ? Math.max(0, finishedAt - startedAt) : undefined,
      timeoutMs: entry?.timeoutMs,
      reason: args.reason,
      errorName: args.errorName,
    };
    this.auditEvents.push(event);
    if (this.auditEvents.length > AUDIT_EVENT_LIMIT) {
      this.auditEvents.splice(0, this.auditEvents.length - AUDIT_EVENT_LIMIT);
    }
  }

  private buildSummary(active: AnyQueueEntry[], queued: AnyQueueEntry[]) {
    const activeByBackend = countByBackend(active);
    const queuedByBackend = countByBackend(queued);
    const activeByLane = countByLane(active);
    const queuedByLane = countByLane(queued);
    const streams = active.filter(
      (entry) => entry.lane === "foreground-stream",
    );
    const streamByBackend = countByBackend(streams);
    const timeoutEvents = this.auditEvents.filter(
      (event) => event.type === "timeout",
    );
    const lateSettlementCount = this.auditEvents.filter((event) =>
      event.type.startsWith("late_"),
    ).length;
    for (const backendId of Array.from(this.physicalDebtByBackend.keys())) {
      this.releaseExpiredPhysicalDebt(backendId);
    }
    const physicalDebtByBackend = sortedCounts(
      new Map(this.physicalDebtByBackend),
    ).map(([backendId, count]) => ({
      backendId,
      count,
    }));
    const physicalDebtTotal = physicalDebtByBackend.reduce(
      (sum, entry) => sum + entry.count,
      0,
    );
    const countEvents = (type: SkillRunnerConnectionAuditEventType) =>
      this.auditEvents.filter((event) => event.type === type).length;
    const recentTimeoutAt = timeoutEvents.length
      ? timeoutEvents[timeoutEvents.length - 1].ts
      : undefined;
    return {
      activeTotal: active.length,
      queuedTotal: queued.length,
      streamTotal: streams.length,
      timeoutCount: timeoutEvents.length,
      lateSettlementCount,
      physicalDebtTotal,
      degradedBackendCount: physicalDebtByBackend.length,
      skippedReachabilityCount: countEvents("skipped_reachability"),
      skippedBackgroundCount: countEvents("skipped_background"),
      skippedHistoryCount: countEvents("skipped_history"),
      recentTimeoutAt,
      activeByBackend,
      queuedByBackend,
      physicalDebtByBackend,
      activeByLane,
      queuedByLane,
      streamByBackend,
    };
  }
}

function sortedCounts(counts: Map<string, number>) {
  return Array.from(counts.entries()).sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  );
}

function countByBackend(
  entries: AnyQueueEntry[],
): Array<{ backendId: string; count: number }> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.backendId, (counts.get(entry.backendId) || 0) + 1);
  }
  return sortedCounts(counts).map(([backendId, count]) => ({
    backendId,
    count,
  }));
}

function countByLane(
  entries: AnyQueueEntry[],
): Array<{ lane: SkillRunnerConnectionLane; count: number }> {
  const counts = new Map<SkillRunnerConnectionLane, number>();
  for (const entry of entries) {
    counts.set(entry.lane, (counts.get(entry.lane) || 0) + 1);
  }
  return sortedCounts(counts as Map<string, number>).map(([lane, count]) => ({
    lane: lane as SkillRunnerConnectionLane,
    count,
  }));
}

export const defaultSkillRunnerConnectionGovernor =
  new SkillRunnerConnectionGovernor();

export function runSkillRunnerConnection<T>(
  args: SkillRunnerConnectionRunArgs<T>,
) {
  return defaultSkillRunnerConnectionGovernor.run(args);
}

export function abortSkillRunnerConnections(args: {
  backendId?: string;
  lane?: SkillRunnerConnectionLane;
  requestId?: string;
  reason?: string;
}) {
  return defaultSkillRunnerConnectionGovernor.abort(args);
}

export function getSkillRunnerConnectionGovernorSnapshot() {
  return defaultSkillRunnerConnectionGovernor.snapshot();
}

export function resetSkillRunnerConnectionGovernorForTests() {
  defaultSkillRunnerConnectionGovernor.resetForTests();
}

export function hasSkillRunnerConnectionActivityForBackend(backendId: string) {
  return defaultSkillRunnerConnectionGovernor.hasActiveOrQueuedForBackend(
    backendId,
  );
}

export function hasSkillRunnerPhysicalConnectionDebt(backendId: string) {
  return defaultSkillRunnerConnectionGovernor.hasPhysicalDebt(backendId);
}

export function isSkillRunnerConnectionSkippedError(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    normalizeString((error as { name?: unknown }).name) ===
      "SkillRunnerConnectionSkippedError"
  );
}

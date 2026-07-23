import { appendRuntimeLog as appendRuntimeLogEntry } from "../modules/runtimeLogManager";
import type {
  QueuedWorkflowUnitSnapshot,
  WorkflowExecutionUnitOutcome,
  WorkflowQueueBackendScope,
  WorkflowQueueCancelResult,
  WorkflowQueueEntryId,
  WorkflowQueueIdentityQuery,
  WorkflowQueueRemovalReason,
  WorkflowSubmissionHandle,
  WorkflowSubmissionId,
  WorkflowSubmissionQueueChangeEvent,
  WorkflowSubmissionQueueConfig,
  WorkflowSubmissionQueueListener,
  WorkflowSubmissionSummary,
} from "./workflowSubmissionQueueContracts";

type QueueLogInput = Parameters<typeof appendRuntimeLogEntry>[0];

export type WorkflowSubmissionQueueDeps = Readonly<{
  now?: () => string;
  createSubmissionId?: () => WorkflowSubmissionId;
  createQueueId?: () => WorkflowQueueEntryId;
  scheduleMicrotask?: (run: () => void) => void;
  appendRuntimeLog?: (input: QueueLogInput) => unknown;
}>;

type PendingState = "pending" | "admitted" | "canceled" | "shutdown";

type InternalQueuedUnit = {
  readonly queueId: WorkflowQueueEntryId;
  readonly submissionId: WorkflowSubmissionId;
  readonly backend: WorkflowQueueBackendScope;
  readonly workflowId: string;
  readonly workflowLabel: string;
  readonly unitId: string;
  readonly unitOrder: number;
  readonly taskName: string;
  readonly inputUnitIdentity?: string;
  readonly createdAt: string;
  readonly ordinal: number;
  readonly execute: () => Promise<WorkflowExecutionUnitOutcome>;
  state: PendingState;
};

type SubmissionController = {
  readonly submissionId: WorkflowSubmissionId;
  readonly pending: InternalQueuedUnit[];
  readonly limit: number;
  readonly total: number;
  readonly outcomes: WorkflowExecutionUnitOutcome[];
  readonly completion: Promise<WorkflowSubmissionSummary>;
  readonly resolveCompletion: (summary: WorkflowSubmissionSummary) => void;
  active: number;
  settled: number;
  drainScheduled: boolean;
  completed: boolean;
};

const DEFAULT_SCHEDULE_MICROTASK = (run: () => void) => {
  void Promise.resolve().then(run);
};

function backendKey(scope: WorkflowQueueBackendScope) {
  return `${scope.backendType}\n${scope.backendId}`;
}

function identityKey(query: WorkflowQueueIdentityQuery) {
  return `${query.workflowId}\n${query.inputUnitIdentity}`;
}

function normalizeConcurrency(value: number | undefined, unitCount: number) {
  if (value === undefined || value === 0) {
    return unitCount;
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      "Workflow submission concurrency must be a non-negative safe integer",
    );
  }
  return Math.min(value, unitCount);
}

function freezeBackendScope(
  scope: WorkflowQueueBackendScope,
): WorkflowQueueBackendScope {
  return Object.freeze({
    backendType: scope.backendType,
    backendId: scope.backendId,
  });
}

function summarize(
  submissionId: WorkflowSubmissionId,
  outcomes: ReadonlyArray<WorkflowExecutionUnitOutcome>,
): WorkflowSubmissionSummary {
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  for (const outcome of outcomes) {
    if (outcome.status === "succeeded") {
      succeeded += 1;
    } else if (outcome.status === "failed") {
      failed += 1;
    } else {
      skipped += 1;
    }
  }
  return Object.freeze({
    submissionId,
    total: outcomes.length,
    succeeded,
    failed,
    skipped,
  });
}

export class WorkflowSubmissionQueue {
  private readonly pendingByQueueId = new Map<
    WorkflowQueueEntryId,
    InternalQueuedUnit
  >();
  private readonly queueIdsByBackend = new Map<
    string,
    Set<WorkflowQueueEntryId>
  >();
  private readonly queueIdsByIdentity = new Map<
    string,
    Set<WorkflowQueueEntryId>
  >();
  private readonly submissions = new Map<
    WorkflowSubmissionId,
    SubmissionController
  >();
  private readonly listeners = new Set<WorkflowSubmissionQueueListener>();
  private readonly now: () => string;
  private readonly createSubmissionIdOverride?: () => WorkflowSubmissionId;
  private readonly createQueueIdOverride?: () => WorkflowQueueEntryId;
  private readonly scheduleMicrotask: (run: () => void) => void;
  private readonly appendRuntimeLog: (input: QueueLogInput) => unknown;
  private submissionSequence = 0;
  private queueSequence = 0;
  private ordinalSequence = 0;
  private shuttingDown = false;

  constructor(deps: WorkflowSubmissionQueueDeps = {}) {
    this.now = deps.now ?? (() => new Date().toISOString());
    this.createSubmissionIdOverride = deps.createSubmissionId;
    this.createQueueIdOverride = deps.createQueueId;
    this.scheduleMicrotask =
      deps.scheduleMicrotask ?? DEFAULT_SCHEDULE_MICROTASK;
    this.appendRuntimeLog = deps.appendRuntimeLog ?? appendRuntimeLogEntry;
  }

  start() {
    this.shuttingDown = false;
  }

  get isShuttingDown() {
    return this.shuttingDown;
  }

  enqueueSubmission<TUnit>(
    config: WorkflowSubmissionQueueConfig<TUnit>,
  ): WorkflowSubmissionHandle {
    if (this.shuttingDown) {
      throw new Error("Workflow submission queue is shutting down");
    }

    const submissionId = this.nextSubmissionId();
    const initialOutcomes = [...(config.initialOutcomes ?? [])];
    const total = config.units.length + initialOutcomes.length;
    const limit = normalizeConcurrency(
      config.maxConcurrency,
      config.units.length,
    );
    let resolveCompletion!: (summary: WorkflowSubmissionSummary) => void;
    const completion = new Promise<WorkflowSubmissionSummary>((resolve) => {
      resolveCompletion = resolve;
    });
    const controller: SubmissionController = {
      submissionId,
      pending: [],
      limit,
      total,
      outcomes: initialOutcomes,
      completion,
      resolveCompletion,
      active: 0,
      settled: initialOutcomes.length,
      drainScheduled: false,
      completed: false,
    };

    this.log("submission-create", {
      submissionId,
      unitCount: config.units.length,
      maxConcurrency: config.maxConcurrency ?? 0,
    });

    if (config.units.length === 0) {
      controller.completed = true;
      resolveCompletion(summarize(submissionId, initialOutcomes));
      return Object.freeze({ submissionId, completion });
    }

    this.submissions.set(submissionId, controller);
    for (const queuedUnit of config.units) {
      const queueId = this.nextQueueId();
      const item: InternalQueuedUnit = {
        queueId,
        submissionId,
        backend: freezeBackendScope(config.backend),
        workflowId: config.workflow.workflowId,
        workflowLabel: config.workflow.workflowLabel,
        unitId: queuedUnit.display.unitId,
        unitOrder: queuedUnit.display.order,
        taskName: queuedUnit.display.taskName,
        inputUnitIdentity: queuedUnit.display.inputUnitIdentity,
        createdAt: this.now(),
        ordinal: ++this.ordinalSequence,
        execute: () => config.executeUnit(queuedUnit.unit),
        state: "pending",
      };
      controller.pending.push(item);
      this.addPendingIndexes(item);
      this.emit(
        Object.freeze({
          type: "added",
          entry: this.toSnapshot(item),
        }),
      );
      this.log("enqueue", {
        submissionId,
        queueId,
        unitId: item.unitId,
      });
    }
    this.scheduleDrain(controller);
    return Object.freeze({ submissionId, completion });
  }

  listQueued(
    scope?: WorkflowQueueBackendScope,
  ): ReadonlyArray<QueuedWorkflowUnitSnapshot> {
    const items = scope
      ? [...(this.queueIdsByBackend.get(backendKey(scope)) ?? [])]
          .map((queueId) => this.pendingByQueueId.get(queueId))
          .filter((item): item is InternalQueuedUnit => item !== undefined)
      : [...this.pendingByQueueId.values()];
    items.sort((left, right) => left.ordinal - right.ordinal);
    return Object.freeze(items.map((item) => this.toSnapshot(item)));
  }

  hasQueuedWorkflowInput(query: WorkflowQueueIdentityQuery) {
    return (this.queueIdsByIdentity.get(identityKey(query))?.size ?? 0) > 0;
  }

  cancel(queueId: WorkflowQueueEntryId): WorkflowQueueCancelResult {
    const item = this.pendingByQueueId.get(queueId);
    if (!item || item.state !== "pending") {
      return Object.freeze({ status: "not-pending", queueId });
    }

    item.state = "canceled";
    this.removePendingIndexes(item);
    this.emitRemoved(item, "canceled");
    this.log("cancel-pending", {
      submissionId: item.submissionId,
      queueId,
      unitId: item.unitId,
      reasonCode: "host-queue-canceled",
    });
    const controller = this.submissions.get(item.submissionId);
    if (controller) {
      this.settlePending(controller, {
        status: "skipped",
        reasonCode: "host-queue-canceled",
      });
    }
    return Object.freeze({ status: "canceled", queueId });
  }

  subscribe(listener: WorkflowSubmissionQueueListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  shutdown() {
    if (this.shuttingDown) {
      return;
    }
    this.shuttingDown = true;
    for (const item of [...this.pendingByQueueId.values()]) {
      if (item.state !== "pending") {
        continue;
      }
      item.state = "shutdown";
      this.removePendingIndexes(item);
      this.emitRemoved(item, "shutdown");
      this.log("shutdown-discard", {
        submissionId: item.submissionId,
        queueId: item.queueId,
        unitId: item.unitId,
        reasonCode: "host-queue-shutdown",
      });
      const controller = this.submissions.get(item.submissionId);
      if (controller) {
        this.settlePending(controller, {
          status: "skipped",
          reasonCode: "host-queue-shutdown",
        });
      }
    }
    this.emit(Object.freeze({ type: "reset" }));
    this.pendingByQueueId.clear();
    this.queueIdsByBackend.clear();
    this.queueIdsByIdentity.clear();
    this.submissions.clear();
    this.listeners.clear();
  }

  resetForTests() {
    this.shutdown();
    this.submissionSequence = 0;
    this.queueSequence = 0;
    this.ordinalSequence = 0;
    this.shuttingDown = false;
  }

  private nextSubmissionId() {
    if (this.createSubmissionIdOverride) {
      return this.createSubmissionIdOverride();
    }
    const sequence = (++this.submissionSequence).toString(36);
    return `workflow-submission-${Date.now().toString(36)}-${sequence}` as WorkflowSubmissionId;
  }

  private nextQueueId() {
    if (this.createQueueIdOverride) {
      return this.createQueueIdOverride();
    }
    const sequence = (++this.queueSequence).toString(36);
    return `workflow-queue-${Date.now().toString(36)}-${sequence}` as WorkflowQueueEntryId;
  }

  private addPendingIndexes(item: InternalQueuedUnit) {
    this.pendingByQueueId.set(item.queueId, item);
    this.addIndex(
      this.queueIdsByBackend,
      backendKey(item.backend),
      item.queueId,
    );
    if (item.inputUnitIdentity) {
      this.addIndex(
        this.queueIdsByIdentity,
        identityKey({
          workflowId: item.workflowId,
          inputUnitIdentity: item.inputUnitIdentity,
        }),
        item.queueId,
      );
    }
  }

  private removePendingIndexes(item: InternalQueuedUnit) {
    this.pendingByQueueId.delete(item.queueId);
    this.removeIndex(
      this.queueIdsByBackend,
      backendKey(item.backend),
      item.queueId,
    );
    if (item.inputUnitIdentity) {
      this.removeIndex(
        this.queueIdsByIdentity,
        identityKey({
          workflowId: item.workflowId,
          inputUnitIdentity: item.inputUnitIdentity,
        }),
        item.queueId,
      );
    }
  }

  private addIndex(
    index: Map<string, Set<WorkflowQueueEntryId>>,
    key: string,
    queueId: WorkflowQueueEntryId,
  ) {
    const queueIds = index.get(key) ?? new Set<WorkflowQueueEntryId>();
    queueIds.add(queueId);
    index.set(key, queueIds);
  }

  private removeIndex(
    index: Map<string, Set<WorkflowQueueEntryId>>,
    key: string,
    queueId: WorkflowQueueEntryId,
  ) {
    const queueIds = index.get(key);
    if (!queueIds) {
      return;
    }
    queueIds.delete(queueId);
    if (queueIds.size === 0) {
      index.delete(key);
    }
  }

  private scheduleDrain(controller: SubmissionController) {
    if (
      this.shuttingDown ||
      controller.completed ||
      controller.drainScheduled
    ) {
      return;
    }
    controller.drainScheduled = true;
    this.scheduleMicrotask(() => {
      controller.drainScheduled = false;
      this.drain(controller);
    });
  }

  private drain(controller: SubmissionController) {
    if (this.shuttingDown || controller.completed) {
      return;
    }
    while (controller.active < controller.limit) {
      const item = controller.pending.find(
        (candidate) => candidate.state === "pending",
      );
      if (!item) {
        break;
      }
      item.state = "admitted";
      this.removePendingIndexes(item);
      this.emitRemoved(item, "admitted");
      controller.active += 1;
      this.log("admit", {
        submissionId: item.submissionId,
        queueId: item.queueId,
        unitId: item.unitId,
      });
      void Promise.resolve()
        .then(item.execute)
        .catch((error: unknown) => {
          this.log(
            "settle",
            {
              submissionId: item.submissionId,
              queueId: item.queueId,
              unitId: item.unitId,
              reasonCode: "host-queue-execution-error",
            },
            error,
          );
          return {
            status: "failed",
            reasonCode: "host-queue-execution-error",
          } as const;
        })
        .then((outcome) => {
          this.settleAdmitted(controller, item, outcome);
        });
    }
    this.maybeComplete(controller);
  }

  private settleAdmitted(
    controller: SubmissionController,
    item: InternalQueuedUnit,
    outcome: WorkflowExecutionUnitOutcome,
  ) {
    controller.active -= 1;
    controller.settled += 1;
    controller.outcomes.push(outcome);
    this.log("settle", {
      submissionId: item.submissionId,
      queueId: item.queueId,
      unitId: item.unitId,
      reasonCode:
        outcome.status === "succeeded" ? "succeeded" : outcome.reasonCode,
    });
    this.maybeComplete(controller);
    this.scheduleDrain(controller);
  }

  private settlePending(
    controller: SubmissionController,
    outcome: WorkflowExecutionUnitOutcome,
  ) {
    controller.settled += 1;
    controller.outcomes.push(outcome);
    this.maybeComplete(controller);
  }

  private maybeComplete(controller: SubmissionController) {
    if (controller.completed || controller.settled !== controller.total) {
      return;
    }
    controller.completed = true;
    this.submissions.delete(controller.submissionId);
    controller.resolveCompletion(
      summarize(controller.submissionId, controller.outcomes),
    );
  }

  private toSnapshot(item: InternalQueuedUnit): QueuedWorkflowUnitSnapshot {
    return Object.freeze({
      queueId: item.queueId,
      submissionId: item.submissionId,
      unitId: item.unitId,
      unitOrder: item.unitOrder,
      workflowId: item.workflowId,
      workflowLabel: item.workflowLabel,
      taskName: item.taskName,
      ...(item.inputUnitIdentity
        ? { inputUnitIdentity: item.inputUnitIdentity }
        : {}),
      backendType: item.backend.backendType,
      backendId: item.backend.backendId,
      createdAt: item.createdAt,
      canCancel: true,
    });
  }

  private emitRemoved(
    item: InternalQueuedUnit,
    reason: WorkflowQueueRemovalReason,
  ) {
    this.emit(
      Object.freeze({
        type: "removed",
        queueId: item.queueId,
        backend: item.backend,
        reason,
      }),
    );
  }

  private emit(event: WorkflowSubmissionQueueChangeEvent) {
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch (error: unknown) {
        this.log("subscriber-error", {}, error);
      }
    }
  }

  private log(
    operation: string,
    details: Record<string, unknown>,
    error?: unknown,
  ) {
    this.appendRuntimeLog({
      level: error ? "warn" : "info",
      scope: "job",
      component: "workflow-submission-queue",
      operation,
      stage: "host-queue",
      message: `Workflow submission queue ${operation}`,
      details,
      ...(error === undefined ? {} : { error }),
    });
  }
}

export const workflowSubmissionQueue = new WorkflowSubmissionQueue();

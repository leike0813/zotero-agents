import { appendRuntimeLog } from "../modules/runtimeLogManager";
import {
  normalizeStatusWithGuard,
  validateTransition,
  type SkillRunnerStateMachineViolation,
} from "../modules/skillRunnerProviderStateMachine";
import {
  coerceRecoverableSkillRunnerState,
  getSkillRunnerRequestIdFromJob,
  hasRecoverableSkillRunnerRequest,
  isNonRecoverableSkillRunnerFailure,
  isPreReadySkillRunnerRequest,
} from "../modules/skillRunnerRecoverableState";
import { settleSkillRunnerRunAsFailed } from "../modules/skillRunnerRunSettlement";
import { purgeSkillRunnerRunByRequest } from "../modules/skillRunnerTaskReconciler";

export type JobState =
  | "queued"
  | "running"
  | "waiting_user"
  | "waiting_auth"
  | "succeeded"
  | "failed"
  | "canceled";

export type JobRecord = {
  id: string;
  workflowId: string;
  request: unknown;
  meta: Record<string, unknown>;
  state: JobState;
  error?: string;
  result?: unknown;
  createdAt: string;
  updatedAt: string;
};

export type JobProgressEvent = {
  type: string;
  [key: string]: unknown;
};

type QueueConfig = {
  concurrency: number;
  executeJob: (
    job: JobRecord,
    runtime: {
      reportProgress: (event: JobProgressEvent) => void;
    },
  ) => Promise<unknown>;
  onJobUpdated?: (job: JobRecord) => void;
  onJobProgress?: (job: JobRecord, event: JobProgressEvent) => void;
};

function getExecutionResultRecord(
  result: unknown,
): Record<string, unknown> | null {
  return result && typeof result === "object" && !Array.isArray(result)
    ? (result as Record<string, unknown>)
    : null;
}

function getExecutionResultStatus(result: unknown) {
  const record = getExecutionResultRecord(result);
  return String(record?.status || "").trim();
}

function getExecutionResultError(result: unknown) {
  const record = getExecutionResultRecord(result);
  return String(record?.error || "").trim();
}

export class JobQueueManager {
  private readonly concurrency: number;

  private readonly executeJob: (
    job: JobRecord,
    runtime: {
      reportProgress: (event: JobProgressEvent) => void;
    },
  ) => Promise<unknown>;

  private readonly onJobUpdated?: (job: JobRecord) => void;
  private readonly onJobProgress?: (
    job: JobRecord,
    event: JobProgressEvent,
  ) => void;

  private readonly jobs = new Map<string, JobRecord>();

  private readonly pendingIds: string[] = [];

  private runningCount = 0;

  private nextId = 1;

  private idleWaiters: Array<() => void> = [];

  constructor(config: QueueConfig) {
    this.concurrency = Math.max(1, config.concurrency);
    this.executeJob = config.executeJob;
    this.onJobUpdated = config.onJobUpdated;
    this.onJobProgress = config.onJobProgress;
  }

  enqueue(args: {
    workflowId: string;
    request: unknown;
    meta?: Record<string, unknown>;
  }) {
    const now = new Date().toISOString();
    const id = `job-${this.nextId++}`;
    const job: JobRecord = {
      id,
      workflowId: args.workflowId,
      request: args.request,
      meta: args.meta || {},
      state: "queued",
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(id, job);
    this.emitJobUpdated(job);
    appendRuntimeLog({
      level: "info",
      scope: "job",
      workflowId: job.workflowId,
      backendId: String(job.meta.backendId || "").trim() || undefined,
      backendType: String(job.meta.backendType || "").trim() || undefined,
      providerId: String(job.meta.providerId || "").trim() || undefined,
      runId: String(job.meta.runId || "").trim() || undefined,
      jobId: job.id,
      component: "job-queue",
      operation: "enqueue",
      phase: "queued",
      stage: "queue-queued",
      message: "job queued",
      details: {
        runId: String(job.meta.runId || ""),
      },
    });
    this.pendingIds.push(id);
    void this.drain();
    return id;
  }

  getJob(jobId: string) {
    const value = this.jobs.get(jobId);
    if (!value) {
      return null;
    }
    return { ...value };
  }

  listJobs() {
    return Array.from(this.jobs.values()).map((job) => ({ ...job }));
  }

  async waitForIdle() {
    if (this.runningCount === 0 && this.pendingIds.length === 0) {
      return;
    }
    await new Promise<void>((resolve) => {
      this.idleWaiters.push(resolve);
    });
  }

  private touch(job: JobRecord) {
    job.updatedAt = new Date().toISOString();
  }

  private emitJobUpdated(job: JobRecord) {
    if (!this.onJobUpdated) {
      return;
    }
    this.onJobUpdated({
      ...job,
      meta: { ...job.meta },
    });
  }

  private resolveIdleIfNeeded() {
    if (this.runningCount !== 0 || this.pendingIds.length !== 0) {
      return;
    }
    const waiters = [...this.idleWaiters];
    this.idleWaiters = [];
    for (const waiter of waiters) {
      waiter();
    }
  }

  private async runOne(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }
    job.state = "running";
    this.touch(job);
    this.emitJobUpdated(job);
    appendRuntimeLog({
      level: "info",
      scope: "job",
      workflowId: job.workflowId,
      backendId: String(job.meta.backendId || "").trim() || undefined,
      backendType: String(job.meta.backendType || "").trim() || undefined,
      providerId: String(job.meta.providerId || "").trim() || undefined,
      runId: String(job.meta.runId || "").trim() || undefined,
      jobId: job.id,
      component: "job-queue",
      operation: "dispatch",
      phase: "start",
      stage: "dispatch-start",
      message: "provider dispatch started",
    });
    this.runningCount += 1;
    try {
      const executionResult = await this.executeJob(
        { ...job },
        {
          reportProgress: (event: JobProgressEvent) => {
            if (!event || typeof event !== "object") {
              return;
            }
            this.onJobProgress?.(job, event);
            this.touch(job);
            this.emitJobUpdated(job);
            appendRuntimeLog({
              level: "debug",
              scope: "job",
              workflowId: job.workflowId,
              backendId: String(job.meta.backendId || "").trim() || undefined,
              backendType:
                String(job.meta.backendType || "").trim() || undefined,
              providerId: String(job.meta.providerId || "").trim() || undefined,
              runId: String(job.meta.runId || "").trim() || undefined,
              jobId: job.id,
              requestId: String(job.meta.requestId || "").trim() || undefined,
              component: "job-queue",
              operation: "dispatch-progress",
              phase: "running",
              stage: "dispatch-progress",
              message: `provider progress: ${String(event.type || "unknown")}`,
              details: event,
            });
          },
        },
      );
      job.result = executionResult;
      const executionStatus = getExecutionResultStatus(executionResult);
      if (executionStatus === "deferred") {
        const requestId = String(
          (executionResult as { requestId?: unknown }).requestId ||
            job.meta.requestId ||
            "",
        ).trim();
        const backendStatus = String(
          (executionResult as { backendStatus?: unknown }).backendStatus || "",
        ).trim();
        const normalized = normalizeStatusWithGuard({
          value: backendStatus,
          fallback: "running",
          requestId: requestId || undefined,
        });
        this.appendStateMachineWarning({
          job,
          requestId: requestId || undefined,
          violation: normalized.violation,
        });
        const transition = validateTransition({
          prev: job.state,
          next: normalized.status,
          requestId: requestId || undefined,
        });
        this.appendStateMachineWarning({
          job,
          requestId: requestId || undefined,
          violation: transition.violation,
        });
        job.state = transition.ok ? transition.nextState : transition.prevState;
      } else if (
        executionStatus === "failed" ||
        executionStatus === "canceled"
      ) {
        job.state = executionStatus;
        job.error =
          getExecutionResultError(executionResult) ||
          (executionStatus === "canceled"
            ? "provider execution canceled"
            : "provider execution failed");
      } else {
        job.state = "succeeded";
      }
      this.touch(job);
      this.emitJobUpdated(job);
      const requestId = String(
        (executionResult as { requestId?: unknown })?.requestId || "",
      ).trim();
      const stage =
        executionStatus === "deferred"
          ? "dispatch-deferred"
          : executionStatus === "failed"
            ? "dispatch-failed"
            : executionStatus === "canceled"
              ? "dispatch-canceled"
              : "dispatch-succeeded";
      appendRuntimeLog({
        level: "info",
        scope: "job",
        workflowId: job.workflowId,
        backendId: String(job.meta.backendId || "").trim() || undefined,
        backendType: String(job.meta.backendType || "").trim() || undefined,
        providerId: String(job.meta.providerId || "").trim() || undefined,
        runId: String(job.meta.runId || "").trim() || undefined,
        jobId: job.id,
        requestId: requestId || undefined,
        component: "job-queue",
        operation: "dispatch-complete",
        phase: stage === "dispatch-deferred" ? "deferred" : "terminal",
        stage,
        message:
          stage === "dispatch-deferred"
            ? "provider dispatch deferred to backend reconciler"
            : stage === "dispatch-failed"
              ? "provider dispatch finished with terminal failure"
              : stage === "dispatch-canceled"
                ? "provider dispatch finished with cancellation"
                : "provider dispatch finished",
      });
    } catch (error) {
      this.logJobError(job, error);
      job.error = error instanceof Error ? error.message : String(error);
      const requestId = getSkillRunnerRequestIdFromJob(job);
      const isSkillRunnerJob =
        String(job.meta.backendType || "").trim() === "skillrunner" &&
        String(job.meta.requestKind || "").trim() === "skillrunner.job.v1";
      if (isSkillRunnerJob) {
        job.meta.skillRunnerSubmitError = job.error;
        if (!requestId) {
          job.meta.skillRunnerLifecycleState = "failed";
          job.meta.skillRunnerSubmitPhase =
            String(job.meta.skillRunnerSubmitPhase || "").trim() ||
            "request_creating";
        } else if (
          !(
            job.meta.skillRunnerRequestReady === true ||
            String(job.meta.skillRunnerRequestReady || "").trim() === "true"
          )
        ) {
          job.meta.skillRunnerLifecycleState = "failed";
          job.meta.skillRunnerSubmitPhase =
            String(job.meta.skillRunnerSubmitPhase || "").trim() || "uploading";
        }
      }
      if (requestId && isNonRecoverableSkillRunnerFailure(error)) {
        job.meta.skillRunnerTerminalRunError = true;
        job.state = "failed";
        this.touch(job);
        this.emitJobUpdated(job);
        settleSkillRunnerRunAsFailed({
          backendId: String(job.meta.backendId || "").trim(),
          backendType: String(job.meta.backendType || "").trim(),
          providerId: String(job.meta.providerId || "").trim() || "skillrunner",
          workflowId: job.workflowId,
          runId: String(job.meta.runId || "").trim(),
          jobId: job.id,
          requestId,
          reason: job.error,
          source: "job-queue-dispatch",
          error,
          updatedAt: job.updatedAt,
        });
        purgeSkillRunnerRunByRequest({
          backendId: String(job.meta.backendId || "").trim(),
          requestId,
        });
        appendRuntimeLog({
          level: "error",
          scope: "job",
          workflowId: job.workflowId,
          backendId: String(job.meta.backendId || "").trim() || undefined,
          backendType: String(job.meta.backendType || "").trim() || undefined,
          providerId: String(job.meta.providerId || "").trim() || undefined,
          runId: String(job.meta.runId || "").trim() || undefined,
          jobId: job.id,
          requestId,
          component: "job-queue",
          operation: "dispatch-failed-terminal-run",
          phase: "terminal",
          stage: "dispatch-failed-terminal-run",
          message:
            "provider dispatch failed after request creation with terminal run-level error",
          error,
        });
        return;
      }
      if (hasRecoverableSkillRunnerRequest(job)) {
        job.state = coerceRecoverableSkillRunnerState(job.state);
        this.touch(job);
        this.emitJobUpdated(job);
        appendRuntimeLog({
          level: "warn",
          scope: "job",
          workflowId: job.workflowId,
          backendId: String(job.meta.backendId || "").trim() || undefined,
          backendType: String(job.meta.backendType || "").trim() || undefined,
          providerId: String(job.meta.providerId || "").trim() || undefined,
          runId: String(job.meta.runId || "").trim() || undefined,
          jobId: job.id,
          requestId: requestId || undefined,
          component: "job-queue",
          operation: "dispatch-failed-recoverable",
          phase: "reconcile",
          stage: "dispatch-failed-recoverable",
          message:
            "provider dispatch failed after request creation; keeping recoverable non-terminal state",
          error,
          details: {
            preservedState: job.state,
          },
        });
      } else {
        const preReadySkillRunnerRequest = isPreReadySkillRunnerRequest(job);
        job.state = "failed";
        this.touch(job);
        this.emitJobUpdated(job);
        appendRuntimeLog({
          level: "error",
          scope: "job",
          workflowId: job.workflowId,
          backendId: String(job.meta.backendId || "").trim() || undefined,
          backendType: String(job.meta.backendType || "").trim() || undefined,
          providerId: String(job.meta.providerId || "").trim() || undefined,
          runId: String(job.meta.runId || "").trim() || undefined,
          jobId: job.id,
          requestId: requestId || undefined,
          component: "job-queue",
          operation: "dispatch-failed",
          phase: "terminal",
          stage: preReadySkillRunnerRequest
            ? "dispatch-failed-before-request-ready"
            : "dispatch-failed",
          message: preReadySkillRunnerRequest
            ? "provider dispatch failed after request creation before request-ready"
            : "provider dispatch failed",
          error,
          details: preReadySkillRunnerRequest
            ? {
                requestReady: false,
                recoverable: false,
              }
            : undefined,
        });
      }
    } finally {
      this.runningCount -= 1;
    }
  }

  private logJobError(job: JobRecord, error: unknown) {
    const label = `[workflow-job-error] workflow=${job.workflowId} job=${job.id}`;
    const runtime = globalThis as {
      Zotero?: { logError?: (err: unknown) => void };
    };
    try {
      if (
        typeof console !== "undefined" &&
        typeof console.error === "function"
      ) {
        console.error(label, error);
      }
    } catch {
      // ignore logging failures
    }
    if (typeof runtime.Zotero?.logError === "function") {
      const normalized =
        error instanceof Error ? error : new Error(String(error));
      runtime.Zotero.logError(normalized);
    }
  }

  private appendStateMachineWarning(args: {
    job: JobRecord;
    requestId?: string;
    violation?: SkillRunnerStateMachineViolation;
  }) {
    if (!args.violation) {
      return;
    }
    appendRuntimeLog({
      level: "warn",
      scope: "state-machine",
      workflowId: args.job.workflowId,
      backendId: String(args.job.meta.backendId || "").trim() || undefined,
      backendType: String(args.job.meta.backendType || "").trim() || undefined,
      providerId: String(args.job.meta.providerId || "").trim() || undefined,
      runId: String(args.job.meta.runId || "").trim() || undefined,
      jobId: args.job.id,
      requestId: args.requestId,
      component: "job-queue",
      operation: "state-machine-guard",
      phase: "running",
      stage: "state-machine-guard",
      message: "state machine guard degraded runtime state",
      details: args.violation,
    });
  }

  private async drain() {
    while (this.runningCount < this.concurrency && this.pendingIds.length > 0) {
      const nextJobId = this.pendingIds.shift();
      if (!nextJobId) {
        break;
      }
      void this.runOne(nextJobId).then(() => {
        void this.drain();
        this.resolveIdleIfNeeded();
      });
    }
    this.resolveIdleIfNeeded();
  }
}

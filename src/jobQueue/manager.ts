import { appendRuntimeLog } from "../modules/runtimeLogManager";
import { emitVerboseConsole } from "../modules/diagnosticVerbosity";

export type JobState =
  | "queued"
  | "running"
  | "waiting_user"
  | "waiting_auth"
  | "succeeded"
  | "failed"
  | "canceled";

export type JobRecordMeta = {
  runId?: string;
  workflowRunId?: string;
  localRunId?: string;
  workflowLabel?: string;
  taskName?: string;
  inputUnitIdentity?: string;
  inputUnitLabel?: string;
  inputMemberIdentities?: string[];
  inputMemberCount?: number;
  skillName?: string;
  skillLabel?: string;
  skillId?: string;
  sequenceStepId?: string;
  sequenceStepIndex?: number;
  sequenceJobId?: string;
  sequenceStepSkillId?: string;
  sequenceStepSkillName?: string;
  engine?: string;
  executionMode?: string;
  providerId?: string;
  providerOptions?: Record<string, unknown>;
  requestKind?: string;
  requestId?: string;
  backendId?: string;
  backendType?: string;
  backendBaseUrl?: string;
  targetParentID?: number;
  skillRunnerLifecycleState?:
    | "pre_request_id"
    | "request_creating"
    | "uploading"
    | JobState;
  skillRunnerRequestReady?: boolean;
  skillRunnerSubmitPhase?: string;
  skillRunnerSubmitStartedAt?: string;
  skillRunnerSubmitTimeoutAt?: string;
  skillRunnerSubmitError?: string;
  skillRunnerTerminalRunError?: boolean;
  [key: string]: unknown;
};

const JOB_META_LIFECYCLE_STATES = new Set<
  NonNullable<JobRecordMeta["skillRunnerLifecycleState"]>
>([
  "pre_request_id",
  "request_creating",
  "uploading",
  "queued",
  "running",
  "waiting_user",
  "waiting_auth",
  "succeeded",
  "failed",
  "canceled",
]);

export type JobRecord = {
  id: string;
  workflowId: string;
  request: unknown;
  meta: JobRecordMeta;
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

export type JobExecutionOutcome = {
  state: JobState;
  result?: unknown;
  error?: unknown;
  metaPatch?: Partial<JobRecordMeta>;
};

type QueueConfig = {
  concurrency: number;
  executeJob: (
    job: JobRecord,
    runtime: {
      reportProgress: (event: JobProgressEvent) => void;
    },
  ) => Promise<JobExecutionOutcome>;
  onJobSettled?: (job: JobRecord, outcome: JobExecutionOutcome) => void;
  onJobUpdated?: (job: JobRecord) => void;
  onJobProgress?: (job: JobRecord, event: JobProgressEvent) => void;
};

const JOB_META_STRING_FIELDS = [
  "runId",
  "workflowRunId",
  "localRunId",
  "workflowLabel",
  "taskName",
  "inputUnitIdentity",
  "inputUnitLabel",
  "skillName",
  "skillLabel",
  "skillId",
  "sequenceStepId",
  "sequenceJobId",
  "sequenceStepSkillId",
  "sequenceStepSkillName",
  "engine",
  "executionMode",
  "providerId",
  "requestKind",
  "requestId",
  "backendId",
  "backendType",
  "backendBaseUrl",
  "skillRunnerSubmitPhase",
  "skillRunnerSubmitStartedAt",
  "skillRunnerSubmitTimeoutAt",
  "skillRunnerSubmitError",
] as const;

const JOB_META_INTEGER_FIELDS = [
  "sequenceStepIndex",
  "targetParentID",
  "inputMemberCount",
] as const;

const JOB_META_BOOLEAN_FIELDS = [
  "skillRunnerRequestReady",
  "skillRunnerTerminalRunError",
] as const;

function normalizeJobMetaBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return undefined;
}

export function normalizeJobRecordMeta(meta: JobRecordMeta | undefined) {
  const normalized: JobRecordMeta = { ...(meta || {}) };
  for (const key of JOB_META_STRING_FIELDS) {
    const value = normalized[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        normalized[key] = trimmed;
      } else {
        delete normalized[key];
      }
    }
  }
  const lifecycleState = normalized.skillRunnerLifecycleState;
  if (typeof lifecycleState === "string") {
    const trimmed = lifecycleState.trim();
    if (
      JOB_META_LIFECYCLE_STATES.has(
        trimmed as NonNullable<JobRecordMeta["skillRunnerLifecycleState"]>,
      )
    ) {
      normalized.skillRunnerLifecycleState = trimmed as NonNullable<
        JobRecordMeta["skillRunnerLifecycleState"]
      >;
    } else {
      delete normalized.skillRunnerLifecycleState;
    }
  } else if (typeof lifecycleState !== "undefined") {
    delete normalized.skillRunnerLifecycleState;
  }
  for (const key of JOB_META_INTEGER_FIELDS) {
    const value = normalized[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      normalized[key] = Math.floor(value);
    } else if (typeof value !== "undefined") {
      delete normalized[key];
    }
  }
  for (const key of JOB_META_BOOLEAN_FIELDS) {
    const value = normalizeJobMetaBoolean(normalized[key]);
    if (typeof value === "boolean") {
      normalized[key] = value;
    } else if (typeof normalized[key] !== "undefined") {
      delete normalized[key];
    }
  }
  if (Array.isArray(normalized.inputMemberIdentities)) {
    normalized.inputMemberIdentities = Array.from(
      new Set(
        normalized.inputMemberIdentities
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      ),
    );
  } else if (typeof normalized.inputMemberIdentities !== "undefined") {
    delete normalized.inputMemberIdentities;
  }
  return normalized;
}

export class JobQueueManager {
  private readonly concurrency: number;

  private readonly executeJob: QueueConfig["executeJob"];

  private readonly onJobSettled: QueueConfig["onJobSettled"];

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
    this.onJobSettled = config.onJobSettled;
    this.onJobUpdated = config.onJobUpdated;
    this.onJobProgress = config.onJobProgress;
  }

  enqueue(args: {
    workflowId: string;
    request: unknown;
    meta?: JobRecordMeta;
  }) {
    const now = new Date().toISOString();
    const id = `job-${this.nextId++}`;
    const job: JobRecord = {
      id,
      workflowId: args.workflowId,
      request: args.request,
      meta: normalizeJobRecordMeta(args.meta),
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
    void Promise.resolve().then(() => this.drain());
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
      let outcome: JobExecutionOutcome;
      try {
        outcome = await this.executeJob(
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
                providerId:
                  String(job.meta.providerId || "").trim() || undefined,
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
      } catch (error) {
        outcome = { state: "failed", error };
      }
      job.result = outcome.result;
      job.state = outcome.state;
      job.error =
        outcome.error === undefined
          ? undefined
          : outcome.error instanceof Error
            ? outcome.error.message
            : String(outcome.error);
      if (outcome.metaPatch) {
        Object.assign(job.meta, outcome.metaPatch);
      }
      this.touch(job);
      if (outcome.error !== undefined) {
        this.logJobError(job, outcome.error);
      }
      try {
        this.onJobSettled?.({ ...job, meta: { ...job.meta } }, outcome);
      } catch (error) {
        appendRuntimeLog({
          level: "error",
          scope: "job",
          workflowId: job.workflowId,
          jobId: job.id,
          component: "job-queue",
          operation: "settlement-notification",
          stage: "settlement-notification-failed",
          message: "job settlement observer failed",
          error,
        });
      }
      this.emitJobUpdated(job);
      const terminal =
        job.state === "succeeded" ||
        job.state === "failed" ||
        job.state === "canceled";
      const stage = terminal ? `dispatch-${job.state}` : "dispatch-deferred";
      appendRuntimeLog({
        level: job.state === "failed" ? "error" : "info",
        scope: "job",
        workflowId: job.workflowId,
        backendId: String(job.meta.backendId || "").trim() || undefined,
        backendType: String(job.meta.backendType || "").trim() || undefined,
        providerId: String(job.meta.providerId || "").trim() || undefined,
        runId: String(job.meta.runId || "").trim() || undefined,
        jobId: job.id,
        requestId: String(job.meta.requestId || "").trim() || undefined,
        component: "job-queue",
        operation: "dispatch-complete",
        phase: terminal ? "terminal" : "deferred",
        stage,
        message: "job dispatch settled",
        error: outcome.error,
      });
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
      emitVerboseConsole("error", label, error);
    } catch {
      // ignore logging failures
    }
    if (typeof runtime.Zotero?.logError === "function") {
      const normalized =
        error instanceof Error ? error : new Error(String(error));
      runtime.Zotero.logError(normalized);
    }
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

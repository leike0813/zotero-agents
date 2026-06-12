import { appendRuntimeLog } from "../runtimeLogManager";
import {
  emitWorkflowFinishSummary,
  emitWorkflowJobToasts,
  selectWorkflowJobOutcomesForToasts,
  shouldEmitWorkflowFinishSummaryToast,
} from "./feedbackSeam";
import type { WorkflowJobOutcome } from "./contracts";
import type { WorkflowMessageFormatter } from "../workflowExecuteMessage";

type DeferredTrackedJob = WorkflowJobOutcome & {
  requestId: string;
};

type BufferedDeferredOutcome = {
  requestId: string;
  succeeded: boolean;
  terminalState: "succeeded" | "failed" | "canceled";
  reason?: string;
  arrivedAt: number;
};

type DeferredWorkflowRun = {
  runId: string;
  win: _ZoteroTypes.MainWindow;
  workflowId: string;
  workflowLabel: string;
  totalJobs: number;
  skipped: number;
  succeeded: number;
  failed: number;
  failureReasons: string[];
  pendingByRequestId: Map<string, DeferredTrackedJob>;
  deferredOutcomes: WorkflowJobOutcome[];
  messageFormatter: WorkflowMessageFormatter;
};

type DeferredWorkflowCompletionDeps = {
  emitWorkflowJobToasts: typeof emitWorkflowJobToasts;
  emitWorkflowFinishSummary: typeof emitWorkflowFinishSummary;
  appendRuntimeLog: typeof appendRuntimeLog;
};

const defaultDeps: DeferredWorkflowCompletionDeps = {
  emitWorkflowJobToasts,
  emitWorkflowFinishSummary,
  appendRuntimeLog,
};

let deps: DeferredWorkflowCompletionDeps = { ...defaultDeps };

const DEFERRED_OUTCOME_BUFFER_TTL_MS = 10 * 60 * 1000;
const pendingRuns = new Map<string, DeferredWorkflowRun>();
const bufferedOutcomesByRunId = new Map<string, Map<string, BufferedDeferredOutcome>>();
const completedRunIds = new Map<string, number>();

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function cloneFailureReasons(reasons: string[]) {
  return Array.isArray(reasons) ? [...reasons] : [];
}

function nowMs() {
  return Date.now();
}

function appendDeferredTrackerLog(args: {
  level: "info" | "warn";
  stage: string;
  message: string;
  workflowId?: string;
  runId: string;
  requestId?: string;
  details?: Record<string, unknown>;
}) {
  deps.appendRuntimeLog({
    level: args.level,
    scope: "workflow-trigger",
    workflowId: args.workflowId,
    runId: args.runId,
    requestId: args.requestId,
    stage: args.stage,
    message: args.message,
    details: args.details,
  });
}

function pruneDeferredOutcomeState(currentTs = nowMs()) {
  const cutoff = currentTs - DEFERRED_OUTCOME_BUFFER_TTL_MS;
  for (const [runId, bufferedByRequestId] of bufferedOutcomesByRunId.entries()) {
    for (const [requestId, outcome] of bufferedByRequestId.entries()) {
      if (outcome.arrivedAt > cutoff) {
        continue;
      }
      bufferedByRequestId.delete(requestId);
      appendDeferredTrackerLog({
        level: "warn",
        stage: "deferred-outcome-buffer-dropped",
        message: "deferred outcome buffer entry expired before register",
        runId,
        requestId,
        details: {
          reason: "expired-before-register",
          arrivedAt: new Date(outcome.arrivedAt).toISOString(),
        },
      });
    }
    if (bufferedByRequestId.size === 0) {
      bufferedOutcomesByRunId.delete(runId);
    }
  }
  for (const [runId, completedAt] of completedRunIds.entries()) {
    if (completedAt <= cutoff) {
      completedRunIds.delete(runId);
    }
  }
}

function finalizeDeferredWorkflowRun(tracked: DeferredWorkflowRun) {
  const orderedDeferredOutcomes = [...tracked.deferredOutcomes].sort(
    (left, right) => left.index - right.index,
  );
  const jobToastOutcomes = selectWorkflowJobOutcomesForToasts({
    outcomes: orderedDeferredOutcomes,
    totalJobs: tracked.totalJobs,
    skipped: tracked.skipped,
  });
  if (jobToastOutcomes.length > 0) {
    deps.emitWorkflowJobToasts({
      workflowLabel: tracked.workflowLabel,
      totalJobs: tracked.totalJobs,
      outcomes: jobToastOutcomes,
      messageFormatter: tracked.messageFormatter,
    });
  }
  if (
    shouldEmitWorkflowFinishSummaryToast({
      outcomes: orderedDeferredOutcomes,
      totalJobs: tracked.totalJobs,
      skipped: tracked.skipped,
    })
  ) {
    deps.emitWorkflowFinishSummary({
      win: tracked.win,
      workflowLabel: tracked.workflowLabel,
      succeeded: tracked.succeeded,
      failed: tracked.failed,
      skipped: tracked.skipped,
      failureReasons: tracked.failureReasons,
      messageFormatter: tracked.messageFormatter,
    });
  }
  deps.appendRuntimeLog({
    level: tracked.failed > 0 ? "warn" : "info",
    scope: "workflow-trigger",
    workflowId: tracked.workflowId,
    runId: tracked.runId,
    stage: "deferred-run-summary-emitted",
    message: "deferred run summary emitted after reconciler convergence",
    details: {
      succeeded: tracked.succeeded,
      failed: tracked.failed,
      skipped: tracked.skipped,
      deferredCount: orderedDeferredOutcomes.length,
    },
  });
  pendingRuns.delete(tracked.runId);
  completedRunIds.set(tracked.runId, nowMs());
}

function applyDeferredOutcomeToTrackedRun(
  tracked: DeferredWorkflowRun,
  args: {
    requestId: string;
    succeeded: boolean;
    terminalState: "succeeded" | "failed" | "canceled";
    reason?: string;
    source: "settle" | "replay";
    arrivedAt?: number;
  },
) {
  const pending = tracked.pendingByRequestId.get(args.requestId);
  if (!pending) {
    return { handled: false, completed: false };
  }

  tracked.pendingByRequestId.delete(args.requestId);
  const normalizedReason = normalizeString(args.reason) || undefined;
  const outcome: WorkflowJobOutcome = {
    index: pending.index,
    taskLabel: pending.taskLabel,
    succeeded: args.succeeded,
    terminalState: args.terminalState,
    reason: args.succeeded ? undefined : normalizedReason,
    jobId: pending.jobId,
    requestId: args.requestId,
  };
  tracked.deferredOutcomes.push(outcome);
  if (args.succeeded) {
    tracked.succeeded += 1;
  } else {
    tracked.failed += 1;
    tracked.failureReasons.push(
      `job-${pending.index}${args.requestId ? ` (request_id=${args.requestId})` : ""}: ${
        normalizedReason || "unknown error"
      }`,
    );
  }

  if (args.source === "replay") {
    appendDeferredTrackerLog({
      level: "info",
      stage: "deferred-outcome-replayed-after-register",
      message: "replayed buffered deferred outcome after tracker registration",
      workflowId: tracked.workflowId,
      runId: tracked.runId,
      requestId: args.requestId,
      details: {
        terminalState: args.terminalState,
        succeeded: args.succeeded,
        arrivedAt:
          typeof args.arrivedAt === "number"
            ? new Date(args.arrivedAt).toISOString()
            : undefined,
        pendingRemaining: tracked.pendingByRequestId.size,
      },
    });
  }

  if (tracked.pendingByRequestId.size > 0) {
    return { handled: true, completed: false };
  }

  finalizeDeferredWorkflowRun(tracked);
  return { handled: true, completed: true };
}

export function registerDeferredWorkflowCompletion(args: {
  runId: string;
  win: _ZoteroTypes.MainWindow;
  workflowId: string;
  workflowLabel: string;
  totalJobs: number;
  skipped: number;
  succeeded: number;
  failed: number;
  failureReasons: string[];
  pendingJobs: DeferredTrackedJob[];
  messageFormatter: WorkflowMessageFormatter;
}) {
  pruneDeferredOutcomeState();
  const runId = normalizeString(args.runId);
  if (!runId || !Array.isArray(args.pendingJobs) || args.pendingJobs.length === 0) {
    return false;
  }
  const pendingByRequestId = new Map<string, DeferredTrackedJob>();
  for (const job of args.pendingJobs) {
    const requestId = normalizeString(job.requestId);
    if (!requestId) {
      continue;
    }
    pendingByRequestId.set(requestId, {
      ...job,
      requestId,
    });
  }
  if (pendingByRequestId.size === 0) {
    return false;
  }
  pendingRuns.set(runId, {
    runId,
    win: args.win,
    workflowId: normalizeString(args.workflowId),
    workflowLabel: normalizeString(args.workflowLabel),
    totalJobs: Math.max(0, Math.floor(Number(args.totalJobs || 0))),
    skipped: Math.max(0, Math.floor(Number(args.skipped || 0))),
    succeeded: Math.max(0, Math.floor(Number(args.succeeded || 0))),
    failed: Math.max(0, Math.floor(Number(args.failed || 0))),
    failureReasons: cloneFailureReasons(args.failureReasons),
    pendingByRequestId,
    deferredOutcomes: [],
    messageFormatter: args.messageFormatter,
  });

  const bufferedByRequestId = bufferedOutcomesByRunId.get(runId);
  if (!bufferedByRequestId || bufferedByRequestId.size === 0) {
    return true;
  }
  bufferedOutcomesByRunId.delete(runId);
  const tracked = pendingRuns.get(runId);
  if (!tracked) {
    return true;
  }

  for (const outcome of bufferedByRequestId.values()) {
    if (!tracked.pendingByRequestId.has(outcome.requestId)) {
      appendDeferredTrackerLog({
        level: "warn",
        stage: "deferred-outcome-buffer-dropped",
        message: "buffered deferred outcome did not match any registered pending job",
        workflowId: tracked.workflowId,
        runId,
        requestId: outcome.requestId,
        details: {
          reason: "request-not-found-after-register",
          pendingRequestIds: Array.from(tracked.pendingByRequestId.keys()),
        },
      });
      continue;
    }
    applyDeferredOutcomeToTrackedRun(tracked, {
      requestId: outcome.requestId,
      succeeded: outcome.succeeded,
      terminalState: outcome.terminalState,
      reason: outcome.reason,
      source: "replay",
      arrivedAt: outcome.arrivedAt,
    });
  }
  return true;
}

export function settleDeferredWorkflowCompletion(args: {
  runId: string;
  requestId: string;
  succeeded: boolean;
  terminalState?: "succeeded" | "failed" | "canceled";
  reason?: string;
}) {
  pruneDeferredOutcomeState();
  const runId = normalizeString(args.runId);
  const requestId = normalizeString(args.requestId);
  if (!runId || !requestId) {
    return { handled: false, completed: false };
  }
  if (completedRunIds.has(runId)) {
    return { handled: false, completed: false };
  }
  const tracked = pendingRuns.get(runId);
  if (!tracked) {
    const bufferedByRequestId =
      bufferedOutcomesByRunId.get(runId) || new Map<string, BufferedDeferredOutcome>();
    if (!bufferedOutcomesByRunId.has(runId)) {
      bufferedOutcomesByRunId.set(runId, bufferedByRequestId);
    }
    if (!bufferedByRequestId.has(requestId)) {
      const terminalState = args.terminalState || (args.succeeded ? "succeeded" : "failed");
      bufferedByRequestId.set(requestId, {
        requestId,
        succeeded: args.succeeded,
        terminalState,
        reason: normalizeString(args.reason) || undefined,
        arrivedAt: nowMs(),
      });
      appendDeferredTrackerLog({
        level: "info",
        stage: "deferred-outcome-buffered-before-register",
        message: "buffered deferred outcome before tracker registration",
        runId,
        requestId,
        details: {
          terminalState,
          succeeded: args.succeeded,
        },
      });
    }
    return { handled: true, completed: false };
  }
  if (!tracked.pendingByRequestId.has(requestId)) {
    return { handled: false, completed: false };
  }
  return applyDeferredOutcomeToTrackedRun(tracked, {
    requestId,
    succeeded: args.succeeded,
    terminalState: args.terminalState || (args.succeeded ? "succeeded" : "failed"),
    reason: args.reason,
    source: "settle",
  });
}

export function resetDeferredWorkflowCompletionTrackerForTests() {
  pendingRuns.clear();
  bufferedOutcomesByRunId.clear();
  completedRunIds.clear();
}

export function setDeferredWorkflowCompletionTrackerDepsForTests(
  overrides: Partial<DeferredWorkflowCompletionDeps> = {},
) {
  deps = {
    ...defaultDeps,
    ...overrides,
  };
}

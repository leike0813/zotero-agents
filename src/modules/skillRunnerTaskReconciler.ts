import type { BackendInstance } from "../backends/types";
import { listBackendInstancesSync } from "../backends/registry";
import { resolveBackendDisplayName } from "../backends/displayName";
import { DEFAULT_BACKEND_TYPE } from "../config/defaults";
import type { JobState } from "../jobQueue/manager";
import { SkillRunnerClient } from "../providers/skillrunner/client";
import { resolveSkillRunnerBackendCommunicationFailedToastText } from "../utils/localizationGovernance";
import { appendRuntimeLog } from "./runtimeLogManager";
import {
  listTaskDashboardHistory,
  removeTaskDashboardHistoryByBackendAndRequestIds,
  updateTaskDashboardHistoryStateByRequest,
} from "./taskDashboardHistory";
import {
  listActiveWorkflowTaskSummaries,
  removeWorkflowTasksByBackendAndRequestIds,
  updateWorkflowTaskStateByRequest,
} from "./taskRuntime";
import { showWorkflowToast } from "./workflowExecution/feedbackSeam";
import {
  getLoadedWorkflowEntries,
  rescanWorkflowRegistry,
} from "./workflowRuntime";
import { getSequenceRunStateByStepRequest } from "./workflowExecution/sequenceStateStore";
import {
  isTerminal,
  isWaiting,
  normalizeStatus,
  normalizeStatusWithGuard,
} from "./skillRunnerProviderStateMachine";
import {
  getSkillRunnerHttpStatus,
  isSkillRunnerRunTerminalClientError,
} from "../providers/skillrunner/errors";
import { settleSkillRunnerRunAsFailed } from "./skillRunnerRunSettlement";
import {
  stopAllSkillRunnerSessionSync,
  stopSessionSync,
} from "./skillRunnerSessionSyncManager";
import {
  listSkillRunnerBackendHealthStates,
  markSkillRunnerBackendHealthSuccess,
  registerSkillRunnerBackendForHealthTracking,
  subscribeSkillRunnerBackendHealth,
} from "./skillRunnerBackendHealthRegistry";
import {
  archiveSkillRunnerRunRecordByRequest,
  deleteSkillRunnerRunRecordsByBackend,
  getSkillRunnerRunRecordByRequest,
  listSkillRunnerRunRecords,
  type SkillRunnerRunRecord,
} from "./skillRunnerRunStore";
import { continueSkillRunnerForegroundRun } from "./skillRunnerForegroundContinuation";
import { maybeObserveSkillRunnerAutoReplyRun } from "./skillRunnerAutoReplyObserver";

type RecoverySweepSource =
  | "startup"
  | "backend-healthy"
  | "local-runtime-up"
  | "manual";

type RecoveryDecision =
  | {
      action: "skip";
      reason: string;
    }
  | {
      action: "waiting";
      reason: string;
    }
  | {
      action: "handoff";
      reason: string;
    }
  | {
      action: "fail";
      reason: string;
    };

export type SkillRunnerBackendTaskLedgerReconcileSource =
  | "startup"
  | "local-runtime-up";

export type SkillRunnerBackendTaskLedgerReconcileResult = {
  ok: boolean;
  source: SkillRunnerBackendTaskLedgerReconcileSource;
  backendId: string;
  stage: string;
  message: string;
  checkedRequestIds: string[];
  missingRequestIds: string[];
  removedActiveCount: number;
  removedHistoryCount: number;
};

type BackendReconcileFailureToastPayload = {
  backendId: string;
  displayName: string;
  source: SkillRunnerBackendTaskLedgerReconcileSource;
  text: string;
};

type SkillRunnerTaskLifecycleToastPayload = {
  state: "waiting_user" | "waiting_auth" | "succeeded" | "failed" | "canceled";
  text: string;
  type: "default" | "success" | "error";
};

const DETACHED_RECOVERY_BACKOFF_MS = 60_000;

let backendReconcileFailureToastEmitter: (
  payload: BackendReconcileFailureToastPayload,
) => void = (payload) => {
  showWorkflowToast({
    text: payload.text,
    type: "error",
    semantic: "error",
  });
};

let skillRunnerTaskLifecycleToastEmitter: (
  payload: SkillRunnerTaskLifecycleToastPayload,
) => void = (payload) => {
  showWorkflowToast({
    text: payload.text,
    type: payload.type,
    semantic:
      payload.state === "waiting_user" || payload.state === "waiting_auth"
        ? "waiting"
        : payload.state === "canceled"
          ? "canceled"
          : payload.state === "succeeded"
            ? "success"
            : "error",
  });
};

export function setSkillRunnerBackendReconcileFailureToastEmitterForTests(
  emitter?: (payload: BackendReconcileFailureToastPayload) => void,
) {
  backendReconcileFailureToastEmitter =
    emitter ||
    ((payload) => {
      showWorkflowToast({
        text: payload.text,
        type: "error",
        semantic: "error",
      });
    });
}

export function setSkillRunnerTaskLifecycleToastEmitterForTests(
  emitter?: (payload: SkillRunnerTaskLifecycleToastPayload) => void,
) {
  skillRunnerTaskLifecycleToastEmitter =
    emitter ||
    ((payload) => {
      showWorkflowToast({
        text: payload.text,
        type: payload.type,
        semantic:
          payload.state === "waiting_user" || payload.state === "waiting_auth"
            ? "waiting"
            : payload.state === "canceled"
              ? "canceled"
              : payload.state === "succeeded"
                ? "success"
                : "error",
      });
    });
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function extractHttpStatusFromError(error: unknown) {
  return getSkillRunnerHttpStatus(error);
}

type TerminalJobState = Extract<JobState, "succeeded" | "failed" | "canceled">;

function resolveTerminalJobState(value: unknown): TerminalJobState | "" {
  const normalized = normalizeStatus(value, "running");
  return normalized === "succeeded" ||
    normalized === "failed" ||
    normalized === "canceled"
    ? normalized
    : "";
}

async function resolveDoubleConfirmedTerminalRunState(args: {
  client: SkillRunnerClient;
  requestId: string;
  firstStatus?: unknown;
  firstError?: unknown;
}): Promise<{ state: TerminalJobState; error?: string } | null> {
  const firstStatus =
    typeof args.firstStatus === "undefined"
      ? (await args.client.getRunState({ requestId: args.requestId })).status
      : args.firstStatus;
  const firstTerminal = resolveTerminalJobState(firstStatus);
  if (!firstTerminal) {
    return null;
  }
  const second = await args.client.getRunState({ requestId: args.requestId });
  const secondTerminal = resolveTerminalJobState(second.status);
  if (!secondTerminal || secondTerminal !== firstTerminal) {
    return null;
  }
  return {
    state: secondTerminal,
    error:
      normalizeString(second.error) ||
      normalizeString(args.firstError) ||
      undefined,
  };
}

function collectRequestIdsForBackend(backendId: string) {
  const normalizedBackendId = normalizeString(backendId);
  const requestIds = new Set<string>();
  for (const row of listActiveWorkflowTaskSummaries({
    backendId: normalizedBackendId,
  })) {
    const requestId = normalizeString(row.requestId);
    if (requestId) {
      requestIds.add(requestId);
    }
  }
  for (const row of listTaskDashboardHistory({
    backendId: normalizedBackendId,
  })) {
    const requestId = normalizeString(row.requestId);
    if (requestId) {
      requestIds.add(requestId);
    }
  }
  for (const record of listSkillRunnerRunRecords({
    backendId: normalizedBackendId,
  })) {
    const requestId = normalizeString(record.requestId);
    if (requestId) {
      requestIds.add(requestId);
    }
  }
  return Array.from(requestIds.values());
}

function reconcileTerminalStateIntoTaskLedger(args: {
  backendId: string;
  requestId: string;
  state: TerminalJobState;
  error?: string;
}) {
  const updatedAt = nowIso();
  const updatedActiveCount = updateWorkflowTaskStateByRequest({
    backendId: args.backendId,
    backendType: "skillrunner",
    requestId: args.requestId,
    state: args.state,
    error: args.error,
    updatedAt,
  });
  const updatedHistoryCount = updateTaskDashboardHistoryStateByRequest({
    backendId: args.backendId,
    requestId: args.requestId,
    state: args.state,
    error: args.error,
    updatedAt,
  });
  return {
    updatedActiveCount,
    updatedHistoryCount,
  };
}

export function mapSkillRunnerBackendStatusToJobState(
  status: unknown,
): JobState {
  return normalizeStatusWithGuard({
    value: status,
    fallback: "running",
  }).status;
}

async function resolveWorkflow(workflowId: string) {
  const normalized = normalizeString(workflowId);
  if (!normalized) {
    return null;
  }
  let workflow =
    getLoadedWorkflowEntries().find(
      (entry) => entry.manifest.id === normalized,
    ) || null;
  if (workflow) {
    return workflow;
  }
  await rescanWorkflowRegistry();
  workflow =
    getLoadedWorkflowEntries().find(
      (entry) => entry.manifest.id === normalized,
    ) || null;
  return workflow;
}

function recoveryContinuationSource(source: RecoverySweepSource) {
  if (source === "backend-healthy") {
    return "recovery-backend-healthy";
  }
  if (source === "local-runtime-up") {
    return "recovery-local-runtime-up";
  }
  if (source === "startup") {
    return "recovery-startup";
  }
  return "recovery-manual";
}

function isSequenceStepRecord(record: SkillRunnerRunRecord) {
  return (
    !!normalizeString(record.sequenceRunId) ||
    !!normalizeString(record.sequenceStepId)
  );
}

export async function reconcileSkillRunnerBackendTaskLedgerOnce(args: {
  backend: BackendInstance;
  source: SkillRunnerBackendTaskLedgerReconcileSource;
  emitFailureToast?: boolean;
}): Promise<SkillRunnerBackendTaskLedgerReconcileResult> {
  const backendId = normalizeString(args.backend.id);
  const source = args.source;
  const baseUrl = normalizeString(args.backend.baseUrl);
  const backendType = normalizeString(args.backend.type);
  if (!backendId || backendType !== "skillrunner") {
    return {
      ok: true,
      source,
      backendId,
      stage: "backend-task-ledger-reconcile-skip",
      message: "backend task ledger reconcile skipped",
      checkedRequestIds: [],
      missingRequestIds: [],
      removedActiveCount: 0,
      removedHistoryCount: 0,
    };
  }
  registerSkillRunnerBackendForHealthTracking(backendId);
  const requestIds = collectRequestIdsForBackend(backendId);
  if (requestIds.length === 0) {
    return {
      ok: true,
      source,
      backendId,
      stage: "backend-task-ledger-reconcile-empty",
      message: "no task ledger entries to reconcile",
      checkedRequestIds: [],
      missingRequestIds: [],
      removedActiveCount: 0,
      removedHistoryCount: 0,
    };
  }
  const missingRequestIds: string[] = [];
  const terminalConfirmedByRequestId = new Map<
    string,
    {
      state: TerminalJobState;
      error?: string;
    }
  >();
  try {
    const client = new SkillRunnerClient({
      baseUrl,
      backendId,
    });
    for (const requestId of requestIds) {
      try {
        const terminalRunState = await resolveDoubleConfirmedTerminalRunState({
          client,
          requestId,
        });
        if (terminalRunState) {
          terminalConfirmedByRequestId.set(requestId, terminalRunState);
        }
      } catch (error) {
        const status = extractHttpStatusFromError(error);
        if (isSkillRunnerRunTerminalClientError(error) || status === 404) {
          missingRequestIds.push(requestId);
          settleSkillRunnerRunAsFailed({
            backendId,
            backendType,
            providerId: "skillrunner",
            requestId,
            reason: `SkillRunner request is unavailable: status=${status || "unknown"}`,
            source: `backend-task-ledger-reconcile:${source}`,
            error,
          });
          continue;
        }
        throw error;
      }
    }
    markSkillRunnerBackendHealthSuccess(backendId);
    const removedActiveCount = 0;
    const removedHistoryCount = 0;
    let reconciledTerminalActiveCount = 0;
    let reconciledTerminalHistoryCount = 0;
    const reconciledTerminalRequestIds: string[] = [];
    for (const [
      requestId,
      terminalState,
    ] of terminalConfirmedByRequestId.entries()) {
      const reconciled = reconcileTerminalStateIntoTaskLedger({
        backendId,
        requestId,
        state: terminalState.state,
        error: terminalState.error,
      });
      if (
        reconciled.updatedActiveCount > 0 ||
        reconciled.updatedHistoryCount > 0
      ) {
        reconciledTerminalRequestIds.push(requestId);
      }
      reconciledTerminalActiveCount += reconciled.updatedActiveCount;
      reconciledTerminalHistoryCount += reconciled.updatedHistoryCount;
    }
    appendRuntimeLog({
      level: "info",
      scope: "provider",
      backendId,
      backendType,
      providerId: "skillrunner",
      component: "skillrunner-recovery",
      operation: "backend-task-ledger-reconcile",
      phase: source,
      stage: "backend-task-ledger-reconcile-finished",
      message: "backend task ledger reconcile finished",
      details: {
        source,
        checkedRequestIds: requestIds,
        missingRequestIds,
        removedActiveCount,
        removedHistoryCount,
        reconciledTerminalRequestIds,
        reconciledTerminalActiveCount,
        reconciledTerminalHistoryCount,
      },
    });
    return {
      ok: true,
      source,
      backendId,
      stage: "backend-task-ledger-reconcile-finished",
      message: "backend task ledger reconcile finished",
      checkedRequestIds: requestIds,
      missingRequestIds,
      removedActiveCount,
      removedHistoryCount,
    };
  } catch (error) {
    const displayName = resolveBackendDisplayName(
      backendId,
      args.backend.displayName,
    );
    const toastText = resolveSkillRunnerBackendCommunicationFailedToastText(
      displayName || backendId,
    );
    appendRuntimeLog({
      level: "error",
      scope: "provider",
      backendId,
      backendType,
      providerId: "skillrunner",
      component: "skillrunner-recovery",
      operation: "backend-task-ledger-reconcile",
      phase: source,
      stage: "backend-task-ledger-reconcile-failed",
      message: "backend task ledger reconcile failed",
      error,
      details: {
        source,
        checkedRequestIds: requestIds,
      },
    });
    if (args.emitFailureToast !== false) {
      try {
        backendReconcileFailureToastEmitter({
          backendId,
          displayName: displayName || backendId,
          source,
          text: toastText,
        });
      } catch {
        // keep toast reporting best-effort
      }
    }
    return {
      ok: false,
      source,
      backendId,
      stage: "backend-task-ledger-reconcile-failed",
      message:
        normalizeString(
          error && typeof error === "object" && "message" in error
            ? (error as { message?: unknown }).message
            : error,
        ) || "backend task ledger reconcile failed",
      checkedRequestIds: requestIds,
      missingRequestIds: [],
      removedActiveCount: 0,
      removedHistoryCount: 0,
    };
  }
}

export class SkillRunnerTaskReconciler {
  private readonly inflightTasks = new Set<Promise<void>>();

  private readonly recoveryInFlightKeys = new Set<string>();

  private readonly backendRecoverySweepInFlightKeys = new Set<string>();

  private readonly detachedRecoveryBackoffUntil = new Map<string, number>();

  private readonly backendWasFlagged = new Set<string>();

  private running = false;

  private runGeneration = 0;

  private unsubscribeBackendHealth?: () => void;

  private isGenerationActive(generation: number) {
    return this.running && this.runGeneration === generation;
  }

  private spawnBackgroundTask(
    label: string,
    generation: number,
    task: () => Promise<void>,
  ) {
    const promise = task()
      .catch((error) => {
        appendRuntimeLog({
          level: "error",
          scope: "workflow-trigger",
          component: "skillrunner-recovery",
          operation: label,
          phase: "background",
          stage: "skillrunner-recovery-background-task-failed",
          message: "skillrunner recovery background task failed",
          error,
        });
      })
      .finally(() => {
        this.inflightTasks.delete(promise);
      });
    this.inflightTasks.add(promise);
    void generation;
  }

  private async drainInFlightTasks() {
    while (this.inflightTasks.size > 0) {
      await Promise.allSettled(Array.from(this.inflightTasks));
    }
  }

  private resolveBackendForRun(record: SkillRunnerRunRecord) {
    const backendId = normalizeString(record.backendId);
    if (!backendId) {
      return null;
    }
    return (
      listBackendInstancesSync().find(
        (entry) =>
          normalizeString(entry.id) === backendId &&
          normalizeString(entry.type) === DEFAULT_BACKEND_TYPE &&
          !!normalizeString(entry.baseUrl),
      ) || null
    );
  }

  private recoveryKey(record: SkillRunnerRunRecord) {
    return `${normalizeString(record.backendId)}:${normalizeString(
      record.requestId,
    )}`;
  }

  private isDetachedRecoveryBackoffActive(record: SkillRunnerRunRecord) {
    const key = this.recoveryKey(record);
    const until = this.detachedRecoveryBackoffUntil.get(key) || 0;
    if (until <= Date.now()) {
      this.detachedRecoveryBackoffUntil.delete(key);
      return false;
    }
    return true;
  }

  private markDetachedRecoveryBackoff(record: SkillRunnerRunRecord) {
    this.detachedRecoveryBackoffUntil.set(
      this.recoveryKey(record),
      Date.now() + DETACHED_RECOVERY_BACKOFF_MS,
    );
  }

  private async resolveRecoveryDecision(
    record: SkillRunnerRunRecord,
  ): Promise<RecoveryDecision> {
    const requestId = normalizeString(record.requestId);
    if (!requestId) {
      return { action: "skip", reason: "missing-request-id" };
    }
    const status = normalizeStatus(record.status, "running");
    if (status === "failed" || status === "canceled") {
      return { action: "skip", reason: `terminal-${status}` };
    }
    if (status === "succeeded") {
      if (
        record.apply.state === "succeeded" ||
        record.apply.state === "skipped"
      ) {
        return { action: "skip", reason: `apply-${record.apply.state}` };
      }
      if (record.apply.state === "running" || record.apply.state === "failed") {
        return {
          action: "fail",
          reason: `unrecoverable-apply-${record.apply.state}`,
        };
      }
    }
    if (!this.resolveBackendForRun(record)) {
      return { action: "waiting", reason: "missing-backend-config" };
    }
    if (
      !normalizeString(record.workflowId) ||
      !(await resolveWorkflow(record.workflowId))
    ) {
      return { action: "fail", reason: "missing-workflow" };
    }
    if (
      isSequenceStepRecord(record) &&
      !getSequenceRunStateByStepRequest(requestId)
    ) {
      return { action: "fail", reason: "missing-sequence-state" };
    }
    if (record.observerState === "detached") {
      if (isWaiting(status)) {
        return { action: "waiting", reason: "observer-detached" };
      }
      if (this.isDetachedRecoveryBackoffActive(record)) {
        return { action: "waiting", reason: "observer-detached-backoff" };
      }
      return { action: "handoff", reason: "observer-detached" };
    }
    if (isWaiting(status)) {
      return { action: "waiting", reason: status };
    }
    return { action: "handoff", reason: status };
  }

  private settleRunRecordAsUnrecoverable(args: {
    record: SkillRunnerRunRecord;
    reason: string;
    source: RecoverySweepSource;
  }) {
    settleSkillRunnerRunAsFailed({
      backendId: args.record.backendId,
      backendType: DEFAULT_BACKEND_TYPE,
      providerId: "skillrunner",
      workflowId: args.record.workflowId,
      runId: args.record.workflowRunId,
      jobId: args.record.jobId,
      requestId: args.record.requestId || "",
      reason: `SkillRunner recovery failed: ${args.reason}`,
      source: `recovery-handoff:${args.source}`,
    });
    appendRuntimeLog({
      level: "warn",
      scope: "job",
      workflowId: args.record.workflowId,
      backendId: args.record.backendId,
      backendType: DEFAULT_BACKEND_TYPE,
      providerId: "skillrunner",
      runId: args.record.workflowRunId,
      jobId: args.record.jobId,
      requestId: args.record.requestId,
      component: "skillrunner-recovery",
      operation: "recovery-run-unrecoverable",
      phase: args.source,
      stage: "recovery-run-unrecoverable",
      message: "skillrunner run cannot be handed off to foreground recovery",
      details: {
        reason: args.reason,
        applyState: args.record.apply.state,
        status: args.record.status,
      },
    });
  }

  private async handoffRunRecord(args: {
    record: SkillRunnerRunRecord;
    source: RecoverySweepSource;
  }) {
    const key = this.recoveryKey(args.record);
    if (this.recoveryInFlightKeys.has(key)) {
      return;
    }
    this.recoveryInFlightKeys.add(key);
    try {
      const backend = this.resolveBackendForRun(args.record);
      if (!backend) {
        appendRuntimeLog({
          level: "warn",
          scope: "job",
          workflowId: args.record.workflowId,
          backendId: args.record.backendId,
          backendType: DEFAULT_BACKEND_TYPE,
          providerId: "skillrunner",
          runId: args.record.workflowRunId,
          jobId: args.record.jobId,
          requestId: args.record.requestId,
          component: "skillrunner-recovery",
          operation: "recovery-handoff-skipped",
          phase: args.source,
          stage: "missing-backend-config",
          message: "skillrunner recovery handoff skipped because backend config is unavailable",
        });
        return;
      }
      if (args.record.observerState === "detached") {
        this.markDetachedRecoveryBackoff(args.record);
      }
      const outcome = await continueSkillRunnerForegroundRun({
        backend,
        record: args.record,
        requestId: args.record.requestId || "",
        source: recoveryContinuationSource(args.source),
        uiFocusPolicy: "none",
      });
      if (
        args.record.observerState === "detached" &&
        !(
          outcome.status === "waiting" &&
          outcome.result.detachReason === "observer_failure"
        )
      ) {
        this.detachedRecoveryBackoffUntil.delete(key);
      }
    } finally {
      this.recoveryInFlightKeys.delete(key);
    }
  }

  private spawnBackendRecoverySweep(args: {
    backendId: string;
    generation: number;
  }) {
    const backendId = normalizeString(args.backendId);
    const key = `${args.generation}:${backendId}`;
    if (!backendId || this.backendRecoverySweepInFlightKeys.has(key)) {
      return;
    }
    this.backendRecoverySweepInFlightKeys.add(key);
    this.spawnBackgroundTask(
      "backend-recovery-sweep",
      args.generation,
      async () => {
        try {
          await this.runRecoverySweep({
            source: "backend-healthy",
            backendId,
            generation: args.generation,
          });
        } finally {
          this.backendRecoverySweepInFlightKeys.delete(key);
        }
      },
    );
  }

  private async runRecoverySweep(args: {
    source: RecoverySweepSource;
    backendId?: string;
    generation?: number;
  }) {
    if (
      typeof args.generation === "number" &&
      !this.isGenerationActive(args.generation)
    ) {
      return;
    }
    const targetBackendId = normalizeString(args.backendId);
    let scanned = 0;
    let handedOff = 0;
    let waiting = 0;
    let failed = 0;
    for (const record of listSkillRunnerRunRecords({
      backendId: targetBackendId || undefined,
    })) {
      if (
        typeof args.generation === "number" &&
        !this.isGenerationActive(args.generation)
      ) {
        return;
      }
      if (
        targetBackendId &&
        normalizeString(record.backendId) !== targetBackendId
      ) {
        continue;
      }
      scanned += 1;
      registerSkillRunnerBackendForHealthTracking(record.backendId);
      const decision = await this.resolveRecoveryDecision(record);
      if (decision.action === "skip") {
        continue;
      }
      if (decision.action === "fail") {
        failed += 1;
        this.settleRunRecordAsUnrecoverable({
          record,
          reason: decision.reason,
          source: args.source,
        });
        continue;
      }
      if (decision.action === "waiting") {
        waiting += 1;
        const observerDetached = decision.reason.startsWith(
          "observer-detached",
        );
        appendRuntimeLog({
          level: "info",
          scope: "job",
          workflowId: record.workflowId,
          backendId: record.backendId,
          backendType: DEFAULT_BACKEND_TYPE,
          providerId: "skillrunner",
          runId: record.workflowRunId,
          jobId: record.jobId,
          requestId: record.requestId,
          component: "skillrunner-recovery",
          operation: "recovery-waiting-detached",
          phase: args.source,
          stage: "recovery-waiting-detached",
          message: "waiting SkillRunner run restored without polling",
          details: {
            status: record.status,
            reason: decision.reason,
          },
        });
        if (observerDetached) {
          continue;
        }
        const backend = this.resolveBackendForRun(record);
        if (!backend) {
          continue;
        }
        maybeObserveSkillRunnerAutoReplyRun({
          backend,
          requestId: record.requestId || "",
          record,
          source: `recovery-waiting:${args.source}`,
        });
        continue;
      }
      handedOff += 1;
      await this.handoffRunRecord({
        record,
        source: args.source,
      });
    }
    appendRuntimeLog({
      level: "info",
      scope: "workflow-trigger",
      backendId: targetBackendId || undefined,
      backendType: "skillrunner",
      providerId: "skillrunner",
      component: "skillrunner-recovery",
      operation: "recovery-sweep-finished",
      phase: args.source,
      stage: "recovery-sweep-finished",
      message: "skillrunner recovery sweep finished",
      details: {
        source: args.source,
        scanned,
        handedOff,
        waiting,
        failed,
      },
    });
  }

  private handleBackendHealthChange = (
    backendIdRaw: string,
    state: {
      reachable: boolean;
      status?: string;
    },
  ) => {
    const backendId = normalizeString(backendIdRaw);
    if (!backendId) {
      return;
    }
    if (!state.reachable || state.status === "disabled") {
      if (state.status === "disabled") {
        this.backendWasFlagged.delete(backendId);
      } else {
        this.backendWasFlagged.add(backendId);
      }
      return;
    }
    if (!this.backendWasFlagged.has(backendId)) {
      return;
    }
    this.backendWasFlagged.delete(backendId);
    if (!this.running) {
      return;
    }
    this.spawnBackendRecoverySweep({
      backendId,
      generation: this.runGeneration,
    });
  };

  start() {
    if (this.running) {
      return;
    }
    this.running = true;
    this.runGeneration += 1;
    this.backendWasFlagged.clear();
    for (const state of listSkillRunnerBackendHealthStates()) {
      if (!state.reachable && state.status !== "disabled") {
        this.backendWasFlagged.add(state.backendId);
      }
    }
    this.unsubscribeBackendHealth = subscribeSkillRunnerBackendHealth(
      this.handleBackendHealthChange,
    );
  }

  stop() {
    this.running = false;
    this.runGeneration += 1;
    if (this.unsubscribeBackendHealth) {
      this.unsubscribeBackendHealth();
      this.unsubscribeBackendHealth = undefined;
    }
    stopAllSkillRunnerSessionSync();
  }

  async resetForTests() {
    this.stop();
    await this.drainInFlightTasks();
    this.recoveryInFlightKeys.clear();
    this.backendRecoverySweepInFlightKeys.clear();
    this.detachedRecoveryBackoffUntil.clear();
    this.backendWasFlagged.clear();
    setSkillRunnerBackendReconcileFailureToastEmitterForTests();
    setSkillRunnerTaskLifecycleToastEmitterForTests();
  }

  getRuntimeSnapshotForTests() {
    return {
      running: this.running,
      timerActive: false,
      contextCount: 0,
      pendingPromptCount: 0,
      inFlightTaskCount: this.inflightTasks.size,
      recoveryInFlightCount: this.recoveryInFlightKeys.size,
      backendRecoverySweepInFlightCount:
        this.backendRecoverySweepInFlightKeys.size,
      flaggedBackendCount: this.backendWasFlagged.size,
    };
  }

  purgeBackendContexts(_backendIdRaw: string) {
    return 0;
  }

  purgeRequestContext(args: { backendId?: string; requestId: string }) {
    const backendId = normalizeString(args.backendId);
    const requestId = normalizeString(args.requestId);
    stopSessionSync({
      backendId,
      requestId,
    });
    if (!requestId) {
      return 0;
    }
    const removedTasks = removeWorkflowTasksByBackendAndRequestIds({
      backendId,
      requestIds: [requestId],
    });
    const archivedRun = archiveSkillRunnerRunRecordByRequest({
      backendId,
      requestId,
    });
    return removedTasks + (archivedRun ? 1 : 0);
  }

  async reconcileMissingContextOnce(args?: {
    backendId?: string;
    source?: RecoverySweepSource;
  }) {
    await this.runRecoverySweep({
      source: args?.source || "manual",
      backendId: args?.backendId,
    });
  }

  async drain() {
    await this.drainInFlightTasks();
  }
}

const defaultReconciler = new SkillRunnerTaskReconciler();

export function startSkillRunnerTaskReconciler() {
  defaultReconciler.start();
}

export function stopSkillRunnerTaskReconciler() {
  defaultReconciler.stop();
}

export async function drainSkillRunnerTaskReconciler() {
  await defaultReconciler.drain();
}

export async function shutdownSkillRunnerTaskReconciler() {
  defaultReconciler.stop();
  await defaultReconciler.drain();
}

export async function resetSkillRunnerTaskReconcilerForTests() {
  await defaultReconciler.resetForTests();
}

export function getSkillRunnerTaskReconcilerRuntimeForTests() {
  return defaultReconciler.getRuntimeSnapshotForTests();
}

export async function reconcileSkillRunnerMissingContextOnce(args?: {
  backendId?: string;
  source?: RecoverySweepSource;
}) {
  await defaultReconciler.reconcileMissingContextOnce(args);
}

export function purgeSkillRunnerBackendReconcileState(backendIdRaw: string) {
  const backendId = normalizeString(backendIdRaw);
  if (!backendId) {
    return {
      backendId,
      removedContexts: 0,
      removedActive: 0,
      removedHistory: 0,
      removedRuns: 0,
    };
  }
  const requestIdSet = new Set<string>();
  for (const row of listActiveWorkflowTaskSummaries({ backendId })) {
    if (normalizeString(row.backendId) !== backendId) {
      continue;
    }
    const requestId = normalizeString(row.requestId);
    if (requestId) {
      requestIdSet.add(requestId);
    }
  }
  for (const row of listTaskDashboardHistory({ backendId })) {
    const requestId = normalizeString(row.requestId);
    if (requestId) {
      requestIdSet.add(requestId);
    }
  }
  for (const record of listSkillRunnerRunRecords({ backendId })) {
    if (normalizeString(record.backendId) !== backendId) {
      continue;
    }
    const requestId = normalizeString(record.requestId);
    if (requestId) {
      requestIdSet.add(requestId);
    }
  }
  const requestIds = Array.from(requestIdSet.values());
  const removedActive = removeWorkflowTasksByBackendAndRequestIds({
    backendId,
    requestIds,
  });
  const removedHistory = removeTaskDashboardHistoryByBackendAndRequestIds({
    backendId,
    requestIds,
  });
  const removedRuns = deleteSkillRunnerRunRecordsByBackend(backendId);
  return {
    backendId,
    removedContexts: 0,
    removedActive,
    removedHistory,
    removedRuns,
  };
}

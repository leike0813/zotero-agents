import { JobQueueManager, type JobRecord } from "../../jobQueue/manager";
import { executeWithProvider } from "../../providers/registry";
import {
  ACP_SKILL_RUN_REQUEST_KIND,
  ACP_BACKEND_TYPE,
  DEFAULT_BACKEND_TYPE,
  SKILLRUNNER_SEQUENCE_REQUEST_KIND,
} from "../../config/defaults";
import { appendRuntimeLog } from "../runtimeLogManager";
import { recordWorkflowTaskUpdate } from "../taskRuntime";
import { recordTaskDashboardHistoryFromJob } from "../taskDashboardHistory";
import { openAssistantWorkspaceSidebar } from "../assistantWorkspaceSidebar";
import { focusSkillRunnerWorkspace } from "../skillRunnerRunDialog";
import { subscribeAcpSkillRunWorkspaceChanges } from "../acpSkillRunStore";
import { requestAcpSkillRunForeground } from "../acpSkillRunForeground";
import type { BuiltPreparedWorkflowUnit, WorkflowRunState } from "./contracts";
import {
  resolveInputUnitIdentityFromRequest,
  resolveInputUnitLabelFromRequest,
  resolveTargetParentIDFromRequest,
  resolveTaskNameFromRequest,
} from "./requestMeta";
import { resolveWorkflowDispatchConcurrency } from "./runConcurrency";
import {
  executeSkillRunnerSequence,
  type ApplySequenceStepResult,
} from "./sequenceRuntime";
import type { SkillRunnerSequenceRequestV1 } from "../../providers/contracts";
import type { WorkflowSubmissionQueueExecutionContext } from "../../jobQueue/workflowSubmissionQueueContracts";
import type {
  ProviderOrchestrationContext,
  ProviderProgressEvent,
} from "../../providers/types";
import { localizeWorkflowLabel } from "../../workflows/localization";
import type { LoadedWorkflow } from "../../workflows/types";
import { getLoadedWorkflowEntries } from "../workflowRuntime";
import { executeSequenceStepApply } from "./sequenceStepApply";
import { acpSequenceStepLifecycle } from "./acpSequenceStepLifecycle";
import { resolveSkillRunnerExecutionModeFromRequest } from "../skillRunnerExecutionMode";
import {
  mapSkillRunnerProgressLifecycle,
  mapSkillRunnerSubmitPhase,
} from "../skillRunnerProgressMapping";
import { maybeObserveSkillRunnerAutoReplyRun } from "../skillRunnerAutoReplyObserver";
import { buildSkillRunnerRunRecordRequestPayload } from "../skillRunnerInteractiveAutoReply";
import { resolveSkillRunnerSkillDisplay } from "../skillRunnerSubmissionContext";
import {
  applySkillRunnerRunEvent,
  buildSkillRunnerSequenceRunKey,
  buildSkillRunnerSingleRunKey,
  getSkillRunnerRunProjection,
  getSkillRunnerRunRecord,
  registerSkillRunnerSkillDisplaySnapshot,
  subscribeSkillRunnerRunStore,
} from "../skillRunnerRunStore";
import { subscribeSequenceRunStateStore } from "./sequenceStateStore";
import { isDebugModeEnabled } from "../debugMode";
import { resolveWorkflowJobTerminalResolution } from "./terminalResolution";
import {
  beginAcpRuntimeSemanticTraceClaimAttempt,
  claimAcpRuntimeSemanticTraceRoot,
  finishAcpRuntimeSemanticTraceRoot,
  settleAcpRuntimeSemanticTraceOpenRequests,
} from "../acpRuntimeSemanticTraceRecorder";
import { selectAcpSkillRun } from "../acpSkillRunWorkspaceSelection";

type RunSeamDeps = {
  createQueue: (
    config: ConstructorParameters<typeof JobQueueManager>[0],
  ) => JobQueueManager;
  executeWithProvider: typeof executeWithProvider;
  appendRuntimeLog: typeof appendRuntimeLog;
  recordWorkflowTaskUpdate: typeof recordWorkflowTaskUpdate;
  recordTaskDashboardHistoryFromJob: typeof recordTaskDashboardHistoryFromJob;
  openAssistantWorkspaceSidebar: typeof openAssistantWorkspaceSidebar;
  focusSkillRunnerWorkspace: typeof focusSkillRunnerWorkspace;
  selectAcpSkillRun: (requestId: string) => void | Promise<void>;
  getLoadedWorkflowEntries: typeof getLoadedWorkflowEntries;
  executeSequenceStepApply: typeof executeSequenceStepApply;
  resolveWorkflowJobTerminalResolution: typeof resolveWorkflowJobTerminalResolution;
};

const defaultRunSeamDeps: RunSeamDeps = {
  createQueue: (config) => new JobQueueManager(config),
  executeWithProvider,
  appendRuntimeLog,
  recordWorkflowTaskUpdate,
  recordTaskDashboardHistoryFromJob,
  openAssistantWorkspaceSidebar,
  focusSkillRunnerWorkspace,
  selectAcpSkillRun,
  getLoadedWorkflowEntries,
  executeSequenceStepApply,
  resolveWorkflowJobTerminalResolution,
};

function findWorkflowById(workflows: LoadedWorkflow[], workflowId: string) {
  const normalized = String(workflowId || "").trim();
  if (!normalized) {
    return null;
  }
  return workflows.find((entry) => entry.manifest.id === normalized) || null;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeSequenceStepIndex(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : undefined;
}

function resolveSkillIdFromRequest(request: unknown) {
  return isRecord(request) ? normalizeText(request.skill_id) : "";
}

function requestSkillRunnerSubmitFocus(args: {
  resolved: RunSeamDeps;
  skillrunnerMode?: unknown;
  taskRecord?: ReturnType<typeof recordWorkflowTaskUpdate> | null;
}) {
  const runKey = normalizeText(args.taskRecord?.runKey);
  if (!runKey) {
    return;
  }
  const focusPayload = {
    runKey,
    selectionChanged: true,
  };
  if (normalizeText(args.skillrunnerMode) === "interactive") {
    void args.resolved.openAssistantWorkspaceSidebar({
      tab: "skillrunner",
      runKey,
    });
    return;
  }
  void args.resolved.focusSkillRunnerWorkspace(focusPayload);
}

function maybeObserveSkillRunnerAutoReplyJob(args: {
  backend: BuiltPreparedWorkflowUnit["executionContext"]["backend"];
  job: JobRecord;
  source: string;
}) {
  const requestId = normalizeText(
    args.job.meta.requestId ||
      (args.job.result as { requestId?: unknown } | undefined)?.requestId,
  );
  if (!requestId || normalizeText(args.job.state) !== "waiting_user") {
    return;
  }
  maybeObserveSkillRunnerAutoReplyRun({
    backend: args.backend,
    requestId,
    source: args.source,
  });
}

function resolveSkillRunnerFetchTypeFromRequest(request: unknown) {
  if (!isRecord(request)) {
    return undefined;
  }
  return request.fetch_type === "result"
    ? "result"
    : request.fetch_type === "bundle"
      ? "bundle"
      : undefined;
}

function executionModeFromRequest(request: unknown) {
  return resolveSkillRunnerExecutionModeFromRequest(request, "auto") ===
    "interactive"
    ? "interactive"
    : "auto";
}

function applySkillRunnerProgressEvent(args: {
  runKey: string;
  backendId: string;
  event: ProviderProgressEvent;
  updatedAt: string;
}) {
  const event = args.event as Record<string, unknown>;
  const type = normalizeText(event.type);
  const requestId = normalizeText(event.requestId);
  const existing = getSkillRunnerRunRecord(args.runKey);
  if (type === "request-created") {
    return applySkillRunnerRunEvent({
      type: "request.created",
      runKey: args.runKey,
      backendId: args.backendId,
      requestId,
      updatedAt: args.updatedAt,
    });
  }
  if (type === "request-creating" || type === "sequence-step-started") {
    return applySkillRunnerRunEvent({
      type: "submit.request_creating",
      runKey: args.runKey,
      backendId: args.backendId,
      requestId,
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "request-uploading") {
    return applySkillRunnerRunEvent({
      type: "submit.uploading",
      runKey: args.runKey,
      backendId: args.backendId,
      requestId,
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "request-ready") {
    return applySkillRunnerRunEvent({
      type: "request.ready",
      runKey: args.runKey,
      backendId: args.backendId,
      requestId,
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "sequence-step-deferred") {
    if (normalizeText(event.detachReason) === "observer_failure") {
      return applySkillRunnerRunEvent({
        type: "run.observer_detached",
        runKey: args.runKey,
        backendId: args.backendId,
        requestId: normalizeText(event.requestId) || existing?.requestId,
        error: normalizeText(event.error) || "observer failure",
        source: "sequence-step-deferred",
        updatedAt: args.updatedAt,
      });
    }
    return applySkillRunnerRunEvent({
      type: "backend.snapshot",
      runKey: args.runKey,
      backendId: args.backendId,
      state:
        normalizeText(event.backendStatus) === "queued" ||
        normalizeText(event.backendStatus) === "waiting_user" ||
        normalizeText(event.backendStatus) === "waiting_auth"
          ? (normalizeText(event.backendStatus) as any)
          : "running",
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "sequence-step-succeeded") {
    return applySkillRunnerRunEvent({
      type: "sequence.step.settled",
      runKey: args.runKey,
      backendId: args.backendId,
      requestId,
      status: "succeeded",
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "sequence-step-failed") {
    return applySkillRunnerRunEvent({
      type: "sequence.step.settled",
      runKey: args.runKey,
      backendId: args.backendId,
      requestId,
      status: "failed",
      error: normalizeText(event.error) || undefined,
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  if (type === "sequence-step-canceled") {
    return applySkillRunnerRunEvent({
      type: "sequence.step.settled",
      runKey: args.runKey,
      backendId: args.backendId,
      requestId,
      status: "canceled",
      updatedAt: args.updatedAt,
      payload: event,
    });
  }
  return applySkillRunnerRunEvent({
    type: "backend.snapshot",
    runKey: args.runKey,
    backendId: args.backendId,
    state: existing?.status || "running",
    updatedAt: args.updatedAt,
    payload: event,
  });
}

function recordSingleSkillRunnerProgress(args: {
  job: JobRecord;
  event: ProviderProgressEvent;
  workflowRunId: string;
}) {
  const runKey = buildSkillRunnerSingleRunKey({
    workflowRunId: args.workflowRunId,
    jobId: args.job.id,
  });
  if (!runKey) {
    return null;
  }
  return applySkillRunnerProgressEvent({
    runKey,
    backendId: normalizeText(args.job.meta.backendId),
    event: args.event,
    updatedAt: new Date().toISOString(),
  });
}

function recordSequenceStepSkillRunnerProgress(args: {
  event: ProviderProgressEvent;
  workflowId: string;
  backendId: string;
  providerOptions?: Record<string, unknown>;
  submissionId?: string;
  submissionUnitId?: string;
}) {
  const eventRecord = args.event as Record<string, unknown>;
  const workflowRunId = normalizeText(eventRecord.workflowRunId);
  const sequenceJobId = normalizeText(eventRecord.sequenceJobId);
  const sequenceStepId = normalizeText(eventRecord.sequenceStepId);
  const runKey = buildSkillRunnerSequenceRunKey({
    workflowRunId,
    sequenceJobId,
    sequenceStepId,
  });
  if (!runKey || !workflowRunId || !sequenceJobId || !sequenceStepId) {
    return null;
  }
  const stepRequest = isRecord(eventRecord.sequenceStepRequest)
    ? eventRecord.sequenceStepRequest
    : {};
  const created = applySkillRunnerRunEvent({
    type: "submit.local_created",
    backendId: args.backendId,
    init: {
      runKey,
      backendId: args.backendId,
      workflowId: args.workflowId,
      workflowRunId,
      submissionId: args.submissionId,
      submissionUnitId: args.submissionUnitId,
      jobId: `${sequenceJobId}:${sequenceStepId}`,
      taskName:
        normalizeText(eventRecord.sequenceStepTaskName) ||
        `${args.workflowId} / ${sequenceStepId}`,
      skillId:
        normalizeText(eventRecord.sequenceStepSkillId) ||
        resolveSkillIdFromRequest(stepRequest) ||
        undefined,
      sequenceRunId: workflowRunId,
      sequenceJobId,
      sequenceStepId,
      requestPayload: buildSkillRunnerRunRecordRequestPayload({
        request: stepRequest,
        providerOptions: args.providerOptions,
      }),
      fetchType: resolveSkillRunnerFetchTypeFromRequest(stepRequest),
      executionMode: executionModeFromRequest(stepRequest),
    },
  });
  if (!created) {
    return null;
  }
  return (
    applySkillRunnerProgressEvent({
      runKey,
      backendId: args.backendId,
      event: args.event,
      updatedAt: new Date().toISOString(),
    }) || created
  );
}

function observeWorkflowRunTerminal(args: {
  queue: JobQueueManager;
  jobIds: ReadonlyArray<string>;
  runId: string;
  idlePromise: Promise<void>;
  submissionLineage?: WorkflowSubmissionQueueExecutionContext;
  resolveTerminal: typeof resolveWorkflowJobTerminalResolution;
}) {
  return new Promise<void>((resolve) => {
    if (
      typeof (args.queue as JobQueueManager & { getJob?: unknown }).getJob !==
      "function"
    ) {
      void args.idlePromise.then(resolve, resolve);
      return;
    }
    let settled = false;
    let removeSkillRunnerSubscription: () => void = () => {};
    let removeAcpSubscription: () => void = () => {};
    let removeSequenceSubscription: () => void = () => {};
    const cleanup = () => {
      removeSkillRunnerSubscription();
      removeAcpSubscription();
      removeSequenceSubscription();
    };
    const settle = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    };
    const check = () => {
      const observations = args.jobIds.map((jobId) =>
        args.resolveTerminal({
          queue: args.queue,
          workflowRunId: args.runId,
          jobId,
        }),
      );
      if (args.submissionLineage) {
        const statuses = observations.map(
          (observation) => observation.slotStatus,
        );
        if (statuses.some((status) => status === "waiting_user")) {
          args.submissionLineage.slot.yield("waiting-user");
        } else if (statuses.some((status) => status === "waiting_auth")) {
          args.submissionLineage.slot.yield("waiting-auth");
        } else if (statuses.some((status) => status === "failed_retriable")) {
          args.submissionLineage.slot.yield("recoverable-failure");
        } else if (
          statuses.some(
            (status) => status === "running" || status === "repairing",
          ) &&
          args.submissionLineage.slot.snapshot()?.state === "yielded"
        ) {
          void args.submissionLineage.slot.ensureSlot("remote-resume");
        }
      }
      if (
        !settled &&
        observations.every((observation) => observation.kind !== "pending")
      ) {
        settle();
      }
    };

    removeSkillRunnerSubscription = subscribeSkillRunnerRunStore(check);
    removeAcpSubscription = subscribeAcpSkillRunWorkspaceChanges(() => check());
    removeSequenceSubscription = subscribeSequenceRunStateStore(
      (sequenceRunId) => {
        if (
          args.jobIds.some(
            (jobId) => sequenceRunId === `${args.runId}-${jobId}`,
          )
        ) {
          check();
        }
      },
    );
    void args.idlePromise.then(check, check);
    check();
  });
}

export function runWorkflowExecutionSeam(
  args: {
    prepared: BuiltPreparedWorkflowUnit;
    submissionLineage?: WorkflowSubmissionQueueExecutionContext;
  },
  deps: Partial<RunSeamDeps> = {},
): WorkflowRunState {
  const resolved = {
    ...defaultRunSeamDeps,
    ...deps,
  };
  const runId = `run-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const workflowLabel = localizeWorkflowLabel(args.prepared.workflow);
  registerSkillRunnerSkillDisplaySnapshot(args.prepared.skillDisplayById);
  const dispatchConcurrency = resolveWorkflowDispatchConcurrency({
    providerId: args.prepared.executionContext.providerId,
    requestCount: args.prepared.requests.length,
  });
  let workflowTraceClaim:
    | ReturnType<typeof claimAcpRuntimeSemanticTraceRoot>
    | undefined;
  if (
    __acp_runtime_semantic_trace_recorder_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__) &&
    args.prepared.executionContext.backend.type === ACP_BACKEND_TYPE &&
    (args.prepared.executionContext.requestKind ===
      ACP_SKILL_RUN_REQUEST_KIND ||
      args.prepared.executionContext.requestKind ===
        SKILLRUNNER_SEQUENCE_REQUEST_KIND) &&
    args.prepared.requests.length > 0
  ) {
    const attempt = beginAcpRuntimeSemanticTraceClaimAttempt(
      "acp-workflow-execution",
    );
    if (attempt) {
      workflowTraceClaim = claimAcpRuntimeSemanticTraceRoot({
        attempt,
        binding: {
          sourceKind: "acp-workflow-execution",
          workflowId: args.prepared.workflow.manifest.id,
          workflowRunId: runId,
        },
        owner: {
          rootId: runId,
          workflowId: args.prepared.workflow.manifest.id,
          workflowRunId: runId,
        },
        payload: { workflowLabel },
      });
    }
  }
  const queue = resolved.createQueue({
    concurrency: dispatchConcurrency,
    executeJob: async (job, runtime) => {
      let traceContext: Awaited<
        ReturnType<typeof claimAcpRuntimeSemanticTraceRoot>
      >;
      if (
        __acp_runtime_semantic_trace_recorder_enabled__ &&
        (typeof __debug_mode__ === "undefined"
          ? isDebugModeEnabled()
          : __debug_mode__) &&
        workflowTraceClaim
      ) {
        traceContext = await workflowTraceClaim;
      }
      if (
        args.prepared.executionContext.requestKind ===
        SKILLRUNNER_SEQUENCE_REQUEST_KIND
      ) {
        const backendType = normalizeText(
          args.prepared.executionContext.backend.type,
        );
        const applySequenceStepResult: ApplySequenceStepResult | undefined =
          backendType === "acp" || backendType === DEFAULT_BACKEND_TYPE
            ? async (stepApply) => {
                const applyWorkflow = findWorkflowById(
                  resolved.getLoadedWorkflowEntries(),
                  stepApply.applyWorkflowId,
                );
                if (!applyWorkflow) {
                  throw new Error(
                    `sequence step apply workflow not found: ${stepApply.applyWorkflowId}`,
                  );
                }
                const parent =
                  resolveTargetParentIDFromRequest(stepApply.sequenceRequest) ||
                  null;
                return resolved.executeSequenceStepApply({
                  workflow: applyWorkflow,
                  parent,
                  request: stepApply.stepRequest,
                  runResult: {
                    ...stepApply.stepResult,
                    resultJson: stepApply.output,
                    backendId:
                      String(
                        args.prepared.executionContext.backend.id || "",
                      ).trim() || undefined,
                    backendType:
                      String(
                        args.prepared.executionContext.backend.type || "",
                      ).trim() || undefined,
                    runId,
                    sequence: {
                      workflow_run_id: stepApply.workflowRunId,
                      final_step_id: stepApply.sequenceRequest.final_step_id,
                      steps: stepApply.sequenceSteps,
                    },
                  },
                  sequenceStep: {
                    id: stepApply.step.id,
                    index: stepApply.stepIndex,
                    workflowId: stepApply.applyWorkflowId,
                    skillId: stepApply.step.skill_id,
                    finalStep: stepApply.finalStep,
                    phase: "sequence-step",
                  },
                  runtime: args.prepared.runtime,
                });
              }
            : undefined;
        const sequenceTraceContext: Pick<
          ProviderOrchestrationContext,
          "parentWorkflowRunId" | "semanticTraceContext"
        > = {};
        if (
          __acp_runtime_semantic_trace_recorder_enabled__ &&
          (typeof __debug_mode__ === "undefined"
            ? isDebugModeEnabled()
            : __debug_mode__) &&
          traceContext
        ) {
          sequenceTraceContext.parentWorkflowRunId = runId;
          sequenceTraceContext.semanticTraceContext = traceContext;
        }
        return executeSkillRunnerSequence({
          request: job.request as SkillRunnerSequenceRequestV1,
          backend: args.prepared.executionContext.backend,
          providerOptions: args.prepared.executionContext.providerOptions,
          skillDisplayById: args.prepared.skillDisplayById,
          workflowId: args.prepared.workflow.manifest.id,
          workflowLabel,
          workflowRunId: `${runId}-${job.id}`,
          jobId: job.id,
          submissionId: args.submissionLineage?.submissionId,
          submissionUnitId: args.submissionLineage?.submissionUnitId,
          executeWithProvider: resolved.executeWithProvider,
          applySequenceStepResult,
          appendRuntimeLog: resolved.appendRuntimeLog,
          lifecycle:
            backendType === ACP_BACKEND_TYPE
              ? acpSequenceStepLifecycle
              : undefined,
          ...sequenceTraceContext,
          onProgress: (event) => {
            runtime.reportProgress(event);
          },
        });
      }
      const orchestrationContext: ProviderOrchestrationContext = {
        workflowId: args.prepared.workflow.manifest.id,
        workflowLabel,
        workflowRunId: runId,
        jobId: job.id,
        submissionId: args.submissionLineage?.submissionId,
        submissionUnitId: args.submissionLineage?.submissionUnitId,
      };
      if (
        __acp_runtime_semantic_trace_recorder_enabled__ &&
        (typeof __debug_mode__ === "undefined"
          ? isDebugModeEnabled()
          : __debug_mode__) &&
        traceContext
      ) {
        orchestrationContext.parentWorkflowRunId = runId;
        orchestrationContext.semanticTraceContext = traceContext;
      }
      return resolved.executeWithProvider({
        requestKind: args.prepared.executionContext.requestKind,
        request: job.request,
        backend: args.prepared.executionContext.backend,
        providerOptions: args.prepared.executionContext.providerOptions,
        orchestrationContext,
        onProgress: (event) => {
          runtime.reportProgress(event);
        },
      });
    },
    onJobProgress: (job, event) => {
      const isRequestCreating = event.type === "request-creating";
      const isRequestCreated = event.type === "request-created";
      const isRequestUploading = event.type === "request-uploading";
      const isRequestReady = event.type === "request-ready";
      const executionContext = args.prepared.executionContext;
      const backendType = String(executionContext.backend.type || "").trim();
      const isSkillRunnerSequence =
        executionContext.requestKind === SKILLRUNNER_SEQUENCE_REQUEST_KIND &&
        backendType === "skillrunner";
      if (isSkillRunnerSequence && normalizeText(event.sequenceStepId)) {
        const runRecord = recordSequenceStepSkillRunnerProgress({
          event,
          workflowId: args.prepared.workflow.manifest.id,
          backendId: executionContext.backend.id,
          providerOptions: executionContext.providerOptions,
          submissionId: args.submissionLineage?.submissionId,
          submissionUnitId: args.submissionLineage?.submissionUnitId,
        });
        if (runRecord?.requestId && runRecord.status === "waiting_user") {
          maybeObserveSkillRunnerAutoReplyRun({
            backend: executionContext.backend,
            requestId: runRecord.requestId,
            record: runRecord,
            source: "workflowExecution.runSeam.sequence-waiting",
          });
        }
        if (runRecord && isRequestCreated) {
          const projection = getSkillRunnerRunProjection(runRecord.runKey);
          if (projection) {
            requestSkillRunnerSubmitFocus({
              resolved,
              skillrunnerMode: resolveSkillRunnerExecutionModeFromRequest(
                isRecord((event as Record<string, unknown>).sequenceStepRequest)
                  ? (event as Record<string, unknown>).sequenceStepRequest
                  : {},
                "auto",
              ),
              taskRecord: projection,
            });
          }
        }
        return;
      }
      if (
        isRequestCreating ||
        isRequestCreated ||
        isRequestUploading ||
        isRequestReady
      ) {
        const lifecycle = mapSkillRunnerProgressLifecycle(event);
        const submitPhase = mapSkillRunnerSubmitPhase(event);
        if (lifecycle) {
          job.meta.skillRunnerLifecycleState = lifecycle;
        }
        if (submitPhase) {
          job.meta.skillRunnerSubmitPhase = submitPhase;
          job.meta.skillRunnerSubmitStartedAt =
            job.meta.skillRunnerSubmitStartedAt || job.createdAt;
        }
        const requestId = String(event.requestId || "").trim();
        if (requestId) {
          job.meta.requestId = requestId;
        }
        if (isRequestReady) {
          job.meta.skillRunnerRequestReady = true;
        }
        const requestIndex =
          typeof job.meta.index === "number" && Number.isFinite(job.meta.index)
            ? Math.floor(job.meta.index)
            : -1;
        const request =
          requestIndex >= 0 && requestIndex < args.prepared.requests.length
            ? args.prepared.requests[requestIndex]
            : undefined;
        const requestForMode = isRecord(event.sequenceStepRequest)
          ? event.sequenceStepRequest
          : request;
        if (
          executionContext.requestKind === "skillrunner.job.v1" &&
          backendType === "skillrunner"
        ) {
          const runRecord = recordSingleSkillRunnerProgress({
            job,
            event,
            workflowRunId: runId,
          });
          if (isRequestCreating) {
            const projection = runRecord
              ? getSkillRunnerRunProjection(runRecord.runKey)
              : null;
            requestSkillRunnerSubmitFocus({
              resolved,
              skillrunnerMode: resolveSkillRunnerExecutionModeFromRequest(
                requestForMode,
                "auto",
              ),
              taskRecord: projection || undefined,
            });
          }
        }
        const isAcpSkillRun =
          executionContext.requestKind === ACP_SKILL_RUN_REQUEST_KIND ||
          executionContext.requestKind === SKILLRUNNER_SEQUENCE_REQUEST_KIND;
        if (isAcpSkillRun && backendType === "acp" && requestId) {
          const sequenceStepId = normalizeText(event.sequenceStepId);
          const sequenceWorkflowRunId = normalizeText(
            (event as Record<string, unknown>).workflowRunId,
          );
          const sequenceJobId = normalizeText(
            (event as Record<string, unknown>).sequenceJobId,
          );
          const sequenceStepTaskName = normalizeText(
            (event as Record<string, unknown>).sequenceStepTaskName,
          );
          const sequenceFinalStepId = normalizeText(
            (event as Record<string, unknown>).sequenceFinalStepId,
          );
          const isSequenceStep =
            executionContext.requestKind ===
              SKILLRUNNER_SEQUENCE_REQUEST_KIND && !!sequenceStepId;
          requestAcpSkillRunForeground({
            requestId,
            backend: executionContext.backend,
            workflowId: args.prepared.workflow.manifest.id,
            workflowLabel: localizeWorkflowLabel(args.prepared.workflow),
            jobId:
              isSequenceStep && sequenceJobId
                ? `${sequenceJobId}:${sequenceStepId}`
                : job.id,
            runId:
              (isSequenceStep ? sequenceWorkflowRunId : "") ||
              String(job.meta.runId || "").trim() ||
              undefined,
            sequenceStepId: sequenceStepId || undefined,
            sequenceStepIndex: normalizeSequenceStepIndex(
              event.sequenceStepIndex,
            ),
            sequenceFinalStepId: sequenceFinalStepId || undefined,
            taskName:
              (isSequenceStep ? sequenceStepTaskName : "") ||
              resolveTaskNameFromRequest(requestForMode, requestIndex),
            skillId:
              requestForMode && typeof requestForMode === "object"
                ? String(
                    (requestForMode as { skill_id?: unknown }).skill_id || "",
                  ).trim() || undefined
                : undefined,
            request: requestForMode,
            deps: {
              selectAcpSkillRun: resolved.selectAcpSkillRun,
              openAssistantWorkspaceSidebar:
                resolved.openAssistantWorkspaceSidebar,
            },
          });
        }
      }
    },
    onJobUpdated: (job) => {
      const executionContext = args.prepared.executionContext;
      const backendType = String(executionContext.backend.type || "").trim();
      if (executionContext.requestKind === SKILLRUNNER_SEQUENCE_REQUEST_KIND) {
        return;
      }
      if (
        executionContext.requestKind === "skillrunner.job.v1" &&
        backendType === "skillrunner"
      ) {
        const runKey = buildSkillRunnerSingleRunKey({
          workflowRunId: runId,
          jobId: job.id,
        });
        const requestId = normalizeText(
          job.meta.requestId ||
            (job.result as { requestId?: unknown } | undefined)?.requestId,
        );
        if (
          runKey &&
          (job.state === "succeeded" ||
            job.state === "failed" ||
            job.state === "canceled")
        ) {
          const result = isRecord(job.result) ? job.result : {};
          applySkillRunnerRunEvent({
            type: "backend.terminal",
            runKey,
            backendId: executionContext.backend.id,
            status: job.state as "succeeded" | "failed" | "canceled",
            error: job.error,
            result: {
              resultJson: result.resultJson,
              resultJsonPath: normalizeText(result.resultJsonPath) || undefined,
              workspaceDir: normalizeText(result.workspaceDir) || undefined,
            },
            updatedAt: job.updatedAt,
            payload: {
              source: "workflowExecution.runSeam.onJobUpdated",
              state: job.state,
            },
          });
        } else if (requestId) {
          applySkillRunnerRunEvent({
            type: "backend.snapshot",
            backendId: executionContext.backend.id,
            requestId,
            state: job.state,
            backendStatus: normalizeText(
              (job.result as { backendStatus?: unknown } | undefined)
                ?.backendStatus,
            ) as any,
            error: job.error,
            updatedAt: job.updatedAt,
            payload: {
              source: "workflowExecution.runSeam.onJobUpdated",
              state: job.state,
            },
          });
        }
        maybeObserveSkillRunnerAutoReplyJob({
          backend: executionContext.backend,
          job,
          source: "workflowExecution.runSeam.job-waiting",
        });
        return;
      }
      resolved.recordWorkflowTaskUpdate(job);
      resolved.recordTaskDashboardHistoryFromJob(job);
    },
  });

  const jobIds = args.prepared.requests.map((request, index) => {
    const taskName = resolveTaskNameFromRequest(request, index);
    const inputUnitIdentity = resolveInputUnitIdentityFromRequest(request);
    const inputUnitLabel = resolveInputUnitLabelFromRequest(request, index);
    const inputMemberIdentities =
      args.prepared.unit?.memberIdentities?.length > 0
        ? [...args.prepared.unit.memberIdentities]
        : inputUnitIdentity
          ? [inputUnitIdentity]
          : [];
    const inputMemberCount =
      args.prepared.unit?.memberCount || inputMemberIdentities.length;
    const skillId = resolveSkillIdFromRequest(request);
    const skillDisplay = resolveSkillRunnerSkillDisplay({
      skillDisplayById: args.prepared.skillDisplayById,
      skillId,
    });
    const engine = String(
      args.prepared.executionContext.providerOptions?.engine || "",
    ).trim();
    const jobId = queue.enqueue({
      workflowId: args.prepared.workflow.manifest.id,
      request,
      meta: {
        index,
        runId,
        workflowLabel,
        taskName,
        inputUnitIdentity,
        inputUnitLabel,
        inputMemberIdentities,
        inputMemberCount,
        targetParentID: resolveTargetParentIDFromRequest(request) ?? undefined,
        providerId: args.prepared.executionContext.providerId,
        providerOptions: args.prepared.executionContext.providerOptions,
        executionMode: resolveSkillRunnerExecutionModeFromRequest(
          request,
          "auto",
        ),
        requestKind: args.prepared.executionContext.requestKind,
        backendId: args.prepared.executionContext.backend.id,
        backendType: args.prepared.executionContext.backend.type,
        backendBaseUrl: args.prepared.executionContext.backend.baseUrl,
        skillId: skillId || undefined,
        skillName: skillDisplay.skillName || undefined,
        skillLabel: skillDisplay.skillLabel || undefined,
        engine: engine || undefined,
        submissionId: args.submissionLineage?.submissionId,
        submissionUnitId: args.submissionLineage?.submissionUnitId,
      },
    });
    resolved.appendRuntimeLog({
      level: "info",
      scope: "job",
      workflowId: args.prepared.workflow.manifest.id,
      jobId,
      stage: "job-enqueued",
      message: "job enqueued",
      details: {
        runId,
        index,
        taskName,
      },
    });
    if (
      args.prepared.executionContext.requestKind === "skillrunner.job.v1" &&
      args.prepared.executionContext.backend.type === DEFAULT_BACKEND_TYPE
    ) {
      applySkillRunnerRunEvent({
        type: "submit.local_created",
        backendId: args.prepared.executionContext.backend.id,
        init: {
          backendId: args.prepared.executionContext.backend.id,
          workflowId: args.prepared.workflow.manifest.id,
          workflowRunId: runId,
          submissionId: args.submissionLineage?.submissionId,
          submissionUnitId: args.submissionLineage?.submissionUnitId,
          jobId,
          taskName,
          skillId: skillId || undefined,
          requestPayload: buildSkillRunnerRunRecordRequestPayload({
            request,
            providerOptions: args.prepared.executionContext.providerOptions,
          }),
          fetchType: resolveSkillRunnerFetchTypeFromRequest(request),
          executionMode: executionModeFromRequest(request),
        },
      });
    }
    return jobId;
  });

  const queueIdlePromise = queue.waitForIdle();
  let idlePromise = queueIdlePromise;
  if (
    __acp_runtime_semantic_trace_recorder_enabled__ &&
    (typeof __debug_mode__ === "undefined"
      ? isDebugModeEnabled()
      : __debug_mode__) &&
    workflowTraceClaim
  ) {
    idlePromise = queueIdlePromise.then(async () => {
      const traceContext = await workflowTraceClaim;
      if (!traceContext) return;
      const states = jobIds
        .map((jobId) => queue.getJob(jobId)?.state)
        .filter(Boolean);
      const outcome = states.includes("canceled")
        ? "canceled"
        : states.includes("failed")
          ? "failed"
          : "succeeded";
      await settleAcpRuntimeSemanticTraceOpenRequests({
        context: traceContext,
        payload: { outcome, forced: true, boundary: "workflow-idle" },
      });
      await finishAcpRuntimeSemanticTraceRoot({
        context: traceContext,
        payload: { outcome },
        waitForActivities: true,
      });
    });
  }
  const terminalPromise = observeWorkflowRunTerminal({
    queue,
    jobIds,
    runId,
    idlePromise,
    submissionLineage: args.submissionLineage,
    resolveTerminal: resolved.resolveWorkflowJobTerminalResolution,
  });

  return {
    workflow: args.prepared.workflow,
    unit: args.prepared.unit,
    requests: args.prepared.requests,
    preflight: args.prepared.preflight,
    queue,
    jobIds,
    runId,
    totalJobs:
      jobIds.length +
      (args.prepared.preflight?.shortCircuitApplies.length || 0),
    idlePromise,
    terminalPromise,
    runtime: args.prepared.runtime,
    executionOptions: args.prepared.executionOptions,
  };
}

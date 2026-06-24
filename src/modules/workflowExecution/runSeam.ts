import { JobQueueManager, type JobRecord } from "../../jobQueue/manager";
import { executeWithProvider } from "../../providers/registry";
import {
  ACP_SKILL_RUN_REQUEST_KIND,
  DEFAULT_BACKEND_TYPE,
  SKILLRUNNER_SEQUENCE_REQUEST_KIND,
} from "../../config/defaults";
import { appendRuntimeLog } from "../runtimeLogManager";
import { recordWorkflowTaskUpdate } from "../taskRuntime";
import { recordTaskDashboardHistoryFromJob } from "../taskDashboardHistory";
import { openAssistantWorkspaceSidebar } from "../assistantWorkspaceSidebar";
import { focusSkillRunnerWorkspace } from "../skillRunnerRunDialog";
import { selectAcpSkillRun } from "../acpSkillRunStore";
import { requestAcpSkillRunForeground } from "../acpSkillRunForeground";
import type { PreparedWorkflowExecution, WorkflowRunState } from "./contracts";
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
import type { ProviderProgressEvent } from "../../providers/types";
import { localizeWorkflowLabel } from "../../workflows/localization";
import type { LoadedWorkflow } from "../../workflows/types";
import { getLoadedWorkflowEntries } from "../workflowRuntime";
import { executeSequenceStepApply } from "./sequenceStepApply";
import { resolveSkillRunnerExecutionModeFromRequest } from "../skillRunnerExecutionMode";
import {
  mapSkillRunnerProgressLifecycle,
  mapSkillRunnerSubmitPhase,
} from "../skillRunnerProgressMapping";
import { maybeObserveSkillRunnerAutoReplyRun } from "../skillRunnerAutoReplyObserver";
import { buildSkillRunnerRunRecordRequestPayload } from "../skillRunnerInteractiveAutoReply";
import { resolveSkillRunnerSkillDisplay } from "../skillRunnerSubmissionContext";
import {
  buildSkillRunnerSequenceRunKey,
  buildSkillRunnerSingleRunKey,
  createSkillRunnerRun,
  getSkillRunnerRunProjection,
  recordSkillRunnerProgress,
  registerSkillRunnerSkillDisplaySnapshot,
  settleSkillRunnerRun,
  updateSkillRunnerRunStateByRequest,
} from "../skillRunnerRunStore";

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
  selectAcpSkillRun: typeof selectAcpSkillRun;
  getLoadedWorkflowEntries: typeof getLoadedWorkflowEntries;
  executeSequenceStepApply: typeof executeSequenceStepApply;
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
  backend: PreparedWorkflowExecution["executionContext"]["backend"];
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
  return recordSkillRunnerProgress({
    runKey,
    event: args.event,
    updatedAt: new Date().toISOString(),
  });
}

function recordSequenceStepSkillRunnerProgress(args: {
  event: ProviderProgressEvent;
  workflowId: string;
  backendId: string;
  providerOptions?: Record<string, unknown>;
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
  const created = createSkillRunnerRun({
    runKey,
    backendId: args.backendId,
    workflowId: args.workflowId,
    workflowRunId,
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
  });
  if (!created) {
    return null;
  }
  return (
    recordSkillRunnerProgress({
      runKey,
      event: args.event,
      updatedAt: new Date().toISOString(),
    }) || created
  );
}

export function runWorkflowExecutionSeam(
  args: {
    prepared: PreparedWorkflowExecution;
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
  const queue = resolved.createQueue({
    concurrency: dispatchConcurrency,
    executeJob: (job, runtime) => {
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
                });
              }
            : undefined;
        return executeSkillRunnerSequence({
          request: job.request as SkillRunnerSequenceRequestV1,
          backend: args.prepared.executionContext.backend,
          providerOptions: args.prepared.executionContext.providerOptions,
          skillDisplayById: args.prepared.skillDisplayById,
          workflowId: args.prepared.workflow.manifest.id,
          workflowLabel,
          workflowRunId: `${runId}-${job.id}`,
          jobId: job.id,
          executeWithProvider: resolved.executeWithProvider,
          applySequenceStepResult,
          appendRuntimeLog: resolved.appendRuntimeLog,
          onProgress: (event) => {
            runtime.reportProgress(event);
          },
        });
      }
      return resolved.executeWithProvider({
        requestKind: args.prepared.executionContext.requestKind,
        request: job.request,
        backend: args.prepared.executionContext.backend,
        providerOptions: args.prepared.executionContext.providerOptions,
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
          requestAcpSkillRunForeground({
            requestId,
            backend: executionContext.backend,
            workflowId: args.prepared.workflow.manifest.id,
            workflowLabel: localizeWorkflowLabel(args.prepared.workflow),
            jobId: job.id,
            runId: String(job.meta.runId || "").trim() || undefined,
            sequenceStepId:
              String(event.sequenceStepId || "").trim() || undefined,
            sequenceStepIndex: normalizeSequenceStepIndex(
              event.sequenceStepIndex,
            ),
            taskName: resolveTaskNameFromRequest(requestForMode, requestIndex),
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
      if (
        executionContext.requestKind === SKILLRUNNER_SEQUENCE_REQUEST_KIND &&
        backendType === "skillrunner"
      ) {
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
          settleSkillRunnerRun({
            runKey,
            status: job.state,
            error: job.error,
            result: {
              resultJson: result.resultJson,
              resultJsonPath: normalizeText(result.resultJsonPath) || undefined,
              workspaceDir: normalizeText(result.workspaceDir) || undefined,
            },
            updatedAt: job.updatedAt,
            eventPayload: {
              source: "workflowExecution.runSeam.onJobUpdated",
              state: job.state,
            },
          });
        } else if (requestId) {
          updateSkillRunnerRunStateByRequest({
            backendId: executionContext.backend.id,
            requestId,
            state: job.state,
            backendStatus: normalizeText(
              (job.result as { backendStatus?: unknown } | undefined)
                ?.backendStatus,
            ) as any,
            error: job.error,
            updatedAt: job.updatedAt,
            eventType: "backend.snapshot",
            eventPayload: {
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
      createSkillRunnerRun({
        backendId: args.prepared.executionContext.backend.id,
        workflowId: args.prepared.workflow.manifest.id,
        workflowRunId: runId,
        jobId,
        taskName,
        skillId: skillId || undefined,
        requestPayload: buildSkillRunnerRunRecordRequestPayload({
          request,
          providerOptions: args.prepared.executionContext.providerOptions,
        }),
        fetchType: resolveSkillRunnerFetchTypeFromRequest(request),
        executionMode: executionModeFromRequest(request),
      });
    }
    return jobId;
  });

  return {
    workflow: args.prepared.workflow,
    requests: args.prepared.requests,
    queue,
    jobIds,
    runId,
    totalJobs: jobIds.length,
    idlePromise: queue.waitForIdle(),
  };
}

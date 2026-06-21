import {
  JobQueueManager,
  type JobRecord,
} from "../../jobQueue/manager";
import { executeWithProvider } from "../../providers/registry";
import {
  ACP_SKILL_RUN_REQUEST_KIND,
  DEFAULT_BACKEND_TYPE,
  SKILLRUNNER_SEQUENCE_REQUEST_KIND,
} from "../../config/defaults";
import { appendRuntimeLog } from "../runtimeLogManager";
import {
  buildWorkflowTaskRecordFromJob,
  recordWorkflowTaskUpdate,
} from "../taskRuntime";
import { recordTaskDashboardHistoryFromJob } from "../taskDashboardHistory";
import { openAssistantWorkspaceSidebar } from "../assistantWorkspaceSidebar";
import { focusSkillRunnerWorkspace } from "../skillRunnerRunDialog";
import { selectAcpSkillRun, upsertAcpSkillRun } from "../acpSkillRunStore";
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
import { localizeWorkflowLabel } from "../../workflows/localization";
import type { LoadedWorkflow } from "../../workflows/types";
import { getLoadedWorkflowEntries } from "../workflowRuntime";
import { executeSequenceStepApply } from "./sequenceStepApply";
import { resolveSkillRunnerExecutionModeFromRequest } from "../skillRunnerExecutionMode";
import {
  mapSkillRunnerProgressLifecycle,
  mapSkillRunnerSequenceStepProgressState,
  mapSkillRunnerSubmitPhase,
} from "../skillRunnerProgressMapping";

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

function buildSequenceStepJobRecord(args: {
  parentJob: JobRecord;
  event: Record<string, unknown>;
  backend: PreparedWorkflowExecution["executionContext"]["backend"];
  workflowLabel: string;
}) {
  const stepId = normalizeText(args.event.sequenceStepId);
  if (!stepId) {
    return null;
  }
  const requestId = normalizeText(args.event.requestId);
  const workflowRunId =
    normalizeText(args.event.workflowRunId) ||
    normalizeText(args.parentJob.meta.workflowRunId) ||
    normalizeText(args.parentJob.meta.runId);
  const rootRunId = normalizeText(args.parentJob.meta.runId);
  const sequenceStepIndex = normalizeSequenceStepIndex(
    args.event.sequenceStepIndex,
  );
  const skillId = normalizeText(args.event.sequenceStepSkillId);
  const eventType = normalizeText(args.event.type);
  const taskName =
    normalizeText(args.event.sequenceStepTaskName) ||
    normalizeText(args.parentJob.meta.taskName) ||
    `${args.workflowLabel} / ${stepId}`;
  const now = new Date().toISOString();
  const meta: Record<string, unknown> = {
    ...args.parentJob.meta,
    runId: rootRunId || workflowRunId,
    workflowRunId: workflowRunId || undefined,
    jobId: `${args.parentJob.id}:${stepId}`,
    localRunId: `${normalizeText(args.parentJob.meta.runId) || workflowRunId || args.parentJob.id}:${args.parentJob.id}:${stepId}`,
    requestId: requestId || undefined,
    requestKind: "skillrunner.job.v1",
    backendId: args.backend.id,
    backendType: args.backend.type,
    backendBaseUrl: args.backend.baseUrl,
    taskName,
    inputUnitLabel: taskName,
    skillId: skillId || undefined,
    sequenceStepId: stepId,
    sequenceStepIndex,
    sequenceJobId: normalizeText(args.event.sequenceJobId) || args.parentJob.id,
    skillRunnerRequestReady:
      eventType === "request-ready" ||
      eventType === "sequence-step-deferred" ||
      eventType === "sequence-step-succeeded",
  };
  return {
    ...args.parentJob,
    id: `${args.parentJob.id}:${stepId}`,
    request: args.event.sequenceStepRequest || args.parentJob.request,
    meta,
    state: mapSkillRunnerSequenceStepProgressState(args.event),
    error: normalizeText(args.event.error) || undefined,
    updatedAt: now,
  } satisfies JobRecord;
}

function requestSkillRunnerSubmitFocus(args: {
  resolved: RunSeamDeps;
  backend: PreparedWorkflowExecution["executionContext"]["backend"];
  skillrunnerMode?: unknown;
  job: JobRecord;
}) {
  const taskRecord = buildWorkflowTaskRecordFromJob(args.job);
  const taskId = normalizeText(taskRecord.id);
  const localRunId = normalizeText(taskRecord.localRunId) || taskId;
  if (!taskId && !localRunId) {
    return;
  }
  const focusPayload = {
    backend: args.backend,
    taskId: taskId || localRunId,
    localRunId: localRunId || taskId,
    selectionChanged: true,
  };
  if (normalizeText(args.skillrunnerMode) === "interactive") {
    void args.resolved.openAssistantWorkspaceSidebar({
      tab: "skillrunner",
      backend: args.backend,
      taskId: taskId || localRunId,
      localRunId: localRunId || taskId,
    });
    return;
  }
  void args.resolved.focusSkillRunnerWorkspace(focusPayload);
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
        const stepJob = buildSequenceStepJobRecord({
          parentJob: job,
          event,
          backend: executionContext.backend,
          workflowLabel,
        });
        if (stepJob) {
          const lifecycle = mapSkillRunnerProgressLifecycle(event);
          const submitPhase = mapSkillRunnerSubmitPhase(event);
          if (lifecycle) {
            stepJob.meta.skillRunnerLifecycleState = lifecycle;
          }
          if (submitPhase) {
            stepJob.meta.skillRunnerSubmitPhase = submitPhase;
            stepJob.meta.skillRunnerSubmitStartedAt =
              stepJob.meta.skillRunnerSubmitStartedAt || stepJob.createdAt;
          }
          resolved.recordWorkflowTaskUpdate(stepJob);
          resolved.recordTaskDashboardHistoryFromJob(stepJob);
          if (event.type === "sequence-step-started") {
            requestSkillRunnerSubmitFocus({
              resolved,
              backend: executionContext.backend,
              skillrunnerMode: resolveSkillRunnerExecutionModeFromRequest(
                stepJob.request,
                "auto",
              ),
              job: stepJob,
            });
          }
        }
        if (isRequestCreated) {
          return;
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
          resolved.recordWorkflowTaskUpdate(job);
          resolved.recordTaskDashboardHistoryFromJob(job);
          if (isRequestCreating) {
            requestSkillRunnerSubmitFocus({
              resolved,
              backend: executionContext.backend,
              skillrunnerMode: resolveSkillRunnerExecutionModeFromRequest(
                requestForMode,
                "auto",
              ),
              job,
            });
          }
        }
        const skillrunnerMode =
          requestForMode
            ? resolveSkillRunnerExecutionModeFromRequest(requestForMode, "auto")
            : "auto";
        const isAcpSkillRun =
          executionContext.requestKind === ACP_SKILL_RUN_REQUEST_KIND ||
          executionContext.requestKind === SKILLRUNNER_SEQUENCE_REQUEST_KIND;
        if (isAcpSkillRun && backendType === "acp" && requestId) {
          upsertAcpSkillRun({
            requestId,
            status: "running",
            backendId: executionContext.backend.id,
            backendType: "acp",
            backendLabel:
              String(
                (executionContext.backend as { label?: unknown; name?: unknown; displayName?: unknown }).label ||
                  (executionContext.backend as { name?: unknown }).name ||
                  (executionContext.backend as { displayName?: unknown }).displayName ||
                  "",
              ).trim() || undefined,
            workflowId: args.prepared.workflow.manifest.id,
            workflowLabel: localizeWorkflowLabel(args.prepared.workflow),
            jobId: job.id,
            runId: String(job.meta.runId || "").trim() || undefined,
            taskName: resolveTaskNameFromRequest(requestForMode, requestIndex),
            skillId:
              requestForMode && typeof requestForMode === "object"
                ? String((requestForMode as { skill_id?: unknown }).skill_id || "").trim() || undefined
                : undefined,
            requestPayload: requestForMode,
          });
          resolved.selectAcpSkillRun(requestId);
          if (skillrunnerMode === "interactive") {
            void resolved.openAssistantWorkspaceSidebar({
              tab: "acp-skills",
              backend: executionContext.backend,
              requestId,
            });
          }
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
      resolved.recordWorkflowTaskUpdate(job);
      resolved.recordTaskDashboardHistoryFromJob(job);
    },
  });

  const jobIds = args.prepared.requests.map((request, index) => {
    const taskName = resolveTaskNameFromRequest(request, index);
    const inputUnitIdentity = resolveInputUnitIdentityFromRequest(request);
    const inputUnitLabel = resolveInputUnitLabelFromRequest(request, index);
    const skillId = resolveSkillIdFromRequest(request);
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
        targetParentID: resolveTargetParentIDFromRequest(request),
        providerId: args.prepared.executionContext.providerId,
        requestKind: args.prepared.executionContext.requestKind,
        backendId: args.prepared.executionContext.backend.id,
        backendType: args.prepared.executionContext.backend.type,
        backendBaseUrl: args.prepared.executionContext.backend.baseUrl,
        skillId: skillId || undefined,
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

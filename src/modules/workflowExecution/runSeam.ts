import { JobQueueManager } from "../../jobQueue/manager";
import { executeWithProvider } from "../../providers/registry";
import {
  ACP_SKILL_RUN_REQUEST_KIND,
  SKILLRUNNER_SEQUENCE_REQUEST_KIND,
} from "../../config/defaults";
import { appendRuntimeLog } from "../runtimeLogManager";
import { recordWorkflowTaskUpdate } from "../taskRuntime";
import { recordTaskDashboardHistoryFromJob } from "../taskDashboardHistory";
import { ensureSkillRunnerRecoverableContext } from "../skillRunnerTaskReconciler";
import { openAssistantWorkspaceSidebar } from "../assistantWorkspaceSidebar";
import { focusSkillRunnerWorkspace } from "../skillRunnerRunDialog";
import { selectAcpSkillRun } from "../acpSkillRunStore";
import type { PreparedWorkflowExecution, WorkflowRunState } from "./contracts";
import {
  resolveInputUnitIdentityFromRequest,
  resolveInputUnitLabelFromRequest,
  resolveTargetParentIDFromRequest,
  resolveTaskNameFromRequest,
} from "./requestMeta";
import { resolveWorkflowDispatchConcurrency } from "./runConcurrency";
import { executeSkillRunnerSequence } from "./sequenceRuntime";
import type { SkillRunnerSequenceRequestV1 } from "../../providers/contracts";
import { localizeWorkflowLabel } from "../../workflows/localization";

type RunSeamDeps = {
  createQueue: (
    config: ConstructorParameters<typeof JobQueueManager>[0],
  ) => JobQueueManager;
  executeWithProvider: typeof executeWithProvider;
  appendRuntimeLog: typeof appendRuntimeLog;
  recordWorkflowTaskUpdate: typeof recordWorkflowTaskUpdate;
  recordTaskDashboardHistoryFromJob: typeof recordTaskDashboardHistoryFromJob;
  ensureSkillRunnerRecoverableContext: typeof ensureSkillRunnerRecoverableContext;
  openAssistantWorkspaceSidebar: typeof openAssistantWorkspaceSidebar;
  focusSkillRunnerWorkspace: typeof focusSkillRunnerWorkspace;
  selectAcpSkillRun: typeof selectAcpSkillRun;
};

const defaultRunSeamDeps: RunSeamDeps = {
  createQueue: (config) => new JobQueueManager(config),
  executeWithProvider,
  appendRuntimeLog,
  recordWorkflowTaskUpdate,
  recordTaskDashboardHistoryFromJob,
  ensureSkillRunnerRecoverableContext,
  openAssistantWorkspaceSidebar,
  focusSkillRunnerWorkspace,
  selectAcpSkillRun,
};

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
        return executeSkillRunnerSequence({
          request: job.request as SkillRunnerSequenceRequestV1,
          backend: args.prepared.executionContext.backend,
          providerOptions: args.prepared.executionContext.providerOptions,
          workflowId: args.prepared.workflow.manifest.id,
          workflowLabel,
          workflowRunId: `${runId}-${job.id}`,
          jobId: job.id,
          executeWithProvider: resolved.executeWithProvider,
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
      if (event.type === "request-created") {
        const requestId = String(event.requestId || "").trim();
        if (requestId) {
          job.meta.requestId = requestId;
        }
        const requestIndex =
          typeof job.meta.index === "number" && Number.isFinite(job.meta.index)
            ? Math.floor(job.meta.index)
            : -1;
        const request =
          requestIndex >= 0 && requestIndex < args.prepared.requests.length
            ? args.prepared.requests[requestIndex]
            : undefined;
        if (request) {
          resolved.ensureSkillRunnerRecoverableContext({
            workflowId: args.prepared.workflow.manifest.id,
            workflowLabel,
            requestKind: args.prepared.executionContext.requestKind,
            request,
            backend: args.prepared.executionContext.backend,
            providerId: args.prepared.executionContext.providerId,
            providerOptions: args.prepared.executionContext.providerOptions,
            job,
          });
        }

        const executionContext = args.prepared.executionContext;
        const skillrunnerMode =
          args.prepared.workflow.manifest.execution?.skillrunner_mode;
        const isSkillRunnerJob =
          executionContext.requestKind === "skillrunner.job.v1";
        const isAcpSkillRun =
          executionContext.requestKind === ACP_SKILL_RUN_REQUEST_KIND ||
          executionContext.requestKind === SKILLRUNNER_SEQUENCE_REQUEST_KIND;
        const backendType = String(executionContext.backend.type || "").trim();
        if (isSkillRunnerJob && backendType === "skillrunner" && requestId) {
          void resolved.focusSkillRunnerWorkspace({
            backend: executionContext.backend,
            requestId,
            selectionChanged: true,
          });
          if (skillrunnerMode === "interactive") {
            void resolved.openAssistantWorkspaceSidebar({
              tab: "skillrunner",
              backend: executionContext.backend,
              requestId,
            });
          }
        }
        if (isAcpSkillRun && backendType === "acp" && requestId) {
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
      resolved.recordWorkflowTaskUpdate(job);
      resolved.recordTaskDashboardHistoryFromJob(job);
      const requestIndex =
        typeof job.meta.index === "number" && Number.isFinite(job.meta.index)
          ? Math.floor(job.meta.index)
          : -1;
      const request =
        requestIndex >= 0 && requestIndex < args.prepared.requests.length
          ? args.prepared.requests[requestIndex]
          : undefined;
      if (request) {
        resolved.ensureSkillRunnerRecoverableContext({
          workflowId: args.prepared.workflow.manifest.id,
          workflowLabel,
          requestKind: args.prepared.executionContext.requestKind,
          request,
          backend: args.prepared.executionContext.backend,
          providerId: args.prepared.executionContext.providerId,
          providerOptions: args.prepared.executionContext.providerOptions,
          job,
        });
      }
    },
  });

  const jobIds = args.prepared.requests.map((request, index) => {
    const taskName = resolveTaskNameFromRequest(request, index);
    const inputUnitIdentity = resolveInputUnitIdentityFromRequest(request);
    const inputUnitLabel = resolveInputUnitLabelFromRequest(request, index);
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

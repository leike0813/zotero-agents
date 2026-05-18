import { appendRuntimeLog } from "../runtimeLogManager";
import { normalizeErrorMessage, type WorkflowMessageFormatter } from "../workflowExecuteMessage";
import { executeApplyResult } from "../../workflows/runtime";
import { ZipBundleReader } from "../../workflows/zipBundleReader";
import type { BundleReader } from "./bundleIO";
import {
  buildTempBundlePath,
  createUnavailableBundleReader,
  createDirectoryBundleReader,
  removeFileIfExists,
  writeBytes,
} from "./bundleIO";
import { createWorkflowResultContext } from "./resultContext";
import { markAcpSkillRunApplyResult } from "../acpSkillRunStore";
import type { WorkflowApplySummary, WorkflowRunState } from "./contracts";
import {
  resolveTargetParentIDFromRequest,
  resolveTaskNameFromRequest,
} from "./requestMeta";
import { isActive } from "../skillRunnerProviderStateMachine";
import { resolveSkillRunnerExecutionModeFromRequest } from "../skillRunnerExecutionMode";
import {
  getSkillRunnerRequestIdFromJob,
  hasRecoverableSkillRunnerRequest,
} from "../skillRunnerRecoverableState";
import { canWorkflowRunWithoutSelection } from "../workflowSelectionPolicy";

type RunResultLike = {
  status?: string;
  backendStatus?: string;
  bundleBytes?: Uint8Array;
  bundleDir?: string;
  resultJson?: unknown;
  responseJson?: unknown;
  resultJsonPath?: string;
  workspaceDir?: string;
  requestId?: string;
};

function isSkillRunnerAutoRequest(args: {
  workflow: { manifest?: { provider?: string; request?: { kind?: string } } };
  request: unknown;
}) {
  const provider = String(args.workflow.manifest?.provider || "").trim();
  const requestKind = String(args.workflow.manifest?.request?.kind || "").trim();
  if (provider !== "skillrunner" && requestKind !== "skillrunner.job.v1") {
    return false;
  }
  return resolveSkillRunnerExecutionModeFromRequest(args.request) === "auto";
}

function isPendingWorkflowJobState(state: string) {
  return isActive(state);
}

function isAcpProviderResult(args: {
  result?: RunResultLike;
  job?: { meta?: Record<string, unknown> };
}) {
  const responseJson =
    args.result?.responseJson &&
    typeof args.result.responseJson === "object" &&
    !Array.isArray(args.result.responseJson)
      ? (args.result.responseJson as Record<string, unknown>)
      : {};
  return (
    String(responseJson.provider || "").trim() === "acp" ||
    String(args.job?.meta?.backendType || "").trim() === "acp" ||
    String(args.job?.meta?.providerId || "").trim() === "acp"
  );
}

type ApplySeamDeps = {
  appendRuntimeLog: typeof appendRuntimeLog;
  normalizeErrorMessage: typeof normalizeErrorMessage;
  executeApplyResult: typeof executeApplyResult;
  buildTempBundlePath: typeof buildTempBundlePath;
  writeBytes: typeof writeBytes;
  removeFileIfExists: typeof removeFileIfExists;
  createUnavailableBundleReader: typeof createUnavailableBundleReader;
  createDirectoryBundleReader: typeof createDirectoryBundleReader;
  createZipBundleReader: (bundlePath: string) => BundleReader;
  createWorkflowResultContext: typeof createWorkflowResultContext;
};

const defaultApplySeamDeps: ApplySeamDeps = {
  appendRuntimeLog,
  normalizeErrorMessage,
  executeApplyResult,
  buildTempBundlePath,
  writeBytes,
  removeFileIfExists,
  createUnavailableBundleReader,
  createDirectoryBundleReader,
  createZipBundleReader: (bundlePath) => new ZipBundleReader(bundlePath),
  createWorkflowResultContext,
};

export async function runWorkflowApplySeam(args: {
  runState: WorkflowRunState;
  messageFormatter: WorkflowMessageFormatter;
}, deps: Partial<ApplySeamDeps> = {}): Promise<WorkflowApplySummary> {
  const resolved = {
    ...defaultApplySeamDeps,
    ...deps,
  };
  let succeeded = 0;
  let failed = 0;
  let pending = 0;
  const failureReasons: string[] = [];
  const jobOutcomes: WorkflowApplySummary["jobOutcomes"] = [];
  const reconcileOwnedPendingJobs: WorkflowApplySummary["reconcileOwnedPendingJobs"] = [];

  for (let i = 0; i < args.runState.jobIds.length; i++) {
    const taskLabel = resolveTaskNameFromRequest(args.runState.requests[i], i);
    const jobId = args.runState.jobIds[i];
    const job = args.runState.queue.getJob(jobId);
    if (!job || job.state !== "succeeded") {
      const recoverableRequestId = getSkillRunnerRequestIdFromJob(job as any);
      const recoverableSkillRunnerFailure =
        !!job &&
        hasRecoverableSkillRunnerRequest(job as any) &&
        (isPendingWorkflowJobState(job.state) || job.state === "failed");
      if (recoverableSkillRunnerFailure) {
        pending += 1;
        if (
          isSkillRunnerAutoRequest({
            workflow: args.runState.workflow,
            request: args.runState.requests[i],
          })
        ) {
          reconcileOwnedPendingJobs.push({
            index: i,
            taskLabel,
            succeeded: true,
            terminalState: "succeeded",
            jobId: job.id,
            requestId: recoverableRequestId,
          });
        }
        resolved.appendRuntimeLog({
          level: "warn",
          scope: "job",
          workflowId: args.runState.workflow.manifest.id,
          jobId: job.id,
          requestId: recoverableRequestId || undefined,
          stage: "job-pending-recoverable-dispatch-failure",
          message:
            "job kept pending because request was already created before local dispatch failure",
          details: {
            index: i,
            taskLabel,
            state: job.state,
            error: job.error,
          },
        });
        continue;
      }
      failed += 1;
      if (!job) {
        const reason = "record missing";
        failureReasons.push(`job-${i}: ${reason}`);
        jobOutcomes.push({
          index: i,
          taskLabel,
          succeeded: false,
          reason,
          jobId,
        });
        resolved.appendRuntimeLog({
          level: "error",
          scope: "job",
          workflowId: args.runState.workflow.manifest.id,
          jobId,
          stage: "job-missing",
          message: "job record missing after queue drain",
          details: { index: i, taskLabel },
        });
      } else {
        const isDeferredResult =
          (job.result as RunResultLike | undefined)?.status === "deferred";
        if (isDeferredResult && isPendingWorkflowJobState(job.state)) {
          pending += 1;
          failed -= 1;
          resolved.appendRuntimeLog({
            level: "info",
            scope: "job",
            workflowId: args.runState.workflow.manifest.id,
            jobId: job.id,
            requestId: String(job.meta.requestId || "").trim() || undefined,
            stage: "job-pending",
            message: "job pending backend state reconciler",
            details: { index: i, taskLabel, state: job.state },
          });
          continue;
        }
        const reason = job.error || `state=${job.state}`;
        failureReasons.push(`job-${i}: ${reason}`);
        jobOutcomes.push({
          index: i,
          taskLabel,
          succeeded: false,
          reason,
          jobId: job.id,
        });
        resolved.appendRuntimeLog({
          level: "error",
          scope: "job",
          workflowId: args.runState.workflow.manifest.id,
          jobId: job.id,
          stage: "job-failed",
          message: "job execution failed",
          details: { index: i, taskLabel, reason },
        });
      }
      continue;
    }

    const targetParentID =
      typeof job.meta.targetParentID === "number"
        ? job.meta.targetParentID
        : resolveTargetParentIDFromRequest(args.runState.requests[i]);
    const applyParent =
      typeof targetParentID === "number" && targetParentID > 0
        ? targetParentID
        : null;
    if (
      !applyParent &&
      !canWorkflowRunWithoutSelection(args.runState.workflow.manifest)
    ) {
      failed += 1;
      const reason = "cannot resolve target parent";
      failureReasons.push(`job-${i}: ${reason}`);
      jobOutcomes.push({
        index: i,
        taskLabel,
        succeeded: false,
        reason,
        jobId: job.id,
      });
      resolved.appendRuntimeLog({
        level: "error",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: job.id,
        stage: "apply-parent-missing",
        message: "cannot resolve target parent before applyResult",
        details: { index: i, taskLabel },
      });
      continue;
    }

    const result = job.result as RunResultLike;
    if (!result?.requestId) {
      failed += 1;
      const reason = "missing requestId in execution result";
      failureReasons.push(`job-${i}: ${reason}`);
      jobOutcomes.push({
        index: i,
        taskLabel,
        succeeded: false,
        reason,
        jobId: job.id,
      });
      resolved.appendRuntimeLog({
        level: "error",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: job.id,
        stage: "provider-result-missing-request-id",
        message: "provider result missing requestId",
        details: { index: i, taskLabel },
      });
      continue;
    }

    resolved.appendRuntimeLog({
      level: "info",
      scope: "job",
      workflowId: args.runState.workflow.manifest.id,
      jobId: job.id,
      requestId: result.requestId,
      stage: "provider-finished",
      message: "provider execution finished for job",
      details: { index: i, taskLabel, targetParentID: applyParent || undefined },
    });

    if (
      isSkillRunnerAutoRequest({
        workflow: args.runState.workflow,
        request: args.runState.requests[i],
      }) &&
      !isAcpProviderResult({
        result,
        job: job as { meta?: Record<string, unknown> },
      })
    ) {
      pending += 1;
      reconcileOwnedPendingJobs.push({
        index: i,
        taskLabel,
        succeeded: true,
        terminalState: "succeeded",
        jobId: job.id,
        requestId: result.requestId,
      });
      resolved.appendRuntimeLog({
        level: "info",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: job.id,
        requestId: result.requestId,
        stage: "foreground-apply-skipped-auto",
        message: "foreground apply skipped for reconcile-owned skillrunner auto terminal result",
        details: {
          index: i,
          taskLabel,
          runId: args.runState.runId,
          targetParentID: applyParent || undefined,
        },
      });
      continue;
    }

    let bundlePath = "";
    try {
      resolved.appendRuntimeLog({
        level: "info",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: job.id,
        requestId: result.requestId,
        stage: "apply-start",
        message: "applyResult started",
        details: { index: i, taskLabel, targetParentID: applyParent || undefined },
      });
      let bundleReader: BundleReader = resolved.createUnavailableBundleReader(
        result.requestId,
      );
      if (result.bundleBytes && result.bundleBytes.length > 0) {
        bundlePath = resolved.buildTempBundlePath(result.requestId);
        await resolved.writeBytes(bundlePath, result.bundleBytes);
        bundleReader = resolved.createZipBundleReader(bundlePath);
      } else if (result.bundleDir) {
        bundleReader = resolved.createDirectoryBundleReader(result.bundleDir);
      }
      const resultContext = await resolved.createWorkflowResultContext({
        runResult: result,
        bundleReader,
        manifest: args.runState.workflow.manifest,
      });
      await resolved.executeApplyResult({
        workflow: args.runState.workflow,
        parent: applyParent,
        bundleReader,
        resultContext,
        request: args.runState.requests[i],
        runResult: {
          ...(job.result as Record<string, unknown>),
          backendId: String(job.meta.backendId || "").trim() || undefined,
          backendType: String(job.meta.backendType || "").trim() || undefined,
          runId: String(job.meta.runId || "").trim() || undefined,
        },
      });
      if (isAcpProviderResult({ result, job: job as { meta?: Record<string, unknown> } })) {
        markAcpSkillRunApplyResult({
          requestId: result.requestId,
          state: "succeeded",
        });
      }
      succeeded += 1;
      jobOutcomes.push({
        index: i,
        taskLabel,
        succeeded: true,
        terminalState: "succeeded",
        jobId: job.id,
        requestId: result.requestId,
      });
      resolved.appendRuntimeLog({
        level: "info",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: job.id,
        requestId: result.requestId,
        stage: "apply-succeeded",
        message: "applyResult succeeded",
        details: { index: i, taskLabel, targetParentID: applyParent || undefined },
      });
    } catch (error) {
      failed += 1;
      const reason = resolved.normalizeErrorMessage(error, args.messageFormatter);
      failureReasons.push(
        `job-${i} (request_id=${result.requestId}): ${reason}`,
      );
      jobOutcomes.push({
        index: i,
        taskLabel,
        succeeded: false,
        terminalState: "failed",
        reason,
        jobId: job.id,
        requestId: result.requestId,
      });
      resolved.appendRuntimeLog({
        level: "error",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: job.id,
        requestId: result.requestId,
        stage: "apply-failed",
        message: "applyResult failed",
        details: {
          index: i,
          taskLabel,
          reason,
          targetParentID: applyParent || undefined,
        },
        error,
      });
      if (isAcpProviderResult({ result, job: job as { meta?: Record<string, unknown> } })) {
        markAcpSkillRunApplyResult({
          requestId: result.requestId,
          state: "failed",
          error: reason,
        });
      }
    } finally {
      if (bundlePath) {
        await resolved.removeFileIfExists(bundlePath);
      }
    }
  }

  return {
    succeeded,
    failed,
    pending,
    failureReasons,
    jobOutcomes,
    reconcileOwnedPendingJobs,
  };
}

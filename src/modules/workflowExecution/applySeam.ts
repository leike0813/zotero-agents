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
  sequence?: {
    workflow_run_id?: string;
    final_step_id?: string;
    steps?: Array<Record<string, unknown>>;
  };
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

function getResponseJson(result?: RunResultLike) {
  return result?.responseJson &&
    typeof result.responseJson === "object" &&
    !Array.isArray(result.responseJson)
    ? (result.responseJson as Record<string, unknown>)
    : {};
}

function isAcpRecoverableNonTerminalResult(args: {
  result?: RunResultLike;
  job?: { meta?: Record<string, unknown> };
}) {
  if (!isAcpProviderResult(args)) {
    return false;
  }
  const responseJson = getResponseJson(args.result);
  const responseStatus = String(responseJson.status || "").trim();
  return (
    args.result?.status === "deferred" ||
    responseStatus === "disconnected" ||
    responseStatus === "interrupted"
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

async function createBundleReaderForRunResult(args: {
  result: RunResultLike;
  requestId: string;
  deps: ApplySeamDeps;
}) {
  let bundlePath = "";
  let bundleReader: BundleReader = args.deps.createUnavailableBundleReader(
    args.requestId,
  );
  if (args.result.bundleBytes && args.result.bundleBytes.length > 0) {
    bundlePath = args.deps.buildTempBundlePath(args.requestId);
    await args.deps.writeBytes(bundlePath, args.result.bundleBytes);
    bundleReader = args.deps.createZipBundleReader(bundlePath);
  } else if (args.result.bundleDir) {
    bundleReader = args.deps.createDirectoryBundleReader(args.result.bundleDir);
  }
  return { bundleReader, bundlePath };
}

function getSequenceSteps(result: RunResultLike) {
  const steps = result.sequence?.steps;
  return Array.isArray(steps) ? steps : [];
}

async function createSequenceApplyContext(args: {
  result: RunResultLike;
  manifest: WorkflowRunState["workflow"]["manifest"];
  deps: ApplySeamDeps;
  cleanupPaths: string[];
}) {
  const steps = getSequenceSteps(args.result);
  if (steps.length === 0) {
    return undefined;
  }
  const sequence = args.result.sequence || {};
  const enrichedSteps = [];
  for (const step of steps) {
    const stepResult =
      step.result && typeof step.result === "object" && !Array.isArray(step.result)
        ? (step.result as RunResultLike)
        : undefined;
    if (!stepResult) {
      enrichedSteps.push({ ...step });
      continue;
    }
    const requestId =
      String(stepResult.requestId || "").trim() ||
      String(step.request_id || "").trim() ||
      "sequence-step";
    const resource = await createBundleReaderForRunResult({
      result: stepResult,
      requestId,
      deps: args.deps,
    });
    if (resource.bundlePath) {
      args.cleanupPaths.push(resource.bundlePath);
    }
    const resultContext = await args.deps.createWorkflowResultContext({
      runResult: stepResult,
      bundleReader: resource.bundleReader,
      manifest: args.manifest,
    });
    enrichedSteps.push({
      ...step,
      request_id: requestId,
      result: stepResult,
      bundleReader: resource.bundleReader,
      resultContext,
    });
  }
  return {
    ...sequence,
    steps: enrichedSteps,
  };
}

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
      isAcpRecoverableNonTerminalResult({
        result,
        job: job as { meta?: Record<string, unknown> },
      })
    ) {
      pending += 1;
      resolved.appendRuntimeLog({
        level: "info",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: job.id,
        requestId: result.requestId,
        stage: "foreground-apply-skipped-acp-recoverable",
        message:
          "foreground apply skipped for recoverable ACP skill run state",
        details: {
          index: i,
          taskLabel,
          status: result.status,
          responseStatus: String(
            getResponseJson(result).status || "",
          ).trim(),
          targetParentID: applyParent || undefined,
        },
      });
      continue;
    }

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
    const sequenceBundlePaths: string[] = [];
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
      const bundleResource = await createBundleReaderForRunResult({
        result,
        requestId: result.requestId,
        deps: resolved,
      });
      bundlePath = bundleResource.bundlePath;
      const bundleReader = bundleResource.bundleReader;
      const resultContext = await resolved.createWorkflowResultContext({
        runResult: result,
        bundleReader,
        manifest: args.runState.workflow.manifest,
      });
      const sequenceApplyContext = await createSequenceApplyContext({
        result,
        manifest: args.runState.workflow.manifest,
        deps: resolved,
        cleanupPaths: sequenceBundlePaths,
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
          ...(sequenceApplyContext
            ? { sequence: sequenceApplyContext }
            : {}),
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
      const structuredApplyResult =
        error && typeof error === "object" && "structuredResult" in error
          ? (error as { structuredResult?: unknown }).structuredResult
          : undefined;
      failureReasons.push(
        `job-${i} (request_id=${result.requestId}): ${reason}`,
      );
      jobOutcomes.push({
        index: i,
        taskLabel,
        succeeded: false,
        terminalState: "failed",
        reason,
        structuredApplyResult,
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
          structuredApplyResult,
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
      for (const path of sequenceBundlePaths) {
        await resolved.removeFileIfExists(path);
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

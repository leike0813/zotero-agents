import { appendRuntimeLog } from "../runtimeLogManager";
import {
  normalizeErrorMessage,
  type WorkflowMessageFormatter,
} from "../workflowExecuteMessage";
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
import {
  updateSkillRunnerRunApplyState,
  updateSkillRunnerRunResult,
  updateSkillRunnerRunStateByRequest,
} from "../skillRunnerRunStore";
import type { WorkflowApplySummary, WorkflowRunState } from "./contracts";
import {
  resolveTargetParentIDFromRequest,
  resolveTaskNameFromRequest,
} from "./requestMeta";
import { isActive } from "../skillRunnerProviderStateMachine";
import {
  getSkillRunnerRequestIdFromJob,
  hasRecoverableSkillRunnerRequest,
} from "../skillRunnerRecoverableState";
import { canWorkflowRunWithoutSelection } from "../workflowSelectionPolicy";
import { collectSkillRunFeedbackSidecar } from "../skillRunFeedback";

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

function resolveWorkflowRequestKind(args: {
  workflow: { manifest?: { request?: { kind?: string } } };
  request: unknown;
}) {
  const manifestRequestKind = String(
    args.workflow.manifest?.request?.kind || "",
  ).trim();
  if (manifestRequestKind) {
    return manifestRequestKind;
  }
  return isRecord(args.request) ? String(args.request.kind || "").trim() : "";
}

function isSkillRunnerSingleJobRequest(args: {
  workflow: { manifest?: { request?: { kind?: string } } };
  request: unknown;
  job?: { meta?: Record<string, unknown> };
  result?: RunResultLike;
}) {
  if (
    isAcpProviderResult({
      result: args.result,
      job: args.job,
    })
  ) {
    return false;
  }
  return (
    String(args.job?.meta?.backendType || "").trim() === "skillrunner" &&
    resolveWorkflowRequestKind({
      workflow: args.workflow,
      request: args.request,
    }) === "skillrunner.job.v1"
  );
}

function getJobResultStatus(job?: { result?: unknown }) {
  const result =
    job?.result && typeof job.result === "object" && !Array.isArray(job.result)
      ? (job.result as { status?: unknown })
      : undefined;
  return String(result?.status || "").trim();
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
  collectSkillRunFeedback: typeof collectSkillRunFeedbackSidecar;
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
  collectSkillRunFeedback: collectSkillRunFeedbackSidecar,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function shouldSkipFinalSequenceApply(args: {
  request: unknown;
  result: RunResultLike;
}) {
  if (!isRecord(args.request)) {
    return false;
  }
  if (String(args.request.kind || "").trim() !== "skillrunner.sequence.v1") {
    return false;
  }
  const steps = Array.isArray(args.request.steps) ? args.request.steps : [];
  if (steps.length === 0) {
    return false;
  }
  const finalStepId =
    String(args.result.sequence?.final_step_id || "").trim() ||
    String(args.request.final_step_id || "").trim();
  if (!finalStepId) {
    return false;
  }
  const finalStep = steps.find(
    (entry) => isRecord(entry) && String(entry.id || "").trim() === finalStepId,
  );
  return isRecord(finalStep) && isRecord(finalStep.apply_result);
}

function summarizeSequenceStepApplyResults(result: RunResultLike) {
  return getSequenceSteps(result)
    .map((step) => {
      const applyResult = isRecord(step.apply_result)
        ? step.apply_result
        : null;
      return {
        step_id: String(step.step_id || "").trim(),
        request_id: String(step.request_id || "").trim(),
        status: String(applyResult?.status || "").trim() || "unavailable",
        workflow_id: String(applyResult?.workflow_id || "").trim() || undefined,
        error: String(applyResult?.error || "").trim() || undefined,
      };
    })
    .filter((entry) => entry.step_id);
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
      step.result &&
      typeof step.result === "object" &&
      !Array.isArray(step.result)
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

export async function runWorkflowApplySeam(
  args: {
    runState: WorkflowRunState;
    messageFormatter: WorkflowMessageFormatter;
  },
  deps: Partial<ApplySeamDeps> = {},
): Promise<WorkflowApplySummary> {
  const resolved = {
    ...defaultApplySeamDeps,
    ...deps,
  };
  let succeeded = 0;
  let failed = 0;
  let pending = 0;
  const failureReasons: string[] = [];
  const jobOutcomes: WorkflowApplySummary["jobOutcomes"] = [];

  for (let i = 0; i < args.runState.jobIds.length; i++) {
    const taskLabel = resolveTaskNameFromRequest(args.runState.requests[i], i);
    const jobId = args.runState.jobIds[i];
    const job = args.runState.queue.getJob(jobId);
    if (!job || job.state !== "succeeded") {
      const recoverableRequestId = getSkillRunnerRequestIdFromJob(job as any);
      const jobResultStatus = getJobResultStatus(job as any);
      const terminalProviderResult =
        jobResultStatus === "failed" || jobResultStatus === "canceled";
      const recoverableSkillRunnerFailure =
        !!job &&
        !terminalProviderResult &&
        hasRecoverableSkillRunnerRequest(job as any) &&
        (isPendingWorkflowJobState(job.state) || job.state === "failed");
      if (recoverableSkillRunnerFailure) {
        pending += 1;
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

    const result = job.result as RunResultLike;
    const resultStatus = String(result?.status || "").trim();
    if (resultStatus && resultStatus !== "succeeded") {
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
          details: { index: i, taskLabel, status: resultStatus },
        });
        continue;
      }
      if (resultStatus === "deferred") {
        pending += 1;
        resolved.appendRuntimeLog({
          level: "info",
          scope: "job",
          workflowId: args.runState.workflow.manifest.id,
          jobId: job.id,
          requestId: result.requestId,
          stage: "provider-result-deferred-after-succeeded-job",
          message:
            "provider returned deferred result for a locally succeeded job",
          details: {
            index: i,
            taskLabel,
            status: resultStatus,
            backendStatus: result.backendStatus,
          },
        });
        continue;
      }
      failed += 1;
      const terminalState = resultStatus === "canceled" ? "canceled" : "failed";
      const reason =
        resultStatus === "failed"
          ? "provider result failed after local job success"
          : resultStatus === "canceled"
            ? "provider result canceled after local job success"
            : `unexpected provider result status: ${resultStatus}`;
      failureReasons.push(`job-${i} (request_id=${result.requestId}): ${reason}`);
      jobOutcomes.push({
        index: i,
        taskLabel,
        succeeded: false,
        terminalState,
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
        stage: "provider-result-non-succeeded-after-succeeded-job",
        message: "provider result status does not match local job success",
        details: {
          index: i,
          taskLabel,
          status: resultStatus,
          terminalState,
        },
      });
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
      details: {
        index: i,
        taskLabel,
        targetParentID: applyParent || undefined,
      },
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
        message: "foreground apply skipped for recoverable ACP skill run state",
        details: {
          index: i,
          taskLabel,
          status: result.status,
          responseStatus: String(getResponseJson(result).status || "").trim(),
          targetParentID: applyParent || undefined,
        },
      });
      continue;
    }

    if (
      shouldSkipFinalSequenceApply({
        request: args.runState.requests[i],
        result,
      })
    ) {
      succeeded += 1;
      const stepApplyResults = summarizeSequenceStepApplyResults(result);
      jobOutcomes.push({
        index: i,
        taskLabel,
        succeeded: true,
        terminalState: "succeeded",
        structuredApplyResult: {
          skipped_final_apply: true,
          sequence_step_apply: stepApplyResults,
        },
        jobId: job.id,
        requestId: result.requestId,
      });
      resolved.appendRuntimeLog({
        level: "info",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: job.id,
        requestId: result.requestId,
        stage: "apply-skipped-sequence-step-owned",
        message:
          "final workflow apply skipped because sequence final step owns applyResult",
        details: {
          index: i,
          taskLabel,
          targetParentID: applyParent || undefined,
          sequenceStepApply: stepApplyResults,
        },
      });
      continue;
    }

    let bundlePath = "";
    const sequenceBundlePaths: string[] = [];
    const isForegroundSkillRunnerSingleJob = isSkillRunnerSingleJobRequest({
      workflow: args.runState.workflow,
      request: args.runState.requests[i],
      job: job as { meta?: Record<string, unknown> },
      result,
    });
    const skillRunnerBackendId =
      String(job.meta.backendId || "").trim() || undefined;
    try {
      resolved.appendRuntimeLog({
        level: "info",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: job.id,
        requestId: result.requestId,
        stage: "apply-start",
        message: "applyResult started",
        details: {
          index: i,
          taskLabel,
          targetParentID: applyParent || undefined,
        },
      });
      if (isForegroundSkillRunnerSingleJob) {
        const updatedAt = new Date().toISOString();
        updateSkillRunnerRunStateByRequest({
          backendId: skillRunnerBackendId,
          requestId: result.requestId,
          state: "succeeded",
          updatedAt,
          eventType: "backend.terminal",
          eventPayload: {
            source: "workflowExecution.applySeam",
            foreground: true,
          },
        });
        updateSkillRunnerRunApplyState({
          backendId: skillRunnerBackendId,
          requestId: result.requestId,
          state: "running",
          updatedAt,
          eventType: "apply.started",
          eventPayload: {
            source: "workflowExecution.applySeam",
            foreground: true,
          },
        });
      }
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
      if (isForegroundSkillRunnerSingleJob) {
        updateSkillRunnerRunResult({
          backendId: skillRunnerBackendId,
          requestId: result.requestId,
          resultJson: resultContext.resultJson,
          resultJsonPath:
            typeof result.resultJsonPath === "string"
              ? result.resultJsonPath
              : undefined,
          workspaceDir:
            typeof result.workspaceDir === "string"
              ? result.workspaceDir
              : undefined,
          updatedAt: new Date().toISOString(),
          eventPayload: {
            source: "workflowExecution.applySeam",
            foreground: true,
          },
        });
      }
      const sequenceApplyContext = await createSequenceApplyContext({
        result,
        manifest: args.runState.workflow.manifest,
        deps: resolved,
        cleanupPaths: sequenceBundlePaths,
      });
      const enrichedRunResult = {
        ...(job.result as Record<string, unknown>),
        backendId: String(job.meta.backendId || "").trim() || undefined,
        backendType: String(job.meta.backendType || "").trim() || undefined,
        runId: String(job.meta.runId || "").trim() || undefined,
        ...(sequenceApplyContext ? { sequence: sequenceApplyContext } : {}),
      };
      await resolved.executeApplyResult({
        workflow: args.runState.workflow,
        parent: applyParent,
        bundleReader,
        resultContext,
        request: args.runState.requests[i],
        runResult: enrichedRunResult,
      });
      await resolved.collectSkillRunFeedback({
        workflow: args.runState.workflow,
        request: args.runState.requests[i],
        runResult: enrichedRunResult,
        resultContext,
        bundleReader,
        jobId: job.id,
        appendRuntimeLog: resolved.appendRuntimeLog,
      });
      if (
        isAcpProviderResult({
          result,
          job: job as { meta?: Record<string, unknown> },
        })
      ) {
        markAcpSkillRunApplyResult({
          requestId: result.requestId,
          state: "succeeded",
        });
      }
      if (isForegroundSkillRunnerSingleJob) {
        updateSkillRunnerRunApplyState({
          backendId: skillRunnerBackendId,
          requestId: result.requestId,
          state: "succeeded",
          attempt: 0,
          updatedAt: new Date().toISOString(),
          eventType: "apply.succeeded",
          eventPayload: {
            source: "workflowExecution.applySeam",
            foreground: true,
          },
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
        details: {
          index: i,
          taskLabel,
          targetParentID: applyParent || undefined,
        },
      });
    } catch (error) {
      failed += 1;
      const reason = resolved.normalizeErrorMessage(
        error,
        args.messageFormatter,
      );
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
      if (
        isAcpProviderResult({
          result,
          job: job as { meta?: Record<string, unknown> },
        })
      ) {
        markAcpSkillRunApplyResult({
          requestId: result.requestId,
          state: "failed",
          error: reason,
        });
      }
      if (isForegroundSkillRunnerSingleJob) {
        updateSkillRunnerRunApplyState({
          backendId: skillRunnerBackendId,
          requestId: result.requestId,
          state: "failed",
          error: reason,
          updatedAt: new Date().toISOString(),
          eventType: "apply.failed",
          eventPayload: {
            source: "workflowExecution.applySeam",
            foreground: true,
          },
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
  };
}

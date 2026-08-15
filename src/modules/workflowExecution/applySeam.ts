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
import {
  detachAcpSkillRunControllerAfterApplyResult,
  getAcpSkillRunRecord,
  markAcpSkillRunApplyResult,
} from "../acpSkillRunStore";
import {
  getSkillRunnerRunRecordByRequest,
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
import { buildWorkflowTaskRecordFromJob } from "../taskRuntime";
import { canWorkflowRunWithoutSelection } from "../workflowSelectionPolicy";
import { collectSkillRunFeedbackSidecar } from "../skillRunFeedback";
import { normalizeWorkflowApplyDiagnostics } from "./applyDiagnostics";
import { getSequenceRunState } from "./sequenceStateStore";
import { sequenceTerminalStepOwnsApply } from "./sequenceRuntime";

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
    terminal_step_id?: string;
    short_circuit_step_id?: string;
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

export function resolveProviderTerminalOutcome(args: {
  queue: WorkflowRunState["queue"];
  runId: string;
  jobId: string;
  requestId: string;
}) {
  const job = args.queue.getJob(args.jobId);
  let terminalRequestId = args.requestId;
  const requestKind =
    job?.request &&
    typeof job.request === "object" &&
    !Array.isArray(job.request)
      ? String((job.request as { kind?: unknown }).kind || "").trim()
      : "";
  if (requestKind === "skillrunner.sequence.v1") {
    const sequenceState = getSequenceRunState(`${args.runId}-${args.jobId}`);
    if (
      !sequenceState ||
      (sequenceState.status !== "completed" &&
        sequenceState.status !== "failed" &&
        sequenceState.status !== "canceled")
    ) {
      return null;
    }
    if (
      sequenceState.status === "failed" ||
      sequenceState.status === "canceled"
    ) {
      return {
        status: "failed" as const,
        terminalState:
          sequenceState.status === "canceled"
            ? ("canceled" as const)
            : ("failed" as const),
        reason: sequenceState.error || `sequence ${sequenceState.status}`,
      };
    }
    if (sequenceState.status === "completed") {
      terminalRequestId =
        [...sequenceState.steps]
          .reverse()
          .map((step) => String(step.requestId || "").trim())
          .find(Boolean) || terminalRequestId;
    }
  }

  const backendType = String(job?.meta.backendType || "").trim();
  if (backendType === "skillrunner") {
    const record = getSkillRunnerRunRecordByRequest({
      backendId: job?.meta.backendId as string | undefined,
      requestId: terminalRequestId,
    });
    if (record?.status === "failed" || record?.status === "canceled") {
      return {
        status: "failed" as const,
        terminalState:
          record.status === "canceled"
            ? ("canceled" as const)
            : ("failed" as const),
        reason: record.error || `provider ${record.status}`,
      };
    }
    if (
      record?.status === "succeeded" &&
      (record.apply.state === "succeeded" || record.apply.state === "skipped")
    ) {
      return { status: "succeeded" as const };
    }
    if (record?.apply.state === "failed") {
      return {
        status: "failed" as const,
        terminalState: "failed" as const,
        reason: record.apply.error || "workflow apply failed",
      };
    }
  }

  if (backendType === "acp") {
    const record = getAcpSkillRunRecord(terminalRequestId);
    if (record?.status === "failed" || record?.status === "canceled") {
      return {
        status: "failed" as const,
        terminalState:
          record.status === "canceled"
            ? ("canceled" as const)
            : ("failed" as const),
        reason: record.error || `provider ${record.status}`,
      };
    }
    if (
      record?.status === "succeeded" &&
      record.applyResultState === "succeeded"
    ) {
      return { status: "succeeded" as const };
    }
    if (record?.applyResultState === "failed") {
      return {
        status: "failed" as const,
        terminalState: "failed" as const,
        reason: record.error || "workflow apply failed",
      };
    }
  }

  return null;
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

function buildAggregateRequestIndexSet(runState: WorkflowRunState) {
  const indexes = new Set<number>();
  for (const aggregate of runState.preflight?.aggregates || []) {
    for (const index of aggregate.requestIndexes) {
      indexes.add(index);
    }
  }
  return indexes;
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
  const aggregateRequestIndexes = buildAggregateRequestIndexSet(args.runState);

  for (let i = 0; i < args.runState.jobIds.length; i++) {
    const taskLabel = resolveTaskNameFromRequest(args.runState.requests[i], i);
    const jobId = args.runState.jobIds[i];
    const job = args.runState.queue.getJob(jobId);
    const providerRequestId = String(
      job?.meta.requestId ||
        (job?.result as RunResultLike | undefined)?.requestId ||
        "",
    ).trim();
    const externalTerminal =
      job && job.state !== "succeeded"
        ? resolveProviderTerminalOutcome({
            queue: args.runState.queue,
            runId: args.runState.runId,
            jobId,
            requestId: providerRequestId,
          })
        : null;
    if (externalTerminal) {
      if (externalTerminal.status === "succeeded") {
        succeeded += 1;
        jobOutcomes.push({
          index: i,
          taskLabel,
          succeeded: true,
          terminalState: "succeeded",
          jobId,
          requestId: providerRequestId || undefined,
        });
      } else {
        failed += 1;
        const reason = externalTerminal.reason || "provider execution failed";
        failureReasons.push(
          providerRequestId
            ? `job-${i} (request_id=${providerRequestId}): ${reason}`
            : `job-${i}: ${reason}`,
        );
        jobOutcomes.push({
          index: i,
          taskLabel,
          succeeded: false,
          terminalState: externalTerminal.terminalState,
          reason,
          jobId,
          requestId: providerRequestId || undefined,
        });
      }
      continue;
    }
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
        const terminalOutcome = resolveProviderTerminalOutcome({
          queue: args.runState.queue,
          runId: args.runState.runId,
          jobId: job.id,
          requestId: result.requestId,
        });
        if (terminalOutcome?.status === "succeeded") {
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
            stage: "provider-deferred-terminal-applied",
            message:
              "deferred provider execution and workflow apply reached terminal success",
            details: { index: i, taskLabel },
          });
          continue;
        }
        if (terminalOutcome?.status === "failed") {
          failed += 1;
          const reason = terminalOutcome.reason || "deferred execution failed";
          failureReasons.push(
            `job-${i} (request_id=${result.requestId}): ${reason}`,
          );
          jobOutcomes.push({
            index: i,
            taskLabel,
            succeeded: false,
            terminalState: terminalOutcome.terminalState,
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
            stage: "provider-deferred-terminal-failed",
            message:
              "deferred provider execution or workflow apply reached terminal failure",
            details: {
              index: i,
              taskLabel,
              terminalState: terminalOutcome.terminalState,
              reason,
            },
          });
          continue;
        }
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
      failureReasons.push(
        `job-${i} (request_id=${result.requestId}): ${reason}`,
      );
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

    if (aggregateRequestIndexes.has(i)) {
      resolved.appendRuntimeLog({
        level: "info",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: job.id,
        requestId: result.requestId,
        stage: "apply-deferred-aggregate-child",
        message: "per-job apply deferred for aggregate preflight child",
        details: {
          index: i,
          taskLabel,
          targetParentID: applyParent || undefined,
        },
      });
      continue;
    }

    if (
      sequenceTerminalStepOwnsApply({
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
        runKey: buildWorkflowTaskRecordFromJob(job).runKey || undefined,
        runId: String(job.meta.runId || "").trim() || undefined,
        ...(sequenceApplyContext ? { sequence: sequenceApplyContext } : {}),
      };
      const hookResult = await resolved.executeApplyResult({
        workflow: args.runState.workflow,
        parent: applyParent,
        bundleReader,
        resultContext,
        request: args.runState.requests[i],
        runResult: enrichedRunResult,
        runtime: args.runState.runtime,
        executionOptions: args.runState.executionOptions,
      });
      const applyDiagnostics = normalizeWorkflowApplyDiagnostics(hookResult);
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
        await detachAcpSkillRunControllerAfterApplyResult({
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
        level: applyDiagnostics ? "warn" : "info",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: job.id,
        requestId: result.requestId,
        stage: "apply-succeeded",
        message: applyDiagnostics
          ? "applyResult succeeded with warnings"
          : "applyResult succeeded",
        details: {
          index: i,
          taskLabel,
          targetParentID: applyParent || undefined,
          ...(applyDiagnostics ? { applyDiagnostics } : {}),
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
        await detachAcpSkillRunControllerAfterApplyResult({
          requestId: result.requestId,
          state: "failed",
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

  for (const entry of args.runState.preflight?.shortCircuitApplies || []) {
    const requestId = entry.runResult.requestId;
    const bundleReader = resolved.createUnavailableBundleReader(requestId);
    try {
      const resultContext = await resolved.createWorkflowResultContext({
        runResult: entry.runResult,
        bundleReader,
        manifest: args.runState.workflow.manifest,
        preflight: entry.preflight,
      });
      const hookResult = await resolved.executeApplyResult({
        workflow: args.runState.workflow,
        parent: entry.parent,
        bundleReader,
        resultContext,
        request: entry.request,
        runResult: entry.runResult,
        runtime: args.runState.runtime,
        executionOptions: args.runState.executionOptions,
      });
      const applyDiagnostics = normalizeWorkflowApplyDiagnostics(hookResult);
      succeeded += 1;
      jobOutcomes.push({
        index: entry.index,
        taskLabel: entry.taskLabel,
        succeeded: true,
        terminalState: "succeeded",
        jobId: requestId,
        requestId,
      });
      resolved.appendRuntimeLog({
        level: applyDiagnostics ? "warn" : "info",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: requestId,
        requestId,
        stage: "apply-succeeded-preflight-short-circuit",
        message: applyDiagnostics
          ? "preflight short-circuit applyResult succeeded with warnings"
          : "preflight short-circuit applyResult succeeded",
        details: {
          index: entry.index,
          taskLabel: entry.taskLabel,
          ...(applyDiagnostics ? { applyDiagnostics } : {}),
        },
      });
    } catch (error) {
      failed += 1;
      const reason = resolved.normalizeErrorMessage(
        error,
        args.messageFormatter,
      );
      failureReasons.push(`preflight-${entry.index}: ${reason}`);
      jobOutcomes.push({
        index: entry.index,
        taskLabel: entry.taskLabel,
        succeeded: false,
        terminalState: "failed",
        reason,
        jobId: requestId,
        requestId,
      });
      resolved.appendRuntimeLog({
        level: "error",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: requestId,
        requestId,
        stage: "apply-failed-preflight-short-circuit",
        message: "preflight short-circuit applyResult failed",
        details: {
          index: entry.index,
          taskLabel: entry.taskLabel,
          reason,
        },
        error,
      });
    }
  }

  for (const aggregate of args.runState.preflight?.aggregates || []) {
    const children: NonNullable<
      NonNullable<
        Awaited<ReturnType<typeof resolved.createWorkflowResultContext>>
      >["aggregate"]
    >["children"] = [];
    const cleanupPaths: string[] = [];
    const failedChild = aggregate.requestIndexes.find((requestIndex) => {
      const jobId = args.runState.jobIds[requestIndex];
      const job = jobId ? args.runState.queue.getJob(jobId) : null;
      const result = job?.result as RunResultLike | undefined;
      return (
        !job ||
        job.state !== "succeeded" ||
        String(result?.status || "succeeded").trim() !== "succeeded" ||
        !result?.requestId
      );
    });
    if (typeof failedChild === "number") {
      failed += 1;
      const reason = `aggregate child failed: index=${failedChild}`;
      failureReasons.push(`aggregate-${aggregate.id}: ${reason}`);
      jobOutcomes.push({
        index: failedChild,
        taskLabel: `Aggregate: ${aggregate.id}`,
        succeeded: false,
        terminalState: "failed",
        reason,
        jobId: `aggregate-${aggregate.id}`,
      });
      continue;
    }
    try {
      for (const requestIndex of aggregate.requestIndexes) {
        const jobId = args.runState.jobIds[requestIndex];
        const job = args.runState.queue.getJob(jobId);
        const result = job!.result as RunResultLike;
        const preflight = args.runState.preflight?.requestUnits[requestIndex];
        const bundleResource = await createBundleReaderForRunResult({
          result,
          requestId: result.requestId || `aggregate-${aggregate.id}`,
          deps: resolved,
        });
        if (bundleResource.bundlePath) {
          cleanupPaths.push(bundleResource.bundlePath);
        }
        const childResultContext = await resolved.createWorkflowResultContext({
          runResult: result,
          bundleReader: bundleResource.bundleReader,
          manifest: args.runState.workflow.manifest,
          preflight,
        });
        children.push({
          unitId: preflight?.unitId || `unit-${requestIndex}`,
          order:
            typeof preflight?.unitOrder === "number"
              ? preflight.unitOrder
              : requestIndex,
          context: preflight?.context,
          request: args.runState.requests[requestIndex],
          runResult: result,
          resultContext: childResultContext,
          bundleReader: bundleResource.bundleReader,
        });
      }
      children.sort((left, right) => left.order - right.order);
      const aggregateRequestId = `aggregate-${aggregate.id}`;
      const aggregateRunResult = {
        status: "succeeded" as const,
        requestId: aggregateRequestId,
        fetchType: "result" as const,
        resultJson: {
          kind: "workflow.preflight.aggregate.v1",
          aggregateId: aggregate.id,
        },
        responseJson: {
          kind: "workflow.preflight.aggregate.v1",
          aggregateId: aggregate.id,
        },
      };
      const bundleReader =
        resolved.createUnavailableBundleReader(aggregateRequestId);
      const resultContext = await resolved.createWorkflowResultContext({
        runResult: aggregateRunResult,
        bundleReader,
        manifest: args.runState.workflow.manifest,
        aggregate: {
          id: aggregate.id,
          mode: "single-apply",
          children,
        },
      });
      const firstRequestIndex = aggregate.requestIndexes[0] ?? 0;
      const targetParentID = resolveTargetParentIDFromRequest(
        args.runState.requests[firstRequestIndex],
      );
      const hookResult = await resolved.executeApplyResult({
        workflow: args.runState.workflow,
        parent:
          typeof targetParentID === "number" && targetParentID > 0
            ? targetParentID
            : null,
        bundleReader,
        resultContext,
        request: {
          kind: "workflow.preflight.aggregate.v1",
          aggregateId: aggregate.id,
        },
        runResult: aggregateRunResult,
        runtime: args.runState.runtime,
        executionOptions: args.runState.executionOptions,
      });
      const applyDiagnostics = normalizeWorkflowApplyDiagnostics(hookResult);
      succeeded += 1;
      jobOutcomes.push({
        index: firstRequestIndex,
        taskLabel: `Aggregate: ${aggregate.id}`,
        succeeded: true,
        terminalState: "succeeded",
        jobId: aggregateRequestId,
        requestId: aggregateRequestId,
      });
      resolved.appendRuntimeLog({
        level: applyDiagnostics ? "warn" : "info",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: aggregateRequestId,
        requestId: aggregateRequestId,
        stage: "apply-succeeded-preflight-aggregate",
        message: applyDiagnostics
          ? "preflight aggregate applyResult succeeded with warnings"
          : "preflight aggregate applyResult succeeded",
        details: {
          aggregateId: aggregate.id,
          ...(applyDiagnostics ? { applyDiagnostics } : {}),
        },
      });
    } catch (error) {
      failed += 1;
      const reason = resolved.normalizeErrorMessage(
        error,
        args.messageFormatter,
      );
      failureReasons.push(`aggregate-${aggregate.id}: ${reason}`);
      jobOutcomes.push({
        index: aggregate.requestIndexes[0] ?? 0,
        taskLabel: `Aggregate: ${aggregate.id}`,
        succeeded: false,
        terminalState: "failed",
        reason,
        jobId: `aggregate-${aggregate.id}`,
      });
      resolved.appendRuntimeLog({
        level: "error",
        scope: "job",
        workflowId: args.runState.workflow.manifest.id,
        jobId: `aggregate-${aggregate.id}`,
        stage: "apply-failed-preflight-aggregate",
        message: "preflight aggregate applyResult failed",
        details: { aggregateId: aggregate.id, reason },
        error,
      });
    } finally {
      for (const path of cleanupPaths) {
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

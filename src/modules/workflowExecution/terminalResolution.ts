import { getAcpSkillRunRecord } from "../acpSkillRunStore";
import {
  buildSkillRunnerSingleRunKey,
  getSkillRunnerRunRecord,
  getSkillRunnerRunRecordByRequest,
} from "../skillRunnerRunStore";
import type { WorkflowRunState } from "./contracts";
import { getSequenceRunState } from "./sequenceStateStore";

export type WorkflowJobTerminalResolution =
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "pending" }>
  | Readonly<{ kind: "local-ready" }>
  | Readonly<{
      kind: "canonical-ready";
      outcome: Readonly<{
        terminalState: "succeeded" | "failed" | "canceled";
        requestId?: string;
        reason?: string;
      }>;
    }>;

export function resolveWorkflowJobTerminalResolution(args: {
  queue: WorkflowRunState["queue"];
  workflowRunId: string;
  jobId: string;
}): WorkflowJobTerminalResolution {
  const job = args.queue.getJob(args.jobId);
  if (!job) {
    return { kind: "missing" };
  }
  const jobResult =
    job.result && typeof job.result === "object" && !Array.isArray(job.result)
      ? (job.result as { requestId?: unknown; status?: unknown })
      : undefined;
  const resultStatus = jobResult ? String(jobResult.status || "").trim() : "";
  const localSucceededReady =
    job.state === "succeeded" && resultStatus !== "deferred";
  let requestId = String(
    job.meta.requestId || jobResult?.requestId || "",
  ).trim();
  const backendType = String(job.meta.backendType || "").trim();
  const requestKind =
    job.request &&
    typeof job.request === "object" &&
    !Array.isArray(job.request)
      ? String((job.request as { kind?: unknown }).kind || "").trim()
      : "";
  const isSequenceRequest = requestKind === "skillrunner.sequence.v1";

  if (isSequenceRequest) {
    const sequenceState = getSequenceRunState(
      `${args.workflowRunId}-${args.jobId}`,
    );
    if (
      !sequenceState ||
      (sequenceState.status !== "completed" &&
        sequenceState.status !== "failed" &&
        sequenceState.status !== "canceled")
    ) {
      return { kind: "pending" };
    }
    if (
      sequenceState.status === "failed" ||
      sequenceState.status === "canceled"
    ) {
      return {
        kind: "canonical-ready",
        outcome: {
          terminalState: sequenceState.status,
          reason: sequenceState.error || `sequence ${sequenceState.status}`,
        },
      };
    }
    requestId =
      [...sequenceState.steps]
        .reverse()
        .map((step) => String(step.requestId || "").trim())
        .find(Boolean) || "";
    if (!requestId) {
      return { kind: "pending" };
    }
  }

  if (backendType === "skillrunner") {
    const record =
      (requestId
        ? getSkillRunnerRunRecordByRequest({
            backendId: String(job.meta.backendId || "").trim() || undefined,
            requestId,
          })
        : null) ||
      (!isSequenceRequest
        ? getSkillRunnerRunRecord(
            buildSkillRunnerSingleRunKey({
              workflowRunId: args.workflowRunId,
              jobId: args.jobId,
            }),
          )
        : null);
    const terminalRequestId = record?.requestId || requestId || undefined;
    if (record?.status === "failed" || record?.status === "canceled") {
      return {
        kind: "canonical-ready",
        outcome: {
          terminalState: record.status,
          ...(terminalRequestId ? { requestId: terminalRequestId } : {}),
          reason: record.error || `provider ${record.status}`,
        },
      };
    }
    if (record?.apply.state === "failed") {
      return {
        kind: "canonical-ready",
        outcome: {
          terminalState: "failed",
          ...(terminalRequestId ? { requestId: terminalRequestId } : {}),
          reason: record.apply.error || record.error || "workflow apply failed",
        },
      };
    }
    if (localSucceededReady) {
      return { kind: "local-ready" };
    }
    if (
      record?.status === "succeeded" &&
      (record.apply.state === "succeeded" || record.apply.state === "skipped")
    ) {
      return {
        kind: "canonical-ready",
        outcome: {
          terminalState: "succeeded",
          ...(terminalRequestId ? { requestId: terminalRequestId } : {}),
        },
      };
    }
  }

  if (backendType === "acp" && requestId) {
    const record = getAcpSkillRunRecord(requestId);
    if (record?.status === "failed" || record?.status === "canceled") {
      return {
        kind: "canonical-ready",
        outcome: {
          terminalState: record.status,
          requestId,
          reason: record.error || `provider ${record.status}`,
        },
      };
    }
    if (record?.applyResultState === "failed") {
      return {
        kind: "canonical-ready",
        outcome: {
          terminalState: "failed",
          requestId,
          reason: record.error || "workflow apply failed",
        },
      };
    }
    if (localSucceededReady) {
      return { kind: "local-ready" };
    }
    if (
      record?.status === "succeeded" &&
      record.applyResultState === "succeeded"
    ) {
      return {
        kind: "canonical-ready",
        outcome: { terminalState: "succeeded", requestId },
      };
    }
  }
  if (isSequenceRequest) {
    return { kind: "pending" };
  }
  if (
    resultStatus !== "deferred" &&
    (job.state === "succeeded" ||
      job.state === "failed" ||
      job.state === "canceled")
  ) {
    return { kind: "local-ready" };
  }
  return { kind: "pending" };
}

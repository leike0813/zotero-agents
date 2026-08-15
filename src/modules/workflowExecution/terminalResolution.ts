import { getAcpSkillRunRecord } from "../acpSkillRunStore";
import {
  buildSkillRunnerSingleRunKey,
  getSkillRunnerRunRecord,
  getSkillRunnerRunRecordByRequest,
} from "../skillRunnerRunStore";
import type { WorkflowRunState } from "./contracts";
import { getSequenceRunState } from "./sequenceStateStore";

export type WorkflowJobSlotStatus =
  | "missing"
  | "unobserved"
  | "queued"
  | "running"
  | "waiting_user"
  | "waiting_auth"
  | "failed_retriable"
  | "repairing"
  | "succeeded"
  | "failed"
  | "canceled";

export type WorkflowJobTerminalResolution =
  | Readonly<{ kind: "missing"; slotStatus: WorkflowJobSlotStatus }>
  | Readonly<{ kind: "pending"; slotStatus: WorkflowJobSlotStatus }>
  | Readonly<{ kind: "local-ready"; slotStatus: WorkflowJobSlotStatus }>
  | Readonly<{
      kind: "canonical-ready";
      slotStatus: WorkflowJobSlotStatus;
      outcome: Readonly<{
        terminalState: "succeeded" | "failed" | "canceled";
        requestId?: string;
        reason?: string;
      }>;
    }>;

type SequenceRunState = ReturnType<typeof getSequenceRunState>;

function normalizeJobState(state: unknown): WorkflowJobSlotStatus {
  const normalized = String(state || "").trim();
  return normalized === "queued" ||
    normalized === "running" ||
    normalized === "waiting_user" ||
    normalized === "waiting_auth" ||
    normalized === "succeeded" ||
    normalized === "failed" ||
    normalized === "canceled"
    ? normalized
    : "running";
}

function resolveSequenceSlotStatus(args: {
  state: SequenceRunState | null;
  backendId: string | undefined;
  backendType: string;
  jobRequestId: string;
  fallback: WorkflowJobSlotStatus;
}) {
  const stepRequestId =
    [...(args.state?.steps || [])]
      .reverse()
      .map((step) => String(step.requestId || "").trim())
      .find(Boolean) || "";
  if (args.backendType === "skillrunner") {
    if (!stepRequestId) {
      return args.fallback;
    }
    const record = getSkillRunnerRunRecordByRequest({
      backendId: args.backendId,
      requestId: stepRequestId,
    });
    return record?.status || "unobserved";
  }
  if (args.backendType === "acp") {
    const requestId = stepRequestId || args.jobRequestId;
    if (!requestId) {
      return "unobserved";
    }
    const record = getAcpSkillRunRecord(requestId);
    return record?.status || "unobserved";
  }
  return args.fallback;
}

export function resolveWorkflowJobTerminalResolution(args: {
  queue: WorkflowRunState["queue"];
  workflowRunId: string;
  jobId: string;
}): WorkflowJobTerminalResolution {
  const job = args.queue.getJob(args.jobId);
  if (!job) {
    return { kind: "missing", slotStatus: "missing" };
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
  const jobRequestId = requestId;
  const backendType = String(job.meta.backendType || "").trim();
  const backendId = String(job.meta.backendId || "").trim() || undefined;
  const requestKind =
    job.request &&
    typeof job.request === "object" &&
    !Array.isArray(job.request)
      ? String((job.request as { kind?: unknown }).kind || "").trim()
      : "";
  const isSequenceRequest = requestKind === "skillrunner.sequence.v1";
  const localSlotStatus = normalizeJobState(job.state);
  let canonicalSlotStatus: WorkflowJobSlotStatus | null = null;

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
      return {
        kind: "pending",
        slotStatus: resolveSequenceSlotStatus({
          state: sequenceState,
          backendId,
          backendType,
          jobRequestId,
          fallback: localSlotStatus,
        }),
      };
    }
    if (
      sequenceState.status === "failed" ||
      sequenceState.status === "canceled"
    ) {
      return {
        kind: "canonical-ready",
        slotStatus: sequenceState.status,
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
      return {
        kind: "pending",
        slotStatus: resolveSequenceSlotStatus({
          state: sequenceState,
          backendId,
          backendType,
          jobRequestId,
          fallback: localSlotStatus,
        }),
      };
    }
  }

  if (backendType === "skillrunner") {
    const runKeyRecord = !isSequenceRequest
      ? getSkillRunnerRunRecord(
          buildSkillRunnerSingleRunKey({
            workflowRunId: args.workflowRunId,
            jobId: args.jobId,
          }),
        )
      : null;
    const record =
      (requestId
        ? getSkillRunnerRunRecordByRequest({
            backendId,
            requestId,
          })
        : null) || runKeyRecord;
    canonicalSlotStatus =
      (isSequenceRequest ? record?.status : runKeyRecord?.status) ||
      "unobserved";
    const terminalRequestId = record?.requestId || requestId || undefined;
    if (record?.status === "failed" || record?.status === "canceled") {
      return {
        kind: "canonical-ready",
        slotStatus: record.status,
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
        slotStatus: "failed",
        outcome: {
          terminalState: "failed",
          ...(terminalRequestId ? { requestId: terminalRequestId } : {}),
          reason: record.apply.error || record.error || "workflow apply failed",
        },
      };
    }
    if (localSucceededReady) {
      return {
        kind: "local-ready",
        slotStatus: canonicalSlotStatus,
      };
    }
    if (
      record?.status === "succeeded" &&
      (record.apply.state === "succeeded" || record.apply.state === "skipped")
    ) {
      return {
        kind: "canonical-ready",
        slotStatus: "succeeded",
        outcome: {
          terminalState: "succeeded",
          ...(terminalRequestId ? { requestId: terminalRequestId } : {}),
        },
      };
    }
    if (isSequenceRequest) {
      return {
        kind: "pending",
        slotStatus: canonicalSlotStatus,
      };
    }
  }

  if (backendType === "acp") {
    const record = requestId ? getAcpSkillRunRecord(requestId) : null;
    canonicalSlotStatus = requestId
      ? record?.status || "unobserved"
      : "unobserved";
    if (requestId) {
      if (record?.status === "failed" || record?.status === "canceled") {
        return {
          kind: "canonical-ready",
          slotStatus: record.status,
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
          slotStatus: "failed",
          outcome: {
            terminalState: "failed",
            requestId,
            reason: record.error || "workflow apply failed",
          },
        };
      }
      if (localSucceededReady) {
        return {
          kind: "local-ready",
          slotStatus: canonicalSlotStatus,
        };
      }
      if (
        record?.status === "succeeded" &&
        record.applyResultState === "succeeded"
      ) {
        return {
          kind: "canonical-ready",
          slotStatus: "succeeded",
          outcome: { terminalState: "succeeded", requestId },
        };
      }
      if (isSequenceRequest) {
        return {
          kind: "pending",
          slotStatus: canonicalSlotStatus,
        };
      }
    }
  }
  if (isSequenceRequest) {
    return {
      kind: "pending",
      slotStatus: canonicalSlotStatus || localSlotStatus,
    };
  }
  if (
    resultStatus !== "deferred" &&
    (job.state === "succeeded" ||
      job.state === "failed" ||
      job.state === "canceled")
  ) {
    return {
      kind: "local-ready",
      slotStatus: canonicalSlotStatus || localSlotStatus,
    };
  }
  return {
    kind: "pending",
    slotStatus: canonicalSlotStatus || localSlotStatus,
  };
}

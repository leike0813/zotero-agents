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
    : // Fail closed: an unrecognized persisted job state must not masquerade
      // as live work.
      "failed";
}

type ProviderTerminalEvidence = Readonly<{
  status: string | undefined;
  error: string | undefined;
  applyState: string | undefined;
  applyError: string | undefined;
}>;

function resolveProviderTerminalCascade(args: {
  evidence: ProviderTerminalEvidence | null;
  canonicalSlotStatus: WorkflowJobSlotStatus;
  terminalRequestId: string | undefined;
  localSucceededReady: boolean;
  isSequenceRequest: boolean;
  succeededApplyStates: readonly string[];
}): WorkflowJobTerminalResolution | null {
  const { evidence } = args;
  const requestIdPart = args.terminalRequestId
    ? { requestId: args.terminalRequestId }
    : {};
  const status = evidence?.status;
  if (status === "failed" || status === "canceled") {
    return {
      kind: "canonical-ready",
      slotStatus: status,
      outcome: {
        terminalState: status,
        ...requestIdPart,
        reason: evidence?.error || `provider ${status}`,
      },
    };
  }
  if (evidence?.applyState === "failed") {
    return {
      kind: "canonical-ready",
      slotStatus: "failed",
      outcome: {
        terminalState: "failed",
        ...requestIdPart,
        reason:
          evidence.applyError || evidence.error || "workflow apply failed",
      },
    };
  }
  if (args.localSucceededReady) {
    return {
      kind: "local-ready",
      slotStatus: args.canonicalSlotStatus,
    };
  }
  if (
    status === "succeeded" &&
    args.succeededApplyStates.includes(evidence?.applyState || "")
  ) {
    return {
      kind: "canonical-ready",
      slotStatus: "succeeded",
      outcome: {
        terminalState: "succeeded",
        ...requestIdPart,
      },
    };
  }
  if (args.isSequenceRequest) {
    return {
      kind: "pending",
      slotStatus: args.canonicalSlotStatus,
    };
  }
  return null;
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
    const resolution = resolveProviderTerminalCascade({
      evidence: record
        ? {
            status: record.status,
            error: record.error,
            applyState: record.apply.state,
            applyError: record.apply.error,
          }
        : null,
      canonicalSlotStatus,
      terminalRequestId: record?.requestId || requestId || undefined,
      localSucceededReady,
      isSequenceRequest,
      succeededApplyStates: ["succeeded", "skipped"],
    });
    if (resolution) {
      return resolution;
    }
  }

  if (backendType === "acp") {
    const record = requestId ? getAcpSkillRunRecord(requestId) : null;
    canonicalSlotStatus = record?.status || "unobserved";
    if (requestId) {
      const resolution = resolveProviderTerminalCascade({
        evidence: record
          ? {
              status: record.status,
              error: record.error,
              applyState: record.applyResultState,
              applyError: undefined,
            }
          : null,
        canonicalSlotStatus,
        terminalRequestId: requestId,
        localSucceededReady,
        isSequenceRequest,
        succeededApplyStates: ["succeeded"],
      });
      if (resolution) {
        return resolution;
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

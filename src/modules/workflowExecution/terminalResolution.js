import { getAcpSkillRunRecord } from "../acp/skillRun/acpSkillRunStore";
import { buildSkillRunnerSingleRunKey, getSkillRunnerRunRecord, getSkillRunnerRunRecordByRequest, } from "../skillRunner/run/skillRunnerRunStore";
import { getSequenceRunState } from "./sequenceStateStore";
import { BUILTIN_PI_BACKEND_TYPE } from "../../config/defaults";
import { readPiSkillRunProviderProjection, } from "../../providers/builtin-pi/provider";
function normalizeBuiltinPiSlotStatus(status) {
    switch (status) {
        case "queued":
            return "queued";
        case "running":
            return "running";
        case "waiting_user":
            return "waiting_user";
        case "waiting_permission":
            return "waiting_user";
        case "suspended":
            return "running";
        case "succeeded":
            return "succeeded";
        case "failed":
            return "failed";
        case "canceled":
            return "canceled";
        case "recovery_required":
        case "state_unknown":
            return "failed_retriable";
        default:
            return "unobserved";
    }
}
function normalizeJobState(state) {
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
function resolveProviderTerminalCascade(args) {
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
                reason: evidence.applyError || evidence.error || "workflow apply failed",
            },
        };
    }
    if (args.localSucceededReady) {
        return {
            kind: "local-ready",
            slotStatus: args.canonicalSlotStatus,
        };
    }
    if (status === "succeeded" &&
        args.succeededApplyStates.includes(evidence?.applyState || "")) {
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
function resolveSequenceSlotStatus(args) {
    const stepRequestId = [...(args.state?.steps || [])]
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
export function resolveWorkflowJobTerminalResolution(args) {
    const job = args.queue.getJob(args.jobId);
    if (!job) {
        return { kind: "missing", slotStatus: "missing" };
    }
    const jobResult = job.result && typeof job.result === "object" && !Array.isArray(job.result)
        ? job.result
        : undefined;
    const resultStatus = jobResult ? String(jobResult.status || "").trim() : "";
    const localSucceededReady = job.state === "succeeded" && resultStatus !== "deferred";
    let requestId = String(job.meta.requestId || jobResult?.requestId || "").trim();
    const jobRequestId = requestId;
    const backendType = String(job.meta.backendType || "").trim();
    const backendId = String(job.meta.backendId || "").trim() || undefined;
    const requestKind = job.request &&
        typeof job.request === "object" &&
        !Array.isArray(job.request)
        ? String(job.request.kind || "").trim()
        : "";
    const isSequenceRequest = requestKind === "skillrunner.sequence.v1";
    const localSlotStatus = normalizeJobState(job.state);
    let canonicalSlotStatus = null;
    if (isSequenceRequest) {
        const sequenceState = getSequenceRunState(`${args.workflowRunId}-${args.jobId}`);
        if (!sequenceState ||
            (sequenceState.status !== "completed" &&
                sequenceState.status !== "failed" &&
                sequenceState.status !== "canceled")) {
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
        if (sequenceState.status === "failed" ||
            sequenceState.status === "canceled") {
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
            ? getSkillRunnerRunRecord(buildSkillRunnerSingleRunKey({
                workflowRunId: args.workflowRunId,
                jobId: args.jobId,
            }))
            : null;
        const record = (requestId
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
    if (backendType === BUILTIN_PI_BACKEND_TYPE) {
        const projection = (args.resolvePiProviderProjection ?? readPiSkillRunProviderProjection)(requestId);
        canonicalSlotStatus = normalizeBuiltinPiSlotStatus(projection?.status);
        if (!requestId || !projection) {
            return { kind: "pending", slotStatus: canonicalSlotStatus };
        }
        if (projection.status === "failed" || projection.status === "canceled") {
            return {
                kind: "canonical-ready",
                slotStatus: projection.status,
                outcome: {
                    terminalState: projection.status,
                    requestId,
                    reason: projection.error || "provider " + projection.status,
                },
            };
        }
        if (projection.status === "recovery_required" ||
            projection.status === "state_unknown") {
            return {
                kind: "canonical-ready",
                slotStatus: "failed",
                outcome: {
                    terminalState: "failed",
                    requestId,
                    reason: projection.error || "skill_run_recovery_required",
                },
            };
        }
        if (projection.status === "succeeded") {
            if (projection.applyState === "succeeded" ||
                projection.applyState === "skipped") {
                return {
                    kind: "canonical-ready",
                    slotStatus: "succeeded",
                    outcome: { terminalState: "succeeded", requestId },
                };
            }
            if (projection.applyState === "failed") {
                return {
                    kind: "canonical-ready",
                    slotStatus: "failed",
                    outcome: {
                        terminalState: "failed",
                        requestId,
                        reason: projection.applyError || "workflow apply failed",
                    },
                };
            }
            return localSucceededReady
                ? { kind: "local-ready", slotStatus: "succeeded" }
                : { kind: "pending", slotStatus: "succeeded" };
        }
        return { kind: "pending", slotStatus: canonicalSlotStatus };
    }
    if (isSequenceRequest) {
        return {
            kind: "pending",
            slotStatus: canonicalSlotStatus || localSlotStatus,
        };
    }
    if (resultStatus !== "deferred" &&
        (job.state === "succeeded" ||
            job.state === "failed" ||
            job.state === "canceled")) {
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

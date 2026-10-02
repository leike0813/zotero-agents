import productionOperations from "../../../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json";
import { appendRuntimeLog } from "../../runtimeLogManager";
import { synthesisProductionOperationPolicy } from "../production/synthesisProductionRpcPolicy";
const manifest = productionOperations;
function stableCode(error) {
    if (!error || typeof error !== "object")
        return "internal";
    const value = error;
    switch (value.code) {
        case "request_canceled":
        case "worker_canceled":
            return "canceled";
        case "request_timeout":
        case "operation_timeout":
        case "worker_timeout":
        case "timeout":
            return "timeout";
        case "basis_mismatch":
        case "conflict":
            return "conflict";
        case "invalid_request":
        case "response_invalid":
            return "invalid";
        case "service_unavailable":
        case "worker_unavailable":
        case "unavailable":
            return "unavailable";
        default:
            return "internal";
    }
}
function semanticTerminal(capability, result) {
    if (synthesisProductionOperationPolicy(capability).receipt ===
        "public-maintenance-operation") {
        const candidate = result && typeof result === "object" && !Array.isArray(result)
            ? result.status
            : undefined;
        if (typeof candidate !== "string") {
            return { succeeded: false };
        }
        return {
            succeeded: ["pending", "running", "completed"].includes(candidate),
            semanticStatus: candidate,
        };
    }
    const rule = manifest.semanticSuccess?.[capability];
    if (!rule || !result || typeof result !== "object" || Array.isArray(result)) {
        return { succeeded: true };
    }
    const candidate = result[rule.field];
    if (typeof candidate !== "string")
        return { succeeded: true };
    return {
        succeeded: rule.values.includes(candidate),
        semanticStatus: candidate,
    };
}
function semanticFailureClassification(status) {
    switch (status) {
        case "canceled":
            return "canceled";
        case "timed_out":
            return "timeout";
        case "invalid_request":
            return "invalid";
        case "basis_mismatch":
        case "conflict":
        case "patch_conflict":
        case "topic_exists":
        case "topic_missing":
            return "conflict";
        default:
            return "conflict";
    }
}
function write(details) {
    appendRuntimeLog({
        level: details.outcome === "failed" ? "error" : "info",
        scope: "system",
        component: "synthesis-sidecar-business",
        operation: details.operation,
        phase: details.stage,
        stage: details.outcome,
        message: `Synthesis operation ${details.outcome}`,
        details,
    });
}
export function beginSynthesisSidecarBusinessAudit(args) {
    const now = args.now ?? Date.now;
    const startedAt = now();
    const access = manifest.access[args.operation];
    const trigger = args.trigger ?? "user";
    let terminal = false;
    if (access === "mutation") {
        write({
            operation: args.operation,
            trigger,
            stage: "start",
            outcome: "started",
        });
    }
    const finish = (outcome, extra = {}) => {
        if (terminal)
            return;
        terminal = true;
        if (access === "read" && outcome === "succeeded")
            return;
        write({
            operation: args.operation,
            trigger,
            ...(args.surface ? { surface: args.surface } : {}),
            stage: "terminal",
            outcome,
            durationMs: Math.max(0, now() - startedAt),
            ...extra,
        });
    };
    return {
        succeeded(result) {
            const semantic = semanticTerminal(args.operation, result);
            finish(semantic.succeeded ? "succeeded" : "failed", {
                ...(semantic.semanticStatus
                    ? { semanticStatus: semantic.semanticStatus }
                    : {}),
                ...(semantic.succeeded
                    ? {}
                    : {
                        classification: semanticFailureClassification(semantic.semanticStatus),
                    }),
            });
            return semantic;
        },
        failed(error) {
            const details = error && typeof error === "object" && "details" in error
                ? error.details
                : null;
            const record = details && typeof details === "object" && !Array.isArray(details)
                ? details
                : null;
            finish("failed", {
                classification: stableCode(error),
                ...(typeof record?.reason === "string"
                    ? { reason: record.reason }
                    : {}),
                ...(typeof record?.sidecarCode === "string"
                    ? { sidecarCode: record.sidecarCode }
                    : {}),
                ...(record?.sidecarReason === "protocol_result_invalid" &&
                    typeof record.location === "string"
                    ? { schemaRef: record.location }
                    : {}),
                ...(record?.sidecarReason === "protocol_result_invalid" &&
                    Array.isArray(record.violations)
                    ? {
                        violations: record.violations.flatMap((violation) => {
                            if (!violation || typeof violation !== "object")
                                return [];
                            const row = violation;
                            return typeof row.keyword === "string" &&
                                typeof row.instancePath === "string"
                                ? [
                                    {
                                        keyword: row.keyword,
                                        pointer: row.instancePath,
                                    },
                                ]
                                : [];
                        }),
                    }
                    : {}),
            });
        },
    };
}

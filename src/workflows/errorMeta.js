const WORKFLOW_HOOK_FAILURE_META_KEY = "__zsWorkflowHookFailureMeta";
export function attachWorkflowHookFailureMeta(error, meta) {
    if (!error || (typeof error !== "object" && typeof error !== "function")) {
        return error;
    }
    try {
        error[WORKFLOW_HOOK_FAILURE_META_KEY] = {
            hookName: meta.hookName,
            workflowId: meta.workflowId,
            packageId: meta.packageId,
            workflowSourceKind: meta.workflowSourceKind,
            capabilitySource: meta.capabilitySource,
            executionMode: meta.executionMode,
        };
    }
    catch {
        // ignore metadata attachment failures
    }
    return error;
}
export function readWorkflowHookFailureMeta(error) {
    if (!error || (typeof error !== "object" && typeof error !== "function")) {
        return undefined;
    }
    const meta = error[WORKFLOW_HOOK_FAILURE_META_KEY];
    if (!meta || typeof meta !== "object") {
        return undefined;
    }
    return {
        hookName: meta.hookName,
        workflowId: meta.workflowId,
        packageId: meta.packageId,
        workflowSourceKind: meta.workflowSourceKind,
        capabilitySource: meta.capabilitySource,
        executionMode: meta.executionMode,
    };
}
export function summarizeWorkflowExecutionError(error) {
    const meta = readWorkflowHookFailureMeta(error);
    const err = error instanceof Error ? error : null;
    const carrier = error && (typeof error === "object" || typeof error === "function")
        ? error
        : null;
    return {
        message: err?.message || String(error || ""),
        stack: err?.stack,
        hookName: meta?.hookName,
        packageId: meta?.packageId,
        workflowId: meta?.workflowId,
        workflowSourceKind: meta?.workflowSourceKind,
        capabilitySource: meta?.capabilitySource ||
            String(carrier?.capabilitySource || "").trim() ||
            undefined,
        executionMode: meta?.executionMode ||
            String(carrier?.executionMode || "").trim() ||
            undefined,
    };
}

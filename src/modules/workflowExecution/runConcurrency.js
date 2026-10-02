const FULL_PARALLEL_PROVIDER_IDS = new Set(["skillrunner", "generic-http"]);
function isBackendBatchFullParallelProvider(providerId) {
    return FULL_PARALLEL_PROVIDER_IDS.has(String(providerId || "").trim());
}
export function resolveWorkflowDispatchConcurrency(args) {
    const requestCount = Number.isFinite(args.requestCount)
        ? Math.max(1, Math.floor(args.requestCount))
        : 1;
    if (!isBackendBatchFullParallelProvider(args.providerId)) {
        return 1;
    }
    return requestCount;
}

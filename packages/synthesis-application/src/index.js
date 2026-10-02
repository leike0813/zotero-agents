import { SYNTHESIS_WORKBENCH_FAILED_JOB_LIMIT, SYNTHESIS_WORKBENCH_OPERATIONAL_CACHE_DESCRIPTORS, SYNTHESIS_WORKBENCH_RUNNING_JOB_LIMIT, rebuildSynthesisWorkbenchOperationalChromeResult, } from "../../synthesis-contracts/src/workbench.js";
export * from "./topicCanonical.js";
export * from "./citationGraphApplication.js";
export * from "./conceptKbApplication.js";
export * from "./durableBundleApplication.js";
export * from "./debugMaintenanceApplication.js";
export * from "./webDavSyncApplication.js";
export * from "./knowledgeCheckpointApplication.js";
export * from "./knowledgeCheckpointCompatibility.js";
export * from "./citationGraphProjection.js";
export * from "./referenceProjection.js";
export * from "./referenceRefreshApplication.js";
export * from "./referenceMatchingReviewApplication.js";
export * from "./topicApplyDecision.js";
export * from "./topicApplication.js";
export * from "./tagVocabularyApplication.js";
export * from "./topicGraphApplication.js";
const cleanString = (value) => String(value ?? "").trim();
function sourceForOperation(operationType) {
    const source = cleanString(operationType);
    if (source === "reference_sidecar_refresh" ||
        source === "citation_graph_cache_rebuild" ||
        source === "citation_graph_layout" ||
        source === "webdav_sync" ||
        source === "canonical_maintenance") {
        return source;
    }
    return "operation";
}
function jobFromOperation(row) {
    const operationId = cleanString(row.operationId);
    if (!operationId)
        return null;
    const total = Math.max(0, Math.floor(Number(row.totalCount) || 0));
    const current = Math.min(total, Math.max(0, Math.floor(Number(row.processedCount) || 0)));
    const progress = row.progressMode === "determinate" && total > 0
        ? {
            mode: "determinate",
            current,
            total,
            percent: Math.max(0, Math.min(100, Math.round((current / total) * 100))),
            ...(cleanString(row.phaseLabel || row.message)
                ? { label: cleanString(row.phaseLabel || row.message) }
                : {}),
        }
        : {
            mode: "indeterminate",
            ...(cleanString(row.phaseLabel || row.message)
                ? { label: cleanString(row.phaseLabel || row.message) }
                : {}),
        };
    const detail = cleanString(row.message) ||
        cleanString(row.phaseLabel) ||
        cleanString(row.phase);
    const updatedAt = cleanString(row.updatedAt) ||
        cleanString(row.completedAt) ||
        cleanString(row.startedAt) ||
        cleanString(row.createdAt);
    return {
        job_id: operationId,
        source: sourceForOperation(row.operationType),
        status: row.status === "running" ? "running" : "failed",
        label: cleanString(row.label) || operationId,
        ...(detail ? { detail } : {}),
        ...(updatedAt ? { updated_at: updatedAt } : {}),
        progress,
    };
}
function relatedCacheKey(operationType) {
    if (operationType === "reference_sidecar_refresh") {
        return "reference-sidecar:library";
    }
    if (operationType === "citation_graph_cache_rebuild" ||
        operationType === "citation_graph_cache_incremental_refresh") {
        return "citation-graph:library";
    }
    return "";
}
function currentFailure(row, readCache) {
    const cacheKey = relatedCacheKey(row.operationType);
    if (!cacheKey)
        return true;
    const cache = readCache(cacheKey);
    if (!cache || cache.status === "failed")
        return true;
    const cacheUpdatedAt = cleanString(cache.refreshedAt || cache.updatedAt);
    const operationUpdatedAt = cleanString(row.updatedAt || row.completedAt);
    return Boolean(operationUpdatedAt && operationUpdatedAt > cacheUpdatedAt);
}
export function isSynthesisWorkbenchCurrentFailedOperation(repository, row) {
    return (row.status === "failed" &&
        currentFailure(row, (cacheKey) => repository.getCacheBasis(cacheKey)));
}
export function readSynthesisWorkbenchOperationalChrome(repository) {
    const cacheRows = SYNTHESIS_WORKBENCH_OPERATIONAL_CACHE_DESCRIPTORS.map((descriptor) => repository.getCacheBasis(descriptor.cacheKey));
    const cacheByKey = new Map(SYNTHESIS_WORKBENCH_OPERATIONAL_CACHE_DESCRIPTORS.map((descriptor, index) => [descriptor.cacheKey, cacheRows[index] ?? null]));
    const running = repository
        .listOperations({
        statuses: ["running"],
        limit: SYNTHESIS_WORKBENCH_RUNNING_JOB_LIMIT,
    })
        .slice(0, SYNTHESIS_WORKBENCH_RUNNING_JOB_LIMIT);
    const failed = repository
        .listOperations({
        statuses: ["failed"],
        operationTypes: [
            "reference_sidecar_refresh",
            "citation_graph_cache_rebuild",
        ],
        includeCompleted: true,
        limit: SYNTHESIS_WORKBENCH_FAILED_JOB_LIMIT,
    })
        .filter((row) => currentFailure(row, (cacheKey) => cacheByKey.get(cacheKey) ?? null))
        .slice(0, SYNTHESIS_WORKBENCH_FAILED_JOB_LIMIT);
    const backgroundJobs = [...running, ...failed]
        .sort((left, right) => cleanString(right.updatedAt).localeCompare(cleanString(left.updatedAt)) || left.operationId.localeCompare(right.operationId))
        .map(jobFromOperation)
        .filter((row) => Boolean(row));
    return rebuildSynthesisWorkbenchOperationalChromeResult({
        maintenance: {
            cacheReadiness: SYNTHESIS_WORKBENCH_OPERATIONAL_CACHE_DESCRIPTORS.map((descriptor, index) => {
                const row = cacheRows[index];
                const refreshedAt = cleanString(row?.refreshedAt);
                const updatedAt = cleanString(row?.updatedAt);
                const staleReason = cleanString(row?.staleReason);
                return {
                    cacheKey: descriptor.cacheKey,
                    cacheKind: descriptor.cacheKind,
                    status: row?.status ?? "missing",
                    ...(refreshedAt ? { refreshedAt } : {}),
                    ...(updatedAt ? { updatedAt } : {}),
                    ...(staleReason ? { staleReason } : {}),
                };
            }),
            backgroundJobs,
        },
    });
}

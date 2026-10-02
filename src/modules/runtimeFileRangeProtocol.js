export const RUNTIME_FILE_RANGE_PROTOCOL_VERSION = 1;
export const RUNTIME_FILE_RANGE_MAX_BATCH_ENTRIES = 1024;
export const RUNTIME_FILE_RANGE_MAX_BATCH_BYTES = 2 * 1024 * 1024;
export function normalizeRuntimeFileRange(range) {
    return {
        offset: Math.max(0, Math.floor(Number(range?.offset || 0) || 0)),
        length: Math.max(0, Math.floor(Number(range?.length || 0) || 0)),
    };
}
export function partitionRuntimeFileRanges(rangesRaw) {
    const batches = [];
    let batch = [];
    let batchBytes = 0;
    for (const rawRange of rangesRaw) {
        const range = normalizeRuntimeFileRange(rawRange);
        const exceedsEntryBudget = batch.length >= RUNTIME_FILE_RANGE_MAX_BATCH_ENTRIES;
        const exceedsByteBudget = batch.length > 0 &&
            batchBytes + range.length > RUNTIME_FILE_RANGE_MAX_BATCH_BYTES;
        if (exceedsEntryBudget || exceedsByteBudget) {
            batches.push(batch);
            batch = [];
            batchBytes = 0;
        }
        batch.push(range);
        batchBytes += range.length;
    }
    if (batch.length > 0) {
        batches.push(batch);
    }
    return batches;
}

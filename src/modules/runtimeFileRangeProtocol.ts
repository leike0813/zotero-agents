export const RUNTIME_FILE_RANGE_PROTOCOL_VERSION = 1 as const;
export const RUNTIME_FILE_RANGE_MAX_BATCH_ENTRIES = 1024;
export const RUNTIME_FILE_RANGE_MAX_BATCH_BYTES = 2 * 1024 * 1024;

export type RuntimeFileRange = {
  offset: number;
  length: number;
};

export type RuntimeFileRangeRequest = {
  version: typeof RUNTIME_FILE_RANGE_PROTOCOL_VERSION;
  generation: number;
  requestId: number;
  path: string;
  ranges: RuntimeFileRange[];
};

export type RuntimeFileRangeSuccessResponse = {
  version: typeof RUNTIME_FILE_RANGE_PROTOCOL_VERSION;
  generation: number;
  requestId: number;
  ok: true;
  buffer: ArrayBuffer;
  lengths: number[];
};

export type RuntimeFileRangeFailureResponse = {
  version: typeof RUNTIME_FILE_RANGE_PROTOCOL_VERSION;
  generation: number;
  requestId: number;
  ok: false;
  code: "runtime_async_file_io_unavailable" | "runtime_file_range_read_failed";
  message: string;
};

export type RuntimeFileRangeResponse =
  | RuntimeFileRangeSuccessResponse
  | RuntimeFileRangeFailureResponse;

export function normalizeRuntimeFileRange(
  range: RuntimeFileRange,
): RuntimeFileRange {
  return {
    offset: Math.max(0, Math.floor(Number(range?.offset || 0) || 0)),
    length: Math.max(0, Math.floor(Number(range?.length || 0) || 0)),
  };
}

export function partitionRuntimeFileRanges(
  rangesRaw: RuntimeFileRange[],
): RuntimeFileRange[][] {
  const batches: RuntimeFileRange[][] = [];
  let batch: RuntimeFileRange[] = [];
  let batchBytes = 0;
  for (const rawRange of rangesRaw) {
    const range = normalizeRuntimeFileRange(rawRange);
    const exceedsEntryBudget =
      batch.length >= RUNTIME_FILE_RANGE_MAX_BATCH_ENTRIES;
    const exceedsByteBudget =
      batch.length > 0 &&
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

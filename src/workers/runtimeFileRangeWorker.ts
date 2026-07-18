import {
  RUNTIME_FILE_RANGE_PROTOCOL_VERSION,
  normalizeRuntimeFileRange,
  type RuntimeFileRangeRequest,
  type RuntimeFileRangeResponse,
} from "../modules/runtimeFileRangeProtocol";

type SyncReadFile = {
  size: number;
  readBytesInto: (destination: Uint8Array, offset: number) => void;
  close: () => void;
};

type WorkerRuntime = {
  IOUtils?: {
    openFileForSyncReading?: (path: string) => SyncReadFile;
  };
  onmessage: ((event: { data: RuntimeFileRangeRequest }) => void) | null;
  postMessage: (
    response: RuntimeFileRangeResponse,
    transfers?: ArrayBuffer[],
  ) => void;
};

const runtime = globalThis as unknown as WorkerRuntime;

runtime.onmessage = (event) => {
  const request = event.data;
  let file: SyncReadFile | null = null;
  try {
    if (
      request?.version !== RUNTIME_FILE_RANGE_PROTOCOL_VERSION ||
      typeof runtime.IOUtils?.openFileForSyncReading !== "function"
    ) {
      runtime.postMessage({
        version: RUNTIME_FILE_RANGE_PROTOCOL_VERSION,
        generation: Number(request?.generation || 0),
        requestId: Number(request?.requestId || 0),
        ok: false,
        code: "runtime_async_file_io_unavailable",
        message: "worker synchronous random read capability is unavailable",
      });
      return;
    }
    file = runtime.IOUtils.openFileForSyncReading(String(request.path || ""));
    const fileSize = Math.max(0, Number(file.size || 0));
    const ranges = Array.isArray(request.ranges)
      ? request.ranges.map(normalizeRuntimeFileRange)
      : [];
    const lengths = ranges.map((range) =>
      range.offset >= fileSize
        ? 0
        : Math.min(range.length, fileSize - range.offset),
    );
    const packed = new Uint8Array(
      lengths.reduce((total, length) => total + length, 0),
    );
    let cursor = 0;
    ranges.forEach((range, index) => {
      const length = lengths[index];
      if (length <= 0) {
        return;
      }
      file?.readBytesInto(
        packed.subarray(cursor, cursor + length),
        range.offset,
      );
      cursor += length;
    });
    file.close();
    file = null;
    const response: RuntimeFileRangeResponse = {
      version: RUNTIME_FILE_RANGE_PROTOCOL_VERSION,
      generation: request.generation,
      requestId: request.requestId,
      ok: true,
      buffer: packed.buffer,
      lengths,
    };
    runtime.postMessage(response, [packed.buffer]);
  } catch (error) {
    try {
      file?.close();
    } catch {
      // Ignore cleanup failure while reporting the original read error.
    }
    runtime.postMessage({
      version: RUNTIME_FILE_RANGE_PROTOCOL_VERSION,
      generation: Number(request?.generation || 0),
      requestId: Number(request?.requestId || 0),
      ok: false,
      code: "runtime_file_range_read_failed",
      message: String(
        (error as Error)?.message || error || "range read failed",
      ),
    });
  }
};

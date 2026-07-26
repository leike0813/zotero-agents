import { config } from "../../package.json";
import {
  RUNTIME_FILE_RANGE_PROTOCOL_VERSION,
  partitionRuntimeFileRanges,
  type RuntimeFileRange,
  type RuntimeFileRangeRequest,
  type RuntimeFileRangeResponse,
} from "./runtimeFileRangeProtocol";

export type RuntimeFileIoErrorCode =
  | "runtime_async_file_io_unavailable"
  | "runtime_file_range_read_failed";

export class RuntimeFileIoError extends Error {
  readonly code: RuntimeFileIoErrorCode;

  readonly operation: "append" | "range-read";

  constructor(args: {
    code: RuntimeFileIoErrorCode;
    operation: "append" | "range-read";
    message: string;
    cause?: unknown;
  }) {
    super(args.message, args.cause ? { cause: args.cause } : undefined);
    this.name = "RuntimeFileIoError";
    this.code = args.code;
    this.operation = args.operation;
  }
}

export type RuntimeFileRangeWorkerLike = {
  onmessage: ((event: { data: RuntimeFileRangeResponse }) => void) | null;
  onerror: ((event: { message?: string }) => void) | null;
  postMessage: (request: RuntimeFileRangeRequest) => void;
  terminate: () => void;
};

type PendingRangeRequest = {
  resolve: (value: Uint8Array[]) => void;
  reject: (error: RuntimeFileIoError) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type WorkerGeneration = {
  generation: number;
  worker: RuntimeFileRangeWorkerLike;
  pending: Map<number, PendingRangeRequest>;
};

type WorkerFactory = () => RuntimeFileRangeWorkerLike;

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

let workerGeneration: WorkerGeneration | null = null;
let nextGeneration = 0;
let nextRequestId = 0;
let controlledShutdown = false;
let workerFactoryForTests: WorkerFactory | null = null;
let requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS;
let diagnostics = {
  workersCreated: 0,
  physicalBatches: 0,
  rangesRead: 0,
  packedBytes: 0,
};

function rangeReadError(
  message: string,
  cause?: unknown,
  code: RuntimeFileIoErrorCode = "runtime_file_range_read_failed",
) {
  return new RuntimeFileIoError({
    code,
    operation: "range-read",
    message,
    cause,
  });
}

function workerUrl() {
  return `chrome://${config.addonRef}/content/workers/runtime-file-range-worker.js`;
}

function createDefaultWorker(): RuntimeFileRangeWorkerLike {
  const runtime = globalThis as unknown as {
    ChromeWorker?: new (url: string) => RuntimeFileRangeWorkerLike;
  };
  if (typeof runtime.ChromeWorker !== "function") {
    throw rangeReadError(
      "ChromeWorker is unavailable for runtime file range reads",
      undefined,
      "runtime_async_file_io_unavailable",
    );
  }
  return new runtime.ChromeWorker(workerUrl());
}

function rejectGeneration(state: WorkerGeneration, error: RuntimeFileIoError) {
  if (workerGeneration === state) {
    workerGeneration = null;
  }
  try {
    state.worker.terminate();
  } catch {
    // Ignore worker cleanup failures after the generation is invalid.
  }
  for (const pending of state.pending.values()) {
    clearTimeout(pending.timeout);
    pending.reject(error);
  }
  state.pending.clear();
}

function handleWorkerMessage(
  state: WorkerGeneration,
  response: RuntimeFileRangeResponse,
) {
  if (
    response?.version !== RUNTIME_FILE_RANGE_PROTOCOL_VERSION ||
    response.generation !== state.generation
  ) {
    return;
  }
  const pending = state.pending.get(response.requestId);
  if (!pending) {
    return;
  }
  state.pending.delete(response.requestId);
  clearTimeout(pending.timeout);
  if (!response.ok) {
    pending.reject(rangeReadError(response.message, undefined, response.code));
    return;
  }
  if (!Array.isArray(response.lengths)) {
    pending.reject(rangeReadError("range worker returned invalid lengths"));
    return;
  }
  const packed = new Uint8Array(response.buffer);
  const output: Uint8Array[] = [];
  let cursor = 0;
  for (const rawLength of response.lengths) {
    const length = Math.max(0, Math.floor(Number(rawLength || 0) || 0));
    if (cursor + length > packed.length) {
      pending.reject(rangeReadError("range worker returned invalid byte data"));
      return;
    }
    output.push(packed.subarray(cursor, cursor + length));
    cursor += length;
  }
  if (cursor !== packed.length) {
    pending.reject(rangeReadError("range worker returned trailing byte data"));
    return;
  }
  diagnostics.packedBytes += packed.length;
  pending.resolve(output);
}

function ensureWorkerGeneration() {
  if (controlledShutdown) {
    throw rangeReadError(
      "runtime file range reader has shut down",
      undefined,
      "runtime_async_file_io_unavailable",
    );
  }
  if (workerGeneration) {
    return workerGeneration;
  }
  let worker: RuntimeFileRangeWorkerLike;
  try {
    worker = (workerFactoryForTests || createDefaultWorker)();
  } catch (error) {
    if (error instanceof RuntimeFileIoError) {
      throw error;
    }
    throw rangeReadError(
      "failed to create runtime file range worker",
      error,
      "runtime_async_file_io_unavailable",
    );
  }
  const state: WorkerGeneration = {
    generation: ++nextGeneration,
    worker,
    pending: new Map(),
  };
  worker.onmessage = (event) => handleWorkerMessage(state, event.data);
  worker.onerror = (event) => {
    rejectGeneration(
      state,
      rangeReadError(event?.message || "runtime file range worker failed"),
    );
  };
  workerGeneration = state;
  diagnostics.workersCreated += 1;
  return state;
}

async function readWorkerBatch(path: string, ranges: RuntimeFileRange[]) {
  const state = ensureWorkerGeneration();
  const requestId = ++nextRequestId;
  const request: RuntimeFileRangeRequest = {
    version: RUNTIME_FILE_RANGE_PROTOCOL_VERSION,
    generation: state.generation,
    requestId,
    path,
    ranges,
  };
  diagnostics.physicalBatches += 1;
  diagnostics.rangesRead += ranges.length;
  return new Promise<Uint8Array[]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      rejectGeneration(
        state,
        rangeReadError(
          `runtime file range worker timed out after ${requestTimeoutMs}ms`,
        ),
      );
    }, requestTimeoutMs);
    state.pending.set(requestId, { resolve, reject, timeout });
    try {
      state.worker.postMessage(request);
    } catch (error) {
      rejectGeneration(
        state,
        rangeReadError("failed to post runtime file range request", error),
      );
    }
  });
}

export async function readRuntimeFileRangesWithWorker(
  path: string,
  ranges: RuntimeFileRange[],
) {
  const output: Uint8Array[] = [];
  for (const batch of partitionRuntimeFileRanges(ranges)) {
    output.push(...(await readWorkerBatch(path, batch)));
  }
  return output;
}

export function shutdownRuntimeFileRangeReader() {
  controlledShutdown = true;
  if (workerGeneration) {
    rejectGeneration(
      workerGeneration,
      rangeReadError(
        "runtime file range reader shut down",
        undefined,
        "runtime_async_file_io_unavailable",
      ),
    );
  }
}

export function getRuntimeFileRangeReaderDiagnosticsForTests() {
  return { ...diagnostics };
}

export function setRuntimeFileRangeWorkerFactoryForTests(
  factory: WorkerFactory | null,
  options: { timeoutMs?: number } = {},
) {
  resetRuntimeFileRangeReaderForTests();
  workerFactoryForTests = factory;
  requestTimeoutMs = Math.max(
    1,
    Math.floor(Number(options.timeoutMs || DEFAULT_REQUEST_TIMEOUT_MS)),
  );
}

export function resetRuntimeFileRangeReaderForTests() {
  if (workerGeneration) {
    rejectGeneration(
      workerGeneration,
      rangeReadError("runtime file range reader reset"),
    );
  }
  workerGeneration = null;
  workerFactoryForTests = null;
  controlledShutdown = false;
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS;
  diagnostics = {
    workersCreated: 0,
    physicalBatches: 0,
    rangesRead: 0,
    packedBytes: 0,
  };
}

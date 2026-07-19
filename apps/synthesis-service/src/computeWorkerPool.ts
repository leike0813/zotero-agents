import {
  rebuildSynthesisConceptKbIndexResultPayload,
  rebuildSynthesisConceptKbQueryResultPayload,
  type SynthesisConceptKbIndexRequest,
  type SynthesisConceptKbIndexResult,
  type SynthesisConceptKbQueryRequest,
  type SynthesisConceptKbQueryResult,
} from "../../../packages/synthesis-engine/src/conceptKbIndex.js";
import {
  MessageChannel,
  Worker,
  type MessagePort,
  type WorkerOptions,
} from "node:worker_threads";
import { createHash } from "node:crypto";
import {
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphLayoutResult,
  rebuildSynthesisCitationGraphMetricsRequest,
  rebuildSynthesisCitationGraphMetricsResult,
  type SynthesisCitationGraphLayoutRequest,
  type SynthesisCitationGraphLayoutResult,
  type SynthesisCitationGraphMetricsRequest,
  type SynthesisCitationGraphMetricsResult,
} from "../../../packages/synthesis-engine/src/index.js";
import {
  rebuildSynthesisCitationGraphBuildRequest,
  rebuildSynthesisCitationGraphBuildResult,
  type SynthesisCitationGraphBuildRequest,
  type SynthesisCitationGraphBuildResult,
} from "../../../packages/synthesis-engine/src/citationGraphBuild.js";
import type {
  SynthesisSidecarComputePoolSnapshot,
  SynthesisSidecarErrorCode,
} from "../../../packages/synthesis-contracts/src/sidecarSystem.js";
import { SYNTHESIS_SIDECAR_TRANSFER_LIMITS } from "../../../packages/synthesis-contracts/src/sidecarTransfer.js";
import {
  canonicalizeSynthesisEngineJson,
  compareSynthesisEngineStrings,
  countSynthesisEngineJsonNodes,
} from "../../../packages/synthesis-engine/src/canonicalJson.js";
import {
  SYNTHESIS_SIDECAR_COMPUTE_OPERATION,
  SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION,
  SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION,
  SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION,
  SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION,
  SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION,
  SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION,
  SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION,
  type SynthesisSidecarComputeRunMessage,
  type SynthesisSidecarGraphBuildTransferPageFrame,
  type SynthesisSidecarTransferPortWorkerMessage,
} from "./computeProtocol.js";
import {
  rebuildSynthesisTagVocabularyIndexResultPayload,
  rebuildSynthesisTagVocabularyValidationResultPayload,
  type SynthesisTagVocabularyIndexRequest,
  type SynthesisTagVocabularyIndexResult,
  type SynthesisTagVocabularyValidationRequest,
  type SynthesisTagVocabularyValidationResult,
} from "../../../packages/synthesis-engine/src/tagVocabulary.js";
import {
  rebuildSynthesisTopicGraphIndexResultPayload,
  type SynthesisTopicGraphIndexRequest,
  type SynthesisTopicGraphIndexResult,
} from "../../../packages/synthesis-engine/src/topicGraphIndex.js";
import {
  defaultRustComputeWorkerPath,
  RUST_COMPUTE_CANONICAL_ROWS,
  RUST_COMPUTE_RAW_ROWS_ARTIFACT,
  RustComputeWorkerTransport,
  type RustComputeWorkerTransportOptions,
} from "./rustComputeWorkerTransport.js";

const RUST_METRICS_OPERATION = "citation_graph_metrics.v1" as const;

type RustPagedDescriptor = {
  section: string;
  pageIndex: number;
  rowCount: number;
  byteLength: number;
  sha256: string;
};

type RustPagedFrame = {
  descriptor: RustPagedDescriptor;
  rows: unknown[];
  canonicalRows?: Buffer;
};

type RustDeterministicOperation =
  | typeof SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION
  | typeof SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION
  | typeof SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION
  | typeof SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION
  | typeof SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION;

type RustPagedSectionSpec = {
  name: string;
  record: boolean;
};

const RUST_PAGED_RESULT_SECTIONS: Record<
  RustDeterministicOperation,
  readonly RustPagedSectionSpec[]
> = {
  [SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION]: [
    { name: "warnings", record: false },
  ],
  [SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION]: [
    { name: "tags", record: false },
    { name: "aliases", record: true },
    { name: "abbrev", record: true },
    { name: "search", record: false },
    { name: "validationWarnings", record: false },
  ],
  [SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION]: [
    { name: "search", record: false },
    { name: "overlayEntries", record: false },
  ],
  [SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION]: [
    { name: "matches", record: false },
  ],
  [SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION]: [
    { name: "roots", record: false },
    { name: "unplaced", record: false },
  ],
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isRustPagedDescriptor(value: unknown): value is RustPagedDescriptor {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      "section",
      "pageIndex",
      "rowCount",
      "byteLength",
      "sha256",
    ]) &&
    typeof value.section === "string" &&
    value.section.length > 0 &&
    Number.isSafeInteger(value.pageIndex) &&
    (value.pageIndex as number) >= 0 &&
    Number.isSafeInteger(value.rowCount) &&
    (value.rowCount as number) >= 0 &&
    Number.isSafeInteger(value.byteLength) &&
    (value.byteLength as number) >= 0 &&
    typeof value.sha256 === "string" &&
    /^sha256:[0-9a-f]{64}$/.test(value.sha256)
  );
}

function deterministicResultSections(operation: Task["operation"]) {
  if (operation === RUST_METRICS_OPERATION) return undefined;
  return RUST_PAGED_RESULT_SECTIONS[operation as RustDeterministicOperation];
}

function rustPageArtifact(
  section: string,
  pageIndex: number,
  rows: unknown[],
  knownNodeCount?: number,
  knownCanonical?: Buffer,
): RustPagedFrame {
  const canonical =
    knownCanonical ?? Buffer.from(canonicalizeSynthesisEngineJson(rows));
  const byteLength = canonical.length;
  const nodeCount = knownNodeCount ?? countSynthesisEngineJsonNodes(rows);
  if (
    byteLength > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageBytes ||
    nodeCount > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageJsonNodes
  ) {
    throw poolError("worker_result_invalid");
  }
  return {
    descriptor: {
      section,
      pageIndex,
      rowCount: rows.length,
      byteLength,
      sha256: `sha256:${createHash("sha256").update(canonical).digest("hex")}`,
    },
    rows,
    ...(knownCanonical ? { canonicalRows: knownCanonical } : {}),
  };
}

function rustPageRowShape(row: unknown) {
  if (!isPlainObject(row)) {
    const flatArray =
      Array.isArray(row) &&
      row.every((entry) => !entry || typeof entry !== "object");
    return {
      directlyCanonical: !Array.isArray(row) || flatArray,
      nodeCount: flatArray
        ? 1 + row.length
        : countSynthesisEngineJsonNodes(row),
    };
  }
  const keys = Object.keys(row);
  let nodeCount = 1;
  let directlyCanonical = true;
  let previousKey: string | undefined;
  for (const key of keys) {
    const value = row[key];
    if (value === undefined) continue;
    const flatArray =
      Array.isArray(value) &&
      value.every((entry) => !entry || typeof entry !== "object");
    if (value && typeof value === "object" && !flatArray) {
      return {
        directlyCanonical: false,
        nodeCount: countSynthesisEngineJsonNodes(row),
      };
    }
    nodeCount += 1 + (Array.isArray(value) ? 1 + value.length : 1);
    if (
      previousKey !== undefined &&
      compareSynthesisEngineStrings(previousKey, key) > 0
    ) {
      directlyCanonical = false;
    }
    previousKey = key;
  }
  return { directlyCanonical, nodeCount };
}

function canonicalizeRustPageRows(rows: unknown[]) {
  return Buffer.from(
    rows.every((row) => rustPageRowShape(row).directlyCanonical)
      ? JSON.stringify(rows)
      : canonicalizeSynthesisEngineJson(rows),
  );
}

function rustPageArtifactFromRows(
  section: string,
  pageIndex: number,
  rows: unknown[],
) {
  const nodeCount =
    1 +
    rows.reduce<number>(
      (total, row) => total + rustPageRowShape(row).nodeCount,
      0,
    );
  return rustPageArtifact(
    section,
    pageIndex,
    rows,
    nodeCount,
    canonicalizeRustPageRows(rows),
  );
}

function splitRustPageRows(
  section: string,
  pageIndex: number,
  rows: unknown[],
  nodeCounts: number[],
  directlyCanonical: boolean,
): RustPagedFrame[] {
  const canonical = Buffer.from(
    directlyCanonical
      ? JSON.stringify(rows)
      : canonicalizeSynthesisEngineJson(rows),
  );
  if (canonical.length <= SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageBytes) {
    return [
      rustPageArtifact(
        section,
        pageIndex,
        rows,
        1 + nodeCounts.reduce((total, nodes) => total + nodes, 0),
        canonical,
      ),
    ];
  }
  if (rows.length <= 1) throw poolError("worker_result_invalid");
  const middle = Math.floor(rows.length / 2);
  const left = splitRustPageRows(
    section,
    pageIndex,
    rows.slice(0, middle),
    nodeCounts.slice(0, middle),
    directlyCanonical,
  );
  return [
    ...left,
    ...splitRustPageRows(
      section,
      pageIndex + left.length,
      rows.slice(middle),
      nodeCounts.slice(middle),
      directlyCanonical,
    ),
  ];
}

function* paginateRustRows(section: string, rows: unknown[]) {
  let pageIndex = 0;
  let pageRows: unknown[] = [];
  let pageNodeCounts: number[] = [];
  let pageNodes = 1;
  let pageDirectlyCanonical = true;
  const takePages = () => {
    const pages = splitRustPageRows(
      section,
      pageIndex,
      pageRows,
      pageNodeCounts,
      pageDirectlyCanonical,
    );
    pageIndex += pages.length;
    pageRows = [];
    pageNodeCounts = [];
    pageNodes = 1;
    pageDirectlyCanonical = true;
    return pages;
  };
  for (const row of rows) {
    const shape = rustPageRowShape(row);
    const nodes = shape.nodeCount;
    if (
      pageRows.length &&
      pageNodes + nodes > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageJsonNodes
    ) {
      yield* takePages();
    }
    if (nodes + 1 > SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageJsonNodes) {
      throw poolError("worker_result_invalid");
    }
    pageRows.push(row);
    pageNodeCounts.push(nodes);
    pageNodes += nodes;
    pageDirectlyCanonical &&= shape.directlyCanonical;
  }
  yield* takePages();
}

function extractRustPagedRequest(
  operation: Task["operation"],
  request: Exclude<Task["request"], SynthesisSidecarGraphBuildTransferRun>,
) {
  const source = request as unknown as Record<string, unknown>;
  const header = { ...source };
  const sections: Array<[string, unknown[]]> = [];
  const takeArray = (name: string) => {
    const rows = source[name];
    if (!Array.isArray(rows)) throw poolError("worker_result_invalid");
    delete header[name];
    sections.push([name, rows]);
  };
  const takeRecord = (name: string) => {
    const value = source[name];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw poolError("worker_result_invalid");
    }
    delete header[name];
    sections.push([
      name,
      Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        compareSynthesisEngineStrings(left, right),
      ),
    ]);
  };
  if (
    operation === SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION ||
    operation === SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION
  ) {
    takeArray("entries");
    takeRecord("aliases");
    takeRecord("abbrev");
  } else if (
    operation === SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION ||
    operation === SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION
  ) {
    takeArray("concepts");
    takeArray("senses");
    takeArray("aliases");
    if (operation === SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION) {
      takeArray("labels");
    }
  } else if (operation === SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION) {
    takeArray("nodes");
    takeArray("edges");
  } else {
    throw poolError("worker_result_invalid");
  }
  return {
    header,
    pages: (function* () {
      for (const [section, rows] of sections) {
        yield* paginateRustRows(section, rows);
      }
    })(),
  };
}

function assembleRustPagedResult(
  header: Record<string, unknown>,
  sections: Map<string, unknown[]>,
) {
  const result = { ...header };
  for (const [section, rows] of sections) {
    result[section] =
      section === "aliases" || section === "abbrev"
        ? Object.fromEntries(rows as [string, unknown][])
        : rows;
  }
  return result;
}

function isRustComputeOperation(operation: Task["operation"]) {
  return (
    operation === RUST_METRICS_OPERATION ||
    operation === SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION ||
    operation === SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION ||
    operation === SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION ||
    operation === SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION ||
    operation === SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION
  );
}

export const SYNTHESIS_SIDECAR_COMPUTE_LIMITS = Object.freeze({
  concurrency: 1,
  maxQueued: 2,
  executionTimeoutMs: 5_000,
  cancellationGraceMs: 100,
  shutdownTimeoutMs: 500,
  resourceLimits: Object.freeze({
    maxOldGenerationSizeMb: 256,
    maxYoungGenerationSizeMb: 32,
    stackSizeMb: 4,
  }),
});
export const SYNTHESIS_SIDECAR_TRANSFER_EXECUTION_TIMEOUT_MS = 30_000;

export type SynthesisSidecarGraphBuildTransferRun = {
  header: Record<string, unknown>;
  inputPages(): AsyncIterable<SynthesisSidecarGraphBuildTransferPageFrame>;
  outputStarted(): void | Promise<void>;
  outputPage(
    frame: SynthesisSidecarGraphBuildTransferPageFrame,
  ): void | Promise<void>;
  outputComplete(header: Record<string, unknown>): void | Promise<void>;
};

type WorkerErrorCode = Extract<
  SynthesisSidecarErrorCode,
  | "worker_busy"
  | "worker_timeout"
  | "worker_canceled"
  | "worker_crashed"
  | "worker_result_invalid"
  | "worker_unavailable"
>;

export class ComputeWorkerPoolError extends Error {
  readonly code: WorkerErrorCode;
  readonly retryable: boolean;

  constructor(code: WorkerErrorCode) {
    super(code);
    this.name = "ComputeWorkerPoolError";
    this.code = code;
    this.retryable = code !== "worker_canceled";
  }
}

type Task = {
  id: string;
  operation:
    | typeof SYNTHESIS_SIDECAR_COMPUTE_OPERATION
    | typeof RUST_METRICS_OPERATION
    | typeof SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION
    | typeof SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION
    | typeof SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION
    | typeof SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION
    | typeof SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION
    | typeof SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION
    | typeof SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION;
  request:
    | SynthesisCitationGraphLayoutRequest
    | SynthesisCitationGraphMetricsRequest
    | SynthesisCitationGraphBuildRequest
    | SynthesisTagVocabularyValidationRequest
    | SynthesisTagVocabularyIndexRequest
    | SynthesisConceptKbIndexRequest
    | SynthesisConceptKbQueryRequest
    | SynthesisTopicGraphIndexRequest
    | SynthesisSidecarGraphBuildTransferRun;
  cancellation: Int32Array;
  resolve(
    result:
      | SynthesisCitationGraphLayoutResult
      | SynthesisCitationGraphMetricsResult
      | SynthesisCitationGraphBuildResult
      | SynthesisTagVocabularyValidationResult
      | SynthesisTagVocabularyIndexResult
      | SynthesisConceptKbIndexResult
      | SynthesisConceptKbQueryResult
      | SynthesisTopicGraphIndexResult
      | void,
  ): void;
  reject(error: unknown): void;
  signal?: AbortSignal;
  abortListener?: () => void;
  deadline?: NodeJS.Timeout;
  settled: boolean;
  terminating: boolean;
  acknowledgeCancellation?: () => void;
  timeoutMs: number;
  transferPort?: MessagePort;
  rustInputPages?: RustPagedFrame[];
  rustInputPageIterator?: Iterator<RustPagedFrame>;
  rustOutputHeader?: Record<string, unknown>;
  rustOutputSections?: Map<string, unknown[]>;
  rustOutputPageCounts?: Map<string, number>;
  rustProtocolPhase?: "input" | "awaiting_result" | "result";
  rustOutputSectionIndex?: number;
};

export type SynthesisSidecarComputeWorkerPool = {
  runCitationGraphLayout(
    request: SynthesisCitationGraphLayoutRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisCitationGraphLayoutResult>;
  runCitationGraphMetrics(
    request: SynthesisCitationGraphMetricsRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisCitationGraphMetricsResult>;
  runCitationGraphBuild(
    request: SynthesisCitationGraphBuildRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisCitationGraphBuildResult>;
  runTagVocabularyValidation(
    request: SynthesisTagVocabularyValidationRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisTagVocabularyValidationResult>;
  runTagVocabularyIndex(
    request: SynthesisTagVocabularyIndexRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisTagVocabularyIndexResult>;
  runConceptKbIndex(
    request: SynthesisConceptKbIndexRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisConceptKbIndexResult>;
  runConceptKbQuery(
    request: SynthesisConceptKbQueryRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisConceptKbQueryResult>;
  runTopicGraphIndex(
    request: SynthesisTopicGraphIndexRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisTopicGraphIndexResult>;
  runCitationGraphBuildTransfer(
    run: SynthesisSidecarGraphBuildTransferRun,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
  snapshot(): SynthesisSidecarComputePoolSnapshot;
  shutdown(): Promise<void>;
};

type PoolOptions = {
  workerUrl?: URL | string;
  workerFactory?: (url: URL | string, options: WorkerOptions) => Worker;
  executionTimeoutMs?: number;
  cancellationGraceMs?: number;
  shutdownTimeoutMs?: number;
  transferExecutionTimeoutMs?: number;
  rustWorkerPath?: string;
  rustWorkerArguments?: string[];
  rustWorkerFactory?: (
    options: RustComputeWorkerTransportOptions,
  ) => RustComputeWorkerTarget;
};

type RustComputeWorkerTarget = Pick<
  RustComputeWorkerTransport,
  "on" | "once" | "postMessage" | "terminate"
>;

type ComputeWorkerTarget = Worker | RustComputeWorkerTarget;

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function poolError(code: WorkerErrorCode) {
  return new ComputeWorkerPoolError(code);
}

function prefetchRustInputPage(task: Task) {
  if (!task.rustInputPageIterator || (task.rustInputPages?.length ?? 0) >= 2) {
    return;
  }
  const next = task.rustInputPageIterator.next();
  if (next.done) {
    task.rustInputPageIterator = undefined;
  } else {
    task.rustInputPages?.push(next.value);
  }
}

export function createSynthesisSidecarComputeWorkerPool(
  options: PoolOptions = {},
): SynthesisSidecarComputeWorkerPool {
  const workerUrl =
    options.workerUrl ?? new URL("./computeWorker.js", import.meta.url);
  const workerFactory =
    options.workerFactory ??
    ((url, workerOptions) => new Worker(url, workerOptions));
  const rustWorkerPath =
    options.rustWorkerPath ?? defaultRustComputeWorkerPath();
  const executionTimeoutMs =
    options.executionTimeoutMs ??
    SYNTHESIS_SIDECAR_COMPUTE_LIMITS.executionTimeoutMs;
  const cancellationGraceMs =
    options.cancellationGraceMs ??
    SYNTHESIS_SIDECAR_COMPUTE_LIMITS.cancellationGraceMs;
  const shutdownTimeoutMs =
    options.shutdownTimeoutMs ??
    SYNTHESIS_SIDECAR_COMPUTE_LIMITS.shutdownTimeoutMs;
  const transferExecutionTimeoutMs =
    options.transferExecutionTimeoutMs ??
    SYNTHESIS_SIDECAR_TRANSFER_EXECUTION_TIMEOUT_MS;
  const queue: Task[] = [];
  const expectedExits = new WeakSet<object>();
  let worker: Worker | null = null;
  let rustWorker: RustComputeWorkerTarget | null = null;
  let active: Task | null = null;
  let stopping = false;
  let degraded = false;
  let taskSequence = 0;
  let restartCount = 0;
  let failureCount = 0;
  let consecutiveFailures = 0;
  let termination: Promise<void> | null = null;
  let shutdownPromise: Promise<void> | null = null;

  const trackTermination = (pending: Promise<void>) => {
    termination = pending;
    void pending.finally(() => {
      if (termination === pending) {
        termination = null;
      }
      pump();
    });
  };

  const snapshot = (): SynthesisSidecarComputePoolSnapshot => ({
    state: stopping
      ? "stopping"
      : degraded
        ? "degraded"
        : active
          ? "busy"
          : "idle",
    active: active ? 1 : 0,
    queued: queue.length,
    restartCount,
    failureCount,
  });

  const clearTaskHooks = (task: Task) => {
    if (task.deadline) {
      clearTimeout(task.deadline);
      task.deadline = undefined;
    }
    if (task.signal && task.abortListener) {
      task.signal.removeEventListener("abort", task.abortListener);
      task.abortListener = undefined;
    }
    task.transferPort?.close();
    task.transferPort = undefined;
  };

  const rejectTask = (task: Task, code: WorkerErrorCode) => {
    if (task.settled) {
      return;
    }
    task.settled = true;
    clearTaskHooks(task);
    task.reject(poolError(code));
  };

  const rejectTaskWithError = (task: Task, error: unknown) => {
    if (task.settled) {
      return;
    }
    task.settled = true;
    clearTaskHooks(task);
    task.reject(error);
  };

  const rejectQueue = (code: WorkerErrorCode) => {
    for (const task of queue.splice(0)) {
      rejectTask(task, code);
    }
  };

  const recordRuntimeFailure = () => {
    restartCount += 1;
    failureCount += 1;
    consecutiveFailures += 1;
    if (consecutiveFailures >= 3) {
      degraded = true;
      rejectQueue("worker_unavailable");
    }
  };

  const terminateWorker = async (
    target: ComputeWorkerTarget,
    graceMs: number,
  ) => {
    expectedExits.add(target);
    if (worker === target) {
      worker = null;
    }
    if (rustWorker === target) {
      rustWorker = null;
    }
    const terminate = target.terminate().then(
      () => undefined,
      () => undefined,
    );
    await Promise.race([terminate, delay(graceMs)]);
  };

  let pump = () => undefined;

  const finishRuntimeFailure = (
    task: Task,
    code: "worker_crashed" | "worker_result_invalid",
    target: ComputeWorkerTarget | null,
  ) => {
    if (task !== active || task.terminating) {
      return;
    }
    task.terminating = true;
    recordRuntimeFailure();
    const pending = (async () => {
      if (target) {
        await terminateWorker(target, cancellationGraceMs);
      }
      if (active === task) {
        active = null;
      }
      rejectTask(task, code);
    })();
    trackTermination(pending);
  };

  const requestCooperativeCancellation = (
    task: Task,
    target: ComputeWorkerTarget | null,
  ) => {
    let acknowledged = false;
    const acknowledgment = new Promise<void>((resolve) => {
      task.acknowledgeCancellation = () => {
        acknowledged = true;
        resolve();
      };
    });
    Atomics.store(task.cancellation, 0, 1);
    target?.postMessage({ type: "cancel", taskId: task.id });
    return {
      wait: Promise.race([acknowledgment, delay(cancellationGraceMs)]).then(
        () => acknowledged,
      ),
      dispose() {
        task.acknowledgeCancellation = undefined;
      },
    };
  };

  const timeoutActive = (task: Task, target: ComputeWorkerTarget | null) => {
    if (task !== active || task.terminating) {
      return;
    }
    task.terminating = true;
    recordRuntimeFailure();
    const cooperative = requestCooperativeCancellation(task, target);
    const pending = (async () => {
      await cooperative.wait;
      cooperative.dispose();
      if (target) {
        await terminateWorker(target, cancellationGraceMs);
      }
      if (active === task) {
        active = null;
      }
      rejectTask(task, "worker_timeout");
    })();
    trackTermination(pending);
  };

  const cancelActive = (task: Task, code: "worker_canceled") => {
    if (task !== active || task.terminating) {
      return;
    }
    task.terminating = true;
    const target = isRustComputeOperation(task.operation) ? rustWorker : worker;
    const cooperative = requestCooperativeCancellation(task, target);
    const pending = (async () => {
      const acknowledged = await cooperative.wait;
      cooperative.dispose();
      if (target && !acknowledged) {
        await terminateWorker(target, cancellationGraceMs);
      }
      if (active === task) {
        active = null;
      }
      rejectTask(task, code);
    })();
    trackTermination(pending);
  };

  const onUnexpectedWorkerFailure = (target: ComputeWorkerTarget) => {
    if (
      (worker !== target && rustWorker !== target) ||
      expectedExits.has(target)
    ) {
      return;
    }
    if (worker === target) worker = null;
    if (rustWorker === target) rustWorker = null;
    const task = active;
    if (task) {
      finishRuntimeFailure(task, "worker_crashed", null);
    } else {
      recordRuntimeFailure();
      pump();
    }
  };

  class TransferProtocolError extends Error {}

  const waitForPortMessage = (
    port: MessagePort,
  ): Promise<SynthesisSidecarTransferPortWorkerMessage> =>
    new Promise((resolve, reject) => {
      const cleanup = () => {
        port.off("message", onMessage);
        port.off("messageerror", onError);
        port.off("close", onClose);
      };
      const onMessage = (message: unknown) => {
        cleanup();
        resolve(message as SynthesisSidecarTransferPortWorkerMessage);
      };
      const onError = () => {
        cleanup();
        reject(new TransferProtocolError());
      };
      const onClose = () => {
        cleanup();
        reject(new TransferProtocolError());
      };
      port.once("message", onMessage);
      port.once("messageerror", onError);
      port.once("close", onClose);
    });

  const finishTransferSuccess = (task: Task) => {
    if (task !== active || task.terminating || task.settled) {
      return;
    }
    active = null;
    task.settled = true;
    clearTaskHooks(task);
    consecutiveFailures = 0;
    task.resolve(undefined);
    pump();
  };

  const finishTransferControlFailure = (
    task: Task,
    error: unknown,
    target: Worker,
  ) => {
    if (task !== active || task.terminating) {
      return;
    }
    task.terminating = true;
    const pending = (async () => {
      await terminateWorker(target, cancellationGraceMs);
      if (active === task) {
        active = null;
      }
      rejectTaskWithError(task, error);
    })();
    trackTermination(pending);
  };

  const streamTransferTask = async (
    task: Task,
    target: Worker,
    port: MessagePort,
  ) => {
    const run = task.request as SynthesisSidecarGraphBuildTransferRun;
    try {
      for await (const frame of run.inputPages()) {
        if (task.terminating) {
          return;
        }
        port.postMessage(
          {
            type: "input_page",
            descriptor: frame.descriptor,
            bytes: frame.bytes,
          },
          [frame.bytes],
        );
        const acknowledgment = await waitForPortMessage(port);
        if (
          acknowledgment.type !== "input_ack" ||
          acknowledgment.kind !== frame.descriptor.kind ||
          acknowledgment.pageIndex !== frame.descriptor.pageIndex
        ) {
          throw new TransferProtocolError();
        }
      }
      port.postMessage({ type: "input_complete" });
      let outputStarted = false;
      while (!task.terminating) {
        const message = await waitForPortMessage(port);
        if (message.type === "output_started" && !outputStarted) {
          outputStarted = true;
          await run.outputStarted();
          continue;
        }
        if (
          message.type === "output_page" &&
          outputStarted &&
          message.bytes instanceof ArrayBuffer
        ) {
          await run.outputPage({
            descriptor: message.descriptor,
            bytes: message.bytes,
          });
          port.postMessage({
            type: "output_ack",
            kind: message.descriptor.kind,
            pageIndex: message.descriptor.pageIndex,
          });
          continue;
        }
        if (message.type === "output_complete" && outputStarted) {
          await run.outputComplete(message.header);
          finishTransferSuccess(task);
          return;
        }
        throw new TransferProtocolError();
      }
    } catch (error) {
      if (task.terminating || task !== active) {
        return;
      }
      if (error instanceof TransferProtocolError) {
        finishRuntimeFailure(task, "worker_result_invalid", target);
      } else {
        finishTransferControlFailure(task, error, target);
      }
    }
  };

  const ensureWorker = () => {
    if (worker) {
      return worker;
    }
    const created = workerFactory(workerUrl, {
      resourceLimits: {
        ...SYNTHESIS_SIDECAR_COMPUTE_LIMITS.resourceLimits,
      },
    });
    worker = created;
    created.on("message", (message: unknown) => {
      const task = active;
      if (!task) {
        return;
      }
      if (task.operation === SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION) {
        finishRuntimeFailure(task, "worker_result_invalid", created);
        return;
      }
      if (
        !message ||
        typeof message !== "object" ||
        (message as { taskId?: unknown }).taskId !== task.id
      ) {
        finishRuntimeFailure(task, "worker_result_invalid", created);
        return;
      }
      const response = message as {
        type?: unknown;
        result?: unknown;
      };
      if (response.type === "canceled" && task.terminating) {
        task.acknowledgeCancellation?.();
        return;
      }
      if (task.terminating) {
        return;
      }
      if (response.type === "result") {
        let result:
          | SynthesisCitationGraphLayoutResult
          | SynthesisCitationGraphMetricsResult
          | SynthesisCitationGraphBuildResult
          | SynthesisTagVocabularyValidationResult
          | SynthesisTagVocabularyIndexResult
          | SynthesisConceptKbIndexResult
          | SynthesisConceptKbQueryResult
          | SynthesisTopicGraphIndexResult
          | undefined;
        try {
          switch (task.operation) {
            case SYNTHESIS_SIDECAR_COMPUTE_OPERATION:
              result = rebuildSynthesisCitationGraphLayoutResult(
                response.result,
                task.request as SynthesisCitationGraphLayoutRequest,
              );
              break;
            case SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION:
              result = rebuildSynthesisCitationGraphBuildResult(
                response.result,
                task.request as SynthesisCitationGraphBuildRequest,
              );
              break;
            case SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION:
              result = rebuildSynthesisTagVocabularyValidationResultPayload(
                response.result,
              );
              break;
            case SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION:
              result = rebuildSynthesisTagVocabularyIndexResultPayload(
                response.result,
              );
              break;
            case SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION:
              result = rebuildSynthesisConceptKbIndexResultPayload(
                response.result,
              );
              break;
            case SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION:
              result = rebuildSynthesisConceptKbQueryResultPayload(
                response.result,
              );
              break;
            case SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION:
              result = rebuildSynthesisTopicGraphIndexResultPayload(
                response.result,
              );
              break;
          }
        } catch {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        if (!result) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        active = null;
        task.settled = true;
        clearTaskHooks(task);
        consecutiveFailures = 0;
        task.resolve(result);
        pump();
        return;
      }
      if (response.type === "canceled") {
        cancelActive(task, "worker_canceled");
        return;
      }
      finishRuntimeFailure(task, "worker_crashed", created);
    });
    created.once("error", () => onUnexpectedWorkerFailure(created));
    created.once("exit", () => onUnexpectedWorkerFailure(created));
    return created;
  };

  const ensureRustWorker = () => {
    if (rustWorker) {
      return rustWorker;
    }
    const created = (
      options.rustWorkerFactory ??
      ((transportOptions) => new RustComputeWorkerTransport(transportOptions))
    )({
      executablePath: rustWorkerPath,
      arguments: options.rustWorkerArguments,
    });
    rustWorker = created;
    created.on("message", (message: unknown) => {
      const task = active;
      if (!task || !isRustComputeOperation(task.operation)) {
        return;
      }
      if (
        !message ||
        typeof message !== "object" ||
        (message as { taskId?: unknown }).taskId !== task.id
      ) {
        finishRuntimeFailure(task, "worker_result_invalid", created);
        return;
      }
      let response = message as Record<string, unknown> & {
        type?: unknown;
        result?: unknown;
        header?: unknown;
        descriptor?: unknown;
        rows?: unknown;
        section?: unknown;
        pageIndex?: unknown;
      };
      let assembledPagedResult = false;
      if (response.type === "canceled" && task.terminating) {
        task.acknowledgeCancellation?.();
        return;
      }
      if (task.terminating) {
        return;
      }
      if (response.type === "input_ack") {
        if (
          task.rustProtocolPhase !== "input" ||
          !hasExactKeys(response, [
            "protocol",
            "type",
            "taskId",
            "section",
            "pageIndex",
          ])
        ) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        const page = task.rustInputPages?.[0];
        if (
          !page ||
          response.section !== page.descriptor.section ||
          response.pageIndex !== page.descriptor.pageIndex
        ) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        task.rustInputPages?.shift();
        const next = task.rustInputPages?.[0];
        if (!next) {
          task.rustProtocolPhase = "awaiting_result";
        }
        created.postMessage(
          next
            ? {
                type: "input_page",
                taskId: task.id,
                descriptor: next.descriptor,
                rows: next.rows,
                [RUST_COMPUTE_CANONICAL_ROWS]: next.canonicalRows,
              }
            : { type: "input_complete", taskId: task.id },
        );
        if (next) prefetchRustInputPage(task);
        return;
      }
      if (response.type === "result_begin") {
        const sectionSpecs = deterministicResultSections(task.operation);
        if (
          !sectionSpecs ||
          task.rustProtocolPhase !== "awaiting_result" ||
          task.rustOutputHeader ||
          !hasExactKeys(response, ["protocol", "type", "taskId", "header"]) ||
          !isPlainObject(response.header) ||
          sectionSpecs.some(
            (section) =>
              section.name in (response.header as Record<string, unknown>),
          )
        ) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        task.rustOutputHeader = response.header;
        task.rustOutputSections = new Map();
        task.rustOutputPageCounts = new Map();
        task.rustOutputSectionIndex = 0;
        task.rustProtocolPhase = "result";
        return;
      }
      if (response.type === "result_page") {
        const sectionSpecs = deterministicResultSections(task.operation);
        if (
          !sectionSpecs ||
          task.rustProtocolPhase !== "result" ||
          !task.rustOutputHeader ||
          !hasExactKeys(response, [
            "protocol",
            "type",
            "taskId",
            "descriptor",
            "rows",
          ]) ||
          !isRustPagedDescriptor(response.descriptor) ||
          !Array.isArray(response.rows)
        ) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        const descriptor = response.descriptor;
        let sectionIndex = task.rustOutputSectionIndex ?? 0;
        let sectionSpec = sectionSpecs[sectionIndex];
        if (
          descriptor.section !== sectionSpec?.name &&
          sectionIndex + 1 < sectionSpecs.length &&
          descriptor.section === sectionSpecs[sectionIndex + 1]?.name &&
          descriptor.pageIndex === 0 &&
          (task.rustOutputPageCounts?.get(sectionSpec?.name || "") ?? 0) > 0
        ) {
          sectionIndex += 1;
          sectionSpec = sectionSpecs[sectionIndex];
          task.rustOutputSectionIndex = sectionIndex;
        }
        if (!sectionSpec || descriptor.section !== sectionSpec.name) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        const expectedIndex =
          task.rustOutputPageCounts?.get(descriptor.section) ?? 0;
        let verified: RustPagedFrame;
        try {
          const rawArtifact = (response as Record<PropertyKey, unknown>)[
            RUST_COMPUTE_RAW_ROWS_ARTIFACT
          ] as
            | {
                byteLength?: unknown;
                nodeCount?: unknown;
                sha256?: unknown;
              }
            | undefined;
          if (
            rawArtifact &&
            Number.isSafeInteger(rawArtifact.byteLength) &&
            (rawArtifact.byteLength as number) <=
              SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageBytes &&
            Number.isSafeInteger(rawArtifact.nodeCount) &&
            (rawArtifact.nodeCount as number) <=
              SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageJsonNodes &&
            typeof rawArtifact.sha256 === "string" &&
            response.rows.length <=
              SYNTHESIS_SIDECAR_TRANSFER_LIMITS.pageJsonNodes
          ) {
            verified = {
              descriptor: {
                section: descriptor.section,
                pageIndex: expectedIndex,
                rowCount: response.rows.length,
                byteLength: rawArtifact.byteLength as number,
                sha256: rawArtifact.sha256,
              },
              rows: response.rows,
            };
          } else {
            verified = rustPageArtifactFromRows(
              descriptor.section,
              expectedIndex,
              response.rows,
            );
          }
        } catch {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        if (
          verified.descriptor.section !== descriptor.section ||
          verified.descriptor.pageIndex !== descriptor.pageIndex ||
          verified.descriptor.rowCount !== descriptor.rowCount ||
          verified.descriptor.byteLength !== descriptor.byteLength ||
          verified.descriptor.sha256 !== descriptor.sha256
        ) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        const existingRows =
          task.rustOutputSections?.get(descriptor.section) ?? [];
        if (sectionSpec.record) {
          const keys = new Set(
            existingRows.map((row) => (row as [string, unknown])[0]),
          );
          for (const row of response.rows) {
            if (
              !Array.isArray(row) ||
              row.length !== 2 ||
              typeof row[0] !== "string" ||
              keys.has(row[0])
            ) {
              finishRuntimeFailure(task, "worker_result_invalid", created);
              return;
            }
            keys.add(row[0]);
          }
        }
        existingRows.push(...response.rows);
        task.rustOutputSections?.set(descriptor.section, existingRows);
        task.rustOutputPageCounts?.set(descriptor.section, expectedIndex + 1);
        created.postMessage({
          type: "result_ack",
          taskId: task.id,
          section: descriptor.section,
          pageIndex: descriptor.pageIndex,
        });
        return;
      }
      if (response.type === "result_complete") {
        const sectionSpecs = deterministicResultSections(task.operation);
        if (
          !sectionSpecs ||
          task.rustProtocolPhase !== "result" ||
          !hasExactKeys(response, ["protocol", "type", "taskId"]) ||
          !task.rustOutputHeader ||
          !task.rustOutputSections ||
          task.rustOutputSectionIndex !== sectionSpecs.length - 1 ||
          sectionSpecs.some(
            (section) =>
              !task.rustOutputSections?.has(section.name) ||
              (task.rustOutputPageCounts?.get(section.name) ?? 0) < 1,
          )
        ) {
          finishRuntimeFailure(task, "worker_result_invalid", created);
          return;
        }
        response = {
          type: "result",
          result: assembleRustPagedResult(
            task.rustOutputHeader,
            task.rustOutputSections,
          ),
        };
        assembledPagedResult = true;
      }
      if (
        response.type === "result" &&
        task.operation !== RUST_METRICS_OPERATION &&
        !assembledPagedResult
      ) {
        finishRuntimeFailure(task, "worker_result_invalid", created);
        return;
      }
      if (response.type !== "result") {
        finishRuntimeFailure(task, "worker_result_invalid", created);
        return;
      }
      let result:
        | SynthesisCitationGraphMetricsResult
        | SynthesisTagVocabularyValidationResult
        | SynthesisTagVocabularyIndexResult
        | SynthesisConceptKbIndexResult
        | SynthesisConceptKbQueryResult
        | SynthesisTopicGraphIndexResult;
      try {
        switch (task.operation) {
          case RUST_METRICS_OPERATION:
            result = rebuildSynthesisCitationGraphMetricsResult(
              response.result,
              task.request as SynthesisCitationGraphMetricsRequest,
            );
            break;
          case SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION:
            result = rebuildSynthesisTagVocabularyValidationResultPayload(
              response.result,
            );
            break;
          case SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION:
            result = rebuildSynthesisTagVocabularyIndexResultPayload(
              response.result,
            );
            break;
          case SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION:
            result = rebuildSynthesisConceptKbIndexResultPayload(
              response.result,
            );
            break;
          case SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION:
            result = rebuildSynthesisConceptKbQueryResultPayload(
              response.result,
            );
            break;
          case SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION:
            result = rebuildSynthesisTopicGraphIndexResultPayload(
              response.result,
            );
            break;
        }
      } catch {
        finishRuntimeFailure(task, "worker_result_invalid", created);
        return;
      }
      active = null;
      task.settled = true;
      clearTaskHooks(task);
      consecutiveFailures = 0;
      task.resolve(result);
      pump();
    });
    created.once("error", () => onUnexpectedWorkerFailure(created));
    created.once("exit", () => onUnexpectedWorkerFailure(created));
    return created;
  };

  pump = () => {
    if (active || termination || stopping || degraded) {
      return;
    }
    const task = queue.shift();
    if (!task) {
      return;
    }
    if (task.signal?.aborted) {
      rejectTask(task, "worker_canceled");
      queueMicrotask(pump);
      return;
    }
    const rustTask = isRustComputeOperation(task.operation);
    const inactiveBackend = rustTask ? worker : rustWorker;
    if (inactiveBackend) {
      queue.unshift(task);
      trackTermination(terminateWorker(inactiveBackend, cancellationGraceMs));
      return;
    }
    active = task;
    const target = rustTask ? ensureRustWorker() : ensureWorker();
    task.deadline = setTimeout(() => {
      timeoutActive(task, target);
    }, task.timeoutMs);
    task.deadline.unref();
    const cancellation = task.cancellation.buffer as SharedArrayBuffer;
    if (task.operation === SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION) {
      const channel = new MessageChannel();
      task.transferPort = channel.port1;
      const run = task.request as SynthesisSidecarGraphBuildTransferRun;
      const message: SynthesisSidecarComputeRunMessage = {
        type: "run",
        taskId: task.id,
        operation: SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION,
        header: run.header,
        port: channel.port2,
        cancellation,
      };
      const nodeTarget = target as Worker;
      nodeTarget.postMessage(message, [channel.port2]);
      void streamTransferTask(task, nodeTarget, channel.port1);
      return;
    }
    let message: SynthesisSidecarComputeRunMessage;
    switch (task.operation) {
      case SYNTHESIS_SIDECAR_COMPUTE_OPERATION:
        message = {
          type: "run",
          taskId: task.id,
          operation: SYNTHESIS_SIDECAR_COMPUTE_OPERATION,
          payload: task.request as SynthesisCitationGraphLayoutRequest,
          cancellation,
        };
        break;
      case RUST_METRICS_OPERATION:
        target.postMessage({
          type: "run",
          taskId: task.id,
          operation: task.operation,
          payload: task.request,
        });
        return;
      case SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION:
      case SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION:
      case SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION:
      case SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION:
      case SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION: {
        const paged = extractRustPagedRequest(
          task.operation,
          task.request as Exclude<
            Task["request"],
            SynthesisSidecarGraphBuildTransferRun
          >,
        );
        task.rustInputPages = [];
        task.rustInputPageIterator = paged.pages;
        prefetchRustInputPage(task);
        task.rustProtocolPhase = "input";
        target.postMessage({
          type: "run_begin",
          taskId: task.id,
          operation: task.operation,
          header: paged.header,
        });
        const first = task.rustInputPages[0];
        target.postMessage({
          type: "input_page",
          taskId: task.id,
          descriptor: first.descriptor,
          rows: first.rows,
          [RUST_COMPUTE_CANONICAL_ROWS]: first.canonicalRows,
        });
        prefetchRustInputPage(task);
        return;
      }
      case SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION:
        message = {
          type: "run",
          taskId: task.id,
          operation: SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION,
          payload: task.request as SynthesisCitationGraphBuildRequest,
          cancellation,
        };
        break;
    }
    target.postMessage(message);
  };

  const enqueue = <
    Request extends
      | SynthesisCitationGraphLayoutRequest
      | SynthesisCitationGraphMetricsRequest
      | SynthesisCitationGraphBuildRequest
      | SynthesisTagVocabularyValidationRequest
      | SynthesisTagVocabularyIndexRequest
      | SynthesisConceptKbIndexRequest
      | SynthesisConceptKbQueryRequest
      | SynthesisTopicGraphIndexRequest,
    Result extends
      | SynthesisCitationGraphLayoutResult
      | SynthesisCitationGraphMetricsResult
      | SynthesisCitationGraphBuildResult
      | SynthesisTagVocabularyValidationResult
      | SynthesisTagVocabularyIndexResult
      | SynthesisConceptKbIndexResult
      | SynthesisConceptKbQueryResult
      | SynthesisTopicGraphIndexResult,
  >(
    operation: Task["operation"],
    request: Request,
    runOptions: { signal?: AbortSignal },
  ): Promise<Result> => {
    if (stopping || degraded) {
      return Promise.reject(poolError("worker_unavailable"));
    }
    if (active && queue.length >= SYNTHESIS_SIDECAR_COMPUTE_LIMITS.maxQueued) {
      return Promise.reject(poolError("worker_busy"));
    }
    if (runOptions.signal?.aborted) {
      return Promise.reject(poolError("worker_canceled"));
    }
    return new Promise((resolve, reject) => {
      const task: Task = {
        id: `compute:${++taskSequence}`,
        operation,
        request,
        cancellation: new Int32Array(new SharedArrayBuffer(4)),
        resolve: (result) => resolve(result as Result),
        reject,
        signal: runOptions.signal,
        timeoutMs: executionTimeoutMs,
        settled: false,
        terminating: false,
      };
      if (task.signal) {
        task.abortListener = () => {
          if (task === active) {
            cancelActive(task, "worker_canceled");
            return;
          }
          const index = queue.indexOf(task);
          if (index >= 0) {
            queue.splice(index, 1);
            rejectTask(task, "worker_canceled");
          }
        };
        task.signal.addEventListener("abort", task.abortListener, {
          once: true,
        });
      }
      queue.push(task);
      pump();
    });
  };

  const runCitationGraphLayout: SynthesisSidecarComputeWorkerPool["runCitationGraphLayout"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisCitationGraphLayoutRequest,
        SynthesisCitationGraphLayoutResult
      >(
        SYNTHESIS_SIDECAR_COMPUTE_OPERATION,
        rebuildSynthesisCitationGraphLayoutRequest(requestInput),
        runOptions,
      );

  const runCitationGraphMetrics: SynthesisSidecarComputeWorkerPool["runCitationGraphMetrics"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisCitationGraphMetricsRequest,
        SynthesisCitationGraphMetricsResult
      >(
        RUST_METRICS_OPERATION,
        rebuildSynthesisCitationGraphMetricsRequest(requestInput),
        runOptions,
      );

  const runCitationGraphBuild: SynthesisSidecarComputeWorkerPool["runCitationGraphBuild"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisCitationGraphBuildRequest,
        SynthesisCitationGraphBuildResult
      >(
        SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION,
        rebuildSynthesisCitationGraphBuildRequest(requestInput),
        runOptions,
      );

  const runTagVocabularyValidation: SynthesisSidecarComputeWorkerPool["runTagVocabularyValidation"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisTagVocabularyValidationRequest,
        SynthesisTagVocabularyValidationResult
      >(
        SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION,
        requestInput,
        runOptions,
      );

  const runTagVocabularyIndex: SynthesisSidecarComputeWorkerPool["runTagVocabularyIndex"] =
    (requestInput, runOptions = {}) =>
      enqueue<
        SynthesisTagVocabularyIndexRequest,
        SynthesisTagVocabularyIndexResult
      >(
        SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION,
        requestInput,
        runOptions,
      );

  const runConceptKbIndex: SynthesisSidecarComputeWorkerPool["runConceptKbIndex"] =
    (requestInput, runOptions = {}) =>
      enqueue<SynthesisConceptKbIndexRequest, SynthesisConceptKbIndexResult>(
        SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION,
        requestInput,
        runOptions,
      );

  const runConceptKbQuery: SynthesisSidecarComputeWorkerPool["runConceptKbQuery"] =
    (requestInput, runOptions = {}) =>
      enqueue<SynthesisConceptKbQueryRequest, SynthesisConceptKbQueryResult>(
        SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION,
        requestInput,
        runOptions,
      );

  const runTopicGraphIndex: SynthesisSidecarComputeWorkerPool["runTopicGraphIndex"] =
    (requestInput, runOptions = {}) =>
      enqueue<SynthesisTopicGraphIndexRequest, SynthesisTopicGraphIndexResult>(
        SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION,
        requestInput,
        runOptions,
      );

  const runCitationGraphBuildTransfer: SynthesisSidecarComputeWorkerPool["runCitationGraphBuildTransfer"] =
    (run, runOptions = {}) => {
      if (stopping || degraded) {
        throw poolError("worker_unavailable");
      }
      if (
        active &&
        queue.length >= SYNTHESIS_SIDECAR_COMPUTE_LIMITS.maxQueued
      ) {
        throw poolError("worker_busy");
      }
      if (runOptions.signal?.aborted) {
        throw poolError("worker_canceled");
      }
      return new Promise<void>((resolve, reject) => {
        const task: Task = {
          id: `compute:${++taskSequence}`,
          operation: SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION,
          request: run,
          cancellation: new Int32Array(new SharedArrayBuffer(4)),
          resolve: () => resolve(),
          reject,
          signal: runOptions.signal,
          timeoutMs: transferExecutionTimeoutMs,
          settled: false,
          terminating: false,
        };
        if (task.signal) {
          task.abortListener = () => {
            if (task === active) {
              cancelActive(task, "worker_canceled");
              return;
            }
            const index = queue.indexOf(task);
            if (index >= 0) {
              queue.splice(index, 1);
              rejectTask(task, "worker_canceled");
            }
          };
          task.signal.addEventListener("abort", task.abortListener, {
            once: true,
          });
        }
        queue.push(task);
        pump();
      });
    };

  const shutdown = () => {
    if (shutdownPromise) {
      return shutdownPromise;
    }
    stopping = true;
    rejectQueue("worker_canceled");
    shutdownPromise = (async () => {
      const stop = (async () => {
        if (active) {
          cancelActive(active, "worker_canceled");
        } else if (worker) {
          termination = terminateWorker(worker, cancellationGraceMs).finally(
            () => {
              termination = null;
            },
          );
        }
        await termination;
      })();
      await Promise.race([stop, delay(shutdownTimeoutMs)]);
      if (worker) {
        await terminateWorker(worker, 0);
      }
      if (rustWorker) {
        await terminateWorker(rustWorker, 0);
      }
      if (active) {
        const task = active;
        active = null;
        rejectTask(task, "worker_canceled");
      }
    })();
    return shutdownPromise;
  };

  return {
    runCitationGraphLayout,
    runCitationGraphMetrics,
    runCitationGraphBuild,
    runTagVocabularyValidation,
    runTagVocabularyIndex,
    runConceptKbIndex,
    runConceptKbQuery,
    runTopicGraphIndex,
    runCitationGraphBuildTransfer,
    snapshot,
    shutdown,
  };
}

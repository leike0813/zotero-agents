import {
  MessageChannel,
  Worker,
  type MessagePort,
  type WorkerOptions,
} from "node:worker_threads";
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
import {
  SYNTHESIS_SIDECAR_COMPUTE_OPERATION,
  SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION,
  SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION,
  SYNTHESIS_SIDECAR_METRICS_COMPUTE_OPERATION,
  type SynthesisSidecarComputeRunMessage,
  type SynthesisSidecarTransferPortWorkerMessage,
} from "./computeProtocol.js";
import type { SynthesisCitationGraphBuildTransferPageDescriptor } from "../../../packages/synthesis-engine/src/citationGraphBuildTransfer.js";

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

export type SynthesisSidecarGraphBuildTransferPageFrame = {
  descriptor: SynthesisCitationGraphBuildTransferPageDescriptor;
  bytes: ArrayBuffer;
};

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
    | typeof SYNTHESIS_SIDECAR_METRICS_COMPUTE_OPERATION
    | typeof SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION
    | typeof SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION;
  request:
    | SynthesisCitationGraphLayoutRequest
    | SynthesisCitationGraphMetricsRequest
    | SynthesisCitationGraphBuildRequest
    | SynthesisSidecarGraphBuildTransferRun;
  cancellation: Int32Array;
  resolve(
    result:
      | SynthesisCitationGraphLayoutResult
      | SynthesisCitationGraphMetricsResult
      | SynthesisCitationGraphBuildResult
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
};

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function poolError(code: WorkerErrorCode) {
  return new ComputeWorkerPoolError(code);
}

export function createSynthesisSidecarComputeWorkerPool(
  options: PoolOptions = {},
): SynthesisSidecarComputeWorkerPool {
  const workerUrl =
    options.workerUrl ?? new URL("./computeWorker.js", import.meta.url);
  const workerFactory =
    options.workerFactory ??
    ((url, workerOptions) => new Worker(url, workerOptions));
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
  const expectedExits = new WeakSet<Worker>();
  let worker: Worker | null = null;
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

  const terminateWorker = async (target: Worker, graceMs: number) => {
    expectedExits.add(target);
    if (worker === target) {
      worker = null;
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
    target: Worker | null,
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
    target: Worker | null,
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

  const timeoutActive = (task: Task, target: Worker | null) => {
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
    const target = worker;
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

  const onUnexpectedWorkerFailure = (target: Worker) => {
    if (worker !== target || expectedExits.has(target)) {
      return;
    }
    worker = null;
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
          | SynthesisCitationGraphBuildResult;
        try {
          switch (task.operation) {
            case SYNTHESIS_SIDECAR_COMPUTE_OPERATION:
              result = rebuildSynthesisCitationGraphLayoutResult(
                response.result,
                task.request as SynthesisCitationGraphLayoutRequest,
              );
              break;
            case SYNTHESIS_SIDECAR_METRICS_COMPUTE_OPERATION:
              result = rebuildSynthesisCitationGraphMetricsResult(
                response.result,
                task.request as SynthesisCitationGraphMetricsRequest,
              );
              break;
            case SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION:
              result = rebuildSynthesisCitationGraphBuildResult(
                response.result,
                task.request as SynthesisCitationGraphBuildRequest,
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
    active = task;
    const target = ensureWorker();
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
      target.postMessage(message, [channel.port2]);
      void streamTransferTask(task, target, channel.port1);
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
      case SYNTHESIS_SIDECAR_METRICS_COMPUTE_OPERATION:
        message = {
          type: "run",
          taskId: task.id,
          operation: SYNTHESIS_SIDECAR_METRICS_COMPUTE_OPERATION,
          payload: task.request as SynthesisCitationGraphMetricsRequest,
          cancellation,
        };
        break;
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
      | SynthesisCitationGraphBuildRequest,
    Result extends
      | SynthesisCitationGraphLayoutResult
      | SynthesisCitationGraphMetricsResult
      | SynthesisCitationGraphBuildResult,
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
        SYNTHESIS_SIDECAR_METRICS_COMPUTE_OPERATION,
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
    runCitationGraphBuildTransfer,
    snapshot,
    shutdown,
  };
}

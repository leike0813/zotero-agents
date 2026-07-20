import {
  buildSynthesisCitationGraphBuildTransferManifest,
  type SynthesisCitationGraphBuildTransferPageDescriptor,
} from "../../../packages/synthesis-engine/src/index.js";
import type {
  SynthesisSidecarTransferManifest,
  SynthesisSidecarTransferExecutionFailureCode,
  SynthesisSidecarTransferStatus,
} from "../../../packages/synthesis-contracts/src/sidecarTransfer.js";
import {
  CitationGraphTransferError,
  type CitationGraphTransferExecutionOwner,
} from "./citationGraphTransferOwner.js";
import {
  ComputeWorkerPoolError,
  synthesisRustPagedRequestHash,
  type SynthesisSidecarComputeWorkerPool,
} from "./computeWorkerPool.js";

export type CitationGraphBuildTransferExecutor = {
  execute(sessionId: string): SynthesisSidecarTransferStatus;
  cancel(sessionId: string): void;
  shutdown(): void;
};

function executionFailure(error: unknown): {
  code: SynthesisSidecarTransferExecutionFailureCode;
  retryable: boolean;
} {
  if (error instanceof ComputeWorkerPoolError) {
    return {
      code: error.code === "worker_busy" ? "worker_unavailable" : error.code,
      retryable: error.retryable,
    };
  }
  if (error instanceof CitationGraphTransferError) {
    const code =
      error.code === "transfer_limit_exceeded" ||
      error.code === "transfer_conflict"
        ? error.code
        : "internal_error";
    return { code, retryable: error.retryable };
  }
  return { code: "internal_error", retryable: false };
}

export function createCitationGraphBuildTransferExecutor(options: {
  owner: CitationGraphTransferExecutionOwner;
  pool: SynthesisSidecarComputeWorkerPool;
}): CitationGraphBuildTransferExecutor {
  const active = new Map<
    string,
    { attempt: number; controller: AbortController }
  >();
  let stopping = false;

  const execute = (sessionId: string) => {
    if (stopping) {
      throw new ComputeWorkerPoolError("worker_unavailable");
    }
    const existing = options.owner.status(sessionId);
    if (
      existing.state === "queued" ||
      existing.state === "executing" ||
      existing.state === "publishing_output" ||
      existing.state === "completed"
    ) {
      return existing;
    }
    const snapshot = options.pool.snapshot();
    if (snapshot.state === "degraded" || snapshot.state === "stopping") {
      throw new ComputeWorkerPoolError("worker_unavailable");
    }
    if (snapshot.active === 1 && snapshot.queued >= 2) {
      throw new ComputeWorkerPoolError("worker_busy");
    }

    const queued = options.owner.queueExecution(sessionId);
    if (!queued.admitted) {
      return queued.status;
    }
    const controller = new AbortController();
    const descriptors: SynthesisCitationGraphBuildTransferPageDescriptor[] = [];
    active.set(sessionId, { attempt: queued.attempt, controller });
    const manifest = options.owner.inputManifest(sessionId);
    let completion: Promise<void>;
    try {
      completion = options.pool.runCitationGraphBuildTransfer(
        {
          header: manifest.header,
          requestHash: synthesisRustPagedRequestHash(
            "citation_graph_build_transfer.v1",
            manifest.header,
            manifest.pages.map((descriptor) => ({
              section:
                descriptor.kind === "library_nodes"
                  ? "libraryNodes"
                  : "references",
              pageIndex: descriptor.pageIndex,
              rowCount: descriptor.rowCount,
              byteLength: descriptor.byteLength,
              sha256: descriptor.sha256,
            })),
          ),
          async *inputPages() {
            options.owner.startExecution(sessionId, queued.attempt);
            for (const descriptor of manifest.pages) {
              const frame = options.owner.readInputFrame(
                sessionId,
                descriptor.kind,
                descriptor.pageIndex,
              );
              yield {
                descriptor:
                  frame.descriptor as SynthesisCitationGraphBuildTransferPageDescriptor,
                bytes: frame.bytes,
              };
            }
          },
          outputStarted() {
            options.owner.startOutput(sessionId, queued.attempt);
          },
          outputPage(frame) {
            descriptors.push(
              options.owner.stageAttemptOutputFrame(
                sessionId,
                queued.attempt,
                frame,
              ),
            );
          },
          outputComplete(header) {
            const outputManifest =
              buildSynthesisCitationGraphBuildTransferManifest({
                direction: "output",
                header,
                pages: descriptors,
              });
            options.owner.commitOutput(
              sessionId,
              queued.attempt,
              outputManifest as unknown as SynthesisSidecarTransferManifest,
            );
          },
        },
        { signal: controller.signal },
      );
    } catch (error) {
      active.delete(sessionId);
      options.owner.failExecution(
        sessionId,
        queued.attempt,
        executionFailure(error),
      );
      throw error;
    }
    void completion
      .catch((error) => {
        options.owner.failExecution(
          sessionId,
          queued.attempt,
          executionFailure(error),
        );
      })
      .finally(() => {
        const current = active.get(sessionId);
        if (current?.attempt === queued.attempt) {
          active.delete(sessionId);
        }
      });
    return queued.status;
  };

  return {
    execute,
    cancel(sessionId) {
      active.get(sessionId)?.controller.abort();
      active.delete(sessionId);
    },
    shutdown() {
      if (stopping) {
        return;
      }
      stopping = true;
      for (const task of active.values()) {
        task.controller.abort();
      }
      active.clear();
    },
  };
}

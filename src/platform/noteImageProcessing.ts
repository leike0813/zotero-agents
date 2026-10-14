import { config } from "../../package.json";
import type { CancellationSignal } from "../utils/wait";
import { createWorkflowHostError } from "../workflows/workflowHostErrorContract";
import type {
  NoteImageProcessingRequest,
  NoteImageProcessingResponse,
  NoteImageProcessingResult,
} from "./noteImageProcessingContract";

export type NoteImageWorker = {
  onmessage: ((event: { data: NoteImageProcessingResponse }) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: (() => void) | null;
  postMessage: (
    request: NoteImageProcessingRequest,
    transfer: ArrayBuffer[],
  ) => void;
  terminate: () => void;
};

export function processNoteImage(
  request: NoteImageProcessingRequest,
  signal?: CancellationSignal,
  createWorker: () => NoteImageWorker = () => {
    const WorkerCtor = (
      globalThis as unknown as {
        ChromeWorker?: new (url: string) => NoteImageWorker;
      }
    ).ChromeWorker;
    if (!WorkerCtor)
      throw createWorkflowHostError(
        "unavailable",
        "Image worker is unavailable",
        { reason: "runtime", kind: "prepared_image" },
      );
    return new WorkerCtor(
      `chrome://${config.addonRef}/content/workers/note-image-worker.js`,
    );
  },
): Promise<NoteImageProcessingResult> {
  return new Promise((resolve, reject) => {
    let worker: NoteImageWorker | undefined;
    let settled = false;
    const finish = (error?: unknown, result?: NoteImageProcessingResult) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      if (worker) {
        worker.onmessage = worker.onerror = worker.onmessageerror = null;
        worker.terminate();
      }
      if (error) reject(error);
      else resolve(result!);
    };
    const onAbort = () =>
      finish(
        createWorkflowHostError("canceled", "Image processing was canceled", {
          reason: "caller_signal",
        }),
      );
    if (signal?.aborted) {
      onAbort();
      return;
    }
    try {
      worker = createWorker();
      worker.onmessage = ({ data }) => {
        if (data.ok) finish(undefined, data.result);
        else if (data.error === "bytes")
          finish(
            createWorkflowHostError("resource_limited", data.message, {
              resource: "bytes",
              limit: request.options.hardMaxBytes,
              observed: data.observed,
            }),
          );
        else if (data.error === "unavailable")
          finish(
            createWorkflowHostError("unavailable", data.message, {
              reason: "runtime",
              kind: "prepared_image",
            }),
          );
        else
          finish(
            createWorkflowHostError("execution_failed", data.message, {
              phase: "staging",
              recovery: "none",
            }),
          );
      };
      worker.onerror = (event) => {
        event.preventDefault?.();
        finish(
          createWorkflowHostError(
            "execution_failed",
            event.message || "Image worker failed",
            { phase: "staging", recovery: "none" },
          ),
        );
      };
      worker.onmessageerror = () =>
        finish(
          createWorkflowHostError(
            "execution_failed",
            "Image worker message failed",
            { phase: "staging", recovery: "none" },
          ),
        );
      signal?.addEventListener("abort", onAbort, { once: true });
      if (!settled)
        worker.postMessage(request, [request.bytes.buffer as ArrayBuffer]);
    } catch (error) {
      finish(error);
    }
  });
}

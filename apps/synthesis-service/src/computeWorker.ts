import { parentPort } from "node:worker_threads";
import {
  createInProcessSynthesisCitationGraphLayoutEngine,
  rebuildSynthesisCitationGraphLayoutRequest,
  rebuildSynthesisCitationGraphLayoutResult,
} from "../../../packages/synthesis-engine/src/index.js";
import {
  SYNTHESIS_SIDECAR_COMPUTE_OPERATION,
  type SynthesisSidecarComputeWorkerMessage,
  type SynthesisSidecarComputeWorkerResponse,
} from "./computeProtocol.js";

if (!parentPort) {
  throw new Error("Synthesis compute worker requires a parent port");
}

class ComputeCanceledError extends Error {}

function post(response: SynthesisSidecarComputeWorkerResponse) {
  parentPort?.postMessage(response);
}

parentPort.on(
  "message",
  async (message: SynthesisSidecarComputeWorkerMessage) => {
    if (message?.type !== "run") {
      return;
    }
    const taskId = String(message.taskId || "");
    try {
      if (!(message.cancellation instanceof SharedArrayBuffer)) {
        throw new Error("Invalid compute operation");
      }
      const canceled = new Int32Array(message.cancellation);
      const checkpoint = () => {
        if (Atomics.load(canceled, 0) !== 0) {
          throw new ComputeCanceledError();
        }
      };
      checkpoint();
      if (message.operation === SYNTHESIS_SIDECAR_COMPUTE_OPERATION) {
        const request = rebuildSynthesisCitationGraphLayoutRequest(
          message.payload,
        );
        const result = await createInProcessSynthesisCitationGraphLayoutEngine({
          checkpoint,
        }).compute(request);
        checkpoint();
        post({
          type: "result",
          taskId,
          result: rebuildSynthesisCitationGraphLayoutResult(result, request),
        });
        return;
      }
      throw new Error("Invalid compute operation");
    } catch (error) {
      post({
        type: error instanceof ComputeCanceledError ? "canceled" : "error",
        taskId,
      });
    }
  },
);

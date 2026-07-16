import type {
  SynthesisCitationGraphLayoutRequest,
  SynthesisCitationGraphLayoutResult,
} from "../../../packages/synthesis-engine/src/index.js";

export const SYNTHESIS_SIDECAR_COMPUTE_OPERATION =
  "citation_graph_layout.v1" as const;

export type SynthesisSidecarComputeRunMessage = {
  type: "run";
  taskId: string;
  operation: typeof SYNTHESIS_SIDECAR_COMPUTE_OPERATION;
  payload: SynthesisCitationGraphLayoutRequest;
  cancellation: SharedArrayBuffer;
};

export type SynthesisSidecarComputeCancelMessage = {
  type: "cancel";
  taskId: string;
};

export type SynthesisSidecarComputeWorkerMessage =
  | SynthesisSidecarComputeRunMessage
  | SynthesisSidecarComputeCancelMessage;

export type SynthesisSidecarComputeWorkerResponse =
  | {
      type: "result";
      taskId: string;
      result: SynthesisCitationGraphLayoutResult;
    }
  | { type: "canceled"; taskId: string }
  | { type: "error"; taskId: string };

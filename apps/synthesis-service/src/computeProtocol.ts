import type {
  SynthesisCitationGraphLayoutRequest,
  SynthesisCitationGraphLayoutResult,
  SynthesisCitationGraphMetricsRequest,
  SynthesisCitationGraphMetricsResult,
} from "../../../packages/synthesis-engine/src/index.js";
import type {
  SynthesisCitationGraphBuildRequest,
  SynthesisCitationGraphBuildResult,
} from "../../../packages/synthesis-engine/src/citationGraphBuild.js";
import type {
  SynthesisCitationGraphBuildTransferPageDescriptor,
  SynthesisCitationGraphBuildTransferPageKind,
} from "../../../packages/synthesis-engine/src/citationGraphBuildTransfer.js";

export const SYNTHESIS_SIDECAR_COMPUTE_OPERATION =
  "citation_graph_layout.v1" as const;
export const SYNTHESIS_SIDECAR_METRICS_COMPUTE_OPERATION =
  "citation_graph_metrics.v1" as const;
export const SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION =
  "citation_graph_build.v1" as const;
export const SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION =
  "citation_graph_build_transfer.v1" as const;

type SynthesisSidecarComputeRunMessageBase = {
  type: "run";
  taskId: string;
  cancellation: SharedArrayBuffer;
};

export type SynthesisSidecarComputeRunMessage =
  | (SynthesisSidecarComputeRunMessageBase & {
      operation: typeof SYNTHESIS_SIDECAR_COMPUTE_OPERATION;
      payload: SynthesisCitationGraphLayoutRequest;
    })
  | (SynthesisSidecarComputeRunMessageBase & {
      operation: typeof SYNTHESIS_SIDECAR_METRICS_COMPUTE_OPERATION;
      payload: SynthesisCitationGraphMetricsRequest;
    })
  | (SynthesisSidecarComputeRunMessageBase & {
      operation: typeof SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION;
      payload: SynthesisCitationGraphBuildRequest;
    })
  | (SynthesisSidecarComputeRunMessageBase & {
      operation: typeof SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION;
      header: Record<string, unknown>;
      port: unknown;
    });

export type SynthesisSidecarTransferPortInputMessage =
  | {
      type: "input_page";
      descriptor: SynthesisCitationGraphBuildTransferPageDescriptor;
      bytes: ArrayBuffer;
    }
  | { type: "input_complete" };

export type SynthesisSidecarTransferPortWorkerMessage =
  | {
      type: "input_ack";
      kind: SynthesisCitationGraphBuildTransferPageKind;
      pageIndex: number;
    }
  | { type: "output_started" }
  | {
      type: "output_page";
      descriptor: SynthesisCitationGraphBuildTransferPageDescriptor;
      bytes: ArrayBuffer;
    }
  | {
      type: "output_complete";
      header: Record<string, unknown>;
    }
  | { type: "stream_error" };

export type SynthesisSidecarTransferPortAckMessage = {
  type: "output_ack";
  kind: SynthesisCitationGraphBuildTransferPageKind;
  pageIndex: number;
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
      result:
        | SynthesisCitationGraphLayoutResult
        | SynthesisCitationGraphMetricsResult
        | SynthesisCitationGraphBuildResult;
    }
  | { type: "canceled"; taskId: string }
  | { type: "error"; taskId: string };

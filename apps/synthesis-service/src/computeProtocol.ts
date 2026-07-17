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

export const SYNTHESIS_SIDECAR_COMPUTE_OPERATION =
  "citation_graph_layout.v1" as const;
export const SYNTHESIS_SIDECAR_METRICS_COMPUTE_OPERATION =
  "citation_graph_metrics.v1" as const;
export const SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION =
  "citation_graph_build.v1" as const;

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
    });

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

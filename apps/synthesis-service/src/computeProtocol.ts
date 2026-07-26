import type {
  SynthesisCitationGraphLayoutRequest,
  SynthesisCitationGraphLayoutResult,
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
  "citation_graph_layout.v2" as const;
export const SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION =
  "citation_graph_build.v1" as const;
export const SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION =
  "citation_graph_build_transfer.v1" as const;
export const SYNTHESIS_SIDECAR_TAG_VOCABULARY_VALIDATE_OPERATION =
  "tag_vocabulary_validate.v1" as const;
export const SYNTHESIS_SIDECAR_TAG_VOCABULARY_INDEX_OPERATION =
  "tag_vocabulary_index.v1" as const;
export const SYNTHESIS_SIDECAR_CONCEPT_KB_INDEX_OPERATION =
  "concept_kb_index.v1" as const;
export const SYNTHESIS_SIDECAR_CONCEPT_KB_QUERY_OPERATION =
  "concept_kb_query.v1" as const;
export const SYNTHESIS_SIDECAR_TOPIC_GRAPH_INDEX_OPERATION =
  "topic_graph_index.v1" as const;
export const SYNTHESIS_SIDECAR_REFERENCE_BINDING_OPERATION =
  "reference_binding.v1" as const;
export const SYNTHESIS_SIDECAR_REFERENCE_CANONICAL_DEDUPE_OPERATION =
  "reference_canonical_dedupe.v1" as const;
export const SYNTHESIS_SIDECAR_TOPIC_MANIFEST_VALIDATE_OPERATION =
  "topic_manifest_validate.v1" as const;
export const SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_ASSEMBLE_OPERATION =
  "topic_artifact_assemble.v1" as const;
export const SYNTHESIS_SIDECAR_TOPIC_ARTIFACT_VALIDATE_OPERATION =
  "topic_artifact_validate.v1" as const;
export const SYNTHESIS_SIDECAR_TOPIC_SECTION_PATCH_OPERATION =
  "topic_section_patch.v1" as const;

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
      operation: typeof SYNTHESIS_SIDECAR_GRAPH_BUILD_COMPUTE_OPERATION;
      payload: SynthesisCitationGraphBuildRequest;
    })
  | (SynthesisSidecarComputeRunMessageBase & {
      operation: typeof SYNTHESIS_SIDECAR_GRAPH_BUILD_TRANSFER_OPERATION;
      header: Record<string, unknown>;
      port: unknown;
    });

export type SynthesisSidecarGraphBuildTransferPageFrame = {
  descriptor: SynthesisCitationGraphBuildTransferPageDescriptor;
  bytes: ArrayBuffer;
};

export type SynthesisSidecarTransferPortInputMessage =
  | ({ type: "input_page" } & SynthesisSidecarGraphBuildTransferPageFrame)
  | { type: "input_complete" };

export type SynthesisSidecarTransferPortWorkerMessage =
  | {
      type: "input_ack";
      kind: SynthesisCitationGraphBuildTransferPageKind;
      pageIndex: number;
    }
  | { type: "output_started" }
  | ({ type: "output_page" } & SynthesisSidecarGraphBuildTransferPageFrame)
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
        | SynthesisCitationGraphBuildResult;
    }
  | { type: "canceled"; taskId: string }
  | { type: "error"; taskId: string };

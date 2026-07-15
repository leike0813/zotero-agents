import {
  toSynthesisJsonObject,
  type SynthesisWorkbenchPaperDigestReadRequest,
  type SynthesisWorkbenchProjection,
  type SynthesisWorkbenchReadState,
} from "../../../packages/synthesis-contracts/src/index";
import type {
  SynthesisUiSnapshotInput,
  SynthesisUiState,
} from "../synthesis/uiModel";

export function toSynthesisWorkbenchReadState(
  state: SynthesisUiState,
): SynthesisWorkbenchReadState {
  return toSynthesisJsonObject(state, "$.workbench.state");
}

export function toSynthesisUiSnapshotInput(
  projection: SynthesisWorkbenchProjection,
): SynthesisUiSnapshotInput {
  return projection as unknown as SynthesisUiSnapshotInput;
}

export function toSynthesisWorkbenchPaperDigestReadRequest(
  args: Record<string, unknown>,
): SynthesisWorkbenchPaperDigestReadRequest {
  const topicId = typeof args.topicId === "string" ? args.topicId.trim() : "";
  const paperRefValue = args.paper_ref ?? args.paperRef;
  const paperRef =
    typeof paperRefValue === "string" ? paperRefValue.trim() : "";
  const digestRefValue = args.digest_ref ?? args.digestRef;
  const includeRepresentativeImageValue =
    args.include_representative_image ?? args.includeRepresentativeImage;

  return {
    ...(topicId ? { topicId } : {}),
    ...(paperRef ? { paperRef } : {}),
    ...(digestRefValue !== undefined
      ? {
          digestRef: toSynthesisJsonObject(
            digestRefValue,
            "$.workbench.digestRef",
          ),
        }
      : {}),
    ...(typeof includeRepresentativeImageValue === "boolean"
      ? { includeRepresentativeImage: includeRepresentativeImageValue }
      : {}),
  };
}

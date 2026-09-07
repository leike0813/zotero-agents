import { requireHostApi } from "./runtime.mjs";

function cleanString(value) {
  return String(value || "").trim();
}

function hasValue(value) {
  return value !== null && value !== undefined;
}

function buildDigestInput(args) {
  if (
    !args.digestNote &&
    !hasValue(args.digestText) &&
    !args.digestPayloadHash
  ) {
    return undefined;
  }
  return {
    noteKey: cleanString(args.digestNote?.ref?.key || args.digestNote?.key),
    content: args.digestText,
    payloadHash: cleanString(args.digestPayloadHash),
  };
}

export async function applyLiteratureDigestSidecar(args) {
  const synthesis = requireHostApi(args.runtime)?.synthesis;
  if (
    !synthesis ||
    typeof synthesis.workflowApply?.applyLiteratureDigest !== "function"
  ) {
    return null;
  }
  try {
    return await synthesis.workflowApply.applyLiteratureDigest({
      parentItem: args.parentItem,
      digest: buildDigestInput(args),
      references: args.referencesPayload || undefined,
      citationAnalysis: args.citationAnalysisPayload || undefined,
      literatureScore: args.literatureScorePayload || undefined,
      literatureMatchingMetadata: args.literatureMatchingMetadata || null,
      source: {
        workflow: cleanString(args.sourceWorkflow) || "literature-analysis",
        digest_entry: args.digestEntryPath,
        references_entry: args.referencesEntryPath,
        citation_analysis_entry: args.citationAnalysisEntryPath,
      },
    });
  } catch (error) {
    return {
      ok: false,
      status: "sidecar_apply_deferred",
      retryable: true,
      error_code: cleanString(error?.code) || "sidecar_apply_failed",
      message: cleanString(error?.message) || "Synthesis sidecar apply failed",
    };
  }
}

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
    noteKey: cleanString(args.digestNote?.key),
    content: args.digestText,
    payloadHash: cleanString(args.digestPayloadHash),
  };
}

function buildReferencesInput(args) {
  if (
    !args.referencesNote &&
    !args.referencesPayload &&
    !args.referencesPayloadHash
  ) {
    return undefined;
  }
  return {
    noteKey: cleanString(args.referencesNote?.key),
    references: args.referencesPayload?.references || [],
    payloadHash: cleanString(args.referencesPayloadHash),
  };
}

function buildCitationAnalysisInput(args) {
  if (
    !args.citationAnalysisNote &&
    !args.citationAnalysisPayload &&
    !args.citationAnalysisPayloadHash
  ) {
    return undefined;
  }
  return {
    noteKey: cleanString(args.citationAnalysisNote?.key),
    payloadHash: cleanString(args.citationAnalysisPayloadHash),
    ...(args.citationAnalysisPayload
      ? {
          payload: args.citationAnalysisPayload,
        }
      : {}),
  };
}

export async function applyLiteratureDigestSidecar(args) {
  const synthesis = requireHostApi(args.runtime)?.synthesis;
  if (
    !synthesis ||
    typeof synthesis.applyLiteratureDigestSidecar !== "function"
  ) {
    return null;
  }
  return synthesis.applyLiteratureDigestSidecar({
    parentItem: args.parentItem,
    digest: buildDigestInput(args),
    references: buildReferencesInput(args),
    citationAnalysis: buildCitationAnalysisInput(args),
    literatureMatchingMetadata: args.literatureMatchingMetadata || null,
    source: {
      workflow: cleanString(args.sourceWorkflow) || "literature-analysis",
      digest_entry: args.digestEntryPath,
      references_entry: args.referencesEntryPath,
      citation_analysis_entry: args.citationAnalysisEntryPath,
    },
  });
}

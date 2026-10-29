import { requireHostApi } from "./runtime.mjs";

function cleanString(value) {
  return String(value || "").trim();
}

function hasValue(value) {
  return value !== null && value !== undefined;
}

function creatorName(creator) {
  if (!creator || typeof creator !== "object") {
    return "";
  }
  if (creator.representation === "single_field") {
    return cleanString(creator.name);
  }
  return cleanString(
    [creator.firstName, creator.lastName]
      .map(cleanString)
      .filter(Boolean)
      .join(" "),
  );
}

function stringList(values) {
  return (Array.isArray(values) ? values : []).map(cleanString).filter(Boolean);
}

function extraField(extra, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return cleanString(
    extra.match(new RegExp(`^${escaped}\\s*:\\s*(.+)$`, "im"))?.[1],
  );
}

// The closed v12 LiteratureDigestPayload is flat; the hook only holds a
// RegularItemDetailDto, so every bibliographic fact must be projected here.
function buildItemSnapshot(detail) {
  const item = detail && typeof detail === "object" ? detail : {};
  const ref = item.ref && typeof item.ref === "object" ? item.ref : {};
  const fields =
    item.fields && typeof item.fields === "object" ? item.fields : {};
  const libraryId = Math.max(0, Math.floor(Number(ref.libraryId) || 0));
  const itemKey = cleanString(ref.key);
  const extra = cleanString(fields.extra);
  return {
    libraryId,
    itemKey,
    paperRef: libraryId && itemKey ? `${libraryId}:${itemKey}` : "",
    itemType: cleanString(item.itemType),
    title: cleanString(item.title),
    year: cleanString(item.year),
    date: cleanString(item.date),
    creators: (Array.isArray(item.creators) ? item.creators : [])
      .map(creatorName)
      .filter(Boolean),
    tags: stringList(item.tags),
    // Collection membership stays inside the item library, so the portable
    // collection key is what the read-side adapters already publish.
    collections: (Array.isArray(item.collectionRefs) ? item.collectionRefs : [])
      .map((collectionRef) => cleanString(collectionRef?.key))
      .filter(Boolean),
    doi: cleanString(fields.DOI),
    arxiv: extraField(extra, "arXiv"),
    isbn: cleanString(fields.ISBN),
    url: cleanString(fields.url),
    citekey:
      cleanString(fields.citationKey) || extraField(extra, "Citation Key"),
    dateAdded: cleanString(item.createdAt),
  };
}

function buildDigestArtifact(args) {
  if (
    !args.digestNote &&
    !hasValue(args.digestText) &&
    !cleanString(args.digestPayloadHash)
  ) {
    return undefined;
  }
  return {
    noteKey: cleanString(args.digestNote?.ref?.key || args.digestNote?.key),
    ...(hasValue(args.digestText) ? { content: String(args.digestText) } : {}),
    payloadHash: cleanString(args.digestPayloadHash),
  };
}

function buildSource(args) {
  const artifactPath = [
    args.digestEntryPath,
    args.referencesEntryPath,
    args.citationAnalysisEntryPath,
  ]
    .map((value) => (hasValue(value) ? cleanString(value) : ""))
    .find(Boolean);
  const workflowId = cleanString(args.sourceWorkflow) || "literature-analysis";
  return {
    workflowId,
    ...(artifactPath ? { artifactPath } : {}),
  };
}

function buildApplyFailure(error) {
  // Only the Host error contract may grant a retry; a rejected request is final.
  const retryable = error?.retryable === true;
  return {
    ok: false,
    status: retryable ? "sidecar_apply_deferred" : "sidecar_apply_failed",
    retryable,
    error_code: cleanString(error?.code) || "sidecar_apply_failed",
    message: cleanString(error?.message) || "Synthesis sidecar apply failed",
  };
}

function citationForApply(payload) {
  if (!hasValue(payload)) return undefined;
  const { referencesBasis: _referencesBasis, ...canonical } = payload;
  return canonical;
}

function matchingMetadataForApply(payload) {
  if (!hasValue(payload)) return undefined;
  return {
    ...payload,
    schema:
      payload.schema === "literature_matching_metadata.v1"
        ? "synthesis.literature_matching_metadata.v1"
        : payload.schema,
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
    const digest = buildDigestArtifact(args);
    return await synthesis.workflowApply.applyLiteratureDigest({
      ...buildItemSnapshot(args.parentItem),
      ...(digest ? { digest } : {}),
      ...(hasValue(args.referencesPayload)
        ? { references: args.referencesPayload }
        : {}),
      ...(hasValue(args.citationAnalysisPayload)
        ? { citationAnalysis: citationForApply(args.citationAnalysisPayload) }
        : {}),
      ...(hasValue(args.literatureScorePayload)
        ? { literatureScore: args.literatureScorePayload }
        : {}),
      ...(hasValue(args.literatureMatchingMetadata)
        ? {
            literatureMatchingMetadata: matchingMetadataForApply(
              args.literatureMatchingMetadata,
            ),
          }
        : {}),
      source: buildSource(args),
    });
  } catch (error) {
    return buildApplyFailure(error);
  }
}

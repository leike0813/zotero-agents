import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

const METADATA_CURATION_TAG = "status:need-metadata-curation";
const SOURCE = "literature-search-ingest";

function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveOutput(args) {
  const runResult = args?.runResult;
  const candidates = [
    args?.resultContext?.resultJson?.data?.data,
    args?.resultContext?.resultJson?.data,
    args?.resultContext?.resultJson,
    runResult?.resultJson?.data?.data,
    runResult?.resultJson?.data,
    runResult?.resultJson,
  ];
  return (
    candidates.find(
      (candidate) =>
        isObject(candidate) &&
        (candidate.kind === "literature_search_ingest" ||
          candidate.kind === "literature_search_ingest_canceled"),
    ) || null
  );
}

function eligibleItemIds(output) {
  if (
    output?.kind !== "literature_search_ingest" ||
    output?.status !== "completed" ||
    !Array.isArray(output?.outcomes)
  ) {
    return [];
  }
  return Array.from(
    new Set(
      output.outcomes
        .filter(
          (outcome) =>
            isObject(outcome) &&
            outcome.needsCuration === true &&
            (outcome.ingestStatus === "created" ||
              outcome.ingestStatus === "existing") &&
            Number.isInteger(outcome.itemRef?.id) &&
            outcome.itemRef.id > 0,
        )
        .map((outcome) => outcome.itemRef.id),
    ),
  );
}

function requireVocabularyApi(runtime) {
  const synthesis = requireHostApi(runtime)?.synthesis;
  if (!synthesis || typeof synthesis.loadTagVocabulary !== "function") {
    throw new Error("literature-search-ingest tag vocabulary load API is unavailable");
  }
  if (typeof synthesis.saveTagVocabulary !== "function") {
    throw new Error("literature-search-ingest tag vocabulary save API is unavailable");
  }
  return synthesis;
}

async function ensureMetadataCurationTag(runtime) {
  const synthesis = requireVocabularyApi(runtime);
  const current = await synthesis.loadTagVocabulary();
  const entries = Array.isArray(current?.entries) ? current.entries : [];
  const exists = entries.some(
    (entry) =>
      String(entry?.tag || "").trim().toLowerCase() ===
      METADATA_CURATION_TAG,
  );
  if (exists) {
    return false;
  }
  await synthesis.saveTagVocabulary({
    entries: [
      ...entries,
      {
        tag: METADATA_CURATION_TAG,
        facet: "status",
        note: "Bibliographic metadata requires curation.",
        source: SOURCE,
        deprecated: false,
      },
    ],
    aliases: current?.aliases || {},
    abbrev: current?.abbrev || {},
    protocol: current?.protocol,
    transactionId: `${SOURCE}-${Date.now()}`,
  });
  return true;
}

async function applyResultImpl(args) {
  const output = resolveOutput(args);
  const itemIds = eligibleItemIds(output);
  if (!itemIds.length) {
    return {
      ok: true,
      applied: false,
      skipped: true,
      taggedItemIds: [],
      tagFailures: [],
    };
  }

  const tagAdd = args?.runtime?.handlers?.tag?.add;
  if (typeof tagAdd !== "function") {
    throw new Error("literature-search-ingest tag add handler is unavailable");
  }

  const vocabularyAdded = await ensureMetadataCurationTag(args.runtime);
  const taggedItemIds = [];
  const tagFailures = [];
  for (const itemId of itemIds) {
    try {
      await tagAdd(itemId, [METADATA_CURATION_TAG]);
      taggedItemIds.push(itemId);
    } catch (error) {
      tagFailures.push({
        itemId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    ok: tagFailures.length === 0,
    applied: taggedItemIds.length > 0,
    skipped: false,
    vocabularyAdded,
    taggedItemIds,
    tagFailures,
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () =>
    applyResultImpl(args || {}),
  );
}

export const __literatureSearchIngestApplyResultTestOnly = {
  applyResultImpl,
  eligibleItemIds,
  resolveOutput,
};

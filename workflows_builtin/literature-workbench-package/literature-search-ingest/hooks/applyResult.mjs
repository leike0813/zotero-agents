import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";
import { collectStatusTransitionDiagnostics } from "../../lib/statusTransition.mjs";

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

function eligibleTransitions(output) {
  if (
    output?.kind !== "literature_search_ingest" ||
    output?.status !== "completed" ||
    !Array.isArray(output?.outcomes)
  ) {
    return [];
  }
  const byItemRef = new Map();
  for (const outcome of output.outcomes) {
    const itemRef = outcome?.itemRef;
    const libraryId = Number(itemRef?.libraryId || 0);
    const key = String(itemRef?.key || "").trim();
    const ingestStatus = String(outcome?.ingestStatus || "").trim();
    if (
      !isObject(outcome) ||
      !Number.isSafeInteger(libraryId) ||
      libraryId <= 0 ||
      !key ||
      (ingestStatus !== "created" && ingestStatus !== "existing")
    ) {
      continue;
    }
    const identity = `${libraryId}:${key}`;
    const add = new Set(byItemRef.get(identity)?.add || []);
    if (ingestStatus === "created") {
      add.add("need-markdown");
      add.add("need-analysis");
      add.add("need-deep-reading");
    }
    if (outcome.needsCuration === true) {
      add.add("need-metadata-curation");
    }
    if (String(outcome.pdfStatus || "").trim() !== "attached") {
      add.add("need-fulltext");
    }
    byItemRef.set(identity, {
      itemRef: { libraryId, key },
      add: Array.from(add),
    });
  }
  return Array.from(byItemRef.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, transition]) => transition);
}

function eligibleItemRefs(output) {
  return eligibleTransitions(output).map((entry) => entry.itemRef);
}

async function applyResultImpl(args) {
  const output = resolveOutput(args);
  const transitions = eligibleTransitions(output);
  if (!transitions.length) {
    return {
      ok: true,
      applied: false,
      skipped: true,
      partial: false,
      taggedItemRefs: [],
      tagFailures: [],
      statusWarnings: [],
    };
  }

  const statusTags = requireHostApi(args.runtime)?.statusTags;
  const taggedItemRefs = [];
  const statusWarnings = [];
  for (const transition of transitions) {
    try {
      if (typeof statusTags?.transition !== "function") {
        throw new Error("literature-search-ingest statusTags API is unavailable");
      }
      const result = await statusTags.transition({
        operationId: `literature-search-ingest:status:${transition.itemRef.libraryId}:${transition.itemRef.key}`,
        itemRef: transition.itemRef,
        add: transition.add,
      });
      taggedItemRefs.push(transition.itemRef);
      statusWarnings.push(
        ...collectStatusTransitionDiagnostics(
          result,
          "search_status_transition_failed",
          { itemRef: transition.itemRef },
        ),
      );
    } catch (error) {
      statusWarnings.push({
        code: "search_status_transition_failed",
        itemRef: transition.itemRef,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    ok: true,
    applied: taggedItemRefs.length > 0,
    skipped: false,
    partial: statusWarnings.length > 0,
    taggedItemRefs,
    tagFailures: statusWarnings,
    statusWarnings,
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () =>
    applyResultImpl(args || {}),
  );
}

export const __literatureSearchIngestApplyResultTestOnly = {
  applyResultImpl,
  eligibleItemRefs,
  eligibleTransitions,
  resolveOutput,
};

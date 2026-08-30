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
  const byItemId = new Map();
  for (const outcome of output.outcomes) {
    const itemId = Number(outcome?.itemRef?.id || 0);
    const ingestStatus = String(outcome?.ingestStatus || "").trim();
    if (
      !isObject(outcome) ||
      !Number.isInteger(itemId) ||
      itemId <= 0 ||
      (ingestStatus !== "created" && ingestStatus !== "existing")
    ) {
      continue;
    }
    const add = new Set(byItemId.get(itemId)?.add || []);
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
    byItemId.set(itemId, { itemId, add: Array.from(add) });
  }
  return Array.from(byItemId.values()).sort(
    (left, right) => left.itemId - right.itemId,
  );
}

function eligibleItemIds(output) {
  return eligibleTransitions(output).map((entry) => entry.itemId);
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
      taggedItemIds: [],
      tagFailures: [],
      statusWarnings: [],
    };
  }

  const statusTags = requireHostApi(args.runtime)?.statusTags;
  const taggedItemIds = [];
  const statusWarnings = [];
  for (const transition of transitions) {
    try {
      if (typeof statusTags?.transition !== "function") {
        throw new Error("literature-search-ingest statusTags API is unavailable");
      }
      const result = await statusTags.transition({
        item: transition.itemId,
        add: transition.add,
      });
      taggedItemIds.push(transition.itemId);
      statusWarnings.push(
        ...collectStatusTransitionDiagnostics(
          result,
          "search_status_transition_failed",
          { itemId: transition.itemId },
        ),
      );
    } catch (error) {
      statusWarnings.push({
        code: "search_status_transition_failed",
        itemId: transition.itemId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    ok: true,
    applied: taggedItemIds.length > 0,
    skipped: false,
    partial: statusWarnings.length > 0,
    taggedItemIds,
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
  eligibleItemIds,
  eligibleTransitions,
  resolveOutput,
};

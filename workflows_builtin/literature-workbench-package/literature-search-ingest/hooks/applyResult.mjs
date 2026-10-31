import {
  readHostPages,
  requireHostApi,
  withPackageRuntimeScope,
} from "../../lib/runtime.mjs";
import { collectStatusTransitionDiagnostics } from "../../lib/statusTransition.mjs";

const STATUS_OPERATION_PREFIX = "literature-search-ingest:status";

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

function eligibleOutcomes(output) {
  const kind = output?.kind;
  if (
    !Array.isArray(output?.outcomes) ||
    (kind !== "literature_search_ingest" &&
      kind !== "literature_search_ingest_canceled")
  ) {
    return [];
  }
  if (output.status !== "completed" && output.status !== "canceled") {
    return [];
  }
  const outcomes = [];
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
    outcomes.push({
      outcome,
      itemRef: { libraryId, key },
      ingestStatus,
    });
  }
  return outcomes;
}

function isUsablePdfAttachment(attachment) {
  if (!isObject(attachment)) {
    return false;
  }
  if (attachment.role && attachment.role !== "ordinary") {
    return false;
  }
  const contentType = String(attachment.contentType || "")
    .trim()
    .toLowerCase();
  const filename = String(attachment.filename || "")
    .trim()
    .toLowerCase();
  const isPdf = contentType === "application/pdf" || filename.endsWith(".pdf");
  return isPdf && attachment.file?.state === "available";
}

async function corroborateUsablePdf(runtime, itemRef) {
  const library = requireHostApi(runtime)?.library;
  if (!library || typeof library.getItemAttachments !== "function") {
    throw new Error("host attachment facts are unavailable");
  }
  const attachments = await readHostPages({
    readPage: (page) => library.getItemAttachments(itemRef, page),
    getItems: (page) =>
      Array.isArray(page?.attachments) ? page.attachments : [],
    operation: "literature-search-ingest attachment read",
  });
  return attachments.some(isUsablePdfAttachment);
}

function semanticDigest(add, remove) {
  const text = `add=${[...add].sort().join(",")};remove=${[...remove]
    .sort()
    .join(",")}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function runIdentity(args) {
  const candidates = [
    args?.runResult?.requestId,
    args?.resultContext?.preflight?.planId,
    args?.resultContext?.aggregate?.id,
  ];
  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (text) return text;
  }
  return "";
}

function statusOperationId(runId, itemRef, add, remove) {
  return [
    STATUS_OPERATION_PREFIX,
    runId,
    `${itemRef.libraryId}:${itemRef.key}`,
    semanticDigest(add, remove),
  ].join(":");
}

async function planTransitions(output, runtime) {
  const byItemRef = new Map();
  const warnings = [];
  for (const entry of eligibleOutcomes(output)) {
    const identity = `${entry.itemRef.libraryId}:${entry.itemRef.key}`;
    const existing = byItemRef.get(identity) || {
      itemRef: entry.itemRef,
      add: new Set(),
      remove: new Set(),
    };
    if (entry.ingestStatus === "created") {
      existing.add.add("need-markdown");
      existing.add.add("need-analysis");
      existing.add.add("need-deep-reading");
    }
    if (entry.outcome.needsCuration === true) {
      existing.add.add("need-metadata-curation");
    }
    byItemRef.set(identity, existing);
  }
  // Current Host attachment facts decide fulltext availability once per parent.
  for (const transition of byItemRef.values()) {
    let usable = false;
    try {
      usable = await corroborateUsablePdf(runtime, transition.itemRef);
    } catch (error) {
      warnings.push({
        code: "search_pdf_facts_unavailable",
        itemRef: transition.itemRef,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    if (usable) {
      transition.remove.add("need-fulltext");
    } else {
      transition.add.add("need-fulltext");
    }
  }
  const transitions = Array.from(byItemRef.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, transition]) => ({
      itemRef: transition.itemRef,
      add: Array.from(transition.add),
      remove: Array.from(transition.remove),
    }))
    .filter((transition) => transition.add.length || transition.remove.length);
  return { transitions, warnings };
}

async function eligibleTransitions(output, runtime) {
  return (await planTransitions(output, runtime)).transitions;
}

async function eligibleItemRefs(output, runtime) {
  return (await eligibleTransitions(output, runtime)).map(
    (entry) => entry.itemRef,
  );
}

async function applyResultImpl(args) {
  const output = resolveOutput(args);
  const { transitions, warnings } = await planTransitions(
    output,
    args?.runtime,
  );
  const runId = runIdentity(args);
  const statusWarnings = [...warnings];
  if (!transitions.length) {
    return {
      ok: true,
      applied: false,
      skipped: true,
      partial: statusWarnings.length > 0,
      taggedItemRefs: [],
      tagFailures: statusWarnings,
      statusWarnings,
    };
  }
  if (!runId) {
    const unavailable = transitions.map((transition) => ({
      code: "search_run_identity_unavailable",
      itemRef: transition.itemRef,
      message: "A run request identity is required to project status tags",
    }));
    return {
      ok: true,
      applied: false,
      skipped: false,
      partial: true,
      taggedItemRefs: [],
      tagFailures: [...statusWarnings, ...unavailable],
      statusWarnings: [...statusWarnings, ...unavailable],
    };
  }

  const statusTags = requireHostApi(args.runtime)?.statusTags;
  const taggedItemRefs = [];
  for (const transition of transitions) {
    try {
      if (typeof statusTags?.transition !== "function") {
        throw new Error("literature-search-ingest statusTags API is unavailable");
      }
      const result = await statusTags.transition({
        operationId: statusOperationId(
          runId,
          transition.itemRef,
          transition.add,
          transition.remove,
        ),
        itemRef: transition.itemRef,
        add: transition.add,
        remove: transition.remove,
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
  eligibleOutcomes,
  eligibleItemRefs,
  eligibleTransitions,
  isUsablePdfAttachment,
  planTransitions,
  resolveOutput,
  runIdentity,
  semanticDigest,
  statusOperationId,
};

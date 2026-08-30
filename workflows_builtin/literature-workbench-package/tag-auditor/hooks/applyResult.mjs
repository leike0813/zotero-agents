import { evaluateTagCompliance } from "../../lib/tagCompliance.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

function completedTraversalEvidence(result) {
  const evidence = result?.completionEvidence;
  if (result?.outcome !== "completed" || !evidence) return null;
  const fields = [
    evidence.evidenceId,
    evidence.criteriaDigest,
    evidence.coverageDigest,
    evidence.completedAt,
  ];
  return fields.every((value) => typeof value === "string" && value.trim())
    ? evidence
    : null;
}

function portableItemIdentity(item) {
  const libraryId = Math.max(
    0,
    Math.floor(Number(item?.ref?.libraryId) || 0),
  );
  const itemKey = String(item?.ref?.key || "").trim();
  return libraryId && itemKey ? { libraryId, itemKey } : null;
}

async function applyResultImpl({ runtime }) {
  const host = requireHostApi(runtime);
  const library = runtime?.workflowHostLiveReads?.library;
  if (typeof library?.traverseItems !== "function") {
    throw new Error("canonical Zotero Host library traversal is unavailable");
  }
  const controlledTags = await host.synthesis.exportTagVocabularyForRegulator();
  const byLibrary = new Map();
  const traversal = await library.traverseItems(
    { scope: "top-level-regular" },
    {},
    async (batch) => {
      for (const item of batch?.items || []) {
        const identity = portableItemIdentity(item);
        if (!identity) continue;
        const result = evaluateTagCompliance({
          tags: Array.isArray(item.tags) ? item.tags : [],
          controlledTags,
        });
        const entries = byLibrary.get(identity.libraryId) || [];
        entries.push({ itemKey: identity.itemKey, ...result });
        byLibrary.set(identity.libraryId, entries);
      }
    },
  );
  if (!completedTraversalEvidence(traversal)) return { libraries: [] };
  const libraryId = Math.max(0, Math.floor(Number(traversal.libraryId) || 0));
  if (!libraryId) return { libraries: [] };
  if (!byLibrary.has(libraryId)) byLibrary.set(libraryId, []);
  const summaries = [];
  for (const [currentLibraryId, entries] of byLibrary) {
    await host.synthesis.replaceTagAuditRecords({
      libraryId: currentLibraryId,
      entries,
    });
    summaries.push({
      libraryId: currentLibraryId,
      audited: entries.length,
      needsTagRegulation: entries.filter((entry) => !entry.compliant).length,
    });
  }
  return { libraries: summaries };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}

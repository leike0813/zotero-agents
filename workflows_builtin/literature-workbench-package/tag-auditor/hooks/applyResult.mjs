import { evaluateTagCompliance } from "../../lib/tagCompliance.mjs";
import { requireHostApi, withPackageRuntimeScope } from "../../lib/runtime.mjs";

function isTopLevelRegularItem(item) {
  if (!item || Number(item.parentID || item.parentItemID || 0) > 0) {
    return false;
  }
  try {
    return item.isRegularItem?.() === true && item.deleted !== true;
  } catch {
    return false;
  }
}

function itemTags(item) {
  try {
    return (item.getTags?.() || []).map((entry) => entry?.tag);
  } catch {
    return [];
  }
}

async function applyResultImpl({ runtime }) {
  const host = requireHostApi(runtime);
  const controlledTags = await host.synthesis.exportTagVocabularyForRegulator();
  const byLibrary = new Map();
  for (const item of await host.items.getAll()) {
    if (!isTopLevelRegularItem(item)) continue;
    const libraryId = Math.max(0, Math.floor(Number(item.libraryID) || 0));
    const itemKey = String(item.key || "").trim();
    if (!libraryId || !itemKey) continue;
    const result = evaluateTagCompliance({
      tags: itemTags(item),
      controlledTags,
    });
    const entries = byLibrary.get(libraryId) || [];
    entries.push({ itemKey, ...result });
    byLibrary.set(libraryId, entries);
  }
  const summaries = [];
  for (const [libraryId, entries] of byLibrary) {
    await host.synthesis.replaceTagAuditRecords({ libraryId, entries });
    summaries.push({
      libraryId,
      audited: entries.length,
      needsTagRegulation: entries.filter((entry) => !entry.compliant).length,
    });
  }
  return { libraries: summaries };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}

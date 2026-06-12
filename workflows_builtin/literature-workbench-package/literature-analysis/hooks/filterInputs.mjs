import { parseGeneratedNoteKind } from "../../lib/referencesNote.mjs";
import { collectSelectedLiteratureSources } from "../../lib/sourceSelection.mjs";

function hasAllGeneratedNotes(parentId, runtime, cache) {
  if (!parentId || cache.has(parentId)) {
    return cache.get(parentId) === true;
  }

  let hasDigest = false;
  let hasReferences = false;
  let hasCitationAnalysis = false;
  try {
    const parentItem = runtime.helpers.resolveItemRef(parentId);
    const noteIds = parentItem.getNotes?.() || [];
    for (const noteRef of noteIds) {
      let noteItem;
      try {
        noteItem = runtime.helpers.resolveItemRef(noteRef);
      } catch {
        noteItem = null;
      }
      if (!noteItem) {
        continue;
      }
      const kind = parseGeneratedNoteKind(noteItem.getNote?.() || "");
      if (kind === "digest") {
        hasDigest = true;
      }
      if (kind === "references") {
        hasReferences = true;
      }
      if (kind === "citation-analysis") {
        hasCitationAnalysis = true;
      }
      if (hasDigest && hasReferences && hasCitationAnalysis) {
        break;
      }
    }
    if (console && typeof console.info === "function") {
      console.info(
        `[literature-analysis/filterInputs] parent=${parentId} notes=${noteIds.length} digest=${hasDigest} references=${hasReferences} citationAnalysis=${hasCitationAnalysis}`,
      );
    }
  } catch {
    // ignore note scan failures and keep workflow runnable
  }

  const matched = hasDigest && hasReferences && hasCitationAnalysis;
  cache.set(parentId, matched);
  return matched;
}

export function filterInputs({ selectionContext, runtime }) {
  const helpers = runtime.helpers;
  const skipCache = new Map();
  const chosen = collectSelectedLiteratureSources({
    selectionContext,
    helpers,
    shouldIncludeParent: (parentId) =>
      !hasAllGeneratedNotes(parentId, runtime, skipCache),
  });

  if (console && typeof console.info === "function") {
    const skippedParentIds = Array.from(skipCache.entries())
      .filter(([, matched]) => matched)
      .map(([parentId]) => parentId);
    if (skippedParentIds.length > 0) {
      console.info(
        `[literature-analysis/filterInputs] skipped parents due to existing notes: ${JSON.stringify(skippedParentIds)}`,
      );
    }
  }

  return helpers.withFilteredAttachments(selectionContext, chosen);
}

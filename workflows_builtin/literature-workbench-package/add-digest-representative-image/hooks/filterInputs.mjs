import { parseGeneratedNoteKind } from "../../lib/referencesNote.mjs";
import { withPackageRuntimeScope } from "../../lib/runtime.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function normalizeText(value) {
  return String(value || "").trim();
}

function addRef(refs, value) {
  if (value == null || value === false) {
    return;
  }
  if (typeof value === "number") {
    refs.push(value);
    return;
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (text) {
      refs.push(text);
    }
    return;
  }
  if (typeof value === "object") {
    addRef(refs, value.id || value.key || value.item?.id || value.item?.key);
  }
}

function resolveItem(runtime, ref) {
  try {
    return runtime.helpers.resolveItemRef(ref) || null;
  } catch {
    return null;
  }
}

function isDigestNote(noteItem) {
  if (!noteItem || typeof noteItem.getNote !== "function") {
    return false;
  }
  return parseGeneratedNoteKind(noteItem.getNote()) === "digest";
}

function collectDigestNotesFromParent(parentItem, runtime) {
  return (parentItem?.getNotes?.() || [])
    .map((ref) => resolveItem(runtime, ref))
    .filter((noteItem) => isDigestNote(noteItem));
}

function noteTarget(noteItem, parentItem) {
  return {
    kind: "digest-note",
    noteItemID: noteItem.id,
    noteItemKey: normalizeText(noteItem.key),
    parentItemID: parentItem.id,
    parentItemKey: normalizeText(parentItem.key),
    parentTitle: normalizeText(parentItem.getField?.("title")),
  };
}

function parentTarget(parentItem, digestNote) {
  return {
    kind: "digest-parent",
    noteItemID: digestNote.id,
    noteItemKey: normalizeText(digestNote.key),
    parentItemID: parentItem.id,
    parentItemKey: normalizeText(parentItem.key),
    parentTitle: normalizeText(parentItem.getField?.("title")),
  };
}

function collectDirectParentRefs(selectionContext) {
  const refs = [];
  for (const entry of Array.isArray(selectionContext?.items?.parents)
    ? selectionContext.items.parents
    : []) {
    addRef(refs, entry);
  }
  return refs;
}

function collectDirectNoteRefs(selectionContext) {
  const refs = [];
  for (const entry of Array.isArray(selectionContext?.items?.notes)
    ? selectionContext.items.notes
    : []) {
    addRef(refs, entry);
  }
  return refs;
}

function buildTargetSelection(selectionContext, target, entryKind, entry) {
  const next = clone(selectionContext);
  next.items = {
    parents: entryKind === "parent" ? [entry] : [],
    notes: entryKind === "note" ? [entry] : [],
    attachments: [],
    children: [],
  };
  next.summary = {
    ...(next.summary || {}),
    parentCount: entryKind === "parent" ? 1 : 0,
    noteCount: entryKind === "note" ? 1 : 0,
    attachmentCount: 0,
    childCount: 0,
  };
  next.selectionType = entryKind;
  next.digestRepresentativeImageTarget = target;
  return next;
}

export function filterInputs({ selectionContext, runtime }) {
  return withPackageRuntimeScope(runtime, () => {
    const parentRefs = collectDirectParentRefs(selectionContext);
    const noteRefs = collectDirectNoteRefs(selectionContext);
    if (parentRefs.length + noteRefs.length !== 1) {
      return null;
    }

    if (parentRefs.length === 1) {
      const parentItem = resolveItem(runtime, parentRefs[0]);
      if (!parentItem) {
        return null;
      }
      const digestNotes = collectDigestNotesFromParent(parentItem, runtime);
      if (digestNotes.length !== 1) {
        return null;
      }
      const parentEntry = (selectionContext?.items?.parents || [])[0] || {
        item: { id: parentItem.id, key: parentItem.key },
      };
      return buildTargetSelection(
        selectionContext,
        parentTarget(parentItem, digestNotes[0]),
        "parent",
        parentEntry,
      );
    }

    const noteItem = resolveItem(runtime, noteRefs[0]);
    if (!isDigestNote(noteItem)) {
      return null;
    }
    const parentItem = resolveItem(runtime, noteItem.parentItemID);
    if (!parentItem) {
      return null;
    }
    const noteEntry = (selectionContext?.items?.notes || [])[0] || {
      item: { id: noteItem.id, key: noteItem.key },
    };
    return buildTargetSelection(
      selectionContext,
      noteTarget(noteItem, parentItem),
      "note",
      noteEntry,
    );
  });
}

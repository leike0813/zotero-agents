import { applyResultImpl } from "../reference-matching/hooks/applyResult.mjs";

function buildSelectionContextForReferenceNote({ noteItem, parentItem }) {
  const parentId =
    (typeof parentItem?.id === "number" && parentItem.id > 0
      ? parentItem.id
      : null) ||
    (typeof noteItem?.parentItemID === "number" && noteItem.parentItemID > 0
      ? noteItem.parentItemID
      : null) ||
    null;
  return {
    selectionType: "note",
    items: {
      notes: [
        {
          item: {
            id: noteItem.id,
            key: noteItem.key,
            itemType: noteItem.itemType,
            title: String(noteItem.getField?.("title") || ""),
            libraryID: noteItem.libraryID,
            parentItemID: parentId,
            data: noteItem.toJSON?.() || null,
          },
          parent: parentId
            ? {
                id: parentId,
                title: String(parentItem?.getField?.("title") || ""),
              }
            : null,
        },
      ],
      attachments: [],
      parents: [],
      children: [],
    },
    summary: {
      noteCount: 1,
      attachmentCount: 0,
      parentCount: 0,
      childCount: 0,
    },
  };
}

export async function applyReferenceMatchingToNote(args) {
  const noteItem = args?.noteItem;
  if (!noteItem) {
    throw new Error("reference matching noteItem is required");
  }
  return applyResultImpl({
    runtime: args.runtime,
    manifest: args.manifest || { version: "0.1.0" },
    runResult: {
      resultJson: {
        selectionContext: buildSelectionContextForReferenceNote({
          noteItem,
          parentItem: args?.parentItem || null,
        }),
        parameter: args?.parameter || {},
      },
    },
  });
}

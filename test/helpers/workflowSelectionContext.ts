import {
  lockSelection,
  type SelectionItemFact,
} from "../../src/modules/selectionContext";
import { setZoteroLibrarySourcePageQueryAdapterForTests } from "../../src/modules/zoteroLibraryPageQuery";
import { createMockZoteroLibrarySourcePageQueryAdapter } from "./zoteroLibraryPageQueryAdapter";
import { isZoteroRuntime } from "../core/workflow-test-utils";

type SelectionTestItem = {
  libraryID?: number;
  key?: string;
  ref?: { libraryId?: number; key?: string };
  parentItemID?: number | false | null;
  itemType?: string;
  dateAdded?: string;
  isAttachment?: () => boolean;
  isNote?: () => boolean;
  getField?: (field: string) => unknown;
  getFilePathAsync?: () => Promise<string | false | null>;
};

/**
 * Convert a Zotero test item into the portable ref input accepted by the
 * production selection builder. Workflow tests should exercise canonical
 * facts rather than recreate the removed rich selection tree.
 */
export async function buildSelectionContext(
  items: readonly SelectionTestItem[],
) {
  if (!isZoteroRuntime()) {
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroLibrarySourcePageQueryAdapter(),
    );
  }
  const facts: SelectionItemFact[] = [];
  for (const item of items) {
    const libraryId = Number(item.ref?.libraryId ?? item.libraryID);
    const key = String(item.ref?.key ?? item.key ?? "");
    const ref = { libraryId, key };
    const parentId = Number(item.parentItemID || 0);
    const parent = parentId > 0 ? Zotero.Items.get(parentId) : null;
    const parentRef = parent
      ? {
          libraryId: Number(parent.libraryID),
          key: String(parent.key),
        }
      : undefined;
    const title = String(item.getField?.("title") || "");
    const createdAt = String(
      item.dateAdded || item.getField?.("dateAdded") || "",
    ).trim();

    if (item.isAttachment?.()) {
      const filePath = String((await item.getFilePathAsync?.()) || "");
      const filename =
        filePath
          .split(/[\\/]+/)
          .filter(Boolean)
          .pop() || title;
      facts.push({
        kind: "attachment",
        ref,
        itemType: "attachment",
        ...(title ? { title } : {}),
        ...(parentRef ? { parentRef } : {}),
        ...(filename ? { filename } : {}),
        contentType:
          String(
            item.getField?.("contentType") || item.getField?.("mimeType") || "",
          ).trim() || null,
        ...(createdAt ? { createdAt } : {}),
        fileState: filePath ? "available" : "missing",
      });
      continue;
    }

    const isNote = item.isNote?.() || itemTypeOf(item) === "note";
    facts.push({
      kind: isNote ? "note" : parentRef ? "child" : "parent",
      ref,
      itemType: isNote ? "note" : String(item.itemType || "").trim(),
      ...(title ? { title } : {}),
      ...(parentRef ? { parentRef } : {}),
      ...(createdAt ? { createdAt } : {}),
    });
  }
  return lockSelection(facts);
}

export function itemRef(item: SelectionTestItem) {
  return {
    libraryId: Number(item.ref?.libraryId ?? item.libraryID),
    key: String(item.ref?.key ?? item.key ?? ""),
  };
}

function itemTypeOf(item: SelectionTestItem) {
  return String(item.itemType || item.getField?.("itemType") || "").trim();
}

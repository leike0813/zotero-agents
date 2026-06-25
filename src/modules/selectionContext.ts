import { measureAsyncTestPerformanceSpan } from "./testPerformanceProbeBridge";

type SelectionSummary = {
  parentCount: number;
  childCount: number;
  attachmentCount: number;
  noteCount: number;
};

type SelectionGroups = {
  parents: Array<Record<string, unknown>>;
  children: Array<Record<string, unknown>>;
  attachments: Array<Record<string, unknown>>;
  notes: Array<Record<string, unknown>>;
};

export type SelectionContext = {
  selectionType: "parent" | "child" | "attachment" | "note" | "mixed" | "none";
  items: SelectionGroups;
  summary: SelectionSummary;
  warnings: string[];
  sampledAt: string;
};

export async function buildSelectionContext(
  items: Zotero.Item[],
): Promise<SelectionContext> {
  return measureAsyncTestPerformanceSpan(
    "buildSelectionContext",
    {
      selectedItemCount: Array.isArray(items) ? items.length : 0,
    },
    async () => {
      const warnings: string[] = [];
      const groups: SelectionGroups = {
        parents: [],
        children: [],
        attachments: [],
        notes: [],
      };

      for (const item of items) {
        if (item.isNote?.()) {
          groups.notes.push(await serializeNoteItem(item, warnings));
          continue;
        }
        if (item.isAttachment()) {
          groups.attachments.push(await serializeAttachment(item, warnings));
          continue;
        }
        if (item.isTopLevelItem()) {
          groups.parents.push(await serializeParentItem(item, warnings));
          continue;
        }
        groups.children.push(await serializeChildItem(item, warnings));
      }

      const summary: SelectionSummary = {
        parentCount: groups.parents.length,
        childCount: groups.children.length,
        attachmentCount: groups.attachments.length,
        noteCount: groups.notes.length,
      };

      const selectionType = resolveSelectionType(summary);

      return {
        selectionType,
        items: groups,
        summary,
        warnings,
        sampledAt: new Date().toISOString(),
      };
    },
  );
}

function resolveSelectionType(summary: SelectionSummary) {
  const types = [
    summary.parentCount > 0,
    summary.childCount > 0,
    summary.attachmentCount > 0,
    summary.noteCount > 0,
  ].filter(Boolean).length;
  if (types === 0) return "none";
  if (types > 1) return "mixed";
  if (summary.parentCount > 0) return "parent";
  if (summary.childCount > 0) return "child";
  if (summary.attachmentCount > 0) return "attachment";
  return "note";
}

async function serializeParentItem(item: Zotero.Item, warnings: string[]) {
  const attachments = await loadItems(item.getAttachments?.() || [], warnings);
  const notes = await loadItems(item.getNotes?.() || [], warnings);
  const childrenIds =
    (item as { getChildren?: () => number[] }).getChildren?.() || [];
  const children = await loadItems(childrenIds, warnings);
  return {
    item: serializeItemBase(item),
    attachments: await Promise.all(
      attachments.map((att) => serializeAttachment(att, warnings)),
    ),
    notes: notes.map(serializeNote),
    tags: item.getTags?.() || [],
    collections: item.getCollections?.() || [],
    children: children.map(serializeItemBase),
  };
}

async function serializeChildItem(item: Zotero.Item, warnings: string[]) {
  const parent = await loadParent(item, warnings);
  const attachments = await loadItems(item.getAttachments?.() || [], warnings);
  const notes = await loadItems(item.getNotes?.() || [], warnings);
  return {
    item: serializeItemBase(item),
    parent,
    attachments: await Promise.all(
      attachments.map((att) => serializeAttachment(att, warnings)),
    ),
    notes: notes.map(serializeNote),
    tags: item.getTags?.() || [],
    collections: item.getCollections?.() || [],
  };
}

async function serializeAttachment(item: Zotero.Item, warnings: string[]) {
  const parent = await loadParent(item, warnings);
  let filePath: string | null = null;
  try {
    filePath = (await item.getFilePathAsync?.()) || null;
  } catch (error) {
    warnings.push(`attachment path unavailable: ${item.key}`);
  }
  return {
    item: serializeItemBase(item),
    parent,
    filePath,
    mimeType: item.getField?.("mimeType") || null,
  };
}

function serializeNote(item: Zotero.Item) {
  return {
    ...serializeItemBase(item),
    note: item.getNote?.() || "",
  };
}

async function serializeNoteItem(item: Zotero.Item, warnings: string[]) {
  const parent = await loadParent(item, warnings);
  return {
    item: serializeItemBase(item),
    parent,
    tags: item.getTags?.() || [],
    collections: item.getCollections?.() || [],
  };
}

function serializeItemBase(item: Zotero.Item) {
  const parentItemID =
    item.parentItemID === false ? null : (item.parentItemID ?? null);
  return {
    id: item.id,
    key: item.key,
    itemType: item.itemType,
    title: item.getField?.("title") || "",
    libraryID: item.libraryID,
    parentItemID,
    data: item.toJSON?.() || null,
  };
}

async function loadItems(ids: number[], warnings: string[]) {
  const results: Zotero.Item[] = [];
  for (const id of ids) {
    const item = Zotero.Items.get(id);
    if (!item) {
      warnings.push(`missing item: ${id}`);
      continue;
    }
    results.push(item);
  }
  return results;
}

async function loadParent(item: Zotero.Item, warnings: string[]) {
  if (!item.parentItemID) return null;
  const parent = Zotero.Items.get(item.parentItemID);
  if (!parent) {
    warnings.push(`missing parent item: ${item.parentItemID}`);
    return null;
  }
  return serializeItemBase(parent);
}

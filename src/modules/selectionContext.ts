import {
  createZoteroHostCapabilityBroker,
  ZoteroHostCapabilityError,
  type ZoteroHostCapabilityBroker,
} from "./zoteroHostCapabilityBroker";
import type {
  AttachmentDetailDto,
  ItemDetailDto,
  PortableItemRef,
  WorkflowCallControl,
} from "../workflows/types";

export type SelectionItemFact = Readonly<{
  kind: "parent" | "child" | "attachment" | "note";
  ref: PortableItemRef;
  itemType: string;
  title?: string;
  parentRef?: PortableItemRef;
  filename?: string | null;
  contentType?: string | null;
  createdAt?: string;
  fileState?: "available" | "missing" | "not_applicable";
}>;
export type GeneratedNoteCandidate = Readonly<{
  ref: PortableItemRef;
  parentRef?: PortableItemRef;
  noteKind: string;
  parentTitle?: string;
}>;
export type SelectionContext = Readonly<{
  items: readonly SelectionItemFact[];
  sampledAt: string;
  exportCandidates?: readonly GeneratedNoteCandidate[];
  digestRepresentativeImageTarget?: GeneratedNoteCandidate;
}>;
export type SelectionReadApi = {
  context: Pick<ZoteroHostCapabilityBroker["context"], "getSelectedItems">;
  library: Pick<ZoteroHostCapabilityBroker["library"], "getItemDetail">;
};

export function selectionTargetRef(
  selection: SelectionContext,
): PortableItemRef | null {
  const item = selection.items[0];
  return item ? item.parentRef || item.ref : null;
}

export function itemRefIdentity(ref: PortableItemRef): string {
  return `${ref.libraryId}:${ref.key}`;
}
export function assertSelectionRef(
  value: unknown,
): asserts value is PortableItemRef {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ZoteroHostCapabilityError(
      "invalid_request",
      "Expected a portable item reference",
      { reason: "invalid_type", field: "selection" },
    );
  }
  const ref = value as Record<string, unknown>;
  if (
    !Number.isSafeInteger(ref.libraryId) ||
    Number(ref.libraryId) <= 0 ||
    typeof ref.key !== "string" ||
    !ref.key.trim() ||
    Object.keys(ref).some((key) => key !== "libraryId" && key !== "key")
  ) {
    throw new ZoteroHostCapabilityError(
      "invalid_request",
      "Expected a complete portable item reference",
      { reason: "invalid_value", field: "selection" },
    );
  }
}
export function lockSelection(
  items: readonly SelectionItemFact[],
  sampledAt = new Date().toISOString(),
): SelectionContext {
  return Object.freeze({
    items: Object.freeze(
      items.map((item) => {
        assertSelectionRef(item.ref);
        if (item.parentRef) assertSelectionRef(item.parentRef);
        return Object.freeze({
          ...item,
          ref: Object.freeze({ ...item.ref }),
          ...(item.parentRef
            ? { parentRef: Object.freeze({ ...item.parentRef }) }
            : {}),
        });
      }),
    ),
    sampledAt,
  });
}
export function attachmentSelectionFact(
  item: AttachmentDetailDto,
): SelectionItemFact {
  return {
    kind: "attachment",
    ref: item.ref,
    itemType: "attachment",
    title: item.title,
    ...(item.parentRef ? { parentRef: item.parentRef } : {}),
    filename: item.filename,
    contentType: item.contentType,
    createdAt: item.createdAt,
    fileState: item.file.state,
  };
}
function detailSelectionFact(detail: ItemDetailDto): SelectionItemFact {
  if (detail.kind === "attachment") return attachmentSelectionFact(detail.item);
  if (detail.kind === "annotation")
    return {
      kind: "child",
      ref: detail.item.ref,
      itemType: "annotation",
      parentRef: detail.item.attachmentRef,
      title: detail.item.text,
    };
  return {
    kind:
      detail.kind === "note"
        ? "note"
        : detail.item.parentRef
          ? "child"
          : "parent",
    ref: detail.item.ref,
    itemType: detail.kind === "regular" ? detail.item.itemType : "note",
    title: detail.item.title,
    ...(detail.item.parentRef ? { parentRef: detail.item.parentRef } : {}),
  };
}
export async function buildSelectionContext(
  refs: readonly PortableItemRef[],
  api: SelectionReadApi = createZoteroHostCapabilityBroker(),
  control?: WorkflowCallControl,
): Promise<SelectionContext> {
  refs.forEach(assertSelectionRef);
  const items: SelectionItemFact[] = [];
  for (const ref of refs)
    items.push(
      detailSelectionFact(await api.library.getItemDetail(ref, control)),
    );
  return lockSelection(items);
}
export async function readSelectionContext(
  api: SelectionReadApi = createZoteroHostCapabilityBroker(),
  control?: WorkflowCallControl,
): Promise<SelectionContext> {
  const items: SelectionItemFact[] = [];
  const cursors = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await api.context.getSelectedItems(
      { limit: 100, ...(cursor ? { cursor } : {}) },
      control,
    );
    for (const item of page.items)
      items.push({
        kind:
          item.itemType === "attachment"
            ? "attachment"
            : item.itemType === "note"
              ? "note"
              : item.parentRef
                ? "child"
                : "parent",
        ref: item.ref,
        itemType: item.itemType,
        ...(item.title !== undefined ? { title: item.title } : {}),
        ...(item.parentRef ? { parentRef: item.parentRef } : {}),
      });
    if (!page.hasMore) return lockSelection(items);
    if (!page.nextCursor || cursors.has(page.nextCursor))
      throw new ZoteroHostCapabilityError(
        "invalid_request",
        "Invalid selection continuation",
        { reason: "invalid_value", field: "cursor" },
      );
    cursor = page.nextCursor;
    cursors.add(cursor);
  } while (cursor);
  return lockSelection(items);
}
export function selectionCounts(selection: SelectionContext) {
  const counts = { parents: 0, children: 0, attachments: 0, notes: 0 };
  for (const item of selection.items) {
    if (item.kind === "parent") counts.parents++;
    else if (item.kind === "child") counts.children++;
    else if (item.kind === "attachment") counts.attachments++;
    else counts.notes++;
  }
  return { ...counts, total: selection.items.length };
}

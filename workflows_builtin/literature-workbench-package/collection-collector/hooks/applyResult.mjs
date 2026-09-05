import { requireHostApi } from "../../lib/runtime.mjs";

const PAPER_REF_PATTERN = /^([1-9][0-9]*):([A-Za-z0-9]+)$/;
const INCLUSION_THRESHOLD = 0.65;
const EXCLUDED_ITEM_TYPES = new Set(["attachment", "note", "annotation"]);

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function resolveWorkflowParameters(context) {
  const candidates = [
    context?.request?.parameter,
    context?.request?.request?.json?.parameter,
    context?.runResult?.resultJson?.parameter,
  ];
  return candidates.map(asObject).find((entry) => Object.keys(entry).length) || {};
}

function normalizePaperRef(value, expectedLibraryId) {
  const paperRef = normalizeString(value);
  const match = paperRef.match(PAPER_REF_PATTERN);
  if (!match) {
    throw new Error(`collection-collector result contains invalid paper_ref: ${paperRef || "<empty>"}`);
  }
  if (Number(match[1]) !== expectedLibraryId) {
    throw new Error(`collection-collector result contains cross-library paper_ref: ${paperRef}`);
  }
  return paperRef;
}

function normalizeSelectedItems(result, expectedLibraryId) {
  if (!Array.isArray(result.selected_items)) {
    throw new Error("collection-collector result selected_items must be an array");
  }
  const seen = new Set();
  const items = result.selected_items.map((raw, index) => {
    const item = asObject(raw);
    const paperRef = normalizePaperRef(item.paper_ref, expectedLibraryId);
    if (seen.has(paperRef)) {
      throw new Error(`collection-collector result contains duplicate paper_ref: ${paperRef}`);
    }
    seen.add(paperRef);
    const semanticRelevance = Number(item.semantic_relevance);
    if (
      !Number.isFinite(semanticRelevance) ||
      semanticRelevance < INCLUSION_THRESHOLD ||
      semanticRelevance > 1
    ) {
      throw new Error(
        `collection-collector result selected_items[${index}].semantic_relevance must be between ${INCLUSION_THRESHOLD} and 1`,
      );
    }
    if (!normalizeString(item.title) || !normalizeString(item.reason)) {
      throw new Error(`collection-collector result selected_items[${index}] lacks title or reason`);
    }
    return { ...item, paper_ref: paperRef, semantic_relevance: semanticRelevance };
  });
  if (Number(result.selected_count) !== items.length) {
    throw new Error("collection-collector result selected_count does not match selected_items");
  }
  return items;
}

function paperRefFromItem(item, fallbackLibraryId) {
  const libraryId = Number(
    item?.ref?.libraryId ?? item?.libraryId ?? item?.libraryID ?? fallbackLibraryId,
  );
  const key = normalizeString(
    item?.ref?.key ?? item?.key ?? item?.itemKey ?? item?.item_key,
  );
  return libraryId > 0 && key ? `${libraryId}:${key}` : "";
}

function portableRef(value) {
  const match = normalizeString(value).match(PAPER_REF_PATTERN);
  if (!match) throw new Error(`invalid portable item ref: ${value}`);
  return { libraryId: Number(match[1]), key: match[2] };
}

async function listCurrentCollectionMembers(host, args) {
  const refs = new Set();
  let cursor;
  for (let pageIndex = 0; pageIndex < 10000; pageIndex += 1) {
    const input = {
      libraryId: args.libraryId,
      collectionKey: args.collectionKey,
      limit: 100,
    };
    if (cursor !== undefined) {
      input.cursor = cursor;
    }
    const page = await host.library.listItems(input);
    for (const item of page.items) {
      const paperRef = paperRefFromItem(item, args.libraryId);
      if (paperRef) {
        refs.add(paperRef);
      }
    }
    if (page?.hasMore !== true) {
      return refs;
    }
    const nextCursor = normalizeString(page?.nextCursor);
    if (!nextCursor || nextCursor === cursor) {
      throw new Error("collection-collector apply received hasMore without nextCursor");
    }
    cursor = nextCursor;
  }
  throw new Error("collection-collector apply exceeded collection pagination guard");
}

function assertTopLevelRegularItem(detail, paperRef, expectedLibraryId) {
  if (!detail || detail.kind !== "regular") {
    throw new Error(`collection-collector apply cannot resolve item: ${paperRef}`);
  }
  if (detail.item.ref.libraryId !== expectedLibraryId) {
    throw new Error(`collection-collector apply resolved cross-library item: ${paperRef}`);
  }
  const itemType = normalizeString(detail.item.itemType).toLowerCase();
  if (!itemType || EXCLUDED_ITEM_TYPES.has(itemType)) {
    throw new Error(`collection-collector apply requires a regular Zotero item: ${paperRef}`);
  }
}

export async function applyResult(context = {}) {
  if (context.runResult?.status && context.runResult.status !== "succeeded") {
    return { ok: true, status: "skipped", addedCount: 0 };
  }
  const result = asObject(context.resultContext?.resultJson);
  if (result.kind === "collection_collector_canceled") {
    return { ok: true, status: "skipped", reason: result.reason, addedCount: 0 };
  }
  if (result.kind !== "collection_membership_selection") {
    throw new Error("collection-collector apply requires collection_membership_selection result");
  }

  const parameters = resolveWorkflowParameters(context);
  const collection = normalizeString(parameters.collection);
  const collectionMatch = collection.match(PAPER_REF_PATTERN);
  if (!collectionMatch || collection !== normalizeString(result.collection)) {
    throw new Error("collection-collector result collection does not match workflow input");
  }
  if (!normalizeString(parameters.collectionScope)) {
    throw new Error("collection-collector apply requires collectionScope");
  }
  const libraryId = Number(collectionMatch[1]);
  const collectionKey = collectionMatch[2];
  const selectedItems = normalizeSelectedItems(result, libraryId);
  const host = requireHostApi(context.runtime);
  const existing = await listCurrentCollectionMembers(host, {
    libraryId,
    collectionKey,
  });
  const pending = selectedItems.filter((item) => !existing.has(item.paper_ref));

  for (const item of pending) {
    const detail = await host.library.getItemDetail(portableRef(item.paper_ref));
    assertTopLevelRegularItem(detail, item.paper_ref, libraryId);
  }
  if (pending.length === 0) {
    return {
      ok: true,
      status: "noop",
      addedCount: 0,
      alreadyPresentCount: selectedItems.length,
    };
  }

  await host.mutations.execute({
    operation: "collection.updateMembership",
    operationId: `collection-collector:${collection}:${Date.now().toString(36)}`,
    collectionRef: { libraryId, key: collectionKey },
    add: pending.map((item) => portableRef(item.paper_ref)),
    remove: [],
  });
  return {
    ok: true,
    status: "added",
    addedCount: pending.length,
    alreadyPresentCount: selectedItems.length - pending.length,
    addedItems: pending.map((item) => item.paper_ref),
  };
}

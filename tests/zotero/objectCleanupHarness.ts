import { appendRuntimeLog } from "../../src/modules/runtimeLogManager";
import {
  measureAsyncTestPerformanceSpan,
  recordTestPerformanceSpan,
} from "../../src/modules/testPerformanceProbeBridge";
import { shouldKeepZoteroTestObjects } from "./testObjectKeepFlag";

type RuntimeWithCleanupInstallFlag = typeof globalThis & {
  IOUtils?: unknown;
  PathUtils?: unknown;
};

type ItemLike = {
  id?: number | null;
  key?: string;
  itemType?: string;
  eraseTx?: () => Promise<unknown>;
  parentItemID?: number | null;
  isNote?: () => boolean;
  isAttachment?: () => boolean;
};

type CollectionLike = {
  id?: number | null;
  key?: string;
  name?: string;
  eraseTx?: () => Promise<unknown>;
};

const trackedItemIds = new Set<number>();
const trackedCollectionIds = new Set<number>();

function getRuntime() {
  return globalThis as RuntimeWithCleanupInstallFlag;
}

function isRealZoteroRuntime() {
  const runtime = getRuntime();
  return (
    !!runtime.IOUtils &&
    !!runtime.PathUtils &&
    typeof Zotero !== "undefined" &&
    typeof Zotero.Items?.get === "function" &&
    typeof Zotero.Collections?.get === "function"
  );
}

function logCleanupWarning(message: string, details: Record<string, unknown>) {
  appendRuntimeLog({
    level: "warn",
    scope: "test",
    stage: "zotero-test-object-cleanup",
    message,
    details,
  });
}

function trackItemId(id: number | null | undefined) {
  if (
    !isRealZoteroRuntime() ||
    typeof id !== "number" ||
    !Number.isFinite(id)
  ) {
    return;
  }
  trackedItemIds.add(id);
}

function trackCollectionId(id: number | null | undefined) {
  if (
    !isRealZoteroRuntime() ||
    typeof id !== "number" ||
    !Number.isFinite(id)
  ) {
    return;
  }
  trackedCollectionIds.add(id);
}

function untrackItemId(id: number | null | undefined) {
  if (typeof id !== "number" || !Number.isFinite(id)) {
    return;
  }
  trackedItemIds.delete(id);
}

function untrackCollectionId(id: number | null | undefined) {
  if (typeof id !== "number" || !Number.isFinite(id)) {
    return;
  }
  trackedCollectionIds.delete(id);
}

function isCollectionLike(value: unknown): value is CollectionLike {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as CollectionLike & ItemLike;
  return (
    typeof candidate.eraseTx === "function" &&
    typeof candidate.itemType !== "string" &&
    typeof candidate.name === "string"
  );
}

function isItemLike(value: unknown): value is ItemLike {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as ItemLike;
  return (
    typeof candidate.eraseTx === "function" &&
    (typeof candidate.itemType === "string" ||
      typeof candidate.key === "string")
  );
}

function classifyTrackedItems(ids: number[]) {
  const notes: ItemLike[] = [];
  const attachments: ItemLike[] = [];
  const childItems: ItemLike[] = [];
  const parentItems: ItemLike[] = [];
  for (const id of ids) {
    const item = Zotero.Items.get(id) as ItemLike | undefined;
    if (!item) {
      continue;
    }
    const isNote =
      typeof item.isNote === "function"
        ? item.isNote()
        : item.itemType === "note";
    if (isNote) {
      notes.push(item);
      continue;
    }
    const isAttachment =
      typeof item.isAttachment === "function"
        ? item.isAttachment()
        : item.itemType === "attachment";
    if (isAttachment) {
      attachments.push(item);
      continue;
    }
    if (typeof item.parentItemID === "number" && item.parentItemID > 0) {
      childItems.push(item);
      continue;
    }
    parentItems.push(item);
  }
  return { notes, attachments, childItems, parentItems };
}

async function eraseBestEffort(
  target: ItemLike | CollectionLike | undefined,
  kind: "item" | "collection",
) {
  if (!target || typeof target.eraseTx !== "function") {
    return;
  }
  const startedAt = Date.now();
  try {
    await target.eraseTx();
  } catch (error) {
    logCleanupWarning("failed to erase tracked Zotero test object", {
      kind,
      id: target.id ?? null,
      key: target.key ?? null,
      itemType: (target as ItemLike).itemType ?? null,
      name: (target as CollectionLike).name ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    recordTestPerformanceSpan({
      name: "zoteroTestObjectCleanup:eraseTx",
      startedAt,
      durationMs: Date.now() - startedAt,
      labels: {
        kind,
        itemType: (target as ItemLike).itemType || "",
      },
    });
  }
}

export function registerZoteroTestObjectForCleanup(
  target: ItemLike | CollectionLike | number | null | undefined,
) {
  if (
    !isRealZoteroRuntime() ||
    target === null ||
    typeof target === "undefined"
  ) {
    return;
  }
  if (typeof target === "number") {
    trackItemId(target);
    return;
  }
  if (isCollectionLike(target)) {
    trackCollectionId(target.id);
    return;
  }
  if (isItemLike(target)) {
    trackItemId(target.id);
  }
}

export function registerZoteroTestObjectsForCleanup(
  targets: Array<ItemLike | CollectionLike | number | null | undefined>,
) {
  for (const target of targets) {
    registerZoteroTestObjectForCleanup(target);
  }
}

export function unregisterZoteroTestObjectForCleanup(
  target: ItemLike | CollectionLike | number | null | undefined,
) {
  if (target === null || typeof target === "undefined") {
    return;
  }
  if (typeof target === "number") {
    untrackItemId(target);
    return;
  }
  if (isCollectionLike(target)) {
    untrackCollectionId(target.id);
    return;
  }
  if (isItemLike(target)) {
    untrackItemId(target.id);
  }
}

export function getTrackedZoteroTestObjectIdsForTests() {
  return {
    itemIds: Array.from(trackedItemIds).sort((left, right) => left - right),
    collectionIds: Array.from(trackedCollectionIds).sort(
      (left, right) => left - right,
    ),
  };
}

export function resetTrackedZoteroTestObjectsForTests() {
  trackedItemIds.clear();
  trackedCollectionIds.clear();
}

export async function cleanupTrackedZoteroTestObjects() {
  return measureAsyncTestPerformanceSpan(
    "zoteroTestObjectCleanup:phaseTotal",
    {
      trackedItemCount: trackedItemIds.size,
      trackedCollectionCount: trackedCollectionIds.size,
    },
    async () => {
      const itemIds = Array.from(trackedItemIds);
      const collectionIds = Array.from(trackedCollectionIds);
      resetTrackedZoteroTestObjectsForTests();
      if (
        !isRealZoteroRuntime() ||
        (itemIds.length === 0 && collectionIds.length === 0)
      ) {
        return;
      }
      if (shouldKeepZoteroTestObjects()) {
        return;
      }

      const buckets = classifyTrackedItems(itemIds);
      for (const note of buckets.notes) {
        await eraseBestEffort(note, "item");
      }
      for (const attachment of buckets.attachments) {
        await eraseBestEffort(attachment, "item");
      }
      for (const childItem of buckets.childItems) {
        await eraseBestEffort(childItem, "item");
      }
      for (const parentItem of buckets.parentItems) {
        await eraseBestEffort(parentItem, "item");
      }
      for (const id of collectionIds) {
        const collection = Zotero.Collections.get(id) as
          | CollectionLike
          | undefined;
        await eraseBestEffort(collection, "collection");
      }
    },
  );
}

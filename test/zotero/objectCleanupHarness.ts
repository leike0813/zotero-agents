import { handlers } from "../../src/handlers";
import { appendRuntimeLog } from "../../src/modules/runtimeLogManager";
import {
  measureAsyncTestPerformanceSpan,
  recordTestPerformanceSpan,
} from "../../src/modules/testPerformanceProbeBridge";
import { shouldKeepZoteroTestObjects } from "./testObjectKeepFlag";

const INSTALL_FLAG = "__zs_zotero_test_object_cleanup_installed__";

type RuntimeWithCleanupInstallFlag = typeof globalThis & {
  [INSTALL_FLAG]?: boolean;
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

function resolveItemId(ref: number | string | ItemLike) {
  if (typeof ref === "number") {
    return ref;
  }
  if (typeof ref === "string") {
    const item = Zotero.Items.getByLibraryAndKey?.(
      Zotero.Libraries.userLibraryID,
      ref,
    );
    return item?.id;
  }
  return ref?.id ?? undefined;
}

function resolveCollectionId(ref: number | string | CollectionLike) {
  if (typeof ref === "number") {
    return ref;
  }
  if (typeof ref === "string") {
    const collection = Zotero.Collections.getByLibraryAndKey?.(
      Zotero.Libraries.userLibraryID,
      ref,
    );
    return collection?.id;
  }
  return ref?.id ?? undefined;
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

function wrapHandlerMethod<T extends (...args: any[]) => any>(
  target: Record<string, unknown>,
  key: string,
  wrapper: (original: T) => T,
) {
  const current = target[key];
  if (typeof current !== "function") {
    return;
  }
  target[key] = wrapper(current as T);
}

function installHandlerWrappers() {
  wrapHandlerMethod(
    handlers.item,
    "create",
    (original) =>
      (async (...args: Parameters<typeof original>) => {
        const startedAt = Date.now();
        try {
          const item = await original(...args);
          trackItemId((item as ItemLike)?.id);
          return item;
        } finally {
          recordTestPerformanceSpan({
            name: "handlers.item.create",
            startedAt,
            durationMs: Date.now() - startedAt,
            labels: {
              itemType: String(
                (args[0] as { itemType?: string })?.itemType || "",
              ),
            },
          });
        }
      }) as typeof original,
  );
  wrapHandlerMethod(
    handlers.parent,
    "addNote",
    (original) =>
      (async (...args: Parameters<typeof original>) => {
        const startedAt = Date.now();
        try {
          const note = await original(...args);
          trackItemId((note as ItemLike)?.id);
          return note;
        } finally {
          recordTestPerformanceSpan({
            name: "handlers.parent.addNote",
            startedAt,
            durationMs: Date.now() - startedAt,
            labels: {
              parentId:
                resolveItemId(args[0] as number | string | ItemLike) ?? null,
            },
          });
        }
      }) as typeof original,
  );
  wrapHandlerMethod(
    handlers.parent,
    "addAttachment",
    (original) =>
      (async (...args: Parameters<typeof original>) => {
        const attachment = await original(...args);
        trackItemId((attachment as ItemLike)?.id);
        return attachment;
      }) as typeof original,
  );
  wrapHandlerMethod(
    handlers.note,
    "create",
    (original) =>
      (async (...args: Parameters<typeof original>) => {
        const note = await original(...args);
        trackItemId((note as ItemLike)?.id);
        return note;
      }) as typeof original,
  );
  wrapHandlerMethod(
    handlers.attachment,
    "create",
    (original) =>
      (async (...args: Parameters<typeof original>) => {
        const attachment = await original(...args);
        trackItemId((attachment as ItemLike)?.id);
        return attachment;
      }) as typeof original,
  );
  wrapHandlerMethod(
    handlers.attachment,
    "createFromPath",
    (original) =>
      (async (...args: Parameters<typeof original>) => {
        const startedAt = Date.now();
        try {
          const attachment = await original(...args);
          trackItemId((attachment as ItemLike)?.id);
          return attachment;
        } finally {
          recordTestPerformanceSpan({
            name: "handlers.attachment.createFromPath",
            startedAt,
            durationMs: Date.now() - startedAt,
            labels: {
              hasParent: !!(args[0] as { parent?: unknown })?.parent,
              hasPath: !!String(
                (args[0] as { path?: string })?.path || "",
              ).trim(),
              hasDataPath: !!String(
                (args[0] as { dataPath?: string })?.dataPath || "",
              ).trim(),
            },
          });
        }
      }) as typeof original,
  );
  wrapHandlerMethod(
    handlers.collection,
    "create",
    (original) =>
      (async (...args: Parameters<typeof original>) => {
        const collection = await original(...args);
        trackCollectionId((collection as CollectionLike)?.id);
        return collection;
      }) as typeof original,
  );
  wrapHandlerMethod(
    handlers.item,
    "remove",
    (original) =>
      (async (...args: Parameters<typeof original>) => {
        const startedAt = Date.now();
        const id = resolveItemId(args[0] as number | string | ItemLike);
        try {
          return await original(...args);
        } finally {
          untrackItemId(id);
          recordTestPerformanceSpan({
            name: "handlers.item.remove",
            startedAt,
            durationMs: Date.now() - startedAt,
            labels: {
              kind: "item",
            },
          });
        }
      }) as typeof original,
  );
  wrapHandlerMethod(
    handlers.note,
    "remove",
    (original) =>
      (async (...args: Parameters<typeof original>) => {
        const startedAt = Date.now();
        const id = resolveItemId(args[0] as number | string | ItemLike);
        try {
          return await original(...args);
        } finally {
          untrackItemId(id);
          recordTestPerformanceSpan({
            name: "handlers.note.remove",
            startedAt,
            durationMs: Date.now() - startedAt,
            labels: {
              kind: "note",
            },
          });
        }
      }) as typeof original,
  );
  wrapHandlerMethod(
    handlers.attachment,
    "remove",
    (original) =>
      (async (...args: Parameters<typeof original>) => {
        const startedAt = Date.now();
        const id = resolveItemId(args[0] as number | string | ItemLike);
        try {
          return await original(...args);
        } finally {
          untrackItemId(id);
          recordTestPerformanceSpan({
            name: "handlers.attachment.remove",
            startedAt,
            durationMs: Date.now() - startedAt,
            labels: {
              kind: "attachment",
            },
          });
        }
      }) as typeof original,
  );
  wrapHandlerMethod(
    handlers.collection,
    "delete",
    (original) =>
      (async (...args: Parameters<typeof original>) => {
        const startedAt = Date.now();
        const id = resolveCollectionId(
          args[0] as number | string | CollectionLike,
        );
        try {
          return await original(...args);
        } finally {
          untrackCollectionId(id);
          recordTestPerformanceSpan({
            name: "handlers.collection.delete",
            startedAt,
            durationMs: Date.now() - startedAt,
            labels: {
              kind: "collection",
            },
          });
        }
      }) as typeof original,
  );
}

export function installZoteroTestObjectCleanupHarness() {
  const runtime = getRuntime();
  if (runtime[INSTALL_FLAG]) {
    return;
  }
  runtime[INSTALL_FLAG] = true;
  installHandlerWrappers();
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

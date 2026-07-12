import { measureAsyncTestPerformanceSpan } from "../modules/testPerformanceProbeBridge";

type ItemRef = Zotero.Item | number | string;
type NotePayload = { content: string };
type FileSpec = { file: any } | { filePath: string };
type FieldPatch = Record<string, string | number | boolean | null>;
type CreatorPatch = Array<{
  firstName?: string;
  lastName?: string;
  name?: string;
  creatorType?: string;
}>;
type ParentMetadataPatch = {
  itemType?: string | null;
  fields?: FieldPatch | null;
  creators?: CreatorPatch | null;
};
type CreateItemOptions = {
  itemType: string;
  parent?: ItemRef | null;
  data?: Record<string, unknown> | null;
  fields?: FieldPatch;
  libraryID?: number;
};
type CreateItemFromJsonOptions = {
  itemJson: Record<string, unknown>;
  libraryID?: number;
};
type CreateCollectionOptions = {
  name: string;
  libraryID?: number;
};
type AttachmentPathOptions = {
  parent?: ItemRef | null;
  path?: string | null;
  dataPath?: string | null;
  itemKey?: string;
  libraryID?: number;
  title?: string | null;
  mimeType?: string | null;
  charset?: string | null;
  url?: string | null;
  allowMissing?: boolean;
};
type AttachmentUrlOptions = {
  parent: ItemRef;
  url: string;
  title?: string | null;
  mimeType?: string | null;
  deduplicate?: boolean;
};

const PORTABLE_ITEM_IDENTITY_FIELDS = new Set([
  "id",
  "key",
  "version",
  "dateAdded",
  "dateModified",
  "collections",
  "relations",
  "parentItem",
  "parentItemID",
]);

function sanitizePortableItemJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Portable item JSON must be an object");
  }
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!PORTABLE_ITEM_IDENTITY_FIELDS.has(key) && entry !== undefined) {
      output[key] = JSON.parse(JSON.stringify(entry));
    }
  }
  if (!String(output.itemType || "").trim()) {
    throw new Error("Portable item JSON itemType is required");
  }
  return output;
}

function assertNonEmptyTags(tags: string[]) {
  for (const tag of tags) {
    if (typeof tag !== "string" || tag.trim().length === 0) {
      throw new Error("Tag must be a non-empty string");
    }
  }
}

function getItemTypeID(item: Zotero.Item) {
  const itemTypeID = (item as unknown as { itemTypeID?: number }).itemTypeID;
  if (itemTypeID) {
    return itemTypeID;
  }
  if (Zotero.ItemTypes?.getID) {
    return Zotero.ItemTypes.getID(item.itemType);
  }
  throw new Error("Unable to resolve item type ID");
}

function assertValidField(item: Zotero.Item, field: string) {
  if (!Zotero.ItemFields?.getID) {
    return;
  }
  const fieldID = Zotero.ItemFields.getID(field);
  if (!fieldID) {
    throw new Error(`Invalid field: ${field}`);
  }
  const itemTypeID = getItemTypeID(item);
  let isValid = Zotero.ItemFields.isValidForType(fieldID, itemTypeID);
  if (!isValid) {
    const baseFieldID = Zotero.ItemFields.getBaseIDFromTypeAndField(
      itemTypeID,
      fieldID,
    );
    if (baseFieldID) {
      const mappedFieldID = Zotero.ItemFields.getFieldIDFromTypeAndBase(
        itemTypeID,
        baseFieldID,
      );
      if (mappedFieldID) {
        isValid = true;
      }
    }
  }
  if (!isValid) {
    throw new Error(`Invalid field for item type: ${field}`);
  }
}

type PerformanceLabels = Record<string, unknown>;

function buildItemPerformanceLabels(
  item: Zotero.Item,
  labels?: PerformanceLabels,
): PerformanceLabels {
  return {
    itemType: item.itemType || "",
    ...labels,
  };
}

async function saveItemTx(
  item: Zotero.Item,
  spanName: string,
  labels?: PerformanceLabels,
) {
  return measureAsyncTestPerformanceSpan(
    spanName,
    buildItemPerformanceLabels(item, labels),
    () => item.saveTx(),
  );
}

async function eraseItemTx(
  item: Zotero.Item,
  spanName: string,
  labels?: PerformanceLabels,
) {
  return measureAsyncTestPerformanceSpan(
    spanName,
    buildItemPerformanceLabels(item, labels),
    () => item.eraseTx(),
  );
}

async function applyFieldPatch(
  item: Zotero.Item,
  patch: FieldPatch,
  options?: {
    spanName?: string;
    labels?: PerformanceLabels;
  },
) {
  Object.entries(patch).forEach(([field, value]) => {
    assertValidField(item, field);
    item.setField(field, value as any);
  });
  await saveItemTx(
    item,
    options?.spanName || "handlers:applyFieldPatch:saveTx",
    options?.labels,
  );
}

function normalizeCreatorPatch(creators: CreatorPatch | null | undefined) {
  if (!Array.isArray(creators)) {
    return [];
  }
  return creators
    .map((creator) => {
      const firstName = String(creator?.firstName || "").trim();
      const lastName = String(creator?.lastName || "").trim();
      const name = String(creator?.name || "").trim();
      const creatorType = String(creator?.creatorType || "").trim() || "author";
      if (name) {
        return { name, creatorType };
      }
      if (firstName || lastName) {
        return { firstName, lastName, creatorType };
      }
      return null;
    })
    .filter(Boolean) as CreatorPatch;
}

function applyValidFieldPatch(
  item: Zotero.Item,
  patch: FieldPatch | null | undefined,
) {
  let applied = 0;
  for (const [field, value] of Object.entries(patch || {})) {
    try {
      assertValidField(item, field);
    } catch {
      continue;
    }
    item.setField(field, value as any);
    applied += 1;
  }
  return applied;
}

const NON_BIBLIOGRAPHIC_ITEM_TYPES = new Set([
  "attachment",
  "note",
  "annotation",
]);

function applyValidItemTypePatch(item: Zotero.Item, itemType: unknown) {
  const targetType = String(itemType || "").trim();
  if (
    !targetType ||
    targetType === item.itemType ||
    NON_BIBLIOGRAPHIC_ITEM_TYPES.has(targetType) ||
    !item.isRegularItem?.()
  ) {
    return false;
  }
  try {
    const targetTypeID = Zotero.ItemTypes.getID(targetType);
    item.setField("itemTypeID" as any, targetTypeID as any);
    return item.itemType === targetType;
  } catch {
    return false;
  }
}

function resolveItem(ref: ItemRef): Zotero.Item {
  if (typeof ref === "object") {
    return ref;
  }
  if (typeof ref === "number") {
    const item = Zotero.Items.get(ref);
    if (!item) {
      throw new Error(`Item not found: ${ref}`);
    }
    return item;
  }
  const libraryID = Zotero.Libraries.userLibraryID;
  const item = Zotero.Items.getByLibraryAndKey(libraryID, ref);
  if (!item) {
    throw new Error(`Item not found: ${ref}`);
  }
  return item;
}

function resolveItems(refs: ItemRef | ItemRef[]): Zotero.Item[] {
  const list = Array.isArray(refs) ? refs : [refs];
  return list.map(resolveItem);
}

function resolveCollectionId(collection: number | string | Zotero.Collection) {
  if (typeof collection === "number" || typeof collection === "string") {
    return collection;
  }
  return collection.id || collection.key;
}

function setParent(item: Zotero.Item, parentRef: ItemRef | null | undefined) {
  if (!parentRef) {
    return;
  }
  const parent = resolveItem(parentRef);
  (item as unknown as { parentID?: number }).parentID = parent.id;
  (item as unknown as { parentItemID?: number | null }).parentItemID =
    parent.id;
}

function getCollectionByIdOrKey(idOrKey: number | string) {
  if (!Zotero.Collections) {
    throw new Error("Zotero.Collections is not available");
  }
  if (typeof idOrKey === "number") {
    return Zotero.Collections.get(idOrKey);
  }
  if (Zotero.Collections.getByLibraryAndKey) {
    return Zotero.Collections.getByLibraryAndKey(
      Zotero.Libraries.userLibraryID,
      idOrKey,
    );
  }
  return undefined;
}

function assertCollectionExists(idOrKey: number | string) {
  const collection = getCollectionByIdOrKey(idOrKey);
  if (!collection) {
    throw new Error(`Collection not found: ${idOrKey}`);
  }
}

async function resolveFile(spec: FileSpec) {
  if ("file" in spec) {
    return spec.file;
  }
  throw new Error("filePath is not supported; provide a file object");
}

function buildFieldPatch(
  item: Zotero.Item,
  data?: Record<string, unknown> | null,
  fallbackTitle?: string,
  override?: FieldPatch,
) {
  const patch: FieldPatch = {};
  if (data) {
    for (const [field, value] of Object.entries(data)) {
      if (
        typeof value !== "string" &&
        typeof value !== "number" &&
        typeof value !== "boolean" &&
        value !== null
      ) {
        continue;
      }
      try {
        assertValidField(item, field);
      } catch {
        continue;
      }
      patch[field] = value;
    }
  }
  if (!("title" in patch) && fallbackTitle) {
    patch.title = fallbackTitle;
  }
  if (override) {
    Object.assign(patch, override);
  }
  return patch;
}

function extractFileNameFromPath(path?: string | null) {
  if (!path) return null;
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

function normalizeComparableUrl(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function readItemField(item: Zotero.Item, field: string) {
  try {
    return String(item.getField?.(field as any) || "").trim();
  } catch {
    return "";
  }
}

function findChildAttachmentByUrl(parent: Zotero.Item, url: string) {
  const target = normalizeComparableUrl(url);
  if (!target) {
    return null;
  }
  let attachmentIds: unknown[] = [];
  try {
    attachmentIds = parent.getAttachments?.() || [];
  } catch {
    attachmentIds = [];
  }
  for (const id of attachmentIds) {
    const attachment = Zotero.Items?.get?.(id as number);
    if (!attachment) {
      continue;
    }
    if (normalizeComparableUrl(readItemField(attachment, "url")) === target) {
      return attachment;
    }
  }
  return null;
}

function assertHttpUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`Attachment URL must be HTTP(S): ${url}`);
  }
}

async function ensureFileFromPath(options: AttachmentPathOptions) {
  const allowMissing = options.allowMissing ?? false;
  const dataPath = options.dataPath || null;
  let filePath = options.path || null;

  if (!filePath && dataPath) {
    if (
      dataPath.startsWith("attachments:") &&
      Zotero.Attachments?.resolveRelativePath
    ) {
      const resolved = Zotero.Attachments.resolveRelativePath(dataPath);
      filePath = resolved || null;
    } else if (
      dataPath.startsWith("storage:") &&
      Zotero.Attachments?.getStorageDirectoryByLibraryAndKey &&
      options.itemKey
    ) {
      const relative = dataPath.replace(/^storage:/, "");
      const dir = Zotero.Attachments.getStorageDirectoryByLibraryAndKey(
        options.libraryID ?? Zotero.Libraries.userLibraryID,
        options.itemKey,
      );
      const nsFile = Zotero.File.pathToFile(dir.path ?? dir);
      const parts = relative.split(/[\\/]/).filter(Boolean);
      for (const part of parts) {
        nsFile.append(part);
      }
      filePath = nsFile.path;
    } else {
      filePath = dataPath;
    }
  }

  let file = filePath ? Zotero.File.pathToFile(filePath) : null;
  if (!file || !file.exists()) {
    if (!allowMissing) {
      const missing = filePath || dataPath || "unknown";
      throw new Error(`Attachment file not found: ${missing}`);
    }
    const tmpDir = Zotero.getTempDirectory();
    tmpDir.append("zotero-skills-fixtures");
    await Zotero.File.createDirectoryIfMissingAsync(tmpDir as any);
    const tmpFile = Zotero.File.pathToFile(tmpDir.path);
    const name =
      extractFileNameFromPath(filePath) ||
      extractFileNameFromPath(dataPath) ||
      `${options.itemKey || "attachment"}.bin`;
    tmpFile.append(name);
    await Zotero.File.putContentsAsync(tmpFile, "");
    file = tmpFile;
  }
  return file;
}

export const handlers = {
  item: {
    exportPortableJson: (itemRef: ItemRef) => {
      const item = resolveItem(itemRef);
      return sanitizePortableItemJson(item.toJSON());
    },
    createFromJson: async (options: CreateItemFromJsonOptions) => {
      const itemJson = sanitizePortableItemJson(options?.itemJson);
      const item = new Zotero.Item(String(itemJson.itemType) as any);
      if (options?.libraryID) {
        (item as any).libraryID = options.libraryID;
      }
      item.fromJSON(itemJson, { strict: false });
      await saveItemTx(item, "handlers:item.createFromJson:saveTx", {
        hasCreators: Array.isArray(itemJson.creators),
        hasTags: Array.isArray(itemJson.tags),
      });
      return item;
    },
    create: async (options: CreateItemOptions) => {
      const item = new Zotero.Item(options.itemType as any);
      if (options.libraryID) {
        (item as any).libraryID = options.libraryID;
      }
      setParent(item, options.parent ?? null);
      await saveItemTx(item, "handlers:item.create:saveTx", {
        hasParent: !!options.parent,
      });
      const patch = buildFieldPatch(
        item,
        options.data ?? null,
        options.fields?.title as string | undefined,
        options.fields,
      );
      if (Object.keys(patch).length > 0) {
        await applyFieldPatch(item, patch, {
          spanName: "handlers:item.create:updateFields:saveTx",
          labels: {
            hasData: !!options.data,
            hasFields: !!options.fields,
          },
        });
      }
      return item;
    },
    setParent: async (itemRef: ItemRef, parentRef: ItemRef | null) => {
      const item = resolveItem(itemRef);
      setParent(item, parentRef);
      await saveItemTx(item, "handlers:item.setParent:saveTx", {
        hasParent: !!parentRef,
      });
      return item;
    },
    remove: async (itemRef: ItemRef) => {
      const item = resolveItem(itemRef);
      await eraseItemTx(item, "handlers:item.remove:eraseTx");
    },
  },
  parent: {
    addNote: async (parentRef: ItemRef, note: NotePayload) => {
      const parent = resolveItem(parentRef);
      const newNote = new Zotero.Item("note");
      newNote.parentID = parent.id;
      newNote.setNote(note.content);
      await saveItemTx(newNote, "handlers:parent.addNote:saveTx", {
        parentItemType: parent.itemType || "",
      });
      return newNote;
    },
    addAttachment: async (parentRef: ItemRef, spec: FileSpec) => {
      const parent = resolveItem(parentRef);
      const file = await resolveFile(spec);
      const attachment = await measureAsyncTestPerformanceSpan(
        "handlers:parent.addAttachment:linkFromFile",
        {
          parentItemType: parent.itemType || "",
        },
        () =>
          Zotero.Attachments.linkFromFile({
            file,
            parentItemID: parent.id,
          }),
      );
      return attachment;
    },
    addRelated: async (
      parentRef: ItemRef | ItemRef[],
      relatedRefs: ItemRef | ItemRef[],
    ) => {
      const parents = resolveItems(parentRef);
      const relatedItems = resolveItems(relatedRefs);
      for (const parent of parents) {
        relatedItems.forEach((item) => parent.addRelatedItem(item));
        await saveItemTx(parent, "handlers:parent.addRelated:saveTx", {
          relatedCount: relatedItems.length,
        });
      }
    },
    removeRelated: async (
      parentRef: ItemRef | ItemRef[],
      relatedRefs: ItemRef | ItemRef[],
    ) => {
      const parents = resolveItems(parentRef);
      const relatedItems = resolveItems(relatedRefs);
      for (const parent of parents) {
        for (const item of relatedItems) {
          await parent.removeRelatedItem(item);
        }
        await saveItemTx(parent, "handlers:parent.removeRelated:saveTx", {
          relatedCount: relatedItems.length,
        });
      }
    },
    updateFields: async (parentRef: ItemRef, patch: FieldPatch) => {
      const parent = resolveItem(parentRef);
      await applyFieldPatch(parent, patch, {
        spanName: "handlers:parent.updateFields:saveTx",
        labels: {
          fieldCount: Object.keys(patch).length,
        },
      });
      return parent;
    },
    updateMetadata: async (
      parentRef: ItemRef,
      metadata: ParentMetadataPatch,
    ) => {
      const parent = resolveItem(parentRef);
      const itemTypeChanged = applyValidItemTypePatch(
        parent,
        metadata?.itemType,
      );
      const fieldCount = applyValidFieldPatch(parent, metadata?.fields);
      const creators = normalizeCreatorPatch(metadata?.creators);
      if (creators.length > 0) {
        (
          parent as unknown as {
            setCreators?: (creators: CreatorPatch) => void;
          }
        ).setCreators?.(creators);
      }
      if (itemTypeChanged || fieldCount > 0 || creators.length > 0) {
        await saveItemTx(parent, "handlers:parent.updateMetadata:saveTx", {
          itemTypeChanged,
          fieldCount,
          creatorCount: creators.length,
        });
      }
      return parent;
    },
  },
  note: {
    create: async (note: NotePayload) => {
      const newNote = new Zotero.Item("note");
      newNote.setNote(note.content);
      await saveItemTx(newNote, "handlers:note.create:saveTx");
      return newNote;
    },
    update: async (noteRef: ItemRef, patch: NotePayload) => {
      const note = resolveItem(noteRef);
      note.setNote(patch.content);
      await saveItemTx(note, "handlers:note.update:saveTx");
      return note;
    },
    remove: async (noteRef: ItemRef) => {
      const note = resolveItem(noteRef);
      await eraseItemTx(note, "handlers:note.remove:eraseTx");
    },
  },
  attachment: {
    create: async (spec: FileSpec) => {
      const file = await resolveFile(spec);
      const attachment = await measureAsyncTestPerformanceSpan(
        "handlers:attachment.create:linkFromFile",
        undefined,
        () => Zotero.Attachments.linkFromFile({ file }),
      );
      return attachment;
    },
    createFromPath: async (options: AttachmentPathOptions) => {
      const file = await ensureFileFromPath(options);
      const parent = options.parent ? resolveItem(options.parent) : null;
      const linkOptions = {
        file,
        ...(parent ? { parentItemID: parent.id } : {}),
        ...(options.title ? { title: options.title } : {}),
        ...(options.mimeType ? { contentType: options.mimeType } : {}),
      };
      const attachment = await measureAsyncTestPerformanceSpan(
        "handlers:attachment.createFromPath:linkFromFile",
        {
          hasParent: !!parent,
          hasPath: !!String(options.path || "").trim(),
          hasDataPath: !!String(options.dataPath || "").trim(),
        },
        () => Zotero.Attachments.linkFromFile(linkOptions),
      );
      return attachment;
    },
    importStoredFromPath: async (options: AttachmentPathOptions) => {
      const file = await ensureFileFromPath(options);
      const parent = options.parent ? resolveItem(options.parent) : null;
      if (typeof Zotero.Attachments?.importFromFile !== "function") {
        throw new Error("Zotero.Attachments.importFromFile is unavailable");
      }
      const attachment = await measureAsyncTestPerformanceSpan(
        "handlers:attachment.importStoredFromPath:importFromFile",
        {
          hasParent: !!parent,
          hasPath: !!String(options.path || "").trim(),
        },
        () =>
          Zotero.Attachments.importFromFile({
            file,
            ...(parent ? { parentItemID: parent.id } : {}),
            ...(options.title ? { title: options.title } : {}),
            ...(options.mimeType ? { contentType: options.mimeType } : {}),
            ...(options.charset ? { charset: options.charset } : {}),
          }),
      );
      if (options.url) {
        attachment.setField("url", options.url);
        await saveItemTx(
          attachment,
          "handlers:attachment.importStoredFromPath:updateUrl:saveTx",
        );
      }
      return attachment;
    },
    createFromUrl: async (options: AttachmentUrlOptions) => {
      const url = String(options.url || "").trim();
      assertHttpUrl(url);
      const parent = resolveItem(options.parent);
      if (options.deduplicate !== false) {
        const existing = findChildAttachmentByUrl(parent, url);
        if (existing) {
          return existing;
        }
      }
      if (typeof Zotero.Attachments?.linkFromURL !== "function") {
        throw new Error("Zotero.Attachments.linkFromURL is unavailable");
      }
      const attachment = await measureAsyncTestPerformanceSpan(
        "handlers:attachment.createFromUrl:linkFromURL",
        {
          hasParent: true,
          hasUrl: !!url,
        },
        () =>
          Zotero.Attachments.linkFromURL({
            url,
            parentItemID: parent.id,
            title: options.title || url,
            contentType: options.mimeType || "text/html",
          }),
      );
      return attachment;
    },
    update: async (attachmentRef: ItemRef, patch: FieldPatch) => {
      const attachment = resolveItem(attachmentRef);
      await applyFieldPatch(attachment, patch, {
        spanName: "handlers:attachment.update:saveTx",
        labels: {
          fieldCount: Object.keys(patch).length,
        },
      });
      return attachment;
    },
    remove: async (attachmentRef: ItemRef) => {
      const attachment = resolveItem(attachmentRef);
      await eraseItemTx(attachment, "handlers:attachment.remove:eraseTx");
    },
  },
  tag: {
    add: async (itemRef: ItemRef | ItemRef[], tags: string[]) => {
      assertNonEmptyTags(tags);
      const items = resolveItems(itemRef);
      for (const item of items) {
        tags.forEach((tag) => item.addTag(tag));
        await saveItemTx(item, "handlers:tag.add:saveTx", {
          tagCount: tags.length,
        });
      }
    },
    list: async (itemRef: ItemRef) => {
      const item = resolveItem(itemRef);
      return item.getTags().map((tag) => tag.tag);
    },
    remove: async (itemRef: ItemRef | ItemRef[], tags: string[]) => {
      assertNonEmptyTags(tags);
      const items = resolveItems(itemRef);
      for (const item of items) {
        tags.forEach((tag) => item.removeTag(tag));
        await saveItemTx(item, "handlers:tag.remove:saveTx", {
          tagCount: tags.length,
        });
      }
    },
    replace: async (itemRef: ItemRef | ItemRef[], tags: string[]) => {
      assertNonEmptyTags(tags);
      const items = resolveItems(itemRef);
      for (const item of items) {
        const current = item.getTags().map((t) => t.tag);
        current.forEach((tag) => item.removeTag(tag));
        tags.forEach((tag) => item.addTag(tag));
        await saveItemTx(item, "handlers:tag.replace:saveTx", {
          previousTagCount: current.length,
          nextTagCount: tags.length,
        });
      }
    },
  },
  collection: {
    create: async (options: CreateCollectionOptions) => {
      const collection = new Zotero.Collection();
      collection.name = options.name;
      (collection as any).libraryID =
        options.libraryID ?? Zotero.Libraries.userLibraryID;
      await measureAsyncTestPerformanceSpan(
        "handlers:collection.create:saveTx",
        undefined,
        () => collection.saveTx(),
      );
      return collection;
    },
    delete: async (collection: number | string | Zotero.Collection) => {
      const collectionId = resolveCollectionId(collection);
      const resolved = getCollectionByIdOrKey(collectionId);
      if (!resolved) {
        throw new Error(`Collection not found: ${collectionId}`);
      }
      await measureAsyncTestPerformanceSpan(
        "handlers:collection.delete:eraseTx",
        undefined,
        () => resolved.eraseTx(),
      );
    },
    add: async (
      itemRef: ItemRef | ItemRef[],
      collection: number | string | Zotero.Collection,
    ) => {
      const items = resolveItems(itemRef);
      const collectionId = resolveCollectionId(collection);
      assertCollectionExists(collectionId);
      for (const item of items) {
        item.addToCollection(collectionId);
        await saveItemTx(item, "handlers:collection.add:saveTx", {
          collectionId,
        });
      }
    },
    remove: async (
      itemRef: ItemRef | ItemRef[],
      collection: number | string | Zotero.Collection,
    ) => {
      const items = resolveItems(itemRef);
      const collectionId = resolveCollectionId(collection);
      assertCollectionExists(collectionId);
      for (const item of items) {
        item.removeFromCollection(collectionId);
        await saveItemTx(item, "handlers:collection.remove:saveTx", {
          collectionId,
        });
      }
    },
    replace: async (
      itemRef: ItemRef | ItemRef[],
      collections: Array<number | string | Zotero.Collection>,
    ) => {
      const items = resolveItems(itemRef);
      const nextIds = collections.map(resolveCollectionId);
      nextIds.forEach(assertCollectionExists);
      for (const item of items) {
        const current = item.getCollections();
        current.forEach((id) => item.removeFromCollection(id));
        nextIds.forEach((id) => item.addToCollection(id));
        await saveItemTx(item, "handlers:collection.replace:saveTx", {
          previousCollectionCount: current.length,
          nextCollectionCount: nextIds.length,
        });
      }
    },
  },
  command: {
    run: async (_commandId: string, _args?: unknown, _context?: unknown) => {
      return;
    },
  },
};

import {
  registerZoteroTestObjectForCleanup,
  unregisterZoteroTestObjectForCleanup,
} from "../zotero/objectCleanupHarness";

type ItemRef = Zotero.Item | number | string;
type ItemCreateOptions = {
  itemType: string;
  parent?: ItemRef | null;
  data?: Record<string, unknown> | null;
  fields?: Record<string, string | number | boolean | null>;
  libraryID?: number;
};
type AttachmentPathOptions = {
  parent?: ItemRef | null;
  path?: string | null;
  dataPath?: string | null;
  title?: string | null;
  mimeType?: string | null;
};

function resolveItem(ref: ItemRef): Zotero.Item {
  if (typeof ref === "object") {
    return ref;
  }
  if (typeof ref === "number") {
    const item = Zotero.Items.get(ref);
    if (item) return item;
  } else {
    const item = Zotero.Items.getByLibraryAndKey(
      Zotero.Libraries.userLibraryID,
      ref,
    );
    if (item) return item;
  }
  throw new Error("Fixture item was not found");
}

function resolveItems(ref: ItemRef | ItemRef[]) {
  return (Array.isArray(ref) ? ref : [ref]).map(resolveItem);
}

function resolveCollectionId(collection: number | string | Zotero.Collection) {
  return typeof collection === "object"
    ? collection.id || collection.key
    : collection;
}

function resolveFixtureFile(options: AttachmentPathOptions) {
  let path = options.path || options.dataPath || "";
  if (options.dataPath?.startsWith("attachments:")) {
    path = Zotero.Attachments.resolveRelativePath?.(options.dataPath) || "";
  }
  if (!path) {
    throw new Error("Fixture attachment path is required");
  }
  return Zotero.File.pathToFile(path);
}

async function createItem(options: ItemCreateOptions) {
  const item = new Zotero.Item(options.itemType);
  if (options.libraryID) item.libraryID = options.libraryID;
  if (options.parent) item.parentID = resolveItem(options.parent).id;
  for (const [field, value] of Object.entries({
    ...(options.data || {}),
    ...(options.fields || {}),
  })) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      item.setField(field, value);
    }
  }
  await item.saveTx();
  registerZoteroTestObjectForCleanup(item);
  return item;
}

async function createItemFromJson(options: {
  itemJson: Record<string, unknown>;
  libraryID?: number;
}) {
  const item = new Zotero.Item(String(options.itemJson.itemType));
  if (options.libraryID) item.libraryID = options.libraryID;
  (item as any).fromJSON(options.itemJson, { strict: false });
  await item.saveTx();
  registerZoteroTestObjectForCleanup(item);
  return item;
}

async function createLinkedAttachment(options: AttachmentPathOptions) {
  const parent = options.parent ? resolveItem(options.parent) : null;
  const attachment = await Zotero.Attachments.linkFromFile({
    file: resolveFixtureFile(options),
    ...(parent ? { parentItemID: parent.id } : {}),
    ...(options.title ? { title: options.title } : {}),
    ...(options.mimeType ? { contentType: options.mimeType } : {}),
  });
  registerZoteroTestObjectForCleanup(attachment);
  return attachment;
}

async function addNote(parentRef: ItemRef, note: { content: string }) {
  const parent = resolveItem(parentRef);
  const item = new Zotero.Item("note");
  item.parentID = parent.id;
  item.libraryID = parent.libraryID;
  item.setNote(note.content);
  await item.saveTx();
  registerZoteroTestObjectForCleanup(item);
  return item;
}

async function createNote(options: {
  content: string;
  parent?: ItemRef | null;
  libraryID?: number;
  tags?: string[];
  collections?: Array<number | string | Zotero.Collection>;
}) {
  const parent = options.parent ? resolveItem(options.parent) : null;
  const note = new Zotero.Item("note");
  if (parent) {
    note.parentID = parent.id;
    note.libraryID = parent.libraryID;
  } else if (options.libraryID) {
    note.libraryID = options.libraryID;
  }
  note.setNote(options.content);
  for (const tag of options.tags || []) note.addTag(tag);
  for (const collection of options.collections || []) {
    note.addToCollection(resolveCollectionId(collection));
  }
  await note.saveTx();
  registerZoteroTestObjectForCleanup(note);
  return note;
}

async function eraseItem(ref: ItemRef) {
  const item = resolveItem(ref);
  await item.eraseTx();
  unregisterZoteroTestObjectForCleanup(item);
}

export const nativeFixtureMutations = Object.freeze({
  item: Object.freeze({
    create: createItem,
    createFromJson: createItemFromJson,
    remove: eraseItem,
  }),
  parent: Object.freeze({
    addNote,
    addAttachment: async (parent: ItemRef, spec: { file: any }) =>
      createLinkedAttachment({
        parent,
        path: String(spec.file?.path || ""),
      }),
    addRelated: async (
      parentRef: ItemRef | ItemRef[],
      relatedRef: ItemRef | ItemRef[],
    ) => {
      const related = resolveItems(relatedRef);
      for (const parent of resolveItems(parentRef)) {
        for (const item of related) parent.addRelatedItem(item);
        await parent.saveTx();
      }
    },
  }),
  note: Object.freeze({
    create: createNote,
    update: async (ref: ItemRef, patch: { content: string }) => {
      const note = resolveItem(ref);
      note.setNote(patch.content);
      await note.saveTx();
      return note;
    },
    remove: eraseItem,
  }),
  attachment: Object.freeze({
    create: async (spec: { file: any }) =>
      createLinkedAttachment({ path: String(spec.file?.path || "") }),
    createFromPath: createLinkedAttachment,
    remove: eraseItem,
  }),
  tag: Object.freeze({
    add: async (ref: ItemRef | ItemRef[], tags: string[]) => {
      for (const item of resolveItems(ref)) {
        for (const tag of tags) item.addTag(tag);
        await item.saveTx();
      }
    },
  }),
  collection: Object.freeze({
    create: async (options: { name: string; libraryID?: number }) => {
      const collection = new Zotero.Collection();
      collection.name = options.name;
      collection.libraryID =
        options.libraryID ?? Zotero.Libraries.userLibraryID;
      await collection.saveTx();
      registerZoteroTestObjectForCleanup(collection);
      return collection;
    },
    add: async (
      ref: ItemRef | ItemRef[],
      collection: number | string | Zotero.Collection,
    ) => {
      const collectionId = resolveCollectionId(collection);
      for (const item of resolveItems(ref)) {
        item.addToCollection(collectionId);
        await item.saveTx();
      }
    },
    delete: async (collection: Zotero.Collection) => {
      await collection.eraseTx();
      unregisterZoteroTestObjectForCleanup(collection);
    },
  }),
});

type FieldValue = string | number | boolean | null;
type FieldPatch = Record<string, FieldValue>;
type Creator = {
  firstName?: string;
  lastName?: string;
  name?: string;
  creatorType?: string;
};

async function save(item: Zotero.Item) {
  if (typeof item.saveTx !== "function") {
    throw new Error("Zotero item saveTx is unavailable");
  }
  await item.saveTx();
}

async function erase(item: Zotero.Item) {
  if (typeof item.eraseTx !== "function") {
    throw new Error("Zotero item eraseTx is unavailable");
  }
  await item.eraseTx();
}

function applyFields(item: Zotero.Item, fields: FieldPatch | undefined) {
  for (const [field, value] of Object.entries(fields || {})) {
    item.setField(field, value ?? false);
  }
}

function applyCreators(item: Zotero.Item, creators: readonly Creator[]) {
  if (
    typeof (item as Zotero.Item & { setCreators?: (value: unknown) => void })
      .setCreators !== "function"
  ) {
    throw new Error("Zotero item creator mutation is unavailable");
  }
  (
    item as Zotero.Item & { setCreators(value: readonly Creator[]): void }
  ).setCreators(creators);
}

function setParent(item: Zotero.Item, parent: Zotero.Item | null) {
  if (!parent) return;
  item.parentID = parent.id;
}

async function createItem(args: {
  itemType: string;
  libraryID: number;
  fields?: FieldPatch;
}) {
  const item = new Zotero.Item(args.itemType as never);
  (item as Zotero.Item & { libraryID: number }).libraryID = args.libraryID;
  applyFields(item, args.fields);
  await save(item);
  return item;
}

async function createNote(args: {
  content: string;
  parent?: Zotero.Item | null;
  libraryID?: number;
  tags?: readonly string[];
  collections?: readonly Zotero.Collection[];
}) {
  const note = new Zotero.Item("note");
  if (args.parent) {
    setParent(note, args.parent);
    (note as Zotero.Item & { libraryID: number }).libraryID =
      args.parent.libraryID;
  } else if (args.libraryID) {
    (note as Zotero.Item & { libraryID: number }).libraryID = args.libraryID;
  }
  note.setNote(args.content);
  for (const tag of args.tags || []) note.addTag(tag);
  for (const collection of args.collections || [])
    note.addToCollection(collection.id);
  await save(note);
  return note;
}

async function updateFields(item: Zotero.Item, fields: FieldPatch) {
  applyFields(item, fields);
  await save(item);
  return item;
}

async function updateMetadata(
  item: Zotero.Item,
  args: {
    itemType?: string | null;
    fields?: FieldPatch | null;
    creators?: readonly Creator[] | null;
  },
) {
  if (args.itemType && args.itemType !== item.itemType) {
    const typeId = Zotero.ItemTypes?.getID?.(args.itemType);
    if (!typeId) throw new Error("Zotero item type is unavailable");
    item.setField("itemTypeID", typeId);
  }
  applyFields(item, args.fields || undefined);
  if (args.creators) applyCreators(item, args.creators);
  if (args.itemType || Object.keys(args.fields || {}).length || args.creators) {
    await save(item);
  }
  return item;
}

async function updateNote(item: Zotero.Item, content: string) {
  item.setNote(content);
  await save(item);
  return item;
}

async function addRelated(item: Zotero.Item, related: readonly Zotero.Item[]) {
  for (const target of related) item.addRelatedItem(target);
  await save(item);
}

async function removeRelated(
  item: Zotero.Item,
  related: readonly Zotero.Item[],
) {
  for (const target of related) await item.removeRelatedItem(target);
  await save(item);
}

async function addTags(item: Zotero.Item, tags: readonly string[]) {
  for (const tag of tags) item.addTag(tag);
  await save(item);
}

async function removeTags(item: Zotero.Item, tags: readonly string[]) {
  for (const tag of tags) item.removeTag(tag);
  await save(item);
}

async function replaceTags(item: Zotero.Item, tags: readonly string[]) {
  for (const current of item.getTags()) item.removeTag(current.tag);
  for (const tag of tags) item.addTag(tag);
  await save(item);
}

async function addToCollection(
  item: Zotero.Item,
  collection: Zotero.Collection,
) {
  item.addToCollection(collection.id);
  await save(item);
}

async function removeFromCollection(
  item: Zotero.Item,
  collection: Zotero.Collection,
) {
  item.removeFromCollection(collection.id);
  await save(item);
}

async function replaceCollections(
  item: Zotero.Item,
  collections: readonly Zotero.Collection[],
) {
  for (const id of item.getCollections()) item.removeFromCollection(id);
  for (const collection of collections) item.addToCollection(collection.id);
  await save(item);
}

async function createCollection(args: { name: string; libraryID: number }) {
  const collection = new Zotero.Collection();
  collection.name = args.name;
  (collection as Zotero.Collection & { libraryID: number }).libraryID =
    args.libraryID;
  await collection.saveTx();
  return collection;
}

async function updateCollection(
  collection: Zotero.Collection,
  patch: { name?: string; parentID?: number | null },
) {
  if (patch.name !== undefined) collection.name = patch.name;
  if (patch.parentID !== undefined) {
    // Zotero's public declaration models this field as non-nullable, while
    // the native collection object uses null for a top-level collection.
    const nativeCollection = collection as unknown as {
      parentID: number | null;
    };
    nativeCollection.parentID = patch.parentID;
  }
  await collection.saveTx();
  return collection;
}

async function deleteCollection(collection: Zotero.Collection) {
  if (typeof collection.eraseTx !== "function")
    throw new Error("Zotero collection eraseTx is unavailable");
  await collection.eraseTx();
}

async function createLinkedAttachment(args: {
  parent: Zotero.Item | null;
  libraryID?: number;
  url: string;
  title?: string;
  contentType?: string;
}) {
  if (typeof Zotero.Attachments?.linkFromURL !== "function")
    throw new Error("Zotero.Attachments.linkFromURL is unavailable");
  return Zotero.Attachments.linkFromURL({
    url: args.url,
    ...(args.libraryID ? { libraryID: args.libraryID } : {}),
    ...(args.parent ? { parentItemID: args.parent.id } : {}),
    title: args.title || args.url,
    contentType: args.contentType || "text/html",
  });
}

async function updateAttachment(item: Zotero.Item, fields: FieldPatch) {
  applyFields(item, fields);
  await save(item);
  return item;
}

export const brokerMutationPrimitives = {
  item: { create: createItem, remove: erase, setParent },
  parent: { updateFields, updateMetadata, addRelated, removeRelated },
  note: { create: createNote, update: updateNote, remove: erase },
  tag: { add: addTags, remove: removeTags, update: replaceTags },
  collection: {
    create: createCollection,
    update: updateCollection,
    delete: deleteCollection,
    add: addToCollection,
    remove: removeFromCollection,
    replace: replaceCollections,
  },
  attachment: {
    createFromUrl: createLinkedAttachment,
    update: updateAttachment,
    remove: erase,
  },
};

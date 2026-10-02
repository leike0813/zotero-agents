async function save(item, options = {}) {
    if (options.inNativeTransaction) {
        const save = item.save;
        if (typeof save !== "function") {
            throw new Error("Zotero item save is unavailable inside a native transaction");
        }
        await save.call(item);
        return;
    }
    if (typeof item.saveTx !== "function") {
        throw new Error("Zotero item saveTx is unavailable");
    }
    await item.saveTx();
}
async function erase(item, options = {}) {
    if (options.inNativeTransaction) {
        const erase = item
            .erase;
        if (typeof erase !== "function") {
            throw new Error("Zotero item erase is unavailable inside a native transaction");
        }
        await erase.call(item);
        return;
    }
    if (typeof item.eraseTx !== "function") {
        throw new Error("Zotero item eraseTx is unavailable");
    }
    await item.eraseTx();
}
function applyFields(item, fields) {
    for (const [field, value] of Object.entries(fields || {})) {
        item.setField(field, value ?? false);
    }
}
function applyCreators(item, creators) {
    if (typeof item
        .setCreators !== "function") {
        throw new Error("Zotero item creator mutation is unavailable");
    }
    item.setCreators(creators);
}
function setParent(item, parent) {
    if (!parent)
        return;
    item.parentID = parent.id;
}
async function createItem(args) {
    const item = new Zotero.Item(args.itemType);
    item.libraryID = args.libraryID;
    applyFields(item, args.fields);
    await save(item);
    return item;
}
async function createNote(args) {
    const note = new Zotero.Item("note");
    if (args.parent) {
        setParent(note, args.parent);
        note.libraryID =
            args.parent.libraryID;
    }
    else if (args.libraryID) {
        note.libraryID = args.libraryID;
    }
    note.setNote(args.content);
    for (const tag of args.tags || [])
        note.addTag(tag);
    for (const collection of args.collections || [])
        note.addToCollection(collection.id);
    await save(note, args.transaction);
    return note;
}
async function updateFields(item, fields, transaction) {
    applyFields(item, fields);
    await save(item, transaction);
    return item;
}
async function updateMetadata(item, args, transaction) {
    if (args.itemType && args.itemType !== item.itemType) {
        const typeId = Zotero.ItemTypes?.getID?.(args.itemType);
        if (!typeId)
            throw new Error("Zotero item type is unavailable");
        item.setField("itemTypeID", typeId);
    }
    applyFields(item, args.fields || undefined);
    if (args.creators)
        applyCreators(item, args.creators);
    if (args.itemType || Object.keys(args.fields || {}).length || args.creators) {
        await save(item, transaction);
    }
    return item;
}
async function updateNote(item, content, transaction) {
    item.setNote(content);
    await save(item, transaction);
    return item;
}
async function addRelated(item, related, transaction) {
    for (const target of related)
        item.addRelatedItem(target);
    await save(item, transaction);
}
async function removeRelated(item, related, transaction) {
    for (const target of related)
        await item.removeRelatedItem(target);
    await save(item, transaction);
}
async function addTags(item, tags, transaction) {
    for (const tag of tags)
        item.addTag(tag);
    await save(item, transaction);
}
async function removeTags(item, tags, transaction) {
    for (const tag of tags)
        item.removeTag(tag);
    await save(item, transaction);
}
async function replaceTags(item, tags, transaction) {
    for (const current of item.getTags())
        item.removeTag(current.tag);
    for (const tag of tags)
        item.addTag(tag);
    await save(item, transaction);
}
async function addToCollection(item, collection, transaction) {
    item.addToCollection(collection.id);
    await save(item, transaction);
}
async function removeFromCollection(item, collection, transaction) {
    item.removeFromCollection(collection.id);
    await save(item, transaction);
}
async function replaceCollections(item, collections, transaction) {
    for (const id of item.getCollections())
        item.removeFromCollection(id);
    for (const collection of collections)
        item.addToCollection(collection.id);
    await save(item, transaction);
}
async function createCollection(args) {
    const collection = new Zotero.Collection();
    collection.name = args.name;
    collection.libraryID =
        args.libraryID;
    await collection.saveTx();
    return collection;
}
async function updateCollection(collection, patch) {
    if (patch.name !== undefined)
        collection.name = patch.name;
    if (patch.parentID !== undefined) {
        // Zotero's public declaration models this field as non-nullable, while
        // the native collection object uses null for a top-level collection.
        const nativeCollection = collection;
        nativeCollection.parentID = patch.parentID;
    }
    await collection.saveTx();
    return collection;
}
async function deleteCollection(collection) {
    if (typeof collection.eraseTx !== "function")
        throw new Error("Zotero collection eraseTx is unavailable");
    await collection.eraseTx();
}
async function createLinkedAttachment(args) {
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
async function updateAttachment(item, fields, transaction) {
    applyFields(item, fields);
    await save(item, transaction);
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

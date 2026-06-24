import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { registerZoteroTestObjectForCleanup } from "../zotero/objectCleanupHarness";
import { shouldKeepZoteroTestObjects } from "../zotero/testObjectKeepFlag";
import { isFullTestMode } from "./testMode";

const KEEP_TEST_OBJECTS = shouldKeepZoteroTestObjects();

function isZoteroEnv() {
  return (
    typeof Zotero !== "undefined" &&
    typeof Zotero.Item === "function" &&
    typeof Zotero.Items?.get === "function" &&
    typeof Zotero.Attachments?.linkFromFile === "function"
  );
}

async function createParentItem(title: string) {
  const item = new Zotero.Item("journalArticle");
  item.setField("title", title);
  await item.saveTx();
  registerZoteroTestObjectForCleanup(item);
  return item;
}

async function createTempFile(name: string, content: string) {
  const file = Zotero.getTempDirectory();
  file.append(name);
  await Zotero.File.putContentsAsync(file, content);
  return file;
}

async function cleanupObject(obj?: { eraseTx: () => Promise<unknown> }) {
  if (!obj || KEEP_TEST_OBJECTS) {
    return;
  }
  await obj.eraseTx();
}

async function expectError(action: () => Promise<unknown>, message?: RegExp) {
  let error: unknown;
  try {
    await action();
  } catch (err) {
    error = err;
  }
  assert.instanceOf(error, Error);
  if (message) {
    assert.match((error as Error).message, message);
  }
}

const describeHandlersSuite = isFullTestMode() ? describe : describe.skip;

describeHandlersSuite("handlers", function () {
  beforeEach(function () {
    if (!isZoteroEnv()) {
      this.skip();
    }
  });

  it("ParentHandler.addNote creates a child note under parent", async function () {
    const parent = await createParentItem("Handler Test Parent");
    let note: Zotero.Item | null = null;
    try {
      note = await handlers.parent.addNote(parent, {
        content: "<div><p>handler note</p></div>",
      });
      assert.equal(note.parentItemID, parent.id);
      assert.include(note.getNote(), "handler note");
      const parentNotes = parent.getNotes();
      assert.include(parentNotes, note.id);
    } finally {
      await cleanupObject(note ?? undefined);
      await cleanupObject(parent);
    }
  });

  it("ParentHandler.addAttachment attaches a file to parent", async function () {
    const parent = await createParentItem("Handler Attachment Parent");
    let attachment: Zotero.Item | null = null;
    try {
      const file = await createTempFile(
        "handler-attachment.txt",
        "handler attachment",
      );
      attachment = await handlers.parent.addAttachment(parent, {
        file,
      });
      assert.equal(attachment.parentItemID, parent.id);
      const attachmentPath = await attachment.getFilePathAsync();
      assert.equal(attachmentPath, file.path);
    } finally {
      await cleanupObject(attachment ?? undefined);
      await cleanupObject(parent);
    }
  });

  it("ParentHandler.updateFields updates item fields", async function () {
    const parent = await createParentItem("Handler Update Parent");
    try {
      await handlers.parent.updateFields(parent, { title: "Updated Title" });
      assert.equal(parent.getField("title"), "Updated Title");
    } finally {
      await cleanupObject(parent);
    }
  });

  it("ParentHandler.updateFields updates multiple fields", async function () {
    const parent = await createParentItem("Handler Multi Update Parent");
    try {
      await handlers.parent.updateFields(parent, {
        title: "Multi Updated Title",
        abstractNote: "Multi Updated Abstract",
        date: "2026-01-27",
        pages: "1-10",
      });
      assert.equal(parent.getField("title"), "Multi Updated Title");
      assert.equal(parent.getField("abstractNote"), "Multi Updated Abstract");
      assert.equal(parent.getField("date"), "2026-01-27");
      assert.equal(parent.getField("pages"), "1-10");
    } finally {
      await cleanupObject(parent);
    }
  });

  it("ParentHandler.updateFields updates book numPages", async function () {
    const book = new Zotero.Item("book");
    book.setField("title", "Handler Book Parent");
    await book.saveTx();
    registerZoteroTestObjectForCleanup(book);
    try {
      await handlers.parent.updateFields(book, {
        numPages: 120,
      });
      assert.equal(String(book.getField("numPages")), "120");
    } finally {
      await cleanupObject(book);
    }
  });

  it("ParentHandler.updateFields supports id and key input", async function () {
    const parent = await createParentItem("Handler Update Id Key Parent");
    try {
      await handlers.parent.updateFields(parent.id, { title: "Updated By Id" });
      assert.equal(parent.getField("title"), "Updated By Id");

      await handlers.parent.updateFields(parent.key, {
        title: "Updated By Key",
      });
      assert.equal(parent.getField("title"), "Updated By Key");
    } finally {
      await cleanupObject(parent);
    }
  });

  it("ParentHandler.updateFields throws on invalid field", async function () {
    const parent = await createParentItem("Handler Invalid Field Parent");
    try {
      await expectError(
        () =>
          handlers.parent.updateFields(parent, {
            numPages: 10,
          }),
        /Invalid field/,
      );
    } finally {
      await cleanupObject(parent);
    }
  });

  it("ParentHandler.updateFields throws on unknown id", async function () {
    await expectError(
      () => handlers.parent.updateFields(99999999, { title: "Nope" }),
      /Item not found/,
    );
  });

  it("ParentHandler.updateFields throws on unknown key", async function () {
    await expectError(
      () => handlers.parent.updateFields("INVALIDKEY", { title: "Nope" }),
      /Item not found/,
    );
  });

  it("NoteHandler.create creates a standalone note", async function () {
    let note: Zotero.Item | null = null;
    try {
      note = await handlers.note.create({
        content: "<div><p>standalone note</p></div>",
      });
      assert.equal(note.itemType, "note");
      assert.isNotOk(note.parentItemID);
    } finally {
      await cleanupObject(note ?? undefined);
    }
  });

  it("NoteHandler.update updates note content", async function () {
    const note = new Zotero.Item("note");
    note.setNote("<div><p>before</p></div>");
    await note.saveTx();
    registerZoteroTestObjectForCleanup(note);
    try {
      await handlers.note.update(note, { content: "<div><p>after</p></div>" });
      assert.include(note.getNote(), "after");
    } finally {
      await cleanupObject(note);
    }
  });

  it("NoteHandler.remove deletes a note", async function () {
    if (KEEP_TEST_OBJECTS) {
      this.skip();
    }
    const note = new Zotero.Item("note");
    note.setNote("<div><p>remove me</p></div>");
    await note.saveTx();
    registerZoteroTestObjectForCleanup(note);
    await handlers.note.remove(note);
    const maybe = Zotero.Items.get(note.id);
    assert.isFalse(!!maybe);
  });

  it("AttachmentHandler.create creates a standalone attachment", async function () {
    const file = await createTempFile(
      "handler-standalone.txt",
      "standalone attachment",
    );
    let attachment: Zotero.Item | null = null;
    try {
      attachment = await handlers.attachment.create({ file });
      assert.equal(attachment.itemType, "attachment");
      assert.isNotOk(attachment.parentItemID);
    } finally {
      await cleanupObject(attachment ?? undefined);
    }
  });

  it("AttachmentHandler.create throws on filePath input", async function () {
    await expectError(
      () => handlers.attachment.create({ filePath: "fake/path" } as any),
      /filePath is not supported/i,
    );
  });

  it("AttachmentHandler.update updates attachment fields", async function () {
    const file = await createTempFile(
      "handler-update-attachment.txt",
      "update attachment",
    );
    let attachment: Zotero.Item | null = null;
    try {
      attachment = await handlers.attachment.create({ file });
      await handlers.attachment.update(attachment, {
        title: "Updated Attachment Title",
      });
      assert.equal(attachment.getField("title"), "Updated Attachment Title");
    } finally {
      await cleanupObject(attachment ?? undefined);
    }
  });

  it("AttachmentHandler.remove deletes an attachment", async function () {
    if (KEEP_TEST_OBJECTS) {
      this.skip();
    }
    const file = await createTempFile(
      "handler-remove.txt",
      "remove attachment",
    );
    const attachment = await Zotero.Attachments.linkFromFile({ file });
    registerZoteroTestObjectForCleanup(attachment);
    await handlers.attachment.remove(attachment);
    const maybe = Zotero.Items.get(attachment.id);
    assert.isFalse(!!maybe);
  });

  it("TagHandler.list returns item tags", async function () {
    const parent = await createParentItem("Handler Tag List Parent");
    parent.addTag("t1");
    parent.addTag("t2");
    await parent.saveTx();
    try {
      const tags = await handlers.tag.list(parent);
      assert.sameMembers(tags, ["t1", "t2"]);
    } finally {
      await cleanupObject(parent);
    }
  });

  it("TagHandler.add/remove/replace updates item tags", async function () {
    const parent = await createParentItem("Handler Tag Parent");
    try {
      await handlers.tag.add(parent, ["t1", "t2"]);
      assert.sameMembers(
        parent.getTags().map((tag) => tag.tag),
        ["t1", "t2"],
      );

      await handlers.tag.remove(parent, ["t1"]);
      assert.sameMembers(
        parent.getTags().map((tag) => tag.tag),
        ["t2"],
      );

      await handlers.tag.replace(parent, ["t3"]);
      assert.sameMembers(
        parent.getTags().map((tag) => tag.tag),
        ["t3"],
      );
    } finally {
      await cleanupObject(parent);
    }
  });

  it("TagHandler.add/remove/replace updates multiple items", async function () {
    const parentA = await createParentItem("Handler Tag Parent A");
    const parentB = await createParentItem("Handler Tag Parent B");
    try {
      await handlers.tag.add([parentA, parentB], ["t1", "t2"]);
      assert.sameMembers(
        parentA.getTags().map((tag) => tag.tag),
        ["t1", "t2"],
      );
      assert.sameMembers(
        parentB.getTags().map((tag) => tag.tag),
        ["t1", "t2"],
      );

      await handlers.tag.remove([parentA, parentB], ["t1"]);
      assert.sameMembers(
        parentA.getTags().map((tag) => tag.tag),
        ["t2"],
      );
      assert.sameMembers(
        parentB.getTags().map((tag) => tag.tag),
        ["t2"],
      );

      await handlers.tag.replace([parentA, parentB], ["t3", "t4"]);
      assert.sameMembers(
        parentA.getTags().map((tag) => tag.tag),
        ["t3", "t4"],
      );
      assert.sameMembers(
        parentB.getTags().map((tag) => tag.tag),
        ["t3", "t4"],
      );
    } finally {
      await cleanupObject(parentA);
      await cleanupObject(parentB);
    }
  });

  it("TagHandler.add de-duplicates tags", async function () {
    const parent = await createParentItem("Handler Tag Dedup Parent");
    try {
      await handlers.tag.add(parent, ["t1", "t1", "t2"]);
      assert.sameMembers(
        parent.getTags().map((tag) => tag.tag),
        ["t1", "t2"],
      );
    } finally {
      await cleanupObject(parent);
    }
  });

  it("TagHandler.add throws on empty tag", async function () {
    const parent = await createParentItem("Handler Tag Empty Parent");
    try {
      await expectError(
        () => handlers.tag.add(parent, [""]),
        /Tag must be a non-empty string/,
      );
    } finally {
      await cleanupObject(parent);
    }
  });

  it("CollectionHandler.add/remove/replace updates item collections", async function () {
    const parent = await createParentItem("Handler Collection Parent");
    const col1 = new Zotero.Collection();
    col1.name = "Handler Collection 1";
    col1.libraryID = Zotero.Libraries.userLibraryID;
    const col1Id = await col1.saveTx();
    registerZoteroTestObjectForCleanup(col1);
    const col2 = new Zotero.Collection();
    col2.name = "Handler Collection 2";
    col2.libraryID = Zotero.Libraries.userLibraryID;
    const col2Id = await col2.saveTx();
    registerZoteroTestObjectForCleanup(col2);
    try {
      await handlers.collection.add(parent, col1Id);
      assert.include(parent.getCollections(), col1Id);

      await handlers.collection.remove(parent, col1Id);
      assert.notInclude(parent.getCollections(), col1Id);

      await handlers.collection.replace(parent, [col2Id]);
      assert.sameMembers(parent.getCollections(), [col2Id]);
    } finally {
      await cleanupObject(parent);
      await cleanupObject(col1);
      await cleanupObject(col2);
    }
  });

  it("CollectionHandler.add/remove keeps remaining collections", async function () {
    const parent = await createParentItem("Handler Collection Parent Multi");
    const col1 = new Zotero.Collection();
    col1.name = "Handler Collection Multi 1";
    col1.libraryID = Zotero.Libraries.userLibraryID;
    const col1Id = await col1.saveTx();
    registerZoteroTestObjectForCleanup(col1);
    const col2 = new Zotero.Collection();
    col2.name = "Handler Collection Multi 2";
    col2.libraryID = Zotero.Libraries.userLibraryID;
    const col2Id = await col2.saveTx();
    registerZoteroTestObjectForCleanup(col2);
    try {
      await handlers.collection.add(parent, col1Id);
      await handlers.collection.add(parent, col2Id);
      assert.sameMembers(parent.getCollections(), [col1Id, col2Id]);

      await handlers.collection.remove(parent, col1Id);
      assert.sameMembers(parent.getCollections(), [col2Id]);
    } finally {
      await cleanupObject(parent);
      await cleanupObject(col1);
      await cleanupObject(col2);
    }
  });

  it("CollectionHandler.add/remove works with collection object", async function () {
    const parent = await createParentItem("Handler Collection Object Parent");
    const col1 = new Zotero.Collection();
    col1.name = "Handler Collection Object 1";
    col1.libraryID = Zotero.Libraries.userLibraryID;
    await col1.saveTx();
    registerZoteroTestObjectForCleanup(col1);
    try {
      await handlers.collection.add(parent, col1);
      assert.include(parent.getCollections(), col1.id);

      await handlers.collection.remove(parent, col1);
      assert.notInclude(parent.getCollections(), col1.id);
    } finally {
      await cleanupObject(parent);
      await cleanupObject(col1);
    }
  });

  it("CollectionHandler.add supports multiple items", async function () {
    const parentA = await createParentItem("Handler Collection Multi Item A");
    const parentB = await createParentItem("Handler Collection Multi Item B");
    const col1 = new Zotero.Collection();
    col1.name = "Handler Collection Multi Item";
    col1.libraryID = Zotero.Libraries.userLibraryID;
    const col1Id = await col1.saveTx();
    registerZoteroTestObjectForCleanup(col1);
    try {
      await handlers.collection.add([parentA, parentB], col1Id);
      assert.include(parentA.getCollections(), col1Id);
      assert.include(parentB.getCollections(), col1Id);
    } finally {
      await cleanupObject(parentA);
      await cleanupObject(parentB);
      await cleanupObject(col1);
    }
  });

  it("CollectionHandler.add throws on missing collection id", async function () {
    const parent = await createParentItem("Handler Collection Missing Parent");
    try {
      await expectError(
        () => handlers.collection.add(parent, 99999999),
        /Collection not found/,
      );
    } finally {
      await cleanupObject(parent);
    }
  });

  it("CommandHandler.run executes a command", async function () {
    await handlers.command.run("notify", {
      message: "handler command",
    });
    assert.isTrue(true);
  });

  it("AttachmentHandler.create preserves file path", async function () {
    const file = await createTempFile(
      "handler-attachment-path.txt",
      "attachment path",
    );
    let attachment: Zotero.Item | null = null;
    try {
      attachment = await handlers.attachment.create({ file });
      const attachmentPath = await attachment.getFilePathAsync();
      assert.equal(attachmentPath, file.path);
    } finally {
      await cleanupObject(attachment ?? undefined);
    }
  });

  it("ParentHandler.addRelated/removeRelated updates related items", async function () {
    const itemA = await createParentItem("Handler Related A");
    const itemB = await createParentItem("Handler Related B");
    const itemC = await createParentItem("Handler Related C");
    try {
      await handlers.parent.addRelated(itemA, [itemB, itemC]);
      const reloaded = Zotero.Items.get(itemA.id);
      const relatedKeys = reloaded.relatedItems || [];
      assert.includeMembers(relatedKeys, [itemB.key, itemC.key]);

      await handlers.parent.removeRelated(itemA, itemB);
      const reloaded2 = Zotero.Items.get(itemA.id);
      const relatedKeys2 = reloaded2.relatedItems || [];
      assert.notInclude(relatedKeys2, itemB.key);
    } finally {
      await cleanupObject(itemA);
      await cleanupObject(itemB);
      await cleanupObject(itemC);
    }
  });

  it("ParentHandler.addRelated/removeRelated handles duplicate inputs", async function () {
    const itemA = await createParentItem("Handler Related Dup A");
    const itemB = await createParentItem("Handler Related Dup B");
    const itemC = await createParentItem("Handler Related Dup C");
    try {
      await handlers.parent.addRelated(itemA, [itemB, itemB, itemC]);
      const reloaded = Zotero.Items.get(itemA.id);
      const relatedKeys = reloaded.relatedItems || [];
      assert.includeMembers(relatedKeys, [itemB.key, itemC.key]);

      await handlers.parent.removeRelated(itemA, [itemB, itemB]);
      const reloaded2 = Zotero.Items.get(itemA.id);
      const relatedKeys2 = reloaded2.relatedItems || [];
      assert.notInclude(relatedKeys2, itemB.key);
      assert.include(relatedKeys2, itemC.key);
    } finally {
      await cleanupObject(itemA);
      await cleanupObject(itemB);
      await cleanupObject(itemC);
    }
  });

  it("ParentHandler.addRelated supports multiple parents", async function () {
    const parentA = await createParentItem("Handler Related Multi Parent A");
    const parentB = await createParentItem("Handler Related Multi Parent B");
    const related = await createParentItem("Handler Related Multi Target");
    try {
      await handlers.parent.addRelated([parentA, parentB], related);
      const reloadedA = Zotero.Items.get(parentA.id);
      const reloadedB = Zotero.Items.get(parentB.id);
      assert.includeMembers(reloadedA.relatedItems || [], [related.key]);
      assert.includeMembers(reloadedB.relatedItems || [], [related.key]);
    } finally {
      await cleanupObject(parentA);
      await cleanupObject(parentB);
      await cleanupObject(related);
    }
  });
});

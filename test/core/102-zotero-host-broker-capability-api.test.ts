import { assert } from "chai";
import { handlers } from "../../src/handlers";
import {
  createWorkflowHostApi,
  resetWorkflowHostApiForTests,
  WORKFLOW_HOST_API_VERSION,
} from "../../src/workflows/hostApi";
import {
  handleZoteroMcpRequestForTests,
  resetZoteroMcpServerForTests,
} from "../../src/modules/zoteroMcpServer";
import { ZOTERO_MCP_TOOL_GET_CURRENT_VIEW } from "../../src/modules/zoteroMcpProtocol";

async function createParentItem(title: string) {
  const item = new Zotero.Item("journalArticle");
  item.setField("title", title);
  item.setField("abstractNote", `${title} abstract`);
  item.setField("date", "2026-04-27");
  item.setField("publicationTitle", "Broker Journal");
  if (typeof (item as any).setCreators === "function") {
    (item as any).setCreators([
      {
        firstName: "Ada",
        lastName: "Lovelace",
        creatorType: "author",
      },
    ]);
  }
  await item.saveTx();
  return item;
}

async function createCollection(name: string) {
  const collection = new Zotero.Collection();
  collection.name = name;
  (collection as any).libraryID = Zotero.Libraries.userLibraryID;
  await collection.saveTx();
  return collection;
}

describe("zotero host broker capability api", function () {
  afterEach(function () {
    resetWorkflowHostApiForTests();
    resetZoteroMcpServerForTests();
  });

  it("exposes v5 broker domains without removing legacy APIs", async function () {
    const hostApi = createWorkflowHostApi();
    const item = await createParentItem("Broker Legacy Compatibility");

    assert.strictEqual(hostApi.version, WORKFLOW_HOST_API_VERSION);
    assert.strictEqual(WORKFLOW_HOST_API_VERSION, 5);
    assert.isFunction(hostApi.context.getCurrentView);
    assert.isFunction(hostApi.library.searchItems);
    assert.isFunction(hostApi.mutations.preview);
    assert.isFunction(hostApi.images.prepareForNoteEmbedding);
    assert.isFunction(hostApi.notes.importEmbeddedImage);
    assert.isFunction(hostApi.file.readBytes);
    assert.isFunction(hostApi.file.writeBytes);
    assert.isFunction(hostApi.file.copy);
    assert.strictEqual(hostApi.items.get(item.id), item);

    await handlers.parent.updateFields(item, {
      title: "Broker Legacy Updated",
    });
    assert.strictEqual(item.getField("title"), "Broker Legacy Updated");
  });

  it("returns JSON-safe read DTOs for search, detail, notes, and attachments", async function () {
    const hostApi = createWorkflowHostApi();
    const item = await createParentItem("Broker DTO Paper");
    await handlers.tag.add(item, ["broker:dto"]);
    const note = await handlers.parent.addNote(item, {
      content: "<div><p>DTO note body</p></div>",
    });

    const searchResults = await hostApi.library.searchItems({
      query: "DTO Paper",
      limit: 5,
    });
    assert.lengthOf(searchResults, 1);
    assert.strictEqual(searchResults[0].title, "Broker DTO Paper");
    assert.deepEqual(searchResults[0].creators, ["Ada Lovelace"]);
    assert.notProperty(searchResults[0] as any, "getField");

    const detail = await hostApi.library.getItemDetail(item.key);
    assert.strictEqual(detail?.fields.title, "Broker DTO Paper");
    assert.strictEqual(detail?.noteCount, 1);
    assert.notProperty(detail as any, "saveTx");

    const notes = await hostApi.library.getItemNotes(item.id);
    assert.lengthOf(notes, 1);
    assert.strictEqual(notes[0].id, note.id);
    assert.include(notes[0].textExcerpt, "DTO note body");
    assert.notProperty(notes[0] as any, "html");
    assert.notProperty(notes[0] as any, "setNote");

    const attachments = await hostApi.library.getItemAttachments(item.id);
    assert.deepEqual(attachments, []);
    assert.doesNotThrow(() =>
      JSON.stringify({ searchResults, detail, notes, attachments }),
    );
  });

  it("lists parent library items with pagination and collection filters", async function () {
    const hostApi = createWorkflowHostApi();
    const collection = await createCollection("Broker List Collection");
    const included = await createParentItem("Broker List Included");
    await createParentItem("Broker List Excluded");
    const note = await handlers.parent.addNote(included, {
      content: "<p>child note should not be listed as parent item</p>",
    });
    await handlers.collection.add([included], collection.id);

    const firstPage = await hostApi.library.listItems({
      collection: collection.id,
      limit: 1,
    });

    assert.lengthOf(firstPage.items, 1);
    assert.strictEqual(firstPage.items[0].key, included.key);
    assert.strictEqual(firstPage.items[0].noteCount, 1);
    assert.strictEqual(firstPage.items[0].attachmentCount, 0);
    assert.isFalse(firstPage.hasMore);
    assert.strictEqual(firstPage.nextCursor, "");
    assert.notStrictEqual(firstPage.items[0].key, note.key);
  });

  it("returns bounded note summaries and chunked note detail", async function () {
    const hostApi = createWorkflowHostApi();
    const item = await createParentItem("Broker Large Note Parent");
    const largeText = "Large note body ".repeat(1000);
    const note = await handlers.parent.addNote(item, {
      content: `<div>${largeText}</div>`,
    });

    const summaries = await hostApi.library.getItemNotes(item.id, {
      maxExcerptChars: 120,
    });
    assert.lengthOf(summaries, 1);
    assert.isAtMost(summaries[0].textExcerpt?.length || 0, 120);
    assert.isAbove(summaries[0].textLength || 0, 1000);
    assert.notProperty(summaries[0] as any, "html");

    const firstChunk = await hostApi.library.getNoteDetail(note.id, {
      maxChars: 128,
    });
    assert.strictEqual(firstChunk.key, note.key);
    assert.lengthOf(firstChunk.content, 128);
    assert.isTrue(firstChunk.hasMore);
    assert.strictEqual(firstChunk.nextOffset, 128);

    const htmlChunk = await hostApi.library.getNoteDetail(note.key, {
      format: "html",
      offset: firstChunk.nextOffset,
      maxChars: 128,
    });
    assert.strictEqual(htmlChunk.format, "html");
    assert.strictEqual(htmlChunk.offset, 128);
    assert.isAtMost(htmlChunk.content.length, 128);
  });

  it("does not throw when child note or attachment lookup fails", async function () {
    const hostApi = createWorkflowHostApi();
    const item = await createParentItem("Broker Read Hardening");
    const previousGet = Zotero.Items.get;
    (item as any).getNotes = () => [999001];
    (item as any).getAttachments = () => [999002];
    (Zotero.Items as any).get = (id: number) => {
      if (id === 999001 || id === 999002) {
        throw new Error("child lookup failed");
      }
      return previousGet.call(Zotero.Items, id);
    };

    try {
      const detail = await hostApi.library.getItemDetail(item.id);
      const notes = await hostApi.library.getItemNotes(item.id);
      const attachments = await hostApi.library.getItemAttachments(item.id);

      assert.strictEqual(detail?.noteCount, 1);
      assert.strictEqual(detail?.attachmentCount, 1);
      assert.lengthOf(notes, 1);
      assert.strictEqual(notes[0].errors?.[0].code, "zotero_note_child_failed");
      assert.lengthOf(attachments, 1);
      assert.strictEqual(
        attachments[0].errors?.[0].code,
        "zotero_attachment_child_failed",
      );
    } finally {
      (Zotero.Items as any).get = previousGet;
    }
  });

  it("previews mutations without writing Zotero state", async function () {
    const hostApi = createWorkflowHostApi();
    const item = await createParentItem("Broker Preview Before");

    const preview = await hostApi.mutations.preview({
      operation: "item.updateFields",
      target: item.id,
      fields: {
        title: "Broker Preview After",
      },
    });

    assert.isTrue(preview.ok);
    assert.isTrue(preview.requiresConfirmation);
    assert.include(preview.summary, "Update 1 field");
    assert.strictEqual(item.getField("title"), "Broker Preview Before");
  });

  it("executes supported mutations through handlers and returns JSON-safe results", async function () {
    const hostApi = createWorkflowHostApi();
    const item = await createParentItem("Broker Execute Before");
    const collection = await createCollection("Broker Execute Collection");

    const update = await hostApi.mutations.execute({
      operation: "item.updateFields",
      target: item.key,
      fields: {
        title: "Broker Execute After",
      },
    });
    assert.isTrue(update.ok);
    assert.strictEqual(item.getField("title"), "Broker Execute After");
    assert.strictEqual(
      update.ok && update.result.items?.[0].title,
      "Broker Execute After",
    );

    const addTags = await hostApi.mutations.execute({
      operation: "item.addTags",
      targets: [item.id],
      tags: ["broker:write"],
    });
    assert.isTrue(addTags.ok);
    assert.include(
      item.getTags().map((entry) => entry.tag),
      "broker:write",
    );

    const removeTags = await hostApi.mutations.execute({
      operation: "item.removeTags",
      target: item.id,
      tags: ["broker:write"],
    });
    assert.isTrue(removeTags.ok);
    assert.notInclude(
      item.getTags().map((entry) => entry.tag),
      "broker:write",
    );

    const createNote = await hostApi.mutations.execute({
      operation: "note.createChild",
      parent: item.id,
      content: "<div><p>broker child note</p></div>",
    });
    assert.isTrue(createNote.ok);
    assert.include(
      createNote.ok ? createNote.result.notes?.[0].text : "",
      "broker child note",
    );

    const noteId = createNote.ok ? createNote.result.notes?.[0].id : 0;
    const updateNote = await hostApi.mutations.execute({
      operation: "note.update",
      note: noteId,
      content: "<div><p>broker updated note</p></div>",
    });
    assert.isTrue(updateNote.ok);
    assert.include(
      updateNote.ok ? updateNote.result.notes?.[0].text : "",
      "broker updated note",
    );

    const addToCollection = await hostApi.mutations.execute({
      operation: "collection.addItems",
      items: [item.id],
      collection: `${Zotero.Libraries.userLibraryID}:${collection.key}`,
    });
    assert.isTrue(addToCollection.ok);
    assert.include(item.getCollections(), collection.id);

    const removeFromCollection = await hostApi.mutations.execute({
      operation: "collection.removeItems",
      items: [item.id],
      collection: collection.id,
    });
    assert.isTrue(removeFromCollection.ok);
    assert.notInclude(item.getCollections(), collection.id);
    assert.doesNotThrow(() =>
      JSON.stringify({
        update,
        addTags,
        removeTags,
        createNote,
        updateNote,
        addToCollection,
        removeFromCollection,
      }),
    );
  });

  it("returns structured errors for unsupported or invalid mutations", async function () {
    const hostApi = createWorkflowHostApi();
    const item = await createParentItem("Broker Invalid Mutation");

    const unsupported = await hostApi.mutations.preview({
      operation: "item.delete",
      target: item.id,
    });
    assert.isFalse(unsupported.ok);
    assert.match(
      unsupported.ok ? "" : unsupported.error.message,
      /Unsupported/,
    );

    const invalidField = await hostApi.mutations.preview({
      operation: "item.updateFields",
      target: item.id,
      fields: {
        numPages: 100,
      },
    });
    assert.isFalse(invalidField.ok);
    assert.match(
      invalidField.ok ? "" : invalidField.error.message,
      /Invalid field/,
    );

    const emptyTags = await hostApi.mutations.preview({
      operation: "item.addTags",
      target: item.id,
      tags: [],
    });
    assert.isFalse(emptyTags.ok);
    assert.match(emptyTags.ok ? "" : emptyTags.error.message, /tags/);
  });

  it("routes get_current_view through hostApi context by default", async function () {
    const item = await createParentItem("Broker MCP Current View");
    const previousGetMainWindow = (Zotero as any).getMainWindow;
    (Zotero as any).getMainWindow = () => ({
      ZoteroPane: {
        getSelectedItems: () => [item],
        getSelectedLibraryID: () => Zotero.Libraries.userLibraryID,
      },
      Zotero_Tabs: {
        selectedID: "",
      },
    });

    try {
      const response = await handleZoteroMcpRequestForTests({
        jsonrpc: "2.0",
        id: "current-view",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
          arguments: {},
        },
      });

      const structured = (response as any).result.structuredContent;
      assert.strictEqual(
        structured.hostContext.currentItem.title,
        "Broker MCP Current View",
      );
      assert.lengthOf(structured.hostContext.selectedItems, 1);
    } finally {
      (Zotero as any).getMainWindow = previousGetMainWindow;
    }
  });
});

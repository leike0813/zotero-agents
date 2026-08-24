import { assert } from "chai";
import fs from "node:fs/promises";
import { handlers } from "../../src/handlers";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";
import {
  createWorkflowHostApi,
  resetWorkflowHostApiForTests,
  WORKFLOW_HOST_API_VERSION,
} from "../../src/workflows/hostApi";
import {
  handleZoteroMcpRequestForTests,
  resetZoteroMcpServerForTests,
} from "../../src/modules/zoteroMcpServer";
import {
  resetZoteroLibraryPageQueryAdapterForTests,
  setZoteroLibraryPageQueryAdapterForTests,
} from "../../src/modules/zoteroLibraryPageQuery";
import { createMockZoteroLibraryPageQueryAdapter } from "../helpers/zoteroLibraryPageQueryAdapter";
import {
  resetDefaultSynthesisClientForTests,
  setDefaultSynthesisClientCompositionFactoryForTests,
} from "../../src/modules/synthesisClient/defaultClient";
import { createNativeSynthesisClientComposition } from "../../src/modules/synthesisClient/nativeComposition";

const HOST_BRIDGE_CONTEXT_GET_CURRENT_VIEW = "context.get_current_view";

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

async function withMockTranslate<T>(
  args: { items?: Array<Record<string, unknown>>; translators?: unknown[] },
  callback: () => Promise<T>,
): Promise<T> {
  class Search {
    setIdentifierInput: unknown;
    setSearchInput: unknown;

    setIdentifier(input: unknown) {
      this.setIdentifierInput = input;
    }

    setSearch(input: unknown) {
      this.setSearchInput = input;
    }

    async getTranslators() {
      return (
        args.translators || [
          {
            translatorID: "metadata-translator",
            label: "Metadata Translator",
            priority: 100,
            translatorType: 8,
          },
        ]
      );
    }

    setTranslator() {
      // no-op
    }

    async translate(options: unknown) {
      assert.deepEqual(options, {
        libraryID: false,
        saveAttachments: false,
      });
      return args.items || [];
    }
  }

  const previousTranslate = (Zotero as any).Translate;
  (Zotero as any).Translate = { Search };
  resetWorkflowHostApiForTests();
  try {
    return await callback();
  } finally {
    if (previousTranslate === undefined) {
      delete (Zotero as any).Translate;
    } else {
      (Zotero as any).Translate = previousTranslate;
    }
    resetWorkflowHostApiForTests();
  }
}

async function withMockExportTranslators<T>(
  args: {
    translators: Record<string, Record<string, unknown> | null>;
    outputs: Record<string, string | Error>;
  },
  callback: (calls: Array<Record<string, unknown>>) => Promise<T>,
): Promise<T> {
  const calls: Array<Record<string, unknown>> = [];
  class Export {
    items: unknown[] = [];
    translatorID = "";
    displayOptions: Record<string, unknown> = {};
    string = "";

    setItems(items: unknown[]) {
      this.items = items;
    }

    setTranslator(translatorID: string) {
      this.translatorID = translatorID;
    }

    setDisplayOptions(displayOptions: Record<string, unknown>) {
      this.displayOptions = displayOptions;
    }

    async translate() {
      calls.push({
        translatorID: this.translatorID,
        items: this.items,
        displayOptions: this.displayOptions,
      });
      const output = args.outputs[this.translatorID];
      if (output instanceof Error) throw output;
      this.string = output;
      return [];
    }
  }

  const previousTranslate = (Zotero as any).Translate;
  const previousTranslators = (Zotero as any).Translators;
  (Zotero as any).Translate = { ...(previousTranslate || {}), Export };
  (Zotero as any).Translators = {
    ...(previousTranslators || {}),
    async get(translatorID: string) {
      return args.translators[translatorID] || null;
    },
  };
  resetWorkflowHostApiForTests();
  try {
    return await callback(calls);
  } finally {
    (Zotero as any).Translate = previousTranslate;
    (Zotero as any).Translators = previousTranslators;
    resetWorkflowHostApiForTests();
  }
}

describe("zotero host broker capability api", function () {
  beforeEach(function () {
    setZoteroLibraryPageQueryAdapterForTests(
      createMockZoteroLibraryPageQueryAdapter(),
    );
  });

  afterEach(async function () {
    resetZoteroLibraryPageQueryAdapterForTests();
    resetWorkflowHostApiForTests();
    resetZoteroMcpServerForTests();
    setDefaultSynthesisClientCompositionFactoryForTests(null);
    await resetDefaultSynthesisClientForTests();
  });

  it("exposes v11 broker domains without removing legacy APIs", async function () {
    const hostApi = createWorkflowHostApi();
    const item = await createParentItem("Broker Legacy Compatibility");

    assert.strictEqual(hostApi.version, WORKFLOW_HOST_API_VERSION);
    assert.strictEqual(WORKFLOW_HOST_API_VERSION, 11);
    assert.isFunction(hostApi.researchBundles.materializePapers);
    assert.isFunction(hostApi.context.getCurrentView);
    assert.isFunction(hostApi.library.searchItems);
    assert.isFunction(hostApi.mutations.preview);
    assert.isFunction(hostApi.metadata.translateIdentifier);
    assert.isFunction(hostApi.images.prepareForNoteEmbedding);
    assert.isFunction(hostApi.notes.importEmbeddedImage);
    assert.isFunction(hostApi.file.readBytes);
    assert.isFunction(hostApi.file.writeBytes);
    assert.isFunction(hostApi.file.copy);
    assert.isFunction(hostApi.file.materializeWorkflowInputFile);
    assert.isFunction(hostApi.file.pickSaveFile);
    assert.isFunction(hostApi.archive.writeZipAtomic);
    assert.isFunction(hostApi.archive.withExtractedZip);
    assert.isFunction(hostApi.items.exportPortableJson);
    assert.isFunction(hostApi.items.exportText);
    assert.isFunction(hostApi.items.createFromJson);
    assert.isFunction(hostApi.items.remove);
    assert.isFunction(hostApi.statusTags.getPolicy);
    assert.isFunction(hostApi.statusTags.transition);
    assert.isFunction(hostApi.attachments.importStoredFromPath);
    assert.strictEqual(hostApi.items.get(item.id), item);

    await handlers.parent.updateFields(item, {
      title: "Broker Legacy Updated",
    });
    assert.strictEqual(item.getField("title"), "Broker Legacy Updated");
  });

  it("exports item text with ordered translator fallback", async function () {
    const betterBibtexID = "ca65189f-8815-4afe-8c8b-8c7c15f0edca";
    const nativeBibtexID = "9cb70025-a888-4a29-a210-93ec52da40d4";
    const item = { id: 1, key: "AAAA1111" } as Zotero.Item;

    await withMockExportTranslators(
      {
        translators: {
          [betterBibtexID]: {
            translatorID: betterBibtexID,
            label: "Better BibTeX",
            target: "bib",
            translatorType: 3,
          },
          [nativeBibtexID]: {
            translatorID: nativeBibtexID,
            label: "BibTeX",
            target: "bib",
            translatorType: 3,
          },
        },
        outputs: {
          [betterBibtexID]: new Error("BBT failed"),
          [nativeBibtexID]: "@article{native, title={Fallback}}\n",
        },
      },
      async (calls) => {
        const result = await createWorkflowHostApi().items.exportText({
          items: [item],
          translatorCandidates: [
            { translatorID: betterBibtexID, label: "Better BibTeX" },
            { translatorID: nativeBibtexID, label: "BibTeX" },
          ],
          displayOptions: {
            exportNotes: false,
            exportFileData: false,
            keepUpdated: false,
          },
        });

        assert.isTrue(result.ok);
        if (!result.ok) throw new Error("expected export success");
        assert.strictEqual(result.translator.translatorID, nativeBibtexID);
        assert.isTrue(result.fallbackUsed);
        assert.deepEqual(
          result.attempts.map((attempt) => attempt.status),
          ["failed", "succeeded"],
        );
        assert.deepEqual(
          calls.map((call) => call.translatorID),
          [betterBibtexID, nativeBibtexID],
        );
        assert.deepEqual(calls[1].items, [item]);
      },
    );
  });

  it("normalizes Host file paths and keeps exists a total boolean probe", async function () {
    const runtime = globalThis as {
      IOUtils?: {
        exists?: (path: string) => Promise<boolean>;
        readUTF8?: (path: string) => Promise<string>;
      };
    };
    const previousIOUtils = runtime.IOUtils;
    const probed: string[] = [];
    const read: string[] = [];
    runtime.IOUtils = {
      async exists(target) {
        probed.push(target);
        if (target.includes("broken")) {
          throw new Error("NS_ERROR_FILE_UNRECOGNIZED_PATH");
        }
        return true;
      },
      async readUTF8(target) {
        read.push(target);
        return "content";
      },
    };
    resetWorkflowHostApiForTests();
    try {
      const hostApi = createWorkflowHostApi();
      assert.isTrue(await hostApi.file.exists("E:/research/a b.md"));
      assert.isFalse(await hostApi.file.exists("E:/research/broken.md"));
      assert.isFalse(await hostApi.file.exists("file:///%"));
      try {
        await hostApi.file.readText("file:///%");
        assert.fail("expected malformed strict file read to fail");
      } catch (error) {
        assert.instanceOf(error, TypeError);
      }
      assert.equal(
        await hostApi.file.readText("file:///E:/research/a%20b.md"),
        "content",
      );
      assert.deepEqual(probed, [
        "E:\\research\\a b.md",
        "E:\\research\\broken.md",
      ]);
      assert.deepEqual(read, ["E:\\research\\a b.md"]);
    } finally {
      if (previousIOUtils === undefined) {
        delete runtime.IOUtils;
      } else {
        runtime.IOUtils = previousIOUtils;
      }
      resetWorkflowHostApiForTests();
    }
  });

  it("transitions builtin workflow status instances idempotently by stable key", async function () {
    setDefaultSynthesisClientCompositionFactoryForTests(() =>
      createNativeSynthesisClientComposition({
        getReadyConnection: () => ({
          discovery: {
            host: "127.0.0.1",
            port: 9134,
            profileId: "1".repeat(64),
            serviceInstanceId: "status-policy-test",
          },
          clientToken: "client-token",
        }),
        rpcClient: {
          async call(args) {
            assert.equal(
              args.capability,
              "client.isBuiltinTagPolicyInitialized",
            );
            return args.rebuildResult(true);
          },
        },
      }),
    );
    const hostApi = createWorkflowHostApi();
    const item = await createParentItem("Broker Status Transition");

    const added = await hostApi.statusTags.transition({
      item,
      add: ["need-analysis", "need-fulltext"],
    });
    assert.sameMembers(added.added, [
      "status:need-analysis",
      "status:need-fulltext",
    ]);
    assert.deepEqual(added.warnings, []);

    const idempotent = await hostApi.statusTags.transition({
      item,
      add: ["need-analysis"],
      remove: ["need-fulltext"],
    });
    assert.deepEqual(idempotent.added, []);
    assert.deepEqual(idempotent.removed, ["status:need-fulltext"]);
    assert.deepEqual(await handlers.tag.list(item), ["status:need-analysis"]);

    for (const request of [
      { item, add: ["unknown"] },
      { item, add: ["need-analysis"], remove: ["need-analysis"] },
    ]) {
      try {
        await hostApi.statusTags.transition(request as any);
        assert.fail("expected invalid status transition to fail");
      } catch (error) {
        assert.match(String(error), /status key|added and removed/i);
      }
    }
  });

  it("projects only a real selected collection into current view", async function () {
    const collection = await createCollection("Portable Import Target");
    const previousGetMainWindow = (Zotero as any).getMainWindow;
    try {
      (Zotero as any).getMainWindow = () => ({
        ZoteroPane: {
          getSelectedItems: () => [],
          getSelectedLibraryID: () => collection.libraryID,
          collectionsView: { selectedTreeRow: { ref: collection } },
        },
      });
      resetWorkflowHostApiForTests();
      const currentCollection =
        createWorkflowHostApi().context.getCurrentView().currentCollection;
      assert.equal(currentCollection?.id, collection.id);
      assert.equal(currentCollection?.key, collection.key);
      assert.equal(currentCollection?.name, collection.name);
      assert.equal(currentCollection?.libraryId, collection.libraryID);

      (Zotero as any).getMainWindow = () => ({
        ZoteroPane: {
          getSelectedItems: () => [],
          getSelectedLibraryID: () => collection.libraryID,
          collectionsView: {
            selectedTreeRow: { ref: { id: 999999, name: "Library Root" } },
          },
        },
      });
      resetWorkflowHostApiForTests();
      assert.notProperty(
        createWorkflowHostApi().context.getCurrentView(),
        "currentCollection",
      );
    } finally {
      (Zotero as any).getMainWindow = previousGetMainWindow;
    }
  });

  it("materializes workflow input files under managed runtime tmp", async function () {
    const hostApi = createWorkflowHostApi();
    const paths = getRuntimePersistencePaths();

    const first = await hostApi.file.materializeWorkflowInputFile({
      workflowId: "tag-regulator/../unsafe",
      key: "valid_tags",
      fileName: "CON.yaml",
      content: "- topic:sequence\n",
    });
    const second = await hostApi.file.materializeWorkflowInputFile({
      workflowId: "tag-regulator/../unsafe",
      key: "valid_tags",
      fileName: "CON.yaml",
      content: "- topic:other\n",
    });
    const binary = await hostApi.file.materializeWorkflowInputFile({
      workflowId: "literature-deep-reading",
      key: "source_bundle_path",
      fileName: "source_bundle.zip",
      bytes: new Uint8Array([1, 2, 3]),
    });

    const normalizedTmp = paths.tmpDir.replace(/\\/g, "/");
    for (const materialized of [first, second, binary]) {
      const normalized = materialized.path.replace(/\\/g, "/");
      assert.include(normalized, `${normalizedTmp}/workflow-inputs/`);
      assert.notInclude(normalized, "../");
    }
    assert.notEqual(first.path, second.path);
    assert.equal(await fs.readFile(first.path, "utf8"), "- topic:sequence\n");
    assert.deepEqual(
      Array.from(new Uint8Array(await fs.readFile(binary.path))),
      [1, 2, 3],
    );

    try {
      await hostApi.file.materializeWorkflowInputFile({
        workflowId: "tag-regulator",
        key: "valid_tags",
        fileName: "valid_tags.yaml",
      });
      assert.fail("expected missing content/bytes to fail");
    } catch (error) {
      assert.match(String(error), /exactly one of content or bytes/);
    }
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

  it("translates metadata identifiers through a JSON-safe hostApi facade", async function () {
    await withMockTranslate(
      {
        items: [
          {
            itemType: "journalArticle",
            DOI: "10.1000/metadata-facade",
            title: "Broker Metadata Facade Paper",
            publicationTitle: "Broker Metadata Journal",
            creators: [
              {
                firstName: "Grace",
                lastName: "Hopper",
                creatorType: "author",
              },
            ],
          },
        ],
      },
      async () => {
        const hostApi = createWorkflowHostApi();
        const result = await hostApi.metadata.translateIdentifier({
          type: "DOI",
          value: "10.1000/metadata-facade",
        });

        assert.isTrue(result.ok);
        assert.strictEqual(result.itemCount, 1);
        assert.strictEqual(
          result.item?.fields.title,
          "Broker Metadata Facade Paper",
        );
        assert.strictEqual(result.item?.DOI, "10.1000/metadata-facade");
        assert.deepEqual(result.item?.creators, [
          {
            firstName: "Grace",
            lastName: "Hopper",
            creatorType: "author",
          },
        ]);
        assert.strictEqual(
          result.translators[0].translatorID,
          "metadata-translator",
        );
        assert.notProperty(result.item as any, "getField");
        assert.doesNotThrow(() => JSON.stringify(result));
      },
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

  it("syncs a metadata snapshot page for local librarian indexes", async function () {
    const hostApi = createWorkflowHostApi();
    const collection = await createCollection("Broker Snapshot Collection");
    const included = await createParentItem("Broker Snapshot Included");
    included.setField("DOI", "10.5555/snapshot");
    included.setField("ISBN", "978-1-4028-9462-6");
    included.setField("ISSN", "1234-5678");
    included.setField("url", "https://example.test/snapshot");
    await handlers.tag.add(included, ["snapshot:index"]);
    await handlers.collection.add([included], collection.id);
    await createParentItem("Broker Snapshot Excluded");

    assert.isFunction(hostApi.library.syncSnapshot);
    const snapshot = await hostApi.library.syncSnapshot({
      collectionKey: collection.key,
      tag: "snapshot:index",
      limit: 10,
    });

    assert.strictEqual(snapshot.schema, "zotero.library.snapshot.v1");
    assert.isString(snapshot.generatedAt);
    assert.isString(snapshot.snapshotId);
    assert.lengthOf(snapshot.items, 1);
    assert.strictEqual(snapshot.returned, 1);
    assert.isFalse(snapshot.hasMore);
    assert.strictEqual(snapshot.items[0].key, included.key);
    assert.strictEqual(snapshot.items[0].DOI, "10.5555/snapshot");
    assert.strictEqual(snapshot.items[0].ISBN, "978-1-4028-9462-6");
    assert.strictEqual(snapshot.items[0].ISSN, "1234-5678");
    assert.strictEqual(snapshot.items[0].url, "https://example.test/snapshot");
    assert.deepEqual(snapshot.items[0].tags, ["snapshot:index"]);
    assert.include(snapshot.items[0].collections, collection.id);
    assert.doesNotThrow(() => JSON.stringify(snapshot));
  });

  it("hydrates only the current database-selected page, including sparse ids", async function () {
    const hostApi = createWorkflowHostApi();
    const highIdItem = new Zotero.Item("journalArticle");
    highIdItem.id = 1892;
    highIdItem.key = "HIGH1892";
    highIdItem.libraryID = Zotero.Libraries.userLibraryID;
    highIdItem.setField("title", "Broker Sparse High ID Paper");
    highIdItem.setCreators?.([{ lastName: "Sparse" }]);
    await highIdItem.saveTx();

    const secondHighIdItem = new Zotero.Item("journalArticle");
    secondHighIdItem.id = 2892;
    secondHighIdItem.key = "HIGH2892";
    secondHighIdItem.libraryID = Zotero.Libraries.userLibraryID;
    secondHighIdItem.setField("title", "Broker Sparse High ID Paper Two");
    await secondHighIdItem.saveTx();

    const previousGetAsync = (Zotero.Items as any).getAsync;
    const hydrateCalls: number[][] = [];
    (Zotero.Items as any).getAsync = async (ids: number[]) => {
      assert.isArray(ids);
      hydrateCalls.push([...ids]);
      return previousGetAsync.call(Zotero.Items, ids);
    };

    try {
      const list = await hostApi.library.listItems({
        query: "Sparse High ID",
        limit: 1,
      });
      const search = await hostApi.library.searchItems({
        query: "Sparse High ID",
        limit: 1,
      });

      assert.deepEqual(hydrateCalls, [[highIdItem.id], [highIdItem.id]]);
      assert.isTrue(list.hasMore);
      assert.match(list.nextCursor, /^[A-Za-z0-9_-]+$/);
      assert.include(
        list.items.map((item) => item.key),
        highIdItem.key,
      );
      assert.include(
        search.map((item) => item.key),
        highIdItem.key,
      );
    } finally {
      (Zotero.Items as any).getAsync = previousGetAsync;
    }
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

  it("upserts embedded workflow payloads on notes through mutation execute", async function () {
    const hostApi = createWorkflowHostApi();
    const item = await createParentItem("Broker Note Payload Parent");
    const note = await handlers.parent.addNote(item, {
      content: "<div><p>digest note</p></div>",
    });

    const preview = await hostApi.mutations.preview({
      operation: "note.upsertPayload",
      note: note.key,
      payloadType: "literature-matching-metadata-json",
      noteKind: "digest",
      payload: {
        schema: "literature_matching_metadata.v1",
        key_terms: ["object detection"],
        methods: ["transformer"],
        problems: [],
        datasets: [],
        exclude_terms: [],
      },
    });
    assert.isTrue(preview.ok);
    assert.include(preview.summary, "literature-matching-metadata-json");

    const first = await hostApi.mutations.execute({
      operation: "note.upsertPayload",
      note: note.key,
      payloadType: "literature-matching-metadata-json",
      noteKind: "digest",
      payload: {
        schema: "literature_matching_metadata.v1",
        key_terms: ["object detection"],
        methods: ["transformer"],
        problems: [],
        datasets: [],
        exclude_terms: [],
      },
    });
    assert.isTrue(first.ok, first.ok ? "" : first.error.message);
    assert.strictEqual(first.ok && first.result.payloads?.[0].replaced, 0);

    const payloadsAfterFirst = await hostApi.library.listNotePayloads(note.id);
    const matchingAfterFirst = payloadsAfterFirst.filter(
      (entry) => entry.payloadType === "literature-matching-metadata-json",
    );
    assert.lengthOf(matchingAfterFirst, 1);
    assert.isString(matchingAfterFirst[0].payloadType);

    const second = await hostApi.mutations.execute({
      operation: "note.upsertPayload",
      note: note.id,
      payloadType: "literature-matching-metadata-json",
      noteKind: "digest",
      payload: {
        schema: "literature_matching_metadata.v1",
        key_terms: ["instance segmentation"],
        methods: ["mask prediction"],
        problems: [],
        datasets: [],
        exclude_terms: [],
      },
    });
    assert.isTrue(second.ok);
    assert.strictEqual(second.ok && second.result.payloads?.[0].replaced, 1);

    const payloadsAfterSecond = await hostApi.library.listNotePayloads(note.id);
    const matchingAfterSecond = payloadsAfterSecond.filter(
      (entry) => entry.payloadType === "literature-matching-metadata-json",
    );
    assert.lengthOf(matchingAfterSecond, 1);
    const detail = await hostApi.library.getNotePayload(note.id, {
      payloadType: "literature-matching-metadata-json",
    });
    assert.deepEqual((detail.payload as any).key_terms, [
      "instance segmentation",
    ]);
    assert.strictEqual(detail.payloadType, "literature-matching-metadata-json");
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
          name: HOST_BRIDGE_CONTEXT_GET_CURRENT_VIEW,
          arguments: {},
        },
      });

      const structured = (response as any).result.structuredContent;
      assert.strictEqual(
        structured.data.currentItem.title,
        "Broker MCP Current View",
      );
      assert.strictEqual(
        structured.capability,
        HOST_BRIDGE_CONTEXT_GET_CURRENT_VIEW,
      );
      assert.lengthOf(structured.data.selectedItems, 1);
    } finally {
      (Zotero as any).getMainWindow = previousGetMainWindow;
    }
  });
});

import { assert } from "chai";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  joinPath,
  mkTempDir,
  workflowsPath,
  writeUtf8,
} from "../zotero/workflow-test-utils";
import { handlers } from "../../src/handlers";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";
import {
  buildLiteratureBundleExport,
  importLiteratureBundleArchive,
  makePortableNoteHtml,
  restorePortableNoteHtml,
  rewriteMarkdownLocalImages,
  validateLiteratureBundleManifest,
  verifyLiteratureBundleFiles,
} from "../../workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs";
import {
  attachWorkbenchPayloadToNote,
  parseWorkbenchEmbeddedPayloadBytes,
} from "../../workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs";

describe("literature portable bundle workflows", function () {
  it("loads export and import as non-core pass-through workflows", async function () {
    const loaded = await loadWorkflowManifests(workflowsPath());
    const exported = loaded.workflows.find(
      (entry) => entry.manifest.id === "export-literature-bundle",
    );
    const imported = loaded.workflows.find(
      (entry) => entry.manifest.id === "import-literature-bundle",
    );
    assert.isOk(exported);
    assert.isOk(imported);
    assert.equal(exported?.manifest.provider, "pass-through");
    assert.notEqual(exported?.manifest.display?.core, true);
    assert.equal(imported?.manifest.provider, "pass-through");
    assert.equal(imported?.manifest.trigger?.requiresSelection, false);
  });

  it("converts note attachment keys to portable refs and restores new keys", function () {
    const portable = makePortableNoteHtml(
      '<div><img data-attachment-key="OLDKEY" data-zs-payload-anchor="digest-markdown"></div>',
      new Map([["OLDKEY", "e1"]]),
    );
    assert.notInclude(portable.html, "OLDKEY");
    assert.include(portable.html, 'data-zb-attachment-ref="e1"');
    const restored = restorePortableNoteHtml(
      portable.html,
      new Map([["e1", "NEWKEY"]]),
    );
    assert.include(restored, 'data-attachment-key="NEWKEY"');
    assert.notInclude(restored, "data-zb-attachment-ref");
    assert.include(restored, 'data-zs-payload-anchor="digest-markdown"');
  });

  it("rewrites local Markdown images while preserving remote destinations", async function () {
    const result = await rewriteMarkdownLocalImages({
      markdown:
        "![local](figures/a%20b.png#view)\n![remote](https://example.test/a.png)",
      sourcePath: "/papers/paper.md",
      resolveLocalPath: async (path) =>
        path === "/papers/figures/a b.png" ? path : null,
    });
    assert.include(result.markdown, "assets/m1/a-b.png#view");
    assert.include(result.markdown, "https://example.test/a.png");
    assert.deepEqual(result.assets, [
      {
        id: "m1",
        sourcePath: "/papers/figures/a b.png",
        relativePath: "assets/m1/a-b.png",
      },
    ]);
  });

  it("rejects manifests whose declared file closure does not match the archive", function () {
    const manifest = {
      kind: "zotero-agents-literature-bundle",
      schemaVersion: 1,
      items: [
        {
          id: "i1",
          itemJson: { itemType: "journalArticle" },
          attachments: [],
          notes: [],
          relatedItemIds: [],
        },
      ],
      warnings: [],
      files: {
        "items/i1/file.txt": { size: 1, sha256: "a".repeat(64) },
      },
    };
    assert.throws(
      () => validateLiteratureBundleManifest(manifest, ["manifest.json"]),
      /declared file closure/i,
    );
  });

  it("rejects unsupported versions, duplicate ids, and unresolved relations", function () {
    const base = {
      kind: "zotero-agents-literature-bundle",
      schemaVersion: 1,
      items: [
        {
          id: "i1",
          itemJson: { itemType: "journalArticle" },
          attachments: [],
          notes: [],
          relatedItemIds: [],
        },
      ],
      warnings: [],
      files: {},
    };
    const cases = [
      { ...base, schemaVersion: 2 },
      { ...base, items: [...base.items, { ...base.items[0] }] },
      {
        ...base,
        items: [{ ...base.items[0], relatedItemIds: ["missing"] }],
      },
    ];
    for (const manifest of cases) {
      assert.throws(() =>
        validateLiteratureBundleManifest(manifest, ["manifest.json"]),
      );
    }
  });

  it("rejects file size or digest mismatches", async function () {
    const manifest = validateLiteratureBundleManifest(
      {
        kind: "zotero-agents-literature-bundle",
        schemaVersion: 1,
        items: [
          {
            id: "i1",
            itemJson: { itemType: "journalArticle" },
            attachments: [],
            notes: [],
            relatedItemIds: [],
          },
        ],
        warnings: [],
        files: {
          "payload.bin": { size: 99, sha256: "a".repeat(64) },
        },
      },
      ["manifest.json", "payload.bin"],
    );
    let error: unknown;
    try {
      await verifyLiteratureBundleFiles(manifest, {
        readBytes: async () => new Uint8Array([1, 2, 3]),
      });
    } catch (caught) {
      error = caught;
    }
    assert.instanceOf(error, Error);
  });

  it("round-trips metadata, stored content, note images, and repeated imports", async function () {
    const root = await mkTempDir("literature-bundle-roundtrip");
    const sourcePath = joinPath(root, "paper.md");
    await writeUtf8(sourcePath, "# Portable\n\n![asset](asset.png)");
    await writeUtf8(joinPath(root, "asset.png"), "image-bytes");
    const parent = await handlers.item.createFromJson({
      libraryID: Zotero.Libraries.userLibraryID,
      itemJson: {
        itemType: "journalArticle",
        title: "Portable Round Trip",
        DOI: "10.1000/roundtrip",
        creators: [
          { firstName: "Ada", lastName: "Lovelace", creatorType: "author" },
        ],
        tags: [{ tag: "portable:roundtrip" }],
      },
    });
    await handlers.attachment.createFromPath({
      parent,
      path: sourcePath,
      title: "Portable Text",
      mimeType: "text/markdown",
    });
    const note = await handlers.parent.addNote(parent, {
      content:
        '<div data-zs-note-kind="conversation-note"><p>Conversation</p></div>',
    });
    const host = createWorkflowHostApi();
    const embedded = await host.notes.importEmbeddedImage(note, {
      bytes: new Uint8Array([137, 80, 78, 71, 1, 2, 3]),
      mimeType: "image/png",
      width: 1,
      height: 1,
      originalBytes: 7,
      compressedBytes: 7,
    });
    await handlers.note.update(note, {
      content: `<div data-zs-note-kind="conversation-note"><img data-attachment-key="${embedded.attachmentKey}" data-zs-payload-anchor="conversation-note-markdown"></div>`,
    });
    await attachWorkbenchPayloadToNote({
      runtime: {
        hostApi: host,
        hostApiVersion: 7,
        TextEncoder,
        TextDecoder,
        Buffer,
      },
      note,
      noteKind: "conversation-note",
      payloadType: "conversation-note-markdown",
      payload: {
        version: 1,
        path: "/source/conversation.md",
        format: "markdown",
        content: "# Portable conversation",
      },
    });
    for (const fixture of [
      {
        noteKind: "digest",
        payloadType: "digest-markdown",
        payload: { format: "markdown", content: "# Digest" },
      },
      {
        noteKind: "references",
        payloadType: "references-json",
        payload: { format: "json", references: [{ title: "Reference" }] },
      },
      {
        noteKind: "citation-analysis",
        payloadType: "citation-analysis-json",
        payload: { format: "json", report_md: "# Citation analysis" },
      },
    ]) {
      const generatedNote = await handlers.parent.addNote(parent, {
        content: `<div data-zs-note-kind="${fixture.noteKind}"><p>${fixture.noteKind}</p></div>`,
      });
      await attachWorkbenchPayloadToNote({
        runtime: {
          hostApi: host,
          hostApiVersion: 7,
          TextEncoder,
          TextDecoder,
          Buffer,
        },
        note: generatedNote,
        ...fixture,
      });
    }
    const relatedParent = await handlers.item.createFromJson({
      libraryID: Zotero.Libraries.userLibraryID,
      itemJson: { itemType: "book", title: "Portable Related Parent" },
    });
    await handlers.parent.addRelated(parent, relatedParent);
    await handlers.parent.addRelated(relatedParent, parent);

    const built = await buildLiteratureBundleExport({
      host,
      parents: [parent, relatedParent],
    });
    const bundlePath = joinPath(root, "portable.zip");
    await host.archive.writeZipAtomic({
      targetPath: bundlePath,
      entries: [
        { name: "manifest.json", text: JSON.stringify(built.manifest) },
        ...built.entries,
      ],
    });

    await host.archive.withExtractedZip(bundlePath, async (archive) => {
      const manifest = validateLiteratureBundleManifest(
        JSON.parse(await archive.readText("manifest.json")),
        archive.entries,
      );
      await verifyLiteratureBundleFiles(manifest, archive);
      const first = await importLiteratureBundleArchive({
        host,
        archive,
        manifest,
      });
      const second = await importLiteratureBundleArchive({
        host,
        archive,
        manifest,
      });
      assert.equal(first.status, "completed", JSON.stringify(first));
      assert.equal(second.status, "completed", JSON.stringify(second));
      assert.notEqual(
        first.importedItems[0].itemId,
        second.importedItems[0].itemId,
      );
      assert.lengthOf(first.importedItems, 2);

      const imported = Zotero.Items.get(first.importedItems[0].itemId)!;
      const importedRelated = Zotero.Items.get(first.importedItems[1].itemId)!;
      assert.equal(imported.getField("DOI"), "10.1000/roundtrip");
      assert.deepEqual(imported.getCreators(), parent.getCreators());
      assert.deepEqual(imported.getTags(), parent.getTags());
      assert.lengthOf(imported.getAttachments(), 1);
      const importedAttachment = Zotero.Items.get(
        imported.getAttachments()[0],
      )!;
      const importedMarkdownPath = String(
        await importedAttachment.getFilePathAsync(),
      );
      const storageRoot = importedMarkdownPath.replace(/[\\/][^\\/]+$/, "");
      assert.isTrue(
        await host.file.exists(
          joinPath(storageRoot, "assets", "m1", "asset.png"),
        ),
      );
      assert.lengthOf(imported.getNotes(), 4);
      const importedNote = Zotero.Items.get(imported.getNotes()[0])!;
      assert.notInclude(importedNote.getNote(), embedded.attachmentKey);
      assert.match(importedNote.getNote(), /data-attachment-key="[^"]+"/);
      assert.lengthOf(importedNote.getAttachments(), 2);
      const parsedPayloads = [];
      for (const importedNoteId of imported.getNotes()) {
        const currentNote = Zotero.Items.get(importedNoteId)!;
        for (const attachmentId of currentNote.getAttachments()) {
          const attachment = Zotero.Items.get(attachmentId)!;
          const bytes = await host.file.readBytes(
            String(await attachment.getFilePathAsync()),
          );
          const parsed = parseWorkbenchEmbeddedPayloadBytes(bytes, {
            TextDecoder,
            Buffer,
          });
          if (parsed) parsedPayloads.push(parsed);
        }
      }
      assert.sameMembers(
        parsedPayloads.map((entry) => entry.payloadType),
        [
          "conversation-note-markdown",
          "digest-markdown",
          "references-json",
          "citation-analysis-json",
        ],
      );
      const conversationPayload = parsedPayloads.find(
        (entry) => entry.payloadType === "conversation-note-markdown",
      );
      assert.equal(
        conversationPayload?.payload?.content,
        "# Portable conversation",
      );
      assert.include((imported as any).relatedItems, importedRelated.key);
      assert.include((importedRelated as any).relatedItems, imported.key);
    });
  });

  it("cleans a failed parent and continues importing later parents", async function () {
    const baseHost = createWorkflowHostApi();
    let failedParentId = 0;
    const host = {
      ...baseHost,
      items: {
        ...baseHost.items,
        async createFromJson(args: any) {
          const item = await baseHost.items.createFromJson(args);
          if (args.itemJson.title === "Fail Parent") failedParentId = item.id;
          return item;
        },
      },
      attachments: {
        ...baseHost.attachments,
        async importStoredFile() {
          throw new Error("injected attachment failure");
        },
      },
    };
    const result = await importLiteratureBundleArchive({
      host,
      archive: { resolvePath: (path: string) => path },
      manifest: {
        warnings: [],
        items: [
          {
            id: "i1",
            itemJson: { itemType: "journalArticle", title: "Fail Parent" },
            relatedItemIds: [],
            notes: [],
            attachments: [
              {
                id: "a1",
                kind: "file",
                path: "fail.bin",
                metadata: { title: "Fail" },
              },
            ],
          },
          {
            id: "i2",
            itemJson: { itemType: "book", title: "Continue Parent" },
            relatedItemIds: [],
            notes: [],
            attachments: [],
          },
        ],
      },
    });

    assert.equal(result.status, "partial");
    assert.deepEqual(result.failedItems, [
      { bundleItemId: "i1", code: "parent_import_failed" },
    ]);
    assert.equal(result.importedItems[0].bundleItemId, "i2");
    assert.isUndefined(Zotero.Items.get(failedParentId));
  });
});

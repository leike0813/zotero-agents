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
import { applyResult as applyLiteratureBundleImport } from "../../workflows_builtin/literature-workbench-package/import-literature-bundle/hooks/applyResult.mjs";
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

  it("preserves source-tree image paths only when the opt-in policy is selected", async function () {
    const resolvedPaths: string[] = [];
    const result = await rewriteMarkdownLocalImages({
      markdown: [
        "![same](figure.png?size=full#view)",
        "![nested](figures/a%20b.png#detail)",
        "![file](file:///papers/figures/a%20b.png#file)",
        "![outside](../shared.png)",
        "![absolute](/shared/absolute.png)",
        "![missing](missing.png)",
        "![remote](https://example.test/a.png)",
        "![data](data:image/png;base64,AAAA)",
      ].join("\n"),
      sourcePath: "/papers/paper.md",
      assetPolicy: { kind: "preserve-source-tree" },
      resolveLocalPath: async (candidate) => {
        resolvedPaths.push(candidate);
        return ["/papers/figure.png", "/papers/figures/a b.png"].includes(
          candidate,
        )
          ? candidate
          : null;
      },
    });

    assert.deepEqual(result.assets, [
      {
        id: "m1",
        sourcePath: "/papers/figures/a b.png",
        relativePath: "figures/a b.png",
      },
      {
        id: "m2",
        sourcePath: "/papers/figure.png",
        relativePath: "figure.png",
      },
    ]);
    assert.include(result.markdown, "figure.png?size=full#view");
    assert.include(result.markdown, "figures/a%20b.png#detail");
    assert.include(result.markdown, "figures/a%20b.png#file");
    assert.include(result.markdown, "../shared.png");
    assert.include(result.markdown, "/shared/absolute.png");
    assert.include(result.markdown, "missing.png");
    assert.include(result.markdown, "https://example.test/a.png");
    assert.include(result.markdown, "data:image/png;base64,AAAA");
    assert.notInclude(resolvedPaths, "/shared/shared.png");
    assert.notInclude(resolvedPaths, "/shared/absolute.png");
    assert.sameMembers(
      result.warnings.map((warning) => warning.code),
      [
        "markdown_image_outside_source_tree",
        "markdown_image_outside_source_tree",
        "markdown_image_missing",
      ],
    );
  });

  it("keeps default image rewriting permissive when no policy is selected", async function () {
    const result = await rewriteMarkdownLocalImages({
      markdown: "![outside](../shared.png)",
      sourcePath: "/papers/paper.md",
      resolveLocalPath: async (candidate) =>
        candidate === "/shared.png" ? candidate : null,
    });

    assert.include(result.markdown, "assets/m1/shared.png");
    assert.equal(result.assets[0]?.relativePath, "assets/m1/shared.png");
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
      { ...base, items: [] },
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

  it("scopes child ids to their owning parent, attachment, or note", function () {
    const valid = {
      kind: "zotero-agents-literature-bundle",
      schemaVersion: 1,
      items: ["i1", "i2"].map((id) => ({
        id,
        itemJson: { itemType: "journalArticle" },
        relatedItemIds: [],
        attachments: [
          {
            id: "a1",
            kind: "markdown",
            assets: [{ id: "m1" }],
          },
        ],
        notes: [
          { id: "n1", images: [{ id: "e1" }] },
          { id: "n2", images: [{ id: "e1" }] },
        ],
      })),
      warnings: [],
      files: {},
    };
    assert.doesNotThrow(() =>
      validateLiteratureBundleManifest(valid, ["manifest.json"]),
    );

    const invalidCases = [
      {
        label: "attachment",
        mutate(item: any) {
          item.attachments.push({ ...item.attachments[0] });
        },
      },
      {
        label: "note",
        mutate(item: any) {
          item.notes.push({ ...item.notes[0] });
        },
      },
      {
        label: "asset",
        mutate(item: any) {
          item.attachments[0].assets.push({ ...item.attachments[0].assets[0] });
        },
      },
      {
        label: "image",
        mutate(item: any) {
          item.notes[0].images.push({ ...item.notes[0].images[0] });
        },
      },
    ];
    for (const entry of invalidCases) {
      const invalid = JSON.parse(JSON.stringify(valid));
      entry.mutate(invalid.items[0]);
      assert.throws(
        () => validateLiteratureBundleManifest(invalid, ["manifest.json"]),
        new RegExp(`duplicate or missing bundle ${entry.label} id`, "i"),
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
        measureEntries: async (entryNames: string[]) => ({
          files: {
            "payload.bin": { size: 3, sha256: "b".repeat(64) },
          },
        }),
      });
    } catch (caught) {
      error = caught;
    }
    assert.instanceOf(error, Error);
  });

  it("verifies bundle files through the extracted host archive", async function () {
    const bytes = new Uint8Array([1, 2, 3]);
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
          "payload.bin": {
            size: bytes.length,
            sha256:
              "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
          },
        },
      },
      ["manifest.json", "payload.bin"],
    );
    await verifyLiteratureBundleFiles(manifest, {
      measureEntries: async (entryNames: string[]) => {
        assert.deepEqual(entryNames, ["payload.bin"]);
        return {
          files: {
            "payload.bin": {
              size: bytes.length,
              sha256:
                "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
            },
          },
        };
      },
    });
  });

  it("does not report a validation failure as a successful import", async function () {
    const logs: Array<Record<string, unknown>> = [];
    let error: unknown;
    try {
      await applyLiteratureBundleImport({
        runtime: {
          hostApiVersion: 8,
          hostApi: {
            file: {
              pickFile: async () => "/tmp/invalid-literature-bundle.zip",
            },
            archive: {
              withExtractedZip: async () => {
                throw new Error("invalid zip");
              },
            },
            logging: {
              appendRuntimeLog: (entry: Record<string, unknown>) =>
                logs.push(entry),
            },
          },
        },
      });
    } catch (caught) {
      error = caught;
    }

    assert.instanceOf(error, Error);
    assert.equal((error as any).code, "validation_failed");
    assert.equal((error as any).structuredResult?.status, "validation_failed");
    assert.deepInclude((error as any).structuredResult?.warnings?.[0], {
      code: "bundle_validation_failed",
      stage: "archive_open",
    });
    assert.isTrue(
      logs.some(
        (entry) =>
          entry.stage === "literature-bundle-validation-failed" &&
          entry.workflowId === "import-literature-bundle",
      ),
    );
  });

  it("reports target resolution failures as import failures", async function () {
    const manifest = {
      kind: "zotero-agents-literature-bundle",
      schemaVersion: 1,
      items: [
        {
          id: "i1",
          itemJson: { itemType: "journalArticle" },
          relatedItemIds: [],
          attachments: [],
          notes: [],
        },
      ],
      warnings: [],
      files: {},
    };
    const logs: Array<Record<string, any>> = [];
    let error: unknown;
    try {
      await applyLiteratureBundleImport({
        runtime: {
          hostApiVersion: 8,
          hostApi: {
            file: { pickFile: async () => "/tmp/valid-literature-bundle.zip" },
            archive: {
              withExtractedZip: async (_path: string, callback: any) =>
                callback({
                  entries: ["manifest.json"],
                  readText: async () => JSON.stringify(manifest),
                  measureEntries: async () => ({ files: {} }),
                }),
            },
            context: { getCurrentView: () => ({ libraryId: "" }) },
            logging: {
              appendRuntimeLog: (entry: Record<string, unknown>) =>
                logs.push(entry),
            },
          },
        },
      });
    } catch (caught) {
      error = caught;
    }

    assert.instanceOf(error, Error);
    assert.equal((error as any).code, "import_failed");
    assert.deepInclude((error as any).structuredResult?.warnings?.[0], {
      code: "bundle_import_failed",
      stage: "target",
    });
    assert.isTrue(
      logs.some(
        (entry) =>
          entry.stage === "literature-bundle-import-failed" &&
          entry.details?.importStage === "target",
      ),
    );
  });

  it("does not report an import with no created parents as successful", async function () {
    const manifest = {
      kind: "zotero-agents-literature-bundle",
      schemaVersion: 1,
      items: [
        {
          id: "i1",
          itemJson: { itemType: "journalArticle", title: "Cannot Import" },
          relatedItemIds: [],
          attachments: [],
          notes: [],
        },
      ],
      warnings: [],
      files: {},
    };
    let error: unknown;
    try {
      await applyLiteratureBundleImport({
        runtime: {
          hostApiVersion: 8,
          hostApi: {
            file: { pickFile: async () => "/tmp/valid-literature-bundle.zip" },
            archive: {
              withExtractedZip: async (_path: string, callback: any) =>
                callback({
                  entries: ["manifest.json"],
                  readText: async () => JSON.stringify(manifest),
                  readBytes: async () => new Uint8Array(),
                  resolvePath: (path: string) => path,
                  measureEntries: async () => ({ files: {} }),
                }),
            },
            context: {
              getCurrentView: () => ({
                libraryId: Zotero.Libraries.userLibraryID,
              }),
            },
            items: {
              createFromJson: async () => {
                throw new Error("injected parent creation failure");
              },
              remove: async () => undefined,
            },
          },
        },
      });
    } catch (caught) {
      error = caught;
    }

    assert.instanceOf(error, Error);
    assert.equal((error as any).code, "partial");
    assert.equal((error as any).structuredResult?.importedItems.length, 0);
    assert.deepEqual((error as any).structuredResult?.failedItems, [
      { bundleItemId: "i1", code: "parent_import_failed" },
    ]);
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
        hostApiVersion: 8,
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
          hostApiVersion: 8,
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
        target: {
          view: { libraryId: Zotero.Libraries.userLibraryID },
          libraryID: Zotero.Libraries.userLibraryID,
        },
      });
      const second = await importLiteratureBundleArchive({
        host,
        archive,
        manifest,
        target: {
          view: { libraryId: Zotero.Libraries.userLibraryID },
          libraryID: Zotero.Libraries.userLibraryID,
        },
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
      target: {
        view: { libraryId: Zotero.Libraries.userLibraryID },
        libraryID: Zotero.Libraries.userLibraryID,
      },
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

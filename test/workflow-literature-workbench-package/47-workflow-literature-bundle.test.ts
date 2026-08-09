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
import { createWorkflowArchiveApi } from "../../src/workflows/archive";
import {
  buildLiteratureBundleExport,
  buildLiteratureProduct,
  importLiteratureBundleArchive,
  importLiteratureProductArchive,
  makePortableNoteHtml,
  restorePortableNoteHtml,
  resolveLiteratureBundleParents,
  rewriteMarkdownLocalImages,
  importResearchProductArchive,
  exportLiteratureBundle,
  validateResearchProductManifest,
  validateLiteratureBundleManifest,
  validateLiteratureProductManifest,
  verifyLiteratureBundleFiles,
  verifyLiteratureProductFiles,
} from "../../workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs";
import { applyResult as applyLiteratureBundleImport } from "../../workflows_builtin/literature-workbench-package/import-literature-bundle/hooks/applyResult.mjs";
import {
  attachWorkbenchPayloadToNote,
  parseWorkbenchEmbeddedPayloadBytes,
} from "../../workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs";

const portableLiteratureScore = {
  version: 1,
  entry: "artifacts/literature_score.json",
  format: "json",
  literature_score: {
    schema: "literature_score.v1",
    rubric_id: "default.v1",
    paper_type: "empirical",
    paper_type_reason: "Empirical evaluation.",
    overall_score: 60,
    confidence: 0.8,
    confidence_adjusted_score: 58,
    dimensions: [
      "methodological_rigor",
      "evidence_completeness",
      "reproducibility",
      "innovation_signals",
      "research_impact_potential",
      "writing_quality",
    ].map((dimension_key) => ({
      dimension_key,
      name: dimension_key.replaceAll("_", " "),
      score: 60,
      confidence: 0.8,
      summary: `${dimension_key} summary`,
    })),
  },
};

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
    assert.equal(exported?.manifest.trigger?.requiresSelection, false);
    assert.deepEqual(exported?.manifest.parameters?.mode?.enum, [
      "selection",
      "collection",
      "library",
    ]);
    assert.equal(exported?.manifest.parameters?.mode?.default, "selection");
    assert.equal(
      exported?.manifest.parameters?.targetCollection?.optionsSource?.kind,
      "zotero.collections",
    );
  });

  it("resolves selection, collection, and library parent sets with bounded paging", async function () {
    const items = new Map([
      [1, { id: 1, libraryID: 1, key: "AAA", isRegularItem: () => true }],
      [2, { id: 2, libraryID: 1, key: "BBB", isRegularItem: () => true }],
      [3, { id: 3, libraryID: 1, key: "CCC", isRegularItem: () => true }],
    ]);
    const calls: any[] = [];
    const host: any = {
      items: {
        get: (id: number) => items.get(id),
        getByLibraryAndKey: (_libraryId: number, key: string) =>
          [...items.values()].find((item: any) => item.key === key) || null,
      },
      context: { getCurrentView: () => ({ libraryId: 1 }) },
      library: {
        async listItems(args: any) {
          calls.push(args);
          if (args.collectionKey) {
            return args.cursor
              ? {
                  items: [
                    { libraryId: 1, key: "AAA", itemType: "journalArticle" },
                  ],
                  hasMore: false,
                }
              : {
                  items: [
                    { libraryId: 1, key: "BBB", itemType: "journalArticle" },
                    { libraryId: 1, key: "BBB", itemType: "journalArticle" },
                    {
                      libraryId: 1,
                      key: "CHILD",
                      itemType: "attachment",
                      parent: { id: 9, key: "PARENT" },
                    },
                  ],
                  hasMore: true,
                  nextCursor: "opaque",
                };
          }
          return {
            items: [{ libraryId: 1, key: "CCC", itemType: "book" }],
            hasMore: false,
          };
        },
      },
    };
    const selected = await resolveLiteratureBundleParents({
      host,
      mode: "selection",
      selectionContext: {
        items: { parents: [{ item: { id: 2 } }, { item: { id: 1 } }] },
      },
    });
    assert.deepEqual(
      selected.map((item: any) => item.key),
      ["BBB", "AAA"],
    );
    const collection = await resolveLiteratureBundleParents({
      host,
      mode: "collection",
      targetCollection: "1:COLL",
    });
    assert.deepEqual(
      collection.map((item: any) => item.key),
      ["AAA", "BBB"],
    );
    const library = await resolveLiteratureBundleParents({
      host,
      mode: "library",
    });
    assert.deepEqual(
      library.map((item: any) => item.key),
      ["CCC"],
    );
    assert.equal(calls[0].collectionKey, "COLL");
    assert.equal(calls[1].cursor, "opaque");
  });

  it("exports the default selection as an independent Literature Product", async function () {
    const root = await mkTempDir("literature-research-product-export");
    const targetPath = joinPath(root, "product.zip");
    const item: any = {
      id: 11,
      libraryID: 1,
      key: "PRODUCT1",
      isRegularItem: () => true,
      getField: (field: string) =>
        field === "title" ? "Exported Product Paper" : "",
      getAttachments: () => [],
      getNotes: () => [],
    };
    const archive = createWorkflowArchiveApi();
    const host: any = {
      items: {
        get: () => item,
        getByLibraryAndKey: () => item,
        exportPortableJson: () => ({
          itemType: "journalArticle",
          title: "Exported Product Paper",
        }),
        exportText: async () => ({
          ok: true,
          content: "@article{product, title={Exported Product Paper}}\n",
          translator: {
            translatorID: "ca65189f-8815-4afe-8c8b-8c7c15f0edca",
            label: "Better BibTeX",
          },
          fallbackUsed: false,
        }),
      },
      file: {
        pickSaveFile: async () => targetPath,
        exists: async () => false,
      },
      library: { getItemAttachments: async () => [] },
      archive,
    };
    const result = await exportLiteratureBundle({
      host,
      runtime: { hostApi: host },
      selectionContext: { items: { parents: [{ item: { id: 11 } }] } },
    });
    assert.equal(result.schemaId, "literature_bundle.product");
    await archive.withExtractedZip(targetPath, async (extracted: any) => {
      const manifest = JSON.parse(await extracted.readText("manifest.json"));
      assert.equal(manifest.schema_id, "literature_bundle.product");
      assert.equal(manifest.schema_version, "1.0.0");
      assert.notProperty(manifest.papers[0], "role");
      assert.property(manifest.papers[0], "attachments");
      assert.property(manifest.papers[0], "notes");
      assert.property(manifest.papers[0], "payloads");
      assert.include(extracted.entries, "index.md");
      assert.property(manifest.files, "index.md");
    });
  });

  it("exports a remote literature bundle through the bound output resource", async function () {
    const root = await mkTempDir("remote-literature-bundle-export");
    const targetPath = joinPath(root, "literature-bundle.zip");
    const item: any = {
      id: 12,
      libraryID: 1,
      key: "REMOTE1",
      isRegularItem: () => true,
      getField: (field: string) =>
        field === "title" ? "Remote Bundle Paper" : "",
      getAttachments: () => [],
      getNotes: () => [],
    };
    const archive = createWorkflowArchiveApi();
    let pickerCalls = 0;
    let publishedPath = "";
    const host: any = {
      items: {
        get: () => item,
        getByLibraryAndKey: () => item,
        exportPortableJson: () => ({
          itemType: "journalArticle",
          title: "Remote Bundle Paper",
        }),
        exportText: async () => ({
          ok: true,
          content: "@article{remote, title={Remote Bundle Paper}}\n",
          translator: {
            translatorID: "ca65189f-8815-4afe-8c8b-8c7c15f0edca",
            label: "Better BibTeX",
          },
          fallbackUsed: false,
        }),
      },
      file: {
        async pickSaveFile() {
          pickerCalls += 1;
          throw new Error("picker must not open");
        },
        exists: async () => false,
      },
      library: { getItemAttachments: async () => [] },
      archive,
      resources: {
        mode: "non-interactive",
        getInput: () => null,
        getInputs: () => [],
        async allocateOutput() {
          return { path: targetPath };
        },
        async publishOutput(args: { path: string }) {
          publishedPath = args.path;
          return {
            slotId: "bundle",
            fileId: "file-remote-literature-bundle",
            sourceKind: "workflow-artifact",
            displayName: "literature-bundle.zip",
            contentType: "application/zip",
            createdAt: "2026-08-07T00:00:00.000Z",
            expiresAt: "2026-08-07T02:00:00.000Z",
            downloadCommand:
              "zotero-bridge file download file-remote-literature-bundle --output literature-bundle.zip",
          };
        },
        listOutputs: () => [],
      },
    };

    const result = await exportLiteratureBundle({
      host,
      runtime: { hostApi: host },
      selectionContext: { items: { parents: [{ item: { id: 12 } }] } },
    });

    assert.equal(pickerCalls, 0);
    assert.equal(publishedPath, targetPath);
    assert.equal(
      result.resourceOutputs[0].fileId,
      "file-remote-literature-bundle",
    );
    await archive.withExtractedZip(targetPath, async (extracted: any) => {
      assert.include(extracted.entries, "manifest.json");
      assert.include(extracted.entries, "index.md");
    });
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

  it("keeps the original image link when local path probing rejects", async function () {
    const result = await rewriteMarkdownLocalImages({
      markdown: "![missing](figures/missing.png)",
      sourcePath: "/papers/paper.md",
      assetPolicy: { kind: "preserve-source-tree" },
      resolveLocalPath: async () => {
        throw new Error("NS_ERROR_FILE_UNRECOGNIZED_PATH");
      },
    });

    assert.equal(result.markdown, "![missing](figures/missing.png)");
    assert.deepEqual(result.assets, []);
    assert.deepInclude(result.warnings, {
      code: "markdown_image_missing",
      path: "/papers/figures/missing.png",
      reason: "probe_failed",
    });
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

  it("rejects unresolved Literature Product source and payload references", function () {
    const files = {
      "README.md": { size: 1, sha256: "a".repeat(64) },
      "index.md": { size: 1, sha256: "a".repeat(64) },
      "papers/paper-001/metadata.json": {
        size: 1,
        sha256: "a".repeat(64),
      },
      "papers/paper-001/attachments/a1/paper.pdf": {
        size: 1,
        sha256: "a".repeat(64),
      },
      "papers/paper-001/notes/n1/note.html": {
        size: 1,
        sha256: "a".repeat(64),
      },
      "papers/paper-001/notes/n1/images/e1/payload.png": {
        size: 1,
        sha256: "a".repeat(64),
      },
      "papers/paper-001/payloads/digest-001.md": {
        size: 1,
        sha256: "a".repeat(64),
      },
    };
    const base: any = {
      schema_id: "literature_bundle.product",
      schema_version: "1.0.0",
      bibliography: { status: "not_generated" },
      warnings: [],
      files,
      papers: [
        {
          logical_id: "paper-001",
          metadata_path: "papers/paper-001/metadata.json",
          related_paper_ids: [],
          attachments: [
            {
              id: "a1",
              kind: "file",
              path: "papers/paper-001/attachments/a1/paper.pdf",
              assets: [],
            },
          ],
          notes: [
            {
              id: "n1",
              htmlPath: "papers/paper-001/notes/n1/note.html",
              images: [
                {
                  id: "e1",
                  path: "papers/paper-001/notes/n1/images/e1/payload.png",
                },
              ],
            },
          ],
          payloads: [
            {
              id: "p1",
              payload_type: "digest-markdown",
              format: "markdown",
              path: "papers/paper-001/payloads/digest-001.md",
              source_note_id: "n1",
              source_image_id: "e1",
              anchor_status: "present",
            },
          ],
          primary_source: {
            attachment_id: "a1",
            kind: "pdf",
            path: "papers/paper-001/attachments/a1/paper.pdf",
          },
        },
      ],
    };
    const entries = ["manifest.json", ...Object.keys(files)];
    assert.doesNotThrow(() => validateLiteratureProductManifest(base, entries));
    const badSource = JSON.parse(JSON.stringify(base));
    badSource.papers[0].primary_source.attachment_id = "missing";
    assert.throws(
      () => validateLiteratureProductManifest(badSource, entries),
      /primary source attachment/i,
    );
    const badPayload = JSON.parse(JSON.stringify(base));
    badPayload.papers[0].payloads[0].source_image_id = "missing";
    assert.throws(
      () => validateLiteratureProductManifest(badPayload, entries),
      /payload source/i,
    );
    const badOwner = JSON.parse(JSON.stringify(base));
    badOwner.papers[0].attachments[0].path =
      "papers/paper-001/payloads/digest-001.md";
    badOwner.papers[0].primary_source.path =
      "papers/paper-001/payloads/digest-001.md";
    assert.throws(
      () => validateLiteratureProductManifest(badOwner, entries),
      /attachment ownership/i,
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

  it("imports a remote literature bundle through the bound input resource", async function () {
    const manifest = {
      kind: "zotero-agents-literature-bundle",
      schemaVersion: 1,
      items: [
        {
          id: "i1",
          itemJson: {
            itemType: "journalArticle",
            title: "Remote Imported Bundle",
          },
          attachments: [],
          notes: [],
          relatedItemIds: [],
        },
      ],
      warnings: [],
      files: {},
    };
    const imported: any[] = [];
    let pickerCalls = 0;
    let openedPath = "";
    const result = await applyLiteratureBundleImport({
      runtime: {
        hostApiVersion: 10,
        hostApi: {
          resources: {
            mode: "non-interactive",
            getInput: (slotId: string) =>
              slotId === "bundle"
                ? {
                    fileId: "file-remote-literature-import",
                    path: "/managed/uploads/remote-literature-bundle.zip",
                    displayName: "remote-literature-bundle.zip",
                    contentType: "application/zip",
                  }
                : null,
            getInputs(slotId: string) {
              const input = this.getInput(slotId);
              return input ? [input] : [];
            },
            listOutputs: () => [],
          },
          file: {
            async pickFile() {
              pickerCalls += 1;
              throw new Error("picker must not open");
            },
          },
          archive: {
            async withExtractedZip(path: string, callback: any) {
              openedPath = path;
              return callback({
                entries: ["manifest.json"],
                readText: async () => JSON.stringify(manifest),
                readBytes: async () => new Uint8Array(),
                resolvePath: (entryPath: string) => entryPath,
                measureEntries: async () => ({ files: {} }),
              });
            },
          },
          context: {
            getCurrentView: () => ({
              libraryId: Zotero.Libraries.userLibraryID,
            }),
          },
          items: {
            async createFromJson(args: any) {
              const item = {
                id: 501,
                key: "REMOTEIMPORT",
                ...args.itemJson,
              };
              imported.push(item);
              return item;
            },
            remove: async () => undefined,
          },
        },
      },
    });

    assert.equal(pickerCalls, 0);
    assert.equal(openedPath, "/managed/uploads/remote-literature-bundle.zip");
    assert.equal(result.status, "completed");
    assert.equal(imported[0].title, "Remote Imported Bundle");
  });

  it("imports Research Product metadata and source through the v2 adapter", async function () {
    const created: any[] = [];
    const host: any = {
      items: {
        async createFromJson(args: any) {
          const parent = { id: 42, key: "NEWPAPER", ...args.itemJson };
          created.push(parent);
          return parent;
        },
        async remove() {},
      },
      attachments: {
        async importStoredFile(args: any) {
          created.push({ kind: "attachment", ...args });
          return { id: 43 };
        },
      },
      parents: {
        async addNote() {
          throw new Error("payloads are not part of this fixture");
        },
      },
    };
    const manifest = {
      schema_id: "research_bundle.product",
      schema_version: "2.0.0",
      papers: [
        {
          logical_id: "paper-001",
          metadata_path: "papers/paper-001/metadata.json",
          source: {
            kind: "pdf",
            path: "papers/paper-001/source.pdf",
            assets: [],
          },
          payloads: [],
        },
      ],
      warnings: [],
    };
    const result = await importResearchProductArchive({
      host,
      archive: {
        resolvePath: (value: string) => `/tmp/${value}`,
        readText: async (value: string) =>
          value.endsWith("metadata.json")
            ? JSON.stringify({
                itemType: "journalArticle",
                title: "Imported Product",
              })
            : "",
      },
      manifest,
      target: { view: {}, libraryID: 1 },
    });
    assert.equal(result.status, "completed");
    assert.deepEqual(result.importedItems, [
      { bundleItemId: "paper-001", itemId: 42, itemKey: "NEWPAPER" },
    ]);
    assert.equal(created[1].path, "/tmp/papers/paper-001/source.pdf");
    assert.equal(created[1].mimeType, "application/pdf");
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
    const pdfPath = joinPath(root, "paper.pdf");
    await writeUtf8(pdfPath, "%PDF-1.4\nportable");
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
    await handlers.attachment.createFromPath({
      parent,
      path: pdfPath,
      title: "Original PDF",
      mimeType: "application/pdf",
    });
    const note = await handlers.parent.addNote(parent, {
      content:
        '<div data-zs-note-kind="conversation-note"><p>Conversation</p></div>',
    });
    const host = createWorkflowHostApi();
    host.items.exportText = async () => ({
      ok: true,
      content: "@article{portable, title={Portable Round Trip}}\n",
      translator: {
        translatorID: "ca65189f-8815-4afe-8c8b-8c7c15f0edca",
        label: "Better BibTeX",
      },
      fallbackUsed: false,
      attempts: [],
    });
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
      {
        noteKind: "literature-score",
        payloadType: "literature-score-json",
        payload: portableLiteratureScore,
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
    await handlers.parent.addNote(parent, {
      content: "<div><p>Ordinary note title and content</p></div>",
    });
    const relatedParent = await handlers.item.createFromJson({
      libraryID: Zotero.Libraries.userLibraryID,
      itemJson: { itemType: "book", title: "Portable Related Parent" },
    });
    await handlers.parent.addRelated(parent, relatedParent);
    await handlers.parent.addRelated(relatedParent, parent);

    const built = await buildLiteratureProduct({
      host,
      parents: [parent, relatedParent],
      runtime: {
        hostApi: host,
        hostApiVersion: 8,
        TextEncoder,
        TextDecoder,
        Buffer,
      },
    });
    assert.equal(built.manifest.schema_id, "literature_bundle.product");
    assert.lengthOf(built.manifest.papers[0].attachments, 2);
    assert.equal(built.manifest.papers[0].primary_source.kind, "markdown");
    assert.sameMembers(
      built.manifest.papers[0].payloads.map((entry: any) => entry.payload_type),
      [
        "conversation-note-markdown",
        "digest-markdown",
        "references-json",
        "citation-analysis-json",
        "literature-score-json",
      ],
    );
    const bundlePath = joinPath(root, "portable.zip");
    await host.archive.writeZipAtomic({
      targetPath: bundlePath,
      entries: [
        { name: "manifest.json", text: JSON.stringify(built.manifest) },
        ...built.entries,
      ],
    });

    await host.archive.withExtractedZip(bundlePath, async (archive) => {
      const manifest = validateLiteratureProductManifest(
        JSON.parse(await archive.readText("manifest.json")),
        archive.entries,
      );
      await verifyLiteratureProductFiles(manifest, archive);
      const first = await importLiteratureProductArchive({
        host,
        archive,
        manifest,
        target: {
          view: { libraryId: Zotero.Libraries.userLibraryID },
          libraryID: Zotero.Libraries.userLibraryID,
        },
      });
      const second = await importLiteratureProductArchive({
        host,
        archive,
        manifest,
        target: {
          view: { libraryId: Zotero.Libraries.userLibraryID },
          libraryID: Zotero.Libraries.userLibraryID,
        },
      });
      assert.equal(first.status, "partial", JSON.stringify(first));
      assert.equal(second.status, "partial", JSON.stringify(second));
      assert.include(
        first.warnings.map((warning: any) => warning.code),
        "primary_source_missing",
      );
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
      assert.lengthOf(imported.getAttachments(), 2);
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
      assert.lengthOf(imported.getNotes(), 6);
      assert.isTrue(
        imported
          .getNotes()
          .map((noteId: number) => Zotero.Items.get(noteId)?.getNote() || "")
          .some((html: string) =>
            html.includes("Ordinary note title and content"),
          ),
      );
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
          "literature-score-json",
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

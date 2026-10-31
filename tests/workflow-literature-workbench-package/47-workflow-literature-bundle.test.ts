import { assert } from "chai";
import { installNodeZoteroTransactionStub } from "../helpers/nodeZoteroTransactionStub";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  joinPath,
  mkTempDir,
  readBytes,
  workflowsPath,
  writeUtf8,
  isZoteroRuntime,
} from "../zotero/workflow-test-utils";
import { nativeFixtureMutations as handlers } from "../helpers/nativeFixtureMutations";
import { lockSelection } from "../../src/modules/selectionContext";
import {
  createBoundWorkflowResearchBundleApi,
  createWorkflowHostApi,
} from "../../src/workflows/hostApi";
import { createWorkflowArchiveApi } from "../../src/workflows/archive";
import { createWorkflowPreparedImageScope } from "../../src/workflows/workflowNoteImagePreparation";
import { createHostBridgeWorkflowResourceApi } from "../../src/modules/hostBridge/workflow/hostBridgeWorkflowResources";
import { resolveHostBridgeFileDownload } from "../../src/modules/runtimeFileRegistry";
import {
  buildLiteratureProduct,
  exportLiteratureBundle,
  importLiteratureBundleArchive,
  importLiteratureProductArchive,
  makePortableNoteHtml,
  restorePortableNoteHtml,
  resolveLiteratureBundleParents,
  rewriteMarkdownLocalImages,
  importResearchProductArchive,
  validateResearchProductManifest,
  validateLiteratureBundleManifest,
  validateLiteratureProductManifest,
  verifyLiteratureBundleFiles,
  verifyLiteratureProductFiles,
} from "../../workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs";
import { applyResult as applyLiteratureBundleImport } from "../../workflows_builtin/literature-workbench-package/import-literature-bundle/hooks/applyResult.mjs";
import {
  parseWorkbenchEmbeddedPayloadBytes,
  WORKBENCH_EMBEDDED_PAYLOAD_MARKER,
} from "../../workflows_builtin/literature-workbench-package/lib/embeddedPayloadAttachments.mjs";
import {
  resetZoteroLibrarySourcePageQueryAdapterForTests,
  setZoteroLibrarySourcePageQueryAdapterForTests,
} from "../../src/modules/zoteroHost/zoteroLibraryPageQuery";
import { convertLegacyArtifactSet } from "../../src/modules/literatureArtifactMigration/converter";
import {
  getZoteroManagedNoteLocalControl,
  managedArtifactContent,
} from "../../src/modules/zoteroHost/zoteroManagedNotes";
import { createZoteroHostCapabilityBroker } from "../../src/modules/zoteroHostCapabilityBroker";
import { hashSynthesisContractCanonicalJson } from "../../packages/synthesis-contracts/src/index";
import { createWorkflowResearchBundleMaterializeApi } from "../../src/workflows/workflowHostOwners";
import { largeManagedCitation } from "../fixtures/largeManagedCitation";

import { createMockZoteroLibrarySourcePageQueryAdapter } from "../helpers/zoteroLibraryPageQueryAdapter";

async function bindLiteratureBundleHost(
  baseHost: ReturnType<typeof createWorkflowHostApi>,
  workflowId: "export-literature-bundle" | "import-literature-bundle",
) {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === workflowId,
  );
  assert.isOk(workflow, `${workflowId} workflow must be available`);
  const resources = await createHostBridgeWorkflowResourceApi({
    workflowId: workflow!.manifest.id,
    runId: `${workflowId}-test-${Date.now()}-${Math.random()}`,
    manifest: workflow!.manifest,
    inputs: {},
    outputBindings:
      baseHost.interactionMode === "non_interactive" &&
      workflowId === "export-literature-bundle"
        ? { bundle: { delivery: "bridge-download" } }
        : {},
  });
  resources.mode =
    baseHost.interactionMode === "non_interactive"
      ? "non-interactive"
      : "interactive";
  const ownerId = `${workflowId}-test:${Date.now()}:${Math.random()}`;
  const preparedImages = createWorkflowPreparedImageScope({
    runScopeId: ownerId,
    adapter: {
      async readPathBlob(path: string, mimeType: string) {
        return new Blob([await readBytes(path)], { type: mimeType });
      },
      async process(
        request: import("../../src/platform/noteImageProcessingContract").NoteImageProcessingRequest,
      ) {
        return {
          bytes: request.options.preserveSourceBytes
            ? request.bytes
            : new Uint8Array([137, 80, 78, 71]),
          mimeType: request.options.preserveSourceBytes
            ? (request.mimeType as "image/png" | "image/jpeg")
            : request.options.outputMimeType,
          width: 1,
          height: 1,
        };
      },
    },
  });
  const images = preparedImages.owner;
  return {
    workflow: workflow!,
    host: {
      ...baseHost,
      images,
      resources,
      researchBundles: createBoundWorkflowResearchBundleApi({
        ownerId,
        images,
        preparedImages,
        resources,
      }),
    },
    cleanup: async () => {
      preparedImages.dispose();
      await resources.cleanup();
    },
  };
}

function bibliographyFixture(content: string) {
  return {
    async render(args: any) {
      return {
        content,
        requestedFormats: args.formatPreference,
        usedFormat: {
          ref: { id: "better-bibtex" },
          label: "Better BibTeX",
          fileExtension: "bib",
          contentType: "application/x-bibtex",
          availability: "available",
          optionsSchema: null,
        },
        fallbackUsed: false,
        issues: [],
      };
    },
  };
}

async function corruptNotePayloadAttachment(
  host: ReturnType<typeof createWorkflowHostApi>,
  noteRef: { libraryId: number; key: string },
  payloadType: string,
) {
  const summary = (await host.library.listNotePayloads(noteRef)).payloads.find(
    (entry) => entry.payloadType === payloadType,
  );
  assert.isOk(summary, `missing ${payloadType} attachment`);
  if (summary?.source.kind !== "embedded_attachment") {
    assert.fail(`expected embedded ${payloadType} attachment`);
  }
  const attachment = Zotero.Items.getByLibraryAndKey(
    summary.source.attachmentRef.libraryId,
    summary.source.attachmentRef.key,
  );
  await writeUtf8(
    await attachment!.getFilePathAsync(),
    `${WORKBENCH_EMBEDDED_PAYLOAD_MARKER}not-valid-base64\n`,
  );
  return summary.source.attachmentRef;
}

function parentSelection(ref: { libraryId: number; key: string }) {
  return lockSelection([
    {
      kind: "parent",
      ref,
      itemType: "journalArticle",
    },
  ]);
}

function legacyBundlePayloadTag(payloadType: string, payload: unknown) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64",
  );
  return `<span data-zs-block="payload" data-zs-payload="${payloadType}" data-zs-version="1" data-zs-encoding="base64" data-zs-value="${encoded}"></span>`;
}

function legacyBundleImportFixture() {
  const references = {
    items: [
      {
        title: "Legacy bundle reference",
        authors: ["Legacy Author"],
        year: 2024,
        rawCitation: "Legacy Author. Legacy bundle reference. 2024.",
      },
    ],
  };
  const citation = {
    summary: "Legacy citation analysis",
    timeline: {
      early: { summary: "", sourceReferenceIds: [] },
      mid: { summary: "", sourceReferenceIds: [] },
      recent: { summary: "", sourceReferenceIds: [] },
    },
    items: [],
    unresolved: [],
  };
  const referencesPath = "items/legacy/notes/references/note.html";
  const referencesImagePath = "items/legacy/notes/references/payload.png";
  const citationPath = "items/legacy/notes/citation/note.html";
  const legacyEnvelope = {
    schemaVersion: 1,
    payloadStorageVersion: 1,
    kind: "zotero-skills-workbench-note-payload",
    payloadType: "references-json",
    payload: references,
  };
  const legacyImageBytes = Buffer.from(
    `${WORKBENCH_EMBEDDED_PAYLOAD_MARKER}${Buffer.from(
      JSON.stringify(legacyEnvelope),
      "utf8",
    ).toString("base64")}\n`,
    "utf8",
  );
  return {
    manifest: {
      warnings: [],
      items: [
        {
          id: "legacy",
          itemJson: {
            itemType: "journalArticle",
            title: "Legacy bundle parent",
          },
          relatedItemIds: [],
          attachments: [],
          notes: [
            {
              id: "references",
              htmlPath: referencesPath,
              tags: [],
              images: [
                {
                  id: "legacy-payload",
                  path: referencesImagePath,
                  metadata: { contentType: "image/png" },
                  preserveSourceBytes: true,
                },
              ],
            },
            {
              id: "citation",
              htmlPath: citationPath,
              tags: [],
              images: [],
            },
          ],
        },
      ],
    },
    files: {
      [referencesPath]: `<div><p>Visible references</p>${legacyBundlePayloadTag("references-json", references)}<p data-zs-payload-anchor-container="1"><img data-attachment-key="legacy-payload" data-zs-payload-anchor="references-json"></p></div>`,
      [citationPath]: `<div><p>Visible citation</p>${legacyBundlePayloadTag("citation-analysis-json", citation)}</div>`,
    },
    bytes: { [referencesImagePath]: legacyImageBytes },
  };
}

const portableLiteratureScore = {
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
    configured_weight: 1 / 6,
    effective_weight: 1 / 6,
    raw_score: 6,
    applicable_max_score: 10,
    criteria: [
      {
        criterion_key: `${dimension_key}.evidence`,
        name: "Evidence",
        status: "scored",
        score: 6,
        max_score: 10,
        reason: "Source evidence",
        evidence: [],
      },
    ],
  })),
};

describe("literature portable bundle workflows", function () {
  let restoreTransaction: () => void;
  beforeEach(() => {
    restoreTransaction = installNodeZoteroTransactionStub();
  });
  afterEach(() => {
    resetZoteroLibrarySourcePageQueryAdapterForTests();
    restoreTransaction();
  });
  it("closes progress and preserves export failures even when feedback throws", async function () {
    const failure = new Error("materialization failure");
    let closed = 0;
    const signal = new AbortController().signal;
    const host = {
      interactionMode: "interactive",
      library: {
        async getItemDetail() {
          return {
            kind: "regular",
            item: { ref: { libraryId: 1, key: "AAAA1111" } },
          };
        },
      },
      file: {
        async pickSaveFile() {
          return "bundle.zip";
        },
      },
      notifications: {
        createProgress(input: { text: string }) {
          assert.match(input.text, /准备/);
          return {
            update() {
              throw new Error("UI unavailable");
            },
            close() {
              closed++;
              throw new Error("close failed");
            },
          };
        },
      },
      logging: {
        appendRuntimeLog() {
          throw new Error("logging failed");
        },
      },
      researchBundles: {
        async materializePapers(
          _input: unknown,
          control: { signal: unknown; onProgress(event: unknown): void },
        ) {
          assert.strictEqual(control.signal, signal);
          control.onProgress({
            phase: "materialize",
            completed: 0,
            total: 1,
            unit: "items",
          });
          throw failure;
        },
      },
    };
    let caught: unknown;
    try {
      await exportLiteratureBundle({
        host,
        runtime: { locale: "zh-CN", signal },
        selectionContext: parentSelection({ libraryId: 1, key: "AAAA1111" }),
      });
    } catch (error) {
      caught = error;
    }
    assert.strictEqual(caught, failure);
    assert.equal(closed, 1);
  });

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

  it("exports complete Citation evidence when its derived public detail exceeds the budget", async function () {
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroLibrarySourcePageQueryAdapter(),
    );
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Large Citation export" },
    });
    const parentRef = { libraryId: parent.libraryID, key: parent.key };
    const { references, citation } = largeManagedCitation();
    const referencesBasis = hashSynthesisContractCanonicalJson(references);
    await handlers.parent.addNote(parent, {
      content: managedArtifactContent("references", "References", references)
        .content,
    });
    const note = await handlers.parent.addNote(parent, {
      content: managedArtifactContent(
        "citation-analysis",
        "Citation Analysis",
        {
          ...citation,
          referencesBasis,
        },
      ).content,
    });
    const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const image = await Zotero.Attachments.importEmbeddedImage({
      blob: new Blob([imageBytes], { type: "image/png" }),
      parentItemID: note.id,
    });
    await handlers.note.update(note, {
      content: `${note.getNote()}<img data-attachment-key="${image.key}">`,
    });
    const bound = await bindLiteratureBundleHost(
      createWorkflowHostApi(),
      "export-literature-bundle",
    );
    const root = await mkTempDir("large-citation-bundle");
    const targetPath = joinPath(root, "bundle.zip");
    const host = {
      ...bound.host,
      bibliography: bibliographyFixture("@article{large}\n"),
      file: { ...bound.host.file, pickSaveFile: async () => targetPath },
    };
    try {
      let rejected: unknown;
      try {
        await host.library.getNoteDetail(
          { libraryId: note.libraryID, key: note.key },
          { format: "html" },
        );
      } catch (error) {
        rejected = error;
      }
      assert.equal((rejected as { code?: string })?.code, "resource_limited");
      const transfer = await getZoteroManagedNoteLocalControl(
        createZoteroHostCapabilityBroker(),
      ).readForTransfer({ libraryId: note.libraryID, key: note.key });
      assert.equal(transfer.detail.kind, "managed");
      if (transfer.detail.kind !== "managed")
        assert.fail("Expected managed transfer");
      assert.deepEqual(
        transfer.detail.payload,
        citation,
        JSON.stringify(transfer.detail.payload),
      );
      assert.deepEqual(transfer.detail.provenance, { referencesBasis });
      const result = await bound.workflow.hooks.applyResult({
        parent: null,
        manifest: bound.workflow.manifest,
        bundleReader: { readText: async () => "" },
        runResult: {
          resultJson: {
            parameter: {},
            selectionContext: parentSelection(parentRef),
          },
        },
        runtime: {
          hostApi: host,
          hostApiVersion: 12,
          TextEncoder,
          TextDecoder,
        },
      });
      assert.equal(result.status, "completed");
      await host.archive.withExtractedZip(
        { sourcePath: targetPath },
        {},
        async (archive) => {
          const manifest = JSON.parse(await archive.readText("manifest.json"));
          await verifyLiteratureProductFiles(manifest, archive);
          const paper = manifest.papers[0];
          const payload = paper.payloads.find(
            (entry: any) => entry.payload_type === "citation-analysis-json",
          );
          assert.deepEqual(
            JSON.parse(await archive.readText(payload.path)),
            citation,
          );
          const images = paper.notes.flatMap((entry: any) => entry.images);
          assert.lengthOf(images, 1);
          assert.deepEqual(await archive.readBytes(images[0].path), imageBytes);
        },
      );
    } finally {
      await bound.cleanup();
    }
  });

  it("retains omitted matching metadata across digest updates and replaces it explicitly", async function () {
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroLibrarySourcePageQueryAdapter(),
    );
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Auxiliary payload retention" },
    });
    const host = createWorkflowHostApi();
    const parentRef = { libraryId: parent.libraryID, key: parent.key };
    const payloadType = "literature-matching-metadata-json";
    const metadata = {
      schema: "literature_matching_metadata.v1",
      key_terms: ["retention"],
      methods: [],
      problems: [],
      datasets: [],
      exclude_terms: [],
    };
    const apply = (operationId: string, markdown: string, extra = {}) =>
      host.literatureArtifacts.applyAnalysis({
        operationId,
        parentRef,
        digest: { markdown },
        ...extra,
      });

    const first = await apply("auxiliary-retention-1", "First digest", {
      matchingMetadata: metadata,
    });
    assert.equal(first.outcome, "committed", JSON.stringify(first));
    const second = await apply("auxiliary-retention-2", "Second digest");
    assert.equal(second.outcome, "committed", JSON.stringify(second));

    const notes = await host.library.getItemNotes(parentRef);
    const noteRef = notes.notes[0]?.ref;
    assert.isOk(noteRef);
    const summary = (
      await host.library.listNotePayloads(noteRef!)
    ).payloads.find((entry) => entry.payloadType === payloadType);
    assert.isOk(summary, "matching metadata must survive a digest update");
    assert.equal(summary!.state, "available");
    assert.isEmpty(summary!.issues);
    assert.deepEqual(
      (
        await host.library.getNotePayload(noteRef!, {
          payloadType,
        })
      ).value,
      metadata,
    );

    const replacement = {
      ...metadata,
      key_terms: ["replacement"],
    };
    const third = await apply("auxiliary-retention-3", "Third digest", {
      matchingMetadata: replacement,
    });
    assert.equal(third.outcome, "committed", JSON.stringify(third));
    const replacedPayloads = await host.library.listNotePayloads(noteRef!);
    assert.lengthOf(
      replacedPayloads.payloads.filter(
        (entry) => entry.payloadType === payloadType,
      ),
      1,
    );
    assert.deepEqual(
      (
        await host.library.getNotePayload(noteRef!, {
          payloadType,
        })
      ).value,
      replacement,
    );
  });

  it("exports and imports intact matching metadata after an unchanged digest update with a missing anchor", async function () {
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroLibrarySourcePageQueryAdapter(),
    );
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Damaged auxiliary payload" },
    });
    const host = createWorkflowHostApi();
    const parentRef = { libraryId: parent.libraryID, key: parent.key };
    const payloadType = "literature-matching-metadata-json";
    const metadata = {
      schema: "literature_matching_metadata.v1",
      key_terms: ["detached anchor"],
      methods: [],
      problems: [],
      datasets: [],
      exclude_terms: [],
    };
    const applied = await host.literatureArtifacts.applyAnalysis({
      operationId: "damaged-anchor-apply",
      parentRef,
      digest: { markdown: "Digest with metadata" },
      matchingMetadata: metadata,
    });
    assert.equal(applied.outcome, "committed", JSON.stringify(applied));
    const updated = await host.literatureArtifacts.applyAnalysis({
      operationId: "damaged-anchor-update",
      parentRef,
      digest: { markdown: "Digest with metadata" },
    });
    assert.equal(updated.outcome, "committed", JSON.stringify(updated));
    const noteRef = (await host.library.getItemNotes(parentRef)).notes[0].ref;
    const note = Zotero.Items.getByLibraryAndKey(
      noteRef.libraryId,
      noteRef.key,
    )!;
    const anchorPattern =
      /<img\b[^>]*data-zs-payload-anchor\s*=\s*["']literature-matching-metadata-json["'][^>]*>/iu;
    assert.match(note.getNote(), anchorPattern);
    await handlers.note.update(note, {
      content: note.getNote().replace(anchorPattern, ""),
    });
    const sourceHtml = note.getNote();
    const sourcePayloads = await host.library.listNotePayloads(noteRef);
    assert.equal(
      sourcePayloads.payloads.find((entry) => entry.payloadType === payloadType)
        ?.state,
      "stale",
    );

    const bound = await bindLiteratureBundleHost(
      host,
      "export-literature-bundle",
    );
    const root = await mkTempDir("damaged-auxiliary-bundle");
    const targetPath = joinPath(root, "bundle.zip");
    const exportHost = {
      ...bound.host,
      bibliography: bibliographyFixture("@article{damaged}\n"),
      file: { ...bound.host.file, pickSaveFile: async () => targetPath },
    };
    try {
      const result = await bound.workflow.hooks.applyResult({
        parent: null,
        manifest: bound.workflow.manifest,
        bundleReader: { readText: async () => "" },
        runResult: {
          resultJson: {
            parameter: {},
            selectionContext: parentSelection(parentRef),
          },
        },
        runtime: {
          hostApi: exportHost,
          hostApiVersion: 12,
          TextEncoder,
          TextDecoder,
        },
      });
      assert.equal(result.status, "completed", JSON.stringify(result));
      assert.equal(note.getNote(), sourceHtml);
      assert.equal(
        (await host.library.listNotePayloads(noteRef)).payloads.find(
          (entry) => entry.payloadType === payloadType,
        )?.state,
        "stale",
      );

      let exported = false;
      await exportHost.archive.withExtractedZip(
        { sourcePath: targetPath },
        {},
        async (archive) => {
          const manifest = JSON.parse(await archive.readText("manifest.json"));
          await verifyLiteratureProductFiles(manifest, archive);
          for (const noteEntry of manifest.papers[0].notes || []) {
            for (const image of noteEntry.images || []) {
              const parsed = parseWorkbenchEmbeddedPayloadBytes(
                await archive.readBytes(image.path),
                { TextDecoder, Buffer },
              );
              if (parsed?.payloadType !== payloadType) continue;
              exported = true;
              assert.deepEqual(parsed.payload, metadata);
            }
          }
        },
      );
      assert.isTrue(exported, "bundle must carry the auxiliary payload");

      const boundImport = await bindLiteratureBundleHost(
        createWorkflowHostApi(),
        "import-literature-bundle",
      );
      try {
        await exportHost.archive.withExtractedZip(
          { sourcePath: targetPath },
          {},
          async (archive) => {
            const validated = validateLiteratureProductManifest(
              JSON.parse(await archive.readText("manifest.json")),
              archive.entries,
            );
            await verifyLiteratureProductFiles(validated, archive);
            const imported = await importLiteratureProductArchive({
              host: boundImport.host,
              archive,
              manifest: validated,
              target: {
                view: { libraryId: Zotero.Libraries.userLibraryID },
                libraryID: Zotero.Libraries.userLibraryID,
              },
            });
            assert.isAtLeast(
              imported.importedItems.length,
              1,
              JSON.stringify(imported),
            );
            const importedItem = Zotero.Items.getByLibraryAndKey(
              imported.importedItems[0].itemRef.libraryId,
              imported.importedItems[0].itemRef.key,
            )!;
            let importedMetadata: unknown;
            for (const noteId of importedItem.getNotes()) {
              const importedNote = Zotero.Items.get(noteId)!;
              const importedRef = {
                libraryId: importedNote.libraryID,
                key: importedNote.key,
              };
              const page =
                await boundImport.host.library.listNotePayloads(importedRef);
              const summary = page.payloads.find(
                (entry) => entry.payloadType === payloadType,
              );
              if (!summary) continue;
              assert.equal(summary.state, "available");
              importedMetadata = (
                await boundImport.host.library.getNotePayload(importedRef, {
                  payloadType,
                })
              ).value;
            }
            assert.deepEqual(importedMetadata, metadata);
          },
        );
      } finally {
        await boundImport.cleanup();
      }
    } finally {
      await bound.cleanup();
    }
  });

  for (const defect of ["missing", "stale", "no-marker"] as const) {
    it(`recovers a unique main payload with a ${defect} anchor`, async function () {
      setZoteroLibrarySourcePageQueryAdapterForTests(
        createMockZoteroLibrarySourcePageQueryAdapter(),
      );
      const parent = await handlers.item.create({
        itemType: "journalArticle",
        fields: { title: "Recoverable main payload" },
      });
      const host = createWorkflowHostApi();
      const parentRef = { libraryId: parent.libraryID, key: parent.key };
      const applied = await host.literatureArtifacts.upsertScore({
        operationId: `main-anchor-${defect}`,
        parentRef,
        score: portableLiteratureScore,
      });
      assert.equal(applied.outcome, "committed", JSON.stringify(applied));
      const ref = (await host.library.getItemNotes(parentRef)).notes[0].ref;
      const note = Zotero.Items.getByLibraryAndKey(ref.libraryId, ref.key)!;
      const anchorPattern =
        /<img\b[^>]*data-zs-payload-anchor\s*=\s*["']literature-score-json["'][^>]*>/iu;
      const anchor = note.getNote().match(anchorPattern)?.[0];
      assert.isOk(anchor);
      let content = note.getNote();
      if (defect === "missing" || defect === "no-marker") {
        content = content.replace(anchorPattern, "");
      } else {
        content = content.replace(
          anchor!,
          anchor!.replace(
            /data-attachment-key\s*=\s*["'][^"']+["']/iu,
            'data-attachment-key="AAAAAAAA"',
          ),
        );
      }
      if (defect === "no-marker") {
        content = content.replace(
          /\sdata-zs-note-kind\s*=\s*["'][^"']+["']/iu,
          "",
        );
      }
      await handlers.note.update(note, { content });
      const sourceHtml = note.getNote();
      const attachmentKey = anchor!.match(
        /data-attachment-key\s*=\s*["']([^"']+)["']/iu,
      )?.[1];
      assert.isOk(attachmentKey);

      const transfer = await getZoteroManagedNoteLocalControl(
        createZoteroHostCapabilityBroker(),
      ).readForTransfer(ref);
      assert.equal(transfer.detail.kind, "managed");
      if (transfer.detail.kind !== "managed") assert.fail("expected managed");
      assert.equal(transfer.detail.noteKind, "literature-score");
      assert.deepEqual(transfer.detail.payload, portableLiteratureScore);
      assert.isOk(
        transfer.issues?.some(
          (issue) =>
            issue.code === "payload_anchor_recovered" &&
            issue.payloadType === "literature-score-json" &&
            issue.outcome === "recovered",
        ),
      );
      assert.match(
        transfer.html,
        new RegExp(
          `data-attachment-key=["']${attachmentKey}["'][^>]*data-zs-payload-anchor=["']literature-score-json["']`,
          "u",
        ),
      );
      assert.equal(note.getNote(), sourceHtml);
    });
  }

  for (const defect of ["duplicate", "mismatched-anchor"] as const) {
    it(`${defect === "duplicate" ? "rejects" : "recovers"} ${defect} auxiliary payloads during transfer`, async function () {
      setZoteroLibrarySourcePageQueryAdapterForTests(
        createMockZoteroLibrarySourcePageQueryAdapter(),
      );
      const parent = await handlers.item.create({ itemType: "journalArticle" });
      const host = createWorkflowHostApi();
      const parentRef = { libraryId: parent.libraryID, key: parent.key };
      const metadata = { schema: "literature_matching_metadata.v1" };
      const applied = await host.literatureArtifacts.applyAnalysis({
        operationId: `auxiliary-${defect}`,
        parentRef,
        digest: { markdown: "Digest" },
        matchingMetadata: metadata,
      });
      assert.equal(applied.outcome, "committed");
      const ref = (await host.library.getItemNotes(parentRef)).notes[0].ref;
      const note = Zotero.Items.getByLibraryAndKey(ref.libraryId, ref.key);
      const { summary } = await host.library.getNotePayload(ref, {
        payloadType: "literature-matching-metadata-json",
      });
      assert.equal(summary.source.kind, "embedded_attachment");
      if (summary.source.kind !== "embedded_attachment")
        throw new Error("Expected embedded payload");
      const attachmentRef = summary.source.attachmentRef;
      if (defect === "duplicate") {
        const attachment = Zotero.Items.getByLibraryAndKey(
          attachmentRef.libraryId,
          attachmentRef.key,
        );
        await Zotero.Attachments.importEmbeddedImage({
          parentItemID: note.id,
          blob: new Blob(
            [await readBytes(await attachment.getFilePathAsync())],
            {
              type: "image/png",
            },
          ),
        });
      } else {
        await handlers.note.update(note, {
          content: note.getNote().replace(attachmentRef.key, "AAAAAAAA"),
        });
      }
      const transfer = getZoteroManagedNoteLocalControl(
        createZoteroHostCapabilityBroker(),
      );
      if (defect === "duplicate") {
        let failure: any;
        try {
          await transfer.readForTransfer(ref);
        } catch (error) {
          failure = error;
        }
        assert.equal(failure?.code, "conflict");
        const partial = await transfer.readForTransfer(ref, undefined, {
          failurePolicy: "record_partial",
        });
        assert.equal(partial.detail.kind, "managed");
        assert.isOk(
          partial.issues?.some(
            (issue) => issue.stage === "payload" && issue.outcome === "skipped",
          ),
        );
        assert.isAtLeast(partial.recovery?.length || 0, 2);
        assert.isFalse(
          partial.payloads.some(
            (entry) =>
              entry.summary.payloadType === "literature-matching-metadata-json",
          ),
        );
      } else {
        const recovered = await transfer.readForTransfer(ref);
        assert.equal(recovered.detail.kind, "managed");
        assert.isOk(
          recovered.issues?.some(
            (issue) =>
              issue.code === "payload_anchor_recovered" &&
              issue.outcome === "recovered",
          ),
        );
        assert.deepEqual(
          recovered.payloads.find(
            (entry) =>
              entry.summary.payloadType === "literature-matching-metadata-json",
          )?.value,
          metadata,
        );
      }
    });
  }

  it("keeps a valid main payload and body when an auxiliary payload is corrupt", async function () {
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroLibrarySourcePageQueryAdapter(),
    );
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Corrupt auxiliary payload" },
    });
    const host = createWorkflowHostApi();
    const parentRef = { libraryId: parent.libraryID, key: parent.key };
    const payloadType = "literature-matching-metadata-json";
    const applied = await host.literatureArtifacts.applyAnalysis({
      operationId: "corrupt-auxiliary",
      parentRef,
      digest: { markdown: "Body survives corrupt metadata" },
      matchingMetadata: { schema: "literature_matching_metadata.v1" },
    });
    assert.equal(applied.outcome, "committed", JSON.stringify(applied));
    const ref = (await host.library.getItemNotes(parentRef)).notes[0].ref;
    const note = Zotero.Items.getByLibraryAndKey(ref.libraryId, ref.key)!;
    const attachmentRef = await corruptNotePayloadAttachment(
      host,
      ref,
      payloadType,
    );
    const sourceHtml = note.getNote();
    const control = getZoteroManagedNoteLocalControl(
      createZoteroHostCapabilityBroker(),
    );
    const transfer = await control.readForTransfer(ref, undefined, {
      failurePolicy: "record_partial",
    });

    assert.equal(transfer.detail.kind, "managed");
    if (transfer.detail.kind !== "managed") assert.fail("expected managed");
    assert.equal(transfer.detail.noteKind, "digest");
    assert.deepEqual(transfer.detail.payload, {
      markdown: "Body survives corrupt metadata",
    });
    assert.include(transfer.html, "Body survives corrupt metadata");
    assert.notInclude(
      transfer.html,
      `data-attachment-key="${attachmentRef.key}"`,
    );
    assert.notInclude(transfer.html, `data-zs-payload-anchor="${payloadType}"`);
    assert.isOk(
      transfer.issues?.some(
        (issue) =>
          issue.stage === "payload" &&
          issue.payloadType === payloadType &&
          issue.outcome === "skipped",
      ),
    );
    assert.isOk(
      transfer.recovery?.some(
        (entry) => entry.attachmentRef?.key === attachmentRef.key,
      ),
    );
    assert.equal(note.getNote(), sourceHtml);
    let strictFailure: any;
    try {
      await control.readForTransfer(ref);
    } catch (error) {
      strictFailure = error;
    }
    assert.equal(strictFailure?.code, "execution_failed");
  });

  it("recovers an invalid main payload while keeping a good sibling note", async function () {
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroLibrarySourcePageQueryAdapter(),
    );
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Invalid main payload" },
    });
    const host = createWorkflowHostApi();
    const parentRef = { libraryId: parent.libraryID, key: parent.key };
    const applied = await host.literatureArtifacts.upsertScore({
      operationId: "corrupt-main-score",
      parentRef,
      score: portableLiteratureScore,
    });
    assert.equal(applied.outcome, "committed", JSON.stringify(applied));
    const ref = (await host.library.getItemNotes(parentRef)).notes[0].ref;
    const note = Zotero.Items.getByLibraryAndKey(ref.libraryId, ref.key)!;
    const attachmentRef = await corruptNotePayloadAttachment(
      host,
      ref,
      "literature-score-json",
    );
    const sibling = await handlers.parent.addNote(parent, {
      content: "<div><p>Good sibling note</p></div>",
    });
    const sourceHtml = note.getNote();
    const materialize = createWorkflowResearchBundleMaterializeApi({
      resources: {
        async materializeFile(input) {
          return {
            ref: { kind: "workflow_resource", id: "recovery-file" },
            fileId: "recovery-file",
            path: input.sourcePath,
            displayName: input.displayName || "recovery.bin",
            contentType: input.contentType || "application/octet-stream",
            sizeBytes: 1,
            sha256: "c".repeat(64),
          };
        },
        async releaseResources() {},
      },
    });

    const result = await materialize({
      paperRefs: [parentRef],
      missingFilePolicy: "require_complete",
      failurePolicy: "record_partial",
    });

    assert.lengthOf(result.papers[0].notes, 1);
    assert.equal(result.papers[0].notes[0].source.ref.key, sibling.key);
    assert.isOk(
      result.issues.some(
        (issue) =>
          issue.noteRef?.key === ref.key &&
          issue.stage === "payload" &&
          issue.outcome === "recovery_only",
      ),
    );
    assert.isOk(
      result.recovery?.some(
        (entry) =>
          entry.noteRef?.key === ref.key &&
          entry.filename === "note.html" &&
          entry.content === sourceHtml,
      ),
    );
    assert.isOk(
      result.recovery?.some(
        (entry) =>
          entry.noteRef?.key === ref.key &&
          entry.attachmentRef?.key === attachmentRef.key,
      ),
    );
    assert.equal(note.getNote(), sourceHtml);
  });

  it("stops staging note images before cleaning a failed materialization", async function () {
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroLibrarySourcePageQueryAdapter(),
    );
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Failed image staging" },
    });
    for (let index = 0; index < 2; index += 1) {
      const note = await handlers.parent.addNote(parent, {
        content: "<p>Image</p>",
      });
      const image = await Zotero.Attachments.importEmbeddedImage({
        blob: new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
          type: "image/png",
        }),
        parentItemID: note.id,
      });
      await handlers.note.update(note, {
        content: `<p>Image</p><img data-attachment-key="${image.key}">`,
      });
    }
    const failure = new Error("fixture staging failure");
    const events: string[] = [];
    const materialize = createWorkflowResearchBundleMaterializeApi({
      resources: {
        async materializeFile() {
          events.push("stage");
          throw failure;
        },
        async releaseResources() {
          events.push("cleanup");
        },
      },
    });
    let rejected: unknown;
    try {
      await materialize({
        paperRefs: [{ libraryId: parent.libraryID, key: parent.key }],
        missingFilePolicy: "require_complete",
      });
    } catch (error) {
      rejected = error;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    assert.strictEqual(rejected, failure);
    assert.equal(events.filter((event) => event === "stage").length, 1);
    assert.equal(events.at(-1), "cleanup");
  });

  it("keeps later note images and sibling notes after a local image failure", async function () {
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroLibrarySourcePageQueryAdapter(),
    );
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Partial note image staging" },
    });
    const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const addImageNote = async (marker: string) => {
      const note = await handlers.parent.addNote(parent, {
        content: `<p>${marker}</p>`,
      });
      const attachments = [];
      for (const suffix of ["a", "b"]) {
        const image = await Zotero.Attachments.importEmbeddedImage({
          blob: new Blob([imageBytes], { type: "image/png" }),
          parentItemID: note.id,
        });
        attachments.push(image);
      }
      await handlers.note.update(note, {
        content: `<p>${marker}</p>${attachments
          .map((image) => `<img data-attachment-key="${image.key}">`)
          .join("")}`,
      });
      return { note, attachments };
    };
    const first = await addImageNote("first");
    const sibling = await addImageNote("sibling");
    let stageCalls = 0;
    const stagedSources: string[] = [];
    let released = 0;
    const materialize = createWorkflowResearchBundleMaterializeApi({
      resources: {
        async materializeFile(input) {
          stageCalls += 1;
          if (stageCalls === 1) {
            throw Object.assign(new Error("one image failed"), {
              code: "attachment_unreadable",
            });
          }
          stagedSources.push(input.sourcePath);
          return {
            ref: { kind: "workflow_resource", id: `resource-${stageCalls}` },
            fileId: `file-${stageCalls}`,
            path: input.sourcePath,
            displayName: input.displayName || "image.png",
            contentType: input.contentType || "image/png",
            sizeBytes: imageBytes.byteLength,
            sha256: "a".repeat(64),
          };
        },
        async releaseResources() {
          released += 1;
        },
      },
    });

    const result = await materialize({
      paperRefs: [{ libraryId: parent.libraryID, key: parent.key }],
      missingFilePolicy: "require_complete",
      failurePolicy: "record_partial",
    });

    assert.lengthOf(result.papers, 1);
    assert.lengthOf(result.papers[0].notes, 2);
    assert.deepEqual(
      result.papers[0].notes.map((note) => note.content.embeddedImages.length),
      [1, 2],
    );
    assert.equal(stagedSources.length, 3);
    assert.equal(released, 0, "successful resources must remain available");
    const imageIssues = result.issues.filter(
      (issue) => issue.code === "export_unit_failed" && issue.stage === "image",
    );
    assert.lengthOf(imageIssues, 1);
    assert.equal(imageIssues[0].outcome, "skipped");
    assert.equal(imageIssues[0].attachmentRef?.key, first.attachments[0].key);
    assert.equal(result.papers[0].notes[1].source.ref.key, sibling.note.key);
  });

  it("skips excluded note recovery and keeps source attachments", async function () {
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroLibrarySourcePageQueryAdapter(),
    );
    const root = await mkTempDir("source-only-materialization");
    const pdfPath = joinPath(root, "source.pdf");
    await writeUtf8(pdfPath, "%PDF-1.4\nsource only");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Source only materialization" },
    });
    const attachment = await handlers.attachment.createFromPath({
      parent,
      path: pdfPath,
      title: "Source PDF",
      mimeType: "application/pdf",
    });
    const note = await handlers.parent.addNote(parent, {
      content: "<p>broken note</p>",
    });
    const image = await Zotero.Attachments.importEmbeddedImage({
      blob: new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
        type: "image/png",
      }),
      parentItemID: note.id,
    });
    await handlers.note.update(note, {
      content: `<p>broken note</p><img data-attachment-key="${image.key}">`,
    });
    const failure = new Error("excluded note must not be read");
    const materialize = createWorkflowResearchBundleMaterializeApi({
      resources: {
        async materializeFile(input) {
          if (input.sourcePath.includes("broken")) throw failure;
          return {
            ref: { kind: "workflow_resource", id: "source-file" },
            fileId: "source-file",
            path: input.sourcePath,
            displayName: input.displayName || "source.pdf",
            contentType: input.contentType || "application/pdf",
            sizeBytes: 1,
            sha256: "b".repeat(64),
          };
        },
        async releaseResources() {},
      },
    });

    const result = await materialize({
      paperRefs: [{ libraryId: parent.libraryID, key: parent.key }],
      missingFilePolicy: "require_complete",
      includeNotes: false,
    });

    assert.lengthOf(result.papers[0].notes, 0);
    assert.isEmpty(result.recovery || []);
    assert.isEmpty(result.issues);
    assert.isTrue(
      result.papers[0].attachments.some(
        (entry) => entry.sourceRef.key === attachment.key,
      ),
    );
  });

  it("isolates a child attachment path failure in private transfer", async function () {
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroLibrarySourcePageQueryAdapter(),
    );
    const root = await mkTempDir("attachment-transfer-failure");
    const firstPath = joinPath(root, "first.pdf");
    const secondPath = joinPath(root, "second.pdf");
    await writeUtf8(firstPath, "%PDF-1.4\nfirst");
    await writeUtf8(secondPath, "%PDF-1.4\nsecond");
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Attachment transfer failure" },
    });
    const first = await handlers.attachment.createFromPath({
      parent,
      path: firstPath,
      title: "First PDF",
      mimeType: "application/pdf",
    });
    await handlers.attachment.createFromPath({
      parent,
      path: secondPath,
      title: "Second PDF",
      mimeType: "application/pdf",
    });
    const original = first.getFilePathAsync;
    first.getFilePathAsync = async () => {
      throw new Error("attachment path unavailable");
    };
    try {
      const control = getZoteroManagedNoteLocalControl(
        createZoteroHostCapabilityBroker(),
      );
      const partial = await control.readAttachmentsForTransfer(
        { libraryId: parent.libraryID, key: parent.key },
        undefined,
        { failurePolicy: "record_partial" },
      );
      assert.lengthOf(partial.attachments, 1);
      assert.lengthOf(partial.issues, 1);
      assert.equal(partial.issues[0].stage, "attachment");
      let strictFailure: any;
      try {
        await control.readAttachmentsForTransfer({
          libraryId: parent.libraryID,
          key: parent.key,
        });
      } catch (error) {
        strictFailure = error;
      }
      assert.isOk(strictFailure);
    } finally {
      first.getFilePathAsync = original;
    }
  });

  it("lists child note identities without reading note bodies", async function () {
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroLibrarySourcePageQueryAdapter(),
    );
    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Note identity transfer" },
    });
    const first = await handlers.parent.addNote(parent, {
      content: "<p>first</p>",
    });
    const second = await handlers.parent.addNote(parent, {
      content: "<p>second</p>",
    });
    const expected = [first.key, second.key].sort();
    const original = first.getNote;
    first.getNote = () => {
      throw new Error("note body unavailable");
    };
    try {
      const refs = await getZoteroManagedNoteLocalControl(
        createZoteroHostCapabilityBroker(),
      ).readNoteRefsForTransfer({
        libraryId: parent.libraryID,
        key: parent.key,
      });
      assert.deepEqual(refs.map((ref) => ref.key).sort(), expected);
      const materialize = createWorkflowResearchBundleMaterializeApi({
        resources: {
          async materializeFile() {
            assert.fail("ordinary notes have no files");
          },
          async releaseResources() {},
        },
      });
      const result = await materialize({
        paperRefs: [{ libraryId: parent.libraryID, key: parent.key }],
        missingFilePolicy: "record_missing",
        failurePolicy: "record_partial",
      });
      assert.deepEqual(
        result.papers[0].notes.map((note) => note.source.ref.key),
        [second.key],
      );
      assert.isTrue(
        result.issues.some(
          (issue) =>
            issue.code === "export_unit_failed" &&
            issue.noteRef?.key === first.key,
        ),
      );
    } finally {
      first.getNote = original;
    }
  });

  it("resolves selection, collection, and library parent sets with bounded paging", async function () {
    const items = new Map([
      [
        "AAA",
        { ref: { libraryId: 1, key: "AAA" }, itemType: "journalArticle" },
      ],
      [
        "BBB",
        { ref: { libraryId: 1, key: "BBB" }, itemType: "journalArticle" },
      ],
      ["CCC", { ref: { libraryId: 1, key: "CCC" }, itemType: "book" }],
    ]);
    const calls: any[] = [];
    const host: any = {
      context: { getCurrentView: () => ({ libraryId: 1 }) },
      library: {
        async getItemDetail(ref: { key: string }) {
          return { kind: "regular", item: items.get(ref.key) };
        },
        async listItems(args: any) {
          calls.push(args);
          if (args.collectionRef) {
            return args.cursor
              ? {
                  items: [
                    {
                      kind: "regular",
                      ref: { libraryId: 1, key: "AAA" },
                      parentRef: null,
                    },
                  ],
                  hasMore: false,
                }
              : {
                  items: [
                    {
                      kind: "regular",
                      ref: { libraryId: 1, key: "BBB" },
                      parentRef: null,
                    },
                    {
                      kind: "regular",
                      ref: { libraryId: 1, key: "BBB" },
                      parentRef: null,
                    },
                    {
                      kind: "attachment",
                      ref: { libraryId: 1, key: "CHILD" },
                      parentRef: { libraryId: 1, key: "PARENT" },
                    },
                  ],
                  hasMore: true,
                  nextCursor: "opaque",
                };
          }
          return {
            items: [
              {
                kind: "regular",
                ref: { libraryId: 1, key: "CCC" },
                parentRef: null,
              },
            ],
            hasMore: false,
          };
        },
      },
    };
    const selected = await resolveLiteratureBundleParents({
      host,
      mode: "selection",
      selectionContext: lockSelection([
        {
          kind: "parent",
          ref: { libraryId: 1, key: "BBB" },
          itemType: "journalArticle",
        },
        {
          kind: "parent",
          ref: { libraryId: 1, key: "AAA" },
          itemType: "journalArticle",
        },
      ]),
    });
    assert.deepEqual(
      selected.map((item: any) => item.ref.key),
      ["BBB", "AAA"],
    );
    const collection = await resolveLiteratureBundleParents({
      host,
      mode: "collection",
      targetCollection: "1:COLL",
    });
    assert.deepEqual(
      collection.map((item: any) => item.ref.key),
      ["AAA", "BBB"],
    );
    const library = await resolveLiteratureBundleParents({
      host,
      mode: "library",
    });
    assert.deepEqual(
      library.map((item: any) => item.ref.key),
      ["CCC"],
    );
    assert.deepEqual(calls[0].collectionRef, { libraryId: 1, key: "COLL" });
    assert.equal(calls[1].cursor, "opaque");
  });

  for (const interactionMode of ["interactive", "non_interactive"] as const) {
    for (const sourceOnly of [false, true]) {
      it(`exports readable files through the declared ${interactionMode} hook (sourceOnly=${sourceOnly})`, async function () {
        setZoteroLibrarySourcePageQueryAdapterForTests(
          createMockZoteroLibrarySourcePageQueryAdapter(),
        );
        const root = await mkTempDir("literature-export-resources");
        const targetPath = joinPath(root, "product.zip");
        const pdfPath = joinPath(root, "paper.pdf");
        const pdf = "%PDF-1.4\nsynthetic bundle source";
        await writeUtf8(pdfPath, pdf);
        const parent = await handlers.item.createFromJson({
          libraryID: Zotero.Libraries.userLibraryID,
          itemJson: { itemType: "journalArticle", title: "Bundle fixture" },
        });
        await handlers.attachment.createFromPath({
          parent,
          path: pdfPath,
          title: "Original PDF",
          mimeType: "application/pdf",
        });
        const note = await handlers.parent.addNote(parent, {
          content: "<div><p>Bundle note</p></div>",
        });
        const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
        const image = await Zotero.Attachments.importEmbeddedImage({
          blob: new Blob([imageBytes], { type: "image/png" }),
          parentItemID: note.id,
        });
        await handlers.note.update(note, {
          content: `<div><p>Bundle note</p><img data-attachment-key="${image.key}"></div>`,
        });
        const bound = await bindLiteratureBundleHost(
          createWorkflowHostApi({ interactionMode }),
          "export-literature-bundle",
        );
        let pickerCalls = 0;
        let progressCreated = 0;
        let progressClosed = 0;
        const progressUpdates: Array<{ text?: string; progress?: number }> = [];
        const phases: string[] = [];
        const host = {
          ...bound.host,
          notifications: {
            ...bound.host.notifications,
            createProgress() {
              progressCreated++;
              assert.equal(interactionMode, "interactive");
              return {
                update(update: { text?: string; progress?: number }) {
                  progressUpdates.push(update);
                },
                close() {
                  progressClosed++;
                },
              };
            },
          },
          logging: {
            appendRuntimeLog(input: { phase?: string }) {
              if (input.phase) phases.push(input.phase);
            },
          },
          researchBundles: {
            ...bound.host.researchBundles,
            async materializePapers(
              ...args: Parameters<
                typeof bound.host.researchBundles.materializePapers
              >
            ) {
              const result = await bound.host.researchBundles.materializePapers(
                ...args,
              );
              const source = result.papers[0].attachments[0].metadata.file;
              if (source.state === "available")
                await writeUtf8(source.path, "changed original");
              return result;
            },
          },
          bibliography: bibliographyFixture("@article{fixture}\n"),
          file: {
            ...bound.host.file,
            async pickSaveFile() {
              pickerCalls += 1;
              return targetPath;
            },
          },
        };
        try {
          const result: any = await bound.workflow.hooks.applyResult({
            parent: null,
            manifest: bound.workflow.manifest,
            bundleReader: { readText: async () => "" },
            runResult: {
              resultJson: {
                parameter: { sourceOnly },
                selectionContext: parentSelection({
                  libraryId: parent.libraryID,
                  key: parent.key,
                }),
              },
            },
            runtime: {
              hostApi: host,
              hostApiVersion: 12,
              TextEncoder,
              TextDecoder,
            },
          });
          assert.equal(result.status, "completed");
          assert.isEmpty(result.warnings);
          assert.equal(pickerCalls, interactionMode === "interactive" ? 1 : 0);
          assert.equal(
            progressCreated,
            interactionMode === "interactive" ? 1 : 0,
          );
          assert.equal(progressClosed, progressCreated);
          if (interactionMode === "interactive") {
            assert.isAbove(progressUpdates.length, 0);
            assert.isTrue(
              progressUpdates.some((update) => update.progress === 100),
            );
          }
          assert.include(phases, "materialize");
          assert.include(phases, "archive");
          let archivePath = targetPath;
          if (interactionMode === "non_interactive") {
            assert.lengthOf(result.resourceOutputs, 1);
            const output = result.resourceOutputs[0];
            assert.equal(output.slotId, "bundle");
            assert.include(output.downloadCommand, output.fileId);
            archivePath = (await resolveHostBridgeFileDownload(output.fileId))
              .source.path;
          }
          await host.archive.withExtractedZip(
            { sourcePath: archivePath },
            {},
            async (archive) => {
              const manifest = JSON.parse(
                await archive.readText("manifest.json"),
              );
              if (sourceOnly) {
                assert.equal(
                  manifest.kind,
                  "zotero-agents-literature-bundle-source-only",
                );
                assert.lengthOf(manifest.items, 1);
                assert.sameMembers(archive.entries, [
                  "manifest.json",
                  "export-report.md",
                  manifest.items[0].path,
                ]);
                assert.deepEqual(
                  await archive.readBytes(manifest.items[0].path),
                  new TextEncoder().encode(pdf),
                );
              } else {
                assert.equal(result.schemaId, "literature_bundle.product");
                validateLiteratureProductManifest(manifest, archive.entries);
                await verifyLiteratureProductFiles(manifest, archive);
                assert.include(archive.entries, "index.md");
                assert.property(manifest.files, "index.md");
                const paper = manifest.papers[0];
                assert.equal(paper.primary_source.kind, "pdf");
                assert.deepEqual(
                  await archive.readBytes(paper.primary_source.path),
                  new TextEncoder().encode(pdf),
                );
                assert.lengthOf(paper.notes, 1);
                assert.lengthOf(paper.notes[0].images, 1);
                assert.deepEqual(
                  await archive.readBytes(paper.notes[0].images[0].path),
                  imageBytes,
                );
              }
            },
          );
        } finally {
          await bound.cleanup();
        }
      });
    }
  }

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
    const orphanPayload = JSON.parse(JSON.stringify(base));
    orphanPayload.papers[0].payloads[0].source_note_id = "missing";
    orphanPayload.papers[0].payloads[0].source_image_id = null;
    assert.throws(
      () => validateLiteratureProductManifest(orphanPayload, entries),
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

  it("rejects managed projections without HTML or embedded-image source evidence", async function () {
    const payloadCases = [
      {
        payload_type: "custom-markdown",
        format: "markdown",
        content: "# Custom",
      },
      {
        payload_type: "conversation-note-markdown",
        format: "markdown",
        content: "# Conversation",
      },
      {
        payload_type: "digest-markdown",
        format: "markdown",
        content: "# Digest",
      },
      {
        payload_type: "literature-score-json",
        format: "json",
        content: JSON.stringify(portableLiteratureScore),
      },
    ];
    let importCalls = 0;
    const node = () => ({
      style: {},
      appendChild() {},
      removeChild() {},
      firstChild: null,
    });
    const host: any = {
      resources: {
        async materializeFile() {
          return { ref: { kind: "workflow_resource", id: "unused" } };
        },
      },
      editor: {
        async openSession(args: any) {
          args.renderer.render({
            doc: {
              createElement: node,
              createElementNS: (_namespace: string, _tag: string) => node(),
            },
            root: node(),
            state: {},
            context: args.context,
            host: { convertLegacyArtifactSet },
          });
          return { saved: true, result: { confirmed: true } };
        },
      },
      researchBundles: {
        async importPapers() {
          importCalls += 1;
          throw new Error("managed projection without source was imported");
        },
      },
    };
    for (const payloadCase of payloadCases) {
      let error: any = null;
      try {
        await importLiteratureProductArchive({
          host,
          archive: {
            readText: async (path: string) => {
              if (path.endsWith("metadata.json")) {
                return JSON.stringify({
                  itemType: "journalArticle",
                  title: "Projection without source",
                });
              }
              if (path.endsWith("note.html")) return "<div>Visible note</div>";
              return payloadCase.content;
            },
          },
          manifest: {
            warnings: [],
            papers: [
              {
                logical_id: "paper-001",
                metadata_path: "papers/paper-001/metadata.json",
                attachments: [],
                notes: [
                  {
                    id: "n1",
                    htmlPath: "papers/paper-001/notes/n1/note.html",
                    images: [],
                  },
                ],
                payloads: [
                  {
                    id: "p1",
                    payload_type: payloadCase.payload_type,
                    format: payloadCase.format,
                    path: `papers/paper-001/payloads/${payloadCase.payload_type}.data`,
                    source_note_id: "n1",
                    source_image_id: null,
                    anchor_status: "present",
                  },
                ],
                related_paper_ids: [],
              },
            ],
          },
          target: { view: {}, libraryID: 1 },
        });
      } catch (caught) {
        error = caught;
      }
      assert.equal(error?.code, "legacy_artifact_requires_migration");
    }
    assert.equal(importCalls, 0);
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
            "payload.bin": { sizeBytes: 3, sha256: "b".repeat(64) },
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
              sizeBytes: bytes.length,
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
          hostApiVersion: 12,
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
          (entry.details as any)?.workflowId === "import-literature-bundle",
      ),
    );
  });

  for (const destination of [
    { parameter: { targetLibraryId: 1 }, valid: true },
    { parameter: { targetCollection: "1:DESTCOLL" }, valid: true },
    { parameter: {}, valid: false },
    { parameter: { targetLibraryId: 0 }, valid: false },
    { parameter: { targetCollection: "not-a-ref" }, valid: false },
    {
      parameter: { targetLibraryId: 1, targetCollection: "2:DESTCOLL" },
      valid: false,
    },
  ]) {
    it(`resolves a remote literature bundle destination ${JSON.stringify(destination.parameter)}`, async function () {
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
      const invoke = () =>
        applyLiteratureBundleImport({
          runResult: { resultJson: { parameter: destination.parameter } },
          runtime: {
            hostApiVersion: 12,
            hostApi: {
              interactionMode: "non_interactive",
              resources: {
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
                async materializeFile() {
                  assert.fail(
                    "metadata-only bundle must not materialize a file",
                  );
                },
              },
              researchBundles: {
                async importPapers(request: any) {
                  const paper = request.papers[0];
                  imported.push({
                    title: paper.item.fields.title,
                    libraryId: request.libraryId,
                    collections: paper.collectionRefs,
                  });
                  return {
                    schema: "zotero-agents.research-import.v1",
                    operationId: request.operationId,
                    libraryId: 1,
                    outcome: "complete",
                    papers: [
                      {
                        graphId: paper.graphId,
                        outcome: "committed",
                        itemRef: { libraryId: 1, key: "REMOTEIMPORT" },
                        revision: "revision:1",
                        consistencyGroupId: "group-0001",
                        noteRefs: [],
                        attachmentRefs: [],
                        receiptId: "receipt-1",
                      },
                    ],
                    receipts: [],
                    attempts: [],
                    counts: {
                      requested: 1,
                      reused: 0,
                      committed: 1,
                      failed: 0,
                      rolledBack: 0,
                      repairRequired: 0,
                      notStarted: 0,
                    },
                  };
                },
              },
              file: {
                async pickFile() {
                  pickerCalls += 1;
                  throw new Error("picker must not open");
                },
              },
              archive: {
                async withExtractedZip(
                  input: { sourcePath: string },
                  _control: any,
                  callback: any,
                ) {
                  openedPath = input.sourcePath;
                  return callback({
                    entries: ["manifest.json"],
                    readText: async () => JSON.stringify(manifest),
                    readBytes: async () => new Uint8Array(),
                    resolvePath: (entryPath: string) => entryPath,
                    measureEntries: async () => ({ files: {} }),
                  });
                },
              },
              context: createWorkflowHostApi({
                interactionMode: "non_interactive",
              }).context,
            },
          },
        });

      if (!destination.valid) {
        let failure: any;
        try {
          await invoke();
        } catch (error) {
          failure = error;
        }
        assert.equal(failure?.code, "import_failed");
        assert.equal(failure?.structuredResult?.warnings?.[0]?.stage, "target");
        assert.lengthOf(imported, 0);
        return;
      }
      const result = await invoke();
      assert.equal(pickerCalls, 0);
      assert.equal(openedPath, "/managed/uploads/remote-literature-bundle.zip");
      assert.equal(result.status, "completed");
      assert.equal(imported[0].title, "Remote Imported Bundle");
      assert.equal(imported[0].libraryId, 1);
      assert.deepEqual(
        imported[0].collections,
        destination.parameter.targetCollection
          ? [{ libraryId: 1, key: "DESTCOLL" }]
          : [],
      );
    });
  }

  it("imports Research Product metadata and source through the v2 adapter", async function () {
    const materialized: any[] = [];
    let importRequest: any = null;
    const host: any = {
      resources: {
        async materializeFile(args: any) {
          materialized.push(args);
          return {
            ref: {
              kind: "workflow_resource",
              id: `run:materialized:${materialized.length}`,
            },
          };
        },
      },
      researchBundles: {
        async importPapers(request: any) {
          importRequest = request;
          return {
            schema: "zotero-agents.research-import.v1",
            operationId: request.operationId,
            libraryId: 1,
            outcome: "complete",
            papers: [
              {
                graphId: "paper-001",
                outcome: "committed",
                itemRef: { libraryId: 1, key: "NEWPAPER" },
                revision: "revision:1",
                consistencyGroupId: "group-0001",
                noteRefs: [],
                attachmentRefs: [],
                receiptId: "receipt-1",
              },
            ],
            receipts: [],
            attempts: [],
            counts: {
              requested: 1,
              reused: 0,
              committed: 1,
              failed: 0,
              rolledBack: 0,
              repairRequired: 0,
              notStarted: 0,
            },
          };
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
      {
        bundleItemId: "paper-001",
        itemRef: { libraryId: 1, key: "NEWPAPER" },
      },
    ]);
    assert.equal(
      materialized[0].sourcePath,
      "/tmp/papers/paper-001/source.pdf",
    );
    assert.equal(materialized[0].contentType, "application/pdf");
    assert.deepEqual(importRequest.papers[0].attachments[0].source.main, {
      resourceRef: { kind: "workflow_resource", id: "run:materialized:1" },
      targetFilename: "source.pdf",
    });
    assert.notProperty(host, "items");
    assert.notProperty(host, "attachments");
  });

  it("preserves per-paper partial outcomes from the Research Bundle owner", async function () {
    const host: any = {
      resources: {
        async materializeFile() {
          assert.fail("metadata-only fixture must not materialize a file");
        },
      },
      researchBundles: {
        async importPapers(request: any) {
          return {
            schema: "zotero-agents.research-import.v1",
            operationId: request.operationId,
            libraryId: 1,
            outcome: "partial",
            papers: [
              {
                graphId: "paper-001",
                outcome: "committed",
                itemRef: { libraryId: 1, key: "COMMITTED" },
                revision: "revision:1",
                consistencyGroupId: "group-0001",
                noteRefs: [],
                attachmentRefs: [],
                receiptId: "receipt-1",
              },
              {
                graphId: "paper-002",
                outcome: "rolled_back",
                consistencyGroupId: "group-0002",
                attemptId: "attempt-2",
              },
            ],
            receipts: [],
            attempts: [],
            counts: {
              requested: 2,
              reused: 0,
              committed: 1,
              failed: 0,
              rolledBack: 1,
              repairRequired: 0,
              notStarted: 0,
            },
          };
        },
      },
    };
    const manifest = {
      schema_id: "research_bundle.product",
      schema_version: "2.0.0",
      papers: ["paper-001", "paper-002"].map((logical_id) => ({
        logical_id,
        metadata_path: `papers/${logical_id}/metadata.json`,
        source: null,
        payloads: [],
      })),
      warnings: [],
    };

    const result = await importResearchProductArchive({
      host,
      archive: {
        readText: async () =>
          JSON.stringify({ itemType: "journalArticle", title: "Paper" }),
      },
      manifest,
      target: { view: {}, libraryID: 1 },
    });

    assert.equal(result.status, "partial");
    assert.deepEqual(result.importedItems, [
      {
        bundleItemId: "paper-001",
        itemRef: { libraryId: 1, key: "COMMITTED" },
      },
    ]);
    assert.deepEqual(result.failedItems, [
      {
        bundleItemId: "paper-002",
        code: "rolled_back",
        attemptId: "attempt-2",
      },
    ]);
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
          hostApiVersion: 12,
          hostApi: {
            file: { pickFile: async () => "/tmp/valid-literature-bundle.zip" },
            archive: {
              withExtractedZip: async (
                _input: any,
                _control: any,
                callback: any,
              ) =>
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
          hostApiVersion: 12,
          hostApi: {
            file: { pickFile: async () => "/tmp/valid-literature-bundle.zip" },
            archive: {
              withExtractedZip: async (
                _input: any,
                _control: any,
                callback: any,
              ) =>
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
            resources: {
              getInput: () => null,
              getInputs: () => [],
              listOutputs: () => [],
              async materializeFile() {
                assert.fail("metadata-only bundle must not materialize a file");
              },
            },
            researchBundles: {
              async importPapers(request: any) {
                return {
                  schema: "zotero-agents.research-import.v1",
                  operationId: request.operationId,
                  libraryId: Zotero.Libraries.userLibraryID,
                  outcome: "failed",
                  papers: [
                    {
                      graphId: "i1",
                      outcome: "rolled_back",
                      consistencyGroupId: "group-0001",
                      attemptId: "attempt-1",
                    },
                  ],
                  receipts: [],
                  attempts: [],
                  counts: {
                    requested: 1,
                    reused: 0,
                    committed: 0,
                    failed: 0,
                    rolledBack: 1,
                    repairRequired: 0,
                    notStarted: 0,
                  },
                };
              },
            },
          },
        },
      });
    } catch (caught) {
      error = caught;
    }

    assert.instanceOf(error, Error);
    assert.equal(
      (error as any).code,
      "partial",
      String((error as any)?.message || error),
    );
    assert.equal((error as any).structuredResult?.importedItems.length, 0);
    assert.deepEqual((error as any).structuredResult?.failedItems, [
      {
        bundleItemId: "i1",
        code: "parent_import_failed",
        attemptId: "attempt-1",
      },
    ]);
  });

  it("round-trips metadata, stored content, note images, and repeated imports", async function () {
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroLibrarySourcePageQueryAdapter(),
    );
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
    const boundExportHost = await bindLiteratureBundleHost(
      createWorkflowHostApi(),
      "export-literature-bundle",
    );
    const host = boundExportHost.host as any;
    host.bibliography = bibliographyFixture(
      "@article{portable, title={Portable Round Trip}}\n",
    );
    const parentRef = {
      libraryId: parent.libraryID,
      key: parent.key,
    };
    const conversationWrite = await host.managedNotes.writeConversation({
      operationId: `fixture-conversation:${parent.key}`,
      target: { kind: "create", parentRef },
      content: { title: "Conversation", markdown: "# Portable conversation" },
    });
    assert.equal(conversationWrite.outcome, "committed");
    const noteRef = conversationWrite.result?.note.ref;
    assert.isOk(noteRef);
    const note = Zotero.Items.getByLibraryAndKey(
      noteRef.libraryId,
      noteRef.key,
    );
    assert.isOk(note);
    const embedded = await Zotero.Attachments.importEmbeddedImage({
      blob: new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
        type: "image/png",
      }),
      parentItemID: note.id,
    });
    await handlers.note.update(note, {
      content: note
        .getNote()
        .replace(
          /<\/div>\s*$/i,
          `<img data-attachment-key="${embedded.key}" alt="fixture"></div>`,
        ),
    });
    const analysisResult = await host.literatureArtifacts.applyAnalysis({
      operationId: `fixture-analysis:${parent.key}`,
      parentRef,
      digest: { markdown: "## Digest\n\nPortable digest content." },
      references: { schema: "source_reference_artifact.v1", references: [] },
      citationAnalysis: {
        schema: "citation_analysis_artifact.v1",
        meta: {
          language: "en",
          scope: { section_title: null, line_start: null, line_end: null },
          scope_source: null,
          scope_decision: {
            selection_reason: null,
            covered_sections: [],
            fallback_from: null,
            fallback_reason: null,
          },
          mapping_reliability: "normal",
          reference_extraction: { status: "completed" },
        },
        summary: "Citation analysis",
        timeline: {
          early: { summary: "", sourceReferenceIds: [] },
          mid: { summary: "", sourceReferenceIds: [] },
          recent: { summary: "", sourceReferenceIds: [] },
        },
        items: [],
        unresolved: [],
      },
    });
    assert.equal(
      analysisResult.outcome,
      "committed",
      JSON.stringify(analysisResult),
    );
    const scoreResult = await host.literatureArtifacts.upsertScore({
      operationId: `fixture-score:${parent.key}`,
      parentRef,
      score: portableLiteratureScore,
    });
    assert.equal(scoreResult.outcome, "committed", JSON.stringify(scoreResult));
    await handlers.parent.addNote(parent, {
      content: "<div><p>Ordinary note title and content</p></div>",
    });
    const relatedParent = await handlers.item.createFromJson({
      libraryID: Zotero.Libraries.userLibraryID,
      itemJson: { itemType: "book", title: "Portable Related Parent" },
    });
    await handlers.parent.addRelated(parent, relatedParent);
    await handlers.parent.addRelated(relatedParent, parent);

    const relatedParentRef = {
      libraryId: relatedParent.libraryID,
      key: relatedParent.key,
    };
    const parentDetail = await host.library.getItemDetail(parentRef);
    const relatedParentDetail =
      await host.library.getItemDetail(relatedParentRef);

    const built = await buildLiteratureProduct({
      host,
      parents: [parentDetail.item, relatedParentDetail.item],
      runtime: {
        hostApi: host,
        hostApiVersion: 12,
        TextEncoder,
        TextDecoder,
        Buffer,
      },
    });
    assert.equal(built.manifest.schema_id, "literature_bundle.product");
    assert.lengthOf(built.manifest.papers[0].attachments, 2);
    assert.notProperty(built.manifest.papers[0].notes[0], "payloads");
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
    const exportedPayloadTypes = [];
    for (const entry of built.entries.filter(
      (candidate: any) =>
        candidate.content?.kind === "file" &&
        candidate.name.includes("/notes/"),
    )) {
      const parsed = parseWorkbenchEmbeddedPayloadBytes(
        await readBytes(entry.content.sourcePath),
        { TextDecoder, Buffer },
      );
      if (parsed) exportedPayloadTypes.push(parsed.payloadType);
    }
    assert.sameMembers(exportedPayloadTypes, [
      "conversation-note-markdown",
      "digest-markdown",
      "references-json",
      "citation-analysis-json",
      "literature-score-json",
    ]);
    const bundlePath = joinPath(root, "portable.zip");
    await host.archive.writeZipAtomic({
      targetPath: bundlePath,
      entries: [
        {
          name: "manifest.json",
          content: { kind: "text", text: JSON.stringify(built.manifest) },
        },
        ...built.entries,
      ],
    });

    const boundImportHost = await bindLiteratureBundleHost(
      createWorkflowHostApi(),
      "import-literature-bundle",
    );
    await host.archive.withExtractedZip(
      { sourcePath: bundlePath },
      {},
      async (archive) => {
        const manifest = validateLiteratureProductManifest(
          JSON.parse(await archive.readText("manifest.json")),
          archive.entries,
        );
        await verifyLiteratureProductFiles(manifest, archive);
        const first = await importLiteratureProductArchive({
          host: boundImportHost.host,
          archive,
          manifest,
          target: {
            view: { libraryId: Zotero.Libraries.userLibraryID },
            libraryID: Zotero.Libraries.userLibraryID,
          },
        });
        const second = await importLiteratureProductArchive({
          host: boundImportHost.host,
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
        assert.lengthOf(first.importedItems, 2, JSON.stringify(first));
        assert.lengthOf(second.importedItems, 2, JSON.stringify(second));
        assert.notEqual(
          first.importedItems[0].itemRef.key,
          second.importedItems[0].itemRef.key,
        );
        const imported = Zotero.Items.getByLibraryAndKey(
          first.importedItems[0].itemRef.libraryId,
          first.importedItems[0].itemRef.key,
        )!;
        const importedRelated = Zotero.Items.getByLibraryAndKey(
          first.importedItems[1].itemRef.libraryId,
          first.importedItems[1].itemRef.key,
        )!;
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
        assert.notInclude(importedNote.getNote(), embedded.key);
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
      },
    );
    await boundImportHost.cleanup();
    await boundExportHost.cleanup();
  });

  it("converts recognized legacy bundle HTML through explicit paired confirmation", async function () {
    const fixture = legacyBundleImportFixture();
    const referencesNote = fixture.manifest.items[0].notes[0];
    const citationNote = fixture.manifest.items[0].notes[1];
    const references = {
      items: [
        {
          title: "Legacy bundle reference",
          authors: ["Legacy Author"],
          year: 2024,
          rawCitation: "Legacy Author. Legacy bundle reference. 2024.",
        },
      ],
    };
    const citation = {
      summary: "Legacy citation analysis",
      timeline: {
        early: { summary: "", sourceReferenceIds: [] },
        mid: { summary: "", sourceReferenceIds: [] },
        recent: { summary: "", sourceReferenceIds: [] },
      },
      items: [],
      unresolved: [],
    };
    // Both legacy payloads deliberately share one source note. The importer
    // must retain that note's visible content once and use an empty companion
    // note for the second canonical payload.
    fixture.manifest.items[0].notes = [referencesNote];
    const auxiliaryImagePath = "items/legacy/notes/references/auxiliary.png";
    referencesNote.images.push({
      id: "legacy-auxiliary",
      path: auxiliaryImagePath,
      metadata: { contentType: "image/png" },
    });
    fixture.bytes[auxiliaryImagePath] = new Uint8Array([9, 8, 7]);
    fixture.files[referencesNote.htmlPath] =
      `<div><p>Visible shared note</p><img data-attachment-key="legacy-auxiliary">${legacyBundlePayloadTag("references-json", references)}${legacyBundlePayloadTag("citation-analysis-json", citation)}<p data-zs-payload-anchor-container="1"><img data-attachment-key="legacy-payload" data-zs-payload-anchor="references-json"></p></div>`;
    delete fixture.files[citationNote.htmlPath];
    let editorOpened = 0;
    let importRequest: any = null;
    const host = {
      resources: {
        async materializeFile(args: any) {
          assert.equal(args.sourcePath, auxiliaryImagePath);
          return {
            ref: { kind: "workflow_resource", id: "auxiliary-image" },
          };
        },
      },
      editor: {
        async openSession(args: any) {
          editorOpened += 1;
          const node = () => ({
            style: {},
            appendChild() {},
            removeChild() {},
            firstChild: null,
          });
          args.renderer.render({
            doc: {
              createElement: node,
              createElementNS: (_namespace: string, _tag: string) => node(),
            },
            root: node(),
            state: {},
            context: args.context,
            host: { convertLegacyArtifactSet },
          });
          return { saved: true, result: { confirmed: true } };
        },
      },
      researchBundles: {
        async importPapers(request: any) {
          importRequest = request;
          return {
            outcome: "complete",
            papers: [
              {
                graphId: "legacy",
                outcome: "committed",
                itemRef: { libraryId: 1, key: "IMPORTED1" },
                revision: "revision:1",
                noteRefs: [],
                attachmentRefs: [],
                receiptId: "receipt:1",
              },
            ],
            receipts: [],
            attempts: [],
            counts: {
              requested: 1,
              reused: 0,
              committed: 1,
              failed: 0,
              rolledBack: 0,
              repairRequired: 0,
              notStarted: 0,
            },
          };
        },
      },
    };
    const result = await importLiteratureBundleArchive({
      host,
      archive: {
        resolvePath: (path: string) => path,
        async readText(path: string) {
          return fixture.files[path as keyof typeof fixture.files];
        },
        async readBytes(path: string) {
          return fixture.bytes[path as keyof typeof fixture.bytes];
        },
      },
      target: { view: { libraryId: 1 }, libraryID: 1 },
      manifest: fixture.manifest,
    });

    assert.equal(editorOpened, 1);
    assert.equal(result.status, "completed");
    assert.deepEqual(result.importedItems, [
      { bundleItemId: "legacy", itemRef: { libraryId: 1, key: "IMPORTED1" } },
    ]);
    assert.isOk(importRequest);
    const importedNotes = importRequest.papers[0].notes;
    assert.lengthOf(importedNotes, 2);
    assert.sameMembers(
      importedNotes.flatMap((note: any) =>
        note.payloads.map((payload: any) => payload.summary.payloadType),
      ),
      ["references-json", "citation-analysis-json"],
    );
    assert.isTrue(
      importedNotes.every(
        (note: any) => !note.content.value.includes("data-zs-payload"),
      ),
    );
    assert.lengthOf(importedNotes[0].content.embeddedImages, 1);
    assert.equal(
      importedNotes[0].content.embeddedImages[0].slot,
      "legacy-auxiliary",
    );
    assert.equal(
      importedNotes[0].content.embeddedImages[0].resourceRef.id,
      "auxiliary-image",
    );
    assert.lengthOf(
      importedNotes.filter((note: any) =>
        note.content.value.includes("Visible shared note"),
      ),
      1,
    );
    const citationNoteImport = importedNotes.find((note: any) =>
      note.payloads.some(
        (payload: any) =>
          payload.summary.payloadType === "citation-analysis-json",
      ),
    );
    assert.isOk(citationNoteImport);
    assert.equal(citationNoteImport.content.value, "");
    assert.deepEqual(citationNoteImport.content.embeddedImages, []);
  });

  it("fails closed before import when a legacy bundle conversion is canceled", async function () {
    const fixture = legacyBundleImportFixture();
    let imported = false;
    const host = {
      resources: {
        async materializeFile() {
          throw new Error("unexpected");
        },
      },
      editor: {
        async openSession() {
          return { saved: false, reason: "canceled" };
        },
      },
      researchBundles: {
        async importPapers() {
          imported = true;
          throw new Error("import must not run after cancellation");
        },
      },
    };
    let thrown: any = null;
    try {
      await importLiteratureBundleArchive({
        host,
        archive: {
          resolvePath: (path: string) => path,
          async readText(path: string) {
            return fixture.files[path as keyof typeof fixture.files];
          },
          async readBytes(path: string) {
            return fixture.bytes[path as keyof typeof fixture.bytes];
          },
        },
        target: { view: { libraryId: 1 }, libraryID: 1 },
        manifest: fixture.manifest,
      });
    } catch (error) {
      thrown = error;
    }
    assert.equal(thrown?.code, "legacy_artifact_requires_migration");
    assert.isFalse(imported);
  });

  it("fails closed before import when a recognized legacy PNG is damaged", async function () {
    const fixture = legacyBundleImportFixture();
    const referencesNote = fixture.manifest.items[0].notes[0];
    const referencesPath = referencesNote.htmlPath;
    const imagePath = referencesNote.images[0].path;
    fixture.files[referencesPath] =
      '<div><p>Visible references</p><p data-zs-payload-anchor-container="1"><img data-attachment-key="legacy-payload" data-zs-payload-anchor="references-json"></p></div>';
    fixture.bytes[imagePath] = new Uint8Array([1, 2, 3]);
    let imported = false;
    const host = {
      resources: {
        async materializeFile() {
          throw new Error("unexpected");
        },
      },
      editor: {
        async openSession(args: any) {
          const node = () => ({
            style: {},
            appendChild() {},
            removeChild() {},
            firstChild: null,
          });
          args.renderer.render({
            doc: {
              createElement: node,
              createElementNS: (_namespace: string, _tag: string) => node(),
            },
            root: node(),
            state: {},
            context: args.context,
            host: { convertLegacyArtifactSet },
          });
          return { saved: true, result: { confirmed: true } };
        },
      },
      researchBundles: {
        async importPapers() {
          imported = true;
          throw new Error("import must not run for damaged payload");
        },
      },
    };
    let thrown: any = null;
    try {
      await importLiteratureBundleArchive({
        host,
        archive: {
          resolvePath: (path: string) => path,
          async readText(path: string) {
            return fixture.files[path as keyof typeof fixture.files];
          },
          async readBytes(path: string) {
            return fixture.bytes[path as keyof typeof fixture.bytes];
          },
        },
        target: { view: { libraryId: 1 }, libraryID: 1 },
        manifest: fixture.manifest,
      });
    } catch (error) {
      thrown = error;
    }
    assert.equal(thrown?.code, "legacy_artifact_requires_migration");
    assert.isFalse(imported);
  });

  it("maps a failed consistency group while preserving an independent commit", async function () {
    const baseHost = createWorkflowHostApi();
    let materialized = 0;
    const host = {
      ...baseHost,
      resources: {
        async materializeFile() {
          materialized += 1;
          return {
            ref: {
              kind: "workflow_resource" as const,
              id: `failure-fixture:${materialized}`,
            },
          };
        },
      },
      researchBundles: {
        async importPapers(request: any) {
          const committed = await handlers.item.createFromJson({
            libraryID: Zotero.Libraries.userLibraryID,
            itemJson: { itemType: "book", title: "Continue Parent" },
          });
          return {
            schema: "zotero-agents.research-import.v1",
            operationId: request.operationId,
            libraryId: Zotero.Libraries.userLibraryID,
            outcome: "partial",
            papers: [
              {
                graphId: "i1",
                outcome: "rolled_back",
                consistencyGroupId: "group-0001",
                attemptId: "attempt-1",
              },
              {
                graphId: "i2",
                outcome: "committed",
                consistencyGroupId: "group-0002",
                itemRef: {
                  libraryId: committed.libraryID,
                  key: committed.key,
                },
                revision: "revision:2",
                noteRefs: [],
                attachmentRefs: [],
                receiptId: "receipt-2",
              },
            ],
            receipts: [],
            attempts: [],
            counts: {
              requested: 2,
              reused: 0,
              committed: 1,
              failed: 0,
              rolledBack: 1,
              repairRequired: 0,
              notStarted: 0,
            },
          };
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
      {
        bundleItemId: "i1",
        code: "parent_import_failed",
        attemptId: "attempt-1",
      },
    ]);
    assert.equal(result.importedItems[0].bundleItemId, "i2");
    assert.deepEqual(result.importedItems[0].itemRef, {
      libraryId: Zotero.Libraries.userLibraryID,
      key: result.importResult.papers[1].itemRef.key,
    });
  });
});

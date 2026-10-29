import { assert } from "chai";
import { createWorkflowPreparedImageScope } from "../../../../src/workflows/workflowNoteImagePreparation";
import { createZoteroHostCapabilityBroker } from "../../../../src/modules/zoteroHostCapabilityBroker";
import { systemE2ECase } from "../../systemE2ECases";
import { largeManagedCitation } from "../../../fixtures/largeManagedCitation";
import {
  createWorkflowHostApi,
  createBoundWorkflowResearchBundleApi,
} from "../../../../src/workflows/hostApi";
import { createHostBridgeWorkflowResourceApi } from "../../../../src/modules/hostBridge/workflow/hostBridgeWorkflowResources";
import { loadWorkflowManifests } from "../../../../src/workflows/loader";
import { lockSelection } from "../../../../src/modules/selectionContext";
import {
  getConfiguredContentFeedUrls,
  installContentPackageFromFeed,
} from "../../../../src/modules/workflow/catalog/contentPackageSubscription";
import { clearPref, getPref, setPref } from "../../../../src/utils/prefs";
import { setDebugModeOverrideForTests } from "../../../../src/modules/debugMode";
import { readDiagnosticsEnv } from "../../testDiagnosticsOutput";
import { joinPath, mkTempDir } from "../../workflow-test-utils";
import {
  verifyLiteratureProductFiles,
  validateLiteratureProductManifest,
  importLiteratureProductArchive,
} from "../../../../workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs";
import { parseEmbeddedNotePayloadBlock } from "../../../../src/modules/zoteroHost/notePayloadCodec";

describe("Note image atomic apply E2E", function () {
  this.timeout(60_000);
  systemE2ECase(
    "note-image-apply-01",
    undefined,
    "commits prepared worker output with the note body and replays once",
    async function () {
      const parent = new Zotero.Item("journalArticle");
      const scope = createWorkflowPreparedImageScope({
        runScopeId: `image-e2e-${Date.now()}`,
      });
      try {
        parent.setField("title", "Synthetic note image apply");
        await parent.saveTx();
        const image = await scope.owner.prepareForNoteEmbedding({
          source: {
            kind: "base64",
            data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          },
        });
        const broker = createZoteroHostCapabilityBroker();
        const callerScope = {
          ownerId: "note-image-e2e",
          preparedImages: scope,
        };
        const request = {
          operationId: `note-image-e2e-${Date.now()}`,
          placement: {
            kind: "child" as const,
            parentRef: { libraryId: parent.libraryID, key: parent.key },
          },
          content: {
            format: "html" as const,
            value:
              '<div><p>Synthetic body</p><img data-zotero-agents-image-slot="hero" alt="Hero"></div>',
            embeddedImages: [
              { slot: "hero", preparedImage: image.ref, altText: "Hero" },
            ],
          },
        };
        const first = await broker.notes.create(request, callerScope);
        assert.equal(first.outcome, "committed");
        assert.deepEqual(
          await broker.notes.create(request, callerScope),
          first,
        );
        if (first.outcome !== "committed")
          throw new Error("note was not committed");
        const result = first.result.note as {
          ref: { libraryId: number; key: string };
        };
        const note = Zotero.Items.getByLibraryAndKey(
          result.ref.libraryId,
          result.ref.key,
        );
        assert.include(note.getNote(), "Synthetic body");
        const attachmentKey = note
          .getNote()
          .match(/data-attachment-key="([A-Z0-9]+)"/)?.[1];
        assert.isString(attachmentKey);
        const embedded = Zotero.Items.getByLibraryAndKey(
          parent.libraryID,
          attachmentKey!,
        );
        assert.equal(embedded.parentID, note.id);
        assert.equal(embedded.attachmentContentType, "image/jpeg");
        assert.isTrue(await IOUtils.exists(await embedded.getFilePathAsync()));
      } finally {
        scope.dispose();
        if (parent.id) await Zotero.Items.trashTx([parent.id]);
      }
    },
  );
  systemE2ECase(
    "note-image-apply-02",
    undefined,
    "exports large managed notes and multiple images twice with immediate cleanup",
    async function () {
      this.timeout(180_000);
      const parent = new Zotero.Item("journalArticle");
      const ownerId = `large-note-e2e-${Date.now()}`;
      const scope = createWorkflowPreparedImageScope({ runScopeId: ownerId });
      const previousChannel = getPref("contentFeedChannel");
      const previousMirror = getPref("contentDevFeedMirrorUrl");
      const root = await mkTempDir("large-note-export-e2e");
      const channel = readDiagnosticsEnv("ZOTERO_TEST_CONTENT_CHANNEL");
      let contentSettingsChanged = false;
      try {
        let workflowRoot = readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR");
        if (channel) {
          assert.oneOf(channel, ["stable", "beta", "dev"]);
          const expectedVersion = readDiagnosticsEnv(
            "ZOTERO_TEST_CONTENT_VERSION",
          );
          assert.isNotEmpty(expectedVersion);
          contentSettingsChanged = true;
          if (channel === "dev") {
            setDebugModeOverrideForTests(true);
            const primary = getConfiguredContentFeedUrls("dev").find(
              (source) => source.kind === "primary",
            )!;
            setPref("contentDevFeedMirrorUrl", primary.url);
          }
          setPref("contentFeedChannel", channel);
          const installed = await installContentPackageFromFeed({
            channel: channel as "stable" | "beta" | "dev",
          });
          if (!installed.ok)
            throw new Error(
              `content_install:${installed.code}:${installed.message}`,
            );
          assert.equal(installed.installed.package.version, expectedVersion);
          assert.equal(installed.installed.package.channel, channel);
          workflowRoot = installed.status.officialWorkflowDir;
        }
        const loaded = await loadWorkflowManifests(workflowRoot);
        const workflow = loaded.workflows.find(
          (entry) => entry.manifest.id === "export-literature-bundle",
        );
        assert.isOk(workflow, loaded.errors.join(" | "));
        const importWorkflow = loaded.workflows.find(
          (entry) => entry.manifest.id === "import-literature-bundle",
        );
        assert.isOk(importWorkflow, loaded.errors.join(" | "));
        parent.setField("title", "Synthetic large managed note export");
        await parent.saveTx();
        const parentRef = { libraryId: parent.libraryID, key: parent.key };
        const image = await scope.owner.prepareForNoteEmbedding({
          source: {
            kind: "base64",
            data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          },
          options: { preserveSourceBytes: true },
        });
        const baseHost = createWorkflowHostApi({
          ownerId,
          preparedImages: scope,
        });
        const { references, citation } = largeManagedCitation();
        const markdown = "Complete digest. ".repeat(4000).trim();
        const matchingMetadata = {
          schema: "literature_matching_metadata.v1",
          value: "retained",
        };
        const applied = await baseHost.literatureArtifacts.applyAnalysis({
          operationId: ownerId,
          parentRef,
          digest: {
            markdown,
            representativeImage: {
              preparedImage: image.ref,
              altText: "Figure",
            },
          },
          references,
          citationAnalysis: citation,
          matchingMetadata,
        });
        assert.equal(applied.outcome, "committed");
        if (applied.outcome !== "committed")
          throw new Error("managed apply failed");
        assert.deepEqual(
          applied.result.notes.find((note) => note.noteKind === "digest")
            ?.payload,
          { markdown },
        );
        const updated = await baseHost.literatureArtifacts.applyAnalysis({
          operationId: `${ownerId}-update`,
          parentRef,
          digest: {
            markdown,
            representativeImage: {
              preparedImage: image.ref,
              altText: "Figure",
            },
          },
        });
        assert.equal(updated.outcome, "committed");
        const digest = applied.result.notes.find(
          (note) => note.noteKind === "digest",
        )!;
        const metadata = await baseHost.library.getNotePayload(digest.ref, {
          payloadType: "literature-matching-metadata-json",
        });
        assert.deepEqual(metadata.value, matchingMetadata);
        const nativeDigest = Zotero.Items.getByLibraryAndKey(
          digest.ref.libraryId,
          digest.ref.key,
        );
        const historicalHtml = nativeDigest
          .getNote()
          .replace(
            /<img\b[^>]*data-zs-payload-anchor="literature-matching-metadata-json"[^>]*>/giu,
            "",
          );
        nativeDigest.setNote(historicalHtml);
        await nativeDigest.saveTx();
        const nativeReferences = Zotero.Items.getByLibraryAndKey(
          parentRef.libraryId,
          applied.result.notes.find((note) => note.noteKind === "references")!
            .ref.key,
        );
        const referencesHtml = nativeReferences
          .getNote()
          .replace(
            /<img\b[^>]*data-zs-payload-anchor="references-json"[^>]*>/giu,
            "",
          )
          .replace(/\sdata-zs-note-kind="[^"]*"/giu, "");
        nativeReferences.setNote(referencesHtml);
        await nativeReferences.saveTx();
        const badNote = new Zotero.Item("note");
        badNote.parentID = parent.id;
        badNote.setNote(
          '<div data-zs-note-kind="literature-score"><p>Recoverable score body</p></div>',
        );
        await badNote.saveTx();
        for (let index = 0; index < 24; index += 1) {
          const note = await baseHost.notes.create({
            operationId: `${ownerId}-image-${index}`,
            placement: { kind: "child", parentRef },
            content: {
              format: "html",
              value: '<p>Image</p><img data-zotero-agents-image-slot="figure">',
              embeddedImages: [{ slot: "figure", preparedImage: image.ref }],
            },
          });
          assert.equal(note.outcome, "committed");
        }
        for (let run = 0; run < 2; run += 1) {
          const resources = await createHostBridgeWorkflowResourceApi({
            workflowId: workflow!.manifest.id,
            runId: `${ownerId}-${run}`,
            manifest: workflow!.manifest,
            inputs: {},
            outputBindings: {},
          });
          const stagedPaths: string[] = [];
          const trackResources = (owned: typeof resources) => ({
            ...owned,
            async materializeFile(
              input: Parameters<typeof resources.materializeFile>[0],
            ) {
              const resource = await owned.materializeFile(input);
              stagedPaths.push(resource.path);
              return resource;
            },
          });
          const trackedResources = trackResources(resources);
          let importResources: typeof resources | undefined;
          const targetPath = joinPath(root, `bundle-${run}.zip`);
          const host = {
            ...baseHost,
            resources: trackedResources,
            researchBundles: createBoundWorkflowResearchBundleApi({
              ownerId,
              images: scope.owner,
              preparedImages: scope,
              resources: trackedResources,
            }),
            file: { ...baseHost.file, pickSaveFile: async () => targetPath },
          };
          try {
            const result = await workflow!.hooks.applyResult({
              parent: null,
              manifest: workflow!.manifest,
              bundleReader: { readText: async () => "" },
              runResult: {
                resultJson: {
                  parameter: {},
                  selectionContext: lockSelection([
                    {
                      kind: "parent",
                      ref: parentRef,
                      itemType: "journalArticle",
                    },
                  ]),
                },
              },
              runtime: {
                hostApi: host,
                hostApiVersion: 12,
                TextEncoder,
                TextDecoder,
              },
            });
            assert.equal(result.status, "partial");
            await host.archive.withExtractedZip(
              { sourcePath: targetPath },
              {},
              async (archive) => {
                const manifest = JSON.parse(
                  await archive.readText("manifest.json"),
                );
                await verifyLiteratureProductFiles(manifest, archive);
                assert.include(
                  await archive.readText("export-report.md"),
                  badNote.key,
                );
                const recoveryPaths = Object.keys(manifest.files).filter(
                  (path) => path.startsWith("recovery/"),
                );
                assert.isNotEmpty(recoveryPaths);
                assert.isTrue(
                  (
                    await Promise.all(
                      recoveryPaths
                        .filter((path) => path.endsWith(".html"))
                        .map((path) => archive.readText(path)),
                    )
                  ).some((body) => body.includes("Recoverable score body")),
                );
                const paper = manifest.papers[0];
                const payload = paper.payloads.find(
                  (entry: { payload_type: string }) =>
                    entry.payload_type === "citation-analysis-json",
                );
                assert.deepEqual(
                  JSON.parse(await archive.readText(payload.path)),
                  citation,
                );
                const auxiliaryValues = [];
                for (const note of paper.notes) {
                  for (const image of note.images) {
                    const block = parseEmbeddedNotePayloadBlock(
                      await archive.readBytes(image.path),
                    );
                    if (
                      block?.payloadType === "literature-matching-metadata-json"
                    ) {
                      auxiliaryValues.push(block.payload);
                    }
                  }
                }
                assert.deepEqual(auxiliaryValues, [matchingMetadata]);
                assert.equal(nativeDigest.getNote(), historicalHtml);
                assert.equal(nativeReferences.getNote(), referencesHtml);
                assert.isAtLeast(
                  paper.notes.flatMap(
                    (note: { images: unknown[] }) => note.images,
                  ).length,
                  25,
                );
                importResources = await createHostBridgeWorkflowResourceApi({
                  workflowId: importWorkflow!.manifest.id,
                  runId: `${ownerId}-${run}-import`,
                  manifest: importWorkflow!.manifest,
                  inputs: {},
                  outputBindings: {},
                });
                const trackedImportResources = trackResources(importResources);
                const importHost = {
                  ...baseHost,
                  resources: trackedImportResources,
                  researchBundles: createBoundWorkflowResearchBundleApi({
                    ownerId,
                    images: scope.owner,
                    preparedImages: scope,
                    resources: trackedImportResources,
                  }),
                };
                const imported = await importLiteratureProductArchive({
                  host: importHost,
                  archive,
                  manifest: validateLiteratureProductManifest(
                    manifest,
                    archive.entries,
                  ),
                  target: {
                    view: { libraryId: parent.libraryID },
                    libraryID: parent.libraryID,
                  },
                });
                assert.lengthOf(imported.importedItems, 1);
                try {
                  const importedRef = imported.importedItems[0].itemRef;
                  const notes = await host.library.getItemNotes(importedRef, {
                    limit: 100,
                  });
                  const details = await Promise.all(
                    notes.notes.map((note) =>
                      host.library.getNoteDetail(note.ref, { format: "html" }),
                    ),
                  );
                  assert.isTrue(
                    details.some(
                      (note) =>
                        note.kind === "managed" &&
                        note.noteKind === "references",
                    ),
                  );
                  assert.isFalse(
                    details.some(
                      (note) =>
                        note.kind === "managed" &&
                        note.noteKind === "literature-score",
                    ),
                  );
                } finally {
                  await Zotero.Items.trashTx(
                    imported.importedItems.map(
                      (entry) =>
                        Zotero.Items.getByLibraryAndKey(
                          entry.itemRef.libraryId,
                          entry.itemRef.key,
                        ).id,
                    ),
                  );
                }
              },
            );
          } finally {
            await Promise.all([
              resources.cleanup(),
              importResources?.cleanup(),
            ]);
          }
          assert.isAtLeast(stagedPaths.length, 25);
          for (const path of stagedPaths)
            assert.isFalse(await IOUtils.exists(path));
          await IOUtils.remove(targetPath);
        }
      } finally {
        scope.dispose();
        if (contentSettingsChanged) {
          if (previousChannel === undefined) clearPref("contentFeedChannel");
          else setPref("contentFeedChannel", previousChannel);
          if (channel === "dev") {
            if (previousMirror === undefined)
              clearPref("contentDevFeedMirrorUrl");
            else setPref("contentDevFeedMirrorUrl", previousMirror);
            setDebugModeOverrideForTests();
          }
        }
        if (parent.id) await Zotero.Items.trashTx([parent.id]);
        await IOUtils.remove(root, { recursive: true });
      }
    },
  );
});

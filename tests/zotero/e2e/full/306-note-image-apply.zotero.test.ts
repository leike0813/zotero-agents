import { assert } from "chai";
import { createWorkflowPreparedImageScope } from "../../../../src/workflows/workflowNoteImagePreparation";
import { createZoteroHostCapabilityBroker } from "../../../../src/modules/zoteroHostCapabilityBroker";
import { systemE2ECase } from "../../systemE2ECases";

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
});

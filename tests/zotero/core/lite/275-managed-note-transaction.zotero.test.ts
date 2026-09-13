import { assert } from "chai";
import { createZoteroHostCapabilityBroker } from "../../../../src/modules/zoteroHostCapabilityBroker";
import { getZoteroManagedNoteLocalControl } from "../../../../src/modules/zoteroHost/zoteroManagedNotes";
import {
  encodeBase64Utf8,
  WORKBENCH_EMBEDDED_PAYLOAD_MARKER,
} from "../../../../src/modules/zoteroHost/notePayloadCodec";
import { runtimePathExists } from "../../../../src/modules/runtimePersistence";
import {
  createLiteratureArtifactMigrationHostFromZoteroBroker,
  createLiteratureArtifactMigrationService,
  resetLiteratureArtifactMigrationRuntimeForTests,
} from "../../../../src/modules/literatureArtifactMigration";
import { resetPluginStateStoreForTests } from "../../../../src/modules/pluginStateStore";

function isRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: {
      __parity?: { runtime?: string };
    };
    IOUtils?: unknown;
    PathUtils?: unknown;
  };
  return (
    !!runtime.Zotero &&
    !!runtime.IOUtils &&
    !!runtime.PathUtils &&
    runtime.Zotero.__parity?.runtime !== "node-mock"
  );
}

const describeZotero = isRealZoteroRuntime() ? describe : describe.skip;

function operationId(label: string) {
  return `managed-note-transaction-${label}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

async function createParent(title: string) {
  const parent = new Zotero.Item("journalArticle");
  parent.setField("title", title);
  await parent.saveTx();
  return parent;
}

async function createLegacyNote(parent: Zotero.Item, content: string) {
  const note = new Zotero.Item("note");
  note.parentID = parent.id;
  note.setNote(content);
  await note.saveTx();
  return note;
}

async function createLegacyAttachmentPayloadNote(args: {
  parent: Zotero.Item;
  title: string;
  noteKind: "references" | "citation-analysis";
  payloadType: "references-json" | "citation-analysis-json";
  payload: unknown;
}) {
  const note = await createLegacyNote(
    args.parent,
    `<div><h1>${args.title}</h1></div>`,
  );
  const envelope = {
    schemaVersion: 1,
    kind: "zotero-skills-workbench-note-payload",
    noteKind: args.noteKind,
    payloadType: args.payloadType,
    payload: args.payload,
  };
  const png = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    ),
    (character) => character.charCodeAt(0),
  );
  const suffix = new TextEncoder().encode(
    `\n${WORKBENCH_EMBEDDED_PAYLOAD_MARKER}${encodeBase64Utf8(
      JSON.stringify(envelope),
    )}\n`,
  );
  const bytes = new Uint8Array(png.length + suffix.length);
  bytes.set(png);
  bytes.set(suffix, png.length);
  const attachment = await Zotero.Attachments.importEmbeddedImage({
    blob: new Blob([bytes], { type: "image/png" }),
    parentItemID: note.id,
  });
  note.setNote(
    `<div><h1>${args.title}</h1><p data-zs-payload-anchor-container="1"><img data-attachment-key="${attachment.key}" data-zs-payload-anchor="${args.payloadType}"></p></div>`,
  );
  await note.saveTx();
  return { note, attachment };
}

function parentRef(parent: Zotero.Item) {
  return { libraryId: parent.libraryID, key: parent.key };
}

function customEntry(title: string, markdown: string) {
  return {
    noteKind: "custom" as const,
    title,
    payload: { title, markdown },
  };
}

async function queryChildIds(parentId: number) {
  const rows = (await (Zotero.DB as any).queryAsync(
    "SELECT itemID FROM itemNotes WHERE parentItemID = ? ORDER BY itemID",
    [parentId],
  )) as Array<{ itemID: number }>;
  return rows.map((row) => Number(row.itemID));
}

describeZotero("managed note transaction in Zotero", function () {
  it("migrates a real legacy References and Citation pair through the Dashboard service", async function () {
    this.timeout(120000);
    const parent = await createParent("Dashboard migration transaction");
    const references = {
      items: [{ title: "A Study", year: 2024, authors: ["Ada Lovelace"] }],
    };
    const citation = {
      items: [
        {
          title: "A Study",
          year: 2024,
          authors: ["Ada Lovelace"],
          mentions: [{ rawCitation: "Lovelace (2024)" }],
        },
      ],
    };
    const legacyReferences = await createLegacyAttachmentPayloadNote({
      parent,
      title: "References",
      noteKind: "references",
      payloadType: "references-json",
      payload: references,
    });
    const legacyCitation = await createLegacyAttachmentPayloadNote({
      parent,
      title: "Citation Analysis",
      noteKind: "citation-analysis",
      payloadType: "citation-analysis-json",
      payload: citation,
    });
    try {
      const broker = createZoteroHostCapabilityBroker();
      const service = createLiteratureArtifactMigrationService({
        host: createLiteratureArtifactMigrationHostFromZoteroBroker(broker),
      });
      const preview = await service.scan({ libraryId: parent.libraryID });
      assert.isTrue(preview.ok);
      if (!preview.ok) throw new Error("expected migration preview");
      const candidate = preview.candidates.find(
        (entry) => entry.parentRef.key === parent.key,
      );
      assert.isOk(candidate);
      assert.equal(candidate?.classification, "ready");

      const result = await service.apply({
        scanOperationId: preview.operationId,
        candidateIds: [candidate!.candidateId],
      });
      assert.isTrue(result.ok);
      if (!result.ok) throw new Error("expected migration result");
      assert.equal(result.state, "completed");

      const control = getZoteroManagedNoteLocalControl(broker);
      const kinds = await Promise.all(
        (await queryChildIds(parent.id)).map(async (itemId) => {
          const note = Zotero.Items.get(itemId)!;
          const transfer = await control.readForTransfer({
            libraryId: note.libraryID,
            key: note.key,
          });
          return transfer.detail.kind === "managed"
            ? transfer.detail.noteKind
            : transfer.detail.kind;
        }),
      );
      assert.sameMembers(kinds, ["references", "citation-analysis"]);
      assert.isTrue(
        Boolean(Zotero.Items.get(legacyReferences.attachment.id)?.deleted),
      );
      assert.isTrue(
        Boolean(Zotero.Items.get(legacyCitation.attachment.id)?.deleted),
      );
    } finally {
      resetLiteratureArtifactMigrationRuntimeForTests();
      resetPluginStateStoreForTests();
      await Zotero.Items.trashTx([parent.id]);
    }
  });

  it("commits the private parent set and its payload attachment in one native transaction", async function () {
    this.timeout(120000);
    const parent = await createParent("Managed note transaction success");
    const db = Zotero.DB as any;
    const attachmentsApi = Zotero.Attachments as any;
    const originalStorageDirectory =
      attachmentsApi.getStorageDirectoryByLibraryAndKey;
    const preparedStoragePaths = new Set<string>();
    attachmentsApi.getStorageDirectoryByLibraryAndKey = function (
      ...args: any[]
    ) {
      const file = originalStorageDirectory.apply(this, args);
      const path = String(file?.path || "").trim();
      if (path) preparedStoragePaths.add(path);
      return file;
    };
    const originalExecuteTransaction = db.executeTransaction;
    let calls = 0;
    let depth = 0;
    let maxDepth = 0;
    db.executeTransaction = async function (
      run: () => Promise<unknown>,
      options?: unknown,
    ) {
      calls += 1;
      depth += 1;
      maxDepth = Math.max(maxDepth, depth);
      try {
        return await originalExecuteTransaction.call(this, run, options);
      } finally {
        depth -= 1;
      }
    };
    try {
      const broker = createZoteroHostCapabilityBroker();
      const result = await getZoteroManagedNoteLocalControl(
        broker,
      ).applyParentSet(
        {
          operationId: operationId("success"),
          parentRef: parentRef(parent),
          entries: [customEntry("Transaction success", "first managed note")],
        },
        { ownerId: "test-managed-note-transaction" },
      );
      assert.oneOf(result.outcome, ["committed", "unchanged"]);
      const childIds = await queryChildIds(parent.id);
      assert.lengthOf(childIds, 1);
      const note = Zotero.Items.get(childIds[0]);
      assert.isOk(note);
      assert.isTrue(note.isNote());
      const attachmentIds = note.getAttachments();
      assert.lengthOf(attachmentIds, 1);
      const attachment = Zotero.Items.get(attachmentIds[0]);
      assert.isOk(attachment);
      assert.isTrue(await runtimePathExists(String(attachment!.getFilePath())));
      assert.strictEqual(calls, 1);
      assert.strictEqual(maxDepth, 1);
    } finally {
      attachmentsApi.getStorageDirectoryByLibraryAndKey =
        originalStorageDirectory;
      db.executeTransaction = originalExecuteTransaction;
      await Zotero.Items.trashTx([parent.id]);
    }
  });

  it("retains canonical notes and settles one parent-set receipt when migration cleanup fails", async function () {
    this.timeout(120000);
    const parent = await createParent("Managed migration cleanup failure");
    const legacyNote = await createLegacyNote(
      parent,
      '<p data-zs-payload="references-json">legacy</p>',
    );
    try {
      const broker = createZoteroHostCapabilityBroker();
      const control = getZoteroManagedNoteLocalControl(broker);
      const transferred = await control.readLegacyForMigration({
        libraryId: parent.libraryID,
        key: legacyNote.key,
      });
      const op = operationId("cleanup-failure");
      const result = await control.applyParentSet(
        {
          operationId: op,
          parentRef: parentRef(parent),
          entries: [
            customEntry("Canonical after cleanup failure", "canonical"),
          ],
          migrationCleanup: {
            notes: [
              {
                ref: { libraryId: parent.libraryID, key: legacyNote.key },
                expectedRevision: transferred.revision,
                cleanHtml: "<p>cleaned</p>",
              },
            ],
            payloadRefs: [
              { libraryId: parent.libraryID, key: "MISSING-PAYLOAD" },
            ],
          },
        },
        { ownerId: "test-managed-note-transaction" },
      );
      assert.equal(result.outcome, "repair_required");
      assert.equal(result.attempt.error.code, "execution_failed");
      assert.equal(result.attempt.error.phase, "cleanup");
      assert.equal(result.attempt.operationId, op);

      const childIds = await queryChildIds(parent.id);
      assert.lengthOf(childIds, 2);
      const details = await Promise.all(
        childIds
          .filter((id) => id !== legacyNote.id)
          .map(async (id) => {
            const note = Zotero.Items.get(id);
            assert.isOk(note);
            return control.readForTransfer({
              libraryId: parent.libraryID,
              key: note!.key,
            });
          }),
      );
      assert.isTrue(
        details.some(
          (entry) =>
            entry.detail.kind === "managed" &&
            entry.detail.noteKind === "custom" &&
            entry.detail.payload &&
            typeof entry.detail.payload === "object" &&
            !Array.isArray(entry.detail.payload) &&
            entry.detail.payload.markdown === "canonical",
        ),
      );
      assert.equal(
        Zotero.Items.get(legacyNote.id)?.getNote(),
        '<p data-zs-payload="references-json">legacy</p>',
      );
    } finally {
      await Zotero.Items.trashTx([parent.id]);
    }
  });
});

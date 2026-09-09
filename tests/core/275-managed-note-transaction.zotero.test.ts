import { assert } from "chai";
import { createZoteroHostCapabilityBroker } from "../../src/modules/zoteroHostCapabilityBroker";
import { getZoteroManagedNoteLocalControl } from "../../src/modules/zoteroHost/zoteroManagedNotes";
import { runtimePathExists } from "../../src/modules/runtimePersistence";

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

async function queryExistingIds(ids: readonly number[]) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const rows = (await (Zotero.DB as any).queryAsync(
    `SELECT itemID FROM items WHERE itemID IN (${placeholders}) ORDER BY itemID`,
    [...ids],
  )) as Array<{ itemID: number }>;
  return rows.map((row) => Number(row.itemID));
}

describeZotero("managed note transaction in Zotero", function () {
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

  it("rolls back all notes and payload attachments when the second native note save fails", async function () {
    this.timeout(120000);
    const parent = await createParent("Managed note transaction rollback");
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
    const itemPrototype = (Zotero as any).Item.prototype;
    const saveOwner =
      typeof itemPrototype.save === "function"
        ? itemPrototype
        : (Zotero as any).DataObject.prototype;
    const originalSave = saveOwner.save;
    const originalExecuteTransaction = db.executeTransaction;
    const savedIds = new Set<number>();
    let transactionCalls = 0;
    let transactionDepth = 0;
    let nestedTransactions = 0;
    let secondBusinessNoteFailed = false;
    saveOwner.save = async function (this: any, options?: unknown) {
      if (this.isNote?.()) {
        const html = String(this.getNote?.() || "");
        if (html.includes("Rollback second")) {
          secondBusinessNoteFailed = true;
          throw new Error("test_second_native_note_save_failure");
        }
      }
      const result = await originalSave.call(this, options);
      if (this.isNote?.() || this.isAttachment?.()) {
        const id = Number(this.id);
        if (id > 0) savedIds.add(id);
      }
      return result;
    };
    db.executeTransaction = async function (
      run: () => Promise<unknown>,
      options?: unknown,
    ) {
      transactionCalls += 1;
      if (transactionDepth > 0) nestedTransactions += 1;
      transactionDepth += 1;
      try {
        return await originalExecuteTransaction.call(this, run, options);
      } finally {
        transactionDepth -= 1;
      }
    };
    try {
      const broker = createZoteroHostCapabilityBroker();
      const result = await getZoteroManagedNoteLocalControl(
        broker,
      ).applyParentSet(
        {
          operationId: operationId("rollback"),
          parentRef: parentRef(parent),
          entries: [
            customEntry("Rollback first", "first managed note"),
            customEntry("Rollback second", "second managed note"),
          ],
        },
        { ownerId: "test-managed-note-transaction" },
      );
      assert.equal(result.outcome, "failed");
      assert.equal(result.attempt.error.code, "execution_failed");
      assert.isTrue(secondBusinessNoteFailed);
      assert.strictEqual(transactionCalls, 1);
      assert.strictEqual(nestedTransactions, 0);

      // Read the database directly. The in-memory Zotero item cache may still
      // retain objects that participated in a rolled-back transaction.
      assert.deepEqual(await queryChildIds(parent.id), []);
      assert.deepEqual(await queryExistingIds([...savedIds]), []);
      assert.isNotEmpty(preparedStoragePaths);
      for (const path of preparedStoragePaths) {
        assert.isFalse(await runtimePathExists(path));
      }
    } finally {
      attachmentsApi.getStorageDirectoryByLibraryAndKey =
        originalStorageDirectory;
      saveOwner.save = originalSave;
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

import { assert } from "chai";
import { handlers } from "../../src/handlers";
import {
  createWorkflowHostLiveReadAdapters,
  createWorkflowHostApi,
  resetWorkflowHostApiForTests,
} from "../../src/workflows/hostApi";
import {
  inspectWorkflowHostContract,
  resolveWorkflowHostContractVersion,
  WORKFLOW_HOST_API_VERSION,
  type WorkflowHostContractVariant,
} from "../../src/workflows/workflowHostContract";
import { createNonInteractiveWorkflowHostApi } from "../../src/modules/hostBridgeWorkflowResources";
import type {
  WorkflowHostApi,
  WorkflowResourceApi,
} from "../../src/workflows/types";
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
import { createSynthesisClientFromPort } from "../../src/modules/synthesisClient/clientPortAdapter";
import {
  configureZoteroHostMutationRuntimeForTests,
  configureZoteroHostSnapshotRuntimeForTests,
  createZoteroHostCapabilityBroker,
  verifyLibraryTraversalCompletionEvidence,
  resetZoteroHostMutationRuntimeForTests,
  resetZoteroHostSnapshotRuntimeForTests,
  ZoteroHostCapabilityError,
} from "../../src/modules/zoteroHostCapabilityBroker";
import { withWorkflowLibraryItemSnapshot } from "../../src/workflows/hostApi";
import {
  assertStrictJsonValue,
  createFailClosedZoteroHostCapabilityBroker,
} from "../helpers/zoteroHostCapabilityBrokerHarness";
import {
  assertWorkflowHostStrictJsonValue,
  createWorkflowHostErrorData,
  type WorkflowHostErrorCode,
  type WorkflowHostErrorDetailsByCode,
} from "../../src/workflows/workflowHostErrorContract";

const HOST_BRIDGE_CONTEXT_GET_CURRENT_VIEW = "context.get_current_view";

async function createParentItem(title: string) {
  const item = new Zotero.Item("journalArticle");
  (item as any).version = 1;
  (item as any).dateAdded = "2026-04-27T00:00:00.000Z";
  (item as any).dateModified = "2026-04-27T00:00:00.000Z";
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
  (collection as any).version = 1;
  collection.name = name;
  (collection as any).libraryID = Zotero.Libraries.userLibraryID;
  await collection.saveTx();
  return collection;
}

async function expectBrokerError(
  operation: Promise<unknown>,
  code?: ZoteroHostCapabilityError["code"],
) {
  try {
    await operation;
    assert.fail("expected Broker operation to fail");
  } catch (error) {
    assert.instanceOf(error, ZoteroHostCapabilityError);
    if (code)
      assert.strictEqual((error as ZoteroHostCapabilityError).code, code);
    return error as ZoteroHostCapabilityError;
  }
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
    resetZoteroHostMutationRuntimeForTests();
    resetZoteroHostSnapshotRuntimeForTests();
    resetZoteroLibraryPageQueryAdapterForTests();
    resetWorkflowHostApiForTests();
    resetZoteroMcpServerForTests();
    setDefaultSynthesisClientCompositionFactoryForTests(null);
    await resetDefaultSynthesisClientForTests();
  });

  it("reserves canonical mutations once and replays the original confirmed result", async function () {
    let sequence = 0;
    configureZoteroHostMutationRuntimeForTests({
      randomId: () => `mutation-lifecycle-${++sequence}`,
    });
    const item = await createParentItem("Mutation Lifecycle Before");
    const broker = createZoteroHostCapabilityBroker();
    const request = {
      operation: "item.updateMetadata",
      operationId: "lifecycle-replay",
      itemRef: { libraryId: item.libraryID, key: item.key },
      patch: { fields: { title: "Mutation Lifecycle After" } },
    };

    const first = await (broker.mutations.execute as any)(request, {
      ownerId: "workflow-a",
    });
    const replay = await (broker.mutations.execute as any)(
      {
        ...request,
        patch: { fields: { title: "Mutation Lifecycle After" } },
      },
      { ownerId: "workflow-a" },
    );

    assert.strictEqual(first.outcome, "committed");
    assert.deepEqual(replay, first);
    assert.strictEqual(first.receipt.operationId, "lifecycle-replay");
    assert.strictEqual(first.receipt.operation, "item.updateMetadata");
    assert.match(first.receipt.effectDigest, /^sha256:/);
    assert.strictEqual(first.result.item.title, "Mutation Lifecycle After");
    assertStrictJsonValue(first);
  });

  it("routes note writes through the shared reservation, revision, and receipt authority", async function () {
    const parent = await createParentItem("Canonical Note Parent");
    const broker = createZoteroHostCapabilityBroker();
    const scope = { ownerId: "note-authority-test" };
    const createRequest = {
      operationId: "note-create-once",
      parentRef: { libraryId: parent.libraryID, key: parent.key },
      content: "<div><p>canonical note</p></div>",
    };

    const created = await broker.notes.create(createRequest, scope);
    const replay = await broker.notes.create(createRequest, scope);
    assert.strictEqual(created.outcome, "committed");
    assert.deepEqual(replay, created);
    if (created.outcome !== "committed") assert.fail("expected note creation");
    assert.strictEqual(created.receipt.operation, "notes.create");
    assert.lengthOf(created.receipt.changes, 1);

    const note = created.result.note as {
      ref: { libraryId: number; key: string };
      revision: string;
    };
    const updated = await broker.notes.updateContent(
      {
        operationId: "note-update-content",
        noteRef: note.ref,
        expectedRevision: note.revision,
        content: "<div><p>canonical note updated</p></div>",
      },
      scope,
    );
    assert.strictEqual(updated.outcome, "committed");

    const conflict = await broker.notes.updateContent(
      {
        operationId: "note-update-stale",
        noteRef: note.ref,
        expectedRevision: note.revision,
        content: "<div><p>must not overwrite</p></div>",
      },
      scope,
    );
    assert.strictEqual(conflict.outcome, "failed");
    if (conflict.outcome !== "failed")
      assert.fail("expected revision conflict");
    assert.strictEqual(conflict.attempt.error.code, "conflict");
    assert.strictEqual(
      conflict.attempt.error.recovery,
      "refresh_and_retry_new_operation",
    );
  });

  it("returns structured attempt evidence when an accepted note payload write cannot commit", async function () {
    const parent = await createParentItem("Canonical Payload Parent");
    const note = await handlers.parent.addNote(parent, {
      content: "<div><p>payload basis</p></div>",
    });
    const originalImport = Zotero.Attachments.importEmbeddedImage;
    Zotero.Attachments.importEmbeddedImage = async () => {
      throw new Error("payload attachment write failed");
    };
    try {
      const result =
        await createZoteroHostCapabilityBroker().notes.upsertPayload(
          {
            operationId: "payload-write-unknown",
            noteRef: { libraryId: note.libraryID, key: note.key },
            payloadType: "literature-matching-metadata-json",
            noteKind: "digest",
            payload: { schema: "literature_matching_metadata.v1" },
          },
          { ownerId: "note-payload-authority-test" },
        );

      assert.strictEqual(result.outcome, "unknown");
      if (result.outcome !== "unknown") assert.fail("expected unknown attempt");
      assert.strictEqual(result.attempt.error.code, "execution_failed");
      assert.strictEqual(result.attempt.error.recovery, "reconcile");
      assert.deepInclude(result.attempt.affectedRefs, {
        kind: "item",
        ref: { libraryId: note.libraryID, key: note.key },
      });
      assertStrictJsonValue(result);
    } finally {
      Zotero.Attachments.importEmbeddedImage = originalImport;
    }
  });

  it("records only verified collection membership deltas and compensates partial writes", async function () {
    const broker = createZoteroHostCapabilityBroker();
    const scope = { ownerId: "membership-authority-test" };
    const collection = await createCollection("Canonical Membership");
    const first = await createParentItem("Membership First");
    const second = await createParentItem("Membership Second");
    const collectionRef = {
      libraryId: collection.libraryID,
      key: collection.key,
    };
    const refs = [first, second].map((item) => ({
      libraryId: item.libraryID,
      key: item.key,
    }));

    const committed = await (broker.mutations.execute as any)(
      {
        operation: "collection.updateMembership",
        operationId: "membership-add",
        collectionRef,
        add: refs,
        remove: [],
      },
      scope,
    );
    assert.strictEqual(committed.outcome, "committed");
    assert.lengthOf(committed.receipt.changes, 3);
    assert.include(first.getCollections(), collection.id);
    assert.include(second.getCollections(), collection.id);

    const unchanged = await (broker.mutations.execute as any)(
      {
        operation: "collection.updateMembership",
        operationId: "membership-unchanged",
        collectionRef,
        add: refs,
        remove: [],
      },
      scope,
    );
    assert.strictEqual(unchanged.outcome, "unchanged");
    assert.lengthOf(unchanged.receipt.changes, 1);

    await handlers.collection.remove([first, second], collection);
    const originalAdd = handlers.collection.add;
    let writes = 0;
    handlers.collection.add = (async (...args: any[]) => {
      writes += 1;
      if (writes === 2) throw new Error("second membership write failed");
      return (originalAdd as any)(...args);
    }) as typeof handlers.collection.add;
    try {
      const failed = await (broker.mutations.execute as any)(
        {
          operation: "collection.updateMembership",
          operationId: "membership-compensate",
          collectionRef,
          add: refs,
          remove: [],
        },
        scope,
      );
      assert.strictEqual(failed.outcome, "failed");
      assert.strictEqual(failed.attempt.error.phase, "compensation");
      assert.notInclude(first.getCollections(), collection.id);
      assert.notInclude(second.getCollections(), collection.id);
    } finally {
      handlers.collection.add = originalAdd;
    }
  });

  it("routes stored attachment creation through canonical replay and preserves cleanup evidence", async function () {
    const parent = await createParentItem("Attachment Authority Parent");
    let creates = 0;
    const broker = createZoteroHostCapabilityBroker({
      async createStoredFile(_request, owner) {
        creates += 1;
        const attachment = new Zotero.Item("attachment");
        if (owner) attachment.parentID = owner.id;
        attachment.setField("title", "Authority Attachment");
        await attachment.saveTx();
        return attachment;
      },
    });
    const scope = { ownerId: "attachment-authority-test" };
    const request = {
      operationId: "attachment-create-once",
      placement: {
        kind: "child" as const,
        parentRef: { libraryId: parent.libraryID, key: parent.key },
      },
      source: {
        kind: "stored_file" as const,
        main: {
          source: { kind: "local_path" as const, path: "/source/paper.pdf" },
        },
      },
    };
    const created = await broker.attachments.create(request, scope);
    const replay = await broker.attachments.create(request, scope);
    assert.strictEqual(created.outcome, "committed");
    assert.deepEqual(replay, created);
    assert.strictEqual(creates, 1);
    assert.notInclude(JSON.stringify(created.receipt), "/source/paper.pdf");

    const collection = await createCollection("Attachment Rollback Target");
    const originalAdd = handlers.collection.add;
    const originalRemove = handlers.attachment.remove;
    handlers.collection.add = (async () => {
      throw new Error("attachment placement failed");
    }) as typeof handlers.collection.add;
    handlers.attachment.remove = (async () => {
      throw new Error("attachment rollback failed");
    }) as typeof handlers.attachment.remove;
    try {
      const repair = await broker.attachments.create(
        {
          operationId: "attachment-create-repair",
          placement: {
            kind: "top_level",
            collectionRefs: [
              { libraryId: collection.libraryID, key: collection.key },
            ],
          },
          source: request.source,
        },
        scope,
      );
      assert.strictEqual(repair.outcome, "repair_required");
      if (repair.outcome !== "repair_required") {
        assert.fail("expected attachment repair evidence");
      }
      assert.include(
        repair.attempt.error.message,
        "attachment placement failed",
      );
      assert.lengthOf(repair.attempt.residualRefs, 1);
    } finally {
      handlers.collection.add = originalAdd;
      handlers.attachment.remove = originalRemove;
    }
  });

  it("routes attachment update, replacement, move, and removal through confirmed authority results", async function () {
    const parent = await createParentItem("Attachment Operation Parent");
    const attachment = new Zotero.Item("attachment") as Zotero.Item & {
      attachmentLinkMode: number;
      getFilePathAsync: () => Promise<string>;
    };
    attachment.attachmentLinkMode = 2;
    attachment.setField("title", "Attachment Before");
    let attachmentPath = "/source/before.pdf";
    attachment.getFilePathAsync = async () => attachmentPath;
    await attachment.saveTx();
    const ref = { libraryId: attachment.libraryID, key: attachment.key };
    const scope = { ownerId: "attachment-operation-test" };
    const broker = createZoteroHostCapabilityBroker({
      async replaceFile(request, target) {
        if (request.source.kind !== "linked_file") {
          throw new Error("expected linked replacement");
        }
        attachmentPath = request.source.path;
        return target;
      },
    });

    const updated = await broker.attachments.updateMetadata(
      {
        operationId: "attachment-update",
        attachmentRef: ref,
        patch: { title: "Attachment After" },
      },
      scope,
    );
    assert.strictEqual(updated.outcome, "committed");
    if (updated.outcome !== "committed") assert.fail("expected update");

    const replaced = await broker.attachments.replaceFile(
      {
        operationId: "attachment-replace",
        attachmentRef: ref,
        expectedRevision: (updated.result.attachment as any).revision,
        source: { kind: "linked_file", path: "/source/after.pdf" },
      },
      scope,
    );
    assert.strictEqual(replaced.outcome, "committed");
    if (replaced.outcome !== "committed") assert.fail("expected replacement");
    assert.strictEqual((replaced.result as any).outcome, "replaced");

    const moved = await broker.attachments.move(
      {
        operationId: "attachment-move",
        attachmentRef: ref,
        expectedRevision: (replaced.result.attachment as any).revision,
        placement: {
          kind: "child",
          parentRef: { libraryId: parent.libraryID, key: parent.key },
        },
      },
      scope,
    );
    assert.strictEqual(moved.outcome, "committed");
    if (moved.outcome !== "committed") assert.fail("expected move");
    assert.strictEqual((moved.result as any).outcome, "moved");

    const removed = await broker.attachments.remove(
      {
        operationId: "attachment-remove",
        attachmentRef: ref,
        expectedRevision: (moved.result.attachment as any).revision,
        disposition: "permanent",
      },
      scope,
    );
    assert.strictEqual(removed.outcome, "committed");
    if (removed.outcome !== "committed") assert.fail("expected removal");
    assert.strictEqual((removed.result as any).outcome, "permanently_deleted");
    assert.strictEqual(removed.receipt.operation, "attachments.remove");
    assert.notInclude(JSON.stringify(removed.receipt), attachmentPath);
    assertStrictJsonValue(removed);
  });

  it("serializes identical in-progress submissions and rejects conflicting digests before another write", async function () {
    const item = await createParentItem("Mutation Reservation Before");
    const original = handlers.parent.updateMetadata;
    let writes = 0;
    let releaseWrite: (() => void) | null = null;
    const writeGate = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    handlers.parent.updateMetadata = (async (...args: any[]) => {
      writes += 1;
      await writeGate;
      return (original as any)(...args);
    }) as typeof handlers.parent.updateMetadata;
    const broker = createZoteroHostCapabilityBroker();
    const request = {
      operation: "item.updateMetadata",
      operationId: "concurrent-replay",
      itemRef: { libraryId: item.libraryID, key: item.key },
      patch: { fields: { title: "Mutation Reservation After" } },
    };

    try {
      const first = (broker.mutations.execute as any)(request, {
        ownerId: "workflow-a",
      });
      const replay = (broker.mutations.execute as any)(request, {
        ownerId: "workflow-a",
      });
      releaseWrite?.();
      const [firstResult, replayResult] = await Promise.all([first, replay]);
      assert.strictEqual(writes, 1);
      assert.deepEqual(replayResult, firstResult);

      try {
        await (broker.mutations.execute as any)(
          {
            ...request,
            patch: { fields: { title: "Conflicting Title" } },
          },
          { ownerId: "workflow-a" },
        );
        assert.fail("expected an idempotency conflict");
      } catch (error) {
        assert.instanceOf(error, ZoteroHostCapabilityError);
        assert.strictEqual(
          (error as ZoteroHostCapabilityError).code,
          "conflict",
        );
        assert.strictEqual(
          (error as ZoteroHostCapabilityError).details.reason,
          "idempotency_conflict",
        );
      }
      assert.strictEqual(item.getField("title"), "Mutation Reservation After");
    } finally {
      handlers.parent.updateMetadata = original;
      releaseWrite?.();
    }
  });

  it("returns confirmed unchanged evidence and a structured revision-CAS attempt", async function () {
    const item = await createParentItem("Mutation CAS");
    const broker = createZoteroHostCapabilityBroker();
    const ref = { libraryId: item.libraryID, key: item.key };
    const current = await broker.library.getItemDetail(ref);
    assert.isOk(current);

    const unchanged = await (broker.mutations.execute as any)(
      {
        operation: "item.updateMetadata",
        operationId: "unchanged-metadata",
        itemRef: ref,
        expectedRevision: (current as any).revision,
        patch: { fields: { title: "Mutation CAS" } },
      },
      { ownerId: "workflow-a" },
    );
    assert.strictEqual(unchanged.outcome, "unchanged");
    assert.strictEqual(unchanged.receipt.changes[0].effect, "unchanged");

    const conflict = await (broker.mutations.execute as any)(
      {
        operation: "item.updateMetadata",
        operationId: "stale-metadata",
        itemRef: ref,
        expectedRevision: "stale-revision",
        patch: { fields: { title: "Must Not Be Written" } },
      },
      { ownerId: "workflow-a" },
    );
    assert.strictEqual(conflict.outcome, "failed");
    assert.strictEqual(conflict.attempt.status, "failed");
    assert.strictEqual(conflict.attempt.error.code, "conflict");
    assert.strictEqual(conflict.attempt.error.phase, "read");
    assert.strictEqual(
      conflict.attempt.error.recovery,
      "refresh_and_retry_new_operation",
    );
    assert.strictEqual(item.getField("title"), "Mutation CAS");
    assertStrictJsonValue(conflict);
  });

  it("invalidates mutation reservations and receipts when the process runtime resets", async function () {
    const item = await createParentItem("Mutation Restart Before");
    const request = {
      operation: "item.updateMetadata",
      operationId: "restart-operation",
      itemRef: { libraryId: item.libraryID, key: item.key },
      patch: { fields: { title: "Mutation Restart First" } },
    };
    const first = await (
      createZoteroHostCapabilityBroker().mutations.execute as any
    )(request, { ownerId: "workflow-a" });
    resetZoteroHostMutationRuntimeForTests();
    const second = await (
      createZoteroHostCapabilityBroker().mutations.execute as any
    )(
      {
        ...request,
        patch: { fields: { title: "Mutation Restart Second" } },
      },
      { ownerId: "workflow-a" },
    );

    assert.strictEqual(first.outcome, "committed");
    assert.strictEqual(second.outcome, "committed");
    assert.notStrictEqual(second.receipt.receiptId, first.receipt.receiptId);
    assert.strictEqual(item.getField("title"), "Mutation Restart Second");
  });

  it("returns canceled, failed, unknown, and repair-required attempt evidence after reservation", async function () {
    const broker = createZoteroHostCapabilityBroker();
    const item = await createParentItem("Mutation Attempt Basis");
    const ref = { libraryId: item.libraryID, key: item.key };
    const base = {
      operation: "item.updateMetadata",
      itemRef: ref,
      patch: { fields: { title: "Mutation Attempt Target" } },
    };
    const controller = new AbortController();
    controller.abort();
    const canceled = await (broker.mutations.execute as any)(
      { ...base, operationId: "attempt-canceled" },
      { ownerId: "attempt-owner" },
      { signal: controller.signal },
    );
    assert.strictEqual(canceled.outcome, "canceled");
    assert.strictEqual(canceled.attempt.error.code, "canceled");

    const originalUpdate = handlers.parent.updateMetadata;
    try {
      handlers.parent.updateMetadata = (async () => {
        throw new Error("confirmed write failure");
      }) as typeof handlers.parent.updateMetadata;
      const failed = await (broker.mutations.execute as any)(
        { ...base, operationId: "attempt-failed" },
        { ownerId: "attempt-owner" },
      );
      assert.strictEqual(failed.outcome, "failed");
      assert.strictEqual(failed.attempt.error.phase, "commit");

      handlers.parent.updateMetadata = (async (target) =>
        target) as typeof handlers.parent.updateMetadata;
      const unknown = await (broker.mutations.execute as any)(
        { ...base, operationId: "attempt-unknown" },
        { ownerId: "attempt-owner" },
      );
      assert.strictEqual(unknown.outcome, "unknown");
      assert.strictEqual(unknown.attempt.error.recovery, "reconcile");
    } finally {
      handlers.parent.updateMetadata = originalUpdate;
    }

    const originalTagAdd = handlers.tag.add;
    const originalRemove = handlers.item.remove;
    try {
      handlers.tag.add = (async () => {
        throw new Error("initial tag write failed");
      }) as typeof handlers.tag.add;
      handlers.item.remove = (async () => {
        throw new Error("created item rollback failed");
      }) as typeof handlers.item.remove;
      const repair = await (broker.mutations.execute as any)(
        {
          operation: "item.create",
          operationId: "attempt-repair",
          itemType: "journalArticle",
          fields: { title: "Residual Created Item" },
          initialTags: ["attempt:repair"],
        },
        { ownerId: "attempt-owner" },
      );
      assert.strictEqual(repair.outcome, "repair_required");
      assert.strictEqual(repair.attempt.error.recovery, "manual_repair");
      assert.lengthOf(repair.attempt.residualRefs, 1);
      assert.include(repair.attempt.error.message, "initial tag write failed");
    } finally {
      handlers.tag.add = originalTagAdd;
      handlers.item.remove = originalRemove;
    }
  });

  it("executes the closed canonical item, relation, and collection operation map", async function () {
    const broker = createZoteroHostCapabilityBroker();
    const scope = { ownerId: "canonical-operation-map" };
    const execute = (request: Record<string, unknown>) =>
      (broker.mutations.execute as any)(request, scope);
    const created = await execute({
      operation: "item.create",
      operationId: "map-item-create",
      itemType: "journalArticle",
      fields: { title: "Canonical Map Item" },
    });
    const itemRef = created.result.item.ref;
    const related = await createParentItem("Canonical Map Related");
    const relatedRef = { libraryId: related.libraryID, key: related.key };
    const collectionCreated = await execute({
      operation: "collection.create",
      operationId: "map-collection-create",
      name: "Canonical Map Collection",
      placement: { kind: "root", libraryId: itemRef.libraryId },
    });
    const collectionRef = collectionCreated.result.collection.ref;
    const operations = [
      {
        operation: "item.updateTags",
        operationId: "map-tags",
        itemRef,
        add: ["canonical:map"],
        remove: [],
      },
      {
        operation: "item.addRelated",
        operationId: "map-related-add",
        sourceRef: itemRef,
        relatedRef,
      },
      {
        operation: "item.removeRelated",
        operationId: "map-related-remove",
        sourceRef: itemRef,
        relatedRef,
      },
      {
        operation: "collection.update",
        operationId: "map-collection-update",
        collectionRef,
        patch: { name: "Canonical Map Collection Updated" },
      },
      {
        operation: "collection.updateMembership",
        operationId: "map-membership",
        collectionRef,
        add: [itemRef],
        remove: [],
      },
      {
        operation: "item.remove",
        operationId: "map-item-trash",
        itemRef,
        disposition: "trash",
      },
    ];
    for (const request of operations) {
      const result = await execute(request);
      assert.include(["committed", "unchanged"], result.outcome);
      assert.strictEqual(result.receipt.operation, request.operation);
      assertStrictJsonValue(result);
    }
  });

  it("executes permanent item and collection removals only against complete preview evidence", async function () {
    const broker = createZoteroHostCapabilityBroker();
    const scope = { ownerId: "destructive-execute" };
    const parent = await createParentItem("Permanent Removal Parent");
    const note = new Zotero.Item("note");
    note.parentID = parent.id;
    note.setNote("<p>remove me</p>");
    await note.saveTx();
    const itemPreview = await (broker.mutations.preview as any)(
      {
        operation: "item.remove",
        itemRef: { libraryId: parent.libraryID, key: parent.key },
        disposition: "permanent",
        childPolicy: "cascade",
      },
      scope,
    );
    const removedItem = await (broker.mutations.execute as any)(
      {
        operation: "item.remove",
        operationId: "permanent-item-remove",
        itemRef: itemPreview.plan.itemRef,
        disposition: "permanent",
        childPolicy: "cascade",
        expectedRevision: itemPreview.plan.revision,
        previewToken: itemPreview.token.value,
      },
      scope,
    );
    assert.strictEqual(removedItem.outcome, "committed");
    assert.lengthOf(removedItem.receipt.changes, 2);
    assert.isUndefined(Zotero.Items.get(parent.id));
    assert.isUndefined(Zotero.Items.get(note.id));

    const member = await createParentItem("Collection Removal Member");
    const collection = await createCollection("Collection Removal Root");
    const child = await createCollection("Collection Removal Child");
    (child as any).parentID = collection.id;
    await child.saveTx();
    member.addToCollection(collection.id);
    await member.saveTx();
    const collectionPreview = await (broker.mutations.preview as any)(
      {
        operation: "collection.remove",
        collectionRef: {
          libraryId: collection.libraryID,
          key: collection.key,
        },
        childPolicy: "cascade",
      },
      scope,
    );
    const removedCollection = await (broker.mutations.execute as any)(
      {
        operation: "collection.remove",
        operationId: "permanent-collection-remove",
        collectionRef: collectionPreview.plan.collectionRef,
        childPolicy: "cascade",
        expectedRevision: collectionPreview.plan.deletedCollections[0].revision,
        previewToken: collectionPreview.token.value,
      },
      scope,
    );
    assert.strictEqual(removedCollection.outcome, "committed");
    assert.isUndefined(Zotero.Collections.get(collection.id));
    assert.isUndefined(Zotero.Collections.get(child.id));
    assert.isOk(Zotero.Items.get(member.id));
    assert.notInclude(member.getCollections(), collection.id);
  });

  it("builds complete read-only plans for the three destructive preview operations", async function () {
    const item = await createParentItem("Preview Type Change");
    const removable = await createParentItem("Preview Item Removal");
    const note = new Zotero.Item("note");
    note.parentID = removable.id;
    note.setNote("<p>child</p>");
    await note.saveTx();
    const collection = await createCollection("Preview Collection Removal");
    const childCollection = await createCollection("Preview Child Collection");
    (childCollection as any).parentID = collection.id;
    await childCollection.saveTx();
    removable.addToCollection(collection.id);
    await removable.saveTx();
    const broker = createZoteroHostCapabilityBroker();
    const scope = { ownerId: "preview-owner" };
    const cases = [
      {
        operation: "item.changeType",
        request: {
          operation: "item.changeType",
          itemRef: { libraryId: item.libraryID, key: item.key },
          targetItemType: "book",
          incompatibleData: "move_to_extra",
        },
        assertPlan(plan: any) {
          assert.strictEqual(plan.itemRef.key, item.key);
          assert.strictEqual(plan.sourceItemType, "journalArticle");
          assert.strictEqual(plan.targetItemType, "book");
          assert.property(plan, "preservedFields");
          assert.property(plan, "dropped");
        },
      },
      {
        operation: "item.remove",
        request: {
          operation: "item.remove",
          itemRef: { libraryId: removable.libraryID, key: removable.key },
          disposition: "permanent",
          childPolicy: "cascade",
        },
        assertPlan(plan: any) {
          assert.deepInclude(plan.children, {
            ref: { libraryId: note.libraryID, key: note.key },
            kind: "note",
            revision: plan.children[0].revision,
          });
          assert.property(plan, "managedResources");
          assert.property(plan, "relationInvalidations");
        },
      },
      {
        operation: "collection.remove",
        request: {
          operation: "collection.remove",
          collectionRef: {
            libraryId: collection.libraryID,
            key: collection.key,
          },
          childPolicy: "cascade",
        },
        assertPlan(plan: any) {
          assert.sameDeepMembers(
            plan.deletedCollections.map((entry: any) => entry.ref),
            [
              { libraryId: collection.libraryID, key: collection.key },
              {
                libraryId: childCollection.libraryID,
                key: childCollection.key,
              },
            ],
          );
          assert.deepInclude(plan.detachedMemberships, {
            collectionRef: {
              libraryId: collection.libraryID,
              key: collection.key,
            },
            itemRef: { libraryId: removable.libraryID, key: removable.key },
            itemRevision: plan.detachedMemberships[0].itemRevision,
          });
        },
      },
    ] as const;

    for (const testCase of cases) {
      const preview = await (broker.mutations.preview as any)(
        testCase.request,
        scope,
      );
      assert.strictEqual(preview.schema, "zotero-agents.mutation-preview.v1");
      assert.strictEqual(preview.operation, testCase.operation);
      assert.isNotEmpty(preview.observations);
      assert.isString(preview.token.value);
      assert.isString(preview.token.expiresAt);
      testCase.assertPlan(preview.plan);
      assertStrictJsonValue(preview);
    }

    assert.strictEqual(item.itemType, "journalArticle");
    assert.isOk(Zotero.Items.get(removable.id));
    assert.isOk(Zotero.Collections.get(collection.id));
  });

  it("binds preview tokens to fifteen minutes, caller scope, fresh state, and process lifetime", async function () {
    let now = Date.parse("2026-08-30T00:00:00.000Z");
    let sequence = 0;
    configureZoteroHostMutationRuntimeForTests({
      now: () => now,
      randomId: () => `preview-token-${++sequence}`,
    });
    const item = await createParentItem("Preview Token Basis");
    const broker = createZoteroHostCapabilityBroker();
    const ref = { libraryId: item.libraryID, key: item.key };
    const previewRequest = {
      operation: "item.changeType",
      itemRef: ref,
      targetItemType: "book",
      incompatibleData: "move_to_extra",
    };
    const preview = await (broker.mutations.preview as any)(previewRequest, {
      ownerId: "preview-owner-a",
    });
    assert.strictEqual(
      Date.parse(preview.token.expiresAt) - now,
      15 * 60 * 1000,
    );

    const execute = (operationId: string, token: string, ownerId: string) =>
      (broker.mutations.execute as any)(
        {
          ...previewRequest,
          operationId,
          expectedRevision: preview.plan.sourceRevision,
          previewToken: token,
        },
        { ownerId },
      );
    const foreign = await execute(
      "preview-foreign",
      preview.token.value,
      "preview-owner-b",
    );
    assert.strictEqual(foreign.outcome, "failed");
    assert.strictEqual(foreign.attempt.error.code, "conflict");

    now += 15 * 60 * 1000 + 1;
    const expired = await execute(
      "preview-expired",
      preview.token.value,
      "preview-owner-a",
    );
    assert.strictEqual(expired.outcome, "failed");
    assert.strictEqual(expired.attempt.error.code, "invalid_ref");

    const equivalent = await (broker.mutations.preview as any)(previewRequest, {
      ownerId: "preview-owner-a",
    });
    assert.notStrictEqual(equivalent.token.value, preview.token.value);
    const converted = await execute(
      "preview-equivalent-reissue",
      equivalent.token.value,
      "preview-owner-a",
    );
    assert.strictEqual(converted.outcome, "committed");
    assert.strictEqual(item.itemType, "book");

    const driftItem = await createParentItem("Preview Drift Basis");
    const driftRef = { libraryId: driftItem.libraryID, key: driftItem.key };
    const driftRequest = { ...previewRequest, itemRef: driftRef };
    const driftPreview = await (broker.mutations.preview as any)(driftRequest, {
      ownerId: "preview-owner-a",
    });
    await handlers.parent.updateFields(driftItem, { title: "Preview Drifted" });
    const drifted = await (broker.mutations.execute as any)(
      {
        ...driftRequest,
        operationId: "preview-drift",
        expectedRevision: driftPreview.plan.sourceRevision,
        previewToken: driftPreview.token.value,
      },
      { ownerId: "preview-owner-a" },
    );
    assert.strictEqual(drifted.outcome, "failed");
    assert.strictEqual(drifted.attempt.error.code, "conflict");

    const restartItem = await createParentItem("Preview Restart Basis");
    const restartRequest = {
      ...previewRequest,
      itemRef: { libraryId: restartItem.libraryID, key: restartItem.key },
    };
    const restartPreview = await (broker.mutations.preview as any)(
      restartRequest,
      { ownerId: "preview-owner-a" },
    );
    resetZoteroHostMutationRuntimeForTests();
    const restarted = await (
      createZoteroHostCapabilityBroker().mutations.execute as any
    )(
      {
        ...restartRequest,
        operationId: "preview-restart",
        expectedRevision: restartPreview.plan.sourceRevision,
        previewToken: restartPreview.token.value,
      },
      { ownerId: "preview-owner-a" },
    );
    assert.strictEqual(restarted.outcome, "failed");
    assert.strictEqual(restarted.attempt.error.code, "invalid_ref");
  });

  it("rejects a destructive preview instead of returning a truncated plan", async function () {
    configureZoteroHostMutationRuntimeForTests({ maxPreviewTargets: 2 } as any);
    const parent = await createParentItem("Preview Hard Limit");
    for (let index = 0; index < 3; index += 1) {
      const note = new Zotero.Item("note");
      note.parentID = parent.id;
      note.setNote(`<p>child ${index}</p>`);
      await note.saveTx();
    }
    try {
      await (createZoteroHostCapabilityBroker().mutations.preview as any)(
        {
          operation: "item.remove",
          itemRef: { libraryId: parent.libraryID, key: parent.key },
          disposition: "permanent",
          childPolicy: "cascade",
        },
        { ownerId: "preview-limit" },
      );
      assert.fail("expected the complete-plan hard limit to reject preview");
    } catch (error) {
      assert.instanceOf(error, ZoteroHostCapabilityError);
      assert.strictEqual(
        (error as ZoteroHostCapabilityError).code,
        "resource_limited",
      );
    }
    assert.isOk(Zotero.Items.get(parent.id));
  });

  it("binds full-snapshot pages to one process, owner, basis, and cursor", async function () {
    let now = Date.parse("2026-08-30T00:00:00.000Z");
    let sequence = 0;
    configureZoteroHostSnapshotRuntimeForTests({
      now: () => now,
      randomId: () => `snapshot-test-${++sequence}`,
    });
    const firstItem = await createParentItem("Snapshot Basis A");
    const secondItem = await createParentItem("Snapshot Basis B");
    const libraryId = firstItem.libraryID;
    const broker = createZoteroHostCapabilityBroker();

    const first = await broker.library.syncSnapshot(
      { libraryId, batchSize: 1 },
      { ownerId: "owner-a" },
    );
    assert.strictEqual(first.schema, "zotero-agents.library-full-index.v1");
    assert.strictEqual(first.outcome, "active");
    assert.strictEqual(first.returned, 1);
    assert.isString(first.snapshotId);
    assert.isString(first.nextCursor);
    assert.notProperty(first, "completionEvidence");
    assertStrictJsonValue(first);

    for (const attempt of [
      {
        ownerId: "owner-b",
        snapshotId: first.snapshotId,
        cursor: first.nextCursor,
      },
      {
        ownerId: "owner-a",
        snapshotId: first.snapshotId,
        cursor: "foreign-cursor",
      },
    ]) {
      try {
        await broker.library.syncSnapshot(
          {
            libraryId,
            batchSize: 1,
            snapshotId: attempt.snapshotId,
            cursor: attempt.cursor,
          },
          { ownerId: attempt.ownerId },
        );
        assert.fail("expected the foreign snapshot continuation to fail");
      } catch (error) {
        assert.instanceOf(error, ZoteroHostCapabilityError);
        assert.include(
          ["invalid_ref", "conflict"],
          (error as ZoteroHostCapabilityError).code,
        );
      }
    }

    now += 30 * 60 * 1000 + 1;
    try {
      await broker.library.syncSnapshot(
        {
          libraryId,
          batchSize: 1,
          snapshotId: first.snapshotId,
          cursor: first.nextCursor,
        },
        { ownerId: "owner-a" },
      );
      assert.fail("expected an expired snapshot to fail");
    } catch (error) {
      assert.instanceOf(error, ZoteroHostCapabilityError);
      assert.strictEqual(
        (error as ZoteroHostCapabilityError).code,
        "invalid_ref",
      );
      assert.strictEqual(
        (error as ZoteroHostCapabilityError).details.reason,
        "expired",
      );
    }

    resetZoteroHostSnapshotRuntimeForTests();
    try {
      await createZoteroHostCapabilityBroker().library.syncSnapshot(
        {
          libraryId,
          batchSize: 1,
          snapshotId: first.snapshotId,
          cursor: first.nextCursor,
        },
        { ownerId: "owner-a" },
      );
      assert.fail("expected a prior-process snapshot to fail");
    } catch (error) {
      assert.instanceOf(error, ZoteroHostCapabilityError);
      assert.strictEqual(
        (error as ZoteroHostCapabilityError).code,
        "invalid_ref",
      );
    }

    assert.notStrictEqual(firstItem.key, secondItem.key);
  });

  it("issues completion evidence only after the fixed snapshot basis is fully delivered", async function () {
    configureZoteroHostSnapshotRuntimeForTests({
      randomId: (() => {
        let sequence = 0;
        return () => `snapshot-complete-${++sequence}`;
      })(),
    });
    const firstItem = await createParentItem("Snapshot Complete A");
    const secondItem = await createParentItem("Snapshot Complete B");
    const broker = createZoteroHostCapabilityBroker();
    const first = await broker.library.syncSnapshot(
      { libraryId: firstItem.libraryID, batchSize: 1 },
      { ownerId: "completion-owner" },
    );
    assert.strictEqual(first.outcome, "active");

    const completed = await broker.library.syncSnapshot(
      {
        libraryId: firstItem.libraryID,
        batchSize: 1,
        snapshotId: first.snapshotId,
        cursor: first.nextCursor,
      },
      { ownerId: "completion-owner" },
    );
    assert.strictEqual(completed.outcome, "completed");
    assert.isFalse(completed.hasMore);
    assert.isNull(completed.nextCursor);
    assert.deepInclude(completed.completionEvidence, {
      snapshotId: first.snapshotId,
      libraryId: firstItem.libraryID,
      scope: "top-level-regular",
      totalItems: 2,
      totalBatches: 2,
      order: "stable_identity",
    });
    assert.match(completed.completionEvidence?.contentDigest || "", /^sha256:/);
    assertStrictJsonValue(completed);

    await handlers.parent.updateFields(secondItem, {
      title: "Snapshot Complete B changed after capture",
    });
    try {
      await broker.library.syncSnapshot(
        {
          libraryId: firstItem.libraryID,
          batchSize: 1,
          snapshotId: first.snapshotId,
          cursor: first.nextCursor,
        },
        { ownerId: "completion-owner" },
      );
      assert.fail("expected a consumed terminal snapshot to fail");
    } catch (error) {
      assert.instanceOf(error, ZoteroHostCapabilityError);
      assert.notProperty(error as object, "completionEvidence");
    }
  });

  it("fails a changed basis and the one-million-item hard cap without completion evidence", async function () {
    configureZoteroHostSnapshotRuntimeForTests({ maxItems: 2 });
    const firstItem = await createParentItem("Snapshot Bound A");
    await createParentItem("Snapshot Bound B");
    await createParentItem("Snapshot Bound C");
    const broker = createZoteroHostCapabilityBroker();
    try {
      await broker.library.syncSnapshot(
        { libraryId: firstItem.libraryID },
        { ownerId: "bounded-owner" },
      );
      assert.fail("expected the snapshot item cap to fail");
    } catch (error) {
      assert.instanceOf(error, ZoteroHostCapabilityError);
      const brokerError = error as ZoteroHostCapabilityError;
      assert.strictEqual(brokerError.code, "resource_limited");
      assert.deepInclude(brokerError.details, {
        resource: "items",
        limit: 2,
      });
      assert.notProperty(brokerError as object, "completionEvidence");
    }

    resetZoteroHostSnapshotRuntimeForTests();
    const stableFirst =
      await createZoteroHostCapabilityBroker().library.syncSnapshot(
        { libraryId: firstItem.libraryID, batchSize: 1 },
        { ownerId: "basis-owner" },
      );
    const remainingKey =
      stableFirst.items[0]?.ref.key === firstItem.key
        ? (
            await createZoteroHostCapabilityBroker().library.listItems({
              libraryId: firstItem.libraryID,
              limit: 10,
            })
          ).items.find((item) => item.ref.key !== firstItem.key)?.ref.key
        : firstItem.key;
    const remaining = remainingKey
      ? Zotero.Items.getByLibraryAndKey(firstItem.libraryID, remainingKey)
      : null;
    assert.isOk(remaining);
    await handlers.parent.updateFields(remaining!, { title: "Changed basis" });
    try {
      await createZoteroHostCapabilityBroker().library.syncSnapshot(
        {
          libraryId: firstItem.libraryID,
          batchSize: 1,
          snapshotId: stableFirst.snapshotId,
          cursor: stableFirst.nextCursor,
        },
        { ownerId: "basis-owner" },
      );
      assert.fail("expected a changed captured revision to fail");
    } catch (error) {
      assert.instanceOf(error, ZoteroHostCapabilityError);
      assert.strictEqual((error as ZoteroHostCapabilityError).code, "conflict");
      assert.notProperty(error as object, "completionEvidence");
    }
  });

  it("keeps Workflow snapshot callbacks serial and returns no evidence after cancellation", async function () {
    const firstItem = await createParentItem("Workflow Snapshot A");
    await createParentItem("Workflow Snapshot B");
    let activeCallbacks = 0;
    let maximumCallbacks = 0;
    const completed = await withWorkflowLibraryItemSnapshot(
      { libraryId: firstItem.libraryID, batchSize: 1 },
      {},
      async () => {
        activeCallbacks += 1;
        maximumCallbacks = Math.max(maximumCallbacks, activeCallbacks);
        await Promise.resolve();
        activeCallbacks -= 1;
      },
    );
    assert.strictEqual(maximumCallbacks, 1);
    assert.strictEqual(completed.outcome, "completed");
    assert.isOk(completed.completionEvidence);

    const controller = new AbortController();
    let callbacks = 0;
    const canceled = await withWorkflowLibraryItemSnapshot(
      { libraryId: firstItem.libraryID, batchSize: 1 },
      { signal: controller.signal },
      async () => {
        callbacks += 1;
        controller.abort();
      },
    );
    assert.strictEqual(callbacks, 1);
    assert.strictEqual(canceled.outcome, "canceled");
    assert.notProperty(canceled, "completionEvidence");
    assertStrictJsonValue(canceled);
  });

  it("uses snapshot batch defaults and rejects batches above the fixed maximum", async function () {
    const item = await createParentItem("Snapshot Batch Bounds");
    const broker = createZoteroHostCapabilityBroker();
    const defaultPage = await broker.library.syncSnapshot(
      { libraryId: item.libraryID },
      { ownerId: "default-batch" },
    );
    assert.strictEqual(defaultPage.batchSize, 500);

    try {
      await broker.library.syncSnapshot(
        { libraryId: item.libraryID, batchSize: 1001 },
        { ownerId: "oversized-batch" },
      );
      assert.fail("expected an oversized snapshot batch to fail");
    } catch (error) {
      assert.instanceOf(error, ZoteroHostCapabilityError);
      assert.strictEqual(
        (error as ZoteroHostCapabilityError).code,
        "resource_limited",
      );
      assert.deepInclude((error as ZoteroHostCapabilityError).details, {
        resource: "items",
        limit: 1000,
        observed: 1001,
      });
    }
  });

  it("keeps the canonical broker portable and strict JSON-safe", async function () {
    const item = await createParentItem("Strict Broker DTO");
    const collection = await createCollection("Strict Broker Collection");
    await handlers.collection.add([item], collection.id);
    const broker = createZoteroHostCapabilityBroker();
    const itemRef = { libraryId: item.libraryID, key: item.key };

    assert.deepEqual(Object.keys(broker.context).sort(), [
      "getCurrentView",
      "getSelectedItems",
    ]);
    assert.deepEqual(Object.keys(broker.navigation).sort(), [
      "openCollection",
      "openItem",
      "openNote",
      "openSelection",
    ]);

    const detail = await broker.library.getItemDetail(itemRef);
    assert.strictEqual(detail.kind, "regular");
    if (detail.kind !== "regular") assert.fail("expected regular detail");
    assert.deepEqual(detail.item.collectionRefs, [
      { libraryId: collection.libraryID, key: collection.key },
    ]);
    assertStrictJsonValue(detail);

    try {
      await broker.library.getNoteDetail(item as never, { format: "text" });
      assert.fail("expected a portable-ref error");
    } catch (error) {
      assert.instanceOf(error, ZoteroHostCapabilityError);
      const brokerError = error as ZoteroHostCapabilityError;
      assert.strictEqual(brokerError.code, "invalid_ref");
      assert.deepEqual(brokerError.details, {
        kind: "note",
        reason: "invalid_shape",
      });
      assertStrictJsonValue(brokerError.details);
    }
  });

  it("accepts only canonical portable refs at the Broker seam", async function () {
    const item = await createParentItem("Portable Broker Ref");
    const broker = createZoteroHostCapabilityBroker();

    assert.strictEqual(
      (
        await broker.library.getItemDetail({
          libraryId: item.libraryID,
          key: item.key,
        })
      ).item.ref.key,
      item.key,
    );

    const invalidRefs: Array<{ label: string; value: unknown }> = [
      { label: "numeric item id", value: item.id },
      { label: "bare key", value: item.key },
      {
        label: "legacy libraryID spelling",
        value: { libraryID: item.libraryID, key: item.key },
      },
      { label: "missing library", value: { key: item.key } },
      {
        label: "non-finite library",
        value: { libraryId: Number.NaN, key: item.key },
      },
      {
        label: "non-canonical key",
        value: { libraryId: item.libraryID, key: "bad:key" },
      },
      { label: "raw Zotero item", value: item },
    ];

    for (const testCase of invalidRefs) {
      try {
        await broker.library.getItemDetail(testCase.value as never);
        assert.fail(`expected ${testCase.label} to be rejected`);
      } catch (error) {
        assert.instanceOf(error, ZoteroHostCapabilityError, testCase.label);
        const brokerError = error as ZoteroHostCapabilityError;
        assert.strictEqual(brokerError.code, "invalid_ref", testCase.label);
        assert.deepEqual(
          Object.keys(brokerError.details).sort(),
          ["kind", "reason"],
          testCase.label,
        );
        assertWorkflowHostStrictJsonValue(brokerError.details);
      }
    }
  });

  it("returns complete canonical category reads and portable exports", async function () {
    const parent = await createParentItem("Canonical Read Parent");
    await handlers.tag.add(parent, ["canonical:read"]);
    const note = await handlers.parent.addNote(parent, {
      content: "<div><p>Canonical note body</p></div>",
    });
    (note as any).version = 2;

    const attachment = new Zotero.Item("attachment");
    (attachment as any).parentItemID = parent.id;
    (attachment as any).version = 3;
    (attachment as any).attachmentLinkMode = 0;
    (attachment as any).fileSize = 1234;
    attachment.setField("title", "Canonical PDF");
    attachment.setField("contentType", "application/pdf");
    (attachment as any).setFilePath("/tmp/canonical-read.pdf");
    await attachment.saveTx();

    const annotation = new Zotero.Item("annotation");
    (annotation as any).parentItemID = attachment.id;
    (annotation as any).version = 4;
    (annotation as any).dateAdded = "2026-04-27T01:00:00.000Z";
    (annotation as any).dateModified = "2026-04-27T02:00:00.000Z";
    (annotation as any).annotationType = "highlight";
    (annotation as any).annotationText = "Canonical annotation";
    (annotation as any).annotationComment = "A comment";
    (annotation as any).annotationSortIndex = "00001";
    (annotation as any).annotationPosition = JSON.stringify({ pageIndex: 0 });
    await annotation.saveTx();
    (attachment as any).getAnnotations = () => [annotation.id];

    const hostApi = createWorkflowHostApi();
    const payloadWrite = await hostApi.mutations.execute({
      operation: "note.upsertPayload",
      note: note.id,
      payloadType: "canonical-json",
      noteKind: "test",
      payload: { schema: "canonical.v1", value: 7 },
    });
    assert.isTrue(payloadWrite.ok);

    const broker = createZoteroHostCapabilityBroker();
    const parentRef = { libraryId: parent.libraryID, key: parent.key };
    const noteRef = { libraryId: note.libraryID, key: note.key };
    const attachmentRef = {
      libraryId: attachment.libraryID,
      key: attachment.key,
    };
    const annotationRef = {
      libraryId: annotation.libraryID,
      key: annotation.key,
    };

    const regularDetail = await broker.library.getItemDetail(parentRef);
    const noteDetail = await broker.library.getItemDetail(noteRef);
    const attachmentDetail = await broker.library.getItemDetail(attachmentRef);
    const annotationDetail = await broker.library.getItemDetail(annotationRef);
    assert.strictEqual(regularDetail.kind, "regular");
    assert.strictEqual(noteDetail.kind, "note");
    assert.strictEqual(attachmentDetail.kind, "attachment");
    assert.strictEqual(annotationDetail.kind, "annotation");

    const notes = await broker.library.getItemNotes(parentRef);
    assert.deepEqual(
      notes.map((entry) => entry.ref),
      [noteRef],
    );
    assert.include(
      (await broker.library.getNoteDetail(noteRef, { format: "text" })).content,
      "Canonical note body",
    );
    const payloads = await broker.library.listNotePayloads(noteRef);
    assert.include(
      payloads.map((entry) => entry.payloadType),
      "canonical-json",
    );
    const payload = await broker.library.getNotePayload(noteRef, {
      payloadType: "canonical-json",
    });
    assert.deepEqual(payload.value, { schema: "canonical.v1", value: 7 });

    const attachments = await broker.library.getItemAttachments(parentRef);
    assert.deepEqual(
      attachments.map((entry) => entry.ref),
      [attachmentRef],
    );
    assert.strictEqual(attachments[0].file.state, "available");
    const annotations = await broker.library.listAnnotations(parentRef);
    assert.deepEqual(
      annotations.map((entry) => entry.ref),
      [annotationRef],
    );
    assert.deepEqual(annotations[0].attachmentRef, attachmentRef);
    assert.deepEqual(annotations[0].itemRef, parentRef);

    const portable = await broker.library.exportPortableItems([parentRef]);
    assert.strictEqual(
      portable[0].schema,
      "zotero-agents.portable-regular-item.v1",
    );
    assert.deepEqual(portable[0].tags, ["canonical:read"]);
    assertStrictJsonValue({
      regularDetail,
      noteDetail,
      attachmentDetail,
      annotationDetail,
      notes,
      payloads,
      payload,
      attachments,
      annotations,
      portable,
    });
  });

  it("binds canonical item and collection cursors to normalized criteria", async function () {
    await createParentItem("Canonical Cursor One");
    await createParentItem("Canonical Cursor Two");
    const firstCollection = await createCollection("Canonical Collection One");
    const secondCollection = await createCollection("Canonical Collection Two");
    const broker = createZoteroHostCapabilityBroker();

    const itemPage = await broker.library.listItems({
      query: "canonical cursor",
      limit: 1,
    });
    assert.isTrue(itemPage.hasMore);
    assert.isString(itemPage.nextCursor);
    assert.deepInclude(itemPage.criteria, {
      libraryId: Zotero.Libraries.userLibraryID,
      query: "canonical cursor",
      order: "stable_identity",
    });
    await expectBrokerError(
      broker.library.listItems({
        query: "changed criteria",
        limit: 1,
        cursor: itemPage.nextCursor || undefined,
      }),
      "invalid_request",
    );

    const collectionPage = await broker.library.listCollections({ limit: 1 });
    assert.isTrue(collectionPage.hasMore);
    assert.deepEqual(
      collectionPage.collections.map((entry) => entry.ref.key),
      [firstCollection.key, secondCollection.key].sort().slice(0, 1),
    );
    const collectionRest = await broker.library.listCollections({
      limit: 1,
      cursor: collectionPage.nextCursor || undefined,
    });
    assert.lengthOf(collectionRest.collections, 1);
    await expectBrokerError(
      broker.library.listCollections({
        libraryId: Zotero.Libraries.userLibraryID + 1,
        cursor: collectionPage.nextCursor || undefined,
      }),
      "invalid_request",
    );

    for (const startOperation of [
      () => broker.library.listItems({ limit: 101 }),
      () => broker.library.listCollections({ limit: 501 }),
    ]) {
      try {
        await startOperation();
        assert.fail("expected a hard-limit failure");
      } catch (error) {
        assert.instanceOf(error, ZoteroHostCapabilityError);
        assert.strictEqual(
          (error as ZoteroHostCapabilityError).code,
          "resource_limited",
        );
      }
    }
  });

  it("fails closed when canonical tags cannot be proved complete", async function () {
    const item = await createParentItem("Canonical Tag Failure");
    const broker = createZoteroHostCapabilityBroker();
    const ref = { libraryId: item.libraryID, key: item.key };
    const originalGetTags = item.getTags;

    for (const replacement of [
      () => {
        throw new Error("tag read failed");
      },
      () =>
        Array.from({ length: 101 }, (_, index) => ({ tag: `tag-${index}` })),
    ]) {
      (item as any).getTags = replacement;
      try {
        await broker.library.getItemDetail(ref);
        assert.fail("expected canonical tag serialization to fail closed");
      } catch (error) {
        assert.instanceOf(error, ZoteroHostCapabilityError);
        assert.include(
          ["execution_failed", "resource_limited"],
          (error as ZoteroHostCapabilityError).code,
        );
      }
    }
    (item as any).getTags = originalGetTags;
  });

  it("traverses serial batches and issues evidence only after exhaustion", async function () {
    await createParentItem("Traversal Canonical One");
    await createParentItem("Traversal Canonical Two");
    const broker = createZoteroHostCapabilityBroker();
    const batches: string[][] = [];
    let callbackActive = false;

    const completed = await broker.library.traverseItems(
      {
        scope: "top-level-regular",
        query: "Traversal Canonical",
        pageSize: 1,
      },
      {},
      async (batch) => {
        assert.isFalse(callbackActive);
        callbackActive = true;
        await Promise.resolve();
        batches.push(batch.items.map((item) => item.ref.key));
        callbackActive = false;
      },
    );
    assert.strictEqual(completed.outcome, "completed");
    assert.deepEqual(
      batches.map((batch) => batch.length),
      [1, 1],
    );
    if (completed.outcome !== "completed") assert.fail("expected completion");
    assert.isTrue(
      verifyLibraryTraversalCompletionEvidence(completed.completionEvidence),
    );

    const limited = await broker.library.traverseItems(
      {
        scope: "top-level-regular",
        query: "Traversal Canonical",
        pageSize: 1,
        maxItems: 1,
      },
      {},
      () => undefined,
    );
    assert.strictEqual(limited.outcome, "resource_limited");
    assert.notProperty(limited, "completionEvidence");

    const controller = new AbortController();
    const canceled = await broker.library.traverseItems(
      {
        scope: "top-level-regular",
        query: "Traversal Canonical",
        pageSize: 1,
      },
      { signal: controller.signal },
      () => controller.abort(),
    );
    assert.strictEqual(canceled.outcome, "canceled");
    assert.notProperty(canceled, "completionEvidence");
  });

  it("normalizes selection and navigation while rejecting unsafe interaction", async function () {
    const parent = await createParentItem("Navigation Parent");
    const note = await handlers.parent.addNote(parent, {
      content: "<p>Navigation note</p>",
    });
    const attachment = new Zotero.Item("attachment");
    (attachment as any).parentItemID = parent.id;
    await attachment.saveTx();
    const collection = await createCollection("Navigation Collection");
    const selectedIds: number[][] = [];
    const previousGetMainWindow = (Zotero as any).getMainWindow;
    (Zotero as any).getMainWindow = () => ({
      focus() {},
      ZoteroPane: {
        getSelectedItems: () => [note, attachment],
        async selectItem(id: number) {
          selectedIds.push([id]);
        },
        async selectItems(ids: number[]) {
          selectedIds.push([...ids]);
        },
        async selectCollection() {},
      },
    });

    try {
      const broker = createZoteroHostCapabilityBroker();
      const parentRef = { libraryId: parent.libraryID, key: parent.key };
      const noteRef = { libraryId: note.libraryID, key: note.key };
      const snapshot = await broker.context.getSelectedItems();
      assert.deepEqual(
        snapshot.items.map((item) => item.ref),
        [noteRef, parentRef],
      );

      const opened = await broker.navigation.openSelection({
        itemRefs: [parentRef, noteRef],
      });
      assert.deepEqual(opened.target, {
        kind: "selection",
        refs: [parentRef, noteRef],
      });
      assert.deepEqual(selectedIds.at(-1), [parent.id, note.id]);

      const collectionResult = await broker.navigation.openCollection({
        libraryId: collection.libraryID,
        key: collection.key,
      });
      assert.strictEqual(collectionResult.target.kind, "collection");

      for (const startOperation of [
        () =>
          broker.navigation.openSelection({ itemRefs: [parentRef, parentRef] }),
        () => broker.navigation.openItem(noteRef),
        () => broker.navigation.openNote(parentRef),
      ]) {
        try {
          await startOperation();
          assert.fail("expected navigation validation failure");
        } catch (error) {
          assert.instanceOf(error, ZoteroHostCapabilityError);
          assert.include(
            ["invalid_request", "invalid_ref"],
            (error as ZoteroHostCapabilityError).code,
          );
        }
      }

      const controller = new AbortController();
      controller.abort();
      await expectBrokerError(
        broker.navigation.openItem(parentRef, { signal: controller.signal }),
        "canceled",
      );

      const nonInteractive = createWorkflowHostLiveReadAdapters({
        interactionMode: "non_interactive",
        broker,
      });
      await expectBrokerError(
        nonInteractive.navigation.openItem(parentRef),
        "interaction_required",
      );
      assert.sameMembers(Object.keys(createWorkflowHostApi().library), [
        "listItems",
        "syncSnapshot",
        "searchItems",
        "getItemDetail",
        "getItemNotes",
        "getNoteDetail",
        "listNotePayloads",
        "getNotePayload",
        "getItemAttachments",
      ]);
    } finally {
      (Zotero as any).getMainWindow = previousGetMainWindow;
    }
  });

  it("builds bounded strict-JSON errors from the closed public taxonomy", function () {
    const detailsByCode: {
      [Code in WorkflowHostErrorCode]: WorkflowHostErrorDetailsByCode[Code];
    } = {
      invalid_request: { reason: "invalid_value", field: "f".repeat(300) },
      invalid_ref: { kind: "item", reason: "invalid_shape" },
      not_found: { kind: "note", opaqueKey: "k".repeat(300) },
      unsupported_operation: { memberOrOperation: "future.call".repeat(30) },
      interaction_required: { member: "file.pickFile" },
      permission_denied: { reason: "host_permission", kind: "attachment" },
      resource_limited: { resource: "depth", limit: 32, observed: 33 },
      conflict: { reason: "revision_mismatch", kind: "item" },
      unavailable: { reason: "runtime", kind: "library" },
      canceled: { reason: "caller_signal" },
      execution_failed: {
        phase: "read",
        recovery: "retry_same_operation",
        affectedCount: 1,
        residualCount: 0,
      },
    };

    for (const code of Object.keys(detailsByCode) as WorkflowHostErrorCode[]) {
      const data = createWorkflowHostErrorData(code, detailsByCode[code], {
        retryable: true,
      });
      assert.strictEqual(data.schema, "zotero-agents.workflow-host-error.v1");
      assert.strictEqual(data.code, code);
      assert.strictEqual(
        data.retryable,
        code === "unavailable" || code === "execution_failed",
        code,
      );
      assertWorkflowHostStrictJsonValue(data);
    }

    const invalidRequest = createWorkflowHostErrorData(
      "invalid_request",
      detailsByCode.invalid_request,
    );
    assert.strictEqual(invalidRequest.details.field?.length, 128);
    const missing = createWorkflowHostErrorData(
      "not_found",
      detailsByCode.not_found,
    );
    assert.strictEqual(missing.details.opaqueKey?.length, 128);

    for (const unsafeDetails of [
      {
        phase: "read",
        recovery: "none",
        cause: new Error("native failure"),
      },
      {
        kind: "item",
        reason: "invalid_shape",
        rawRef: { libraryID: 1, key: "ABC12345" },
      },
    ]) {
      assert.throws(
        () =>
          new ZoteroHostCapabilityError(
            unsafeDetails.phase ? "execution_failed" : "invalid_ref",
            "safe message",
            unsafeDetails as never,
          ),
        TypeError,
      );
    }
  });

  it("rejects lossy or unbounded JSON before it reaches an owner", function () {
    const tooDeep: Record<string, unknown> = {};
    let cursor = tooDeep;
    for (let index = 0; index < 34; index += 1) {
      cursor.next = {};
      cursor = cursor.next as Record<string, unknown>;
    }
    const cases: Array<{ label: string; value: unknown }> = [
      { label: "undefined", value: { value: undefined } },
      { label: "function", value: { value() {} } },
      { label: "non-finite number", value: Number.POSITIVE_INFINITY },
      { label: "native object", value: new Date() },
      { label: "excessive depth", value: tooDeep },
      {
        label: "excessive collection",
        value: Array.from({ length: 10_001 }, () => null),
      },
    ];

    for (const testCase of cases) {
      assert.throws(
        () => assertWorkflowHostStrictJsonValue(testCase.value),
        Error,
        undefined,
        testCase.label,
      );
    }
  });

  it("keeps Broker test adapters complete and fail closed", async function () {
    const broker = createFailClosedZoteroHostCapabilityBroker({
      context: {
        getCurrentView: () => ({
          libraryId: 1,
          libraryName: "Test",
          collectionId: null,
          collectionKey: null,
          collectionName: null,
          view: "library",
        }),
      },
    });

    assert.strictEqual(broker.context.getCurrentView().libraryName, "Test");
    try {
      await broker.library.getItemDetail({ libraryId: 1, key: "ABC12345" });
      assert.fail("expected unconfigured capability to fail closed");
    } catch (error) {
      assert.instanceOf(error, ZoteroHostCapabilityError);
      const brokerError = error as ZoteroHostCapabilityError;
      assert.strictEqual(brokerError.code, "unavailable");
      assert.deepEqual(brokerError.details, {
        reason: "capability",
      });
    }
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
    assert.sameMembers(Object.keys(hostApi.context), [
      "getCurrentView",
      "getSelectedItems",
    ]);
    assert.sameMembers(Object.keys(hostApi.library), [
      "listItems",
      "syncSnapshot",
      "searchItems",
      "getItemDetail",
      "getItemNotes",
      "getNoteDetail",
      "listNotePayloads",
      "getNotePayload",
      "getItemAttachments",
    ]);
    assert.strictEqual(
      (await hostApi.library.getItemDetail(item))?.key,
      item.key,
    );
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

  it("does not infer Workflow Host members from widened internal handler registries", function () {
    const widened = handlers.note as typeof handlers.note & {
      testOnlyWidening?: () => void;
    };
    const widenedTags = handlers.tag as typeof handlers.tag & {
      testOnlyWidening?: () => void;
    };
    const widenedCollections =
      handlers.collection as typeof handlers.collection & {
        testOnlyWidening?: () => void;
      };
    const widenedCommand = handlers.command as typeof handlers.command & {
      testOnlyWidening?: () => void;
    };
    widened.testOnlyWidening = () => undefined;
    widenedTags.testOnlyWidening = () => undefined;
    widenedCollections.testOnlyWidening = () => undefined;
    widenedCommand.testOnlyWidening = () => undefined;
    resetWorkflowHostApiForTests();
    try {
      const hostApi = createWorkflowHostApi();
      assert.notProperty(hostApi.notes, "testOnlyWidening");
      assert.notProperty(hostApi.tags, "testOnlyWidening");
      assert.notProperty(hostApi.collections, "testOnlyWidening");
      assert.notProperty(hostApi.command, "testOnlyWidening");
      assert.deepEqual(Object.keys(hostApi.notes).sort(), [
        "create",
        "importEmbeddedImage",
        "remove",
        "update",
      ]);
    } finally {
      delete widened.testOnlyWidening;
      delete widenedTags.testOnlyWidening;
      delete widenedCollections.testOnlyWidening;
      delete widenedCommand.testOnlyWidening;
      resetWorkflowHostApiForTests();
    }
  });

  it("inspects interactive and non-interactive Workflow Host contract variants", function () {
    const interactive = createWorkflowHostApi();
    const interactiveInspection = inspectWorkflowHostContract(
      interactive,
      "interactive",
    );

    assert.deepInclude(interactiveInspection.summary, {
      items: true,
      command: true,
      resources: false,
      saveFile: true,
    });
    assert.deepEqual(interactiveInspection.conformance, {
      ok: true,
      missingCapabilities: [],
      unexpectedCapabilities: [],
      versionMismatch: null,
    });

    const resources: WorkflowResourceApi = {
      mode: "non-interactive",
      getInput: () => null,
      getInputs: () => [],
      async allocateOutput() {
        throw new Error("unused");
      },
      async publishOutput() {
        throw new Error("unused");
      },
      listOutputs: () => [],
    };
    const nonInteractive = createNonInteractiveWorkflowHostApi({
      base: interactive,
      resources,
    });
    const nonInteractiveInspection = inspectWorkflowHostContract(
      nonInteractive,
      "non-interactive",
    );

    assert.strictEqual(nonInteractiveInspection.summary.resources, true);
    assert.strictEqual(nonInteractiveInspection.conformance.ok, true);

    const drifted = {
      ...interactive,
      version: interactive.version + 1,
      experimental: {},
    } as WorkflowHostApi & { experimental: object };
    delete (drifted as Partial<WorkflowHostApi>).items;

    for (const variant of [
      "interactive",
      "non-interactive",
    ] satisfies WorkflowHostContractVariant[]) {
      const inspection = inspectWorkflowHostContract(drifted, variant);
      assert.deepEqual(inspection.conformance.missingCapabilities, [
        "items",
        ...(variant === "non-interactive" ? ["resources"] : []),
      ]);
      assert.deepEqual(inspection.conformance.unexpectedCapabilities, [
        "experimental",
      ]);
      assert.deepEqual(inspection.conformance.versionMismatch, {
        expected: WORKFLOW_HOST_API_VERSION,
        actual: WORKFLOW_HOST_API_VERSION + 1,
      });
      assert.strictEqual(inspection.conformance.ok, false);
    }
  });

  it("resolves Workflow Host versions without labeling unknown adapters as current", function () {
    const cases = [
      {
        label: "explicit compatibility override",
        input: {
          explicitVersion: 6,
          hostApi: { version: 11 },
          currentProjection: true,
        },
        expected: 6,
      },
      {
        label: "selected projection identity",
        input: { hostApi: { version: 9 }, currentProjection: false },
        expected: 9,
      },
      {
        label: "internally-created current projection",
        input: { currentProjection: true },
        expected: 11,
      },
      {
        label: "unknown external adapter",
        input: { hostApi: {}, currentProjection: false },
        expected: 0,
      },
      {
        label: "non-finite explicit override",
        input: {
          explicitVersion: Number.NaN,
          hostApi: { version: 8 },
          currentProjection: false,
        },
        expected: 8,
      },
    ];

    for (const testCase of cases) {
      assert.strictEqual(
        resolveWorkflowHostContractVersion(testCase.input),
        testCase.expected,
        testCase.label,
      );
    }
  });

  it("materializes Research Bundle papers through the cached v11 projection", async function () {
    const client = createSynthesisClientFromPort({
      async readPaperArtifacts() {
        return { artifacts: [], diagnostics: [] };
      },
    });
    setDefaultSynthesisClientCompositionFactoryForTests(() => ({
      client,
      invalidate() {},
      async dispose() {},
    }));
    const hostApi = createWorkflowHostApi();
    const item = await createParentItem("Late-bound Research Bundle Paper");
    const paperRef = `${item.libraryID}:${item.key}`;

    const result = await hostApi.researchBundles.materializePapers({
      papers: [
        { paperRef },
        { paperRef: "invalid-paper-ref" },
        { paperRef: `${item.libraryID}:MISSING1` },
      ],
      sourcePaperRefs: [paperRef],
    });

    assert.sameMembers(Object.keys(result), ["entries", "warnings", "papers"]);
    assert.deepEqual(
      result.papers.map((paper) => paper.paper_ref),
      [paperRef],
    );
    assert.includeDeepMembers(result.warnings, [
      {
        code: "paper_missing",
        paper_ref: "invalid-paper-ref",
        reason: "invalid_paper_ref",
      },
      {
        code: "paper_missing",
        paper_ref: `${item.libraryID}:MISSING1`,
      },
      {
        code: "core_source_missing",
        paper_ref: paperRef,
      },
    ]);
    assert.notInclude(
      result.warnings.map((warning) => warning.code),
      "source_missing",
    );
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
    const itemRef = { libraryId: item.libraryID, key: item.key };

    const added = await hostApi.statusTags.transition({
      operationId: "status-transition-add",
      itemRef,
      add: ["need-analysis", "need-fulltext"],
    });
    assert.strictEqual(added.outcome, "committed");
    assert.sameMembers(
      added.outcome === "committed" ? added.result.added : [],
      ["status:need-analysis", "status:need-fulltext"],
    );

    const idempotent = await hostApi.statusTags.transition({
      operationId: "status-transition-idempotent",
      itemRef,
      add: ["need-analysis"],
      remove: ["need-fulltext"],
    });
    assert.strictEqual(idempotent.outcome, "committed");
    assert.deepEqual(
      idempotent.outcome === "committed" ? idempotent.result.added : [],
      [],
    );
    assert.deepEqual(
      idempotent.outcome === "committed" ? idempotent.result.removed : [],
      ["status:need-fulltext"],
    );
    assert.deepEqual(
      idempotent.outcome === "committed" ? idempotent.result.unchanged : [],
      ["status:need-analysis"],
    );
    assert.deepEqual(await handlers.tag.list(item), ["status:need-analysis"]);

    for (const request of [
      { operationId: "status-invalid-key", itemRef, add: ["unknown"] },
      {
        operationId: "status-overlap",
        itemRef,
        add: ["need-analysis"],
        remove: ["need-analysis"],
      },
    ]) {
      try {
        await hostApi.statusTags.transition(request as any);
        assert.fail("expected invalid status transition to fail");
      } catch (error) {
        assert.instanceOf(error, ZoteroHostCapabilityError);
        assert.strictEqual(
          (error as ZoteroHostCapabilityError).code,
          "invalid_request",
        );
      }
    }
  });

  it("returns a structured attempt when an accepted status transition fails", async function () {
    const item = await createParentItem("Broker Status Failure");
    const originalUpdate = handlers.tag.update;
    handlers.tag.update = async () => {
      throw new Error("status write failed");
    };
    try {
      const result =
        await createZoteroHostCapabilityBroker().statusTags.transition(
          {
            operationId: "status-transition-failed",
            itemRef: { libraryId: item.libraryID, key: item.key },
            add: ["need-analysis"],
          },
          { ownerId: "status-authority-test" },
        );

      assert.strictEqual(result.outcome, "failed");
      if (result.outcome !== "failed") assert.fail("expected failed attempt");
      assert.strictEqual(result.attempt.error.phase, "commit");
      assert.strictEqual(result.attempt.error.recovery, "retry_same_operation");
      assert.deepEqual(await handlers.tag.list(item), []);
      assertStrictJsonValue(result);
    } finally {
      handlers.tag.update = originalUpdate;
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
      const currentView = createWorkflowHostApi().context.getCurrentView();
      const currentCollection = currentView.currentCollection;
      assert.equal(currentCollection?.id, collection.id);
      assert.equal(currentCollection?.key, collection.key);
      assert.equal(currentCollection?.name, collection.name);
      assert.equal(currentCollection?.libraryId, collection.libraryID);
      assert.deepEqual(currentView.libraryIds, [String(collection.libraryID)]);
      assert.equal(currentView.libraryId, String(collection.libraryID));
      assert.equal(currentView.selectedSources[0]?.kind, "collection");

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
      const specialView = createWorkflowHostApi().context.getCurrentView();
      assert.notProperty(specialView, "currentCollection");
      assert.equal(specialView.selectedSources[0]?.kind, "special");
    } finally {
      (Zotero as any).getMainWindow = previousGetMainWindow;
    }
  });

  it("preserves Zotero 10 plural collection-tree selection order", function () {
    const previousGetMainWindow = (Zotero as any).getMainWindow;
    try {
      (Zotero as any).getMainWindow = () => ({
        ZoteroPane: {
          getSelectedItems: () => [],
          getSelectedLibraryIDs: () => [1, 2],
          getCollectionTreeRows: () => [
            {
              type: "library",
              isLibrary: () => true,
              ref: { libraryID: 1, name: "My Library" },
            },
            {
              type: "group",
              isLibrary: () => true,
              ref: { libraryID: 2, name: "Team Library" },
            },
          ],
        },
      });
      resetWorkflowHostApiForTests();
      const currentView = createWorkflowHostApi().context.getCurrentView();
      assert.deepEqual(currentView.libraryIds, ["1", "2"]);
      assert.notProperty(currentView, "libraryId");
      assert.notProperty(currentView, "currentCollection");
      assert.deepEqual(
        currentView.selectedSources.map((source) => source.kind),
        ["library", "library"],
      );
      assert.deepEqual(
        currentView.selectedSources.map((source) => source.libraryId),
        [1, 2],
      );
    } finally {
      (Zotero as any).getMainWindow = previousGetMainWindow;
      resetWorkflowHostApiForTests();
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

  it("serializes full-library snapshot metadata for local librarian indexes", async function () {
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
      libraryId: included.libraryID,
    });

    assert.strictEqual(snapshot.schema, "zotero-agents.library-full-index.v1");
    assert.isString(snapshot.snapshotId);
    assert.lengthOf(snapshot.items, 2);
    assert.strictEqual(snapshot.returned, 2);
    assert.isFalse(snapshot.hasMore);
    assert.strictEqual(snapshot.outcome, "completed");
    if (snapshot.outcome !== "completed")
      throw new Error("expected terminal page");
    assert.strictEqual(snapshot.completionEvidence.totalItems, 2);
    const indexed = snapshot.items.find(
      (item) => item.ref.key === included.key,
    );
    assert.isOk(indexed);
    assert.strictEqual(indexed?.identifiers.doi, "10.5555/snapshot");
    assert.strictEqual(indexed?.identifiers.isbn, "978-1-4028-9462-6");
    assert.strictEqual(indexed?.identifiers.issn, "1234-5678");
    assert.strictEqual(indexed?.url, "https://example.test/snapshot");
    assert.deepEqual(indexed?.tags, ["snapshot:index"]);
    assert.deepInclude(indexed?.collections, {
      libraryId: included.libraryID,
      key: collection.key,
    });
    assert.doesNotThrow(() => JSON.stringify(snapshot));
  });

  it("hydrates only the current database-selected page, including sparse ids", async function () {
    const hostApi = createWorkflowHostApi();
    const highIdItem = new Zotero.Item("journalArticle");
    highIdItem.id = 1892;
    highIdItem.key = "HIGH1892";
    highIdItem.libraryID = Zotero.Libraries.userLibraryID;
    highIdItem.setField("title", "Broker Sparse High ID Paper");
    highIdItem.setCreators?.([
      { creatorType: "author", firstName: "", lastName: "Sparse" },
    ]);
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

import { assert } from "chai";
import {
  createZoteroHostCapabilityBroker,
  getZoteroHostCanonicalMutationControl,
} from "../../../src/modules/zoteroHostCapabilityBroker";
import type { LiteratureIngestResultDto } from "../../../src/workflows/types";
import "../../../test/zotero/compatibility/probe/suite.test";

declare const Zotero: any;
declare const window: any;

const scope = { ownerId: "native-ingest-spike" };

function report(name: string, facts: unknown) {
  window.debug?.({
    kind: "issue39-production-native",
    version: String(Zotero.version || ""),
    name,
    facts,
  });
}

describe("Issue 39 production Broker ingest in Zotero runtime", function () {
  this.timeout(120000);

  it("creates and reuses literature through public Broker results", async function () {
    const marker = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const title = `Issue 39 native ingest ${marker}`;
    const doi = `10.9999/issue39-${marker}`;
    const libraryId = Zotero.Libraries.userLibraryID;
    const collection = new Zotero.Collection();
    collection.libraryID = libraryId;
    collection.name = `Issue 39 native ingest collection ${marker}`;
    await collection.saveTx();

    const broker = createZoteroHostCapabilityBroker();
    const request = {
      operation: "literature.ingest" as const,
      collectionRef: { libraryId, key: collection.key },
      paper: {
        itemType: "journalArticle",
        fields: { title },
        creators: [],
        identifiers: { doi },
      },
    };
    let createdRef: { libraryId: number; key: string } | undefined;
    let primaryError: unknown;
    try {
      const preview = await broker.mutations.preview(request, scope);
      assert.strictEqual(preview.outcome, "would_change");
      assert.strictEqual(
        (preview.plan as { target: { outcome: string } }).target.outcome,
        "created",
      );

      const created = await broker.mutations.execute(
        { ...request, operationId: `issue39-create-${marker}` },
        scope,
      );
      assert.strictEqual(created.outcome, "committed");
      if (created.outcome !== "committed") assert.fail("expected commit");
      const createdResult = created.result as LiteratureIngestResultDto;
      createdRef = createdResult.item.ref;
      assert.strictEqual(createdResult.itemOutcome, "created");
      assert.strictEqual(createdResult.collectionOutcome, "added");
      assert.strictEqual(createdResult.item.title, title);

      const detail = await broker.library.getItemDetail(createdRef);
      assert.strictEqual(detail.kind, "regular");
      if (detail.kind !== "regular") assert.fail("expected regular item");
      assert.strictEqual(detail.item.title, title);
      const observed = await broker.mutations.getOperation(
        { operationId: `issue39-create-${marker}` },
        scope,
      );
      assert.strictEqual(observed.state, "settled");
      if (observed.state !== "settled") assert.fail("expected settled receipt");
      assert.strictEqual(observed.result.outcome, "committed");

      const reusePreview = await broker.mutations.preview(request, scope);
      assert.strictEqual(
        (reusePreview.plan as { target: { outcome: string } }).target.outcome,
        "existing",
      );
      const reused = await broker.mutations.execute(
        { ...request, operationId: `issue39-reuse-${marker}` },
        scope,
      );
      assert.strictEqual(reused.outcome, "unchanged");
      if (reused.outcome !== "unchanged") assert.fail("expected reuse");
      const reusedResult = reused.result as LiteratureIngestResultDto;
      assert.strictEqual(reusedResult.itemOutcome, "existing");
      assert.strictEqual(reusedResult.collectionOutcome, "already_present");
      assert.deepEqual(reusedResult.item.ref, createdRef);
      report("broker-ingest-created-reused", {
        created: createdResult,
        reused: reusedResult,
        observationState: observed.state,
      });
    } catch (error) {
      primaryError = error;
      throw error;
    } finally {
      try {
        if (createdRef) {
          const id = Zotero.Items.getIDFromLibraryAndKey(
            createdRef.libraryId,
            createdRef.key,
          );
          if (id) await Zotero.Items.trashTx([id]);
        }
        await collection.eraseTx();
      } catch (cleanupError) {
        if (!primaryError) throw cleanupError;
        report("cleanup-failed", String(cleanupError));
      }
    }
  });

  it("lets only one approved absent ingest create a canonical item", async function () {
    const marker = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const title = `Issue 39 concurrent ingest ${marker}`;
    const libraryId = Zotero.Libraries.userLibraryID;
    const collection = new Zotero.Collection();
    collection.libraryID = libraryId;
    collection.name = `Issue 39 concurrent ingest collection ${marker}`;
    await collection.saveTx();
    const broker = createZoteroHostCapabilityBroker();
    const trusted = getZoteroHostCanonicalMutationControl(broker);
    const base = {
      operation: "literature.ingest" as const,
      collectionRef: { libraryId, key: collection.key },
      paper: {
        itemType: "journalArticle",
        fields: { title },
        creators: [],
        identifiers: { doi: `10.9999/issue39-concurrent-${marker}` },
      },
    };
    const firstInput = { ...base, operationId: `issue39-concurrent-a-${marker}` };
    const secondInput = { ...base, operationId: `issue39-concurrent-b-${marker}` };
    let cleanupRef: { libraryId: number; key: string } | undefined;
    let primaryError: unknown;
    try {
      const [firstPrepared, secondPrepared] = await Promise.all([
        trusted.prepare({ input: firstInput, scope }),
        trusted.prepare({ input: secondInput, scope }),
      ]);
      assert.strictEqual(firstPrepared.state, "prepared");
      assert.strictEqual(secondPrepared.state, "prepared");
      if (
        firstPrepared.state !== "prepared" ||
        secondPrepared.state !== "prepared"
      ) {
        assert.fail("expected two absent preparations");
      }

      const results = await Promise.all([
        trusted.execute({
          input: firstInput,
          scope,
          prepared: firstPrepared.prepared,
        }),
        trusted.execute({
          input: secondInput,
          scope,
          prepared: secondPrepared.prepared,
        }),
      ]);
      const committed = results.filter((result) => result.outcome === "committed");
      const failed = results.filter((result) => result.outcome === "failed");
      assert.lengthOf(committed, 1);
      assert.lengthOf(failed, 1);
      const failedResult = failed[0];
      if (failedResult.outcome !== "failed") assert.fail("expected conflict");
      assert.strictEqual(failedResult.attempt.error.code, "conflict");

      const page = await broker.library.listItems({
        libraryId,
        collectionRef: { libraryId, key: collection.key },
        itemType: "journalArticle",
        query: title,
        limit: 10,
      });
      assert.strictEqual(page.returned, 1);
      assert.strictEqual(page.items[0].title, title);
      cleanupRef = page.items[0].ref;
      report("broker-ingest-concurrent-prepared", {
        outcomes: results.map((result) => result.outcome),
        returned: page.returned,
      });
    } catch (error) {
      primaryError = error;
      throw error;
    } finally {
      try {
        if (cleanupRef) {
          const id = Zotero.Items.getIDFromLibraryAndKey(
            cleanupRef.libraryId,
            cleanupRef.key,
          );
          if (id) await Zotero.Items.trashTx([id]);
        }
        await collection.eraseTx();
      } catch (cleanupError) {
        if (!primaryError) throw cleanupError;
        report("cleanup-failed", String(cleanupError));
      }
    }
  });

  it("rejects 26 native identity candidates through public Broker preview", async function () {
    const marker = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const title = `Issue 39 bounded ingest ${marker}`;
    const libraryId = Zotero.Libraries.userLibraryID;
    const collection = new Zotero.Collection();
    collection.libraryID = libraryId;
    collection.name = `Issue 39 bounded ingest collection ${marker}`;
    await collection.saveTx();
    const ids: number[] = [];
    let primaryError: unknown;
    try {
      await Zotero.DB.executeTransaction(async () => {
        for (let index = 0; index < 26; index += 1) {
          const item = new Zotero.Item("journalArticle");
          item.libraryID = libraryId;
          item.setField("title", title);
          item.setField("DOI", `10.9999/issue39-limit-${marker}-${index}`);
          ids.push(await item.save());
        }
      });

      let failure: unknown;
      try {
        await createZoteroHostCapabilityBroker().mutations.preview(
          {
            operation: "literature.ingest",
            collectionRef: { libraryId, key: collection.key },
            paper: {
              itemType: "journalArticle",
              fields: { title },
              creators: [],
              identifiers: {},
            },
          },
          scope,
        );
      } catch (error) {
        failure = error;
      }
      const result = failure as {
        code?: string;
        details?: { resource?: string; limit?: number; observed?: number };
      };
      assert.strictEqual(result.code, "resource_limited");
      assert.deepEqual(result.details, {
        resource: "items",
        limit: 25,
        observed: 26,
      });
      report("broker-ingest-source-limit", result);
    } catch (error) {
      primaryError = error;
      throw error;
    } finally {
      try {
        if (ids.length) await Zotero.Items.trashTx(ids);
        await collection.eraseTx();
      } catch (cleanupError) {
        if (!primaryError) throw cleanupError;
        report("cleanup-failed", String(cleanupError));
      }
    }
  });

  it("rolls back a native metadata insert when the transaction fails", async function () {
    const marker = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const title = `Issue 39 rollback ingest ${marker}`;
    const libraryId = Zotero.Libraries.userLibraryID;
    const collection = new Zotero.Collection();
    collection.libraryID = libraryId;
    collection.name = `Issue 39 rollback ingest collection ${marker}`;
    await collection.saveTx();
    const operationId = `issue39-rollback-${marker}`;
    const broker = createZoteroHostCapabilityBroker();
    const originalSave = Zotero.Item.prototype.save;
    let primaryError: unknown;
    try {
      Zotero.Item.prototype.save = async function (...args: unknown[]) {
        const id = await originalSave.apply(this, args);
        if (
          this.itemType === "journalArticle" &&
          this.getField("title") === title
        ) {
          throw new Error("issue39 native rollback probe");
        }
        return id;
      };
      const result = await broker.mutations.execute(
        {
          operation: "literature.ingest",
          operationId,
          collectionRef: { libraryId, key: collection.key },
          paper: {
            itemType: "journalArticle",
            fields: { title },
            creators: [],
            identifiers: { doi: `10.9999/issue39-rollback-${marker}` },
          },
        },
        scope,
      );
      assert.strictEqual(result.outcome, "failed");
      if (result.outcome !== "failed") assert.fail("expected failed ingest");
      assert.strictEqual(result.attempt.error.code, "execution_failed");
      Zotero.Item.prototype.save = originalSave;

      const page = await broker.library.listItems({
        libraryId,
        itemType: "journalArticle",
        query: title,
        limit: 10,
      });
      assert.strictEqual(page.returned, 0);
      const observed = await broker.mutations.getOperation(
        { operationId },
        scope,
      );
      assert.strictEqual(observed.state, "settled");
      if (observed.state !== "settled") assert.fail("expected settled receipt");
      assert.strictEqual(observed.result.outcome, "failed");
      report("broker-ingest-native-rollback", {
        outcome: result.outcome,
        returned: page.returned,
        observationState: observed.state,
      });
    } catch (error) {
      primaryError = error;
      throw error;
    } finally {
      Zotero.Item.prototype.save = originalSave;
      try {
        await collection.eraseTx();
      } catch (cleanupError) {
        if (!primaryError) throw cleanupError;
        report("cleanup-failed", String(cleanupError));
      }
    }
  });
});

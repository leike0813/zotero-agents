import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { createZoteroSynthesisHostReadPort } from "../../src/modules/synthesis/libraryAdapter";
import { queryZoteroLibraryPage } from "../../src/modules/zoteroLibraryPageQuery";
import {
  SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
  SYNTHESIS_REVERSE_HOST_CAPABILITIES,
} from "../../packages/synthesis-contracts/src";
import {
  createSynthesisReverseHostEndpoint,
  SYNTHESIS_REVERSE_HOST_PATH,
} from "../../src/modules/synthesisReverseHostEndpoint";
import type { SynthesisReverseHostHandlers } from "../../src/modules/synthesisReverseHostBroker";

function isRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: { __parity?: { runtime?: string } };
  };
  return !!runtime.Zotero && runtime.Zotero.__parity?.runtime !== "node-mock";
}

const describeZotero = isRealZoteroRuntime() ? describe : describe.skip;

describeZotero("zotero library page query in Zotero runtime", function () {
  it("transfers one large Unicode reverse Host response with exact framing", async function () {
    const authorizationToken = "a".repeat(64);
    const profileId = "b".repeat(64);
    const serviceInstanceId = "service-unicode";
    let value = `目录治理 ${"文献".repeat(32_000)}`;
    const handlers = Object.fromEntries(
      SYNTHESIS_REVERSE_HOST_CAPABILITIES.map((capability) => [
        capability,
        async () => ({ capability, value }),
      ]),
    ) as SynthesisReverseHostHandlers;
    const endpoint = createSynthesisReverseHostEndpoint({
      profileId,
      authorizationToken,
      now: Date.now,
      isHostConnected: () => true,
      authorizeCapability: () => true,
      handlers,
    });
    const locator = endpoint.start();
    endpoint.bindServiceInstance(serviceInstanceId);
    try {
      const response = await fetch(
        `http://127.0.0.1:${locator.port}${SYNTHESIS_REVERSE_HOST_PATH}`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${authorizationToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
            requestId: "request-unicode",
            profileId,
            serviceInstanceId,
            operationId: "operation-unicode",
            capability: "library.artifacts.read",
            deadlineAtMs: Date.now() + 30_000,
            payload: {},
          }),
        },
      );
      const source = await response.text();
      assert.equal(response.status, 200);
      assert.equal(
        Number(response.headers.get("content-length")),
        new TextEncoder().encode(source).byteLength,
      );
      assert.equal(JSON.parse(source).result.value, value);

      value = "文".repeat(400_000);
      const oversized = await fetch(
        `http://127.0.0.1:${locator.port}${SYNTHESIS_REVERSE_HOST_PATH}`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${authorizationToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
            requestId: "request-oversized",
            profileId,
            serviceInstanceId,
            operationId: "operation-oversized",
            capability: "library.artifacts.read",
            deadlineAtMs: Date.now() + 30_000,
            payload: {},
          }),
        },
      );
      const oversizedSource = await oversized.text();
      assert.equal(oversized.status, 503);
      assert.equal(
        Number(oversized.headers.get("content-length")),
        new TextEncoder().encode(oversizedSource).byteLength,
      );
      assert.equal(
        JSON.parse(oversizedSource).error.details.reason,
        "reverse_host_response_too_large",
      );
    } finally {
      endpoint.stop();
    }
  });

  it("queries real SQLite pages and hydrates only ordered page ids", async function () {
    const token = `keyset-${Date.now()}`;
    const collection = new Zotero.Collection();
    collection.name = `Keyset ${token}`;
    (collection as any).libraryID = Zotero.Libraries.userLibraryID;
    await collection.saveTx();

    const created: Zotero.Item[] = [];
    for (const suffix of ["100%_literal", "creator", "publication"]) {
      const item = new Zotero.Item("journalArticle");
      item.setField("title", `${token} ${suffix}`);
      item.setField("abstractNote", `${token} abstract`);
      item.setField("date", "2026-07-17");
      item.setField("publicationTitle", `${token} Journal`);
      item.setCreators?.([
        { firstName: "Ada", lastName: "Keyset", creatorType: "author" },
      ]);
      item.setTags?.([{ tag: `${token}:tag` }]);
      await item.saveTx();
      await handlers.collection.add([item], collection.id);
      created.push(item);
    }
    const pagedItems = [...created];

    const db = (Zotero as any).DB;
    const previousQueryAsync = db.queryAsync;
    const previousGet = (Zotero.Items as any).get;
    const previousGetAsync = (Zotero.Items as any).getAsync;
    const previousGetAll = (Zotero.Items as any).getAll;
    const querySql: string[] = [];
    const hydrated: number[][] = [];
    let getAllCalls = 0;
    db.queryAsync = async (sql: string, params: unknown[]) => {
      querySql.push(sql);
      return previousQueryAsync.call(db, sql, params);
    };
    (Zotero.Items as any).getAsync = async (idOrIds: number | number[]) => {
      if (Array.isArray(idOrIds)) {
        hydrated.push([...idOrIds]);
      }
      return previousGetAsync.call(Zotero.Items, idOrIds);
    };
    (Zotero.Items as any).getAll = async (...args: unknown[]) => {
      getAllCalls += 1;
      return previousGetAll.apply(Zotero.Items, args);
    };

    try {
      const first = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        collectionId: collection.id,
        query: token,
        limit: 1,
      });
      const second = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        collectionId: collection.id,
        query: token,
        limit: 2,
        cursor: first.nextCursor,
      });
      const literal = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        collectionId: collection.id,
        query: "100%_literal",
        limit: 10,
      });
      const fieldQueries: Array<[string, number[]]> = [
        ["Ada Keyset", pagedItems.map((item) => item.id)],
        ["2026-07-17", pagedItems.map((item) => item.id)],
        [`${token} Journal`, pagedItems.map((item) => item.id)],
        [`${token} abstract`, pagedItems.map((item) => item.id)],
        [`${token}:tag`, pagedItems.map((item) => item.id)],
        [pagedItems[1].key, [pagedItems[1].id]],
      ];
      for (const [query, expectedIds] of fieldQueries) {
        const matched = await queryZoteroLibraryPage({
          libraryId: Zotero.Libraries.userLibraryID,
          collectionId: collection.id,
          query,
          limit: 10,
        });
        assert.deepEqual(
          matched.items.map((item) => item.id),
          expectedIds,
          query,
        );
      }
      const structuralMatch = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        collectionId: collection.id,
        tag: `${token}:tag`,
        itemType: "journalArticle",
        limit: 10,
      });
      assert.deepEqual(
        structuralMatch.items.map((item) => item.id),
        pagedItems.map((item) => item.id),
      );
      const wrongItemType = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        collectionId: collection.id,
        tag: `${token}:tag`,
        itemType: "book",
        limit: 10,
      });
      assert.deepEqual(wrongItemType.items, []);

      const childAttachment = new Zotero.Item("attachment");
      childAttachment.parentID = pagedItems[0].id;
      childAttachment.setField("title", `${token}-child-only`);
      await childAttachment.saveTx();
      created.push(childAttachment);
      const childMatch = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        query: `${token}-child-only`,
        limit: 10,
      });
      assert.deepEqual(childMatch.items, []);

      const crossBoundary = new Zotero.Item("journalArticle");
      crossBoundary.setField("title", `${token}-field-start`);
      crossBoundary.setField("abstractNote", `${token}-field-end`);
      await crossBoundary.saveTx();
      await handlers.collection.add([crossBoundary], collection.id);
      created.push(crossBoundary);
      const boundaryMatch = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        collectionId: collection.id,
        query: `${token}-field-start ${token}-field-end`,
        limit: 10,
      });
      assert.deepEqual(boundaryMatch.items, []);

      const deleted = new Zotero.Item("journalArticle");
      deleted.setField("title", `${token}-deleted-only`);
      await deleted.saveTx();
      await handlers.collection.add([deleted], collection.id);
      created.push(deleted);
      await Zotero.Items.trashTx([deleted.id]);
      const deletedMatch = await queryZoteroLibraryPage({
        libraryId: Zotero.Libraries.userLibraryID,
        collectionId: collection.id,
        query: `${token}-deleted-only`,
        limit: 10,
      });
      assert.deepEqual(deletedMatch.items, []);

      assert.deepEqual(
        first.items.map((item) => item.id),
        [pagedItems[0].id],
      );
      assert.deepEqual(
        second.items.map((item) => item.id),
        pagedItems.slice(1).map((item) => item.id),
      );
      assert.deepEqual(
        literal.items.map((item) => item.id),
        [pagedItems[0].id],
      );
      assert.deepEqual(hydrated.slice(0, 2), [
        [pagedItems[0].id],
        pagedItems.slice(1).map((item) => item.id),
      ]);
      assert.strictEqual(getAllCalls, 0);
      assert.isAtLeast(querySql.length, 28);
      assert.isTrue(querySql.some((sql) => sql.includes("LIMIT ?")));

      const coldItemId = pagedItems[0].id;
      const coldItemKey = pagedItems[0].key;
      (Zotero.Items as any).get = (idOrIds: number | number[]) => {
        const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
        if (ids.includes(coldItemId)) {
          throw new Error(`Item ${coldItemId} not yet loaded`);
        }
        return previousGet.call(Zotero.Items, idOrIds);
      };
      try {
        const hostPort = createZoteroSynthesisHostReadPort({
          libraryId: Zotero.Libraries.userLibraryID,
        });
        let cursor = "";
        let coldItemFound = false;
        do {
          const page = await hostPort.library.listItemsPage({
            libraryId: Zotero.Libraries.userLibraryID,
            cursor,
            limit: 100,
          });
          coldItemFound ||= page.items.some(
            (item) => item.itemKey === coldItemKey,
          );
          cursor = page.nextCursor;
          if (!page.hasMore) {
            break;
          }
        } while (cursor);
        assert.isTrue(coldItemFound);
      } finally {
        (Zotero.Items as any).get = previousGet;
      }
    } finally {
      db.queryAsync = previousQueryAsync;
      (Zotero.Items as any).get = previousGet;
      (Zotero.Items as any).getAsync = previousGetAsync;
      (Zotero.Items as any).getAll = previousGetAll;
      await Zotero.Items.trashTx(created.map((item) => item.id));
      await collection.eraseTx();
    }
  });
});

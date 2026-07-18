import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { queryZoteroLibraryPage } from "../../src/modules/zoteroLibraryPageQuery";

function isRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: { __parity?: { runtime?: string } };
  };
  return !!runtime.Zotero && runtime.Zotero.__parity?.runtime !== "node-mock";
}

const describeZotero = isRealZoteroRuntime() ? describe : describe.skip;

describeZotero("zotero library page query in Zotero runtime", function () {
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
    } finally {
      db.queryAsync = previousQueryAsync;
      (Zotero.Items as any).getAsync = previousGetAsync;
      (Zotero.Items as any).getAll = previousGetAll;
      await Zotero.Items.trashTx(created.map((item) => item.id));
      await collection.eraseTx();
    }
  });
});

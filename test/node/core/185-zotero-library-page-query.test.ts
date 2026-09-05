import { assert } from "chai";
import { DatabaseSync } from "node:sqlite";
import {
  ZoteroLibraryCursorError,
  queryZoteroAnnotationPage,
  queryZoteroChildItemPage,
  queryZoteroCollectionPage,
  queryZoteroSavedSearchPage,
  queryZoteroLibraryPage,
  setZoteroLibrarySourcePageQueryAdapterForTests,
  resetZoteroLibrarySourcePageQueryAdapterForTests,
  type ZoteroLibraryPageQueryAdapter,
  type ZoteroLibraryPageQueryContext,
} from "../../../src/modules/zoteroLibraryPageQuery";

type FakeRecord = {
  item: Zotero.Item;
  libraryId: number;
  collectionIds?: number[];
  tags?: string[];
  itemType?: string;
  title?: string;
  creators?: string[];
  date?: string;
  publication?: string;
  abstract?: string;
  deleted?: boolean;
  parent?: boolean;
};

function fakeItem(id: number, key = `ITEM${id}`) {
  return { id, key, libraryID: 1 } as Zotero.Item;
}

function includesNoCase(value: unknown, query: string) {
  return String(value || "")
    .toLowerCase()
    .includes(query.toLowerCase());
}

function createAdapter(records: FakeRecord[]) {
  const queries: Array<{
    sql: string;
    params: Array<string | number>;
    context: ZoteroLibraryPageQueryContext;
  }> = [];
  const hydrateCalls: number[][] = [];
  let activeQueries = 0;
  let maxActiveQueries = 0;
  const adapter: ZoteroLibraryPageQueryAdapter = {
    async queryAsync(sql, params, context) {
      activeQueries += 1;
      maxActiveQueries = Math.max(maxActiveQueries, activeQueries);
      await Promise.resolve();
      try {
        queries.push({ sql, params: [...params], context });
        const criteria = context.criteria;
        const matches = records
          .filter((record) => !record.deleted && !record.parent)
          .filter((record) => record.libraryId === criteria.libraryId)
          .filter(
            (record) =>
              !criteria.collectionId ||
              record.collectionIds?.includes(criteria.collectionId),
          )
          .filter(
            (record) =>
              !criteria.tag ||
              record.tags?.some(
                (tag) => tag.toLowerCase() === criteria.tag.toLowerCase(),
              ),
          )
          .filter(
            (record) =>
              !criteria.itemType || record.itemType === criteria.itemType,
          )
          .filter((record) => {
            if (!criteria.query) return true;
            return [
              record.title,
              ...(record.creators || []),
              record.date,
              record.publication,
              record.abstract,
              ...(record.tags || []),
              record.item.key,
            ].some((value) => includesNoCase(value, criteria.query));
          })
          .sort((left, right) => Number(left.item.id) - Number(right.item.id));
        if (context.kind === "count") {
          return [{ total: matches.length }];
        }
        return matches
          .filter((record) => Number(record.item.id) > context.afterItemId)
          .slice(0, context.limitPlusOne)
          .map((record) => ({ itemID: record.item.id }));
      } finally {
        activeQueries -= 1;
      }
    },
    async hydrateItems(ids) {
      hydrateCalls.push([...ids]);
      return [...ids]
        .reverse()
        .map((id) => records.find((record) => record.item.id === id)?.item)
        .filter(Boolean) as Zotero.Item[];
    },
  };
  return {
    adapter,
    queries,
    hydrateCalls,
    get maxActiveQueries() {
      return maxActiveQueries;
    },
  };
}

function expectCursorError(error: unknown) {
  assert.instanceOf(error, ZoteroLibraryCursorError);
  assert.strictEqual(
    (error as ZoteroLibraryCursorError).code,
    "invalid_library_cursor",
  );
}

describe("zotero library page query", function () {
  it("returns ordered keyset pages, uses limit+1, and hydrates only the page", async function () {
    const records = [1, 2, 3, 4, 5].map((id) => ({
      item: fakeItem(id),
      libraryId: 1,
      itemType: "journalArticle",
    }));
    const harness = createAdapter(records);

    const first = await queryZoteroLibraryPage(
      { libraryId: 1, limit: 2 },
      { adapter: harness.adapter },
    );
    const second = await queryZoteroLibraryPage(
      { libraryId: 1, limit: 2, cursor: first.nextCursor },
      { adapter: harness.adapter },
    );
    const third = await queryZoteroLibraryPage(
      { libraryId: 1, limit: 2, cursor: second.nextCursor },
      { adapter: harness.adapter },
    );

    assert.deepEqual(
      first.items.map((item) => item.id),
      [1, 2],
    );
    assert.deepEqual(
      second.items.map((item) => item.id),
      [3, 4],
    );
    assert.deepEqual(
      third.items.map((item) => item.id),
      [5],
    );
    assert.strictEqual(first.totalScanned, 5);
    assert.isTrue(first.hasMore);
    assert.isFalse(third.hasMore);
    assert.isNull(third.nextCursor);
    assert.deepEqual(harness.hydrateCalls, [[1, 2], [3, 4], [5]]);
    assert.deepEqual(
      harness.queries
        .filter((query) => query.context.kind === "page")
        .map((query) => query.context.limitPlusOne),
      [3, 3, 3],
    );
    assert.match(first.nextCursor, /^[A-Za-z0-9_-]+$/);
    assert.strictEqual(harness.maxActiveQueries, 1);
  });

  it("shares structural/text predicates and treats percent and underscore literally", async function () {
    const matching = {
      item: fakeItem(11, "LITERAL11"),
      libraryId: 2,
      collectionIds: [7],
      tags: ["Topic:Exact", "100%_literal"],
      itemType: "book",
      title: "A 100%_literal result",
      creators: ["Ada Lovelace"],
      date: "2026",
      publication: "Query Journal",
      abstract: "Field-local evidence",
    };
    const harness = createAdapter([
      matching,
      { ...matching, item: fakeItem(12), libraryId: 1 },
      { ...matching, item: fakeItem(13), parent: true },
      { ...matching, item: fakeItem(14), deleted: true },
      { ...matching, item: fakeItem(15), collectionIds: [8] },
    ]);

    const result = await queryZoteroLibraryPage(
      {
        libraryId: 2,
        collectionId: 7,
        tag: "topic:exact",
        itemType: "book",
        query: "100%_literal",
        limit: 10,
      },
      { adapter: harness.adapter },
    );

    assert.deepEqual(
      result.items.map((item) => item.id),
      [11],
    );
    const count = harness.queries.find(
      (query) => query.context.kind === "count",
    )!;
    const page = harness.queries.find(
      (query) => query.context.kind === "page",
    )!;
    assert.include(page.sql, "ORDER BY i.itemID ASC");
    assert.include(page.sql, "ESCAPE '\\'");
    assert.include(page.params, "%100\\%\\_literal%");
    assert.strictEqual(
      page.sql.slice(0, page.sql.indexOf(" AND i.itemID > ?")),
      count.sql.replace(
        "SELECT COUNT(*) AS total",
        "SELECT i.itemID AS itemID",
      ),
    );
  });

  it("rejects damaged, unsupported, mismatched, and numeric cursors", async function () {
    const harness = createAdapter(
      [1, 2].map((id) => ({ item: fakeItem(id), libraryId: 1 })),
    );
    const first = await queryZoteroLibraryPage(
      { libraryId: 1, query: "item", limit: 1 },
      { adapter: harness.adapter },
    );

    for (const cursor of ["damaged!", 1] as unknown[]) {
      try {
        await queryZoteroLibraryPage(
          { libraryId: 1, query: "item", cursor, limit: 1 },
          { adapter: harness.adapter },
        );
        assert.fail("expected invalid cursor");
      } catch (error) {
        expectCursorError(error);
      }
    }

    try {
      await queryZoteroLibraryPage(
        { libraryId: 1, query: "different", cursor: first.nextCursor },
        { adapter: harness.adapter },
      );
      assert.fail("expected criteria mismatch");
    } catch (error) {
      expectCursorError(error);
    }

    const decoded = JSON.parse(
      Buffer.from(first.nextCursor, "base64url").toString("utf8"),
    );
    const unsupported = Buffer.from(
      JSON.stringify({ ...decoded, version: 2 }),
      "utf8",
    ).toString("base64url");
    try {
      await queryZoteroLibraryPage(
        { libraryId: 1, query: "item", cursor: unsupported, limit: 1 },
        { adapter: harness.adapter },
      );
      assert.fail("expected unsupported cursor version");
    } catch (error) {
      expectCursorError(error);
    }
  });

  it("does not duplicate rows when records change between pages", async function () {
    const records: FakeRecord[] = [1, 2, 3].map((id) => ({
      item: fakeItem(id),
      libraryId: 1,
    }));
    const harness = createAdapter(records);
    const first = await queryZoteroLibraryPage(
      { libraryId: 1, limit: 2 },
      { adapter: harness.adapter },
    );

    records.splice(0, 1);
    records.push({ item: fakeItem(4), libraryId: 1 });
    const second = await queryZoteroLibraryPage(
      { libraryId: 1, limit: 2, cursor: first.nextCursor },
      { adapter: harness.adapter },
    );

    assert.deepEqual(
      first.items.map((item) => item.id),
      [1, 2],
    );
    assert.deepEqual(
      second.items.map((item) => item.id),
      [3, 4],
    );
  });

  it("executes collection and annotation pages against native Zotero table ownership", async function () {
    const database = new DatabaseSync(":memory:");
    database.exec(`
      CREATE TABLE items (itemID INTEGER PRIMARY KEY, libraryID INT NOT NULL);
      CREATE TABLE itemAttachments (itemID INTEGER PRIMARY KEY, parentItemID INT);
      CREATE TABLE itemAnnotations (itemID INTEGER PRIMARY KEY, parentItemID INT, sortIndex TEXT);
      CREATE TABLE collections (collectionID INTEGER PRIMARY KEY, collectionName TEXT, parentCollectionID INT, libraryID INT, key TEXT, version INT, clientDateModified TEXT);
      INSERT INTO items VALUES (1, 1), (2, 1), (3, 1), (4, 1);
      INSERT INTO itemAttachments VALUES (2, 1);
      INSERT INTO itemAnnotations VALUES (3, 2, '0001'), (4, 2, '0001');
      INSERT INTO collections VALUES (1, 'Research', NULL, 1, 'COLL0001', 1, '2026-09-05');
    `);
    const adapter = {
      async queryAsync(sql: string, params: Array<string | number>) {
        return database.prepare(sql).all(...params);
      },
      async hydrateItems(ids: number[]) {
        return ids.map((id) => fakeItem(id));
      },
    };
    try {
      const collections = await queryZoteroCollectionPage(
        { libraryId: 1 },
        { adapter },
      );
      assert.strictEqual(collections.rows[0].name, "Research");
      for (const parentKind of ["regular", "attachment"] as const) {
        const request = {
          libraryId: 1,
          parentItemId: parentKind === "regular" ? 1 : 2,
          parentKind,
          limit: 1,
        };
        const first = await queryZoteroAnnotationPage(request, { adapter });
        assert.deepEqual(first.itemIds, [3]);
        const last = await queryZoteroAnnotationPage(
          { ...request, cursor: first.nextCursor },
          { adapter },
        );
        assert.deepEqual(last.itemIds, [4]);
        assert.isFalse(last.hasMore);
      }
    } finally {
      database.close();
    }
  });

  it("pages child, annotation, collection, and saved-search sources without hydrating outside the page", async function () {
    const sourceRows = {
      notes: [
        { itemID: 101, parentItemID: 1 },
        { itemID: 102, parentItemID: 1 },
        { itemID: 103, parentItemID: 1 },
      ],
      attachments: [
        { itemID: 201, parentItemID: 1 },
        { itemID: 202, parentItemID: 1 },
      ],
      annotations: [
        { itemID: 301, parentItemID: 201, sortIndex: "0001" },
        { itemID: 302, parentItemID: 201, sortIndex: "0002" },
        { itemID: 303, parentItemID: 202, sortIndex: "0003" },
      ],
      collections: [
        { collectionID: 9, key: "B", name: "same" },
        { collectionID: 10, key: "C", name: "same" },
      ],
      savedSearches: [
        { savedSearchID: 41, key: "S1", savedSearchName: "same" },
        { savedSearchID: 42, key: "S2", savedSearchName: "same" },
      ],
    };
    const queries: Array<{ sql: string; context: any }> = [];
    const hydrateCalls: number[][] = [];
    setZoteroLibrarySourcePageQueryAdapterForTests({
      async queryAsync(sql, params, context) {
        queries.push({ sql, context });
        const rows = (
          context.domain === "saved-searches"
            ? sourceRows.savedSearches
            : sourceRows[context.domain as keyof typeof sourceRows]
        ) as any[];
        if (context.kind === "count") return [{ total: rows.length }];
        const position = context.position || {};
        const filtered = rows.filter((row) => {
          if (context.domain === "annotations") {
            return (
              row.sortIndex > (position.sortIndex || "") ||
              (row.sortIndex === position.sortIndex &&
                row.itemID > (position.itemID || 0))
            );
          }
          const id = row.itemID ?? row.collectionID ?? row.savedSearchID;
          return id > (position.id || 0);
        });
        return filtered.slice(0, context.limitPlusOne);
      },
      async hydrateItems(ids) {
        hydrateCalls.push([...ids]);
        return ids.map(
          (id) => ({ id, key: `K${id}`, libraryID: 1 }) as Zotero.Item,
        );
      },
    });
    try {
      const notes = await queryZoteroChildItemPage({
        domain: "notes",
        libraryId: 1,
        parentItemId: 1,
        limit: 2,
      });
      assert.deepEqual(notes.itemIds, [101, 102]);
      assert.isTrue(notes.hasMore);
      const notesTail = await queryZoteroChildItemPage({
        domain: "notes",
        libraryId: 1,
        parentItemId: 1,
        limit: 2,
        cursor: notes.nextCursor,
      });
      assert.deepEqual(notesTail.itemIds, [103]);
      const decodedNotesCursor = JSON.parse(
        Buffer.from(notes.nextCursor!, "base64url").toString("utf8"),
      ) as Record<string, unknown>;
      decodedNotesCursor.position = {};
      const emptyPositionCursor = Buffer.from(
        JSON.stringify(decodedNotesCursor),
      ).toString("base64url");
      try {
        await queryZoteroChildItemPage({
          domain: "notes",
          libraryId: 1,
          parentItemId: 1,
          limit: 2,
          cursor: emptyPositionCursor,
        });
        assert.fail("expected an invalid source cursor position");
      } catch (error) {
        expectCursorError(error);
        assert.strictEqual(
          (error as { details?: { reason?: string } }).details?.reason,
          "invalid_position",
        );
      }

      const annotations = await queryZoteroAnnotationPage({
        libraryId: 1,
        parentItemId: 1,
        parentKind: "attachment",
        limit: 2,
      });
      assert.deepEqual(annotations.itemIds, [301, 302]);

      const collections = await queryZoteroCollectionPage({
        libraryId: 1,
        limit: 1,
      });
      assert.deepEqual(
        collections.rows.map((row) => row.collectionID),
        [9],
      );

      const searches = await queryZoteroSavedSearchPage({
        libraryId: 1,
        limit: 1,
      });
      assert.deepEqual(
        searches.rows.map((row) => row.savedSearchID),
        [41],
      );
      assert.strictEqual(searches.rows[0].savedSearchName, "same");
      assert.deepEqual(hydrateCalls, [[101, 102], [103], [301, 302]]);
      assert.include(
        queries.find((query) => query.context.domain === "notes")!.sql,
        "itemNotes",
      );
      assert.include(
        queries.find((query) => query.context.domain === "annotations")!.sql,
        "itemAnnotations",
      );
    } finally {
      resetZoteroLibrarySourcePageQueryAdapterForTests();
    }
  });

  it("rejects foreign source cursors and fails a page when hydration is incomplete", async function () {
    setZoteroLibrarySourcePageQueryAdapterForTests({
      async queryAsync(_sql, _params, context) {
        if (context.kind === "count") return [{ total: 1 }];
        return [{ itemID: 901 }];
      },
      async hydrateItems() {
        return [];
      },
    });
    try {
      try {
        await queryZoteroChildItemPage({
          domain: "notes",
          libraryId: 1,
          parentItemId: 1,
          limit: 1,
          cursor: 1 as unknown as string,
        });
        assert.fail("expected numeric cursor rejection");
      } catch (error) {
        expectCursorError(error);
      }
      try {
        await queryZoteroChildItemPage({
          domain: "notes",
          libraryId: 1,
          parentItemId: 1,
          limit: 1,
        });
        assert.fail("expected hydration failure");
      } catch (error) {
        assert.strictEqual(
          (error as { code?: string }).code,
          "zotero_source_query_failed",
        );
        assert.strictEqual((error as { stage?: string }).stage, "hydrate");
      }
    } finally {
      resetZoteroLibrarySourcePageQueryAdapterForTests();
    }
  });
});

import { assert } from "chai";
import {
  ZoteroLibraryCursorError,
  queryZoteroLibraryPage,
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
  return String(value || "").toLowerCase().includes(query.toLowerCase());
}

function createAdapter(records: FakeRecord[]) {
  const queries: Array<{
    sql: string;
    params: Array<string | number>;
    context: ZoteroLibraryPageQueryContext;
  }> = [];
  const hydrateCalls: number[][] = [];
  const adapter: ZoteroLibraryPageQueryAdapter = {
    async queryAsync(sql, params, context) {
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
    },
    async hydrateItems(ids) {
      hydrateCalls.push([...ids]);
      return [...ids]
        .reverse()
        .map((id) => records.find((record) => record.item.id === id)?.item)
        .filter(Boolean) as Zotero.Item[];
    },
  };
  return { adapter, queries, hydrateCalls };
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

    assert.deepEqual(first.items.map((item) => item.id), [1, 2]);
    assert.deepEqual(second.items.map((item) => item.id), [3, 4]);
    assert.deepEqual(third.items.map((item) => item.id), [5]);
    assert.strictEqual(first.totalScanned, 5);
    assert.isTrue(first.hasMore);
    assert.isFalse(third.hasMore);
    assert.strictEqual(third.nextCursor, "");
    assert.deepEqual(harness.hydrateCalls, [[1, 2], [3, 4], [5]]);
    assert.deepEqual(
      harness.queries
        .filter((query) => query.context.kind === "page")
        .map((query) => query.context.limitPlusOne),
      [3, 3, 3],
    );
    assert.match(first.nextCursor, /^[A-Za-z0-9_-]+$/);
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

    assert.deepEqual(result.items.map((item) => item.id), [11]);
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
      count.sql.replace("SELECT COUNT(*) AS total", "SELECT i.itemID AS itemID"),
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

    assert.deepEqual(first.items.map((item) => item.id), [1, 2]);
    assert.deepEqual(second.items.map((item) => item.id), [3, 4]);
  });
});

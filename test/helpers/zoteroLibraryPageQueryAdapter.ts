import type {
  ZoteroLibraryPageQueryAdapter,
  ZoteroLibraryPageQueryCriteria,
} from "../../src/modules/zoteroLibraryPageQuery";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function itemFields(item: Zotero.Item) {
  const read = (field: string) => {
    try {
      return text(item.getField?.(field));
    } catch {
      return "";
    }
  };
  let creators: string[] = [];
  let tags: string[] = [];
  try {
    creators = (item.getCreators?.() || []).map((creator: any) =>
      text(
        [creator.firstName, creator.lastName].filter(Boolean).join(" ") ||
          creator.name,
      ),
    );
  } catch {
    creators = [];
  }
  try {
    tags = (item.getTags?.() || []).map((entry: any) => text(entry.tag));
  } catch {
    tags = [];
  }
  return {
    title: read("title"),
    date: read("date"),
    publication: read("publicationTitle"),
    abstract: read("abstractNote"),
    creators,
    tags,
  };
}

function matches(item: Zotero.Item, criteria: ZoteroLibraryPageQueryCriteria) {
  if (Number((item as any).libraryID) !== criteria.libraryId) return false;
  if ((item as any).deleted) return false;
  if (Number((item as any).parentItemID || (item as any).parentID || 0) > 0) {
    return false;
  }
  if (item.isNote?.() || item.isAttachment?.()) return false;
  if (criteria.itemType && text(item.itemType) !== criteria.itemType) {
    return false;
  }
  const fields = itemFields(item);
  if (
    criteria.tag &&
    !fields.tags.some((tag) => tag.toLowerCase() === criteria.tag.toLowerCase())
  ) {
    return false;
  }
  if (criteria.collectionId) {
    let collections: unknown[] = [];
    try {
      collections = item.getCollections?.() || [];
    } catch {
      collections = [];
    }
    if (!collections.map(Number).includes(criteria.collectionId)) return false;
  }
  if (criteria.query) {
    const query = criteria.query.toLowerCase();
    const values = [
      fields.title,
      ...fields.creators,
      fields.date,
      fields.publication,
      fields.abstract,
      ...fields.tags,
      item.key,
    ];
    if (!values.some((value) => text(value).toLowerCase().includes(query))) {
      return false;
    }
  }
  return true;
}

export function createMockZoteroLibraryPageQueryAdapter(): ZoteroLibraryPageQueryAdapter {
  return {
    async queryAsync(_sql, _params, context) {
      const items = await (Zotero.Items as any).getAll(
        context.criteria.libraryId,
      );
      const matching = (items as Zotero.Item[])
        .filter((item) => matches(item, context.criteria))
        .sort((left, right) => Number(left.id) - Number(right.id));
      if (context.kind === "count") {
        return [{ total: matching.length }];
      }
      return matching
        .filter((item) => Number(item.id) > context.afterItemId)
        .slice(0, context.limitPlusOne)
        .map((item) => ({ itemID: item.id }));
    },
    async hydrateItems(ids) {
      return (await (Zotero.Items as any).getAsync(ids)) as Zotero.Item[];
    },
  };
}

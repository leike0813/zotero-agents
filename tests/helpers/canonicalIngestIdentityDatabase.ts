export async function withMockCanonicalIngestIdentityDatabase<T>(
  run: () => Promise<T>,
  options: { afterTransactionWork?: (result: unknown) => void } = {},
) {
  const previousSearch = (Zotero as any).Search;
  const previousDb = Object.getOwnPropertyDescriptor(Zotero, "DB");
  const searches = new Map<
    number,
    { libraryID?: number; condition?: [string, string, string] }
  >();
  let sequence = 0;

  (Zotero as any).Search = class {
    libraryID?: number;
    private condition?: [string, string, string];
    private readonly id = sequence++;

    addCondition(field: string, operator: string, value: string) {
      this.condition = [field, operator, value];
    }

    async getSQL() {
      searches.set(this.id, {
        libraryID: this.libraryID,
        condition: this.condition,
      });
      return `SELECT itemID FROM mock_ingest_identity_${this.id}`;
    }

    async getSQLParams() {
      return false;
    }
  };
  Object.defineProperty(Zotero, "DB", {
    configurable: true,
    value: {
      async columnQueryAsync(sql: string, params: unknown[]) {
        const ids = Array.from(sql.matchAll(/mock_ingest_identity_(\d+)/g)).map(
          (match) => Number(match[1]),
        );
        const limit = Number(params.at(-1));
        if (!ids.length || !/LIMIT \?$/.test(sql) || limit !== 26) {
          throw new Error("unexpected canonical ingest identity query");
        }
        const matched = new Set<number>();
        for (const id of ids) {
          const search = searches.get(id);
          if (!search?.libraryID || !search.condition) {
            throw new Error("canonical ingest identity query is incomplete");
          }
          const [field, operator, value] = search?.condition || [];
          const expected = String(value || "")
            .trim()
            .toLowerCase();
          const items = await (Zotero.Items as any).getAll(search?.libraryID);
          for (const item of items) {
            const actual = String(item.getField(field) || "")
              .trim()
              .toLowerCase();
            if (
              operator === "contains"
                ? actual.includes(expected)
                : actual === expected
            ) {
              matched.add(item.id);
            }
          }
        }
        return Array.from(matched).slice(0, limit);
      },
      // This boundary stub only joins the callback. Native serialization is
      // covered by the Zotero compatibility run; this does not prove rollback.
      async executeTransaction(work: () => Promise<unknown>) {
        const result = await work();
        options.afterTransactionWork?.(result);
        return result;
      },
    },
  });
  try {
    return await run();
  } finally {
    (Zotero as any).Search = previousSearch;
    if (previousDb) Object.defineProperty(Zotero, "DB", previousDb);
    else Reflect.deleteProperty(Zotero, "DB");
  }
}

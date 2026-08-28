import { createHookHelpers } from "../../src/workflows/helpers";

export * from "../zotero/workflow-test-utils";

export function createLiteratureAnalysisFixtureHelpers(zotero: typeof Zotero) {
  const helpers = createHookHelpers(zotero);
  return {
    ...helpers,
    resolveItemRef(ref: string | number | Zotero.Item) {
      if (typeof ref === "object" && ref !== null) {
        return ref;
      }
      const id = Number(ref);
      if (!Number.isSafeInteger(id) || id <= 0) {
        return helpers.resolveItemRef(ref);
      }
      return {
        id,
        key: `fixture-parent-${id}`,
        itemType: "journalArticle",
        libraryID: 1,
        getField(field: string) {
          return field === "title" ? `Fixture Parent ${id}` : "";
        },
        getCreators() {
          return [];
        },
        getTags() {
          return [];
        },
        getNotes() {
          return [];
        },
        getAttachments() {
          return [];
        },
        isRegularItem() {
          return true;
        },
        isTopLevelItem() {
          return true;
        },
      } as unknown as Zotero.Item;
    },
  };
}

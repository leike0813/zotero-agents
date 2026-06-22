import { assert } from "chai";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { getDocsBaseUrl, getDocsUrl } from "../../src/utils/docsUrl";

const ORIGINAL_ZOTERO_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  globalThis,
  "Zotero",
);

function setZoteroLocale(locale: string) {
  Object.defineProperty(globalThis, "Zotero", {
    configurable: true,
    writable: true,
    value: { locale },
  });
}

describe("docs URL routing", function () {
  afterEach(function () {
    setDebugModeOverrideForTests();
    if (ORIGINAL_ZOTERO_DESCRIPTOR) {
      Object.defineProperty(globalThis, "Zotero", ORIGINAL_ZOTERO_DESCRIPTOR);
    } else {
      delete (globalThis as any).Zotero;
    }
  });

  it("routes debug documentation links to the local Docusaurus site root", function () {
    setDebugModeOverrideForTests(true);
    setZoteroLocale("zh-CN");

    assert.equal(getDocsBaseUrl(), "http://localhost:3000/zotero-agents/");
    assert.equal(getDocsUrl(), "http://localhost:3000/zotero-agents/");
  });

  it("routes zh-CN production documentation links to Gitee", function () {
    setDebugModeOverrideForTests(false);
    setZoteroLocale("zh-CN");

    assert.equal(getDocsUrl(), "https://leike0813.gitee.io/zotero-agents/");
    assert.equal(
      getDocsUrl("workflows/custom"),
      "https://leike0813.gitee.io/zotero-agents/zh-CN/workflows/custom",
    );
  });

  it("routes non zh-CN production documentation links to GitHub", function () {
    setDebugModeOverrideForTests(false);
    setZoteroLocale("ja-JP");

    assert.equal(getDocsUrl(), "https://leike0813.github.io/zotero-agents/");
    assert.equal(
      getDocsUrl("/zh-CN/workflows/custom"),
      "https://leike0813.github.io/zotero-agents/workflows/custom",
    );
  });
});

import { assert } from "chai";
import { readFile } from "node:fs/promises";
import path from "node:path";

describe("Zotero full-suite entrypoint boundary", function () {
  it("does not import Node-only core tests into the Zotero bundle", async function () {
    const source = await readFile(
      path.join(process.cwd(), "test/zotero/core/full/suite.test.ts"),
      "utf8",
    );
    assert.notInclude(source, '"../../../core/12-handlers.test"');
  });

  it("allows the canonical navigation suite in the Zotero core domain", async function () {
    const source = await readFile(
      path.join(process.cwd(), "test/zotero/domainFilter.ts"),
      "utf8",
    );
    assert.include(source, "188-zotero-navigation\\.zotero\\.test\\.ts");
    assert.include(source, '"canonical navigation in Zotero runtime "');
  });
});

import { assert } from "chai";
import { resetZoteroMockStateForTests } from "../../setup/zotero-mock";

describe("zotero mock isolation", function () {
  it("creates mock zotero state inside a test", async function () {
    const item = new Zotero.Item("journalArticle");
    item.setField("title", "Mock Isolation Parent");
    await item.saveTx();

    const collection = new Zotero.Collection();
    collection.name = "Mock Isolation Collection";
    collection.libraryID = Zotero.Libraries.userLibraryID;
    await collection.saveTx();

    Zotero.Prefs.set("mock-isolation-key", "present");

    assert.equal(item.id, 1);
    assert.equal(collection.id, 1);
    assert.equal(
      Zotero.Items.get(item.id)?.getField("title"),
      "Mock Isolation Parent",
    );
    assert.equal(
      Zotero.Collections.get(collection.id)?.name,
      "Mock Isolation Collection",
    );
    assert.equal(Zotero.Prefs.get("mock-isolation-key"), "present");
  });

  it("does not retain items collections or prefs from the previous test", function () {
    assert.isUndefined(Zotero.Items.get(1));
    assert.isUndefined(Zotero.Collections.get(1));
    assert.isUndefined(Zotero.Prefs.get("mock-isolation-key"));
    assert.equal(
      Zotero.Prefs.get("extensions.zotero.zotero-skills.workflowDir"),
      "",
    );

    resetZoteroMockStateForTests();

    assert.isUndefined(Zotero.Items.get(1));
    assert.isUndefined(Zotero.Collections.get(1));
    assert.isUndefined(Zotero.Prefs.get("mock-isolation-key"));
    assert.equal(
      Zotero.Prefs.get("extensions.zotero.zotero-skills.workflowDir"),
      "",
    );
  });
});

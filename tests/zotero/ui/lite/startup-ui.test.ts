import { assert } from "chai";
import { config } from "../../../../package.json";

describe("Zotero UI startup", function () {
  it("mounts the workflow menu in the real main window", function () {
    const win = Zotero.getMainWindow();
    assert.isOk(win);
    assert.isOk(
      win?.document.getElementById(`${config.addonRef}-workflows-menu`),
    );
  });
});

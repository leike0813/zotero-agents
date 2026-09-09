import { assert } from "chai";
import { config } from "../../package.json";

describe("startup", function () {
  it("should have plugin instance defined", function () {
    if (!Zotero?.[config.addonInstance]) {
      this.skip();
    }
    assert.isNotEmpty(Zotero[config.addonInstance]);
  });
});

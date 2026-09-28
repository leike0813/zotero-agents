import "../../../runtime/247-pi-turn-preparation.test";

describe("Pi Turn Preparation in real Zotero", function () {
  it("runs shared reconstruction without Node", function () {
    if (!Zotero || typeof Zotero.getTempDirectory !== "function") {
      throw new Error("real Zotero host required");
    }
    if (
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node
    ) {
      throw new Error("Node runtime reached the plugin host");
    }
  });
});

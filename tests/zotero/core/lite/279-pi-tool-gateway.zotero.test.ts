import "../../../runtime/245-pi-tool-gateway.test";

describe("Pi Tool Gateway in real Zotero", function () {
  it("runs shared policy and lifecycle behavior without Node", function () {
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

import "../../../runtime/240-pi-runtime.test";
import "../../../runtime/275-pi-runtime-lifecycle.test";

describe("PiRuntime browser host", function () {
  it("runs the shared faux turn in Zotero without a Node runtime", function () {
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

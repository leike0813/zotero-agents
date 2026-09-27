import { joinNativePath } from "../../../../src/platform/path";
import { removeRuntimePath } from "../../../../src/modules/runtimePersistence";
import { piOwnerPersistenceSharedTests } from "../../../runtime/piOwnerPersistenceShared";

describe("Pi owner persistence in Zotero", function () {
  let root: string;
  beforeEach(function () {
    if (!Zotero || typeof Zotero.getTempDirectory !== "function") this.skip();
    if (
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node
    ) {
      throw new Error("Node runtime reached Zotero host");
    }
    root = joinNativePath(
      String(Zotero.getTempDirectory().path),
      `pi-owner-${Date.now()}-${Math.random()}`,
    );
  });
  afterEach(async function () {
    if (root) await removeRuntimePath(root);
  });
  piOwnerPersistenceSharedTests(() => root);
});

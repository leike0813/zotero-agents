import { joinPath } from "../../../../src/utils/path";
import { removeRuntimePath } from "../../../../src/modules/runtimePersistence";
import { piRuntimeAuditSharedTests } from "../../../runtime/piRuntimeAuditShared";

describe("Pi Runtime Audit in Zotero", function () {
  let root: string;
  beforeEach(function () {
    if (!Zotero || typeof Zotero.getTempDirectory !== "function") this.skip();
    if (
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node
    )
      throw new Error("Node runtime reached Zotero host");
    root = joinPath(
      String(Zotero.getTempDirectory().path),
      `pi-audit-${Date.now()}-${Math.random()}`,
    );
  });
  afterEach(async function () {
    if (root) await removeRuntimePath(root);
  });
  piRuntimeAuditSharedTests(() => root);
});

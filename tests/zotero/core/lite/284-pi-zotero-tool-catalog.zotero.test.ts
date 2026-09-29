import { assert } from "chai";
import "../../../runtime/250-pi-zotero-tool-catalog.test";
import { freezePiToolGatewayTurn } from "../../../../src/modules/piToolGateway";
import { createZoteroNativeToolDefinitions } from "../../../../src/modules/zoteroNativeToolCatalog";
import { createZoteroHostCapabilityBroker } from "../../../../src/modules/zoteroHostCapabilityBroker";
import { createPiTrustedNativeExecution } from "../../../../src/modules/piTrustedNativeExecution";
import {
  ensureRuntimeDirectoryStrict,
  readRuntimeTextFileStrict,
  removeRuntimePath,
} from "../../../../src/modules/runtimePersistence";
import { assertWorkflowHostStrictJsonValue } from "../../../../src/workflows/workflowHostErrorContract";
import { joinPath } from "../../../../src/utils/path";
import type { CurrentViewDto } from "../../../../src/workflows/types";

describe("Pi Zotero Native Tool Catalog in real Zotero", function () {
  it("reads the live current view through Broker and Gateway without Node", async function () {
    assert.isUndefined(
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node,
    );
    const mainWindow = Zotero.getMainWindow();
    assert.isOk(mainWindow?.ZoteroPane);
    const gateway = await freezePiToolGatewayTurn({
      owner: { kind: "conversation", ownerId: "real-zotero" },
      turnId: "read-current-view",
      definitions: [
        ...createZoteroNativeToolDefinitions({
          broker: createZoteroHostCapabilityBroker(() => mainWindow),
          workspace: {
            materializeOrReuseMany: async () => {
              throw new Error("unused");
            },
            beginGeneratedTextOutput: async () => {
              throw new Error("unused");
            },
          },
        }),
      ],
      policy: {
        mode: "interactive",
        systemAllowedEffects: ["bounded-read"],
        authorizedEffects: ["bounded-read"],
        authorizedKeys: [],
        maxCalls: 1,
        maxConcurrent: 1,
        maxCost: 1,
      },
      runtimeCapability: {
        identity: "real-zotero",
        availableCapabilityIds: ["context.get_current_view"],
      },
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async () => undefined,
        recordPermission: async () => undefined,
      },
    });
    const result = (
      await gateway.executeBatch([
        {
          callId: "read-view",
          name: "zotero_context_get_current_view",
          arguments: {},
        },
      ])
    ).results[0];
    assert.equal(result.status, "completed", result.failure?.code);
    assertWorkflowHostStrictJsonValue(result.value);
    assert.include(
      ["library", "reader"],
      (result.value as CurrentViewDto).target,
    );
  });

  it("pages the live library and commits one annotation export to the owner workspace", async function () {
    const workspaceRoot = joinPath(
      Zotero.getTempDirectory().path,
      `pi-zotero-read-${Date.now()}`,
    );
    await ensureRuntimeDirectoryStrict(workspaceRoot);
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Pi read tool canary");
    await parent.saveTx();
    try {
      const workspace = await createPiTrustedNativeExecution({
        workspaceRoot,
        ownerRoot: joinPath(workspaceRoot, ".owner"),
        mode: "restricted",
      });
      const broker = createZoteroHostCapabilityBroker(() =>
        Zotero.getMainWindow(),
      );
      const definitions = createZoteroNativeToolDefinitions({
        broker,
        workspace,
      });
      const context = {
        signal: new AbortController().signal,
        onUpdate: () => undefined,
      };
      const list = await definitions
        .find((tool) => tool.capabilityId === "library.list_items")!
        .execute(
          { libraryId: Zotero.Libraries.userLibraryID, limit: 1 },
          context,
        );
      assert.equal(list.status, "completed", list.code);
      assertWorkflowHostStrictJsonValue(list.value);
      const exported = await definitions
        .find((tool) => tool.capabilityId === "library.export_annotations")!
        .execute(
          { ref: { libraryId: parent.libraryID, key: parent.key } },
          context,
        );
      assert.equal(exported.status, "completed", exported.code);
      const artifact = (exported.value as { artifact: { path: string } })
        .artifact;
      assert.include(artifact.path, workspaceRoot);
      assert.isString(await readRuntimeTextFileStrict(artifact.path));
    } finally {
      await Zotero.Items.trashTx([parent.id]);
      await removeRuntimePath(workspaceRoot).catch(() => false);
    }
  });
});

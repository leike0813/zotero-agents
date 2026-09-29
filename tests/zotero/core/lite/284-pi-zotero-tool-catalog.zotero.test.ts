import { assert } from "chai";
import "../../../runtime/250-pi-zotero-tool-catalog.test";
import { freezePiToolGatewayTurn } from "../../../../src/modules/piToolGateway";
import { createZoteroNativeToolDefinitions } from "../../../../src/modules/zoteroNativeToolCatalog";
import { createZoteroHostCapabilityBroker } from "../../../../src/modules/zoteroHostCapabilityBroker";
import { assertWorkflowHostStrictJsonValue } from "../../../../src/workflows/workflowHostErrorContract";
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
        ...createZoteroNativeToolDefinitions(
          createZoteroHostCapabilityBroker(() => mainWindow),
        ),
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
});

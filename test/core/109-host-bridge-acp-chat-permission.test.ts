import { assert } from "chai";
import {
  configureHostBridgeGlobalApprovalHandlerForTests,
  HostBridgePermissionError,
  requestHostBridgePermission,
  resetHostBridgePermissionManagerForTests,
} from "../../src/modules/hostBridgePermissionManager";
import {
  registerAcpConversationHostBridgePermissionHandler,
  resetAcpConversationHostBridgePermissionHandlersForTests,
} from "../../src/modules/acpConversationHostBridgePermissionRegistry";

describe("Host Bridge ACP Chat approval routing", function () {
  beforeEach(function () {
    resetAcpConversationHostBridgePermissionHandlersForTests();
    resetHostBridgePermissionManagerForTests();
  });

  afterEach(function () {
    resetAcpConversationHostBridgePermissionHandlersForTests();
    resetHostBridgePermissionManagerForTests();
  });

  it("routes acp-chat scoped approvals to the ACP Chat permission handler", async function () {
    let capturedTitle = "";
    let capturedSource = "";
    registerAcpConversationHostBridgePermissionHandler(
      "chat-conversation-1",
      (request) => {
        capturedTitle = request.toolTitle;
        capturedSource = String(request.source || "");
        request.resolve({
          outcome: "selected",
          optionId: "approve_once",
        });
      },
    );

    const decision = await requestHostBridgePermission({
      action: "mutation.execute",
      title: "Approve Zotero write?",
      summary: "Update one Zotero item.",
      source: "host-bridge-cli",
      scope: {
        kind: "acp-chat",
        requestId: "chat-conversation-1",
      },
      timeoutMs: 1000,
    });

    assert.strictEqual(decision.outcome, "approved");
    assert.strictEqual(decision.channel, "acp-chat");
    assert.strictEqual(capturedTitle, "Approve Zotero write?");
    assert.strictEqual(capturedSource, "host-bridge-cli");
  });

  it("does not fall back to global prompts for unavailable ACP Chat approval UI", async function () {
    let globalCalls = 0;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      globalCalls += 1;
      return {
        outcome: "approved",
        requestId: request.requestId,
        channel: "global",
      };
    });

    let thrown: unknown;
    try {
      await requestHostBridgePermission({
        action: "mutation.execute",
        title: "Approve Zotero write?",
        summary: "Update one Zotero item.",
        source: "host-bridge-cli",
        scope: {
          kind: "acp-chat",
          requestId: "missing-chat-conversation",
        },
        timeoutMs: 1000,
      });
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, HostBridgePermissionError);
    assert.strictEqual(
      (thrown as HostBridgePermissionError).code,
      "permission_ui_unavailable",
    );
    assert.strictEqual(
      (thrown as HostBridgePermissionError).decision.channel,
      "acp-chat",
    );
    assert.strictEqual(globalCalls, 0);
  });
});

import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { materializeHostBridgeCliRunInjection } from "../../src/modules/hostBridgeCliInjection";

async function mkTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-host-bridge-chat-profile-"));
}

describe("Host Bridge CLI ACP Chat profile scope", function () {
  it("keeps the shared profile owner-neutral and injects ACP Chat scope per adapter", async function () {
    const root = await mkTempRoot();
    const first = await materializeHostBridgeCliRunInjection({
      workspaceDir: root,
      requestId: "chat-conversation-1",
      scopeKind: "acp-chat",
      ensureServer: async () =>
        ({
          status: "running",
          protocol: "host-bridge.v2",
          endpoint: "http://127.0.0.1:26570/bridge/v2",
        }) as any,
      getToken: () => "secret-token",
      resolveCli: async () => ({
        available: false,
        code: "cli_binary_unavailable",
        message: "CLI missing",
      }),
    });
    const second = await materializeHostBridgeCliRunInjection({
      workspaceDir: root,
      requestId: "chat-conversation-2",
      scopeKind: "acp-chat",
      ensureServer: async () =>
        ({
          status: "running",
          protocol: "host-bridge.v2",
          endpoint: "http://127.0.0.1:26570/bridge/v2",
        }) as any,
      getToken: () => "secret-token",
      resolveCli: async () => ({
        available: false,
        code: "cli_binary_unavailable",
        message: "CLI missing",
      }),
    });

    const profile = JSON.parse(await fs.readFile(second.profilePath, "utf8"));
    assert.strictEqual(first.profilePath, second.profilePath);
    assert.notProperty(profile, "scope");
    assert.deepEqual(JSON.parse(first.env.ZOTERO_BRIDGE_SCOPE), {
      kind: "acp-chat",
      requestId: "chat-conversation-1",
      runId: "chat-conversation-1",
    });
    assert.deepEqual(JSON.parse(second.env.ZOTERO_BRIDGE_SCOPE), {
      kind: "acp-chat",
      requestId: "chat-conversation-2",
      runId: "chat-conversation-2",
    });
    assert.notInclude(JSON.stringify(profile), "secret-token");
  });
});

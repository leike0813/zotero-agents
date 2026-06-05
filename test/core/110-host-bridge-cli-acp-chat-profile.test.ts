import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { materializeHostBridgeCliRunInjection } from "../../src/modules/hostBridgeCliInjection";

async function mkTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-host-bridge-chat-profile-"));
}

describe("Host Bridge CLI ACP Chat profile scope", function () {
  it("materializes ACP Chat Host Bridge CLI profile with acp-chat approval scope", async function () {
    const root = await mkTempRoot();
    const injection = await materializeHostBridgeCliRunInjection({
      workspaceDir: root,
      requestId: "chat-conversation-1",
      scopeKind: "acp-chat",
      ensureServer: async () =>
        ({
          status: "running",
          protocol: "host-bridge.v1",
          endpoint: "http://127.0.0.1:26570/bridge/v1",
        }) as any,
      getToken: () => "secret-token",
      resolveCli: async () => ({
        available: false,
        code: "cli_binary_unavailable",
        message: "CLI missing",
      }),
    });

    const profile = JSON.parse(
      await fs.readFile(injection.profilePath, "utf8"),
    );

    assert.strictEqual(profile.scope.kind, "acp-chat");
    assert.strictEqual(profile.scope.requestId, "chat-conversation-1");
    assert.strictEqual(profile.scope.runId, "chat-conversation-1");
    assert.notInclude(JSON.stringify(profile), "secret-token");
  });
});

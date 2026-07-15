import { assert } from "chai";
import { drainAcpRuntimeReplayPublication } from "../../src/modules/acpRuntimeReplayPublicationSidecar";
import {
  closeAssistantWorkspaceSidebar,
  forceAssistantWorkspaceDiagnosticsPublication,
  getAssistantWorkspaceReplayState,
  inspectAssistantWorkspaceDiagnosticsPublication,
  openAssistantWorkspaceSidebar,
} from "../../src/modules/assistantWorkspaceSidebar";

function hasRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: { __parity?: { runtime?: string } };
  };
  return Boolean(
    runtime.Zotero && runtime.Zotero.__parity?.runtime !== "node-mock",
  );
}

describe("ACP Replay publication in the Zotero runtime", function () {
  it("confirms ACP Chat and ACP Skills snapshots through the real nested Workspace frames", async function () {
    if (!hasRealZoteroRuntime()) {
      this.skip();
    }
    this.timeout(30_000);
    const previous = getAssistantWorkspaceReplayState();
    try {
      for (const tab of ["acp-chat", "acp-skills"] as const) {
        const opened = await openAssistantWorkspaceSidebar({
          tab,
          target: previous.target,
        });
        assert.isTrue(opened, `${tab} Workspace did not open`);
        const options = { tab };
        const result = await drainAcpRuntimeReplayPublication({
          tab,
          timeoutMs: 10_000,
          inspect: () =>
            inspectAssistantWorkspaceDiagnosticsPublication(options),
          forcePublish: () =>
            forceAssistantWorkspaceDiagnosticsPublication(options),
        });
        assert.deepEqual(result, { ok: true }, tab);
      }
    } finally {
      if (!previous.open) {
        closeAssistantWorkspaceSidebar();
      } else {
        const restored = await openAssistantWorkspaceSidebar({
          tab: previous.tab,
          target: previous.target,
        });
        assert.isTrue(restored, "previous Workspace state was not restored");
      }
    }
  });
});

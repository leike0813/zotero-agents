import { assert } from "chai";
import { setDebugModeOverrideForTests } from "../../../../src/modules/debugMode";
import { drainAcpRuntimeReplayPublication } from "../../../../src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar";
import { createAcpRuntimeReplayTarget } from "../../../../src/modules/acp/diagnostics/acpRuntimeReplayTargets";
import {
  closeAssistantWorkspaceSidebar,
  forceAssistantWorkspaceDiagnosticsPublication,
  getAssistantWorkspaceReplayState,
  inspectAssistantWorkspaceDiagnosticsPublication,
  openAssistantWorkspaceSidebar,
} from "../../../../src/modules/assistant/workspace/assistantWorkspaceSidebar";

describe("ACP Replay publication in the Zotero runtime", function () {
  beforeEach(function () {
    setDebugModeOverrideForTests(true);
  });

  afterEach(function () {
    setDebugModeOverrideForTests(undefined);
  });

  it("keeps publications valid when nested Workspace frames close and reopen", async function () {
    this.timeout(30_000);
    const previous = getAssistantWorkspaceReplayState();
    try {
      for (const tab of ["acp-chat", "acp-skills"] as const) {
        const replayTarget = await createAcpRuntimeReplayTarget({
          sourceKind:
            tab === "acp-chat"
              ? "acp-chat-conversation"
              : "acp-workflow-execution",
          syntheticRootId: `zotero-workspace-reopen-${tab}-${Date.now()}`,
        });
        try {
          await replayTarget.activate();
          assert.isTrue(
            await openAssistantWorkspaceSidebar({
              tab,
              target: previous.target,
            }),
            `${tab} Workspace did not open`,
          );
          const options = { tab };
          const drain = () =>
            drainAcpRuntimeReplayPublication({
              tab,
              timeoutMs: 10_000,
              inspect: () =>
                inspectAssistantWorkspaceDiagnosticsPublication(options),
              forcePublish: () =>
                forceAssistantWorkspaceDiagnosticsPublication(options),
            });
          assert.deepEqual(await drain(), { ok: true }, `${tab}/initial`);

          const target = getAssistantWorkspaceReplayState().target;
          assert.isTrue(
            closeAssistantWorkspaceSidebar(),
            `${tab} did not close`,
          );
          assert.isTrue(
            await openAssistantWorkspaceSidebar({ tab, target }),
            `${tab} Workspace did not reopen`,
          );
          assert.deepEqual(await drain(), { ok: true }, `${tab}/reopened`);
        } finally {
          await replayTarget.cleanup();
        }
      }
    } finally {
      if (!previous.open) {
        closeAssistantWorkspaceSidebar();
      } else {
        assert.isTrue(
          await openAssistantWorkspaceSidebar({
            tab: previous.tab,
            target: previous.target,
          }),
          "previous Workspace state was not restored",
        );
      }
    }
  });
});

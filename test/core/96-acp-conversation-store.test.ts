import {
  ACP_OPENCODE_BACKEND_ID,
  PLUGIN_TASK_DOMAIN_ACP,
  assert,
  getPluginTaskRequestEntry,
  listAcpChatSessions,
  listPluginTaskRowEntries,
  loadAcpConversationState,
  replacePluginTaskRowEntries,
  resetPluginStateStoreForTests,
  resolveAcpChatRuntimePaths,
  upsertPluginTaskRequestEntry,
} from "../helpers/acpSessionManagerHarness";
import { saveAcpConversationState } from "../../src/modules/acpConversationStore";
import { createEmptyAcpConversationSnapshot } from "../../src/modules/acpTypes";

describe("acp conversation store", function () {
  afterEach(function () {
    resetPluginStateStoreForTests();
    delete (Zotero as typeof Zotero & { DataDirectory?: unknown })
      .DataDirectory;
  });

  it("removes legacy per-backend conversation storage instead of migrating transcript rows", function () {
    const legacyRequestId = `conversation:${ACP_OPENCODE_BACKEND_ID}`;
    upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
      requestId: legacyRequestId,
      backendId: ACP_OPENCODE_BACKEND_ID,
      state: "connected",
      updatedAt: "2026-04-25T01:00:00.000Z",
      payload: JSON.stringify({
        conversationId: "legacy-conversation",
        conversationTitle: "Legacy Chat",
        sessionId: "legacy-remote-session",
        status: "connected",
        updatedAt: "2026-04-25T01:00:00.000Z",
      }),
    });
    replacePluginTaskRowEntries(PLUGIN_TASK_DOMAIN_ACP, "active", [
      {
        taskId: "legacy-user",
        requestId: legacyRequestId,
        backendId: ACP_OPENCODE_BACKEND_ID,
        state: "complete",
        updatedAt: "2026-04-25T01:00:00.000Z",
        payload: JSON.stringify({
          id: "legacy-user",
          kind: "message",
          role: "user",
          text: "Legacy hello",
          createdAt: "2026-04-25T01:00:00.000Z",
          state: "complete",
        }),
      },
    ]);

    const restored = loadAcpConversationState(ACP_OPENCODE_BACKEND_ID);
    assert.equal(restored.snapshot.conversationId, "");
    assert.equal(restored.snapshot.sessionId, "");
    assert.equal(restored.snapshot.remoteSessionId, "");
    assert.lengthOf(restored.items, 0);
    assert.lengthOf(listAcpChatSessions(ACP_OPENCODE_BACKEND_ID), 0);
    assert.isNull(
      getPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, legacyRequestId),
    );
    assert.isFalse(
      listPluginTaskRowEntries(PLUGIN_TASK_DOMAIN_ACP, "active").some(
        (entry) => entry.requestId === legacyRequestId,
      ),
    );
  });

  it("resolves ACP chat workspace, private storage, and runtime paths from the runtime root", function () {
    const previousRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = "D:\\ZoteroSkillsRuntime";
    try {
      const primary = resolveAcpChatRuntimePaths(ACP_OPENCODE_BACKEND_ID);
      assert.equal(
        primary.agentWorkspaceDir,
        "D:\\ZoteroSkillsRuntime\\runtime\\acp\\chat\\workspace",
      );
      assert.equal(primary.workspaceDir, primary.agentWorkspaceDir);
      assert.equal(
        primary.conversationStorageDir,
        "D:\\ZoteroSkillsRuntime\\runtime\\acp\\chat\\conversations\\acp-opencode",
      );
      assert.equal(primary.storageDir, primary.conversationStorageDir);
      assert.equal(primary.runtimeDir, primary.conversationStorageDir);

      const withConversation = resolveAcpChatRuntimePaths(
        ACP_OPENCODE_BACKEND_ID,
        "conversation-1",
      );
      assert.equal(
        withConversation.agentWorkspaceDir,
        "D:\\ZoteroSkillsRuntime\\runtime\\acp\\chat\\workspace",
      );
      assert.equal(
        withConversation.conversationStorageDir,
        "D:\\ZoteroSkillsRuntime\\runtime\\acp\\chat\\conversations\\acp-opencode\\conversation-1",
      );
      assert.equal(
        withConversation.runtimeDir,
        withConversation.conversationStorageDir,
      );
      assert.equal(
        withConversation.diagnosticsAuditPath,
        `${withConversation.conversationStorageDir}\\diagnostics.ndjson`,
      );
      assert.isFalse(
        withConversation.conversationStorageDir.startsWith(
          `${withConversation.agentWorkspaceDir}\\`,
        ),
      );
    } finally {
      if (typeof previousRoot === "undefined") {
        delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
      } else {
        process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRoot;
      }
    }
  });

  it("keeps transient diagnostics out of conversation persistence and legacy hydration", function () {
    const conversationId = "diagnostic-persistence-boundary";
    const requestId = `conversation:${ACP_OPENCODE_BACKEND_ID}:${conversationId}`;
    const snapshot = createEmptyAcpConversationSnapshot();
    snapshot.backendId = ACP_OPENCODE_BACKEND_ID;
    snapshot.conversationId = conversationId;
    snapshot.conversationTitle = "Business title";
    snapshot.sessionId = "remote-session";
    snapshot.remoteSessionId = "remote-session";
    snapshot.status = "connected";
    snapshot.lastError = "business-visible error";
    snapshot.showDiagnostics = true;
    snapshot.diagnostics = [
      {
        id: "diagnostic-1",
        ts: "2026-07-17T00:00:00.000Z",
        kind: "jsonrpc_trace",
        level: "info",
        message: "trace",
        detail: "method=session/update",
      },
    ];
    snapshot.stderrTail = "stderr evidence";
    snapshot.lastLifecycleEvent = "jsonrpc_trace";

    saveAcpConversationState(snapshot);

    const saved = getPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, requestId);
    const savedPayload = JSON.parse(String(saved?.payload || "{}"));
    assert.notProperty(savedPayload, "diagnostics");
    assert.notProperty(savedPayload, "stderrTail");
    assert.notProperty(savedPayload, "lastLifecycleEvent");
    assert.equal(savedPayload.sessionId, "remote-session");
    assert.equal(savedPayload.lastError, "business-visible error");
    assert.isTrue(savedPayload.showDiagnostics);

    upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
      requestId,
      backendId: ACP_OPENCODE_BACKEND_ID,
      state: "connected",
      updatedAt: "2026-07-17T00:00:01.000Z",
      payload: JSON.stringify({
        ...savedPayload,
        diagnostics: snapshot.diagnostics,
        stderrTail: snapshot.stderrTail,
        lastLifecycleEvent: snapshot.lastLifecycleEvent,
      }),
    });

    const restored = loadAcpConversationState(
      ACP_OPENCODE_BACKEND_ID,
      conversationId,
    ).snapshot;
    assert.equal(restored.sessionId, "");
    assert.equal(restored.remoteSessionId, "remote-session");
    assert.equal(restored.lastError, "business-visible error");
    assert.isTrue(restored.showDiagnostics);
    assert.deepEqual(restored.diagnostics, []);
    assert.equal(restored.stderrTail, "");
    assert.equal(restored.lastLifecycleEvent, "");
  });

  it("resolves ACP session cwd to the shared ACP chat workspace", function () {
    const previousRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = "D:\\ZoteroSkillsRuntime";
    (
      Zotero as typeof Zotero & { DataDirectory?: { dir?: string } }
    ).DataDirectory = {
      dir: "D:\\ZoteroData",
    };
    try {
      assert.equal(
        resolveAcpChatRuntimePaths(ACP_OPENCODE_BACKEND_ID).workspaceDir,
        "D:\\ZoteroSkillsRuntime\\runtime\\acp\\chat\\workspace",
      );
    } finally {
      delete (Zotero as typeof Zotero & { DataDirectory?: unknown })
        .DataDirectory;
      if (typeof previousRoot === "undefined") {
        delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
      } else {
        process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRoot;
      }
    }
  });
});

import {
  ACP_OPENCODE_BACKEND_ID,
  ACP_PROMPT_REQUEST_KIND,
  AcpAuthRequiredError,
  FakeAcpConnectionAdapter,
  PLUGIN_TASK_DOMAIN_ACP,
  acpChatTranscriptPageKey,
  archiveAcpConversation,
  assert,
  authenticateAcpConversation,
  buildAcpDiagnosticsBundle,
  buildAcpPromptTextForTests,
  cancelAcpConversationPrompt,
  config,
  configureNoAcpBackendForTests,
  configureZoteroMcpServerForTests,
  connectAcpConversation,
  createAcpChatWorkspaceOwner,
  createAcpBackendFromPreset,
  createBackendsPrefsDocument,
  deleteActiveAcpConversation,
  disconnectAcpConversation,
  fs,
  getAcpChatTranscriptMirrorDiagnosticsForTests,
  getAcpConversationSnapshot,
  getAcpConversationUiSnapshot,
  getAcpFrontendSnapshot,
  getPluginTaskRequestEntry,
  installAcpSessionManagerTestHooks,
  isPureAcpChatBackgroundChange,
  joinPath,
  listAcpChatSessions,
  loadAcpConversationState,
  os,
  path,
  prepareAcpChatPanelSnapshot,
  readAcpChatWorkspacePublication,
  resolveAcpChatWorkspacePublicationKinds,
  readActiveTranscriptItems,
  readAcpConversationTranscriptPage,
  readTranscriptItemsForConversation,
  reconnectAcpConversation,
  refreshAcpConversationBackends,
  resetAcpSessionManagerForTests,
  resetPluginStateStoreForTests,
  renameAcpConversation,
  resolveAcpChatRuntimePaths,
  resolveAcpConversationPermission,
  sendAcpConversationPrompt,
  setAcpConnectionAdapterFactoryForTests,
  setAcpConversationAutoApprovePermissions,
  setAcpConversationChatDisplayMode,
  setAcpConversationModel,
  setAcpConversationMode,
  setAcpConversationReasoningEffort,
  setActiveAcpBackend,
  setActiveAcpConversation,
  setAssistantStreamingRenderEnabled,
  setAssistantTranscriptPaginationVirtualizationEnabled,
  shouldPublishAcpChatWorkspaceChange,
  shutdownAcpSessionManager,
  startNewAcpConversation,
  subscribeAcpChatPanelSnapshots,
  subscribeAcpConversationSnapshots,
  subscribeAcpFrontendSnapshots,
  toggleAcpConversationStatusDetails,
  waitForAcpConversationSnapshot,
  waitForAcpConversationUiSnapshot,
  writeRegistrySkill,
  type AcpChatPanelSnapshotChange,
  type AcpConnectionAdapterFactoryArgs,
  type AcpPermissionOption,
  type AcpSessionConfigOption,
} from "../helpers/acpSessionManagerHarness";
import {
  enqueueAcpChatTranscriptEvent,
  readAcpChatTranscriptPage,
} from "../../src/modules/acpConversationTranscriptStore";
import { saveAcpConversationState } from "../../src/modules/acpConversationStore";
import { setAssistantExecutionDisplayMode } from "../../src/modules/assistantExecutionDisplayPolicy";

describe("acp session manager", function () {
  const harness = installAcpSessionManagerTestHooks();

  it("initializes empty ACP Chat counters and promotes legacy counters at the next prompt", async function () {
    await startNewAcpConversation();
    const emptyPanel = await prepareAcpChatPanelSnapshot({
      target: "library",
    });
    assert.equal((emptyPanel.messageCounts as any)?.completeness, "complete");
    assert.deepEqual((emptyPanel.messageCounts as any)?.current, {
      assistant: 0,
      thought: 0,
      tool: 0,
    });
    assert.deepEqual((emptyPanel.messageCounts as any)?.cumulative, {
      assistant: 0,
      thought: 0,
      tool: 0,
    });

    await sendAcpConversationPrompt({ message: "legacy count baseline" });
    const conversationId = getAcpConversationSnapshot().conversationId;
    const legacy = loadAcpConversationState(
      ACP_OPENCODE_BACKEND_ID,
      conversationId,
    ).snapshot;
    legacy.messageCounts = undefined;
    saveAcpConversationState(legacy);

    resetAcpSessionManagerForTests();
    await setActiveAcpConversation({
      backendId: ACP_OPENCODE_BACKEND_ID,
      conversationId,
    });
    assert.equal(getAcpConversationSnapshot().conversationId, conversationId);
    assert.equal(
      (getAcpConversationSnapshot().messageCounts as any)?.completeness,
      "unavailable",
    );
    await sendAcpConversationPrompt({ message: "first observed epoch" });
    const promoted = getAcpConversationSnapshot().messageCounts as any;
    assert.equal(promoted?.completeness, "complete");
    assert.deepEqual(promoted?.current, promoted?.cumulative);
    const promotedPanel = await prepareAcpChatPanelSnapshot({
      target: "library",
    });
    assert.equal(
      (promotedPanel.messageCounts as any)?.completeness,
      "complete",
    );

    const persisted = loadAcpConversationState(
      ACP_OPENCODE_BACKEND_ID,
      conversationId,
    ).snapshot.messageCounts as any;
    assert.equal(persisted?.completeness, "complete");
    assert.deepEqual(persisted?.current, persisted?.cumulative);

    resetAcpSessionManagerForTests();
    await setActiveAcpConversation({
      backendId: ACP_OPENCODE_BACKEND_ID,
      conversationId,
    });
    const restored = getAcpConversationSnapshot().messageCounts as any;
    assert.equal(restored?.completeness, "complete");
    assert.deepEqual(restored?.cumulative, persisted?.cumulative);
  });

  it("persists only user and final assistant content for a silent prompt", async function () {
    setAssistantExecutionDisplayMode("silent");
    await sendAcpConversationPrompt({ message: "silent result" });

    const items = await readActiveTranscriptItems();
    assert.deepEqual(
      items.map((entry) => entry.kind),
      ["message", "message"],
    );
    assert.equal((items[1] as { text?: string }).text, "Echo: silent result");
    const panel = await prepareAcpChatPanelSnapshot({ target: "library" });
    assert.equal(panel.executionDisplayMode, "silent");
    assert.deepEqual((panel.messageCounts as any)?.current, {
      assistant: 1,
      thought: 1,
      tool: 1,
    });
    assert.isFalse((panel.messageCounts as any)?.active);
  });

  it("seals visible history and never backfills content across silent transitions", async function () {
    await connectAcpConversation();
    const sessionId = getAcpConversationSnapshot().sessionId;
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "visible before" },
      },
    });

    setAssistantExecutionDisplayMode("silent");
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "omitted" },
      },
    });
    setAssistantExecutionDisplayMode("live");
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "visible after" },
      },
    });

    const messages = (await readActiveTranscriptItems()).filter(
      (entry) => entry.kind === "message" && entry.role === "assistant",
    );
    assert.deepEqual(
      messages.map((entry) => (entry as { text?: string }).text),
      ["visible before", "visible after"],
    );
    assert.equal((messages[0] as { state?: string }).state, "complete");
  });

  it("flushes only the requested conversation transcript owner", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-acp-chat-owner-"));
    const first = path.join(root, "first");
    const second = path.join(root, "second");
    try {
      for (const [storageDir, itemId] of [
        [first, "first-item"],
        [second, "second-item"],
      ] as const) {
        enqueueAcpChatTranscriptEvent({
          conversationStorageDir: storageDir,
          op: "upsert_item",
          itemId,
          item: {
            id: itemId,
            kind: "message",
            role: "assistant",
            text: itemId,
            state: "complete",
            createdAt: new Date(0).toISOString(),
          },
        });
      }

      const firstPage = await readAcpChatTranscriptPage({
        conversationStorageDir: first,
      });
      assert.deepEqual(
        firstPage.items.map((item) => item.id),
        ["first-item"],
      );
      let secondExists = true;
      try {
        await fs.access(path.join(second, "transcript.jsonl"));
      } catch {
        secondExists = false;
      }
      assert.isFalse(secondExists);

      const secondPage = await readAcpChatTranscriptPage({
        conversationStorageDir: second,
      });
      assert.deepEqual(
        secondPage.items.map((item) => item.id),
        ["second-item"],
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("upserts tool calls by id and does not roll completed back to pending", async function () {
    await connectAcpConversation();

    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "completed",
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "pending",
      },
    });

    const toolItems = (await readActiveTranscriptItems()).filter(
      (entry) => entry.kind === "tool_call" && entry.toolCallId === "tool-1",
    );
    assert.lengthOf(toolItems, 1);
    assert.deepInclude(toolItems[0], {
      title: "Inspect notes",
      state: "completed",
    });
  });

  it("keeps distinct tool call ids as separate transcript items", async function () {
    await connectAcpConversation();

    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "pending",
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "completed",
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-2",
        title: "Read metadata",
        kind: "read",
        status: "pending",
      },
    });

    const toolItems = (await readActiveTranscriptItems()).filter(
      (entry) => entry.kind === "tool_call",
    );
    assert.lengthOf(toolItems, 2);
    assert.sameMembers(
      toolItems.map((entry) => entry.toolCallId),
      ["tool-1", "tool-2"],
    );
    assert.deepInclude(
      toolItems.find((entry) => entry.toolCallId === "tool-1") || {},
      {
        state: "completed",
      },
    );
  });

  it("keeps informative tool summaries from explicit summary or call details", async function () {
    await connectAcpConversation();

    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-summary",
        title: "Tool Call",
        kind: "other",
        status: "pending",
        input: {
          path: "artifact/todo_memo.md",
          limit: 20,
        },
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-summary",
        title: "Tool Call",
        kind: "other",
        status: "completed",
      },
    });

    const toolItem = (await readActiveTranscriptItems()).find(
      (entry) =>
        entry.kind === "tool_call" && entry.toolCallId === "tool-summary",
    );
    assert.equal(toolItem?.toolName, "Tool");
    assert.include(
      String(toolItem?.inputSummary || ""),
      "artifact/todo_memo.md",
    );
    assert.include(String(toolItem?.summary || ""), "artifact/todo_memo.md");
    assert.notEqual(toolItem?.summary, "Tool Call");
  });

  it("keeps the first tool call summary when later updates arrive", async function () {
    await connectAcpConversation();

    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-first-summary",
        title: "Tool Call",
        kind: "read",
        status: "pending",
        input: {
          path: "first-call.md",
        },
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-first-summary",
        title: "Tool Call",
        kind: "read",
        status: "completed",
        summary: "Later result text should not replace call args",
      },
    });

    const toolItem = (await readActiveTranscriptItems()).find(
      (entry) =>
        entry.kind === "tool_call" && entry.toolCallId === "tool-first-summary",
    );
    assert.include(String(toolItem?.inputSummary || ""), "first-call.md");
    assert.include(String(toolItem?.resultSummary || ""), "Later result");
    assert.include(String(toolItem?.summary || ""), "first-call.md");
    assert.notInclude(String(toolItem?.summary || ""), "Later result");
  });

  it("normalizes common ACP tool fields into tool name and frozen input summary", async function () {
    await connectAcpConversation();

    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-normalized",
        title: "Tool Call",
        kind: "other",
        status: "pending",
        summary: "[]",
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-normalized",
        title: "Tool Call",
        status: "in_progress",
        function_name: "read_file",
        arguments: {
          path: "artifact/todo_memo.md",
        },
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-normalized",
        title: "Tool Call",
        status: "completed",
        output: "read file completed",
      },
    });

    const toolItem = (await readActiveTranscriptItems()).find(
      (entry) =>
        entry.kind === "tool_call" && entry.toolCallId === "tool-normalized",
    );
    assert.equal(toolItem?.toolName, "read_file");
    assert.include(
      String(toolItem?.inputSummary || ""),
      "artifact/todo_memo.md",
    );
    assert.equal(toolItem?.resultSummary, "read file completed");
    assert.notEqual(toolItem?.inputSummary, "[]");
    assert.notInclude(String(toolItem?.summary || ""), "read file completed");
  });

  it("starts a new assistant message when a tool region appears between chunks", async function () {
    await connectAcpConversation();

    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: "First assistant region.",
        },
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-boundary",
        title: "Inspect boundary",
        kind: "read",
        status: "pending",
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: "Second assistant region.",
        },
      },
    });

    const assistantItems = (await readActiveTranscriptItems()).filter(
      (entry) => entry.kind === "message" && entry.role === "assistant",
    );
    assert.lengthOf(assistantItems, 2);
    assert.deepEqual(
      assistantItems.map((entry) => entry.text),
      ["First assistant region.", "Second assistant region."],
    );
  });

  it("coalesces ACP Chat assistant message chunks across tool_call_update side-channels", async function () {
    await connectAcpConversation();

    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: "I'll read the batch file",
        },
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-side-channel",
        title: "Read",
        kind: "read",
        status: "completed",
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-side-channel",
        title: "Read",
        kind: "read",
        status: "completed",
        output: "done",
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: " first.",
        },
      },
    });

    const transcript = await readActiveTranscriptItems();
    const assistantItems = transcript.filter(
      (entry) => entry.kind === "message" && entry.role === "assistant",
    );
    assert.lengthOf(assistantItems, 1);
    assert.equal(assistantItems[0].text, "I'll read the batch file first.");
    assert.isTrue(
      transcript.some(
        (entry) =>
          entry.kind === "tool_call" &&
          entry.toolCallId === "tool-side-channel",
      ),
    );
  });

  it("keeps streaming text out of snapshots while appending transcript chunks", async function () {
    await connectAcpConversation();

    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "First " },
      },
    });
    assert.lengthOf(getAcpConversationSnapshot().items, 0);
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "second" },
      },
    });

    const snapshot = getAcpConversationSnapshot();
    const assistantItems = (await readActiveTranscriptItems()).filter(
      (entry) => entry.kind === "message" && entry.role === "assistant",
    );
    assert.lengthOf(snapshot.items, 0);
    assert.isAtLeast(snapshot.transcriptRevision, 2);
    assert.lengthOf(assistantItems, 1);
    assert.equal(assistantItems[0].text, "First second");
  });

  it("starts a new thought when assistant output appears between thought chunks", async function () {
    await connectAcpConversation();

    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_thought_chunk",
        content: {
          type: "text",
          text: "First thought region.",
        },
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: "Visible assistant output.",
        },
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_thought_chunk",
        content: {
          type: "text",
          text: "Second thought region.",
        },
      },
    });

    const thoughtItems = (await readActiveTranscriptItems()).filter(
      (entry) => entry.kind === "thought",
    );
    assert.lengthOf(thoughtItems, 2);
    assert.deepEqual(
      thoughtItems.map((entry) => entry.text),
      ["First thought region.", "Second thought region."],
    );
  });

  it("keeps same-id tool updates as one region without adding duplicates", async function () {
    await connectAcpConversation();

    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "pending",
      },
    });
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "completed",
      },
    });

    const snapshot = getAcpConversationSnapshot();
    const items = await readActiveTranscriptItems();
    const toolItems = items.filter((entry) => entry.kind === "tool_call");
    assert.lengthOf(toolItems, 1);
    assert.equal(items[items.length - 1]?.id, toolItems[0]?.id);
    assert.deepInclude(toolItems[0], {
      toolCallId: "tool-1",
      state: "completed",
    });
  });

  it("omits Zotero MCP guidance from default ACP prompts without leaking raw host context", function () {
    const promptText = buildAcpPromptTextForTests("Inspect Zotero", {
      target: "library",
      libraryId: "1",
      selectionEmpty: false,
      currentItem: {
        id: 42,
        key: "ITEMKEY",
        title: "Private Item Title",
      },
    });

    assert.include(promptText, "Inspect Zotero");
    assert.notInclude(promptText, "[Zotero MCP tool usage]");
    assert.notInclude(promptText, 'MCP server named "zotero"');
    assert.notInclude(promptText, "get_current_view");
    assert.notInclude(promptText, "search_items");
    assert.notInclude(promptText, "zotero.get_current_view");
    assert.notInclude(promptText, "zotero.search_items");
    assert.notInclude(
      promptText,
      "Never write directly to Zotero's SQLite database",
    );
    assert.notInclude(promptText, "[Zotero host context]");
    assert.notInclude(promptText, "Private Item Title");
    assert.notInclude(promptText, '"selectionEmpty"');
  });

  it("keeps Zotero MCP guidance available for explicit compatibility prompts", function () {
    const promptText = buildAcpPromptTextForTests("Inspect Zotero", undefined, {
      mcpCompatibilityMode: "explicit_descriptor_injection",
    });

    assert.include(promptText, "[Zotero MCP tool usage]");
    assert.include(promptText, 'MCP server named "zotero"');
    assert.include(promptText, "get_current_view");
    assert.include(promptText, "search_items");
    assert.include(
      promptText,
      "Never write directly to Zotero's SQLite database",
    );
  });

  it("creates an ACP session on demand, merges streamed assistant chunks, and persists transcript state", async function () {
    const dataDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-acp-data-"),
    );
    const userSkillRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-acp-chat-skills-"),
    );
    const previousSkillDir = Zotero.Prefs.get(
      `${config.prefsPrefix}.skillDir`,
      true,
    );
    (
      Zotero as typeof Zotero & { DataDirectory?: { dir?: string } }
    ).DataDirectory = {
      dir: dataDirectory,
    };
    try {
      Zotero.Prefs.set(`${config.prefsPrefix}.skillDir`, userSkillRoot, true);
      await writeRegistrySkill({
        root: userSkillRoot,
        skillId: "zotero-bridge-cli",
        body: "# User Zotero Bridge CLI\n\nUSER ZOTERO BRIDGE OVERRIDE",
      });
      await writeRegistrySkill({
        root: userSkillRoot,
        skillId: "literature-search-ingest",
        body: "# User Literature Search Ingest\n\nUSER LSI OVERRIDE",
      });
      await writeRegistrySkill({
        root: userSkillRoot,
        skillId: "literature-metadata-search",
        body: "# User Literature Metadata Search\n\nUSER LMS OVERRIDE",
      });
      const chatWorkspaceDir = resolveAcpChatRuntimePaths(
        ACP_OPENCODE_BACKEND_ID,
      ).agentWorkspaceDir;
      await writeRegistrySkill({
        root: path.join(chatWorkspaceDir, ".claude", "skills"),
        skillId: "zotero-bridge-cli",
        body: "# Stale Claude Copy\n\nOLD CLAUDE COPY",
      });

      await sendAcpConversationPrompt({
        message: "Hello ACP",
        hostContext: {
          target: "library",
          selectionEmpty: true,
        },
      });

      const snapshot = getAcpConversationSnapshot();
      assert.equal(snapshot.backendId, ACP_OPENCODE_BACKEND_ID);
      assert.equal(snapshot.status, "connected");
      assert.equal(snapshot.commandLabel, "npx -y opencode-ai@latest acp");
      assert.equal(snapshot.commandLine, "npx -y opencode-ai@latest acp");
      assert.equal(snapshot.agentLabel, "OpenCode");
      assert.equal(snapshot.agentVersion, "1.2.3");
      const expectedStoragePaths = resolveAcpChatRuntimePaths(
        ACP_OPENCODE_BACKEND_ID,
        snapshot.conversationId,
      );
      assert.equal(
        snapshot.agentWorkspaceDir,
        expectedStoragePaths.agentWorkspaceDir,
      );
      assert.equal(
        snapshot.conversationStorageDir,
        expectedStoragePaths.conversationStorageDir,
      );
      assert.equal(snapshot.sessionCwd, expectedStoragePaths.agentWorkspaceDir);
      assert.equal(
        snapshot.workspaceDir,
        expectedStoragePaths.agentWorkspaceDir,
      );
      assert.equal(snapshot.lastLifecycleEvent, "prompt_finished");
      assert.equal(snapshot.sessionId, "session-1");
      assert.equal(snapshot.remoteSessionId, "session-1");
      assert.equal(snapshot.sessionTitle, "OpenCode session");
      assert.equal(snapshot.sessionUpdatedAt, "2026-04-22T01:23:45.000Z");
      assert.equal(snapshot.lastStopReason, "end_turn");
      assert.deepEqual(snapshot.currentMode, {
        id: "code",
        label: "Code",
        description: "Act directly",
      });
      assert.deepEqual(snapshot.currentModel, {
        id: "gpt-5.4",
        label: "GPT-5.4",
        description: "Default model",
      });
      assert.lengthOf(snapshot.availableCommands, 1);
      assert.deepEqual(snapshot.usage, {
        used: 1200,
        size: 8000,
      });
      const transcriptItems = await readActiveTranscriptItems();
      assert.isAtLeast(transcriptItems.length, 5);
      assert.deepInclude(
        transcriptItems.find(
          (entry) => entry.kind === "message" && entry.role === "user",
        ) || {},
        {
          role: "user",
          text: "Hello ACP",
        },
      );
      assert.deepInclude(
        transcriptItems.find((entry) => entry.kind === "thought") || {},
        {
          text: "Checking the workspace and planning the next step.",
        },
      );
      assert.deepInclude(
        transcriptItems.find((entry) => entry.kind === "tool_call") || {},
        {
          title: "Inspect notes",
          state: "completed",
        },
      );
      const plan = transcriptItems.find((entry) => entry.kind === "plan") as
        | { entries?: Array<{ status?: string }> }
        | undefined;
      assert.deepEqual(
        plan?.entries?.map((entry) => entry.status),
        ["completed", "skipped"],
      );
      assert.deepInclude(
        transcriptItems.find(
          (entry) => entry.kind === "message" && entry.role === "assistant",
        ) || {},
        {
          role: "assistant",
          text: "Echo: Hello ACP",
        },
      );
      assert.isAtLeast(snapshot.diagnostics.length, 4);
      assert.isOk(harness.lastAdapter);
      assert.isOk(harness.lastFactoryArgs);
      assert.equal(harness.lastAdapter?.initializeCalls, 1);
      assert.deepEqual(harness.lastAdapter?.sessionIds, ["session-1"]);
      assert.equal(harness.lastAdapter?.prompts.length, 1);
      assert.include(harness.lastAdapter?.prompts[0] || "", "Hello ACP");
      assert.include(
        harness.lastAdapter?.prompts[0] || "",
        "[Zotero Agents ACP Chat startup context]",
      );
      assert.include(
        harness.lastAdapter?.prompts[0] || "",
        "zotero-bridge-cli",
      );
      assert.notInclude(
        harness.lastAdapter?.prompts[0] || "",
        "[Zotero Host Bridge CLI]",
      );
      const expectedSkillRootSuffixes = [
        [".agents", "skills"],
        [".codex", "skills"],
        [".claude", "skills"],
        [".gemini", "skills"],
        [".qwen", "skills"],
        [".kilo", "skills"],
      ];
      for (const rootSuffix of expectedSkillRootSuffixes) {
        const root = joinPath(
          expectedStoragePaths.agentWorkspaceDir,
          ...rootSuffix,
        );
        const chatWrapperSkill = await fs.readFile(
          joinPath(root, "zotero-bridge-cli", "SKILL.md"),
          "utf8",
        );
        assert.include(chatWrapperSkill, "USER ZOTERO BRIDGE OVERRIDE");
        assert.notInclude(chatWrapperSkill, "OLD CLAUDE COPY");
        const literatureSearchIngestSkill = await fs.readFile(
          joinPath(root, "literature-search-ingest", "SKILL.md"),
          "utf8",
        );
        assert.include(literatureSearchIngestSkill, "USER LSI OVERRIDE");
        const literatureMetadataSearchSkill = await fs.readFile(
          joinPath(root, "literature-metadata-search", "SKILL.md"),
          "utf8",
        );
        assert.include(literatureMetadataSearchSkill, "USER LMS OVERRIDE");
      }
      assert.isOk(
        snapshot.diagnostics.find(
          (entry) => entry.kind === "acp_chat_injected_skills_ready",
        ),
      );
      assert.isString(
        harness.lastFactoryArgs?.backend.env?.ZOTERO_BRIDGE_PROFILE,
      );
      assert.include(
        harness.lastFactoryArgs?.backend.env?.ZOTERO_BRIDGE_PROFILE || "",
        ".zotero-bridge",
      );
      assert.equal(
        harness.lastFactoryArgs?.agentWorkspaceDir,
        expectedStoragePaths.agentWorkspaceDir,
      );
      assert.equal(
        harness.lastFactoryArgs?.sessionCwd,
        expectedStoragePaths.agentWorkspaceDir,
      );
      assert.equal(
        harness.lastFactoryArgs?.workspaceDir,
        expectedStoragePaths.agentWorkspaceDir,
      );
      assert.equal(
        harness.lastFactoryArgs?.runtimeDir,
        expectedStoragePaths.runtimeDir,
      );

      const persisted = loadAcpConversationState(ACP_OPENCODE_BACKEND_ID);
      assert.equal(persisted.snapshot.sessionId, "");
      assert.equal(persisted.snapshot.remoteSessionId, "session-1");
      assert.equal(
        persisted.snapshot.commandLabel,
        "npx -y opencode-ai@latest acp",
      );
      assert.equal(
        persisted.snapshot.commandLine,
        "npx -y opencode-ai@latest acp",
      );
      assert.equal(persisted.snapshot.agentLabel, "OpenCode");
      assert.equal(persisted.snapshot.currentMode?.id, "code");
      assert.equal(persisted.snapshot.currentModel?.id, "gpt-5.4");
      assert.equal(persisted.snapshot.lastStopReason, "end_turn");
      assert.equal(
        persisted.snapshot.agentWorkspaceDir,
        expectedStoragePaths.agentWorkspaceDir,
      );
      assert.equal(
        persisted.snapshot.conversationStorageDir,
        expectedStoragePaths.conversationStorageDir,
      );
      assert.equal(
        persisted.snapshot.sessionCwd,
        expectedStoragePaths.agentWorkspaceDir,
      );
      assert.isAtLeast(persisted.snapshot.transcriptItemCount, 5);
      const persistedItems = await readTranscriptItemsForConversation(
        snapshot.conversationId,
      );
      assert.equal(
        persistedItems.find(
          (entry) => entry.kind === "message" && entry.role === "assistant",
        )?.text,
        "Echo: Hello ACP",
      );
    } finally {
      if (typeof previousSkillDir === "undefined") {
        Zotero.Prefs.clear(`${config.prefsPrefix}.skillDir`, true);
      } else {
        Zotero.Prefs.set(
          `${config.prefsPrefix}.skillDir`,
          previousSkillDir,
          true,
        );
      }
      await fs.rm(dataDirectory, { recursive: true, force: true });
      await fs.rm(userSkillRoot, { recursive: true, force: true });
    }
  });

  it("prepends ACP Chat startup preamble only to the first conversation prompt", async function () {
    await sendAcpConversationPrompt({ message: "First startup prompt" });
    await sendAcpConversationPrompt({ message: "Second ordinary prompt" });

    assert.lengthOf(harness.lastAdapter?.prompts || [], 2);
    assert.include(
      harness.lastAdapter?.prompts[0] || "",
      "[Zotero Agents ACP Chat startup context]",
    );
    assert.include(harness.lastAdapter?.prompts[0] || "", "ACP Chat assistant");
    assert.include(harness.lastAdapter?.prompts[0] || "", "zotero-bridge-cli");
    assert.include(
      harness.lastAdapter?.prompts[0] || "",
      "First startup prompt",
    );
    assert.notInclude(
      harness.lastAdapter?.prompts[1] || "",
      "[Zotero Agents ACP Chat startup context]",
    );
    assert.include(
      harness.lastAdapter?.prompts[1] || "",
      "Second ordinary prompt",
    );
  });

  it("hydrates a cold selected ACP chat conversation into the foreground snapshot", async function () {
    await sendAcpConversationPrompt({
      message: "Cold hydrate chat transcript",
    });
    const previousConversationId = getAcpConversationSnapshot().conversationId;

    await startNewAcpConversation();
    assert.lengthOf(getAcpConversationUiSnapshot().items, 0);

    await setActiveAcpConversation({ conversationId: previousConversationId });
    const initial = getAcpConversationUiSnapshot();
    assert.equal(initial.conversationId, previousConversationId);

    const ready = await waitForAcpConversationUiSnapshot((snapshot) =>
      snapshot.items.some(
        (entry) =>
          entry.kind === "message" &&
          entry.role === "user" &&
          entry.text === "Cold hydrate chat transcript",
      ),
    );
    assert.isTrue(
      ready.items.some(
        (entry) =>
          entry.kind === "message" &&
          entry.role === "assistant" &&
          entry.text.length > 0,
      ),
    );
  });

  it("keeps the foreground transcript after disconnect and restores it without a cold loading gap", async function () {
    await sendAcpConversationPrompt({
      message: "Disconnect hydrate transcript",
    });
    const firstConversationId = getAcpConversationSnapshot().conversationId;

    await disconnectAcpConversation({ conversationId: firstConversationId });
    const disconnected = getAcpConversationUiSnapshot();
    assert.equal(disconnected.conversationId, firstConversationId);
    assert.equal(disconnected.status, "idle");
    assert.isNotEmpty(disconnected.remoteSessionId);
    const disconnectedControl = await readAcpChatWorkspacePublication({
      owner: createAcpChatWorkspaceOwner(
        getAcpFrontendSnapshot().activeBackendId,
        firstConversationId,
      ),
      publicationKind: "owner-control",
    });
    assert.isFalse(disconnectedControl?.connection.connected);
    assert.isTrue(disconnectedControl?.connection.canConnect);
    assert.isFalse(disconnectedControl?.connection.canDisconnect);
    assert.isTrue(
      disconnected.items.some(
        (entry) =>
          entry.kind === "message" &&
          entry.role === "user" &&
          entry.text === "Disconnect hydrate transcript",
      ),
    );

    await startNewAcpConversation();
    await setActiveAcpConversation({ conversationId: firstConversationId });
    const ready = getAcpConversationUiSnapshot();
    assert.equal(ready.conversationId, firstConversationId);
    assert.isTrue(
      ready.items.some(
        (entry) =>
          entry.kind === "message" &&
          entry.role === "user" &&
          entry.text === "Disconnect hydrate transcript",
      ),
    );
  });

  it("emits typed ACP chat text mutations while preserving the final transcript", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.streamingChunkCount = 100;
      return harness.lastAdapter;
    });
    let liveTextMutationCount = 0;
    const unsubscribe = subscribeAcpChatPanelSnapshots((change) => {
      liveTextMutationCount += (change.transcriptEvents || []).filter(
        (event) => event.boundary === "text-continuation",
      ).length;
    });

    await sendAcpConversationPrompt({
      message: "stream many chunks",
    });
    await new Promise((resolve) => setTimeout(resolve, 120));
    unsubscribe();

    const assistant = (await readActiveTranscriptItems()).find(
      (entry) => entry.kind === "message" && entry.role === "assistant",
    );
    assert.equal(assistant?.text.length, 100);
    assert.isAbove(liveTextMutationCount, 0);
    assert.equal(
      getAcpConversationUiSnapshot().items.find(
        (entry) => entry.kind === "message" && entry.role === "assistant",
      )?.text.length,
      100,
    );
    assert.equal(
      (await readActiveTranscriptItems()).find(
        (entry) => entry.kind === "message" && entry.role === "assistant",
      )?.text.length,
      100,
    );
  });

  it("publishes ACP chat first streaming chunks through the selected snapshot", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.streamingChunkCount = 2;
      return harness.lastAdapter;
    });
    await sendAcpConversationPrompt({
      message: "stream two chunks",
    });
    await new Promise((resolve) => setTimeout(resolve, 120));
    const snapshotAssistant = getAcpConversationUiSnapshot().items.find(
      (entry) => entry.kind === "message" && entry.role === "assistant",
    );
    assert.equal(snapshotAssistant?.text, "01");
    assert.equal(
      (await readActiveTranscriptItems()).find(
        (entry) => entry.kind === "message" && entry.role === "assistant",
      )?.text,
      "01",
    );
    assert.lengthOf(getAcpConversationSnapshot().items, 0);
  });

  it("reads ACP chat transcript pages with stable scope metadata", async function () {
    await sendAcpConversationPrompt({
      message: "transcript page scope metadata",
    });

    const snapshot = getAcpConversationSnapshot();
    const page = await readAcpConversationTranscriptPage({
      backendId: snapshot.backendId,
      conversationId: snapshot.conversationId,
      limit: 2,
    });

    assert.equal(page.backendId, snapshot.backendId);
    assert.equal(page.conversationId, snapshot.conversationId);
    assert.equal(
      page.requestId,
      `${snapshot.backendId}\n${snapshot.conversationId}`,
    );
    assert.equal(page.limit, 2);
    assert.equal(page.eventSeq, snapshot.transcriptEventSeq);
    assert.equal(page.transcriptRevision, snapshot.transcriptRevision);
    assert.isAtLeast(page.total, page.items.length);
    assert.isAtLeast(page.items.length, 1);
  });

  it("reads explicit background ACP chat transcript pages without switching active conversation", async function () {
    await sendAcpConversationPrompt({
      message: "background transcript page",
    });
    const backgroundConversationId =
      getAcpConversationSnapshot().conversationId;

    await startNewAcpConversation();
    await sendAcpConversationPrompt({
      message: "active transcript page",
    });
    const activeSnapshot = getAcpConversationSnapshot();
    assert.notEqual(activeSnapshot.conversationId, backgroundConversationId);

    const page = await readAcpConversationTranscriptPage({
      backendId: ACP_OPENCODE_BACKEND_ID,
      conversationId: backgroundConversationId,
      limit: 200,
    });

    assert.equal(page.conversationId, backgroundConversationId);
    assert.equal(
      getAcpConversationSnapshot().conversationId,
      activeSnapshot.conversationId,
    );
    const pageText = page.items
      .map((entry) => ("text" in entry ? entry.text : ""))
      .join("\n");
    assert.include(pageText, "background transcript page");
    assert.notInclude(pageText, "active transcript page");
  });

  it("waits for target ACP chat transcript writes before reading a page", async function () {
    await connectAcpConversation();
    const snapshot = getAcpConversationSnapshot();
    assert.isNotEmpty(snapshot.sessionId);

    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: snapshot.sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: "target pending page flush",
        },
      },
    } as any);

    const page = await readAcpConversationTranscriptPage({
      backendId: snapshot.backendId,
      conversationId: snapshot.conversationId,
      limit: 200,
    });
    const assistant = page.items.find(
      (entry) => entry.kind === "message" && entry.role === "assistant",
    );
    assert.include(assistant?.text || "", "target pending page flush");
  });

  it("preserves ACP chat transcript page boundary metadata", async function () {
    await sendAcpConversationPrompt({
      message: "transcript page boundaries",
    });
    const snapshot = getAcpConversationSnapshot();
    const all = await readAcpConversationTranscriptPage({
      backendId: snapshot.backendId,
      conversationId: snapshot.conversationId,
      limit: 200,
    });
    assert.isAtLeast(all.total, 3);

    const tail = await readAcpConversationTranscriptPage({
      backendId: snapshot.backendId,
      conversationId: snapshot.conversationId,
      limit: 2,
    });
    assert.equal(tail.limit, 2);
    assert.equal(tail.total, all.total);
    assert.equal(tail.cursor, Math.max(0, all.total - 2));
    assert.isUndefined(tail.nextCursor);
    assert.equal(tail.prevCursor, Math.max(0, tail.cursor - 2));
    assert.lengthOf(tail.items, Math.min(2, all.total));

    const first = await readAcpConversationTranscriptPage({
      backendId: snapshot.backendId,
      conversationId: snapshot.conversationId,
      cursor: 0,
      limit: 2,
    });
    assert.equal(first.limit, 2);
    assert.equal(first.cursor, 0);
    assert.isUndefined(first.prevCursor);
    assert.equal(first.nextCursor, 2);
    assert.lengthOf(first.items, 2);
  });

  it("returns plan-only ACP chat structural UI snapshots without changing default full reads", async function () {
    await sendAcpConversationPrompt({
      message: "structural snapshot",
    });
    const full = await waitForAcpConversationUiSnapshot(
      (snapshot) =>
        snapshot.items.some((entry) => entry.kind === "plan") &&
        snapshot.items.some(
          (entry) => entry.kind === "message" && entry.role === "assistant",
        ) &&
        snapshot.items.some((entry) => entry.kind === "tool_call"),
    );

    const structural = getAcpConversationUiSnapshot(undefined, undefined, {
      itemMode: "structural",
    });
    assert.isAtLeast(full.items.length, 4);
    assert.isAtLeast(structural.items.length, 1);
    assert.deepEqual(
      structural.items.map((entry) => entry.kind),
      ["plan"],
    );
    assert.equal(structural.transcriptRevision, full.transcriptRevision);
    assert.equal(structural.transcriptItemCount, full.transcriptItemCount);
    assert.equal(structural.transcriptPreview, full.transcriptPreview);

    const frontend = getAcpFrontendSnapshot({ itemMode: "structural" });
    assert.deepEqual(
      frontend.activeSnapshot?.items.map((entry) => entry.kind),
      ["plan"],
    );

    const defaultFull = getAcpConversationUiSnapshot();
    assert.isOk(
      defaultFull.items.find(
        (entry) => entry.kind === "message" && entry.role === "assistant",
      ),
    );
    assert.isOk(defaultFull.items.find((entry) => entry.kind === "tool_call"));
  });

  it("keeps ACP chat structural reads plan-only after structural publish with a loaded mirror", async function () {
    await sendAcpConversationPrompt({
      message: "structural publish",
    });
    const full = await waitForAcpConversationUiSnapshot((snapshot) =>
      snapshot.items.some((entry) => entry.kind === "tool_call"),
    );
    assert.isOk(full.items.find((entry) => entry.kind === "message"));
    assert.isOk(full.items.find((entry) => entry.kind === "tool_call"));

    const sessionId = getAcpConversationSnapshot().sessionId;
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "plan",
        entries: [
          {
            content: "Keep this structural plan only",
            status: "in_progress",
          },
        ],
      },
    } as any);

    const structural = getAcpConversationUiSnapshot(undefined, undefined, {
      itemMode: "structural",
    });
    assert.isAtLeast(structural.items.length, 1);
    assert.isTrue(structural.items.every((entry) => entry.kind === "plan"));
    assert.include(
      structural.items
        .flatMap(
          (entry) =>
            (entry as { entries?: Array<{ content?: string }> }).entries || [],
        )
        .map((entry) => entry.content || "")
        .join("\n"),
      "structural plan",
    );
    assert.notOk(structural.items.find((entry) => entry.kind === "message"));
    assert.notOk(structural.items.find((entry) => entry.kind === "tool_call"));

    const frontend = getAcpFrontendSnapshot({ itemMode: "structural" });
    assert.isTrue(
      (frontend.activeSnapshot?.items || []).every(
        (entry) => entry.kind === "plan",
      ),
    );
  });

  it("prepares ACP chat panel read-model snapshots with structural items and a selected page", async function () {
    setAssistantTranscriptPaginationVirtualizationEnabled(true);
    await sendAcpConversationPrompt({
      message: "panel read-model selected page",
    });
    const active = getAcpConversationSnapshot();

    const panel = await prepareAcpChatPanelSnapshot({ target: "library" });

    assert.equal(panel.transcriptPaginationVirtualizationEnabled, true);
    assert.equal(panel.executionDisplayMode, "live");
    assert.equal(panel.backendAvailability, "selected");
    assert.equal(panel.conversationAvailability, "selected");
    assert.equal(panel.activeBackendId, active.backendId);
    assert.equal(panel.activeConversationId, active.conversationId);
    assert.isTrue(
      ((panel.items as Array<{ kind?: string }> | undefined) || []).every(
        (entry) => entry.kind === "plan",
      ),
    );
    const selectedPage = panel.transcriptRegion.page as
      | {
          pageKey: string;
          items: unknown[];
        }
      | undefined;
    assert.isOk(selectedPage);
    assert.equal(
      selectedPage?.pageKey,
      `${acpChatTranscriptPageKey(active.backendId, active.conversationId)}\ntail:80`,
    );
    assert.isAtLeast(selectedPage?.items.length || 0, 1);
  });

  it("keeps ACP chat panel chrome when selected page reads fail", async function () {
    setAssistantTranscriptPaginationVirtualizationEnabled(true);
    await sendAcpConversationPrompt({
      message: "panel read-model page failure",
    });
    const active = getAcpConversationSnapshot();

    const panel = await prepareAcpChatPanelSnapshot({
      target: "library",
      readTranscriptPage: async () => {
        throw new Error("synthetic page read failure");
      },
    });

    assert.equal(panel.activeBackendId, active.backendId);
    assert.equal(panel.activeConversationId, active.conversationId);
    assert.equal(panel.backendAvailability, "selected");
    assert.equal(panel.conversationAvailability, "selected");
    assert.equal(panel.transcriptPaginationVirtualizationEnabled, true);
    assert.equal(panel.transcriptRegion.status, "failed");
    assert.isNull(panel.transcriptRegion.page);
    assert.isAtLeast(
      ((panel.backendChatSessions as unknown[]) || []).length,
      1,
    );
  });

  it("prepares a disabled ACP chat panel snapshot when no ACP backend exists", async function () {
    configureNoAcpBackendForTests();
    resetAcpSessionManagerForTests();
    setAssistantTranscriptPaginationVirtualizationEnabled(true);

    let pageReadCount = 0;
    const panel = await prepareAcpChatPanelSnapshot({
      target: "library",
      readTranscriptPage: async () => {
        pageReadCount += 1;
        throw new Error("empty backend scope must not read a page");
      },
    });

    assert.equal(panel.backendAvailability, "none");
    assert.equal(panel.conversationAvailability, "none");
    assert.equal(panel.activeBackendId, "");
    assert.equal(panel.activeConversationId, "");
    assert.deepEqual(panel.backendOptions, []);
    assert.deepEqual(panel.chatSessions, []);
    assert.deepEqual(panel.backendChatSessions, []);
    assert.equal(panel.transcriptRegion.status, "idle");
    assert.isNull(panel.transcriptRegion.page);
    assert.equal(pageReadCount, 0);
  });

  it("does not read an ACP chat transcript page when no conversation is selected", async function () {
    setAssistantTranscriptPaginationVirtualizationEnabled(true);
    await refreshAcpConversationBackends();

    let pageReadCount = 0;
    const panel = await prepareAcpChatPanelSnapshot({
      target: "library",
      readTranscriptPage: async () => {
        pageReadCount += 1;
        throw new Error("empty conversation scope must not read a page");
      },
    });

    assert.equal(panel.backendAvailability, "selected");
    assert.equal(panel.conversationAvailability, "none");
    assert.equal(panel.activeBackendId, ACP_OPENCODE_BACKEND_ID);
    assert.equal(panel.activeConversationId, "");
    assert.equal(panel.conversationId, "");
    assert.equal(panel.transcriptRegion.status, "idle");
    assert.isNull(panel.transcriptRegion.page);
    assert.equal(pageReadCount, 0);
  });

  it("returns ACP chat selected pages from the store while the cold mirror is loading", async function () {
    setAssistantTranscriptPaginationVirtualizationEnabled(true);
    await sendAcpConversationPrompt({
      message: "Panel mirror loading source",
    });
    const firstConversationId = getAcpConversationSnapshot().conversationId;

    await disconnectAcpConversation({ conversationId: firstConversationId });
    await startNewAcpConversation();
    await setActiveAcpConversation({ conversationId: firstConversationId });

    let pageReadCount = 0;
    const panel = await prepareAcpChatPanelSnapshot({
      target: "library",
      readTranscriptPage: async (request) => {
        pageReadCount += 1;
        return readAcpConversationTranscriptPage(request);
      },
    });

    assert.equal(panel.activeConversationId, firstConversationId);
    assert.equal(panel.transcriptRegion.status, "ready");
    assert.isTrue(
      (
        (
          panel.transcriptRegion.page as
            | { items?: Array<{ itemKind?: string; text?: string }> }
            | undefined
        )?.items || []
      ).some(
        (item) =>
          item.itemKind === "message" &&
          String(item.text || "").includes("Panel mirror loading source"),
      ),
    );
    assert.equal(pageReadCount, 1);
  });

  it("selects ACP Chat cold conversations owner-first before page-first hydrate", async function () {
    resetAcpSessionManagerForTests();
    setAssistantTranscriptPaginationVirtualizationEnabled(true);
    await sendAcpConversationPrompt({
      message: "ACP Chat owner-first cold transcript",
    });
    const coldConversationId = getAcpConversationSnapshot().conversationId;

    await disconnectAcpConversation({ conversationId: coldConversationId });
    for (let index = 0; index < 11; index += 1) {
      await startNewAcpConversation();
      await sendAcpConversationPrompt({
        message: `ACP Chat owner-first eviction filler ${index}`,
      });
      await disconnectAcpConversation({
        conversationId: getAcpConversationSnapshot().conversationId,
      });
    }
    await setActiveAcpConversation({ conversationId: coldConversationId });

    const selectedDiagnostics = getAcpChatTranscriptMirrorDiagnosticsForTests({
      conversationId: coldConversationId,
    });
    assert.equal(selectedDiagnostics.mirrorLoaded, false);
    assert.notEqual(selectedDiagnostics.hydrateState, "loading");
    assert.equal(selectedDiagnostics.hydrateInFlight, false);

    let pageReadCount = 0;
    const loadingPanel = await prepareAcpChatPanelSnapshot({
      target: "library",
      transcriptReadMode: "loading-first",
      readTranscriptPage: async () => {
        pageReadCount += 1;
        throw new Error("loading-first must not read transcript pages");
      },
    });

    assert.equal(loadingPanel.activeConversationId, coldConversationId);
    assert.equal(loadingPanel.transcriptRegion.status, "loading");
    assert.isNull(loadingPanel.transcriptRegion.page);
    assert.equal(pageReadCount, 0);
    const afterLoadingDiagnostics =
      getAcpChatTranscriptMirrorDiagnosticsForTests({
        conversationId: coldConversationId,
      });
    assert.notEqual(afterLoadingDiagnostics.hydrateState, "loading");
    assert.equal(afterLoadingDiagnostics.hydrateInFlight, false);

    const pagePanel = await prepareAcpChatPanelSnapshot({
      target: "library",
      transcriptReadMode: "page-first",
      readTranscriptPage: async (request) => {
        pageReadCount += 1;
        return readAcpConversationTranscriptPage(request);
      },
    });

    assert.equal(pagePanel.activeConversationId, coldConversationId);
    assert.equal(pagePanel.transcriptRegion.status, "ready");
    assert.isTrue(
      (
        (
          pagePanel.transcriptRegion.page as
            | { items?: Array<{ itemKind?: string; text?: string }> }
            | undefined
        )?.items || []
      ).some(
        (item) =>
          item.itemKind === "message" &&
          String(item.text || "").includes("ACP Chat owner-first cold"),
      ),
    );
    assert.equal(pageReadCount, 1);
    const afterPageDiagnostics = getAcpChatTranscriptMirrorDiagnosticsForTests({
      conversationId: coldConversationId,
    });
    assert.isTrue(
      afterPageDiagnostics.mirrorLoaded ||
        afterPageDiagnostics.hydrateInFlight ||
        afterPageDiagnostics.hydrateState === "loading",
    );
  });

  it("keeps ACP Chat live transcript mirrors pinned while cold mirrors use a 10 slot LRU", async function () {
    setAssistantTranscriptPaginationVirtualizationEnabled(true);
    await sendAcpConversationPrompt({
      message: "ACP Chat live mirror stays pinned",
    });
    const liveConversationId = getAcpConversationSnapshot().conversationId;

    const coldConversationIds: string[] = [];
    for (let index = 0; index < 11; index += 1) {
      await startNewAcpConversation();
      await sendAcpConversationPrompt({
        message: `ACP Chat cold mirror ${index}`,
      });
      const conversationId = getAcpConversationSnapshot().conversationId;
      coldConversationIds.push(conversationId);
      await disconnectAcpConversation({ conversationId });
    }

    assert.isTrue(
      getAcpChatTranscriptMirrorDiagnosticsForTests({
        conversationId: liveConversationId,
      }).mirrorLoaded,
    );
    assert.isFalse(
      getAcpChatTranscriptMirrorDiagnosticsForTests({
        conversationId: coldConversationIds[0],
      }).mirrorLoaded,
    );
    assert.isTrue(
      getAcpChatTranscriptMirrorDiagnosticsForTests({
        conversationId: coldConversationIds[10],
      }).mirrorLoaded,
    );
    assert.equal(
      getAcpChatTranscriptMirrorDiagnosticsForTests({
        conversationId: coldConversationIds[10],
      }).coldMirrorCacheSize,
      10,
    );
  });

  it("projects ACP chat selected pages through the streaming render policy", async function () {
    setAssistantTranscriptPaginationVirtualizationEnabled(true);
    setAssistantStreamingRenderEnabled(false);
    await reconnectAcpConversation();
    const sessionId = getAcpConversationSnapshot().sessionId;
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "agent_thought_chunk",
        content: { type: "text", text: "visible thinking" },
      },
    } as any);
    const thoughtOnlyPanel = await prepareAcpChatPanelSnapshot({
      target: "library",
    });
    const thoughtOnlyItems =
      (
        thoughtOnlyPanel.transcriptRegion.page as
          | {
              items?: Array<{
                itemKind?: string;
                text?: string;
              }>;
            }
          | undefined
      )?.items || [];
    assert.isUndefined(
      thoughtOnlyItems.find(
        (entry) =>
          entry.itemKind === "thought" && entry.text === "visible thinking",
      ),
    );

    await harness.lastAdapter?.emitSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "hidden partial" },
      },
    } as any);

    const canonical = await readActiveTranscriptItems();
    assert.isOk(
      canonical.find(
        (entry) =>
          entry.kind === "thought" &&
          entry.state === "complete" &&
          entry.text === "visible thinking",
      ),
    );
    assert.isOk(
      canonical.find(
        (entry) =>
          entry.kind === "message" &&
          entry.role === "assistant" &&
          entry.state === "streaming" &&
          entry.text === "hidden partial",
      ),
    );

    const hiddenPanel = await prepareAcpChatPanelSnapshot({
      target: "library",
    });
    const hiddenItems =
      (
        hiddenPanel.transcriptRegion.page as
          | {
              items?: Array<{
                itemKind?: string;
                role?: string;
                text?: string;
                toolCallId?: string;
              }>;
            }
          | undefined
      )?.items || [];
    assert.isUndefined(
      hiddenItems.find(
        (entry) =>
          entry.itemKind === "message" &&
          entry.role === "assistant" &&
          entry.text === "hidden partial",
      ),
    );
    assert.isOk(
      hiddenItems.find(
        (entry) =>
          entry.itemKind === "thought" && entry.text === "visible thinking",
      ) as unknown,
    );
    setAssistantStreamingRenderEnabled(true);
    const visiblePanel = await prepareAcpChatPanelSnapshot({
      target: "library",
    });
    const visibleItems =
      (
        visiblePanel.transcriptRegion.page as
          | {
              items?: Array<{
                itemKind?: string;
                role?: string;
                text?: string;
              }>;
            }
          | undefined
      )?.items || [];
    assert.isOk(
      visibleItems.find(
        (entry) =>
          entry.itemKind === "message" &&
          entry.role === "assistant" &&
          entry.text === "hidden partial",
      ),
    );

    setAssistantStreamingRenderEnabled(false);
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Read",
        status: "pending",
      },
    } as any);
    const boundaryPanel = await prepareAcpChatPanelSnapshot({
      target: "library",
    });
    const boundaryItems =
      (
        boundaryPanel.transcriptRegion.page as
          | {
              items?: Array<{
                itemKind?: string;
                role?: string;
                text?: string;
                toolCallId?: string;
              }>;
            }
          | undefined
      )?.items || [];
    assert.isOk(
      boundaryItems.find(
        (entry) =>
          entry.itemKind === "message" &&
          entry.role === "assistant" &&
          entry.text === "hidden partial",
      ),
    );
    assert.isOk(
      boundaryItems.find(
        (entry) =>
          entry.itemKind === "tool-call" && entry.toolCallId === "tool-1",
      ) as unknown,
    );
  });

  it("filters ACP chat panel appends through the streaming render preference", function () {
    const base = {
      activeTab: "acp-chat" as const,
      hasActiveTarget: true,
      transcriptPaginationVirtualizationEnabled: true,
      executionDisplayMode: "live" as const,
    };

    assert.isTrue(
      shouldPublishAcpChatWorkspaceChange(base, {
        active: true,
        kinds: ["status"],
      }),
    );
    assert.isTrue(
      shouldPublishAcpChatWorkspaceChange(base, {
        active: true,
        kinds: ["transcript-boundary"],
      }),
    );
    assert.isTrue(
      shouldPublishAcpChatWorkspaceChange(base, {
        active: true,
        kinds: ["transcript-append"],
      }),
    );
    assert.isFalse(
      shouldPublishAcpChatWorkspaceChange(
        {
          ...base,
          executionDisplayMode: "boundary" as const,
        },
        {
          active: true,
          kinds: ["transcript-append"],
        },
      ),
    );
    assert.isFalse(
      shouldPublishAcpChatWorkspaceChange(base, {
        active: false,
        kinds: ["transcript-append"],
      }),
    );
    assert.isTrue(
      isPureAcpChatBackgroundChange({
        active: false,
        kinds: ["transcript-append"],
      }),
    );
  });

  it("routes ACP chat changes to bounded owner-scoped publications", function () {
    const base = {
      activeTab: "acp-chat" as const,
      hasActiveTarget: true,
      transcriptPaginationVirtualizationEnabled: true,
      executionDisplayMode: "live" as const,
    };

    assert.deepEqual(
      resolveAcpChatWorkspacePublicationKinds(base, {
        backendId: "backend-a",
        conversationId: "conversation-a",
        active: true,
        kinds: ["message-counts"],
      }),
      ["message-counts"],
    );
    assert.deepEqual(
      resolveAcpChatWorkspacePublicationKinds(base, {
        backendId: "backend-a",
        conversationId: "conversation-a",
        active: true,
        kinds: ["transcript-append"],
      }),
      ["transcript"],
    );
    assert.deepEqual(
      resolveAcpChatWorkspacePublicationKinds(base, {
        backendId: "backend-a",
        conversationId: "conversation-a",
        active: true,
        kinds: ["status"],
      }),
      ["owner-control"],
    );
    assert.deepEqual(
      resolveAcpChatWorkspacePublicationKinds(base, {
        backendId: "backend-a",
        conversationId: "conversation-a",
        active: false,
        kinds: ["transcript-append"],
      }),
      [],
    );
  });

  it("builds canonical count and baseline regions without transcript state", async function () {
    await startNewAcpConversation();
    const active = getAcpFrontendSnapshot({ itemMode: "structural" });
    const owner = createAcpChatWorkspaceOwner(
      active.activeBackendId,
      active.activeConversationId,
    );
    const counts = await readAcpChatWorkspacePublication({
      owner,
      publicationKind: "message-counts",
    });
    assert.hasAllKeys(counts, ["counts"]);
    assert.isObject(counts?.counts);
    assert.notProperty(counts, "selectedTranscriptPage");
    assert.notProperty(counts, "transcriptRevision");

    const baseline = await readAcpChatWorkspacePublication({
      owner,
      publicationKind: "owner-control",
    });
    for (const field of [
      "selectedTranscriptPage",
      "transcriptState",
      "transcriptRevision",
      "transcriptEventSeq",
      "transcriptItemCount",
      "counts",
      "items",
    ]) {
      assert.notProperty(baseline, field);
    }
    assert.hasAllKeys(baseline, [
      "status",
      "busy",
      "hint",
      "connection",
      "execution",
      "authentication",
      "permissionPolicy",
    ]);
    assert.hasAllKeys(baseline?.connection, [
      "status",
      "sessionAvailable",
      "connected",
      "canConnect",
      "canDisconnect",
    ]);
    assert.hasAllKeys(baseline?.execution, ["canCancel", "canInterrupt"]);
    assert.hasAllKeys(baseline?.authentication, [
      "required",
      "canAuthenticate",
      "methodId",
    ]);
    assert.hasAllKeys(baseline?.permissionPolicy, [
      "autoApprove",
      "canSetAutoApprove",
    ]);
  });

  it("emits typed ACP chat panel snapshot changes from existing publish boundaries", async function () {
    const changes: AcpChatPanelSnapshotChange[] = [];
    const unsubscribe = subscribeAcpChatPanelSnapshots((change) => {
      changes.push(change);
    });

    await refreshAcpConversationBackends();
    await sendAcpConversationPrompt({
      message: "typed panel changes",
    });
    await new Promise((resolve) => setTimeout(resolve, 120));
    unsubscribe();

    const hasKind = (kind: AcpChatPanelSnapshotChange["kinds"][number]) =>
      changes.some((change) => (change.kinds || []).includes(kind));
    assert.isTrue(hasKind("backend"));
    assert.isTrue(hasKind("transcript-append"));
    assert.isTrue(hasKind("transcript-boundary"));
    assert.isTrue(hasKind("message-counts"));
    assert.isTrue(changes.some((change) => change.active === true));
    const transcriptEvents = changes.flatMap(
      (change) => change.transcriptEvents || [],
    );
    assert.isTrue(
      transcriptEvents.some((event) => event.boundary === "text-continuation"),
    );
    assert.isTrue(
      transcriptEvents.some((event) => event.boundary === "hard-boundary"),
    );
  });

  it("suppresses ACP chat text chunk UI notifications when streaming render is disabled", async function () {
    setAssistantStreamingRenderEnabled(false);
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.streamingChunkCount = 100;
      return harness.lastAdapter;
    });
    let snapshotCount = 0;
    let streamingAssistantSnapshotCount = 0;
    const unsubscribe = subscribeAcpConversationSnapshots((snapshot) => {
      snapshotCount += 1;
      if (
        snapshot.items.some(
          (entry) =>
            entry.kind === "message" &&
            entry.role === "assistant" &&
            entry.state === "streaming",
        )
      ) {
        streamingAssistantSnapshotCount += 1;
      }
    });

    await sendAcpConversationPrompt({
      message: "stream many chunks without rendering each chunk",
    });
    await new Promise((resolve) => setTimeout(resolve, 120));
    unsubscribe();

    const assistant = (await readActiveTranscriptItems()).find(
      (entry) => entry.kind === "message" && entry.role === "assistant",
    );
    assert.equal(assistant?.text.length, 100);
    assert.equal(assistant?.state, "complete");
    assert.equal(streamingAssistantSnapshotCount, 0);
    assert.isBelow(snapshotCount, 20);
    assert.equal(
      (await readActiveTranscriptItems()).find(
        (entry) => entry.kind === "message" && entry.role === "assistant",
      )?.text.length,
      100,
    );
  });

  it("keeps ACP chat usage updates from leaking partial text when streaming render is disabled", async function () {
    setAssistantStreamingRenderEnabled(false);
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.streamingChunkCount = 20;
      harness.lastAdapter.emitUsageAfterEachStreamingChunk = true;
      return harness.lastAdapter;
    });
    const partialLengths: number[] = [];
    const unsubscribe = subscribeAcpFrontendSnapshots((snapshot) => {
      const leakedStreaming = snapshot.activeSnapshot?.items.some(
        (entry) =>
          entry.kind === "message" &&
          entry.role === "assistant" &&
          entry.state === "streaming",
      );
      if (leakedStreaming) partialLengths.push(1);
    });

    await sendAcpConversationPrompt({
      message: "stream chunks with usage side channel disabled",
    });
    await new Promise((resolve) => setTimeout(resolve, 120));
    unsubscribe();

    assert.deepEqual(partialLengths, []);
    const assistant = (await readActiveTranscriptItems()).find(
      (entry) => entry.kind === "message" && entry.role === "assistant",
    );
    assert.equal(assistant?.text.length, 20);
    assert.equal(
      (await readActiveTranscriptItems()).find(
        (entry) => entry.kind === "message" && entry.role === "assistant",
      )?.text.length,
      20,
    );
  });

  it("shows ACP chat tool completion immediately when streaming render is disabled", async function () {
    setAssistantStreamingRenderEnabled(false);
    await reconnectAcpConversation();
    const sessionId = getAcpConversationSnapshot().sessionId;
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "held partial" },
      },
    } as any);
    await harness.lastAdapter?.emitSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Read",
        status: "pending",
      },
    } as any);

    let visible = await readActiveTranscriptItems();
    assert.equal(
      getAcpFrontendSnapshot().activeSnapshot?.items.find(
        (entry) => entry.kind === "message" && entry.role === "assistant",
      )?.text,
      "held partial",
    );
    assert.isOk(
      getAcpFrontendSnapshot().activeSnapshot?.items.find(
        (entry) => entry.kind === "tool_call" && entry.toolCallId === "tool-1",
      ),
    );
    let tool = visible.find(
      (entry) => entry.kind === "tool_call" && entry.toolCallId === "tool-1",
    );
    assert.equal(tool?.kind, "tool_call");
    if (tool?.kind === "tool_call") {
      assert.equal(tool.state, "pending");
    }

    await harness.lastAdapter?.emitSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-1",
        title: "Read",
        status: "completed",
        result: "ok",
      },
    } as any);

    visible = await readActiveTranscriptItems();
    tool = visible.find(
      (entry) => entry.kind === "tool_call" && entry.toolCallId === "tool-1",
    );
    assert.equal(tool?.kind, "tool_call");
    if (tool?.kind === "tool_call") {
      assert.equal(tool.state, "completed");
      assert.include(tool.resultSummary || "", "ok");
    }
  });

  it("streams ACP chat chunks naturally when streaming render is enabled", async function () {
    setAssistantStreamingRenderEnabled(true);
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.streamingChunkCount = 20;
      harness.lastAdapter.streamingChunkDelayMs = 10;
      harness.lastAdapter.emitUsageAfterEachStreamingChunk = true;
      return harness.lastAdapter;
    });
    let streamingSnapshotCount = 0;
    const unsubscribe = subscribeAcpConversationSnapshots((snapshot) => {
      if (
        snapshot.items.some(
          (entry) =>
            entry.kind === "message" &&
            entry.role === "assistant" &&
            entry.state === "streaming",
        )
      ) {
        streamingSnapshotCount += 1;
      }
    });

    await sendAcpConversationPrompt({
      message: "stream chunks with usage side channel enabled",
    });
    await new Promise((resolve) => setTimeout(resolve, 240));
    unsubscribe();

    assert.isAtLeast(streamingSnapshotCount, 1);
    const assistant = (await readActiveTranscriptItems()).find(
      (entry) => entry.kind === "message" && entry.role === "assistant",
    );
    assert.equal(assistant?.text.length, 20);
  });

  it("does not fan out high-frequency diagnostics as one UI snapshot per trace", async function () {
    await reconnectAcpConversation();
    let snapshotCount = 0;
    const unsubscribe = subscribeAcpConversationSnapshots(() => {
      snapshotCount += 1;
    });

    harness.lastAdapter?.emitTraceDiagnostics(100);
    await new Promise((resolve) => setTimeout(resolve, 120));
    unsubscribe();

    const snapshot = getAcpConversationSnapshot();
    assert.isAtMost(snapshot.diagnostics.length, 40);
    assert.isBelow(snapshotCount, 20);
  });

  it("keeps trailing transcript updates in the active turn while cancellation is requested", async function () {
    await connectAcpConversation();
    const releasePrompt = harness.lastAdapter!.holdPrompt();
    harness.lastAdapter!.promptStopReason = "cancelled";
    const prompt = sendAcpConversationPrompt({ message: "Trailing update" });
    await waitForAcpConversationSnapshot((snapshot) => snapshot.busy);
    await cancelAcpConversationPrompt();

    await harness.lastAdapter!.emitUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "final trailing text" },
      },
    });
    const requested = await waitForAcpConversationSnapshot((snapshot) =>
      snapshot.items.some(
        (item) =>
          item.kind === "message" && item.text === "final trailing text",
      ),
    );
    assert.equal(requested.promptInterruptState, "requested");
    assert.equal(requested.busy, true);

    releasePrompt();
    await prompt;
    const settled = getAcpConversationSnapshot();
    assert.equal(settled.promptInterruptState, "confirmed");
    const canonical = await readActiveTranscriptItems();
    assert.isTrue(
      canonical.some(
        (item) =>
          item.kind === "message" && item.text.includes("final trailing text"),
      ),
    );
  });

  it("persists ACP chat display mode and compact status expansion state", async function () {
    await startNewAcpConversation();
    setAcpConversationChatDisplayMode({
      mode: "bubble",
    });
    toggleAcpConversationStatusDetails({
      expanded: true,
    });

    let persisted = loadAcpConversationState(ACP_OPENCODE_BACKEND_ID);
    assert.equal(persisted.snapshot.chatDisplayMode, "bubble");
    assert.equal(persisted.snapshot.statusExpanded, true);

    resetAcpSessionManagerForTests();
    persisted = loadAcpConversationState(ACP_OPENCODE_BACKEND_ID);
    assert.equal(persisted.snapshot.chatDisplayMode, "bubble");
    assert.equal(persisted.snapshot.statusExpanded, true);
  });
});

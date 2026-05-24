import { assert } from "chai";
import { config } from "../../package.json";
import {
  ACP_OPENCODE_BACKEND_ID,
  ACP_PROMPT_REQUEST_KIND,
} from "../../src/config/defaults";
import {
  authenticateAcpConversation,
  archiveAcpConversation,
  buildAcpDiagnosticsBundle,
  cancelAcpConversationPrompt,
  connectAcpConversation,
  deleteActiveAcpConversation,
  disconnectAcpConversation,
  getAcpFrontendSnapshot,
  getAcpConversationSnapshot,
  refreshAcpConversationBackends,
  reconnectAcpConversation,
  renameAcpConversation,
  resolveAcpConversationPermission,
  resetAcpSessionManagerForTests,
  sendAcpConversationPrompt,
  setActiveAcpBackend,
  setActiveAcpConversation,
  setAcpConversationChatDisplayMode,
  setAcpConversationModel,
  setAcpConversationMode,
  setAcpConversationReasoningEffort,
  subscribeAcpConversationSnapshots,
  setAcpConnectionAdapterFactoryForTests,
  startNewAcpConversation,
  toggleAcpConversationStatusDetails,
} from "../../src/modules/acpSessionManager";
import {
  listAcpChatSessions,
  loadAcpConversationState,
  resolveAcpChatRuntimePaths,
  resolveAcpSessionCwd,
} from "../../src/modules/acpConversationStore";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import {
  PLUGIN_TASK_DOMAIN_ACP,
  getPluginTaskRequestEntry,
  listPluginTaskRowEntries,
  replacePluginTaskRowEntries,
  upsertPluginTaskRequestEntry,
} from "../../src/modules/pluginStateStore";
import type {
  AcpConnectionAdapter,
  AcpConnectionAdapterFactoryArgs,
  AcpConnectionDiagnosticsListener,
  AcpConnectionPermissionListener,
  AcpConnectionUpdateListener,
} from "../../src/modules/acpConnectionAdapter";
import {
  AcpAuthRequiredError,
  buildAcpPromptTextForTests,
} from "../../src/modules/acpConnectionAdapter";
import { configureZoteroMcpServerForTests } from "../../src/modules/zoteroMcpServer";
import type {
  AcpPermissionOption,
  RequestPermissionOutcome,
  SessionNotification,
} from "../../src/modules/acpProtocol";

class FakeAcpConnectionAdapter implements AcpConnectionAdapter {
  readonly updates = new Set<AcpConnectionUpdateListener>();
  readonly closeListeners = new Set<
    (event?: { message?: string; stderrText?: string }) => void
  >();
  readonly diagnosticsListeners = new Set<AcpConnectionDiagnosticsListener>();
  readonly permissionListeners = new Set<AcpConnectionPermissionListener>();
  readonly prompts: string[] = [];
  readonly sessionIds: string[] = [];
  readonly modelSelections: string[] = [];
  readonly modeSelections: string[] = [];
  readonly loadSessionIds: string[] = [];
  readonly resumeSessionIds: string[] = [];
  readonly authenticateCalls: string[] = [];
  readonly cancelSessionIds: string[] = [];
  permissionOptions: AcpPermissionOption[] = [
    {
      optionId: "allow-once",
      kind: "allow_once",
      name: "Allow Once",
    },
    {
      optionId: "reject-once",
      kind: "reject_once",
      name: "Reject Once",
    },
  ];
  initializeCalls = 0;
  closeCalls = 0;
  promptStopReason = "end_turn";
  failInitialize = false;
  failNewSessionUntilAuthenticated = false;
  canLoadSession = false;
  canResumeSession = false;
  canUseHttpMcp = false;
  canUseSseMcp = false;
  failLoadSession = false;
  failResumeSession = false;
  emitReplayOnLoad = false;
  emitPermissionDuringPrompt = false;
  streamingChunkCount = 0;
  holdPromptUntil: Promise<void> | null = null;
  modelState = {
    currentModelId: "gpt-5.4",
    availableModels: [
      { modelId: "gpt-5.4", name: "GPT-5.4", description: "Default model" },
      { modelId: "gpt-5.4-mini", name: "GPT-5.4 Mini", description: "Smaller model" },
    ],
  };
  omitSessionRuntimeOptions = false;
  emptySessionRuntimeOptions = false;
  connected = false;
  lastPermissionOutcome: RequestPermissionOutcome | null = null;
  private permissionRequestId = 0;
  private authenticated = false;

  async initialize() {
    if (this.failInitialize) {
      throw new Error('Command "npx" was not found in PATH');
    }
    this.initializeCalls += 1;
    this.connected = true;
    this.emitDiagnostic({
      kind: "command_check",
      level: "info",
      message: "validated npx command",
      detail: "npx opencode-ai@latest acp",
    });
    this.emitDiagnostic({
      kind: "spawned",
      level: "info",
      message: "spawned npx process",
      detail: "npx opencode-ai@latest acp",
    });
    this.emitDiagnostic({
      kind: "initialized",
      level: "info",
      message: "ACP initialize completed",
    });
    return {
      agentName: "OpenCode",
      agentVersion: "1.2.3",
      authMethods: [
        {
          id: "device",
          name: "Device Login",
          description: "Authenticate via browser",
        },
      ],
      commandLabel: "npx opencode-ai@latest acp",
      commandLine: "npx opencode-ai@latest acp",
      canLoadSession: this.canLoadSession,
      canResumeSession: this.canResumeSession,
      canUseHttpMcp: this.canUseHttpMcp,
      canUseSseMcp: this.canUseSseMcp,
    };
  }

  onUpdate(listener: AcpConnectionUpdateListener) {
    this.updates.add(listener);
    return () => {
      this.updates.delete(listener);
    };
  }

  onClose(listener: () => void) {
    this.closeListeners.add(listener);
    return () => {
      this.closeListeners.delete(listener);
    };
  }

  onDiagnostics(listener: AcpConnectionDiagnosticsListener) {
    this.diagnosticsListeners.add(listener);
    return () => {
      this.diagnosticsListeners.delete(listener);
    };
  }

  onPermissionRequest(listener: AcpConnectionPermissionListener) {
    this.permissionListeners.add(listener);
    return () => {
      this.permissionListeners.delete(listener);
    };
  }

  async newSession() {
    if (this.failNewSessionUntilAuthenticated && !this.authenticated) {
      this.emitDiagnostic({
        kind: "auth_required",
        level: "warn",
        message: "session/new requires authentication",
      });
      throw new AcpAuthRequiredError("Authentication required", [
        {
          id: "device",
          name: "Device Login",
          description: "Authenticate via browser",
        },
      ]);
    }
    const sessionId = `session-${this.sessionIds.length + 1}`;
    this.sessionIds.push(sessionId);
    this.emitDiagnostic({
      kind: "session_created",
      level: "info",
      message: `created session ${sessionId}`,
    });
    return {
      sessionId,
      sessionTitle: `Conversation ${this.sessionIds.length}`,
      sessionUpdatedAt: "2026-04-22T01:00:00.000Z",
      ...(this.emptySessionRuntimeOptions
        ? {
            modes: {
              currentModeId: "bypassPermissions",
              availableModes: [],
            },
            models: {
              currentModelId: "opus@high",
              availableModels: [],
            },
          }
        : this.omitSessionRuntimeOptions
        ? {}
        : {
            modes: {
              currentModeId: "plan",
              availableModes: [
                { id: "plan", name: "Plan", description: "Reason first" },
                { id: "code", name: "Code", description: "Act directly" },
              ],
            },
            models: {
              currentModelId: this.modelState.currentModelId,
              availableModels: this.modelState.availableModels,
            },
          }),
    };
  }

  async loadSession(args: { sessionId: string }) {
    this.loadSessionIds.push(args.sessionId);
    this.emitDiagnostic({
      kind: "session_load_attempted",
      level: "info",
      message: `load ${args.sessionId}`,
    });
    if (this.failLoadSession) {
      throw new Error("load failed");
    }
    if (this.emitReplayOnLoad) {
      await this.emitUpdate({
        sessionId: args.sessionId,
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: "replayed assistant text",
          },
        },
      });
      await this.emitUpdate({
        sessionId: args.sessionId,
        update: {
          sessionUpdate: "session_info_update",
          title: "Loaded session",
          updatedAt: "2026-04-22T02:00:00.000Z",
        },
      });
    }
    this.emitDiagnostic({
      kind: "session_load_succeeded",
      level: "info",
      message: `loaded ${args.sessionId}`,
    });
    return {
      sessionId: args.sessionId,
      sessionTitle: "Loaded session",
      sessionUpdatedAt: "2026-04-22T02:00:00.000Z",
      models: {
        currentModelId: this.modelState.currentModelId,
        availableModels: this.modelState.availableModels,
      },
    };
  }

  async resumeSession(args: { sessionId: string }) {
    this.resumeSessionIds.push(args.sessionId);
    this.emitDiagnostic({
      kind: "session_resume_attempted",
      level: "info",
      message: `resume ${args.sessionId}`,
    });
    if (this.failResumeSession) {
      throw new Error("resume failed");
    }
    this.emitDiagnostic({
      kind: "session_resume_succeeded",
      level: "info",
      message: `resumed ${args.sessionId}`,
    });
    return {
      sessionId: args.sessionId,
      sessionTitle: "Resumed session",
      sessionUpdatedAt: "2026-04-22T02:00:00.000Z",
      models: {
        currentModelId: this.modelState.currentModelId,
        availableModels: this.modelState.availableModels,
      },
    };
  }

  private async emitUpdate(
    update: SessionNotification,
  ) {
    for (const listener of this.updates) {
      await listener(update);
    }
  }

  async emitSessionUpdate(update: SessionNotification) {
    await this.emitUpdate(update);
  }

  private emitDiagnostic(entry: {
    kind: string;
    level: "info" | "warn" | "error";
    message: string;
    detail?: string;
  }) {
    const payload = {
      id: `${entry.kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      ts: new Date().toISOString(),
      kind: entry.kind,
      level: entry.level,
      message: entry.message,
      detail: entry.detail || "",
    };
    for (const listener of this.diagnosticsListeners) {
      listener(payload);
    }
  }

  emitTraceDiagnostics(count: number) {
    for (let index = 0; index < count; index += 1) {
      this.emitDiagnostic({
        kind: "jsonrpc_trace",
        level: "info",
        message: `trace ${index}`,
        detail: `trace ${index}`,
      });
    }
  }

  async prompt(args: { sessionId: string; message: string }) {
    this.prompts.push(args.message);
    this.emitDiagnostic({
      kind: "prompt_started",
      level: "info",
      message: `prompt started for ${args.sessionId}`,
    });
    if (this.holdPromptUntil) {
      await this.holdPromptUntil;
    }
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "agent_thought_chunk",
        content: {
          type: "text",
          text: "Checking the workspace and planning the next step.",
        },
      },
    });
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "pending",
      },
    });
    if (this.emitPermissionDuringPrompt) {
      const requestId = `perm-${++this.permissionRequestId}`;
      const outcome = await new Promise<RequestPermissionOutcome>((resolve) => {
        for (const listener of this.permissionListeners) {
          listener({
            requestId,
            sessionId: args.sessionId,
            toolCallId: "tool-1",
            toolTitle: "Inspect notes",
            source: "acp-tool-call",
            summary: "Read Zotero notes for the selected paper",
            detail: '{"tool":"get_item_notes","arguments":{"key":"PAPER1"}}',
            requestedAt: new Date().toISOString(),
            options: this.permissionOptions,
            resolve,
          });
        }
      });
      this.lastPermissionOutcome = outcome;
    }
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "completed",
      },
    });
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "plan",
        entries: [
          {
            content: "Inspect current Zotero selection",
            priority: "high",
            status: "completed",
          },
          {
            content: "Summarize likely next actions",
            priority: "medium",
            status: "in_progress",
          },
        ],
      },
    });
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "available_commands_update",
        availableCommands: [
          {
            name: "create_plan",
            title: "Create Plan",
            description: "Build an execution plan",
            input: { type: "unstructured" },
          },
        ],
      },
    });
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "current_mode_update",
        currentModeId: "code",
      },
    });
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "session_info_update",
        title: "OpenCode session",
        updatedAt: "2026-04-22T01:23:45.000Z",
      },
    });
    await this.emitUpdate({
      sessionId: args.sessionId,
      update: {
        sessionUpdate: "usage_update",
        used: 1200,
        size: 8000,
      },
    });
    if (this.streamingChunkCount > 0) {
      for (let index = 0; index < this.streamingChunkCount; index += 1) {
        await this.emitUpdate({
          sessionId: args.sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: String(index % 10),
            },
          },
        });
      }
    } else {
      const visibleEcho = args.message.split("\n[Zotero Host Bridge CLI]")[0];
      await this.emitUpdate({
        sessionId: args.sessionId,
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: `Echo: ${visibleEcho}`,
          },
        },
      });
    }
    this.emitDiagnostic({
      kind: "prompt_finished",
      level: "info",
      message: `prompt finished with ${this.promptStopReason}`,
    });
    return {
      stopReason: this.promptStopReason,
    };
  }

  async cancel(args: { sessionId: string }) {
    this.cancelSessionIds.push(args.sessionId);
  }

  async setMode(args: { sessionId: string; modeId: string }) {
    this.modeSelections.push(`${args.sessionId}:${args.modeId}`);
  }

  async setModel(args: { sessionId: string; modelId: string }) {
    this.modelSelections.push(`${args.sessionId}:${args.modelId}`);
  }

  async authenticate(args: { methodId: string }) {
    this.authenticated = true;
    this.authenticateCalls.push(args.methodId);
    this.emitDiagnostic({
      kind: "initialized",
      level: "info",
      message: `authenticated with ${args.methodId}`,
    });
  }

  async close() {
    this.closeCalls += 1;
    for (const listener of this.closeListeners) {
      listener();
    }
  }

  emitClose(event?: { message?: string; stderrText?: string }) {
    for (const listener of this.closeListeners) {
      listener(event);
    }
  }
}

describe("acp session manager", function () {
  let lastAdapter:
    | FakeAcpConnectionAdapter
    | null;
  let lastFactoryArgs:
    | AcpConnectionAdapterFactoryArgs
    | null;
  let previousBackendsPref: unknown;

  beforeEach(function () {
    lastAdapter = null;
    lastFactoryArgs = null;
    previousBackendsPref = Zotero.Prefs.get(
      `${config.prefsPrefix}.backendsConfigJson`,
      true,
    );
    resetPluginStateStoreForTests();
    resetAcpSessionManagerForTests();
    setAcpConnectionAdapterFactoryForTests(
      async (args: AcpConnectionAdapterFactoryArgs) => {
        lastFactoryArgs = args;
        lastAdapter = new FakeAcpConnectionAdapter();
        return lastAdapter;
      },
    );
  });

  afterEach(function () {
    setAcpConnectionAdapterFactoryForTests();
    resetAcpSessionManagerForTests();
    resetPluginStateStoreForTests();
    if (typeof previousBackendsPref === "undefined") {
      Zotero.Prefs.clear(`${config.prefsPrefix}.backendsConfigJson`, true);
    } else {
      Zotero.Prefs.set(
        `${config.prefsPrefix}.backendsConfigJson`,
        previousBackendsPref,
        true,
      );
    }
  });

  it("refreshes ACP backend metadata without starting an engine", async function () {
    await refreshAcpConversationBackends();

    const frontend = getAcpFrontendSnapshot();
    const snapshot = getAcpConversationSnapshot();
    assert.equal(frontend.activeBackendId, ACP_OPENCODE_BACKEND_ID);
    assert.isAtLeast(frontend.backends.length, 1);
    assert.equal(snapshot.backendId, ACP_OPENCODE_BACKEND_ID);
    assert.equal(snapshot.backend?.id, ACP_OPENCODE_BACKEND_ID);
    assert.isNull(lastAdapter);
  });

  it("hydrates ACP chat runtime selectors from backend cache when session attach omits options", async function () {
    Zotero.Prefs.set(
      `${config.prefsPrefix}.backendsConfigJson`,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "acp-cache",
            displayName: "ACP Cached",
            type: "acp",
            command: "node",
            args: ["cached.js"],
            acp: {
              connectionTest: {
                status: "passed",
                testedAt: "2026-05-03T00:00:00.000Z",
                configFingerprint: "cache-fingerprint",
              },
              runtimeOptionsCache: {
                refreshedAt: "2026-05-03T00:00:00.000Z",
                modes: [
                  { id: "bypassPermissions", label: "Bypass permissions" },
                  { id: "default", label: "Default" },
                ],
                currentModeId: "bypassPermissions",
                rawModels: [
                  { id: "opus@low", label: "Opus Low" },
                  { id: "opus@high", label: "Opus High" },
                ],
                currentRawModelId: "opus@high",
                displayModels: [{ id: "opus", label: "Opus" }],
                currentDisplayModelId: "opus",
                reasoningEfforts: [
                  { id: "low", label: "Low" },
                  { id: "high", label: "High" },
                ],
                currentReasoningEffortId: "high",
              },
            },
          },
        ],
      }),
      true,
    );
    setAcpConnectionAdapterFactoryForTests(async (args) => {
      lastFactoryArgs = args;
      lastAdapter = new FakeAcpConnectionAdapter();
      lastAdapter.omitSessionRuntimeOptions = true;
      return lastAdapter;
    });

    await refreshAcpConversationBackends();
    await setActiveAcpBackend({ backendId: "acp-cache" });
    let snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.backendId, "acp-cache");
    assert.deepEqual(
      snapshot.modeOptions.map((entry) => entry.id),
      ["bypassPermissions", "default"],
    );
    assert.equal(snapshot.currentMode?.id, "bypassPermissions");
    assert.deepEqual(
      snapshot.displayModelOptions.map((entry) => entry.id),
      ["opus"],
    );
    assert.deepEqual(
      snapshot.reasoningEffortOptions.map((entry) => entry.id),
      ["low", "high"],
    );
    assert.equal(snapshot.currentReasoningEffort?.id, "high");

    await connectAcpConversation();
    snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "connected");
    assert.deepEqual(
      snapshot.modeOptions.map((entry) => entry.id),
      ["bypassPermissions", "default"],
    );
    assert.equal(snapshot.currentDisplayModel?.id, "opus");
    assert.equal(snapshot.currentModel?.id, "opus@high");
    assert.deepEqual(lastAdapter?.sessionIds, ["session-1"]);
  });

  it("keeps cached ACP chat runtime selectors when session attach returns empty option lists", async function () {
    Zotero.Prefs.set(
      `${config.prefsPrefix}.backendsConfigJson`,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "acp-empty-options",
            displayName: "ACP Empty Options",
            type: "acp",
            command: "node",
            args: ["empty-options.js"],
            acp: {
              connectionTest: {
                status: "passed",
                testedAt: "2026-05-03T00:00:00.000Z",
                configFingerprint: "empty-options-fingerprint",
              },
              runtimeOptionsCache: {
                refreshedAt: "2026-05-03T00:00:00.000Z",
                modes: [
                  { id: "bypassPermissions", label: "Bypass permissions" },
                  { id: "default", label: "Default" },
                ],
                currentModeId: "bypassPermissions",
                rawModels: [
                  { id: "opus@low", label: "Opus Low" },
                  { id: "opus@high", label: "Opus High" },
                ],
                currentRawModelId: "opus@high",
                displayModels: [{ id: "opus", label: "Opus" }],
                currentDisplayModelId: "opus",
                reasoningEfforts: [
                  { id: "low", label: "Low" },
                  { id: "high", label: "High" },
                ],
                currentReasoningEffortId: "high",
              },
            },
          },
        ],
      }),
      true,
    );
    setAcpConnectionAdapterFactoryForTests(async (args) => {
      lastFactoryArgs = args;
      lastAdapter = new FakeAcpConnectionAdapter();
      lastAdapter.emptySessionRuntimeOptions = true;
      return lastAdapter;
    });

    await refreshAcpConversationBackends();
    await setActiveAcpBackend({ backendId: "acp-empty-options" });
    await connectAcpConversation();
    const snapshot = getAcpConversationSnapshot();

    assert.equal(snapshot.status, "connected");
    assert.deepEqual(
      snapshot.modeOptions.map((entry) => entry.id),
      ["bypassPermissions", "default"],
    );
    assert.equal(snapshot.currentMode?.id, "bypassPermissions");
    assert.deepEqual(
      snapshot.displayModelOptions.map((entry) => entry.id),
      ["opus"],
    );
    assert.deepEqual(
      snapshot.reasoningEffortOptions.map((entry) => entry.id),
      ["low", "high"],
    );
    assert.equal(snapshot.currentModel?.id, "opus@high");
  });

  it("connects and disconnects the active ACP conversation explicitly", async function () {
    await connectAcpConversation();

    let snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "connected");
    assert.equal(snapshot.sessionId, "session-1");
    assert.equal(snapshot.remoteSessionId, "session-1");
    assert.equal(lastAdapter?.initializeCalls, 1);

    await disconnectAcpConversation();

    snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "idle");
    assert.equal(snapshot.sessionId, "");
    assert.equal(snapshot.remoteSessionId, "session-1");
    assert.equal(lastAdapter?.closeCalls, 1);
  });

  it("upserts tool calls by id and does not roll completed back to pending", async function () {
    await connectAcpConversation();

    await lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "completed",
      },
    });
    await lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "pending",
      },
    });

    const toolItems = getAcpConversationSnapshot().items.filter(
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

    await lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "pending",
      },
    });
    await lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "completed",
      },
    });
    await lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-2",
        title: "Read metadata",
        kind: "read",
        status: "pending",
      },
    });

    const toolItems = getAcpConversationSnapshot().items.filter(
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

    await lastAdapter?.emitSessionUpdate({
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
    await lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-summary",
        title: "Tool Call",
        kind: "other",
        status: "completed",
      },
    });

    const toolItem = getAcpConversationSnapshot().items.find(
      (entry) => entry.kind === "tool_call" && entry.toolCallId === "tool-summary",
    );
    assert.equal(toolItem?.toolName, "Tool");
    assert.include(String(toolItem?.inputSummary || ""), "artifact/todo_memo.md");
    assert.include(String(toolItem?.summary || ""), "artifact/todo_memo.md");
    assert.notEqual(toolItem?.summary, "Tool Call");
  });

  it("keeps the first tool call summary when later updates arrive", async function () {
    await connectAcpConversation();

    await lastAdapter?.emitSessionUpdate({
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
    await lastAdapter?.emitSessionUpdate({
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

    const toolItem = getAcpConversationSnapshot().items.find(
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

    await lastAdapter?.emitSessionUpdate({
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
    await lastAdapter?.emitSessionUpdate({
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
    await lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-normalized",
        title: "Tool Call",
        status: "completed",
        output: "read file completed",
      },
    });

    const toolItem = getAcpConversationSnapshot().items.find(
      (entry) =>
        entry.kind === "tool_call" && entry.toolCallId === "tool-normalized",
    );
    assert.equal(toolItem?.toolName, "read_file");
    assert.include(String(toolItem?.inputSummary || ""), "artifact/todo_memo.md");
    assert.equal(toolItem?.resultSummary, "read file completed");
    assert.notEqual(toolItem?.inputSummary, "[]");
    assert.notInclude(String(toolItem?.summary || ""), "read file completed");
  });

  it("starts a new assistant message when a tool region appears between chunks", async function () {
    await connectAcpConversation();

    await lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: "First assistant region.",
        },
      },
    });
    await lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-boundary",
        title: "Inspect boundary",
        kind: "read",
        status: "pending",
      },
    });
    await lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: "Second assistant region.",
        },
      },
    });

    const assistantItems = getAcpConversationSnapshot().items.filter(
      (entry) => entry.kind === "message" && entry.role === "assistant",
    );
    assert.lengthOf(assistantItems, 2);
    assert.deepEqual(
      assistantItems.map((entry) => entry.text),
      ["First assistant region.", "Second assistant region."],
    );
  });

  it("starts a new thought when assistant output appears between thought chunks", async function () {
    await connectAcpConversation();

    await lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_thought_chunk",
        content: {
          type: "text",
          text: "First thought region.",
        },
      },
    });
    await lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: "Visible assistant output.",
        },
      },
    });
    await lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_thought_chunk",
        content: {
          type: "text",
          text: "Second thought region.",
        },
      },
    });

    const thoughtItems = getAcpConversationSnapshot().items.filter(
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

    await lastAdapter?.emitSessionUpdate({
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Inspect notes",
        kind: "read",
        status: "pending",
      },
    });
    await lastAdapter?.emitSessionUpdate({
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
    const toolItems = snapshot.items.filter((entry) => entry.kind === "tool_call");
    assert.lengthOf(toolItems, 1);
    assert.equal(snapshot.items[snapshot.items.length - 1]?.id, toolItems[0]?.id);
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
    assert.notInclude(promptText, "Never write directly to Zotero's SQLite database");
    assert.notInclude(promptText, "[Zotero host context]");
    assert.notInclude(promptText, "Private Item Title");
    assert.notInclude(promptText, "\"selectionEmpty\"");
  });

  it("keeps Zotero MCP guidance available for explicit compatibility prompts", function () {
    const promptText = buildAcpPromptTextForTests(
      "Inspect Zotero",
      undefined,
      { mcpCompatibilityMode: "explicit_descriptor_injection" },
    );

    assert.include(promptText, "[Zotero MCP tool usage]");
    assert.include(promptText, 'MCP server named "zotero"');
    assert.include(promptText, "get_current_view");
    assert.include(promptText, "search_items");
    assert.include(promptText, "Never write directly to Zotero's SQLite database");
  });

  it("creates an ACP session on demand, merges streamed assistant chunks, and persists transcript state", async function () {
    (Zotero as typeof Zotero & { DataDirectory?: { dir?: string } }).DataDirectory = {
      dir: "D:\\ZoteroData",
    };
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
    assert.equal(snapshot.commandLabel, "npx opencode-ai@latest acp");
    assert.equal(snapshot.commandLine, "npx opencode-ai@latest acp");
    assert.equal(snapshot.agentLabel, "OpenCode");
    assert.equal(snapshot.agentVersion, "1.2.3");
    const expectedStoragePaths = resolveAcpChatRuntimePaths(
      ACP_OPENCODE_BACKEND_ID,
      snapshot.conversationId,
    );
    assert.equal(snapshot.agentWorkspaceDir, expectedStoragePaths.agentWorkspaceDir);
    assert.equal(snapshot.conversationStorageDir, expectedStoragePaths.conversationStorageDir);
    assert.equal(snapshot.sessionCwd, expectedStoragePaths.agentWorkspaceDir);
    assert.equal(snapshot.workspaceDir, expectedStoragePaths.agentWorkspaceDir);
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
    assert.isAtLeast(snapshot.items.length, 5);
    assert.deepInclude(
      snapshot.items.find((entry) => entry.kind === "message" && entry.role === "user") || {},
      {
        role: "user",
        text: "Hello ACP",
      },
    );
    assert.deepInclude(
      snapshot.items.find((entry) => entry.kind === "thought") || {},
      {
        text: "Checking the workspace and planning the next step.",
      },
    );
    assert.deepInclude(
      snapshot.items.find((entry) => entry.kind === "tool_call") || {},
      {
        title: "Inspect notes",
        state: "completed",
      },
    );
    const plan = snapshot.items.find((entry) => entry.kind === "plan") as
      | { entries?: Array<{ status?: string }> }
      | undefined;
    assert.deepEqual(
      plan?.entries?.map((entry) => entry.status),
      ["completed", "skipped"],
    );
    assert.deepInclude(
      snapshot.items.find((entry) => entry.kind === "message" && entry.role === "assistant") || {},
      {
        role: "assistant",
        text: "Echo: Hello ACP",
      },
    );
    assert.isAtLeast(snapshot.diagnostics.length, 4);
    assert.isOk(lastAdapter);
    assert.isOk(lastFactoryArgs);
    assert.equal(lastAdapter?.initializeCalls, 1);
    assert.deepEqual(lastAdapter?.sessionIds, ["session-1"]);
    assert.equal(lastAdapter?.prompts.length, 1);
    assert.include(lastAdapter?.prompts[0] || "", "Hello ACP");
    assert.include(lastAdapter?.prompts[0] || "", "[Zotero Host Bridge CLI]");
    assert.include(lastAdapter?.prompts[0] || "", ".zotero-bridge/README.md");
    assert.isString(lastFactoryArgs?.backend.env?.ZOTERO_BRIDGE_PROFILE);
    assert.include(
      lastFactoryArgs?.backend.env?.ZOTERO_BRIDGE_PROFILE || "",
      ".zotero-bridge",
    );
    assert.equal(lastFactoryArgs?.agentWorkspaceDir, expectedStoragePaths.agentWorkspaceDir);
    assert.equal(lastFactoryArgs?.sessionCwd, expectedStoragePaths.agentWorkspaceDir);
    assert.equal(
      lastFactoryArgs?.workspaceDir,
      expectedStoragePaths.agentWorkspaceDir,
    );
    assert.equal(
      lastFactoryArgs?.runtimeDir,
      expectedStoragePaths.runtimeDir,
    );

    const persisted = loadAcpConversationState(ACP_OPENCODE_BACKEND_ID);
    assert.equal(persisted.snapshot.sessionId, "");
    assert.equal(persisted.snapshot.remoteSessionId, "session-1");
    assert.equal(persisted.snapshot.commandLabel, "npx opencode-ai@latest acp");
    assert.equal(persisted.snapshot.commandLine, "npx opencode-ai@latest acp");
    assert.equal(persisted.snapshot.agentLabel, "OpenCode");
    assert.equal(persisted.snapshot.currentMode?.id, "code");
    assert.equal(persisted.snapshot.currentModel?.id, "gpt-5.4");
    assert.equal(persisted.snapshot.lastStopReason, "end_turn");
    assert.equal(persisted.snapshot.agentWorkspaceDir, expectedStoragePaths.agentWorkspaceDir);
    assert.equal(persisted.snapshot.conversationStorageDir, expectedStoragePaths.conversationStorageDir);
    assert.equal(persisted.snapshot.sessionCwd, expectedStoragePaths.agentWorkspaceDir);
    assert.isAtLeast(persisted.items.length, 5);
    assert.equal(
      persisted.items.find((entry) => entry.kind === "message" && entry.role === "assistant")?.text,
      "Echo: Hello ACP",
    );
  });

  it("keeps parallel ACP backend slots isolated and routes actions to the active backend", async function () {
    Zotero.Prefs.set(
      `${config.prefsPrefix}.backendsConfigJson`,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "acp-one",
            displayName: "ACP One",
            type: "acp",
            command: "node",
            args: ["one.js"],
          },
          {
            id: "acp-two",
            displayName: "ACP Two",
            type: "acp",
            command: "node",
            args: ["two.js"],
          },
        ],
      }),
      true,
    );
    const adapters = new Map<string, FakeAcpConnectionAdapter>();
    const factoryArgs: AcpConnectionAdapterFactoryArgs[] = [];
    setAcpConnectionAdapterFactoryForTests(async (args) => {
      factoryArgs.push(args);
      const adapter = new FakeAcpConnectionAdapter();
      adapters.set(args.backend.id, adapter);
      return adapter;
    });

    await setActiveAcpBackend({ backendId: "acp-one" });
    await sendAcpConversationPrompt({ message: "hello one" });
    await setActiveAcpBackend({ backendId: "acp-two" });
    await sendAcpConversationPrompt({ message: "hello two" });

    const one = getAcpConversationSnapshot("acp-one");
    const two = getAcpConversationSnapshot("acp-two");
    assert.equal(one.backendId, "acp-one");
    assert.equal(two.backendId, "acp-two");
    assert.equal(
      one.items.find((entry) => entry.kind === "message" && entry.role === "assistant")?.text,
      "Echo: hello one",
    );
    assert.equal(
      two.items.find((entry) => entry.kind === "message" && entry.role === "assistant")?.text,
      "Echo: hello two",
    );
    assert.include(adapters.get("acp-one")?.prompts[0] || "", "hello one");
    assert.include(
      adapters.get("acp-one")?.prompts[0] || "",
      "[Zotero Host Bridge CLI]",
    );
    assert.include(adapters.get("acp-two")?.prompts[0] || "", "hello two");
    assert.include(
      adapters.get("acp-two")?.prompts[0] || "",
      "[Zotero Host Bridge CLI]",
    );
    assert.deepEqual(
      factoryArgs.map((entry) => entry.backend.id),
      ["acp-one", "acp-two"],
    );

    await setAcpConversationMode({ modeId: "plan" });
    assert.deepEqual(adapters.get("acp-one")?.modeSelections, []);
    assert.deepEqual(adapters.get("acp-two")?.modeSelections, ["session-1:plan"]);

    const frontend = getAcpFrontendSnapshot();
    assert.equal(frontend.activeBackendId, "acp-two");
    assert.equal(frontend.connectedCount, 2);
    assert.equal(frontend.totalMessageCount, one.items.length + two.items.length);
    assert.deepEqual(
      frontend.backendChatSessions.map((entry) => entry.backendId),
      ["acp-two", "acp-one"],
    );
    assert.isAtLeast(frontend.backendChatSessions[0].sessions.length, 1);
    assert.isAtLeast(frontend.backendChatSessions[1].sessions.length, 1);

    const beforeNew = getAcpConversationSnapshot("acp-two").conversationId;
    await startNewAcpConversation();
    assert.isAtLeast(loadAcpConversationState("acp-one").items.length, 1);
    assert.lengthOf(loadAcpConversationState("acp-two").items, 0);
    assert.isAtLeast(listAcpChatSessions("acp-two").length, 2);
    assert.notEqual(getAcpConversationSnapshot("acp-two").conversationId, beforeNew);
  });

  it("creates a new local conversation without deleting the previous transcript", async function () {
    await sendAcpConversationPrompt({
      message: "Before reset",
    });
    const previousConversationId = getAcpConversationSnapshot().conversationId;

    await startNewAcpConversation();

    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.backendId, ACP_OPENCODE_BACKEND_ID);
    assert.equal(snapshot.sessionId, "");
    assert.equal(snapshot.remoteSessionId, "");
    assert.equal(snapshot.status, "idle");
    assert.lengthOf(snapshot.items, 0);

    const persisted = loadAcpConversationState(ACP_OPENCODE_BACKEND_ID);
    assert.equal(persisted.snapshot.sessionId, "");
    assert.equal(persisted.snapshot.remoteSessionId, "");
    assert.lengthOf(persisted.items, 0);
    const previous = loadAcpConversationState(
      ACP_OPENCODE_BACKEND_ID,
      previousConversationId,
    );
    assert.isAtLeast(previous.items.length, 1);
    assert.isAtLeast(listAcpChatSessions(ACP_OPENCODE_BACKEND_ID).length, 2);
  });

  it("switches local conversations and rebuilds the remote ACP attachment on demand", async function () {
    await sendAcpConversationPrompt({ message: "First local session" });
    const firstConversationId = getAcpConversationSnapshot().conversationId;
    const firstAdapter = lastAdapter;

    await startNewAcpConversation();
    const secondConversationId = getAcpConversationSnapshot().conversationId;
    assert.notEqual(secondConversationId, firstConversationId);
    assert.equal(firstAdapter?.closeCalls, 1);

    await sendAcpConversationPrompt({ message: "Second local session" });
    assert.equal(getAcpConversationSnapshot().conversationId, secondConversationId);
    assert.include(
      getAcpConversationSnapshot().items
        .filter((entry) => entry.kind === "message")
        .map((entry) => ("text" in entry ? entry.text : ""))
        .join("\n"),
      "Second local session",
    );

    const secondAdapter = lastAdapter;
    await setActiveAcpConversation({ conversationId: firstConversationId });
    assert.equal(secondAdapter?.closeCalls, 1);
    let snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.conversationId, firstConversationId);
    assert.equal(snapshot.sessionId, "");
    assert.include(
      snapshot.items
        .filter((entry) => entry.kind === "message")
        .map((entry) => ("text" in entry ? entry.text : ""))
        .join("\n"),
      "First local session",
    );

    await sendAcpConversationPrompt({ message: "Back on first" });
    snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.conversationId, firstConversationId);
    assert.include(
      snapshot.items
        .filter((entry) => entry.kind === "message")
        .map((entry) => ("text" in entry ? entry.text : ""))
        .join("\n"),
      "Back on first",
    );
  });

  it("resumes a persisted remote ACP session when the backend advertises resume support", async function () {
    await sendAcpConversationPrompt({ message: "Persist remote context" });
    const conversationId = getAcpConversationSnapshot().conversationId;
    assert.equal(getAcpConversationSnapshot().remoteSessionId, "session-1");

    resetAcpSessionManagerForTests();
    setAcpConnectionAdapterFactoryForTests(async () => {
      lastAdapter = new FakeAcpConnectionAdapter();
      lastAdapter.canResumeSession = true;
      return lastAdapter;
    });

    await setActiveAcpConversation({ conversationId });
    await reconnectAcpConversation();

    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.sessionId, "session-1");
    assert.equal(snapshot.remoteSessionId, "session-1");
    assert.equal(snapshot.remoteSessionRestoreStatus, "resumed");
    assert.deepEqual(lastAdapter?.resumeSessionIds, ["session-1"]);
    assert.deepEqual(lastAdapter?.loadSessionIds, []);
    assert.deepEqual(lastAdapter?.sessionIds, []);
  });

  it("loads a persisted remote ACP session when resume is unavailable and suppresses replay duplication", async function () {
    await sendAcpConversationPrompt({ message: "Persist loadable context" });
    const conversationId = getAcpConversationSnapshot().conversationId;

    resetAcpSessionManagerForTests();
    setAcpConnectionAdapterFactoryForTests(async () => {
      lastAdapter = new FakeAcpConnectionAdapter();
      lastAdapter.canLoadSession = true;
      lastAdapter.emitReplayOnLoad = true;
      return lastAdapter;
    });

    await setActiveAcpConversation({ conversationId });
    await reconnectAcpConversation();

    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.sessionId, "session-1");
    assert.equal(snapshot.remoteSessionRestoreStatus, "loaded");
    assert.deepEqual(lastAdapter?.loadSessionIds, ["session-1"]);
    assert.deepEqual(lastAdapter?.sessionIds, []);
    assert.equal(snapshot.sessionTitle, "Loaded session");
    assert.isUndefined(
      snapshot.items.find(
        (entry) =>
          entry.kind === "message" &&
          entry.role === "assistant" &&
          entry.text === "replayed assistant text",
      ),
    );
  });

  it("falls back to a new remote ACP session when restore fails", async function () {
    await sendAcpConversationPrompt({ message: "Persist resumable context" });
    const conversationId = getAcpConversationSnapshot().conversationId;

    resetAcpSessionManagerForTests();
    setAcpConnectionAdapterFactoryForTests(async () => {
      lastAdapter = new FakeAcpConnectionAdapter();
      lastAdapter.canResumeSession = true;
      lastAdapter.failResumeSession = true;
      lastAdapter.sessionIds.push("preexisting");
      return lastAdapter;
    });

    await setActiveAcpConversation({ conversationId });
    await reconnectAcpConversation();

    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.sessionId, "session-2");
    assert.equal(snapshot.remoteSessionId, "session-2");
    assert.equal(snapshot.remoteSessionRestoreStatus, "fallback-new");
    assert.deepEqual(lastAdapter?.resumeSessionIds, ["session-1"]);
    assert.deepEqual(lastAdapter?.sessionIds, ["preexisting", "session-2"]);
    assert.isOk(
      snapshot.diagnostics.find((entry) => entry.kind === "session_new_fallback"),
    );
    assert.isOk(
      snapshot.items.find(
        (entry) =>
          entry.kind === "status" &&
          entry.text.includes("Remote session could not be restored"),
      ),
    );
  });

  it("does not call restore methods when the backend does not advertise support", async function () {
    await sendAcpConversationPrompt({ message: "Persist unsupported context" });
    const conversationId = getAcpConversationSnapshot().conversationId;

    resetAcpSessionManagerForTests();
    setAcpConnectionAdapterFactoryForTests(async () => {
      lastAdapter = new FakeAcpConnectionAdapter();
      return lastAdapter;
    });

    await setActiveAcpConversation({ conversationId });
    await reconnectAcpConversation();

    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.remoteSessionRestoreStatus, "unsupported");
    assert.deepEqual(lastAdapter?.resumeSessionIds, []);
    assert.deepEqual(lastAdapter?.loadSessionIds, []);
    assert.deepEqual(lastAdapter?.sessionIds, ["session-1"]);
  });

  it("renames and deletes the active local conversation with fallback selection", async function () {
    await sendAcpConversationPrompt({ message: "Keep me" });
    const firstConversationId = getAcpConversationSnapshot().conversationId;
    await startNewAcpConversation();
    const secondConversationId = getAcpConversationSnapshot().conversationId;

    await renameAcpConversation({ title: "Scratchpad" });
    assert.equal(getAcpConversationSnapshot().conversationTitle, "Scratchpad");
    assert.equal(
      listAcpChatSessions(ACP_OPENCODE_BACKEND_ID).find(
        (entry) => entry.conversationId === secondConversationId,
      )?.title,
      "Scratchpad",
    );

    await deleteActiveAcpConversation();
    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.conversationId, firstConversationId);
    assert.notEqual(snapshot.conversationId, secondConversationId);
    assert.isUndefined(
      listAcpChatSessions(ACP_OPENCODE_BACKEND_ID).find(
        (entry) => entry.conversationId === secondConversationId,
      ),
    );
  });

  it("renames sessions by id and archives them without deleting transcript", async function () {
    await sendAcpConversationPrompt({ message: "Keep archived transcript" });
    const firstConversationId = getAcpConversationSnapshot().conversationId;
    await startNewAcpConversation();
    const secondConversationId = getAcpConversationSnapshot().conversationId;

    await renameAcpConversation({
      conversationId: firstConversationId,
      title: "Archived Reference",
    });
    assert.equal(
      listAcpChatSessions(ACP_OPENCODE_BACKEND_ID).find(
        (entry) => entry.conversationId === firstConversationId,
      )?.title,
      "Archived Reference",
    );
    assert.equal(getAcpConversationSnapshot().conversationId, secondConversationId);

    await archiveAcpConversation({
      conversationId: firstConversationId,
    });
    assert.isUndefined(
      listAcpChatSessions(ACP_OPENCODE_BACKEND_ID).find(
        (entry) => entry.conversationId === firstConversationId,
      ),
    );
    assert.equal(
      loadAcpConversationState(
        ACP_OPENCODE_BACKEND_ID,
        firstConversationId,
      ).items.find((entry) => entry.kind === "message" && entry.role === "user")
        ?.text,
      "Keep archived transcript",
    );

    await archiveAcpConversation({
      conversationId: secondConversationId,
    });
    const snapshot = getAcpConversationSnapshot();
    assert.notEqual(snapshot.conversationId, secondConversationId);
    assert.lengthOf(listAcpChatSessions(ACP_OPENCODE_BACKEND_ID), 1);
    assert.equal(listAcpChatSessions(ACP_OPENCODE_BACKEND_ID)[0].messageCount, 0);
  });

  it("throttles streaming snapshot notifications while preserving the final transcript", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      lastAdapter = new FakeAcpConnectionAdapter();
      lastAdapter.streamingChunkCount = 100;
      return lastAdapter;
    });
    let snapshotCount = 0;
    const unsubscribe = subscribeAcpConversationSnapshots(() => {
      snapshotCount += 1;
    });

    await sendAcpConversationPrompt({
      message: "stream many chunks",
    });
    await new Promise((resolve) => setTimeout(resolve, 120));
    unsubscribe();

    const snapshot = getAcpConversationSnapshot();
    const assistant = snapshot.items.find(
      (entry) => entry.kind === "message" && entry.role === "assistant",
    );
    assert.equal(assistant?.text.length, 100);
    assert.isBelow(snapshotCount, 40);
    const persisted = loadAcpConversationState(ACP_OPENCODE_BACKEND_ID);
    assert.equal(
      persisted.items.find((entry) => entry.kind === "message" && entry.role === "assistant")?.text.length,
      100,
    );
  });

  it("does not fan out high-frequency diagnostics as one UI snapshot per trace", async function () {
    await reconnectAcpConversation();
    let snapshotCount = 0;
    const unsubscribe = subscribeAcpConversationSnapshots(() => {
      snapshotCount += 1;
    });

    lastAdapter?.emitTraceDiagnostics(100);
    await new Promise((resolve) => setTimeout(resolve, 120));
    unsubscribe();

    const snapshot = getAcpConversationSnapshot();
    assert.isAtMost(snapshot.diagnostics.length, 40);
    assert.isBelow(snapshotCount, 20);
  });

  it("persists ACP chat display mode and compact status expansion state", function () {
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

  it("exposes authentication methods and reconnects after authenticate", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      lastAdapter = new FakeAcpConnectionAdapter();
      lastAdapter.failNewSessionUntilAuthenticated = true;
      return lastAdapter;
    });

    let thrown: unknown;
    try {
      await sendAcpConversationPrompt({
        message: "Auth me",
      });
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, AcpAuthRequiredError);
    let snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "auth-required");
    assert.lengthOf(snapshot.authMethods, 1);
    assert.equal(snapshot.authMethods[0].id, "device");

    await authenticateAcpConversation({
      methodId: "device",
    });

    snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "connected");
    assert.equal(snapshot.sessionId, "session-1");
    assert.deepEqual(lastAdapter?.authenticateCalls, ["device"]);
  });

  it("waits for an interactive permission decision and resumes the prompt after allow", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      lastAdapter = new FakeAcpConnectionAdapter();
      lastAdapter.emitPermissionDuringPrompt = true;
      return lastAdapter;
    });

    const promptPromise = sendAcpConversationPrompt({
      message: "Need permission",
    });
    await new Promise((resolve) => setTimeout(resolve, 120));

    let snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "permission-required");
    assert.isOk(snapshot.pendingPermissionRequest);
    assert.equal(snapshot.pendingPermissionRequest?.toolTitle, "Inspect notes");
    assert.equal(
      snapshot.pendingPermissionRequest?.summary,
      "Read Zotero notes for the selected paper",
    );
    assert.include(
      snapshot.pendingPermissionRequest?.detail || "",
      "get_item_notes",
    );

    await resolveAcpConversationPermission({
      outcome: "selected",
      optionId: "allow-once",
    });
    await promptPromise;

    snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "connected");
    assert.isNull(snapshot.pendingPermissionRequest);
    assert.deepEqual(lastAdapter?.lastPermissionOutcome, {
      outcome: "selected",
      optionId: "allow-once",
    });
  });

  it("resolves arbitrary permission option ids supplied by the adapter", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      lastAdapter = new FakeAcpConnectionAdapter();
      lastAdapter.emitPermissionDuringPrompt = true;
      lastAdapter.permissionOptions = [
        {
          optionId: "approve-session",
          kind: "allow_always",
          name: "Approve Session",
        },
        {
          optionId: "edit-command",
          kind: "edit",
          name: "Edit Command",
        },
        {
          optionId: "deny-session",
          kind: "reject_always",
          name: "Deny Session",
        },
      ];
      return lastAdapter;
    });

    const promptPromise = sendAcpConversationPrompt({
      message: "Need custom permission",
    });
    await new Promise((resolve) => setTimeout(resolve, 120));

    const snapshot = getAcpConversationSnapshot();
    assert.deepEqual(
      snapshot.pendingPermissionRequest?.options.map((entry) => entry.optionId),
      ["approve-session", "edit-command", "deny-session"],
    );

    await resolveAcpConversationPermission({
      outcome: "selected",
      optionId: "edit-command",
    });
    await promptPromise;

    assert.deepEqual(lastAdapter?.lastPermissionOutcome, {
      outcome: "selected",
      optionId: "edit-command",
    });
  });

  it("surfaces command prerequisite failures without silently connecting", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      lastAdapter = new FakeAcpConnectionAdapter();
      lastAdapter.failInitialize = true;
      return lastAdapter;
    });

    let thrown: unknown;
    try {
      await reconnectAcpConversation();
    } catch (error) {
      thrown = error;
    }

    assert.isOk(thrown);
    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "error");
    assert.match(snapshot.prerequisiteError, /npx/i);
    assert.isAtLeast(snapshot.diagnostics.length, 1);
    assert.isOk(snapshot.diagnostics.find((entry) => entry.stack));
    const bundle = buildAcpDiagnosticsBundle();
    assert.equal(bundle.schema, "zotero-skills.acp.diagnostics.v1");
    assert.equal(bundle.connection.status, "error");
    assert.match(bundle.connection.lastError, /npx/i);
    assert.isAtLeast(bundle.diagnostics.length, 1);
    assert.isBoolean(bundle.host.hasTextEncoder);
    assert.include(["idle", "stopped"], bundle.mcpServer?.status);
  });

  it("includes live Zotero MCP status in conversation snapshots during active turns", async function () {
    configureZoteroMcpServerForTests({
      endpoint: "http://127.0.0.1:26500/mcp",
      token: "test-token",
    });

    await sendAcpConversationPrompt({
      message: "Check MCP status snapshot",
    });

    const snapshot = getAcpConversationSnapshot();
    assert.isOk(snapshot.mcpServer);
    assert.isOk(snapshot.mcpHealth);
    assert.equal(snapshot.mcpServer?.status, "running");
    assert.equal(snapshot.mcpHealth?.state, "listening");
    assert.notInclude(
      (snapshot.mcpHealth?.tooltip || []).join("\n"),
      "server snapshot unavailable",
    );
  });

  it("keeps stderr tail and lifecycle metadata visible when the ACP process closes unexpectedly", async function () {
    await sendAcpConversationPrompt({
      message: "Before close",
    });

    lastAdapter?.emitClose({
      message: "ACP connection closed unexpectedly",
      stderrText: "spawn EINVAL",
    });

    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "error");
    assert.equal(snapshot.lastLifecycleEvent, "exited");
    assert.equal(snapshot.lastError, "ACP connection closed unexpectedly");
    assert.equal(snapshot.stderrTail, "spawn EINVAL");
    assert.isAtLeast(
      snapshot.diagnostics.filter((entry) => entry.kind === "stderr").length,
      1,
    );
  });

  it("allows updating current mode and model for the active session", async function () {
    await sendAcpConversationPrompt({
      message: "Initial turn",
    });

    await setAcpConversationMode({
      modeId: "plan",
    });
    await setAcpConversationModel({
      modelId: "gpt-5.4-mini",
    });
    await cancelAcpConversationPrompt();

    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.currentMode?.id, "plan");
    assert.equal(snapshot.currentModel?.id, "gpt-5.4-mini");
    assert.deepEqual(lastAdapter?.modeSelections, ["session-1:plan"]);
    assert.deepEqual(lastAdapter?.modelSelections, ["session-1:gpt-5.4-mini"]);
    assert.deepEqual(lastAdapter?.cancelSessionIds, ["session-1"]);
  });

  it("allows mode changes but rejects model and reasoning changes while a prompt is active", async function () {
    let releasePrompt: () => void = () => undefined;
    setAcpConnectionAdapterFactoryForTests(async () => {
      lastAdapter = new FakeAcpConnectionAdapter();
      lastAdapter.holdPromptUntil = new Promise<void>((resolve) => {
        releasePrompt = resolve;
      });
      return lastAdapter;
    });

    const promptPromise = sendAcpConversationPrompt({
      message: "Busy turn",
    });
    await new Promise((resolve) => setTimeout(resolve, 120));

    const busySnapshot = getAcpConversationSnapshot();
    assert.equal(busySnapshot.busy, true);
    assert.equal(busySnapshot.status, "prompting");

    await setAcpConversationMode({
      modeId: "plan",
    });
    assert.deepEqual(lastAdapter?.modeSelections, ["session-1:plan"]);

    try {
      await setAcpConversationModel({
        modelId: "gpt-5.4-mini",
      });
      assert.fail("expected active prompt model change to be rejected");
    } catch (error) {
      assert.include(
        error instanceof Error ? error.message : String(error),
        "prompt is running",
      );
    }

    try {
      await setAcpConversationReasoningEffort({
        effortId: "high",
      });
      assert.fail("expected active prompt reasoning change to be rejected");
    } catch (error) {
      assert.include(
        error instanceof Error ? error.message : String(error),
        "prompt is running",
      );
    }
    assert.deepEqual(lastAdapter?.modelSelections, []);

    releasePrompt();
    await promptPromise;
  });

  it("derives reasoning effort choices from model variants and maps effort changes to raw model ids", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      lastAdapter = new FakeAcpConnectionAdapter();
      lastAdapter.modelState = {
        currentModelId: "gpt-5@high",
        availableModels: [
          { modelId: "gpt-5@low", name: "GPT-5 Low", description: "Low effort" },
          { modelId: "gpt-5@medium", name: "GPT-5 Medium", description: "Medium effort" },
          { modelId: "gpt-5@high", name: "GPT-5 High", description: "High effort" },
          { modelId: "claude-4@default", name: "Claude 4 Default" },
          { modelId: "claude-4@high", name: "Claude 4 High" },
        ],
      };
      return lastAdapter;
    });

    await sendAcpConversationPrompt({
      message: "Initial turn",
    });

    let snapshot = getAcpConversationSnapshot();
    assert.deepEqual(
      snapshot.displayModelOptions.map((entry) => entry.id),
      ["gpt-5", "claude-4"],
    );
    assert.equal(snapshot.displayModelOptions[0]?.label, "GPT-5");
    assert.equal(snapshot.currentModel?.id, "gpt-5@high");
    assert.equal(snapshot.currentDisplayModel?.id, "gpt-5");
    assert.deepEqual(
      snapshot.reasoningEffortOptions.map((entry) => entry.id),
      ["low", "medium", "high"],
    );
    assert.equal(snapshot.currentReasoningEffort?.id, "high");

    await setAcpConversationReasoningEffort({
      effortId: "medium",
    });
    snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.currentModel?.id, "gpt-5@medium");
    assert.equal(snapshot.currentDisplayModel?.id, "gpt-5");
    assert.equal(snapshot.currentReasoningEffort?.id, "medium");
    assert.deepEqual(lastAdapter?.modelSelections, ["session-1:gpt-5@medium"]);

    await setAcpConversationModel({
      modelId: "claude-4",
    });
    snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.currentModel?.id, "claude-4@default");
    assert.equal(snapshot.currentDisplayModel?.id, "claude-4");
    assert.equal(snapshot.currentReasoningEffort?.id, "default");
    assert.deepEqual(lastAdapter?.modelSelections, [
      "session-1:gpt-5@medium",
      "session-1:claude-4@default",
    ]);
  });

  it("keeps plain models unfolded and re-derives model effort state after persisted restore", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      lastAdapter = new FakeAcpConnectionAdapter();
      lastAdapter.modelState = {
        currentModelId: "gpt-5@high",
        availableModels: [
          { modelId: "gpt-5@low", name: "GPT-5 Low" },
          { modelId: "gpt-5@high", name: "GPT-5 High" },
          { modelId: "gpt-5.4-mini", name: "GPT-5.4 Mini" },
        ],
      };
      return lastAdapter;
    });

    await sendAcpConversationPrompt({
      message: "Initial turn",
    });

    let snapshot = getAcpConversationSnapshot();
    assert.deepEqual(
      snapshot.displayModelOptions.map((entry) => entry.id),
      ["gpt-5", "gpt-5.4-mini"],
    );
    assert.deepEqual(
      snapshot.reasoningEffortOptions.map((entry) => entry.id),
      ["low", "high"],
    );

    resetAcpSessionManagerForTests();
    snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.currentModel?.id, "gpt-5@high");
    assert.equal(snapshot.currentDisplayModel?.id, "gpt-5");
    assert.equal(snapshot.currentReasoningEffort?.id, "high");

    resetPluginStateStoreForTests();
    resetAcpSessionManagerForTests();
    setAcpConnectionAdapterFactoryForTests(async () => {
      lastAdapter = new FakeAcpConnectionAdapter();
      return lastAdapter;
    });
    await sendAcpConversationPrompt({
      message: "Plain models",
    });
    snapshot = getAcpConversationSnapshot();
    assert.deepEqual(
      snapshot.displayModelOptions.map((entry) => entry.id),
      ["gpt-5.4", "gpt-5.4-mini"],
    );
    assert.deepEqual(snapshot.reasoningEffortOptions, []);
    assert.isUndefined(snapshot.currentReasoningEffort);
  });

  it("folds effort variants encoded in dash suffixes or labels", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      lastAdapter = new FakeAcpConnectionAdapter();
      lastAdapter.modelState = {
        currentModelId: "openai-gpt-5-high",
        availableModels: [
          { modelId: "openai-gpt-5-low", name: "GPT-5 Low" },
          { modelId: "openai-gpt-5-medium", name: "GPT-5 Medium" },
          { modelId: "openai-gpt-5-high", name: "GPT-5 High" },
          { modelId: "anthropic-claude-sonnet", name: "Claude Sonnet (low)" },
          { modelId: "anthropic-claude-sonnet-fast", name: "Claude Sonnet (high)" },
        ],
      };
      return lastAdapter;
    });

    await sendAcpConversationPrompt({
      message: "Initial turn",
    });

    let snapshot = getAcpConversationSnapshot();
    assert.deepEqual(
      snapshot.displayModelOptions.map((entry) => entry.id),
      ["openai-gpt-5", "Claude Sonnet"],
    );
    assert.equal(snapshot.displayModelOptions[0]?.label, "GPT-5");
    assert.equal(snapshot.currentDisplayModel?.id, "openai-gpt-5");
    assert.deepEqual(
      snapshot.reasoningEffortOptions.map((entry) => entry.id),
      ["low", "medium", "high"],
    );

    await setAcpConversationModel({
      modelId: "Claude Sonnet",
    });
    snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.currentDisplayModel?.id, "Claude Sonnet");
    assert.equal(snapshot.currentReasoningEffort?.id, "high");
    assert.equal(snapshot.currentModel?.id, "anthropic-claude-sonnet-fast");
    assert.deepEqual(lastAdapter?.modelSelections, [
      "session-1:anthropic-claude-sonnet-fast",
    ]);
  });
});

describe("acp conversation store", function () {
  afterEach(function () {
    resetPluginStateStoreForTests();
    delete (Zotero as typeof Zotero & { DataDirectory?: unknown }).DataDirectory;
  });

  it("migrates legacy per-backend conversation storage into a default chat session", function () {
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
    assert.equal(restored.snapshot.conversationId, "legacy-conversation");
    assert.equal(restored.snapshot.sessionId, "");
    assert.equal(restored.snapshot.remoteSessionId, "legacy-remote-session");
    assert.equal(restored.items[0]?.kind, "message");
    assert.equal(
      restored.items.find((entry) => entry.kind === "message")?.text,
      "Legacy hello",
    );
    assert.equal(
      listAcpChatSessions(ACP_OPENCODE_BACKEND_ID)[0]?.conversationId,
      "legacy-conversation",
    );
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
        "D:\\ZoteroSkillsRuntime\\acp\\chat\\workspace",
      );
      assert.equal(
        primary.workspaceDir,
        primary.agentWorkspaceDir,
      );
      assert.equal(
        primary.conversationStorageDir,
        "D:\\ZoteroSkillsRuntime\\acp\\chat\\conversations\\acp-opencode",
      );
      assert.equal(
        primary.storageDir,
        primary.conversationStorageDir,
      );
      assert.equal(
        primary.runtimeDir,
        "D:\\ZoteroSkillsRuntime\\acp\\chat\\runtime\\acp-opencode",
      );

      const withConversation = resolveAcpChatRuntimePaths(
        ACP_OPENCODE_BACKEND_ID,
        "conversation-1",
      );
      assert.equal(
        withConversation.agentWorkspaceDir,
        "D:\\ZoteroSkillsRuntime\\acp\\chat\\workspace",
      );
      assert.equal(
        withConversation.conversationStorageDir,
        "D:\\ZoteroSkillsRuntime\\acp\\chat\\conversations\\acp-opencode\\conversation-1",
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

  it("resolves ACP session cwd to the shared ACP chat workspace", function () {
    const previousRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = "D:\\ZoteroSkillsRuntime";
    (Zotero as typeof Zotero & { DataDirectory?: { dir?: string } }).DataDirectory = {
      dir: "D:\\ZoteroData",
    };
    try {
      assert.equal(
        resolveAcpSessionCwd(),
        "D:\\ZoteroSkillsRuntime\\acp\\chat\\workspace",
      );
    } finally {
      delete (Zotero as typeof Zotero & { DataDirectory?: unknown }).DataDirectory;
      if (typeof previousRoot === "undefined") {
        delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
      } else {
        process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRoot;
      }
    }
  });
});

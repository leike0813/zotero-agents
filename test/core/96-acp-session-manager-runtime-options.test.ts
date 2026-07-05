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
  createAcpBackendFromPreset,
  createBackendsPrefsDocument,
  deleteActiveAcpConversation,
  disconnectAcpConversation,
  fs,
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
  shouldRefreshAcpChatSnapshotForChange,
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

describe("acp session manager", function () {
  const harness = installAcpSessionManagerTestHooks();

  it("refreshes ACP backend metadata without starting an engine", async function () {
    await refreshAcpConversationBackends();

    const frontend = getAcpFrontendSnapshot();
    const snapshot = getAcpConversationSnapshot();
    assert.equal(frontend.activeBackendId, ACP_OPENCODE_BACKEND_ID);
    assert.isAtLeast(frontend.backends.length, 1);
    assert.equal(snapshot.backendId, ACP_OPENCODE_BACKEND_ID);
    assert.equal(snapshot.backend?.id, ACP_OPENCODE_BACKEND_ID);
    assert.isNull(harness.lastAdapter);
  });

  it("projects all configured ACP backends with display names for ACP chat selectors", async function () {
    Zotero.Prefs.set(
      `${config.prefsPrefix}.backendsConfigJson`,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "acp-one",
            displayName: "ACP One Visible",
            type: "acp",
            command: "node",
            args: ["one.js"],
          },
          {
            id: "acp-two",
            displayName: "ACP Two Visible",
            type: "acp",
            command: "node",
            args: ["two.js"],
          },
          {
            id: "skillrunner-one",
            displayName: "SkillRunner One",
            type: "skillrunner",
            baseUrl: "http://127.0.0.1:8000",
          },
        ],
      }),
      true,
    );

    await refreshAcpConversationBackends();

    const frontend = getAcpFrontendSnapshot();
    assert.deepInclude(
      frontend.backends.map((entry) => [entry.backendId, entry.displayName]),
      ["acp-one", "ACP One Visible"],
    );
    assert.deepInclude(
      frontend.backends.map((entry) => [entry.backendId, entry.displayName]),
      ["acp-two", "ACP Two Visible"],
    );
    assert.notDeepInclude(
      frontend.backends.map((entry) => [entry.backendId, entry.displayName]),
      ["skillrunner-one", "SkillRunner One"],
    );
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
      harness.lastFactoryArgs = args;
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.omitSessionRuntimeOptions = true;
      return harness.lastAdapter;
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
    assert.deepEqual(harness.lastAdapter?.sessionIds, ["session-1"]);
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
      harness.lastFactoryArgs = args;
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.emptySessionRuntimeOptions = true;
      return harness.lastAdapter;
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

  it("projects ACP config options into chat runtime selectors and updates them from notifications", async function () {
    setAcpConnectionAdapterFactoryForTests(async (args) => {
      harness.lastFactoryArgs = args;
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.sessionConfigOptions = [
        {
          id: "mode",
          name: "Mode",
          category: "mode",
          type: "select",
          currentValue: "ask",
          options: [
            { value: "ask", name: "Ask" },
            { value: "build", name: "Build" },
          ],
        },
        {
          id: "model",
          name: "Model",
          category: "model",
          type: "select",
          currentValue: "openai/gpt-5",
          options: [
            { value: "openai/gpt-5", name: "GPT-5" },
            { value: "anthropic/claude", name: "Claude" },
          ],
        },
        {
          id: "effort",
          name: "Reasoning",
          category: "thought_level",
          type: "select",
          currentValue: "low",
          options: [
            { value: "low", name: "Low" },
            { value: "high", name: "High" },
          ],
        },
      ];
      return harness.lastAdapter;
    });

    await refreshAcpConversationBackends();
    await connectAcpConversation();
    let snapshot = getAcpConversationSnapshot();

    assert.deepEqual(
      snapshot.modeOptions.map((entry) => entry.id),
      ["ask", "build"],
    );
    assert.equal(snapshot.currentMode?.id, "ask");
    assert.deepEqual(
      snapshot.displayModelOptions.map((entry) => entry.id),
      ["openai/gpt-5", "anthropic/claude"],
    );
    assert.equal(snapshot.currentDisplayModel?.id, "openai/gpt-5");
    assert.deepEqual(
      snapshot.reasoningEffortOptions.map((entry) => entry.id),
      ["low", "high"],
    );
    assert.equal(snapshot.currentReasoningEffort?.id, "low");

    await harness.lastAdapter?.emitSessionUpdate({
      sessionId: snapshot.sessionId,
      update: {
        sessionUpdate: "config_option_update",
        configOptions: [
          {
            id: "mode",
            name: "Mode",
            category: "mode",
            type: "select",
            currentValue: "build",
            options: [
              { value: "ask", name: "Ask" },
              { value: "build", name: "Build" },
            ],
          },
          {
            id: "model",
            name: "Model",
            category: "model",
            type: "select",
            currentValue: "anthropic/claude",
            options: [
              { value: "openai/gpt-5", name: "GPT-5" },
              { value: "anthropic/claude", name: "Claude" },
            ],
          },
          {
            id: "effort",
            name: "Reasoning",
            category: "thought_level",
            type: "select",
            currentValue: "high",
            options: [
              { value: "low", name: "Low" },
              { value: "high", name: "High" },
            ],
          },
        ],
      },
    });
    snapshot = getAcpConversationSnapshot();

    assert.equal(snapshot.lastLifecycleEvent, "config_option_update");
    assert.equal(snapshot.currentMode?.id, "build");
    assert.equal(snapshot.currentDisplayModel?.id, "anthropic/claude");
    assert.equal(snapshot.currentReasoningEffort?.id, "high");
  });

  it("uses ACP config option controls before legacy mode and model setters", async function () {
    setAcpConnectionAdapterFactoryForTests(async (args) => {
      harness.lastFactoryArgs = args;
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.sessionConfigOptions = [
        {
          id: "mode",
          name: "Mode",
          category: "mode",
          type: "select",
          currentValue: "ask",
          options: [
            { value: "ask", name: "Ask" },
            { value: "build", name: "Build" },
          ],
        },
        {
          id: "model",
          name: "Model",
          category: "model",
          type: "select",
          currentValue: "openai/gpt-5",
          options: [
            { value: "openai/gpt-5", name: "GPT-5" },
            { value: "anthropic/claude", name: "Claude" },
          ],
        },
        {
          id: "effort",
          name: "Reasoning",
          category: "thought_level",
          type: "select",
          currentValue: "low",
          options: [
            { value: "low", name: "Low" },
            { value: "high", name: "High" },
          ],
        },
      ];
      return harness.lastAdapter;
    });

    await refreshAcpConversationBackends();
    await connectAcpConversation();
    await setAcpConversationMode({ modeId: "build" });
    await setAcpConversationModel({ modelId: "anthropic/claude" });
    await setAcpConversationReasoningEffort({ effortId: "high" });

    assert.deepEqual(harness.lastAdapter?.configOptionSelections, [
      "session-1:mode:build",
      "session-1:model:anthropic/claude",
      "session-1:thought_level:high",
    ]);
    assert.deepEqual(harness.lastAdapter?.modeSelections, []);
    assert.deepEqual(harness.lastAdapter?.modelSelections, []);
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
    assert.deepEqual(harness.lastAdapter?.modeSelections, ["session-1:plan"]);
    assert.deepEqual(harness.lastAdapter?.modelSelections, [
      "session-1:gpt-5.4-mini",
    ]);
    assert.deepEqual(harness.lastAdapter?.cancelSessionIds, ["session-1"]);
    assert.equal(harness.lastAdapter?.closeCalls, 0);
  });

  it("allows mode changes but rejects model and reasoning changes while a prompt is active", async function () {
    let releasePrompt: () => void = () => undefined;
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      releasePrompt = harness.lastAdapter.holdPrompt();
      return harness.lastAdapter;
    });

    const promptPromise = sendAcpConversationPrompt({
      message: "Busy turn",
    });
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (getAcpConversationSnapshot().busy) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const busySnapshot = getAcpConversationSnapshot();
    assert.equal(busySnapshot.busy, true);
    assert.equal(busySnapshot.status, "prompting");

    await setAcpConversationMode({
      modeId: "plan",
    });
    assert.deepEqual(harness.lastAdapter?.modeSelections, ["session-1:plan"]);

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
    assert.deepEqual(harness.lastAdapter?.modelSelections, []);

    releasePrompt();
    await promptPromise;
  });

  it("derives reasoning effort choices from model variants and maps effort changes to raw model ids", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.modelState = {
        currentModelId: "gpt-5@high",
        availableModels: [
          {
            modelId: "gpt-5@low",
            name: "GPT-5 Low",
            description: "Low effort",
          },
          {
            modelId: "gpt-5@medium",
            name: "GPT-5 Medium",
            description: "Medium effort",
          },
          {
            modelId: "gpt-5@high",
            name: "GPT-5 High",
            description: "High effort",
          },
          { modelId: "claude-4@default", name: "Claude 4 Default" },
          { modelId: "claude-4@high", name: "Claude 4 High" },
        ],
      };
      return harness.lastAdapter;
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
    assert.deepEqual(harness.lastAdapter?.modelSelections, [
      "session-1:gpt-5@medium",
    ]);

    await setAcpConversationModel({
      modelId: "claude-4",
    });
    snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.currentModel?.id, "claude-4@default");
    assert.equal(snapshot.currentDisplayModel?.id, "claude-4");
    assert.equal(snapshot.currentReasoningEffort?.id, "default");
    assert.deepEqual(harness.lastAdapter?.modelSelections, [
      "session-1:gpt-5@medium",
      "session-1:claude-4@default",
    ]);
  });

  it("keeps plain models unfolded and re-derives model effort state after persisted restore", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.modelState = {
        currentModelId: "gpt-5@high",
        availableModels: [
          { modelId: "gpt-5@low", name: "GPT-5 Low" },
          { modelId: "gpt-5@high", name: "GPT-5 High" },
          { modelId: "gpt-5.4-mini", name: "GPT-5.4 Mini" },
        ],
      };
      return harness.lastAdapter;
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
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      return harness.lastAdapter;
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
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.modelState = {
        currentModelId: "openai-gpt-5-high",
        availableModels: [
          { modelId: "openai-gpt-5-low", name: "GPT-5 Low" },
          { modelId: "openai-gpt-5-medium", name: "GPT-5 Medium" },
          { modelId: "openai-gpt-5-high", name: "GPT-5 High" },
          { modelId: "anthropic-claude-sonnet", name: "Claude Sonnet (low)" },
          {
            modelId: "anthropic-claude-sonnet-fast",
            name: "Claude Sonnet (high)",
          },
        ],
      };
      return harness.lastAdapter;
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
    assert.deepEqual(harness.lastAdapter?.modelSelections, [
      "session-1:anthropic-claude-sonnet-fast",
    ]);
  });
});

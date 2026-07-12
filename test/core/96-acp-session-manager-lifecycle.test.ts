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
  setAcpChatPromptInterruptGraceMsForTests,
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

  it("connects and disconnects the active ACP conversation explicitly", async function () {
    await connectAcpConversation();

    let snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "connected");
    assert.equal(snapshot.sessionId, "session-1");
    assert.equal(snapshot.remoteSessionId, "session-1");
    assert.equal(harness.lastAdapter?.initializeCalls, 1);

    await disconnectAcpConversation();

    snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "idle");
    assert.equal(snapshot.sessionId, "");
    assert.equal(snapshot.remoteSessionId, "session-1");
    assert.equal(harness.lastAdapter?.closeCalls, 1);
  });

  it("publishes disconnecting while ACP conversation close is pending", async function () {
    await connectAcpConversation();
    let releaseClose: (() => void) | null = null;
    releaseClose = harness.lastAdapter!.holdClose();

    const disconnectPromise = disconnectAcpConversation();
    await Promise.resolve();

    let snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "disconnecting");
    assert.equal(harness.lastAdapter?.closeCalls, 1);

    releaseClose?.();
    await disconnectPromise;

    snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "idle");
    assert.equal(snapshot.sessionId, "");
    assert.equal(snapshot.remoteSessionId, "session-1");
  });

  it("settles ACP conversation disconnect to idle when adapter close rejects", async function () {
    await connectAcpConversation();
    harness.lastAdapter!.closeRejectError = new Error("close failed");

    await disconnectAcpConversation();

    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "idle");
    assert.equal(snapshot.sessionId, "");
    assert.equal(harness.lastAdapter?.closeCalls, 1);
    assert.isOk(
      snapshot.diagnostics.find(
        (entry) =>
          entry.kind === "disconnect_close_error" && entry.level === "warn",
      ),
    );
  });

  it("persists ACP conversation idle state during manager shutdown", async function () {
    await connectAcpConversation();

    const snapshot = getAcpConversationSnapshot();
    const requestId = `conversation:${snapshot.backendId}:${snapshot.conversationId}`;
    let entry = getPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, requestId);
    assert.equal(entry?.state, "idle");

    await shutdownAcpSessionManager();

    entry = getPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, requestId);
    assert.equal(entry?.state, "idle");
    const payload = JSON.parse(String(entry?.payload || "{}")) as {
      status?: string;
      busy?: boolean;
      sessionId?: string;
      remoteSessionId?: string;
      lastLifecycleEvent?: string;
    };
    assert.equal(payload.status, "idle");
    assert.equal(payload.busy, false);
    assert.equal(payload.sessionId, "");
    assert.equal(payload.remoteSessionId, "session-1");
    assert.equal(payload.lastLifecycleEvent, "shutdown-disconnected");
    assert.equal(harness.lastAdapter?.closeCalls, 1);
  });

  it("bounds ACP conversation shutdown when adapter close never settles", async function () {
    this.timeout(5000);
    await connectAcpConversation();
    harness.lastAdapter!.closeNeverSettles = true;

    const snapshot = getAcpConversationSnapshot();
    const requestId = `conversation:${snapshot.backendId}:${snapshot.conversationId}`;
    const startedAt = Date.now();

    await shutdownAcpSessionManager();

    assert.isBelow(Date.now() - startedAt, 2800);
    const entry = getPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, requestId);
    assert.equal(entry?.state, "idle");
    const payload = JSON.parse(String(entry?.payload || "{}")) as {
      status?: string;
      busy?: boolean;
      sessionId?: string;
      lastLifecycleEvent?: string;
      diagnostics?: Array<{ kind?: string }>;
    };
    assert.equal(payload.status, "idle");
    assert.equal(payload.busy, false);
    assert.equal(payload.sessionId, "");
    assert.equal(payload.lastLifecycleEvent, "shutdown-disconnected");
    assert.isTrue(
      (payload.diagnostics || []).some(
        (entry) => entry.kind === "shutdown_timeout",
      ),
    );
    assert.equal(harness.lastAdapter?.closeCalls, 1);
  });

  it("exposes authentication methods and reconnects after authenticate", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.failNewSessionUntilAuthenticated = true;
      return harness.lastAdapter;
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
    assert.deepEqual(harness.lastAdapter?.authenticateCalls, ["device"]);
  });

  it("surfaces command prerequisite failures without silently connecting", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.failInitialize = true;
      return harness.lastAdapter;
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
    assert.include(["idle", "stopped", "error"], bundle.mcpServer?.status);
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
    assert.include(["running", "error"], snapshot.mcpServer?.status);
    assert.include(["listening", "error"], snapshot.mcpHealth?.state);
    assert.isAtLeast((snapshot.mcpHealth?.tooltip || []).length, 1);
  });

  it("keeps stderr tail and lifecycle metadata visible when the ACP process closes unexpectedly", async function () {
    await sendAcpConversationPrompt({
      message: "Before close",
    });

    harness.lastAdapter?.emitClose({
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

  it("treats a quiet close after an idle connected turn as disconnected idle", async function () {
    await sendAcpConversationPrompt({
      message: "Quiet close after connected",
    });

    harness.lastAdapter?.emitClose();

    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "idle");
    assert.equal(snapshot.busy, false);
    assert.equal(snapshot.lastLifecycleEvent, "closed");
    assert.equal(snapshot.lastError, "");
  });

  it("keeps an in-flight prompt busy until cancellation is confirmed", async function () {
    await connectAcpConversation();
    const releasePrompt = harness.lastAdapter!.holdPrompt();
    harness.lastAdapter!.promptStopReason = "cancelled";
    const prompt = sendAcpConversationPrompt({ message: "Cancelable turn" });
    await waitForAcpConversationSnapshot((snapshot) => snapshot.busy);
    await cancelAcpConversationPrompt();
    let snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.busy, true);
    assert.equal(snapshot.promptInterruptState, "requested");
    assert.deepEqual(harness.lastAdapter?.cancelSessionIds, ["session-1"]);

    releasePrompt();
    await prompt;

    snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.status, "connected");
    assert.equal(snapshot.busy, false);
    assert.equal(snapshot.lastStopReason, "cancelled");
    assert.equal(snapshot.promptInterruptState, "confirmed");
    assert.equal(harness.lastAdapter?.closeCalls, 0);
  });

  it("preserves a non-cancelled backend result as unconfirmed", async function () {
    await connectAcpConversation();
    const releasePrompt = harness.lastAdapter!.holdPrompt();
    const prompt = sendAcpConversationPrompt({ message: "Cancel lost race" });
    await waitForAcpConversationSnapshot((snapshot) => snapshot.busy);
    await cancelAcpConversationPrompt();
    releasePrompt();
    await prompt;

    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.lastStopReason, "end_turn");
    assert.equal(snapshot.promptInterruptState, "unconfirmed");
    assert.equal(snapshot.status, "connected");
  });

  it("force-closes only the active conversation after the interrupt grace period", async function () {
    setAcpChatPromptInterruptGraceMsForTests(5);
    await connectAcpConversation();
    harness.lastAdapter!.holdPrompt();
    void sendAcpConversationPrompt({ message: "Ignore cancellation" });
    await waitForAcpConversationSnapshot((snapshot) => snapshot.busy);
    await cancelAcpConversationPrompt();

    const snapshot = await waitForAcpConversationSnapshot(
      (current) => current.promptInterruptState === "forced",
    );
    assert.equal(snapshot.status, "idle");
    assert.equal(snapshot.busy, false);
    assert.equal(snapshot.sessionId, "");
    assert.equal(snapshot.remoteSessionId, "session-1");
    assert.equal(harness.lastAdapter?.closeCalls, 1);
  });
});

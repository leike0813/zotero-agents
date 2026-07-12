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

  it("waits for an interactive permission decision and resumes the prompt after allow", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.emitPermissionDuringPrompt = true;
      return harness.lastAdapter;
    });

    const promptPromise = sendAcpConversationPrompt({
      message: "Need permission",
    });

    let snapshot = await waitForAcpConversationSnapshot(
      (entry) => !!entry.pendingPermissionRequest,
    );
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
    assert.deepEqual(harness.lastAdapter?.lastPermissionOutcome, {
      outcome: "selected",
      optionId: "allow-once",
    });
  });

  it("resolves arbitrary permission option ids supplied by the adapter", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.emitPermissionDuringPrompt = true;
      harness.lastAdapter.permissionOptions = [
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
      return harness.lastAdapter;
    });

    const promptPromise = sendAcpConversationPrompt({
      message: "Need custom permission",
    });

    const snapshot = await waitForAcpConversationSnapshot(
      (entry) => !!entry.pendingPermissionRequest,
    );
    assert.deepEqual(
      snapshot.pendingPermissionRequest?.options.map((entry) => entry.optionId),
      ["approve-session", "edit-command", "deny-session"],
    );

    await resolveAcpConversationPermission({
      outcome: "selected",
      optionId: "edit-command",
    });
    await promptPromise;

    assert.deepEqual(harness.lastAdapter?.lastPermissionOutcome, {
      outcome: "selected",
      optionId: "edit-command",
    });
  });

  it("auto-approves ACP Chat tool permission requests when enabled", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.emitPermissionDuringPrompt = true;
      return harness.lastAdapter;
    });

    await startNewAcpConversation();
    setAcpConversationAutoApprovePermissions({ enabled: true });

    await sendAcpConversationPrompt({
      message: "Auto approve permission",
    });

    const snapshot = getAcpConversationSnapshot();
    assert.isTrue(snapshot.autoApproveAcpPermissions);
    assert.isNull(snapshot.pendingPermissionRequest);
    assert.deepEqual(harness.lastAdapter?.lastPermissionOutcome, {
      outcome: "selected",
      optionId: "allow-once",
    });
    assert.isOk(
      snapshot.diagnostics.find(
        (entry) => entry.kind === "permission_auto_approved",
      ),
    );
  });

  it("publishes ACP Chat auto-approval toggles to the UI snapshot immediately", async function () {
    await startNewAcpConversation();

    setAcpConversationAutoApprovePermissions({ enabled: true });
    assert.isTrue(getAcpConversationSnapshot().autoApproveAcpPermissions);
    assert.isTrue(getAcpConversationUiSnapshot().autoApproveAcpPermissions);

    setAcpConversationAutoApprovePermissions({ enabled: false });
    assert.isFalse(getAcpConversationSnapshot().autoApproveAcpPermissions);
    assert.isFalse(getAcpConversationUiSnapshot().autoApproveAcpPermissions);
  });

  it("allows ACP Chat auto-approval to be enabled before the first local conversation is created", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.emitPermissionDuringPrompt = true;
      return harness.lastAdapter;
    });

    assert.equal(getAcpConversationSnapshot().conversationId, "");
    setAcpConversationAutoApprovePermissions({ enabled: true });
    assert.isTrue(getAcpConversationSnapshot().autoApproveAcpPermissions);

    await sendAcpConversationPrompt({
      message: "Auto approve initial placeholder conversation",
    });

    const snapshot = getAcpConversationSnapshot();
    assert.isNotEmpty(snapshot.conversationId);
    assert.isTrue(snapshot.autoApproveAcpPermissions);
    assert.isNull(snapshot.pendingPermissionRequest);
    assert.deepEqual(harness.lastAdapter?.lastPermissionOutcome, {
      outcome: "selected",
      optionId: "allow-once",
    });
  });

  it("prefers allow_once over allow_always for ACP Chat auto-approval", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.emitPermissionDuringPrompt = true;
      harness.lastAdapter.permissionOptions = [
        {
          optionId: "allow-always",
          kind: "allow_always",
          name: "Allow Always",
        },
        {
          optionId: "allow-once-preferred",
          kind: "allow_once",
          name: "Allow Once",
        },
      ];
      return harness.lastAdapter;
    });

    await startNewAcpConversation();
    setAcpConversationAutoApprovePermissions({ enabled: true });

    await sendAcpConversationPrompt({
      message: "Prefer allow once",
    });

    assert.deepEqual(harness.lastAdapter?.lastPermissionOutcome, {
      outcome: "selected",
      optionId: "allow-once-preferred",
    });
    assert.isNull(getAcpConversationSnapshot().pendingPermissionRequest);
  });

  it("falls back to manual ACP Chat permission approval when auto-approval cannot select a standard allow option", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.emitPermissionDuringPrompt = true;
      harness.lastAdapter.permissionOptions = [
        {
          optionId: "reject-only",
          kind: "reject_once",
          name: "Reject",
        },
      ];
      return harness.lastAdapter;
    });

    await startNewAcpConversation();
    setAcpConversationAutoApprovePermissions({ enabled: true });
    const promptPromise = sendAcpConversationPrompt({
      message: "Manual fallback",
    });

    const snapshot = await waitForAcpConversationSnapshot(
      (entry) => !!entry.pendingPermissionRequest,
    );
    assert.equal(
      snapshot.pendingPermissionRequest?.options[0]?.optionId,
      "reject-only",
    );

    await resolveAcpConversationPermission({
      outcome: "cancelled",
    });
    await promptPromise;

    assert.deepEqual(harness.lastAdapter?.lastPermissionOutcome, {
      outcome: "cancelled",
    });
  });

  it("resolves a pending permission as cancelled before interrupting the prompt", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.emitPermissionDuringPrompt = true;
      return harness.lastAdapter;
    });

    await startNewAcpConversation();
    const promptPromise = sendAcpConversationPrompt({
      message: "Cancel during permission",
    });
    await waitForAcpConversationSnapshot(
      (entry) => !!entry.pendingPermissionRequest,
    );

    await cancelAcpConversationPrompt();
    await promptPromise;

    assert.deepEqual(harness.lastAdapter?.lastPermissionOutcome, {
      outcome: "cancelled",
    });
    assert.isNull(getAcpConversationSnapshot().pendingPermissionRequest);
    assert.equal(
      getAcpConversationSnapshot().promptInterruptState,
      "unconfirmed",
    );
  });

  it("does not auto-approve non ACP-tool permission channels and keeps the setting conversation-scoped", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.emitPermissionDuringPrompt = true;
      harness.lastAdapter.permissionSource = "zotero-mcp-write";
      return harness.lastAdapter;
    });

    await startNewAcpConversation();
    setAcpConversationAutoApprovePermissions({ enabled: true });
    const firstConversationId = getAcpConversationSnapshot().conversationId;
    const promptPromise = sendAcpConversationPrompt({
      message: "Non tool source",
    });

    await waitForAcpConversationSnapshot(
      (entry) => !!entry.pendingPermissionRequest,
    );
    assert.isNull(harness.lastAdapter?.lastPermissionOutcome);

    await resolveAcpConversationPermission({
      outcome: "cancelled",
    });
    await promptPromise;

    await startNewAcpConversation();
    const second = getAcpConversationSnapshot();
    assert.notEqual(second.conversationId, firstConversationId);
    assert.isFalse(second.autoApproveAcpPermissions);

    await setActiveAcpConversation({ conversationId: firstConversationId });
    assert.isTrue(getAcpConversationSnapshot().autoApproveAcpPermissions);
  });
});

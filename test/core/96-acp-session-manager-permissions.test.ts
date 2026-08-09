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
  resolveAcpChatWorkspacePublicationKinds,
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
import { setAcpConversationHostBridgePermissionRequest } from "../../src/modules/acpConversationHostBridgePermissionRegistry";

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

  it("serializes overlapping permission requests and resolves only the active request id", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.emitPermissionDuringPrompt = true;
      return harness.lastAdapter;
    });

    const promptPromise = sendAcpConversationPrompt({
      message: "Queue two permissions",
    });
    const first = await waitForAcpConversationSnapshot(
      (entry) => !!entry.pendingPermissionRequest,
    );
    const conversationId = first.conversationId;
    const firstRequestId = first.pendingPermissionRequest?.requestId || "";
    let secondOutcome: unknown = null;
    assert.isTrue(
      setAcpConversationHostBridgePermissionRequest(conversationId, {
        requestId: "host-bridge-permission-2",
        sessionId: first.sessionId,
        toolCallId: "host-bridge-tool-2",
        toolTitle: "Update Zotero item",
        source: "host-bridge-cli",
        approvalKind: "zotero-write",
        summary: "Write one Zotero item",
        requestedAt: "2026-07-28T00:00:00.000Z",
        options: [
          {
            optionId: "approve_once",
            kind: "allow_once",
            name: "Approve",
          },
        ],
        resolve: (outcome) => {
          secondOutcome = outcome;
        },
      }),
    );

    assert.equal(
      getAcpConversationSnapshot().pendingPermissionRequest?.requestId,
      firstRequestId,
    );
    await resolveAcpConversationPermission({
      permissionRequestId: "host-bridge-permission-2",
      outcome: "cancelled",
    });
    assert.equal(
      getAcpConversationSnapshot().pendingPermissionRequest?.requestId,
      firstRequestId,
    );
    assert.isNull(secondOutcome);

    await resolveAcpConversationPermission({
      permissionRequestId: firstRequestId,
      outcome: "selected",
      optionId: "allow-once",
    });
    const second = await waitForAcpConversationSnapshot(
      (entry) =>
        entry.pendingPermissionRequest?.requestId ===
        "host-bridge-permission-2",
    );
    assert.equal(second.pendingPermissionRequest?.approvalKind, "zotero-write");

    await resolveAcpConversationPermission({
      permissionRequestId: "host-bridge-permission-2",
      outcome: "selected",
      optionId: "approve_once",
    });
    await promptPromise;
    assert.deepEqual(secondOutcome, {
      outcome: "selected",
      optionId: "approve_once",
    });
    assert.isNull(getAcpConversationSnapshot().pendingPermissionRequest);
  });

  it("publishes an explicit permission clear transition", async function () {
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.emitPermissionDuringPrompt = true;
      return harness.lastAdapter;
    });
    const changes: AcpChatPanelSnapshotChange[] = [];
    const unsubscribe = subscribeAcpChatPanelSnapshots((change) => {
      changes.push(change);
    });
    const promptPromise = sendAcpConversationPrompt({
      message: "Publish permission clear",
    });
    const pending = await waitForAcpConversationSnapshot(
      (entry) => !!entry.pendingPermissionRequest,
    );
    const permissionChangesBeforeResolve = changes.filter((change) =>
      change.kinds.includes("permission"),
    ).length;

    await resolveAcpConversationPermission({
      permissionRequestId: pending.pendingPermissionRequest?.requestId,
      outcome: "selected",
      optionId: "allow-once",
    });
    await promptPromise;
    const permissionChangesAfterResolve = changes.filter((change) =>
      change.kinds.includes("permission"),
    ).length;
    unsubscribe();

    assert.isAbove(
      permissionChangesAfterResolve,
      permissionChangesBeforeResolve,
    );
    assert.isNull(getAcpConversationSnapshot().pendingPermissionRequest);
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
    const changes: AcpChatPanelSnapshotChange[] = [];
    const unsubscribe = subscribeAcpChatPanelSnapshots((change) => {
      changes.push(change);
    });

    setAcpConversationAutoApprovePermissions({ enabled: true });
    assert.isTrue(getAcpConversationSnapshot().autoApproveAcpPermissions);
    assert.isTrue(getAcpConversationUiSnapshot().autoApproveAcpPermissions);

    const permissionChange = changes.find((change) =>
      change.kinds.includes("permission"),
    );
    assert.isOk(permissionChange);
    assert.include(
      resolveAcpChatWorkspacePublicationKinds(
        {
          activeTab: "acp-chat",
          hasActiveTarget: true,
          transcriptPaginationVirtualizationEnabled: true,
          executionDisplayMode: "live",
        },
        permissionChange!,
      ),
      "owner-control",
    );

    setAcpConversationAutoApprovePermissions({ enabled: false });
    assert.isFalse(getAcpConversationSnapshot().autoApproveAcpPermissions);
    assert.isFalse(getAcpConversationUiSnapshot().autoApproveAcpPermissions);
    unsubscribe();
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
    const snapshot = getAcpConversationSnapshot();
    let queuedOutcome: unknown = null;
    assert.isTrue(
      setAcpConversationHostBridgePermissionRequest(snapshot.conversationId, {
        requestId: "queued-before-cancel",
        sessionId: snapshot.sessionId,
        toolCallId: "queued-tool",
        toolTitle: "Queued Zotero write",
        source: "host-bridge-cli",
        approvalKind: "zotero-write",
        requestedAt: "2026-07-28T00:00:00.000Z",
        options: [],
        resolve: (outcome) => {
          queuedOutcome = outcome;
        },
      }),
    );

    await cancelAcpConversationPrompt();
    await promptPromise;

    assert.deepEqual(harness.lastAdapter?.lastPermissionOutcome, {
      outcome: "cancelled",
    });
    assert.deepEqual(queuedOutcome, { outcome: "cancelled" });
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

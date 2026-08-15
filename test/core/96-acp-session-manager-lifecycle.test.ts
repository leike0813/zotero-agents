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
  pruneAcpChatSessionRuntimesForBackends,
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
  armAcpRuntimeSemanticTraceRecorder,
  cancelAcpRuntimeSemanticTraceRecorder,
  discardAcpRuntimeSemanticTracePartialForTests,
  finishAcpRuntimeSemanticTraceRoot,
  getAcpRuntimeSemanticTraceRecorderView,
} from "../../src/modules/acpRuntimeSemanticTraceRecorder";
import { createAcpChatRuntimeReplayTarget } from "../../src/modules/acpRuntimeReplayTargets";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";

describe("acp session manager", function () {
  const harness = installAcpSessionManagerTestHooks();

  it("activates a synthetic Replay conversation through the scoped adapter seam", async function () {
    configureNoAcpBackendForTests();
    resetAcpSessionManagerForTests();
    const target = await createAcpChatRuntimeReplayTarget({
      syntheticRootId: "synthetic-root",
    });
    await target.activate();
    assert.deepInclude(getAcpFrontendSnapshot(), {
      activeBackendId: "acp-replay",
      activeConversationId: "synthetic-root-conversation",
    });
    assert.isNull(harness.lastFactoryArgs);

    await refreshAcpConversationBackends();
    assert.deepInclude(getAcpFrontendSnapshot(), {
      activeBackendId: "acp-replay",
      activeConversationId: "synthetic-root-conversation",
    });
    assert.isNull(harness.lastFactoryArgs);
    const panel = await prepareAcpChatPanelSnapshot({ target: "library" });
    assert.deepInclude(panel, {
      backendAvailability: "selected",
      conversationAvailability: "selected",
      activeBackendId: "acp-replay",
      activeConversationId: "synthetic-root-conversation",
    });
    assert.include(
      panel.backendOptions.map((entry) => entry.backendId),
      "acp-replay",
    );

    pruneAcpChatSessionRuntimesForBackends([]);
    const afterPrune = getAcpFrontendSnapshot();
    assert.deepInclude(afterPrune, {
      activeBackendId: "acp-replay",
      activeConversationId: "synthetic-root-conversation",
    });
    assert.equal(afterPrune.activeSnapshot.status, "connected");

    await setActiveAcpBackend({ backendId: "acp-replay" });
    await setActiveAcpConversation({
      backendId: "acp-replay",
      conversationId: "synthetic-root-conversation",
    });
    assert.deepInclude(getAcpFrontendSnapshot(), {
      activeBackendId: "acp-replay",
      activeConversationId: "synthetic-root-conversation",
    });

    let selectorError: unknown;
    try {
      await setActiveAcpConversation({
        backendId: "missing-backend",
        conversationId: "missing-conversation",
      });
    } catch (error) {
      selectorError = error;
    }
    assert.match(String(selectorError), /not available/);

    await target.cleanup();
    assert.deepInclude(getAcpFrontendSnapshot(), {
      activeBackendId: "",
      activeConversationId: "",
    });
    let unavailableSelectorError: unknown;
    try {
      await setActiveAcpBackend({ backendId: "acp-replay" });
    } catch (error) {
      unavailableSelectorError = error;
    }
    assert.match(String(unavailableSelectorError), /not available/);
  });

  it("restores synthetic Replay selection idempotently without allowing a stale target to overwrite a newer owner", async function () {
    await startNewAcpConversation();
    const original = getAcpFrontendSnapshot();
    const first = await createAcpChatRuntimeReplayTarget({
      syntheticRootId: "synthetic-one",
    });
    const second = await createAcpChatRuntimeReplayTarget({
      syntheticRootId: "synthetic-two",
    });
    await first.activate();
    await second.activate();

    await refreshAcpConversationBackends();
    assert.deepInclude(getAcpFrontendSnapshot(), {
      activeBackendId: "acp-replay",
      activeConversationId: "synthetic-two-conversation",
    });
    const panelWithRealRegistry = await prepareAcpChatPanelSnapshot({
      target: "library",
    });
    assert.deepInclude(panelWithRealRegistry, {
      backendAvailability: "selected",
      activeBackendId: "acp-replay",
      activeConversationId: "synthetic-two-conversation",
    });
    assert.include(
      panelWithRealRegistry.backendOptions.map((entry) => entry.backendId),
      original.activeBackendId,
    );

    await first.cleanup();
    assert.deepInclude(getAcpFrontendSnapshot(), {
      activeBackendId: "acp-replay",
      activeConversationId: "synthetic-two-conversation",
    });
    await second.cleanup();
    await second.cleanup();
    assert.deepInclude(getAcpFrontendSnapshot(), {
      activeBackendId: original.activeBackendId,
      activeConversationId: original.activeConversationId,
    });

    configureNoAcpBackendForTests();
    resetPluginStateStoreForTests();
    resetAcpSessionManagerForTests();
    const emptyPrior = await createAcpChatRuntimeReplayTarget({
      syntheticRootId: "synthetic-empty-prior",
    });
    await emptyPrior.activate();
    await emptyPrior.cleanup();
    assert.deepInclude(getAcpFrontendSnapshot(), {
      activeBackendId: "",
      activeConversationId: "",
    });
  });

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

  it("appends user_message_chunk updates as Chat user transcript items", async function () {
    await connectAcpConversation();
    const sessionId = getAcpConversationSnapshot().sessionId;
    await harness.lastAdapter!.emitSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "user_message_chunk",
        content: { type: "text", text: "replayed user turn" },
      },
    });
    const items = await readActiveTranscriptItems();
    assert.deepInclude(items[items.length - 1], {
      kind: "message",
      role: "user",
      text: "replayed user turn",
      state: "complete",
    });
  });

  it("routes synthetic Replay permissions through the standard permission queue", async function () {
    configureNoAcpBackendForTests();
    resetAcpSessionManagerForTests();
    const target = await createAcpChatRuntimeReplayTarget({
      syntheticRootId: "permission-root",
    });
    await target.activate();
    const owner = {
      rootId: "permission-root",
      conversationId: "permission-root-conversation",
      sessionId: "permission-root-session",
    };
    await target.apply({
      event: {
        record: "event",
        seq: 1,
        monotonicOffsetMs: 0,
        sourceKind: "acp-chat-conversation",
        kind: "permission-request",
        owner,
        payload: {
          requestId: "permission-1",
          sessionId: "permission-root-session",
          toolCallId: "permission-1",
          toolTitle: "Zotero MCP: write",
          approvalKind: "zotero-write",
          source: "zotero-mcp-write",
          summary: "Write an item",
          requestedAt: "2026-08-15T12:00:00.000Z",
          options: [
            { optionId: "approve", kind: "allow_once", name: "Approve" },
            { optionId: "deny", kind: "reject_once", name: "Deny" },
          ],
        },
      },
      owner,
      transcriptBoundary: "hard-boundary",
    });
    await waitForAcpConversationSnapshot(
      (snapshot) =>
        snapshot.pendingPermissionRequest?.requestId === "permission-1",
    );

    await target.apply({
      event: {
        record: "event",
        seq: 2,
        monotonicOffsetMs: 1,
        sourceKind: "acp-chat-conversation",
        kind: "permission-outcome",
        owner,
        payload: { outcome: "selected", optionId: "approve" },
      },
      owner,
      transcriptBoundary: "hard-boundary",
    });
    const resolved = await waitForAcpConversationSnapshot(
      (snapshot) => snapshot.pendingPermissionRequest === null,
    );
    assert.isNull(resolved.pendingPermissionRequest);
    await target.cleanup();
  });

  it("writes Chat diagnostics only to bounded debug audit evidence", async function () {
    const runtimeRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-acp-chat-diagnostic-audit-"),
    );
    const previousRuntimeRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = runtimeRoot;
    setDebugModeOverrideForTests(true);
    try {
      await connectAcpConversation();
      const snapshot = getAcpConversationSnapshot();
      harness.lastAdapter?.emitTraceDiagnostics(5);
      await disconnectAcpConversation();

      const auditPath = resolveAcpChatRuntimePaths(
        snapshot.backendId,
        snapshot.conversationId,
      ).diagnosticsAuditPath;
      const lines = (await fs.readFile(auditPath, "utf8"))
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      assert.isAtLeast(lines.length, 5);
      assert.isTrue(
        lines.some(
          (entry) =>
            entry.source === "acp-chat-diagnostic" &&
            entry.kind === "jsonrpc_trace",
        ),
      );
      for (const entry of lines) {
        assert.notProperty(entry, "raw");
        assert.notProperty(entry, "data");
      }
    } finally {
      setDebugModeOverrideForTests();
      if (typeof previousRuntimeRoot === "undefined") {
        delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
      } else {
        process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRuntimeRoot;
      }
      await fs.rm(runtimeRoot, { recursive: true, force: true });
    }
  });

  it("claims Chat recording only from an eligible explicit connection", async function () {
    const traceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-acp-chat-trace-"),
    );
    setDebugModeOverrideForTests(true);
    try {
      await connectAcpConversation();
      await armAcpRuntimeSemanticTraceRecorder({
        sourceKind: "acp-chat-conversation",
        root: traceRoot,
      });

      await connectAcpConversation();
      await sendAcpConversationPrompt({ message: "Existing session" });
      assert.deepInclude(getAcpRuntimeSemanticTraceRecorderView(), {
        state: "armed",
        eventCount: 0,
      });

      await disconnectAcpConversation();
      await reconnectAcpConversation();
      const view = getAcpRuntimeSemanticTraceRecorderView();
      assert.equal(view.state, "recording");
      assert.deepInclude(view.binding, {
        sourceKind: "acp-chat-conversation",
        backendId: getAcpConversationSnapshot().backendId,
        conversationId: getAcpConversationSnapshot().conversationId,
        sessionId: getAcpConversationSnapshot().sessionId,
      });
      assert.equal(
        harness.lastAdapter?.semanticTraceContext?.current?.owner.sessionId,
        getAcpConversationSnapshot().sessionId,
      );
      await cancelAcpRuntimeSemanticTraceRecorder();
    } finally {
      await discardAcpRuntimeSemanticTracePartialForTests();
      setDebugModeOverrideForTests();
      await fs.rm(traceRoot, { recursive: true, force: true });
    }
  });

  it("defers Chat finish until the active bound turn becomes terminal", async function () {
    const traceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-acp-chat-trace-"),
    );
    setDebugModeOverrideForTests(true);
    try {
      await armAcpRuntimeSemanticTraceRecorder({
        sourceKind: "acp-chat-conversation",
        root: traceRoot,
      });
      await connectAcpConversation();
      await sendAcpConversationPrompt({ message: "Completed turn" });
      assert.deepInclude(getAcpRuntimeSemanticTraceRecorderView(), {
        state: "recording",
        activeTurnCount: 0,
        canFinish: true,
      });

      const releasePrompt = harness.lastAdapter!.holdPrompt();
      const prompt = sendAcpConversationPrompt({ message: "Active turn" });
      await waitForAcpConversationSnapshot((snapshot) => snapshot.busy);
      assert.deepInclude(await finishAcpRuntimeSemanticTraceRoot(), {
        state: "stopping",
        activeTurnCount: 1,
      });
      releasePrompt();
      await prompt;
      assert.deepInclude(getAcpRuntimeSemanticTraceRecorderView(), {
        state: "frozen",
        completion: "complete",
        activeTurnCount: 0,
      });
    } finally {
      await discardAcpRuntimeSemanticTracePartialForTests();
      setDebugModeOverrideForTests();
      await fs.rm(traceRoot, { recursive: true, force: true });
    }
  });

  it("keeps the original Chat binding when reconnect attaches a replacement session", async function () {
    const traceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-acp-chat-trace-"),
    );
    setDebugModeOverrideForTests(true);
    try {
      await armAcpRuntimeSemanticTraceRecorder({
        sourceKind: "acp-chat-conversation",
        root: traceRoot,
      });
      await connectAcpConversation();
      const originalSessionId = getAcpConversationSnapshot().sessionId;
      await disconnectAcpConversation();
      setAcpConnectionAdapterFactoryForTests(async (args) => {
        const replacement = new FakeAcpConnectionAdapter();
        replacement.sessionIds.push("existing-seed");
        replacement.semanticTraceContext = args.semanticTraceContext;
        harness.lastAdapter = replacement;
        harness.adapters.add(replacement);
        return replacement;
      });

      await reconnectAcpConversation();
      const replacementSessionId = getAcpConversationSnapshot().sessionId;
      assert.notEqual(replacementSessionId, originalSessionId);
      const view = getAcpRuntimeSemanticTraceRecorderView();
      assert.equal(
        view.binding?.sourceKind === "acp-chat-conversation"
          ? view.binding.sessionId
          : "",
        originalSessionId,
      );
      assert.deepEqual(view.notice, {
        code: "session-replaced",
        sessionId: replacementSessionId,
      });
      assert.isUndefined(harness.lastAdapter?.semanticTraceContext?.current);
      await cancelAcpRuntimeSemanticTraceRecorder();
    } finally {
      await discardAcpRuntimeSemanticTracePartialForTests();
      setDebugModeOverrideForTests();
      await fs.rm(traceRoot, { recursive: true, force: true });
    }
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
    };
    assert.equal(payload.status, "idle");
    assert.equal(payload.busy, false);
    assert.equal(payload.sessionId, "");
    assert.equal(payload.remoteSessionId, "session-1");
    assert.notProperty(payload, "diagnostics");
    assert.notProperty(payload, "stderrTail");
    assert.notProperty(payload, "lastLifecycleEvent");
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
    };
    assert.equal(payload.status, "idle");
    assert.equal(payload.busy, false);
    assert.equal(payload.sessionId, "");
    assert.notProperty(payload, "diagnostics");
    assert.notProperty(payload, "stderrTail");
    assert.notProperty(payload, "lastLifecycleEvent");
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
    const traceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-acp-chat-trace-"),
    );
    setDebugModeOverrideForTests(true);
    try {
      setAcpChatPromptInterruptGraceMsForTests(5);
      await armAcpRuntimeSemanticTraceRecorder({
        sourceKind: "acp-chat-conversation",
        root: traceRoot,
      });
      await connectAcpConversation();
      await sendAcpConversationPrompt({ message: "Completed before force" });
      harness.lastAdapter!.holdPrompt();
      void sendAcpConversationPrompt({ message: "Ignore cancellation" });
      await waitForAcpConversationSnapshot((snapshot) => snapshot.busy);
      assert.equal(
        (await finishAcpRuntimeSemanticTraceRoot()).state,
        "stopping",
      );
      await cancelAcpConversationPrompt();

      const snapshot = await waitForAcpConversationSnapshot(
        (current) => current.promptInterruptState === "forced",
      );
      assert.equal(snapshot.status, "idle");
      assert.equal(snapshot.busy, false);
      assert.equal(snapshot.sessionId, "");
      assert.equal(snapshot.remoteSessionId, "session-1");
      assert.equal(harness.lastAdapter?.closeCalls, 1);
      assert.deepInclude(getAcpRuntimeSemanticTraceRecorderView(), {
        state: "frozen",
        completion: "complete",
        activeTurnCount: 0,
      });
    } finally {
      await discardAcpRuntimeSemanticTracePartialForTests();
      setDebugModeOverrideForTests();
      await fs.rm(traceRoot, { recursive: true, force: true });
    }
  });
});

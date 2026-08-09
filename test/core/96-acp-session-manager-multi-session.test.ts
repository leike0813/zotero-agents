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
  clearHostBridgePluginSkillBundleMaterializationForTests,
  materializeHostBridgePluginSkillBundle,
} from "../../src/modules/hostBridgePluginSkillBundle";
import { HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_IDENTITY_CHANGED } from "../../src/shared/hostBridgePluginSkillBundleContract";

describe("acp session manager", function () {
  const harness = installAcpSessionManagerTestHooks();

  function configureFirstUseBackend() {
    Zotero.Prefs.set(
      `${config.prefsPrefix}.backendsConfigJson`,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "acp-first-use",
            displayName: "ACP First Use",
            type: "acp",
            command: "node",
            args: ["first-use.js"],
          },
        ],
      }),
      true,
    );
  }

  it("atomically selects one reusable local placeholder for an empty backend", async function () {
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
            id: "acp-empty",
            displayName: "ACP Empty",
            type: "acp",
            command: "node",
            args: ["empty.js"],
          },
        ],
      }),
      true,
    );
    const factoryArgs: AcpConnectionAdapterFactoryArgs[] = [];
    setAcpConnectionAdapterFactoryForTests(async (args) => {
      factoryArgs.push(args);
      return new FakeAcpConnectionAdapter();
    });

    await setActiveAcpBackend({ backendId: "acp-one" });
    const publications: AcpChatPanelSnapshotChange[] = [];
    const unsubscribe = subscribeAcpChatPanelSnapshots((change) => {
      publications.push(change);
    });
    try {
      await setActiveAcpBackend({ backendId: "acp-empty" });
      const first = getAcpConversationSnapshot();
      assert.equal(first.backendId, "acp-empty");
      assert.match(first.conversationId, /^acp-conversation-/);
      assert.equal(first.status, "idle");
      assert.equal(first.sessionId, "");
      assert.lengthOf(listAcpChatSessions("acp-empty"), 1);
      assert.deepEqual(factoryArgs, []);
      assert.isTrue(
        publications
          .filter((change) => change.kinds.includes("active-scope"))
          .every(
            (change) =>
              change.backendId === "acp-empty" &&
              Boolean(change.conversationId) &&
              change.active === true,
          ),
      );

      await setActiveAcpBackend({ backendId: "acp-one" });
      await setActiveAcpBackend({ backendId: "acp-empty" });
      assert.equal(
        getAcpConversationSnapshot().conversationId,
        first.conversationId,
      );
      assert.lengthOf(listAcpChatSessions("acp-empty"), 1);
      assert.deepEqual(factoryArgs, []);

      const preservedOwner = getAcpConversationSnapshot();
      try {
        await setActiveAcpBackend({ backendId: "missing-backend" });
        assert.fail("expected invalid backend selection to fail");
      } catch (error) {
        assert.include(
          error instanceof Error ? error.message : String(error),
          "missing-backend",
        );
      }
      const afterInvalid = getAcpConversationSnapshot();
      assert.equal(afterInvalid.backendId, preservedOwner.backendId);
      assert.equal(afterInvalid.conversationId, preservedOwner.conversationId);
    } finally {
      unsubscribe();
    }
  });

  it("connects a backend through one reusable local conversation", async function () {
    configureFirstUseBackend();
    const factoryArgs: AcpConnectionAdapterFactoryArgs[] = [];
    setAcpConnectionAdapterFactoryForTests(async (args) => {
      factoryArgs.push(args);
      return new FakeAcpConnectionAdapter();
    });

    await connectAcpConversation({ backendId: "acp-first-use" });
    const first = getAcpConversationSnapshot();
    assert.equal(first.backendId, "acp-first-use");
    assert.match(first.conversationId, /^acp-conversation-/);
    assert.equal(first.status, "connected");
    assert.isNotEmpty(first.sessionId);
    assert.lengthOf(listAcpChatSessions("acp-first-use"), 1);
    assert.lengthOf(factoryArgs, 1);

    await connectAcpConversation({ backendId: "acp-first-use" });
    const second = getAcpConversationSnapshot();
    assert.equal(second.conversationId, first.conversationId);
    assert.lengthOf(listAcpChatSessions("acp-first-use"), 1);
    assert.lengthOf(factoryArgs, 1);
  });

  it("retains the selected local conversation when backend connection fails", async function () {
    configureFirstUseBackend();
    setAcpConnectionAdapterFactoryForTests(async () => {
      const adapter = new FakeAcpConnectionAdapter();
      adapter.failInitialize = true;
      return adapter;
    });

    let thrown: unknown;
    try {
      await connectAcpConversation({ backendId: "acp-first-use" });
    } catch (error) {
      thrown = error;
    }

    assert.isOk(thrown);
    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.backendId, "acp-first-use");
    assert.match(snapshot.conversationId, /^acp-conversation-/);
    assert.equal(snapshot.status, "error");
    assert.isString(snapshot.prerequisiteError);
    assert.lengthOf(listAcpChatSessions("acp-first-use"), 1);
  });

  it("keeps parallel ACP backend sessions isolated and routes actions to the active backend", async function () {
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
    const oneItems = await readActiveTranscriptItems("acp-one");
    const twoItems = await readActiveTranscriptItems("acp-two");
    assert.equal(one.backendId, "acp-one");
    assert.equal(two.backendId, "acp-two");
    assert.equal(
      oneItems.find(
        (entry) => entry.kind === "message" && entry.role === "assistant",
      )?.text,
      "Echo: hello one",
    );
    assert.equal(
      twoItems.find(
        (entry) => entry.kind === "message" && entry.role === "assistant",
      )?.text,
      "Echo: hello two",
    );
    assert.include(adapters.get("acp-one")?.prompts[0] || "", "hello one");
    assert.notInclude(
      adapters.get("acp-one")?.prompts[0] || "",
      "[Zotero Host Bridge CLI]",
    );
    assert.include(adapters.get("acp-two")?.prompts[0] || "", "hello two");
    assert.notInclude(
      adapters.get("acp-two")?.prompts[0] || "",
      "[Zotero Host Bridge CLI]",
    );
    assert.deepEqual(
      factoryArgs.map((entry) => entry.backend.id),
      ["acp-one", "acp-two"],
    );

    await setAcpConversationMode({ modeId: "plan" });
    assert.deepEqual(adapters.get("acp-one")?.modeSelections, []);
    assert.deepEqual(adapters.get("acp-two")?.modeSelections, [
      "session-1:plan",
    ]);

    const frontend = getAcpFrontendSnapshot();
    assert.equal(frontend.activeBackendId, "acp-two");
    assert.equal(frontend.connectedCount, 2);
    assert.equal(
      frontend.totalMessageCount,
      one.transcriptItemCount + two.transcriptItemCount,
    );
    assert.deepEqual(
      frontend.backendChatSessions.map((entry) => entry.backendId),
      ["acp-two", "acp-one"],
    );
    assert.isAtLeast(frontend.backendChatSessions[0].sessions.length, 1);
    assert.isAtLeast(frontend.backendChatSessions[1].sessions.length, 1);

    const beforeNew = getAcpConversationSnapshot("acp-two").conversationId;
    await startNewAcpConversation();
    assert.isAtLeast(
      loadAcpConversationState("acp-one").snapshot.transcriptItemCount,
      1,
    );
    assert.equal(
      loadAcpConversationState("acp-two").snapshot.transcriptItemCount,
      0,
    );
    assert.isAtLeast(listAcpChatSessions("acp-two").length, 2);
    assert.notEqual(
      getAcpConversationSnapshot("acp-two").conversationId,
      beforeNew,
    );
  });

  it("evicts the least recently active idle ACP chat adapter when the live cap is reached", async function () {
    const backendIds = ["acp-one", "acp-two", "acp-three", "acp-four"];
    Zotero.Prefs.set(
      `${config.prefsPrefix}.backendsConfigJson`,
      JSON.stringify({
        schemaVersion: 2,
        backends: backendIds.map((id) => ({
          id,
          displayName: id,
          type: "acp",
          command: "node",
          args: [`${id}.js`],
        })),
      }),
      true,
    );
    const adapters = new Map<string, FakeAcpConnectionAdapter>();
    setAcpConnectionAdapterFactoryForTests(async (args) => {
      const adapter = new FakeAcpConnectionAdapter();
      adapters.set(args.backend.id, adapter);
      return adapter;
    });

    for (const backendId of backendIds.slice(0, 3)) {
      await setActiveAcpBackend({ backendId });
      await sendAcpConversationPrompt({ message: `hello ${backendId}` });
    }
    assert.equal(adapters.get("acp-one")?.closeCalls, 0);

    await setActiveAcpBackend({ backendId: "acp-four" });
    await sendAcpConversationPrompt({ message: "hello acp-four" });

    assert.equal(adapters.get("acp-one")?.closeCalls, 1);
    assert.equal(adapters.get("acp-two")?.closeCalls, 0);
    assert.equal(adapters.get("acp-three")?.closeCalls, 0);
    assert.equal(adapters.get("acp-four")?.closeCalls, 0);
  });

  it("rejects a fourth ACP chat adapter when all live adapters are busy", async function () {
    const backendIds = ["acp-one", "acp-two", "acp-three", "acp-four"];
    Zotero.Prefs.set(
      `${config.prefsPrefix}.backendsConfigJson`,
      JSON.stringify({
        schemaVersion: 2,
        backends: backendIds.map((id) => ({
          id,
          displayName: id,
          type: "acp",
          command: "node",
          args: [`${id}.js`],
        })),
      }),
      true,
    );
    const adapters = new Map<string, FakeAcpConnectionAdapter>();
    const releases: Array<() => void> = [];
    setAcpConnectionAdapterFactoryForTests(async (args) => {
      const adapter = new FakeAcpConnectionAdapter();
      if (args.backend.id !== "acp-four") {
        releases.push(adapter.holdPrompt());
      }
      adapters.set(args.backend.id, adapter);
      return adapter;
    });

    const prompts: Array<Promise<unknown>> = [];
    for (const backendId of backendIds.slice(0, 3)) {
      await setActiveAcpBackend({ backendId });
      prompts.push(
        sendAcpConversationPrompt({ message: `busy ${backendId}` }).catch(
          (error) => error,
        ),
      );
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (getAcpConversationSnapshot(backendId).busy) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.isTrue(getAcpConversationSnapshot(backendId).busy);
    }

    let rejected: unknown = null;
    try {
      await setActiveAcpBackend({ backendId: "acp-four" });
      await sendAcpConversationPrompt({ message: "busy acp-four" });
    } catch (error) {
      rejected = error;
    } finally {
      releases.forEach((release) => release());
      await Promise.all(prompts);
    }

    assert.instanceOf(rejected, Error);
    assert.match((rejected as Error).message, /live session limit reached/i);
    assert.equal(adapters.get("acp-one")?.closeCalls, 0);
    assert.equal(adapters.get("acp-two")?.closeCalls, 0);
    assert.equal(adapters.get("acp-three")?.closeCalls, 0);
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
    assert.equal(snapshot.transcriptItemCount, 0);

    const persisted = loadAcpConversationState(ACP_OPENCODE_BACKEND_ID);
    assert.equal(persisted.snapshot.sessionId, "");
    assert.equal(persisted.snapshot.remoteSessionId, "");
    assert.equal(persisted.snapshot.transcriptItemCount, 0);
    const previous = loadAcpConversationState(
      ACP_OPENCODE_BACKEND_ID,
      previousConversationId,
    );
    assert.isAtLeast(previous.snapshot.transcriptItemCount, 1);
    assert.isAtLeast(listAcpChatSessions(ACP_OPENCODE_BACKEND_ID).length, 2);
  });

  it("reuses an unconnected placeholder ACP chat session when New is clicked repeatedly", async function () {
    await startNewAcpConversation();
    const firstPlaceholderId = getAcpConversationSnapshot().conversationId;
    const firstSessionCount = listAcpChatSessions(
      ACP_OPENCODE_BACKEND_ID,
    ).length;

    await startNewAcpConversation();
    assert.equal(
      getAcpConversationSnapshot().conversationId,
      firstPlaceholderId,
    );
    assert.lengthOf(
      listAcpChatSessions(ACP_OPENCODE_BACKEND_ID),
      firstSessionCount,
    );

    await sendAcpConversationPrompt({
      message: "Bind first placeholder",
    });
    const connectedPlaceholderId = getAcpConversationSnapshot().conversationId;
    assert.equal(connectedPlaceholderId, firstPlaceholderId);
    assert.equal(getAcpConversationSnapshot().remoteSessionId, "session-1");

    await startNewAcpConversation();
    const secondPlaceholderId = getAcpConversationSnapshot().conversationId;
    assert.notEqual(secondPlaceholderId, connectedPlaceholderId);

    await setActiveAcpConversation({ conversationId: connectedPlaceholderId });
    await startNewAcpConversation();
    assert.equal(
      getAcpConversationSnapshot().conversationId,
      secondPlaceholderId,
    );
    assert.lengthOf(
      listAcpChatSessions(ACP_OPENCODE_BACKEND_ID).filter(
        (entry) => !entry.archivedAt,
      ),
      2,
    );
  });

  it("keeps same-backend sessions independent while one session is prompting", async function () {
    let releaseFirstPrompt: (() => void) | null = null;
    const adapters: FakeAcpConnectionAdapter[] = [];
    setAcpConnectionAdapterFactoryForTests(async () => {
      const adapter = new FakeAcpConnectionAdapter();
      if (adapters.length === 0) {
        releaseFirstPrompt = adapter.holdPrompt();
      }
      adapters.push(adapter);
      return adapter;
    });

    const firstPrompt = sendAcpConversationPrompt({
      message: "Long first session",
    }).catch((error) => error);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (getAcpConversationSnapshot().busy) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const firstConversationId = getAcpConversationSnapshot().conversationId;
    assert.isTrue(getAcpConversationSnapshot().busy);

    await startNewAcpConversation();
    const secondConversationId = getAcpConversationSnapshot().conversationId;
    assert.notEqual(secondConversationId, firstConversationId);
    assert.equal(
      getAcpConversationSnapshot(ACP_OPENCODE_BACKEND_ID, firstConversationId)
        .status,
      "prompting",
    );

    await connectAcpConversation({ conversationId: secondConversationId });
    assert.lengthOf(adapters, 2);
    assert.equal(adapters[0].closeCalls, 0);
    assert.equal(adapters[1].closeCalls, 0);
    assert.equal(getAcpConversationSnapshot().status, "connected");

    await setActiveAcpConversation({ conversationId: firstConversationId });
    assert.equal(
      getAcpConversationSnapshot().conversationId,
      firstConversationId,
    );
    assert.equal(getAcpConversationSnapshot().status, "prompting");

    releaseFirstPrompt?.();
    const result = await firstPrompt;
    assert.notInstanceOf(result, Error);
    assert.include(adapters[0].prompts[0] || "", "Long first session");
    assert.equal(adapters[1].closeCalls, 0);
  });

  it("projects backend selector state from the backend active conversation runtime", async function () {
    await sendAcpConversationPrompt({
      message: "Backend summary stays live",
    });
    const liveConversationId = getAcpConversationSnapshot().conversationId;

    await startNewAcpConversation();
    const foreground = getAcpConversationSnapshot();
    const frontend = getAcpFrontendSnapshot();
    const backendSummary = frontend.backends.find(
      (entry) => entry.backendId === ACP_OPENCODE_BACKEND_ID,
    );

    assert.notEqual(foreground.conversationId, liveConversationId);
    assert.equal(foreground.status, "idle");
    assert.equal(foreground.sessionId, "");
    assert.equal(frontend.activeSnapshot.status, "idle");
    assert.equal(frontend.activeSnapshot.sessionId, "");
    assert.equal(backendSummary?.status, "idle");
    assert.equal(backendSummary?.connected, false);
  });

  it("switches local conversations and rebuilds the remote ACP attachment on demand", async function () {
    await sendAcpConversationPrompt({ message: "First local session" });
    const firstConversationId = getAcpConversationSnapshot().conversationId;
    const firstAdapter = harness.lastAdapter;

    await startNewAcpConversation();
    const secondConversationId = getAcpConversationSnapshot().conversationId;
    assert.notEqual(secondConversationId, firstConversationId);
    assert.equal(firstAdapter?.closeCalls, 0);

    await sendAcpConversationPrompt({ message: "Second local session" });
    assert.equal(
      getAcpConversationSnapshot().conversationId,
      secondConversationId,
    );
    assert.include(
      (await readActiveTranscriptItems())
        .filter((entry) => entry.kind === "message")
        .map((entry) => ("text" in entry ? entry.text : ""))
        .join("\n"),
      "Second local session",
    );

    const secondAdapter = harness.lastAdapter;
    await setActiveAcpConversation({ conversationId: firstConversationId });
    assert.equal(secondAdapter?.closeCalls, 0);
    let snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.conversationId, firstConversationId);
    assert.equal(snapshot.sessionId, "session-1");
    assert.include(
      (await readTranscriptItemsForConversation(firstConversationId))
        .filter((entry) => entry.kind === "message")
        .map((entry) => ("text" in entry ? entry.text : ""))
        .join("\n"),
      "First local session",
    );

    await sendAcpConversationPrompt({ message: "Back on first" });
    const firstAdapterPrompts = firstAdapter?.prompts || [];
    assert.include(
      firstAdapterPrompts[firstAdapterPrompts.length - 1] || "",
      "Back on first",
    );
    snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.conversationId, firstConversationId);
    assert.include(
      (await readTranscriptItemsForConversation(firstConversationId))
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
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.canResumeSession = true;
      return harness.lastAdapter;
    });

    await setActiveAcpConversation({ conversationId });
    await reconnectAcpConversation();

    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.sessionId, "session-1");
    assert.equal(snapshot.remoteSessionId, "session-1");
    assert.equal(snapshot.remoteSessionRestoreStatus, "resumed");
    assert.deepEqual(harness.lastAdapter?.resumeSessionIds, ["session-1"]);
    assert.deepEqual(harness.lastAdapter?.loadSessionIds, []);
    assert.deepEqual(harness.lastAdapter?.sessionIds, []);
  });

  it("refuses to restore a persisted remote session after the plugin Skill bundle identity changes", async function () {
    this.timeout(10_000);
    await sendAcpConversationPrompt({ message: "Persist old bundle context" });
    const conversationId = getAcpConversationSnapshot().conversationId;
    const runtimeRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-acp-chat-bundle-identity-"),
    );
    try {
      const materialized = await materializeHostBridgePluginSkillBundle({
        runtimeRoot,
      });
      assert.isTrue(materialized.ok);
      resetAcpSessionManagerForTests();
      setAcpConnectionAdapterFactoryForTests(async () => {
        harness.lastAdapter = new FakeAcpConnectionAdapter();
        harness.lastAdapter.canResumeSession = true;
        return harness.lastAdapter;
      });

      await setActiveAcpConversation({ conversationId });
      let failure: unknown;
      try {
        await reconnectAcpConversation();
      } catch (error) {
        failure = error;
      }

      assert.strictEqual(
        (failure as { code?: string })?.code,
        HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_IDENTITY_CHANGED,
      );
      assert.deepEqual(harness.lastAdapter?.resumeSessionIds, []);
      assert.deepEqual(harness.lastAdapter?.sessionIds, []);
      assert.strictEqual(
        getAcpConversationSnapshot().lastError,
        HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_IDENTITY_CHANGED,
      );
    } finally {
      clearHostBridgePluginSkillBundleMaterializationForTests();
      await fs.rm(runtimeRoot, { recursive: true, force: true });
    }
  });

  it("loads a persisted remote ACP session when resume is unavailable and suppresses replay duplication", async function () {
    await sendAcpConversationPrompt({ message: "Persist loadable context" });
    const conversationId = getAcpConversationSnapshot().conversationId;

    resetAcpSessionManagerForTests();
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.canLoadSession = true;
      harness.lastAdapter.emitReplayOnLoad = true;
      return harness.lastAdapter;
    });

    await setActiveAcpConversation({ conversationId });
    await reconnectAcpConversation();

    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.sessionId, "session-1");
    assert.equal(snapshot.remoteSessionRestoreStatus, "loaded");
    assert.deepEqual(harness.lastAdapter?.loadSessionIds, ["session-1"]);
    assert.deepEqual(harness.lastAdapter?.sessionIds, []);
    assert.equal(snapshot.sessionTitle, "Loaded session");
    assert.isUndefined(
      (await readTranscriptItemsForConversation(conversationId)).find(
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
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.canResumeSession = true;
      harness.lastAdapter.failResumeSession = true;
      harness.lastAdapter.sessionIds.push("preexisting");
      return harness.lastAdapter;
    });

    await setActiveAcpConversation({ conversationId });
    await reconnectAcpConversation();

    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.sessionId, "session-2");
    assert.equal(snapshot.remoteSessionId, "session-2");
    assert.equal(snapshot.remoteSessionRestoreStatus, "fallback-new");
    assert.deepEqual(harness.lastAdapter?.resumeSessionIds, ["session-1"]);
    assert.deepEqual(harness.lastAdapter?.sessionIds, [
      "preexisting",
      "session-2",
    ]);
    assert.isOk(
      snapshot.diagnostics.find(
        (entry) => entry.kind === "session_new_fallback",
      ),
    );
    assert.isOk(
      (await readActiveTranscriptItems()).find(
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
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      return harness.lastAdapter;
    });

    await setActiveAcpConversation({ conversationId });
    await reconnectAcpConversation();

    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.remoteSessionRestoreStatus, "unsupported");
    assert.deepEqual(harness.lastAdapter?.resumeSessionIds, []);
    assert.deepEqual(harness.lastAdapter?.loadSessionIds, []);
    assert.deepEqual(harness.lastAdapter?.sessionIds, ["session-1"]);
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
    assert.equal(
      getAcpConversationSnapshot().conversationId,
      secondConversationId,
    );

    await disconnectAcpConversation({ conversationId: firstConversationId });
    await archiveAcpConversation({
      conversationId: firstConversationId,
    });
    assert.isUndefined(
      listAcpChatSessions(ACP_OPENCODE_BACKEND_ID).find(
        (entry) => entry.conversationId === firstConversationId,
      ),
    );
    assert.equal(
      (await readTranscriptItemsForConversation(firstConversationId)).find(
        (entry) => entry.kind === "message" && entry.role === "user",
      )?.text,
      "Keep archived transcript",
    );

    await disconnectAcpConversation({ conversationId: secondConversationId });
    await archiveAcpConversation({
      conversationId: secondConversationId,
    });
    const snapshot = getAcpConversationSnapshot();
    assert.equal(snapshot.conversationId, "");
    assert.lengthOf(listAcpChatSessions(ACP_OPENCODE_BACKEND_ID), 0);
  });
});

import { assert } from "chai";
import {
  ASSISTANT_WORKSPACE_ACTION_REGISTRY,
  assertAssistantWorkspacePublication,
  type AssistantWorkspaceOwner,
} from "../../src/modules/assistant/publication/assistantWorkspacePublication.js";
import {
  buildAssistantWorkspaceNavigationLabels,
  buildAssistantWorkspacePublicationLabels,
} from "../../src/modules/assistant/publication/assistantWorkspacePublicationLabels.js";
import { parseAssistantWorkspaceTranscriptPageRequest } from "../../src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.js";
import { projectAssistantWorkspacePanel } from "../../src/sidebar/assistantPanelModel.js";
import {
  configureAssistantWorkspaceActionRouterShellHost,
  handleChildAction,
  invalidateAssistantWorkspacePiNavigationTargets,
} from "../../src/modules/assistant/workspace/assistantWorkspaceActionRouter.js";
import {
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
  type SidebarDomEnvironment,
} from "../helpers/sidebarDomEnv";
import {
  ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY,
  ASSISTANT_WORKSPACE_MESSAGE_TYPES,
} from "../../src/shared/assistantWireContract";

describe("assistant workspace shell lane memory", function () {
  let environment: SidebarDomEnvironment;

  before(async function () {
    environment = createSidebarDomEnvironment();
    installSidebarDomGlobals(environment);
    environment.document.body.innerHTML = [
      '<nav id="assistant-workspace-lanes"></nav>',
      '<nav id="assistant-workspace-sources"></nav>',
      '<div id="assistant-workspace-loading"></div>',
      '<button id="assistant-workspace-close"></button>',
    ].join("");
    // Acknowledge the shell's host handshake so it stops retrying (the retry
    // timer would otherwise fire after the DOM globals are restored).
    (environment.window as unknown as Record<string, unknown>)[
      ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY
    ] = { postMessage: () => ({ ok: true }) };
    await import("../../src/sidebar/assistantWorkspaceShell.js");
    environment.document.dispatchEvent(
      new environment.window.Event("DOMContentLoaded"),
    );
  });

  after(function () {
    restoreSidebarDomGlobals();
  });

  it("restores the source remembered per lane and keeps the map window-local", function () {
    const document = environment.document;
    const lanes = document.getElementById("assistant-workspace-lanes");
    const sources = document.getElementById("assistant-workspace-sources");
    assert.ok(lanes && sources, "shell must render lane and source navigation");
    const clickLane = (laneId: string) => {
      const button = lanes!.querySelector("#assistant-lane-" + laneId);
      assert.ok(button, "missing lane button: " + laneId);
      (button as HTMLElement).click();
    };
    const clickSource = (sourceId: string) => {
      const button = sources!.querySelector("#assistant-tab-" + sourceId);
      assert.ok(button, "missing source button: " + sourceId);
      (button as HTMLElement).click();
    };
    const activeSourceId = () =>
      sources!.querySelector(".assistant-tab.is-active")?.id || "";

    // Skill Runs: the first visit picks the lane default (skillrunner).
    clickLane("skill-runs");
    assert.equal(activeSourceId(), "assistant-tab-skillrunner");
    clickSource("acp-skills");
    // Conversations keeps its own selection while Skill Runs is left behind.
    clickLane("conversations");
    assert.equal(activeSourceId(), "assistant-tab-pi-conversations");
    // Returning must restore the lane memory, not the lane default.
    clickLane("skill-runs");
    assert.equal(activeSourceId(), "assistant-tab-acp-skills");
    // Window-local memory: nothing is published on the window global.
    assert.isUndefined(
      (environment.window as unknown as Record<string, unknown>)
        .selectedSourceByLane,
    );
  });

  it("updates source and lane counts and attention without replacing navigation on transcript updates", function () {
    const document = environment.document;
    (
      document.getElementById("assistant-lane-conversations") as HTMLElement
    ).click();
    const sourceButton = document.getElementById(
      "assistant-tab-pi-conversations",
    )!;
    const laneButton = document.getElementById("assistant-lane-conversations")!;
    const publish = (
      source: string,
      sequence: number,
      kind: string,
      payload: unknown,
    ) => {
      environment.window.dispatchEvent(
        new environment.window.MessageEvent("message", {
          data: {
            type: ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_PUBLICATION,
            payload: {
              publication: {
                publicationId: source + sequence,
                deliverySequence: sequence,
                owner: { source },
                publicationKind: kind,
                payload,
              },
            },
          },
        }),
      );
    };
    publish("pi-conversations", 2, "owner-navigation", {
      entries: [{ attention: null }, { attention: "unread" }],
      archivedEntries: [{ attention: "unread" }],
    });
    assert.equal(
      sourceButton.querySelector(".assistant-nav-count")?.textContent,
      "2",
    );
    assert.equal(
      laneButton.querySelector(".assistant-nav-count")?.textContent,
      "2",
    );
    assert.equal(sourceButton.getAttribute("data-attention"), "true");
    assert.equal(laneButton.getAttribute("data-attention"), "true");
    publish("acp-chat", 1, "owner-navigation", {
      entries: [{ attention: null }],
    });
    assert.equal(
      laneButton.querySelector(".assistant-nav-count")?.textContent,
      "3",
    );
    publish("pi-conversations", 1, "owner-navigation", { entries: [] });
    publish("pi-conversations", 3, "transcript", {});
    assert.strictEqual(document.getElementById(sourceButton.id), sourceButton);
    assert.strictEqual(document.getElementById(laneButton.id), laneButton);
    assert.equal(
      sourceButton.querySelector(".assistant-nav-count")?.textContent,
      "2",
    );
    publish("pi-conversations", 4, "owner-navigation", { entries: [] });
    assert.equal(
      sourceButton.querySelector(".assistant-nav-count")?.textContent,
      "0",
    );
    assert.equal(
      laneButton.querySelector(".assistant-nav-count")?.textContent,
      "1",
    );
    assert.equal(laneButton.getAttribute("data-attention"), "false");
  });
});

describe("pi conversation permission routing", function () {
  const decisions: Array<{ requestId: string; decision: string }> = [];
  const renames: Array<{ requestId: string; title: string }> = [];
  let promptResult: string | null = null;
  const coordinator = {
    selectedId: "conv-1",
    permission: async (_id: string, requestId: string, decision: string) => {
      decisions.push({ requestId, decision });
    },
    rename: async (conversationId: string, title: string) => {
      renames.push({ requestId: conversationId, title });
    },
    readModel: async () => ({ title: "Old title" }),
  };
  const host = {
    activeTab: "pi-conversations",
    activeTarget: "library",
    win: {
      prompt: () => promptResult,
    },
    readyTabs: new Set(),
    readyTabGenerations: new Map(),
    childInitInFlight: new Map(),
  } as never;

  before(function () {
    configureAssistantWorkspaceActionRouterShellHost({
      piConversationsSurface: () => ({ adapter: {} as never }),
      piConversationCoordinator: () => coordinator as never,
      localizeString: (_key, fallback) => fallback,
      openBackendManager: async () => undefined,
      logAssistantWorkspaceDebug: () => undefined,
      closeActiveSidebarHost: () => false,
      normalizeTab: (value) => String(value || "pi-conversations") as never,
      resolveCurrentShellWindow: () => null,
    });
  });

  for (const testCase of [
    { outcome: "selected", optionId: "approve", expected: "approve" },
    { outcome: "selected", optionId: "deny", expected: "deny" },
    { outcome: "cancelled", optionId: "approve", expected: "deny" },
  ]) {
    it(`maps ${testCase.outcome}/${testCase.optionId} to ${testCase.expected}`, async function () {
      decisions.length = 0;
      await handleChildAction(
        host,
        "library" as never,
        {
          source: "pi-conversations",
          owner: {
            source: "pi-conversations",
            ownerKey: "conv-1",
            conversationId: "conv-1",
          },
          actionId: "action-1",
          action: "resolve-permission",
          payload: {
            permissionRequestId: "req-1",
            outcome: testCase.outcome,
            optionId: testCase.optionId,
          },
        } as never,
      );
      assert.deepEqual(decisions, [
        { requestId: "req-1", decision: testCase.expected },
      ]);
    });
  }

  describe("rename", function () {
    const renameEnvelope = (payload: Record<string, unknown>) => ({
      source: "pi-conversations",
      owner: {
        source: "pi-conversations",
        ownerKey: "conv-1",
        conversationId: "conv-1",
      },
      actionId: "action-rename",
      action: "rename-conversation",
      payload,
    });

    it("prompts for a title when the payload title is empty", async function () {
      renames.length = 0;
      promptResult = "Renamed from prompt";
      await handleChildAction(
        host,
        "library" as never,
        renameEnvelope({ title: "" }) as never,
      );
      assert.deepEqual(renames, [
        { requestId: "conv-1", title: "Renamed from prompt" },
      ]);
    });

    it("keeps the current title when the prompt is cancelled", async function () {
      renames.length = 0;
      promptResult = null;
      await handleChildAction(
        host,
        "library" as never,
        renameEnvelope({ title: "" }) as never,
      );
      assert.deepEqual(renames, []);
    });

    it("renames directly when the payload carries a title", async function () {
      renames.length = 0;
      promptResult = "Should not be used";
      await handleChildAction(
        host,
        "library" as never,
        renameEnvelope({ title: "Typed title" }) as never,
      );
      assert.deepEqual(renames, [
        { requestId: "conv-1", title: "Typed title" },
      ]);
    });
  });
});

import {
  ASSISTANT_WORKSPACE_LANE_ORDER,
  ASSISTANT_WORKSPACE_LANE_REGISTRY,
  ASSISTANT_WORKSPACE_SOURCE_REGISTRY,
  DEFAULT_ASSISTANT_WORKSPACE_LANE_ID,
  DEFAULT_ASSISTANT_WORKSPACE_SOURCE_ID,
  isAssistantWorkspaceSourceId,
  listNavigableAssistantWorkspaceLaneSources,
  type AssistantWorkspaceSourceId,
} from "../../src/shared/assistantWorkspaceSourceRegistry.js";
import {
  setDebugModeOverrideForTests,
  setWorkspacePublicationWireAssertOverrideForTests,
} from "../../src/modules/debugMode.js";

function composerPayload(overrides: Record<string, unknown> = {}) {
  return {
    reply: { status: "enabled" },
    runtimeOptions: null,
    ...overrides,
  };
}

function piChatSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    scopeKey: "pi-snapshot",
    selection: {
      owner: piConversationOwner,
      phase: "ready",
      control: null,
      messageCounts: null,
      transcript: null,
      plan: null,
      permission: null,
      composer: composerPayload(),
      presentation: null,
      details: null,
    },
    services: { items: [] },
    ...overrides,
  };
}

describe("assistant workspace composer sendAdmissionRevision", function () {
  afterEach(function () {
    setWorkspacePublicationWireAssertOverrideForTests(undefined);
    setDebugModeOverrideForTests(undefined);
  });

  it("bounds the optional composer sendAdmissionRevision", function () {
    setDebugModeOverrideForTests(true);
    setWorkspacePublicationWireAssertOverrideForTests(true);
    for (const revision of [0, 1, 42]) {
      assert.doesNotThrow(() =>
        assertAssistantWorkspacePublication(
          publication({
            owner: piConversationOwner,
            publicationKind: "composer",
            payload: composerPayload({ sendAdmissionRevision: revision }),
          }),
        ),
      );
    }
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication(
        publication({
          owner: piConversationOwner,
          publicationKind: "composer",
          payload: composerPayload({ sendAdmissionRevision: null }),
        }),
      ),
    );
    for (const invalid of [-1, 1.5, "3", Number.NaN]) {
      assert.throws(
        () =>
          assertAssistantWorkspacePublication(
            publication({
              owner: piConversationOwner,
              publicationKind: "composer",
              payload: composerPayload({ sendAdmissionRevision: invalid }),
            }),
          ),
        /composer/,
      );
    }
  });

  it("projects the composer admission revision into the reply panel", function () {
    const panel = projectAssistantWorkspacePanel(
      piChatSnapshot({
        selection: {
          owner: piConversationOwner,
          phase: "ready",
          control: null,
          messageCounts: null,
          transcript: null,
          plan: null,
          permission: null,
          composer: composerPayload({ sendAdmissionRevision: 5 }),
          presentation: null,
          details: null,
        },
      }),
      {},
      {},
    );
    assert.equal(
      (panel.reply as Record<string, unknown>).sendAdmissionRevision,
      5,
    );
  });
});

const SOURCE_IDS: AssistantWorkspaceSourceId[] = [
  "pi-conversations",
  "acp-chat",
  "pi-skill-runs",
  "acp-skills",
  "skillrunner",
];

function publication(args: {
  owner:
    | AssistantWorkspaceOwner
    | { source: AssistantWorkspaceSourceId; ownerKey: null };
  publicationKind: string;
  payload: Record<string, unknown>;
}) {
  return {
    schema: "zotero-agents.assistant-workspace-publication.v1",
    publicationId: "pub-1",
    owner: args.owner,
    publicationKind: args.publicationKind,
    publicationForm: "region",
    publicationCause: "steady-state",
    regionRevision: 1,
    deliverySequence: 1,
    payload: args.payload,
  };
}

const piConversationOwner: AssistantWorkspaceOwner = {
  source: "pi-conversations",
  ownerKey: "conv-1",
  conversationId: "conv-1",
};

describe("assistant workspace lane/source registry", function () {
  it("declares exactly two lanes and five sources", function () {
    assert.deepEqual(ASSISTANT_WORKSPACE_LANE_ORDER, [
      "conversations",
      "skill-runs",
    ]);
    assert.deepEqual(
      Object.keys(ASSISTANT_WORKSPACE_SOURCE_REGISTRY).sort(),
      [...SOURCE_IDS].sort(),
    );
    for (const sourceId of SOURCE_IDS) {
      const descriptor = ASSISTANT_WORKSPACE_SOURCE_REGISTRY[sourceId];
      assert.equal(descriptor.id, sourceId);
      assert.include(
        ASSISTANT_WORKSPACE_LANE_REGISTRY[descriptor.lane].sourceIds,
        sourceId,
      );
    }
  });

  it("defaults new windows to Conversations / Zotero Agent", function () {
    assert.equal(DEFAULT_ASSISTANT_WORKSPACE_LANE_ID, "conversations");
    assert.equal(DEFAULT_ASSISTANT_WORKSPACE_SOURCE_ID, "pi-conversations");
    assert.equal(
      ASSISTANT_WORKSPACE_LANE_REGISTRY.conversations.defaultSourceId,
      "pi-conversations",
    );
    assert.equal(
      ASSISTANT_WORKSPACE_LANE_REGISTRY["skill-runs"].defaultSourceId,
      "skillrunner",
    );
  });

  it("keeps pi-skill-runs navigation unavailable until its adapter lands", function () {
    assert.isFalse(
      ASSISTANT_WORKSPACE_SOURCE_REGISTRY["pi-skill-runs"].navigable,
    );
    assert.deepEqual(listNavigableAssistantWorkspaceLaneSources("skill-runs"), [
      "acp-skills",
      "skillrunner",
    ]);
    for (const sourceId of SOURCE_IDS) {
      if (sourceId === "pi-skill-runs") continue;
      assert.isTrue(
        ASSISTANT_WORKSPACE_SOURCE_REGISTRY[sourceId].navigable,
        sourceId,
      );
    }
  });

  it("binds every registry action list to the action registry sources", function () {
    const actionIds = Object.keys(
      ASSISTANT_WORKSPACE_ACTION_REGISTRY,
    ) as (keyof typeof ASSISTANT_WORKSPACE_ACTION_REGISTRY)[];
    for (const sourceId of SOURCE_IDS) {
      const expected = actionIds
        .filter((actionId) =>
          (
            ASSISTANT_WORKSPACE_ACTION_REGISTRY[actionId]
              .sources as readonly string[]
          ).includes(sourceId),
        )
        .sort();
      const declared = [
        ...ASSISTANT_WORKSPACE_SOURCE_REGISTRY[sourceId].actions,
      ].sort();
      assert.deepEqual(
        declared,
        expected,
        `${sourceId} registry actions must equal the action registry sources`,
      );
    }
  });

  it("classifies Pi and ACP sources through the shared source guard", function () {
    for (const sourceId of SOURCE_IDS) {
      assert.isTrue(isAssistantWorkspaceSourceId(sourceId));
    }
    assert.isFalse(isAssistantWorkspaceSourceId("pi-chat"));
    assert.isFalse(isAssistantWorkspaceSourceId(""));
  });

  it("resolves lane/source navigation labels for every entry", function () {
    const labels = buildAssistantWorkspaceNavigationLabels();
    for (const laneId of ASSISTANT_WORKSPACE_LANE_ORDER) {
      assert.isString(labels.lanes[laneId]);
      assert.isAbove(labels.lanes[laneId].length, 0);
    }
    for (const sourceId of SOURCE_IDS) {
      assert.isString(labels.sources[sourceId]);
      assert.isAbove(labels.sources[sourceId].length, 0);
    }
    assert.equal(
      buildAssistantWorkspacePublicationLabels("pi-conversations").title,
      "Zotero Agent",
    );
  });
});

describe("assistant workspace Pi owner validation", function () {
  afterEach(function () {
    setWorkspacePublicationWireAssertOverrideForTests(undefined);
    setDebugModeOverrideForTests(undefined);
  });

  it("admits the pi-conversations owner shape and rejects it when malformed", function () {
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication(
        publication({
          owner: piConversationOwner,
          publicationKind: "owner-navigation",
          payload: {
            selectedOwner: piConversationOwner,
            selectedGroupId: "pi-conversations",
            groups: [],
            entries: [],
            queuedEntries: [],
            canCreateOwner: true,
            notice: null,
          },
        }),
      ),
    );
    assert.throws(() =>
      assertAssistantWorkspacePublication(
        publication({
          owner: {
            source: "pi-conversations",
            ownerKey: "wrong",
            conversationId: "conv-1",
          } as AssistantWorkspaceOwner,
          publicationKind: "owner-navigation",
          payload: {
            selectedOwner: null,
            selectedGroupId: null,
            groups: [],
            entries: [],
            queuedEntries: [],
            canCreateOwner: true,
            notice: null,
          },
        }),
      ),
    );
  });

  it("admits declared optional payload keys for Pi publications only", function () {
    setDebugModeOverrideForTests(true);
    setWorkspacePublicationWireAssertOverrideForTests(true);
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication(
        publication({
          owner: piConversationOwner,
          publicationKind: "owner-navigation",
          payload: {
            selectedOwner: piConversationOwner,
            selectedGroupId: "pi-conversations",
            groups: [],
            entries: [],
            queuedEntries: [],
            canCreateOwner: true,
            notice: null,
            archivedEntries: [],
          },
        }),
      ),
    );
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication(
        publication({
          owner: piConversationOwner,
          publicationKind: "composer",
          payload: {
            reply: { status: "enabled" },
            runtimeOptions: null,
            resources: [],
            errors: [
              { code: "pi_resource_count_exceeded", message: "Too many" },
            ],
          },
        }),
      ),
    );
    // ACP sources keep publishing the required-key composer shape unchanged.
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication(
        publication({
          owner: {
            source: "acp-chat",
            ownerKey: "backend-1\nconv-1",
            backendId: "backend-1",
            conversationId: "conv-1",
          } as AssistantWorkspaceOwner,
          publicationKind: "composer",
          payload: { reply: { status: "enabled" }, runtimeOptions: null },
        }),
      ),
    );
  });

  it("parses transcript page requests for both Pi owner shapes", function () {
    for (const owner of [
      piConversationOwner,
      {
        source: "pi-skill-runs",
        ownerKey: "run-1",
        requestId: "run-1",
      } as AssistantWorkspaceOwner,
    ]) {
      const parsed = parseAssistantWorkspaceTranscriptPageRequest({
        owner,
        request: { cursor: null, limit: 50 },
      });
      assert.isOk(parsed);
      assert.deepEqual(parsed!.owner, owner);
    }
    assert.isNull(
      parseAssistantWorkspaceTranscriptPageRequest({
        owner: {
          source: "pi-conversations",
          ownerKey: "mismatch",
          conversationId: "conv-1",
        },
        request: { cursor: null, limit: 50 },
      }),
    );
  });
});

// C15 trusted source binding: the router hands the Pi coordinator a transient
// navigation target object whose resolveAndValidate() returns the exact source
// MainWindow only while that window still presents the bound conversation, and
// which fails closed (stickily) on any presentation transition. The window is
// never serialized into a payload, schema, transcript or receipt.
describe("pi conversation navigation target binding", function () {
  type CapturedTarget = { resolveAndValidate(): unknown } | undefined;
  const sent: Array<{
    conversationId: string;
    message: string;
    target: CapturedTarget;
  }> = [];
  let hostAlive = true;
  let selectedId = "conv-1";
  let shellWindow: Record<string, unknown> | null = { id: "shell-1" };
  const coordinator = {
    get selectedId() {
      return selectedId;
    },
    select: async (conversationId: string) => {
      selectedId = conversationId;
    },
    send: async (
      conversationId: string,
      message: string,
      _authorize: unknown,
      target: CapturedTarget,
    ) => {
      sent.push({ conversationId, message, target });
    },
    setComposerError: () => undefined,
  };

  function piOwnerOf(conversationId: string) {
    return {
      source: "pi-conversations" as const,
      ownerKey: conversationId,
      conversationId,
    };
  }

  function createHost(win: Record<string, unknown>, generation = "gen-1") {
    return {
      activeTab: "pi-conversations",
      activeTarget: "library",
      win,
      readyTabs: new Set<string>(),
      readyTabGenerations: new Map<string, string>(
        generation ? [["pi-conversations", generation]] : [],
      ),
      childInitInFlight: new Map(),
    };
  }

  const sendEnvelope = (conversationId = "conv-1") => ({
    source: "pi-conversations",
    owner: piOwnerOf(conversationId),
    actionId: "action-send",
    action: "send-prompt",
    payload: { message: "Hello" },
  });
  const selectEnvelope = (conversationId: string) => ({
    source: "pi-conversations",
    owner: piOwnerOf(conversationId),
    actionId: "action-select",
    action: "set-active-conversation",
    payload: {},
  });

  before(function () {
    configureAssistantWorkspaceActionRouterShellHost({
      piConversationsSurface: () => ({ adapter: {} as never }),
      piConversationCoordinator: () => coordinator as never,
      localizeString: (_key, fallback) => fallback,
      openBackendManager: async () => undefined,
      logAssistantWorkspaceDebug: () => undefined,
      closeActiveSidebarHost: () => false,
      normalizeTab: (value) => String(value || "pi-conversations") as never,
      resolveCurrentShellWindow: () => shellWindow as never,
      isHostAlive: () => hostAlive,
    });
  });

  beforeEach(function () {
    sent.length = 0;
    hostAlive = true;
    selectedId = "conv-1";
    shellWindow = { id: "shell-1" };
  });

  it("passes a non-serializable fourth target returning only the source window", async function () {
    const win = { id: "win-a" };
    const host = createHost(win);
    await handleChildAction(
      host as never,
      "library" as never,
      sendEnvelope() as never,
    );
    assert.lengthOf(sent, 1);
    const target = sent[0].target!;
    assert.isFunction(target.resolveAndValidate);
    assert.deepEqual(Object.keys(target), ["resolveAndValidate"]);
    // The trusted authority never serializes: no window, path or identity.
    assert.equal(JSON.stringify(target), "{}");
    assert.strictEqual(target.resolveAndValidate(), win);
  });

  it("binds each window to its own presented owner without cross-window fallback", async function () {
    const winA = { id: "win-a" };
    const winB = { id: "win-b" };
    await handleChildAction(
      createHost(winA) as never,
      "library" as never,
      sendEnvelope() as never,
    );
    await handleChildAction(
      createHost(winB) as never,
      "library" as never,
      sendEnvelope() as never,
    );
    assert.lengthOf(sent, 2);
    assert.strictEqual(sent[0].target!.resolveAndValidate(), winA);
    assert.strictEqual(sent[1].target!.resolveAndValidate(), winB);
  });

  it("fails closed and stays stale after the source document is replaced", async function () {
    const win = { id: "win-a" };
    const host = createHost(win);
    await handleChildAction(
      host as never,
      "library" as never,
      sendEnvelope() as never,
    );
    const target = sent[0].target!;
    assert.strictEqual(target.resolveAndValidate(), win);
    host.readyTabGenerations.set("pi-conversations", "gen-2");
    assert.isNull(target.resolveAndValidate());
    // Sticky: restoring the original document cannot revive the interaction.
    host.readyTabGenerations.set("pi-conversations", "gen-1");
    assert.isNull(target.resolveAndValidate());
  });

  it("invalidates stickily across a source switch away and back", async function () {
    const win = { id: "win-a" };
    const host = createHost(win);
    await handleChildAction(
      host as never,
      "library" as never,
      sendEnvelope() as never,
    );
    const target = sent[0].target!;
    assert.strictEqual(target.resolveAndValidate(), win);
    // The sidebar invalidates on the real source transition...
    invalidateAssistantWorkspacePiNavigationTargets(host as never);
    host.activeTab = "acp-chat";
    assert.isNull(target.resolveAndValidate());
    // ...and switching back does not revive it.
    host.activeTab = "pi-conversations";
    assert.isNull(target.resolveAndValidate());
  });

  it("invalidates stickily across an owner switch away and back", async function () {
    const win = { id: "win-a" };
    const host = createHost(win);
    await handleChildAction(
      host as never,
      "library" as never,
      sendEnvelope() as never,
    );
    const target = sent[0].target!;
    await handleChildAction(
      host as never,
      "library" as never,
      selectEnvelope("conv-2") as never,
    );
    await handleChildAction(
      host as never,
      "library" as never,
      selectEnvelope("conv-1") as never,
    );
    assert.equal(selectedId, "conv-1");
    assert.isNull(target.resolveAndValidate());
  });

  it("replaces the previous binding when the same host sends again", async function () {
    const win = { id: "win-a" };
    const host = createHost(win);
    await handleChildAction(
      host as never,
      "library" as never,
      sendEnvelope() as never,
    );
    const first = sent[0].target!;
    await handleChildAction(
      host as never,
      "library" as never,
      sendEnvelope() as never,
    );
    const second = sent[1].target!;
    assert.isNull(first.resolveAndValidate());
    assert.strictEqual(second.resolveAndValidate(), win);
  });

  it("keeps the binding valid when the same owner is re-selected", async function () {
    const win = { id: "win-a" };
    const host = createHost(win);
    await handleChildAction(
      host as never,
      "library" as never,
      sendEnvelope() as never,
    );
    const target = sent[0].target!;
    await handleChildAction(
      host as never,
      "library" as never,
      selectEnvelope("conv-1") as never,
    );
    assert.strictEqual(target.resolveAndValidate(), win);
  });

  it("fails closed when the presented document, target or shell is missing", async function () {
    const host = createHost({ id: "win-a" }, "");
    await handleChildAction(
      host as never,
      "library" as never,
      sendEnvelope() as never,
    );
    assert.isUndefined(sent[0].target);
  });

  it("fails closed when the host is disposed or the source window is closed", async function () {
    const win: Record<string, unknown> = { id: "win-a" };
    const host = createHost(win);
    await handleChildAction(
      host as never,
      "library" as never,
      sendEnvelope() as never,
    );
    const target = sent[0].target!;
    hostAlive = false;
    assert.isNull(target.resolveAndValidate());
    hostAlive = true;
    win.closed = true;
    assert.isNull(target.resolveAndValidate());
  });
});

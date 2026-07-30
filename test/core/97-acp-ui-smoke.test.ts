import { assert } from "chai";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { ASSISTANT_WORKSPACE_ACTION_REGISTRY } from "../../src/modules/assistantWorkspacePublication";
import * as AssistantPanelModel from "../../src/sidebar/assistantPanelModel.js";
import * as AssistantPanelRenderer from "../../src/sidebar/assistantPanelRenderer.js";
import * as AssistantTranscriptRenderer from "../../src/sidebar/assistantTranscriptRenderer.js";
import * as AssistantWorkspaceAcpChild from "../../src/sidebar/assistantWorkspaceAcpChild.js";
import { updateSkillRunnerRunApplyState } from "../../src/modules/skillRunnerRunStore";
import { clearPref, setPref } from "../../src/utils/prefs";
import {
  captureSkillRunnerWorkspaceEnvelope,
  startSkillRunnerWorkspaceSnapshotHarness,
} from "../helpers/skillRunnerWorkspaceSnapshotHarness";
import {
  FakeDocument,
  FakeElement,
  installAssistantWorkspaceRendererGlobals,
  restoreAssistantWorkspaceRendererGlobals,
} from "../helpers/assistantWorkspaceAcpChildHarness";

const root = path.resolve(import.meta.dirname, "../..");

async function readProjectFile(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function loadPanelModel() {
  return AssistantPanelModel;
}

async function loadWorkspaceChild() {
  return AssistantWorkspaceAcpChild;
}

async function loadPanelRenderer(document: FakeDocument) {
  installAssistantWorkspaceRendererGlobals(document);
  return AssistantPanelRenderer;
}

async function loadTranscriptRenderer(
  document: FakeDocument,
  requestAnimationFrame?: (callback: () => void) => number,
) {
  installAssistantWorkspaceRendererGlobals(document, {
    requestAnimationFrame:
      requestAnimationFrame ||
      ((callback: () => void) => {
        callback();
        return 0;
      }),
  });
  return AssistantTranscriptRenderer;
}

function createPanelManagedRegions(document: FakeDocument) {
  const root = document.createElement("div");
  const regions = {
    toolbar: document.createElement("div"),
    banner: document.createElement("div"),
    messageCounter: document.createElement("div"),
    plan: document.createElement("div"),
    hint: document.createElement("div"),
    reply: document.createElement("div"),
    drawer: document.createElement("div"),
    details: document.createElement("div"),
  };
  Object.values(regions).forEach((region) => root.appendChild(region));
  return { root, regions };
}

// Region mounts are reused permanently, so mount-level identity alone cannot
// catch a guard miss that rebuilds the mount's content. Capture the full
// subtree node list and compare element-wise by reference.
function subtreeNodes(node: FakeElement | null): FakeElement[] {
  if (!node) return [];
  return [node, ...node.children.flatMap((child) => subtreeNodes(child))];
}

function captureRegionSubtrees(
  regions: Record<string, FakeElement>,
): Record<string, FakeElement[]> {
  return Object.fromEntries(
    Object.entries(regions).map(([key, region]) => [
      key,
      subtreeNodes(region.firstChild),
    ]),
  );
}

function assertRegionSubtreesPreserved(
  regions: Record<string, FakeElement>,
  captured: Record<string, FakeElement[]>,
) {
  for (const [key, region] of Object.entries(regions)) {
    const current = subtreeNodes(region.firstChild);
    const previous = captured[key] || [];
    assert.equal(
      current.length,
      previous.length,
      `${key} subtree node count changed`,
    );
    current.forEach((node, index) => {
      assert.strictEqual(
        node,
        previous[index],
        `${key} subtree node #${index} was rebuilt`,
      );
    });
  }
}

function createAnimationFrameHarness() {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  return {
    requestAnimationFrame(callback: () => void) {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id;
    },
    get pendingCount() {
      return callbacks.size;
    },
    flushNext() {
      const next = callbacks.entries().next().value as
        | [number, () => void]
        | undefined;
      if (!next) return false;
      callbacks.delete(next[0]);
      next[1]();
      return true;
    },
    flushAll(limit = 20) {
      let count = 0;
      while (callbacks.size > 0 && count < limit) {
        this.flushNext();
        count += 1;
      }
      assert.isBelow(count, limit, "animation frame callbacks did not settle");
    },
  };
}

function owner(source: "acp-chat" | "acp-skills", key: string) {
  return source === "acp-chat"
    ? {
        source,
        ownerKey: key,
        backendId: key.split("\n")[0],
        conversationId: key.split("\n")[1],
      }
    : { source, ownerKey: key, requestId: key };
}

function canonicalState(source: "acp-chat" | "acp-skills") {
  const selected =
    source === "acp-chat"
      ? owner(source, "backend-a\nconversation-a")
      : owner(source, "request-a");
  return {
    source,
    navigation: {
      selectedOwner: selected,
      selectedGroupId: "backend-a",
      groups: [
        { groupId: "backend-a", label: "Backend A", status: "connected" },
        { groupId: "backend-b", label: "Backend B", status: "idle" },
      ],
      entries: [
        {
          owner: selected,
          groupId: "backend-a",
          label: source === "acp-chat" ? "Research session" : "Task Alpha",
          subtitle: source === "acp-chat" ? "Backend A" : "Skill Alpha",
          description: null,
          groupLabel: "Backend A",
          status: "running",
          backendStatus: "connected",
          applyState: source === "acp-skills" ? "pending" : null,
          attention: null,
          updatedAt: "2026-07-16T00:00:00.000Z",
          messageCount: 3,
        },
      ],
      queuedEntries: [],
      canCreateOwner: source === "acp-chat",
    },
    services: {
      items: [
        {
          serviceId: "host-bridge",
          label: "Host Bridge",
          status: "running",
          available: true,
          message: null,
        },
      ],
    },
    selection: {
      owner: selected,
      phase: "ready",
      control: {
        status: "running",
        busy: true,
        hint: { kind: "running", message: null },
        connection: {
          status: "connected",
          sessionAvailable: true,
          connected: true,
          canConnect: false,
          canDisconnect: true,
        },
        execution: { canCancel: true, canInterrupt: true },
        authentication: {
          required: false,
          canAuthenticate: false,
          methodId: null,
        },
        permissionPolicy: {
          autoApprove: false,
          canSetAutoApprove: source === "acp-chat",
        },
      },
      messageCounts: null,
      transcript: {
        owner: selected,
        status: "loading",
        error: null,
        page: null,
        transcriptRevision: 0,
      },
      plan: { items: [] },
      permission: { request: null },
      composer: {
        reply: { status: "enabled" },
        runtimeOptions: {
          mode: { selectedOptionId: null, options: [], enabled: false },
          model: { selectedOptionId: null, options: [], enabled: false },
          reasoningEffort: {
            selectedOptionId: null,
            options: [],
            enabled: false,
          },
        },
      },
      presentation: {
        title: source === "acp-chat" ? "Research session" : "Task Alpha",
        subtitle: source === "acp-chat" ? "Agent A" : "Skill Alpha",
        description: null,
        notice: null,
        metadata: [{ fieldId: "workflow", value: "Literature" }],
        usage: { used: 4, limit: 10, costText: null },
      },
      details: {
        status: "ready",
        title: source === "acp-chat" ? "Research session" : "Task Alpha",
        subtitle: selected.ownerKey,
        sections: [
          {
            sectionId: source === "acp-chat" ? "paths" : "run-paths",
            collapsed: false,
            items: [
              { fieldId: "workspace", value: "/tmp/run", format: "path" },
            ],
          },
        ],
        actions: ["copy-diagnostics", "open-workspace"],
        error: null,
      },
    },
  };
}

function emptyWorkspaceState(source: "acp-chat" | "acp-skills") {
  const state = canonicalState(source) as any;
  state.navigation.selectedOwner = null;
  state.selection = {
    owner: null,
    phase: "empty",
    control: null,
    presentation: null,
    composer: null,
    permission: { request: null },
    transcript: {
      owner: null,
      status: "idle",
      error: null,
      page: null,
      transcriptRevision: 0,
    },
  };
  return state;
}

function noBackendWorkspaceState(source: "acp-chat" | "acp-skills") {
  const state = emptyWorkspaceState(source);
  if (source === "acp-chat") {
    state.navigation.groups = [];
    state.navigation.entries = [];
    state.navigation.queuedEntries = [];
    state.navigation.selectedGroupId = null;
    state.navigation.canCreateOwner = false;
  }
  return state;
}

function backendOnlyAcpChatWorkspaceState() {
  const state = emptyWorkspaceState("acp-chat");
  state.navigation.groups = [
    {
      groupId: "backend-a",
      label: "Backend A",
      status: "idle",
    },
  ];
  state.navigation.entries = [];
  state.navigation.queuedEntries = [];
  state.navigation.selectedGroupId = "backend-a";
  state.navigation.canCreateOwner = true;
  return state;
}

function emptyPanelLabels(source: "acp-chat" | "acp-skills") {
  return {
    title: source === "acp-chat" ? "ACP Chat" : "ACP Skill Run",
    assistantPanel: {
      emptyState: {
        noConversation: "No conversation",
        noTask: "No task",
      },
    },
  };
}

describe("Assistant Workspace ACP UI v1", function () {
  after(function () {
    restoreAssistantWorkspaceRendererGlobals();
  });

  it("loads both ACP documents through one shared child and identical roles", async function () {
    const [chat, skills] = await Promise.all([
      readProjectFile("addon/content/sidebar/acp-chat.html"),
      readProjectFile("addon/content/sidebar/acp-skill-run.html"),
    ]);
    for (const html of [chat, skills]) {
      for (const role of [
        "root",
        "toolbar",
        "banner",
        "message-counts",
        "context-drawer",
        "main",
        "transcript",
        "plan",
        "interaction",
        "composer",
        "details-drawer",
      ]) {
        assert.include(html, `data-role="${role}"`);
      }
      assert.include(html, 'src="./acp-child.bundle.js"');
      assert.include(
        html,
        "../shared/assistant/assistant-workspace-acp-child.css",
      );
      assert.notMatch(html, /data-role="main"[^>]*class="[^"]*\bhidden\b/);
      assert.match(
        html,
        /data-role="conversation"[\s\S]*data-role="empty"[\s\S]*data-role="transcript"/,
      );
      assert.notMatch(html, /aria-label="[^"]*[A-Za-z][^"]*"/);
    }
    await Promise.all(
      [
        "addon/content/sidebar/acp-chat.js",
        "addon/content/sidebar/acp-skill-run.js",
        "addon/content/sidebar/acp-chat.css",
        "addon/content/sidebar/acp-skill-run.css",
        "addon/content/shared/assistant/assistant-conversation-view.js",
      ].map(async (relativePath) => {
        let exists = true;
        try {
          await access(path.join(root, relativePath));
        } catch {
          exists = false;
        }
        assert.isFalse(exists, relativePath);
      }),
    );
  });

  it("keeps one strict bridge path without ACP postMessage fallback", async function () {
    const [child, shell, contract] = await Promise.all([
      readProjectFile("src/sidebar/assistantWorkspaceAcpChild.js"),
      readProjectFile("src/sidebar/assistantWorkspaceShell.js"),
      readProjectFile("src/shared/assistantWireContract.ts"),
    ]);
    assert.include(
      child,
      "const BRIDGE_KEY = ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY",
    );
    assert.include(contract, '"__zsAssistantWorkspaceAcpBridge"');
    assert.include(child, "bridge.sendAction(envelope)");
    assert.notInclude(child, 'type: "acp:action"');
    assert.notInclude(child, 'type: "acp-skill-run:action"');
    assert.notInclude(shell, "post-to-host-fallback");
    assert.include(shell, "post-to-host-bridge-missing");
  });

  it("projects Chat catalog, session semantics, and shared services exactly", async function () {
    const model = await loadPanelModel();
    const panel = model.projectAssistantWorkspacePanel(
      canonicalState("acp-chat"),
      { executionDisplayMode: "live" },
      {
        title: "ACP Chat",
        subtitle: "Chat with your Zotero library.",
      },
    );
    assert.isTrue(panel.exact);
    assert.equal(panel.context.title, "ACP Chat");
    assert.equal(panel.context.subtitle, "Chat with your Zotero library.");
    assert.deepEqual(
      panel.context.selectors.map((selector: any) => selector.id),
      ["backend", "owner"],
    );
    assert.deepEqual(
      panel.context.indicators.map((indicator: any) => indicator.label),
      ["Connection", "Host Bridge"],
    );
    assert.deepEqual(panel.usage, {
      used: 4,
      limit: 10,
      costText: null,
    });
    assert.isTrue(panel.reply.showUsageGauge);
    assert.equal(
      panel.context.selectors[1].options[0].label,
      "Research session",
    );
    const withoutUsage = canonicalState("acp-chat");
    withoutUsage.selection.presentation.usage = null;
    const noUsagePanel = model.projectAssistantWorkspacePanel(
      withoutUsage,
      { executionDisplayMode: "live" },
      {},
    );
    assert.isTrue(noUsagePanel.reply.showUsageGauge);
    assert.isNull(noUsagePanel.usage);
    const document = new FakeDocument();
    const renderer = await loadPanelRenderer(document);
    const reply = document.createElement("div");
    renderer.renderAssistantReply(reply, noUsagePanel);
    assert.equal(
      reply.querySelector(".assistant-panel-usage-label")?.textContent,
      "N/A",
    );
  });

  it("keeps ACP Chat backend actions available before a conversation exists", async function () {
    const model = await loadPanelModel();
    const panel = model.projectAssistantWorkspacePanel(
      backendOnlyAcpChatWorkspaceState(),
      { executionDisplayMode: "live" },
      emptyPanelLabels("acp-chat"),
    );

    const backendSelector = panel.context.selectors.find(
      (entry: any) => entry.id === "backend",
    );
    assert.deepInclude(backendSelector, {
      value: "backend-a",
      disabled: false,
    });
    assert.deepEqual(
      backendSelector.options.map((entry: any) => [entry.value, entry.label]),
      [["backend-a", "Backend A"]],
    );

    const ownerSelector = panel.context.selectors.find(
      (entry: any) => entry.id === "owner",
    );
    assert.deepInclude(ownerSelector, {
      value: "",
      disabled: true,
    });
    assert.deepEqual(ownerSelector.options, []);

    const newConversation = panel.context.actions.find(
      (entry: any) => entry.action === "new-conversation",
    );
    assert.deepInclude(newConversation, {
      enabled: true,
      payload: { groupId: "backend-a" },
    });
    const connect = panel.context.actions.find(
      (entry: any) => entry.action === "connect",
    );
    assert.deepInclude(connect, {
      enabled: true,
      payload: { groupId: "backend-a" },
    });
    assert.isFalse(panel.reply.enabled);
    assert.isFalse(panel.reply.inputEnabled);
  });

  for (const source of ["acp-chat", "acp-skills"] as const) {
    it(`keeps ${source} empty chrome resident and unavailable`, async function () {
      const model = await loadPanelModel();
      const panel = model.projectAssistantWorkspacePanel(
        noBackendWorkspaceState(source),
        { executionDisplayMode: "live" },
        emptyPanelLabels(source),
      );

      assert.equal(
        panel.context.subtitle,
        source === "acp-chat" ? "No conversation" : "No task",
      );
      assert.deepInclude(panel.context, {
        status: "unavailable",
        statusLabel: "Unavailable",
        statusTone: "muted",
      });
      assert.deepEqual(
        panel.context.metadata.map((entry: any) => [entry.itemId, entry.value]),
        source === "acp-chat"
          ? [
              ["backend", ""],
              ["conversation", ""],
              ["workspace", ""],
            ]
          : [
              ["backend", ""],
              ["workspace", ""],
            ],
      );
      assert.deepEqual(
        panel.context.indicators.map((entry: any) => [entry.id, entry.tone]),
        [
          ["acp-connection", "muted"],
          ["host-bridge", "success"],
        ],
      );
      assert.deepEqual(
        panel.context.actions.map((entry: any) => [
          entry.action,
          entry.enabled,
        ]),
        source === "acp-chat"
          ? [
              ["new-conversation", false],
              ["connect", false],
              ["disconnect", false],
              ["authenticate", false],
              ["set-auto-approve-permissions", false],
            ]
          : [
              ["connect-run", false],
              ["disconnect-run", false],
              ["cancel-run", false],
            ],
      );
      assert.deepEqual(
        panel.actions.toolbar.map((entry: any) => entry.enabled),
        [true, false, true, true],
      );
      assert.isFalse(panel.reply.enabled);
      assert.isFalse(panel.reply.inputEnabled);
      assert.deepEqual(
        panel.reply.controls.map((entry: any) => [
          entry.id,
          entry.value,
          entry.disabled,
        ]),
        [
          ["mode", "", true],
          ["model", "", true],
          ["reasoning", "", true],
        ],
      );
      assert.isTrue(panel.reply.showUsageGauge);

      if (source === "acp-chat") {
        assert.deepEqual(
          panel.context.selectors.map((entry: any) => [
            entry.id,
            entry.value,
            entry.disabled,
          ]),
          [
            ["backend", "", true],
            ["owner", "", true],
          ],
        );
      }

      const document = new FakeDocument();
      const renderer = await loadPanelRenderer(document);
      const banner = document.createElement("div");
      renderer.renderAssistantBanner(banner, panel, { onAction() {} });
      assert.deepEqual(
        banner
          .querySelectorAll(".assistant-panel-meta-pill")
          .map((entry) => entry.children[1].textContent),
        panel.context.metadata.map(() => "-"),
      );
    });
  }

  it("projects SkillRunner null session as fixed unavailable chrome", async function () {
    const model = await loadPanelModel();
    // 生产真空快照：无任务种子 → session=null（harness 走真实
    // attach → refresh → publish 路径，labels 由生产构建）。
    const panel = model.projectSkillRunnerPanelSnapshot(
      await captureSkillRunnerWorkspaceEnvelope(),
    );

    assert.deepInclude(panel.context, {
      title: "SkillRunner Workspace",
      subtitle: "No task",
      status: "unavailable",
      statusLabel: "Unavailable",
      statusTone: "muted",
    });
    assert.deepEqual(
      panel.context.metadata.map((entry: any) => [entry.key, entry.value]),
      [
        ["backend", ""],
        ["engine", ""],
        ["model", ""],
        ["updatedAt", ""],
      ],
    );
    assert.deepInclude(panel.context.indicators[0], {
      id: "skillrunner-control",
      value: "Unavailable",
      tone: "muted",
    });
    assert.lengthOf(panel.context.indicators, 1);
    assert.deepInclude(panel.context.actions[0], {
      action: "cancel-run",
      enabled: false,
    });
    assert.deepEqual(
      panel.actions.toolbar.map((entry: any) => entry.enabled),
      [true, false, true, true],
    );
    assert.isFalse(panel.reply.enabled);
    assert.isFalse(panel.reply.inputEnabled);
  });

  it("keeps a selected SkillRunner session without requestId in preparing state", async function () {
    const model = await loadPanelModel();
    // 生产等价种子：本地已创建、尚未分配 requestId 的 SkillRunner 任务
    // （submitPhase=pre_request、status=queued）。
    const panel = model.projectSkillRunnerPanelSnapshot(
      await captureSkillRunnerWorkspaceEnvelope({
        tasks: [{ taskName: "Task Alpha" }],
      }),
    );

    assert.equal(panel.context.title, "Task Alpha");
    assert.equal(panel.context.status, "queued");
    assert.notEqual(panel.context.subtitle, "No task");
    assert.deepInclude(panel.context.indicators[0], {
      id: "skillrunner-control",
      value: "Preparing",
      tone: "accent",
    });
  });

  it("renders SkillRunner message counts without rebuilding other managed regions", async function () {
    const document = new FakeDocument();
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(document);
    const { root, regions } = createPanelManagedRegions(document);
    // 生产真快照：messageCounts 由生产侧从 transcript 消息投影派生。
    // 种子事件的语义计数（projectSkillRunnerMessageCounts）：
    //   render(1): current {assistant:1,thought:1,tool:0}
    //              cumulative {assistant:1,thought:2,tool:3}
    //   render(2): current {assistant:1,thought:2,tool:1}
    //              cumulative {assistant:1,thought:3,tool:4}
    // counter 标签来自生产 labels（mock 环境为英文 fallback）。
    const toolProcess = (seq: number, toolCallId: string, text: string) => ({
      seq,
      ts: `2026-07-18T00:00:${String(seq).padStart(2, "0")}.000Z`,
      role: "assistant",
      kind: "assistant_process",
      text,
      correlation: { process_type: "tool_call", tool_call_id: toolCallId },
    });
    const render = async (variant: 1 | 2) => {
      const envelope = await captureSkillRunnerWorkspaceEnvelope({
        tasks: [
          {
            taskName: "Task Alpha",
            requestId: "req-counts",
            status: "succeeded",
            chatEvents: [
              {
                seq: 1,
                ts: "2026-07-18T00:00:01.000Z",
                role: "assistant",
                kind: "assistant_process",
                text: "reasoning step one",
                correlation: { process_type: "reasoning" },
              },
              toolProcess(2, "tool-1", "read a.md"),
              toolProcess(3, "tool-2", "read b.md"),
              toolProcess(4, "tool-3", "read c.md"),
              {
                seq: 5,
                ts: "2026-07-18T00:00:05.000Z",
                role: "user",
                kind: "user_message",
                text: "go on",
              },
              {
                seq: 6,
                ts: "2026-07-18T00:00:06.000Z",
                role: "assistant",
                kind: "assistant_process",
                text: "reasoning step two",
                correlation: { process_type: "reasoning" },
              },
              {
                seq: 7,
                ts: "2026-07-18T00:00:07.000Z",
                role: "assistant",
                kind: "assistant_final",
                text: "final answer",
                display_text: "final answer",
              },
              ...(variant === 2
                ? [
                    {
                      seq: 8,
                      ts: "2026-07-18T00:00:08.000Z",
                      role: "assistant",
                      kind: "assistant_process",
                      text: "reasoning step three",
                      correlation: { process_type: "reasoning" },
                    },
                    toolProcess(9, "tool-4", "read d.md"),
                  ]
                : []),
            ],
          },
        ],
        waitFor: (snapshot) =>
          !!snapshot.session &&
          snapshot.session.loading === false &&
          snapshot.session.messages.some(
            (message) => message.seq === (variant === 2 ? 9 : 7),
          ),
      });
      const panel = model.projectSkillRunnerPanelSnapshot(envelope);
      // model 原样透传生产投影的 messageCounts。
      assert.deepEqual(panel.messageCounts, envelope.messageCounts);
      renderer.renderAssistantPanelSnapshot(panel, {
        managed: true,
        root,
        regions,
        onAction() {},
      });
      return envelope;
    };

    const first = await render(1);
    assert.isFalse(regions.messageCounter.classList.contains("hidden"));
    assert.equal(
      regions.messageCounter.getAttribute("data-message-counter-owner"),
      first.workspace.selectedTaskKey,
    );
    const counterItems = regions.messageCounter.querySelectorAll(
      ".assistant-message-counter-item",
    );
    const counterValues = regions.messageCounter.querySelectorAll(
      ".assistant-message-counter-value",
    );
    assert.deepEqual(
      regions.messageCounter
        .querySelectorAll(".assistant-message-counter-label")
        .map((entry) => entry.textContent),
      ["Assistant", "Thought", "Tool"],
    );
    assert.deepEqual(
      counterValues.map((entry) => entry.textContent),
      ["1/1", "1/2", "0/3"],
    );
    const stableRegions = [
      "toolbar",
      "banner",
      "plan",
      "hint",
      "reply",
      "drawer",
    ] as const;
    const stableSubtrees = Object.fromEntries(
      stableRegions.map((key) => [key, subtreeNodes(regions[key].firstChild)]),
    );

    await render(2);
    assert.deepEqual(
      counterValues.map((entry) => entry.textContent),
      ["1/1", "2/3", "1/4"],
    );
    regions.messageCounter
      .querySelectorAll(".assistant-message-counter-item")
      .forEach((entry, index) => {
        assert.strictEqual(entry, counterItems[index]);
      });
    assertRegionSubtreesPreserved(
      Object.fromEntries(stableRegions.map((key) => [key, regions[key]])),
      stableSubtrees,
    );
  });

  it("preserves SkillRunner managed chrome when backend history replaces local-only transcript", async function () {
    this.timeout(10_000);
    setPref("assistantExecutionDisplayMode", "live");
    const harness = await startSkillRunnerWorkspaceSnapshotHarness();
    try {
      const document = new FakeDocument();
      const model = await loadPanelModel();
      const renderer = await loadPanelRenderer(document);
      const { root, regions } = createPanelManagedRegions(document);
      const seeded = harness.seedTask({
        taskName: "Managed Transcript Catch-up",
        requestId: "req-managed-transcript-catch-up",
        status: "running",
      });
      const capture = await harness.attach({ selectRunKey: seeded.runKey });
      const localOnly = await capture.waitFor(
        (snapshot) =>
          snapshot.session?.loading === false &&
          snapshot.session.messages.length > 0 &&
          snapshot.session.messages.every((message) => message.seq < 0),
      );
      const render = (snapshot: typeof localOnly) => {
        const panel = model.projectSkillRunnerPanelSnapshot(snapshot);
        renderer.renderAssistantPanelSnapshot(panel, {
          managed: true,
          root,
          regions,
          onAction() {},
        });
        return panel;
      };
      render(localOnly);
      const stableRegions = [
        "toolbar",
        "banner",
        "plan",
        "hint",
        "reply",
        "drawer",
      ] as const;
      const stableSubtrees = Object.fromEntries(
        stableRegions.map((key) => [
          key,
          subtreeNodes(regions[key].firstChild),
        ]),
      );

      await capture.waitFor(
        () => harness.getChatStreamState(seeded.requestId).openCount === 1,
      );
      const afterIndex = capture.snapshots.length - 1;
      harness.appendChatEvents(seeded.requestId, [
        {
          seq: 1,
          ts: "2026-07-18T00:03:00.000Z",
          role: "assistant",
          kind: "assistant_process",
          text: "read backend artifact",
          correlation: {
            process_type: "tool_call",
            tool_call_id: "tool-managed-history",
          },
        },
      ]);
      const updated = await capture.waitForAfter(
        afterIndex,
        (snapshot) =>
          snapshot.messageCounts?.cumulative.tool === 1 &&
          snapshot.session?.messages.some((message) => message.seq === 1) ===
            true,
      );
      const panel = render(updated.snapshot);

      assert.isTrue(
        panel.conversation.items.some((item: any) => item.kind === "tool"),
      );
      assert.isAbove(
        updated.snapshot.transcriptRevision,
        localOnly.transcriptRevision,
      );
      assertRegionSubtreesPreserved(
        Object.fromEntries(stableRegions.map((key) => [key, regions[key]])),
        stableSubtrees,
      );
    } finally {
      await harness.reset();
      clearPref("assistantExecutionDisplayMode");
    }
  });

  it("preserves SkillRunner managed mounts across empty and selected snapshots", async function () {
    const document = new FakeDocument();
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(document);
    const { root, regions } = createPanelManagedRegions(document);
    // 生产真空快照（无任务）与生产选中快照（running 任务）。
    const emptyEnvelope = await captureSkillRunnerWorkspaceEnvelope();
    const selectedEnvelope = await captureSkillRunnerWorkspaceEnvelope({
      tasks: [
        { taskName: "Task Alpha", requestId: "req-a", status: "running" },
      ],
    });
    const selectedPanel =
      model.projectSkillRunnerPanelSnapshot(selectedEnvelope);
    const selectedTask =
      selectedPanel.drawers.skillrunnerSections[0].groups[0].activeTasks[0];
    assert.deepInclude(selectedTask, {
      mainStatus: "running",
      backendStatus: "running",
      applyStatus: "idle",
    });
    const render = (envelope: unknown) => {
      renderer.renderAssistantPanelSnapshot(
        model.projectSkillRunnerPanelSnapshot(envelope),
        {
          managed: true,
          root,
          regions,
          onAction() {},
        },
      );
    };

    render(selectedEnvelope);
    const identities = Object.fromEntries(
      Object.entries(regions).map(([key, region]) => [key, region.firstChild]),
    );
    render(emptyEnvelope);
    render(selectedEnvelope);
    for (const [key, region] of Object.entries(regions)) {
      assert.strictEqual(region.firstChild, identities[key], key);
    }
  });

  it("renders persisted SkillRunner Apply states and replaces only the changed task card", async function () {
    this.timeout(10_000);
    setPref("assistantExecutionDisplayMode", "live");
    const harness = await startSkillRunnerWorkspaceSnapshotHarness();
    try {
      const applied = harness.seedTask({
        taskName: "Applied Task",
        requestId: "req-smoke-applied",
        status: "succeeded",
      });
      const applyTarget = harness.seedTask({
        taskName: "Apply Target Task",
        requestId: "req-smoke-apply-target",
        status: "succeeded",
      });
      const applyFailed = harness.seedTask({
        taskName: "Apply Failed Task",
        requestId: "req-smoke-apply-failed",
        status: "succeeded",
      });
      updateSkillRunnerRunApplyState({
        backendId: harness.backendId,
        requestId: applied.requestId,
        state: "succeeded",
        attempt: 1,
        updatedAt: "2026-07-18T00:02:01.000Z",
      });
      updateSkillRunnerRunApplyState({
        backendId: harness.backendId,
        requestId: applyFailed.requestId,
        state: "failed",
        attempt: 1,
        error: "apply write failed",
        updatedAt: "2026-07-18T00:02:02.000Z",
      });

      const capture = await harness.attach({ selectRunKey: applied.runKey });
      const initial = await capture.waitFor(
        (snapshot) =>
          snapshot.workspace.selectedTaskKey === applied.runKey &&
          snapshot.workspace.groups.reduce(
            (count, group) =>
              count + group.activeTasks.length + group.finishedTasks.length,
            0,
          ) === 3,
      );
      const document = new FakeDocument();
      const model = await loadPanelModel();
      const renderer = await loadPanelRenderer(document);
      const { root, regions } = createPanelManagedRegions(document);
      const transcript = document.createElement("div");
      const transcriptSentinel = document.createElement("article");
      transcript.appendChild(transcriptSentinel);
      root.appendChild(transcript);
      const panelTasks = (panel: any) =>
        panel.drawers.skillrunnerSections.flatMap((section: any) =>
          section.groups.flatMap((group: any) => [
            ...group.activeTasks,
            ...group.finishedTasks,
          ]),
        );
      const taskFromPanel = (panel: any, runKey: string) =>
        panelTasks(panel).find((task: any) => task.key === runKey);
      const rowByKey = (runKey: string) =>
        regions.drawer
          .querySelectorAll("[data-assistant-task-key]")
          .find(
            (row) => row.getAttribute("data-assistant-task-key") === runKey,
          );
      const render = (snapshot: typeof initial) => {
        const panel = model.projectSkillRunnerPanelSnapshot(snapshot);
        renderer.renderAssistantPanelSnapshot(panel, {
          managed: true,
          root,
          regions,
          onAction() {},
        });
        return panel;
      };

      const initialPanel = render(initial);
      assert.deepInclude(taskFromPanel(initialPanel, applied.runKey), {
        mainStatus: "succeeded",
        backendStatus: "succeeded",
        applyStatus: "succeeded",
        applyStatusLabel: "Applied",
        applyStatusTone: "success",
      });
      assert.deepInclude(taskFromPanel(initialPanel, applyTarget.runKey), {
        mainStatus: "succeeded",
        backendStatus: "succeeded",
        applyStatus: "not-required",
        applyStatusLabel: "Not required",
        applyStatusTone: "success",
      });
      assert.deepInclude(taskFromPanel(initialPanel, applyFailed.runKey), {
        mainStatus: "failed",
        backendStatus: "succeeded",
        applyStatus: "failed",
        applyStatusLabel: "Apply failed",
        applyStatusTone: "error",
      });

      const drawerMount = regions.drawer.firstChild;
      const drawerSection = regions.drawer.querySelector(
        ".assistant-workspace-drawer-section",
      );
      const drawerGroup = regions.drawer.querySelector(
        ".assistant-workspace-drawer-group",
      );
      const initialRows = new Map(
        [applied.runKey, applyTarget.runKey, applyFailed.runKey].map(
          (runKey) => [runKey, rowByKey(runKey)],
        ),
      );
      const stableRegions = Object.fromEntries(
        Object.entries(regions).filter(([key]) => key !== "drawer"),
      );
      const stableSubtrees = captureRegionSubtrees(stableRegions);
      const afterIndex = capture.snapshots.length - 1;

      updateSkillRunnerRunApplyState({
        backendId: harness.backendId,
        requestId: applyTarget.requestId,
        state: "skipped",
        attempt: 1,
        updatedAt: "2026-07-18T00:02:03.000Z",
      });
      const updated = (
        await capture.waitForAfter(afterIndex, (snapshot) =>
          snapshot.workspace.groups.some((group) =>
            [...group.activeTasks, ...group.finishedTasks].some(
              (task) =>
                task.key === applyTarget.runKey &&
                task.applyState === "skipped",
            ),
          ),
        )
      ).snapshot;
      const updatedPanel = render(updated);
      assert.deepInclude(taskFromPanel(updatedPanel, applyTarget.runKey), {
        mainStatus: "succeeded",
        backendStatus: "succeeded",
        applyStatus: "skipped",
        applyStatusLabel: "Skipped",
        applyStatusTone: "success",
      });

      assert.strictEqual(regions.drawer.firstChild, drawerMount);
      assert.strictEqual(
        regions.drawer.querySelector(".assistant-workspace-drawer-section"),
        drawerSection,
      );
      assert.strictEqual(
        regions.drawer.querySelector(".assistant-workspace-drawer-group"),
        drawerGroup,
      );
      assert.strictEqual(
        rowByKey(applied.runKey),
        initialRows.get(applied.runKey),
      );
      assert.notStrictEqual(
        rowByKey(applyTarget.runKey),
        initialRows.get(applyTarget.runKey),
      );
      assert.strictEqual(
        rowByKey(applyFailed.runKey),
        initialRows.get(applyFailed.runKey),
      );
      assert.deepEqual(
        regions.drawer
          .querySelectorAll(
            ".assistant-workspace-drawer-task-status-axis-value",
          )
          .map((entry) => entry.textContent)
          .filter((value) =>
            ["Applied", "Skipped", "Apply failed"].includes(value),
          )
          .sort(),
        ["Applied", "Apply failed", "Skipped"].sort(),
      );
      assertRegionSubtreesPreserved(stableRegions, stableSubtrees);
      assert.strictEqual(transcript.firstChild, transcriptSentinel);
    } finally {
      await harness.reset();
      clearPref("assistantExecutionDisplayMode");
    }
  });

  for (const source of ["acp-chat", "acp-skills"] as const) {
    it(`keeps current ${source} runtime option values visible while prompt controls are disabled`, async function () {
      const state = canonicalState(source);
      state.selection.composer = {
        reply: { status: "busy" },
        runtimeOptions: {
          mode: {
            selectedOptionId: "code",
            options: [{ optionId: "code", label: "Code", description: null }],
            enabled: true,
          },
          model: {
            selectedOptionId: "model-a",
            options: [
              { optionId: "model-a", label: "Model A", description: null },
            ],
            enabled: false,
          },
          reasoningEffort: {
            selectedOptionId: "high",
            options: [{ optionId: "high", label: "High", description: null }],
            enabled: false,
          },
        },
      };
      const panel = AssistantPanelModel.projectAssistantWorkspacePanel(
        state,
        { executionDisplayMode: "live" },
        {},
      );
      assert.deepEqual(
        panel.reply.controls.map((entry: any) => [
          entry.id,
          entry.value,
          entry.disabled,
        ]),
        [
          ["mode", "code", false],
          ["model", "model-a", true],
          ["reasoning", "high", true],
        ],
      );

      const document = new FakeDocument();
      const renderer = await loadPanelRenderer(document);
      const reply = document.createElement("div");
      renderer.renderAssistantReply(reply, panel);
      const selects = reply.querySelectorAll(".assistant-panel-select");
      assert.deepEqual(
        selects.map((entry) => entry.disabled),
        [false, true, true],
      );
      assert.deepEqual(
        selects.map(
          (select) =>
            select.children.find((option) => (option as any).selected)
              ?.textContent,
        ),
        ["Code", "Model A", "High"],
      );
    });
  }

  it("refreshes only the Chat banner when auto-approval changes", async function () {
    const document = new FakeDocument();
    const renderer = await loadPanelRenderer(document);
    const { root, regions } = createPanelManagedRegions(document);
    const state = canonicalState("acp-chat");
    const render = () =>
      renderer.renderAssistantPanelSnapshot(
        AssistantPanelModel.projectAssistantWorkspacePanel(state, {}, {}),
        { managed: true, root, regions, onAction() {} },
      );

    render();
    const regionSubtrees = captureRegionSubtrees(regions);
    assert.equal(
      regions.banner
        .querySelector(".assistant-panel-switch-action")
        ?.getAttribute("data-assistant-switch-state"),
      "off",
    );

    state.selection.control.permissionPolicy.autoApprove = true;
    render();

    assert.equal(
      regions.banner
        .querySelector(".assistant-panel-switch-action")
        ?.getAttribute("data-assistant-switch-state"),
      "on",
    );
    const nonBannerRegions = Object.fromEntries(
      Object.entries(regions).filter(([key]) => key !== "banner"),
    );
    assertRegionSubtreesPreserved(nonBannerRegions, regionSubtrees);
  });

  it("projects Skills title, subtitle, banner metadata, and task status axes", async function () {
    const model = await loadPanelModel();
    const panel = model.projectAssistantWorkspacePanel(
      canonicalState("acp-skills"),
      { executionDisplayMode: "boundary", completedCollapsed: false },
      {},
    );
    assert.equal(panel.context.title, "Task Alpha");
    assert.equal(panel.context.subtitle, "Skill Alpha");
    assert.deepInclude(panel.context.metadata, {
      itemId: "workflow",
      label: "Workflow",
      value: "Literature",
    });
    const task = panel.drawers.sections[0].groups[0].activeTasks[0];
    assert.equal(task.workflowLabel, "Skill Alpha");
    assert.equal(task.backendStatus, "connected");
    assert.equal(task.applyStatus, "pending");
    assert.equal(panel.actions.toolbar[3].value, "boundary");
    assert.equal(panel.actions.toolbar[3].align, "end");
  });

  it("projects source-aware ACP drawers without empty backend groups", async function () {
    const model = await loadPanelModel();
    const chatState = canonicalState("acp-chat") as any;
    const chatPanel = model.projectAssistantWorkspacePanel(
      chatState,
      { completedCollapsed: false },
      {},
    );
    assert.deepEqual(
      chatPanel.drawers.sections.map((section: any) => [
        section.id,
        section.hideTitle,
        section.groups.map((group: any) => group.backendId),
      ]),
      [["sessions", true, ["backend-a"]]],
    );

    const skillsState = canonicalState("acp-skills") as any;
    skillsState.navigation.groups.push({
      groupId: "backend-c",
      label: "Backend C",
      status: "idle",
    });
    skillsState.navigation.entries.push({
      owner: owner("acp-skills", "request-c"),
      groupId: "backend-c",
      label: "Task Complete",
      subtitle: "Skill Complete",
      groupLabel: "Backend C",
      status: "succeeded",
      backendStatus: "idle",
      applyState: "succeeded",
      updatedAt: "2026-07-17T00:00:00.000Z",
      messageCount: 1,
    });
    skillsState.navigation.queuedEntries.push({
      queueId: "queue-b",
      groupId: "backend-b",
      label: "Queued Paper",
      subtitle: "Queued Workflow",
      groupLabel: "Backend B",
      updatedAt: "2026-07-17T01:00:00.000Z",
      canCancel: true,
    });
    const skillsPanel = model.projectAssistantWorkspacePanel(
      skillsState,
      {
        runningCollapsed: false,
        queuedCollapsed: true,
        completedCollapsed: true,
      },
      {
        assistantPanel: {
          drawer: {
            running: "运行中",
            queued: "排队中",
            completed: "已完成",
          },
          actions: {
            cancelQueuedWorkflowUnit: "取消排队任务",
          },
        },
      },
    );
    assert.deepEqual(
      skillsPanel.drawers.sections.map((section: any) => [
        section.id,
        section.title,
        section.collapsible,
        section.collapsed,
        section.groups.map((group: any) => group.backendId),
      ]),
      [
        ["running", "运行中", true, false, ["backend-a"]],
        ["queued", "排队中", true, true, ["backend-b"]],
        ["completed", "已完成", true, true, ["backend-c"]],
      ],
    );
    const queuedTask = skillsPanel.drawers.sections[1].groups[0].activeTasks[0];
    assert.isFalse(queuedTask.selectable);
    assert.equal(queuedTask.stateLabel, "排队中");
    assert.equal(queuedTask.itemActions[0].label, "取消排队任务");
    assert.deepEqual(queuedTask.itemActions[0].payload, {
      queueId: "queue-b",
    });
  });

  it("renders semantic task-drawer section classes and routes every collapse toggle", async function () {
    const document = new FakeDocument();
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(document);
    const { root, regions } = createPanelManagedRegions(document);
    const state = canonicalState("acp-skills") as any;
    state.navigation.entries.push({
      owner: owner("acp-skills", "request-c"),
      groupId: "backend-a",
      label: "Task Complete",
      subtitle: "Skill Complete",
      groupLabel: "Backend A",
      status: "succeeded",
      backendStatus: "idle",
      applyState: "succeeded",
      updatedAt: "2026-07-17T00:00:00.000Z",
      messageCount: 1,
    });
    state.navigation.queuedEntries.push({
      queueId: "queue-a",
      groupId: "backend-a",
      label: "Queued Paper",
      subtitle: "Queued Workflow",
      groupLabel: "Backend A",
      updatedAt: "2026-07-17T01:00:00.000Z",
      canCancel: true,
    });
    const actions: Array<{ action: string; payload: unknown }> = [];
    renderer.renderAssistantPanelSnapshot(
      model.projectAssistantWorkspacePanel(
        state,
        {
          runningCollapsed: false,
          queuedCollapsed: false,
          completedCollapsed: false,
        },
        {},
      ),
      {
        managed: true,
        root,
        regions,
        onAction(action: string, payload: unknown) {
          actions.push({ action, payload });
        },
      },
    );

    const sections = regions.drawer.querySelectorAll(
      ".assistant-workspace-drawer-section",
    );
    assert.deepEqual(
      sections.map((section) =>
        ["running", "queued", "completed"].find((id) =>
          section.classList.contains(`is-${id}`),
        ),
      ),
      ["running", "queued", "completed"],
    );
    regions.drawer
      .querySelectorAll(".assistant-workspace-drawer-section-toggle")
      .forEach((toggle) => {
        toggle.listeners.get("click")?.[0]?.({
          preventDefault() {},
          stopPropagation() {},
        });
      });
    assert.deepEqual(actions, [
      {
        action: "toggle-drawer-section",
        payload: { sectionId: "running" },
      },
      {
        action: "toggle-drawer-section",
        payload: { sectionId: "queued" },
      },
      {
        action: "toggle-drawer-section",
        payload: { sectionId: "completed" },
      },
    ]);
  });

  it("preserves non-drawer managed regions across queue-only updates", async function () {
    const document = new FakeDocument();
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(document);
    const { root, regions } = createPanelManagedRegions(document);
    const state = canonicalState("acp-skills") as any;
    const render = () =>
      renderer.renderAssistantPanelSnapshot(
        model.projectAssistantWorkspacePanel(
          state,
          { queuedCollapsed: false, completedCollapsed: true },
          {},
        ),
        { managed: true, root, regions, onAction() {} },
      );

    render();
    const stableRegions = Object.fromEntries(
      Object.entries(regions).filter(([key]) => key !== "drawer"),
    );
    const stableSubtrees = captureRegionSubtrees(stableRegions);
    state.navigation.queuedEntries.push({
      queueId: "queue-a",
      groupId: "backend-a",
      label: "Queued Paper",
      subtitle: "Queued Workflow",
      groupLabel: "Backend A",
      updatedAt: "2026-07-17T01:00:00.000Z",
      canCancel: true,
    });
    render();
    assertRegionSubtreesPreserved(stableRegions, stableSubtrees);
  });

  it("preserves managed drawer identity when only an empty navigation backend is added", async function () {
    const document = new FakeDocument();
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(document);
    const { root, regions } = createPanelManagedRegions(document);
    const state = canonicalState("acp-chat") as any;
    const render = () =>
      renderer.renderAssistantPanelSnapshot(
        model.projectAssistantWorkspacePanel(state, {}, {}),
        { managed: true, root, regions, onAction() {} },
      );

    render();
    const drawerIdentity = regions.drawer.firstChild;
    state.navigation.groups.push({
      groupId: "backend-empty",
      label: "Backend Empty",
      status: "idle",
    });
    render();

    assert.strictEqual(regions.drawer.firstChild, drawerIdentity);
  });

  it("restores the disconnected Chat banner without treating remote identity as live", async function () {
    const model = await loadPanelModel();
    const state = canonicalState("acp-chat");
    state.selection.control = {
      ...state.selection.control,
      status: "idle",
      busy: false,
      hint: { kind: "notice", message: "end_turn" },
      connection: {
        status: "idle",
        sessionAvailable: true,
        connected: false,
        canConnect: true,
        canDisconnect: false,
      },
      authentication: {
        required: false,
        canAuthenticate: false,
        methodId: null,
      },
      permissionPolicy: {
        autoApprove: true,
        canSetAutoApprove: true,
      },
    };
    state.selection.presentation.metadata = [
      { fieldId: "backend", value: "OpenCode ACP" },
      { fieldId: "workspace", value: "/tmp/chat-workspace" },
    ];
    state.selection.composer = {
      reply: { status: "enabled" },
      runtimeOptions: {
        mode: {
          selectedOptionId: "build",
          options: [{ optionId: "build", label: "build", description: null }],
          enabled: false,
        },
        model: {
          selectedOptionId: "model-a",
          options: [
            { optionId: "model-a", label: "Model A", description: null },
          ],
          enabled: false,
        },
        reasoningEffort: {
          selectedOptionId: "default",
          options: [{ optionId: "default", label: "默认", description: null }],
          enabled: false,
        },
      },
    };
    const panel = model.projectAssistantWorkspacePanel(
      state,
      { executionDisplayMode: "live" },
      {
        assistantPanel: {
          actions: {
            autoApproveAcpPermissions: "自动批准",
            autoApproveAcpPermissionsOn: "自动批准已开启",
            autoApproveAcpPermissionsOff: "自动批准已关闭",
          },
        },
      },
    );
    assert.deepEqual(
      panel.context.metadata.map((entry: any) => entry.itemId),
      ["backend", "workspace"],
    );
    assert.deepEqual(
      panel.context.indicators.map((entry: any) => entry.valueVisible),
      [false, false],
    );
    assert.deepEqual(
      panel.context.actions.map((entry: any) => [entry.action, entry.enabled]),
      [
        ["new-conversation", true],
        ["connect", true],
        ["disconnect", false],
        ["authenticate", false],
        ["set-auto-approve-permissions", true],
      ],
    );
    assert.equal(panel.context.actions.at(-1).stateLabel, "自动批准已开启");
    assert.deepEqual(
      panel.reply.controls.map((entry: any) => [
        entry.id,
        entry.value,
        entry.disabled,
      ]),
      [
        ["mode", "build", true],
        ["model", "model-a", true],
        ["reasoning", "default", true],
      ],
    );
    assert.deepInclude(panel.interaction, {
      kind: "notice",
      message: "end_turn",
    });
    assert.equal(panel.reply.hint, "");
  });

  it("restores the waiting Skills banner and semantic hint without raw status metadata", async function () {
    const model = await loadPanelModel();
    const state = canonicalState("acp-skills");
    state.selection.control = {
      ...state.selection.control,
      status: "waiting_user",
      busy: false,
      hint: { kind: "waiting_user", message: null },
      connection: {
        status: "idle",
        sessionAvailable: true,
        connected: false,
        canConnect: true,
        canDisconnect: false,
      },
      execution: { canCancel: true, canInterrupt: false },
    };
    state.selection.presentation.metadata = [
      { fieldId: "backend", value: "Kilo ACP (npm)" },
      { fieldId: "workspace", value: "/tmp/skills-workspace" },
    ];
    const labels = {
      assistantPanel: {
        interaction: { waitingReply: "Agent 正在等待你的回复。" },
      },
    };
    const panel = model.projectAssistantWorkspacePanel(
      state,
      { executionDisplayMode: "live" },
      labels,
    );
    assert.deepEqual(
      panel.context.metadata.map((entry: any) => entry.itemId),
      ["backend", "workspace"],
    );
    assert.deepEqual(
      panel.context.actions.map((entry: any) => [entry.action, entry.enabled]),
      [
        ["connect-run", true],
        ["disconnect-run", false],
        ["cancel-run", true],
      ],
    );
    assert.deepInclude(panel.interaction, {
      kind: "waiting_user",
      message: "Agent 正在等待你的回复。",
    });
    assert.equal(panel.reply.hint, "");
  });

  it("routes a rendered typed option through its canonical model action", async function () {
    const document = new FakeDocument();
    const renderer = await loadPanelRenderer(document);
    const panel = AssistantPanelModel.projectSkillRunnerPanelSnapshot({
      title: "SkillRunner",
      labels: {},
      workspace: { selectedTaskKey: "run:1", groups: [] },
      session: {
        title: "Run",
        backendTitle: "SkillRunner",
        requestId: "request-option",
        status: "waiting_user",
        statusSemantics: {
          normalized: "waiting_user",
          terminal: false,
          waiting: true,
        },
        pendingInteractionId: 7,
        pendingInteraction: {
          inputKind: "choose_one",
          prompt: "Choose",
          hint: null,
          options: [
            {
              label: "Continue deeply",
              value: { depth: 2, continue: true },
              description: null,
            },
          ],
          files: [],
          fileReply: {
            supported: false,
            maxFiles: 8,
            maxFileBytes: 32 * 1024 * 1024,
            maxTotalBytes: 64 * 1024 * 1024,
          },
        },
        pendingKind: "choose_one",
        pendingUiHints: {},
        pendingOptions: [],
        pendingRequiredFields: [],
        authAvailableMethods: [],
        loading: false,
        messages: [],
        labels: {},
      },
    });
    const hint = document.createElement("div");
    const actions: Array<{ action: string; payload: unknown }> = [];
    renderer.renderAssistantHint(hint, panel, {
      onAction(action: string, payload: unknown) {
        actions.push({ action, payload });
      },
    });
    const button = hint.querySelector(".assistant-panel-hint-option");
    assert.ok(button);
    button?.listeners.get("click")?.[0]?.({});
    assert.deepEqual(actions, [
      {
        action: "reply-run",
        payload: {
          responseValue: { depth: 2, continue: true },
          responseLabel: "Continue deeply",
          message: "Continue deeply",
        },
      },
    ]);
  });

  it("dispatches sequential managed text replies without rebuilding panel regions or emitting tokens", async function () {
    const document = new FakeDocument();
    const renderer = await loadPanelRenderer(document);
    const acpState = canonicalState("acp-skills") as any;
    const setAcpPrompt = (prompt: string) => {
      acpState.selection.control = {
        ...acpState.selection.control,
        status: "waiting_user",
        busy: false,
        hint: { kind: "waiting_user", message: null },
        interaction: {
          inputKind: "open_text",
          prompt,
          hint: null,
          options: [],
          files: [],
          fileReply: {
            supported: false,
            maxFiles: 8,
            maxFileBytes: 32 * 1024 * 1024,
            maxTotalBytes: 64 * 1024 * 1024,
          },
        },
      };
    };
    setAcpPrompt("First reply");

    const skillRunnerSnapshot = {
      title: "SkillRunner",
      labels: {},
      workspace: { selectedTaskKey: "run:sequential-reply", groups: [] },
      session: {
        title: "Run",
        backendTitle: "SkillRunner",
        requestId: "request-sequential-reply",
        status: "waiting_user",
        statusSemantics: {
          normalized: "waiting_user",
          terminal: false,
          waiting: true,
        },
        pendingInteractionId: 8,
        pendingInteraction: {
          inputKind: "open_text",
          prompt: "First reply",
          hint: null,
          options: [],
          files: [],
          fileReply: {
            supported: false,
            maxFiles: 8,
            maxFileBytes: 32 * 1024 * 1024,
            maxTotalBytes: 64 * 1024 * 1024,
          },
        },
        pendingKind: "open_text",
        pendingUiHints: {},
        pendingOptions: [],
        pendingRequiredFields: [],
        authAvailableMethods: [],
        loading: false,
        messages: [],
        labels: {},
      },
    } as any;

    const cases = [
      {
        name: "ACP Skills",
        updateInteraction() {
          setAcpPrompt("Second reply");
        },
        project: () =>
          AssistantPanelModel.projectAssistantWorkspacePanel(acpState, {}, {}),
      },
      {
        name: "SkillRunner",
        updateInteraction() {
          skillRunnerSnapshot.session.pendingInteractionId = 9;
          skillRunnerSnapshot.session.pendingInteraction.prompt =
            "Second reply";
        },
        project: () =>
          AssistantPanelModel.projectSkillRunnerPanelSnapshot(
            skillRunnerSnapshot,
          ),
      },
    ];

    for (const testCase of cases) {
      const { root, regions } = createPanelManagedRegions(document);
      const actions: Array<{ action: string; payload: any }> = [];
      const onAction = (action: string, payload: unknown) => {
        actions.push({ action, payload });
      };
      renderer.renderAssistantPanelSnapshot(testCase.project(), {
        managed: true,
        root,
        regions,
        onAction,
      });
      const input = regions.reply.querySelector(".assistant-panel-reply-input");
      const button = regions.reply.querySelector(
        ".assistant-panel-reply-submit",
      );
      assert.ok(input, `${testCase.name} reply input must exist`);
      assert.ok(button, `${testCase.name} reply button must exist`);
      const stableRegions = Object.fromEntries(
        Object.entries(regions).filter(
          ([key]) =>
            key !== "hint" &&
            (testCase.name !== "SkillRunner" || key !== "details"),
        ),
      );
      const regionSubtrees = captureRegionSubtrees(stableRegions);

      testCase.updateInteraction();
      renderer.renderAssistantPanelSnapshot(testCase.project(), {
        managed: true,
        root,
        regions,
        onAction,
      });

      assertRegionSubtreesPreserved(stableRegions, regionSubtrees);
      assert.strictEqual(
        regions.reply.querySelector(".assistant-panel-reply-input"),
        input,
      );
      assert.strictEqual(
        regions.reply.querySelector(".assistant-panel-reply-submit"),
        button,
      );
      (input as any).value = `Continue ${testCase.name}`;
      button?.listeners.get("click")?.[0]?.({
        preventDefault() {},
        stopPropagation() {},
      });

      assert.lengthOf(actions, 1);
      assert.equal(actions[0].action, "reply-run");
      assert.deepInclude(actions[0].payload, {
        message: `Continue ${testCase.name}`,
      });
      assert.notProperty(actions[0].payload, "interactionToken");
    }
  });

  it("bounds the Chat selector to eight recent sessions, retains active, and appends Show more", async function () {
    const model = await loadPanelModel();
    const state = canonicalState("acp-chat");
    const selected = owner("acp-chat", "backend-a\nconversation-10");
    state.selection.owner = selected;
    state.navigation.selectedOwner = selected;
    state.navigation.entries = Array.from({ length: 11 }, (_, index) => ({
      ...state.navigation.entries[0],
      owner: owner("acp-chat", `backend-a\nconversation-${index}`),
      label: `Session ${index}`,
    }));
    const panel = model.projectAssistantWorkspacePanel(
      state,
      { executionDisplayMode: "live" },
      {},
    );
    const options = panel.context.selectors[1].options;
    assert.lengthOf(options, 10);
    assert.isTrue(
      options.some((entry: any) => entry.value === selected.ownerKey),
    );
    assert.deepInclude(options.at(-1), {
      value: "__show-more__",
      sentinel: "show-more",
    });
  });

  it("projects structured permission options plus canonical Cancel", async function () {
    const model = await loadPanelModel();
    const state = canonicalState("acp-skills");
    state.selection.permission = {
      request: {
        requestId: "permission-1",
        approvalKind: "zotero-write",
        title: "Update item",
        summary: "Change title",
        tool: { title: "Update item", callId: "call-1" },
        review: {
          requestedAt: "2026-07-17T00:00:00.000Z",
          command: null,
          preview: "title: Revised",
        },
        options: [{ optionId: "allow", label: "Allow", description: null }],
      },
    };
    const panel = model.projectAssistantWorkspacePanel(
      state,
      { executionDisplayMode: "live", permissionRequestOpen: true },
      {},
    );
    assert.equal(panel.interaction.kind, "permission");
    assert.equal(panel.interaction.permission.approvalKind, "zotero-write");
    assert.equal(panel.interaction.permission.review.preview, "title: Revised");
    assert.deepEqual(
      panel.interaction.actions.map((entry: any) => entry.payload.outcome),
      ["selected", "cancelled"],
    );
    assert.equal(panel.drawers.permissionRequest.approvalKind, "zotero-write");
    assert.equal(
      panel.drawers.permissionRequest.review.preview,
      "title: Revised",
    );
  });

  it("preserves unrelated managed regions across permission-only changes", async function () {
    const document = new FakeDocument();
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(document);
    const { root, regions } = createPanelManagedRegions(document);
    const state = canonicalState("acp-chat");
    const render = () =>
      renderer.renderAssistantPanelSnapshot(
        model.projectAssistantWorkspacePanel(
          state,
          { permissionRequestOpen: false },
          {},
        ),
        { managed: true, root, regions, onAction() {} },
      );

    render();
    const stableRegions = Object.fromEntries(
      Object.entries(regions).filter(([key]) => key !== "hint"),
    );
    const beforePermission = captureRegionSubtrees(stableRegions);
    state.selection.permission = {
      request: {
        requestId: "permission-dom-1",
        approvalKind: "zotero-write",
        title: "Update Zotero item",
        summary: "Change one field",
        tool: { title: "Update Zotero item", callId: "call-dom-1" },
        review: {
          requestedAt: "2026-07-28T00:00:00.000Z",
          command: null,
          preview: "title: Revised",
        },
        options: [{ optionId: "allow", label: "Allow", description: null }],
      },
    };
    render();
    assertRegionSubtreesPreserved(stableRegions, beforePermission);

    const withPermission = captureRegionSubtrees(stableRegions);
    state.selection.permission = { request: null };
    render();
    assertRegionSubtreesPreserved(stableRegions, withPermission);
  });

  it("projects Skills plan independently and details from owner-details", async function () {
    const model = await loadPanelModel();
    const state = canonicalState("acp-skills");
    state.selection.plan = {
      items: [
        {
          itemId: "plan:0",
          content: "Read sources",
          priority: null,
          status: "running",
        },
      ],
    };
    const panel = model.projectAssistantWorkspacePanel(
      state,
      { executionDisplayMode: "live" },
      {},
    );
    assert.isTrue(panel.plan.active);
    assert.equal(panel.plan.activeEntries[0].title, "Read sources");
    assert.equal(panel.drawers.details[0].entries[0].kind, "path");
    assert.deepEqual(
      panel.actions.details.map((entry: any) => entry.action),
      ["copy-diagnostics", "open-workspace"],
    );
  });

  it("projects ACP Skills status axes through the shared task status model", async function () {
    const model = await loadPanelModel();
    const cases = [
      {
        label: "running fallback",
        status: "running",
        backendStatus: null,
        applyState: null,
        expected: {
          mainStatus: "running",
          mainStatusTone: "accent",
          backendStatus: "running",
          applyStatus: "idle",
          applyStatusTone: "muted",
          terminal: false,
        },
        archiveActions: [],
      },
      {
        label: "successful run without apply",
        status: "succeeded",
        backendStatus: null,
        applyState: null,
        expected: {
          mainStatus: "succeeded",
          mainStatusTone: "success",
          backendStatus: "succeeded",
          applyStatus: "not-required",
          applyStatusTone: "success",
          terminal: true,
        },
        archiveActions: ["archive-run"],
      },
      {
        label: "explicit failed apply",
        status: "running",
        backendStatus: "connected",
        applyState: "failed",
        expected: {
          mainStatus: "failed",
          mainStatusTone: "error",
          backendStatus: "connected",
          applyStatus: "failed",
          applyStatusTone: "error",
          terminal: true,
        },
        archiveActions: ["archive-run"],
      },
    ];
    for (const fixture of cases) {
      const state = canonicalState("acp-skills") as any;
      Object.assign(state.navigation.entries[0], {
        status: fixture.status,
        backendStatus: fixture.backendStatus,
        applyState: fixture.applyState,
      });
      const panel = model.projectAssistantWorkspacePanel(
        state,
        { executionDisplayMode: "live", completedCollapsed: false },
        {},
      );
      const tasks = panel.drawers.sections.flatMap((section: any) =>
        section.groups.flatMap((group: any) => [
          ...group.activeTasks,
          ...group.finishedTasks,
        ]),
      );
      assert.lengthOf(tasks, 1, fixture.label);
      assert.deepInclude(tasks[0], {
        ...fixture.expected,
        showBackendStatusBadge: true,
        showApplyStatusBadge: true,
      });
      assert.deepEqual(
        tasks[0].itemActions.map((action: any) => action.action),
        fixture.archiveActions,
        fixture.label,
      );
    }
  });

  it("localizes the ACP Chat backend axis and always hides Apply", async function () {
    const document = new FakeDocument();
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(document);
    const state = canonicalState("acp-chat") as any;
    state.navigation.entries[0].backendStatus = null;
    state.navigation.entries[0].applyState = null;
    const panel = model.projectAssistantWorkspacePanel(
      state,
      { executionDisplayMode: "live" },
      {
        assistantPanel: {
          status: {
            backend: "后端状态",
            apply: "应用状态",
            running: "运行中",
            idle: "空闲",
          },
        },
      },
    );
    const task = panel.drawers.sections[0].groups[0].activeTasks[0];
    assert.deepInclude(task, {
      backendStatus: "running",
      backendStatusLabel: "运行中",
      showBackendStatusBadge: true,
      applyStatus: "idle",
      showApplyStatusBadge: false,
    });
    assert.equal(panel.drawers.labels.statusBackend, "后端状态");
    assert.equal(panel.drawers.labels.statusApply, "应用状态");

    const drawer = document.createElement("div");
    renderer.renderAssistantContextDrawer(drawer, panel, { onAction() {} });
    const axisLabels = drawer
      .querySelectorAll(".assistant-workspace-drawer-task-status-axis-label")
      .map((entry) => entry.textContent);
    assert.deepEqual(axisLabels, ["后端状态"]);
    assert.notInclude(axisLabels, "Backend");
  });

  it("uses injected labels for shared ACP chrome and semantic fields", async function () {
    const model = await loadPanelModel();
    const panel = model.projectAssistantWorkspacePanel(
      canonicalState("acp-skills"),
      { executionDisplayMode: "boundary", completedCollapsed: false },
      {
        assistantPanel: {
          actions: {
            runs: "任务列表",
            details: "详情",
            manageBackends: "管理后端",
            executionDisplayMode: "更新显示",
            executionDisplayLive: "实时",
            executionDisplayBoundary: "按消息",
            executionDisplaySilent: "静默",
            archive: "归档",
            copyDiagnostics: "复制诊断",
            send: "发送",
            cancel: "取消",
          },
          fields: {
            workflow: "工作流",
            backend: "后端",
            session: "会话",
            model: "模型",
            reasoning: "推理",
          },
          drawer: { running: "运行中", completed: "已完成" },
          details: { title: "详情" },
          status: {
            overall: "总体",
            running: "运行中",
            waiting: "等待用户",
            backend: "后端",
            apply: "应用",
            pending: "待处理",
            connected: "已连接",
          },
          reply: { placeholderAcpSkill: "回复所选任务……" },
        },
      },
    );
    assert.equal(panel.context.metadata[0].label, "工作流");
    assert.equal(panel.actions.toolbar[0].label, "任务列表");
    assert.equal(panel.actions.toolbar[3].options[1].label, "按消息");
    assert.equal(panel.reply.placeholder, "回复所选任务……");
    assert.equal(panel.drawers.labels.statusOverall, "总体");
    assert.equal(panel.drawers.labels.statusBackend, "后端");
    assert.equal(panel.drawers.labels.statusApply, "应用");
  });

  it("keeps the shared main grid mounted when selection is empty", async function () {
    const [child, chat, skills] = await Promise.all([
      readProjectFile("src/sidebar/assistantWorkspaceAcpChild.js"),
      readProjectFile("addon/content/sidebar/acp-chat.html"),
      readProjectFile("addon/content/sidebar/acp-skill-run.html"),
    ]);
    assert.include(child, 'elements.main.classList.remove("hidden")');
    assert.notInclude(
      child,
      'elements.main.classList.toggle("hidden", !owner)',
    );
    for (const html of [chat, skills]) {
      const conversation = html.indexOf('data-role="conversation"');
      const empty = html.indexOf('data-role="empty"');
      const transcript = html.indexOf('data-role="transcript"');
      assert.isAtLeast(conversation, 0);
      assert.isAbove(empty, conversation);
      assert.isAbove(transcript, empty);
    }
  });

  it("routes clicked owners instead of replacing them with the selected owner", async function () {
    const child = await loadWorkspaceChild();
    const chatSelected = owner("acp-chat", "backend-a\nconversation-a");
    const chatTarget = owner("acp-chat", "backend-b\nconversation-b");
    const skillSelected = owner("acp-skills", "run-selected");
    const skillTarget = owner("acp-skills", "run-target");
    const cases = [
      {
        action: "set-active-conversation",
        data: { option: { owner: chatTarget } },
        selected: chatSelected,
        expected: { owner: chatTarget, payload: {} },
      },
      {
        action: "archive-conversation",
        data: { owner: chatTarget },
        selected: chatSelected,
        expected: { owner: chatTarget, payload: {} },
      },
      {
        action: "select-run",
        data: { owner: skillTarget },
        selected: skillSelected,
        expected: { owner: skillTarget, payload: {} },
      },
      {
        action: "archive-run",
        data: { owner: skillTarget },
        selected: skillSelected,
        expected: { owner: skillTarget, payload: {} },
      },
      {
        action: "set-active-backend",
        data: { option: { value: "backend-b" }, value: "backend-b" },
        selected: chatSelected,
        expected: { owner: null, payload: { groupId: "backend-b" } },
      },
      {
        action: "new-conversation",
        data: { groupId: "backend-a" },
        selected: chatSelected,
        expected: { owner: null, payload: { groupId: "backend-a" } },
      },
      {
        action: "connect",
        data: { groupId: "backend-a" },
        selected: chatSelected,
        expected: { owner: null, payload: { groupId: "backend-a" } },
      },
      {
        action: "reply-run",
        data: {
          message: "continue",
          requestId: "wrong-owner",
        },
        selected: skillSelected,
        expected: {
          owner: skillSelected,
          payload: {
            message: "continue",
          },
        },
      },
    ];
    for (const entry of cases) {
      assert.deepEqual(
        child.resolvePanelActionEnvelope(
          entry.action,
          entry.data,
          entry.selected,
          ASSISTANT_WORKSPACE_ACTION_REGISTRY,
        ),
        entry.expected,
        entry.action,
      );
    }
    assert.isNull(
      child.resolvePanelActionEnvelope(
        "new-conversation",
        {},
        chatSelected,
        ASSISTANT_WORKSPACE_ACTION_REGISTRY,
      ),
    );
  });

  it("keeps unchanged task cards identical when only selection moves", async function () {
    const document = new FakeDocument();
    const renderer = await loadPanelRenderer(document);
    const drawer = document.createElement("div");
    const sections = [
      {
        id: "active",
        title: "Active",
        groups: [
          {
            backendId: "backend-a",
            backendDisplayName: "Backend A",
            activeTasks: [
              {
                key: "task-a",
                title: "Task A",
                workflowLabel: "Skill A",
                status: "running",
                selectable: true,
              },
              {
                key: "task-b",
                title: "Task B",
                workflowLabel: "Skill B",
                status: "running",
                selectable: true,
              },
            ],
            finishedTasks: [],
          },
        ],
      },
    ];
    const render = (selectedTaskKey: string) => {
      renderer.renderAssistantContextDrawer(drawer, {
        exact: true,
        drawers: {
          layout: "workspace-task-drawer",
          contextTitle: "Runs",
          selectedTaskKey,
          sections,
        },
      });
      return drawer.querySelectorAll("[data-assistant-task-key]");
    };
    const first = render("task-a");
    const second = render("task-b");
    assert.strictEqual(second[0], first[0]);
    assert.strictEqual(second[1], first[1]);
    assert.notInclude(second[0].className, "is-active");
    assert.include(second[1].className, "is-active");
  });

  it("refreshes drawer structure when title visibility or backend label changes", async function () {
    const document = new FakeDocument();
    const renderer = await loadPanelRenderer(document);
    const drawer = document.createElement("div");
    const section: any = {
      id: "sessions",
      title: "Sessions",
      hideTitle: false,
      groups: [
        {
          backendId: "backend-a",
          backendDisplayName: "Backend A",
          activeTasks: [
            {
              key: "conversation-a",
              title: "Conversation A",
              status: "idle",
              selectable: true,
            },
          ],
          finishedTasks: [],
        },
      ],
    };
    const render = () =>
      renderer.renderAssistantContextDrawer(drawer, {
        exact: true,
        drawers: {
          layout: "workspace-task-drawer",
          contextTitle: "Sessions",
          selectedTaskKey: "conversation-a",
          sections: [section],
        },
      });

    render();
    assert.lengthOf(
      drawer.querySelectorAll(".assistant-workspace-drawer-section-title"),
      1,
    );
    section.hideTitle = true;
    render();
    assert.lengthOf(
      drawer.querySelectorAll(".assistant-workspace-drawer-section-title"),
      0,
    );

    section.groups[0].backendDisplayName = "Backend A Renamed";
    render();
    assert.equal(
      drawer.querySelector(".assistant-workspace-drawer-group-title")
        ?.textContent,
      "Backend A Renamed",
    );
  });

  it("preserves every non-transcript managed region across transcript-only state", async function () {
    const document = new FakeDocument();
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(document);
    const { root, regions } = createPanelManagedRegions(document);
    const state = canonicalState("acp-skills");
    const ui = {
      contextDrawerOpen: false,
      detailsDrawerOpen: false,
      permissionRequestOpen: false,
      replyDraft: "draft",
    };
    state.selection.control = {
      ...state.selection.control,
      status: "waiting_user",
      busy: false,
      hint: { kind: "waiting_user", message: null },
      interaction: {
        inputKind: "choose_one",
        prompt: "Choose the next step",
        hint: "Select one option",
        options: [
          { label: "Continue", value: { mode: "deep" }, description: null },
        ],
        files: [],
        fileReply: {
          supported: true,
          maxFiles: 8,
          maxFileBytes: 32 * 1024 * 1024,
          maxTotalBytes: 64 * 1024 * 1024,
        },
      },
    };
    const render = () => {
      const panel = model.projectAssistantWorkspacePanel(state, ui, {});
      renderer.renderAssistantPanelSnapshot(panel, {
        managed: true,
        root,
        regions,
        onAction() {},
      });
    };
    render();
    assert.equal(
      regions.hint.querySelector(".assistant-panel-interaction-hint")
        ?.textContent,
      "Select one option",
    );
    const regionSubtrees = captureRegionSubtrees(regions);
    state.selection.transcript = {
      ...state.selection.transcript,
      status: "ready",
      transcriptRevision: 1,
      page: {
        pageKey: "request-a\ntail:80",
        startCursor: 0,
        limit: 80,
        totalVisibleItemCount: 1,
        previousCursor: null,
        nextCursor: null,
        sourceEventSeq: 1,
        items: [],
      },
    };
    render();
    assertRegionSubtreesPreserved(regions, regionSubtrees);

    const afterTranscript = captureRegionSubtrees(regions);
    state.selection.control.interaction.hint = "Updated guidance";
    render();
    assert.equal(
      regions.hint.querySelector(".assistant-panel-interaction-hint")
        ?.textContent,
      "Updated guidance",
    );
    const nonHintRegions = Object.fromEntries(
      Object.entries(regions).filter(([key]) => key !== "hint"),
    );
    assertRegionSubtreesPreserved(nonHintRegions, afterTranscript);
  });

  it("updates only the task drawer region when an ACP task status axis changes", async function () {
    const document = new FakeDocument();
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(document);
    const { root, regions } = createPanelManagedRegions(document);
    const state = canonicalState("acp-skills") as any;
    const render = () =>
      renderer.renderAssistantPanelSnapshot(
        model.projectAssistantWorkspacePanel(state, {}, {}),
        { managed: true, root, regions, onAction() {} },
      );

    render();
    const drawerMount = regions.drawer.firstChild;
    const section = regions.drawer.querySelector(
      ".assistant-workspace-drawer-section",
    );
    const group = regions.drawer.querySelector(
      ".assistant-workspace-drawer-group",
    );
    const taskRow = regions.drawer.querySelector("[data-assistant-task-key]");
    const stableRegions = Object.fromEntries(
      Object.entries(regions).filter(([key]) => key !== "drawer"),
    );
    const stableSubtrees = captureRegionSubtrees(stableRegions);

    state.navigation.entries[0].backendStatus = "running";
    render();

    assert.strictEqual(regions.drawer.firstChild, drawerMount);
    assert.strictEqual(
      regions.drawer.querySelector(".assistant-workspace-drawer-section"),
      section,
    );
    assert.strictEqual(
      regions.drawer.querySelector(".assistant-workspace-drawer-group"),
      group,
    );
    assert.notStrictEqual(
      regions.drawer.querySelector("[data-assistant-task-key]"),
      taskRow,
    );
    assertRegionSubtreesPreserved(stableRegions, stableSubtrees);
  });

  it("preserves the selected ACP Skills DOM when background owner publications arrive", async function () {
    const document = new FakeDocument();
    const model = await loadPanelModel();
    const renderer = await loadPanelRenderer(document);
    const child = await loadWorkspaceChild();
    const { root, regions } = createPanelManagedRegions(document);
    let snapshot = canonicalState("acp-skills");
    renderer.renderAssistantPanelSnapshot(
      model.projectAssistantWorkspacePanel(snapshot, {}, {}),
      {
        managed: true,
        root,
        regions,
        onAction() {},
      },
    );
    const regionSubtrees = captureRegionSubtrees(regions);
    const acknowledgements: Array<{ reason: string | null }> = [];
    let renderCalls = 0;
    const client = child.createClient({
      source: "acp-skills",
      getSnapshot: () => snapshot,
      setSnapshot: (next: typeof snapshot) => {
        snapshot = next;
      },
      getOwnerKey: (state: typeof snapshot) => state.selection.owner.ownerKey,
      render: () => {
        renderCalls += 1;
        return { ok: true, renderPath: "incremental", failure: null };
      },
      ack: (
        _publication: unknown,
        _stage: string,
        _outcome: string,
        reason: string | null,
      ) => {
        acknowledgements.push({ reason });
      },
    });
    const backgroundOwner = owner("acp-skills", "request-b");

    client.apply({
      schema: "zotero-agents.assistant-workspace-publication.v1",
      publicationId: "background-permission",
      owner: backgroundOwner,
      publicationKind: "permission",
      publicationForm: "region",
      publicationCause: "steady-state",
      regionRevision: 1,
      deliverySequence: 1,
      payload: { request: null },
    });
    client.apply({
      schema: "zotero-agents.assistant-workspace-publication.v1",
      publicationId: "background-workspace-activity",
      owner: backgroundOwner,
      publicationKind: "transcript",
      publicationForm: "delta",
      publicationCause: "steady-state",
      regionRevision: 1,
      deliverySequence: 2,
      payload: {
        page: {
          pageKey: "request-b\ntail:80",
          startCursor: 0,
          limit: 80,
          totalVisibleItemCount: 1,
          previousCursor: null,
          nextCursor: null,
          sourceEventSeq: 1,
        },
        baseTranscriptRevision: 0,
        transcriptRevision: 1,
        mutations: [],
      },
    });

    assert.equal(renderCalls, 0);
    assert.deepEqual(
      acknowledgements.map((entry) => entry.reason),
      ["old-owner", "old-owner"],
    );
    assertRegionSubtreesPreserved(regions, regionSubtrees);
  });

  it("retries a v1 transcript mutation after a transactional DOM failure", async function () {
    const fixture = JSON.parse(
      await readProjectFile(
        "test/fixtures/assistant-workspace/v1-skills-transcript-mutation.json",
      ),
    );
    const document = new FakeDocument();
    const renderer = await loadTranscriptRenderer(document);
    const transcript = document.createElement("div");
    transcript.failNextInsertBefore = true;

    const render = () =>
      renderer.applyAssistantTranscriptEffectsExact({
        container: transcript,
        effect: fixture.effect,
        affectedItems: fixture.effect.affectedItems,
        virtualized: false,
        ownerKey: fixture.ownerKey,
        page: fixture.page,
        mode: "plain",
        variant: "skillrunner",
        renderMarkdown: (value: string) => value,
      });

    assert.deepEqual(render(), {
      ok: false,
      renderPath: "incremental",
      failure: { stage: "transcript", code: "dom-commit-failed" },
    });
    assert.deepEqual(render(), {
      ok: true,
      renderPath: "incremental",
      failure: null,
    });
    assert.lengthOf(transcript.children, 1);
    assert.equal(
      transcript.children[0].getAttribute("data-assistant-item-id"),
      "assistant-segment-1",
    );
  });

  for (const source of ["acp-chat", "acp-skills"] as const) {
    it(`preserves ${source} historical pages and keyed gaps across terminal tail patches`, async function () {
      const document = new FakeDocument();
      document.transcriptRowHeight = 40;
      const renderer = await loadTranscriptRenderer(document);
      const transcript = document.createElement("div");
      transcript.clientHeight = 10_000;
      const ownerKey =
        source === "acp-chat" ? "backend-a\nconversation-a" : "request-a";
      const message = (index: number, status = "complete") => ({
        itemId: `message-${index}`,
        itemKind: "message",
        role: "assistant",
        status,
        text: `message ${index}`,
        createdAt: "2026-07-16T00:00:00.000Z",
      });
      const page = (
        pageKey: string,
        startCursor: number,
        items: ReturnType<typeof message>[],
        previousCursor: number | null,
        nextCursor: number | null,
        revision: number,
        totalVisibleItemCount = 6,
      ) => ({
        ownerKey,
        pageKey: `${ownerKey}\n${pageKey}`,
        startCursor,
        limit: 2,
        totalVisibleItemCount,
        previousCursor,
        nextCursor,
        sourceEventSeq: revision,
        transcriptRevision: revision,
        items,
      });
      const renderOptions = {
        container: transcript,
        virtualized: true,
        ownerKey,
        pageSize: 2,
        pageCacheLimit: 8,
        renderWindowLimit: 20,
        renderBuffer: 0,
        estimatedRowHeight: 40,
        mode: "plain",
        variant: source === "acp-chat" ? "acp-chat" : "skillrunner",
        renderMarkdown: (value: string) => value,
      };
      const tail = page(
        "tail:2",
        4,
        [message(4), message(5, "streaming")],
        2,
        null,
        1,
      );
      const oldest = page("page:0:2", 0, [message(0), message(1)], null, 2, 2);

      renderer.renderAssistantTranscript({ ...renderOptions, page: tail });
      const loadingBeforeHistory = transcript.children.find((node) =>
        node.classList.contains("assistant-transcript-virtual-loading"),
      );
      assert.isOk(loadingBeforeHistory);
      renderer.renderAssistantTranscript({ ...renderOptions, page: tail });
      assert.strictEqual(
        transcript.children.find((node) =>
          node.classList.contains("assistant-transcript-virtual-loading"),
        ),
        loadingBeforeHistory,
      );
      renderer.renderAssistantTranscript({ ...renderOptions, page: oldest });

      const gapBeforePatch = transcript.children.find(
        (node) =>
          node.getAttribute("data-assistant-virtual-spacer-kind") ===
          "inter-page",
      );
      assert.isOk(gapBeforePatch);
      assert.equal(gapBeforePatch?.style.height, "80px");
      const gapIndex = transcript.children.indexOf(gapBeforePatch!);
      assert.equal(
        transcript.children[gapIndex - 1]?.getAttribute(
          "data-assistant-item-id",
        ),
        "message-1",
      );
      assert.equal(
        transcript.children[gapIndex + 1]?.getAttribute(
          "data-assistant-item-id",
        ),
        "message-4",
      );

      const firstTerminalItem = message(5, "complete");
      firstTerminalItem.text = "terminal one";
      const firstTerminalTail = page(
        "tail:2",
        4,
        [message(4), firstTerminalItem],
        2,
        null,
        3,
      );
      assert.isTrue(
        renderer.applyAssistantTranscriptEffectsExact({
          ...renderOptions,
          page: firstTerminalTail,
          effect: {
            kind: "mutations",
            onSelectedPage: true,
            mutations: [{ op: "patch_item", itemId: "message-5" }],
            affectedItems: [firstTerminalItem],
            pageItems: firstTerminalTail.items,
            evictedItemIds: [],
          },
          affectedItems: [firstTerminalItem],
        }).ok,
      );
      assert.strictEqual(
        transcript.children.find(
          (node) =>
            node.getAttribute("data-assistant-virtual-spacer-kind") ===
            "inter-page",
        ),
        gapBeforePatch,
      );

      const middle = page("page:2:2", 2, [message(2), message(3)], 0, 4, 4);
      renderer.renderAssistantTranscript({ ...renderOptions, page: middle });
      const finalTerminalItem = { ...firstTerminalItem, text: "terminal two" };
      const finalTail = page(
        "tail:2",
        4,
        [message(4), finalTerminalItem],
        2,
        null,
        5,
      );
      assert.isTrue(
        renderer.applyAssistantTranscriptEffectsExact({
          ...renderOptions,
          page: finalTail,
          effect: {
            kind: "mutations",
            onSelectedPage: true,
            mutations: [{ op: "patch_item", itemId: "message-5" }],
            affectedItems: [finalTerminalItem],
            pageItems: finalTail.items,
            evictedItemIds: [],
          },
          affectedItems: [finalTerminalItem],
        }).ok,
      );

      const itemIds = transcript
        .querySelectorAll(":scope > .assistant-transcript-row")
        .map((row) => row.getAttribute("data-assistant-item-id"));
      assert.deepEqual(itemIds, [
        "message-0",
        "message-1",
        "message-2",
        "message-3",
        "message-4",
        "message-5",
      ]);
      assert.equal(new Set(itemIds).size, itemIds.length);
      assert.equal(
        transcript
          .querySelectorAll(":scope > .assistant-transcript-row")
          .at(-1)
          ?.querySelector("[data-assistant-transcript-body]")?.innerHTML,
        "terminal two",
      );

      const overlap = page(
        "page:1:2",
        1,
        [
          { ...message(1), text: "replacement one" },
          { ...message(2), text: "replacement two" },
        ],
        0,
        3,
        6,
      );
      renderer.renderAssistantTranscript({ ...renderOptions, page: overlap });
      const overlapIds = transcript
        .querySelectorAll(":scope > .assistant-transcript-row")
        .map((row) => row.getAttribute("data-assistant-item-id"));
      assert.deepEqual(overlapIds, itemIds);
      assert.equal(new Set(overlapIds).size, overlapIds.length);
      assert.equal(
        transcript
          .querySelectorAll(":scope > .assistant-transcript-row")[1]
          ?.querySelector("[data-assistant-transcript-body]")?.innerHTML,
        "replacement one",
      );
      assert.equal(
        transcript
          .querySelectorAll(":scope > .assistant-transcript-row")[2]
          ?.querySelector("[data-assistant-transcript-body]")?.innerHTML,
        "replacement two",
      );

      const contractedTail = page(
        "tail:2",
        3,
        [message(3), message(4)],
        1,
        null,
        7,
        5,
      );
      renderer.renderAssistantTranscript({
        ...renderOptions,
        page: contractedTail,
      });
      assert.deepEqual(
        transcript
          .querySelectorAll(":scope > .assistant-transcript-row")
          .map((row) => row.getAttribute("data-assistant-item-id")),
        ["message-0", "message-1", "message-2", "message-3", "message-4"],
      );
      assert.equal(
        transcript.children.find(
          (node) =>
            node.getAttribute("data-assistant-virtual-key") ===
            "spacer:edge:bottom",
        )?.style.height,
        "0px",
      );
    });
  }

  it("commits terminal Markdown and measured virtual geometry on the live state", async function () {
    const animationFrames = createAnimationFrameHarness();
    const document = new FakeDocument();
    document.transcriptRowHeight = 88;
    const renderer = await loadTranscriptRenderer(
      document,
      animationFrames.requestAnimationFrame,
    );
    const transcript = document.createElement("div");
    transcript.clientHeight = 400;
    transcript.scrollHeight = 10_000;
    transcript.scrollTop = 9_600;
    const streamingItem = {
      itemId: "assistant-segment-1",
      itemKind: "message",
      role: "assistant",
      status: "streaming",
      text: "long response",
      createdAt: "2026-07-16T00:00:00.000Z",
    };
    const page = {
      ownerKey: "request-a",
      pageKey: "request-a\ntail:80",
      startCursor: 0,
      limit: 80,
      totalVisibleItemCount: 1,
      previousCursor: null,
      nextCursor: null,
      sourceEventSeq: 1,
      transcriptRevision: 1,
      items: [streamingItem],
    };
    const virtualLayouts: Array<{ totalHeight: number }> = [];
    const renderOptions = {
      container: transcript,
      virtualized: true,
      ownerKey: "request-a",
      page,
      mode: "plain",
      variant: "acp-chat",
      renderMarkdown: (value: string) => `<strong>${value}</strong>`,
      onRendered: ({ virtual }: any) => {
        virtualLayouts.push(virtual);
      },
    };
    renderer.renderAssistantTranscript(renderOptions);
    animationFrames.flushAll();

    const row = transcript.querySelector(".assistant-transcript-row");
    assert.isOk(row);
    transcript.setAttribute("data-assistant-transcript-stick", "false");
    transcript.setAttribute("data-assistant-transcript-last-scroll-top", "200");
    transcript.scrollTop = 200;
    document.transcriptRowHeight = 6_000;
    const completeItem = {
      ...streamingItem,
      status: "complete",
      text: "**finished**",
    };
    const completePage = {
      ...page,
      sourceEventSeq: 2,
      transcriptRevision: 2,
      items: [completeItem],
    };
    const result = renderer.applyAssistantTranscriptEffectsExact({
      ...renderOptions,
      page: completePage,
      effect: {
        kind: "mutations",
        onSelectedPage: true,
        mutations: [{ op: "patch_item", itemId: completeItem.itemId }],
        affectedItems: [completeItem],
        pageItems: [completeItem],
        evictedItemIds: [],
      },
      affectedItems: [completeItem],
    });

    assert.isTrue(result.ok);
    assert.strictEqual(
      transcript.querySelector(".assistant-transcript-row"),
      row,
    );
    const body = row?.querySelector("[data-assistant-transcript-body]");
    assert.equal(body?.innerHTML, "<strong>**finished**</strong>");
    assert.equal(animationFrames.pendingCount, 1);

    animationFrames.flushAll();
    assert.equal(animationFrames.pendingCount, 0);
    assert.equal(virtualLayouts.at(-1)?.totalHeight, 6_000);
    assert.equal(transcript.scrollTop, 200);
    assert.strictEqual(
      transcript.querySelector(".assistant-transcript-row"),
      row,
    );

    document.transcriptRowHeight = 7_000;
    const extendedItem = {
      ...completeItem,
      text: "**finished with more output**",
    };
    const extendedPage = {
      ...completePage,
      sourceEventSeq: 3,
      transcriptRevision: 3,
      items: [extendedItem],
    };
    const extendedResult = renderer.applyAssistantTranscriptEffectsExact({
      ...renderOptions,
      page: extendedPage,
      effect: {
        kind: "mutations",
        onSelectedPage: true,
        mutations: [{ op: "patch_item", itemId: extendedItem.itemId }],
        affectedItems: [extendedItem],
        pageItems: [extendedItem],
        evictedItemIds: [],
      },
      affectedItems: [extendedItem],
    });

    assert.isTrue(extendedResult.ok);
    assert.equal(animationFrames.pendingCount, 1);
    animationFrames.flushAll();
    assert.equal(virtualLayouts.at(-1)?.totalHeight, 7_000);
    assert.equal(transcript.scrollTop, 200);
    assert.strictEqual(
      transcript.querySelector(".assistant-transcript-row"),
      row,
    );
  });

  it("renders the tail window without requesting history on a stick-to-bottom first render", async function () {
    const document = new FakeDocument();
    document.transcriptRowHeight = 40;
    const renderer = await loadTranscriptRenderer(document);
    const transcript = document.createElement("div");
    transcript.clientHeight = 100;
    transcript.scrollHeight = 800;
    transcript.setAttribute(
      "data-assistant-transcript-stick-installed",
      "true",
    );
    transcript.setAttribute("data-assistant-transcript-stick", "true");
    const message = (index: number) => ({
      itemId: `message-${index}`,
      itemKind: "message",
      role: "assistant",
      status: "complete",
      text: `message ${index}`,
      createdAt: "2026-07-16T00:00:00.000Z",
    });
    const requestedCursors: number[] = [];
    renderer.renderAssistantTranscript({
      container: transcript,
      virtualized: true,
      ownerKey: "request-a",
      pageSize: 10,
      pageCacheLimit: 4,
      renderWindowLimit: 20,
      renderBuffer: 0,
      estimatedRowHeight: 40,
      mode: "plain",
      variant: "skillrunner",
      renderMarkdown: (value: string) => value,
      onRequestPage: (request: { cursor?: number }) => {
        requestedCursors.push(Number(request && request.cursor));
      },
      page: {
        ownerKey: "request-a",
        pageKey: "request-a\ntail:10",
        startCursor: 10,
        limit: 10,
        totalVisibleItemCount: 20,
        previousCursor: 0,
        nextCursor: null,
        sourceEventSeq: 1,
        transcriptRevision: 1,
        items: Array.from({ length: 10 }, (_unused, index) =>
          message(index + 10),
        ),
      },
    });

    assert.deepEqual(requestedCursors, []);
    assert.isNull(
      transcript.querySelector(".assistant-transcript-virtual-loading"),
    );
    assert.deepEqual(
      transcript
        .querySelectorAll(":scope > .assistant-transcript-row")
        .map((row) => row.getAttribute("data-assistant-item-id")),
      ["message-16", "message-17", "message-18", "message-19"],
    );
  });

  it("syncs the last scroll top after an incremental anchor restore", async function () {
    const animationFrames = createAnimationFrameHarness();
    const document = new FakeDocument();
    document.transcriptRowHeight = 88;
    const renderer = await loadTranscriptRenderer(
      document,
      animationFrames.requestAnimationFrame,
    );
    const transcript = document.createElement("div");
    transcript.clientHeight = 400;
    transcript.scrollHeight = 10_000;
    transcript.scrollTop = 9_600;
    const streamingItem = {
      itemId: "assistant-segment-1",
      itemKind: "message",
      role: "assistant",
      status: "streaming",
      text: "long response",
      createdAt: "2026-07-16T00:00:00.000Z",
    };
    const page = {
      ownerKey: "request-a",
      pageKey: "request-a\ntail:80",
      startCursor: 0,
      limit: 80,
      totalVisibleItemCount: 1,
      previousCursor: null,
      nextCursor: null,
      sourceEventSeq: 1,
      transcriptRevision: 1,
      items: [streamingItem],
    };
    const renderOptions = {
      container: transcript,
      virtualized: true,
      ownerKey: "request-a",
      page,
      mode: "plain",
      variant: "acp-chat",
      renderMarkdown: (value: string) => value,
    };
    renderer.renderAssistantTranscript(renderOptions);
    animationFrames.flushAll();

    transcript.setAttribute("data-assistant-transcript-stick", "false");
    transcript.setAttribute("data-assistant-transcript-last-scroll-top", "150");
    transcript.scrollTop = 200;
    const completeItem = {
      ...streamingItem,
      status: "complete",
      text: "finished",
    };
    const result = renderer.applyAssistantTranscriptEffectsExact({
      ...renderOptions,
      page: {
        ...page,
        sourceEventSeq: 2,
        transcriptRevision: 2,
        items: [completeItem],
      },
      effect: {
        kind: "mutations",
        onSelectedPage: true,
        mutations: [{ op: "patch_item", itemId: completeItem.itemId }],
        affectedItems: [completeItem],
        pageItems: [completeItem],
        evictedItemIds: [],
      },
      affectedItems: [completeItem],
    });

    assert.isTrue(result.ok);
    assert.equal(
      transcript.getAttribute("data-assistant-transcript-last-scroll-top"),
      String(transcript.scrollTop),
    );
    animationFrames.flushAll();
    assert.equal(
      transcript.getAttribute("data-assistant-transcript-last-scroll-top"),
      String(transcript.scrollTop),
    );
  });

  it("coalesces repeated transcript bottom-stick animation frames", async function () {
    const animationFrames = createAnimationFrameHarness();
    const document = new FakeDocument();
    const renderer = await loadTranscriptRenderer(
      document,
      animationFrames.requestAnimationFrame,
    );
    const transcript = document.createElement("div");
    transcript.scrollHeight = 20_000;

    renderer.stickAssistantTranscriptToBottom(transcript);
    renderer.stickAssistantTranscriptToBottom(transcript);
    renderer.stickAssistantTranscriptToBottom(transcript);

    assert.equal(animationFrames.pendingCount, 1);
    animationFrames.flushAll();
    assert.equal(animationFrames.pendingCount, 0);
    assert.equal(transcript.scrollTop, 20_000);
    assert.isNull(
      transcript.getAttribute("data-assistant-transcript-programmatic-scroll"),
    );
  });

  it("honors user scroll-away while transcript bottom-stick work is pending", async function () {
    const animationFrames = createAnimationFrameHarness();
    const document = new FakeDocument();
    const renderer = await loadTranscriptRenderer(
      document,
      animationFrames.requestAnimationFrame,
    );
    const transcript = document.createElement("div");
    transcript.clientHeight = 400;
    transcript.scrollHeight = 20_000;
    transcript.scrollTop = 19_600;
    renderer.installAssistantTranscriptStickiness(transcript, 80);
    renderer.stickAssistantTranscriptToBottom(transcript);

    transcript.scrollTop = 18_000;
    for (const listener of transcript.listeners.get("scroll") || []) {
      listener({ type: "scroll" });
    }

    assert.equal(
      transcript.getAttribute("data-assistant-transcript-stick"),
      "false",
    );
    assert.isNull(
      transcript.getAttribute("data-assistant-transcript-programmatic-scroll"),
    );
    animationFrames.flushAll();
    assert.equal(transcript.scrollTop, 18_000);

    transcript.scrollTop = 19_600;
    for (const listener of transcript.listeners.get("scroll") || []) {
      listener({ type: "scroll" });
    }
    assert.equal(
      transcript.getAttribute("data-assistant-transcript-stick"),
      "true",
    );
  });

  it("drops pending bottom-stick work after owner or follow intent changes", async function () {
    const animationFrames = createAnimationFrameHarness();
    const document = new FakeDocument();
    const renderer = await loadTranscriptRenderer(
      document,
      animationFrames.requestAnimationFrame,
    );
    const transcript = document.createElement("div");
    transcript.scrollHeight = 20_000;
    transcript.setAttribute("data-assistant-transcript-owner-key", "owner-a");
    transcript.setAttribute("data-assistant-transcript-stick", "true");
    renderer.stickAssistantTranscriptToBottom(transcript);

    transcript.setAttribute("data-assistant-transcript-owner-key", "owner-b");
    transcript.setAttribute("data-assistant-transcript-stick", "false");
    transcript.scrollTop = 1_234;
    animationFrames.flushAll();

    assert.equal(transcript.scrollTop, 1_234);
    assert.isNull(
      transcript.getAttribute("data-assistant-transcript-programmatic-scroll"),
    );
  });

  it("includes owner identity in transcript loading and empty signatures", async function () {
    const child = await loadWorkspaceChild();
    assert.equal(
      child.transcriptStateSignature("owner-a", "loading", ""),
      child.transcriptStateSignature("owner-a", "loading", ""),
    );
    assert.notEqual(
      child.transcriptStateSignature("owner-a", "loading", ""),
      child.transcriptStateSignature("owner-b", "loading", ""),
    );
    assert.notEqual(
      child.transcriptStateSignature("owner-a", "empty", ""),
      child.transcriptStateSignature("owner-b", "empty", ""),
    );
  });

  it("preserves local drawers for same-owner navigation and closes them only when the owner changes", async function () {
    const child = await loadWorkspaceChild();
    const ui = {
      contextDrawerOpen: true,
      detailsDrawerOpen: true,
      permissionRequestOpen: true,
      replyDraft: "draft-a",
      replyDraftByOwner: new Map([
        ["request-a", "draft-a"],
        ["request-b", "draft-b"],
      ]),
    };
    assert.isFalse(
      child.applyOwnerNavigationUiTransition(
        ui,
        false,
        owner("acp-skills", "request-a"),
      ),
    );
    assert.deepInclude(ui, {
      contextDrawerOpen: true,
      detailsDrawerOpen: true,
      permissionRequestOpen: true,
      replyDraft: "draft-a",
    });

    assert.isTrue(
      child.applyOwnerNavigationUiTransition(
        ui,
        true,
        owner("acp-skills", "request-b"),
      ),
    );
    assert.deepInclude(ui, {
      contextDrawerOpen: false,
      detailsDrawerOpen: false,
      permissionRequestOpen: false,
      replyDraft: "draft-b",
    });

    ui.contextDrawerOpen = true;
    ui.detailsDrawerOpen = true;
    ui.permissionRequestOpen = true;
    assert.isTrue(child.applyOwnerNavigationUiTransition(ui, true, null));
    assert.deepInclude(ui, {
      contextDrawerOpen: false,
      detailsDrawerOpen: false,
      permissionRequestOpen: false,
      replyDraft: "",
    });
  });

  it("commits canonical state only after render success and preserves bounded failure details", async function () {
    const child = await loadWorkspaceChild();
    const selectedOwner = owner("acp-skills", "request-a");
    const initial = canonicalState("acp-skills");
    const nextPresentation = {
      ...initial.selection.presentation,
      title: "Updated Task",
    };
    const acknowledgements: any[] = [];
    let snapshot = initial;
    let renderAttempts = 0;
    let recoveries = 0;
    const client = child.createClient({
      source: "acp-skills",
      getSnapshot: () => snapshot,
      setSnapshot: (next: any) => {
        snapshot = next;
      },
      getOwnerKey: (state: any) => state.selection.owner.ownerKey,
      render: () => {
        renderAttempts += 1;
        return renderAttempts === 1
          ? {
              ok: false,
              renderPath: "incremental",
              failure: { stage: "transcript", code: "dom-commit-failed" },
            }
          : { ok: true, renderPath: "incremental", failure: null };
      },
      recoverRenderFailure: () => {
        recoveries += 1;
        return true;
      },
      ack: (
        publication: any,
        stage: string,
        outcome: string,
        reason: string | null,
        failure: unknown,
      ) => {
        acknowledgements.push({
          publicationId: publication.publicationId,
          stage,
          outcome,
          reason,
          failure,
        });
      },
    });
    const publication = (publicationId: string, deliverySequence: number) => ({
      schema: "zotero-agents.assistant-workspace-publication.v1",
      publicationId,
      owner: selectedOwner,
      publicationKind: "owner-presentation",
      publicationForm: "region",
      publicationCause: "steady-state",
      regionRevision: 1,
      deliverySequence,
      payload: nextPresentation,
    });

    client.apply(publication("publication-render-fails", 1));
    assert.equal(snapshot.selection.presentation.title, "Task Alpha");
    assert.equal(recoveries, 1);
    assert.deepInclude(acknowledgements[1], {
      publicationId: "publication-render-fails",
      stage: "render-complete",
      outcome: "rejected",
      reason: "render-failed",
      failure: { stage: "transcript", code: "dom-commit-failed" },
    });

    client.apply(publication("publication-render-retry", 2));
    assert.equal(snapshot.selection.presentation.title, "Updated Task");
    assert.deepInclude(acknowledgements[3], {
      publicationId: "publication-render-retry",
      stage: "render-complete",
      outcome: "accepted",
      reason: null,
      failure: null,
    });
  });
});

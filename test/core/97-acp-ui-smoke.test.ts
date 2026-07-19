import { assert } from "chai";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { ASSISTANT_WORKSPACE_ACTION_REGISTRY } from "../../src/modules/assistantWorkspacePublication";
import * as AssistantPanelModel from "../../src/sidebar/assistantPanelModel.js";
import * as AssistantPanelRenderer from "../../src/sidebar/assistantPanelRenderer.js";
import * as AssistantTranscriptRenderer from "../../src/sidebar/assistantTranscriptRenderer.js";
import * as AssistantWorkspaceAcpChild from "../../src/sidebar/assistantWorkspaceAcpChild.js";
import { captureSkillRunnerWorkspaceEnvelope } from "../helpers/skillRunnerWorkspaceSnapshotHarness";

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

class FakeElement {
  parentNode: FakeElement | null = null;
  children: FakeElement[] = [];
  attributes = new Map<string, string>();
  className = "";
  textContent = "";
  disabled = false;
  type = "";
  onclick: ((event: any) => void) | null = null;
  listeners = new Map<string, Array<(event: any) => void>>();
  failNextInsertBefore = false;
  style = { setProperty() {} };
  classList = {
    add: (...names: string[]) => {
      const values = new Set(this.className.split(/\s+/).filter(Boolean));
      names.forEach((name) => values.add(name));
      this.className = [...values].join(" ");
    },
    remove: (...names: string[]) => {
      const values = new Set(this.className.split(/\s+/).filter(Boolean));
      names.forEach((name) => values.delete(name));
      this.className = [...values].join(" ");
    },
    toggle: (name: string, force?: boolean) => {
      const values = new Set(this.className.split(/\s+/).filter(Boolean));
      const enabled = typeof force === "boolean" ? force : !values.has(name);
      if (enabled) values.add(name);
      else values.delete(name);
      this.className = [...values].join(" ");
    },
    contains: (name: string) => this.className.split(/\s+/).includes(name),
  };

  constructor(
    public readonly tagName: string,
    public readonly ownerDocument: FakeDocument,
  ) {}

  get firstChild() {
    return this.children[0] || null;
  }

  get firstElementChild() {
    return this.firstChild;
  }

  appendChild(child: FakeElement) {
    this.detach(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child: FakeElement, before: FakeElement | null) {
    if (this.failNextInsertBefore) {
      this.failNextInsertBefore = false;
      throw new Error("synthetic-dom-failure");
    }
    if (child === before) return child;
    this.detach(child);
    child.parentNode = this;
    const index = before ? this.children.indexOf(before) : -1;
    if (index < 0) this.children.push(child);
    else this.children.splice(index, 0, child);
    return child;
  }

  replaceChild(next: FakeElement, previous: FakeElement) {
    const index = this.children.indexOf(previous);
    if (index < 0) return previous;
    this.detach(next);
    next.parentNode = this;
    previous.parentNode = null;
    this.children[index] = next;
    return previous;
  }

  removeChild(child: FakeElement) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  private detach(child: FakeElement) {
    if (child.parentNode) child.parentNode.removeChild(child);
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name: string) {
    return this.attributes.has(name) ? this.attributes.get(name) || "" : null;
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  addEventListener(type: string, listener: (event: any) => void) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  contains(node: FakeElement): boolean {
    return node === this || this.children.some((child) => child.contains(node));
  }

  querySelector(selector: string) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector: string) {
    const directClass = /^:scope > \.([A-Za-z0-9_-]+)$/.exec(selector);
    if (directClass) {
      return this.children.filter((child) =>
        child.classList.contains(directClass[1]),
      );
    }
    const className = /^\.([A-Za-z0-9_-]+)$/.exec(selector);
    if (className) {
      return this.descendants().filter((child) =>
        child.classList.contains(className[1]),
      );
    }
    const attribute = /^\[([A-Za-z0-9_-]+)\]$/.exec(selector);
    if (attribute) {
      return this.descendants().filter(
        (child) => child.getAttribute(attribute[1]) !== null,
      );
    }
    return [];
  }

  private descendants(): FakeElement[] {
    return this.children.flatMap((child) => [child, ...child.descendants()]);
  }
}

class FakeDocument {
  activeElement: FakeElement | null = null;

  createElement(tagName: string) {
    return new FakeElement(tagName.toUpperCase(), this);
  }

  createElementNS(_namespace: string, tagName: string) {
    return this.createElement(tagName);
  }
}

async function loadPanelRenderer(document: FakeDocument) {
  const context = await loadAssistantRendererContext(document);
  return (context.window as any).AssistantPanelRenderer;
}

async function loadTranscriptRenderer(document: FakeDocument) {
  const context = await loadAssistantRendererContext(document);
  return (context.window as any).AssistantTranscriptRenderer;
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

// Mocha runs every suite in a single process. The sidebar renderer modules
// read the bare `document` global at render time (and `window` for raf when
// present), so each renderer loader installs the fake document plus a
// synchronous raf shim before returning the module namespaces. The
// suite-level after hook restores the previous global state so nothing leaks
// into other suites.
let rendererGlobalDescriptors:
  | Partial<Record<"document" | "window", PropertyDescriptor | undefined>>
  | undefined;

function installRendererGlobals(document: FakeDocument) {
  const runtime = globalThis as Record<string, unknown>;
  if (!rendererGlobalDescriptors) {
    rendererGlobalDescriptors = {
      document: Object.getOwnPropertyDescriptor(runtime, "document"),
      window: Object.getOwnPropertyDescriptor(runtime, "window"),
    };
  }
  runtime.document = document;
  runtime.window = {
    requestAnimationFrame(callback: () => void) {
      callback();
      return 0;
    },
  };
}

function restoreRendererGlobals() {
  if (!rendererGlobalDescriptors) return;
  const runtime = globalThis as Record<string, unknown>;
  for (const key of ["document", "window"] as const) {
    const descriptor = rendererGlobalDescriptors[key];
    if (descriptor) {
      Object.defineProperty(runtime, key, descriptor);
    } else {
      delete runtime[key];
    }
  }
  rendererGlobalDescriptors = undefined;
}

async function loadAssistantRendererContext(document: FakeDocument) {
  installRendererGlobals(document);
  return {
    window: {
      AssistantPanelRenderer,
      AssistantTranscriptRenderer,
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
    restoreRendererGlobals();
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

  for (const source of ["acp-chat", "acp-skills"] as const) {
    it(`keeps ${source} empty chrome resident and unavailable`, async function () {
      const model = await loadPanelModel();
      const panel = model.projectAssistantWorkspacePanel(
        emptyWorkspaceState(source),
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

  it("keeps Skills workflow, backend, and apply status axes independent", async function () {
    const model = await loadPanelModel();
    const state = canonicalState("acp-skills");
    state.navigation.entries[0].status = "waiting_user";
    state.navigation.entries[0].backendStatus = null;
    state.navigation.entries[0].applyState = "pending";
    const panel = model.projectAssistantWorkspacePanel(
      state,
      { executionDisplayMode: "live" },
      {},
    );
    const task = panel.drawers.sections[0].groups[0].activeTasks[0];
    assert.equal(task.mainStatus, "waiting_user");
    assert.equal(task.mainStatusLabel, "Waiting");
    assert.equal(task.backendStatus, "");
    assert.isFalse(task.showBackendStatusBadge);
    assert.equal(task.applyStatus, "pending");
    assert.isTrue(task.showApplyStatusBadge);
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
        action: "reply-run",
        data: { message: "continue", requestId: "wrong-owner" },
        selected: skillSelected,
        expected: {
          owner: skillSelected,
          payload: { message: "continue" },
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

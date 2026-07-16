import { assert } from "chai";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "../..");

async function readProjectFile(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function loadPanelModel() {
  const code = await readProjectFile(
    "addon/content/shared/assistant/assistant-panel-model.js",
  );
  const context = { window: {} as Record<string, unknown> };
  vm.runInNewContext(code, context);
  return (context.window as any).AssistantPanelModel;
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
  const transcriptCode = await readProjectFile(
    "addon/content/shared/assistant/assistant-transcript-renderer.js",
  );
  const rendererCode = await readProjectFile(
    "addon/content/shared/assistant/assistant-panel-renderer.js",
  );
  const context = {
    window: {
      requestAnimationFrame(callback: () => void) {
        callback();
        return 0;
      },
    },
    document,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transcriptCode, context);
  vm.runInNewContext(rendererCode, context);
  return (context.window as any).AssistantPanelRenderer;
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
        {
          serviceId: "zotero-mcp",
          label: "Zotero MCP",
          status: "stopped",
          available: false,
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
        message: null,
        connection: {
          status: "connected",
          sessionAvailable: true,
          connected: true,
          canConnect: false,
          canDisconnect: true,
        },
        execution: { canCancel: true, canInterrupt: true },
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
        reply: { status: "enabled", hint: null },
        runtimeOptions: {
          mode: { selectedOptionId: null, options: [] },
          model: { selectedOptionId: null, options: [] },
          reasoningEffort: { selectedOptionId: null, options: [] },
        },
      },
      presentation: {
        title: source === "acp-chat" ? "Research session" : "Task Alpha",
        subtitle: source === "acp-chat" ? "Agent A" : "Skill Alpha",
        description: null,
        metadata: [
          { itemId: "workflow", label: "Workflow", value: "Literature" },
        ],
        banner: {
          status: "running",
          message: null,
          usage: [{ itemId: "usage", label: "Usage", value: "4/10" }],
          connection: [],
          recovery: [],
          workspace: [
            { itemId: "workspace", label: "Workspace", value: "/tmp/run" },
          ],
          details: [],
          diagnostics: [
            { action: "copy-diagnostics", label: "Copy diagnostics" },
          ],
        },
        context: [],
        details: [],
        tasks: [],
      },
    },
  };
}

describe("Assistant Workspace ACP UI v5", function () {
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
      assert.include(
        html,
        "../shared/assistant/assistant-workspace-acp-child.js",
      );
      assert.include(
        html,
        "../shared/assistant/assistant-workspace-acp-child.css",
      );
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
    const [child, shell] = await Promise.all([
      readProjectFile(
        "addon/content/shared/assistant/assistant-workspace-acp-child.js",
      ),
      readProjectFile("addon/content/sidebar/assistant-workspace.js"),
    ]);
    assert.include(
      child,
      'const BRIDGE_KEY = "__zsAssistantWorkspaceAcpBridge"',
    );
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
      {},
    );
    assert.isTrue(panel.exact);
    assert.equal(panel.context.title, "Research session");
    assert.deepEqual(
      panel.context.selectors.map((selector: any) => selector.id),
      ["backend", "owner"],
    );
    assert.deepEqual(
      panel.context.indicators.map((indicator: any) => indicator.label),
      ["Host Bridge", "Zotero MCP", "Usage", "Workspace"],
    );
    assert.equal(
      panel.context.selectors[1].options[0].label,
      "Research session",
    );
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
});

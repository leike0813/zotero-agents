import { assert } from "chai";

function isRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: {
      __parity?: {
        runtime?: string;
      };
    };
  };
  return !!runtime.Zotero && runtime.Zotero.__parity?.runtime !== "node-mock";
}

const dynamicImport = new Function("specifier", "return import(specifier)") as <
  T = any,
>(
  specifier: string,
) => Promise<T>;

async function readProjectFile(relativePath: string) {
  if (isRealZoteroRuntime()) {
    throw new Error("readProjectFile is only available in Node tests");
  }
  const [{ readFile }, path] = await Promise.all([
    dynamicImport<typeof import("fs/promises")>("fs/promises"),
    dynamicImport<typeof import("path")>("path"),
  ]);
  const absolutePath = path.join(process.cwd(), relativePath);
  return readFile(absolutePath, "utf8");
}

async function loadAssistantConversationViewForSmoke() {
  const vm = await dynamicImport<typeof import("vm")>("vm");
  const code = await readProjectFile(
    "addon/content/dashboard/assistant-conversation-view.js",
  );
  const context = {
    window: {},
  };
  vm.runInNewContext(code, context);
  return (context.window as any).AssistantConversationView;
}

async function loadAssistantPanelModelForSmoke(options: any = {}) {
  const vm = await dynamicImport<typeof import("vm")>("vm");
  const code = await readProjectFile(
    "addon/content/dashboard/assistant-panel-model.js",
  );
  const context = {
    window: {
      AssistantConversationView: options.conversationView || {
        projectAcpChatConversationView: (source: any = {}) => ({
          items: [],
          plan: { entries: [], activeEntries: [], active: false },
          interaction:
            source.busy === true || source.status === "prompting"
              ? { kind: "running", message: "Agent is working..." }
              : { kind: "hidden" },
          usage: source.usage || null,
        }),
        projectAcpSkillRunConversationView: (source: any = {}) => ({
          items: [],
          plan: { entries: [], activeEntries: [], active: false },
          interaction: { kind: "hidden" },
          usage: source.usage || null,
        }),
      },
    },
  };
  vm.runInNewContext(code, context);
  return (context.window as any).AssistantPanelModel;
}

async function loadAssistantPanelRendererForSmoke(document: any) {
  const vm = await dynamicImport<typeof import("vm")>("vm");
  const code = await readProjectFile(
    "addon/content/dashboard/assistant-panel-renderer.js",
  );
  const context = {
    window: {},
    document,
  };
  vm.runInNewContext(code, context);
  return (context.window as any).AssistantPanelRenderer;
}

function createFakeDocumentForAssistantPanel() {
  const documentRef: any = {
    activeElement: null,
    createElement(tag: string) {
      return new FakeElement(tag, documentRef);
    },
    createElementNS(_namespace: string, tag: string) {
      return new FakeElement(tag, documentRef);
    },
  };

  class FakeElement {
    tagName: string;
    ownerDocument: any;
    parentNode: FakeElement | null = null;
    children: FakeElement[] = [];
    attributes = new Map<string, string>();
    className = "";
    textContent = "";
    value = "";
    disabled = false;
    selectionStart: number | null = 0;
    selectionEnd: number | null = 0;
    type = "";
    onclick: any = null;
    style = {
      setProperty: (_name: string, _value: string) => undefined,
    };
    classList = {
      add: (...names: string[]) => {
        const current = new Set(this.className.split(/\s+/).filter(Boolean));
        names.forEach((name) => current.add(name));
        this.className = Array.from(current).join(" ");
      },
      remove: (...names: string[]) => {
        const current = new Set(this.className.split(/\s+/).filter(Boolean));
        names.forEach((name) => current.delete(name));
        this.className = Array.from(current).join(" ");
      },
      toggle: (name: string, force?: boolean) => {
        const current = new Set(this.className.split(/\s+/).filter(Boolean));
        const shouldAdd =
          typeof force === "boolean" ? force : !current.has(name);
        if (shouldAdd) current.add(name);
        else current.delete(name);
        this.className = Array.from(current).join(" ");
      },
      contains: (name: string) => this.className.split(/\s+/).includes(name),
    };

    constructor(tagName: string, ownerDocument: any) {
      this.tagName = tagName.toUpperCase();
      this.ownerDocument = ownerDocument;
    }

    get firstChild() {
      return this.children[0] || null;
    }

    appendChild(child: FakeElement) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }

    removeChild(child: FakeElement) {
      this.children = this.children.filter((entry) => entry !== child);
      child.parentNode = null;
      return child;
    }

    setAttribute(name: string, value: string) {
      this.attributes.set(name, String(value));
    }

    getAttribute(name: string) {
      return this.attributes.has(name) ? this.attributes.get(name) || "" : null;
    }

    addEventListener(_type: string, _handler: any) {
      // Event behavior is not needed for this focused renderer smoke.
    }

    focus() {
      this.ownerDocument.activeElement = this;
    }

    setSelectionRange(start: number, end: number) {
      this.selectionStart = start;
      this.selectionEnd = end;
    }

    contains(target: FakeElement) {
      if (target === this) return true;
      return this.children.some((child) => child.contains(target));
    }

    querySelector(selector: string): FakeElement | null {
      return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector: string): FakeElement[] {
      const directClass = selector.match(/^:scope > \.([A-Za-z0-9_-]+)$/);
      if (directClass) {
        return this.children.filter((child) =>
          child.className.split(/\s+/).includes(directClass[1]),
        );
      }
      const classMatch = selector.match(/^\.([A-Za-z0-9_-]+)$/);
      if (classMatch) {
        return this.descendants().filter((child) =>
          child.className.split(/\s+/).includes(classMatch[1]),
        );
      }
      const attrMatch = selector.match(/^\[([A-Za-z0-9_-]+)\]$/);
      if (attrMatch) {
        return this.descendants().filter(
          (child) => child.getAttribute(attrMatch[1]) !== null,
        );
      }
      return [];
    }

    private descendants(): FakeElement[] {
      return this.children.flatMap((child) => [child, ...child.descendants()]);
    }
  }

  return documentRef;
}

describe("acp ui smoke", function () {
  beforeEach(function () {
    if (isRealZoteroRuntime()) {
      this.skip();
    }
  });

  it("renders ACP Chat through the managed Assistant panel runtime", async function () {
    const html = await readProjectFile("addon/content/dashboard/acp-chat.html");
    const js = await readProjectFile("addon/content/dashboard/acp-chat.js");
    const css = await readProjectFile("addon/content/dashboard/acp-chat.css");

    assert.include(html, 'id="acp-chat-toolbar"');
    assert.include(html, 'id="acp-chat-banner"');
    assert.include(html, 'id="acp-chat-drawer"');
    assert.include(html, 'id="acp-chat-main"');
    assert.include(html, 'id="acp-chat-conversation-window"');
    assert.include(html, 'id="acp-transcript"');
    assert.include(html, 'id="acp-chat-mode-plain"');
    assert.include(html, 'id="acp-chat-mode-bubble"');
    assert.include(html, 'id="acp-chat-plan-panel"');
    assert.include(html, 'id="acp-chat-interaction"');
    assert.include(html, 'id="acp-chat-reply"');
    assert.include(html, 'id="acp-chat-details"');
    assert.include(html, "./vendor/katex/katex.min.css");
    assert.include(html, "./vendor/katex/katex.min.js");
    assert.include(html, "./vendor/markdown-it/markdown-it.min.js");
    assert.include(html, "./vendor/markdown-it-texmath/texmath.min.js");
    assert.notInclude(html, 'id="acp-status-summary"');
    assert.notInclude(html, 'id="acp-mode-select"');
    assert.notInclude(html, 'id="acp-model-select"');
    assert.notInclude(html, 'id="acp-reasoning-select"');
    assert.notInclude(html, 'id="acp-composer-form"');
    assert.notInclude(html, 'id="acp-session-drawer"');
    assert.notInclude(html, 'id="acp-permission-drawer"');
    assert.notInclude(html, 'id="acp-close-btn"');
    assert.include(js, 'type: "acp:action"');
    assert.include(js, "__zsAcpSidebarBridge");
    assert.include(js, "window.wrappedJSObject");
    assert.include(js, 'sendAction("send-prompt"');
    assert.include(js, 'sendAction("new-conversation"');
    assert.include(js, 'sendAction("set-active-conversation"');
    assert.notInclude(js, 'sendAction("delete-conversation"');
    assert.include(js, 'action === "set-mode"');
    assert.include(js, 'action === "set-model"');
    assert.include(js, 'action === "set-reasoning-effort"');
    assert.include(js, 'action === "set-active-backend"');
    assert.include(js, "sendAction(action, data)");
    assert.include(js, "transcriptNodeMap");
    assert.include(js, "toolActivityExpandedIds");
    assert.include(js, "sessionDrawerOpen");
    assert.include(js, "detailsDrawerOpen");
    assert.include(js, "renderer.renderAssistantPanelSnapshot");
    assert.include(js, "reply: true");
    assert.notInclude(js, "function renderPickers");
    assert.notInclude(js, "function renderSessionDrawer");
    assert.notInclude(js, "function renderInteractionZone");
    assert.notInclude(js, "function renderPlanPanel");
    assert.notInclude(js, "function renderStatusDetails");
    assert.notInclude(js, "function renderDiagnostics");
    assert.include(js, "sendAction(action, data)");
    assert.include(js, "markdownParser");
    assert.include(js, "function ensureMarkdownParser()");
    assert.include(js, "function renderMarkdown(text)");
    assert.include(js, "html: false");
    assert.include(js, "breaks: true");
    assert.include(js, "linkify: false");
    assert.include(js, "highlight: null");
    assert.include(js, 'delimiters: "dollars"');
    assert.include(js, "state.toolActivityExpandedIds.has(id)");
    assert.include(js, "resolveSidebarActionBridge");
    assert.include(js, "target.postMessage");
    assert.include(html, 'class="acp-chat-shell asst-panel-shell"');
    assert.notInclude(css, "position: fixed;");
    assert.notInclude(css, "inset: 0;");
    assert.notInclude(css, "grid-template-rows: auto auto minmax(0, 1fr);");
    assert.notInclude(
      css,
      "grid-template-rows: minmax(0, 1fr) auto auto auto;",
    );
    assert.notInclude(css, ".acp-chat-toolbar {\n  display: flex;");
    assert.notInclude(css, ".acp-interaction-notices {");
    assert.notInclude(css, ".acp-plan-panel {");
    assert.include(css, ".acp-transcript");
    assert.notInclude(css, ".acp-message");
    assert.notInclude(css, ".acp-tool-led");
    assert.notInclude(css, ".acp-tool-kind-badge");
    assert.notInclude(css, ".acp-diagnostics-panel {");
    assert.notInclude(css, "\n.btn {");
    assert.notInclude(css, ".acp-picker");
  });

  it("projects SkillRunner tool-like process messages as shared tool transcript items", async function () {
    const model = await loadAssistantPanelModelForSmoke();
    const panel = model.projectSkillRunnerPanelSnapshot({
      session: {
        id: "run-tool-projection",
        title: "Tool Projection",
        status: "running",
        messages: [
          {
            seq: 1,
            kind: "assistant_process",
            role: "assistant",
            text: "Planning the next step",
            correlation: { process_type: "reasoning" },
          },
          {
            seq: 2,
            kind: "assistant_process",
            role: "assistant",
            text: "Calling Zotero lookup",
            correlation: {
              process_type: "tool_call",
              tool_name: "read",
              status: "completed",
              details: { path: "artifact/todo_memo.md" },
            },
          },
          {
            seq: 3,
            kind: "assistant_process",
            role: "assistant",
            text: "Running local command",
            correlation: {
              process_type: "command_execution",
              tool_name: "glob",
              details: { pattern: "**/*.md" },
            },
          },
          {
            seq: 4,
            kind: "assistant_process",
            role: "assistant",
            text: "Fallback display text",
            correlation: {
              process_type: "tool_call",
              details: { name: "search" },
            },
          },
        ],
      },
    });

    const items = panel.conversation.items;
    assert.lengthOf(items, 4);
    assert.equal(items[0].kind, "process");
    assert.equal(items[1].kind, "tool");
    assert.equal(items[1].toolName, "read");
    assert.include(items[1].inputSummary, "artifact/todo_memo.md");
    assert.equal(items[1].state, "completed");
    assert.equal(items[2].kind, "tool");
    assert.equal(items[2].toolName, "glob");
    assert.include(items[2].inputSummary, "**/*.md");
    assert.equal(items[2].state, "completed");
    assert.equal(items[3].toolName, "search");
    assert.equal(items[3].summary, "Fallback display text");
    assert.notEqual(items[3].toolName, "Tool Call");
    assert.notInclude(items[0].text, "Tool Call:");
  });

  it("projects SkillRunner pending permissions as shared permission interactions", async function () {
    const model = await loadAssistantPanelModelForSmoke();
    const panel = model.projectSkillRunnerPanelSnapshot({
      session: {
        requestId: "skillrunner-run-1",
        status: "running",
        pendingPermission: {
          requestId: "permission-1",
          sessionId: "host-bridge",
          toolCallId: "permission-1",
          toolTitle: "Run Zotero write",
          source: "host-bridge-cli",
          summary: "SkillRunner requests Zotero write access",
          requestedAt: "2026-06-17T00:00:00.000Z",
          options: [
            {
              optionId: "approve_once",
              kind: "allow_once",
              name: "Approve once",
            },
            {
              optionId: "deny",
              kind: "reject",
              name: "Deny",
            },
          ],
        },
      },
    });

    assert.equal(panel.interaction.kind, "permission");
    assert.equal(panel.interaction.permission.requestId, "permission-1");
    assert.deepInclude(panel.interaction.actions[0].payload, {
      requestId: "skillrunner-run-1",
      permissionRequestId: "permission-1",
      outcome: "selected",
      optionId: "approve_once",
    });
    assert.isFalse(panel.reply.enabled);
    assert.isFalse(panel.reply.inputEnabled);
  });

  it("exposes copy-friendly assistant transcript and reply history affordances", async function () {
    const transcriptRendererJs = await readProjectFile(
      "addon/content/dashboard/assistant-transcript-renderer.js",
    );
    const panelRendererJs = await readProjectFile(
      "addon/content/dashboard/assistant-panel-renderer.js",
    );
    const sharedPanelCss = await readProjectFile(
      "addon/content/dashboard/assistant-panel-shared.css",
    );

    assert.include(transcriptRendererJs, "function decorateMarkdownCodeBlocks");
    assert.include(transcriptRendererJs, 'querySelectorAll("pre > code")');
    assert.include(
      transcriptRendererJs,
      'copyTextToClipboard(code.textContent || "")',
    );
    assert.include(transcriptRendererJs, "assistant-code-copy-button");
    assert.include(
      transcriptRendererJs,
      "decorateMarkdownCodeBlocks(body, options);",
    );
    assert.include(transcriptRendererJs, "decorateMarkdownCodeBlocks,");
    assert.include(transcriptRendererJs, "copyTextToClipboard,");
    assert.include(
      transcriptRendererJs,
      "function assistantToolCommandTooltip",
    );
    assert.include(transcriptRendererJs, "function setAssistantTooltip");
    assert.include(transcriptRendererJs, "node.title = value");
    assert.include(
      transcriptRendererJs,
      'node.setAttribute("aria-label", value)',
    );
    assert.include(transcriptRendererJs, "setAssistantTooltip(badge, tooltip)");
    assert.include(
      transcriptRendererJs,
      "setAssistantTooltip(summaryNode, tooltip)",
    );
    assert.include(transcriptRendererJs, "function toolActivityTooltipText");
    assert.include(transcriptRendererJs, ".map(assistantToolCommandTooltip)");
    assert.include(transcriptRendererJs, 'join("\\n")');

    assert.include(panelRendererJs, "replyHistoryByKey");
    assert.include(panelRendererJs, "replyHistoryLimit = 50");
    assert.include(panelRendererJs, "function navigateReplyHistory");
    assert.include(panelRendererJs, 'event.key === "ArrowUp"');
    assert.include(panelRendererJs, 'event.key === "ArrowDown"');
    assert.include(panelRendererJs, "isCaretOnFirstTextareaLine(input)");
    assert.include(panelRendererJs, "isCaretOnLastTextareaLine(input)");
    assert.include(panelRendererJs, "state.draft = input.value");
    assert.include(
      panelRendererJs,
      "rememberReplyHistory(historyKey, input.value)",
    );

    assert.include(sharedPanelCss, "user-select: text;");
    assert.include(sharedPanelCss, ".assistant-transcript-markdown-body pre");
    assert.include(
      sharedPanelCss,
      ".assistant-panel-permission-drawer-command",
    );
    assert.include(sharedPanelCss, ".assistant-panel-details-value");
    assert.include(sharedPanelCss, ".asst-code-surface");
    assert.include(sharedPanelCss, ".assistant-code-copy-button");
    assert.include(
      sharedPanelCss,
      '.assistant-code-copy-button[data-assistant-copy-state="copied"]',
    );
    assert.include(sharedPanelCss, "pre.assistant-code-block-with-copy");
  });

  it("projects governed details drawers without backend actions or raw SkillRunner history", async function () {
    const model = await loadAssistantPanelModelForSmoke();
    const acpChat = model.projectAcpChatPanelSnapshot({
      labels: { manageBackends: "Manage", copyDiagnostics: "Copy Diagnostics" },
      agentWorkspaceDir: "D:/tmp/acp-workspace",
      diagnostics: [{ kind: "info", message: "ready" }],
      chatSessions: [],
    });
    const toolbarActions = acpChat.actions.toolbar.map(
      (entry: any) => entry.action,
    );
    const detailActions = acpChat.actions.details.map(
      (entry: any) => entry.action,
    );
    assert.include(toolbarActions, "open-backend-manager");
    assert.notInclude(detailActions, "open-backend-manager");
    assert.include(detailActions, "copy-diagnostics");
    assert.include(detailActions, "open-workspace");
    const acpChatWorkspaceAction = acpChat.actions.details.find(
      (entry: any) => entry.action === "open-workspace",
    );
    assert.isTrue(acpChatWorkspaceAction.enabled);
    assert.deepEqual(acpChatWorkspaceAction.payload, {
      workspaceDir: "D:/tmp/acp-workspace",
    });
    assert.isTrue(
      acpChat.drawers.details.some(
        (section: any) =>
          section.kind === "diagnostics" &&
          section.collapsible === true &&
          section.defaultCollapsed === true,
      ),
    );

    const skillRunner = model.projectSkillRunnerPanelSnapshot({
      session: {
        requestId: "req-details",
        title: "Digest run",
        status: "succeeded",
        backendTitle: "Local",
        engine: "skillrunner",
        model: "gpt-test",
        updatedAt: "2026-05-08T00:00:00Z",
        messages: [
          { kind: "assistant_message", text: "normal message" },
          { kind: "assistant_revision", text: "candidate" },
        ],
      },
      workspace: { selectedTaskKey: "task-1" },
    });
    const titles = skillRunner.drawers.details.map(
      (section: any) => section.title,
    );
    assert.include(titles, "Run");
    assert.include(titles, "Conversation Summary");
    assert.include(titles, "Revision Summary");
    assert.notInclude(titles, "Raw Snapshot");
    assert.notInclude(
      JSON.stringify(skillRunner.drawers.details),
      "normal message",
    );
    assert.include(
      skillRunner.actions.toolbar.map((entry: any) => entry.action),
      "open-backend-manager",
    );
    assert.include(
      skillRunner.actions.details.map((entry: any) => entry.action),
      "copy-request-id",
    );

    const acpSkill = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: { requestId: "skill-details", status: "running" },
    });
    assert.include(
      acpSkill.actions.toolbar.map((entry: any) => entry.action),
      "open-backend-manager",
    );
  });

  it("adds dashboard entry points and hook wiring for opening the ACP sidebar", async function () {
    const dialog = await readProjectFile("src/modules/taskManagerDialog.ts");
    const app = await readProjectFile("addon/content/dashboard/app.js");
    const hooks = await readProjectFile("src/hooks.ts");
    const assistantHtml = await readProjectFile(
      "addon/content/dashboard/assistant-workspace.html",
    );
    const assistantJs = await readProjectFile(
      "addon/content/dashboard/assistant-workspace.js",
    );
    const assistantCss = await readProjectFile(
      "addon/content/dashboard/assistant-workspace.css",
    );
    const sharedPanelCss = await readProjectFile(
      "addon/content/dashboard/assistant-panel-shared.css",
    );
    const sharedThemeCss = await readProjectFile(
      "addon/content/shared/theme.css",
    );
    const sharedThemeJs = await readProjectFile(
      "addon/content/shared/theme.js",
    );
    const assistantConversationViewJs = await readProjectFile(
      "addon/content/dashboard/assistant-conversation-view.js",
    );
    const assistantTranscriptRendererJs = await readProjectFile(
      "addon/content/dashboard/assistant-transcript-renderer.js",
    );
    const assistantPanelModelJs = await readProjectFile(
      "addon/content/dashboard/assistant-panel-model.js",
    );
    const assistantPanelRendererJs = await readProjectFile(
      "addon/content/dashboard/assistant-panel-renderer.js",
    );
    const assistantSidebar = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );
    const acpChatHtml = await readProjectFile(
      "addon/content/dashboard/acp-chat.html",
    );
    const acpChatJs = await readProjectFile(
      "addon/content/dashboard/acp-chat.js",
    );
    const acpChatCss = await readProjectFile(
      "addon/content/dashboard/acp-chat.css",
    );
    const acpSkillRunHtml = await readProjectFile(
      "addon/content/dashboard/acp-skill-run.html",
    );
    const acpSkillRunJs = await readProjectFile(
      "addon/content/dashboard/acp-skill-run.js",
    );
    const acpSkillRunCss = await readProjectFile(
      "addon/content/dashboard/acp-skill-run.css",
    );
    const runDialogHtml = await readProjectFile(
      "addon/content/dashboard/run-dialog.html",
    );
    const runDialogJs = await readProjectFile(
      "addon/content/dashboard/run-dialog.js",
    );
    const runDialogCss = await readProjectFile(
      "addon/content/dashboard/run-dialog.css",
    );
    const acpSkillRunStore = await readProjectFile(
      "src/modules/acpSkillRunStore.ts",
    );
    const acpSkillRunner = await readProjectFile(
      "src/modules/acpSkillRunnerOrchestrator.ts",
    );
    const sidebarModel = await readProjectFile(
      "src/modules/acpSidebarModel.ts",
    );
    const sidebarTypes = await readProjectFile("src/modules/acpTypes.ts");
    const sharedHost = await readProjectFile(
      "src/modules/sidebarBrowserHost.ts",
    );
    const workspaceTab = await readProjectFile("src/modules/workspaceTab.ts");

    assert.notInclude(dialog, "open-acp-sidebar");
    assert.include(dialog, "open-acp-skill-runs");
    assert.include(dialog, "DOMParser");
    assert.notInclude(dialog, "javascript:[^");
    assert.include(dialog, "openAssistantWorkspaceSidebar");
    assert.include(dialog, "buildAcpSkillRunPanelSnapshot");
    assert.include(dialog, "listAcpSkillRuns");
    assert.include(dialog, "mergeAcpBackendTaskRows");
    assert.include(dialog, "!run.removedAt && !run.archivedAt");
    assert.include(dialog, "taskMergeKey");
    assert.include(dialog, "subscribeAcpSkillRunSnapshots");
    assert.include(dialog, "isAcpSkillRunnerTask");
    assert.notInclude(dialog, "homeAcpEntry");
    assert.notInclude(dialog, "homeAcpSkillRunsEntry");
    assert.notInclude(app, "homeAcpEntry");
    assert.notInclude(app, "homeAcpSkillRunsEntry");
    assert.notInclude(app, 'sendAction("open-acp-sidebar"');
    assert.include(app, 'sendAction("open-acp-skill-runs"');
    assert.include(app, "function labelText(labels, key, fallback)");
    assert.include(app, 'labelText(labels, "tabProducts")');
    assert.include(app, '"productsEmpty"');
    assert.include(app, "renderAcpSkillRunnerBackend");
    assert.include(app, "row.requestKind");
    assert.include(app, 'snapshot.backendView.backendType === "acp"');
    assert.include(hooks, "installAssistantWorkspaceSidebarShell");
    assert.include(hooks, "removeAssistantWorkspaceSidebarShell");
    assert.include(hooks, "openAssistantWorkspaceSidebar");
    assert.include(hooks, "toggleAssistantWorkspaceSidebar");
    assert.include(workspaceTab, "isAssistantWorkspaceSidebarOpen");
    assert.include(
      workspaceTab,
      "const reopenAssistantSidebar = isAssistantWorkspaceSidebarOpen",
    );
    assert.include(workspaceTab, 'target: "reader"');
    assert.notInclude(hooks, "installAcpSidebarShell(win)");
    assert.notInclude(hooks, "installAcpSkillRunnerSidebarShell(win)");
    assert.include(assistantHtml, "assistant-tab-skillrunner");
    assert.include(assistantHtml, "assistant-tab-acp-chat");
    assert.include(assistantHtml, "assistant-tab-acp-skills");
    assert.isBelow(
      assistantHtml.indexOf("assistant-tab-acp-chat"),
      assistantHtml.indexOf("assistant-tab-acp-skills"),
      "ACP Chat tab should appear before ACP Skills",
    );
    assert.isBelow(
      assistantHtml.indexOf("assistant-tab-acp-skills"),
      assistantHtml.indexOf("assistant-tab-skillrunner"),
      "ACP Skills tab should appear before SkillRunner",
    );
    assert.include(assistantHtml, "assistant-frame-skillrunner");
    assert.include(assistantHtml, "assistant-frame-acp-chat");
    assert.include(assistantHtml, "assistant-frame-acp-skills");
    assert.isBelow(
      assistantHtml.indexOf("assistant-frame-acp-chat"),
      assistantHtml.indexOf("assistant-frame-acp-skills"),
      "ACP Chat frame should appear before ACP Skills",
    );
    assert.isBelow(
      assistantHtml.indexOf("assistant-frame-acp-skills"),
      assistantHtml.indexOf("assistant-frame-skillrunner"),
      "ACP Skills frame should appear before SkillRunner",
    );
    assert.include(assistantHtml, "assistant-workspace-tabbar");
    assert.include(assistantHtml, "../shared/theme.js");
    assert.include(assistantHtml, "../shared/theme.css");
    assert.include(sharedThemeCss, "--zs-selection-bg: rgba(37, 99, 235, 0.26);");
    assert.include(sharedThemeCss, "--zs-selection-text: var(--zs-text);");
    assert.include(sharedThemeCss, "background: var(--zs-selection-bg);");
    assert.include(sharedThemeCss, "::-moz-selection");
    assert.include(assistantHtml, 'src="./run-dialog.html"');
    assert.notInclude(assistantHtml, "assistant-workspace-title");
    assert.notInclude(assistantHtml, "assistant-workspace-subtitle");
    assert.include(assistantHtml, "assistant-workspace-close");
    assert.include(assistantJs, "assistant-workspace:child-action");
    assert.include(
      assistantJs,
      'const tabs = ["acp-chat", "acp-skills", "skillrunner"]',
    );
    assert.include(assistantJs, "__zsAssistantWorkspaceBridge");
    assert.include(assistantJs, "function hostBridge()");
    assert.include(assistantJs, "direct.postMessage(type, payload || {})");
    assert.include(assistantJs, "__zsAcpSidebarBridge");
    assert.include(assistantJs, "__zsAcpSkillRunSidebarBridge");
    assert.include(assistantJs, "__zsSkillRunnerSidebarBridge");
    assert.include(assistantJs, "latestChildPayloads");
    assert.include(
      assistantJs,
      "function cacheChildPayload(tab, phase, payload)",
    );
    assert.include(
      assistantJs,
      "function normalizeSkillRunnerSidebarPayload(payload)",
    );
    assert.include(
      assistantJs,
      'Object.assign({}, source, { hostMode: "sidebar" })',
    );
    assert.include(assistantJs, "function ensureSkillRunnerSidebarLayout()");
    assert.include(assistantJs, "const normalizedPayload =");
    assert.include(assistantJs, "function normalizeTab(tab, fallback)");
    assert.include(assistantJs, "function closeDrawersForTab(tab)");
    assert.include(
      assistantJs,
      "function closeInactiveChildDrawers(activeTab)",
    );
    assert.include(assistantJs, '"assistant-panel:close-drawers"');
    assert.include(assistantJs, "fallback: state.activeTab");
    assert.include(assistantJs, "actionTrace");
    assert.include(assistantJs, "function traceAction(stage, details)");
    assert.include(assistantJs, "function nextActionId(tab, action)");
    assert.notInclude(
      assistantJs,
      "function installSkillRunnerSidebarLayoutFallback()",
    );
    assert.notInclude(assistantJs, "assistantSkillrunnerLayout");
    assert.include(assistantJs, "function replayCachedChildPayload(tab)");
    assert.include(assistantJs, 'if (tab === "skillrunner" && !cached.init)');
    assert.include(
      assistantJs,
      'cacheChildPayload("skillrunner", "init", payload)',
    );
    assert.include(
      assistantJs,
      'cacheChildPayload("skillrunner", "snapshot", payload)',
    );
    assert.include(assistantJs, 'postToChild("skillrunner", "init", payload)');
    assert.include(
      assistantJs,
      'postToChild("skillrunner", "snapshot", payload)',
    );
    assert.include(
      assistantJs,
      "postToChild(tab, phase, normalizedSnapshot || snapshot)",
    );
    assert.include(assistantJs, "assistant-workspace-close");
    assert.include(assistantCss, ".assistant-workspace-tabbar");
    assert.include(assistantCss, ".assistant-workspace-tabs");
    assert.include(assistantCss, ".assistant-frame");
    assert.include(assistantCss, "min-height: 0");
    assert.include(assistantCss, "width: 100%");
    assert.include(assistantCss, "flex: 1 1 0");
    assert.include(assistantCss, ".assistant-tab.is-active");
    assert.notInclude(assistantCss, "color-scheme: light;");
    assert.notInclude(assistantCss, ".assistant-workspace-title");
    assert.include(assistantCss, ".assistant-workspace-close");
    assert.include(acpChatHtml, "../shared/theme.js");
    assert.include(acpChatHtml, "../shared/theme.css");
    assert.include(acpChatHtml, "../shared/icons.css?ui=20260614-icons-v1");
    assert.include(acpChatHtml, "./assistant-panel-shared.css");
    assert.include(acpChatJs, '"assistant-panel:close-drawers"');
    assert.include(acpChatJs, "function closeAllDrawers()");
    assert.include(acpSkillRunJs, '"assistant-panel:close-drawers"');
    assert.include(acpSkillRunJs, "function closeAllDrawers()");
    assert.include(runDialogJs, '"assistant-panel:close-drawers"');
    assert.include(runDialogJs, "function closeAllDrawers()");
    assert.include(acpSkillRunHtml, "./assistant-panel-shared.css");
    assert.include(acpSkillRunHtml, "../shared/theme.js");
    assert.include(acpSkillRunHtml, "../shared/theme.css");
    assert.include(acpSkillRunHtml, "../shared/icons.css?ui=20260614-icons-v1");
    assert.include(runDialogHtml, "./assistant-panel-shared.css");
    assert.include(runDialogHtml, "../shared/theme.js");
    assert.include(runDialogHtml, "../shared/theme.css");
    assert.include(runDialogHtml, "../shared/icons.css?ui=20260614-icons-v1");
    assert.notInclude(acpChatCss, "color-scheme: light;");
    assert.notInclude(acpSkillRunCss, "color-scheme: light;");
    assert.notInclude(runDialogCss, "color-scheme: light;");
    assert.isBelow(
      acpChatHtml.indexOf("./assistant-panel-shared.css"),
      acpChatHtml.indexOf("./acp-chat.css"),
      "ACP Chat should load shared foundation before page CSS",
    );
    assert.isBelow(
      acpSkillRunHtml.indexOf("./assistant-panel-shared.css"),
      acpSkillRunHtml.indexOf("./acp-skill-run.css"),
      "ACP Skills should load shared foundation before page CSS",
    );
    assert.include(runDialogHtml, "./run-dialog.css");
    assert.isBelow(
      runDialogHtml.indexOf("./assistant-panel-shared.css"),
      runDialogHtml.indexOf("./run-dialog.css"),
      "SkillRunner should load shared foundation before page CSS",
    );
    assert.include(sharedPanelCss, "--asst-bg");
    assert.include(sharedPanelCss, "--asst-bg: var(--zs-bg)");
    assert.include(sharedPanelCss, "--asst-surface");
    assert.include(sharedPanelCss, "--asst-surface: var(--zs-panel)");
    assert.include(sharedPanelCss, "--asst-accent");
    assert.include(sharedPanelCss, ':root[data-zs-theme="dark"]');
    assert.include(sharedThemeCss, "--zs-bg-gradient");
    assert.include(sharedThemeCss, ':root[data-zs-theme="dark"]');
    assert.include(sharedThemeCss, "@media (prefers-color-scheme: dark)");
    assert.include(sharedThemeJs, "ZoteroSkillsTheme");
    assert.include(sharedThemeJs, "zotero-skills.theme");
    assert.include(sharedPanelCss, "@keyframes asst-spin");
    assert.include(sharedPanelCss, "@keyframes asst-pulse");
    assert.include(sharedPanelCss, ".asst-shell-toolbar");
    assert.include(sharedPanelCss, ".asst-panel-shell");
    assert.include(sharedPanelCss, ".asst-panel-main");
    assert.include(
      sharedPanelCss,
      "grid-template-rows: auto auto minmax(0, 1fr);",
    );
    assert.include(
      sharedPanelCss,
      "grid-template-rows: minmax(0, 1fr) auto auto auto;",
    );
    assert.include(
      sharedPanelCss,
      ".asst-shell-toolbar .assistant-panel-managed-view",
    );
    assert.include(sharedPanelCss, "border-radius: var(--asst-radius-md);");
    assert.include(sharedPanelCss, "box-shadow: var(--asst-shadow-subtle);");
    assert.include(sharedPanelCss, ".asst-context-selector");
    assert.include(sharedPanelCss, ".asst-context-actions");
    assert.include(sharedPanelCss, ".asst-conversation-surface");
    assert.include(
      sharedPanelCss,
      ".asst-banner .assistant-panel-managed-view",
    );
    assert.include(sharedPanelCss, ".asst-conversation-overlay-menu");
    assert.include(sharedPanelCss, ".asst-hint-surface");
    assert.include(sharedPanelCss, ".asst-reply-surface");
    assert.include(sharedPanelCss, ".asst-led");
    assert.include(sharedPanelCss, ".asst-spinner");
    assert.include(sharedPanelCss, ".asst-code-surface");
    assert.include(sharedPanelCss, ".asst-drawer-panel");
    assert.include(sharedPanelCss, ".asst-panel-drawer-overlay");
    assert.include(sharedPanelCss, ".asst-panel-details-overlay");
    assert.include(sharedPanelCss, ".asst-empty-state");
    assert.include(sharedPanelCss, "--asst-context-drawer-width");
    assert.include(sharedPanelCss, "--asst-details-drawer-width");
    assert.include(sharedPanelCss, ".assistant-panel-root");
    assert.include(sharedPanelCss, ".assistant-panel-toolbar");
    assert.include(sharedPanelCss, ".assistant-panel-banner");
    assert.include(sharedPanelCss, ".assistant-panel-conversation");
    assert.include(sharedPanelCss, ".assistant-panel-plan");
    assert.include(sharedPanelCss, "max-height: min(18vh, 140px);");
    assert.include(sharedPanelCss, ".assistant-panel-hint");
    assert.include(sharedPanelCss, ".assistant-panel-reply");
    assert.include(sharedPanelCss, ".assistant-panel-context-drawer");
    assert.include(sharedPanelCss, ".assistant-transcript");
    assert.include(sharedPanelCss, ".assistant-transcript-row");
    assert.include(sharedPanelCss, ".assistant-transcript-meta");
    assert.include(sharedPanelCss, ".assistant-transcript-body");
    assert.include(sharedPanelCss, ".assistant-transcript-tool-led");
    assert.include(sharedPanelCss, ".assistant-transcript-revision-badge");
    assert.include(sharedPanelCss, ".assistant-transcript-markdown-body p");
    assert.include(sharedPanelCss, "margin: 0 0 0.35em;");
    assert.include(
      sharedPanelCss,
      ".assistant-transcript.plain-mode .assistant-transcript-row",
    );
    assert.include(
      sharedPanelCss,
      ".assistant-transcript.bubble-mode .assistant-transcript-row",
    );
    assert.include(
      sharedPanelCss,
      ".assistant-transcript.plain-mode .assistant-transcript-row.is-tool",
    );
    assert.include(
      sharedPanelCss,
      ".assistant-transcript.plain-mode .assistant-transcript-row.is-workspace-activity",
    );
    assert.include(
      sharedPanelCss,
      ".assistant-transcript.plain-mode .assistant-transcript-row.is-tool .assistant-transcript-meta",
    );
    assert.include(
      sharedPanelCss,
      ".assistant-transcript.plain-mode .assistant-transcript-row.is-workspace-activity .assistant-transcript-meta",
    );
    assert.include(sharedPanelCss, "border-left-width: 0;");
    assert.include(sharedPanelCss, "display: none;");
    assert.include(
      sharedPanelCss,
      ".assistant-transcript-workspace-file-icon::before",
    );
    assert.include(
      sharedPanelCss,
      ".assistant-transcript-workspace-file-icon::after",
    );
    assert.include(sharedPanelCss, ".assistant-transcript-workspace-badge");
    assert.include(
      assistantTranscriptRendererJs,
      "assistant-transcript-workspace-badge",
    );
    assert.include(
      assistantTranscriptRendererJs,
      'transcriptLabel(options, "workspaceActivity")',
    );
    assert.notInclude(
      assistantTranscriptRendererJs,
      'assistant-transcript-workspace-file-icon", "▣"',
    );
    assert.notInclude(sharedPanelCss, ".acp-");
    assert.notInclude(sharedPanelCss, ".workspace-");
    assert.notInclude(sharedPanelCss, ".btn");
    assert.include(acpChatHtml, "acp-chat-banner");
    assert.include(acpChatHtml, "asst-panel-main");
    assert.include(acpChatHtml, "asst-panel-drawer-overlay");
    assert.include(acpChatHtml, "asst-panel-details-overlay");
    assert.notInclude(acpChatHtml, "asst-context-selector");
    assert.notInclude(acpChatHtml, "asst-context-actions");
    assert.include(acpChatHtml, "acp-conversation-window");
    assert.include(acpChatHtml, "acp-conversation-overlay-menu");
    assert.include(acpChatHtml, "./assistant-conversation-view.js");
    assert.include(acpChatHtml, "./assistant-transcript-renderer.js");
    assert.include(acpChatHtml, "./assistant-panel-model.js");
    assert.include(acpChatHtml, "./assistant-panel-renderer.js");
    assert.isBelow(
      acpChatHtml.indexOf("./assistant-conversation-view.js"),
      acpChatHtml.indexOf("./assistant-transcript-renderer.js"),
      "ACP Chat should load conversation view before transcript renderer",
    );
    assert.isBelow(
      acpChatHtml.indexOf("./assistant-transcript-renderer.js"),
      acpChatHtml.indexOf("./assistant-panel-model.js"),
      "ACP Chat should load transcript renderer before panel model",
    );
    assert.isBelow(
      acpChatHtml.indexOf("./assistant-panel-model.js"),
      acpChatHtml.indexOf("./assistant-panel-renderer.js"),
      "ACP Chat should load panel model before panel renderer",
    );
    assert.isBelow(
      acpChatHtml.indexOf("./assistant-panel-renderer.js"),
      acpChatHtml.indexOf("./acp-chat.js"),
      "ACP Chat should load shared panel renderer before page JS",
    );
    assert.include(acpSkillRunHtml, "./assistant-conversation-view.js");
    assert.include(acpSkillRunHtml, "./assistant-transcript-renderer.js");
    assert.include(acpSkillRunHtml, "./assistant-panel-model.js");
    assert.include(acpSkillRunHtml, "./assistant-panel-renderer.js");
    assert.isBelow(
      acpSkillRunHtml.indexOf("./assistant-conversation-view.js"),
      acpSkillRunHtml.indexOf("./assistant-transcript-renderer.js"),
      "ACP Skills should load conversation view before transcript renderer",
    );
    assert.isBelow(
      acpSkillRunHtml.indexOf("./assistant-transcript-renderer.js"),
      acpSkillRunHtml.indexOf("./assistant-panel-model.js"),
      "ACP Skills should load transcript renderer before panel model",
    );
    assert.isBelow(
      acpSkillRunHtml.indexOf("./assistant-panel-model.js"),
      acpSkillRunHtml.indexOf("./assistant-panel-renderer.js"),
      "ACP Skills should load panel model before panel renderer",
    );
    assert.isBelow(
      acpSkillRunHtml.indexOf("./assistant-panel-renderer.js"),
      acpSkillRunHtml.indexOf("./acp-skill-run.js"),
      "ACP Skills should load shared panel renderer before page JS",
    );
    assert.include(runDialogHtml, "./assistant-conversation-view.js");
    assert.include(runDialogHtml, "./assistant-transcript-renderer.js");
    assert.include(runDialogHtml, "./assistant-panel-model.js");
    assert.include(runDialogHtml, "./assistant-panel-renderer.js");
    assert.isBelow(
      runDialogHtml.indexOf("./assistant-panel-renderer.js"),
      runDialogHtml.indexOf("./run-dialog.js"),
      "SkillRunner should load shared panel renderer before page JS",
    );
    assert.include(
      assistantConversationViewJs,
      "window.AssistantConversationView",
    );
    assert.include(
      assistantConversationViewJs,
      "projectAcpChatConversationView",
    );
    assert.include(
      assistantConversationViewJs,
      "projectAcpSkillRunConversationView",
    );
    assert.include(assistantConversationViewJs, "normalizeAssistantPlanEntry");
    assert.include(assistantConversationViewJs, "normalizeAssistantToolItem");
    assert.include(assistantConversationViewJs, "resolveAssistantInteraction");
    assert.include(assistantConversationViewJs, 'kind: "process"');
    assert.include(assistantConversationViewJs, 'kind: "tool"');
    assert.include(
      assistantTranscriptRendererJs,
      "window.AssistantTranscriptRenderer",
    );
    assert.include(assistantTranscriptRendererJs, "renderAssistantTranscript");
    assert.include(
      assistantTranscriptRendererJs,
      "renderAssistantTranscriptItem",
    );
    assert.include(
      assistantTranscriptRendererJs,
      "isAssistantTranscriptNearBottom",
    );
    assert.include(assistantTranscriptRendererJs, "buildTranscriptRenderItems");
    assert.include(
      assistantTranscriptRendererJs,
      "assistant-transcript-revision-badge",
    );
    assert.include(assistantTranscriptRendererJs, "tool_activity_group");
    assert.include(assistantTranscriptRendererJs, "stableToolActivityGroupKey");
    assert.include(assistantTranscriptRendererJs, '"aria-expanded"');
    assert.include(
      assistantTranscriptRendererJs,
      "assistant-transcript-tool-activity-summary",
    );
    assert.include(assistantTranscriptRendererJs, "assistant-transcript-row");
    assert.include(assistantTranscriptRendererJs, "data-assistant-panel-kind");
    assert.include(
      assistantTranscriptRendererJs,
      "function transcriptLabel(options, key, fallback)",
    );
    assert.include(assistantTranscriptRendererJs, "data-assistant-item-kind");
    assert.include(assistantTranscriptRendererJs, "data-assistant-role");
    assert.notInclude(assistantTranscriptRendererJs, "acp-message");
    assert.notInclude(assistantTranscriptRendererJs, "transcript-row kind-");
    assert.include(assistantPanelModelJs, "window.AssistantPanelModel");
    assert.include(assistantPanelModelJs, "AssistantPanelKind");
    assert.include(assistantPanelModelJs, "normalizeAssistantPanelSnapshot");
    assert.include(assistantPanelModelJs, "projectAcpChatPanelSnapshot");
    assert.include(assistantPanelModelJs, "projectAcpSkillRunPanelSnapshot");
    assert.include(assistantPanelModelJs, "projectSkillRunnerPanelSnapshot");
    assert.include(assistantPanelModelJs, "mapAssistantPanelAction");
    assert.include(assistantPanelModelJs, "contextSelector");
    assert.include(assistantPanelModelJs, "contextAction");
    assert.include(assistantPanelModelJs, "buildSessionPickerOptions");
    assert.include(assistantPanelModelJs, "SESSION_PICKER_SHOW_MORE_VALUE");
    assert.include(
      assistantPanelModelJs,
      "function labelFrom(source, path, fallback)",
    );
    assert.include(assistantPanelModelJs, "labels: snap.labels || {}");
    assert.include(assistantPanelRendererJs, "window.AssistantPanelRenderer");
    assert.include(
      assistantPanelRendererJs,
      "function labelOf(panel, path, fallback)",
    );
    assert.include(
      assistantPanelRendererJs,
      "function withDefaultPanel(source)",
    );
    assert.include(assistantPanelRendererJs, "context: Object.assign");
    assert.include(assistantPanelRendererJs, "reply: Object.assign");
    assert.include(assistantPanelRendererJs, "drawers: Object.assign");
    assert.include(assistantPanelRendererJs, "actions: Object.assign");
    assert.include(assistantPanelRendererJs, "renderAssistantPanelSnapshot");
    assert.include(assistantPanelRendererJs, "renderToolbar");
    assert.include(assistantPanelRendererJs, "renderContextSelectors");
    assert.include(assistantPanelRendererJs, "renderContextActions");
    assert.include(assistantPanelRendererJs, "renderAssistantBanner");
    assert.include(assistantPanelRendererJs, "renderBannerIndicators");
    assert.include(assistantPanelRendererJs, "assistant-panel-indicator");
    assert.include(assistantPanelRendererJs, "renderAssistantPlan");
    assert.include(
      assistantPanelRendererJs,
      'completedCount + "/" + totalCount',
    );
    assert.include(assistantPanelRendererJs, "assistant-panel-plan-spinner");
    assert.include(
      assistantPanelRendererJs,
      "function isAssistantPlanWorking(panel)",
    );
    assert.include(
      assistantPanelRendererJs,
      'container.setAttribute("data-assistant-plan-working"',
    );
    assert.include(
      assistantPanelRendererJs,
      'toneClass === "is-running" && planWorking',
    );
    assert.include(
      sharedPanelCss,
      '.assistant-panel-plan[data-assistant-plan-working="false"] .assistant-panel-plan-spinner',
    );
    assert.include(
      assistantPanelRendererJs,
      'toneClass === "is-completed" ? "✓" : "•"',
    );
    assert.include(assistantPanelRendererJs, "renderAssistantHint");
    assert.include(
      assistantPanelRendererJs,
      "assistant-panel-permission-summary",
    );
    assert.include(
      assistantPanelRendererJs,
      'labelOf(panel, "permission.viewFullRequest", "View details")',
    );
    assert.include(assistantPanelRendererJs, "open-permission-request");
    assert.include(assistantPanelRendererJs, "buildPermissionRequestDto");
    assert.notInclude(
      assistantPanelRendererJs,
      "assistant-panel-permission-detail-code",
    );
    assert.include(assistantPanelRendererJs, "renderAssistantReply");
    assert.include(
      assistantPanelRendererJs,
      "function replyStructuralSignature",
    );
    assert.include(
      assistantPanelRendererJs,
      "function updateAssistantReplyLiveFields",
    );
    assert.include(
      assistantPanelRendererJs,
      "data-assistant-reply-structure-signature",
    );
    assert.notInclude(assistantPanelRendererJs, "reply: panel.reply,");
    assert.include(assistantPanelRendererJs, "renderPermissionRequestDrawer");
    assert.include(
      assistantPanelRendererJs,
      "assistant-panel-permission-drawer-overlay",
    );
    assert.include(assistantPanelRendererJs, "close-permission-request");
    assert.include(assistantPanelRendererJs, "renderUsageGauge");
    assert.include(assistantPanelRendererJs, "assistant-panel-usage-gauge");
    assert.include(assistantPanelRendererJs, "assistant-panel-usage-ring");
    assert.include(assistantPanelRendererJs, "assistant-panel-usage-label");
    assert.include(
      assistantPanelRendererJs,
      'label.setAttribute("data-assistant-selector-id"',
    );
    assert.include(assistantPanelRendererJs, "renderReplyZone");
    assert.include(assistantPanelRendererJs, "renderAssistantContextDrawer");
    assert.include(assistantPanelRendererJs, "renderDetailsDrawer");
    assert.include(assistantPanelRendererJs, "function installOverlayDismiss");
    assert.include(
      assistantPanelRendererJs,
      'installOverlayDismiss(container, "close-context-drawer"',
    );
    assert.include(
      assistantPanelRendererJs,
      'installOverlayDismiss(container, "close-details-drawer"',
    );
    assert.include(assistantPanelRendererJs, "panel.contains(target)");
    assert.include(assistantPanelRendererJs, "function renderDetailsSection");
    assert.include(
      assistantPanelRendererJs,
      '"assistant-panel-details-section-summary"',
    );
    assert.include(
      assistantPanelRendererJs,
      '"assistant-panel-details-section-body"',
    );
    assert.include(
      assistantPanelRendererJs,
      "section.defaultCollapsed !== true",
    );
    assert.include(
      assistantPanelRendererJs,
      "entry.title || entry.text || entry.label || entry.content",
    );
    assert.include(
      assistantPanelRendererJs,
      "const payloadKey = safeText(selector.payloadKey)",
    );
    assert.include(
      assistantPanelRendererJs,
      "payload[payloadKey] = select.value",
    );
    assert.include(assistantPanelRendererJs, "managedRegions");
    assert.include(
      assistantPanelRendererJs,
      'markRegion(regions.conversation, "assistant-panel-conversation", "conversation",',
    );
    assert.include(assistantPanelRendererJs, "managed: false");
    assert.include(
      assistantPanelRendererJs,
      'node.classList.remove("is-assistant-managed")',
    );
    assert.include(
      assistantPanelModelJs,
      "function selectorPayloadKey(id, action)",
    );
    assert.include(assistantPanelModelJs, 'return "modeId"');
    assert.include(assistantPanelModelJs, 'return "modelId"');
    assert.include(assistantPanelModelJs, 'return "effortId"');
    assert.include(assistantPanelModelJs, 'return "backendId"');
    assert.include(assistantPanelModelJs, 'return "conversationId"');
    assert.include(
      sharedPanelCss,
      ".assistant-panel-region.is-assistant-managed",
    );
    assert.include(sharedPanelCss, ".assistant-panel-managed-view");
    assert.include(sharedPanelCss, ".assistant-panel-reply-footer");
    assert.include(sharedPanelCss, ".assistant-panel-reply-primary");
    assert.include(sharedPanelCss, ".assistant-panel-permission-summary");
    assert.include(sharedPanelCss, ".assistant-panel-permission-actions");
    assert.include(
      sharedPanelCss,
      ".assistant-panel-permission-view-full-request",
    );
    assert.include(
      sharedPanelCss,
      ".assistant-panel-permission-drawer-overlay",
    );
    assert.include(sharedPanelCss, ".assistant-panel-permission-drawer-panel");
    assert.notInclude(
      sharedPanelCss,
      ".assistant-panel-permission-details summary",
    );
    assert.include(sharedPanelCss, ".assistant-panel-reply-controls");
    assert.include(sharedPanelCss, ".assistant-panel-select:disabled");
    assert.include(sharedPanelCss, 'data-assistant-disabled="true"');
    assert.include(sharedPanelCss, ".assistant-panel-reply-secondary");
    assert.include(sharedPanelCss, ".assistant-panel-usage-gauge");
    assert.include(sharedPanelCss, ".assistant-panel-usage-ring");
    assert.include(sharedPanelCss, ".assistant-panel-usage-label");
    assert.include(sharedPanelCss, "radial-gradient(circle at center");
    assert.include(
      sharedPanelCss,
      ".assistant-panel-usage-gauge.is-unavailable",
    );
    assert.include(sharedPanelCss, ".assistant-panel-indicators");
    assert.include(sharedPanelCss, ".assistant-panel-indicator");
    assert.include(
      sharedPanelCss,
      ".asst-panel-details-overlay .asst-drawer-panel",
    );
    assert.include(sharedPanelCss, "grid-template-rows: auto minmax(0, 1fr);");
    assert.include(sharedPanelCss, ".assistant-panel-details-section-summary");
    assert.include(sharedPanelCss, ".assistant-panel-details-section-body");
    assert.include(
      sharedPanelCss,
      "details.assistant-panel-details-section[open]",
    );
    assert.include(
      sharedPanelCss,
      '.assistant-panel-details-row[data-assistant-details-entry-kind="code"]',
    );
    assert.include(sharedPanelCss, "max-height: min(42vh, 360px);");
    assert.include(sharedPanelCss, "flex-direction: column;");
    assert.include(sharedPanelCss, "overflow: auto;");
    assert.include(sharedPanelCss, "overscroll-behavior: contain;");
    assert.include(sharedPanelCss, ".assistant-panel-details-value");
    assert.include(sharedPanelCss, "white-space: pre-wrap;");
    assert.include(sharedPanelCss, "word-break: break-word;");
    assert.include(sharedPanelCss, "line-height: 1.55;");
    assert.include(sharedPanelCss, "max-height: none;");
    assert.include(
      assistantPanelRendererJs,
      '"div", "asst-code-surface assistant-panel-details-value"',
    );
    assert.include(sharedPanelCss, "background: transparent;");
    assert.include(sharedPanelCss, "box-shadow: none;");
    assert.include(
      assistantPanelRendererJs,
      'const footer = el("div", "assistant-panel-reply-footer")',
    );
    assert.include(
      assistantPanelRendererJs,
      'const primary = el("div", "assistant-panel-reply-primary")',
    );
    assert.include(
      assistantPanelRendererJs,
      'const controls = el("div", "assistant-panel-reply-controls")',
    );
    assert.include(
      assistantPanelRendererJs,
      'const secondary = el("div", "assistant-panel-reply-secondary")',
    );
    assert.include(
      assistantPanelRendererJs,
      "renderUsageGauge(secondary, panel.usage, panel)",
    );
    assert.include(
      assistantPanelRendererJs,
      'labelOf(panel, "usage.unavailable", "N/A")',
    );
    assert.include(
      assistantPanelRendererJs,
      'return String(rounded).replace(/\\.0$/, "") + "k";',
    );
    assert.include(
      assistantPanelRendererJs,
      "source.used || source.totalTokens",
    );
    assert.include(
      assistantPanelRendererJs,
      "source.size || source.contextWindow",
    );
    assert.include(
      assistantPanelRendererJs,
      'const centerLabel = unavailable ? labelOf(panel, "usage.unavailable", "N/A")',
    );
    assert.include(
      assistantPanelRendererJs,
      'ring.appendChild(el("span", "assistant-panel-usage-label", centerLabel));',
    );
    assert.include(
      assistantPanelRendererJs,
      "panel.reply.showUsageGauge === true",
    );
    assert.notInclude(
      assistantPanelRendererJs,
      "renderUsageGauge(actions, panel.usage)",
    );
    assert.notInclude(
      assistantPanelRendererJs,
      "renderUsageGauge(controls, panel.usage)",
    );
    assert.notInclude(sharedPanelCss, ".assistant-panel-reply-actions");
    assert.include(
      sharedPanelCss,
      ".asst-banner .assistant-panel-context-selectors",
    );
    assert.include(sharedPanelCss, ".assistant-panel-reply-footer");
    assert.include(
      sharedPanelCss,
      ".assistant-panel-reply-footer .assistant-panel-selector",
    );
    assert.isBelow(
      assistantPanelRendererJs.indexOf("target.appendChild(input);"),
      assistantPanelRendererJs.indexOf("target.appendChild(footer);"),
      "Managed reply zone should render textarea before footer controls",
    );
    assert.isBelow(
      assistantPanelRendererJs.indexOf("footer.appendChild(primary);"),
      assistantPanelRendererJs.indexOf("footer.appendChild(controls);"),
      "Send/Cancel primary button should be left of managed selectors",
    );
    assert.isBelow(
      assistantPanelRendererJs.indexOf("footer.appendChild(primary);"),
      assistantPanelRendererJs.indexOf("footer.appendChild(secondary);"),
      "Send/Cancel primary button should be left of hint and usage gauge",
    );
    assert.include(assistantPanelModelJs, "showUsageGauge: true");
    assert.include(
      assistantPanelModelJs,
      "conversation.usage || (run && run.usage) || null",
    );
    assert.include(assistantPanelModelJs, 'kind: "acp-skills"');
    assert.include(assistantPanelModelJs, 'hint: "",');
    assert.isBelow(
      acpChatHtml.indexOf('id="acp-transcript"'),
      acpChatHtml.indexOf('id="acp-chat-mode-plain"'),
      "Plain/Bubble controls should be inside the conversation overlay, not the top control bar",
    );
    assert.include(acpChatHtml, "acp-chat-banner asst-banner");
    assert.include(
      acpChatHtml,
      "acp-conversation-window asst-conversation-surface",
    );
    assert.notInclude(acpChatCss, ".acp-chat-banner {");
    assert.notInclude(acpChatCss, ".acp-conversation-window {");
    assert.include(sharedPanelCss, ".asst-conversation-overlay-menu");
    assert.include(acpChatHtml, 'class="asst-button-compact"');
    assert.include(acpChatHtml, 'data-assistant-view-mode="plain"');
    assert.include(acpChatHtml, 'data-assistant-view-mode="bubble"');
    assert.include(acpChatHtml, "zs-icon-subject");
    assert.include(acpChatHtml, "zs-icon-forum");
    assert.include(acpChatHtml, "asst-view-mode-label");
    assert.include(
      sharedPanelCss,
      ".asst-conversation-overlay-menu:not(:hover):not(:focus-within)",
    );
    assert.include(
      sharedPanelCss,
      '.asst-button-compact[aria-pressed="false"]',
    );
    assert.include(sharedPanelCss, ".asst-view-mode-label");
    assert.include(sharedPanelCss, ".asst-view-mode-icon");
    assert.include(sharedPanelCss, "clip-path: inset(50%);");
    assert.notInclude(sharedPanelCss, 'data-assistant-view-mode="plain"');
    assert.notInclude(sharedPanelCss, 'data-assistant-view-mode="bubble"');
    assert.notInclude(
      sharedPanelCss,
      "linear-gradient(currentColor, currentColor) 0 1px / 15px 2px no-repeat",
    );
    assert.notInclude(sharedPanelCss, "transform: translate(-62%, -62%);");
    assert.notInclude(sharedPanelCss, "transform: translate(-38%, -38%);");
    assert.notInclude(
      acpChatCss,
      ".acp-conversation-overlay-menu .asst-button-compact",
    );
    assert.include(acpChatJs, 'const SHOW_MORE_VALUE = "__show_more__"');
    assert.include(acpChatJs, 'option.sentinel === "show-more"');
    assert.include(acpChatJs, 'sendAction("new-conversation",');
    assert.include(acpChatJs, "function projectConversationView(snapshot)");
    assert.include(acpChatJs, "projectAcpChatConversationView(snapshot || {})");
    assert.include(acpChatJs, "const view = projectConversationView(snapshot");
    assert.include(acpChatJs, "assistantTranscriptRenderer()");
    assert.include(acpChatJs, "renderer.renderAssistantTranscript");
    assert.include(acpChatJs, 'variant: "acp-chat"');
    assert.include(acpChatJs, "function assistantPanelModel()");
    assert.include(acpChatJs, "function assistantPanelRenderer()");
    assert.include(acpChatJs, "function projectPanelSnapshot(snapshot)");
    assert.include(acpChatJs, "projectAcpChatPanelSnapshot(snapshot || {})");
    assert.include(acpChatJs, "function renderPanel(snapshot)");
    assert.include(
      acpChatJs,
      "renderer.renderAssistantPanelSnapshot(panelSnapshot",
    );
    assert.include(acpChatJs, "function handlePanelAction(action, payload)");
    assert.include(acpChatJs, "managed: true");
    assert.include(acpChatJs, "managedRegions");
    assert.include(acpChatJs, "toolbar: true");
    assert.include(acpChatJs, "plan: true");
    assert.include(acpChatJs, "hint: true");
    assert.include(acpChatJs, "reply: true");
    assert.include(acpChatJs, "details: true");
    assert.include(acpChatJs, 'action === "set-active-backend"');
    assert.include(acpChatJs, 'action === "set-active-conversation"');
    assert.include(acpChatJs, 'action === "send-prompt"');
    assert.include(acpChatJs, 'action === "set-reasoning-effort"');
    assert.include(acpChatJs, 'sendAction("set-chat-display-mode"');
    assert.notInclude(acpChatHtml, 'id="acp-close-btn"');
    assert.include(assistantPanelModelJs, "buildAcpChatDetails");
    assert.include(assistantPanelModelJs, 'kind: "diagnostics"');
    assert.include(assistantPanelModelJs, "defaultCollapsed: true");
    assert.include(assistantPanelModelJs, "buildAcpPermissionInteraction");
    assert.include(acpSkillRunJs, "function projectAcpSkillRunView(run)");
    assert.include(
      acpSkillRunJs,
      "projectAcpSkillRunConversationView(run || {})",
    );
    assert.include(acpSkillRunJs, "const view = projectAcpSkillRunView(run)");
    assert.include(acpSkillRunJs, "assistantTranscriptRenderer()");
    assert.include(acpSkillRunJs, "renderer.renderAssistantTranscript");
    assert.include(acpSkillRunJs, 'variant: "acp-skill-run"');
    assert.include(acpSkillRunJs, "function assistantPanelModel()");
    assert.include(acpSkillRunJs, "function assistantPanelRenderer()");
    assert.include(
      acpSkillRunJs,
      "function projectAssistantPanelSnapshot(snapshot)",
    );
    assert.include(
      acpSkillRunJs,
      "projectAcpSkillRunPanelSnapshot(snapshot || {})",
    );
    assert.include(
      acpSkillRunJs,
      "function renderAssistantPanelRuntime(snapshot)",
    );
    assert.include(
      acpSkillRunJs,
      "const panelSnapshot = projectAssistantPanelSnapshot(snapshot || {})",
    );
    assert.include(
      acpSkillRunJs,
      "renderer.renderAssistantPanelSnapshot(panelSnapshot",
    );
    assert.include(acpSkillRunJs, 'action === "toggle-drawer-section"');
    assert.include(acpSkillRunJs, "state.drawerCompletedCollapsed");
    assert.include(
      acpSkillRunJs,
      "function handleAssistantPanelAction(action, payload)",
    );
    assert.include(acpSkillRunJs, 'action === "open-backend-manager"');
    assert.include(acpSkillRunJs, "managed: true");
    assert.include(acpSkillRunJs, "managedRegions");
    assert.include(acpSkillRunJs, "toolbar: true");
    assert.include(acpSkillRunJs, "plan: true");
    assert.include(acpSkillRunJs, "hint: true");
    assert.include(acpSkillRunJs, "details: true");
    assert.include(acpSkillRunJs, 'action === "select-run"');
    assert.include(
      acpSkillRunJs,
      'action === "reply" || action === "reply-run"',
    );
    assert.include(acpSkillRunJs, 'action === "connect-run"');
    assert.include(assistantPanelModelJs, "buildAcpSkillDetails");
    assert.notInclude(acpSkillRunJs, "renderBannerMetadata(run);");
    assert.notInclude(acpSkillRunJs, "renderPlan(run);");
    assert.notInclude(acpSkillRunJs, "renderHintWidget(run);");
    assert.notInclude(acpSkillRunJs, "renderReplyComposer(run);");
    assert.notInclude(acpSkillRunJs, "renderDetails(snapshot, run);");
    assert.notInclude(acpSkillRunJs, '} else if (item.kind === "thought")');
    assert.include(runDialogJs, "function assistantPanelModel()");
    assert.include(runDialogJs, "function assistantPanelRenderer()");
    assert.include(
      runDialogJs,
      "function projectAssistantPanelSnapshot(envelope)",
    );
    assert.include(runDialogJs, "projectSkillRunnerPanelSnapshot(source)");
    assert.include(
      runDialogJs,
      "renderer.renderAssistantPanelSnapshot(panelSnapshot",
    );
    assert.include(runDialogJs, 'action === "open-backend-manager"');
    assert.include(
      runDialogJs,
      'action === "copy-request-id" || action === "copy-diagnostics"',
    );
    assert.include(runDialogJs, "managed: true");
    assert.include(runDialogJs, 'variant: "skillrunner"');
    assert.include(runDialogJs, "toolActivityExpandedIds: new Set()");
    assert.include(runDialogJs, "expandedIds: state.toolActivityExpandedIds");
    assert.include(runDialogJs, "onToggleExpanded: function (id)");
    assert.include(runDialogJs, "assistant_revision");
    assert.include(runDialogHtml, 'id="skillrunner-toolbar"');
    assert.include(runDialogHtml, 'id="skillrunner-banner"');
    assert.include(runDialogHtml, 'id="skillrunner-conversation-window"');
    assert.include(runDialogHtml, 'id="skillrunner-hint"');
    assert.include(runDialogHtml, 'id="skillrunner-details"');
    assert.notInclude(runDialogHtml, 'id="prompt-card"');
    assert.notInclude(runDialogHtml, 'id="auth-card"');
    assert.notInclude(runDialogHtml, 'id="reply-composer"');
    assert.notInclude(runDialogJs, "function renderRevisionEntry");
    assert.include(assistantSidebar, "installAssistantWorkspaceSidebarShell");
    assert.include(assistantSidebar, "openAssistantWorkspaceSidebar");
    assert.include(assistantSidebar, "isAssistantWorkspaceSidebarOpen");
    assert.include(assistantSidebar, "__zsAssistantWorkspaceBridge");
    assert.include(assistantSidebar, "function installShellBridge(");
    assert.include(
      assistantSidebar,
      "function handleAssistantWorkspaceMessage(",
    );
    assert.include(assistantSidebar, "AssistantWorkspaceBridgeResult");
    assert.include(assistantSidebar, "logAssistantShellAction");
    assert.include(assistantSidebar, 'component: "assistant-shell"');
    assert.include(
      assistantSidebar,
      "return { ok: false, actionId, error: message }",
    );
    assert.include(assistantSidebar, "clearShellBridge(host.library)");
    assert.include(assistantSidebar, "attachSkillRunnerSidebarHost");
    assert.include(assistantSidebar, "buildDecoratedSkillRunnerSnapshot");
    assert.include(assistantSidebar, "createSkillRunnerHostActionHandler");
    assert.include(assistantSidebar, "selectedIndex > 0");
    assert.include(assistantSidebar, "selectedTabUsesPluginOnlyContextPane");
    assert.include(assistantSidebar, "contextPane.collapsed = true");
    assert.include(assistantSidebar, "drawerOpen: false");
    assert.include(assistantSidebar, "drawerCompletedCollapsed: true");
    assert.include(assistantSidebar, "open: host.drawerOpen");
    assert.include(assistantSidebar, 'action === "close-drawer"');
    assert.include(assistantSidebar, 'action === "toggle-drawer"');
    assert.include(assistantSidebar, 'action === "open-workspace"');
    assert.include(
      assistantSidebar,
      'openFolderInSystemFileManager(String(payload.workspaceDir || "").trim())',
    );
    assert.include(
      assistantSidebar,
      "await startNewAcpConversation({ backendId });",
    );
    assert.include(assistantSidebar, "buildAcpSidebarViewSnapshot");
    assert.include(assistantSidebar, "buildAcpSkillRunPanelSnapshot");
    assert.notInclude(
      assistantSidebar,
      "postShellInit(pane, host.activeTab);\n  postAcpChatSnapshot",
    );
    assert.include(assistantSidebar, "replyAcpSkillRun");
    assert.include(assistantSidebar, "connectAcpSkillRun");
    assert.include(assistantSidebar, "disconnectAcpSkillRun");
    assert.include(assistantSidebar, "endAcpSkillRunSession");
    assert.notInclude(
      assistantSidebar,
      "Interactive ACP skill runs are not enabled yet.",
    );
    assert.include(assistantSidebar, "assistant-workspace.html");
    assert.include(acpSkillRunHtml, "acp-skill-run-drawer");
    assert.include(acpSkillRunHtml, "acp-skill-run-toolbar");
    assert.include(acpSkillRunHtml, "acp-skill-toolbar");
    assert.include(acpSkillRunHtml, "acp-skill-banner");
    assert.include(acpSkillRunHtml, "acp-skill-conversation-window");
    assert.include(acpSkillRunHtml, "acp-skill-plan-region");
    assert.include(acpSkillRunHtml, "acp-skill-hint-region");
    assert.include(acpSkillRunHtml, "acp-skill-reply-zone");
    assert.include(acpSkillRunHtml, "acp-skill-run-transcript");
    assert.include(acpSkillRunHtml, "acp-skill-chat-mode-plain");
    assert.include(acpSkillRunHtml, "acp-skill-chat-mode-bubble");
    assert.include(acpSkillRunHtml, 'data-assistant-view-mode="plain"');
    assert.include(acpSkillRunHtml, 'data-assistant-view-mode="bubble"');
    assert.include(acpSkillRunHtml, "zs-icon-subject");
    assert.include(acpSkillRunHtml, "zs-icon-forum");
    assert.include(acpSkillRunHtml, "asst-conversation-overlay-menu");
    assert.include(acpSkillRunHtml, "acp-skill-run-plan-panel");
    assert.include(acpSkillRunHtml, "acp-skill-run-interaction");
    assert.include(acpSkillRunHtml, "acp-skill-run-details");
    assert.include(acpSkillRunHtml, "acp-skill-run-reply-form");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-title");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-summary");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-banner-meta");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-context-actions");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-plan-list");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-permission");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-permission-actions");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-workspace");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-runner");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-validation");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-deps");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-logs");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-statusbar");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-close-btn");
    assert.notInclude(acpSkillRunHtml, "title-stack");
    assert.notInclude(acpSkillRunHtml, "header-actions");
    assert.notInclude(acpSkillRunHtml, "detail-grid");
    assert.include(acpSkillRunJs, 'type: "acp-skill-run:action"');
    assert.include(acpSkillRunJs, "__zsAcpSkillRunSidebarBridge");
    assert.include(acpSkillRunJs, "renderTranscript");
    assert.include(acpSkillRunJs, "chatDisplayMode");
    assert.include(acpSkillRunJs, 'action === "set-chat-display-mode"');
    assert.include(acpSkillRunJs, "renderChatDisplayMode()");
    assert.include(
      assistantTranscriptRendererJs,
      "function isAssistantTranscriptNearBottom(element, threshold)",
    );
    assert.include(
      assistantTranscriptRendererJs,
      "function installAssistantTranscriptStickiness(container, threshold)",
    );
    assert.include(
      assistantTranscriptRendererJs,
      "function shouldStickAssistantTranscript(container, threshold)",
    );
    assert.include(
      assistantTranscriptRendererJs,
      "function stickAssistantTranscriptToBottom(container)",
    );
    assert.include(
      assistantTranscriptRendererJs,
      "data-assistant-transcript-programmatic-scroll",
    );
    assert.include(
      assistantTranscriptRendererJs,
      "const shouldStick = shouldStickAssistantTranscript",
    );
    assert.include(
      assistantTranscriptRendererJs,
      "if (shouldStick) stickAssistantTranscriptToBottom(container)",
    );
    assert.include(acpChatJs, "renderer.renderAssistantTranscript");
    assert.notInclude(acpSkillRunJs, "function renderPlan");
    assert.notInclude(acpSkillRunJs, "function renderHintWidget");
    assert.notInclude(acpSkillRunJs, "function renderBannerMetadata");
    assert.notInclude(acpSkillRunJs, "function renderContextActions");
    assert.notInclude(acpSkillRunJs, "function renderDetailsActions");
    assert.notInclude(acpSkillRunJs, "function renderReplyComposer");
    assert.notInclude(acpSkillRunJs, "function renderDetails");
    assert.notInclude(acpSkillRunJs, "renderStatusBar");
    assert.notInclude(acpSkillRunJs, '$("acp-skill-run-close-btn")');
    assert.notInclude(acpSkillRunJs, "function renderPendingInteractionBanner");
    assert.notInclude(acpSkillRunJs, "function normalizeUiHintOptions");
    assert.include(acpSkillRunJs, 'sendAction("reply-run"');
    assert.notInclude(
      acpSkillRunJs,
      "(run.pendingInteraction && run.pendingInteraction.message) ||",
    );
    assert.include(acpSkillRunJs, "runDrawerOpen");
    assert.include(acpSkillRunJs, "detailsOpen");
    assert.include(acpChatJs, "permissionRequestDetails");
    assert.include(acpSkillRunJs, "permissionRequestDetails");
    assert.include(acpChatJs, "permissionRequestDrawerOpen");
    assert.include(acpSkillRunJs, "permissionRequestDrawerOpen");
    assert.include(acpChatJs, 'action === "open-permission-request"');
    assert.include(acpSkillRunJs, 'action === "open-permission-request"');
    assert.include(acpChatJs, 'action === "close-permission-request"');
    assert.include(acpSkillRunJs, 'action === "close-permission-request"');
    assert.notInclude(acpChatJs, "permissionRequestDetailsSection");
    assert.notInclude(acpSkillRunJs, "permissionRequestDetailsSection");
    assert.include(acpSkillRunJs, "pendingSelectedRequestId");
    assert.include(acpSkillRunJs, "function applyPendingSelection(snapshot)");
    assert.include(acpSkillRunJs, "state.pendingSelectedRequestId = requestId");
    assert.include(
      acpSkillRunJs,
      "function renderPanelRuntimeFailure(message)",
    );
    assert.include(acpSkillRunJs, "panelRendererFailed");
    assert.include(acpSkillRunJs, "data-assistant-interaction");
    assert.include(acpSkillRunJs, "transcriptNodeMap: new Map()");
    assert.include(acpSkillRunJs, "transcriptOrderKey");
    assert.include(acpSkillRunJs, "transcriptMode");
    assert.include(acpSkillRunJs, "toolActivityExpandedIds");
    assert.include(acpSkillRunJs, "nodeMap: state.transcriptNodeMap");
    assert.include(acpSkillRunJs, "orderKey: state.transcriptOrderKey");
    assert.include(acpSkillRunJs, "modeKey: state.transcriptMode");
    assert.include(acpSkillRunJs, "onRendered: function (result)");
    assert.include(acpSkillRunJs, "resetTranscriptRenderState");
    assert.include(acpSkillRunJs, "function formatTime(value)");
    assert.include(acpSkillRunJs, "formatTime,");
    assert.include(acpSkillRunJs, "ACP Skills transcript renderer failed:");
    assert.include(
      assistantTranscriptRendererJs,
      'typeof options.formatTime === "function"',
    );
    assert.include(acpSkillRunJs, 'sendAction("select-run"');
    assert.include(acpSkillRunJs, 'action === "connect-run"');
    assert.include(acpSkillRunJs, 'action === "disconnect-run"');
    assert.include(acpSkillRunJs, 'action === "cancel-run"');
    assert.include(acpSkillRunJs, 'sendAction("reply-run"');
    assert.notInclude(acpSkillRunJs, "function submitReply()");
    assert.notInclude(acpSkillRunJs, ".requestSubmit()");
    assert.include(assistantPanelModelJs, '"copy-diagnostics"');
    assert.include(assistantPanelModelJs, '"open-backend-manager"');
    assert.include(assistantPanelModelJs, '"copy-request-id"');
    assert.include(acpSkillRunCss, "--asst-context-drawer-width");
    assert.include(acpSkillRunCss, "--asst-details-drawer-width");
    assert.notInclude(
      acpSkillRunCss,
      "grid-template-rows: auto auto minmax(0, 1fr);",
    );
    assert.notInclude(
      acpSkillRunCss,
      "grid-template-rows: minmax(0, 1fr) auto auto auto;",
    );
    assert.notInclude(acpSkillRunCss, ".acp-skill-toolbar {");
    assert.notInclude(
      acpSkillRunCss,
      ".acp-skill-banner .assistant-panel-managed-view",
    );
    assert.notInclude(acpSkillRunCss, ".acp-skill-plan-region {");
    assert.notInclude(acpSkillRunCss, ".acp-skill-hint-region {");
    assert.include(acpSkillRunCss, ".run-transcript");
    assert.notInclude(acpSkillRunCss, ".run-transcript.plain-mode");
    assert.notInclude(acpSkillRunCss, ".run-transcript.bubble-mode");
    assert.notInclude(acpSkillRunCss, ".transcript-row");
    assert.notInclude(acpSkillRunCss, ".assistant-panel-reply-input");
    assert.notInclude(acpSkillRunCss, ".run-drawer .asst-drawer-panel");
    assert.notInclude(acpSkillRunCss, ".details-drawer .asst-drawer-panel");
    assert.notInclude(acpSkillRunCss, ".assistant-panel-context-list");
    assert.notInclude(acpSkillRunCss, ".assistant-panel-details-list");
    assert.notInclude(acpSkillRunCss, ".assistant-panel-context-entry");
    assert.notInclude(acpSkillRunCss, ".empty-state");
    assert.notInclude(acpSkillRunCss, ".acp-skill-run-header");
    assert.notInclude(acpSkillRunCss, ".title-stack");
    assert.notInclude(acpSkillRunCss, ".header-actions");
    assert.notInclude(acpSkillRunCss, ".run-statusbar");
    assert.include(acpSkillRunHtml, "asst-panel-main");
    assert.include(acpSkillRunHtml, "asst-panel-drawer-overlay");
    assert.include(acpSkillRunHtml, "asst-panel-details-overlay");
    assert.include(acpSkillRunHtml, "asst-empty-state");
    assert.notInclude(acpSkillRunCss, ".revision-badge");
    assert.notInclude(acpSkillRunCss, "\n.btn {");
    assert.notInclude(acpSkillRunCss, ".btn.primary");
    assert.notInclude(acpSkillRunCss, ".btn.danger");
    assert.include(assistantSidebar, "buildAcpSkillRunPanelSnapshot");
    assert.include(assistantSidebar, "cancelAcpSkillRun");
    assert.include(assistantSidebar, "replyAcpSkillRun");
    assert.include(assistantSidebar, "connectAcpSkillRun");
    assert.include(assistantSidebar, "disconnectAcpSkillRun");
    assert.include(assistantSidebar, "endAcpSkillRunSession");
    assert.include(assistantSidebar, "resolveAcpSkillRunPermissionRequest");
    assert.include(assistantSidebar, "selectAcpSkillRun");
    assert.include(assistantSidebar, "postAcpSkillRunSnapshot");
    assert.include(assistantSidebar, "subscribeAcpSkillRunSnapshots");
    assert.include(assistantSidebar, '"acp-skills"');
    assert.include(assistantSidebar, "openAssistantWorkspaceSidebar");
    assert.include(assistantSidebar, "installAssistantWorkspaceSidebarShell");
    assert.include(acpSkillRunStore, "AcpSkillRunRecord");
    assert.include(acpSkillRunStore, "AcpSkillRunPanelSnapshot");
    assert.include(acpSkillRunStore, "AcpSkillRunTranscriptItem");
    assert.include(acpSkillRunStore, 'kind: "permission"');
    assert.notInclude(acpSkillRunStore, '"acp-prompt-finished",');
    assert.notInclude(acpSkillRunStore, '"output-validation-succeeded",');
    assert.include(acpSkillRunStore, "recordAcpSkillRunSessionUpdate");
    assert.include(
      acpSkillRunStore,
      "projectAcpSkillRunOutputEnvelopeToTranscript",
    );
    assert.include(acpSkillRunStore, "recordAcpSkillRunOutputRevision");
    assert.include(acpSkillRunStore, "outputRevisions");
    assert.include(acpSkillRunStore, "replacementReason");
    assert.include(acpSkillRunStore, "function replaceLatestAssistantMessage");
    assert.include(acpSkillRunStore, "function formatFinalEnvelopeMarkdown");
    assert.include(acpSkillRunStore, "transcriptItems");
    assert.include(acpSkillRunStore, "planEntries");
    assert.include(acpSkillRunStore, 'const STORE_SCOPE = "skill-runs"');
    assert.notInclude(acpSkillRunStore, "projectedEntries");
    assert.notInclude(acpSkillRunStore, "projectionWarnings");
    assert.include(acpSkillRunStore, "registerAcpSkillRunController");
    assert.include(acpSkillRunStore, "replyAcpSkillRun");
    assert.include(acpSkillRunStore, "connectAcpSkillRun");
    assert.include(acpSkillRunStore, "disconnectAcpSkillRun");
    assert.include(acpSkillRunStore, "endAcpSkillRunSession");
    assert.include(acpSkillRunStore, "markAcpSkillRunApplyResult");
    assert.include(acpSkillRunStore, "conversationState");
    assert.include(acpSkillRunStore, "conversationRecoveryState");
    assert.include(acpSkillRunStore, "reply-submitted");
    assert.include(acpSkillRunStore, "applyResultState");
    assert.notInclude(acpSkillRunHtml, "acp-skill-run-revisions");
    assert.include(assistantPanelModelJs, "Output Revisions");
    assert.include(
      assistantTranscriptRendererJs,
      "assistant-transcript-revision-badge",
    );
    assert.notInclude(acpSkillRunJs, "outputRevisions");
    assert.notInclude(acpChatJs, "outputRevisions");
    assert.include(acpSkillRunStore, "setAcpSkillRunPermissionRequest");
    assert.include(acpSkillRunStore, "resolveAcpSkillRunPermissionRequest");
    assert.include(acpSkillRunner, "recoverAcpSkillRunConversation");
    assert.include(acpSkillRunner, "recordAcpSkillRunOutputRevision");
    assert.include(acpSkillRunner, "resumeSession");
    assert.include(acpSkillRunner, "loadSession");
    assert.include(assistantSidebar, "__zsAssistantWorkspaceBridge");
    assert.include(assistantSidebar, "wrappedJSObject");
    assert.include(assistantSidebar, "installShellBridge");
    assert.include(assistantSidebar, "buildAcpDiagnosticsBundle");
    assert.include(assistantSidebar, "copyText");
    assert.include(assistantSidebar, "schedulePostSnapshot");
    assert.include(assistantSidebar, "postFreshAcpChatSnapshot");
    assert.include(assistantSidebar, "await refreshAcpConversationBackends();");
    assert.include(assistantSidebar, "set-active-backend");
    assert.include(assistantSidebar, "archive-conversation");
    assert.include(assistantSidebar, '"connect"');
    assert.include(assistantSidebar, '"disconnect"');
    assert.include(
      assistantSidebar,
      "await startNewAcpConversation({ backendId });",
    );
    assert.include(assistantSidebar, "set-reasoning-effort");
    assert.include(assistantSidebar, "open-backend-manager");
    assert.include(assistantSidebar, 'action === "open-workspace"');
    assert.include(assistantSidebar, "openFolderInSystemFileManager");
    assert.include(assistantSidebar, "set-chat-display-mode");
    assert.include(assistantSidebar, "toggle-status-details");
    assert.include(
      assistantSidebar,
      'postShellMessage(pane, "assistant-workspace:child-snapshot"',
    );
    assert.include(sidebarModel, "chatDisplayMode");
    assert.include(sidebarModel, "statusExpanded");
    assert.include(sidebarModel, "agentWorkspaceDir");
    assert.include(sidebarModel, "conversationStorageDir");
    assert.include(sidebarModel, "sessionCwd");
    assert.include(
      assistantPanelModelJs,
      'metadataItem(labelFrom(snap, "fields.workspace", labels.workspace || "Workspace"), snap.agentWorkspaceDir || snap.sessionCwd, "workspace")',
    );
    assert.include(
      assistantPanelModelJs,
      'detailEntry(labelFrom(snap, "fields.workspace", labels.workspace || "Workspace"), snap.agentWorkspaceDir || snap.sessionCwd)',
    );
    assert.notInclude(
      assistantPanelModelJs,
      'detailEntry(labels.sessionCwd || "Session cwd", snap.sessionCwd)',
    );
    assert.notInclude(
      assistantPanelModelJs,
      'detailEntry(labels.runtime || "Runtime", snap.runtimeDir)',
    );
    assert.notInclude(
      assistantPanelModelJs,
      'metadataItem("Workspace", snap.workspaceDir, "workspace")',
    );
    assert.notInclude(
      assistantPanelModelJs,
      'detailEntry(labels.workspace || "Workspace", snap.workspaceDir)',
    );
    assert.notInclude(
      assistantPanelModelJs,
      'metadataItem("Workspace", snap.sessionCwd || snap.workspaceDir',
    );
    assert.notInclude(
      assistantPanelModelJs,
      'detailEntry(labels.workspace || "Workspace", snap.sessionCwd || snap.workspaceDir)',
    );
    assert.include(sidebarModel, "commandLine");
    assert.include(sidebarModel, "stderrTail");
    assert.include(sidebarModel, "lastLifecycleEvent");
    assert.include(sidebarModel, "remoteSessionId");
    assert.include(sidebarModel, "remoteSessionRestoreStatus");
    assert.include(sidebarModel, "backendChatSessions");
    assert.include(sidebarTypes, "sessionCwd: string");
    assert.include(sidebarTypes, "remoteSessionId: string");
    assert.include(sidebarTypes, "remoteSessionRestoreStatus");
    assert.include(sidebarTypes, "commandLine: string");
    assert.include(sidebarTypes, "reasoningEffortOptions");
    assert.include(sidebarTypes, "archivedAt?: string");
    assert.include(sidebarTypes, "AcpBackendChatSessions");
    assert.include(sidebarTypes, "stderrTail: string");
    assert.include(sidebarTypes, "lastLifecycleEvent: string");
    assert.include(sidebarTypes, 'AcpChatDisplayMode = "plain" | "bubble"');
    assert.include(sidebarTypes, "AcpDiagnosticsBundle");
    assert.include(sidebarTypes, "mcpServer?:");
    assert.include(sidebarTypes, "mcpHealth?:");
    assert.include(sidebarTypes, "AcpMcpHealthSnapshot");
    assert.include(sidebarTypes, "recentRequests");
    assert.include(sidebarTypes, "jsonrpcToolName");
    assert.include(sidebarTypes, "responseToolCount");
    assert.include(sharedHost, "createSidebarFrame");
    assert.include(sharedHost, "resolveSidebarFrameWindow");
    assert.include(assistantSidebar, 'from "./sidebarBrowserHost"');
  });

  it("adds localized ACP labels for dashboard and sidebar actions", async function () {
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");

    assert.include(en, "task-dashboard-sidebar-assistant = Assistant");
    assert.include(en, "task-dashboard-home-acp-title = ACP Chat");
    assert.include(
      en,
      "task-dashboard-home-acp-skill-runs-title = ACP Skill Runs",
    );
    assert.include(en, "task-dashboard-acp-backend-title = ACP Backend");
    assert.include(en, "task-dashboard-acp-manage-backends = Manage Backends");
    assert.include(en, "task-dashboard-acp-details = Details");
    assert.include(en, "task-dashboard-acp-reasoning = Reasoning");
    assert.include(en, "task-dashboard-acp-conversation = Conversation");
    assert.include(en, "task-dashboard-acp-remote-session = Remote session");
    assert.include(en, "task-dashboard-acp-remote-restore = Remote restore");
    assert.include(
      en,
      "task-dashboard-acp-new-conversation = New Conversation",
    );
    assert.include(
      en,
      "task-dashboard-acp-rename-conversation = Rename Conversation",
    );
    assert.include(en, "task-dashboard-acp-session-manager = Sessions");
    assert.include(en, "task-dashboard-acp-session-show-more = Show more...");
    assert.include(en, "task-dashboard-acp-archive-conversation = Archive");
    assert.include(en, "task-dashboard-acp-connect = Connect");
    assert.include(en, "task-dashboard-acp-disconnect = Disconnect");
    assert.include(zh, "task-dashboard-sidebar-assistant = Assistant");
    assert.include(zh, "task-dashboard-home-acp-title = ACP 对话");
    assert.include(
      zh,
      "task-dashboard-home-acp-skill-runs-title = ACP Skill 运行",
    );
    assert.include(zh, "task-dashboard-acp-backend-title = ACP 后端");
    assert.include(zh, "task-dashboard-acp-manage-backends = 管理后端");
    assert.include(zh, "task-dashboard-acp-details = 详情");
    assert.include(zh, "task-dashboard-acp-reasoning = 推理强度");
    assert.include(zh, "task-dashboard-acp-conversation = 对话");
    assert.include(zh, "task-dashboard-acp-remote-session = 远端会话");
    assert.include(zh, "task-dashboard-acp-remote-restore = 远端恢复");
    assert.include(zh, "task-dashboard-acp-new-conversation = 新建对话");
    assert.include(zh, "task-dashboard-acp-rename-conversation = 重命名对话");
    assert.include(zh, "task-dashboard-acp-session-manager = 会话");
    assert.include(zh, "task-dashboard-acp-session-show-more = 显示更多...");
    assert.include(zh, "task-dashboard-acp-archive-conversation = 归档");
    assert.include(zh, "task-dashboard-acp-connect = 连接");
    assert.include(zh, "task-dashboard-acp-disconnect = 断开");
  });

  it("defines shared Assistant panel locale keys in all active locales", async function () {
    const locales = await Promise.all(
      ["en-US", "zh-CN", "fr-FR", "ja-JP"].map(async (locale) => ({
        locale,
        text: await readProjectFile(`addon/locale/${locale}/addon.ftl`),
      })),
    );
    const requiredKeys = [
      "assistant-panel-action-send",
      "assistant-panel-action-close",
      "assistant-panel-action-details",
      "assistant-panel-action-runs",
      "assistant-panel-action-archive",
      "assistant-panel-field-backend",
      "assistant-panel-field-workspace",
      "assistant-panel-drawer-running",
      "assistant-panel-drawer-completed",
      "assistant-panel-details-title",
      "assistant-panel-details-no-entries",
      "assistant-panel-reply-placeholder-acp-skill",
      "assistant-panel-reply-placeholder-skillrunner",
      "assistant-panel-reply-placeholder-acp-chat",
      "assistant-panel-reply-shortcut",
      "assistant-panel-action-connecting",
      "assistant-panel-action-disconnecting",
      "assistant-panel-action-use-method",
      "assistant-panel-interaction-user-input-required",
      "assistant-panel-interaction-waiting-reply",
      "assistant-panel-interaction-authentication-required-title",
      "assistant-panel-interaction-authentication-required-message",
      "assistant-panel-interaction-agent-running-title",
      "assistant-panel-interaction-agent-working-message",
      "assistant-panel-interaction-agent-repairing-message",
      "assistant-panel-interaction-run-completed-title",
      "assistant-panel-interaction-run-result-ready",
      "assistant-panel-interaction-acp-connection-interrupted",
      "assistant-panel-interaction-disconnected-recoverable",
      "assistant-panel-interaction-run-canceled-continue",
      "assistant-panel-interaction-waiting-request-id",
      "assistant-panel-interaction-needs-user-interaction",
      "assistant-panel-interaction-backend-unavailable",
      "assistant-panel-permission-view-full-request",
      "assistant-panel-transcript-empty",
      "assistant-panel-transcript-thinking",
      "assistant-panel-transcript-tool",
      "assistant-panel-usage-unavailable",
      "assistant-panel-status-backend-unavailable",
    ];
    locales.forEach(({ locale, text }) => {
      requiredKeys.forEach((key) => {
        assert.include(text, `${key} =`, `${locale} should define ${key}`);
      });
    });
    locales
      .filter(({ locale }) => locale !== "en-US")
      .forEach(({ locale, text }) => {
        assert.notInclude(
          text,
          "task-dashboard-products-section-feedback = Skill Feedback",
          `${locale} should localize the feedback section tab`,
        );
      });
  });

  it("projects localized Assistant sidebar hint copy from shared panel labels", async function () {
    const model = await loadAssistantPanelModelForSmoke();
    const labels = {
      actions: {
        send: "发送",
        useMethod: "使用此方式",
      },
      reply: {
        placeholderAcpChat: "询问当前 ACP 后端...",
        shortcut: "快捷发送",
      },
      drawer: {
        emptyTasks: "暂无运行",
      },
      interaction: {
        userInputRequired: "需要用户输入",
        waitingReply: "正在等待回复",
        waitingRequestId: "等待请求 ID",
        needsUserInteraction: "需要交互",
        backendUnavailable: "后端不可用",
      },
    };

    const skillRunner = model.projectSkillRunnerPanelSnapshot({
      labels,
      session: {
        requestId: "req-localized-hint",
        status: "waiting_user",
        pendingInteractionId: 1,
        pendingKind: "open_text",
      },
      drawer: {
        sections: [
          {
            id: "running",
            groups: [
              {
                backendId: "backend-a",
                activeTasks: [
                  {
                    key: "",
                    status: "waiting_user",
                    attention: "warning",
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    assert.equal(skillRunner.interaction.title, "需要用户输入");
    assert.equal(
      skillRunner.interaction.pendingInteraction.uiHints.prompt,
      "正在等待回复",
    );
    assert.equal(skillRunner.reply.hint, "快捷发送");
    assert.equal(skillRunner.drawers.labels.waitingRequestId, "等待请求 ID");
    assert.equal(skillRunner.drawers.labels.needsUserInteraction, "需要交互");
    assert.equal(skillRunner.drawers.labels.backendUnavailable, "后端不可用");

    const acpChat = model.projectAcpChatPanelSnapshot({
      labels,
      status: "connected",
      backendOptions: [],
      chatSessions: [],
    });
    assert.equal(acpChat.reply.placeholder, "询问当前 ACP 后端...");
  });

  it("localizes the Assistant interaction status area from the conversation view", async function () {
    const conversationView = await loadAssistantConversationViewForSmoke();
    const model = await loadAssistantPanelModelForSmoke({ conversationView });
    const labels = {
      interaction: {
        agentWorkingMessage: "Agent 正在处理",
        agentRepairingMessage: "Agent 正在修复输出",
        runResultReady: "结果已就绪",
        runCanceledContinue: "任务已取消，可继续对话",
      },
    };

    const chatPanel = model.projectAcpChatPanelSnapshot({
      labels,
      status: "connected",
      busy: true,
      sessionId: "session-localized-working",
      backendOptions: [],
      chatSessions: [],
    });
    assert.equal(chatPanel.interaction.kind, "running");
    assert.equal(chatPanel.interaction.message, "Agent 正在处理");

    const repairingPanel = model.projectAcpSkillRunPanelSnapshot({
      labels,
      selectedRun: {
        requestId: "repairing-run",
        status: "repairing",
      },
      runs: [{ requestId: "repairing-run", status: "repairing" }],
    });
    assert.equal(repairingPanel.interaction.kind, "running");
    assert.equal(repairingPanel.interaction.message, "Agent 正在修复输出");

    const completedPanel = model.projectAcpSkillRunPanelSnapshot({
      labels,
      selectedRun: {
        requestId: "completed-run",
        status: "succeeded",
      },
      runs: [{ requestId: "completed-run", status: "succeeded" }],
    });
    assert.equal(completedPanel.interaction.kind, "completed");
    assert.equal(completedPanel.interaction.message, "结果已就绪");
  });

  it("defines Products dashboard locale keys in all active locales", async function () {
    const locales = await Promise.all(
      ["en-US", "zh-CN", "fr-FR", "ja-JP"].map(async (locale) => ({
        locale,
        text: await readProjectFile(`addon/locale/${locale}/addon.ftl`),
      })),
    );
    const requiredKeys = [
      "task-dashboard-tab-products",
      "task-dashboard-products-empty",
      "task-dashboard-products-open-workspace",
      "task-dashboard-products-open-run",
      "task-dashboard-products-remove",
      "task-dashboard-products-preview-unavailable",
      "task-dashboard-products-list-title",
      "task-dashboard-products-list-collapse",
      "task-dashboard-products-list-expand",
      "task-dashboard-products-list-rail",
      "task-dashboard-products-section-feedback",
      "task-dashboard-products-viewer-wrap",
      "task-dashboard-products-viewer-copy",
      "task-dashboard-products-viewer-copied",
      "task-dashboard-products-viewer-copy-failed",
      "task-dashboard-feedback-select-all",
      "task-dashboard-feedback-export-selected",
    ];
    locales.forEach(({ locale, text }) => {
      requiredKeys.forEach((key) => {
        assert.include(text, `${key} =`, `${locale} should define ${key}`);
      });
    });
  });

  it("wires Dashboard Products tree and rich preview assets", async function () {
    const html = await readProjectFile("addon/content/dashboard/index.html");
    const app = await readProjectFile("addon/content/dashboard/app.js");
    const css = await readProjectFile("addon/content/dashboard/styles.css");
    const iconsCss = await readProjectFile("addon/content/shared/icons.css");
    const taskManagerDialogTs = await readProjectFile(
      "src/modules/taskManagerDialog.ts",
    );
    const productIconMapper = app.slice(
      app.indexOf("function productFileTypeIconClass"),
      app.indexOf("function resolveHighlightLanguage"),
    );

    assert.include(html, "./vendor/katex/katex.min.css");
    assert.include(html, "./vendor/markdown-it/markdown-it.min.js");
    assert.include(html, "./vendor/markdown-it-texmath/texmath.min.js");
    assert.include(html, "./vendor/highlight/highlight.min.js");
    assert.include(html, "./vendor/highlight/styles/github.min.css");

    assert.include(app, "productsListCollapsed");
    assert.include(app, 'labelText(labels, "feedbackSelectAll")');
    assert.include(app, 'sendAction("toggle-all-feedback-products-selected"');
    assert.include(app, "selectedVisibleFeedbackCount");
    assert.include(app, "selectAllCheckbox.indeterminate");
    assert.include(css, ".feedback-select-all");
    assert.include(
      taskManagerDialogTs,
      'action === "toggle-all-feedback-products-selected"',
    );
    assert.include(taskManagerDialogTs, "listSkillRunFeedbackProducts(");
    assert.include(app, "buildProductAssetTree");
    assert.include(app, "renderProductTreeNode");
    assert.include(app, "productExpandedTreePathsById");
    assert.include(app, 'html: false');
    assert.include(app, "highlightCode");
    assert.include(app, "window.hljs");
    assert.include(app, "splitPreviewLines");
    assert.include(app, "product-code-line-number");
    assert.include(app, "wrapButton.setAttribute(\"aria-pressed\"");
    assert.include(app, "copyTextToClipboard");
    assert.include(productIconMapper, "zs-icon-product-table");
    assert.include(productIconMapper, "zs-icon-product-article");
    assert.include(productIconMapper, "zs-icon-product-data");
    assert.include(productIconMapper, "zs-icon-product-code");
    assert.include(productIconMapper, "zs-icon-product-file");
    assert.notInclude(productIconMapper, "zs-icon-description");
    assert.notInclude(productIconMapper, "zs-icon-terminal");
    assert.include(app, "zs-icon-product-folder-open");
    assert.notInclude(app, "product-tree-expander");

    assert.include(css, ".products-layout-collapsed");
    assert.include(css, ".product-tree-folder");
    assert.include(css, ".product-tree-file");
    assert.include(css, ".product-tree-folder-icon");
    assert.include(css, ".product-preview-markdown table");
    assert.include(css, ".product-code-viewer.wrap-lines");
    assert.include(css, ".product-code-line-number");
    assert.include(css, "user-select: none;");
    assert.include(css, "overscroll-behavior: contain;");
    assert.include(css, "white-space: pre-wrap;");
    assert.include(iconsCss, ".zs-icon-product-folder");
    assert.include(iconsCss, ".zs-icon-product-code");
    assert.include(taskManagerDialogTs, "product?.cacheDir || \"\"");
    assert.notInclude(
      taskManagerDialogTs,
      "product?.workspaceDir || product?.cacheDir",
    );
  });

  it("governs Dashboard refreshes with surface signatures and stable shell rendering", async function () {
    const dialog = await readProjectFile("src/modules/taskManagerDialog.ts");
    const harness = await readProjectFile(
      "src/modules/harness/dashboardReadonlyModel.ts",
    );
    const app = await readProjectFile("addon/content/dashboard/app.js");

    assert.include(dialog, "surfaceSignatures?: {");
    assert.include(dialog, "function finalizeDashboardSnapshot");
    assert.include(dialog, "dashboardSelectedSurfaceKey(snapshot)");
    assert.include(dialog, "lastPostedDashboardSignatures");
    assert.include(dialog, "isNoisyRefreshReason(reason)");
    assert.include(dialog, "signatures.selectedSurface ===");
    assert.include(dialog, "void enqueueRefresh(\"dashboard:snapshot\", reason)");

    assert.include(harness, "function dashboardSurfaceSignatures");
    assert.include(
      harness,
      "snapshotPayload.surfaceSignatures =",
    );

    assert.include(app, "lastChromeSignature");
    assert.include(app, "function ensureDashboardShell(app)");
    assert.include(app, "shouldSkipUnchangedSnapshotRender(nextSnapshot)");
    assert.include(app, "rememberSnapshotRenderSignature(snapshot)");
    assert.include(app, "main.className = \"main\"");
    assert.notInclude(app, "clearNode(app);\n    if (!snapshot)");
  });

  it("keeps managed ACP Chat selectors populated with typed payload keys", async function () {
    const model = await loadAssistantPanelModelForSmoke();
    const panel = model.projectAcpChatPanelSnapshot({
      status: "connected",
      sessionId: "session-1",
      activeBackendId: "backend-a",
      backendOptions: [{ backendId: "backend-a", displayName: "Backend A" }],
      activeConversationId: "conversation-a",
      chatSessions: [
        {
          conversationId: "conversation-a",
          backendId: "backend-a",
          title: "A",
        },
        {
          conversationId: "conversation-b",
          backendId: "backend-a",
          title: "B",
        },
      ],
      modeOptions: [{ id: "bypassPermissions", label: "Bypass permissions" }],
      currentMode: { id: "bypassPermissions", label: "Bypass permissions" },
      displayModelOptions: [{ id: "opus", label: "Opus" }],
      currentDisplayModel: { id: "opus", label: "Opus" },
      reasoningEffortOptions: [
        { id: "medium", label: "Medium" },
        { id: "high", label: "High" },
      ],
      currentReasoningEffort: { id: "high", label: "High" },
      authMethods: [],
      items: [],
      labels: {},
    });
    const conversationSelector = panel.context.selectors.find(
      (entry: any) => entry.id === "conversation",
    );
    assert.deepEqual(
      conversationSelector.options.map((entry: any) => [
        entry.value,
        entry.backendId,
      ]),
      [
        ["conversation-a", "backend-a"],
        ["conversation-b", "backend-a"],
      ],
    );
    assert.equal(panel.drawers.layout, "workspace-task-drawer");
    assert.equal(panel.drawers.sections[0].id, "sessions");
    assert.equal(
      panel.drawers.sections[0].groups[0].backendDisplayName,
      "Backend A",
    );
    assert.equal(
      panel.drawers.sections[0].groups[0].activeTasks[0].conversationId,
      "conversation-a",
    );
    assert.equal(
      panel.drawers.sections[0].groups[0].activeTasks[0].action,
      "set-active-conversation",
    );
    assert.deepEqual(
      panel.drawers.sections[0].groups[0].activeTasks[0].payload,
      {
        conversationId: "conversation-a",
        backendId: "backend-a",
      },
    );
    assert.deepEqual(
      panel.drawers.sections[0].groups[0].activeTasks[0].itemActions[0].payload,
      {
        conversationId: "conversation-a",
        backendId: "backend-a",
      },
    );
    assert.equal(
      panel.drawers.sections[0].groups[0].activeTasks[0].itemActions[0].action,
      "archive-conversation",
    );
    const controls = panel.reply.controls;
    assert.lengthOf(controls, 3);
    assert.deepEqual(
      controls.map((entry: any) => [
        entry.id,
        entry.value,
        entry.payloadKey,
        entry.options.length,
      ]),
      [
        ["mode", "bypassPermissions", "modeId", 1],
        ["model", "opus", "modelId", 1],
        ["reasoning", "high", "effortId", 2],
      ],
    );
    assert.deepEqual(
      controls.map((entry: any) => [entry.id, entry.disabled]),
      [
        ["mode", false],
        ["model", false],
        ["reasoning", false],
      ],
    );

    const remoteOnlyPanel = model.projectAcpChatPanelSnapshot({
      status: "idle",
      sessionId: "",
      remoteSessionId: "remote-session-1",
      activeBackendId: "backend-a",
      backendOptions: [
        { backendId: "backend-a", displayName: "Backend A", connected: false },
      ],
      activeConversationId: "conversation-a",
      chatSessions: [
        {
          conversationId: "conversation-a",
          backendId: "backend-a",
          title: "A",
        },
      ],
      authMethods: [{ id: "device", name: "Device login" }],
      items: [],
      labels: {},
    });
    const remoteActions = Object.fromEntries(
      remoteOnlyPanel.context.actions.map((entry: any) => [
        entry.id || entry.action,
        entry,
      ]),
    );
    assert.equal(remoteActions.connect.enabled, true);
    assert.equal(remoteActions.disconnect.enabled, false);
    assert.equal(remoteActions.authenticate.enabled, false);
    assert.equal(remoteActions.connect.payload.backendId, "backend-a");

    const authRequiredPanel = model.projectAcpChatPanelSnapshot({
      status: "auth-required",
      sessionId: "",
      activeBackendId: "backend-a",
      backendOptions: [{ backendId: "backend-a", displayName: "Backend A" }],
      authMethods: [{ id: "device", name: "Device login" }],
      items: [],
      labels: {},
    });
    const authActions = Object.fromEntries(
      authRequiredPanel.context.actions.map((entry: any) => [
        entry.id || entry.action,
        entry,
      ]),
    );
    assert.equal(authActions.authenticate.enabled, true);
    assert.equal(authActions.authenticate.payload.backendId, "backend-a");
    assert.equal(authActions.authenticate.payload.methodId, "device");

    const connectingPanel = model.projectAcpChatPanelSnapshot({
      status: "initializing",
      activeBackendId: "backend-a",
      backendOptions: [{ backendId: "backend-a", displayName: "Backend A" }],
      mcpHealth: { state: "listening", severity: "ok", summary: "MCP ready" },
      hostBridge: {
        status: "running",
        endpoint: "http://127.0.0.1:26570/bridge/v1",
        portMode: "pinned",
      },
      items: [],
      labels: {},
    });
    assert.equal(connectingPanel.interaction.kind, "hidden");
    assert.deepEqual(
      connectingPanel.context.indicators.map((entry: any) => [
        entry.id,
        entry.value,
        entry.tone,
      ]),
      [
        ["connection", "Connecting", "accent"],
        ["host-bridge", "Ready", "success"],
      ],
    );
    assert.notInclude(
      connectingPanel.context.indicators.map((entry: any) => entry.id),
      "mcp",
    );

    const busyPanel = model.projectAcpChatPanelSnapshot({
      status: "connected",
      busy: true,
      sessionId: "session-1",
      activeBackendId: "backend-a",
      backendOptions: [{ backendId: "backend-a", displayName: "Backend A" }],
      modeOptions: [{ id: "plan", label: "Plan" }],
      currentMode: { id: "plan", label: "Plan" },
      displayModelOptions: [{ id: "opus", label: "Opus" }],
      currentDisplayModel: { id: "opus", label: "Opus" },
      reasoningEffortOptions: [
        { id: "medium", label: "Medium" },
        { id: "high", label: "High" },
      ],
      currentReasoningEffort: { id: "high", label: "High" },
      items: [],
      labels: {},
    });
    assert.equal(busyPanel.interaction.kind, "running");
    assert.equal(busyPanel.reply.enabled, true);
    assert.equal(busyPanel.reply.inputEnabled, false);
    assert.equal(busyPanel.reply.action, "cancel");
    assert.equal(busyPanel.reply.tone, "danger");
    assert.equal(busyPanel.reply.submitLabel, "Cancel");
    assert.deepEqual(
      busyPanel.reply.controls.map((entry: any) => [entry.id, entry.disabled]),
      [
        ["mode", false],
        ["model", true],
        ["reasoning", true],
      ],
    );

    const skillPanel = model.projectAcpSkillRunPanelSnapshot({
      mcpHealth: { state: "listening", severity: "ok", summary: "MCP ready" },
      hostBridge: {
        status: "running",
        endpoint: "http://127.0.0.1:26571/bridge/v1",
        portMode: "fallback",
        lastRecoveryReason: "Pinned Host Bridge port was unavailable.",
      },
      selectedRun: {
        requestId: "acp-skill-1",
        status: "running",
        conversationState: "active",
        activePrompt: true,
        sessionId: "session-1",
        taskName: "Selected Paper Title",
        workflowLabel: "Digest",
        acpModeId: "plan",
        acpModelId: "opus",
        acpReasoningEffort: "high",
        acpRawModelId: "opus@high",
        transcriptItems: [],
      },
      selectedRuntimeOptions: {
        modeOptions: [{ id: "plan", label: "Plan" }],
        displayModelOptions: [{ id: "opus", label: "Opus" }],
        modelOptions: [
          { id: "opus@medium", label: "Opus Medium" },
          { id: "opus@high", label: "Opus High" },
        ],
        reasoningEffortOptions: [
          { id: "medium", label: "Medium" },
          { id: "high", label: "High" },
        ],
        currentMode: { id: "plan", label: "Plan" },
        currentDisplayModel: { id: "opus", label: "Opus" },
        currentReasoningEffort: { id: "high", label: "High" },
      },
      runs: [
        {
          requestId: "acp-skill-1",
          status: "running",
          taskName: "Selected Paper Title",
          workflowLabel: "Digest",
          skillId: "literature-analysis",
          backendId: "backend-a",
          backendLabel: "Backend A",
        },
        {
          requestId: "acp-skill-2",
          status: "succeeded",
          taskName: "Completed Paper Title",
          workflowLabel: "Explain",
          skillId: "literature-explainer",
          backendId: "backend-a",
          backendLabel: "Backend A",
        },
      ],
      logs: [],
    });
    assert.notInclude(
      skillPanel.context.metadata.map((entry: any) => entry.key),
      "mode",
    );
    assert.notInclude(
      skillPanel.context.metadata.map((entry: any) => entry.key),
      "model",
    );
    assert.deepEqual(
      skillPanel.context.indicators.map((entry: any) => [
        entry.id,
        entry.value,
        entry.tone,
      ]),
      [
        ["connection", "Connected", "success"],
        ["host-bridge", "Fallback", "warning"],
      ],
    );
    assert.notInclude(
      skillPanel.context.indicators.map((entry: any) => entry.id),
      "mcp",
    );
    assert.equal(skillPanel.context.title, "Selected Paper Title");
    assert.equal(skillPanel.drawers.layout, "workspace-task-drawer");
    assert.equal(skillPanel.drawers.sections[0].id, "running");
    assert.equal(skillPanel.drawers.sections[1].id, "completed");
    assert.equal(skillPanel.drawers.sections[1].collapsed, true);
    assert.equal(
      skillPanel.drawers.sections[0].groups[0].backendDisplayName,
      "Backend A",
    );
    assert.equal(
      skillPanel.drawers.sections[0].groups[0].activeTasks[0].requestId,
      "acp-skill-1",
    );
    assert.equal(
      skillPanel.drawers.sections[0].groups[0].activeTasks[0].title,
      "Selected Paper Title",
    );
    assert.equal(
      skillPanel.drawers.sections[0].groups[0].activeTasks[0].action,
      "select-run",
    );
    assert.equal(
      skillPanel.drawers.sections[0].groups[0].activeTasks[0].attention,
      "",
    );
    assert.deepEqual(
      skillPanel.drawers.sections[0].groups[0].activeTasks[0].payload,
      {
        requestId: "acp-skill-1",
      },
    );
    assert.isUndefined(
      skillPanel.drawers.sections[0].groups[0].activeTasks[0].itemActions[0],
    );
    assert.equal(
      skillPanel.drawers.sections[1].groups[0].finishedTasks[0].requestId,
      "acp-skill-2",
    );
    assert.equal(
      skillPanel.drawers.sections[1].groups[0].finishedTasks[0].title,
      "Completed Paper Title",
    );
    assert.equal(
      skillPanel.drawers.sections[1].groups[0].finishedTasks[0].itemActions[0]
        .action,
      "archive-run",
    );
    assert.deepEqual(
      skillPanel.drawers.sections[1].groups[0].finishedTasks[0].itemActions[0]
        .payload,
      {
        requestId: "acp-skill-2",
      },
    );
    const skillActions = Object.fromEntries(
      skillPanel.context.actions.map((entry: any) => [
        entry.id || entry.action,
        entry,
      ]),
    );
    assert.equal(skillActions["connect-run"].enabled, false);
    assert.equal(skillActions["disconnect-run"].enabled, true);
    assert.equal(skillActions["cancel-run"].enabled, true);
    assert.equal(skillActions["cancel-run"].label, "Cancel Task");
    assert.notProperty(skillActions, "end-session");
    assert.equal(skillPanel.reply.enabled, true);
    assert.equal(skillPanel.reply.inputEnabled, false);
    assert.equal(skillPanel.reply.action, "interrupt-run-turn");
    assert.equal(skillPanel.reply.tone, "danger");
    assert.equal(skillPanel.reply.submitLabel, "Cancel");
    assert.equal(skillPanel.reply.hint, "");
    assert.deepEqual(
      skillPanel.reply.controls.map((entry: any) => [
        entry.id,
        entry.value,
        entry.payloadKey,
        entry.disabled,
      ]),
      [
        ["mode", "plan", "modeId", false],
        ["model", "opus", "modelId", true],
        ["reasoning", "high", "effortId", true],
      ],
    );

    const reconnectedWorkingSkillPanel = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: {
        requestId: "acp-skill-reconnected",
        status: "waiting_user",
        activePrompt: true,
        conversationRecoveryState: "connected",
        transcriptItems: [],
      },
      runs: [{ requestId: "acp-skill-reconnected", status: "waiting_user" }],
      logs: [],
    });
    assert.equal(reconnectedWorkingSkillPanel.reply.enabled, true);
    assert.equal(reconnectedWorkingSkillPanel.reply.inputEnabled, false);
    assert.equal(
      reconnectedWorkingSkillPanel.reply.action,
      "interrupt-run-turn",
    );

    const connectedIdleRunningSkillPanel = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: {
        requestId: "acp-skill-connected-idle",
        status: "running",
        conversationState: "active",
        conversationRecoveryState: "connected",
        activePrompt: false,
        replyState: "idle",
        sessionId: "session-connected-idle",
        transcriptItems: [
          {
            kind: "status",
            label: "interrupt-completed",
          },
        ],
      },
      runs: [{ requestId: "acp-skill-connected-idle", status: "running" }],
      logs: [],
    });
    assert.equal(connectedIdleRunningSkillPanel.interaction.kind, "waiting_user");
    assert.equal(connectedIdleRunningSkillPanel.reply.enabled, true);
    assert.equal(connectedIdleRunningSkillPanel.reply.inputEnabled, true);
    assert.equal(connectedIdleRunningSkillPanel.reply.action, "reply-run");

    const transcriptWaitingSkillPanel = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: {
        requestId: "acp-skill-transcript-waiting",
        status: "running",
        conversationState: "active",
        conversationRecoveryState: "connected",
        activePrompt: false,
        replyState: "idle",
        sessionId: "session-transcript-waiting",
        transcriptItems: [],
      },
      runs: [{ requestId: "acp-skill-transcript-waiting", status: "running" }],
      logs: [],
    });
    assert.notEqual(transcriptWaitingSkillPanel.interaction.kind, "waiting_user");
    assert.equal(transcriptWaitingSkillPanel.reply.enabled, false);
    assert.equal(transcriptWaitingSkillPanel.reply.inputEnabled, false);

    const terminalSkillPanel = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: {
        requestId: "acp-skill-terminal",
        status: "succeeded",
        conversationState: "ended",
        transcriptItems: [],
      },
      runs: [{ requestId: "acp-skill-terminal", status: "succeeded" }],
      logs: [],
    });
    const terminalSkillActions = Object.fromEntries(
      terminalSkillPanel.context.actions.map((entry: any) => [
        entry.id || entry.action,
        entry,
      ]),
    );
    assert.equal(terminalSkillActions["cancel-run"].enabled, false);

    const continuingTerminalSkillPanel = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: {
        requestId: "acp-skill-terminal-reply",
        status: "succeeded",
        conversationState: "active",
        activePrompt: true,
        replyState: "submitted",
        transcriptItems: [],
      },
      runs: [{ requestId: "acp-skill-terminal-reply", status: "succeeded" }],
      logs: [],
    });
    assert.notEqual(continuingTerminalSkillPanel.interaction.kind, "completed");

    const waitingSkillPanel = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: {
        requestId: "acp-skill-waiting",
        status: "waiting_user",
        conversationState: "active",
        transcriptItems: [],
      },
      runs: [
        {
          requestId: "acp-skill-waiting",
          status: "waiting_user",
          backendId: "backend-a",
        },
      ],
      logs: [],
    });
    assert.equal(
      waitingSkillPanel.drawers.sections[0].groups[0].activeTasks[0].attention,
      "warning",
    );
    assert.equal(waitingSkillPanel.interaction.kind, "waiting_user");
    assert.equal(waitingSkillPanel.reply.enabled, true);
    assert.equal(waitingSkillPanel.reply.inputEnabled, true);
    assert.equal(waitingSkillPanel.reply.action, "reply-run");

    const pendingRunningSkillPanel = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: {
        requestId: "acp-skill-pending-running",
        status: "running",
        conversationState: "active",
        conversationRecoveryState: "connected",
        activePrompt: false,
        replyState: "idle",
        pendingInteraction: {
          message: "Confirm pending output.",
          uiHints: { kind: "confirm", prompt: "Confirm?" },
        },
        transcriptItems: [],
      },
      runs: [
        {
          requestId: "acp-skill-pending-running",
          status: "running",
          backendId: "backend-a",
          pendingInteraction: {
            message: "Confirm pending output.",
          },
        },
      ],
      logs: [],
    });
    assert.equal(pendingRunningSkillPanel.interaction.kind, "waiting_user");
    assert.equal(pendingRunningSkillPanel.reply.enabled, true);
    assert.equal(pendingRunningSkillPanel.reply.inputEnabled, true);
    assert.equal(pendingRunningSkillPanel.reply.action, "reply-run");

    const idleSkillPanel = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: {
        requestId: "acp-skill-idle-controls",
        status: "waiting_user",
        conversationState: "active",
        conversationRecoveryState: "connected",
        sessionId: "session-idle-controls",
        acpModeId: "code",
        acpModelId: "opus",
        acpReasoningEffort: "medium",
        acpRawModelId: "opus@medium",
        transcriptItems: [],
      },
      selectedRuntimeOptions: {
        modeOptions: [
          { id: "plan", label: "Plan" },
          { id: "code", label: "Code" },
        ],
        displayModelOptions: [{ id: "opus", label: "Opus" }],
        modelOptions: [
          { id: "opus@medium", label: "Opus Medium" },
          { id: "opus@high", label: "Opus High" },
        ],
        reasoningEffortOptions: [
          { id: "medium", label: "Medium" },
          { id: "high", label: "High" },
        ],
      },
      runs: [{ requestId: "acp-skill-idle-controls", status: "waiting_user" }],
      logs: [],
    });
    assert.deepEqual(
      idleSkillPanel.reply.controls.map((entry: any) => [
        entry.id,
        entry.disabled,
      ]),
      [
        ["mode", false],
        ["model", false],
        ["reasoning", false],
      ],
    );

    const failedConnectedSkillPanel = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: {
        requestId: "acp-skill-failed-connected",
        status: "failed",
        conversationState: "closed",
        conversationRecoveryState: "connected",
        replyError: "Provider quota exceeded.",
        transcriptItems: [],
      },
      runs: [{ requestId: "acp-skill-failed-connected", status: "failed" }],
      logs: [],
    });
    assert.notEqual(failedConnectedSkillPanel.interaction.kind, "completed");
    assert.equal(failedConnectedSkillPanel.reply.enabled, true);
    assert.equal(failedConnectedSkillPanel.reply.inputEnabled, true);
    assert.equal(failedConnectedSkillPanel.reply.action, "reply-run");

    const detachedSkillPanel = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: {
        requestId: "acp-skill-detached",
        status: "running",
        conversationState: "closed",
        conversationRecoveryState: "available",
        sessionId: "session-detached",
        activePrompt: false,
        transcriptItems: [],
      },
      runs: [
        {
          requestId: "acp-skill-detached",
          status: "running",
          conversationState: "closed",
          conversationRecoveryState: "available",
          sessionId: "session-detached",
          activePrompt: false,
        },
      ],
      logs: [],
    });
    const detachedActions = Object.fromEntries(
      detachedSkillPanel.context.actions.map((entry: any) => [
        entry.id || entry.action,
        entry,
      ]),
    );
    assert.equal(detachedActions["connect-run"].enabled, true);
    assert.equal(detachedActions["disconnect-run"].enabled, false);
    assert.equal(detachedActions["cancel-run"].enabled, true);
    assert.equal(
      detachedSkillPanel.drawers.sections[0].groups[0].activeTasks[0]
        .attention,
      "warning",
    );
    assert.equal(detachedSkillPanel.interaction.kind, "disconnected");
    assert.equal(detachedSkillPanel.reply.enabled, false);
    assert.equal(detachedSkillPanel.reply.inputEnabled, false);
    assert.equal(detachedSkillPanel.reply.action, "reply-run");

    const detachedWaitingSkillPanel = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: {
        requestId: "acp-skill-detached-waiting",
        status: "waiting_user",
        conversationState: "closed",
        conversationRecoveryState: "available",
        sessionId: "session-detached-waiting",
        activePrompt: false,
        pendingInteraction: {
          message: "Need user confirmation.",
          uiHints: { kind: "confirm" },
        },
        transcriptItems: [],
      },
      runs: [
        {
          requestId: "acp-skill-detached-waiting",
          status: "waiting_user",
          conversationState: "closed",
          conversationRecoveryState: "available",
          sessionId: "session-detached-waiting",
          pendingInteraction: {
            message: "Need user confirmation.",
          },
        },
      ],
      logs: [],
    });
    const detachedWaitingActions = Object.fromEntries(
      detachedWaitingSkillPanel.context.actions.map((entry: any) => [
        entry.id || entry.action,
        entry,
      ]),
    );
    assert.equal(detachedWaitingActions["connect-run"].enabled, true);
    assert.equal(detachedWaitingSkillPanel.interaction.kind, "waiting_user");
    assert.equal(detachedWaitingSkillPanel.reply.enabled, false);
    assert.equal(detachedWaitingSkillPanel.reply.action, "reply-run");

    const primitivePanel = model.projectAcpChatPanelSnapshot({
      status: "connected",
      sessionId: "session-2",
      modeOptions: ["default"],
      currentMode: "default",
      displayModelOptions: ["sonnet"],
      currentDisplayModel: "sonnet",
      reasoningEffortOptions: ["medium"],
      currentReasoningEffort: "medium",
      authMethods: [],
      items: [],
      labels: {},
    });
    assert.deepEqual(
      primitivePanel.reply.controls.map((entry: any) => [
        entry.id,
        entry.value,
        entry.options[0]?.value,
        entry.options[0]?.label,
      ]),
      [
        ["mode", "default", "default", "default"],
        ["model", "sonnet", "sonnet", "sonnet"],
        ["reasoning", "medium", "medium", "medium"],
      ],
    );
  });

  it("keeps canceled ACP skill runs out of stale close-error interaction states", async function () {
    const conversationView = await loadAssistantConversationViewForSmoke();
    const canceledConversation =
      conversationView.projectAcpSkillRunConversationView({
        requestId: "acp-skill-canceled",
        status: "canceled",
        conversationState: "active",
        conversationRecoveryState: "connected",
        error: "File Closed",
        conversationError: "File Closed",
        transcriptItems: [],
      });
    assert.equal(canceledConversation.interaction.kind, "notice");
    assert.notInclude(canceledConversation.interaction.message, "File Closed");

    const continuingConversation =
      conversationView.projectAcpSkillRunConversationView({
        requestId: "acp-skill-canceled-reply",
        status: "canceled",
        conversationState: "active",
        conversationRecoveryState: "connected",
        replyState: "submitted",
        error: "File Closed",
        conversationError: "File Closed",
        transcriptItems: [],
      });
    assert.equal(continuingConversation.interaction.kind, "running");
    assert.notInclude(
      continuingConversation.interaction.message,
      "File Closed",
    );

    const model = await loadAssistantPanelModelForSmoke({ conversationView });
    const canceledPanel = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: {
        requestId: "acp-skill-canceled",
        status: "canceled",
        conversationState: "active",
        conversationRecoveryState: "connected",
        error: "File Closed",
        conversationError: "File Closed",
        transcriptItems: [],
      },
      runs: [{ requestId: "acp-skill-canceled", status: "canceled" }],
      logs: [],
    });
    assert.equal(canceledPanel.interaction.kind, "notice");
    assert.notInclude(canceledPanel.interaction.message, "File Closed");
    assert.equal(canceledPanel.reply.enabled, true);
    assert.equal(canceledPanel.reply.inputEnabled, true);
    assert.equal(canceledPanel.reply.action, "reply-run");

    const continuingPanel = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: {
        requestId: "acp-skill-canceled-reply",
        status: "canceled",
        conversationState: "active",
        conversationRecoveryState: "connected",
        replyState: "submitted",
        error: "File Closed",
        conversationError: "File Closed",
        transcriptItems: [],
      },
      runs: [{ requestId: "acp-skill-canceled-reply", status: "canceled" }],
      logs: [],
    });
    assert.equal(continuingPanel.interaction.kind, "running");
    assert.equal(continuingPanel.reply.enabled, true);
    assert.equal(continuingPanel.reply.inputEnabled, false);
    assert.equal(continuingPanel.reply.action, "interrupt-run-turn");
  });

  it("keeps managed context drawers grouped and rectangular-button styled", async function () {
    const assistantPanelModelJs = await readProjectFile(
      "addon/content/dashboard/assistant-panel-model.js",
    );
    const assistantPanelRendererJs = await readProjectFile(
      "addon/content/dashboard/assistant-panel-renderer.js",
    );
    const sharedPanelCss = await readProjectFile(
      "addon/content/dashboard/assistant-panel-shared.css",
    );
    const acpChatCss = await readProjectFile(
      "addon/content/dashboard/acp-chat.css",
    );
    const acpSkillRunCss = await readProjectFile(
      "addon/content/dashboard/acp-skill-run.css",
    );
    const runDialogCss = await readProjectFile(
      "addon/content/dashboard/run-dialog.css",
    );

    assert.include(assistantPanelModelJs, "children,");
    assert.include(assistantPanelModelJs, "itemActions:");
    assert.include(assistantPanelModelJs, '"archive-conversation"');
    assert.include(assistantPanelModelJs, '"archive-run"');
    assert.include(assistantPanelModelJs, "active: Boolean(requestId && run");
    assert.include(
      assistantPanelRendererJs,
      "function renderContextEntry(parent, entry, depth)",
    );
    assert.include(
      assistantPanelRendererJs,
      "function renderAssistantWorkspaceTaskAction",
    );
    assert.include(assistantPanelRendererJs, "event.stopPropagation()");
    assert.include(assistantPanelRendererJs, "data-assistant-button-tone");
    assert.include(assistantPanelRendererJs, "interrupt-run-turn");
    assert.include(
      assistantPanelRendererJs,
      "assistant-workspace-drawer-task-actions",
    );
    assert.include(
      assistantPanelRendererJs,
      "assistant-workspace-drawer-task-action",
    );
    assert.include(
      assistantPanelRendererJs,
      'entry && entry.active ? " is-active" : ""',
    );
    assert.include(assistantPanelRendererJs, "--assistant-context-depth");
    assert.include(
      assistantPanelRendererJs,
      "renderAssistantWorkspaceTaskDrawer",
    );
    assert.include(assistantPanelRendererJs, "workspaceDrawerStableSignature");
    assert.include(assistantPanelRendererJs, "updateWorkspaceDrawerLiveFields");
    assert.include(
      assistantPanelRendererJs,
      "data-assistant-workspace-drawer-signature",
    );
    assert.include(assistantPanelRendererJs, "data-assistant-task-key");
    assert.include(
      assistantPanelRendererJs,
      'safeText(panel.drawers && panel.drawers.layout) === "workspace-task-drawer"',
    );
    assert.include(sharedPanelCss, ".assistant-panel-context-entry.is-group");
    assert.include(sharedPanelCss, ".assistant-panel-context-entry.is-active");
    assert.include(sharedPanelCss, ".assistant-workspace-drawer-section");
    assert.include(
      sharedPanelCss,
      ".assistant-workspace-drawer-section.is-completed",
    );
    assert.include(sharedPanelCss, ".assistant-workspace-drawer-task");
    assert.include(
      sharedPanelCss,
      ':root[data-zs-theme="dark"] .assistant-workspace-drawer-task',
    );
    assert.include(sharedPanelCss, "color: var(--asst-text);");
    assert.include(
      sharedPanelCss,
      ':root[data-zs-theme="dark"] .assistant-workspace-drawer-task-workflow',
    );
    assert.include(sharedPanelCss, "color: var(--asst-muted);");
    assert.include(
      sharedPanelCss,
      ':root:not([data-zs-theme="light"]) .assistant-workspace-drawer-task',
    );
    assert.include(
      sharedPanelCss,
      ".assistant-workspace-drawer-task-action.is-archive::before",
    );
    assert.include(
      sharedPanelCss,
      ".assistant-workspace-drawer-task-action.is-archive::after",
    );
    assert.include(sharedPanelCss, "align-content: start;");
    assert.include(sharedPanelCss, "height: 34px;");
    assert.include(sharedPanelCss, "border-radius: var(--asst-radius-sm);");
    assert.include(
      sharedPanelCss,
      '.asst-conversation-overlay-menu .asst-button-compact[aria-pressed="true"]',
    );
    assert.include(sharedPanelCss, "border-color: var(--asst-accent);");
    assert.notInclude(acpChatCss, ".acp-chat-drawer .asst-drawer-panel");
    assert.include(
      sharedPanelCss,
      ".asst-panel-drawer-overlay .asst-drawer-panel",
    );
    assert.include(sharedPanelCss, "left: 0;");
    assert.include(sharedPanelCss, "border-right: 1px solid var(--asst-line);");
    assert.include(sharedPanelCss, "border-radius: var(--asst-radius-md);");
    assert.notInclude(
      sharedPanelCss,
      ".asst-button,\n.asst-button-compact,\n.asst-icon-button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 6px;\n  border: 1px solid var(--asst-line-strong);\n  border-radius: var(--asst-radius-pill);",
    );
    assert.notInclude(acpSkillRunCss, ".asst-button {");
    assert.notInclude(runDialogCss, ".asst-button {");
  });

  it("keeps focused reply textarea stable across unrelated managed renders", async function () {
    const fakeDocument = createFakeDocumentForAssistantPanel();
    const renderer = await loadAssistantPanelRendererForSmoke(fakeDocument);
    const replyRegion = fakeDocument.createElement("div");
    const basePanel = {
      kind: "acp-skill",
      context: { id: "run-a" },
      lifecycle: { replyState: "waiting" },
      reply: {
        enabled: true,
        inputEnabled: true,
        action: "reply-run",
        placeholder: "Reply",
        hint: "Ctrl+Enter",
        value: "model echo",
      },
    };

    renderer.renderAssistantPanelSnapshot(basePanel, {
      managed: true,
      managedRegions: { reply: true },
      regions: { reply: replyRegion },
    });

    const input = replyRegion.querySelector(
      ".assistant-panel-reply-input",
    ) as any;
    assert.ok(input);
    input.value = "local draft";
    input.focus();
    input.setSelectionRange(2, 7);

    renderer.renderAssistantPanelSnapshot(
      {
        ...basePanel,
        usage: { used: 100, size: 1000 },
        reply: {
          ...basePanel.reply,
          value: "new model echo",
          hint: "Still waiting",
        },
      },
      {
        managed: true,
        managedRegions: { reply: true },
        regions: { reply: replyRegion },
      },
    );

    const nextInput = replyRegion.querySelector(
      ".assistant-panel-reply-input",
    ) as any;
    assert.strictEqual(nextInput, input);
    assert.equal(nextInput.value, "local draft");
    assert.equal(nextInput.selectionStart, 2);
    assert.equal(nextInput.selectionEnd, 7);
    assert.strictEqual(fakeDocument.activeElement, input);
  });

  it("updates workspace drawer active session without reordering unchanged rows", async function () {
    const fakeDocument = createFakeDocumentForAssistantPanel();
    const renderer = await loadAssistantPanelRendererForSmoke(fakeDocument);
    const drawerRegion = fakeDocument.createElement("div");
    const sections = [
      {
        id: "sessions",
        title: "Sessions",
        groups: [
          {
            backendId: "backend-a",
            backendDisplayName: "Backend A",
            activeTasks: [
              {
                key: "session-a",
                title: "Session A",
                workflowLabel: "Backend A",
                status: "idle",
                selectable: true,
              },
              {
                key: "session-b",
                title: "Session B",
                workflowLabel: "Backend A",
                status: "idle",
                selectable: true,
              },
            ],
            finishedTasks: [],
          },
        ],
      },
    ];

    function renderSelected(selectedTaskKey: string) {
      renderer.renderAssistantContextDrawer(drawerRegion, {
        drawers: {
          layout: "workspace-task-drawer",
          contextTitle: "Sessions",
          selectedTaskKey,
          sections,
        },
      });
      return drawerRegion.querySelectorAll(
        ".assistant-workspace-drawer-task",
      ) as any[];
    }

    let rows = renderSelected("session-a");
    assert.deepEqual(
      rows.map((row) => row.getAttribute("data-assistant-task-key")),
      ["session-a", "session-b"],
    );
    assert.include(rows[0].className, "is-active");
    assert.notInclude(rows[1].className, "is-active");

    rows = renderSelected("session-b");
    assert.deepEqual(
      rows.map((row) => row.getAttribute("data-assistant-task-key")),
      ["session-a", "session-b"],
    );
    assert.notInclude(rows[0].className, "is-active");
    assert.include(rows[1].className, "is-active");
  });
});

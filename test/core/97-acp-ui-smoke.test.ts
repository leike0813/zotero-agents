import { assert } from "chai";

function isRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: {
      __parity?: {
        runtime?: string;
      };
    };
  };
  return (
    !!runtime.Zotero &&
    runtime.Zotero.__parity?.runtime !== "node-mock"
  );
}

const dynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as <T = any>(specifier: string) => Promise<T>;

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

async function loadAssistantPanelModelForSmoke() {
  const vm = await dynamicImport<typeof import("vm")>("vm");
  const code = await readProjectFile(
    "addon/content/dashboard/assistant-panel-model.js",
  );
  const context = {
    window: {
      AssistantConversationView: {
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
    assert.include(html, 'id="acp-chat-conversation-window"');
    assert.include(html, 'id="acp-transcript"');
    assert.include(html, 'id="acp-chat-mode-plain"');
    assert.include(html, 'id="acp-chat-mode-bubble"');
    assert.include(html, 'id="acp-chat-plan-panel"');
    assert.include(html, 'id="acp-chat-interaction"');
    assert.include(html, 'id="acp-chat-reply"');
    assert.include(html, 'id="acp-chat-details"');
    assert.include(html, './vendor/katex/katex.min.css');
    assert.include(html, './vendor/katex/katex.min.js');
    assert.include(html, './vendor/markdown-it/markdown-it.min.js');
    assert.include(html, './vendor/markdown-it-texmath/texmath.min.js');
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
    assert.include(js, 'sendAction(action, data)');
    assert.include(js, "markdownParser");
    assert.include(js, "function ensureMarkdownParser()");
    assert.include(js, "function renderMarkdown(text)");
    assert.include(js, "html: false");
    assert.include(js, "breaks: true");
    assert.include(js, "linkify: false");
    assert.include(js, "highlight: null");
    assert.include(js, "delimiters: \"dollars\"");
    assert.include(js, "state.toolActivityExpandedIds.has(id)");
    assert.include(js, "resolveSidebarActionBridge");
    assert.include(js, "target.postMessage");
    assert.include(css, ".acp-chat-shell");
    assert.include(css, "position: fixed;");
    assert.include(css, "inset: 0;");
    assert.include(css, "grid-template-rows: auto auto minmax(0, 1fr) auto auto auto;");
    assert.include(css, ".acp-interaction-notices");
    assert.include(css, ".acp-plan-panel");
    assert.include(css, "overflow: hidden;");
    assert.include(css, ".acp-transcript");
    assert.notInclude(css, ".acp-message");
    assert.notInclude(css, ".acp-tool-led");
    assert.notInclude(css, ".acp-tool-kind-badge");
    assert.include(css, ".acp-diagnostics-panel");
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

  it("adds dashboard entry points and hook wiring for opening the ACP sidebar", async function () {
    const dialog = await readProjectFile("src/modules/taskManagerDialog.ts");
    const app = await readProjectFile("addon/content/dashboard/app.js");
    const hooks = await readProjectFile("src/hooks.ts");
    const assistantHtml = await readProjectFile("addon/content/dashboard/assistant-workspace.html");
    const assistantJs = await readProjectFile("addon/content/dashboard/assistant-workspace.js");
    const assistantCss = await readProjectFile("addon/content/dashboard/assistant-workspace.css");
    const sharedPanelCss = await readProjectFile("addon/content/dashboard/assistant-panel-shared.css");
    const assistantConversationViewJs = await readProjectFile("addon/content/dashboard/assistant-conversation-view.js");
    const assistantTranscriptRendererJs = await readProjectFile("addon/content/dashboard/assistant-transcript-renderer.js");
    const assistantPanelModelJs = await readProjectFile("addon/content/dashboard/assistant-panel-model.js");
    const assistantPanelRendererJs = await readProjectFile("addon/content/dashboard/assistant-panel-renderer.js");
    const assistantSidebar = await readProjectFile("src/modules/assistantWorkspaceSidebar.ts");
    const acpChatHtml = await readProjectFile("addon/content/dashboard/acp-chat.html");
    const acpChatJs = await readProjectFile("addon/content/dashboard/acp-chat.js");
    const acpChatCss = await readProjectFile("addon/content/dashboard/acp-chat.css");
    const sidebarHost = await readProjectFile("src/modules/acpSidebar.ts");
    const acpSkillRunHtml = await readProjectFile("addon/content/dashboard/acp-skill-run.html");
    const acpSkillRunJs = await readProjectFile("addon/content/dashboard/acp-skill-run.js");
    const acpSkillRunCss = await readProjectFile("addon/content/dashboard/acp-skill-run.css");
    const runDialogHtml = await readProjectFile("addon/content/dashboard/run-dialog.html");
    const runDialogJs = await readProjectFile("addon/content/dashboard/run-dialog.js");
    const acpSkillRunSidebar = await readProjectFile("src/modules/acpSkillRunnerSidebar.ts");
    const acpSkillRunStore = await readProjectFile("src/modules/acpSkillRunStore.ts");
    const acpSkillRunner = await readProjectFile("src/modules/acpSkillRunnerOrchestrator.ts");
    const sidebarModel = await readProjectFile("src/modules/acpSidebarModel.ts");
    const sidebarTypes = await readProjectFile("src/modules/acpTypes.ts");
    const sharedHost = await readProjectFile("src/modules/sidebarBrowserHost.ts");
    const skillRunnerSidebar = await readProjectFile("src/modules/skillRunnerSidebar.ts");

    assert.include(dialog, "open-acp-sidebar");
    assert.include(dialog, "open-acp-skill-runs");
    assert.include(dialog, "DOMParser");
    assert.notInclude(dialog, "javascript:[^");
    assert.include(dialog, "openAssistantWorkspaceSidebar");
    assert.include(dialog, "buildAcpSkillRunPanelSnapshot");
    assert.include(dialog, "subscribeAcpSkillRunSnapshots");
    assert.include(dialog, "isAcpSkillRunnerTask");
    assert.include(dialog, "homeAcpEntry");
    assert.include(dialog, "homeAcpSkillRunsEntry");
    assert.include(app, "homeAcpEntry");
    assert.include(app, "homeAcpSkillRunsEntry");
    assert.include(app, 'sendAction("open-acp-sidebar"');
    assert.include(app, 'sendAction("open-acp-skill-runs"');
    assert.include(app, "renderAcpSkillRunnerBackend");
    assert.include(app, "row.requestKind");
    assert.include(app, 'snapshot.backendView.backendType === "acp"');
    assert.include(hooks, "installAssistantWorkspaceSidebarShell");
    assert.include(hooks, "removeAssistantWorkspaceSidebarShell");
    assert.include(hooks, "openAssistantWorkspaceSidebar");
    assert.include(hooks, "toggleAssistantWorkspaceSidebar");
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
    assert.include(assistantHtml, 'src="./run-dialog.html"');
    assert.notInclude(assistantHtml, "assistant-workspace-title");
    assert.notInclude(assistantHtml, "assistant-workspace-subtitle");
    assert.notInclude(assistantHtml, "assistant-workspace-close");
    assert.include(assistantJs, "assistant-workspace:child-action");
    assert.include(assistantJs, 'const tabs = ["acp-chat", "acp-skills", "skillrunner"]');
    assert.include(assistantJs, "__zsAssistantWorkspaceBridge");
    assert.include(assistantJs, "function hostBridge()");
    assert.include(assistantJs, "direct.postMessage(type, payload || {})");
    assert.include(assistantJs, "__zsAcpSidebarBridge");
    assert.include(assistantJs, "__zsAcpSkillRunSidebarBridge");
    assert.include(assistantJs, "__zsSkillRunnerSidebarBridge");
    assert.include(assistantJs, "latestChildPayloads");
    assert.include(assistantJs, "function cacheChildPayload(tab, phase, payload)");
    assert.include(assistantJs, "function normalizeSkillRunnerSidebarPayload(payload)");
    assert.include(assistantJs, 'Object.assign({}, source, { hostMode: "sidebar" })');
    assert.include(assistantJs, "function ensureSkillRunnerSidebarLayout()");
    assert.include(assistantJs, "const normalizedPayload =");
    assert.include(assistantJs, "function normalizeTab(tab, fallback)");
    assert.include(assistantJs, "fallback: state.activeTab");
    assert.include(assistantJs, "actionTrace");
    assert.include(assistantJs, "function traceAction(stage, details)");
    assert.include(assistantJs, "function nextActionId(tab, action)");
    assert.notInclude(assistantJs, "function installSkillRunnerSidebarLayoutFallback()");
    assert.notInclude(assistantJs, "assistantSkillrunnerLayout");
    assert.include(assistantJs, "function replayCachedChildPayload(tab)");
    assert.include(assistantJs, 'if (tab === "skillrunner" && !cached.init)');
    assert.include(assistantJs, 'cacheChildPayload("skillrunner", "init", payload)');
    assert.include(assistantJs, 'cacheChildPayload("skillrunner", "snapshot", payload)');
    assert.include(assistantJs, 'postToChild("skillrunner", "init", payload)');
    assert.include(assistantJs, 'postToChild("skillrunner", "snapshot", payload)');
    assert.include(assistantJs, "postToChild(tab, phase, normalizedSnapshot || snapshot)");
    assert.notInclude(assistantJs, "assistant-workspace-close");
    assert.include(assistantCss, ".assistant-workspace-tabbar");
    assert.include(assistantCss, ".assistant-workspace-tabs");
    assert.include(assistantCss, ".assistant-frame");
    assert.include(assistantCss, "min-height: 0");
    assert.include(assistantCss, "width: 100%");
    assert.include(assistantCss, "flex: 1 1 0");
    assert.include(assistantCss, ".assistant-tab.is-active");
    assert.notInclude(assistantCss, ".assistant-workspace-title");
    assert.notInclude(assistantCss, ".assistant-close");
    assert.include(acpChatHtml, "./assistant-panel-shared.css");
    assert.include(acpSkillRunHtml, "./assistant-panel-shared.css");
    assert.include(runDialogHtml, "./assistant-panel-shared.css");
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
    assert.include(sharedPanelCss, "--asst-surface");
    assert.include(sharedPanelCss, "--asst-accent");
    assert.include(sharedPanelCss, "@keyframes asst-spin");
    assert.include(sharedPanelCss, "@keyframes asst-pulse");
    assert.include(sharedPanelCss, ".asst-shell-toolbar");
    assert.include(sharedPanelCss, ".asst-context-selector");
    assert.include(sharedPanelCss, ".asst-context-actions");
    assert.include(sharedPanelCss, ".asst-conversation-surface");
    assert.include(sharedPanelCss, ".asst-conversation-overlay-menu");
    assert.include(sharedPanelCss, ".asst-hint-surface");
    assert.include(sharedPanelCss, ".asst-reply-surface");
    assert.include(sharedPanelCss, ".asst-led");
    assert.include(sharedPanelCss, ".asst-spinner");
    assert.include(sharedPanelCss, ".asst-code-surface");
    assert.include(sharedPanelCss, ".asst-drawer-panel");
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
    assert.include(sharedPanelCss, ".assistant-transcript.plain-mode .assistant-transcript-row");
    assert.include(sharedPanelCss, ".assistant-transcript.bubble-mode .assistant-transcript-row");
    assert.include(sharedPanelCss, ".assistant-transcript.plain-mode .assistant-transcript-row.is-tool");
    assert.include(
      sharedPanelCss,
      ".assistant-transcript.plain-mode .assistant-transcript-row.is-tool .assistant-transcript-meta",
    );
    assert.include(sharedPanelCss, "border-left-width: 0;");
    assert.include(sharedPanelCss, "display: none;");
    assert.notInclude(sharedPanelCss, ".acp-");
    assert.notInclude(sharedPanelCss, ".workspace-");
    assert.notInclude(sharedPanelCss, ".btn");
    assert.include(acpChatHtml, "acp-chat-banner");
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
    assert.include(assistantConversationViewJs, "window.AssistantConversationView");
    assert.include(assistantConversationViewJs, "projectAcpChatConversationView");
    assert.include(assistantConversationViewJs, "projectAcpSkillRunConversationView");
    assert.include(assistantConversationViewJs, "normalizeAssistantPlanEntry");
    assert.include(assistantConversationViewJs, "normalizeAssistantToolItem");
    assert.include(assistantConversationViewJs, "resolveAssistantInteraction");
    assert.include(assistantConversationViewJs, 'kind: "process"');
    assert.include(assistantConversationViewJs, 'kind: "tool"');
    assert.include(assistantTranscriptRendererJs, "window.AssistantTranscriptRenderer");
    assert.include(assistantTranscriptRendererJs, "renderAssistantTranscript");
    assert.include(assistantTranscriptRendererJs, "renderAssistantTranscriptItem");
    assert.include(assistantTranscriptRendererJs, "isAssistantTranscriptNearBottom");
    assert.include(assistantTranscriptRendererJs, "buildTranscriptRenderItems");
    assert.include(assistantTranscriptRendererJs, "assistant-transcript-revision-badge");
    assert.include(assistantTranscriptRendererJs, "tool_activity_group");
    assert.include(assistantTranscriptRendererJs, "assistant-transcript-row");
    assert.include(assistantTranscriptRendererJs, "data-assistant-panel-kind");
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
    assert.include(assistantPanelRendererJs, "window.AssistantPanelRenderer");
    assert.include(assistantPanelRendererJs, "function withDefaultPanel(source)");
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
    assert.include(assistantPanelRendererJs, "completedCount + \"/\" + totalCount");
    assert.include(assistantPanelRendererJs, "assistant-panel-plan-spinner");
    assert.include(assistantPanelRendererJs, "toneClass === \"is-completed\" ? \"✓\" : \"•\"");
    assert.include(assistantPanelRendererJs, "renderAssistantHint");
    assert.include(assistantPanelRendererJs, "assistant-panel-permission-summary");
    assert.include(assistantPanelRendererJs, "View full request");
    assert.include(assistantPanelRendererJs, "assistant-panel-permission-detail-code");
    assert.include(assistantPanelRendererJs, "renderAssistantReply");
    assert.include(assistantPanelRendererJs, "renderUsageGauge");
    assert.include(assistantPanelRendererJs, "assistant-panel-usage-gauge");
    assert.include(assistantPanelRendererJs, "assistant-panel-usage-ring");
    assert.include(assistantPanelRendererJs, "assistant-panel-usage-label");
    assert.include(assistantPanelRendererJs, 'label.setAttribute("data-assistant-selector-id"');
    assert.include(assistantPanelRendererJs, "renderReplyZone");
    assert.include(assistantPanelRendererJs, "renderAssistantContextDrawer");
    assert.include(assistantPanelRendererJs, "renderDetailsDrawer");
    assert.include(assistantPanelRendererJs, "entry.title || entry.text || entry.label || entry.content");
    assert.include(assistantPanelRendererJs, "const payloadKey = safeText(selector.payloadKey)");
    assert.include(assistantPanelRendererJs, "payload[payloadKey] = select.value");
    assert.include(assistantPanelRendererJs, "managedRegions");
    assert.include(
      assistantPanelRendererJs,
      'markRegion(regions.conversation, "assistant-panel-conversation", "conversation",',
    );
    assert.include(assistantPanelRendererJs, "managed: false");
    assert.include(assistantPanelRendererJs, 'node.classList.remove("is-assistant-managed")');
    assert.include(assistantPanelModelJs, "function selectorPayloadKey(id, action)");
    assert.include(assistantPanelModelJs, 'return "modeId"');
    assert.include(assistantPanelModelJs, 'return "modelId"');
    assert.include(assistantPanelModelJs, 'return "effortId"');
    assert.include(assistantPanelModelJs, 'return "backendId"');
    assert.include(assistantPanelModelJs, 'return "conversationId"');
    assert.include(sharedPanelCss, ".assistant-panel-region.is-assistant-managed");
    assert.include(sharedPanelCss, ".assistant-panel-managed-view");
    assert.include(sharedPanelCss, ".assistant-panel-reply-footer");
    assert.include(sharedPanelCss, ".assistant-panel-reply-primary");
    assert.include(sharedPanelCss, ".assistant-panel-permission-summary");
    assert.include(sharedPanelCss, ".assistant-panel-permission-details summary");
    assert.include(sharedPanelCss, ".assistant-panel-reply-controls");
    assert.include(sharedPanelCss, ".assistant-panel-reply-secondary");
    assert.include(sharedPanelCss, ".assistant-panel-usage-gauge");
    assert.include(sharedPanelCss, ".assistant-panel-usage-ring");
    assert.include(sharedPanelCss, ".assistant-panel-usage-label");
    assert.include(sharedPanelCss, "radial-gradient(circle at center");
    assert.include(sharedPanelCss, ".assistant-panel-usage-gauge.is-unavailable");
    assert.include(sharedPanelCss, ".assistant-panel-indicators");
    assert.include(sharedPanelCss, ".assistant-panel-indicator");
    assert.include(sharedPanelCss, "background: transparent;");
    assert.include(sharedPanelCss, "box-shadow: none;");
    assert.include(assistantPanelRendererJs, 'const footer = el("div", "assistant-panel-reply-footer")');
    assert.include(assistantPanelRendererJs, 'const primary = el("div", "assistant-panel-reply-primary")');
    assert.include(assistantPanelRendererJs, 'const controls = el("div", "assistant-panel-reply-controls")');
    assert.include(assistantPanelRendererJs, 'const secondary = el("div", "assistant-panel-reply-secondary")');
    assert.include(assistantPanelRendererJs, "renderUsageGauge(secondary, panel.usage)");
    assert.include(assistantPanelRendererJs, 'return "N/A";');
    assert.include(assistantPanelRendererJs, 'return String(rounded).replace(/\\.0$/, "") + "k";');
    assert.include(assistantPanelRendererJs, "source.used || source.totalTokens");
    assert.include(assistantPanelRendererJs, "source.size || source.contextWindow");
    assert.include(assistantPanelRendererJs, 'const centerLabel = unavailable ? "N/A"');
    assert.include(assistantPanelRendererJs, 'ring.appendChild(el("span", "assistant-panel-usage-label", centerLabel));');
    assert.include(assistantPanelRendererJs, "panel.reply.showUsageGauge === true");
    assert.notInclude(assistantPanelRendererJs, "renderUsageGauge(actions, panel.usage)");
    assert.notInclude(assistantPanelRendererJs, "renderUsageGauge(controls, panel.usage)");
    assert.notInclude(sharedPanelCss, ".assistant-panel-reply-actions");
    assert.include(
      sharedPanelCss,
      '.assistant-panel-context-selectors .assistant-panel-selector[data-assistant-selector-id="backend"]',
    );
    assert.include(sharedPanelCss, "flex: 4 1 0;");
    assert.include(
      sharedPanelCss,
      '.assistant-panel-context-selectors .assistant-panel-selector[data-assistant-selector-id="conversation"]',
    );
    assert.include(sharedPanelCss, "flex: 6 1 0;");
    assert.include(sharedPanelCss, "flex: 0 0 max-content;");
    assert.include(sharedPanelCss, "min-width: max-content;");
    assert.include(sharedPanelCss, "height: 28px;");
    assert.include(sharedPanelCss, "line-height: 26px;");
    assert.include(sharedPanelCss, "padding-block: 0;");
    assert.include(
      sharedPanelCss,
      '.assistant-panel-reply-footer .assistant-panel-selector[data-assistant-selector-id="mode"]',
    );
    assert.include(sharedPanelCss, "flex: 3 1 0;");
    assert.include(
      sharedPanelCss,
      '.assistant-panel-reply-footer .assistant-panel-selector[data-assistant-selector-id="model"]',
    );
    assert.include(sharedPanelCss, "flex: 5 1 0;");
    assert.include(
      sharedPanelCss,
      '.assistant-panel-reply-footer .assistant-panel-selector[data-assistant-selector-id="reasoning"]',
    );
    assert.include(sharedPanelCss, "white-space: nowrap;");
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
    assert.include(assistantPanelModelJs, "conversation.usage || (run && run.usage) || null");
    assert.include(assistantPanelModelJs, 'hint: "Ctrl+Enter / Cmd+Enter to send"');
    assert.isBelow(
      acpChatHtml.indexOf('id="acp-transcript"'),
      acpChatHtml.indexOf('id="acp-chat-mode-plain"'),
      "Plain/Bubble controls should be inside the conversation overlay, not the top control bar",
    );
    assert.include(acpChatCss, ".acp-chat-banner");
    assert.include(acpChatCss, ".acp-conversation-window");
    assert.include(sharedPanelCss, ".asst-conversation-overlay-menu");
    assert.include(acpChatHtml, 'class="asst-button-compact"');
    assert.include(acpChatHtml, 'data-assistant-view-mode="plain"');
    assert.include(acpChatHtml, 'data-assistant-view-mode="bubble"');
    assert.include(sharedPanelCss, ".asst-conversation-overlay-menu:not(:hover):not(:focus-within)");
    assert.include(sharedPanelCss, '.asst-button-compact[aria-pressed="false"]');
    assert.include(sharedPanelCss, 'data-assistant-view-mode="plain"');
    assert.include(sharedPanelCss, "linear-gradient(currentColor, currentColor) 0 1px / 15px 2px no-repeat");
    assert.include(sharedPanelCss, 'data-assistant-view-mode="bubble"');
    assert.include(sharedPanelCss, "transform: translate(-62%, -62%);");
    assert.include(sharedPanelCss, "transform: translate(-38%, -38%);");
    assert.include(sharedPanelCss, "border-radius: 5px;");
    assert.notInclude(acpChatCss, ".acp-conversation-overlay-menu .asst-button-compact");
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
    assert.include(acpChatJs, "renderer.renderAssistantPanelSnapshot(projectPanelSnapshot");
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
    assert.include(assistantPanelModelJs, "buildAcpPermissionInteraction");
    assert.include(acpSkillRunJs, "function projectAcpSkillRunView(run)");
    assert.include(acpSkillRunJs, "projectAcpSkillRunConversationView(run || {})");
    assert.include(acpSkillRunJs, "const view = projectAcpSkillRunView(run)");
    assert.include(acpSkillRunJs, "assistantTranscriptRenderer()");
    assert.include(acpSkillRunJs, "renderer.renderAssistantTranscript");
    assert.include(acpSkillRunJs, 'variant: "acp-skill-run"');
    assert.include(acpSkillRunJs, "function assistantPanelModel()");
    assert.include(acpSkillRunJs, "function assistantPanelRenderer()");
    assert.include(acpSkillRunJs, "function projectAssistantPanelSnapshot(snapshot)");
    assert.include(acpSkillRunJs, "projectAcpSkillRunPanelSnapshot(snapshot || {})");
    assert.include(acpSkillRunJs, "function renderAssistantPanelRuntime(snapshot)");
    assert.include(acpSkillRunJs, "const panelSnapshot = projectAssistantPanelSnapshot(snapshot || {})");
    assert.include(acpSkillRunJs, "renderer.renderAssistantPanelSnapshot(panelSnapshot");
    assert.include(acpSkillRunJs, 'action === "toggle-drawer-section"');
    assert.include(acpSkillRunJs, "state.drawerCompletedCollapsed");
    assert.include(acpSkillRunJs, "function handleAssistantPanelAction(action, payload)");
    assert.include(acpSkillRunJs, "managed: true");
    assert.include(acpSkillRunJs, "managedRegions");
    assert.include(acpSkillRunJs, "toolbar: true");
    assert.include(acpSkillRunJs, "plan: true");
    assert.include(acpSkillRunJs, "hint: true");
    assert.include(acpSkillRunJs, "details: true");
    assert.include(acpSkillRunJs, 'action === "select-run"');
    assert.include(acpSkillRunJs, 'action === "reply" || action === "reply-run"');
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
    assert.include(runDialogJs, "function projectAssistantPanelSnapshot(envelope)");
    assert.include(runDialogJs, "projectSkillRunnerPanelSnapshot(source)");
    assert.include(runDialogJs, "renderer.renderAssistantPanelSnapshot(panelSnapshot");
    assert.include(runDialogJs, "managed: true");
    assert.include(runDialogJs, 'variant: "skillrunner"');
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
    assert.include(assistantSidebar, "__zsAssistantWorkspaceBridge");
    assert.include(assistantSidebar, "function installShellBridge(");
    assert.include(assistantSidebar, "function handleAssistantWorkspaceMessage(");
    assert.include(assistantSidebar, "AssistantWorkspaceBridgeResult");
    assert.include(assistantSidebar, "logAssistantShellAction");
    assert.include(assistantSidebar, 'component: "assistant-shell"');
    assert.include(assistantSidebar, 'return { ok: false, actionId, error: message }');
    assert.include(assistantSidebar, "clearShellBridge(host.library)");
    assert.include(assistantSidebar, "attachSkillRunnerSidebarHost");
    assert.include(assistantSidebar, "buildDecoratedSkillRunnerSnapshot");
    assert.include(assistantSidebar, "createSkillRunnerHostActionHandler");
    assert.include(assistantSidebar, "drawerOpen: false");
    assert.include(assistantSidebar, "drawerCompletedCollapsed: true");
    assert.include(assistantSidebar, 'open: host.drawerOpen');
    assert.include(assistantSidebar, 'action === "close-drawer"');
    assert.include(assistantSidebar, 'action === "toggle-drawer"');
    assert.include(assistantSidebar, "await startNewAcpConversation({ backendId });");
    assert.include(assistantSidebar, "buildAcpSidebarViewSnapshot");
    assert.include(assistantSidebar, "buildAcpSkillRunPanelSnapshot");
    assert.notInclude(assistantSidebar, "postShellInit(pane, host.activeTab);\n  postAcpChatSnapshot");
    assert.include(assistantSidebar, "replyAcpSkillRun");
    assert.include(assistantSidebar, "connectAcpSkillRun");
    assert.include(assistantSidebar, "disconnectAcpSkillRun");
    assert.include(assistantSidebar, "endAcpSkillRunSession");
    assert.notInclude(assistantSidebar, "Interactive ACP skill runs are not enabled yet.");
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
    assert.include(assistantTranscriptRendererJs, "function isAssistantTranscriptNearBottom(element, threshold)");
    assert.include(assistantTranscriptRendererJs, "const shouldStick = isAssistantTranscriptNearBottom");
    assert.include(assistantTranscriptRendererJs, "if (shouldStick) container.scrollTop = container.scrollHeight");
    assert.include(acpChatJs, "renderer.renderAssistantTranscript");
    assert.notInclude(acpSkillRunJs, "function renderPlan");
    assert.notInclude(acpSkillRunJs, "function renderHintWidget");
    assert.notInclude(acpSkillRunJs, "function renderBannerMetadata");
    assert.notInclude(acpSkillRunJs, "function renderContextActions");
    assert.notInclude(acpSkillRunJs, "function renderDetailsActions");
    assert.notInclude(acpSkillRunJs, "function renderReplyComposer");
    assert.notInclude(acpSkillRunJs, "function renderDetails");
    assert.notInclude(acpSkillRunJs, "renderStatusBar");
    assert.notInclude(acpSkillRunJs, "$(\"acp-skill-run-close-btn\")");
    assert.notInclude(acpSkillRunJs, "function renderPendingInteractionBanner");
    assert.notInclude(acpSkillRunJs, "function normalizeUiHintOptions");
    assert.include(acpSkillRunJs, 'sendAction("reply-run"');
    assert.notInclude(acpSkillRunJs, "(run.pendingInteraction && run.pendingInteraction.message) ||");
    assert.include(acpSkillRunJs, "runDrawerOpen");
    assert.include(acpSkillRunJs, "detailsOpen");
    assert.include(acpSkillRunJs, "pendingSelectedRequestId");
    assert.include(acpSkillRunJs, "function applyPendingSelection(snapshot)");
    assert.include(acpSkillRunJs, "state.pendingSelectedRequestId = requestId");
    assert.include(acpSkillRunJs, "function renderPanelRuntimeFailure(message)");
    assert.include(acpSkillRunJs, "ACP Skills panel renderer failed:");
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
    assert.include(assistantTranscriptRendererJs, 'typeof options.formatTime === "function"');
    assert.include(acpSkillRunJs, 'sendAction("select-run"');
    assert.include(acpSkillRunJs, 'action === "connect-run"');
    assert.include(acpSkillRunJs, 'action === "disconnect-run"');
    assert.include(acpSkillRunJs, 'action === "cancel-run"');
    assert.include(acpSkillRunJs, 'sendAction("reply-run"');
    assert.notInclude(acpSkillRunJs, "function submitReply()");
    assert.notInclude(acpSkillRunJs, ".requestSubmit()");
    assert.include(assistantPanelModelJs, '"copy-diagnostics"');
    assert.include(acpSkillRunCss, ".acp-skill-run-shell");
    assert.include(acpSkillRunCss, "grid-template-rows: auto auto minmax(0, 1fr);");
    assert.include(acpSkillRunCss, ".acp-skill-toolbar");
    assert.include(acpSkillRunCss, ".acp-skill-banner");
    assert.include(acpSkillRunCss, ".acp-skill-conversation-window");
    assert.include(acpSkillRunCss, ".acp-skill-plan-region");
    assert.include(acpSkillRunCss, ".acp-skill-hint-region");
    assert.include(acpSkillRunCss, ".acp-skill-reply-zone");
    assert.include(acpSkillRunCss, ".run-transcript");
    assert.notInclude(acpSkillRunCss, ".run-transcript.plain-mode");
    assert.notInclude(acpSkillRunCss, ".run-transcript.bubble-mode");
    assert.notInclude(acpSkillRunCss, ".transcript-row");
    assert.notInclude(acpSkillRunCss, ".assistant-panel-reply-input");
    assert.include(acpSkillRunCss, ".run-drawer .asst-drawer-panel");
    assert.notInclude(acpSkillRunCss, ".acp-skill-run-header");
    assert.notInclude(acpSkillRunCss, ".title-stack");
    assert.notInclude(acpSkillRunCss, ".header-actions");
    assert.notInclude(acpSkillRunCss, ".run-statusbar");
    assert.include(acpSkillRunCss, "--asst-bg");
    assert.include(acpSkillRunCss, "--asst-surface");
    assert.include(acpSkillRunCss, ".details-drawer");
    assert.notInclude(acpSkillRunCss, ".revision-badge");
    assert.notInclude(acpSkillRunCss, "\n.btn {");
    assert.notInclude(acpSkillRunCss, ".btn.primary");
    assert.notInclude(acpSkillRunCss, ".btn.danger");
    assert.include(acpSkillRunSidebar, "buildAcpSkillRunPanelSnapshot");
    assert.include(acpSkillRunSidebar, "cancelAcpSkillRun");
    assert.include(acpSkillRunSidebar, "replyAcpSkillRun");
    assert.include(acpSkillRunSidebar, "connectAcpSkillRun");
    assert.include(acpSkillRunSidebar, "disconnectAcpSkillRun");
    assert.include(acpSkillRunSidebar, "endAcpSkillRunSession");
    assert.include(acpSkillRunSidebar, "resolveAcpSkillRunPermissionRequest");
    assert.include(acpSkillRunSidebar, "selectAcpSkillRun");
    assert.include(acpSkillRunSidebar, 'postSnapshotToPane(host.reader, "acp-skill-run:snapshot")');
    assert.include(acpSkillRunSidebar, "subscribeAcpSkillRunSnapshots");
    assert.include(acpSkillRunSidebar, "acp-skill-run:init");
    assert.include(acpSkillRunSidebar, "acp-skill-run:snapshot");
    assert.include(acpSkillRunSidebar, "openAcpSkillRunnerSidebar");
    assert.include(acpSkillRunSidebar, "installAcpSkillRunnerSidebarShell");
    assert.include(acpSkillRunStore, "AcpSkillRunRecord");
    assert.include(acpSkillRunStore, "AcpSkillRunPanelSnapshot");
    assert.include(acpSkillRunStore, "AcpSkillRunTranscriptItem");
    assert.include(acpSkillRunStore, "recordAcpSkillRunSessionUpdate");
    assert.include(acpSkillRunStore, "projectAcpSkillRunOutputEnvelopeToTranscript");
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
    assert.include(assistantTranscriptRendererJs, "assistant-transcript-revision-badge");
    assert.notInclude(acpSkillRunJs, "outputRevisions");
    assert.notInclude(acpChatJs, "outputRevisions");
    assert.include(acpSkillRunStore, "setAcpSkillRunPermissionRequest");
    assert.include(acpSkillRunStore, "resolveAcpSkillRunPermissionRequest");
    assert.include(acpSkillRunner, "recoverAcpSkillRunConversation");
    assert.include(acpSkillRunner, "recordAcpSkillRunOutputRevision");
    assert.include(acpSkillRunner, "resumeSession");
    assert.include(acpSkillRunner, "loadSession");
    assert.include(sidebarHost, "__zsAcpSidebarBridge");
    assert.include(sidebarHost, "wrappedJSObject");
    assert.include(sidebarHost, "installSidebarPaneBridge");
    assert.include(sidebarHost, "buildAcpDiagnosticsBundle");
    assert.include(sidebarHost, "copyText");
    assert.include(sidebarHost, "schedulePostSnapshot");
    assert.include(sidebarHost, "postFreshSnapshotToPane");
    assert.include(sidebarHost, "await refreshAcpConversationBackends();");
    assert.include(sidebarHost, "set-active-backend");
    assert.include(sidebarHost, "archive-conversation");
    assert.include(sidebarHost, '"connect"');
    assert.include(sidebarHost, '"disconnect"');
    assert.include(sidebarHost, "await startNewAcpConversation({ backendId });");
    assert.include(sidebarHost, "set-reasoning-effort");
    assert.include(sidebarHost, "open-backend-manager");
    assert.include(sidebarHost, "set-chat-display-mode");
    assert.include(sidebarHost, "toggle-status-details");
    assert.include(sidebarHost, 'type: "acp:snapshot"');
    assert.include(sidebarModel, "chatDisplayMode");
    assert.include(sidebarModel, "statusExpanded");
    assert.include(sidebarModel, "agentWorkspaceDir");
    assert.include(sidebarModel, "conversationStorageDir");
    assert.include(sidebarModel, "sessionCwd");
    assert.include(assistantPanelModelJs, 'metadataItem("Workspace", snap.agentWorkspaceDir || snap.sessionCwd, "workspace")');
    assert.include(assistantPanelModelJs, 'detailEntry(labels.workspace || "Workspace", snap.agentWorkspaceDir || snap.sessionCwd)');
    assert.notInclude(assistantPanelModelJs, 'detailEntry(labels.sessionCwd || "Session cwd", snap.sessionCwd)');
    assert.notInclude(assistantPanelModelJs, 'detailEntry(labels.runtime || "Runtime", snap.runtimeDir)');
    assert.notInclude(assistantPanelModelJs, 'metadataItem("Workspace", snap.workspaceDir, "workspace")');
    assert.notInclude(assistantPanelModelJs, 'detailEntry(labels.workspace || "Workspace", snap.workspaceDir)');
    assert.notInclude(assistantPanelModelJs, 'metadataItem("Workspace", snap.sessionCwd || snap.workspaceDir');
    assert.notInclude(assistantPanelModelJs, 'detailEntry(labels.workspace || "Workspace", snap.sessionCwd || snap.workspaceDir)');
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
    assert.include(skillRunnerSidebar, 'from "./sidebarBrowserHost"');
  });

  it("adds localized ACP labels for dashboard and sidebar actions", async function () {
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");

    assert.include(en, "task-dashboard-home-acp-title = ACP Chat");
    assert.include(en, "task-dashboard-home-acp-open = Open Chat");
    assert.include(en, "task-dashboard-sidebar-assistant = Assistant");
    assert.include(en, "task-dashboard-home-acp-skill-runs-title = ACP Skill Runs");
    assert.include(en, "task-dashboard-home-acp-skill-runs-open = Open Runs");
    assert.include(en, "task-dashboard-acp-backend-title = ACP Backend");
    assert.include(en, "task-dashboard-acp-manage-backends = Manage Backends");
    assert.include(en, "task-dashboard-acp-reasoning = Reasoning");
    assert.include(en, "task-dashboard-acp-conversation = Conversation");
    assert.include(en, "task-dashboard-acp-remote-session = Remote session");
    assert.include(en, "task-dashboard-acp-remote-restore = Remote restore");
    assert.include(en, "task-dashboard-acp-new-conversation = New Conversation");
    assert.include(en, "task-dashboard-acp-rename-conversation = Rename Conversation");
    assert.include(en, "task-dashboard-acp-session-manager = Sessions");
    assert.include(en, "task-dashboard-acp-session-show-more = Show more...");
    assert.include(en, "task-dashboard-acp-archive-conversation = Archive");
    assert.include(en, "task-dashboard-acp-connect = Connect");
    assert.include(en, "task-dashboard-acp-disconnect = Disconnect");
    assert.include(zh, "task-dashboard-home-acp-title = ACP 对话");
    assert.include(zh, "task-dashboard-home-acp-open = 打开对话");
    assert.include(zh, "task-dashboard-sidebar-assistant = Assistant");
    assert.include(zh, "task-dashboard-home-acp-skill-runs-title = ACP Skill 运行");
    assert.include(zh, "task-dashboard-home-acp-skill-runs-open = 打开运行面板");
    assert.include(zh, "task-dashboard-acp-backend-title = ACP 后端");
    assert.include(zh, "task-dashboard-acp-manage-backends = 管理后端");
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

  it("keeps managed ACP Chat selectors populated with typed payload keys", async function () {
    const model = await loadAssistantPanelModelForSmoke();
    const panel = model.projectAcpChatPanelSnapshot({
      status: "connected",
      sessionId: "session-1",
      activeBackendId: "backend-a",
      backendOptions: [{ backendId: "backend-a", displayName: "Backend A" }],
      activeConversationId: "conversation-a",
      chatSessions: [
        { conversationId: "conversation-a", backendId: "backend-a", title: "A" },
        { conversationId: "conversation-b", backendId: "backend-a", title: "B" },
      ],
      modeOptions: [{ id: "bypassPermissions", label: "Bypass permissions" }],
      currentMode: { id: "bypassPermissions", label: "Bypass permissions" },
      displayModelOptions: [{ id: "opus", label: "Opus" }],
      currentDisplayModel: { id: "opus", label: "Opus" },
      reasoningEffortOptions: [{ id: "high", label: "High" }],
      currentReasoningEffort: { id: "high", label: "High" },
      authMethods: [],
      items: [],
      labels: {},
    });
    const conversationSelector = panel.context.selectors.find(
      (entry: any) => entry.id === "conversation",
    );
    assert.deepEqual(
      conversationSelector.options.map((entry: any) => [entry.value, entry.backendId]),
      [
        ["conversation-a", "backend-a"],
        ["conversation-b", "backend-a"],
      ],
    );
    assert.equal(panel.drawers.layout, "workspace-task-drawer");
    assert.equal(panel.drawers.sections[0].id, "sessions");
    assert.equal(panel.drawers.sections[0].groups[0].backendDisplayName, "Backend A");
    assert.equal(panel.drawers.sections[0].groups[0].activeTasks[0].conversationId, "conversation-a");
    assert.equal(panel.drawers.sections[0].groups[0].activeTasks[0].action, "set-active-conversation");
    assert.deepEqual(panel.drawers.sections[0].groups[0].activeTasks[0].payload, {
      conversationId: "conversation-a",
      backendId: "backend-a",
    });
    assert.deepEqual(panel.drawers.sections[0].groups[0].activeTasks[0].itemActions[0].payload, {
      conversationId: "conversation-a",
      backendId: "backend-a",
    });
    assert.equal(panel.drawers.sections[0].groups[0].activeTasks[0].itemActions[0].action, "archive-conversation");
    const controls = panel.reply.controls;
    assert.lengthOf(controls, 3);
    assert.deepEqual(
      controls.map((entry: any) => [entry.id, entry.value, entry.payloadKey, entry.options.length]),
      [
        ["mode", "bypassPermissions", "modeId", 1],
        ["model", "opus", "modelId", 1],
        ["reasoning", "high", "effortId", 1],
      ],
    );

    const remoteOnlyPanel = model.projectAcpChatPanelSnapshot({
      status: "idle",
      sessionId: "",
      remoteSessionId: "remote-session-1",
      activeBackendId: "backend-a",
      backendOptions: [{ backendId: "backend-a", displayName: "Backend A", connected: false }],
      activeConversationId: "conversation-a",
      chatSessions: [{ conversationId: "conversation-a", backendId: "backend-a", title: "A" }],
      authMethods: [{ id: "device", name: "Device login" }],
      items: [],
      labels: {},
    });
    const remoteActions = Object.fromEntries(
      remoteOnlyPanel.context.actions.map((entry: any) => [entry.id || entry.action, entry]),
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
      authRequiredPanel.context.actions.map((entry: any) => [entry.id || entry.action, entry]),
    );
    assert.equal(authActions.authenticate.enabled, true);
    assert.equal(authActions.authenticate.payload.backendId, "backend-a");
    assert.equal(authActions.authenticate.payload.methodId, "device");

    const connectingPanel = model.projectAcpChatPanelSnapshot({
      status: "initializing",
      activeBackendId: "backend-a",
      backendOptions: [{ backendId: "backend-a", displayName: "Backend A" }],
      mcpHealth: { state: "listening", severity: "ok", summary: "MCP ready" },
      items: [],
      labels: {},
    });
    assert.equal(connectingPanel.interaction.kind, "hidden");
    assert.deepEqual(
      connectingPanel.context.indicators.map((entry: any) => [entry.id, entry.value, entry.tone]),
      [
        ["connection", "Connecting", "accent"],
        ["mcp", "Ready", "success"],
      ],
    );

    const busyPanel = model.projectAcpChatPanelSnapshot({
      status: "connected",
      busy: true,
      sessionId: "session-1",
      activeBackendId: "backend-a",
      backendOptions: [{ backendId: "backend-a", displayName: "Backend A" }],
      items: [],
      labels: {},
    });
    assert.equal(busyPanel.interaction.kind, "running");

    const skillPanel = model.projectAcpSkillRunPanelSnapshot({
      mcpHealth: { state: "listening", severity: "ok", summary: "MCP ready" },
      selectedRun: {
        requestId: "acp-skill-1",
        status: "running",
        conversationState: "active",
        sessionId: "session-1",
        transcriptItems: [],
      },
      runs: [
        {
          requestId: "acp-skill-1",
          status: "running",
          workflowLabel: "Digest",
          skillId: "literature-digest",
          backendId: "backend-a",
          backendLabel: "Backend A",
        },
        {
          requestId: "acp-skill-2",
          status: "succeeded",
          workflowLabel: "Explain",
          skillId: "literature-explainer",
          backendId: "backend-a",
          backendLabel: "Backend A",
        },
      ],
      logs: [],
    });
    assert.deepEqual(
      skillPanel.context.indicators.map((entry: any) => [entry.id, entry.value, entry.tone]),
      [
        ["connection", "Connected", "success"],
        ["mcp", "Ready", "success"],
      ],
    );
    assert.equal(skillPanel.drawers.layout, "workspace-task-drawer");
    assert.equal(skillPanel.drawers.sections[0].id, "running");
    assert.equal(skillPanel.drawers.sections[1].id, "completed");
    assert.equal(skillPanel.drawers.sections[1].collapsed, true);
    assert.equal(skillPanel.drawers.sections[0].groups[0].backendDisplayName, "Backend A");
    assert.equal(skillPanel.drawers.sections[0].groups[0].activeTasks[0].requestId, "acp-skill-1");
    assert.equal(skillPanel.drawers.sections[0].groups[0].activeTasks[0].action, "select-run");
    assert.deepEqual(skillPanel.drawers.sections[0].groups[0].activeTasks[0].payload, {
      requestId: "acp-skill-1",
    });
    assert.isUndefined(skillPanel.drawers.sections[0].groups[0].activeTasks[0].itemActions[0]);
    assert.equal(skillPanel.drawers.sections[1].groups[0].finishedTasks[0].requestId, "acp-skill-2");
    assert.equal(
      skillPanel.drawers.sections[1].groups[0].finishedTasks[0].itemActions[0].action,
      "archive-run",
    );
    assert.deepEqual(skillPanel.drawers.sections[1].groups[0].finishedTasks[0].itemActions[0].payload, {
      requestId: "acp-skill-2",
    });
    const skillActions = Object.fromEntries(
      skillPanel.context.actions.map((entry: any) => [entry.id || entry.action, entry]),
    );
    assert.equal(skillActions["connect-run"].enabled, false);
    assert.equal(skillActions["disconnect-run"].enabled, true);
    assert.equal(skillActions["cancel-run"].enabled, true);
    assert.equal(skillActions["cancel-run"].label, "Cancel Run");
    assert.notProperty(skillActions, "end-session");

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
      terminalSkillPanel.context.actions.map((entry: any) => [entry.id || entry.action, entry]),
    );
    assert.equal(terminalSkillActions["cancel-run"].enabled, false);

    const detachedSkillPanel = model.projectAcpSkillRunPanelSnapshot({
      selectedRun: {
        requestId: "acp-skill-detached",
        status: "running",
        conversationState: "closed",
        conversationRecoveryState: "available",
        sessionId: "session-detached",
        transcriptItems: [],
      },
      runs: [],
      logs: [],
    });
    const detachedActions = Object.fromEntries(
      detachedSkillPanel.context.actions.map((entry: any) => [entry.id || entry.action, entry]),
    );
    assert.equal(detachedActions["connect-run"].enabled, true);
    assert.equal(detachedActions["disconnect-run"].enabled, false);

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
    assert.include(assistantPanelRendererJs, "function renderContextEntry(parent, entry, depth)");
    assert.include(assistantPanelRendererJs, "function renderAssistantWorkspaceTaskAction");
    assert.include(assistantPanelRendererJs, "event.stopPropagation()");
    assert.include(assistantPanelRendererJs, "assistant-workspace-drawer-task-actions");
    assert.include(assistantPanelRendererJs, "assistant-workspace-drawer-task-action");
    assert.include(assistantPanelRendererJs, 'entry && entry.active ? " is-active" : ""');
    assert.include(assistantPanelRendererJs, "--assistant-context-depth");
    assert.include(assistantPanelRendererJs, "renderAssistantWorkspaceTaskDrawer");
    assert.include(assistantPanelRendererJs, 'safeText(panel.drawers && panel.drawers.layout) === "workspace-task-drawer"');
    assert.include(sharedPanelCss, ".assistant-panel-context-entry.is-group");
    assert.include(sharedPanelCss, ".assistant-panel-context-entry.is-active");
    assert.include(sharedPanelCss, ".assistant-workspace-drawer-section");
    assert.include(sharedPanelCss, ".assistant-workspace-drawer-section.is-completed");
    assert.include(sharedPanelCss, ".assistant-workspace-drawer-task");
    assert.include(sharedPanelCss, ".assistant-workspace-drawer-task-action.is-archive::before");
    assert.include(sharedPanelCss, ".assistant-workspace-drawer-task-action.is-archive::after");
    assert.include(sharedPanelCss, "align-content: start;");
    assert.include(sharedPanelCss, "height: 34px;");
    assert.include(sharedPanelCss, "border-radius: var(--asst-radius-sm);");
    assert.include(sharedPanelCss, ".asst-conversation-overlay-menu .asst-button-compact[aria-pressed=\"true\"]");
    assert.include(sharedPanelCss, "border-color: var(--asst-accent);");
    assert.include(acpChatCss, ".acp-chat-drawer .asst-drawer-panel");
    assert.include(acpChatCss, "left: 0;");
    assert.include(acpChatCss, "border-right: 1px solid var(--asst-line);");
    assert.include(sharedPanelCss, "border-radius: var(--asst-radius-md);");
    assert.notInclude(sharedPanelCss, ".asst-button,\n.asst-button-compact,\n.asst-icon-button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 6px;\n  border: 1px solid var(--asst-line-strong);\n  border-radius: var(--asst-radius-pill);");
    assert.notInclude(acpSkillRunCss, ".asst-button {");
    assert.notInclude(runDialogCss, ".asst-button {");
  });
});

import { assert } from "chai";
import { getProjectRoot, joinPath, readUtf8 } from "../zotero/workflow-test-utils";

async function readProjectFile(relativePath: string) {
  const targetPath = joinPath(getProjectRoot(), relativePath);
  return readUtf8(targetPath);
}

describe("skillrunner run dialog managed ui alignment", function () {
  it("uses the shared managed six-region scaffold instead of the legacy card layout", async function () {
    const html = await readProjectFile("addon/content/dashboard/run-dialog.html");

    assert.include(html, 'id="skillrunner-toolbar"');
    assert.include(html, 'id="skillrunner-banner"');
    assert.include(html, 'id="skillrunner-conversation-window"');
    assert.include(html, 'id="skillrunner-plan"');
    assert.include(html, 'id="skillrunner-hint"');
    assert.include(html, 'id="reply-form"');
    assert.include(html, 'id="skillrunner-drawer"');
    assert.include(html, 'id="skillrunner-details"');
    assert.include(html, 'id="chat-panel"');
    assert.include(html, 'id="chat-mode-plain"');
    assert.include(html, 'id="chat-mode-bubble"');
    assert.include(html, "./assistant-panel-shared.css");
    assert.include(html, "./assistant-conversation-view.js");
    assert.include(html, "./assistant-transcript-renderer.js");
    assert.include(html, "./assistant-panel-model.js");
    assert.include(html, "./assistant-panel-renderer.js");
    assert.include(html, 'src="./chat_thinking_core.js?v=');
    assert.include(html, 'vendor/markdown-it/markdown-it.min.js');
    assert.include(html, 'vendor/katex/katex.min.css');
    assert.include(html, 'vendor/katex/katex.min.js');
    assert.include(html, 'vendor/markdown-it-texmath/texmath.min.js');

    assert.notInclude(html, 'id="workspace-groups"');
    assert.notInclude(html, 'id="sessions-toggle-btn"');
    assert.notInclude(html, 'id="close-sidebar-btn"');
    assert.notInclude(html, 'id="prompt-card"');
    assert.notInclude(html, 'id="auth-card"');
    assert.notInclude(html, 'id="final-summary-status"');
    assert.notInclude(html, 'id="reply-composer"');
    assert.notInclude(html, 'id="reply-text"');
    assert.notInclude(html, 'class="conversation-card"');
  });

  it("projects SkillRunner snapshots into AssistantPanelSnapshot and uses the shared renderer", async function () {
    const modelJs = await readProjectFile("addon/content/dashboard/assistant-panel-model.js");
    const rendererJs = await readProjectFile("addon/content/dashboard/assistant-panel-renderer.js");
    const runDialogJs = await readProjectFile("addon/content/dashboard/run-dialog.js");

    assert.include(modelJs, "function projectSkillRunnerPanelSnapshot(snapshot)");
    assert.include(modelJs, "buildSkillRunnerConversationView(session)");
    assert.include(modelJs, "isSkillRunnerToolProcess(processType)");
    assert.include(modelJs, "function skillRunnerToolDisplay(source, processType)");
    assert.include(modelJs, "function skillRunnerToolDetails(source)");
    assert.include(modelJs, "compactSkillRunnerToolValue(tool.details.path)");
    assert.include(modelJs, "compactSkillRunnerToolValue(tool.details.pattern)");
    assert.include(modelJs, 'value === "tool_call" || value === "command_execution"');
    assert.include(modelJs, 'kind: "tool"');
    assert.include(modelJs, "buildSkillRunnerPendingInteraction(session, status)");
    assert.include(modelJs, "buildSkillRunnerContexts(envelope)");
    assert.include(modelJs, "buildSkillRunnerDetails(envelope, session)");
    assert.include(modelJs, 'kind: "skillrunner"');
    assert.include(modelJs, 'layout: "skillrunner-workspace"');
    assert.include(modelJs, 'contextTitle: "Runs"');
    assert.include(modelJs, "skillrunnerSections:");
    assert.include(modelJs, "decorateSkillRunnerWorkspaceSections");
    assert.include(modelJs, '"archive-run"');
    assert.include(modelJs, "selectedTaskKey:");
    assert.include(modelJs, 'action: "open-context-drawer"');
    assert.include(modelJs, 'action: "openDetails"');
    assert.include(modelJs, '"cancel-run"');

    assert.include(rendererJs, "renderAssistantPanelSnapshot");
    assert.include(rendererJs, "renderAssistantBanner");
    assert.include(rendererJs, "renderAssistantHint");
    assert.include(rendererJs, "renderAssistantReply");
    assert.include(rendererJs, "renderAssistantContextDrawer");
    assert.include(rendererJs, "renderDetailsDrawer");
    assert.include(rendererJs, "renderAssistantWorkspaceTaskDrawer");
    assert.include(rendererJs, "renderAssistantWorkspaceTaskAction");
    assert.include(rendererJs, "event.stopPropagation()");
    assert.include(rendererJs, 'sectionId === "completed" ? " is-completed" : " is-running"');
    assert.include(rendererJs, 'toggle.setAttribute("aria-expanded", sectionCollapsed ? "false" : "true")');
    assert.include(rendererJs, 'emit(options, "toggle-drawer-section", { sectionId: "completed" })');
    assert.include(rendererJs, 'emit(options, item.action || "select-task", item.payload || { taskKey })');
    assert.include(rendererJs, 'emit(options, "close-context-drawer", {})');
    assert.include(rendererJs, 'emit(options, "auth-import-run"');

    assert.include(runDialogJs, "function assistantPanelModel()");
    assert.include(runDialogJs, "function assistantPanelRenderer()");
    assert.include(runDialogJs, "function assistantTranscriptRenderer()");
    assert.include(runDialogJs, "function projectAssistantPanelSnapshot(envelope)");
    assert.include(runDialogJs, "projectSkillRunnerPanelSnapshot(source)");
    assert.include(runDialogJs, "function skillRunnerToolDisplay(source, processType)");
    assert.include(runDialogJs, "function skillRunnerToolDetails(source)");
    assert.include(runDialogJs, "compactSkillRunnerToolValue(tool.details.path)");
    assert.include(runDialogJs, "compactSkillRunnerToolValue(tool.details.pattern)");
    assert.include(runDialogJs, "renderer.renderAssistantPanelSnapshot(panelSnapshot");
    assert.include(runDialogJs, "managed: true");
    assert.include(runDialogJs, "toolbar: true");
    assert.include(runDialogJs, "banner: true");
    assert.include(runDialogJs, "hint: true");
    assert.include(runDialogJs, "reply: true");
    assert.include(runDialogJs, "drawer: true");
    assert.include(runDialogJs, "details: true");
  });

  it("keeps SkillRunner action semantics while routing through the managed envelope", async function () {
    const js = await readProjectFile("addon/content/dashboard/run-dialog.js");
    const modelJs = await readProjectFile("addon/content/dashboard/assistant-panel-model.js");

    assert.include(js, "__zsSkillRunnerSidebarBridge");
    assert.include(js, "window.wrappedJSObject");
    assert.include(js, 'sendAction("ready"');
    assert.include(js, 'sendAction("reply-run"');
    assert.include(js, 'sendAction("auth-import-run"');
    assert.include(js, 'sendAction("cancel-run"');
    assert.include(js, 'sendAction("archive-run"');
    assert.include(js, 'sendAction("select-task"');
    assert.include(js, 'sendAction("close-drawer", {});\n      sendAction("select-task"');
    assert.include(js, 'sendAction("toggle-drawer"');
    assert.include(js, 'sendAction("close-drawer"');
    assert.include(js, 'action === "open-context-drawer"');
    assert.include(js, 'action === "close-context-drawer"');
    assert.include(js, 'action === "select-task"');
    assert.include(js, 'action === "cancel" || action === "cancel-run"');
    assert.include(js, 'action === "archive-run"');
    assert.include(js, 'action === "reply" || action === "reply-run"');
    assert.include(js, 'action === "auth-import-run"');
    assert.include(js, 'mode: "interaction"');
    assert.include(js, 'mode: "auth"');
    assert.include(modelJs, 'kind: "auth_method"');
    assert.include(js, '"auth_code_or_url"');
    assert.include(js, "responseValue: matchedOption.value");
  });

  it("keeps auth import file handling page-local while shared renderer owns visible controls", async function () {
    const rendererJs = await readProjectFile("addon/content/dashboard/assistant-panel-renderer.js");
    const js = await readProjectFile("addon/content/dashboard/run-dialog.js");

    assert.include(rendererJs, 'data-assistant-auth-import-file');
    assert.include(rendererJs, 'data-assistant-auth-import-name');
    assert.include(rendererJs, "assistant-panel-auth-import");
    assert.include(rendererJs, '"Import and Continue"');

    assert.include(js, "function readAuthImportFiles()");
    assert.include(js, 'querySelectorAll("input[data-assistant-auth-import-file]")');
    assert.include(js, "new FileReader()");
    assert.include(js, "reader.readAsDataURL(file)");
    assert.include(js, "contentBase64");
    assert.notInclude(js, "function renderAuthCard");
    assert.notInclude(js, "authCardEl");
  });

  it("uses shared transcript rendering with SkillRunner revision metadata preserved as badges/details", async function () {
    const transcriptRendererJs = await readProjectFile("addon/content/dashboard/assistant-transcript-renderer.js");
    const js = await readProjectFile("addon/content/dashboard/run-dialog.js");
    const css = await readProjectFile("addon/content/dashboard/run-dialog.css");

    assert.include(transcriptRendererJs, "data-assistant-panel-kind");
    assert.include(transcriptRendererJs, "assistant-transcript-revision-badge");
    assert.include(transcriptRendererJs, "assistant-transcript-row");
    assert.include(js, "createCompatibleThinkingChatModel(state.chatDisplayMode)");
    assert.include(js, "buildSkillRunnerToolItem(");
    assert.include(js, "isSkillRunnerToolProcess(processType)");
    assert.include(js, 'entry.type === "revision"');
    assert.include(js, 'kind.trim().toLowerCase() !== "assistant_revision"');
    assert.include(js, 'variant: "skillrunner"');
    assert.include(js, "renderMarkdown");
    assert.notInclude(css, ".revision-badge");
    assert.notInclude(js, "function renderRevisionEntry");
    assert.notInclude(css, ".revision-bubble");
  });

  it("keeps conversation as the stretching content area and removes legacy button/card systems", async function () {
    const css = await readProjectFile("addon/content/dashboard/run-dialog.css");
    const sharedCss = await readProjectFile("addon/content/dashboard/assistant-panel-shared.css");

    assert.include(css, ".skillrunner-panel-shell");
    assert.include(css, "grid-template-rows: auto auto minmax(0, 1fr);");
    assert.include(css, ".skillrunner-main");
    assert.include(css, "grid-template-rows: minmax(0, 1fr) auto auto auto;");
    assert.include(css, ".skillrunner-conversation-window");
    assert.include(css, ".skillrunner-transcript");
    assert.notInclude(css, ".skillrunner-transcript.plain-mode");
    assert.notInclude(css, ".skillrunner-transcript.bubble-mode");
    assert.notInclude(css, ".transcript-row");
    assert.notInclude(css, ".assistant-panel-reply-input");
    assert.include(css, ".skillrunner-drawer .asst-drawer-panel");
    assert.include(sharedCss, ".assistant-workspace-drawer-section");
    assert.include(sharedCss, ".assistant-workspace-drawer-task");
    assert.include(sharedCss, "align-content: start;");
    assert.include(sharedCss, "height: 34px;");
    assert.notInclude(css, ".skillrunner-workspace-section {");
    assert.notInclude(css, ".skillrunner-workspace-task {");
    assert.notInclude(css, "\n.btn {");
    assert.notInclude(css, ".conversation-card");
    assert.notInclude(css, ".prompt-card");
    assert.notInclude(css, "#reply-composer");
  });

  it("keeps host-side run state sync and backend semantics unchanged", async function () {
    const hostTs = await readProjectFile("src/modules/skillRunnerRunDialog.ts");

    assert.include(hostTs, "const refreshRunState = async () =>");
    assert.include(hostTs, "entry.refreshState = () =>");
    assert.include(hostTs, "entry.refreshDisplay = () =>");
    assert.include(hostTs, "syncSessionStateFromLedger(entry)");
    assert.include(hostTs, "subscribeSkillRunnerSessionState");
    assert.include(hostTs, "await syncPendingState()");
    assert.include(hostTs, "ensureSkillRunnerSessionSync");
    assert.include(hostTs, "streamRunChat");
    assert.include(hostTs, "restartSessionSyncAfterWaitingExit");
    assert.include(hostTs, "hasRunDialogWaitingAuthExited");
    assert.notInclude(hostTs, "runWorkspaceState.refreshTimer = dialogWindow.setInterval");
  });
});

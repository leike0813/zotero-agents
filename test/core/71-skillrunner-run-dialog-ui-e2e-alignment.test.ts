import { assert } from "chai";
import {
  getProjectRoot,
  joinPath,
  readUtf8,
} from "../zotero/workflow-test-utils";

async function readProjectFile(relativePath: string) {
  const targetPath = joinPath(getProjectRoot(), relativePath);
  return readUtf8(targetPath);
}

describe("skillrunner run dialog managed ui alignment", function () {
  it("converges jobs endpoint terminal and waiting states during metadata sync", async function () {
    const source = await readProjectFile("src/modules/skillRunnerRunDialog.ts");

    assert.match(
      source,
      /const run = await client\.getRun\(\{\s*requestId: entry\.requestId,\s*\}\)/,
    );
    assert.match(
      source,
      /resolveSkillRunnerManagementResponseSemantic\(\{\s*response: run,/,
    );
    assert.match(
      source,
      /isTerminal\(observedStatus\) \|\| isWaiting\(observedStatus\)/,
    );
    assert.match(
      source,
      /applyManagementStatusToRunDialogEntry\(\{\s*entry,\s*status: observedStatus,\s*source: "run-dialog-meta"/,
    );
    assert.match(
      source,
      /if \(isTerminal\(status\) \|\| isWaiting\(status\)\) \{\s*abortCurrentChatStream\(\);\s*stopSessionSync\(\{/,
    );
  });

  it("uses the shared managed six-region scaffold instead of the legacy card layout", async function () {
    const html = await readProjectFile("addon/content/sidebar/run-dialog.html");

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
    assert.include(html, "../shared/assistant/assistant-panel-shared.css");
    assert.include(html, "../shared/assistant/assistant-conversation-view.js");
    assert.include(
      html,
      "../shared/assistant/assistant-transcript-renderer.js",
    );
    assert.include(html, "../shared/assistant/assistant-panel-model.js");
    assert.include(html, "../shared/assistant/assistant-panel-renderer.js");
    assert.include(html, 'src="./chat_thinking_core.js?v=');
    assert.include(html, "vendor/markdown-it/markdown-it.min.js");
    assert.include(html, "vendor/katex/katex.min.css");
    assert.include(html, "vendor/katex/katex.min.js");
    assert.include(html, "vendor/markdown-it-texmath/texmath.min.js");

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
    const modelJs = await readProjectFile(
      "addon/content/shared/assistant/assistant-panel-model.js",
    );
    const rendererJs = await readProjectFile(
      "addon/content/shared/assistant/assistant-panel-renderer.js",
    );
    const runDialogJs = await readProjectFile(
      "addon/content/sidebar/run-dialog.js",
    );

    assert.include(
      modelJs,
      "function projectSkillRunnerPanelSnapshot(snapshot)",
    );
    assert.include(
      modelJs,
      "buildSkillRunnerConversationView(session, envelope)",
    );
    assert.include(modelJs, "isSkillRunnerToolProcess(processType)");
    assert.include(
      modelJs,
      "function skillRunnerToolDisplay(source, processType)",
    );
    assert.include(modelJs, "function skillRunnerToolDetails(source)");
    assert.include(modelJs, "compactSkillRunnerToolValue(tool.details.path)");
    assert.include(
      modelJs,
      "compactSkillRunnerToolValue(tool.details.pattern)",
    );
    assert.include(
      modelJs,
      'value === "tool_call" || value === "command_execution"',
    );
    assert.include(modelJs, 'kind: "tool"');
    assert.include(modelJs, "buildSkillRunnerPendingInteraction(");
    assert.include(modelJs, "session,");
    assert.include(modelJs, "status,");
    assert.include(modelJs, "envelope,");
    assert.include(modelJs, "buildSkillRunnerContexts(envelope)");
    assert.include(modelJs, "buildSkillRunnerDetails(envelope, session)");
    assert.include(modelJs, "Conversation Summary");
    assert.include(modelJs, "Revision Summary");
    assert.notInclude(modelJs, 'detailSection("Raw Snapshot"');
    assert.include(modelJs, 'kind: "skillrunner"');
    assert.include(modelJs, 'layout: "skillrunner-workspace"');
    assert.include(
      modelJs,
      'contextTitle: labelFrom(envelope, "actions.runs", "Runs")',
    );
    assert.include(modelJs, "skillrunnerSections:");
    assert.include(modelJs, "decorateSkillRunnerWorkspaceSections");
    assert.notInclude(
      modelJs,
      "function buildSkillRunnerSectionsFromWorkspace(envelope)",
    );
    assert.include(modelJs, '"archive-run"');
    assert.include(modelJs, "selectedTaskKey:");
    assert.include(modelJs, 'action: "open-context-drawer"');
    assert.include(modelJs, 'action: "openDetails"');
    assert.include(modelJs, 'action: "open-backend-manager"');
    assert.include(modelJs, 'action: "copy-request-id"');
    assert.include(modelJs, '"cancel-run"');

    assert.include(rendererJs, "renderAssistantPanelSnapshot");
    assert.include(rendererJs, "renderAssistantBanner");
    assert.include(rendererJs, "renderAssistantHint");
    assert.include(rendererJs, "renderAssistantReply");
    assert.include(rendererJs, "renderAssistantContextDrawer");
    assert.include(rendererJs, "renderDetailsDrawer");
    assert.include(rendererJs, "function renderDetailsSection");
    assert.include(rendererJs, '"assistant-panel-details-section-summary"');
    assert.include(rendererJs, '"assistant-panel-details-section-body"');
    assert.include(rendererJs, "renderAssistantWorkspaceTaskDrawer");
    assert.include(rendererJs, "renderAssistantWorkspaceTaskAction");
    assert.include(rendererJs, "event.stopPropagation()");
    assert.include(
      rendererJs,
      'sectionId === "completed" ? " is-completed" : " is-running"',
    );
    assert.match(
      rendererJs,
      /toggle\.setAttribute\(\s*"aria-expanded",\s*sectionCollapsed\s*\?\s*"false"\s*:\s*"true",?\s*\)/,
    );
    assert.include(
      rendererJs,
      'emit(options, "toggle-drawer-section", { sectionId: "completed" })',
    );
    assert.match(
      rendererJs,
      /emit\(\s*options,\s*item\.action \|\| "select-task",\s*item\.payload \|\| \{ taskKey \},?\s*\)/,
    );
    assert.include(rendererJs, 'emit(options, "close-context-drawer", {})');
    assert.include(rendererJs, 'emit(options, "auth-import-run"');

    assert.include(runDialogJs, "function assistantPanelModel()");
    assert.include(runDialogJs, "function assistantPanelRenderer()");
    assert.include(runDialogJs, "function assistantTranscriptRenderer()");
    assert.include(
      runDialogJs,
      "function projectAssistantPanelSnapshot(envelope)",
    );
    assert.include(runDialogJs, "projectSkillRunnerPanelSnapshot(source)");
    assert.include(
      runDialogJs,
      "function skillRunnerToolDisplay(source, processType)",
    );
    assert.include(runDialogJs, "function skillRunnerToolDetails(source)");
    assert.include(
      runDialogJs,
      "compactSkillRunnerToolValue(tool.details.path)",
    );
    assert.include(
      runDialogJs,
      "compactSkillRunnerToolValue(tool.details.pattern)",
    );
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
    assert.include(runDialogJs, "toolbar: true");
    assert.include(runDialogJs, "banner: true");
    assert.include(runDialogJs, "hint: true");
    assert.include(runDialogJs, "reply: true");
    assert.include(runDialogJs, "drawer: true");
    assert.include(runDialogJs, "details: true");
  });

  it("keeps SkillRunner action semantics while routing through the managed envelope", async function () {
    const js = await readProjectFile("addon/content/sidebar/run-dialog.js");
    const modelJs = await readProjectFile(
      "addon/content/shared/assistant/assistant-panel-model.js",
    );

    assert.include(js, "__zsSkillRunnerSidebarBridge");
    assert.include(js, "window.wrappedJSObject");
    assert.include(js, 'sendAction("ready"');
    assert.include(js, 'sendAction("reply-run"');
    assert.match(js, /sendAction\(\s*"resolve-permission"/);
    assert.include(js, 'sendAction("auth-import-run"');
    assert.include(js, 'sendAction("cancel-run"');
    assert.include(js, 'sendAction("archive-run"');
    assert.include(js, 'sendAction("select-task"');
    assert.include(
      js,
      'sendAction("close-drawer", {});\n      sendAction("select-task"',
    );
    assert.include(js, 'sendAction("toggle-drawer"');
    assert.include(js, 'sendAction("close-drawer"');
    assert.include(js, 'action === "open-context-drawer"');
    assert.include(js, 'action === "close-context-drawer"');
    assert.include(js, 'action === "select-task"');
    assert.include(js, 'action === "cancel" || action === "cancel-run"');
    assert.include(js, 'action === "archive-run"');
    assert.notInclude(js, "taskKey: runKey");
    assert.notInclude(modelJs, "{ runKey: taskKey, taskKey }");
    assert.include(js, 'action === "reply" || action === "reply-run"');
    assert.include(js, 'action === "resolve-permission"');
    assert.include(js, 'action === "auth-import-run"');
    assert.include(js, 'mode: "interaction"');
    assert.include(js, 'mode: "auth"');
    assert.include(modelJs, 'kind: "auth_method"');
    assert.include(js, '"auth_code_or_url"');
    assert.include(js, "responseValue: matchedOption.value");
  });

  it("keeps auth import file handling page-local while shared renderer owns visible controls", async function () {
    const rendererJs = await readProjectFile(
      "addon/content/shared/assistant/assistant-panel-renderer.js",
    );
    const js = await readProjectFile("addon/content/sidebar/run-dialog.js");

    assert.include(rendererJs, "data-assistant-auth-import-file");
    assert.include(rendererJs, "data-assistant-auth-import-name");
    assert.include(rendererJs, "assistant-panel-auth-import");
    assert.include(rendererJs, '"Import and Continue"');

    assert.include(js, "function readAuthImportFiles()");
    assert.include(
      js,
      'querySelectorAll("input[data-assistant-auth-import-file]")',
    );
    assert.include(js, "new FileReader()");
    assert.include(js, "reader.readAsDataURL(file)");
    assert.include(js, "contentBase64");
    assert.notInclude(js, "function renderAuthCard");
    assert.notInclude(js, "authCardEl");
  });

  it("uses shared transcript rendering with SkillRunner revision metadata preserved as badges/details", async function () {
    const transcriptRendererJs = await readProjectFile(
      "addon/content/shared/assistant/assistant-transcript-renderer.js",
    );
    const js = await readProjectFile("addon/content/sidebar/run-dialog.js");
    const thinkingCoreJs = await readProjectFile(
      "addon/content/sidebar/chat_thinking_core.js",
    );
    const css = await readProjectFile("addon/content/sidebar/run-dialog.css");

    assert.include(transcriptRendererJs, "data-assistant-panel-kind");
    assert.include(transcriptRendererJs, "assistant-transcript-revision-badge");
    assert.include(transcriptRendererJs, "assistant-transcript-row");
    assert.include(
      js,
      "createCompatibleThinkingChatModel(state.chatDisplayMode)",
    );
    assert.include(js, "buildSkillRunnerToolItem(");
    assert.include(js, "isSkillRunnerToolProcess(processType)");
    assert.include(js, 'entry.type === "revision"');
    assert.include(js, 'kind.trim().toLowerCase() !== "assistant_revision"');
    assert.include(js, 'variant: "skillrunner"');
    assert.include(js, "renderMarkdown");
    assert.include(
      js,
      "item.displayText || item.display_text || item.text || item.summary",
    );
    assert.match(
      thinkingCoreJs,
      /const displayText = safeText\(\s*event && \(event\.displayText \|\| event\.display_text\),?\s*\);/,
    );
    assert.include(
      thinkingCoreJs,
      "const rawText = safeText(event && event.text);",
    );
    assert.include(
      thinkingCoreJs,
      "const text = displayText || rawText || summary;",
    );
    assert.include(
      thinkingCoreJs,
      "normalizedText: normalizeText(text || summary),",
    );
    assert.notInclude(
      thinkingCoreJs,
      "const text = normalizeText(event && event.text);",
    );
    assert.notInclude(css, ".revision-badge");
    assert.notInclude(js, "function renderRevisionEntry");
    assert.notInclude(css, ".revision-bubble");
  });

  it("keeps conversation as the stretching content area and removes legacy button/card systems", async function () {
    const css = await readProjectFile("addon/content/sidebar/run-dialog.css");
    const sharedCss = await readProjectFile(
      "addon/content/shared/assistant/assistant-panel-shared.css",
    );

    assert.include(css, "--asst-context-drawer-width");
    assert.include(css, "--asst-details-drawer-width");
    assert.notInclude(css, "grid-template-rows: auto auto minmax(0, 1fr);");
    assert.notInclude(
      css,
      "grid-template-rows: minmax(0, 1fr) auto auto auto;",
    );
    assert.notInclude(css, ".skillrunner-banner .assistant-panel-managed-view");
    assert.include(css, ".skillrunner-transcript");
    assert.notInclude(css, ".skillrunner-transcript.plain-mode");
    assert.notInclude(css, ".skillrunner-transcript.bubble-mode");
    assert.notInclude(css, ".transcript-row");
    assert.notInclude(css, ".assistant-panel-reply-input");
    assert.notInclude(css, ".skillrunner-drawer .asst-drawer-panel");
    assert.notInclude(css, ".skillrunner-details .asst-drawer-panel");
    assert.notInclude(css, ".assistant-panel-context-list");
    assert.notInclude(css, ".assistant-panel-details-list");
    assert.notInclude(css, ".assistant-panel-context-entry");
    assert.notInclude(css, ".empty-state");
    assert.include(sharedCss, ".asst-panel-shell");
    assert.include(sharedCss, ".asst-panel-main");
    assert.include(sharedCss, ".asst-panel-drawer-overlay");
    assert.include(sharedCss, ".asst-panel-details-overlay");
    assert.include(sharedCss, ".asst-panel-details-overlay .asst-drawer-panel");
    assert.include(sharedCss, ".assistant-panel-details-section-summary");
    assert.include(sharedCss, ".assistant-panel-details-section-body");
    assert.include(
      sharedCss,
      '.assistant-panel-details-row[data-assistant-details-entry-kind="code"]',
    );
    assert.include(sharedCss, "max-height: min(42vh, 360px);");
    assert.include(sharedCss, "flex-direction: column;");
    assert.include(sharedCss, "overflow: auto;");
    assert.include(sharedCss, "white-space: pre-wrap;");
    assert.include(sharedCss, "word-break: break-word;");
    assert.include(sharedCss, "line-height: 1.55;");
    assert.include(sharedCss, "max-height: none;");
    assert.include(sharedCss, ".asst-empty-state");
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
    assert.include(hostTs, "syncSessionStateFromRunStore(entry)");
    assert.include(hostTs, "drawer: {");
    assert.include(hostTs, 'id: "running"');
    assert.include(hostTs, "groups: runningGroups");
    assert.include(hostTs, "function shouldRefreshLocalRunDialogMessages");
    assert.include(hostTs, "shouldRefreshRunDialogLocalMessages");
    assert.include(hostTs, "function maxBackendRunDialogSeq");
    assert.include(hostTs, "seq: -5");
    assert.notInclude(
      hostTs,
      "entry.session.lastSeq = entry.session.messages.reduce",
    );
    assert.notInclude(hostTs, "entry.session.lastSeq = Math.floor(cursor)");
    assert.include(hostTs, "subscribeSkillRunnerSessionState");
    assert.include(hostTs, "await syncPendingState()");
    assert.include(hostTs, "continueSkillRunnerForegroundRun");
    assert.include(hostTs, "startRunDialogEntryForegroundContinuation");
    assert.include(hostTs, "streamRunChat");
    assert.notInclude(hostTs, "ensureSkillRunnerSessionSync");
    assert.notInclude(hostTs, "restartSessionSyncAfterWaitingExit");
    assert.include(hostTs, "hasRunDialogWaitingAuthExited");
    assert.notInclude(
      hostTs,
      "runWorkspaceState.refreshTimer = dialogWindow.setInterval",
    );
  });
});

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

describe("skillrunner sidebar host runtime", function () {
  it("uses the unified Assistant workspace as the only active sidebar browser host", async function () {
    const ts = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );
    assert.include(ts, "FRAME_WINDOW_WAIT_TIMEOUT_MS");
    assert.include(ts, "waitForPaneFrameWindow");
    assert.include(ts, "createSidebarContainer");
    assert.include(ts, "createSidebarFrame");
    assert.include(ts, "resolveSidebarFrameWindow");
    assert.include(ts, "setSidebarContainerVisible");
    assert.include(ts, "assistant-workspace.html");
    assert.include(ts, "installAssistantWorkspaceSidebarShell");
    assert.include(ts, "openAssistantWorkspaceSidebar");
    assert.include(ts, "toggleAssistantWorkspaceSidebar");
  });

  it("keeps SkillRunner, ACP Chat, and ACP Skills wired through the workspace host bridge", async function () {
    const ts = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );
    assert.include(ts, "__zsAssistantWorkspaceBridge");
    assert.include(ts, "wrappedJSObject");
    assert.include(ts, "assistant-workspace:init");
    assert.include(ts, "assistant-workspace:child-snapshot");
    assert.include(ts, "dispatchRunWorkspaceAction");
    assert.include(ts, "focusSkillRunnerWorkspace");
    assert.include(ts, "buildAcpSidebarViewSnapshot");
    assert.include(ts, "buildAcpSkillRunPanelSnapshot");
    assert.include(ts, "handleAcpChatAction");
    assert.include(ts, "handleAcpSkillRunAction");
    assert.include(ts, "createSkillRunnerHostActionHandler");
  });

  it("focuses SkillRunner only after activating the sidebar host", async function () {
    const ts = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );
    const openStart = ts.indexOf(
      "export async function openAssistantWorkspaceSidebar",
    );
    const openEnd = ts.indexOf(
      "export function closeAssistantWorkspaceSidebar",
      openStart,
    );
    const openBody = ts.slice(openStart, openEnd);
    const activateIndex = openBody.indexOf(
      "const activated = await activateTarget(host, target);",
    );
    const preActivateBody = openBody.slice(0, activateIndex);
    const postActivateFocusIndex = openBody.indexOf(
      "await focusSkillRunnerWorkspace({",
      activateIndex,
    );
    assert.isAtLeast(activateIndex, 0);
    assert.notInclude(preActivateBody, "await focusSkillRunnerWorkspace({");
    assert.isAbove(postActivateFocusIndex, activateIndex);
  });

  it("syncs the active Assistant shell tab before reactivating an open sidebar", async function () {
    const ts = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );
    assert.include(ts, "function postActiveShellInit");
    const setTabIndex = ts.indexOf("host.activeTab = normalizeTab(args.tab);");
    const syncIndex = ts.indexOf("postActiveShellInit(host);", setTabIndex);
    const activateIndex = ts.indexOf(
      "const activated = await activateTarget(host, target);",
    );
    assert.isAtLeast(setTabIndex, 0);
    assert.isAbove(syncIndex, setTabIndex);
    assert.isAbove(activateIndex, syncIndex);
  });

  it("keeps live subscriptions and waiting-task feedback in the unified workspace host", async function () {
    const ts = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");
    assert.include(ts, "subscribeAcpFrontendSnapshots");
    assert.include(ts, "subscribeAcpSkillRunSnapshots");
    assert.include(ts, "subscribeWorkflowTaskChanges");
    assert.include(ts, "maybeShowAcpSkillWaitingToasts");
    assert.include(ts, "showWorkflowToast");
    assert.include(ts, "updateAssistantAttentionIndicator");
    assert.include(ts, "updateAssistantToolbarAttention");
    assert.include(ts, "countDashboardHumanAttentionTasks");
    assert.notInclude(ts, "installWorkspaceToolbarTaskPopover");
    assert.notInclude(ts, "uninstallWorkspaceToolbarTaskPopover");
    assert.include(
      en,
      "task-dashboard-run-sidebar-toast-waiting-user = SkillRunner run needs your input",
    );
    assert.include(
      en,
      "task-dashboard-run-sidebar-toast-waiting-auth = SkillRunner run needs authentication",
    );
    assert.include(
      zh,
      "task-dashboard-run-sidebar-toast-waiting-user = SkillRunner 运行需要你的输入",
    );
    assert.include(
      zh,
      "task-dashboard-run-sidebar-toast-waiting-auth = SkillRunner 运行需要认证",
    );
  });

  it("scopes sidebar snapshots to the active pane and throttles streaming run updates", async function () {
    const workspaceHost = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );
    const viewModel = await readProjectFile(
      "src/modules/assistantSidebarViewModel.ts",
    );
    const runDialog = await readProjectFile(
      "src/modules/skillRunnerRunDialog.ts",
    );

    assert.include(viewModel, "AssistantSidebarSnapshot");
    assert.include(viewModel, "stripAssistantSidebarTranscript");
    assert.include(viewModel, 'streamingMode: "plain-incremental"');
    assert.include(workspaceHost, "scopeKey");
    assert.include(workspaceHost, "snapshotRevision");
    assert.include(workspaceHost, "decorateAssistantSidebarChildSnapshot");
    assert.include(workspaceHost, 'if (host.activeTab === "acp-chat")');
    assert.include(workspaceHost, 'if (host.activeTab === "acp-skills")');
    assert.include(runDialog, "scheduleSnapshotFlush");
    assert.include(runDialog, "ASSISTANT_SIDEBAR_STREAM_FLUSH_MS");
    assert.include(runDialog, 'conversationEntry.kind !== "assistant_message"');
  });

  it("queues sidebar frontend rendering and keeps streaming transcript rows plain", async function () {
    const acpChat = await readProjectFile(
      "addon/content/dashboard/acp-chat.js",
    );
    const acpSkill = await readProjectFile(
      "addon/content/dashboard/acp-skill-run.js",
    );
    const transcriptRenderer = await readProjectFile(
      "addon/content/dashboard/assistant-transcript-renderer.js",
    );

    assert.include(acpChat, "function queueRender");
    assert.include(acpChat, "requestAnimationFrame");
    assert.include(acpChat, "queueRender(payload)");
    assert.include(acpSkill, "function queueRender");
    assert.include(acpSkill, "requestAnimationFrame");
    assert.include(acpSkill, "queueRender(data.payload || {})");
    assert.include(transcriptRenderer, "data-assistant-render-signature");
    assert.include(transcriptRenderer, "transcriptItemSignature");
    assert.include(
      transcriptRenderer,
      'String(item.state || "").trim() === "streaming"',
    );
    assert.include(
      transcriptRenderer,
      'body.textContent = String(item.text || "")',
    );
    assert.include(
      transcriptRenderer,
      "renderAssistantTranscriptItemIfChanged",
    );
  });

  it("keeps SkillRunner drawer semantics in the shared model instead of the deprecated host", async function () {
    const workspaceHost = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );
    const runDialog = await readProjectFile(
      "src/modules/skillRunnerRunDialog.ts",
    );
    const sidebarModel = await readProjectFile(
      "src/modules/skillRunnerSidebarModel.ts",
    );
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");

    assert.include(workspaceHost, "drawer: {");
    assert.include(workspaceHost, "drawerCompletedCollapsed");
    assert.include(workspaceHost, '"toggle-drawer-section"');
    assert.include(workspaceHost, "task-dashboard-run-running-tasks-title");
    assert.include(workspaceHost, "task-dashboard-run-completed-tasks-title");
    assert.include(sidebarModel, "activeTasks:");
    assert.include(sidebarModel, "finishedTasks:");
    assert.include(
      sidebarModel,
      "const allTasks = [...group.activeTasks, ...group.finishedTasks]",
    );
    assert.include(sidebarModel, "const runningTasks = allTasks");
    assert.include(sidebarModel, "const completedTasks = allTasks.filter");
    assert.include(runDialog, "task-dashboard-run-selection-tasks-title");
    assert.include(runDialog, "task-dashboard-run-tasks-toggle");
    assert.include(runDialog, "RUN_WORKSPACE_PANEL_HISTORY_LIMIT");
    assert.include(runDialog, "RunWorkspaceReadProfile");
    assert.include(runDialog, '"sidebar-active"');
    assert.notInclude(runDialog, '"sidebar-completed-window"');
    assert.include(runDialog, "listSkillRunnerPanelRows");
    assert.include(runDialog, "listSkillRunnerRunProjections");
    assert.include(runDialog, "mergeSkillRunnerPanelRows");
    assert.include(runDialog, "selectionIntent: RunWorkspaceSelectionIntent");
    assert.include(runDialog, "runKey: string");
    assert.include(runDialog, "getSkillRunnerRunProjection(selectedRunKey)");
    assert.include(runDialog, "resolveRunWorkspaceSelectionKey");
    assert.notInclude(runDialog, "requestKey || localRunKey || taskKey");
    assert.notInclude(runDialog, "identityIndex: Map<string, string>");
    assert.notInclude(runDialog, "resolveRunWorkspaceIdentityKey");
    assert.notInclude(runDialog, "runWorkspaceState.requestedSelection");
    assert.notInclude(runDialog, "runWorkspaceState.requestedTaskKey");
    assert.notInclude(runDialog, "runWorkspaceState.requestIndex");
    assert.notInclude(runDialog, "runWorkspaceState.localTaskIndex");
    assert.notInclude(runDialog, "includeCompletedHistory");
    assert.notInclude(runDialog, "preserveSidebarCompletedWindow");
    assert.notInclude(runDialog, "preserveSidebarSelectedTask");
    assert.notInclude(runDialog, "index.set(taskKey, indexedTask)");
    assert.notInclude(runDialog, "index.set(requestKey, indexedTask)");
    assert.notInclude(runDialog, "index.set(localRunKey, indexedTask)");
    assert.include(workspaceHost, "detachSkillRunnerSidebarHost");
    assert.include(
      workspaceHost,
      'if (host.activeTab !== "skillrunner" || !host.activeTarget)',
    );
    assert.notInclude(workspaceHost, "isForegroundVisible");
    assert.include(en, "task-dashboard-run-backend = Backend");
    assert.include(zh, "task-dashboard-run-backend = 后端");
  });

  it("keeps SkillRunner sidebar foreground actions on the fast presentation path", async function () {
    const workspaceHost = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );
    const runDialog = await readProjectFile(
      "src/modules/skillRunnerRunDialog.ts",
    );

    const hostActionStart = workspaceHost.indexOf(
      "function createSkillRunnerHostActionHandler",
    );
    const hostActionEnd = workspaceHost.indexOf(
      'if (action === "open-backend-manager")',
      hostActionStart,
    );
    const hostActionBody = workspaceHost.slice(hostActionStart, hostActionEnd);
    assert.include(hostActionBody, "refreshSkillRunnerWorkspacePresentation()");
    assert.notInclude(
      hostActionBody,
      "requestSkillRunnerSidebarCompletedWindow()",
    );
    assert.notInclude(hostActionBody, "focusSkillRunnerWorkspace()");

    const selectActionStart = runDialog.indexOf(
      'if (action === "select-task")',
    );
    const selectActionEnd = runDialog.indexOf(
      'if (action === "archive-run")',
      selectActionStart,
    );
    const selectActionBody = runDialog.slice(
      selectActionStart,
      selectActionEnd,
    );
    assert.include(selectActionBody, "runWorkspaceState.taskIndex.has(runKey)");
    assert.include(selectActionBody, 'selectionIntentFromTask(task, "user")');
    assert.include(selectActionBody, "await selectWorkspaceTask(runKey)");
    assert.include(selectActionBody, '"sidebar-active"');

    const archiveActionStart = runDialog.indexOf(
      'if (action === "archive-run")',
    );
    const archiveActionEnd = runDialog.indexOf(
      'if (action === "copy-request-id"',
      archiveActionStart,
    );
    const archiveActionBody = runDialog.slice(
      archiveActionStart,
      archiveActionEnd,
    );
    assert.include(archiveActionBody, "payload.runKey");
    assert.notInclude(archiveActionBody, "payload.taskKey");

    const selectFunctionStart = runDialog.indexOf(
      "async function selectWorkspaceTask",
    );
    const selectFunctionEnd = runDialog.indexOf(
      "async function refreshWorkspaceSnapshot",
      selectFunctionStart,
    );
    const selectFunctionBody = runDialog.slice(
      selectFunctionStart,
      selectFunctionEnd,
    );
    assert.include(selectFunctionBody, 'pushSnapshot("snapshot")');
    assert.include(selectFunctionBody, "startRunWorkspaceObserverInBackground");
    assert.notInclude(selectFunctionBody, "await startRunObserver");
    assert.notInclude(
      selectFunctionBody,
      "await enforceRunDialogStreamPoolForBackend",
    );

    const observerGateStart = runDialog.indexOf(
      "function canTaskOpenForegroundStream",
    );
    const observerGateEnd = runDialog.indexOf(
      "function warnSkillRunnerWorkspaceAsyncFailure",
      observerGateStart,
    );
    const observerGateBody = runDialog.slice(
      observerGateStart,
      observerGateEnd,
    );
    assert.include(observerGateBody, "isFinishedRunWorkspaceTask(task)");
    assert.include(observerGateBody, "function canTaskStartForegroundObserver");
    assert.include(observerGateBody, "isWaiting(normalized)");
    assert.include(
      runDialog,
      "if (!canTaskStartForegroundObserver(args.task))",
    );

    const modelStart = runDialog.indexOf(
      "async function buildRunWorkspaceModel",
    );
    const modelEnd = runDialog.indexOf("type RunWorkspaceModel", modelStart);
    const modelBody = runDialog.slice(modelStart, modelEnd);
    assert.notInclude(modelBody, '"sidebar-completed-window"');
    assert.include(modelBody, 'if (args.profile === "dialog-full")');
    assert.notInclude(modelBody, "scanPluginSkillRegistry()");
    assert.include(modelBody, "listSkillRunnerPanelRows");
    assert.include(modelBody, "historyTruncated = panelRows.truncated");
    assert.include(runDialog, '"sidebar-active"');
    assert.notInclude(runDialog, "preserveSidebarCompletedWindow(rawModel)");
    assert.notInclude(runDialog, "preserveSidebarSelectedTask");
  });

  it("keeps pane containers and toolbar affordances owned by the unified workspace host", async function () {
    const sidebarTs = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );
    const toolbarTs = await readProjectFile(
      "src/modules/dashboardToolbarButton.ts",
    );
    const localeTs = await readProjectFile("src/utils/locale.ts");
    const paneCss = await readProjectFile("addon/content/zoteroPane.css");
    assert.include(sidebarTs, "SKILLRUNNER_ICON_URI");
    assert.include(sidebarTs, "applyToolbarButtonStyling");
    assert.include(sidebarTs, "syncToolbarButtonIconFill");
    assert.include(
      sidebarTs,
      "updateAssistantToolbarAttention(host.win, waitingCount)",
    );
    assert.notInclude(sidebarTs, "setButtonBadge(");
    assert.include(sidebarTs, "assistant-sidebar-entry");
    assert.notInclude(sidebarTs, "assistant-sidebar-badge");
    assert.notInclude(sidebarTs, "updateSkillRunnerToolbarButtonBadge");
    assert.include(sidebarTs, "close-sidebar");
    assert.include(sidebarTs, "closeActiveSidebarHost");
    assert.include(sidebarTs, "applySidebarPaneContainerStyles");
    assert.include(
      sidebarTs,
      "createSidebarFrame(doc, resolveSidebarPageUrl())",
    );
    assert.include(toolbarTs, "export const SKILLRUNNER_ICON_URI");
    assert.include(toolbarTs, "export function applyToolbarButtonStyling");
    assert.include(toolbarTs, "export function syncToolbarButtonIconFill");
    assert.include(
      localeTs,
      "export { initLocale, getString, getLocaleID, getStringOrFallback };",
    );
    assert.include(
      paneCss,
      "#zotero-context-pane-sidenav .zs-assistant-sidebar-button",
    );
    assert.include(
      paneCss,
      "#zotero-context-pane-sidenav .zs-assistant-sidebar-button > .toolbarbutton-icon",
    );
    assert.notInclude(paneCss, ".zs-skillrunner-toolbar-button[data-attention");
    assert.notInclude(paneCss, ".zs-skillrunner-attention-button");
    assert.notInclude(paneCss, ".zs-skillrunner-attention-led");
    assert.notInclude(paneCss, ".zs-assistant-sidebar-badge");
    assert.notInclude(
      paneCss,
      ".zs-skillrunner-sidebar-button[data-badge]::after",
    );
  });

  it("keeps SkillRunner submission metadata in execution paths instead of UI fallbacks", async function () {
    const runDialog = await readProjectFile(
      "src/modules/skillRunnerRunDialog.ts",
    );
    const runSeam = await readProjectFile(
      "src/modules/workflowExecution/runSeam.ts",
    );
    const foregroundContinuation = await readProjectFile(
      "src/modules/skillRunnerForegroundContinuation.ts",
    );

    assert.notInclude(runDialog, "scanPluginSkillRegistry");
    assert.notInclude(runDialog, "skillNameById");
    assert.notInclude(runSeam, "buildSkillRunnerSequenceStepJobRecord");
    assert.notInclude(
      foregroundContinuation,
      "buildSkillRunnerSequenceStepJobRecord",
    );
    assert.include(runSeam, "createSkillRunnerRun({");
    assert.include(runSeam, "recordSkillRunnerProgress({");
    assert.include(foregroundContinuation, "createSkillRunnerRun({");
    assert.include(foregroundContinuation, "recordSkillRunnerProgress({");
  });

  it("hosts SkillRunner management UI inside the Dashboard backend tab", async function () {
    const taskManager = await readProjectFile(
      "src/modules/taskManagerDialog.ts",
    );
    const workspaceTab = await readProjectFile("src/modules/workspaceTab.ts");
    const dashboardApp = await readProjectFile(
      "addon/content/dashboard/app.js",
    );
    const dashboardCss = await readProjectFile(
      "addon/content/dashboard/styles.css",
    );

    assert.include(taskManager, "selectedBackendSubviewById");
    assert.include(taskManager, "managementUiUrl");
    assert.include(workspaceTab, "initialDashboardTabKey");
    assert.include(workspaceTab, "initialDashboardBackendSubview");
    assert.include(workspaceTab, "pendingDashboardSelection");
    assert.include(workspaceTab, "runtime.dashboardRuntime.selectTab");
    assert.include(workspaceTab, "createManagementHost");
    assert.include(workspaceTab, "skillrunner-management-workspace-host");
    assert.include(workspaceTab, "skillrunner-management-workspace-frame");
    assert.include(workspaceTab, "clearManagementOverlay");
    assert.include(taskManager, 'action === "open-management"');
    assert.include(taskManager, 'action === "show-runs"');
    assert.include(taskManager, 'action === "mount-management-host"');
    assert.include(taskManager, 'action === "open-management-external"');
    assert.include(taskManager, "args.managementHost.mount");
    assert.notInclude(taskManager, "openSkillRunnerManagementDialog");
    assert.include(dashboardApp, "renderSkillRunnerManagementSubview");
    assert.include(dashboardApp, "skillrunner-management-dashboard-host");
    assert.include(dashboardApp, 'sendAction("mount-management-host"');
    assert.notInclude(dashboardApp, 'document.createElement("iframe")');
    assert.include(dashboardApp, 'sendAction("show-runs"');
    assert.include(dashboardApp, 'sendAction("open-management-external"');
    assert.include(dashboardCss, ".management-host-panel");
    assert.include(dashboardCss, ".management-host-mount");
    assert.include(dashboardCss, ".management-host-frame");
  });
});

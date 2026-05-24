import { assert } from "chai";
import { getProjectRoot, joinPath, readUtf8 } from "../zotero/workflow-test-utils";

async function readProjectFile(relativePath: string) {
  const targetPath = joinPath(getProjectRoot(), relativePath);
  return readUtf8(targetPath);
}

describe("skillrunner sidebar host runtime", function () {
  it("uses the unified Assistant workspace as the only active sidebar browser host", async function () {
    const ts = await readProjectFile("src/modules/assistantWorkspaceSidebar.ts");
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
    const ts = await readProjectFile("src/modules/assistantWorkspaceSidebar.ts");
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

  it("keeps live subscriptions and waiting-task feedback in the unified workspace host", async function () {
    const ts = await readProjectFile("src/modules/assistantWorkspaceSidebar.ts");
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");
    assert.include(ts, "subscribeAcpFrontendSnapshots");
    assert.include(ts, "subscribeAcpSkillRunSnapshots");
    assert.include(ts, "subscribeWorkflowTasks");
    assert.include(ts, "maybeShowAcpSkillWaitingToasts");
    assert.include(ts, "showWorkflowToast");
    assert.include(ts, "updateSidebarBadges");
    assert.include(en, "task-dashboard-run-sidebar-toast-waiting-user = SkillRunner run needs your input");
    assert.include(en, "task-dashboard-run-sidebar-toast-waiting-auth = SkillRunner run needs authentication");
    assert.include(zh, "task-dashboard-run-sidebar-toast-waiting-user = SkillRunner 运行需要你的输入");
    assert.include(zh, "task-dashboard-run-sidebar-toast-waiting-auth = SkillRunner 运行需要认证");
  });

  it("keeps SkillRunner drawer semantics in the shared model instead of the deprecated host", async function () {
    const workspaceHost = await readProjectFile("src/modules/assistantWorkspaceSidebar.ts");
    const runDialog = await readProjectFile("src/modules/skillRunnerRunDialog.ts");
    const sidebarModel = await readProjectFile("src/modules/skillRunnerSidebarModel.ts");
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");

    assert.include(workspaceHost, "drawer: {");
    assert.include(workspaceHost, "drawerCompletedCollapsed");
    assert.include(workspaceHost, "\"toggle-drawer-section\"");
    assert.include(workspaceHost, "task-dashboard-run-running-tasks-title");
    assert.include(workspaceHost, "task-dashboard-run-completed-tasks-title");
    assert.include(sidebarModel, "activeTasks:");
    assert.include(sidebarModel, "finishedTasks:");
    assert.include(sidebarModel, "const runningTasks = group.activeTasks");
    assert.include(sidebarModel, "const completedTasks = group.finishedTasks");
    assert.include(runDialog, "task-dashboard-run-selection-tasks-title");
    assert.include(runDialog, "task-dashboard-run-tasks-toggle");
    assert.include(en, "task-dashboard-run-backend = Backend");
    assert.include(zh, "task-dashboard-run-backend = 后端");
  });

  it("keeps pane containers and toolbar affordances owned by the unified workspace host", async function () {
    const sidebarTs = await readProjectFile("src/modules/assistantWorkspaceSidebar.ts");
    const toolbarTs = await readProjectFile("src/modules/dashboardToolbarButton.ts");
    const localeTs = await readProjectFile("src/utils/locale.ts");
    const paneCss = await readProjectFile("addon/content/zoteroPane.css");
    assert.include(sidebarTs, "SKILLRUNNER_ICON_URI");
    assert.include(sidebarTs, "applyToolbarButtonStyling");
    assert.include(sidebarTs, "syncToolbarButtonIconFill");
    assert.include(sidebarTs, "close-sidebar");
    assert.include(sidebarTs, "closeActiveSidebarHost");
    assert.include(sidebarTs, "applySidebarPaneContainerStyles");
    assert.include(sidebarTs, "createSidebarFrame(doc, resolveSidebarPageUrl())");
    assert.include(toolbarTs, "export const SKILLRUNNER_ICON_URI");
    assert.include(toolbarTs, "export function applyToolbarButtonStyling");
    assert.include(toolbarTs, "export function syncToolbarButtonIconFill");
    assert.include(localeTs, "export { initLocale, getString, getLocaleID, getStringOrFallback };");
    assert.include(paneCss, "#zotero-context-pane-sidenav .zs-skillrunner-sidebar-button");
    assert.include(paneCss, "#zotero-context-pane-sidenav .zs-skillrunner-sidebar-button > .toolbarbutton-icon");
  });
});

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
    assert.include(ts, "waitForShellFrameWindow");
    assert.include(ts, "MountedSidebarDock");
    assert.include(ts, "createSidebarContainer");
    assert.include(ts, "createSidebarFrame");
    assert.include(ts, "resolveSidebarFrameWindow");
    assert.include(ts, "setSidebarContainerVisible");
    assert.include(ts, "assistant-workspace.html");
    assert.strictEqual(
      ts.match(/createSidebarFrame\(doc, resolveSidebarPageUrl\(\)\)/g)?.length,
      1,
    );
    assert.include(ts, "installAssistantWorkspaceSidebarShell");
    assert.include(ts, "openAssistantWorkspaceSidebar");
    assert.include(ts, "toggleAssistantWorkspaceSidebar");
  });

  it("keeps SkillRunner, ACP Chat, and ACP Skills wired through the workspace host bridge", async function () {
    const [ts, contract] = await Promise.all([
      readProjectFile("src/modules/assistantWorkspaceSidebar.ts"),
      readProjectFile("src/shared/assistantWireContract.ts"),
    ]);
    assert.include(ts, "ASSISTANT_WORKSPACE_SHELL_BRIDGE_KEY");
    assert.include(ts, "ASSISTANT_WORKSPACE_MESSAGE_TYPES.INIT");
    assert.include(ts, "ASSISTANT_WORKSPACE_MESSAGE_TYPES.CHILD_PUBLICATION");
    assert.include(contract, '"__zsAssistantWorkspaceBridge"');
    assert.include(contract, '"assistant-workspace:init"');
    assert.include(contract, '"assistant-workspace:child-publication"');
    assert.include(ts, "dispatchSkillRunnerWorkspaceAction");
    assert.include(ts, "ACP_CHAT_WORKSPACE_ADAPTER");
    assert.include(ts, "new AssistantWorkspacePublicationRuntime");
    assert.notInclude(ts, "scheduleAssistantWorkspacePublicationChange");
    assert.notInclude(ts, "pendingWorkspacePublications");
    assert.notInclude(ts, "prepareAcpChatPanelSnapshot");
    assert.include(ts, "readyTabs");
    assert.include(ts, "postInitialSnapshotForActiveTab");
    assert.notInclude(ts, "refreshAndPostAcpChatPanelSnapshot");
    assert.include(ts, "getAcpSkillRunDiagnostics");
    assert.include(ts, "handleAcpChatAction");
    assert.include(ts, "handleAcpSkillRunAction");
    assert.include(ts, "createSkillRunnerHostActionHandler");
  });

  it("keeps live subscriptions and waiting-task feedback in the unified workspace host", async function () {
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");
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

  it("keeps SkillRunner drawer semantics in the shared model instead of the deprecated host", async function () {
    const workspaceHost = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");

    assert.include(workspaceHost, "detachSkillRunnerSidebarHost");
    assert.include(en, "task-dashboard-run-backend = Backend");
    assert.include(zh, "task-dashboard-run-backend = 后端");
  });

  it("keeps SkillRunner sidebar foreground chrome actions on the host publish path", async function () {
    const workspaceHost = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );
    const runDialog = await readProjectFile(
      "src/modules/skillRunnerRunDialog.ts",
    );

    assert.include(workspaceHost, "createSkillRunnerHostActionHandler");
    assert.include(workspaceHost, "scheduleSkillRunnerPublications");
    assert.include(workspaceHost, "dispatchSkillRunnerWorkspaceAction");
    assert.include(workspaceHost, "skillRunnerAttachedFrameWindow");
    assert.notInclude(workspaceHost, "refreshSkillRunnerWorkspacePresentation");
    assert.include(runDialog, "attachSkillRunnerSidebarHost");
  });

  it("keeps pane containers and toolbar affordances owned by the unified workspace host", async function () {
    const toolbarTs = await readProjectFile(
      "src/modules/dashboardToolbarButton.ts",
    );
    const localeTs = await readProjectFile("src/utils/locale.ts");
    const paneCss = await readProjectFile("addon/content/zoteroPane.css");
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
  });

  it("keeps SkillRunner submission metadata in execution paths instead of UI fallbacks", async function () {
    const runSeam = await readProjectFile(
      "src/modules/workflowExecution/runSeam.ts",
    );
    const foregroundContinuation = await readProjectFile(
      "src/modules/skillRunnerForegroundContinuation.ts",
    );

    assert.include(runSeam, `type: "submit.local_created"`);
    assert.include(runSeam, `type: "submit.request_creating"`);
    assert.include(foregroundContinuation, `type: "submit.local_created"`);
    assert.include(foregroundContinuation, `type: "submit.request_creating"`);
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
    assert.include(dashboardApp, "renderSkillRunnerManagementSubview");
    assert.include(dashboardApp, "skillrunner-management-dashboard-host");
    assert.include(dashboardApp, 'sendAction("mount-management-host"');
    assert.include(dashboardApp, 'sendAction("show-runs"');
    assert.include(dashboardApp, 'sendAction("open-management-external"');
    assert.include(dashboardCss, ".management-host-panel");
    assert.include(dashboardCss, ".management-host-mount");
    assert.include(dashboardCss, ".management-host-frame");
  });
});

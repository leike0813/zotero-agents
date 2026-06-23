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

describe("workspace toolbar running tasks popover", function () {
  it("shares Dashboard active task filtering with the toolbar popover", async function () {
    const helper = await readProjectFile("src/modules/dashboardActiveTasks.ts");
    const dashboard = await readProjectFile("src/modules/taskManagerDialog.ts");
    const popover = await readProjectFile(
      "src/modules/workspaceToolbarTaskPopover.ts",
    );

    assert.include(helper, "filterDashboardActiveTasks");
    assert.include(helper, "projectDashboardActiveTasks");
    assert.include(helper, "countDashboardHumanAttentionTasks");
    assert.include(helper, "resolveAcpSkillRunTaskState");
    assert.include(helper, "run.pendingPermission");
    assert.include(helper, "PASS_THROUGH_BACKEND_TYPE");
    assert.include(helper, "getVisibleAcpSkillRunRequestIds");
    assert.include(helper, 'run.status !== "succeeded"');
    assert.include(helper, 'run.status !== "failed"');
    assert.include(helper, 'run.status !== "canceled"');
    assert.include(dashboard, "filterDashboardActiveTasks");
    assert.notInclude(dashboard, "function isVisibleDashboardActiveTask");
    assert.include(popover, "listDashboardActiveTasksForPopover");
  });

  it("wires the toolbar Assistant Sidebar entry to a hover-only active task popover without changing click behavior", async function () {
    const toolbar = await readProjectFile(
      "src/modules/dashboardToolbarButton.ts",
    );
    const workspace = await readProjectFile("src/modules/workspaceTab.ts");
    const workspaceApp = await readProjectFile("src/workspaceApp.ts");
    const workspaceCss = await readProjectFile(
      "addon/content/workspace/styles.css",
    );
    const sidebar = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );
    const popover = await readProjectFile(
      "src/modules/workspaceToolbarTaskPopover.ts",
    );

    assert.include(toolbar, "installWorkspaceToolbarTaskPopover");
    assert.include(toolbar, "uninstallWorkspaceToolbarTaskPopover");
    assert.include(workspace, "installWorkspaceToolbarTaskPopover");
    assert.include(workspace, "uninstallWorkspaceToolbarTaskPopover");
    assert.include(workspace, 'querySelector(".sidebar-toggle")');
    assert.include(workspace, 'target: "reader"');
    assert.include(workspace, "syncWorkspaceSidebarEntry");
    assert.include(workspace, "workspace:attention");
    assert.include(workspace, "countDashboardHumanAttentionTasks");
    assert.include(workspace, "subscribeWorkflowTaskChanges");
    assert.include(workspace, "subscribeAcpSkillRunSnapshots");
    assert.include(workspaceApp, "workspace:attention");
    assert.include(workspaceApp, "updateWorkspaceSidebarAttention");
    assert.include(workspaceApp, "data-attention-count");
    assert.include(workspaceApp, "formatAttentionCount");
    assert.include(workspaceApp, '"toggle-sidebar"');
    assert.include(
      workspaceCss,
      '.sidebar-toggle[data-attention="true"]::after',
    );
    assert.include(workspaceCss, "attr(data-attention-count)");
    assert.notInclude(workspaceCss, "data-badge");
    assert.notInclude(sidebar, "installWorkspaceToolbarTaskPopover");
    assert.notInclude(sidebar, "uninstallWorkspaceToolbarTaskPopover");
    assert.include(sidebar, "target?: AcpSidebarTarget");
    assert.include(sidebar, "host.activeTarget !== args.target");
    assert.include(sidebar, "await activateTarget(host, args.target)");
    assert.include(sidebar, "zs-assistant-sidebar-button");
    assert.include(toolbar, "zs-skillrunner-toolbar-button");
    assert.notInclude(toolbar, "zs-skillrunner-attention-button");
    assert.include(toolbar, "openDashboard");
    assert.include(toolbar, "zs-workspace-toolbar-button");
    assert.include(popover, "mouseenter");
    assert.include(popover, "mouseleave");
    assert.include(popover, "mouseover");
    assert.include(popover, "mouseout");
    assert.include(popover, "isRelatedTargetInsideAnchor");
    assert.notInclude(popover, 'addListener(args.anchor, "focus"');
    assert.notInclude(popover, 'addListener(args.anchor, "blur"');
    assert.include(popover, 'addListener(args.anchor, "mousedown"');
    assert.include(popover, 'addListener(args.anchor, "click"');
    assert.include(popover, 'addListener(args.anchor, "command"');
    assert.include(popover, "dismissForPrimaryActivation");
    assert.include(popover, 'keyboardEvent.key === "Escape"');
    assert.include(popover, 'createXulElement(doc, "panel")');
    assert.include(popover, 'popover.setAttribute("noautohide", "true")');
    assert.include(popover, "supportsNoAutoFocusWithNoAutoHide");
    assert.include(popover, "isActivationInsidePopoverRuntime");
    assert.include(popover, "openPopup(runtime.anchor");
    assert.include(popover, "hidePopup");
    assert.include(popover, "MAX_VISIBLE_TASKS = 6");
    assert.include(popover, "syncPopoverSize");
    assert.include(popover, "POPOVER_WIDTH");
    assert.include(popover, "zs-workspace-running-popover-separator");
    assert.include(popover, "const separator = xulElement(");
    assert.include(popover, "font-family: Georgia");
    assert.include(popover, "font-size: 9px !important");
    assert.include(popover, "background-color: rgba(148, 163, 184, 0.55)");
    assert.include(popover, "zs-workspace-running-popover-task-backend");
    assert.include(popover, "normalizeString(row.backendLabel)");
    assert.include(
      popover,
      'xulElement(doc, "hbox", "zs-workspace-running-popover-task")',
    );
    assert.include(popover, "zs-workspace-running-popover-task-title");
    assert.include(popover, 'node.setAttribute("crop", "end")');
    assert.include(popover, 'node.setAttribute("minwidth", String(width))');
    assert.include(popover, 'node.setAttribute("maxwidth", String(width))');
    assert.include(popover, 'node.setAttribute("flex", "0")');
    assert.include(popover, "forceXulBoxWidth");
    assert.include(popover, "clampForColumn");
    assert.include(popover, "xulLed");
    assert.include(popover, "resolveTaskLedTone");
    assert.include(popover, "normalizeTaskState");
    assert.include(popover, 'state === "waiting_user"');
    assert.include(popover, 'state === "waiting_auth"');
    assert.include(popover, 'state === "queued"');
    assert.include(popover, 'state === "failed"');
    assert.include(popover, 'state === "succeeded"');
    assert.include(popover, 'cell.setAttribute("align", "center")');
    assert.include(popover, 'cell.setAttribute("pack", "center")');
    assert.include(popover, '"margin: 0 5px 0 2px !important"');
    assert.include(popover, "`background-color: ${tone.color} !important`");
    assert.include(popover, "TASK_NAME_WIDTH");
    assert.include(popover, 'item.setAttribute("role", "button")');
    assert.notInclude(popover, "htmlElement");
    assert.notInclude(popover, "formatUpdatedAt");
    assert.notInclude(popover, "resolveStatusLabel");
    assert.notInclude(popover, "View all");
    assert.notInclude(popover, "Open Dashboard");
  });

  it("localizes the shared Dashboard and Synthesis workspace toolbar through host labels", async function () {
    const workspace = await readProjectFile("src/modules/workspaceTab.ts");
    const workspaceApp = await readProjectFile("src/workspaceApp.ts");
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");
    const keys = [
      "workspace-shell-brand-subtitle",
      "workspace-shell-views-aria-label",
      "workspace-shell-view-dashboard",
      "workspace-shell-view-synthesis",
      "workspace-shell-theme-aria-label",
      "workspace-shell-theme-system",
      "workspace-shell-theme-light",
      "workspace-shell-theme-dark",
      "workspace-shell-docs",
      "workspace-shell-refresh",
      "workspace-shell-toggle-sidebar",
    ];

    assert.include(workspace, "buildWorkspaceShellLabels");
    assert.include(workspace, "getStringOrFallback");
    assert.include(workspace, "labels: buildWorkspaceShellLabels()");
    assert.include(workspaceApp, "normalizeWorkspaceLabels");
    assert.include(workspaceApp, "updateWorkspaceLocalizedText");
    assert.include(workspaceApp, "data-workspace-label");
    assert.include(workspaceApp, "data-workspace-icon-label");
    assert.include(workspaceApp, "renderDocsButton");
    assert.include(workspaceApp, "zs-icon-description");
    assert.include(workspace, "getDocsUrl");
    assert.include(workspace, 'action === "open-docs"');
    for (const key of keys) {
      assert.include(workspace, key);
      assert.include(en, `${key} =`);
      assert.include(zh, `${key} =`);
    }
  });

  it("keeps waiting attention on the toolbar sidebar button instead of sidebar badges", async function () {
    const toolbar = await readProjectFile(
      "src/modules/dashboardToolbarButton.ts",
    );
    const workspace = await readProjectFile("src/modules/workspaceTab.ts");
    const workspaceApp = await readProjectFile("src/workspaceApp.ts");
    const sidebar = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );

    assert.notInclude(toolbar, "updateSkillRunnerToolbarButtonBadge");
    assert.notInclude(sidebar, "updateSkillRunnerToolbarButtonBadge");
    assert.include(toolbar, "updateAssistantToolbarAttention");
    assert.include(toolbar, "doc.getElementById(SKILLRUNNER_BUTTON_ID)");
    assert.include(toolbar, "SKILLRUNNER_ATTENTION_ICON_URI");
    assert.include(toolbar, "icon_sidebar_glow_32.png");
    assert.include(toolbar, "data-attention");
    assert.include(toolbar, "data-attention-count");
    assert.include(
      sidebar,
      "updateAssistantToolbarAttention(host.win, waitingCount)",
    );
    assert.include(workspace, "postAttention(runtime)");
    assert.include(workspace, "countWorkspaceHumanAttentionTasks");
    assert.include(workspaceApp, "normalizeWaitingCount");
    assert.include(workspaceApp, 'button.setAttribute("data-attention"');
    assert.include(workspaceApp, '"data-attention-count"');
    assert.notInclude(sidebar, "setButtonBadge(");
    assert.notInclude(sidebar, "assistant-sidebar-badge");
    assert.include(sidebar, 'normalized === "waiting_user"');
    assert.include(sidebar, 'normalized === "waiting_auth"');
    assert.include(sidebar, "!!run.pendingPermission");
  });

  it("keeps the empty task popover free of the running title chrome", async function () {
    const popover = await readProjectFile(
      "src/modules/workspaceToolbarTaskPopover.ts",
    );
    const renderStart = popover.indexOf(
      'const content = xulElement(doc, "vbox", "zs-workspace-running-popover")',
    );
    const listStart = popover.indexOf(
      'const list = xulElement(doc, "vbox", "zs-workspace-running-popover-list")',
      renderStart,
    );
    const renderSetup = popover.slice(renderStart, listStart);
    const emptyBranch = renderSetup.indexOf("if (rows.length === 0)");
    const runningTitle = renderSetup.indexOf(
      '"zs-workspace-running-popover-title"',
    );
    const separator = renderSetup.indexOf(
      '"zs-workspace-running-popover-separator"',
    );

    assert.isAtLeast(renderStart, 0);
    assert.isAbove(listStart, renderStart);
    assert.isAtLeast(emptyBranch, 0);
    assert.isAtLeast(runningTitle, 0);
    assert.isAtLeast(separator, 0);
    assert.isBelow(emptyBranch, runningTitle);
    assert.isBelow(emptyBranch, separator);
  });

  it("sizes the running task popover with title and separator chrome included", async function () {
    const popover = await readProjectFile(
      "src/modules/workspaceToolbarTaskPopover.ts",
    );

    assert.include(popover, "EMPTY_POPOVER_HEIGHT");
    assert.include(popover, "RUNNING_POPOVER_CHROME_HEIGHT");
    assert.include(popover, "RUNNING_POPOVER_TASK_ROW_HEIGHT");
    assert.include(popover, "const EMPTY_POPOVER_HEIGHT = 68");
    assert.include(popover, "const RUNNING_POPOVER_CHROME_HEIGHT = 54");
    assert.include(popover, "Math.min(rowCount, MAX_VISIBLE_TASKS)");
    assert.notInclude(popover, "return 34 + rowCount * 30");
  });

  it("routes popover task clicks through the existing Assistant workspace entrypoints", async function () {
    const popover = await readProjectFile(
      "src/modules/workspaceToolbarTaskPopover.ts",
    );
    const hooks = await readProjectFile("src/hooks.ts");
    assert.include(popover, 'onPrefsEvent("openAcpSkillRunnerSidebar"');
    assert.include(popover, 'onPrefsEvent("openSkillRunnerSidebar"');
    assert.include(popover, 'onPrefsEvent("openDashboard"');
    assert.include(hooks, 'case "listDashboardActiveTasksForPopover":');
    assert.include(hooks, "projectDashboardActiveTasks");
    assert.include(hooks, "resolveBackendDisplayName");
    assert.include(hooks, "backendLabel");
    assert.include(hooks, 'case "openSkillRunnerSidebar":');
    assert.include(hooks, "requestId");
    assert.include(hooks, "backendId");
    assert.include(hooks, 'case "openAcpSkillRunnerSidebar":');
  });

  it("adds localized labels and chrome styles for the running task popover", async function () {
    const css = await readProjectFile("addon/content/zoteroPane.css");
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");
    const fr = await readProjectFile("addon/locale/fr-FR/addon.ftl");
    const ja = await readProjectFile("addon/locale/ja-JP/addon.ftl");
    const cssRule = (selector: string) => {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
      assert.isOk(match, `missing CSS rule for ${selector}`);
      return match?.[1] ?? "";
    };
    const panelRule = cssRule(".zs-workspace-running-popover-panel");
    const popoverRule = cssRule(".zs-workspace-running-popover");

    assert.include(css, ".zs-workspace-running-popover");
    assert.include(css, ".zs-workspace-running-popover-panel");
    assert.include(panelRule, "border: 0;");
    assert.include(panelRule, "background: transparent;");
    assert.include(popoverRule, "padding: 5px 8px 10px;");
    assert.include(popoverRule, "border: 0;");
    assert.include(popoverRule, "border-radius: 0;");
    assert.include(popoverRule, "box-shadow: var(--zs-pv-shadow);");
    assert.include(popoverRule, "transform: translateY(-3px);");
    assert.include(css, ".zs-workspace-running-popover-separator");
    assert.include(css, ".zs-workspace-running-popover-led-cell");
    assert.include(css, ".zs-workspace-running-popover-led");
    assert.include(css, ".zs-workspace-running-popover-task");
    assert.include(css, ".zs-assistant-sidebar-button");
    assert.notInclude(css, ".zs-skillrunner-toolbar-button[data-attention");
    assert.notInclude(css, ".zs-skillrunner-attention-button");
    assert.notInclude(css, ".zs-skillrunner-attention-led");
    assert.notInclude(css, ".zs-assistant-sidebar-badge");
    assert.notInclude(css, ".zs-skillrunner-sidebar-button[data-badge]::after");
    assert.include(css, "font-family: Georgia");
    assert.include(css, "font-size: 9px");
    assert.include(css, "white-space: nowrap");
    assert.include(css, "text-overflow: ellipsis");
    assert.notInclude(css, "grid-template-columns");
    assert.notInclude(css, "position: fixed");
    assert.include(css, "@media (prefers-color-scheme: dark)");
    assert.include(en, "task-dashboard-toolbar-running-popover-title");
    assert.include(en, "task-dashboard-toolbar-running-popover-empty");
    assert.include(zh, "task-dashboard-toolbar-running-popover-title");
    assert.include(zh, "task-dashboard-toolbar-running-popover-empty");
    assert.include(fr, "task-dashboard-toolbar-running-popover-title");
    assert.include(ja, "task-dashboard-toolbar-running-popover-title");
  });
});

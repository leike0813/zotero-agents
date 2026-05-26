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
    assert.include(helper, "PASS_THROUGH_BACKEND_TYPE");
    assert.include(helper, "getVisibleAcpSkillRunRequestIds");
    assert.include(helper, 'run.status !== "succeeded"');
    assert.include(helper, 'run.status !== "failed"');
    assert.include(helper, 'run.status !== "canceled"');
    assert.include(dashboard, "filterDashboardActiveTasks");
    assert.notInclude(dashboard, "function isVisibleDashboardActiveTask");
    assert.include(popover, "listDashboardActiveTasksForPopover");
  });

  it("wires the Workspace toolbar button to a hover-only popover without changing click behavior", async function () {
    const toolbar = await readProjectFile(
      "src/modules/dashboardToolbarButton.ts",
    );
    const popover = await readProjectFile(
      "src/modules/workspaceToolbarTaskPopover.ts",
    );

    assert.include(toolbar, "installWorkspaceToolbarTaskPopover");
    assert.include(toolbar, "uninstallWorkspaceToolbarTaskPopover");
    assert.include(toolbar, "openDashboard");
    assert.include(toolbar, "zs-workspace-toolbar-button");
    assert.include(popover, "mouseenter");
    assert.include(popover, "mouseleave");
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
    assert.include(popover, "isPlainRunningState");
    assert.include(
      popover,
      'background-color: ${isPlainRunning ? "#2563eb" : "#f59e0b"}',
    );
    assert.include(popover, "TASK_NAME_WIDTH");
    assert.include(popover, 'item.setAttribute("role", "button")');
    assert.notInclude(popover, "htmlElement");
    assert.notInclude(popover, "formatUpdatedAt");
    assert.notInclude(popover, "resolveStatusLabel");
    assert.notInclude(popover, "View all");
    assert.notInclude(popover, "Open Dashboard");
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
    assert.include(hooks, "filterDashboardActiveTasks");
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

    assert.include(css, ".zs-workspace-running-popover");
    assert.include(css, ".zs-workspace-running-popover-panel");
    assert.include(css, ".zs-workspace-running-popover-separator");
    assert.include(css, ".zs-workspace-running-popover-led-cell");
    assert.include(css, ".zs-workspace-running-popover-led");
    assert.include(css, ".zs-workspace-running-popover-task");
    assert.include(css, "font-family: Georgia");
    assert.include(css, "font-size: 10px");
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

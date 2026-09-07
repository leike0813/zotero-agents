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

describe("dashboard home workflow doc bubbles", function () {
  it("extends dashboard snapshot with home workflow entries and embedded doc view", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    const wire = await readProjectFile("src/shared/dashboardWireContract.ts");
    assert.include(wire, "homeWorkflows?: DashboardHomeWorkflowEntry[];");
    assert.include(wire, "core: boolean;");
    assert.include(wire, "quickRunEnabled: boolean;");
    assert.include(wire, "quickRunDisabledReason?: string;");
    assert.include(wire, "homeWorkflowDocView?: DashboardHomeWorkflowDocView;");
    assert.include(ts, "buildHomeWorkflowSummaries");
    assert.include(ts, "buildHomeWorkflowDocView");
    assert.include(
      ts,
      'const readmePath = joinPath(matched.rootDir, "README.md")',
    );
    assert.include(ts, "renderMarkdownToSafeHtml");
  });

  it("adds home doc route actions while preserving home tab selection", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(ts, 'if (action === "open-home-workflow-doc")');
    assert.include(ts, 'if (action === "close-home-workflow-doc")');
    assert.include(ts, 'if (action === "open-home-workflow-settings")');
    assert.include(ts, 'if (action === "run-home-workflow")');
    assert.include(ts, "triggerWorkflowFromUnifiedEntry");
    assert.include(ts, 'state.selectedTabKey = "home";');
    assert.include(ts, 'state.selectedTabKey = "workflow-options";');
    assert.include(ts, "state.homeWorkflowDocWorkflowId = workflowId;");
  });

  it("renders workflow bubbles above summary cards and supports doc subview in home", async function () {
    const region = await readProjectFile(
      "src/dashboard/components/HomeRegion.tsx",
    );
    const panelModel = await readProjectFile(
      "src/dashboard/dashboardPanelModel.ts",
    );
    assert.include(region, "workflow-bubbles-section");
    assert.include(region, 'onAction("run-home-workflow", { workflowId })');
    assert.include(
      panelModel,
      "runDisabled: workflow.quickRunEnabled !== true",
    );
    assert.include(panelModel, "workflow.quickRunDisabledReason");
    assert.include(
      region,
      'onAction("open-home-workflow-doc", { workflowId })',
    );
    assert.include(
      region,
      'onAction("open-home-workflow-settings", { workflowId })',
    );
    assert.include(
      panelModel,
      "settingsDisabled: workflow.configurable !== true",
    );
    assert.include(region, 'selection.kind === "doc" && selection.doc');
    assert.include(region, 'onAction("close-home-workflow-doc", {})');
    assert.isBelow(
      region.indexOf("workflow-bubbles-section"),
      region.indexOf("{selection.summaryTitle}"),
      "workflow bubbles render above the summary cards",
    );
  });

  it("marks official workflows and hides marker when same-id user workflow overrides", async function () {
    const runtime = await readProjectFile("src/modules/workflowRuntime.ts");
    const dialog = await readProjectFile("src/modules/taskManagerDialog.ts");
    const region = await readProjectFile(
      "src/dashboard/components/HomeRegion.tsx",
    );
    const panelModel = await readProjectFile(
      "src/dashboard/dashboardPanelModel.ts",
    );

    assert.include(runtime, 'workflowSourceById[workflowId] = "official";');
    assert.include(runtime, 'workflowSourceById[workflowId] = "user";');
    assert.include(
      runtime,
      'Workflow "${workflowId}" exists in ${workflowSourceById[workflowId]} and user directories; using user workflow',
    );

    assert.include(dialog, "official:");
    assert.include(dialog, "core: isCoreWorkflow(workflow)");
    assert.include(dialog, "getLoadedWorkflowSourceById(workflow.manifest.id)");
    assert.include(dialog, '"official"');

    assert.include(panelModel, "workflow.official === true");
    assert.include(region, "workflow-bubble-official-badge");
    assert.include(panelModel, "workflow.core === true");
    assert.include(region, "workflow-bubble-core-badge");
  });

  it("groups core workflows in menu and renders core workflow badges", async function () {
    const menu = await readProjectFile("src/modules/workflowMenu.ts");
    const panelModel = await readProjectFile(
      "src/dashboard/dashboardPanelModel.ts",
    );
    const css = await readProjectFile("addon/content/dashboard/styles.css");

    assert.include(menu, "compareWorkflowDisplayOrder");
    assert.include(menu, "isCoreWorkflow");
    assert.include(menu, "previousWasCore");
    assert.include(menu, 'menuItem.setAttribute("style", "font-weight: 700;")');
    assert.include(panelModel, 'labelText(labels, "homeWorkflowCoreBadge")');
    assert.include(css, ".workflow-bubble-core-badge");
  });

  it("reuses the workflow menu trigger for dashboard quick-run actions", async function () {
    const menu = await readProjectFile("src/modules/workflowMenu.ts");
    const dialog = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(
      menu,
      "export async function triggerWorkflowFromUnifiedEntry",
    );
    assert.include(menu, "executeWorkflowFromCurrentSelection({");
    assert.include(menu, "requireSettingsGate: true");
    assert.include(menu, 'source: "workflow-menu"');
    assert.include(dialog, 'source: "dashboard-home"');
  });

  it("enforces compact horizontal wrapping layout invariants for workflow bubbles", async function () {
    const domUtils = await readProjectFile(
      "src/dashboard/dashboardDomUtils.ts",
    );
    const homeRegion = await readProjectFile(
      "src/dashboard/components/HomeRegion.tsx",
    );
    const tabBarRegion = await readProjectFile(
      "src/dashboard/components/TabBarRegion.tsx",
    );
    const css = await readProjectFile("addon/content/dashboard/styles.css");
    const iconCss = await readProjectFile("addon/content/shared/icons.css");
    assert.include(css, ".workflow-bubbles-wrap {");
    assert.include(css, "display: grid;");
    assert.include(
      css,
      "grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));",
    );
    assert.include(css, ".workflow-bubble {");
    assert.include(css, "display: flex;");
    assert.include(css, "flex-direction: column;");
    assert.include(css, "justify-content: space-between;");
    assert.include(css, ".workflow-bubble-title {");
    assert.include(css, "min-height: 32px;");
    assert.include(css, ".workflow-bubble-title-text {");
    assert.include(css, "-webkit-line-clamp: 2;");
    assert.include(css, ".workflow-bubble-actions {");
    assert.include(css, "flex-wrap: nowrap;");
    assert.include(css, "--dashboard-control-bg");
    assert.include(css, "--dashboard-control-bg: #dbeafe");
    assert.include(css, ".workflow-bubble-btn {");
    assert.include(css, "appearance: none");
    assert.include(css, "-moz-appearance: none");
    assert.include(css, "background-image: none");
    assert.include(css, "box-shadow: var(--dashboard-control-shadow)");
    assert.include(domUtils, "function dashboardTabIconClass(tabKey");
    assert.include(domUtils, 'home: "zs-icon-dashboard"');
    assert.include(
      domUtils,
      '"workflow-options": "zs-icon-settings-applications"',
    );
    assert.include(domUtils, 'products: "zs-icon-inventory-2"');
    assert.include(domUtils, '"runtime-logs": "zs-icon-terminal"');
    assert.include(tabBarRegion, "tab-btn-content");
    assert.include(css, ".tab-btn-content");
    assert.include(css, ".workflow-bubble-icon {");
    assert.include(homeRegion, "workflow-bubble-icon-run");
    assert.include(iconCss, "background-color: currentColor");
    assert.include(homeRegion, "zs-icon-play-arrow");
    assert.include(homeRegion, "zs-icon-description");
    assert.include(homeRegion, "zs-icon-settings");
    assert.include(iconCss, ".zs-icon-play-arrow");
    assert.include(iconCss, ".zs-icon-description");
    assert.include(iconCss, ".zs-icon-settings");
    const icon = await readProjectFile(
      "addon/content/icons/material-symbols/play_arrow.svg",
    );
    assert.include(icon, "<svg");
  });

  it("defines home workflow doc i18n keys in both locales", async function () {
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");
    assert.include(en, "task-dashboard-home-workflows-title = Workflows");
    assert.include(en, "task-dashboard-home-workflow-doc = Description");
    assert.include(en, "task-dashboard-home-workflow-run = Run workflow");
    assert.include(
      en,
      "task-dashboard-home-workflow-run-disabled-selection = Requires a Zotero selection",
    );
    assert.include(
      en,
      "task-dashboard-home-workflow-run-disabled-settings = Requires settings before running",
    );
    assert.include(en, "task-dashboard-home-workflow-settings = Settings");
    assert.include(en, "task-dashboard-home-workflow-core = Core");
    assert.include(
      en,
      "task-dashboard-home-workflow-doc-back = Back to Dashboard",
    );
    assert.include(zh, "task-dashboard-home-workflow-doc = 说明");
    assert.include(zh, "task-dashboard-home-workflow-run = 调用 workflow");
    assert.include(
      zh,
      "task-dashboard-home-workflow-run-disabled-selection = 需要 Zotero 选区",
    );
    assert.include(
      zh,
      "task-dashboard-home-workflow-run-disabled-settings = 运行前需要配置",
    );
    assert.include(zh, "task-dashboard-home-workflow-settings = 设置");
    assert.include(zh, "task-dashboard-home-workflow-core = 核心");
    assert.include(
      zh,
      "task-dashboard-home-workflow-doc-back = 回到 Dashboard",
    );
  });
});

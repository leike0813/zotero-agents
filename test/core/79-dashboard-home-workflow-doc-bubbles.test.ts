import { assert } from "chai";
import { getProjectRoot, joinPath, readUtf8 } from "../zotero/workflow-test-utils";

async function readProjectFile(relativePath: string) {
  const targetPath = joinPath(getProjectRoot(), relativePath);
  return readUtf8(targetPath);
}

describe("dashboard home workflow doc bubbles", function () {
  it("extends dashboard snapshot with home workflow entries and embedded doc view", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(ts, "homeWorkflows?: Array<{");
    assert.include(ts, "quickRunEnabled: boolean;");
    assert.include(ts, "quickRunDisabledReason?: string;");
    assert.include(ts, "homeWorkflowDocView?: {");
    assert.include(ts, "buildHomeWorkflowSummaries");
    assert.include(ts, "buildHomeWorkflowDocView");
    assert.include(ts, 'const readmePath = joinPath(matched.rootDir, "README.md")');
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
    const js = await readProjectFile("addon/content/dashboard/app.js");
    assert.include(js, "workflow-bubbles-section");
    assert.include(js, 'sendAction("run-home-workflow", {');
    assert.include(js, "runButton.disabled = workflow.quickRunEnabled !== true;");
    assert.include(js, "workflow.quickRunDisabledReason");
    assert.include(js, 'sendAction("open-home-workflow-doc", {');
    assert.include(js, 'sendAction("open-home-workflow-settings", {');
    assert.include(js, "settingsButton.disabled = workflow.configurable !== true;");
    assert.include(js, "function renderHomeWorkflowDoc(main, snapshot)");
    assert.include(js, 'sendAction("close-home-workflow-doc", {});');
    assert.include(js, "if (snapshot.homeWorkflowDocView)");
  });

  it("marks builtin workflows and hides marker when same-id user workflow overrides", async function () {
    const runtime = await readProjectFile("src/modules/workflowRuntime.ts");
    const dialog = await readProjectFile("src/modules/taskManagerDialog.ts");
    const app = await readProjectFile("addon/content/dashboard/app.js");

    assert.include(runtime, 'workflowSourceById[workflowId] = "builtin";');
    assert.include(runtime, 'workflowSourceById[workflowId] = "user";');
    assert.include(
      runtime,
      'Workflow "${workflowId}" exists in builtin and user directories; using user workflow',
    );

    assert.include(
      dialog,
      'builtin: getLoadedWorkflowSourceById(workflow.manifest.id) === "builtin"',
    );

    assert.include(app, "if (workflow.builtin === true)");
    assert.include(app, "workflow-bubble-builtin-badge");
  });

  it("reuses the workflow menu trigger for dashboard quick-run actions", async function () {
    const menu = await readProjectFile("src/modules/workflowMenu.ts");
    const dialog = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(menu, "export async function triggerWorkflowFromUnifiedEntry");
    assert.include(menu, "executeWorkflowFromCurrentSelection({");
    assert.include(menu, "requireSettingsGate: true");
    assert.include(menu, 'source: "workflow-menu"');
    assert.include(dialog, 'source: "dashboard-home"');
  });

  it("enforces compact horizontal wrapping layout invariants for workflow bubbles", async function () {
    const css = await readProjectFile("addon/content/dashboard/styles.css");
    assert.include(css, ".workflow-bubbles-wrap {");
    assert.include(css, "display: flex;");
    assert.include(css, "flex-wrap: wrap;");
    assert.include(css, ".workflow-bubble {");
    assert.include(css, "width: fit-content;");
    assert.include(css, "inline-size: max-content;");
    assert.include(css, ".workflow-bubble-title {");
    assert.include(css, "white-space: nowrap;");
    assert.include(css, ".workflow-bubble-actions {");
    assert.include(css, "flex-wrap: nowrap;");
    assert.include(css, ".workflow-bubble-icon-run {");
    assert.include(css, 'background-image: url("../icons/icon_workflow_run.svg")');
    const icon = await readProjectFile("addon/content/icons/icon_workflow_run.svg");
    assert.include(icon, "<svg");
    assert.include(icon, "stroke=\"#334155\"");
  });

  it("defines home workflow doc i18n keys in both locales", async function () {
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");
    assert.include(en, "task-dashboard-home-workflows-title = Workflows");
    assert.include(en, "task-dashboard-home-workflow-doc = Description");
    assert.include(en, "task-dashboard-home-workflow-run = Run workflow");
    assert.include(en, "task-dashboard-home-workflow-run-disabled-selection = Requires a Zotero selection");
    assert.include(en, "task-dashboard-home-workflow-run-disabled-settings = Requires settings before running");
    assert.include(en, "task-dashboard-home-workflow-settings = Settings");
    assert.include(en, "task-dashboard-home-workflow-doc-back = Back to Dashboard");
    assert.include(zh, "task-dashboard-home-workflow-doc = 说明");
    assert.include(zh, "task-dashboard-home-workflow-run = 调用 workflow");
    assert.include(zh, "task-dashboard-home-workflow-run-disabled-selection = 需要 Zotero 选区");
    assert.include(zh, "task-dashboard-home-workflow-run-disabled-settings = 运行前需要配置");
    assert.include(zh, "task-dashboard-home-workflow-settings = 设置");
    assert.include(zh, "task-dashboard-home-workflow-doc-back = 回到 Dashboard");
  });
});

import { assert } from "chai";
import { getProjectRoot, joinPath, readUtf8 } from "../zotero/workflow-test-utils";

async function readProjectFile(relativePath: string) {
  const targetPath = joinPath(getProjectRoot(), relativePath);
  return readUtf8(targetPath);
}

describe("skillrunner sidebar entrypoints", function () {
  it("routes dashboard open-run actions to the Assistant shell instead of the legacy dialog", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(ts, "openAssistantWorkspaceSidebar");
    assert.notInclude(ts, "await openSkillRunnerRunDialog({");
    assert.include(ts, 'if (action === "open-running-task")');
    assert.include(ts, 'if (action === "open-run")');
  });

  it("adds a dedicated workflow-menu entry for opening the skillrunner sidebar", async function () {
    const ts = await readProjectFile("src/modules/workflowMenu.ts");
    assert.include(ts, "menu-workflows-open-skillrunner-sidebar");
    assert.include(ts, 'onPrefsEvent("openSkillRunnerSidebar"');
  });

  it("defines localization for the toolbar toggle, side tool entry, and menu sidebar entry", async function () {
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");
    assert.include(
      en,
      "task-dashboard-toolbar-open-skillrunner = Open/Close Assistant Sidebar",
    );
    assert.include(
      zh,
      "task-dashboard-toolbar-open-skillrunner = 打开/关闭 Assistant 侧边栏",
    );
    assert.include(
      en,
      "task-dashboard-sidebar-skillrunner = Skill-Runner",
    );
    assert.include(
      zh,
      "task-dashboard-sidebar-skillrunner = Skill-Runner",
    );
    assert.include(
      en,
      "menu-workflows-open-skillrunner-sidebar = Open SkillRunner Sidebar...",
    );
    assert.include(
      zh,
      "menu-workflows-open-skillrunner-sidebar = 打开 SkillRunner 侧边栏...",
    );
  });

  it("keeps the legacy dialog as an explicit sidebar fallback", async function () {
    const ts = await readProjectFile("src/modules/skillRunnerSidebar.ts");
    assert.include(ts, "openSkillRunnerRunDialog");
    assert.include(ts, "sidebar injection failed");
    assert.include(ts, "openSkillRunnerSidebar");
    assert.include(ts, "toggleSkillRunnerSidebar");
    assert.include(ts, "closeSkillRunnerSidebar");
  });

  it("routes the main toolbar button through the sidebar toggle entrypoint", async function () {
    const ts = await readProjectFile("src/modules/dashboardToolbarButton.ts");
    assert.include(ts, 'onPrefsEvent("toggleSkillRunnerSidebar"');
    assert.notInclude(ts, 'onPrefsEvent("openSkillRunnerSidebar", { window: win })');
  });

  it("routes interactive request-created openings through the Assistant shell entrypoint", async function () {
    const ts = await readProjectFile("src/modules/workflowExecution/runSeam.ts");
    assert.include(ts, "openAssistantWorkspaceSidebar");
    assert.include(ts, "focusSkillRunnerWorkspace");
    assert.include(ts, "selectAcpSkillRun");
    assert.notInclude(ts, "resolved.openSkillRunnerRunDialog({");
    assert.notInclude(ts, "openSkillRunnerSidebar");
  });
});

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

describe("skillrunner sidebar entrypoints", function () {
  it("routes dashboard open-run actions to the unified Assistant workspace", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(ts, "openAssistantWorkspaceSidebar");
    assert.notInclude(ts, "await openSkillRunnerRunDialog({");
    assert.include(ts, 'if (action === "open-running-task")');
    assert.include(ts, 'if (action === "open-run")');
  });

  it("keeps compatibility menu actions but forwards them through the Assistant workspace host", async function () {
    const workflowMenu = await readProjectFile("src/modules/workflowMenu.ts");
    const hooks = await readProjectFile("src/hooks.ts");
    const workspaceHost = await readProjectFile(
      "src/modules/assistantWorkspaceSidebar.ts",
    );

    assert.include(workflowMenu, "menu-workflows-open-assistant-sidebar");
    assert.include(workflowMenu, 'onPrefsEvent("openSkillRunnerSidebar"');
    assert.include(hooks, "openAssistantWorkspaceSidebar");
    assert.include(hooks, 'case "openSkillRunnerSidebar":');
    assert.include(
      hooks,
      'tab: requestId || backend ? "skillrunner" : undefined',
    );
    assert.include(hooks, 'case "openAcpSidebar":');
    assert.include(hooks, 'tab: "acp-chat"');
    assert.include(hooks, 'case "openAcpSkillRunnerSidebar":');
    assert.include(hooks, 'tab: "acp-skills"');
    assert.notInclude(hooks, 'from "./modules/acpSidebar"');
    assert.notInclude(hooks, 'from "./modules/acpSkillRunnerSidebar"');
    assert.notInclude(hooks, 'from "./modules/skillRunnerSidebar"');
    assert.include(workspaceHost, "openAssistantWorkspaceSidebar");
    assert.include(workspaceHost, "assistant-workspace.html");
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
    assert.include(en, "task-dashboard-sidebar-skillrunner = Skill-Runner");
    assert.include(zh, "task-dashboard-sidebar-skillrunner = Skill-Runner");
    assert.include(en, "menu-workflows-open-assistant-sidebar = Open Sidebar");
    assert.include(zh, "menu-workflows-open-assistant-sidebar = 打开侧边栏");
  });

  it("keeps the current child pages behind the unified Assistant workspace", async function () {
    const html = await readProjectFile(
      "addon/content/dashboard/assistant-workspace.html",
    );
    const js = await readProjectFile(
      "addon/content/dashboard/assistant-workspace.js",
    );
    assert.include(html, 'src="./acp-chat.html"');
    assert.include(html, 'src="./acp-skill-run.html"');
    assert.include(html, 'src="./run-dialog.html"');
    assert.include(js, '"acp-chat"');
    assert.include(js, '"acp-skills"');
    assert.include(js, '"skillrunner"');
    assert.include(
      js,
      'setActiveTab("acp-chat", { notify: false, fallback: "acp-chat" })',
    );
    assert.notInclude(js, "localStorage");
  });

  it("routes the main toolbar button through the unified sidebar toggle entrypoint", async function () {
    const ts = await readProjectFile("src/modules/dashboardToolbarButton.ts");
    const hooks = await readProjectFile("src/hooks.ts");
    assert.include(ts, 'onPrefsEvent("toggleSkillRunnerSidebar"');
    assert.notInclude(
      ts,
      'onPrefsEvent("openSkillRunnerSidebar", { window: win })',
    );
    assert.include(hooks, 'case "toggleSkillRunnerSidebar":');
    assert.include(hooks, "toggleAssistantWorkspaceSidebar({");
    assert.notInclude(
      hooks,
      'case "toggleSkillRunnerSidebar":\n      await toggleAssistantWorkspaceSidebar({\n        window: data.window,\n        tab: "skillrunner",',
    );
  });

  it("routes interactive request-ready openings through the Assistant shell entrypoint", async function () {
    const ts = await readProjectFile(
      "src/modules/workflowExecution/runSeam.ts",
    );
    assert.include(ts, "openAssistantWorkspaceSidebar");
    assert.include(ts, 'event.type === "request-ready"');
    assert.include(ts, "selectAcpSkillRun");
    assert.notInclude(ts, "resolved.openSkillRunnerRunDialog({");
    assert.notInclude(ts, "openSkillRunnerSidebar");
  });
});

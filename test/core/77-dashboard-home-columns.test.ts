import { assert } from "chai";
import { getProjectRoot, joinPath, readUtf8 } from "../zotero/workflow-test-utils";

async function readProjectFile(relativePath: string) {
  const targetPath = joinPath(getProjectRoot(), relativePath);
  return readUtf8(targetPath);
}

describe("dashboard home columns", function () {
  it("renders home running table with backend column and row-click routing", async function () {
    const js = await readProjectFile("addon/content/dashboard/app.js");
    const html = await readProjectFile("addon/content/dashboard/index.html");
    const css = await readProjectFile("addon/content/dashboard/styles.css");
    const customSelectCss = await readProjectFile("addon/content/components/custom-select.css");
    assert.include(html, "../shared/theme.js");
    assert.include(html, "../shared/theme.css");
    assert.include(css, "--bg: var(--zs-bg)");
    assert.include(css, "--panel: var(--zs-panel)");
    assert.include(css, "background: var(--zs-bg-gradient)");
    assert.include(customSelectCss, "--zs-input-bg");
    assert.include(customSelectCss, "--zs-border-strong");
    assert.include(js, "labels.colBackend || \"Backend\"");
    assert.include(
      js,
      "columns: [\n          labels.colTask,\n          labels.colWorkflow,\n          labels.colBackend || \"Backend\",\n          labels.colStatus,\n          labels.colUpdatedAt,\n        ]",
    );
    assert.include(js, "onRowClick: (row) => {");
    assert.include(js, 'sendAction("open-running-task", {');
    assert.include(js, "taskId: row.id,");
    assert.include(js, "backendId: row.backendId || \"\",");
    assert.include(js, "backendType: row.backendType || \"\",");
    assert.include(js, "requestId: row.requestId || \"\",");
    assert.notInclude(
      js,
      "columns: [\n      labels.colTask,\n      labels.colWorkflow,\n      labels.colStatus,\n      labels.colRequestId,\n      labels.colUpdatedAt,\n      labels.colActions || \"Actions\",\n    ]",
    );
  });

  it("maps backend label into dashboard running rows", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(ts, "backendId: string;");
    assert.include(ts, "backendType: string;");
    assert.include(ts, "backendLabel: string;");
    assert.include(ts, "const backendDisplayName = backendId");
    assert.include(ts, "backendId,");
    assert.include(ts, "backendType,");
    assert.include(ts, "`${backendDisplayName} (${backendType})`");
    assert.include(ts, "options?.backendMetaById?.get(backendId)");
    assert.include(ts, "String(backendMeta?.type || \"\").trim()");
    assert.include(ts, "colBackend: localize(\"task-dashboard-col-backend\", \"Backend\")");
  });

  it("filters stale ACP skill run task rows from the home running list", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    const activeTasksTs = await readProjectFile("src/modules/dashboardActiveTasks.ts");
    assert.include(activeTasksTs, "function isVisibleDashboardActiveTask");
    assert.include(activeTasksTs, "function isAcpSkillRunTask");
    assert.include(ts, "listAcpSkillRuns()");
    assert.include(ts, "filterDashboardActiveTasks");
    assert.include(activeTasksTs, "visibleAcpRequestIds.has(requestId)");
    assert.include(activeTasksTs, 'taskId.startsWith("acp-skill-run:")');
    assert.include(activeTasksTs, "return false;");
    assert.include(activeTasksTs, "run.status !== \"succeeded\"");
    assert.include(activeTasksTs, "run.status !== \"failed\"");
    assert.include(activeTasksTs, "run.status !== \"canceled\"");
  });

  it("coalesces noisy dashboard task refreshes to keep running-list scrolling stable", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(ts, "deferredDashboardRefreshTimer");
    assert.include(ts, "dashboardRefreshQueued");
    assert.include(ts, "const isNoisyRefreshReason");
    assert.include(ts, 'reason === "task-update"');
    assert.include(ts, 'reason === "backend-health"');
    assert.include(ts, 'reason === "periodic"');
    assert.include(ts, "scheduleDeferredDashboardRefresh()");
    assert.include(ts, "clearDeferredDashboardRefresh()");
  });

  it("routes row-click by backend type and handles missing skillrunner requestId", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(ts, 'if (action === "open-running-task")');
    assert.include(ts, 'requestKind === ACP_SKILL_RUN_REQUEST_KIND');
    assert.include(ts, 'taskId.startsWith("acp-skill-run:")');
    assert.include(ts, 'tab: "acp-skills"');
    assert.include(ts, 'if (backendType === "skillrunner")');
    assert.include(ts, 'if (backendType === "generic-http")');
    assert.include(ts, 'state.selectedTabKey = toBackendTabKey(backendId);');
    assert.include(ts, '"task-dashboard-open-run-missing-request-id"');
  });

  it("defines missing-request-id prompt in both locales", async function () {
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");
    assert.include(
      en,
      "task-dashboard-open-run-missing-request-id = This run does not have a request ID yet. Try again later.",
    );
    assert.include(
      zh,
      "task-dashboard-open-run-missing-request-id = 当前运行尚未分配 request ID，请稍后再试。",
    );
  });
});

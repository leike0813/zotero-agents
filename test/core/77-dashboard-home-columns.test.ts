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

describe("dashboard home columns", function () {
  it("renders home running table with backend column and row-click routing", async function () {
    const panelModel = await readProjectFile(
      "src/dashboard/dashboardPanelModel.ts",
    );
    const homeRegion = await readProjectFile(
      "src/dashboard/components/HomeRegion.tsx",
    );
    const html = await readProjectFile("addon/content/dashboard/index.html");
    const css = await readProjectFile("addon/content/dashboard/styles.css");
    const customSelectCss = await readProjectFile(
      "addon/content/components/custom-select.css",
    );
    assert.include(html, "../shared/theme.js");
    assert.include(html, "../shared/theme.css");
    assert.include(css, "--bg: var(--zs-bg)");
    assert.include(css, "--panel: var(--zs-panel)");
    assert.include(css, "background: var(--zs-bg-gradient)");
    assert.include(customSelectCss, "--zs-input-bg");
    assert.include(customSelectCss, "--zs-border-strong");
    const runningColumnsBlock = /runningColumns: \[[\s\S]*?\]/.exec(panelModel);
    assert.ok(runningColumnsBlock, "panel model defines runningColumns");
    assert.deepEqual(
      [
        ...runningColumnsBlock![0].matchAll(/labelText\(labels, "([^"]+)"\)/g),
      ].map((match) => match[1]),
      ["colTask", "colWorkflow", "colBackend", "colStatus", "colUpdatedAt"],
    );
    assert.include(homeRegion, 'onAction("open-running-task", {');
    assert.include(homeRegion, "taskId: row.taskId,");
    assert.include(homeRegion, "backendId: row.backendId,");
    assert.include(homeRegion, "backendType: row.backendType,");
    assert.include(homeRegion, "requestId: row.requestId,");
  });

  it("maps backend label into dashboard running rows", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    const wire = await readProjectFile("src/shared/dashboardWireContract.ts");
    assert.include(wire, "backendId: string;");
    assert.include(wire, "backendType: string;");
    assert.include(wire, "backendLabel: string;");
    assert.include(ts, "const backendDisplayName = backendId");
    assert.include(ts, "backendId,");
    assert.include(ts, "backendType,");
    assert.include(ts, "`${backendDisplayName} (${backendType})`");
    assert.include(ts, "options?.backendMetaById?.get(backendId)");
    assert.include(ts, 'String(backendMeta?.type || "").trim()');
    assert.include(
      ts,
      'colBackend: localize("task-dashboard-col-backend", "Backend")',
    );
  });

  it("keeps dashboard chrome, product, and log affordances behind labels", async function () {
    const panelModel = await readProjectFile(
      "src/dashboard/dashboardPanelModel.ts",
    );
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    const harness = await readProjectFile(
      "src/modules/harness/dashboardReadonlyModel.ts",
    );

    for (const token of [
      'labelText(labels, "homeWorkflowTitle")',
      'labelText(labels, "homeWorkflowRunButton")',
      'labelText(labels, "productsNoFiles")',
      'labelText(labels, "productsRawMarkdown")',
      'labelText(labels, "runtimeLogsFilterBackend")',
      'labelText(labels, "logsDetailClose")',
    ]) {
      assert.include(panelModel, token);
    }
    assert.include(ts, "loadingDashboard: localize(");
    assert.include(ts, '"task-dashboard-products-no-files"');
    assert.include(harness, 'productsNoFiles: "No product files."');
  });

  it("exports a logical Product tree instead of opening managed storage", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(ts, "exportWorkflowProductToDirectory({");
    assert.include(ts, 'mode: "folder"');
    assert.include(ts, 'label: "product export folder"');
    assert.notInclude(ts, "product?.cacheDir");
    assert.include(
      ts,
      '"task-dashboard-products-open-workspace",\n      "Export Product"',
    );
  });

  it("serializes normal Product exports and always clears their busy state", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(ts, "productExportInProgress: boolean;");
    assert.include(ts, "if (state.productExportInProgress)");
    assert.include(ts, "state.productExportInProgress = true;");
    assert.include(ts, "state.productExportInProgress = false;");
    assert.include(ts, "finally");
    assert.include(ts, "isExporting: args.state.productExportInProgress");
  });

  it("filters stale ACP skill run task rows from the home running list", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    const activeTasksTs = await readProjectFile(
      "src/modules/dashboardActiveTasks.ts",
    );
    const acpProjectionTs = await readProjectFile(
      "src/modules/acpSkillRunTaskProjection.ts",
    );
    assert.include(activeTasksTs, "function isVisibleDashboardActiveTask");
    assert.include(activeTasksTs, "function isAcpSkillRunTask");
    assert.include(ts, "listAcpSkillRunSummaries({");
    assert.include(ts, "projectDashboardActiveTasks");
    assert.include(activeTasksTs, "mapAcpSkillRunSummaryToWorkflowTask");
    assert.include(activeTasksTs, "visibleAcpRequestIds.has(requestId)");
    assert.include(activeTasksTs, 'taskId.startsWith("acp-skill-run:")');
    assert.include(activeTasksTs, "return false;");
    assert.include(activeTasksTs, "isActiveAcpSkillRunStatus(run.status)");
    assert.include(acpProjectionTs, "resolveAcpSkillRunWorkflowTaskState");
  });

  it("coalesces noisy dashboard task refreshes to keep running-list scrolling stable", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(ts, "deferredDashboardRefreshTimer");
    assert.include(ts, "dashboardRefreshQueued");
    assert.include(ts, "const isNoisyRefreshReason");
    assert.include(ts, 'reason === "task-update"');
    assert.include(ts, 'reason === "backend-health"');
    assert.include(ts, 'reason === "periodic"');
    assert.include(ts, "scheduleDeferredDashboardRefresh(reason)");
    assert.include(ts, "clearDeferredDashboardRefresh()");
  });

  it("routes row-click by backend type and requires skillrunner runKey", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(ts, 'if (action === "open-running-task")');
    assert.include(ts, "requestKind === ACP_SKILL_RUN_REQUEST_KIND");
    assert.include(ts, 'taskId.startsWith("acp-skill-run:")');
    assert.include(ts, 'tab: "acp-skills"');
    assert.include(ts, 'if (backendType === "skillrunner")');
    assert.include(ts, "if (!runKey)");
    assert.include(ts, 'tab: "skillrunner"');
    assert.include(ts, 'if (backendType === "generic-http")');
    assert.include(ts, "state.selectedTabKey = toBackendTabKey(backendId);");
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

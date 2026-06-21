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

describe("workflow settings single-source routing", function () {
  it("routes prefs openWorkflowSettings to dashboard workflow-options tab", async function () {
    const ts = await readProjectFile("src/hooks.ts");
    assert.include(ts, 'case "openWorkflowSettings"');
    assert.include(ts, 'initialTabKey: "workflow-options"');
    assert.include(ts, "initialWorkflowId:");
  });

  it("enforces settings gate on interactive workflow trigger", async function () {
    const ts = await readProjectFile("src/modules/workflowMenu.ts");
    assert.include(ts, "requireSettingsGate: true");
    assert.include(ts, "triggerWorkflowFromUnifiedEntry");
    assert.include(ts, "menu-trigger-failed");
  });

  it("supports submit-time override and persist switch in execution entry", async function () {
    const ts = await readProjectFile("src/modules/workflowExecute.ts");
    assert.include(ts, "executionOptionsOverride?: WorkflowExecutionOptions");
    assert.include(ts, "openWorkflowSettingsWebDialog");
    assert.include(ts, "if (dialogResult.persist)");
    assert.include(ts, "updateWorkflowSettings(");
    assert.include(ts, 'dialogResult.status === "canceled"');
    assert.include(
      ts,
      'stage: canceled ? "settings-gate-canceled" : "settings-gate-failed"',
    );
  });

  it("uses compact web dialog layout without framework-level extra cancel button", async function () {
    const ts = await readProjectFile(
      "src/modules/workflowSettingsWebDialog.ts",
    );
    assert.include(ts, "Save as default settings");
    assert.include(ts, "fitContent: false");
    assert.include(ts, "WORKFLOW_SETTINGS_DIALOG_WIDTH = 700");
    assert.include(ts, "WORKFLOW_SETTINGS_DIALOG_INITIAL_HEIGHT = 540");
    assert.include(ts, "WORKFLOW_SETTINGS_DIALOG_MIN_HEIGHT = 440");
    assert.include(ts, "resizeWorkflowSettingsDialogToContent");
    assert.include(ts, 'if (action === "resize-to-content")');
    assert.include(ts, "WORKFLOW_SETTINGS_DIALOG_SCREEN_MARGIN = 48");
    assert.include(ts, "isStructuralDraftChange");
    assert.include(ts, "toRunOptionsFormValues");
    assert.include(ts, "normalizeWorkflowRunOptions(raw.runOptions)");
    assert.include(ts, "showAcpRuntimeCacheRefreshToast");
    assert.include(ts, "showWorkflowToast");
    assert.include(ts, 'if (action === "refresh-acp-runtime-cache")');
    assert.include(ts, "changedSection");
    assert.include(ts, "changedKey");
    assert.include(ts, "Object.prototype.hasOwnProperty.call");
    assert.include(ts, '"executionOptions"');
    assert.notInclude(ts, 'ACP config cache refresh failed");');
    assert.notInclude(ts, ".addButton(");
  });

  it("exposes workflow-options tab and debounced save actions in dashboard host", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(ts, 'key: "workflow-options"');
    assert.include(ts, 'if (action === "workflow-settings-draft")');
    assert.include(ts, "workflowSettingsSaveStateById");
    assert.include(ts, 'reason === "periodic" || reason === "task-update"');
    assert.include(ts, "const changedSection = normalizeDraftChangedSection(");
    assert.include(ts, "payload.changedSection");
    assert.include(ts, "const changedKey = normalizeDraftChangedKey(");
    assert.include(ts, "payload.changedKey");
    assert.include(ts, "isWorkflowSettingsStructuralRefreshChange");
    assert.notInclude(
      ts,
      'state.workflowSettingsSaveErrorById.delete(workflowId);\n      refresh("user-action");',
    );
  });

  it("emits draft changed metadata and preserves workflow-options scroll on rerender", async function () {
    const js = await readProjectFile("addon/content/dashboard/app.js");
    assert.include(js, "workflow-settings-banner");
    assert.include(js, "workflow-settings-sections-grid");
    assert.include(js, 'changedSection: "backend"');
    assert.include(js, 'changedKey: "backendId"');
    assert.include(js, "changedSection: args.changedSection");
    assert.include(js, "changedKey:");
    assert.include(js, "shouldRestoreWorkflowOptionsScroll");
    assert.include(js, "previousMainScrollTop");
    assert.include(js, "main.scrollTop = previousMainScrollTop");
    assert.notInclude(js, "workflow-settings-save-state");
  });

  it("aligns skillrunner runtime options by execution mode", async function () {
    const providerTs = await readProjectFile(
      "src/providers/skillrunner/provider.ts",
    );
    assert.include(providerTs, "interactive_auto_reply");
    assert.include(providerTs, "interactive_reply_timeout_sec");
    assert.include(providerTs, "hard_timeout_seconds");
    const clientTs = await readProjectFile(
      "src/providers/skillrunner/client.ts",
    );
    assert.include(clientTs, 'executionMode === "interactive"');
    assert.include(clientTs, "runtimeOptions.interactive_reply_timeout_sec");
    assert.include(clientTs, "runtimeOptions.hard_timeout_seconds");
  });

  it("uses default-settings wording in active workflow settings locales", async function () {
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");
    assert.include(
      en,
      "workflow-settings-submit-persist-checkbox = Save as default settings",
    );
    assert.include(
      zh,
      "workflow-settings-submit-persist-checkbox = 保存为默认配置",
    );
    assert.include(en, "workflow-settings-refresh-acp-runtime-cache-running");
    assert.include(zh, "workflow-settings-refresh-acp-runtime-cache-running");
  });

  it("keeps submit dialog updates metadata-aware for structural refresh gating", async function () {
    const js = await readProjectFile(
      "addon/content/dashboard/workflow-settings-dialog.js",
    );
    assert.include(js, "flushDraftFromControls");
    assert.include(js, "captureActiveFormState");
    assert.include(js, "restoreActiveFormState");
    assert.include(js, "measureDialogContentHeight");
    assert.include(js, 'root.querySelector(".settings-shell")');
    assert.notInclude(js, "body && body.offsetHeight");
    assert.include(js, "sendDialogContentResizeRequest");
    assert.include(js, "requestDialogContentResize");
    assert.include(js, 'sendAction("resize-to-content", { contentHeight })');
    assert.include(js, "shouldResetDraftForSnapshot");
    assert.include(js, "registerFieldCollector");
    assert.include(js, "markCustomSelectDisabled");
    assert.include(js, "runSchemaEntries");
    assert.include(js, "runOptions");
    assert.notInclude(js, "No selectable options are available.");
    assert.include(js, 'control.addEventListener("input"');
    assert.include(js, 'control.addEventListener("blur"');
    assert.include(js, 'changedSection: "backend"');
    assert.include(js, 'changedKey: "backendId"');
    assert.include(js, "changedSection:");
    assert.include(js, "changedKey:");
    assert.include(js, "refreshingAcpRuntimeCache");
    assert.include(js, 'refreshBtn.setAttribute("aria-busy", "true")');
    assert.include(js, "refreshBtn.disabled = true");
    assert.include(js, "refreshAcpRuntimeCacheRunning");
    assert.include(js, "state.refreshingAcpRuntimeCache = false");
  });

  it("marks ACP permission auto-approval option with warning label styling", async function () {
    const dashboardJs = await readProjectFile("addon/content/dashboard/app.js");
    const dialogJs = await readProjectFile(
      "addon/content/dashboard/workflow-settings-dialog.js",
    );
    const dashboardCss = await readProjectFile(
      "addon/content/dashboard/styles.css",
    );
    const dialogCss = await readProjectFile(
      "addon/content/dashboard/workflow-settings-dialog.css",
    );
    const legacyDialogTs = await readProjectFile(
      "src/modules/workflowSettingsDialog.ts",
    );

    assert.include(dashboardJs, "autoApproveAcpPermissions");
    assert.include(dialogJs, "autoApproveAcpPermissions");
    assert.include(legacyDialogTs, "autoApproveAcpPermissions");
    assert.include(dashboardCss, ".workflow-settings-field-label-warning");
    assert.include(dialogCss, ".field-label-warning");
    assert.include(dashboardCss, "font-weight: 700");
    assert.include(dialogCss, "font-weight: 700");
    assert.include(dashboardCss, "color: var(--danger)");
    assert.include(dialogCss, "color: var(--danger)");
  });

  it("keeps workflow-options field updates input-first but host-sync on change/blur", async function () {
    const js = await readProjectFile("addon/content/dashboard/app.js");
    assert.include(js, 'control.addEventListener("input"');
    assert.include(js, 'control.addEventListener("change"');
    assert.include(js, 'control.addEventListener("blur"');
    assert.include(js, "commitControlValue");
  });
});

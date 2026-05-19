import { assert } from "chai";
import { getProjectRoot, joinPath, readUtf8 } from "../zotero/workflow-test-utils";

async function readProjectFile(relativePath: string) {
  const targetPath = joinPath(getProjectRoot(), relativePath);
  return readUtf8(targetPath);
}

describe("workflow settings single-source routing", function () {
  it("routes prefs openWorkflowSettings to dashboard workflow-options tab", async function () {
    const ts = await readProjectFile("src/hooks.ts");
    assert.include(ts, 'case "openWorkflowSettings"');
    assert.include(ts, "initialTabKey: \"workflow-options\"");
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
    assert.include(ts, 'stage: canceled ? "settings-gate-canceled" : "settings-gate-failed"');
  });

  it("uses compact web dialog layout without framework-level extra cancel button", async function () {
    const ts = await readProjectFile("src/modules/workflowSettingsWebDialog.ts");
    assert.include(ts, "Save as default settings");
    assert.include(ts, "resizeTo(760, 620)");
    assert.include(ts, "isStructuralDraftChange");
    assert.include(ts, "changedSection");
    assert.include(ts, "changedKey");
    assert.include(
      ts,
      'Object.prototype.hasOwnProperty.call(envelope.payload, "executionOptions")',
    );
    assert.notInclude(ts, ".addButton(");
  });

  it("exposes workflow-options tab and debounced save actions in dashboard host", async function () {
    const ts = await readProjectFile("src/modules/taskManagerDialog.ts");
    assert.include(ts, 'key: "workflow-options"');
    assert.include(ts, 'if (action === "workflow-settings-draft")');
    assert.include(ts, "workflowSettingsSaveStateById");
    assert.include(ts, 'reason === "periodic" || reason === "task-update"');
    assert.include(ts, "const changedSection = normalizeDraftChangedSection(payload.changedSection)");
    assert.include(ts, "const changedKey = normalizeDraftChangedKey(payload.changedKey)");
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
    const providerTs = await readProjectFile("src/providers/skillrunner/provider.ts");
    assert.include(providerTs, "interactive_auto_reply");
    assert.include(providerTs, "hard_timeout_seconds");
    const clientTs = await readProjectFile("src/providers/skillrunner/client.ts");
    assert.include(clientTs, 'executionMode === "interactive"');
    assert.include(clientTs, "runtimeOptions.hard_timeout_seconds");
  });

  it("uses default-settings wording in active workflow settings locales", async function () {
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");
    assert.include(en, "workflow-settings-submit-persist-checkbox = Save as default settings");
    assert.include(zh, "workflow-settings-submit-persist-checkbox = 保存为默认配置");
  });

  it("keeps submit dialog updates metadata-aware for structural refresh gating", async function () {
    const js = await readProjectFile("addon/content/dashboard/workflow-settings-dialog.js");
    assert.include(js, "flushDraftFromControls");
    assert.include(js, "captureActiveFormState");
    assert.include(js, "restoreActiveFormState");
    assert.include(js, "shouldResetDraftForSnapshot");
    assert.include(js, "registerFieldCollector");
    assert.include(js, 'control.addEventListener("input"');
    assert.include(js, 'control.addEventListener("blur"');
    assert.include(js, 'changedSection: "backend"');
    assert.include(js, 'changedKey: "backendId"');
    assert.include(js, "changedSection:");
    assert.include(js, "changedKey:");
  });

  it("keeps workflow-options field updates input-first but host-sync on change/blur", async function () {
    const js = await readProjectFile("addon/content/dashboard/app.js");
    assert.include(js, 'control.addEventListener("input"');
    assert.include(js, 'control.addEventListener("change"');
    assert.include(js, 'control.addEventListener("blur"');
    assert.include(js, "commitControlValue");
  });
});

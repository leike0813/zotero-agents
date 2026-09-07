import { assert } from "chai";
import { runInNewContext } from "node:vm";
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
  it("shares bounded integer validation and range labels across live forms", async function () {
    const source = await readProjectFile(
      "addon/content/shared/workflow-number-validation.js",
    );
    const windowStub: Record<string, any> = {};
    runInNewContext(source, { window: windowStub });
    const fields = windowStub.zoteroAgentsWorkflowNumberFields;
    assert.isObject(fields);
    const entry = {
      title: "Maximum Topics",
      required: true,
      integer: true,
      min: 0,
      max: 10,
    };
    assert.equal(fields.formatLabel(entry), "Maximum Topics (0–10)");
    assert.equal(fields.formatLabel({ title: "Timeout", min: 1 }), "Timeout");
    assert.deepEqual(
      JSON.parse(JSON.stringify(fields.validate({ entry, rawValue: "10" }))),
      { valid: true, value: 10, code: "" },
    );
    for (const [rawValue, code] of [
      ["10.5", "not_integer"],
      ["-1", "below_minimum"],
      ["11", "above_maximum"],
    ]) {
      const result = fields.validate({ entry, rawValue });
      assert.isFalse(result.valid);
      assert.equal(result.code, code);
    }

    const [dashboardHtml, dialogHtml, dialogTs] = await Promise.all([
      readProjectFile("addon/content/dashboard/index.html"),
      readProjectFile("addon/content/dashboard/workflow-settings-dialog.html"),
      readProjectFile("src/dashboard/components/WorkflowOptionsRegion.tsx"),
    ]);
    for (const html of [dashboardHtml, dialogHtml]) {
      assert.include(html, "workflow-number-validation.js");
    }
    assert.include(dialogTs, "zoteroAgentsWorkflowNumberFields");
    assert.include(dialogTs, "vendor.validate");
    assert.include(dialogTs, "vendor.formatLabel");
  });

  it("keeps a strict custom select on its canonical fallback across away-and-back changes", async function () {
    class FakeElement {
      className = "";
      textContent = "";
      title = "";
      tabIndex = -1;
      style: Record<string, string> = {};
      children: FakeElement[] = [];
      listeners = new Map<string, Array<(event: any) => void>>();
      classList = {
        add: (...names: string[]) => {
          const values = new Set(this.className.split(/\s+/).filter(Boolean));
          names.forEach((name) => values.add(name));
          this.className = [...values].join(" ");
        },
        remove: (...names: string[]) => {
          const removed = new Set(names);
          this.className = this.className
            .split(/\s+/)
            .filter((name) => name && !removed.has(name))
            .join(" ");
        },
      };

      appendChild(child: FakeElement) {
        this.children.push(child);
        return child;
      }

      addEventListener(type: string, listener: (event: any) => void) {
        const listeners = this.listeners.get(type) || [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
      }

      click() {
        for (const listener of this.listeners.get("click") || []) {
          listener({ stopPropagation() {} });
        }
      }

      querySelector(selector: string): FakeElement | null {
        return this.querySelectorAll(selector)[0] || null;
      }

      querySelectorAll(selector: string): FakeElement[] {
        const className = selector.startsWith(".") ? selector.slice(1) : "";
        const matches: FakeElement[] = [];
        const visit = (element: FakeElement) => {
          if (element.className.split(/\s+/).includes(className)) {
            matches.push(element);
          }
          element.children.forEach(visit);
        };
        this.children.forEach(visit);
        return matches;
      }

      getBoundingClientRect() {
        return { top: 0, bottom: 0 };
      }
    }

    const documentStub = {
      createElement: () => new FakeElement(),
      querySelectorAll: () => [] as FakeElement[],
      addEventListener: () => undefined,
    };
    const windowStub: Record<string, any> = { innerHeight: 1000 };
    const source = await readProjectFile(
      "addon/content/components/custom-select.js",
    );
    runInNewContext(source, { window: windowStub, document: documentStub });

    const changes: string[] = [];
    const select = windowStub.createCustomSelect(
      [
        { value: "build", label: "Build" },
        { value: "code", label: "Code" },
      ],
      "stale-mode",
      (value: string) => changes.push(value),
    );
    const menu = select.element.children[1];

    assert.equal(select.getValue(), "build");
    assert.equal(menu.querySelectorAll(".selected").length, 1);
    menu.children[1].click();
    menu.children[0].click();
    assert.deepEqual(changes, ["code", "build"]);
    assert.equal(select.getValue(), "build");
    assert.equal(menu.querySelectorAll(".selected").length, 1);
  });

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
    assert.include(ts, "isWorkflowSettingsStructuralRefreshChange");
    assert.include(ts, "normalizeWorkflowSettingsDraftChangeOrigin");
    assert.include(ts, "toRunOptionsFormValues");
    assert.include(ts, "normalizeWorkflowRunOptions(raw.runOptions)");
    assert.include(ts, "showAcpRuntimeCacheRefreshToast");
    assert.include(ts, "showSkillRunnerModelCacheRefreshToast");
    assert.include(ts, "showWorkflowToast");
    assert.include(ts, 'if (action === "refresh-acp-runtime-cache")');
    assert.include(ts, 'if (action === "refresh-skillrunner-model-cache")');
    assert.include(ts, "refreshSkillRunnerModelCacheForBackend");
    assert.include(ts, "canRefreshSkillRunnerModelCache");
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
    assert.include(ts, "const shouldSkipRefresh = (reason: RefreshReason)");
    assert.include(ts, 'reason !== "periodic" && reason !== "task-update"');
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

  it("emits draft changed metadata and preserves workflow-options DOM identity on rerender", async function () {
    const region = await readProjectFile(
      "src/dashboard/components/WorkflowOptionsRegion.tsx",
    );
    assert.include(region, "workflow-settings-banner");
    assert.include(region, "workflow-settings-sections-grid");
    assert.include(region, 'changedSection: "backend"');
    assert.include(region, 'changedKey: "backendId"');
    assert.include(region, "changedSection: props.changedSection");
    assert.include(region, "changedKey:");
    assert.notInclude(region, "workflow-settings-save-state");
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

  it("exposes ACP hard timeout through shared workflow option schemas", async function () {
    const providerTs = await readProjectFile("src/providers/acp/provider.ts");
    assert.include(providerTs, "hard_timeout_seconds");
    assert.include(providerTs, "Job Timeout (sec)");
    assert.include(
      providerTs,
      "Leave empty to use default; 20 min if skill has no default.",
    );
    assert.include(providerTs, "normalizeRuntimeOptions");

    const dialogTs = await readProjectFile(
      "src/dashboard/components/WorkflowSettingsDialogRegion.tsx",
    );
    const engineTs = await readProjectFile(
      "src/dashboard/components/WorkflowOptionsRegion.tsx",
    );
    assert.include(dialogTs, "form.runSchemaEntries");
    assert.include(dialogTs, "draft.runOptions");
    assert.include(dialogTs, "form.providerSchemaEntries");
    assert.include(dialogTs, "draft.providerOptions");
    assert.include(engineTs, "entry.placeholder");
    assert.include(engineTs, "descriptor.providerSchemaEntries");
    assert.include(engineTs, "draft.providerOptions");
  });

  it("uses default-settings wording in active workflow settings locales", async function () {
    const en = await readProjectFile("addon/locale/en-US/addon.ftl");
    const zh = await readProjectFile("addon/locale/zh-CN/addon.ftl");
    const fr = await readProjectFile("addon/locale/fr-FR/addon.ftl");
    const ja = await readProjectFile("addon/locale/ja-JP/addon.ftl");
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
    assert.include(en, "workflow-settings-job-timeout-placeholder");
    assert.include(zh, "workflow-settings-job-timeout-placeholder");
    assert.include(fr, "workflow-settings-job-timeout-placeholder");
    assert.include(ja, "workflow-settings-job-timeout-placeholder");
    assert.include(en, "workflow-settings-refresh-skillrunner-model-cache");
    assert.include(zh, "workflow-settings-refresh-skillrunner-model-cache");
    assert.include(
      en,
      "workflow-settings-refresh-skillrunner-model-cache-running",
    );
    assert.include(
      zh,
      "workflow-settings-refresh-skillrunner-model-cache-running",
    );
    assert.include(
      en,
      "workflow-settings-provider-option-skillrunner-engine-title",
    );
    assert.include(
      zh,
      "workflow-settings-provider-option-skillrunner-provider-id-title = 模型提供商",
    );
    assert.include(fr, "workflow-settings-provider-option-acp-model-id-title");
    assert.include(ja, "workflow-settings-provider-option-acp-mode-id-title");
    assert.include(
      en,
      "workflow-settings-run-option-auto-approve-zotero-writes-title",
    );
  });

  it("keeps submit dialog updates metadata-aware for structural refresh gating", async function () {
    const js = await readProjectFile(
      "src/dashboard/components/WorkflowSettingsDialogRegion.tsx",
    );
    const engine = await readProjectFile(
      "src/dashboard/components/WorkflowOptionsRegion.tsx",
    );
    assert.include(js, "flushDraftFromControls");
    assert.include(js, "scheduleResize");
    assert.include(js, 'onAction("resize-to-content", { contentHeight })');
    assert.notInclude(js, "body && body.offsetHeight");
    assert.include(js, "workflowSettingsDialogStructureKey");
    assert.include(js, "registerCommitter");
    assert.include(engine, "markDisabled");
    assert.include(js, "runSchemaEntries");
    assert.include(js, "runOptions");
    assert.notInclude(js, "No selectable options are available.");
    assert.include(engine, 'input.addEventListener("change"');
    assert.include(engine, 'input.addEventListener("blur"');
    assert.include(js, 'changedSection: "backend"');
    assert.include(js, 'changedKey: "backendId"');
    assert.include(js, "changedSection:");
    assert.include(js, "changedKey:");
    assert.include(js, "refreshAcpRuntimeCacheRunning");
    assert.include(js, "refreshSkillRunnerModelCacheRunning");
    assert.include(js, "refresh-skillrunner-model-cache");
    assert.include(js, "buildWorkflowSettingsDialogExecutionOptions");
    assert.include(js, "aria-busy");
    assert.include(js, "disabled={isBusy}");
  });

  it("marks ACP permission auto-approval option with warning label styling", async function () {
    const dialogTs = await readProjectFile(
      "src/dashboard/components/WorkflowOptionsRegion.tsx",
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

    assert.include(dialogTs, "autoApproveAcpPermissions");
    assert.include(legacyDialogTs, "autoApproveAcpPermissions");
    assert.include(dashboardCss, ".workflow-settings-field-label-warning");
    assert.include(dialogCss, ".field-label-warning");
    assert.include(dashboardCss, "font-weight: 700");
    assert.include(dialogCss, "font-weight: 700");
    assert.include(dashboardCss, "color: var(--danger)");
    assert.include(dialogCss, "color: var(--danger)");
  });

  it("keeps workflow-options field updates input-first but host-sync on change/blur", async function () {
    const region = await readProjectFile(
      "src/dashboard/components/WorkflowOptionsRegion.tsx",
    );
    assert.include(region, "onInput={handleInput}");
    assert.include(region, 'input.addEventListener("change", commit)');
    assert.include(region, 'input.addEventListener("blur", commit)');
    assert.include(region, "commitControlValue");
  });
});

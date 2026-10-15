import { assert } from "chai";
import { config } from "../../../../package.json";
import type { BackendInstance } from "../../../../src/backends/types";
import { computeAcpBackendConfigFingerprint } from "../../../../src/backends/identity";
import { buildAcpRuntimeOptionsCache } from "../../../../src/modules/acp/transport/acpBackendProbe";
import { loadWorkflowManifests } from "../../../../src/workflows/loader";
import { readDiagnosticsEnv } from "../../testDiagnosticsOutput";
import {
  getWorkflowSettings,
  resolveWorkflowExecutionContext,
  updateWorkflowSettings,
} from "../../../../src/modules/workflow/settings/workflowSettings";
import { openWorkflowSettingsWebDialog } from "../../../../src/modules/workflow/settings/workflowSettingsWebDialog";
import { resolveAcpSkillRunEffectiveRuntimeOptions } from "../../../../src/modules/acp/skillRun/acpSkillRunExecutionSupport";
import { systemE2ECase } from "../../systemE2ECases";
import { emitZoteroTestDebug } from "../../diagnosticBridge";
import {
  openTaskDashboard,
  type MountedTaskDashboardRuntime,
} from "../../../../src/modules/dashboardHost";
import { rescanWorkflowRegistry } from "../../../../src/modules/workflow/catalog/workflowRuntime";
import { joinPath } from "../../../../src/utils/path";

async function waitFor<T>(read: () => T | null | undefined): Promise<T> {
  for (let attempt = 0; attempt < 400; attempt++) {
    const value = read();
    if (value) return value;
    await Zotero.Promise.delay(25);
  }
  throw new Error("workflow_settings_ui_timeout");
}

function settingsWindow(rootId = "zs-workflow-settings-dialog-root") {
  const windows = Services.wm.getEnumerator(null);
  while (windows.hasMoreElements()) {
    const win = windows.getNext() as Window;
    if (!win.closed && win.document?.getElementById(rootId)) return win;
  }
  return null;
}

function settingsBackends(): BackendInstance[] {
  const acp: BackendInstance = {
    id: "settings-e2e-acp",
    type: "acp",
    baseUrl: "local://settings-e2e",
    command: "fake-catalog",
  };
  acp.acp = {
    connectionTest: {
      status: "passed",
      configFingerprint: computeAcpBackendConfigFingerprint(acp),
    },
    runtimeOptionsCache: buildAcpRuntimeOptionsCache({
      models: {
        currentModelId: "provider/model@high",
        availableModels: [
          { modelId: "provider/model@high", name: "Model" },
          { modelId: "alternate/first@low", name: "Alternate" },
        ],
      },
    }),
  };
  return [
    acp,
    {
      id: "settings-e2e-skillrunner",
      type: "skillrunner",
      baseUrl: "http://127.0.0.1:8030",
    },
  ];
}

describe("Workflow settings real submission form", function () {
  this.timeout(120_000);
  let previousAddon: unknown;
  let previousToolkit: unknown;
  beforeEach(function () {
    const runtime = globalThis as any;
    previousAddon = runtime.addon;
    previousToolkit = runtime.ztoolkit;
    runtime.addon = (Zotero as any)[config.addonInstance];
    runtime.ztoolkit = runtime.addon?.data?.ztoolkit;
  });
  afterEach(function () {
    (globalThis as any).addon = previousAddon;
    (globalThis as any).ztoolkit = previousToolkit;
  });

  systemE2ECase(
    "workflow-settings-submit-01",
    undefined,
    "WS-01 confirms defaults and clears saved overrides through the real form",
    async function () {
      const workflow = (
        await loadWorkflowManifests(
          readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR"),
        )
      ).workflows.find((entry) => entry.manifest.id === "literature-analysis");
      assert.isOk(workflow);
      const prefKeys = [
        "backendsConfigJson",
        "workflowSettingsJson",
        "skillDir",
      ].map((key) => `${config.prefsPrefix}.${key}`);
      const previous = prefKeys.map((key) => Zotero.Prefs.get(key, true));
      const backends = settingsBackends();
      let window: Window | undefined;
      try {
        Zotero.Prefs.set(
          prefKeys[0],
          JSON.stringify({ schemaVersion: 2, backends }),
          true,
        );
        for (const backend of backends) {
          for (const clearSaved of [false, true]) {
            updateWorkflowSettings(workflow!.manifest.id, {
              backendId: backend.id,
              providerOptionsMode: "replace",
              providerOptions: {
                ...(backend.type === "skillrunner"
                  ? { engine: "gemini", model: "" }
                  : {}),
                ...(clearSaved ? { hard_timeout_seconds: 17 } : {}),
                ...(backend.type === "acp" && clearSaved
                  ? { autoApproveAcpPermissions: true }
                  : {}),
              },
            });
            let settled = false;
            const pending = openWorkflowSettingsWebDialog({
              workflow: workflow!,
              candidateBackends: [backend],
            }).then((result) => {
              settled = true;
              return result;
            });
            window = await waitFor(settingsWindow);
            const doc = await waitFor(() => {
              const frame = window!.document.querySelector(
                '[data-zs-role="workflow-settings-dialog-frame"]',
              ) as Element & { contentDocument?: Document };
              const content = frame?.contentDocument;
              return content?.querySelector(
                '[data-workflow-settings-field-key="hard_timeout_seconds"] input',
              )
                ? content
                : null;
            });
            const control = (key: string) =>
              doc.querySelector<HTMLInputElement>(
                `[data-workflow-settings-field-key="${key}"] input`,
              )!;
            if (clearSaved) {
              control("hard_timeout_seconds").value = "";
              if (backend.type === "acp")
                control("autoApproveAcpPermissions").click();
            }
            const persist = doc.querySelector<HTMLInputElement>(
              '.settings-footer input[type="checkbox"]',
            );
            assert.isOk(persist);
            if (persist!.checked !== clearSaved) persist!.click();
            const buttons = Array.from(
              doc.querySelectorAll<HTMLButtonElement>(
                ".settings-actions button",
              ),
            );
            assert.isAbove(buttons.length, 0);
            buttons.at(-1)!.click();
            await waitFor(() => settled);
            const result = await pending;
            assert.equal(result.status, "confirmed");
            if (result.status !== "confirmed")
              throw new Error("workflow_settings_not_confirmed");
            assert.equal(result.persist, clearSaved);
            assert.notProperty(
              result.executionOptions.providerOptions,
              "hard_timeout_seconds",
            );
            if (result.persist)
              updateWorkflowSettings(
                workflow!.manifest.id,
                result.executionOptions,
              );
            const context = await resolveWorkflowExecutionContext({
              workflow: workflow!,
              executionOptionsOverride: result.executionOptions,
            });
            assert.notProperty(context.providerOptions, "hard_timeout_seconds");
            if (backend.type === "acp") {
              assert.notProperty(context.providerOptions, "acpModelId");
              assert.notProperty(context.providerOptions, "acpReasoningEffort");
              if (clearSaved)
                assert.strictEqual(
                  context.providerOptions.autoApproveAcpPermissions,
                  false,
                );
              const effective = resolveAcpSkillRunEffectiveRuntimeOptions({
                request: { runtime_options: {} } as any,
                runnerJson: {},
                providerOptions: context.providerOptions,
              });
              assert.equal(effective.hardTimeoutSeconds, 1200);
            }
            if (clearSaved) {
              assert.notProperty(
                getWorkflowSettings(workflow!.manifest.id).providerOptions,
                "hard_timeout_seconds",
              );
              let reopenedSettled = false;
              const reopened = openWorkflowSettingsWebDialog({
                workflow: workflow!,
                candidateBackends: [backend],
              }).then((value) => {
                reopenedSettled = true;
                return value;
              });
              window = await waitFor(settingsWindow);
              const reopenedDoc = await waitFor(() => {
                const frame = window!.document.querySelector(
                  '[data-zs-role="workflow-settings-dialog-frame"]',
                ) as Element & { contentDocument?: Document };
                return frame?.contentDocument?.querySelector(
                  '[data-workflow-settings-field-key="hard_timeout_seconds"] input',
                )
                  ? frame.contentDocument
                  : null;
              });
              assert.equal(
                reopenedDoc.querySelector<HTMLInputElement>(
                  '[data-workflow-settings-field-key="hard_timeout_seconds"] input',
                )!.value,
                "",
              );
              if (backend.type === "acp")
                assert.isFalse(
                  reopenedDoc.querySelector<HTMLInputElement>(
                    '[data-workflow-settings-field-key="autoApproveAcpPermissions"] input',
                  )!.checked,
                );
              Array.from(
                reopenedDoc.querySelectorAll<HTMLButtonElement>(
                  ".settings-actions button",
                ),
              )
                .at(-1)!
                .click();
              await waitFor(() => reopenedSettled);
              assert.equal((await reopened).status, "confirmed");
            }
          }
        }
        await emitZoteroTestDebug({
          kind: "workflow-settings-submit-receipt",
          version: Zotero.version,
          backends: backends.map((entry) => entry.type),
          scenarios: [
            "default-submit",
            "clear-saved",
            "approval-disabled",
            "runtime-default",
          ],
        });
      } finally {
        window?.close();
        prefKeys.forEach((key, index) => {
          if (previous[index] === undefined) Zotero.Prefs.clear(key, true);
          else Zotero.Prefs.set(key, previous[index] as any, true);
        });
      }
    },
  );

  systemE2ECase(
    "workflow-settings-submit-02",
    undefined,
    "WS-02 saves and reopens Dashboard settings through both provider forms",
    async function () {
      const workflowId = "literature-analysis";
      const prefKeys = [
        "backendsConfigJson",
        "workflowSettingsJson",
        "skillDir",
      ].map((key) => `${config.prefsPrefix}.${key}`);
      const previous = prefKeys.map((key) => Zotero.Prefs.get(key, true));
      const backends = settingsBackends();
      const mainWindow = Zotero.getMainWindow();
      const root = mainWindow.document.createElementNS(
        "http://www.w3.org/1999/xhtml",
        "div",
      ) as HTMLElement;
      root.style.cssText =
        "position:fixed;inset:0;z-index:10000;background:white;display:flex";
      mainWindow.document.documentElement.appendChild(root);
      let mounted: MountedTaskDashboardRuntime | undefined;
      const close = () => {
        mounted?.cleanup();
        mounted = undefined;
      };
      const open = async () => {
        mounted = await openTaskDashboard({
          chromeWindow: mainWindow,
          embeddedRoot: root,
          hostWindow: mainWindow,
          initialTabKey: "workflow-options",
          initialWorkflowId: workflowId,
        });
        return waitFor(() => {
          const frame = root.querySelector(
            '[data-zs-role="task-dashboard-frame"]',
          ) as Element & { contentDocument?: Document };
          return frame?.contentDocument?.querySelector(
            '[data-workflow-settings-field-key="hard_timeout_seconds"] input',
          )
            ? frame.contentDocument
            : null;
        }).catch((error) => {
          const frame = root.querySelector(
            '[data-zs-role="task-dashboard-frame"]',
          ) as Element & { contentDocument?: Document };
          throw new Error(
            `${String(error)}: ${frame?.contentDocument?.body?.textContent?.slice(-1200)}`,
          );
        });
      };
      const input = (doc: Document, key: string) =>
        doc.querySelector<HTMLInputElement>(
          `[data-workflow-settings-field-key="${key}"] input`,
        )!;
      const edit = (doc: Document, key: string, value: string) => {
        const field = input(doc, key);
        field.value = value;
        field.dispatchEvent(
          new doc.defaultView!.Event("input", { bubbles: true }),
        );
        field.dispatchEvent(
          new doc.defaultView!.Event("change", { bubbles: true }),
        );
      };
      try {
        const workflowsDir = readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR");
        const skillPref = `${config.prefsPrefix}.skillDir`;
        // The E2E source catalog has its skills beside workflows_builtin.
        Zotero.Prefs.set(
          skillPref,
          joinPath(workflowsDir, "..", "skills_builtin"),
          true,
        );
        const registry = await rescanWorkflowRegistry({ workflowsDir });
        assert.include(
          registry.loaded?.workflows.map((entry) => entry.manifest.id) || [],
          workflowId,
        );
        for (const backend of backends) {
          close();
          Zotero.Prefs.set(
            prefKeys[0],
            JSON.stringify({ schemaVersion: 2, backends: [backend] }),
            true,
          );
          updateWorkflowSettings(workflowId, {
            backendId: backend.id,
            providerOptionsMode: "replace",
            providerOptions: {
              ...(backend.type === "skillrunner"
                ? { engine: "gemini", model: "", no_cache: true }
                : { autoApproveAcpPermissions: true }),
              hard_timeout_seconds: 17,
            },
            hostOptions: { queue: { maxConcurrency: 3 } },
          });
          let doc = await open();
          const booleanKey =
            backend.type === "acp" ? "autoApproveAcpPermissions" : "no_cache";
          assert.equal(input(doc, "hard_timeout_seconds").value, "17");
          edit(doc, "hard_timeout_seconds", "");
          input(doc, booleanKey).click();
          await waitFor(() => {
            const options =
              getWorkflowSettings(workflowId).providerOptions || {};
            return (
              !Object.hasOwn(options, "hard_timeout_seconds") &&
              options[booleanKey] === false
            );
          });
          close();
          doc = await open();
          assert.equal(input(doc, "hard_timeout_seconds").value, "");
          assert.isFalse(input(doc, booleanKey).checked);
          input(doc, booleanKey).click();
          edit(doc, "hard_timeout_seconds", "23");
          await waitFor(
            () =>
              getWorkflowSettings(workflowId).providerOptions
                ?.hard_timeout_seconds === 23,
          );
          assert.strictEqual(
            getWorkflowSettings(workflowId).providerOptions?.[booleanKey],
            true,
          );
          assert.equal(
            getWorkflowSettings(workflowId).hostOptions?.queue?.maxConcurrency,
            3,
          );
          if (backend.type === "acp") {
            const row = doc.querySelector<HTMLElement>(
              '[data-workflow-settings-field-key="acpModelProvider"]',
            )!;
            row.querySelector<HTMLElement>(".custom-select-trigger")!.click();
            await Zotero.Promise.delay(25);
            const alternate = Array.from(
              row.querySelectorAll<HTMLElement>(".custom-select-option"),
            ).find((entry) => entry.textContent?.includes("alternate"));
            assert.isOk(alternate);
            alternate!.click();
            // Type before the descriptor echo arrives; the selected provider and
            // its first raw model must survive the subsequent input event.
            edit(doc, "hard_timeout_seconds", "29");
            await waitFor(() => {
              const options = getWorkflowSettings(workflowId).providerOptions;
              return (
                options?.hard_timeout_seconds === 29 &&
                options.acpModelId === "alternate/first@low"
              );
            });
          }
          close();
          doc = await open();
          assert.equal(
            input(doc, "hard_timeout_seconds").value,
            backend.type === "acp" ? "29" : "23",
          );
        }
        await emitZoteroTestDebug({
          kind: "workflow-settings-dashboard-receipt",
          version: Zotero.version,
          scenarios: [
            "clear-save-reopen",
            "boolean-roundtrip",
            "provider-switch-continue-input",
            "raw-model-id",
            "host-options-retained",
          ],
        });
      } finally {
        close();
        root.remove();
        prefKeys.forEach((key, index) => {
          if (previous[index] === undefined) Zotero.Prefs.clear(key, true);
          else Zotero.Prefs.set(key, previous[index] as any, true);
        });
      }
    },
  );

  systemE2ECase(
    "workflow-settings-submit-03",
    undefined,
    "WS-03 retains invalid selections and confirms a provider switch immediately",
    async function () {
      const workflow = (
        await loadWorkflowManifests(
          readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR"),
        )
      ).workflows.find((entry) => entry.manifest.id === "literature-analysis")!;
      const prefKeys = ["backendsConfigJson", "workflowSettingsJson"].map(
        (key) => `${config.prefsPrefix}.${key}`,
      );
      const previous = prefKeys.map((key) => Zotero.Prefs.get(key, true));
      const backend = settingsBackends()[0];
      let window: Window | undefined;
      try {
        Zotero.Prefs.set(
          prefKeys[0],
          JSON.stringify({ schemaVersion: 2, backends: [backend] }),
          true,
        );
        updateWorkflowSettings(workflow.manifest.id, {
          backendId: backend.id,
          providerOptionsMode: "replace",
          providerOptions: {
            acpModelId: "provider/missing",
            hard_timeout_seconds: 17,
          },
        });
        let settled = false;
        const pending = openWorkflowSettingsWebDialog({
          workflow,
          candidateBackends: [backend],
        }).then((result) => {
          settled = true;
          return result;
        });
        window = await waitFor(settingsWindow);
        const doc = await waitFor(() => {
          const frame = window!.document.querySelector(
            '[data-zs-role="workflow-settings-dialog-frame"]',
          ) as Element & { contentDocument?: Document };
          return frame?.contentDocument?.querySelector(
            '[data-workflow-settings-field-key="hard_timeout_seconds"] input',
          )
            ? frame.contentDocument
            : null;
        });
        const modelRow = () =>
          doc.querySelector<HTMLElement>(
            '[data-workflow-settings-field-key="acpModelId"]',
          )!;
        assert.include(modelRow().textContent, "provider/missing");
        const confirm = () =>
          Array.from(
            doc.querySelectorAll<HTMLButtonElement>(".settings-actions button"),
          )
            .at(-1)!
            .click();
        confirm();
        await waitFor(() => doc.querySelector('[role="alert"]'));
        assert.isFalse(settled);
        assert.include(modelRow().textContent, "provider/missing");
        assert.equal(
          getWorkflowSettings(workflow.manifest.id).providerOptions?.acpModelId,
          "provider/missing",
        );
        const providerRow = doc.querySelector<HTMLElement>(
          '[data-workflow-settings-field-key="acpModelProvider"]',
        )!;
        providerRow
          .querySelector<HTMLElement>(".custom-select-trigger")!
          .click();
        await Zotero.Promise.delay(25);
        Array.from(
          providerRow.querySelectorAll<HTMLElement>(".custom-select-option"),
        )
          .find((entry) => entry.textContent?.includes("alternate"))!
          .click();
        doc.querySelector<HTMLInputElement>(
          '[data-workflow-settings-field-key="hard_timeout_seconds"] input',
        )!.value = "31";
        confirm();
        await waitFor(() => settled);
        const result = await pending;
        assert.equal(result.status, "confirmed");
        if (result.status !== "confirmed")
          throw new Error("workflow_settings_not_confirmed");
        assert.equal(
          result.executionOptions.providerOptions?.acpModelId,
          "alternate/first@low",
        );
        assert.equal(
          result.executionOptions.providerOptions?.hard_timeout_seconds,
          31,
        );
        assert.notProperty(
          result.executionOptions.providerOptions,
          "acpReasoningEffort",
        );
        const context = await resolveWorkflowExecutionContext({
          workflow,
          executionOptionsOverride: result.executionOptions,
        });
        assert.equal(context.providerOptions.acpModelId, "alternate/first@low");
      } finally {
        window?.close();
        prefKeys.forEach((key, index) => {
          if (previous[index] === undefined) Zotero.Prefs.clear(key, true);
          else Zotero.Prefs.set(key, previous[index] as any, true);
        });
      }
    },
  );
});

import { assert } from "chai";
import { config } from "../../package.json";
import { nativeFixtureMutations as handlers } from "../helpers/nativeFixtureMutations";
import { buildSelectionContext } from "../helpers/workflowSelectionContext";
import {
  clearSkillRunnerModelCache,
  upsertSkillRunnerModelCacheEntry,
} from "../../src/providers/skillrunner/modelCache";
import {
  buildWorkflowSettingsUiDescriptor,
  clearWorkflowSettings,
  getWorkflowSettings,
  rebaseWorkflowProviderOptionsForBackendChange,
  resolveWorkflowExecutionContext,
  resetRunOnceOverridesForSettingsOpen,
  rebaseWorkflowProviderOptionsForModelProviderChange,
  updateWorkflowSettings,
} from "../../src/modules/workflow/settings/workflowSettings";
import { loadBackendsRegistry } from "../../src/backends/registry";
import { buildAcpRuntimeOptionsCache } from "../../src/modules/acp/transport/acpBackendProbe";
import { computeAcpBackendConfigFingerprint } from "../../src/backends/identity";
import { executeBuildRequests } from "../../src/workflows/runtime";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  fixturePath,
  isZoteroRuntime,
  workflowsPath,
  joinPath,
  mkTempDir,
  writeUtf8,
} from "./workflow-test-utils";
import { isFullTestMode } from "../zotero/testMode";
import { setSkillRunnerInteractiveAutoReplyEnabledForTests } from "../../src/modules/skillRunner/run/skillRunnerInteractiveAutoReply";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { installMutablePrefsForTest } from "../mutablePrefsTestUtils";
import { openWorkflowSettingsWebDialog } from "../../src/modules/workflow/settings/workflowSettingsWebDialog";
import { createAcpFormCatalogPreparation } from "../../src/modules/workflow/settings/acpFormCatalogPreparation";
import {
  resetDefaultSynthesisClientForTests,
  setDefaultSynthesisClientCompositionFactoryForTests,
} from "../../src/modules/synthesisClient/defaultClient";
import {
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import { h, render } from "preact";
import {
  WorkflowSettingsDialogRegion,
  projectWorkflowSettingsDialogSelection,
} from "../../src/dashboard/components/WorkflowSettingsDialogRegion";
import { createDashboardActionDispatcher } from "../../src/modules/dashboard/dashboardActions";
import {
  validateProviderOptionsForBackend,
  ProviderProfileError,
} from "../../src/providers/profile";

const itNodeOnly = isZoteroRuntime() ? it.skip : it;
const itZoteroFullOrNode =
  isZoteroRuntime() && !isFullTestMode() ? it.skip : it;

describe("workflow settings execution", function () {
  this.timeout(5000);

  const backendsConfigPrefKey = `${config.prefsPrefix}.backendsConfigJson`;
  const workflowSettingsPrefKey = `${config.prefsPrefix}.workflowSettingsJson`;
  let prevBackendsConfigPref: unknown;
  let prevWorkflowSettingsPref: unknown;
  let restorePrefs: (() => void) | undefined;

  itNodeOnly(
    "retains invalid explicit options through descriptor refresh and rejects execution",
    async function () {
      const workflow = (
        await loadWorkflowManifests(workflowsPath())
      ).workflows.find((entry) => entry.manifest.id === "literature-analysis")!;
      const backend = {
        id: "invalid-form",
        type: "acp",
        baseUrl: "local://invalid-form",
        command: "fake",
      } as any;
      backend.acp = {
        connectionTest: {
          status: "passed",
          configFingerprint: computeAcpBackendConfigFingerprint(backend),
        },
        runtimeOptionsCache: buildAcpRuntimeOptionsCache({
          models: {
            currentModelId: "valid",
            availableModels: [{ modelId: "valid", name: "Valid" }],
          },
        }),
      };
      Zotero.Prefs.set(
        backendsConfigPrefKey,
        JSON.stringify({ schemaVersion: 2, backends: [backend] }),
        true,
      );
      for (const providerOptions of [
        { hard_timeout_seconds: 0 },
        { autoApproveAcpPermissions: "false" },
        { acpModelId: "unavailable" },
      ]) {
        const draft = {
          backendId: backend.id,
          providerOptionsMode: "replace" as const,
          providerOptions,
        };
        const descriptor = await buildWorkflowSettingsUiDescriptor({
          workflow,
          draft,
          candidateBackends: [backend],
          ignoreSavedSettings: true,
        });
        for (const [key, value] of Object.entries(providerOptions))
          assert.strictEqual(descriptor.providerOptions[key], value);
        let failure: any;
        try {
          await resolveWorkflowExecutionContext({
            workflow,
            executionOptionsOverride: draft,
            ignoreSavedSettings: true,
          });
        } catch (error) {
          failure = error;
        }
        assert.instanceOf(failure, ProviderProfileError);
        assert.include(
          [
            "provider_profile_option_invalid",
            "provider_profile_option_unavailable",
          ],
          failure.code,
        );
      }
    },
  );

  for (const backendType of ["acp", "skillrunner"] as const) {
    itNodeOnly(
      `confirms real ${backendType} form controls through the host with default and cleared options`,
      async function () {
        const workflow = (
          await loadWorkflowManifests(workflowsPath())
        ).workflows.find(
          (entry) => entry.manifest.id === "literature-analysis",
        )!;
        const backend = {
          id: `form-${backendType}`,
          type: backendType,
          baseUrl:
            backendType === "acp" ? "local://form" : "http://127.0.0.1:8030",
          command: "fake-acp",
        } as any;
        if (backendType === "acp")
          backend.acp = {
            connectionTest: {
              status: "passed",
              configFingerprint: computeAcpBackendConfigFingerprint(backend),
            },
            runtimeOptionsCache: buildAcpRuntimeOptionsCache({
              models: {
                currentModelId: "provider/model@high",
                availableModels: [
                  { modelId: "provider/model@high", name: "Model" },
                ],
              },
            }),
          };
        Zotero.Prefs.set(
          backendsConfigPrefKey,
          JSON.stringify({ schemaVersion: 2, backends: [backend] }),
          true,
        );
        const environment = createSidebarDomEnvironment();
        installSidebarDomGlobals(environment);
        const root = document.createElement("div");
        document.body.innerHTML =
          '<div id="zs-workflow-settings-dialog-root"></div>';
        document.body.append(root);
        const snapshots: any[] = [];
        const runtime = globalThis as any;
        const previousToolkit = runtime.ztoolkit;
        const createElement = document.createElement.bind(document);
        let data: any;
        let done!: () => void;
        let closed = false;
        const unloaded = new Promise<void>((resolve) => {
          done = resolve;
        });
        const action = (action: string, payload: any) =>
          window.dispatchEvent(
            new environment.window.MessageEvent("message", {
              data: {
                type: "workflow-settings-dialog:action",
                action,
                payload,
              },
            }),
          );
        document.createElement = ((tag: string) => {
          const node = createElement(tag);
          if (tag === "iframe")
            Object.defineProperty(node, "contentWindow", {
              value: {
                postMessage: (message: any) => {
                  snapshots.push(message.payload);
                  render(
                    h(WorkflowSettingsDialogRegion, {
                      selection: projectWorkflowSettingsDialogSelection(
                        message.payload,
                        snapshots.length,
                      )!,
                      onAction: action,
                    }),
                    root,
                  );
                },
              },
            });
          return node;
        }) as typeof document.createElement;
        class TestDialog {
          window = environment.window;
          addCell() {
            return this;
          }
          setDialogData(value: any) {
            data = value;
            data.unloadLock = { promise: unloaded };
            return this;
          }
          open() {
            queueMicrotask(() => data.loadCallback());
            return this;
          }
        }
        runtime.ztoolkit = { Dialog: TestDialog };
        environment.window.close = () => {
          if (closed) return;
          closed = true;
          data.unloadCallback();
          done();
        };
        let result:
          | ReturnType<typeof openWorkflowSettingsWebDialog>
          | undefined;
        try {
          result = openWorkflowSettingsWebDialog({
            workflow,
            candidateBackends: [backend],
            initialDraft: {
              backendId: backend.id,
              providerOptions:
                backendType === "acp"
                  ? {
                      autoApproveAcpPermissions: true,
                      hard_timeout_seconds: 17,
                    }
                  : { engine: "gemini", model: "" },
            },
          });
          for (let attempt = 0; attempt < 100 && !snapshots.length; attempt++)
            await new Promise((resolve) => setTimeout(resolve, 0));
          assert.isAbove(snapshots.length, 0);
          const control = (key: string) =>
            root.querySelector<HTMLInputElement>(
              `[data-workflow-settings-field-key="${key}"] input`,
            )!;
          const timeout = control("hard_timeout_seconds");
          assert.isOk(timeout);
          timeout.value = "";
          if (backendType === "acp")
            control("autoApproveAcpPermissions").click();
          const confirm = Array.from(
            root.querySelectorAll<HTMLButtonElement>(
              ".settings-actions button",
            ),
          ).at(-1)!;
          confirm.click();
          await new Promise((resolve) => setTimeout(resolve, 0));
          assert.isTrue(closed, snapshots.at(-1)?.form.runtimeCatalogError);
          const confirmed = await result;
          assert.equal(confirmed.status, "confirmed");
          if (confirmed.status !== "confirmed") return;
          assert.notProperty(
            confirmed.executionOptions.providerOptions,
            "hard_timeout_seconds",
          );
          if (backendType === "acp")
            assert.strictEqual(
              confirmed.executionOptions.providerOptions
                ?.autoApproveAcpPermissions,
              false,
            );
          updateWorkflowSettings(
            workflow.manifest.id,
            confirmed.executionOptions,
          );
          const reopened = await buildWorkflowSettingsUiDescriptor({
            workflow,
            candidateBackends: [backend],
          });
          assert.notProperty(reopened.providerOptions, "hard_timeout_seconds");
          const context = await resolveWorkflowExecutionContext({ workflow });
          assert.notProperty(context.providerOptions, "hard_timeout_seconds");
          if (backendType === "acp") {
            assert.strictEqual(
              context.providerOptions.autoApproveAcpPermissions,
              false,
            );
            assert.notProperty(context.providerOptions, "acpModelId");
          }
        } finally {
          if (!closed) environment.window.close();
          await result;
          render(null, root);
          runtime.ztoolkit = previousToolkit;
          restoreSidebarDomGlobals();
          environment.dom.window.close();
        }
      },
    );
  }

  itNodeOnly(
    "serializes form catalog probes and ignores canceled model replies",
    async function () {
      const calls: Array<{
        signal: any;
        resolve: (value: any) => void;
      }> = [];
      let active = 0;
      let peak = 0;
      const preparation = createAcpFormCatalogPreparation({
        probe: async (args) => {
          active += 1;
          peak = Math.max(peak, active);
          try {
            return await new Promise<any>((resolve) =>
              calls.push({
                signal: args.signal,
                resolve,
              }),
            );
          } finally {
            active -= 1;
          }
        },
      });
      const backend = {
        id: "probe",
        type: "acp",
        baseUrl: "local://probe",
        command: "agent",
      } as any;
      const first = preparation.prepare(backend, { acpModelId: "a" }, true);
      await new Promise((resolve) => setTimeout(resolve, 0));
      const second = preparation.prepare(backend, { acpModelId: "b" }, true);
      assert.isTrue(calls[0].signal.aborted);
      calls[0].resolve({ ok: true, backend });
      assert.isNull(await first);
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.lengthOf(calls, 2);
      calls[1].resolve({ ok: true, backend });
      assert.equal((await second)?.backend.id, "probe");
      assert.equal(peak, 1);
      preparation.dispose();
    },
  );

  itNodeOnly(
    "cancels a form probe on close and leaves a failed context retryable",
    async function () {
      const backend = {
        id: "probe",
        type: "acp",
        baseUrl: "local://probe",
        command: "agent",
      } as any;
      let complete!: (result: any) => void;
      let signal: any;
      const preparation = createAcpFormCatalogPreparation({
        probe: async (args) => {
          signal = args.signal;
          return new Promise<any>((resolve) => {
            complete = resolve;
          });
        },
      });
      const pending = preparation.prepare(backend, { acpModelId: "a" }, true);
      await new Promise((resolve) => setTimeout(resolve, 0));
      preparation.dispose();
      assert.isTrue(signal.aborted);
      complete({ ok: true, backend });
      assert.isNull(await pending);
      const failed = createAcpFormCatalogPreparation({
        probe: async () => {
          throw new Error("probe failed");
        },
      });
      assert.isFalse((await failed.prepare(backend, {}, true))?.ok);
      assert.equal(failed.snapshot().state, "error");
      assert.include(failed.snapshot().error, "probe failed");
      failed.dispose();
    },
  );

  itNodeOnly(
    "uses cached ACP models without probing missing reasoning contexts",
    async function () {
      let probes = 0;
      const backend = {
        id: "cached",
        type: "acp",
        baseUrl: "local://cached",
        command: "agent",
      } as any;
      const preparation = createAcpFormCatalogPreparation({
        probe: async () => {
          probes += 1;
          return { ok: true, backend };
        },
      });
      await preparation.prepare(backend, { acpModelId: "a/model" });
      await preparation.prepare(backend, { acpModelId: "b/model" });
      assert.equal(probes, 0);
      assert.equal(preparation.snapshot().state, "ready");
      preparation.dispose();
    },
  );

  itNodeOnly(
    "restores valid backend selections within a form without inheriting another backend's defaults",
    async function () {
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      )!;
      const candidateBackends = ["a", "b"].map((id) => ({
        id,
        type: "acp",
        baseUrl: `local://${id}`,
        command: "agent",
        acp: {
          runtimeOptionsCache: buildAcpRuntimeOptionsCache({
            modes: {
              currentModeId: "default",
              availableModes: [{ id: "default", name: "Default" }],
            },
            models: {
              currentModelId: `${id}/default`,
              availableModels: [
                { modelId: `${id}/default`, name: "Default model" },
                { modelId: `${id}/chosen`, name: "Chosen model" },
              ],
            },
          }),
        },
      })) as any;
      for (const backend of candidateBackends) {
        const cache = backend.acp.runtimeOptionsCache;
        cache.reasoningCatalogs = [
          {
            modelId: `${backend.id}/chosen`,
            modeId: "default",
            configFingerprint: computeAcpBackendConfigFingerprint(backend),
            revision: cache.revision,
            refreshedAt: cache.refreshedAt,
            reasoningSource: "explicit",
            reasoningEfforts: [{ id: "high", label: "High" }],
            currentReasoningEffortId: "high",
          },
        ];
      }
      const backendSelections = new Map<string, Record<string, unknown>>();
      const switchBackend = (
        previousBackendId: string,
        nextBackendId: string,
        options: Record<string, unknown>,
      ) =>
        rebaseWorkflowProviderOptionsForBackendChange({
          workflow,
          previousBackendId,
          nextBackendId,
          options,
          candidateBackends,
          backendSelections,
        });
      const chosen = {
        acpModelProvider: "a",
        acpModelId: "a/chosen",
        acpModeId: "default",
        acpReasoningEffort: "high",
        hard_timeout_seconds: 99,
      };
      const firstB = switchBackend("a", "b", chosen);
      assert.deepEqual(firstB, { hard_timeout_seconds: 99 });
      assert.deepEqual(
        switchBackend("b", "a", { ...firstB, hard_timeout_seconds: 123 }),
        { ...chosen, hard_timeout_seconds: 123 },
      );
      switchBackend("a", "b", chosen);
      candidateBackends[0].acp.runtimeOptionsCache.rawModels.pop();
      assert.deepEqual(switchBackend("b", "a", firstB), {
        acpModelProvider: "a",
        acpModeId: "default",
        hard_timeout_seconds: 99,
      });
      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow,
        candidateBackends,
        draft: {
          backendId: "b",
          providerOptionsMode: "replace",
          providerOptions: firstB,
        },
      });
      assert.equal(
        descriptor.providerSchemaEntries.find(
          (entry) => entry.key === "acpModelId",
        )?.observedValue,
        "b/default",
      );
      assert.notProperty(descriptor.providerOptions, "acpModelId");
      const runtime = globalThis as any;
      const previousAddon = runtime.addon;
      runtime.addon = {
        data: { workflow: { loaded: { workflows: [workflow] } } },
      };
      const state = {
        backends: candidateBackends,
        workflowSettingsDraftById: new Map([
          [
            workflow.manifest.id,
            {
              backendId: "a",
              providerOptions: { ...chosen, acpModelId: "a/default" },
            },
          ],
        ]),
        workflowSettingsSaveStateById: new Map(),
        workflowSettingsSaveErrorById: new Map(),
        workflowSettingsSaveTimerById: new Map(),
      };
      try {
        const dispatch = createDashboardActionDispatcher({
          state: state as any,
          refresh: () => {},
          getRuntimeWindow: () => undefined,
        } as any);
        for (const backendId of ["b", "a"]) {
          const current = state.workflowSettingsDraftById.get(
            workflow.manifest.id,
          )!;
          await dispatch({
            type: "dashboard:action",
            action: "workflow-settings-draft",
            payload: {
              workflowId: workflow.manifest.id,
              changedSection: "backend",
              changedKey: "backendId",
              changedOrigin: "choice",
              executionOptions: { ...current, backendId },
            },
          });
        }
        assert.equal(
          state.workflowSettingsDraftById.get(workflow.manifest.id)
            ?.providerOptions.acpModelId,
          "a/default",
        );
        assert.equal(
          state.workflowSettingsDraftById.get(workflow.manifest.id)
            ?.providerOptions.acpModeId,
          "default",
        );
      } finally {
        runtime.addon = previousAddon;
      }
    },
  );

  itNodeOnly(
    "confirms restored backend choices before their descriptor echo without probing",
    async function () {
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      )!;
      const backends = ["a", "b"].map((id) => ({
        id,
        type: "acp",
        baseUrl: `local://${id}`,
        command: "agent",
        acp: {
          runtimeOptionsCache: buildAcpRuntimeOptionsCache({
            models: {
              currentModelId: `${id}/default`,
              availableModels: [
                { modelId: `${id}/default`, name: "Default" },
                { modelId: `${id}/chosen`, name: "Chosen" },
              ],
            },
          }),
        },
      })) as any;
      const environment = createSidebarDomEnvironment();
      environment.document.body.innerHTML =
        '<div id="zs-workflow-settings-dialog-root"></div>';
      const snapshots: any[] = [];
      const createElement = environment.document.createElement.bind(
        environment.document,
      );
      environment.document.createElement = ((tag: string) => {
        const node = createElement(tag);
        if (tag === "iframe")
          Object.defineProperty(node, "contentWindow", {
            value: {
              postMessage: (message: any) => snapshots.push(message.payload),
            },
          });
        return node;
      }) as typeof environment.document.createElement;
      const runtime = globalThis as any;
      const previousToolkit = runtime.ztoolkit;
      let data: any;
      let done!: () => void;
      const unloaded = new Promise<void>((resolve) => {
        done = resolve;
      });
      class TestDialog {
        window = environment.window;
        addCell() {
          return this;
        }
        setDialogData(value: any) {
          data = value;
          data.unloadLock = { promise: unloaded };
          return this;
        }
        open() {
          queueMicrotask(() => data.loadCallback());
          return this;
        }
      }
      runtime.ztoolkit = { Dialog: TestDialog };
      environment.window.close = () => {
        data.unloadCallback();
        done();
      };
      const action = (action: string, payload: Record<string, unknown>) =>
        environment.window.dispatchEvent(
          new environment.window.MessageEvent("message", {
            data: { type: "workflow-settings-dialog:action", action, payload },
          }),
        );
      const settle = async (count: number) => {
        for (
          let attempt = 0;
          attempt < 100 && snapshots.length < count;
          attempt++
        )
          await new Promise((resolve) => setTimeout(resolve, 0));
        assert.isAtLeast(snapshots.length, count);
      };
      let probes = 0;
      let result: ReturnType<typeof openWorkflowSettingsWebDialog> | undefined;
      try {
        result = openWorkflowSettingsWebDialog({
          workflow,
          candidateBackends: backends,
          initialDraft: {
            backendId: "a",
            providerOptions: { acpModelId: "a/chosen" },
          },
          catalogProbe: async () => {
            probes++;
            throw new Error("Only manual refresh may probe");
          },
        });
        await settle(1);
        action("update-draft", {
          changedSection: "backend",
          changedKey: "backendId",
          changedOrigin: "choice",
          executionOptions: {
            backendId: "b",
            providerOptions: { acpModelId: "a/chosen" },
          },
        });
        await settle(2);
        assert.notProperty(snapshots.at(-1).form.providerOptions, "acpModelId");
        assert.equal(
          snapshots
            .at(-1)
            .form.providerSchemaEntries.find(
              (entry: any) => entry.key === "acpModelId",
            ).observedValue,
          "b/default",
        );
        action("update-draft", {
          changedSection: "backend",
          changedKey: "backendId",
          changedOrigin: "choice",
          executionOptions: { backendId: "a", providerOptions: {} },
        });
        action("confirm", {
          executionOptions: {
            backendId: "a",
            providerOptions: { hard_timeout_seconds: 123 },
          },
        });
        const confirmed = await result;
        assert.equal(confirmed.status, "confirmed");
        if (confirmed.status === "confirmed")
          assert.deepEqual(confirmed.executionOptions.providerOptions, {
            acpModelId: "a/chosen",
            acpModelProvider: "a",
            hard_timeout_seconds: 123,
          });
        assert.equal(probes, 0);
      } finally {
        environment.window.close();
        await result;
        runtime.ztoolkit = previousToolkit;
        environment.dom.window.close();
      }
    },
  );

  itNodeOnly(
    "shows catalog first entries when ACP current values are missing without fixing them as overrides",
    async function () {
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      )!;
      const backend = {
        id: "first",
        type: "acp",
        baseUrl: "local://first",
        command: "agent",
        acp: {
          runtimeOptionsCache: buildAcpRuntimeOptionsCache({
            modes: {
              currentModeId: "",
              availableModes: [{ id: "code", name: "Code" }],
            },
            models: {
              currentModelId: "",
              availableModels: [{ modelId: "p/first", name: "First" }],
            },
          }),
        },
      } as any;
      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow,
        candidateBackends: [backend],
        draft: { providerOptionsMode: "replace", providerOptions: {} },
      });
      for (const [key, value] of [
        ["acpModeId", "code"],
        ["acpModelProvider", "p"],
        ["acpModelId", "p/first"],
      ]) {
        assert.equal(
          descriptor.providerSchemaEntries.find((entry) => entry.key === key)
            ?.observedValue,
          value,
        );
        assert.notProperty(descriptor.providerOptions, key);
      }
      assert.equal(descriptor.runtimeCatalogState, "ready");
      backend.acp.runtimeOptionsCache.status = "stale";
      backend.acp.runtimeOptionsCache.refreshedAt = "2020-01-01T00:00:00Z";
      const stale = await buildWorkflowSettingsUiDescriptor({
        workflow,
        candidateBackends: [backend],
      });
      assert.isString(stale.runtimeCatalogError);
      assert.deepEqual(
        stale.providerSchemaEntries.find((entry) => entry.key === "acpModelId")
          ?.enumValues,
        ["p/first"],
      );
      assert.equal(stale.runtimeCatalogState, "ready");
    },
  );

  itNodeOnly(
    "does not revive saved ACP options after a complete backend-switch draft",
    async function () {
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      )!;
      const oldOptions = {
        acpModeId: "build",
        acpModelId: "old/model",
        acpModelProvider: "old",
        acpReasoningEffort: "high",
        hard_timeout_seconds: 99,
      };
      updateWorkflowSettings(workflow.manifest.id, {
        backendId: "old",
        providerOptions: oldOptions,
      });
      const backends = [
        { id: "old", type: "acp", baseUrl: "local://old", command: "agent" },
        {
          id: "new",
          type: "acp",
          baseUrl: "local://new",
          command: "agent",
          acp: {
            runtimeOptionsCache: buildAcpRuntimeOptionsCache({
              modes: {
                currentModeId: "default",
                availableModes: [{ id: "default", name: "Default" }],
              },
              models: {
                currentModelId: "new/model",
                availableModels: [{ modelId: "new/model", name: "New model" }],
              },
            }),
          },
        },
      ] as any;
      const draft = {
        backendId: "new",
        providerOptionsMode: "replace" as const,
        providerOptions: rebaseWorkflowProviderOptionsForBackendChange({
          workflow,
          previousBackendId: "old",
          nextBackendId: "new",
          options: oldOptions,
          candidateBackends: backends,
        }),
      };
      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow,
        candidateBackends: backends,
        draft,
      });
      assert.deepEqual(descriptor.providerOptions, {
        hard_timeout_seconds: 99,
      });
      assert.deepEqual(
        descriptor.providerSchemaEntries.find(
          (entry) => entry.key === "acpModelId",
        )?.enumValues,
        ["new/model"],
      );
      updateWorkflowSettings(workflow.manifest.id, draft);
      assert.deepEqual(
        getWorkflowSettings(workflow.manifest.id).providerOptions,
        { hard_timeout_seconds: 99 },
      );
    },
  );

  for (const [previousType, nextType] of [
    ["acp", "skillrunner"],
    ["skillrunner", "acp"],
  ] as const) {
    itNodeOnly(
      `keeps common settings when switching ${previousType} to ${nextType}`,
      async function () {
        const loaded = await loadWorkflowManifests(workflowsPath());
        const base = loaded.workflows.find(
          (entry) => entry.manifest.id === "literature-analysis",
        )!;
        const workflow = {
          ...base,
          manifest: {
            ...base.manifest,
            execution: {
              ...base.manifest.execution,
              zoteroHostAccess: { allowWriteApprovalBypass: true },
            },
          },
        };
        const common = { hard_timeout_seconds: 99 };
        const prior =
          previousType === "acp"
            ? {
                acpModeId: "build",
                acpModelId: "old/model",
                acpReasoningEffort: "high",
              }
            : { engine: "opencode", provider_id: "old", model: "old" };
        const backends = [
          {
            id: "old",
            type: previousType,
            baseUrl: "local://old",
            command: "agent",
          },
          {
            id: "new",
            type: nextType,
            baseUrl: "http://127.0.0.1:18030",
            command: "agent",
          },
        ] as any;
        updateWorkflowSettings(workflow.manifest.id, {
          backendId: "old",
          providerOptions: { ...prior, ...common },
        });
        const draft = {
          backendId: "new",
          providerOptionsMode: "replace" as const,
          workflowParams: { customInput: "kept" },
          runOptions: { zoteroHostAccess: { autoApproveWrites: true } },
          hostOptions: { queue: { maxConcurrency: 2 } },
          providerOptions: rebaseWorkflowProviderOptionsForBackendChange({
            workflow,
            previousBackendId: "old",
            nextBackendId: "new",
            options: { ...prior, ...common },
            candidateBackends: backends,
          }),
        };
        const descriptor = await buildWorkflowSettingsUiDescriptor({
          workflow,
          draft,
          candidateBackends: backends,
        });
        assert.equal(descriptor.providerOptions.hard_timeout_seconds, 99);
        for (const key of Object.keys(prior))
          assert.notProperty(descriptor.providerOptions, key);
        assert.deepEqual(descriptor.hostOptions, draft.hostOptions);
        assert.deepEqual(descriptor.runOptions, draft.runOptions);
        updateWorkflowSettings(workflow.manifest.id, draft);
        const saved = getWorkflowSettings(workflow.manifest.id);
        assert.equal(saved.workflowParams?.customInput, "kept");
        assert.deepEqual(saved.hostOptions, draft.hostOptions);
        for (const key of Object.keys(prior))
          assert.notProperty(saved.providerOptions, key);
      },
    );
  }

  for (const [backendType, confirmBeforeEcho] of [
    ["acp", false],
    ["acp", true],
    ["skillrunner", true],
    ["acp-probe", false],
  ] as const)
    itNodeOnly(
      confirmBeforeEcho
        ? `${backendType} confirms the provider's first model before the descriptor echo without losing typed fields`
        : "keeps the newest provider/model when submit descriptor replies arrive out of order",
      async function () {
        const loaded = await loadWorkflowManifests(workflowsPath());
        const base = loaded.workflows.find(
          (entry) => entry.manifest.id === "literature-analysis",
        )!;
        const workflow = {
          ...base,
          manifest: {
            ...base.manifest,
            parameters: {
              topic: {
                type: "string",
                optionsSource: { kind: "synthesis.topics" },
              },
            },
          },
        };
        const probePending = backendType === "acp-probe";
        const isAcp = backendType !== "skillrunner";
        const backend =
          backendType === "skillrunner"
            ? {
                id: "skillrunner-delayed",
                type: "skillrunner",
                baseUrl: "http://127.0.0.1:18030",
              }
            : {
                id: "acp-delayed",
                type: "acp",
                baseUrl: "local://delayed",
                command: "agent",
                acp: {
                  runtimeOptionsCache: buildAcpRuntimeOptionsCache({
                    models: {
                      currentModelId: "a/model",
                      availableModels: [
                        { modelId: "a/model", name: "A" },
                        { modelId: "b/model@low", name: "B low" },
                        { modelId: "c/model@high", name: "C high" },
                      ],
                    },
                    refreshedAt: "2026-10-14T00:00:00Z",
                  }),
                },
              };
        if (backendType === "skillrunner") {
          upsertSkillRunnerModelCacheEntry({
            backendId: backend.id,
            baseUrl: backend.baseUrl,
            engines: ["opencode"],
            updatedAt: "2026-10-14T00:00:00Z",
            modelsByEngine: {
              opencode: ["a", "b", "c"].flatMap((provider) =>
                ["first", "second"].map((model) => ({
                  id: `${provider}/${model}`,
                  provider_id: provider,
                  model,
                  display_name: model,
                })),
              ),
            },
          });
        }
        if (isAcp && !probePending) {
          const cache = (backend as any).acp.runtimeOptionsCache;
          cache.reasoningCatalogs = [
            "a/model",
            "b/model@low",
            "c/model@high",
          ].map((modelId) => ({
            modelId,
            modeId: "",
            configFingerprint: computeAcpBackendConfigFingerprint(
              backend as any,
            ),
            revision: cache.revision,
            refreshedAt: cache.refreshedAt,
            reasoningSource: "none",
            reasoningEfforts: [],
            currentReasoningEffortId: "",
          }));
        }
        const providerKey = isAcp ? "acpModelProvider" : "provider_id";
        const modelKey = isAcp ? "acpModelId" : "model";
        const expectedModel = isAcp ? "c/model@high" : "first";
        const optionsForProvider = (provider: string) => ({
          ...(backendType === "skillrunner" ? { engine: "opencode" } : {}),
          [providerKey]: provider,
          [modelKey]: isAcp ? "a/model" : "second",
        });
        const pending: Array<(value: unknown) => void> = [];
        let probeCalls = 0;
        const topicOptions = {
          options: [{ value: "topic", label: "Topic" }],
          diagnostics: [],
        };
        let reads = 0;
        await resetDefaultSynthesisClientForTests();
        setDefaultSynthesisClientCompositionFactoryForTests(
          () =>
            ({
              client: {
                topics: {
                  listWorkflowOptions: () => {
                    reads += 1;
                    return reads === 1
                      ? Promise.resolve(topicOptions)
                      : new Promise((resolve) => pending.push(resolve));
                  },
                },
              },
              dispose: async () => {},
              invalidate: () => {},
            }) as any,
        );
        const environment = createSidebarDomEnvironment();
        environment.document.body.innerHTML =
          '<div id="zs-workflow-settings-dialog-root"></div>';
        const snapshots: any[] = [];
        const createElement = environment.document.createElement.bind(
          environment.document,
        );
        environment.document.createElement = ((tag: string) => {
          const node = createElement(tag);
          if (tag === "iframe")
            Object.defineProperty(node, "contentWindow", {
              value: {
                postMessage: (message: any) => snapshots.push(message.payload),
              },
            });
          return node;
        }) as typeof environment.document.createElement;
        const runtime = globalThis as any;
        const previousToolkit = runtime.ztoolkit;
        let data: any;
        let done!: () => void;
        const unloaded = new Promise<void>((resolve) => {
          done = resolve;
        });
        class TestDialog {
          window = environment.window;
          addCell() {
            return this;
          }
          setDialogData(value: any) {
            data = value;
            data.unloadLock = { promise: unloaded };
            return this;
          }
          open() {
            queueMicrotask(() => data.loadCallback());
            return this;
          }
        }
        runtime.ztoolkit = { Dialog: TestDialog };
        environment.window.close = () => {
          data.unloadCallback();
          done();
        };
        const settle = async (predicate: () => boolean) => {
          for (let attempt = 0; attempt < 100 && !predicate(); attempt += 1)
            await new Promise((resolve) => setTimeout(resolve, 0));
          assert.isTrue(
            predicate(),
            "host action reached its observable checkpoint",
          );
        };
        const action = (name: string, payload: Record<string, unknown>) =>
          environment.window.dispatchEvent(
            new environment.window.MessageEvent("message", {
              data: {
                type: "workflow-settings-dialog:action",
                action: name,
                payload,
              },
            }),
          );
        let result:
          | ReturnType<typeof openWorkflowSettingsWebDialog>
          | undefined;
        try {
          result = openWorkflowSettingsWebDialog({
            ...(probePending
              ? {
                  catalogProbe: async () => {
                    probeCalls += 1;
                    throw new Error(
                      "Provider switching must use cached models",
                    );
                  },
                }
              : {}),
            workflow: workflow as any,
            candidateBackends: [backend as any],
            initialDraft: {
              backendId: backend.id,
              providerOptions: optionsForProvider("a"),
            },
          });
          await settle(() => snapshots.length === 1);
          for (const provider of ["b", "c"]) {
            action("update-draft", {
              changedSection: "providerOptions",
              changedKey: providerKey,
              changedOrigin: "choice",
              executionOptions: {
                backendId: backend.id,
                workflowParams: { topic: "topic" },
                providerOptions: optionsForProvider(provider),
              },
            });
            await settle(() => pending.length === (provider === "b" ? 1 : 2));
          }
          if (confirmBeforeEcho) {
            action("update-draft", {
              changedSection: "providerOptions",
              changedKey: "hard_timeout_seconds",
              changedOrigin: "text",
              executionOptions: {
                backendId: backend.id,
                providerOptions: {
                  ...optionsForProvider("c"),
                  hard_timeout_seconds: 99,
                },
              },
            });
            action("confirm", {
              executionOptions: {
                backendId: backend.id,
                workflowParams: { topic: "typed-before-confirm" },
                providerOptions: {
                  ...optionsForProvider("c"),
                  hard_timeout_seconds: 99,
                },
              },
            });
            const confirmed = await result;
            assert.equal(confirmed.status, "confirmed");
            if (confirmed.status === "confirmed") {
              assert.equal(
                confirmed.executionOptions.providerOptions?.[modelKey],
                expectedModel,
              );
              assert.equal(
                confirmed.executionOptions.providerOptions
                  ?.hard_timeout_seconds,
                99,
              );
              assert.equal(
                confirmed.executionOptions.workflowParams?.topic,
                "typed-before-confirm",
              );
            }
            return;
          }
          pending[1](topicOptions);
          await settle(() => snapshots.length === 2);
          assert.equal(snapshots.at(-1).form.providerOptions[providerKey], "c");
          assert.equal(
            snapshots.at(-1).form.providerOptions[modelKey],
            expectedModel,
          );
          if (probePending) {
            assert.equal(probeCalls, 0);
            assert.isTrue(
              snapshots
                .at(-1)
                .form.providerSchemaEntries.find(
                  (entry: any) => entry.key === "acpReasoningEffort",
                ).disabled,
            );
          }
          pending[0](topicOptions);
          await new Promise((resolve) => setTimeout(resolve, 10));
          assert.lengthOf(
            snapshots,
            2,
            "old reply must not publish a mixed snapshot",
          );
          action("confirm", {});
          const confirmed = await result;
          assert.equal(confirmed.status, "confirmed");
          if (confirmed.status === "confirmed")
            assert.equal(
              confirmed.executionOptions.providerOptions?.[modelKey],
              expectedModel,
            );
        } finally {
          for (const resolve of pending) resolve(topicOptions);
          environment.window.close();
          await result;
          runtime.ztoolkit = previousToolkit;
          setDefaultSynthesisClientCompositionFactoryForTests(null);
          await resetDefaultSynthesisClientForTests();
          environment.dom.window.close();
        }
      },
    );

  itNodeOnly(
    "selects the first raw model only on an explicit ACP provider change and retains it through saving",
    async function () {
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      )!;
      const identity = {
        id: "acp-switch",
        type: "acp",
        baseUrl: "local://switch",
        command: "agent",
      };
      const backend = {
        ...identity,
        acp: {
          connectionTest: {
            status: "passed",
            testedAt: "2026-10-14T00:00:00Z",
            configFingerprint: computeAcpBackendConfigFingerprint(
              identity as any,
            ),
          },
          runtimeOptionsCache: buildAcpRuntimeOptionsCache({
            models: {
              currentModelId: "anthropic/claude",
              availableModels: [
                { modelId: "anthropic/claude", name: "Claude" },
                { modelId: "openai/gpt@low", name: "GPT low" },
                { modelId: "openai/gpt@high", name: "GPT high" },
                {
                  modelId: "opaque:v:thinking",
                  name: "Opaque",
                  providerId: "gateway",
                  modelIdentifier: "opaque",
                },
                { modelId: "local-model", name: "Local" },
              ],
            },
            refreshedAt: "2026-10-14T00:00:00Z",
          }),
        },
      };
      Zotero.Prefs.set(
        backendsConfigPrefKey,
        JSON.stringify({ schemaVersion: 2, backends: [backend] }),
        true,
      );
      const registry = await loadBackendsRegistry();
      for (const [provider, first] of [
        ["openai", "openai/gpt@low"],
        ["gateway", "opaque:v:thinking"],
        ["Unscoped", "local-model"],
      ]) {
        for (const owner of [backend, ...registry.backends] as any[]) {
          const cache = owner.acp?.runtimeOptionsCache;
          if (cache)
            cache.reasoningCatalogs = [
              ...(cache.reasoningCatalogs || []),
              {
                modelId: first,
                modeId: "",
                configFingerprint: computeAcpBackendConfigFingerprint(owner),
                revision: cache.revision,
                refreshedAt: cache.refreshedAt,
                reasoningSource: "explicit",
                reasoningEfforts: [{ id: "high", label: "High" }],
                currentReasoningEffortId: "high",
              },
            ];
        }
        Zotero.Prefs.set(
          backendsConfigPrefKey,
          JSON.stringify({ schemaVersion: 2, backends: [backend] }),
          true,
        );
        const options = {
          acpModelProvider: provider,
          acpModelId: "anthropic/claude",
          acpReasoningEffort: "high",
        };
        const args = {
          workflow,
          backendId: backend.id,
          candidateBackends: registry.backends,
          changedSection: "providerOptions",
          changedKey: "acpModelProvider",
          options,
        };
        assert.deepEqual(
          rebaseWorkflowProviderOptionsForModelProviderChange({
            ...args,
            origin: "text",
          }),
          options,
        );
        assert.deepEqual(
          rebaseWorkflowProviderOptionsForModelProviderChange({
            ...args,
            origin: "choice",
            changedKey: "acpModelId",
          }),
          { acpModelProvider: provider, acpModelId: "anthropic/claude" },
        );
        const next = rebaseWorkflowProviderOptionsForModelProviderChange({
          ...args,
          origin: "choice",
        });
        assert.equal(next.acpModelId, first);
        assert.equal(next.acpModelProvider, provider);
        assert.equal(next.acpReasoningEffort, "high");
        const runtime = globalThis as any;
        const previousAddon = runtime.addon;
        const timers: Array<() => void> = [];
        const state = {
          backends: registry.backends,
          workflowSettingsDraftById: new Map(),
          workflowSettingsSaveStateById: new Map(),
          workflowSettingsSaveErrorById: new Map(),
          workflowSettingsSaveTimerById: new Map(),
        };
        runtime.addon = {
          data: { workflow: { loaded: { workflows: [workflow] } } },
        };
        try {
          const dispatch = createDashboardActionDispatcher({
            state: state as any,
            refresh: () => {},
            invalidateHomeWorkflowSummaries: () => {},
            getRuntimeWindow: () =>
              ({
                setTimeout: (callback: () => void) => {
                  timers.push(callback);
                  return timers.length;
                },
                clearTimeout: () => {},
              }) as any,
          } as any);
          await dispatch({
            type: "dashboard:action",
            action: "workflow-settings-draft",
            payload: {
              workflowId: workflow.manifest.id,
              changedSection: "providerOptions",
              changedKey: "acpModelProvider",
              changedOrigin: "choice",
              executionOptions: {
                backendId: backend.id,
                providerOptions: options,
              },
            },
          });
          assert.equal(
            state.workflowSettingsDraftById.get(workflow.manifest.id)
              ?.providerOptions.acpModelId,
            first,
          );
          await dispatch({
            type: "dashboard:action",
            action: "workflow-settings-draft",
            payload: {
              workflowId: workflow.manifest.id,
              changedSection: "providerOptions",
              changedKey: "hard_timeout_seconds",
              changedOrigin: "text",
              executionOptions: {
                backendId: backend.id,
                providerOptions: { ...options, hard_timeout_seconds: 99 },
              },
            },
          });
          assert.equal(
            state.workflowSettingsDraftById.get(workflow.manifest.id)
              ?.providerOptions.acpModelId,
            first,
          );
          timers[0]();
          assert.equal(
            getWorkflowSettings(workflow.manifest.id).providerOptions
              ?.acpModelId,
            first,
          );
        } finally {
          runtime.addon = previousAddon;
        }
        updateWorkflowSettings(workflow.manifest.id, {
          backendId: backend.id,
          providerOptions: next,
        });
        const descriptor = await buildWorkflowSettingsUiDescriptor({
          workflow,
          candidateBackends: registry.backends,
        });
        assert.equal(descriptor.providerOptions.acpModelProvider, provider);
        assert.equal(descriptor.providerOptions.acpModelId, first);
        const context = await resolveWorkflowExecutionContext({ workflow });
        assert.equal(context.providerOptions.acpModelId, first);
        assert.notProperty(context.providerOptions, "acpModelProvider");
      }
      const unavailable = {
        acpModelProvider: "missing",
        acpModelId: "anthropic/claude",
      };
      assert.deepEqual(
        rebaseWorkflowProviderOptionsForModelProviderChange({
          workflow,
          backendId: backend.id,
          candidateBackends: registry.backends,
          changedSection: "providerOptions",
          changedKey: "acpModelProvider",
          origin: "choice",
          options: unavailable,
        }),
        { acpModelProvider: "missing" },
      );
      assert.throws(
        () =>
          validateProviderOptionsForBackend({
            backend: registry.backends[0],
            providerOptions: unavailable,
          }),
        ProviderProfileError,
      );
    },
  );

  itNodeOnly(
    "preserves a provider-only ACP draft and refreshes its model choices",
    async function () {
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      )!;
      const backend = {
        id: "acp-provider-switch",
        type: "acp",
        baseUrl: "local://provider-switch",
        command: "agent",
        acp: {
          runtimeOptionsCache: buildAcpRuntimeOptionsCache({
            models: {
              currentModelId: "anthropic/claude",
              availableModels: [
                { modelId: "anthropic/claude", name: "Claude" },
                { modelId: "openai/gpt@low", name: "GPT low" },
                { modelId: "openai/gpt@high", name: "GPT high" },
              ],
            },
            refreshedAt: "2026-10-14T00:00:00Z",
          }),
        },
      };
      for (const acpModelId of ["anthropic/claude", undefined]) {
        const descriptor = await buildWorkflowSettingsUiDescriptor({
          workflow,
          candidateBackends: [backend as any],
          ignoreSavedSettings: true,
          draft: {
            backendId: backend.id,
            providerOptions: {
              acpModelProvider: "openai",
              ...(acpModelId ? { acpModelId } : {}),
            },
          },
        });
        assert.equal(descriptor.providerOptions.acpModelProvider, "openai");
        assert.deepEqual(
          descriptor.providerSchemaEntries.find(
            (entry) => entry.key === "acpModelId",
          )?.enumValues,
          ["openai/gpt@low", "openai/gpt@high"],
        );
        assert.equal(descriptor.providerOptions.acpModelId, acpModelId);
      }
    },
  );

  beforeEach(function () {
    restorePrefs = installMutablePrefsForTest();
    prevBackendsConfigPref = Zotero.Prefs.get(backendsConfigPrefKey, true);
    prevWorkflowSettingsPref = Zotero.Prefs.get(workflowSettingsPrefKey, true);

    Zotero.Prefs.set(
      backendsConfigPrefKey,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "skillrunner-primary",
            displayName: "skillrunner-primary",
            type: "skillrunner",
            baseUrl: "http://127.0.0.1:8030",
            auth: { kind: "none" },
          },
          {
            id: "skillrunner-alt",
            displayName: "skillrunner-alt",
            type: "skillrunner",
            baseUrl: "http://127.0.0.1:18030",
            auth: { kind: "none" },
          },
          {
            id: "generic-http-local",
            displayName: "generic-http-local",
            type: "generic-http",
            baseUrl: "http://127.0.0.1:8030",
            auth: { kind: "none" },
          },
        ],
      }),
      true,
    );
    Zotero.Prefs.clear(workflowSettingsPrefKey, true);
    clearSkillRunnerModelCache();
  });

  afterEach(function () {
    setDebugModeOverrideForTests();
    setSkillRunnerInteractiveAutoReplyEnabledForTests();
    clearSkillRunnerModelCache();
    clearWorkflowSettings("literature-analysis");
    clearWorkflowSettings("literature-explainer");
    clearWorkflowSettings("tag-regulator");
    clearWorkflowSettings("pass-through-settings");
    if (typeof prevBackendsConfigPref === "undefined") {
      Zotero.Prefs.clear(backendsConfigPrefKey, true);
    } else {
      Zotero.Prefs.set(backendsConfigPrefKey, prevBackendsConfigPref, true);
    }
    if (typeof prevWorkflowSettingsPref === "undefined") {
      Zotero.Prefs.clear(workflowSettingsPrefKey, true);
    } else {
      Zotero.Prefs.set(workflowSettingsPrefKey, prevWorkflowSettingsPref, true);
    }
    restorePrefs?.();
    restorePrefs = undefined;
  });

  it("persists and explicitly clears the Host queue maximum", function () {
    updateWorkflowSettings("host-queue-settings-test", {
      hostOptions: {
        queue: {
          maxConcurrency: 4,
        },
      },
    });
    assert.deepEqual(
      getWorkflowSettings("host-queue-settings-test").hostOptions,
      { queue: { maxConcurrency: 4 } },
    );

    updateWorkflowSettings("host-queue-settings-test", {
      hostOptions: {
        queue: {
          maxConcurrency: 0,
        },
      },
    });
    assert.deepEqual(
      getWorkflowSettings("host-queue-settings-test").hostOptions,
      {},
    );
  });

  it("preserves a hidden Host maximum when another settings surface omits Host options", function () {
    updateWorkflowSettings("host-queue-settings-test", {
      hostOptions: {
        queue: {
          maxConcurrency: 4,
        },
      },
    });

    updateWorkflowSettings("host-queue-settings-test", {
      workflowParams: {
        language: "zh-CN",
      },
    });

    assert.deepEqual(
      getWorkflowSettings("host-queue-settings-test").hostOptions,
      { queue: { maxConcurrency: 4 } },
    );
  });

  it("applies persisted workflow params/provider options/profile to request build", async function () {
    updateWorkflowSettings("literature-explainer", {
      backendId: "skillrunner-alt",
      workflowParams: { language: "en-US" },
      providerOptions: {
        engine: "gemini",
        model: "gemini-2.5-flash",
        no_cache: true,
      },
      hostOptions: {
        queue: {
          maxConcurrency: 3,
        },
      },
    });

    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-explainer",
    );
    assert.isOk(workflow);

    const context = await resolveWorkflowExecutionContext({
      workflow: workflow!,
    });
    assert.equal(context.backend.id, "skillrunner-alt");
    assert.equal(context.providerId, "skillrunner");
    assert.equal(context.workflowParams.language, "en-US");
    assert.equal(context.providerOptions.engine, "gemini");
    assert.equal(context.providerOptions.model, "gemini-2.5-flash");
    assert.equal(context.providerOptions.provider_id, "google");
    assert.equal(context.providerOptions.effort, "default");
    assert.isUndefined(context.providerOptions.no_cache);
    assert.deepEqual(context.hostOptions, {
      queue: { maxConcurrency: 3 },
    });

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Workflow Settings Parent" },
    });
    const mdFile = fixturePath("literature-analysis", "example.md");
    const attachment = await handlers.attachment.createFromPath({
      parent,
      path: mdFile,
      title: "workflow-settings.md",
      mimeType: "text/markdown",
    });
    const selectionContext = await buildSelectionContext([attachment]);
    const requests = (await executeBuildRequests({
      workflow: workflow!,
      selectionContext,
      executionOptions: {
        workflowParams: context.workflowParams,
        providerOptions: context.providerOptions,
      },
    })) as Array<{
      kind: string;
      parameter?: { language?: string };
      skill_id?: string;
      fetch_type?: "bundle" | "result";
      runtime_options?: { execution_mode?: string };
      input?: { source_path?: string };
      upload_files?: Array<{ key: string; path: string }>;
    }>;
    assert.equal(requests[0].kind, "skillrunner.job.v1");
    assert.equal(requests[0].skill_id, "literature-explainer");
    assert.equal(requests[0].parameter?.language, "en-US");
    assert.equal(requests[0].runtime_options?.execution_mode, "interactive");
    assert.equal(requests[0].fetch_type, "bundle");
    assert.equal(requests[0].upload_files?.[0].key, "source_path");
    assert.match(
      String(requests[0].input?.source_path || ""),
      /^inputs\/source_path\//,
    );
    assert.notInclude(JSON.stringify(requests[0]), "hostOptions");
    assert.notInclude(JSON.stringify(requests[0]), "maxConcurrency");
  });

  itZoteroFullOrNode(
    "applies per-submit execution overrides without mutating persisted settings",
    async function () {
      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-primary",
        workflowParams: { language: "zh-CN" },
        providerOptions: {
          engine: "gemini",
          model: "",
          no_cache: false,
        },
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-explainer",
      );
      assert.isOk(workflow);

      const overridden = await resolveWorkflowExecutionContext({
        workflow: workflow!,
        executionOptionsOverride: {
          backendId: "skillrunner-alt",
          workflowParams: { language: "en-US" },
          providerOptions: {
            engine: "gemini",
            model: "gemini-2.5-flash",
            no_cache: true,
          },
        },
      });
      assert.equal(overridden.backend.id, "skillrunner-alt");
      assert.equal(overridden.workflowParams.language, "en-US");
      assert.equal(overridden.providerOptions.engine, "gemini");
      assert.equal(overridden.providerOptions.model, "gemini-2.5-flash");
      assert.equal(overridden.providerOptions.provider_id, "google");
      assert.equal(overridden.providerOptions.effort, "default");
      assert.isUndefined(overridden.providerOptions.no_cache);

      const persisted = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.equal(persisted.backend.id, "skillrunner-primary");
      assert.equal(persisted.workflowParams.language, "zh-CN");
      assert.equal(persisted.providerOptions.engine, "gemini");
      assert.equal(persisted.providerOptions.model, "");
      assert.equal(persisted.providerOptions.provider_id, "google");
      assert.equal(persisted.providerOptions.effort, "default");
      assert.isUndefined(persisted.providerOptions.no_cache);
    },
  );

  itZoteroFullOrNode(
    "persists explicit A->B updates for default settings",
    async function () {
      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-primary",
        workflowParams: { language: "zh-CN" },
        providerOptions: {
          engine: "gemini",
          model: "gemini-2.5-flash",
          no_cache: false,
        },
      });
      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-primary",
        workflowParams: { language: "en-US" },
        providerOptions: {
          engine: "gemini",
          model: "gemini-2.5-pro",
          no_cache: true,
        },
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-explainer",
      );
      assert.isOk(workflow);

      const persisted = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.equal(persisted.workflowParams.language, "en-US");
      assert.equal(persisted.providerOptions.model, "gemini-2.5-pro");
      assert.isUndefined(persisted.providerOptions.no_cache);
    },
  );

  itNodeOnly(
    "enforces interactive-mode runtime options for interactive workflows",
    async function () {
      setSkillRunnerInteractiveAutoReplyEnabledForTests(false);
      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-alt",
        providerOptions: {
          engine: "gemini",
          no_cache: true,
          interactive_auto_reply: true,
          interactive_reply_timeout_sec: 30,
          hard_timeout_seconds: 900,
        },
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-explainer",
      );
      assert.isOk(workflow);

      const context = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.isUndefined(context.providerOptions.no_cache);
      assert.isUndefined(context.providerOptions.interactive_auto_reply);
      assert.isUndefined(context.providerOptions.interactive_reply_timeout_sec);
      assert.equal(context.providerOptions.hard_timeout_seconds, 900);
    },
  );

  itNodeOnly(
    "treats a blank run-once job timeout as clearing the saved timeout override",
    async function () {
      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-alt",
        providerOptions: {
          engine: "gemini",
          hard_timeout_seconds: 5,
        },
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-explainer",
      );
      assert.isOk(workflow);

      const saved = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.equal(saved.providerOptions.hard_timeout_seconds, 5);

      const cleared = await resolveWorkflowExecutionContext({
        workflow: workflow!,
        executionOptionsOverride: {
          providerOptions: {
            hard_timeout_seconds: null,
          },
        },
      });
      assert.notProperty(cleared.providerOptions, "hard_timeout_seconds");
    },
  );

  itNodeOnly(
    "clears a persisted job timeout when the settings payload sends an explicit blank",
    async function () {
      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-alt",
        providerOptions: {
          engine: "gemini",
          hard_timeout_seconds: 5,
        },
      });
      updateWorkflowSettings("literature-explainer", {
        providerOptions: {
          hard_timeout_seconds: null,
        },
      });

      const snapshot = await resetRunOnceOverridesForSettingsOpen(
        "literature-explainer",
      );
      assert.notProperty(snapshot.providerOptions, "hard_timeout_seconds");

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-explainer",
      );
      assert.isOk(workflow);

      const context = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.notProperty(context.providerOptions, "hard_timeout_seconds");
    },
  );

  itNodeOnly(
    "keeps interactive auto reply only when the feature switch is enabled",
    async function () {
      setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-alt",
        providerOptions: {
          engine: "gemini",
          interactive_auto_reply: true,
          interactive_reply_timeout_sec: 0,
        },
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-explainer",
      );
      assert.isOk(workflow);

      const context = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.equal(context.providerOptions.interactive_auto_reply, true);
      assert.equal(context.providerOptions.interactive_reply_timeout_sec, 0);
    },
  );

  itNodeOnly(
    "shows auto reply timeout only when interactive auto reply is checked",
    async function () {
      setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-explainer",
      );
      assert.isOk(workflow);

      const withoutAutoReply = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        draft: {
          providerOptions: {
            engine: "gemini",
            interactive_auto_reply: false,
          },
        },
      });
      const timeoutWithoutAutoReply =
        withoutAutoReply.providerSchemaEntries.find(
          (entry) => entry.key === "interactive_reply_timeout_sec",
        );
      assert.isOk(timeoutWithoutAutoReply);
      assert.deepEqual(timeoutWithoutAutoReply?.visibleIfProviderOption, {
        key: "interactive_auto_reply",
        equals: true,
      });

      const withAutoReply = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        draft: {
          providerOptions: {
            engine: "gemini",
            interactive_auto_reply: true,
          },
        },
      });
      const keys = withAutoReply.providerSchemaEntries.map(
        (entry) => entry.key,
      );
      assert.include(keys, "interactive_auto_reply");
      assert.include(keys, "interactive_reply_timeout_sec");
      const jobTimeout = withAutoReply.providerSchemaEntries.find(
        (entry) => entry.key === "hard_timeout_seconds",
      );
      assert.include(jobTimeout?.title || "", "(sec)");
    },
  );

  itNodeOnly(
    "shows auto and interactive options for mixed-mode sequence workflows",
    async function () {
      setDebugModeOverrideForTests(true);
      setSkillRunnerInteractiveAutoReplyEnabledForTests(true);
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "debug-interactive-then-result",
      );
      assert.isOk(workflow);

      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        candidateBackends: [
          {
            id: "skillrunner-local",
            type: "skillrunner",
            baseUrl: "http://127.0.0.1:8030",
            auth: { kind: "none" },
          },
        ],
        autoSelectFallbackProfile: true,
      });
      const keys = descriptor.providerSchemaEntries.map((entry) => entry.key);
      assert.include(keys, "interactive_auto_reply");
      assert.include(keys, "interactive_reply_timeout_sec");
      assert.include(keys, "no_cache");
    },
  );

  itNodeOnly(
    "enforces auto-mode runtime options for auto workflows",
    async function () {
      updateWorkflowSettings("tag-regulator", {
        backendId: "skillrunner-alt",
        providerOptions: {
          engine: "gemini",
          no_cache: true,
          interactive_auto_reply: true,
          interactive_reply_timeout_sec: 30,
          hard_timeout_seconds: 1200,
        },
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "tag-regulator",
      );
      assert.isOk(workflow);

      const context = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.equal(context.providerOptions.no_cache, true);
      assert.isUndefined(context.providerOptions.interactive_auto_reply);
      assert.isUndefined(context.providerOptions.interactive_reply_timeout_sec);
      assert.equal(context.providerOptions.hard_timeout_seconds, 1200);
    },
  );

  itNodeOnly(
    "normalizes opencode provider_id + model into separate execution fields",
    async function () {
      upsertSkillRunnerModelCacheEntry({
        backendId: "skillrunner-alt",
        baseUrl: "http://127.0.0.1:18030",
        updatedAt: "2026-03-12T00:00:00.000Z",
        engines: ["opencode"],
        modelsByEngine: {
          opencode: [
            {
              id: "openai/gpt-5",
              provider_id: "openai",
              provider: "openai",
              model: "gpt-5",
              display_name: "OpenAI GPT-5",
              deprecated: false,
              supported_effort: ["default", "low", "medium", "high"],
            },
          ],
        },
      });

      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-alt",
        providerOptions: {
          engine: "opencode",
          provider_id: "openai",
          model: "gpt-5",
          effort: "high",
          no_cache: false,
        },
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-explainer",
      );
      assert.isOk(workflow);

      const context = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.equal(context.providerOptions.engine, "opencode");
      assert.equal(context.providerOptions.provider_id, "openai");
      assert.equal(context.providerOptions.model, "gpt-5");
      assert.equal(context.providerOptions.effort, "high");
    },
  );

  itNodeOnly(
    "maps persisted opencode canonical model id to provider model name in settings descriptor",
    async function () {
      upsertSkillRunnerModelCacheEntry({
        backendId: "skillrunner-alt",
        baseUrl: "http://127.0.0.1:18030",
        updatedAt: "2026-03-12T00:00:00.000Z",
        engines: ["opencode"],
        modelsByEngine: {
          opencode: [
            {
              id: "minimax-m2.5",
              provider_id: "alibaba-coding-plan-cn",
              provider: "alibaba-coding-plan-cn",
              model: "minimax-m2.5",
              display_name: "MiniMax M2.5",
              deprecated: false,
            },
            {
              id: "qwen-plus-latest",
              provider_id: "alibaba-coding-plan-cn",
              provider: "alibaba-coding-plan-cn",
              model: "qwen-3.5-plus",
              display_name: "Qwen 3.5 Plus",
              deprecated: false,
            },
          ],
        },
      });

      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-alt",
        providerOptions: {
          engine: "opencode",
          provider_id: "alibaba-coding-plan-cn",
          model: "qwen-3.5-plus",
        },
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-explainer",
      );
      assert.isOk(workflow);

      const registry = await loadBackendsRegistry();
      assert.isUndefined(registry.fatalError);
      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        candidateBackends: registry.backends,
      });

      assert.equal(descriptor.providerOptions.engine, "opencode");
      assert.equal(
        descriptor.providerOptions.provider_id,
        "alibaba-coding-plan-cn",
      );
      assert.equal(descriptor.providerOptions.model, "qwen-3.5-plus");
      assert.notProperty(descriptor.providerOptions, "effort");
      assert.equal(
        descriptor.providerSchemaEntries.find((entry) => entry.key === "effort")
          ?.defaultValue,
        "default",
      );
    },
  );

  itNodeOnly(
    "keeps legacy opencode provider/model@effort string compatible",
    async function () {
      upsertSkillRunnerModelCacheEntry({
        backendId: "skillrunner-alt",
        baseUrl: "http://127.0.0.1:18030",
        updatedAt: "2026-03-12T00:00:00.000Z",
        engines: ["opencode"],
        modelsByEngine: {
          opencode: [
            {
              id: "openai/gpt-5",
              provider_id: "openai",
              display_name: "OpenAI GPT-5",
              deprecated: false,
              supported_effort: ["default", "low", "medium", "high"],
            },
          ],
        },
      });

      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-alt",
        providerOptions: {
          engine: "opencode",
          model: "openai/gpt-5@high",
          no_cache: false,
        },
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-explainer",
      );
      assert.isOk(workflow);

      const context = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.equal(context.providerOptions.engine, "opencode");
      assert.equal(context.providerOptions.provider_id, "openai");
      assert.equal(context.providerOptions.model, "gpt-5");
      assert.equal(context.providerOptions.effort, "high");
    },
  );

  itZoteroFullOrNode(
    "shows provider-scoped qwen settings using provider_id + model",
    async function () {
      upsertSkillRunnerModelCacheEntry({
        backendId: "skillrunner-alt",
        baseUrl: "http://127.0.0.1:18030",
        updatedAt: "2026-04-05T00:00:00.000Z",
        engines: ["qwen"],
        modelsByEngine: {
          qwen: [
            {
              id: "dashscope/qwen-max",
              provider_id: "dashscope",
              provider: "dashscope",
              model: "qwen-max",
              display_name: "Qwen Max",
              supported_effort: ["default"],
            },
            {
              id: "coding-plan/qwen-plus",
              provider_id: "coding-plan",
              provider: "coding-plan",
              model: "qwen-plus",
              display_name: "Qwen Plus",
              supported_effort: ["default", "low", "medium", "high"],
            },
          ],
        },
      });

      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-alt",
        providerOptions: {
          engine: "qwen",
          provider_id: "dashscope",
          model: "qwen-max",
          effort: "default",
        },
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-explainer",
      );
      assert.isOk(workflow);

      const registry = await loadBackendsRegistry();
      assert.isUndefined(registry.fatalError);
      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        candidateBackends: registry.backends,
      });

      assert.equal(descriptor.providerOptions.engine, "qwen");
      assert.equal(descriptor.providerOptions.provider_id, "dashscope");
      assert.equal(descriptor.providerOptions.model, "qwen-max");
      assert.equal(descriptor.providerOptions.effort, "default");
      assert.includeMembers(
        descriptor.providerSchemaEntries.map((entry) => entry.key),
        ["provider_id", "model", "effort"],
      );
    },
  );

  itNodeOnly(
    "hides provider_id for non provider-scoped engines but keeps canonical provider internally",
    async function () {
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-explainer",
      );
      assert.isOk(workflow);

      const registry = await loadBackendsRegistry();
      assert.isUndefined(registry.fatalError);
      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        draft: {
          backendId: "skillrunner-primary",
          providerOptions: {
            engine: "gemini",
            provider_id: "google",
            model: "gemini-2.5-pro",
          },
        },
        candidateBackends: registry.backends,
      });

      assert.notInclude(
        descriptor.providerSchemaEntries.map((entry) => entry.key),
        "provider_id",
      );
      assert.equal(descriptor.providerOptions.provider_id, "google");
      assert.notProperty(descriptor.providerOptions, "effort");
      assert.equal(
        descriptor.providerSchemaEntries.find((entry) => entry.key === "effort")
          ?.defaultValue,
        "default",
      );
    },
  );

  itNodeOnly(
    "normalizes legacy model@effort for single-provider engines",
    async function () {
      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-primary",
        providerOptions: {
          engine: "codex",
          model: "gpt-5.2@high",
        },
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-explainer",
      );
      assert.isOk(workflow);

      const context = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.equal(context.providerOptions.engine, "codex");
      assert.equal(context.providerOptions.provider_id, "openai");
      assert.equal(context.providerOptions.model, "gpt-5.2");
      assert.equal(context.providerOptions.effort, "high");
    },
  );

  itNodeOnly(
    "returns persisted snapshot when settings page opens",
    async function () {
      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-primary",
        workflowParams: { language: "zh-CN" },
        providerOptions: {
          engine: "gemini",
          model: "",
          no_cache: false,
        },
      });

      const defaults = resetRunOnceOverridesForSettingsOpen(
        "literature-explainer",
      );
      assert.equal(defaults.backendId, "skillrunner-primary");
      assert.equal(defaults.workflowParams?.language, "zh-CN");
      assert.equal(defaults.providerOptions?.model, "");
      assert.equal(defaults.providerOptions?.no_cache, false);

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-explainer",
      );
      assert.isOk(workflow);

      const context = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.equal(context.backend.id, "skillrunner-primary");
      assert.equal(context.workflowParams.language, "zh-CN");
      assert.equal(context.providerOptions.model, "");
      assert.isUndefined(context.providerOptions.no_cache);
    },
  );

  itNodeOnly(
    "filters workflow parameter descriptors with visible_if boolean conditions",
    async function () {
      const workflow = {
        manifest: {
          id: "visible-if-workflow",
          label: "Visible If Workflow",
          provider: "pass-through",
          parameters: {
            auto_tag_regulator: {
              type: "boolean",
              default: false,
            },
            auto_tag_infer_tag: {
              type: "boolean",
              default: true,
              visible_if: {
                parameter: "auto_tag_regulator",
                equals: true,
              },
            },
          },
          hooks: {
            applyResult: "hooks/applyResult.js",
          },
        },
        hooks: {
          applyResult: async () => ({ ok: true }),
        },
      } as any;

      const disabled = await buildWorkflowSettingsUiDescriptor({
        workflow,
        candidateBackends: [],
        draft: {
          workflowParams: {
            auto_tag_regulator: false,
          },
        },
      });
      assert.deepEqual(
        disabled.workflowSchemaEntries.map((entry) => entry.key),
        ["auto_tag_regulator"],
      );

      const enabled = await buildWorkflowSettingsUiDescriptor({
        workflow,
        candidateBackends: [],
        draft: {
          workflowParams: {
            auto_tag_regulator: true,
          },
        },
      });
      assert.deepEqual(
        enabled.workflowSchemaEntries.map((entry) => entry.key),
        ["auto_tag_regulator", "auto_tag_infer_tag"],
      );
    },
  );

  itNodeOnly(
    "lists ACP and SkillRunner backends as compatible profiles for skillrunner sequence workflows",
    async function () {
      Zotero.Prefs.set(
        backendsConfigPrefKey,
        JSON.stringify({
          schemaVersion: 2,
          backends: [
            {
              id: "skillrunner-primary",
              displayName: "skillrunner-primary",
              type: "skillrunner",
              baseUrl: "http://127.0.0.1:8030",
              auth: { kind: "none" },
            },
            {
              id: "skillrunner-alt",
              displayName: "skillrunner-alt",
              type: "skillrunner",
              baseUrl: "http://127.0.0.1:18030",
              auth: { kind: "none" },
            },
            {
              id: "generic-http-local",
              displayName: "generic-http-local",
              type: "generic-http",
              baseUrl: "http://127.0.0.1:8030",
              auth: { kind: "none" },
            },
            {
              id: "acp-opencode",
              displayName: "OpenCode ACP",
              type: "acp",
              baseUrl: "local://acp-opencode",
              command: "opencode",
              args: ["acp"],
            },
          ],
        }),
        true,
      );

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow);

      const registry = await loadBackendsRegistry();
      assert.isUndefined(registry.fatalError);

      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        candidateBackends: registry.backends,
      });

      const profileIds = descriptor.profiles.map((entry) => entry.id).sort();
      assert.includeMembers(profileIds, [
        "acp-opencode",
        "skillrunner-alt",
        "skillrunner-primary",
      ]);
      assert.isFalse(profileIds.includes("generic-http-local"));
    },
  );

  itNodeOnly(
    "resolves skillrunner sequence workflows to ACP provider when an ACP backend is selected",
    async function () {
      const acpBackend = {
        id: "acp-opencode",
        displayName: "OpenCode ACP",
        type: "acp",
        baseUrl: "local://acp-opencode",
        command: "opencode",
        args: ["acp"],
      };
      Zotero.Prefs.set(
        backendsConfigPrefKey,
        JSON.stringify({
          schemaVersion: 2,
          backends: [
            acpBackend,
            {
              id: "skillrunner-primary",
              displayName: "skillrunner-primary",
              type: "skillrunner",
              baseUrl: "http://127.0.0.1:8030",
              auth: { kind: "none" },
            },
          ].map((backend) =>
            backend.id === "acp-opencode"
              ? {
                  ...backend,
                  acp: {
                    connectionTest: {
                      status: "passed",
                      testedAt: "2026-04-29T00:00:00.000Z",
                      configFingerprint: computeAcpBackendConfigFingerprint(
                        backend as any,
                      ),
                    },
                    runtimeOptionsCache: {
                      refreshedAt: "2026-04-29T00:00:00.000Z",
                      modes: [{ id: "default", label: "Default" }],
                      currentModeId: "default",
                      rawModels: [{ id: "qwen3", label: "Qwen 3" }],
                      currentRawModelId: "qwen3",
                      displayModels: [{ id: "qwen3", label: "Qwen 3" }],
                      currentDisplayModelId: "qwen3",
                      reasoningEfforts: [{ id: "default", label: "Default" }],
                      currentReasoningEffortId: "default",
                    },
                  },
                }
              : backend,
          ),
        }),
        true,
      );
      updateWorkflowSettings("literature-analysis", {
        backendId: "acp-opencode",
        providerOptions: {},
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow);

      const context = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.equal(context.backend.id, "acp-opencode");
      assert.equal(context.backend.type, "acp");
      assert.equal(context.providerId, "acp");
      assert.equal(context.requestKind, "skillrunner.sequence.v1");
      // Nothing was selected, so no runtime option is sent and the backend
      // session keeps its own current values.
      assert.deepEqual(context.providerOptions, {});
    },
  );

  itNodeOnly(
    "resolves skillrunner sequence workflows to SkillRunner provider when a SkillRunner backend is selected",
    async function () {
      updateWorkflowSettings("literature-analysis", {
        backendId: "skillrunner-primary",
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow);

      const context = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.equal(context.backend.id, "skillrunner-primary");
      assert.equal(context.backend.type, "skillrunner");
      assert.equal(context.providerId, "skillrunner");
      assert.equal(context.requestKind, "skillrunner.sequence.v1");
    },
  );

  itNodeOnly(
    "keeps ACP normal models selectable and disables reasoning dropdown when unsupported",
    async function () {
      const acpBackend = {
        id: "acp-normal-models",
        displayName: "ACP Normal Models",
        type: "acp",
        baseUrl: "local://acp-normal-models",
        command: "npx",
        args: ["opencode-ai@latest", "acp"],
      };
      Zotero.Prefs.set(
        backendsConfigPrefKey,
        JSON.stringify({
          schemaVersion: 2,
          backends: [
            acpBackend,
            {
              id: "skillrunner-primary",
              displayName: "skillrunner-primary",
              type: "skillrunner",
              baseUrl: "http://127.0.0.1:8030",
              auth: { kind: "none" },
            },
          ].map((backend) =>
            backend.id === "acp-normal-models"
              ? {
                  ...backend,
                  acp: {
                    connectionTest: {
                      status: "passed",
                      testedAt: "2026-04-29T00:00:00.000Z",
                      configFingerprint: computeAcpBackendConfigFingerprint(
                        backend as any,
                      ),
                    },
                    runtimeOptionsCache: {
                      refreshedAt: "2026-04-29T00:00:00.000Z",
                      modes: [{ id: "default", label: "Default" }],
                      currentModeId: "default",
                      rawModels: [
                        { id: "sonnet", label: "Sonnet" },
                        { id: "opus", label: "Opus" },
                        { id: "gpt-5-high", label: "GPT 5 High" },
                        { id: "gpt-5-low", label: "GPT 5 Low" },
                      ],
                      currentRawModelId: "sonnet",
                      displayModels: [
                        { id: "sonnet", label: "Sonnet" },
                        { id: "opus", label: "Opus" },
                        { id: "gpt-5", label: "GPT 5" },
                      ],
                      currentDisplayModelId: "sonnet",
                      reasoningEfforts: [],
                      currentReasoningEffortId: "",
                    },
                  },
                }
              : backend,
          ),
        }),
        true,
      );
      updateWorkflowSettings("literature-analysis", {
        backendId: "acp-normal-models",
        providerOptions: {
          acpModelId: "opus",
        },
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow);

      const registry = await loadBackendsRegistry();
      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        candidateBackends: registry.backends,
      });
      const modelEntry = descriptor.providerSchemaEntries.find(
        (entry) => entry.key === "acpModelId",
      );
      const providerEntry = descriptor.providerSchemaEntries.find(
        (entry) => entry.key === "acpModelProvider",
      );
      const effortEntry = descriptor.providerSchemaEntries.find(
        (entry) => entry.key === "acpReasoningEffort",
      );
      const autoApprovePermissionsEntry = descriptor.providerSchemaEntries.find(
        (entry) => entry.key === "autoApproveAcpPermissions",
      );

      assert.isUndefined(providerEntry);
      assert.deepEqual(modelEntry?.enumValues, [
        "sonnet",
        "opus",
        "gpt-5-high",
        "gpt-5-low",
      ]);
      assert.equal(descriptor.providerOptions.acpModelId, "opus");
      assert.deepEqual(effortEntry?.enumValues, []);
      assert.isTrue(effortEntry?.disabled);
      assert.equal(autoApprovePermissionsEntry?.type, "boolean");
      assert.isFalse(autoApprovePermissionsEntry?.defaultValue as boolean);

      const context = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.deepEqual(context.providerOptions, { acpModelId: "opus" });
    },
  );

  itNodeOnly(
    "exposes ACP settings options from configOptions-derived runtime cache",
    async function () {
      const acpBackend = {
        id: "acp-config-options",
        displayName: "ACP Config Options",
        type: "acp",
        baseUrl: "local://acp-config-options",
        command: "npx",
        args: ["opencode-ai@latest", "acp"],
      };
      Zotero.Prefs.set(
        backendsConfigPrefKey,
        JSON.stringify({
          schemaVersion: 2,
          backends: [
            {
              ...acpBackend,
              acp: {
                connectionTest: {
                  status: "passed",
                  testedAt: "2026-04-29T00:00:00.000Z",
                  configFingerprint: computeAcpBackendConfigFingerprint(
                    acpBackend as any,
                  ),
                },
                runtimeOptionsCache: buildAcpRuntimeOptionsCache({
                  configOptions: [
                    {
                      id: "mode",
                      name: "Mode",
                      category: "mode",
                      type: "select",
                      currentValue: "ask",
                      options: [
                        { value: "ask", name: "Ask" },
                        { value: "build", name: "Build" },
                      ],
                    },
                    {
                      id: "model",
                      name: "Model",
                      category: "model",
                      type: "select",
                      currentValue: "anthropic/claude",
                      options: [
                        { value: "openai/gpt-5", name: "GPT-5" },
                        { value: "anthropic/claude", name: "Claude" },
                        { value: "local-model", name: "Local Model" },
                      ],
                    },
                    {
                      id: "effort",
                      name: "Reasoning",
                      category: "thought_level",
                      type: "select",
                      currentValue: "high",
                      options: [
                        { value: "low", name: "Low" },
                        { value: "high", name: "High" },
                      ],
                    },
                  ],
                  refreshedAt: new Date().toISOString(),
                }),
              },
            },
          ],
        }),
        true,
      );
      updateWorkflowSettings("literature-analysis", {
        backendId: "acp-config-options",
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow);

      const registry = await loadBackendsRegistry();
      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        candidateBackends: registry.backends,
      });
      const modeEntry = descriptor.providerSchemaEntries.find(
        (entry) => entry.key === "acpModeId",
      );
      const modelEntry = descriptor.providerSchemaEntries.find(
        (entry) => entry.key === "acpModelId",
      );
      const providerEntry = descriptor.providerSchemaEntries.find(
        (entry) => entry.key === "acpModelProvider",
      );
      const effortEntry = descriptor.providerSchemaEntries.find(
        (entry) => entry.key === "acpReasoningEffort",
      );

      assert.deepEqual(modeEntry?.enumValues, ["ask", "build"]);
      assert.deepEqual(providerEntry?.enumValues, [
        "openai",
        "anthropic",
        "Unscoped",
      ]);
      // Nothing selected yet, so the model list follows the backend current
      // model provider and stays on raw identifiers.
      assert.deepEqual(modelEntry?.enumValues, ["anthropic/claude"]);
      assert.deepEqual(effortEntry?.enumValues, ["low", "high"]);
      assert.isFalse(effortEntry?.disabled);
      assert.deepEqual(descriptor.providerOptions, {});

      const defaultContext = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.deepEqual(defaultContext.providerOptions, {});

      updateWorkflowSettings("literature-analysis", {
        backendId: "acp-config-options",
        providerOptions: {
          acpModelProvider: "anthropic",
          acpModelId: "anthropic/claude",
          acpReasoningEffort: "low",
        },
      });

      const lowEffortDescriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        candidateBackends: registry.backends,
      });
      assert.deepEqual(lowEffortDescriptor.providerOptions, {
        acpModelProvider: "anthropic",
        acpModelId: "anthropic/claude",
        acpReasoningEffort: "low",
      });

      const lowEffortContext = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.deepEqual(lowEffortContext.providerOptions, {
        acpModelId: "anthropic/claude",
        acpReasoningEffort: "low",
      });

      updateWorkflowSettings("literature-analysis", {
        backendId: "acp-config-options",
        providerOptions: {
          acpModelProvider: "openai",
          acpModelId: "openai/gpt-5",
          acpReasoningEffort: null,
        },
      });

      const openaiDescriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        candidateBackends: registry.backends,
      });
      const openaiModelEntry = openaiDescriptor.providerSchemaEntries.find(
        (entry) => entry.key === "acpModelId",
      );
      assert.deepEqual(openaiModelEntry?.enumValues, ["openai/gpt-5"]);
      assert.deepEqual(openaiDescriptor.providerOptions, {
        acpModelProvider: "openai",
        acpModelId: "openai/gpt-5",
      });

      const openaiContext = await resolveWorkflowExecutionContext({
        workflow: workflow!,
        executionOptionsOverride: {
          providerOptionsMode: "replace",
          providerOptions: { acpModelId: "openai/gpt-5" },
        },
      });
      assert.deepEqual(openaiContext.providerOptions, {
        acpModelId: "openai/gpt-5",
      });
      assert.notProperty(openaiContext.providerOptions, "acpModelProvider");

      updateWorkflowSettings("literature-analysis", {
        backendId: "acp-config-options",
        providerOptions: {
          acpModelProvider: "Unscoped",
          acpModelId: "local-model",
        },
      });

      const unscopedDescriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        candidateBackends: registry.backends,
      });
      const unscopedModelEntry = unscopedDescriptor.providerSchemaEntries.find(
        (entry) => entry.key === "acpModelId",
      );
      assert.deepEqual(unscopedModelEntry?.enumValues, ["local-model"]);
      assert.deepEqual(unscopedDescriptor.providerOptions, {
        acpModelProvider: "Unscoped",
        acpModelId: "local-model",
      });

      const unscopedContext = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.equal(unscopedContext.providerOptions.acpModelId, "local-model");
      assert.notProperty(unscopedContext.providerOptions, "acpModelProvider");
    },
  );

  itNodeOnly(
    "drops incompatible persisted backendId when provider mismatches",
    async function () {
      updateWorkflowSettings("literature-analysis", {
        backendId: "generic-http-local",
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow);

      const registry = await loadBackendsRegistry();
      assert.isUndefined(registry.fatalError);

      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        candidateBackends: registry.backends,
      });

      assert.notEqual(descriptor.selectedProfile, "generic-http-local");
      if (descriptor.profiles.length === 1) {
        assert.equal(descriptor.selectedProfile, descriptor.profiles[0].id);
      }
      assert.isFalse(
        descriptor.profiles.some((entry) => entry.id === "generic-http-local"),
      );
    },
  );

  itNodeOnly(
    "falls back from incompatible persisted backendId but keeps explicit override strict",
    async function () {
      updateWorkflowSettings("literature-analysis", {
        backendId: "generic-http-local",
      });

      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "literature-analysis",
      );
      assert.isOk(workflow);

      const context = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.equal(context.backend.id, "skillrunner-primary");

      try {
        await resolveWorkflowExecutionContext({
          workflow: workflow!,
          executionOptionsOverride: {
            backendId: "generic-http-local",
          },
        });
        assert.fail("expected explicit incompatible backend override to fail");
      } catch (error) {
        assert.match(String(error), /Unknown or incompatible backendId/);
      }
    },
  );

  itNodeOnly(
    "uses latest persisted values for settings defaults after persistent update",
    function () {
      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-primary",
        workflowParams: { language: "zh-CN" },
        providerOptions: {
          engine: "gemini",
          model: "",
          no_cache: false,
        },
      });
      const first = resetRunOnceOverridesForSettingsOpen(
        "literature-explainer",
      );
      assert.equal(first.workflowParams?.language, "zh-CN");

      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-alt",
        workflowParams: { language: "en-US" },
        providerOptions: {
          engine: "gemini",
          model: "gemini-2.5-flash",
          no_cache: true,
        },
      });
      const second = resetRunOnceOverridesForSettingsOpen(
        "literature-explainer",
      );
      assert.equal(second.backendId, "skillrunner-alt");
      assert.equal(second.workflowParams?.language, "en-US");
      assert.equal(second.providerOptions?.model, "gemini-2.5-flash");
      assert.equal(second.providerOptions?.no_cache, true);
    },
  );

  it("resolves local pass-through execution context without backend profile", async function () {
    this.timeout(5000);

    const root = await mkTempDir("zotero-skills-pass-through");
    const workflowRoot = joinPath(root, "pass-through-minimal");
    await writeUtf8(
      joinPath(workflowRoot, "workflow.json"),
      JSON.stringify(
        {
          schemaVersion: 2,
          id: "pass-through-minimal",
          label: "Pass Through Minimal",
          provider: "pass-through",
          trigger: { requiresSelection: true },
          inputs: {
            member: { kind: "parent" },
            grouping: { mode: "each" },
          },
          validateSelection: {
            select: { policy: "input-member", source: "selected" },
            filters: [],
          },
          hooks: {
            applyResult: "hooks/applyResult.js",
          },
        },
        null,
        2,
      ),
    );
    await writeUtf8(
      joinPath(workflowRoot, "hooks", "applyResult.js"),
      "export async function applyResult(){ return { ok: true }; }",
    );

    const loaded = await loadWorkflowManifests(root);
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "pass-through-minimal",
    );
    assert.isOk(workflow);

    const context = await resolveWorkflowExecutionContext({
      workflow: workflow!,
    });
    assert.equal(context.providerId, "pass-through");
    assert.equal(context.backend.type, "pass-through");
    assert.equal(context.requestKind, "pass-through.run.v1");

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Pass Through Parent" },
    });
    const selectionContext = await buildSelectionContext([parent]);
    const requests = (await executeBuildRequests({
      workflow: workflow!,
      selectionContext,
      executionOptions: {
        workflowParams: { hello: "world" },
      },
    })) as Array<{
      kind: string;
      selectionContext?: unknown;
      parameter?: Record<string, unknown>;
    }>;
    assert.lengthOf(requests, 1);
    assert.equal(requests[0].kind, "pass-through.run.v1");
    assert.isObject(requests[0].selectionContext);
    assert.deepEqual(requests[0].parameter, { hello: "world" });
  });

  itZoteroFullOrNode(
    "does not load deprecated reference workflows as active built-ins",
    async function () {
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflowIds = loaded.workflows.map((entry) => entry.manifest.id);
      assert.notInclude(workflowIds, "reference-matching");
      assert.notInclude(workflowIds, "reference-note-editor");
    },
  );

  itNodeOnly(
    "persists workflow params for pass-through workflows without requiring backend profile",
    async function () {
      this.timeout(5000);

      const root = await mkTempDir("zotero-skills-pass-through-settings");
      const workflowRoot = joinPath(root, "pass-through-settings");
      await writeUtf8(
        joinPath(workflowRoot, "workflow.json"),
        JSON.stringify(
          {
            schemaVersion: 2,
            id: "pass-through-settings",
            label: "Pass Through Settings",
            provider: "pass-through",
            trigger: { requiresSelection: true },
            inputs: {
              member: { kind: "parent" },
              grouping: { mode: "each" },
            },
            validateSelection: {
              select: { policy: "input-member", source: "selected" },
              filters: [],
            },
            parameters: {
              github_owner: { type: "string", default: "" },
              github_repo: { type: "string", default: "" },
              file_path: { type: "string", default: "" },
              github_token: { type: "string", default: "" },
            },
            hooks: {
              applyResult: "hooks/applyResult.js",
            },
          },
          null,
          2,
        ),
      );
      await writeUtf8(
        joinPath(workflowRoot, "hooks", "applyResult.js"),
        "export async function applyResult(){ return { ok: true }; }",
      );

      updateWorkflowSettings("pass-through-settings", {
        workflowParams: {
          github_owner: "demo-owner",
          github_repo: "Zotero_TagVocab",
          file_path: "tags/tags.json",
          github_token: "secret-token",
        },
      });

      const loaded = await loadWorkflowManifests(root);
      const workflow = loaded.workflows.find(
        (entry) => entry.manifest.id === "pass-through-settings",
      );
      assert.isOk(workflow);

      const descriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        autoSelectFallbackProfile: true,
      });

      assert.equal(descriptor.providerId, "pass-through");
      assert.equal(descriptor.requiresBackendProfile, false);
      assert.equal(descriptor.selectedProfile, "");
      assert.equal(descriptor.workflowParams.github_owner, "demo-owner");
      assert.equal(descriptor.workflowParams.github_repo, "Zotero_TagVocab");
      assert.equal(descriptor.workflowParams.file_path, "tags/tags.json");
      assert.equal(descriptor.workflowParams.github_token, "secret-token");
    },
  );
});

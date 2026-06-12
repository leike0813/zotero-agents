import { assert } from "chai";
import { config } from "../../package.json";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { rescanWorkflowRegistry } from "../../src/modules/workflowRuntime";
import {
  clearSkillRunnerModelCache,
  upsertSkillRunnerModelCacheEntry,
} from "../../src/providers/skillrunner/modelCache";
import {
  buildWorkflowSettingsUiDescriptor,
  clearWorkflowSettings,
  resolveWorkflowExecutionContext,
  resetRunOnceOverridesForSettingsOpen,
  updateWorkflowSettings,
} from "../../src/modules/workflowSettings";
import { loadBackendsRegistry } from "../../src/backends/registry";
import {
  buildAcpRuntimeOptionsCache,
  computeAcpBackendConfigFingerprint,
} from "../../src/modules/acpBackendProbe";
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

const itNodeOnly = isZoteroRuntime() ? it.skip : it;
const itZoteroFullOrNode =
  isZoteroRuntime() && !isFullTestMode() ? it.skip : it;

async function ensureWorkflowRegistryLoaded() {
  await rescanWorkflowRegistry({ workflowsDir: workflowsPath() });
}

describe("workflow settings execution", function () {
  const backendsConfigPrefKey = `${config.prefsPrefix}.backendsConfigJson`;
  const workflowSettingsPrefKey = `${config.prefsPrefix}.workflowSettingsJson`;
  let prevBackendsConfigPref: unknown;
  let prevWorkflowSettingsPref: unknown;

  beforeEach(function () {
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
      updateWorkflowSettings("literature-explainer", {
        backendId: "skillrunner-alt",
        providerOptions: {
          engine: "gemini",
          no_cache: true,
          interactive_auto_reply: true,
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
      assert.equal(context.providerOptions.interactive_auto_reply, true);
      assert.equal(context.providerOptions.hard_timeout_seconds, 900);
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
      assert.equal(descriptor.providerOptions.effort, "default");
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
      assert.equal(descriptor.providerOptions.effort, "default");
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
    "lists only ACP backends as compatible profiles for skillrunner sequence workflows",
    async function () {
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
      assert.includeMembers(profileIds, ["acp-opencode"]);
      assert.isFalse(profileIds.includes("skillrunner-alt"));
      assert.isFalse(profileIds.includes("skillrunner-primary"));
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
        providerOptions: {
          engine: "gemini",
          model: "gemini-2.5-flash",
        },
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
      assert.deepEqual(context.providerOptions, {
        acpModeId: "default",
        acpModelId: "qwen3",
        acpReasoningEffort: "default",
      });
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
      assert.deepEqual(modelEntry?.enumValues, ["sonnet", "opus", "gpt-5"]);
      assert.equal(descriptor.providerOptions.acpModelId, "opus");
      assert.deepEqual(effortEntry?.enumValues, ["default"]);
      assert.isTrue(effortEntry?.disabled);
      assert.equal(autoApprovePermissionsEntry?.type, "boolean");
      assert.isFalse(autoApprovePermissionsEntry?.defaultValue as boolean);

      const context = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.deepEqual(context.providerOptions, {
        acpModeId: "default",
        acpModelId: "opus",
      });
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
                  refreshedAt: "2026-04-29T00:00:00.000Z",
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
      assert.deepEqual(modelEntry?.enumValues, ["claude"]);
      assert.deepEqual(effortEntry?.enumValues, ["low", "high"]);
      assert.isFalse(effortEntry?.disabled);
      assert.deepEqual(descriptor.providerOptions, {
        acpModeId: "ask",
        acpModelProvider: "anthropic",
        acpModelId: "claude",
        acpReasoningEffort: "high",
      });

      const defaultContext = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.deepEqual(defaultContext.providerOptions, {
        acpModeId: "ask",
        acpModelId: "anthropic/claude",
        acpReasoningEffort: "high",
      });

      updateWorkflowSettings("literature-analysis", {
        backendId: "acp-config-options",
        providerOptions: {
          acpModelProvider: "openai",
          acpModelId: "gpt-5",
          acpReasoningEffort: "high",
        },
      });

      const openaiDescriptor = await buildWorkflowSettingsUiDescriptor({
        workflow: workflow!,
        candidateBackends: registry.backends,
      });
      const openaiModelEntry = openaiDescriptor.providerSchemaEntries.find(
        (entry) => entry.key === "acpModelId",
      );
      assert.deepEqual(openaiModelEntry?.enumValues, ["gpt-5"]);
      assert.deepEqual(openaiDescriptor.providerOptions, {
        acpModeId: "ask",
        acpModelProvider: "openai",
        acpModelId: "gpt-5",
        acpReasoningEffort: "high",
      });

      const openaiContext = await resolveWorkflowExecutionContext({
        workflow: workflow!,
      });
      assert.deepEqual(openaiContext.providerOptions, {
        acpModeId: "ask",
        acpModelId: "openai/gpt-5",
        acpReasoningEffort: "high",
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
        acpModeId: "ask",
        acpModelProvider: "Unscoped",
        acpModelId: "local-model",
        acpReasoningEffort: "high",
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
    const root = await mkTempDir("zotero-skills-pass-through");
    const workflowRoot = joinPath(root, "pass-through-minimal");
    await writeUtf8(
      joinPath(workflowRoot, "workflow.json"),
      JSON.stringify(
        {
          id: "pass-through-minimal",
          label: "Pass Through Minimal",
          provider: "pass-through",
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
      await ensureWorkflowRegistryLoaded();
      const loaded = await loadWorkflowManifests(workflowsPath());
      const workflowIds = loaded.workflows.map((entry) => entry.manifest.id);
      assert.notInclude(workflowIds, "reference-matching");
      assert.notInclude(workflowIds, "reference-note-editor");
    },
  );

  itNodeOnly(
    "persists workflow params for pass-through workflows without requiring backend profile",
    async function () {
      const root = await mkTempDir("zotero-skills-pass-through-settings");
      const workflowRoot = joinPath(root, "pass-through-settings");
      await writeUtf8(
        joinPath(workflowRoot, "workflow.json"),
        JSON.stringify(
          {
            id: "pass-through-settings",
            label: "Pass Through Settings",
            provider: "pass-through",
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

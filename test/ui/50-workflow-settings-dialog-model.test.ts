import { assert } from "chai";
import { readFile } from "node:fs/promises";
import {
  buildWorkflowSettingsDialogDraft,
  buildWorkflowSettingsDialogRenderModel,
  collectSchemaValues,
  resolveProviderSchemaEntries,
} from "../../src/modules/workflowSettingsDialogModel";
import {
  clearSkillRunnerModelCache,
  upsertSkillRunnerModelCacheEntry,
} from "../../src/providers/skillrunner/modelCache";
import { config } from "../../package.json";
import { isZoteroRuntime } from "./workflow-test-utils";

const itNodeOnly = isZoteroRuntime() ? it.skip : it;

type FakeControl = {
  getAttribute: (name: string) => string | null;
  value?: string;
  type?: string;
  checked?: boolean;
};

function makeControl(
  attrs: Record<string, string>,
  extras?: Partial<Pick<FakeControl, "value" | "type" | "checked">>,
): FakeControl {
  return {
    getAttribute: (name: string) => attrs[name] ?? null,
    value: extras?.value,
    type: extras?.type,
    checked: extras?.checked,
  };
}

function makeContainer(controls: FakeControl[]): HTMLElement {
  return {
    querySelectorAll: () => controls as unknown as NodeListOf<Element>,
  } as unknown as HTMLElement;
}

describe("workflow settings dialog model", function () {
  const cachePrefKey = `${config.prefsPrefix}.skillRunnerModelCacheJson`;
  let previousPref: unknown;

  beforeEach(function () {
    previousPref = Zotero.Prefs.get(cachePrefKey, true);
    clearSkillRunnerModelCache();
  });

  afterEach(function () {
    if (typeof previousPref === "undefined") {
      Zotero.Prefs.clear(cachePrefKey, true);
    } else {
      Zotero.Prefs.set(cachePrefKey, previousPref, true);
    }
  });

  itNodeOnly("builds deterministic render model without mutating initial state", function () {
    const initialState = {
      selectedProfile: "skillrunner-default",
      persistedWorkflowParams: { bbtPort: 23124, mode: "strict" },
      persistedProviderOptions: { engine: "openai", model: "gpt-4.1" },
      runOnceWorkflowParams: { bbtPort: 23124, mode: "strict" },
      runOnceProviderOptions: { engine: "openai", model: "gpt-4.1" },
    };
    const profileItems = [
      { id: "skillrunner-default", label: "skillrunner-default (http://127.0.0.1:8030)" },
      { id: "skillrunner-alt", label: "skillrunner-alt (http://127.0.0.1:8031)" },
    ];
    const parameters = {
      bbtPort: {
        type: "number" as const,
        title: "BBT HTTP Port",
        default: 23124,
      },
      mode: {
        type: "string" as const,
        title: "Matching Mode",
        enum: ["strict", "fuzzy"],
        allowCustom: true,
        default: "strict",
      },
    };

    const a = buildWorkflowSettingsDialogRenderModel({
      providerId: "skillrunner",
      profileItems,
      initialState,
      workflowParameters: parameters,
    });
    const b = buildWorkflowSettingsDialogRenderModel({
      providerId: "skillrunner",
      profileItems,
      initialState,
      workflowParameters: parameters,
    });

    assert.deepEqual(a, b);

    (a.persistedWorkflowParams as Record<string, unknown>).bbtPort = 99999;
    assert.equal(
      (initialState.persistedWorkflowParams as Record<string, unknown>).bbtPort,
      23124,
    );

    const c = buildWorkflowSettingsDialogRenderModel({
      providerId: "skillrunner",
      profileItems,
      initialState,
      workflowParameters: parameters,
    });
    assert.equal(
      (c.persistedWorkflowParams as Record<string, unknown>).bbtPort,
      23124,
    );
    const modeEntry = c.workflowSchemaEntries.find((entry) => entry.key === "mode");
    assert.isOk(modeEntry);
    assert.equal(modeEntry?.allowCustom, true);
    assert.deepEqual(modeEntry?.enumValues || [], ["strict", "fuzzy"]);
  });

  itNodeOnly("collects schema values with correct coercion", function () {
    const controls: FakeControl[] = [
      makeControl(
        {
          "data-zs-option-key": "template",
          "data-zs-option-type": "string",
        },
        { value: "auth.lower + '_' + year" },
      ),
      makeControl(
        {
          "data-zs-option-key": "port",
          "data-zs-option-type": "number",
        },
        { value: "23124" },
      ),
      makeControl(
        {
          "data-zs-option-key": "enabled",
          "data-zs-option-type": "boolean",
        },
        { type: "checkbox", checked: true },
      ),
      makeControl(
        {
          "data-zs-option-key": "engine",
          "data-zs-option-type": "string",
          "data-zs-choice-control": "1",
          "data-zs-choice-value": "openai",
        },
        {},
      ),
      makeControl(
        {
          "data-zs-option-key": "emptyValue",
          "data-zs-option-type": "string",
        },
        { value: "" },
      ),
    ];

    const result = collectSchemaValues(makeContainer(controls));
    assert.deepEqual(result, {
      template: "auth.lower + '_' + year",
      port: 23124,
      enabled: true,
      engine: "openai",
    });
  });

  itNodeOnly("builds centralized drafts for persistent and run-once payloads", function () {
    const persistedWorkflow = makeContainer([
      makeControl(
        {
          "data-zs-option-key": "bbtPort",
          "data-zs-option-type": "number",
        },
        { value: "23124" },
      ),
    ]);
    const persistedProvider = makeContainer([
      makeControl(
        {
          "data-zs-option-key": "engine",
          "data-zs-option-type": "string",
          "data-zs-choice-control": "1",
          "data-zs-choice-value": "openai",
        },
        {},
      ),
    ]);
    const onceWorkflow = makeContainer([
      makeControl(
        {
          "data-zs-option-key": "bbtPort",
          "data-zs-option-type": "number",
        },
        { value: "25000" },
      ),
    ]);
    const onceProvider = makeContainer([
      makeControl(
        {
          "data-zs-option-key": "model",
          "data-zs-option-type": "string",
        },
        { value: "gpt-4.1-mini" },
      ),
    ]);

    const draft = buildWorkflowSettingsDialogDraft({
      persistedProfile: "skillrunner-default",
      onceProfile: "",
      persistedWorkflowFields: persistedWorkflow,
      persistedProviderFields: persistedProvider,
      onceWorkflowFields: onceWorkflow,
      onceProviderFields: onceProvider,
    });

    assert.deepEqual(draft, {
      persistent: {
        backendId: "skillrunner-default",
        workflowParams: { bbtPort: 23124 },
        providerOptions: { engine: "openai" },
      },
      runOnce: {
        backendId: undefined,
        workflowParams: { bbtPort: 25000 },
        providerOptions: { model: "gpt-4.1-mini" },
      },
    });
  });

  itNodeOnly("collects editable enum value from custom input as final payload", function () {
    const controls: FakeControl[] = [
      makeControl(
        {
          "data-zs-choice-control": "1",
          "data-zs-choice-value": "en-US",
        },
        {},
      ),
      makeControl(
        {
          "data-zs-option-key": "language",
          "data-zs-option-type": "string",
        },
        { value: "fr-FR" },
      ),
    ];

    const result = collectSchemaValues(makeContainer(controls));
    assert.deepEqual(result, {
      language: "fr-FR",
    });
  });

  itNodeOnly("collects opencode provider_id and model from choice controls", function () {
    const controls: FakeControl[] = [
      makeControl(
        {
          "data-zs-option-key": "engine",
          "data-zs-option-type": "string",
          "data-zs-choice-control": "1",
          "data-zs-choice-value": "opencode",
        },
        {},
      ),
      makeControl(
        {
          "data-zs-option-key": "provider_id",
          "data-zs-option-type": "string",
          "data-zs-choice-control": "1",
          "data-zs-choice-value": "openai",
        },
        {},
      ),
      makeControl(
        {
          "data-zs-option-key": "model",
          "data-zs-option-type": "string",
          "data-zs-choice-control": "1",
          "data-zs-choice-value": "gpt-5",
        },
        {},
      ),
      makeControl(
        {
          "data-zs-option-key": "effort",
          "data-zs-option-type": "string",
          "data-zs-choice-control": "1",
          "data-zs-choice-value": "high",
        },
        {},
      ),
    ];

    const result = collectSchemaValues(makeContainer(controls));
    assert.deepEqual(result, {
      engine: "opencode",
      provider_id: "openai",
      model: "gpt-5",
      effort: "high",
    });
  });

  it("keeps provider_id field for provider-scoped qwen engine and hides it for gemini", function () {
    upsertSkillRunnerModelCacheEntry({
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
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
        ],
      },
    });

    const backend = {
      id: "skillrunner-local",
      type: "skillrunner",
      baseUrl: "http://127.0.0.1:8030",
      auth: { kind: "none" },
    } as const;

    const qwenEntries = resolveProviderSchemaEntries({
      providerId: "skillrunner",
      currentValues: { engine: "qwen", provider_id: "dashscope" },
      backend,
    });
    assert.includeMembers(
      qwenEntries.map((entry) => entry.key),
      ["provider_id", "model", "effort"],
    );
    const qwenEffort = qwenEntries.find((entry) => entry.key === "effort");
    assert.deepEqual(qwenEffort?.enumValues || [], ["default"]);
    assert.equal(qwenEffort?.disabled, true);

    const geminiEntries = resolveProviderSchemaEntries({
      providerId: "skillrunner",
      currentValues: {
        engine: "gemini",
        provider_id: "google",
        model: "gemini-2.5-pro",
      },
      backend,
    });
    assert.notInclude(
      geminiEntries.map((entry) => entry.key),
      "provider_id",
    );
    const geminiEffort = geminiEntries.find((entry) => entry.key === "effort");
    assert.deepEqual(geminiEffort?.enumValues || [], ["default"]);
    assert.equal(geminiEffort?.disabled, true);
  });

  it("enables effort choices for codex models that advertise supported_effort", function () {
    const entries = resolveProviderSchemaEntries({
      providerId: "skillrunner",
      currentValues: {
        engine: "codex",
        model: "gpt-5.2",
        effort: "high",
      },
    });

    const effort = entries.find((entry) => entry.key === "effort");
    assert.deepEqual(effort?.enumValues || [], [
      "default",
      "low",
      "medium",
      "high",
      "xhigh",
    ]);
    assert.equal(effort?.disabled, false);
  });

  it("splits ACP provider-scoped model choices for dialog schema entries", function () {
    const backend = {
      id: "acp-local",
      type: "acp",
      baseUrl: "local://acp-local",
      acp: {
        runtimeOptionsCache: {
          refreshedAt: "2026-06-11T00:00:00.000Z",
          modes: [{ id: "ask", label: "Ask" }],
          currentModeId: "ask",
          rawModels: [
            { id: "openai/gpt-5", label: "GPT-5" },
            { id: "anthropic/claude", label: "Claude" },
            { id: "google:gemini", label: "Gemini" },
            { id: "gateway/openai:gpt-4.1", label: "GPT-4.1" },
            { id: "local-model", label: "Local Model" },
          ],
          currentRawModelId: "anthropic/claude",
          displayModels: [
            { id: "openai/gpt-5", label: "GPT-5" },
            { id: "anthropic/claude", label: "Claude" },
            { id: "google:gemini", label: "Gemini" },
            { id: "gateway/openai:gpt-4.1", label: "GPT-4.1" },
            { id: "local-model", label: "Local Model" },
          ],
          currentDisplayModelId: "anthropic/claude",
          reasoningEfforts: [{ id: "default", label: "Default" }],
          currentReasoningEffortId: "default",
        },
      },
    } as const;

    const anthropicEntries = resolveProviderSchemaEntries({
      providerId: "acp",
      backend,
      currentValues: { acpModelId: "anthropic/claude" },
    });
    const providerEntry = anthropicEntries.find(
      (entry) => entry.key === "acpModelProvider",
    );
    const modelEntry = anthropicEntries.find(
      (entry) => entry.key === "acpModelId",
    );
    assert.deepEqual(providerEntry?.enumValues || [], [
      "openai",
      "anthropic",
      "google",
      "gateway/openai",
      "Unscoped",
    ]);
    assert.equal(providerEntry?.defaultValue, "anthropic");
    assert.deepEqual(modelEntry?.enumValues || [], ["claude"]);
    assert.equal(modelEntry?.defaultValue, "claude");

    const openaiEntries = resolveProviderSchemaEntries({
      providerId: "acp",
      backend,
      currentValues: { acpModelProvider: "openai", acpModelId: "gpt-5" },
    });
    assert.deepEqual(
      openaiEntries.find((entry) => entry.key === "acpModelId")?.enumValues ||
        [],
      ["gpt-5"],
    );

    const colonEntries = resolveProviderSchemaEntries({
      providerId: "acp",
      backend,
      currentValues: { acpModelProvider: "google", acpModelId: "gemini" },
    });
    assert.deepEqual(
      colonEntries.find((entry) => entry.key === "acpModelId")?.enumValues ||
        [],
      ["gemini"],
    );

    const mixedSeparatorEntries = resolveProviderSchemaEntries({
      providerId: "acp",
      backend,
      currentValues: {
        acpModelProvider: "gateway/openai",
        acpModelId: "gpt-4.1",
      },
    });
    assert.deepEqual(
      mixedSeparatorEntries.find((entry) => entry.key === "acpModelId")
        ?.enumValues || [],
      ["gpt-4.1"],
    );

    const providerChangedEntries = resolveProviderSchemaEntries({
      providerId: "acp",
      backend,
      currentValues: { acpModelProvider: "openai", acpModelId: "claude" },
    });
    const providerChangedModel = providerChangedEntries.find(
      (entry) => entry.key === "acpModelId",
    );
    assert.deepEqual(providerChangedModel?.enumValues || [], ["gpt-5"]);
    assert.equal(providerChangedModel?.defaultValue, "gpt-5");

    const unscopedEntries = resolveProviderSchemaEntries({
      providerId: "acp",
      backend,
      currentValues: {
        acpModelProvider: "Unscoped",
        acpModelId: "local-model",
      },
    });
    assert.deepEqual(
      unscopedEntries.find((entry) => entry.key === "acpModelId")?.enumValues ||
        [],
      ["local-model"],
    );
  });

  itNodeOnly("renders ACP model choices with ordinary label truncation", async function () {
    const [
      customSelectJs,
      customSelectCss,
      dashboardApp,
      workflowDialogJs,
      workflowDialogCss,
      dashboardHtml,
      workflowDialogHtml,
      pluginDialogSource,
      webDialogSource,
    ] = await Promise.all([
      readFile("addon/content/components/custom-select.js", "utf8"),
      readFile("addon/content/components/custom-select.css", "utf8"),
      readFile("addon/content/dashboard/app.js", "utf8"),
      readFile("addon/content/dashboard/workflow-settings-dialog.js", "utf8"),
      readFile("addon/content/dashboard/workflow-settings-dialog.css", "utf8"),
      readFile("addon/content/dashboard/index.html", "utf8"),
      readFile("addon/content/dashboard/workflow-settings-dialog.html", "utf8"),
      readFile("src/modules/workflowSettingsDialog.ts", "utf8"),
      readFile("src/modules/workflowSettingsWebDialog.ts", "utf8"),
    ]);

    assert.include(customSelectJs, "custom-select-trigger-label");
    assert.include(customSelectCss, "flex: 1 1 auto");
    assert.notInclude(customSelectCss, ".custom-select.tail-preserve-select");
    assert.notInclude(customSelectCss, "direction: rtl");
    assert.notInclude(customSelectCss, "unicode-bidi: isolate");
    assert.notInclude(workflowDialogCss, ".custom-select.tail-preserve-select");
    assert.notInclude(workflowDialogCss, "direction: rtl");
    assert.notInclude(workflowDialogCss, "unicode-bidi: isolate");
    assert.include(
      dashboardHtml,
      "custom-select.css?ui=20260611-provider-split-v1",
    );
    assert.include(
      dashboardHtml,
      "custom-select.js?ui=20260611-provider-split-v1",
    );
    assert.include(
      workflowDialogHtml,
      "custom-select.css?ui=20260612-provider-split-v2",
    );
    assert.include(
      workflowDialogHtml,
      "custom-select.js?ui=20260612-provider-split-v2",
    );
    assert.include(
      workflowDialogHtml,
      "workflow-settings-dialog.js?ui=20260612-provider-split-v2",
    );
    assert.notInclude(dashboardApp, "tail-preserve-select");
    assert.notInclude(workflowDialogJs, "tail-preserve-select");
    assert.notInclude(pluginDialogSource, "applyTailPreservingChoiceStyle");
    assert.include(pluginDialogSource, "acpModelProvider");
    assert.include(
      webDialogSource,
      "workflow-settings-dialog.html?ui=20260612-provider-split-v2",
    );
  });
});

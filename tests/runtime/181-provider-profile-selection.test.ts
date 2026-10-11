import { assert } from "chai";
import { config } from "../../package.json";
import {
  listAcpModelOptionsForProvider,
  listAcpModelProviderOptions,
  buildAcpFoldedModelGroups,
  foldAcpModelOptions,
  normalizeAcpModelOption,
  normalizeAcpProviderModelOptionsForRuntime,
  parseAcpProviderModelId,
  projectAcpProviderModelOptionsForUi,
  resolveAcpRawModelIdForSelection,
  resolveAcpDisplayModelIdForProviderSelection,
} from "../../src/modules/acp/chat/acpModelOptionFolding";
import { buildAcpRuntimeOptionsStateFromConfigOptions } from "../../src/modules/acp/chat/acpSessionConfigOptions";
import { describeProviderProfile } from "../../src/providers/profile";
import {
  listBackendInstances,
  resetBackendsRegistryReadDiagnosticsForTests,
} from "../../src/backends/registry";

describe("provider profile ACP catalog projection", function () {
  const prefKey = `${config.prefsPrefix}.backendsConfigJson`;
  let previous: unknown;

  beforeEach(function () {
    previous = Zotero.Prefs.get(prefKey, true);
    resetBackendsRegistryReadDiagnosticsForTests();
  });

  afterEach(function () {
    if (typeof previous === "undefined") {
      Zotero.Prefs.clear(prefKey, true);
    } else {
      Zotero.Prefs.set(prefKey, previous, true);
    }
    resetBackendsRegistryReadDiagnosticsForTests();
  });

  it("parses scoped and opaque ACP ids without splitting nested model names", function () {
    assert.deepEqual(parseAcpProviderModelId("vendor/model/nested:v2"), {
      provider: "vendor",
      model: "model/nested:v2",
    });
    assert.deepEqual(
      parseAcpProviderModelId("m:minimax-coding-plan:MiniMax-M2.5:u"),
      { provider: "minimax-coding-plan", model: "MiniMax-M2.5" },
    );
    assert.deepEqual(
      parseAcpProviderModelId("m:MiniMax%20Coding%20Plan:MiniMax%3AM2%3A5:v:"),
      { provider: "MiniMax Coding Plan", model: "MiniMax:M2:5" },
    );
    assert.isNull(parseAcpProviderModelId("llama3:70b"));
    assert.deepEqual(
      parseAcpProviderModelId("llama3:70b", { providerId: "ollama" }),
      { provider: "ollama", model: "llama3:70b" },
    );
  });

  it("uses explicit provider metadata and keeps same-named models distinct", function () {
    const models = [
      {
        id: "m:minimax-coding-plan:MiniMax-M2.5:u",
        label: "MiniMax M2.5",
        providerId: "minimax-coding-plan",
        providerLabel: "MiniMax Coding Plan",
        modelIdentifier: "MiniMax-M2.5",
      },
      {
        id: "m:minimax-coding-plan:MiniMax-M2.5:v:high",
        label: "MiniMax M2.5 (high)",
        providerId: "minimax-coding-plan",
        providerLabel: "MiniMax Coding Plan",
        modelIdentifier: "MiniMax-M2.5",
      },
      {
        id: "m:minimax-coding-plan:MiniMax-M2.5:v:low",
        label: "MiniMax M2.5 (low)",
        providerId: "minimax-coding-plan",
        providerLabel: "MiniMax Coding Plan",
        modelIdentifier: "MiniMax-M2.5",
      },
      {
        id: "other/MiniMax-M2.5@low",
        label: "MiniMax M2.5 Low",
        providerId: "other",
        providerLabel: "Other",
        modelIdentifier: "MiniMax-M2.5@low",
      },
    ];
    assert.deepEqual(listAcpModelProviderOptions(models), [
      "minimax-coding-plan",
      "other",
    ]);
    assert.strictEqual(
      resolveAcpDisplayModelIdForProviderSelection({
        modelOptions: models,
        provider: "minimax-coding-plan",
        modelId: "MiniMax-M2.5",
      }),
      "m:minimax-coding-plan:MiniMax-M2.5:u",
    );
    assert.deepEqual(
      listAcpModelOptionsForProvider({
        modelOptions: models,
        provider: "other",
      }),
      ["MiniMax-M2.5@low"],
    );
    assert.lengthOf(buildAcpFoldedModelGroups(models), 0);
  });

  it("derives display metadata from raw ids and carries it through flat and grouped config", function () {
    const normalized = normalizeAcpModelOption({
      modelId: "vendor/model/nested:v2",
      name: "vendor / Friendly model",
    });
    assert.deepEqual(normalized, {
      id: "vendor/model/nested:v2",
      label: "Friendly model",
      description: undefined,
      providerId: "vendor",
      providerLabel: "vendor",
      modelIdentifier: "model/nested:v2",
    });

    const state = buildAcpRuntimeOptionsStateFromConfigOptions([
      {
        id: "model",
        name: "Model",
        type: "select",
        category: "model",
        currentValue: "llama3:70b",
        options: [
          {
            value: "llama3:70b",
            name: "Llama 3 70B",
            providerId: "ollama",
            providerLabel: "Ollama",
            modelIdentifier: "llama3:70b",
          },
          {
            group: "openrouter",
            name: "OpenRouter",
            providerId: "openrouter",
            options: [
              {
                value: "openrouter/qwen/model",
                name: "Qwen model",
                modelIdentifier: "qwen/model",
              },
            ],
          },
        ],
      },
    ]);
    assert.deepEqual(
      state.rawModels.map(
        ({ id, providerId, providerLabel, modelIdentifier }) => ({
          id,
          providerId,
          providerLabel,
          modelIdentifier,
        }),
      ),
      [
        {
          id: "llama3:70b",
          providerId: "ollama",
          providerLabel: "Ollama",
          modelIdentifier: "llama3:70b",
        },
        {
          id: "openrouter/qwen/model",
          providerId: "openrouter",
          providerLabel: "OpenRouter",
          modelIdentifier: "qwen/model",
        },
      ],
    );
  });

  it("folds provider-prefixed efforts once and keeps equal labels provider-scoped", function () {
    const models = [
      {
        id: "provider-a/model@low",
        label: "Shared model low",
        providerId: "provider-a",
        modelIdentifier: "model@low",
      },
      {
        id: "provider-a/model@high",
        label: "Shared model high",
        providerId: "provider-a",
        modelIdentifier: "model@high",
      },
      {
        id: "provider-b/model@low",
        label: "Shared model low",
        providerId: "provider-b",
        modelIdentifier: "model",
      },
      {
        id: "provider-b/model@high",
        label: "Shared model high",
        providerId: "provider-b",
        modelIdentifier: "model",
      },
    ];
    const groups = buildAcpFoldedModelGroups(models);
    const folded = foldAcpModelOptions({
      modelOptions: models,
      currentModelId: models[0].id,
    });
    assert.equal(folded.displayModelOptions[0].modelIdentifier, "model");
    assert.deepEqual(
      [...groups.keys()],
      ["provider-a/model", "provider-b/model"],
    );
    assert.strictEqual(
      resolveAcpRawModelIdForSelection({
        modelOptions: models,
        displayModelId: "provider-a/model",
        effortId: "high",
      }),
      "provider-a/model@high",
    );
    assert.strictEqual(
      resolveAcpRawModelIdForSelection({
        modelOptions: models,
        displayModelId: "provider-b/model",
        effortId: "low",
      }),
      "provider-b/model@low",
    );
  });

  it("keeps workflow slash identifiers partial and opaque selections raw", function () {
    const modelOptions = [
      {
        id: "anthropic/claude",
        label: "Claude",
        providerId: "anthropic",
        modelIdentifier: "claude",
      },
      {
        id: "m:minimax-coding-plan:MiniMax-M2.5:u",
        label: "MiniMax M2.5",
        providerId: "minimax-coding-plan",
        modelIdentifier: "MiniMax-M2.5",
      },
    ];
    assert.deepEqual(
      normalizeAcpProviderModelOptionsForRuntime({
        modelOptions,
        options: { acpModelProvider: "anthropic", acpModelId: "claude" },
      }),
      { acpModelId: "anthropic/claude" },
    );
    assert.deepEqual(
      normalizeAcpProviderModelOptionsForRuntime({
        modelOptions,
        options: { acpModelId: "anthropic/claude" },
      }),
      { acpModelId: "anthropic/claude" },
    );
    assert.deepEqual(
      normalizeAcpProviderModelOptionsForRuntime({
        modelOptions,
        options: {
          acpModelProvider: "minimax-coding-plan",
          acpModelId: "MiniMax-M2.5",
        },
      }),
      { acpModelId: "m:minimax-coding-plan:MiniMax-M2.5:u" },
    );
    assert.deepEqual(
      normalizeAcpProviderModelOptionsForRuntime({
        modelOptions,
        options: { acpModelId: "m:minimax-coding-plan:MiniMax-M2.5:u" },
      }),
      { acpModelId: "m:minimax-coding-plan:MiniMax-M2.5:u" },
    );
    assert.deepEqual(
      projectAcpProviderModelOptionsForUi({
        modelOptions,
        options: { acpModelProvider: "anthropic", acpModelId: "claude" },
      }),
      { acpModelProvider: "anthropic", acpModelId: "claude" },
    );
  });

  it("keeps a 709-model cache grouped by provider and does not invent qwen3.7-plus", function () {
    const models = Array.from({ length: 709 }, (_, index) => ({
      id: `provider-${index % 5}/model-${index}`,
      label: `model-${index}`,
    }));
    const providers = listAcpModelProviderOptions(models);
    assert.deepEqual(providers, [
      "provider-0",
      "provider-1",
      "provider-2",
      "provider-3",
      "provider-4",
    ]);
    assert.lengthOf(
      listAcpModelOptionsForProvider({
        modelOptions: models,
        provider: "provider-0",
      }),
      142,
    );
    assert.notInclude(
      listAcpModelOptionsForProvider({
        modelOptions: models,
        provider: "provider-0",
      }),
      "qwen3.7-plus",
    );
  });

  it("retains opencode2 as a recognized ACP backend family", async function () {
    Zotero.Prefs.set(
      prefKey,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "acp-opencode2",
            type: "acp",
            baseUrl: "local://acp-opencode2",
            command: "opencode2",
            acp: { agentFamily: "opencode2" },
          },
        ],
      }),
      true,
    );
    assert.strictEqual(
      (await listBackendInstances())[0]?.acp?.agentFamily,
      "opencode2",
    );
  });

  it("marks stale and inconsistent ACP catalogs as non-ready", async function () {
    Zotero.Prefs.set(
      prefKey,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "acp-k3-fixture",
            type: "acp",
            baseUrl: "local://acp-k3-fixture",
            command: "acp-fixture",
            auth: { kind: "none" },
            acp: {
              runtimeOptionsCache: {
                refreshedAt: "2020-01-01T00:00:00.000Z",
                displayModels: [
                  {
                    id: "missing-provider/qwen3.7-plus",
                    label: "qwen3.7-plus",
                  },
                ],
                rawModels: [],
              },
            },
          },
        ],
      }),
      true,
    );
    const descriptor = await describeProviderProfile("acp-k3-fixture");
    assert.strictEqual(descriptor.catalog.state, "stale");
    assert.include(
      descriptor.catalog.diagnostics.map((entry) => entry.code),
      "runtime_catalog_inconsistent",
    );
  });
});

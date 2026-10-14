import { assert } from "chai";
import { config } from "../../package.json";
import {
  listAcpModelOptionsForProvider,
  listAcpModelProviderOptions,
  normalizeAcpModelOption,
  normalizeAcpProviderModelOptionsForRuntime,
  parseAcpProviderModelId,
  projectAcpProviderModelOptionsForUi,
  resolveAcpDisplayModelIdForProviderSelection,
} from "../../src/modules/acp/chat/acpModelOptionFolding";
import { buildAcpRuntimeOptionsStateFromConfigOptions } from "../../src/modules/acp/chat/acpSessionConfigOptions";
import {
  describeProviderProfile,
  ProviderProfileError,
  validateProviderProfile,
  validateProviderOptionsForBackend,
} from "../../src/providers/profile";
import {
  listBackendInstances,
  resetBackendsRegistryReadDiagnosticsForTests,
} from "../../src/backends/registry";

describe("provider profile ACP catalog projection", function () {
  it("keeps advertised raw variants independent through enumeration and projection", async function () {
    const ids = [
      "m:minimax:MiniMax-M3.1-Flash-Preview:v:",
      "m:minimax:MiniMax-M3.1-Flash-Preview:v:thinking",
      "minimax/model@low",
      "minimax/model@high",
    ];
    const models = ids.map((id) => ({
      id,
      label: id,
      providerId: "minimax",
      modelIdentifier: "shared-model-name",
    }));
    assert.deepEqual(
      listAcpModelOptionsForProvider({
        modelOptions: models,
        provider: "minimax",
      }),
      ids,
    );
    Zotero.Prefs.set(
      prefKey,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "acp-variants",
            type: "acp",
            baseUrl: "local://acp-variants",
            command: "fixture",
            acp: {
              runtimeOptionsCache: {
                refreshedAt: new Date().toISOString(),
                rawModels: models,
              },
            },
          },
        ],
      }),
      true,
    );
    for (const acpModelId of ids) {
      const options = { acpModelProvider: "minimax", acpModelId };
      const { normalizedProfile } = await validateProviderProfile({
        backendId: "acp-variants",
        providerOptions: options,
      });
      assert.deepEqual(normalizedProfile.providerOptions, options);
      assert.deepEqual(
        projectAcpProviderModelOptionsForUi({ modelOptions: models, options }),
        options,
      );
      assert.deepEqual(
        normalizeAcpProviderModelOptionsForRuntime({
          modelOptions: models,
          options,
        }),
        { acpModelId },
      );
    }
  });
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
      "",
    );
    assert.deepEqual(
      listAcpModelOptionsForProvider({
        modelOptions: models,
        provider: "other",
      }),
      ["other/MiniMax-M2.5@low"],
    );
  });

  it("derives display metadata from raw ids and carries it through flat and grouped config", function () {
    const normalized = normalizeAcpModelOption({
      modelId: "vendor/model/nested:v2",
      name: "vendor / Friendly model",
    });
    assert.deepEqual(normalized, {
      id: "vendor/model/nested:v2",
      label: "vendor / Friendly model",
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

  it("keeps same-named models of different providers independent and raw", function () {
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
    assert.deepEqual(listAcpModelProviderOptions(models), [
      "provider-a",
      "provider-b",
    ]);
    assert.deepEqual(
      listAcpModelOptionsForProvider({
        modelOptions: models,
        provider: "provider-a",
      }),
      ["provider-a/model@low", "provider-a/model@high"],
    );
    assert.deepEqual(
      listAcpModelOptionsForProvider({
        modelOptions: models,
        provider: "provider-b",
      }),
      ["provider-b/model@low", "provider-b/model@high"],
    );
    assert.strictEqual(
      resolveAcpDisplayModelIdForProviderSelection({
        modelOptions: models,
        provider: "provider-a",
        modelId: "model",
      }),
      "",
    );
  });

  it("passes raw model ids to the runtime without qualifying bare names", function () {
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
      { acpModelId: "claude" },
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
      { acpModelId: "MiniMax-M2.5" },
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
    assert.deepEqual(
      projectAcpProviderModelOptionsForUi({
        modelOptions,
        options: { acpModelId: "m:minimax-coding-plan:MiniMax-M2.5:u" },
      }),
      {
        acpModelProvider: "minimax-coding-plan",
        acpModelId: "m:minimax-coding-plan:MiniMax-M2.5:u",
      },
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

  it("projects display models from raw models and drops legacy model-derived reasoning", async function () {
    Zotero.Prefs.set(
      prefKey,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "acp-legacy-cache",
            type: "acp",
            baseUrl: "local://acp-legacy-cache",
            command: "acp-fixture",
            acp: {
              runtimeOptionsCache: {
                refreshedAt: "2026-04-29T00:00:00.000Z",
                rawModels: [{ id: "vendor/model@high", label: "model@high" }],
                currentRawModelId: "vendor/model@high",
                displayModels: [{ id: "vendor/model", label: "model" }],
                currentDisplayModelId: "vendor/model",
                reasoningEfforts: [{ id: "high", label: "High" }],
                currentReasoningEffortId: "high",
                reasoningSource: "model-derived",
              },
            },
          },
        ],
      }),
      true,
    );
    const cache = (await listBackendInstances())[0]?.acp?.runtimeOptionsCache;
    assert.deepEqual(
      cache?.displayModels?.map((entry) => entry.id),
      ["vendor/model@high"],
    );
    assert.strictEqual(cache?.currentDisplayModelId, "vendor/model@high");
    assert.deepEqual(cache?.reasoningEfforts, []);
    assert.strictEqual(cache?.currentReasoningEffortId, "");
    assert.strictEqual(cache?.reasoningSource, "none");
  });

  it("fails closed on ACP selections the raw catalog does not offer", async function () {
    Zotero.Prefs.set(
      prefKey,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "acp-raw-models",
            type: "acp",
            baseUrl: "local://acp-raw-models",
            command: "acp-fixture",
            acp: {
              runtimeOptionsCache: {
                refreshedAt: new Date().toISOString(),
                modes: [{ id: "ask", label: "Ask" }],
                currentModeId: "ask",
                rawModels: [
                  { id: "openai/gpt-5", label: "GPT-5" },
                  { id: "anthropic/claude", label: "Claude" },
                  { id: "local-model", label: "Local" },
                ],
                currentRawModelId: "anthropic/claude",
                reasoningSource: "none",
              },
            },
          },
        ],
      }),
      true,
    );
    const backend = (await listBackendInstances())[0];
    assert.isOk(backend);
    assert.deepEqual(
      validateProviderOptionsForBackend({
        backend: backend!,
        providerOptions: {
          acpModelProvider: "anthropic",
          acpModelId: "anthropic/claude",
        },
      }),
      { acpModelId: "anthropic/claude" },
    );
    for (const providerOptions of [
      { acpModelProvider: "anthropic", acpModelId: "claude" },
      { acpModelId: "openai/gpt-5@high" },
      { acpModelProvider: "anthropic", acpModelId: "openai/gpt-5" },
      { acpModeId: "build" },
    ]) {
      let error: unknown;
      try {
        validateProviderOptionsForBackend({
          backend: backend!,
          providerOptions,
        });
      } catch (caught) {
        error = caught;
      }
      assert.instanceOf(error, ProviderProfileError);
      const failure = error as ProviderProfileError;
      assert.strictEqual(failure.code, "provider_profile_option_unavailable");
      assert.include(
        Object.keys(providerOptions),
        String(failure.details?.optionKey),
        "the rejected option key is reported",
      );
      assert.strictEqual(
        failure.details?.value,
        providerOptions[
          String(failure.details?.optionKey) as keyof typeof providerOptions
        ],
        "the original value is reported unchanged",
      );
    }
  });

  it("rejects explicit ACP selections when the catalog offers nothing", async function () {
    Zotero.Prefs.set(
      prefKey,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "acp-empty-catalog",
            type: "acp",
            baseUrl: "local://acp-empty-catalog",
            command: "acp-fixture",
            acp: {
              runtimeOptionsCache: {
                refreshedAt: new Date().toISOString(),
              },
            },
          },
        ],
      }),
      true,
    );
    const backend = (await listBackendInstances())[0];
    let error: unknown;
    try {
      validateProviderOptionsForBackend({
        backend: backend!,
        providerOptions: { acpModelId: "anthropic/claude" },
      });
    } catch (caught) {
      error = caught;
    }
    assert.instanceOf(error, ProviderProfileError);
    assert.strictEqual(
      (error as ProviderProfileError).code,
      "provider_profile_option_unavailable",
    );
  });
});

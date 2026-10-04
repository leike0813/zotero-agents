import { assert } from "chai";
import manifest from "../../package.json";
import { getPref, setPref } from "../../src/utils/prefs";
import {
  deletePiProviderConfiguration,
  loadPiProviderConfigurationState,
  migratePiProviderBindings,
  resolvePiModelSelection,
  setPiProviderDefaults,
  upsertPiProviderConfiguration,
} from "../../src/modules/piProviderConfiguration";

describe("Pi provider configuration", function () {
  const original = { value: "" };
  beforeEach(function () {
    original.value = String(getPref("piProviderConfigurationJson") || "");
    setPref("piProviderConfigurationJson", "");
  });
  afterEach(function () {
    setPref("piProviderConfigurationJson", original.value);
  });

  const model = {
    provider: "openai",
    id: "gpt-test",
    name: "Test",
    api: "openai-responses" as const,
    baseUrl: "https://api.openai.com/v1",
    contextWindow: 1000,
    maxTokens: 100,
    input: ["text"],
    supportsTools: true,
    reasoning: ["off", "low", "high"] as const,
    source: "bundled" as const,
  };
  const credentials = [
    { id: "key-a", kind: "api-key" as const },
    { id: "key-b", kind: "api-key" as const },
  ];

  it("selects ChatGPT discoveries only for their registration without borrowing API-key facts", function () {
    upsertPiProviderConfiguration({
      id: "chatgpt-a",
      label: "ChatGPT A",
      provider: "openai",
      modelId: "gpt-shared",
      authVariant: "chatgpt",
      credentialRef: "chatgpt-a-key",
      enabled: true,
      reasoning: "low",
    });
    upsertPiProviderConfiguration({
      id: "chatgpt-b",
      label: "ChatGPT B",
      provider: "openai",
      modelId: "gpt-shared",
      authVariant: "chatgpt",
      credentialRef: "chatgpt-b-key",
      enabled: true,
      reasoning: "low",
    });
    upsertPiProviderConfiguration({
      id: "api-key",
      label: "API key",
      provider: "openai",
      modelId: "gpt-shared",
      authVariant: "api-key",
      credentialRef: "key-a",
      enabled: true,
      reasoning: "low",
    });
    upsertPiProviderConfiguration({
      id: "chatgpt-no-facts",
      label: "ChatGPT without facts",
      provider: "openai",
      modelId: "gpt-shared",
      authVariant: "chatgpt",
      credentialRef: "chatgpt-c-key",
      enabled: true,
      reasoning: "low",
    });
    const discoveredA = {
      ...model,
      id: "gpt-shared",
      maxTokens: 0,
      source: "discovered" as const,
      credentialRef: "chatgpt-a-key",
      authVariants: ["chatgpt"] as const,
      cost: undefined,
    };
    const discoveredB = {
      ...discoveredA,
      credentialRef: "chatgpt-b-key",
      contextWindow: 2000,
    };
    const publicModel = {
      ...model,
      id: "gpt-shared",
      contextWindow: 9000,
      maxTokens: 800,
      cost: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0 },
      authVariants: ["api-key"] as const,
    };
    const args = {
      kind: "conversation" as const,
      credentials: [
        { id: "chatgpt-a-key", kind: "chatgpt" as const },
        { id: "chatgpt-b-key", kind: "chatgpt" as const },
        { id: "chatgpt-c-key", kind: "chatgpt" as const },
        ...credentials,
      ],
      explicit: { configurationId: "chatgpt-a" },
      catalog: {
        revision: "discovered",
        models: [publicModel, discoveredA, discoveredB],
      },
    };
    const selectedA = resolvePiModelSelection(args);
    assert.equal(selectedA.provider, "openai");
    assert.equal(selectedA.api, "openai-responses");
    assert.equal(selectedA.baseUrl, "https://api.openai.com/v1");
    assert.equal(selectedA.policy.contextWindow, 1000);
    assert.equal(selectedA.policy.maxTokens, 0);
    assert.isUndefined(selectedA.metadata?.cost);
    const selectedB = resolvePiModelSelection({
      ...args,
      explicit: { configurationId: "chatgpt-b" },
    });
    assert.equal(selectedB.policy.contextWindow, 2000);
    assert.equal(selectedB.credentialRef, "chatgpt-b-key");
    const selectedApiKey = resolvePiModelSelection({
      ...args,
      explicit: { configurationId: "api-key" },
    });
    assert.equal(selectedApiKey.policy.contextWindow, 9000);
    assert.equal(selectedApiKey.policy.maxTokens, 800);
    assert.equal(selectedApiKey.metadata?.cost?.input, 1);
    assert.throws(() =>
      resolvePiModelSelection({
        ...args,
        explicit: { configurationId: "chatgpt-a" },
        catalog: { revision: "empty", models: [] },
      }),
    );
    assert.throws(() =>
      resolvePiModelSelection({
        ...args,
        explicit: { configurationId: "chatgpt-a" },
        catalog: {
          ...args.catalog,
          models: [{ ...discoveredA, credentialRef: "other-key" }],
        },
      }),
    );
    assert.throws(() =>
      resolvePiModelSelection({
        ...args,
        explicit: { configurationId: "chatgpt-a" },
        catalog: {
          ...args.catalog,
          models: [
            { ...discoveredA, source: "bundled", credentialRef: undefined },
          ],
        },
      }),
    );
    // A target-specific retained binding can keep its own verified context, but
    // never adopts the public model's cost or output ceiling.
    const silent = resolvePiModelSelection({
      ...args,
      catalog: {
        ...args.catalog,
        models: [{ ...discoveredA, contextWindow: 0 }],
      },
    });
    assert.equal(silent.policy.contextWindow, 1000);
    assert.equal(silent.policy.maxTokens, 0);
    assert.isUndefined(silent.metadata?.cost);
    // The API key remains independently governed by public metadata.
    assert.throws(() =>
      resolvePiModelSelection({
        ...args,
        explicit: { configurationId: "chatgpt-b" },
        catalog: { revision: "empty", models: [discoveredA] },
      }),
    );
    assert.throws(() =>
      resolvePiModelSelection({
        ...args,
        explicit: { configurationId: "chatgpt-no-facts" },
        catalog: { revision: "public-only", models: [publicModel] },
      }),
    );
    assert.throws(() =>
      resolvePiModelSelection({
        ...args,
        explicit: { configurationId: "chatgpt-no-facts" },
        catalog: {
          revision: "unknown-context",
          models: [
            publicModel,
            {
              ...discoveredA,
              contextWindow: 0,
              credentialRef: "chatgpt-c-key",
            },
          ],
        },
      }),
    );
    assert.throws(() =>
      upsertPiProviderConfiguration({
        id: "chatgpt-custom-target",
        label: "ChatGPT custom target",
        provider: "openai",
        modelId: "gpt-shared",
        authVariant: "chatgpt",
        credentialRef: "chatgpt-a-key",
        baseUrl: "https://example.com/v1",
        api: "openai-responses",
        enabled: true,
      }),
    );
  });

  it("isolates configurations, applies precedence, and freezes a secret-free selection", function () {
    upsertPiProviderConfiguration({
      id: "a",
      label: "A",
      provider: "openai",
      modelId: "gpt-test",
      authVariant: "api-key",
      credentialRef: "key-a",
      enabled: true,
    });
    upsertPiProviderConfiguration({
      id: "b",
      label: "B",
      provider: "openai",
      modelId: "gpt-test",
      authVariant: "api-key",
      credentialRef: "key-b",
      enabled: true,
    });
    setPiProviderDefaults(
      {
        global: { configurationId: "a" },
        conversation: { configurationId: "b" },
      },
      credentials,
      { models: [model] },
    );
    const byKind = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev-1", models: [model] },
      credentials,
    });
    assert.equal(byKind.configurationId, "b");
    const byOwner = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev-1", models: [model] },
      credentials,
      ownerSelection: { configurationId: "a" },
    });
    assert.equal(byOwner.configurationId, "a");
    const selected = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev-1", models: [model] },
      credentials,
      ownerSelection: { configurationId: "a" },
      explicit: { configurationId: "b", reasoning: "high" },
    });
    assert.equal(selected.configurationId, "b");
    assert.equal(selected.credentialRef, "key-b");
    assert.equal(selected.reasoning, "high");
    assert.equal(
      selected.runtimeVersion,
      manifest.dependencies["@earendil-works/pi-agent-core"],
    );
    assert.equal(
      selected.adapterVersion,
      manifest.dependencies["@earendil-works/pi-ai"],
    );
    assert.equal(selected.catalogRevision, "rev-1");
    assert.isTrue(Object.isFrozen(selected));
    assert.notInclude(JSON.stringify(selected), "secret-B");
    deletePiProviderConfiguration("b");
    assert.equal(selected.configurationId, "b");
    assert.isUndefined(
      loadPiProviderConfigurationState().defaults.conversation,
    );
    assert.lengthOf(loadPiProviderConfigurationState().configurations, 1);
    assert.equal(loadPiProviderConfigurationState().configurations[0].id, "a");
    assert.equal(
      resolvePiModelSelection({
        kind: "conversation",
        catalog: { revision: "rev-1", models: [model] },
        credentials,
      }).configurationId,
      "a",
    );
    setPiProviderDefaults({}, credentials, { models: [model] });
    assert.equal(
      resolvePiModelSelection({
        kind: "conversation",
        catalog: { revision: "rev-1", models: [model] },
        credentials,
      }).configurationId,
      "a",
    );
  });

  it("validates and invalidates the optional auxiliary title configuration", function () {
    const upsert = (id: string, modelId: string) =>
      upsertPiProviderConfiguration({
        id,
        label: id,
        provider: "openai",
        modelId,
        authVariant: "api-key",
        credentialRef: `key-${id}`,
        enabled: true,
      });
    upsert("a", "gpt-test");
    upsert("b", "gpt-test");
    setPiProviderDefaults(
      {
        conversation: { configurationId: "a" },
        auxiliary: { configurationId: "b" },
      },
      credentials,
      { models: [model] },
    );
    const saved = loadPiProviderConfigurationState().defaults;
    assert.equal(saved.conversation?.configurationId, "a");
    assert.equal(saved.auxiliary?.configurationId, "b");
    assert.equal(
      resolvePiModelSelection({
        kind: "conversation",
        catalog: { revision: "rev-1", models: [model] },
        credentials,
        explicit: saved.auxiliary,
      }).configurationId,
      "b",
    );
    deletePiProviderConfiguration("b");
    const afterDelete = loadPiProviderConfigurationState().defaults;
    assert.isUndefined(afterDelete.auxiliary);
    assert.equal(afterDelete.conversation?.configurationId, "a");
    upsert("b", "gpt-test");
    setPiProviderDefaults(
      {
        conversation: { configurationId: "a" },
        auxiliary: { configurationId: "b" },
      },
      credentials,
      { models: [model] },
    );
    upsert("b", "gpt-changed");
    const afterChange = loadPiProviderConfigurationState().defaults;
    assert.isUndefined(afterChange.auxiliary);
    assert.equal(afterChange.conversation?.configurationId, "a");
    assert.throws(() =>
      setPiProviderDefaults(
        { auxiliary: { configurationId: "missing" } },
        credentials,
        { models: [model] },
      ),
    );
  });

  it("does not select a credential with the wrong authentication kind", function () {
    upsertPiProviderConfiguration({
      id: "a",
      label: "A",
      provider: "openai",
      modelId: "gpt-test",
      authVariant: "api-key",
      credentialRef: "wrong-kind",
      enabled: true,
    });
    assert.throws(() =>
      resolvePiModelSelection({
        kind: "conversation",
        catalog: { revision: "rev-1", models: [model] },
        credentials: [{ id: "wrong-kind", kind: "chatgpt" }],
      }),
    );
  });

  it("skips incomplete models in the catalog-backed fallback", function () {
    for (const [id, modelId] of [
      ["a", "incomplete"],
      ["b", "gpt-test"],
    ])
      upsertPiProviderConfiguration({
        id,
        label: id,
        provider: "openai",
        modelId,
        authVariant: "api-key",
        credentialRef: "key-a",
        reasoning: id === "b" ? "max" : undefined,
        enabled: true,
      });
    upsertPiProviderConfiguration({
      id: "c",
      label: "c",
      provider: "openai",
      modelId: "gpt-test",
      authVariant: "api-key",
      credentialRef: "key-a",
      enabled: true,
    });
    assert.throws(() =>
      setPiProviderDefaults({ global: { configurationId: "b" } }, credentials, {
        models: [model],
      }),
    );
    const selected = resolvePiModelSelection({
      kind: "conversation",
      catalog: {
        revision: "rev-1",
        models: [{ ...model, id: "incomplete", contextWindow: 0 }, model],
      },
      credentials,
    });
    assert.equal(selected.configurationId, "c");
  });

  it("rejects remote HTTP and unsupported explicit reasoning", function () {
    assert.throws(
      () =>
        upsertPiProviderConfiguration({
          id: "bad",
          label: "Bad",
          provider: "custom",
          modelId: "test",
          authVariant: "none",
          enabled: true,
          baseUrl: "http://example.com/v1",
          api: "openai-completions",
        }),
      /https|endpoint/i,
    );
    assert.throws(() =>
      upsertPiProviderConfiguration({
        id: "mapped",
        label: "Mapped",
        provider: "custom",
        modelId: "test",
        authVariant: "none",
        enabled: true,
        baseUrl: "http://[::ffff:8.8.8.8]/v1",
        api: "openai-completions",
      }),
    );
    upsertPiProviderConfiguration({
      id: "a",
      label: "A",
      provider: "openai",
      modelId: "gpt-test",
      authVariant: "none",
      baseUrl: "https://api.example.com/v1",
      api: "openai-responses",
      enabled: true,
    });
    assert.throws(
      () =>
        resolvePiModelSelection({
          kind: "conversation",
          catalog: { revision: "rev-1", models: [model] },
          explicit: { configurationId: "a", reasoning: "max" },
        }),
      /reasoning/i,
    );
  });

  it("does not overwrite an invalid persisted Pi document", function () {
    setPref("piProviderConfigurationJson", "{broken");
    assert.throws(() =>
      upsertPiProviderConfiguration({
        id: "a",
        label: "A",
        provider: "openai",
        modelId: "gpt-test",
        authVariant: "none",
        enabled: true,
      }),
    );
    assert.equal(getPref("piProviderConfigurationJson"), "{broken");
  });

  it("keeps a saved connection binding when a later directory publishes another endpoint", function () {
    const saved = {
      id: "a",
      label: "A",
      provider: "openai",
      modelId: "gpt-test",
      authVariant: "api-key" as const,
      credentialRef: "key-a",
      enabled: true,
    };
    upsertPiProviderConfiguration(saved, { models: [model] });
    const binding =
      loadPiProviderConfigurationState().configurations[0].binding;
    assert.equal(binding?.revision, 1);
    assert.equal(binding?.baseUrl, model.baseUrl);
    assert.equal(binding?.api, model.api);

    // A directory update that moves the endpoint must not redirect a saved
    // credential, and must not survive as a new selection.
    const moved = { ...model, baseUrl: "https://moved.example/v1" };
    const frozen = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev-2", models: [moved] },
      credentials,
    });
    assert.equal(frozen.baseUrl, model.baseUrl);
    assert.equal(frozen.api, model.api);
    assert.equal(frozen.bindingRevision, 1);
    upsertPiProviderConfiguration(
      { ...saved, label: "A2" },
      {
        models: [moved],
      },
    );
    assert.equal(
      loadPiProviderConfigurationState().configurations[0].binding?.baseUrl,
      model.baseUrl,
    );

    // An accepted endpoint change is a new binding revision.
    upsertPiProviderConfiguration(
      {
        ...saved,
        baseUrl: "https://other.example/v1",
        api: "openai-responses",
      },
      { models: [moved] },
    );
    const changed =
      loadPiProviderConfigurationState().configurations[0].binding;
    assert.equal(changed?.revision, 2);
    assert.equal(changed?.baseUrl, "https://other.example/v1");
  });

  it("migrates saved connections before adoption and requires explicit repair without an original target", function () {
    setPref(
      "piProviderConfigurationJson",
      JSON.stringify({
        version: 1,
        overlayPath: "",
        defaults: { global: { configurationId: "orphan" } },
        configurations: [
          {
            id: "official",
            label: "Official",
            provider: "openai",
            modelId: "gpt-test",
            authVariant: "api-key",
            credentialRef: "key-a",
            enabled: true,
          },
          {
            id: "custom",
            label: "Custom",
            provider: "custom",
            modelId: "gpt-test",
            authVariant: "none",
            baseUrl: "https://api.example.com/v1",
            api: "openai-responses",
            enabled: true,
          },
          {
            id: "orphan",
            label: "Orphan",
            provider: "openai",
            modelId: "gpt-missing",
            authVariant: "api-key",
            credentialRef: "key-b",
            enabled: true,
          },
        ],
      }),
    );
    const migrated = migratePiProviderBindings({ models: [model] });
    assert.sameMembers(migrated.requiresRepair, ["orphan"]);
    const bound = (id: string) =>
      migrated.state.configurations.find((entry) => entry.id === id)?.binding;
    assert.equal(bound("official")?.baseUrl, model.baseUrl);
    assert.equal(bound("custom")?.baseUrl, "https://api.example.com/v1");
    assert.isUndefined(bound("orphan"));
    const orphan = migrated.state.configurations.find(
      (entry) => entry.id === "orphan",
    );
    // The configuration, its credential and its existing selection survive the
    // migration; only a new turn is blocked until the user accepts a target.
    assert.isTrue(orphan?.enabled);
    assert.isTrue(orphan?.repairRequired);
    assert.equal(orphan?.credentialRef, "key-b");
    assert.equal(migrated.state.defaults.global?.configurationId, "orphan");
    assert.isUndefined(
      migrated.state.configurations.find((entry) => entry.id === "official")
        ?.repairRequired,
    );

    // The migrated binding is persisted, and a repair-required connection is
    // never re-derived from the newly adopted directory.
    assert.equal(
      loadPiProviderConfigurationState().configurations[0].binding?.baseUrl,
      model.baseUrl,
    );
    assert.throws(
      () =>
        resolvePiModelSelection({
          kind: "conversation",
          catalog: {
            revision: "official-seed",
            models: [model, { ...model, id: "gpt-missing" }],
          },
          credentials,
          explicit: { configurationId: "orphan" },
        }),
      /repair|target/i,
    );
    // A blocked connection cannot become a new default, and the existing
    // selection is left untouched by the attempt.
    assert.throws(() =>
      setPiProviderDefaults(
        { conversation: { configurationId: "orphan" } },
        credentials,
        { models: [model, { ...model, id: "gpt-missing" }] },
      ),
    );
    assert.equal(
      loadPiProviderConfigurationState().defaults.global?.configurationId,
      "orphan",
    );
    // Accepting a target is what clears the flag, and the connection then runs
    // against the model the user pointed it at.
    upsertPiProviderConfiguration({
      id: "orphan",
      label: "Orphan",
      provider: "openai",
      modelId: "gpt-missing",
      authVariant: "api-key",
      credentialRef: "key-b",
      enabled: true,
      baseUrl: "https://api.example.com/v1",
      api: "openai-responses",
    });
    assert.isUndefined(
      loadPiProviderConfigurationState().configurations.find(
        (entry) => entry.id === "orphan",
      )?.repairRequired,
    );
    assert.equal(
      resolvePiModelSelection({
        kind: "conversation",
        catalog: {
          revision: "official-seed",
          models: [model, { ...model, id: "gpt-missing" }],
        },
        credentials,
        explicit: { configurationId: "orphan" },
      }).baseUrl,
      "https://api.example.com/v1",
    );
    // A second run is a no-op for already bound connections.
    assert.lengthOf(
      migratePiProviderBindings({ models: [] }).requiresRepair,
      0,
    );
  });

  it("keeps the bound description when the directory republishes the model for another target", function () {
    const priced = {
      ...model,
      cost: { input: 1, output: 2, cacheRead: 0.5, cacheWrite: 1.5 },
      provenance: {
        source: "official" as const,
        revision: "sha256-1",
        schemaVersion: 1,
      },
    };
    upsertPiProviderConfiguration(
      {
        id: "a",
        label: "A",
        provider: "openai",
        modelId: "gpt-test",
        authVariant: "api-key",
        credentialRef: "key-a",
        enabled: true,
      },
      { models: [priced] },
    );
    // The same model identity is republished for a different target with facts
    // the old connection has never had.
    const moved = {
      ...priced,
      baseUrl: "https://moved.example/v1",
      contextWindow: 999999,
      maxTokens: 64000,
      reasoning: ["off", "low", "high", "max"] as const,
      cost: { input: 100, output: 200, cacheRead: 50, cacheWrite: 150 },
      provenance: { ...priced.provenance, revision: "sha256-2" },
    };
    const frozen = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev-2", models: [moved] },
      credentials,
    });
    assert.equal(frozen.baseUrl, model.baseUrl);
    assert.equal(frozen.policy.contextWindow, model.contextWindow);
    assert.equal(frozen.policy.maxTokens, model.maxTokens);
    assert.equal(frozen.metadata?.cost?.input, 1);
    assert.equal(frozen.metadata?.provenance?.revision, "sha256-1");
    assert.equal(frozen.metadata?.knowledge?.context, "known");
    assert.equal(frozen.bindingRevision, 1);
    // A capability the bound target never declared stays unavailable.
    assert.throws(
      () =>
        resolvePiModelSelection({
          kind: "conversation",
          catalog: { revision: "rev-2", models: [moved] },
          credentials,
          explicit: { configurationId: "a", reasoning: "max" },
        }),
      /reasoning/i,
    );
    // The same holds for a configured endpoint bound to its own description.
    upsertPiProviderConfiguration(
      {
        id: "custom",
        label: "Custom",
        provider: "openai",
        modelId: "gpt-test",
        authVariant: "api-key",
        credentialRef: "key-a",
        baseUrl: "https://gateway.example/v1",
        api: "openai-responses",
        enabled: true,
      },
      { models: [{ ...priced, baseUrl: "https://gateway.example/v1" }] },
    );
    const custom = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev-2", models: [moved] },
      credentials,
      explicit: { configurationId: "custom" },
    });
    assert.equal(custom.baseUrl, "https://gateway.example/v1");
    assert.equal(custom.policy.contextWindow, model.contextWindow);
    assert.equal(custom.metadata?.cost?.input, 1);
  });

  it("keeps a saved verified fact when the new directory is silent about it", function () {
    const config = {
      id: "a",
      label: "A",
      provider: "openai",
      modelId: "gpt-test",
      authVariant: "api-key" as const,
      credentialRef: "key-a",
      enabled: true,
    };
    // The saved connection was admitted against a directory that verified its
    // tool support, output ceiling and image input.
    upsertPiProviderConfiguration(config, {
      models: [
        {
          ...model,
          supportsTools: true,
          contextWindow: 400000,
          maxTokens: 32000,
          input: ["text", "image"],
          reasoning: ["off", "low", "high", "max"] as const,
          source: "retained" as const,
          provenance: {
            source: "retained" as const,
            revision: "@oh-my-pi/pi-catalog@18.0.11",
            schemaVersion: 1,
          },
        },
      ],
    });
    // The official directory knows the same target and states a context window,
    // but is silent about tools, the output ceiling, image input and reasoning.
    const official = {
      ...model,
      supportsTools: false,
      contextWindow: 400000,
      maxTokens: 0,
      input: [] as readonly string[],
      reasoning: [] as const,
      knowledge: {
        context: "known" as const,
        output: "unknown" as const,
        input: "unknown" as const,
        tools: "unknown" as const,
        reasoning: "unknown" as const,
      },
      provenance: {
        source: "official" as const,
        revision: "sha256-3",
        schemaVersion: 1,
      },
    };
    const frozen = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev", models: [official] },
      credentials,
    });
    assert.isTrue(frozen.policy.supportsTools);
    // The current directory's silence is still its own declaration; the
    // retained fact only restores what this connection may run with.
    assert.equal(frozen.metadata?.knowledge?.tools, "unknown");
    assert.equal(frozen.metadata?.knowledge?.output, "unknown");
    assert.equal(frozen.policy.maxTokens, 32000);
    assert.deepEqual(frozen.policy.input, ["text", "image"]);
    assert.equal(frozen.policy.contextWindow, 400000);
    assert.equal(frozen.metadata?.provenance?.revision, "sha256-3");
    // A reasoning level the new directory dropped but the saved fact verified
    // is still an admitted choice for this connection.
    assert.equal(
      resolvePiModelSelection({
        kind: "conversation",
        catalog: { revision: "rev", models: [official] },
        credentials,
        explicit: { configurationId: "a", reasoning: "max" },
      }).reasoning,
      "max",
    );

    // Refreshing the saved description of the same target keeps the verified
    // fact and the fact base it came from, and the live turn still reports the
    // current directory revision.
    upsertPiProviderConfiguration(config, { models: [official] });
    const refreshed = loadPiProviderConfigurationState().configurations[0];
    assert.isTrue(refreshed.binding?.model?.supportsTools);
    assert.equal(
      refreshed.binding?.model?.provenance?.revision,
      "@oh-my-pi/pi-catalog@18.0.11",
    );
    const afterRefresh = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev", models: [official] },
      credentials,
      explicit: { configurationId: "a" },
    });
    assert.isTrue(afterRefresh.policy.supportsTools);
    assert.equal(afterRefresh.metadata?.provenance?.revision, "sha256-3");
    assert.equal(afterRefresh.metadata?.knowledge?.tools, "unknown");

    // An explicit statement from the new directory is not overwritten.
    const explicit = {
      ...official,
      knowledge: { ...official.knowledge, tools: "unsupported" as const },
    };
    assert.isFalse(
      resolvePiModelSelection({
        kind: "conversation",
        catalog: { revision: "rev", models: [explicit] },
        credentials,
      }).policy.supportsTools,
    );

    // A connection without saved facts keeps the new directory's silence.
    setPref("piProviderConfigurationJson", "");
    upsertPiProviderConfiguration({ ...config, id: "b" });
    const fresh = resolvePiModelSelection({
      kind: "conversation",
      catalog: {
        revision: "rev",
        models: [
          { ...official, maxTokens: 1000, input: ["text"], reasoning: ["off"] },
        ],
      },
      credentials,
      explicit: { configurationId: "b" },
    });
    assert.isFalse(fresh.policy.supportsTools);
    assert.equal(fresh.metadata?.knowledge?.tools, "unknown");
    // The same silence is fatal for a connection that never verified a ceiling.
    upsertPiProviderConfiguration({ ...config, id: "c" });
    assert.throws(() =>
      resolvePiModelSelection({
        kind: "conversation",
        catalog: { revision: "rev", models: [official] },
        credentials,
        explicit: { configurationId: "c" },
      }),
    );
  });

  it("refuses a function batch for a connection with no verified tool fact", function () {
    // A bare connection keeps its configured target but carries no verified tool
    // fact, so it cannot declare a function batch.
    const local = {
      ...model,
      provider: "custom",
      id: "local-model",
      baseUrl: "https://api.example.com/v1",
      supportsTools: false,
    };
    upsertPiProviderConfiguration(
      {
        id: "bare",
        label: "Bare",
        provider: "custom",
        modelId: "local-model",
        authVariant: "none",
        baseUrl: "https://api.example.com/v1",
        api: "openai-responses",
        enabled: true,
      },
      { models: [] },
    );
    const frozen = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev", models: [local] },
      explicit: { configurationId: "bare" },
    });
    assert.isUndefined(
      loadPiProviderConfigurationState().configurations[0].binding?.model,
    );
    assert.isFalse(frozen.policy.supportsTools);
    assert.equal(frozen.metadata?.knowledge?.tools, "unknown");
    assert.equal(frozen.bindingRevision, 1);
  });

  it("freezes applicable directory facts and withholds them from another connection target", function () {
    const priced = {
      ...model,
      reasoning: ["off", "low", "high", "max"] as const,
      cost: {
        input: 1,
        output: 2,
        cacheRead: 0.5,
        cacheWrite: 1.5,
        tiers: [
          {
            inputTokensAbove: 1000,
            input: 9,
            output: 9,
            cacheRead: 9,
            cacheWrite: 9,
          },
        ],
      },
      promptCache: { short: 300, long: 3600 },
      inputLimits: { maxRequestBytes: 4096, images: { maxPerRequest: 2 } },
      thinkingLevelMap: { low: "think-low", max: null },
      compat: { supportsStore: false },
      authVariants: ["api-key", "none"] as const,
      provenance: {
        source: "official" as const,
        revision: "sha256-1",
        schemaVersion: 1,
      },
    };
    upsertPiProviderConfiguration(
      {
        id: "official",
        label: "Official",
        provider: "openai",
        modelId: "gpt-test",
        authVariant: "api-key",
        credentialRef: "key-a",
        enabled: true,
      },
      { models: [priced] },
    );
    const frozen = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev", models: [priced] },
      credentials,
    });
    assert.equal(frozen.metadata?.cost?.input, 1);
    assert.lengthOf(frozen.metadata?.cost?.tiers || [], 1);
    assert.equal(frozen.metadata?.promptCache?.long, 3600);
    assert.equal(frozen.metadata?.inputLimits?.maxRequestBytes, 4096);
    assert.deepEqual(frozen.metadata?.thinkingLevelMap, {
      low: "think-low",
      max: null,
    });
    assert.deepEqual(frozen.metadata?.compat, { supportsStore: false });
    assert.equal(frozen.metadata?.provenance?.revision, "sha256-1");
    assert.equal(frozen.metadata?.knowledge?.tools, "known");
    assert.isTrue(Object.isFrozen(frozen.metadata));
    assert.isTrue(Object.isFrozen(frozen.metadata?.cost));
    assert.isTrue(Object.isFrozen(frozen.metadata?.cost?.tiers?.[0]));
    assert.isTrue(Object.isFrozen(frozen.metadata?.inputLimits?.images));
    assert.isNotEmpty(frozen.selectionId || "");
    assert.notInclude(frozen.selectionId || "", "https");
    assert.notInclude(JSON.stringify(frozen.metadata), "key-a");

    // A level the frozen thinking map marks unsupported is refused locally.
    assert.throws(
      () =>
        resolvePiModelSelection({
          kind: "conversation",
          catalog: { revision: "rev", models: [priced] },
          credentials,
          explicit: { configurationId: "official", reasoning: "max" },
        }),
      /reasoning/i,
    );

    // A custom endpoint may reuse the model identity, never its published
    // price, limits, cache behavior or compatibility.
    upsertPiProviderConfiguration(
      {
        id: "custom",
        label: "Custom",
        provider: "openai",
        modelId: "gpt-test",
        authVariant: "api-key",
        credentialRef: "key-a",
        baseUrl: "https://gateway.example/v1",
        api: "openai-responses",
        enabled: true,
      },
      { models: [priced] },
    );
    const custom = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev", models: [priced] },
      credentials,
      explicit: { configurationId: "custom" },
    });
    assert.equal(custom.baseUrl, "https://gateway.example/v1");
    assert.isUndefined(custom.metadata?.cost);
    assert.isUndefined(custom.metadata?.compat);
    assert.isUndefined(custom.metadata?.inputLimits);
    assert.isUndefined(custom.metadata?.promptCache);
    assert.equal(custom.metadata?.knowledge?.tools, "unknown");
    assert.equal(custom.metadata?.knowledge?.context, "unknown");
  });

  it("keeps a configured model's own description when the directory drops it and still blocks retired models", function () {
    const configured = {
      id: "a",
      label: "A",
      provider: "openai",
      modelId: "gpt-test",
      authVariant: "api-key" as const,
      credentialRef: "key-a",
      enabled: true,
    };
    upsertPiProviderConfiguration(configured, { models: [model] });
    const missing = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev-2", models: [] },
      credentials,
    });
    assert.equal(missing.modelId, "gpt-test");
    assert.equal(missing.baseUrl, model.baseUrl);
    assert.equal(missing.metadata?.availability, "missing");
    assert.equal(missing.metadata?.knowledge?.context, "known");

    for (const availability of ["retired", "unsupported"] as const) {
      setPref("piProviderConfigurationJson", "");
      upsertPiProviderConfiguration(
        { ...configured, id: availability },
        { models: [{ ...model, availability }] },
      );
      assert.throws(
        () =>
          resolvePiModelSelection({
            kind: "conversation",
            catalog: {
              revision: "rev",
              models: [{ ...model, availability }],
            },
            credentials,
          }),
        new RegExp(availability === "retired" ? /retired/i : /unsupported/i),
      );
    }

    // Retirement survives the directory dropping the entry afterwards.
    setPref("piProviderConfigurationJson", "");
    upsertPiProviderConfiguration(
      { ...configured, id: "retired" },
      { models: [{ ...model, availability: "retired" }] },
    );
    assert.throws(() =>
      resolvePiModelSelection({
        kind: "conversation",
        catalog: { revision: "rev-3", models: [] },
        credentials,
      }),
    );
  });
});

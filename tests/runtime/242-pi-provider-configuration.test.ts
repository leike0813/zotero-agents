import { assert } from "chai";
import manifest from "../../package.json";
import { getPref, setPref } from "../../src/utils/prefs";
import {
  deletePiProviderConfiguration,
  loadPiProviderConfigurationState,
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

  it("selects discovered Codex models only for their credential without inventing an output ceiling", function () {
    upsertPiProviderConfiguration({
      id: "codex",
      label: "Codex",
      provider: "openai-codex",
      modelId: "new-codex-model",
      authVariant: "openai-codex",
      credentialRef: "codex-key",
      enabled: true,
      reasoning: "low",
    });
    const discovered = {
      ...model,
      provider: "openai-codex",
      id: "new-codex-model",
      api: "openai-codex-responses",
      maxTokens: 0,
      source: "discovered" as const,
      credentialRef: "codex-key",
      supportsTools: false,
    };
    const args = {
      kind: "conversation" as const,
      credentials: [{ id: "codex-key", kind: "openai-codex" as const }],
      explicit: { configurationId: "codex" },
      catalog: { revision: "discovered", models: [discovered] },
    };
    assert.equal(resolvePiModelSelection(args).policy.maxTokens, 0);
    assert.throws(() =>
      resolvePiModelSelection({
        ...args,
        catalog: {
          ...args.catalog,
          models: [{ ...discovered, credentialRef: "other-key" }],
        },
      }),
    );
    assert.throws(() =>
      resolvePiModelSelection({
        ...args,
        catalog: {
          ...args.catalog,
          models: [
            { ...discovered, source: "bundled", credentialRef: undefined },
          ],
        },
      }),
    );
    assert.throws(() =>
      resolvePiModelSelection({
        ...args,
        catalog: {
          ...args.catalog,
          models: [{ ...discovered, contextWindow: 0 }],
        },
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
        credentials: [{ id: "wrong-kind", kind: "openai-codex" }],
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
});

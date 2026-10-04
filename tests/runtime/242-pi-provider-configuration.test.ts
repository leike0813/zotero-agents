import { assert } from "chai";
import manifest from "../../package.json";
import { getPref, setPref } from "../../src/utils/prefs";
import {
  listPiModelConfigurationChoices,
  loadPiProviderConfigurationState,
  PiProviderConfigurationFailure,
  piModelConfigurationBindingIdentity,
  removePiModelConfiguration,
  removePiProviderConnection,
  resolvePiModelAvailability,
  resolvePiModelSelection,
  savePiProviderConnection,
  setPiProviderDefaults,
  upsertPiModelConfiguration,
  upsertPiProviderConnection,
} from "../../src/modules/piProviderConfiguration";
import { getPiProviderConnectionSupport } from "../../src/modules/piProviderExecution";
import { scanPiCredentialReferences } from "../../src/shared/piCredentialReferenceScan";
import {
  applyPiMcpSourceChange,
  loadPiMcpSourceRegistry,
} from "../../src/modules/piMcpSourceRegistry";
import {
  listPiCredentials,
  readPiCredential,
} from "../../src/modules/piCredentialStore";

describe("Pi provider configuration", function () {
  const original = {
    configuration: "",
    credential: "",
    mcp: "",
    web: "",
  };
  beforeEach(function () {
    original.configuration = String(
      getPref("piProviderConfigurationJson") || "",
    );
    original.credential = String(getPref("piCredentialEncryptedJson") || "");
    original.mcp = String(getPref("piMcpSourceRegistryJson") || "");
    original.web = String(getPref("piWebSourcesJson") || "");
    setPref("piProviderConfigurationJson", "");
    setPref("piCredentialEncryptedJson", "");
    setPref("piMcpSourceRegistryJson", "");
    setPref("piWebSourcesJson", "");
  });
  afterEach(function () {
    setPref("piProviderConfigurationJson", original.configuration);
    setPref("piCredentialEncryptedJson", original.credential);
    setPref("piMcpSourceRegistryJson", original.mcp);
    setPref("piWebSourcesJson", original.web);
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
  const other = { ...model, id: "gpt-other", name: "Other" };
  const catalog = { revision: "rev-1", models: [model, other] };
  const credentials = [
    { id: "key-a", kind: "api-key" as const },
    { id: "key-b", kind: "api-key" as const },
  ];
  const select = (configurationId: string) => ({ configurationId });

  const connection = (over: Record<string, unknown> = {}) => ({
    id: "conn",
    label: "Connection",
    provider: "openai",
    authVariant: "api-key" as const,
    enabled: true,
    ...over,
  });
  const card = (over: Record<string, unknown> = {}) => ({
    id: "card",
    connectionId: "conn",
    modelId: "gpt-test",
    enabled: true,
    ...over,
  });
  const state = () => loadPiProviderConfigurationState();
  const failureCode = (read: () => unknown) => {
    try {
      read();
    } catch (error) {
      return error instanceof PiProviderConfigurationFailure
        ? error.code
        : `unexpected: ${String(error)}`;
    }
    return "no failure";
  };

  it("shares one target and authentication across two models of one connection", function () {
    upsertPiProviderConnection(connection({ credentialRef: "key-a" }));
    upsertPiModelConfiguration(card({ reasoning: "low" }), { models: [model] });
    upsertPiModelConfiguration(
      card({ id: "card-2", modelId: "gpt-other", reasoning: "high" }),
      { models: [model, other] },
    );
    setPiProviderDefaults(
      { global: select("card-2"), auxiliary: select("card") },
      credentials,
      { models: [model, other] },
    );
    const auxiliary = resolvePiModelSelection({
      kind: "conversation",
      catalog,
      credentials,
      explicit: select("card"),
    });
    const main = resolvePiModelSelection({
      kind: "conversation",
      catalog,
      credentials,
    });
    assert.equal(auxiliary.connectionId, main.connectionId);
    assert.equal(auxiliary.api, main.api);
    assert.equal(auxiliary.baseUrl, main.baseUrl);
    assert.equal(auxiliary.credentialRef, "key-a");
    assert.equal(main.credentialRef, "key-a");
    assert.equal(auxiliary.modelId, "gpt-test");
    assert.equal(auxiliary.reasoning, "low");
    assert.equal(main.configurationId, "card-2");
    assert.equal(main.modelId, "gpt-other");
    assert.equal(main.reasoning, "high");
    assert.lengthOf(state().connections, 1);
    assert.lengthOf(state().configurations, 2);
  });

  it("applies explicit precedence and refuses any implicit fallback", function () {
    upsertPiProviderConnection(connection({ credentialRef: "key-a" }));
    upsertPiModelConfiguration(card({ id: "a" }), { models: [model] });
    upsertPiModelConfiguration(card({ id: "b", modelId: "gpt-other" }), {
      models: [model, other],
    });
    setPiProviderDefaults(
      { global: select("a"), conversation: select("b") },
      credentials,
      { models: [model, other] },
    );
    assert.equal(
      resolvePiModelSelection({ kind: "conversation", catalog, credentials })
        .configurationId,
      "b",
    );
    assert.equal(
      resolvePiModelSelection({
        kind: "conversation",
        catalog,
        credentials,
        ownerSelection: select("a"),
      }).configurationId,
      "a",
    );
    assert.equal(
      resolvePiModelSelection({
        kind: "conversation",
        catalog,
        credentials,
        ownerSelection: select("a"),
        explicit: select("b"),
      }).configurationId,
      "b",
    );
    setPiProviderDefaults({}, credentials, { models: [model, other] });
    assert.throws(
      () =>
        resolvePiModelSelection({ kind: "conversation", catalog, credentials }),
      /No Pi provider configuration is available/,
    );
  });

  it("retains default references across an edit and reports the reason", function () {
    upsertPiProviderConnection(connection({ credentialRef: "key-a" }));
    upsertPiModelConfiguration(card(), { models: [model] });
    setPiProviderDefaults(
      { global: select("card"), conversation: select("card") },
      credentials,
      { models: [model] },
    );
    upsertPiProviderConnection(
      connection({ credentialRef: "key-a", enabled: false }),
    );
    assert.equal(state().defaults.global?.configurationId, "card");
    assert.equal(state().defaults.conversation?.configurationId, "card");
    const availability = resolvePiModelAvailability({
      configurationId: "card",
      catalog,
      credentials,
    });
    assert.isFalse(availability.usable);
    assert.match(
      availability.usable ? "" : availability.reason,
      /connection is disabled/,
    );
    assert.throws(
      () =>
        resolvePiModelSelection({ kind: "conversation", catalog, credentials }),
      /disabled/,
    );
    upsertPiProviderConnection(connection({ credentialRef: "key-a" }));
    assert.equal(
      resolvePiModelSelection({ kind: "conversation", catalog, credentials })
        .configurationId,
      "card",
    );
  });

  it("rejects a default that cannot run and leaves the saved ones alone", function () {
    upsertPiProviderConnection(connection({ credentialRef: "key-a" }));
    upsertPiModelConfiguration(card({ id: "a" }), { models: [model] });
    upsertPiModelConfiguration(card({ id: "b", modelId: "gpt-other" }), {
      models: [model, other],
    });
    setPiProviderDefaults({ global: select("a") }, credentials, {
      models: [model, other],
    });
    assert.throws(
      () =>
        setPiProviderDefaults(
          { global: { configurationId: "b", reasoning: "max" } },
          credentials,
          { models: [model, other] },
        ),
      /reasoning/i,
    );
    assert.throws(
      () =>
        setPiProviderDefaults({ global: select("missing") }, credentials, {
          models: [model],
        }),
      /unavailable/i,
    );
    assert.throws(
      () =>
        setPiProviderDefaults(
          { global: select("b") },
          [{ id: "key-a", kind: "chatgpt" as const }],
          { models: [model, other] },
        ),
      /unavailable/i,
    );
    assert.equal(state().defaults.global?.configurationId, "a");
  });

  it("clears only the removed card's own purposes", function () {
    upsertPiProviderConnection(connection({ credentialRef: "key-a" }));
    upsertPiModelConfiguration(card({ id: "a" }), { models: [model] });
    upsertPiModelConfiguration(card({ id: "b", modelId: "gpt-other" }), {
      models: [model, other],
    });
    setPiProviderDefaults(
      {
        global: select("b"),
        conversation: select("a"),
        skillRun: select("a"),
        auxiliary: select("b"),
      },
      credentials,
      { models: [model, other] },
    );
    removePiModelConfiguration("a");
    const after = state();
    assert.equal(after.defaults.conversation, undefined);
    assert.equal(after.defaults.skillRun, undefined);
    assert.equal(after.defaults.global?.configurationId, "b");
    assert.equal(after.defaults.auxiliary?.configurationId, "b");
    assert.lengthOf(after.connections, 1);
    assert.lengthOf(after.configurations, 1);
    assert.equal(after.connections[0].credentialRef, "key-a");
    assert.equal(
      resolvePiModelSelection({ kind: "conversation", catalog, credentials })
        .configurationId,
      "b",
    );
  });

  it("removes a connection's cards and keeps a key another connection names", async function () {
    upsertPiProviderConnection(
      connection({ id: "shared", credentialRef: "key-a" }),
    );
    upsertPiProviderConnection(
      connection({ id: "other", credentialRef: "key-a" }),
    );
    upsertPiModelConfiguration(card({ id: "a", connectionId: "shared" }), {
      models: [model],
    });
    upsertPiModelConfiguration(
      card({ id: "b", connectionId: "shared", modelId: "gpt-other" }),
      { models: [model, other] },
    );
    setPiProviderDefaults(
      { global: select("a"), conversation: select("b") },
      credentials,
      { models: [model, other] },
    );
    const removal = await removePiProviderConnection("shared");
    assert.deepEqual(removal.removedModelConfigurationIds, ["a", "b"]);
    assert.deepEqual(removal.clearedDefaultKeys, ["global", "conversation"]);
    assert.deepEqual(removal.releasedCredentialIds, []);
    assert.deepEqual(removal.retainedCredentialIds, ["key-a"]);
    assert.lengthOf(state().configurations, 0);
    assert.deepEqual(
      state().connections.map((entry) => entry.id),
      ["other"],
    );
  });

  it("releases an api key at its last reference but never a ChatGPT registration", async function () {
    await savePiProviderConnection({
      connection: connection({ credentialRef: "key-a" }),
      catalog: { models: [model] },
      secret: "secret-a",
    });
    upsertPiModelConfiguration(card(), { models: [model] });
    const released = await removePiProviderConnection("conn");
    assert.deepEqual(released.releasedCredentialIds, ["key-a"]);
    assert.isFalse((await readPiCredential("key-a")).ok);

    upsertPiProviderConnection(
      connection({
        id: "chatgpt",
        authVariant: "chatgpt" as const,
        credentialRef: "chatgpt-a",
      }),
    );
    const registration = await removePiProviderConnection("chatgpt");
    assert.deepEqual(registration.releasedCredentialIds, []);
  });

  it("keeps a key a real MCP source's credential slot still names", async function () {
    await savePiProviderConnection({
      connection: connection({ credentialRef: "key-a" }),
      catalog: { models: [model] },
      secret: "secret-a",
    });
    // The MCP owner is the only thing that mints a slot ref, so the shared
    // reference is built from a source it really saved rather than a fixture.
    await applyPiMcpSourceChange({
      sources: [
        {
          id: "shared",
          label: "Shared",
          transport: "http",
          enabled: true,
          url: "https://example.org/mcp",
          authentication: { kind: "bearer", field: "Authorization" },
          bindings: [{ field: "Authorization", secret: "fixture-token" }],
        },
      ],
    });
    const slotRef =
      loadPiMcpSourceRegistry().sources[0].credentialSlots.Authorization;
    assert.isString(slotRef);
    // The scan reads the slot the MCP registry really wrote.
    const scanned = scanPiCredentialReferences([
      getPref("piMcpSourceRegistryJson"),
    ]);
    assert.isTrue(scanned.referenced.has(slotRef));
    // A connection naming that ref is a real cross-namespace shared reference:
    // the credential belongs to the MCP source's namespace and the connection
    // only points at it.
    upsertPiProviderConnection(
      connection({ id: "borrowed", credentialRef: slotRef }),
    );
    const removal = await removePiProviderConnection("conn");
    assert.deepEqual(removal.retainedCredentialIds, []);
    assert.isFalse((await readPiCredential("key-a")).ok);
    const borrowed = await removePiProviderConnection("borrowed");
    assert.deepEqual(borrowed.retainedCredentialIds, [slotRef]);
    assert.isTrue((await readPiCredential(slotRef, "mcp-source")).ok);
  });

  it("keeps a key another connection in the same namespace still names", async function () {
    await savePiProviderConnection({
      connection: connection({ credentialRef: "key-a" }),
      catalog: { models: [model] },
      secret: "secret-a",
    });
    upsertPiProviderConnection(
      connection({ id: "other", credentialRef: "key-a" }),
    );
    const removal = await removePiProviderConnection("conn");
    assert.deepEqual(removal.retainedCredentialIds, ["key-a"]);
    assert.isTrue((await readPiCredential("key-a")).ok);
  });

  it("keeps a key when a source document cannot be read", async function () {
    await savePiProviderConnection({
      connection: connection({ credentialRef: "key-a" }),
      catalog: { models: [model] },
      secret: "secret-a",
    });
    // A damaged source document is not evidence that nothing else uses the key.
    setPref("piMcpSourceRegistryJson", "{broken");
    const damaged = await removePiProviderConnection("conn");
    assert.deepEqual(damaged.retainedCredentialIds, ["key-a"]);
    assert.isTrue((await readPiCredential("key-a")).ok);
  });

  it("saves a connection and its secret as one operation without an orphan", async function () {
    const saved = await savePiProviderConnection({
      connection: connection({ credentialRef: "key-a" }),
      catalog: { models: [model] },
      secret: "secret-a",
      secretLabel: "Primary",
    });
    assert.equal(saved.credential?.id, "key-a");
    assert.lengthOf(saved.state.connections, 1);
    assert.isTrue((await readPiCredential("key-a")).ok);
    assert.equal(listPiCredentials()[0].label, "Primary");
    assert.equal(saved.state.connections[0].binding?.baseUrl, model.baseUrl);
    assert.equal(saved.state.connections[0].binding?.api, model.api);
  });

  it("refuses a connection before writing a secret, so no orphan key survives", async function () {
    setPref("piProviderConfigurationJson", "{broken");
    let failure: unknown;
    try {
      await savePiProviderConnection({
        connection: connection({ credentialRef: "key-a" }),
        catalog: { models: [model] },
        secret: "secret-a",
      });
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, PiProviderConfigurationFailure);
    assert.isFalse((await readPiCredential("key-a")).ok);
    assert.deepEqual(listPiCredentials(), []);
  });

  it("reports an incompatible or damaged document instead of resetting it", function () {
    setPref(
      "piProviderConfigurationJson",
      JSON.stringify({ version: 1, configurations: [], defaults: {} }),
    );
    assert.equal(
      failureCode(() => state()),
      "document_incompatible",
    );
    setPref("piProviderConfigurationJson", "{broken");
    assert.equal(
      failureCode(() => state()),
      "document_invalid",
    );
    assert.equal(getPref("piProviderConfigurationJson"), "{broken");
  });

  it("keeps a saved card description across a directory drop and blocks retirement", function () {
    upsertPiProviderConnection(connection({ credentialRef: "key-a" }));
    upsertPiModelConfiguration(card(), { models: [model] });
    setPiProviderDefaults({ global: select("card") }, credentials, {
      models: [model],
    });
    const missing = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev-2", models: [] },
      credentials,
    });
    assert.equal(missing.modelId, "gpt-test");
    assert.equal(missing.baseUrl, model.baseUrl);
    assert.equal(missing.metadata?.availability, "missing");
    assert.equal(missing.metadata?.knowledge?.context, "known");

    setPref("piProviderConfigurationJson", "");
    upsertPiProviderConnection(connection({ credentialRef: "key-a" }));
    upsertPiModelConfiguration(card(), {
      models: [{ ...model, availability: "retired" }],
    });
    assert.throws(
      () =>
        resolvePiModelSelection({
          kind: "conversation",
          explicit: select("card"),
          catalog: {
            revision: "rev",
            models: [{ ...model, availability: "retired" }],
          },
          credentials,
        }),
      /retired/i,
    );
  });

  it("keeps a connection on its accepted target when a directory moves the endpoint", function () {
    upsertPiProviderConnection(connection({ credentialRef: "key-a" }));
    upsertPiModelConfiguration(card(), { models: [model] });
    setPiProviderDefaults({ global: select("card") }, credentials, {
      models: [model],
    });
    assert.equal(state().connections[0].binding?.revision, 1);
    assert.equal(state().connections[0].binding?.baseUrl, model.baseUrl);
    const moved = { ...model, baseUrl: "https://moved.example/v1" };
    const frozen = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev-2", models: [moved] },
      credentials,
    });
    assert.equal(frozen.baseUrl, model.baseUrl);
    assert.equal(frozen.api, model.api);
    assert.equal(frozen.bindingRevision, 1);
    upsertPiProviderConnection(
      connection({
        credentialRef: "key-a",
        baseUrl: "https://gateway.example/v1",
        api: "openai-responses",
      }),
    );
    assert.equal(state().connections[0].binding?.revision, 2);
    assert.equal(
      state().connections[0].binding?.baseUrl,
      "https://gateway.example/v1",
    );
  });

  it("withholds another target's directory facts from a custom endpoint", function () {
    const priced = {
      ...model,
      cost: { input: 1, output: 2, cacheRead: 0.5, cacheWrite: 1.5 },
      authVariants: ["api-key", "none"] as const,
      provenance: {
        source: "official" as const,
        revision: "sha256-1",
        schemaVersion: 1,
      },
    };
    upsertPiProviderConnection(
      connection({ id: "official", credentialRef: "key-a" }),
    );
    upsertPiModelConfiguration(
      card({ id: "official", connectionId: "official" }),
      { models: [priced] },
    );
    setPiProviderDefaults({ global: select("official") }, credentials, {
      models: [priced],
    });
    const frozen = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev", models: [priced] },
      credentials,
    });
    assert.equal(frozen.metadata?.cost?.input, 1);
    assert.equal(frozen.metadata?.knowledge?.tools, "known");
    assert.equal(
      frozen.runtimeVersion,
      manifest.dependencies["@earendil-works/pi-agent-core"],
    );
    assert.equal(
      frozen.adapterVersion,
      manifest.dependencies["@earendil-works/pi-ai"],
    );
    assert.isTrue(Object.isFrozen(frozen));
    assert.notInclude(JSON.stringify(frozen), "secret-a");

    upsertPiProviderConnection(
      connection({
        id: "custom",
        credentialRef: "key-a",
        baseUrl: "https://gateway.example/v1",
        api: "openai-responses",
      }),
    );
    upsertPiModelConfiguration(card({ id: "custom", connectionId: "custom" }), {
      models: [priced],
    });
    const custom = resolvePiModelSelection({
      kind: "conversation",
      catalog: { revision: "rev", models: [priced] },
      credentials,
      explicit: select("custom"),
    });
    assert.equal(custom.baseUrl, "https://gateway.example/v1");
    assert.isUndefined(custom.metadata?.cost);
    assert.equal(custom.metadata?.knowledge?.tools, "unknown");
  });

  it("selects ChatGPT discoveries only for their registration", function () {
    for (const [id, credentialRef] of [
      ["chatgpt-a", "chatgpt-a-key"],
      ["chatgpt-b", "chatgpt-b-key"],
    ] as const) {
      upsertPiProviderConnection(
        connection({ id, authVariant: "chatgpt" as const, credentialRef }),
      );
      upsertPiModelConfiguration(
        card({ id, connectionId: id, modelId: "gpt-shared", reasoning: "low" }),
      );
    }
    const discoveredA = {
      ...model,
      id: "gpt-shared",
      maxTokens: 0,
      source: "discovered" as const,
      credentialRef: "chatgpt-a-key",
      authVariants: ["chatgpt"] as const,
      cost: undefined,
    };
    const publicModel = {
      ...model,
      id: "gpt-shared",
      contextWindow: 9000,
      maxTokens: 800,
      authVariants: ["api-key"] as const,
    };
    const args = {
      kind: "conversation" as const,
      credentials: [
        { id: "chatgpt-a-key", kind: "chatgpt" as const },
        { id: "chatgpt-b-key", kind: "chatgpt" as const },
      ],
      catalog: {
        revision: "discovered",
        models: [publicModel, discoveredA],
      },
    };
    const selected = resolvePiModelSelection({
      ...args,
      explicit: select("chatgpt-a"),
    });
    assert.equal(selected.baseUrl, "https://api.openai.com/v1");
    assert.equal(selected.policy.maxTokens, 0);
    assert.isUndefined(selected.metadata?.cost);
    assert.throws(
      () =>
        resolvePiModelSelection({
          ...args,
          explicit: select("chatgpt-b"),
          catalog: { revision: "empty", models: [discoveredA] },
        }),
      /absent from catalog/,
    );
    assert.throws(
      () =>
        resolvePiModelSelection({
          ...args,
          explicit: select("chatgpt-a"),
          catalog: {
            revision: "bundled",
            models: [
              { ...discoveredA, source: "bundled", credentialRef: undefined },
            ],
          },
        }),
      /absent from catalog/,
    );
    assert.throws(
      () =>
        upsertPiProviderConnection(
          connection({
            id: "chatgpt-custom",
            authVariant: "chatgpt" as const,
            credentialRef: "chatgpt-a-key",
            baseUrl: "https://example.com/v1",
            api: "openai-responses",
          }),
        ),
      /official OpenAI Responses target/,
    );
  });

  it("rejects remote HTTP, a dialect-less custom endpoint and an unsupported reasoning level", function () {
    assert.throws(
      () =>
        upsertPiProviderConnection(
          connection({
            id: "bad",
            provider: "custom",
            authVariant: "none" as const,
            baseUrl: "http://example.com/v1",
            api: "openai-completions",
          }),
        ),
      /https|endpoint/i,
    );
    assert.throws(() =>
      upsertPiProviderConnection(
        connection({
          id: "mapped",
          provider: "custom",
          authVariant: "none" as const,
          baseUrl: "http://[::ffff:8.8.8.8]/v1",
          api: "openai-completions",
        }),
      ),
    );
    assert.throws(
      () =>
        upsertPiProviderConnection(
          connection({
            id: "a",
            authVariant: "none" as const,
            baseUrl: "https://api.example.com/v1",
          }),
        ),
      /requires an API dialect/,
    );
    upsertPiProviderConnection(
      connection({
        id: "a",
        authVariant: "none" as const,
        baseUrl: "https://api.example.com/v1",
        api: "openai-responses",
      }),
    );
    upsertPiModelConfiguration(card({ connectionId: "a" }), {
      models: [model],
    });
    assert.throws(
      () =>
        resolvePiModelSelection({
          kind: "conversation",
          catalog,
          explicit: { configurationId: "card", reasoning: "max" },
        }),
      /reasoning/i,
    );
  });

  it("keeps evidence applicable across a rename and invalidates it on a real change", function () {
    upsertPiProviderConnection(
      connection({ credentialRef: "key-a", label: "First" }),
    );
    upsertPiModelConfiguration(card(), { models: [model] });
    const before = piModelConfigurationBindingIdentity({
      configurationId: "card",
    });
    assert.isString(before);
    upsertPiProviderConnection(
      connection({ credentialRef: "key-a", label: "Renamed" }),
    );
    assert.equal(
      piModelConfigurationBindingIdentity({ configurationId: "card" }),
      before,
    );
    upsertPiProviderConnection(
      connection({
        credentialRef: "key-a",
        label: "Renamed",
        baseUrl: "https://gateway.example/v1",
        api: "openai-responses",
      }),
    );
    assert.notEqual(
      piModelConfigurationBindingIdentity({ configurationId: "card" }),
      before,
    );
    upsertPiProviderConnection(
      connection({ credentialRef: "key-b", label: "Renamed" }),
    );
    assert.notEqual(
      piModelConfigurationBindingIdentity({ configurationId: "card" }),
      before,
    );
    assert.isUndefined(
      piModelConfigurationBindingIdentity({ configurationId: "missing" }),
    );
  });

  it("projects the pickable cards with the names this owner owns", function () {
    upsertPiProviderConnection(
      connection({ credentialRef: "key-a", label: "Team key" }),
    );
    upsertPiModelConfiguration(card({ id: "a" }));
    upsertPiModelConfiguration(card({ id: "b", modelId: "gpt-other" }), {
      models: [model, other],
    });
    upsertPiModelConfiguration(
      card({ id: "off", modelId: "gpt-other", enabled: false }),
      { models: [model, other] },
    );
    setPiProviderDefaults({ global: select("a") }, credentials, {
      models: [model, other],
    });
    const choices = listPiModelConfigurationChoices();
    assert.deepEqual(
      choices.map((entry) => entry.id),
      ["a", "b"],
    );
    assert.equal(choices[0].label, "Team key · gpt-test");
    assert.deepEqual(choices[0].purposes, ["global"]);
    assert.deepEqual(choices[1].purposes, []);
    assert.lengthOf(
      listPiModelConfigurationChoices({ includeDisabled: true }),
      3,
    );
  });

  it("projects execution capability instead of guessing from a provider name", function () {
    assert.deepEqual(getPiProviderConnectionSupport({ provider: "openai" }), {
      supported: true,
      api: "openai-responses",
      authVariants: ["api-key", "chatgpt"],
      subscription: false,
    });
    const plain = getPiProviderConnectionSupport({
      provider: "openai",
      authVariant: "api-key",
    });
    assert.isTrue(plain.supported);
    assert.deepEqual(
      getPiProviderConnectionSupport({
        provider: "openai",
        authVariant: "chatgpt",
      }),
      {
        supported: true,
        api: "openai-responses",
        authVariants: ["api-key", "chatgpt"],
        subscription: true,
      },
    );
    const elsewhere = getPiProviderConnectionSupport({
      provider: "openai",
      authVariant: "chatgpt",
      baseUrl: "https://gateway.example/v1",
    });
    assert.isFalse(elsewhere.supported);
    for (const provider of ["azure", "bedrock", "openrouter"]) {
      const support = getPiProviderConnectionSupport({ provider });
      assert.isFalse(support.supported, provider);
      assert.match(
        support.supported ? "" : support.reason,
        /No execution adapter/,
      );
    }
    const mismatched = getPiProviderConnectionSupport({
      provider: "anthropic",
      authVariant: "chatgpt",
    });
    assert.isFalse(mismatched.supported);
    const unusableRow = getPiProviderConnectionSupport({
      provider: "openai",
      api: "bedrock-converse-stream",
    });
    assert.isFalse(unusableRow.supported);
  });
});

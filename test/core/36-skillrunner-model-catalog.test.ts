import { assert } from "chai";
import {
  getDefaultSkillRunnerEngine,
  getSkillRunnerCanonicalProviderId,
  isSkillRunnerProviderScopedEngine,
  listSkillRunnerEngines,
  listSkillRunnerModelEffortOptions,
  listSkillRunnerModelOptions,
  listSkillRunnerModelOptionsForProvider,
  listSkillRunnerModelProviders,
  normalizeSkillRunnerModel,
} from "../../src/providers/skillrunner/modelCatalog";
import {
  clearSkillRunnerModelCache,
  upsertSkillRunnerModelCacheEntry,
} from "../../src/providers/skillrunner/modelCache";
import { resolveProviderById } from "../../src/providers/registry";
import { config } from "../../package.json";

describe("skillrunner model catalog", function () {
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

  it("exposes engines from bundled static catalog", function () {
    const engines = listSkillRunnerEngines();
    assert.includeMembers(engines, ["codex", "gemini", "iflow"]);
    assert.equal(getDefaultSkillRunnerEngine(), "gemini");
  });

  it("returns latest snapshot model list for a selected engine", function () {
    const geminiModels = listSkillRunnerModelOptions("gemini").map(
      (entry) => entry.value,
    );
    assert.include(geminiModels, "gemini-3.1-pro-preview");
    assert.notInclude(geminiModels, "gpt-4");
  });

  it("normalizes model by selected engine", function () {
    assert.equal(
      normalizeSkillRunnerModel("gemini", "gemini-2.5-flash"),
      "gemini-2.5-flash",
    );
    assert.equal(normalizeSkillRunnerModel("gemini", "gpt-4"), "");
  });

  it("provides engine/model enum values via provider runtime schema hooks", function () {
    const provider = resolveProviderById("skillrunner");
    const schema = provider.getRuntimeOptionSchema?.() || {};
    assert.includeMembers(schema.engine?.enum || [], [
      "codex",
      "gemini",
      "iflow",
    ]);
    assert.equal(schema.effort?.default, "default");

    const modelEnum = provider.getRuntimeOptionEnumValues?.({
      key: "model",
      options: { engine: "gemini" },
    });
    assert.include(modelEnum || [], "gemini-2.5-pro");

    const modelProviderEnum = provider.getRuntimeOptionEnumValues?.({
      key: "provider_id",
      options: { engine: "gemini" },
    });
    assert.deepEqual(modelProviderEnum || [], []);

    const effortEnum = provider.getRuntimeOptionEnumValues?.({
      key: "effort",
      options: { engine: "codex", model: "gpt-5.2" },
    });
    assert.deepEqual(effortEnum || [], [
      "default",
      "low",
      "medium",
      "high",
      "xhigh",
    ]);
  });

  it("exposes ACP permission auto-approval as a default-off runtime option", function () {
    const provider = resolveProviderById("acp");
    const schema = provider.getRuntimeOptionSchema?.() || {};
    assert.equal(schema.autoApproveAcpPermissions?.type, "boolean");
    assert.isFalse(schema.autoApproveAcpPermissions?.default as boolean);

    const normalizedWithoutCache = provider.normalizeRuntimeOptions?.(
      {
        acpModeId: "ignored-without-cache",
        autoApproveAcpPermissions: true,
      },
      {
        id: "acp-no-cache",
        type: "acp",
        baseUrl: "local://acp-no-cache",
        auth: { kind: "none" },
      } as any,
    );
    assert.deepEqual(normalizedWithoutCache, {
      autoApproveAcpPermissions: true,
    });
  });

  it("prefers backend-scoped model cache when available", function () {
    upsertSkillRunnerModelCacheEntry({
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
      updatedAt: "2026-03-11T00:00:00.000Z",
      engines: ["opencode"],
      modelsByEngine: {
        opencode: [
          {
            id: "openai/gpt-5",
            display_name: "OpenAI GPT-5",
            provider_id: "openai",
            provider: "openai",
            model: "gpt-5",
            deprecated: false,
          },
          {
            provider_id: "anthropic",
            provider: "anthropic",
            model: "claude-sonnet-4",
            display_name: "Claude Sonnet 4",
            deprecated: false,
          },
        ],
      },
    });

    const engines = listSkillRunnerEngines({
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
    });
    assert.deepEqual(engines, ["opencode"]);

    const modelEnum = listSkillRunnerModelOptions("opencode", {
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
    }).map((entry) => entry.value);
    assert.includeMembers(modelEnum, [
      "openai/gpt-5",
      "anthropic/claude-sonnet-4",
    ]);

    const providers = listSkillRunnerModelProviders("opencode", {
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
    });
    assert.deepEqual(providers, ["anthropic", "openai"]);

    const openaiModelEnum = listSkillRunnerModelOptionsForProvider(
      "opencode",
      "openai",
      {
        backendId: "skillrunner-local",
        baseUrl: "http://127.0.0.1:8030",
      },
    ).map((entry) => entry.value);
    assert.deepEqual(openaiModelEnum, ["gpt-5"]);
  });

  it("falls back to bundled catalog when backend-scoped cache is missing", function () {
    upsertSkillRunnerModelCacheEntry({
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
      updatedAt: "2026-03-11T00:00:00.000Z",
      engines: ["opencode"],
      modelsByEngine: {
        opencode: [
          {
            id: "openai/gpt-5",
            display_name: "OpenAI GPT-5",
            deprecated: false,
          },
        ],
      },
    });

    const engines = listSkillRunnerEngines({
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:19030",
    });
    assert.includeMembers(engines, ["codex", "gemini", "iflow"]);
    assert.notInclude(engines, "opencode");
  });

  it("filters opencode model enum by provider_id in provider hooks", function () {
    upsertSkillRunnerModelCacheEntry({
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
      updatedAt: "2026-03-11T00:00:00.000Z",
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
          },
          {
            id: "anthropic/claude-sonnet-4",
            provider_id: "anthropic",
            provider: "anthropic",
            model: "claude-sonnet-4",
            display_name: "Claude Sonnet 4",
            deprecated: false,
          },
        ],
      },
    });

    const provider = resolveProviderById("skillrunner");
    const modelProviderEnum = provider.getRuntimeOptionEnumValues?.({
      key: "provider_id",
      options: { engine: "opencode" },
      backend: {
        id: "skillrunner-local",
        type: "skillrunner",
        baseUrl: "http://127.0.0.1:8030",
        auth: { kind: "none" },
      },
    });
    assert.deepEqual(modelProviderEnum || [], ["anthropic", "openai"]);

    const modelEnum = provider.getRuntimeOptionEnumValues?.({
      key: "model",
      options: {
        engine: "opencode",
        provider_id: "openai",
      },
      backend: {
        id: "skillrunner-local",
        type: "skillrunner",
        baseUrl: "http://127.0.0.1:8030",
        auth: { kind: "none" },
      },
    });
    assert.deepEqual(modelEnum || [], ["gpt-5"]);

    const emptyProviderModelEnum = provider.getRuntimeOptionEnumValues?.({
      key: "model",
      options: {
        engine: "opencode",
      },
      backend: {
        id: "skillrunner-local",
        type: "skillrunner",
        baseUrl: "http://127.0.0.1:8030",
        auth: { kind: "none" },
      },
    });
    assert.deepEqual(emptyProviderModelEnum || [], []);
  });

  it("normalizes opencode provider-scoped model name to canonical model id", function () {
    upsertSkillRunnerModelCacheEntry({
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
      updatedAt: "2026-03-11T00:00:00.000Z",
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

    const provider = resolveProviderById("skillrunner");
    const normalized = provider.normalizeRuntimeOptions?.(
      {
        engine: "opencode",
        provider_id: "alibaba-coding-plan-cn",
        model: "qwen-3.5-plus",
      },
      {
        id: "skillrunner-local",
        type: "skillrunner",
        baseUrl: "http://127.0.0.1:8030",
        auth: { kind: "none" },
      },
    );
    assert.equal(normalized?.provider_id, "alibaba-coding-plan-cn");
    assert.equal(normalized?.model, "qwen-3.5-plus");
  });

  it("treats qwen and claude catalogs as provider-scoped when backend cache exposes provider_id", function () {
    upsertSkillRunnerModelCacheEntry({
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
      updatedAt: "2026-04-05T00:00:00.000Z",
      engines: ["qwen", "claude"],
      modelsByEngine: {
        qwen: [
          {
            id: "dashscope/qwen-max",
            provider_id: "dashscope",
            provider: "dashscope",
            model: "qwen-max",
            display_name: "Qwen Max",
          },
          {
            id: "coding-plan/qwen-plus",
            provider_id: "coding-plan",
            provider: "coding-plan",
            model: "qwen-plus",
            display_name: "Qwen Plus",
          },
        ],
        claude: [
          {
            id: "anthropic/claude-sonnet-4",
            provider_id: "anthropic",
            provider: "anthropic",
            model: "claude-sonnet-4",
            display_name: "Claude Sonnet 4",
          },
          {
            id: "proxy/claude-sonnet-4",
            provider_id: "proxy",
            provider: "proxy",
            model: "claude-sonnet-4",
            display_name: "Claude Sonnet 4 Proxy",
          },
        ],
      },
    });

    const scope = {
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
    };
    assert.isTrue(isSkillRunnerProviderScopedEngine("qwen", scope));
    assert.isTrue(isSkillRunnerProviderScopedEngine("claude", scope));
    assert.deepEqual(listSkillRunnerModelProviders("qwen", scope), [
      "coding-plan",
      "dashscope",
    ]);
    assert.deepEqual(
      listSkillRunnerModelOptionsForProvider("qwen", "dashscope", scope).map(
        (entry) => entry.value,
      ),
      ["qwen-max"],
    );
    assert.deepEqual(listSkillRunnerModelProviders("claude", scope), [
      "anthropic",
      "proxy",
    ]);
  });

  it("preserves supported_effort metadata and falls back to default for unsupported models", function () {
    assert.equal(getSkillRunnerCanonicalProviderId("codex"), "openai");
    assert.equal(getSkillRunnerCanonicalProviderId("gemini"), "google");
    assert.equal(getSkillRunnerCanonicalProviderId("iflow"), "iflowcn");

    assert.deepEqual(
      listSkillRunnerModelEffortOptions({
        engine: "codex",
        provider: "openai",
        model: "gpt-5.2",
      }),
      ["default", "low", "medium", "high", "xhigh"],
    );
    assert.deepEqual(
      listSkillRunnerModelEffortOptions({
        engine: "gemini",
        provider: "google",
        model: "gemini-2.5-pro",
      }),
      ["default"],
    );
  });
});

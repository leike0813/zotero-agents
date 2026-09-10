import { assert } from "chai";
import { config } from "../../package.json";
import {
  clearSkillRunnerModelCache,
  getSkillRunnerModelCacheEntry,
  refreshSkillRunnerModelCacheForBackend,
  startSkillRunnerModelCacheAutoRefresh,
  stopSkillRunnerModelCacheAutoRefresh,
  upsertSkillRunnerModelCacheEntry,
} from "../../src/providers/skillrunner/modelCache";
import type { BackendInstance } from "../../src/backends/types";
import {
  clearRuntimeLogs,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";

function createJsonResponse(payload: unknown, status = 200): Response {
  const text = JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "ERROR",
    text: async () => text,
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
  } as unknown as Response;
}

describe("skillrunner model cache refresh", function () {
  const cachePrefKey = `${config.prefsPrefix}.skillRunnerModelCacheJson`;
  let previousPref: unknown;

  const backend: BackendInstance = {
    id: "skillrunner-local",
    type: "skillrunner",
    baseUrl: "http://127.0.0.1:8030",
    auth: { kind: "none" },
  };

  beforeEach(function () {
    stopSkillRunnerModelCacheAutoRefresh();
    previousPref = Zotero.Prefs.get(cachePrefKey, true);
    clearSkillRunnerModelCache();
    clearRuntimeLogs();
  });

  afterEach(function () {
    stopSkillRunnerModelCacheAutoRefresh();
    if (typeof previousPref === "undefined") {
      Zotero.Prefs.clear(cachePrefKey, true);
    } else {
      Zotero.Prefs.set(cachePrefKey, previousPref, true);
    }
    clearRuntimeLogs();
  });

  it("writes backend-scoped cache on successful refresh", async function () {
    const result = await refreshSkillRunnerModelCacheForBackend({
      backend,
      fetchImpl: async (url: string) => {
        if (url.endsWith("/v1/engines")) {
          return createJsonResponse({
            engines: [{ engine: "gemini" }],
          });
        }
        if (url.endsWith("/v1/engines/gemini/models")) {
          return createJsonResponse({
            engine: "gemini",
            models: [
              {
                id: "gemini-2.5-pro",
                display_name: "Gemini 2.5 Pro",
                deprecated: false,
              },
            ],
          });
        }
        return createJsonResponse({ error: "not found" }, 404);
      },
    });

    assert.isTrue(result.ok);
    const cached = getSkillRunnerModelCacheEntry({
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
    });
    assert.isOk(cached);
    assert.deepEqual(cached?.engines, ["gemini"]);
    assert.equal(cached?.modelsByEngine.gemini?.[0]?.id, "gemini-2.5-pro");
    const refreshLogs = listRuntimeLogs({
      backendId: "skillrunner-local",
      operation: "refresh-skillrunner-model-cache",
    });
    assert.deepEqual(
      refreshLogs.map((entry) => entry.stage),
      [
        "skillrunner-model-cache-refresh-started",
        "skillrunner-model-cache-refresh-ok",
      ],
    );
    assert.equal((refreshLogs[1].details as any).engines, 1);
    assert.equal((refreshLogs[1].details as any).models, 1);
  });

  it("preserves previous cache when refresh fails", async function () {
    upsertSkillRunnerModelCacheEntry({
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
      updatedAt: "2026-03-10T00:00:00.000Z",
      engines: ["codex"],
      modelsByEngine: {
        codex: [
          {
            id: "gpt-5.2-codex",
            display_name: "GPT-5.2 Codex",
            deprecated: false,
          },
        ],
      },
    });

    const result = await refreshSkillRunnerModelCacheForBackend({
      backend,
      fetchImpl: async () => createJsonResponse({ error: "boom" }, 500),
    });

    assert.isFalse(result.ok);
    assert.include(
      listRuntimeLogs({
        backendId: "skillrunner-local",
        operation: "refresh-skillrunner-model-cache",
      }).map((entry) => entry.stage),
      "skillrunner-model-cache-refresh-failed",
    );
    const cached = getSkillRunnerModelCacheEntry({
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
    });
    assert.deepEqual(cached?.engines, ["codex"]);
    assert.equal(cached?.modelsByEngine.codex?.[0]?.id, "gpt-5.2-codex");
  });

  it("parses provider/model fields for opencode models from refresh payload", async function () {
    const result = await refreshSkillRunnerModelCacheForBackend({
      backend,
      fetchImpl: async (url: string) => {
        if (url.endsWith("/v1/engines")) {
          return createJsonResponse({
            engines: [{ engine: "opencode" }],
          });
        }
        if (url.endsWith("/v1/engines/opencode/models")) {
          return createJsonResponse({
            engine: "opencode",
            models: [
              {
                provider_id: "openai",
                provider: "openai",
                model: "gpt-5",
                display_name: "OpenAI GPT-5",
                deprecated: false,
                supported_effort: ["default", "low", "medium", "high"],
              },
            ],
          });
        }
        return createJsonResponse({ error: "not found" }, 404);
      },
    });

    assert.isTrue(result.ok);
    const cached = getSkillRunnerModelCacheEntry({
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
    });
    assert.equal(cached?.modelsByEngine.opencode?.[0]?.id, "openai/gpt-5");
    assert.equal(cached?.modelsByEngine.opencode?.[0]?.provider_id, "openai");
    assert.equal(cached?.modelsByEngine.opencode?.[0]?.provider, "openai");
    assert.equal(cached?.modelsByEngine.opencode?.[0]?.model, "gpt-5");
    assert.deepEqual(cached?.modelsByEngine.opencode?.[0]?.supported_effort, [
      "default",
      "low",
      "medium",
      "high",
    ]);
  });

  it("upgrades legacy cache rows by recovering provider_id from provider or id", function () {
    upsertSkillRunnerModelCacheEntry({
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
      updatedAt: "2026-04-05T00:00:00.000Z",
      engines: ["opencode", "qwen"],
      modelsByEngine: {
        opencode: [
          {
            id: "openai/gpt-5",
            display_name: "OpenAI GPT-5",
            provider: "openai",
            model: "gpt-5",
            supported_effort: ["default", "medium", "high"],
          },
        ],
        qwen: [
          {
            id: "dashscope/qwen-max",
            display_name: "Qwen Max",
            model: "qwen-max",
            supported_effort: ["default"],
          },
        ],
      },
    });

    const cached = getSkillRunnerModelCacheEntry({
      backendId: "skillrunner-local",
      baseUrl: "http://127.0.0.1:8030",
    });
    assert.equal(cached?.modelsByEngine.opencode?.[0]?.provider_id, "openai");
    assert.equal(cached?.modelsByEngine.qwen?.[0]?.provider_id, "dashscope");
    assert.deepEqual(cached?.modelsByEngine.opencode?.[0]?.supported_effort, [
      "default",
      "medium",
      "high",
    ]);
  });

  it("auto-refresh scheduler performs startup refresh and periodic refresh", async function () {
    let refreshCalls = 0;
    const intervals: Array<{ ms: number; fn: () => void }> = [];
    let clearedTimer: unknown = null;
    startSkillRunnerModelCacheAutoRefresh({
      intervalMs: 1000,
      refreshAll: async () => {
        refreshCalls += 1;
      },
      setIntervalFn: ((fn: () => void, ms: number) => {
        intervals.push({ fn, ms });
        return 1 as unknown as ReturnType<typeof setInterval>;
      }) as typeof setInterval,
      clearIntervalFn: ((token: unknown) => {
        clearedTimer = token;
      }) as typeof clearInterval,
    });

    assert.equal(refreshCalls, 1);
    assert.lengthOf(intervals, 1);
    assert.equal(intervals[0].ms, 1000);

    await intervals[0].fn();
    assert.equal(refreshCalls, 2);

    stopSkillRunnerModelCacheAutoRefresh();
    assert.equal(clearedTimer, 1);
  });
});

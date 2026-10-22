import { assert } from "chai";
import { config } from "../../package.json";
import {
  clearSkillRunnerModelCache,
  getSkillRunnerModelCacheEntry,
  refreshAllSkillRunnerModelCaches,
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
  const backendsPrefKey = `${config.prefsPrefix}.backendsConfigJson`;
  let previousPref: unknown;
  let previousBackendsPref: unknown;

  const backend: BackendInstance = {
    id: "skillrunner-local",
    type: "skillrunner",
    baseUrl: "http://127.0.0.1:8030",
    auth: { kind: "none" },
  };

  beforeEach(function () {
    stopSkillRunnerModelCacheAutoRefresh();
    previousPref = Zotero.Prefs.get(cachePrefKey, true);
    previousBackendsPref = Zotero.Prefs.get(backendsPrefKey, true);
    Zotero.Prefs.set(backendsPrefKey, JSON.stringify({ backends: [] }), true);
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
    if (typeof previousBackendsPref === "undefined") {
      Zotero.Prefs.clear(backendsPrefKey, true);
    } else {
      Zotero.Prefs.set(backendsPrefKey, previousBackendsPref, true);
    }
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

  it("shares an in-flight refresh for the same backend request configuration", async function () {
    let release!: (response: Response) => void;
    const response = new Promise<Response>((resolve) => {
      release = resolve;
    });
    let requests = 0;
    const fetchImpl = async () => {
      requests += 1;
      return response;
    };
    const first = refreshSkillRunnerModelCacheForBackend({
      backend,
      fetchImpl,
    });
    const second = refreshSkillRunnerModelCacheForBackend({
      backend: { ...backend, baseUrl: `${backend.baseUrl}/` },
      fetchImpl,
    });
    release(createJsonResponse({ engines: [] }));
    const results = await Promise.all([first, second]);
    assert.isTrue(results.every((result) => result.ok));
    assert.equal(requests, 1);

    await refreshSkillRunnerModelCacheForBackend({ backend, fetchImpl });
    assert.equal(requests, 2);
  });

  for (const stage of ["fetch", "body"] as const) {
    it(`settles stopped refreshes and ignores late ${stage} results after restart`, async function () {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let entered!: () => void;
      const ready = new Promise<void>((resolve) => {
        entered = resolve;
      });
      let signal: AbortSignal | null | undefined;
      let requests = 0;
      const pending = refreshSkillRunnerModelCacheForBackend({
        backend,
        fetchImpl: async (_url, init) => {
          requests += 1;
          signal = init?.signal;
          const response = createJsonResponse({ engines: ["stale"] });
          if (stage === "fetch") {
            entered();
            await gate;
          } else {
            response.text = async () => {
              entered();
              await gate;
              return JSON.stringify({ engines: ["stale"] });
            };
          }
          return response;
        },
      });
      await ready;
      stopSkillRunnerModelCacheAutoRefresh();
      try {
        const stopped = await pending;
        assert.isFalse(stopped.ok);
        assert.isTrue(signal?.aborted);
        const fresh = await refreshSkillRunnerModelCacheForBackend({
          backend,
          fetchImpl: async () => createJsonResponse({ engines: [] }),
        });
        assert.isTrue(fresh.ok);
      } finally {
        release();
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.equal(requests, 1);
      assert.deepEqual(
        getSkillRunnerModelCacheEntry({ backendId: backend.id })?.engines,
        [],
      );
    });
  }

  for (const changed of [
    { baseUrl: "http://127.0.0.1:8031" },
    { auth: { kind: "bearer" as const, token: "new-token" } },
    { defaults: { headers: { "x-tenant": "new-tenant" } } },
  ]) {
    it(`supersedes an in-flight refresh when ${Object.keys(changed)[0]} changes`, async function () {
      let release!: (response: Response) => void;
      const response = new Promise<Response>((resolve) => {
        release = resolve;
      });
      const old = refreshSkillRunnerModelCacheForBackend({
        backend,
        fetchImpl: async () => response,
      });
      const fresh = await refreshSkillRunnerModelCacheForBackend({
        backend: { ...backend, ...changed },
        fetchImpl: async () => createJsonResponse({ engines: [] }),
      });
      assert.isTrue(fresh.ok);
      release(createJsonResponse({ engines: ["stale"] }));
      assert.isFalse((await old).ok);
      assert.deepEqual(
        getSkillRunnerModelCacheEntry({ backendId: backend.id })?.engines,
        [],
      );
    });
  }

  it("does not dispatch a batch whose backend listing finishes after stop", async function () {
    let release!: (backends: BackendInstance[]) => void;
    const backends = new Promise<BackendInstance[]>((resolve) => {
      release = resolve;
    });
    let requests = 0;
    const pending = refreshAllSkillRunnerModelCaches({
      listBackends: () => backends,
      fetchImpl: async () => {
        requests += 1;
        return createJsonResponse({ engines: [] });
      },
    });
    stopSkillRunnerModelCacheAutoRefresh();
    try {
      assert.isFalse((await pending).ok);
    } finally {
      release([backend]);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(requests, 0);
  });

  for (const backends of [
    [],
    [{ ...backend, auth: { kind: "bearer" as const, token: "replacement" } }],
  ]) {
    it(`ignores results after the saved backend is ${backends.length ? "changed" : "removed"}`, async function () {
      Zotero.Prefs.set(
        backendsPrefKey,
        JSON.stringify({ backends: [backend] }),
        true,
      );
      let release!: (response: Response) => void;
      const response = new Promise<Response>((resolve) => {
        release = resolve;
      });
      const pending = refreshSkillRunnerModelCacheForBackend({
        backend,
        fetchImpl: async () => response,
      });
      Zotero.Prefs.set(backendsPrefKey, JSON.stringify({ backends }), true);
      release(createJsonResponse({ engines: [] }));
      assert.isFalse((await pending).ok);
      assert.isNull(getSkillRunnerModelCacheEntry({ backendId: backend.id }));
    });
  }

  it("stops a batch between backends without a native AbortController", async function () {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "AbortController",
    );
    let entered!: () => void;
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let release!: (response: Response) => void;
    const response = new Promise<Response>((resolve) => {
      release = resolve;
    });
    let requests = 0;
    try {
      Object.defineProperty(globalThis, "AbortController", {
        configurable: true,
        value: undefined,
      });
      const pending = refreshAllSkillRunnerModelCaches({
        listBackends: async () => [backend, { ...backend, id: "second" }],
        fetchImpl: async (_url, init) => {
          requests += 1;
          assert.isUndefined(init?.signal);
          entered();
          return response;
        },
      });
      await ready;
      stopSkillRunnerModelCacheAutoRefresh();
      assert.isFalse((await pending).ok);
      release(createJsonResponse({ engines: [] }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.equal(requests, 1);
      assert.isNull(getSkillRunnerModelCacheEntry({ backendId: backend.id }));
    } finally {
      release(createJsonResponse({ engines: [] }));
      if (descriptor) {
        Object.defineProperty(globalThis, "AbortController", descriptor);
      } else {
        Reflect.deleteProperty(globalThis, "AbortController");
      }
    }
  });

  it("uses the current saved configuration when a queued backend is reached", async function () {
    const second = {
      ...backend,
      id: "second",
      baseUrl: "http://127.0.0.1:8031",
    };
    Zotero.Prefs.set(
      backendsPrefKey,
      JSON.stringify({ backends: [backend, second] }),
      true,
    );
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered!: () => void;
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const urls: string[] = [];
    const pending = refreshAllSkillRunnerModelCaches({
      fetchImpl: async (url) => {
        urls.push(url);
        entered();
        await gate;
        return createJsonResponse({ engines: [] });
      },
    });
    await ready;
    const updated = { ...second, baseUrl: "http://127.0.0.1:8032" };
    Zotero.Prefs.set(
      backendsPrefKey,
      JSON.stringify({ backends: [backend, updated] }),
      true,
    );
    release();
    assert.isTrue((await pending).ok);
    assert.deepEqual(urls, [
      `${backend.baseUrl}/v1/engines`,
      `${updated.baseUrl}/v1/engines`,
    ]);
    assert.equal(
      getSkillRunnerModelCacheEntry({ backendId: second.id })?.baseUrl,
      updated.baseUrl,
    );
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

    await new Promise((resolve) => setTimeout(resolve, 0));
    await intervals[0].fn();
    assert.equal(refreshCalls, 2);

    stopSkillRunnerModelCacheAutoRefresh();
    assert.equal(clearedTimer, 1);
  });

  it("does not overlap scheduled batches or dispatch old ticks after restart", async function () {
    const ticks: Array<() => void | Promise<void>> = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const options = {
      refreshAll: async () => {
        calls += 1;
        await gate;
      },
      setIntervalFn: ((fn: () => void) => {
        ticks.push(fn);
        return ticks.length as unknown as ReturnType<typeof setInterval>;
      }) as typeof setInterval,
      clearIntervalFn: (() => {}) as typeof clearInterval,
    };
    startSkillRunnerModelCacheAutoRefresh(options);
    ticks[0]();
    ticks[0]();
    assert.equal(calls, 1);
    stopSkillRunnerModelCacheAutoRefresh();
    startSkillRunnerModelCacheAutoRefresh(options);
    ticks[0]();
    assert.equal(calls, 2);
    release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await ticks[1]();
    assert.equal(calls, 3);
  });
});

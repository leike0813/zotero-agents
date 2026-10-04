import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  normalizePiOfficialCatalog,
  normalizePiCatalogEndpoint,
  mergePiModelOverlay,
} from "../../src/modules/piModelCatalogData";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";
import {
  loadPiModelCatalog,
  normalizePiModelOverlay,
  refreshPiModelCatalog,
  refreshPiChatGPTModelCatalog,
  cleanupPiChatGPTLegacyCatalog,
  refreshPiPublicModelCatalog,
  restorePiPreviousModelCatalog,
  shutdownPiModelCatalog,
  removePiModelOverlay,
  startPiModelCatalog,
  setPiModelCatalogAutoUpdate,
  subscribePiModelCatalog,
} from "../../src/modules/piModelCatalog";
import {
  putPiCredential,
  deletePiCredential,
  getPiCredentialIdentityRevision,
} from "../../src/modules/piCredentialStore";

describe("Pi model catalog", function () {
  it("detaches a canceled last waiter and ignores its late response", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-last-waiter-"));
    const replies: ((response: Response) => void)[] = [];
    let calls = 0;
    let notifyCall = () => {};
    const nextCall = () =>
      new Promise<void>((resolve) => {
        notifyCall = resolve;
      });
    const fetch = async () => {
      calls++;
      notifyCall();
      return new Promise<Response>((resolve) => replies.push(resolve));
    };
    let lastStatus: string | undefined;
    const response = (revision: string) =>
      Response.json(
        {},
        {
          headers: {
            "x-pi-model-catalog-revision": revision,
            "x-pi-model-catalog-minimum-version": "1.0.0",
          },
        },
      );
    const unsubscribe = subscribePiModelCatalog(
      (catalog) => {
        lastStatus = catalog.state?.status;
      },
      { root },
    );
    try {
      const abort = new AbortController();
      const firstStarted = nextCall();
      const canceled = refreshPiPublicModelCatalog({
        root,
        signal: abort.signal,
        fetch,
      });
      await firstStarted;
      assert.equal(calls, 1);
      const canceledOutcome = canceled.then(
        () => assert.fail("last waiter cancellation should reject"),
        (error) => assert.equal((error as { code?: string }).code, "canceled"),
      );

      abort.abort();
      assert.notEqual(lastStatus, "checking");

      const nextStarted = nextCall();
      const next = refreshPiPublicModelCatalog({ root, fetch });
      await nextStarted;
      assert.equal(calls, 2);
      replies[1](response("new"));
      assert.equal((await next).state?.revision, "new");
      replies[0](response("late"));
      await canceledOutcome;
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.equal((await loadPiModelCatalog({ root })).state?.revision, "new");
    } finally {
      for (const reply of replies) reply(response("cleanup"));
      unsubscribe();
      await shutdownPiModelCatalog({ root });
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects overlay widening any known image resize limit", function () {
    const base = normalizePiOfficialCatalog({
      schemaVersion: 1,
      revision: "bounded",
      models: [
        {
          provider: "fixture",
          id: "image-model",
          name: "Image model",
          api: "openai-responses",
          baseUrl: "https://example.com/v1",
          contextWindow: 10000,
          maxTokens: 1000,
          input: ["image"],
          reasoning: false,
          supportsTools: true,
          inputLimits: {
            images: {
              resize: {
                maxWidth: 1024,
                maxHeight: 768,
                maxBytes: 500000,
                jpegQuality: 70,
              },
            },
          },
        },
      ],
    }).models;
    const limits = [
      ["maxWidth", 2048],
      ["maxHeight", 1536],
      ["maxBytes", 1000000],
      ["jpegQuality", 90],
    ] as const;
    for (const [field, value] of limits) {
      const overlay = normalizePiModelOverlay(
        `providers:\n  fixture:\n    models:\n      - id: image-model\n        inputLimits:\n          images:\n            resize:\n              ${field}: ${value}\n`,
        base,
      );
      assert.throws(() => mergePiModelOverlay(base, overlay), /widens/i, field);
    }
  });

  it("retries an unusable 304 and publishes only after a successful durable write", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-commit-"));
    let calls = 0;
    const response = () =>
      Response.json(
        {},
        {
          headers: {
            "x-pi-model-catalog-revision": "durable",
            "x-pi-model-catalog-minimum-version": "1.0.0",
          },
        },
      );
    try {
      const prior = await refreshPiPublicModelCatalog({
        root,
        fetch: async (_url, init) => {
          assert.isNull(new Headers(init?.headers).get("if-none-match"));
          return ++calls === 1
            ? new Response(null, { status: 304 })
            : response();
        },
      });
      assert.equal(calls, 2);
      assert.equal(prior.state?.revision, "durable");
      const cacheDir = getRuntimePersistencePaths(root).cacheDir;
      await fs.rename(cacheDir, cacheDir + ".saved");
      await fs.writeFile(cacheDir, "blocked");
      const failed = await refreshPiPublicModelCatalog({
        root,
        fetch: async () =>
          Response.json(
            {},
            {
              headers: {
                "x-pi-model-catalog-revision": "uncommitted",
                "x-pi-model-catalog-minimum-version": "1.0.0",
              },
            },
          ),
      });
      assert.equal(failed.state?.error, "persistence");
      assert.equal(failed.revision, prior.revision);
      await fs.unlink(cacheDir);
      await fs.rename(cacheDir + ".saved", cacheDir);
      await shutdownPiModelCatalog({ root });
      assert.equal(
        (await startPiModelCatalog({ root })).state?.revision,
        "durable",
      );
    } finally {
      await shutdownPiModelCatalog({ root });
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("loads the compatible previous slot offline and does not repeat an automatic attempt", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-fallback-"));
    const reply = (revision: string) =>
      Response.json(
        {},
        {
          headers: {
            etag: revision,
            "x-pi-model-catalog-revision": revision,
            "x-pi-model-catalog-minimum-version": "1.0.0",
          },
        },
      );
    try {
      await refreshPiPublicModelCatalog({
        root,
        fetch: async () => reply("a"),
      });
      await refreshPiPublicModelCatalog({
        root,
        fetch: async () => reply("b"),
      });
      await shutdownPiModelCatalog({ root });
      const file = path.join(
        getRuntimePersistencePaths(root).cacheDir,
        "pi-model-catalog.json",
      );
      const cache = JSON.parse(await fs.readFile(file, "utf8"));
      cache.current.raw = { broken: true };
      await fs.writeFile(file, JSON.stringify(cache));
      const recovered = await startPiModelCatalog({ root });
      assert.equal(recovered.state?.source, "previous");
      assert.equal(recovered.state?.revision, "a");
      let requests = 0;
      await refreshPiPublicModelCatalog({
        root,
        automatic: true,
        fetch: async () => {
          requests++;
          return reply("c");
        },
      });
      assert.equal(requests, 0);
      await setPiModelCatalogAutoUpdate(false, { root });
      cache.previous.raw = { broken: true };
      await shutdownPiModelCatalog({ root });
      await fs.writeFile(file, JSON.stringify(cache));
      assert.equal((await startPiModelCatalog({ root })).state?.source, "seed");
    } finally {
      await shutdownPiModelCatalog({ root });
      await fs.rm(root, { recursive: true, force: true });
    }
  });
  it("shares source requests, releases one waiter and rejects work invalidated by shutdown", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-shared-"));
    let finish!: (response: Response) => void;
    let calls = 0;
    const fetch = async () => {
      calls++;
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    };
    try {
      const signal = new AbortController();
      const first = refreshPiPublicModelCatalog({
        root,
        signal: signal.signal,
        fetch,
      });
      const second = refreshPiPublicModelCatalog({ root, fetch });
      await new Promise((resolve) => setTimeout(resolve, 20));
      signal.abort();
      await first.catch(() => undefined);
      assert.equal(calls, 1);
      finish(
        Response.json(
          {},
          {
            headers: {
              "x-pi-model-catalog-revision": "shared",
              "x-pi-model-catalog-minimum-version": "1.0.0",
            },
          },
        ),
      );
      const shared = await second;
      assert.equal(shared.state?.revision, "shared");
      const late = refreshPiPublicModelCatalog({ root, fetch });
      await new Promise((resolve) => setTimeout(resolve, 20));
      await shutdownPiModelCatalog({ root });
      finish(
        Response.json(
          {},
          {
            headers: {
              "x-pi-model-catalog-revision": "late",
              "x-pi-model-catalog-minimum-version": "1.0.0",
            },
          },
        ),
      );
      await late;
      const restarted = await startPiModelCatalog({ root });
      assert.equal(restarted.state?.revision, "shared");
    } finally {
      await shutdownPiModelCatalog({ root });
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("applies explicit overlay fields to the current target and retains them until removal", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-fields-"));
    const overlayPath = path.join(root, "models.yml");
    const model = {
      provider: "declared",
      id: "m",
      name: "Original",
      api: "openai-responses",
      baseUrl: "https://example.com/v1",
      contextWindow: 10000,
      maxTokens: 1000,
      input: ["text"],
      reasoning: false,
      cost: { input: 2, output: 8, cacheRead: 1, cacheWrite: 4 },
    };
    const fetch = async () =>
      Response.json(
        { declared: [model] },
        {
          headers: {
            "x-pi-model-catalog-revision": "fields",
            "x-pi-model-catalog-minimum-version": "1.0.0",
          },
        },
      );
    try {
      await refreshPiPublicModelCatalog({ root, fetch });
      await fs.writeFile(
        overlayPath,
        "providers:\n  declared:\n    models:\n      - id: m\n        name: Declared\n        cost: {input: 3}\n        supportsTools: true\n",
      );
      const adopted = await refreshPiModelCatalog({ root, overlayPath });
      assert.equal(adopted.models[0].contextWindow, 10000);
      assert.equal(adopted.models[0].cost?.input, 3);
      assert.equal(adopted.models[0].cost?.output, 8);
      assert.isTrue(adopted.models[0].supportsTools);
      assert.equal(adopted.models[0].knowledge?.tools, "known");
      await fs.unlink(overlayPath);
      assert.equal(
        (await refreshPiModelCatalog({ root, overlayPath })).models[0].name,
        "Declared",
      );
      assert.equal(
        (await removePiModelOverlay({ root })).models[0].name,
        "Original",
      );
    } finally {
      await shutdownPiModelCatalog({ root });
      await fs.rm(root, { recursive: true, force: true });
    }
  });
  it("adopts independent public revisions, revalidates ETags and preserves retired models through restore", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-public-"));
    const model = {
      provider: "public-fixture",
      id: "m",
      name: "M",
      api: "openai-responses",
      baseUrl: "https://example.com/v1",
      contextWindow: 10000,
      maxTokens: 1000,
      input: ["text"],
      reasoning: false,
      cost: { input: 2, output: 8, cacheRead: 1, cacheWrite: 4 },
    };
    const response = (revision: string, models: unknown[]) =>
      Response.json(
        { "public-fixture": models },
        {
          headers: {
            etag: `"${revision}"`,
            "x-pi-model-catalog-revision": revision,
            "x-pi-model-catalog-minimum-version": "1.0.0",
          },
        },
      );
    try {
      const initial = await loadPiModelCatalog({ root });
      assert.equal(initial.state?.source, "seed");
      const a = await refreshPiPublicModelCatalog({
        root,
        fetch: async (url, init) => {
          const request = new Request(url, init);
          assert.equal(
            new URL(request.url).searchParams.get("pi-version"),
            "1.0.0",
          );
          assert.isNull(request.headers.get("authorization"));
          return response("a", [model]);
        },
      });
      assert.equal(a.state?.revision, "a");
      const conditional = await refreshPiPublicModelCatalog({
        root,
        fetch: async (url, init) => {
          assert.equal(
            new Request(url, init).headers.get("if-none-match"),
            '"a"',
          );
          return new Response(null, { status: 304 });
        },
      });
      assert.equal(conditional.revision, a.revision);
      assert.equal(conditional.state?.updatedAt, a.state?.updatedAt);
      const bad = await refreshPiPublicModelCatalog({
        root,
        fetch: async () => response("bad", [{ ...model, maxTokens: -1 }]),
      });
      assert.equal(bad.revision, a.revision);
      assert.equal(bad.state?.error, "invalid");
      const b = await refreshPiPublicModelCatalog({
        root,
        fetch: async () => response("b", [{ ...model, disabled: true }]),
      });
      assert.notEqual(b.revision, a.revision);
      const restored = await restorePiPreviousModelCatalog({ root });
      assert.equal(restored.state?.revision, "a");
      assert.isFalse(restored.state?.autoUpdate);
      assert.equal(
        restored.models.find((m) => m.id === "m")?.availability,
        "retired",
      );
      assert.deepEqual(
        (await loadPiModelCatalog({ root })).models,
        restored.models,
      );
      const empty = await refreshPiPublicModelCatalog({
        root,
        fetch: async () => response("empty", []),
      });
      assert.lengthOf(empty.models, 0);
      assert.equal(empty.state?.status, "idle");
    } finally {
      await shutdownPiModelCatalog({ root });
      await fs.rm(root, { recursive: true, force: true });
    }
  });
  it("normalizes official metadata without granting unknown capabilities or new protocols", function () {
    assert.throws(() =>
      normalizePiCatalogEndpoint("http://localhost.evil.test/v1"),
    );
    assert.throws(() => normalizePiCatalogEndpoint("http://10.evil.test/v1"));
    assert.equal(
      normalizePiCatalogEndpoint("http://127.0.0.1:1234/v1"),
      "http://127.0.0.1:1234/v1",
    );
    const model = {
      provider: "fixture",
      id: "m",
      name: "M",
      api: "openai-responses",
      baseUrl: "https://example.com/v1",
      contextWindow: 10000,
      maxTokens: 1000,
      input: ["text"],
      reasoning: true,
      thinkingLevelMap: { low: "low", high: null },
      cost: {
        input: 2,
        output: 8,
        cacheRead: 1,
        cacheWrite: 4,
        tiers: [
          {
            inputTokensAbove: 5000,
            input: 3,
            output: 10,
            cacheRead: 2,
            cacheWrite: 5,
          },
        ],
      },
      inputLimits: { maxRequestBytes: 100000 },
      compat: { supportsMaxOutputTokens: false },
      extraFutureField: "ignored",
    };
    const normalized = normalizePiOfficialCatalog({
      schemaVersion: 1,
      revision: "fixture-a",
      minimumPiVersion: "1.0.0",
      models: [model],
    });
    assert.equal(normalized.models[0].cost?.input, 2);
    assert.equal(normalized.models[0].inputLimits?.maxRequestBytes, 100000);
    assert.equal(normalized.models[0].compat?.supportsMaxOutputTokens, false);
    assert.notInclude(normalized.models[0].reasoning, "high");
    assert.notInclude(normalized.models[0].reasoning, "xhigh");
    assert.notInclude(normalized.models[0].reasoning, "max");
    assert.equal(normalized.models[0].knowledge?.tools, "unknown");
    assert.isFalse(normalized.models[0].supportsTools);
    const sampling = normalizePiOfficialCatalog({
      schemaVersion: 1,
      revision: "sampling",
      models: [
        { ...model, samplingParams: { presence_penalty: -0.5, top_p: 0.9 } },
      ],
    });
    assert.equal(sampling.models[0].samplingParams?.presence_penalty, -0.5);
    assert.equal(sampling.models[0].samplingParams?.top_p, 0.9);
    assert.throws(
      () =>
        normalizePiOfficialCatalog({
          schemaVersion: 1,
          revision: "duplicate",
          models: [model, model],
        }),
      /duplicate/i,
    );
    assert.throws(
      () =>
        normalizePiOfficialCatalog({
          schemaVersion: 1,
          revision: "bad",
          models: [{ ...model, contextWindow: -1 }],
        }),
      /contextWindow/i,
    );
    assert.equal(
      normalizePiOfficialCatalog({
        schemaVersion: 1,
        revision: "future",
        models: [{ ...model, api: "future-executor" }],
      }).models[0].availability,
      "unsupported",
    );
    assert.lengthOf(
      normalizePiOfficialCatalog({
        schemaVersion: 1,
        revision: "empty",
        models: [],
      }).models,
      0,
    );
  });
  it("filters retired Codex targets from official catalogs without changing other models", function () {
    const normalized = normalizePiOfficialCatalog({
      schemaVersion: 1,
      revision: "retired-filter",
      models: [
        {
          provider: "openai-codex",
          id: "old-provider-model",
          name: "Old provider model",
          api: "openai-codex-responses",
          baseUrl: "https://chatgpt.com/backend-api/codex",
          contextWindow: 128000,
          maxTokens: 16000,
        },
        {
          provider: "openai",
          id: "old-api-model",
          name: "Old API model",
          api: "openai-codex-responses",
          baseUrl: "https://api.openai.com/v1",
          contextWindow: 128000,
          maxTokens: 16000,
        },
        {
          provider: "openai",
          id: "responses-model",
          name: "Responses model",
          api: "openai-responses",
          baseUrl: "https://api.openai.com/v1",
          contextWindow: 128000,
          maxTokens: 16000,
          input: ["text"],
          supportsTools: true,
        },
      ],
    });

    assert.deepEqual(
      normalized.models.map(({ provider, id, api, authVariants }) => ({
        provider,
        id,
        api,
        authVariants,
      })),
      [
        {
          provider: "openai",
          id: "responses-model",
          api: "openai-responses",
          authVariants: ["api-key"],
        },
      ],
    );
    assert.equal(normalized.models[0].contextWindow, 128000);
    assert.equal(normalized.models[0].maxTokens, 16000);
    assert.deepEqual(normalized.models[0].input, ["text"]);
    assert.isTrue(normalized.models[0].supportsTools);
  });

  it("discovers official ChatGPT models per registration and keeps unknown SIWC facts isolated", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "pi-chatgpt-catalog-"),
    );
    const ids = ["catalog-chatgpt-a", "catalog-chatgpt-b"];
    const materials = ids.map((id) => ({
      kind: "chatgpt" as const,
      access: `${id}-access`,
      refresh: `${id}-refresh`,
      expiresAt: Date.now() + 3600000,
      idToken: `${id}-id-token`,
      issuer: "https://auth.openai.com",
      subject: `${id}-subject`,
      clientId: "fixture-client",
      scope: ["chatgpt.tokens.use.direct"],
    }));
    for (let index = 0; index < ids.length; index++)
      await putPiCredential({
        id: ids[index],
        label: `Fixture ${index}`,
        material: materials[index],
      });
    try {
      const prior = await loadPiModelCatalog({ root });
      const expectedOrder = ["gpt-first", "gpt-second"];
      const result = await refreshPiChatGPTModelCatalog(prior, {
        credentialId: ids[0],
        root,
        signal: new AbortController().signal,
        resolveAccess: async (credentialId, _signal, _fetcher, expected) => {
          assert.equal(credentialId, ids[0]);
          assert.equal(
            expected?.identityRevision,
            getPiCredentialIdentityRevision(ids[0], "model-provider"),
          );
          return materials[0].access;
        },
        fetch: async (input, init) => {
          const request = new Request(input, init);
          assert.equal(request.method, "GET");
          assert.equal(request.url, "https://api.openai.com/v1/models");
          assert.equal(
            request.headers.get("authorization"),
            `Bearer ${materials[0].access}`,
          );
          assert.isNull(request.headers.get("chatgpt-account-id"));
          assert.equal(request.redirect, "error");
          return Response.json({
            models: [
              {
                slug: expectedOrder[0],
                display_name: "First model",
                visibility: "list",
                context_window: 272000,
                max_output_tokens: 8192,
                supports_tools: true,
                cost: { input: 1, output: 2 },
              },
              {
                slug: "hidden-model",
                display_name: "Hidden",
                visibility: "hide",
              },
              {
                slug: expectedOrder[1],
                display_name: "Second model",
                visibility: "list",
              },
            ],
          });
        },
      });
      const firstAccountModels = result.models.filter(
        (model) => model.credentialRef === ids[0],
      );
      assert.deepEqual(
        firstAccountModels.map((model) => model.id),
        expectedOrder,
      );
      const model = firstAccountModels[0];
      assert.equal(model?.name, "First model");
      assert.equal(model?.provider, "openai");
      assert.equal(model?.api, "openai-responses");
      assert.equal(model?.baseUrl, "https://api.openai.com/v1");
      assert.equal(model?.source, "discovered");
      assert.equal(model?.contextWindow, 272000);
      assert.equal(model?.maxTokens, 0);
      assert.deepEqual(model?.authVariants, ["chatgpt"]);
      assert.isFalse(model?.supportsTools);
      assert.isUndefined(model?.cost);
      assert.equal(firstAccountModels[1]?.contextWindow, 0);
      assert.isFalse(result.models.some((x) => x.id === "hidden-model"));
      assert.notEqual(result.revision, prior.revision);
      assert.notInclude(JSON.stringify(result), materials[0].access);
      const shared = await loadPiModelCatalog({ root });
      assert.deepEqual(
        shared.models.filter((entry) => entry.credentialRef === ids[0]),
        firstAccountModels,
      );
      await refreshPiChatGPTModelCatalog(shared, {
        credentialId: ids[1],
        root,
        signal: new AbortController().signal,
        resolveAccess: async () => materials[1].access,
        fetch: async () =>
          Response.json({
            models: [
              {
                slug: "gpt-first",
                display_name: "Account B name",
                visibility: "list",
                context_window: 64000,
              },
            ],
          }),
      });
      const both = await loadPiModelCatalog({ root });
      assert.equal(
        both.models.find((entry) => entry.credentialRef === ids[1])?.name,
        "Account B name",
      );
      assert.equal(
        both.models.find((entry) => entry.credentialRef === ids[0])?.name,
        "First model",
      );
      assert.notEqual(both.revision, result.revision);
      await shutdownPiModelCatalog({ root });
      const restarted = await startPiModelCatalog({ root });
      assert.deepEqual(
        restarted.models.filter((entry) => entry.credentialRef === ids[0]),
        firstAccountModels,
      );
      try {
        await refreshPiChatGPTModelCatalog(restarted, {
          credentialId: ids[0],
          root,
          signal: new AbortController().signal,
          resolveAccess: async () => materials[0].access,
          fetch: async () => new Response("private error", { status: 503 }),
        });
        assert.fail("failed observation accepted");
      } catch (error) {
        assert.equal((error as { code: string }).code, "provider_unavailable");
      }
      assert.deepEqual(
        (await loadPiModelCatalog({ root })).models.filter(
          (entry) => entry.credentialRef === ids[0],
        ),
        firstAccountModels,
      );
      const empty = await refreshPiChatGPTModelCatalog(restarted, {
        credentialId: ids[1],
        root,
        signal: new AbortController().signal,
        resolveAccess: async () => materials[1].access,
        fetch: async () => Response.json({ models: [] }),
      });
      assert.isFalse(
        empty.models.some((entry) => entry.credentialRef === ids[1]),
      );
      assert.isTrue(
        empty.models.some((entry) => entry.credentialRef === ids[0]),
      );
      const persisted = JSON.parse(
        await fs.readFile(
          path.join(
            getRuntimePersistencePaths(root).cacheDir,
            "pi-model-catalog.json",
          ),
          "utf8",
        ),
      );
      assert.lengthOf(persisted.accounts[ids[1]].models, 0);
    } finally {
      await shutdownPiModelCatalog({ root });
      await Promise.all(ids.map((id) => deletePiCredential(id)));
      await fs.rm(root, { recursive: true, force: true });
    }
  });
  it("removes persisted legacy Codex account facts during catalog migration", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "pi-catalog-cleanup-"),
    );
    const credentialId = "catalog-cleanup-chatgpt";
    await putPiCredential({
      id: credentialId,
      label: "Current",
      material: {
        kind: "chatgpt",
        access: "access",
        refresh: "refresh",
        expiresAt: Date.now() + 3600000,
        idToken: "id-token",
        issuer: "https://auth.openai.com",
        subject: "subject",
        clientId: "fixture-client",
        scope: ["chatgpt.tokens.use.direct"],
      },
    });
    const cacheDir = getRuntimePersistencePaths(root).cacheDir;
    const cacheFile = path.join(cacheDir, "pi-model-catalog.json");
    try {
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(
        cacheFile,
        JSON.stringify({
          version: 2,
          epoch: 3,
          autoUpdate: true,
          accounts: {
            legacy: {
              identityRevision: "legacy-identity",
              checkedAt: "2026-01-01T00:00:00.000Z",
              revision: "2",
              models: [
                {
                  provider: "openai-codex",
                  id: "old-model",
                  name: "Old model",
                  api: "openai-codex-responses",
                  baseUrl: "https://chatgpt.com/backend-api",
                  contextWindow: 128000,
                  maxTokens: 0,
                  input: ["text"],
                  supportsTools: false,
                  reasoning: ["off"],
                  source: "discovered",
                  credentialRef: "legacy",
                  authVariants: ["openai-codex"],
                },
              ],
            },
          },
          retired: [],
        }),
      );
      await cleanupPiChatGPTLegacyCatalog({ root });
      const persisted = await fs.readFile(cacheFile, "utf8");
      assert.notInclude(persisted, "openai-codex");
      assert.notInclude(persisted, "old-model");
      assert.deepEqual(JSON.parse(persisted).accounts, {});
    } finally {
      await shutdownPiModelCatalog({ root });
      await deletePiCredential(credentialId);
      await fs.rm(root, { recursive: true, force: true });
    }
  });
  it("rejects a ChatGPT discovery that returns after registration replacement", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-catalog-stale-"));
    const credentialId = "catalog-chatgpt-stale";
    const material = (subject: string) => ({
      kind: "chatgpt" as const,
      access: `access-${subject}`,
      refresh: `refresh-${subject}`,
      expiresAt: Date.now() + 3600000,
      idToken: `id-token-${subject}`,
      issuer: "https://auth.openai.com",
      subject,
      clientId: "fixture-client",
      scope: ["chatgpt.tokens.use.direct"],
    });
    await putPiCredential({
      id: credentialId,
      label: "Original",
      material: material("old"),
    });
    let requestStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      requestStarted = resolve;
    });
    let finish!: (response: Response) => void;
    try {
      const prior = await loadPiModelCatalog({ root });
      const pending = refreshPiChatGPTModelCatalog(prior, {
        credentialId,
        root,
        signal: new AbortController().signal,
        resolveAccess: async () => material("old").access,
        fetch: async () => {
          requestStarted();
          return new Promise<Response>((resolve) => {
            finish = resolve;
          });
        },
      });
      await started;
      await putPiCredential({
        id: credentialId,
        label: "Replacement",
        material: material("new"),
      });
      finish(
        Response.json({
          models: [
            {
              slug: "stale-model",
              display_name: "Stale model",
              visibility: "list",
              context_window: 100000,
            },
          ],
        }),
      );
      await pending.then(
        () => assert.fail("stale account discovery was committed"),
        (error) =>
          assert.equal((error as { code: string }).code, "credential_missing"),
      );
      assert.isFalse(
        (await loadPiModelCatalog({ root })).models.some(
          (model) => model.id === "stale-model",
        ),
      );
    } finally {
      await shutdownPiModelCatalog({ root });
      await deletePiCredential(credentialId);
      await fs.rm(root, { recursive: true, force: true });
    }
  });
  it("rejects executable or secret overlay fields", function () {
    assert.throws(
      () =>
        normalizePiModelOverlay(
          "providers:\n  custom:\n    apiKey: secret\n    models: [{id: m}]\n",
        ),
      /apiKey|unsupported|field/i,
    );
    assert.throws(
      () =>
        normalizePiModelOverlay(
          "providers:\n  custom:\n    command: curl\n    models: [{id: m}]\n",
        ),
      /command|unsupported|field/i,
    );
    const unknown = normalizePiModelOverlay(
      "providers:\n  custom:\n    api: openai-completions\n    baseUrl: http://127.0.0.1:1234/v1\n    models: [{id: m}]\n",
    )[0];
    assert.isFalse(unknown.supportsTools);
    assert.deepEqual(unknown.input, []);
    assert.deepEqual(unknown.reasoning, ["off"]);
  });

  it("requires explicit ChatGPT auth and official target before using overlay facts", function () {
    const publicModel = {
      provider: "openai",
      id: "gpt-overlay",
      name: "Public name",
      api: "openai-responses",
      baseUrl: "https://api.openai.com/v1",
      contextWindow: 128000,
      maxTokens: 16000,
      input: ["text"],
      reasoning: ["off"],
      supportsTools: true,
      source: "official" as const,
      cost: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0 },
    };
    assert.throws(
      () =>
        normalizePiModelOverlay(
          "providers:\n  openai:\n    models:\n      - id: gpt-overlay\n        authVariants: [chatgpt]\n        contextWindow: 100000\n",
          [publicModel],
        ),
      /official API target/i,
    );
    const scoped = normalizePiModelOverlay(
      "providers:\n  openai:\n    models:\n      - id: gpt-overlay\n        api: openai-responses\n        baseUrl: https://api.openai.com/v1\n        authVariants: [chatgpt]\n        contextWindow: 100000\n        input: [text]\n",
      [publicModel],
    )[0];
    assert.deepEqual(scoped.authVariants, ["chatgpt"]);
    assert.equal(scoped.contextWindow, 100000);
    assert.isUndefined(scoped.cost);
    assert.deepEqual(scoped.reasoning, ["off"]);
  });

  it("keeps the last sanitized overlay after a bad refresh", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-catalog-"));
    const overlayPath = path.join(root, "models.yml");
    try {
      await fs.writeFile(
        overlayPath,
        "providers:\n  custom:\n    api: openai-completions\n    baseUrl: https://example.com/v1\n    models:\n      - id: m\n        name: M\n        contextWindow: 1000\n        maxTokens: 100\n        input: [text]\n        reasoning: false\n",
      );
      const first = await refreshPiModelCatalog({ overlayPath, root });
      assert.isAtLeast(first.models.length, 1);
      const count = first.models.length;
      await fs.writeFile(
        overlayPath,
        "providers:\n  custom:\n    apiKey: leaked\n    models: [{id: m}]\n",
      );
      try {
        await refreshPiModelCatalog({ overlayPath, root });
        assert.fail("invalid overlay accepted");
      } catch (error) {
        assert.match(String(error), /apiKey|unsupported|field/i);
      }
      const cached = await loadPiModelCatalog({ root });
      assert.equal(cached.models.length, count);
      assert.equal(cached.revision, first.revision);
      assert.notInclude(JSON.stringify(cached), "leaked");
      await shutdownPiModelCatalog({ root });
      const legacy = [
        {
          provider: "legacy-custom",
          id: "legacy-unknown",
          name: "Legacy",
          api: "openai-completions",
          baseUrl: "https://example.com/v1",
          contextWindow: 0,
          maxTokens: 0,
          input: [],
          supportsTools: false,
          reasoning: ["off"],
          source: "overlay",
        },
      ];
      await fs.writeFile(
        path.join(
          getRuntimePersistencePaths(root).cacheDir,
          "pi-model-catalog.json",
        ),
        JSON.stringify({ version: 1, models: legacy }),
      );
      const migratedCatalog = await startPiModelCatalog({ root });
      assert.isUndefined(migratedCatalog.state?.error);
      const migrated = migratedCatalog.models.find(
        (entry) => entry.id === "legacy-unknown",
      );
      assert.exists(migrated);
      assert.equal(migrated?.knowledge?.context, "unknown");
      assert.equal(migrated?.knowledge?.output, "unknown");
    } finally {
      await shutdownPiModelCatalog({ root });
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

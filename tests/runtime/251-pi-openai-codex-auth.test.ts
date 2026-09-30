import { assert } from "chai";
import { zstdDecompressSync } from "node:zlib";
import { getPref, setPref } from "../../src/utils/prefs";
import {
  connectPiOpenAICodex,
  PiCodexAuthFailure,
  resolvePiOpenAICodexAccess,
} from "../../src/modules/piOpenAICodexAuth";
import {
  deletePiCredential,
  getPiCredentialIdentityRevision,
  putPiCredential,
  readPiCredential,
} from "../../src/modules/piCredentialStore";
import { createPiProviderModelSource } from "../../src/modules/piProviderExecution";
import { PiModelStreamFailure } from "../../src/modules/piRuntime";
import type { PiModelSelectionSnapshot } from "../../src/shared/piProviderContract";

const access = `${btoa("header")}.${btoa(
  JSON.stringify({
    "https://api.openai.com/auth": { chatgpt_account_id: "account-1234" },
  }),
)}.signature`;

describe("Pi OpenAI Codex authorization", function () {
  let previous: string;
  beforeEach(function () {
    previous = String(getPref("piCredentialEncryptedJson") || "");
    setPref("piCredentialEncryptedJson", "");
  });
  afterEach(function () {
    setPref("piCredentialEncryptedJson", previous);
  });

  it("completes a device-code login and stores only encrypted material", async function () {
    this.timeout(10_000);
    const calls: string[] = [];
    const codes: Array<{ verificationUrl: string; userCode: string }> = [];
    const fetchFixture: typeof fetch = async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/usercode"))
        return Response.json({
          device_auth_id: "device-id",
          user_code: "ABCD-EFGH",
          interval: 0,
        });
      if (url.endsWith("/deviceauth/token")) {
        const attempt = calls.filter((value) => value === url).length;
        if (attempt === 1) return new Response("", { status: 403 });
        if (attempt === 2) throw new TypeError("temporary network failure");
        return Response.json({
          authorization_code: "authorization",
          code_verifier: "verifier",
        });
      }
      if (url.endsWith("/oauth/token"))
        return Response.json({
          access_token: access,
          refresh_token: "refresh-private",
          expires_in: 3600,
        });
      throw new Error("unexpected request");
    };
    const result = await connectPiOpenAICodex({
      id: "codex-fixture",
      label: "Codex fixture",
      signal: new AbortController().signal,
      fetch: fetchFixture,
      onCode: (code) => codes.push(code),
    });
    assert.deepEqual(codes, [
      {
        verificationUrl: "https://auth.openai.com/codex/device",
        userCode: "ABCD-EFGH",
      },
    ]);
    assert.equal(result.kind, "openai-codex");
    assert.equal(
      calls.filter((url) => url.endsWith("/deviceauth/token")).length,
      3,
    );
    assert.equal(result.masked, "••••1234");
    assert.notInclude(JSON.stringify(result), "refresh-private");
    assert.notInclude(
      String(getPref("piCredentialEncryptedJson")),
      "refresh-private",
    );
    const stored = await readPiCredential("codex-fixture");
    assert.isTrue(stored.ok);
    if (stored.ok && stored.material.kind === "openai-codex") {
      assert.equal(stored.material.accountId, "account-1234");
      assert.equal(stored.material.refresh, "refresh-private");
    }
  });

  it("uses anonymous Zotero HTTP transport for device authorization", async function () {
    const http = Zotero.HTTP as unknown as {
      request?: (
        method: string,
        url: string,
        options: Record<string, unknown>,
      ) => Promise<{ status: number; responseText: string }>;
    };
    const originalRequest = http.request;
    const originalFetch = globalThis.fetch;
    const optionsSeen: Array<Record<string, unknown>> = [];
    http.request = async (_method, url, options) => {
      optionsSeen.push(options);
      const body = url.endsWith("/usercode")
        ? { device_auth_id: "device-id", user_code: "ABCD-EFGH", interval: 0 }
        : url.endsWith("/deviceauth/token")
          ? { authorization_code: "authorization", code_verifier: "verifier" }
          : {
              access_token: access,
              refresh_token: "refresh-private",
              expires_in: 3600,
            };
      return { status: 200, responseText: JSON.stringify(body) };
    };
    globalThis.fetch = async () => {
      throw new Error("Browser fetch used for device authorization");
    };
    try {
      const result = await connectPiOpenAICodex({
        id: "codex-native-transport",
        label: "Codex native transport",
        signal: new AbortController().signal,
        onCode: () => {},
      });
      assert.equal(result.kind, "openai-codex");
      assert.lengthOf(optionsSeen, 3);
      for (const options of optionsSeen) {
        assert.equal(options.anon, true);
        assert.equal(options.noCache, true);
        assert.equal(options.followRedirects, false);
        assert.equal(options.successCodes, false);
        assert.equal(options.logBodyLength, 0);
        assert.isFunction(options.cancellerReceiver);
      }
    } finally {
      http.request = originalRequest;
      globalThis.fetch = originalFetch;
    }
  });

  it("reports the failed authorization phase without exposing the native error", async function () {
    try {
      await connectPiOpenAICodex({
        id: "codex-phase-fixture",
        label: "Codex phase fixture",
        signal: new AbortController().signal,
        onCode: () => {},
        fetch: async (input) => {
          const url = String(input);
          if (url.endsWith("/usercode"))
            return Response.json({
              device_auth_id: "device-id",
              user_code: "ABCD-EFGH",
              interval: 0,
            });
          if (url.endsWith("/deviceauth/token"))
            return Response.json({
              authorization_code: "authorization",
              code_verifier: "verifier",
            });
          throw new Error("private network detail");
        },
      });
      assert.fail("Expected token exchange failure");
    } catch (error) {
      assert.instanceOf(error, PiCodexAuthFailure);
      assert.equal((error as PiCodexAuthFailure).code, "auth_unavailable");
      assert.equal((error as PiCodexAuthFailure).phase, "exchange");
      assert.notInclude(String(error), "private network detail");
    }
  });

  it("shares a refresh and cannot restore a credential cleared during refresh", async function () {
    await putPiCredential({
      id: "codex-fixture",
      label: "Codex fixture",
      material: {
        kind: "openai-codex",
        access,
        refresh: "old-refresh",
        expiresAt: Date.now() - 1,
        accountId: "account-1234",
      },
    });
    let release!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => (release = resolve));
    let started!: () => void;
    const requested = new Promise<void>((resolve) => (started = resolve));
    let requests = 0;
    const fetchFixture: typeof fetch = async () => {
      requests += 1;
      started();
      return pending;
    };
    const signal = new AbortController().signal;
    const first = resolvePiOpenAICodexAccess(
      "codex-fixture",
      signal,
      fetchFixture,
    );
    const second = resolvePiOpenAICodexAccess(
      "codex-fixture",
      signal,
      fetchFixture,
    );
    await requested;
    assert.equal(requests, 1);
    await deletePiCredential("codex-fixture");
    release(
      Response.json({
        access_token: access,
        refresh_token: "new-refresh",
        expires_in: 3600,
      }),
    );
    const settled = await Promise.allSettled([first, second]);
    assert.deepEqual(
      settled.map((result) => result.status),
      ["rejected", "rejected"],
    );
    assert.isFalse((await readPiCredential("codex-fixture")).ok);
  });

  it("rotates an expired selected credential before use", async function () {
    await putPiCredential({
      id: "codex-fixture",
      label: "Codex fixture",
      material: {
        kind: "openai-codex",
        access: "old-access",
        refresh: "old-refresh",
        expiresAt: Date.now() - 1,
        accountId: "account-1234",
      },
    });
    const identityRevision = getPiCredentialIdentityRevision(
      "codex-fixture",
      "model-provider",
    )!;
    let seen: Request | undefined;
    const resolved = await resolvePiOpenAICodexAccess(
      "codex-fixture",
      new AbortController().signal,
      async (input, init) => {
        seen = new Request(input, init);
        return Response.json({
          access_token: access,
          refresh_token: "rotated-refresh",
          expires_in: 3600,
        });
      },
      { identityRevision, accountId: "account-1234" },
    );
    assert.equal(seen?.url, "https://auth.openai.com/oauth/token");
    assert.equal(seen?.method, "POST");
    assert.equal(seen?.headers.get("content-type"), "application/json");
    assert.deepEqual(JSON.parse(await seen!.text()), {
      grant_type: "refresh_token",
      client_id: "app_EMoamEEZ73f0CkXaXp7hrann",
      refresh_token: "old-refresh",
    });
    assert.equal(resolved, access);
    assert.equal(
      getPiCredentialIdentityRevision("codex-fixture", "model-provider"),
      identityRevision,
    );
    const saved = await readPiCredential("codex-fixture");
    assert.isTrue(saved.ok);
    if (saved.ok && saved.material.kind === "openai-codex")
      assert.equal(saved.material.refresh, "rotated-refresh");
  });

  it("keeps the previous refresh token and derives expiry from the access token", async function () {
    const jwt = (claims: Record<string, unknown>) =>
      `${btoa("header")}.${btoa(JSON.stringify(claims))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")}.signature`;
    const refreshed = jwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
      "https://api.openai.com/auth": { chatgpt_account_id: "account-1234" },
    });
    await putPiCredential({
      id: "codex-fixture",
      label: "Codex fixture",
      material: {
        kind: "openai-codex",
        access: "old-access",
        refresh: "old-refresh",
        expiresAt: Date.now() - 1,
        accountId: "account-1234",
      },
    });
    const resolved = await resolvePiOpenAICodexAccess(
      "codex-fixture",
      new AbortController().signal,
      async () => Response.json({ access_token: refreshed }),
    );
    assert.equal(resolved, refreshed);
    const saved = await readPiCredential("codex-fixture");
    assert.isTrue(saved.ok);
    if (saved.ok && saved.material.kind === "openai-codex") {
      assert.equal(saved.material.refresh, "old-refresh");
      assert.equal(saved.material.access, refreshed);
      assert.isAbove(saved.material.expiresAt, Date.now());
    }
  });

  it("fails closed when a refresh response carries no expiration evidence", async function () {
    await putPiCredential({
      id: "codex-fixture",
      label: "Codex fixture",
      material: {
        kind: "openai-codex",
        access: "old-access",
        refresh: "old-refresh",
        expiresAt: Date.now() - 1,
        accountId: "account-1234",
      },
    });
    try {
      await resolvePiOpenAICodexAccess(
        "codex-fixture",
        new AbortController().signal,
        async () => Response.json({ access_token: access }),
      );
      assert.fail("Expected a refresh response without expiration to fail");
    } catch (error) {
      assert.include(String(error), "invalid_response");
    }
    const saved = await readPiCredential("codex-fixture");
    assert.isTrue(saved.ok);
    if (saved.ok && saved.material.kind === "openai-codex")
      assert.equal(saved.material.access, "old-access");
  });

  it("cancels a pending login without replacing the saved credential", async function () {
    await putPiCredential({
      id: "codex-fixture",
      label: "Previous",
      material: {
        kind: "openai-codex",
        access,
        refresh: "previous-refresh",
        expiresAt: Date.now() + 3600_000,
        accountId: "account-1234",
      },
    });
    const controller = new AbortController();
    try {
      await connectPiOpenAICodex({
        id: "codex-fixture",
        label: "Replacement",
        signal: controller.signal,
        onCode: () => controller.abort(),
        fetch: async () =>
          Response.json({
            device_auth_id: "device-id",
            user_code: "ABCD-EFGH",
            interval: 1,
          }),
      });
      assert.fail("Expected cancellation");
    } catch (error) {
      assert.include(String(error), "canceled");
    }
    const saved = await readPiCredential("codex-fixture");
    assert.isTrue(saved.ok);
    if (saved.ok && saved.material.kind === "openai-codex")
      assert.equal(saved.material.refresh, "previous-refresh");
  });

  it("keeps an expired credential intact after refresh rejection", async function () {
    await putPiCredential({
      id: "codex-fixture",
      label: "Previous",
      material: {
        kind: "openai-codex",
        access,
        refresh: "previous-refresh",
        expiresAt: Date.now() - 1,
        accountId: "account-1234",
      },
    });
    try {
      await resolvePiOpenAICodexAccess(
        "codex-fixture",
        new AbortController().signal,
        async () => new Response("private-response", { status: 401 }),
      );
      assert.fail("Expected refresh rejection");
    } catch (error) {
      assert.include(String(error), "auth_rejected");
      assert.notInclude(String(error), "private-response");
    }
    const saved = await readPiCredential("codex-fixture");
    assert.isTrue(saved.ok);
    if (saved.ok && saved.material.kind === "openai-codex")
      assert.equal(saved.material.refresh, "previous-refresh");
  });

  it("streams a selected Codex model through the native SSE adapter", async function () {
    await putPiCredential({
      id: "codex-fixture",
      label: "Codex fixture",
      material: {
        kind: "openai-codex",
        access,
        refresh: "refresh-private",
        expiresAt: Date.now() + 3600_000,
        accountId: "account-1234",
      },
    });
    const selection: PiModelSelectionSnapshot = {
      configurationId: "codex-config",
      configurationLabel: "Codex",
      provider: "openai-codex",
      modelId: "fixture-model",
      authVariant: "openai-codex",
      credentialRef: "codex-fixture",
      api: "openai-codex-responses",
      baseUrl: "https://chatgpt.com/backend-api",
      reasoning: "off",
      catalogRevision: "fixture",
      adapterVersion: "0.84.4",
      runtimeVersion: "0.84.4",
      requiresLocalNetwork: false,
      policy: {
        contextWindow: 8192,
        maxTokens: 0,
        input: ["text"],
        supportsTools: false,
      },
    };
    let request: Request | undefined;
    const stream = createPiProviderModelSource(selection, {
      fetch: async (input, init) => {
        request = new Request(input, init);
        return new Response(
          [
            'data: {"type":"response.created","response":{"id":"r1"}}',
            'data: {"type":"response.output_item.added","output_index":0,"item":{"type":"message","id":"m1","role":"assistant"}}',
            'data: {"type":"response.output_text.delta","output_index":0,"delta":"hello"}',
            'data: {"type":"response.completed","response":{"id":"r1","status":"completed","output":[]}}',
            "",
          ].join("\n\n"),
          { headers: { "content-type": "text/event-stream" } },
        );
      },
    });
    let output = "";
    for await (const delta of stream({
      systemPrompt: "",
      messages: [{ role: "user", text: "hi" }],
      signal: new AbortController().signal,
    }))
      output += delta;
    assert.equal(output, "hello");
    assert.equal(request?.headers.get("originator"), "pi");
    assert.equal(request?.headers.get("chatgpt-account-id"), "account-1234");
    assert.equal(request?.headers.get("authorization"), `Bearer ${access}`);
    const requestBytes = Buffer.from(await request!.clone().arrayBuffer());
    const requestBody =
      request!.headers.get("content-encoding") === "zstd"
        ? zstdDecompressSync(requestBytes).toString("utf8")
        : requestBytes.toString("utf8");
    assert.equal(JSON.parse(requestBody).reasoning?.effort, "none");
    const denied = createPiProviderModelSource(selection, {
      fetch: async () => new Response("private-provider-body", { status: 401 }),
    });
    try {
      for await (const _ of denied({
        systemPrompt: "",
        messages: [{ role: "user", text: "hi" }],
        signal: new AbortController().signal,
      })) {
        assert.fail("Expected a denied Codex request");
      }
      assert.fail("Expected a denied Codex request");
    } catch (error) {
      assert.instanceOf(error, PiModelStreamFailure);
      assert.equal(
        (error as PiModelStreamFailure).code,
        "provider_auth_failed",
      );
      assert.notInclude(String(error), "private-provider-body");
    }
    await deletePiCredential("codex-fixture");
    try {
      for await (const _ of stream({
        systemPrompt: "",
        messages: [{ role: "user", text: "hi" }],
        signal: new AbortController().signal,
      })) {
        assert.fail("Expected a disconnected credential to fail closed");
      }
      assert.fail("Expected a disconnected credential to fail closed");
    } catch (error) {
      assert.instanceOf(error, PiModelStreamFailure);
      assert.equal((error as PiModelStreamFailure).code, "credential_missing");
    }
  });
});

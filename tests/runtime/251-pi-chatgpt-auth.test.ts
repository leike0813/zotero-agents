import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getPref, setPref } from "../../src/utils/prefs";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { installPluginStateNodeSqliteAdapter } from "../helpers/pluginStateNodeSqliteAdapter";
import {
  getPiCredentialIdentityRevision,
  getPiCredentialRevision,
  putPiCredential,
  readPiCredential,
} from "../../src/modules/piCredentialStore";
import {
  createPiChatGPTAuth,
  initializePiChatGPTAuth,
  PiChatGPTAuthFailure,
} from "../../src/modules/piChatGPTAuth";

const issuer = "https://auth.openai.com";
const clientId = "oaiapp_fixture";
const scope =
  "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
const encode = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");

describe("Pi ChatGPT authentication", function () {
  let root: string;
  let previousRoot: string | undefined;
  let previousCredentials: string;
  let previousConfiguration: string;
  let keys: CryptoKeyPair;
  let jwk: JsonWebKey;
  let owner: ReturnType<typeof createPiChatGPTAuth> | undefined;
  before(async function () {
    keys = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );
    jwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
  });
  beforeEach(async function () {
    previousRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-chatgpt-"));
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = root;
    installPluginStateNodeSqliteAdapter();
    resetPluginStateStoreForTests();
    previousCredentials = String(getPref("piCredentialEncryptedJson") || "");
    previousConfiguration = String(
      getPref("piProviderConfigurationJson") || "",
    );
    setPref("piCredentialEncryptedJson", "");
  });
  afterEach(async function () {
    await owner?.shutdown(Date.now() + 100);
    owner = undefined;
    setPref("piCredentialEncryptedJson", previousCredentials);
    setPref("piProviderConfigurationJson", previousConfiguration);
    resetPluginStateStoreForTests();
    if (previousRoot === undefined)
      delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    else process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRoot;
    await fs.rm(root, { recursive: true, force: true });
  });

  async function token(nonce: string, claims: Record<string, unknown> = {}) {
    const header = encode(
      new TextEncoder().encode(
        JSON.stringify({ alg: "RS256", kid: "fixture" }),
      ),
    );
    const payload = encode(
      new TextEncoder().encode(
        JSON.stringify({
          iss: issuer,
          aud: clientId,
          sub: "fixture-subject",
          exp: Math.floor(Date.now() / 1000) + 3600,
          nonce,
          email: "fixture@example.invalid",
          ...claims,
        }),
      ),
    );
    const input = `${header}.${payload}`;
    return `${input}.${encode(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(input))))}`;
  }

  function fixture(
    args: {
      scope?: string;
      claims?: Record<string, unknown>;
      expiresIn?: number;
      refresh?: (request: Request) => Promise<Response>;
      idToken?: (value: string) => string;
      callback?: (url: URL, deliver: (url: string) => number) => void;
    } = {},
  ) {
    let callback!: (url: string) => number;
    let authorize!: URL;
    let closed = 0;
    let exchanges = 0;
    const requests: Request[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      if (request.url.endsWith("openid-configuration"))
        return Response.json({
          issuer,
          jwks_uri: `${issuer}/.well-known/jwks.json`,
          revocation_endpoint: `${issuer}/api/accounts/oauth/revoke`,
        });
      if (request.url.endsWith("jwks.json"))
        return Response.json({
          keys: [{ ...jwk, kid: "fixture", alg: "RS256", use: "sig" }],
        });
      if (request.url.endsWith("/oauth/token")) {
        if (
          new URLSearchParams(await request.clone().text()).get(
            "grant_type",
          ) === "refresh_token"
        )
          return args.refresh
            ? args.refresh(request)
            : Response.json({
                access_token: "renewed-private",
                refresh_token: "rotated-private",
                expires_in: 3600,
                token_type: "Bearer",
              });
        exchanges++;
        return Response.json({
          access_token: "access-private",
          refresh_token: "refresh-private",
          id_token: (args.idToken || ((value) => value))(
            await token(authorize.searchParams.get("nonce")!, args.claims),
          ),
          expires_in: args.expiresIn ?? 3600,
          token_type: "Bearer",
          scope: args.scope ?? scope,
        });
      }
      if (request.url.endsWith("/oauth/revoke"))
        return new Response(null, { status: 200 });
      throw new Error("unexpected private URL");
    };
    owner = createPiChatGPTAuth({
      fetch: fetcher,
      listen: async (deliver) => {
        callback = deliver;
        return {
          redirectUri: "http://127.0.0.1:1455/auth/callback",
          close: () => {
            closed++;
          },
        };
      },
      launchURL: (url) => {
        authorize = new URL(url);
        const target = new URL(authorize.searchParams.get("redirect_uri")!);
        target.searchParams.set("state", authorize.searchParams.get("state")!);
        target.searchParams.set("code", "one-use-private-code");
        target.searchParams.set("client_id", clientId);
        queueMicrotask(() =>
          args.callback
            ? args.callback(target, callback)
            : callback(target.href),
        );
      },
    });
    return {
      auth: owner,
      requests,
      callback: (url: string) => callback(url),
      authorize: () => authorize,
      closed: () => closed,
      exchanges: () => exchanges,
    };
  }

  it("refuses to replace an API-key credential with a ChatGPT registration", async function () {
    await putPiCredential({
      id: "account",
      label: "Existing API key",
      material: { kind: "api-key", secret: "api-key-private" },
    });
    const f = fixture();
    const failure = await f.auth
      .connect({
        id: "account",
        label: "Research",
        signal: new AbortController().signal,
      })
      .catch((error) => error);

    assert.equal(failure.code, "credential_missing");
    assert.isEmpty(f.requests);
    const stored = await readPiCredential("account");
    assert.isTrue(stored.ok);
    if (stored.ok) {
      assert.equal(stored.material.kind, "api-key");
      if (stored.material.kind === "api-key")
        assert.equal(stored.material.secret, "api-key-private");
    }
  });

  it("verifies a browser registration and encrypts its granted credential without UI secrets", async function () {
    const f = fixture();
    const progress: unknown[] = [];
    const result = await f.auth.connect({
      id: "account",
      label: "Research",
      signal: new AbortController().signal,
      onProgress: (state) => progress.push(state),
    });
    assert.equal(result.kind, "chatgpt");
    const authorize = f.authorize();
    assert.equal(
      authorize.searchParams.get("client_id"),
      "dynamic_agent_client",
    );
    assert.equal(
      authorize.searchParams.get("agent_name_hint"),
      "Zotero Agents",
    );
    assert.equal(authorize.searchParams.get("code_challenge_method"), "S256");
    assert.match(
      authorize.searchParams.get("ext_agent_host_id")!,
      /^urn:uuid:/,
    );
    const exchanged = f.requests.find((request) =>
      request.url.endsWith("/oauth/token"),
    )!;
    const body = new URLSearchParams(await exchanged.clone().text());
    assert.equal(body.get("client_id"), clientId);
    assert.equal(
      body.get("redirect_uri"),
      authorize.searchParams.get("redirect_uri"),
    );
    const stored = await readPiCredential("account");
    assert.isTrue(stored.ok);
    if (stored.ok && stored.material.kind === "chatgpt") {
      assert.equal(stored.material.subject, "fixture-subject");
      assert.equal(stored.material.refresh, "refresh-private");
    }
    assert.equal(f.exchanges(), 1);
    assert.isAbove(f.closed(), 0);
    assert.equal(f.auth.registrations()[0].planEnabled, true);
    for (const projection of [
      JSON.stringify(progress),
      JSON.stringify(f.auth.registrations()),
      String(getPref("piCredentialEncryptedJson")),
    ]) {
      assert.notInclude(projection, "refresh-private");
      assert.notInclude(projection, "access-private");
      assert.notInclude(projection, "one-use-private-code");
    }
  });

  it("keeps returning registration identity stable and grants plan use only from token scopes", async function () {
    const f = fixture({ scope: "openid email" });
    await f.auth.connect({
      id: "account",
      label: "Research",
      signal: new AbortController().signal,
    });
    const identity = getPiCredentialIdentityRevision(
      "account",
      "model-provider",
    );
    const revision = getPiCredentialRevision("account", "model-provider");
    const host = f.authorize().searchParams.get("ext_agent_host_id");
    assert.isFalse(f.auth.registrations()[0].planEnabled);
    await f.auth.connect({
      id: "account",
      label: "Research",
      reconsent: true,
      signal: new AbortController().signal,
    });
    assert.equal(f.authorize().searchParams.get("client_id"), clientId);
    assert.equal(f.authorize().searchParams.get("ext_agent_host_id"), host);
    assert.isNull(f.authorize().searchParams.get("agent_name_hint"));
    assert.equal(f.authorize().searchParams.get("prompt"), "consent");
    assert.isString(f.authorize().searchParams.get("id_token_hint"));
    assert.equal(
      getPiCredentialIdentityRevision("account", "model-provider"),
      identity,
    );
    assert.notEqual(
      getPiCredentialRevision("account", "model-provider"),
      revision,
    );
  });

  for (const [name, claims] of Object.entries({
    issuer: { iss: "https://issuer.invalid" },
    audience: { aud: "another-client" },
    nonce: { nonce: "wrong-nonce" },
    expiry: { exp: 1 },
  })) {
    it(`refuses an ID token with invalid ${name} without publishing a registration`, async function () {
      const f = fixture({ claims });
      const result = await f.auth
        .connect({
          id: "account",
          label: "Research",
          signal: new AbortController().signal,
        })
        .then(
          () => undefined,
          (error) => error,
        );
      assert.instanceOf(result, PiChatGPTAuthFailure);
      assert.equal(result.code, "invalid_response");
      assert.isFalse((await readPiCredential("account")).ok);
      assert.isEmpty(f.auth.registrations());
    });
  }

  it("rejects stale state and duplicate callbacks without a second exchange", async function () {
    const statuses: number[] = [];
    const f = fixture({
      callback: (target, deliver) => {
        const wrong = new URL(target);
        wrong.searchParams.set("state", "wrong-state");
        statuses.push(
          deliver(wrong.href),
          deliver(target.href),
          deliver(target.href),
        );
      },
    });
    await f.auth.connect({
      id: "account",
      label: "Research",
      signal: new AbortController().signal,
    });
    assert.deepEqual(statuses, [400, 200, 409]);
    assert.equal(f.exchanges(), 1);
  });

  it("rejects an ID token with a forged signature", async function () {
    const f = fixture({
      idToken: (value) =>
        `${value.slice(0, value.lastIndexOf(".") + 1)}${encode(new Uint8Array(256))}`,
    });
    const failure = await f.auth
      .connect({
        id: "account",
        label: "Research",
        signal: new AbortController().signal,
      })
      .catch((error) => error);
    assert.equal(failure.code, "invalid_response");
    assert.isFalse((await readPiCredential("account")).ok);
  });

  it("cancels one active browser request and rejects its late callback", async function () {
    let callbackURL!: string;
    let launched!: () => void;
    const waiting = new Promise<void>((resolve) => {
      launched = resolve;
    });
    const f = fixture({
      callback: (url) => {
        callbackURL = url.href;
        launched();
      },
    });
    const input = {
      id: "account",
      label: "Research",
      requestId: "browser-request",
      signal: new AbortController().signal,
    };
    const login = f.auth.connect(input);
    assert.strictEqual(f.auth.connect(input), login);
    const settled = login.catch((error) => error);
    await waiting;
    f.auth.cancel("browser-request");
    assert.equal((await settled).code, "canceled");
    assert.equal(f.callback(callbackURL), 409);
    assert.equal(f.exchanges(), 0);
    assert.isAbove(f.closed(), 0);
    assert.isFalse((await readPiCredential("account")).ok);
  });

  it("does not overwrite a saved registration when a returning identity differs", async function () {
    const settings = { claims: {} as Record<string, unknown> };
    const f = fixture(settings);
    await f.auth.connect({
      id: "account",
      label: "Research",
      signal: new AbortController().signal,
    });
    const revision = getPiCredentialRevision("account", "model-provider");
    settings.claims = { sub: "another-subject" };
    const failure = await f.auth
      .connect({
        id: "account",
        label: "Research",
        signal: new AbortController().signal,
      })
      .then(
        () => undefined,
        (error) => error,
      );
    assert.equal(failure.code, "identity_mismatch");
    assert.equal(
      getPiCredentialRevision("account", "model-provider"),
      revision,
    );
  });

  it("renews an expired registration with its own issued client and atomically saves rotation", async function () {
    const f = fixture({ expiresIn: 1 });
    await f.auth.connect({
      id: "account",
      label: "Research",
      signal: new AbortController().signal,
    });
    const identity = getPiCredentialIdentityRevision(
      "account",
      "model-provider",
    )!;
    assert.equal(
      await f.auth.resolveAccess(
        "account",
        new AbortController().signal,
        undefined,
        { identityRevision: identity },
      ),
      "renewed-private",
    );
    const refresh = f.requests.at(-1)!;
    assert.equal(refresh.url, `${issuer}/api/accounts/oauth/token`);
    const body = new URLSearchParams(await refresh.clone().text());
    assert.equal(body.get("client_id"), clientId);
    assert.equal(body.get("resource"), "https://api.openai.com/v1");
    assert.isNull(body.get("scope"));
    assert.equal(
      getPiCredentialIdentityRevision("account", "model-provider"),
      identity,
    );
    const stored = await readPiCredential("account");
    assert.isTrue(stored.ok);
    if (stored.ok && stored.material.kind === "chatgpt")
      assert.equal(stored.material.refresh, "rotated-private");
  });

  it("requires welcome acceptance and permits one explicit quota recovery request", async function () {
    const f = fixture();
    const signal = new AbortController().signal;
    await f.auth.connect({ id: "account", label: "Research", signal });
    const denied = await f.auth
      .assertAllowed("account", signal)
      .catch((error) => error);
    assert.equal(denied.code, "welcome_required");
    await f.auth.acceptWelcome("account");
    await f.auth.assertAllowed("account", signal);
    await f.auth.pause("account");
    assert.equal(
      (await f.auth.assertAllowed("account", signal).catch((error) => error))
        .code,
      "quota_paused",
    );
    await f.auth.withResumeProbe("account", async (permit) => {
      await f.auth.assertAllowed("account", signal, permit);
      assert.equal(
        (
          await f.auth
            .assertAllowed("account", signal, permit)
            .catch((error) => error)
        ).code,
        "quota_paused",
      );
    });
    assert.isFalse(f.auth.registrations()[0].paused);
    await f.auth.pause("account");
    await f.auth.withResumeProbe("account", async (permit) => {
      await f.auth.assertAllowed("account", signal, permit);
      await f.auth.pause("account");
    });
    assert.isTrue(f.auth.registrations()[0].paused);
  });

  it("publishes safe registration snapshots when sign-in, quota pause, and sign-out change state", async function () {
    const f = fixture();
    const snapshots: Array<readonly unknown[]> = [];
    const unsubscribe = f.auth.subscribeRegistrations((registrations) => {
      snapshots.push(registrations);
    });
    await f.auth.connect({
      id: "account",
      label: "Research",
      signal: new AbortController().signal,
    });
    await f.auth.pause("account");
    await f.auth.signOut("account", { deadline: Date.now() + 1000 });
    unsubscribe();

    assert.equal(snapshots.length, 4);
    assert.isEmpty(snapshots[0]);
    const signedIn = snapshots[1][0] as Record<string, unknown>;
    assert.equal(signedIn.signedIn, true);
    const paused = snapshots[2][0] as Record<string, unknown>;
    assert.equal(paused.paused, true);
    const signedOut = snapshots[3][0] as Record<string, unknown>;
    assert.equal(signedOut.signedIn, false);
    assert.equal(signedOut.paused, true);
    const serialized = JSON.stringify(snapshots);
    for (const privateValue of [
      "fixture-subject",
      "access-private",
      "refresh-private",
      "one-use-private-code",
    ])
      assert.notInclude(serialized, privateValue);
  });

  it("signs out with the latest refresh token while retaining registration identity", async function () {
    const f = fixture({ expiresIn: 1 });
    await f.auth.connect({
      id: "account",
      label: "Research",
      signal: new AbortController().signal,
    });
    await f.auth.resolveAccess("account", new AbortController().signal);
    await f.auth.pause("account");
    const result = await f.auth.signOut("account", {
      deadline: Date.now() + 1000,
    });
    assert.equal(result.revocation, "confirmed");
    assert.isFalse((await readPiCredential("account")).ok);
    assert.equal(f.auth.registrations()[0].clientId, clientId);
    assert.isFalse(f.auth.registrations()[0].signedIn);
    assert.isTrue(f.auth.registrations()[0].paused);
    const revoke = f.requests.find((request) =>
      request.url.endsWith("/oauth/revoke"),
    )!;
    assert.equal(
      new URLSearchParams(await revoke.text()).get("token"),
      "rotated-private",
    );
  });

  it("does not discard a started rotation when one waiting caller cancels", async function () {
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const f = fixture({
      expiresIn: 1,
      refresh: async () => {
        entered();
        await barrier;
        return Response.json({
          access_token: "renewed-private",
          refresh_token: "rotated-private",
          expires_in: 3600,
          token_type: "Bearer",
        });
      },
    });
    await f.auth.connect({
      id: "account",
      label: "Research",
      signal: new AbortController().signal,
    });
    const cancel = new AbortController();
    const first = f.auth
      .resolveAccess("account", cancel.signal)
      .catch((error) => error);
    await started;
    const second = f.auth.resolveAccess(
      "account",
      new AbortController().signal,
    );
    cancel.abort();
    assert.equal((await first).code, "canceled");
    release();
    assert.equal(await second, "renewed-private");
    assert.equal(
      f.requests.filter((request) => request.url.endsWith("/oauth/token"))
        .length,
      2,
    );
  });

  it("cleans only retired development credentials, selections and their defaults", async function () {
    await putPiCredential({
      id: "api",
      label: "API",
      material: { kind: "api-key", secret: "retained" },
    });
    const encrypted = JSON.parse(String(getPref("piCredentialEncryptedJson")));
    encrypted.records.retired = {
      ...encrypted.records.api,
      id: "retired",
      kind: "openai-codex",
    };
    setPref("piCredentialEncryptedJson", JSON.stringify(encrypted));
    const configuration = {
      version: 2,
      connections: [
        {
          id: "old",
          provider: "openai-codex",
          authVariant: "openai-codex",
          credentialRef: "retired",
          binding: {
            revision: 1,
            api: "openai-codex-responses",
            baseUrl: "https://chatgpt.com/backend-api/codex",
          },
        },
        {
          id: "api-config",
          label: "API",
          provider: "openai",
          authVariant: "api-key",
          credentialRef: "api",
          enabled: true,
          baseUrl: "https://api.openai.com/v1",
          api: "openai-responses",
          requiresLocalNetwork: false,
          binding: {
            revision: 1,
            api: "openai-responses",
            baseUrl: "https://api.openai.com/v1",
          },
        },
        // A current connection no purpose happens to name. The retired cleanup
        // is about the retired authentication, never about reachability.
        {
          id: "spare",
          label: "Spare",
          provider: "anthropic",
          authVariant: "api-key",
          credentialRef: "spare-key",
          enabled: false,
        },
      ],
      configurations: [
        {
          id: "old",
          connectionId: "old",
          modelId: "gpt-codex",
          enabled: true,
        },
        {
          id: "api-config",
          connectionId: "api-config",
          modelId: "fixture-model",
          enabled: true,
          binding: {
            revision: 1,
            model: {
              provider: "openai",
              id: "fixture-model",
              name: "Fixture",
              api: "openai-responses",
              baseUrl: "https://api.openai.com/v1",
              contextWindow: 1000,
              maxTokens: 100,
              input: ["text"],
              supportsTools: true,
              reasoning: ["off"],
              source: "retained",
            },
          },
        },
      ],
      defaults: {
        global: { configurationId: "old" },
        conversation: { configurationId: "api-config" },
      },
      overlayPath: "retained-overlay",
    };
    setPref("piProviderConfigurationJson", JSON.stringify(configuration));
    await initializePiChatGPTAuth();
    await initializePiChatGPTAuth();
    assert.isFalse((await readPiCredential("retired")).ok);
    assert.isTrue((await readPiCredential("api")).ok);
    const cleaned = JSON.parse(String(getPref("piProviderConfigurationJson")));
    assert.deepEqual(cleaned.connections, [
      configuration.connections[1],
      configuration.connections[2],
    ]);
    assert.deepEqual(cleaned.configurations, [configuration.configurations[1]]);
    assert.deepEqual(cleaned.defaults, {
      conversation: configuration.defaults.conversation,
    });
    assert.equal(cleaned.overlayPath, "retained-overlay");
  });

  it("rejects ChatGPT sign-out for an unrelated API-key credential", async function () {
    await putPiCredential({
      id: "api",
      label: "API",
      material: { kind: "api-key", secret: "retained" },
    });
    const f = fixture();
    const result = await f.auth.signOut("api").catch((error) => error);
    assert.equal(result.code, "credential_missing");
    assert.isTrue((await readPiCredential("api")).ok);
    assert.isEmpty(f.requests);
  });

  it("keeps a missing plan grant signed in and denies inference after welcome", async function () {
    const f = fixture({ scope: "openid email" });
    const signal = new AbortController().signal;
    await f.auth.connect({ id: "account", label: "Research", signal });
    assert.isTrue(f.auth.registrations()[0].signedIn);
    assert.equal(
      (await f.auth.acceptWelcome("account").catch((error) => error)).code,
      "permission_missing",
    );
    assert.equal(
      (await f.auth.assertAllowed("account", signal).catch((error) => error))
        .code,
      "permission_missing",
    );
  });

  it("persists quota isolation and refuses failed or concurrent recovery probes", async function () {
    const f = fixture();
    const signal = new AbortController().signal;
    await f.auth.connect({ id: "account", label: "Research", signal });
    await f.auth.connect({ id: "other", label: "Second registration", signal });
    await f.auth.acceptWelcome("account");
    await f.auth.acceptWelcome("other");
    await f.auth.pause("account");
    await f.auth.shutdown(Date.now() + 100);
    const next = fixture();
    await next.auth.assertAllowed("other", signal);
    assert.equal(
      (await next.auth.assertAllowed("account", signal).catch((error) => error))
        .code,
      "quota_paused",
    );
    await next.auth
      .withResumeProbe("account", async (permit) => {
        await next.auth.assertAllowed("account", signal, permit);
        assert.equal(
          (
            await next.auth
              .withResumeProbe("account", async () => undefined)
              .catch((error) => error)
          ).code,
          "probe_active",
        );
        throw new Error("probe_failed");
      })
      .catch(() => undefined);
    assert.isTrue(
      next.auth
        .registrations()
        .find((registration) => registration.id === "account")!.paused,
    );
  });

  it("clears local credentials within the logout deadline and rejects a late rotation", async function () {
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const f = fixture({
      expiresIn: 1,
      refresh: async () => {
        entered();
        await barrier;
        return Response.json({
          access_token: "late-access",
          refresh_token: "late-refresh",
          expires_in: 3600,
          token_type: "Bearer",
        });
      },
    });
    await f.auth.connect({
      id: "account",
      label: "Research",
      signal: new AbortController().signal,
    });
    const refreshing = f.auth
      .resolveAccess("account", new AbortController().signal)
      .catch((error) => error);
    await started;
    const result = await f.auth.signOut("account", {
      deadline: Date.now() + 30,
    });
    assert.equal(result.revocation, "unconfirmed");
    assert.isFalse((await readPiCredential("account")).ok);
    release();
    assert.instanceOf(await refreshing, PiChatGPTAuthFailure);
    assert.isFalse((await readPiCredential("account")).ok);
  });

  it("leaves an interrupted rotation requiring reauthorization after shutdown", async function () {
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const f = fixture({
      expiresIn: 1,
      refresh: async () => {
        entered();
        return new Promise<Response>(() => undefined);
      },
    });
    await f.auth.connect({
      id: "account",
      label: "Research",
      signal: new AbortController().signal,
    });
    const refreshing = f.auth
      .resolveAccess("account", new AbortController().signal)
      .catch((error) => error);
    await started;
    await f.auth.shutdown(Date.now() + 100);
    assert.equal((await refreshing).code, "canceled");
    const next = fixture();
    assert.equal(
      (
        await next.auth
          .resolveAccess("account", new AbortController().signal)
          .catch((error) => error)
      ).code,
      "reauthorization_required",
    );
    assert.isEmpty(next.requests);
  });
});

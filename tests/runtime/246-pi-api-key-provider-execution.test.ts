import { assert } from "chai";
import { getPref, setPref } from "../../src/utils/prefs";
import { putPiCredential } from "../../src/modules/piCredentialStore";
import { createPiApiKeyModelSource } from "../../src/modules/piApiKeyProviderExecution";
import { PiRuntime } from "../../src/modules/piRuntime";
import type { PiModelSelectionSnapshot } from "../../src/shared/piProviderContract";

const selection: PiModelSelectionSnapshot = {
  configurationId: "test-config",
  configurationLabel: "Test",
  provider: "fixture-provider",
  modelId: "fixture-model",
  authVariant: "api-key",
  credentialRef: "fixture-key",
  api: "openai-completions",
  baseUrl: "https://provider.example/v1",
  reasoning: "off",
  catalogRevision: "fixture",
  adapterVersion: "0.84.4",
  runtimeVersion: "0.84.4",
  requiresLocalNetwork: false,
  policy: {
    contextWindow: 8192,
    maxTokens: 1024,
    input: ["text"],
    supportsTools: false,
  },
};
const COMPLETIONS_SSE =
  'data: {"id":"a","object":"chat.completion.chunk","created":1,"model":"fixture-model","choices":[{"index":0,"delta":{"content":"hello"},"finish_reason":null}]}\n\ndata: {"id":"a","object":"chat.completion.chunk","created":1,"model":"fixture-model","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n';

describe("Pi API-key Provider execution", function () {
  let prior: string;
  beforeEach(function () {
    prior = String(getPref("piCredentialEncryptedJson") || "");
    setPref("piCredentialEncryptedJson", "");
  });
  afterEach(function () {
    setPref("piCredentialEncryptedJson", prior);
  });

  async function collect(source: ReturnType<typeof createPiApiKeyModelSource>) {
    const result: string[] = [];
    for await (const delta of source({
      systemPrompt: "",
      messages: [{ role: "user", text: "hi" }],
      signal: new AbortController().signal,
    }))
      result.push(delta);
    return result.join("");
  }

  it("streams from the frozen selection using only the selected credential", async function () {
    await putPiCredential({
      id: "fixture-key",
      label: "Fixture",
      material: { kind: "api-key", secret: "fixture-secret" },
    });
    const requests: Request[] = [];
    const fetchFixture: typeof fetch = async (input, init) => {
      requests.push(new Request(input, init));
      return new Response(COMPLETIONS_SSE, {
        headers: { "content-type": "text/event-stream" },
      });
    };
    const source = createPiApiKeyModelSource(selection, {
      fetch: fetchFixture,
    });
    const deltas: string[] = [];
    for await (const delta of source({
      systemPrompt: "",
      messages: [{ role: "user", text: "hi" }],
      signal: new AbortController().signal,
    }))
      deltas.push(delta);
    assert.equal(deltas.join(""), "hello");
    assert.lengthOf(requests, 1);
    assert.equal(new URL(requests[0].url).origin, "https://provider.example");
    assert.equal(
      requests[0].headers.get("authorization"),
      "Bearer fixture-secret",
    );
  });

  it("does not send ambient authorization to an explicitly keyless endpoint", async function () {
    let authorization: string | null = null;
    const source = createPiApiKeyModelSource(
      {
        ...selection,
        authVariant: "none",
        credentialRef: undefined,
      },
      {
        fetch: async (input, init) => {
          authorization = new Request(input, init).headers.get("authorization");
          return new Response(COMPLETIONS_SSE, {
            headers: { "content-type": "text/event-stream" },
          });
        },
      },
    );
    await collect(source);
    assert.isNull(authorization);
  });

  it("fails before network when the selected credential has been cleared", async function () {
    let called = false;
    const source = createPiApiKeyModelSource(selection, {
      fetch: async () => {
        called = true;
        throw new Error("unexpected request");
      },
    });
    try {
      await collect(source);
      assert.fail("Expected credential_missing");
    } catch (error) {
      assert.include(String(error), "credential_missing");
    }
    assert.isFalse(called);
  });

  it("refuses a local endpoint without Local Network authorization", async function () {
    let called = false;
    const source = createPiApiKeyModelSource(
      { ...selection, requiresLocalNetwork: true },
      {
        fetch: async () => {
          called = true;
          throw new Error("unexpected request");
        },
      },
    );
    try {
      await collect(source);
      assert.fail("Expected provider_unavailable");
    } catch (error) {
      assert.include(String(error), "provider_unavailable");
    }
    assert.isFalse(called);
  });

  it("preserves a redacted authentication failure through the Pi turn terminal", async function () {
    await putPiCredential({
      id: "fixture-key",
      label: "Fixture",
      material: { kind: "api-key", secret: "fixture-secret" },
    });
    const source = createPiApiKeyModelSource(selection, {
      fetch: async () =>
        new Response("private-response fixture-secret", { status: 401 }),
    });
    const session = new PiRuntime().openSession({
      sessionId: "provider-test",
      modelStream: source,
    });
    const result = await session.runTurn({ turnId: "auth", prompt: "hi" })
      .result;
    assert.equal(result.status, "failed");
    if (result.status === "failed")
      assert.equal(result.failure.code, "provider_auth_failed");
    assert.notInclude(JSON.stringify(result), "fixture-secret");
    assert.notInclude(JSON.stringify(result), "private-response");
    session.dispose();
  });

  for (const [status, code] of [
    [429, "provider_rate_limited"],
    [503, "provider_unavailable"],
    [400, "provider_http_error"],
  ] as const) {
    it(`classifies HTTP ${status} without exposing response data`, async function () {
      await putPiCredential({
        id: "fixture-key",
        label: "Fixture",
        material: { kind: "api-key", secret: "fixture-secret" },
      });
      const session = new PiRuntime().openSession({
        sessionId: `http-${status}`,
        modelStream: createPiApiKeyModelSource(selection, {
          fetch: async () =>
            new Response("private-response fixture-secret", { status }),
        }),
      });
      const result = await session.runTurn({ turnId: "turn", prompt: "hi" })
        .result;
      assert.equal(result.status, "failed");
      if (result.status === "failed") assert.equal(result.failure.code, code);
      assert.notInclude(JSON.stringify(result), "fixture-secret");
      assert.notInclude(JSON.stringify(result), "private-response");
      session.dispose();
    });
  }

  for (const [name, fetchFixture, code] of [
    [
      "network rejection",
      async () => {
        throw new Error("private network detail");
      },
      "provider_network_error",
    ],
    [
      "incomplete stream",
      async () =>
        new Response(
          'data: {"id":"a","object":"chat.completion.chunk","created":1,"model":"fixture-model","choices":[{"index":0,"delta":{"content":"hello"},"finish_reason":null}]}\n\ndata: [DONE]\n\n',
          { headers: { "content-type": "text/event-stream" } },
        ),
      "provider_stream_error",
    ],
  ] as const) {
    it(`redacts ${name}`, async function () {
      await putPiCredential({
        id: "fixture-key",
        label: "Fixture",
        material: { kind: "api-key", secret: "fixture-secret" },
      });
      const session = new PiRuntime().openSession({
        sessionId: name,
        modelStream: createPiApiKeyModelSource(selection, {
          fetch: fetchFixture,
        }),
      });
      const result = await session.runTurn({ turnId: "turn", prompt: "hi" })
        .result;
      assert.equal(result.status, "failed");
      if (result.status === "failed") assert.equal(result.failure.code, code);
      assert.notInclude(JSON.stringify(result), "fixture-secret");
      assert.notInclude(JSON.stringify(result), "private network detail");
      session.dispose();
    });
  }

  it("rejects keyless non-OpenAI dialects before network", async function () {
    let called = false;
    const source = createPiApiKeyModelSource(
      {
        ...selection,
        authVariant: "none",
        credentialRef: undefined,
        api: "anthropic-messages",
      },
      {
        fetch: async () => {
          called = true;
          throw new Error("unexpected request");
        },
      },
    );
    try {
      await collect(source);
      assert.fail("Expected unsupported_provider");
    } catch (error) {
      assert.include(String(error), "unsupported_provider");
    }
    assert.isFalse(called);
  });

  it("refuses a custom fetch injection for the native Google adapter", async function () {
    let called = false;
    const source = createPiApiKeyModelSource(
      { ...selection, api: "google-generative-ai" },
      {
        fetch: async () => {
          called = true;
          throw new Error("unexpected request");
        },
      },
    );
    try {
      await collect(source);
      assert.fail("Expected unsupported_provider");
    } catch (error) {
      assert.include(String(error), "unsupported_provider");
    }
    assert.isFalse(called);
  });

  it("propagates cancellation to the request and keeps a canceled terminal", async function () {
    await putPiCredential({
      id: "fixture-key",
      label: "Fixture",
      material: { kind: "api-key", secret: "fixture-secret" },
    });
    let requestStarted!: () => void;
    const started = new Promise<void>((resolve) => (requestStarted = resolve));
    let requestAborted = false;
    const source = createPiApiKeyModelSource(selection, {
      fetch: async (input, init) => {
        const request = new Request(input, init);
        requestStarted();
        return new Promise<Response>((_resolve, reject) => {
          request.signal.addEventListener("abort", () => {
            requestAborted = true;
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      },
    });
    const session = new PiRuntime().openSession({
      sessionId: "cancel-test",
      modelStream: source,
    });
    const turn = session.runTurn({ turnId: "turn", prompt: "hi" });
    await started;
    turn.abort();
    const result = await turn.result;
    assert.equal(result.status, "canceled");
    assert.isTrue(requestAborted);
    session.dispose();
  });
});

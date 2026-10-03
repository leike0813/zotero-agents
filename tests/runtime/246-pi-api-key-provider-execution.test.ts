import { assert } from "chai";
import { getPref, setPref } from "../../src/utils/prefs";
import { putPiCredential } from "../../src/modules/piCredentialStore";
import {
  createPiProviderModelSource,
  createPiProviderSource,
} from "../../src/modules/piProviderExecution";
import { normalizeContext, Type } from "@earendil-works/pi-ai";
import { PiRuntime } from "../../src/modules/piRuntime";
import type { PiModelSelectionSnapshot } from "../../src/shared/piProviderContract";
import type { PiRuntimeAuditContext } from "../../src/modules/piRuntimeAudit";
import {
  flushOwner,
  resetPiRuntimeAuditForTests,
} from "../../src/modules/piRuntimeAudit";
import { createPiOwner } from "../../src/modules/piOwnerPersistence";
import { piOwnerPaths } from "../../src/modules/piTranscriptStore";
import {
  readRuntimeTextFileStrict,
  runtimePathExists,
} from "../../src/modules/runtimePersistence";
import { setRuntimeLogDiagnosticMode } from "../../src/modules/runtimeLogManager";
import { joinPath } from "../../src/utils/path";
import {
  createTestRuntimeRoot,
  removeTestRuntimeRoot,
} from "./piTestRuntimeRoot";

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
const USAGE_SSE =
  'data: {"id":"a","object":"chat.completion.chunk","created":1,"model":"fixture-model","choices":[{"index":0,"delta":{"content":"hello"},"finish_reason":null}]}\n\ndata: {"id":"a","object":"chat.completion.chunk","created":1,"model":"fixture-model","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":1000,"completion_tokens":500}}\n\ndata: [DONE]\n\n';
const RATES = {
  input: 1,
  output: 2,
  cacheRead: 0.5,
  cacheWrite: 1.5,
};

describe("Pi API-key Provider execution", function () {
  let prior: string;
  beforeEach(function () {
    prior = String(getPref("piCredentialEncryptedJson") || "");
    setPref("piCredentialEncryptedJson", "");
  });
  afterEach(function () {
    setPref("piCredentialEncryptedJson", prior);
  });

  async function collect(
    source: ReturnType<typeof createPiProviderModelSource>,
  ) {
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
    const source = createPiProviderModelSource(
      { ...selection, reasoning: "low" },
      { fetch: fetchFixture },
    );
    const deltas: string[] = [];
    for await (const delta of source({
      systemPrompt: "prepared-instructions",
      messages: [{ role: "user", text: "hi" }],
      signal: new AbortController().signal,
    }))
      deltas.push(delta);
    assert.equal(deltas.join(""), "hello");
    assert.lengthOf(requests, 1);
    const body = await requests[0].clone().json();
    assert.equal(body.reasoning_effort, "low");
    assert.equal(new URL(requests[0].url).origin, "https://provider.example");
    assert.equal(
      requests[0].headers.get("authorization"),
      "Bearer fixture-secret",
    );
    // The structured path already carries SDK system messages. Normalizing it
    // again must preserve each instruction and tool declaration once.
    const prepared = createPiProviderSource(selection, { fetch: fetchFixture });
    const stream = await prepared.source({
      sessionId: "prepared",
      turnId: "prepared",
      invocationId: "prepared:0",
      model: prepared.model,
      signal: new AbortController().signal,
      context: normalizeContext({
        systemPrompt: "prepared-instructions",
        messages: [{ role: "user", content: "hi", timestamp: 0 }],
        tools: [
          {
            name: "read",
            description: "Read a document",
            parameters: Type.Object({}),
          },
        ],
      }),
    });
    assert.equal((await stream.result()).stopReason, "stop");
    const preparedBody = await requests[1].clone().json();
    for (const requestBody of [body, preparedBody]) {
      const instructions = requestBody.messages.filter(
        (message: { role: string }) =>
          message.role === "system" || message.role === "developer",
      );
      assert.lengthOf(instructions, 1);
      assert.equal(instructions[0].content, "prepared-instructions");
    }
    assert.lengthOf(preparedBody.tools, 1);
    assert.equal(preparedBody.tools[0].function.name, "read");
    assert.equal(preparedBody.tools[0].function.description, "Read a document");
  });

  it("does not send ambient authorization to an explicitly keyless endpoint", async function () {
    let authorization: string | null = null;
    const source = createPiProviderModelSource(
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
    const source = createPiProviderModelSource(selection, {
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
    const source = createPiProviderModelSource(
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
    const source = createPiProviderModelSource(selection, {
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
        modelStream: createPiProviderModelSource(selection, {
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
        modelStream: createPiProviderModelSource(selection, {
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
    const source = createPiProviderModelSource(
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
    const source = createPiProviderModelSource(
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
    const source = createPiProviderModelSource(selection, {
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

  // C18: the provider is a fact owner for transport boundaries only. Turn and
  // model invocation boundaries belong to the Runtime and are never
  // re-reported here. A transport fact carries the HTTP status, a duration and
  // the normalized failure code — never a prompt, response body, header,
  // credential, URL or exception text.
  describe("provider structural audit", function () {
    let root: string;
    const owner = { kind: "conversation" as const, ownerId: "provider-audit" };

    beforeEach(async function () {
      root = await createTestRuntimeRoot("pi-provider-audit");
      await resetPiRuntimeAuditForTests();
      await createPiOwner(owner, root);
      // Transport is a diagnostic-tier fact, so the assertion needs Diagnostic
      // Mode; the default is proved silent by the case at the end.
      setRuntimeLogDiagnosticMode(true);
    });

    afterEach(async function () {
      await resetPiRuntimeAuditForTests();
      setRuntimeLogDiagnosticMode(false);
      await removeTestRuntimeRoot(root);
    });

    async function transportFacts(context?: PiRuntimeAuditContext) {
      await flushOwner(owner, root);
      const path = joinPath(
        piOwnerPaths(owner, root).dir,
        "workspace",
        "runtime-audit",
        "audit.ndjson",
      );
      if (!(await runtimePathExists(path))) return [];
      return (await readRuntimeTextFileStrict(path))
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .filter((fact) => fact.operation === "provider.transport");
    }

    it("records status and duration without a body, credential or URL", async function () {
      await putPiCredential({
        id: "fixture-key",
        label: "Fixture",
        material: { kind: "api-key", secret: "fixture-secret" },
      });
      const source = createPiProviderModelSource(selection, {
        fetch: async () =>
          new Response(COMPLETIONS_SSE, {
            headers: { "content-type": "text/event-stream" },
          }),
        audit: { owner, root },
      });
      const deltas: string[] = [];
      for await (const delta of source({
        systemPrompt: "system-prompt-canary",
        messages: [{ role: "user", text: "user-text-canary" }],
        signal: new AbortController().signal,
      }))
        deltas.push(delta);
      assert.equal(deltas.join(""), "hello");

      const facts = await transportFacts();
      assert.lengthOf(facts, 1);
      assert.equal(facts[0].details.status, 200);
      assert.isNumber(facts[0].details.duration);
      const serialized = JSON.stringify(facts);
      assert.notInclude(serialized, "canary");
      assert.notInclude(serialized, "fixture-secret");
      assert.notInclude(serialized, "provider.example");
      assert.notInclude(serialized, "authorization");
    });

    it("records the failing status without repeating the failure code", async function () {
      await putPiCredential({
        id: "fixture-key",
        label: "Fixture",
        material: { kind: "api-key", secret: "fixture-secret" },
      });
      const source = createPiProviderModelSource(selection, {
        fetch: async () =>
          new Response("private-response-body-canary", { status: 401 }),
        audit: { owner, root },
      });
      try {
        await collect(source);
        assert.fail("Expected an authentication failure");
      } catch (error) {
        assert.include(String(error), "provider_auth_failed");
      }
      const facts = await transportFacts();
      assert.equal(facts[0]?.details.status, 401);
      assert.notInclude(JSON.stringify(facts), "canary");
    });

    it("stays silent without an audit context", async function () {
      await putPiCredential({
        id: "fixture-key",
        label: "Fixture",
        material: { kind: "api-key", secret: "fixture-secret" },
      });
      const source = createPiProviderModelSource(selection, {
        fetch: async () =>
          new Response(COMPLETIONS_SSE, {
            headers: { "content-type": "text/event-stream" },
          }),
        audit: { owner, root },
      });
      // The context is required for a fact to exist at all; a source without
      // one still streams normally.
      assert.equal(await collect(source), "hello");
    });
  });

  // Change B: the provider consumes the frozen selection it was given. It maps
  // only understood declarative facts, never remote headers, and it enforces the
  // serialized request bounds that the SDK does not enforce itself.
  it("maps understood frozen metadata into the request and reports the real usage", async function () {
    await putPiCredential({
      id: "fixture-key",
      label: "Fixture",
      material: { kind: "api-key", secret: "fixture-secret" },
    });
    const requests: Request[] = [];
    const priced = {
      ...selection,
      reasoning: "low" as const,
      metadata: {
        cost: RATES,
        promptCache: { short: 300, long: 3600 },
        inputLimits: { maxRequestBytes: 65536 },
        thinkingLevelMap: { low: "think-low" },
        compat: {
          supportsStore: false,
          maxTokensField: "max_tokens",
          remoteOnlyKey: "not-understood",
        },
        knowledge: {
          context: "known" as const,
          output: "known" as const,
          input: "known" as const,
          tools: "unknown" as const,
          reasoning: "known" as const,
        },
        provenance: {
          source: "official" as const,
          revision: "sha256-1",
          schemaVersion: 1,
        },
      },
    };
    const prepared = createPiProviderSource(priced, {
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return new Response(USAGE_SSE, {
          headers: { "content-type": "text/event-stream" },
        });
      },
    });
    assert.equal(prepared.model.cost.input, RATES.input);
    assert.deepEqual(prepared.model.thinkingLevelMap, { low: "think-low" });
    assert.deepEqual(prepared.model.promptCache, { short: 300, long: 3600 });
    assert.deepEqual(prepared.model.inputLimits, priced.metadata.inputLimits);
    assert.deepEqual(prepared.model.compat, {
      supportsStore: false,
      maxTokensField: "max_tokens",
    });
    // Remote metadata never becomes a request header or a routing privilege.
    assert.isUndefined((prepared.model as { headers?: unknown }).headers);

    const result = await (
      await prepared.source({
        sessionId: "priced",
        turnId: "turn",
        invocationId: "priced:0",
        model: prepared.model,
        signal: new AbortController().signal,
        context: normalizeContext({
          systemPrompt: "",
          messages: [{ role: "user", content: "hi", timestamp: 0 }],
        }),
      })
    ).result();
    assert.equal(result.stopReason, "stop");
    assert.equal(result.usage.input, 1000);
    assert.equal(result.usage.output, 500);
    // The frozen rates, not a fabricated zero, price the obtained usage.
    assert.closeTo(result.usage.cost.input, 0.001, 1e-9);
    assert.closeTo(result.usage.cost.output, 0.001, 1e-9);

    const body = await requests[0].clone().json();
    // The thinking map, the compat flag and the max-token field all come from
    // the frozen selection rather than from this provider's defaults.
    assert.equal(body.reasoning_effort, "think-low");
    assert.isUndefined(body.store);
    assert.equal(body.max_tokens, selection.policy.maxTokens);
    assert.isUndefined(body.max_completion_tokens);
  });

  it("refuses a request that exceeds a known serialized byte or image bound before transport", async function () {
    await putPiCredential({
      id: "fixture-key",
      label: "Fixture",
      material: { kind: "api-key", secret: "fixture-secret" },
    });
    let called = false;
    const fetchFixture: typeof fetch = async () => {
      called = true;
      return new Response(COMPLETIONS_SSE, {
        headers: { "content-type": "text/event-stream" },
      });
    };
    const bytes = createPiProviderModelSource(
      {
        ...selection,
        metadata: { inputLimits: { maxRequestBytes: 16 } },
      },
      { fetch: fetchFixture },
    );
    try {
      await collect(bytes);
      assert.fail("Expected the frozen request bound to refuse the request");
    } catch (error) {
      assert.include(String(error), "unsupported_model");
    }
    assert.isFalse(called);

    const images = createPiProviderSource(
      {
        ...selection,
        policy: { ...selection.policy, input: ["text", "image"] },
        metadata: { inputLimits: { images: { maxPerRequest: 1 } } },
      },
      { fetch: fetchFixture },
    );
    try {
      await images.source({
        sessionId: "images",
        turnId: "turn",
        invocationId: "images:0",
        model: images.model,
        signal: new AbortController().signal,
        context: normalizeContext({
          systemPrompt: "",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "compare" },
                { type: "image", data: "AAAA", mimeType: "image/png" },
                { type: "image", data: "BBBB", mimeType: "image/png" },
              ],
              timestamp: 0,
            },
          ],
        }),
      });
      assert.fail("Expected the frozen image bound to refuse the request");
    } catch (error) {
      assert.include(String(error), "unsupported_model");
    }
    assert.isFalse(called);
  });

  it("refuses an explicitly unsupported reasoning level from the frozen thinking map", async function () {
    let called = false;
    const source = createPiProviderModelSource(
      {
        ...selection,
        reasoning: "high",
        metadata: { thinkingLevelMap: { high: null } },
      },
      {
        fetch: async () => {
          called = true;
          return new Response(COMPLETIONS_SSE, {
            headers: { "content-type": "text/event-stream" },
          });
        },
      },
    );
    try {
      await collect(source);
      assert.fail("Expected the unsupported reasoning level to be refused");
    } catch (error) {
      assert.include(String(error), "unsupported_model");
    }
    assert.isFalse(called);
  });

  it("reports the applicable frozen price, and no price at all when there is none", function () {
    // A selection with no declared price stays unknown; the typed zero rates on
    // the SDK model are never handed out as a price.
    assert.isNull(createPiProviderSource(selection, {}).pricing);
    const priced = {
      ...selection,
      metadata: {
        cost: { ...RATES, tiers: [{ inputTokensAbove: 1000, ...RATES }] },
      },
    };
    assert.deepEqual(createPiProviderSource(priced, {}).pricing, {
      ...RATES,
      tiers: [{ inputTokensAbove: 1000, ...RATES }],
    });
    // A snapshot frozen before the metadata field kept the same price on the
    // policy it was frozen with.
    const legacy = {
      ...selection,
      policy: { ...selection.policy, cost: RATES },
    };
    assert.deepEqual(createPiProviderSource(legacy, {}).pricing, RATES);
  });

  it("keeps the reported usage of a failed stream instead of a synthetic zero", async function () {
    await putPiCredential({
      id: "fixture-key",
      label: "Fixture",
      material: { kind: "api-key", secret: "fixture-secret" },
    });
    // The provider reported usage, then the stream ended without completing.
    const truncated =
      'data: {"id":"a","object":"chat.completion.chunk","created":1,"model":"fixture-model","choices":[{"index":0,"delta":{"content":"hello"},"finish_reason":null}]}\n\ndata: {"id":"a","object":"chat.completion.chunk","created":1,"model":"fixture-model","choices":[{"index":0,"delta":{},"finish_reason":null}],"usage":{"prompt_tokens":700,"completion_tokens":300}}\n\n';
    const prepared = createPiProviderSource(
      { ...selection, metadata: { cost: RATES } },
      {
        fetch: async () =>
          new Response(truncated, {
            headers: { "content-type": "text/event-stream" },
          }),
      },
    );
    const result = await (
      await prepared.source({
        sessionId: "truncated",
        turnId: "turn",
        invocationId: "truncated:0",
        model: prepared.model,
        signal: new AbortController().signal,
        context: normalizeContext({
          systemPrompt: "",
          messages: [{ role: "user", content: "hi", timestamp: 0 }],
        }),
      })
    ).result();
    assert.equal(result.stopReason, "error");
    assert.equal(result.usage.input, 700);
    assert.equal(result.usage.output, 300);
    assert.isTrue(prepared.usageKnown(result));
    // A truncated stream is still priced from the frozen rates, never claimed
    // as free.
    assert.closeTo(result.usage.cost.input, 0.0007, 1e-9);
  });

  it("tells reported token evidence apart from the SDK's default zeros", async function () {
    await putPiCredential({
      id: "fixture-key",
      label: "Fixture",
      material: { kind: "api-key", secret: "fixture-secret" },
    });
    const run = async (body: string) => {
      const prepared = createPiProviderSource(
        { ...selection, metadata: { cost: RATES } },
        {
          fetch: async () =>
            new Response(body, {
              headers: { "content-type": "text/event-stream" },
            }),
        },
      );
      const result = await (
        await prepared.source({
          sessionId: "evidence",
          turnId: "turn",
          invocationId: "evidence:0",
          model: prepared.model,
          signal: new AbortController().signal,
          context: normalizeContext({
            systemPrompt: "",
            messages: [{ role: "user", content: "hi", timestamp: 0 }],
          }),
        })
      ).result();
      return { result, usageKnown: prepared.usageKnown(result) };
    };
    // A completed response that reported usage is real evidence.
    const reported = await run(USAGE_SSE);
    assert.equal(reported.result.stopReason, "stop");
    assert.isTrue(reported.usageKnown);
    // A completed response without any usage field is indistinguishable from
    // the SDK's zero default, so it stays unknown instead of a recorded zero.
    const silent = await run(COMPLETIONS_SSE);
    assert.equal(silent.result.stopReason, "stop");
    assert.equal(silent.result.usage.input, 0);
    assert.isFalse(silent.usageKnown);
  });
});

import { assert } from "chai";
import { getPref, setPref } from "../../src/utils/prefs";
import { putPiCredential } from "../../src/modules/piCredentialStore";
import {
  createPiProviderModelSource,
  createPiProviderSource,
} from "../../src/modules/piProviderExecution";
import {
  preparePiChatGPTPayload,
  projectPiChatGPTToolWire,
} from "../../src/modules/piChatGPTProvider";
import { normalizeContext, Type } from "@earendil-works/pi-ai";
import { PiRuntime } from "../../src/modules/piRuntime";
import type { PiModelSelectionSnapshot } from "../../src/shared/piProviderContract";
import {
  readPiCanonicalSelection,
  readPiUsageMeasurement,
} from "../../src/shared/piUsageContract";
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

  async function observeRuntimeEvents(
    events: AsyncIterable<import("../../src/modules/piRuntime").PiRuntimeEvent>,
  ) {
    const observed: import("../../src/modules/piRuntime").PiRuntimeEvent[] = [];
    for await (const event of events) observed.push(event);
    return observed;
  }

  it("projects tool schemas into the shared ChatGPT namespace without changing Gateway names", function () {
    const tools = [
      {
        name: "zotero_search",
        description: "Search Zotero",
        parameters: {
          type: "object",
          properties: { query: { type: "string" } },
        },
      },
    ];
    assert.deepEqual(tools[0], {
      name: "zotero_search",
      description: "Search Zotero",
      parameters: { type: "object", properties: { query: { type: "string" } } },
    });
    const wire = projectPiChatGPTToolWire(tools);
    assert.lengthOf(wire.tools, 1);
    assert.equal(wire.tools[0]?.type, "namespace");
    if (wire.tools[0]?.type === "namespace") {
      assert.deepEqual(wire.tools[0].tools, [
        { ...tools[0], type: "function" },
      ]);
      assert.equal(wire.tools[0].name, "zotero_agents");
      assert.equal(wire.tools[0].tools[0]?.name, "zotero_search");
      assert.isString(wire.tools[0].description);
    }
    const collision = projectPiChatGPTToolWire(
      [{ name: "active/tool" }],
      false,
      ["zotero_tool_1"],
    );
    assert.equal(
      collision.wireNameByGatewayName.get("active/tool"),
      "zotero_tool_1",
    );
    assert.equal(
      collision.wireNameByGatewayName.get("zotero_tool_1"),
      "zotero_tool_2_1",
    );
    assert.equal(
      collision.gatewayNameByWireName.get("zotero_tool_1"),
      "active/tool",
    );
    assert.isUndefined(collision.gatewayNameByWireName.get("zotero_tool_2_1"));
  });

  it("reads ChatGPT and legacy Codex auth variants from historical canonical usage", function () {
    for (const authVariant of ["chatgpt", "openai-codex"] as const) {
      const historical = readPiCanonicalSelection({
        configurationId: "historic-config",
        provider: "openai",
        modelId: "historic-model",
        api: "openai-responses",
        reasoning: "off",
        authVariant,
        catalogRevision: "historic-catalog",
        adapterVersion: "0.84.4",
        runtimeVersion: "0.84.4",
        policy: {
          contextWindow: 8192,
          maxTokens: 1024,
          input: ["text"],
          supportsTools: true,
        },
        metadata: {
          authVariants: [authVariant],
        },
      });
      assert.isNotNull(historical);
      assert.equal(historical?.authVariant, authVariant);
      assert.deepEqual(historical?.metadata?.authVariants, [authVariant]);
    }
  });

  it("enforces the SIWC Responses payload contract at the final SDK boundary", function () {
    const { payload } = preparePiChatGPTPayload({
      model: "fixture-model",
      stream: false,
      store: true,
      previous_response_id: "old-response",
      input: [
        { role: "developer", content: "Prepared instructions" },
        { role: "user", content: [{ type: "input_text", text: "Question" }] },
      ],
      tools: [
        {
          type: "function",
          name: "zotero_search",
          parameters: { type: "object" },
        },
      ],
      background: true,
      max_output_tokens: 16,
      temperature: 0.2,
      top_p: 0.5,
    }) as Record<string, unknown>;
    assert.equal(payload.stream, true);
    assert.equal(payload.store, false);
    assert.equal(payload.instructions, "Prepared instructions");
    assert.deepEqual(payload.input, [
      { role: "user", content: [{ type: "input_text", text: "Question" }] },
    ]);
    assert.deepEqual(
      payload.tools,
      projectPiChatGPTToolWire([
        { name: "zotero_search", parameters: { type: "object" } },
      ]).tools,
    );
    for (const forbidden of [
      "previous_response_id",
      "background",
      "max_output_tokens",
      "temperature",
      "top_p",
    ])
      assert.notProperty(payload, forbidden);
    let rejected: unknown;
    try {
      preparePiChatGPTPayload({ model: "fixture-model", temperature: 0.2 }, [
        "temperature",
      ]);
    } catch (error) {
      rejected = error;
    }
    assert.instanceOf(rejected, Error);
    assert.equal((rejected as Error).message, "unsupported_model");
    assert.equal(
      (rejected as { unsupportedParameter?: string }).unsupportedParameter,
      "temperature",
    );
    const retiredHistory = preparePiChatGPTPayload({
      model: "fixture-model",
      input: [
        {
          type: "function_call",
          call_id: "call_retired",
          name: "retired_mcp.lookup",
          arguments: "{}",
        },
        {
          type: "function_call_output",
          call_id: "call_retired",
          output: "settled result",
        },
      ],
      tools: [],
    });
    assert.deepEqual(retiredHistory.payload.tools, []);
    assert.deepEqual(retiredHistory.payload.input, [
      {
        type: "function_call",
        call_id: "call_retired",
        name: "zotero_tool_1",
        arguments: "{}",
        namespace: "zotero_agents",
      },
      {
        type: "function_call_output",
        call_id: "call_retired",
        output: "settled result",
      },
    ]);
    assert.isEmpty(retiredHistory.gatewayNameByWireName);
  });

  for (const scenario of [
    {
      label: "repeated output",
      repeatOutput: true,
      indexes: [0],
      pending: false,
      expected: "stop",
    },
    {
      label: "stream-only output",
      repeatOutput: false,
      indexes: [0],
      pending: false,
      expected: "stop",
    },
    {
      label: "missing output index",
      repeatOutput: false,
      indexes: [1],
      pending: false,
      expected: "error",
    },
    {
      label: "duplicate completed item",
      repeatOutput: false,
      indexes: [0, 0],
      pending: false,
      expected: "error",
    },
    {
      label: "unfinished output item",
      repeatOutput: false,
      indexes: [0],
      pending: true,
      expected: "error",
    },
  ]) {
    it(`validates SIWC ${scenario.label} behind the injected auth gate`, async function () {
      await putPiCredential({
        id: "fixture-chatgpt",
        label: "Fixture ChatGPT",
        material: {
          kind: "chatgpt",
          access: "expired-access",
          refresh: "refresh-material",
          idToken: "verified-id-token",
          expiresAt: Date.now() + 60_000,
          issuer: "https://auth.openai.com",
          subject: "fixture-subject",
          clientId: "fixture-client",
          scope: ["chatgpt.tokens.use.direct"],
        },
      });
      let gateCalls = 0;
      let completion: unknown;
      const requests: Request[] = [];
      const completedItem = {
        id: "msg_1",
        type: "message",
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text: "hello", annotations: [] }],
      };
      const responseSse = [
        'event: response.created\ndata: {"type":"response.created","response":{"id":"resp_fixture","status":"in_progress"}}\n\n',
        'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"hello"}\n\n',
        ...scenario.indexes.map(
          (output_index) =>
            `event: response.output_item.done\ndata: ${JSON.stringify({ type: "response.output_item.done", output_index, item: completedItem })}\n\n`,
        ),
        ...(scenario.pending
          ? [
              `event: response.output_item.added\ndata: ${JSON.stringify({ type: "response.output_item.added", output_index: 1, item: { id: "msg_pending", type: "message", role: "assistant", status: "in_progress", content: [] } })}\n\n`,
            ]
          : []),
        `event: response.completed\ndata: ${JSON.stringify({ type: "response.completed", response: { id: "resp_fixture", status: "completed", output: scenario.repeatOutput ? [completedItem] : [], usage: { input_tokens: 12, output_tokens: 3, total_tokens: 15 } } })}\n\n`,
      ].join("");
      const source = createPiProviderSource(
        {
          ...selection,
          provider: "openai",
          modelId: "gpt-5-fixture",
          authVariant: "chatgpt",
          credentialRef: "fixture-chatgpt",
          api: "openai-responses",
          baseUrl: "https://api.openai.com/v1",
          reasoning: "medium",
          metadata: { thinkingLevelMap: { medium: "high" } },
          policy: { ...selection.policy, maxTokens: 0, input: ["text"] },
        },
        {
          chatGPTAuth: {
            resolvePiChatGPTAccess: async () => "rotated-access-token",
            assertPiChatGPTInferenceAllowed: async () => {
              gateCalls++;
            },
            pausePiChatGPTInference: async () => undefined,
          },
          fetch: async (input, init) => {
            requests.push(new Request(input, init));
            return new Response(responseSse, {
              headers: { "content-type": "text/event-stream" },
            });
          },
          onChatGPTCompletedResponse: (value) => {
            completion = value;
          },
        },
      );
      const stream = await source.source({
        sessionId: "siwc-session",
        turnId: "siwc-turn",
        invocationId: "siwc-turn:invocation:0",
        model: source.model,
        context: normalizeContext({
          systemPrompt: "Follow prepared instructions",
          messages: [{ role: "user", content: "Question", timestamp: 0 }],
        }),
        signal: new AbortController().signal,
      });
      const result = await stream.result();
      assert.equal(result.stopReason, scenario.expected);
      if (scenario.expected === "error") {
        assert.equal(result.errorMessage, "provider_response_failed");
        assert.isUndefined(completion);
        return;
      }
      assert.equal(source.usageCompleteness(result), "complete");
      assert.isNull(source.pricing);
      assert.equal(gateCalls, 1);
      assert.lengthOf(requests, 1);
      assert.equal(requests[0].url, "https://api.openai.com/v1/responses");
      assert.equal(
        requests[0].headers.get("authorization"),
        "Bearer rotated-access-token",
      );
      const body = await requests[0].clone().json();
      assert.equal(body.stream, true);
      assert.equal(body.store, false);
      assert.deepEqual(body.reasoning, { effort: "high", summary: "auto" });
      assert.equal(body.instructions, "Follow prepared instructions");
      assert.isUndefined(body.previous_response_id);
      assert.deepEqual((completion as { usage: unknown }).usage, {
        inputTokens: 12,
        outputTokens: 3,
        totalTokens: 15,
      });
      assert.deepInclude((completion as { output: unknown[] }).output[0], {
        id: "msg_1",
        type: "message",
        status: "completed",
      });
    });
  }

  it("retains field-level usage presence when a completed response omits token counts", async function () {
    assert.deepEqual(readPiUsageMeasurement({ inputTokens: 5 }), {
      inputTokens: 5,
    });
    assert.isUndefined(readPiUsageMeasurement({ inputTokens: -1 }));
    await putPiCredential({
      id: "fixture-chatgpt-partial-usage",
      label: "Fixture ChatGPT",
      material: {
        kind: "chatgpt",
        access: "access",
        refresh: "refresh",
        idToken: "id-token",
        expiresAt: Date.now() + 60_000,
        issuer: "https://auth.openai.com",
        subject: "fixture-subject",
        clientId: "fixture-client",
        scope: ["chatgpt.tokens.use.direct"],
      },
    });
    const source = createPiProviderSource(
      {
        ...selection,
        provider: "openai",
        authVariant: "chatgpt",
        credentialRef: "fixture-chatgpt-partial-usage",
        api: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
      },
      {
        chatGPTAuth: {
          resolvePiChatGPTAccess: async () => "access-token",
          assertPiChatGPTInferenceAllowed: async () => undefined,
          pausePiChatGPTInference: async () => undefined,
        },
        fetch: async () =>
          new Response(
            'event: response.output_item.added\ndata: {"type":"response.output_item.added","output_index":0,"item":{"id":"msg_usage","type":"message","role":"assistant","status":"in_progress","content":[]}}\n\n' +
              'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"measured"}\n\n' +
              'event: response.output_item.done\ndata: {"type":"response.output_item.done","output_index":0,"item":{"id":"msg_usage","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"measured","annotations":[]}]}}\n\n' +
              'event: response.completed\ndata: {"type":"response.completed","response":{"id":"resp_usage","status":"completed","output":[{"id":"msg_usage","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"measured","annotations":[]}]}],"usage":{"input_tokens":5}}}\n\n',
            { headers: { "content-type": "text/event-stream" } },
          ),
      },
    );
    const runtime = new PiRuntime().openSession({
      sessionId: "partial-usage",
      model: source.model,
      source: source.source,
      pricing: source.pricing,
    });
    const turn = runtime.runTurn({
      turnId: "partial-usage",
      messages: [{ role: "user", text: "question" }],
    });
    const [events, turnResult] = await Promise.all([
      observeRuntimeEvents(turn.events),
      turn.result,
    ]);
    assert.equal(turnResult.status, "completed");
    const assistant = events.find(
      (event) => event.kind === "assistant_message",
    );
    assert.equal(assistant?.kind, "assistant_message");
    if (assistant?.kind !== "assistant_message")
      assert.fail(
        `expected canonical usage; got ${events.map((event) => event.kind).join(",")}`,
      );
    assert.deepEqual(assistant.usage.measurement, { inputTokens: 5 });
    assert.equal(assistant.usage.completeness, "partial");
    assert.equal(assistant.usage.input, 5);
    assert.equal(assistant.usage.output, 0);
    assert.equal(assistant.usage.totalTokens, 0);
    runtime.dispose();
  });

  it("preserves explicit API-key Responses limits, cache retention and temperature", async function () {
    await putPiCredential({
      id: "fixture-key",
      label: "Fixture",
      material: { kind: "api-key", secret: "fixture-api-key" },
    });
    let body: Record<string, unknown> | undefined;
    const complete =
      'event: response.output_item.added\ndata: {"type":"response.output_item.added","output_index":0,"item":{"id":"msg_1","type":"message","role":"assistant","status":"in_progress","content":[]}}\n\n' +
      'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"ok"}\n\n' +
      'event: response.output_item.done\ndata: {"type":"response.output_item.done","output_index":0,"item":{"id":"msg_1","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"ok","annotations":[]}]}}\n\n' +
      'event: response.completed\ndata: {"type":"response.completed","response":{"id":"resp_key","status":"completed","output":[{"id":"msg_1","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"ok","annotations":[]}]}],"usage":{"input_tokens":4,"output_tokens":1,"total_tokens":5}}}\n\n';
    const source = createPiProviderSource(
      {
        ...selection,
        provider: "openai",
        modelId: "gpt-key-model",
        credentialRef: "fixture-key",
        api: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
        metadata: {
          promptCache: { long: 3600 },
          samplingParams: { temperature: 0.25 },
          compat: {
            supportsLongCacheRetention: true,
            supportsMaxOutputTokens: true,
          },
        },
      },
      {
        fetch: async (input, init) => {
          body = (await new Request(input, init).json()) as Record<
            string,
            unknown
          >;
          return new Response(complete, {
            headers: { "content-type": "text/event-stream" },
          });
        },
      },
    );
    const stream = await source.source({
      sessionId: "api-key-responses",
      turnId: "api-key-responses",
      invocationId: "api-key-responses:0",
      model: source.model,
      context: normalizeContext({
        messages: [{ role: "user", content: "question", timestamp: 0 }],
      }),
      signal: new AbortController().signal,
    });
    const result = await stream.result();
    assert.equal(result.stopReason, "stop", result.errorMessage);
    assert.equal(body?.max_output_tokens, selection.policy.maxTokens);
    assert.equal(body?.prompt_cache_retention, "24h");
    assert.equal(body?.temperature, 0.25);
  });

  it("keeps the same context-bounded API-key output limit for either key shape", async function () {
    const limits: number[] = [];
    for (const secret of ["sk-fixture-key", "opaque-fixture-key"]) {
      await putPiCredential({
        id: "fixture-key",
        label: "Fixture",
        material: { kind: "api-key", secret },
      });
      const prepared = createPiProviderSource(
        {
          ...selection,
          provider: "openai",
          modelId: "gpt-key-model",
          api: "openai-responses",
          baseUrl: "https://api.openai.com/v1",
          policy: {
            ...selection.policy,
            maxTokens: selection.policy.contextWindow,
          },
          metadata: { compat: { supportsMaxOutputTokens: true } },
        },
        {
          fetch: async (input, init) => {
            const body = await new Request(input, init).json();
            limits.push(body.max_output_tokens);
            return new Response(
              'data: {"type":"response.completed","response":{"id":"resp_key_budget","status":"completed","output":[],"usage":{"input_tokens":1500,"output_tokens":0,"total_tokens":1500}}}\n\n',
              { headers: { "content-type": "text/event-stream" } },
            );
          },
        },
      );
      const stream = await prepared.source({
        sessionId: "api-key-budget",
        turnId: "api-key-budget",
        invocationId: "api-key-budget:0",
        model: prepared.model,
        context: normalizeContext({
          messages: [{ role: "user", content: "x".repeat(6000), timestamp: 0 }],
        }),
        signal: new AbortController().signal,
      });
      assert.equal((await stream.result()).stopReason, "stop");
    }
    assert.isAbove(limits[0], 0);
    assert.isBelow(limits[0], selection.policy.contextWindow);
    assert.equal(limits[1], limits[0]);
  });

  it("consumes a resume permit only at dispatch and never retries its probe", async function () {
    await putPiCredential({
      id: "fixture-chatgpt-probe",
      label: "Fixture ChatGPT",
      material: {
        kind: "chatgpt",
        access: "access",
        refresh: "refresh",
        idToken: "id-token",
        expiresAt: Date.now() + 60_000,
        issuer: "https://auth.openai.com",
        subject: "fixture-subject",
        clientId: "fixture-client",
        scope: ["chatgpt.tokens.use.direct"],
      },
    });
    const permit = Object.freeze({ opaque: true });
    const observedPermits: unknown[] = [];
    let requests = 0;
    const source = createPiProviderSource(
      {
        ...selection,
        provider: "openai",
        authVariant: "chatgpt",
        credentialRef: "fixture-chatgpt-probe",
        api: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
      },
      {
        chatGPTResumePermit: permit,
        chatGPTAuth: {
          resolvePiChatGPTAccess: async () => "access-token",
          assertPiChatGPTInferenceAllowed: async (_id, _signal, actual) => {
            observedPermits.push(actual);
          },
          pausePiChatGPTInference: async () => undefined,
        },
        fetch: async () => {
          requests++;
          return new Response("temporary service failure", { status: 503 });
        },
      },
    );
    const stream = await source.source({
      sessionId: "probe-session",
      turnId: "probe-turn",
      invocationId: "probe-turn:invocation:0",
      model: source.model,
      context: normalizeContext({
        messages: [{ role: "user", content: "probe", timestamp: 0 }],
      }),
      signal: new AbortController().signal,
    });
    assert.equal((await stream.result()).stopReason, "error");
    assert.equal(requests, 1);
    assert.deepEqual(observedPermits, [permit]);
  });

  it("records each eligible HTTP 503 retry as a distinct canonical invocation", async function () {
    await putPiCredential({
      id: "fixture-chatgpt-retry",
      label: "Fixture ChatGPT",
      material: {
        kind: "chatgpt",
        access: "access",
        refresh: "refresh",
        idToken: "id-token",
        expiresAt: Date.now() + 60_000,
        issuer: "https://auth.openai.com",
        subject: "fixture-subject",
        clientId: "fixture-client",
        scope: ["chatgpt.tokens.use.direct"],
      },
    });
    let dispatches = 0;
    const events: import("../../src/modules/piRuntime").PiRuntimeEvent[] = [];
    const provider = createPiProviderSource(
      {
        ...selection,
        provider: "openai",
        authVariant: "chatgpt",
        credentialRef: "fixture-chatgpt-retry",
        api: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
      },
      {
        chatGPTAuth: {
          resolvePiChatGPTAccess: async () => "access-token",
          assertPiChatGPTInferenceAllowed: async () => undefined,
          pausePiChatGPTInference: async () => undefined,
        },
        chatGPTRetryDelay: async () => undefined,
        fetch: async () => {
          dispatches++;
          if (dispatches === 1)
            return new Response("ignored", {
              status: 503,
              headers: { "x-request-id": "req_retry_1" },
            });
          return new Response(
            'event: response.output_item.added\ndata: {"type":"response.output_item.added","output_index":0,"item":{"id":"msg_retry","type":"message","role":"assistant","status":"in_progress","content":[]}}\n\n' +
              'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"done"}\n\n' +
              'event: response.output_item.done\ndata: {"type":"response.output_item.done","output_index":0,"item":{"id":"msg_retry","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"done","annotations":[]}]}}\n\n' +
              'event: response.completed\ndata: {"type":"response.completed","response":{"id":"resp_retry","status":"completed","output":[{"id":"msg_retry","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"done","annotations":[]}]}],"usage":{"input_tokens":2,"output_tokens":1,"total_tokens":3}}}\n\n',
            { headers: { "content-type": "text/event-stream" } },
          );
        },
      },
    );
    const runtime = new PiRuntime().openSession({
      sessionId: "retry-canonical",
      model: provider.model,
      source: provider.source,
      pricing: provider.pricing,
    });
    const turn = runtime.runTurn({
      turnId: "retry-turn",
      messages: [{ role: "user", text: "question" }],
      onEvent: (event) => events.push(event),
    });
    const result = await turn.result;
    assert.equal(result.status, "completed");
    assert.equal(dispatches, 2);
    const starts = events.filter(
      (event) => event.kind === "invocation_started",
    );
    const terminals = events.filter(
      (event) => event.kind === "invocation_terminal",
    );
    assert.deepEqual(
      starts.map((event) => event.invocationId),
      ["retry-turn:invocation:0", "retry-turn:invocation:1"],
    );
    assert.deepEqual(
      terminals.map((event) => event.invocationId),
      ["retry-turn:invocation:0", "retry-turn:invocation:1"],
    );
    assert.deepEqual(
      terminals[0]?.kind === "invocation_terminal"
        ? terminals[0].providerTerminal
        : undefined,
      {
        status: "failed",
        code: "provider_response_failed",
        httpStatus: 503,
        requestId: "req_retry_1",
      },
    );
    runtime.dispose();
  });

  it("keeps incomplete and unterminated SIWC streams failed with partial text", async function () {
    await putPiCredential({
      id: "fixture-chatgpt-terminal",
      label: "Fixture ChatGPT",
      material: {
        kind: "chatgpt",
        access: "access",
        refresh: "refresh",
        idToken: "id-token",
        expiresAt: Date.now() + 60_000,
        issuer: "https://auth.openai.com",
        subject: "fixture-subject",
        clientId: "fixture-client",
        scope: ["chatgpt.tokens.use.direct"],
      },
    });
    const cases = [
      {
        name: "incomplete",
        expected: "provider_response_incomplete",
        terminal:
          'event: response.incomplete\ndata: {"type":"response.incomplete","response":{"id":"resp_partial","status":"incomplete","incomplete_details":{"reason":"max_output_tokens"},"usage":{"input_tokens":8,"output_tokens":2,"total_tokens":10}}}\n\n',
      },
      {
        name: "missing terminal",
        expected: "provider_terminal_missing",
        terminal: "",
      },
    ];
    for (const item of cases) {
      let completed = false;
      const source = createPiProviderSource(
        {
          ...selection,
          provider: "openai",
          authVariant: "chatgpt",
          credentialRef: "fixture-chatgpt-terminal",
          api: "openai-responses",
          baseUrl: "https://api.openai.com/v1",
        },
        {
          chatGPTAuth: {
            resolvePiChatGPTAccess: async () => "access-token",
            assertPiChatGPTInferenceAllowed: async () => undefined,
            pausePiChatGPTInference: async () => undefined,
          },
          fetch: async () =>
            new Response(
              'event: response.output_item.added\ndata: {"type":"response.output_item.added","output_index":0,"item":{"id":"msg_partial","type":"message","role":"assistant","status":"in_progress","content":[]}}\n\n' +
                'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"partial"}\n\n' +
                'event: response.output_item.done\ndata: {"type":"response.output_item.done","output_index":0,"item":{"id":"msg_partial","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"partial","annotations":[]}]}}\n\n' +
                item.terminal,
              { headers: { "content-type": "text/event-stream" } },
            ),
          onChatGPTCompletedResponse: () => {
            completed = true;
          },
        },
      );
      const stream = await source.source({
        sessionId: `terminal-${item.name}`,
        turnId: `terminal-${item.name}`,
        invocationId: `terminal-${item.name}:invocation:0`,
        model: source.model,
        context: normalizeContext({
          messages: [{ role: "user", content: "question", timestamp: 0 }],
        }),
        signal: new AbortController().signal,
      });
      const result = await stream.result();
      assert.equal(result.stopReason, "error");
      assert.equal(result.errorMessage, item.expected);
      assert.include(
        result.content
          .filter((part) => part.type === "text")
          .map((part) => (part.type === "text" ? part.text : ""))
          .join(""),
        "partial",
      );
      assert.isFalse(completed);
    }
  });

  it("rejects completed events whose raw response is absent, malformed or has an unknown status", async function () {
    await putPiCredential({
      id: "fixture-chatgpt-integrity",
      label: "Fixture ChatGPT",
      material: {
        kind: "chatgpt",
        access: "access",
        refresh: "refresh",
        idToken: "id-token",
        expiresAt: Date.now() + 60_000,
        issuer: "https://auth.openai.com",
        subject: "fixture-subject",
        clientId: "fixture-client",
        scope: ["chatgpt.tokens.use.direct"],
      },
    });
    const invalidResponses = [
      { id: "resp_missing_output", status: "completed" },
      { id: "resp_empty_without_done_item", status: "completed", output: [] },
      {
        id: "resp_malformed_output",
        status: "completed",
        output: [{ type: "message", role: "assistant", content: [] }],
      },
      { id: "resp_unknown_status", status: "in_progress", output: [] },
      {
        id: "resp_unknown_output_type",
        status: "completed",
        output: [{ id: "unknown", type: "future_output" }],
      },
    ];
    for (const response of invalidResponses) {
      let completionDelivered = false;
      const source = createPiProviderSource(
        {
          ...selection,
          provider: "openai",
          authVariant: "chatgpt",
          credentialRef: "fixture-chatgpt-integrity",
          api: "openai-responses",
          baseUrl: "https://api.openai.com/v1",
        },
        {
          chatGPTAuth: {
            resolvePiChatGPTAccess: async () => "access-token",
            assertPiChatGPTInferenceAllowed: async () => undefined,
            pausePiChatGPTInference: async () => undefined,
          },
          fetch: async () =>
            new Response(
              'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"SDK text must not rescue this response"}\n\n' +
                `event: response.completed\ndata: ${JSON.stringify({ type: "response.completed", response })}\n\n`,
              { headers: { "content-type": "text/event-stream" } },
            ),
          onChatGPTCompletedResponse: () => {
            completionDelivered = true;
          },
        },
      );
      const stream = await source.source({
        sessionId: `integrity-${response.id}`,
        turnId: `integrity-${response.id}`,
        invocationId: `integrity-${response.id}:invocation:0`,
        model: source.model,
        context: normalizeContext({
          messages: [{ role: "user", content: "question", timestamp: 0 }],
        }),
        signal: new AbortController().signal,
      });
      const result = await stream.result();
      assert.equal(result.stopReason, "error", response.id);
      assert.equal(
        result.errorMessage,
        "provider_response_failed",
        response.id,
      );
      assert.isFalse(completionDelivered, response.id);
    }
  });

  it("requires completed function calls to match the frozen namespace, wire name and SDK arguments", async function () {
    await putPiCredential({
      id: "fixture-chatgpt-tools",
      label: "Fixture ChatGPT",
      material: {
        kind: "chatgpt",
        access: "access",
        refresh: "refresh",
        idToken: "id-token",
        expiresAt: Date.now() + 60_000,
        issuer: "https://auth.openai.com",
        subject: "fixture-subject",
        clientId: "fixture-client",
        scope: ["chatgpt.tokens.use.direct"],
      },
    });
    const tool = {
      name: "read",
      description: "Read a document",
      parameters: Type.Object({ value: Type.String() }),
    };
    const cases = [
      {
        label: "valid",
        namespace: "zotero_agents",
        name: "read",
        finalArgs: '{"value":"sdk"}',
        expected: "toolUse",
      },
      {
        label: "valid stream-only",
        namespace: "zotero_agents",
        name: "read",
        finalArgs: '{"value":"sdk"}',
        expected: "toolUse",
      },
      {
        label: "wrong namespace",
        namespace: "other",
        name: "read",
        finalArgs: '{"value":"sdk"}',
        expected: "error",
      },
      {
        label: "unmapped name",
        namespace: "zotero_agents",
        name: "unmapped",
        finalArgs: '{"value":"sdk"}',
        expected: "error",
      },
      {
        label: "arguments disagree",
        namespace: "zotero_agents",
        name: "read",
        finalArgs: '{"value":"response"}',
        expected: "error",
      },
    ] as const;
    for (const item of cases) {
      const sdkArgs = '{"value":"sdk"}';
      const response = {
        id: `resp_${item.label.replaceAll(" ", "_")}`,
        status: "completed",
        output:
          item.label === "valid stream-only"
            ? []
            : [
                {
                  id: "fc_1",
                  call_id: "call_1",
                  type: "function_call",
                  status: "completed",
                  namespace: item.namespace,
                  name: item.name,
                  arguments: item.finalArgs,
                },
              ],
      };
      const events = [
        `event: response.output_item.added\ndata: ${JSON.stringify({ type: "response.output_item.added", output_index: 0, item: { id: "fc_1", call_id: "call_1", type: "function_call", status: "in_progress", namespace: "zotero_agents", name: "read", arguments: "" } })}\n\n`,
        `event: response.function_call_arguments.delta\ndata: ${JSON.stringify({ type: "response.function_call_arguments.delta", output_index: 0, delta: sdkArgs })}\n\n`,
        `event: response.output_item.done\ndata: ${JSON.stringify({ type: "response.output_item.done", output_index: 0, item: { id: "fc_1", call_id: "call_1", type: "function_call", status: "completed", namespace: "zotero_agents", name: "read", arguments: sdkArgs } })}\n\n`,
        `event: response.completed\ndata: ${JSON.stringify({ type: "response.completed", response })}\n\n`,
      ].join("");
      const source = createPiProviderSource(
        {
          ...selection,
          provider: "openai",
          authVariant: "chatgpt",
          credentialRef: "fixture-chatgpt-tools",
          api: "openai-responses",
          baseUrl: "https://api.openai.com/v1",
        },
        {
          chatGPTAuth: {
            resolvePiChatGPTAccess: async () => "access-token",
            assertPiChatGPTInferenceAllowed: async () => undefined,
            pausePiChatGPTInference: async () => undefined,
          },
          fetch: async () =>
            new Response(events, {
              headers: { "content-type": "text/event-stream" },
            }),
        },
      );
      const stream = await source.source({
        sessionId: `tool-integrity-${item.label}`,
        turnId: `tool-integrity-${item.label}`,
        invocationId: `tool-integrity-${item.label}:invocation:0`,
        model: source.model,
        context: normalizeContext({
          messages: [{ role: "user", content: "question", timestamp: 0 }],
          tools: [tool],
        }),
        signal: new AbortController().signal,
      });
      const result = await stream.result();
      assert.equal(result.stopReason, item.expected, item.label);
      if (item.expected === "toolUse") {
        const call = result.content.find((part) => part.type === "toolCall");
        assert.equal(call?.type === "toolCall" ? call.name : undefined, "read");
        assert.equal(
          call?.type === "toolCall" ? call.namespace : undefined,
          undefined,
        );
      }
    }
  });

  it("rejects a completed mixed tool batch before any valid call can produce an effect", async function () {
    await putPiCredential({
      id: "fixture-chatgpt-mixed-tools",
      label: "Fixture ChatGPT",
      material: {
        kind: "chatgpt",
        access: "access",
        refresh: "refresh",
        idToken: "id-token",
        expiresAt: Date.now() + 60_000,
        issuer: "https://auth.openai.com",
        subject: "fixture-subject",
        clientId: "fixture-client",
        scope: ["chatgpt.tokens.use.direct"],
      },
    });
    const calls = [
      {
        id: "fc_invalid",
        call_id: "call_invalid",
        name: "invalid",
        arguments: "{}",
      },
      {
        id: "fc_effect",
        call_id: "call_effect",
        name: "side_effect",
        arguments: '{"value":"safe"}',
      },
    ];
    const stream = [
      ...calls.flatMap((call, output_index) => [
        `event: response.output_item.added\ndata: ${JSON.stringify({ type: "response.output_item.added", output_index, item: { ...call, type: "function_call", status: "in_progress", namespace: "zotero_agents" } })}\n\n`,
        `event: response.function_call_arguments.delta\ndata: ${JSON.stringify({ type: "response.function_call_arguments.delta", output_index, delta: call.arguments })}\n\n`,
        `event: response.output_item.done\ndata: ${JSON.stringify({ type: "response.output_item.done", output_index, item: { ...call, type: "function_call", status: "completed", namespace: "zotero_agents" } })}\n\n`,
      ]),
      `event: response.completed\ndata: ${JSON.stringify({ type: "response.completed", response: { id: "resp_mixed_tools", status: "completed", output: calls.map((call) => ({ ...call, type: "function_call", status: "completed", namespace: "zotero_agents" })) } })}\n\n`,
    ].join("");
    let effects = 0;
    const source = createPiProviderSource(
      {
        ...selection,
        provider: "openai",
        authVariant: "chatgpt",
        credentialRef: "fixture-chatgpt-mixed-tools",
        api: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
      },
      {
        chatGPTAuth: {
          resolvePiChatGPTAccess: async () => "access-token",
          assertPiChatGPTInferenceAllowed: async () => undefined,
          pausePiChatGPTInference: async () => undefined,
        },
        fetch: async () =>
          new Response(stream, {
            headers: { "content-type": "text/event-stream" },
          }),
      },
    );
    const session = new PiRuntime().openSession({
      sessionId: "mixed-tool-batch",
      model: source.model,
      source: source.source,
      pricing: source.pricing,
    });
    const result = await session.runTurn({
      turnId: "mixed-tool-batch",
      messages: [{ role: "user", text: "invoke tools" }],
      tools: [
        {
          name: "invalid",
          description: "Requires a value",
          schema: Type.Object({ value: Type.String() }),
          execute: async () => ({ text: "unexpected" }),
        },
        {
          name: "side_effect",
          description: "Produces an effect",
          schema: Type.Object({ value: Type.String() }),
          execute: async () => {
            effects++;
            return { text: "effect" };
          },
        },
      ],
    }).result;
    assert.equal(result.status, "failed");
    assert.equal(effects, 0);
    session.dispose();
  });

  it("projects a completed SIWC tool call and its result into the next full-context request", async function () {
    await putPiCredential({
      id: "fixture-chatgpt-tool-continuation",
      label: "Fixture ChatGPT",
      material: {
        kind: "chatgpt",
        access: "access",
        refresh: "refresh",
        idToken: "id-token",
        expiresAt: Date.now() + 60_000,
        issuer: "https://auth.openai.com",
        subject: "fixture-subject",
        clientId: "fixture-client",
        scope: ["chatgpt.tokens.use.direct"],
      },
    });
    const tool = {
      name: "old_mcp.read",
      description: "Read a document",
      parameters: Type.Object({ value: Type.String() }),
    };
    const firstResponse = [
      `event: response.output_item.added\ndata: ${JSON.stringify({ type: "response.output_item.added", output_index: 0, item: { id: "fc_read", call_id: "call_read", type: "function_call", status: "in_progress", namespace: "zotero_agents", name: "zotero_tool_1", arguments: "" } })}\n\n`,
      `event: response.function_call_arguments.delta\ndata: ${JSON.stringify({ type: "response.function_call_arguments.delta", output_index: 0, delta: '{"value":"paper"}' })}\n\n`,
      `event: response.output_item.done\ndata: ${JSON.stringify({ type: "response.output_item.done", output_index: 0, item: { id: "fc_read", call_id: "call_read", type: "function_call", status: "completed", namespace: "zotero_agents", name: "zotero_tool_1", arguments: '{"value":"paper"}' } })}\n\n`,
      `event: response.completed\ndata: ${JSON.stringify({ type: "response.completed", response: { id: "resp_read", status: "completed", output: [{ id: "fc_read", call_id: "call_read", type: "function_call", status: "completed", namespace: "zotero_agents", name: "zotero_tool_1", arguments: '{"value":"paper"}' }] } })}\n\n`,
    ].join("");
    const secondResponse = [
      'event: response.output_item.added\ndata: {"type":"response.output_item.added","output_index":0,"item":{"id":"msg_final","type":"message","role":"assistant","status":"in_progress","content":[]}}\n\n',
      'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"Found it"}\n\n',
      'event: response.output_item.done\ndata: {"type":"response.output_item.done","output_index":0,"item":{"id":"msg_final","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"Found it","annotations":[]}]}}\n\n',
      'event: response.completed\ndata: {"type":"response.completed","response":{"id":"resp_final","status":"completed","output":[{"id":"msg_final","type":"message","role":"assistant","status":"completed","content":[{"type":"output_text","text":"Found it","annotations":[]}]}]}}\n\n',
    ].join("");
    const requests: Request[] = [];
    const source = createPiProviderSource(
      {
        ...selection,
        provider: "openai",
        authVariant: "chatgpt",
        credentialRef: "fixture-chatgpt-tool-continuation",
        api: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
      },
      {
        chatGPTAuth: {
          resolvePiChatGPTAccess: async () => "access-token",
          assertPiChatGPTInferenceAllowed: async () => undefined,
          pausePiChatGPTInference: async () => undefined,
        },
        fetch: async (input, init) => {
          requests.push(new Request(input, init));
          return new Response(
            requests.length === 1 ? firstResponse : secondResponse,
            {
              headers: { "content-type": "text/event-stream" },
            },
          );
        },
      },
    );
    const signal = new AbortController().signal;
    const first = await source.source({
      sessionId: "tool-continuation",
      turnId: "tool-continuation",
      invocationId: "tool-continuation:invocation:0",
      model: source.model,
      context: normalizeContext({
        messages: [{ role: "user", content: "read it", timestamp: 0 }],
        tools: [tool],
      }),
      signal,
    });
    const firstResult = await first.result();
    assert.equal(firstResult.stopReason, "toolUse", firstResult.errorMessage);
    const continuation = await source.source({
      sessionId: "tool-continuation",
      turnId: "tool-continuation",
      invocationId: "tool-continuation:invocation:1",
      model: source.model,
      context: normalizeContext({
        messages: [
          { role: "user", content: "read it", timestamp: 0 },
          {
            role: "assistant",
            content: [
              {
                type: "toolCall",
                id: "call_read|fc_read",
                name: "old_mcp.read",
                arguments: { value: "paper" },
              },
            ],
            api: "openai-responses",
            provider: "openai",
            model: source.model.id,
            usage: {
              input: 1,
              output: 1,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 2,
              cost: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0,
                total: 0,
              },
            },
            stopReason: "toolUse",
            timestamp: 1,
          },
          {
            role: "toolResult",
            toolCallId: "call_read|fc_read",
            toolName: "old_mcp.read",
            content: [{ type: "text", text: "Found the paper" }],
            isError: false,
            timestamp: 2,
          },
        ],
        tools: [],
      }),
      signal,
    });
    const continuationResult = await continuation.result();
    assert.lengthOf(requests, 2);
    assert.equal(
      continuationResult.stopReason,
      "stop",
      continuationResult.errorMessage,
    );
    const body = (await requests[1].clone().json()) as {
      input: Array<Record<string, unknown>>;
      previous_response_id?: string;
    };
    const functionCall = body.input.find(
      (item) => item.type === "function_call",
    );
    const functionOutput = body.input.find(
      (item) => item.type === "function_call_output",
    );
    assert.deepEqual(
      {
        name: functionCall?.name,
        namespace: functionCall?.namespace,
      },
      { name: "zotero_tool_1", namespace: "zotero_agents" },
    );
    assert.equal(functionOutput?.call_id, "call_read");
    assert.deepEqual(body.tools, []);
    assert.isUndefined(body.previous_response_id);
  });

  it("accepts completed web-search actions by the pinned Responses schema", async function () {
    await putPiCredential({
      id: "fixture-chatgpt-search-schema",
      label: "Fixture ChatGPT",
      material: {
        kind: "chatgpt",
        access: "access",
        refresh: "refresh",
        idToken: "id-token",
        expiresAt: Date.now() + 60_000,
        issuer: "https://auth.openai.com",
        subject: "fixture-subject",
        clientId: "fixture-client",
        scope: ["chatgpt.tokens.use.direct"],
      },
    });
    const cases = [
      { action: { type: "search", query: "legacy query" }, valid: true },
      { action: { type: "search" }, valid: true },
      {
        action: {
          type: "search",
          queries: ["current query"],
          sources: [{ type: "url", url: "https://example.org" }],
        },
        valid: true,
      },
      {
        action: { type: "search", query: "legacy", queries: ["current"] },
        valid: true,
      },
      { action: { type: "search", query: 1 }, valid: false },
      { action: { type: "open_page" }, valid: true },
      { action: { type: "open_page", url: null }, valid: true },
      { action: { type: "open_page", url: 1 }, valid: false },
      {
        action: {
          type: "find_in_page",
          url: "https://example.org",
          pattern: "text",
        },
        valid: true,
      },
      {
        action: { type: "find", url: "https://example.org", pattern: "text" },
        valid: false,
      },
    ] as const;
    for (const [index, item] of cases.entries()) {
      const message = {
        id: `msg_search_${index}`,
        type: "message",
        role: "assistant",
        status: "completed",
        content: [
          {
            type: "output_text",
            text: "Search result",
            annotations: [],
          },
        ],
      };
      const searchCall = {
        id: `search_${index}`,
        type: "web_search_call",
        status: "completed",
        action: item.action,
      };
      const response = {
        id: `resp_search_${index}`,
        status: "completed",
        output: [searchCall, message],
      };
      const events = [
        ...response.output.map(
          (output, output_index) =>
            `event: response.output_item.done\ndata: ${JSON.stringify({ type: "response.output_item.done", output_index, item: output })}\n\n`,
        ),
        'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","output_index":1,"content_index":0,"delta":"Search result"}\n\n',
        `event: response.completed\ndata: ${JSON.stringify({ type: "response.completed", response })}\n\n`,
      ].join("");
      let completed = false;
      const source = createPiProviderSource(
        {
          ...selection,
          provider: "openai",
          authVariant: "chatgpt",
          credentialRef: "fixture-chatgpt-search-schema",
          api: "openai-responses",
          baseUrl: "https://api.openai.com/v1",
        },
        {
          chatGPTAuth: {
            resolvePiChatGPTAccess: async () => "access-token",
            assertPiChatGPTInferenceAllowed: async () => undefined,
            pausePiChatGPTInference: async () => undefined,
          },
          forceChatGPTWebSearch: true,
          fetch: async () =>
            new Response(events, {
              headers: { "content-type": "text/event-stream" },
            }),
          onChatGPTCompletedResponse: () => {
            completed = true;
          },
        },
      );
      const stream = await source.source({
        sessionId: `search-action-${index}`,
        turnId: `search-action-${index}`,
        invocationId: `search-action-${index}:invocation:0`,
        model: source.model,
        context: normalizeContext({
          messages: [{ role: "user", content: "search", timestamp: 0 }],
        }),
        signal: new AbortController().signal,
      });
      const result = await stream.result();
      assert.equal(
        result.stopReason === "stop",
        item.valid,
        JSON.stringify(item.action),
      );
      assert.equal(completed, item.valid, JSON.stringify(item.action));
    }
  });

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

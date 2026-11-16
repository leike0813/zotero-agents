import { assert } from "chai";
import {
  createSynthesisEmbeddingProvider,
  resolveSynthesisEmbeddingEndpoints,
  getSynthesisEmbeddingEncodingOptionsKey,
  discoverSynthesisEmbeddingModels,
  inspectSynthesisEmbeddingModel,
  type SynthesisEmbeddingHttpClient,
  type SynthesisEmbeddingHttpRequest,
} from "../../src/modules/synthesis/synthesisEmbeddingProvider";
import type {
  SynthesisEncodingIdentity,
  SynthesisRetrievalConnection,
} from "../../packages/synthesis-contracts/src";
import { createCancellationController } from "../../src/utils/wait";

const identity: SynthesisEncodingIdentity = {
  modelId: "m",
  dimensions: 3,
  queryPrefix: "q: ",
  documentPrefix: "d: ",
};

function connection(
  overrides: Partial<SynthesisRetrievalConnection> = {},
): SynthesisRetrievalConnection {
  return {
    id: "c1",
    name: "c1",
    protocol: "openai",
    baseUrl: "http://svc",
    modelId: "m",
    queryPrefix: "q: ",
    documentPrefix: "d: ",
    ...overrides,
  };
}

function fakeClient(
  handler: (args: SynthesisEmbeddingHttpRequest) =>
    | { status: number; text: string; headers?: Record<string, string> }
    | Promise<{
        status: number;
        text: string;
        headers?: Record<string, string>;
      }>,
) {
  const calls: SynthesisEmbeddingHttpRequest[] = [];
  const client: SynthesisEmbeddingHttpClient = {
    async request(args) {
      calls.push(args);
      return await handler(args);
    },
  };
  return { calls, client };
}

function provider(client: SynthesisEmbeddingHttpClient) {
  return createSynthesisEmbeddingProvider({ client, sleep: async () => {} });
}

function deadline() {
  return Date.now() + 60_000;
}

function openAiText(entries: Array<{ index: number; embedding: number[] }>) {
  return JSON.stringify({ data: entries });
}

async function rejects(promise: Promise<unknown>) {
  try {
    await promise;
  } catch {
    return;
  }
  throw new Error("expected the embedding request to reject");
}

describe("Synthesis embedding provider", function () {
  this.timeout(20_000);

  it("resolves service roots, API roots and full endpoints without losing proxy or query components", function () {
    for (const [protocol, baseUrl, expected] of [
      ["openai", "https://svc", "https://svc/v1/embeddings"],
      [
        "openai",
        "https://svc/proxy/v1?api-version=1",
        "https://svc/proxy/v1/embeddings?api-version=1",
      ],
      ["ollama", "https://svc/proxy/api", "https://svc/proxy/api/embed"],
      ["tei", "https://svc/proxy", "https://svc/proxy/embed"],
      ["cohere", "https://svc/v2", "https://svc/v2/embed"],
      ["voyage", "https://svc/v1", "https://svc/v1/embeddings"],
      [
        "gemini",
        "https://svc/v1beta",
        "https://svc/v1beta/models/m:batchEmbedContents",
      ],
    ] as const) {
      assert.equal(
        resolveSynthesisEmbeddingEndpoints(connection({ protocol, baseUrl }))
          .embeddingUrl,
        expected,
      );
    }
  });

  it("uses a complete embedding endpoint without appending a second path and authenticates Ollama", async function () {
    const fake = fakeClient(() => ({
      status: 200,
      text: JSON.stringify({ embeddings: [[1, 0, 0]] }),
    }));
    await provider(fake.client).encode({
      identity,
      purpose: "query",
      inputs: ["alpha"],
      deadlineAtMs: deadline(),
      services: [
        {
          connection: connection({
            protocol: "ollama",
            baseUrl: "https://svc/proxy/api/embed?version=2",
          }),
          credential: "proxy-key",
        },
      ],
    });
    assert.equal(fake.calls[0].url, "https://svc/proxy/api/embed?version=2");
    assert.equal(fake.calls[0].headers.authorization, "Bearer proxy-key");
  });

  for (const [protocol, response, field, task] of [
    ["tei", [[1, 0, 0]], "inputs", undefined],
    ["cohere", { embeddings: { float: [[1, 0, 0]] } }, "texts", "search_query"],
    [
      "voyage",
      { data: [{ index: 0, embedding: [1, 0, 0] }] },
      "input",
      "query",
    ],
    [
      "gemini",
      { embeddings: [{ values: [1, 0, 0] }] },
      "requests",
      "RETRIEVAL_QUERY",
    ],
  ] as const) {
    it(`encodes ${protocol} native requests and validates their vector association`, async function () {
      const conn = connection({ protocol, dimensions: 3 });
      const key = getSynthesisEmbeddingEncodingOptionsKey(conn);
      const fake = fakeClient(() => ({
        status: 200,
        text: JSON.stringify(response),
      }));
      const result = await provider(fake.client).encode({
        identity: { ...identity, ...(key ? { encodingOptionsKey: key } : {}) },
        purpose: "query",
        inputs: ["alpha"],
        deadlineAtMs: deadline(),
        services: [{ connection: conn, credential: "key" }],
      });
      assert.deepEqual(result.vectors, [[1, 0, 0]]);
      const body = JSON.parse(fake.calls[0].body);
      if (protocol === "gemini") {
        assert.equal(body.requests[0].content.parts[0].text, "q: alpha");
        assert.equal(body.requests[0].taskType, task);
        assert.equal(fake.calls[0].headers["x-goog-api-key"], "key");
      } else {
        assert.deepEqual(body[field], ["q: alpha"]);
        if (task) assert.equal(body.input_type, task);
      }
    });
  }

  it("binds effective query/document options to compatibility and rejects reserved overrides", async function () {
    const conn = connection({
      parameters: {
        common: { task: "retrieval.query" },
        document: { task: "retrieval.passage" },
      },
    });
    const fake = fakeClient(() => ({
      status: 200,
      text: openAiText([{ index: 0, embedding: [1, 0, 0] }]),
    }));
    await rejects(
      provider(fake.client).encode({
        identity,
        purpose: "query",
        inputs: ["alpha"],
        deadlineAtMs: deadline(),
        services: [{ connection: conn }],
      }),
    );
    assert.isEmpty(fake.calls);
    const key = getSynthesisEmbeddingEncodingOptionsKey(conn);
    await provider(fake.client).encode({
      identity: { ...identity, encodingOptionsKey: key },
      purpose: "document",
      inputs: ["alpha"],
      deadlineAtMs: deadline(),
      services: [{ connection: conn }],
    });
    assert.equal(JSON.parse(fake.calls[0].body).task, "retrieval.passage");
    await rejects(
      provider(fake.client).probe({
        connection: connection({
          parameters: { common: { input: ["replacement"] } },
        }),
      }),
    );
    assert.lengthOf(fake.calls, 1);
  });

  it("discovers models from an unsaved Ollama draft without embedding any text", async function () {
    const fake = fakeClient(() => ({
      status: 200,
      text: JSON.stringify({
        models: [{ name: "embed:latest" }, { name: "chat:latest" }],
      }),
    }));
    const result = await discoverSynthesisEmbeddingModels({
      connection: { protocol: "ollama", baseUrl: "https://svc/proxy" },
      credential: "secret",
      client: fake.client,
    });
    assert.equal(result.status, "ok");
    assert.deepEqual(
      result.models.map((model) => model.id),
      ["embed:latest", "chat:latest"],
    );
    assert.equal(result.models[0].embedding, "unknown");
    assert.equal(fake.calls[0].method, "GET");
    assert.equal(fake.calls[0].url, "https://svc/proxy/api/tags");
    assert.equal(fake.calls[0].headers.authorization, "Bearer secret");
  });

  it("follows Gemini model pages, preserves raw ids and filters explicit non-embedding capabilities", async function () {
    const fake = fakeClient((args) => ({
      status: 200,
      text: JSON.stringify(
        args.url.includes("pageToken=")
          ? {
              models: [
                {
                  name: "models/e2",
                  supportedGenerationMethods: ["embedContent"],
                },
              ],
            }
          : {
              models: [
                {
                  name: "models/chat",
                  supportedGenerationMethods: ["generateContent"],
                },
                {
                  name: "models/e1",
                  supportedGenerationMethods: ["embedContent"],
                },
              ],
              nextPageToken: "next",
            },
      ),
    }));
    const result = await discoverSynthesisEmbeddingModels({
      connection: { protocol: "gemini", baseUrl: "https://svc/v1beta" },
      client: fake.client,
    });
    assert.equal(result.status, "ok");
    assert.deepEqual(
      result.models
        .filter((model) => model.embedding === "supported")
        .map((model) => model.id),
      ["models/e1", "models/e2"],
    );
    assert.lengthOf(fake.calls, 2);
  });

  it("reports unsupported discovery and HTTP failures without exposing the response or credentials", async function () {
    const fake = fakeClient(() => ({
      status: 401,
      text: "private-proxy-secret",
    }));
    const unsupported = await discoverSynthesisEmbeddingModels({
      connection: { protocol: "voyage", baseUrl: "https://svc/v1" },
      client: fake.client,
    });
    assert.equal(unsupported.status, "unsupported");
    assert.isEmpty(fake.calls);
    const failed = await discoverSynthesisEmbeddingModels({
      connection: { protocol: "openai", baseUrl: "https://svc/v1" },
      client: fake.client,
    });
    assert.equal(failed.status, "failed");
    assert.equal(failed.diagnostics[0].code, "embedding_http_401");
    assert.notInclude(JSON.stringify(failed), "private-proxy-secret");
  });

  it("marks discovery partial at the candidate bound and cancels an unfinished request", async function () {
    const fake = fakeClient(() => ({
      status: 200,
      text: JSON.stringify({
        data: Array.from({ length: 1001 }, (_, i) => ({ id: `m-${i}` })),
      }),
    }));
    const result = await discoverSynthesisEmbeddingModels({
      connection: { protocol: "openai", baseUrl: "https://svc/v1" },
      client: fake.client,
    });
    assert.lengthOf(result.models, 1000);
    assert.isTrue(result.partial);
    const cancellation = createCancellationController();
    const pending = discoverSynthesisEmbeddingModels({
      connection: { protocol: "openai", baseUrl: "https://svc/v1" },
      client: fakeClient(() => new Promise(() => {})).client,
      signal: cancellation.signal,
    });
    cancellation.abort();
    const canceled = await pending;
    assert.equal(canceled.status, "failed");
    assert.equal(canceled.diagnostics[0].code, "embedding_discovery_canceled");
  });

  it("checks only the chosen Ollama model for an explicit embedding capability", async function () {
    const fake = fakeClient(() => ({
      status: 200,
      text: JSON.stringify({
        capabilities: ["embedding"],
        model_info: { "bert.embedding_length": 3 },
      }),
    }));
    const model = await inspectSynthesisEmbeddingModel({
      connection: {
        protocol: "ollama",
        baseUrl: "https://svc",
        modelId: "raw-model:tag",
      },
      client: fake.client,
    });
    assert.equal(model.id, "raw-model:tag");
    assert.equal(model.embedding, "supported");
    assert.equal(fake.calls[0].url, "https://svc/api/show");
    assert.deepEqual(JSON.parse(fake.calls[0].body), {
      model: "raw-model:tag",
    });
  });

  it("splits native provider batches under one deadline and never returns a successful prefix after failure", async function () {
    const conn = connection({ protocol: "cohere" });
    const key = getSynthesisEmbeddingEncodingOptionsKey(conn);
    const fake = fakeClient((args) => {
      const texts = JSON.parse(args.body).texts;
      assert.isAtMost(texts.length, 96);
      return {
        status: 200,
        text: JSON.stringify({
          embeddings: { float: texts.map(() => [1, 0, 0]) },
        }),
      };
    });
    const result = await provider(fake.client).encode({
      identity: { ...identity, encodingOptionsKey: key },
      purpose: "document",
      inputs: Array(100).fill("alpha"),
      deadlineAtMs: deadline(),
      services: [{ connection: conn }],
    });
    assert.lengthOf(result.vectors, 100);
    assert.lengthOf(fake.calls, 2);
    const failing = fakeClient((args) => ({
      status: JSON.parse(args.body).texts.length === 96 ? 200 : 400,
      text: JSON.stringify({
        embeddings: { float: Array(96).fill([1, 0, 0]) },
      }),
    }));
    await rejects(
      provider(failing.client).encode({
        identity: { ...identity, encodingOptionsKey: key },
        purpose: "document",
        inputs: Array(100).fill("alpha"),
        deadlineAtMs: deadline(),
        services: [{ connection: conn }],
      }),
    );
  });

  it("reorders OpenAI vectors by explicit index and applies the query prefix", async function () {
    const fake = fakeClient(() => ({
      status: 200,
      text: openAiText([
        { index: 1, embedding: [0, 1, 0] },
        { index: 0, embedding: [1, 0, 0] },
      ]),
    }));
    const result = await provider(fake.client).encode({
      identity,
      purpose: "query",
      inputs: ["alpha", "beta"],
      deadlineAtMs: deadline(),
      services: [{ connection: connection() }],
    });
    assert.deepEqual(result.vectors, [
      [1, 0, 0],
      [0, 1, 0],
    ]);
    assert.equal(
      (JSON.parse(fake.calls[0].body) as { input: string[] }).input.join("|"),
      "q: alpha|q: beta",
    );
  });

  it("fails the whole batch when an association is ambiguous", async function () {
    const fake = fakeClient(() => ({
      status: 200,
      text: openAiText([
        { index: 0, embedding: [1, 0, 0] },
        { index: 0, embedding: [0, 1, 0] },
      ]),
    }));
    await rejects(
      provider(fake.client).encode({
        identity,
        purpose: "query",
        inputs: ["alpha", "beta"],
        deadlineAtMs: deadline(),
        services: [{ connection: connection() }],
      }),
    );
  });

  it("rejects a mismatched dimension, a zero vector and a non-finite value", async function () {
    const mismatch = fakeClient(() => ({
      status: 200,
      text: openAiText([{ index: 0, embedding: [1, 0] }]),
    }));
    await rejects(
      provider(mismatch.client).encode({
        identity,
        purpose: "query",
        inputs: ["alpha"],
        deadlineAtMs: deadline(),
        services: [{ connection: connection() }],
      }),
    );
    const zero = fakeClient(() => ({
      status: 200,
      text: openAiText([{ index: 0, embedding: [0, 0, 0] }]),
    }));
    await rejects(
      provider(zero.client).encode({
        identity,
        purpose: "query",
        inputs: ["alpha"],
        deadlineAtMs: deadline(),
        services: [{ connection: connection() }],
      }),
    );
    const nonFinite = fakeClient(() => ({
      status: 200,
      text: '{"data":[{"index":0,"embedding":[1e999,0,0]}]}',
    }));
    await rejects(
      provider(nonFinite.client).encode({
        identity,
        purpose: "query",
        inputs: ["alpha"],
        deadlineAtMs: deadline(),
        services: [{ connection: connection() }],
      }),
    );
  });

  it("uses Ollama ordered arrays and disables server truncation", async function () {
    const longQuery = "x".repeat(4096);
    const fake = fakeClient(() => ({
      status: 200,
      text: JSON.stringify({
        embeddings: [
          [1, 0, 0],
          [0, 1, 0],
        ],
      }),
    }));
    const result = await provider(fake.client).encode({
      identity,
      purpose: "query",
      inputs: [longQuery, "beta"],
      deadlineAtMs: deadline(),
      services: [
        {
          connection: connection({
            protocol: "ollama",
            baseUrl: "http://ollama",
          }),
        },
      ],
    });
    const body = JSON.parse(fake.calls[0].body) as {
      input: string[];
      truncate: boolean;
    };
    assert.isTrue(fake.calls[0].url.endsWith("/api/embed"));
    assert.isFalse(body.truncate);
    assert.equal(body.input[0], `q: ${longQuery}`);
    assert.lengthOf(result.vectors, 2);
  });

  it("tries each compatible service once for a query under one deadline", async function () {
    const fake = fakeClient((args) =>
      args.url.includes("primary")
        ? { status: 500, text: "boom" }
        : { status: 200, text: JSON.stringify({ embeddings: [[1, 0, 0]] }) },
    );
    const result = await provider(fake.client).encode({
      identity,
      purpose: "query",
      inputs: ["alpha"],
      deadlineAtMs: deadline(),
      services: [
        {
          connection: connection({
            id: "p",
            baseUrl: "http://primary",
            protocol: "ollama",
          }),
        },
        {
          connection: connection({
            id: "f",
            baseUrl: "http://fallback",
            protocol: "ollama",
          }),
        },
      ],
    });
    assert.lengthOf(result.vectors, 1);
    assert.equal(fake.calls.length, 2);
    assert.isTrue(fake.calls[1].url.includes("fallback"));
  });

  it("bounds document batches to three total attempts", async function () {
    const fake = fakeClient(() => ({ status: 503, text: "unavailable" }));
    await rejects(
      provider(fake.client).encode({
        identity,
        purpose: "document",
        inputs: ["alpha"],
        deadlineAtMs: deadline(),
        services: [
          { connection: connection({ id: "p", baseUrl: "http://primary" }) },
          { connection: connection({ id: "f", baseUrl: "http://fallback" }) },
        ],
      }),
    );
    assert.equal(fake.calls.length, 3);
  });

  it("does not retry a non-retryable service error on the same service", async function () {
    const fake = fakeClient(() => ({ status: 401, text: "denied" }));
    await rejects(
      provider(fake.client).encode({
        identity,
        purpose: "document",
        inputs: ["alpha"],
        deadlineAtMs: deadline(),
        services: [
          { connection: connection({ id: "p", baseUrl: "http://primary" }) },
          { connection: connection({ id: "f", baseUrl: "http://fallback" }) },
        ],
      }),
    );
    assert.lengthOf(
      fake.calls.filter((call) => call.url.includes("primary")),
      1,
    );
  });

  it("fails without a request when the deadline has passed or no service matches", async function () {
    const fake = fakeClient(() => ({
      status: 200,
      text: JSON.stringify({ embeddings: [[1, 0, 0]] }),
    }));
    await rejects(
      provider(fake.client).encode({
        identity,
        purpose: "query",
        inputs: ["alpha"],
        deadlineAtMs: Date.now() - 1,
        services: [{ connection: connection() }],
      }),
    );
    await rejects(
      provider(fake.client).encode({
        identity,
        purpose: "query",
        inputs: ["alpha"],
        deadlineAtMs: deadline(),
        services: [{ connection: connection({ modelId: "other" }) }],
      }),
    );
    assert.lengthOf(fake.calls, 0);
  });

  it("reports actual dimensions from a synthetic probe", async function () {
    const fake = fakeClient(() => ({
      status: 200,
      text: JSON.stringify({ embeddings: [[1, 0]] }),
    }));
    const probe = await provider(fake.client).probe({
      connection: connection({ protocol: "ollama" }),
    });
    assert.equal(probe.dimensions, 2);
    assert.lengthOf(fake.calls, 2);
  });

  it("skips to the next service when a response fails float32 validation", async function () {
    const fake = fakeClient((args) =>
      args.url.includes("primary")
        ? { status: 200, text: openAiText([{ index: 0, embedding: [1, 0] }]) }
        : {
            status: 200,
            text: openAiText([{ index: 0, embedding: [1, 0, 0] }]),
          },
    );
    const result = await provider(fake.client).encode({
      identity,
      purpose: "query",
      inputs: ["alpha"],
      deadlineAtMs: deadline(),
      services: [
        { connection: connection({ id: "p", baseUrl: "http://primary" }) },
        { connection: connection({ id: "f", baseUrl: "http://fallback" }) },
      ],
    });
    assert.deepEqual(result.vectors, [[1, 0, 0]]);
    assert.equal(fake.calls.length, 2);
  });

  it("rejects a value that cannot round-trip through float32", async function () {
    const fake = fakeClient(() => ({
      status: 200,
      text: '{"data":[{"index":0,"embedding":[1e39,0,0]}]}',
    }));
    await rejects(
      provider(fake.client).encode({
        identity,
        purpose: "query",
        inputs: ["alpha"],
        deadlineAtMs: deadline(),
        services: [{ connection: connection() }],
      }),
    );
  });

  it("honors a Retry-After hint for the same-service retry", async function () {
    let attempt = 0;
    const delays: number[] = [];
    const fake = fakeClient(() => {
      attempt += 1;
      return attempt === 1
        ? { status: 503, text: "busy", headers: { "retry-after": "2" } }
        : { status: 200, text: JSON.stringify({ embeddings: [[1, 0, 0]] }) };
    });
    const result = await createSynthesisEmbeddingProvider({
      client: fake.client,
      sleep: async (ms) => {
        delays.push(ms);
      },
    }).encode({
      identity,
      purpose: "document",
      inputs: ["alpha"],
      deadlineAtMs: deadline(),
      services: [{ connection: connection({ protocol: "ollama" }) }],
    });
    assert.deepEqual(delays, [2000]);
    assert.lengthOf(result.vectors, 1);
  });

  it("cancels a retry wait when the request is aborted", async function () {
    const controller = createCancellationController();
    const fake = fakeClient(() => {
      controller.abort();
      return { status: 503, text: "busy", headers: { "retry-after": "30" } };
    });
    await rejects(
      createSynthesisEmbeddingProvider({
        client: fake.client,
        sleep: () => new Promise<void>(() => {}),
      }).encode({
        identity,
        purpose: "document",
        inputs: ["alpha"],
        deadlineAtMs: deadline(),
        services: [{ connection: connection() }],
        signal: controller.signal,
      }),
    );
  });

  it("rejects a valid response that arrives after cancellation or the shared deadline", async function () {
    for (const stop of ["cancel", "deadline"] as const) {
      const controller = createCancellationController();
      let now = 1000;
      const fake = fakeClient(() => {
        if (stop === "cancel") controller.abort();
        else now = 2001;
        return {
          status: 200,
          text: openAiText([{ index: 0, embedding: [1, 0, 0] }]),
        };
      });
      await rejects(
        createSynthesisEmbeddingProvider({
          client: fake.client,
          now: () => now,
        }).encode({
          identity,
          purpose: "query",
          inputs: ["alpha"],
          deadlineAtMs: 2000,
          services: [{ connection: connection() }],
          signal: controller.signal,
        }),
      );
      assert.lengthOf(fake.calls, 1);
    }
  });
});

import { assert } from "chai";
import {
  createSynthesisEmbeddingProvider,
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

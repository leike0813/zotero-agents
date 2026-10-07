import assert from "node:assert/strict";
import { describe, it } from "mocha";
import {
  rebuildSynthesisTopicSearchRequest,
  rebuildSynthesisTopicSearchResult,
  type SynthesisTopicSearchRequest,
  type SynthesisTopicSearchResult,
} from "../../packages/synthesis-contracts/src/search";
import { SynthesisClientError } from "../../packages/synthesis-contracts/src/common";
import {
  createSynthesisClientFromPort,
  type SynthesisClientPort,
} from "../../src/modules/synthesisClient/clientPortAdapter";
import { createWorkflowSynthesisHostApi } from "../../src/modules/synthesisClient/workflowHostClient";
import { createNativeSynthesisClientComposition } from "../../src/modules/synthesisClient/nativeComposition";
import type { SynthesisClient } from "../../packages/synthesis-contracts/src/client";
import { SynthesisSidecarRpcError } from "../../src/modules/synthesis/sidecar/synthesisSidecarRpcClient";

const request: SynthesisTopicSearchRequest = {
  query: "attention mechanism",
  sections: ["summary"],
};

function searchResult(): SynthesisTopicSearchResult {
  return rebuildSynthesisTopicSearchResult({
    results: [
      {
        topicId: "topic-a",
        matchedSections: ["summary"],
        matchReasons: ["query_terms"],
      },
    ],
    status: "completed",
    method: "lexical",
    coverage: {
      kind: "topic",
      sections: [{ section: "summary", status: "complete" }],
    },
    issues: [],
    nextCursor: null,
    hasMore: false,
    total: 1,
  });
}

const result = searchResult();

describe("Synthesis Topic search projection", function () {
  it("rebuilds and forwards the grouped client request and result", async function () {
    let received: unknown;
    const client = createSynthesisClientFromPort({
      searchTopics: async (input) => {
        received = input;
        return result;
      },
    } as SynthesisClientPort);

    const actual = await client.topics.search(request);

    assert.deepEqual(received, rebuildSynthesisTopicSearchRequest(request));
    assert.deepEqual(actual, result);
  });

  it("preserves semantic matches and actual methods through the client projection", async function () {
    for (const method of ["vector", "hybrid"] as const) {
      const enhanced = {
        ...result,
        method,
        results: [
          {
            topicId: "topic-a",
            matchedSections: ["summary"],
            matchReasons:
              method === "vector"
                ? ["semantic"]
                : ["query_terms", "exact_phrase", "semantic"],
          },
        ],
      };
      const client = createSynthesisClientFromPort({
        searchTopics: async () => rebuildSynthesisTopicSearchResult(enhanced),
      } as SynthesisClientPort);

      assert.deepEqual(await client.topics.search(request), enhanced);
    }
  });

  it("fails with a typed client error when the port declares no Topic search", async function () {
    const client = createSynthesisClientFromPort({} as SynthesisClientPort);

    await assert.rejects(
      () => client.topics.search(request),
      (error: unknown) => {
        assert.deepEqual((error as { code?: string }).code, "unavailable");
        return true;
      },
    );
  });

  it("routes the grouped operation through the native Topic capability catalog", async function () {
    const calls: Array<{ capability: string; payload: unknown }> = [];
    const composition = createNativeSynthesisClientComposition({
      getReadyConnection: () => ({
        discovery: {
          host: "127.0.0.1",
          port: 1234,
          profileId: "1".repeat(64),
          serviceInstanceId: "service-1",
        },
        clientToken: "token",
      }),
      rpcClient: {
        async call(args) {
          calls.push({ capability: args.capability, payload: args.payload });
          return args.rebuildResult(result);
        },
      },
    });

    assert.deepEqual(await composition.client.topics.search(request), result);
    assert.deepEqual(calls, [
      { capability: "client.searchTopics", payload: { args: [request] } },
    ]);
  });

  it("exposes explicit Workflow Host projections for search and context", async function () {
    const calls: string[] = [];
    const client = {
      topics: {
        async search(input: SynthesisTopicSearchRequest) {
          calls.push(`search:${JSON.stringify(input)}`);
          return result;
        },
        async getContext(input: { topicId: string; view: string }) {
          calls.push(`getContext:${input.topicId}`);
          return { topicId: input.topicId };
        },
      },
    } as unknown as SynthesisClient;
    const host = createWorkflowSynthesisHostApi({
      resolveClient: async () => client,
    });

    const searched = await host.topics.search(request);
    const context = await host.topics.getContext({
      topicId: "topic-a",
      view: "semantic",
    });

    assert.deepEqual(searched, result);
    assert.deepEqual(context, { topicId: "topic-a" });
    assert.deepEqual(calls, [
      `search:${JSON.stringify(rebuildSynthesisTopicSearchRequest(request))}`,
      "getContext:topic-a",
    ]);
  });

  it("forwards the optional Topic context delivery unchanged to the owner", async function () {
    let received: unknown[] = [];
    const client = {
      topics: {
        async getContext(...args: unknown[]) {
          received = args;
          return { topicId: "topic-a" };
        },
      },
    } as unknown as SynthesisClient;
    const host = createWorkflowSynthesisHostApi({
      resolveClient: async () => client,
    });
    const request = { topicId: "topic-a", view: "semantic" } as const;

    await host.topics.getContext(request, { mode: "remote" });
    assert.deepEqual(received, [request, { mode: "remote" }]);

    await host.topics.getContext(request);
    assert.deepEqual(received, [request, undefined]);
  });

  it("keeps the Topic context owner failure on the shared Workflow error contract", async function () {
    const client = {
      topics: {
        async getContext() {
          throw new SynthesisClientError("not_found", "topic is missing");
        },
      },
    } as unknown as SynthesisClient;
    const host = createWorkflowSynthesisHostApi({
      resolveClient: async () => client,
    });

    await assert.rejects(
      () => host.topics.getContext({ topicId: "topic-a", view: "semantic" }),
      (error: unknown) => {
        assert.equal((error as { code?: string }).code, "not_found");
        assert.deepEqual((error as { details?: unknown }).details, {
          kind: "resource",
        });
        return true;
      },
    );
  });

  it("adapts Topic search cursor failures to stable client control codes", async function () {
    for (const [sidecarCode, clientCode] of [
      ["basis_mismatch", "conflict"],
      ["invalid_request", "invalid_request"],
      ["worker_unavailable", "unavailable"],
    ] as const) {
      const composition = createNativeSynthesisClientComposition({
        getReadyConnection: () => ({
          discovery: {
            host: "127.0.0.1",
            port: 1234,
            profileId: "1".repeat(64),
            serviceInstanceId: "service-1",
          },
          clientToken: "token",
        }),
        rpcClient: {
          async call() {
            throw new SynthesisSidecarRpcError(sidecarCode, {
              reason: sidecarCode,
            });
          },
        },
      });

      await assert.rejects(
        () => composition.client.topics.search(request),
        (error: unknown) => {
          assert.equal(
            (error as { code?: string }).code,
            clientCode,
            sidecarCode,
          );
          assert.equal(
            (error as { details?: Record<string, unknown> }).details
              ?.sidecarReason,
            sidecarCode,
          );
          return true;
        },
      );
    }
  });

  it("surfaces a stale Topic cursor as a Workflow conflict", async function () {
    const host = createWorkflowSynthesisHostApi({
      resolveClient: async () =>
        ({
          topics: {
            async search() {
              throw new SynthesisClientError("conflict", "stale cursor", {
                sidecarCode: "basis_mismatch",
                sidecarReason: "basis_mismatch",
              });
            },
          },
        }) as unknown as SynthesisClient,
    });

    await assert.rejects(
      () => host.topics.search(request),
      (error: unknown) => {
        assert.equal((error as { code?: string }).code, "conflict");
        assert.deepEqual((error as { details?: unknown }).details, {
          reason: "revision_mismatch",
        });
        return true;
      },
    );
  });

  it("keeps Topic search and context reads separate operations", async function () {
    const calls: string[] = [];
    const client = {
      topics: {
        async search() {
          calls.push("search");
          return result;
        },
        async getContext() {
          calls.push("getContext");
          return { topicId: "topic-a" };
        },
      },
    } as unknown as SynthesisClient;
    const host = createWorkflowSynthesisHostApi({
      resolveClient: async () => client,
    });

    await host.topics.search(request);
    assert.deepEqual(calls, ["search"]);
  });
});

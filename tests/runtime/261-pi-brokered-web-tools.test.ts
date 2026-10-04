import { assert } from "chai";
import { getPref, setPref } from "../../src/utils/prefs";
import { createPiBrokeredWebTools } from "../../src/modules/piBrokeredWebTools";
import {
  upsertPiModelConfiguration,
  upsertPiProviderConnection,
} from "../../src/modules/piProviderConfiguration";
import {
  getPiCredentialIdentityRevision,
  putPiCredential,
} from "../../src/modules/piCredentialStore";
import type { PiModelSelectionSnapshot } from "../../src/shared/piProviderContract";
import { piWebSourceTestEvidenceApplies } from "../../src/shared/piWebSourceContract";
import { JSDOM } from "jsdom";
import { freezePiToolGatewayTurn } from "../../src/modules/piToolGateway";
import {
  installRuntimeBridgeOverrideForTests,
  resetRuntimeBridgeOverrideForTests,
} from "../../src/utils/runtimeBridge";

function chatGPTSelection(
  configurationId: string,
  credentialRef: string,
  modelId: string,
  contextWindow = 32768,
): PiModelSelectionSnapshot {
  return {
    configurationId,
    provider: "openai",
    modelId,
    authVariant: "chatgpt",
    credentialRef,
    api: "openai-responses",
    baseUrl: "https://api.openai.com/v1",
    reasoning: "off",
    catalogRevision: "fixture-chatgpt-catalog",
    adapterVersion: "0.84.4",
    runtimeVersion: "0.84.4",
    requiresLocalNetwork: false,
    metadata: { authVariants: ["chatgpt"] },
    policy: {
      contextWindow,
      maxTokens: 0,
      input: ["text"],
      supportsTools: false,
    },
  };
}

function saveModelCard(input: {
  id: string;
  provider: string;
  modelId: string;
  authVariant: "api-key" | "chatgpt";
  credentialRef: string;
}) {
  upsertPiProviderConnection({
    id: input.id + "-connection",
    label: input.id,
    provider: input.provider,
    authVariant: input.authVariant,
    credentialRef: input.credentialRef,
    enabled: true,
  });
  upsertPiModelConfiguration({
    id: input.id,
    connectionId: input.id + "-connection",
    modelId: input.modelId,
    enabled: true,
  });
}

async function putChatGPTCredential(id: string, subject = id) {
  await putPiCredential({
    id,
    label: "Fixture ChatGPT",
    material: {
      kind: "chatgpt",
      access: "stored-access",
      refresh: "stored-refresh",
      idToken: "stored-id-token",
      expiresAt: Date.now() + 60_000,
      issuer: "https://auth.openai.com",
      subject,
      clientId: `client-${id}`,
      scope: ["openid", "offline_access", "chatgpt.tokens.use.direct"],
    },
  });
  return getPiCredentialIdentityRevision(id, "model-provider")!;
}

function chatGPTAuthSeam(
  state: {
    scope?: readonly string[];
    welcomeAccepted?: boolean;
    paused?: boolean;
  } = {},
) {
  const registration = {
    scope: state.scope || ["chatgpt.tokens.use.direct"],
    welcomeAccepted: state.welcomeAccepted ?? true,
    paused: state.paused ?? false,
  };
  return {
    resolvePiChatGPTAccess: async () => "fresh-access",
    assertPiChatGPTInferenceAllowed: async () => {
      if (!registration.scope.includes("chatgpt.tokens.use.direct"))
        throw { code: "permission_missing" };
      if (!registration.welcomeAccepted) throw { code: "welcome_required" };
      if (registration.paused) throw { code: "quota_paused" };
    },
  };
}

function chatGPTResponseEvents(event: Record<string, any>) {
  const outputs = event.response?.output || [];
  const itemEvents = outputs
    .map(
      (item: Record<string, unknown>, output_index: number) =>
        `event: response.output_item.done\ndata: ${JSON.stringify({
          type: "response.output_item.done",
          output_index,
          item,
        })}\n\n`,
    )
    .join("");
  return `${itemEvents}event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

describe("Pi Brokered Web Tools", function () {
  it("uses a host window controller when the plugin global has none", async function () {
    const Controller = globalThis.AbortController;
    const service = createPiBrokeredWebTools({
      credential: async () => ({ kind: "web-secret", secret: "k" }),
      credentialRevision: () => "r",
      request: async (input) => ({
        requestedUrl: input.url,
        finalUrl: input.url,
        status: 200,
        headers: {},
        body: new TextEncoder().encode(
          JSON.stringify({
            results: [
              { title: "Page", url: "https://example.org", content: "Found" },
            ],
          }),
        ),
      }),
    });
    const previous = getPref("piWebSourcesJson");
    service.saveSources(
      service.listSources().map((s) => ({
        ...s,
        enabled: s.kind === "perplexity",
        credentialId: "key",
      })),
    );
    installRuntimeBridgeOverrideForTests({
      windows: [{ AbortController: Controller }],
    });
    (globalThis as any).AbortController = undefined;
    try {
      const result = await service.search(
        await service.freezeForTurn(),
        { query: "q" },
        new Controller().signal,
        async () => {},
      );
      assert.equal(result.resultKind, "raw_results");
    } finally {
      globalThis.AbortController = Controller;
      resetRuntimeBridgeOverrideForTests();
      setPref("piWebSourcesJson", previous as string);
    }
  });
  let prior: unknown;
  beforeEach(function () {
    prior = getPref("piWebSourcesJson");
    setPref("piWebSourcesJson", "");
  });
  afterEach(function () {
    setPref("piWebSourcesJson", prior as string);
  });

  it("loads offline with only Exa enabled and preserves frozen explicit ordering", async function () {
    let requests = 0;
    const service = createPiBrokeredWebTools({
      request: async () => {
        requests++;
        throw new Error("offline");
      },
    });
    const sources = service.listSources();
    assert.lengthOf(sources, 8);
    assert.deepEqual(
      sources.filter((s) => s.enabled).map((s) => s.kind),
      ["exa-mcp"],
    );
    const frozen = await service.freezeForTurn();
    service.saveSources([...sources].reverse());
    assert.equal(frozen.sources[0].source.kind, "exa-mcp");
    assert.equal(requests, 0);
    assert.throws(() =>
      service.saveSources([{ ...sources[0], secret: "unsafe" } as any]),
    );
  });

  it("boosts only enabled exact-configuration native search without changing saved order", async function () {
    const priorModel = getPref("piProviderConfigurationJson");
    try {
      setPref("piProviderConfigurationJson", "");
      saveModelCard({
        id: "same",
        provider: "openai",
        modelId: "gpt-4.1",
        authVariant: "api-key",
        credentialRef: "key",
      });
      const service = createPiBrokeredWebTools();
      const sources = service
        .listSources()
        .map((s) =>
          s.kind === "openai-native"
            ? { ...s, enabled: true, modelConfigurationId: "same" }
            : s,
        );
      service.saveSources(sources);
      const turn = await service.freezeForTurn({
        configurationId: "same",
      } as any);
      assert.deepEqual(
        turn.sources.map((s) => s.source.kind),
        ["openai-native", "exa-mcp"],
      );
      assert.equal(service.listSources()[0].kind, "exa-mcp");
      const other = await service.freezeForTurn({
        configurationId: "other",
      } as any);
      assert.deepEqual(
        other.sources.map((s) => s.source.kind),
        ["exa-mcp", "openai-native"],
      );
    } finally {
      setPref("piProviderConfigurationJson", priorModel as string);
    }
  });

  it("fetches anonymous HTML into bounded untrusted readable text", async function () {
    const service = createPiBrokeredWebTools({
      parseHtml: (html) => new JSDOM(html).window.document,
      request: async (input) => {
        assert.equal(input.kind, "fetch");
        assert.isUndefined(input.headers);
        return {
          requestedUrl: input.url,
          finalUrl: "https://example.org/end",
          status: 200,
          headers: { "content-type": "text/html" },
          body: new TextEncoder().encode(
            '<title>Page</title><script>bad()</script><main><h1>Heading</h1><p>Read <a href="/target">link</a></p><form>hidden control</form></main>',
          ),
        };
      },
    });
    const result = await service.fetch(
      { url: "https://example.org/start" },
      new AbortController().signal,
    );
    assert.equal(result.contentTrust, "external_untrusted");
    assert.equal(result.title, "Page");
    assert.include(result.text, "https://example.org/target");
    assert.notInclude(result.text, "bad()");
    assert.notInclude(result.text, "hidden control");
  });

  it("tries a terminal source once, records safe attempts, and stops on unknown", async function () {
    const attempts: any[] = [];
    let calls = 0;
    const service = createPiBrokeredWebTools({
      credential: async () => ({
        kind: "web-secret",
        secret: "private-fixture",
      }),
      credentialRevision: () => "revision",
      request: async (input) => {
        calls++;
        if (input.kind === "brave")
          return {
            requestedUrl: input.url,
            finalUrl: input.url,
            status: 503,
            headers: {},
            body: new TextEncoder().encode("private-error"),
          };
        return {
          requestedUrl: input.url,
          finalUrl: input.url,
          status: 200,
          headers: {},
          body: new TextEncoder().encode(
            JSON.stringify({
              results: [
                {
                  url: "https://example.org/p",
                  title: "Found",
                  snippet: "Snippet",
                  private: "hidden",
                },
              ],
            }),
          ),
        };
      },
    });
    service.saveSources(
      service.listSources().map((s) => ({
        ...s,
        enabled: ["brave-http", "perplexity"].includes(s.kind),
        credentialId: "key",
      })),
    );
    const turn = await service.freezeForTurn();
    const result = await service.search(
      turn,
      { query: "query" },
      new AbortController().signal,
      async (a) => {
        attempts.push(a);
      },
    );
    assert.equal(result.resultKind, "raw_results");
    assert.equal(result.source.id, "perplexity");
    assert.equal(calls, 2);
    assert.equal(attempts.filter((a) => a.phase === "terminal").length, 2);
    assert.notInclude(JSON.stringify(attempts), "private-fixture");
    assert.notInclude(JSON.stringify(attempts), "private-error");
    assert.notInclude(JSON.stringify(result), "hidden");
    const unknown = createPiBrokeredWebTools({
      credential: async () => ({ kind: "web-secret", secret: "fixture" }),
      credentialRevision: () => "revision",
      request: async () => {
        throw new Error("lost connection");
      },
    });
    const receipts: any[] = [];
    try {
      await unknown.search(
        turn,
        { query: "q" },
        new AbortController().signal,
        async (a) => {
          receipts.push(a);
        },
      );
      assert.fail("expected unknown");
    } catch (error) {
      assert.equal((error as any).code, "outcome_unknown");
    }
    assert.equal(receipts.filter((a) => a.phase === "started").length, 1);
  });

  it("requires real server-side search evidence and preserves absent citations", async function () {
    const priorModel = getPref("piProviderConfigurationJson");
    try {
      setPref("piProviderConfigurationJson", "");
      for (const provider of ["openai", "anthropic"])
        saveModelCard({
          id: provider,
          provider,
          modelId:
            provider === "openai" ? "gpt-4.1" : "claude-sonnet-4-20250514",
          authVariant: "api-key",
          credentialRef: "key",
        });
      let performed = true;
      const service = createPiBrokeredWebTools({
        credential: async () => ({ kind: "api-key", secret: "private" }),
        credentialRevision: () => "revision",
        request: async (input) => {
          const body = JSON.parse(input.body!);
          if (input.kind === "anthropic") {
            assert.equal(input.url, "https://api.anthropic.com/v1/messages");
            assert.equal(input.headers?.["x-api-key"], "private");
            assert.equal(body.tools[0].type, "web_search_20250305");
            assert.equal(body.tool_choice.name, "web_search");
            return {
              requestedUrl: input.url,
              finalUrl: input.url,
              status: 200,
              headers: {},
              body: new TextEncoder().encode(
                JSON.stringify({
                  stop_reason: "end_turn",
                  content: [
                    {
                      type: "server_tool_use",
                      id: "search1",
                      name: "web_search",
                      input: { query: "actual" },
                    },
                    {
                      type: "web_search_tool_result",
                      tool_use_id: "search1",
                      content: performed
                        ? []
                        : {
                            type: "web_search_tool_result_error",
                            error_code: "too_many_requests",
                          },
                    },
                    { type: "text", text: "Answer" },
                  ],
                  usage: { input_tokens: 5, output_tokens: 4 },
                }),
              ),
            };
          }
          assert.equal(body.tools[0].type, "web_search");
          assert.equal(body.tool_choice.type, "web_search");
          return {
            requestedUrl: input.url,
            finalUrl: input.url,
            status: 200,
            headers: {},
            body: new TextEncoder().encode(
              JSON.stringify({
                status: "completed",
                output: [
                  ...(performed
                    ? [
                        {
                          type: "web_search_call",
                          status: "completed",
                          action: { type: "search", queries: ["actual"] },
                        },
                      ]
                    : []),
                  {
                    type: "message",
                    content: [
                      { type: "output_text", text: "Answer", annotations: [] },
                    ],
                  },
                ],
              }),
            ),
          };
        },
      });
      for (const kind of ["openai-native", "anthropic-native"]) {
        service.saveSources(
          service.listSources().map((s) => ({
            ...s,
            enabled: s.kind === kind,
            modelConfigurationId: kind.split("-")[0],
          })),
        );
        const turn = await service.freezeForTurn();
        const receipts: any[] = [];
        const result = await service.search(
          turn,
          { query: "q" },
          new AbortController().signal,
          async (a) => {
            receipts.push(a);
          },
        );
        assert.equal(result.resultKind, "grounded_answer");
        if (result.resultKind === "grounded_answer") {
          assert.equal(result.sourceEvidence, "unavailable");
          assert.deepEqual(result.citations, []);
          assert.deepEqual(result.actualQueries, ["actual"]);
        }
        assert.notInclude(JSON.stringify(receipts), "Answer");
      }
      performed = false;
      service.saveSources(
        service.listSources().map((s) => ({
          ...s,
          enabled: s.kind === "openai-native",
          modelConfigurationId: "openai",
        })),
      );
      const receipts: any[] = [];
      try {
        await service.search(
          await service.freezeForTurn(),
          { query: "q" },
          new AbortController().signal,
          async (a) => {
            receipts.push(a);
          },
        );
        assert.fail();
      } catch (error) {
        assert.equal((error as any).code, "search_unavailable");
      }
      assert.equal(receipts.at(-1).code, "search_not_performed");
      service.saveSources(
        service.listSources().map((s) => ({
          ...s,
          enabled: s.kind === "anthropic-native",
          modelConfigurationId: "anthropic",
        })),
      );
      const errors: any[] = [];
      try {
        await service.search(
          await service.freezeForTurn(
            chatGPTSelection("chatgpt-paused", "selected-paused", "gpt-5"),
          ),
          { query: "q" },
          new AbortController().signal,
          async (a) => {
            errors.push(a);
          },
        );
        assert.fail();
      } catch (error) {
        assert.equal((error as any).code, "search_unavailable");
      }
      assert.equal(errors.at(-1).code, "source_tool_error");
    } finally {
      setPref("piProviderConfigurationJson", priorModel as string);
    }
  });

  it("calls only curated MCP search descriptors and normalizes official text/JSON formats", async function () {
    const called: string[] = [];
    const service = createPiBrokeredWebTools({
      credential: async () => ({ kind: "web-secret", secret: "private" }),
      credentialRevision: () => "revision",
      readPackage: async () =>
        JSON.stringify({
          name: "@brave/brave-search-mcp-server",
          version: "2.1.4",
        }),
      openMcp: async () => ({
        listTools: async () => ({
          tools: [
            {
              name: "web_search_exa",
              inputSchema: {
                type: "object",
                properties: {
                  query: { type: "string" },
                  objective: { type: "string" },
                  numResults: { type: "number" },
                },
                required: ["query", "objective"],
              },
            },
            {
              name: "tavily-search",
              inputSchema: {
                type: "object",
                properties: {
                  query: { type: "string" },
                  max_results: { type: "number" },
                },
                required: ["query"],
              },
            },
            {
              name: "brave_web_search",
              inputSchema: {
                type: "object",
                properties: {
                  query: { type: "string" },
                  count: { type: "number" },
                },
                required: ["query"],
              },
            },
          ],
        }),
        callTool: async (call) => {
          called.push(call.name);
          return call.name === "web_search_exa"
            ? {
                content: [
                  {
                    type: "text",
                    text: "Title: Example\nURL: https://example.org\nPublished: N/A\nAuthor: N/A\nHighlights:\nSnippet",
                  },
                ],
              }
            : call.name === "brave_web_search"
              ? {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify({
                        title: "Example",
                        url: "https://example.org",
                        description: "Snippet",
                      }),
                    },
                    {
                      type: "text",
                      text: JSON.stringify({
                        title: "Second",
                        url: "https://example.org/second",
                        description: "More",
                      }),
                    },
                  ],
                }
              : {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify({
                        results: [
                          {
                            title: "Example",
                            url: "https://example.org",
                            content: "Snippet",
                          },
                        ],
                      }),
                    },
                  ],
                };
        },
        close: async () => undefined,
      }),
    });
    for (const kind of ["exa-mcp", "tavily-mcp", "brave-mcp"]) {
      service.saveSources(
        service.listSources().map((s) => ({
          ...s,
          enabled: s.kind === kind,
          credentialId: "key",
          ...(s.kind === "brave-mcp"
            ? {
                codeExecutionApproved: true,
                executable: "/usr/bin/node",
                args: [
                  "/installed/@brave/brave-search-mcp-server/2.1.4/dist/index.js",
                ],
              }
            : {}),
        })),
      );
      const probe = await service.testSource(
        service.listSources().find((s) => s.kind === kind)!.id,
        "test",
      );
      assert.equal(probe.status, "available");
      assert.isString(probe.toolDigest);
      assert.equal(probe.binding?.kind, kind);
      const result = await service.search(
        await service.freezeForTurn(),
        { query: "q" },
        new AbortController().signal,
        async () => {},
      );
      assert.equal(result.resultKind, "raw_results");
    }
    assert.deepEqual(called, [
      "web_search_exa",
      "web_search_exa",
      "tavily-search",
      "tavily-search",
      "brave_web_search",
      "brave_web_search",
    ]);
  });

  it("binds source identity to Gateway approval and blocks dispatch if domain evidence fails", async function () {
    let dispatched = 0;
    const service = createPiBrokeredWebTools({
      credential: async () => ({ kind: "web-secret", secret: "fixture" }),
      credentialRevision: () => "r",
      inspect: async (url) => ({
        origin: new URL(url).origin,
        location: "public",
      }),
      request: async (input) => {
        dispatched++;
        return {
          requestedUrl: input.url,
          finalUrl: input.url,
          status: 200,
          headers: {},
          body: new TextEncoder().encode(
            '{"results":[{"url":"https://example.org","title":"T","snippet":"S"}]}',
          ),
        };
      },
    });
    service.saveSources(
      service.listSources().map((s) => ({
        ...s,
        enabled: s.kind === "perplexity",
        credentialId: "key",
      })),
    );
    const chain = await service.freezeForTurn();
    const definitions = service.definitions(chain, async () => {
      throw new Error("disk");
    });
    const turn = await freezePiToolGatewayTurn({
      owner: { kind: "conversation", ownerId: "owner" },
      turnId: "turn",
      definitions,
      runtimeCapability: {
        identity: "fixture",
        availableCapabilityIds: definitions.map((d) => d.capabilityId),
      },
      policy: {
        mode: "automatic",
        systemAllowedEffects: ["external-egress"],
        authorizedEffects: ["external-egress"],
        authorizedKeys: ["web:perplexity"],
        maxCalls: 5,
        maxConcurrent: 1,
        maxCost: 10,
      },
      hooks: {
        recordStarted: async () => {},
        recordReceipt: async () => {},
        recordPermission: async () => {},
      },
    });
    const result = await turn.executeBatch([
      { callId: "call", name: "web_search", arguments: { query: "q" } },
    ]);
    assert.equal(result.results[0].status, "failed");
    assert.equal(dispatched, 0);
  });

  it("settles cancellation while a dispatched source is silent without starting fallback", async function () {
    const controller = new AbortController();
    const attempts: any[] = [];
    const service = createPiBrokeredWebTools({
      credential: async () => ({ kind: "web-secret", secret: "fixture" }),
      credentialRevision: () => "r",
      request: async () => {
        controller.abort();
        return new Promise(() => {});
      },
    });
    service.saveSources(
      service.listSources().map((s) => ({
        ...s,
        enabled: ["brave-http", "perplexity"].includes(s.kind),
        credentialId: "key",
      })),
    );
    try {
      await service.search(
        await service.freezeForTurn(),
        { query: "q" },
        controller.signal,
        async (a) => {
          attempts.push(a);
        },
      );
      assert.fail();
    } catch (error) {
      assert.equal((error as any).code, "canceled");
    }
    assert.equal(attempts.filter((a) => a.phase === "started").length, 1);
    assert.equal(attempts.at(-1).code, "canceled");
  });

  it("does not dispatch a replaced credential or an unsupported curated MCP descriptor", async function () {
    let current = "old",
      calls = 0;
    const service = createPiBrokeredWebTools({
      credentialRevision: () => current,
      credential: async () => {
        current = "replacement";
        return { kind: "web-secret", secret: "new-account" };
      },
      request: async () => {
        calls++;
        throw new Error("should not dispatch");
      },
      openMcp: async () => ({
        listTools: async () => ({
          tools: [
            {
              name: "web_search_exa",
              description: "drifted",
              inputSchema: {
                type: "object",
                properties: {
                  query: { type: "string" },
                  objective: { type: "string" },
                  numResults: { type: "number" },
                },
                required: ["results"],
              },
            },
          ],
        }),
        callTool: async () => {
          calls++;
          throw new Error("should not dispatch");
        },
        close: async () => undefined,
      }),
    });
    service.saveSources(
      service.listSources().map((s) => ({
        ...s,
        enabled: s.kind === "brave-http",
        credentialId: "key",
      })),
    );
    const attempts: any[] = [];
    try {
      await service.search(
        await service.freezeForTurn(),
        { query: "q" },
        new AbortController().signal,
        async (a) => {
          attempts.push(a);
        },
      );
      assert.fail();
    } catch (error) {
      assert.equal((error as any).code, "search_unavailable");
    }
    assert.equal(calls, 0);
    assert.equal(attempts.at(-1).code, "source_unavailable");
    service.saveSources(
      service
        .listSources()
        .map((s) => ({ ...s, enabled: s.kind === "exa-mcp" })),
    );
    const probe = await service.testSource("exa", "probe");
    assert.equal(probe.status, "failed");
    assert.equal(probe.code, "web_contract_invalid");
    assert.equal(calls, 0);
  });

  it("tests one saved disabled source without enabling it or dispatching a fallback", async function () {
    const dispatched: string[] = [];
    const service = createPiBrokeredWebTools({
      credential: async () => ({ kind: "web-secret", secret: "k" }),
      credentialRevision: () => "r",
      request: async (input) => {
        dispatched.push(input.kind);
        if (input.kind !== "perplexity")
          throw new Error("only the tested source may dispatch");
        return {
          requestedUrl: input.url,
          finalUrl: input.url,
          status: 200,
          headers: { "content-type": "application/json" },
          body: new TextEncoder().encode(
            JSON.stringify({
              results: [
                { title: "Page", url: "https://example.org", snippet: "S" },
              ],
            }),
          ),
        };
      },
    });
    service.saveSources(
      service.listSources().map((s) => ({
        ...s,
        enabled: s.kind === "brave-http",
        credentialId:
          s.kind === "perplexity" || s.kind === "brave-http"
            ? "key"
            : undefined,
      })),
    );
    const result = await service.testSource("perplexity", "req-1");
    assert.equal(result.status, "available");
    assert.deepEqual(dispatched, ["perplexity"]);
    assert.equal(result.binding?.kind, "perplexity");
    assert.isTrue(result.binding?.billable);
    assert.deepEqual(
      service
        .listSources()
        .filter((s) => s.enabled)
        .map((s) => s.kind),
      ["brave-http"],
    );
  });

  it("does not report a connection-only or partial curated MCP source as completed", async function () {
    let answer = JSON.stringify({ results: [] });
    const service = createPiBrokeredWebTools({
      credentialRevision: () => "r",
      openMcp: async () => ({
        listTools: async () => ({
          tools: [
            {
              name: "web_search_exa",
              description: "search",
              inputSchema: {
                type: "object",
                properties: {
                  query: { type: "string" },
                  objective: { type: "string" },
                  numResults: { type: "number" },
                },
                required: ["query", "objective"],
              },
            },
          ],
        }),
        callTool: async () => ({ content: [{ type: "text", text: answer }] }),
        close: async () => undefined,
      }),
    });
    const empty = await service.testSource("exa", "empty");
    assert.equal(empty.status, "failed");
    assert.equal(empty.code, "no_results");
    answer = "No search results found.";
    const partial = await service.testSource("exa", "partial");
    assert.equal(partial.status, "failed");
    assert.equal(partial.code, "no_results");
  });

  it("retains test evidence for enablement and order edits and invalidates it for binding edits", async function () {
    const service = createPiBrokeredWebTools({
      credential: async () => ({ kind: "web-secret", secret: "k" }),
      credentialRevision: () => "r1",
      request: async () => {
        throw new Error("no dispatch expected");
      },
    });
    service.saveSources(
      service.listSources().map((s) =>
        s.kind === "searxng"
          ? {
              ...s,
              enabled: false,
              endpoint: "http://127.0.0.1:8080/search",
              localNetworkApprovedOrigin: "http://127.0.0.1:8080",
            }
          : s,
      ),
    );
    const evidence = {
      sourceId: "searxng",
      requestId: "req-1",
      status: "available" as const,
      binding: service.describeSavedSource("searxng")!,
    };
    assert.isOk(evidence.binding);
    service.saveSources(
      service
        .listSources()
        .map((s) =>
          s.kind === "searxng" ? { ...s, enabled: true, label: "Renamed" } : s,
        )
        .reverse(),
    );
    assert.isTrue(
      piWebSourceTestEvidenceApplies(
        evidence,
        service.describeSavedSource("searxng"),
      ),
    );
    service.saveSources(
      service.listSources().map((s) =>
        s.kind === "searxng"
          ? {
              ...s,
              endpoint: "http://127.0.0.1:9090/search",
              localNetworkApprovedOrigin: "http://127.0.0.1:9090",
            }
          : s,
      ),
    );
    assert.isFalse(
      piWebSourceTestEvidenceApplies(
        evidence,
        service.describeSavedSource("searxng"),
      ),
    );
    service.saveSources(
      service
        .listSources()
        .map((s) =>
          s.kind === "searxng" ? { ...s, credentialId: "other" } : s,
        ),
    );
    const replaced = createPiBrokeredWebTools({
      credentialRevision: () => "r2",
    });
    assert.isFalse(
      piWebSourceTestEvidenceApplies(
        evidence,
        replaced.describeSavedSource("searxng"),
      ),
    );
  });

  it("refuses to certify a result whose saved binding changed during the test", async function () {
    const service = createPiBrokeredWebTools({
      credential: async () => ({ kind: "web-secret", secret: "k" }),
      credentialRevision: () => "r",
      request: async (input) => {
        service.saveSources(
          service
            .listSources()
            .map((s) =>
              s.kind === "perplexity"
                ? { ...s, searchModelId: "other-model" }
                : s,
            ),
        );
        return {
          requestedUrl: input.url,
          finalUrl: input.url,
          status: 200,
          headers: { "content-type": "application/json" },
          body: new TextEncoder().encode(
            JSON.stringify({
              results: [
                { title: "T", url: "https://example.org", snippet: "S" },
              ],
            }),
          ),
        };
      },
    });
    service.saveSources(
      service.listSources().map((s) => ({
        ...s,
        enabled: false,
        ...(s.kind === "perplexity" ? { credentialId: "key" } : {}),
      })),
    );
    const result = await service.testSource("perplexity", "req-1");
    assert.equal(result.status, "failed");
    assert.equal(result.code, "source_binding_changed");
    assert.isFalse(
      piWebSourceTestEvidenceApplies(
        result,
        service.describeSavedSource("perplexity"),
      ),
    );
  });

  it("describes a saved source's identity, permissions and missing parts", async function () {
    const priorModel = getPref("piProviderConfigurationJson");
    try {
      setPref("piProviderConfigurationJson", "");
      saveModelCard({
        id: "native",
        provider: "openai",
        modelId: "gpt-4.1",
        authVariant: "api-key",
        credentialRef: "native-key",
      });
      const service = createPiBrokeredWebTools({
        credentialRevision: (id) => (id === "native-key" ? "r1" : "r0"),
      });
      service.saveSources(
        service.listSources().map((s) => {
          if (s.kind === "openai-native")
            return {
              ...s,
              modelConfigurationId: "native",
              searchModelId: "unrecognized-search-model",
            };
          if (s.kind === "brave-mcp")
            return { ...s, executable: "/usr/bin/node" };
          if (s.kind === "tavily-mcp")
            return { ...s, credentialId: "tavily-key" };
          return s;
        }),
      );
      // An unconfigured source is described as incomplete, never as ready.
      assert.deepEqual(service.describeSavedSource("brave-mcp")?.missing, [
        "credential",
        "code_execution",
        "arguments",
      ]);
      assert.deepEqual(service.describeSavedSource("tavily")?.missing, []);
      // A self-hosted source needs an endpoint but never a credential.
      assert.deepEqual(service.describeSavedSource("searxng")?.missing, [
        "endpoint",
      ]);
      assert.deepEqual(service.describeSavedSource("openai-native")?.missing, [
        "search_model",
      ]);
      assert.isNull(service.describeSavedSource("unknown"));
      const described = service.describeSavedSource("openai-native")!;
      assert.equal(described.connection?.connectionId, "native-connection");
      assert.equal(described.credentialRevision, "r1");
      assert.equal(
        described.identity,
        service.describeSavedSource("openai-native")?.identity,
      );
      assert.isTrue(described.billable);
    } finally {
      setPref("piProviderConfigurationJson", priorModel as string);
    }
  });

  it("keeps the saved sources when a source form save is rejected", function () {
    const service = createPiBrokeredWebTools();
    service.saveSources(
      service
        .listSources()
        .map((s) =>
          s.kind === "perplexity" ? { ...s, label: "Perplexity" } : s,
        ),
    );
    const before = service.listSources();
    assert.throws(
      () =>
        service.saveSources([
          ...before.filter((s) => s.id !== "perplexity"),
          { ...before[0], kind: "searxng" },
        ]),
      /web_source_invalid/,
    );
    assert.deepEqual(service.listSources(), before);
  });

  it("tests a native source through its exact referenced model configuration", async function () {
    const priorModel = getPref("piProviderConfigurationJson");
    try {
      setPref("piProviderConfigurationJson", "");
      for (const id of ["searched", "other"])
        saveModelCard({
          id,
          provider: "openai",
          modelId: id === "searched" ? "gpt-4.1" : "gpt-5",
          authVariant: "api-key",
          credentialRef: id === "searched" ? "searched-key" : "other-key",
        });
      const secrets = new Map([
        ["searched-key", "searched-secret"],
        ["other-key", "other-secret"],
      ]);
      let body: any;
      const service = createPiBrokeredWebTools({
        credential: async (id) => ({
          kind: "api-key",
          secret: secrets.get(id) || "",
        }),
        credentialRevision: () => "r",
        request: async (input) => {
          body = JSON.parse(input.body!);
          return {
            requestedUrl: input.url,
            finalUrl: input.url,
            status: 200,
            headers: { "content-type": "application/json" },
            body: new TextEncoder().encode(
              JSON.stringify({
                status: "completed",
                output: [
                  {
                    type: "web_search_call",
                    status: "completed",
                    action: { type: "search", queries: ["actual"] },
                  },
                  {
                    type: "message",
                    content: [
                      { type: "output_text", text: "Answer", annotations: [] },
                    ],
                  },
                ],
                usage: { input_tokens: 1, output_tokens: 2, total_tokens: 3 },
              }),
            ),
          };
        },
      });
      service.saveSources(
        service.listSources().map((s) =>
          s.kind === "openai-native"
            ? {
                ...s,
                enabled: false,
                modelConfigurationId: "searched",
                searchModelId: "gpt-4.1-mini",
              }
            : s,
        ),
      );
      const result = await service.testSource("openai-native", "req-1");
      assert.equal(result.status, "available");
      assert.equal(body.model, "gpt-4.1-mini");
      assert.equal(result.binding?.modelConfigurationId, "searched");
      assert.equal(result.binding?.modelId, "gpt-4.1-mini");
      service.saveSources(
        service
          .listSources()
          .map((s) =>
            s.kind === "openai-native"
              ? { ...s, modelConfigurationId: "missing" }
              : s,
          ),
      );
      const unresolved = await service.testSource("openai-native", "req-2");
      assert.equal(unresolved.status, "unavailable");
      assert.equal(unresolved.code, "source_unavailable");
    } finally {
      setPref("piProviderConfigurationJson", priorModel as string);
    }
  });

  it("bounds multibyte extraction and uses only the selected SearXNG authorization", async function () {
    const text = '界"\n'.repeat(20_000);
    const service = createPiBrokeredWebTools({
      credential: async () => ({
        kind: "web-secret",
        secret: "Bearer selected-key",
      }),
      credentialRevision: () => "r",
      request: async (input) => {
        if (input.kind === "fetch")
          return {
            requestedUrl: input.url,
            finalUrl: input.url,
            status: 200,
            headers: { "content-type": "text/plain" },
            body: new TextEncoder().encode(text),
          };
        assert.equal(input.kind, "searxng");
        assert.equal(input.headers?.Authorization, "Bearer selected-key");
        assert.equal(input.localNetworkApprovedOrigin, "http://127.0.0.1:8888");
        return {
          requestedUrl: input.url,
          finalUrl: input.url,
          status: 200,
          headers: {},
          body: new TextEncoder().encode(
            JSON.stringify({
              results: [
                {
                  title: "Page",
                  url: "https://example.org",
                  content: "Snippet",
                },
              ],
            }),
          ),
        };
      },
    });
    const fetched = await service.fetch(
      { url: "https://example.org" },
      new AbortController().signal,
    );
    assert.isTrue(fetched.truncated);
    assert.isAtMost(new TextEncoder().encode(fetched.text).length, 50 * 1024);
    assert.isAtMost(
      new TextEncoder().encode(
        JSON.stringify({
          callId: "id",
          name: "web_fetch",
          status: "completed",
          effectCertainty: "confirmed_complete",
          value: fetched,
        }),
      ).length,
      50 * 1024,
    );
    assert.notInclude(fetched.text, "�");
    service.saveSources(
      service.listSources().map((s) => ({
        ...s,
        enabled: s.kind === "searxng",
        ...(s.kind === "searxng"
          ? {
              endpoint: "http://127.0.0.1:8888/search",
              localNetworkApprovedOrigin: "http://127.0.0.1:8888",
              credentialId: "key",
            }
          : {}),
      })),
    );
    const result = await service.search(
      await service.freezeForTurn(),
      { query: "q" },
      new AbortController().signal,
      async () => {},
    );
    assert.equal(result.source.kind, "searxng");
    assert.notInclude(JSON.stringify(result), "selected-key");
    assert.throws(() =>
      service.saveSources([
        {
          id: "local",
          label: "Local",
          kind: "searxng",
          enabled: true,
          endpoint: "http://192.168.1.1/search",
          localNetworkApprovedOrigin: "http://192.168.1.1",
          credentialId: "key",
        },
      ]),
    );
  });

  it("uses the selected ChatGPT registration through one official Responses search and retains supplied citations", async function () {
    const priorModel = getPref("piProviderConfigurationJson");
    try {
      setPref("piProviderConfigurationJson", "");
      saveModelCard({
        id: "chatgpt",
        provider: "openai",
        modelId: "gpt-5",
        authVariant: "chatgpt",
        credentialRef: "selected",
      });
      const credentialRevision = await putChatGPTCredential(
        "selected",
        "subject-1",
      );
      let accessArgs: any[] = [];
      const gateCalls: string[] = [];
      const operations: any[] = [];
      const auth = chatGPTAuthSeam();
      const service = createPiBrokeredWebTools({
        resolveChatGPTSelection: async (target, modelId) =>
          chatGPTSelection(target.configurationId, "selected", modelId),
        chatGPTAuth: {
          resolvePiChatGPTAccess: async (...args: any[]) => {
            accessArgs = args;
            return "fresh-access";
          },
          assertPiChatGPTInferenceAllowed: async (id: string) => {
            gateCalls.push(id);
            return auth.assertPiChatGPTInferenceAllowed();
          },
        },
        credentialRevision: () => credentialRevision,
        credential: async (id) => {
          assert.equal(id, "selected");
          return {
            kind: "chatgpt",
            access: "encrypted-access",
            refresh: "encrypted-refresh",
            idToken: "encrypted-id-token",
            expiresAt: Date.now() + 60_000,
            issuer: "https://auth.openai.com",
            subject: "subject-1",
            clientId: "client-1",
            scope: ["openid", "offline_access", "chatgpt.tokens.use.direct"],
          };
        },
        request: async (input) => {
          operations.push(input);
          assert.equal(input.kind, "openai");
          assert.equal(input.url, "https://api.openai.com/v1/responses");
          assert.equal(input.headers?.Authorization, "Bearer fresh-access");
          const payload = JSON.parse(input.body!);
          assert.isTrue(payload.stream);
          assert.isFalse(payload.store);
          assert.deepEqual(payload.tools, [{ type: "web_search" }]);
          assert.deepEqual(payload.tool_choice, { type: "web_search" });
          return {
            requestedUrl: input.url,
            finalUrl: input.url,
            status: 200,
            headers: { "content-type": "text/event-stream" },
            body: new TextEncoder().encode(
              chatGPTResponseEvents({
                type: "response.completed",
                response: {
                  id: "resp-search",
                  status: "completed",
                  output: [
                    {
                      id: "search-1",
                      type: "web_search_call",
                      status: "completed",
                      action: { type: "search", queries: ["actual query"] },
                    },
                    {
                      id: "msg-1",
                      type: "message",
                      status: "completed",
                      role: "assistant",
                      content: [
                        {
                          type: "output_text",
                          text: "Answer",
                          annotations: [
                            {
                              type: "url_citation",
                              url: "https://example.org/source",
                              title: "Source",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  usage: {
                    input_tokens: 9,
                    output_tokens: 4,
                    total_tokens: 13,
                  },
                },
              }),
            ),
          };
        },
      });
      service.saveSources(
        service.listSources().map((s) => ({
          ...s,
          enabled: s.kind === "openai-native",
          modelConfigurationId: "chatgpt",
        })),
      );
      const attempts: any[] = [];
      const result = await service.search(
        await service.freezeForTurn(),
        { query: "q" },
        new AbortController().signal,
        async (a) => {
          attempts.push(a);
        },
      );
      assert.equal(result.resultKind, "grounded_answer");
      if (result.resultKind === "grounded_answer") {
        assert.deepEqual(result.citations, [
          { url: "https://example.org/source", title: "Source" },
        ]);
        assert.equal(result.sourceEvidence, "provided");
      }
      assert.equal(operations.length, 1);
      assert.equal(accessArgs[0], "selected");
      assert.equal(accessArgs[1] instanceof AbortSignal, true);
      assert.equal(accessArgs[3].identityRevision, credentialRevision);
      assert.deepEqual(gateCalls, ["selected", "selected"]);
      assert.deepEqual(attempts.at(-1).usage, {
        input_tokens: 9,
        output_tokens: 4,
        total_tokens: 13,
      });
      assert.notInclude(JSON.stringify(attempts), "encrypted-access");
      assert.notInclude(JSON.stringify(result), "encrypted-refresh");
    } finally {
      setPref("piProviderConfigurationJson", priorModel as string);
    }
  });

  it("blocks a paused ChatGPT registration before transport and does not hop to another source", async function () {
    const priorModel = getPref("piProviderConfigurationJson");
    try {
      setPref("piProviderConfigurationJson", "");
      saveModelCard({
        id: "chatgpt-paused",
        provider: "openai",
        modelId: "gpt-5",
        authVariant: "chatgpt",
        credentialRef: "selected-paused",
      });
      const credentialRevision = await putChatGPTCredential("selected-paused");
      let requests = 0;
      let gateCalls = 0;
      const service = createPiBrokeredWebTools({
        resolveChatGPTSelection: async (target, modelId) => ({
          ...chatGPTSelection(
            target.configurationId,
            "selected-paused",
            modelId,
          ),
        }),
        chatGPTAuth: (() => {
          const auth = chatGPTAuthSeam({ paused: true });
          return {
            ...auth,
            assertPiChatGPTInferenceAllowed: async () => {
              gateCalls++;
              return auth.assertPiChatGPTInferenceAllowed();
            },
          };
        })(),
        credentialRevision: () => credentialRevision,
        credential: async () => ({
          kind: "chatgpt",
          access: "stored-access",
          refresh: "stored-refresh",
          idToken: "stored-id-token",
          expiresAt: Date.now() + 60_000,
          issuer: "https://auth.openai.com",
          subject: "subject-paused",
          clientId: "client-paused",
          scope: ["openid", "offline_access", "chatgpt.tokens.use.direct"],
        }),
        request: async () => {
          requests++;
          throw new Error("quota gate must prevent transport");
        },
      });
      service.saveSources(
        service.listSources().map((source) => ({
          ...source,
          enabled: source.kind === "openai-native" || source.kind === "exa-mcp",
          modelConfigurationId: "chatgpt-paused",
        })),
      );
      const attempts: any[] = [];
      try {
        await service.search(
          await service.freezeForTurn(
            chatGPTSelection("chatgpt-paused", "selected-paused", "gpt-5"),
          ),
          { query: "q" },
          new AbortController().signal,
          async (attempt) => {
            attempts.push(attempt);
          },
        );
        assert.fail("paused registration must not search");
      } catch (error) {
        assert.equal((error as any).code, "source_quota_paused");
      }
      assert.equal(gateCalls, 1);
      assert.equal(requests, 0);
      assert.equal(
        attempts.filter((attempt) => attempt.phase === "started").length,
        1,
      );
      // An explicit test reports the pause instead of lifting it, and it never
      // hops to another source.
      const tested = await service.testSource("openai-native", "req-paused");
      assert.equal(tested.status, "failed");
      assert.equal(tested.code, "source_quota_paused");
      assert.equal(gateCalls, 2);
      assert.equal(requests, 0);
    } finally {
      setPref("piProviderConfigurationJson", priorModel as string);
    }
  });

  it("refuses a ChatGPT source with unknown frozen context before auth or transport", async function () {
    const priorModel = getPref("piProviderConfigurationJson");
    try {
      setPref("piProviderConfigurationJson", "");
      saveModelCard({
        id: "chatgpt-unknown-context",
        provider: "openai",
        modelId: "unrecognized-model-name",
        authVariant: "chatgpt",
        credentialRef: "selected-unknown-context",
      });
      const credentialRevision = await putChatGPTCredential(
        "selected-unknown-context",
      );
      let authCalls = 0;
      let requests = 0;
      const service = createPiBrokeredWebTools({
        resolveChatGPTSelection: async (target, modelId) =>
          chatGPTSelection(
            target.configurationId,
            "selected-unknown-context",
            modelId,
            0,
          ),
        chatGPTAuth: {
          resolvePiChatGPTAccess: async () => {
            authCalls++;
            return "test-access";
          },
          assertPiChatGPTInferenceAllowed: async () => {
            authCalls++;
          },
        },
        credentialRevision: () => credentialRevision,
        credential: async () => ({
          kind: "chatgpt",
          access: "stored-access",
          refresh: "stored-refresh",
          idToken: "stored-id-token",
          expiresAt: Date.now() + 60_000,
          issuer: "https://auth.openai.com",
          subject: "subject-unknown-context",
          clientId: "client-unknown-context",
          scope: ["openid", "offline_access", "chatgpt.tokens.use.direct"],
        }),
        request: async () => {
          requests++;
          throw new Error("unknown context must prevent transport");
        },
      });
      service.saveSources(
        service.listSources().map((source) => ({
          ...source,
          enabled: source.kind === "openai-native",
          modelConfigurationId: "chatgpt-unknown-context",
        })),
      );
      try {
        await service.search(
          await service.freezeForTurn(),
          { query: "q" },
          new AbortController().signal,
          async () => {},
        );
        assert.fail("unknown model context must not dispatch");
      } catch (error) {
        assert.equal((error as any).code, "source_unavailable");
      }
      assert.equal(authCalls, 0);
      assert.equal(requests, 0);
    } finally {
      setPref("piProviderConfigurationJson", priorModel as string);
    }
  });

  it("requires completed ChatGPT search evidence and citations without retrying", async function () {
    const priorModel = getPref("piProviderConfigurationJson");
    try {
      setPref("piProviderConfigurationJson", "");
      saveModelCard({
        id: "chatgpt-evidence",
        provider: "openai",
        modelId: "gpt-5",
        authVariant: "chatgpt",
        credentialRef: "selected-evidence",
      });
      const credentialRevision = await putChatGPTCredential(
        "selected-evidence",
        "subject-evidence",
      );
      const cases = [
        {
          name: "missing actual search call",
          event: {
            type: "response.completed",
            response: {
              id: "response-no-search",
              status: "completed",
              output: [
                {
                  id: "message-no-search",
                  type: "message",
                  status: "completed",
                  role: "assistant",
                  content: [{ type: "output_text", text: "Answer" }],
                },
              ],
            },
          },
          code: "search_not_performed",
        },
        {
          name: "missing citations",
          event: {
            type: "response.completed",
            response: {
              id: "response-no-citations",
              status: "completed",
              output: [
                {
                  id: "search-no-citations",
                  type: "web_search_call",
                  status: "completed",
                  action: { type: "search", queries: ["actual query"] },
                },
                {
                  id: "message-no-citations",
                  type: "message",
                  status: "completed",
                  role: "assistant",
                  content: [{ type: "output_text", text: "Answer" }],
                },
              ],
            },
          },
          code: "search_citations_missing",
        },
        {
          name: "missing actual completion",
          event: {
            type: "response.incomplete",
            response: {
              id: "response-incomplete",
              status: "incomplete",
              output: [
                {
                  type: "web_search_call",
                  status: "completed",
                  action: { type: "search", queries: ["actual query"] },
                },
                {
                  type: "message",
                  content: [
                    {
                      type: "output_text",
                      text: "Answer",
                      annotations: [
                        {
                          type: "url_citation",
                          url: "https://example.org/source",
                          title: "Source",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
          code: "source_failed",
        },
      ];
      for (const scenario of cases) {
        let dispatches = 0;
        const service = createPiBrokeredWebTools({
          resolveChatGPTSelection: async (target, modelId) =>
            chatGPTSelection(
              target.configurationId,
              "selected-evidence",
              modelId,
            ),
          chatGPTAuth: chatGPTAuthSeam(),
          credentialRevision: () => credentialRevision,
          credential: async () => ({
            kind: "chatgpt",
            access: "stored-access",
            refresh: "stored-refresh",
            idToken: "stored-id-token",
            expiresAt: Date.now() + 60_000,
            issuer: "https://auth.openai.com",
            subject: "subject-evidence",
            clientId: "client-evidence",
            scope: ["openid", "offline_access", "chatgpt.tokens.use.direct"],
          }),
          chatGPTAccess: async () => "resolved-access",
          request: async (operation) => {
            dispatches++;
            return {
              requestedUrl: operation.url,
              finalUrl: operation.url,
              status: 200,
              headers: { "content-type": "text/event-stream" },
              body: new TextEncoder().encode(
                chatGPTResponseEvents(scenario.event),
              ),
            };
          },
        });
        service.saveSources(
          service.listSources().map((source) => ({
            ...source,
            enabled: source.kind === "openai-native",
            modelConfigurationId: "chatgpt-evidence",
          })),
        );
        const attempts: any[] = [];
        try {
          await service.search(
            await service.freezeForTurn(),
            { query: "q" },
            new AbortController().signal,
            async (attempt) => {
              attempts.push(attempt);
            },
          );
          assert.fail(`${scenario.name} must not report success`);
        } catch (error) {
          assert.equal((error as any).code, scenario.code, scenario.name);
        }
        assert.equal(dispatches, 1, scenario.name);
        assert.equal(
          attempts.filter((attempt) => attempt.phase === "started").length,
          1,
        );
      }
    } finally {
      setPref("piProviderConfigurationJson", priorModel as string);
    }
  });

  it("limits the complete normalized search DTO", async function () {
    const service = createPiBrokeredWebTools({
      credentialRevision: () => "r",
      credential: async () => ({ kind: "web-secret", secret: "k" }),
      request: async (input) => ({
        requestedUrl: input.url,
        finalUrl: input.url,
        status: 200,
        headers: {},
        body: new TextEncoder().encode(
          JSON.stringify({
            results: Array.from({ length: 10 }, (_, i) => ({
              title: "T".repeat(1024),
              url: `https://example.org/${i}/` + "x".repeat(6000),
              snippet: "界".repeat(2000),
            })),
          }),
        ),
      }),
    });
    service.saveSources(
      service.listSources().map((s) => ({
        ...s,
        enabled: s.kind === "perplexity",
        credentialId: "key",
      })),
    );
    for (const query of ["q".repeat(8192), "\u0001".repeat(8191) + "q"]) {
      const result = await service.search(
        await service.freezeForTurn(),
        { query, maxResults: 10 },
        new AbortController().signal,
        async () => {},
      );
      assert.isAtMost(
        new TextEncoder().encode(JSON.stringify(result)).length,
        50 * 1024,
      );
      assert.isTrue(result.truncated);
    }
  });

  it("never launches curated stdio after cancellation during package validation", async function () {
    const controller = new AbortController();
    let opens = 0;
    const service = createPiBrokeredWebTools({
      credential: async () => ({ kind: "web-secret", secret: "k" }),
      credentialRevision: () => "r",
      readPackage: async () => {
        controller.abort();
        return JSON.stringify({
          name: "@brave/brave-search-mcp-server",
          version: "2.1.4",
        });
      },
      openMcp: async () => {
        opens++;
        throw new Error("late spawn");
      },
    });
    service.saveSources(
      service.listSources().map((s) => ({
        ...s,
        enabled: s.kind === "brave-mcp",
        credentialId: "key",
        codeExecutionApproved: true,
        executable: "/usr/bin/node",
        args: ["/installed/brave/dist/index.js"],
      })),
    );
    try {
      await service.search(
        await service.freezeForTurn(),
        { query: "q" },
        controller.signal,
        async () => {},
      );
      assert.fail();
    } catch (error) {
      assert.equal((error as any).code, "canceled");
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(opens, 0);
  });
});

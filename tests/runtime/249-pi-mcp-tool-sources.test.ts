import { assert } from "chai";
import { getPref, setPref } from "../../src/utils/prefs";
import {
  acceptPiMcpImport,
  classifyPiMcpHttpUrl,
  exportPiMcpJson,
  loadPiMcpSourceRegistry,
  previewPiMcpJson,
  reviewPiMcpTool,
  unreviewPiMcpTool,
  upsertPiMcpSource,
} from "../../src/modules/piMcpSourceRegistry";
import { readPiCredential } from "../../src/modules/piCredentialStore";
import { PiMcpStdioTransport } from "../../src/modules/piMcpStdioTransport";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { installPluginStateNodeSqliteAdapter } from "../helpers/pluginStateNodeSqliteAdapter";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import {
  createPiMcpToolSources,
  freezePiMcpGatewayTurn,
  normalizePiMcpCallResult,
  piMcpGatewayDefinitions,
} from "../../src/modules/piMcpToolSources";

describe("Pi MCP Tool Sources registry", function () {
  this.timeout(15_000);
  let prior: string;
  let root: string;
  let priorRoot: string | undefined;
  before(async function () {
    priorRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-mcp-registry-"));
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = root;
    installPluginStateNodeSqliteAdapter();
    resetPluginStateStoreForTests();
  });
  after(async function () {
    resetPluginStateStoreForTests();
    if (priorRoot === undefined) delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    else process.env.ZOTERO_SKILLS_RUNTIME_ROOT = priorRoot;
    await fs.rm(root, { recursive: true, force: true });
  });
  beforeEach(function () {
    prior = String(getPref("piMcpSourceRegistryJson") || "");
    setPref("piMcpSourceRegistryJson", "");
  });
  afterEach(function () {
    setPref("piMcpSourceRegistryJson", prior);
  });

  it("denies unsafe remote addresses and binds private cleartext approval", function () {
    assert.equal(
      classifyPiMcpHttpUrl("https://localhost.:8443/mcp").location,
      "loopback",
    );
    assert.equal(
      classifyPiMcpHttpUrl("https://fcm.googleapis.com/mcp").location,
      "public",
    );
    assert.throws(() =>
      upsertPiMcpSource({
        id: "s",
        label: "S",
        transport: "http",
        url: "http://example.org/mcp",
        enabled: true,
        credentialSlots: {},
        selectedTools: {},
      }),
    );
    assert.throws(() =>
      upsertPiMcpSource({
        id: "s",
        label: "S",
        transport: "http",
        url: "http://192.168.1.2/mcp",
        enabled: true,
        credentialSlots: {},
        selectedTools: {},
      }),
    );
    upsertPiMcpSource({
      id: "s",
      label: "S",
      transport: "http",
      url: "http://192.168.1.2/mcp",
      enabled: true,
      credentialSlots: {},
      selectedTools: {},
      cleartextApproval: "http://192.168.1.2",
      localNetworkApproval: "http://192.168.1.2",
    });
    assert.lengthOf(loadPiMcpSourceRegistry().sources, 1);
    assert.equal(
      loadPiMcpSourceRegistry().sources[0].localNetworkApproval,
      "http://192.168.1.2",
    );
    assert.throws(() =>
      upsertPiMcpSource({
        id: "s",
        label: "S",
        transport: "http",
        url: "http://192.168.1.2/mcp",
        enabled: true,
        credentialSlots: { Authorization: "c" },
        selectedTools: {},
        cleartextApproval: "http://192.168.1.2",
      }),
    );
  });

  it("imports literal secrets to the shared credential store and exports rebinding slots", async function () {
    const preview = previewPiMcpJson(
      JSON.stringify({
        mcpServers: {
          papers: {
            type: "http",
            url: "https://example.org/mcp",
            headers: { Authorization: "Bearer fixture-secret" },
          },
        },
      }),
    );
    assert.include(JSON.stringify(preview), "fixture-secret");
    await acceptPiMcpImport(preview);
    const source = loadPiMcpSourceRegistry().sources[0];
    assert.notInclude(
      String(getPref("piMcpSourceRegistryJson")),
      "fixture-secret",
    );
    const credential = await readPiCredential(
      source.credentialSlots.Authorization,
      "mcp-source",
    );
    assert.isTrue(credential.ok);
    assert.notInclude(exportPiMcpJson(), "fixture-secret");
    assert.notInclude(exportPiMcpJson(), source.credentialSlots.Authorization);
  });

  it("previews the exact local origin and denies private cleartext credentials", async function () {
    const source = { mcpServers: { local: { url: "http://192.168.4.2/mcp" } } };
    const preview = previewPiMcpJson(JSON.stringify(source));
    assert.equal(preview.sources[0].localNetworkApproval, "http://192.168.4.2");
    assert.equal(preview.sources[0].cleartextApproval, "http://192.168.4.2");
    let denied = false;
    try {
      await acceptPiMcpImport(preview);
    } catch {
      denied = true;
    }
    assert.isTrue(denied);
    await acceptPiMcpImport(preview, [
      { sourceId: "local", origin: "http://192.168.4.2", cleartext: true },
    ]);
    assert.lengthOf(loadPiMcpSourceRegistry().sources, 1);
    assert.throws(() =>
      previewPiMcpJson(
        JSON.stringify({
          mcpServers: {
            bad: {
              url: "http://192.168.4.2/mcp",
              headers: { Authorization: "secret" },
            },
          },
        }),
      ),
    );
    assert.throws(() =>
      previewPiMcpJson(
        JSON.stringify({
          mcpServers: {
            bad: {
              url: "https://example.org/mcp",
              headers: { Authorization: "$TOKEN" },
            },
          },
        }),
      ),
    );
    assert.throws(() =>
      previewPiMcpJson(
        JSON.stringify({
          mcpServers: {
            bad: {
              url: "https://example.org/mcp",
              headers: { X_A: "first", "X-A": "second" },
            },
          },
        }),
      ),
    );
  });

  it("selects a reviewed descriptor separately from direct promotion", function () {
    upsertPiMcpSource({
      id: "s",
      label: "S",
      transport: "http",
      url: "https://example.org/mcp",
      enabled: true,
      credentialSlots: {},
      selectedTools: {},
    });
    const digest = `sha256:${"a".repeat(64)}`;
    reviewPiMcpTool("s", "search", digest, { promoted: false });
    assert.deepEqual(
      loadPiMcpSourceRegistry().sources[0].selectedTools.search,
      { digest, promoted: false },
    );
    unreviewPiMcpTool("s", "search");
    assert.deepEqual(loadPiMcpSourceRegistry().sources[0].selectedTools, {});
  });
});

describe("Pi MCP Tool Sources runtime", function () {
  this.timeout(15_000);
  let prior: string;
  beforeEach(function () {
    prior = String(getPref("piMcpSourceRegistryJson") || "");
    setPref("piMcpSourceRegistryJson", "");
  });
  afterEach(function () {
    setPref("piMcpSourceRegistryJson", prior);
  });

  it("freezes selected tools and never replays a dispatched call", async function () {
    let calls = 0;
    let opens = 0;
    const controller = new AbortController();
    let failure = "disconnected";
    const tool = {
      name: "search",
      description: "Search",
      inputSchema: { type: "object", properties: {} },
    };
    const runtime = createPiMcpToolSources({
      openClient: async () => {
        opens++;
        return {
          listTools: async () => ({ tools: [tool] }),
          callTool: async (_args, options) => {
            calls++;
            assert.equal(options?.signal, controller.signal);
            controller.abort();
            throw new Error(failure);
          },
          close: async () => undefined,
        };
      },
    });
    upsertPiMcpSource({
      id: "s",
      label: "S",
      transport: "http",
      url: "https://example.org/mcp",
      enabled: true,
      credentialSlots: {},
      selectedTools: {},
    });
    assert.lengthOf((await runtime.getCatalogForTurn()).tools, 0);
    assert.equal(opens, 0);
    const available = await runtime.testSource("s");
    assert.lengthOf(available, 1);
    assert.lengthOf((await runtime.getCatalogForTurn()).tools, 0);
    reviewPiMcpTool("s", "search", available[0].digest, { promoted: false });
    const frozen = await runtime.getCatalogForTurn();
    assert.lengthOf(frozen.tools, 1);
    const failed = await runtime.callTool(
      frozen,
      "s",
      "search",
      {},
      controller.signal,
    );
    assert.equal(failed.effectCertainty, "unknown");
    assert.equal(calls, 1);
    failure = "oauth_not_supported";
    const oauth = await runtime.callTool(
      frozen,
      "s",
      "search",
      {},
      controller.signal,
    );
    assert.equal(oauth.code, "oauth_not_supported");
    assert.equal(oauth.effectCertainty, "unknown");
    assert.equal(calls, 2);
    await runtime.dispose();
  });

  it("invalidates future catalogs when tools/listChanged alters a descriptor", async function () {
    let changed: () => void = () => undefined;
    let description = "first";
    const runtime = createPiMcpToolSources({
      openClient: async (_source, invalidate) => {
        changed = invalidate;
        return {
          listTools: async () => ({
            tools: [
              { name: "search", description, inputSchema: { type: "object" } },
            ],
          }),
          callTool: async () => ({ content: [{ type: "text", text: "ok" }] }),
          close: async () => undefined,
        };
      },
    });
    upsertPiMcpSource({
      id: "changed",
      label: "Changed",
      transport: "http",
      url: "https://example.org/mcp",
      enabled: true,
      credentialSlots: {},
      selectedTools: {},
    });
    const [first] = await runtime.testSource("changed");
    reviewPiMcpTool("changed", first.name, first.digest, { promoted: false });
    const frozen = await runtime.getCatalogForTurn();
    assert.lengthOf(frozen.tools, 1);
    description = "second";
    changed();
    assert.lengthOf((await runtime.getCatalogForTurn()).tools, 0);
    assert.lengthOf(frozen.tools, 1);
    await runtime.dispose();
  });

  it("keeps transport effects even when a review narrows tool effects", async function () {
    const runtime = createPiMcpToolSources({
      openClient: async () => ({
        listTools: async () => ({
          tools: [{ name: "read", inputSchema: { type: "object" } }],
        }),
        callTool: async () => ({ content: [{ type: "text", text: "ok" }] }),
        close: async () => undefined,
      }),
    });
    upsertPiMcpSource({
      id: "remote",
      label: "Remote",
      transport: "http",
      url: "https://example.org/mcp",
      enabled: true,
      credentialSlots: {},
      selectedTools: {},
    });
    upsertPiMcpSource({
      id: "local",
      label: "Local",
      transport: "stdio",
      executable: process.execPath,
      argv: [],
      enabled: true,
      credentialSlots: {},
      selectedTools: {},
    });
    for (const id of ["remote", "local"]) {
      const [tool] = await runtime.testSource(id);
      reviewPiMcpTool(id, "read", tool.digest, {
        promoted: false,
        effects: ["bounded-read"],
      });
    }
    const catalog = await runtime.getCatalogForTurn();
    assert.include(
      catalog.tools.find((tool) => tool.sourceId === "remote")!.effects,
      "external-egress",
    );
    assert.includeMembers(
      catalog.tools.find((tool) => tool.sourceId === "local")!.effects,
      ["code-execution", "host-control"],
    );
    await runtime.dispose();
  });

  it("bounds complete results before Gateway projection", function () {
    const text = normalizePiMcpCallResult({
      content: [{ type: "text", text: "answer" }],
      structuredContent: { count: 2 },
    });
    assert.equal(text.status, "completed");
    assert.include(JSON.stringify(text.value), "answer");
    const unsupported = normalizePiMcpCallResult({
      content: [{ type: "audio", data: "AA==", mimeType: "audio/wav" }],
    });
    assert.equal(unsupported.code, "unsupported_result_content");
    assert.notInclude(JSON.stringify(unsupported), "AA==");
    const mixed = normalizePiMcpCallResult({
      content: [
        { type: "text", text: "usable" },
        { type: "audio", data: "AA==", mimeType: "audio/wav" },
      ],
    });
    assert.equal(mixed.status, "completed");
    assert.notInclude(JSON.stringify(mixed), "AA==");
  });

  it("routes the frozen proxy through Gateway evidence and refuses a changed source", async function () {
    let calls = 0;
    const runtime = createPiMcpToolSources({
      openClient: async () => ({
        listTools: async () => ({
          tools: [
            {
              name: "write",
              description: "Write",
              inputSchema: { type: "object", properties: {} },
            },
          ],
        }),
        callTool: async () => {
          calls++;
          return { content: [{ type: "text", text: "ok" }] };
        },
        close: async () => undefined,
      }),
    });
    upsertPiMcpSource({
      id: "gateway",
      label: "Gateway",
      transport: "http",
      url: "https://example.org/mcp",
      enabled: true,
      credentialSlots: {},
      selectedTools: {},
    });
    const [tool] = await runtime.testSource("gateway");
    reviewPiMcpTool("gateway", "write", tool.digest, { promoted: true });
    const catalog = await runtime.getCatalogForTurn();
    const definitions = piMcpGatewayDefinitions(catalog, runtime);
    assert.lengthOf(definitions, 2);
    assert.match(definitions[1].name, /^mcp_[a-f0-9]{24}$/);
    const receipts: string[] = [];
    const turn = await freezePiMcpGatewayTurn(catalog, runtime, {
      owner: { kind: "conversation", ownerId: "mcp-owner" },
      turnId: "mcp-turn",
      definitions: [],
      runtimeCapability: {
        identity: "mcp-test",
        availableCapabilityIds: definitions.map((item) => item.capabilityId),
      },
      policy: {
        mode: "automatic",
        systemAllowedEffects: [
          "bounded-read",
          "external-egress",
          "external-mutation",
        ],
        authorizedEffects: [
          "bounded-read",
          "external-egress",
          "external-mutation",
        ],
        authorizedKeys: ["mcp:gateway"],
        maxCalls: 2,
        maxConcurrent: 1,
        maxCost: 2,
      },
      hooks: {
        recordStarted: async () => {
          receipts.push("started");
        },
        recordReceipt: async () => {
          receipts.push("terminal");
        },
        recordPermission: async () => undefined,
      },
    });
    const result = await turn.executeBatch([
      {
        callId: "one",
        name: "mcp",
        arguments: {
          action: "call",
          sourceId: "gateway",
          name: "write",
          arguments: {},
        },
      },
    ]);
    assert.equal(result.results[0].status, "completed");
    assert.deepEqual(receipts, ["started", "terminal"]);
    assert.equal(calls, 1);
    upsertPiMcpSource({
      ...loadPiMcpSourceRegistry().sources.find(
        (item) => item.id === "gateway",
      )!,
      url: "https://other.example/mcp",
    });
    const stale = await runtime.callTool(
      catalog,
      "gateway",
      "write",
      {},
      new AbortController().signal,
    );
    assert.equal(stale.code, "mcp_source_unavailable");
    assert.equal(calls, 1);
    setPref(
      "piMcpSourceRegistryJson",
      '{"version":1,"sources":[{"id":"broken"}]}',
    );
    assert.lengthOf((await runtime.getCatalogForTurn()).tools, 0);
    assert.equal(
      (
        await runtime.callTool(
          catalog,
          "gateway",
          "write",
          {},
          new AbortController().signal,
        )
      ).code,
      "mcp_source_unavailable",
    );
    await runtime.dispose();
  });
});

describe("Pi MCP stdio transport", function () {
  this.timeout(15_000);
  it("rejects a late startup after the transport was closed", async function () {
    const transport = new PiMcpStdioTransport({
      executable: process.execPath,
      argv: ["-e", "setTimeout(() => {}, 200)"],
      cwd: process.cwd(),
      environment: { PATH: process.env.PATH || "" },
    });
    const starting = transport.start();
    await transport.close();
    const [result] = await Promise.allSettled([starting]);
    assert.equal(result.status, "rejected");
  });
  it("passes JSON-RPC through the protocol-neutral process bridge", async function () {
    const transport = new PiMcpStdioTransport({
      executable: process.execPath,
      argv: [path.resolve("tests/fixtures/pi/mcp-stdio-server.mjs")],
      cwd: process.cwd(),
      environment: { PATH: process.env.PATH || "" },
    });
    const received = new Promise<unknown>((resolve) => {
      transport.onmessage = resolve;
    });
    await transport.start();
    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });
    assert.deepEqual(await received, { jsonrpc: "2.0", id: 1, result: {} });
    await transport.close();
  });
});

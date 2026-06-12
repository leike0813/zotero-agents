import { assert } from "chai";
import {
  configureZoteroMcpServerForTests,
  ensureZoteroMcpServer,
  handleZoteroMcpHttpRequestForTests,
  handleZoteroMcpRequestForTests,
  resetZoteroMcpServerForTests,
} from "../../src/modules/zoteroMcpServer";
import { setPref } from "../../src/utils/prefs";

function parseRawHttpResponse(raw: string) {
  const splitIndex = raw.indexOf("\r\n\r\n");
  const head = splitIndex >= 0 ? raw.slice(0, splitIndex) : raw;
  const body = splitIndex >= 0 ? raw.slice(splitIndex + 4) : "";
  const status = Number(head.match(/^HTTP\/1\.1\s+(\d+)/)?.[1] || 0);
  return {
    status,
    body,
    json: body ? JSON.parse(body) : null,
  };
}

describe("MCP Host Bridge capability mirror", function () {
  beforeEach(function () {
    resetZoteroMcpServerForTests();
    setPref("mcpServer.enabled", true);
  });

  afterEach(function () {
    resetZoteroMcpServerForTests();
    setPref("mcpServer.enabled", true);
  });

  it("lists Host Bridge capability names instead of legacy MCP aliases", async function () {
    const response: any = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: "tools",
      method: "tools/list",
      params: {},
    });

    const names = response.result.tools.map(
      (tool: { name: string }) => tool.name,
    );
    assert.include(names, "context.get_current_view");
    assert.include(names, "library.get_item_detail");
    assert.include(names, "diagnostic.get_status");
    assert.include(names, "topics.list");
    assert.include(names, "topics.get_report");
    assert.include(names, "citation_graph.get_layout");
    assert.include(names, "citation_graph.rank_external_references");
    assert.notInclude(names, "synthesis.list_topics");
    assert.notInclude(names, "get_current_view");
    assert.notInclude(names, "get_item_detail");
  });

  it("dispatches MCP calls through Host Bridge capability handlers", async function () {
    const response: any = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "status",
        method: "tools/call",
        params: {
          name: "diagnostic.get_status",
          arguments: {},
        },
      },
      {
        resolveHostBridgeStatus: () =>
          ({
            status: "running",
            protocol: "host-bridge.v1",
            endpoint: "http://127.0.0.1:26570/bridge/v1",
          }) as any,
      },
    );

    assert.strictEqual(
      response.result.structuredContent.capability,
      "diagnostic.get_status",
    );
    assert.strictEqual(response.result.structuredContent.approval, "none");
    assert.strictEqual(
      response.result.structuredContent.data.status,
      "running",
    );
  });

  it("uses the Host Bridge bearer token for MCP HTTP requests", async function () {
    const token = configureZoteroMcpServerForTests({
      token: "shared-host-bridge-token",
    });
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: "tools",
      method: "tools/list",
      params: {},
    });

    const accepted = parseRawHttpResponse(
      await handleZoteroMcpHttpRequestForTests({
        method: "POST",
        path: "/mcp",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
      }),
    );
    const rejected = parseRawHttpResponse(
      await handleZoteroMcpHttpRequestForTests({
        method: "POST",
        path: "/mcp",
        headers: {
          Authorization: "Bearer wrong-token",
          "Content-Type": "application/json",
        },
        body,
      }),
    );

    assert.strictEqual(accepted.status, 200);
    assert.isArray(accepted.json.result.tools);
    assert.strictEqual(rejected.status, 401);
  });

  it("does not start MCP when the preference is disabled", async function () {
    setPref("mcpServer.enabled", false);

    let error: Error | null = null;
    try {
      await ensureZoteroMcpServer();
    } catch (caught) {
      error = caught as Error;
    }

    assert.match(error?.message || "", /disabled by preference/);
  });
});

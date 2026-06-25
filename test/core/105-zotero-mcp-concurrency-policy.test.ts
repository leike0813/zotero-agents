import { assert } from "chai";
import {
  configureZoteroMcpServerForTests,
  getZoteroMcpServerStatus,
  handleZoteroMcpHttpRequestForTests,
  resetZoteroMcpServerForTests,
} from "../../src/modules/zoteroMcpServer";
import {
  ZOTERO_MCP_TOOL_ADD_ITEM_TAGS,
  ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
  ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS,
  ZOTERO_MCP_TOOL_GET_SELECTED_ITEMS,
  ZOTERO_MCP_TOOL_PREVIEW_MUTATION,
  ZOTERO_MCP_TOOL_SEARCH_ITEMS,
} from "../../src/modules/zoteroMcpProtocol";

function isRealZoteroRuntime() {
  const runtime = globalThis as {
    Zotero?: {
      __parity?: {
        runtime?: string;
      };
    };
  };
  return !!runtime.Zotero && runtime.Zotero.__parity?.runtime !== "node-mock";
}

function parseRawHttpResponse(raw: string) {
  const splitIndex = raw.indexOf("\r\n\r\n");
  const head = splitIndex >= 0 ? raw.slice(0, splitIndex) : raw;
  const body = splitIndex >= 0 ? raw.slice(splitIndex + 4) : "";
  const status = Number(head.match(/^HTTP\/1\.1\s+(\d+)/)?.[1] || 0);
  return {
    status,
    body,
  };
}

function toolCallBody(id: string, name: string, args: Record<string, unknown>) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name,
      arguments: args,
    },
  });
}

function postToolCall(
  token: string,
  id: string,
  name: string,
  args: Record<string, unknown>,
) {
  return handleZoteroMcpHttpRequestForTests({
    method: "POST",
    path: "/mcp",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: toolCallBody(id, name, args),
  });
}

async function createTempItem(title: string) {
  const item = new Zotero.Item("journalArticle");
  item.setField("title", title);
  item.setField("date", "2026-04-27");
  await item.saveTx();
  return item;
}

describe("Zotero MCP concurrency queue policy in Zotero runtime", function () {
  this.timeout(20000);

  afterEach(function () {
    resetZoteroMcpServerForTests();
  });

  it("serializes concurrent read and controlled write tool calls without transport failure", async function () {
    if (!isRealZoteroRuntime()) {
      this.skip();
    }
    const tempItem = await createTempItem("MCP Queue Policy Runtime Probe");
    const token = configureZoteroMcpServerForTests({
      resolveHostContext: () => ({
        target: "library",
        libraryId: String(Zotero.Libraries.userLibraryID || 1),
        selectionEmpty: true,
      }),
      requestToolPermission: () => ({
        outcome: "approved",
      }),
    });

    try {
      const calls = [
        postToolCall(
          token,
          "runtime-current",
          ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
          {},
        ),
        postToolCall(
          token,
          "runtime-selected",
          ZOTERO_MCP_TOOL_GET_SELECTED_ITEMS,
          {},
        ),
        postToolCall(token, "runtime-search", ZOTERO_MCP_TOOL_SEARCH_ITEMS, {
          query: "MCP Queue Policy Runtime Probe",
          limit: 3,
        }),
        postToolCall(
          token,
          "runtime-preview",
          ZOTERO_MCP_TOOL_PREVIEW_MUTATION,
          {
            request: {
              operation: "item.addTags",
              target: {
                id: tempItem.id,
              },
              tags: ["test:mcp-queue-preview"],
            },
          },
        ),
        postToolCall(token, "runtime-write", ZOTERO_MCP_TOOL_ADD_ITEM_TAGS, {
          id: tempItem.id,
          tags: ["test:mcp-queue-write"],
        }),
        postToolCall(
          token,
          "runtime-attachments",
          ZOTERO_MCP_TOOL_GET_ITEM_ATTACHMENTS,
          {
            id: tempItem.id,
          },
        ),
      ];

      const responses = await Promise.all(calls);
      const parsed = responses.map(parseRawHttpResponse);
      assert.deepEqual(
        parsed.map((response) => response.status),
        Array(parsed.length).fill(200),
      );
      for (const response of parsed) {
        assert.doesNotInclude(response.body, "fetch failed");
      }

      const logs = getZoteroMcpServerStatus().recentRequests.filter(
        (entry) => entry.jsonrpcMethod === "tools/call",
      );
      assert.isAtLeast(logs.length, calls.length);
      assert.isAtLeast(
        logs.filter((entry) => entry.queuePosition > 1).length,
        1,
      );
      assert.notInclude(
        logs.map((entry) => entry.limitReason),
        "queue_full",
      );
      assert.notInclude(
        logs.map((entry) => entry.limitReason),
        "queue_timeout",
      );
    } finally {
      await tempItem.eraseTx?.();
    }
  });
});

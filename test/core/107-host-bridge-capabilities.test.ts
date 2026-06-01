import { assert } from "chai";
import {
  configureHostBridgeServerForTests,
  handleHostBridgeHttpRequestForTests,
  resetHostBridgeServerForTests,
} from "../../src/modules/hostBridgeServer";
import {
  configureHostBridgeGlobalApprovalHandlerForTests,
  resetHostBridgePermissionManagerForTests,
} from "../../src/modules/hostBridgePermissionManager";
import { resetHostBridgeWriteAutoApprovalScopesForTests } from "../../src/modules/hostBridgeWriteAutoApprovalRegistry";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  resetAcpSkillRunsForTests,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import {
  handleZoteroMcpRequestForTests,
  resetZoteroMcpServerForTests,
} from "../../src/modules/zoteroMcpServer";
import { ZOTERO_MCP_TOOL_GET_CURRENT_VIEW } from "../../src/modules/zoteroMcpProtocol";

function parseRawHttpResponse(raw: string) {
  const splitIndex = raw.indexOf("\r\n\r\n");
  const head = splitIndex >= 0 ? raw.slice(0, splitIndex) : raw;
  const body = splitIndex >= 0 ? raw.slice(splitIndex + 4) : "";
  const status = Number(head.match(/^HTTP\/1\.1\s+(\d+)/)?.[1] || 0);
  return {
    status,
    body,
    json: JSON.parse(body),
  };
}

async function callBridgeCapability(args: {
  token?: string;
  capability: string;
  input?: unknown;
  scope?: unknown;
}) {
  const headers: Record<string, string> = {};
  if (args.token) {
    headers.authorization = `Bearer ${args.token}`;
  }
  if (args.scope) {
    headers["x-zotero-bridge-scope"] = JSON.stringify(args.scope);
  }
  return parseRawHttpResponse(
    await handleHostBridgeHttpRequestForTests({
      method: "POST",
      path: "/bridge/v1/call",
      headers,
      body: JSON.stringify({
        capability: args.capability,
        input: args.input,
      }),
    }),
  );
}

async function createParentItem(title: string) {
  const item = new Zotero.Item("journalArticle");
  item.setField("title", title);
  item.setField("abstractNote", `${title} abstract`);
  item.setField("date", "2026-05-20");
  if (typeof (item as any).setCreators === "function") {
    (item as any).setCreators([
      {
        firstName: "Grace",
        lastName: "Hopper",
        creatorType: "author",
      },
    ]);
  }
  await item.saveTx();
  return item;
}

describe("host bridge capability calls", function () {
  afterEach(function () {
    resetHostBridgeServerForTests();
    resetHostBridgePermissionManagerForTests();
    resetZoteroMcpServerForTests();
    resetHostBridgeWriteAutoApprovalScopesForTests();
    resetAcpSkillRunsForTests();
    setDebugModeOverrideForTests();
  });

  it("requires bearer auth for capability calls", async function () {
    configureHostBridgeServerForTests({ token: "call-token" });

    const parsed = await callBridgeCapability({
      capability: "context.get_selected_items",
    });

    assert.strictEqual(parsed.status, 401);
    assert.strictEqual(parsed.json.status, "error");
    assert.strictEqual(parsed.json.error.code, "unauthorized");
  });

  it("returns structured errors for unknown capabilities and invalid JSON", async function () {
    const token = configureHostBridgeServerForTests({ token: "call-token" });

    const unknown = await callBridgeCapability({
      token,
      capability: "mutation.unknown",
      input: {},
    });
    assert.strictEqual(unknown.status, 404);
    assert.strictEqual(unknown.json.status, "error");
    assert.strictEqual(unknown.json.error.code, "capability_not_found");

    const invalidJson = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "POST",
        path: "/bridge/v1/call",
        headers: {
          authorization: `Bearer ${token}`,
        },
        body: "{",
      }),
    );
    assert.strictEqual(invalidJson.status, 400);
    assert.strictEqual(invalidJson.json.error.code, "invalid_capability_input");
  });

  it("routes read-only library capabilities through JSON-safe broker DTOs", async function () {
    const token = configureHostBridgeServerForTests({ token: "read-token" });
    const item = await createParentItem("Bridge Broker DTO Paper");

    const parsed = await callBridgeCapability({
      token,
      capability: "library.get_item_detail",
      input: {
        key: item.key,
        libraryId: Zotero.Libraries.userLibraryID,
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.status, "ok");
    assert.strictEqual(
      parsed.json.result.capability,
      "library.get_item_detail",
    );
    assert.strictEqual(parsed.json.result.approval, "none");
    assert.strictEqual(
      parsed.json.result.data.fields.title,
      "Bridge Broker DTO Paper",
    );
    assert.notProperty(parsed.json.result.data, "saveTx");
    assert.notProperty(parsed.json.result.data, "getField");
    assert.doesNotThrow(() => JSON.stringify(parsed.json.result.data));
  });

  it("exposes Synthesis host capabilities through Host Bridge CLI-compatible calls", async function () {
    const token = configureHostBridgeServerForTests({
      token: "synthesis-token",
    });

    const parsed = await callBridgeCapability({
      token,
      capability: "synthesis.get_reference_sidecar_index",
      input: { limit: 1 },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.status, "ok");
    assert.strictEqual(
      parsed.json.result.capability,
      "synthesis.get_reference_sidecar_index",
    );
    assert.strictEqual(parsed.json.result.approval, "none");
    assert.doesNotThrow(() => JSON.stringify(parsed.json.result.data));
    assert.isArray(parsed.json.result.data.diagnostics?.recommended_commands);
    assert.isObject(parsed.json.result.data.diagnostics?.maintenance);
  });

  it("hides debug capabilities when debug mode is disabled", async function () {
    setDebugModeOverrideForTests(false);
    const token = configureHostBridgeServerForTests({
      token: "debug-off-token",
    });

    const manifest = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/manifest",
        headers: {
          authorization: `Bearer ${token}`,
        },
      }),
    );
    const names = manifest.json.result.capabilities.map(
      (capability: { name: string }) => capability.name,
    );
    assert.notInclude(names, "debug.status");

    const call = await callBridgeCapability({
      token,
      capability: "debug.status",
      input: {},
    });
    assert.strictEqual(call.status, 404);
    assert.strictEqual(call.json.error.code, "capability_not_found");
  });

  it("exposes debug capabilities and Synthesis diagnostics when debug mode is enabled", async function () {
    setDebugModeOverrideForTests(true);
    const token = configureHostBridgeServerForTests({
      token: "debug-on-token",
    });

    const status = await callBridgeCapability({
      token,
      capability: "debug.status",
      input: { limit: 5 },
    });
    assert.strictEqual(status.status, 200);
    assert.strictEqual(status.json.result.approval, "none");
    assert.strictEqual(
      status.json.result.data.schema,
      "host_bridge.debug.status.v1",
    );
    assert.isTrue(status.json.result.data.debugMode);

    const snapshot = await callBridgeCapability({
      token,
      capability: "debug.synthesis.snapshot",
      input: { limit: 5, includeUiSnapshot: false },
    });
    assert.strictEqual(snapshot.status, 200);
    assert.strictEqual(
      snapshot.json.result.data.schema,
      "host_bridge.debug.synthesis.snapshot.v1",
    );
    assert.isArray(snapshot.json.result.data.cacheBasis);
    assert.isObject(snapshot.json.result.data.maintenance);
    assert.isObject(snapshot.json.result.data.tableCounts);

    const profiler = await callBridgeCapability({
      token,
      capability: "debug.synthesis.profiler.list",
      input: { limit: 5 },
    });
    assert.strictEqual(profiler.status, 200);
    assert.strictEqual(
      profiler.json.result.data.schema,
      "host_bridge.debug.synthesis.profiler.v1",
    );
    assert.isArray(profiler.json.result.data.runs);
    assert.isArray(profiler.json.result.data.phases);
  });

  it("keeps dangerous debug operations behind Host Bridge approval", async function () {
    setDebugModeOverrideForTests(true);
    const token = configureHostBridgeServerForTests({
      token: "debug-danger-token",
    });
    let approvalCount = 0;
    configureHostBridgeGlobalApprovalHandlerForTests(async () => {
      approvalCount += 1;
      return {
        outcome: "approved",
        requestId: "debug-approval",
        channel: "global",
      };
    });

    const parsed = await callBridgeCapability({
      token,
      capability: "debug.synthesis.cleanInstallReset",
      input: { dryRun: true },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.approval, "zotero-ui-required");
    assert.strictEqual(
      parsed.json.result.data.schema,
      "host_bridge.debug.synthesis.clean_install_reset.v1",
    );
    assert.strictEqual(approvalCount, 1);
  });

  it("allows mutation preview without executing a write", async function () {
    const token = configureHostBridgeServerForTests({ token: "preview-token" });
    const item = await createParentItem("Bridge Preview Before");

    const parsed = await callBridgeCapability({
      token,
      capability: "mutation.preview",
      input: {
        operation: "item.updateFields",
        target: item.id,
        fields: {
          title: "Bridge Preview After",
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.approval, "none");
    assert.isTrue(parsed.json.result.data.ok);
    assert.strictEqual(item.getField("title"), "Bridge Preview Before");
  });

  it("previews single-paper literature ingest mutation", async function () {
    const token = configureHostBridgeServerForTests({ token: "ingest-token" });

    const canonical = await callBridgeCapability({
      token,
      capability: "mutation.preview",
      input: {
        operation: "literature.ingest",
        paper: {
          title: "Bridge Literature Ingest",
        },
      },
    });
    assert.strictEqual(canonical.status, 200);
    assert.isTrue(canonical.json.result.data.ok);
    assert.strictEqual(
      canonical.json.result.data.operation,
      "literature.ingest",
    );
    assert.include(canonical.json.result.data.summary, "one paper");
  });

  it("rejects legacy and batch literature ingest mutation inputs", async function () {
    const token = configureHostBridgeServerForTests({ token: "ingest-token" });

    const legacy = await callBridgeCapability({
      token,
      capability: "mutation.preview",
      input: {
        operation: "paper.ingest",
        paper: {
          title: "Bridge Legacy Paper Ingest",
        },
      },
    });
    assert.strictEqual(legacy.status, 200);
    assert.isFalse(legacy.json.result.data.ok);
    assert.match(
      legacy.json.result.data.error.message,
      /Unsupported mutation operation/,
    );

    const batch = await callBridgeCapability({
      token,
      capability: "mutation.preview",
      input: {
        operation: "literature.ingest",
        papers: [
          {
            title: "Bridge Batch Paper One",
          },
          {
            title: "Bridge Batch Paper Two",
          },
        ],
      },
    });
    assert.strictEqual(batch.status, 200);
    assert.isFalse(batch.json.result.data.ok);
    assert.match(batch.json.result.data.error.message, /single paper field/);
  });

  it("requires approval before executing mutation capabilities", async function () {
    const token = configureHostBridgeServerForTests({ token: "execute-token" });
    const item = await createParentItem("Bridge Execute Before");

    let approvalRequest: any = null;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      approvalRequest = request;
      return {
        outcome: "approved",
        requestId: request.requestId,
        channel: "global",
      };
    });

    const parsed = await callBridgeCapability({
      token,
      capability: "mutation.execute",
      input: {
        operation: "item.updateFields",
        target: item.id,
        fields: {
          title: "Bridge Execute After",
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.approval, "zotero-ui-required");
    assert.isTrue(parsed.json.result.data.ok);
    assert.strictEqual(item.getField("title"), "Bridge Execute After");
    assert.include(approvalRequest.title, "Zotero item update");
    assert.include(approvalRequest.summary, "Update");
    assert.include(approvalRequest.summary, "field");
    assert.include(approvalRequest.detail, "Fields: title");
    assert.notInclude(approvalRequest.detail, '"operation"');
    assert.notInclude(approvalRequest.detail, "{");
  });

  it("auto-approves mutation execute only for registered ACP run write scopes", async function () {
    const token = configureHostBridgeServerForTests({ token: "execute-token" });
    const item = await createParentItem("Bridge Auto Approve Before");
    const scope = {
      kind: "acp-skill-run",
      requestId: "auto-approve-run",
      runId: "auto-approve-run",
      autoApproveWrites: true,
    };
    upsertAcpSkillRun({
      requestId: "auto-approve-run",
      runId: "auto-approve-run",
      hostBridgeCli: {
        available: true,
        pathInjected: true,
        autoApproveWrites: true,
      },
    });
    let approvalRequest: any = null;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      approvalRequest = request;
      return {
        outcome: "approved",
        requestId: request.requestId,
        channel: "global",
      };
    });

    const parsed = await callBridgeCapability({
      token,
      scope,
      capability: "mutation.execute",
      input: {
        operation: "item.updateFields",
        target: item.id,
        fields: {
          title: "Bridge Auto Approve After",
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.approval, "auto-approved");
    assert.isNull(approvalRequest);
    assert.strictEqual(item.getField("title"), "Bridge Auto Approve After");
  });

  it("does not trust unregistered auto-approve scope headers", async function () {
    const token = configureHostBridgeServerForTests({ token: "execute-token" });
    const item = await createParentItem("Bridge Forged Scope Before");
    let approvalRequest: any = null;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      approvalRequest = request;
      return {
        outcome: "approved",
        requestId: request.requestId,
        channel: "global",
      };
    });

    const parsed = await callBridgeCapability({
      token,
      scope: {
        kind: "global",
        requestId: "forged-run",
        runId: "forged-run",
        autoApproveWrites: true,
      },
      capability: "mutation.execute",
      input: {
        operation: "item.updateFields",
        target: item.id,
        fields: {
          title: "Bridge Forged Scope After",
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.approval, "zotero-ui-required");
    assert.isOk(approvalRequest);
    assert.strictEqual(item.getField("title"), "Bridge Forged Scope After");
  });

  it("uses human literature ingest approval text", async function () {
    const token = configureHostBridgeServerForTests({ token: "execute-token" });
    let approvalRequest: any = null;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      approvalRequest = request;
      return {
        outcome: "approved",
        requestId: request.requestId,
        channel: "global",
      };
    });

    const parsed = await callBridgeCapability({
      token,
      capability: "mutation.execute",
      input: {
        operation: "literature.ingest",
        paper: {
          title: "Bridge Ingest Approval",
          doi: "10.5555/bridge.approval",
          pdfUrl: "https://example.test/bridge.pdf",
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.approval, "zotero-ui-required");
    assert.isTrue(parsed.json.result.data.ok);
    assert.strictEqual(parsed.json.result.data.operation, "literature.ingest");
    assert.include(approvalRequest.title, "Zotero literature ingest");
    assert.include(approvalRequest.summary, "Ingest one literature paper");
    assert.include(approvalRequest.detail, "Paper: Bridge Ingest Approval");
    assert.include(approvalRequest.detail, "DOI: 10.5555/bridge.approval");
    assert.include(approvalRequest.detail, "PDF: best-effort");
    assert.notInclude(approvalRequest.detail, "Papers:");
    assert.notInclude(approvalRequest.summary, "paper(s)");
    assert.notInclude(approvalRequest.detail, '"operation"');
  });

  it("does not request approval for batch literature ingest execute input", async function () {
    const token = configureHostBridgeServerForTests({ token: "execute-token" });
    let approvalRequest: any = null;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      approvalRequest = request;
      return {
        outcome: "approved",
        requestId: request.requestId,
        channel: "global",
      };
    });

    const parsed = await callBridgeCapability({
      token,
      capability: "mutation.execute",
      input: {
        operation: "literature.ingest",
        papers: [
          {
            title: "Bridge Batch Execute",
          },
        ],
      },
    });

    assert.strictEqual(parsed.status, 500);
    assert.isNull(approvalRequest);
    assert.include(parsed.json.error.message, "Host Bridge capability failed");
  });

  it("summarizes tag mutation approvals for people instead of dumping JSON", async function () {
    const token = configureHostBridgeServerForTests({ token: "execute-token" });
    const item = await createParentItem("Bridge Tag Approval");
    let approvalRequest: any = null;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      approvalRequest = request;
      return {
        outcome: "approved",
        requestId: request.requestId,
        channel: "global",
      };
    });

    const parsed = await callBridgeCapability({
      token,
      capability: "mutation.execute",
      input: {
        operation: "item.addTags",
        target: item.id,
        tags: ["approval-readable"],
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.isTrue(parsed.json.result.data.ok);
    assert.include(approvalRequest.title, "Zotero tag change");
    assert.include(approvalRequest.summary, "Add");
    assert.include(approvalRequest.summary, "tag");
    assert.include(approvalRequest.summary, "Zotero item");
    assert.include(approvalRequest.detail, "Tags: approval-readable");
    assert.notInclude(approvalRequest.detail, '"operation"');
    assert.notInclude(approvalRequest.detail, "{");
  });

  it("keeps MCP tools as compatibility adapters over broker capabilities", async function () {
    const item = await createParentItem("Bridge MCP Compatibility");
    const previousGetMainWindow = (Zotero as any).getMainWindow;
    (Zotero as any).getMainWindow = () => ({
      ZoteroPane: {
        getSelectedItems: () => [item],
        getSelectedLibraryID: () => Zotero.Libraries.userLibraryID,
      },
      Zotero_Tabs: {
        selectedID: "",
      },
    });

    try {
      const response = await handleZoteroMcpRequestForTests({
        jsonrpc: "2.0",
        id: "current-view",
        method: "tools/call",
        params: {
          name: ZOTERO_MCP_TOOL_GET_CURRENT_VIEW,
          arguments: {},
        },
      });

      const structured = (response as any).result.structuredContent;
      assert.strictEqual(
        structured.hostContext.currentItem.title,
        "Bridge MCP Compatibility",
      );
      assert.lengthOf(structured.hostContext.selectedItems, 1);
    } finally {
      (Zotero as any).getMainWindow = previousGetMainWindow;
    }
  });
});

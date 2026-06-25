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
  configureZoteroMcpServerForTests,
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
    json: JSON.parse(body),
  };
}

function rawHttpRequestBytes(args: {
  method: string;
  path: string;
  headers?: Record<string, string>;
  bodyBytes?: Uint8Array;
}) {
  const bodyBytes = args.bodyBytes || new Uint8Array();
  const headers = {
    "Content-Length": String(bodyBytes.byteLength),
    ...(args.headers || {}),
  };
  const head = [
    `${args.method} ${args.path} HTTP/1.1`,
    ...Object.entries(headers).map(([name, value]) => `${name}: ${value}`),
    "",
    "",
  ].join("\r\n");
  return new Uint8Array(
    Buffer.concat([Buffer.from(head, "latin1"), Buffer.from(bodyBytes)]),
  );
}

async function callBridgeCapability(args: {
  token?: string;
  capability: string;
  input?: unknown;
  scope?: unknown;
  connectionMode?: "local" | "remote";
}) {
  const headers: Record<string, string> = {};
  if (args.token) {
    headers.authorization = `Bearer ${args.token}`;
  }
  if (args.scope) {
    headers["x-zotero-bridge-scope"] = JSON.stringify(args.scope);
  }
  if (args.connectionMode) {
    headers["x-zotero-bridge-connection-mode"] = args.connectionMode;
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

async function callBridgeCapabilityRaw(args: {
  token: string;
  capability: string;
  input?: unknown;
}) {
  const body = JSON.stringify({
    capability: args.capability,
    input: args.input,
  });
  return parseRawHttpResponse(
    await handleHostBridgeHttpRequestForTests({
      method: "POST",
      path: "/bridge/v1/call",
      rawRequestBytes: rawHttpRequestBytes({
        method: "POST",
        path: "/bridge/v1/call",
        headers: {
          Authorization: `Bearer ${args.token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        bodyBytes: Buffer.from(body, "utf8"),
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
    setPref("hostBridgeDisableWriteApproval", false);
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

  it("passes connection mode headers into synthesis capability context", async function () {
    const token = configureHostBridgeServerForTests({
      token: "mode-token",
      resolveSynthesisService: () => ({
        getTopicContext(_args, context) {
          return {
            connectionMode: context?.hostBridge?.connectionMode,
          };
        },
      }),
    });

    const parsed = await callBridgeCapability({
      token,
      capability: "topics.get_context",
      input: { topicId: "object-detection" },
      connectionMode: "remote",
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.data.connectionMode, "remote");
  });

  it("decodes UTF-8 byte-counted capability bodies without mojibake", async function () {
    const token = configureHostBridgeServerForTests({
      token: "utf8-call-token",
    });
    await createParentItem("桥接中文🚀 Paper");

    const parsed = await callBridgeCapabilityRaw({
      token,
      capability: "library.search_items",
      input: {
        libraryId: Zotero.Libraries.userLibraryID,
        query: "桥接中文🚀",
        limit: 3,
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.status, "ok");
    const titles = parsed.json.result.data.map(
      (entry: { title?: string }) => entry.title,
    );
    assert.include(titles, "桥接中文🚀 Paper");
  });

  it("exposes Synthesis host capabilities through Host Bridge CLI-compatible calls", async function () {
    const token = configureHostBridgeServerForTests({
      token: "synthesis-token",
    });

    const parsed = await callBridgeCapability({
      token,
      capability: "reference_index.get",
      input: { limit: 1 },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.status, "ok");
    assert.strictEqual(parsed.json.result.capability, "reference_index.get");
    assert.strictEqual(parsed.json.result.approval, "none");
    assert.doesNotThrow(() => JSON.stringify(parsed.json.result.data));
    assert.isArray(parsed.json.result.data.diagnostics?.recommended_commands);
    assert.isObject(parsed.json.result.data.diagnostics?.maintenance);

    const manifest = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/manifest",
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    const metricsRefresh = manifest.json.result.capabilities.find(
      (entry: { name?: string }) =>
        entry.name === "citation_graph.refresh_metrics",
    );
    const topicReport = manifest.json.result.capabilities.find(
      (entry: { name?: string }) => entry.name === "topics.get_report",
    );
    const topicsByPaperRef = manifest.json.result.capabilities.find(
      (entry: { name?: string }) => entry.name === "topics.find_by_paper_ref",
    );
    const graphLayout = manifest.json.result.capabilities.find(
      (entry: { name?: string }) => entry.name === "citation_graph.get_layout",
    );
    assert.isOk(metricsRefresh);
    assert.isOk(topicReport);
    assert.isOk(topicsByPaperRef);
    assert.isOk(graphLayout);
    assert.strictEqual(metricsRefresh.approval, "zotero-ui-required");
    assert.strictEqual(topicReport.approval, "none");
    assert.strictEqual(topicsByPaperRef.approval, "none");
    assert.strictEqual(graphLayout.approval, "none");
  });

  it("reports canonical resolve-resolver input contract errors", async function () {
    const token = configureHostBridgeServerForTests({
      token: "resolver-contract-token",
    });

    const missing = await callBridgeCapability({
      token,
      capability: "resolvers.resolve",
      input: {},
    });
    assert.strictEqual(missing.status, 200);
    assert.isFalse(missing.json.result.data.ok);
    assert.include(
      missing.json.result.data.errors,
      "$ must include at least one of tag, collection_key, or paper_refs",
    );

    const legacy = await callBridgeCapability({
      token,
      capability: "resolvers.resolve",
      input: {
        resolver: {
          mode: "tag_query",
          query: "vision",
        },
        mode: "tag_query",
        query: "vision",
      },
    });
    assert.strictEqual(legacy.status, 200);
    assert.isFalse(legacy.json.result.data.ok);
    assert.include(
      legacy.json.result.data.errors.join("\n"),
      "$.resolver is not allowed",
    );
    assert.include(legacy.json.result.data.errors.join("\n"), "$.mode");
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
    assert.notInclude(names, "debug.skillrunner.connections.snapshot");
    assert.notInclude(names, "debug.zotero.eval");

    const call = await callBridgeCapability({
      token,
      capability: "debug.zotero.eval",
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

    const manifest = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/manifest",
        headers: {
          authorization: `Bearer ${token}`,
        },
      }),
    );
    const reapplyCapability = manifest.json.result.capabilities.find(
      (capability: { name: string }) =>
        capability.name === "debug.acpSkillRun.reapplyResult",
    );
    assert.isObject(reapplyCapability);
    assert.strictEqual(reapplyCapability.approval, "none");
    const evalCapability = manifest.json.result.capabilities.find(
      (capability: { name: string }) => capability.name === "debug.zotero.eval",
    );
    assert.isObject(evalCapability);
    assert.strictEqual(evalCapability.approval, "zotero-ui-required");
    const connectionAuditCapability = manifest.json.result.capabilities.find(
      (capability: { name: string }) =>
        capability.name === "debug.skillrunner.connections.snapshot",
    );
    assert.isObject(connectionAuditCapability);
    assert.strictEqual(connectionAuditCapability.approval, "none");

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

    const connections = await callBridgeCapability({
      token,
      capability: "debug.skillrunner.connections.snapshot",
      input: {},
    });
    assert.strictEqual(connections.status, 200);
    assert.strictEqual(
      connections.json.result.data.schema,
      "host_bridge.debug.skillrunner.connections.snapshot.v1",
    );
    assert.isObject(connections.json.result.data.skillRunnerConnections);
    assert.isArray(connections.json.result.data.skillRunnerConnections.events);

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

  it("executes Zotero debug eval only after approval", async function () {
    setDebugModeOverrideForTests(true);
    const token = configureHostBridgeServerForTests({
      token: "debug-zotero-eval-token",
    });
    const runtime = globalThis as { Zotero: Record<string, unknown> };
    const zotero = runtime.Zotero;
    zotero.__debugEvalProbe = 0;
    configureHostBridgeGlobalApprovalHandlerForTests(async () => ({
      outcome: "denied",
      requestId: "debug-zotero-eval-denied",
      channel: "global",
      reason: "Denied for test.",
    }));

    const denied = await callBridgeCapability({
      token,
      capability: "debug.zotero.eval",
      input: {
        code: "Zotero.__debugEvalProbe = 1; return Zotero.__debugEvalProbe;",
      },
    });

    assert.strictEqual(denied.status, 403);
    assert.strictEqual(denied.json.error.code, "permission_denied");
    assert.strictEqual(zotero.__debugEvalProbe, 0);

    configureHostBridgeGlobalApprovalHandlerForTests(async () => ({
      outcome: "approved",
      requestId: "debug-zotero-eval-approved",
      channel: "global",
    }));
    const approved = await callBridgeCapability({
      token,
      capability: "debug.zotero.eval",
      input: {
        input: { increment: 2 },
        code: [
          "Zotero.__debugEvalProbe += input.increment;",
          "return { value: Zotero.__debugEvalProbe, api: !!Zotero.Items };",
        ].join("\n"),
      },
    });

    assert.strictEqual(approved.status, 200);
    assert.strictEqual(approved.json.result.approval, "zotero-ui-required");
    assert.strictEqual(
      approved.json.result.data.schema,
      "host_bridge.debug.zotero.eval.v1",
    );
    assert.strictEqual(approved.json.result.data.result.value, 2);
    assert.strictEqual(approved.json.result.data.result.api, true);
    assert.strictEqual(approved.json.result.data.resultType, "object");
  });

  it("returns JSON-safe truncated Zotero debug eval values", async function () {
    setDebugModeOverrideForTests(true);
    const token = configureHostBridgeServerForTests({
      token: "debug-zotero-eval-safe-token",
    });
    configureHostBridgeGlobalApprovalHandlerForTests(async () => ({
      outcome: "approved",
      requestId: "debug-zotero-eval-safe",
      channel: "global",
    }));

    const parsed = await callBridgeCapability({
      token,
      capability: "debug.zotero.eval",
      input: {
        maxDepth: 3,
        maxItems: 4,
        maxChars: 10000,
        code: [
          "const target = { long: 'x'.repeat(5000), fn() {}, nested: { value: 1 } };",
          "target.self = target;",
          "return { target, list: [1, 2, 3, 4, 5], missing: undefined, sym: Symbol('s') };",
        ].join("\n"),
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.isTrue(parsed.json.result.data.truncated);
    assert.strictEqual(
      parsed.json.result.data.result.target.self,
      "[Circular]",
    );
    assert.include(parsed.json.result.data.result.target.long, "[truncated]");
    assert.include(parsed.json.result.data.result.target.fn, "[Function");
    assert.strictEqual(
      parsed.json.result.data.result.list[4],
      "[1 more item(s)]",
    );
    assert.strictEqual(parsed.json.result.data.result.missing, "[Undefined]");
    assert.strictEqual(parsed.json.result.data.result.sym, "Symbol(s)");
  });

  it("reports Zotero debug eval failures as capability failures", async function () {
    setDebugModeOverrideForTests(true);
    const token = configureHostBridgeServerForTests({
      token: "debug-zotero-eval-error-token",
    });
    configureHostBridgeGlobalApprovalHandlerForTests(async () => ({
      outcome: "approved",
      requestId: "debug-zotero-eval-error",
      channel: "global",
    }));

    const parsed = await callBridgeCapability({
      token,
      capability: "debug.zotero.eval",
      input: {
        code: "throw new Error('eval exploded for test');",
      },
    });

    assert.strictEqual(parsed.status, 500);
    assert.strictEqual(parsed.json.error.code, "capability_failed");
    assert.include(parsed.json.error.details.message, "eval exploded for test");
  });

  it("uses a bounded approval prompt for Zotero debug eval", async function () {
    setDebugModeOverrideForTests(true);
    const token = configureHostBridgeServerForTests({
      token: "debug-zotero-eval-prompt-token",
    });
    let approvalRequest: any = null;
    configureHostBridgeGlobalApprovalHandlerForTests(async (request) => {
      approvalRequest = request;
      return {
        outcome: "approved",
        requestId: "debug-zotero-eval-prompt",
        channel: "global",
      };
    });
    const longCode = `return "${"x".repeat(2000)}";`;

    const parsed = await callBridgeCapability({
      token,
      capability: "debug.zotero.eval",
      input: {
        code: longCode,
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.include(approvalRequest.title, "Zotero debug eval");
    assert.include(approvalRequest.detail, "Capability: debug.zotero.eval");
    assert.include(approvalRequest.detail, "Code preview:");
    assert.include(approvalRequest.detail, "[truncated]");
    assert.isBelow(approvalRequest.detail.length, 800);
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

  it("can disable Host Bridge write approvals from the preference switch", async function () {
    setPref("hostBridgeDisableWriteApproval", true);
    const token = configureHostBridgeServerForTests({
      token: "execute-no-approval-token",
    });
    const item = await createParentItem("Bridge No Approval Before");
    let approvalRequest: any = null;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      approvalRequest = request;
      return {
        outcome: "denied",
        requestId: request.requestId,
        channel: "global",
      };
    });

    const manifest = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v1/manifest",
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    const mutationExecute = manifest.json.result.capabilities.find(
      (entry: { name?: string }) => entry.name === "mutation.execute",
    );
    assert.strictEqual(mutationExecute.approval, "none");

    const parsed = await callBridgeCapability({
      token,
      capability: "mutation.execute",
      input: {
        operation: "item.updateFields",
        target: item.id,
        fields: {
          title: "Bridge No Approval After",
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.approval, "none");
    assert.isTrue(parsed.json.result.data.ok);
    assert.isNull(approvalRequest);
    assert.strictEqual(item.getField("title"), "Bridge No Approval After");
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

  it("mirrors Host Bridge capability names through MCP tools", async function () {
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
          name: "context.get_current_view",
          arguments: {},
        },
      });

      const structured = (response as any).result.structuredContent;
      assert.strictEqual(structured.capability, "context.get_current_view");
      assert.strictEqual(structured.approval, "none");
      assert.strictEqual(
        structured.data.currentItem.title,
        "Bridge MCP Compatibility",
      );
      assert.lengthOf(structured.data.selectedItems, 1);
    } finally {
      (Zotero as any).getMainWindow = previousGetMainWindow;
    }
  });

  it("decodes Zotero MCP JSON-RPC bodies as UTF-8 bytes", async function () {
    const token = configureZoteroMcpServerForTests({
      token: "mcp-utf8-token",
    });
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: "请求🚀",
      method: "tools/list",
      params: {},
    });

    const parsed = parseRawHttpResponse(
      await handleZoteroMcpHttpRequestForTests({
        method: "POST",
        path: "/mcp",
        rawRequestBytes: rawHttpRequestBytes({
          method: "POST",
          path: "/mcp",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8",
          },
          bodyBytes: Buffer.from(body, "utf8"),
        }),
      }),
    );

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.id, "请求🚀");
    assert.isArray(parsed.json.result.tools);
  });

  it("rejects malformed UTF-8 Zotero MCP JSON-RPC bodies", async function () {
    const token = configureZoteroMcpServerForTests({
      token: "mcp-invalid-utf8-token",
    });

    const parsed = parseRawHttpResponse(
      await handleZoteroMcpHttpRequestForTests({
        method: "POST",
        path: "/mcp",
        rawRequestBytes: rawHttpRequestBytes({
          method: "POST",
          path: "/mcp",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8",
          },
          bodyBytes: new Uint8Array([0x7b, 0xff, 0x7d]),
        }),
      }),
    );

    assert.strictEqual(parsed.status, 400);
    assert.strictEqual(parsed.json.error, "bad_request");
    assert.strictEqual(parsed.json.reason, "invalid_utf8_body");
  });
});

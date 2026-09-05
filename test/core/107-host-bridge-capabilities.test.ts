import { assert } from "chai";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import {
  configureHostBridgeServerForTests,
  handleHostBridgeHttpRequestForTests,
  resetHostBridgeServerForTests,
} from "../../src/modules/hostBridgeServer";
import {
  configureHostBridgeGlobalApprovalHandlerForTests,
  getHostBridgePermissionProjection,
  resetHostBridgePermissionManagerForTests,
} from "../../src/modules/hostBridgePermissionManager";
import {
  issueHostBridgeWriteAutoApprovalGrant,
  isHostBridgeWriteAutoApprovalScope,
  revokeHostBridgeWriteAutoApprovalGrant,
  resetHostBridgeWriteAutoApprovalScopesForTests,
} from "../../src/modules/hostBridgeWriteAutoApprovalRegistry";
import {
  setDebugModeOverrideForTests,
  setSkillRunnerConnectionAuditSourceOverrideForTests,
} from "../../src/modules/debugMode";
import {
  executeHostBridgeCapability,
  listHostBridgeCapabilities,
} from "../../src/modules/hostBridgeCapabilityRegistry";
import { createFailClosedZoteroHostCapabilityBroker } from "../helpers/zoteroHostCapabilityBrokerHarness";
import type { HostBridgeStatusSnapshot } from "../../src/modules/hostBridgeProtocol";
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
import { createSynthesisClientFromPort } from "../../src/modules/synthesisClient/clientPortAdapter";
import {
  resetZoteroLibrarySourcePageQueryAdapterForTests,
  resetZoteroLibraryPageQueryAdapterForTests,
  setZoteroLibrarySourcePageQueryAdapterForTests,
  setZoteroLibraryPageQueryAdapterForTests,
  type ZoteroLibrarySourcePageQueryAdapter,
} from "../../src/modules/zoteroLibraryPageQuery";
import { createMockZoteroLibraryPageQueryAdapter } from "../helpers/zoteroLibraryPageQueryAdapter";
import { runtimeHttpResponseInternalsForTests } from "../../src/modules/runtimeHttpResponse";
import { createProductStorageApi } from "../../src/modules/workflowProductStore";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";

const CONTRACT_HASH = `sha256:${"a".repeat(64)}`;

function createMockZoteroSourcePageQueryAdapter(): ZoteroLibrarySourcePageQueryAdapter {
  return {
    async queryAsync(_sql, _params, context) {
      const items = (await (Zotero.Items as any).getAll(
        context.criteria.libraryId,
      )) as Zotero.Item[];
      const parentItemId = Number(context.criteria.parentItemId);
      const matching = items
        .filter((item) => {
          const itemParentId = Number(
            (item as any).parentItemID || (item as any).parentID || 0,
          );
          const matchesDomain =
            context.domain === "notes"
              ? item.isNote?.()
              : context.domain === "attachments"
                ? item.isAttachment?.()
                : false;
          return (
            Number((item as any).libraryID) === context.criteria.libraryId &&
            itemParentId === parentItemId &&
            Boolean(matchesDomain)
          );
        })
        .sort(
          (left, right) => Number((left as any).id) - Number((right as any).id),
        );
      if (context.kind === "count") {
        return [{ total: matching.length }];
      }
      const afterId = Number((context.position as any).id || 0);
      return matching
        .filter((item) => Number((item as any).id) > afterId)
        .slice(0, context.limitPlusOne)
        .map((item) => ({ itemID: (item as any).id }));
    },
    async hydrateItems(ids) {
      return (await (Zotero.Items as any).getAsync(ids)) as Zotero.Item[];
    },
  };
}

describe("canonical Host read projection", function () {
  it("passes the request control into library snapshot reads", async function () {
    const control = {};
    const snapshot = {
      schema: "zotero-agents.library-full-index.v1",
      snapshotId: "snapshot-test",
      libraryId: 1,
      scope: "top-level-regular",
      order: "stable_identity",
      batchSize: 1,
      batchIndex: 0,
      items: [],
      nextCursor: "cursor-test",
      hasMore: true,
      returned: 0,
      deliveredItems: 0,
      deliveredBatches: 0,
      outcome: "active",
    };
    const broker = createFailClosedZoteroHostCapabilityBroker({
      library: {
        async syncSnapshot(args, scope, receivedControl) {
          assert.deepEqual(args, { libraryId: 1, batchSize: 1 });
          assert.deepEqual(scope, { ownerId: "host-bridge:remote" });
          assert.strictEqual(receivedControl, control);
          return snapshot;
        },
      },
    });
    const result = await executeHostBridgeCapability(
      "library.sync_snapshot",
      { libraryId: 1, batchSize: 1 },
      {
        getStatus: (): HostBridgeStatusSnapshot => {
          throw new Error("status is not part of a snapshot read");
        },
        connectionMode: "remote",
        control,
        resolveZoteroHostCapabilityBroker: () => broker,
      },
    );
    assert.deepEqual(result, snapshot);
  });

  it("preserves an empty payload scan continuation and trusted control", async function () {
    const control = {};
    const page = {
      payloads: [],
      returned: 0,
      scanned: 2,
      total: null,
      limit: 2,
      hasMore: true,
      nextCursor: "opaque-payload-continuation",
    };
    const broker = createFailClosedZoteroHostCapabilityBroker({
      library: {
        async listNotePayloads(ref, request, receivedControl) {
          assert.deepEqual(ref, { libraryId: 1, key: "NOTE0001" });
          assert.deepEqual(request, { limit: 2 });
          assert.strictEqual(receivedControl, control);
          return page;
        },
      },
    });
    const result = await executeHostBridgeCapability(
      "library.list_note_payloads",
      { libraryId: 1, key: "NOTE0001", limit: 2 },
      {
        getStatus: (): HostBridgeStatusSnapshot => {
          throw new Error("status is not part of a payload read");
        },
        connectionMode: "remote",
        control,
        resolveZoteroHostCapabilityBroker: () => broker,
      },
    );
    assert.deepEqual(result, page);
  });

  it("advertises Saved Search discovery with a closed bounded request", function () {
    const capability = listHostBridgeCapabilities().find(
      (entry) => entry.name === "library.list_saved_searches",
    );
    assert.isDefined(capability);
    assert.strictEqual(capability?.inputSchema.additionalProperties, false);
    assert.deepInclude(capability?.inputSchema.properties?.limit, {
      maximum: 100,
    });
  });
});

function maintenanceOperation(operationId: string, status = "pending") {
  return {
    schema: "synthesis.maintenance_operation.v1",
    operation_id: operationId,
    status,
  };
}

function emptyReferenceIndex(limit = 1) {
  return {
    rows: [],
    cursor: "",
    next_cursor: "",
    has_more: false,
    returned: 0,
    total: 0,
    limit,
    diagnostics: {
      cache_found: false,
      storage: "sqlite",
      stale: false,
      warnings: [],
      recommended_commands: [],
      repository_basis_hash: CONTRACT_HASH,
      canonical_basis_hash: CONTRACT_HASH,
    },
  };
}

function emptyCitationOverview() {
  return {
    schema_id: "synthesis.unified_citation_graph",
    schema_version: "1.0.0",
    graph_hash: CONTRACT_HASH,
    nodes: [],
    edges: [],
    hover_only_nodes: [],
    hover_only_edges: [],
    summary: {
      semantic_slice: "library_and_shared_external",
      displayed_node_count: 0,
      displayed_edge_count: 0,
      hover_only_node_count: 0,
      hover_only_edge_count: 0,
    },
    pagination: { cursor: "", nextCursor: "", hasMore: false },
    diagnostics: { storage: "sqlite", bounded: true, truncated: false },
    page: {
      hasMore: false,
      totalNodes: 0,
      totalEdges: 0,
      totalHoverNodes: 0,
      totalHoverEdges: 0,
      returnedNodes: 0,
      returnedEdges: 0,
      returnedHoverNodes: 0,
      returnedHoverEdges: 0,
      querySignature: CONTRACT_HASH,
      layoutStatus: "missing",
      windowStatus: "complete",
      roleOptions: [],
      responseBudgetBytes: 0,
    },
  };
}

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
  peerHost?: string;
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
      path: "/bridge/v2/call",
      headers,
      body: JSON.stringify({
        capability: args.capability,
        input: args.input,
      }),
      peerHost: args.peerHost,
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
      path: "/bridge/v2/call",
      rawRequestBytes: rawHttpRequestBytes({
        method: "POST",
        path: "/bridge/v2/call",
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

async function createAttachment(
  parent: Zotero.Item,
  filePath: string,
  options: { contentType?: string } = {},
) {
  const item = new Zotero.Item("attachment") as Zotero.Item & {
    attachmentContentType?: string;
    attachmentFilename?: string;
    setFilePath?: (path: string) => void;
  };
  item.parentID = parent.id;
  item.attachmentContentType = options.contentType || "";
  item.setFilePath?.(filePath);
  item.attachmentFilename = filePath.split(/[\\/]+/).pop() || "";
  await item.saveTx();
  return item;
}

async function createNote(parent: Zotero.Item, title: string, html: string) {
  const item = new Zotero.Item("note");
  item.parentID = parent.id;
  item.setField("title", title);
  item.setNote(html);
  await item.saveTx();
  return item;
}

describe("host bridge capability calls", function () {
  it("imports the capability registry with production diagnostic defines", async function () {
    this.timeout(10_000);
    const bundleRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "host-bridge-registry-production-"),
    );
    const bundlePath = path.join(bundleRoot, "registry.mjs");

    try {
      await build({
        entryPoints: ["src/modules/hostBridgeCapabilityRegistry.ts"],
        bundle: true,
        minifySyntax: true,
        treeShaking: true,
        write: true,
        outfile: bundlePath,
        target: "node18",
        platform: "node",
        format: "esm",
        define: {
          __debug_mode__: "false",
          __acp_runtime_performance_profiler_enabled__: "false",
          __acp_runtime_semantic_trace_recorder_enabled__: "false",
          __acp_runtime_replay_profiler_enabled__: "false",
          __skillrunner_connection_audit_enabled__: "false",
          __env__: '"test"',
        },
        logLevel: "silent",
      });

      const registry = await import(
        `${pathToFileURL(bundlePath).href}?test=${Date.now()}`
      );
      assert.isFunction(registry.listHostBridgeCapabilities);
      assert.isArray(registry.listHostBridgeCapabilities());
    } finally {
      await fs.rm(bundleRoot, { recursive: true, force: true });
    }
  });

  beforeEach(function () {
    setZoteroLibraryPageQueryAdapterForTests(
      createMockZoteroLibraryPageQueryAdapter(),
    );
    setZoteroLibrarySourcePageQueryAdapterForTests(
      createMockZoteroSourcePageQueryAdapter(),
    );
  });

  afterEach(function () {
    resetZoteroLibraryPageQueryAdapterForTests();
    resetZoteroLibrarySourcePageQueryAdapterForTests();
    resetHostBridgeServerForTests();
    resetHostBridgePermissionManagerForTests();
    resetZoteroMcpServerForTests();
    resetHostBridgeWriteAutoApprovalScopesForTests();
    resetAcpSkillRunsForTests();
    setDebugModeOverrideForTests();
    setSkillRunnerConnectionAuditSourceOverrideForTests();
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
        path: "/bridge/v2/call",
        headers: {
          authorization: `Bearer ${token}`,
        },
        body: "{",
      }),
    );
    assert.strictEqual(invalidJson.status, 400);
    assert.strictEqual(invalidJson.json.error.code, "invalid_capability_input");
  });

  it("publishes string library cursors and maps invalid cursors as validation errors", async function () {
    for (const name of [
      "library.list_items",
      "library.sync_snapshot",
      "library.readiness_audit",
    ]) {
      const capability = listHostBridgeCapabilities().find(
        (entry) => entry.name === name,
      );
      assert.deepInclude(capability?.inputSchema.properties?.cursor, {
        type: "string",
      });
    }

    const token = configureHostBridgeServerForTests({ token: "cursor-token" });
    const parsed = await callBridgeCapability({
      token,
      capability: "library.list_items",
      input: { cursor: "damaged!", limit: 1 },
    });
    assert.strictEqual(parsed.status, 400);
    assert.strictEqual(parsed.json.error.code, "invalid_library_cursor");
    assert.strictEqual(parsed.json.error.category, "validation");
    assert.strictEqual(parsed.json.error.details.retryable, false);
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
    assert.strictEqual(parsed.json.result.data.kind, "regular");
    assert.strictEqual(
      parsed.json.result.data.item.fields.title,
      "Bridge Broker DTO Paper",
    );
    assert.notProperty(parsed.json.result.data.item, "saveTx");
    assert.notProperty(parsed.json.result.data.item, "getField");
    assert.doesNotThrow(() => JSON.stringify(parsed.json.result.data));
  });

  it("prepares one capability response without a normalization serialization", async function () {
    const token = configureHostBridgeServerForTests({ token: "once-token" });
    runtimeHttpResponseInternalsForTests.resetMetrics();

    const parsed = await callBridgeCapability({
      token,
      capability: "context.get_current_view",
    });

    assert.strictEqual(parsed.status, 200);
    assert.deepEqual(runtimeHttpResponseInternalsForTests.getMetrics(), {
      jsonSerializations: 1,
      bodyEncodes: 1,
      maxWriteChunkBytes: 0,
    });
  });

  it("routes library sync snapshots without write approval", async function () {
    const token = configureHostBridgeServerForTests({
      token: "snapshot-token",
    });
    const item = await createParentItem("Bridge Snapshot DTO Paper");
    item.setField("DOI", "10.5555/bridge-snapshot");
    await item.saveTx();

    const first = await callBridgeCapability({
      token,
      capability: "library.sync_snapshot",
      input: {
        libraryId: Zotero.Libraries.userLibraryID,
        batchSize: 1,
      },
    });

    assert.strictEqual(first.status, 200);
    assert.strictEqual(first.json.status, "ok");
    assert.strictEqual(first.json.result.capability, "library.sync_snapshot");
    assert.strictEqual(first.json.result.approval, "none");
    assert.strictEqual(
      first.json.result.data.schema,
      "zotero-agents.library-full-index.v1",
    );
    assert.lengthOf(first.json.result.data.items, 1);
    assert.strictEqual(first.json.result.data.items[0].ref.key, item.key);
    assert.strictEqual(
      first.json.result.data.items[0].identifiers.doi,
      "10.5555/bridge-snapshot",
    );
    assert.isString(first.json.result.data.snapshotId);
    if (first.json.result.data.outcome === "active") {
      assert.isString(first.json.result.data.nextCursor);
      assert.notProperty(first.json.result.data, "completionEvidence");
      const terminal = await callBridgeCapability({
        token,
        capability: "library.sync_snapshot",
        input: {
          libraryId: Zotero.Libraries.userLibraryID,
          batchSize: 1,
          snapshotId: first.json.result.data.snapshotId,
          cursor: first.json.result.data.nextCursor,
        },
      });
      assert.strictEqual(terminal.status, 200);
      assert.strictEqual(terminal.json.result.data.outcome, "completed");
      assert.isObject(terminal.json.result.data.completionEvidence);
    } else {
      assert.strictEqual(first.json.result.data.outcome, "completed");
      assert.isObject(first.json.result.data.completionEvidence);
    }

    const encoded = JSON.stringify(first.json.result.data);
    for (const forbidden of [
      "localPath",
      "nativeHandle",
      "registry",
      "sessionRecord",
    ]) {
      assert.notInclude(encoded, forbidden);
    }

    const filtered = await callBridgeCapability({
      token,
      capability: "library.sync_snapshot",
      input: { libraryId: Zotero.Libraries.userLibraryID, tag: "forbidden" },
    });
    assert.strictEqual(filtered.status, 400);
    assert.strictEqual(filtered.json.error.code, "invalid_capability_input");
  });

  it("routes library readiness audits with shared artifact evidence", async function () {
    const token = configureHostBridgeServerForTests({
      token: "readiness-token",
    });
    const complete = await createParentItem("Bridge Readiness Complete");
    const completePdf = await createAttachment(
      complete,
      "D:\\Private\\complete.pdf",
      { contentType: "application/pdf" },
    );
    await createAttachment(complete, "D:\\Private\\complete.md", {
      contentType: "text/markdown",
    });
    await createNote(
      complete,
      "Digest",
      '<div data-zs-note-kind="digest"><p>Digest</p></div>',
    );
    await createNote(
      complete,
      "References",
      '<div data-zs-note-kind="references"><p>References</p></div>',
    );
    await createNote(
      complete,
      "Citation",
      '<div data-zs-note-kind="citation_analysis"><p>Citation</p></div>',
    );
    complete.getBestAttachment = async () => completePdf;

    const missing = await createParentItem("Bridge Readiness Missing");
    const missingPdf = await createAttachment(
      missing,
      "D:\\Private\\missing.pdf",
      { contentType: "application/pdf" },
    );
    await createAttachment(missing, "D:\\Private\\other.md", {
      contentType: "text/markdown",
    });
    await createNote(
      missing,
      "Digest",
      '<div data-zs-note-kind="digest"><p>Digest</p></div>',
    );
    missing.getBestAttachment = async () => missingPdf;

    const parsed = await callBridgeCapability({
      token,
      capability: "library.readiness_audit",
      input: {
        query: "Bridge Readiness",
        checks: ["markdown", "analysis"],
        missingOnly: true,
        limit: 10,
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(
      parsed.json.result.capability,
      "library.readiness_audit",
    );
    assert.strictEqual(parsed.json.result.approval, "none");
    assert.strictEqual(
      parsed.json.result.data.schema,
      "zotero.library.readiness_audit.v1",
    );
    assert.lengthOf(parsed.json.result.data.items, 1);
    const item = parsed.json.result.data.items[0];
    assert.strictEqual(item.key, missing.key);
    assert.deepEqual(item.missing, ["markdown", "analysis"]);
    assert.deepEqual(item.evidence.analysis.missingParts, [
      "references",
      "citation-analysis",
    ]);
    assert.strictEqual(item.evidence.pdf.filename, "missing.pdf");
    assert.notInclude(JSON.stringify(item), "D:\\Private");
  });

  it("derives connection mode from the socket peer and only permits conservative header downgrade", async function () {
    const connectionModes: unknown[] = [];
    const token = configureHostBridgeServerForTests({
      token: "mode-token",
      resolveSynthesisClient: () =>
        createSynthesisClientFromPort({
          getTopicContext(args, context) {
            connectionModes.push(context?.mode);
            return {
              schema_id: "synthesis.topic_context",
              schema_version: "2.0.0",
              topic_id: args.topicId,
            };
          },
        }),
    });

    const remote = await callBridgeCapability({
      token,
      capability: "topics.get_context",
      input: { topicId: "object-detection", view: "digest" },
      connectionMode: "local",
      peerHost: "192.0.2.10",
    });
    const downgraded = await callBridgeCapability({
      token,
      capability: "topics.get_context",
      input: { topicId: "object-detection", view: "digest" },
      connectionMode: "remote",
      peerHost: "127.0.0.1",
    });
    const local = await callBridgeCapability({
      token,
      capability: "topics.get_context",
      input: { topicId: "object-detection", view: "digest" },
      connectionMode: "local",
      peerHost: "::1",
    });
    const unknown = await callBridgeCapability({
      token,
      capability: "topics.get_context",
      input: { topicId: "object-detection", view: "digest" },
      connectionMode: "local",
      peerHost: "",
    });

    assert.strictEqual(remote.status, 200);
    assert.strictEqual(downgraded.status, 200);
    assert.strictEqual(local.status, 200);
    assert.strictEqual(unknown.status, 200);
    assert.deepEqual(connectionModes, ["remote", "remote", "local", "remote"]);
  });

  it("routes direct paper and Topic research bundles through their Synthesis capabilities", async function () {
    const calls: Array<{ kind: string; input: any; mode?: string }> = [];
    const result = (kind: "papers" | "topics") => ({
      manifest_file: "manifest.json",
      summary: {
        kind,
        paper_count: 1,
        topic_count: kind === "topics" ? 1 : 0,
        warning_count: 0,
      },
      delivery: {
        mode: "local",
        outputName: `${kind}-bundle`,
        manifestFile: "manifest.json",
        fileCount: 3,
        bytesWritten: 128,
      },
    });
    const token = configureHostBridgeServerForTests({
      token: "direct-bundle-token",
      resolveDirectResearchBundleApplication: () => ({
        exportPapers(input, context) {
          calls.push({
            kind: "papers",
            input,
            mode: context?.mode,
          });
          return Promise.resolve(result("papers") as any);
        },
        exportTopics(input, context) {
          calls.push({
            kind: "topics",
            input,
            mode: context?.mode,
          });
          return Promise.resolve(result("topics") as any);
        },
      }),
    });

    const paper = await callBridgeCapability({
      token,
      capability: "items.export_research_bundle",
      input: {
        items: [{ key: "ABCD1234", libraryId: 1 }],
        output_dir: "paper-bundle",
      },
    });
    const topic = await callBridgeCapability({
      token,
      capability: "topics.export_research_bundle",
      input: {
        topic_ids: ["topic-one"],
        output_dir: "topic-bundle",
      },
    });

    assert.strictEqual(paper.status, 200, JSON.stringify(paper.json));
    assert.strictEqual(topic.status, 200, JSON.stringify(topic.json));
    assert.deepEqual(
      calls.map((entry) => [entry.kind, entry.mode]),
      [
        ["papers", "local"],
        ["topics", "local"],
      ],
    );
    assert.deepEqual(calls[0].input.items, [{ key: "ABCD1234", libraryId: 1 }]);
    assert.deepEqual(calls[1].input.topic_ids, ["topic-one"]);
  });

  it("rotates, binds, revokes, and redacts auto-approval grants", function () {
    upsertAcpSkillRun({
      requestId: "grant-run",
      runId: "grant-run",
      hostBridgeCli: {
        available: true,
        pathInjected: true,
        autoApproveWrites: true,
      },
    });
    const first = issueHostBridgeWriteAutoApprovalGrant({
      requestId: "grant-run",
      runId: "grant-run",
    });
    const second = issueHostBridgeWriteAutoApprovalGrant({
      requestId: "grant-run",
      runId: "grant-run",
    });
    const scope = {
      kind: "acp-skill-run",
      requestId: "grant-run",
      runId: "grant-run",
      autoApproveWrites: true,
      connectionMode: "local" as const,
    };
    assert.isFalse(
      isHostBridgeWriteAutoApprovalScope({ ...scope, grantId: first }),
    );
    assert.isTrue(
      isHostBridgeWriteAutoApprovalScope({ ...scope, grantId: second }),
    );
    assert.isFalse(
      isHostBridgeWriteAutoApprovalScope({
        ...scope,
        grantId: second,
        connectionMode: "remote",
      }),
    );
    revokeHostBridgeWriteAutoApprovalGrant(second);
    assert.isFalse(
      isHostBridgeWriteAutoApprovalScope({ ...scope, grantId: second }),
    );
  });

  it("keeps sidecar refresh and graph update as separate approved operations", async function () {
    const calls: string[] = [];
    const token = configureHostBridgeServerForTests({
      token: "maintenance-operation-token",
      resolveSynthesisClient: () =>
        createSynthesisClientFromPort({
          async startReferenceSidecarRefresh(input) {
            calls.push("sidecar");
            assert.deepEqual(input, {});
            return maintenanceOperation("sidecar-op");
          },
          async startCitationGraphUpdate(input) {
            calls.push("graph");
            assert.deepEqual(input, {
              scope: "papers",
              paperRefs: ["1:ABCD1234"],
              expectedReferenceBasisHash: "sha256:basis",
            });
            return maintenanceOperation("graph-op");
          },
          async getPublicMaintenanceOperation(input) {
            calls.push("status");
            return maintenanceOperation(input.operation_id, "completed");
          },
        }),
    });
    let approvalCount = 0;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      approvalCount += 1;
      return {
        outcome: "approved",
        requestId: request.requestId,
        channel: "global",
      };
    });

    const sidecar = await callBridgeCapability({
      token,
      capability: "reference_sidecar.refresh",
      input: {},
    });
    const graph = await callBridgeCapability({
      token,
      capability: "citation_graph.update",
      input: {
        scope: "papers",
        paperRefs: ["1:ABCD1234"],
        expectedReferenceBasisHash: "sha256:basis",
      },
    });
    const status = await callBridgeCapability({
      token,
      capability: "synthesis.operation.get",
      input: { operation_id: "sidecar-op" },
    });

    assert.strictEqual(sidecar.json.result.data.operation_id, "sidecar-op");
    assert.strictEqual(graph.json.result.data.operation_id, "graph-op");
    assert.strictEqual(status.json.result.data.status, "completed");
    assert.strictEqual(approvalCount, 2);
    assert.deepEqual(calls, ["sidecar", "graph", "status"]);
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
    const titles = parsed.json.result.data.items.map(
      (entry: { title?: string }) => entry.title,
    );
    assert.include(titles, "桥接中文🚀 Paper");
    assert.isBoolean(parsed.json.result.data.truncated);
  });

  it("uses query as the shared Host and CLI search field", async function () {
    const token = configureHostBridgeServerForTests({
      token: "search-contract-token",
    });
    const parsed = await callBridgeCapability({
      token,
      capability: "library.search_items",
      input: { text: "legacy-field" },
    });

    assert.strictEqual(parsed.status, 400);
    assert.strictEqual(parsed.json.error.code, "invalid_capability_input");
    assert.strictEqual(
      parsed.json.error.details.capability,
      "library.search_items",
    );
    assert.include(
      parsed.json.error.details.violations.map(
        (violation: { property?: string }) => violation.property,
      ),
      "text",
    );
  });

  it("exposes Synthesis host capabilities through Host Bridge CLI-compatible calls", async function () {
    const token = configureHostBridgeServerForTests({
      token: "synthesis-token",
      resolveSynthesisClient: () =>
        createSynthesisClientFromPort({
          getReferenceSidecarIndex() {
            return emptyReferenceIndex();
          },
          queryCitationGraph() {
            return emptyCitationOverview();
          },
        }),
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
    assert.strictEqual(parsed.json.result.data.diagnostics.storage, "sqlite");

    const graphOverview = await callBridgeCapability({
      token,
      capability: "citation_graph.get_overview",
      input: { limit: 1 },
    });
    assert.strictEqual(graphOverview.status, 200);
    assert.strictEqual(
      graphOverview.json.result.capability,
      "citation_graph.get_overview",
    );
    assert.isArray(graphOverview.json.result.data.nodes);
    assert.isObject(graphOverview.json.result.data.pagination);
    assert.isFalse(graphOverview.json.result.data.pagination.hasMore);
    assert.isTrue(graphOverview.json.result.data.diagnostics.bounded);

    const manifest = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v2/manifest?limit=100",
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
    const sidecarRefresh = manifest.json.result.capabilities.find(
      (entry: { name?: string }) => entry.name === "reference_sidecar.refresh",
    );
    const graphUpdate = manifest.json.result.capabilities.find(
      (entry: { name?: string }) => entry.name === "citation_graph.update",
    );
    const maintenanceStatus = manifest.json.result.capabilities.find(
      (entry: { name?: string }) => entry.name === "synthesis.operation.get",
    );
    assert.isOk(metricsRefresh);
    assert.isOk(topicReport);
    assert.isOk(topicsByPaperRef);
    assert.isOk(graphLayout);
    assert.isOk(sidecarRefresh);
    assert.isOk(graphUpdate);
    assert.isOk(maintenanceStatus);
    assert.strictEqual(metricsRefresh.approval, "zotero-ui-required");
    assert.strictEqual(topicReport.approval, "none");
    assert.strictEqual(topicsByPaperRef.approval, "none");
    assert.strictEqual(graphLayout.approval, "none");
    assert.strictEqual(sidecarRefresh.approval, "zotero-ui-required");
    assert.strictEqual(graphUpdate.approval, "zotero-ui-required");
    assert.strictEqual(maintenanceStatus.approval, "none");
  });

  it("uses the same paged and file-delivery DTOs for Synthesis capability calls", async function () {
    const reviewCorpus = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-workflow-review.json",
        ),
        "utf8",
      ),
    ) as { cases: Array<{ id: string; value: unknown }> };
    const workflowReviewResult = reviewCorpus.cases.find(
      (entry) => entry.id === "workflow-review-recursive-positive",
    )!.value;
    const token = configureHostBridgeServerForTests({
      token: "synthesis-boundary-token",
      resolveSynthesisClient: () =>
        createSynthesisClientFromPort({
          async getPaperArtifactManifest() {
            return {
              artifacts: [
                {
                  paper_ref: "1:A",
                  artifact_type: "digest",
                  payload_type: "digest-markdown",
                  status: "missing",
                  payload_types_seen: [],
                  diagnostics: [],
                },
                {
                  paper_ref: "1:B",
                  artifact_type: "digest",
                  payload_type: "digest-markdown",
                  status: "missing",
                  payload_types_seen: [],
                  diagnostics: [],
                },
                {
                  paper_ref: "1:C",
                  artifact_type: "digest",
                  payload_type: "digest-markdown",
                  status: "missing",
                  payload_types_seen: [],
                  diagnostics: [],
                },
              ],
              diagnostics: [],
            };
          },
          async getReviewInput() {
            return workflowReviewResult;
          },
        }),
    });

    const first = await callBridgeCapability({
      token,
      capability: "paper_artifacts.get_manifest",
      input: { limit: 2 },
    });
    assert.lengthOf(first.json.result.data.papers, 2);
    assert.isTrue(first.json.result.data.hasMore);
    assert.isString(first.json.result.data.nextCursor);
    const second = await callBridgeCapability({
      token,
      capability: "paper_artifacts.get_manifest",
      input: { limit: 2, cursor: first.json.result.data.nextCursor },
    });
    assert.deepEqual(
      [...first.json.result.data.papers, ...second.json.result.data.papers].map(
        (paper: { paper_ref: string }) => paper.paper_ref,
      ),
      ["1:A", "1:B", "1:C"],
    );

    const review = await callBridgeCapability({
      token,
      capability: "topics.get_review_input",
      input: { topicId: "topic:1" },
    });
    const file = review.json.result.data.delivery.file;
    assert.match(file.fileId, /^file-/);
    assert.notProperty(file, "localPath");
    const downloaded = await handleHostBridgeHttpRequestForTests({
      method: "GET",
      path: `/bridge/v2/files/${file.fileId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    const body = downloaded.slice(downloaded.indexOf("\r\n\r\n") + 4);
    const bytes = Buffer.from(body, "utf8");
    assert.include(body, '"topic_id": "topic:1"');
    assert.strictEqual(bytes.byteLength, file.size);
    assert.strictEqual(
      `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
      file.sha256,
    );
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
    assert.strictEqual(missing.status, 400);
    assert.strictEqual(missing.json.error.code, "invalid_capability_input");

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
    assert.strictEqual(legacy.status, 400);
    assert.strictEqual(legacy.json.error.code, "invalid_capability_input");
    assert.strictEqual(
      legacy.json.error.details.capability,
      "resolvers.resolve",
    );
  });

  it("hides debug capabilities when debug mode is disabled", async function () {
    setDebugModeOverrideForTests(false);
    setSkillRunnerConnectionAuditSourceOverrideForTests(true);
    const token = configureHostBridgeServerForTests({
      token: "debug-off-token",
    });

    const manifest = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v2/manifest?limit=100",
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

  it("hides SkillRunner connection audit when its source switch is disabled", async function () {
    setDebugModeOverrideForTests(true);
    setSkillRunnerConnectionAuditSourceOverrideForTests(false);
    const token = configureHostBridgeServerForTests({
      token: "connection-audit-off-token",
    });

    const manifest = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v2/manifest",
        headers: {
          authorization: `Bearer ${token}`,
        },
      }),
    );
    const names = manifest.json.result.capabilities.map(
      (capability: { name: string }) => capability.name,
    );
    assert.include(names, "debug.status");
    assert.notInclude(names, "debug.skillrunner.connections.snapshot");

    const call = await callBridgeCapability({
      token,
      capability: "debug.skillrunner.connections.snapshot",
      input: {},
    });
    assert.strictEqual(call.status, 404);
    assert.strictEqual(call.json.error.code, "capability_not_found");
  });

  it("exposes debug capabilities and Synthesis diagnostics when debug mode is enabled", async function () {
    setDebugModeOverrideForTests(true);
    setSkillRunnerConnectionAuditSourceOverrideForTests(true);
    const token = configureHostBridgeServerForTests({
      token: "debug-on-token",
      resolveSynthesisClient: () =>
        createSynthesisClientFromPort({
          debugSynthesisSnapshot() {
            return {
              schemaId: "synthesis.debug-maintenance.v1",
              status: "ready",
              diagnostics: [],
            };
          },
          debugSynthesisProfilerList() {
            return { status: "unavailable", diagnostics: [] };
          },
        }),
    });

    const manifest = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: "/bridge/v2/manifest?limit=100",
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
      input: {},
    });
    assert.strictEqual(snapshot.status, 200);
    assert.strictEqual(
      snapshot.json.result.data.schemaId,
      "synthesis.debug-maintenance.v1",
    );
    assert.strictEqual(snapshot.json.result.data.status, "ready");
    assert.deepEqual(snapshot.json.result.data.diagnostics, []);

    const fullSnapshot = await callBridgeCapability({
      token,
      capability: "debug.synthesis.snapshot",
      input: { limit: 5, includeUiSnapshot: true },
    });
    assert.strictEqual(fullSnapshot.status, 200);
    assert.isObject(fullSnapshot.json.result.data.delivery.bundle);
    assert.isString(fullSnapshot.json.result.data.delivery.bundle.fileId);

    const profiler = await callBridgeCapability({
      token,
      capability: "debug.synthesis.profiler.list",
      input: {},
    });
    assert.strictEqual(profiler.status, 200);
    assert.strictEqual(profiler.json.result.data.status, "unavailable");
    assert.deepEqual(profiler.json.result.data.diagnostics, []);
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
      resolveSynthesisClient: () =>
        createSynthesisClientFromPort({
          debugSynthesisCleanInstallReset() {
            return { ok: true, status: "preview", diagnostics: [] };
          },
        }),
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
    assert.strictEqual(parsed.json.result.data.status, "preview");
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
          itemType: "document",
          fields: { title: "Bridge Literature Ingest" },
          creators: [],
          identifiers: {},
          landingUrl: "https://example.test/bridge-literature-ingest",
          attachLandingUrlOnMissingPdf: true,
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
    assert.include(canonical.json.result.data.summary, "landing link");
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

  it("rejects invalid approved-capability input before requesting approval", async function () {
    const token = configureHostBridgeServerForTests({
      token: "invalid-approved-input-token",
    });
    let approvalCount = 0;
    configureHostBridgeGlobalApprovalHandlerForTests(() => {
      approvalCount += 1;
      return { outcome: "approved" };
    });

    const parsed = await callBridgeCapability({
      token,
      capability: "workflow_products.remove",
      input: { product: "missing-product-id" },
    });

    assert.strictEqual(parsed.status, 400);
    assert.strictEqual(parsed.json.error.code, "invalid_capability_input");
    assert.strictEqual(parsed.json.error.details.phase, "capability_input");
    assert.strictEqual(
      parsed.json.error.details.capability,
      "workflow_products.remove",
    );
    assert.isNotEmpty(parsed.json.error.details.violations);
    assert.strictEqual(approvalCount, 0);
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
        path: "/bridge/v2/manifest",
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
    upsertAcpSkillRun({
      requestId: "auto-approve-run",
      runId: "auto-approve-run",
      hostBridgeCli: {
        available: true,
        pathInjected: true,
        autoApproveWrites: true,
      },
    });
    const scope = {
      kind: "acp-skill-run",
      requestId: "auto-approve-run",
      runId: "auto-approve-run",
      autoApproveWrites: true,
      grantId: issueHostBridgeWriteAutoApprovalGrant({
        requestId: "auto-approve-run",
        runId: "auto-approve-run",
      }),
    };
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
        grantId: "forged-secret-grant",
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
    assert.notInclude(
      JSON.stringify(
        getHostBridgePermissionProjection(approvalRequest.requestId),
      ),
      "forged-secret-grant",
    );
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
          itemType: "journalArticle",
          fields: {
            title: "Bridge Ingest Approval",
            DOI: "10.5555/bridge.approval",
          },
          creators: [],
          identifiers: { doi: "10.5555/bridge.approval" },
          landingUrl: "https://example.test/bridge-approval",
          pdfUrl: "https://example.test/bridge.pdf",
          attachLandingUrlOnMissingPdf: true,
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
    assert.include(approvalRequest.detail, "Landing link:");
    assert.include(approvalRequest.detail, "missing-PDF landing link");
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

    assert.strictEqual(parsed.status, 400);
    assert.isNull(approvalRequest);
    assert.strictEqual(parsed.json.error.code, "invalid_capability_input");
    assert.strictEqual(parsed.json.error.details.phase, "capability_input");
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

  it("executes collection create, membership, note, and annotation writeback operations", async function () {
    const token = configureHostBridgeServerForTests({
      token: "writeback-token",
    });
    const item = await createParentItem("Bridge Writeback Parent");
    configureHostBridgeGlobalApprovalHandlerForTests((request) => ({
      outcome: "approved",
      requestId: request.requestId,
      channel: "global",
    }));

    const createdCollection = await callBridgeCapability({
      token,
      capability: "mutation.execute",
      input: {
        operation: "collection.create",
        name: "Bridge Writeback Collection",
      },
    });
    assert.strictEqual(createdCollection.status, 200);
    const collection = createdCollection.json.result.data.result.collections[0];
    assert.strictEqual(collection.name, "Bridge Writeback Collection");

    const added = await callBridgeCapability({
      token,
      capability: "mutation.execute",
      input: {
        operation: "collection.addItems",
        collection: { id: collection.id },
        items: [item.id],
      },
    });
    assert.strictEqual(added.status, 200);
    assert.include(item.getCollections(), collection.id);

    const noteCreated = await callBridgeCapability({
      token,
      capability: "mutation.execute",
      input: {
        operation: "note.createChild",
        parent: item.id,
        content: "<p>Bridge writeback note</p>",
      },
    });
    assert.strictEqual(noteCreated.status, 200);
    const note = noteCreated.json.result.data.result.notes[0];
    assert.strictEqual(note.parent.id, item.id);

    const noteUpdated = await callBridgeCapability({
      token,
      capability: "mutation.execute",
      input: {
        operation: "note.update",
        note: note.id,
        content: "<p>Bridge writeback note updated</p>",
      },
    });
    assert.strictEqual(noteUpdated.status, 200);
    assert.include(
      noteUpdated.json.result.data.result.notes[0].html,
      "updated",
    );

    const attachment = new Zotero.Item("attachment");
    (attachment as any).parentItemID = item.id;
    (attachment as any).version = 3;
    (attachment as any).attachmentLinkMode = 0;
    attachment.setField("title", "Bridge Annotation Attachment");
    attachment.setField("contentType", "application/pdf");
    await attachment.saveTx();

    const annotation = new Zotero.Item("annotation");
    (annotation as any).parentItemID = attachment.id;
    (annotation as any).version = 4;
    (annotation as any).dateAdded = "2026-05-20T01:00:00.000Z";
    (annotation as any).dateModified = "2026-05-20T02:00:00.000Z";
    (annotation as any).annotationType = "highlight";
    (annotation as any).annotationText = "quoted text";
    (annotation as any).annotationComment = "agent note";
    (annotation as any).annotationColor = "#ffd400";
    (annotation as any).annotationPageLabel = "3";
    (annotation as any).annotationSortIndex = "00001";
    (annotation as any).annotationPosition = JSON.stringify({ pageIndex: 0 });
    await annotation.saveTx();
    (attachment as any).getAnnotations = () => [annotation.id];
    (item as any).getAttachments = () => [attachment.id];

    setZoteroLibrarySourcePageQueryAdapterForTests({
      async queryAsync(_sql, _params, context) {
        if (context.domain !== "annotations") {
          return context.kind === "count" ? [{ total: 0 }] : [];
        }
        if (context.kind === "count") return [{ total: 1 }];
        return [{ itemID: annotation.id, sortIndex: "00001" }];
      },
      async hydrateItems(ids) {
        return (await (Zotero.Items as any).getAsync(ids)) as Zotero.Item[];
      },
    });

    try {
      const annotations = await callBridgeCapability({
        token,
        capability: "library.export_annotations",
        input: { ref: item.id, format: "markdown" },
      });
      assert.strictEqual(annotations.status, 200);
      assert.strictEqual(
        annotations.json.result.data.delivery.mode,
        "bridge-download",
      );
      assert.match(annotations.json.result.data.delivery.file.fileId, /^file-/);
      assert.strictEqual(annotations.json.result.data.count, 1);
      assert.notProperty(annotations.json.result.data, "markdown");
      assert.notProperty(annotations.json.result.data, "annotations");
      assert.notProperty(
        annotations.json.result.data.delivery.file,
        "localPath",
      );
      const file = annotations.json.result.data.delivery.file;
      const downloaded = await handleHostBridgeHttpRequestForTests({
        method: "GET",
        path: `/bridge/v2/files/${file.fileId}`,
        headers: { authorization: `Bearer ${token}` },
      });
      const separator = downloaded.indexOf("\r\n\r\n");
      const body = downloaded.slice(separator + 4);
      const bytes = Buffer.from(body, "utf8");
      assert.include(body, "quoted text");
      assert.strictEqual(bytes.byteLength, file.size);
      assert.strictEqual(
        `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
        file.sha256,
      );
    } finally {
      resetZoteroLibrarySourcePageQueryAdapterForTests();
      await annotation.eraseTx();
      await attachment.eraseTx();
    }
  });

  it("attaches uploaded Host Bridge files by opaque handle only once", async function () {
    const token = configureHostBridgeServerForTests({ token: "upload-token" });
    const item = await createParentItem("Bridge Upload Attach Parent");
    configureHostBridgeGlobalApprovalHandlerForTests((request) => ({
      outcome: "approved",
      requestId: request.requestId,
      channel: "global",
    }));

    const uploaded = parseRawHttpResponse(
      await handleHostBridgeHttpRequestForTests({
        method: "POST",
        path: "/bridge/v2/files/upload",
        rawRequestBytes: rawHttpRequestBytes({
          method: "POST",
          path: "/bridge/v2/files/upload",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "text/plain",
            "X-Zotero-Bridge-Display-Name": "writeback.txt",
          },
          bodyBytes: Buffer.from("writeback artifact", "utf8"),
        }),
      }),
    );
    const fileId = uploaded.json.result.file.fileId;

    const attached = await callBridgeCapability({
      token,
      capability: "mutation.execute",
      input: {
        operation: "item.attachFile",
        item: item.id,
        fileId,
      },
    });
    assert.strictEqual(attached.status, 200);
    assert.lengthOf(attached.json.result.data.result.attachments, 1);
    assert.lengthOf(item.getAttachments(), 1);

    const reused = await callBridgeCapability({
      token,
      capability: "mutation.preview",
      input: {
        operation: "item.attachFile",
        item: item.id,
        fileId,
      },
    });
    assert.strictEqual(reused.status, 200);
    assert.isFalse(reused.json.result.data.ok);
    assert.strictEqual(reused.json.result.data.error.code, "file_not_found");
  });

  it("mirrors Host Bridge capability names through MCP tools", async function () {
    const item = await createParentItem("Bridge MCP Compatibility");
    const previousGetMainWindow = (Zotero as any).getMainWindow;
    (Zotero as any).getMainWindow = () => ({
      ZoteroPane: {
        getSelectedItems: () => [item],
        getSelectedLibraryIDs: () => [Zotero.Libraries.userLibraryID, 2],
        getCollectionTreeRows: () => [
          {
            type: "library",
            isLibrary: () => true,
            ref: {
              libraryID: Zotero.Libraries.userLibraryID,
              name: "My Library",
            },
          },
          {
            type: "group",
            isLibrary: () => true,
            ref: { libraryID: 2, name: "Team Library" },
          },
        ],
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
      assert.deepEqual(structured.data.libraryIds, ["1", "2"]);
      assert.notProperty(structured.data, "libraryId");
      assert.deepEqual(
        structured.data.selectedSources.map(
          (source: { libraryId: number }) => source.libraryId,
        ),
        [1, 2],
      );
    } finally {
      (Zotero as any).getMainWindow = previousGetMainWindow;
    }
  });

  it("exposes read-only workflow-product capabilities without MCP export or removal", async function () {
    const capabilities = listHostBridgeCapabilities();
    const capabilityNames = capabilities.map((entry) => entry.name);
    assert.includeMembers(capabilityNames, [
      "workflow_products.list",
      "workflow_products.get",
      "workflow_products.read_asset",
      "workflow_products.export",
      "workflow_products.remove",
    ]);
    const response: any = await handleZoteroMcpRequestForTests({
      jsonrpc: "2.0",
      id: "workflow-products",
      method: "tools/list",
    });
    const toolNames = response.result.tools.map(
      (tool: { name: string }) => tool.name,
    );
    assert.includeMembers(toolNames, [
      "workflow_products.list",
      "workflow_products.get",
      "workflow_products.read_asset",
    ]);
    assert.notInclude(toolNames, "workflow_products.export");
    assert.notInclude(toolNames, "workflow_products.remove");
    const readAsset = capabilities.find(
      (entry) => entry.name === "workflow_products.read_asset",
    ) as any;
    assert.containsAllKeys(readAsset.inputSchema.properties, [
      "productId",
      "assetId",
      "relativePath",
    ]);
    assert.deepEqual(readAsset.inputSchema.required, ["productId"]);
  });

  it("reads and exports Product assets through logical relative paths", async function () {
    const previousRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    const runtimeRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-bridge-product-"),
    );
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = runtimeRoot;
    resetPluginStateStoreForTests();
    try {
      const api = createProductStorageApi({
        manifest: { id: "bridge-product", label: "Bridge Product" },
        resultContext: {
          async resolveArtifactBytes() {
            throw new Error("not used");
          },
        } as any,
        runResult: { requestId: "bridge-product-request" },
      });
      const receipt = await api.registerProduct({
        productKey: "portable",
        kind: "research_bundle",
        title: "Portable Product",
        failurePolicy: "atomic",
        assets: [
          {
            assetId: "manifest",
            productAssetPath: "nested/manifest.json",
            contentType: "application/json",
            source: { kind: "inline-text", text: '{"ok":true}' },
          },
        ],
      });
      const token = configureHostBridgeServerForTests({
        token: "workflow-product-token",
      });
      const metadata = await callBridgeCapability({
        token,
        capability: "workflow_products.get",
        input: { productId: receipt.productId },
      });
      assert.strictEqual(metadata.status, 200);
      assert.equal(
        metadata.json.result.data.product.assets[0].relativePath,
        "nested/manifest.json",
      );
      assert.notProperty(metadata.json.result.data.product, "storageRevision");
      assert.notProperty(
        metadata.json.result.data.product.assets[0],
        "localPath",
      );

      const read = await callBridgeCapability({
        token,
        capability: "workflow_products.read_asset",
        input: {
          productId: receipt.productId,
          relativePath: "nested/manifest.json",
        },
      });
      assert.strictEqual(read.status, 200);
      assert.equal(read.json.result.data.asset.assetId, "manifest");
      assert.isString(read.json.result.data.file.fileId);

      const outputDir = path.join(runtimeRoot, "export");
      const exported = await callBridgeCapability({
        token,
        capability: "workflow_products.export",
        input: { productId: receipt.productId, outputDir },
        connectionMode: "local",
      });
      assert.strictEqual(exported.status, 200);
      assert.equal(
        await fs.readFile(
          path.join(outputDir, "nested", "manifest.json"),
          "utf8",
        ),
        '{"ok":true}',
      );
    } finally {
      resetPluginStateStoreForTests();
      if (typeof previousRoot === "undefined") {
        delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
      } else {
        process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRoot;
      }
      await fs.rm(runtimeRoot, { recursive: true, force: true });
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

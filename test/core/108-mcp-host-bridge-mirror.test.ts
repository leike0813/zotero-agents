import { assert } from "chai";
import {
  configureZoteroMcpServerForTests,
  ensureZoteroMcpServer,
  handleZoteroMcpHttpRequestForTests,
  handleZoteroMcpRequestForTests,
  resetZoteroMcpServerForTests,
} from "../../src/modules/zoteroMcpServer";
import { setPref } from "../../src/utils/prefs";
import { createFailClosedZoteroHostCapabilityBroker } from "../helpers/zoteroHostCapabilityBrokerHarness";
import { createSynthesisClientFromPort } from "../../src/modules/synthesisClient/clientPortAdapter";
import { executeHostBridgeCanonicalMutation } from "../../src/modules/hostBridgeMutationAdapter";
import type {
  BrokerTrustedMutationResources,
  ZoteroHostCanonicalMutationControl,
} from "../../src/modules/zoteroHostCapabilityBroker";

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
    assert.include(names, "topics.find_by_paper_ref");
    assert.include(names, "topics.get_planning_context");
    assert.include(names, "topics.get_report");
    assert.include(names, "citation_graph.get_layout");
    assert.include(names, "citation_graph.rank_external_references");
    assert.include(names, "mutation.get_operation");
    assert.notInclude(names, "synthesis.list_topics");
    assert.notInclude(names, "get_current_view");
    assert.notInclude(names, "get_item_detail");
  });

  it("delivers the complete topic planning context through a registered file", async function () {
    const client = createSynthesisClientFromPort({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async getTopicPlanningContext() {
        return {
          schema_id: "synthesis.topic_planning_context",
          schema_version: "1.0.0",
          library: {
            total_papers: 2,
            papers: [{ paper_ref: "1:AAAA1111" }, { paper_ref: "1:BBBB2222" }],
          },
          topics: [{ topic_id: "topic-a" }],
          topic_graph: { nodes: [{ topic_id: "topic-a" }], edges: [] },
          diagnostics: { bounded_inline: true, truncated: false },
        };
      },
    });
    const response: any = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "planning-context",
        method: "tools/call",
        params: {
          name: "topics.get_planning_context",
          arguments: { limit: 1 },
        },
      },
      { resolveSynthesisClient: () => client },
    );

    const data = response.result.structuredContent.data;
    assert.deepEqual(data.summary.paperRefs, ["1:AAAA1111"]);
    assert.isTrue(data.summary.previewTruncated);
    assert.strictEqual(data.delivery.mode, "bridge-download");
    assert.isString(data.delivery.bundle.fileId);
    assert.notProperty(data, "library");
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
            protocol: "host-bridge.v2",
            endpoint: "http://127.0.0.1:26570/bridge/v2",
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

  it("observes canonical mutation evidence through the stable Bridge scope", async function () {
    const calls: Array<{
      request: { operationId: string };
      scope: { ownerId: string };
    }> = [];
    const broker = createFailClosedZoteroHostCapabilityBroker({
      mutations: {
        async getOperation(request, scope) {
          calls.push({ request, scope });
          return { state: "unavailable" };
        },
      },
    });

    const response: any = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "mutation-observation",
        method: "tools/call",
        params: {
          name: "mutation.get_operation",
          arguments: { operationId: "canonical-mutation-operation" },
        },
      },
      { resolveZoteroHostCapabilityBroker: () => broker },
    );

    assert.deepEqual(calls, [
      {
        request: { operationId: "canonical-mutation-operation" },
        scope: { ownerId: "host-bridge" },
      },
    ]);
    assert.deepEqual(response.result.structuredContent.data, {
      state: "unavailable",
    });
  });

  it("projects observed canonical attachments through Bridge locality", async function () {
    const broker = createFailClosedZoteroHostCapabilityBroker({
      mutations: {
        async getOperation() {
          return {
            state: "settled",
            result: {
              outcome: "committed",
              receipt: {
                schema: "zotero-agents.mutation-receipt.v1",
                receiptId: "receipt-attachment-observation",
                operationId: "attachment-observation",
                operation: "attachments.create",
                outcome: "committed",
                committedAt: "2026-09-06T00:00:00.000Z",
                effectDigest: "digest",
                changes: [],
              },
              result: {
                attachment: {
                  ref: { libraryId: 1, key: "ATTACHMENT" },
                  parentRef: null,
                  revision: "1",
                  title: "Attachment",
                  filename: "paper.pdf",
                  contentType: "application/pdf",
                  charset: null,
                  url: null,
                  linkMode: "stored_file",
                  role: "ordinary",
                  createdAt: "2026-09-06T00:00:00.000Z",
                  file: {
                    state: "available",
                    path: `${process.cwd()}/package.json`,
                    sizeBytes: 1,
                    modifiedAt: null,
                  },
                },
              },
            },
          };
        },
      },
    });

    const response: any = await handleZoteroMcpRequestForTests(
      {
        jsonrpc: "2.0",
        id: "observed-attachment",
        method: "tools/call",
        params: {
          name: "mutation.get_operation",
          arguments: { operationId: "attachment-observation" },
        },
      },
      { resolveZoteroHostCapabilityBroker: () => broker },
    );

    const attachment =
      response.result.structuredContent.data.result.result.attachment;
    assert.notProperty(attachment.file, "path");
    assert.oneOf(attachment.access.mode, ["bridge-download", "unavailable"]);
  });

  it("reapproves a changed canonical mutation plan before execution", async function () {
    const executions: Array<Record<string, unknown>> = [];
    let approvalCount = 0;
    let prepareCount = 0;
    const request = {
      operation: "item.updateMetadata",
      operationId: "changed-plan-operation",
      itemRef: { libraryId: 1, key: "ITEM0001" },
      patch: { title: "Changed" },
    } as const;
    const mutationControl = {
      async prepare(args: {
        input: typeof request;
        scope: { ownerId: string };
      }) {
        assert.deepEqual(args.scope, { ownerId: "host-bridge" });
        prepareCount += 1;
        return {
          state: "prepared",
          preview: {
            schema: "zotero-agents.mutation-preview.v1",
            operation: "item.updateMetadata",
            outcome: "would_change",
            observedAt: "2026-09-06T00:00:00.000Z",
            domainPlanDigest:
              prepareCount === 1 ? "first-plan" : "changed-plan",
            plan: { effect: "item.updateMetadata" },
          },
          prepared: {},
        };
      },
      async execute(args: {
        input: typeof request;
        scope: { ownerId: string };
      }) {
        assert.deepEqual(args.scope, { ownerId: "host-bridge" });
        executions.push(args.input);
        return {
          outcome: "committed",
          receipt: {
            schema: "zotero-agents.mutation-receipt.v1",
            receiptId: "changed-plan-receipt",
            operationId: "changed-plan-operation",
            operation: "item.updateMetadata",
            outcome: "committed",
            committedAt: "2026-09-06T00:00:00.000Z",
            effectDigest: "changed-plan-digest",
            changes: [],
          },
          result: {},
        };
      },
    } as unknown as ZoteroHostCanonicalMutationControl;

    const result = await executeHostBridgeCanonicalMutation({
      broker: createFailClosedZoteroHostCapabilityBroker(),
      request,
      mutationControl,
      approve: () => {
        approvalCount += 1;
      },
    });

    assert.strictEqual(approvalCount, 2);
    assert.strictEqual(prepareCount, 3);
    assert.deepEqual(executions, [
      {
        operation: "item.updateMetadata",
        operationId: "changed-plan-operation",
        itemRef: { libraryId: 1, key: "ITEM0001" },
        patch: { title: "Changed" },
      },
    ]);
    assert.strictEqual(result.outcome, "committed");
  });

  it("reuses and verifies staged files across approval revalidation", async function () {
    let deferredPrepareCount = 0;
    let verifyCount = 0;
    let disposeCount = 0;
    let prepareCount = 0;
    const request = {
      operation: "attachments.create",
      operationId: "prepared-file-operation",
      placement: { kind: "top_level", libraryId: 1 },
      source: { kind: "stored_file" },
    } as const;
    const mutationControl = {
      async prepare(args: { resources?: BrokerTrustedMutationResources }) {
        prepareCount += 1;
        await args.resources?.deferredStoredAttachment?.prepare();
        return {
          state: "prepared",
          preview: {
            schema: "zotero-agents.mutation-preview.v1",
            operation: "attachments.create",
            outcome: "would_change",
            observedAt: "2026-09-06T00:00:00.000Z",
            domainPlanDigest: "prepared-file-plan",
            plan: { effect: "attachments.create" },
          },
          prepared: {},
        };
      },
      async execute() {
        return {
          outcome: "unchanged",
          receipt: {
            schema: "zotero-agents.mutation-receipt.v1",
            receiptId: "prepared-file-receipt",
            operationId: "prepared-file-operation",
            operation: "attachments.create",
            outcome: "unchanged",
            committedAt: "2026-09-06T00:00:00.000Z",
            effectDigest: "prepared-file-digest",
            changes: [],
          },
          result: {},
        };
      },
    } as unknown as ZoteroHostCanonicalMutationControl;
    const prepared = { snapshot: {} } as unknown as never;
    const resources = {
      deferredStoredAttachment: {
        async prepare() {
          deferredPrepareCount += 1;
          return prepared;
        },
      },
      preparedFiles: {
        async prepareStoredAttachment() {
          throw new Error("unexpected independent staging");
        },
        async resolveStoredAttachment(candidate: unknown) {
          assert.strictEqual(candidate, prepared);
          verifyCount += 1;
          return {} as never;
        },
        async dispose() {
          disposeCount += 1;
        },
      },
    } as unknown as BrokerTrustedMutationResources;

    await executeHostBridgeCanonicalMutation({
      broker: createFailClosedZoteroHostCapabilityBroker(),
      request,
      resources,
      mutationControl,
      approve: () => undefined,
    });

    assert.strictEqual(prepareCount, 2);
    assert.strictEqual(deferredPrepareCount, 1);
    assert.strictEqual(verifyCount, 1);
    assert.strictEqual(disposeCount, 0);
  });

  it("executes a canonical mutation once when no approval continuation is needed", async function () {
    let prepareCount = 0;
    let executeCount = 0;
    const request = {
      operation: "item.updateMetadata",
      operationId: "automatic-mutation-operation",
      itemRef: { libraryId: 1, key: "ITEM0001" },
      patch: { title: "Automatic" },
    } as const;
    const mutationControl = {
      async prepare() {
        prepareCount += 1;
        return {
          state: "prepared",
          preview: {
            schema: "zotero-agents.mutation-preview.v1",
            operation: "item.updateMetadata",
            outcome: "would_change",
            observedAt: "2026-09-06T00:00:00.000Z",
            domainPlanDigest: "automatic-plan",
            plan: { effect: "item.updateMetadata" },
          },
          prepared: {},
        };
      },
      async execute() {
        executeCount += 1;
        return {
          outcome: "unchanged",
          receipt: {
            schema: "zotero-agents.mutation-receipt.v1",
            receiptId: "automatic-mutation-receipt",
            operationId: "automatic-mutation-operation",
            operation: "item.updateMetadata",
            outcome: "unchanged",
            committedAt: "2026-09-06T00:00:00.000Z",
            effectDigest: "automatic-mutation-digest",
            changes: [],
          },
          result: {},
        };
      },
    } as unknown as ZoteroHostCanonicalMutationControl;

    await executeHostBridgeCanonicalMutation({
      broker: createFailClosedZoteroHostCapabilityBroker(),
      request,
      mutationControl,
    });

    assert.strictEqual(prepareCount, 1);
    assert.strictEqual(executeCount, 1);
  });

  it("transfers prepared-file cleanup to canonical execution", async function () {
    let disposeCount = 0;
    let releaseExecution!: () => void;
    let executionStarted!: () => void;
    const execution = new Promise<void>((resolve) => {
      releaseExecution = resolve;
    });
    const started = new Promise<void>((resolve) => {
      executionStarted = resolve;
    });
    const request = {
      operation: "item.updateMetadata",
      operationId: "deferred-cleanup-operation",
      itemRef: { libraryId: 1, key: "ITEM0001" },
      patch: { title: "Deferred cleanup" },
    } as const;
    const mutationControl = {
      async prepare() {
        return {
          state: "prepared",
          preview: {
            schema: "zotero-agents.mutation-preview.v1",
            operation: "item.updateMetadata",
            outcome: "would_change",
            observedAt: "2026-09-06T00:00:00.000Z",
            domainPlanDigest: "deferred-cleanup-plan",
            plan: { effect: "item.updateMetadata" },
          },
          prepared: {},
        };
      },
      async execute() {
        executionStarted();
        await execution;
        return {
          outcome: "unchanged",
          receipt: {
            schema: "zotero-agents.mutation-receipt.v1",
            receiptId: "deferred-cleanup-receipt",
            operationId: "deferred-cleanup-operation",
            operation: "item.updateMetadata",
            outcome: "unchanged",
            committedAt: "2026-09-06T00:00:00.000Z",
            effectDigest: "deferred-cleanup-digest",
            changes: [],
          },
          result: {},
        };
      },
    } as unknown as ZoteroHostCanonicalMutationControl;
    const resources = {
      preparedFiles: {
        async prepareStoredAttachment() {
          throw new Error("unexpected staging");
        },
        async resolveStoredAttachment() {
          throw new Error("unexpected verification");
        },
        async dispose() {
          disposeCount += 1;
        },
      },
    } as unknown as BrokerTrustedMutationResources;

    const running = executeHostBridgeCanonicalMutation({
      broker: createFailClosedZoteroHostCapabilityBroker(),
      request,
      resources,
      mutationControl,
    });
    await started;
    assert.strictEqual(disposeCount, 0);

    releaseExecution();
    await running;
    assert.strictEqual(disposeCount, 0);
  });

  it("surfaces a typed cleanup error before canonical execution begins", async function () {
    const request = {
      operation: "item.updateMetadata",
      operationId: "cleanup-failure-operation",
      itemRef: { libraryId: 1, key: "ITEM0001" },
      patch: { title: "Cleanup failure" },
    } as const;
    const mutationControl = {
      async prepare() {
        return {
          state: "settled",
          result: {
            outcome: "unchanged",
            receipt: {
              schema: "zotero-agents.mutation-receipt.v1",
              receiptId: "cleanup-failure-receipt",
              operationId: "cleanup-failure-operation",
              operation: "item.updateMetadata",
              outcome: "unchanged",
              committedAt: "2026-09-06T00:00:00.000Z",
              effectDigest: "cleanup-failure-digest",
              changes: [],
            },
            result: {},
          },
        };
      },
      async execute() {
        throw new Error("unexpected execute");
      },
    } as unknown as ZoteroHostCanonicalMutationControl;
    const resources = {
      preparedFiles: {
        async prepareStoredAttachment() {
          throw new Error("unexpected staging");
        },
        async resolveStoredAttachment() {
          throw new Error("unexpected verification");
        },
        async dispose() {
          throw new Error("cleanup failed");
        },
      },
    } as unknown as BrokerTrustedMutationResources;

    let actual: unknown;
    try {
      await executeHostBridgeCanonicalMutation({
        broker: createFailClosedZoteroHostCapabilityBroker(),
        request,
        resources,
        mutationControl,
      });
    } catch (error) {
      actual = error;
    }
    assert.deepInclude(actual, {
      code: "execution_failed",
      details: { phase: "cleanup", recovery: "retry_same_operation" },
    });
  });

  it("preserves the primary error when prepared-file cleanup also fails", async function () {
    const primary = new Error("primary failure");
    const mutationControl = {
      async prepare() {
        throw primary;
      },
      async execute() {
        throw new Error("unexpected execute");
      },
    } as unknown as ZoteroHostCanonicalMutationControl;
    const resources = {
      preparedFiles: {
        async prepareStoredAttachment() {
          throw new Error("unexpected staging");
        },
        async resolveStoredAttachment() {
          throw new Error("unexpected verification");
        },
        async dispose() {
          throw new Error("cleanup failed");
        },
      },
    } as unknown as BrokerTrustedMutationResources;

    let actual: unknown;
    try {
      await executeHostBridgeCanonicalMutation({
        broker: createFailClosedZoteroHostCapabilityBroker(),
        request: {
          operation: "item.updateMetadata",
          operationId: "primary-error-operation",
          itemRef: { libraryId: 1, key: "ITEM0001" },
          patch: { title: "Primary error" },
        },
        resources,
        mutationControl,
      });
    } catch (error) {
      actual = error;
    }
    assert.strictEqual(actual, primary);
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

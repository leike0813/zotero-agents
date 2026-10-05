import { assert } from "chai";
import {
  freezePiToolGatewayTurn,
  type PiGatewayEffect,
} from "../../src/modules/piToolGateway";
import { createPiSynthesisToolDefinitions } from "../../src/modules/piSynthesisToolCatalog";
import { createSynthesisClientFromPort } from "../../src/modules/synthesisClient/clientPortAdapter";
import {
  SynthesisClientError,
  type SynthesisClient,
  type SynthesisPublicMaintenanceOperation,
} from "../../packages/synthesis-contracts/src/index";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPiTrustedNativeExecution } from "../../src/modules/piTrustedNativeExecution";
import { createSynthesisHostExportDeliveryPort } from "../../src/modules/synthesis/exportDeliveryAdapter";
import { createWorkflowHostError } from "../../src/workflows/workflowHostErrorContract";

const workspace = {
  outputResourceKey: "workspace:/owner",
  beginGeneratedTextOutput: async () => ({
    append: async (_text: string) => undefined,
    commit: async () => ({
      path: "/owner/context.json",
      sizeBytes: 2,
      sha256: "sha256:fixture",
    }),
    discard: async () => undefined,
  }),
  materializeGeneratedArchive: async () => ({
    rootPath: "/owner/exports/bundle",
    entryCount: 2,
    totalBytes: 20,
  }),
};

async function gateway(
  definitions: ReturnType<typeof createPiSynthesisToolDefinitions>,
  effects: PiGatewayEffect[] = ["bounded-read"],
  mode: "interactive" | "automatic" = "interactive",
) {
  return freezePiToolGatewayTurn({
    owner: { kind: "conversation", ownerId: "owner" },
    turnId: "turn",
    definitions: [...definitions],
    runtimeCapability: {
      identity: "test",
      availableCapabilityIds: definitions.map((d) => d.capabilityId),
    },
    policy: {
      mode,
      systemAllowedEffects: [
        "bounded-read",
        "workspace-mutation",
        "external-mutation",
      ],
      authorizedEffects: effects,
      authorizedKeys: [],
      maxCalls: 5,
      maxConcurrent: 1,
      maxCost: 5,
    },
    hooks: {
      recordStarted: async () => undefined,
      recordReceipt: async () => undefined,
      recordPermission: async () => undefined,
    },
  });
}

describe("Pi Synthesis tool catalog", function () {
  it("exposes all 29 public tools with unique names and closed canonical inputs", async function () {
    let resolved = false;
    const definitions = createPiSynthesisToolDefinitions({
      workspace,
      resolveSynthesisClient: () => {
        resolved = true;
        throw new Error("unused");
      },
      recordOperation: async () => "entry",
    });
    assert.lengthOf(definitions, 29);
    assert.equal(new Set(definitions.map((d) => d.name)).size, 29);
    assert.equal(new Set(definitions.map((d) => d.capabilityId)).size, 29);
    const turn = await gateway(definitions);
    const result = await turn.executeBatch([
      {
        callId: "bad",
        name: "zotero_topics_list",
        arguments: { run_root: "/private" },
      },
    ]);
    assert.isFalse(resolved);
    assert.include(JSON.stringify(result), "invalid");
  });
  it("freezes without resolving the Client and dispatches canonical topic paging", async function () {
    let resolutions = 0;
    let received: unknown;
    const result = {
      topics: [],
      cursor: "",
      next_cursor: "opaque",
      has_more: true,
      returned: 0,
      total: 1,
      limit: 2,
      diagnostics: {
        count: 0,
        total_count: 0,
        source: "rust-topic-application" as const,
      },
    };
    const client = createSynthesisClientFromPort({
      listTopics: async (input) => {
        received = input;
        return result;
      },
    });
    const definitions = createPiSynthesisToolDefinitions({
      workspace,
      resolveSynthesisClient: () => {
        resolutions++;
        return client;
      },
      recordOperation: async () => "entry",
    });
    const turn = await gateway(definitions);
    assert.equal(resolutions, 0);
    const response = await turn.executeBatch([
      {
        callId: "call",
        name: "zotero_topics_list",
        arguments: { limit: 2, cursor: "opaque" },
      },
    ]);
    assert.deepEqual(received, { limit: 2, cursor: "opaque" });
    assert.equal(resolutions, 1);
    assert.include(JSON.stringify(response), "opaque");
  });

  it("keeps safe Client failures and bounds ordinary reads without fallback", async function () {
    for (const failure of [
      new SynthesisClientError("storage_busy", "private", { reason: "busy" }),
      new Error("private-native-cause"),
      null,
    ]) {
      const client = {
        topics: {
          list: async () => {
            if (failure) throw failure;
            return { data: "x".repeat(51 * 1024) };
          },
        },
      } as unknown as SynthesisClient;
      const turn = await gateway(
        createPiSynthesisToolDefinitions({
          workspace,
          resolveSynthesisClient: () => client,
          recordOperation: async () => "entry",
        }),
      );
      const result = await turn.executeBatch([
        {
          callId: "read",
          name: "zotero_topics_list",
          arguments: { cursor: "", limit: 2 },
        },
      ]);
      const text = JSON.stringify(result);
      assert.include(
        text,
        failure instanceof SynthesisClientError
          ? "storage_busy"
          : failure
            ? "internal_error"
            : "resource_limited",
      );
      assert.notInclude(text, "private");
      if (failure instanceof SynthesisClientError) assert.include(text, "busy");
    }
  });

  it("publishes planning context as managed JSON and claims the owner workspace", async function () {
    let text = "";
    const client = {
      topics: {
        getPlanningContext: async () => ({ topics: [], coverage: "complete" }),
      },
    } as unknown as SynthesisClient;
    const definitions = createPiSynthesisToolDefinitions({
      workspace: {
        ...workspace,
        beginGeneratedTextOutput: async () => ({
          ...(await workspace.beginGeneratedTextOutput()),
          append: async (value) => {
            text += value;
          },
        }),
      },
      resolveSynthesisClient: () => client,
      recordOperation: async () => "entry",
    });
    const tool = definitions.find(
      (d) => d.capabilityId === "topics.get_planning_context",
    )!;
    assert.deepEqual(tool.classify({}).resourceKeys, [
      workspace.outputResourceKey,
    ]);
    const turn = await gateway(definitions, [
      "bounded-read",
      "workspace-mutation",
    ]);
    const result = await turn.executeBatch([
      { callId: "file", name: tool.name, arguments: {} },
    ]);
    assert.deepEqual(JSON.parse(text), { topics: [], coverage: "complete" });
    assert.include(JSON.stringify(result), "/owner/context.json");
  });

  it("preserves bounded archive failures and reports pending workspace cleanup", async function () {
    const cases = [
      [
        createWorkflowHostError("resource_limited", "private archive", {
          resource: "bytes",
          limit: 512,
        }),
        "resource_limited",
        "confirmed_none",
      ],
      [
        new Error("pi_generated_archive_canceled"),
        "canceled",
        "confirmed_none",
      ],
      [new Error("pi_managed_cleanup_pending"), "cleanup_pending", "unknown"],
    ] as const;
    for (const [error, code, certainty] of cases) {
      const client = {
        topics: { getPlanningContext: async () => ({ topics: [] }) },
      } as unknown as SynthesisClient;
      const definitions = createPiSynthesisToolDefinitions({
        workspace: {
          ...workspace,
          beginGeneratedTextOutput: async () => {
            throw error;
          },
        },
        resolveSynthesisClient: () => client,
        recordOperation: async () => "entry",
      });
      const result = await definitions
        .find((d) => d.capabilityId === "topics.get_planning_context")!
        .execute(
          {},
          { signal: new AbortController().signal, onUpdate: () => undefined },
        );
      assert.equal(result.code, code);
      assert.equal(result.effectCertainty, certainty);
      assert.notInclude(JSON.stringify(result), "private archive");
    }
  });

  it("writes explicit Topic context delivery without forwarding Pi controls to the Client", async function () {
    let received: unknown;
    let written = "";
    const client = {
      topics: {
        getContext: async (input: unknown) => {
          received = input;
          return { topic_id: "topic", content: "context" };
        },
      },
    } as unknown as SynthesisClient;
    const definitions = createPiSynthesisToolDefinitions({
      workspace: {
        ...workspace,
        beginGeneratedTextOutput: async () => ({
          ...(await workspace.beginGeneratedTextOutput()),
          append: async (value) => {
            written += value;
          },
        }),
      },
      resolveSynthesisClient: () => client,
      recordOperation: async () => "entry",
    });
    const turn = await gateway(definitions, [
      "bounded-read",
      "workspace-mutation",
    ]);
    const result = await turn.executeBatch([
      {
        callId: "context",
        name: "zotero_topics_get_context",
        arguments: { topicId: "topic", view: "full", delivery: "file" },
      },
    ]);
    assert.notExists(result.results[0].failure);
    assert.deepEqual(received, { topicId: "topic", view: "full" });
    assert.deepEqual(JSON.parse(written), {
      topic_id: "topic",
      content: "context",
    });
    assert.include(JSON.stringify(result), "/owner/context.json");
  });

  it("submits approved maintenance once, records acceptance and explicitly queries status", async function () {
    const operation: SynthesisPublicMaintenanceOperation = {
      schema: "synthesis.maintenance_operation.v1",
      operation_id: "operation",
      status: "pending",
    };
    let submitted = 0,
      queried = 0;
    const evidence: unknown[] = [];
    const client = {
      graph: {
        startUpdate: async () => {
          submitted++;
          return operation;
        },
      },
      maintenance: {
        getOperation: async () => {
          queried++;
          return operation;
        },
      },
    } as unknown as SynthesisClient;
    const definitions = createPiSynthesisToolDefinitions({
      workspace,
      resolveSynthesisClient: () => client,
      recordOperation: async (input) => {
        evidence.push(input);
        return "entry";
      },
    });
    const denied = await gateway(definitions, ["bounded-read"], "automatic");
    await denied.executeBatch([
      { callId: "denied", name: "zotero_citation_graph_update", arguments: {} },
    ]);
    assert.equal(submitted, 0);
    const turn = await gateway(definitions, [
      "bounded-read",
      "external-mutation",
    ]);
    const result = await turn.executeBatch([
      { callId: "submit", name: "zotero_citation_graph_update", arguments: {} },
    ]);
    assert.equal(submitted, 1);
    assert.equal(queried, 0);
    assert.deepEqual(evidence, [
      { callId: "submit", sourceTurnId: "turn", operation },
    ]);
    assert.include(JSON.stringify(result), "pending");
    await turn.executeBatch([
      {
        callId: "query",
        name: "zotero_synthesis_operation_get",
        arguments: { operation_id: "operation" },
      },
    ]);
    assert.equal(queried, 1);
  });

  it("does not replay maintenance when accepted evidence cannot be persisted", async function () {
    let submitted = 0;
    const client = {
      references: {
        startRefresh: async () => {
          submitted++;
          return {
            schema: "synthesis.maintenance_operation.v1",
            operation_id: "op",
            status: "pending",
          };
        },
      },
    } as unknown as SynthesisClient;
    const definitions = createPiSynthesisToolDefinitions({
      workspace,
      resolveSynthesisClient: () => client,
      recordOperation: async () => {
        throw new Error("private persistence");
      },
    });
    const turn = await gateway(definitions, [
      "bounded-read",
      "external-mutation",
    ]);
    const result = await turn.executeBatch([
      {
        callId: "submit",
        name: "zotero_reference_sidecar_refresh",
        arguments: {},
      },
    ]);
    assert.equal(submitted, 1);
    assert.include(JSON.stringify(result), "unknown");
    assert.notInclude(JSON.stringify(result), "private persistence");
  });

  it("delivers a real export archive as a complete workspace directory retaining the manifest", async function () {
    const root = await mkdtemp(join(tmpdir(), "pi-synthesis-export-"));
    try {
      await mkdir(join(root, "workspace"));
      const native = await createPiTrustedNativeExecution({
        workspaceRoot: join(root, "workspace"),
        ownerRoot: join(root, "owner"),
        mode: "restricted",
      });
      const manifest = "runtime/payloads/paper-artifacts-manifest.json";
      const delivered = await createSynthesisHostExportDeliveryPort({
        runtimeRoot: join(root, "runtime"),
      }).publishArchive({
        capability: "paper_artifacts.export_filtered",
        displayName: "artifacts.zip",
        entries: [
          { path: manifest, text: '{"papers":[]}' },
          { path: "papers/PAPER001/digest.md", text: "evidence" },
        ],
      });
      assert.equal(delivered.status, "available");
      let mode: unknown;
      const client = {
        artifacts: {
          exportFiltered: async (_input: unknown, delivery: unknown) => {
            mode = delivery;
            return {
              paper_refs: ["1:PAPER001"],
              manifest_file: manifest,
              artifact_statuses: [],
              diagnostics: [],
              delivery: delivered.delivery,
            };
          },
        },
      } as unknown as SynthesisClient;
      const turn = await gateway(
        createPiSynthesisToolDefinitions({
          workspace: native,
          resolveSynthesisClient: () => client,
          recordOperation: async () => "entry",
        }),
        ["bounded-read", "workspace-mutation"],
      );
      const response = await turn.executeBatch([
        {
          callId: "export",
          name: "zotero_paper_artifacts_export_filtered",
          arguments: { paper_refs: ["1:PAPER001"] },
        },
      ]);
      assert.notExists(response.results[0].failure);
      const value = response.results[0].value as {
        rootPath: string;
        manifest_file: string;
      };
      assert.deepEqual(mode, { mode: "remote" });
      assert.equal(value.manifest_file, manifest);
      assert.deepEqual(
        JSON.parse(await readFile(join(value.rootPath, manifest), "utf8")),
        { papers: [] },
      );
      assert.equal(
        await readFile(
          join(value.rootPath, "papers/PAPER001/digest.md"),
          "utf8",
        ),
        "evidence",
      );
      for (const privateField of [
        "fileId",
        "downloadCommand",
        "unpackHint",
        ".zip",
        "staging",
      ])
        assert.notInclude(JSON.stringify(response), privateField);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

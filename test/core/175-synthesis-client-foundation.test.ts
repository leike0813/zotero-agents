import { assert } from "chai";
import fs from "fs";
import path from "path";
import {
  SYNTHESIS_SYNC_CONFLICT_RESOLUTION_ACTIONS,
  SynthesisClientError,
  rebuildSynthesisProtocolCapabilityDto,
  rebuildSynthesisWorkbenchSurfaceResult,
  type SynthesisWorkflowTopicOptionsResult,
} from "../../packages/synthesis-contracts/src/index";
import {
  createSynthesisClientFromPort,
  type SynthesisClientPort,
} from "../../src/modules/synthesisClient/clientPortAdapter";
import { createDefaultSynthesisUiState } from "../../src/modules/synthesis/uiModel";
import {
  toSynthesisUiSnapshotInput,
  toSynthesisWorkbenchPaperDigestReadRequest,
  toSynthesisWorkbenchReadState,
} from "../../src/modules/synthesisClient/workbenchUiAdapter";

const ROOT = path.resolve(import.meta.dirname, "../..");
const createTestSynthesisClient = (
  port: Partial<SynthesisClientPort>,
) => createSynthesisClientFromPort(port as SynthesisClientPort);
const WORKFLOW_REVIEW_RESULT = (
  JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-workflow-review.json",
      ),
      "utf8",
    ),
  ) as { cases: Array<{ id: string; value: unknown }> }
).cases.find(
  (entry) => entry.id === "workflow-review-recursive-positive",
)!.value;

function parentRef(value: number) {
  return { libraryId: 1, itemKey: `ITEM${String(value).padStart(4, "0")}` };
}

function maintenanceOperation(operationId: string) {
  return {
    schema: "synthesis.maintenance_operation.v1",
    operation_id: operationId,
    status: "completed",
  } as const;
}

function topicGraphMutation(overrides: Record<string, unknown> = {}) {
  return {
    status: "committed",
    manifestHash: null,
    revision: 1,
    changedNodeIds: [],
    changedEdgeIds: [],
    reviewIds: [],
    diagnostics: [],
    ...overrides,
  };
}

function conceptMutation(overrides: Record<string, unknown> = {}) {
  return {
    status: "committed",
    manifestHash: null,
    revision: 1,
    changedConceptIds: [],
    reviewIds: [],
    diagnostics: [],
    ...overrides,
  };
}

describe("Synthesis client foundation", function () {
  it("classifies non-JSON capability values by protocol direction", function () {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const invalidValues = [
      { value: new Date("2026-08-12T00:00:00.000Z") },
      { value: undefined },
      cyclic,
    ];

    for (const direction of ["request", "result"] as const) {
      for (const value of invalidValues) {
        let failure: unknown;
        try {
          rebuildSynthesisProtocolCapabilityDto({
            capability: "client.isBuiltinTagPolicyInitialized",
            direction,
            value,
          });
        } catch (error) {
          failure = error;
        }
        assert.instanceOf(failure, SynthesisClientError);
        assert.equal(
          (failure as SynthesisClientError).code,
          direction === "request" ? "invalid_request" : "internal",
        );
      }
    }
  });

  it("keeps the contracts package environment-neutral and independently checked", function () {
    const packageRoot = path.join(ROOT, "packages/synthesis-contracts");
    const source = fs
      .readdirSync(path.join(packageRoot, "src"), { recursive: true })
      .filter((entry) => String(entry).endsWith(".ts"))
      .map((entry) =>
        fs.readFileSync(path.join(packageRoot, "src", String(entry)), "utf8"),
      )
      .join("\n");
    const tsconfig = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "tsconfig.json"), "utf8"),
    ) as { compilerOptions?: { lib?: string[]; types?: string[] } };
    const rootPackage = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string>; workspaces?: string[] };
    const contractIndex = fs.readFileSync(
      path.join(packageRoot, "src/index.ts"),
      "utf8",
    );

    assert.deepEqual(tsconfig.compilerOptions?.lib, ["ES2022"]);
    assert.deepEqual(tsconfig.compilerOptions?.types, []);
    assert.include(rootPackage.workspaces, "packages/*");
    assert.include(rootPackage.scripts?.build, "check:synthesis-contracts");
    assert.include(contractIndex, 'export * from "./exportDelivery"');
    assert.notMatch(
      source,
      /(?:from\s+|import\s*\()["'](?:node:|zotero-|\.\.\/\.\.\/src|\.\.\/\.\.\/\.\.\/src)/,
    );
    assert.notMatch(source, /\b(?:Zotero|Window|Document|HTMLElement)\b/);
  });

  it("routes the Topic option use case through a grouped narrow port", async function () {
    let requestedFilter = "";
    const expected: SynthesisWorkflowTopicOptionsResult = {
      options: [
        {
          value: "topic-alpha",
          label: "Alpha",
          description: "Update",
          meta: {
            kind: "synthesis.topic",
            topicId: "topic-alpha",
            title: "Alpha",
          },
        },
      ],
      diagnostics: [],
    };
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions(args) {
        requestedFilter = args?.filter || "";
        return expected;
      },
    });

    assert.deepEqual(
      await client.topics.listWorkflowOptions({ filter: "updatable" }),
      expected,
    );
    assert.equal(requestedFilter, "updatable");
    assert.notProperty(client, "listWorkflowTopicOptions");
  });

  it("normalizes ordinary failures to a stable client error", async function () {
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        throw new Error("legacy exploded");
      },
    });

    try {
      await client.topics.listWorkflowOptions({ filter: "all" });
      assert.fail("expected the client call to reject");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "internal");
      assert.equal((error as SynthesisClientError).details?.causeName, "Error");
    }
  });

  it("preserves existing stable client errors", async function () {
    const expected = new SynthesisClientError("timeout", "timed out", {
      operation: "topics.listWorkflowOptions",
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        throw expected;
      },
    });

    try {
      await client.topics.listWorkflowOptions({ filter: "all" });
      assert.fail("expected the client call to reject");
    } catch (error) {
      assert.strictEqual(error, expected);
    }
  });

  it("routes strict Topic commands through narrow normalized ports", async function () {
    const calls: Array<{ operation: string; request?: unknown }> = [];
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async deleteTopicArtifact(request) {
        calls.push({ operation: "delete", request });
        return {
          ok: true,
          topic_id: request.topicId,
          deleted_at: "2026-07-15T00:00:00.000Z",
        };
      },
      async purgeDeletedTopicArtifacts() {
        calls.push({ operation: "purge" });
        return { ok: true, status: "purged", purged_count: 2 };
      },
      async rejectTopicDiscoveryHint(request) {
        calls.push({ operation: "reject", request });
        return {
          ok: false,
          status: "not_found",
          diagnostics: [{ code: "topic_discovery_hint_not_found" }],
        };
      },
      async restoreTopicDiscoveryHint(request) {
        calls.push({ operation: "restore", request });
        return { ok: true, status: "open" };
      },
    });

    assert.deepEqual(
      await client.topics.deleteTopicArtifact({
        topicId: " topic-alpha ",
        unexpected: "discard",
      } as never),
      {
        ok: true,
        topic_id: "topic-alpha",
        deleted_at: "2026-07-15T00:00:00.000Z",
      },
    );
    assert.deepEqual(await client.topics.purgeDeletedTopicArtifacts(), {
      ok: true,
      status: "purged",
      purged_count: 2,
    });
    assert.deepEqual(
      await client.topics.rejectTopicDiscoveryHint({
        hintId: " hint-1 ",
        unexpected: "discard",
      } as never),
      {
        ok: false,
        status: "not_found",
        diagnostics: [{ code: "topic_discovery_hint_not_found" }],
      },
    );
    assert.deepEqual(
      await client.topics.restoreTopicDiscoveryHint({ hintId: " hint-2 " }),
      { ok: true, status: "open" },
    );
    assert.deepEqual(calls, [
      { operation: "delete", request: { topicId: "topic-alpha" } },
      { operation: "purge" },
      { operation: "reject", request: { hintId: "hint-1" } },
      { operation: "restore", request: { hintId: "hint-2" } },
    ]);
  });

  it("rejects invalid Topic commands before resolving client ports", async function () {
    let invocations = 0;
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async deleteTopicArtifact() {
        invocations += 1;
        return {};
      },
      async rejectTopicDiscoveryHint() {
        invocations += 1;
        return {};
      },
      async restoreTopicDiscoveryHint() {
        invocations += 1;
        return {};
      },
    });
    const invalidRequests: Array<() => Promise<unknown>> = [
      () => missingPortClient.topics.deleteTopicArtifact({ topicId: " " }),
      () => missingPortClient.topics.rejectTopicDiscoveryHint({ hintId: " " }),
      () => client.topics.deleteTopicArtifact(undefined as never),
      () => client.topics.deleteTopicArtifact({ topicId: 1 } as never),
      () =>
        client.topics.deleteTopicArtifact({
          topicId: "topic-alpha",
          callback: (() => undefined) as never,
        } as never),
      () => client.topics.rejectTopicDiscoveryHint({ hintId: false } as never),
      () => client.topics.restoreTopicDiscoveryHint({ hintId: "" }),
    ];

    for (const run of invalidRequests) {
      try {
        await run();
        assert.fail("expected the Topic request to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }
    assert.equal(invocations, 0);
  });

  it("normalizes missing and failed Topic command ports", async function () {
    const preserved = new SynthesisClientError("conflict", "restore conflict");
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async deleteTopicArtifact() {
        throw new Error("delete exploded");
      },
      async rejectTopicDiscoveryHint() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
      async restoreTopicDiscoveryHint() {
        throw preserved;
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      {
        run: () => client.topics.purgeDeletedTopicArtifacts(),
        code: "unavailable",
      },
      {
        run: () =>
          client.topics.deleteTopicArtifact({ topicId: "topic-alpha" }),
        code: "internal",
      },
      {
        run: () => client.topics.rejectTopicDiscoveryHint({ hintId: "hint-1" }),
        code: "storage_busy",
      },
      {
        run: () =>
          client.topics.restoreTopicDiscoveryHint({ hintId: "hint-2" }),
        code: "conflict",
        expected: preserved,
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the Topic command to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes strict Topic Graph commands through narrow normalized ports", async function () {
    const calls: Array<{ operation: string; request?: unknown }> = [];
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async rebuildTopicGraphIndex() {
        calls.push({ operation: "rebuild" });
        return maintenanceOperation("topic-graph:rebuild");
      },
      async acceptTopicGraphRelation(request) {
        calls.push({ operation: "accept", request });
        return topicGraphMutation({
          status: "not_found",
          changedEdgeIds: [request.edgeId],
        });
      },
      async rejectTopicGraphRelation(request) {
        calls.push({ operation: "reject", request });
        return topicGraphMutation({ changedEdgeIds: [request.edgeId] });
      },
      async applyTopicGraphReviewAction(request) {
        calls.push({ operation: "review", request });
        return topicGraphMutation({ reviewIds: [request.reviewId] });
      },
    });

    assert.deepEqual(
      await client.topicGraph.rebuildTopicGraphIndex(),
      maintenanceOperation("topic-graph:rebuild"),
    );
    assert.deepEqual(
      await client.topicGraph.acceptTopicGraphRelation({
        edgeId: " edge-1 ",
        unexpected: "discard",
      } as never),
      topicGraphMutation({ status: "not_found", changedEdgeIds: ["edge-1"] }),
    );
    assert.deepEqual(
      await client.topicGraph.rejectTopicGraphRelation({ edgeId: " edge-2 " }),
      topicGraphMutation({ changedEdgeIds: ["edge-2"] }),
    );
    assert.deepEqual(
      await client.topicGraph.applyTopicGraphReviewAction({
        reviewId: " review-1 ",
        action: "approve_suggested",
        unexpected: "discard",
      } as never),
      topicGraphMutation({ reviewIds: ["review-1"] }),
    );
    assert.deepEqual(calls, [
      { operation: "rebuild" },
      { operation: "accept", request: { edgeId: "edge-1" } },
      { operation: "reject", request: { edgeId: "edge-2" } },
      {
        operation: "review",
        request: { reviewId: "review-1", action: "approve_suggested" },
      },
    ]);
  });

  it("rejects invalid Topic Graph commands before resolving client ports", async function () {
    let invocations = 0;
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async acceptTopicGraphRelation() {
        invocations += 1;
        return {};
      },
      async rejectTopicGraphRelation() {
        invocations += 1;
        return {};
      },
      async applyTopicGraphReviewAction() {
        invocations += 1;
        return {};
      },
    });
    const invalidRequests: Array<() => Promise<unknown>> = [
      () =>
        missingPortClient.topicGraph.acceptTopicGraphRelation({ edgeId: " " }),
      () =>
        missingPortClient.topicGraph.applyTopicGraphReviewAction({
          reviewId: " ",
          action: "reject",
        }),
      () => client.topicGraph.acceptTopicGraphRelation(undefined as never),
      () => client.topicGraph.acceptTopicGraphRelation({ edgeId: 1 } as never),
      () =>
        client.topicGraph.rejectTopicGraphRelation({
          edgeId: "edge-1",
          callback: (() => undefined) as never,
        } as never),
      () =>
        client.topicGraph.applyTopicGraphReviewAction({
          reviewId: "review-1",
          action: "approve",
        } as never),
      () =>
        client.topicGraph.applyTopicGraphReviewAction({
          reviewId: false,
          action: "reject",
        } as never),
    ];

    for (const run of invalidRequests) {
      try {
        await run();
        assert.fail("expected the Topic Graph request to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }
    assert.equal(invocations, 0);
  });

  it("normalizes missing and failed Topic Graph command ports", async function () {
    const preserved = new SynthesisClientError("conflict", "review conflict");
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async rebuildTopicGraphIndex() {
        return undefined;
      },
      async acceptTopicGraphRelation() {
        throw new Error("accept exploded");
      },
      async rejectTopicGraphRelation() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
      async applyTopicGraphReviewAction() {
        throw preserved;
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      {
        run: () => missingPortClient.topicGraph.rebuildTopicGraphIndex(),
        code: "unavailable",
      },
      {
        run: () => client.topicGraph.rebuildTopicGraphIndex(),
        code: "internal",
      },
      {
        run: () =>
          client.topicGraph.acceptTopicGraphRelation({ edgeId: "edge-1" }),
        code: "internal",
      },
      {
        run: () =>
          client.topicGraph.rejectTopicGraphRelation({ edgeId: "edge-2" }),
        code: "storage_busy",
      },
      {
        run: () =>
          client.topicGraph.applyTopicGraphReviewAction({
            reviewId: "review-1",
            action: "reject",
          }),
        code: "conflict",
        expected: preserved,
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the Topic Graph command to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes WebDAV Sync through five narrow normalized ports", async function () {
    const calls: Array<{ operation: string; request?: unknown }> = [];
    const result = (operation: string) => ({
      ok: true,
      operation,
      completed_at: "2026-07-16T00:00:00.000Z",
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async syncWebDavNow() {
        calls.push({ operation: "webdav.run" });
        return result("webdav.run");
      },
      async pauseWebDavSync() {
        calls.push({ operation: "webdav.pause" });
        return result("webdav.pause");
      },
      async resumeWebDavSync() {
        calls.push({ operation: "webdav.resume" });
        return result("webdav.resume");
      },
      async retryWebDavSync() {
        calls.push({ operation: "webdav.retry" });
        return result("webdav.retry");
      },
      async resolveWebDavSyncConflict(request) {
        calls.push({ operation: "webdav.resolve", request });
        return result("webdav.resolve");
      },
    });

    const actual = [
      await client.sync.webDav.runNow(),
      await client.sync.webDav.pause(),
      await client.sync.webDav.resume(),
      await client.sync.webDav.retry(),
      await client.sync.webDav.resolveConflict({
        action: "clear_after_manual_edit",
        unknown: "discard",
      } as never),
    ];

    assert.lengthOf(actual, 5);
    assert.notProperty(client.sync, "git");
    for (const entry of actual) {
      assert.equal(entry.completed_at, "2026-07-16T00:00:00.000Z");
      assert.notProperty(entry, "optional_field");
    }
    assert.deepEqual(calls, [
      { operation: "webdav.run" },
      { operation: "webdav.pause" },
      { operation: "webdav.resume" },
      { operation: "webdav.retry" },
      {
        operation: "webdav.resolve",
        request: { action: "clear_after_manual_edit" },
      },
    ]);
    assert.deepEqual(SYNTHESIS_SYNC_CONFLICT_RESOLUTION_ACTIONS, [
      "keep_local",
      "use_remote",
      "save_remote_copy",
      "mark_needs_attention",
      "clear_after_manual_edit",
      "skip",
      "resolved",
    ]);
  });

  it("rejects invalid Sync conflict requests before resolving ports", async function () {
    let invocations = 0;
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async resolveWebDavSyncConflict() {
        invocations += 1;
        return {};
      },
    });
    const invalidRequests: Array<() => Promise<unknown>> = [
      () =>
        missingPortClient.sync.webDav.resolveConflict({ action: "" } as never),
      () => client.sync.webDav.resolveConflict(undefined as never),
      () => client.sync.webDav.resolveConflict({ action: "approve" } as never),
      () =>
        client.sync.webDav.resolveConflict({
          action: "keep_local",
          callback: (() => undefined) as never,
        } as never),
      () => client.sync.webDav.resolveConflict([] as never),
    ];

    for (const run of invalidRequests) {
      try {
        await run();
        assert.fail("expected the Sync request to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }
    assert.equal(invocations, 0);
  });

  it("normalizes missing, failed, busy, preserved, and invalid Sync results", async function () {
    const preserved = new SynthesisClientError("conflict", "sync conflict");
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async syncWebDavNow() {
        return undefined;
      },
      async pauseWebDavSync() {
        throw new Error("pause exploded");
      },
      async resumeWebDavSync() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
      async retryWebDavSync() {
        throw preserved;
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      { run: () => missingPortClient.sync.webDav.pause(), code: "unavailable" },
      { run: () => client.sync.webDav.runNow(), code: "internal" },
      { run: () => client.sync.webDav.pause(), code: "internal" },
      { run: () => client.sync.webDav.resume(), code: "storage_busy" },
      {
        run: () => client.sync.webDav.retry(),
        code: "conflict",
        expected: preserved,
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the Sync command to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes Tag vocabulary maintenance and export through normalized ports", async function () {
    const calls: string[] = [];
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async validateTagVocabulary() {
        calls.push("validate");
        return [
          {
            code: "missing_replacement",
            severity: "warning",
            message: "Replacement is missing",
          },
        ];
      },
      async rebuildTagVocabularyIndex() {
        calls.push("rebuild");
        return maintenanceOperation("tag-vocabulary:rebuild");
      },
      async exportTagVocabularyForRegulator() {
        calls.push("export");
        return ["data:coco", "model:detr"];
      },
    });

    assert.deepEqual(await client.tags.validateTagVocabulary(), [
      {
        code: "missing_replacement",
        severity: "warning",
        message: "Replacement is missing",
      },
    ]);
    assert.deepEqual(
      await client.tags.rebuildTagVocabularyIndex(),
      maintenanceOperation("tag-vocabulary:rebuild"),
    );
    assert.deepEqual(await client.tags.exportTagVocabularyForRegulator(), [
      "data:coco",
      "model:detr",
    ]);
    assert.deepEqual(calls, ["validate", "rebuild", "export"]);
  });

  it("normalizes missing and failed Tag vocabulary maintenance ports", async function () {
    const preserved = new SynthesisClientError("conflict", "tag conflict");
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async validateTagVocabulary() {
        throw preserved;
      },
      async rebuildTagVocabularyIndex() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
      async exportTagVocabularyForRegulator() {
        return ["valid", 7];
      },
    });
    const invalidResultClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async validateTagVocabulary() {
        return undefined;
      },
      async rebuildTagVocabularyIndex() {
        return [];
      },
    });
    const ordinaryFailureClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async validateTagVocabulary() {
        throw new Error("validation exploded");
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      {
        run: () => missingPortClient.tags.validateTagVocabulary(),
        code: "unavailable",
      },
      {
        run: () => missingPortClient.tags.rebuildTagVocabularyIndex(),
        code: "unavailable",
      },
      {
        run: () => missingPortClient.tags.exportTagVocabularyForRegulator(),
        code: "unavailable",
      },
      {
        run: () => client.tags.validateTagVocabulary(),
        code: "conflict",
        expected: preserved,
      },
      {
        run: () => client.tags.rebuildTagVocabularyIndex(),
        code: "storage_busy",
      },
      {
        run: () => client.tags.exportTagVocabularyForRegulator(),
        code: "internal",
      },
      {
        run: () => invalidResultClient.tags.validateTagVocabulary(),
        code: "internal",
      },
      {
        run: () => invalidResultClient.tags.rebuildTagVocabularyIndex(),
        code: "internal",
      },
      {
        run: () => ordinaryFailureClient.tags.validateTagVocabulary(),
        code: "internal",
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the Tag vocabulary operation to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes strict Tag import commands through normalized ports", async function () {
    const calls: Array<{ operation: string; request: unknown }> = [];
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async previewTagVocabularyImport(request) {
        calls.push({ operation: "preview", request });
        return {
          action: "preview",
          builtins: [],
          additions: [],
          unchanged: [],
          conflicts: [],
          warnings: [],
          previewDigest:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        };
      },
      async applyTagVocabularyImport(request) {
        calls.push({ operation: "apply", request });
        return {
          status: "conflict",
          vocabularyHash: null,
          stagedRevision: 0,
          changedTags: [],
          warnings: [],
          diagnostics: [],
        };
      },
    });

    assert.deepEqual(
      await client.tags.previewTagVocabularyImport({
        payload: '  {"entries":[]}\n',
        unexpected: "discard",
      } as never),
      {
        action: "preview",
        builtins: [],
        additions: [],
        unchanged: [],
        conflicts: [],
        warnings: [],
        previewDigest:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    );
    assert.deepEqual(
      await client.tags.applyTagVocabularyImport({
        payload: '\n{"entries":[]}  ',
        action: "merge-non-conflicting",
        unexpected: "discard",
      } as never),
      {
        status: "conflict",
        vocabularyHash: null,
        stagedRevision: 0,
        changedTags: [],
        warnings: [],
        diagnostics: [],
      },
    );
    assert.deepEqual(calls, [
      {
        operation: "preview",
        request: { payload: '  {"entries":[]}\n' },
      },
      {
        operation: "apply",
        request: {
          payload: '\n{"entries":[]}  ',
          action: "merge-non-conflicting",
        },
      },
    ]);
  });

  it("rejects invalid Tag import requests before resolving client ports", async function () {
    let invocations = 0;
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async previewTagVocabularyImport() {
        invocations += 1;
        return {};
      },
      async applyTagVocabularyImport() {
        invocations += 1;
        return {};
      },
    });
    const invalidRequests: Array<() => Promise<unknown>> = [
      () => missingPortClient.tags.previewTagVocabularyImport({ payload: " " }),
      () => client.tags.previewTagVocabularyImport(undefined as never),
      () => client.tags.previewTagVocabularyImport({} as never),
      () => client.tags.previewTagVocabularyImport({ payload: 7 } as never),
      () =>
        client.tags.previewTagVocabularyImport({
          payload: "{}",
          callback: (() => undefined) as never,
        } as never),
      () =>
        client.tags.applyTagVocabularyImport({
          payload: "{}",
          action: "keep-local",
        } as never),
      () =>
        client.tags.applyTagVocabularyImport({
          payload: " ",
          action: "use-imported",
        }),
    ];

    for (const run of invalidRequests) {
      try {
        await run();
        assert.fail("expected the Tag import request to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }
    assert.equal(invocations, 0);
  });

  it("normalizes missing and failed Tag import ports", async function () {
    const preserved = new SynthesisClientError("conflict", "import conflict");
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async previewTagVocabularyImport() {
        throw preserved;
      },
      async applyTagVocabularyImport() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
    });
    const ordinaryFailureClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async previewTagVocabularyImport() {
        throw new Error("invalid Tag import JSON");
      },
    });
    const invalidResultClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async previewTagVocabularyImport() {
        return [];
      },
      async applyTagVocabularyImport() {
        return undefined;
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      {
        run: () =>
          missingPortClient.tags.previewTagVocabularyImport({ payload: "{}" }),
        code: "unavailable",
      },
      {
        run: () =>
          missingPortClient.tags.applyTagVocabularyImport({
            payload: "{}",
            action: "use-imported",
          }),
        code: "unavailable",
      },
      {
        run: () => client.tags.previewTagVocabularyImport({ payload: "{}" }),
        code: "conflict",
        expected: preserved,
      },
      {
        run: () =>
          client.tags.applyTagVocabularyImport({
            payload: "{}",
            action: "merge-non-conflicting",
          }),
        code: "storage_busy",
      },
      {
        run: () =>
          ordinaryFailureClient.tags.previewTagVocabularyImport({
            payload: "not-json",
          }),
        code: "internal",
      },
      {
        run: () =>
          invalidResultClient.tags.previewTagVocabularyImport({
            payload: "{}",
          }),
        code: "internal",
      },
      {
        run: () =>
          invalidResultClient.tags.applyTagVocabularyImport({
            payload: "{}",
            action: "use-imported",
          }),
        code: "internal",
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the Tag import operation to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes strict staged Tag bulk commands through normalized ports", async function () {
    const calls: Array<{ operation: string; request?: unknown }> = [];
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async promoteStagedTagSuggestions(request) {
        calls.push({ operation: "promote", request });
        return {
          promoted: request.tags.slice(0, 1),
          skipped: request.tags.slice(1),
        };
      },
      async discardStagedTagSuggestions(request) {
        calls.push({ operation: "discard", request });
        return { discarded: request.tags };
      },
      async clearStagedTagSuggestions() {
        calls.push({ operation: "clear" });
        return { discarded: ["topic:remaining"] };
      },
    });

    assert.deepEqual(
      await client.tags.promoteStagedTagSuggestions({
        tags: [" topic:candidate ", "topic:candidate"],
        unexpected: "discard",
      } as never),
      {
        promoted: ["topic:candidate"],
        skipped: ["topic:candidate"],
      },
    );
    assert.deepEqual(
      await client.tags.discardStagedTagSuggestions({ tags: [] }),
      {
        discarded: [],
      },
    );
    assert.deepEqual(await client.tags.clearStagedTagSuggestions(), {
      discarded: ["topic:remaining"],
    });
    assert.deepEqual(calls, [
      {
        operation: "promote",
        request: { tags: ["topic:candidate", "topic:candidate"] },
      },
      { operation: "discard", request: { tags: [] } },
      { operation: "clear" },
    ]);
  });

  it("routes strict staged Tag updates through a canonical normalized port", async function () {
    let captured: unknown;
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async updateStagedTagSuggestion(request) {
        captured = request;
        return {
          staged: [
            {
              tag: request.tag,
              facet: request.facet,
              note: request.note,
              source_flow: request.sourceFlow,
              parent_bindings: request.parentBindings,
              created_at: "2026-07-16T00:00:00.000Z",
              updated_at: "2026-07-16T00:00:00.000Z",
            },
          ],
        };
      },
    });

    assert.deepEqual(
      await client.tags.updateStagedTagSuggestion({
        originalTag: " topic:old ",
        tag: " topic:new ",
        facet: " topic ",
        note: " replacement note ",
        sourceFlow: " tag-regulator-suggest ",
        parentBindings: [parentRef(9), parentRef(2), parentRef(9)],
        unexpected: "discard",
      } as never),
      {
        staged: [
          {
            tag: "topic:new",
            facet: "topic",
            note: "replacement note",
            source_flow: "tag-regulator-suggest",
            parent_bindings: [parentRef(2), parentRef(9)],
            created_at: "2026-07-16T00:00:00.000Z",
            updated_at: "2026-07-16T00:00:00.000Z",
          },
        ],
      },
    );
    assert.deepEqual(captured, {
      originalTag: "topic:old",
      tag: "topic:new",
      facet: "topic",
      note: "replacement note",
      sourceFlow: "tag-regulator-suggest",
      parentBindings: [parentRef(2), parentRef(9)],
    });
  });

  it("rejects invalid staged Tag updates before resolving the client port", async function () {
    let invocations = 0;
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async updateStagedTagSuggestion() {
        invocations += 1;
        return {};
      },
    });
    const valid = {
      originalTag: "topic:old",
      tag: "topic:new",
      facet: "topic",
      note: "",
      sourceFlow: "tag-regulator-suggest",
      parentBindings: [],
    };
    const invalidRequests: unknown[] = [
      undefined,
      { ...valid, originalTag: " " },
      { ...valid, tag: "" },
      { ...valid, facet: false },
      { ...valid, note: null },
      { ...valid, sourceFlow: " " },
      { ...valid, parentBindings: "1" },
      { ...valid, parentBindings: [1, 0] },
      { ...valid, parentBindings: [1, 1.5] },
      { ...valid, parentBindings: [1, "2"] },
      { ...valid, callback: () => undefined },
    ];

    for (const [index, request] of invalidRequests.entries()) {
      const target = index === 1 ? missingPortClient : client;
      try {
        await target.tags.updateStagedTagSuggestion(request as never);
        assert.fail("expected the staged Tag update to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }
    assert.equal(invocations, 0);
  });

  it("normalizes missing and failed staged Tag update ports", async function () {
    const request = {
      originalTag: "topic:old",
      tag: "topic:new",
      facet: "topic",
      note: "",
      sourceFlow: "tag-regulator-suggest",
      parentBindings: [],
    };
    const preserved = new SynthesisClientError("conflict", "tag conflict");
    const clients = {
      missing: createTestSynthesisClient({
        async listWorkflowTopicOptions() {
          return { options: [], diagnostics: [] };
        },
      }),
      preserved: createTestSynthesisClient({
        async listWorkflowTopicOptions() {
          return { options: [], diagnostics: [] };
        },
        async updateStagedTagSuggestion() {
          throw preserved;
        },
      }),
      busy: createTestSynthesisClient({
        async listWorkflowTopicOptions() {
          return { options: [], diagnostics: [] };
        },
        async updateStagedTagSuggestion() {
          throw Object.assign(new Error("database is locked"), {
            code: "SQLITE_BUSY",
          });
        },
      }),
      ordinary: createTestSynthesisClient({
        async listWorkflowTopicOptions() {
          return { options: [], diagnostics: [] };
        },
        async updateStagedTagSuggestion() {
          throw new Error("update exploded");
        },
      }),
      invalidResult: createTestSynthesisClient({
        async listWorkflowTopicOptions() {
          return { options: [], diagnostics: [] };
        },
        async updateStagedTagSuggestion() {
          return [];
        },
      }),
    };
    const cases = [
      { client: clients.missing, code: "unavailable" },
      { client: clients.preserved, code: "conflict", expected: preserved },
      { client: clients.busy, code: "storage_busy" },
      { client: clients.ordinary, code: "internal" },
      { client: clients.invalidResult, code: "internal" },
    ];

    for (const testCase of cases) {
      try {
        await testCase.client.tags.updateStagedTagSuggestion(request);
        assert.fail("expected the staged Tag update to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes strict Tag Vocabulary entry mutations through canonical normalized ports", async function () {
    const captured: unknown[] = [];
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async updateTagVocabularyEntry(request) {
        captured.push({ operation: "update", request });
        return {
          mutated: true,
          updated: { tag: request.tag, facet: request.facet },
        };
      },
      async deleteTagVocabularyEntry(request) {
        captured.push({ operation: "delete", request });
        return { mutated: true, deleted: [request.originalTag] };
      },
    });

    assert.deepEqual(
      await client.tags.updateTagVocabularyEntry({
        originalTag: " topic:old ",
        tag: " topic:new ",
        facet: " topic ",
        note: "   ",
        unexpected: "discard",
      } as never),
      {
        mutated: true,
        updated: { tag: "topic:new", facet: "topic" },
      },
    );
    assert.deepEqual(
      await client.tags.deleteTagVocabularyEntry({
        originalTag: " topic:new ",
        unexpected: "discard",
      } as never),
      { mutated: true, deleted: ["topic:new"] },
    );
    assert.deepEqual(captured, [
      {
        operation: "update",
        request: {
          originalTag: "topic:old",
          tag: "topic:new",
          facet: "topic",
          note: "",
        },
      },
      {
        operation: "delete",
        request: { originalTag: "topic:new" },
      },
    ]);
  });

  it("validates Tag Vocabulary entry mutations before ports and preserves stable failures", async function () {
    let invocations = 0;
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async updateTagVocabularyEntry() {
        invocations += 1;
        return {};
      },
      async deleteTagVocabularyEntry() {
        invocations += 1;
        return {};
      },
    });
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const invalidRequests: Array<{
      operation: "update" | "delete";
      request: unknown;
    }> = [
      { operation: "update", request: undefined },
      {
        operation: "update",
        request: {
          originalTag: " ",
          tag: "topic:new",
          facet: "topic",
          note: "",
        },
      },
      {
        operation: "update",
        request: {
          originalTag: "topic:old",
          tag: "",
          facet: "topic",
          note: "",
        },
      },
      {
        operation: "update",
        request: {
          originalTag: "topic:old",
          tag: "topic:new",
          facet: false,
          note: "",
        },
      },
      {
        operation: "update",
        request: {
          originalTag: "topic:old",
          tag: "topic:new",
          facet: "topic",
          note: null,
        },
      },
      { operation: "delete", request: undefined },
      { operation: "delete", request: { originalTag: " " } },
    ];
    for (const { operation, request } of invalidRequests) {
      try {
        if (operation === "update") {
          await client.tags.updateTagVocabularyEntry(request as never);
        } else {
          await client.tags.deleteTagVocabularyEntry(request as never);
        }
        assert.fail("expected invalid Tag Vocabulary entry mutation");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }
    try {
      await missingPortClient.tags.updateTagVocabularyEntry({
        originalTag: "topic:old",
        tag: "topic:new",
        facet: "topic",
        note: "",
      });
      assert.fail("expected missing update port");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "unavailable");
    }
    assert.equal(invocations, 0);

    const request = {
      originalTag: "topic:old",
      tag: "topic:new",
      facet: "topic",
      note: "",
    };
    const preserved = new SynthesisClientError("conflict", "tag conflict");
    const cases = [
      {
        code: "conflict",
        expected: preserved,
        port: async () => {
          throw preserved;
        },
      },
      {
        code: "storage_busy",
        port: async () => {
          throw Object.assign(new Error("database is locked"), {
            code: "SQLITE_BUSY",
          });
        },
      },
      {
        code: "internal",
        port: async () => {
          throw new Error("update exploded");
        },
      },
      { code: "internal", port: async () => [] },
    ];
    for (const testCase of cases) {
      const target = createTestSynthesisClient({
        async listWorkflowTopicOptions() {
          return { options: [], diagnostics: [] };
        },
        updateTagVocabularyEntry: testCase.port,
      });
      try {
        await target.tags.updateTagVocabularyEntry(request);
        assert.fail("expected failed Tag Vocabulary update port");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("rejects invalid staged Tag selections before resolving client ports", async function () {
    let invocations = 0;
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async promoteStagedTagSuggestions() {
        invocations += 1;
        return {};
      },
      async discardStagedTagSuggestions() {
        invocations += 1;
        return {};
      },
    });
    const invalidRequests: Array<() => Promise<unknown>> = [
      () => missingPortClient.tags.promoteStagedTagSuggestions({ tags: [" "] }),
      () => client.tags.promoteStagedTagSuggestions(undefined as never),
      () => client.tags.promoteStagedTagSuggestions({} as never),
      () =>
        client.tags.promoteStagedTagSuggestions({ tags: "topic:a" } as never),
      () =>
        client.tags.promoteStagedTagSuggestions({
          tags: ["topic:a", 7],
        } as never),
      () => client.tags.discardStagedTagSuggestions({ tags: ["topic:a", ""] }),
      () =>
        client.tags.discardStagedTagSuggestions({
          tags: ["topic:a"],
          callback: (() => undefined) as never,
        } as never),
    ];

    for (const run of invalidRequests) {
      try {
        await run();
        assert.fail("expected the staged Tag selection to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }
    assert.equal(invocations, 0);
  });

  it("normalizes missing and failed staged Tag bulk ports", async function () {
    const preserved = new SynthesisClientError("conflict", "tag conflict");
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async promoteStagedTagSuggestions() {
        throw preserved;
      },
      async discardStagedTagSuggestions() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
      async clearStagedTagSuggestions() {
        throw new Error("clear exploded");
      },
    });
    const invalidResultClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async promoteStagedTagSuggestions() {
        return [];
      },
      async discardStagedTagSuggestions() {
        return undefined;
      },
      async clearStagedTagSuggestions() {
        return "discarded";
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      {
        run: () =>
          missingPortClient.tags.promoteStagedTagSuggestions({ tags: [] }),
        code: "unavailable",
      },
      {
        run: () =>
          missingPortClient.tags.discardStagedTagSuggestions({ tags: [] }),
        code: "unavailable",
      },
      {
        run: () => missingPortClient.tags.clearStagedTagSuggestions(),
        code: "unavailable",
      },
      {
        run: () => client.tags.promoteStagedTagSuggestions({ tags: [] }),
        code: "conflict",
        expected: preserved,
      },
      {
        run: () => client.tags.discardStagedTagSuggestions({ tags: [] }),
        code: "storage_busy",
      },
      {
        run: () => client.tags.clearStagedTagSuggestions(),
        code: "internal",
      },
      {
        run: () =>
          invalidResultClient.tags.promoteStagedTagSuggestions({ tags: [] }),
        code: "internal",
      },
      {
        run: () =>
          invalidResultClient.tags.discardStagedTagSuggestions({ tags: [] }),
        code: "internal",
      },
      {
        run: () => invalidResultClient.tags.clearStagedTagSuggestions(),
        code: "internal",
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the staged Tag operation to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes the four Citation Graph commands through narrow normalized ports", async function () {
    const calls: Array<{ operation: string; args: unknown[] }> = [];
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async recomputeCitationGraphLayout(request) {
        calls.push({ operation: "layout", args: [request] });
        return {
          ok: true,
          generated_at: "2026-07-15T00:00:00.000Z",
        };
      },
      async rebuildCitationGraphCacheNow() {
        calls.push({ operation: "rebuild", args: [] });
        return { ok: true, status: "ready" };
      },
      async refreshCitationGraphCacheIncrementalNow() {
        calls.push({ operation: "incremental", args: [] });
        return { ok: true, status: "refreshed" };
      },
      async retryCitationGraphCacheRebuild() {
        calls.push({ operation: "retry", args: [] });
        return { ok: true, status: "retried" };
      },
    });

    assert.deepEqual(
      await client.graph.recomputeCitationGraphLayout({
        algorithm: "radial",
        force: true,
      }),
      {
        ok: true,
        generated_at: "2026-07-15T00:00:00.000Z",
      },
    );
    assert.deepEqual(await client.graph.rebuildCitationGraphCacheNow(), {
      ok: true,
      status: "ready",
    });
    assert.deepEqual(
      await client.graph.refreshCitationGraphCacheIncrementalNow(),
      { ok: true, status: "refreshed" },
    );
    assert.deepEqual(await client.graph.retryCitationGraphCacheRebuild(), {
      ok: true,
      status: "retried",
    });
    assert.deepEqual(calls, [
      {
        operation: "layout",
        args: [{ algorithm: "radial", force: true }],
      },
      { operation: "rebuild", args: [] },
      { operation: "incremental", args: [] },
      { operation: "retry", args: [] },
    ]);
  });

  it("validates Citation Graph layout requests before invoking client code", async function () {
    let invocations = 0;
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async recomputeCitationGraphLayout() {
        invocations += 1;
        return {};
      },
    });
    const invalidRequests = [
      undefined,
      { algorithm: "grid" },
      { algorithm: "force", force: "yes" },
      { algorithm: "components", onProgress: () => undefined },
    ];

    for (const request of invalidRequests) {
      try {
        await client.graph.recomputeCitationGraphLayout(request as never);
        assert.fail("expected the Graph layout request to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }
    assert.equal(invocations, 0);
  });

  it("normalizes missing and failed Citation Graph command ports", async function () {
    const preserved = new SynthesisClientError("conflict", "retry conflict");
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async rebuildCitationGraphCacheNow() {
        throw new Error("rebuild exploded");
      },
      async retryCitationGraphCacheRebuild() {
        throw preserved;
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      {
        run: () =>
          client.graph.recomputeCitationGraphLayout({ algorithm: "force" }),
        code: "unavailable",
      },
      {
        run: () => client.graph.rebuildCitationGraphCacheNow(),
        code: "internal",
      },
      {
        run: () => client.graph.retryCitationGraphCacheRebuild(),
        code: "conflict",
        expected: preserved,
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the Graph command to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes the four Reference maintenance commands through narrow normalized ports", async function () {
    const calls: string[] = [];
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async refreshReferenceSidecarNow() {
        calls.push("refresh");
        return maintenanceOperation("references:refresh");
      },
      async retryReferenceSidecarRefresh() {
        calls.push("retry-refresh");
        return maintenanceOperation("references:retry-refresh");
      },
      async runAdvancedReferenceMatchingNow() {
        calls.push("advanced");
        return maintenanceOperation("references:advanced");
      },
      async retryAdvancedReferenceMatching() {
        calls.push("retry-advanced");
        return maintenanceOperation("references:retry-advanced");
      },
    });

    assert.deepEqual(
      await client.references.refreshReferenceSidecarNow(),
      maintenanceOperation("references:refresh"),
    );
    assert.deepEqual(
      await client.references.retryReferenceSidecarRefresh(),
      maintenanceOperation("references:retry-refresh"),
    );
    assert.deepEqual(
      await client.references.runAdvancedReferenceMatchingNow(),
      maintenanceOperation("references:advanced"),
    );
    assert.deepEqual(
      await client.references.retryAdvancedReferenceMatching(),
      maintenanceOperation("references:retry-advanced"),
    );
    assert.deepEqual(calls, [
      "refresh",
      "retry-refresh",
      "advanced",
      "retry-advanced",
    ]);
  });

  it("normalizes missing and failed Reference maintenance ports", async function () {
    const preserved = new SynthesisClientError("conflict", "retry conflict");
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async retryReferenceSidecarRefresh() {
        throw new Error("refresh retry exploded");
      },
      async runAdvancedReferenceMatchingNow() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
      async retryAdvancedReferenceMatching() {
        throw preserved;
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      {
        run: () => client.references.refreshReferenceSidecarNow(),
        code: "unavailable",
      },
      {
        run: () => client.references.retryReferenceSidecarRefresh(),
        code: "internal",
      },
      {
        run: () => client.references.runAdvancedReferenceMatchingNow(),
        code: "storage_busy",
      },
      {
        run: () => client.references.retryAdvancedReferenceMatching(),
        code: "conflict",
        expected: preserved,
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the Reference command to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes strict Reference review and proposal requests through narrow normalized ports", async function () {
    const calls: Array<{ operation: string; request: unknown }> = [];
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async applyCanonicalRevisionReviewAction(request) {
        calls.push({ operation: "canonical", request });
        return {
          ok: true,
          status: "accepted",
          review_item_id: request.reviewItemId,
        };
      },
      async applyReferenceMatchProposalAction(request) {
        calls.push({ operation: "single", request });
        return {
          ok: true,
          status: request.action,
          proposal_id: request.proposalId,
        };
      },
      async applyReferenceMatchProposalActions(request) {
        calls.push({ operation: "batch", request });
        return {
          ok: false,
          applied_count: 0,
          failed_count: 1,
          results: [],
        };
      },
    });

    for (const action of ["accept", "reject"] as const) {
      assert.deepEqual(
        await client.references.applyCanonicalRevisionReviewAction({
          reviewItemId: ` review-${action} `,
          action,
          unexpected: "discard",
        } as never),
        {
          ok: true,
          status: "accepted",
          review_item_id: `review-${action}`,
        },
      );
    }
    for (const action of [
      "accept",
      "reverse_accept",
      "reject",
      "reopen",
      "delete",
    ] as const) {
      assert.deepEqual(
        await client.references.applyReferenceMatchProposalAction({
          proposalId: ` proposal-${action} `,
          action,
          target: { kind: "canonical_reference", canonicalReferenceId: "x" },
          unexpected: "discard",
        } as never),
        {
          ok: true,
          status: action,
          proposal_id: `proposal-${action}`,
        },
      );
    }
    assert.deepEqual(
      await client.references.applyReferenceMatchProposalActions({
        decisions: [
          ...["accept", "reverse_accept", "reject", "reopen", "delete"].map(
            (action) => ({
              proposalId: ` batch-${action} `,
              action,
              target: {
                kind: "canonical_reference",
                canonicalReferenceId: "discard",
              },
              unexpected: "discard",
            }),
          ),
          {
            proposalId: " batch-zotero ",
            action: "manual_target",
            target: {
              kind: "zotero_item",
              libraryId: 2,
              itemKey: " ABCD1234 ",
              unexpected: "discard",
            },
          },
          {
            proposalId: " batch-canonical ",
            action: "manual_target",
            target: {
              kind: "canonical_reference",
              canonicalReferenceId: " canonical-1 ",
              unexpected: "discard",
            },
          },
        ],
        unexpected: "discard",
      } as never),
      {
        ok: false,
        applied_count: 0,
        failed_count: 1,
        results: [],
      },
    );

    assert.deepEqual(calls, [
      {
        operation: "canonical",
        request: { reviewItemId: "review-accept", action: "accept" },
      },
      {
        operation: "canonical",
        request: { reviewItemId: "review-reject", action: "reject" },
      },
      ...["accept", "reverse_accept", "reject", "reopen", "delete"].map(
        (action) => ({
          operation: "single",
          request: { proposalId: `proposal-${action}`, action },
        }),
      ),
      {
        operation: "batch",
        request: {
          decisions: [
            ...["accept", "reverse_accept", "reject", "reopen", "delete"].map(
              (action) => ({
                proposalId: `batch-${action}`,
                action,
              }),
            ),
            {
              proposalId: "batch-zotero",
              action: "manual_target",
              target: {
                kind: "zotero_item",
                libraryId: 2,
                itemKey: "ABCD1234",
              },
            },
            {
              proposalId: "batch-canonical",
              action: "manual_target",
              target: {
                kind: "canonical_reference",
                canonicalReferenceId: "canonical-1",
              },
            },
          ],
        },
      },
    ]);
  });

  it("rejects invalid Reference review and proposal requests before invoking client ports", async function () {
    let invocations = 0;
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async applyCanonicalRevisionReviewAction() {
        invocations += 1;
        return {};
      },
      async applyReferenceMatchProposalAction() {
        invocations += 1;
        return {};
      },
      async applyReferenceMatchProposalActions() {
        invocations += 1;
        return {};
      },
    });
    const invalidRequests: Array<() => Promise<unknown>> = [
      () =>
        missingPortClient.references.applyCanonicalRevisionReviewAction({
          reviewItemId: " ",
          action: "accept",
        }),
      () =>
        missingPortClient.references.applyReferenceMatchProposalAction({
          proposalId: " ",
          action: "accept",
        }),
      () =>
        missingPortClient.references.applyReferenceMatchProposalActions({
          decisions: [],
        }),
      () =>
        client.references.applyCanonicalRevisionReviewAction({
          reviewItemId: " ",
          action: "accept",
        }),
      () =>
        client.references.applyCanonicalRevisionReviewAction({
          reviewItemId: "review-1",
          action: "reopen",
        } as never),
      () =>
        client.references.applyReferenceMatchProposalAction({
          proposalId: "",
          action: "accept",
        }),
      () =>
        client.references.applyReferenceMatchProposalAction({
          proposalId: "proposal-1",
          action: "manual_target",
        } as never),
      () =>
        client.references.applyReferenceMatchProposalActions({ decisions: [] }),
      () =>
        client.references.applyReferenceMatchProposalActions({
          decisions: [{ proposalId: " ", action: "reject" }],
        }),
      () =>
        client.references.applyReferenceMatchProposalActions({
          decisions: [{ proposalId: "proposal-1", action: "invalid" }],
        } as never),
      () =>
        client.references.applyReferenceMatchProposalActions({
          decisions: [{ proposalId: "proposal-1", action: "manual_target" }],
        } as never),
      () =>
        client.references.applyReferenceMatchProposalActions({
          decisions: [
            {
              proposalId: "proposal-1",
              action: "manual_target",
              target: { kind: "external_item", itemKey: "ABCD1234" },
            },
          ],
        } as never),
      ...[0, -1, 1.5].map(
        (libraryId) => () =>
          client.references.applyReferenceMatchProposalActions({
            decisions: [
              {
                proposalId: "proposal-1",
                action: "manual_target",
                target: {
                  kind: "zotero_item",
                  libraryId,
                  itemKey: "ABCD1234",
                },
              },
            ],
          }),
      ),
      () =>
        client.references.applyReferenceMatchProposalActions({
          decisions: [
            {
              proposalId: "proposal-1",
              action: "manual_target",
              target: { kind: "zotero_item", libraryId: 1, itemKey: " " },
            },
          ],
        }),
      () =>
        client.references.applyReferenceMatchProposalActions({
          decisions: [
            {
              proposalId: "proposal-1",
              action: "manual_target",
              target: {
                kind: "canonical_reference",
                canonicalReferenceId: " ",
              },
            },
          ],
        }),
    ];

    for (const run of invalidRequests) {
      try {
        await run();
        assert.fail("expected the Reference review request to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }
    assert.equal(invocations, 0);
  });

  it("normalizes missing and failed Reference review ports", async function () {
    const preserved = new SynthesisClientError("conflict", "review conflict");
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async applyReferenceMatchProposalAction() {
        throw new Error("proposal action exploded");
      },
      async applyReferenceMatchProposalActions() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
    });
    const preservingClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async applyCanonicalRevisionReviewAction() {
        throw preserved;
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      {
        run: () =>
          client.references.applyCanonicalRevisionReviewAction({
            reviewItemId: "review-1",
            action: "accept",
          }),
        code: "unavailable",
      },
      {
        run: () =>
          client.references.applyReferenceMatchProposalAction({
            proposalId: "proposal-1",
            action: "accept",
          }),
        code: "internal",
      },
      {
        run: () =>
          client.references.applyReferenceMatchProposalActions({
            decisions: [{ proposalId: "proposal-1", action: "reject" }],
          }),
        code: "storage_busy",
      },
      {
        run: () =>
          preservingClient.references.applyCanonicalRevisionReviewAction({
            reviewItemId: "review-1",
            action: "reject",
          }),
        code: "conflict",
        expected: preserved,
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the Reference review command to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes strict canonical Reference mutations through narrow normalized ports", async function () {
    const calls: Array<{ operation: string; request: unknown }> = [];
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async mergeEffectiveCanonicalReference(request) {
        calls.push({ operation: "merge", request });
        return {
          ok: false,
          status: "invalid_target",
        };
      },
      async applyCanonicalRevisionMergeRequests(request) {
        calls.push({ operation: "batch", request });
        return {
          ok: false,
          applied_count: 0,
          failed_count: 1,
          results: [],
        };
      },
      async updateCanonicalReferenceMetadata(request) {
        calls.push({ operation: "metadata", request });
        return { ok: false, status: "bound_to_zotero" };
      },
      async archiveCanonicalReference(request) {
        calls.push({ operation: "archive", request });
        return { ok: false, status: "blocked" };
      },
    });

    assert.deepEqual(
      await client.references.mergeEffectiveCanonicalReference({
        sourceEffectiveCanonicalId: " same-id ",
        targetEffectiveCanonicalId: " same-id ",
        confirmRetargetGroup: true,
        unexpected: "discard",
      } as never),
      {
        ok: false,
        status: "invalid_target",
      },
    );
    assert.deepEqual(
      await client.references.mergeEffectiveCanonicalReference({
        sourceEffectiveCanonicalId: " source-2 ",
        targetEffectiveCanonicalId: " target-2 ",
      }),
      {
        ok: false,
        status: "invalid_target",
      },
    );
    assert.deepEqual(
      await client.references.applyCanonicalRevisionMergeRequests({
        requests: [
          {
            sourceEffectiveCanonicalId: " source-1 ",
            targetEffectiveCanonicalId: " target-1 ",
            unexpected: "discard",
          },
        ],
        unexpected: "discard",
      } as never),
      {
        ok: false,
        applied_count: 0,
        failed_count: 1,
        results: [],
      },
    );
    assert.deepEqual(
      await client.references.updateCanonicalReferenceMetadata({
        canonicalReferenceId: " canonical-1 ",
        patch: {
          title: " Title ",
          normalizedTitle: " normalized title ",
          year: " 2026 ",
          authors: [" Author One ", "Author Two"],
          identifiers: { " doi ": " 10.1000/example ", pmid: " 123 " },
          unknown: "discard",
        },
        unexpected: "discard",
      } as never),
      { ok: false, status: "bound_to_zotero" },
    );
    assert.deepEqual(
      await client.references.updateCanonicalReferenceMetadata({
        canonicalReferenceId: "canonical-empty",
        patch: {},
      }),
      { ok: false, status: "bound_to_zotero" },
    );
    assert.deepEqual(
      await client.references.updateCanonicalReferenceMetadata({
        canonicalReferenceId: "canonical-clear",
        patch: { authors: [], identifiers: {} },
      }),
      { ok: false, status: "bound_to_zotero" },
    );
    assert.deepEqual(
      await client.references.archiveCanonicalReference({
        canonicalReferenceId: " canonical-2 ",
        unexpected: "discard",
      } as never),
      { ok: false, status: "blocked" },
    );

    assert.deepEqual(calls, [
      {
        operation: "merge",
        request: {
          sourceEffectiveCanonicalId: "same-id",
          targetEffectiveCanonicalId: "same-id",
          confirmRetargetGroup: true,
        },
      },
      {
        operation: "merge",
        request: {
          sourceEffectiveCanonicalId: "source-2",
          targetEffectiveCanonicalId: "target-2",
          confirmRetargetGroup: false,
        },
      },
      {
        operation: "batch",
        request: {
          requests: [
            {
              sourceEffectiveCanonicalId: "source-1",
              targetEffectiveCanonicalId: "target-1",
            },
          ],
        },
      },
      {
        operation: "metadata",
        request: {
          canonicalReferenceId: "canonical-1",
          patch: {
            title: "Title",
            normalizedTitle: "normalized title",
            year: "2026",
            authors: ["Author One", "Author Two"],
            identifiers: { doi: "10.1000/example", pmid: "123" },
          },
        },
      },
      {
        operation: "metadata",
        request: { canonicalReferenceId: "canonical-empty", patch: {} },
      },
      {
        operation: "metadata",
        request: {
          canonicalReferenceId: "canonical-clear",
          patch: { authors: [], identifiers: {} },
        },
      },
      {
        operation: "archive",
        request: { canonicalReferenceId: "canonical-2" },
      },
    ]);
  });

  it("rejects invalid canonical Reference mutations before resolving client ports", async function () {
    let invocations = 0;
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async mergeEffectiveCanonicalReference() {
        invocations += 1;
        return {};
      },
      async applyCanonicalRevisionMergeRequests() {
        invocations += 1;
        return {};
      },
      async updateCanonicalReferenceMetadata() {
        invocations += 1;
        return {};
      },
      async archiveCanonicalReference() {
        invocations += 1;
        return {};
      },
    });
    const invalidRequests: Array<() => Promise<unknown>> = [
      () =>
        missingPortClient.references.mergeEffectiveCanonicalReference({
          sourceEffectiveCanonicalId: " ",
          targetEffectiveCanonicalId: "target",
        }),
      () =>
        missingPortClient.references.applyCanonicalRevisionMergeRequests({
          requests: [],
        }),
      () =>
        missingPortClient.references.updateCanonicalReferenceMetadata({
          canonicalReferenceId: " ",
          patch: {},
        }),
      () =>
        missingPortClient.references.archiveCanonicalReference({
          canonicalReferenceId: " ",
        }),
      () =>
        client.references.mergeEffectiveCanonicalReference({
          sourceEffectiveCanonicalId: "source",
          targetEffectiveCanonicalId: " ",
        }),
      () =>
        client.references.mergeEffectiveCanonicalReference({
          sourceEffectiveCanonicalId: "source",
          targetEffectiveCanonicalId: "target",
          confirmRetargetGroup: "yes",
        } as never),
      () =>
        client.references.applyCanonicalRevisionMergeRequests({ requests: [] }),
      () =>
        client.references.applyCanonicalRevisionMergeRequests({
          requests: [null],
        } as never),
      () =>
        client.references.applyCanonicalRevisionMergeRequests({
          requests: [
            {
              sourceEffectiveCanonicalId: "source",
              targetEffectiveCanonicalId: " ",
            },
          ],
        }),
      () =>
        client.references.updateCanonicalReferenceMetadata({
          canonicalReferenceId: "canonical-1",
          patch: null,
        } as never),
      ...[
        { title: 2026 },
        { normalizedTitle: false },
        { year: 2026 },
        { authors: "Author" },
        { authors: [" "] },
        { authors: [1] },
        { identifiers: [] },
        { identifiers: { " ": "doi" } },
        { identifiers: { doi: " " } },
        { identifiers: { doi: 1000 } },
      ].map(
        (patch) => () =>
          client.references.updateCanonicalReferenceMetadata({
            canonicalReferenceId: "canonical-1",
            patch,
          } as never),
      ),
      () =>
        client.references.archiveCanonicalReference({
          canonicalReferenceId: "",
        }),
    ];

    for (const run of invalidRequests) {
      try {
        await run();
        assert.fail("expected the canonical Reference request to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }
    assert.equal(invocations, 0);
  });

  it("normalizes missing and failed canonical Reference mutation ports", async function () {
    const preserved = new SynthesisClientError("conflict", "merge conflict");
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async applyCanonicalRevisionMergeRequests() {
        throw new Error("batch merge exploded");
      },
      async updateCanonicalReferenceMetadata() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
      async archiveCanonicalReference() {
        throw preserved;
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      {
        run: () =>
          client.references.mergeEffectiveCanonicalReference({
            sourceEffectiveCanonicalId: "source",
            targetEffectiveCanonicalId: "target",
          }),
        code: "unavailable",
      },
      {
        run: () =>
          client.references.applyCanonicalRevisionMergeRequests({
            requests: [
              {
                sourceEffectiveCanonicalId: "source",
                targetEffectiveCanonicalId: "target",
              },
            ],
          }),
        code: "internal",
      },
      {
        run: () =>
          client.references.updateCanonicalReferenceMetadata({
            canonicalReferenceId: "canonical-1",
            patch: {},
          }),
        code: "storage_busy",
      },
      {
        run: () =>
          client.references.archiveCanonicalReference({
            canonicalReferenceId: "canonical-1",
          }),
        code: "conflict",
        expected: preserved,
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the canonical Reference command to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes strict Concept commands through narrow normalized ports", async function () {
    const calls: Array<{ operation: string; request?: unknown }> = [];
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async rebuildConceptKbIndex() {
        calls.push({ operation: "rebuild" });
        return maintenanceOperation("concept-kb:rebuild");
      },
      async updateConceptDisplayText(request) {
        calls.push({ operation: "display", request });
        return conceptMutation({ changedConceptIds: [request.conceptId] });
      },
      async applyConceptReviewAction(request) {
        calls.push({ operation: "review", request });
        return request.targetConceptId
          ? conceptMutation({
              changedConceptIds: [request.targetConceptId],
              reviewIds: [request.reviewId],
            })
          : conceptMutation({
              status: "not_found",
              reviewIds: [request.reviewId],
            });
      },
      async deleteConceptEntries(request) {
        calls.push({ operation: "delete", request });
        return conceptMutation({
          status: "not_found",
          changedConceptIds: request.conceptIds,
        });
      },
    });

    assert.deepEqual(
      await client.concepts.rebuildConceptKbIndex(),
      maintenanceOperation("concept-kb:rebuild"),
    );
    assert.deepEqual(
      await client.concepts.updateConceptDisplayText({
        conceptId: " concept-1 ",
        fields: {
          short_definition: " Short definition ",
          definition: " Full definition ",
          usage_note: "   ",
          editorial_note: " Editorial note ",
          unknown: "discard",
        },
        unexpected: "discard",
      } as never),
      conceptMutation({ changedConceptIds: ["concept-1"] }),
    );
    assert.deepEqual(
      await client.concepts.applyConceptReviewAction({
        reviewId: " review-1 ",
        action: "merge_into_existing",
        targetConceptId: " target-1 ",
        unexpected: "discard",
      } as never),
      conceptMutation({
        changedConceptIds: ["target-1"],
        reviewIds: ["review-1"],
      }),
    );
    assert.deepEqual(
      await client.concepts.applyConceptReviewAction({
        reviewId: " review-2 ",
        action: "merge_into_existing",
      }),
      conceptMutation({ status: "not_found", reviewIds: ["review-2"] }),
    );
    assert.deepEqual(
      await client.concepts.deleteConceptEntries({
        conceptIds: [" concept-1 ", "concept-2"],
        unexpected: "discard",
      } as never),
      conceptMutation({
        status: "not_found",
        changedConceptIds: ["concept-1", "concept-2"],
      }),
    );

    assert.deepEqual(calls, [
      { operation: "rebuild" },
      {
        operation: "display",
        request: {
          conceptId: "concept-1",
          fields: {
            short_definition: "Short definition",
            definition: "Full definition",
            usage_note: "",
            editorial_note: "Editorial note",
          },
        },
      },
      {
        operation: "review",
        request: {
          reviewId: "review-1",
          action: "merge_into_existing",
          targetConceptId: "target-1",
        },
      },
      {
        operation: "review",
        request: {
          reviewId: "review-2",
          action: "merge_into_existing",
        },
      },
      {
        operation: "delete",
        request: { conceptIds: ["concept-1", "concept-2"] },
      },
    ]);
  });

  it("rejects invalid Concept commands before resolving client ports", async function () {
    let invocations = 0;
    const missingPortClient = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async updateConceptDisplayText() {
        invocations += 1;
        return {};
      },
      async applyConceptReviewAction() {
        invocations += 1;
        return {};
      },
      async deleteConceptEntries() {
        invocations += 1;
        return {};
      },
    });
    const invalidRequests: Array<() => Promise<unknown>> = [
      () =>
        missingPortClient.concepts.updateConceptDisplayText({
          conceptId: " ",
          fields: { definition: "valid" },
        }),
      () =>
        missingPortClient.concepts.applyConceptReviewAction({
          reviewId: " ",
          action: "reject",
        }),
      () => missingPortClient.concepts.deleteConceptEntries({ conceptIds: [] }),
      () =>
        client.concepts.updateConceptDisplayText({
          conceptId: "concept-1",
          fields: {},
        }),
      () =>
        client.concepts.updateConceptDisplayText({
          conceptId: "concept-1",
          fields: { unknown: "discard" },
        } as never),
      ...[
        { short_definition: 1 },
        { definition: false },
        { usage_note: [] },
        { editorial_note: null },
      ].map(
        (fields) => () =>
          client.concepts.updateConceptDisplayText({
            conceptId: "concept-1",
            fields,
          } as never),
      ),
      () =>
        client.concepts.applyConceptReviewAction({
          reviewId: "review-1",
          action: "approve",
        } as never),
      () =>
        client.concepts.applyConceptReviewAction({
          reviewId: "review-1",
          action: "merge_into_existing",
          targetConceptId: " ",
        }),
      () => client.concepts.deleteConceptEntries({ conceptIds: [] }),
      () =>
        client.concepts.deleteConceptEntries({
          conceptIds: ["concept-1", " "],
        }),
      () =>
        client.concepts.deleteConceptEntries({
          conceptIds: ["concept-1", 2],
        } as never),
    ];

    for (const run of invalidRequests) {
      try {
        await run();
        assert.fail("expected the Concept request to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }
    assert.equal(invocations, 0);
  });

  it("normalizes missing and failed Concept command ports", async function () {
    const preserved = new SynthesisClientError("conflict", "delete conflict");
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async updateConceptDisplayText() {
        throw new Error("display update exploded");
      },
      async applyConceptReviewAction() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
      async deleteConceptEntries() {
        throw preserved;
      },
    });
    const cases: Array<{
      run: () => Promise<unknown>;
      code: string;
      expected?: SynthesisClientError;
    }> = [
      {
        run: () => client.concepts.rebuildConceptKbIndex(),
        code: "unavailable",
      },
      {
        run: () =>
          client.concepts.updateConceptDisplayText({
            conceptId: "concept-1",
            fields: { definition: "Definition" },
          }),
        code: "internal",
      },
      {
        run: () =>
          client.concepts.applyConceptReviewAction({
            reviewId: "review-1",
            action: "reject",
          }),
        code: "storage_busy",
      },
      {
        run: () =>
          client.concepts.deleteConceptEntries({ conceptIds: ["concept-1"] }),
        code: "conflict",
        expected: preserved,
      },
    ];

    for (const testCase of cases) {
      try {
        await testCase.run();
        assert.fail("expected the Concept command to reject");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, testCase.code);
        if (testCase.expected) assert.strictEqual(error, testCase.expected);
      }
    }
  });

  it("routes the five region-scoped Workbench reads through narrow ports", async function () {
    const calls: Array<{ operation: string; args: unknown[] }> = [];
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async getSynthesisWorkbenchChromeInput(state) {
        calls.push({ operation: "chrome", args: [state] });
        return { libraryId: 1, storage: { rootState: "ready" } };
      },
      async getSynthesisWorkbenchSurfaceInput(surface, state) {
        calls.push({ operation: "surface", args: [surface, state] });
        return {
          libraryId: 1,
          registry: {
            rows: [],
            cacheStatus: {
              cache_key: "reference-sidecar:library",
              status: "missing",
              source_hash: "",
              basis_hash: "",
              refreshed_at: "",
              updated_at: "",
              diagnostics: [],
              allowed_actions: [],
            },
          },
          reviews: {
            summary: {
              openCount: 0,
              indexCount: 0,
              referenceMatchingCount: 0,
              conceptCount: 0,
              topicGraphCount: 0,
            },
          },
        };
      },
      async getSynthesisBackgroundJobRows() {
        calls.push({ operation: "progress", args: [] });
        return [
          {
            job_id: "operation:refresh",
            status: "running",
            optional_field: undefined,
          },
        ];
      },
      async readTopicDetail(request) {
        calls.push({ operation: "topic-detail", args: [request] });
        return {
          ok: true,
          status: "ready",
          topicId: request.topicId,
          title: "Topic Alpha",
          source_papers: [],
          diagnostics: [],
        };
      },
      async resolveTopicPaperDigest(request) {
        calls.push({ operation: "paper-digest", args: [request] });
        return {
          ok: true,
          status: "available",
          paper_ref: String(request.paper_ref || ""),
          digest_markdown: "# Digest",
          recorded_hash: "old",
          current_hash: "new",
          source_changed: true,
          diagnostics: [],
        };
      },
    });
    const state = toSynthesisWorkbenchReadState(
      createDefaultSynthesisUiState(),
    );

    assert.deepEqual(await client.workbench.readChrome({ state }), {
      libraryId: 1,
      storage: { rootState: "ready" },
    });
    assert.deepEqual(
      await client.workbench.readSurface({ surface: "index", state }),
      {
        libraryId: 1,
        registry: {
          rows: [],
          cacheStatus: {
            cache_key: "reference-sidecar:library",
            status: "missing",
            source_hash: "",
            basis_hash: "",
            refreshed_at: "",
            updated_at: "",
            diagnostics: [],
            allowed_actions: [],
          },
        },
        reviews: {
          summary: {
            openCount: 0,
            indexCount: 0,
            referenceMatchingCount: 0,
            conceptCount: 0,
            topicGraphCount: 0,
          },
        },
      },
    );
    assert.deepEqual(await client.workbench.readProgress(), {
      maintenance: {
        backgroundJobs: [
          {
            job_id: "operation:refresh",
            status: "running",
          },
        ],
      },
    });
    assert.deepEqual(
      await client.workbench.readTopicDetail({ topicId: "topic-alpha" }),
      {
        ok: true,
        status: "ready",
        topicId: "topic-alpha",
        title: "Topic Alpha",
        source_papers: [],
        diagnostics: [],
      },
    );
    assert.deepEqual(
      await client.workbench.readPaperDigest({
        topicId: "topic-alpha",
        paperRef: "1:ABCD1234",
        digestRef: {
          paperRef: "1:ABCD1234",
          payloadHash: "sha256:digest",
          noteKey: "NOTE1234",
        },
        includeRepresentativeImage: true,
      }),
      {
        ok: true,
        status: "available",
        paper_ref: "1:ABCD1234",
        digest_markdown: "# Digest",
        recorded_hash: "old",
        current_hash: "new",
        source_changed: true,
        diagnostics: [],
      },
    );
    assert.deepEqual(calls, [
      { operation: "chrome", args: [state] },
      { operation: "surface", args: ["index", state] },
      { operation: "progress", args: [] },
      {
        operation: "topic-detail",
        args: [{ topicId: "topic-alpha" }],
      },
      {
        operation: "paper-digest",
        args: [
          {
            topic_id: "topic-alpha",
            paper_ref: "1:ABCD1234",
            digest_ref: {
              paper_ref: "1:ABCD1234",
              payload_hash: "sha256:digest",
              note_key: "NOTE1234",
            },
            include_representative_image: true,
          },
        ],
      },
    ]);
    assert.notProperty(client.workbench, "getSynthesisSnapshot");
  });

  it("rejects non-JSON Workbench state before invoking the client port", async function () {
    let invoked = false;
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async getSynthesisWorkbenchChromeInput() {
        invoked = true;
        return {};
      },
    });

    try {
      await client.workbench.readChrome({
        state: { callback: (() => undefined) as never },
      });
      assert.fail("expected the Workbench request to reject");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "invalid_request");
      assert.equal(invoked, false);
    }
  });

  it("rejects unprojected Workbench UI state before invoking the client port", async function () {
    let invoked = false;
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async getSynthesisWorkbenchChromeInput() {
        invoked = true;
        return {};
      },
    });

    try {
      await client.workbench.readChrome({
        state: { selectedTab: "overview" } as never,
      });
      assert.fail("expected the Workbench request to reject");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "invalid_request");
      assert.equal(invoked, false);
    }
  });

  it("rejects a Workbench result that belongs to another surface", async function () {
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async getSynthesisWorkbenchSurfaceInput() {
        return {
          libraryId: 1,
          registry: {
            rows: [],
            cacheStatus: {
              cache_key: "reference-sidecar:library",
              status: "missing",
              source_hash: "",
              basis_hash: "",
              refreshed_at: "",
              updated_at: "",
              diagnostics: [],
              allowed_actions: [],
            },
          },
          reviews: {
            summary: {
              openCount: 0,
              indexCount: 0,
              referenceMatchingCount: 0,
              conceptCount: 0,
              topicGraphCount: 0,
            },
          },
        };
      },
    });

    try {
      await client.workbench.readSurface({
        surface: "home",
        state: toSynthesisWorkbenchReadState(createDefaultSynthesisUiState()),
      });
      assert.fail("expected the mismatched Workbench result to reject");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "internal");
    }
  });

  it("normalizes Workbench client failures without retrying", async function () {
    let attempts = 0;
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async getSynthesisBackgroundJobRows() {
        attempts += 1;
        throw new Error("progress exploded");
      },
    });

    try {
      await client.workbench.readProgress();
      assert.fail("expected the Workbench request to reject");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "internal");
      assert.equal(attempts, 1);
    }
  });

  it("projects default Workbench UI state into the public read contract", function () {
    const state = toSynthesisWorkbenchReadState(
      createDefaultSynthesisUiState(),
    );
    assert.deepEqual(state, {
      registry: {
        scope: "library",
        expandedSourceRefs: [],
      },
      reviews: {
        activeTab: "reference_matching",
        status: "open",
        kind: "all",
        confidence: "all",
        search: "",
        cursor: "0",
        limit: 25,
      },
      reader: {
        topicId: "",
      },
      graph: {
        filters: {
          nodeKinds: [
            "library_paper",
            "external_reference",
            "unresolved_reference",
          ],
          includeLowSignal: false,
          search: "",
        },
        layoutAlgorithm: "force",
      },
    });
  });

  it("projects Workbench graph filters and continuation into one graph query", function () {
    const uiState = createDefaultSynthesisUiState();
    uiState.registry.scope = "all";
    uiState.graph.topicId = "topic:1";
    uiState.graph.role = "method";
    uiState.graph.layoutAlgorithm = "radial";
    uiState.graph.showLowSignalReferences = true;
    uiState.graph.search = "model";

    const state = toSynthesisWorkbenchReadState(uiState, {
      graphWindowCursor: "cg1|next",
      expectedGraphHash: "sha256:graph",
    });

    assert.equal(state.registry.scope, "library");
    assert.deepEqual(state.graph, {
      filters: {
        topicId: "topic:1",
        nodeKinds: [
          "library_paper",
          "external_reference",
          "unresolved_reference",
        ],
        roles: ["method"],
        includeLowSignal: true,
        search: "model",
      },
      layoutAlgorithm: "radial",
      windowCursor: "cg1|next",
      basis: { expectedGraphHash: "sha256:graph" },
    });
  });

  it("accepts real-data Workbench rows without exposing persistence payloads", function () {
    const state = toSynthesisWorkbenchReadState(
      createDefaultSynthesisUiState(),
    );
    const summary = {
      openCount: 1,
      indexCount: 0,
      referenceMatchingCount: 1,
      conceptCount: 1,
      topicGraphCount: 0,
    };
    const cacheStatus = {
      cache_key: "reference-sidecar:library",
      status: "ready",
      source_hash: "sha256:source",
      basis_hash: "sha256:basis",
      refreshed_at: "2026-08-27T00:00:00.000Z",
      updated_at: "2026-08-27T00:00:00.000Z",
      diagnostics: [],
      allowed_actions: [],
    };
    const cases = [
      {
        request: { surface: "home" as const, state },
        value: {
          libraryId: 1,
          artifacts: [
            {
              id: "topic:legacy",
              title: "Legacy Topic",
              kind: "topic_synthesis",
              definition: "A migrated Topic row",
              language: "zh-CN",
              status: "create",
              paper_count: 18,
              updated_at: "2026-07-10T00:12:11.176Z",
              freshness: "fresh",
              source_materials_status: "complete",
              source_materials_percent: 100,
              stale_reasons: [],
              dirty_reasons: [],
              missing_sections: [],
            },
          ],
          deletedArtifacts: {
            rows: [
              {
                topic_id: "topic:deleted",
                title: "Deleted Topic",
                deleted_at: "2026-08-01T00:00:00.000Z",
              },
            ],
            total: 1,
          },
          topicPage: {
            cursor: "",
            next_cursor: "",
            has_more: false,
            returned: 1,
            total: 1,
            limit: 50,
          },
        },
      },
      {
        request: { surface: "review" as const, state },
        value: {
          libraryId: 1,
          registry: {
            rows: [],
            cleanupProposals: [],
            matchProposals: [
              {
                proposal_id: "proposal:merge",
                kind: "canonical_merge",
                status: "open",
                source_canonical_reference_id: "cref:source",
                source_effective_canonical_reference_id: "cref:source",
                source_raw_reference_ids: ["rawref:source"],
                target_canonical_reference_id: "cref:target",
                target_effective_canonical_reference_id: "cref:target",
                target_library_id: 0,
                target_item_key: "",
                confidence: "high",
                score: 0.94,
                reasons: ["contained_author_noise"],
                evidence: {
                  source: {
                    canonical_reference_id: "cref:source",
                    title: "Source title",
                    normalized_title: "source title",
                    year: "2025",
                  },
                  target: {
                    canonical_reference_id: "cref:target",
                    title: "Target title",
                    normalized_title: "target title",
                    year: "2025",
                  },
                  edge_type: "contained_author_noise",
                  token_dice: 0.94,
                  year_delta: 0,
                  risk_signals: [],
                },
                diagnostics: [],
                updated_at: "2026-08-27T00:00:00.000Z",
              },
            ],
            matchTargetCandidates: [],
            canonicalRows: [],
            cacheStatus,
            reviewPage: {
              cursor: "0",
              next_cursor: "",
              has_more: false,
              limit: 25,
              match_total: 1,
              cleanup_total: 0,
            },
          },
          reviews: { summary },
        },
      },
      {
        request: {
          surface: "review" as const,
          state: {
            ...state,
            reviews: { ...state.reviews, activeTab: "concepts" as const },
          },
        },
        value: {
          libraryId: 1,
          concepts: {
            concepts: [],
            senses: [],
            aliases: [],
            relations: [],
            manifest: {
              manifest_hash: null,
              concept_count: 0,
              sense_count: 0,
              alias_count: 0,
              relation_count: 0,
              updated_at: "2026-08-27T00:00:00.000Z",
              projection_target: "concept-kb-index",
            },
            projection: {
              target: "concept-kb-index",
              stale: false,
              last_rebuild_at: "2026-08-27T00:00:00.000Z",
              diagnostics: [],
            },
            diagnostics: [],
            overlayEntries: [],
            reviewItems: [
              {
                review_id: "concept-review:legacy",
                status: "open",
                reason: "low_confidence_concept",
                topic_id: "topic:legacy",
                topic_path_id: "legacy",
                label: "Attention transfer",
                confidence: "medium",
                candidate_concept_ids: [],
                short_definition: "Learn where a teacher attends.",
                definition: "A knowledge-transfer mechanism.",
                concept_type: "mechanism",
                domain: "general",
                topic_relevance: "A relation-distillation method.",
                evidence: [],
                target_concept_id: "",
                created_at: "2026-08-27T00:00:00.000Z",
                updated_at: "2026-08-27T00:00:00.000Z",
                resolved_at: "",
              },
            ],
            topicLinks: [],
            reviewPage: { cursor: "0", limit: 25, total: 1 },
          },
          reviews: { summary },
        },
      },
    ];

    for (const entry of cases) {
      assert.doesNotThrow(() =>
        rebuildSynthesisWorkbenchSurfaceResult(entry.request, entry.value),
      );
    }
  });

  it("shares Workbench projection and digest request conversion", function () {
    const projection = toSynthesisUiSnapshotInput({
      libraryId: 1,
      registry: { rows: [] },
    });
    assert.deepEqual(projection, {
      libraryId: 1,
      registry: { rows: [] },
    });

    assert.deepEqual(
      toSynthesisWorkbenchPaperDigestReadRequest({
        topicId: " topic-alpha ",
        paper_ref: " 1:ABCD1234 ",
        digestRef: {
          paper_ref: "1:ABCD1234",
          payload_hash: "sha256:digest",
          note_key: "NOTE1234",
        },
        include_representative_image: true,
      }),
      {
        topicId: "topic-alpha",
        paperRef: "1:ABCD1234",
        digestRef: {
          paperRef: "1:ABCD1234",
          payloadHash: "sha256:digest",
          noteKey: "NOTE1234",
        },
        includeRepresentativeImage: true,
      },
    );
  });

  it("preserves SQLite busy as a stable Workbench client error", async function () {
    const client = createTestSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async getSynthesisWorkbenchSurfaceInput() {
        throw Object.assign(new Error("database is locked"), {
          code: "SQLITE_BUSY",
        });
      },
    });

    try {
      await client.workbench.readSurface({
        surface: "graph",
        state: toSynthesisWorkbenchReadState(createDefaultSynthesisUiState()),
      });
      assert.fail("expected the Workbench request to reject");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "storage_busy");
    }
  });

  it("isolates neutral grouped-client adaptation in client composition", function () {
    const adapter = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/clientPortAdapter.ts"),
      "utf8",
    );
    const defaultClient = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/defaultClient.ts"),
      "utf8",
    );
    const consumer = fs.readFileSync(
      path.join(ROOT, "src/modules/workflowParameterOptions.ts"),
      "utf8",
    );

    assert.include(adapter, "createSynthesisClientFromPort");
    assert.notInclude(adapter, "../synthesis/service");
    assert.notInclude(adapter, "../synthesis/repository");
    assert.notInclude(adapter, "legacyComposition");
    assert.notInclude(adapter, "getReadySynthesisProductionControlConnection");
    assert.notInclude(adapter, "createZoteroSynthesisHostReadPort");
    assert.notMatch(adapter, /\btype\s+SynthesisService\b/);
    assert.notInclude(defaultClient, "getDefaultSynthesisService");
    assert.notInclude(defaultClient, "../synthesis/service");
    assert.notInclude(consumer, "getDefaultSynthesisService");
    assert.notInclude(consumer, "./synthesis/service");
    assert.include(consumer, "getDefaultSynthesisClient");
  });

  it("routes representative Host Bridge Synthesis operations through grouped client capabilities", async function () {
    const calls: Array<{ port: string; args: unknown[] }> = [];
    const portNames = [
      "listTopics",
      "findTopicsByPaperRef",
      "getTopicContext",
      "resolveResolver",
      "resolveTopicPaperDigest",
      "getReviewInput",
    ] as const;
    const ports = Object.fromEntries(
      portNames.map((port) => [
        port,
        async (...args: unknown[]) => {
          calls.push({ port, args });
          if (port === "resolveTopicPaperDigest") {
            return {
              ok: true,
              status: "available",
              paper_ref: "1:ABCD1234",
              digest_markdown: "# Digest",
              recorded_hash: "sha256:recorded",
              current_hash: "sha256:current",
              source_changed: true,
              diagnostics: [],
            };
          }
          if (port === "listTopics") {
            return {
              topics: [],
              cursor: "",
              next_cursor: "",
              has_more: false,
              returned: 0,
              total: 0,
              limit: 50,
              diagnostics: {
                count: 0,
                total_count: 0,
                source: "rust-topic-application",
              },
            };
          }
          if (port === "findTopicsByPaperRef") {
            return {
              ok: true,
              status: "available",
              paper_refs: ["1:ABCD1234"],
              topics: [],
              diagnostics: {
                requested_count: 1,
                matched_topic_count: 0,
                unmatched_paper_refs: ["1:ABCD1234"],
                source: "rust-topic-application",
              },
            };
          }
          if (port === "getTopicContext") {
            return {
              schema_id: "synthesis.topic_context",
              schema_version: "2.0.0",
              topic_id: "topic-alpha",
              status: "not_found",
              diagnostics: [],
            };
          }
          if (port === "resolveResolver") {
            return {
              ok: true,
              errors: [],
              papers: [],
              normalized_resolver: {
                paper_refs: ["1:ABCD1234"],
                collection_key: [],
                combine: "union",
                cursor: 0,
                limit: 50,
              },
              cursor: "",
              next_cursor: "",
              has_more: false,
              returned: 0,
              total: 0,
              limit: 50,
              diagnostics: {
                final_count: 0,
                total_candidates: 0,
                rejected: false,
              },
            };
          }
          if (port === "getReviewInput") {
            return WORKFLOW_REVIEW_RESULT;
          }
          throw new Error(`missing result fixture for ${port}`);
        },
      ]),
    );
    const client: any = createTestSynthesisClient(ports as any);
    const topicRequests = {
      listTopics: { cursor: "", limit: 50 },
      findTopicsByPaperRef: { paper_refs: ["1:ABCD1234"] },
      getTopicContext: { topicId: "topic-alpha", view: "full" },
      resolveResolver: {
        paper_refs: ["1:ABCD1234"],
        collection_key: [],
        combine: "union",
        cursor: 0,
        limit: 50,
      },
      resolveTopicPaperDigest: {
        topicId: "topic-alpha",
        paperRef: "1:ABCD1234",
        includeRepresentativeImage: false,
      },
    } as const;
    const delivery = { mode: "remote" as const };
    const invocations: Array<[string, () => Promise<unknown>]> = [
      ["listTopics", () => client.topics.list(topicRequests.listTopics)],
      [
        "findTopicsByPaperRef",
        () => client.topics.findByPaperRef(topicRequests.findTopicsByPaperRef),
      ],
      [
        "getTopicContext",
        () => client.topics.getContext(topicRequests.getTopicContext, delivery),
      ],
      [
        "resolveResolver",
        () => client.topics.resolveResolver(topicRequests.resolveResolver),
      ],
      [
        "resolveTopicPaperDigest",
        () =>
          client.artifacts.resolveTopicPaperDigest(
            topicRequests.resolveTopicPaperDigest,
          ),
      ],
      [
        "getReviewInput",
        () => client.workflowReview.getInput({ topicId: "topic-alpha" }),
      ],
    ];

    for (const [port, invoke] of invocations) {
      const result = (await invoke()) as Record<string, unknown>;
      if (port === "resolveTopicPaperDigest") {
        assert.equal(result.paper_ref, "1:ABCD1234");
      } else if (port === "listTopics") {
        assert.deepEqual(result.topics, []);
      } else if (port === "findTopicsByPaperRef") {
        assert.deepEqual(result.paper_refs, ["1:ABCD1234"]);
      } else if (port === "getTopicContext") {
        assert.equal(result.topic_id, "topic-alpha");
      } else if (port === "resolveResolver") {
        assert.deepEqual(result.papers, []);
      } else if (port === "getReviewInput") {
        assert.equal(result.kind, "synthesis.review_workflow_input");
      }
      assert.notStrictEqual(result, ports);
    }
    assert.deepEqual(
      calls.map((entry) => entry.port),
      portNames,
    );
    assert.deepEqual(calls[2].args, [topicRequests.getTopicContext, delivery]);
    assert.deepEqual(calls[0].args[0], topicRequests.listTopics);
    assert.notStrictEqual(calls[0].args[0], topicRequests.listTopics);
  });

  it("classifies Host Bridge client boundary failures", async function () {
    const missing: any = createTestSynthesisClient({} as any);
    try {
      await missing.concepts.query({});
      assert.fail("expected unavailable Concept query");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "unavailable");
    }
    try {
      await missing.debug.snapshot({});
      assert.fail("expected unavailable");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "unavailable");
    }

    let invoked = false;
    const invalidRequest: any = createTestSynthesisClient({
      async debugSynthesisSnapshot() {
        invoked = true;
        return {};
      },
    } as any);
    try {
      await invalidRequest.debug.snapshot({
        callback: (() => undefined) as never,
      });
      assert.fail("expected invalid_request");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "invalid_request");
      assert.isFalse(invoked);
    }

    const invalidResult: any = createTestSynthesisClient({
      async debugSynthesisSnapshot() {
        return [];
      },
    } as any);
    try {
      await invalidResult.debug.snapshot({});
      assert.fail("expected internal");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "internal");
    }
  });
});

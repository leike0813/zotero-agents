import { assert } from "chai";
import fs from "fs";
import path from "path";
import {
  SYNTHESIS_SYNC_CONFLICT_RESOLUTION_ACTIONS,
  SynthesisClientError,
  type SynthesisWorkflowTopicOptionsResult,
} from "../../packages/synthesis-contracts/src/index";
import { createInProcessSynthesisClient } from "../../src/modules/synthesisClient/inProcessClient";
import {
  toSynthesisUiSnapshotInput,
  toSynthesisWorkbenchPaperDigestReadRequest,
  toSynthesisWorkbenchReadState,
} from "../../src/modules/synthesisClient/workbenchUiAdapter";

const ROOT = path.resolve(import.meta.dirname, "../..");

function parentRef(value: number) {
  return { libraryId: 1, itemKey: `ITEM${String(value).padStart(4, "0")}` };
}

describe("Synthesis client foundation", function () {
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
          meta: { kind: "synthesis.topic", topicId: "topic-alpha" },
        },
      ],
      diagnostics: [],
    };
    const client = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        throw new Error("legacy exploded");
      },
    });

    try {
      await client.topics.listWorkflowOptions();
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
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        throw expected;
      },
    });

    try {
      await client.topics.listWorkflowOptions();
      assert.fail("expected the client call to reject");
    } catch (error) {
      assert.strictEqual(error, expected);
    }
  });

  it("routes strict Topic commands through narrow normalized ports", async function () {
    const calls: Array<{ operation: string; request?: unknown }> = [];
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async deleteTopicArtifact(request) {
        calls.push({ operation: "delete", request });
        return {
          ok: true,
          topic_id: request.topicId,
          deleted_at: new Date("2026-07-15T00:00:00.000Z"),
          optional_field: undefined,
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

  it("rejects invalid Topic commands before resolving legacy ports", async function () {
    let invocations = 0;
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async rebuildTopicGraphIndex() {
        calls.push({ operation: "rebuild" });
        return {
          ok: true,
          rebuilt_at: new Date("2026-07-15T00:00:00.000Z"),
          optional_field: undefined,
        };
      },
      async acceptTopicGraphRelation(request) {
        calls.push({ operation: "accept", request });
        return {
          diagnostic: { code: "topic_graph_edge_missing" },
        };
      },
      async rejectTopicGraphRelation(request) {
        calls.push({ operation: "reject", request });
        return { edge: { edge_id: request.edgeId, status: "rejected" } };
      },
      async applyTopicGraphReviewAction(request) {
        calls.push({ operation: "review", request });
        return {
          diagnostic: { code: "topic_graph_review_closed" },
        };
      },
    });

    assert.deepEqual(await client.topicGraph.rebuildTopicGraphIndex(), {
      ok: true,
      rebuilt_at: "2026-07-15T00:00:00.000Z",
    });
    assert.deepEqual(
      await client.topicGraph.acceptTopicGraphRelation({
        edgeId: " edge-1 ",
        unexpected: "discard",
      } as never),
      { diagnostic: { code: "topic_graph_edge_missing" } },
    );
    assert.deepEqual(
      await client.topicGraph.rejectTopicGraphRelation({ edgeId: " edge-2 " }),
      { edge: { edge_id: "edge-2", status: "rejected" } },
    );
    assert.deepEqual(
      await client.topicGraph.applyTopicGraphReviewAction({
        reviewId: " review-1 ",
        action: "approve_suggested",
        unexpected: "discard",
      } as never),
      { diagnostic: { code: "topic_graph_review_closed" } },
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

  it("rejects invalid Topic Graph commands before resolving legacy ports", async function () {
    let invocations = 0;
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
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
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
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
      completed_at: new Date("2026-07-16T00:00:00.000Z"),
      optional_field: undefined,
    });
    const client = createInProcessSynthesisClient({
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
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
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
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async validateTagVocabulary() {
        calls.push("validate");
        return [
          {
            code: "missing_replacement",
            checked_at: new Date("2026-07-15T00:00:00.000Z"),
            optional_field: undefined,
          },
        ];
      },
      async rebuildTagVocabularyIndex() {
        calls.push("rebuild");
        return {
          ok: true,
          rebuilt_at: new Date("2026-07-15T00:00:00.000Z"),
          optional_field: undefined,
        };
      },
      async exportTagVocabularyForRegulator() {
        calls.push("export");
        return ["data:coco", "model:detr"];
      },
    });

    assert.deepEqual(await client.tags.validateTagVocabulary(), [
      {
        code: "missing_replacement",
        checked_at: "2026-07-15T00:00:00.000Z",
      },
    ]);
    assert.deepEqual(await client.tags.rebuildTagVocabularyIndex(), {
      ok: true,
      rebuilt_at: "2026-07-15T00:00:00.000Z",
    });
    assert.deepEqual(await client.tags.exportTagVocabularyForRegulator(), [
      "data:coco",
      "model:detr",
    ]);
    assert.deepEqual(calls, ["validate", "rebuild", "export"]);
  });

  it("normalizes missing and failed Tag vocabulary maintenance ports", async function () {
    const preserved = new SynthesisClientError("conflict", "tag conflict");
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
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
    const invalidResultClient = createInProcessSynthesisClient({
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
    const ordinaryFailureClient = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async previewTagVocabularyImport(request) {
        calls.push({ operation: "preview", request });
        return {
          conflicts: [{ tag: "model:detr" }],
          warnings: [{ code: "tag_import_warning" }],
          checked_at: new Date("2026-07-15T00:00:00.000Z"),
          optional_field: undefined,
        };
      },
      async applyTagVocabularyImport(request) {
        calls.push({ operation: "apply", request });
        return {
          ok: false,
          diagnostics: [{ code: "tag_import_domain_failure" }],
        };
      },
    });

    assert.deepEqual(
      await client.tags.previewTagVocabularyImport({
        payload: '  {"entries":[]}\n',
        unexpected: "discard",
      } as never),
      {
        conflicts: [{ tag: "model:detr" }],
        warnings: [{ code: "tag_import_warning" }],
        checked_at: "2026-07-15T00:00:00.000Z",
      },
    );
    assert.deepEqual(
      await client.tags.applyTagVocabularyImport({
        payload: '\n{"entries":[]}  ',
        action: "merge-non-conflicting",
        unexpected: "discard",
      } as never),
      {
        ok: false,
        diagnostics: [{ code: "tag_import_domain_failure" }],
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

  it("rejects invalid Tag import requests before resolving legacy ports", async function () {
    let invocations = 0;
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
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
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
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
    const ordinaryFailureClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async previewTagVocabularyImport() {
        throw new Error("invalid Tag import JSON");
      },
    });
    const invalidResultClient = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async promoteStagedTagSuggestions(request) {
        calls.push({ operation: "promote", request });
        return {
          promoted: request.tags,
          diagnostics: [{ code: "tag_parent_apply_failed" }],
          completed_at: new Date("2026-07-15T00:00:00.000Z"),
          optional_field: undefined,
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
        promoted: ["topic:candidate", "topic:candidate"],
        diagnostics: [{ code: "tag_parent_apply_failed" }],
        completed_at: "2026-07-15T00:00:00.000Z",
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
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async updateStagedTagSuggestion(request) {
        captured = request;
        return {
          staged: { tag: request.tag },
          updated_at: new Date("2026-07-16T00:00:00.000Z"),
          optional_field: undefined,
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
        staged: { tag: "topic:new" },
        updated_at: "2026-07-16T00:00:00.000Z",
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

  it("rejects invalid staged Tag updates before resolving the legacy port", async function () {
    let invocations = 0;
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
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
      missing: createInProcessSynthesisClient({
        async listWorkflowTopicOptions() {
          return { options: [], diagnostics: [] };
        },
      }),
      preserved: createInProcessSynthesisClient({
        async listWorkflowTopicOptions() {
          return { options: [], diagnostics: [] };
        },
        async updateStagedTagSuggestion() {
          throw preserved;
        },
      }),
      busy: createInProcessSynthesisClient({
        async listWorkflowTopicOptions() {
          return { options: [], diagnostics: [] };
        },
        async updateStagedTagSuggestion() {
          throw Object.assign(new Error("database is locked"), {
            code: "SQLITE_BUSY",
          });
        },
      }),
      ordinary: createInProcessSynthesisClient({
        async listWorkflowTopicOptions() {
          return { options: [], diagnostics: [] };
        },
        async updateStagedTagSuggestion() {
          throw new Error("update exploded");
        },
      }),
      invalidResult: createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async updateTagVocabularyEntry(request) {
        captured.push({ operation: "update", request });
        return {
          mutated: true,
          updated: { tag: request.tag },
          updated_at: new Date("2026-07-16T00:00:00.000Z"),
          optional_field: undefined,
        };
      },
      async deleteTagVocabularyEntry(request) {
        captured.push({ operation: "delete", request });
        return { mutated: true, deleted: request.originalTag };
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
        updated: { tag: "topic:new" },
        updated_at: "2026-07-16T00:00:00.000Z",
      },
    );
    assert.deepEqual(
      await client.tags.deleteTagVocabularyEntry({
        originalTag: " topic:new ",
        unexpected: "discard",
      } as never),
      { mutated: true, deleted: "topic:new" },
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
    const client = createInProcessSynthesisClient({
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
    const missingPortClient = createInProcessSynthesisClient({
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
      const target = createInProcessSynthesisClient({
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

  it("rejects invalid staged Tag selections before resolving legacy ports", async function () {
    let invocations = 0;
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
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
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
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
    const invalidResultClient = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async recomputeCitationGraphLayout(request) {
        calls.push({ operation: "layout", args: [request] });
        return {
          ok: true,
          optional_field: undefined,
          generated_at: new Date("2026-07-15T00:00:00.000Z"),
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

  it("validates Citation Graph layout requests before invoking legacy code", async function () {
    let invocations = 0;
    const client = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async refreshReferenceSidecarNow() {
        calls.push("refresh");
        return {
          ok: true,
          status: "ready",
          optional_field: undefined,
          updated_at: new Date("2026-07-15T00:00:00.000Z"),
        };
      },
      async retryReferenceSidecarRefresh() {
        calls.push("retry-refresh");
        return { ok: true, status: "retried" };
      },
      async runAdvancedReferenceMatchingNow() {
        calls.push("advanced");
        return { ok: true, status: "completed" };
      },
      async retryAdvancedReferenceMatching() {
        calls.push("retry-advanced");
        return { ok: true, status: "retried" };
      },
    });

    assert.deepEqual(await client.references.refreshReferenceSidecarNow(), {
      ok: true,
      status: "ready",
      updated_at: "2026-07-15T00:00:00.000Z",
    });
    assert.deepEqual(await client.references.retryReferenceSidecarRefresh(), {
      ok: true,
      status: "retried",
    });
    assert.deepEqual(
      await client.references.runAdvancedReferenceMatchingNow(),
      { ok: true, status: "completed" },
    );
    assert.deepEqual(await client.references.retryAdvancedReferenceMatching(), {
      ok: true,
      status: "retried",
    });
    assert.deepEqual(calls, [
      "refresh",
      "retry-refresh",
      "advanced",
      "retry-advanced",
    ]);
  });

  it("normalizes missing and failed Reference maintenance ports", async function () {
    const preserved = new SynthesisClientError("conflict", "retry conflict");
    const client = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async applyCanonicalRevisionReviewAction(request) {
        calls.push({ operation: "canonical", request });
        return {
          ok: true,
          review_item_id: request.reviewItemId,
          optional_field: undefined,
          reviewed_at: new Date("2026-07-15T00:00:00.000Z"),
        };
      },
      async applyReferenceMatchProposalAction(request) {
        calls.push({ operation: "single", request });
        return { ok: true, proposal_id: request.proposalId };
      },
      async applyReferenceMatchProposalActions(request) {
        calls.push({ operation: "batch", request });
        return {
          ok: false,
          failed_count: 1,
          diagnostics: [{ code: "domain_failure" }],
          optional_field: undefined,
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
          review_item_id: `review-${action}`,
          reviewed_at: "2026-07-15T00:00:00.000Z",
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
        { ok: true, proposal_id: `proposal-${action}` },
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
        failed_count: 1,
        diagnostics: [{ code: "domain_failure" }],
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

  it("rejects invalid Reference review and proposal requests before invoking legacy ports", async function () {
    let invocations = 0;
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
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
    const preservingClient = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async mergeEffectiveCanonicalReference(request) {
        calls.push({ operation: "merge", request });
        return {
          ok: false,
          status: "invalid_target",
          optional_field: undefined,
          checked_at: new Date("2026-07-15T00:00:00.000Z"),
        };
      },
      async applyCanonicalRevisionMergeRequests(request) {
        calls.push({ operation: "batch", request });
        return {
          ok: false,
          failed_count: 1,
          diagnostics: [{ code: "domain_failure" }],
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
        checked_at: "2026-07-15T00:00:00.000Z",
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
        checked_at: "2026-07-15T00:00:00.000Z",
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
        failed_count: 1,
        diagnostics: [{ code: "domain_failure" }],
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

  it("rejects invalid canonical Reference mutations before resolving legacy ports", async function () {
    let invocations = 0;
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async rebuildConceptKbIndex() {
        calls.push({ operation: "rebuild" });
        return {
          ok: true,
          optional_field: undefined,
          rebuilt_at: new Date("2026-07-15T00:00:00.000Z"),
        };
      },
      async updateConceptDisplayText(request) {
        calls.push({ operation: "display", request });
        return { ok: true, concept_id: request.conceptId };
      },
      async applyConceptReviewAction(request) {
        calls.push({ operation: "review", request });
        return request.targetConceptId
          ? { ok: true, status: "merged" }
          : {
              ok: false,
              diagnostic: { code: "concept_review_target_missing" },
            };
      },
      async deleteConceptEntries(request) {
        calls.push({ operation: "delete", request });
        return {
          deleted_concept_ids: [],
          diagnostic: { code: "concept_delete_not_found" },
        };
      },
    });

    assert.deepEqual(await client.concepts.rebuildConceptKbIndex(), {
      ok: true,
      rebuilt_at: "2026-07-15T00:00:00.000Z",
    });
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
      { ok: true, concept_id: "concept-1" },
    );
    assert.deepEqual(
      await client.concepts.applyConceptReviewAction({
        reviewId: " review-1 ",
        action: "merge_into_existing",
        targetConceptId: " target-1 ",
        unexpected: "discard",
      } as never),
      { ok: true, status: "merged" },
    );
    assert.deepEqual(
      await client.concepts.applyConceptReviewAction({
        reviewId: " review-2 ",
        action: "merge_into_existing",
      }),
      {
        ok: false,
        diagnostic: { code: "concept_review_target_missing" },
      },
    );
    assert.deepEqual(
      await client.concepts.deleteConceptEntries({
        conceptIds: [" concept-1 ", "concept-2"],
        unexpected: "discard",
      } as never),
      {
        deleted_concept_ids: [],
        diagnostic: { code: "concept_delete_not_found" },
      },
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

  it("rejects invalid Concept commands before resolving legacy ports", async function () {
    let invocations = 0;
    const missingPortClient = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
    });
    const client = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
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
    const client = createInProcessSynthesisClient({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async getSynthesisWorkbenchChromeInput(state) {
        calls.push({ operation: "chrome", args: [state] });
        return { libraryId: 1, storage: { rootState: "ready" } };
      },
      async getSynthesisWorkbenchSurfaceInput(surface, state) {
        calls.push({ operation: "surface", args: [surface, state] });
        return { libraryId: 1, registry: { rows: [] } };
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
          optional_field: undefined,
        };
      },
    });
    const state = { selectedTab: "registry" };

    assert.deepEqual(await client.workbench.readChrome({ state }), {
      libraryId: 1,
      storage: { rootState: "ready" },
    });
    assert.deepEqual(
      await client.workbench.readSurface({ surface: "index", state }),
      { libraryId: 1, registry: { rows: [] } },
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
      },
    );
    assert.deepEqual(
      await client.workbench.readPaperDigest({
        topicId: "topic-alpha",
        paperRef: "1:ABCD1234",
        digestRef: { note_key: "NOTE1234" },
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
            topicId: "topic-alpha",
            paper_ref: "1:ABCD1234",
            digest_ref: { note_key: "NOTE1234" },
            include_representative_image: true,
          },
        ],
      },
    ]);
    assert.notProperty(client.workbench, "getSynthesisSnapshot");
  });

  it("rejects non-JSON Workbench state before invoking the legacy port", async function () {
    let invoked = false;
    const client = createInProcessSynthesisClient({
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

  it("normalizes Workbench legacy failures without retrying", async function () {
    let attempts = 0;
    const client = createInProcessSynthesisClient({
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

  it("shares Workbench UI state, projection, and digest request conversion", function () {
    const state = toSynthesisWorkbenchReadState({
      selectedTab: "artifacts",
      filters: { query: "topic" },
    } as never);
    assert.deepEqual(state, {
      selectedTab: "artifacts",
      filters: { query: "topic" },
    });

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
        digestRef: { note_key: "NOTE1234" },
        include_representative_image: true,
      }),
      {
        topicId: "topic-alpha",
        paperRef: "1:ABCD1234",
        digestRef: { note_key: "NOTE1234" },
        includeRepresentativeImage: true,
      },
    );
  });

  it("preserves SQLite busy as a stable Workbench client error", async function () {
    const client = createInProcessSynthesisClient({
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
      await client.workbench.readSurface({ surface: "graph", state: {} });
      assert.fail("expected the Workbench request to reject");
    } catch (error) {
      assert.instanceOf(error, SynthesisClientError);
      assert.equal((error as SynthesisClientError).code, "storage_busy");
    }
  });

  it("isolates legacy default-service resolution in client composition", function () {
    const composition = fs.readFileSync(
      path.join(ROOT, "src/modules/synthesisClient/legacyComposition.ts"),
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

    assert.include(composition, "createDefaultLegacyService");
    assert.include(composition, "createZoteroSynthesisHostReadPort");
    assert.notMatch(composition, /\btype\s+SynthesisService\b/);
    assert.notInclude(defaultClient, "getDefaultSynthesisService");
    assert.notInclude(defaultClient, "../synthesis/service");
    assert.notInclude(consumer, "getDefaultSynthesisService");
    assert.notInclude(consumer, "./synthesis/service");
    assert.include(consumer, "getDefaultSynthesisClient");
  });

  it("routes Host Bridge Synthesis operations through grouped client capabilities", async function () {
    const calls: Array<{ port: string; args: unknown[] }> = [];
    const portNames = [
      "listTopics",
      "findTopicsByPaperRef",
      "getTopicContext",
      "resolveResolver",
      "queryCitationGraphCluster",
      "queryCitationGraph",
      "getCitationGraphSlice",
      "getCitationGraphLayout",
      "getCitationGraphMetrics",
      "rankLibraryPapers",
      "refreshCitationGraphMetricsNow",
      "getReferenceSidecarIndex",
      "rankExternalReferences",
      "getAttentionQueue",
      "getPaperArtifactManifest",
      "exportFilteredPaperArtifacts",
      "resolveTopicPaperDigest",
      "queryConceptKb",
      "getSchemas",
      "getLibraryIndex",
      "getReviewInput",
      "debugSynthesisSnapshot",
      "debugSynthesisCacheList",
      "debugSynthesisOperationsList",
      "debugSynthesisProfilerList",
      "debugSynthesisPaperInspect",
      "debugSynthesisTopicInspect",
      "debugSynthesisDiff",
      "debugSynthesisCleanInstallReset",
    ] as const;
    const ports = Object.fromEntries(
      portNames.map((port) => [
        port,
        async (...args: unknown[]) => {
          calls.push({ port, args });
          return { ok: true, port, nested: { value: "rebuilt" } };
        },
      ]),
    );
    const client: any = createInProcessSynthesisClient(ports as any);
    const request = { probe: "value", extension: { retained: true } };
    const delivery = { mode: "remote" as const };
    const invocations: Array<[string, () => Promise<unknown>]> = [
      ["listTopics", () => client.topics.list(request)],
      ["findTopicsByPaperRef", () => client.topics.findByPaperRef(request)],
      ["getTopicContext", () => client.topics.getContext(request, delivery)],
      ["resolveResolver", () => client.topics.resolveResolver(request)],
      ["queryCitationGraphCluster", () => client.graph.queryCluster(request)],
      ["queryCitationGraph", () => client.graph.getOverview(request)],
      ["getCitationGraphSlice", () => client.graph.getSlice(request)],
      [
        "getCitationGraphLayout",
        () => client.graph.getPersistedLayout(request),
      ],
      ["getCitationGraphMetrics", () => client.graph.getMetrics(request)],
      ["rankLibraryPapers", () => client.graph.rankLibraryPapers(request)],
      [
        "refreshCitationGraphMetricsNow",
        () => client.graph.refreshMetricsNow(request),
      ],
      [
        "getReferenceSidecarIndex",
        () => client.references.getSidecarIndex(request),
      ],
      [
        "rankExternalReferences",
        () => client.references.rankExternalReferences(request),
      ],
      ["getAttentionQueue", () => client.references.getAttentionQueue(request)],
      ["getPaperArtifactManifest", () => client.artifacts.getManifest(request)],
      [
        "exportFilteredPaperArtifacts",
        () => client.artifacts.exportFiltered(request, delivery),
      ],
      [
        "resolveTopicPaperDigest",
        () => client.artifacts.resolveTopicPaperDigest(request),
      ],
      ["queryConceptKb", () => client.concepts.query(request)],
      ["getSchemas", () => client.maintenance.getSchemas(request)],
      ["getLibraryIndex", () => client.libraryIndex.getPage(request)],
      ["getReviewInput", () => client.workflowReview.getInput(request)],
      ["debugSynthesisSnapshot", () => client.debug.snapshot(request)],
      ["debugSynthesisCacheList", () => client.debug.listCache(request)],
      [
        "debugSynthesisOperationsList",
        () => client.debug.listOperations(request),
      ],
      ["debugSynthesisProfilerList", () => client.debug.listProfiler(request)],
      ["debugSynthesisPaperInspect", () => client.debug.inspectPaper(request)],
      ["debugSynthesisTopicInspect", () => client.debug.inspectTopic(request)],
      ["debugSynthesisDiff", () => client.debug.diff(request)],
      [
        "debugSynthesisCleanInstallReset",
        () => client.debug.cleanInstallReset(request),
      ],
    ];

    for (const [port, invoke] of invocations) {
      const result = (await invoke()) as Record<string, unknown>;
      assert.equal(result.port, port);
      assert.notStrictEqual(result, ports);
    }
    assert.deepEqual(
      calls.map((entry) => entry.port),
      portNames,
    );
    assert.deepEqual(calls[2].args, [request, delivery]);
    assert.deepEqual(calls[15].args, [request, delivery]);
    assert.deepEqual(calls[0].args[0], request);
    assert.notStrictEqual(calls[0].args[0], request);
  });

  it("classifies Host Bridge client boundary failures", async function () {
    const missing: any = createInProcessSynthesisClient({} as any);
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
    const invalidRequest: any = createInProcessSynthesisClient({
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

    const invalidResult: any = createInProcessSynthesisClient({
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

import { assert } from "chai";
import fs from "fs";
import path from "path";
import {
  SynthesisClientError,
  type SynthesisClient,
} from "../../packages/synthesis-contracts/src/index";
import {
  createWorkflowSynthesisV11Adapter,
  createWorkflowSynthesisHostApi,
  materializeTopicApplyRequest,
  snapshotWorkflowSynthesisItem,
} from "../../src/modules/synthesisClient/workflowHostClient";
import { createSynthesisClientFromPort } from "../../src/modules/synthesisClient/clientPortAdapter";
import {
  createZoteroHostCapabilityBroker,
  resetZoteroHostMutationRuntimeForTests,
} from "../../src/modules/zoteroHostCapabilityBroker";
import {
  resetZoteroLibraryPageQueryAdapterForTests,
  setZoteroLibraryPageQueryAdapterForTests,
} from "../../src/modules/zoteroLibraryPageQuery";
import { createMockZoteroLibraryPageQueryAdapter } from "../helpers/zoteroLibraryPageQueryAdapter";

const ROOT = path.resolve(import.meta.dirname, "../..");
const WORKFLOW_METHODS = [
  "applyLiteratureDigestSidecar",
  "applyTopicSynthesisResult",
  "clearTagAuditRecord",
  "discardStagedTagSuggestions",
  "exportTagVocabularyForRegulator",
  "getTopicPlanningContext",
  "getTopicReport",
  "listStagedTagSuggestions",
  "loadTagVocabulary",
  "readPaperArtifacts",
  "replaceTagAuditRecords",
  "saveTagVocabulary",
  "applyTopicPlan",
  "stageTagSuggestions",
].sort();

const GROUPED_WORKFLOW_METHODS = {
  workflowApply: [
    "applyLiteratureDigest",
    "applyTopicPlan",
    "applyTopicSynthesisResult",
  ],
  topics: ["getReport"],
  artifacts: ["readPaperArtifacts"],
  tags: [
    "loadVocabulary",
    "saveVocabulary",
    "exportVocabularyForRegulator",
    "listStagedSuggestions",
    "stageSuggestions",
    "promoteStagedSuggestions",
    "discardStagedSuggestions",
    "withAuditRun",
    "acknowledgeRegulation",
  ],
} as const;

function topicApplyBundle(overrides: Record<string, unknown> = {}) {
  return {
    kind: "topic_synthesis",
    operation: "create",
    language: "en",
    topic_definition: {
      id: "topic-a",
      title: "Topic A",
    },
    ...overrides,
  };
}

function fakeClient(calls: string[]): SynthesisClient {
  const record = (name: string) => async (request?: unknown) => {
    calls.push(name);
    return { name, request };
  };
  return {
    workflowApply: {
      applyLiteratureDigestSidecar: record("applyLiteratureDigestSidecar"),
      async applyTopicSynthesisResult(request: unknown) {
        calls.push("applyTopicSynthesisResult");
        return { status: "persisted", request };
      },
      async applyTopicPlan(request: unknown) {
        calls.push("applyTopicPlan");
        return {
          status: "persisted",
          graph_hash: "graph-after",
          coverage_stale: false,
          recommended_updates: [],
          diagnostics: [],
          receipt: {
            schema: "zotero-agents.synthesis-canonical-transaction-receipt.v1",
            transaction_id: "transaction-1",
            operation: "topic_plan.reconcile",
            before_graph_hash: "graph-before",
            after_graph_hash: "graph-after",
            committed_at: "2026-08-30T00:00:00.000Z",
          },
        };
      },
    },
    topics: {
      listWorkflowOptions: record("listWorkflowOptions"),
      getPlanningContext: record("getTopicPlanningContext"),
      getTopicReport: record("getTopicReport"),
    },
    artifacts: {
      readPaperArtifacts: record("readPaperArtifacts"),
    },
    tags: {
      loadTagVocabulary: record("loadTagVocabulary"),
      async saveTagVocabulary() {
        calls.push("saveTagVocabulary");
        return { status: "committed" };
      },
      exportTagVocabularyForRegulator: record(
        "exportTagVocabularyForRegulator",
      ),
      listStagedTagSuggestions: record("listStagedTagSuggestions"),
      async stageTagSuggestions() {
        calls.push("stageTagSuggestions");
        return { staged: [] };
      },
      async promoteStagedTagSuggestions() {
        calls.push("promoteStagedTagSuggestions");
        return { promoted: [], skipped: [] };
      },
      async discardStagedTagSuggestions() {
        calls.push("discardStagedTagSuggestions");
        return { discarded: [] };
      },
      replaceTagAuditRecords: record("replaceTagAuditRecords"),
      clearTagAuditRecord: record("clearTagAuditRecord"),
    },
    system: {
      reconcileRuntimeWorkOnStartup: record("reconcileRuntimeWorkOnStartup"),
    },
    maintenance: {
      resetDatabase: record("resetDatabase"),
    },
    notifications: {
      consumeRelatedItemsSyncEcho: record("consumeRelatedItemsSyncEcho"),
    },
  } as unknown as SynthesisClient;
}

async function assertInvalidRequest(run: () => Promise<unknown>) {
  try {
    await run();
    assert.fail("expected an invalid request error");
  } catch (error) {
    assert.instanceOf(error, SynthesisClientError);
    assert.equal((error as SynthesisClientError).code, "invalid_request");
  }
}

describe("Synthesis workflow client migration", function () {
  it("exposes exactly four groups and fourteen explicit candidate members", function () {
    const api = createWorkflowSynthesisHostApi({
      resolveClient: async () => fakeClient([]),
      resolveAuditExecutionIdentity: async () => ({
        hostInstanceId: "host-1",
        principal: {
          packageId: "package-1",
          workflowId: "workflow-1",
          contentDigest: "content-1",
        },
      }),
    });

    assert.deepEqual(Object.keys(api), Object.keys(GROUPED_WORKFLOW_METHODS));
    for (const [group, members] of Object.entries(GROUPED_WORKFLOW_METHODS)) {
      assert.deepEqual(Object.keys(api[group as keyof typeof api]), [
        ...members,
      ]);
    }
    assert.notProperty(api, "applyTopicPlan");
    assert.notProperty(api.tags, "replaceTagAuditRecords");
    assert.notProperty(api.tags, "clearTagAuditRecord");
  });

  it("resolves the current Synthesis client for every invocation", async function () {
    const firstCalls: string[] = [];
    const secondCalls: string[] = [];
    const clients = [fakeClient(firstCalls), fakeClient(secondCalls)];
    let resolutions = 0;
    const api = createWorkflowSynthesisHostApi({
      async resolveClient() {
        return clients[resolutions++];
      },
    });

    await api.topics.getReport({ topicId: "topic-a" });
    await api.topics.getReport({ topicId: "topic-b" });

    assert.equal(resolutions, 2);
    assert.deepEqual(firstCalls, ["getTopicReport"]);
    assert.deepEqual(secondCalls, ["getTopicReport"]);
  });

  it("owns the complete traversal audit lifecycle behind one callback", async function () {
    setZoteroLibraryPageQueryAdapterForTests(
      createMockZoteroLibraryPageQueryAdapter(),
    );
    try {
      const item = new Zotero.Item("journalArticle");
      item.setField("title", "Workflow audit lifecycle");
      await item.saveTx();

      const calls: string[] = [];
      const client = fakeClient(calls);
      let stagedItems = 0;
      client.tags.beginTagAuditRun = async () => {
        calls.push("beginTagAuditRun");
        return {
          outcome: "ready",
          run: { auditRunId: "audit-run-1", leaseToken: "lease-1" },
        };
      };
      client.tags.appendTagAuditRun = async (request) => {
        calls.push("appendTagAuditRun");
        stagedItems += request.entries.length;
        return { outcome: "appended", stagedItems };
      };
      client.tags.promoteTagAuditRun = async (request) => {
        calls.push("promoteTagAuditRun");
        assert.equal(request.visitedItems, stagedItems);
        return {
          outcome: "published",
          snapshot: {
            schema: "zotero-agents.tag-audit-snapshot.v1",
            libraryId: item.libraryID,
            snapshotRevision: "snapshot-1",
            vocabularyHash: "vocabulary-1",
            basisDigest: "basis-1",
            coverageDigest: request.coverageDigest,
            auditedItems: stagedItems,
            needsRegulation: 0,
            publishedAt: "2026-08-30T00:00:00.000Z",
            updatedAt: "2026-08-30T00:00:00.000Z",
          },
        };
      };
      client.tags.abortTagAuditRun = async () => {
        calls.push("abortTagAuditRun");
        return { outcome: "aborted" };
      };
      const broker = createZoteroHostCapabilityBroker();
      const api = createWorkflowSynthesisHostApi({
        resolveClient: async () => client,
        resolveAuditExecutionIdentity: async () => ({
          hostInstanceId: "host-1",
          principal: {
            packageId: "package-1",
            workflowId: "workflow-1",
            contentDigest: "content-1",
          },
        }),
      });

      const result = await api.tags.withAuditRun(
        { libraryId: item.libraryID, vocabularyHash: "vocabulary-1" },
        {},
        (writer) =>
          broker.library.traverseItems(
            { scope: "top-level-regular", pageSize: 50 },
            {},
            (batch) =>
              writer.append(
                batch.items.map((entry) => ({
                  target: {
                    libraryId: entry.ref.libraryId,
                    itemKey: entry.ref.key,
                  },
                  auditedRevision: entry.revision,
                  auditedTagDigest: entry.tagDigest,
                  auditedTags: entry.tags,
                  evaluation: { state: "compliant" as const },
                })),
              ),
          ),
      );

      assert.equal(result.outcome, "published");
      assert.deepEqual(calls, [
        "beginTagAuditRun",
        "appendTagAuditRun",
        "promoteTagAuditRun",
      ]);
    } finally {
      resetZoteroLibraryPageQueryAdapterForTests();
    }
  });

  it("acknowledges regulation only from a pinned Host mutation receipt and fresh item state", async function () {
    const item = new Zotero.Item("journalArticle");
    Object.assign(item, {
      version: 1,
      dateAdded: "2026-08-30T00:00:00.000Z",
      dateModified: "2026-08-30T00:00:00.000Z",
    });
    item.setField("title", "Workflow regulation acknowledgement");
    await item.saveTx();
    const broker = createZoteroHostCapabilityBroker();
    try {
      const mutation = await broker.mutations.execute(
        {
          operation: "item.updateTags",
          operationId: "workflow-regulation-tags",
          itemRef: { libraryId: item.libraryID, key: item.key },
          add: ["method:regulated"],
          remove: [],
        },
        { ownerId: "workflow-regulation-test" },
      );
      assert.include(["committed", "unchanged"], mutation.outcome);
      if (
        mutation.outcome !== "committed" &&
        mutation.outcome !== "unchanged"
      ) {
        assert.fail("expected confirmed tag mutation");
      }
      const change = mutation.receipt.changes[0]!;
      const freshState = await broker.library.getItemAuditState({
        libraryId: item.libraryID,
        key: item.key,
      });
      assert.equal(freshState.revision, change.after.revision);
      const calls: string[] = [];
      const client = fakeClient(calls);
      client.tags.prepareTagRegulationAcknowledgement = async () => {
        calls.push("prepareTagRegulationAcknowledgement");
        return {
          outcome: "ready",
          target: { libraryId: item.libraryID, itemKey: item.key },
          snapshotRevision: "snapshot-1",
          auditedRevision: change.before!.revision,
          vocabularyHash: "vocabulary-1",
          nonCompliantTags: [],
        };
      };
      client.tags.commitTagRegulationAcknowledgement = async (request) => {
        calls.push("commitTagRegulationAcknowledgement");
        assert.equal(request.currentRevision, change.after.revision);
        assert.deepEqual(request.finalTags, ["method:regulated"]);
        return {
          outcome: "acknowledged",
          snapshotRevision: "snapshot-2",
          remainingNeedsRegulation: 0,
        };
      };
      const api = createWorkflowSynthesisHostApi({
        resolveClient: async () => client,
        resolveHostBroker: () => broker,
      });

      const acknowledged = await api.tags.acknowledgeRegulation({
        target: { libraryId: item.libraryID, key: item.key },
        mutationReceipt: mutation.receipt,
      });
      assert.deepEqual(acknowledged, {
        outcome: "acknowledged",
        snapshotRevision: "snapshot-2",
        remainingNeedsRegulation: 0,
      });
      assert.deepEqual(calls, [
        "prepareTagRegulationAcknowledgement",
        "commitTagRegulationAcknowledgement",
      ]);
      assert.deepEqual(
        await api.tags.acknowledgeRegulation({
          target: { libraryId: item.libraryID, key: item.key },
          mutationReceipt: {
            ...mutation.receipt,
            operation: "item.remove",
          },
        }),
        { outcome: "conflict", reason: "receipt_invalid" },
      );
    } finally {
      resetZoteroHostMutationRuntimeForTests();
    }
  });

  it("exposes the workflow methods and routes topic planning through grouped capabilities", async function () {
    const calls: string[] = [];
    const changes: Array<{
      reason: string;
      invalidatedSurfaces: string[];
    }> = [];
    const api = createWorkflowSynthesisV11Adapter({
      resolveClient: async () => fakeClient(calls),
      notifyChanged(input) {
        changes.push({
          reason: String(input.reason || ""),
          invalidatedSurfaces: input.invalidatedSurfaces,
        });
      },
    });

    assert.deepEqual(Object.keys(api).sort(), WORKFLOW_METHODS);
    await api.applyTopicSynthesisResult(topicApplyBundle());
    await api.getTopicReport({ topicId: "topic-a" });
    await api.getTopicPlanningContext();
    await api.applyTopicPlan({
      kind: "topic_plan",
      operation: "reconcile",
      base_graph_hash: "graph-before",
      library_index_hash: "library-before",
      topic_actions: [],
      relation_proposals: [],
      recommended_updates: [],
    });
    await api.readPaperArtifacts({ paper_refs: ["1:AAAA1111"] });
    await api.loadTagVocabulary();
    await api.saveTagVocabulary({ entries: [] });
    await api.exportTagVocabularyForRegulator();
    await api.listStagedTagSuggestions();
    await api.stageTagSuggestions({ entries: [] });
    await api.discardStagedTagSuggestions({ tags: [] });
    await api.applyLiteratureDigestSidecar({
      libraryId: 1,
      itemKey: "AAAA1111",
    });
    await api.replaceTagAuditRecords({ libraryId: 1, entries: [] });
    await api.clearTagAuditRecord({ libraryId: 1, itemKey: "AAAA1111" });

    assert.deepEqual(calls, [
      "applyTopicSynthesisResult",
      "getTopicReport",
      "getTopicPlanningContext",
      "applyTopicPlan",
      "readPaperArtifacts",
      "loadTagVocabulary",
      "saveTagVocabulary",
      "exportTagVocabularyForRegulator",
      "listStagedTagSuggestions",
      "stageTagSuggestions",
      "discardStagedTagSuggestions",
      "applyLiteratureDigestSidecar",
      "replaceTagAuditRecords",
      "clearTagAuditRecord",
    ]);
    assert.deepEqual(changes, [
      {
        reason: "topic_synthesis_apply",
        invalidatedSurfaces: ["home", "topics", "concepts", "graph", "review"],
      },
      {
        reason: "topic_plan_apply",
        invalidatedSurfaces: ["home", "topics", "graph"],
      },
      {
        reason: "tag_vocabulary_save",
        invalidatedSurfaces: ["tags"],
      },
      {
        reason: "tag_suggestions_stage",
        invalidatedSurfaces: ["tags"],
      },
      {
        reason: "literature_digest_apply",
        invalidatedSurfaces: ["index", "graph"],
      },
      {
        reason: "tag_audit_apply",
        invalidatedSurfaces: ["index"],
      },
      {
        reason: "tag_regulation_apply",
        invalidatedSurfaces: ["index"],
      },
    ]);
  });

  it("converts live Zotero items to JSON-safe workflow snapshots", function () {
    const item = {
      libraryID: 1,
      key: "AAAA1111",
      itemType: "journalArticle",
      dateAdded: "2026-07-15 00:00:00",
      getField(field: string) {
        return {
          title: "A bounded paper",
          date: "2024-05-01",
          DOI: "10.1000/example",
          url: "https://example.test/paper",
          extra: "Citation Key: bounded2024",
        }[field];
      },
      getCreators() {
        return [{ firstName: "Ada", lastName: "Lovelace" }];
      },
      getTags() {
        return [{ tag: "method:review" }];
      },
      getCollections() {
        return [7];
      },
    };

    const snapshot = snapshotWorkflowSynthesisItem(item);
    assert.equal(snapshot.libraryId, 1);
    assert.equal(snapshot.itemKey, "AAAA1111");
    assert.equal(snapshot.title, "A bounded paper");
    assert.deepEqual(snapshot.creators, ["Ada Lovelace"]);
    assert.deepEqual(snapshot.tags, ["method:review"]);
    assert.deepEqual(snapshot.collections, ["7"]);
    assert.notProperty(snapshot, "getField");
    assert.doesNotThrow(() => JSON.stringify(snapshot));
  });

  it("materializes relative manifest assets with deterministic controlled ids", async function () {
    const files: Record<string, string> = {
      "result/manifest.json": JSON.stringify({
        analysis_manifest: "result/analysis.json",
        resolver_manifest: "result/resolver.json",
      }),
      "result/analysis.json": JSON.stringify({ sections: [] }),
      "result/resolver.json": JSON.stringify({ resolved_paper_set: {} }),
    };
    const request = await materializeTopicApplyRequest(
      topicApplyBundle({
        operation: "update_full",
        topic_id: "topic-a",
        artifact_manifest_path: "result/manifest.json",
        artifact_metadata: {
          analysis_source_path: "result/analysis.json",
        },
      }),
      {
        bundleReader: {
          readText(filePath) {
            if (!(filePath in files)) throw new Error(`missing ${filePath}`);
            return files[filePath];
          },
        },
      },
    );

    assert.equal(request.bundle.artifact_manifest_path, "asset/0001");
    assert.deepEqual(
      request.assets.map((asset) => asset.id),
      ["asset/0001", "asset/0002", "asset/0003"],
    );
    assert.notProperty(request.bundle, "analysis_manifest_path");
    assert.notProperty(request.bundle, "resolver_manifest_path");
    assert.notInclude(JSON.stringify(request), "result/");
    assert.deepEqual(JSON.parse(request.assets[0]?.text || "{}"), {
      analysis_manifest: "asset/0002",
      resolver_manifest: "asset/0003",
    });
  });

  it("consumes ACP absolute paths without crossing them into the client request", async function () {
    const request = await materializeTopicApplyRequest(
      topicApplyBundle({
        operation: "update_patch",
        topic_id: "topic-a",
        analysis_manifest_path: "/workspace/result/analysis.json",
      }),
      {
        resultContext: {
          async resolveArtifact({ rawPath }) {
            assert.equal(rawPath, "/workspace/result/analysis.json");
            return { text: JSON.stringify({ changed_sections: {} }) };
          },
        },
      },
    );

    assert.equal(request.bundle.analysis_manifest_path, "asset/0001");
    assert.notInclude(JSON.stringify(request), "/workspace/");
  });

  it("materializes section and sidecar locators nested in analysis manifests", async function () {
    const files: Record<string, string> = {
      "result/analysis.json": JSON.stringify({
        sections: {
          summary: { path: "result/sections/summary.json" },
        },
        sidecars: {
          topic_interest_metadata: {
            path: "result/sidecars/topic-interest.json",
          },
        },
      }),
      "result/sections/summary.json": JSON.stringify({ text: "summary" }),
      "result/sidecars/topic-interest.json": JSON.stringify({ score: 1 }),
    };
    const request = await materializeTopicApplyRequest(
      topicApplyBundle({ analysis_manifest_path: "result/analysis.json" }),
      { bundleReader: { readText: (filePath) => files[filePath] || "" } },
    );
    const manifest = JSON.parse(request.assets[0]?.text || "{}") as {
      sections: { summary: { path: string } };
      sidecars: { topic_interest_metadata: { path: string } };
    };

    assert.equal(manifest.sections.summary.path, "asset/0002");
    assert.equal(manifest.sidecars.topic_interest_metadata.path, "asset/0003");
    assert.notInclude(JSON.stringify(request), "result/");
  });

  it("fails invalid and unbounded assets before invoking a client mutation", async function () {
    for (const run of [
      () =>
        materializeTopicApplyRequest(
          { operation: "update_full", analysis_manifest_path: "missing.json" },
          { bundleReader: { readText: () => Promise.reject("missing") } },
        ),
      () =>
        materializeTopicApplyRequest(
          { operation: "update_full", invalid: () => undefined },
          {},
        ),
      () =>
        materializeTopicApplyRequest(
          { operation: "update_full", analysis_manifest_path: "large.json" },
          { bundleReader: { readText: () => "01234567890" } },
          { maxAssetBytes: 10, maxAssets: 2, maxTotalBytes: 20 },
        ),
    ]) {
      try {
        await run();
        assert.fail("expected materialization to fail");
      } catch (error) {
        assert.instanceOf(error, SynthesisClientError);
        assert.equal((error as SynthesisClientError).code, "invalid_request");
      }
    }

    let mutationCalled = false;
    const client = fakeClient([]);
    client.workflowApply.applyTopicSynthesisResult = async () => {
      mutationCalled = true;
      return {};
    };
    const api = createWorkflowSynthesisV11Adapter({
      resolveClient: async () => client,
    });
    await assertInvalidRequest(() =>
      api.applyTopicSynthesisResult(
        { analysis_manifest_path: "missing.json" },
        { bundleReader: { readText: () => Promise.reject("missing") } },
      ),
    );
    assert.isFalse(mutationCalled);
  });

  it("enforces asset count and aggregate size bounds", async function () {
    await assertInvalidRequest(() =>
      materializeTopicApplyRequest(
        { artifact_manifest_path: "manifest.json" },
        {
          bundleReader: {
            readText(filePath) {
              return filePath === "manifest.json"
                ? JSON.stringify({ nested: "nested.json" })
                : "{}";
            },
          },
        },
        { maxAssets: 1 },
      ),
    );
    await assertInvalidRequest(() =>
      materializeTopicApplyRequest(
        {
          analysis_manifest_path: "analysis.json",
          resolver_manifest_path: "resolver.json",
        },
        { bundleReader: { readText: () => "123456" } },
        { maxAssetBytes: 10, maxTotalBytes: 10 },
      ),
    );
  });

  it("reconstructs read-only asset access inside the client port adapter", async function () {
    let capturedBundle: unknown;
    const client = createSynthesisClientFromPort({
      async listWorkflowTopicOptions() {
        return { options: [], diagnostics: [] };
      },
      async applyTopicSynthesisResult(bundle, context) {
        capturedBundle = bundle;
        return {
          ok: true,
          status: "persisted",
          topicId: "topic-a",
          operationId: await context?.bundleReader.readText("asset/0001"),
          hashes: {},
          mismatches: [],
          warnings: [],
        };
      },
    });
    const result = await client.workflowApply.applyTopicSynthesisResult({
      bundle: topicApplyBundle({ analysis_manifest_path: "asset/0001" }),
      assets: [
        {
          id: "asset/0001",
          mediaType: "application/json",
          text: '{"ok":true}',
        },
      ],
    });

    assert.deepEqual(capturedBundle, {
      kind: "topic_synthesis",
      operation: "create",
      language: "en",
      topic_definition: { id: "topic-a", title: "Topic A" },
      analysis_manifest_path: "asset/0001",
    });
    assert.equal(result.operationId, '{"ok":true}');
  });

  it("removes workflow modules from the full-service dependency boundary", function () {
    for (const relativePath of [
      "src/workflows/hostApi.ts",
      "src/workflows/types.ts",
    ]) {
      const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
      assert.notMatch(source, /synthesis\/service["']/);
      assert.notMatch(source, /\bSynthesisService\b/);
    }
  });
});

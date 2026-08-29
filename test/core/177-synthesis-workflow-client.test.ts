import { assert } from "chai";
import fs from "fs";
import path from "path";
import {
  SynthesisClientError,
  type SynthesisClient,
} from "../../packages/synthesis-contracts/src/index";
import {
  createWorkflowSynthesisHostApi,
  materializeTopicApplyRequest,
  snapshotWorkflowSynthesisItem,
} from "../../src/modules/synthesisClient/workflowHostClient";
import { createSynthesisClientFromPort } from "../../src/modules/synthesisClient/clientPortAdapter";

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
      applyTopicSynthesisResult: record("applyTopicSynthesisResult"),
    },
    topics: {
      listWorkflowOptions: record("listWorkflowOptions"),
      getPlanningContext: record("getTopicPlanningContext"),
      applyPlan: record("applyTopicPlan"),
      getTopicReport: record("getTopicReport"),
    },
    artifacts: {
      readPaperArtifacts: record("readPaperArtifacts"),
    },
    tags: {
      loadTagVocabulary: record("loadTagVocabulary"),
      saveTagVocabulary: record("saveTagVocabulary"),
      exportTagVocabularyForRegulator: record(
        "exportTagVocabularyForRegulator",
      ),
      listStagedTagSuggestions: record("listStagedTagSuggestions"),
      stageTagSuggestions: record("stageTagSuggestions"),
      discardStagedTagSuggestions: record("discardStagedTagSuggestions"),
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
  it("exposes the workflow methods and routes topic planning through grouped capabilities", async function () {
    const calls: string[] = [];
    const changes: Array<{
      reason: string;
      invalidatedSurfaces: string[];
    }> = [];
    const api = createWorkflowSynthesisHostApi({
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
        reason: "tag_suggestions_discard",
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
    const api = createWorkflowSynthesisHostApi({
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

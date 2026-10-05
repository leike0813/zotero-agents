import { assert } from "chai";
import Ajv2020 from "ajv/dist/2020";
import { createPiSynthesisToolDefinitions } from "../../src/modules/piSynthesisToolCatalog";
import {
  type SynthesisClient,
  type SynthesisJsonObject,
  type SynthesisPublicMaintenanceOperation,
} from "../../packages/synthesis-contracts/src/index";

function createWorkspace() {
  const appended: string[] = [];
  return {
    appended,
    workspace: {
      outputResourceKey: "workspace:/owner",
      beginGeneratedTextOutput: async () => ({
        append: async (text: string) => {
          appended.push(text);
        },
        commit: async () => ({
          path: "/owner/generated/output.json",
          sizeBytes: 2,
          sha256: "sha256:generated",
        }),
        discard: async () => undefined,
      }),
      materializeGeneratedArchive: async () => ({
        rootPath: "/owner/exports/bundle",
        entryCount: 0,
        totalBytes: 0,
      }),
    },
  };
}

type ClientCall = { path: string; args: unknown[] };

const clientPaths = [
  "searchEvidence",
  "topics.list",
  "topics.findByPaperRef",
  "topics.search",
  "topics.getContext",
  "topics.getPlanningContext",
  "topics.getTopicReport",
  "topics.resolveResolver",
  "maintenance.getSchemas",
  "maintenance.getOperation",
  "concepts.query",
  "graph.queryCluster",
  "graph.getOverview",
  "graph.getSlice",
  "graph.getPersistedLayout",
  "graph.getMetrics",
  "graph.rankLibraryPapers",
  "graph.refreshMetricsNow",
  "graph.startUpdate",
  "libraryIndex.getPage",
  "references.getSidecarIndex",
  "references.startRefresh",
  "references.rankExternalReferences",
  "references.getAttentionQueue",
  "artifacts.getManifest",
  "artifacts.readPaperArtifacts",
  "artifacts.exportFiltered",
  "artifacts.resolveTopicPaperDigest",
  "workflowReview.getInput",
];

function recordingClient(
  calls: ClientCall[],
  result: unknown,
): SynthesisClient {
  const root: Record<string, unknown> = {};
  for (const path of clientPaths) {
    const segments = path.split(".");
    let node = root;
    for (const segment of segments.slice(0, -1)) {
      if (typeof node[segment] !== "object" || node[segment] === null) {
        node[segment] = {};
      }
      node = node[segment] as Record<string, unknown>;
    }
    node[segments[segments.length - 1]!] = (...args: unknown[]) => {
      calls.push({ path, args });
      return Promise.resolve(result);
    };
  }
  return root as unknown as SynthesisClient;
}

function pendingOperation(
  operationId: string,
): SynthesisPublicMaintenanceOperation {
  return {
    schema: "synthesis.maintenance_operation.v1",
    operation_id: operationId,
    status: "pending",
  };
}

type Binding = {
  capabilityId: string;
  name: string;
  input: SynthesisJsonObject;
  call: string;
  result: unknown;
  args?: unknown[];
  checkArgs?: (args: unknown[]) => void;
  maintenance?: boolean;
  planning?: boolean;
  dispatch?: false;
};

const bindings: Binding[] = [
  {
    capabilityId: "synthesis.search_evidence",
    name: "zotero_synthesis_search_evidence",
    input: { query: "energy", limit: 2 },
    call: "searchEvidence",
    result: { capability: "synthesis.search_evidence" },
  },
  {
    capabilityId: "topics.search",
    name: "zotero_topics_search",
    input: { query: "energy", sections: ["comparison_matrix"] },
    call: "topics.search",
    result: { capability: "topics.search" },
  },
  {
    capabilityId: "topics.list",
    name: "zotero_topics_list",
    input: { cursor: "opaque-cursor", limit: 2 },
    call: "topics.list",
    result: { capability: "topics.list" },
  },
  {
    capabilityId: "topics.find_by_paper_ref",
    name: "zotero_topics_find_by_paper_ref",
    input: { paper_refs: ["paper:energy-1"] },
    call: "topics.findByPaperRef",
    result: { capability: "topics.find_by_paper_ref" },
  },
  {
    capabilityId: "topics.get_context",
    name: "zotero_topics_get_context",
    input: { topicId: "topic:energy", view: "digest" },
    call: "topics.getContext",
    result: { capability: "topics.get_context" },
  },
  {
    capabilityId: "topics.get_planning_context",
    name: "zotero_topics_get_planning_context",
    input: {},
    call: "topics.getPlanningContext",
    result: { topics: [], coverage: "complete" },
    args: [],
    planning: true,
  },
  {
    capabilityId: "topics.get_report",
    name: "zotero_topics_get_report",
    input: { topicId: "topic:energy" },
    call: "topics.getTopicReport",
    result: { capability: "topics.get_report" },
  },
  {
    capabilityId: "schemas.get",
    name: "zotero_schemas_get",
    input: {},
    call: "maintenance.getSchemas",
    result: { capability: "schemas.get" },
    args: [],
  },
  {
    capabilityId: "concepts.query",
    name: "zotero_concepts_query",
    input: { query: "energy", limit: 5 },
    call: "concepts.query",
    result: { capability: "concepts.query" },
  },
  {
    capabilityId: "citation_graph.query_cluster",
    name: "zotero_citation_graph_query_cluster",
    input: { limit: 25, layoutAlgorithm: "force" },
    call: "graph.queryCluster",
    result: { capability: "citation_graph.query_cluster" },
  },
  {
    capabilityId: "library_index.get",
    name: "zotero_library_index_get",
    input: { limit: 10, includeTags: true },
    call: "libraryIndex.getPage",
    result: { capability: "library_index.get" },
  },
  {
    capabilityId: "resolvers.resolve",
    name: "zotero_resolvers_resolve",
    input: {
      paper_refs: ["paper:energy-1"],
      collection_key: [],
      combine: "union",
      cursor: 0,
      limit: 10,
    },
    call: "topics.resolveResolver",
    result: { capability: "resolvers.resolve" },
  },
  {
    capabilityId: "reference_index.get",
    name: "zotero_reference_index_get",
    input: { limit: 10, includeReferences: true },
    call: "references.getSidecarIndex",
    result: { capability: "reference_index.get" },
  },
  {
    capabilityId: "reference_sidecar.refresh",
    name: "zotero_reference_sidecar_refresh",
    input: {},
    call: "references.startRefresh",
    result: pendingOperation("operation:refresh"),
    args: [{}],
    maintenance: true,
  },
  {
    capabilityId: "synthesis.operation.get",
    name: "zotero_synthesis_operation_get",
    input: { operation_id: "operation:refresh" },
    call: "maintenance.getOperation",
    result: pendingOperation("operation:refresh"),
  },
  {
    capabilityId: "citation_graph.get_overview",
    name: "zotero_citation_graph_get_overview",
    input: { limit: 25 },
    call: "graph.getOverview",
    result: { capability: "citation_graph.get_overview" },
  },
  {
    capabilityId: "citation_graph.get_slice",
    name: "zotero_citation_graph_get_slice",
    input: { startNodeId: "node:energy", depth: 2 },
    call: "graph.getSlice",
    result: { capability: "citation_graph.get_slice" },
  },
  {
    capabilityId: "citation_graph.get_layout",
    name: "zotero_citation_graph_get_layout",
    input: { scope: "full", algorithm: "force" },
    call: "graph.getPersistedLayout",
    result: { capability: "citation_graph.get_layout" },
  },
  {
    capabilityId: "citation_graph.get_metrics",
    name: "zotero_citation_graph_get_metrics",
    input: { limit: 10, sortBy: "pagerank" },
    call: "graph.getMetrics",
    result: { capability: "citation_graph.get_metrics" },
  },
  {
    capabilityId: "citation_graph.rank_external_references",
    name: "zotero_citation_graph_rank_external_references",
    input: { limit: 10, sortBy: "external_degree" },
    call: "references.rankExternalReferences",
    result: { capability: "citation_graph.rank_external_references" },
  },
  {
    capabilityId: "citation_graph.rank_library_papers",
    name: "zotero_citation_graph_rank_library_papers",
    input: { limit: 10, sortBy: "foundation" },
    call: "graph.rankLibraryPapers",
    result: { capability: "citation_graph.rank_library_papers" },
  },
  {
    capabilityId: "citation_graph.refresh_metrics",
    name: "zotero_citation_graph_refresh_metrics",
    input: { expectedGraphHash: "graph-hash:1" },
    call: "graph.refreshMetricsNow",
    result: pendingOperation("operation:metrics"),
    maintenance: true,
  },
  {
    capabilityId: "citation_graph.update",
    name: "zotero_citation_graph_update",
    input: { idempotencyKey: "update:1" },
    call: "graph.startUpdate",
    result: pendingOperation("operation:update"),
    maintenance: true,
  },
  {
    capabilityId: "paper_artifacts.get_manifest",
    name: "zotero_paper_artifacts_get_manifest",
    input: { paper_refs: ["paper:energy-1"], artifact_types: ["digest"] },
    call: "artifacts.getManifest",
    result: { capability: "paper_artifacts.get_manifest" },
  },
  {
    capabilityId: "paper_artifacts.read",
    name: "zotero_paper_artifacts_read",
    input: { paper_refs: ["paper:energy-1"], artifact_types: ["digest"] },
    call: "artifacts.readPaperArtifacts",
    result: { capability: "paper_artifacts.read" },
  },
  {
    capabilityId: "paper_artifacts.export_filtered",
    name: "zotero_paper_artifacts_export_filtered",
    input: { paper_refs: ["paper:energy-1"] },
    call: "artifacts.exportFiltered",
    result: { capability: "paper_artifacts.export_filtered" },
    dispatch: false,
  },
  {
    capabilityId: "paper_artifacts.resolve_topic_digest",
    name: "zotero_paper_artifacts_resolve_topic_digest",
    input: { paper_ref: "paper:energy-1", include_representative_image: false },
    call: "artifacts.resolveTopicPaperDigest",
    result: { capability: "paper_artifacts.resolve_topic_digest" },
    checkArgs: (args) => {
      const request = args[0] as Record<string, unknown>;
      assert.equal(request.paperRef, "paper:energy-1", "digest paper ref");
      assert.equal(
        request.includeRepresentativeImage,
        false,
        "digest representative image flag",
      );
    },
  },
  {
    capabilityId: "topics.get_review_input",
    name: "zotero_topics_get_review_input",
    input: { topicId: "topic:energy", maxGraphNodes: 10 },
    call: "workflowReview.getInput",
    result: { capability: "topics.get_review_input" },
  },
  {
    capabilityId: "insights.get_attention_queue",
    name: "zotero_insights_get_attention_queue",
    input: { limit: 10 },
    call: "references.getAttentionQueue",
    result: { capability: "insights.get_attention_queue" },
  },
];

describe("Pi Synthesis tool bindings", function () {
  it("covers the reviewed capability, name and client member for all 29 tools", function () {
    const { workspace } = createWorkspace();
    const definitions = createPiSynthesisToolDefinitions({
      workspace,
      resolveSynthesisClient: () => recordingClient([], null),
      recordOperation: async () => "receipt",
    });
    assert.lengthOf(bindings, 29);
    assert.lengthOf(definitions, 29);
    assert.equal(new Set(bindings.map((entry) => entry.capabilityId)).size, 29);
    const byCapability = new Map(
      definitions.map((definition) => [definition.capabilityId, definition]),
    );
    for (const binding of bindings) {
      const definition = byCapability.get(binding.capabilityId);
      assert.isDefined(definition, binding.capabilityId);
      assert.equal(definition!.name, binding.name);
      assert.include(clientPaths, binding.call);
    }
  });

  for (const binding of bindings) {
    it(`dispatches ${binding.capabilityId} to ${binding.call}`, async function () {
      const { appended, workspace } = createWorkspace();
      const calls: ClientCall[] = [];
      const operations: Array<{
        callId?: string;
        operation: SynthesisPublicMaintenanceOperation;
      }> = [];
      const definitions = createPiSynthesisToolDefinitions({
        workspace,
        resolveSynthesisClient: () => recordingClient(calls, binding.result),
        recordOperation: async (input) => {
          operations.push(input);
          return `receipt:${input.operation.operation_id}`;
        },
      });
      const definition = definitions.find(
        (candidate) => candidate.capabilityId === binding.capabilityId,
      );
      assert.isDefined(definition, binding.capabilityId);
      const validate = new Ajv2020({ strict: false }).compile(
        definition!.schema,
      );
      assert.isTrue(
        validate(binding.input),
        JSON.stringify(validate.errors ?? []),
      );

      if (binding.dispatch === false) {
        // Export dispatch resolves a registered bridge download and materializes
        // a real archive; the 302 real-bridge integration owns that path.
        assert.isFalse(validate({ ...binding.input, run_root: "/private" }));
        return;
      }

      const callId = `call:${binding.capabilityId}`;
      const execution = await definition!.execute(binding.input, {
        signal: new AbortController().signal,
        onUpdate: () => undefined,
        callId,
      });
      assert.equal(execution.status, "completed");
      assert.lengthOf(calls, 1);
      assert.equal(calls[0]!.path, binding.call);
      if (binding.checkArgs) binding.checkArgs(calls[0]!.args);
      else assert.deepEqual(calls[0]!.args, binding.args ?? [binding.input]);

      if (binding.planning) {
        assert.deepEqual(JSON.parse(appended[0]!), binding.result);
        assert.equal(
          (execution.value as { artifact: { path: string } }).artifact.path,
          "/owner/generated/output.json",
        );
        assert.equal(execution.effectCertainty, "confirmed_complete");
        assert.lengthOf(operations, 0);
      } else if (binding.maintenance) {
        assert.deepEqual(operations, [{ callId, operation: binding.result }]);
        assert.deepEqual(execution.value, binding.result);
        assert.equal(
          execution.domainReceiptRef,
          `receipt:${(binding.result as SynthesisPublicMaintenanceOperation).operation_id}`,
        );
        assert.equal(execution.effectCertainty, "confirmed_complete");
      } else {
        assert.deepEqual(execution.value, binding.result);
        assert.equal(execution.effectCertainty, "not_applicable");
        assert.lengthOf(operations, 0);
      }
    });
  }

  it("closes strict-empty tool schemas over unknown fields", function () {
    const { workspace } = createWorkspace();
    const definitions = createPiSynthesisToolDefinitions({
      workspace,
      resolveSynthesisClient: () => recordingClient([], null),
      recordOperation: async () => "receipt",
    });
    for (const capabilityId of [
      "topics.get_planning_context",
      "schemas.get",
      "reference_sidecar.refresh",
    ]) {
      const definition = definitions.find(
        (candidate) => candidate.capabilityId === capabilityId,
      )!;
      const validate = new Ajv2020({ strict: false }).compile(
        definition.schema,
      );
      assert.isTrue(validate({}), capabilityId);
      assert.isFalse(validate({ unexpected: true }), capabilityId);
    }
  });

  it("requires cursor and limit for Topic list paging", function () {
    const { workspace } = createWorkspace();
    const definitions = createPiSynthesisToolDefinitions({
      workspace,
      resolveSynthesisClient: () => recordingClient([], null),
      recordOperation: async () => "receipt",
    });
    const definition = definitions.find(
      (candidate) => candidate.capabilityId === "topics.list",
    )!;
    const validate = new Ajv2020({ strict: false }).compile(definition.schema);
    assert.isTrue(validate({ cursor: "opaque-cursor", limit: 2 }));
    assert.isFalse(validate({ cursor: "opaque-cursor" }));
    assert.isFalse(validate({ limit: 2 }));
    assert.isFalse(
      validate({ cursor: "opaque-cursor", limit: 2, run_root: "/private" }),
    );
  });

  it("closes Topic context to inline and file delivery", function () {
    const { workspace } = createWorkspace();
    const definitions = createPiSynthesisToolDefinitions({
      workspace,
      resolveSynthesisClient: () => recordingClient([], null),
      recordOperation: async () => "receipt",
    });
    const definition = definitions.find(
      (candidate) => candidate.capabilityId === "topics.get_context",
    )!;
    const validate = new Ajv2020({ strict: false }).compile(definition.schema);
    assert.isTrue(validate({ topicId: "topic:energy", view: "digest" }));
    assert.isTrue(
      validate({ topicId: "topic:energy", view: "digest", delivery: "file" }),
    );
    assert.isFalse(
      validate({ topicId: "topic:energy", view: "digest", delivery: "zip" }),
    );
  });
});

import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import { Worker } from "node:worker_threads";
import {
  SYNTHESIS_CITATION_GRAPH_BUILD_REFERENCE_MAX,
  SYNTHESIS_CITATION_GRAPH_BUILD_SOURCE_MAX,
  SYNTHESIS_CITATION_GRAPH_BUILD_TARGET_MAX,
  computeSynthesisCitationGraphBuild,
  createInProcessSynthesisCitationGraphBuildEngine,
  rebuildSynthesisCitationGraphBuildRequest,
  rebuildSynthesisCitationGraphBuildResult,
  type SynthesisCitationGraphBuildRequest,
} from "../../packages/synthesis-engine/src/citationGraphBuild";
import { buildUnifiedCitationGraph } from "../../src/modules/synthesis/citationGraph";
import { buildProductionCitationGraphWithEngine } from "../../src/modules/synthesis/citationGraphBuildEngineAdapter";

function sampleRequest(): SynthesisCitationGraphBuildRequest {
  return {
    contractVersion: "synthesis-citation-graph-build.v1",
    scope: {
      kind: "source_slice",
      sourceIds: ["paper:A"],
    },
    rolePriority: ["background", "method"],
    libraryNodes: [
      {
        nodeId: "paper:B",
        title: "Target",
        year: "2020",
        authors: ["Target Author"],
        aliases: ["ref:target"],
      },
      {
        nodeId: "paper:A",
        title: "Source",
        year: "2024",
        authors: ["Source Author"],
        aliases: [],
      },
    ],
    references: [
      {
        referenceId: "raw:2",
        edgeId: "edge:2",
        sourceId: "paper:A",
        targetId: "ref:external",
        targetKind: "external_reference",
        targetTitle: "External",
        targetAuthors: [],
        roles: ["method"],
        weight: 1,
      },
      {
        referenceId: "raw:1",
        edgeId: "edge:1",
        sourceId: "paper:A",
        targetId: "paper:B",
        targetKind: "library_paper",
        roles: ["background", "method"],
        weight: 1,
      },
      {
        referenceId: "raw:3",
        edgeId: "edge:3",
        sourceId: "paper:A",
        targetId: "paper:B",
        targetKind: "library_paper",
        roles: ["background"],
        weight: 1,
      },
    ],
  };
}

describe("Synthesis Unified Citation Graph build engine", function () {
  it("canonically rebuilds strict requests with production bounds", function () {
    assert.equal(SYNTHESIS_CITATION_GRAPH_BUILD_SOURCE_MAX, 25_000);
    assert.equal(SYNTHESIS_CITATION_GRAPH_BUILD_REFERENCE_MAX, 1_250_000);
    assert.equal(SYNTHESIS_CITATION_GRAPH_BUILD_TARGET_MAX, 750_000);

    const request = sampleRequest();
    const rebuilt = rebuildSynthesisCitationGraphBuildRequest({
      ...request,
      ignored: true,
      libraryNodes: request.libraryNodes
        .map((node) => ({ ...node, ignored: true }))
        .reverse(),
      references: request.references
        .map((reference) => ({ ...reference, ignored: true }))
        .reverse(),
    });

    assert.deepEqual(
      rebuilt.libraryNodes.map((node) => node.nodeId),
      ["paper:A", "paper:B"],
    );
    assert.deepEqual(
      rebuilt.references.map((reference) => reference.referenceId),
      ["raw:1", "raw:2", "raw:3"],
    );
    assert.notProperty(rebuilt as Record<string, unknown>, "ignored");
    assert.notProperty(
      rebuilt.libraryNodes[0] as Record<string, unknown>,
      "ignored",
    );
  });

  it("rejects non-JSON, duplicate, dangling, invalid, and bounded inputs", function () {
    const request = sampleRequest();
    const invalid: unknown[] = [
      { ...request, ignored: () => undefined },
      {
        ...request,
        libraryNodes: [...request.libraryNodes, request.libraryNodes[0]],
      },
      {
        ...request,
        references: [...request.references, request.references[0]],
      },
      {
        ...request,
        references: request.references.map((reference, index) =>
          index === 0 ? { ...reference, sourceId: "missing" } : reference,
        ),
      },
      {
        ...request,
        references: request.references.map((reference, index) =>
          index === 0 ? { ...reference, targetKind: "unknown" } : reference,
        ),
      },
      {
        ...request,
        references: request.references.map((reference, index) =>
          index === 0 ? { ...reference, weight: Number.NaN } : reference,
        ),
      },
      {
        ...request,
        rolePriority: ["method", "method"],
      },
    ];
    for (const value of invalid) {
      assert.throws(() => rebuildSynthesisCitationGraphBuildRequest(value));
    }

    assert.throws(() =>
      rebuildSynthesisCitationGraphBuildRequest(request, {
        sourceMax: 1,
        referenceMax: 10,
        targetMax: 10,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisCitationGraphBuildRequest(request, {
        sourceMax: 10,
        referenceMax: 2,
        targetMax: 10,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisCitationGraphBuildRequest(request, {
        sourceMax: 10,
        referenceMax: 10,
        targetMax: 0,
      }),
    );
  });

  it("builds resolved edges, aggregates, ownership, incoming groups, and light metrics", function () {
    const request = sampleRequest();
    const result = computeSynthesisCitationGraphBuild(request);
    assert.deepEqual(
      result.nodes.map((node) => node.nodeId),
      ["paper:A", "paper:B", "ref:external"],
    );
    assert.deepEqual(
      result.resolvedEdges.map((edge) => edge.edgeId),
      ["edge:1", "edge:2", "edge:3"],
    );
    assert.deepInclude(result.aggregateEdges[0], {
      sourceId: "paper:A",
      targetId: "paper:B",
      mentionCount: 2,
      primaryRole: "background",
      auxRoles: [{ role: "method", count: 1 }],
    });
    assert.lengthOf(result.sourceOwnership, 3);
    assert.lengthOf(result.incomingGroups, 3);
    assert.deepInclude(
      result.lightMetrics.find((metric) => metric.nodeId === "paper:A"),
      {
        outgoingCount: 3,
        incomingCount: 0,
        localDegree: 3,
        matchedOutgoingCount: 2,
        unresolvedOutgoingCount: 1,
      },
    );
    assert.deepInclude(
      result.lightMetrics.find((metric) => metric.nodeId === "paper:B"),
      {
        outgoingCount: 0,
        incomingCount: 2,
        localDegree: 2,
      },
    );
    assert.deepEqual(
      rebuildSynthesisCitationGraphBuildResult(
        {
          ...result,
          ignored: true,
          nodes: result.nodes
            .map((node) => ({ ...node, ignored: true }))
            .reverse(),
        },
        request,
      ),
      result,
    );
  });

  it("preserves the characterized legacy graph and application hash", function () {
    const graph = buildUnifiedCitationGraph({
      papers: [
        {
          libraryId: 1,
          itemKey: "AAAA1111",
          title: "Source",
          references: [
            {
              title: "Target",
              year: "2020",
              authors: ["Target"],
              roles: ["background", "method"],
            },
            {
              title: "Target",
              year: "2020",
              authors: ["Target"],
              roles: ["background"],
            },
            { raw: "Unresolved Reference" },
          ],
        },
        {
          libraryId: 1,
          itemKey: "BBBB2222",
          title: "Target",
          year: "2020",
          authors: ["Target"],
        },
      ],
      rolePriority: ["background", "method"],
    });

    assert.equal(
      graph.graph_hash,
      "sha256:26b96485fa12c53d3d482b5c73395388641b197ab08f9286e962e4501b8015e0",
    );
    const promotedEdge = graph.edges.find(
      (edge) => edge.target === "zotero:item:BBBB2222",
    );
    assert.equal(promotedEdge?.mention_count, 2);
    assert.equal(promotedEdge?.primary_role, "background");
    assert.deepEqual(promotedEdge?.aux_roles, [{ role: "method", count: 1 }]);
    assert.equal(graph.diagnostics.reference_stats.promoted, 2);
    assert.equal(graph.diagnostics.reference_stats.unresolved, 1);
  });

  it("projects production graph records without changing persistence semantics", async function () {
    const built = await buildProductionCitationGraphWithEngine({
      engine: createInProcessSynthesisCitationGraphBuildEngine(),
      timestamp: "2026-07-16T00:00:00.000Z",
      input: {
        scope: "source_slice",
        sourceLiteratureItemIds: ["1:A"],
        libraryNodes: [
          {
            literatureItemId: "1:A",
            title: "Source",
            year: "2024",
            authors: ["Source Author"],
          },
          {
            literatureItemId: "1:B",
            title: "Bound Target",
            year: "2020",
            authors: ["Target Author"],
          },
        ],
        references: [
          {
            edgeId: "edge:raw-1",
            referenceInstanceId: "raw-1",
            sourceLiteratureItemId: "1:A",
            targetLiteratureItemId: "1:B",
            targetKind: "library_paper",
            targetAuthors: [],
            resolutionId: "canonical:1",
            roles: ["background"],
            rolesJson: '[{"role":"background","count":1}]',
            weight: 1,
            createdAt: "2026-07-15T00:00:00.000Z",
          },
          {
            edgeId: "edge:raw-2",
            referenceInstanceId: "raw-2",
            sourceLiteratureItemId: "1:A",
            targetLiteratureItemId: "canonical:2",
            targetKind: "external_reference",
            targetTitle: "External Target",
            targetYear: "2019",
            targetAuthors: ["External Author"],
            resolutionId: "canonical:2",
            roles: [],
            rolesJson: "[]",
            weight: 1,
            createdAt: "2026-07-15T00:00:01.000Z",
          },
        ],
      },
    });

    assert.deepInclude(built.records.nodes.get("1:A"), {
      literatureItemId: "1:A",
      hasZoteroBinding: true,
      title: "Source",
      authorsJson: '["Source Author"]',
    });
    assert.deepInclude(built.records.nodes.get("canonical:2"), {
      literatureItemId: "canonical:2",
      hasZoteroBinding: false,
      title: "External Target",
      authorsJson: '["External Author"]',
    });
    assert.deepEqual(
      built.records.edges.map((edge) => ({
        edgeId: edge.edgeId,
        status: edge.edgeStatus,
        rolesJson: edge.rolesJson,
      })),
      [
        {
          edgeId: "edge:raw-1",
          status: "accepted",
          rolesJson: '[{"role":"background","count":1}]',
        },
        {
          edgeId: "edge:raw-2",
          status: "unbound",
          rolesJson: "[]",
        },
      ],
    );
    assert.deepInclude(
      built.records.lightweightMetrics.find(
        (metric) => metric.literatureItemId === "1:A",
      ),
      {
        outgoingCount: 2,
        matchedOutgoingCount: 1,
        unresolvedOutgoingCount: 1,
      },
    );
  });

  it("supports checkpoint abort and direct/worker structured-clone parity", async function () {
    const request = sampleRequest();
    assert.throws(() =>
      computeSynthesisCitationGraphBuild(request, {
        checkpoint(checkpoint) {
          if (checkpoint.phase === "references") {
            throw new Error("cancelled");
          }
        },
        checkpointInterval: 1,
      }),
    );

    const direct =
      await createInProcessSynthesisCitationGraphBuildEngine().compute(request);
    const worker = new Worker(
      new URL(
        "../fixtures/synthesis-citation-build-engine-worker.ts",
        import.meta.url,
      ),
      {
        execArgv: ["--import", "tsx"],
      },
    );
    const workerResult = await new Promise<unknown>((resolve, reject) => {
      worker.once("message", resolve);
      worker.once("error", reject);
      worker.postMessage(request);
    });
    await worker.terminate();
    assert.deepEqual(
      rebuildSynthesisCitationGraphBuildResult(workerResult, request),
      direct,
    );
  });

  it("keeps the engine source environment-neutral", async function () {
    const source = await fs.readFile(
      path.join(
        process.cwd(),
        "packages/synthesis-engine/src/citationGraphBuild.ts",
      ),
      "utf8",
    );
    for (const forbidden of [
      /from\s+["']node:/,
      /\bZotero\b/,
      /zotero-plugin-toolkit/,
      /from\s+["'][^"']*repository/,
      /from\s+["'][^"']*foundation/,
    ]) {
      assert.notMatch(source, forbidden);
    }
  });
});

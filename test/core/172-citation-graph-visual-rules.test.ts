import { assert } from "chai";
import {
  aggregateCitationGraphVisualEdges,
  buildCitationGraphNodeImportance,
  citationGraphIncomingCounts,
  citationGraphInteractionOffsets,
  citationGraphNodeSize,
  GRAPH_LIBRARY_BASE_NODE_SIZE,
  GRAPH_LIBRARY_NODE_SIZE_CAP,
  projectCitationGraphVisibility,
  selectCitationGraphInteractionEdges,
} from "../../src/shared/citationGraphVisualRules";

describe("Citation graph visual rules", function () {
  it("prefers formal metrics and derives fallback degree from visible weighted edges", function () {
    const nodes = [
      { id: "source", kind: "library_paper" as const },
      { id: "fallback", kind: "library_paper" as const },
      {
        id: "formal-zero",
        kind: "library_paper" as const,
        metrics: { internal_in_degree: 0 },
      },
      {
        id: "formal-one",
        kind: "library_paper" as const,
        metrics: { internal_in_degree: 1 },
      },
    ];
    const importance = buildCitationGraphNodeImportance(nodes, [
      { id: "visible", source: "source", target: "fallback", mention_count: 3 },
      {
        id: "hidden-source",
        source: "not-visible",
        target: "source",
        mention_count: 20,
      },
      {
        id: "hover-only",
        source: "source",
        target: "formal-zero",
        mention_count: 20,
        visibility: "hover_only",
      },
    ]);

    assert.equal(importance.get("fallback")?.incomingDegree, 3);
    assert.isUndefined(importance.get("source"));
    assert.isUndefined(importance.get("formal-zero"));
    assert.equal(importance.get("formal-one")?.incomingDegree, 1);
    assert.isAbove(
      importance.get("fallback")?.percentile || 0,
      importance.get("formal-one")?.percentile || 0,
    );
  });

  it("uses a continuous logarithmic scale so a single positive degree does not reach the cap", function () {
    const nodes = [
      {
        id: "first",
        kind: "library_paper" as const,
        metrics: { internal_in_degree: 1 },
      },
      {
        id: "second",
        kind: "library_paper" as const,
        metrics: { internal_in_degree: 1 },
      },
    ];
    const importance = buildCitationGraphNodeImportance(nodes, []);
    const first = importance.get("first");

    assert.closeTo(first?.percentile || 0, Math.log(2) / Math.log(3), 1e-9);
    const size = citationGraphNodeSize(nodes[0], first, false);
    assert.isAbove(size, GRAPH_LIBRARY_BASE_NODE_SIZE);
    assert.isBelow(size, GRAPH_LIBRARY_NODE_SIZE_CAP);
    assert.equal(first?.halo, true);
  });

  it("partitions external nodes by distinct visible library sources", function () {
    const libraryIsolate = {
      id: "library:isolate",
      kind: "library_paper" as const,
    };
    const librarySourceA = {
      id: "library:a",
      kind: "library_paper" as const,
    };
    const librarySourceB = {
      id: "library:b",
      kind: "library_paper" as const,
    };
    const sharedExternal = {
      id: "external:shared",
      kind: "external_reference" as const,
    };
    const singleExternal = {
      id: "external:single",
      kind: "external_reference" as const,
    };
    const disconnectedExternal = {
      id: "external:disconnected",
      kind: "unresolved_reference" as const,
    };

    const projection = projectCitationGraphVisibility({
      nodes: [
        libraryIsolate,
        librarySourceA,
        librarySourceB,
        sharedExternal,
        singleExternal,
        disconnectedExternal,
      ],
      edges: [
        {
          id: "edge:a:shared",
          source: librarySourceA.id,
          target: sharedExternal.id,
        },
        {
          id: "edge:b:shared",
          source: librarySourceB.id,
          target: sharedExternal.id,
        },
        {
          id: "edge:a:single:first",
          source: librarySourceA.id,
          target: singleExternal.id,
        },
        {
          id: "edge:a:single:repeat",
          source: librarySourceA.id,
          target: singleExternal.id,
        },
        {
          id: "edge:missing-endpoint",
          source: librarySourceA.id,
          target: "external:not-loaded",
        },
      ],
    });

    assert.deepEqual(
      projection.defaultNodes.map((node) => node.id),
      [
        libraryIsolate.id,
        librarySourceA.id,
        librarySourceB.id,
        sharedExternal.id,
      ],
    );
    assert.deepEqual(
      projection.defaultEdges.map((edge) => edge.id),
      ["edge:a:shared", "edge:b:shared"],
    );
    assert.deepEqual(
      projection.hoverOnlyNodes.map((node) => node.id),
      [singleExternal.id],
    );
    assert.deepEqual(
      projection.hoverOnlyEdges.map((edge) => edge.id),
      ["edge:a:single:first", "edge:a:single:repeat"],
    );
  });

  it("collapses parallel raw records into one deterministic visual edge", function () {
    const edges = aggregateCitationGraphVisualEdges([
      {
        id: "edge:z",
        source: "library:a",
        target: "external:x",
        mention_count: 2,
        primary_role: "background",
      },
      {
        id: "edge:a",
        source: "library:a",
        target: "external:x",
        mention_count: 0,
        primary_role: "method",
      },
      {
        id: "edge:b",
        source: "library:b",
        target: "external:x",
        mention_count: 3,
      },
    ]);

    assert.deepEqual(
      edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        mention_count: edge.mention_count,
        primary_role: edge.primary_role,
      })),
      [
        {
          id: "edge:a",
          source: "library:a",
          target: "external:x",
          mention_count: 3,
          primary_role: "method",
        },
        {
          id: "edge:b",
          source: "library:b",
          target: "external:x",
          mention_count: 3,
          primary_role: undefined,
        },
      ],
    );
  });

  it("reports distinct source papers separately from citation records", function () {
    const counts = citationGraphIncomingCounts("external:x", [
      {
        id: "edge:a:1",
        source: "library:a",
        target: "external:x",
        mention_count: 2,
      },
      {
        id: "edge:a:2",
        source: "library:a",
        target: "external:x",
        mention_count: 3,
      },
      {
        id: "edge:b",
        source: "library:b",
        target: "external:x",
      },
    ]);

    assert.deepEqual(counts, { sourcePaperCount: 2, citationRecordCount: 6 });
  });

  it("bounds and deterministically ranks interaction neighborhoods per owner", function () {
    const nodes = [
      { id: "library:a", kind: "library_paper" as const, label: "Owner" },
      ...Array.from({ length: 105 }, (_, index) => ({
        id: `external:${String(index).padStart(3, "0")}`,
        kind: "external_reference" as const,
        label: `Reference ${String(index).padStart(3, "0")}`,
      })),
    ];
    const edges = nodes.slice(1).map((node, index) => ({
      id: `edge:${String(index).padStart(3, "0")}`,
      source: "library:a",
      target: node.id,
      mention_count: index === 104 ? 99 : 1,
    }));

    const selected = selectCitationGraphInteractionEdges({
      ownerIds: ["library:a"],
      nodes,
      edges,
    });
    assert.lengthOf(selected, 100);
    assert.equal(selected[0].id, "edge:104");
    assert.notInclude(
      selected.map((edge) => edge.id),
      "edge:099",
    );

    const offsets = citationGraphInteractionOffsets(100, 2);
    assert.lengthOf(offsets, 100);
    assert.isAtLeast(Math.hypot(offsets[0].x, offsets[0].y), 56);
    assert.isAbove(
      Math.hypot(offsets[99].x, offsets[99].y),
      Math.hypot(offsets[0].x, offsets[0].y),
    );
  });
});

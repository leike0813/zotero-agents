import { assert } from "chai";
import {
  buildCitationGraphNodeImportance,
  citationGraphNodeSize,
  GRAPH_LIBRARY_BASE_NODE_SIZE,
  GRAPH_LIBRARY_NODE_SIZE_CAP,
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
});

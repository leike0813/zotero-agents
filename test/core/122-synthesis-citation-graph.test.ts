import { assert } from "chai";
import {
  buildUnifiedCitationGraph,
  computeCitationGraphMetrics,
  computeCitationGraphLayout,
  normalizeCitationLayoutAlgorithm,
  provisionalReferenceKey,
} from "../../src/modules/synthesis/citationGraph";
import { buildCitationGraphInputsFromRegistryInputs } from "../../src/modules/synthesis/libraryAdapter";
import { renderPayloadBlock } from "../../src/modules/notePayloadCodec";

describe("Synthesis Citation Graph", function () {
  it("generates provisional reference keys by deterministic priority", function () {
    assert.equal(
      provisionalReferenceKey({
        citekey: "smith2024graph",
        doi: "10.1000/ABC",
      }),
      "ref:citekey:smith2024graph",
    );
    assert.equal(
      provisionalReferenceKey({
        doi: " https://doi.org/10.1000/ABC ",
        title: "Ignored",
        year: "2024",
        authors: ["Alice"],
      }),
      "ref:doi:10.1000/abc",
    );
    assert.equal(
      provisionalReferenceKey({
        title: "  A Test, Paper! ",
        year: "2024",
        authors: ["Alice Smith"],
      }),
      "ref:titleyearauthor:a-test-paper:2024:alice-smith",
    );
  });

  it("promotes external references to library papers by provisional key", function () {
    const graph = buildUnifiedCitationGraph({
      papers: [
        {
          libraryId: 1,
          itemKey: "AAAA1111",
          title: "Source",
          year: "2024",
          authors: ["Source Author"],
          references: [
            {
              title: "Target Paper",
              year: "2020",
              authors: ["Target Author"],
            },
          ],
        },
        {
          libraryId: 1,
          itemKey: "BBBB2222",
          title: "Target Paper",
          year: "2020",
          authors: ["Target Author"],
        },
      ],
    });

    assert.include(
      graph.nodes.map((node) => node.node_id),
      "zotero:item:BBBB2222",
    );
    assert.notInclude(
      graph.nodes.map((node) => node.node_id),
      "ref:titleyearauthor:target-paper:2020:target-author",
    );
    const target = graph.nodes.find(
      (node) => node.node_id === "zotero:item:BBBB2222",
    );
    assert.include(
      target?.aliases || [],
      "ref:titleyearauthor:target-paper:2020:target-author",
    );
    assert.deepInclude(graph.diagnostics.promotions, {
      from: "ref:titleyearauthor:target-paper:2020:target-author",
      to: "zotero:item:BBBB2222",
      reason: "provisional_key_match",
      key_kind: "title_year_first_author",
      confidence: "deterministic",
    });
  });

  it("promotes references to library papers by citekey aliases", function () {
    const graph = buildUnifiedCitationGraph({
      papers: [
        {
          libraryId: 1,
          itemKey: "AAAA1111",
          title: "Source",
          references: [{ citekey: "target2020", title: "Target Paper" }],
        },
        {
          libraryId: 1,
          itemKey: "BBBB2222",
          title: "Target Paper",
          year: "2020",
          authors: ["Target"],
          citekey: "target2020",
        },
      ],
    });

    assert.equal(graph.edges[0].target, "zotero:item:BBBB2222");
    assert.notInclude(
      graph.nodes.map((node) => node.node_id),
      "ref:citekey:target2020",
    );
  });

  it("aggregates repeated citations and selects primary plus aux roles", function () {
    const graph = buildUnifiedCitationGraph({
      papers: [
        {
          libraryId: 1,
          itemKey: "AAAA1111",
          title: "Source",
          references: [
            {
              doi: "10.1000/target",
              title: "Target",
              roles: ["background", "background", "method"],
            },
            {
              doi: "10.1000/target",
              title: "Target",
              roles: ["method"],
            },
          ],
        },
      ],
      rolePriority: ["background", "method"],
    });

    assert.lengthOf(graph.edges, 1);
    assert.equal(graph.edges[0].mention_count, 2);
    assert.equal(graph.edges[0].primary_role, "background");
    assert.deepEqual(graph.edges[0].aux_roles, [{ role: "method", count: 2 }]);
  });

  it("merges repeated external references across source papers", function () {
    const graph = buildUnifiedCitationGraph({
      papers: [
        {
          libraryId: 1,
          itemKey: "AAAA1111",
          title: "Source A",
          references: [
            {
              title: "External Paper",
              year: "2020",
              authors: ["External"],
            },
          ],
        },
        {
          libraryId: 1,
          itemKey: "BBBB2222",
          title: "Source B",
          references: [
            {
              title: "External Paper",
              year: "2020",
              authors: ["External"],
            },
          ],
        },
      ],
    });

    assert.lengthOf(
      graph.nodes.filter((node) => node.kind === "external_reference"),
      1,
    );
    assert.lengthOf(graph.edges, 2);
    assert.equal(graph.diagnostics.reference_stats.merged_external_nodes, 1);
  });

  it("merges raw unresolved references instead of using source plus index ids", function () {
    const graph = buildUnifiedCitationGraph({
      papers: [
        {
          libraryId: 1,
          itemKey: "AAAA1111",
          title: "Source A",
          references: [{ raw: "unstructured reference" }],
        },
        {
          libraryId: 1,
          itemKey: "BBBB2222",
          title: "Source B",
          references: [{ raw: "  Unstructured Reference  " }],
        },
      ],
    });

    const unresolved = graph.nodes.filter(
      (node) => node.kind === "unresolved_reference",
    );
    assert.lengthOf(unresolved, 1);
    assert.match(unresolved[0].node_id, /^ref:raw:/);
    assert.lengthOf(graph.edges, 2);
  });

  it("drops references without any usable identity", function () {
    const graph = buildUnifiedCitationGraph({
      papers: [
        {
          libraryId: 1,
          itemKey: "AAAA1111",
          title: "Source",
          references: [{}],
        },
      ],
    });

    assert.lengthOf(graph.nodes, 1);
    assert.equal(graph.diagnostics.reference_stats.dropped_empty, 1);
  });

  it("extracts singular author and citekey fields from existing references payloads", function () {
    const papers = buildCitationGraphInputsFromRegistryInputs([
      {
        libraryId: 1,
        itemKey: "AAAA1111",
        title: "Source",
        creators: ["Source"],
        notes: [
          {
            key: "N1",
            title: "References",
            html: renderPayloadBlock({
              payloadType: "references-json",
              payload: [
                {
                  title: "Target Paper",
                  year: "2020",
                  author: "Target",
                  citekey: "target2020",
                  rawText: "Target (2020) Target Paper",
                },
              ],
            }),
          },
        ],
      },
    ]);

    assert.deepInclude(papers[0].references?.[0] || {}, {
      title: "Target Paper",
      year: "2020",
      citekey: "target2020",
      raw: "Target (2020) Target Paper",
    });
    assert.deepEqual(papers[0].references?.[0].authors, ["Target"]);
  });

  it("keeps repeated references in a 36-paper library bounded by reference identity", function () {
    const papers = Array.from({ length: 36 }, (_, index) => ({
      libraryId: 1,
      itemKey: `P${String(index).padStart(7, "0")}`,
      title: `Paper ${index}`,
      references: [
        { raw: "Shared unresolved reference" },
        {
          title: "Shared External",
          year: "2020",
          authors: ["Shared"],
        },
      ],
    }));
    const graph = buildUnifiedCitationGraph({ papers });

    assert.lengthOf(graph.nodes, 38);
    assert.equal(graph.diagnostics.node_counts.library_paper, 36);
    assert.equal(graph.diagnostics.node_counts.external_reference, 1);
    assert.equal(graph.diagnostics.node_counts.unresolved_reference, 1);
  });

  it("computes deterministic layout snapshots", function () {
    const graph = buildUnifiedCitationGraph({
      papers: [
        {
          libraryId: 1,
          itemKey: "AAAA1111",
          title: "Source",
          references: [{ doi: "10.1000/target", title: "Target" }],
        },
      ],
    });

    const first = computeCitationGraphLayout(graph, "force");
    const second = computeCitationGraphLayout(graph, "force");
    const radial = computeCitationGraphLayout(graph, "radial");
    const components = computeCitationGraphLayout(graph, "components");

    assert.equal(first.layout_hash, second.layout_hash);
    assert.deepEqual(first.nodes, second.nodes);
    assert.equal(first.graph_hash, graph.graph_hash);
    assert.equal(first.layout_version, 1.2);
    assert.equal(first.algorithm, "force");
    assert.deepEqual(first.params, {
      link_distance: 180,
      charge: -520,
      collision_radius: 24,
      iterations: 700,
      isolated_radius: 72,
      isolated_gap: 96,
    });
    assert.equal(radial.algorithm, "radial");
    assert.equal(components.algorithm, "components");
    assert.notEqual(radial.layout_hash, first.layout_hash);
    assert.notEqual(components.layout_hash, first.layout_hash);
    assert.notEqual(radial.layout_hash, components.layout_hash);
    assert.equal(normalizeCitationLayoutAlgorithm("compact"), "force");
    assert.equal(normalizeCitationLayoutAlgorithm("balanced"), "force");
    assert.equal(normalizeCitationLayoutAlgorithm("expanded"), "force");
  });

  it("keeps isolated nodes near the force layout instead of repelling them far away", function () {
    const graph = buildUnifiedCitationGraph({
      papers: [
        {
          libraryId: 1,
          itemKey: "A",
          title: "Connected Source",
          references: [{ title: "Connected Target", year: "2020" }],
        },
        {
          libraryId: 1,
          itemKey: "B",
          title: "Isolated Paper",
          references: [],
        },
      ],
    });

    const layout = computeCitationGraphLayout(graph, "force");
    const source = layout.nodes["zotero:item:A"];
    const isolated = layout.nodes["zotero:item:B"];

    assert.isDefined(source);
    assert.isDefined(isolated);
    assert.isBelow(
      Math.hypot(isolated.x - source.x, isolated.y - source.y),
      800,
    );
  });

  it("computes deterministic library-only citation metrics", function () {
    const graph = buildUnifiedCitationGraph({
      papers: [
        {
          libraryId: 1,
          itemKey: "A",
          title: "Foundation Paper",
          year: "2020",
          references: [
            { title: "Middle Paper", year: "2022", authors: ["B"] },
            { title: "External Method", year: "2019", authors: ["External"] },
            { raw: "unresolved method note" },
          ],
        },
        {
          libraryId: 1,
          itemKey: "B",
          title: "Middle Paper",
          year: "2022",
          authors: ["B"],
          references: [
            { title: "Foundation Paper", year: "2020", authors: ["A"] },
          ],
        },
        {
          libraryId: 1,
          itemKey: "C",
          title: "Frontier Paper",
          year: "2024",
          authors: ["C"],
          references: [{ title: "Middle Paper", year: "2022", authors: ["B"] }],
        },
        {
          libraryId: 1,
          itemKey: "D",
          title: "Isolated Paper",
        },
      ],
    });

    const first = computeCitationGraphMetrics(graph);
    const second = computeCitationGraphMetrics(graph);
    const byId = new Map(
      first.library_node_metrics.map((entry) => [entry.node_id, entry]),
    );

    assert.equal(first.metrics_hash, second.metrics_hash);
    assert.equal(first.graph_hash, graph.graph_hash);
    assert.equal(first.graph_year, 2024);
    assert.equal(first.diagnostics.library_node_count, 4);
    assert.equal(first.diagnostics.component_count, 2);
    assert.equal(byId.get("zotero:item:B")?.internal_in_degree, 2);
    assert.equal(byId.get("zotero:item:A")?.internal_out_degree, 1);
    assert.equal(byId.get("zotero:item:A")?.external_reference_count, 1);
    assert.equal(byId.get("zotero:item:A")?.unresolved_reference_count, 1);
    assert.equal(byId.get("zotero:item:D")?.is_isolated, true);
    assert.include(
      byId.get("zotero:item:D")?.synthesis_role_hints || [],
      "isolated",
    );
    assert.isAbove(byId.get("zotero:item:B")?.internal_pagerank || 0, 0);
    assert.isAtLeast(byId.get("zotero:item:C")?.recency_norm || 0, 1);
  });

  it("keeps external and unresolved nodes out of formal metric rows", function () {
    const graph = buildUnifiedCitationGraph({
      papers: [
        {
          libraryId: 1,
          itemKey: "A",
          title: "Source",
          references: [
            { title: "External", year: "2020", authors: ["External"] },
            { raw: "unresolved" },
          ],
        },
      ],
    });

    const metrics = computeCitationGraphMetrics(graph);

    assert.deepEqual(
      metrics.library_node_metrics.map((entry) => entry.node_id),
      ["zotero:item:A"],
    );
    assert.equal(metrics.diagnostics.external_reference_count, 1);
    assert.equal(metrics.diagnostics.unresolved_reference_count, 1);
  });
});

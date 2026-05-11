import { assert } from "chai";
import {
  buildUnifiedCitationGraph,
  computeCitationGraphLayout,
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

    assert.include(graph.nodes.map((node) => node.node_id), "zotero:item:BBBB2222");
    assert.notInclude(
      graph.nodes.map((node) => node.node_id),
      "ref:titleyearauthor:target-paper:2020:target-author",
    );
    const target = graph.nodes.find((node) => node.node_id === "zotero:item:BBBB2222");
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
    assert.deepEqual(graph.edges[0].aux_roles, [
      { role: "method", count: 2 },
    ]);
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

    const unresolved = graph.nodes.filter((node) => node.kind === "unresolved_reference");
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

    const first = computeCitationGraphLayout(graph, "balanced");
    const second = computeCitationGraphLayout(graph, "balanced");

    assert.equal(first.layout_hash, second.layout_hash);
    assert.deepEqual(first.nodes, second.nodes);
    assert.equal(first.graph_hash, graph.graph_hash);
  });
});

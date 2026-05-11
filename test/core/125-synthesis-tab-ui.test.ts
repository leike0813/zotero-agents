import { assert } from "chai";
import fs from "fs/promises";
import {
  applySynthesisUiAction,
  buildSynthesisUiSnapshot,
  createDefaultSynthesisUiState,
  normalizeSynthesisUiSnapshot,
} from "../../src/modules/synthesis/uiModel";

describe("Synthesis tab UI model", function () {
  it("normalizes a DTO-only snapshot with stable defaults", function () {
    const snapshot = normalizeSynthesisUiSnapshot({
      libraryId: 1,
      sync: {
        status: "mirror_degraded",
        diagnostics: [
          {
            code: "payload_hash_mismatch",
            severity: "error",
            message: "Shard payload hash mismatch",
          },
        ],
        allowedActions: ["rebuild_mirror_from_canonical"],
        requiresConfirmation: false,
      },
      conflicts: [
        {
          id: "conflict-a",
          topic_id: "topic-a",
          created_at: "2026-05-10T00:00:00.000Z",
          bundle_hash:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          reason: "base_hash_mismatch",
          status: "open",
        },
      ],
      artifacts: [
        {
          id: "topic-b",
          title: "Beta Topic",
          kind: "topic_synthesis",
          coverage: "partial",
          freshness: "stale",
          updated_at: "2026-05-10T12:00:00.000Z",
        },
        {
          id: "topic-a",
          title: "Alpha Topic",
          kind: "topic_synthesis",
          coverage: "complete",
          freshness: "fresh",
        },
      ],
      registry: {
        rows: [],
      },
      graph: {
        graph_hash: "sha256:abc",
        nodes: [],
        edges: [],
      },
    });

    assert.equal(snapshot.selectedTab, "overview");
    assert.deepEqual(
      snapshot.artifacts.rows.map((row) => row.id),
      ["topic-a", "topic-b"],
    );
    assert.equal(snapshot.preferences.graphRebuildMode, "off");
    assert.equal(snapshot.graph.layoutPreset, "balanced");
    assert.equal(snapshot.sync.status, "mirror_degraded");
    assert.lengthOf(snapshot.sync.diagnostics, 1);
    assert.deepEqual(
      snapshot.conflicts.candidates.map((entry) => entry.id),
      ["conflict-a"],
    );
    assert.isArray(snapshot.hostCommands);
  });

  it("filters artifacts and registry rows through host-owned state", function () {
    const state = createDefaultSynthesisUiState();
    const filteredState = applySynthesisUiAction(state, {
      action: "setFilters",
      payload: {
        artifacts: {
          search: "graph",
          coverage: "partial",
        },
        registry: {
          readiness: "partial",
          missingArtifact: "citation_analysis",
        },
      },
    }).state;

    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        artifacts: [
          {
            id: "topic-graph",
            title: "Graph Synthesis",
            kind: "topic_synthesis",
            coverage: "partial",
            freshness: "stale",
          },
          {
            id: "topic-tags",
            title: "Tag Synthesis",
            kind: "topic_synthesis",
            coverage: "complete",
            freshness: "fresh",
          },
        ],
        registry: {
          rows: [
            {
              paper_ref: "1:A",
              title: "Ready Paper",
              year: "2024",
              readiness: "ready",
              coverage: "complete",
              missing_artifacts: [],
            },
            {
              paper_ref: "1:B",
              title: "Partial Paper",
              year: "2025",
              readiness: "partial",
              coverage: "partial",
              missing_artifacts: ["citation_analysis"],
            },
          ],
        },
        graph: {
          graph_hash: "sha256:abc",
          nodes: [],
          edges: [],
        },
      },
      filteredState,
    );

    assert.deepEqual(
      snapshot.artifacts.visibleRows.map((row) => row.id),
      ["topic-graph"],
    );
    assert.deepEqual(
      snapshot.registry.visibleRows.map((row) => row.paper_ref),
      ["1:B"],
    );
  });

  it("updates graph layout preset and selected element without recomputing layout", function () {
    const state = createDefaultSynthesisUiState();
    const next = applySynthesisUiAction(state, {
      action: "setGraphView",
      payload: {
        layoutPreset: "expanded",
        nodeKinds: ["library_paper", "external_reference"],
        showLowSignalUnresolved: true,
        role: "method",
        selectedElement: { kind: "node", id: "n1" },
        neighborhoodDepth: 2,
      },
    });

    assert.isTrue(next.handled);
    assert.equal(next.state.graph.layoutPreset, "expanded");
    assert.deepEqual(next.state.graph.selectedElement, {
      kind: "node",
      id: "n1",
    });
    assert.equal(next.state.graph.neighborhoodDepth, 2);
    assert.deepEqual(next.state.graph.nodeKinds, [
      "external_reference",
      "library_paper",
    ]);
    assert.equal(next.state.graph.showLowSignalUnresolved, true);
    assert.equal(next.state.graph.role, "method");
    assert.isUndefined(next.hostCommand);
  });

  it("filters graph nodes by kind, low-signal unresolved visibility, and role", function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setGraphView",
      payload: {
        nodeKinds: ["library_paper", "external_reference"],
        showLowSignalUnresolved: false,
      },
    }).state;
    const filteredState = applySynthesisUiAction(state, {
      action: "setFilters",
      payload: {
        graph: {
          role: "method",
        },
      },
    }).state;
    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        graph: {
          graph_hash: "sha256:graph",
          diagnostics: {
            node_counts: {
              library_paper: 1,
              external_reference: 1,
              unresolved_reference: 1,
            },
            reference_stats: {
              dropped_empty: 0,
            },
          },
          nodes: [
            { id: "paper:a", label: "A", kind: "library_paper" },
            { id: "ref:external:x", label: "X", kind: "external_reference" },
            {
              id: "ref:raw:y",
              label: "Y",
              kind: "unresolved_reference",
              low_signal: true,
            },
          ],
          edges: [
            {
              id: "e1",
              source: "paper:a",
              target: "ref:external:x",
              primary_role: "method",
            },
            {
              id: "e2",
              source: "paper:a",
              target: "ref:raw:y",
              primary_role: "background",
            },
          ],
        },
      },
      filteredState,
    );

    assert.deepEqual(
      snapshot.graph.visibleNodes.map((node) => node.id),
      ["paper:a", "ref:external:x"],
    );
    assert.deepEqual(
      snapshot.graph.visibleEdges.map((edge) => edge.id),
      ["e1"],
    );
    assert.equal(snapshot.graph.diagnostics.reference_stats.dropped_empty, 0);
  });

  it("routes known host commands and rejects unknown actions", function () {
    const state = createDefaultSynthesisUiState();
    const known = applySynthesisUiAction(state, {
      action: "hostCommand",
      payload: {
        command: "openSynthesisFolder",
        args: { topicId: "topic-a" },
      },
    });
    const unknown = applySynthesisUiAction(state, {
      action: "deleteEverything",
      payload: {},
    });

    assert.isTrue(known.handled);
    assert.deepEqual(known.hostCommand, {
      command: "openSynthesisFolder",
      args: { topicId: "topic-a" },
    });
    assert.isFalse(unknown.handled);
    assert.equal(unknown.reason, "unknown_action");
  });

  it("routes the Workbench rebuild graph host command", function () {
    const result = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "hostCommand",
      payload: {
        command: "manualRecomputeLayout",
        args: { reason: "user" },
      },
    });

    assert.isTrue(result.handled);
    assert.deepEqual(result.hostCommand, {
      command: "manualRecomputeLayout",
      args: { reason: "user" },
    });
  });

  it("wires the Workbench run synthesis host command to workflow execution", async function () {
    const source = await fs.readFile(
      "src/modules/synthesisWorkbenchDialog.ts",
      "utf8",
    );

    assert.include(source, "runSynthesizeTopicFromWorkbench");
    assert.include(source, "executeWorkflowFromCurrentSelection");
    assert.include(source, 'entry.manifest.id === "synthesize-topic"');
    assert.include(source, "workflowParams");
    assert.include(source, "topicSeed");
  });

  it("wires Workbench artifact open commands to host file operations", async function () {
    const source = await fs.readFile(
      "src/modules/synthesisWorkbenchDialog.ts",
      "utf8",
    );

    assert.include(source, 'command === "openCanonicalMarkdown"');
    assert.include(source, 'command === "openSynthesisFolder"');
    assert.include(source, "readTopicArtifact");
    assert.include(source, "openPathInSystem");
  });

  it("uses a bundled Sigma graph explorer as the Workbench graph renderer", async function () {
    const index = await fs.readFile("addon/content/synthesis/index.html", "utf8");
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const config = await fs.readFile("zotero-plugin.config.ts", "utf8");

    assert.include(index, "app.bundle.js");
    assert.include(source, "from \"sigma\"");
    assert.include(source, "new Sigma");
    assert.notInclude(source, "renderGraphSvg");
    assert.include(config, "src/synthesisWorkbenchApp.ts");
    assert.include(config, "addon/content/synthesis/app.bundle.js");
  });
});

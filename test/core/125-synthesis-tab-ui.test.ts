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
          freshness: "dirty",
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
    assert.equal(snapshot.artifacts.rows[1]?.freshness, "dirty");
    assert.equal(snapshot.preferences.graphRebuildMode, "off");
    assert.equal(snapshot.graph.layoutPreset, "balanced");
    assert.equal(snapshot.sync.status, "mirror_degraded");
    assert.lengthOf(snapshot.sync.diagnostics, 1);
    assert.equal(snapshot.deletedArtifacts.count, 0);
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
          freshness: "dirty",
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
            freshness: "dirty",
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
    assert.equal(snapshot.artifacts.visibleRows[0]?.freshness, "dirty");
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

  it("tracks the internal artifact reader view and selected topic", function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "selectTab",
      payload: { tab: "artifacts" },
    }).state;
    const opened = applySynthesisUiAction(state, {
      action: "showArtifactReader",
      payload: { topicId: "topic-a" },
    });
    const closed = applySynthesisUiAction(opened.state, {
      action: "closeArtifactReader",
    });

    assert.isTrue(opened.handled);
    assert.equal(opened.state.selectedTab, "reader");
    assert.equal(opened.state.reader.topicId, "topic-a");
    assert.equal(opened.state.reader.previousTab, "artifacts");
    assert.equal(closed.state.selectedTab, "artifacts");
    assert.equal(closed.state.reader.topicId, "");
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

  it("routes Workbench artifact delete and purge host commands", function () {
    const deleteResult = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "hostCommand",
      payload: {
        command: "deleteTopicArtifact",
        args: { topicId: "topic-alpha" },
      },
    });
    const purgeResult = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "hostCommand",
      payload: {
        command: "purgeDeletedTopicArtifacts",
        args: {},
      },
    });

    assert.isTrue(deleteResult.handled);
    assert.deepEqual(deleteResult.hostCommand, {
      command: "deleteTopicArtifact",
      args: { topicId: "topic-alpha" },
    });
    assert.isTrue(purgeResult.handled);
    assert.deepEqual(purgeResult.hostCommand, {
      command: "purgeDeletedTopicArtifacts",
      args: {},
    });
  });

  it("wires the Workbench run synthesis host command to workflow execution", async function () {
    const source = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );

    assert.include(source, "runSynthesizeTopicFromWorkbench");
    assert.include(source, "executeWorkflowFromCurrentSelection");
    assert.include(source, 'entry.manifest.id === "synthesize-topic"');
    assert.include(source, "requireSettingsGate: true");
    assert.notInclude(source, "executionOptionsOverride");
    assert.notInclude(source, "promptTopicSeed");
    assert.notInclude(source, "promptSynthesisMode");
  });

  it("hosts the Workbench in a singleton Zotero tab instead of a dialog", async function () {
    const source = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const dialogCompat = await fs.readFile(
      "src/modules/synthesisWorkbenchDialog.ts",
      "utf8",
    );
    const hooks = await fs.readFile("src/hooks.ts", "utf8");
    const sidebar = await fs.readFile(
      "src/modules/assistantWorkspaceSidebar.ts",
      "utf8",
    );

    assert.include(source, "Zotero_Tabs.add");
    assert.include(source, 'type: "synthesis-workbench"');
    assert.include(source, "createXULElement");
    assert.include(source, "__zoteroSkillsSynthesisWorkbenchBridge");
    assert.include(source, "scheduleWorkbenchHandshake");
    assert.include(source, "SYNTHESIS_WORKBENCH_HANDSHAKE_REQUIRED_SUCCESSES = 5");
    assert.include(source, "finalizeWorkbenchHandshake");
    assert.include(source, 'sendSnapshot("synthesis:init")');
    assert.include(source, "contentDocument");
    assert.include(source, "Zotero_Tabs.select");
    assert.include(source, "cleanupSynthesisWorkbenchTab");
    assert.notInclude(source, "new ztoolkit.Dialog");
    assert.notInclude(dialogCompat, "new ztoolkit.Dialog");
    assert.include(hooks, "openSynthesisWorkbenchTab");
    assert.include(sidebar, "openSynthesisWorkbenchTab");
  });

  it("opens artifacts inside the Workbench reader instead of an external editor", async function () {
    const source = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");

    assert.include(source, 'command === "openCanonicalMarkdown"');
    assert.include(source, 'command === "openSynthesisFolder"');
    assert.include(source, 'command === "deleteTopicArtifact"');
    assert.include(source, 'command === "purgeDeletedTopicArtifacts"');
    assert.include(source, "confirmWorkbenchAction");
    assert.include(source, "readTopicArtifact");
    assert.include(source, "sendArtifactReader");
    assert.include(source, 'postWorkbenchMessage("synthesis:artifact"');
    assert.notInclude(source, "openPathInSystem(artifact.paths.currentMarkdown");
    assert.include(app, "renderArtifactReader");
    assert.include(app, "Delete");
    assert.include(app, "Purge Deleted");
    assert.include(app, "deletedArtifacts.count");
    assert.include(app, "Back to Artifacts");
    assert.include(app, "Copy markdown");
  });

  it("uses a bundled Sigma graph explorer as the Workbench graph renderer", async function () {
    const index = await fs.readFile("addon/content/synthesis/index.html", "utf8");
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");
    const config = await fs.readFile("zotero-plugin.config.ts", "utf8");

    assert.include(index, "app.bundle.js");
    assert.include(source, "from \"sigma\"");
    assert.include(source, "new Sigma");
    assert.include(source, "ResizeObserver");
    assert.include(source, "scheduleSigmaResize");
    assert.include(source, "label: \"\"");
    assert.include(source, "node.kind === \"library_paper\" ? 7 : 2");
    assert.include(source, "targetKind === \"library_paper\" ? 1.15 : 0.35");
    assert.include(source, "showHoverLabel");
    assert.include(source, "node === state.hoveredNode");
    assert.notInclude(source, "renderGraphSvg");
    assert.include(css, ".sigma-stage");
    assert.include(css, "height: 100%;");
    assert.include(config, "src/synthesisWorkbenchApp.ts");
    assert.include(config, "addon/content/synthesis/app.bundle.js");
  });

  it("loads local Markdown renderer assets for the artifact reader", async function () {
    const index = await fs.readFile("addon/content/synthesis/index.html", "utf8");
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");

    assert.include(index, "vendor/markdown-it/markdown-it.min.js");
    assert.include(index, "vendor/katex/katex.min.js");
    assert.include(index, "vendor/markdown-it-texmath/texmath.min.js");
    assert.include(source, "markdownit");
    assert.include(source, "texmath");
    assert.include(source, "sanitizeRenderedMarkdown");
    assert.include(source, "loading-spinner");
    assert.include(source, "reader-body markdown-body");
    assert.include(css, ".reader-body");
    assert.include(css, ".loading-shell");
    assert.include(css, "@keyframes zs-spin");
    assert.include(css, ".table-wrap");
    assert.include(css, "overflow: auto;");
  });
});

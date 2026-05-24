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
          paper_count: 7,
          summary: "Beta summary",
          completion: 62,
        },
        {
          id: "topic-a",
          title: "Alpha Topic",
          kind: "topic_synthesis",
          coverage: "complete",
          freshness: "fresh",
          paper_count: 3,
          summary: "Alpha summary",
          completion: 100,
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
    assert.equal(snapshot.artifacts.rows[1]?.paper_count, 7);
    assert.equal(snapshot.artifacts.rows[1]?.summary, "Beta summary");
    assert.equal(snapshot.artifacts.rows[1]?.completion, 62);
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

  it("sorts topic rows by paper count and update time for card views", function () {
    const byPaperCount = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setFilters",
      payload: {
        artifacts: {
          sort: "paper_count",
          viewMode: "grid",
        },
      },
    }).state;
    const byUpdatedAt = applySynthesisUiAction(byPaperCount, {
      action: "setFilters",
      payload: {
        artifacts: {
          sort: "updated_at",
        },
      },
    }).state;

    const input = {
      libraryId: 1,
      artifacts: [
        {
          id: "topic-small-new",
          title: "Small New",
          kind: "topic_synthesis" as const,
          coverage: "complete" as const,
          freshness: "fresh" as const,
          updated_at: "2026-05-12T00:00:00.000Z",
          paper_count: 1,
          completion: 100,
        },
        {
          id: "topic-large-old",
          title: "Large Old",
          kind: "topic_synthesis" as const,
          coverage: "partial" as const,
          freshness: "dirty" as const,
          updated_at: "2026-05-10T00:00:00.000Z",
          paper_count: 12,
          completion: 50,
        },
      ],
    };

    const paperSnapshot = buildSynthesisUiSnapshot(input, byPaperCount);
    const updatedSnapshot = buildSynthesisUiSnapshot(input, byUpdatedAt);

    assert.equal(paperSnapshot.artifacts.filters.viewMode, "grid");
    assert.deepEqual(
      paperSnapshot.artifacts.visibleRows.map((row) => row.id),
      ["topic-large-old", "topic-small-new"],
    );
    assert.deepEqual(
      updatedSnapshot.artifacts.visibleRows.map((row) => row.id),
      ["topic-small-new", "topic-large-old"],
    );
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

    assert.include(source, "runCreateTopicSynthesisFromWorkbench");
    assert.include(source, "executeWorkflowFromCurrentSelection");
    assert.include(source, 'entry.manifest.id === "create-topic-synthesis"');
    assert.include(source, "requireSettingsGate: true");
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
    assert.include(source, 'sendSnapshot(runtime, "synthesis:init")');
    assert.include(source, "contentDocument");
    assert.include(source, "Zotero_Tabs.select");
    assert.include(source, "cleanupSynthesisWorkbenchTab");
    assert.notInclude(source, "new ztoolkit.Dialog");
    assert.notInclude(dialogCompat, "new ztoolkit.Dialog");
    assert.include(hooks, "openSynthesisWorkbenchTab");
    assert.notInclude(sidebar, "openSynthesisWorkbenchTab");
  });

  it("opens structured Topic Detail inside the Workbench and keeps Markdown as a secondary export", async function () {
    const source = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");

    assert.include(source, 'command === "openTopicArtifact"');
    assert.include(source, 'command === "openCanonicalMarkdown"');
    assert.include(source, 'command === "copyTopicMarkdownExport"');
    assert.include(source, 'command === "resolveTopicPaperDigest"');
    assert.include(source, 'command === "openSynthesisFolder"');
    assert.include(source, 'command === "deleteTopicArtifact"');
    assert.include(source, 'command === "purgeDeletedTopicArtifacts"');
    assert.include(source, "confirmWorkbenchAction");
    assert.include(source, "readTopicDetail");
    assert.include(source, "readTopicArtifact");
    assert.include(source, "sendTopicDetail");
    assert.include(source, "sendArtifactReader");
    assert.include(source, 'postWorkbenchMessage(runtime, "synthesis:topic-detail"');
    assert.include(source, 'postWorkbenchMessage(runtime, "synthesis:artifact"');
    assert.notInclude(source, "openPathInSystem(artifact.paths.currentMarkdown");
    assert.include(app, "renderTopicDetailShell");
    assert.include(app, "renderTopicDetail");
    assert.include(app, "renderArtifactReader");
    assert.include(app, 'command: "openTopicArtifact"');
    assert.include(app, 'command: "submitTopicSynthesisUpdate"');
    assert.include(app, "Markdown export");
    assert.include(app, "Delete");
    assert.include(app, "Purge Deleted");
    assert.include(app, "deletedArtifacts.count");
    assert.include(app, "Back to Topics");
    assert.include(
      app,
      'makeButton("Back to Topics", "selectTab", { tab: "artifacts" })',
    );
    assert.include(app, "Copy Markdown");
  });

  it("renders the redesigned Home, Topics, Index, and immersive reader views", async function () {
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");

    assert.include(source, "renderHome");
    assert.include(source, "renderTopics");
    assert.include(source, "renderIndex");
    assert.include(source, "renderPanelToolbar");
    assert.include(source, "renderTopicCard");
    assert.include(source, "Library Insights");
    assert.include(source, "Top Topics");
    assert.include(source, "paper_count");
    assert.include(source, "completion");
    assert.include(source, 'makeButton("Create Topic", "hostCommand"');
    assert.notInclude(source, 'makeButton("Run synthesis", "hostCommand"');
    assert.include(source, "immersive-reader");
    assert.notInclude(source, 'makeButton("Refresh", "refresh")');
    assert.notInclude(source, 'makeButton("Preferences"');
    assert.notInclude(source, '["artifacts", "Artifacts"]');
    assert.notInclude(source, 'header.appendChild(el("strong", "", "Topics"))');
    assert.notInclude(source, 'header.appendChild(el("strong", "", "Index"))');
    assert.include(css, ".insight-grid");
    assert.include(css, ".topic-grid");
    assert.include(css, ".topic-card");
    assert.include(css, ".panel-toolbar");
    assert.include(css, ".immersive-reader");
    assert.include(css, ":focus-visible");
    assert.include(css, "@media (prefers-reduced-motion: reduce)");
  });

  it("renders structured Topic Detail with design-token timeline and evidence interactions", async function () {
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");
    const mockupApp = await fs.readFile("mockup/app.js", "utf8");
    const mockupCss = await fs.readFile("mockup/styles.css", "utf8");

    assert.include(source, "renderTopicDetailShell");
    assert.include(source, "renderTopicDetail");
    assert.include(source, "renderTopicTabs");
    assert.include(source, '["taxonomy", "Taxonomy"]');
    assert.include(source, '["compare", "Compare"]');
    assert.include(source, "renderTopicOverviewSection");
    assert.include(source, "renderTopicTaxonomySection");
    assert.include(source, "renderTopicClaimsSection");
    assert.include(source, "renderTopicCompareSection");
    assert.include(source, "renderTopicExternalSection");
    assert.include(source, "renderTopicCoverageSection");
    assert.include(source, "renderTopicStatisticsSection");
    assert.include(source, "renderTopicReportSection");
    assert.include(source, "renderTopicDetailToolbar");
    assert.include(source, "renderSelectedEvidenceCard");
    assert.include(source, "renderTimelineClusters");
    assert.include(source, "comparisonRows");
    assert.include(source, "renderMethodComparisonCard");
    assert.include(source, "renderEvidenceMapSummary");
    assert.include(source, "renderEmptyStructuredState");
    assert.include(source, "renderEvidenceExplorer");
    assert.include(source, "renderEvidenceDrawer");
    assert.include(source, "renderTopicTimeline");
    assert.include(source, "timelineItems");
    assert.include(source, "renderDigestModal");
    assert.include(source, "openDigestModal");
    assert.include(source, "buildDigestOutline");
    assert.include(source, "renderDigestRepresentativeImage");
    assert.include(source, "include_representative_image: true");
    assert.include(source, "representative_image");
    assert.include(source, "Evidence Explorer");
    assert.include(source, "External Literature Analysis");
    assert.include(source, 'command: "resolveTopicPaperDigest"');
    assert.include(css, "--topic-bg: var(--zs-bg)");
    assert.include(css, "--topic-text: var(--zs-text)");
    assert.include(css, "--topic-accent-green: var(--zs-success)");
    assert.include(css, "--topic-soft-purple: var(--zs-purple-soft)");
    assert.include(css, "--topic-border-strong: var(--zs-border-strong)");
    assert.include(css, "--topic-pin-fill: var(--zs-accent)");
    assert.include(css, "--topic-pin-offset-y: -12px");
    assert.include(css, "--topic-explorer-width: 360px");
    assert.include(css, "--topic-timeline-height: 250px");
    assert.include(css, "--topic-pin-milestone-fill");
    assert.include(css, ".timeline-tone-foundation");
    assert.include(css, ".metric-grid");
    assert.include(css, ".topic-detail-shell");
    assert.include(css, ".detail-shell-in-workbench");
    assert.include(css, ".topic-detail-layout");
    assert.include(css, ".evidence-drawer");
    assert.include(css, ".evidence-drawer-panel");
    assert.include(css, ".explorer-empty");
    assert.include(css, ".selected-evidence-card");
    assert.include(css, ".horizontal-timeline");
    assert.include(css, ".time-axis");
    assert.include(css, ".timeline-phase");
    assert.include(css, ".marker-list");
    assert.include(css, ".topic-workspace");
    assert.include(css, ".topic-detail-tabs");
    assert.include(css, ".evidence-explorer");
    assert.include(css, ".timeline-marker");
    assert.include(css, ".timeline-pin-body");
    assert.include(css, "clip-path: polygon");
    assert.include(css, ".paper-digest-modal");
    assert.include(css, ".paper-digest-body");
    assert.include(css, ".digest-outline");
    assert.include(css, ".digest-scroll-body");
    assert.include(css, ".digest-modal-intro");
    assert.include(css, ".digest-representative-image");
    assert.include(source, "Select evidence from a claim, taxonomy node, comparison row, or timeline marker.");
    assert.include(source, "state.selectedEvidenceId");
    assert.include(source, "state.evidenceExplorerOpen");
    assert.include(source, "openEvidenceExplorer(evidenceId(evidence))");
    assert.include(source, "openDigestModal(selected)");
    assert.notInclude(source, "openDigestModal(evidence);");
    assert.include(source, "selected evidence");
    assert.include(source, 'firstText(gap, ["text", "description", "impact", "summary"');
    assert.include(source, 'firstText(debate, ["name", "title", "text", "debate"');
    assert.include(source, 'firstText(event, ["event", "title", "label", "summary"]');
    assert.include(source, "matrix.dimensions");
    assert.notInclude(source, "Library-paper evidence markers");
    assert.notInclude(source, 'badge("resizable"');
    assert.include(source, '["registry", "Index", "index"]');
    assert.notInclude(source, "renderTopicDetailRail");
    assert.notInclude(source, "topic-detail-rail");
    assert.notInclude(source, "rail-nav");
    assert.notInclude(source, "rows.forEach((evidence, index) =>");
    assert.notInclude(css, ".topic-detail-rail");
    assert.notInclude(css, ".rail-nav");
    assert.notInclude(source, "renderExplorerSplitter");
    assert.notInclude(css, ".splitter");
    assert.notInclude(css, "resize: horizontal");
    assert.notInclude(css, ".timeline-track");
    assert.include(css, "top: 50px");
    assert.include(css, "top: 62px");
    assert.notInclude(source, "reader-panel topic-detail-panel");
    assert.include(source, "sidebarExpanded: false");
    assert.include(source, "brand brand-icon-only");
    assert.include(source, 'function iconSvg(name: "home" | "topics" | "graph" | "index" | "panel-open" | "panel-close")');
    assert.include(source, "nav-icon-${iconName}");
    assert.include(source, "iconSvg(iconName");
    assert.include(source, 'iconSvg(state.sidebarExpanded ? "panel-close" : "panel-open")');
    assert.include(source, "nav-label");
    assert.include(source, "sidebar-collapse-toggle");
    assert.include(source, 'button.title = label');
    assert.notInclude(css, ".nav-icon-home::before");
    assert.notInclude(css, "box-shadow: 7px 2px 0 currentColor");
    assert.notInclude(css, ".sidebar-collapse-toggle::before");
    assert.include(mockupApp, "renderEvidenceDrawer");
    assert.include(mockupApp, "window.__state.explorerOpen");
    assert.include(mockupApp, "renderDigestModal");
    assert.include(mockupApp, "digest-outline");
    assert.include(mockupApp, "sidebarExpanded: false");
    assert.include(mockupCss, ".evidence-drawer");
    assert.include(mockupCss, ".paper-digest-body");
    assert.include(mockupCss, ".digest-scroll-body");
    assert.include(mockupCss, ".sidebar-collapse-toggle");
    assert.include(mockupApp, "iconSvg(iconName)");
    assert.include(mockupApp, "iconSvg(window.__state.sidebarExpanded ? 'panel-close' : 'panel-open')");
    assert.notInclude(mockupCss, ".nav-icon-home::before");
    assert.notInclude(mockupCss, ".sidebar-collapse-toggle::before");
    assert.notInclude(mockupApp, "openDigestModal");
    assert.notInclude(mockupApp, "workbench.appendChild(el('div','splitter'))");
    assert.notInclude(mockupCss, ".splitter");
  });

  it("wires structured Topic Detail update through the update-topic-synthesis workflow", async function () {
    const source = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const uiModel = await fs.readFile("src/modules/synthesis/uiModel.ts", "utf8");
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");

    assert.include(uiModel, '"submitTopicSynthesisUpdate"');
    assert.include(source, "findUpdateTopicSynthesisWorkflow");
    assert.include(source, 'entry.manifest.id === "update-topic-synthesis"');
    assert.include(source, 'command === "submitTopicSynthesisUpdate"');
    assert.include(source, "runUpdateTopicSynthesisFromWorkbench");
    assert.include(source, "settingsGateInitialOptions");
    assert.include(source, "Topic does not need update");
    assert.include(app, "topicRowById");
    assert.include(app, "topic-detail-toolbar-meta");
    assert.include(app, "topic-detail-toolbar-actions");
    assert.include(app, '`${numberValue(detail.paper_count)} papers`, "green"');
    assert.include(app, "makeTopicUpdateButton");
    assert.include(app, "button.disabled = disabled");
    assert.include(css, ".topic-detail-toolbar-meta");
    assert.include(css, ".topic-detail-toolbar .badge.blue");
    assert.include(css, ".topic-detail-toolbar .badge.green");
    assert.include(css, ".topic-detail-toolbar .badge.purple");
    assert.include(css, "--topic-control-bg");
    assert.include(css, "--topic-control-bg: #dbeafe");
    assert.include(css, "appearance: none");
    assert.include(css, "-moz-appearance: none");
    assert.include(css, "background-image: none");
    assert.include(css, "background: var(--topic-panel-subtle)");
    assert.include(css, "box-shadow: var(--topic-control-shadow)");
    assert.include(css, "button:disabled");
    assert.include(css, "cursor: not-allowed");
    assert.notInclude(css, "color-mix(");
    assert.notInclude(source, "updateMode: \"update_full\"");
    assert.notInclude(source, "updateScope: \"refresh\"");
    assert.include(source, "Cannot update synthesis: update-topic-synthesis workflow is not loaded");
  });

  it("adds a unified Zotero tab workspace entry for Dashboard and Synthesis", async function () {
    const host = await fs.readFile("src/modules/workspaceTab.ts", "utf8");
    const app = await fs.readFile("src/workspaceApp.ts", "utf8");
    const index = await fs.readFile("addon/content/workspace/index.html", "utf8");
    const css = await fs.readFile("addon/content/workspace/styles.css", "utf8");
    const config = await fs.readFile("zotero-plugin.config.ts", "utf8");

    assert.include(host, "Zotero_Tabs.add");
    assert.include(host, 'type: "zotero-skills-workspace"');
    assert.include(host, "mountTaskDashboardRuntime");
    assert.include(host, "mountSynthesisWorkbenchRuntime");
    assert.include(host, "openAssistantWorkspaceSidebar");
    assert.include(host, "closeAssistantWorkspaceSidebar");
    assert.include(host, "toggleAssistantWorkspaceSidebar");
    assert.include(host, 'action === "toggle-sidebar"');
    assert.notInclude(host, "sidebarOpen");
    assert.notInclude(host, "openTaskManagerDialog");
    assert.notInclude(host, 'import { openSynthesisWorkbenchTab');
    assert.include(host, "dashboard-mount-ready");
    assert.include(host, "synthesis-mount-ready");
    assert.include(host, "scheduleWorkspaceHandshake");
    assert.include(app, "Dashboard");
    assert.include(app, "Synthesis");
    assert.include(app, "ZoteroSkillsTheme");
    assert.include(app, "theme-switch");
    assert.include(app, "function updateThemeSwitchState()");
    assert.include(app, "node.dataset.theme = theme");
    assert.include(app, "updateThemeSwitchState();");
    assert.notInclude(app, "function setThemeChoice(theme: WorkspaceTheme) {\n  state.theme = window.ZoteroSkillsTheme?.setTheme?.(theme) || theme;\n  render();\n}");
    assert.include(app, "System");
    assert.include(app, "Light");
    assert.include(app, "Dark");
    assert.include(app, "segmented");
    assert.include(app, "toggle-sidebar");
    assert.include(app, "iconButton");
    assert.include(app, "refresh-toggle");
    assert.include(app, "refresh-icon");
    assert.include(app, "sidebar-toggle");
    assert.isBelow(
      app.indexOf("refresh-toggle"),
      app.indexOf("sidebar-toggle"),
    );
    assert.notInclude(app, 'button("Preferences", "open-preferences")');
    assert.notInclude(app, '"open-preferences"');
    assert.notInclude(app, "sidebarOpen");
    assert.notInclude(app, "Show Sidebar");
    assert.notInclude(app, "Hide Sidebar");
    assert.include(app, "dashboard-mount");
    assert.include(app, "synthesis-mount");
    assert.include(app, "is-dashboard");
    assert.include(app, "is-synthesis");
    assert.notInclude(app, "Open Dashboard");
    assert.notInclude(app, "Open Synthesis");
    assert.notInclude(app, "open-synthesis");
    assert.notInclude(app, "assistant-frame");
    assert.include(css, ".dashboard-mount");
    assert.include(css, ".synthesis-mount");
    assert.include(css, ".theme-switch");
    assert.include(index, "../shared/theme.js");
    assert.include(index, "../shared/theme.css?ui=20260520-controls-v5");
    assert.include(index, "./styles.css?ui=20260520-controls-v5");
    assert.include(css, ".toolbar .icon-button");
    assert.include(css, "appearance: none");
    assert.include(css, "-moz-appearance: none");
    assert.include(css, "--workspace-control-bg");
    assert.include(css, "--workspace-control-bg: #dbeafe");
    assert.include(css, "background: var(--workspace-control-bg)");
    assert.include(css, "box-shadow: var(--workspace-control-shadow)");
    assert.include(css, ".refresh-icon::before");
    assert.include(css, ".sidebar-icon::before");
    assert.include(css, ".workspace-panel.is-dashboard");
    assert.include(css, ".workspace-panel.is-synthesis");
    assert.include(css, "grid-template-rows: minmax(0, 1fr)");
    assert.include(index, "workspace-root");
    assert.include(config, "src/workspaceApp.ts");
    assert.include(config, "addon/content/workspace/app.bundle.js");
  });

  it("preserves active Workbench controls across snapshot rerenders", async function () {
    const app = await fs.readFile("addon/content/synthesis/app.js", "utf8");
    assert.include(app, "captureActiveWorkbenchState");
    assert.include(app, "restoreActiveWorkbenchState");
    assert.include(app, "data-synthesis-control-key");
    assert.include(app, "data-synthesis-scroll-key");
    assert.include(app, "renderShell(root, state.snapshot, preservedState)");
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
    assert.include(source, "graph-control-drawer");
    assert.include(source, 'detail.setAttribute("aria-label", "Graph controls")');
    assert.include(source, "detail.tabIndex = 0");
    assert.notInclude(source, "renderGraphSvg");
    assert.include(css, ".sigma-stage");
    assert.include(css, "height: 100%;");
    assert.include(css, ".graph-control-drawer");
    assert.include(css, ".graph-control-drawer:hover");
    assert.include(css, ".graph-control-drawer:focus-within");
    assert.include(css, "width: 42px;");
    assert.include(css, "width: min(330px, calc(100% - 24px));");
    assert.notInclude(css, "grid-template-columns: minmax(0, 1fr) 300px;");
    assert.include(config, "src/synthesisWorkbenchApp.ts");
    assert.include(config, "addon/content/synthesis/app.bundle.js");
  });

  it("loads shared theme tokens for Synthesis Workbench and structured Topic Detail", async function () {
    const index = await fs.readFile("addon/content/synthesis/index.html", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");
    const themeCss = await fs.readFile("addon/content/shared/theme.css", "utf8");
    const themeJs = await fs.readFile("addon/content/shared/theme.js", "utf8");

    assert.include(index, "../shared/theme.js");
    assert.include(index, "../shared/theme.css");
    assert.include(css, "--topic-bg: var(--zs-bg)");
    assert.include(css, "--topic-panel: var(--zs-panel)");
    assert.include(css, "--topic-text: var(--zs-text)");
    assert.include(css, ':root[data-zs-theme="dark"]');
    assert.include(themeCss, "--zs-bg-gradient");
    assert.include(themeCss, ':root[data-zs-theme="dark"]');
    assert.include(themeCss, "@media (prefers-color-scheme: dark)");
    assert.include(themeJs, "zotero-skills.theme");
    assert.include(themeJs, "ZoteroSkillsTheme");
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

  it("derives TopicUpdateIntent for stale, incomplete, and dirty topic rows", function () {
    const snapshot = normalizeSynthesisUiSnapshot({
      libraryId: 1,
      artifacts: [
        {
          id: "topic-stale",
          title: "Stale Topic",
          kind: "topic_synthesis",
          coverage: "complete",
          freshness: "stale",
          language: "zh-CN",
          stale_reasons: ["artifact_changed:digest-markdown"],
        },
        {
          id: "topic-incomplete",
          title: "Incomplete Topic",
          kind: "topic_synthesis",
          coverage: "partial",
          freshness: "fresh",
          language: "en-US",
          missing_sections: ["external_literature_analysis"],
        },
        {
          id: "topic-dirty",
          title: "Dirty Topic",
          kind: "topic_synthesis",
          coverage: "missing",
          freshness: "dirty",
          language: "zh-CN",
          dirty_reasons: ["legacy_invalid"],
        },
      ] as any,
    });

    const intents = Object.fromEntries(
      snapshot.artifacts.rows.map((row: any) => [row.id, row.updateIntent]),
    );

    assert.deepInclude(intents["topic-stale"], {
      topicId: "topic-stale",
      language: "zh-CN",
      updateScope: "auto",
      updateMode: "auto",
      actionLabel: "Update",
    });
    assert.deepInclude(intents["topic-incomplete"], {
      topicId: "topic-incomplete",
      language: "en-US",
      updateScope: "external_literature",
      actionLabel: "Complete",
    });
    assert.deepInclude(intents["topic-dirty"], {
      topicId: "topic-dirty",
      updateMode: "update_full",
      actionLabel: "Repair/Rebuild",
    });

    const freshComplete = normalizeSynthesisUiSnapshot({
      libraryId: 1,
      artifacts: [
        {
          id: "topic-fresh",
          title: "Fresh Topic",
          kind: "topic_synthesis",
          coverage: "complete",
          freshness: "fresh",
        },
      ] as any,
    });
    assert.isUndefined((freshComplete.artifacts.rows[0] as any)?.updateIntent);
  });

  it("exposes rebuild and confirmed recovery actions for mirror states", function () {
    const degraded = normalizeSynthesisUiSnapshot({
      libraryId: 1,
      sync: {
        status: "mirror_degraded",
        allowedActions: ["rebuild_mirror_from_canonical"],
        diagnostics: [],
        requiresConfirmation: false,
      },
    });
    const recoverable = normalizeSynthesisUiSnapshot({
      libraryId: 1,
      sync: {
        status: "missing_root",
        allowedActions: ["recover_from_shards"],
        diagnostics: [],
        requiresConfirmation: true,
      },
    });
    const rebuild = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "hostCommand",
      payload: {
        command: "rebuildSynthesisMirror",
        args: {},
      },
    });
    const recover = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "hostCommand",
      payload: {
        command: "recoverSynthesisFromMirror",
        args: { confirm: true },
      },
    });

    assert.include(degraded.hostCommands, "rebuildSynthesisMirror");
    assert.include(recoverable.hostCommands, "recoverSynthesisFromMirror");
    assert.isTrue(rebuild.handled);
    assert.isTrue(recover.handled);
    assert.deepEqual(recover.hostCommand, {
      command: "recoverSynthesisFromMirror",
      args: { confirm: true },
    });
  });
});

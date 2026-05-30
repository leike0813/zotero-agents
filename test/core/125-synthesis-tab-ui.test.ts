import { assert } from "chai";
import fs from "fs/promises";
import {
  applySynthesisUiAction,
  buildSynthesisUiSnapshot,
  createDefaultSynthesisUiState,
  getSynthesisUiOperationKey,
  normalizeSynthesisUiSnapshot,
} from "../../src/modules/synthesis/uiModel";

describe("Synthesis tab UI model", function () {
  async function readPngSize(filePath: string) {
    const bytes = await fs.readFile(filePath);
    return {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }

  it("normalizes a DTO-only snapshot with stable defaults", function () {
    const snapshot = normalizeSynthesisUiSnapshot({
      libraryId: 1,
      actions: {
        inFlight: [
          {
            key: "applyConceptReviewAction:review:1",
            command: "applyConceptReviewAction",
            status: "running",
            label: "Apply concept review",
          },
        ],
        lastFailed: {
          key: "manualRecomputeLayout:balanced",
          command: "manualRecomputeLayout",
          status: "failed",
          label: "Rebuild graph layout",
          message: "temporary failure",
        },
      },
      sync: {
        status: "ready",
        diagnostics: [
          {
            code: "persistence_check",
            severity: "info",
            message: "Persistence check",
          },
        ],
        allowedActions: [],
        requiresConfirmation: false,
        git: {
          queue_state: "blocked_conflict",
          paused: false,
          adapter_configured: true,
          remote_url: "https://[redacted]@example.invalid/repo.git",
          branch: "main",
          conflict_report: {
            conflicts: [
              {
                asset_path: "tags/vocabulary.json",
                reason: "both_changed",
              },
            ],
          },
          allowed_actions: ["retryGitSync", "resolveGitSyncConflict"],
          diagnostics: [
            {
              code: "git_sync_conflict",
              severity: "warning",
              message: "Review required",
            },
          ],
        },
      },
      maintenance: {
        summary: {
          status: "queued",
          pendingDirtyCount: 2,
          activeWorkerCount: 1,
          activeWorkerKind: "paper-registry-incremental-worker",
          canonicalSyncPending: true,
          canonicalEpoch: 3,
          stale: ["citation-graph-index"],
          missing: [],
          partial: [],
          recommendedCommands: ["runPaperRegistryIncrementalWorker"],
          diagnostics: [
            {
              code: "canonical_maintenance_active",
              severity: "info",
              message: "worker active",
            },
          ],
          latestUsable: {
            citationGraph: {
              updated_at: "2026-05-10T00:00:00.000Z",
              age_ms: 1000,
              graph_hash: "sha256:abc",
            },
          },
        },
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
    assert.equal(
      snapshot.actions.inFlight[0]?.command,
      "applyConceptReviewAction",
    );
    assert.equal(snapshot.actions.lastFailed?.status, "failed");
    assert.equal(snapshot.sync.status, "ready");
    assert.lengthOf(snapshot.sync.diagnostics, 1);
    assert.equal(snapshot.sync.git?.queue_state, "blocked_conflict");
    assert.equal(snapshot.sync.git?.conflict_count, 1);
    assert.deepEqual(snapshot.sync.git?.conflict_assets, [
      { asset_path: "tags/vocabulary.json", reason: "both_changed" },
    ]);
    assert.include(snapshot.sync.git?.allowedActions || [], "retryGitSync");
    assert.equal(snapshot.maintenance.summary.status, "queued");
    assert.deepEqual(snapshot.maintenance.backgroundJobs.rows, []);
    assert.equal(
      snapshot.maintenance.summary.activeWorkerKind,
      "paper-registry-incremental-worker",
    );
    assert.include(
      snapshot.maintenance.summary.recommendedCommands,
      "runPaperRegistryIncrementalWorker",
    );
    assert.equal(snapshot.deletedArtifacts.count, 0);
    assert.deepEqual(
      snapshot.conflicts.candidates.map((entry) => entry.id),
      ["conflict-a"],
    );
    assert.isArray(snapshot.hostCommands);
    assert.include(snapshot.hostCommands, "syncNow");
    assert.include(snapshot.hostCommands, "resolveGitSyncConflict");
  });

  it("uses polished empty states for synthesis workbench sparse data", async function () {
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");

    assert.include(source, "function renderEmptyState");
    assert.include(source, "No literature index records yet");
    assert.include(source, "No tag vocabulary indexed yet");
    assert.include(source, "No concepts indexed yet");
    assert.include(source, "No citation graph data");
    assert.include(source, "Drawing graph");
    assert.include(source, "function addHoverNeighborhood");
    assert.include(source, "hover-only external hidden");
    assert.include(source, "display_tier");
    assert.include(source, "Tag index ready");
    assert.include(source, "Concept index ready");
    assert.notInclude(source, "tag-index ready");
    assert.notInclude(source, "concept-kb-index ready");
    assert.notInclude(source, "JSON.stringify(snapshot.graph.diagnostics");
    assert.notInclude(source, "JSON.stringify(node || selected");
    assert.notInclude(source, "JSON.stringify(edge || selected");
    assert.include(css, ".empty-state");
    assert.include(css, ".empty-state-actions");
    assert.include(css, ".details .empty-state");
    assert.include(css, ".graph-empty .empty-state");
  });

  it("normalizes Synthesis background jobs without inventing progress", function () {
    const snapshot = buildSynthesisUiSnapshot({
      libraryId: 1,
      actions: {
        inFlight: [
          {
            key: "runLiteratureRegistryJobNow",
            command: "runLiteratureRegistryJobNow",
            status: "running",
            label: "Rebuild literature registry",
          },
        ],
      },
      maintenance: {
        backgroundJobs: [
          {
            job_id: "synthesis:update-queue",
            source: "update_queue",
            status: "queued",
            label: "Synthesis update queue",
            detail: "2 queued - 0 running - 0 failed",
            updated_at: "2026-05-25T00:00:00.000Z",
            progress: { mode: "indeterminate" },
          },
          {
            job_id: "synthesis:literature-registry",
            source: "literature_registry",
            status: "running",
            label: "Literature registry rebuild",
            updated_at: "2026-05-25T00:01:00.000Z",
            progress: {
              mode: "determinate",
              percent: 30,
              current: 3,
              total: 10,
            },
          },
          {
            job_id: "",
            source: "workbench",
            status: "running",
            label: "Ignored",
          },
        ],
      },
    });

    assert.lengthOf(snapshot.maintenance.backgroundJobs.rows, 2);
    assert.equal(snapshot.maintenance.backgroundJobs.runningCount, 1);
    assert.equal(snapshot.maintenance.backgroundJobs.queuedCount, 1);
    assert.equal(
      snapshot.maintenance.backgroundJobs.primaryJob?.job_id,
      "synthesis:literature-registry",
    );
    assert.deepEqual(snapshot.maintenance.backgroundJobs.rows[1]?.progress, {
      mode: "indeterminate",
    });
    assert.deepEqual(snapshot.maintenance.backgroundJobs.rows[0]?.progress, {
      mode: "determinate",
      percent: 30,
      current: 3,
      total: 10,
      label: undefined,
    });
  });

  it("derives stable operation keys for scoped asynchronous actions", function () {
    assert.equal(
      getSynthesisUiOperationKey("applyConceptReviewAction", {
        reviewId: "review:weak",
        action: "merge_into_existing",
        targetConceptId: "concept:detr",
      }),
      "applyConceptReviewAction:review:weak",
    );
    assert.equal(
      getSynthesisUiOperationKey("manualRecomputeLayout", {
        preset: "balanced",
      }),
      "manualRecomputeLayout:balanced",
    );
    assert.equal(
      getSynthesisUiOperationKey("acceptTopicGraphRelation", {
        edgeId: "edge:related_to:a:b",
      }),
      "decideTopicGraphRelation:edge:related_to:a:b",
    );
  });

  it("sorts topic rows by paper count and update time for card views", function () {
    const byPaperCount = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: {
          artifacts: {
            sort: "paper_count",
            viewMode: "grid",
          },
        },
      },
    ).state;
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

  it("renders Tags tab state with filters, inspector, actions, and import preview", function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setFilters",
      payload: {
        tags: {
          search: "detr",
          facet: "model",
          status: "warning",
          importDraft: '{"entries":[]}',
        },
      },
    }).state;
    const selectedState = applySynthesisUiAction(state, {
      action: "selectTag",
      payload: { tag: "model:detr" },
    }).state;

    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        tags: {
          entries: [
            {
              tag: "model:detr",
              facet: "model",
              note: "Detection Transformer",
              aliases: ["DETR"],
              abbrev: ["DETR"],
              usage_count: 2,
            },
            {
              tag: "data:coco",
              facet: "data",
            },
          ],
          protocol: { facets: ["model", "data"] },
          validationWarnings: [
            {
              code: "missing_replacement",
              severity: "warning",
              tag: "model:detr",
              message: "replacement missing",
            },
          ],
          projection: {
            target: "tag-index",
            stale: true,
            diagnostics: [],
          },
          importPreview: {
            additions: [],
            unchanged: [],
            conflicts: [
              {
                tag: "model:detr",
                local: { tag: "model:detr", facet: "model" },
                imported: {
                  tag: "model:detr",
                  facet: "model",
                  note: "imported",
                },
              },
            ],
            warnings: [],
          },
        },
      },
      selectedState,
    );

    assert.equal(snapshot.selectedTab, "tags");
    assert.deepEqual(snapshot.tags.facets, ["data", "model"]);
    assert.deepEqual(
      snapshot.tags.visibleRows.map((row) => row.tag),
      ["model:detr"],
    );
    assert.equal(snapshot.tags.selected?.tag, "model:detr");
    assert.isTrue(snapshot.tags.projection.stale);
    assert.equal(snapshot.tags.importDraft, '{"entries":[]}');
    assert.lengthOf(snapshot.tags.importPreview?.conflicts || [], 1);
    assert.include(snapshot.hostCommands, "previewTagVocabularyImport");
    assert.include(snapshot.hostCommands, "applyTagVocabularyImport");

    const command = applySynthesisUiAction(selectedState, {
      action: "hostCommand",
      payload: { command: "validateTagVocabulary" },
    });
    assert.equal(command.hostCommand?.command, "validateTagVocabulary");
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

    const cleared = applySynthesisUiAction(next.state, {
      action: "setGraphView",
      payload: { selectedElement: null },
    });
    assert.isUndefined(cleared.state.graph.selectedElement);
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

  it("keeps low-degree external graph nodes out of the rendered graph while preserving drawer data", function () {
    const input = {
      libraryId: 1,
      graph: {
        graph_hash: "sha256:graph",
        nodes: [{ id: "paper:a", label: "A", kind: "library_paper" as const }],
        edges: [],
        hoverOnlyNodes: [
          {
            id: "lit:single",
            label: "Unique External",
            kind: "external_reference" as const,
            visibility: "hover_only" as const,
            display_tier: "single_external" as const,
            external_degree: 1,
          },
        ],
        hoverOnlyEdges: [
          {
            id: "e-single",
            source: "paper:a",
            target: "lit:single",
            primary_role: "citation",
            visibility: "hover_only" as const,
          },
        ],
      },
    };

    const defaultSnapshot = buildSynthesisUiSnapshot(
      input,
      createDefaultSynthesisUiState(),
    );
    const searchState = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: { graph: { search: "Unique" } },
      },
    ).state;
    const searchedSnapshot = buildSynthesisUiSnapshot(input, searchState);

    assert.deepEqual(
      defaultSnapshot.graph.visibleNodes.map((node) => node.id),
      ["paper:a"],
    );
    assert.deepEqual(defaultSnapshot.graph.visibleEdges, []);
    assert.deepEqual(
      defaultSnapshot.graph.hoverOnlyNodes.map((node) => node.id),
      ["lit:single"],
    );
    assert.deepEqual(
      searchedSnapshot.graph.visibleNodes.map((node) => node.id),
      [],
    );
    assert.deepEqual(searchedSnapshot.graph.visibleEdges, []);
    assert.deepEqual(
      searchedSnapshot.graph.hoverOnlyNodes.map((node) => node.id),
      ["lit:single"],
    );
    assert.deepEqual(
      searchedSnapshot.graph.hoverOnlyEdges.map((edge) => edge.id),
      ["e-single"],
    );
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

  it("wires graph layout recompute to the layout-only worker", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const appSource = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");

    assert.include(tabSource, "runCitationGraphLayoutWorker");
    assert.include(tabSource, "refreshGraphLayoutIfNeeded");
    assert.notInclude(
      tabSource,
      ".rebuildCitationGraphProjection()\n      .finally",
    );
    assert.include(appSource, "maybeRequestGraphLayoutRefresh");
    assert.include(appSource, 'reason: "auto"');
  });

  it("routes Workbench artifact delete and purge host commands", function () {
    const deleteResult = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "hostCommand",
        payload: {
          command: "deleteTopicArtifact",
          args: { topicId: "topic-alpha" },
        },
      },
    );
    const purgeResult = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "hostCommand",
        payload: {
          command: "purgeDeletedTopicArtifacts",
          args: {},
        },
      },
    );

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
    assert.include(
      source,
      "SYNTHESIS_WORKBENCH_HANDSHAKE_REQUIRED_SUCCESSES = 5",
    );
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
    assert.include(source, '"synthesis:topic-detail"');
    assert.include(source, '"synthesis:artifact"');
    assert.notInclude(
      source,
      "openPathInSystem(artifact.paths.currentMarkdown",
    );
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
    assert.include(source, "renderGitSyncPanel");
    assert.include(source, "Sync review");
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
    assert.include(
      source,
      "Select evidence from a claim, taxonomy node, comparison row, or timeline marker.",
    );
    assert.include(source, "state.selectedEvidenceId");
    assert.include(source, "state.evidenceExplorerOpen");
    assert.include(source, "openEvidenceExplorer(evidenceId(evidence))");
    assert.include(source, "openDigestModal(selected)");
    assert.notInclude(source, "openDigestModal(evidence);");
    assert.include(source, "selected evidence");
    assert.include(
      source,
      'firstText(gap, ["text", "description", "impact", "summary"',
    );
    assert.include(source, "firstText(debate");
    assert.include(source, '"debate"');
    assert.include(source, "firstText(event");
    assert.include(source, '"summary"');
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
    assert.include(source, "function iconSvg(");
    assert.include(source, "controls: [");
    assert.include(source, '["tags", "Tags", "tags"]');
    assert.include(source, '["concepts", "Concepts", "concepts"]');
    assert.include(source, "concepts: [");
    assert.include(source, "nav-icon-${iconName}");
    assert.include(
      source,
      'iconSvg(state.sidebarExpanded ? "panel-close" : "panel-open")',
    );
    assert.include(source, "nav-label");
    assert.include(source, "sidebar-collapse-toggle");
    assert.include(source, "button.title = label");
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
    assert.include(
      mockupApp,
      "iconSvg(window.__state.sidebarExpanded ? 'panel-close' : 'panel-open')",
    );
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
    const uiModel = await fs.readFile(
      "src/modules/synthesis/uiModel.ts",
      "utf8",
    );
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
    assert.notInclude(source, 'updateMode: "update_full"');
    assert.notInclude(source, 'updateScope: "refresh"');
    assert.include(
      source,
      "Cannot update synthesis: update-topic-synthesis workflow is not loaded",
    );
  });

  it("adds a unified Zotero tab workspace entry for Dashboard and Synthesis", async function () {
    const host = await fs.readFile("src/modules/workspaceTab.ts", "utf8");
    const app = await fs.readFile("src/workspaceApp.ts", "utf8");
    const index = await fs.readFile(
      "addon/content/workspace/index.html",
      "utf8",
    );
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
    assert.notInclude(host, "import { openSynthesisWorkbenchTab");
    assert.include(host, "dashboard-mount-ready");
    assert.include(host, "synthesis-mount-ready");
    assert.include(host, "scheduleWorkspaceHandshake");
    assert.include(host, "await mountDashboardRuntimeIfReady(runtime)");
    assert.include(host, "await mountSynthesisRuntimeIfReady(runtime)");
    assert.include(app, "Dashboard");
    assert.include(app, "Synthesis");
    assert.include(app, "ZoteroSkillsTheme");
    assert.include(app, "theme-switch");
    assert.include(app, "function updateThemeSwitchState()");
    assert.include(app, "node.dataset.theme = theme");
    assert.include(app, "updateThemeSwitchState();");
    assert.notInclude(
      app,
      "function setThemeChoice(theme: WorkspaceTheme) {\n  state.theme = window.ZoteroSkillsTheme?.setTheme?.(theme) || theme;\n  render();\n}",
    );
    assert.include(app, "System");
    assert.include(app, "Light");
    assert.include(app, "Dark");
    assert.include(app, "segmented");
    assert.include(app, "workspace-view-switch");
    assert.include(app, "segmented-thumb");
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
    assert.include(app, "workspace-view-mount");
    assert.include(app, "updateWorkspaceVisibility");
    assert.include(app, "is-dashboard");
    assert.include(app, "is-synthesis");
    assert.notInclude(app, "Open Dashboard");
    assert.notInclude(app, "Open Synthesis");
    assert.notInclude(app, "open-synthesis");
    assert.notInclude(app, "assistant-frame");
    assert.include(css, ".dashboard-mount");
    assert.include(css, ".synthesis-mount");
    assert.include(css, ".theme-switch");
    assert.include(css, ".workspace-view-switch");
    assert.include(css, ".workspace-view-switch .segmented-thumb");
    assert.include(css, ".workspace-view-switch.is-synthesis .segmented-thumb");
    assert.include(css, "transform: translateX(100%)");
    assert.include(css, "transition:");
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
    assert.include(css, ".workspace-view-mount.is-active");
    assert.include(css, "visibility: hidden");
    assert.include(css, "grid-template-rows: minmax(0, 1fr)");
    assert.include(index, "workspace-root");
    assert.include(config, "src/workspaceApp.ts");
    assert.include(config, "addon/content/workspace/app.bundle.js");
  });

  it("preserves active Workbench controls across snapshot rerenders", async function () {
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    assert.include(app, "captureWorkbenchRenderState");
    assert.include(app, "restoreWorkbenchRenderState");
    assert.include(app, "data-synthesis-control-key");
    assert.include(app, "data-synthesis-scroll-key");
    assert.include(app, "data-synthesis-details-key");
    assert.include(app, "graphCamera");
    assert.include(app, "snapshotContentSignature");
    assert.include(app, "snapshotChromeSignature");
    assert.include(app, "renderWorkbenchChrome");
  });

  it("keeps Workbench UI-only actions on cached snapshot input", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const hooks = await fs.readFile("src/hooks.ts", "utf8");

    assert.include(host, "snapshotInputLocked");
    assert.include(host, ".getSynthesisSnapshotInput(runtime.state)");
    assert.include(host, "prewarmSynthesisWorkbenchSnapshot");
    assert.include(host, "prewarmedSynthesisSnapshotInput");
    assert.include(host, "refreshFromService: false");
    assert.include(host, 'envelope.action === "ready"');
    assert.include(host, 'envelope.action === "refresh"');
    assert.notInclude(host, 'messageType === "synthesis:init"');
    assert.include(hooks, "prewarmSynthesisWorkbenchAfterStartup");
    assert.include(hooks, "Synthesis Workbench is ready.");
  });

  it("uses 32px runtime icons for chrome UI surfaces", async function () {
    const toolbar = await fs.readFile(
      "src/modules/dashboardToolbarButton.ts",
      "utf8",
    );
    const menu = await fs.readFile("src/modules/workflowMenu.ts", "utf8");
    const ztoolkit = await fs.readFile("src/utils/ztoolkit.ts", "utf8");
    const smallIconSizes = await Promise.all([
      readPngSize("addon/content/icons/icon_play_32.png"),
      readPngSize("addon/content/icons/icon_workbench_32.png"),
      readPngSize("addon/content/icons/icon_sidebar_32.png"),
    ]);
    const iconFiles = await Promise.all([
      fs.stat("addon/content/icons/icon_play_32.png"),
      fs.stat("addon/content/icons/icon_workbench_32.png"),
      fs.stat("addon/content/icons/icon_sidebar_32.png"),
      fs.stat("addon/content/icons/icon_play.png"),
      fs.stat("addon/content/icons/icon_workbench.png"),
      fs.stat("addon/content/icons/icon_sidebar.png"),
    ]);

    assert.include(toolbar, "icon_workbench_32.png");
    assert.include(toolbar, "icon_play_32.png");
    assert.include(toolbar, "icon_sidebar_32.png");
    assert.include(menu, "icon_play_32.png");
    assert.include(ztoolkit, "icon_sidebar_32.png");
    assert.notInclude(toolbar, "icon_workbench.png`");
    assert.notInclude(toolbar, "icon_play.png`");
    assert.notInclude(toolbar, "icon_sidebar.png`");
    assert.notInclude(menu, "icon_play.png`");
    assert.notInclude(ztoolkit, "icon_sidebar.png`");
    assert.deepEqual(smallIconSizes, [
      { width: 32, height: 32 },
      { width: 32, height: 32 },
      { width: 32, height: 32 },
    ]);
    assert.isAbove(iconFiles[3].size, iconFiles[0].size);
    assert.isAbove(iconFiles[4].size, iconFiles[1].size);
    assert.isAbove(iconFiles[5].size, iconFiles[2].size);
  });

  it("uses a bundled Sigma graph explorer as the Workbench graph renderer", async function () {
    const index = await fs.readFile(
      "addon/content/synthesis/index.html",
      "utf8",
    );
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");
    const config = await fs.readFile("zotero-plugin.config.ts", "utf8");

    assert.include(index, "app.bundle.js");
    assert.include(source, 'from "sigma"');
    assert.include(source, "new Sigma");
    assert.include(source, "ResizeObserver");
    assert.include(source, "scheduleSigmaResize");
    assert.include(source, 'label: ""');
    assert.include(source, "function graphNodeSize");
    assert.include(source, 'targetTier === "shared_external"');
    assert.include(source, "addHoverNeighborhood");
    assert.include(source, "scheduleHoverClear");
    assert.include(source, "cancelScheduledHoverClear");
    assert.include(source, "showHoverLabel");
    assert.include(source, "node === state.hoveredNode");
    assert.include(source, "selectedGraphHoverNode");
    assert.include(source, "pinnedHoverNode");
    assert.include(source, 'renderer.on("clickStage"');
    assert.include(source, "selectedElement: null");
    assert.include(source, "collectSelectedNodeCitations");
    assert.include(source, "renderSelectedNodeCitations");
    assert.include(source, "graph-selection-drawer");
    assert.include(source, "graph.selection");
    assert.include(source, "snapshot.graph.hoverOnlyEdges");
    assert.notInclude(
      source,
      "snapshot.graph.hoverOnlyNodes.map((node) => [node.id, node])",
    );
    assert.include(source, "enableEdgeEvents: false");
    assert.include(source, "zIndex: true");
    assert.include(source, "function graphNodeZIndex");
    assert.include(source, "graph-control-drawer");
    assert.include(source, "graph-control-icon");
    assert.include(source, "graph-control-title");
    assert.include(source, 'iconSvg("controls")');
    assert.include(
      source,
      'detail.setAttribute("aria-label", "Graph controls")',
    );
    assert.include(source, "detail.tabIndex = 0");
    assert.notInclude(source, "renderGraphSvg");
    assert.include(css, ".sigma-stage");
    assert.include(css, "height: 100%;");
    assert.include(css, ".graph-control-drawer");
    assert.include(css, ".graph-control-drawer:hover");
    assert.include(css, ".graph-control-drawer:focus-within");
    assert.include(css, ".graph-control-icon svg");
    assert.include(css, ".graph-control-title");
    assert.include(css, "display: none;");
    assert.notInclude(css, "writing-mode: vertical-rl;");
    assert.include(css, ".graph-selection-drawer");
    assert.include(css, ".graph-selection-content");
    assert.include(css, ".graph-citation-list");
    assert.include(css, ".graph-citation-card");
    assert.include(css, "width: 42px;");
    assert.include(css, "left: 12px;");
    assert.include(css, "right: 12px;");
    assert.include(css, "width: min(330px, calc(100% - 24px));");
    assert.include(css, "width: min(360px, calc(100% - 24px));");
    assert.notInclude(css, "grid-template-columns: minmax(0, 1fr) 300px;");
    assert.include(config, "src/synthesisWorkbenchApp.ts");
    assert.include(config, "addon/content/synthesis/app.bundle.js");
  });

  it("loads shared theme tokens for Synthesis Workbench and structured Topic Detail", async function () {
    const index = await fs.readFile(
      "addon/content/synthesis/index.html",
      "utf8",
    );
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");
    const themeCss = await fs.readFile(
      "addon/content/shared/theme.css",
      "utf8",
    );
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
    const index = await fs.readFile(
      "addon/content/synthesis/index.html",
      "utf8",
    );
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
        {
          id: "topic-queued",
          title: "Queued Topic",
          kind: "topic_synthesis",
          coverage: "complete",
          freshness: "queued",
          language: "zh-CN",
        },
        {
          id: "topic-failed",
          title: "Failed Topic",
          kind: "topic_synthesis",
          coverage: "complete",
          freshness: "failed",
          language: "zh-CN",
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
    assert.deepInclude(intents["topic-queued"], {
      topicId: "topic-queued",
      updateScope: "maintenance",
      blocked: true,
    });
    assert.deepInclude(intents["topic-failed"], {
      topicId: "topic-failed",
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

  it("does not expose note mirror recovery commands as normal host commands", function () {
    const missing = normalizeSynthesisUiSnapshot({
      libraryId: 1,
      sync: {
        status: "missing_root",
        allowedActions: [],
        diagnostics: [],
        requiresConfirmation: false,
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

    assert.notInclude(missing.hostCommands, "rebuildSynthesisMirror");
    assert.notInclude(missing.hostCommands, "recoverSynthesisFromMirror");
    assert.isFalse(rebuild.handled);
    assert.isFalse(recover.handled);
  });

  it("defaults Topics to graph view and preserves List/Grid switching", function () {
    const initial = createDefaultSynthesisUiState();
    assert.equal(initial.artifacts.viewMode, "graph");

    const listState = applySynthesisUiAction(initial, {
      action: "setFilters",
      payload: { artifacts: { viewMode: "list" } },
    }).state;
    const gridState = applySynthesisUiAction(listState, {
      action: "setFilters",
      payload: { artifacts: { viewMode: "grid" } },
    }).state;

    assert.equal(listState.artifacts.viewMode, "list");
    assert.equal(gridState.artifacts.viewMode, "grid");
  });

  it("renders Topics graph as a spatial canvas instead of a list-only view", async function () {
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");

    assert.include(app, "renderTopicGraphCanvas");
    assert.include(app, "computeTopicGraphLayout");
    assert.include(app, "topic-graph-canvas");
    assert.include(app, "topic-graph-link");
    assert.include(app, 'createSvgElement("path")');
    assert.include(css, ".topic-graph-canvas");
    assert.include(css, ".topic-graph-link");
    assert.include(css, ".topic-graph-node");
    assert.include(css, ".topic-graph-legend");
  });

  it("builds topic graph modes, excludes roots from Unplaced, and fills inspector context", function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setTopicGraphView",
      payload: { mode: "unplaced", selectedTopicId: "topic-child" },
    }).state;
    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        topicGraph: {
          nodes: [
            {
              topic_id: "topic-root",
              title: "Root",
              node_type: "materialized",
              is_root: true,
              level: "top",
            },
            {
              topic_id: "topic-child",
              title: "Child",
              node_type: "materialized",
              paper_count: 3,
              last_synthesis_at: "2026-05-24T00:00:00.000Z",
            },
            {
              topic_id: "topic-peer",
              title: "Peer",
              node_type: "placeholder",
            },
          ],
          edges: [
            {
              edge_id: "edge:broader_than:topic-root:topic-child",
              source_topic_id: "topic-root",
              target_topic_id: "topic-child",
              relation: "broader_than",
              status: "confirmed",
            },
            {
              edge_id: "edge:related_to:topic-child:topic-peer",
              source_topic_id: "topic-child",
              target_topic_id: "topic-peer",
              relation: "related_to",
              status: "suggested",
            },
          ],
          reviewItems: [
            {
              review_id: "review:related_to:topic-child:topic-review",
              status: "open",
              source_topic_id: "topic-child",
              target_topic_id: "topic-review",
              target_title: "Review",
              relation: "related_to",
              confidence: 0.2,
            },
          ],
        },
      },
      state,
    );

    assert.deepEqual(
      snapshot.topicGraph.visibleNodes.map((node) => node.topic_id),
      ["topic-peer"],
    );
    assert.equal(snapshot.topicGraph.inspector.topic?.topic_id, "topic-child");
    assert.deepEqual(
      snapshot.topicGraph.inspector.parents.map((node) => node.topic_id),
      ["topic-root"],
    );
    assert.deepEqual(
      snapshot.topicGraph.inspector.related.map((entry) => entry.node.topic_id),
      ["topic-peer"],
    );
    assert.equal(snapshot.topicGraph.inspector.suggestedCount, 2);
    assert.deepEqual(
      snapshot.topicGraph.inspector.relationReviewItems.map(
        (entry) => entry.review_id,
      ),
      ["review:related_to:topic-child:topic-review"],
    );
    assert.deepEqual(snapshot.topicGraph.inspector.suggestedRelations, [
      {
        edge_id: "edge:related_to:topic-child:topic-peer",
        relation: "related_to",
        status: "suggested",
        node: snapshot.topicGraph.inspector.related[0]!.node,
        source_topic_id: "topic-child",
        target_topic_id: "topic-peer",
        provenance: [],
        evidence_refs: [],
      },
    ]);
    assert.include(snapshot.hostCommands, "rebuildTopicGraphIndex");
    assert.include(snapshot.hostCommands, "applyTopicGraphReviewAction");
  });

  it("renders Concepts tab state with filters, detail, display-text edit, and overlay entries", function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setFilters",
      payload: {
        concepts: {
          search: "detr",
          conceptType: "model",
          status: "active",
          selectedConceptId: "concept:cv:detr",
          reviewMergeTargets: { "review:weak": "concept:cv:detr" },
        },
      },
    }).state;
    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        concepts: {
          concepts: [
            {
              concept_id: "concept:cv:detr",
              label: "DETR",
              aliases: ["DETR", "DEtection TRansformer"],
              concept_type: "model",
              domain: "computer vision",
              status: "active",
              short_definition: "End-to-end object detector.",
              sense_ids: ["sense:cv:detr"],
            },
          ],
          senses: [
            {
              sense_id: "sense:cv:detr",
              concept_id: "concept:cv:detr",
              label: "DETR",
              aliases: ["DETR"],
              domain: "computer vision",
              short_definition: "End-to-end object detector.",
              definition: "Set prediction detector.",
              confidence: "high",
              source_topic_ids: ["object-detection"],
            },
          ],
          aliases: [
            {
              alias_id: "alias:detr",
              alias: "DETR",
              normalized: "detr",
              concept_id: "concept:cv:detr",
              sense_id: "sense:cv:detr",
              status: "active",
              confidence: "high",
            },
            {
              alias_id: "alias:weak",
              alias: "weak",
              normalized: "weak",
              concept_id: "concept:cv:detr",
              status: "active",
              confidence: "low",
            },
          ],
          overlayEntries: [
            {
              concept_id: "concept:cv:detr",
              sense_id: "sense:cv:detr",
              alias: "DETR",
              label: "DETR",
              short_definition: "End-to-end object detector.",
              confidence: "high",
            },
            {
              concept_id: "concept:cv:detr",
              alias: "weak",
              label: "Weak",
              confidence: "low",
            },
          ],
          reviewItems: [
            {
              review_id: "review:weak",
              status: "open",
              reason: "low_confidence_concept",
              topic_id: "object-detection",
              label: "Weak Concept",
              confidence: "low",
              candidate_concept_ids: ["concept:cv:detr"],
            },
          ],
        },
      },
      state,
    );
    const command = applySynthesisUiAction(state, {
      action: "hostCommand",
      payload: {
        command: "updateConceptDisplayText",
        args: {
          conceptId: "concept:cv:detr",
          fields: { short_definition: "Updated" },
        },
      },
    });

    assert.equal(snapshot.concepts.selected?.concept_id, "concept:cv:detr");
    assert.deepEqual(
      snapshot.concepts.visibleRows.map((row) => row.concept_id),
      ["concept:cv:detr"],
    );
    assert.deepEqual(
      snapshot.concepts.overlayEntries.map((entry) => entry.alias),
      ["DETR"],
    );
    assert.deepEqual(
      snapshot.concepts.reviewItems.map((entry) => entry.review_id),
      ["review:weak"],
    );
    assert.equal(
      snapshot.concepts.filters.reviewMergeTargets["review:weak"],
      "concept:cv:detr",
    );
    assert.include(snapshot.hostCommands, "rebuildConceptKbIndex");
    assert.include(snapshot.hostCommands, "applyConceptReviewAction");
    assert.deepEqual(command.hostCommand, {
      command: "updateConceptDisplayText",
      args: {
        conceptId: "concept:cv:detr",
        fields: { short_definition: "Updated" },
      },
    });
  });

  it("wires Concepts tab and non-destructive concept overlay rendering", async function () {
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");

    assert.include(source, "renderConcepts");
    assert.include(source, "renderConceptReviewPanel");
    assert.include(source, "Concept review");
    assert.include(source, "applyConceptReviewAction");
    assert.include(source, "reviewMergeTargets");
    assert.include(source, "Concept Detail");
    assert.include(source, "applyConceptOverlay");
    assert.include(source, "concept-bubble");
    assert.include(source, "a, code, pre");
    assert.include(source, "updateConceptDisplayText");
  });

  it("filters Literature registry rows and exposes cleanup host actions", async function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setFilters",
      payload: { registry: { literature: "needs-cleanup" } },
    }).state;
    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        registry: {
          rows: [
            {
              paper_ref: "1:AAA",
              title: "Needs Review",
              readiness: "partial",
              coverage: "partial",
              missing_artifacts: ["references"],
              cleanup_count: 1,
            },
            {
              paper_ref: "1:BBB",
              title: "Ready",
              readiness: "ready",
              coverage: "complete",
              missing_artifacts: [],
            },
          ],
          cleanupProposals: [
            {
              proposal_id: "cleanup:1",
              status: "open",
              source_paper_ref: "1:AAA",
              source_paper_title: "Needs Review",
              reference_title: "Unresolved Method Paper",
              target_work_title: "Candidate Work",
              reason: "reference target requires review",
              decision_summary:
                "Review how to handle this unresolved reference.",
            },
          ],
          literatureJob: {
            queue_state: "failed_retryable",
            retry_attempt: 1,
            next_retry_at: "2026-05-25T00:01:00.000Z",
            diagnostics: [
              {
                code: "literature_registry_rebuild_failed",
                severity: "error",
                message: "temporary failure",
              },
            ],
            allowed_actions: [
              "retryLiteratureRegistryJob",
              "runLiteratureRegistryJobNow",
            ],
          },
          projection: { target: "literature-registry-index", stale: true },
        },
      },
      state,
    );
    const command = applySynthesisUiAction(state, {
      action: "hostCommand",
      payload: {
        command: "applyLiteratureCleanupAction",
        args: {
          proposalId: "cleanup:1",
          action: "ignore_reference_instance",
        },
      },
    });

    assert.deepEqual(
      snapshot.registry.visibleRows.map((row) => row.paper_ref),
      ["1:AAA"],
    );
    assert.equal(
      snapshot.registry.cleanupProposals[0]?.proposal_id,
      "cleanup:1",
    );
    assert.isTrue(snapshot.registry.projection.stale);
    assert.equal(
      snapshot.registry.literatureJob?.queue_state,
      "failed_retryable",
    );
    assert.include(snapshot.hostCommands, "applyLiteratureCleanupAction");
    assert.include(snapshot.hostCommands, "runLiteratureRegistryJobNow");
    assert.include(snapshot.hostCommands, "retryLiteratureRegistryJob");
    assert.deepEqual(command.hostCommand, {
      command: "applyLiteratureCleanupAction",
      args: {
        proposalId: "cleanup:1",
        action: "ignore_reference_instance",
      },
    });
  });

  it("keeps Index default rows Zotero-bound and exposes referenced literature mode", function () {
    const input = {
      libraryId: 1,
      registry: {
        rows: [
          {
            paper_ref: "1:AAA",
            title: "Library Paper",
            readiness: "ready" as const,
            coverage: "complete" as const,
            missing_artifacts: [],
            index_scope: "library" as const,
            reference_count: 1,
            references: [
              {
                reference_instance_id: "ref:1",
                reference_index: 0,
                title: "External Method",
                resolution_status: "matched",
                target_title: "External Method",
                target_binding: "external" as const,
              },
            ],
          },
          {
            paper_ref: "lit:external",
            title: "External Method",
            readiness: "partial" as const,
            coverage: "missing" as const,
            missing_artifacts: [],
            index_scope: "referenced" as const,
            literature_status: "reference-only" as const,
            referenced_by_count: 1,
          },
        ],
      },
    };

    const defaultSnapshot = buildSynthesisUiSnapshot(input);
    const referencedState = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: { registry: { literature: "reference-only" } },
      },
    ).state;
    const referencedSnapshot = buildSynthesisUiSnapshot(input, referencedState);

    assert.deepEqual(
      defaultSnapshot.registry.visibleRows.map((row) => row.paper_ref),
      ["1:AAA"],
    );
    assert.equal(defaultSnapshot.registry.visibleRows[0]?.reference_count, 1);
    assert.equal(
      defaultSnapshot.registry.visibleRows[0]?.references?.[0]?.target_binding,
      "external",
    );
    assert.deepEqual(
      referencedSnapshot.registry.visibleRows.map((row) => row.paper_ref),
      ["lit:external"],
    );
  });

  it("wires Literature filters and cleanup review card in the Workbench", async function () {
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");

    assert.include(source, "needs-cleanup");
    assert.include(source, "Only referenced literature");
    assert.include(source, "renderRegistryTable");
    assert.include(source, "registry-parent-row");
    assert.include(source, "registry-reference-row");
    assert.include(source, "state.registryExpandedRows");
    assert.include(source, "registryReferencePrimaryTitle");
    assert.include(source, "renderRegistryReferenceRow");
    assert.include(source, "registryReferenceDisplayId");
    assert.include(source, "registryRowDisplayId");
    assert.include(source, "registryStatusTone");
    assert.include(source, '"ID"');
    assert.include(source, '"Artifacts"');
    assert.include(source, '"References"');
    assert.include(source, '"(Total/Unresolved)"');
    assert.include(source, "registryArtifactBadges");
    assert.include(source, "renderRegistryArtifacts");
    assert.include(source, '"Digest artifact"');
    assert.include(source, '"References artifact"');
    assert.include(source, '"Citation analysis artifact"');
    assert.include(source, "registry-artifacts-header");
    assert.include(source, "registry-references-header");
    assert.include(source, "registry-reference-count");
    assert.include(source, 'status === "matched"');
    assert.notInclude(source, "renderRegistryReferenceField");
    assert.notInclude(source, "registryReferenceSecondaryText");
    assert.notInclude(source, "registryReferenceTargetSummary");
    assert.notInclude(
      source,
      '"Readiness",\n    "Coverage",\n    "Status",\n    "References",\n    "Missing",',
    );
    assert.notInclude(source, "registry-reference-details");
    assert.notInclude(source, "registry-reference-form");
    assert.notInclude(source, 'item.appendChild(el("span", "muted", target));');
    assert.include(source, "cleanup-review-panel");
    assert.include(source, "source_paper_title");
    assert.include(source, "reference_title");
    assert.notInclude(source, '["proposal id", proposal.proposal_id]');
    assert.include(source, "applyLiteratureCleanupAction");
    assert.include(source, "confirm_literature_item");
    assert.include(source, "match_existing_literature_item");
    assert.include(source, "ignore_reference_instance");
    assert.include(source, "defer_reference_resolution");
    assert.include(source, "confirm_delete_item");
    assert.include(source, "mark_as_dedupe_merge");
    assert.include(source, "keep_for_now");
    assert.include(source, "Zotero deletion review");
    assert.include(source, "Zotero dedupe review");
    assert.include(source, "runLiteratureRegistryJobNow");
    assert.include(source, "retryLiteratureRegistryJob");
    assert.include(css, ".registry-table");
    assert.include(css, ".registry-parent-row td");
    assert.include(css, ".registry-reference-row td");
    assert.include(css, ".registry-reference-title-cell");
    assert.include(css, ".registry-reference-disclosure");
    assert.include(css, ".registry-reference-muted");
    assert.include(css, ".registry-artifact-badges");
    assert.include(css, ".registry-artifacts-cell");
    assert.include(css, ".registry-references-cell");
    assert.include(css, ".registry-column-header-subtitle");
    assert.include(css, ".registry-reference-count");
    assert.include(css, "grid-template-columns: repeat(3, max-content);");
    assert.include(css, "table-layout: auto;");
    assert.include(css, ".badge.blue");
    assert.include(css, "overflow-wrap: anywhere;");
    assert.include(css, "padding-block: 4px;");
    assert.include(css, "white-space: nowrap;");
    assert.include(css, "text-overflow: ellipsis;");
    assert.notInclude(css, ".registry-reference-form");
    assert.notInclude(css, ".registry-reference-field");
    assert.notInclude(css, "table-layout: fixed;");
  });

  it("renders domain-local single review cards for Synthesis review workflows", async function () {
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");

    assert.include(app, "renderReviewPanel");
    assert.include(app, "renderReviewCard");
    assert.include(app, "review-panel-enter");
    assert.include(app, "renderTopicGraphReviewPanel");
    assert.include(app, "optimisticReviewDecisions");
    assert.include(app, "isReviewOptimisticallyResolved");
    assert.include(app, "captureWorkbenchRenderState");
    assert.include(app, "restoreWorkbenchRenderState");
    assert.include(app, "tag-import-popover");
    assert.include(app, "Tag import");
    assert.include(app, "Sync review");
    assert.notInclude(app, "Concept Review Queue");
    assert.notInclude(app, "Cleanup Queue");
    assert.notInclude(app, "Relation Review Queue");
    assert.include(css, ".review-panel");
    assert.include(css, ".review-card");
    assert.include(css, "@keyframes review-panel-enter");
    assert.include(css, ".review-panel {\n    animation: none;");
  });

  it("wires asynchronous Workbench action feedback and host single-flight", async function () {
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");

    assert.include(app, "localPendingActions");
    assert.include(app, "aria-busy");
    assert.include(app, "renderActionStatusbar");
    assert.include(app, "listBackgroundJobs");
    assert.include(app, "renderBackgroundJobPopover");
    assert.include(app, "action-statusbar-job-button");
    assert.include(app, "action-statusbar");
    assert.include(app, "STATUSBAR_COMPLETED_TIMEOUT_MS");
    assert.include(app, "STATUSBAR_FAILED_TIMEOUT_MS");
    assert.include(app, "action-statusbar-progress");
    assert.include(app, "isOperationPending");
    assert.notInclude(app, "content.appendChild(actionNotice)");
    assert.include(host, "inFlightCommands");
    assert.include(host, "runWorkbenchCommandOnce");
    assert.include(host, "This action is already running.");
    assert.include(css, ".action-statusbar");
    assert.include(
      css,
      "grid-template-rows: auto minmax(0, 1fr) var(--synthesis-statusbar-height)",
    );
    assert.include(css, "height: var(--synthesis-statusbar-height)");
    assert.include(css, "line-height: 1.35");
    assert.include(css, ".action-statusbar-progress");
    assert.include(css, ".action-statusbar-job-popover");
    assert.include(css, "@media (prefers-reduced-motion: reduce)");
  });
});

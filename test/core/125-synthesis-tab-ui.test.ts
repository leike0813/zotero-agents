import { assert } from "chai";
import fs from "fs/promises";
import {
  applySynthesisUiAction,
  buildSynthesisUiSnapshot,
  createDefaultSynthesisUiState,
  getSynthesisUiOperationKey,
  normalizeSynthesisUiSnapshot,
} from "../../src/modules/synthesis/uiModel";
import { isSynthesisLibraryReadModelInvalidationEvent } from "../../src/modules/synthesis/itemObserver";
import { isTransientStorageBusyError } from "../../src/modules/guardedSqlite";

describe("Synthesis tab UI model", function () {
  async function readPngSize(filePath: string) {
    const bytes = await fs.readFile(filePath);
    return {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }

  function extractFunctionBlock(source: string, functionName: string) {
    const start = source.indexOf(`function ${functionName}`);
    assert.isAtLeast(start, 0, `${functionName} should exist`);
    const paramsStart = source.indexOf("(", start);
    assert.isAtLeast(paramsStart, start, `${functionName} should have params`);
    let paramDepth = 0;
    let paramsEnd = -1;
    for (let index = paramsStart; index < source.length; index += 1) {
      const char = source[index];
      if (char === "(") {
        paramDepth += 1;
      } else if (char === ")") {
        paramDepth -= 1;
        if (paramDepth === 0) {
          paramsEnd = index;
          break;
        }
      }
    }
    assert.isAtLeast(
      paramsEnd,
      paramsStart,
      `${functionName} params should end`,
    );
    const bodyStart = source.indexOf("{", paramsEnd);
    assert.isAtLeast(
      bodyStart,
      paramsEnd,
      `${functionName} should have a body`,
    );
    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
      const char = source[index];
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return source.slice(start, index + 1);
        }
      }
    }
    assert.fail(`Could not extract ${functionName}`);
  }

  function extractIfBlock(source: string, condition: string) {
    const start = source.indexOf(`if (${condition})`);
    assert.isAtLeast(start, 0, `${condition} block should exist`);
    const bodyStart = source.indexOf("{", start);
    assert.isAtLeast(bodyStart, start, `${condition} should have a body`);
    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
      const char = source[index];
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return source.slice(start, index + 1);
        }
      }
    }
    assert.fail(`Could not extract if (${condition})`);
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
          key: "manualRecomputeLayout:force",
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
          config_status: "configured",
          remote_url: "https://[redacted]@example.invalid/repo.git",
          branch: "main",
          token_masked: "ghp_ab...1234",
          token_updated_at: "2026-06-14T00:00:00.000Z",
          connection_test: {
            ok: true,
            tested_at: "2026-06-14T00:01:00.000Z",
            remote_branch_state: "missing_initializable",
            diagnostics: [
              {
                code: "git_sync_remote_branch_missing_initializable",
                severity: "info",
                message: "remote branch will be initialized",
              },
            ],
          },
          conflict_report: {
            conflicts: [
              {
                asset_path: "tags/vocabulary.json",
                reason: "both_changed",
                base_hash: "sha256:base",
                local_hash: "sha256:local",
                remote_hash: "sha256:remote",
              },
            ],
          },
          conflict_actions: [
            "keep_local",
            "save_remote_copy",
            "clear_after_manual_edit",
          ],
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
          activeWorkerKind: "reference-sidecar-operation",
          canonicalSyncPending: true,
          canonicalEpoch: 3,
          stale: ["citation-graph:library"],
          missing: [],
          partial: [],
          recommendedCommands: ["rebuildCitationGraphCacheNow"],
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
          source_materials_status: "partial",
          source_materials_percent: 62,
          freshness: "dirty",
          updated_at: "2026-05-10T12:00:00.000Z",
          paper_count: 7,
          summary: "Beta summary",
          discovery_status: "candidates",
          candidate_count: 2,
        },
        {
          id: "topic-a",
          title: "Alpha Topic",
          kind: "topic_synthesis",
          source_materials_status: "complete",
          source_materials_percent: 100,
          freshness: "fresh",
          paper_count: 3,
          summary: "Alpha summary",
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
    assert.equal(
      snapshot.artifacts.rows[1]?.source_materials_status,
      "partial",
    );
    assert.equal(snapshot.artifacts.rows[1]?.source_materials_percent, 62);
    assert.notProperty(snapshot.artifacts.rows[1] as any, "coverage");
    assert.notProperty(snapshot.artifacts.rows[1] as any, "completion");
    assert.equal(snapshot.artifacts.rows[1]?.discovery_status, "candidates");
    assert.equal(snapshot.artifacts.rows[1]?.candidate_count, 2);
    assert.equal(snapshot.preferences.graphRebuildMode, "off");
    assert.equal(snapshot.graph.layoutAlgorithm, "force");
    assert.equal(
      snapshot.actions.inFlight[0]?.command,
      "applyConceptReviewAction",
    );
    assert.equal(snapshot.actions.lastFailed?.status, "failed");
    assert.equal(snapshot.sync.status, "ready");
    assert.lengthOf(snapshot.sync.diagnostics, 1);
    assert.equal(snapshot.sync.git?.queue_state, "blocked_conflict");
    assert.equal(snapshot.sync.git?.config_status, "configured");
    assert.equal(snapshot.sync.git?.token_masked, "ghp_ab...1234");
    assert.equal(snapshot.sync.git?.connection_test?.ok, true);
    assert.equal(
      snapshot.sync.git?.connection_test?.remote_branch_state,
      "missing_initializable",
    );
    assert.equal(snapshot.sync.git?.conflict_count, 1);
    assert.deepEqual(snapshot.sync.git?.conflict_assets, [
      {
        asset_path: "tags/vocabulary.json",
        reason: "both_changed",
        base_hash: "sha256:base",
        local_hash: "sha256:local",
        remote_hash: "sha256:remote",
      },
    ]);
    assert.sameMembers(snapshot.sync.git?.conflictActions || [], [
      "keep_local",
      "save_remote_copy",
      "clear_after_manual_edit",
    ]);
    assert.include(snapshot.sync.git?.allowedActions || [], "retryGitSync");
    assert.equal(snapshot.maintenance.summary.status, "queued");
    assert.deepEqual(snapshot.maintenance.backgroundJobs.rows, []);
    assert.equal(
      snapshot.maintenance.summary.activeWorkerKind,
      "reference-sidecar-operation",
    );
    assert.include(
      snapshot.maintenance.summary.recommendedCommands,
      "rebuildCitationGraphCacheNow",
    );
    assert.equal(snapshot.deletedArtifacts.count, 0);
    assert.deepEqual(
      snapshot.conflicts.candidates.map((entry) => entry.id),
      ["conflict-a"],
    );
    assert.isArray(snapshot.hostCommands);
    assert.include(snapshot.hostCommands, "syncNow");
    assert.include(snapshot.hostCommands, "resolveGitSyncConflict");
    assert.include(snapshot.hostCommands, "runAdvancedReferenceMatchingNow");
    assert.include(snapshot.hostCommands, "applyReferenceMatchProposalAction");
    assert.include(snapshot.hostCommands, "applyReferenceMatchProposalActions");
  });

  it("classifies wrapped SQLite busy errors as transient storage refresh failures", function () {
    assert.isTrue(
      isTransientStorageBusyError({
        message: "storage execution failed",
        cause: {
          message:
            "Component returned failure code: 0x80630001 (NS_ERROR_STORAGE_BUSY)",
        },
      }),
    );
    assert.isTrue(
      isTransientStorageBusyError({
        message: "repository read failed",
        cause: new Error("SQLITE_BUSY: database is locked"),
      }),
    );
    assert.isFalse(isTransientStorageBusyError(new Error("schema mismatch")));
  });

  it("uses polished empty states for synthesis workbench sparse data", async function () {
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");

    assert.include(source, "function renderEmptyState");
    assert.include(source, "No reference sidecar records yet");
    assert.include(source, "synthesis-tags-empty");
    assert.include(source, "synthesis-concepts-empty");
    assert.include(source, "synthesis-graph-no-data");
    assert.include(source, "synthesis-graph-drawing");
    assert.include(source, "function addHoverNeighborhood");
    assert.include(source, "synthesis-graph-node-counts");
    assert.include(source, "display_tier");
    assert.include(source, "synthesis-tags-cache-ready");
    assert.include(source, "synthesis-concepts-cache-ready");
    assert.include(source, "synthesis-action-advanced-matching");
    assert.include(source, "applyReferenceMatchProposalAction");
    assert.include(source, "applyReferenceMatchProposalActions");
    assert.include(source, "renderIndexReviewDrawer");
    assert.include(source, "renderReviewCenter");
    assert.include(source, "referenceMatchProposalContext");
    assert.include(source, "review-center-table");
    assert.include(source, "synthesis-action-accept-all");
    assert.include(source, "synthesis-action-reject-all");
    assert.include(source, "synthesis-action-accept-selected");
    assert.include(source, "synthesis-action-reject-selected");
    assert.include(source, 'selectedTab === "reviews"');
    assert.include(source, "filters: reviewFilters(snapshot)");
    assert.include(source, "compactReferenceProposalSignature");
    assert.include(source, "Source:");
    assert.include(source, "Target:");
    assert.include(source, "Parent item");
    assert.include(source, "Apply pending");
    assert.include(source, "synthesis-action-applying-pending");
    assert.include(source, "synthesis-reference-review-applying-pending");
    assert.include(source, "pendingReferenceProposalDecisions");
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

  it("keeps stale citation graph cache data visible instead of forcing no-data", async function () {
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const block = extractFunctionBlock(source, "renderGraph");

    assert.include(block, "synthesis-graph-cache-stale-title");
    assert.include(block, "synthesis-graph-cache-stale-body");
    assert.include(block, "makeGraphIncrementalRefreshButton(snapshot)");
    assert.include(block, 'reason: "graph_tab_failed"');
    assert.include(block, "if (!snapshot.graph.graph_hash || !hasGraphData)");
    assert.notInclude(
      block,
      'graphCacheStatus !== "ready" || !snapshot.graph.graph_hash || !hasGraphData',
    );
  });

  it("wires stale-only incremental graph refresh and explicit graph search controls", async function () {
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const uiModel = await fs.readFile(
      "src/modules/synthesis/uiModel.ts",
      "utf8",
    );
    const controlsBlock = extractFunctionBlock(app, "renderGraphControls");
    const searchInputStart = controlsBlock.indexOf(
      'search.addEventListener("input"',
    );
    const searchInputEnd = controlsBlock.indexOf(
      'search.addEventListener("keydown"',
      searchInputStart,
    );
    assert.isAtLeast(searchInputStart, 0, "Graph search input handler exists");
    assert.isAbove(
      searchInputEnd,
      searchInputStart,
      "Graph search input block ends",
    );
    const searchInputBlock = controlsBlock.slice(
      searchInputStart,
      searchInputEnd,
    );

    assert.include(controlsBlock, "synthesis-action-search");
    assert.include(controlsBlock, "synthesis-action-clear");
    assert.include(controlsBlock, "submitGraphSearch(search.value)");
    assert.include(
      controlsBlock,
      'sendAction("setFilters", { graph: { search: "" } })',
    );
    assert.include(controlsBlock, "refreshGraphSearchHighlight()");
    assert.notInclude(searchInputBlock, 'sendAction("setFilters"');
    assert.notInclude(searchInputBlock, "focusSearch");
    assert.include(app, "function refreshGraphSearchHighlight");
    assert.include(app, "state.sigma?.refresh()");
    const focusSearchBlock = extractFunctionBlock(app, "focusSearch");
    assert.notInclude(focusSearchBlock, ".animate(");
    assert.include(focusSearchBlock, "state.hoverLabelNode = match.id");
    assert.include(app, "function currentGraphSearchQuery");
    assert.include(app, "function graphNodeMatchesSearchText");
    assert.include(app, "function graphTopicScopeOptions");
    assert.include(controlsBlock, "graphTopicScopeOptions(snapshot)");
    assert.include(controlsBlock, 'sendAction("setGraphView", { topicId');
    assert.include(
      controlsBlock,
      'sendAction("setGraphView", { role: value })',
    );
    assert.include(controlsBlock, "synthesis-graph-control-search");
    assert.include(controlsBlock, "synthesis-graph-control-scope");
    assert.include(controlsBlock, "synthesis-graph-control-citation-role");
    assert.include(controlsBlock, "synthesis-graph-control-node-types");
    assert.include(controlsBlock, "synthesis-graph-control-layout");
    assert.include(controlsBlock, "synthesis-graph-control-cache");
    assert.include(app, "function graphEdgeRoleLabel");
    assert.include(app, 'enumLabel("graph-edge-role", value)');
    const roleOptionsBlock = extractFunctionBlock(app, "roleOptions");
    assert.include(roleOptionsBlock, 'edge.primary_role || "unknown"');
    assert.include(roleOptionsBlock, 'role === "citation" ? "" : role');
    assert.notInclude(
      controlsBlock,
      'sendAction("setFilters", { graph: { role: value } })',
    );
    assert.include(app, "openTopicCitationSubgraph");
    assert.include(app, "backToTopicDetail");
    assert.include(app, "selectedGraphTopicTitle");
    assert.include(app, 'searchMatch ? "#0ea5e9"');
    assert.include(app, "GRAPH_MIN_ZOOM_RATIO");
    assert.include(app, "GRAPH_MAX_ZOOM_RATIO");
    assert.include(app, "renderGraphZoomOverlay");
    assert.include(app, "clampGraphCameraZoom");
    assert.include(app, "setGraphZoomFromSlider");
    assert.include(app, "function makeGraphIncrementalRefreshButton");
    assert.include(app, "synthesis-action-refresh-stale-graph");
    assert.include(app, 'graphCacheStatus !== "stale" || !hasDelta');
    assert.include(app, 'command: "refreshCitationGraphCacheIncrementalNow"');
    assert.include(host, "refreshCitationGraphCacheIncrementalNow");
    assert.include(uiModel, "refreshCitationGraphCacheIncrementalNow");
    const filterGraphBlock = extractFunctionBlock(uiModel, "filterGraph");
    assert.include(filterGraphBlock, "topicScopes");
    assert.include(filterGraphBlock, "topicSourceIds");
    assert.include(filterGraphBlock, "topicScopedNodeIds");
    assert.notInclude(
      filterGraphBlock,
      "includesText(searchable(node), filters.search)",
    );
  });

  it("renders citation graph direction and hover labels for pinned external neighbors", async function () {
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");
    const block = extractFunctionBlock(source, "renderSigmaGraph");

    assert.include(source, "CITATION_GRAPH_INCOMING_EDGE_COLOR");
    assert.include(source, "CITATION_GRAPH_OUTGOING_EDGE_COLOR");
    assert.include(source, "CITATION_GRAPH_EDGE_SIZE");
    assert.include(source, "renderCitationGraphLegend");
    assert.include(source, "graphNodeSearchText(node)");
    assert.include(source, "searchable: graphNodeSearchText(node)");
    assert.include(source, "currentGraphSearchQuery(snapshot)");
    assert.include(
      source,
      "graphNodeMatchesSearchText(data.searchable, query)",
    );
    assert.include(block, 'type: "arrow"');
    assert.include(block, "hidden: true");
    assert.include(block, "size: CITATION_GRAPH_EDGE_SIZE");
    assert.include(block, "hidden: !visible");
    assert.include(block, "target === activeNode");
    assert.include(block, "CITATION_GRAPH_INCOMING_EDGE_COLOR");
    assert.include(block, "CITATION_GRAPH_OUTGOING_EDGE_COLOR");
    assert.include(block, "hoverLabelNode");
    assert.include(block, "graph.areNeighbors(node, pinnedNode)");
    assert.include(block, "node === state.hoverLabelNode");
    assert.include(css, ".citation-graph-legend");
    assert.include(css, ".citation-graph-legend-edge::after");
    assert.include(css, ".graph-zoom-overlay");
    assert.include(css, ".graph-zoom-slider");
  });

  it("does not classify stale citation graph cache basis as missing only because rows are unavailable", async function () {
    const source = await fs.readFile(
      "src/modules/synthesis/service.ts",
      "utf8",
    );
    const block = extractFunctionBlock(source, "buildMaintenanceSummary");

    assert.include(block, 'citationCacheStatus === "stale"');
    assert.include(block, "citation_graph_cache_rows_missing");
    assert.notInclude(block, "||\n      !args.citationGraphFound");
    assert.notInclude(
      block,
      'citationCacheStatus === "missing" ||\n      !args.citationGraphFound',
    );
  });

  it("normalizes Synthesis background jobs without inventing progress", function () {
    const snapshot = buildSynthesisUiSnapshot({
      libraryId: 1,
      actions: {
        inFlight: [
          {
            key: "refreshReferenceSidecarNow",
            command: "refreshReferenceSidecarNow",
            status: "running",
            label: "Refresh reference sidecar",
          },
        ],
      },
      maintenance: {
        backgroundJobs: [
          {
            job_id: "synthesis:reference-sidecar:queued",
            source: "operation",
            status: "queued",
            label: "Reference sidecar refresh",
            detail: "2 pending - 0 running - 0 failed",
            updated_at: "2026-05-25T00:00:00.000Z",
            progress: { mode: "indeterminate" },
          },
          {
            job_id: "synthesis:reference-sidecar",
            source: "operation",
            status: "running",
            label: "Reference sidecar refresh",
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
      "synthesis:reference-sidecar",
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
        algorithm: "radial",
      }),
      "manualRecomputeLayout:radial",
    );
    assert.equal(
      getSynthesisUiOperationKey("manualRecomputeLayout", {
        preset: "expanded",
      }),
      "manualRecomputeLayout:force",
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
          source_materials_status: "complete" as const,
          source_materials_percent: 100,
          freshness: "fresh" as const,
          updated_at: "2026-05-12T00:00:00.000Z",
          paper_count: 1,
        },
        {
          id: "topic-large-old",
          title: "Large Old",
          kind: "topic_synthesis" as const,
          source_materials_status: "partial" as const,
          source_materials_percent: 50,
          freshness: "dirty" as const,
          updated_at: "2026-05-10T00:00:00.000Z",
          paper_count: 12,
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
          sourceMaterials: "partial",
          freshness: "dirty",
        },
        registry: {
          artifactCoverage: "partial",
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
            source_materials_status: "partial",
            source_materials_percent: 50,
            freshness: "dirty",
          },
          {
            id: "topic-tags",
            title: "Tag Synthesis",
            kind: "topic_synthesis",
            source_materials_status: "complete",
            source_materials_percent: 100,
            freshness: "fresh",
          },
        ],
        registry: {
          rows: [
            {
              paper_ref: "1:A",
              title: "Ready Paper",
              year: "2024",
              artifactCoverage: "complete",
              missing_artifacts: [],
            },
            {
              paper_ref: "1:B",
              title: "Partial Paper",
              year: "2025",
              artifactCoverage: "partial",
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

  it("filters Index rows by scope, artifact coverage, and binding status", function () {
    const input = {
      libraryId: 1,
      registry: {
        rows: [
          {
            paper_ref: "1:BOUND",
            title: "Bound Source",
            artifactCoverage: "complete" as const,
            missing_artifacts: [],
            index_scope: "library" as const,
            references: [
              {
                reference_instance_id: "raw:1",
                reference_index: 0,
                title: "Candidate Reference",
                target_binding: "library" as const,
                binding_status: "candidate" as const,
              },
            ],
          },
          {
            paper_ref: "1:UNBOUND",
            title: "Unbound Source",
            artifactCoverage: "complete" as const,
            missing_artifacts: [],
            index_scope: "library" as const,
            references: [
              {
                reference_instance_id: "raw:2",
                reference_index: 0,
                title: "Unbound Reference",
                target_binding: "none" as const,
              },
            ],
          },
          {
            paper_ref: "ref:external",
            title: "Referenced Only",
            artifactCoverage: "missing" as const,
            missing_artifacts: [],
            index_scope: "referenced" as const,
          },
        ],
      },
    };

    const libraryState = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: {
          registry: {
            scope: "library",
            artifactCoverage: "complete",
            bindingStatus: "candidate",
          },
        },
      },
    ).state;
    const referencedCandidateState = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: {
          registry: { scope: "referenced", bindingStatus: "candidate" },
        },
      },
    ).state;

    assert.deepEqual(
      buildSynthesisUiSnapshot(input, libraryState).registry.visibleRows.map(
        (row) => row.paper_ref,
      ),
      ["1:BOUND", "1:UNBOUND"],
    );
    assert.deepEqual(
      buildSynthesisUiSnapshot(
        input,
        referencedCandidateState,
      ).registry.visibleRows.map((row) => row.paper_ref),
      ["1:BOUND"],
    );
  });

  it("tracks Review center filters and Index review drawer state", function () {
    const selected = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "selectTab",
      payload: { tab: "reviews" },
    }).state;
    const filtered = applySynthesisUiAction(selected, {
      action: "setFilters",
      payload: {
        reviews: {
          activeTab: "reference_matching",
          search: "method",
          status: "rejected",
          kind: "zotero_binding",
          confidence: "review",
        },
        registry: {
          reviewDrawerOpen: false,
          reviewDrawerIndex: 2,
        },
      },
    }).state;
    const snapshot = buildSynthesisUiSnapshot({ libraryId: 1 }, filtered);

    assert.equal(snapshot.selectedTab, "reviews");
    assert.deepEqual(snapshot.reviews.filters, {
      activeTab: "reference_matching",
      search: "method",
      status: "rejected",
      kind: "zotero_binding",
      confidence: "review",
    });
    assert.equal(snapshot.registry.filters.reviewDrawerOpen, false);
    assert.equal(snapshot.registry.filters.reviewDrawerIndex, 2);

    const legacyIndexCleanup = applySynthesisUiAction(selected, {
      action: "setFilters",
      payload: { reviews: { activeTab: "index_cleanup" } },
    }).state;
    assert.equal(legacyIndexCleanup.reviews.activeTab, "reference_matching");

    const retargeted = applySynthesisUiAction(selected, {
      action: "setFilters",
      payload: { reviews: { status: "retargeted" } },
    }).state;
    const targetSnapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        registry: {
          matchTargetCandidates: [
            {
              kind: "zotero_item",
              libraryId: 1,
              itemKey: "A",
              title: "Alpha Target",
              year: "2020",
              paperRef: "1:A",
            },
            {
              kind: "canonical_reference",
              canonicalReferenceId: "cref:中文",
              title: "中文标题",
              bindingStatus: "accepted",
              bindingTarget: {
                libraryId: 1,
                itemKey: "BOUND",
                paperRef: "1:BOUND",
              },
            },
          ],
          matchProposals: [
            {
              proposal_id: "proposal:retargeted",
              kind: "zotero_binding",
              status: "retargeted",
              source_canonical_reference_id: "cref:source",
              source_effective_canonical_reference_id: "cref:effective-source",
              source_raw_reference_ids: [],
              target_canonical_reference_id: "cref:target",
              target_effective_canonical_reference_id: "cref:effective-target",
            },
          ],
        },
      },
      retargeted,
    );
    assert.equal(targetSnapshot.reviews.filters.status, "retargeted");
    assert.equal(
      targetSnapshot.registry.matchProposals[0]?.status,
      "retargeted",
    );
    assert.equal(
      targetSnapshot.registry.matchProposals[0]
        ?.source_effective_canonical_reference_id,
      "cref:effective-source",
    );
    assert.equal(
      targetSnapshot.registry.matchProposals[0]
        ?.target_effective_canonical_reference_id,
      "cref:effective-target",
    );
    assert.deepInclude(targetSnapshot.registry.matchTargetCandidates, {
      kind: "zotero_item",
      libraryId: 1,
      itemKey: "A",
      title: "Alpha Target",
      year: "2020",
      paperRef: "1:A",
    });
    const canonicalTarget = targetSnapshot.registry.matchTargetCandidates.find(
      (candidate) =>
        candidate.kind === "canonical_reference" &&
        candidate.canonicalReferenceId === "cref:中文",
    );
    assert.equal(canonicalTarget?.title, "中文标题");
    assert.equal(canonicalTarget?.bindingStatus, "accepted");
    assert.deepEqual(canonicalTarget?.bindingTarget, {
      libraryId: 1,
      itemKey: "BOUND",
      paperRef: "1:BOUND",
    });
  });

  it("summarizes Home review items independently from the Review tab", function () {
    const snapshot = buildSynthesisUiSnapshot({
      libraryId: 1,
      reviews: {
        summary: {
          openCount: 2,
          indexCount: 2,
          referenceMatchingCount: 1,
          conceptCount: 0,
          topicGraphCount: 0,
        },
      },
      concepts: {
        reviewItems: [
          {
            review_id: "concept-review:1",
            status: "open",
            reason: "low_confidence_concept",
            label: "DETR",
          },
        ],
      },
      topicGraph: {
        reviewItems: [
          {
            review_id: "topic-review:1",
            status: "open",
            relation: "related_to",
            source_topic_id: "topic:a",
            target_topic_id: "topic:b",
          },
        ],
      },
    });

    assert.deepEqual(snapshot.reviews.summary, {
      openCount: 4,
      indexCount: 2,
      referenceMatchingCount: 1,
      conceptCount: 1,
      topicGraphCount: 1,
    });
  });

  it("renders Tags tab state with table workbench filters, selection, actions, and import preview", function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setFilters",
      payload: {
        tags: {
          search: "detr",
          facet: "model",
          status: "warning",
          view: "staged",
          stagedSearch: "candidate",
          stagedFacet: "topic",
          selectedStagedTags: ["topic:candidate", "topic:missing"],
          selectedVocabularyTags: ["model:detr"],
          density: "comfortable",
          editingStagedTag: {
            originalTag: "topic:candidate",
            draftTag: "candidate edited",
            draftNote: "draft note",
            status: "failed",
            error: "save failed",
          },
          expandedRows: {
            "vocabulary:model:detr": true,
            "staged:topic:candidate": true,
          },
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
          staged: [
            {
              tag: "topic:candidate",
              facet: "topic",
              note: "candidate note",
              source_flow: "tag-regulator-suggest",
              parent_bindings: [22, 11, 22],
              updated_at: "2026-06-05T00:00:00.000Z",
            },
            {
              tag: "field:hidden",
              facet: "field",
              note: "hidden",
            },
          ],
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
    assert.equal(snapshot.tags.filters.view, "staged");
    assert.equal(snapshot.tags.filters.density, "comfortable");
    assert.deepEqual(snapshot.tags.filters.selectedStagedTags, [
      "topic:candidate",
      "topic:missing",
    ]);
    assert.deepEqual(snapshot.tags.filters.selectedVocabularyTags, [
      "model:detr",
    ]);
    assert.deepEqual(snapshot.tags.filters.editingStagedTag, {
      originalTag: "topic:candidate",
      draftTag: "candidate edited",
      draftNote: "draft note",
      status: "failed",
      error: "save failed",
    });
    assert.deepEqual(snapshot.tags.filters.expandedRows, {
      "staged:topic:candidate": true,
      "vocabulary:model:detr": true,
    });
    assert.deepEqual(snapshot.tags.stagedFacets, ["field", "topic"]);
    assert.equal(snapshot.tags.stagedCount, 2);
    assert.deepEqual(
      snapshot.tags.visibleStagedRows.map((row) => row.tag),
      ["topic:candidate"],
    );
    assert.deepEqual(
      snapshot.tags.visibleStagedRows[0]?.parent_bindings,
      [11, 22],
    );
    assert.equal(snapshot.tags.visibleStagedRows[0]?.parent_count, 2);
    assert.isTrue(snapshot.tags.projection.stale);
    assert.equal(snapshot.tags.importDraft, '{"entries":[]}');
    assert.lengthOf(snapshot.tags.importPreview?.conflicts || [], 1);
    assert.include(snapshot.hostCommands, "previewTagVocabularyImport");
    assert.include(snapshot.hostCommands, "applyTagVocabularyImport");
    assert.include(snapshot.hostCommands, "updateStagedTagSuggestion");
    assert.include(snapshot.hostCommands, "updateTagVocabularyEntry");
    assert.include(snapshot.hostCommands, "deleteTagVocabularyEntry");
    assert.include(snapshot.hostCommands, "promoteStagedTagSuggestions");
    assert.include(snapshot.hostCommands, "discardStagedTagSuggestions");
    assert.include(snapshot.hostCommands, "clearStagedTagSuggestions");

    const command = applySynthesisUiAction(selectedState, {
      action: "hostCommand",
      payload: { command: "validateTagVocabulary" },
    });
    assert.equal(command.hostCommand?.command, "validateTagVocabulary");
    assert.equal(
      getSynthesisUiOperationKey("promoteStagedTagSuggestions", {
        tags: ["topic:candidate"],
      }),
      "promoteStagedTagSuggestions:topic:candidate",
    );
    assert.equal(
      getSynthesisUiOperationKey("updateStagedTagSuggestion", {
        originalTag: "topic:candidate",
        tag: "topic:candidate-edited",
      }),
      "updateStagedTagSuggestion:topic:candidate",
    );
    assert.equal(
      getSynthesisUiOperationKey("updateTagVocabularyEntry", {
        originalTag: "model:detr",
        tag: "model:detr-v2",
      }),
      "updateTagVocabularyEntry:model:detr",
    );
  });

  it("refreshes the Tags surface after tag import preview and apply commands", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");
    const invalidationBlock = extractFunctionBlock(
      host,
      "surfacesInvalidatedByCommand",
    );
    const previewImportBranch = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "rebuildTagVocabularyIndex"'),
      invalidationBlock.indexOf('command === "rebuildConceptKbIndex"'),
    );

    assert.include(
      previewImportBranch,
      'command === "previewTagVocabularyImport"',
    );
    assert.include(
      previewImportBranch,
      'command === "applyTagVocabularyImport"',
    );
    assert.include(
      previewImportBranch,
      'command === "promoteStagedTagSuggestions"',
    );
    assert.include(
      previewImportBranch,
      'command === "clearStagedTagSuggestions"',
    );
    assert.include(
      previewImportBranch,
      'command === "updateTagVocabularyEntry"',
    );
    assert.include(
      previewImportBranch,
      'command === "deleteTagVocabularyEntry"',
    );
    assert.include(previewImportBranch, 'return ["tags"]');
    assert.include(app, "synthesis-tags-import-preview-title");
    assert.include(app, "synthesis-action-merge-non-conflicting");
    assert.include(app, "synthesis-action-use-imported");
    assert.include(app, "renderTagsWorkbenchShell");
    assert.include(app, "renderTagsSummaryBar");
    assert.include(app, "renderTagsSummaryBar(snapshot, view)");
    assert.include(app, "renderVocabularySubview");
    assert.include(app, "renderStagedInboxSubview");
    assert.include(app, "renderTagBulkActionBar");
    assert.include(app, "renderTagPillList");
    assert.include(app, "renderTagFacetSelect");
    assert.include(app, "switchTagsSubview");
    assert.include(app, 'document.querySelector(".tags-view-switch")');
    assert.include(app, "currentVocabularyDraft");
    assert.include(app, "applyVocabularyDraft");
    assert.include(app, 'command: "updateTagVocabularyEntry"');
    assert.include(app, 'command: "deleteTagVocabularyEntry"');
    assert.include(
      app,
      "actions.appendChild(renderRowExpandButton(snapshot, key))",
    );
    assert.notInclude(app, '"Actions",\n        "",');
    assert.include(app, "tags-summary-bar");
    assert.include(app, "tags-subview-tabs");
    assert.include(app, "tags-view-switch");
    assert.include(app, "segmented-thumb");
    assert.include(app, "tags-bulk-bar");
    assert.include(app, "staged-edit-state");
    assert.include(app, "synthesis-tags-tab-staged");
    assert.include(app, "synthesis-action-clear-staged");
    assert.include(app, "updateStagedTagSuggestion");
    assert.notInclude(app, "renderTagInspector");
    assert.notInclude(app, "Tag Inspector");
    assert.notInclude(
      extractFunctionBlock(app, "renderTagsSummaryBar"),
      "rebuildTagVocabularyIndex",
    );
    assert.notInclude(
      extractFunctionBlock(app, "renderTags"),
      "rebuildTagVocabularyIndex",
    );
    assert.include(css, ".tags-workbench");
    assert.include(css, ".tags-summary-bar");
    assert.include(css, ".tags-summary-primary");
    assert.include(css, ".tags-subview-tabs");
    assert.include(css, ".tags-subview-tabs .segmented-thumb");
    assert.include(css, ".tags-subview-tabs.is-staged .segmented-thumb");
    assert.include(css, "background: var(--topic-control-active-bg);");
    assert.include(css, "transform 180ms ease");
    assert.include(css, ".tags-vocabulary-table");
    assert.include(css, ".tags-staged-table");
    assert.include(css, ".tags-table .row-actions");
    assert.include(css, ".tag-pill-list");
    assert.include(css, ".tag-pill");
    assert.include(css, "flex-wrap: nowrap;");
    assert.match(
      css,
      /th\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?text-align:\s*center;/,
    );
    assert.match(
      css,
      /\.matrix-th\s*\{[\s\S]*?text-align:\s*center;[\s\S]*?position:\s*sticky;/,
    );
    assert.include(css, ".tags-table th");
    assert.include(css, "text-align: center;");
    assert.include(css, "position: sticky;");
    assert.include(css, ".tags-table-wrap");
    assert.include(css, ".tags-bulk-bar");
    assert.include(css, ".staged-edit-state");
  });

  it("refreshes the Graph surface after reference refresh and advanced matching commands", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const invalidationBlock = extractFunctionBlock(
      host,
      "surfacesInvalidatedByCommand",
    );
    const referenceBranch = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "refreshReferenceSidecarNow"'),
      invalidationBlock.indexOf(
        'command === "applyReferenceMatchProposalAction"',
      ),
    );

    assert.include(referenceBranch, 'command === "refreshReferenceSidecarNow"');
    assert.include(
      referenceBranch,
      'command === "retryReferenceSidecarRefresh"',
    );
    assert.include(
      referenceBranch,
      'command === "runAdvancedReferenceMatchingNow"',
    );
    assert.include(
      referenceBranch,
      'command === "retryAdvancedReferenceMatching"',
    );
    assert.include(referenceBranch, 'return ["index", "review", "graph"]');
  });

  it("refreshes topic synthesis and topic graph review surfaces after related commands", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const invalidationBlock = extractFunctionBlock(
      host,
      "surfacesInvalidatedByCommand",
    );
    const topicSynthesisBranch = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "runSynthesizeTopic"'),
      invalidationBlock.indexOf('command === "acceptTopicGraphRelation"'),
    );
    const topicGraphReviewBranch = invalidationBlock.slice(
      invalidationBlock.indexOf('command === "acceptTopicGraphRelation"'),
      invalidationBlock.indexOf('command === "deleteTopicArtifact"'),
    );

    assert.include(topicSynthesisBranch, 'command === "runSynthesizeTopic"');
    assert.include(
      topicSynthesisBranch,
      'command === "submitTopicSynthesisUpdate"',
    );
    assert.include(
      topicSynthesisBranch,
      'return ["home", "topics", "graph", "review"]',
    );
    assert.include(
      topicGraphReviewBranch,
      'command === "acceptTopicGraphRelation"',
    );
    assert.include(
      topicGraphReviewBranch,
      'command === "rejectTopicGraphRelation"',
    );
    assert.include(
      topicGraphReviewBranch,
      'command === "applyTopicGraphReviewAction"',
    );
    assert.include(
      topicGraphReviewBranch,
      'return ["home", "topics", "graph", "review"]',
    );
  });

  it("updates graph layout algorithm and selected element without recomputing layout", function () {
    const state = createDefaultSynthesisUiState();
    const next = applySynthesisUiAction(state, {
      action: "setGraphView",
      payload: {
        layoutAlgorithm: "radial",
        nodeKinds: ["library_paper", "external_reference"],
        showLowSignalReferences: true,
        role: "method",
        selectedElement: { kind: "node", id: "n1" },
        neighborhoodDepth: 2,
      },
    });

    assert.isTrue(next.handled);
    assert.equal(next.state.graph.layoutAlgorithm, "radial");
    assert.deepEqual(next.state.graph.selectedElement, {
      kind: "node",
      id: "n1",
    });
    assert.equal(next.state.graph.neighborhoodDepth, 2);
    assert.deepEqual(next.state.graph.nodeKinds, [
      "external_reference",
      "library_paper",
    ]);
    assert.equal(next.state.graph.showLowSignalReferences, true);
    assert.equal(next.state.graph.role, "method");
    assert.isUndefined(next.hostCommand);

    const legacyPreset = applySynthesisUiAction(state, {
      action: "setGraphView",
      payload: { layoutPreset: "expanded" },
    });

    assert.equal(legacyPreset.state.graph.layoutAlgorithm, "force");

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

  it("filters graph nodes by kind, low-signal external visibility, and role while search stays visual", function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setGraphView",
      payload: {
        nodeKinds: ["library_paper", "external_reference"],
        showLowSignalReferences: false,
      },
    }).state;
    const filteredState = applySynthesisUiAction(state, {
      action: "setFilters",
      payload: {
        graph: {
          role: "method",
          search: "X",
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
              external_reference: 2,
            },
            reference_stats: {
              dropped_empty: 0,
            },
          },
          nodes: [
            {
              id: "paper:a",
              label: "A",
              kind: "library_paper",
              metrics: { internal_in_degree: 3, internal_out_degree: 2 },
            },
            {
              id: "ref:external:x",
              label: "X",
              kind: "external_reference",
              metrics: { internal_in_degree: 1, internal_out_degree: 0 },
            },
            {
              id: "ref:raw:y",
              label: "Y",
              kind: "external_reference",
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
    assert.deepEqual(
      snapshot.graph.visibleNodes.find((node) => node.id === "paper:a")
        ?.metrics,
      { internal_in_degree: 3, internal_out_degree: 2 },
    );
    assert.equal(snapshot.graph.diagnostics.reference_stats.dropped_empty, 0);
  });

  it("filters citation graph to a selected topic's fixed one-hop subgraph", function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setGraphView",
      payload: {
        topicId: "topic-a",
        nodeKinds: ["library_paper", "external_reference"],
        showLowSignalReferences: true,
      },
    }).state;

    assert.equal(state.graph.topicId, "topic-a");

    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        graph: {
          graph_hash: "sha256:graph",
          topicScopes: [
            {
              topicId: "topic-a",
              title: "Topic A",
              paperRefs: ["1:A"],
              nodeIds: ["zotero:item:A"],
            },
          ],
          nodes: [
            { id: "zotero:item:A", label: "A", kind: "library_paper" },
            { id: "zotero:item:B", label: "B", kind: "library_paper" },
            { id: "ref:X", label: "X", kind: "external_reference" },
            { id: "ref:Y", label: "Y", kind: "external_reference" },
          ],
          edges: [
            { id: "e1", source: "zotero:item:A", target: "ref:X" },
            { id: "e2", source: "ref:Y", target: "zotero:item:A" },
            { id: "e3", source: "zotero:item:B", target: "ref:X" },
          ],
        },
      },
      state,
    );

    assert.deepEqual(
      snapshot.graph.visibleNodes.map((node) => node.id),
      ["zotero:item:A", "ref:X", "ref:Y"],
    );
    assert.deepEqual(
      snapshot.graph.visibleEdges.map((edge) => edge.id),
      ["e1", "e2"],
    );
    assert.equal(snapshot.graph.selectedTopicScope?.title, "Topic A");

    const allState = applySynthesisUiAction(state, {
      action: "setGraphView",
      payload: { topicId: "all" },
    }).state;
    assert.equal(allState.graph.topicId, "all");
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
      ["paper:a"],
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
        command: "openTopicArtifact",
        args: { topicId: "topic-a" },
      },
    });
    const oldFolderCommand = applySynthesisUiAction(state, {
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
      command: "openTopicArtifact",
      args: { topicId: "topic-a" },
    });
    assert.isFalse(oldFolderCommand.handled);
    assert.equal(oldFolderCommand.reason, "unknown_host_command");
    assert.isFalse(unknown.handled);
    assert.equal(unknown.reason, "unknown_action");
  });

  it("routes the Workbench rebuild graph host command", function () {
    const layoutResult = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "hostCommand",
        payload: {
          command: "manualRecomputeLayout",
          args: { reason: "user" },
        },
      },
    );
    const cacheResult = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "hostCommand",
        payload: {
          command: "rebuildCitationGraphCacheNow",
          args: { reason: "user" },
        },
      },
    );
    const incrementalResult = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "hostCommand",
        payload: {
          command: "refreshCitationGraphCacheIncrementalNow",
          args: { reason: "user" },
        },
      },
    );

    assert.isTrue(layoutResult.handled);
    assert.deepEqual(layoutResult.hostCommand, {
      command: "manualRecomputeLayout",
      args: { reason: "user" },
    });
    assert.isTrue(cacheResult.handled);
    assert.deepEqual(cacheResult.hostCommand, {
      command: "rebuildCitationGraphCacheNow",
      args: { reason: "user" },
    });
    assert.isTrue(incrementalResult.handled);
    assert.deepEqual(incrementalResult.hostCommand, {
      command: "refreshCitationGraphCacheIncrementalNow",
      args: { reason: "user" },
    });
  });

  it("wires graph layout recompute to the explicit layout operation", async function () {
    const tabSource = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const appSource = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");

    assert.include(tabSource, "recomputeCitationGraphLayout");
    assert.notInclude(tabSource, "runCitationGraphLayoutWorker");
    assert.include(tabSource, "refreshGraphLayoutIfNeeded");
    assert.include(tabSource, "return;\n  }\n  void sendActiveSurface");
    assert.include(appSource, "synthesis-action-rebuild-graph-cache");
    assert.include(appSource, 'command: "rebuildCitationGraphCacheNow"');
    assert.include(appSource, "synthesis-action-redraw-layout");
    assert.include(appSource, 'command: "manualRecomputeLayout"');
    assert.include(appSource, 'enumLabel("graph-layout", "force")');
    assert.include(appSource, 'enumLabel("graph-layout", "radial")');
    assert.include(appSource, 'enumLabel("graph-layout", "components")');
    assert.include(appSource, "layoutAlgorithm");
    assert.include(appSource, "graphCameraRestoreKey");
    assert.notInclude(appSource, '["compact", "balanced", "expanded"]');
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
    assert.include(source, "SYNTHESIS_WORKBENCH_TAB_ICON");
    assert.include(source, "icon: SYNTHESIS_WORKBENCH_TAB_ICON");
    assert.include(source, "createXULElement");
    assert.include(source, "__zoteroSkillsSynthesisWorkbenchBridge");
    assert.include(source, "scheduleWorkbenchHandshake");
    assert.include(
      source,
      "SYNTHESIS_WORKBENCH_HANDSHAKE_REQUIRED_SUCCESSES = 5",
    );
    assert.include(source, "finalizeWorkbenchHandshake");
    assert.include(
      source,
      'sendSnapshot(runtime, "synthesis:init", { refreshFromService: false })',
    );
    assert.include(source, "contentDocument");
    assert.include(source, "Zotero_Tabs.select");
    assert.include(source, "cleanupSynthesisWorkbenchTab");
    assert.notInclude(source, "new ztoolkit.Dialog");
    assert.notInclude(dialogCompat, "new ztoolkit.Dialog");
    assert.include(hooks, 'initialView: "synthesis"');
    assert.notInclude(hooks, "openSynthesisWorkbenchTab");
    assert.notInclude(sidebar, "openSynthesisWorkbenchTab");
  });

  it("opens structured Topic Detail inside the Workbench and exports report body from the Report tab", async function () {
    const source = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");

    assert.include(source, 'command === "openTopicArtifact"');
    assert.include(source, 'command === "exportTopicSynthesisReport"');
    assert.include(source, 'command === "exportTopicDetailHtml"');
    assert.include(source, 'command === "openZoteroItem"');
    assert.notInclude(source, 'command === "openCanonicalMarkdown"');
    assert.notInclude(source, 'command === "copyTopicMarkdownExport"');
    assert.include(source, 'command === "resolveTopicPaperDigest"');
    assert.notInclude(source, 'command === "openSynthesisFolder"');
    assert.include(source, 'command === "deleteTopicArtifact"');
    assert.include(source, 'command === "purgeDeletedTopicArtifacts"');
    assert.include(source, "confirmWorkbenchAction");
    assert.include(source, "readTopicDetail");
    assert.include(source, "getTopicReport");
    assert.include(source, "buildTopicDetailHtmlExport");
    assert.include(source, "ensureCachedTopicDetailHtmlExport");
    assert.include(source, "topicDetailHtmlExportSignature");
    assert.include(source, "TOPIC_DETAIL_HTML_EXPORT_RENDERER_VERSION");
    assert.include(source, "currentTopicDetailHtml");
    assert.include(source, "currentTopicDetailHtmlMetadata");
    assert.include(source, "resolveTopicExportDigests");
    assert.include(source, "readSynthesisExportAssets");
    assert.include(source, "pruneGraphToTopicSubgraph");
    assert.include(source, "graphLayoutAlgorithms");
    assert.include(source, "graphLayouts");
    assert.include(source, "content/shared/icons.css");
    assert.include(source, "inlineMaterialSymbolIconUrls");
    assert.include(source, "data:image/svg+xml");
    assert.include(source, "content/synthesis/app.bundle.js");
    assert.include(source, "content/synthesis/styles.css");
    assert.include(source, "resolveRuntimeToolkit");
    assert.include(source, "FilePicker");
    assert.include(source, "copyRuntimeFile");
    assert.include(source, "writeRuntimeTextFile");
    assert.include(source, "sendTopicDetail");
    assert.include(source, '"synthesis:topic-detail"');
    assert.include(source, "citationGraphItemKeyFromNodeId");
    assert.include(source, "openZoteroItemFromCitationGraphNode");
    assert.include(source, "getByLibraryAndKey");
    assert.include(source, "selectItem(itemId)");
    assert.notInclude(source, '"synthesis:artifact"');
    assert.notInclude(
      source,
      "openPathInSystem(artifact.paths.currentMarkdown",
    );
    assert.include(app, "renderTopicDetailShell");
    assert.include(app, "renderTopicDetail");
    assert.include(app, "renderArtifactReader");
    assert.include(app, 'command: "openTopicArtifact"');
    assert.include(app, 'command: "submitTopicSynthesisUpdate"');
    assert.include(app, 'command: "exportTopicSynthesisReport"');
    assert.include(app, 'command: "exportTopicDetailHtml"');
    assert.include(app, 'command: "openZoteroItem"');
    assert.include(app, "libraryId: snapshot.libraryId");
    assert.include(app, 'if (node?.kind === "library_paper")');
    assert.include(app, "if (!state.standaloneExport)");
    assert.include(app, "synthesis-action-open-zotero-item");
    assert.include(app, "synthesis-action-export-topic-html");
    assert.notInclude(app, "synthesis-action-copy-summary");
    assert.notInclude(app, "navigator.clipboard?.writeText(summary)");
    assert.include(app, "__zoteroSkillsSynthesisTopicExport");
    assert.include(app, "applyStandaloneTopicExportEnvelope");
    assert.include(app, "renderStandaloneTopicExportShell");
    assert.include(app, "state.standaloneExport");
    assert.include(app, "standaloneDigestForEvidence");
    assert.include(app, "state.standaloneDigestsByKey");
    assert.include(app, "state.standaloneGraphLayouts");
    assert.include(app, "normalizeStandaloneGraphSnapshot");
    assert.include(app, 'layoutStatus: "ready"');
    assert.include(app, 'cache_status: "ready"');
    assert.include(app, "renderStandaloneGraphControls");
    assert.include(app, "synthesis-topic-tab-citation-graph");
    assert.include(app, "renderGraphControls(snapshot)");
    assert.include(app, "synthesis-action-open-citation-subgraph");
    assert.include(app, '"openTopicCitationSubgraph"');
    assert.include(app, "synthesis-action-back-to-topic-details");
    assert.include(app, "topic-report-header");
    assert.include(app, "topic-report-actions");
    assert.include(
      app,
      "enhanceReportLiteratureDigestLinks(reportBody, detail)",
    );
    assert.include(app, "topic-report-digest-link");
    assert.include(app, "openDigestModal(evidence)");
    assert.include(app, "synthesis-action-copied");
    assert.include(app, "synthesis-action-copy-failed");
    assert.notInclude(app, "downloadMarkdownFile");
    assert.notInclude(app, "safeMarkdownFileName");
    assert.notInclude(app, "createObjectURL");
    assert.notInclude(app, "Markdown export");
    assert.notInclude(app, 'command: "openSynthesisFolder"');
    assert.notInclude(app, 'command: "openCanonicalMarkdown"');
    assert.include(app, "Delete");
    assert.include(app, "Purge Deleted");
    assert.include(app, "deletedArtifacts.count");
    assert.include(app, "synthesis-action-back-to-topics");
    assert.include(
      app,
      'makeButton(t("synthesis-action-back-to-topics"), "selectTab"',
    );
    assert.include(app, "synthesis-action-copy");
    assert.include(app, "synthesis-action-export");
    assert.include(app, "topicDiscoveryBadge");
    assert.include(app, 't("synthesis-column-discovery")');
    assert.include(app, '"synthesis-discovery-candidate"');
    assert.include(app, '"synthesis-discovery-candidates"');
    assert.include(app, "candidate_count");
    assert.include(app, "discovery_status");
    assert.include(app, 'candidateCount < 5 ? "orange" : "danger"');
    assert.include(app, 'badge(t("synthesis-discovery-none"), "ok")');
    assert.include(css, ".topic-discovery-badge");
    assert.include(css, "white-space: nowrap");
    assert.include(css, ".topic-report-header");
    assert.include(css, ".topic-report-digest-link");
    assert.include(css, ".synthesis-root.standalone-topic-export-root");
    assert.include(css, ".standalone-topic-export-content");
    assert.include(css, ".topic-citation-graph-section");
    assert.include(css, ".topic-graph-reading-surface");
    assert.include(css, ".graph-control-group");
    assert.include(css, ".graph-control-group-label");
    assert.include(css, "justify-content: space-between");
    assert.match(css, /\.topic-report-actions\s*{[\s\S]*gap:\s*8px;/);

    const standaloneShellBlock = extractFunctionBlock(
      app,
      "renderStandaloneTopicExportShell",
    );
    assert.include(standaloneShellBlock, "renderTopicDetail(main, snapshot)");
    assert.notInclude(standaloneShellBlock, "renderTopicDetailToolbar");
    assert.notInclude(standaloneShellBlock, "renderActionStatusbar");
    assert.notInclude(standaloneShellBlock, "renderCurrentView");

    const selectedTabShellBlock = extractFunctionBlock(
      app,
      "renderSelectedTabShell",
    );
    assert.include(selectedTabShellBlock, "captureWorkbenchRenderState(root)");
    assert.include(
      selectedTabShellBlock,
      "restoreWorkbenchRenderState(root, renderState)",
    );
    const graphCameraRestoreKeyBlock = extractFunctionBlock(
      app,
      "graphCameraRestoreKey",
    );
    assert.include(graphCameraRestoreKeyBlock, "state.standaloneExport");
    assert.include(graphCameraRestoreKeyBlock, "citation_graph");

    const topicTabsBlock = extractFunctionBlock(app, "renderTopicTabs");
    assert.include(topicTabsBlock, "state.standaloneExport");
    assert.include(
      topicTabsBlock,
      '["citation_graph", "synthesis-topic-tab-citation-graph"]',
    );

    const graphBlock = extractFunctionBlock(app, "renderGraph");
    assert.include(graphBlock, "renderStandaloneGraphControls(snapshot)");
    assert.include(graphBlock, "!state.standaloneExport");
    assert.include(graphBlock, "synthesis-action-back-to-topic-details");

    const standaloneGraphControlsBlock = extractFunctionBlock(
      app,
      "renderStandaloneGraphControls",
    );
    assert.include(standaloneGraphControlsBlock, '["force", enumLabel');
    assert.include(standaloneGraphControlsBlock, '["radial", enumLabel');
    assert.include(standaloneGraphControlsBlock, '["components", enumLabel');
    assert.include(standaloneGraphControlsBlock, "showLowSignalReferences");
    assert.include(
      standaloneGraphControlsBlock,
      "synthesis-graph-control-citation-role",
    );
    assert.include(
      standaloneGraphControlsBlock,
      "synthesis-graph-control-node-types",
    );
    assert.include(
      standaloneGraphControlsBlock,
      "synthesis-graph-control-layout",
    );
    assert.notInclude(standaloneGraphControlsBlock, "synthesis-search-node");
    assert.notInclude(standaloneGraphControlsBlock, "graphTopicScopeOptions");
    assert.notInclude(
      standaloneGraphControlsBlock,
      "makeGraphIncrementalRefreshButton",
    );
    assert.notInclude(standaloneGraphControlsBlock, "manualRecomputeLayout");
    assert.notInclude(
      standaloneGraphControlsBlock,
      "synthesis-action-back-to-topic-details",
    );

    const exportTopicHtmlBlock = extractFunctionBlock(
      source,
      "exportTopicDetailHtml",
    );
    assert.include(exportTopicHtmlBlock, "ensureCachedTopicDetailHtmlExport");
    assert.include(exportTopicHtmlBlock, "copyRuntimeFile");
    assert.notInclude(
      exportTopicHtmlBlock,
      "const html = await buildTopicDetailHtmlExport",
    );

    const exportPickerIndex = source.indexOf(
      "const outputPath = await pickTopicDetailHtmlExportPath",
    );
    const exportRunIndex = source.indexOf(
      'runWorkbenchCommandOnce(\n        runtime,\n        "exportTopicDetailHtml"',
    );
    assert.isAtLeast(exportPickerIndex, 0);
    assert.isAtLeast(exportRunIndex, 0);
    assert.isBelow(
      exportPickerIndex,
      exportRunIndex,
      "standalone HTML export should ask for the save path before entering the pending operation",
    );
    assert.include(
      source,
      "() => exportTopicDetailHtml(runtime, topicId, outputPath)",
    );
    assert.notInclude(source, "{ topicId, outputPath }");
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
    assert.include(source, "renderSyncPanel");
    assert.include(source, "renderSyncFeedbackLog");
    assert.include(source, "sync-feedback-terminal");
    assert.include(source, "synthesis-home-sync");
    assert.include(source, "synthesis-home-review-items");
    assert.include(source, "synthesis-action-webdav-sync-now");
    assert.notInclude(source, "renderGitSyncPanel");
    assert.notInclude(extractFunctionBlock(source, "renderHome"), '"Sync",');
    assert.notInclude(
      extractFunctionBlock(source, "renderSyncPanel"),
      "syncNow",
    );
    assert.notInclude(
      extractFunctionBlock(source, "renderSyncPanel"),
      "renderInsightCard",
    );
    assert.notInclude(
      extractFunctionBlock(source, "renderSyncPanel"),
      "resolveGitSyncConflict",
    );
    assert.include(
      extractFunctionBlock(source, "renderSyncPanel"),
      "syncWebDavNow",
    );
    assert.notInclude(
      extractFunctionBlock(source, "renderSyncPanel"),
      "Review items",
    );
    assert.notInclude(
      extractFunctionBlock(source, "renderSyncPanel"),
      "Last run",
    );
    assert.include(source, "sync-summary");
    assert.include(source, "synthesis-sync-review");
    assert.include(source, "paper_count");
    assert.include(source, "source_materials_percent");
    assert.include(source, "sourceMaterialsLabel");
    assert.include(source, "sourceMaterialsTone");
    assert.include(source, "synthesis-column-source-materials");
    assert.notInclude(source, "toneFor(topicSourceMaterialsStatus(row))");
    assert.notInclude(
      source,
      '"Completion", className: "topics-list-center-cell"',
    );
    assert.notInclude(
      source,
      '"Coverage", className: "topics-list-center-cell"',
    );
    assert.include(source, "row.definition");
    assert.notInclude(source, "row.description");
    assert.include(source, '"Definition"');
    assert.include(source, "topics-list-definition-cell");
    assert.include(source, "topics-list-title-cell");
    assert.include(source, "topics-list-title-text");
    assert.notInclude(
      extractFunctionBlock(source, "renderTopics"),
      "titleWithSummary(",
    );
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
    assert.include(css, ".topics-list-definition-cell");
    assert.include(css, ".topics-list-title-cell");
    assert.include(css, ".topics-list-definition-column");
    assert.match(
      css,
      /\.topics-list-definition-cell\s*{[\s\S]*?max-width:\s*none;[\s\S]*?overflow:\s*visible;[\s\S]*?white-space:\s*normal;/,
    );
    assert.include(css, ".panel-toolbar");
    assert.include(css, ".sync-summary");
    assert.include(css, ".sync-feedback-terminal");
    assert.include(css, "--sync-terminal-bg");
    assert.include(css, ':root[data-zs-theme="dark"]');
    assert.include(css, ".sync-log-line");
    assert.include(css, ".immersive-reader");
    assert.include(css, ":focus-visible");
    assert.include(css, "@media (prefers-reduced-motion: reduce)");
  });

  it("hides Git Sync from Preferences while keeping WebDAV preferences visible", async function () {
    const preferences = await fs.readFile(
      "addon/content/preferences.xhtml",
      "utf8",
    );
    const script = await fs.readFile("src/modules/preferenceScript.ts", "utf8");

    assert.notInclude(preferences, "git-sync-enabled");
    assert.notInclude(preferences, "git-sync-token");
    assert.notInclude(preferences, "pref-section-git-sync");
    assert.notInclude(script, "git-sync-enabled");
    assert.notInclude(script, "saveGitSyncPrefs");
    assert.notInclude(script, "testGitSyncConfiguration");
    assert.include(preferences, "webdav-sync-enabled");
    assert.include(script, "saveWebDavSyncPrefs");
    assert.include(script, "testWebDavSyncConfiguration");
  });

  it("renders structured Topic Detail with design-token timeline and evidence interactions", async function () {
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");
    const timelineSource = await fs.readFile(
      "src/shared/topicTimelineRenderer.ts",
      "utf8",
    );
    const timelineCss = await fs.readFile(
      "addon/content/shared/topicTimeline.css",
      "utf8",
    );
    const mockupApp = await fs.readFile("mockup/app.js", "utf8");
    const mockupCss = await fs.readFile("mockup/styles.css", "utf8");

    assert.include(source, "renderTopicDetailShell");
    assert.include(source, "renderTopicDetail");
    assert.include(source, "renderTopicTabs");
    assert.include(source, '["taxonomy", "synthesis-topic-tab-taxonomy"]');
    assert.include(source, '["compare", "synthesis-topic-tab-compare"]');
    assert.include(
      source,
      '["future_directions", "synthesis-topic-tab-future-directions"]',
    );
    assert.include(source, "renderTopicOverviewSection");
    assert.include(source, "renderTopicTaxonomySection");
    assert.include(source, "taxonomy-axis-header");
    assert.include(source, "taxonomy-axis-index");
    assert.include(source, "taxonomy-axis-body");
    assert.include(source, "TAXONOMY_AXIS_TONE_CLASSES");
    assert.include(source, "renderTopicClaimsSection");
    assert.include(source, "renderTopicCompareSection");
    assert.include(source, "renderTopicExternalCoverageSection");
    assert.include(source, "renderTopicCoverageSection");
    assert.include(source, "renderCoverageStatistics");
    assert.include(source, "summary?.key_takeaways");
    assert.include(source, "renderTopicFutureDirectionsSection");
    assert.include(source, "current_limitation");
    assert.include(source, "future_direction");
    assert.include(source, "current_judgment");
    assert.include(source, "renderReviewOutlineGroups");
    assert.include(source, "synthesis-review-blueprint");
    assert.include(source, "writing_strategies");
    assert.include(source, "recommended_strategy_id");
    assert.include(source, "topic_importance");
    assert.include(source, "section_plan");
    assert.notInclude(source, "normalizeReviewOutlineGroups");
    assert.notInclude(source, "detail.positioning");
    assert.include(source, "external_context_summary");
    assert.notInclude(source, "coverage.external_literature");
    assert.notInclude(source, "representative_references");
    assert.include(source, "renderMergedCollectionDirections");
    assert.include(source, "const summaryBlocks = [");
    assert.include(source, "textValue(detail.topic?.definition)");
    assert.include(source, "textValue(detail.summary?.summary)");
    assert.notInclude(
      source,
      "detail.summary?.text || detail.summary?.brief || detail.summary?.summary",
    );
    assert.include(source, "renderTopicReportSection");
    assert.include(source, "stripDuplicateReportHeadings(body, title)");
    assert.notInclude(source, 'renderContentCard("Report Body"');
    assert.notInclude(source, "Source Chapters");
    assert.include(source, "renderTopicDetailToolbar");
    assert.include(source, "renderSelectedEvidenceCard");
    assert.include(source, "renderSharedTopicTimeline");
    assert.notInclude(source, "renderTimelineClusters");
    assert.include(source, "comparisonRows");
    assert.include(source, "renderMethodComparisonCard");
    assert.notInclude(source, "renderEvidenceMapSummary");
    assert.include(source, "source_papers");
    assert.include(source, "source_paper_refs");
    assert.include(source, "renderEmptyStructuredState");
    assert.include(source, "renderEvidenceExplorer");
    assert.include(source, "renderEvidenceDrawer");
    assert.include(source, "renderTopicTimeline");
    assert.include(source, "timelineItems");
    assert.include(timelineSource, "timelineLayoutFromItems");
    assert.include(timelineSource, "TIMELINE_BASE_WIDTH_PX = 1080");
    assert.include(timelineSource, "TIMELINE_YEAR_MIN_WIDTH_PX = 80");
    assert.include(timelineSource, "TIMELINE_MARKER_MIN_WIDTH_PX = 34");
    assert.include(timelineSource, "timelineYearCounts");
    assert.include(timelineSource, "timelinePaperLeft");
    assert.include(timelineSource, "itemIndex + 1");
    assert.include(timelineSource, "count + 1");
    assert.include(source, "timelineEventGroups");
    assert.include(source, "timelineEventDescription");
    assert.include(source, '"description"');
    assert.include(timelineSource, "renderTimelineEventPopover");
    assert.include(timelineSource, "showTimelineTooltip");
    assert.include(timelineSource, "hideTopicTimelineTooltip");
    assert.include(timelineSource, "overlayRoot.appendChild(popover)");
    assert.include(
      timelineSource,
      'sortedItems.filter((item) => item.kind === "paper")',
    );
    assert.include(
      timelineSource,
      'sortedItems.filter((item) => item.kind === "event")',
    );
    assert.include(timelineSource, "left: interval.end");
    assert.include(
      timelineSource,
      "const layout = timelineLayoutFromItems(paperItems)",
    );
    assert.notInclude(
      source,
      "timelineLayoutFromItems([...paperItems, ...milestoneItems])",
    );
    assert.include(timelineSource, "denseTimelineMarkerKeys");
    assert.include(
      timelineSource,
      "timeline.style.width = `${layout.widthPx}px`",
    );
    assert.include(timelineSource, 'markerClasses.push("near-left")');
    assert.include(timelineSource, 'markerClasses.push("near-right")');
    assert.include(source, '"paper_year"');
    assert.include(source, '"bibliographic"');
    assert.include(source, "return papers");
    assert.include(source, 'kind: "paper" as const');
    assert.include(source, "evidenceRefKeyVariants");
    assert.include(source, "normalizeEvidenceRefKey");
    assert.notInclude(source, "id.endsWith(key) || key.endsWith(id)");
    assert.include(source, "eventYear(event)");
    assert.include(source, "key: `event:${year}`");
    assert.notInclude(source, "usedEvents");
    assert.notInclude(source, "matchedEvent");
    assert.notInclude(source, "`Phase ${index + 1}`");
    assert.include(source, "renderDigestModal");
    assert.include(source, "openDigestModal");
    assert.include(source, "syncDigestModal");
    const openDigestBlock = extractFunctionBlock(source, "openDigestModal");
    assert.include(openDigestBlock, "syncDigestModal();");
    assert.notInclude(openDigestBlock, "render();");
    assert.include(source, "buildDigestOutline");
    assert.include(source, "renderDigestRepresentativeImage");
    assert.include(source, "include_representative_image: true");
    assert.include(source, "representative_image");
    assert.include(source, "synthesis-evidence-explorer");
    assert.include(source, "synthesis-external-literature-context");
    assert.include(source, "synthesis-suggested-collection-directions");
    assert.include(source, "synthesis-coverage-caveats");
    assert.include(source, "renderTopicScopeBoundary");
    assert.include(source, "synthesis-topic-research-area");
    assert.include(source, "synthesis-scope-include");
    assert.include(source, "synthesis-scope-exclude");
    assert.notInclude(source, "synthesis-scope-notes");
    assert.include(source, 'enumLabel("coverage-caveat"');
    assert.include(source, "coverageCaveatTitle");
    assert.include(source, "priorityTone");
    assert.include(source, "priorityFormatter: priorityLabel");
    assert.include(source, 'normalized === "high" || normalized === "urgent"');
    assert.notInclude(source, "Identified Gaps");
    assert.include(source, 'bodyKeys: ["note", "reason", "description"');
    assert.include(source, "formatTimeSpan");
    assert.notInclude(source, '["external", "External"]');
    assert.notInclude(source, '["statistics", "Stats"]');
    assert.include(source, 'command: "resolveTopicPaperDigest"');
    const digestMessageBlock = extractIfBlock(
      source,
      'data.type === "synthesis:digest"',
    );
    assert.include(digestMessageBlock, "syncDigestModal();");
    assert.notInclude(digestMessageBlock, "render();");
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
    assert.include(timelineCss, ".timeline-tone-foundation");
    assert.include(
      timelineCss,
      ".timeline-event.timeline-tone-milestone:hover .timeline-pin",
    );
    assert.include(timelineCss, ".timeline-event:hover,");
    assert.include(timelineCss, ".timeline-hover-popover");
    assert.include(timelineCss, "position: fixed;");
    assert.include(timelineCss, "height: 68px;");
    assert.include(timelineCss, ".legend-icon-current");
    assert.include(timelineCss, "overflow-x: auto;");
    assert.include(timelineCss, "white-space: normal;");
    assert.include(timelineCss, ".time-axis span");
    assert.include(timelineCss, "white-space: nowrap;");
    assert.include(
      timelineCss,
      ".timeline-marker.near-left .timeline-event-label",
    );
    assert.include(
      timelineCss,
      ".timeline-marker.near-right .timeline-event-label",
    );
    assert.include(timelineCss, ".timeline-milestone-popover");
    assert.include(timelineCss, ".timeline-milestone-row");
    assert.include(css, ".metric-grid");
    assert.include(css, ".topic-detail-shell");
    assert.include(css, ".detail-shell-in-workbench");
    assert.include(css, ".topic-detail-layout");
    assert.include(css, ".taxonomy-axis-header");
    assert.include(css, ".taxonomy-axis-index");
    assert.include(css, ".taxonomy-axis-group .taxonomy-list-item");
    assert.include(css, ".taxonomy-axis-group.axis-tone-green");
    assert.include(css, ".taxonomy-axis-group.axis-tone-teal");
    assert.include(css, ".evidence-drawer");
    assert.include(css, ".evidence-drawer-panel");
    assert.include(css, ".explorer-empty");
    assert.include(css, ".selected-evidence-card");
    assert.include(timelineCss, ".horizontal-timeline");
    assert.include(timelineCss, ".time-axis");
    assert.include(timelineCss, ".timeline-phase");
    assert.include(timelineCss, ".marker-list");
    assert.include(css, ".topic-workspace");
    assert.include(css, ".topic-detail-tabs");
    assert.include(css, ".outline-group-grid");
    assert.include(css, ".outline-blueprint-card");
    assert.include(css, ".coverage-caveat-card");
    assert.include(css, ".coverage-direction-card");
    assert.include(css, ".coverage-direction-card > *");
    assert.include(css, ".coverage-direction-card strong");
    assert.include(css, ".coverage-priority-badge");
    assert.include(css, ".topic-detail-shell .badge.danger");
    assert.include(css, ".coverage-example-pill");
    assert.include(css, "height: 22px");
    assert.include(css, "white-space: normal");
    assert.include(css, "overflow-wrap: anywhere");
    assert.notInclude(css, ".coverage-examples .topic-badge");
    assert.notInclude(css, ".topic-provenance-aside");
    assert.include(css, ".evidence-explorer");
    assert.include(timelineCss, ".timeline-marker");
    assert.include(timelineCss, ".timeline-pin-body");
    assert.include(timelineCss, "clip-path: polygon");
    assert.include(css, ".paper-digest-modal");
    assert.include(css, ".paper-digest-body");
    assert.include(css, ".digest-outline");
    assert.include(css, ".digest-scroll-body");
    assert.include(css, ".digest-modal-intro");
    assert.include(css, ".digest-representative-image");
    assert.include(css, "--topic-hero-bg");
    assert.include(css, "background: var(--topic-hero-bg)");
    assert.notInclude(
      css,
      "background: linear-gradient(135deg, var(--topic-soft-blue), var(--topic-bg));",
    );
    assert.include(source, "synthesis-evidence-select-hint");
    assert.include(source, "state.selectedEvidenceId");
    assert.include(source, "state.evidenceExplorerOpen");
    assert.include(source, "openEvidenceExplorer(evidenceId(paper.evidence))");
    assert.include(source, "openDigestModal(selected)");
    assert.include(source, "enhanceReportLiteratureDigestLinks");
    assert.include(source, "openDigestModal(evidence);");
    assert.include(source, "synthesis-evidence-selected");
    assert.include(source, 'firstText(direction, ["current_limitation"])');
    assert.include(source, 'firstText(direction, ["future_direction"])');
    assert.include(source, "firstText(debate");
    assert.include(source, '"debate"');
    assert.include(source, "firstText(event");
    assert.include(source, '"summary"');
    assert.include(source, "matrix.dimensions");
    assert.notInclude(source, "topicTimelineMarkers(detail)");
    assert.notInclude(source, "timeline.markers");
    assert.include(source, "artifact_provenance");
    assert.notInclude(source, "renderTopicProvenanceSection");
    assert.notInclude(source, "renderTopicProvenanceAside");
    assert.notInclude(source, '["provenance", "Provenance"]');
    assert.notInclude(source, 'aside.appendChild(el("h3", "", "Artifact"))');
    assert.include(source, "synthesis-improvement-dimensions");
    assert.include(source, "detail.improvement_dimensions");
    assert.include(source, "detail.comparison_matrix || {}");
    assert.notInclude(source, "Library-paper evidence markers");
    assert.notInclude(source, 'badge("resizable"');
    assert.include(source, '["registry", t("synthesis-tab-index"), "index"]');
    assert.notInclude(source, "renderTopicDetailRail");
    assert.notInclude(source, "topic-detail-rail");
    assert.notInclude(source, "rail-nav");
    assert.notInclude(source, "rows.forEach((evidence, index) =>");
    assert.notInclude(css, ".topic-detail-rail");
    assert.notInclude(css, ".rail-nav");
    assert.notInclude(source, "renderExplorerSplitter");
    assert.notInclude(css, ".splitter");
    assert.notInclude(css, "resize: horizontal");
    assert.notInclude(timelineCss, ".timeline-track");
    assert.include(timelineCss, "top: 28px");
    assert.include(timelineCss, "top: 40px");
    assert.notInclude(source, "reader-panel topic-detail-panel");
    assert.include(source, "sidebarExpanded: false");
    assert.include(source, "brand brand-icon-only");
    assert.include(source, "function iconEl(className: string)");
    assert.include(source, '["tags", t("synthesis-tab-tags"), "tags"]');
    assert.include(
      source,
      '["concepts", t("synthesis-tab-concepts"), "concepts"]',
    );
    assert.notInclude(source, "M12 4.5v2");
    assert.notInclude(source, "M8.8 6.1 7.4 4.7");
    assert.notInclude(source, "M15.2 6.1l1.4-1.4");
    assert.include(source, 'graph: "zs-icon-hub"');
    assert.include(source, 'home: "zs-icon-home"');
    assert.include(source, 'concepts: "zs-icon-lightbulb"');
    assert.include(source, 'tags: "zs-icon-sell"');
    assert.include(source, "nav-icon-${iconName}");
    assert.include(source, "zs-icon-right-panel-close");
    assert.include(source, "zs-icon-right-panel-open");
    assert.include(
      source,
      'state.sidebarExpanded\n        ? "zs-icon-right-panel-open"\n        : "zs-icon-right-panel-close"',
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
    assert.include(app, "synthesis-topic-paper-count");
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
    const hooks = await fs.readFile("src/hooks.ts", "utf8");
    const app = await fs.readFile("src/workspaceApp.ts", "utf8");
    const index = await fs.readFile(
      "addon/content/workspace/index.html",
      "utf8",
    );
    const css = await fs.readFile("addon/content/workspace/styles.css", "utf8");
    const zoteroPaneCss = await fs.readFile(
      "addon/content/zoteroPane.css",
      "utf8",
    );
    const dashboardApp = await fs.readFile(
      "addon/content/dashboard/app.js",
      "utf8",
    );
    const dashboardCss = await fs.readFile(
      "addon/content/dashboard/styles.css",
      "utf8",
    );
    const config = await fs.readFile("zotero-plugin.config.ts", "utf8");

    assert.include(host, "Zotero_Tabs.add");
    assert.include(host, 'type: "zotero-skills-workspace"');
    assert.include(host, "WORKSPACE_TAB_ICON");
    assert.include(host, "icon: WORKSPACE_TAB_ICON");
    assert.include(host, "WORKSPACE_TAB_ICON_URI");
    assert.include(host, "icon_workbench_32.png");
    assert.include(hooks, "registerZoteroPaneStylesheet");
    assert.include(hooks, "content/zoteroPane.css");
    assert.include(hooks, "loadAndRegisterSheet");
    assert.include(hooks, "unregisterZoteroPaneStylesheet");
    assert.include(host, "mountTaskDashboardRuntime");
    assert.include(host, "mountSynthesisWorkbenchRuntime");
    assert.include(host, "openAssistantWorkspaceSidebar");
    assert.include(host, "closeAssistantWorkspaceSidebar");
    assert.include(host, "toggleAssistantWorkspaceSidebar");
    assert.include(host, 'action === "toggle-sidebar"');
    assert.include(host, "syncWorkspaceTabSelectionState");
    assert.include(host, "scheduleWorkspaceTabSelectionStateSync");
    assert.include(host, "WORKSPACE_TAB_SELECTION_RESTORE_DELAY_MS");
    assert.include(host, "shouldRestoreSidebar");
    assert.include(host, 'target: "reader"');
    assert.include(host, "onSelect");
    assert.include(host, "isAssistantWorkspaceSidebarOpen");
    assert.include(host, "sidebarOpen");
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
    assert.include(app, "zs-icon-refresh");
    assert.include(app, "sidebar-toggle");
    assert.include(app, "zs-icon-right-panel-open");
    assert.include(app, "zs-icon-right-panel-close");
    assert.include(app, "workspace:attention");
    assert.include(app, "updateWorkspaceSidebarAttention");
    assert.include(app, "data-attention-count");
    const workspaceHeaderBlock = extractFunctionBlock(app, "renderHeader");
    assert.isBelow(
      workspaceHeaderBlock.indexOf("refresh-toggle"),
      workspaceHeaderBlock.indexOf("sidebar-toggle"),
    );
    assert.notInclude(app, 'button("Preferences", "open-preferences")');
    assert.notInclude(app, '"open-preferences"');
    assert.include(app, "sidebarOpen?: boolean");
    assert.include(app, "payload.sidebarOpen === true");
    assert.include(app, "openSidebar");
    assert.include(app, "closeSidebar");
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
    assert.include(zoteroPaneCss, ".icon-css.icon-zotero-skills-workspace");
    assert.include(
      zoteroPaneCss,
      '.icon-css.icon-item-type[data-item-type="zotero-skills-workspace"]',
    );
    assert.include(
      zoteroPaneCss,
      '.tab-icon.icon-item-type[data-item-type="zotero-skills-workspace"]',
    );
    assert.include(zoteroPaneCss, "icons/icon_workbench_32.png");
    assert.include(zoteroPaneCss, "display: inline-block");
    assert.include(zoteroPaneCss, "min-width: 16px");
    assert.include(zoteroPaneCss, "-moz-context-properties: unset");
    assert.include(zoteroPaneCss, "mask-image: none");
    assert.include(css, "transform: translateX(100%)");
    assert.include(css, "transition:");
    assert.include(index, "../shared/theme.js");
    assert.include(index, "../shared/theme.css?ui=20260520-controls-v7");
    assert.include(index, "../shared/icons.css?ui=20260614-icons-v1");
    assert.include(index, "./styles.css?ui=20260520-controls-v7");
    assert.include(css, ".toolbar .icon-button");
    assert.include(css, "appearance: none");
    assert.include(css, "-moz-appearance: none");
    assert.include(css, "--workspace-control-bg");
    assert.include(css, "--workspace-control-bg: #dbeafe");
    assert.include(dashboardApp, 'statusCell.className = "center-cell"');
    assert.include(dashboardApp, 'updatedCell.className = "center-cell"');
    assert.include(dashboardCss, "td.center-cell");
    assert.include(css, "background: var(--workspace-control-bg)");
    assert.include(css, "box-shadow: var(--workspace-control-shadow)");
    assert.include(css, ".toolbar-icon");
    assert.notInclude(css, ".refresh-icon::before");
    assert.notInclude(css, ".sidebar-icon::before");
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
    assert.include(host, "getSynthesisWorkbenchChromeInput");
    assert.include(host, "getSynthesisWorkbenchSurfaceInput");
    assert.include(host, "warmSynthesisWorkbenchSurfaces");
    const chromeBlock = extractFunctionBlock(host, "sendChrome");
    assert.include(chromeBlock, "getSynthesisWorkbenchChromeInput");
    assert.include(host, '"synthesis:chrome"');
    assert.include(host, '"synthesis:surface"');
    assert.notInclude(host, ".getSynthesisSnapshotInput(runtime.state)");
    assert.include(host, "prewarmedSynthesisSnapshotInput");
    assert.include(host, "loadedSurfaces");
    assert.include(host, "dirtySurfaces");
    assert.include(host, "surfaceNeedsServiceRefresh");
    assert.include(host, "refreshFromService: false");
    assert.include(host, "surfaceRequestSeq");
    assert.include(host, "latestSurfaceRequestBySurface");
    assert.include(host, "beginSurfaceRefreshRequest");
    assert.include(host, "isLatestSurfaceRefreshRequest");
    assert.include(host, "isTransientStorageBusyError");
    assert.notInclude(host, "SYNTHESIS_WORKBENCH_INITIAL_REFRESH_DELAY_MS");
    assert.include(host, 'envelope.action === "ready"');
    assert.include(host, 'envelope.action === "refresh"');
    assert.notInclude(host, 'messageType === "synthesis:init"');
    assert.include(hooks, "prewarmSynthesisWorkbenchAfterStartup();");
    assert.include(hooks, "prewarmSynthesisWorkbenchSurfaces");
    const actionBlock = extractFunctionBlock(host, "handleAction");
    [
      'envelope.action === "ready"',
      'envelope.action === "selectTab"',
      'envelope.action === "setFilters"',
    ].forEach((needle) => assert.include(actionBlock, needle));
    assert.notInclude(actionBlock, "getDebugSynthesisSnapshotInput");
    assert.notInclude(actionBlock, ".getSynthesisSnapshotInput");
    assert.include(actionBlock, "scheduleActiveSurfaceRefresh");
    const sendSurfaceBlock = extractFunctionBlock(host, "sendSurface");
    assert.include(sendSurfaceBlock, "requestId: request.requestId");
    assert.include(sendSurfaceBlock, "isLatestSurfaceRefreshRequest");
    assert.include(sendSurfaceBlock, "!isActiveSurface(runtime, surface)");
    assert.include(sendSurfaceBlock, '"synthesis:surface-error"');
    assert.include(sendSurfaceBlock, 'code: transient ? "storage_busy"');
    const scheduleSurfaceBlock = extractFunctionBlock(
      host,
      "scheduleActiveSurfaceRefresh",
    );
    assert.include(scheduleSurfaceBlock, "const scheduledSurface");
    assert.include(
      scheduleSurfaceBlock,
      "isActiveSurface(runtime, scheduledSurface)",
    );
    assert.notInclude(
      scheduleSurfaceBlock,
      "const surface = surfaceForTab(runtime.state.selectedTab)",
    );
    assert.include(actionBlock, "registryScopeChanged");
    assert.include(actionBlock, "registryExpandedChanged");
    assert.include(actionBlock, "expandedSourceRefs");
    const selectTabStart = actionBlock.indexOf(
      'if (envelope.action === "selectTab")',
    );
    const selectTabEnd = actionBlock.indexOf(
      'if (envelope.action === "setFilters")',
      selectTabStart,
    );
    assert.isAtLeast(selectTabStart, 0, "selectTab branch should exist");
    assert.isAbove(selectTabEnd, selectTabStart, "selectTab branch should end");
    const selectTabBlock = actionBlock.slice(selectTabStart, selectTabEnd);
    assert.notInclude(
      selectTabBlock,
      "refreshFromService: true",
      "selectTab must not force surface reload",
    );
    assert.include(actionBlock, "reviewsFilterChanged");
    const handshakeBlock = extractFunctionBlock(
      host,
      "finalizeWorkbenchHandshake",
    );
    assert.notInclude(
      handshakeBlock,
      'void sendSnapshot(runtime, "synthesis:snapshot");',
    );
    assert.notInclude(handshakeBlock, "refreshFromService: true");
    assert.include(
      hooks,
      "prewarmSynthesisWorkbenchSurfaces({ surfaces: [] })",
    );
  });

  it("localizes the Synthesis Workbench through a Host-injected message envelope", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const i18n = await fs.readFile("src/synthesisWorkbenchI18n.ts", "utf8");
    const governance = await fs.readFile(
      "scripts/check-localization-governance.ts",
      "utf8",
    );
    const html = await fs.readFile(
      "addon/content/synthesis/index.html",
      "utf8",
    );

    assert.include(i18n, "SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES");
    assert.include(i18n, "SynthesisWorkbenchMessageKey");
    assert.include(i18n, "formatSynthesisWorkbenchMessage");
    assert.include(host, "buildSynthesisWorkbenchI18nEnvelope");
    assert.include(host, "withSynthesisWorkbenchI18n(payload)");
    assert.include(host, "getStringOrFallback");
    assert.include(host, "SYNTHESIS_WORKBENCH_MESSAGE_KEYS");
    assert.include(app, "applyI18nEnvelope");
    assert.include(app, "stripI18nFromSnapshotPayload");
    assert.include(app, "localizeWorkbenchDom");
    assert.include(app, "synthesis-operation-${command}");
    assert.include(app, "function enumLabel(");
    assert.include(app, "humanizeEnumValue");
    assert.include(app, "filterOptionLabel");
    assert.include(app, 'enumLabel("graph-node-kind", kind)');
    assert.include(app, 'enumLabel("review-tab", "reference_matching")');
    assert.include(app, 'filterOptionLabel("synthesis-filter-binding"');
    assert.include(app, '"synthesis-topic-tab-overview"');
    assert.include(app, '"synthesis-topic-tab-citation-graph"');
    assert.include(app, 't("synthesis-graph-controls")');
    assert.include(app, 't("synthesis-column-actions")');
    assert.include(app, "html.lang = locale");
    assert.include(governance, "parseSynthesisWorkbenchMessageKeys");
    assert.include(governance, "reportSynthesisWorkbenchUiHardcodes");
    assert.include(governance, "[synthesis-i18n-key]");
    assert.include(i18n, "synthesis-enum-kind-canonical-merge");
    assert.include(i18n, "synthesis-enum-review-tab-reference-matching");
    assert.include(i18n, "synthesis-canonical-not-in-graph");
    assert.include(i18n, "synthesis-enum-graph-node-kind-library-paper");
    assert.include(i18n, "synthesis-enum-graph-node-kind-external-reference");
    assert.include(i18n, "synthesis-enum-graph-node-kind-low-signal-external");
    assert.include(i18n, "synthesis-enum-graph-edge-role-citation");
    assert.include(i18n, "synthesis-enum-graph-edge-role-unknown");
    assert.include(i18n, "synthesis-enum-graph-edge-role-historical");
    assert.include(
      i18n,
      "synthesis-enum-coverage-caveat-workset-subdomain-bias",
    );
    assert.include(
      i18n,
      "synthesis-enum-coverage-caveat-artifact-evidence-insufficient",
    );
    assert.include(
      i18n,
      "synthesis-enum-coverage-caveat-evaluation-scope-limitation",
    );
    assert.include(i18n, "synthesis-enum-priority-unknown");
    assert.include(i18n, "synthesis-enum-binding-status-stale-target");
    assert.include(i18n, "synthesis-enum-action-manual-target");
    assert.include(html, '<html lang="">');
  });

  it("invalidates Index surface cache on Zotero library item changes without sidecar refresh", async function () {
    const hooks = await fs.readFile("src/hooks.ts", "utf8");
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const observer = await fs.readFile(
      "src/modules/synthesis/itemObserver.ts",
      "utf8",
    );

    const notifyBlock = extractFunctionBlock(hooks, "onNotify");
    assert.include(notifyBlock, "isSynthesisLibraryReadModelInvalidationEvent");
    assert.include(notifyBlock, "notifySynthesisWorkbenchLibraryItemsChanged");
    assert.include(notifyBlock, "recordSynthesisZoteroItemNotifications");
    assert.notInclude(notifyBlock, "refreshReferenceSidecarNow");
    assert.notInclude(notifyBlock, "getSynthesisWorkbenchSurfaceInput");

    const invalidationBlock = extractFunctionBlock(
      host,
      "notifySynthesisWorkbenchLibraryItemsChanged",
    );
    assert.include(
      invalidationBlock,
      'invalidatedSurfaces: SynthesisWorkbenchSurfaceName[] = ["index"]',
    );
    assert.include(invalidationBlock, "markSurfaceDirty(runtime, surface)");
    assert.include(invalidationBlock, "scheduleLibraryReadModelSurfaceRefresh");
    assert.notInclude(invalidationBlock, "refreshReferenceSidecarNow");
    assert.notInclude(invalidationBlock, "synt_cache_basis");

    const scheduleBlock = extractFunctionBlock(
      host,
      "scheduleLibraryReadModelSurfaceRefresh",
    );
    assert.include(scheduleBlock, "globalThis.setTimeout");
    assert.include(scheduleBlock, "surfaceNeedsServiceRefresh");
    assert.include(scheduleBlock, "sendSurface(runtime, activeSurface");
    assert.include(
      host,
      "SYNTHESIS_WORKBENCH_LIBRARY_INVALIDATION_DEBOUNCE_MS",
    );
    assert.include(host, "synthesisWorkbenchRuntimes");
    assert.include(host, "synthesisWorkbenchRuntimes.delete(runtime)");

    const filterBlock = extractFunctionBlock(
      observer,
      "isSynthesisLibraryReadModelInvalidationEvent",
    );
    assert.include(filterBlock, 'cleanString(args.type) !== "item"');
    assert.include(filterBlock, "shouldInvalidateLibraryReadModel");
    assert.include(filterBlock, "isChildItemType");
    assert.notInclude(filterBlock, "getDefaultSynthesisService");
  });

  it("invalidates Index and Graph after workflow sidecar apply without marking Review dirty", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const workflowHostApi = await fs.readFile(
      "src/workflows/hostApi.ts",
      "utf8",
    );
    const invalidationEvents = await fs.readFile(
      "src/modules/synthesisWorkbenchInvalidation.ts",
      "utf8",
    );

    const invalidationBlock = extractFunctionBlock(
      host,
      "handleSynthesisWorkbenchSidecarChanged",
    );
    assert.include(invalidationBlock, '"index", "graph"');
    assert.notInclude(invalidationBlock, '"review"');
    assert.include(invalidationBlock, "markSurfaceDirty(runtime, surface)");
    assert.include(invalidationBlock, "scheduleLibraryReadModelSurfaceRefresh");
    assert.include(
      invalidationBlock,
      "sendChrome(runtime, { refreshFromService: true })",
    );
    assert.include(host, "registerSynthesisWorkbenchSidecarChangeListener");

    const hostApiBlock = extractFunctionBlock(
      workflowHostApi,
      "createWorkflowSynthesisHostApi",
    );
    assert.include(hostApiBlock, "applyLiteratureDigestSidecar");
    assert.include(hostApiBlock, "notifySynthesisWorkbenchSidecarChanged");
    assert.include(hostApiBlock, 'reason: "literature_digest_apply"');
    assert.include(hostApiBlock, "graphMayHaveChanged: true");
    assert.include(invalidationEvents, "sidecarChangeListeners");
    assert.include(invalidationEvents, '["index", "graph"]');
  });

  it("classifies Zotero item notifications for library read-model invalidation", function () {
    assert.isTrue(
      isSynthesisLibraryReadModelInvalidationEvent({
        event: "modify",
        type: "item",
        ids: [1],
        extraData: { "1": { itemType: "journalArticle" } },
      }),
    );
    assert.isTrue(
      isSynthesisLibraryReadModelInvalidationEvent({
        event: "delete",
        type: "item",
        ids: [2],
      }),
    );
    assert.isFalse(
      isSynthesisLibraryReadModelInvalidationEvent({
        event: "modify",
        type: "collection",
        ids: [1],
      }),
    );
    assert.isFalse(
      isSynthesisLibraryReadModelInvalidationEvent({
        event: "select",
        type: "item",
        ids: [1],
      }),
    );
    assert.isFalse(
      isSynthesisLibraryReadModelInvalidationEvent({
        event: "modify",
        type: "item",
        ids: [3, 4],
        extraData: {
          "3": { itemType: "note" },
          "4": { itemType: "attachment" },
        },
      }),
    );
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
    const uiModel = await fs.readFile(
      "src/modules/synthesis/uiModel.ts",
      "utf8",
    );
    const service = await fs.readFile(
      "src/modules/synthesis/service.ts",
      "utf8",
    );
    const repository = await fs.readFile(
      "src/modules/synthesis/repository.ts",
      "utf8",
    );
    const workbenchTab = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const graphVisualRules = await fs.readFile(
      "src/shared/citationGraphVisualRules.ts",
      "utf8",
    );
    const config = await fs.readFile("zotero-plugin.config.ts", "utf8");

    assert.include(index, "app.bundle.js");
    assert.include(source, 'from "sigma"');
    assert.include(source, "new Sigma");
    assert.include(source, "ResizeObserver");
    assert.include(source, "scheduleSigmaResize");
    assert.include(source, 'label: ""');
    assert.include(source, "function graphNodeSize");
    assert.include(source, "GRAPH_LIBRARY_BASE_NODE_SIZE");
    assert.include(graphVisualRules, "GRAPH_LIBRARY_BASE_NODE_SIZE = 4.6");
    assert.include(
      graphVisualRules,
      "GRAPH_SHARED_EXTERNAL_BASE_NODE_SIZE = 3",
    );
    assert.include(graphVisualRules, "GRAPH_LIBRARY_NODE_SIZE_CAP = 8");
    assert.include(graphVisualRules, "GRAPH_EXTERNAL_NODE_SIZE_CAP = 4.8");
    assert.include(source, "function buildGraphNodeImportance");
    assert.include(source, "function graphNodeIncomingDegree");
    assert.include(source, "function fallbackGraphIncomingDegrees");
    assert.include(source, "GRAPH_IMPORTANCE_HALO_TOP_RATIO");
    assert.include(source, "GRAPH_IMPORTANCE_HALO_MAX");
    assert.include(source, 'from "sigma/rendering"');
    assert.include(source, "function drawGraphImportanceHalo");
    assert.include(source, "function drawGraphNodeHover");
    assert.include(
      source,
      "if (data.importanceHalo && !data.importanceInteractive)",
    );
    assert.include(source, "drawDiscNodeHover");
    assert.include(source, "defaultDrawNodeHover: drawGraphNodeHover");
    assert.include(source, "function graphNodeImportanceColor");
    assert.include(source, "importanceInteractive");
    assert.include(source, "activeHaloNode");
    assert.include(source, "GRAPH_LIBRARY_IMPORTANCE_HALO_DARK");
    assert.include(source, "GRAPH_LIBRARY_IMPORTANCE_HALO_LIGHT");
    assert.include(source, "GRAPH_EXTERNAL_IMPORTANCE_HALO_DARK");
    assert.include(source, "GRAPH_EXTERNAL_IMPORTANCE_HALO_LIGHT");
    assert.include(source, "importanceHalo");
    assert.include(
      source,
      "highlighted: importance?.halo || currentPaperNode || false",
    );
    assert.include(source, "currentPaperNode");
    assert.include(source, "isCurrentPaperGraphNode");
    assert.include(source, "synthesis-graph-legend-current-paper");
    assert.include(source, "graph-selection-drawer-compact");
    assert.include(
      source,
      "currentPaperNode || (data.importanceHalo && searchMatch)",
    );
    assert.include(source, '"incoming citations"');
    assert.include(source, '"authors"');
    assert.include(source, "node?.authors?.length");
    assert.include(source, "if (!state.standaloneExport) {\n      fields.push");
    assert.include(source, "CITATION_GRAPH_EDGE_SIZE");
    assert.include(source, "CITATION_GRAPH_INCOMING_EDGE_COLOR");
    assert.include(source, "CITATION_GRAPH_OUTGOING_EDGE_COLOR");
    assert.include(source, "renderCitationGraphLegend");
    assert.include(source, "synthesis-graph-legend-node-size");
    assert.include(source, "synthesis-graph-legend-halo");
    assert.include(uiModel, "metrics?: {");
    assert.include(uiModel, "authors?: string[]");
    assert.include(uiModel, "authors: normalizeStringList(node.authors)");
    assert.include(repository, "authorsJson?: string");
    assert.include(repository, "authors_json TEXT NOT NULL DEFAULT '[]'");
    assert.include(repository, "authorsJson: cleanString(row.authors_json)");
    assert.include(repository, "authors_json: cleanString(record.authorsJson)");
    assert.include(service, "CITATION_GRAPH_CACHE_POLICY_VERSION");
    assert.include(service, "citation_graph_cache_policy_changed");
    assert.include(service, "authorsForSourceRef");
    assert.include(service, "authorsJson: JSON.stringify(authorsForSourceRef");
    assert.include(
      service,
      "authors: normalizeStringListInput(parseJsonArray(args.node.authorsJson))",
    );
    assert.include(service, "authors: normalizeStringListInput(node.authors)");
    assert.include(
      service,
      "authors: normalizeStringListInput(args.node.authors)",
    );
    assert.include(
      workbenchTab,
      "TOPIC_DETAIL_HTML_EXPORT_RENDERER_VERSION = 6",
    );
    assert.include(uiModel, "function normalizeGraphNodeMetrics");
    assert.include(uiModel, "internal_in_degree");
    assert.include(uiModel, "internal_out_degree");
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
    assert.include(
      source,
      "if (!state.standaloneGraphOnly) {\n        wrap.appendChild(renderSelectedNodeCitations",
    );
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
    assert.include(source, 'iconEl("zs-icon-tune")');
    assert.notInclude(source, 'iconSvg("controls")');
    assert.include(
      source,
      'detail.setAttribute("aria-label", t("synthesis-graph-controls"))',
    );
    assert.include(source, "detail.tabIndex = 0");
    assert.notInclude(source, "renderGraphSvg");
    assert.include(css, ".sigma-stage");
    assert.include(css, "height: 100%;");
    assert.include(css, ".citation-graph-legend-node");
    assert.include(css, ".citation-graph-legend-node.is-halo.is-library");
    assert.include(css, ".citation-graph-legend-node.is-halo.is-external");
    assert.include(css, "--citation-graph-library-halo:");
    assert.include(css, "--citation-graph-external-halo:");
    assert.include(css, ".graph-control-drawer");
    assert.include(css, ".graph-control-drawer:hover");
    assert.include(css, ".graph-control-drawer:focus-within");
    assert.include(css, ".graph-control-icon .zs-icon");
    assert.include(css, "display: block;");
    assert.include(css, ".graph-control-title");
    assert.include(css, "display: none;");
    assert.include(css, "width: 42px;");
    assert.include(css, "height: 42px;");
    assert.include(
      css,
      ".graph-control-drawer:not(:hover):not(:focus):not(:focus-within)",
    );
    assert.include(css, "grid-template-rows: 42px;");
    assert.include(css, "place-items: center;");
    assert.include(css, "position: absolute;");
    assert.include(css, "inset: 0;");
    assert.include(css, "position: static;");
    assert.include(css, "transform: translateY(-1px);");
    assert.include(
      css,
      ".graph-control-drawer:not(:hover):not(:focus):not(:focus-within) .details",
    );
    assert.include(css, "display: none;");
    assert.include(css, "overflow: hidden;");
    assert.include(css, "overflow: auto;");
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
    assert.include(index, "../shared/theme.css?ui=20260520-controls-v8");
    assert.include(index, "./styles.css?ui=20260617-taxonomy-axis-v2");
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
    assert.include(source, "html: true");
    assert.include(source, "texmath");
    assert.include(source, "sanitizeRenderedMarkdown");
    assert.include(source, "/^#[A-Za-z][\\w:.-]*$/.test(trimmedHref)");
    assert.include(source, "bindMarkdownLinks(body)");
    assert.include(source, "findMarkdownAnchorTarget(root, trimmedHref)");
    assert.include(source, "event.preventDefault()");
    assert.include(
      source,
      'scrollIntoView({ block: "start", inline: "nearest" })',
    );
    assert.include(source, 'anchor.removeAttribute("target")');
    assert.include(source, "renderMarkdownCircleShortcodes");
    assert.include(source, "replaceCircleShortcodesInTextNode");
    assert.include(source, "markdownCircleShortcodes");
    assert.include(source, 'red: "red"');
    assert.include(source, 'white: "white"');
    assert.include(
      source,
      'parent?.closest("code, pre, kbd, samp, script, style")',
    );
    assert.include(source, "loading-spinner");
    assert.include(source, "reader-body markdown-body");
    assert.include(css, ".reader-body");
    assert.include(css, "line-height: 1.45;");
    assert.include(css, ".markdown-body h4");
    assert.include(css, "font-size: 15px;");
    assert.include(css, ".topic-section > h2");
    assert.notInclude(css, ".topic-section h2,\n.topic-section h3");
    assert.include(css, ".topic-section .markdown-body h2");
    assert.include(css, "border-left: 3px solid var(--zs-accent);");
    assert.include(css, ".topic-section .markdown-body h3");
    assert.include(css, "font-size: 17px;");
    assert.include(css, ".markdown-body a[id]:not([href])");
    assert.include(css, "display: inline-block;");
    assert.include(css, "pointer-events: none;");
    assert.include(css, ".markdown-circle-icon");
    assert.include(css, ".markdown-circle-red");
    assert.include(css, ".markdown-circle-white");
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
          source_materials_status: "complete",
          source_materials_percent: 100,
          freshness: "stale",
          language: "zh-CN",
          stale_reasons: ["artifact_changed:digest-markdown"],
        },
        {
          id: "topic-incomplete",
          title: "Incomplete Topic",
          kind: "topic_synthesis",
          source_materials_status: "partial",
          source_materials_percent: 50,
          freshness: "fresh",
          language: "en-US",
          missing_sections: ["coverage"],
        },
        {
          id: "topic-dirty",
          title: "Dirty Topic",
          kind: "topic_synthesis",
          source_materials_status: "missing",
          source_materials_percent: 0,
          freshness: "dirty",
          language: "zh-CN",
          dirty_reasons: ["legacy_invalid"],
        },
        {
          id: "topic-queued",
          title: "Queued Topic",
          kind: "topic_synthesis",
          source_materials_status: "complete",
          source_materials_percent: 100,
          freshness: "queued",
          language: "zh-CN",
        },
        {
          id: "topic-failed",
          title: "Failed Topic",
          kind: "topic_synthesis",
          source_materials_status: "complete",
          source_materials_percent: 100,
          freshness: "failed",
          language: "zh-CN",
        },
        {
          id: "topic-discovery",
          title: "Discovery Topic",
          kind: "topic_synthesis",
          source_materials_status: "complete",
          source_materials_percent: 100,
          freshness: "fresh",
          language: "zh-CN",
          discovery_status: "candidates",
          candidate_count: 2,
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
      updateScope: "source_materials",
      actionLabel: "Update",
    });
    assert.deepInclude(intents["topic-dirty"], {
      topicId: "topic-dirty",
      updateMode: "update_full",
      actionLabel: "Update",
    });
    assert.deepInclude(intents["topic-queued"], {
      topicId: "topic-queued",
      updateScope: "maintenance",
      blocked: true,
    });
    assert.deepInclude(intents["topic-failed"], {
      topicId: "topic-failed",
      updateMode: "update_full",
      actionLabel: "Update",
    });
    assert.deepInclude(intents["topic-discovery"], {
      topicId: "topic-discovery",
      updateScope: "discovery",
      updateMode: "update_patch",
      updateReason: "discovery_candidates",
      actionLabel: "Update",
    });
    assert.notEqual(intents["topic-discovery"]?.blocked, true);

    const freshComplete = normalizeSynthesisUiSnapshot({
      libraryId: 1,
      artifacts: [
        {
          id: "topic-fresh",
          title: "Fresh Topic",
          kind: "topic_synthesis",
          source_materials_status: "complete",
          source_materials_percent: 100,
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
    assert.include(app, "synthesis-topic-graph-legend-related");
    assert.include(app, "synthesis-topic-graph-legend-overlap");
    assert.notInclude(app, '["related_to", "Related"]');
    assert.notInclude(app, '["overlaps_with", "Overlap"]');
    assert.include(css, ".topic-graph-canvas");
    assert.include(css, ".topic-graph-link");
    assert.include(css, "stroke-width: 1.35;");
    assert.include(css, "opacity: 0.9;");
    assert.include(css, ".topic-graph-link.status-suggested");
    assert.include(css, "opacity: 0.82;");
    assert.include(css, ".topic-graph-node");
    assert.include(css, ".topic-graph-legend");
  });

  it("renders topic graph relation proposals and decisions in Review Topic Graph tab", async function () {
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const reviewRowsBlock = extractFunctionBlock(app, "topicGraphReviewRows");
    const actionCellBlock = extractFunctionBlock(
      app,
      "topicGraphReviewActionCell",
    );
    const signatureBlock = extractFunctionBlock(app, "reviewContentSignature");

    assert.include(app, "const rows = topicGraphReviewRows(snapshot).filter");
    assert.include(reviewRowsBlock, "snapshot.topicGraph.edges");
    assert.include(reviewRowsBlock, 'textValue(edge.status) !== "deleted"');
    assert.include(reviewRowsBlock, "snapshot.topicGraph.reviewItems");
    assert.include(reviewRowsBlock, "topicGraphReviewStatusForEdge");
    assert.include(reviewRowsBlock, "topicGraphReviewStatusForItem");
    assert.include(actionCellBlock, 'textValue(row.status) !== "open"');
    assert.include(actionCellBlock, 'command: "acceptTopicGraphRelation"');
    assert.include(actionCellBlock, 'command: "rejectTopicGraphRelation"');
    assert.include(actionCellBlock, 'command: "applyTopicGraphReviewAction"');
    assert.include(app, 'label: "Relation"');
    assert.include(app, "humanizeReviewLabel(row.relation)");
    assert.include(app, 'label: "Confidence"');
    assert.include(app, 'label: "Evidence"');
    assert.include(app, "renderPillList(");
    assert.include(app, "row.evidence_refs || row.evidence || row.provenance");
    assert.notInclude(app, '["ID", (row) => row.review_id]');
    assert.include(signatureBlock, "snapshot.topicGraph.edges");
    assert.include(signatureBlock, "compactTopicGraphEdgeSignature");
  });

  it("exposes a Topic Details entry from the Topic Graph inspector", async function () {
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const inspectorBlock = extractFunctionBlock(app, "renderTopicInspector");

    assert.include(
      inspectorBlock,
      'textValue(topic.node_type) === "materialized"',
    );
    assert.include(inspectorBlock, 'makeButton("Open details", "hostCommand"');
    assert.include(inspectorBlock, 'command: "openTopicArtifact"');
    assert.include(
      inspectorBlock,
      "args: { topicId: textValue(topic.topic_id) }",
    );
    assert.include(inspectorBlock, '"definition"');
    assert.notInclude(
      inspectorBlock,
      'el("p", "muted", textValue(topic.topic_id))',
    );
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
              definition: "Child topic definition from topic.json",
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
    assert.equal(
      snapshot.topicGraph.inspector.topic?.definition,
      "Child topic definition from topic.json",
    );
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

  it("renders Concepts tab state with filters, selection state, display-text command, and overlay entries [inv.concepts.overlay_optional]", function () {
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
    assert.include(snapshot.hostCommands, "deleteConceptEntry");
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
    const overlayBlock = extractFunctionBlock(source, "applyConceptOverlay");
    const reportConceptNavBlock = extractFunctionBlock(
      source,
      "renderTopicReportConceptNav",
    );
    const reportSectionBlock = extractFunctionBlock(
      source,
      "renderTopicReportSection",
    );
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const service = await fs.readFile(
      "src/modules/synthesis/service.ts",
      "utf8",
    );
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");

    assert.include(source, "renderConcepts");
    assert.include(source, "renderConceptTable");
    assert.include(source, "conceptDefinitionSummary");
    assert.notInclude(source, "concept-row selected");
    assert.notInclude(source, "renderConceptInspector");
    assert.notInclude(source, "selectConceptRow");
    assert.include(source, "selectedConceptIds");
    assert.include(source, "renderConceptBulkActionBar");
    assert.include(source, "synthesis-action-delete-selected");
    assert.include(source, 'command: "deleteConceptEntry"');
    assert.include(host, "deleteConceptEntries");
    assert.include(service, "async function deleteConceptEntries");
    assert.include(source, "renderConceptReviewPanel");
    assert.include(source, "synthesis-concept-review-title");
    assert.include(source, "applyConceptReviewAction");
    assert.include(source, "reviewMergeTargets");
    assert.include(source, "renderReviewMetadata");
    assert.include(source, "conceptReviewPanel");
    assert.include(source, "renderConceptReviewDecisionSummary");
    assert.include(source, "renderConceptCandidatePills");
    assert.include(source, "concept-alias-pill");
    assert.include(source, "synthesis-review-target-label");
    assert.include(source, 't("synthesis-column-confidence")');
    assert.include(source, 't("synthesis-detail-topic-relevance")');
    assert.include(source, "conceptReviewActionCell");
    assert.include(source, "expandedConceptReviewMergeRows");
    assert.notInclude(source, "Concept Detail");
    assert.include(source, "applyConceptOverlay");
    assert.include(
      source,
      "applyConceptOverlay(renderTopicSection(detail, snapshot), snapshot)",
    );
    assert.include(host, 'getSynthesisWorkbenchSurfaceInput("concepts"');
    assert.include(source, "topicReportConceptEntries");
    assert.include(source, "renderTopicReportConceptNav");
    assert.include(source, "function elRawText");
    assert.include(source, "buildMarkdownOutline");
    assert.include(source, "buildReportOutline");
    assert.include(source, "topic-report-concept-nav");
    assert.include(source, "topic-report-workspace");
    assert.include(source, "topic-report-panel");
    assert.include(source, "topic-report-reader-frame");
    assert.include(source, "topic-report-scroll-body");
    assert.include(source, "topic-report-reading-surface");
    assert.include(source, "topic-report-outline");
    assert.include(source, "source_topic_ids");
    assert.include(source, "detail.topicId || snapshot?.reader?.topicId");
    assert.include(source, "renderTopicReportSection(detail, snapshot)");
    assert.include(source, "buildReportOutline(reportBody)");
    assert.include(source, 'heading.scrollIntoView({ block: "start" })');
    assert.include(reportSectionBlock, "workspace.appendChild(conceptNav)");
    assert.include(reportSectionBlock, "workspace.appendChild(reportPanel)");
    assert.include(reportSectionBlock, "reportPanel.appendChild(header)");
    assert.include(reportSectionBlock, "reportPanel.appendChild(readerFrame)");
    assert.include(
      reportSectionBlock,
      "readerFrame.appendChild(reportOutline)",
    );
    assert.notInclude(
      reportSectionBlock,
      "readerFrame.appendChild(conceptNav)",
    );
    assert.notInclude(reportSectionBlock, "sideNav.appendChild(reportOutline)");
    assert.notInclude(reportSectionBlock, "sideNav.appendChild(conceptNav)");
    assert.include(reportConceptNavBlock, '"mouseenter"');
    assert.include(reportConceptNavBlock, '"mouseleave"');
    assert.include(reportConceptNavBlock, '"focus"');
    assert.include(reportConceptNavBlock, '"blur"');
    assert.notInclude(reportConceptNavBlock, '"click"');
    assert.notInclude(reportConceptNavBlock, 'sendAction("selectConcept"');
    assert.notInclude(
      reportConceptNavBlock,
      "topic-report-concept-nav-summary",
    );
    assert.include(source, "concept-mention");
    assert.include(source, "concept-bubble");
    assert.include(source, '".topic-report-concept-nav"');
    assert.include(source, '".concept-mention"');
    assert.include(source, '".concept-bubble"');
    assert.include(overlayBlock, 'elRawText("span", "concept-mention", match)');
    assert.include(source, 'elRawText("strong", "", entry.label)');
    assert.include(source, "closeConceptBubble");
    assert.include(source, "scheduleConceptBubbleClose");
    assert.include(source, "cancelConceptBubbleClose");
    assert.include(overlayBlock, '"mouseenter"');
    assert.include(overlayBlock, '"mouseleave"');
    assert.include(overlayBlock, '"focus"');
    assert.include(overlayBlock, '"blur"');
    assert.notInclude(overlayBlock, 'sendAction("selectConcept"');
    assert.notInclude(overlayBlock, '"click"');
    assert.include(source, "Escape");
    assert.notInclude(source, "Open Concept");
    assert.include(source, "CONCEPT_OVERLAY_SKIP_SELECTOR");
    assert.include(source, ".topic-report-outline");
    assert.include(source, ".topic-report-concept-nav");
    assert.include(source, '"button"');
    assert.include(source, '"textarea"');
    assert.include(source, "deleteConceptEntry");
    assert.notInclude(css, ".topic-report-concept-nav-summary");
    assert.include(css, ".topic-report-workspace");
    assert.include(css, ".topic-report-panel");
    assert.include(css, ".topic-report-reading-surface");
    assert.include(css, ".topic-report-reader-frame");
    assert.include(css, ".topic-report-scroll-body");
    assert.include(css, ".topic-report-outline");
    assert.include(css, ".topic-report-outline-link");
    assert.include(css, ".topic-report-concept-nav");
    assert.include(css, "overflow-y: auto;");
    assert.include(css, "grid-template-columns: 180px minmax(0, 1fr);");
    assert.include(css, "grid-template-columns: 220px minmax(0, 1fr);");
    assert.include(css, "grid-template-rows: auto minmax(0, 1fr);");
    assert.include(css, "overflow: hidden;");
    assert.include(css, "color: var(--topic-muted);");
    assert.include(css, ".topic-report-reader-frame.no-outline");
  });

  it("shows reference sidecar cache status without exposing legacy cleanup host actions", async function () {
    const state = applySynthesisUiAction(createDefaultSynthesisUiState(), {
      action: "setFilters",
      payload: { registry: { artifactCoverage: "partial" } },
    }).state;
    const snapshot = buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        registry: {
          rows: [
            {
              paper_ref: "1:AAA",
              title: "Needs Review",
              artifactCoverage: "partial",
              missing_artifacts: ["references"],
            },
            {
              paper_ref: "1:BBB",
              title: "Ready",
              artifactCoverage: "complete",
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
          cacheStatus: {
            cache_key: "reference-sidecar:library",
            status: "failed",
            diagnostics: [
              {
                code: "reference_sidecar_refresh_failed",
                severity: "error",
                message: "temporary failure",
              },
            ],
            allowed_actions: [
              "retryReferenceSidecarRefresh",
              "refreshReferenceSidecarNow",
            ],
          },
        },
      },
      state,
    );

    assert.deepEqual(
      snapshot.registry.visibleRows.map((row) => row.paper_ref),
      ["1:AAA"],
    );
    assert.equal(
      snapshot.registry.cleanupProposals[0]?.proposal_id,
      "cleanup:1",
    );
    assert.equal(snapshot.registry.cacheStatus.status, "failed");
    assert.notInclude(snapshot.hostCommands, "applyLiteratureCleanupAction");
    assert.include(snapshot.hostCommands, "refreshReferenceSidecarNow");
    assert.include(snapshot.hostCommands, "retryReferenceSidecarRefresh");
    assert.include(
      snapshot.hostCommands,
      "refreshCitationGraphCacheIncrementalNow",
    );
    assert.include(snapshot.hostCommands, "rebuildCitationGraphCacheNow");
    assert.include(snapshot.hostCommands, "retryCitationGraphCacheRebuild");
    assert.isFalse(
      applySynthesisUiAction(state, {
        action: "hostCommand",
        payload: {
          command: "applyLiteratureCleanupAction",
          args: {
            proposalId: "cleanup:1",
            action: "ignore_reference_instance",
          },
        },
      }).handled,
    );
  });

  it("keeps Index default rows Zotero-bound and exposes referenced scope", function () {
    const input = {
      libraryId: 1,
      registry: {
        rows: [
          {
            paper_ref: "1:AAA",
            title: "Library Paper",
            artifactCoverage: "complete" as const,
            missing_artifacts: [],
            index_scope: "library" as const,
            reference_count: 1,
            references: [
              {
                reference_instance_id: "ref:1",
                reference_index: 0,
                title: "External Method",
                target_title: "External Method",
                target_binding: "external" as const,
                binding_status: "accepted" as const,
              },
            ],
          },
          {
            paper_ref: "lit:external",
            title: "External Method",
            artifactCoverage: "missing" as const,
            missing_artifacts: [],
            index_scope: "referenced" as const,
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
        payload: { registry: { scope: "referenced" } },
      },
    ).state;
    const expandedState = applySynthesisUiAction(
      createDefaultSynthesisUiState(),
      {
        action: "setFilters",
        payload: {
          registry: {
            expandedSourceRefs: ["1:AAA", "1:AAA", "", "1:BBB"],
          },
        },
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
      ["1:AAA"],
    );
    assert.deepEqual(expandedState.registry.expandedSourceRefs, [
      "1:AAA",
      "1:BBB",
    ]);
  });

  it("wires Index filters and cleanup review card in the Workbench [inv.review.user_manageable]", async function () {
    const source = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const model = await fs.readFile("src/modules/synthesis/uiModel.ts", "utf8");
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");

    assert.include(source, "synthesis-filter-scope");
    assert.include(source, "synthesis-filter-coverage");
    assert.include(source, 'filterOptionLabel("synthesis-filter-binding"');
    assert.include(source, '"binding-status"');
    assert.include(source, '"stale_target"');
    assert.notInclude(source, "Missing: References");
    assert.notInclude(model, "needs-cleanup");
    assert.notInclude(model, "referenceStatus");
    assert.include(model, "bindingStatus");
    assert.notInclude(source, "Only referenced literature");
    assert.include(source, "renderRegistryTable");
    assert.include(source, "appendRegistryColgroup");
    assert.include(source, "`registry-col-${column}`");
    assert.include(source, "surfaceRuntimeKey");
    assert.include(source, 'scope === "referenced"');
    assert.include(source, 'scope === "all"');
    assert.include(source, "surfaceRuntime(surface)");
    assert.include(source, '"reference",');
    assert.include(source, '"source",');
    assert.include(source, '"target",');
    assert.include(source, "registry-parent-row");
    assert.include(source, "registry-reference-row");
    assert.include(source, "state.registryExpandedRows");
    assert.include(source, "state.registryLoadingReferenceRows");
    assert.include(source, "reference_count");
    assert.include(source, "expandedSourceRefs");
    assert.include(source, "Loading refs...");
    assert.include(source, "registryReferencePrimaryTitle");
    assert.include(source, "renderRegistryReferenceRow");
    assert.include(source, "registryReferenceDisplayId");
    assert.include(source, "registryRowDisplayId");
    const registryReferenceTitleBlock = extractFunctionBlock(
      source,
      "registryReferencePrimaryTitle",
    );
    assert.isBelow(
      registryReferenceTitleBlock.indexOf("textValue(reference.raw_reference)"),
      registryReferenceTitleBlock.indexOf(
        "textValue(reference.target_paper_ref)",
      ),
    );
    assert.isBelow(
      registryReferenceTitleBlock.indexOf(
        "textValue(reference.reference_instance_id)",
      ),
      registryReferenceTitleBlock.indexOf(
        "textValue(reference.target_literature_item_id)",
      ),
    );
    assert.include(source, "registryStatusTone");
    assert.include(source, '"ID"');
    assert.include(source, '"Artifacts"');
    assert.include(source, '"References"');
    assert.include(source, '"(Total/Unbound)"');
    assert.include(source, "registryArtifactBadges");
    assert.include(source, "renderRegistryArtifacts");
    assert.include(source, '"Digest artifact"');
    assert.include(source, '"References artifact"');
    assert.include(source, '"Citation analysis artifact"');
    assert.include(source, "registry-artifacts-header");
    assert.include(source, "registry-references-header");
    assert.include(source, "registry-reference-count");
    assert.include(source, 'status === "accepted"');
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
    assert.include(source, "index-review-drawer");
    assert.include(source, "renderCleanupReviewCard");
    assert.include(source, "renderReferenceProposalBulkActions");
    assert.include(source, "renderReferenceProposalPendingControls");
    assert.include(source, "queueReferenceProposalDecision");
    assert.include(source, "synthesis-action-reverse-accept");
    assert.include(source, "synthesis-action-manual-target");
    assert.include(source, "synthesis-canonical-revise-title");
    assert.include(source, "renderCanonicalRevisionWorkbench");
    assert.include(source, "mergeEffectiveCanonicalReference");
    assert.include(source, "pendingCanonicalMergeRequests");
    assert.include(source, "canonicalMergeSourceRowIds");
    assert.include(source, "canonicalMergeSubmission");
    assert.include(source, "canonicalDetailCollapsed");
    assert.include(source, "canonicalEditOpenRowId");
    assert.include(source, "canonicalEditDrafts");
    assert.include(source, "canonicalEditCompareIndexByRowId");
    assert.include(source, "renderCanonicalEditDrawer");
    assert.include(source, "synthesis-action-copy-to-draft");
    assert.include(source, "canonicalEditPatch(canonicalEditDraftForRow(row))");
    assert.include(source, "data-canonical-edit-row-id");
    assert.include(source, "canonical-edit-body");
    assert.include(source, "canonical-edit-compare-nav");
    assert.include(source, "state.canonicalEditDrafts.delete(rowId)");
    assert.notInclude(source, 'window.prompt("Canonical title"');
    assert.notInclude(source, "normalizedTitle: canonicalEditPatch");
    assert.include(source, "canonical-detail-tabs segmented-control");
    assert.include(source, "canonical-detail-header-actions");
    assert.include(
      source,
      'state.canonicalDetailCollapsed\n        ? t("synthesis-action-expand")',
    );
    assert.include(source, "synthesis-action-merge-selected");
    assert.include(source, "synthesis-action-apply-pending");
    assert.include(source, "Applying ${pending.length} pending merge(s)");
    assert.include(source, "queueCanonicalMergeTarget");
    assert.include(source, "applyCanonicalRevisionMergeRequests");
    assert.include(source, "archiveCanonicalReference");
    assert.include(host, "{ deferStart: true }");
    assert.include(host, 'command === "applyCanonicalRevisionMergeRequests"');
    assert.notInclude(source, "Actions: All");
    assert.notInclude(model, "canonicalActionable");
    assert.include(source, "renderReferenceManualTargetPicker");
    assert.include(source, "openReferenceManualTargetPicker");
    assert.include(source, "syncReferenceManualTargetOverlay");
    assert.include(source, "scrollReferenceTargetListToGroup");
    assert.include(source, "data-reference-target-group-start");
    assert.include(source, 'list.scrollTo({ top, behavior: "auto" })');
    assert.include(source, "reference-target-overlay");
    assert.include(source, "reference-target-popover");
    assert.include(source, "anchorRect");
    assert.include(source, "positionReferenceManualTargetPopover");
    assert.include(source, "Math.min(rawLeft, viewportWidth - width - margin)");
    assert.include(
      source,
      'overlay.addEventListener("click", closeReferenceManualTargetPicker)',
    );
    assert.include(source, "manual_target");
    assert.include(source, "matchTargetCandidates");
    assert.include(source, "referenceTargetCandidateGroup");
    assert.include(source, "referenceTargetBindingLabel");
    assert.include(source, "reference-target-binding-pill");
    assert.include(source, "has-binding");
    assert.include(source, "source_effective_canonical_reference_id");
    assert.include(source, "target_effective_canonical_reference_id");
    assert.include(source, "source_projected_literature_item_id");
    assert.include(source, "target_projected_literature_item_id");
    assert.include(source, "referenceTargetCandidateProjectedId");
    assert.include(source, 'textValue(proposal.kind) === "canonical_merge"');
    assert.include(source, '"reverse_accept"');
    assert.include(source, "isCanonicalRevisionProposal");
    assert.include(source, "renderCanonicalRevisionReviewCard");
    assert.include(source, "renderCanonicalRevisionReviewActions");
    assert.include(source, "canonicalRevisionReviewActionButtons");
    assert.include(source, "renderReferenceMatchDecisionSummary({");
    assert.notInclude(source, '["source", context.sourceTitle]');
    assert.notInclude(source, '["target", context.targetTitle]');
    assert.include(source, "synthesis-review-canonical-revision-title");
    assert.include(source, "synthesis-review-canonical-no-successor");
    assert.include(source, "source_paper_title");
    assert.include(source, "reference_title");
    assert.include(source, "sourceRowTitleIsFallback");
    assert.include(source, "sourceBindingTitle ||");
    assert.include(source, "sourceEvidenceTitle ||");
    assert.include(source, '["proposal id", proposal.proposal_id]');
    assert.notInclude(source, "applyLiteratureCleanupAction");
    assert.notInclude(source, "confirm_literature_item");
    assert.notInclude(source, "match_existing_literature_item");
    assert.notInclude(source, "ignore_reference_instance");
    assert.notInclude(source, "defer_reference_resolution");
    assert.notInclude(source, "confirm_delete_item");
    assert.notInclude(source, "mark_as_dedupe_merge");
    assert.notInclude(source, "keep_for_now");
    assert.include(source, "Zotero deletion review");
    assert.include(source, "Zotero dedupe review");
    assert.include(source, "refreshReferenceSidecarNow");
    assert.include(source, "retryReferenceSidecarRefresh");
    assert.include(source, "rebuildCitationGraphCacheNow");
    assert.include(source, 'command: "rebuildCitationGraphCacheNow"');
    assert.include(css, ".registry-table");
    assert.include(css, ".registry-parent-row td");
    assert.include(css, ".registry-reference-row td");
    assert.include(css, ".registry-reference-title-cell");
    assert.include(css, ".registry-reference-disclosure");
    assert.include(css, ".registry-reference-muted");
    assert.include(css, ".registry-artifact-badges");
    assert.include(css, ".registry-artifacts-cell");
    assert.include(css, ".registry-references-cell");
    assert.include(css, ".registry-col-source");
    assert.include(css, ".registry-col-target");
    assert.include(css, ".registry-reference-source-cell");
    assert.include(css, ".registry-reference-target-cell");
    assert.include(css, ".registry-column-header-subtitle");
    assert.include(css, ".registry-reference-count");
    assert.include(css, "grid-template-columns: repeat(3, max-content);");
    assert.include(css, "table-layout: fixed;");
    assert.include(css, ".badge.blue");
    assert.include(css, ".reference-target-overlay");
    assert.include(css, ".reference-target-popover");
    assert.include(css, ".reference-target-index");
    assert.include(css, ".reference-target-list");
    assert.match(
      css,
      /\.reference-target-overlay\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;[\s\S]*?z-index:\s*120;/,
    );
    assert.match(
      css,
      /\.reference-target-popover\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?z-index:\s*121;/,
    );
    assert.include(css, "width: min(560px, calc(100vw - 48px));");
    assert.include(css, "height: min(420px, calc(100vh - 180px));");
    assert.match(
      css,
      /\.reference-target-index button\s*\{[\s\S]*?height:\s*14px;[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;/,
    );
    assert.include(css, "grid-template-columns: minmax(0, 1fr) max-content;");
    assert.include(css, "height: 100%;");
    assert.include(css, "max-height: none;");
    assert.include(css, ".reference-target-row.has-binding");
    assert.include(css, ".reference-target-binding-pill");
    assert.include(css, "overflow-wrap: anywhere;");
    assert.include(css, "padding-block: 4px;");
    assert.include(css, "white-space: nowrap;");
    assert.include(css, "text-overflow: ellipsis;");
    assert.include(css, ".registry-reference-row td:first-child");
    assert.include(
      css,
      "grid-template-columns: 12px minmax(0, 1fr) max-content;",
    );
    assert.notInclude(css, ".registry-reference-form");
    assert.notInclude(css, ".registry-reference-field");
    assert.notInclude(css, "table-layout: auto;");
  });

  it("renders domain-local single review cards for Synthesis review workflows", async function () {
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");

    assert.include(app, "renderReviewPanel");
    assert.include(app, "renderReviewCard");
    assert.include(app, "review-panel-enter");
    assert.include(app, "renderTopicGraphReviewPanel");
    assert.include(app, "topicGraphReviewPanel");
    assert.include(app, "renderTopicRelationBlock");
    assert.include(app, "topic-relation-review-block");
    assert.include(app, '["confidence", selected.confidence]');
    assert.include(app, '["provenance", selected.provenance]');
    assert.include(app, "optimisticReviewDecisions");
    assert.include(app, "isReviewOptimisticallyResolved");
    assert.include(app, "captureWorkbenchRenderState");
    assert.include(app, "restoreWorkbenchRenderState");
    assert.include(app, "tag-import-popover");
    assert.include(app, "synthesis-tags-import-kind");
    assert.include(app, "Sync review");
    assert.include(app, "synthesis-action-manual-target");
    assert.include(app, "reference-target-popover");
    assert.include(app, "manual_target");
    assert.include(app, "retargeted");
    assert.include(app, "applyCanonicalRevisionReviewAction");
    assert.include(app, "canonical_revision");
    assert.include(
      app,
      'filterOptionLabel(\n              "synthesis-filter-kind",\n              "kind",\n              "canonical_revision"',
    );
    assert.include(
      app,
      'kind === "all" || textValue(row.review_kind || row.kind) === kind',
    );
    assert.include(app, "renderCanonicalRevisionReviewCard(item.proposal)");
    assert.include(app, "renderCanonicalRevisionReviewActions(proposal)");
    assert.include(app, 'enumLabel("review-tab", "reference_matching")');
    assert.notInclude(app, '["index_cleanup", "Index Cleanup"]');
    assert.notInclude(app, "Concept Review Queue");
    assert.notInclude(app, "Cleanup Queue");
    assert.notInclude(app, "Relation Review Queue");
    assert.include(css, ".review-panel");
    assert.include(css, ".review-card");
    assert.include(css, ".concept-review-panel.is-collapsed");
    assert.include(css, ".topic-relation-review-block");
    assert.include(css, ".topic-relation-review-arrow-icon");
    assert.include(css, ".concept-candidate-pill");
    assert.include(css, ".review-index-table");
    assert.match(
      css,
      /\.review-index-table\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?min-width:\s*0;/,
    );
    assert.match(
      css,
      /\.review-index-table \.review-kind-cell\s*\{[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?white-space:\s*normal;/,
    );
    assert.match(
      css,
      /\.review-index-table \.review-reason-cell\s*\{[\s\S]*?overflow-wrap:\s*anywhere;[\s\S]*?white-space:\s*normal;/,
    );
    assert.match(
      css,
      /\.review-index-table \.review-table-actions\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    );
    assert.match(
      css,
      /\.review-index-table \.review-table-actions > button\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*24px;[\s\S]*?white-space:\s*nowrap;/,
    );
    assert.include(css, ".review-concepts-table");
    assert.match(
      css,
      /\.review-concepts-table \.review-action-cell\s*\{[\s\S]*?width:\s*240px;/,
    );
    assert.match(
      css,
      /\.review-concepts-table \.concept-review-actions\s*\{[\s\S]*?flex-wrap:\s*nowrap;/,
    );
    assert.include(css, ".review-topic-graph-table");
    assert.include(css, ".review-cell-center");
    assert.include(css, ".review-pill-list");
    assert.include(css, ".concept-bulk-bar");
    assert.include(css, ".concept-alias-pill");
    assert.include(css, ".tag-pill-list");
    assert.include(css, ".topics-list-center-cell");
    assert.include(css, ".registry-center-cell");
    assert.include(css, ".review-center-toolbar .segmented");
    assert.include(css, "display: inline-flex;");
    assert.include(css, "@keyframes review-panel-enter");
    assert.include(css, ".review-panel {\n    animation: none;");
  });

  it("guards Workbench review performance against heavy signatures and full rerenders", async function () {
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const signatureBlock = extractFunctionBlock(
      app,
      "snapshotContentSignature",
    );
    [
      "snapshot.registry.visibleRows",
      "snapshot.registry.matchProposals",
      "snapshot.registry.cleanupProposals",
      "topicGraph: snapshot.topicGraph",
    ].forEach((forbidden) => {
      assert.notInclude(signatureBlock, forbidden);
    });
    [/\.references\b/, /\.diagnostics\b/, /\.evidence\b/].forEach(
      (forbidden) => {
        assert.notMatch(signatureBlock, forbidden);
      },
    );
    [
      "snapshot.graph.nodes.map",
      "snapshot.graph.edges.map",
      "snapshot.graph.visibleNodes.map",
      "snapshot.graph.visibleEdges.map",
      "snapshot.graph.hoverOnlyNodes.map",
      "snapshot.graph.hoverOnlyEdges.map",
    ].forEach((forbidden) => {
      assert.notInclude(signatureBlock, forbidden);
    });
    [
      "queueReferenceProposalDecision",
      "queueReferenceProposalDecisions",
      "cancelReferenceProposalDecision",
      "clearReferenceProposalSelections",
      "toggleReferenceProposalSelection",
      "toggleReferenceProposalRowsSelection",
    ].forEach((functionName) => {
      const block = extractFunctionBlock(app, functionName);
      assert.notInclude(block, "render();", `${functionName} must stay local`);
      assert.include(block, "refreshReferenceReviewSurfaces");
    });
    assert.include(app, "function refreshReferenceReviewSurfaces");
    assert.include(app, "function renderSurface");
    assert.include(app, "surfaces: Record<string, WorkbenchSurfaceRuntime>");
    assert.include(app, "markSurfaceRuntime");
    assert.include(app, 'data.type === "synthesis:chrome"');
    assert.include(app, 'data.type === "synthesis:surface"');
    assert.include(app, "main.dataset.synthesisSurface = surface");
    assert.include(app, 'dataset.synthesisSurface = "index-review-drawer"');
    assert.include(app, 'dataset.synthesisSurface = "reference-review-table"');
    assert.include(app, "compactRegistryRowSignature");
    assert.include(app, "compactReferenceProposalSignature");
    const renderSurfaceBlock = extractFunctionBlock(app, "renderSurface");
    assert.notInclude(renderSurfaceBlock, "clear(root)");
    assert.notInclude(renderSurfaceBlock, "lastChromeSignature");
    const sendActionBlock = extractFunctionBlock(app, "sendAction");
    assert.notInclude(sendActionBlock, "render();");
    assert.include(sendActionBlock, "renderSelectedTabShell");
    assert.include(sendActionBlock, "restoreCachedSurfaceSnapshot");
    assert.include(app, "function renderSelectedTabShell");
    assert.include(app, "function restoreCachedSurfaceSnapshot");
    assert.include(app, "snapshot?: Snapshot");
    const tabShellBlock = extractFunctionBlock(app, "renderSelectedTabShell");
    assert.include(tabShellBlock, "renderSurfaceLoading");
    assert.include(tabShellBlock, "renderCurrentView(main, state.snapshot)");
    assert.notInclude(tabShellBlock, "snapshotContentSignature");
    const surfaceMessageBlock = extractIfBlock(
      app,
      'data.type === "synthesis:surface"',
    );
    assert.include(surfaceMessageBlock, "surfacePayloadRequestId(payload)");
    assert.include(surfaceMessageBlock, "isStaleSurfacePayload");
    assert.include(surfaceMessageBlock, "acceptSurfacePayload");
    assert.include(
      surfaceMessageBlock,
      'markSurfaceRuntime(surface, "ready", undefined, nextSnapshot',
    );
    assert.isBelow(
      surfaceMessageBlock.indexOf('markSurfaceRuntime(surface, "ready"'),
      surfaceMessageBlock.indexOf("state.snapshot = nextSnapshot"),
      "surface response should cache readiness before overwriting visible snapshot",
    );
    assert.include(surfaceMessageBlock, "const chromeChanged");
    assert.include(surfaceMessageBlock, "renderWorkbenchChrome()");
    const surfaceErrorBlock = extractIfBlock(
      app,
      'data.type === "synthesis:surface-error"',
    );
    assert.include(surfaceErrorBlock, "isStaleSurfacePayload");
    assert.include(surfaceErrorBlock, "restoreSurfaceSnapshotForError");
    assert.include(surfaceErrorBlock, "renderSurface(surface)");
    assert.include(surfaceErrorBlock, "renderSelectedTabShell()");
    assert.include(app, "acceptedSurfaceRequestIds");
    assert.include(app, "renderSurfaceRefreshDiagnostic");
    assert.include(app, "function renderSurfaceLoading");
    [
      ["renderTopicsGraph", "rebuildTopicGraphIndex"],
      ["renderTags", "rebuildTagVocabularyIndex"],
      ["renderConcepts", "rebuildConceptKbIndex"],
    ].forEach(([functionName, command]) => {
      const block = extractFunctionBlock(app, functionName);
      assert.notInclude(block, "Rebuild Index");
      assert.notInclude(block, command);
    });
    const proposalContextBlock = extractFunctionBlock(
      app,
      "referenceMatchProposalContext",
    );
    assert.notInclude(proposalContextBlock, "buildRegistryReviewLookup");
    const reviewTableBlock = extractFunctionBlock(
      app,
      "renderReferenceMatchingReviewTable",
    );
    assert.include(
      reviewTableBlock,
      "const lookup = buildRegistryReviewLookup",
    );
    assert.include(
      reviewTableBlock,
      "referenceMatchProposalEntriesForReviewCenter",
    );
  });

  it("guards Workbench service hot paths against heavy surface reads", async function () {
    const service = await fs.readFile(
      "src/modules/synthesis/service.ts",
      "utf8",
    );
    const chromeBlock = extractFunctionBlock(
      service,
      "getSynthesisWorkbenchChromeInput",
    );
    [
      "readDbCitationGraphOverview",
      "registryRowsFromCurrentLibraryAndSidecar",
      "loadTagVocabulary",
      "loadConceptKb",
      "loadTopicGraph",
    ].forEach((forbidden) => {
      assert.notInclude(chromeBlock, forbidden);
    });
    const warmupBlock = extractFunctionBlock(
      service,
      "warmSynthesisWorkbenchSurfaces",
    );
    assert.include(warmupBlock, "args.surfaces !== undefined");
    const surfaceBlock = extractFunctionBlock(
      service,
      "getSynthesisWorkbenchSurfaceInput",
    );
    assert.include(surfaceBlock, "activeReviewTab");
    assert.include(surfaceBlock, 'activeReviewTab === "concepts"');
    assert.include(surfaceBlock, "conceptKb.loadConceptKb()");
    assert.include(surfaceBlock, "concepts: reviewConcepts");
    assert.include(surfaceBlock, 'activeReviewTab === "topic_graph"');
    assert.include(surfaceBlock, "topicGraphSnapshotForUi");
    assert.include(surfaceBlock, "topicGraph: topicGraphSnapshot");
    const graphSurfaceBranch = surfaceBlock.slice(
      surfaceBlock.indexOf('if (surface === "graph")'),
      surfaceBlock.indexOf('if (surface === "tags")'),
    );
    assert.include(
      graphSurfaceBranch,
      "const topicGraphContext = await topicGraphSnapshotForUi",
    );
    assert.include(graphSurfaceBranch, "topicGraph: topicGraphSnapshot");
    assert.include(
      graphSurfaceBranch,
      "reviewItems: topicGraphSnapshot.review_items",
    );
    assert.include(graphSurfaceBranch, "topicGraphScopesFromGraphNodes");
    assert.include(graphSurfaceBranch, "topicScopes");
    assert.include(graphSurfaceBranch, "readArtifactStateRows(root)");
    assert.include(surfaceBlock, "proposalQueryForReviewState");
    assert.notInclude(
      surfaceBlock,
      "listReferenceMatchProposals({ limit: 100 })",
    );
    assert.notInclude(surfaceBlock, "synthesisRepository.listReviewItems()");
    const reviewContextBlock = extractFunctionBlock(
      service,
      "registryRowsForReferenceMatchProposalContext",
    );
    assert.include(reviewContextBlock, "registryInputsForSourceRefs");
    assert.notInclude(
      reviewContextBlock,
      "registryRowsFromCurrentLibraryAndSidecar",
      "Review context must not load Index sidecar rows",
    );
    const registryRowsToUiBlock = extractFunctionBlock(
      service,
      "registryRowsWithReferenceFactsToUi",
    );
    assert.include(registryRowsToUiBlock, "includeReferences");
    assert.include(registryRowsToUiBlock, "referenceSourceRefs");
    assert.include(registryRowsToUiBlock, "loadedReferenceSourceRefs");
    assert.include(registryRowsToUiBlock, "listReferenceFactSummariesBySource");
    assert.include(registryRowsToUiBlock, "rawReferenceIds");
    const liveMetadataBlock = extractFunctionBlock(
      service,
      "enrichRegistryRowsWithLiveMetadata",
    );
    assert.include(liveMetadataBlock, "getRegistryInputSummaryForItem");
    assert.notInclude(liveMetadataBlock, "getRegistryInputForItem");
    assert.notInclude(liveMetadataBlock, "childNotes");
    const indexSurfaceBlock = extractIfBlock(service, 'surface === "index"');
    assert.include(indexSurfaceBlock, "state.registry.expandedSourceRefs");
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const prewarmBlock = extractFunctionBlock(
      host,
      "prewarmSynthesisWorkbenchSurfaces",
    );
    assert.include(prewarmBlock, "surfaces: args.surfaces");
    const libraryAdapter = await fs.readFile(
      "src/modules/synthesis/libraryAdapter.ts",
      "utf8",
    );
    const pageStart = libraryAdapter.indexOf("async getRegistryInputsPage");
    const pageEnd = libraryAdapter.indexOf("async getRegistryInputForItem");
    assert.isAtLeast(pageStart, 0, "getRegistryInputsPage should exist");
    assert.isAbove(
      pageEnd,
      pageStart,
      "getRegistryInputsPage should be bounded",
    );
    const pageBlock = libraryAdapter.slice(pageStart, pageEnd);
    assert.include(pageBlock, "visibleTopLevelRegularItemsPage");
    assert.notInclude(pageBlock, "getAllRegularZoteroItems");
    assert.include(libraryAdapter, "getRegistryInputSummaryForItem");
    const repository = await fs.readFile(
      "src/modules/synthesis/repository.ts",
      "utf8",
    );
    const factsStart = repository.indexOf("listReferenceFacts(");
    const factsEnd = repository.indexOf(
      "listReferenceFactSummariesBySource",
      factsStart,
    );
    assert.isAtLeast(factsStart, 0, "listReferenceFacts should exist");
    assert.isAbove(
      factsEnd,
      factsStart,
      "listReferenceFacts should be bounded",
    );
    const factsBlock = repository.slice(factsStart, factsEnd);
    assert.include(factsBlock, "sourceRefs: Array.from(sourceIds)");
    assert.include(factsBlock, "rawReferenceIds: args.rawReferenceIds");
    assert.include(factsBlock, "resolveEffectiveCanonicalReferenceIds");
    assert.notInclude(factsBlock, "this.listCanonicalReferences().map");
    assert.notInclude(
      factsBlock,
      "for (const binding of this.listReferenceBindings())",
    );
    assert.notInclude(
      factsBlock,
      'this.listRawReferences({ statuses: ["active"] })',
    );
  });

  it("wires asynchronous Workbench action feedback and host single-flight", async function () {
    const app = await fs.readFile("src/synthesisWorkbenchApp.ts", "utf8");
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const css = await fs.readFile("addon/content/synthesis/styles.css", "utf8");

    assert.include(app, "localPendingActions");
    assert.include(app, "listActiveActionOperations");
    assert.include(app, "state.localPendingActions.values()");
    assert.include(app, "aria-busy");
    assert.include(app, "renderActionStatusbar");
    assert.include(app, "listBackgroundJobs");
    assert.include(app, "snapshot.maintenance?.backgroundJobs?.rows");
    assert.include(app, "backgroundJobStatusbarOperation");
    assert.include(app, "renderBackgroundJobPopover");
    assert.include(app, 'const isRunning = job.status === "running";');
    assert.include(app, 'isRunning ? progressLabel(job.progress) : ""');
    assert.include(app, "if (isRunning && job.progress)");
    assert.include(app, "action-statusbar-job-button");
    assert.include(app, "action-statusbar");
    assert.include(app, "STATUSBAR_COMPLETED_TIMEOUT_MS");
    assert.include(app, "STATUSBAR_FAILED_TIMEOUT_MS");
    assert.include(app, "action-statusbar-progress");
    assert.include(app, "isOperationPending");
    assert.notInclude(app, "content.appendChild(actionNotice)");
    const statusbarBlock = extractFunctionBlock(app, "renderActionStatusbar");
    assert.include(
      statusbarBlock,
      "const showFailedJob = shouldShowTimedStatusbarEntry",
    );
    assert.include(statusbarBlock, "const statusbarJobs =");
    assert.include(
      statusbarBlock,
      "statusbarJobs.length || state.jobPopoverOpen",
    );
    assert.notInclude(statusbarBlock, "if (failedJob) {");
    assert.include(host, "inFlightCommands");
    assert.include(host, "runWorkbenchCommandOnce");
    assert.include(host, "commandProgressTimer");
    assert.include(host, "ensureCommandProgressPolling");
    assert.include(host, "notifyWorkbenchCommandProgress");
    assert.include(host, "refreshWorkbenchCommandProgress");
    assert.include(host, "getSynthesisBackgroundJobRows");
    assert.include(host, "refreshFromService: false");
    assert.notMatch(
      host,
      /notifyWorkbenchCommandProgress[\s\S]{0,240}refreshFromService: true/,
    );
    assert.notMatch(
      host,
      /ensureCommandProgressPolling[\s\S]{0,360}refreshFromService: true/,
    );
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

  it("guards Workbench index rebuild commands and defers heavy rebuild start", async function () {
    const host = await fs.readFile(
      "src/modules/synthesisWorkbenchTab.ts",
      "utf8",
    );
    const runtime = await fs.readFile(
      "src/utils/runtimeCompatibility.ts",
      "utf8",
    );
    const service = await fs.readFile(
      "src/modules/synthesis/service.ts",
      "utf8",
    );
    const protectedCommands = [
      "refreshReferenceSidecarNow",
      "rebuildCitationGraphCacheNow",
      "rebuildTagVocabularyIndex",
      "rebuildConceptKbIndex",
      "rebuildTopicGraphIndex",
    ];

    assert.include(host, "isProtectedRebuildCommand");
    assert.include(host, "confirmProtectedRebuildCommand");
    assert.include(host, "confirmWorkbenchAction");
    assert.include(host, "deferStart?: boolean");
    assert.include(host, "globalThis.setTimeout(() => void start(), 0)");
    assert.include(host, "SYNTHESIS_WORKBENCH_COMMAND_PROGRESS_INTERVAL_MS");
    assert.include(
      host,
      "getDefaultSynthesisService().rebuildTopicGraphIndex({",
    );
    assert.notInclude(
      host,
      'retryReferenceSidecarRefresh" &&\n    !confirmProtectedRebuildCommand',
    );
    for (const command of protectedCommands) {
      assert.include(host, `command === "${command}"`);
      assert.match(
        host,
        new RegExp(`${command}[\\s\\S]{0,260}deferStart: true`),
      );
    }
    assert.include(runtime, "export async function yieldToEventLoop");
    assert.include(runtime, "globalThis.setTimeout");
    assert.include(service, "yieldToEventLoop");
    assert.include(service, "yieldControl: yieldToEventLoop");
    assert.include(service, "runProjectionIndexRebuildWithProgress");
    assert.include(service, "reportProgress");
    assert.include(service, "onProgress");
  });
});

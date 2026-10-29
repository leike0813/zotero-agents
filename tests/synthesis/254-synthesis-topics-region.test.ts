import { assert } from "chai";
import { h, render } from "preact";
import {
  buildSynthesisUiSnapshot,
  createDefaultSynthesisUiState,
} from "../../src/modules/synthesis/uiModel";
import { projectBusinessSurface } from "../../src/synthesis/synthesisSurfaceProjection";
import { getSynthesisUiOperationKey } from "../../src/modules/synthesis/uiModel";

import {
  captureRegionSubtrees,
  assertRegionSubtreesPreserved,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  formatSynthesisWorkbenchMessage,
} from "../../src/shared/synthesisWorkbenchI18nContract";
import {
  TopicsRegion,
  type SynthesisWorkbenchTopicsSelection,
} from "../../src/synthesis/components/TopicsRegion";
import type { SynthesisWorkbenchTopicGraphSelection } from "../../src/synthesis/components/TopicGraphPanel";
import {
  buildTopicRelationReviewQueue,
  narrowTopicArtifactRows,
  narrowTopicGraphInspector,
  type SynthesisWorkbenchTopicsText,
  type TopicArtifactRowView,
  type TopicRelationReviewEntry,
} from "../../src/synthesis/components/topicsRegionData";
import type { SynthesisWorkbenchTopicsActionSender } from "../../src/synthesis/components/topicsControls";

function makeT(): SynthesisWorkbenchTopicsText {
  return (key, vars) =>
    formatSynthesisWorkbenchMessage(
      SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key],
      vars,
    );
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function makeRow(
  overrides: Partial<TopicArtifactRowView> = {},
): TopicArtifactRowView {
  return {
    id: "t-1",
    title: "Graph Neural Networks",
    definition: "Methods for graph-structured data",
    summary: "",
    markdownPreview: "",
    paperCount: 12,
    sourceMaterialsStatus: "complete",
    sourceMaterialsPercent: 100,
    freshness: "fresh",
    updatedAt: "2026-09-01",
    candidateCount: 0,
    updateAvailable: true,
    ...overrides,
  };
}

function makeGraph(
  overrides: Partial<SynthesisWorkbenchTopicGraphSelection> = {},
): SynthesisWorkbenchTopicGraphSelection {
  return {
    mode: "hierarchy",
    search: "",
    hasAnyTopics: true,
    nodes: [
      {
        topicId: "t-a",
        title: "Alpha",
        paperCount: 8,
        nodeType: "materialized",
        isTop: true,
        relationStatuses: [],
      },
      {
        topicId: "t-b",
        title: "Beta",
        paperCount: 5,
        nodeType: "materialized",
        isTop: false,
        relationStatuses: [],
      },
      {
        topicId: "t-c",
        title: "Gamma",
        paperCount: 3,
        nodeType: "virtual",
        isTop: false,
        relationStatuses: ["confirmed"],
      },
    ],
    edges: [
      {
        sourceTopicId: "t-a",
        targetTopicId: "t-b",
        relation: "broader_than",
        status: "confirmed",
      },
    ],
    inspector: {
      topic: {
        topicId: "t-b",
        title: "Beta",
        paperCount: 5,
        nodeType: "materialized",
        isTop: false,
        relationStatuses: [],
        definition: "Beta definition",
        lastSynthesisAt: "2026-09-02",
      },
      parents: [
        {
          topicId: "t-a",
          title: "Alpha",
          paperCount: 8,
          nodeType: "materialized",
          isTop: true,
          relationStatuses: [],
        },
      ],
      children: [],
      related: [
        {
          node: {
            topicId: "t-c",
            title: "Gamma",
            paperCount: 3,
            nodeType: "virtual",
            isTop: false,
            relationStatuses: ["confirmed"],
          },
          relation: "related_to",
          status: "suggested",
        },
      ],
      suggestedCount: 2,
    },
    reviewQueue: [],
    ...overrides,
  };
}

function makeSelection(
  overrides: Partial<SynthesisWorkbenchTopicsSelection> = {},
): SynthesisWorkbenchTopicsSelection {
  return {
    search: "",
    sort: "title",
    viewMode: "list",
    hasAnyTopics: true,
    rows: [makeRow()],
    deletedCount: 0,
    pendingOperationKeys: [],
    graph: null,
    ...overrides,
  };
}

describe("synthesis topics region (src/synthesis/components/TopicsRegion)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    document.body.innerHTML = "";
    restoreSidebarDomGlobals();
  });

  function renderRegion(selection: SynthesisWorkbenchTopicsSelection) {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const dispatched: Array<{
      action: string;
      payload: Record<string, unknown>;
    }> = [];
    const t = makeT();
    const onAction: SynthesisWorkbenchTopicsActionSender = (
      action,
      payload,
    ) => {
      dispatched.push({ action, payload: payload || {} });
    };
    render(h(TopicsRegion, { selection, t, onAction }), root);
    return {
      root,
      dispatched,
      rerender(next: SynthesisWorkbenchTopicsSelection) {
        render(h(TopicsRegion, { selection: next, t, onAction }), root);
      },
    };
  }

  function dispatchInput(element: HTMLInputElement, value: string) {
    element.value = value;
    element.dispatchEvent(new window.Event("input", { bubbles: true }));
  }

  function dispatchChange(element: HTMLSelectElement, value: string) {
    element.value = value;
    element.dispatchEvent(new window.Event("change", { bubbles: true }));
  }

  function buttonByText(root: ParentNode, text: string) {
    return Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.trim() === text,
    );
  }

  it("includes planned topics in both row views without turning them into artifacts", function () {
    const state = createDefaultSynthesisUiState();
    const node = (topicId: string, lifecycle: string, extra = {}) => ({
      topic_id: topicId,
      title: `Topic ${topicId}`,
      definition: "Planned synthetic definition",
      aliases: [],
      node_type: "placeholder" as const,
      definition_status: "placeholder" as const,
      paper_count: 0,
      planning: { lifecycle, revision: 2 },
      updated_at: "2026-10-19",
      ...extra,
    });
    const input = {
      libraryId: 1,
      artifacts: [],
      topicGraph: {
        nodes: [
          node("active", "planned"),
          node("stale", "stale", { definition_status: "stale" }),
          node("deleted", "planned", { definition_status: "deleted" }),
        ],
      },
    };
    for (const viewMode of ["list", "grid"] as const) {
      state.artifacts.viewMode = viewMode;
      const snapshot = buildSynthesisUiSnapshot(input, state);
      const projected = projectBusinessSurface(
        snapshot,
        {
          visibleSurface: "topics",
          localPendingActions: new Map(),
        } as Parameters<typeof projectBusinessSurface>[1],
        makeT(),
      );
      assert.equal(projected.surface, "topics");
      if (projected.surface !== "topics") throw new Error("wrong surface");
      assert.isTrue(projected.selection.hasAnyTopics);
      assert.deepEqual(
        projected.selection.rows.map((row) => row.id),
        ["active", "stale"],
      );
      assert.isEmpty(snapshot.artifacts.rows);
      const { root } = renderRegion(projected.selection);
      assert.include(root.textContent, "Topic active");
      assert.include(root.textContent, "Topic stale");
    }
  });

  for (const viewMode of ["list", "grid"] as const) {
    it(`creates planned topics from ${viewMode} without opening an artifact`, function () {
      const { root, dispatched } = renderRegion(
        makeSelection({
          viewMode,
          rows: [
            makeRow({
              id: "planned",
              lifecycle: "planned",
              createAvailable: true,
            }),
          ],
        }),
      );
      const action = root.querySelector<HTMLButtonElement>(
        viewMode === "grid"
          ? '.topic-card [aria-label="Create Topic"]'
          : "tbody .action-group button",
      );
      assert.ok(action);
      assert.isFalse(action!.disabled);
      action!.click();
      assert.deepEqual(dispatched, [
        {
          action: "hostCommand",
          payload: {
            command: "runSynthesizeTopic",
            args: { plannedTopicId: "planned" },
          },
        },
      ]);
      assert.isNull(root.querySelector("button button"));
    });

    it(`disables stale planned topic creation in ${viewMode}`, function () {
      const { root, dispatched } = renderRegion(
        makeSelection({
          viewMode,
          rows: [makeRow({ lifecycle: "stale", createAvailable: false })],
        }),
      );
      const action = root.querySelector<HTMLButtonElement>(
        viewMode === "grid"
          ? '.topic-card [aria-label="Create Topic"]'
          : "tbody .action-group button",
      );
      assert.ok(action);
      assert.isTrue(action!.disabled);
      action!.click();
      assert.isEmpty(dispatched);
    });
  }

  it("updates from the grid icon without triggering report navigation", function () {
    const { root, dispatched } = renderRegion(
      makeSelection({ viewMode: "grid" }),
    );
    const action = root.querySelector<HTMLButtonElement>(
      '.topic-card [aria-label="Update"]',
    );
    assert.ok(action);
    action!.click();
    assert.deepEqual(dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "submitTopicSynthesisUpdate",
          args: { topicId: "t-1" },
        },
      },
    ]);
  });

  it("keeps creation pending feedback scoped to the selected topic", function () {
    const { root } = renderRegion(
      makeSelection({
        rows: [
          makeRow({ id: "a", lifecycle: "planned", createAvailable: true }),
          makeRow({ id: "b", lifecycle: "planned", createAvailable: true }),
        ],
        pendingOperationKeys: [
          getSynthesisUiOperationKey("runSynthesizeTopic", {
            plannedTopicId: "a",
          }),
        ],
      }),
    );
    const actions = root.querySelectorAll<HTMLButtonElement>(
      "tbody .action-group button",
    );
    assert.isTrue(actions[0].disabled);
    assert.equal(actions[0].getAttribute("aria-busy"), "true");
    assert.isFalse(actions[1].disabled);
    assert.isFalse(
      buttonByText(root.querySelector(".panel-header")!, "Create Topic")!
        .disabled,
    );
  });

  it("deduplicates materialized topics and filters planned rows with the same ordering", function () {
    const state = createDefaultSynthesisUiState();
    const input = {
      libraryId: 1,
      artifacts: [
        {
          id: "same",
          title: "Materialized",
          kind: "topic_synthesis" as const,
          source_materials_status: "complete" as const,
          source_materials_percent: 100,
          freshness: "fresh" as const,
          paper_count: 3,
        },
      ],
      topicGraph: {
        nodes: [
          {
            topic_id: "same",
            title: "Old planned title",
            node_type: "placeholder" as const,
            planning: { lifecycle: "planned" as const },
          },
          {
            topic_id: "plan",
            title: "Alpha",
            definition: "Boundary methods",
            node_type: "placeholder" as const,
            planning: { lifecycle: "planned" as const },
            updated_at: "2026-10-19",
          },
        ],
      },
    };
    const context = {
      visibleSurface: "topics",
      localPendingActions: new Map(),
    } as Parameters<typeof projectBusinessSurface>[1];
    function project() {
      const snapshot = buildSynthesisUiSnapshot(input, state);
      assert.lengthOf(snapshot.artifacts.rows, input.artifacts.length);
      const result = projectBusinessSurface(snapshot, context, makeT());
      if (result.surface !== "topics") throw new Error("wrong surface");
      return result.selection;
    }
    assert.deepEqual(
      project().rows.map((row) => row.id),
      ["plan", "same"],
    );
    state.artifacts.sort = "paper_count";
    assert.deepEqual(
      project().rows.map((row) => row.id),
      ["same", "plan"],
    );
    state.artifacts.search = "boundary";
    assert.deepEqual(
      project().rows.map((row) => row.id),
      ["plan"],
    );
    input.artifacts.push({
      ...input.artifacts[0],
      id: "plan",
      title: "Materialized boundary",
    });
    assert.isUndefined(project().rows[0].lifecycle);
    assert.isTrue(project().rows[0].updateAvailable);
  });

  it("preserves list DOM when graph selection or invisible planning revision changes", function () {
    const input = {
      libraryId: 1,
      artifacts: [],
      topicGraph: {
        nodes: [
          {
            topic_id: "plan",
            title: "Plan",
            node_type: "placeholder" as const,
            planning: { lifecycle: "planned" as const, revision: 1 },
          },
        ],
      },
    };
    const state = createDefaultSynthesisUiState();
    state.artifacts.viewMode = "list";
    const context = {
      visibleSurface: "topics",
      localPendingActions: new Map(),
    } as Parameters<typeof projectBusinessSurface>[1];
    function project() {
      const result = projectBusinessSurface(
        buildSynthesisUiSnapshot(input, state),
        context,
        makeT(),
      );
      if (result.surface !== "topics") throw new Error("wrong surface");
      return result.selection;
    }
    const initial = project();
    const { root, rerender } = renderRegion(initial);
    const row = root.querySelector("tbody tr");
    state.topicGraph.selectedTopicId = "plan";
    input.topicGraph.nodes[0].planning.revision = 2;
    const next = project();
    assert.deepEqual(next, initial);
    rerender(next);
    assert.strictEqual(root.querySelector("tbody tr"), row);
  });

  it("offers planned Create and materialized Open/Update in the graph inspector", function () {
    const graph = makeGraph();
    graph.inspector!.topic = {
      ...graph.inspector!.topic!,
      nodeType: "placeholder",
      lifecycle: "planned",
      createAvailable: true,
    };
    const { root, dispatched, rerender } = renderRegion(
      makeSelection({ viewMode: "graph", graph }),
    );
    buttonByText(
      root.querySelector(".topic-inspector")!,
      "Create Topic",
    )!.click();
    assert.deepEqual(dispatched[0], {
      action: "hostCommand",
      payload: {
        command: "runSynthesizeTopic",
        args: { plannedTopicId: "t-b" },
      },
    });
    rerender(makeSelection({ viewMode: "graph", graph: makeGraph() }));
    assert.ok(
      buttonByText(root.querySelector(".topic-inspector")!, "Open details"),
    );
    assert.ok(
      buttonByText(root.querySelector(".topic-inspector")!, "Update Topic"),
    );
  });

  it("disables Create for a stale graph topic and displays no synthesis paper metric", function () {
    const graph = makeGraph();
    graph.inspector!.topic = {
      ...graph.inspector!.topic!,
      nodeType: "placeholder",
      lifecycle: "stale",
      createAvailable: false,
    };
    const { root, dispatched } = renderRegion(
      makeSelection({ viewMode: "graph", graph }),
    );
    const inspector = root.querySelector(".topic-inspector")!;
    const button = buttonByText(inspector, "Create Topic")!;
    assert.isTrue(button.disabled);
    button.click();
    assert.isEmpty(dispatched);
    assert.include(inspector.textContent, "Planning outdated");
  });

  it("renders the toolbar and the list table", function () {
    const { root } = renderRegion(makeSelection());
    const search = root.querySelector<HTMLInputElement>(
      'input[data-synthesis-control-key="registry.search"]',
    );
    assert.ok(search, "search input rendered");
    assert.equal(search!.placeholder, "Search");
    const sort = root.querySelector<HTMLSelectElement>("select");
    assert.equal(sort!.options.length, 3);
    assert.equal(sort!.value, "title");

    const toolbar = root.querySelector(".panel-header.panel-toolbar")!;
    assert.ok(buttonByText(toolbar, "Graph"));
    assert.ok(buttonByText(toolbar, "List")!.classList.contains("active"));
    assert.ok(buttonByText(toolbar, "Grid"));
    assert.ok(buttonByText(toolbar, "Create Topic"));
    assert.ok(buttonByText(toolbar, "Purge Deleted"));

    const headers = root.querySelectorAll(".table-wrap thead th");
    assert.equal(headers.length, 8);
    const firstRow = root.querySelector(".table-wrap tbody tr")!;
    assert.equal(
      firstRow.querySelector(".topics-list-title-text")!.textContent,
      "Graph Neural Networks",
    );
    assert.equal(
      firstRow.querySelector(".topics-list-definition-cell")!.textContent,
      "Methods for graph-structured data",
    );
    assert.equal(
      firstRow.querySelectorAll("td")[2].textContent,
      "12",
      "paper count column",
    );
    assert.ok(
      firstRow.querySelector(".topic-discovery-badge"),
      "discovery badge rendered",
    );
    const actions = firstRow.querySelectorAll(".action-group button");
    assert.deepEqual(
      Array.from(actions).map((button) => button.textContent!.trim()),
      ["Open", "Update", "Delete"],
    );
    assert.isNull(root.querySelector("p.muted"));
  });

  it("dispatches setFilters for search, sort, and view switches", async function () {
    const { root, dispatched } = renderRegion(makeSelection());
    const search = root.querySelector<HTMLInputElement>(
      'input[data-synthesis-control-key="registry.search"]',
    )!;
    dispatchInput(search, "gnn");
    const sort = root.querySelector<HTMLSelectElement>("select")!;
    dispatchChange(sort, "paper_count");
    buttonByText(root, "Grid")!.click();
    buttonByText(root, "Graph")!.click();
    await flush();
    assert.deepEqual(dispatched, [
      { action: "setFilters", payload: { artifacts: { search: "gnn" } } },
      {
        action: "setFilters",
        payload: { artifacts: { sort: "paper_count" } },
      },
      { action: "setFilters", payload: { artifacts: { viewMode: "grid" } } },
      { action: "setFilters", payload: { artifacts: { viewMode: "graph" } } },
    ]);
  });

  it("dispatches host commands for toolbar and row actions", async function () {
    const { root, dispatched } = renderRegion(makeSelection());
    buttonByText(root, "Create Topic")!.click();
    buttonByText(root, "Purge Deleted")!.click();
    const actions = root.querySelectorAll<HTMLButtonElement>(
      ".table-wrap tbody tr .action-group button",
    );
    actions[0].click();
    actions[1].click();
    actions[2].click();
    await flush();
    assert.deepEqual(dispatched, [
      { action: "hostCommand", payload: { command: "runSynthesizeTopic" } },
      {
        action: "hostCommand",
        payload: { command: "purgeDeletedTopicArtifacts" },
      },
      {
        action: "hostCommand",
        payload: { command: "openTopicArtifact", args: { topicId: "t-1" } },
      },
      {
        action: "hostCommand",
        payload: {
          command: "submitTopicSynthesisUpdate",
          args: { topicId: "t-1" },
        },
      },
      {
        action: "hostCommand",
        payload: { command: "deleteTopicArtifact", args: { topicId: "t-1" } },
      },
    ]);
  });

  it("disables the update button when the row has no update intent", function () {
    const { root } = renderRegion(
      makeSelection({ rows: [makeRow({ updateAvailable: false })] }),
    );
    const update = buttonByText(
      root.querySelector(".table-wrap tbody tr")!,
      "Update",
    )!;
    assert.isTrue(update.disabled);
    assert.isFalse(
      buttonByText(root.querySelector(".table-wrap tbody tr")!, "Open")!
        .disabled,
    );
  });

  it("renders pending host commands as busy buttons", function () {
    const { root } = renderRegion(
      makeSelection({
        pendingOperationKeys: ["runSynthesizeTopic", "deleteTopicArtifact:t-1"],
      }),
    );
    const create = buttonByText(root, "Create Topic")!;
    assert.isTrue(create.disabled);
    assert.ok(create.classList.contains("is-busy"));
    assert.equal(create.getAttribute("aria-busy"), "true");
    assert.ok(create.querySelector(".button-spinner"));
    const rowDelete = buttonByText(
      root.querySelector(".table-wrap tbody tr")!,
      "Delete",
    )!;
    assert.isTrue(rowDelete.disabled);
    assert.ok(rowDelete.classList.contains("is-busy"));
    assert.isFalse(buttonByText(root, "Purge Deleted")!.disabled);
  });

  it("renders the grid view with cards that open the topic artifact", async function () {
    const { root, dispatched } = renderRegion(
      makeSelection({
        viewMode: "grid",
        rows: [makeRow({ definition: "", summary: "legacy summary" })],
      }),
    );
    const grid = root.querySelector(".topic-grid.panel-grid")!;
    const card = grid.querySelector<HTMLButtonElement>(".topic-card")!;
    assert.equal(
      card.querySelector(".topic-card-head strong")!.textContent,
      "Graph Neural Networks",
    );
    assert.equal(
      card.querySelector(".topic-card-summary")!.textContent,
      "No topic definition is available yet.",
    );
    assert.ok(card.querySelector(".topic-meter"));
    card.querySelector<HTMLButtonElement>(".topic-card-body")!.click();
    await flush();
    assert.deepEqual(dispatched, [
      {
        action: "hostCommand",
        payload: { command: "openTopicArtifact", args: { topicId: "t-1" } },
      },
    ]);
  });

  it("renders empty states for both the empty-library and filtered cases", function () {
    const emptyLibrary = renderRegion(
      makeSelection({ rows: [], hasAnyTopics: false }),
    );
    const empty = emptyLibrary.root.querySelector(".empty-state")!;
    assert.ok(empty.classList.contains("empty-state-info"));
    assert.equal(
      empty.querySelector(".empty-state-title")!.textContent,
      "No synthesis topics yet",
    );
    assert.ok(
      empty.querySelector(".empty-state-actions button"),
      "empty state offers Create Topic",
    );

    const filtered = renderRegion(makeSelection({ rows: [] }));
    assert.equal(
      filtered.root.querySelector(".empty-state-title")!.textContent,
      "No topics match the current filters",
    );
  });

  it("shows the deleted artifacts note only when deleted artifacts exist", function () {
    const { root } = renderRegion(makeSelection({ deletedCount: 3 }));
    const note = root.querySelector("p.muted")!;
    assert.equal(note.textContent, "3 deleted artifact(s) waiting for purge.");
  });

  it("renders the graph view with summary, svg edges, and positioned nodes", function () {
    const { root } = renderRegion(
      makeSelection({ viewMode: "graph", graph: makeGraph() }),
    );
    const summary = root.querySelector(".topic-graph-summary")!;
    const badges = Array.from(summary.querySelectorAll(".badge")).map(
      (badge) => badge.textContent,
    );
    assert.deepEqual(badges, ["3 topics", "1 relations", "Hierarchy"]);

    const canvas = root.querySelector(".topic-graph-canvas.mode-hierarchy")!;
    const paths = canvas.querySelectorAll("svg path.topic-graph-link");
    assert.equal(paths.length, 1);
    assert.equal(
      paths[0].getAttribute("class"),
      "topic-graph-link relation-broader_than status-confirmed",
    );
    assert.equal(
      paths[0].getAttribute("marker-end"),
      "url(#topic-graph-arrow)",
    );

    const nodes = canvas.querySelectorAll<HTMLButtonElement>(
      "button.topic-graph-node",
    );
    assert.equal(nodes.length, 3);
    const rootNode = Array.from(nodes).find(
      (node) =>
        node.querySelector(".topic-node-title")!.textContent === "Alpha",
    )!;
    assert.ok(rootNode.classList.contains("role-root"));
    const gammaNode = Array.from(nodes).find(
      (node) =>
        node.querySelector(".topic-node-title")!.textContent === "Gamma",
    )!;
    assert.ok(gammaNode.classList.contains("role-linked"));
    const betaNode = Array.from(nodes).find(
      (node) => node.querySelector(".topic-node-title")!.textContent === "Beta",
    )!;
    assert.ok(
      betaNode.classList.contains("active"),
      "inspector topic is marked selected",
    );

    const legend = canvas.querySelectorAll(".topic-graph-legend-item");
    assert.equal(legend.length, 4);
  });

  it("dispatches setTopicGraphView for mode, search, and node clicks", async function () {
    const { root, dispatched } = renderRegion(
      makeSelection({ viewMode: "graph", graph: makeGraph() }),
    );
    buttonByText(root, "Neighborhood")!.click();
    const search = root.querySelector<HTMLInputElement>(
      ".topic-graph-controls input",
    )!;
    dispatchInput(search, "beta");
    const betaNode = Array.from(
      root.querySelectorAll<HTMLButtonElement>("button.topic-graph-node"),
    ).find(
      (node) => node.querySelector(".topic-node-title")!.textContent === "Beta",
    )!;
    betaNode.click();
    await flush();
    assert.deepEqual(dispatched, [
      { action: "setTopicGraphView", payload: { mode: "neighborhood" } },
      { action: "setTopicGraphView", payload: { search: "beta" } },
      {
        action: "setTopicGraphView",
        payload: { selectedTopicId: "t-b", mode: "neighborhood" },
      },
    ]);
  });

  it("keeps the unplaced mode when clicking a node in unplaced view", async function () {
    const { root, dispatched } = renderRegion(
      makeSelection({
        viewMode: "graph",
        graph: makeGraph({ mode: "unplaced" }),
      }),
    );
    root.querySelector<HTMLButtonElement>("button.topic-graph-node")!.click();
    await flush();
    assert.deepEqual(dispatched, [
      {
        action: "setTopicGraphView",
        payload: { selectedTopicId: "t-a", mode: "unplaced" },
      },
    ]);
  });

  it("renders the inspector and navigates relations via setTopicGraphView", async function () {
    const { root, dispatched } = renderRegion(
      makeSelection({ viewMode: "graph", graph: makeGraph() }),
    );
    const inspector = root.querySelector(".topic-inspector")!;
    assert.equal(inspector.querySelector("h4")!.textContent, "Beta");
    assert.equal(
      inspector.querySelector(".topic-definition")!.textContent,
      "Beta definition",
    );
    const metrics = inspector.querySelectorAll(".metric-grid .metric");
    assert.equal(metrics.length, 3);
    const openDetails = buttonByText(inspector, "Open details")!;
    openDetails.click();
    const parentLink = inspector.querySelector<HTMLButtonElement>(
      ".relation-section .link-button",
    )!;
    parentLink.click();
    await flush();
    assert.deepEqual(dispatched, [
      {
        action: "hostCommand",
        payload: { command: "openTopicArtifact", args: { topicId: "t-b" } },
      },
      {
        action: "setTopicGraphView",
        payload: { selectedTopicId: "t-a", mode: "neighborhood" },
      },
    ]);

    const noSelection = renderRegion(
      makeSelection({
        viewMode: "graph",
        graph: makeGraph({ inspector: null }),
      }),
    );
    assert.equal(
      noSelection.root.querySelector(".topic-inspector .empty")!.textContent,
      "No topic selected.",
    );
  });

  it("renders the review panel, pages the queue, and dispatches review actions", async function () {
    const queue: TopicRelationReviewEntry[] = [
      {
        key: "suggestion:e-1",
        kind: "suggestion",
        edgeId: "e-1",
        sourceTitle: "Alpha",
        targetTitle: "Beta",
        relation: "broader_than",
        status: "suggested",
        confidence: "high",
        evidence: ["ref-1"],
        body: "",
      },
      {
        key: "review:r-1",
        kind: "review",
        reviewId: "r-1",
        sourceTitle: "Beta",
        targetTitle: "Gamma",
        relation: "overlaps_with",
        status: "open",
        confidence: "low",
        body: "",
      },
    ];
    const { root, dispatched } = renderRegion(
      makeSelection({
        viewMode: "graph",
        graph: makeGraph({ reviewQueue: queue }),
      }),
    );
    const panel = root.querySelector(".topic-review-panel")!;
    assert.equal(
      panel.querySelector(".inline-review-header strong")!.textContent,
      "Topic relation review",
    );
    assert.equal(
      panel.querySelector(".inline-review-header .muted")!.textContent,
      "1 / 2",
    );
    const card = panel.querySelector(".topic-relation-review-card")!;
    const nodes = card.querySelectorAll(".topic-relation-review-node strong");
    assert.equal(nodes[0].textContent, "Alpha");
    assert.equal(nodes[1].textContent, "Beta");
    assert.equal(
      card.querySelector(".topic-relation-review-relation strong")!.textContent,
      "broader than",
    );
    const metadata = card.querySelectorAll(".review-card-metadata .detail-row");
    assert.isAbove(metadata.length, 0, "metadata rows rendered");

    buttonByText(card, "Accept")!.click();
    await flush();
    assert.deepEqual(dispatched, [
      {
        action: "hostCommand",
        payload: {
          command: "acceptTopicGraphRelation",
          args: { edgeId: "e-1" },
        },
      },
    ]);

    const controls = panel.querySelectorAll<HTMLButtonElement>(
      ".review-drawer-controls button",
    );
    controls[1].click();
    await flush();
    assert.equal(
      panel.querySelector(".inline-review-header .muted")!.textContent,
      "2 / 2",
    );
    const reviewCard = panel.querySelector(".topic-relation-review-card")!;
    assert.equal(
      reviewCard.querySelector(".review-card-body")!.textContent,
      "Review whether this low-confidence relation proposal should become a suggested topic graph edge.",
    );
    buttonByText(reviewCard, "Approve")!.click();
    await flush();
    assert.deepEqual(dispatched[1], {
      action: "hostCommand",
      payload: {
        command: "applyTopicGraphReviewAction",
        args: { reviewId: "r-1", action: "approve_suggested" },
      },
    });

    controls[2].click();
    await flush();
    assert.ok(panel.classList.contains("is-collapsed"));
    assert.isNull(panel.querySelector(".topic-relation-review-card"));
  });

  it("keeps the region subtree identity across equal re-renders", async function () {
    const selection = makeSelection({ viewMode: "graph", graph: makeGraph() });
    const { root, rerender } = renderRegion(selection);
    const captured = captureRegionSubtrees({ topics: root });

    rerender(makeSelection({ viewMode: "graph", graph: makeGraph() }));
    await flush();
    assertRegionSubtreesPreserved({ topics: root }, captured);

    rerender(makeSelection({ viewMode: "list", deletedCount: 2 }));
    await flush();
    assert.equal(
      root.querySelector("p.muted")!.textContent,
      "2 deleted artifact(s) waiting for purge.",
    );
  });

  it("buildTopicRelationReviewQueue filters resolved entries and orders suggestions first", function () {
    const queue = buildTopicRelationReviewQueue({
      suggestions: [
        {
          edgeId: "e-keep",
          sourceTopicId: "t-a",
          targetTopicId: "t-x",
          relation: "broader_than",
          status: "suggested",
        },
        {
          edgeId: "e-drop",
          sourceTopicId: "t-a",
          targetTopicId: "t-b",
          relation: "related_to",
          status: "suggested",
        },
      ],
      relationReviews: [
        {
          reviewId: "r-1",
          sourceTopicId: "t-b",
          targetTopicId: "t-c",
          targetTitle: "",
          relation: "overlaps_with",
          status: "open",
          reason: "low confidence",
        },
      ],
      nodes: [
        {
          topicId: "t-a",
          title: "Alpha",
          paperCount: 1,
          nodeType: "materialized",
          isTop: true,
          relationStatuses: [],
        },
        {
          topicId: "t-c",
          title: "Gamma",
          paperCount: 1,
          nodeType: "virtual",
          isTop: false,
          relationStatuses: [],
        },
      ],
      isResolved: (kind, id) => kind === "topic-edge" && id === "e-drop",
    });
    assert.deepEqual(
      queue.map((entry) => entry.key),
      ["suggestion:e-keep", "review:r-1"],
    );
    assert.equal(queue[0].sourceTitle, "Alpha");
    assert.equal(queue[0].targetTitle, "t-x", "falls back to the raw topic id");
    assert.equal(
      queue[1].targetTitle,
      "Gamma",
      "review target title resolves through the node map",
    );
  });

  it("topic relation review queue keeps only suggested edges and open reviews", function () {
    const queue = buildTopicRelationReviewQueue({
      suggestions: [
        {
          edgeId: "e-suggested",
          sourceTopicId: "t-a",
          targetTopicId: "t-b",
          relation: "broader_than",
          status: "suggested",
        },
        {
          edgeId: "e-confirmed",
          sourceTopicId: "t-a",
          targetTopicId: "t-c",
          relation: "broader_than",
          status: "confirmed",
        },
        {
          edgeId: "e-rejected",
          sourceTopicId: "t-a",
          targetTopicId: "t-d",
          relation: "related_to",
          status: "rejected",
        },
      ],
      relationReviews: [
        {
          reviewId: "r-open",
          sourceTopicId: "t-a",
          targetTopicId: "t-b",
          targetTitle: "",
          relation: "overlaps_with",
          status: "open",
          reason: "low confidence",
        },
        {
          reviewId: "r-approved",
          sourceTopicId: "t-a",
          targetTopicId: "t-b",
          targetTitle: "",
          relation: "broader_than",
          status: "approved",
          reason: "",
        },
        {
          reviewId: "r-rejected",
          sourceTopicId: "t-a",
          targetTopicId: "t-b",
          targetTitle: "",
          relation: "related_to",
          status: "rejected",
          reason: "",
        },
      ],
      nodes: [],
      isResolved: () => false,
    });
    assert.deepEqual(
      queue.map((entry) => entry.key),
      ["review:r-open"],
      "resolved edges and closed reviews leave the Topics review area",
    );
  });

  it("narrowers drop non-record wire entries defensively", function () {
    assert.deepEqual(narrowTopicArtifactRows([null, 42, "x"]), []);
    assert.equal(narrowTopicArtifactRows(undefined).length, 0);
    assert.isNull(narrowTopicGraphInspector("garbage"));
    const inspector = narrowTopicGraphInspector({
      topic: { topic_id: "t-1", title: "One", paper_count: 2 },
      parents: [{}],
      related: [{ node: "bad" }],
      suggestedCount: 4,
    });
    assert.ok(inspector);
    assert.equal(inspector!.topic!.topicId, "t-1");
    assert.equal(inspector!.suggestedCount, 4);
    assert.equal(inspector!.related.length, 0);
  });
});

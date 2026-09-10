import { assert } from "chai";

import {
  captureRegionSubtrees,
  assertRegionSubtreesPreserved,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import type {
  SynthesisWorkbenchGraphPagePayload,
  SynthesisWorkbenchHostMessage,
  SynthesisWorkbenchSurfacePayload,
} from "../../src/shared/synthesisWorkbenchWireContract";
import { createSynthesisWorkbenchChromeRenderer } from "../../src/synthesis/synthesisWorkbenchChromeRenderer";
import {
  createSynthesisWorkbenchController,
  bootstrapSynthesisWorkbench,
  type SynthesisWorkbenchControllerDeps,
} from "../../src/synthesis/synthesisWorkbenchApp";
import { projectSynthesisWorkbenchPanel } from "../../src/synthesis/synthesisWorkbenchPanelModel";
import { synthesisWorkbenchSurfaceForTab } from "../../src/synthesis/synthesisWorkbenchPanelModel";
import type {
  SynthesisWorkbenchPageSnapshot,
  SynthesisWorkbenchPanel,
} from "../../src/synthesis/synthesisWorkbenchTypes";

function makeSnapshot(
  overrides: Partial<SynthesisWorkbenchPageSnapshot> = {},
): SynthesisWorkbenchPageSnapshot {
  return {
    libraryId: 1,
    selectedTab: "overview",
    actions: {
      inFlight: [],
      warnings: [],
    },
    maintenance: {
      summary: null,
      backgroundJobs: {
        rows: [],
        activeCount: 0,
        submittedCount: 0,
        queuedCount: 0,
        runningCount: 0,
        waitingCount: 0,
        failedCount: 0,
      },
    },
    storage: { rootState: "ready" },
    preferences: {
      sourceWatchEnabled: true,
      registryAutoRebuild: true,
      graphRebuildMode: "auto",
      stalenessScanEnabled: true,
      debounceMs: 500,
      startupHashCheck: true,
    },
    sync: {
      status: "ready",
      diagnostics: [],
      allowedActions: [],
      requiresConfirmation: false,
    },
    conflicts: { candidates: [] },
    deletedArtifacts: { count: 0, rows: [] },
    artifacts: {
      filters: {
        search: "",
        sourceMaterials: "all",
        freshness: "all",
        sort: "title",
        viewMode: "list",
      },
      rows: [],
      visibleRows: [],
    },
    registry: {
      filters: {
        activeIndexTool: "none",
        search: "",
        scope: "library",
        artifactCoverage: "all",
        bindingStatus: "all",
        canonicalSearch: "",
        canonicalBinding: "all",
        canonicalGraph: "all",
        canonicalRedirects: "all",
        canonicalProposals: "all",
        canonicalDuplicates: "all",
        reviewDrawerOpen: false,
        reviewDrawerIndex: 0,
        expandedSourceRefs: [],
      },
      rows: [],
      visibleRows: [],
      cleanupProposals: [],
      matchProposals: [],
      matchTargetCandidates: [],
      canonicalRows: [],
      visibleCanonicalRows: [],
      canonicalDiagnostics: [],
      cacheStatus: {
        cache_key: "reference-sidecar:library",
        status: "ready",
        diagnostics: [],
        allowedActions: [],
      },
    },
    reviews: {
      filters: {
        activeTab: "reference_matching",
        search: "",
        status: "open",
        kind: "all",
        confidence: "all",
      },
      summary: {
        openCount: 0,
        indexCount: 0,
        referenceMatchingCount: 0,
        conceptCount: 0,
        topicGraphCount: 0,
      },
    },
    tags: {
      filters: {
        search: "",
        facet: "all",
        status: "all",
        view: "vocabulary",
        stagedSearch: "",
        stagedFacet: "all",
        selectedStagedTags: [],
        selectedVocabularyTags: [],
        density: "compact",
        expandedRows: {},
        importDraft: "",
      },
      facets: [],
      rows: [],
      visibleRows: [],
      stagedRows: [],
      visibleStagedRows: [],
      stagedCount: 0,
      stagedFacets: [],
      validationWarnings: [],
      projection: { target: "", stale: false, diagnostics: [] },
      manifest: {},
      importDraft: "",
    },
    topicGraph: {
      filters: { mode: "hierarchy", search: "" },
      nodes: [],
      edges: [],
      reviewItems: [],
      visibleNodes: [],
      visibleEdges: [],
      inspector: null,
      manifest: {},
      projection: { target: "", stale: false, diagnostics: [] },
      diagnostics: [],
    },
    concepts: {
      filters: {
        search: "",
        conceptType: "all",
        status: "all",
        topicId: "all",
        overlayEnabled: false,
        reviewMergeTargets: {},
      },
      rows: [],
      visibleRows: [],
      senses: [],
      aliases: [],
      relations: [],
      reviewItems: [],
      overlayEntries: [],
      conceptTypes: [],
      projection: { target: "", stale: false, diagnostics: [] },
      manifest: {},
      diagnostics: [],
    },
    graph: {
      filters: {
        search: "",
        role: "all",
        topicId: "all",
        layoutAlgorithm: "force",
        neighborhoodDepth: 1,
        nodeKinds: [
          "library_paper",
          "external_reference",
          "unresolved_reference",
        ],
        showLowSignalReferences: true,
      },
      graph_hash: "gh-1",
      layoutStatus: "ready",
      layoutAlgorithm: "force",
      nodeKinds: [
        "library_paper",
        "external_reference",
        "unresolved_reference",
      ],
      showLowSignalReferences: true,
      topicScopes: [],
      nodes: [],
      edges: [],
      hoverOnlyNodes: [],
      hoverOnlyEdges: [],
      diagnostics: {},
      window: {
        hasMore: false,
        totalNodes: 0,
        totalEdges: 0,
        totalHoverNodes: 0,
        totalHoverEdges: 0,
        loadedNodes: 0,
        loadedEdges: 0,
        querySignature: "qs-1",
        status: "complete",
        roleOptions: [],
      },
      visibleNodes: [],
      visibleEdges: [],
    },
    reader: { topicId: "", previousTab: "artifacts" },
    hostCommands: [],
    ...overrides,
  };
}

function makeControllerDeps() {
  const actions: Array<{ action: string; payload: Record<string, unknown> }> =
    [];
  const panels: Array<SynthesisWorkbenchPanel | null> = [];
  const graphPages: SynthesisWorkbenchGraphPagePayload[] = [];
  const deps: SynthesisWorkbenchControllerDeps = {
    sendAction: (action, payload) => {
      actions.push({ action, payload: payload || {} });
    },
    renderPanel: (panel) => {
      panels.push(panel);
    },
    now: () => 1_000_000,
    onGraphPage: (payload) => {
      graphPages.push(payload);
    },
  };
  return { deps, actions, panels, graphPages };
}

function surfaceMessage(
  surface: string,
  requestId: number,
  snapshot: SynthesisWorkbenchPageSnapshot,
): SynthesisWorkbenchHostMessage {
  const payload: SynthesisWorkbenchSurfacePayload = {
    surface: surface as SynthesisWorkbenchSurfacePayload["surface"],
    requestId,
    snapshot,
  };
  return { type: "synthesis:surface", payload };
}

describe("synthesis workbench scaffold (src/synthesis)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  function renderPanelIntoRoot(panel: SynthesisWorkbenchPanel | null) {
    const dispatched: Array<{ action: string; payload: unknown }> = [];
    const uiPatches: unknown[] = [];
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);
    const renderer = createSynthesisWorkbenchChromeRenderer({
      root,
      sendAction: (action, payload) => {
        dispatched.push({ action, payload: payload || {} });
      },
      dispatchAction: (action, payload) => {
        dispatched.push({ action, payload: payload || {} });
      },
      onUiChange: (patch) => uiPatches.push(patch),
    });
    renderer.renderPanel(panel);
    return { root, dispatched, uiPatches, renderer };
  }

  function projectHosted(
    snapshot: SynthesisWorkbenchPageSnapshot,
    ui: { sidebarExpanded: boolean; jobPopoverOpen: boolean } = {
      sidebarExpanded: false,
      jobPopoverOpen: false,
    },
  ) {
    return projectSynthesisWorkbenchPanel(snapshot, ui, {
      hostShape: "hosted",
      i18n: {
        locale: "en-US",
        messages: {} as never,
      },
      localPendingActions: new Map(),
      statusbarExpirations: new Map(),
      now: 1_000_000,
      readerTitle: "",
      visibleSurface: synthesisWorkbenchSurfaceForTab(snapshot.selectedTab),
    });
  }

  for (const [tab, region] of [
    ["overview", "home"],
    ["artifacts", "topics"],
    ["concepts", "concepts"],
    ["registry", "registry"],
    ["tags", "tags"],
    ["reviews", "review-center"],
    ["reader", "reader"],
  ] as const) {
    it(`mounts the ${tab} business surface from a delivered snapshot`, function () {
      const { root, renderer } = renderPanelIntoRoot(
        projectHosted(makeSnapshot({ selectedTab: tab })),
      );
      assert.ok(
        root.querySelector(`[data-region-content="synthesis-${region}"]`),
      );
      assert.isNull(
        root.querySelector('[data-synthesis-surface$="-placeholder"]'),
      );
      renderer.renderPanel(null);
    });
  }

  it("bootstrap delivers host messages and detaches its listener on disposal", function () {
    const root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);
    const page = bootstrapSynthesisWorkbench({ root });
    window.dispatchEvent(
      new window.MessageEvent("message", {
        data: { type: "synthesis:snapshot", payload: makeSnapshot() },
      }),
    );
    assert.ok(root.querySelector('[data-region-content="synthesis-home"]'));
    page.dispose();
    window.dispatchEvent(
      new window.MessageEvent("message", {
        data: {
          type: "synthesis:snapshot",
          payload: makeSnapshot({ selectedTab: "tags" }),
        },
      }),
    );
    assert.isNull(root.querySelector("[data-region-content]"));
  });

  it("ignores graph pages after leaving the graph owner and rejects older generations", function () {
    const { deps } = makeControllerDeps();
    const controller = createSynthesisWorkbenchController(deps);
    const graphSnapshot = makeSnapshot({ selectedTab: "graph" });
    controller.handleHostMessage({
      type: "synthesis:snapshot",
      payload: graphSnapshot,
    });
    controller.handleHostMessage({
      type: "synthesis:graph-page",
      payload: {
        surface: "graph",
        requestId: 2,
        generation: 3,
        snapshot: graphSnapshot,
      },
    });
    controller.handleHostMessage({
      type: "synthesis:graph-page",
      payload: {
        surface: "graph",
        requestId: 3,
        generation: 2,
        snapshot: graphSnapshot,
      },
    });
    assert.equal(controller.state.latestGraphPage?.generation, 3);
    controller.dispatch("selectTab", { tab: "tags" });
    controller.handleHostMessage({
      type: "synthesis:graph-page",
      payload: {
        surface: "graph",
        requestId: 4,
        generation: 4,
        snapshot: graphSnapshot,
      },
    });
    assert.equal(controller.state.snapshot?.selectedTab, "tags");
    assert.equal(controller.state.latestGraphPage?.generation, 3);
  });

  it("renders the shell nav with 7 tabs and no reader entry", function () {
    const { root } = renderPanelIntoRoot(projectHosted(makeSnapshot()));
    const shell = root.querySelector('[data-role="synthesis-shell"]');
    assert.ok(shell, "shell container exists");
    const buttons = shell!.querySelectorAll("button[data-synthesis-tab]");
    assert.equal(buttons.length, 7);
    const tabs = Array.from(buttons).map((button) =>
      button.getAttribute("data-synthesis-tab"),
    );
    assert.deepEqual(tabs, [
      "overview",
      "artifacts",
      "concepts",
      "graph",
      "registry",
      "tags",
      "reviews",
    ]);
    assert.notInclude(tabs, "reader");
    assert.ok(buttons[0].classList.contains("active"), "home tab is active");
  });

  it("tab click dispatches the legacy selectTab action", function () {
    const { root, dispatched } = renderPanelIntoRoot(
      projectHosted(makeSnapshot()),
    );
    const buttons = root.querySelectorAll<HTMLButtonElement>(
      "button[data-synthesis-tab]",
    );
    buttons[3].click();
    assert.deepEqual(dispatched, [
      { action: "selectTab", payload: { tab: "graph" } },
    ]);
  });

  it("renders the chrome statusbar: idle ready state and busy job state", function () {
    const idle = renderPanelIntoRoot(projectHosted(makeSnapshot()));
    const statusbar = idle.root.querySelector(".action-statusbar");
    assert.ok(statusbar, "statusbar exists");
    assert.ok(statusbar!.classList.contains("is-idle"));
    assert.isNull(statusbar!.querySelector(".action-statusbar-job-button"));

    const busy = renderPanelIntoRoot(
      projectHosted(
        makeSnapshot({
          maintenance: {
            summary: null,
            backgroundJobs: {
              rows: [
                {
                  job_id: "job-1",
                  source: "webdav_sync",
                  status: "running",
                  label: "WebDAV sync",
                  progress: { mode: "determinate", percent: 40 },
                },
              ],
              activeCount: 1,
              submittedCount: 0,
              queuedCount: 0,
              runningCount: 1,
              waitingCount: 0,
              failedCount: 0,
            },
          },
        }),
      ),
    );
    const busyBar = busy.root.querySelector(".action-statusbar");
    assert.ok(busyBar!.classList.contains("is-busy"));
    assert.equal(
      busyBar!.querySelector(".action-statusbar-message")?.textContent,
      "WebDAV sync",
    );
    const jobButton = busy.root.querySelector<HTMLButtonElement>(
      ".action-statusbar-job-button",
    );
    assert.ok(jobButton, "job button rendered when jobs exist");
    jobButton!.click();
    assert.deepEqual(busy.dispatched, [
      { action: "toggleJobPopover", payload: {} },
    ]);
  });

  it("renders the job popover and dispatches hostCommand for command jobs", function () {
    const { root, dispatched } = renderPanelIntoRoot(
      projectHosted(
        makeSnapshot({
          maintenance: {
            summary: null,
            backgroundJobs: {
              rows: [
                {
                  job_id: "job-9",
                  source: "workbench",
                  status: "queued",
                  label: "Rebuild",
                  command: "rebuildCitationGraphCacheNow",
                },
              ],
              activeCount: 1,
              submittedCount: 0,
              queuedCount: 1,
              runningCount: 0,
              waitingCount: 0,
              failedCount: 0,
            },
          },
        }),
        { sidebarExpanded: false, jobPopoverOpen: true },
      ),
    );
    const popover = root.querySelector(".action-statusbar-job-popover");
    assert.ok(popover, "popover open");
    const row = popover!.querySelector<HTMLButtonElement>(
      ".action-statusbar-job-row",
    );
    assert.ok(row);
    row!.click();
    assert.deepEqual(dispatched, [
      {
        action: "hostCommand",
        payload: { command: "rebuildCitationGraphCacheNow", args: {} },
      },
    ]);
  });

  it("renders the sidecar runtime indicator in the topbar controls", function () {
    const { root } = renderPanelIntoRoot(
      projectHosted(
        makeSnapshot({
          sidecarStatus: {
            lifecycle: "ready",
            recoveryState: "none",
            serviceVersion: "1.2.3",
            serviceInstanceId: "instance-abcdef",
          },
        }),
      ),
    );
    const indicator = root.querySelector(
      '[data-role="synthesis-topbar"] .sidecar-runtime-indicator',
    );
    assert.ok(indicator, "indicator lives in the topbar");
    assert.ok(indicator!.classList.contains("is-ready"));
    assert.equal(
      indicator!.querySelector(".sidecar-runtime-label")?.textContent,
      "Sidecar ready",
    );
    assert.isNull(indicator!.querySelector(".sidecar-runtime-diagnostics"));

    const error = renderPanelIntoRoot(
      projectHosted(
        makeSnapshot({
          sidecarStatus: {
            lifecycle: "incompatible",
            recoveryState: "manual-recovery-required",
            reasonCode: "schema_mismatch",
          },
        }),
      ),
    );
    const errorIndicator = error.root.querySelector(
      ".sidecar-runtime-indicator",
    );
    assert.ok(errorIndicator!.classList.contains("is-error"));
    const diagnostics = error.root.querySelector<HTMLButtonElement>(
      ".sidecar-runtime-diagnostics",
    );
    assert.ok(diagnostics, "error state offers the diagnostics action");
    diagnostics!.click();
    assert.deepEqual(error.dispatched, [
      { action: "openSynthesisSidecarDiagnostics", payload: {} },
    ]);
  });

  it("keeps region subtree identity when an equal panel re-renders", function () {
    const { root, renderer } = renderPanelIntoRoot(
      projectHosted(makeSnapshot()),
    );
    const regions = {
      shell: root.querySelector('[data-region-mount="shell"]')!,
      topbar: root.querySelector('[data-region-mount="topbar"]')!,
      sidecar: root.querySelector('[data-region-mount="sidecar"]')!,
      surface: root.querySelector('[data-region-mount="surface"]')!,
      chrome: root.querySelector('[data-region-mount="chrome"]')!,
    };
    const captured = captureRegionSubtrees(regions);

    // Same visible content, fresh object graph: no region node is rebuilt.
    renderer.renderPanel(projectHosted(makeSnapshot()));
    assertRegionSubtreesPreserved(regions, captured);

    // A chrome-only change rebuilds chrome but not the shell/surface.
    renderer.renderPanel(
      projectHosted(
        makeSnapshot({
          actions: {
            inFlight: [],
            warnings: [],
            lastCompleted: {
              key: "op-1",
              command: "runSynthesizeTopic",
              status: "completed",
              label: "Create Topic",
              completed_at: "2026-09-05T00:00:00.000Z",
            },
          },
        }),
      ),
    );
    const chromeAfter = root.querySelector(
      '[data-region-mount="chrome"]',
    ) as HTMLElement;
    assert.ok(
      chromeAfter
        .querySelector(".action-statusbar")!
        .classList.contains("is-ok"),
      "chrome reflects the completed operation",
    );
    assertRegionSubtreesPreserved(
      {
        shell: regions.shell,
        topbar: regions.topbar,
        sidecar: regions.sidecar,
        surface: regions.surface,
      },
      captured,
    );
  });

  it("standalone host shapes drop hosted chrome without touching components", function () {
    const snapshot = makeSnapshot({ selectedTab: "reader" });
    const topicPanel = projectSynthesisWorkbenchPanel(
      snapshot,
      { sidebarExpanded: false, jobPopoverOpen: false },
      {
        hostShape: "standaloneTopicExport",
        i18n: { locale: "en-US", messages: {} as never },
        localPendingActions: new Map(),
        statusbarExpirations: new Map(),
        now: 1_000_000,
        readerTitle: "My Topic",
        visibleSurface: "reader",
      },
    );
    assert.isNull(topicPanel!.shell);
    assert.isNull(topicPanel!.chrome);
    assert.isNull(topicPanel!.sidecar);
    assert.equal(topicPanel!.topbar?.title, "My Topic");

    const graphPanel = projectSynthesisWorkbenchPanel(
      makeSnapshot({ selectedTab: "graph" }),
      { sidebarExpanded: false, jobPopoverOpen: false },
      {
        hostShape: "standaloneGraphOnly",
        i18n: { locale: "en-US", messages: {} as never },
        localPendingActions: new Map(),
        statusbarExpirations: new Map(),
        now: 1_000_000,
        readerTitle: "",
        visibleSurface: "graph",
      },
    );
    assert.isNull(graphPanel!.shell);
    assert.isNull(graphPanel!.topbar);
    assert.isNull(graphPanel!.chrome);
    assert.isNull(graphPanel!.surface);
  });

  it("controller drops stale surface payloads per surface", function () {
    const { deps, panels } = makeControllerDeps();
    const controller = createSynthesisWorkbenchController(deps);
    controller.handleHostMessage({
      type: "synthesis:snapshot",
      payload: makeSnapshot({ selectedTab: "artifacts" }),
    });
    const baselinePanels = panels.length;

    controller.handleHostMessage(
      surfaceMessage("topics", 2, makeSnapshot({ selectedTab: "artifacts" })),
    );
    const afterV2 = controller.state.snapshot;
    assert.ok(afterV2, "surface payload applied");

    // Stale requestId for the same surface must be dropped entirely.
    controller.handleHostMessage(
      surfaceMessage(
        "topics",
        1,
        makeSnapshot({
          selectedTab: "artifacts",
          libraryId: 99,
        }),
      ),
    );
    assert.strictEqual(
      controller.state.snapshot,
      afterV2,
      "stale surface payload must not overwrite the snapshot",
    );
    assert.equal(
      panels.length - baselinePanels,
      1,
      "only the fresh payload rendered",
    );
  });

  it("controller keeps non-visible surface payloads out of the snapshot", function () {
    const { deps } = makeControllerDeps();
    const controller = createSynthesisWorkbenchController(deps);
    controller.handleHostMessage({
      type: "synthesis:snapshot",
      payload: makeSnapshot({ selectedTab: "overview" }),
    });
    const hosted = controller.state.snapshot;

    controller.handleHostMessage(
      surfaceMessage(
        "graph",
        3,
        makeSnapshot({ selectedTab: "graph", libraryId: 42 }),
      ),
    );
    assert.strictEqual(
      controller.state.snapshot,
      hosted,
      "non-visible surface payload must not replace the visible snapshot",
    );
    assert.equal(
      controller.state.surfaces.graph?.status,
      "ready",
      "surface runtime still tracks the off-screen surface",
    );
    assert.equal(
      controller.state.surfaces.graph?.snapshot?.libraryId,
      42,
      "surface runtime caches the off-screen snapshot",
    );
  });

  it("controller accumulates matching graph pages and replaces changed generations", function () {
    const { deps, graphPages } = makeControllerDeps();
    const controller = createSynthesisWorkbenchController(deps);
    const base = makeSnapshot({ selectedTab: "graph" });
    const node = (id: string) => ({
      id,
      label: id,
      kind: "library_paper" as const,
    });
    const page = (
      requestId: number,
      generation: number,
      nodes: ReturnType<typeof node>[],
    ) =>
      ({
        type: "synthesis:graph-page",
        payload: {
          surface: "graph",
          requestId,
          generation,
          snapshot: {
            ...base,
            graph: {
              ...base.graph,
              nodes,
              visibleNodes: nodes,
              window: {
                ...base.graph.window,
                hasMore: true,
                loadedNodes: nodes.length,
                totalNodes: nodes.length,
              },
            },
          },
        },
      }) satisfies SynthesisWorkbenchHostMessage;

    controller.handleHostMessage({ type: "synthesis:snapshot", payload: base });
    controller.handleHostMessage(page(4, 1, [node("n-1")]));
    assert.equal(
      graphPages.length,
      1,
      "graph page forwarded to the island seam",
    );
    assert.equal(
      controller.state.latestGraphPage?.snapshot?.graph.nodes.length,
      1,
    );

    controller.handleHostMessage(page(5, 1, [node("n-2")]));
    assert.deepEqual(
      controller.state.latestGraphPage?.snapshot?.graph.nodes.map(
        (entry) => entry.id,
      ),
      ["n-1", "n-2"],
      "matching generation pages accumulate by node id",
    );
    assert.equal(
      controller.state.latestGraphPage?.snapshot?.graph.window.loadedNodes,
      2,
    );

    controller.handleHostMessage(page(6, 2, [node("n-3")]));
    assert.deepEqual(
      controller.state.latestGraphPage?.snapshot?.graph.nodes.map(
        (entry) => entry.id,
      ),
      ["n-3"],
      "a changed generation replaces the previous owner window",
    );

    controller.handleHostMessage(page(3, 1, [node("n-stale")]));
    assert.equal(graphPages.length, 3, "stale request is dropped");
    assert.deepEqual(
      controller.state.latestGraphPage?.snapshot?.graph.nodes.map(
        (entry) => entry.id,
      ),
      ["n-3"],
      "older request cannot replace the fresh generation",
    );
  });

  it("keeps rendered surface content and drafts when refresh fails", function () {
    const { deps, panels } = makeControllerDeps();
    const { root, renderer } = renderPanelIntoRoot(null);
    const collectPanel = deps.renderPanel;
    deps.renderPanel = (panel) => {
      collectPanel(panel);
      renderer.renderPanel(panel);
    };
    const controller = createSynthesisWorkbenchController(deps);
    controller.handleHostMessage({
      type: "synthesis:snapshot",
      payload: makeSnapshot({ selectedTab: "tags" }),
    });
    controller.handleHostMessage(
      surfaceMessage("tags", 5, makeSnapshot({ selectedTab: "tags" })),
    );
    const before = panels.length;
    const business = panels.at(-1)?.business;
    const input = root.querySelector<HTMLInputElement>(
      'input[type="search"], input',
    );
    assert.ok(input);
    input!.value = "unfinished draft";
    input!.focus();

    controller.handleHostMessage({
      type: "synthesis:surface-error",
      payload: {
        surface: "tags",
        requestId: 6,
        code: "storage_busy",
        transient: true,
        message: "storage busy",
      },
    });
    assert.equal(controller.state.surfaces.tags?.status, "failed");
    assert.equal(controller.state.surfaces.tags?.errorCode, "storage_busy");
    assert.isTrue(controller.state.surfaces.tags?.transient);
    assert.ok(
      controller.state.surfaces.tags?.snapshot,
      "failed surface keeps its cached snapshot",
    );
    assert.isAbove(panels.length, before, "surface error repaints");
    assert.strictEqual(panels.at(-1)?.business, business);
    assert.isTrue(input!.isConnected);
    assert.equal(input!.value, "unfinished draft");
    assert.strictEqual(document.activeElement, input);
    assert.include(
      root.querySelector('[data-role="synthesis-chrome"]')?.textContent || "",
      "storage busy",
    );

    controller.handleHostMessage({
      type: "synthesis:surface-error",
      payload: { surface: "tags", requestId: 7, message: "refresh failed" },
    });
    assert.strictEqual(panels.at(-1)?.business, business);
    assert.isTrue(input!.isConnected);

    // A stale surface-error must not clobber the recorded failure.
    controller.handleHostMessage({
      type: "synthesis:surface-error",
      payload: { surface: "tags", requestId: 2, message: "stale failure" },
    });
    assert.equal(controller.state.surfaces.tags?.error, "refresh failed");
    controller.handleHostMessage({
      type: "synthesis:surface-error",
      payload: {
        surface: "tags",
        requestId: 8,
        message: "refresh failed",
        i18n: {
          locale: "zh-CN",
          messages: { "synthesis-tab-tags": "标签" },
        },
      },
    });
    assert.equal(panels.at(-1)?.business?.surface, "tags");
    assert.include(
      root.querySelector('[data-role="synthesis-shell"]')?.textContent || "",
      "标签",
    );
    assert.isTrue(input!.isConnected);
    renderer.renderPanel(null);
  });

  for (const priorLibrary of [undefined, 2]) {
    it(`shows an error without last-good data for the current owner (${priorLibrary ?? "cold"})`, function () {
      const { deps, panels } = makeControllerDeps();
      const controller = createSynthesisWorkbenchController(deps);
      if (priorLibrary) {
        controller.handleHostMessage({
          type: "synthesis:snapshot",
          payload: makeSnapshot({
            selectedTab: "tags",
            libraryId: priorLibrary,
          }),
        });
      }
      controller.handleHostMessage({
        type: "synthesis:snapshot",
        payload: makeSnapshot(),
      });
      controller.dispatch("selectTab", { tab: "tags" });
      controller.handleHostMessage({
        type: "synthesis:surface-error",
        payload: { surface: "tags", requestId: 3, message: "failed" },
      });
      assert.isUndefined(panels.at(-1)?.business);
      assert.isTrue(panels.at(-1)?.surface?.isError);
      assert.isUndefined(controller.state.surfaces.tags?.snapshot);
    });
  }

  it("keeps visible content when a hidden surface refresh fails", function () {
    const { deps, panels } = makeControllerDeps();
    const controller = createSynthesisWorkbenchController(deps);
    const tags = makeSnapshot({ selectedTab: "tags" });
    controller.handleHostMessage({ type: "synthesis:snapshot", payload: tags });
    controller.handleHostMessage({
      type: "synthesis:snapshot",
      payload: makeSnapshot(),
    });
    const visibleSnapshot = controller.state.snapshot;
    const business = panels.at(-1)?.business;
    controller.handleHostMessage({
      type: "synthesis:surface-error",
      payload: { surface: "tags", requestId: 4, message: "failed" },
    });
    assert.strictEqual(controller.state.snapshot, visibleSnapshot);
    assert.strictEqual(panels.at(-1)?.business, business);
    assert.deepEqual(controller.state.surfaces.tags?.snapshot, tags);
    assert.equal(controller.state.surfaces.tags?.status, "failed");
  });

  it("controller forwards actions to the host and tracks local pending host commands", function () {
    const { deps, actions } = makeControllerDeps();
    const controller = createSynthesisWorkbenchController(deps);
    controller.handleHostMessage({
      type: "synthesis:snapshot",
      payload: makeSnapshot(),
    });
    controller.dispatch("hostCommand", {
      command: "runSynthesizeTopic",
      args: {},
    });
    assert.deepEqual(actions, [
      {
        action: "hostCommand",
        payload: { command: "runSynthesizeTopic", args: {} },
      },
    ]);
    assert.equal(controller.state.localPendingActions.size, 1);

    // A snapshot echoing the operation as completed clears the local pending.
    controller.handleHostMessage({
      type: "synthesis:chrome",
      payload: makeSnapshot({
        actions: {
          inFlight: [],
          warnings: [],
          lastCompleted: {
            key: "runSynthesizeTopic",
            command: "runSynthesizeTopic",
            status: "completed",
            label: "Create Topic",
            completed_at: "2026-09-05T00:00:01.000Z",
          },
        },
      }),
    });
    assert.equal(controller.state.localPendingActions.size, 0);
  });

  it("shares reference review pending state between Registry and Review Center", function () {
    const { deps, panels } = makeControllerDeps();
    const controller = createSynthesisWorkbenchController(deps);
    controller.handleHostMessage({
      type: "synthesis:snapshot",
      payload: makeSnapshot({ selectedTab: "registry" }),
    });
    controller.dispatch("queueReferenceDecision", {
      proposalId: "proposal-1",
      action: "accept",
    });

    const registryPanel = panels.at(-1);
    assert.equal(registryPanel?.business?.surface, "index");
    assert.deepEqual(
      registryPanel?.business?.surface === "index"
        ? registryPanel.business.selection.review.pendingDecisions
        : [],
      [{ proposalId: "proposal-1", action: "accept" }],
    );

    controller.dispatch("selectTab", { tab: "reviews" });
    const reviewPanel = panels.at(-1);
    assert.deepEqual(
      reviewPanel?.referenceReview?.state.pendingDecisions,
      [{ proposalId: "proposal-1", action: "accept" }],
      "Review Center receives the same controller-owned queue",
    );
  });
});

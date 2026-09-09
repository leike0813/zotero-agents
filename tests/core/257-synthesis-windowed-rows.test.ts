import { assert } from "chai";
import { h, render } from "preact";
import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  formatSynthesisWorkbenchMessage,
} from "../../src/shared/synthesisWorkbenchI18nContract";
import type {
  SynthesisWorkbenchRegistryRow,
  SynthesisWorkbenchSnapshot,
} from "../../src/shared/synthesisWorkbenchWireContract";
import {
  useWindowedRows,
  WindowedGridSpacer,
} from "../../src/synthesis/components/windowedRows";
import {
  TopicsRegion,
  type SynthesisWorkbenchTopicsSelection,
} from "../../src/synthesis/components/TopicsRegion";
import type {
  SynthesisWorkbenchTopicsText,
  TopicArtifactRowView,
} from "../../src/synthesis/components/topicsRegionData";
import { projectRegistrySelection } from "../../src/synthesis/registryProjection";
import { RegistryIndexTable } from "../../src/synthesis/components/registry/RegistryTables";
import type { SynthesisRegistryText } from "../../src/synthesis/components/registry/registryTypes";
import {
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

type ProbeRow = { id: string };

function WindowProbe(props: { rows: ProbeRow[] }) {
  const windowed = useWindowedRows(props.rows, {
    getKey: (row) => row.id,
    resetKey: props.rows.map((row) => row.id).join("|"),
    estimatedRowHeight: 40,
    overscanPx: 80,
  });
  const children = [
    h(WindowedGridSpacer, { height: windowed.topSpacerHeight }),
    ...windowed.visibleRows.flatMap(({ item, key }, index) => [
      h(
        "div",
        {
          key,
          "data-windowed-row-key": key,
          ref: (node: HTMLElement | null) => windowed.measureRow(key, node),
        },
        h("button", { type: "button" }, item.id),
      ),
      windowed.middleSpacerAfter === index
        ? h(WindowedGridSpacer, {
            key: `${key}-middle`,
            height: windowed.middleSpacerHeight,
          })
        : null,
    ]),
    h(WindowedGridSpacer, { height: windowed.bottomSpacerHeight }),
  ];
  return h(
    "div",
    {
      class: "window-probe",
      ref: windowed.scrollRef,
      onScroll: windowed.onScroll,
      onFocusIn: windowed.onFocusIn,
    },
    children,
  );
}

function makeTopicRow(index: number): TopicArtifactRowView {
  return {
    id: `topic-${index}`,
    title: `Topic ${index}`,
    definition: `Definition ${index}`,
    summary: "",
    markdownPreview: "",
    paperCount: index,
    sourceMaterialsStatus: "complete",
    sourceMaterialsPercent: 100,
    freshness: "fresh",
    updatedAt: "2026-09-01",
    candidateCount: 0,
    updateAvailable: true,
  };
}

function makeTopicsSelection(
  rows: TopicArtifactRowView[],
): SynthesisWorkbenchTopicsSelection {
  return {
    search: "",
    sort: "title",
    viewMode: "list",
    hasAnyTopics: rows.length > 0,
    rows,
    deletedCount: 0,
    pendingOperationKeys: [],
    graph: null,
  };
}

const registryText: SynthesisRegistryText = (key, args = {}) =>
  formatSynthesisWorkbenchMessage(
    SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key],
    args,
  );

function makeRegistryRow(index: number): SynthesisWorkbenchRegistryRow {
  return {
    libraryId: 1,
    itemKey: `ITEM${index}`,
    paper_ref: `1:REG${index}`,
    title: `Registry ${index}`,
    year: "2026",
    artifactCoverage: "partial",
    missing_artifacts: [],
    index_scope: "library",
    reference_count: 0,
    unbound_reference_count: 0,
    references: [],
  };
}

function makeRegistrySelection(rows: SynthesisWorkbenchRegistryRow[]) {
  // The projection only reads actions and registry from the wire snapshot;
  // keeping this fixture to that slice avoids duplicating unrelated snapshot
  // sections while still exercising the production projection and narrowing.
  const snapshot = {
    actions: { inFlight: [], warnings: [] },
    registry: {
      filters: {
        activeIndexTool: "none" as const,
        search: "",
        scope: "library" as const,
        artifactCoverage: "all" as const,
        bindingStatus: "all" as const,
        canonicalSearch: "",
        canonicalBinding: "all" as const,
        canonicalGraph: "all" as const,
        canonicalRedirects: "all" as const,
        canonicalProposals: "all" as const,
        canonicalDuplicates: "all" as const,
        reviewDrawerOpen: false,
        reviewDrawerIndex: 0,
        expandedSourceRefs: [],
      },
      rows,
      visibleRows: rows,
      cleanupProposals: [],
      matchProposals: [],
      matchTargetCandidates: [],
      canonicalRows: [],
      visibleCanonicalRows: [],
      canonicalDiagnostics: [],
      cacheStatus: {
        cache_key: "reference-sidecar:library",
        status: "ready" as const,
        diagnostics: [],
        allowedActions: [],
      },
    },
  } as unknown as SynthesisWorkbenchSnapshot;
  return projectRegistrySelection(snapshot, [], registryText);
}

const MAX_WINDOWED_ROWS = 32;

describe("synthesis measured row window", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    document.body.innerHTML = "";
    restoreSidebarDomGlobals();
  });

  it("keeps distant scroll bounded while retaining a focused row", async function () {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const rows = Array.from({ length: 240 }, (_, index) => ({
      id: `row-${index}`,
    }));
    render(h(WindowProbe, { rows }), root);
    const viewport = root.querySelector<HTMLElement>(".window-probe")!;
    Object.defineProperty(viewport, "clientHeight", {
      configurable: true,
      value: 240,
    });
    const initialCount = viewport.querySelectorAll(
      "[data-windowed-row-key]",
    ).length;
    assert.isAtMost(initialCount, MAX_WINDOWED_ROWS);
    const firstRow = viewport.querySelector<HTMLElement>(
      '[data-windowed-row-key="row-0"] button',
    )!;
    firstRow.focus();
    firstRow.dispatchEvent(new window.FocusEvent("focusin", { bubbles: true }));
    viewport.scrollTop = 9000;
    viewport.dispatchEvent(new window.Event("scroll", { bubbles: true }));
    await flush();
    const renderedRows = viewport.querySelectorAll("[data-windowed-row-key]");
    assert.isAtMost(renderedRows.length, MAX_WINDOWED_ROWS);
    assert.ok(
      viewport.querySelector('[data-windowed-row-key="row-0"]'),
      "focused row is retained",
    );
    assert.ok(
      viewport.querySelector(".synthesis-window-spacer"),
      "a spacer preserves the remote range",
    );
  });

  it("windows the Topics list and emits an upper spacer after scrolling", async function () {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const rows = Array.from({ length: 220 }, (_, index) => makeTopicRow(index));
    const t: SynthesisWorkbenchTopicsText = (key) => String(key);
    render(
      h(TopicsRegion, {
        selection: makeTopicsSelection(rows),
        t,
        onAction: () => undefined,
      }),
      root,
    );
    const viewport = root.querySelector<HTMLElement>(".table-wrap")!;
    Object.defineProperty(viewport, "clientHeight", {
      configurable: true,
      value: 240,
    });
    viewport.scrollTop = 9000;
    viewport.dispatchEvent(new window.Event("scroll", { bubbles: true }));
    await flush();
    const renderedRows = viewport.querySelectorAll(
      "tbody tr:not(.synthesis-window-spacer)",
    );
    assert.isAtMost(renderedRows.length, MAX_WINDOWED_ROWS);
    assert.ok(viewport.querySelector("tbody tr.synthesis-window-spacer"));
  });

  it("windows a real Registry table and retains the focused row after remote scroll", async function () {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const rows = Array.from({ length: 800 }, (_, index) =>
      makeRegistryRow(index),
    );
    render(
      h(RegistryIndexTable, {
        selection: makeRegistrySelection(rows),
        t: registryText,
        expandedRowKeys: new Set(),
        onToggleRow: () => undefined,
        onAction: () => undefined,
      }),
      root,
    );
    const viewport = root.querySelector<HTMLElement>(".registry-table-wrap")!;
    Object.defineProperty(viewport, "clientHeight", {
      configurable: true,
      value: 240,
    });
    const initialRows = viewport.querySelectorAll(
      "tbody tr[data-windowed-row-key]",
    );
    assert.isAtMost(initialRows.length, MAX_WINDOWED_ROWS);
    const focusedRow = initialRows[0] as HTMLElement;
    const focusedButton =
      focusedRow.querySelector<HTMLButtonElement>("button")!;
    focusedButton.focus();
    focusedButton.dispatchEvent(
      new window.FocusEvent("focusin", { bubbles: true }),
    );

    viewport.scrollTop = 9000;
    viewport.dispatchEvent(new window.Event("scroll", { bubbles: true }));
    await flush();

    const renderedRows = viewport.querySelectorAll(
      "tbody tr[data-windowed-row-key]",
    );
    assert.isAtMost(renderedRows.length, MAX_WINDOWED_ROWS);
    assert.ok(
      viewport.querySelector(
        `[data-windowed-row-key="${rows[120].paper_ref}"]`,
      ),
      "the remote Registry window is mounted",
    );
    assert.ok(
      viewport.querySelector(`[data-windowed-row-key="${rows[0].paper_ref}"]`),
      "the focused Registry row is retained",
    );
    assert.strictEqual(
      document.activeElement,
      focusedButton,
      "focus stays on the retained Registry row",
    );
    assert.ok(
      viewport.querySelector("tbody tr.synthesis-window-spacer"),
      "a spacer preserves the remote Registry range",
    );
  });

  it("renders grid cards in visual-row windows", async function () {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const rows = Array.from({ length: 120 }, (_, index) => makeTopicRow(index));
    const t: SynthesisWorkbenchTopicsText = (key) => String(key);
    render(
      h(TopicsRegion, {
        selection: { ...makeTopicsSelection(rows), viewMode: "grid" },
        t,
        onAction: () => undefined,
      }),
      root,
    );
    const viewport = root.querySelector<HTMLElement>(".topic-grid")!;
    Object.defineProperty(viewport, "clientWidth", {
      configurable: true,
      value: 720,
    });
    Object.defineProperty(viewport, "clientHeight", {
      configurable: true,
      value: 240,
    });
    viewport.scrollTop = 6000;
    viewport.dispatchEvent(new window.Event("scroll", { bubbles: true }));
    await flush();
    const visualRows = viewport.querySelectorAll(".topic-grid-window-row");
    assert.isAtMost(visualRows.length, 8);
    visualRows.forEach((row) =>
      assert.isAtMost(row.querySelectorAll(".topic-card").length, 3),
    );
  });
});

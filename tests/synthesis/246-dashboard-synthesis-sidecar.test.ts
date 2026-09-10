import { assert } from "chai";
import { h, render } from "preact";

import {
  captureRegionSubtrees,
  assertRegionSubtreesPreserved,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import {
  narrowSynthesisSidecarTraceSnapshot,
  rankSynthesisSidecarTraces,
  reconcileSynthesisSidecarTraceRows,
  resolveSynthesisSidecarVisibleTraces,
  SynthesisSidecarRegion,
  synthesisSidecarEventDepths,
  synthesisSidecarTraceDetailSignature,
  synthesisSidecarTraceOutcome,
  synthesisSidecarTraceRootOperation,
  synthesisSidecarTraceRowSignature,
  type DashboardSynthesisSidecarSelection,
  type DashboardSynthesisSidecarTraceRow,
  type DashboardSynthesisSidecarTraceView,
  type SynthesisSidecarRegionProps,
} from "../../src/dashboard/components/SynthesisSidecarRegion";

function makeTrace(
  traceId: string,
  overrides: Partial<DashboardSynthesisSidecarTraceView> = {},
): DashboardSynthesisSidecarTraceView {
  return {
    traceId,
    active: false,
    startedAtMs: 1000,
    updatedAtMs: 2000,
    droppedCount: 0,
    events: [
      {
        spanId: `${traceId}-root`,
        parentSpanId: "",
        attempt: 0,
        phase: "run-started",
        boundary: "runtime",
        outcome: "succeeded",
        code: "",
        operation: `op-${traceId}`,
        capability: "library.search",
        factsJson: "",
      },
    ],
    ...overrides,
  };
}

function makeRow(
  traceId: string,
  overrides: Partial<DashboardSynthesisSidecarTraceRow> = {},
): DashboardSynthesisSidecarTraceRow {
  return {
    traceId,
    outcome: "succeeded",
    outcomeBadgeClass: "status succeeded is-success",
    shortTraceId: traceId.slice(0, 12),
    operation: `op-${traceId}`,
    startedText: "2026-09-04 10:00:00",
    spanCountText: "2",
    droppedText: "0",
    selected: false,
    signature: JSON.stringify({ outcome: "succeeded", traceId }),
    ...overrides,
  };
}

function makeSelection(
  overrides: Partial<DashboardSynthesisSidecarSelection> = {},
): DashboardSynthesisSidecarSelection {
  return {
    kind: "traces",
    pageTitle: "Synthesis Sidecar",
    emptyText: "No sidecar traces in this debug session.",
    summaryCards: [
      { label: "Traces", value: "2" },
      { label: "Events", value: "5" },
      { label: "Active", value: "1" },
      { label: "Dropped", value: "0" },
    ],
    filterLabel: "Trace / operation / capability",
    filterPlaceholder: "Filter traces",
    filterValue: "",
    columns: ["Outcome", "Trace", "Operation", "Started", "Spans", "Dropped"],
    rows: [
      makeRow("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", {
        outcome: "started",
        outcomeBadgeClass: "status started is-accent",
        selected: true,
      }),
      makeRow("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", {
        outcome: "failed",
        outcomeBadgeClass: "status failed is-error",
      }),
    ],
    detailTitle: "Causal trace",
    detailEmptySubtitle: "No trace selected",
    copyLabel: "Copy trace",
    copiedLabel: "Copied",
    copyFailedLabel: "Copy failed",
    copyToastMessage: "Trace copied",
    detail: {
      traceId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      signature: "3000:2:0",
      subtitle: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa · 2 spans · 0 dropped",
      copyJson: '{\n  "traceId": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"\n}',
      spanRows: [
        {
          spanId: "span-root",
          phasePaddingLeft: "8px",
          phase: "run-started",
          boundary: "runtime",
          attemptText: "0",
          outcome: "started",
          outcomeBadgeClass: "status started is-accent",
          code: "-",
          factsText: "-",
        },
        {
          spanId: "span-child",
          phasePaddingLeft: "22px",
          phase: "run-terminal",
          boundary: "compute",
          attemptText: "1",
          outcome: "succeeded",
          outcomeBadgeClass: "status succeeded is-success",
          code: "ok",
          factsText: '{"operation":"op-a"}',
        },
      ],
    },
    ...overrides,
  };
}

type RenderedRegion = {
  container: HTMLElement;
  actions: Array<{ action: string; payload: Record<string, unknown> }>;
  copyCalls: Array<{
    text: string;
    successToast: string;
    failureToast: string;
  }>;
  props: SynthesisSidecarRegionProps;
};

function renderRegion(
  selection: DashboardSynthesisSidecarSelection,
  options: {
    container?: HTMLElement;
    onCopyText?: SynthesisSidecarRegionProps["onCopyText"];
    rendered?: RenderedRegion;
  } = {},
): RenderedRegion {
  const container = options.container || document.createElement("div");
  if (!container.parentNode) document.body.appendChild(container);
  const rendered: RenderedRegion = options.rendered || {
    container,
    actions: [],
    copyCalls: [],
    props: undefined as unknown as SynthesisSidecarRegionProps,
  };
  const props: SynthesisSidecarRegionProps = {
    selection,
    onAction: (action, payload) => {
      rendered.actions.push({ action, payload });
    },
    onCopyText:
      options.onCopyText ||
      ((text, successToast, failureToast) => {
        rendered.copyCalls.push({ text, successToast, failureToast });
        return Promise.resolve();
      }),
  };
  rendered.props = props;
  render(h(SynthesisSidecarRegion, props), container);
  return rendered;
}

describe("dashboard synthesis sidecar region", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  it("renders the legacy empty state when no trace snapshot is available", function () {
    const { container } = renderRegion(
      makeSelection({ kind: "empty", rows: [], detail: null }),
    );
    assert.equal(
      container.querySelector(".page-title")?.textContent,
      "Synthesis Sidecar",
    );
    assert.equal(
      container.querySelector(".empty-state")?.textContent,
      "No sidecar traces in this debug session.",
    );
    assert.isNull(container.querySelector(".synthesis-sidecar-events"));
  });

  it("renders summary cards, the filter input, trace rows and the span tree", function () {
    const { container } = renderRegion(makeSelection());

    const cards = container.querySelectorAll(
      ".synthesis-sidecar-summary .card",
    );
    assert.equal(cards.length, 4);
    assert.equal(cards[0].querySelector(".card-label")?.textContent, "Traces");
    assert.equal(cards[0].querySelector(".card-value")?.textContent, "2");

    const input = container.querySelector<HTMLInputElement>(
      ".synthesis-sidecar-filter input",
    );
    assert.ok(input);
    assert.equal(input!.placeholder, "Filter traces");
    assert.equal(input!.value, "");

    const headers = container.querySelectorAll(
      ".synthesis-sidecar-events thead th",
    );
    assert.deepEqual(
      Array.from(headers).map((th) => th.textContent),
      ["Outcome", "Trace", "Operation", "Started", "Spans", "Dropped"],
    );
    const wrap = container.querySelector(".synthesis-sidecar-events");
    assert.isNull(wrap?.getAttribute("data-dashboard-scroll-key"));

    const rows = container.querySelectorAll<HTMLTableRowElement>(
      ".synthesis-sidecar-events tbody tr",
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].dataset.traceId, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    assert.ok(rows[0].dataset.traceSignature);
    assert.ok(rows[0].classList.contains("synthesis-trace-row"));
    assert.ok(rows[0].classList.contains("selected"));
    assert.equal(
      rows[0].querySelector("td .status")?.getAttribute("class"),
      "status started is-accent",
    );
    assert.equal(rows[0].children[1].textContent, "aaaaaaaaaaaa");

    const detail = container.querySelector<HTMLElement>(
      ".synthesis-sidecar-detail",
    );
    assert.ok(detail);
    assert.equal(detail!.dataset.traceId, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(detail!.dataset.traceSignature, "3000:2:0");
    assert.equal(
      detail!.querySelector(".synthesis-sidecar-detail-header .muted")
        ?.textContent,
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa · 2 spans · 0 dropped",
    );
    const spanRows = detail!.querySelectorAll<HTMLElement>(
      ".synthesis-sidecar-span-table tr[data-span-id]",
    );
    assert.equal(spanRows.length, 2);
    assert.equal(spanRows[0].dataset.spanId, "span-root");
    const phaseCell = spanRows[1].querySelector<HTMLElement>("td");
    assert.equal(phaseCell?.style.paddingLeft, "22px");
    assert.equal(
      spanRows[1].querySelector(".status")?.textContent,
      "succeeded",
    );
    assert.equal(
      spanRows[1].lastElementChild?.textContent,
      '{"operation":"op-a"}',
    );
  });

  it("emits the legacy UI intents through onAction", function () {
    const { container, actions } = renderRegion(makeSelection());

    const rows = container.querySelectorAll<HTMLElement>(
      ".synthesis-sidecar-events tbody tr",
    );
    rows[1].click();
    assert.deepEqual(actions, [
      {
        action: "synthesis-sidecar-select-trace",
        payload: { traceId: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
      },
    ]);

    const input = container.querySelector<HTMLInputElement>(
      ".synthesis-sidecar-filter input",
    )!;
    input.value = "op-b";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    assert.deepEqual(actions[1], {
      action: "synthesis-sidecar-set-trace-filter",
      payload: { filter: "op-b" },
    });
  });

  it("copies the selected trace JSON and swaps the button label", async function () {
    const selection = makeSelection();
    const { container, copyCalls } = renderRegion(selection);
    const button = container.querySelector<HTMLButtonElement>(
      ".synthesis-sidecar-detail-header .btn",
    )!;
    assert.equal(button.textContent, "Copy trace");
    button.click();
    assert.equal(copyCalls.length, 1);
    assert.equal(copyCalls[0].text, selection.detail!.copyJson);
    assert.equal(copyCalls[0].successToast, "Trace copied");
    assert.equal(copyCalls[0].failureToast, "Copy failed");
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(button.textContent, "Copied");
  });

  it("swaps the button label to the failure text when copying fails", async function () {
    const { container } = renderRegion(makeSelection(), {
      onCopyText: () => Promise.reject(new Error("denied")),
    });
    const button = container.querySelector<HTMLButtonElement>(
      ".synthesis-sidecar-detail-header .btn",
    )!;
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(button.textContent, "Copy failed");
  });

  it("keeps region subtree identity when an equal selection re-renders", function () {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const rendered = renderRegion(makeSelection(), { container });
    const regions = { region: container };
    const captured = captureRegionSubtrees(regions);

    // Same visible content, fresh object graph: nothing is rebuilt.
    render(
      h(SynthesisSidecarRegion, {
        ...rendered.props,
        selection: makeSelection(),
      }),
      container,
    );
    assertRegionSubtreesPreserved(regions, captured);
  });

  it("reconciles island rows by data-trace-id without rebuilding unchanged rows", function () {
    const idA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const idB = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const idC = "cccccccccccccccccccccccccccccccc";
    const idD = "dddddddddddddddddddddddddddddddd";
    const container = document.createElement("div");
    document.body.appendChild(container);
    const rendered = renderRegion(
      makeSelection({
        rows: [makeRow(idA, { selected: true }), makeRow(idB), makeRow(idC)],
      }),
      { container },
    );

    const wrap = container.querySelector<HTMLElement>(
      ".synthesis-sidecar-events",
    )!;
    wrap.scrollTop = 42;

    const rowById = () => {
      const map = new Map<string, HTMLTableRowElement>();
      container
        .querySelectorAll<HTMLTableRowElement>(
          ".synthesis-sidecar-events tbody tr[data-trace-id]",
        )
        .forEach((row) => map.set(row.dataset.traceId || "", row));
      return map;
    };
    const before = rowById();
    const beforeACells = Array.from(before.get(idA)!.children);

    const changedSignatureA = JSON.stringify({ outcome: "failed", id: idA });
    render(
      h(SynthesisSidecarRegion, {
        ...rendered.props,
        selection: makeSelection({
          rows: [
            makeRow(idB, { selected: true }),
            makeRow(idA, {
              outcome: "failed",
              outcomeBadgeClass: "status failed is-error",
              signature: changedSignatureA,
            }),
            makeRow(idD),
          ],
        }),
      }),
      container,
    );

    const after = rowById();
    assert.deepEqual(Array.from(after.keys()), [idB, idA, idD]);

    // Unchanged signature: same <tr> element and same cell children.
    assert.strictEqual(after.get(idB), before.get(idB));
    const beforeBCells = Array.from(before.get(idB)!.children);
    Array.from(after.get(idB)!.children).forEach((cell, index) => {
      assert.strictEqual(cell, beforeBCells[index]);
    });
    assert.ok(after.get(idB)!.classList.contains("selected"));

    // Changed signature: same <tr> element, cells replaced in place.
    assert.strictEqual(after.get(idA), before.get(idA));
    assert.equal(after.get(idA)!.dataset.traceSignature, changedSignatureA);
    Array.from(after.get(idA)!.children).forEach((cell, index) => {
      assert.notStrictEqual(cell, beforeACells[index]);
    });
    assert.equal(
      after.get(idA)!.querySelector(".status")?.getAttribute("class"),
      "status failed is-error",
    );
    assert.isNotOk(after.get(idA)!.classList.contains("selected"));

    // Removed and added rows.
    assert.isUndefined(after.get(idC));
    assert.ok(after.get(idD));

    // Wrap scroll position survives reconciliation.
    assert.equal(wrap.scrollTop, 42);
  });

  it("narrows the unknown wire slot defensively", function () {
    assert.isNull(narrowSynthesisSidecarTraceSnapshot(null));
    assert.isNull(narrowSynthesisSidecarTraceSnapshot({}));
    assert.isNull(narrowSynthesisSidecarTraceSnapshot({ traces: "nope" }));

    const narrowed = narrowSynthesisSidecarTraceSnapshot({
      schema: "synthesis-sidecar-trace-snapshot.v2",
      eventCount: 2,
      traces: [
        {
          traceId: "t1",
          active: true,
          startedAtMs: 10,
          updatedAtMs: 20,
          droppedCount: 1,
          events: [
            {
              spanId: "s1",
              attempt: 2,
              phase: "run-started",
              boundary: "runtime",
              outcome: "started",
              identities: { operation: "op", capability: "cap" },
              metrics: { durationMs: 5 },
              facts: { reason: "ok" },
            },
          ],
        },
        "garbage",
      ],
    });
    assert.ok(narrowed);
    assert.equal(narrowed!.eventCount, 2);
    assert.equal(narrowed!.traces.length, 1);
    const trace = narrowed!.traces[0];
    assert.equal(trace.traceId, "t1");
    assert.isTrue(trace.active);
    assert.equal(trace.events.length, 1);
    assert.equal(trace.events[0].operation, "op");
    assert.equal(trace.events[0].attempt, 2);
    assert.equal(
      trace.events[0].factsJson,
      '{"operation":"op","capability":"cap","durationMs":5,"reason":"ok"}',
    );
  });

  it("ranks traces by priority then recency and filters by search text", function () {
    const succeeded = makeTrace("t-ok", { updatedAtMs: 300 });
    const succeededOlder = makeTrace("t-ok-older", { updatedAtMs: 100 });
    const failed = makeTrace("t-bad", {
      updatedAtMs: 50,
      events: [{ ...makeTrace("t-bad").events[0], outcome: "failed" }],
    });
    const active = makeTrace("t-live", { active: true, updatedAtMs: 10 });
    const ranked = rankSynthesisSidecarTraces(
      [succeededOlder, failed, succeeded, active],
      "",
    );
    assert.deepEqual(
      ranked.map((trace) => trace.traceId),
      ["t-live", "t-bad", "t-ok", "t-ok-older"],
    );

    const filtered = rankSynthesisSidecarTraces(
      [succeeded, failed],
      "op-t-bad",
    );
    assert.deepEqual(
      filtered.map((trace) => trace.traceId),
      ["t-bad"],
    );
  });

  it("resolves the effective selection with the legacy fallback order", function () {
    const traces = [
      makeTrace("t1", { updatedAtMs: 100 }),
      makeTrace("t2", { updatedAtMs: 200 }),
    ];
    const ranked = rankSynthesisSidecarTraces(traces, "");

    const pinned = resolveSynthesisSidecarVisibleTraces({
      traces,
      ranked,
      selectedTraceId: "t1",
    });
    assert.equal(pinned.selected?.traceId, "t1");

    const fallback = resolveSynthesisSidecarVisibleTraces({
      traces,
      ranked,
      selectedTraceId: "",
    });
    assert.equal(fallback.selected?.traceId, "t2");

    // A pinned trace filtered out of the ranking is appended to the window.
    const filteredOut = resolveSynthesisSidecarVisibleTraces({
      traces,
      ranked: rankSynthesisSidecarTraces(traces, "op-t2"),
      selectedTraceId: "t1",
    });
    assert.equal(filteredOut.selected?.traceId, "t1");
    assert.deepEqual(
      filteredOut.visible.map((trace) => trace.traceId),
      ["t2", "t1"],
    );

    // With no pinned id and an empty ranking, the most recent trace wins.
    const noMatch = resolveSynthesisSidecarVisibleTraces({
      traces,
      ranked: rankSynthesisSidecarTraces(traces, "no-such-needle"),
      selectedTraceId: "",
    });
    assert.equal(noMatch.selected?.traceId, "t2");
    assert.deepEqual(
      noMatch.visible.map((trace) => trace.traceId),
      ["t2"],
    );
  });

  it("computes outcome, operation, signatures and span depth like the legacy renderer", function () {
    const trace = makeTrace("t1", {
      updatedAtMs: 42,
      droppedCount: 3,
      events: [
        {
          spanId: "root",
          parentSpanId: "",
          attempt: 0,
          phase: "run-started",
          boundary: "runtime",
          outcome: "succeeded",
          code: "",
          operation: "",
          capability: "cap-root",
          factsJson: "",
        },
        {
          spanId: "child",
          parentSpanId: "root",
          attempt: 1,
          phase: "run-terminal",
          boundary: "compute",
          outcome: "failed",
          code: "boom",
          operation: "op-child",
          capability: "",
          factsJson: "",
        },
        {
          spanId: "cycle-a",
          parentSpanId: "cycle-b",
          attempt: 0,
          phase: "x",
          boundary: "y",
          outcome: "succeeded",
          code: "",
          operation: "",
          capability: "",
          factsJson: "",
        },
        {
          spanId: "cycle-b",
          parentSpanId: "cycle-a",
          attempt: 0,
          phase: "x",
          boundary: "y",
          outcome: "succeeded",
          code: "",
          operation: "",
          capability: "",
          factsJson: "",
        },
      ],
    });
    assert.equal(synthesisSidecarTraceOutcome(trace), "failed");
    assert.equal(synthesisSidecarTraceRootOperation(trace), "cap-root");
    assert.equal(
      synthesisSidecarTraceRowSignature(trace, "failed", "cap-root"),
      JSON.stringify({
        outcome: "failed",
        operation: "cap-root",
        updatedAtMs: 42,
        count: 4,
        dropped: 3,
      }),
    );
    assert.equal(synthesisSidecarTraceDetailSignature(trace), "42:4:3");
    assert.deepEqual(synthesisSidecarEventDepths(trace.events), [0, 1, 2, 2]);
  });

  it("reconcileSynthesisSidecarTraceRows removes rows missing from the next render", function () {
    const tbody = document.createElement("tbody");
    const selected: string[] = [];
    reconcileSynthesisSidecarTraceRows(
      tbody,
      [makeRow("t1"), makeRow("t2")],
      (traceId) => selected.push(traceId),
    );
    assert.equal(tbody.querySelectorAll("tr").length, 2);
    const rowT1 = tbody.querySelector<HTMLTableRowElement>(
      'tr[data-trace-id="t1"]',
    )!;
    rowT1.click();
    assert.deepEqual(selected, ["t1"]);

    reconcileSynthesisSidecarTraceRows(tbody, [makeRow("t2")], (traceId) =>
      selected.push(traceId),
    );
    assert.equal(tbody.querySelectorAll("tr").length, 1);
    assert.isNull(tbody.querySelector('tr[data-trace-id="t1"]'));
    // The retained row keeps its original click listener.
    const rowT2 = tbody.querySelector<HTMLTableRowElement>(
      'tr[data-trace-id="t2"]',
    )!;
    rowT2.click();
    assert.deepEqual(selected, ["t1", "t2"]);
  });
});

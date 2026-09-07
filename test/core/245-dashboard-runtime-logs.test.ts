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
  RuntimeLogsRegion,
  type DashboardRuntimeLogsFilterOption,
  type DashboardRuntimeLogsRow,
  type DashboardRuntimeLogsSelection,
} from "../../src/dashboard/components/RuntimeLogsRegion";

// The multi-select dropdowns wrap the legacy window.createMultiSelect
// custom-select (addon/content/components/custom-select.js); tests stub the
// factory and record creation/setValue/apply calls.

type FakeMultiSelect = {
  element: HTMLDivElement;
  options: DashboardRuntimeLogsFilterOption[];
  values: string[];
  placeholder: string;
  setValueCalls: string[][];
  apply: (values: string[]) => void;
};

let multiSelects: FakeMultiSelect[];

function makeRow(
  id: string,
  overrides: Partial<DashboardRuntimeLogsRow> = {},
): DashboardRuntimeLogsRow {
  return {
    id,
    ts: "2026-09-04T10:00:00.000Z",
    level: "info",
    stage: "boot",
    scope: "system",
    message: `message-${id}`,
    detailPayloadJson: `{\n  "id": "${id}"\n}`,
    errorMessage: "",
    errorStack: "",
    ...overrides,
  };
}

function makeSelection(
  overrides: Partial<DashboardRuntimeLogsSelection> = {},
): DashboardRuntimeLogsSelection {
  return {
    pageTitle: "Runtime Logs",
    levelOptions: [
      { value: "debug", title: "Debug" },
      { value: "info", title: "Info" },
      { value: "warn", title: "Warn" },
      { value: "error", title: "Error" },
    ],
    activeLevels: ["info", "warn", "error"],
    filterBackendLabel: "Backend",
    filterWorkflowLabel: "Workflow",
    filterAllLabel: "All",
    backendOptions: [
      { value: "b1", label: "Backend One" },
      { value: "b2", label: "Backend Two" },
    ],
    selectedBackendIds: ["b1", "b2"],
    workflowOptions: [{ value: "wf-1", label: "Workflow One" }],
    selectedWorkflowIds: ["wf-1"],
    filters: { levels: ["info", "warn", "error"], requestId: "req-9" },
    diagnosticMode: false,
    diagnosticModeLabel: "Diagnostic Mode",
    contextScopeLabel: "Active Context Filters: ",
    contextChips: [{ key: "requestId", value: "req-9" }],
    clearContextLabel: "Clear Context",
    budgetText: "Budget: warn/error 1/50 · total 2/1000",
    copySelectedLabel: "Copy Selected",
    copyVisibleNdjsonLabel: "Copy Visible (NDJSON)",
    copyDiagnosticBundleLabel: "Copy Diagnostic Bundle",
    copyIssueSummaryLabel: "Copy Issue Summary",
    clearLabel: "Clear Logs",
    clearConfirmText: "Are you sure you want to clear all runtime logs?",
    copySuccessTemplate: "Copied { $count } log entries to clipboard!",
    copySuccessBundleText: "Diagnostic bundle copied to clipboard!",
    copySuccessIssueText: "Issue summary copied to clipboard!",
    selectedEntryIds: ["log-1"],
    columns: ["Time", "Level", "Stage", "Scope", "Message"],
    emptyText: "No logs",
    selectToViewText: "Select a log entry to view details.",
    detailTitle: "Log Detail",
    copyDetailLabel: "Copy Log",
    detailCloseLabel: "Close",
    exceptionTitle: "Exception",
    rows: [
      makeRow("log-1"),
      makeRow("log-2", {
        level: "error",
        errorMessage: "boom",
        errorStack: "stack-trace",
      }),
    ],
    ...overrides,
  };
}

function fireChange(element: Element) {
  element.dispatchEvent(new window.Event("change", { bubbles: true }));
}

function setChecked(element: Element, checked: boolean) {
  (element as HTMLInputElement).checked = checked;
  fireChange(element);
}

describe("dashboard RuntimeLogsRegion (src/dashboard)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
    multiSelects = [];
    (window as unknown as { createMultiSelect: unknown }).createMultiSelect = (
      options: DashboardRuntimeLogsFilterOption[],
      values: string[],
      onChange: (values: string[]) => void,
      placeholder: string,
    ) => {
      const element = document.createElement("div");
      element.className = "custom-select custom-multi-select";
      const fake: FakeMultiSelect = {
        element,
        options,
        values: [...values],
        placeholder,
        setValueCalls: [],
        apply: (nextValues) => onChange(nextValues),
      };
      multiSelects.push(fake);
      return {
        element,
        setValue: (nextValues: string[]) => {
          fake.setValueCalls.push([...nextValues]);
        },
      };
    };
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  function renderRegion(selection: DashboardRuntimeLogsSelection) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const actions: Array<{ action: string; payload: Record<string, unknown> }> =
      [];
    const toasts: string[] = [];
    const onAction = (action: string, payload: Record<string, unknown>) => {
      actions.push({ action, payload });
    };
    const onToast = (message: string) => {
      toasts.push(message);
    };
    render(h(RuntimeLogsRegion, { selection, onAction, onToast }), container);
    return { container, actions, toasts, onAction, onToast };
  }

  it("renders the toolbar, filter controls, budget line and the log table", function () {
    const { container } = renderRegion(makeSelection());
    const region = container.querySelector(
      '[data-region-content="dashboard-runtime-logs"]',
    );
    assert.ok(region, "region root exists");
    assert.equal(
      region!.querySelector(".page-title")?.textContent,
      "Runtime Logs",
    );

    const levelBoxes = region!.querySelectorAll<HTMLInputElement>(
      ".logs-filter-levels input[type='checkbox']",
    );
    assert.equal(levelBoxes.length, 4);
    assert.isFalse(levelBoxes[0].checked, "debug is off by default");
    assert.isTrue(levelBoxes[1].checked);
    assert.isTrue(levelBoxes[2].checked);
    assert.isTrue(levelBoxes[3].checked);

    // Backend/workflow dropdowns are imperative custom-select islands.
    assert.equal(multiSelects.length, 2);
    assert.deepEqual(
      multiSelects[0].options.map((option) => option.value),
      ["b1", "b2"],
    );
    assert.deepEqual(multiSelects[0].values, ["b1", "b2"]);
    assert.equal(multiSelects[0].placeholder, "All");
    assert.deepEqual(multiSelects[1].values, ["wf-1"]);
    const dropdownWraps = region!.querySelectorAll(
      ".logs-filter-wrap .logs-filter-dropdown-wrap .custom-multi-select",
    );
    assert.equal(dropdownWraps.length, 2);

    const diagBox = region!.querySelector<HTMLInputElement>(
      ".logs-filter-diagnostic input[type='checkbox']",
    );
    assert.ok(diagBox);
    assert.isFalse(diagBox!.checked);

    const chips = region!.querySelectorAll(".logs-context-badge");
    assert.equal(chips.length, 1);
    assert.equal(chips[0].textContent, "requestId=req-9");

    const budget = region!.querySelector('[data-runtime-log-budget="true"]');
    assert.equal(budget?.textContent, "Budget: warn/error 1/50 · total 2/1000");

    const buttons = region!.querySelectorAll<HTMLButtonElement>(
      ".logs-action-wrap button",
    );
    assert.equal(buttons.length, 5);
    assert.isFalse(buttons[0].disabled, "one entry is selected");
    assert.isFalse(buttons[1].disabled);

    const headCells = region!.querySelectorAll(".logs-table thead th");
    assert.equal(headCells.length, 6, "select-all plus five columns");
    const selectAll = headCells[0].querySelector<HTMLInputElement>(
      "input[type='checkbox']",
    );
    assert.ok(selectAll);
    assert.isFalse(selectAll!.checked, "only one of two rows is selected");

    const rows = region!.querySelectorAll(".logs-table tbody tr.log-row");
    assert.equal(rows.length, 2);
    assert.ok(rows[0].classList.contains("selected"));
    assert.notOk(rows[1].classList.contains("selected"));
    const badge = rows[1].querySelector(".log-level-badge");
    assert.equal(
      badge?.getAttribute("class"),
      "log-level-badge log-level-badge--error",
    );
    assert.equal(badge?.textContent, "ERROR");
    assert.match(
      rows[0].querySelector("td.mono")?.textContent || "",
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/,
      "time column renders the local-time millis format",
    );
    assert.equal(
      rows[0].querySelector(".log-message-cell")?.textContent,
      "message-log-1",
    );

    // Detail pane starts in the empty state.
    const detail = region!.querySelector(".logs-detail-pane");
    assert.notOk(detail!.classList.contains("visible"));
    assert.equal(
      detail!.querySelector(".logs-detail-empty")?.textContent,
      "Select a log entry to view details.",
    );
  });

  it("renders the empty table state and disables copy actions when there are no logs", function () {
    const { container } = renderRegion(
      makeSelection({ rows: [], selectedEntryIds: [] }),
    );
    const emptyCell = container.querySelector<HTMLTableCellElement>(
      ".logs-table tbody td.empty",
    );
    assert.ok(emptyCell, "empty placeholder row exists");
    assert.equal(emptyCell!.colSpan, 6);
    assert.equal(emptyCell!.textContent, "No logs");
    const buttons = container.querySelectorAll<HTMLButtonElement>(
      ".logs-action-wrap button",
    );
    assert.isTrue(buttons[0].disabled);
    assert.isTrue(buttons[1].disabled);
    assert.isTrue(buttons[2].disabled);
    assert.isTrue(buttons[3].disabled);
  });

  it("sends runtime-logs-set-filters patches merged onto the last published filters", function () {
    const { container, actions } = renderRegion(makeSelection());
    const levelBoxes = container.querySelectorAll(
      ".logs-filter-levels input[type='checkbox']",
    );
    setChecked(levelBoxes[2], false); // uncheck Warn
    assert.deepEqual(actions, [
      {
        action: "runtime-logs-set-filters",
        payload: {
          filters: { levels: ["info", "error"], requestId: "req-9" },
        },
      },
    ]);

    // Multi-select apply sends the subset; selecting every option clears the
    // filter (undefined), matching the legacy payload shape.
    multiSelects[0].apply(["b1"]);
    multiSelects[1].apply(["wf-1"]);
    const backendPatch = actions[1];
    assert.equal(backendPatch.action, "runtime-logs-set-filters");
    const backendFilters = backendPatch.payload.filters as Record<
      string,
      unknown
    >;
    assert.deepEqual(backendFilters.backendId, ["b1"]);
    const workflowPatch = actions[2];
    const workflowFilters = workflowPatch.payload.filters as Record<
      string,
      unknown
    >;
    assert.ok("workflowId" in workflowFilters);
    assert.isUndefined(workflowFilters.workflowId);
  });

  it("sends diagnostic toggle and clear-context actions", function () {
    const { container, actions } = renderRegion(makeSelection());
    const diagBox = container.querySelector(
      ".logs-filter-diagnostic input[type='checkbox']",
    )!;
    setChecked(diagBox, true);
    const clearContext = container.querySelector<HTMLButtonElement>(
      ".logs-context-wrap .btn.clear",
    )!;
    clearContext.click();
    assert.deepEqual(actions, [
      { action: "runtime-logs-toggle-diagnostic", payload: { enabled: true } },
      { action: "runtime-logs-clear-context", payload: {} },
    ]);
  });

  it("sends select-entries actions from the select-all and row checkboxes", function () {
    const { container, actions } = renderRegion(makeSelection());
    const selectAll = container.querySelector(
      ".logs-table thead th.col-check input[type='checkbox']",
    )!;
    setChecked(selectAll, true);
    assert.deepEqual(actions[0], {
      action: "runtime-logs-select-entries",
      payload: { entryIds: ["log-1", "log-2"] },
    });

    const secondRowBox = container.querySelector(
      ".logs-table tbody tr.log-row:nth-child(2) td.col-check input[type='checkbox']",
    )!;
    setChecked(secondRowBox, true);
    assert.deepEqual(actions[1], {
      action: "runtime-logs-select-entries",
      payload: { entryIds: ["log-1", "log-2"] },
    });
    setChecked(secondRowBox, false);
    assert.deepEqual(actions[2], {
      action: "runtime-logs-select-entries",
      payload: { entryIds: ["log-1"] },
    });

    // Clicks inside the checkbox cell never open the detail pane.
    const cell = container.querySelector(
      ".logs-table tbody tr.log-row:nth-child(2) td.col-check",
    )!;
    cell.dispatchEvent(new window.Event("click", { bubbles: true }));
    assert.isNull(container.querySelector(".logs-table tbody tr.reading"));
  });

  it("sends the copy and clear actions with legacy payload shapes and toast feedback", function () {
    const confirmCalls: string[] = [];
    (window as unknown as { confirm: (message: string) => boolean }).confirm = (
      message: string,
    ) => {
      confirmCalls.push(message);
      return true;
    };
    const { container, actions, toasts } = renderRegion(makeSelection());
    const buttons = container.querySelectorAll<HTMLButtonElement>(
      ".logs-action-wrap button",
    );

    buttons[0].click();
    buttons[2].click();
    buttons[3].click();
    buttons[4].click();
    assert.deepEqual(actions, [
      {
        action: "runtime-logs-copy-selected",
        payload: { format: "pretty-json" },
      },
      { action: "runtime-logs-copy-diagnostic-bundle", payload: {} },
      { action: "runtime-logs-copy-issue-summary", payload: {} },
      { action: "runtime-logs-clear", payload: {} },
    ]);
    assert.deepEqual(toasts, [
      "Copied 1 log entries to clipboard!",
      "Diagnostic bundle copied to clipboard!",
      "Issue summary copied to clipboard!",
    ]);
    assert.deepEqual(confirmCalls, [
      "Are you sure you want to clear all runtime logs?",
    ]);
  });

  it("does not clear logs when the confirm dialog is dismissed", function () {
    (window as unknown as { confirm: () => boolean }).confirm = () => false;
    const { container, actions } = renderRegion(makeSelection());
    const clearButton = container.querySelector<HTMLButtonElement>(
      ".logs-action-wrap > .btn.clear",
    )!;
    clearButton.click();
    assert.deepEqual(actions, []);
  });

  it("selects all visible entries before copying NDJSON (legacy two-step timing)", function (done) {
    const { container, actions, toasts } = renderRegion(makeSelection());
    const ndjsonButton = container.querySelectorAll<HTMLButtonElement>(
      ".logs-copy-group button",
    )[1];
    ndjsonButton.click();
    assert.deepEqual(actions, [
      {
        action: "runtime-logs-select-entries",
        payload: { entryIds: ["log-1", "log-2"] },
      },
    ]);
    setTimeout(() => {
      assert.deepEqual(actions[1], {
        action: "runtime-logs-copy-selected",
        payload: { format: "ndjson" },
      });
      assert.deepEqual(toasts, ["Copied 2 log entries to clipboard!"]);
      done();
    }, 120);
  });

  it("opens the detail pane on row click and copies the entry", function () {
    const { container, actions, toasts } = renderRegion(makeSelection());
    const rows = container.querySelectorAll(".logs-table tbody tr.log-row");
    (rows[1] as HTMLElement).click();

    const detail = container.querySelector(".logs-detail-pane")!;
    assert.ok(detail.classList.contains("visible"));
    assert.ok(rows[1].classList.contains("reading"));
    assert.notOk(rows[0].classList.contains("reading"));
    assert.equal(
      detail.querySelector(".logs-detail-header h3")?.textContent,
      "Log Detail ",
    );
    assert.equal(
      detail.querySelector(".error-title")?.textContent,
      "Exception",
    );
    assert.equal(detail.querySelector(".log-error")?.textContent, "boom");
    assert.equal(
      detail.querySelector(".log-stack")?.textContent,
      "stack-trace",
    );
    assert.equal(
      detail.querySelector(".payload-view")?.textContent,
      '{\n  "id": "log-2"\n}',
    );

    (detail.querySelector(".logs-detail-copy") as HTMLButtonElement).click();
    assert.deepEqual(actions, [
      {
        action: "runtime-logs-copy-entry",
        payload: { entryId: "log-2", format: "pretty-json" },
      },
    ]);
    assert.deepEqual(toasts, ["Copied 1 log entries to clipboard!"]);

    // The first row carries no error: no exception section.
    (rows[0] as HTMLElement).click();
    assert.ok(rows[0].classList.contains("reading"));
    assert.notOk(rows[1].classList.contains("reading"));
    assert.isNull(detail.querySelector(".error-title"));
    assert.equal(
      detail.querySelector(".payload-view")?.textContent,
      '{\n  "id": "log-1"\n}',
    );

    // Close clears the pane and the reading marker.
    (detail.querySelector(".logs-detail-close") as HTMLButtonElement).click();
    assert.notOk(detail.classList.contains("visible"));
    assert.equal(detail.childNodes.length, 0);
    assert.isNull(container.querySelector(".logs-table tbody tr.reading"));
  });

  it("keeps the region subtree identity when an equal selection re-renders", function () {
    const { container, onAction, onToast } = renderRegion(makeSelection());
    const regions = { runtimeLogs: container };
    const captured = captureRegionSubtrees(regions);

    render(
      h(RuntimeLogsRegion, {
        selection: makeSelection(),
        onAction,
        onToast,
      }),
      container,
    );
    assertRegionSubtreesPreserved(regions, captured);
  });

  it("reconciles island rows by log id: unchanged rows keep their DOM nodes", function () {
    const { container, onAction, onToast } = renderRegion(makeSelection());
    const tbody = container.querySelector(".logs-table tbody")!;
    const headRow = container.querySelector(".logs-table thead tr")!;
    const tableWrap = container.querySelector(
      ".logs-table-wrap",
    ) as HTMLElement;
    tableWrap.scrollTop = 25;
    const rowsBefore = tbody.querySelectorAll("tr.log-row");
    const firstRowNode = rowsBefore[0];

    // A visible change to one row rebuilds only that row; thead survives.
    render(
      h(RuntimeLogsRegion, {
        selection: makeSelection({
          rows: [
            makeRow("log-1"),
            makeRow("log-2", {
              level: "error",
              message: "failed differently",
              errorMessage: "boom",
              errorStack: "stack-trace",
            }),
          ],
        }),
        onAction,
        onToast,
      }),
      container,
    );
    const rowsAfter = tbody.querySelectorAll("tr.log-row");
    assert.strictEqual(
      rowsAfter[0],
      firstRowNode,
      "unchanged row keeps its DOM node",
    );
    assert.notStrictEqual(
      rowsAfter[1],
      rowsBefore[1],
      "changed row is rebuilt",
    );
    assert.strictEqual(
      container.querySelector(".logs-table thead tr"),
      headRow,
      "thead is retained when columns/selection state are unchanged",
    );
    assert.equal(
      rowsAfter[1].querySelector(".log-message-cell")?.textContent,
      "failed differently",
    );
    assert.equal(tableWrap.scrollTop, 25, "list scroll position is preserved");

    // A removed row drops its node; the retained row keeps identity.
    render(
      h(RuntimeLogsRegion, {
        selection: makeSelection({
          rows: [
            makeRow("log-2", {
              level: "error",
              message: "failed differently",
              errorMessage: "boom",
              errorStack: "stack-trace",
            }),
          ],
        }),
        onAction,
        onToast,
      }),
      container,
    );
    const remaining = tbody.querySelectorAll("tr.log-row");
    assert.equal(remaining.length, 1);
    assert.strictEqual(remaining[0], rowsAfter[1]);
  });

  it("caps the island at 300 rendered rows", function () {
    const rows = [];
    for (let index = 0; index < 305; index += 1) {
      rows.push(makeRow(`log-${index}`));
    }
    const { container } = renderRegion(makeSelection({ rows }));
    assert.equal(
      container.querySelectorAll(".logs-table tbody tr.log-row").length,
      300,
    );
  });

  it("does not rebuild the custom-select islands on value-only updates", function () {
    const { container, onAction, onToast } = renderRegion(makeSelection());
    const backendElement = container.querySelector(
      ".logs-filter-dropdown-wrap .custom-multi-select",
    );

    render(
      h(RuntimeLogsRegion, {
        selection: makeSelection({ selectedBackendIds: ["b1"] }),
        onAction,
        onToast,
      }),
      container,
    );
    assert.equal(multiSelects.length, 2, "no dropdown was rebuilt");
    assert.deepEqual(multiSelects[0].setValueCalls, [["b1"]]);
    assert.strictEqual(
      container.querySelector(
        ".logs-filter-dropdown-wrap .custom-multi-select",
      ),
      backendElement,
      "custom-select element identity is preserved",
    );

    // An option-list change does rebuild the dropdown.
    render(
      h(RuntimeLogsRegion, {
        selection: makeSelection({
          backendOptions: [
            { value: "b1", label: "Backend One" },
            { value: "b2", label: "Backend Two" },
            { value: "b3", label: "Backend Three" },
          ],
        }),
        onAction,
        onToast,
      }),
      container,
    );
    assert.equal(multiSelects.length, 3, "backend dropdown rebuilt once");
  });

  it("carries the detail payload scroll position across a same-entry re-render", function (done) {
    const { container, onAction, onToast } = renderRegion(makeSelection());
    const firstRow = container.querySelector(
      ".logs-table tbody tr.log-row",
    ) as HTMLElement;
    firstRow.click();
    const payloadView = container.querySelector(
      ".logs-detail-pane .payload-view",
    ) as HTMLElement;
    payloadView.scrollTop = 33;

    render(
      h(RuntimeLogsRegion, {
        selection: makeSelection({
          rows: [
            makeRow("log-1", {
              detailPayloadJson: '{\n  "id": "log-1",\n  "more": true\n}',
            }),
            makeRow("log-2", {
              level: "error",
              errorMessage: "boom",
              errorStack: "stack-trace",
            }),
          ],
        }),
        onAction,
        onToast,
      }),
      container,
    );
    // Row identity is unaffected by payload-only changes.
    assert.strictEqual(
      container.querySelector(".logs-table tbody tr.log-row"),
      firstRow,
    );
    setTimeout(() => {
      const nextPayload = container.querySelector(
        ".logs-detail-pane .payload-view",
      ) as HTMLElement;
      assert.equal(nextPayload.scrollTop, 33);
      done();
    }, 20);
  });
});

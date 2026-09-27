import { assert } from "chai";
import { h, render } from "preact";

import {
  assertRegionSubtreesPreserved,
  captureRegionSubtrees,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import {
  SkillrunnerAuditRegion,
  type DashboardSkillrunnerAuditSelection,
} from "../../src/dashboard/components/SkillrunnerAuditRegion";

// The SkillRunner connection audit surface is read-only. Its single
// interaction (copy JSON) was page-local in the legacy implementation
// (addon/content/dashboard/app.js:2791-2801) and never emitted a host action,
// so the component reports it through the dedicated onCopyJson callback and
// the integration layer owns copyTextWithToastFeedback.

function makeSelection(
  overrides: Partial<DashboardSkillrunnerAuditSelection> = {},
): DashboardSkillrunnerAuditSelection {
  return {
    available: true,
    emptyText: "No SkillRunner connection events.",
    pageTitle: "SkillRunner Connection Audit",
    copyLabel: "Copy JSON",
    metrics: [
      { label: "Active connections", value: "2" },
      { label: "Queued requests", value: "1" },
      { label: "Streams", value: "3" },
      { label: "Timeouts", value: "0" },
      { label: "Late settlements", value: "0" },
      { label: "Physical debt", value: "4" },
      { label: "Degraded backends", value: "1" },
      { label: "Skipped low-priority", value: "5" },
    ],
    bars: [
      {
        title: "By backend",
        rows: [
          { key: "backend-a", count: 2 },
          { key: "backend-b queued", count: 1 },
        ],
      },
      { title: "By lane", rows: [] },
      { title: "Physical debt", rows: [{ key: "backend-a", count: 4 }] },
    ],
    eventsTitle: "Recent events",
    eventsEmptyText: "No SkillRunner connection events.",
    eventsColumns: [
      "Time",
      "Event",
      "Backend",
      "Lane",
      "Request ID",
      "Operation",
      "Duration",
      "Reason",
    ],
    eventsRows: [
      {
        id: "2",
        timestampText: "2026-09-04 10:00:01.000",
        typeText: "timeout",
        typeClass: "status timeout is-muted",
        backendId: "backend-a",
        lane: "foreground",
        requestId: "req-2",
        operation: "skill-run",
        durationText: "30000 ms",
        reason: "deadline exceeded",
      },
      {
        id: "1",
        timestampText: "2026-09-04 10:00:00.000",
        typeText: "started",
        typeClass: "status started is-accent",
        backendId: "backend-a",
        lane: "",
        requestId: "",
        operation: "",
        durationText: "-",
        reason: "",
      },
    ],
    ...overrides,
  };
}

describe("dashboard SkillrunnerAuditRegion (src/dashboard)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  function renderRegion(selection: DashboardSkillrunnerAuditSelection) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const copyCalls: number[] = [];
    const onCopyJson = () => {
      copyCalls.push(copyCalls.length);
    };
    render(h(SkillrunnerAuditRegion, { selection, onCopyJson }), container);
    return { container, copyCalls, onCopyJson };
  }

  it("renders only the empty placeholder when the governor view is unavailable", function () {
    const { container } = renderRegion(makeSelection({ available: false }));
    const region = container.querySelector(
      '[data-region-content="dashboard-skillrunner-audit"]',
    );
    assert.ok(region, "region root exists");
    assert.equal(
      region!.querySelector(".empty")?.textContent,
      "No SkillRunner connection events.",
    );
    assert.isNull(region!.querySelector(".toolbar"));
    assert.isNull(region!.querySelector(".audit-metrics"));
    assert.isNull(region!.querySelector("table"));
  });

  it("renders metric cards, dimension bars and the events table", function () {
    const { container } = renderRegion(makeSelection());

    assert.equal(
      container.querySelector(".toolbar .page-title")?.textContent,
      "SkillRunner Connection Audit",
    );
    const metrics = container.querySelectorAll(".audit-metrics .audit-metric");
    assert.equal(metrics.length, 8);
    assert.equal(
      metrics[0].querySelector(".audit-metric-label")?.textContent,
      "Active connections",
    );
    assert.equal(
      metrics[0].querySelector(".audit-metric-value")?.textContent,
      "2",
    );

    const barSections = container.querySelectorAll(
      ".audit-grid .audit-bars-section",
    );
    assert.equal(barSections.length, 3);
    const firstRows = barSections[0].querySelectorAll(".audit-bar-row");
    assert.equal(firstRows.length, 2);
    assert.equal(
      firstRows[0].querySelector(".audit-bar-label")?.textContent,
      "backend-a",
    );
    const fills =
      barSections[0].querySelectorAll<HTMLElement>(".audit-bar-fill");
    assert.equal(fills[0].style.width, "100%", "max row fills the track");
    assert.equal(fills[1].style.width, "50%");
    assert.equal(
      firstRows[0].querySelector(".audit-bar-count")?.textContent,
      "2",
    );
    // Empty dimension renders the legacy "-" placeholder.
    assert.equal(
      barSections[1].querySelector(".panel.audit-bars .empty")?.textContent,
      "-",
    );

    const wrap = container.querySelector(".table-wrap.logs-table-wrap");
    assert.ok(wrap, "events table wrap exists");
    const table = wrap!.querySelector("table.logs-table.audit-events-table");
    assert.ok(table, "events table exists");
    assert.equal(table!.querySelectorAll("thead th").length, 8);
    const rows = table!.querySelectorAll("tbody tr");
    assert.equal(rows.length, 2);
    const badge = rows[0].querySelector("td span.status");
    assert.ok(badge, "event type renders as a status badge");
    assert.equal(badge!.getAttribute("class"), "status timeout is-muted");
    assert.equal(badge!.textContent, "timeout");
    assert.equal(rows[0].querySelectorAll("td")[6].textContent, "30000 ms");
    // Empty optional fields fall back to "-" in the legacy row renderer.
    const cells = rows[1].querySelectorAll("td");
    assert.equal(cells[2].className, "mono");
    assert.equal(cells[3].textContent, "-");
    assert.equal(cells[4].textContent, "-");
    assert.equal(cells[5].textContent, "-");
    assert.equal(cells[7].textContent, "-");
  });

  it("renders the empty events panel when there are no events", function () {
    const { container } = renderRegion(makeSelection({ eventsRows: [] }));
    assert.isNull(container.querySelector("table.audit-events-table"));
    const eventsSection = container.querySelector(
      "section.section:not(.audit-bars-section)",
    );
    assert.equal(
      eventsSection?.querySelector(".panel > .empty")?.textContent,
      "No SkillRunner connection events.",
    );
  });

  it("reports the copy interaction through onCopyJson", function () {
    const { container, copyCalls } = renderRegion(makeSelection());
    const copyButton = container.querySelector<HTMLButtonElement>(
      ".toolbar-actions button",
    );
    assert.ok(copyButton, "copy button exists");
    assert.equal(copyButton!.textContent, "Copy JSON");
    copyButton!.click();
    assert.equal(copyCalls.length, 1);
  });

  it("keeps the region subtree identity when an equal selection re-renders", function () {
    const { container, onCopyJson } = renderRegion(makeSelection());
    const regions = { audit: container };
    const captured = captureRegionSubtrees(regions);

    // Same visible content, fresh object graph: no node is rebuilt.
    render(
      h(SkillrunnerAuditRegion, {
        selection: makeSelection(),
        onCopyJson,
      }),
      container,
    );
    assertRegionSubtreesPreserved(regions, captured);

    // A visible change (metric value) re-renders the region content.
    render(
      h(SkillrunnerAuditRegion, {
        selection: makeSelection({
          metrics: makeSelection().metrics.map((metric, index) =>
            index === 0 ? { ...metric, value: "7" } : metric,
          ),
        }),
        onCopyJson,
      }),
      container,
    );
    assert.equal(
      container.querySelector(".audit-metric .audit-metric-value")?.textContent,
      "7",
    );
  });
});

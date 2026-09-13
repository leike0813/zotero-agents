import { assert } from "chai";
import { chromium, type Browser, type Page } from "playwright";
import { pathToFileURL } from "node:url";
import { buildDashboardBrowserPage } from "../helpers/dashboardBrowserPage";

function migrationSnapshot(busy = false) {
  const items = Array.from({ length: 25 }, (_, index) => ({
    candidateId: `candidate-${index + 1}`,
    ordinal: index + 1,
    title: `Migration set ${index + 1}`,
    classification: index === 0 ? "review_required" : "ready",
    outcome: "preview",
    reasonCodes: index === 0 ? ["unresolved_linkage"] : [],
    diagnostics: [],
    verifiedCount: 2,
    unresolvedCount: index === 0 ? 1 : 0,
    recoveredCount: 0,
    droppedCount: 0,
    selected: index !== 0,
    disposition: index === 0 ? "pending" : "include",
    issues:
      index === 0
        ? [
            {
              issueId: "issue-1",
              reasonCode: "unresolved_linkage",
              status: "pending",
              detail: "One citation could not be linked.",
              selectedOptionId: "",
              options: [
                {
                  optionId: "keep",
                  kind: "keep_unresolved",
                  dataLoss: false,
                },
                {
                  optionId: "drop",
                  kind: "drop_unresolved",
                  dataLoss: true,
                },
              ],
            },
          ]
        : [],
  }));
  const activeRun = {
    runId: "run-1",
    operationId: "scan-1",
    migrationId: "literature-artifacts",
    definitionVersion: 4,
    libraryId: 1,
    state: "preview",
    reason: "",
    processedCount: 0,
    remainingCount: 25,
    setCount: 25,
    createdAt: "2026-09-11T00:00:00.000Z",
    updatedAt: "2026-09-11T00:00:00.000Z",
    terminalAt: "",
    diagnostics: [],
  };
  return {
    title: "Migrations",
    labels: {},
    selectedTabKey: "migrations",
    tabs: [{ key: "migrations", label: "Migrations" }],
    literatureArtifactMigrationView: {
      migrationId: "literature-artifacts",
      definitionVersion: 4,
      availability: busy ? "busy" : "available",
      availabilityReason: "",
      libraryId: 1,
      activeRun,
      activeOperationId: "scan-1",
      activeRunId: busy ? "run-1" : "",
      progress: busy
        ? { phase: "scanning", completed: 7, total: 25, candidateCount: 3 }
        : null,
      candidatePage: {
        cursor: "",
        nextCursor: null,
        items,
        summary: {
          total: 25,
          unfilteredTotal: 25,
          ready: 24,
          reviewRequired: 1,
          blocked: 0,
          selected: 24,
        },
        query: {
          search: "",
          classification: "",
          reasonCode: "",
          disposition: "",
        },
        availableReasons: ["unresolved_linkage"],
      },
      history: [],
    },
  };
}

async function postSnapshot(page: Page, snapshot: unknown) {
  await page.evaluate((payload) => {
    window.postMessage({ type: "dashboard:snapshot", payload }, "*");
  }, snapshot);
  await page.locator(".dashboard-migrations").waitFor();
}

describe("Dashboard literature migration browser UI", function () {
  this.timeout(30_000);

  let browser: Browser;
  let page: Page;
  let dashboardPageUrl: string;

  before(async function () {
    dashboardPageUrl = pathToFileURL(await buildDashboardBrowserPage()).href;
  });

  beforeEach(async function () {
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
    page.setDefaultTimeout(5_000);
    await page.goto(dashboardPageUrl);
  });

  afterEach(async function () {
    await browser.close();
  });

  it("renders bounded filters, a scrollable result list, issue drawer, and progress", async function () {
    await postSnapshot(page, migrationSnapshot());

    assert.isTrue(await page.getByPlaceholder("Search candidates").isVisible());
    assert.equal(
      await page.locator(".dashboard-migrations-toolbar-row select").count(),
      3,
    );
    const listBounds = await page
      .locator(".dashboard-migrations-candidates")
      .evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        overflowY: getComputedStyle(element).overflowY,
      }));
    assert.include(["auto", "scroll"], listBounds.overflowY);
    assert.isAbove(listBounds.scrollHeight, listBounds.clientHeight);

    await page.locator(".dashboard-migration-candidate").first().click();
    const drawer = page.locator(".dashboard-migration-drawer");
    await drawer.waitFor();
    assert.isAbove((await drawer.boundingBox())?.width || 0, 200);
    assert.isTrue(
      await drawer
        .getByRole("button", { name: "Keep as unresolved" })
        .isVisible(),
    );

    await postSnapshot(page, migrationSnapshot(true));
    const progress = page.locator(
      '.dashboard-migration-progress [role="progressbar"]',
    );
    assert.equal(await progress.getAttribute("aria-valuenow"), "7");
    assert.equal(await progress.getAttribute("aria-valuemax"), "25");
  });

  it("fills one toolbar row when wide and wraps filters below at narrow widths", async function () {
    await page.setViewportSize({ width: 1600, height: 700 });
    await postSnapshot(page, migrationSnapshot());
    const rows = async () =>
      page.locator(".dashboard-migrations-toolbar-row").evaluate((toolbar) => {
        const actions = toolbar.querySelector(".dashboard-migrations-actions")!;
        const summary = toolbar.querySelector(".dashboard-migrations-summary")!;
        const filters = toolbar.querySelector(".dashboard-migrations-filters")!;
        return [actions, summary, filters].map((element) => {
          const bounds = element.getBoundingClientRect();
          return {
            top: Math.round(bounds.top),
            bottom: Math.round(bounds.bottom),
            center: Math.round(bounds.top + bounds.height / 2),
          };
        });
      });
    const wideRows = await rows();
    assert.isAtMost(
      Math.max(...wideRows.map(({ center }) => center)) -
        Math.min(...wideRows.map(({ center }) => center)),
      2,
    );

    await page.setViewportSize({ width: 900, height: 700 });
    const mediumRows = await rows();
    assert.isAtMost(Math.abs(mediumRows[0]!.top - mediumRows[1]!.top), 2);
    assert.isAtLeast(
      mediumRows[2]!.top,
      Math.max(mediumRows[0]!.bottom, mediumRows[1]!.bottom),
    );
    const mediumWidths = await page
      .locator(".dashboard-migrations-filters > *")
      .evaluateAll((elements) =>
        elements.map((element) =>
          Math.round(element.getBoundingClientRect().width),
        ),
      );
    assert.isTrue(mediumWidths.every((width) => width > 100));

    await page.setViewportSize({ width: 520, height: 700 });
    const small = await page
      .locator(".dashboard-migrations-filters > *")
      .evaluateAll((elements) =>
        elements.map((element) => ({
          top: Math.round(element.getBoundingClientRect().top),
          width: Math.round(element.getBoundingClientRect().width),
        })),
      );
    assert.isAbove(small[0]!.width, small[1]!.width);
    assert.equal(small[1]!.top, small[2]!.top);
  });
});

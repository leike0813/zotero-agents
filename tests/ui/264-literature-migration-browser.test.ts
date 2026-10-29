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
        page: 0,
        pageSize: 25,
        pageCount: 1,
        items,
        summary: {
          total: 25,
          unfilteredTotal: 25,
          ready: 24,
          reviewRequired: 1,
          blocked: 0,
          selected: 24,
          filteredSelected: 24,
          filteredSelectable: 24,
        },
        query: {
          search: "",
          classification: "",
          reasonCode: "",
          disposition: "",
        },
        availableReasons: ["unresolved_linkage"],
        batchActions: [],
      },
      history: [],
      decisionGroups: [
        {
          reasonCode: "unresolved_linkage",
          totalCount: 4,
          pendingCount: 4,
          resolvedCount: 0,
          individualCount: 0,
          selectedKind: "",
          kinds: [
            { kind: "keep_unresolved", dataLoss: false },
            { kind: "drop_unresolved", dataLoss: true },
          ],
        },
        {
          reasonCode: "duplicate_reference",
          totalCount: 2,
          pendingCount: 2,
          resolvedCount: 0,
          individualCount: 0,
          selectedKind: "",
          kinds: [{ kind: "merge_duplicates", dataLoss: false }],
        },
      ],
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
    await page.locator('[data-role="migration-step-problems"]').click();
    assert.equal(
      await page.locator(".dashboard-migration-batch-group").count(),
      1,
    );
    assert.equal(
      await page
        .locator(".dashboard-migration-batch-group")
        .getAttribute("data-reason-code"),
      "unresolved_linkage",
    );
    await page.locator('[data-role="migration-wizard-next"]').click();
    assert.equal(
      await page.locator(".dashboard-migration-batch-group").count(),
      1,
    );
    assert.equal(
      await page
        .locator(".dashboard-migration-batch-group")
        .getAttribute("data-reason-code"),
      "duplicate_reference",
    );

    assert.isTrue(
      await page.locator('[data-role="migration-search"]').isVisible(),
    );
    assert.equal(
      await page.locator(".dashboard-migrations-toolbar-row select").count(),
      3,
    );
    const listBounds = await page
      .locator(".dashboard-migrations-results")
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
    assert.isTrue(await drawer.locator('[data-option-id="keep"]').isVisible());

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
    await page.locator('[data-role="migration-step-problems"]').click();
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
    const groupLayout = await page
      .locator(".dashboard-migrations-batch")
      .evaluate((group) => {
        return {
          clientWidth: group.clientWidth,
          scrollWidth: group.scrollWidth,
        };
      });
    assert.isAtMost(groupLayout.scrollWidth, groupLayout.clientWidth + 1);
    const footer = await page
      .locator(".dashboard-migration-wizard-actions")
      .boundingBox();
    assert.isOk(footer);
    assert.isAtLeast(footer!.x, 0);
    assert.isAtMost(footer!.x + footer!.width, 520);
    assert.isAtMost(footer!.y + footer!.height, 700);
  });

  it("dispatches bulk selection and bounded page jumps from real DOM interactions", async function () {
    const snapshot = migrationSnapshot();
    snapshot.literatureArtifactMigrationView.candidatePage.pageCount = 12;
    snapshot.literatureArtifactMigrationView.candidatePage.summary.total = 300;
    snapshot.literatureArtifactMigrationView.candidatePage.summary.filteredSelected = 23;
    snapshot.literatureArtifactMigrationView.candidatePage.summary.selected = 23;
    const actions: Array<{ action: string; payload: unknown }> = [];
    page.on("console", (message) => {
      const text = message.text();
      if (!text.startsWith("dashboard-action:")) return;
      actions.push(JSON.parse(text.slice("dashboard-action:".length)));
    });
    await page.evaluate(() => {
      window.addEventListener("message", (event) => {
        const data = event.data as {
          type?: string;
          action?: string;
          payload?: unknown;
        };
        if (data?.type === "dashboard:action") {
          console.log(
            "dashboard-action:" +
              JSON.stringify({
                action: data.action || "",
                payload: data.payload,
              }),
          );
        }
      });
    });
    await postSnapshot(page, snapshot);
    await page.locator('[data-role="migration-step-finalreview"]').click();
    const waitForAction = async (action: string, count = 1) => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        if (
          actions.filter((entry) => entry.action === action).length >= count
        ) {
          return;
        }
        await page.waitForTimeout(50);
      }
    };
    const selectAll = page.locator('[data-role="migration-select-all"]');
    await selectAll.waitFor();
    assert.isFalse(await selectAll.isChecked());
    assert.isTrue(
      await selectAll.evaluate(
        (element) => (element as HTMLInputElement).indeterminate,
      ),
    );
    await selectAll.click();
    await waitForAction("literature-migration-set-filter-selection");
    const bulk = actions.find(
      (entry) => entry.action === "literature-migration-set-filter-selection",
    );
    assert.exists(bulk);
    assert.deepEqual(bulk!.payload, {
      scanOperationId: "scan-1",
      selected: await selectAll.isChecked(),
    });

    assert.isTrue(
      await page.locator('[data-role="migration-first-page"]').isDisabled(),
    );
    assert.isTrue(
      await page.locator('[data-role="migration-prev-page"]').isDisabled(),
    );
    const beforeNext = actions.filter(
      (entry) => entry.action === "literature-migration-list-receipts",
    );
    assert.lengthOf(beforeNext, 0, "first/prev on page zero must not dispatch");

    await page.locator('[data-role="migration-next-page"]').click();
    await page.locator('[data-role="migration-last-page"]').click();
    await waitForAction("literature-migration-list-receipts", 2);
    const pageJumps = actions.filter(
      (entry) => entry.action === "literature-migration-list-receipts",
    );
    assert.deepEqual(pageJumps, [
      {
        action: "literature-migration-list-receipts",
        payload: { runId: "run-1", page: 1 },
      },
      {
        action: "literature-migration-list-receipts",
        payload: { runId: "run-1", page: 11 },
      },
    ]);

    const pageInput = page.locator('[data-role="migration-page-input"]');
    await pageInput.fill("10");
    assert.lengthOf(
      actions.filter(
        ({ action }) => action === "literature-migration-list-receipts",
      ),
      2,
    );
    await pageInput.press("Enter");
    await waitForAction("literature-migration-list-receipts", 3);
    const afterInput = actions.filter(
      (entry) => entry.action === "literature-migration-list-receipts",
    );
    assert.deepEqual(afterInput[2], {
      action: "literature-migration-list-receipts",
      payload: { runId: "run-1", page: 9 },
    });

    await page
      .locator('[data-role="migration-search"]')
      .fill("migration set 1");
    await waitForAction("literature-migration-set-candidate-query");
    const query = actions.find(
      (entry) => entry.action === "literature-migration-set-candidate-query",
    );
    assert.exists(query);
    assert.deepEqual(query!.payload, {
      search: "migration set 1",
      classification: "",
      reasonCode: "",
      disposition: "",
    });
    assert.lengthOf(
      actions.filter(
        ({ action }) => action === "literature-migration-list-receipts",
      ),
      3,
      "blur after Enter does not repeat the page request",
    );
  });

  it("pages all affected references and keeps responses scoped to the open document", async function () {
    const snapshot = migrationSnapshot();
    snapshot.literatureArtifactMigrationView.candidatePage.items[1]!.issues = [
      ...snapshot.literatureArtifactMigrationView.candidatePage.items[0]!
        .issues,
    ];
    await postSnapshot(page, snapshot);
    await page.locator('[data-role="migration-step-problems"]').click();
    await page.locator(".dashboard-migration-candidate").first().click();
    await page.locator('[data-role="migration-issue-items-toggle"]').click();
    const issuePage = {
      ok: true,
      scanOperationId: "scan-1",
      candidateId: "candidate-1",
      issueId: "issue-1",
      page: 0,
      pageSize: 25,
      pageCount: 2,
      total: 30,
      items: Array.from({ length: 25 }, (_, index) => ({
        label: `Reference ${index + 1}`,
        hint: "A long reference hint ".repeat(15),
        detail: "A reference detail ".repeat(30),
      })),
    };
    Object.assign(snapshot.literatureArtifactMigrationView, {
      issueItemsPage: issuePage,
    });
    await postSnapshot(page, snapshot);
    const items = page.locator(".dashboard-migration-issue-items li");
    await items.first().waitFor();
    assert.equal(await items.count(), 25);
    await items.first().locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.include(
      await items.first().innerText(),
      "A reference detail ".repeat(30).trim(),
    );
    const pager = page.locator(".dashboard-migration-issue-pagination");
    await pager.getByRole("button").last().click();
    await items.first().waitFor({ state: "hidden" });
    issuePage.page = 1;
    issuePage.items = Array.from({ length: 5 }, (_, index) => ({
      label: `Reference ${index + 26}`,
      hint: "",
      detail: "",
    }));
    await postSnapshot(page, snapshot);
    await items.first().waitFor();
    assert.equal(await items.count(), 5);
    assert.include(await items.last().innerText(), "Reference 30");
    assert.isTrue(await pager.getByRole("button").last().isDisabled());
    await page.setViewportSize({ width: 900, height: 800 });
    await page.locator(".dashboard-migration-drawer-back").click();
    await page.locator(".dashboard-migration-candidate").nth(1).focus();
    await page.keyboard.press("Enter");
    await page.locator('[data-role="migration-issue-items-toggle"]').click();
    assert.equal(
      await items.count(),
      0,
      "the other document cannot display the previous document's page",
    );
    Object.assign(snapshot.literatureArtifactMigrationView, {
      issueItemsPage: {
        ok: false,
        scanOperationId: "scan-1",
        candidateId: "candidate-2",
        issueId: "issue-1",
        page: 0,
        code: "fresh_scan_required",
        message: "internal diagnostic",
      },
    });
    await postSnapshot(page, snapshot);
    const status = page.locator(".dashboard-migration-issue [role=status]");
    await status.waitFor();
    assert.notInclude(await status.innerText(), "internal diagnostic");
    assert.equal(await items.count(), 0);
  });

  it("keeps navigation visible while long titles expand and lists scroll", async function () {
    const snapshot = migrationSnapshot();
    snapshot.literatureArtifactMigrationView.candidatePage.items[0]!.title =
      "Long document title " + "ABCDEFGHIJKLMN".repeat(30);
    await postSnapshot(page, snapshot);
    await page.locator('[data-role="migration-step-problems"]').click();
    for (const width of [1440, 900, 520]) {
      await page.setViewportSize({ width, height: 800 });
      const footer = page.locator(".dashboard-migration-wizard-actions");
      const pager = page.locator(".dashboard-migrations-pagination");
      const before = await footer.boundingBox();
      assert.isOk(before);
      const pagingBounds = await pager.boundingBox();
      assert.isOk(pagingBounds);
      assert.isAtMost(pagingBounds!.y + pagingBounds!.height, before!.y + 1);
      await page
        .locator(".dashboard-migrations-results")
        .evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
      const after = await footer.boundingBox();
      assert.equal(after!.y, before!.y);
      assert.isAtMost(after!.y + after!.height, 800);
      assert.isAtMost(after!.x + after!.width, width);
      const overflow = await page
        .locator(".dashboard-migrations")
        .evaluate((element) => element.scrollWidth - element.clientWidth);
      assert.isAtMost(overflow, 1);
    }
    await page.setViewportSize({ width: 900, height: 800 });
    const title = page
      .locator(".dashboard-migration-candidate-title-text details")
      .first();
    await title.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.isTrue(
      await title.evaluate((element) => (element as HTMLDetailsElement).open),
    );
    assert.equal(await page.locator(".dashboard-migration-drawer").count(), 0);
    const fullTitle = title.locator(".dashboard-migration-expandable-full");
    assert.isTrue(await fullTitle.isVisible());
    assert.include(await fullTitle.innerText(), "ABCDEFGHIJKLMN".repeat(30));
    await page.locator(".dashboard-migration-candidate").first().focus();
    await page.keyboard.press("Enter");
    const drawer = page.locator(".dashboard-migration-drawer");
    await drawer.waitFor();
    const drawerTitle = drawer.locator("h3 details");
    await drawerTitle.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.isTrue(
      await drawerTitle
        .locator(".dashboard-migration-expandable-full")
        .isVisible(),
    );
    for (const width of [1600, 1200, 900, 520]) {
      await page.setViewportSize({ width, height: 800 });
      const overflow = await page
        .locator(".dashboard-migrations-workspace")
        .evaluate((element) => element.scrollWidth - element.clientWidth);
      assert.isAtMost(overflow, 1, `open details fit at ${width}px`);
      const results = page.locator(".dashboard-migrations-results");
      if (await results.isVisible()) {
        assert.isAtMost(
          await results.evaluate(
            (element) => element.scrollWidth - element.clientWidth,
          ),
          1,
          `document list fits beside details at ${width}px`,
        );
      }
    }
    assert.isTrue(
      await drawer.locator(".dashboard-migration-drawer-back").isVisible(),
    );
    await drawer.locator(".dashboard-migration-drawer-back").click();
    assert.equal(await drawer.count(), 0);
  });
});

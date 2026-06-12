import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { chromium, type Browser, type Page } from "playwright";

const sampleRoot = path.resolve(
  "artifact",
  "literature-deep-reading-detr-sample",
);
const sampleHtml = path.join(sampleRoot, "result", "deep-reading.html");
const screenshotRoot = path.join(sampleRoot, "visual-regression", "latest");

type BrowserDiagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  notes: string[];
};

async function ensureSampleExists() {
  await fs.access(sampleHtml);
}

async function openSample(
  browser: Browser,
  viewport: { width: number; height: number },
  diagnostics: BrowserDiagnostics,
) {
  const page = await browser.newPage({ viewport });
  page.on("console", (message) => {
    if (message.type() === "error") {
      diagnostics.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    diagnostics.pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    diagnostics.failedRequests.push(
      `${request.url()} :: ${request.failure()?.errorText || "unknown"}`,
    );
  });

  await page.goto(pathToFileURL(sampleHtml).toString(), {
    waitUntil: "load",
    timeout: 45_000,
  });
  await page.waitForSelector("[data-paper] .aligned-block-pair", {
    timeout: 20_000,
  });
  await page.waitForSelector("[data-citation-graph] .graph-node", {
    timeout: 20_000,
  });
  return page;
}

async function writeDiagnostics(diagnostics: BrowserDiagnostics) {
  await fs.mkdir(screenshotRoot, { recursive: true });
  await fs.writeFile(
    path.join(screenshotRoot, "diagnostics.json"),
    `${JSON.stringify(diagnostics, null, 2)}\n`,
    "utf8",
  );
}

async function capture(page: Page, fileName: string) {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const filePath = path.join(screenshotRoot, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  const stat = await fs.stat(filePath);
  assert.isAbove(stat.size, 50_000, `${fileName} should not be blank`);
}

async function assertNoUnexpectedBrowserErrors(
  diagnostics: BrowserDiagnostics,
) {
  await writeDiagnostics(diagnostics);
  const nonCdnFailures = diagnostics.failedRequests.filter(
    (item) => !item.includes("cdn.jsdelivr.net"),
  );
  assert.deepEqual(diagnostics.consoleErrors, [], "browser console errors");
  assert.deepEqual(diagnostics.pageErrors, [], "browser page errors");
  assert.deepEqual(nonCdnFailures, [], "non-CDN failed requests");
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  const maxWidth = Math.max(overflow.documentWidth, overflow.bodyWidth);
  assert.isAtMost(
    maxWidth,
    overflow.viewportWidth + 8,
    `horizontal overflow: ${JSON.stringify(overflow)}`,
  );
}

async function assertMainSurfaces(page: Page) {
  const counts = await page.evaluate(() => ({
    toc: document.querySelectorAll("[data-toc] a").length,
    preface: document.querySelectorAll("[data-preface] h1").length,
    paperBlocks: document.querySelectorAll("[data-paper] .aligned-block-pair")
      .length,
    translatedBlocks: document.querySelectorAll(
      "[data-translation-paper] [data-translation-anchor]",
    ).length,
    summary: document.querySelectorAll("[data-summary] h1").length,
    references: document.querySelectorAll(".structured-references").length,
    referenceItems: document.querySelectorAll(".reference-item").length,
    graphNodes: document.querySelectorAll(".graph-node").length,
    graphLegend: document.querySelectorAll(".graph-legend-item").length,
    extensions: document.querySelectorAll("[data-extensions] .extension")
      .length,
    sideSections: document.querySelectorAll("[data-side] section").length,
    concepts: document.querySelectorAll("[data-concept-chip]").length,
  }));

  assert.isAtLeast(counts.toc, 10, "left navigation should be populated");
  assert.equal(counts.preface, 1, "preface should render");
  assert.isAtLeast(counts.paperBlocks, 40, "paper blocks should render");
  assert.isAtLeast(
    counts.translatedBlocks,
    40,
    "translated blocks should render",
  );
  assert.equal(counts.summary, 1, "summary should render");
  assert.equal(counts.references, 1, "structured references should render");
  assert.isAtLeast(
    counts.referenceItems,
    40,
    "structured reference items should render",
  );
  assert.isAtLeast(counts.graphNodes, 20, "citation graph nodes should render");
  assert.isAtLeast(
    counts.graphLegend,
    4,
    "citation graph legend should render",
  );
  assert.isAtLeast(counts.extensions, 1, "extensions should render");
  assert.isAtLeast(
    counts.sideSections,
    1,
    "reading aid side rail should render",
  );
  assert.isAtLeast(counts.concepts, 10, "concept drawer should render");
}

async function assertReadingModes(page: Page) {
  for (const mode of ["original", "translated", "compare", "focus"]) {
    await page.locator(`[data-mode="${mode}"]`).click();
    await page.waitForTimeout(150);
    const state = await page.evaluate(() => ({
      bodyClass: document.body.className,
      readingDisplay: getComputedStyle(
        document.querySelector("[data-paper]") as Element,
      ).display,
      translationDisplay: getComputedStyle(
        document.querySelector("[data-translation-paper]") as Element,
      ).display,
      sourceDisplay: getComputedStyle(
        document.querySelector(".aligned-source") as Element,
      ).display,
      alignedTranslationDisplay: getComputedStyle(
        document.querySelector(".aligned-translation") as Element,
      ).display,
      sideDisplay: getComputedStyle(
        document.querySelector("[data-side]") as Element,
      ).display,
    }));
    assert.include(state.bodyClass, `mode-${mode}`);
    if (mode === "original") {
      assert.notEqual(state.readingDisplay, "none");
      assert.equal(state.alignedTranslationDisplay, "none");
    } else if (mode === "translated") {
      assert.equal(state.readingDisplay, "none");
      assert.notEqual(state.translationDisplay, "none");
    } else if (mode === "compare") {
      assert.notEqual(state.readingDisplay, "none");
      assert.notEqual(state.sourceDisplay, "none");
      assert.notEqual(state.alignedTranslationDisplay, "none");
    } else if (mode === "focus") {
      assert.notEqual(state.readingDisplay, "none");
      assert.equal(state.alignedTranslationDisplay, "none");
      assert.equal(state.sideDisplay, "none");
    }
  }
  await page.locator('[data-mode="compare"]').click();
}

async function assertCompareLayout(page: Page) {
  await page.locator('[data-mode="compare"]').click();
  await page.waitForTimeout(150);
  const layout = await page.evaluate(() => {
    const source = document.querySelector(".aligned-source") as HTMLElement;
    const translation = document.querySelector(
      ".aligned-translation",
    ) as HTMLElement;
    const references = document.querySelector(
      ".structured-references",
    ) as HTMLElement;
    return {
      sourceWidth: source.getBoundingClientRect().width,
      translationWidth: translation.getBoundingClientRect().width,
      sourceTop: source.getBoundingClientRect().top,
      translationTop: translation.getBoundingClientRect().top,
      referencesInsideReadingFlow: Boolean(
        references.closest("[data-paper] .aligned-block-pair"),
      ),
      referencesWidth: references.getBoundingClientRect().width,
    };
  });

  assert.closeTo(
    layout.sourceWidth,
    layout.translationWidth,
    2,
    "source and translation columns should be equal width",
  );
  assert.closeTo(
    layout.sourceTop,
    layout.translationTop,
    2,
    "first source and translation block should align at top",
  );
  assert.isFalse(
    layout.referencesInsideReadingFlow,
    "references should not be inside translated reading blocks",
  );
  assert.isAbove(
    layout.referencesWidth,
    layout.sourceWidth * 1.4,
    "references should span wider than one compare column",
  );
}

async function assertNavigationAndConceptOverlay(page: Page) {
  const firstBodyAnchor = await page
    .locator("[data-toc] a.level-2")
    .first()
    .getAttribute("href");
  assert.isString(firstBodyAnchor);
  await page.locator(`[data-toc] a[href="${firstBodyAnchor}"]`).click();
  await page.waitForTimeout(250);
  const sideHasCurrentContent = await page
    .locator("[data-side] section")
    .first()
    .isVisible();
  assert.isTrue(
    sideHasCurrentContent,
    "side reading aid should stay populated",
  );

  await page.locator("[data-concept-toggle]").click();
  await page.waitForTimeout(150);
  await page.locator("[data-concept-chip]").first().hover();
  await page.waitForSelector(".concept-bubble", { timeout: 5_000 });
  assert.isTrue(
    await page.locator(".concept-bubble").first().isVisible(),
    "concept bubble should open",
  );
  await page.mouse.move(20, 20);
  await page.waitForTimeout(250);
  assert.equal(
    await page.locator(".concept-bubble").count(),
    0,
    "concept bubble should close",
  );
}

async function assertReferencesDigestModalIfAvailable(
  page: Page,
  diagnostics: BrowserDiagnostics,
) {
  const digestTrigger = page
    .locator(
      "[data-reference-digest], [data-digest-modal-open], .reference-digest-button",
    )
    .first();
  if ((await digestTrigger.count()) === 0) {
    diagnostics.notes.push(
      "DETR sample does not expose a reference digest modal trigger yet; structured references were checked instead.",
    );
    return;
  }

  await digestTrigger.click();
  await page.waitForSelector(
    "[data-digest-modal], .digest-modal, .reference-digest-modal",
    { timeout: 5_000 },
  );
  assert.isTrue(
    await page
      .locator("[data-digest-modal], .digest-modal, .reference-digest-modal")
      .first()
      .isVisible(),
    "reference digest modal should open",
  );
  await page.keyboard.press("Escape");
}

async function assertCitationGraphInteractions(page: Page) {
  await page.locator("#citation-graph").scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const startNode = page.locator('[data-node-id="zotero:item:EIMSDEU3"]');
  await startNode.hover();
  await page.waitForTimeout(150);
  assert.isAbove(
    await page.locator(".graph-edge").count(),
    0,
    "hover should reveal citation graph edges",
  );
  const hoverLabelCount = await page.locator(".graph-label").count();
  assert.isAtMost(
    hoverLabelCount,
    25,
    "hover should not leave excessive graph labels",
  );
  await startNode.click();
  await page.waitForTimeout(150);
  assert.isTrue(
    await page.locator(".graph-detail h3").first().isVisible(),
    "graph selection detail should render",
  );

  const selectedLabelCount = await page.locator(".graph-label").count();
  assert.isAtMost(
    selectedLabelCount,
    25,
    "selection should not render two-hop label clutter",
  );

  await page.locator('[data-graph-filter="external"]').click();
  await page.waitForTimeout(150);
  assert.isAbove(
    await page.locator(".graph-node").count(),
    0,
    "graph should still have nodes after external filter",
  );

  await page.locator("[data-graph-reset]").click();
  await page.waitForTimeout(150);
  assert.equal(
    await page.locator(".graph-label").count(),
    0,
    "graph reset should clear labels",
  );
}

describe("literature deep reading DETR browser visual regression", function () {
  this.timeout(90_000);

  let browser: Browser;
  const diagnostics: BrowserDiagnostics = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    notes: [],
  };

  before(async () => {
    await ensureSampleExists();
    browser = await chromium.launch();
  });

  after(async () => {
    await browser?.close();
    await assertNoUnexpectedBrowserErrors(diagnostics);
  });

  it("renders the desktop full artifact and exercises core interactions", async () => {
    const page = await openSample(
      browser,
      { width: 1440, height: 1000 },
      diagnostics,
    );
    try {
      await assertMainSurfaces(page);
      await assertReadingModes(page);
      await assertCompareLayout(page);
      await assertNavigationAndConceptOverlay(page);
      await assertReferencesDigestModalIfAvailable(page, diagnostics);
      await assertCitationGraphInteractions(page);
      await assertNoHorizontalOverflow(page);
      await capture(page, "desktop-graph-selected.png");
      await page.locator('[data-mode="compare"]').click();
      await page.locator("[data-preface]").scrollIntoViewIfNeeded();
      await capture(page, "desktop-compare.png");
    } finally {
      await page.close();
    }
  });

  it("keeps the narrow viewport usable without horizontal overflow", async () => {
    const page = await openSample(
      browser,
      { width: 390, height: 900 },
      diagnostics,
    );
    try {
      await assertMainSurfaces(page);
      await page.locator('[data-mode="compare"]').click();
      await page.waitForTimeout(150);
      await assertNoHorizontalOverflow(page);
      await page.locator("[data-concept-toggle]").click();
      await page.waitForTimeout(150);
      assert.isTrue(
        await page.locator("[data-concept-chip]").first().isVisible(),
        "mobile concept strip should be visible after opening",
      );
      await capture(page, "mobile-compare.png");
    } finally {
      await page.close();
    }
  });
});

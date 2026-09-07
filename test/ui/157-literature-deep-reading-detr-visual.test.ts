import { assert } from "chai";
import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { pathToFileURL } from "url";
import { build } from "esbuild";
import { chromium, type Browser, type Page } from "playwright";
import {
  applySynthesisUiAction,
  buildSynthesisUiSnapshot,
  createDefaultSynthesisUiState,
} from "../../src/modules/synthesis/uiModel";

const execFileAsync = promisify(execFile);

const sampleRoot = path.resolve(
  "test",
  "fixtures",
  "literature-deep-reading-detr-sample",
);
const sampleHtml = path.join(sampleRoot, "result", "deep-reading.html");
const screenshotRoot = path.resolve(
  "artifact",
  "test-diagnostics",
  "literature-deep-reading-detr-visual",
  "latest",
);

type BrowserDiagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  notes: string[];
};

async function ensureSampleExists() {
  try {
    await fs.access(sampleHtml);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
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
  await page.waitForSelector(
    "[data-citation-graph-synthesis-frame], [data-citation-graph] .zs-cg-svg, [data-citation-graph] .graph-node",
    {
      timeout: 20_000,
    },
  );
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
    graphStatus: document
      .querySelector("[data-citation-graph]")
      ?.getAttribute("data-zs-cg-status"),
    graphCanvases:
      document.querySelectorAll(".zs-cg-stage canvas").length +
      ((
        document.querySelector(
          "[data-citation-graph-synthesis-frame]",
        ) as HTMLIFrameElement | null
      )?.contentDocument?.querySelectorAll(".graph-stage canvas").length || 0),
    fallbackGraphNodes: document.querySelectorAll(
      "[data-citation-graph] .graph-node",
    ).length,
    fallbackSvg: document.querySelectorAll("[data-citation-graph] .zs-cg-svg")
      .length,
    graphStageWidth:
      document.querySelector(".zs-cg-stage")?.getBoundingClientRect().width ||
      (
        document.querySelector(
          "[data-citation-graph-synthesis-frame]",
        ) as HTMLIFrameElement | null
      )?.contentDocument
        ?.querySelector(".graph-stage")
        ?.getBoundingClientRect().width ||
      0,
    graphStageHeight:
      document.querySelector(".zs-cg-stage")?.getBoundingClientRect().height ||
      (
        document.querySelector(
          "[data-citation-graph-synthesis-frame]",
        ) as HTMLIFrameElement | null
      )?.contentDocument
        ?.querySelector(".graph-stage")
        ?.getBoundingClientRect().height ||
      0,
    graphLegend:
      document.querySelectorAll(".zs-cg-legend span").length +
      ((
        document.querySelector(
          "[data-citation-graph-synthesis-frame]",
        ) as HTMLIFrameElement | null
      )?.contentDocument?.querySelectorAll(
        ".citation-graph-legend span, .citation-graph-legend li",
      ).length || 0),
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
  if (counts.graphStatus) {
    assert.equal(
      counts.graphStatus,
      "ready",
      "citation graph should initialize",
    );
    if (counts.graphCanvases === 0) {
      assert.isAtLeast(
        counts.fallbackGraphNodes,
        20,
        "citation graph SVG nodes should render",
      );
    } else {
      assert.isAtLeast(
        counts.graphCanvases,
        1,
        "citation graph canvas should render",
      );
    }
    assert.isAtLeast(
      counts.graphStageWidth,
      520,
      "citation graph stage should not be cramped",
    );
    assert.isAtLeast(
      counts.graphStageHeight,
      360,
      "citation graph stage should have stable height",
    );
    assert.isAtLeast(
      counts.graphLegend,
      4,
      "citation graph legend should render",
    );
  } else {
    assert.isAtLeast(
      counts.fallbackGraphNodes,
      20,
      "legacy graph sample should be allowed",
    );
  }
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
  if (
    (await page.locator("[data-citation-graph-synthesis-frame]").count()) > 0
  ) {
    const graphState = await page.evaluate(() => {
      const section = document.querySelector("[data-citation-graph]");
      const frame = document.querySelector(
        "[data-citation-graph-synthesis-frame]",
      ) as HTMLIFrameElement | null;
      const doc = frame?.contentDocument;
      const stage = doc?.querySelector(".graph-stage");
      const rect = stage?.getBoundingClientRect();
      return {
        status: section?.getAttribute("data-zs-cg-status"),
        error: section?.getAttribute("data-zs-cg-error"),
        fallback: section?.getAttribute("data-zs-cg-fallback"),
        canvasCount: stage?.querySelectorAll("canvas").length || 0,
        width: rect?.width || 0,
        height: rect?.height || 0,
        hasControlDrawer: Boolean(doc?.querySelector(".graph-control-drawer")),
      };
    });
    assert.equal(graphState.status, "ready", graphState.error || "");
    assert.isNull(graphState.fallback);
    assert.isAtLeast(graphState.canvasCount, 1);
    assert.isAtLeast(graphState.width, 520);
    assert.isAtLeast(graphState.height, 360);
    assert.isFalse(graphState.hasControlDrawer);
    const identityBefore = await page.evaluate(() => {
      const frame = document.querySelector(
        "[data-citation-graph-synthesis-frame]",
      ) as HTMLIFrameElement | null;
      const frameWindow = frame?.contentWindow as
        | (Window & { __citationGraphIdentity?: Record<string, unknown> })
        | null;
      const stage = frame?.contentDocument?.querySelector(".sigma-stage");
      const canvases = Array.from(stage?.querySelectorAll("canvas") || []);
      const contexts = canvases
        .map(
          (canvas) => canvas.getContext("webgl2") || canvas.getContext("webgl"),
        )
        .filter(Boolean);
      if (frameWindow) {
        frameWindow.__citationGraphIdentity = { stage, canvases, contexts };
      }
      return { canvasCount: canvases.length, contextCount: contexts.length };
    });
    assert.isAtLeast(identityBefore.canvasCount, 1);
    assert.isAtLeast(identityBefore.contextCount, 1);
    await page
      .frameLocator("[data-citation-graph-synthesis-frame]")
      .locator(".sigma-stage")
      .click({ position: { x: 12, y: 12 } });
    await page.setViewportSize({ width: 1320, height: 1000 });
    await page.waitForTimeout(200);
    const identityAfter = await page.evaluate(() => {
      const frame = document.querySelector(
        "[data-citation-graph-synthesis-frame]",
      ) as HTMLIFrameElement | null;
      const frameWindow = frame?.contentWindow as
        | (Window & {
            __citationGraphIdentity?: {
              stage?: Element;
              canvases?: HTMLCanvasElement[];
              contexts?: WebGLRenderingContext[];
            };
          })
        | null;
      const previous = frameWindow?.__citationGraphIdentity;
      const stage = frame?.contentDocument?.querySelector(".sigma-stage");
      const canvases = Array.from(stage?.querySelectorAll("canvas") || []);
      const contexts = canvases
        .map(
          (canvas) => canvas.getContext("webgl2") || canvas.getContext("webgl"),
        )
        .filter(Boolean);
      return {
        sameStage: previous?.stage === stage,
        sameCanvases:
          previous?.canvases?.length === canvases.length &&
          previous.canvases.every(
            (canvas, index) => canvas === canvases[index],
          ),
        sameContexts:
          previous?.contexts?.length === contexts.length &&
          previous.contexts.every(
            (context, index) => context === contexts[index],
          ),
        contextLost: contexts.some((context) => context.isContextLost()),
      };
    });
    assert.isTrue(identityAfter.sameStage);
    assert.isTrue(identityAfter.sameCanvases);
    assert.isTrue(identityAfter.sameContexts);
    assert.isFalse(identityAfter.contextLost);
    await page.setViewportSize({ width: 1440, height: 1000 });
    return;
  }

  const startNode = page.locator("[data-citation-graph] .graph-node").first();
  await startNode.hover();
  await page.waitForTimeout(180);
  const fallbackState = await page.evaluate(() => ({
    status: document
      .querySelector("[data-citation-graph]")
      ?.getAttribute("data-zs-cg-status"),
    error: document
      .querySelector("[data-citation-graph]")
      ?.getAttribute("data-zs-cg-error"),
    svgCount: document.querySelectorAll("[data-citation-graph] .zs-cg-svg")
      .length,
    activeEdges: document.querySelectorAll(
      "[data-citation-graph] .graph-edge.is-active",
    ).length,
    activeNodes: document.querySelectorAll(
      "[data-citation-graph] .graph-node.is-active",
    ).length,
    labels: document.querySelectorAll("[data-citation-graph] .graph-node-label")
      .length,
    searchControls: document.querySelectorAll("[data-zs-cg-search]").length,
    detailPanels: document.querySelectorAll(
      "[data-zs-cg-detail], .graph-detail, .zs-cg-detail",
    ).length,
  }));
  assert.equal(fallbackState.status, "ready", fallbackState.error || "");
  assert.equal(fallbackState.svgCount, 1);
  assert.isAbove(fallbackState.activeEdges, 0, "hover should highlight edges");
  assert.isAbove(fallbackState.activeNodes, 0, "hover should highlight nodes");
  assert.isAbove(fallbackState.labels, 0, "hover should show labels");
  assert.equal(fallbackState.searchControls, 0);
  assert.equal(fallbackState.detailPanels, 0);
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

  before(async function () {
    if (!(await ensureSampleExists())) {
      this.skip();
    }
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

describe("Synthesis Citation Graph WebGL lifecycle", function () {
  this.timeout(90_000);

  let browser: Browser;
  let tempRoot = "";
  let page: Page;
  let debugPage: Page;
  const pageErrors: string[] = [];

  function lifecycleSnapshot(args?: {
    tab?: "overview" | "graph";
    selectedNodeId?: string;
    expanded?: boolean;
    layoutFailure?: boolean;
    withoutCoordinates?: boolean;
  }) {
    let uiState = createDefaultSynthesisUiState();
    uiState = applySynthesisUiAction(uiState, {
      action: "selectTab",
      payload: { tab: args?.tab || "graph" },
    }).state;
    if (args?.selectedNodeId) {
      uiState = applySynthesisUiAction(uiState, {
        action: "setGraphView",
        payload: {
          selectedElement: { kind: "node", id: args.selectedNodeId },
        },
      }).state;
    }
    const nodes = [
      {
        id: "zotero:item:A",
        label: "Alpha",
        kind: "library_paper" as const,
        x: args?.withoutCoordinates ? undefined : -1,
        y: args?.withoutCoordinates ? undefined : 0,
      },
      {
        id: "ref:X",
        label: "Shared external",
        kind: "external_reference" as const,
        display_tier: "shared_external" as const,
        x: args?.withoutCoordinates ? undefined : 1,
        y: args?.withoutCoordinates ? undefined : 0,
      },
      ...(args?.expanded
        ? [
            {
              id: "zotero:item:B",
              label: "Beta",
              kind: "library_paper" as const,
              x: args?.withoutCoordinates ? undefined : 0,
              y: args?.withoutCoordinates ? undefined : 1,
            },
          ]
        : []),
    ];
    const edges = [
      {
        id: "edge:A:X",
        source: "zotero:item:A",
        target: "ref:X",
        primary_role: "background",
        mention_count: 1,
      },
      ...(args?.expanded
        ? [
            {
              id: "edge:B:X",
              source: "zotero:item:B",
              target: "ref:X",
              primary_role: "method",
              mention_count: 1,
            },
          ]
        : []),
    ];
    return buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        graph: {
          graph_hash: "sha256:stable-window",
          layoutStatus:
            args?.layoutFailure && args.withoutCoordinates ? "failed" : "ready",
          nodes,
          edges,
          page: {
            nextCursor: args?.expanded ? "" : "cursor-1",
            hasMore: !args?.expanded,
            totalNodes: 3,
            totalEdges: 2,
            totalHoverNodes: 0,
            totalHoverEdges: 0,
            returnedNodes: nodes.length,
            returnedEdges: edges.length,
            returnedHoverNodes: 0,
            returnedHoverEdges: 0,
            querySignature: "sha256:stable-query",
            layoutStatus: "ready",
            windowStatus: args?.expanded ? "complete" : "loading",
            roleOptions: ["background", "method"],
          },
          diagnostics: {
            cache_status: "ready",
            library_node_count: args?.expanded ? 2 : 1,
            shared_external_count: 1,
            hover_only_external_count: 0,
            ...(args?.layoutFailure
              ? {
                  layout_failure: {
                    graph_hash: "sha256:stable-window",
                    layout_algorithm: "force",
                    code: "invalid_request",
                    mutation_status: "invalid_request",
                    message: "The optional year was rejected.",
                    occurred_at: "2026-08-01T00:00:00.000Z",
                  },
                }
              : {}),
          },
        },
      },
      uiState,
    );
  }

  function interactionSnapshot(selectedNodeId?: string) {
    let uiState = createDefaultSynthesisUiState();
    uiState = applySynthesisUiAction(uiState, {
      action: "selectTab",
      payload: { tab: "graph" },
    }).state;
    if (selectedNodeId) {
      uiState = applySynthesisUiAction(uiState, {
        action: "setGraphView",
        payload: {
          selectedElement: { kind: "node", id: selectedNodeId },
        },
      }).state;
    }
    const nodes = [
      {
        id: "zotero:item:A",
        label: "Alpha",
        kind: "library_paper" as const,
        is_focus: true,
        x: -1,
        y: 0,
      },
      {
        id: "zotero:item:B",
        label: "Beta",
        kind: "library_paper" as const,
        x: 0,
        y: 1,
      },
      {
        id: "zotero:item:C",
        label: "Gamma",
        kind: "library_paper" as const,
        x: 0,
        y: -1,
      },
      {
        id: "ref:X",
        label: "Shared external",
        kind: "external_reference" as const,
        x: 1,
        y: 0,
      },
      {
        id: "ref:Y",
        label: "Alpha-only external",
        kind: "external_reference" as const,
        x: -0.5,
        y: 0.5,
      },
      {
        id: "ref:Z",
        label: "Beta-only external",
        kind: "external_reference" as const,
        x: 0.5,
        y: 1,
      },
    ];
    const edges = [
      {
        id: "edge:A:X",
        source: "zotero:item:A",
        target: "ref:X",
        primary_role: "background",
      },
      {
        id: "edge:C:X",
        source: "zotero:item:C",
        target: "ref:X",
        primary_role: "method",
      },
      {
        id: "edge:A:Y",
        source: "zotero:item:A",
        target: "ref:Y",
        primary_role: "background",
      },
      {
        id: "edge:A:Y:repeat",
        source: "zotero:item:A",
        target: "ref:Y",
        primary_role: "background",
      },
      {
        id: "edge:B:Z",
        source: "zotero:item:B",
        target: "ref:Z",
        primary_role: "method",
      },
    ];
    return buildSynthesisUiSnapshot(
      {
        libraryId: 1,
        graph: {
          graph_hash: "sha256:interaction-union",
          layoutStatus: "ready",
          nodes,
          edges,
          page: {
            nextCursor: "",
            hasMore: false,
            totalNodes: nodes.length,
            totalEdges: edges.length,
            totalHoverNodes: 2,
            totalHoverEdges: 2,
            returnedNodes: nodes.length,
            returnedEdges: edges.length,
            returnedHoverNodes: 2,
            returnedHoverEdges: 2,
            querySignature: "sha256:interaction-query",
            layoutStatus: "ready",
            windowStatus: "complete",
            roleOptions: ["background", "method"],
          },
        },
      },
      uiState,
    );
  }

  async function sendSnapshot(snapshot: unknown, target = page) {
    await target.evaluate((payload) => {
      window.postMessage({ type: "synthesis:snapshot", payload }, "*");
    }, snapshot);
    await target.waitForTimeout(100);
  }

  async function sendSurface(
    snapshot: unknown,
    requestId: number,
    target = page,
  ) {
    await target.evaluate(
      ({ payload, id }) => {
        window.postMessage(
          {
            type: "synthesis:surface",
            payload: { surface: "graph", requestId: id, snapshot: payload },
          },
          "*",
        );
      },
      { payload: snapshot, id: requestId },
    );
    await target.waitForTimeout(100);
  }

  async function sendGraphPage(snapshot: unknown) {
    await page.evaluate((payload) => {
      window.postMessage(
        { type: "synthesis:graph-page", payload: { snapshot: payload } },
        "*",
      );
    }, snapshot);
    await page.waitForTimeout(100);
  }

  async function graphIdentity() {
    return page.evaluate(() => {
      const lifecycleWindow = window as Window & {
        __graphLifecycleIdentity?: {
          surface: Element;
          stage: Element;
          canvases: HTMLCanvasElement[];
          contexts: WebGLRenderingContext[];
          controls: Element | null;
          selection: Element | null;
        };
      };
      const surface = document.querySelector(
        '[data-region-content="synthesis-graph"]',
      );
      const stage = surface?.querySelector(".sigma-stage");
      const canvases = Array.from(stage?.querySelectorAll("canvas") || []);
      const contexts = canvases
        .map(
          (canvas) => canvas.getContext("webgl2") || canvas.getContext("webgl"),
        )
        .filter((context): context is WebGLRenderingContext =>
          Boolean(context),
        );
      const controls = surface?.querySelector(".graph-control-drawer") || null;
      const selection =
        surface?.querySelector(".graph-selection-drawer") || null;
      const previous = lifecycleWindow.__graphLifecycleIdentity;
      if (!previous && surface && stage) {
        lifecycleWindow.__graphLifecycleIdentity = {
          surface,
          stage,
          canvases,
          contexts,
          controls,
          selection,
        };
      }
      return {
        surfacePresent: Boolean(surface),
        canvasCount: canvases.length,
        contextCount: contexts.length,
        sameSurface: !previous || previous.surface === surface,
        sameStage: !previous || previous.stage === stage,
        sameCanvases:
          !previous ||
          (previous.canvases.length === canvases.length &&
            previous.canvases.every(
              (canvas, index) => canvas === canvases[index],
            )),
        sameContexts:
          !previous ||
          (previous.contexts.length === contexts.length &&
            previous.contexts.every(
              (context, index) => context === contexts[index],
            )),
        sameControls: !previous || previous.controls === controls,
        sameSelection: !previous || previous.selection === selection,
        contextLost: contexts.some((context) => context.isContextLost()),
      };
    });
  }

  before(async function () {
    tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zotero-agents-citation-graph-lifecycle-"),
    );
    const bundlePath = path.join(tempRoot, "app.js");
    const debugBundlePath = path.join(tempRoot, "app-debug.js");
    const htmlPath = path.join(tempRoot, "index.html");
    const debugHtmlPath = path.join(tempRoot, "index-debug.html");
    const esbuildBin = path.resolve("node_modules", ".bin", "esbuild");
    await build({
      stdin: {
        contents: `
          import { bootstrapSynthesisWorkbench } from "./src/synthesis/synthesisWorkbenchApp";
          import { mountStandaloneGraph } from "./src/synthesis/standaloneGraphApp";
          import { synthesisGraphVendors } from "./src/shared/synthesisGraphVendors";
          import { updateStandaloneGraph } from "./src/synthesis/standaloneGraphState";
          class ObservedSigma extends synthesisGraphVendors.Sigma {
            constructor(...args) {
              super(...args);
              window.__citationGraphTestSigma = this;
              window.__citationGraphTestDrawNodeHover = args[2].defaultDrawNodeHover;
            }
          }
          const vendors = { ...synthesisGraphVendors, Sigma: ObservedSigma };
          const page = bootstrapSynthesisWorkbench({ vendors });
          let disposeStandalone;
          window.__citationGraphTestApplyStandalone = (envelope) => {
            page.dispose();
            disposeStandalone?.();
            disposeStandalone = mountStandaloneGraph(document.getElementById("app"), envelope, vendors);
          };
          window.__citationGraphTestProjectFilters = (graph, filters) => updateStandaloneGraph(graph, {}, filters);
        `,
        resolveDir: process.cwd(),
        loader: "ts",
      },
      bundle: true,
      jsx: "automatic",
      jsxImportSource: "preact",
      format: "iife",
      target: "es2020",
      define: { __debug_mode__: "false" },
      outfile: bundlePath,
    });
    await execFileAsync(esbuildBin, [
      path.resolve("src", "synthesisWorkbenchApp.ts"),
      "--bundle",
      "--format=iife",
      "--target=es2020",
      "--define:__debug_mode__=true",
      "--jsx=automatic",
      "--jsx-import-source=preact",
      `--outfile=${debugBundlePath}`,
    ]);
    const stylesheetUrl = pathToFileURL(
      path.resolve("addon", "content", "synthesis", "styles.css"),
    ).toString();
    const bundleUrl = pathToFileURL(bundlePath).toString();
    const debugBundleUrl = pathToFileURL(debugBundlePath).toString();
    await fs.writeFile(
      htmlPath,
      `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${stylesheetUrl}"><style>html,body{width:100%;height:100%;margin:0}</style></head><body><div id="app" class="synthesis-root"></div><script src="${bundleUrl}"></script></body></html>`,
      "utf8",
    );
    await fs.writeFile(
      debugHtmlPath,
      `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${stylesheetUrl}"></head><body><div id="app" class="synthesis-root"></div><script src="${debugBundleUrl}"></script></body></html>`,
      "utf8",
    );
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(pathToFileURL(htmlPath).toString(), { waitUntil: "load" });
    debugPage = await browser.newPage({
      viewport: { width: 1200, height: 800 },
    });
    debugPage.on("pageerror", (error) => pageErrors.push(error.message));
    await debugPage.goto(pathToFileURL(debugHtmlPath).toString(), {
      waitUntil: "load",
    });
  });

  after(async function () {
    await page?.close();
    await debugPage?.close();
    await browser?.close();
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  beforeEach(async function () {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.mouse.move(0, 0);
  });

  it("preserves canvas and WebGL context identity across routine updates", async function () {
    await sendSnapshot(lifecycleSnapshot({ selectedNodeId: "zotero:item:A" }));
    assert.deepEqual(pageErrors, [], "initial graph render errors");
    await page.waitForSelector(".sigma-stage canvas", { timeout: 20_000 });
    const initial = await graphIdentity();
    assert.isTrue(initial.surfacePresent);
    assert.isAtLeast(initial.canvasCount, 1);
    assert.isAtLeast(initial.contextCount, 1);

    await sendGraphPage(
      lifecycleSnapshot({
        selectedNodeId: "zotero:item:A",
        expanded: true,
      }),
    );
    const afterPage = await graphIdentity();
    assert.isTrue(afterPage.sameSurface);
    assert.isTrue(afterPage.sameStage);
    assert.isTrue(afterPage.sameCanvases);
    assert.isTrue(afterPage.sameContexts);
    assert.isTrue(afterPage.sameControls);
    assert.isTrue(afterPage.sameSelection);

    await page.locator(".sidebar-collapse-toggle").click();
    await sendSnapshot(lifecycleSnapshot({ selectedNodeId: "zotero:item:A" }));
    await sendSnapshot(lifecycleSnapshot({ tab: "overview" }));
    await sendSnapshot(lifecycleSnapshot());
    await sendSnapshot(lifecycleSnapshot({ expanded: true }));
    await page.setViewportSize({ width: 980, height: 800 });
    await page.waitForTimeout(200);

    const afterUpdates = await graphIdentity();
    assert.isTrue(afterUpdates.sameSurface);
    assert.isTrue(afterUpdates.sameStage);
    assert.isTrue(afterUpdates.sameCanvases);
    assert.isTrue(afterUpdates.sameContexts);
    assert.isFalse(afterUpdates.contextLost);
    assert.deepEqual(pageErrors, []);
  });

  it("promotes external nodes after a second library source while keeping edges interaction-only", async function () {
    await page.reload({ waitUntil: "load" });
    await sendSnapshot(lifecycleSnapshot());
    await page.waitForSelector(".sigma-stage canvas", { timeout: 20_000 });

    const firstPage = await page.evaluate(() => {
      const renderer = (
        window as Window & {
          __citationGraphTestSigma?: {
            getNodeDisplayData: (node: string) => unknown;
            getEdgeDisplayData: (edge: string) => unknown;
          };
        }
      ).__citationGraphTestSigma;
      return renderer
        ? {
            external: renderer.getNodeDisplayData("ref:X"),
            edge: renderer.getEdgeDisplayData("edge:A:X"),
          }
        : null;
    });
    assert.deepEqual(firstPage, { external: undefined, edge: undefined });

    const identityBeforePromotion = await graphIdentity();
    await sendGraphPage(lifecycleSnapshot({ expanded: true }));
    const promoted = await page.evaluate(() => {
      const renderer = (
        window as Window & {
          __citationGraphTestSigma?: {
            getNodeDisplayData: (node: string) => unknown;
            getEdgeDisplayData: (
              edge: string,
            ) => { hidden?: boolean } | undefined;
            graphToViewport: (point: { x: number; y: number }) => {
              x: number;
              y: number;
            };
          };
        }
      ).__citationGraphTestSigma;
      return renderer
        ? {
            externalPresent: Boolean(renderer.getNodeDisplayData("ref:X")),
            firstEdgeHidden: renderer.getEdgeDisplayData("edge:A:X")?.hidden,
            secondEdgeHidden: renderer.getEdgeDisplayData("edge:B:X")?.hidden,
          }
        : null;
    });
    const identityAfterPromotion = await graphIdentity();

    assert.deepEqual(promoted, {
      externalPresent: true,
      firstEdgeHidden: true,
      secondEdgeHidden: true,
    });
    assert.isTrue(identityBeforePromotion.sameSurface);
    assert.isTrue(identityAfterPromotion.sameSurface);
    assert.isTrue(identityAfterPromotion.sameStage);
    assert.isTrue(identityAfterPromotion.sameCanvases);
    assert.isTrue(identityAfterPromotion.sameContexts);
    assert.deepEqual(pageErrors, []);
  });

  it("projects a standalone graph before first render and keeps no-op filter results identical", async function () {
    await page.reload({ waitUntil: "load" });
    const base = lifecycleSnapshot({ expanded: true });
    const graph = base.graph;
    const singleNode = {
      id: "ref:Y",
      label: "Single external",
      kind: "external_reference" as const,
      x: 0.5,
      y: -1,
    };
    const disconnectedNode = {
      id: "ref:Z",
      label: "Disconnected external",
      kind: "external_reference" as const,
      x: -0.5,
      y: -1,
    };
    const singleEdge = {
      id: "edge:A:Y",
      source: "zotero:item:A",
      target: "ref:Y",
      primary_role: "background",
      mention_count: 1,
    };
    const rawGraph = {
      ...graph,
      nodes: [...graph.nodes, singleNode, disconnectedNode],
      edges: [...graph.edges, singleEdge],
      visibleNodes: [...graph.nodes, singleNode, disconnectedNode],
      visibleEdges: [...graph.edges, singleEdge],
      hoverOnlyNodes: [],
      hoverOnlyEdges: [],
    };

    await page.evaluate(
      ({ snapshot, standaloneGraph }) => {
        const testWindow = window as Window & {
          __citationGraphTestApplyStandalone?: (envelope: unknown) => boolean;
        };
        testWindow.__citationGraphTestApplyStandalone?.({
          version: 1,
          scopeLabel: "Test graph",
          focusNodeId: "zotero:item:A",
          snapshot: { ...snapshot, graph: standaloneGraph },
          graphLayouts: { force: standaloneGraph },
        });
      },
      { snapshot: base, standaloneGraph: rawGraph },
    );
    await page.waitForSelector(".sigma-stage canvas", { timeout: 20_000 });

    const readProjection = () =>
      page.evaluate(() => {
        const testWindow = window as Window & {
          __citationGraphTestSigma?: {
            getNodeDisplayData: (node: string) => unknown;
            getEdgeDisplayData: (
              edge: string,
            ) => { hidden?: boolean } | undefined;
          };
        };
        const renderer = testWindow.__citationGraphTestSigma;
        return renderer
          ? {
              sharedPresent: Boolean(renderer.getNodeDisplayData("ref:X")),
              singlePresent: Boolean(renderer.getNodeDisplayData("ref:Y")),
              disconnectedPresent: Boolean(
                renderer.getNodeDisplayData("ref:Z"),
              ),
              sharedEdgesHidden: [
                renderer.getEdgeDisplayData("edge:A:X")?.hidden,
                renderer.getEdgeDisplayData("edge:B:X")?.hidden,
              ],
              singleEdgePresent: Boolean(
                renderer.getEdgeDisplayData("edge:A:Y"),
              ),
            }
          : null;
      });

    const initial = await readProjection();
    assert.deepEqual(initial, {
      sharedPresent: true,
      singlePresent: false,
      disconnectedPresent: false,
      sharedEdgesHidden: [true, true],
      singleEdgePresent: false,
    });

    const noOpGraph = await page.evaluate(
      (graph) =>
        (
          window as Window & {
            __citationGraphTestProjectFilters: (
              graph: unknown,
              filters: unknown,
            ) => unknown;
          }
        ).__citationGraphTestProjectFilters(graph, {
          showLowSignalReferences: true,
        }),
      rawGraph,
    );
    await page.evaluate(
      (snapshot) =>
        (
          window as Window & {
            __citationGraphTestApplyStandalone: (envelope: unknown) => void;
          }
        ).__citationGraphTestApplyStandalone({ version: 1, snapshot }),
      { ...base, graph: noOpGraph },
    );
    await page.waitForTimeout(100);
    assert.deepEqual(await readProjection(), initial);
    assert.deepEqual(pageErrors, []);
  });

  it("opens the independent topic export with local report and graph navigation", async function () {
    const topicBundle = path.join(tempRoot, "topic-export.js");
    await build({
      entryPoints: [path.resolve("src/synthesis/standaloneTopicApp.ts")],
      bundle: true,
      jsx: "automatic",
      jsxImportSource: "preact",
      format: "iife",
      target: "es2020",
      outfile: topicBundle,
    });
    const exported = await browser.newPage({
      viewport: { width: 1200, height: 800 },
    });
    const errors: string[] = [];
    exported.on("pageerror", (error) => errors.push(error.message));
    try {
      await exported.setContent(
        '<html><body><div id="app" class="synthesis-root"></div></body></html>',
      );
      await exported.addStyleTag({
        path: path.resolve("addon/content/synthesis/styles.css"),
      });
      await exported.evaluate(
        (snapshot) => {
          Object.assign(window, {
            __zoteroSkillsSynthesisTopicExport: {
              version: 1,
              snapshot,
              topicDetail: {
                topicId: "topic-export-test",
                title: "Offline topic",
                paper_count: 2,
                topic: { definition: "Offline overview" },
                source_papers: [],
                synthesis_report: {
                  title: "Offline topic",
                  body: "# Exported report\n\nOffline report body",
                },
              },
            },
          });
        },
        lifecycleSnapshot({ expanded: true }),
      );
      await exported.addScriptTag({
        path: path.resolve(
          "addon/content/shared/vendor/markdown-it/markdown-it.min.js",
        ),
      });
      await exported.addScriptTag({
        path: path.resolve("addon/content/shared/markdown-renderer.js"),
      });
      await exported.addScriptTag({ path: topicBundle });
      await exported.locator(".topic-detail-tabs").waitFor();
      const rootBounds = await exported.locator("#app").boundingBox();
      const readerBounds = await exported
        .locator(".topic-detail-shell")
        .boundingBox();
      assert.isAtLeast(readerBounds!.width, rootBounds!.width * 0.9);
      await exported
        .locator(".topic-detail-tabs")
        .getByRole("button", { name: "Report", exact: true })
        .click();
      assert.include(
        await exported.locator(".topic-reading-surface").innerText(),
        "Offline report body",
      );
      await exported
        .locator(".topic-detail-tabs")
        .getByRole("button", { name: "Citation Graph", exact: true })
        .click();
      await exported.waitForSelector(".sigma-stage canvas");
      await exported
        .locator(".topic-detail-tabs")
        .getByRole("button", { name: "Overview", exact: true })
        .click();
      assert.equal(await exported.locator(".sigma-stage canvas").count(), 0);
      assert.deepEqual(errors, []);
    } finally {
      await exported.close();
    }
  });

  it("projects SVG fallback nodes and draws only the active neighborhood", async function () {
    const fallbackBundlePath = path.join(tempRoot, "citation-fallback.js");
    await build({
      entryPoints: [path.resolve("src/shared/citationGraphStandalone.ts")],
      bundle: true,
      format: "iife",
      target: "es2020",
      outfile: fallbackBundlePath,
    });
    const fallbackPage = await browser.newPage({
      viewport: { width: 900, height: 700 },
    });
    try {
      await fallbackPage.setContent(
        '<div data-citation-graph style="width:800px;height:600px"></div>',
      );
      await fallbackPage.addScriptTag({ path: fallbackBundlePath });
      await fallbackPage.evaluate(() => {
        const model = {
          start_node_id: "library:A",
          nodes: [
            {
              id: "library:A",
              title: "A",
              kind: "library_paper" as const,
              x: -1,
              y: 0,
            },
            {
              id: "library:B",
              title: "B",
              kind: "library_paper" as const,
              x: 0,
              y: 1,
            },
            {
              id: "external:shared",
              title: "Shared",
              kind: "external_reference" as const,
              x: 1,
              y: 0,
            },
            {
              id: "external:single",
              title: "Single",
              kind: "external_reference" as const,
              x: 0,
              y: -1,
            },
            {
              id: "external:zero",
              title: "Zero",
              kind: "external_reference" as const,
              x: 1,
              y: -1,
            },
          ],
          edges: [
            {
              id: "edge:A:shared",
              source: "library:A",
              target: "external:shared",
            },
            {
              id: "edge:B:shared",
              source: "library:B",
              target: "external:shared",
            },
            {
              id: "edge:A:single",
              source: "library:A",
              target: "external:single",
            },
          ],
        };
        (
          window as Window & {
            __citationGraphFallbackModel?: typeof model;
          }
        ).__citationGraphFallbackModel = model;
        window.ZoteroSkillsCitationGraph?.renderCitationGraph(
          document.querySelector("[data-citation-graph]") as HTMLElement,
          model,
        );
      });

      const readSvg = () =>
        fallbackPage.evaluate(() => ({
          nodeIds: Array.from(document.querySelectorAll("[data-node-id]")).map(
            (node) => (node as HTMLElement).dataset.nodeId,
          ),
          edgeCount: document.querySelectorAll(".graph-edge").length,
        }));
      assert.deepEqual(await readSvg(), {
        nodeIds: ["library:A", "library:B", "external:shared"],
        edgeCount: 0,
      });

      await fallbackPage.locator('[data-node-id="library:A"]').hover();
      await fallbackPage.waitForTimeout(180);
      const hovered = await readSvg();
      assert.deepEqual(hovered.nodeIds, [
        "library:A",
        "library:B",
        "external:shared",
      ]);
      assert.equal(hovered.edgeCount, 1);

      await fallbackPage.mouse.move(850, 650);
      await fallbackPage.waitForTimeout(180);
      assert.deepEqual(await readSvg(), {
        nodeIds: ["library:A", "library:B", "external:shared"],
        edgeCount: 0,
      });

      await fallbackPage.evaluate(() => {
        const testWindow = window as Window & {
          __citationGraphFallbackModel?: NonNullable<
            Parameters<
              NonNullable<
                typeof window.ZoteroSkillsCitationGraph
              >["renderCitationGraph"]
            >[1]
          >;
        };
        const model = testWindow.__citationGraphFallbackModel;
        if (!model) return;
        window.ZoteroSkillsCitationGraph?.renderCitationGraph(
          document.querySelector("[data-citation-graph]") as HTMLElement,
          {
            ...model,
            selectedElement: { kind: "node", id: "library:A" },
          },
        );
      });
      await fallbackPage.waitForTimeout(100);
      assert.deepEqual(await readSvg(), {
        nodeIds: ["library:A", "library:B", "external:shared"],
        edgeCount: 1,
      });

      await fallbackPage.locator('[data-node-id="library:B"]').hover();
      await fallbackPage.waitForTimeout(180);
      const selectedAndHovered = await readSvg();
      assert.deepEqual(selectedAndHovered.nodeIds, [
        "library:A",
        "library:B",
        "external:shared",
      ]);
      assert.equal(selectedAndHovered.edgeCount, 2);
      assert.include(
        await fallbackPage.locator(".graph-node-label").allTextContents(),
        "B",
      );

      await fallbackPage.mouse.move(850, 650);
      await fallbackPage.waitForTimeout(180);
      assert.equal((await readSvg()).edgeCount, 1);
    } finally {
      await fallbackPage.close();
    }
  });

  it("preserves hover titles and incident edges when a same-query page arrives", async function () {
    await page.reload({ waitUntil: "load" });
    const snapshot = interactionSnapshot();
    await sendSnapshot(snapshot);
    await page.waitForSelector(".sigma-stage canvas", { timeout: 20_000 });

    const beforePage = await page.evaluate(() => {
      const renderer = (
        window as Window & {
          __citationGraphTestSigma?: {
            emit: (event: string, payload: { node: string }) => void;
            getNodeDisplayData: (
              node: string,
            ) => { label?: string } | undefined;
            getEdgeDisplayData: (
              edge: string,
            ) => { hidden?: boolean } | undefined;
          };
        }
      ).__citationGraphTestSigma;
      if (!renderer) return null;
      renderer.emit("enterNode", { node: "zotero:item:A" });
      return {
        label: renderer.getNodeDisplayData("zotero:item:A")?.label,
        edgeHidden: renderer.getEdgeDisplayData("edge:A:X")?.hidden,
      };
    });
    assert.deepEqual(beforePage, { label: "Alpha", edgeHidden: false });

    await sendGraphPage(snapshot);
    const afterPage = await page.evaluate(() => {
      const renderer = (
        window as Window & {
          __citationGraphTestSigma?: {
            getNodeDisplayData: (
              node: string,
            ) => { label?: string } | undefined;
            getEdgeDisplayData: (
              edge: string,
            ) => { hidden?: boolean } | undefined;
          };
        }
      ).__citationGraphTestSigma;
      if (!renderer) return null;
      return {
        label: renderer.getNodeDisplayData("zotero:item:A")?.label,
        edgeHidden: renderer.getEdgeDisplayData("edge:A:X")?.hidden,
      };
    });
    assert.deepEqual(afterPage, { label: "Alpha", edgeHidden: false });
    assert.deepEqual(pageErrors, []);
  });

  it("keeps supplemental single-source rows out of stable interaction topology", async function () {
    await page.reload({ waitUntil: "load" });
    const crowdedSnapshot = interactionSnapshot("zotero:item:A");
    for (let index = 0; index < 100; index += 1) {
      const node = {
        id: `ref:CROWD:${String(index).padStart(3, "0")}`,
        label: `Crowded external ${String(index).padStart(3, "0")}`,
        kind: "external_reference" as const,
        visibility: "hover_only" as const,
        display_tier: "single_external" as const,
      };
      const edge = {
        id: `edge:A:CROWD:${String(index).padStart(3, "0")}`,
        source: "zotero:item:A",
        target: node.id,
        primary_role: "background",
        mention_count: 1,
        visibility: "hover_only" as const,
      };
      crowdedSnapshot.graph.nodes.push(node);
      crowdedSnapshot.graph.edges.push(edge);
      crowdedSnapshot.graph.hoverOnlyNodes.push(node);
      crowdedSnapshot.graph.hoverOnlyEdges.push(edge);
    }
    await sendSnapshot(crowdedSnapshot);
    await page.waitForSelector(".sigma-stage canvas", { timeout: 20_000 });
    const identityBefore = await graphIdentity();

    const selectedOnly = await page.evaluate(() => {
      const renderer = (
        window as Window & {
          __citationGraphTestSigma?: {
            emit: (event: string, payload: { node: string }) => void;
            getNodeDisplayData: (
              node: string,
            ) => { label?: string } | undefined;
            getEdgeDisplayData: (
              edge: string,
            ) => { hidden?: boolean } | undefined;
          };
        }
      ).__citationGraphTestSigma;
      if (!renderer) return null;
      return {
        alphaOnlyPresent: Boolean(renderer.getNodeDisplayData("ref:Y")),
        betaOnlyPresent: Boolean(renderer.getNodeDisplayData("ref:Z")),
        alphaSharedHidden: renderer.getEdgeDisplayData("edge:A:X")?.hidden,
        gammaSharedHidden: renderer.getEdgeDisplayData("edge:C:X")?.hidden,
        alphaOnlyHidden: renderer.getEdgeDisplayData("edge:A:Y")?.hidden,
      };
    });
    assert.deepEqual(selectedOnly, {
      alphaOnlyPresent: false,
      betaOnlyPresent: false,
      alphaSharedHidden: false,
      gammaSharedHidden: true,
      alphaOnlyHidden: undefined,
    });

    const selectedAndHovered = await page.evaluate(() => {
      const renderer = (
        window as Window & {
          __citationGraphTestSigma?: {
            emit: (event: string, payload: { node: string }) => void;
            getNodeDisplayData: (
              node: string,
            ) => { label?: string } | undefined;
            getEdgeDisplayData: (
              edge: string,
            ) => { hidden?: boolean } | undefined;
          };
        }
      ).__citationGraphTestSigma;
      if (!renderer) return null;
      renderer.emit("enterNode", { node: "zotero:item:B" });
      return {
        betaLabel: renderer.getNodeDisplayData("zotero:item:B")?.label,
        alphaOnlyPresent: Boolean(renderer.getNodeDisplayData("ref:Y")),
        betaOnlyPresent: Boolean(renderer.getNodeDisplayData("ref:Z")),
        alphaSharedHidden: renderer.getEdgeDisplayData("edge:A:X")?.hidden,
        alphaOnlyHidden: renderer.getEdgeDisplayData("edge:A:Y")?.hidden,
        betaOnlyHidden: renderer.getEdgeDisplayData("edge:B:Z")?.hidden,
        parallelEdgePresent: Boolean(
          renderer.getEdgeDisplayData("edge:A:Y:repeat"),
        ),
      };
    });
    assert.deepEqual(selectedAndHovered, {
      betaLabel: "Beta",
      alphaOnlyPresent: false,
      betaOnlyPresent: false,
      alphaSharedHidden: false,
      alphaOnlyHidden: undefined,
      betaOnlyHidden: undefined,
      parallelEdgePresent: false,
    });
    assert.include(
      (await page.locator(".graph-selection-drawer").textContent()) || "",
      "Alpha-only external",
    );

    await sendGraphPage(crowdedSnapshot);
    const identityAfterPage = await graphIdentity();
    const afterPage = await page.evaluate(() => {
      const renderer = (
        window as Window & {
          __citationGraphTestSigma?: {
            getNodeDisplayData: (
              node: string,
            ) => { label?: string } | undefined;
            getEdgeDisplayData: (
              edge: string,
            ) => { hidden?: boolean } | undefined;
          };
        }
      ).__citationGraphTestSigma;
      return renderer
        ? {
            betaLabel: renderer.getNodeDisplayData("zotero:item:B")?.label,
            alphaOnlyPresent: Boolean(renderer.getNodeDisplayData("ref:Y")),
            betaOnlyPresent: Boolean(renderer.getNodeDisplayData("ref:Z")),
            alphaOnlyHidden: renderer.getEdgeDisplayData("edge:A:Y")?.hidden,
            betaOnlyHidden: renderer.getEdgeDisplayData("edge:B:Z")?.hidden,
          }
        : null;
    });
    assert.deepEqual(afterPage, {
      betaLabel: "Beta",
      alphaOnlyPresent: false,
      betaOnlyPresent: false,
      alphaOnlyHidden: undefined,
      betaOnlyHidden: undefined,
    });
    assert.isTrue(identityBefore.sameSurface);
    assert.isTrue(identityAfterPage.sameStage);
    assert.isTrue(identityAfterPage.sameCanvases);
    assert.isTrue(identityAfterPage.sameContexts);

    const ownerPoint = await page.evaluate(() => {
      const renderer = (
        window as Window & {
          __citationGraphTestSigma?: {
            getGraph: () => {
              getNodeAttributes: (node: string) => { x: number; y: number };
            };
            graphToViewport: (point: { x: number; y: number }) => {
              x: number;
              y: number;
            };
          };
        }
      ).__citationGraphTestSigma;
      const point = renderer
        ? renderer.graphToViewport(
            renderer.getGraph().getNodeAttributes("zotero:item:A"),
          )
        : undefined;
      return point && typeof point.x === "number" && typeof point.y === "number"
        ? { x: point.x, y: point.y }
        : null;
    });
    const canvasBox = await page
      .locator(".sigma-stage canvas")
      .first()
      .boundingBox();
    assert.isNotNull(ownerPoint);
    assert.isNotNull(canvasBox);
    await page.mouse.move(
      (canvasBox?.x || 0) + (ownerPoint?.x || 0),
      (canvasBox?.y || 0) + (ownerPoint?.y || 0),
    );
    await page.waitForTimeout(120);
    const pickedOwner = await page.evaluate(() => {
      const renderer = (
        window as Window & {
          __citationGraphTestSigma?: {
            getGraph: () => { order: number };
            getNodeDisplayData: (
              node: string,
            ) => { label?: string } | undefined;
          };
        }
      ).__citationGraphTestSigma;
      return renderer
        ? {
            label: renderer.getNodeDisplayData("zotero:item:A")?.label,
            order: renderer.getGraph().order,
          }
        : null;
    });
    assert.deepEqual(pickedOwner, { label: "Alpha", order: 4 });

    await page.evaluate(() => {
      (
        window as Window & {
          __citationGraphTestSigma?: {
            emit: (event: string, payload?: object) => void;
          };
        }
      ).__citationGraphTestSigma?.emit("leaveNode", {});
    });
    await page.waitForTimeout(120);
    const afterLeave = await page.evaluate(() => {
      const renderer = (
        window as Window & {
          __citationGraphTestSigma?: {
            getNodeDisplayData: (node: string) => unknown;
            getEdgeDisplayData: (
              edge: string,
            ) => { hidden?: boolean } | undefined;
          };
        }
      ).__citationGraphTestSigma;
      return renderer
        ? {
            alphaOnlyPresent: Boolean(renderer.getNodeDisplayData("ref:Y")),
            betaOnlyPresent: Boolean(renderer.getNodeDisplayData("ref:Z")),
            alphaOnlyHidden: renderer.getEdgeDisplayData("edge:A:Y")?.hidden,
          }
        : null;
    });
    assert.deepEqual(afterLeave, {
      alphaOnlyPresent: false,
      betaOnlyPresent: false,
      alphaOnlyHidden: undefined,
    });

    const selectionUpdate = structuredClone(crowdedSnapshot);
    selectionUpdate.graph.selectedElement = {
      kind: "node",
      id: "zotero:item:B",
    };
    selectionUpdate.graph.layoutStatus = "refreshing";
    if (selectionUpdate.graph.page) {
      selectionUpdate.graph.page.layoutStatus = "refreshing";
    }
    await sendSurface(selectionUpdate, 200);
    const identityAfterSelection = await graphIdentity();
    assert.isTrue(identityAfterSelection.sameSurface);
    assert.isTrue(identityAfterSelection.sameStage);
    assert.isTrue(identityAfterSelection.sameCanvases);
    assert.isTrue(identityAfterSelection.sameContexts);
    assert.isTrue(identityAfterSelection.sameControls);
    assert.isTrue(identityAfterSelection.sameSelection);
    assert.equal(await page.locator(".graph-layout-banner").count(), 0);
    assert.include(
      (await page.locator(".graph-selection-drawer").textContent()) || "",
      "Beta-only external",
    );

    const sharedHovered = await page.evaluate(() => {
      const renderer = (
        window as Window & {
          __citationGraphTestSigma?: {
            emit: (event: string, payload: { node: string }) => void;
            getNodeDisplayData: (
              node: string,
            ) => { label?: string } | undefined;
            getEdgeDisplayData: (
              edge: string,
            ) => { hidden?: boolean } | undefined;
          };
        }
      ).__citationGraphTestSigma;
      if (!renderer) return null;
      renderer.emit("enterNode", { node: "ref:X" });
      return {
        label: renderer.getNodeDisplayData("ref:X")?.label,
        alphaEdgeHidden: renderer.getEdgeDisplayData("edge:A:X")?.hidden,
        gammaEdgeHidden: renderer.getEdgeDisplayData("edge:C:X")?.hidden,
      };
    });
    assert.deepEqual(sharedHovered, {
      label: "Shared external",
      alphaEdgeHidden: false,
      gammaEdgeHidden: false,
    });
    assert.deepEqual(pageErrors, []);
  });

  it("draws a pointer-hover title after drawing an importance halo", async function () {
    await page.reload({ waitUntil: "load" });
    await sendSnapshot(lifecycleSnapshot());
    await page.waitForSelector(".sigma-stage canvas");
    const result = await page.evaluate(() => {
      const draw = (
        window as Window & {
          __citationGraphTestDrawNodeHover?: (
            context: CanvasRenderingContext2D,
            data: Record<string, unknown>,
            settings: Record<string, unknown>,
          ) => void;
        }
      ).__citationGraphTestDrawNodeHover;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!draw || !context) return null;
      const labels: string[] = [];
      let strokes = 0;
      const fillText = context.fillText.bind(context);
      const stroke = context.stroke.bind(context);
      context.fillText = (value, x, y, maxWidth) => {
        labels.push(value);
        if (maxWidth === undefined) fillText(value, x, y);
        else fillText(value, x, y, maxWidth);
      };
      context.stroke = () => {
        strokes += 1;
        stroke();
      };
      const data = {
        x: 40,
        y: 40,
        size: 8,
        label: "Alpha",
        color: "#dc2626",
        kind: "library_paper",
        importanceHalo: true,
        importanceInteractive: true,
        currentPaperNode: true,
      };
      const settings = {
        labelSize: 14,
        labelFont: "Arial",
        labelWeight: "normal",
        labelColor: { color: "#111827" },
      };
      draw(context, data, settings);
      return { labels, strokes };
    });
    assert.deepEqual(result, { labels: ["Alpha"], strokes: 2 });
    assert.deepEqual(pageErrors, []);
  });

  it("keeps layout failures visible with redraw and debug details", async function () {
    await page.reload({ waitUntil: "load" });
    await sendSnapshot(lifecycleSnapshot({ layoutFailure: true }));
    await sendSurface(lifecycleSnapshot({ layoutFailure: true }), 100);
    const warning = page.locator(".graph-layout-failure");
    await warning.waitFor({ state: "visible" });
    assert.include(await warning.textContent(), "optional year");
    assert.isTrue(await warning.locator("button").isVisible());
    assert.equal(await warning.locator("details").count(), 0);
    assert.isAtLeast(await page.locator(".sigma-stage canvas").count(), 1);

    await page.evaluate(() => {
      window.postMessage(
        {
          type: "synthesis:surface-error",
          payload: {
            surface: "graph",
            requestId: 101,
            code: "service_unavailable",
            message: "Refresh failed.",
          },
        },
        "*",
      );
    });
    await page.waitForTimeout(100);
    assert.include(await warning.textContent(), "optional year");
    assert.isAtLeast(await page.locator(".sigma-stage canvas").count(), 1);

    await sendSnapshot(
      lifecycleSnapshot({ layoutFailure: true, withoutCoordinates: true }),
    );
    const emptyFailure = page.locator(".graph-empty .empty-state-warning");
    await emptyFailure.waitFor({ state: "visible" });
    assert.include(await emptyFailure.textContent(), "optional year");
    assert.isTrue(await emptyFailure.locator("button").isVisible());

    await sendSnapshot(lifecycleSnapshot({ layoutFailure: true }), debugPage);
    const debugDetails = debugPage.locator(".graph-layout-failure-details");
    await debugDetails.waitFor({ state: "attached" });
    const debugText = await debugDetails.textContent();
    assert.include(debugText, "invalid_request");
    assert.match(String(debugText), /force/i);
    assert.include(debugText, "sha256:stable-window");
    assert.deepEqual(pageErrors, []);
  });
});

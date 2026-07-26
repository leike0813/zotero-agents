import { assert } from "chai";
import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { pathToFileURL } from "url";
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
  const pageErrors: string[] = [];

  function lifecycleSnapshot(args?: {
    tab?: "overview" | "graph";
    selectedNodeId?: string;
    expanded?: boolean;
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
        x: -1,
        y: 0,
      },
      {
        id: "ref:X",
        label: "Shared external",
        kind: "external_reference" as const,
        display_tier: "shared_external" as const,
        x: 1,
        y: 0,
      },
      ...(args?.expanded
        ? [
            {
              id: "zotero:item:B",
              label: "Beta",
              kind: "library_paper" as const,
              x: 0,
              y: 1,
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
          graph_hash: args?.expanded ? "sha256:expanded" : "sha256:initial",
          layoutStatus: "ready",
          nodes,
          edges,
          diagnostics: {
            cache_status: "ready",
            library_node_count: args?.expanded ? 2 : 1,
            shared_external_count: 1,
            hover_only_external_count: 0,
          },
        },
      },
      uiState,
    );
  }

  async function sendSnapshot(snapshot: unknown) {
    await page.evaluate((payload) => {
      window.postMessage({ type: "synthesis:snapshot", payload }, "*");
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
        };
      };
      const surface = document.querySelector(
        '[data-synthesis-persistent-surface="graph"]',
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
      const previous = lifecycleWindow.__graphLifecycleIdentity;
      if (!previous && surface && stage) {
        lifecycleWindow.__graphLifecycleIdentity = {
          surface,
          stage,
          canvases,
          contexts,
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
        contextLost: contexts.some((context) => context.isContextLost()),
      };
    });
  }

  before(async function () {
    tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zotero-agents-citation-graph-lifecycle-"),
    );
    const bundlePath = path.join(tempRoot, "app.js");
    const htmlPath = path.join(tempRoot, "index.html");
    const esbuildBin = path.resolve("node_modules", ".bin", "esbuild");
    await execFileAsync(esbuildBin, [
      path.resolve("src", "synthesisWorkbenchApp.ts"),
      "--bundle",
      "--format=iife",
      "--target=es2020",
      `--outfile=${bundlePath}`,
    ]);
    const stylesheetUrl = pathToFileURL(
      path.resolve("addon", "content", "synthesis", "styles.css"),
    ).toString();
    const bundleUrl = pathToFileURL(bundlePath).toString();
    await fs.writeFile(
      htmlPath,
      `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${stylesheetUrl}"><style>html,body{width:100%;height:100%;margin:0}</style></head><body><div id="app" class="synthesis-root"></div><script src="${bundleUrl}"></script></body></html>`,
      "utf8",
    );
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(pathToFileURL(htmlPath).toString(), { waitUntil: "load" });
  });

  after(async function () {
    await page?.close();
    await browser?.close();
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("preserves canvas and WebGL context identity across routine updates", async function () {
    await sendSnapshot(lifecycleSnapshot());
    await page.waitForSelector(".sigma-stage canvas", { timeout: 20_000 });
    const initial = await graphIdentity();
    assert.isTrue(initial.surfacePresent);
    assert.isAtLeast(initial.canvasCount, 1);
    assert.isAtLeast(initial.contextCount, 1);

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
});

import { assert } from "chai";
import { chromium, type Browser, type Page } from "playwright";
import path from "node:path";
import { pathToFileURL } from "node:url";

function diagnosticSnapshot() {
  return {
    title: "Synthesis Sidecar",
    labels: {},
    selectedTabKey: "synthesis-sidecar",
    tabs: [{ key: "synthesis-sidecar", label: "Synthesis Sidecar" }],
    synthesisSidecarView: {
      snapshot: {
        phase: "production",
        status: "succeeded",
        attemptId: "attempt-1",
        evidence: { serviceInstanceId: "service-1" },
      },
      recentEvents: [
        {
          id: "event-started",
          ts: "2026-07-31T01:00:00.000Z",
          status: "started",
          component: "rpc",
          stage: "request-started",
          capability: "client.refreshReferenceSidecarNow",
          correlationId: "correlation-1",
          requestId: "request-1",
        },
        {
          id: "event-succeeded",
          ts: "2026-07-31T01:00:01.000Z",
          status: "succeeded",
          component: "operation",
          stage: "refresh-batch-completed",
          capability: "reference_sidecar_refresh",
          correlationId: "correlation-1",
          operationId: "operation-1",
          durationMs: 1000,
          responseBytes: 256,
        },
        {
          id: "event-failed",
          ts: "2026-07-31T01:00:02.000Z",
          status: "failed",
          component: "operation",
          stage: "layout-worker-failed",
          capability: "client.recomputeCitationGraphLayout",
          correlationId: "correlation-1",
          requestId: "request-2",
          code: "invalid_request",
          mutationStatus: "invalid_request",
          workerCode: "invalid_request",
          algorithm: "force",
          graphHash: `sha256:${"a".repeat(64)}`,
          nodeCount: 7432,
          edgeCount: 11377,
          nodeLimit: 20000,
          edgeLimit: 80000,
          durationMs: 4,
          attemptedResponseBytes: 512,
          limitBytes: 1024,
        },
      ],
    },
  };
}

async function postSnapshot(page: Page) {
  await page.evaluate((payload) => {
    window.postMessage({ type: "dashboard:snapshot", payload }, "*");
  }, diagnosticSnapshot());
  await page.locator(".synthesis-sidecar-layout").waitFor();
}

describe("Synthesis Sidecar Dashboard", function () {
  this.timeout(20_000);

  let browser: Browser;
  let page: Page;

  beforeEach(async function () {
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  });

  afterEach(async function () {
    await browser.close();
  });

  async function openDashboard(copyFails = false) {
    await page.addInitScript((shouldFail) => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText(text: string) {
            (window as typeof window & { __copiedText?: string }).__copiedText =
              text;
            return shouldFail
              ? Promise.reject(new Error("clipboard unavailable"))
              : Promise.resolve();
          },
        },
      });
    }, copyFails);
    await page.goto(
      pathToFileURL(
        path.join(process.cwd(), "addon/content/dashboard/index.html"),
      ).href,
    );
    await postSnapshot(page);
  }

  it("uses semantic status badges and summary-plus-JSON detail", async function () {
    await openDashboard();

    const badges = page.locator(".synthesis-sidecar-events tbody .status");
    assert.equal(await badges.count(), 3);
    assert.include(
      (await badges.nth(0).getAttribute("class")) || "",
      "is-accent",
    );
    assert.include(
      (await badges.nth(1).getAttribute("class")) || "",
      "is-success",
    );
    assert.include(
      (await badges.nth(2).getAttribute("class")) || "",
      "is-error",
    );
    assert.equal(
      await page.locator(".synthesis-sidecar-summary .status").textContent(),
      "succeeded",
    );

    assert.equal(
      await page.locator(".synthesis-sidecar-detail-summary").count(),
      1,
    );
    assert.equal(
      await page
        .locator(".synthesis-sidecar-json-section .payload-view")
        .count(),
      1,
    );
    assert.include(
      (await page.locator(".synthesis-sidecar-detail-summary").textContent()) ||
        "",
      "correlation-1",
    );
    const summary =
      (await page.locator(".synthesis-sidecar-detail-summary").textContent()) ||
      "";
    assert.include(summary, "invalid_request");
    assert.include(summary, "7432/20000");
    assert.include(summary, "11377/80000");
  });

  it("reports clipboard success and failure visibly", async function () {
    await openDashboard();
    const copy = page.getByRole("button", { name: "Copy JSON" });
    await copy.click();
    await page.getByRole("button", { name: "Copied" }).waitFor();
    assert.equal(await page.locator("#zs-toast").textContent(), "JSON copied");
    assert.include(
      await page.evaluate(
        () =>
          (window as typeof window & { __copiedText?: string }).__copiedText ||
          "",
      ),
      '"selected"',
    );

    await page.close();
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await openDashboard(true);
    const failingCopy = page.getByRole("button", { name: "Copy JSON" });
    await failingCopy.click();
    await page.getByRole("button", { name: "Copy failed" }).waitFor();
    assert.equal(await page.locator("#zs-toast").textContent(), "Copy failed");
  });
});

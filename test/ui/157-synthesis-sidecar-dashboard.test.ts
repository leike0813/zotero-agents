import { assert } from "chai";
import { chromium, type Browser, type Page } from "playwright";
import path from "node:path";
import { pathToFileURL } from "node:url";

const TRACE_ID = "1".repeat(32);

function traceSnapshot(includeSecondTrace = false) {
  const traces = [
    {
      traceId: TRACE_ID,
      active: false,
      droppedCount: 3,
      startedAtMs: Date.parse("2026-07-31T01:00:00.000Z"),
      updatedAtMs: Date.parse("2026-07-31T01:00:02.000Z"),
      events: [
        {
          schema: "synthesis-sidecar-observation.v2",
          traceId: TRACE_ID,
          spanId: "2".repeat(16),
          attempt: 0,
          source: "host",
          boundary: "operation",
          phase: "start",
          outcome: "started",
          occurredAtMs: Date.parse("2026-07-31T01:00:00.000Z"),
          identities: {
            operation: "client.runAdvancedReferenceMatchingNow",
          },
        },
        {
          schema: "synthesis-sidecar-observation.v2",
          traceId: TRACE_ID,
          spanId: "3".repeat(16),
          parentSpanId: "2".repeat(16),
          attempt: 2,
          source: "child-worker",
          boundary: "child-worker",
          phase: "matching-terminal",
          outcome: "succeeded",
          occurredAtMs: Date.parse("2026-07-31T01:00:01.000Z"),
          metrics: { durationMs: 1000, responseBytes: 256 },
          facts: {
            semanticStatus: "promoted",
            matchingHash: `sha256:${"c".repeat(64)}`,
            proposalCount: 0,
            factCount: 2,
            warningCount: 0,
          },
        },
        {
          schema: "synthesis-sidecar-observation.v2",
          traceId: TRACE_ID,
          spanId: "2".repeat(16),
          attempt: 0,
          source: "host",
          boundary: "operation",
          phase: "terminal",
          outcome: "succeeded",
          occurredAtMs: Date.parse("2026-07-31T01:00:02.000Z"),
          facts: { semanticStatus: "promoted" },
        },
      ],
    },
  ];
  if (includeSecondTrace) {
    traces.push({
      traceId: "4".repeat(32),
      active: false,
      droppedCount: 0,
      startedAtMs: Date.parse("2026-07-31T01:00:03.000Z"),
      updatedAtMs: Date.parse("2026-07-31T01:00:04.000Z"),
      events: [
        {
          schema: "synthesis-sidecar-observation.v2",
          traceId: "4".repeat(32),
          spanId: "5".repeat(16),
          attempt: 0,
          source: "host",
          boundary: "host-rpc",
          phase: "terminal",
          outcome: "failed",
          code: "service_unavailable",
          occurredAtMs: Date.parse("2026-07-31T01:00:04.000Z"),
          identities: { capability: "client.listTopics" },
        },
      ],
    } as (typeof traces)[number]);
  }
  return {
    title: "Synthesis Sidecar",
    labels: {},
    selectedTabKey: "synthesis-sidecar",
    tabs: [{ key: "synthesis-sidecar", label: "Synthesis Sidecar" }],
    synthesisSidecarView: {
      traceSnapshot: {
        schema: "synthesis-sidecar-trace-snapshot.v2",
        traces,
        eventCount: traces.reduce((sum, trace) => sum + trace.events.length, 0),
      },
    },
  };
}

async function postSnapshot(page: Page, includeSecondTrace = false) {
  await page.evaluate((payload) => {
    window.postMessage({ type: "dashboard:snapshot", payload }, "*");
  }, traceSnapshot(includeSecondTrace));
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

  it("renders a fixed-density causal hierarchy with attempts and dropped counts", async function () {
    await openDashboard();
    assert.equal(
      await page.locator(".synthesis-sidecar-events thead th").count(),
      6,
    );
    assert.include(
      (await page.locator(".synthesis-sidecar-summary").textContent()) || "",
      "Dropped3",
    );
    const detail =
      (await page.locator(".synthesis-sidecar-detail").textContent()) || "";
    assert.include(detail, "matching-terminal");
    assert.include(detail, "promoted");
    assert.include(detail, `sha256:${"c".repeat(64)}`);
    assert.include(detail, '"proposalCount":0');
    assert.include(detail, '"warningCount":0');
    const childPadding = await page
      .locator('[data-span-id="3333333333333333"] td')
      .first()
      .evaluate((node) => (node as HTMLElement).style.paddingLeft);
    assert.equal(childPadding, "22px");
  });

  it("copies the complete sanitized trace with visible success and failure", async function () {
    await openDashboard();
    await page.getByRole("button", { name: "Copy trace" }).click();
    await page.getByRole("button", { name: "Copied" }).waitFor();
    assert.equal(await page.locator("#zs-toast").textContent(), "Trace copied");
    const copied = await page.evaluate(
      () =>
        (window as typeof window & { __copiedText?: string }).__copiedText ||
        "",
    );
    assert.include(copied, '"traceId"');
    assert.notInclude(copied, "payload");

    await page.close();
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await openDashboard(true);
    await page.getByRole("button", { name: "Copy trace" }).click();
    await page.getByRole("button", { name: "Copy failed" }).waitFor();
    assert.equal(await page.locator("#zs-toast").textContent(), "Copy failed");
  });

  it("appends a trace without replacing unchanged rows, selection, detail, or scroll", async function () {
    await openDashboard();
    await page.evaluate(() => {
      const runtime = window as typeof window & {
        __traceRow?: Element;
        __traceDetail?: Element;
      };
      runtime.__traceRow =
        document.querySelector(`[data-trace-id="${"1".repeat(32)}"]`) ||
        undefined;
      runtime.__traceDetail =
        document.querySelector(".synthesis-sidecar-detail") || undefined;
      const table = document.querySelector(
        ".synthesis-sidecar-events",
      ) as HTMLElement | null;
      if (table) {
        table.style.height = "20px";
        table.style.maxHeight = "20px";
        table.style.overflowY = "scroll";
        table.scrollTop = 17;
      }
    });
    await postSnapshot(page, true);

    const identity = await page.evaluate(() => {
      const runtime = window as typeof window & {
        __traceRow?: Element;
        __traceDetail?: Element;
      };
      return {
        row:
          runtime.__traceRow ===
          document.querySelector(`[data-trace-id="${"1".repeat(32)}"]`),
        detail:
          runtime.__traceDetail ===
          document.querySelector(".synthesis-sidecar-detail"),
        scroll:
          (document.querySelector(".synthesis-sidecar-events") as HTMLElement)
            ?.scrollTop || 0,
      };
    });
    assert.deepEqual(identity, { row: true, detail: true, scroll: 17 });
    assert.equal(
      await page.locator(".synthesis-sidecar-events tbody tr").count(),
      2,
    );
  });
});

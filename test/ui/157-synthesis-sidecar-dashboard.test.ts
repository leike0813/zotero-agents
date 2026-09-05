import { assert } from "chai";
import { chromium, type Browser, type Page } from "playwright";
import { pathToFileURL } from "node:url";
import { buildDashboardBrowserPage } from "../helpers/dashboardBrowserPage";

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

async function postTracePayload(
  page: Page,
  payload: ReturnType<typeof traceSnapshot>,
) {
  await page.evaluate((snapshot) => {
    window.postMessage({ type: "dashboard:snapshot", payload: snapshot }, "*");
  }, payload);
  await page.locator(".synthesis-sidecar-layout").waitFor();
}

describe("Synthesis Sidecar Dashboard", function () {
  this.timeout(20_000);
  let browser: Browser;
  let page: Page;
  let dashboardPageUrl: string;

  before(async function () {
    dashboardPageUrl = pathToFileURL(await buildDashboardBrowserPage()).href;
  });

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
    await page.goto(dashboardPageUrl);
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

  it("reports a durable failure after successful pending admission", async function () {
    await openDashboard();
    const payload = traceSnapshot();
    const trace = payload.synthesisSidecarView.traceSnapshot.traces[0];
    trace.events[1] = {
      ...trace.events[1],
      source: "rust-sidecar",
      boundary: "operation",
      phase: "maintenance-terminal",
      outcome: "failed",
      facts: { semanticStatus: "failed" },
    };
    trace.events[2] = {
      ...trace.events[2],
      facts: { semanticStatus: "pending" },
    };

    await postTracePayload(page, payload);

    assert.equal(
      (
        (await page
          .locator(`tr[data-trace-id="${TRACE_ID}"] td`)
          .first()
          .textContent()) || ""
      ).trim(),
      "failed",
    );
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

  it("bounds visible traces, prioritizes active and failed rows, and retains selection", async function () {
    await openDashboard();
    await page.locator(`tr[data-trace-id="${TRACE_ID}"]`).click();
    const payload = traceSnapshot();
    const traces = payload.synthesisSidecarView.traceSnapshot.traces;
    for (let index = 0; index < 130; index += 1) {
      const traceId = index.toString(16).padStart(32, "a").slice(-32);
      traces.push({
        traceId,
        active: false,
        droppedCount: 0,
        startedAtMs: index + 10,
        updatedAtMs: index + 10,
        events: [
          {
            schema: "synthesis-sidecar-observation.v2",
            traceId,
            spanId: index.toString(16).padStart(16, "b").slice(-16),
            attempt: 0,
            source: "host",
            boundary: "operation",
            phase: "terminal",
            outcome: "succeeded",
            occurredAtMs: index + 10,
            identities: { operation: `client.success${index}` },
          },
        ],
      } as (typeof traces)[number]);
    }
    const failed =
      traceSnapshot(true).synthesisSidecarView.traceSnapshot.traces[1];
    traces.push(failed);
    traces.push({
      ...failed,
      traceId: "e".repeat(32),
      active: true,
      updatedAtMs: 1,
      events: failed.events.map((event) => ({
        ...event,
        traceId: "e".repeat(32),
        outcome: "started",
      })),
    });
    payload.synthesisSidecarView.traceSnapshot.eventCount = traces.reduce(
      (sum, trace) => sum + trace.events.length,
      0,
    );

    await postTracePayload(page, payload);

    const rows = page.locator(".synthesis-sidecar-events tbody tr");
    assert.equal(await rows.count(), 100);
    assert.equal(
      await rows.first().getAttribute("data-trace-id"),
      "e".repeat(32),
    );
    assert.equal(
      await rows.nth(1).getAttribute("data-trace-id"),
      "4".repeat(32),
    );
    assert.equal(
      await page.locator(`tr[data-trace-id="${TRACE_ID}"]`).count(),
      1,
    );
  });

  it("filters traces by operation and capability", async function () {
    await openDashboard();
    await postSnapshot(page, true);
    await page.getByPlaceholder("Filter traces").fill("client.listTopics");
    const rows = page.locator(".synthesis-sidecar-events tbody tr");
    assert.equal(await rows.count(), 2);
    assert.equal(
      await page.locator(`tr[data-trace-id="${"4".repeat(32)}"]`).count(),
      1,
    );
  });
});

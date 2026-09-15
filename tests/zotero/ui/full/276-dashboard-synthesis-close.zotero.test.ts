import { assert } from "chai";
import { config } from "../../../../package.json";

import {
  openTaskDashboard,
  resetTaskDashboardHostForTests,
} from "../../../../src/modules/dashboardHost";
import {
  closeSynthesisWorkbenchTab,
  openSynthesisWorkbenchTab,
  resetSynthesisWorkbenchTabRuntimeForTests,
} from "../../../../src/modules/synthesis/workbench/synthesisWorkbenchTab";

const CLOSE_CYCLES = 30;

type TestRuntime = typeof globalThis & {
  addon?: unknown;
  ztoolkit?: unknown;
};

let previousAddon: unknown;
let previousZtoolkit: unknown;

async function waitUntil<Value>(read: () => Value | null | undefined) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = read();
    if (value) return value;
    await Zotero.Promise.delay(25);
  }
  throw new Error("condition_not_reached");
}

function findDashboardWindow() {
  const enumerator = (globalThis as any).Services.wm.getEnumerator(null);
  while (enumerator.hasMoreElements()) {
    const candidate = enumerator.getNext() as Window;
    if (candidate.document?.getElementById("zs-task-dashboard-root")) {
      return candidate;
    }
  }
  return null;
}

describe("Dashboard and Synthesis close lifecycle in Zotero", function () {
  beforeEach(function () {
    const runtime = globalThis as TestRuntime;
    const plugin = (Zotero as any)[config.addonInstance];
    previousAddon = runtime.addon;
    previousZtoolkit = runtime.ztoolkit;
    runtime.addon = plugin;
    runtime.ztoolkit = plugin?.data?.ztoolkit;
  });

  afterEach(async function () {
    await resetTaskDashboardHostForTests();
    await closeSynthesisWorkbenchTab();
    await resetSynthesisWorkbenchTabRuntimeForTests();
    const runtime = globalThis as TestRuntime;
    runtime.addon = previousAddon;
    runtime.ztoolkit = previousZtoolkit;
  });

  it("keeps the host responsive across repeated page closes", async function () {
    this.timeout(240000);
    const mainWindow = Zotero.getMainWindow();
    assert.isOk(mainWindow);

    for (let cycle = 0; cycle < CLOSE_CYCLES; cycle += 1) {
      const dashboardClosed = openTaskDashboard({
        chromeWindow: mainWindow,
      }).then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ ok: false as const, error }),
      );
      const dashboardWindow = await waitUntil(findDashboardWindow);
      await waitUntil(() =>
        dashboardWindow.document.querySelector(
          '[data-zs-role="task-dashboard-frame"]',
        ),
      );
      dashboardWindow.close();
      const dashboardResult = await dashboardClosed;
      if (!dashboardResult.ok) throw dashboardResult.error;

      await openSynthesisWorkbenchTab({
        window: mainWindow,
        snapshotInput: {
          libraryId: Zotero.Libraries.userLibraryID,
          graph: {
            graph_hash: "close-lifecycle-graph",
            layoutStatus: "ready",
            nodes: [
              {
                id: "paper:a",
                label: "Paper A",
                kind: "library_paper",
                x: 0,
                y: 0,
              },
              {
                id: "reference:b",
                label: "Reference B",
                kind: "external_reference",
                x: 1,
                y: 1,
              },
            ],
            edges: [
              {
                id: "citation:a-b",
                source: "paper:a",
                target: "reference:b",
                primary_role: "background",
              },
            ],
            visibleNodes: [
              {
                id: "paper:a",
                label: "Paper A",
                kind: "library_paper",
                x: 0,
                y: 0,
              },
              {
                id: "reference:b",
                label: "Reference B",
                kind: "external_reference",
                x: 1,
                y: 1,
              },
            ],
            visibleEdges: [
              {
                id: "citation:a-b",
                source: "paper:a",
                target: "reference:b",
                primary_role: "background",
              },
            ],
          },
        },
      });
      const frame = (await waitUntil(() =>
        mainWindow.document.querySelector<HTMLElement>(
          '[data-zs-role="synthesis-workbench-frame"]',
        ),
      )) as HTMLElement & { contentDocument?: Document };
      const graphTab = await waitUntil(() =>
        frame.contentDocument?.querySelector<HTMLButtonElement>(
          'button[data-synthesis-tab="graph"]',
        ),
      );
      graphTab.click();
      await waitUntil(() =>
        frame.contentDocument?.querySelector(".sigma-stage canvas"),
      );
      await closeSynthesisWorkbenchTab();
      await Zotero.Promise.delay(25);

      assert.isFalse(
        mainWindow.closed,
        `main window survived cycle ${cycle + 1}`,
      );
      assert.strictEqual(
        await Zotero.DB.valueQueryAsync("SELECT 1"),
        1,
        `database remained responsive after cycle ${cycle + 1}`,
      );
    }
  });
});

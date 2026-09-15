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
const GRAPH_NODE_COUNT = 813;
const GRAPH_EDGE_COUNT = 1_570;

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

function closeLifecycleGraph() {
  const nodes = Array.from({ length: GRAPH_NODE_COUNT }, (_, index) => ({
    id: `node:${index}`,
    label: `Graph node ${index}`,
    kind: index % 3 === 0 ? "library_paper" : "external_reference",
    x: Math.cos((index / GRAPH_NODE_COUNT) * Math.PI * 2),
    y: Math.sin((index / GRAPH_NODE_COUNT) * Math.PI * 2),
  }));
  const edges = Array.from({ length: GRAPH_EDGE_COUNT }, (_, index) => ({
    id: `edge:${index}`,
    source: `node:${index % GRAPH_NODE_COUNT}`,
    target: `node:${(index * 7 + 1) % GRAPH_NODE_COUNT}`,
    primary_role: "background",
  }));
  return { nodes, edges };
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

      const graph = closeLifecycleGraph();
      await openSynthesisWorkbenchTab({
        window: mainWindow,
        snapshotInput: {
          libraryId: Zotero.Libraries.userLibraryID,
          graph: {
            graph_hash: "close-lifecycle-graph",
            layoutStatus: "ready",
            nodes: graph.nodes,
            edges: graph.edges,
            visibleNodes: graph.nodes,
            visibleEdges: graph.edges,
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

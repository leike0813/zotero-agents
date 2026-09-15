import { assert } from "chai";
import { config } from "../../../../package.json";

import { joinPath } from "../../../../src/utils/path";
import {
  openTaskDashboard,
  resetTaskDashboardHostForTests,
} from "../../../../src/modules/dashboardHost";
import {
  closeSynthesisWorkbenchTab,
  openSynthesisWorkbenchTab,
  resetSynthesisWorkbenchTabRuntimeForTests,
} from "../../../../src/modules/synthesis/workbench/synthesisWorkbenchTab";
import {
  ensureDiagnosticsDirectory,
  readDiagnosticsEnv,
  resolveDefaultTestDiagnosticsDirectory,
  writeDiagnosticsText,
} from "../../testDiagnosticsOutput";
import {
  getRuntimePersistencePaths,
  readRuntimeTextFile,
} from "../../../../src/modules/runtimePersistence";

const GRAPH_NODE_COUNT = 813;
const GRAPH_EDGE_COUNT = 1_570;
const CLOSE_CYCLES =
  Number(readDiagnosticsEnv("ZOTERO_SYNTHESIS_CLOSE_CYCLES")) || 30;
const SYNTHESIS_WORKBENCH_TAB_ID = "zotero-skills-synthesis-workbench";
const WORKSPACE_TAB_ID = "zotero-skills-workspace";
const closeLifecycleStages: Array<Record<string, unknown>> = [];

type WorkbenchFrame = HTMLElement & { contentDocument?: Document };

type TestRuntime = typeof globalThis & {
  addon?: unknown;
  ztoolkit?: unknown;
};

let previousAddon: unknown;
let previousZtoolkit: unknown;

async function recordCloseLifecycleStage(
  stage: string,
  details: Record<string, unknown> = {},
) {
  closeLifecycleStages.push({
    stage,
    occurredAt: new Date().toISOString(),
    ...details,
  });
  const outputDirectory = resolveDefaultTestDiagnosticsDirectory();
  await ensureDiagnosticsDirectory(outputDirectory);
  await writeDiagnosticsText(
    joinPath(outputDirectory, "synthesis-close-lifecycle.json"),
    JSON.stringify(
      {
        schema: "synthesis-close-lifecycle-diagnostics.v1",
        stages: closeLifecycleStages,
      },
      null,
      2,
    ),
  );
}

async function waitUntil<Value>(
  read: () => Value | null | undefined,
  maxAttempts = 200,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
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

async function openCitationGraph(
  mainWindow: _ZoteroTypes.MainWindow,
  graph?: ReturnType<typeof closeLifecycleGraph>,
) {
  await openSynthesisWorkbenchTab({
    window: mainWindow,
    ...(graph
      ? {
          snapshotInput: {
            libraryId: Zotero.Libraries.userLibraryID,
            graph: {
              graph_hash: "close-lifecycle-graph",
              layoutStatus: "ready" as const,
              nodes: graph.nodes,
              edges: graph.edges,
              visibleNodes: graph.nodes,
              visibleEdges: graph.edges,
            },
          },
        }
      : {}),
  });
  const frame = (await waitUntil(() =>
    mainWindow.document.querySelector<HTMLElement>(
      '[data-zs-role="synthesis-workbench-frame"]',
    ),
  )) as WorkbenchFrame;
  const graphTab = await waitUntil(() =>
    frame.contentDocument?.querySelector<HTMLButtonElement>(
      'button[data-synthesis-tab="graph"]',
    ),
  );
  graphTab.click();
  await waitUntil(() =>
    frame.contentDocument?.querySelector(".sigma-stage canvas"),
  );
  return frame;
}

async function openInstalledCitationGraph(
  mainWindow: _ZoteroTypes.MainWindow,
  cycle: number,
) {
  const plugin = (Zotero as any)[config.addonInstance];
  assert.isFunction(plugin?.hooks?.onPrefsEvent);
  await recordCloseLifecycleStage("workspace-open-requested", { cycle });
  await plugin.hooks.onPrefsEvent("openSynthesisWorkbench", {
    window: mainWindow,
  });
  await recordCloseLifecycleStage("workspace-open-returned", { cycle });
  const workspaceFrame = (await waitUntil(
    () =>
      mainWindow.document.querySelector<HTMLElement>(
        '[data-zs-role="workspace-frame"]',
      ),
    1_200,
  )) as WorkbenchFrame;
  await recordCloseLifecycleStage("workspace-frame-ready", {
    cycle,
    frameConnected: workspaceFrame.isConnected,
  });
  let frame: WorkbenchFrame;
  try {
    frame = (await waitUntil(
      () =>
        workspaceFrame.contentDocument?.querySelector<HTMLElement>(
          '[data-zs-role="synthesis-workbench-frame"]',
        ),
      1_200,
    )) as WorkbenchFrame;
  } catch (error) {
    const workspaceDocument = workspaceFrame.contentDocument;
    await recordCloseLifecycleStage("synthesis-frame-timeout", {
      cycle,
      workspaceReadyState: workspaceDocument?.readyState || "",
      workspaceUrl: workspaceDocument?.location?.href || "",
      workspaceText: workspaceDocument?.body?.innerText || "",
      synthesisMountPresent: Boolean(
        workspaceDocument?.getElementById("synthesis-mount"),
      ),
      frameRoles: Array.from(
        workspaceDocument?.querySelectorAll<HTMLElement>("[data-zs-role]") ||
          [],
        (node) => node.dataset.zsRole || "",
      ),
    });
    throw error;
  }
  await recordCloseLifecycleStage("synthesis-frame-ready", {
    cycle,
    frameConnected: frame.isConnected,
  });
  let graphTab: HTMLButtonElement;
  try {
    graphTab = await waitUntil(
      () =>
        frame.contentDocument?.querySelector<HTMLButtonElement>(
          'button[data-synthesis-tab="graph"]',
        ),
      1_200,
    );
  } catch (error) {
    await recordCloseLifecycleStage("graph-tab-timeout", {
      cycle,
      synthesisReadyState: frame.contentDocument?.readyState || "",
      synthesisText: frame.contentDocument?.body?.innerText || "",
    });
    throw error;
  }
  await recordCloseLifecycleStage("graph-tab-ready", { cycle });
  graphTab.click();
  await recordCloseLifecycleStage("graph-tab-selected", { cycle });
  try {
    const initialGraphState = await waitUntil(() => {
      const canvas = frame.contentDocument?.querySelector(
        ".sigma-stage canvas",
      );
      if (canvas) return { canvas };
      const rebuildButton = frame.contentDocument?.querySelector<HTMLElement>(
        ".graph-empty button",
      );
      return rebuildButton ? { rebuildButton } : null;
    }, 1_200);
    if ("rebuildButton" in initialGraphState) {
      await recordCloseLifecycleStage("graph-rebuild-requested", {
        cycle,
        emptyText:
          frame.contentDocument?.querySelector<HTMLElement>(".graph-empty")
            ?.innerText || "",
      });
      initialGraphState.rebuildButton.click();
    }
    await waitUntil(
      () => frame.contentDocument?.querySelector(".sigma-stage canvas"),
      24_000,
    );
    await recordCloseLifecycleStage("graph-canvas-ready", { cycle });
  } catch (error) {
    await recordCloseLifecycleStage("graph-canvas-timeout", {
      cycle,
      emptyText:
        frame.contentDocument?.querySelector<HTMLElement>(".graph-empty")
          ?.innerText || "",
      errorCode:
        frame.contentDocument
          ?.querySelector<HTMLElement>("[data-synthesis-error-code]")
          ?.getAttribute("data-synthesis-error-code") || "",
    });
    throw error;
  }
  return frame;
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

  it("keeps the host responsive when Citation Graph closes and Synthesis reopens", async function () {
    const useRealLibrary =
      readDiagnosticsEnv("ZOTERO_SYNTHESIS_CLOSE_REAL_LIBRARY") === "1";
    this.timeout(useRealLibrary ? 900000 : 240000);
    closeLifecycleStages.length = 0;
    const mainWindow = Zotero.getMainWindow();
    assert.isOk(mainWindow);
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

    const graph = useRealLibrary ? undefined : closeLifecycleGraph();
    let frame = useRealLibrary
      ? await openInstalledCitationGraph(mainWindow, 0)
      : await openCitationGraph(mainWindow, graph);
    const tabs = (mainWindow as any).Zotero_Tabs;
    assert.isFunction(tabs?.close);
    const tabId = useRealLibrary
      ? WORKSPACE_TAB_ID
      : SYNTHESIS_WORKBENCH_TAB_ID;
    for (let cycle = 1; cycle <= CLOSE_CYCLES; cycle += 1) {
      await recordCloseLifecycleStage("graph-ready", {
        cycle,
        source: useRealLibrary ? "real-library" : "synthetic",
        frameConnected: frame.isConnected,
        canvasCount:
          frame.contentDocument?.querySelectorAll(".sigma-stage canvas")
            .length || 0,
      });
      await recordCloseLifecycleStage("native-close-requested", {
        cycle,
        frameConnected: frame.isConnected,
      });
      await Promise.resolve(tabs.close(tabId));
      await recordCloseLifecycleStage("native-close-returned", {
        cycle,
        frameConnected: frame.isConnected,
        mainWindowClosed: mainWindow.closed,
      });
      await waitUntil(() => (!frame.isConnected ? true : null));
      await recordCloseLifecycleStage("frame-detached", {
        cycle,
        frameConnected: frame.isConnected,
        mainWindowClosed: mainWindow.closed,
        databasePing: await Zotero.DB.valueQueryAsync("SELECT 1"),
      });

      await recordCloseLifecycleStage("reopen-requested", { cycle });
      const reopenedFrame = useRealLibrary
        ? await openInstalledCitationGraph(mainWindow, cycle)
        : await openCitationGraph(mainWindow, graph);
      assert.notStrictEqual(reopenedFrame, frame);
      await recordCloseLifecycleStage("reopen-graph-ready", {
        cycle,
        frameConnected: reopenedFrame.isConnected,
        canvasCount:
          reopenedFrame.contentDocument?.querySelectorAll(".sigma-stage canvas")
            .length || 0,
      });
      await Zotero.Promise.delay(25);

      assert.isFalse(
        mainWindow.closed,
        `main window survived Synthesis reopen ${cycle}`,
      );
      assert.strictEqual(
        await Zotero.DB.valueQueryAsync("SELECT 1"),
        1,
        `database remained responsive after Synthesis reopen ${cycle}`,
      );
      await recordCloseLifecycleStage("host-responsive", {
        cycle,
        mainWindowClosed: mainWindow.closed,
        databasePing: 1,
        reopenedFrameConnected: reopenedFrame.isConnected,
      });
      frame = reopenedFrame;
    }
    await recordCloseLifecycleStage("final-close-requested", {
      frameConnected: frame.isConnected,
    });
    await closeSynthesisWorkbenchTab();
    await waitUntil(() => (!frame.isConnected ? true : null));
    await recordCloseLifecycleStage("final-frame-detached", {
      frameConnected: frame.isConnected,
    });
    await Zotero.Promise.delay(20_000);
    assert.isFalse(mainWindow.closed, "main window survived final close idle");
    assert.strictEqual(
      await Zotero.DB.valueQueryAsync("SELECT 1"),
      1,
      "database remained responsive after final close idle",
    );
    await recordCloseLifecycleStage("final-close-idle-survived", {
      mainWindowClosed: mainWindow.closed,
      databasePing: 1,
    });
    const crashJournal = await readRuntimeTextFile(
      joinPath(
        getRuntimePersistencePaths().logsDir,
        "citation-graph-crash-journal.json",
      ),
    );
    if (crashJournal) {
      const outputDirectory = resolveDefaultTestDiagnosticsDirectory();
      await ensureDiagnosticsDirectory(outputDirectory);
      await writeDiagnosticsText(
        joinPath(outputDirectory, "citation-graph-crash-journal.json"),
        crashJournal,
      );
      assert.include(crashJournal, "sigma-renderer-created");
      assert.include(crashJournal, "sigma-destroy-complete");
      assert.include(crashJournal, "host-cleanup-complete");
    }
  });
});

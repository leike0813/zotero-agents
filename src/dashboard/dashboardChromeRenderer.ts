// Chrome renderer factory for the dashboard page, mirroring
// src/sidebar/components/chromeRenderer.ts: each managed region renders
// through its own Preact root inside a managed mount, so re-rendering one
// region never clears or rebuilds sibling regions.
//
// Page skeleton contract (adopted when present, created when absent):
//   [data-role="dashboard-tabbar"]  aside sidebar hosting the tab strip
//   [data-role="dashboard-main"]    main surface host
//   [data-role="dashboard-toast"]   toast host (see dashboardDomUtils.showToast)
// addon/content/dashboard/index.html ships these containers; when embedded
// elsewhere the renderer materializes them under the #app root with the
// legacy aside.sidebar / main.main classes so the stylesheet applies.
//
// Region mounting: every surface mounts under main and renders mutually
// exclusively by selectedTabKey — a region whose tab is not selected gets
// render(null, mount), so tab switches never leave stale trees behind.

import { h, render, type ComponentChildren } from "preact";

import { ensureRegionMount, markPageRegion } from "../shared/preactRegionMount";
import { HomeRegion } from "./components/HomeRegion";
import { TabBarRegion } from "./components/TabBarRegion";
import { ProductsRegion } from "./components/ProductsRegion";
import { WorkflowOptionsRegion } from "./components/WorkflowOptionsRegion";
import { RuntimeLogsRegion } from "./components/RuntimeLogsRegion";
import { SynthesisSidecarRegion } from "./components/SynthesisSidecarRegion";
import { SkillrunnerAuditRegion } from "./components/SkillrunnerAuditRegion";
import { AcpTraceReplayRegion } from "./components/AcpTraceReplayRegion";
import { BackendRegion } from "./components/BackendRegion";
import {
  copyTextToClipboard,
  copyTextWithToastFeedback,
  disposeToast,
  showToast,
} from "./dashboardDomUtils";
import {
  dashboardAcpTraceReplayEqualityInput,
  dashboardBackendEqualityInput,
  dashboardHomeEqualityInput,
  dashboardProductsEqualityInput,
  dashboardRuntimeLogsEqualityInput,
  dashboardSkillrunnerAuditEqualityInput,
  dashboardSynthesisSidecarEqualityInput,
  dashboardTabBarEqualityInput,
  dashboardWorkflowOptionsEqualityInputForPanel,
} from "./dashboardPanelModel";
import type {
  DashboardActionDispatcher,
  DashboardActionSender,
  DashboardPanel,
  DashboardUiPatch,
} from "./dashboardTypes";

// Synthesis sidecar diagnostics is a debug-mode surface: the release build
// defines both flags to false, and esbuild folds the inlined expression to
// drop the region module from the bundle. The expression is inlined (rather
// than a module-scope const) because esbuild does not propagate a const into
// later statements, which would defeat dead-code elimination.
declare const __debug_mode__: boolean;
declare const __synthesis_sidecar_diagnostics_enabled__: boolean;

export type DashboardChromeRendererDeps = {
  // Panel root; defaults to document.getElementById("app") at render time.
  root?: HTMLElement | null;
  // Host-bound action channel (legacy sendAction).
  sendAction: DashboardActionSender;
  // Every region action, host-bound or page-local, flows through here; the
  // controller decides which intents are UI-local (e.g. the synthesis
  // sidecar trace filter) and which go to the host via sendAction.
  dispatchAction: DashboardActionDispatcher;
  // Local UI-state changes that must round-trip through the controller
  // (e.g. optimistic tab selection) before re-rendering.
  onUiChange?: (patch: DashboardUiPatch) => void;
  // Toast channel; defaults to dashboardDomUtils.showToast.
  onToast?: (message: string) => void;
  // Backend task-table scroll persistence seam (legacy
  // state.backendTaskScrollTopByTabKey): writes and reads stay outside every
  // region selection.
  onTaskTableScroll?: (scrollKey: string, scrollTop: number) => void;
  taskTableScrollTop?: (scrollKey: string) => number;
  onHomeWorkflowDocScroll?: (workflowId: string, scrollTop: number) => void;
  homeWorkflowDocScrollTop?: (workflowId: string) => number;
};

type DashboardSkeleton = {
  tabbar: HTMLElement;
  main: HTMLElement;
};

function ensureDashboardSkeleton(root: HTMLElement): DashboardSkeleton {
  let tabbar = root.querySelector<HTMLElement>(
    ':scope > [data-role="dashboard-tabbar"]',
  );
  let main = root.querySelector<HTMLElement>(
    ':scope > [data-role="dashboard-main"]',
  );
  if (
    !tabbar ||
    !main ||
    tabbar.parentNode !== root ||
    main.parentNode !== root
  ) {
    if (!tabbar) {
      tabbar = document.createElement("aside");
      tabbar.className = "sidebar";
      tabbar.setAttribute("data-role", "dashboard-tabbar");
      root.appendChild(tabbar);
    }
    if (!main) {
      main = document.createElement("main");
      main.className = "main";
      main.setAttribute("data-role", "dashboard-main");
      root.appendChild(main);
    }
  }
  markPageRegion(tabbar, "dashboard-tabbar", {
    className: "dashboard-tabbar-region",
  });
  markPageRegion(main, "dashboard-main", {
    className: "dashboard-main-region",
  });
  return { tabbar, main };
}

function renderBackendLoadError(main: HTMLElement, message: string) {
  let banner = main.querySelector<HTMLElement>(
    ":scope > .error-banner[data-role='dashboard-error-banner']",
  );
  if (!message) {
    banner?.remove();
    return;
  }
  if (!banner) {
    banner = document.createElement("div");
    banner.className = "error-banner";
    banner.setAttribute("data-role", "dashboard-error-banner");
    main.insertBefore(banner, main.firstChild);
  }
  if (banner.textContent !== message) {
    banner.textContent = message;
  }
}

// Legacy render() dispatch: main gets the full-height flex class on the home
// document view, products, runtime-logs, the SkillRunner audit, and the
// skillrunner/acp backend surfaces.
function shouldFillMain(panel: DashboardPanel): boolean {
  const key = panel.selectedTabKey;
  if (key === "home") return panel.home?.kind === "doc";
  if (
    key === "products" ||
    key === "runtime-logs" ||
    key === "skillrunner-connection-audit"
  ) {
    return true;
  }
  if (key.startsWith("backend:")) {
    const kind = panel.views.backend?.kind;
    return kind === "skillrunner" || kind === "acp";
  }
  return false;
}

export function createDashboardChromeRenderer(
  deps: DashboardChromeRendererDeps,
) {
  const toast = deps.onToast || showToast;
  const handleSelectTab = (tabKey: string) => {
    deps.onUiChange?.({ selectedTabKey: tabKey });
    deps.sendAction("select-tab", { tabKey });
  };
  // Synthesis sidecar copy: toast first, then settle the promise so the
  // component's button-label swap reflects the outcome.
  const handleCopyText = (
    text: string,
    successToast: string,
    failureToast: string,
  ): Promise<void> =>
    copyTextToClipboard(text).then(
      () => {
        if (successToast) toast(successToast);
      },
      (error: unknown) => {
        if (failureToast) toast(failureToast);
        throw error;
      },
    );
  // SkillRunner audit copy is page-local (no host action): copies the raw
  // view JSON from the latest rendered panel.
  let lastPanel: DashboardPanel | null = null;
  const handleAuditCopyJson = () => {
    const auditCopy = lastPanel?.auditCopy;
    if (auditCopy) {
      void copyTextWithToastFeedback(auditCopy.json, auditCopy.toastMessage);
    }
  };
  const handleTaskTableScroll = (scrollKey: string, scrollTop: number) => {
    deps.onTaskTableScroll?.(scrollKey, scrollTop);
  };

  function renderPanel(panel: DashboardPanel | null): void {
    lastPanel = panel;
    const root =
      deps.root ??
      (typeof document === "undefined" ? null : document.getElementById("app"));
    if (!root) return;
    const skeleton = ensureDashboardSkeleton(root);

    const tabbarMount = ensureRegionMount(skeleton.tabbar, "tabbar");
    if (tabbarMount) {
      render(
        panel
          ? h(TabBarRegion, {
              selection: dashboardTabBarEqualityInput(panel),
              onSelectTab: handleSelectTab,
            })
          : null,
        tabbarMount,
      );
    }

    renderBackendLoadError(skeleton.main, panel?.backendLoadError || "");
    skeleton.main.classList.toggle(
      "skillrunner-fill",
      !!panel && shouldFillMain(panel),
    );

    const main = skeleton.main;
    const renderMainRegion = (name: string, vnode: ComponentChildren) => {
      const mount = ensureRegionMount(main, name);
      if (mount) render(vnode, mount);
    };

    const homeSelection = panel ? dashboardHomeEqualityInput(panel) : null;
    renderMainRegion(
      "home",
      homeSelection
        ? h(HomeRegion, {
            selection: homeSelection,
            onAction: deps.dispatchAction,
            onHomeWorkflowDocScroll: deps.onHomeWorkflowDocScroll,
            homeWorkflowDocScrollTop: homeSelection.doc
              ? deps.homeWorkflowDocScrollTop?.(homeSelection.doc.workflowId) ||
                0
              : 0,
          })
        : null,
    );

    const productsSelection = panel
      ? dashboardProductsEqualityInput(panel)
      : null;
    renderMainRegion(
      "products",
      productsSelection
        ? h(ProductsRegion, {
            selection: productsSelection,
            onAction: deps.dispatchAction,
          })
        : null,
    );

    const workflowOptionsSelection = panel
      ? dashboardWorkflowOptionsEqualityInputForPanel(panel)
      : null;
    renderMainRegion(
      "workflow-options",
      workflowOptionsSelection
        ? h(WorkflowOptionsRegion, {
            selection: workflowOptionsSelection,
            onAction: deps.dispatchAction,
          })
        : null,
    );

    const runtimeLogsSelection = panel
      ? dashboardRuntimeLogsEqualityInput(panel)
      : null;
    renderMainRegion(
      "runtime-logs",
      runtimeLogsSelection
        ? h(RuntimeLogsRegion, {
            selection: runtimeLogsSelection,
            onAction: deps.dispatchAction,
            onToast: toast,
          })
        : null,
    );

    const synthesisSidecarSelection =
      (typeof __debug_mode__ === "undefined" || __debug_mode__ === true) &&
      (typeof __synthesis_sidecar_diagnostics_enabled__ === "undefined" ||
        __synthesis_sidecar_diagnostics_enabled__ === true) &&
      panel
        ? dashboardSynthesisSidecarEqualityInput(panel)
        : null;
    renderMainRegion(
      "synthesis-sidecar",
      synthesisSidecarSelection
        ? h(SynthesisSidecarRegion, {
            selection: synthesisSidecarSelection,
            onAction: deps.dispatchAction,
            onCopyText: handleCopyText,
          })
        : null,
    );

    const auditSelection = panel
      ? dashboardSkillrunnerAuditEqualityInput(panel)
      : null;
    renderMainRegion(
      "skillrunner-audit",
      auditSelection
        ? h(SkillrunnerAuditRegion, {
            selection: auditSelection,
            onCopyJson: handleAuditCopyJson,
          })
        : null,
    );

    const acpTraceReplaySelection = panel
      ? dashboardAcpTraceReplayEqualityInput(panel)
      : null;
    renderMainRegion(
      "acp-trace-replay",
      acpTraceReplaySelection
        ? h(AcpTraceReplayRegion, {
            selection: acpTraceReplaySelection,
            onAction: deps.dispatchAction,
          })
        : null,
    );

    const backendSelection = panel
      ? dashboardBackendEqualityInput(panel)
      : null;
    renderMainRegion(
      "backend",
      backendSelection
        ? h(BackendRegion, {
            selection: backendSelection,
            onAction: deps.dispatchAction,
            onTaskTableScroll: handleTaskTableScroll,
            taskScrollTop: deps.taskTableScrollTop?.(
              backendSelection.scrollKey,
            ),
          })
        : null,
    );

    if (panel && typeof document !== "undefined") {
      document.title = panel.title;
    }
  }

  function dispose(): void {
    disposeToast();
    const root =
      deps.root ??
      (typeof document === "undefined" ? null : document.getElementById("app"));
    if (!root) return;
    root
      .querySelectorAll("[data-region-mount]")
      .forEach((mount) => render(null, mount as HTMLElement));
  }

  return { renderPanel, dispose };
}

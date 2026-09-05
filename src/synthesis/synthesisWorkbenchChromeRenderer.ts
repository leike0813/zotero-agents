// Chrome renderer factory for the synthesis workbench page, mirroring
// src/dashboard/dashboardChromeRenderer.ts: each managed region renders
// through its own Preact root inside a managed mount, so re-rendering one
// region never clears or rebuilds sibling regions.
//
// Page skeleton contract (created when absent):
//   [data-role="synthesis-shell"]    aside sidebar (ShellRegion)
//   [data-role="synthesis-content"]  content column
//     [data-role="synthesis-topbar"] topbar: mount "topbar" (TopbarRegion) +
//       .topbar-controls hosting mount "sidecar" (SidecarIndicatorRegion)
//     [data-role="synthesis-main"]   surface host; graph is kept in a
//       persistent managed mount so switching tabs does not kill Sigma/WebGL
//     [data-role="synthesis-chrome"] mount "chrome" (ChromeRegion statusbar)
// Standalone host shapes converge here: standaloneTopicExport drops the
// sidebar/chrome mounts, standaloneGraphOnly keeps only the main host.

import { h, render } from "preact";
import { HomeRegion } from "./components/HomeRegion";
import { TopicsRegion } from "./components/TopicsRegion";
import { ConceptsRegion } from "./components/ConceptsRegion";
import { TagsRegion } from "./components/TagsRegion";
import { RegistryRegion } from "./components/registry/RegistryRegion";
import { ReviewCenterRegion } from "./components/reviewCenter/ReviewCenterRegion";
import { ReaderRegion } from "./components/reader/ReaderRegion";
import { GraphRegion } from "./components/graph/GraphRegion";
import type { CitationGraphVendors } from "./components/graph/sigmaIsland";
import type { SynthesisGraphRegionSelection } from "./components/graph/GraphRegion";
import { createSynthesisWorkbenchText } from "./synthesisWorkbenchPanelModel";
import { equalBySignature } from "../shared/regionEquality";

import { ensureRegionMount, markPageRegion } from "../shared/preactRegionMount";
import type { SynthesisWorkbenchHostShape } from "../shared/synthesisWorkbenchWireContract";
import {
  ChromeRegion,
  SidecarIndicatorRegion,
} from "./components/ChromeRegion";
import { ShellRegion, TopbarRegion } from "./components/ShellRegion";
import {
  synthesisWorkbenchChromeEqualityInput,
  synthesisWorkbenchShellEqualityInput,
  synthesisWorkbenchSidecarEqualityInput,
  synthesisWorkbenchSurfaceEqualityInput,
  synthesisWorkbenchTopbarEqualityInput,
} from "./synthesisWorkbenchPanelModel";
import type {
  SynthesisWorkbenchActionSender,
  SynthesisWorkbenchPanel,
  SynthesisWorkbenchIntentSender,
  SynthesisWorkbenchUiPatch,
} from "./synthesisWorkbenchTypes";

export type SynthesisWorkbenchChromeRendererDeps = {
  // Panel root; defaults to document.getElementById("app") at render time.
  root?: HTMLElement | null;
  vendors?: CitationGraphVendors;
  // Host-bound action channel (legacy sendAction).
  sendAction: SynthesisWorkbenchActionSender;
  // Every region action, host-bound or page-local, flows through here; the
  // controller decides which intents are UI-local (sidebar toggle, job
  // popover) and which go to the host via sendAction.
  dispatchAction: SynthesisWorkbenchIntentSender;
  // Local UI-state changes that round-trip through the controller before
  // re-rendering (sidebarExpanded, jobPopoverOpen).
  onUiChange?: (patch: SynthesisWorkbenchUiPatch) => void;
};

type SynthesisWorkbenchSkeleton = {
  shell: HTMLElement | null;
  topbar: HTMLElement | null;
  topbarControls: HTMLElement | null;
  main: HTMLElement;
  chrome: HTMLElement | null;
};

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  role: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.setAttribute("data-role", role);
  return node;
}

function ensureSynthesisSkeleton(
  root: HTMLElement,
  hostShape: SynthesisWorkbenchHostShape,
): SynthesisWorkbenchSkeleton {
  let shell = root.querySelector<HTMLElement>(
    ':scope > [data-role="synthesis-shell"]',
  );
  let content = root.querySelector<HTMLElement>(
    ':scope > [data-role="synthesis-content"]',
  );
  let main = root.querySelector<HTMLElement>('[data-role="synthesis-main"]');

  const needsShell = hostShape === "hosted";
  const stale =
    (needsShell && (!shell || shell.parentNode !== root)) ||
    (!needsShell && shell) ||
    !content ||
    content.parentNode !== root ||
    !main;
  if (stale) {
    root.textContent = "";
    shell = null;
    content = null;
    main = null;
  }

  if (needsShell && !shell) {
    shell = createElement("aside", "sidebar", "synthesis-shell");
    root.appendChild(shell);
  }
  if (!content) {
    content = createElement(
      hostShape === "standaloneTopicExport" ? "div" : "main",
      hostShape === "hosted"
        ? "content"
        : hostShape === "standaloneTopicExport"
          ? "content standalone-topic-export-content"
          : "standalone-graph-export-main",
      "synthesis-content",
    );
    root.appendChild(content);
  }

  let topbar: HTMLElement | null = null;
  let topbarControls: HTMLElement | null = null;
  if (hostShape !== "standaloneGraphOnly") {
    topbar = content.querySelector<HTMLElement>(
      ':scope > [data-role="synthesis-topbar"]',
    );
    if (!topbar) {
      topbar = createElement(
        "div",
        hostShape === "hosted"
          ? "topbar"
          : "topbar standalone-topic-export-header",
        "synthesis-topbar",
      );
      content.appendChild(topbar);
    }
    if (hostShape === "hosted") {
      topbarControls = topbar.querySelector<HTMLElement>(
        ":scope > .topbar-controls",
      );
      if (!topbarControls) {
        topbarControls = document.createElement("div");
        topbarControls.className = "topbar-controls";
        topbar.appendChild(topbarControls);
      }
    }
  }

  main = content.querySelector<HTMLElement>(
    ':scope > [data-role="synthesis-main"]',
  );
  if (!main) {
    main = createElement("section", "main", "synthesis-main");
    content.appendChild(main);
  }

  let chrome: HTMLElement | null = null;
  if (hostShape === "hosted") {
    chrome = content.querySelector<HTMLElement>(
      ':scope > [data-role="synthesis-chrome"]',
    );
    if (!chrome) {
      chrome = createElement("div", "", "synthesis-chrome");
      content.appendChild(chrome);
    }
  }

  if (shell) {
    markPageRegion(shell, "synthesis-shell", {
      className: "synthesis-shell-region",
    });
  }
  if (topbar) {
    markPageRegion(topbar, "synthesis-topbar", {
      className: "synthesis-topbar-region",
    });
  }
  markPageRegion(main, "synthesis-main", {
    className: "synthesis-main-region",
  });
  if (chrome) {
    markPageRegion(chrome, "synthesis-chrome", {
      className: "synthesis-chrome-region",
    });
  }
  return { shell, topbar, topbarControls, main, chrome };
}

function SurfacePlaceholder(props: {
  selection: SynthesisWorkbenchPanel["surface"];
}) {
  const selection = props.selection;
  if (!selection) return null;
  return h(
    "div",
    {
      class: "surface-loading",
      "data-synthesis-surface": `${selection.surface}-placeholder`,
    },
    !selection.isError ? h("div", { class: "loading-spinner" }) : null,
    h("div", { class: "loading-title" }, selection.title),
    h("div", { class: "loading-subtitle" }, selection.subtitle),
  );
}

function setGraphMountActive(mount: HTMLElement, active: boolean): void {
  mount.classList.add("workbench-graph-surface");
  mount.classList.toggle("is-active", active);
  mount.classList.toggle("is-inactive", !active);
  mount.removeAttribute("hidden");
  mount.setAttribute("aria-hidden", active ? "false" : "true");
  if (active) {
    mount.removeAttribute("inert");
    mount.style.removeProperty("visibility");
    mount.style.removeProperty("pointer-events");
  } else {
    mount.setAttribute("inert", "");
    mount.style.visibility = "hidden";
    mount.style.pointerEvents = "none";
  }
}

export function createSynthesisWorkbenchChromeRenderer(
  deps: SynthesisWorkbenchChromeRendererDeps,
) {
  let i18n: SynthesisWorkbenchPanel["i18n"];
  let translate: ReturnType<typeof createSynthesisWorkbenchText>;
  let graphSelection: SynthesisGraphRegionSelection | undefined;
  const reviewHandlers = {
    onQueueReferenceDecision: (proposalId: string, action: string) =>
      deps.dispatchAction("queueReferenceDecision", { proposalId, action }),
    onCancelReferenceDecision: (proposalId: string) =>
      deps.dispatchAction("cancelReferenceDecision", { proposalId }),
    onApplyPendingReferenceDecisions: () =>
      deps.dispatchAction("applyPendingReferenceDecisions", {}),
    onClearPendingReferenceDecisions: () =>
      deps.dispatchAction("clearPendingReferenceDecisions", {}),
    onOpenManualTargetPicker: (
      proposalId: string,
      sourceTitle?: string,
      anchorRect?: unknown,
    ) =>
      deps.dispatchAction("openReferenceTargetPicker", {
        proposalId,
        ...(sourceTitle ? { sourceTitle } : {}),
        ...(anchorRect ? { anchorRect } : {}),
      }),
  };
  const handleSelectTab = (tab: string) => {
    deps.dispatchAction("selectTab", { tab });
  };
  // Page-local UI intents; the controller owns sidebarExpanded /
  // jobPopoverOpen and folds these into its state before re-projecting.
  const handleToggleSidebar = () => {
    deps.dispatchAction("toggleSidebar", {});
  };
  const handleToggleJobPopover = () => {
    deps.dispatchAction("toggleJobPopover", {});
  };
  const handleOpenJob = (job: { command?: string; targetTab?: string }) => {
    deps.onUiChange?.({ jobPopoverOpen: false });
    if (job.command) {
      deps.dispatchAction("hostCommand", { command: job.command, args: {} });
      return;
    }
    if (job.targetTab && job.targetTab !== "reader") {
      deps.dispatchAction("selectTab", { tab: job.targetTab });
    }
  };
  const handleOpenSidecarDiagnostics = () => {
    deps.dispatchAction("openSynthesisSidecarDiagnostics", {});
  };

  function renderPanel(panel: SynthesisWorkbenchPanel | null): void {
    const root =
      deps.root ??
      (typeof document === "undefined" ? null : document.getElementById("app"));
    if (!root) return;
    const skeleton = ensureSynthesisSkeleton(
      root,
      panel?.hostShape || "hosted",
    );

    root.classList.toggle("sidebar-expanded", panel?.shell?.expanded === true);
    root.classList.toggle("sidebar-collapsed", panel?.shell?.expanded !== true);
    root.classList.toggle(
      "standalone-topic-export-root",
      panel?.hostShape === "standaloneTopicExport",
    );
    root.classList.toggle(
      "standalone-graph-export-root",
      panel?.hostShape === "standaloneGraphOnly",
    );

    const shellMount = ensureRegionMount(skeleton.shell, "shell");
    if (shellMount) {
      render(
        panel?.shell
          ? h(ShellRegion, {
              selection: synthesisWorkbenchShellEqualityInput(panel)!,
              onSelectTab: handleSelectTab,
              onToggleSidebar: handleToggleSidebar,
            })
          : null,
        shellMount,
      );
    }

    const topbarMount = ensureRegionMount(skeleton.topbar, "topbar");
    if (topbarMount) {
      render(
        panel?.topbar
          ? h(TopbarRegion, {
              selection: synthesisWorkbenchTopbarEqualityInput(panel)!,
            })
          : null,
        topbarMount,
      );
    }

    const sidecarMount = ensureRegionMount(skeleton.topbarControls, "sidecar");
    if (sidecarMount) {
      render(
        panel?.sidecar
          ? h(SidecarIndicatorRegion, {
              selection: synthesisWorkbenchSidecarEqualityInput(panel)!,
              onOpenDiagnostics: handleOpenSidecarDiagnostics,
            })
          : null,
        sidecarMount,
      );
    }

    if (panel?.surface) {
      skeleton.main.dataset.synthesisSurface = panel.surface.surface;
    }
    const surfaceMount = ensureRegionMount(skeleton.main, "surface");
    const graphMount = ensureRegionMount(skeleton.main, "graph-surface");
    if (panel?.i18n && !equalBySignature(i18n, panel.i18n)) {
      i18n = panel.i18n;
      translate = createSynthesisWorkbenchText(i18n);
    }
    const business = panel?.business;
    const common = { t: translate, onAction: deps.dispatchAction };

    if (graphMount) {
      const graphIsActive = business?.surface === "graph";
      if (business?.surface === "graph") {
        graphSelection = business.selection;
      }
      setGraphMountActive(graphMount, Boolean(graphSelection && graphIsActive));
      render(
        graphSelection
          ? h(GraphRegion, {
              ...common,
              selection: graphSelection,
              vendors: deps.vendors,
              active: graphIsActive,
            })
          : null,
        graphMount,
      );
    }

    if (surfaceMount) {
      if (panel?.i18n && !equalBySignature(i18n, panel.i18n)) {
        i18n = panel.i18n;
        translate = createSynthesisWorkbenchText(i18n);
      }
      let content;
      switch (business?.surface) {
        case "home":
          content = h(HomeRegion, { ...common, selection: business.selection });
          break;
        case "topics":
          content = h(TopicsRegion, {
            ...common,
            selection: business.selection,
          });
          break;
        case "concepts":
          content = h(ConceptsRegion, {
            ...common,
            selection: business.selection,
          });
          break;
        case "tags":
          content = h(TagsRegion, { ...common, selection: business.selection });
          break;
        case "index":
          content = h(RegistryRegion, {
            ...common,
            selection: business.selection,
            reviewHandlers,
          });
          break;
        case "review":
          content = h(ReviewCenterRegion, {
            ...common,
            selection: business.selection,
            referenceReview: panel?.referenceReview,
          });
          break;
        case "reader":
          content = h(ReaderRegion, {
            ...common,
            selection: business.selection,
          });
          break;
        case "graph":
          content = null;
          break;
      }
      render(
        content ||
          (panel?.surface && business?.surface !== "graph"
            ? h(SurfacePlaceholder, {
                selection: synthesisWorkbenchSurfaceEqualityInput(panel),
              })
            : null),
        surfaceMount,
      );
    }

    if (!panel) {
      graphSelection = undefined;
      if (graphMount) {
        setGraphMountActive(graphMount, false);
        render(null, graphMount);
      }
    }

    const chromeMount = ensureRegionMount(skeleton.chrome, "chrome");
    if (chromeMount) {
      render(
        panel?.chrome
          ? h(ChromeRegion, {
              selection: synthesisWorkbenchChromeEqualityInput(panel)!,
              onToggleJobPopover: handleToggleJobPopover,
              onOpenJob: handleOpenJob,
            })
          : null,
        chromeMount,
      );
    }
  }

  return { renderPanel };
}

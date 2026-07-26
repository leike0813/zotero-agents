import { h, render } from "preact";

import { MessageCountsRegion } from "./MessageCountsRegion";
import { ToolbarRegion } from "./ToolbarRegion";
import { BannerRegion, type StatusToneFn } from "./BannerRegion";
import { PlanRegion } from "./PlanRegion";
import { HintRegion } from "./HintRegion";
import { ReplyRegion } from "./ReplyRegion";
import { PermissionDrawerRegion } from "./PermissionDrawerRegion";
import { DetailsDrawerRegion } from "./DetailsDrawerRegion";
import { ContextDrawerRegion } from "./ContextDrawerRegion";
import { TranscriptRegion } from "./TranscriptRegion";
import { ViewModeToggle } from "./ViewModeToggle";
import { EmptyStateRegion } from "./EmptyStateRegion";
import {
  contextDrawerEqualityInput,
  detailsDrawerEqualityInput,
  labelOf,
  messageCountsEqualityInput,
  permissionDrawerEqualityInput,
} from "./regionEquality";

// Takeover seam for the ACP child chrome migration — now complete: every
// managed chrome region of the ACP child renders through Preact. The shared
// imperative renderer is only used for adoptPanelRegions (root/region
// marking) and by the SkillRunner run-dialog, which converges in Phase 3.

export type ManagedMountFn = (
  container: HTMLElement,
  name: string,
) => HTMLElement | null;

export type AdoptPanelRegionsFn = (
  panel: unknown,
  options: Record<string, unknown>,
) => void;

type ChromeRegionElements = {
  messageCounter?: HTMLElement | null;
  toolbar?: HTMLElement | null;
  banner?: HTMLElement | null;
  plan?: HTMLElement | null;
  hint?: HTMLElement | null;
  reply?: HTMLElement | null;
  details?: HTMLElement | null;
  drawer?: HTMLElement | null;
  [key: string]: unknown;
};

type ChromeRenderOptions = {
  root?: HTMLElement | null;
  regions?: ChromeRegionElements;
  onAction?: (action: unknown, payload: unknown) => void;
  managedMount?: ManagedMountFn;
  statusTone?: StatusToneFn;
};

function panelField(panel: unknown, field: string): unknown {
  return panel && typeof panel === "object"
    ? (panel as Record<string, unknown>)[field]
    : undefined;
}

function panelRecord(panel: unknown, field: string) {
  const value = panelField(panel, field);
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

export function renderMigratedChromeRegions(
  panel: unknown,
  options: ChromeRenderOptions,
) {
  const regions = options.regions || {};
  if (regions.messageCounter) {
    const container = regions.messageCounter;
    render(
      h(MessageCountsRegion, {
        container,
        selection: messageCountsEqualityInput(
          panel as Parameters<typeof messageCountsEqualityInput>[0],
        ),
      }),
      container,
    );
  }
  if (regions.toolbar && options.managedMount) {
    const mount = options.managedMount(regions.toolbar, "toolbar");
    if (mount) {
      render(
        h(ToolbarRegion, {
          actions: panelRecord(panel, "actions")?.toolbar,
          onAction: options.onAction || (() => {}),
        }),
        mount,
      );
    }
  }
  if (regions.banner && options.managedMount) {
    const mount = options.managedMount(regions.banner, "banner");
    if (mount) {
      render(
        h(BannerRegion, {
          context: panelRecord(panel, "context"),
          lifecycle: panelRecord(panel, "lifecycle"),
          onAction: options.onAction || (() => {}),
          statusTone: options.statusTone || (() => "muted"),
        }),
        mount,
      );
    }
  }
  if (regions.plan && options.managedMount) {
    const mount = options.managedMount(regions.plan, "plan");
    if (mount) {
      render(
        h(PlanRegion, {
          container: regions.plan,
          plan: panelRecord(panel, "plan"),
          interactionKind: panelRecord(panel, "interaction")?.kind,
          planTitle: labelOf(
            panel as Parameters<typeof labelOf>[0],
            "plan.title",
            "Plan",
          ),
        }),
        mount,
      );
    }
  }
  if (regions.hint && options.managedMount) {
    const mount = options.managedMount(regions.hint, "hint");
    if (mount) {
      render(
        h(HintRegion, {
          container: regions.hint,
          interaction: panelRecord(panel, "interaction"),
          onAction: options.onAction || (() => {}),
          labelOf: (path: string, fallback: string) =>
            labelOf(panel as Parameters<typeof labelOf>[0], path, fallback),
        }),
        mount,
      );
    }
  }
  if (regions.reply && options.managedMount) {
    const mount = options.managedMount(regions.reply, "reply");
    if (mount) {
      render(
        h(ReplyRegion, {
          container: regions.reply,
          panel: panel as Record<string, unknown>,
          onAction: options.onAction || (() => {}),
          labelOf: (path: string, fallback: string) =>
            labelOf(panel as Parameters<typeof labelOf>[0], path, fallback),
        }),
        mount,
      );
    }
  }
  if (regions.details && options.managedMount) {
    const mount = options.managedMount(regions.details, "details");
    if (mount) {
      render(
        h(DetailsDrawerRegion, {
          container: regions.details,
          selection: detailsDrawerEqualityInput(
            panel as Parameters<typeof detailsDrawerEqualityInput>[0],
          ) as never,
          onAction: options.onAction || (() => {}),
          labelOf: (path: string, fallback: string) =>
            labelOf(panel as Parameters<typeof labelOf>[0], path, fallback),
        }),
        mount,
      );
    }
  }
  if (regions.drawer && options.managedMount) {
    const mount = options.managedMount(regions.drawer, "drawer");
    if (mount) {
      render(
        h(ContextDrawerRegion, {
          container: regions.drawer,
          selection: contextDrawerEqualityInput(
            panel as Parameters<typeof contextDrawerEqualityInput>[0],
          ) as never,
          onAction: options.onAction || (() => {}),
          labelOf: (path: string, fallback: string) =>
            labelOf(panel as Parameters<typeof labelOf>[0], path, fallback),
          statusTone: options.statusTone || (() => "muted"),
        }),
        mount,
      );
    }
  }
  if (options.root) {
    // The permission overlay lives directly under the panel root; create it
    // on first use exactly like the imperative renderer did.
    let overlay = options.root.querySelector(
      ":scope > .assistant-panel-permission-drawer-overlay",
    ) as HTMLElement | null;
    if (!overlay) {
      overlay = document.createElement("section");
      overlay.className = "assistant-panel-permission-drawer-overlay hidden";
      options.root.appendChild(overlay);
    }
    render(
      h(PermissionDrawerRegion, {
        container: overlay,
        selection: permissionDrawerEqualityInput(
          panel as Parameters<typeof permissionDrawerEqualityInput>[0],
        ) as never,
        onAction: options.onAction || (() => {}),
        labelOf: (path: string, fallback: string) =>
          labelOf(panel as Parameters<typeof labelOf>[0], path, fallback),
      }),
      overlay,
    );
  }
}

// Transcript wrapper render. The child computes the transcript state, calls
// this for the placeholder/mode boundary, and — when the state is "ready" —
// follows with the imperative full render on the same container. The
// onResetVirtualState DI performs the imperative virtual-state reset (plus
// order/mode key cleanup) when a non-ready state takes over the container.
export function renderTranscriptRegion(options: {
  container: HTMLElement;
  state: "idle" | "loading" | "failed" | "ready";
  message: string;
  mode: "plain" | "bubble";
  ownerKey: string;
  onResetVirtualState: (container: HTMLElement) => void;
}) {
  render(h(TranscriptRegion, options), options.container);
}

// Unmount the wrapper vnode so a hard failure recovery starts from a clean
// Preact slate (imperatively managed rows are cleared separately).
export function renderTranscriptRegionReset(container: HTMLElement) {
  render(null, container);
}

// Static conversation chrome: view-mode toggle buttons and the empty-state
// surface text, previously wired imperatively by the child's configure().
export function renderStaticChrome(options: {
  viewModeContainer?: HTMLElement | null;
  viewMode?: "plain" | "bubble";
  labels?: Record<string, unknown>;
  onSelectViewMode?: (mode: "plain" | "bubble") => void;
  emptyContainer?: HTMLElement | null;
  emptyText?: string;
}) {
  if (options.viewModeContainer) {
    render(
      h(ViewModeToggle, {
        container: options.viewModeContainer,
        mode: options.viewMode || "plain",
        labels: options.labels || {},
        onSelect: options.onSelectViewMode || (() => {}),
      }),
      options.viewModeContainer,
    );
  }
  if (options.emptyContainer) {
    render(
      h(EmptyStateRegion, { text: options.emptyText || "" }),
      options.emptyContainer,
    );
  }
}

// The child's chrome render wiring: region marking stays with the shared
// imperative adoptPanelRegions (also used by the run-dialog), and every
// managed chrome region renders through the Preact seam. Both the ACP child
// and the renderer smoke tests drive chrome through this factory so tests
// exercise the exact production wiring.
export function createChromePanelRenderer(deps: {
  adoptPanelRegions: AdoptPanelRegionsFn;
  managedMount: ManagedMountFn;
  statusTone: StatusToneFn;
}) {
  return function renderChromePanel(
    panel: unknown,
    options: Record<string, unknown>,
  ) {
    deps.adoptPanelRegions(panel, options);
    renderMigratedChromeRegions(panel, {
      root: options.root as HTMLElement | null | undefined,
      regions: options.regions as ChromeRegionElements | undefined,
      onAction: options.onAction as ChromeRenderOptions["onAction"],
      managedMount: deps.managedMount,
      statusTone: deps.statusTone,
    });
  };
}

// Region collapse controller for the Assistant Workspace chrome regions
// (toolbar / banner / composer).
//
// Collapse is a pure chrome presentation state: the controller only toggles
// the `is-region-collapsed` class on the region container elements and a
// `data-collapse-stage` attribute on the panel root. It never renders into
// the managed region mounts, never touches the transcript, and never calls
// back into the panel render pipeline — the Preact region components and
// their signature boundaries (src/sidebar/components/regionEquality.ts) are
// not involved, mirroring the container-level `hidden` toggling used for the
// context/details drawers.
//
// Trigger model is manual-first with an automatic fallback: a ResizeObserver
// derives an auto stage from the child panel viewport height (enter/exit
// thresholds with hysteresis), and each region follows the auto stage until
// the user clicks its toggle, which pins a manual override. Toggling back to
// the auto-suggested value clears the override and returns the region to
// auto mode. State is session-scoped and lives only in this controller.

export type CollapseRegionName = "toolbar" | "banner" | "composer";

export type RegionCollapseLabels = {
  collapseToolbar?: unknown;
  expandToolbar?: unknown;
  collapseBanner?: unknown;
  expandBanner?: unknown;
  collapseComposer?: unknown;
  expandComposer?: unknown;
};

// Auto-collapse stages, ordered by decreasing viewport height. `enter`
// collapses immediately once the height drops to it; `exit` only restores
// after the height climbs past it, so the band between enter and exit is the
// hysteresis zone that prevents flapping.
export const COLLAPSE_STAGE_RULES = [
  { stage: 1, enter: 620, exit: 680 },
  { stage: 2, enter: 540, exit: 600 },
  { stage: 3, enter: 440, exit: 500 },
] as const;

// The stage at which each region starts auto-collapsing: banner first, then
// the composer compacts, then the toolbar. The transcript is never staged.
export const REGION_AUTO_STAGE: Record<CollapseRegionName, number> = {
  banner: 1,
  composer: 2,
  toolbar: 3,
};

const REGION_ORDER: CollapseRegionName[] = ["toolbar", "banner", "composer"];

const FALLBACK_LABELS: Record<CollapseRegionName, [string, string]> = {
  toolbar: ["Collapse toolbar", "Expand toolbar"],
  banner: ["Collapse banner", "Expand banner"],
  composer: ["Collapse composer", "Expand composer"],
};

export function resolveAutoStage(
  height: number,
  previousStage: number,
): number {
  const h = Number(height);
  let stage = Math.max(
    0,
    Math.min(COLLAPSE_STAGE_RULES.length, Math.floor(previousStage) || 0),
  );
  if (!Number.isFinite(h) || h <= 0) return stage;
  for (const rule of COLLAPSE_STAGE_RULES) {
    if (h <= rule.enter && rule.stage > stage) stage = rule.stage;
  }
  while (stage > 0 && h > COLLAPSE_STAGE_RULES[stage - 1].exit) {
    stage -= 1;
  }
  return stage;
}

export function autoCollapsed(
  region: CollapseRegionName,
  stage: number,
): boolean {
  return stage >= REGION_AUTO_STAGE[region];
}

export function effectiveCollapsed(
  override: boolean | null,
  region: CollapseRegionName,
  stage: number,
): boolean {
  return override == null ? autoCollapsed(region, stage) : override;
}

// Click semantics: flip the current effective state; if the flipped value
// matches what the auto stage would do anyway, drop the override instead so
// the region follows the auto stage again.
export function nextOverride(
  currentEffective: boolean,
  auto: boolean,
): boolean | null {
  const next = !currentEffective;
  return next === auto ? null : next;
}

export type RegionCollapseControllerOptions = {
  root: HTMLElement;
  regions: Record<CollapseRegionName, HTMLElement | null>;
  getLabels?: () => RegionCollapseLabels | null | undefined;
  observe?: boolean;
};

function text(value: unknown): string {
  return String(value == null ? "" : value).trim();
}

function labelKey(
  region: CollapseRegionName,
  collapsed: boolean,
): keyof RegionCollapseLabels {
  const capitalized = region.charAt(0).toUpperCase() + region.slice(1);
  return ((collapsed ? "expand" : "collapse") +
    capitalized) as keyof RegionCollapseLabels;
}

export function createRegionCollapseController(
  options: RegionCollapseControllerOptions,
) {
  const root = options.root;
  const ownerDoc = root.ownerDocument;
  if (!ownerDoc) {
    throw new Error("assistant-region-collapse: root has no document");
  }
  const doc: Document = ownerDoc;
  const overrides: Record<CollapseRegionName, boolean | null> = {
    toolbar: null,
    banner: null,
    composer: null,
  };
  const toggles: Partial<Record<CollapseRegionName, HTMLButtonElement>> = {};
  let stage = 0;
  let appliedSignature = "";

  function labelFor(region: CollapseRegionName, collapsed: boolean): string {
    const labels = (options.getLabels && options.getLabels()) || {};
    const fallback = FALLBACK_LABELS[region][collapsed ? 1 : 0];
    return text(labels[labelKey(region, collapsed)]) || fallback;
  }

  function isCollapsed(region: CollapseRegionName): boolean {
    return effectiveCollapsed(overrides[region], region, stage);
  }

  function ensureToggle(region: CollapseRegionName): HTMLButtonElement | null {
    const container = options.regions[region];
    if (!container) return null;
    let button = toggles[region] || null;
    if (!button) {
      button = doc.createElement("button");
      button.type = "button";
      button.className = "assistant-region-collapse-toggle";
      button.setAttribute("data-collapse-region", region);
      const icon = doc.createElement("span");
      icon.className = "assistant-region-collapse-toggle-icon";
      icon.setAttribute("aria-hidden", "true");
      button.appendChild(icon);
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(region);
      });
      toggles[region] = button;
    }
    // Self-heal: the region containers host managed mounts created by the
    // chrome renderer, so re-attach if the button was ever detached.
    if (button.parentNode !== container) {
      container.appendChild(button);
    }
    return button;
  }

  function apply() {
    const signature = JSON.stringify([
      stage,
      overrides.toolbar,
      overrides.banner,
      overrides.composer,
      ...REGION_ORDER.map((region) => labelFor(region, isCollapsed(region))),
    ]);
    // Toggle attachment is verified even on a signature hit so a detached
    // button is restored without forcing a class/aria rewrite.
    if (signature === appliedSignature) {
      for (const region of REGION_ORDER) ensureToggle(region);
      return;
    }
    appliedSignature = signature;
    root.setAttribute("data-collapse-stage", String(stage));
    for (const region of REGION_ORDER) {
      const container = options.regions[region];
      const button = ensureToggle(region);
      if (!container || !button) continue;
      const collapsed = isCollapsed(region);
      container.classList.toggle("is-region-collapsed", collapsed);
      button.setAttribute("aria-expanded", collapsed ? "false" : "true");
      const label = labelFor(region, collapsed);
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
    }
  }

  function toggle(region: CollapseRegionName) {
    overrides[region] = nextOverride(
      isCollapsed(region),
      autoCollapsed(region, stage),
    );
    apply();
  }

  function setViewportHeight(height: number) {
    const next = resolveAutoStage(height, stage);
    if (next === stage) return;
    stage = next;
    apply();
  }

  let observer: ResizeObserver | null = null;
  if (options.observe !== false && typeof ResizeObserver === "function") {
    observer = new ResizeObserver(() => {
      setViewportHeight(root.getBoundingClientRect().height);
    });
    observer.observe(root);
  }

  apply();

  return {
    toggle,
    setViewportHeight,
    refreshLabels: apply,
    isCollapsed,
    getStage: () => stage,
    getOverride: (region: CollapseRegionName) => overrides[region],
    dispose() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    },
  };
}

export type RegionCollapseController = ReturnType<
  typeof createRegionCollapseController
>;

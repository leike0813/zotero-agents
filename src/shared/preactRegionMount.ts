// Page-agnostic managed-region mount helpers for Preact region-based pages.
//
// A page split into independently rendered regions adopts fixed container
// nodes once, then mounts each region's Preact tree into a dedicated managed
// child node so region re-renders never clear or rebuild sibling regions.
// These helpers are the page-neutral skeleton of that pattern: they create
// and locate the managed mount nodes and tag region containers with generic
// data attributes. Page-specific class names, region names, and root
// attributes stay with the page's own adoption code.

/**
 * Create or reuse the managed mount child for region `name` directly under
 * `container`. The mount node carries the `data-region-mount` attribute and a
 * stable per-name class so repeated calls return the same node. Returns null
 * when no container is available.
 */
export function ensureRegionMount(
  container: Element | null | undefined,
  name: string,
): HTMLElement | null {
  if (!container) return null;
  container.classList.add("is-region-managed");
  const key = `region-managed-${name}`;
  let mount = container.querySelector(`:scope > .${key}`);
  if (!mount) {
    mount = document.createElement("div");
    mount.className = `region-managed-view ${key}`;
    mount.setAttribute("data-region-mount", name);
    container.appendChild(mount);
  }
  return mount as HTMLElement;
}

/**
 * Tag `node` as a region container: adds the generic region class plus the
 * page-supplied `className`, and sets `data-region` to `name`. When
 * `options.managed === false` the container is explicitly opted out of
 * managed-mount styling (e.g. a region whose content is rendered directly).
 */
export function markPageRegion(
  node: Element | null | undefined,
  name: string,
  options?: { className?: string; managed?: boolean },
): void {
  if (!node) return;
  node.classList.add("page-region");
  if (options?.className) node.classList.add(options.className);
  if (name) node.setAttribute("data-region", name);
  if (options?.managed === false) {
    node.classList.remove("is-region-managed");
  }
}

/**
 * Whether region `name` should render through a managed mount. Regions are
 * unmanaged by default unless `options.managed === true`; an optional
 * `managedRegions` map then opts individual regions in or out.
 */
export function shouldManageRegion(
  options:
    | { managed?: boolean; managedRegions?: Record<string, boolean> }
    | null
    | undefined,
  name: string,
): boolean {
  if (!options || options.managed !== true) return false;
  const managedRegions = options.managedRegions;
  if (!managedRegions || typeof managedRegions !== "object") return true;
  return managedRegions[name] === true;
}

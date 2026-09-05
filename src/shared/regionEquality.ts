// Region equality primitives shared by page bundles that split rendering into
// independently memoized regions.
//
// Each managed region is guarded by a signature derived from a selection of
// the region's data; Preact region components memo on the same selection, so
// imperative guards and component memoization share these functions and the
// equality boundary cannot drift between them. A selection contains only the
// region's user-visible content and open/collapsed state — high-frequency
// updates owned by other regions (revisions, streaming chunks, counts) must
// never enter a selection.

export function safeText(value: unknown): string {
  return String(value == null ? "" : value).trim();
}

export function stableRegionSignature(value: unknown): string {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return safeText(value);
  }
}

export function equalBySignature(previous: unknown, next: unknown): boolean {
  return stableRegionSignature(previous) === stableRegionSignature(next);
}
